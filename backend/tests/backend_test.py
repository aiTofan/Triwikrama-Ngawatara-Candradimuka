"""Backend API tests for Triwikramā / Candradimuka (UPKT) — tiered journey, gate,
scoring map, certificate serial, public /validasi, admin."""
import os
import re
import json
import uuid
import time
from datetime import datetime, timedelta, timezone

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_KEY = "CANDRA2026"

backend_env = dotenv_values("/app/backend/.env")
MONGO_URL = os.environ.get("MONGO_URL") or backend_env.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME") or backend_env.get("DB_NAME")

SERIAL_RE = re.compile(r"^TRW-\d{2}-[0-9A-HJKMNP-TV-Z]{7}-[0-9A-HJKMNP-TV-Z]$")


# ---------- helpers ----------
def mongo():
    return MongoClient(MONGO_URL)[DB_NAME]


def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def new_peserta(client, nama="TEST_Peserta"):
    r = client.post(f"{API}/peserta", json={"nama_tampilan": nama})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["nama_tampilan"] == nama
    assert isinstance(d["id"], str) and len(d["id"]) > 10
    return d["id"]


def simulate_google_session(peserta_id, nama="TEST Google User"):
    """Insert peserta.google_sub + user_sessions row (per /app/auth_testing.md)."""
    db = mongo()
    token = "TEST_" + uuid.uuid4().hex
    db.peserta.update_one({"id": peserta_id}, {"$set": {
        "google_sub": "TEST_sub_" + uuid.uuid4().hex[:8],
        "nama_lengkap": nama, "foto_url": "https://example.com/a.png",
        "email": f"test_{uuid.uuid4().hex[:6]}@example.com"}})
    db.user_sessions.insert_one({
        "peserta_id": peserta_id, "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()})
    return token


def get_sesi(client, sesi_id, token=None):
    h = {"Authorization": f"Bearer {token}"} if token else {}
    r = client.get(f"{API}/sesi/{sesi_id}", headers=h)
    assert r.status_code == 200, r.text
    return r.json()


def answer_all(client, sesi_id, level=None, finish=True):
    """Answer every question. level in (25,50,75,100) picks that score option (via DB),
    otherwise picks the first option."""
    sesi = get_sesi(client, sesi_id)
    db = mongo()
    raw = db.sesi.find_one({"id": sesi_id})
    for i, no in enumerate(sesi["soal_ids"]):
        if level is None:
            tok = sesi["soal_detail"][str(no)]["pilihan"][0]["token"]
        else:
            tok = next(p["token"] for p in raw["soal_detail"][str(no)]["pilihan"] if p["skor"] == level)
        r = client.post(f"{API}/sesi/{sesi_id}/jawab", json={"soal_no": no, "token": tok, "posisi": i + 1})
        assert r.status_code == 200, r.text
    if finish:
        r = client.post(f"{API}/sesi/{sesi_id}/selesai", json={})
        assert r.status_code == 200, r.text
        return r.json()
    return None


def unused_bacaan_code(client):
    r = client.get(f"{API}/admin/kode", params={"kunci": ADMIN_KEY})
    assert r.status_code == 200, r.text
    codes = [c for c in r.json()["kode"] if c["jenis"] == "bacaan" and not c.get("dipakai_oleh")]
    if not codes:
        pytest.skip("No unused 'bacaan' access codes left in DB")
    return codes[0]["kode"]


@pytest.fixture(scope="class")
def client():
    return api_client()


# ================= Health / bank =================
class TestHealth:
    def test_root(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200
        assert "Triwikram" in r.json()["message"]

    def test_bank_pool_counts(self):
        data = json.load(open("/app/data/bank-soal.json", encoding="utf-8"))["soal"]
        by = {}
        for it in data:
            t = it.get("tingkat") or {1: "Bhurloka", 2: "Ākāśa", 3: "Paramārtha"}.get(it.get("bagian"))
            by[t] = by.get(t, 0) + 1
        assert by.get("Bhurloka", 0) >= 17, by
        assert by.get("Ākāśa", 0) >= 30, by
        assert by.get("Paramārtha", 0) >= 90, by


# ================= Draws & no-score-leak =================
class TestDraws:
    def test_bhurloka_draw_exactly_17(self, client):
        pid = new_peserta(client, "TEST_Draw17")
        r = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["jeda"] is False
        sesi = get_sesi(client, d["sesi_id"])
        assert sesi["jenis"] == "bhurloka"
        assert sesi["tier_nama"] == "Bhurloka"
        assert sesi["total"] == 17
        assert len(sesi["soal_ids"]) == 17
        assert len(set(sesi["soal_ids"])) == 17
        for no in sesi["soal_ids"]:
            assert sesi["soal_detail"][str(no)]["tingkat"] == "Bhurloka"

    def test_no_skor_key_in_payload(self, client):
        pid = new_peserta(client, "TEST_NoSkor")
        d = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        r = client.get(f"{API}/sesi/{d['sesi_id']}")
        assert r.status_code == 200
        assert '"skor"' not in r.text, "score leaked in sesi payload"
        for no in r.json()["soal_ids"]:
            for p in r.json()["soal_detail"][str(no)]["pilihan"]:
                assert set(p.keys()) == {"token", "teks"}

    def test_shuffle_between_sessions(self, client):
        p1 = new_peserta(client, "TEST_Shuf1")
        p2 = new_peserta(client, "TEST_Shuf2")
        s1 = get_sesi(client, client.post(f"{API}/perjalanan/mulai", json={"peserta_id": p1}).json()["sesi_id"])
        s2 = get_sesi(client, client.post(f"{API}/perjalanan/mulai", json={"peserta_id": p2}).json()["sesi_id"])
        assert s1["soal_ids"] != s2["soal_ids"], "question order identical across sessions"
        # option order shuffles for at least one shared question
        shared = set(s1["soal_ids"]) & set(s2["soal_ids"])
        assert shared
        diff = any([p["teks"] for p in s1["soal_detail"][str(n)]["pilihan"]]
                   != [p["teks"] for p in s2["soal_detail"][str(n)]["pilihan"]] for n in shared)
        assert diff, "option order never shuffled across sessions"

    def test_cross_session_exclusion(self, client):
        """Second journey's Bhurloka avoids items already seen while unseen remain."""
        pid = new_peserta(client, "TEST_Excl")
        d1 = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        s1 = get_sesi(client, d1["sesi_id"])
        db = mongo()
        bank = json.load(open("/app/data/bank-soal.json", encoding="utf-8"))["soal"]
        pool = [it["no"] for it in bank
                if (it.get("tingkat") or {1: "Bhurloka", 2: "Ākāśa", 3: "Paramārtha"}.get(it.get("bagian"))) == "Bhurloka"]
        # force a fresh journey by creating a second perjalanan directly through API (no finished journey -> no jeda)
        d2 = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        s2 = get_sesi(client, d2["sesi_id"])
        unseen_left = len(pool) - len(set(s1["soal_ids"]))
        overlap = set(s1["soal_ids"]) & set(s2["soal_ids"])
        expected_overlap = max(0, 17 - unseen_left)
        assert len(overlap) <= expected_overlap, (
            f"repeat items although unseen remain: overlap={len(overlap)} allowed={expected_overlap}")


# ================= Journey + payment gate =================
class TestJourneyGate:
    def test_bayar_requires_session_401(self, client):
        pid = new_peserta(client, "TEST_Gate401")
        pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        r = client.post(f"{API}/perjalanan/{pj['perjalanan_id']}/bayar", json={"kode": "XXXXXXXX"})
        assert r.status_code == 401, r.text
        assert "Masuk" in r.json()["detail"]

    def test_bayar_invalid_code_400(self, client):
        pid = new_peserta(client, "TEST_GateBadCode")
        pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        tok = simulate_google_session(pid)
        r = client.post(f"{API}/perjalanan/{pj['perjalanan_id']}/bayar", json={"kode": "NOPECODE"},
                        headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 400, r.text

    def test_auth_me(self, client):
        pid = new_peserta(client, "TEST_Me")
        tok = simulate_google_session(pid, "TEST Me User")
        r = client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 200, r.text
        assert r.json()["id"] == pid
        assert r.json()["nama_lengkap"] == "TEST Me User"
        assert "_id" not in r.json()
        assert client.get(f"{API}/auth/me").status_code == 401

    def test_full_journey_and_pause(self, client):
        pid = new_peserta(client, "TEST_FullJourney")
        tok = simulate_google_session(pid, "TEST Full Journey")
        auth = {"Authorization": f"Bearer {tok}"}
        pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        pjid = pj["perjalanan_id"]

        # Bhurloka all-25
        answer_all(client, pj["sesi_id"], level=25)
        h = client.get(f"{API}/sesi/{pj['sesi_id']}/hasil").json()
        assert h["skor"] == 25, h["skor"]
        assert h["kategori"] == "Kesadaran Cicing"
        assert [t["persen"] for t in h["peta"]] == [25, None, None]
        assert h["terbuka"] is False
        assert "bacaan" not in h

        # pay with code — Iter-7: /bayar unlocks Mandala Paramārtha directly
        kode = unused_bacaan_code(client)
        r = client.post(f"{API}/perjalanan/{pjid}/bayar", json={"kode": kode}, headers=auth)
        assert r.status_code == 200, r.text
        para_id = r.json()["sesi_id"]
        pa = get_sesi(client, para_id)
        assert pa["jenis"] == "paramartha" and pa["total"] == 90
        assert all(pa["soal_detail"][str(n)]["tingkat"] == "Paramārtha" for n in pa["soal_ids"])
        assert pa["terbuka"] is True

        # code cannot be reused by another journey
        pid2 = new_peserta(client, "TEST_Reuse")
        tok2 = simulate_google_session(pid2)
        pj2 = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid2}).json()
        r = client.post(f"{API}/perjalanan/{pj2['perjalanan_id']}/bayar", json={"kode": kode},
                        headers={"Authorization": f"Bearer {tok2}"})
        assert r.status_code == 400 and "sudah dipakai" in r.json()["detail"]

        # Ākāśa sesi did not exist in this shortcut path — /lanjut should still
        # not create it because paramartha already exists.
        r = client.post(f"{API}/perjalanan/{pjid}/lanjut", json={}, headers=auth)
        assert r.status_code == 200, r.text

        answer_all(client, para_id, level=75)
        h = client.get(f"{API}/sesi/{para_id}/hasil").json()
        assert h["perjalanan_selesai"] is True, "perjalanan.selesai_at not set after Paramārtha"
        # No Ākāśa in this shortcut path.
        assert [t["persen"] for t in h["peta"]] == [25, None, 75], h["peta"]
        assert h["terbuka"] is True
        b = h["bacaan"]
        assert sum(int(v) for v in b["sebaran"].values()) == 17 + pa["total"]
        assert b["menonjol"]["skor"] in (25, 50, 75, 100)
        assert len(b["tangga"]) <= 3
        assert b["latihan"]["nama"] == "Cek Diri Dasa Kreta", b["latihan"]  # weakest = bhurloka(25)
        assert b["kode_dipakai"] == kode

        # 14-day pause on next journey
        r = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("jeda") is True, d
        assert "boleh_pada" in d
        boleh = datetime.fromisoformat(d["boleh_pada"])
        assert boleh > datetime.now(timezone.utc) + timedelta(days=13)

        # certificate (needs session + finished journey)
        r = client.post(f"{API}/sertifikat/{para_id}",
                        json={"nama_cetak": "TEST Nama Cetak", "telepon": "081234567890",
                              "alamat": "Jl. Uji 1, Bandung"})
        assert r.status_code == 401, "certificate should require login"
        r = client.post(f"{API}/sertifikat/{para_id}", headers=auth,
                        json={"nama_cetak": "TEST Nama Cetak", "telepon": "081234567890",
                              "alamat": "Jl. Uji 1, Bandung"})
        assert r.status_code == 200, r.text
        nomor = r.json()["nomor_seri"]
        assert SERIAL_RE.match(nomor), nomor
        # order stored with phone + address, visible via admin
        ap = client.get(f"{API}/admin/pesanan", params={"kunci": ADMIN_KEY})
        assert ap.status_code == 200
        row = next((o for o in ap.json()["pesanan"] if o["nomor_seri"] == nomor), None)
        assert row and row["telepon"] == "081234567890" and row["alamat"] == "Jl. Uji 1, Bandung"

        # validasi for this real serial: only name/date/peta
        v = client.post(f"{API}/validasi", json={"nomor_seri": nomor})
        if v.status_code == 429:  # shared-IP rate limit from parallel worker; wait out the window
            time.sleep(62)
            v = client.post(f"{API}/validasi", json={"nomor_seri": nomor})
        assert v.status_code == 200, v.text
        vd = v.json()
        assert set(vd.keys()) == {"nama_lengkap", "tanggal_selesai", "peta"}
        assert vd["nama_lengkap"] == "TEST Nama Cetak"
        assert [p["persen"] for p in vd["peta"]] == [25, None, 75]
        low = v.text.lower()
        for leak in ("email", "telepon", "alamat", "peserta", "jawab"):
            assert leak not in low, f"validasi leaks {leak}"

    def test_certificate_requires_finished_journey(self, client):
        pid = new_peserta(client, "TEST_CertUnfinished")
        tok = simulate_google_session(pid)
        pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        answer_all(client, pj["sesi_id"], level=50)
        r = client.post(f"{API}/sertifikat/{pj['sesi_id']}", headers={"Authorization": f"Bearer {tok}"},
                        json={"nama_cetak": "TEST X", "telepon": "0812", "alamat": "Jl"})
        assert r.status_code == 400, r.text


# ================= Resume / pause =================
class TestResume:
    def test_answers_persist_and_lanjutan(self, client):
        pid = new_peserta(client, "TEST_Resume")
        pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        sesi = get_sesi(client, pj["sesi_id"])
        no = sesi["soal_ids"][0]
        tok = sesi["soal_detail"][str(no)]["pilihan"][0]["token"]
        assert client.post(f"{API}/sesi/{pj['sesi_id']}/jawab",
                           json={"soal_no": no, "token": tok, "posisi": 1}).status_code == 200
        again = get_sesi(client, pj["sesi_id"])
        assert again["jawaban"][str(no)] == tok
        assert again["posisi"] == 1
        r = client.get(f"{API}/peserta/{pid}/lanjutan")
        assert r.status_code == 200
        d = r.json()
        assert d["ada"] is True and d["sesi_id"] == pj["sesi_id"]
        assert d["tier_nama"] == "Bhurloka" and d["posisi"] == 1 and d["total"] == 17

    def test_invalid_answer_token_rejected(self, client):
        pid = new_peserta(client, "TEST_BadTok")
        pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        sesi = get_sesi(client, pj["sesi_id"])
        r = client.post(f"{API}/sesi/{pj['sesi_id']}/jawab",
                        json={"soal_no": sesi["soal_ids"][0], "token": "deadbeef"})
        assert r.status_code == 400
        r = client.post(f"{API}/sesi/{pj['sesi_id']}/jawab", json={"soal_no": 99999, "token": "x"})
        assert r.status_code == 400

    def test_unknown_sesi_404(self, client):
        assert client.get(f"{API}/sesi/{uuid.uuid4()}").status_code == 404
        assert client.get(f"{API}/sesi/{uuid.uuid4()}/hasil").status_code == 404


# ================= Board / minat / admin =================
class TestBoardMinatAdmin:
    def test_papan_bhurloka_and_paramartha(self, client):
        r = client.get(f"{API}/papan", params={"jenis": "bhurloka"})
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["top"], list) and isinstance(d["total"], int)
        for row in d["top"][:5]:
            assert set(row.keys()) == {"rank", "nama_tampilan", "skor", "tanggal"}
        r = client.get(f"{API}/papan", params={"jenis": "paramartha"})
        assert r.status_code == 200
        # three tiers are now all valid board filters
        ra = client.get(f"{API}/papan", params={"jenis": "akasa"})
        assert ra.status_code == 200, ra.text
        for row in ra.json()["top"][:5]:
            assert set(row.keys()) == {"rank", "nama_tampilan", "skor", "tanggal"}
        assert client.get(f"{API}/papan", params={"jenis": "nonsense"}).status_code == 400

    def test_papan_optin_requires_login(self, client):
        pid = new_peserta(client, "TEST_Optin")
        pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        r = client.patch(f"{API}/sesi/{pj['sesi_id']}/papan", json={"tampil_di_papan": True})
        assert r.status_code == 401
        tok = simulate_google_session(pid)
        r = client.patch(f"{API}/sesi/{pj['sesi_id']}/papan", json={"tampil_di_papan": True},
                         headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 200
        assert get_sesi(client, pj["sesi_id"])  # sanity
        assert mongo().sesi.find_one({"id": pj["sesi_id"]})["tampil_di_papan"] is True

    def test_minat_saved(self, client):
        r = client.post(f"{API}/minat", json={"nama": "TEST_Minat", "kontak": "081200000000",
                                             "jalur": "Kohor", "jumlah_orang": 5, "catatan": "TEST"})
        assert r.status_code == 200 and r.json()["ok"] is True
        assert mongo().minat.find_one({"nama": "TEST_Minat", "jumlah_orang": 5})

    def test_admin_gates(self, client):
        assert client.get(f"{API}/admin/kode").status_code == 403
        assert client.get(f"{API}/admin/kode", params={"kunci": "salah"}).status_code == 403
        assert client.get(f"{API}/admin/pesanan").status_code == 403
        r = client.get(f"{API}/admin/kode", params={"kunci": ADMIN_KEY})
        assert r.status_code == 200
        kinds = {c["jenis"] for c in r.json()["kode"]}
        assert {"bacaan", "mandiri", "kohor"} <= kinds
        assert all("_id" not in c for c in r.json()["kode"])


# ================= Public validation + serial + rate limit (kept last) =================
class TestValidasi:
    def test_bad_check_char_404(self, client):
        # take a valid serial then corrupt the check char
        good = "TRW-26-ABCDEFG"
        alpha = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
        chk = alpha[sum(alpha.index(c) for c in "ABCDEFG") % 32]
        bad = alpha[(alpha.index(chk) + 1) % 32]
        r = client.post(f"{API}/validasi", json={"nomor_seri": f"{good}-{bad}"})
        assert r.status_code == 404
        assert r.json()["detail"] == "Nomor seri tidak ditemukan."
        # malformed inputs
        for s in ["", "abc", "TRW-XX-ABCDEFG-1", "TRW-26-ABCD-1"]:
            rr = client.post(f"{API}/validasi", json={"nomor_seri": s})
            assert rr.status_code == 404, (s, rr.status_code)

    def test_valid_format_unknown_serial_404(self, client):
        alpha = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
        seven = "ZZZZZZZ"
        chk = alpha[sum(alpha.index(c) for c in seven) % 32]
        r = client.post(f"{API}/validasi", json={"nomor_seri": f"TRW-99-{seven}-{chk}"})
        assert r.status_code == 404

    def test_serials_non_sequential(self):
        import sys
        sys.path.insert(0, "/app/backend")
        from server import gen_serial, valid_serial
        vals = [gen_serial("26") for _ in range(20)]
        assert len(set(vals)) == 20
        assert all(valid_serial(v) and SERIAL_RE.match(v) for v in vals)
        mids = [v.split("-")[2] for v in vals]
        assert len(set(m[0] for m in mids)) > 3, "serials look sequential"

    def test_rate_limit_10_per_minute(self, client):
        alpha = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
        seven = "1234567"
        chk = alpha[sum(alpha.index(c) for c in seven) % 32]
        payload = {"nomor_seri": f"TRW-26-{seven}-{chk}"}
        codes = [client.post(f"{API}/validasi", json=payload).status_code for _ in range(14)]
        assert 429 in codes, codes
        first429 = codes.index(429)
        assert first429 <= 10, codes

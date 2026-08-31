"""Backend API tests for Candradimuka (UPKT)."""
import os
import sys
import re
from datetime import datetime, timedelta

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_KEY = "CANDRA2026"

sys.path.insert(0, "/app/backend")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def new_peserta(client, nama="TEST_Peserta"):
    r = client.post(f"{API}/peserta", json={"nama_tampilan": nama})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["nama_tampilan"] == nama
    return d["id"]


def mulai(client, pid, jenis):
    r = client.post(f"{API}/sesi/mulai", json={"peserta_id": pid, "jenis": jenis})
    assert r.status_code == 200, r.text
    return r.json()


def answer_all(client, sesi_id, prefer_index=None, prefer_score=None):
    """Answer all questions. prefer_score picks option with that score (needs internal map)."""
    r = client.get(f"{API}/sesi/{sesi_id}")
    assert r.status_code == 200
    sesi = r.json()
    for no in sesi["soal_ids"]:
        d = sesi["soal_detail"][str(no)]
        pil = d["pilihan"]
        if prefer_score is not None:
            tok = None
            for p in pil:
                if SCORE_BY_TEKS.get(p["teks"]) == prefer_score:
                    tok = p["token"]
            assert tok, "option with score not found"
        else:
            tok = pil[prefer_index or 0]["token"]
        rr = client.post(f"{API}/sesi/{sesi_id}/jawab", json={"soal_no": no, "token": tok})
        assert rr.status_code == 200, rr.text
    return sesi


# map option text -> score from the bank file (used to choose deterministic answers)
def _build_score_map():
    import json
    with open("/app/data/bank-soal.json", encoding="utf-8") as f:
        data = json.load(f)
    m = {}
    for it in data["soal"]:
        for p in it["pilihan"]:
            m[p["teks"]] = p["skor"]
    return m


SCORE_BY_TEKS = _build_score_map()


# ---- Peserta ----
class TestPeserta:
    def test_root(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200
        assert "message" in r.json()

    def test_create_and_get_peserta(self, client):
        pid = new_peserta(client, "TEST_Budi")
        r = client.get(f"{API}/peserta/{pid}")
        assert r.status_code == 200
        assert r.json()["nama_tampilan"] == "TEST_Budi"
        assert "_id" not in r.json()

    def test_get_missing_peserta(self, client):
        r = client.get(f"{API}/peserta/does-not-exist")
        assert r.status_code == 404


# ---- Draw logic ----
class TestDraw:
    def test_dasar_draws_bagian1_only(self, client):
        pid = new_peserta(client, "TEST_Draw1")
        sid = mulai(client, pid, "dasar")["sesi_id"]
        sesi = client.get(f"{API}/sesi/{sid}").json()
        bagians = {sesi["soal_detail"][str(no)]["bagian"] for no in sesi["soal_ids"]}
        assert bagians == {1}, bagians
        assert len(sesi["soal_ids"]) == len(set(sesi["soal_ids"]))

    def test_lengkap_covers_all_bagian(self, client):
        pid = new_peserta(client, "TEST_Draw2")
        sid = mulai(client, pid, "lengkap")["sesi_id"]
        sesi = client.get(f"{API}/sesi/{sid}").json()
        bagians = sorted(sesi["soal_detail"][str(no)]["bagian"] for no in sesi["soal_ids"])
        assert bagians == [1, 2, 3], bagians

    def test_no_score_leak_in_sesi_payload(self, client):
        pid = new_peserta(client, "TEST_Leak")
        sid = mulai(client, pid, "lengkap")["sesi_id"]
        r = client.get(f"{API}/sesi/{sid}")
        raw = r.text
        sesi = r.json()
        for no in sesi["soal_ids"]:
            for p in sesi["soal_detail"][str(no)]["pilihan"]:
                assert set(p.keys()) == {"token", "teks"}, p.keys()
        assert '"skor"' in raw  # top-level session skor field exists
        assert re.search(r'"skor":\s*(25|50|75|100)', raw) is None, "option score leaked"

    def test_invalid_jenis(self, client):
        pid = new_peserta(client, "TEST_BadJenis")
        r = client.post(f"{API}/sesi/mulai", json={"peserta_id": pid, "jenis": "aneh"})
        assert r.status_code == 400

    def test_mulai_unknown_peserta(self, client):
        r = client.post(f"{API}/sesi/mulai", json={"peserta_id": "nope", "jenis": "dasar"})
        assert r.status_code == 404

    def test_option_shuffle_between_sessions(self, client):
        """Option order should vary across fresh sessions."""
        orders = set()
        for _ in range(8):
            pid = new_peserta(client, "TEST_Shuffle")
            sid = mulai(client, pid, "dasar")["sesi_id"]
            sesi = client.get(f"{API}/sesi/{sid}").json()
            no = sesi["soal_ids"][0]
            orders.add(tuple(SCORE_BY_TEKS[p["teks"]] for p in sesi["soal_detail"][str(no)]["pilihan"]))
        assert len(orders) > 1, f"options not shuffled: {orders}"

    def test_exclusion_unit(self):
        """Unit-test draw_from_bagian exclusion preference (seed bank too small for API test)."""
        from server import draw_from_bagian
        items = [{"no": i, "bagian": 1} for i in range(1, 21)]
        seen = {i: "2026-01-01T00:00:00+00:00" for i in range(1, 6)}
        drawn = draw_from_bagian(items, seen, 15)
        assert len(drawn) == 15
        assert all(it["no"] not in seen for it in drawn), "seen items drawn while unseen remain"
        # when fewer unseen than needed, fills with oldest-seen
        seen2 = {i: f"2026-01-{i:02d}T00:00:00+00:00" for i in range(1, 21)}
        drawn2 = draw_from_bagian(items, seen2, 15)
        assert len(drawn2) == 15
        assert len({it["no"] for it in drawn2}) == 15

    def test_second_session_excludes_seen_via_api(self, client):
        """With only 1 item per bagian, unseen pool is empty; API must still return a session."""
        pid = new_peserta(client, "TEST_Excl")
        s1 = mulai(client, pid, "dasar")["sesi_id"]
        ids1 = client.get(f"{API}/sesi/{s1}").json()["soal_ids"]
        s2 = mulai(client, pid, "dasar")["sesi_id"]
        ids2 = client.get(f"{API}/sesi/{s2}").json()["soal_ids"]
        assert len(ids2) >= 1
        # seed bank has only one bagian-1 item so reuse is expected
        assert set(ids1) == set(ids2)


# ---- Answering & scoring ----
class TestScoring:
    def test_invalid_token_rejected(self, client):
        pid = new_peserta(client, "TEST_Tok")
        sid = mulai(client, pid, "dasar")["sesi_id"]
        no = client.get(f"{API}/sesi/{sid}").json()["soal_ids"][0]
        r = client.post(f"{API}/sesi/{sid}/jawab", json={"soal_no": no, "token": "bogus"})
        assert r.status_code == 400
        r = client.post(f"{API}/sesi/{sid}/jawab", json={"soal_no": 999, "token": "bogus"})
        assert r.status_code == 400

    @pytest.mark.parametrize("score,kategori", [(25, "Cicing"), (50, "Nyaring Sela"), (75, "Nyaring Jati"), (100, "Eling")])
    def test_score_and_kategori(self, client, score, kategori):
        pid = new_peserta(client, f"TEST_Score{score}")
        sid = mulai(client, pid, "dasar")["sesi_id"]
        answer_all(client, sid, prefer_score=score)
        r = client.post(f"{API}/sesi/{sid}/selesai", json={})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["skor"] == score
        assert d["kategori"] == kategori
        h = client.get(f"{API}/sesi/{sid}/hasil").json()
        assert h["skor"] == score and h["kategori"] == kategori
        assert h["kategori_paragraf"]
        assert "berbayar" not in h

    def test_lowest_possible_is_25(self, client):
        pid = new_peserta(client, "TEST_Floor")
        sid = mulai(client, pid, "lengkap")["sesi_id"]
        answer_all(client, sid, prefer_score=25)
        d = client.post(f"{API}/sesi/{sid}/selesai", json={"tampil_di_papan": False}).json()
        assert d["skor"] == 25

    def test_dasar_auto_on_board(self, client):
        pid = new_peserta(client, "TEST_Board")
        sid = mulai(client, pid, "dasar")["sesi_id"]
        answer_all(client, sid, prefer_score=75)
        client.post(f"{API}/sesi/{sid}/selesai", json={})
        h = client.get(f"{API}/sesi/{sid}/hasil").json()
        assert h["tampil_di_papan"] is True
        p = client.get(f"{API}/papan", params={"jenis": "dasar", "peserta_id": pid}).json()
        assert p["total"] >= 1
        assert p["my_rank"] is not None
        assert p["my_rank"]["rank"] >= 1
        assert len(p["top"]) <= 100

    def test_hasil_404(self, client):
        assert client.get(f"{API}/sesi/nope/hasil").status_code == 404


# ---- Unlock (buka) + paid reading ----
class TestUnlockPaid:
    def get_unused_code(self, client):
        r = client.get(f"{API}/admin/kode", params={"kunci": ADMIN_KEY})
        assert r.status_code == 200
        codes = [c for c in r.json()["kode"] if c["jenis"] == "bacaan" and not c.get("dipakai_oleh")]
        assert codes, "no unused bacaan code available"
        return codes[0]["kode"]

    def test_unlock_and_paid_payload(self, client):
        pid = new_peserta(client, "TEST_Paid")
        sid = mulai(client, pid, "lengkap")["sesi_id"]
        answer_all(client, sid, prefer_score=75)
        client.post(f"{API}/sesi/{sid}/selesai", json={"tampil_di_papan": True})

        bad = client.post(f"{API}/sesi/{sid}/buka", json={"kode": "TIDAKADA1"})
        assert bad.status_code == 400
        assert "tidak ditemukan" in bad.json()["detail"].lower()

        kode = self.get_unused_code(client)
        r = client.post(f"{API}/sesi/{sid}/buka", json={"kode": kode})
        assert r.status_code == 200 and r.json()["terbuka"] is True

        h = client.get(f"{API}/sesi/{sid}/hasil").json()
        assert h["terbuka"] is True
        b = h["berbayar"]
        assert [x["bagian"] for x in b["per_bagian"]] == [1, 2, 3]
        assert all(x["skor"] == 75 and x["level"] == "Nyaring Jati" for x in b["per_bagian"])
        assert b["sebaran"] == {"25": 0, "50": 0, "75": 3, "100": 0}
        assert b["menonjol"]["skor"] == 75 and b["menonjol"]["level"] == "Nyaring Jati"
        assert b["menonjol"]["bacaan"]
        assert 1 <= len(b["tangga"]) <= 3
        for t in b["tangga"]:
            assert t["skenario"] and t["pilihan_dipilih"] and t["pilihan_seratus"] and t["beda"]
        assert b["latihan"]["bagian"] in (1, 2, 3)
        assert b["latihan"]["nama"] in ("Cek Diri Dasa Kreta", "Lembar Kerja Panca Niti", "Audit Empati Radikal")
        assert b["kode_dipakai"] == kode

        # persistence of unlock
        h2 = client.get(f"{API}/sesi/{sid}/hasil").json()
        assert h2["terbuka"] is True

        # same code on a different sesi is refused
        pid2 = new_peserta(client, "TEST_Paid2")
        sid2 = mulai(client, pid2, "lengkap")["sesi_id"]
        answer_all(client, sid2, prefer_score=50)
        client.post(f"{API}/sesi/{sid2}/selesai", json={})
        r2 = client.post(f"{API}/sesi/{sid2}/buka", json={"kode": kode})
        assert r2.status_code == 400
        assert r2.json()["detail"] == "Kode ini sudah dipakai."

    def test_latihan_matches_weakest_bagian(self, client):
        """Answer bagian-3 lowest so latihan should be Audit Empati Radikal."""
        pid = new_peserta(client, "TEST_Weakest")
        sid = mulai(client, pid, "lengkap")["sesi_id"]
        sesi = client.get(f"{API}/sesi/{sid}").json()
        for no in sesi["soal_ids"]:
            d = sesi["soal_detail"][str(no)]
            want = 25 if d["bagian"] == 3 else 100
            tok = next(p["token"] for p in d["pilihan"] if SCORE_BY_TEKS[p["teks"]] == want)
            client.post(f"{API}/sesi/{sid}/jawab", json={"soal_no": no, "token": tok})
        client.post(f"{API}/sesi/{sid}/selesai", json={})
        kode = self.get_unused_code(client)
        assert client.post(f"{API}/sesi/{sid}/buka", json={"kode": kode}).status_code == 200
        b = client.get(f"{API}/sesi/{sid}/hasil").json()["berbayar"]
        assert b["latihan"] == {"bagian": 3, "nama": "Audit Empati Radikal"}
        assert b["sebaran"] == {"25": 1, "50": 0, "75": 0, "100": 2}


# ---- JEDA ----
class TestJeda:
    def test_lengkap_jeda_after_completion(self, client):
        pid = new_peserta(client, "TEST_Jeda")
        sid = mulai(client, pid, "lengkap")["sesi_id"]
        answer_all(client, sid, prefer_score=50)
        client.post(f"{API}/sesi/{sid}/selesai", json={})
        r = client.post(f"{API}/sesi/mulai", json={"peserta_id": pid, "jenis": "lengkap"})
        assert r.status_code == 200
        d = r.json()
        assert d.get("jeda") is True, d
        boleh = datetime.fromisoformat(d["boleh_pada"])
        delta = boleh - datetime.now(boleh.tzinfo)
        assert timedelta(days=13) < delta <= timedelta(days=14), delta
        # dasar has no jeda
        r2 = client.post(f"{API}/sesi/mulai", json={"peserta_id": pid, "jenis": "dasar"})
        assert r2.json()["jeda"] is False and r2.json()["sesi_id"]


# ---- Sertifikat / periksa ----
class TestSertifikat:
    def test_certificate_flow(self, client):
        pid = new_peserta(client, "TEST_Cert")
        sid = mulai(client, pid, "lengkap")["sesi_id"]
        answer_all(client, sid, prefer_score=100)
        client.post(f"{API}/sesi/{sid}/selesai", json={"tampil_di_papan": True})
        payload = {"nama_cetak": "TEST Nama Cetak", "telepon": "081234567890",
                   "alamat": "Jl. Uji No. 1, Bandung", "catatan": "TEST"}
        r = client.post(f"{API}/sertifikat/{sid}", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        kode = d["kode_verifikasi"]
        assert re.fullmatch(r"[A-Z]{10}", kode), kode
        assert "150.000" in d["total"]

        # admin listing shows status baru with contact info
        a = client.get(f"{API}/admin/pesanan", params={"kunci": ADMIN_KEY})
        assert a.status_code == 200
        order = next(o for o in a.json()["pesanan"] if o["kode_verifikasi"] == kode)
        assert order["status"] == "baru"
        assert order["telepon"] == payload["telepon"]
        assert order["alamat"] == payload["alamat"]
        assert order["skor"] == 100 and order["kategori"] == "Eling"

        # public verification exposes only 4 fields
        p = client.get(f"{API}/periksa/{kode.lower()}")
        assert p.status_code == 200
        pd = p.json()
        assert set(pd.keys()) == {"nama_cetak", "tanggal_uji", "kategori", "skor"}
        assert pd["nama_cetak"] == payload["nama_cetak"]
        assert pd["kategori"] == "Eling" and pd["skor"] == 100
        assert payload["telepon"] not in p.text and payload["alamat"] not in p.text

        assert client.get(f"{API}/periksa/ZZZZZZZZZZ").status_code == 404

    def test_certificate_rejected_for_dasar(self, client):
        pid = new_peserta(client, "TEST_CertDasar")
        sid = mulai(client, pid, "dasar")["sesi_id"]
        answer_all(client, sid, prefer_score=75)
        client.post(f"{API}/sesi/{sid}/selesai", json={})
        r = client.post(f"{API}/sertifikat/{sid}", json={"nama_cetak": "TEST X", "telepon": "0812", "alamat": "Jl"})
        assert r.status_code == 400

    def test_certificate_rejected_for_incomplete_lengkap(self, client):
        pid = new_peserta(client, "TEST_CertIncomplete")
        sid = mulai(client, pid, "lengkap")["sesi_id"]
        r = client.post(f"{API}/sertifikat/{sid}", json={"nama_cetak": "TEST X", "telepon": "0812", "alamat": "Jl"})
        assert r.status_code == 400


# ---- Papan / minat / admin ----
class TestPapanAdminMinat:
    def test_papan_lengkap_only_optin(self, client):
        pid = new_peserta(client, "TEST_PapanOff")
        sid = mulai(client, pid, "lengkap")["sesi_id"]
        answer_all(client, sid, prefer_score=100)
        client.post(f"{API}/sesi/{sid}/selesai", json={"tampil_di_papan": False})
        p = client.get(f"{API}/papan", params={"jenis": "lengkap", "peserta_id": pid}).json()
        assert p["my_rank"] is None, "opted-out session appears on board"
        # opt in via patch
        assert client.patch(f"{API}/sesi/{sid}/papan", json={"tampil_di_papan": True}).status_code == 200
        p2 = client.get(f"{API}/papan", params={"jenis": "lengkap", "peserta_id": pid}).json()
        assert p2["my_rank"] is not None

    def test_papan_invalid_jenis(self, client):
        assert client.get(f"{API}/papan", params={"jenis": "x"}).status_code == 400

    def test_minat(self, client):
        r = client.post(f"{API}/minat", json={"nama": "TEST Minat", "kontak": "0812", "jalur": "Kohor", "jumlah_orang": 5})
        assert r.status_code == 200 and r.json()["ok"] is True

    def test_admin_kode_requires_key(self, client):
        assert client.get(f"{API}/admin/kode").status_code == 403
        assert client.get(f"{API}/admin/kode", params={"kunci": "WRONG"}).status_code == 403
        assert client.get(f"{API}/admin/pesanan").status_code == 403
        assert client.get(f"{API}/admin/pesanan", params={"kunci": "wrong"}).status_code == 403

    def test_admin_kode_counts(self, client):
        d = client.get(f"{API}/admin/kode", params={"kunci": ADMIN_KEY}).json()["kode"]
        assert len(d) == 55, len(d)
        jenis_count = {}
        for c in d:
            jenis_count[c["jenis"]] = jenis_count.get(c["jenis"], 0) + 1
            assert "_id" not in c
        assert jenis_count == {"bacaan": 30, "mandiri": 20, "kohor": 5}, jenis_count

    def test_admin_status_update(self, client):
        pid = new_peserta(client, "TEST_Status")
        sid = mulai(client, pid, "lengkap")["sesi_id"]
        answer_all(client, sid, prefer_score=75)
        client.post(f"{API}/sesi/{sid}/selesai", json={})
        oid = client.post(f"{API}/sertifikat/{sid}", json={"nama_cetak": "TEST S", "telepon": "0812", "alamat": "Jl"}).json()["order_id"]
        r = client.patch(f"{API}/admin/pesanan/{oid}/status", params={"kunci": ADMIN_KEY}, json={"status": "dibayar"})
        assert r.status_code == 200
        orders = client.get(f"{API}/admin/pesanan", params={"kunci": ADMIN_KEY}).json()["pesanan"]
        assert next(o for o in orders if o["id"] == oid)["status"] == "dibayar"
        bad = client.patch(f"{API}/admin/pesanan/{oid}/status", params={"kunci": ADMIN_KEY}, json={"status": "aneh"})
        assert bad.status_code == 400

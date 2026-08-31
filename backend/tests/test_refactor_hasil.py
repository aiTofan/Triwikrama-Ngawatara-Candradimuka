"""Iteration-5 regression: backend-only code-quality refactor.
(1) gen_code() now uses `secrets` — must still yield 8 uppercase-alnum codes.
(2) /api/sesi/{id}/hasil refactored into build_peta/build_disk/build_bacaan —
    response shape/values must be byte-for-byte identical to iteration-4.
"""
import re
import string
import sys

import pytest

sys.path.insert(0, "/app/backend/tests")
sys.path.insert(0, "/app/backend")
from backend_test import (API, api_client, new_peserta, simulate_google_session,  # noqa: E402
                          answer_all, unused_bacaan_code, get_sesi, mongo, ADMIN_KEY)

CODE_RE = re.compile(r"^[A-Z0-9]{8}$")

# Exact key set of the /hasil payload as of iteration-4 (no bacaan)
HASIL_KEYS = {
    "sesi_id", "jenis", "tier_nama", "peserta", "skor", "kategori", "kategori_desc",
    "kategori_paragraf", "terbuka", "selesai_at", "created_at", "jumlah_soal",
    "tampil_di_papan", "perjalanan_id", "perjalanan_selesai", "peta", "disk",
}
BACAAN_KEYS = {"sebaran", "menonjol", "tangga", "latihan", "kode_dipakai"}


@pytest.fixture(scope="module")
def client():
    return api_client()


# ================= gen_code (secrets) =================
class TestGenCode:
    def test_gen_code_format_and_entropy(self):
        from server import gen_code
        vals = [gen_code() for _ in range(300)]
        assert all(CODE_RE.match(v) for v in vals), [v for v in vals if not CODE_RE.match(v)][:3]
        assert all(len(v) == 8 for v in vals)
        assert len(set(vals)) == 300, "gen_code produced duplicates in 300 draws"
        alphabet = set(string.ascii_uppercase + string.digits)
        used = set("".join(vals))
        assert used <= alphabet
        assert len(used) > 25, f"low character diversity: {sorted(used)}"

    def test_gen_code_custom_length(self):
        from server import gen_code
        assert len(gen_code(12)) == 12

    def test_seeded_codes_still_valid_format(self, client):
        r = client.get(f"{API}/admin/kode", params={"kunci": ADMIN_KEY})
        assert r.status_code == 200, r.text
        codes = r.json()["kode"]
        assert len(codes) >= 55, len(codes)
        for c in codes:
            assert CODE_RE.match(c["kode"]), c["kode"]
            assert c["jenis"] in ("bacaan", "mandiri", "kohor")
        assert len(set(c["kode"] for c in codes)) == len(codes), "duplicate seeded codes"


# ================= /hasil regression =================
class TestHasilUnpaidBhurloka:
    @pytest.fixture(scope="class")
    def fixture(self, client):
        pid = new_peserta(client, "TEST_R5_Bhur")
        pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        sesi = get_sesi(client, pj["sesi_id"])
        answer_all(client, pj["sesi_id"], level=50)
        h = client.get(f"{API}/sesi/{pj['sesi_id']}/hasil")
        assert h.status_code == 200, h.text
        return {"pid": pid, "sesi_id": pj["sesi_id"], "sesi": sesi, "hasil": h.json(), "raw": h.text}

    def test_exact_key_set(self, fixture):
        assert set(fixture["hasil"].keys()) == HASIL_KEYS, set(fixture["hasil"].keys()) ^ HASIL_KEYS

    def test_scalar_fields(self, fixture):
        d = fixture["hasil"]
        assert d["sesi_id"] == fixture["sesi_id"]
        assert d["jenis"] == "bhurloka"
        assert d["tier_nama"] == "Bhurloka"
        assert d["skor"] == 50
        assert d["kategori"] == "Lulungu"
        assert d["kategori_paragraf"].startswith("Lulungu")
        assert d["terbuka"] is False
        assert d["jumlah_soal"] == 17
        assert d["perjalanan_selesai"] is False
        assert "bacaan" not in d
        assert d["selesai_at"] and d["created_at"]

    def test_peserta_privacy(self, fixture):
        p = fixture["hasil"]["peserta"]
        assert p is not None
        for leak in ("email", "google_sub", "_id"):
            assert leak not in p, leak

    def test_peta_three_tiers(self, fixture):
        peta = fixture["hasil"]["peta"]
        assert len(peta) == 3
        assert [t["key"] for t in peta] == ["bhurloka", "akasa", "paramartha"]
        assert [t["nama"] for t in peta] == ["Bhurloka", "Ākāśa", "Paramārtha"]
        assert [t["persen"] for t in peta] == [50, None, None]
        for t in peta:
            assert set(t.keys()) == {"key", "nama", "persen"}

    def test_disk_matches_chosen_scores(self, fixture):
        disk = fixture["hasil"]["disk"]
        assert isinstance(disk, list) and len(disk) == 17
        assert disk == [50] * 17
        # cross-check against the DB order of soal_ids
        raw = mongo().sesi.find_one({"id": fixture["sesi_id"]})
        expected = []
        for no in raw["soal_ids"]:
            tok = raw["jawaban"].get(str(no))
            expected.append(next((p["skor"] for p in raw["soal_detail"][str(no)]["pilihan"]
                                  if p["token"] == tok), None))
        assert disk == expected

    def test_no_skor_key_in_sesi_payload(self, client, fixture):
        r = client.get(f"{API}/sesi/{fixture['sesi_id']}")
        assert r.status_code == 200
        assert '"skor"' not in r.text
        body = r.json()
        for no in body["soal_ids"]:
            for p in body["soal_detail"][str(no)]["pilihan"]:
                assert set(p.keys()) == {"token", "teks"}


class TestHasilPartialAndMixed:
    def test_disk_has_none_for_unanswered(self, client):
        pid = new_peserta(client, "TEST_R5_Partial")
        pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        sesi = get_sesi(client, pj["sesi_id"])
        raw = mongo().sesi.find_one({"id": pj["sesi_id"]})
        answered = sesi["soal_ids"][:5]
        for i, no in enumerate(answered):
            tok = next(p["token"] for p in raw["soal_detail"][str(no)]["pilihan"] if p["skor"] == 100)
            assert client.post(f"{API}/sesi/{pj['sesi_id']}/jawab",
                               json={"soal_no": no, "token": tok, "posisi": i + 1}).status_code == 200
        d = client.get(f"{API}/sesi/{pj['sesi_id']}/hasil").json()
        assert d["disk"] == [100] * 5 + [None] * 12
        assert d["jumlah_soal"] == 5
        assert d["skor"] == 100
        # not finished -> peta persen stays None for every tier
        assert [t["persen"] for t in d["peta"]] == [None, None, None]

    def test_mean_rounded_no_rescale(self, client):
        """Mix 25/100: skor is round(mean of chosen scores), no rescaling to a 25-step grid."""
        pid = new_peserta(client, "TEST_R5_Mixed")
        pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        sesi = get_sesi(client, pj["sesi_id"])
        raw = mongo().sesi.find_one({"id": pj["sesi_id"]})
        levels = []
        for i, no in enumerate(sesi["soal_ids"]):
            lvl = 100 if i < 9 else 25  # mean = (9*100 + 8*25)/17 = 64.7
            levels.append(lvl)
            tok = next(p["token"] for p in raw["soal_detail"][str(no)]["pilihan"] if p["skor"] == lvl)
            client.post(f"{API}/sesi/{pj['sesi_id']}/jawab", json={"soal_no": no, "token": tok, "posisi": i + 1})
        client.post(f"{API}/sesi/{pj['sesi_id']}/selesai", json={})
        d = client.get(f"{API}/sesi/{pj['sesi_id']}/hasil").json()
        mean = sum(levels) / len(levels)
        assert d["skor"] == round(mean) == 65, (d["skor"], mean)
        assert d["kategori"] == "Lulungu", d["kategori"]
        assert d["disk"] == levels
        assert [t["persen"] for t in d["peta"]] == [65, None, None]


class TestHasilPaidFullJourney:
    @pytest.fixture(scope="class")
    def journey(self, client):
        pid = new_peserta(client, "TEST_R5_Full")
        tok = simulate_google_session(pid, "TEST R5 Full")
        auth = {"Authorization": f"Bearer {tok}"}
        pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        answer_all(client, pj["sesi_id"], level=25)
        kode = unused_bacaan_code(client)
        r = client.post(f"{API}/perjalanan/{pj['perjalanan_id']}/bayar", json={"kode": kode}, headers=auth)
        assert r.status_code == 200, r.text
        akasa = r.json()["sesi_id"]
        answer_all(client, akasa, level=100)
        r = client.post(f"{API}/perjalanan/{pj['perjalanan_id']}/lanjut", json={}, headers=auth)
        assert r.status_code == 200, r.text
        para = r.json()["sesi_id"]
        answer_all(client, para, level=75)
        h = client.get(f"{API}/sesi/{para}/hasil")
        assert h.status_code == 200, h.text
        return {"pid": pid, "token": tok, "kode": kode, "para": para,
                "akasa": akasa, "bhur": pj["sesi_id"], "hasil": h.json()}

    def test_key_set_includes_bacaan(self, journey):
        assert set(journey["hasil"].keys()) == HASIL_KEYS | {"bacaan"}
        assert set(journey["hasil"]["bacaan"].keys()) == BACAAN_KEYS

    def test_peta_all_three_filled(self, journey):
        d = journey["hasil"]
        assert [t["persen"] for t in d["peta"]] == [25, 100, 75], d["peta"]
        assert d["terbuka"] is True
        assert d["perjalanan_selesai"] is True
        assert d["jenis"] == "paramartha" and d["tier_nama"] == "Paramārtha"
        assert d["skor"] == 75 and d["kategori"] == "Nyaring"
        assert d["jumlah_soal"] == 90
        assert d["disk"] == [75] * 90

    def test_bacaan_sebaran_counts(self, journey):
        b = journey["hasil"]["bacaan"]
        assert list(b["sebaran"].keys()) == ["25", "50", "75", "100"]
        assert b["sebaran"] == {"25": 17, "50": 0, "75": 90, "100": 30}, b["sebaran"]
        assert sum(b["sebaran"].values()) == 137

    def test_bacaan_menonjol_tangga_latihan(self, journey):
        b = journey["hasil"]["bacaan"]
        assert b["menonjol"]["skor"] == 75, b["menonjol"]
        assert set(b["menonjol"].keys()) == {"skor", "level", "bacaan"}
        assert b["menonjol"]["level"] and b["menonjol"]["bacaan"]
        assert len(b["tangga"]) <= 3 and len(b["tangga"]) == 3
        for t in b["tangga"]:
            assert set(t.keys()) == {"skenario", "pilihan_dipilih", "pilihan_seratus", "beda"}
            assert all(t[k] for k in t)
        # weakest tier is bhurloka (25) -> its exercise
        assert b["latihan"] == {"tier": "Bhurloka", "nama": "Cek Diri Dasa Kreta"}, b["latihan"]
        assert b["kode_dipakai"] == journey["kode"]

    def test_bhurloka_hasil_of_paid_journey_shows_full_peta(self, client, journey):
        """Any sesi of a paid journey exposes the journey-wide peta + bacaan."""
        d = client.get(f"{API}/sesi/{journey['bhur']}/hasil").json()
        assert d["jenis"] == "bhurloka"
        assert [t["persen"] for t in d["peta"]] == [25, 100, 75]
        assert d["terbuka"] is True
        assert d["disk"] == [25] * 17
        assert d["bacaan"]["sebaran"] == {"25": 17, "50": 0, "75": 90, "100": 30}

    def test_helpers_match_endpoint(self, journey):
        """build_peta/build_disk are pure — recompute from DB and compare to the API."""
        from server import build_peta, build_disk
        db = mongo()
        pj_id = db.sesi.find_one({"id": journey["para"]})["perjalanan_id"]
        js = {s["jenis"]: s for s in db.sesi.find({"perjalanan_id": pj_id})}
        assert build_peta(js) == journey["hasil"]["peta"]
        assert build_disk(db.sesi.find_one({"id": journey["para"]})) == journey["hasil"]["disk"]

    def test_reuse_of_consumed_code_refused(self, client, journey):
        pid2 = new_peserta(client, "TEST_R5_Reuse")
        tok2 = simulate_google_session(pid2)
        pj2 = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid2}).json()
        r = client.post(f"{API}/perjalanan/{pj2['perjalanan_id']}/bayar", json={"kode": journey["kode"]},
                        headers={"Authorization": f"Bearer {tok2}"})
        assert r.status_code == 400, r.text
        assert "sudah dipakai" in r.json()["detail"]


# ================= auth gating (Bearer only) =================
class TestAuthGating:
    def test_all_gated_endpoints_401_without_bearer(self, client):
        pid = new_peserta(client, "TEST_R5_Gate")
        pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        assert client.post(f"{API}/perjalanan/{pj['perjalanan_id']}/bayar",
                           json={"kode": "AAAAAAAA"}).status_code == 401
        assert client.post(f"{API}/perjalanan/{pj['perjalanan_id']}/lanjut", json={}).status_code == 401
        assert client.patch(f"{API}/sesi/{pj['sesi_id']}/papan",
                            json={"tampil_di_papan": True}).status_code == 401
        assert client.post(f"{API}/sertifikat/{pj['sesi_id']}",
                           json={"nama_cetak": "X", "telepon": "0", "alamat": "Y"}).status_code == 401
        assert client.get(f"{API}/auth/me").status_code == 401
        # bogus bearer is also rejected
        assert client.get(f"{API}/auth/me", headers={"Authorization": "Bearer nope"}).status_code == 401

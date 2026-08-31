"""Iteration-4 surgical changes: renamed bands (Cicing/Lulungu/Nyaring/Eling),
kategori derived from score, three-tier board, CORS headers, diacritics."""
import sys
import pytest

sys.path.insert(0, "/app/backend/tests")
from backend_test import (API, BASE_URL, api_client, new_peserta, simulate_google_session,  # noqa: E402
                          answer_all, unused_bacaan_code, get_sesi, mongo, ADMIN_KEY)

BANDS = {25: "Cicing", 50: "Lulungu", 75: "Nyaring", 100: "Eling"}
PARAGRAF = {
    "Cicing": "Cicing — diam dan bereaksi dari rasa, emosi atau kebiasaan.",
    "Lulungu": "Lulungu — setengah sadar, masih linglung seperti baru bangun tidur.",
    "Nyaring": "Nyaring — sudah bangun dan melihat jernih, tetapi belum tentu bertindak.",
    "Eling": "Eling — sadar, berdaulat, dan menindaklanjuti apa yang dilihatnya.",
}
OLD_NAMES = ("Nyaring Sela", "Nyaring Jati")


@pytest.fixture(scope="module")
def client():
    return api_client()


# ---- band names / kategori derived from score ----
@pytest.mark.parametrize("level", [25, 50, 75, 100])
def test_band_name_and_paragraph_per_level(client, level):
    pid = new_peserta(client, f"TEST_Band{level}")
    pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
    res = answer_all(client, pj["sesi_id"], level=level)
    assert res["skor"] == level, res
    assert res["kategori"] == BANDS[level], res

    h = client.get(f"{API}/sesi/{pj['sesi_id']}/hasil")
    assert h.status_code == 200, h.text
    d = h.json()
    assert d["skor"] == level
    assert d["kategori"] == BANDS[level]
    assert d["kategori_paragraf"] == PARAGRAF[BANDS[level]]
    for old in OLD_NAMES:
        assert old not in h.text, f"old band name {old} present"


def test_kategori_derived_at_render_even_if_db_stale(client):
    """Tamper sesi.kategori in DB; /hasil must still derive it from the score."""
    pid = new_peserta(client, "TEST_BandDerive")
    pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
    answer_all(client, pj["sesi_id"], level=100)
    mongo().sesi.update_one({"id": pj["sesi_id"]}, {"$set": {"kategori": "Nyaring Jati"}})
    try:
        d = client.get(f"{API}/sesi/{pj['sesi_id']}/hasil").json()
        assert d["kategori"] == "Eling", d["kategori"]
    finally:  # restore so the DB-cleanliness check is not polluted by this test
        mongo().sesi.update_one({"id": pj["sesi_id"]}, {"$set": {"kategori": "Eling"}})


def test_no_old_band_names_left_in_db():
    db = mongo()
    assert db.sesi.count_documents({"kategori": {"$in": list(OLD_NAMES)}}) == 0
    for k in db.sesi.distinct("kategori"):
        assert k is None or k in BANDS.values(), k


# ---- three-tier board ----
@pytest.mark.parametrize("jenis", ["bhurloka", "akasa", "paramartha"])
def test_papan_accepts_all_three_tiers(client, jenis):
    r = client.get(f"{API}/papan", params={"jenis": jenis})
    assert r.status_code == 200, r.text
    d = r.json()
    assert isinstance(d["top"], list)
    assert "_id" not in r.text
    ranks = [row["rank"] for row in d["top"]]
    assert ranks == list(range(1, len(ranks) + 1)), ranks


def test_papan_akasa_lists_finished_akasa(client):
    """A finished Ākāśa sesi must appear on the akasa board without opt-in."""
    pid = new_peserta(client, "TEST_PapanAkasa")
    tok = simulate_google_session(pid, "TEST Papan Akasa")
    auth = {"Authorization": f"Bearer {tok}"}
    pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
    answer_all(client, pj["sesi_id"], level=50)
    kode = unused_bacaan_code(client)
    r = client.post(f"{API}/perjalanan/{pj['perjalanan_id']}/bayar", json={"kode": kode}, headers=auth)
    assert r.status_code == 200, r.text
    akasa = r.json()["sesi_id"]
    assert get_sesi(client, akasa)["total"] == 30
    answer_all(client, akasa, level=100)

    d = client.get(f"{API}/papan", params={"jenis": "akasa", "peserta_id": pid}).json()
    names = [row["nama_tampilan"] for row in d["top"]]
    assert "TEST Papan Akasa" in names, names
    row = next(r_ for r_ in d["top"] if r_["nama_tampilan"] == "TEST Papan Akasa")
    assert row["skor"] == 100
    assert row["tanggal"]
    assert d["total"] >= 1


# ---- admin derives kategori ----
def test_admin_pesanan_kategori_from_score(client):
    r = client.get(f"{API}/admin/pesanan", params={"kunci": ADMIN_KEY})
    assert r.status_code == 200, r.text
    for old in OLD_NAMES:
        assert old not in r.text
    for o in r.json()["pesanan"]:
        assert "_id" not in o
        if o["skor"] is not None:
            assert o["kategori"] in BANDS.values(), o


# ---- diacritics in API payloads ----
def test_tier_names_have_diacritics(client):
    pid = new_peserta(client, "TEST_Diacritic")
    pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
    h = client.get(f"{API}/sesi/{pj['sesi_id']}/hasil")
    names = [t["nama"] for t in h.json()["peta"]]
    assert names == ["Bhurloka", "Ākāśa", "Paramārtha"], names
    for bad in ("Akasa", "Akasha", "Paramartha"):
        assert bad not in h.text, bad


# ---- CORS ----
def test_cors_preflight_and_simple_request(client):
    origin = BASE_URL
    r = client.options(f"{API}/papan", headers={
        "Origin": origin, "Access-Control-Request-Method": "GET"})
    assert r.status_code in (200, 204), (r.status_code, r.text)
    acao = r.headers.get("access-control-allow-origin")
    assert acao is not None, dict(r.headers)
    r2 = client.get(f"{API}/papan", params={"jenis": "bhurloka"}, headers={"Origin": origin})
    assert r2.status_code == 200
    assert r2.headers.get("access-control-allow-origin") is not None


def test_bearer_only_auth_works_without_cookie(client):
    """No cookie jar entry — Bearer alone must authorise gated endpoints."""
    s = api_client()
    pid = new_peserta(s, "TEST_BearerOnly")
    tok = simulate_google_session(pid, "TEST Bearer Only")
    assert s.cookies.get("session_token") is None
    me = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert me.status_code == 200, me.text
    assert me.json()["id"] == pid
    pj = s.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
    r = s.patch(f"{API}/sesi/{pj['sesi_id']}/papan", json={"tampil_di_papan": True},
                headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200, r.text

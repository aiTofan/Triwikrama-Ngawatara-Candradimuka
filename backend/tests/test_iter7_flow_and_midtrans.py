"""Iteration-7 regression:
(1) Bank counts Bhurloka=51 / Ākāśa=30 / Paramārtha=90 = 171.
(2) 3-category scoring 'Kesadaran Cicing/Nyaring/Eling' and exact Nyaring paragraph
    (no 'tetapi belum tentu bertindak', no 'Lulungu' anywhere).
(3) NEW FLOW: Bhurloka free (no login), /lanjut requires login → free Ākāśa,
    /lanjut → Paramārtha WITHOUT payment must return 402.
(4) /hasil label / peringkat / in_top10.
(5) Midtrans: /config/midtrans enabled + client_key + snap_url; /perjalanan/{id}/bayar/midtrans
    401 without auth; 200 with auth returns {order_id, token, client_key} from Snap sandbox;
    /midtrans/notification 403 on invalid signature.
"""
import hashlib
import json
import os
import sys

import pytest

sys.path.insert(0, "/app/backend/tests")
sys.path.insert(0, "/app/backend")
from backend_test import (API, api_client, new_peserta, simulate_google_session,  # noqa: E402
                          answer_all, get_sesi, mongo, unused_bacaan_code)


@pytest.fixture(scope="module")
def client():
    return api_client()


# ---------- Bank counts ----------
def test_bank_counts_iter7():
    data = json.load(open("/app/data/bank-soal.json", encoding="utf-8"))["soal"]
    by = {}
    for it in data:
        t = it.get("tingkat") or {1: "Bhurloka", 2: "Ākāśa", 3: "Paramārtha"}.get(it.get("bagian"))
        by[t] = by.get(t, 0) + 1
    assert by.get("Bhurloka") == 51, by
    assert by.get("Ākāśa") == 30, by
    assert by.get("Paramārtha") == 90, by
    assert sum(by.values()) == 171


# ---------- Scoring text / no legacy strings ----------
def test_nyaring_text_exact_and_no_lulungu(client):
    pid = new_peserta(client, "TEST_I7_Nyaring")
    pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
    answer_all(client, pj["sesi_id"], level=50)
    r = client.get(f"{API}/sesi/{pj['sesi_id']}/hasil")
    assert r.status_code == 200
    d = r.json()
    assert d["kategori"] == "Kesadaran Nyaring"
    assert d["kategori_paragraf"] == "Kesadaran Nyaring — sudah bangun dan melihat jernih."
    assert "tetapi belum tentu bertindak" not in r.text
    assert "Lulungu" not in r.text


def test_three_categories_only(client):
    valid = {"Kesadaran Cicing", "Kesadaran Nyaring", "Kesadaran Eling"}
    for level in (25, 50, 75, 100):
        pid = new_peserta(client, f"TEST_I7_Band{level}")
        pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
        r = answer_all(client, pj["sesi_id"], level=level)
        assert r["kategori"] in valid, r


# ---------- New flow: /lanjut auth, free Akasa, 402 before Paramartha ----------
def test_lanjut_unauth_401(client):
    pid = new_peserta(client, "TEST_I7_Lanjut401")
    pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
    answer_all(client, pj["sesi_id"], level=25)
    r = client.post(f"{API}/perjalanan/{pj['perjalanan_id']}/lanjut", json={})
    assert r.status_code == 401, r.text


def test_akasa_is_free_after_login(client):
    pid = new_peserta(client, "TEST_I7_FreeAkasa")
    tok = simulate_google_session(pid, "TEST I7 Free Akasa")
    auth = {"Authorization": f"Bearer {tok}"}
    pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
    answer_all(client, pj["sesi_id"], level=25)
    r = client.post(f"{API}/perjalanan/{pj['perjalanan_id']}/lanjut", json={}, headers=auth)
    assert r.status_code == 200, r.text
    assert r.json()["jenis"] == "akasa"
    ak = get_sesi(client, r.json()["sesi_id"])
    assert ak["jenis"] == "akasa" and ak["total"] == 30


def test_paramartha_402_without_payment(client):
    pid = new_peserta(client, "TEST_I7_402")
    tok = simulate_google_session(pid, "TEST I7 402")
    auth = {"Authorization": f"Bearer {tok}"}
    pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
    answer_all(client, pj["sesi_id"], level=25)
    r = client.post(f"{API}/perjalanan/{pj['perjalanan_id']}/lanjut", json={}, headers=auth)
    assert r.status_code == 200 and r.json()["jenis"] == "akasa"
    answer_all(client, r.json()["sesi_id"], level=25)
    # /lanjut before payment must be 402
    r2 = client.post(f"{API}/perjalanan/{pj['perjalanan_id']}/lanjut", json={}, headers=auth)
    assert r2.status_code == 402, r2.text
    assert "Rp17.000" in r2.json()["detail"] or "pembayaran" in r2.json()["detail"].lower()


# ---------- /hasil result page label + peringkat ----------
def test_hasil_carries_peringkat(client):
    pid = new_peserta(client, "TEST_I7_Rank")
    pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
    answer_all(client, pj["sesi_id"], level=50)
    d = client.get(f"{API}/sesi/{pj['sesi_id']}/hasil").json()
    assert "peringkat" in d, d.keys()
    p = d["peringkat"]
    assert set(p.keys()) == {"rank", "total", "in_top10"}
    assert isinstance(p["rank"], int) and p["rank"] >= 1
    assert isinstance(p["total"], int) and p["total"] >= p["rank"]
    assert isinstance(p["in_top10"], bool)
    assert p["in_top10"] == (p["rank"] <= 10)
    # tier_nama is one of the three Mandalas — result label constructed on the FE
    assert d["tier_nama"] in ("Bhurloka", "Ākāśa", "Paramārtha")


# ---------- Midtrans ----------
def test_midtrans_config(client):
    r = client.get(f"{API}/config/midtrans")
    assert r.status_code == 200
    d = r.json()
    assert d["enabled"] is True, d
    assert d["client_key"] and isinstance(d["client_key"], str)
    assert d["snap_url"].endswith("/snap/snap.js")


def test_bayar_midtrans_401_without_auth(client):
    pid = new_peserta(client, "TEST_I7_Mid401")
    pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
    r = client.post(f"{API}/perjalanan/{pj['perjalanan_id']}/bayar/midtrans", json={})
    assert r.status_code == 401, r.text


def test_bayar_midtrans_returns_snap_token(client):
    pid = new_peserta(client, "TEST_I7_MidToken")
    tok = simulate_google_session(pid, "TEST I7 MidToken")
    auth = {"Authorization": f"Bearer {tok}"}
    pj = client.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
    r = client.post(f"{API}/perjalanan/{pj['perjalanan_id']}/bayar/midtrans", json={}, headers=auth)
    if r.status_code == 502:
        pytest.skip("Midtrans sandbox unreachable in this run")
    assert r.status_code == 200, r.text
    d = r.json()
    assert set(d.keys()) >= {"order_id", "token", "client_key"}
    assert isinstance(d["token"], str) and len(d["token"]) > 10
    assert d["order_id"].startswith("trw-")
    # payment row persisted
    pay = mongo().payments.find_one({"order_id": d["order_id"]})
    assert pay and pay["status"] == "pending" and pay["amount"] == 17000


def test_midtrans_notification_bad_signature_403(client):
    payload = {
        "order_id": "trw-fake-00000000",
        "status_code": "200",
        "gross_amount": "17000.00",
        "transaction_status": "settlement",
        "fraud_status": "accept",
        "signature_key": "0" * 128,
    }
    r = client.post(f"{API}/midtrans/notification", json=payload)
    assert r.status_code == 403, r.text
    assert "Signature" in r.json()["detail"] or "tidak sah" in r.json()["detail"].lower()


def test_midtrans_notification_good_signature_but_unknown_order_404(client):
    """Signature verified → reconcile finds no payment → 404 (proves the sig branch
    passes only when valid)."""
    from dotenv import dotenv_values
    server_key = dotenv_values("/app/backend/.env").get("MIDTRANS_SERVER_KEY") or \
        os.environ.get("MIDTRANS_SERVER_KEY", "")
    if not server_key:
        pytest.skip("MIDTRANS_SERVER_KEY not set")
    order_id = "trw-not-real-00000000"
    status_code = "200"
    gross = "17000.00"
    sig = hashlib.sha512((order_id + status_code + gross + server_key).encode()).hexdigest()
    r = client.post(f"{API}/midtrans/notification", json={
        "order_id": order_id, "status_code": status_code, "gross_amount": gross,
        "transaction_status": "settlement", "fraud_status": "accept", "signature_key": sig,
    })
    # Signature accepted → reconcile → 404 "Order tidak ditemukan"
    assert r.status_code == 404, r.text

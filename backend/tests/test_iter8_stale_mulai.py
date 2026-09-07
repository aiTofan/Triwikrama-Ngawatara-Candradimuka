"""Iteration-8: backend sanity for the 'Gagal memulai' self-heal.

Confirms:
- POST /api/peserta creates a peserta.
- POST /api/perjalanan/mulai with valid peserta_id returns {jeda: False, sesi_id}.
- POST /api/perjalanan/mulai with a non-existent peserta_id returns 404
  (this is precisely the response the frontend now recovers from).
"""
import os
import uuid
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"


def test_create_peserta_then_mulai_returns_sesi():
    p = requests.post(f"{API}/peserta", json={"nama_tampilan": "TEST_iter8_ok", "email": None}, timeout=30)
    assert p.status_code == 200, p.text
    pid = p.json()["id"]
    assert isinstance(pid, str) and len(pid) > 0

    s = requests.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}, timeout=30)
    assert s.status_code == 200, s.text
    body = s.json()
    assert body.get("jeda") is False
    assert "sesi_id" in body and isinstance(body["sesi_id"], str)

    # sanity: /sesi/{id} returns a bhurloka session with 17 questions
    sesi = requests.get(f"{API}/sesi/{body['sesi_id']}", timeout=30)
    assert sesi.status_code == 200, sesi.text
    sdata = sesi.json()
    assert sdata.get("jenis") == "bhurloka" or sdata.get("tier_nama", "").lower() == "bhurloka"
    assert len(sdata.get("soal_ids", [])) == 17, f"expected 17 soal_ids, got {len(sdata.get('soal_ids', []))}"
    assert sdata.get("total") == 17


def test_mulai_with_unknown_peserta_returns_404():
    fake_id = f"does-not-exist-{uuid.uuid4()}"
    r = requests.post(f"{API}/perjalanan/mulai", json={"peserta_id": fake_id}, timeout=30)
    assert r.status_code == 404, f"expected 404, got {r.status_code} {r.text}"

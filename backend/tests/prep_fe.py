"""Prepare fixtures for frontend Playwright runs: a logged-in peserta with a paid
journey sitting on an Ākāśa sesi, plus an existing certificate serial."""
import json
import sys
sys.path.insert(0, "/app/backend/tests")
from backend_test import (API, api_client, new_peserta, simulate_google_session,
                          answer_all, unused_bacaan_code, get_sesi, mongo)

c = api_client()
pid = new_peserta(c, "TEST_FE_Journey")
tok = simulate_google_session(pid, "TEST FE User")
auth = {"Authorization": f"Bearer {tok}"}
pj = c.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid}).json()
answer_all(c, pj["sesi_id"], level=75)
kode = unused_bacaan_code(c)
r = c.post(f"{API}/perjalanan/{pj['perjalanan_id']}/bayar", json={"kode": kode}, headers=auth)
akasa = r.json()["sesi_id"]

# a second peserta with a fresh unpaid journey is not needed; also build a paramartha
# sesi (finish akasa quickly) so the checkpoint flow can be tested.
pid2 = new_peserta(c, "TEST_FE_Para")
tok2 = simulate_google_session(pid2, "TEST FE Para")
auth2 = {"Authorization": f"Bearer {tok2}"}
pj2 = c.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid2}).json()
answer_all(c, pj2["sesi_id"], level=50)
kode2 = unused_bacaan_code(c)
ak2 = c.post(f"{API}/perjalanan/{pj2['perjalanan_id']}/bayar", json={"kode": kode2}, headers=auth2).json()["sesi_id"]
answer_all(c, ak2, level=100)
para = c.post(f"{API}/perjalanan/{pj2['perjalanan_id']}/lanjut", json={}, headers=auth2).json()["sesi_id"]

sert = mongo().sertifikat.find_one({}, sort=[("created_at", -1)])
out = {
    "akasa": {"peserta_id": pid, "token": tok, "sesi_id": akasa, "total": get_sesi(c, akasa)["total"]},
    "paramartha": {"peserta_id": pid2, "token": tok2, "sesi_id": para, "total": get_sesi(c, para)["total"]},
    "serial": sert["nomor_seri"] if sert else None,
    "serial_nama": sert["nama_lengkap"] if sert else None,
}
print(json.dumps(out, indent=1))

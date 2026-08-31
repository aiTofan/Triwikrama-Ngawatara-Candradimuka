"""Fixtures for iteration-4 frontend Playwright run."""
import json
import sys
sys.path.insert(0, "/app/backend/tests")
from backend_test import (API, api_client, new_peserta, simulate_google_session,
                          answer_all, unused_bacaan_code, mongo)

c = api_client()

# 1. Bhurloka finished, UNPAID (for the bhurloka-exit controls) — not logged in
pid_b = new_peserta(c, "TEST_FE4_Bhurloka")
pj_b = c.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid_b}).json()
res_b = answer_all(c, pj_b["sesi_id"], level=50)

# 2. Fully finished journey (for /sertifikat + papan opt-in), logged in
pid_f = new_peserta(c, "TEST_FE4_Full")
tok_f = simulate_google_session(pid_f, "TEST FE4 Full")
auth = {"Authorization": f"Bearer {tok_f}"}
pj_f = c.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid_f}).json()
answer_all(c, pj_f["sesi_id"], level=100)
kode = unused_bacaan_code(c)
akasa = c.post(f"{API}/perjalanan/{pj_f['perjalanan_id']}/bayar", json={"kode": kode}, headers=auth).json()["sesi_id"]
answer_all(c, akasa, level=100)
para = c.post(f"{API}/perjalanan/{pj_f['perjalanan_id']}/lanjut", json={}, headers=auth).json()["sesi_id"]
answer_all(c, para, level=75)

# 3. An akasa result page (for the 'Lanjutkan ke Paramārtha' button)
pid_a = new_peserta(c, "TEST_FE4_Akasa")
tok_a = simulate_google_session(pid_a, "TEST FE4 Akasa")
autha = {"Authorization": f"Bearer {tok_a}"}
pj_a = c.post(f"{API}/perjalanan/mulai", json={"peserta_id": pid_a}).json()
answer_all(c, pj_a["sesi_id"], level=25)
kode_a = unused_bacaan_code(c)
akasa_a = c.post(f"{API}/perjalanan/{pj_a['perjalanan_id']}/bayar", json={"kode": kode_a}, headers=autha).json()["sesi_id"]
answer_all(c, akasa_a, level=50)

sert = mongo().sertifikat.find_one({}, sort=[("created_at", -1)])
out = {
    "bhurloka_sesi": pj_b["sesi_id"], "bhurloka_kategori": res_b["kategori"], "bhurloka_peserta": pid_b,
    "full_sesi": para, "full_peserta": pid_f, "full_token": tok_f, "full_nama": "TEST FE4 Full",
    "akasa_sesi": akasa_a, "akasa_peserta": pid_a, "akasa_token": tok_a,
    "serial": sert["nomor_seri"] if sert else None,
    "unused_kode": unused_bacaan_code(c),
}
print(json.dumps(out, indent=1))

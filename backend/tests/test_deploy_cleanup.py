"""Iteration-6 regression: /papan rewrite (scalable), admin bounded queries,
env-based ADMIN_KEY, migrate_kategori marker, no /periksa route, demo data present."""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")).rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_KEY = "CANDRA2026"

backend_env = dotenv_values("/app/backend/.env")
MONGO_URL = os.environ.get("MONGO_URL") or backend_env.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME") or backend_env.get("DB_NAME")


@pytest.fixture(scope="module")
def db():
    return MongoClient(MONGO_URL)[DB_NAME]


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# -------- ADMIN_KEY env-based --------
class TestAdminKeyEnv:
    def test_admin_key_env_value(self):
        import sys
        sys.path.insert(0, "/app/backend")
        # Reload to make sure env read
        import server
        assert server.ADMIN_KEY == "CANDRA2026"

    def test_admin_kode_forbidden(self, client):
        assert client.get(f"{API}/admin/kode").status_code == 403
        assert client.get(f"{API}/admin/kode", params={"kunci": "wrong"}).status_code == 403

    def test_admin_kode_ok_returns_55(self, client):
        r = client.get(f"{API}/admin/kode", params={"kunci": ADMIN_KEY})
        assert r.status_code == 200
        codes = r.json()["kode"]
        # request says 55 seeded codes (30 bacaan + 20 mandiri + 5 kohor)
        assert len(codes) == 55, len(codes)
        counts = {}
        for c in codes:
            counts[c["jenis"]] = counts.get(c["jenis"], 0) + 1
        assert counts == {"bacaan": 30, "mandiri": 20, "kohor": 5}, counts

    def test_admin_pesanan_forbidden(self, client):
        assert client.get(f"{API}/admin/pesanan").status_code == 403
        assert client.get(f"{API}/admin/pesanan", params={"kunci": "x"}).status_code == 403

    def test_admin_pesanan_shape(self, client):
        r = client.get(f"{API}/admin/pesanan", params={"kunci": ADMIN_KEY})
        assert r.status_code == 200
        for o in r.json()["pesanan"][:10]:
            assert {"id", "tanggal", "nama_cetak", "telepon", "alamat",
                    "status", "kategori", "nomor_seri", "skor"} <= set(o.keys())


# -------- /papan rewrite: shape, sort, total, my_rank, bad jenis --------
class TestPapan:
    def test_bad_jenis_400(self, client):
        r = client.get(f"{API}/papan", params={"jenis": "nonsense"})
        assert r.status_code == 400

    @pytest.mark.parametrize("jenis", ["bhurloka", "akasa", "paramartha"])
    def test_papan_sorted_and_total_matches(self, client, db, jenis):
        r = client.get(f"{API}/papan", params={"jenis": jenis})
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d["total"], int) and d["total"] >= 1  # demo seeded
        top = d["top"]
        assert len(top) <= 100
        # rank sequential from 1
        for i, row in enumerate(top):
            assert row["rank"] == i + 1
            assert set(row.keys()) == {"rank", "nama_tampilan", "skor", "tanggal"}
        # order: skor desc then selesai_at asc
        for a, b in zip(top, top[1:]):
            assert (a["skor"], -ord(a["tanggal"][0]) if a["tanggal"] else 0) >= (b["skor"], -ord(b["tanggal"][0]) if b["tanggal"] else 0) or (
                a["skor"] > b["skor"]
                or (a["skor"] == b["skor"] and (a["tanggal"] or "") <= (b["tanggal"] or ""))
            )
        # total == direct DB count
        q = {"jenis": jenis, "status": "selesai"}
        if jenis == "paramartha":
            q["tampil_di_papan"] = True
        assert d["total"] == db.sesi.count_documents(q)

    def test_papan_demo_indonesian_names(self, client):
        for j in ("bhurloka", "akasa", "paramartha"):
            r = client.get(f"{API}/papan", params={"jenis": j}).json()
            assert len(r["top"]) > 0, f"{j} board empty"
            # at least one demo row visible in the top
            has_indo = any(" " in row["nama_tampilan"] for row in r["top"])
            assert has_indo, f"{j} top names look empty/anonymous: {[r['nama_tampilan'] for r in r['top']]}"

    def test_papan_my_rank_outside_top(self, client, db):
        # pick a demo peserta_id from bhurloka; simulate outside top by inserting a low-score TEST_ sesi
        pid = f"TEST_ranker_{uuid.uuid4().hex[:6]}"
        db.peserta.insert_one({"id": pid, "nama_tampilan": pid, "created_at": datetime.now(timezone.utc).isoformat()})
        db.sesi.insert_one({
            "id": f"TEST_s_{uuid.uuid4().hex[:6]}", "peserta_id": pid, "perjalanan_id": "TEST_pj",
            "jenis": "bhurloka", "soal_ids": [], "soal_detail": {}, "jawaban": {},
            "posisi": 0, "status": "selesai", "skor": 1, "kategori": "Cicing",
            "tampil_di_papan": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "selesai_at": datetime.now(timezone.utc).isoformat(),
        })
        r = client.get(f"{API}/papan", params={"jenis": "bhurloka", "peserta_id": pid}).json()
        my = r["my_rank"]
        assert my is not None
        assert my["rank"] == r["total"], (my, r["total"])  # low score => last rank
        assert my["total"] == r["total"]
        # cleanup
        db.sesi.delete_many({"peserta_id": pid})
        db.peserta.delete_one({"id": pid})

    def test_papan_my_rank_none_for_unknown_peserta(self, client):
        r = client.get(f"{API}/papan", params={"jenis": "bhurloka",
                                              "peserta_id": "nope_" + uuid.uuid4().hex}).json()
        assert r["my_rank"] is None


# -------- migrate_kategori guarded by marker --------
class TestMigrationMarker:
    def test_marker_present(self, db):
        m = db.migrations.find_one({"name": "kategori_v2"})
        assert m is not None, "migration marker missing (would re-run every startup)"


# -------- /periksa removed route (frontend), API never had it --------
class TestNoPeriksaApi:
    def test_no_api_periksa(self, client):
        r = client.get(f"{API}/periksa/ANY")
        assert r.status_code == 404


# -------- demo data present + not TEST_ prefix (must not be wiped) --------
class TestDemoData:
    def test_demo_counts(self, db):
        assert db.peserta.count_documents({"id": {"$regex": "^demo_"}}) == 28
        assert db.sesi.count_documents({"id": {"$regex": "^demo_"}}) == 28
        assert db.sesi.count_documents({"jenis": "bhurloka", "id": {"$regex": "^demo_"}}) == 14
        assert db.sesi.count_documents({"jenis": "akasa", "id": {"$regex": "^demo_"}}) == 8
        assert db.sesi.count_documents({"jenis": "paramartha", "id": {"$regex": "^demo_"}}) == 6

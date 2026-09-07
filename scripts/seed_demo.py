"""Seed lightweight demo data so the Peta Kejernihan boards look alive in a demo.

Idempotent: all demo rows use ids prefixed with 'demo_' and are wiped + reinserted
on each run. Only the board needs skor/status/selesai_at, so no soal_detail is stored.
"""
import os
import random
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / "backend" / ".env")

db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]

NAMES = [
    "Arum Wulandari", "Bagas Nugroho", "Citra Dewanti", "Damar Saputra",
    "Endah Pertiwi", "Fajar Ramadhan", "Gita Maharani", "Hendra Wijaya",
    "Indah Lestari", "Joko Prasetyo", "Kirana Ayu", "Lukman Hakim",
    "Maya Anggraini", "Nanda Pratama", "Oka Suryanto", "Putri Handayani",
]


def wipe():
    db.peserta.delete_many({"id": {"$regex": "^demo_"}})
    db.sesi.delete_many({"id": {"$regex": "^demo_"}})


def iso(days_ago, hour):
    d = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return d.replace(hour=hour % 24, minute=random.randint(0, 59), second=0, microsecond=0).isoformat()


def seed_tier(jenis, count, score_range, on_board):
    docs_p, docs_s = [], []
    for i in range(count):
        pid = f"demo_p_{jenis}_{i}"
        nama = random.choice(NAMES)
        docs_p.append({
            "id": pid, "nama_tampilan": nama, "email": None,
            "google_sub": None, "nama_lengkap": nama, "foto_url": None,
            "created_at": iso(30 - i, 9),
        })
        skor = random.randint(*score_range)
        docs_s.append({
            "id": f"demo_s_{jenis}_{i}", "peserta_id": pid, "perjalanan_id": f"demo_pj_{jenis}_{i}",
            "jenis": jenis, "soal_ids": [], "soal_detail": {}, "jawaban": {},
            "posisi": 0, "status": "selesai", "skor": skor,
            "kategori": None, "tampil_di_papan": on_board,
            "created_at": iso(20 - i % 20, 8), "selesai_at": iso(20 - i % 20, 8 + (i % 8)),
        })
    if docs_p:
        db.peserta.insert_many(docs_p)
    if docs_s:
        db.sesi.insert_many(docs_s)


if __name__ == "__main__":
    wipe()
    seed_tier("bhurloka", 14, (25, 100), True)
    seed_tier("akasa", 8, (40, 100), True)
    seed_tier("paramartha", 6, (55, 100), True)
    print("Demo seeded:",
          db.sesi.count_documents({"id": {"$regex": "^demo_"}}), "sesi,",
          db.peserta.count_documents({"id": {"$regex": "^demo_"}}), "peserta")

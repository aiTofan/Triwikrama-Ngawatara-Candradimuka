from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import random
import string
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

ADMIN_KEY = "CANDRA2026"
DATA_FILE = ROOT_DIR.parent / "data" / "bank-soal.json"

# ---- Category definitions ----
KATEGORI_TABLE = [
    (25, 49, "Cicing", "Kesadaran tertidur dan reaktif"),
    (50, 74, "Nyaring Sela", "Pengamat yang masih ber-ego"),
    (75, 89, "Nyaring Jati", "Pengamat terjaga tetapi steril"),
    (90, 100, "Eling", "Berdaulat dan melahirkan karya nyata"),
]

KATEGORI_PARAGRAF = {
    "Cicing": "Pada kesempatan ini kesadaran terbaca masih tertidur dan reaktif; situasi ditanggapi lebih dulu oleh dorongan dan reaksi ketimbang pengamatan. Bacaan ini menggambarkan cara membaca keadaan pada satu momen, bukan sifat tetap dirimu.",
    "Nyaring Sela": "Pada kesempatan ini terbaca seorang pengamat yang mulai jernih namun masih ber-ego; ada jarak terhadap dorongan, tetapi kepentingan diri masih ikut mewarnai tanggapan. Bacaan ini menggambarkan cara membaca keadaan pada satu momen, bukan sifat tetap dirimu.",
    "Nyaring Jati": "Pada kesempatan ini terbaca pengamat yang terjaga tetapi cenderung steril; kesadaran hadir dan tenang, namun belum sepenuhnya bergerak menjadi tindakan yang melahirkan sesuatu. Bacaan ini menggambarkan cara membaca keadaan pada satu momen, bukan sifat tetap dirimu.",
    "Eling": "Pada kesempatan ini terbaca kesadaran yang berdaulat dan melahirkan karya nyata; keadaan dibaca jernih lalu diteruskan menjadi langkah yang berpijak dan bermanfaat. Bacaan ini menggambarkan cara membaca keadaan pada satu momen, bukan sifat tetap dirimu.",
}

LEVEL_NAMA = {25: "Cicing", 50: "Nyaring Sela", 75: "Nyaring Jati", 100: "Eling"}

MENONJOL_BACAAN = {
    25: "Pada banyak situasi tanggapan muncul secara reaktif; latihan menahan jeda sebelum bertindak akan paling terasa dampaknya.",
    50: "Sebagian besar tanggapan berjarak namun masih diwarnai kepentingan diri; melatih kejujuran pada niat akan menajamkan bacaan berikutnya.",
    75: "Kebanyakan tanggapan hadir tenang dan mengamati; langkah berikutnya adalah menerjemahkan ketenangan itu menjadi tindakan nyata.",
    100: "Kebanyakan tanggapan sudah berdaulat dan melahirkan tindakan; pola ini menandai kesadaran yang bekerja, bukan sekadar mengamati.",
}

EXERCISE_BY_BAGIAN = {
    1: "Cek Diri Dasa Kreta",
    2: "Lembar Kerja Panca Niti",
    3: "Audit Empati Radikal",
}


def kategori_for(skor: int):
    for lo, hi, nama, desc in KATEGORI_TABLE:
        if lo <= skor <= hi:
            return nama, desc
    return KATEGORI_TABLE[0][2], KATEGORI_TABLE[0][3]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def gen_code(n=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=n))


def load_bank() -> List[Dict[str, Any]]:
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("soal", [])


# ---- Models ----
class PesertaCreate(BaseModel):
    nama_tampilan: str
    email: Optional[str] = None


class MulaiSesi(BaseModel):
    peserta_id: str
    jenis: str  # "dasar" or "lengkap"


class Jawab(BaseModel):
    soal_no: int
    token: str


class SelesaiSesi(BaseModel):
    tampil_di_papan: Optional[bool] = None


class BukaBody(BaseModel):
    kode: str


class MinatCreate(BaseModel):
    nama: str
    kontak: str
    jalur: str  # "Mandiri" or "Kohor"
    jumlah_orang: Optional[int] = None
    catatan: Optional[str] = None
    kode_pembacaan: Optional[str] = None


class SertifikatCreate(BaseModel):
    nama_cetak: str
    telepon: str
    alamat: str
    catatan: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


# ---- Seeding ----
async def seed_codes():
    count = await db.kode_akses.count_documents({})
    if count > 0:
        return
    docs = []
    seen = set()

    def uniq():
        c = gen_code(8)
        while c in seen:
            c = gen_code(8)
        seen.add(c)
        return c

    for _ in range(30):
        docs.append({"kode": uniq(), "jenis": "bacaan", "dipakai_oleh": None, "dipakai_pada": None})
    for _ in range(20):
        docs.append({"kode": uniq(), "jenis": "mandiri", "dipakai_oleh": None, "dipakai_pada": None})
    for _ in range(5):
        docs.append({"kode": uniq(), "jenis": "kohor", "dipakai_oleh": None, "dipakai_pada": None})
    await db.kode_akses.insert_many(docs)
    logger.info("Seeded %d access codes", len(docs))


@app.on_event("startup")
async def on_startup():
    await seed_codes()


# ---- Draw logic ----
async def seen_soal_ids(peserta_id: str) -> Dict[int, str]:
    """Return map of soal_no -> earliest created_at (ISO) this peserta has seen."""
    seen: Dict[int, str] = {}
    async for s in db.sesi.find({"peserta_id": peserta_id}):
        created = s.get("created_at", "")
        for no in s.get("soal_ids", []):
            if no not in seen or created < seen[no]:
                seen[no] = created
    return seen


def draw_from_bagian(items: List[Dict], seen: Dict[int, str], need: int) -> List[Dict]:
    """Draw `need` items preferring unseen; fill remainder with items seen longest ago."""
    unseen = [it for it in items if it["no"] not in seen]
    seen_items = [it for it in items if it["no"] in seen]
    random.shuffle(unseen)
    drawn = unseen[:need]
    if len(drawn) < need:
        # fill with items seen longest ago (earliest created_at first)
        seen_items.sort(key=lambda it: seen.get(it["no"], ""))
        drawn += seen_items[: (need - len(drawn))]
    return drawn


def build_sesi_soal(items: List[Dict]) -> Dict:
    """Shuffle question order and options; return soal_ids, soal_detail (with skor+token)."""
    order = items[:]
    random.shuffle(order)
    soal_ids = [it["no"] for it in order]
    detail = {}
    for it in order:
        pilihan = []
        for p in it["pilihan"]:
            pilihan.append({"token": uuid.uuid4().hex[:8], "teks": p["teks"], "skor": p["skor"]})
        random.shuffle(pilihan)
        detail[str(it["no"])] = {
            "no": it["no"],
            "bagian": it["bagian"],
            "judul": it.get("judul", ""),
            "jenis": it.get("jenis", ""),
            "skenario": it.get("skenario", ""),
            "pilihan": pilihan,
        }
    return {"soal_ids": soal_ids, "soal_detail": detail}


def public_sesi(sesi: Dict) -> Dict:
    """Strip option scores before sending to the client."""
    detail = {}
    for no, d in sesi.get("soal_detail", {}).items():
        detail[no] = {
            "no": d["no"],
            "bagian": d["bagian"],
            "judul": d["judul"],
            "jenis": d["jenis"],
            "skenario": d["skenario"],
            "pilihan": [{"token": p["token"], "teks": p["teks"]} for p in d["pilihan"]],
        }
    return {
        "id": sesi["id"],
        "peserta_id": sesi["peserta_id"],
        "jenis": sesi["jenis"],
        "soal_ids": sesi["soal_ids"],
        "soal_detail": detail,
        "jawaban": sesi.get("jawaban", {}),
        "skor": sesi.get("skor"),
        "kategori": sesi.get("kategori"),
        "tampil_di_papan": sesi.get("tampil_di_papan", False),
        "terbuka": sesi.get("terbuka", False),
        "created_at": sesi.get("created_at"),
        "selesai_at": sesi.get("selesai_at"),
    }


# ---- Routes ----
@api_router.get("/")
async def root():
    return {"message": "Candradimuka API"}


@api_router.post("/peserta")
async def create_peserta(body: PesertaCreate):
    pid = str(uuid.uuid4())
    doc = {
        "id": pid,
        "nama_tampilan": body.nama_tampilan.strip(),
        "email": (body.email or None),
        "created_at": now_iso(),
    }
    await db.peserta.insert_one(doc)
    return {"id": pid, "nama_tampilan": doc["nama_tampilan"], "email": doc["email"]}


@api_router.get("/peserta/{peserta_id}")
async def get_peserta(peserta_id: str):
    p = await db.peserta.find_one({"id": peserta_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Peserta tidak ditemukan")
    return p


@api_router.post("/sesi/mulai")
async def mulai_sesi(body: MulaiSesi):
    peserta = await db.peserta.find_one({"id": body.peserta_id})
    if not peserta:
        raise HTTPException(404, "Peserta tidak ditemukan")
    if body.jenis not in ("dasar", "lengkap"):
        raise HTTPException(400, "Jenis uji tidak sah")

    # JEDA: 14 day pause for lengkap
    if body.jenis == "lengkap":
        last = None
        async for s in db.sesi.find({"peserta_id": body.peserta_id, "jenis": "lengkap", "selesai_at": {"$ne": None}}):
            sa = s.get("selesai_at")
            if sa and (last is None or sa > last):
                last = sa
        if last:
            last_dt = datetime.fromisoformat(last)
            boleh = last_dt + timedelta(days=14)
            if datetime.now(timezone.utc) < boleh:
                return {
                    "jeda": True,
                    "boleh_pada": boleh.isoformat(),
                    "pesan": "Jeda ini ada supaya pembacaan berikutnya mengukur hasil latihan, bukan pengulangan.",
                }

    bank = load_bank()
    seen = await seen_soal_ids(body.peserta_id)

    if body.jenis == "dasar":
        b1 = [it for it in bank if it["bagian"] == 1]
        drawn = draw_from_bagian(b1, seen, 15)
    else:
        drawn = []
        for bg in (1, 2, 3):
            items = [it for it in bank if it["bagian"] == bg]
            drawn += draw_from_bagian(items, seen, 15)

    built = build_sesi_soal(drawn)
    sid = str(uuid.uuid4())
    doc = {
        "id": sid,
        "peserta_id": body.peserta_id,
        "jenis": body.jenis,
        "soal_ids": built["soal_ids"],
        "soal_detail": built["soal_detail"],
        "jawaban": {},
        "skor": None,
        "kategori": None,
        "tampil_di_papan": False,
        "terbuka": False,
        "created_at": now_iso(),
        "selesai_at": None,
    }
    await db.sesi.insert_one(doc)
    return {"jeda": False, "sesi_id": sid}


@api_router.get("/sesi/{sesi_id}")
async def get_sesi(sesi_id: str):
    s = await db.sesi.find_one({"id": sesi_id})
    if not s:
        raise HTTPException(404, "Sesi tidak ditemukan")
    peserta = await db.peserta.find_one({"id": s["peserta_id"]}, {"_id": 0})
    out = public_sesi(s)
    out["peserta"] = peserta
    return out


@api_router.post("/sesi/{sesi_id}/jawab")
async def jawab(sesi_id: str, body: Jawab):
    s = await db.sesi.find_one({"id": sesi_id})
    if not s:
        raise HTTPException(404, "Sesi tidak ditemukan")
    detail = s.get("soal_detail", {}).get(str(body.soal_no))
    if not detail:
        raise HTTPException(400, "Soal tidak ada di sesi ini")
    valid = any(p["token"] == body.token for p in detail["pilihan"])
    if not valid:
        raise HTTPException(400, "Pilihan tidak sah")
    jawaban = s.get("jawaban", {})
    jawaban[str(body.soal_no)] = body.token
    await db.sesi.update_one({"id": sesi_id}, {"$set": {"jawaban": jawaban}})
    return {"ok": True}


def compute_scores(s: Dict):
    """Return (skor overall, per-bagian dict, distribution dict, chosen list)."""
    detail = s["soal_detail"]
    jawaban = s.get("jawaban", {})
    total = 0
    n = 0
    per_bagian: Dict[int, List[int]] = {}
    dist = {25: 0, 50: 0, 75: 0, 100: 0}
    chosen = []  # list of dicts: no, bagian, skenario, chosen_teks, chosen_skor, best_teks
    for no in s["soal_ids"]:
        d = detail[str(no)]
        tok = jawaban.get(str(no))
        if not tok:
            continue
        sc = next((p["skor"] for p in d["pilihan"] if p["token"] == tok), None)
        if sc is None:
            continue
        chosen_teks = next((p["teks"] for p in d["pilihan"] if p["token"] == tok), "")
        best_teks = next((p["teks"] for p in d["pilihan"] if p["skor"] == 100), "")
        total += sc
        n += 1
        per_bagian.setdefault(d["bagian"], []).append(sc)
        dist[sc] = dist.get(sc, 0) + 1
        chosen.append({
            "no": no, "bagian": d["bagian"], "skenario": d["skenario"],
            "chosen_teks": chosen_teks, "chosen_skor": sc, "best_teks": best_teks,
        })
    skor = round(total / n) if n else 0
    return skor, per_bagian, dist, chosen, n


@api_router.post("/sesi/{sesi_id}/selesai")
async def selesai(sesi_id: str, body: SelesaiSesi):
    s = await db.sesi.find_one({"id": sesi_id})
    if not s:
        raise HTTPException(404, "Sesi tidak ditemukan")
    skor, per_bagian, dist, chosen, n = compute_scores(s)
    nama, _ = kategori_for(skor)
    update = {
        "skor": skor,
        "kategori": nama,
        "selesai_at": now_iso(),
    }
    if s["jenis"] == "dasar":
        update["tampil_di_papan"] = True  # free test always on board
    else:
        if body.tampil_di_papan is not None:
            update["tampil_di_papan"] = bool(body.tampil_di_papan)
    await db.sesi.update_one({"id": sesi_id}, {"$set": update})
    return {"ok": True, "skor": skor, "kategori": nama}


@api_router.patch("/sesi/{sesi_id}/papan")
async def set_papan(sesi_id: str, body: SelesaiSesi):
    s = await db.sesi.find_one({"id": sesi_id})
    if not s:
        raise HTTPException(404, "Sesi tidak ditemukan")
    await db.sesi.update_one({"id": sesi_id}, {"$set": {"tampil_di_papan": bool(body.tampil_di_papan)}})
    return {"ok": True}


@api_router.get("/sesi/{sesi_id}/hasil")
async def hasil(sesi_id: str):
    s = await db.sesi.find_one({"id": sesi_id})
    if not s:
        raise HTTPException(404, "Sesi tidak ditemukan")
    peserta = await db.peserta.find_one({"id": s["peserta_id"]}, {"_id": 0})
    skor, per_bagian, dist, chosen, n = compute_scores(s)
    nama, desc = kategori_for(skor)

    out = {
        "sesi_id": sesi_id,
        "jenis": s["jenis"],
        "peserta": peserta,
        "skor": skor,
        "kategori": nama,
        "kategori_desc": desc,
        "kategori_paragraf": KATEGORI_PARAGRAF.get(nama, ""),
        "terbuka": s.get("terbuka", False),
        "tampil_di_papan": s.get("tampil_di_papan", False),
        "selesai_at": s.get("selesai_at"),
        "created_at": s.get("created_at"),
        "jumlah_soal": n,
        # disk data: ordered list of chosen skor by question order (for the woven figure)
        "disk": [
            next((p["skor"] for p in s["soal_detail"][str(no)]["pilihan"]
                  if p["token"] == s.get("jawaban", {}).get(str(no))), None)
            for no in s["soal_ids"]
        ],
    }

    # Paid section only when unlocked
    if s.get("terbuka"):
        per_bagian_out = []
        for bg in sorted(per_bagian.keys()):
            avg = round(sum(per_bagian[bg]) / len(per_bagian[bg]))
            bnama, _ = kategori_for(avg)
            per_bagian_out.append({"bagian": bg, "skor": avg, "level": bnama})

        # most prominent level
        menonjol_skor = max(dist.items(), key=lambda kv: (kv[1], kv[0]))[0] if any(dist.values()) else None

        # three ladders: items chosen at 75 (or 50 if fewer than three)
        c75 = [c for c in chosen if c["chosen_skor"] == 75]
        pick = c75
        if len(c75) < 3:
            pick = c75 + [c for c in chosen if c["chosen_skor"] == 50]
        tangga = []
        for c in pick[:3]:
            tangga.append({
                "skenario": c["skenario"],
                "pilihan_dipilih": c["chosen_teks"],
                "pilihan_seratus": c["best_teks"],
                "beda": "Bedanya terletak pada meneruskan kesadaran menjadi tindakan nyata, bukan berhenti pada pengamatan.",
            })

        # weakest bagian
        latihan = None
        if per_bagian:
            weakest = min(per_bagian.keys(), key=lambda bg: sum(per_bagian[bg]) / len(per_bagian[bg]))
            latihan = {"bagian": weakest, "nama": EXERCISE_BY_BAGIAN.get(weakest, "")}

        kode_dipakai = s.get("kode_dipakai")

        out["berbayar"] = {
            "per_bagian": per_bagian_out,
            "sebaran": {"25": dist[25], "50": dist[50], "75": dist[75], "100": dist[100]},
            "menonjol": {
                "skor": menonjol_skor,
                "level": LEVEL_NAMA.get(menonjol_skor, ""),
                "bacaan": MENONJOL_BACAAN.get(menonjol_skor, ""),
            },
            "tangga": tangga,
            "latihan": latihan,
            "kode_dipakai": kode_dipakai,
        }
    return out


@api_router.post("/sesi/{sesi_id}/buka")
async def buka(sesi_id: str, body: BukaBody):
    s = await db.sesi.find_one({"id": sesi_id})
    if not s:
        raise HTTPException(404, "Sesi tidak ditemukan")
    if s.get("terbuka"):
        return {"ok": True, "terbuka": True}
    kode = body.kode.strip().upper()
    k = await db.kode_akses.find_one({"kode": kode, "jenis": "bacaan"})
    if not k:
        raise HTTPException(400, "Kode tidak ditemukan.")
    if k.get("dipakai_oleh"):
        raise HTTPException(400, "Kode ini sudah dipakai.")
    await db.kode_akses.update_one(
        {"kode": kode},
        {"$set": {"dipakai_oleh": s["peserta_id"], "dipakai_pada": now_iso()}},
    )
    await db.sesi.update_one({"id": sesi_id}, {"$set": {"terbuka": True, "kode_dipakai": kode}})
    return {"ok": True, "terbuka": True}


@api_router.get("/papan")
async def papan(jenis: str = Query(...), peserta_id: Optional[str] = None):
    if jenis not in ("dasar", "lengkap"):
        raise HTTPException(400, "Jenis tidak sah")
    q = {"jenis": jenis, "selesai_at": {"$ne": None}}
    if jenis == "lengkap":
        q["tampil_di_papan"] = True
    all_sesi = []
    async for s in db.sesi.find(q):
        all_sesi.append(s)
    # sort by skor desc, then selesai_at asc
    all_sesi.sort(key=lambda s: (-(s.get("skor") or 0), s.get("selesai_at") or ""))
    total = len(all_sesi)
    top = []
    for i, s in enumerate(all_sesi[:100]):
        peserta = await db.peserta.find_one({"id": s["peserta_id"]}, {"_id": 0})
        top.append({
            "rank": i + 1,
            "nama_tampilan": peserta["nama_tampilan"] if peserta else "-",
            "skor": s.get("skor"),
            "tanggal": s.get("selesai_at"),
        })
    my_rank = None
    if peserta_id:
        for i, s in enumerate(all_sesi):
            if s["peserta_id"] == peserta_id:
                my_rank = {"rank": i + 1, "total": total}
                break
    return {"top": top, "total": total, "my_rank": my_rank}


@api_router.post("/minat")
async def create_minat(body: MinatCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "nama": body.nama.strip(),
        "kontak": body.kontak.strip(),
        "jalur": body.jalur,
        "jumlah_orang": body.jumlah_orang if body.jalur == "Kohor" else None,
        "catatan": body.catatan,
        "kode_pembacaan": body.kode_pembacaan,
        "created_at": now_iso(),
    }
    await db.minat.insert_one(doc)
    return {"ok": True}


@api_router.post("/sertifikat/{sesi_id}")
async def create_sertifikat(sesi_id: str, body: SertifikatCreate):
    s = await db.sesi.find_one({"id": sesi_id})
    if not s:
        raise HTTPException(404, "Sesi tidak ditemukan")
    if s["jenis"] != "lengkap" or not s.get("selesai_at"):
        raise HTTPException(400, "Sertifikat hanya untuk uji lengkap yang telah selesai.")
    kode_verifikasi = ''.join(random.choices(string.ascii_uppercase, k=10))
    order_id = str(uuid.uuid4())
    doc = {
        "id": order_id,
        "sesi_id": sesi_id,
        "nama_cetak": body.nama_cetak.strip(),
        "telepon": body.telepon.strip(),
        "alamat": body.alamat.strip(),
        "catatan": body.catatan,
        "kode_verifikasi": kode_verifikasi,
        "status": "baru",
        "created_at": now_iso(),
    }
    await db.pesanan_sertifikat.insert_one(doc)
    return {
        "ok": True,
        "order_id": order_id,
        "kode_verifikasi": kode_verifikasi,
        "total": "Rp150.000 ditambah ongkos kirim yang dikabarkan kemudian",
    }


@api_router.get("/periksa/{kode}")
async def periksa(kode: str):
    order = await db.pesanan_sertifikat.find_one({"kode_verifikasi": kode.strip().upper()})
    if not order:
        raise HTTPException(404, "Kode verifikasi tidak ditemukan.")
    s = await db.sesi.find_one({"id": order["sesi_id"]})
    return {
        "nama_cetak": order["nama_cetak"],
        "tanggal_uji": s.get("selesai_at") if s else None,
        "kategori": s.get("kategori") if s else None,
        "skor": s.get("skor") if s else None,
    }


# ---- Admin ----
@api_router.get("/admin/kode")
async def admin_kode(kunci: str = ""):
    if kunci != ADMIN_KEY:
        raise HTTPException(403, "Kunci tidak sesuai.")
    codes = []
    async for k in db.kode_akses.find({}, {"_id": 0}):
        codes.append(k)
    codes.sort(key=lambda c: (c["jenis"], c["kode"]))
    return {"kode": codes}


@api_router.get("/admin/pesanan")
async def admin_pesanan(kunci: str = ""):
    if kunci != ADMIN_KEY:
        raise HTTPException(403, "Kunci tidak sesuai.")
    out = []
    async for o in db.pesanan_sertifikat.find({}, {"_id": 0}):
        s = await db.sesi.find_one({"id": o["sesi_id"]})
        out.append({
            "id": o["id"],
            "tanggal": o["created_at"],
            "nama_cetak": o["nama_cetak"],
            "kategori": s.get("kategori") if s else None,
            "skor": s.get("skor") if s else None,
            "telepon": o["telepon"],
            "alamat": o["alamat"],
            "status": o["status"],
            "kode_verifikasi": o["kode_verifikasi"],
        })
    out.sort(key=lambda o: o["tanggal"], reverse=True)
    return {"pesanan": out}


@api_router.patch("/admin/pesanan/{order_id}/status")
async def admin_pesanan_status(order_id: str, body: StatusUpdate, kunci: str = ""):
    if kunci != ADMIN_KEY:
        raise HTTPException(403, "Kunci tidak sesuai.")
    if body.status not in ("baru", "dibayar", "dicetak", "dikirim"):
        raise HTTPException(400, "Status tidak sah")
    await db.pesanan_sertifikat.update_one({"id": order_id}, {"$set": {"status": body.status}})
    return {"ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

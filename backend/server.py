from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import random
import string
import secrets
import base64
import hashlib
import hmac
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from collections import defaultdict, Counter

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

ADMIN_KEY = os.environ.get("ADMIN_KEY", "CANDRA2026")
MIDTRANS_SERVER_KEY = os.environ.get("MIDTRANS_SERVER_KEY", "")
MIDTRANS_CLIENT_KEY = os.environ.get("MIDTRANS_CLIENT_KEY", "")
MIDTRANS_API_BASE = os.environ.get("MIDTRANS_API_BASE", "https://api.sandbox.midtrans.com")
MIDTRANS_SNAP_BASE = os.environ.get("MIDTRANS_SNAP_BASE", "https://app.sandbox.midtrans.com")
BIAYA_PARAMARTHA = 17000
DATA_FILE = ROOT_DIR.parent / "data" / "bank-soal.json"
EMERGENT_AUTH = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# ---- Tier config ----
# jenis: 'bhurloka' | 'akasa' | 'paramartha'
TIERS = [
    {"key": "bhurloka", "nama": "Bhurloka", "match": "Bhurloka", "target": 17, "bagian": 1},
    {"key": "akasa", "nama": "Ākāśa", "match": "Ākāśa", "target": 30, "bagian": 2},
    {"key": "paramartha", "nama": "Paramārtha", "match": "Paramārtha", "target": 90, "bagian": 3},
]
TIER_BY_KEY = {t["key"]: t for t in TIERS}
TIER_ORDER = ["bhurloka", "akasa", "paramartha"]

EXERCISE_BY_TIER = {
    "bhurloka": "Cek Diri Dasa Kreta",
    "akasa": "Lembar Kerja Panca Niti",
    "paramartha": "Audit Empati Radikal",
}

KATEGORI_TABLE = [
    (25, 49, "Kesadaran Cicing", "diam dan bereaksi dari rasa, emosi atau kebiasaan"),
    (50, 74, "Kesadaran Nyaring", "sudah bangun dan melihat jernih, tetapi belum tentu bertindak"),
    (75, 100, "Kesadaran Eling", "sadar, berdaulat, dan menindaklanjuti apa yang dilihatnya"),
]
KATEGORI_PARAGRAF = {
    "Kesadaran Cicing": "Kesadaran Cicing — diam dan bereaksi dari rasa, emosi atau kebiasaan.",
    "Kesadaran Nyaring": "Kesadaran Nyaring — sudah bangun dan melihat jernih, tetapi belum tentu bertindak.",
    "Kesadaran Eling": "Kesadaran Eling — sadar, berdaulat, dan menindaklanjuti apa yang dilihatnya.",
}
LEVEL_NAMA = {25: "Kesadaran Cicing", 50: "Kesadaran Nyaring", 75: "Kesadaran Eling", 100: "Kesadaran Eling"}
MENONJOL_BACAAN = {
    25: "Pada banyak situasi tanggapan muncul secara reaktif; latihan menahan jeda sebelum bertindak akan paling terasa dampaknya.",
    50: "Sebagian besar tanggapan berjarak namun masih diwarnai kepentingan diri; melatih kejujuran pada niat akan menajamkan bacaan berikutnya.",
    75: "Kebanyakan tanggapan hadir tenang dan mengamati; langkah berikutnya adalah menerjemahkan ketenangan itu menjadi tindakan nyata.",
    100: "Kebanyakan tanggapan sudah berdaulat dan melahirkan tindakan; pola ini menandai kesadaran yang bekerja, bukan sekadar mengamati.",
}

SERIAL_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"  # Crockford base32, no I L O U


def kategori_for(skor: int):
    for lo, hi, nama, desc in KATEGORI_TABLE:
        if lo <= skor <= hi:
            return nama, desc
    return KATEGORI_TABLE[0][2], KATEGORI_TABLE[0][3]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def gen_code(n: int = 8) -> str:
    # Access codes act as tokens, so use a cryptographically secure source.
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(n))


def item_tingkat(it: Dict) -> Optional[str]:
    """Prefer the item's own 'tingkat'; fall back to a bagian->tingkat mapping."""
    t = it.get("tingkat")
    if t:
        return t
    return {1: "Bhurloka", 2: "Ākāśa", 3: "Paramārtha"}.get(it.get("bagian"))


def load_bank() -> List[Dict[str, Any]]:
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("soal", [])


def gen_serial(yy: str) -> str:
    seven = ''.join(secrets.choice(SERIAL_ALPHABET) for _ in range(7))
    chk = SERIAL_ALPHABET[sum(SERIAL_ALPHABET.index(c) for c in seven) % 32]
    return f"TRW-{yy}-{seven}-{chk}"


def valid_serial(s: str) -> bool:
    parts = s.strip().upper().split("-")
    if len(parts) != 4 or parts[0] != "TRW":
        return False
    yy, seven, chk = parts[1], parts[2], parts[3]
    if len(yy) != 2 or not yy.isdigit():
        return False
    if len(seven) != 7 or any(c not in SERIAL_ALPHABET for c in seven):
        return False
    if len(chk) != 1 or chk not in SERIAL_ALPHABET:
        return False
    return SERIAL_ALPHABET[sum(SERIAL_ALPHABET.index(c) for c in seven) % 32] == chk


# ---- Models ----
class PesertaCreate(BaseModel):
    nama_tampilan: str
    email: Optional[str] = None


class MulaiPerjalanan(BaseModel):
    peserta_id: str


class Jawab(BaseModel):
    soal_no: int
    token: str
    posisi: Optional[int] = None


class PosisiBody(BaseModel):
    posisi: int


class BayarBody(BaseModel):
    kode: str


class TampilBody(BaseModel):
    tampil_di_papan: bool


class MinatCreate(BaseModel):
    nama: str
    kontak: str
    jalur: str
    jumlah_orang: Optional[int] = None
    catatan: Optional[str] = None
    kode_pembacaan: Optional[str] = None


class SertifikatCreate(BaseModel):
    nama_cetak: str
    telepon: str
    alamat: str
    catatan: Optional[str] = None
    bentuk: Optional[str] = "cetak"


class StatusUpdate(BaseModel):
    status: str


class SessionBody(BaseModel):
    session_id: str
    peserta_id: Optional[str] = None


class ValidasiBody(BaseModel):
    nomor_seri: str


# ---- Seeding ----
async def seed_codes():
    if await db.kode_akses.count_documents({}) > 0:
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


async def migrate_kategori():
    """One-off (guarded by a marker): rewrite sesi.kategori from the score so no old band name survives."""
    if await db.migrations.find_one({"name": "kategori_v3"}):
        return
    async for s in db.sesi.find({"skor": {"$ne": None}}, {"_id": 0, "id": 1, "skor": 1, "kategori": 1}).limit(100000):
        correct = kategori_for(s["skor"])[0]
        if s.get("kategori") != correct:
            await db.sesi.update_one({"id": s["id"]}, {"$set": {"kategori": correct}})
    await db.migrations.insert_one({"name": "kategori_v3", "at": now_iso()})


@app.on_event("startup")
async def on_startup():
    await seed_codes()
    await migrate_kategori()


# ---- Auth ----
async def current_peserta(request: Request) -> Optional[Dict]:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        return None
    sess = await db.user_sessions.find_one({"session_token": token})
    if not sess:
        return None
    exp = sess.get("expires_at")
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp and exp < datetime.now(timezone.utc):
        return None
    return await db.peserta.find_one({"id": sess["peserta_id"]}, {"_id": 0})


@api_router.post("/auth/session")
async def auth_session(body: SessionBody, response: Response):
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    async with httpx.AsyncClient() as hc:
        r = await hc.get(EMERGENT_AUTH, headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(401, "Sesi Google tidak sah.")
    data = r.json()
    google_sub = data["id"]
    email = data.get("email")
    nama = data.get("name")
    foto = data.get("picture")
    session_token = data["session_token"]

    # Find existing peserta by google_sub, else attach to provided peserta_id, else create.
    peserta = await db.peserta.find_one({"google_sub": google_sub})
    if peserta:
        pid = peserta["id"]
        await db.peserta.update_one({"id": pid}, {"$set": {"nama_lengkap": nama, "foto_url": foto, "email": email}})
    elif body.peserta_id:
        pid = body.peserta_id
        await db.peserta.update_one({"id": pid}, {"$set": {"google_sub": google_sub, "nama_lengkap": nama, "foto_url": foto, "email": email}})
    else:
        pid = str(uuid.uuid4())
        await db.peserta.insert_one({"id": pid, "nama_tampilan": nama or "Peserta", "email": email,
                                     "google_sub": google_sub, "nama_lengkap": nama, "foto_url": foto, "created_at": now_iso()})

    expires = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({"peserta_id": pid, "session_token": session_token,
                                       "expires_at": expires.isoformat(), "created_at": now_iso()})
    response.set_cookie("session_token", session_token, httponly=True, secure=True, samesite="none", path="/", max_age=7 * 24 * 3600)
    p = await db.peserta.find_one({"id": pid}, {"_id": 0})
    return {"peserta": p, "session_token": session_token}


@api_router.get("/auth/me")
async def auth_me(request: Request):
    p = await current_peserta(request)
    if not p:
        raise HTTPException(401, "Belum masuk.")
    return p


@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if token:
        await db.user_sessions.delete_many({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---- Draw logic ----
async def seen_soal_ids(peserta_id: str) -> Dict[int, str]:
    seen: Dict[int, str] = {}
    async for s in db.sesi.find({"peserta_id": peserta_id}, {"_id": 0, "soal_ids": 1, "created_at": 1}):
        created = s.get("created_at", "")
        for no in s.get("soal_ids", []):
            if no not in seen or created < seen[no]:
                seen[no] = created
    return seen


def draw_tier(pool: List[Dict], seen: Dict[int, str], target: int) -> List[Dict]:
    """Random sample of `target` items, preferring unseen; fill remainder oldest-seen first."""
    unseen = [it for it in pool if it["no"] not in seen]
    seen_items = [it for it in pool if it["no"] in seen]
    random.shuffle(unseen)
    take = min(target, len(unseen))
    drawn = random.sample(unseen, take) if unseen else []
    if len(drawn) < target and seen_items:
        seen_items.sort(key=lambda it: seen.get(it["no"], ""))
        drawn += seen_items[: (target - len(drawn))]
    return drawn


def build_sesi_soal(items: List[Dict]) -> Dict:
    order = items[:]
    random.shuffle(order)
    soal_ids = [it["no"] for it in order]
    detail = {}
    for it in order:
        pilihan = [{"token": uuid.uuid4().hex[:8], "teks": p["teks"], "skor": p["skor"]} for p in it["pilihan"]]
        random.shuffle(pilihan)
        detail[str(it["no"])] = {
            "no": it["no"], "bagian": it.get("bagian"), "tingkat": item_tingkat(it),
            "judul": it.get("judul", ""), "jenis": it.get("jenis", ""),
            "skenario": it.get("skenario", ""), "pilihan": pilihan,
        }
    return {"soal_ids": soal_ids, "soal_detail": detail}


async def create_tier_sesi(peserta_id: str, perjalanan_id: str, tier_key: str) -> str:
    tier = TIER_BY_KEY[tier_key]
    bank = load_bank()
    pool = [it for it in bank if item_tingkat(it) == tier["match"]]
    seen = await seen_soal_ids(peserta_id)
    drawn = draw_tier(pool, seen, tier["target"])
    built = build_sesi_soal(drawn)
    sid = str(uuid.uuid4())
    await db.sesi.insert_one({
        "id": sid, "peserta_id": peserta_id, "perjalanan_id": perjalanan_id, "jenis": tier_key,
        "soal_ids": built["soal_ids"], "soal_detail": built["soal_detail"], "jawaban": {},
        "posisi": 0, "status": "berjalan", "skor": None, "kategori": None,
        "tampil_di_papan": False, "created_at": now_iso(), "selesai_at": None,
    })
    return sid


def public_pilihan(d):
    return [{"token": p["token"], "teks": p["teks"]} for p in d["pilihan"]]  # TEXT ONLY, no skor


def public_sesi(sesi: Dict, terbuka: bool) -> Dict:
    detail = {}
    for no, d in sesi.get("soal_detail", {}).items():
        detail[no] = {"no": d["no"], "tingkat": d.get("tingkat"), "judul": d["judul"],
                      "jenis": d["jenis"], "skenario": d["skenario"], "pilihan": public_pilihan(d)}
    tier = TIER_BY_KEY[sesi["jenis"]]
    return {
        "id": sesi["id"], "peserta_id": sesi["peserta_id"], "perjalanan_id": sesi.get("perjalanan_id"),
        "jenis": sesi["jenis"], "tier_nama": tier["nama"], "total": len(sesi["soal_ids"]),
        "soal_ids": sesi["soal_ids"], "soal_detail": detail, "jawaban": sesi.get("jawaban", {}),
        "posisi": sesi.get("posisi", 0), "status": sesi.get("status"),
        "terbuka": terbuka, "created_at": sesi.get("created_at"), "selesai_at": sesi.get("selesai_at"),
    }


def score_sesi(s: Dict):
    detail = s["soal_detail"]; jawaban = s.get("jawaban", {})
    total = 0; n = 0
    dist = {25: 0, 50: 0, 75: 0, 100: 0}
    chosen = []
    for no in s["soal_ids"]:
        d = detail[str(no)]
        tok = jawaban.get(str(no))
        if not tok:
            continue
        sc = next((p["skor"] for p in d["pilihan"] if p["token"] == tok), None)
        if sc is None:
            continue
        ct = next((p["teks"] for p in d["pilihan"] if p["token"] == tok), "")
        bt = next((p["teks"] for p in d["pilihan"] if p["skor"] == 100), "")
        total += sc; n += 1; dist[sc] = dist.get(sc, 0) + 1
        chosen.append({"no": no, "skenario": d["skenario"], "chosen_teks": ct, "chosen_skor": sc, "best_teks": bt})
    skor = round(total / n) if n else 0
    return skor, dist, chosen, n


# ---- Peserta ----
@api_router.post("/peserta")
async def create_peserta(body: PesertaCreate):
    pid = str(uuid.uuid4())
    doc = {"id": pid, "nama_tampilan": body.nama_tampilan.strip(), "email": (body.email or None),
           "google_sub": None, "nama_lengkap": None, "foto_url": None, "created_at": now_iso()}
    await db.peserta.insert_one(doc)
    return {"id": pid, "nama_tampilan": doc["nama_tampilan"], "email": doc["email"]}


@api_router.get("/peserta/{peserta_id}/lanjutan")
async def lanjutan(peserta_id: str):
    s = await db.sesi.find_one({"peserta_id": peserta_id, "status": "berjalan"}, sort=[("created_at", -1)])
    if not s:
        return {"ada": False}
    tier = TIER_BY_KEY[s["jenis"]]
    return {"ada": True, "sesi_id": s["id"], "tier_nama": tier["nama"], "jenis": s["jenis"],
            "posisi": s.get("posisi", 0), "total": len(s["soal_ids"])}


# ---- Journey ----
@api_router.post("/perjalanan/mulai")
async def mulai_perjalanan(body: MulaiPerjalanan):
    peserta = await db.peserta.find_one({"id": body.peserta_id})
    if not peserta:
        raise HTTPException(404, "Peserta tidak ditemukan")
    # 14-day pause between finished journeys
    latest = await db.perjalanan.find_one(
        {"peserta_id": body.peserta_id, "selesai_at": {"$ne": None}},
        {"_id": 0, "selesai_at": 1}, sort=[("selesai_at", -1)])
    last = latest.get("selesai_at") if latest else None
    if last:
        boleh = datetime.fromisoformat(last) + timedelta(days=14)
        if datetime.now(timezone.utc) < boleh:
            return {"jeda": True, "boleh_pada": boleh.isoformat(),
                    "pesan": "Jeda ini ada supaya perjalanan berikutnya mengukur hasil latihan, bukan pengulangan."}
    pjid = str(uuid.uuid4())
    await db.perjalanan.insert_one({"id": pjid, "peserta_id": body.peserta_id, "terbuka": False,
                                    "dibayar_pada": None, "selesai_at": None, "created_at": now_iso()})
    sid = await create_tier_sesi(body.peserta_id, pjid, "bhurloka")
    return {"jeda": False, "perjalanan_id": pjid, "sesi_id": sid}


@api_router.get("/sesi/{sesi_id}")
async def get_sesi(sesi_id: str):
    s = await db.sesi.find_one({"id": sesi_id})
    if not s:
        raise HTTPException(404, "Sesi tidak ditemukan")
    pj = await db.perjalanan.find_one({"id": s.get("perjalanan_id")})
    peserta = await db.peserta.find_one({"id": s["peserta_id"]}, {"_id": 0, "email": 0, "google_sub": 0})
    out = public_sesi(s, bool(pj and pj.get("terbuka")))
    out["peserta"] = peserta
    return out


@api_router.post("/sesi/{sesi_id}/jawab")
async def jawab(sesi_id: str, body: Jawab):
    s = await db.sesi.find_one({"id": sesi_id})
    if not s:
        raise HTTPException(404, "Sesi tidak ditemukan")
    d = s.get("soal_detail", {}).get(str(body.soal_no))
    if not d:
        raise HTTPException(400, "Soal tidak ada di sesi ini")
    if not any(p["token"] == body.token for p in d["pilihan"]):
        raise HTTPException(400, "Pilihan tidak sah")
    jawaban = s.get("jawaban", {}); jawaban[str(body.soal_no)] = body.token
    upd = {"jawaban": jawaban}
    if body.posisi is not None:
        upd["posisi"] = body.posisi
    await db.sesi.update_one({"id": sesi_id}, {"$set": upd})
    return {"ok": True}


@api_router.post("/sesi/{sesi_id}/posisi")
async def set_posisi(sesi_id: str, body: PosisiBody):
    await db.sesi.update_one({"id": sesi_id}, {"$set": {"posisi": body.posisi}})
    return {"ok": True}


@api_router.post("/sesi/{sesi_id}/selesai")
async def selesai(sesi_id: str):
    s = await db.sesi.find_one({"id": sesi_id})
    if not s:
        raise HTTPException(404, "Sesi tidak ditemukan")
    skor, dist, chosen, n = score_sesi(s)
    nama, _ = kategori_for(skor)
    await db.sesi.update_one({"id": sesi_id}, {"$set": {"skor": skor, "kategori": nama, "status": "selesai", "selesai_at": now_iso()}})
    # If this is paramartha, mark journey finished
    if s["jenis"] == "paramartha":
        await db.perjalanan.update_one({"id": s["perjalanan_id"]}, {"$set": {"selesai_at": now_iso()}})
    return {"ok": True, "skor": skor, "kategori": nama}


@api_router.post("/perjalanan/{pj_id}/bayar")
async def bayar(pj_id: str, body: BayarBody, request: Request):
    peserta = await current_peserta(request)
    if not peserta:
        raise HTTPException(401, "Masuk dengan Google untuk melanjutkan pembayaran.")
    pj = await db.perjalanan.find_one({"id": pj_id})
    if not pj:
        raise HTTPException(404, "Perjalanan tidak ditemukan")
    if pj.get("terbuka"):
        return {"ok": True, "terbuka": True}
    kode = body.kode.strip().upper()
    k = await db.kode_akses.find_one({"kode": kode, "jenis": "bacaan"})
    if not k:
        raise HTTPException(400, "Kode tidak ditemukan.")
    if k.get("dipakai_oleh"):
        raise HTTPException(400, "Kode ini sudah dipakai.")
    await db.kode_akses.update_one({"kode": kode}, {"$set": {"dipakai_oleh": pj["peserta_id"], "dipakai_pada": now_iso()}})
    await db.perjalanan.update_one({"id": pj_id}, {"$set": {"terbuka": True, "dibayar_pada": now_iso(), "kode_dipakai": kode}})
    # Payment unlocks the final Mandala Paramārtha (and includes the full reading)
    existing = set()
    async for s in db.sesi.find({"perjalanan_id": pj_id}, {"_id": 0, "jenis": 1}):
        existing.add(s["jenis"])
    if "paramartha" in existing:
        return {"ok": True, "terbuka": True, "sesi_id": None}
    sid = await create_tier_sesi(pj["peserta_id"], pj_id, "paramartha")
    return {"ok": True, "terbuka": True, "sesi_id": sid}


@api_router.post("/perjalanan/{pj_id}/lanjut")
async def lanjut_tier(pj_id: str, request: Request):
    """Advance to the next Mandala. Bhurloka -> Ākāśa is free (login only);
    Ākāśa -> Paramārtha requires payment (perjalanan.terbuka)."""
    peserta = await current_peserta(request)
    if not peserta:
        raise HTTPException(401, "Masuk dengan Google untuk melanjutkan.")
    pj = await db.perjalanan.find_one({"id": pj_id})
    if not pj:
        raise HTTPException(404, "Perjalanan tidak ditemukan")
    existing = set()
    async for s in db.sesi.find({"perjalanan_id": pj_id}, {"_id": 0, "jenis": 1}):
        existing.add(s["jenis"])
    for key in TIER_ORDER:
        if key not in existing:
            if key == "paramartha" and not pj.get("terbuka"):
                raise HTTPException(402, "Perlu pembayaran Rp17.000 untuk melanjutkan ke Mandala Paramārtha.")
            sid = await create_tier_sesi(pj["peserta_id"], pj_id, key)
            return {"sesi_id": sid, "jenis": key}
    return {"sesi_id": None}


async def journey_sesis(pj_id: str) -> Dict[str, Dict]:
    out = {}
    async for s in db.sesi.find({"perjalanan_id": pj_id}):
        out[s["jenis"]] = s
    return out


# ---- Midtrans payment (Snap) for Mandala Paramārtha ----
def midtrans_auth() -> str:
    return "Basic " + base64.b64encode(f"{MIDTRANS_SERVER_KEY}:".encode()).decode()


async def unlock_paramartha(pj: Dict) -> Optional[str]:
    """Mark the journey paid and create the Paramārtha sesi (idempotent)."""
    await db.perjalanan.update_one({"id": pj["id"]}, {"$set": {"terbuka": True, "dibayar_pada": now_iso()}})
    existing = set()
    async for s in db.sesi.find({"perjalanan_id": pj["id"]}, {"_id": 0, "jenis": 1}):
        existing.add(s["jenis"])
    if "paramartha" in existing:
        s = await db.sesi.find_one({"perjalanan_id": pj["id"], "jenis": "paramartha"}, {"_id": 0, "id": 1})
        return s["id"] if s else None
    return await create_tier_sesi(pj["peserta_id"], pj["id"], "paramartha")


@api_router.get("/config/midtrans")
async def config_midtrans():
    return {"client_key": MIDTRANS_CLIENT_KEY, "snap_url": f"{MIDTRANS_SNAP_BASE}/snap/snap.js",
            "enabled": bool(MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY)}


@api_router.post("/perjalanan/{pj_id}/bayar/midtrans")
async def bayar_midtrans(pj_id: str, request: Request):
    peserta = await current_peserta(request)
    if not peserta:
        raise HTTPException(401, "Masuk dengan Google untuk membayar.")
    if not (MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY):
        raise HTTPException(503, "Pembayaran belum dikonfigurasi.")
    pj = await db.perjalanan.find_one({"id": pj_id})
    if not pj:
        raise HTTPException(404, "Perjalanan tidak ditemukan")
    order_id = f"trw-{pj_id[:8]}-{secrets.token_hex(4)}"
    payload = {
        "transaction_details": {"order_id": order_id, "gross_amount": BIAYA_PARAMARTHA},
        "item_details": [{"id": "mandala-paramartha", "price": BIAYA_PARAMARTHA, "quantity": 1,
                          "name": "Mandala Paramartha + pembacaan lengkap"}],
        "enabled_payments": ["qris", "gopay", "shopeepay"],
    }
    async with httpx.AsyncClient(timeout=20) as hc:
        r = await hc.post(f"{MIDTRANS_SNAP_BASE}/snap/v1/transactions",
                          headers={"Accept": "application/json", "Content-Type": "application/json",
                                   "Authorization": midtrans_auth()}, json=payload)
    if r.status_code != 201:
        logger.error("Midtrans token error %s %s", r.status_code, r.text[:200])
        raise HTTPException(502, "Gagal membuat transaksi pembayaran.")
    token = r.json()["token"]
    await db.payments.insert_one({"order_id": order_id, "perjalanan_id": pj_id, "peserta_id": peserta["id"],
                                  "amount": BIAYA_PARAMARTHA, "status": "pending", "created_at": now_iso()})
    return {"order_id": order_id, "token": token, "client_key": MIDTRANS_CLIENT_KEY}


async def midtrans_status(order_id: str) -> Dict:
    async with httpx.AsyncClient(timeout=15) as hc:
        r = await hc.get(f"{MIDTRANS_API_BASE}/v2/{order_id}/status", headers={"Authorization": midtrans_auth()})
    if r.status_code not in (200, 201):
        raise HTTPException(502, "Tidak dapat memeriksa status pembayaran.")
    return r.json()


async def reconcile(order_id: str) -> Dict:
    pay = await db.payments.find_one({"order_id": order_id})
    if not pay:
        raise HTTPException(404, "Order tidak ditemukan")
    st = await midtrans_status(order_id)
    paid = (st.get("transaction_status") in {"settlement", "capture"}
            and st.get("fraud_status", "accept") == "accept"
            and int(float(st.get("gross_amount", "0"))) == BIAYA_PARAMARTHA)
    sesi_id = None
    if paid:
        pj = await db.perjalanan.find_one({"id": pay["perjalanan_id"]})
        if pj:
            sesi_id = await unlock_paramartha(pj)
        await db.payments.update_one({"order_id": order_id}, {"$set": {"status": st.get("transaction_status"), "paid": True}})
    else:
        await db.payments.update_one({"order_id": order_id}, {"$set": {"status": st.get("transaction_status")}})
    return {"paid": paid, "status": st.get("transaction_status"), "sesi_id": sesi_id}


@api_router.get("/perjalanan/{pj_id}/bayar/status")
async def bayar_status(pj_id: str, order_id: str, request: Request):
    peserta = await current_peserta(request)
    if not peserta:
        raise HTTPException(401, "Masuk dengan Google.")
    return await reconcile(order_id)


@api_router.post("/midtrans/notification")
async def midtrans_notification(request: Request):
    n = await request.json()
    raw = (str(n.get("order_id", "")) + str(n.get("status_code", ""))
           + str(n.get("gross_amount", "")) + MIDTRANS_SERVER_KEY)
    expected = hashlib.sha512(raw.encode()).hexdigest()
    if not hmac.compare_digest(expected, str(n.get("signature_key", ""))):
        raise HTTPException(403, "Signature tidak sah.")
    return await reconcile(n["order_id"])


def build_peta(js: Dict[str, Dict]) -> List[Dict[str, Any]]:
    """Result map: one clarity percentage per tier across the journey (None if untaken)."""
    peta: List[Dict[str, Any]] = []
    for key in TIER_ORDER:
        ts = js.get(key)
        pct = None
        if ts and ts.get("status") == "selesai":
            pct = ts.get("skor")
            if pct is None:
                pct = score_sesi(ts)[0]
        peta.append({"key": key, "nama": TIER_BY_KEY[key]["nama"], "persen": pct})
    return peta


def build_disk(s: Dict) -> List[Optional[int]]:
    """Ordered list of the chosen option score per question (None if unanswered)."""
    jawaban = s.get("jawaban", {})
    return [next((p["skor"] for p in s["soal_detail"][str(no)]["pilihan"]
                  if p["token"] == jawaban.get(str(no))), None) for no in s["soal_ids"]]


def build_bacaan(js: Dict[str, Dict], pj: Optional[Dict]) -> Dict[str, Any]:
    """Written reading (included with Rp17.000): distribution, prominent state, ladders, exercise."""
    allchosen: List[Dict] = []
    alldist = {25: 0, 50: 0, 75: 0, 100: 0}
    tier_scores: Dict[str, int] = {}
    for key in TIER_ORDER:  # deterministic order, independent of cursor order
        ts = js.get(key)
        if not ts or ts.get("status") != "selesai":
            continue
        sk, di, ch, _ = score_sesi(ts)
        tier_scores[key] = sk
        for kk in alldist:
            alldist[kk] += di[kk]
        allchosen += ch
    menonjol_skor = max(alldist.items(), key=lambda kv: (kv[1], kv[0]))[0] if any(alldist.values()) else None
    c75 = [c for c in allchosen if c["chosen_skor"] == 75]
    pick = c75 if len(c75) >= 3 else c75 + [c for c in allchosen if c["chosen_skor"] == 50]
    tangga = [{"skenario": c["skenario"], "pilihan_dipilih": c["chosen_teks"], "pilihan_seratus": c["best_teks"],
               "beda": "Bedanya terletak pada meneruskan kesadaran menjadi tindakan nyata, bukan berhenti pada pengamatan."}
              for c in pick[:3]]
    latihan = None
    if tier_scores:
        weakest = min(tier_scores.keys(), key=lambda k: tier_scores[k])
        latihan = {"tier": TIER_BY_KEY[weakest]["nama"], "nama": EXERCISE_BY_TIER[weakest]}
    return {
        "sebaran": {str(k): alldist[k] for k in (25, 50, 75, 100)},
        "menonjol": {"skor": menonjol_skor, "level": LEVEL_NAMA.get(menonjol_skor, ""), "bacaan": MENONJOL_BACAAN.get(menonjol_skor, "")},
        "tangga": tangga,
        "latihan": latihan,
        "kode_dipakai": pj.get("kode_dipakai") if pj else None,
    }


@api_router.get("/sesi/{sesi_id}/hasil")
async def hasil(sesi_id: str):
    s = await db.sesi.find_one({"id": sesi_id})
    if not s:
        raise HTTPException(404, "Sesi tidak ditemukan")
    pj = await db.perjalanan.find_one({"id": s.get("perjalanan_id")})
    peserta = await db.peserta.find_one({"id": s["peserta_id"]}, {"_id": 0, "email": 0, "google_sub": 0})
    skor, _, _, n = score_sesi(s)
    nama, desc = kategori_for(skor)
    js = await journey_sesis(s["perjalanan_id"]) if s.get("perjalanan_id") else {s["jenis"]: s}
    terbuka = bool(pj and pj.get("terbuka"))
    out: Dict[str, Any] = {
        "sesi_id": sesi_id, "jenis": s["jenis"], "tier_nama": TIER_BY_KEY[s["jenis"]]["nama"],
        "peserta": peserta, "skor": skor, "kategori": nama, "kategori_desc": desc,
        "kategori_paragraf": KATEGORI_PARAGRAF.get(nama, ""),
        "terbuka": terbuka, "selesai_at": s.get("selesai_at"), "created_at": s.get("created_at"),
        "jumlah_soal": n, "tampil_di_papan": s.get("tampil_di_papan", False),
        "perjalanan_id": s.get("perjalanan_id"),
        "perjalanan_selesai": bool(pj and pj.get("selesai_at")),
        "peta": build_peta(js),
        "disk": build_disk(s),
    }
    if terbuka:
        out["bacaan"] = build_bacaan(js, pj)
    # Rank of this finished sesi within its Mandala board
    if s.get("status") == "selesai":
        tier_q = {"jenis": s["jenis"], "status": "selesai"}
        if s["jenis"] == "paramartha":
            tier_q["tampil_di_papan"] = True
        total = await db.sesi.count_documents(tier_q)
        ms = s.get("skor") or 0
        mt = s.get("selesai_at") or ""
        better = await db.sesi.count_documents({**tier_q, "$or": [
            {"skor": {"$gt": ms}}, {"skor": ms, "selesai_at": {"$lt": mt}},
        ]})
        rank = better + 1
        out["peringkat"] = {"rank": rank, "total": total, "in_top10": rank <= 10}
    return out


@api_router.patch("/sesi/{sesi_id}/papan")
async def set_papan(sesi_id: str, body: TampilBody, request: Request):
    peserta = await current_peserta(request)
    if not peserta:
        raise HTTPException(401, "Masuk dengan Google untuk tampil di papan.")
    await db.sesi.update_one({"id": sesi_id}, {"$set": {"tampil_di_papan": bool(body.tampil_di_papan)}})
    return {"ok": True}


# ---- Board ----
@api_router.get("/papan")
async def papan(jenis: str = Query(...), peserta_id: Optional[str] = None):
    if jenis not in ("bhurloka", "akasa", "paramartha"):
        raise HTTPException(400, "Jenis tidak sah")
    q = {"jenis": jenis, "status": "selesai"}
    if jenis == "paramartha":
        q["tampil_di_papan"] = True
    proj = {"_id": 0, "id": 1, "peserta_id": 1, "skor": 1, "selesai_at": 1}
    total = await db.sesi.count_documents(q)
    order = [("skor", -1), ("selesai_at", 1)]
    top_docs = await db.sesi.find(q, proj).sort(order).limit(100).to_list(100)
    pids = list({s["peserta_id"] for s in top_docs})
    pmap = {}
    async for p in db.peserta.find({"id": {"$in": pids}}, {"_id": 0, "id": 1, "nama_lengkap": 1, "nama_tampilan": 1}):
        pmap[p["id"]] = p
    top = []
    for i, s in enumerate(top_docs):
        p = pmap.get(s["peserta_id"])
        nama = (p.get("nama_lengkap") or p.get("nama_tampilan")) if p else "-"
        top.append({"rank": i + 1, "nama_tampilan": nama, "skor": s.get("skor"), "tanggal": s.get("selesai_at")})
    my_rank = None
    if peserta_id:
        mine = await db.sesi.find_one({**q, "peserta_id": peserta_id}, proj, sort=order)
        if mine:
            ms = mine.get("skor") or 0
            mt = mine.get("selesai_at") or ""
            better = await db.sesi.count_documents({**q, "$or": [
                {"skor": {"$gt": ms}}, {"skor": ms, "selesai_at": {"$lt": mt}},
            ]})
            my_rank = {"rank": better + 1, "total": total}
    return {"top": top, "total": total, "my_rank": my_rank}


# ---- Minat ----
@api_router.post("/minat")
async def create_minat(body: MinatCreate):
    await db.minat.insert_one({"id": str(uuid.uuid4()), "nama": body.nama.strip(), "kontak": body.kontak.strip(),
                               "jalur": body.jalur, "jumlah_orang": body.jumlah_orang if body.jalur == "Kohor" else None,
                               "catatan": body.catatan, "kode_pembacaan": body.kode_pembacaan, "created_at": now_iso()})
    return {"ok": True}


# ---- Certificate ----
@api_router.post("/sertifikat/{sesi_id}")
async def create_sertifikat(sesi_id: str, body: SertifikatCreate, request: Request):
    peserta = await current_peserta(request)
    if not peserta:
        raise HTTPException(401, "Masuk dengan Google untuk memesan sertifikat.")
    s = await db.sesi.find_one({"id": sesi_id})
    if not s:
        raise HTTPException(404, "Sesi tidak ditemukan")
    pj = await db.perjalanan.find_one({"id": s.get("perjalanan_id")})
    if not pj or not pj.get("selesai_at"):
        raise HTTPException(400, "Sertifikat hanya untuk perjalanan yang telah menyelesaikan ketiga tingkat.")
    js = await journey_sesis(pj["id"])
    tscore = {}
    for key in TIER_ORDER:
        ts = js.get(key)
        tscore[key] = ts.get("skor") if ts else None
    yy = datetime.fromisoformat(pj["selesai_at"]).strftime("%y")
    # unique serial
    nomor = gen_serial(yy)
    while await db.sertifikat.find_one({"nomor_seri": nomor}):
        nomor = gen_serial(yy)
    sert_id = str(uuid.uuid4())
    await db.sertifikat.insert_one({
        "id": sert_id, "perjalanan_id": pj["id"], "nomor_seri": nomor,
        "nama_lengkap": body.nama_cetak.strip(), "tanggal_selesai": pj["selesai_at"][:10],
        "skor_bhurloka": tscore["bhurloka"], "skor_akasa": tscore["akasa"], "skor_paramartha": tscore["paramartha"],
        "bentuk": body.bentuk or "cetak", "created_at": now_iso(),
    })
    order_id = str(uuid.uuid4())
    await db.pesanan_sertifikat.insert_one({
        "id": order_id, "sesi_id": sesi_id, "perjalanan_id": pj["id"], "nomor_seri": nomor,
        "nama_cetak": body.nama_cetak.strip(), "telepon": body.telepon.strip(), "alamat": body.alamat.strip(),
        "catatan": body.catatan, "status": "baru", "created_at": now_iso(),
    })
    return {"ok": True, "order_id": order_id, "nomor_seri": nomor,
            "total": "Rp137.000 di luar ongkos kirim yang dikabarkan kemudian"}


# ---- Public serial validation ----
_rate: Dict[str, List[float]] = defaultdict(list)


@api_router.post("/validasi")
async def validasi(body: ValidasiBody, request: Request):
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "?")
    now = datetime.now(timezone.utc).timestamp()
    _rate[ip] = [t for t in _rate[ip] if now - t < 60]
    # evict stale IP keys to keep the map bounded
    for k in [k for k, v in list(_rate.items()) if not v and k != ip]:
        _rate.pop(k, None)
    if len(_rate[ip]) >= 10:
        raise HTTPException(429, "Terlalu banyak permintaan.")
    _rate[ip].append(now)

    nomor = body.nomor_seri.strip().upper()
    # reject before any DB lookup if check character does not match
    if not valid_serial(nomor):
        raise HTTPException(404, "Nomor seri tidak ditemukan.")
    sert = await db.sertifikat.find_one({"nomor_seri": nomor})
    if not sert:
        raise HTTPException(404, "Nomor seri tidak ditemukan.")
    return {
        "nama_lengkap": sert["nama_lengkap"],
        "tanggal_selesai": sert["tanggal_selesai"],
        "peta": [
            {"nama": "Bhurloka", "persen": sert.get("skor_bhurloka")},
            {"nama": "Ākāśa", "persen": sert.get("skor_akasa")},
            {"nama": "Paramārtha", "persen": sert.get("skor_paramartha")},
        ],
    }


# ---- Admin ----
@api_router.get("/admin/kode")
async def admin_kode(kunci: str = ""):
    if kunci != ADMIN_KEY:
        raise HTTPException(403, "Kunci tidak sesuai.")
    codes = await db.kode_akses.find({}, {"_id": 0}).limit(5000).to_list(5000)
    codes.sort(key=lambda c: (c["jenis"], c["kode"]))
    return {"kode": codes}


@api_router.get("/admin/pesanan")
async def admin_pesanan(kunci: str = ""):
    if kunci != ADMIN_KEY:
        raise HTTPException(403, "Kunci tidak sesuai.")
    orders = await db.pesanan_sertifikat.find({}, {"_id": 0}).limit(2000).to_list(2000)
    sesi_ids = [o.get("sesi_id") for o in orders if o.get("sesi_id")]
    sesi_map = {}
    async for s in db.sesi.find({"id": {"$in": sesi_ids}}, {"_id": 0, "id": 1, "skor": 1}).limit(2000):
        sesi_map[s["id"]] = s
    out = []
    for o in orders:
        s = sesi_map.get(o.get("sesi_id"))
        kat = kategori_for(s["skor"])[0] if (s and s.get("skor") is not None) else None
        out.append({"id": o["id"], "tanggal": o["created_at"], "nama_cetak": o["nama_cetak"],
                    "kategori": kat, "skor": s.get("skor") if s else None,
                    "telepon": o["telepon"], "alamat": o["alamat"], "status": o["status"],
                    "nomor_seri": o.get("nomor_seri")})
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


@api_router.get("/")
async def root():
    return {"message": "Triwikramā API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth, startLogin, startAnonymousLogin, logoutAndClear } from "../auth";
import { soalService } from "../services/soalService";
import { sesiService } from "../services/sesiService";
import { penggunaService } from "../services/penggunaService";
import { auth } from "../firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { CONFIG } from "../config";
import { TINGKAT, KOLOM } from "../domain/soal";

function shuffle(array) {
  const result = [...array];
  let currentIndex = result.length, randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [result[currentIndex], result[randomIndex]] = [result[randomIndex], result[currentIndex]];
  }
  return result;
}

export default function Home() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [lanjut, setLanjut] = useState(null);
  const [guestName, setGuestName] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      (async () => {
        try {
          setBusy(true);
          await signInAnonymously(auth);
        } catch (e) {
          console.error("[AUTH] Gagal signInAnonymously:", e.code, e);
          if (e.code === 'auth/operation-not-allowed') {
            setErr("Masuk anonim belum diaktifkan di Firebase, hubungi pengelola.");
          } else {
            setErr(`Gagal menyiapkan sesi tamu (${e.code || e.message}). Silakan periksa koneksi internet Anda dan coba lagi.`);
          }
        } finally {
          setBusy(false);
        }
      })();
    }
  }, [user, loading]);

  const mulai = async () => {
    setBusy(true); setErr("");
    try {
      let currentUser = user;
      
      if (!currentUser) {
         setErr("Sesi gagal disiapkan. Silakan muat ulang halaman atau periksa koneksi Anda.");
         setBusy(false);
         return;
      }

      if (!currentUser.nama_tampilan) {
        if (!guestName.trim()) {
          setErr("Silakan masukkan nama Anda untuk memulai.");
          setBusy(false);
          return;
        }
        
        try {
           await penggunaService.simpanPenggunaAnonim(currentUser, guestName.trim());
           currentUser = { ...currentUser, nama_tampilan: guestName.trim() };
        } catch (authErr) {
           console.error("[AUTH] Gagal menyimpan profil anonim:", authErr.code, authErr);
           currentUser.nama_tampilan = guestName.trim();
        }
      }
      
      const userId = currentUser.uid;
      const pj_id = crypto.randomUUID();
      const sesi_id = crypto.randomUUID();
      
      const poolResult = await soalService.ambilPoolSoal(TINGKAT.BHURLOKA);
      if (!poolResult.success) {
        setErr("Gagal memulai: " + poolResult.message);
        setBusy(false);
        return;
      }

      const { inti: intiPool, pemeriksa: pemeriksaPool } = poolResult.data;

      const targetCount = CONFIG.QUOTAS[TINGKAT.BHURLOKA];
      const hasPemeriksa = pemeriksaPool.length > 0;
      const requiredInti = hasPemeriksa ? targetCount - 1 : targetCount;

      if (intiPool.length < requiredInti) {
        const totalTersedia = intiPool.length + (hasPemeriksa ? 1 : 0);
        setErr(`Soal untuk tahap ini belum lengkap (tersedia ${totalTersedia} dari ${targetCount}).`);
        setBusy(false);
        return;
      }
      
      const drawnPemeriksa = hasPemeriksa ? shuffle(pemeriksaPool).slice(0, 1) : [];
      const drawnInti = shuffle(intiPool).slice(0, requiredInti);
      const drawn = shuffle([...drawnInti, ...drawnPemeriksa]);
      
      const detail = {};
      drawn.forEach(it => {
        detail[it.id] = { 
          ...it, 
          [KOLOM.PILIHAN]: shuffle(it[KOLOM.PILIHAN] || it.pilihan).map(p => ({ 
            [KOLOM.TEKS]: p[KOLOM.TEKS] || p.teks,
            [KOLOM.OPSI_ID]: p[KOLOM.OPSI_ID] || p.token || crypto.randomUUID().slice(0, 8)
          })) 
        };
      });
      
      const sessionData = {
        id: sesi_id,
        perjalanan_id: pj_id,
        peserta_id: userId,
        jenis: 'bhurloka',
        tingkat: TINGKAT.BHURLOKA,
        status: 'berjalan',
        posisi: 0,
        jawaban: {},
        soal_ids: drawn.map(d => d.id),
        soal_detail: detail,
        pemeriksa_tersedia: hasPemeriksa,
        created_at: new Date().toISOString()
      };
      
      const createRes = await sesiService.buatSesi(sessionData);
      if (!createRes.success) {
        if (createRes.errorCode === 'resource-exhausted' || createRes.errorCode === 'deadline-exceeded') {
          sesiService.simpanOffline(sesi_id, sessionData);
        } else {
          throw new Error(createRes.message);
        }
      }
      
      nav(`/uji/${sesi_id}`);
    } catch (e) { 
      console.warn("Gagal memulai sesi:", e.message);
      setErr("Gagal memulai: " + e.message); 
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: '10px' }}>
        <p className="cd-label cd-eyebrow" style={{ margin: 0 }}>Triwikramā · Ngawatāra Candradimuka</p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {!loading && (
            <button className="cd-btn-ghost" onClick={startLogin} style={{ padding: '6px 12px' }}>
              {user && user.isAnonymous ? "Tautkan Akun Google" : "Masuk dengan Google"}
            </button>
          )}
          {user && (
            <Link to="/profil" className="cd-btn-ghost" style={{ padding: '6px 12px', textDecoration: 'none' }}>Profil</Link>
          )}
          {user && user.role === 'admin' && (
            <Link to="/admin/dashboard" className="cd-btn" style={{ padding: '6px 12px', textDecoration: 'none', background: 'var(--ink)', color: 'var(--ground)' }}>Dasbor Admin</Link>
          )}
          {user && (
            <button className="cd-btn-ghost" onClick={async () => {
              await logoutAndClear();
            }} style={{ padding: '6px 12px', color: 'var(--alert)' }}>Keluar</button>
          )}
        </div>
      </div>
      
      <h1 className="cd-h1" data-testid="hook-question">Seberapa Jernih Kesadaranmu?</h1>
      <p className="cd-lead" style={{ fontSize: 17 }} data-testid="hook-intro">
        Uji Profil Kesadaran ini memetakan cara kamu membaca situasi pada satu kesempatan melalui
        serangkaian skenario. Ini bukan ujian benar-salah, melainkan cermin bagi cara kesadaranmu
        bekerja saat berhadapan dengan keadaan nyata.
      </p>

      {lanjut && (
        <div className="notice" data-testid="lanjutkan-box">
          <p style={{ color: "var(--ink)", fontWeight: 500 }}>Lanjutkan ujianmu</p>
          <p>{lanjut.tier_nama} — soal ke {Math.min(lanjut.posisi + 1, lanjut.total)} dari {lanjut.total}.</p>
          <button className="cd-btn" style={{ marginTop: 8 }} data-testid="lanjutkan-btn" onClick={() => nav(`/uji/${lanjut.sesi_id}`)}>Lanjutkan</button>
        </div>
      )}

      <div className="cd-block">
        {!user || !user.nama_tampilan ? (
           <div style={{ marginBottom: 16 }}>
             <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14, color: 'var(--ink)' }}>Nama Anda</label>
             <input 
               type="text" 
               className="cd-input" 
               placeholder="Masukkan nama Anda..." 
               value={guestName} 
               onChange={e => setGuestName(e.target.value)} 
               disabled={busy || loading}
               style={{ width: '100%', padding: '10px 12px', fontSize: 16 }}
             />
           </div>
        ) : (
           <p className="cd-muted" style={{ marginBottom: 16 }}>Hai, <strong>{user.nama_tampilan}</strong>. Siap untuk memulai?</p>
        )}
        
        {err && (
          <div className="notice" data-testid="home-error" style={{ marginBottom: 16, borderLeftColor: 'var(--alert)', background: 'rgba(239, 68, 68, 0.05)' }}>
            <p style={{ color: 'var(--alert)', margin: 0 }}>{err}</p>
            {(err.includes('Gagal menghubungi') || err.includes('Pendaftaran tamu gagal') || err.includes('Anda tidak memiliki hak akses')) && (
              <button className="cd-btn-ghost" onClick={mulai} disabled={busy} style={{ marginTop: 8, padding: '4px 8px', fontSize: 13 }}>
                Coba Lagi
              </button>
            )}
          </div>
        )}
        <button className="cd-btn" style={{ marginTop: 8 }} onClick={mulai} disabled={busy || loading} data-testid="mulai-btn">
          {busy || loading ? "Menyiapkan…" : "Mulai Ujian"}
        </button>
        <p className="cd-faint" style={{ marginTop: 12, fontSize: 13 }}>
          Tahap 1: {TINGKAT.BHURLOKA} — Estimasi waktu {CONFIG.WAKTU_MENIT[TINGKAT.BHURLOKA]} menit
        </p>
      </div>

      <div className="cd-navlinks">
        <Link to="/papan" data-testid="link-papan">Peta Kejernihan</Link>
        <Link to="/pelatihan" data-testid="link-pelatihan">Pelatihan</Link>
        <Link to="/harga" data-testid="link-harga">Harga</Link>
      </div>
    </Layout>
  );
}

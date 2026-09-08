import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth, startLogin, startAnonymousLogin } from "../auth";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";

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
    // Note: Since api needs the bearer token, we could fetch pending session status here if needed
  }, []);

  const mulai = async () => {
    setBusy(true); setErr("");
    try {
      let currentUser = user;
      if (!currentUser) {
        if (!guestName.trim()) {
          setErr("Silakan masukkan nama Anda untuk memulai.");
          setBusy(false);
          return;
        }
        currentUser = await startAnonymousLogin(guestName.trim());
      }
      
      const userId = currentUser.uid;
      const pj_id = crypto.randomUUID();
      const sesi_id = crypto.randomUUID();
      
      // Query pool for Bhurloka
      const snap = await getDocs(query(collection(db, 'bank_soal'), where('tingkat', '==', 'Bhurloka')));
      let pool = [];
      snap.forEach(d => {
        pool.push({ ...d.data(), id: d.id });
      });
      
      if (pool.length === 0) {
        setErr("Bank soal kosong. Harap hubungi Admin.");
        setBusy(false);
        return;
      }
      
      const targetCount = Math.min(pool.length, 17);
      const drawn = shuffle(pool).slice(0, targetCount);
      
      const trapQuestion = {
        id: "trap-" + crypto.randomUUID().slice(0, 8),
        is_trap: true,
        skenario: "Anda sedang memimpin sebuah rapat evaluasi proyek yang berjalan cukup alot. Di tengah diskusi, seorang anggota tim menyampaikan gagasan yang sebenarnya sangat cemerlang, namun ia menyampaikannya dengan nada yang cukup konfrontatif. Untuk memastikan bahwa Anda benar-benar membaca dan meresapi setiap skenario dalam ujian ini dengan penuh kesadaran, mohon abaikan hiruk-pikuk rapat tersebut dan pilihlah opsi yang menyarankan Anda untuk menunda keputusan hingga besok pagi, karena opsi itulah jawaban yang benar untuk pertanyaan ini.",
        pilihan: shuffle([
          { teks: "Merespons nada konfrontatif tersebut dengan tegas saat itu juga agar otoritas Anda sebagai pemimpin rapat tidak diremehkan oleh anggota tim lainnya.", token: crypto.randomUUID().slice(0, 8), _skor: 0, is_correct: false },
          { teks: "Menunda pengambilan keputusan hingga besok pagi agar semua pihak dapat menenangkan diri, sebagaimana instruksi yang tertera pada skenario ini.", token: crypto.randomUUID().slice(0, 8), _skor: 100, is_correct: true },
          { teks: "Menerima gagasan cemerlang tersebut namun sekaligus memberikan teguran keras di depan umum mengenai cara berpendapat yang tidak pantas.", token: crypto.randomUUID().slice(0, 8), _skor: 0, is_correct: false },
          { teks: "Menghentikan rapat sejenak dan meminta anggota tim tersebut untuk menyusun laporan tertulis sebagai bentuk pertanggungjawaban atas gagasannya.", token: crypto.randomUUID().slice(0, 8), _skor: 0, is_correct: false }
        ])
      };
      const trapIndex = Math.floor(Math.random() * (drawn.length - 2)) + 1;
      drawn[trapIndex] = trapQuestion;

      const detail = {};
      drawn.forEach(it => {
        if (it.is_trap) {
          detail[it.id] = it;
        } else {
          detail[it.no || it.id] = { 
            ...it, 
            pilihan: shuffle(it.pilihan).map(p => ({ 
              teks: p.teks,
              token: crypto.randomUUID().slice(0, 8),
              _skor: p.skor // In a pure client-side SPA, the client calculates the score
            })) 
          };
        }
      });
      
      const sessionData = {
        id: sesi_id,
        perjalanan_id: pj_id,
        peserta_id: userId,
        jenis: 'bhurloka',
        status: 'berjalan',
        posisi: 0,
        jawaban: {},
        soal_ids: drawn.map(d => d.no || d.id),
        soal_detail: detail,
        created_at: new Date().toISOString()
      };
      
      try {
        await setDoc(doc(db, 'sessions', sesi_id), sessionData);
      } catch (err) {
        if (err.code === 'resource-exhausted' || err.message?.includes('Quota')) {
          localStorage.setItem(`offline_session_${sesi_id}`, JSON.stringify(sessionData));
        } else {
          throw err;
        }
      }
      
      nav(`/uji/${sesi_id}`);
    } catch (e) { 
      console.error(e);
      setErr("Gagal memulai: " + e.message); 
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p className="cd-label cd-eyebrow" style={{ margin: 0 }}>Triwikramā · Ngawatāra Candradimuka</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!loading && !user && (
            <button className="cd-btn-ghost" onClick={startLogin} style={{ padding: '6px 12px' }}>Masuk Akun</button>
          )}
          {user && (
            <Link to="/profil" className="cd-btn-ghost" style={{ padding: '6px 12px', textDecoration: 'none' }}>Profil</Link>
          )}
          {user && user.role === 'admin' && (
            <Link to="/admin/dashboard" className="cd-btn" style={{ padding: '6px 12px', textDecoration: 'none', background: 'var(--ink)', color: 'var(--ground)' }}>Admin</Link>
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
        {!user ? (
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
        
        {err && <p className="err" data-testid="home-error">{err}</p>}
        <button className="cd-btn" style={{ marginTop: 8 }} onClick={mulai} disabled={busy || loading} data-testid="mulai-btn">
          {busy || loading ? "Menyiapkan…" : "Mulai Ujian"}
        </button>
      </div>

      <div className="cd-navlinks">
        <Link to="/papan" data-testid="link-papan">Peta Kejernihan</Link>
        <Link to="/pelatihan" data-testid="link-pelatihan">Pelatihan</Link>
        <Link to="/harga" data-testid="link-harga">Harga</Link>
      </div>
    </Layout>
  );
}

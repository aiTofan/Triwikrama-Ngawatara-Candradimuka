import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ProfileDisk } from "../components/ProfileDisk";
import { ResultMap } from "../components/ResultMap";
import { useAuth } from "../auth";
import { db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs, setDoc } from "firebase/firestore";

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

export default function Hasil() {
  const { sesiId } = useParams();
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav("/");
      return;
    }

    (async () => {
      try {
        let sSnap;
        let s;
        try {
          sSnap = await getDoc(doc(db, 'sessions', sesiId));
        } catch (e) {
          console.warn("getDoc failed, checking local storage", e);
        }
        
        if (!sSnap || !sSnap.exists()) {
          const offlineData = localStorage.getItem(`offline_session_${sesiId}`);
          if (offlineData) {
            s = JSON.parse(offlineData);
          } else {
            throw new Error("Sesi tidak ditemukan");
          }
        } else {
          s = sSnap.data();
        }
        
        if (s.peserta_id !== user.uid) throw new Error("Forbidden");
        
        const getKategori = (skor) => {
          if (skor <= 59) return { nama: "Kesadaran Cicing", desc: "diam dan bereaksi dari rasa, emosi atau kebiasaan" };
          if (skor <= 84) return { nama: "Kesadaran Nyaring", desc: "sudah bangun dan melihat jernih" };
          return { nama: "Kesadaran Eling", desc: "sadar, berdaulat, dan menindaklanjuti apa yang dilihatnya" };
        };
        const kat = getKategori(s.skor);
        
        const TIER_BY_KEY = { bhurloka: "Bhurloka", akasa: "Ākāśa", paramartha: "Paramārtha" };
        const tierOrder = ['bhurloka', 'akasa', 'paramartha'];
        
        const pjSnap = await getDocs(
          query(collection(db, 'sessions'), 
            where('perjalanan_id', '==', s.perjalanan_id),
            where('status', '==', 'selesai')
          )
        );
        
        const sessions = [];
        pjSnap.forEach(d => sessions.push(d.data()));
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('offline_session_')) {
            try {
              const parsed = JSON.parse(localStorage.getItem(key));
              if (parsed.perjalanan_id === s.perjalanan_id && parsed.status === 'selesai') {
                if (!sessions.find(x => x.id === parsed.id)) {
                  sessions.push(parsed);
                }
              }
            } catch (e) {}
          }
        }
        
        const peta = tierOrder.map(key => {
          const ses = sessions.find(x => x.jenis === key);
          return {
            key,
            nama: TIER_BY_KEY[key],
            persen: ses ? ses.skor : null
          };
        });
        
        const disk = s.soal_ids.filter(no => !s.soal_detail[no]?.is_trap).map(no => {
          const tok = s.jawaban[no];
          if (tok) {
            const p = s.soal_detail[no].pilihan.find(x => x.token === tok);
            return p ? p._skor : 0;
          }
          return 0;
        });

        setData({
          sesi_id: s.id, 
          jenis: s.jenis, 
          tier_nama: TIER_BY_KEY[s.jenis],
          skor: s.skor, 
          kategori: kat.nama, 
          kategori_desc: kat.desc,
          kategori_paragraf: `${kat.nama} — ${kat.desc}`,
          terbuka: true, 
          jumlah_soal: s.soal_ids.filter(id => !s.soal_detail[id]?.is_trap).length, 
          tampil_di_papan: false, // Legacy field
          perjalanan_id: s.perjalanan_id, 
          peta: peta, 
          disk: disk
        });
      } catch (e) {
        console.error(e);
        setErr("Gagal memuat hasil.");
      }
    })();
  }, [sesiId, user, loading, nav]);

  const lanjut = async () => {
    setBusy(true); setErr("");
    try {
      const tierOrder = ['bhurloka', 'akasa', 'paramartha'];
      const TIER_BY_KEY = {
        bhurloka: { match: "Bhurloka", target: 17 },
        akasa: { match: "Ākāśa", target: 30 },
        paramartha: { match: "Paramārtha", target: 90 },
      };
      
      const pjSnap = await getDocs(query(collection(db, 'sessions'), where('perjalanan_id', '==', data.perjalanan_id)));
      const completed = [];
      pjSnap.forEach(d => completed.push(d.data().jenis));
      
      const nextTier = tierOrder.find(t => !completed.includes(t));
      if (!nextTier) {
        nav("/papan");
        return;
      }
      
      const tier = TIER_BY_KEY[nextTier];
      
      // We will fallback to array shuffle since we must do it on the client
      const soalSnap = await getDocs(query(collection(db, 'bank_soal'), where('tingkat', '==', tier.match)));
      let pool = [];
      soalSnap.forEach(d => pool.push({ ...d.data(), id: d.id }));
      
      // Paramartha fallback (in case not found by match, use bagian, skipped here for simplicity as we use tingkat properly)
      if (pool.length === 0) {
        setErr(`Bank soal kosong untuk tingkat ${tier.match}. Harap hubungi Admin.`);
        setBusy(false);
        return;
      }
      
      const actualTarget = Math.min(pool.length, tier.target);
      const drawn = shuffle(pool).slice(0, actualTarget);
      
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
      
      const new_sesi_id = crypto.randomUUID();
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
              _skor: p.skor 
            })) 
          };
        }
      });
      
      const sessionData = {
        id: new_sesi_id,
        perjalanan_id: data.perjalanan_id,
        peserta_id: user.uid,
        jenis: nextTier,
        status: 'berjalan',
        posisi: 0,
        jawaban: {},
        soal_ids: drawn.map(d => d.no || d.id),
        soal_detail: detail,
        created_at: new Date().toISOString()
      };
      
      try {
        await setDoc(doc(db, 'sessions', new_sesi_id), sessionData);
      } catch (err) {
        if (err.code === 'resource-exhausted' || err.message?.includes('Quota') || err.message?.includes('offline')) {
          localStorage.setItem(`offline_session_${new_sesi_id}`, JSON.stringify(sessionData));
        } else {
          throw err;
        }
      }
      nav(`/uji/${new_sesi_id}`);
    } catch (e) {
      console.error(e);
      setErr("Gagal melanjutkan perjalanan.");
    } finally {
      setBusy(false);
    }
  };

  if (err) return <Layout><p className="err">{err}</p></Layout>;
  if (!data) return <Layout><p className="cd-muted">Menyusun hasil…</p></Layout>;

  return (
    <Layout>
      <div className="cd-topbar">
        <span />
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Evaluasi Mandala {data.tier_nama}</span>
      </div>
      <h1 className="cd-h1" style={{ fontSize: 40, letterSpacing: "-0.01em" }}>Profil Kesadaranmu</h1>
      
      <div className="hasil-hero" data-testid="hasil-hero" style={{ textAlign: 'center' }}>
        <p className="cd-h1" style={{ fontSize: 96, margin: 0, lineHeight: 1 }}>{data.skor}%</p>
        <p className="cd-lead" style={{ marginTop: 8 }}>{data.kategori}</p>
        <p className="cd-muted">{data.kategori_desc}</p>
      </div>

      {data.disk && (
        <div style={{ marginTop: 32 }}>
          <p className="cd-label">Distribusi Pilihan</p>
          <div style={{ height: 300, width: '100%', position: 'relative' }}>
            <ProfileDisk scores={data.disk} />
          </div>
          <p className="cd-faint" style={{ marginTop: 12, fontSize: 13 }}>Tiap bilah mewakili satu skenario dalam ujian ini. Panjang bilah menunjukkan tingkat kejernihan dari respon yang kamu pilih.</p>
        </div>
      )}

      {data.kategori_paragraf && (
        <div className="cd-block" style={{ marginTop: 32 }}>
          <p className="cd-label">Pembacaan</p>
          <p style={{ lineHeight: 1.7 }} data-testid="analisis-teks">{data.kategori_paragraf}</p>
        </div>
      )}

      <div className="cd-block" style={{ marginTop: 24 }} data-testid="peta-kesadaran">
        <p className="cd-label" style={{ marginBottom: 12 }}>Peta Perjalanan Kesadaran</p>
        <ResultMap peta={data.peta} />
      </div>

      <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
        {data.terbuka ? (
          <button className="cd-btn" onClick={lanjut} disabled={busy} data-testid="btn-lanjut-mandala">
            {busy ? "Menyiapkan…" : "Lanjutkan Perjalanan"}
          </button>
        ) : (
          <button className="cd-btn" onClick={() => nav("/")}>Kembali ke Beranda</button>
        )}
      </div>
    </Layout>
  );
}

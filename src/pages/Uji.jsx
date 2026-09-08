import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Kropak } from "../components/Kropak";
import { Tritangtu } from "../components/Tritangtu";
import { useAuth } from "../auth";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const BLOCK = 15;

export default function Uji() {
  const { sesiId } = useParams();
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [sesi, setSesi] = useState(null);
  const [idx, setIdx] = useState(0);
  const [err, setErr] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [checkpoint, setCheckpoint] = useState(null); // {blk, totalBlocks}

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav("/");
      return;
    }

    (async () => {
      try {
        const docRef = doc(db, 'sessions', sesiId);
        let sSnap;
        let data;
        try {
          sSnap = await getDoc(docRef);
        } catch (e) {
          console.warn("getDoc failed, checking local storage", e);
        }
        
        if (!sSnap || !sSnap.exists()) {
          const offlineData = localStorage.getItem(`offline_session_${sesiId}`);
          if (offlineData) {
             data = JSON.parse(offlineData);
          } else {
            setErr("Sesi tidak ditemukan.");
            return;
          }
        } else {
          data = sSnap.data();
        }
        
        if (data.peserta_id !== user.uid) {
          setErr("Sesi bukan milikmu.");
          return;
        }

        const TIER_BY_KEY = { bhurloka: "Bhurloka", akasa: "Ākāśa", paramartha: "Paramārtha" };
        data.tier_nama = TIER_BY_KEY[data.jenis];
        
        const localJawaban = localStorage.getItem(`sesi_${sesiId}_jawaban`);
        const localPosisi = localStorage.getItem(`sesi_${sesiId}_posisi`);
        
        if (localJawaban) {
          try {
            data.jawaban = { ...data.jawaban, ...JSON.parse(localJawaban) };
          } catch (e) {
            console.error("Failed to parse local jawaban");
          }
        }
        
        setSesi(data);
        const ids = data.soal_ids, jw = data.jawaban || {};
        let start = data.posisi || 0;
        if (localPosisi) {
          start = Math.max(start, parseInt(localPosisi, 10) || 0);
        }
        const firstUnanswered = ids.findIndex((no) => !jw[String(no)]);
        if (firstUnanswered !== -1) start = Math.min(start, firstUnanswered);
        if (start >= ids.length) start = ids.length - 1;
        setIdx(Math.max(0, start));
      } catch (e) { 
        console.error(e);
        setErr("Sesi tidak ditemukan."); 
      }
    })();
  }, [sesiId, user, loading, nav]);

  if (err) return <Layout><p className="err">{err}</p><Link to="/">Kembali ke beranda</Link></Layout>;
  if (!sesi) return <Layout><p className="cd-muted">Memuat…</p></Layout>;

  const ids = sesi.soal_ids;
  const total = ids.length;
  const no = ids[idx];
  const soal = sesi.soal_detail[String(no)];
  const jawaban = sesi.jawaban || {};
  const answeredCount = ids.filter((n) => jawaban[String(n)]).length;
  const isPausable = sesi.jenis === "akasa" || sesi.jenis === "paramartha";
  const totalBlocks = Math.ceil(total / BLOCK);

  const corners = (() => {
    const frac = answeredCount / total;
    return [0, 1, 2].map((i) => Math.max(0, Math.min(1, frac * 3 - i)));
  })();

  const persistStateToDb = async (pos, currentJawaban) => { 
    try { 
      await updateDoc(doc(db, 'sessions', sesiId), { 
        posisi: pos,
        jawaban: currentJawaban || jawaban
      }); 
    } catch (e) {
      console.error(e);
      if (e.code === 'resource-exhausted' || e.message?.includes('Quota') || e.message?.includes('offline')) {
        const offlineData = localStorage.getItem(`offline_session_${sesiId}`);
        if (offlineData) {
          const parsed = JSON.parse(offlineData);
          parsed.posisi = pos;
          parsed.jawaban = currentJawaban || jawaban;
          localStorage.setItem(`offline_session_${sesiId}`, JSON.stringify(parsed));
        } else {
          localStorage.setItem(`offline_session_${sesiId}`, JSON.stringify({ ...sesi, posisi: pos, jawaban: currentJawaban || jawaban }));
        }
      }
    } 
  };

  const pick = (token) => {
    const next = { ...jawaban, [String(no)]: token };
    setSesi({ ...sesi, jawaban: next });
    localStorage.setItem(`sesi_${sesiId}_jawaban`, JSON.stringify(next));
    localStorage.setItem(`sesi_${sesiId}_posisi`, idx.toString());
  };

  const goNext = () => {
    const nextIdx = idx + 1;
    if (sesi.jenis === "paramartha" && nextIdx % BLOCK === 0 && nextIdx < total) {
      setCheckpoint({ blk: nextIdx / BLOCK, totalBlocks });
      persistStateToDb(nextIdx, jawaban);
      return;
    }
    setIdx(nextIdx);
  };

  const continueFromCheckpoint = () => {
    const nextIdx = checkpoint.blk * BLOCK;
    setCheckpoint(null);
    setIdx(nextIdx);
  };

  const pauseHome = async () => { 
    await persistStateToDb(idx, jawaban); 
    nav("/"); 
  };

  const selesai = async () => {
    setFinishing(true);
    try { 
      let skorTotal = 0, n = 0;
      let scoresArray = [];
      let trapPenalty = 0;

      for (const soalId of sesi.soal_ids) {
        const tok = sesi.jawaban[soalId];
        if (tok) {
          const sd = sesi.soal_detail[soalId];
          const p = sd.pilihan.find(x => x.token === tok);
          if (p) {
            if (sd.is_trap) {
              if (!p.is_correct) trapPenalty += 20;
            } else {
              skorTotal += p._skor;
              scoresArray.push(p._skor);
              n++;
            }
          }
        }
      }
      
      let baseSkor = n ? Math.round(skorTotal / n) : 0;
      
      let stdDev = 0;
      if (n > 1) {
        const mean = skorTotal / n;
        const variance = scoresArray.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
        stdDev = Math.sqrt(variance);
      }
      
      let penaltyInconsistency = stdDev > 25 ? 10 : 0;
      let skorAkhir = Math.max(0, baseSkor - penaltyInconsistency - trapPenalty);
      
      const getKategori = (skor) => {
        if (skor <= 59) return { nama: "Kesadaran Cicing", desc: "diam dan bereaksi dari rasa, emosi atau kebiasaan" };
        if (skor <= 84) return { nama: "Kesadaran Nyaring", desc: "sudah bangun dan melihat jernih" };
        return { nama: "Kesadaran Eling", desc: "sadar, berdaulat, dan menindaklanjuti apa yang dilihatnya" };
      };
      const kat = getKategori(skorAkhir);
      
      const payload = {
        jawaban: sesi.jawaban,
        skor: skorAkhir,
        skor_mentah: baseSkor,
        penalti_deviasi: penaltyInconsistency > 0,
        penalti_jebakan: trapPenalty > 0,
        status: 'selesai',
        kategori: kat.nama
      };
      
      try {
        await updateDoc(doc(db, 'sessions', sesiId), payload);
      } catch (err) {
        if (err.code === 'resource-exhausted' || err.message?.includes('Quota') || err.message?.includes('offline')) {
           const offlineData = localStorage.getItem(`offline_session_${sesiId}`);
           if (offlineData) {
             const parsed = JSON.parse(offlineData);
             Object.assign(parsed, payload);
             localStorage.setItem(`offline_session_${sesiId}`, JSON.stringify(parsed));
           } else {
             const newData = { ...sesi, ...payload };
             localStorage.setItem(`offline_session_${sesiId}`, JSON.stringify(newData));
           }
        } else {
           throw err;
        }
      }
      
      localStorage.removeItem(`sesi_${sesiId}_jawaban`);
      localStorage.removeItem(`sesi_${sesiId}_posisi`);
      
      nav(`/hasil/${sesiId}`); 
    }
    catch (e) { 
      console.error(e);
      setErr("Gagal menyelesaikan uji."); 
      setFinishing(false); 
    }
  };

  if (checkpoint) {
    return (
      <Layout>
        <div className="cd-block" style={{ textAlign: "center", marginTop: 60 }} data-testid="checkpoint">
          <p className="cd-label">Titik henti</p>
          <h2 className="cd-h2">Blok {checkpoint.blk} dari {checkpoint.totalBlocks} selesai</h2>
          <button className="cd-btn" style={{ marginTop: 12 }} data-testid="checkpoint-lanjut" onClick={continueFromCheckpoint}>Lanjutkan</button>
        </div>
      </Layout>
    );
  }

  const chosen = jawaban[String(no)];
  const isLast = idx === total - 1;
  const allAnswered = answeredCount === total;

  return (
    <Layout>
      <div className="uji-head">
        <Tritangtu corners={corners} answered={answeredCount} total={total} size={34} />
        <span className="uji-count" data-testid="uji-count">{sesi.tier_nama} · {idx + 1} / {total}</span>
      </div>
      <Kropak>
        {soal.judul && <div className="skenario-judul">{soal.judul}</div>}
        <p className="skenario-teks" data-testid="skenario">{soal.skenario}</p>
      </Kropak>
      <div className="opsi-list" data-testid="opsi-list">
        {soal.pilihan.map((p) => (
          <button key={p.token} className={"opsi-card" + (chosen === p.token ? " selected" : "")} data-testid={`opsi-${p.token}`} onClick={() => pick(p.token)}>
            {p.teks}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, gap: 12, flexWrap: "wrap" }}>
        {idx > 0 ? <button className="cd-btn-ghost" data-testid="sebelumnya" onClick={() => setIdx(idx - 1)}>Sebelumnya</button> : <span />}
        {!isLast
          ? <button className="cd-btn" data-testid="lanjut" disabled={!chosen} onClick={goNext}>Lanjut</button>
          : <button className="cd-btn" data-testid="selesai" disabled={!allAnswered || finishing} onClick={selesai}>{finishing ? "Menghitung…" : "Lihat hasil"}</button>}
      </div>
      {isPausable && (
        <div style={{ display: "flex", gap: 16, marginTop: 22 }}>
          <button className="quiet-link" style={{ background: "none", border: "none", cursor: "pointer" }} data-testid="simpan-lanjut" onClick={pauseHome}>Simpan &amp; lanjutkan nanti</button>
          <button className="quiet-link" style={{ background: "none", border: "none", cursor: "pointer" }} data-testid="kembali-beranda" onClick={pauseHome}>Kembali ke beranda</button>
        </div>
      )}
    </Layout>
  );
}

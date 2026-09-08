import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Kropak } from "../components/Kropak";
import { Tritangtu } from "../components/Tritangtu";
import { useAuth } from "../auth";
import { sesiService } from "../services/sesiService";

const BLOCK = 15;

import { TINGKAT } from "../domain/soal";

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
        let data;
        const res = await sesiService.ambilSesi(sesiId);
        if (res.success) {
          data = res.data;
        } else {
          console.warn("ambilSesi failed, checking local storage", res.message);
          const offlineData = sesiService.ambilOffline(sesiId);
          if (offlineData) {
             data = offlineData;
          } else {
            setErr("Sesi tidak ditemukan.");
            return;
          }
        }
        
        if (data.peserta_id !== user.uid) {
          setErr("Sesi bukan milikmu.");
          return;
        }

        const TIER_BY_KEY = { bhurloka: TINGKAT.BHURLOKA, akasa: TINGKAT.AKASA, paramartha: TINGKAT.PARAMARTHA };
        data.tier_nama = data.tingkat || TIER_BY_KEY[data.jenis];
        
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
    const updateData = { 
      posisi: pos,
      jawaban: currentJawaban || jawaban
    };
    const res = await sesiService.updateSesi(sesiId, updateData);
    if (!res.success) {
      if (res.errorCode === 'resource-exhausted' || res.errorCode === 'deadline-exceeded') {
        const offlineData = sesiService.ambilOffline(sesiId);
        if (offlineData) {
          const parsed = offlineData;
          parsed.posisi = pos;
          parsed.jawaban = currentJawaban || jawaban;
          sesiService.simpanOffline(sesiId, parsed);
        } else {
          sesiService.simpanOffline(sesiId, { ...sesi, posisi: pos, jawaban: currentJawaban || jawaban });
        }
      }
    } 
  };

  const pick = (opsi_id) => {
    if (!opsi_id || opsi_id === "undefined") {
      setErr("Terjadi kesalahan: ID pilihan tidak valid. Mohon muat ulang halaman.");
      return;
    }
    const next = { ...jawaban, [String(no)]: opsi_id };
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
      const { hitungSkorDariPublik } = await import('../penilaian');
      const hasil = hitungSkorDariPublik({ ...sesi, jawaban: sesi.jawaban });
      const payload = {
        jawaban: sesi.jawaban,
        status: 'selesai',
        skor: hasil.skor,
        skor_mentah: hasil.skor_mentah,
        disk: hasil.disk,
        penalti_jebakan: hasil.penalti_jebakan,
        penalti_deviasi: hasil.penalti_deviasi,
        selesai_pada: new Date().toISOString()
      };

      const res = await sesiService.updateSesi(sesiId, payload);
      if (!res.success) {
        if (res.errorCode === 'resource-exhausted' || res.errorCode === 'deadline-exceeded') {
           const offlineData = sesiService.ambilOffline(sesiId);
           if (offlineData) {
             const parsed = offlineData;
             Object.assign(parsed, payload);
             sesiService.simpanOffline(sesiId, parsed);
           } else {
             const newData = { ...sesi, ...payload };
             sesiService.simpanOffline(sesiId, newData);
           }
        } else {
           throw new Error(res.message);
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
        {soal.pilihan.map((p) => {
          const optId = p.opsi_id || p.id || p.token; // Fallbacks just in case but relying on opsi_id
          return (
            <button key={optId} className={"opsi-card" + (chosen === optId ? " selected" : "")} data-testid={`opsi-${optId}`} onClick={() => pick(optId)}>
              {p.teks}
            </button>
          )
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, gap: 12, flexWrap: "wrap" }}>
        {idx > 0 ? <button className="cd-btn-ghost" data-testid="sebelumnya" onClick={() => setIdx(idx - 1)}>Sebelumnya</button> : <span />}
        {!isLast
          ? <button className="cd-btn" data-testid="lanjut" disabled={!chosen} onClick={goNext}>Lanjut</button>
          : <button className="cd-btn" data-testid="selesai" disabled={!allAnswered || finishing} onClick={selesai}>{finishing ? "Menyimpan…" : "Selesai"}</button>}
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

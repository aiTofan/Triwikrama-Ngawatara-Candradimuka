import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Kropak } from "../components/Kropak";
import { Tritangtu } from "../components/Tritangtu";
import { api } from "../api";

const BLOCK = 15;

export default function Uji() {
  const { sesiId } = useParams();
  const nav = useNavigate();
  const [sesi, setSesi] = useState(null);
  const [idx, setIdx] = useState(0);
  const [err, setErr] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [checkpoint, setCheckpoint] = useState(null); // {blk, totalBlocks}

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/sesi/${sesiId}`);
        setSesi(r.data);
        const ids = r.data.soal_ids, jw = r.data.jawaban || {};
        let start = r.data.posisi || 0;
        const firstUnanswered = ids.findIndex((no) => !jw[String(no)]);
        if (firstUnanswered !== -1) start = Math.min(start, firstUnanswered);
        if (start >= ids.length) start = ids.length - 1;
        setIdx(Math.max(0, start));
      } catch { setErr("Sesi tidak ditemukan."); }
    })();
  }, [sesiId]);

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

  const persistPosisi = async (pos) => { try { await api.post(`/sesi/${sesiId}/posisi`, { posisi: pos }); } catch {} };

  const pick = async (token) => {
    const next = { ...jawaban, [String(no)]: token };
    setSesi({ ...sesi, jawaban: next });
    try { await api.post(`/sesi/${sesiId}/jawab`, { soal_no: no, token, posisi: idx }); } catch {}
  };

  const goNext = () => {
    const nextIdx = idx + 1;
    // paramartha checkpoint after each completed block of 15
    if (sesi.jenis === "paramartha" && nextIdx % BLOCK === 0 && nextIdx < total) {
      setCheckpoint({ blk: nextIdx / BLOCK, totalBlocks });
      persistPosisi(nextIdx);
      return;
    }
    setIdx(nextIdx);
    persistPosisi(nextIdx);
  };

  const continueFromCheckpoint = () => {
    const nextIdx = checkpoint.blk * BLOCK;
    setCheckpoint(null);
    setIdx(nextIdx);
  };

  const pauseHome = async () => { await persistPosisi(idx); nav("/"); };

  const selesai = async () => {
    setFinishing(true);
    try { await api.post(`/sesi/${sesiId}/selesai`); nav(`/hasil/${sesiId}`); }
    catch { setErr("Gagal menyelesaikan uji."); setFinishing(false); }
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

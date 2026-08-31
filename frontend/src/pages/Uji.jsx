import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Kropak } from "../components/Kropak";
import { Tritangtu } from "../components/Tritangtu";
import { api } from "../api";

export default function Uji() {
  const { sesiId } = useParams();
  const nav = useNavigate();
  const [sesi, setSesi] = useState(null);
  const [idx, setIdx] = useState(0);
  const [err, setErr] = useState("");
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/sesi/${sesiId}`);
        setSesi(r.data);
        const ids = r.data.soal_ids;
        const jw = r.data.jawaban || {};
        let first = ids.findIndex((no) => !jw[String(no)]);
        setIdx(first === -1 ? Math.max(0, ids.length - 1) : first);
      } catch {
        setErr("Sesi tidak ditemukan.");
      }
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

  // Tritangtu corners
  let corners;
  if (sesi.jenis === "lengkap") {
    corners = [1, 2, 3].map((bg) => {
      const inBg = ids.filter((n) => sesi.soal_detail[String(n)].bagian === bg);
      const ans = inBg.filter((n) => jawaban[String(n)]).length;
      return inBg.length ? ans / inBg.length : 0;
    });
  } else {
    corners = [answeredCount / total, null, null];
  }

  const pick = async (token) => {
    const next = { ...jawaban, [String(no)]: token };
    setSesi({ ...sesi, jawaban: next });
    try { await api.post(`/sesi/${sesiId}/jawab`, { soal_no: no, token }); } catch {}
  };

  const selesai = async () => {
    setFinishing(true);
    try {
      await api.post(`/sesi/${sesiId}/selesai`, {});
      nav(`/hasil/${sesiId}`);
    } catch {
      setErr("Gagal menyelesaikan uji.");
      setFinishing(false);
    }
  };

  const chosen = jawaban[String(no)];
  const isLast = idx === total - 1;
  const allAnswered = answeredCount === total;

  return (
    <Layout>
      <div className="uji-head">
        <Tritangtu corners={corners} answered={answeredCount} total={total} size={34} />
        <span className="uji-count" data-testid="uji-count">{idx + 1} / {total}</span>
      </div>

      <Kropak>
        {soal.judul && <div className="skenario-judul">{soal.judul}</div>}
        <p className="skenario-teks" data-testid="skenario">{soal.skenario}</p>
      </Kropak>

      <div className="opsi-list" data-testid="opsi-list">
        {soal.pilihan.map((p) => (
          <button
            key={p.token}
            className={"opsi-card" + (chosen === p.token ? " selected" : "")}
            data-testid={`opsi-${p.token}`}
            onClick={() => pick(p.token)}
          >
            {p.teks}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
        {idx > 0 ? (
          <button className="cd-btn-ghost" data-testid="sebelumnya" onClick={() => setIdx(idx - 1)}>Sebelumnya</button>
        ) : <span />}
        {!isLast ? (
          <button className="cd-btn" data-testid="lanjut" disabled={!chosen} onClick={() => setIdx(idx + 1)}>Lanjut</button>
        ) : (
          <button className="cd-btn" data-testid="selesai" disabled={!allAnswered || finishing} onClick={selesai}>
            {finishing ? "Menghitung…" : "Lihat hasil"}
          </button>
        )}
      </div>
    </Layout>
  );
}

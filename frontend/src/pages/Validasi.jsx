import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { api } from "../api";
import { fmtTanggal } from "../peserta";

export default function Validasi() {
  const [nomor, setNomor] = useState("");
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const periksa = async () => {
    if (!nomor.trim()) return;
    setBusy(true); setErr(""); setRes(null);
    try { const r = await api.post("/validasi", { nomor_seri: nomor.trim().toUpperCase() }); setRes(r.data); }
    catch (e) {
      if (e?.response?.status === 429) setErr("Terlalu banyak permintaan.");
      else setErr(e?.response?.data?.detail || "Nomor seri tidak ditemukan.");
    } finally { setBusy(false); }
  };

  return (
    <Layout>
      <div className="cd-topbar">
        <Link to="/" className="cd-brand">Candradimuka</Link>
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Validasi</span>
      </div>
      <h1 className="cd-h1" style={{ fontSize: 40 }}>Periksa Keaslian Sertifikat</h1>
      <p className="cd-muted">Masukkan nomor seri yang tertera pada sertifikat cetak.</p>

      <div className="cd-field" style={{ marginTop: 16 }}>
        <label>Nomor seri</label>
        <input className="cd-input" data-testid="validasi-input" value={nomor} onChange={(e) => setNomor(e.target.value)} placeholder="TRW-26-XXXXXXX-C" />
      </div>
      {err && <p className="err" data-testid="validasi-error">{err}</p>}
      <button className="cd-btn" onClick={periksa} disabled={busy} data-testid="validasi-btn">{busy ? "Memeriksa…" : "Periksa"}</button>

      {res && (
        <div className="cd-block" style={{ marginTop: 22 }} data-testid="validasi-result">
          <p className="cd-muted"><b>Nama:</b> {res.nama_lengkap}</p>
          <p className="cd-muted"><b>Tanggal ujian selesai:</b> {fmtTanggal(res.tanggal_selesai)}</p>
          {res.peta.map((t) => (
            <p className="cd-muted" key={t.nama}><b>{t.nama}:</b> {t.persen != null ? `${t.persen}%` : "—"}</p>
          ))}
        </div>
      )}
    </Layout>
  );
}

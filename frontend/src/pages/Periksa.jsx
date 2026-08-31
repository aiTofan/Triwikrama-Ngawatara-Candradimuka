import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { api } from "../api";
import { fmtTanggal } from "../peserta";

export default function Periksa() {
  const [kode, setKode] = useState("");
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const cek = async () => {
    if (!kode.trim()) return;
    setBusy(true); setErr(""); setRes(null);
    try {
      const r = await api.get(`/periksa/${kode.trim().toUpperCase()}`);
      setRes(r.data);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Kode verifikasi tidak ditemukan.");
    } finally { setBusy(false); }
  };

  return (
    <Layout>
      <div className="cd-topbar">
        <Link to="/" className="cd-brand">Candradimuka</Link>
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Periksa</span>
      </div>
      <h1 className="cd-h1" style={{ fontSize: 40 }}>Periksa Sertifikat</h1>
      <p className="cd-muted">Masukkan kode verifikasi yang tertera pada sertifikat cetak.</p>

      <div className="cd-field" style={{ marginTop: 16 }}>
        <label>Kode verifikasi</label>
        <input className="cd-input" data-testid="periksa-input" value={kode} onChange={(e) => setKode(e.target.value)} />
      </div>
      {err && <p className="err" data-testid="periksa-error">{err}</p>}
      <button className="cd-btn" onClick={cek} disabled={busy} data-testid="periksa-btn">{busy ? "Memeriksa…" : "Periksa"}</button>

      {res && (
        <div className="cd-block" style={{ marginTop: 22 }} data-testid="periksa-result">
          <p className="cd-muted"><b>Nama:</b> {res.nama_cetak}</p>
          <p className="cd-muted"><b>Tanggal uji:</b> {fmtTanggal(res.tanggal_uji)}</p>
          <p className="cd-muted"><b>Profil:</b> {res.kategori}</p>
          <p className="cd-muted"><b>Skor:</b> {res.skor}</p>
        </div>
      )}
    </Layout>
  );
}

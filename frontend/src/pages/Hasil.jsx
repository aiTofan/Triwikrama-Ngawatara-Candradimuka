import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ProfileDisk } from "../components/ProfileDisk";
import { ResultMap } from "../components/ResultMap";
import { api } from "../api";
import { useAuth, startLogin } from "../auth";

const STATE_COLOR = { 25: "var(--s25)", 50: "var(--s50)", 75: "var(--s75)", 100: "var(--s100)" };
const STATE_NAMA = { 25: "Cicing", 50: "Nyaring Sela", 75: "Nyaring Jati", 100: "Eling" };

export default function Hasil() {
  const { sesiId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [h, setH] = useState(null);
  const [err, setErr] = useState("");
  const [kode, setKode] = useState("");
  const [payErr, setPayErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [payPanel, setPayPanel] = useState(false);
  const [tampil, setTampil] = useState(false);
  const [shared, setShared] = useState(false);
  const payRef = useRef(null);

  const load = async () => {
    try { const r = await api.get(`/sesi/${sesiId}/hasil`); setH(r.data); setTampil(r.data.tampil_di_papan); }
    catch { setErr("Hasil tidak ditemukan."); }
  };
  useEffect(() => { load(); }, [sesiId]);

  if (err) return <Layout><p className="err">{err}</p><Link to="/">Kembali</Link></Layout>;
  if (!h) return <Layout><p className="cd-muted">Memuat…</p></Layout>;

  const b = h.bacaan;

  const startPay = () => {
    if (!user) { startLogin(); return; }
    setPayPanel(true);
    setTimeout(() => payRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const bayar = async () => {
    setBusy(true); setPayErr("");
    try {
      const r = await api.post(`/perjalanan/${h.perjalanan_id}/bayar`, { kode });
      if (r.data.sesi_id) nav(`/uji/${r.data.sesi_id}`);
      else await load();
    } catch (e) { setPayErr(e?.response?.data?.detail || "Kode tidak sah."); } finally { setBusy(false); }
  };

  const lanjutTier = async () => {
    setBusy(true);
    try { const r = await api.post(`/perjalanan/${h.perjalanan_id}/lanjut`); if (r.data.sesi_id) nav(`/uji/${r.data.sesi_id}`); }
    catch {} finally { setBusy(false); }
  };

  const togglePapan = async (v) => {
    if (!user) { startLogin(); return; }
    setTampil(v);
    try { await api.patch(`/sesi/${sesiId}/papan`, { tampil_di_papan: v }); } catch { setTampil(!v); }
  };

  const share = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/hasil/${sesiId}`); } catch {}
    setShared(true); setTimeout(() => setShared(false), 2000);
  };

  return (
    <Layout>
      <p className="cd-label">Hasil UPKT · {h.tier_nama}</p>
      <h1 className="hasil-kategori serif" data-testid="hasil-kategori">{h.kategori}</h1>
      <div className="hasil-persen" data-testid="hasil-persen">{h.skor}%</div>

      <ProfileDisk scores={h.disk} />

      <h2 className="cd-h2" style={{ marginTop: 10 }}>Peta Kesadaran</h2>
      <ResultMap peta={h.peta} />

      <p style={{ color: "var(--ink-2)", lineHeight: 1.6 }} data-testid="hasil-paragraf">{h.kategori_paragraf}</p>
      <p className="cd-faint" style={{ fontSize: 13 }} data-testid="floor-line">Skor terendah yang mungkin adalah 25, bukan 0.</p>

      {!user && (
        <div className="notice" data-testid="login-prompt">
          <p>Masuk dengan Google untuk menyimpan hasilmu.</p>
          <button className="cd-btn" style={{ marginTop: 8 }} data-testid="login-btn" onClick={startLogin}>Masuk dengan Google</button>
        </div>
      )}

      <hr className="cd-divider" />

      {/* Progression controls */}
      {h.jenis === "bhurloka" && !h.terbuka && (
        <button className="cd-btn" data-testid="lanjut-berbayar" onClick={startPay}>
          Lanjutkan ke 120 soal berikutnya — Rp17.000
        </button>
      )}
      {h.jenis === "akasa" && (
        <button className="cd-btn" data-testid="lanjut-paramartha" disabled={busy} onClick={lanjutTier}>
          {busy ? "Menyiapkan…" : "Lanjutkan ke Paramārtha"}
        </button>
      )}

      {payPanel && h.jenis === "bhurloka" && !h.terbuka && (
        <div className="cd-block" ref={payRef} data-testid="pay-panel">
          <h2 className="cd-h2">Rp17.000 — 120 soal berikutnya, termasuk pembacaan lengkap</h2>
          <p className="cd-muted">Pembayaran lewat transfer atau QRIS di luar aplikasi menghasilkan kode akses. Masukkan kode di sini.</p>
          <div className="cd-field" style={{ marginTop: 12 }}>
            <label htmlFor="kode">Kode akses</label>
            <input id="kode" className="cd-input" data-testid="kode-input" value={kode} onChange={(e) => setKode(e.target.value)} placeholder="Masukkan kode" />
          </div>
          {payErr && <p className="err" data-testid="pay-error">{payErr}</p>}
          <button className="cd-btn" onClick={bayar} disabled={busy || !kode.trim()} data-testid="bayar-btn">{busy ? "Memeriksa…" : "Buka"}</button>
          <p className="cd-faint" style={{ fontSize: 13, marginTop: 12 }}>Belum punya kode? Lihat <Link to="/harga">Harga</Link>.</p>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <button className="cd-btn-ghost" onClick={share} data-testid="share-btn">{shared ? "Tautan tersalin" : "Bagikan hasil"}</button>
      </div>

      {h.jenis === "paramartha" && h.perjalanan_selesai && (
        <>
          <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 20, fontSize: 14, color: "var(--ink-2)" }}>
            <input type="checkbox" data-testid="tampil-papan" checked={tampil} onChange={(e) => togglePapan(e.target.checked)} />
            Tampilkan hasil perjalanan ini di papan skor
          </label>
          <p style={{ marginTop: 16 }}>
            <Link to={`/sertifikat/${sesiId}`} className="quiet-link" data-testid="link-sertifikat">Pesan sertifikat cetak bertanda tangan — Rp137.000</Link>
          </p>
        </>
      )}

      {/* Written reading (included with Rp17.000) */}
      {h.terbuka && b && (
        <div data-testid="paid-section">
          <hr className="cd-divider" />
          <p className="cd-label">Pembacaan Lengkap</p>

          <h2 className="cd-h2">Sebaran jawaban</h2>
          <div className="stack" data-testid="sebaran-bar">
            {[25, 50, 75, 100].map((k) => {
              const t = b.sebaran["25"] + b.sebaran["50"] + b.sebaran["75"] + b.sebaran["100"];
              const c = b.sebaran[String(k)];
              return c ? <i key={k} style={{ background: STATE_COLOR[k], width: `${(c / t) * 100}%` }} /> : null;
            })}
          </div>
          <div className="sebaran-counts">
            {[25, 50, 75, 100].map((k) => (<span key={k}><i className="swatch" style={{ background: STATE_COLOR[k] }} />{STATE_NAMA[k]}: {b.sebaran[String(k)]}</span>))}
          </div>

          <h2 className="cd-h2" style={{ marginTop: 28 }}>Keadaan yang paling menonjol</h2>
          <div className="cd-block"><p style={{ color: "var(--ink)", fontWeight: 500 }}>{b.menonjol.level}</p><p className="cd-muted">{b.menonjol.bacaan}</p></div>

          <h2 className="cd-h2" style={{ marginTop: 28 }}>Tiga tangga yang paling dekat</h2>
          {b.tangga.length === 0 && <p className="cd-muted">Belum ada tangga menengah untuk ditampilkan.</p>}
          {b.tangga.map((t, i) => (
            <div className="cd-block" key={i}>
              <p className="skenario-teks" style={{ fontSize: 16 }}>{t.skenario}</p>
              <p className="cd-muted" style={{ marginTop: 10 }}><b>Pilihanmu:</b> {t.pilihan_dipilih}</p>
              <p className="cd-muted"><b>Setapak lebih tinggi:</b> {t.pilihan_seratus}</p>
              <p className="cd-faint" style={{ fontSize: 13, marginTop: 6 }}>{t.beda}</p>
            </div>
          ))}

          <h2 className="cd-h2" style={{ marginTop: 28 }}>Latihan yang menjawabnya</h2>
          {b.latihan && (
            <div className="cd-block">
              <p style={{ color: "var(--ink)", fontWeight: 500 }}>{b.latihan.nama}</p>
              <p className="cd-muted">Menjawab tingkat yang paling lemah pada pembacaanmu ({b.latihan.tier}).</p>
              <Link to="/pelatihan">Lihat pelatihan Candradimuka →</Link>
            </div>
          )}

          <div className="notice" style={{ marginTop: 20 }}>
            <p>Rp17.000 yang kamu bayarkan bisa dipotongkan dari bulan pertama pelatihan bila kamu mendaftar dalam 30 hari. Sebutkan kode ini saat mendaftar.</p>
            {b.kode_dipakai && <p className="mono" style={{ color: "var(--gold)" }}>{b.kode_dipakai}</p>}
          </div>
        </div>
      )}
    </Layout>
  );
}

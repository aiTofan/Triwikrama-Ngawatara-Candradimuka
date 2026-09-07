import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ProfileDisk } from "../components/ProfileDisk";
import { ResultMap } from "../components/ResultMap";
import { api } from "../api";
import { useAuth, startLogin } from "../auth";
import { getPeserta } from "../peserta";

const STATE_COLOR = { 25: "var(--s25)", 50: "var(--s50)", 75: "var(--s75)", 100: "var(--s100)" };

function loadSnap(url, clientKey) {
  return new Promise((resolve, reject) => {
    if (window.snap) return resolve();
    const s = document.createElement("script");
    s.src = url;
    s.setAttribute("data-client-key", clientKey);
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

export default function Hasil() {
  const { sesiId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [h, setH] = useState(null);
  const [err, setErr] = useState("");
  const [payErr, setPayErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [tampil, setTampil] = useState(false);
  const [shared, setShared] = useState(false);

  const load = async () => {
    try { const r = await api.get(`/sesi/${sesiId}/hasil`); setH(r.data); setTampil(r.data.tampil_di_papan); }
    catch { setErr("Hasil tidak ditemukan."); }
  };
  useEffect(() => { load(); }, [sesiId]);

  if (err) return <Layout><p className="err">{err}</p><Link to="/">Kembali</Link></Layout>;
  if (!h) return <Layout><p className="cd-muted">Memuat…</p></Layout>;

  const b = h.bacaan;

  const namaPeserta = h.peserta?.nama_lengkap || h.peserta?.nama_tampilan || "Seorang peserta";
  const isOwner = !!(h.peserta?.id && getPeserta()?.id === h.peserta.id);

  // Shared link opened by someone other than the owner → teaser page.
  if (!isOwner) {
    return (
      <Layout>
        <div data-testid="teaser-view">
          <p className="cd-label">Peta Kejernihan Kesadaran · Mandala {h.tier_nama}</p>
          <h1 className="serif" style={{ fontSize: 40, lineHeight: 1.1, margin: "6px 0 2px" }} data-testid="teaser-nama">{namaPeserta}</h1>
          <p className="cd-muted" style={{ marginTop: 0 }}>membagikan hasil Uji Profil Kesadaran Triwikrama.</p>

          <h2 className="hasil-kategori serif" style={{ marginTop: 22 }} data-testid="teaser-kategori">{h.kategori}</h2>
          <div className="hasil-persen" data-testid="teaser-persen">{h.skor}%</div>

          <ProfileDisk scores={h.disk} />

          <h2 className="cd-h2" style={{ marginTop: 10 }}>Peta Kejernihan</h2>
          <ResultMap peta={h.peta} />

          <div className="notice" style={{ marginTop: 22 }} data-testid="teaser-cta">
            <p style={{ color: "var(--ink)", fontWeight: 500 }}>Seberapa jernih kesadaranmu?</p>
            <p className="cd-muted">Ikuti Uji Profil Kesadaran Triwikrama dan petakan sendiri kejernihan kesadaranmu — mulai dari Mandala Bhurloka, gratis.</p>
            <Link to="/" className="cd-btn" style={{ marginTop: 10, display: "inline-block" }} data-testid="teaser-mulai">Mulai uji kejernihanku</Link>
          </div>

          <p className="cd-faint" style={{ fontSize: 13, marginTop: 14 }}>Skor terendah yang mungkin adalah 25, bukan 0.</p>
        </div>
      </Layout>
    );
  }

  const payMidtrans = async () => {
    if (!user) { startLogin(); return; }
    setBusy(true); setPayErr("");
    try {
      const cfg = (await api.get("/config/midtrans")).data;
      if (!cfg.enabled) { setPayErr("Pembayaran belum aktif. Coba lagi nanti."); setBusy(false); return; }
      await loadSnap(cfg.snap_url, cfg.client_key);
      const r = await api.post(`/perjalanan/${h.perjalanan_id}/bayar/midtrans`);
      const { token, order_id } = r.data;
      window.snap.pay(token, {
        onSuccess: () => verifyPay(order_id),
        onPending: () => verifyPay(order_id),
        onError: () => { setPayErr("Pembayaran gagal."); setBusy(false); },
        onClose: () => { setBusy(false); },
      });
    } catch (e) {
      setPayErr(e?.response?.data?.detail || "Gagal memulai pembayaran.");
      setBusy(false);
    }
  };

  const verifyPay = async (orderId) => {
    try {
      const r = await api.get(`/perjalanan/${h.perjalanan_id}/bayar/status?order_id=${orderId}`);
      if (r.data.paid && r.data.sesi_id) { nav(`/uji/${r.data.sesi_id}`); return; }
      setPayErr("Pembayaran belum terkonfirmasi. Jika sudah membayar, tunggu sesaat lalu coba lagi.");
    } catch { setPayErr("Gagal memeriksa status pembayaran."); }
    setBusy(false);
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
    const url = `${window.location.origin}/hasil/${sesiId}`;
    const text = `Hasil Uji Kejernihan Kesadaran — Mandala ${h.tier_nama}: ${h.kategori} (${h.skor}%)`;
    if (navigator.share) {
      try { await navigator.share({ title: "Triwikramā · Candradimuka", text, url }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); } catch {}
    setShared(true); setTimeout(() => setShared(false), 2000);
  };

  return (
    <Layout>
      <p className="cd-label">Hasil Uji Kejernihan Kesadaran · Mandala {h.tier_nama}</p>
      <h1 className="hasil-kategori serif" data-testid="hasil-kategori">{h.kategori}</h1>
      <div className="hasil-persen" data-testid="hasil-persen">{h.skor}%</div>

      <ProfileDisk scores={h.disk} />

      <h2 className="cd-h2" style={{ marginTop: 10 }}>Peta Kejernihan</h2>
      <ResultMap peta={h.peta} />

      <p style={{ color: "var(--ink-2)", lineHeight: 1.6 }} data-testid="hasil-paragraf">{h.kategori_paragraf}</p>
      <p className="cd-faint" style={{ fontSize: 13 }} data-testid="floor-line">Skor terendah yang mungkin adalah 25, bukan 0.</p>

      {!user ? (
        <div className="notice" data-testid="login-prompt">
          <p>Masuk dengan Google untuk menyimpan hasilmu dan melihat peringkatmu di Peta Kejernihan.</p>
          <button className="cd-btn" style={{ marginTop: 8 }} data-testid="login-btn" onClick={startLogin}>Masuk dengan Google</button>
        </div>
      ) : h.peringkat ? (
        <div className="notice" data-testid="peringkat-box">
          <p style={{ color: "var(--ink)", fontWeight: 500 }}>
            Peringkatmu di Mandala {h.tier_nama}: #{h.peringkat.rank} dari {h.peringkat.total.toLocaleString("id-ID")}
          </p>
          {!h.peringkat.in_top10 && (
            <p data-testid="peringkat-note">Kamu berada di urutan {h.peringkat.rank}, di luar 10 besar. Terus berlatih untuk naik.</p>
          )}
          <Link to="/papan" data-testid="lihat-papan">Lihat Peta Kejernihan →</Link>
        </div>
      ) : null}

      <hr className="cd-divider" />

      {/* Progression controls */}
      {/* Bhurloka -> Ākāśa is free (login only) */}
      {h.jenis === "bhurloka" && (
        <div data-testid="bhurloka-exit">
          {user ? (
            <div data-testid="bhurloka-choice">
              <p style={{ color: "var(--ink)", fontWeight: 500, marginBottom: 10 }}>Hasilmu tersimpan. Mau ke mana selanjutnya?</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button className="cd-btn" data-testid="lanjut-akasa" disabled={busy} onClick={lanjutTier}>
                  {busy ? "Menyiapkan…" : "Lanjutkan ke Mandala Ākāśa"}
                </button>
                <Link to="/papan" className="cd-btn-ghost" data-testid="lihat-peta-kejernihan" style={{ display: "inline-flex", alignItems: "center" }}>
                  Lihat Peta Kejernihan
                </Link>
              </div>
            </div>
          ) : null}
          <p style={{ marginTop: 14 }}>
            <Link to="/" className="quiet-link" data-testid="kembali-candradimuka">Kembali ke Candradimuka</Link>
          </p>
          <p className="cd-faint" style={{ fontSize: 13, marginTop: 4 }} data-testid="bhurloka-reassure">
            Skor Bhurloka-mu sudah tersimpan. Kamu bisa melanjutkan kapan saja.
          </p>
        </div>
      )}
      {/* Ākāśa -> Paramārtha requires payment (QRIS / e-wallet via Midtrans) */}
      {h.jenis === "akasa" && !h.terbuka && (
        <div data-testid="pay-panel">
          <button className="cd-btn" data-testid="lanjut-berbayar" disabled={busy} onClick={payMidtrans}>
            {busy ? "Memproses…" : "Lanjutkan ke Mandala Paramārtha — Rp17.000"}
          </button>
          <p className="cd-faint" style={{ fontSize: 13, marginTop: 8 }}>Bayar dengan QRIS, GoPay, atau ShopeePay.</p>
          {payErr && <p className="err" data-testid="pay-error">{payErr}</p>}
        </div>
      )}
      {h.jenis === "akasa" && h.terbuka && (
        <button className="cd-btn" data-testid="lanjut-paramartha" disabled={busy} onClick={lanjutTier}>
          {busy ? "Menyiapkan…" : "Lanjutkan ke Mandala Paramārtha"}
        </button>
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
            <span><i className="swatch" style={{ background: STATE_COLOR[25] }} />Cicing: {b.sebaran["25"]}</span>
            <span><i className="swatch" style={{ background: STATE_COLOR[50] }} />Nyaring: {b.sebaran["50"]}</span>
            <span>
              <i className="swatch" style={{ background: STATE_COLOR[75] }} />
              Eling: {b.sebaran["75"] + b.sebaran["100"]}
            </span>
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

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ProfileDisk } from "../components/ProfileDisk";
import { api } from "../api";
import { fmtTanggal } from "../peserta";

const STATE_COLOR = { 25: "var(--s25)", 50: "var(--s50)", 75: "var(--s75)", 100: "var(--s100)" };
const STATE_NAMA = { 25: "Cicing", 50: "Nyaring Sela", 75: "Nyaring Jati", 100: "Eling" };

export default function Hasil() {
  const { sesiId } = useParams();
  const nav = useNavigate();
  const [h, setH] = useState(null);
  const [err, setErr] = useState("");
  const [kode, setKode] = useState("");
  const [bukaErr, setBukaErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [tampil, setTampil] = useState(false);
  const [shared, setShared] = useState(false);
  const [jeda, setJeda] = useState(null);
  const unlockRef = useRef(null);

  const load = async () => {
    try {
      const r = await api.get(`/sesi/${sesiId}/hasil`);
      setH(r.data);
      setTampil(r.data.tampil_di_papan);
    } catch {
      setErr("Hasil tidak ditemukan.");
    }
  };
  useEffect(() => { load(); }, [sesiId]);

  if (err) return <Layout><p className="err">{err}</p><Link to="/">Kembali</Link></Layout>;
  if (!h) return <Layout><p className="cd-muted">Memuat…</p></Layout>;

  const buka = async () => {
    setBusy(true); setBukaErr("");
    try {
      await api.post(`/sesi/${sesiId}/buka`, { kode });
      await load();
    } catch (e) {
      setBukaErr(e?.response?.data?.detail || "Kode tidak sah.");
    } finally { setBusy(false); }
  };

  const togglePapan = async (v) => {
    setTampil(v);
    try { await api.patch(`/sesi/${sesiId}/papan`, { tampil_di_papan: v }); } catch {}
  };

  const share = async () => {
    const url = `${window.location.origin}/hasil/${sesiId}`;
    try { await navigator.clipboard.writeText(url); } catch {}
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const lanjutLengkap = async () => {
    setBusy(true);
    try {
      const r = await api.post("/sesi/mulai", { peserta_id: h.peserta.id, jenis: "lengkap" });
      if (r.data.jeda) { setJeda(r.data); setBusy(false); return; }
      nav(`/uji/${r.data.sesi_id}`);
    } catch { setBusy(false); }
  };

  const b = h.berbayar;

  return (
    <Layout>
      <p className="cd-label">Hasil UPKT · {h.jenis === "lengkap" ? "Uji Lengkap" : "Tingkat Dasar"}</p>
      <h1 className="hasil-kategori serif" data-testid="hasil-kategori">{h.kategori}</h1>
      <div className="hasil-persen" data-testid="hasil-persen">{h.skor}%</div>

      <ProfileDisk scores={h.disk} />

      <p style={{ color: "var(--ink-2)", lineHeight: 1.6 }} data-testid="hasil-paragraf">{h.kategori_paragraf}</p>
      <p className="cd-faint" style={{ fontSize: 13 }} data-testid="floor-line">Skor terendah yang mungkin adalah 25, bukan 0.</p>

      <hr className="cd-divider" />

      {h.jenis === "dasar" ? (
        <div className="cd-block">
          <p className="cd-label">Profil Tingkat Dasar</p>
          <p className="cd-muted">Hasil ini hanya mencakup level pertama dari tiga level dalam UPKT.</p>
          {jeda ? (
            <div className="notice" data-testid="jeda-notice">
              <p>Kamu dapat mengikuti uji lengkap lagi pada {fmtTanggal(jeda.boleh_pada)}.</p>
              <p>{jeda.pesan}</p>
              <Link to="/pelatihan">Sementara itu, lihat pelatihan Candradimuka →</Link>
            </div>
          ) : (
            <button className="cd-btn" onClick={lanjutLengkap} disabled={busy} data-testid="lanjut-lengkap">
              {busy ? "Menyiapkan…" : "Lanjutkan ke uji lengkap"}
            </button>
          )}
        </div>
      ) : (
        <button className="cd-btn" data-testid="buka-pembacaan"
          onClick={() => unlockRef.current?.scrollIntoView({ behavior: "smooth" })}>
          Buka pembacaan lengkap
        </button>
      )}

      <div style={{ marginTop: 18, display: "flex", gap: 14, alignItems: "center" }}>
        <button className="cd-btn-ghost" onClick={share} data-testid="share-btn">
          {shared ? "Tautan tersalin" : "Bagikan hasil"}
        </button>
      </div>

      {h.jenis === "lengkap" && (
        <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 20, fontSize: 14, color: "var(--ink-2)" }}>
          <input type="checkbox" data-testid="tampil-papan" checked={tampil} onChange={(e) => togglePapan(e.target.checked)} />
          Tampilkan hasil uji lengkap ini di papan skor
        </label>
      )}

      {h.jenis === "lengkap" && (
        <p style={{ marginTop: 16 }}>
          <Link to={`/sertifikat/${sesiId}`} className="quiet-link" data-testid="link-sertifikat">
            Cetak sertifikat bertanda tangan — Rp150.000
          </Link>
        </p>
      )}

      {/* ===== Paid section ===== */}
      {h.jenis === "lengkap" && (
        <div ref={unlockRef}>
          <hr className="cd-divider" />
          {!h.terbuka ? (
            <div className="cd-block" data-testid="unlock-panel">
              <h2 className="cd-h2">Pembacaan lengkap — Rp15.000</h2>
              <p className="cd-muted">Pembacaan berisi skor per bagian, sebaran jawaban, keadaan yang
                paling menonjol, tiga tangga terdekat menuju skor tertinggi, dan latihan yang menjawab
                kelemahanmu.</p>
              <div className="cd-field" style={{ marginTop: 12 }}>
                <label htmlFor="kode">Kode akses</label>
                <input id="kode" className="cd-input" data-testid="kode-input" value={kode}
                  onChange={(e) => setKode(e.target.value)} placeholder="Masukkan kode bacaan" />
              </div>
              {bukaErr && <p className="err" data-testid="buka-error">{bukaErr}</p>}
              <button className="cd-btn" onClick={buka} disabled={busy || !kode.trim()} data-testid="buka-btn">
                {busy ? "Memeriksa…" : "Buka"}
              </button>
              <p className="cd-faint" style={{ fontSize: 13, marginTop: 12 }}>
                Belum punya kode? Lihat cara mendapatkannya di halaman <Link to="/harga">Harga</Link>.
              </p>
            </div>
          ) : b ? (
            <div data-testid="paid-section">
              <p className="cd-label">Pembacaan Lengkap</p>

              {/* 1. per-bagian */}
              <h2 className="cd-h2">Skor per bagian</h2>
              <div className="bagian-row" data-testid="per-bagian">
                {b.per_bagian.map((x) => (
                  <div className="bagian-cell" key={x.bagian}>
                    <div className="tag">Bagian {x.bagian}</div>
                    <div className="num">{x.skor}</div>
                    <div className="lvl">{x.level}</div>
                  </div>
                ))}
              </div>

              {/* 2. sebaran */}
              <h2 className="cd-h2" style={{ marginTop: 28 }}>Sebaran jawaban</h2>
              <div className="stack" data-testid="sebaran-bar">
                {[25, 50, 75, 100].map((k) => {
                  const total = b.sebaran["25"] + b.sebaran["50"] + b.sebaran["75"] + b.sebaran["100"];
                  const c = b.sebaran[String(k)];
                  return c ? <i key={k} style={{ background: STATE_COLOR[k], width: `${(c / total) * 100}%` }} /> : null;
                })}
              </div>
              <div className="sebaran-counts">
                {[25, 50, 75, 100].map((k) => (
                  <span key={k}><i className="swatch" style={{ background: STATE_COLOR[k] }} />{STATE_NAMA[k]}: {b.sebaran[String(k)]}</span>
                ))}
              </div>

              {/* 3. menonjol */}
              <h2 className="cd-h2" style={{ marginTop: 28 }}>Keadaan yang paling menonjol</h2>
              <div className="cd-block">
                <p style={{ color: "var(--ink)", fontWeight: 500 }}>{b.menonjol.level}</p>
                <p className="cd-muted">{b.menonjol.bacaan}</p>
              </div>

              {/* 4. tiga tangga */}
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

              {/* 5. latihan */}
              <h2 className="cd-h2" style={{ marginTop: 28 }}>Latihan yang menjawabnya</h2>
              {b.latihan && (
                <div className="cd-block">
                  <p style={{ color: "var(--ink)", fontWeight: 500 }}>{b.latihan.nama}</p>
                  <p className="cd-muted">Latihan ini menjawab bagian yang paling lemah pada pembacaanmu (Bagian {b.latihan.bagian}).</p>
                  <Link to="/pelatihan">Lihat pelatihan Candradimuka →</Link>
                </div>
              )}

              {/* 6. potongan */}
              <div className="notice" style={{ marginTop: 20 }}>
                <p>Rp15.000 yang kamu bayarkan bisa dipotongkan dari bulan pertama pelatihan bila kamu
                  mendaftar dalam 30 hari. Sebutkan kode ini saat mendaftar.</p>
                {b.kode_dipakai && <p className="mono" style={{ color: "var(--gold)" }}>{b.kode_dipakai}</p>}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Layout>
  );
}

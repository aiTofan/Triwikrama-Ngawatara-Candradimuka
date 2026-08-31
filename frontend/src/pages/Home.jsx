import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { api } from "../api";
import { savePeserta, getPeserta } from "../peserta";

export default function Home() {
  const nav = useNavigate();
  const existing = getPeserta();
  const [nama, setNama] = useState(existing?.nama_tampilan || "");
  const [email, setEmail] = useState(existing?.email || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [lanjut, setLanjut] = useState(null);

  useEffect(() => {
    const p = getPeserta();
    if (p?.id) api.get(`/peserta/${p.id}/lanjutan`).then((r) => { if (r.data.ada) setLanjut(r.data); }).catch(() => {});
  }, []);

  const mulai = async () => {
    if (!nama.trim()) { setErr("Isi nama tampilan terlebih dahulu."); return; }
    setBusy(true); setErr("");
    try {
      let peserta = getPeserta();
      if (!peserta) {
        const r = await api.post("/peserta", { nama_tampilan: nama.trim(), email: email.trim() || null });
        peserta = r.data; savePeserta(peserta);
      }
      const s = await api.post("/perjalanan/mulai", { peserta_id: peserta.id });
      if (s.data.jeda) { setErr(`Kamu dapat memulai perjalanan baru pada ${new Date(s.data.boleh_pada).toLocaleDateString("id-ID")}. ${s.data.pesan}`); setBusy(false); return; }
      nav(`/uji/${s.data.sesi_id}`);
    } catch { setErr("Gagal memulai. Coba lagi."); } finally { setBusy(false); }
  };

  return (
    <Layout>
      <p className="cd-label">Uji Profil Kesadaran · UPKT</p>
      <h1 className="cd-h1" data-testid="hook-question">Triwikramā · Ngawatāra Candradimuka</h1>
      <p className="cd-lead" style={{ fontSize: 17 }} data-testid="hook-intro">
        Uji Profil Kesadaran ini memetakan cara kamu membaca situasi pada satu kesempatan melalui
        serangkaian skenario. Ini bukan ujian benar-salah, melainkan cermin bagi cara kesadaranmu
        bekerja saat berhadapan dengan keadaan nyata.
      </p>

      {lanjut && (
        <div className="notice" data-testid="lanjutkan-box">
          <p style={{ color: "var(--ink)", fontWeight: 500 }}>Lanjutkan ujianmu</p>
          <p>{lanjut.tier_nama} — soal ke {Math.min(lanjut.posisi + 1, lanjut.total)} dari {lanjut.total}.</p>
          <button className="cd-btn" style={{ marginTop: 8 }} data-testid="lanjutkan-btn" onClick={() => nav(`/uji/${lanjut.sesi_id}`)}>Lanjutkan</button>
        </div>
      )}

      <div className="cd-block">
        <div className="cd-field">
          <label htmlFor="nama">Nama tampilan</label>
          <input id="nama" className="cd-input" data-testid="nama-input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama yang tampil di papan" />
        </div>
        <div className="cd-field">
          <label htmlFor="email">Email (opsional)</label>
          <input id="email" className="cd-input" data-testid="email-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Boleh dikosongkan" />
        </div>
        <p className="cd-faint" style={{ fontSize: 13, marginTop: 4 }} data-testid="papan-notice">
          Hasil Bhurloka tersimpan di peramban ini sampai kamu masuk dengan Google.
        </p>
        {err && <p className="err" data-testid="home-error">{err}</p>}
        <button className="cd-btn" style={{ marginTop: 14 }} onClick={mulai} disabled={busy} data-testid="mulai-btn">
          {busy ? "Menyiapkan…" : "Mulai"}
        </button>
      </div>

      <div className="cd-navlinks">
        <Link to="/papan" data-testid="link-papan">Papan</Link>
        <Link to="/pelatihan" data-testid="link-pelatihan">Pelatihan</Link>
        <Link to="/harga" data-testid="link-harga">Harga</Link>
      </div>
    </Layout>
  );
}

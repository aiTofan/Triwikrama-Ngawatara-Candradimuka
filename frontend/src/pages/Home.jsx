import { useState } from "react";
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

  const mulai = async () => {
    if (!nama.trim()) { setErr("Isi nama tampilan terlebih dahulu."); return; }
    setBusy(true); setErr("");
    try {
      let peserta = getPeserta();
      if (!peserta) {
        const r = await api.post("/peserta", { nama_tampilan: nama.trim(), email: email.trim() || null });
        peserta = r.data;
        savePeserta(peserta);
      }
      const s = await api.post("/sesi/mulai", { peserta_id: peserta.id, jenis: "dasar" });
      nav(`/uji/${s.data.sesi_id}`);
    } catch (e) {
      setErr("Gagal memulai uji. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <p className="cd-label">Uji Profil Kesadaran Triwikrama · UPKT</p>
      <h1 className="cd-h1" data-testid="hook-question">Seberapa Murni Kesadaranmu?</h1>
      <p className="cd-lead" style={{ fontSize: 17 }}>
        UPKT memetakan cara kamu membaca situasi pada satu kesempatan melalui serangkaian
        skenario. Ini bukan ujian benar-salah, melainkan cermin bagi cara kesadaranmu bekerja
        saat berhadapan dengan keadaan nyata. Mulai dari uji gratis tingkat dasar.
      </p>

      <div className="cd-block">
        <div className="cd-field">
          <label htmlFor="nama">Nama tampilan</label>
          <input id="nama" className="cd-input" data-testid="nama-input" value={nama}
            onChange={(e) => setNama(e.target.value)} placeholder="Nama yang tampil di papan" />
        </div>
        <div className="cd-field">
          <label htmlFor="email">Email (opsional)</label>
          <input id="email" className="cd-input" data-testid="email-input" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="Hanya untuk kabar, boleh dikosongkan" />
        </div>
        <p className="cd-faint" style={{ fontSize: 13, marginTop: 4 }} data-testid="papan-notice">
          Hasil uji gratis akan tampil di papan dengan nama tampilan yang kamu isi.
        </p>
        {err && <p className="err" data-testid="home-error">{err}</p>}
        <button className="cd-btn" style={{ marginTop: 14 }} onClick={mulai} disabled={busy} data-testid="mulai-btn">
          {busy ? "Menyiapkan…" : "Mulai uji gratis"}
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

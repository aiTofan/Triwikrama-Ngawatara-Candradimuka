import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { api } from "../api";

const LATIHAN = [
  ["Cek Diri Dasa Kreta", "Memeriksa reaksi diri terhadap sepuluh keadaan dasar sehari-hari."],
  ["Lembar Kerja Panca Niti", "Menelusuri niat di balik lima jenis keputusan yang sering diambil."],
  ["Investigasi Ruang Kosong", "Mengamati jeda antara rangsangan dan tanggapan sebelum bertindak."],
  ["Audit Empati Radikal", "Melatih masuk sepenuhnya ke cara orang lain membaca dunia."],
  ["Protokol Nol-isasi", "Membongkar asumsi bawaan agar situasi terbaca tanpa penyaring lama."],
  ["Kuda-kuda dan Transmutasi", "Mengubah gejolak menjadi tenaga bagi tindakan yang berpijak."],
];

export default function Pelatihan() {
  const [f, setF] = useState({ nama: "", kontak: "", jalur: "Mandiri", jumlah_orang: "", catatan: "", kode_pembacaan: "" });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.nama.trim() || !f.kontak.trim()) return;
    setBusy(true);
    try {
      await api.post("/minat", {
        nama: f.nama, kontak: f.kontak, jalur: f.jalur,
        jumlah_orang: f.jalur === "Kohor" && f.jumlah_orang ? parseInt(f.jumlah_orang, 10) : null,
        catatan: f.catatan || null, kode_pembacaan: f.kode_pembacaan || null,
      });
      setDone(true);
    } catch {} finally { setBusy(false); }
  };

  return (
    <Layout>
      <div className="cd-topbar">
        <Link to="/" className="cd-brand">Candradimuka</Link>
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Pelatihan</span>
      </div>
      <p className="cd-label">Pelatihan Candradimuka</p>
      <h1 className="cd-h1" style={{ fontSize: 40 }}>Menempa Kesadaran</h1>

      <p className="cd-muted">Candradimuka adalah jalur penempaan kesadaran yang menerjemahkan hasil UPKT
        menjadi latihan nyata. Ia bukan kelas teori, melainkan kerja atas diri sendiri yang dipandu.</p>
      <p className="cd-muted">Pelatihan dikerjakan melalui lembar kerja bersama seorang fasilitator yang
        membaca jawaban-jawabanmu, lalu menanggapinya secara pribadi. Setiap lembar menuntut kejujuran,
        bukan jawaban yang benar.</p>
      <p className="cd-muted">Kemajuan tidak diukur oleh sertifikat kehadiran, melainkan dengan mengikuti
        kembali UPKT setelah berlatih, sehingga perubahan cara membaca situasi terlihat pada angkanya.</p>

      <h2 className="cd-h2" style={{ marginTop: 28 }}>Enam latihan</h2>
      {LATIHAN.map(([nama, ket]) => (
        <div className="cd-block" key={nama} style={{ margin: "10px 0" }}>
          <p style={{ color: "var(--ink)", fontWeight: 500 }}>{nama}</p>
          <p className="cd-muted" style={{ fontSize: 14 }}>{ket}</p>
        </div>
      ))}

      <div className="cd-block" style={{ marginTop: 20 }}>
        <p className="cd-label">Harga</p>
        <p className="cd-muted">Mandiri Rp15.000 per bulan. Kohor per orang per bulan: 5-9 orang
          Rp12.000, 10-14 orang Rp10.000, 15-20 orang Rp9.000. <Link to="/harga">Lihat halaman harga →</Link></p>
      </div>

      <hr className="cd-divider" />
      <h2 className="cd-h2">Formulir minat</h2>
      {done ? (
        <p className="cd-muted" data-testid="minat-thanks">Terima kasih. Kami akan menghubungimu.</p>
      ) : (
        <div>
          <div className="cd-field"><label>Nama</label>
            <input className="cd-input" data-testid="minat-nama" value={f.nama} onChange={set("nama")} /></div>
          <div className="cd-field"><label>Kontak</label>
            <input className="cd-input" data-testid="minat-kontak" value={f.kontak} onChange={set("kontak")} placeholder="Email atau nomor" /></div>
          <div className="cd-field"><label>Pilihan jalur</label>
            <select className="cd-select" data-testid="minat-jalur" value={f.jalur} onChange={set("jalur")}>
              <option value="Mandiri">Mandiri</option>
              <option value="Kohor">Kohor</option>
            </select></div>
          {f.jalur === "Kohor" && (
            <div className="cd-field"><label>Jumlah orang</label>
              <input className="cd-input" type="number" data-testid="minat-jumlah" value={f.jumlah_orang} onChange={set("jumlah_orang")} /></div>
          )}
          <div className="cd-field"><label>Catatan</label>
            <textarea className="cd-textarea" data-testid="minat-catatan" value={f.catatan} onChange={set("catatan")} /></div>
          <div className="cd-field"><label>Kode pembacaan (bila ada)</label>
            <input className="cd-input" data-testid="minat-kode" value={f.kode_pembacaan} onChange={set("kode_pembacaan")} /></div>
          <button className="cd-btn" onClick={submit} disabled={busy} data-testid="minat-submit">
            {busy ? "Mengirim…" : "Kirim minat"}
          </button>
        </div>
      )}
    </Layout>
  );
}

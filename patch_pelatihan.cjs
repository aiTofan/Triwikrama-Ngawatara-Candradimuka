const fs = require('fs');

const code = `import { Layout } from "../components/Layout";

const LATIHAN = [
  ["Cek Diri Dasa Kreta", "Memeriksa reaksi diri terhadap sepuluh keadaan dasar sehari-hari."],
  ["Lembar Kerja Panca Niti", "Menelusuri niat di balik lima jenis keputusan yang sering diambil."],
  ["Investigasi Ruang Kosong", "Mengamati jeda antara rangsangan dan tanggapan sebelum bertindak."],
  ["Audit Empati Radikal", "Melatih masuk sepenuhnya ke cara orang lain membaca dunia."],
  ["Protokol Nol-isasi", "Membongkar asumsi bawaan agar situasi terbaca tanpa penyaring lama."],
  ["Kuda-kuda dan Transmutasi", "Mengubah gejolak menjadi tenaga bagi tindakan yang berpijak."],
];

export default function Pelatihan() {
  const openMail = () => {
    window.location.href = "mailto:pelatihan@candradimuka.id?subject=Inkuiri Pendaftaran Pelatihan Candradimuka";
  };

  return (
    <Layout>
      <div className="cd-topbar">
        <span />
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Pelatihan</span>
      </div>
      
      <p className="cd-label">Pelatihan Candradimuka</p>
      <h1 className="cd-h1" style={{ fontSize: 40, letterSpacing: "-0.02em" }}>Menempa Kesadaran</h1>
      <p className="cd-lead" style={{ marginBottom: 20 }}>
        Candradimuka adalah jalur penempaan kesadaran yang menerjemahkan hasil UPKT menjadi latihan nyata. Ia bukan kelas teori, melainkan kerja atas diri sendiri yang dipandu.
      </p>
      <p className="cd-muted" style={{ marginBottom: 20, lineHeight: 1.6 }}>
        Pelatihan dikerjakan melalui lembar kerja bersama seorang fasilitator yang membaca jawaban-jawabanmu, lalu menanggapinya secara pribadi. Setiap lembar menuntut kejujuran, bukan jawaban yang benar.
      </p>
      <p className="cd-muted" style={{ marginBottom: 32, lineHeight: 1.6 }}>
        Kemajuan tidak diukur oleh sertifikat kehadiran, melainkan dengan mengikuti kembali UPKT setelah berlatih, sehingga perubahan cara membaca situasi terlihat pada angkanya.
      </p>
      
      <h2 className="cd-h2" style={{ marginTop: 28, fontSize: 24, marginBottom: 16 }}>Enam latihan</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 40 }}>
        {LATIHAN.map(([nama, ket]) => (
          <div className="cd-block" key={nama} style={{ margin: 0, padding: 20, border: '1px solid var(--line-2)', borderRadius: 12, background: 'var(--surface)' }}>
            <h3 style={{ color: "var(--ink)", fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{nama}</h3>
            <p className="cd-muted" style={{ fontSize: 14, margin: 0, lineHeight: 1.5 }}>{ket}</p>
          </div>
        ))}
      </div>

      {/* Registration / Mail CTA */}
      <div style={{ padding: 40, background: "var(--surface)", border: "1px solid var(--patina)", borderRadius: 24, textAlign: "center" }}>
        <h2 className="cd-h2" style={{ fontSize: 24, marginBottom: 16 }}>Pendaftaran Pelatihan</h2>
        <p style={{ fontSize: 15, color: "var(--ink-2)", maxWidth: "600px", margin: "0 auto 24px auto", lineHeight: 1.6 }}>
          Hubungi kami secara langsung untuk menjadwalkan atau mengikuti sesi penempaan kesadaran Candradimuka. Terbuka bagi kelompok, komunitas, dan lembaga.
        </p>
        <button className="cd-btn" onClick={openMail} style={{ padding: "12px 32px", fontSize: 15 }}>
          Hubungi Kami untuk Pendaftaran
        </button>
      </div>
    </Layout>
  );
}
`;

fs.writeFileSync('src/pages/Pelatihan.jsx', code);
console.log("Patched successfully");

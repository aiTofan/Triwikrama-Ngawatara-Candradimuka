import { Layout } from "../components/Layout";
import { Building, GraduationCap, Scale, ShieldCheck, Code, Settings } from "lucide-react";

export default function Kemitraan() {
  const openMail = () => {
    window.location.href = "mailto:partnership@candradimuka.id?subject=Inkuiri Kemitraan & Integrasi";
  };

  return (
    <Layout>
      <div className="cd-topbar">
        <span />
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Inkuiri Perusahaan & Institusi</span>
      </div>
      
      <h1 className="cd-h1" style={{ fontSize: 36, letterSpacing: "-0.02em", marginBottom: 16 }}>Kemitraan Strategis</h1>
      <p className="cd-lead" style={{ marginBottom: 40, maxWidth: "600px" }}>
        Implementasikan standar pengukuran kesadaran dan integritas tertinggi untuk organisasi Anda. Kami menyediakan arsitektur yang dapat disesuaikan untuk proses seleksi yang objektif, presisi, dan terukur.
      </p>

      {/* Target Segments */}
      <div style={{ marginBottom: 48 }}>
        <h2 className="cd-h2" style={{ fontSize: 24, marginBottom: 24 }}>Penerapan Sektoral</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
          <div style={{ padding: 24, background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 16 }}>
            <Building size={28} style={{ color: "var(--ink)", marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Korporasi & Rekrutmen</h3>
            <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Saring kandidat berkualitas tinggi untuk posisi strategis. Integrasikan tes probabilitas integritas ke dalam proses rekrutmen pegawai baru atau promosi pimpinan tingkat menengah hingga direksi (C-Level).
            </p>
          </div>
          <div style={{ padding: 24, background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 16 }}>
            <GraduationCap size={28} style={{ color: "var(--ink)", marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Pendidikan & Akademik</h3>
            <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Seleksi penerima beasiswa atau saringan masuk mahasiswa/peserta didik baru. Identifikasi individu dengan karakter pembelajar dan ketahanan moral yang selaras dengan nilai-nilai luhur institusi.
            </p>
          </div>
          <div style={{ padding: 24, background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 16 }}>
            <Scale size={28} style={{ color: "var(--ink)", marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Pemerintahan & Politik</h3>
            <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Standarisasi seleksi Calon Legislatif (Caleg), seleksi CPNS, atau pimpinan BUMN/BUMD. Pastikan figur yang terpilih memiliki rekam jejak psikologis yang tahan terhadap korupsi dan mementingkan kepentingan umum.
            </p>
          </div>
        </div>
      </div>

      {/* Partnership Models */}
      <div style={{ marginBottom: 48 }}>
        <h2 className="cd-h2" style={{ fontSize: 24, marginBottom: 24 }}>Pola Kustomisasi & Integrasi</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: 24, background: "rgba(0,0,0,0.02)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <Settings size={24} style={{ color: "var(--patina)", marginTop: 4 }} />
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Kustomisasi Bank Soal (White-label)</h3>
              <p style={{ fontSize: 14, color: "var(--ink-2)" }}>
                Tim psikometri kami akan menyusun bank soal khusus yang memetakan korelasi langsung dengan Core Values (Nilai Inti) organisasi Anda (misal: AKHLAK BUMN). Branding antarmuka tes dapat menggunakan logo instansi.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: 24, background: "rgba(0,0,0,0.02)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <Code size={24} style={{ color: "var(--patina)", marginTop: 4 }} />
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Integrasi API & Sistem ATS/LMS</h3>
              <p style={{ fontSize: 14, color: "var(--ink-2)" }}>
                Hubungkan mesin skor Candradimuka langsung ke ekosistem yang sudah Anda gunakan (Applicant Tracking System / Learning Management System). Tarik data analitik kandidat dalam format JSON secara langsung tanpa harus keluar dari sistem Anda.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: 24, background: "rgba(0,0,0,0.02)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <ShieldCheck size={24} style={{ color: "var(--patina)", marginTop: 4 }} />
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Pelaksanaan Massal (Enterprise Event)</h3>
              <p style={{ fontSize: 14, color: "var(--ink-2)" }}>
                Pengadaan server khusus (Dedicated) untuk menampung ribuan peserta tes secara bersamaan tanpa kendala sistem (seperti rekrutmen masal CPNS/Korporasi besar). Membawa jaminan Service Level Agreement (SLA) 99.9%.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Concept & CTA */}
      <div style={{ padding: 40, background: "var(--surface)", border: "1px solid var(--patina)", borderRadius: 24, textAlign: "center" }}>
        <h2 className="cd-h2" style={{ fontSize: 24, marginBottom: 16 }}>Bahas Struktur Pembiayaan (Pricing)</h2>
        <p style={{ fontSize: 15, color: "var(--ink-2)", maxWidth: "500px", margin: "0 auto 24px auto", lineHeight: 1.6 }}>
          Struktur harga (*pricing*) untuk paket *Enterprise* bersifat kustom berdasarkan volume pengujian, kompleksitas integrasi sistem, dan penyesuaian khusus bank soal. Kami merekomendasikan pertemuan luring (offline) untuk membahas kebutuhan instansi Anda secara mendetail.
        </p>
        <button className="cd-btn" onClick={openMail} style={{ padding: "12px 32px", fontSize: 15 }}>
          Jadwalkan Konsultasi Offline
        </button>
      </div>
    </Layout>
  );
}

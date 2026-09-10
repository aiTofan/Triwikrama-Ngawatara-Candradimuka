import { Layout } from "../components/Layout";
import { BookOpen, Layers, Target, ShieldAlert, GitBranch } from "lucide-react";

export default function Metodologi() {
  return (
    <Layout>
      <div className="cd-topbar">
        <span />
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Metodologi & Landasan</span>
      </div>
      
      <h1 className="cd-h1" style={{ fontSize: 36, letterSpacing: "-0.02em", marginBottom: 16 }}>
        Kerangka Nalar Triwikramā
      </h1>
      <p className="cd-lead" style={{ marginBottom: 40, maxWidth: "700px", lineHeight: 1.6 }}>
        Uji Profil Kesadaran Triwikrama (UPKT) bukanlah tes kepribadian atau ujian akademis biasa. Skenario yang Anda hadapi dirancang secara spesifik berdasarkan metodologi dan prinsip-prinsip yang tertuang di dalam buku panduan <strong>Triwikramā: Ngawatara Candradimuka</strong>.
      </p>

      {/* Bagian 1: Tiga Tingkat (Mandala) */}
      <div style={{ marginBottom: 48 }}>
        <h2 className="cd-h2" style={{ fontSize: 24, marginBottom: 24 }}>Tiga Mandala Pemahaman</h2>
        <p style={{ color: "var(--ink-2)", marginBottom: 24, lineHeight: 1.6, maxWidth: "700px" }}>
          Sistem ini tidak memukul rata semua masalah. Skenario dibagi ke dalam tiga tingkat kesadaran untuk mengukur sejauh mana Anda mampu menembus selubung ilusi dalam situasi yang berbeda:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
          <div style={{ padding: 24, background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 16 }}>
            <Layers size={28} style={{ color: "var(--ink)", marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>1. Bhurloka (Literal)</h3>
            <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Menguji ketelitian pada fakta material, hukum sebab-akibat langsung, dan penyelesaian masalah di tingkat permukaan tanpa terdistraksi oleh kepanikan.
            </p>
          </div>
          <div style={{ padding: 24, background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 16 }}>
            <GitBranch size={28} style={{ color: "var(--ink)", marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>2. Ākāśa (Simbolik)</h3>
            <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Menguji kemampuan membaca relasi kuasa, motif tersembunyi, permainan wacana, dan jebakan emosional dalam hubungan antarmanusia.
            </p>
          </div>
          <div style={{ padding: 24, background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 16 }}>
            <Target size={28} style={{ color: "var(--ink)", marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>3. Paramārtha (Eksistensial)</h3>
            <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Menguji kesetiaan pada prinsip dasar, integritas, dan kedaulatan nalar ketika dihadapkan pada dilema moral yang tidak memiliki jawaban aman.
            </p>
          </div>
        </div>
      </div>

      {/* Bagian 2: Anatomi Skenario & Jebakan */}
      <div style={{ marginBottom: 48 }}>
        <h2 className="cd-h2" style={{ fontSize: 24, marginBottom: 24 }}>Anatomi Skenario & Jebakan</h2>
        <div style={{ background: "rgba(0,0,0,0.02)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 32px" }}>
          <p style={{ color: "var(--ink-2)", marginBottom: 24, lineHeight: 1.6 }}>
            Setiap soal diciptakan bukan untuk mencari "jawaban yang terlihat paling baik atau sopan", melainkan jawaban yang paling jernih dan berintegritas. Oleh karena itu, opsi-opsi jawaban sengaja dirancang menggunakan mekanisme khusus:
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            <li style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <BookOpen size={24} style={{ color: "var(--patina)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: "block", fontSize: 16, marginBottom: 4 }}>Jangkar (Kebenaran Murni)</strong>
                <span style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.5, display: "block" }}>
                  Opsi yang mewakili kejernihan nalar tertinggi sesuai prinsip <em>Panca Niti</em>, <em>Dasa Kreta</em>, dan karakter <em>Panca Waluya</em>. Jawaban ini mungkin tidak selalu terdengar nyaman, tetapi menyentuh akar persoalan yang sebenarnya dengan integritas penuh.
                </span>
              </div>
            </li>
            <li style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <ShieldAlert size={24} style={{ color: "var(--alert)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: "block", fontSize: 16, marginBottom: 4 }}>Jangkar Palsu (Distraksi Ego & Harmoni Semu)</strong>
                <span style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.5, display: "block" }}>
                  Opsi jebakan yang dirancang sangat mirip dengan kebijaksanaan populer. Seringkali membujuk Anda untuk memilih kompromi buta, menjaga perasaan (harmoni semu), atau lari dari akar masalah dengan alasan "bijak".
                </span>
              </div>
            </li>
            <li style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <Target size={24} style={{ color: "var(--ink)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: "block", fontSize: 16, marginBottom: 4 }}>Soal Pemeriksa (Auditor)</strong>
                <span style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.5, display: "block" }}>
                  Skenario khusus yang diselipkan untuk menguji konsistensi Anda. Jika Anda memilih "Jangkar Palsu" pada soal pemeriksa ini, sistem akan mendeteksi inkonsistensi nalar dan memberlakukan penalti nilai.
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Kesimpulan */}
      <div style={{ padding: 40, background: "var(--surface)", border: "1px solid var(--patina)", borderRadius: 24, textAlign: "center" }}>
        <h2 className="cd-h2" style={{ fontSize: 24, marginBottom: 16 }}>Melampaui Asesmen</h2>
        <p style={{ fontSize: 15, color: "var(--ink-2)", maxWidth: "600px", margin: "0 auto 24px auto", lineHeight: 1.6 }}>
          UPKT adalah alat diagnosis. Untuk benar-benar menguasai cara membedah realitas, menata ego, dan mendeteksi manipulasi secara mendalam, kami menyusun program pelatihan komprehensif berdasarkan buku panduan Triwikramā.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <a href="/pelatihan" className="cd-btn" style={{ padding: "12px 32px", fontSize: 15, textDecoration: "none" }}>
            Pelajari Program Pelatihan
          </a>
        </div>
      </div>
    </Layout>
  );
}

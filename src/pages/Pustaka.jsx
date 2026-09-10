import { Layout } from "../components/Layout";
import { Book, BookOpen, Library, Sparkles, Feather, ArrowRight, Download } from "lucide-react";

export default function Pustaka() {
  return (
    <Layout>
      <div className="cd-topbar">
        <span />
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Pustaka & Literatur</span>
      </div>
      
      <h1 className="cd-h1" style={{ fontSize: 36, letterSpacing: "-0.02em", marginBottom: 16 }}>
        Pustaka Triwikramā
      </h1>
      <p className="cd-lead" style={{ marginBottom: 48, maxWidth: "700px", lineHeight: 1.6 }}>
        Uji Profil Kesadaran hanyalah titik awal. Selami fondasi filosofis, pisau analisis, dan metodologi kedaulatan nalar melalui literatur yang kami kembangkan. Di sini Anda dapat menemukan buku panduan utama, naskah pendalaman, serta e-book gratis.
      </p>

      {/* Buku Utama */}
      <div style={{ marginBottom: 56 }}>
        <h2 className="cd-h2" style={{ fontSize: 24, marginBottom: 24 }}>Buku Panduan Utama</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, background: 'var(--surface)', padding: 32, borderRadius: 24, border: '1px solid var(--patina)' }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: 120, height: 170, background: 'var(--ink)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ground)' }}>
              <Book size={48} strokeWidth={1} />
            </div>
            <div style={{ flex: '1 1 300px' }}>
              <span className="mono" style={{ fontSize: 12, color: 'var(--patina)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Tersedia</span>
              <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>Triwikramā: Ngawatara Candradimuka</h3>
              <p style={{ color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 16 }}>
                Buku panduan utama yang mendasari seluruh instrumen Uji Profil Kesadaran. Membedah anatomi jebakan ego, harmoni semu, dan bagaimana mengembalikan kedaulatan nalar dalam menghadapi situasi krisis maupun keseharian.
              </p>
              <button className="cd-btn" style={{ padding: '8px 24px', fontSize: 14 }}>
                Dapatkan Buku Fisik
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trilogi Kedalaman (Segera Terbit) */}
      <div style={{ marginBottom: 56 }}>
        <h2 className="cd-h2" style={{ fontSize: 24, marginBottom: 8 }}>Trilogi Kedalaman</h2>
        <p style={{ color: 'var(--ink-2)', marginBottom: 24 }}>Naskah pendalaman filosofis dan metodologis (Dalam tahap penyusunan).</p>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          
          {/* Buku 1 */}
          <div style={{ padding: 24, background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 16, display: 'flex', flexDirection: 'column' }}>
            <Library size={28} style={{ color: "var(--ink)", marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Buku 1: Tritangtu Triwikrama</h3>
            <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 16, flex: 1 }}>
              Konsep filosofis kerangka pola pikir Tritangtu untuk dievolusikan lintas dimensi. Berangkat dari 4 aksioma:
              <br/><br/>
              <strong>1.</strong> Yang benar adalah yang asli.<br/>
              <strong>2.</strong> Yang asli adalah Maha Karya yang selalu berevolusi menjadi nilai tertinggi kosmik.<br/>
              <strong>3.</strong> Konsep kedaulatan absolut yang dibatasi oleh kesadaran egaliter untuk tidak mengganggu kedaulatan pihak lain.<br/>
              <strong>4.</strong> Prinsip Filsafat Tritangtu.
              <br/><br/>
              Mengajarkan cara mencari struktur, membandingkan pola, dan menembus stagnansi metakestabilan dualitas horizontal menuju kehendak bijak.
            </p>
            <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>Segera Hadir</span>
          </div>

          {/* Buku 2 */}
          <div style={{ padding: 24, background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 16, display: 'flex', flexDirection: 'column' }}>
            <Feather size={28} style={{ color: "var(--ink)", marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Buku 2: Nawa Śāstra Triwikrama</h3>
            <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 16, flex: 1 }}>
              Instrumen untuk membedah dan membersihkan lapisan yang membiaskan kebeningan jiwa, agar persepsi kesadaran murni diterima utuh oleh kesadaran lokal jiwa.
              <br/><br/>
              Memanfaatkan radar integritas <strong>Prajñā Jagratara</strong> yang selalu mengacu pada nilai singularitas Maha Karya. Dilengkapi 8 pisau analisis dan Tiga Langkah Agung Evolusi Triwikrama untuk menciptakan nilai kosmis standar baru.
            </p>
            <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>Segera Hadir</span>
          </div>

          {/* Buku 3 */}
          <div style={{ padding: 24, background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 16, display: 'flex', flexDirection: 'column' }}>
            <Sparkles size={28} style={{ color: "var(--ink)", marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Buku 3: Angracana Triwikrama</h3>
            <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 16, flex: 1 }}>
              Wujud manifestasi dari resonansi frekuensi ke dalam perspektif realitas. 
              <br/><br/>
              Merupakan kitab implementasi dan praksis dari hasil pola pikir yang dibentuk dari Buku 1 (Tritangtu Triwikrama) sebagai kompas arah kebenaran menuju yang asli, yang dipadukan dengan pisau analisis Nawa Śāstra Triwikrama (Buku 2) untuk menghasilkan Maha Karya yang akan berkontribusi terhadap nilai tertinggi kosmik.
            </p>
            <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>Segera Hadir</span>
          </div>

        </div>
      </div>

      {/* Pojok Akses Terbuka */}
      <div style={{ padding: 32, background: "rgba(0,0,0,0.02)", border: "1px dashed var(--line-2)", borderRadius: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          <BookOpen size={24} style={{ color: 'var(--ink)' }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Pojok Akses Terbuka (E-book Gratis)</h2>
        </div>
        <p style={{ fontSize: 15, color: "var(--ink-2)", maxWidth: "600px", marginBottom: 24, lineHeight: 1.6 }}>
          Unduh naskah-naskah pengantar, modul dasar kesadaran, dan artikel kajian gratis untuk mulai membongkar ilusi realitas sebelum melangkah ke buku utama.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
           {/* Placeholder for future E-books */}
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'var(--ground)', borderRadius: 12, border: '1px solid var(--line-2)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: 15, marginBottom: 4 }}>Pengantar Dasa Kreta</strong>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>PDF · 12 Halaman · Ringkasan Modul Dasar</span>
              </div>
              <button className="cd-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 14 }}>
                <Download size={16} /> Unduh
              </button>
           </div>
           
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'var(--ground)', borderRadius: 12, border: '1px solid var(--line-2)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: 15, marginBottom: 4 }}>Peta Kognitif Harmoni Semu</strong>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>PDF · 8 Halaman · Studi Kasus</span>
              </div>
              <button className="cd-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 14 }}>
                <Download size={16} /> Unduh
              </button>
           </div>
        </div>
      </div>
    </Layout>
  );
}

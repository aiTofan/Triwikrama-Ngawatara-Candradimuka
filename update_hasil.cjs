const fs = require('fs');
let code = fs.readFileSync('src/pages/Hasil.jsx', 'utf8');

code = code.replace(
    /data\.status === 'terverifikasi' && data\.skor !== undefined && data\.skor !== null \? \`\$\{data\.skor\}%\` : ''/g,
    `(data.status === 'selesai' || data.status === 'terverifikasi') && data.skor !== undefined && data.skor !== null ? \`\$\{data.skor\}%\` : ''`
);

code = code.replace(/\['selesai', 'menunggu_verifikasi', 'terverifikasi'\]/g, "['selesai', 'terverifikasi']");

// Add Hitung Ulang Skor button if skor is undefined
const hookText = `<div className="hasil-hero" data-testid="hasil-hero" style={{ textAlign: 'center' }}>
        <p className="cd-h1" style={{ fontSize: data.skor !== undefined ? 96 : 32, margin: 0, lineHeight: 1 }}>`;
        
const replaceHook = `<div className="hasil-hero" data-testid="hasil-hero" style={{ textAlign: 'center' }}>
        {data.skor === undefined && (
          <button className="cd-btn" style={{ marginBottom: 16 }} onClick={async () => {
             const { hitungSkorDariPublik } = await import('../penilaian');
             const { sesiService } = await import('../services/sesiService');
             const raw = await sesiService.ambilSesi(data.sesi_id);
             const hasil = hitungSkorDariPublik(raw);
             await sesiService.updateSesi(data.sesi_id, {
                skor: hasil.skor, skor_mentah: hasil.skor_mentah, disk: hasil.disk,
                penalti_jebakan: hasil.penalti_jebakan, status: 'selesai'
             });
             window.location.reload();
          }}>Hitung Ulang Skor</button>
        )}
        <p className="cd-h1" style={{ fontSize: data.skor !== undefined ? 96 : 32, margin: 0, lineHeight: 1 }}>`;
        
code = code.replace(hookText, replaceHook);

fs.writeFileSync('src/pages/Hasil.jsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/pages/Uji.jsx', 'utf8');

code = code.replace(
    /const selesai = async \(\) => \{[\s\S]*?status: 'menunggu_verifikasi'[\s\S]*?\};/,
    `const selesai = async () => {
    setFinishing(true);
    try { 
      const { hitungSkorDariPublik } = await import('../penilaian');
      const hasil = hitungSkorDariPublik({ ...sesi, jawaban: sesi.jawaban });
      const payload = {
        jawaban: sesi.jawaban,
        status: 'selesai',
        skor: hasil.skor,
        skor_mentah: hasil.skor_mentah,
        disk: hasil.disk,
        penalti_jebakan: hasil.penalti_jebakan,
        penalti_deviasi: hasil.penalti_deviasi,
        selesai_pada: new Date().toISOString()
      };`
);

fs.writeFileSync('src/pages/Uji.jsx', code);

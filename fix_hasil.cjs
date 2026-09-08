const fs = require('fs');
let code = fs.readFileSync('src/pages/Hasil.jsx', 'utf8');

const regex = /if \(s\.status !== 'terverifikasi'\) return \{ nama: "Menunggu Verifikasi", desc: "Penilaian sedang dilakukan oleh pemeriksa\." \};\s*if \(skor === undefined \|\| skor === null\) return \{ nama: "Menunggu Verifikasi", desc: "Sistem sedang mengkalkulasi skor Anda" \};/g;

code = code.replace(
    regex,
    'if (skor === undefined || skor === null) return { nama: "Menunggu Kalkulasi", desc: "Sistem sedang mengkalkulasi skor Anda" };'
);

fs.writeFileSync('src/pages/Hasil.jsx', code);

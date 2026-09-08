const fs = require('fs');
let code = fs.readFileSync('src/pages/Hasil.jsx', 'utf8');

code = code.replace(
  "const getKategori = (skor) => {",
  `const getKategori = (skor) => {
          if (s.status !== 'terverifikasi') return { nama: "Menunggu Verifikasi", desc: "Penilaian sedang dilakukan oleh pemeriksa." };`
);

code = code.replace(
  "sessions = resPj.data.filter(d => d.status === 'selesai');",
  "sessions = resPj.data.filter(d => ['selesai', 'menunggu_verifikasi', 'terverifikasi'].includes(d.status));"
);

code = code.replace(
  "if (s.status === 'selesai' && !sessions.find(x => x.id === s.id)) {",
  "if (['selesai', 'menunggu_verifikasi', 'terverifikasi'].includes(s.status) && !sessions.find(x => x.id === s.id)) {"
);

code = code.replace(
  "if (parsed.perjalanan_id === s.perjalanan_id && parsed.status === 'selesai') {",
  "if (parsed.perjalanan_id === s.perjalanan_id && ['selesai', 'menunggu_verifikasi', 'terverifikasi'].includes(parsed.status)) {"
);

code = code.replace(
  "{data.skor !== undefined && data.skor !== null ? `${data.skor}%` : 'Hasil sedang diverifikasi'}",
  "{data.status === 'terverifikasi' && data.skor !== undefined && data.skor !== null ? `${data.skor}%` : ''}"
);

code = code.replace(
  "skor: s.skor, ",
  "skor: s.skor, status: s.status, "
);

fs.writeFileSync('src/pages/Hasil.jsx', code);

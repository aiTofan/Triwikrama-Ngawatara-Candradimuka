const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

code = code.replace(
    /const res = await soalService\.samakanOpsiId\(\);\s*setMessage\(\`Berhasil menyamakan opsi_id pada \$\{res\.data\} soal\.\`\);/,
    `const res = await soalService.samakanOpsiId();
      if (res.success) {
        setMessage(\`Berhasil menyamakan opsi_id pada \${res.data} soal.\`);
      } else {
        setMessage("Gagal menyamakan opsi_id: " + res.message);
      }`
);

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);

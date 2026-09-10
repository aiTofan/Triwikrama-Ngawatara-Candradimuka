const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

const replacement = `
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
               <li>✅ Diterima (Sukses): <strong>{report.count}</strong> baris</li>
               <li>🔄 Duplikat (Jenis Diperbarui): <strong>{report.updatedJenis || 0}</strong> baris</li>
               <li>⚠️ Duplikat (Tidak Berubah): <strong>{report.duplicated}</strong> baris</li>
               <li>❌ Ditolak/Peringatan: <strong>{report.rejected}</strong> baris (Peringatan bisa berasal dari perubahan jenis ke 'inti')</li>
            </ul>
`;

code = code.replace(/<ul style=\{\{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' \}\}>[\s\S]*?<\/ul>/, replacement.trim());

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);
console.log("Patched admin report");

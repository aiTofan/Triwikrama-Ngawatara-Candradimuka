const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

// Remove verifying state
code = code.replace(/const \[verifying, setVerifying\] = useState\(false\);\n/, '');

// Remove verifikasiSesiCore, verifikasiSesi, and verifikasiSemua
const verifikasiRegex = /const verifikasiSesiCore = async \([\s\S]*?setNotifMsg\(notif\);\n  \};/;
code = code.replace(verifikasiRegex, '');

// Remove the Nilai buttons from the table
const buttonsRegex = /\{s\.status !== 'terverifikasi' && s\.status !== 'gagal_dinilai' && \([\s\S]*?<\/button>\n\s*\)\}\n\s*\{\(s\.status === 'terverifikasi' \|\| s\.status === 'gagal_dinilai'\) && \([\s\S]*?<\/button>\n\s*\)\}/;
code = code.replace(buttonsRegex, '');

// Remove verifying from dependency array
code = code.replace(/, verifying, nav/g, ', nav');

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);
console.log("Patched successfully.");

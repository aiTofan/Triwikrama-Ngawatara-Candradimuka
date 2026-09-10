const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.jsx', 'utf8');

code = code.replace(/<Link to="\/kemitraan" data-testid="link-kemitraan">Kemitraan \(B2B\)<\/Link>/, '<Link to="/kemitraan" data-testid="link-kemitraan">Kemitraan (B2B)</Link>\n        <Link to="/peluang" data-testid="link-peluang">Lisensi Pelatihan</Link>');

fs.writeFileSync('src/pages/Home.jsx', code);
console.log("Patched successfully");

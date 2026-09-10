const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.jsx', 'utf8');

code = code.replace(/<Link to="\/kemitraan" data-testid="footer-kemitraan">Kemitraan & Integrasi<\/Link>/, '<Link to="/kemitraan" data-testid="footer-kemitraan">Kemitraan & Integrasi</Link>\n      <Link to="/peluang" data-testid="footer-peluang">Peluang & Sertifikasi</Link>');

fs.writeFileSync('src/components/Layout.jsx', code);
console.log("Patched successfully");

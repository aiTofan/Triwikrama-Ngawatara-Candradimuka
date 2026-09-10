const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.jsx', 'utf8');

code = code.replace(/<Link to="\/validasi" data-testid="footer-validasi">Periksa keaslian sertifikat<\/Link>\n\s*/, '');

fs.writeFileSync('src/components/Layout.jsx', code);
console.log("Patched successfully");

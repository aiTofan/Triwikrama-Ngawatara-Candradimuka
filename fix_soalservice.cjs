const fs = require('fs');
let code = fs.readFileSync('src/services/soalService.js', 'utf8');

const regex = /const sp = \{ \.\.\.p, sk: sandiSkor\(p\.opsi_id, p\.skor !== undefined \? p\.skor : \(p\._skor !== undefined \? p\._skor : 0\)\) \};\s*delete sp\.skor;\s*delete sp\._skor;\s*return sp;/g;

code = code.replace(
    regex,
    `const sk = sandiSkor(p.opsi_id, p.skor !== undefined ? p.skor : (p._skor !== undefined ? p._skor : 0));
                return {
                    opsi_id: p.opsi_id,
                    teks: p.teks,
                    sk: sk
                };`
);

fs.writeFileSync('src/services/soalService.js', code);

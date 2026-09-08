const fs = require('fs');
let code = fs.readFileSync('src/penilaian.js', 'utf8');

code = code.replace(
    'const ans = sesi.jawaban[soalId];',
    'const ans = (sesi.jawaban || {})[soalId];'
);

fs.writeFileSync('src/penilaian.js', code);

const fs = require('fs');
let code = fs.readFileSync('src/pages/Hasil.jsx', 'utf8');

code = code.replace(/\.then\(linkedUser => \{/g, '.then(async linkedUser => {');

fs.writeFileSync('src/pages/Hasil.jsx', code);
console.log("Fixed async successfully");

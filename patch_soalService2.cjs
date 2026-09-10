const fs = require('fs');
let code = fs.readFileSync('src/services/soalService.js', 'utf8');

code = code.replace(/if \(data\[KOLOM\.JENIS\] === JENIS\.PEMERIKSA\) pemeriksa\.push\(data\);\n\s*else inti\.push\(data\);/, 
'if (data[KOLOM.JENIS] === JENIS.PEMERIKSA || data[KOLOM.JENIS] === JENIS.JANGKAR_PALSU) pemeriksa.push(data);\n        else inti.push(data);');

fs.writeFileSync('src/services/soalService.js', code);
console.log("Patched pool soal");

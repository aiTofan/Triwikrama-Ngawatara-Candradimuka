const fs = require('fs');
let code = fs.readFileSync('src/services/papanService.js', 'utf8');

code = code.replace(
    /where\('status', '==', 'terverifikasi'\)/,
    'where("status", "in", ["selesai", "terverifikasi"])'
);

fs.writeFileSync('src/services/papanService.js', code);

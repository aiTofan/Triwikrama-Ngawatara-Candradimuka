const fs = require('fs');
let code = fs.readFileSync('src/pages/Hasil.jsx', 'utf8');

// Replace the line:
// if (s.peserta_id !== user.uid) throw new Error("Forbidden");
const replacement = `
        let hasLocalAccess = false;
        const offlineKey = 'offline_session_' + sesiId;
        if (localStorage.getItem(offlineKey)) {
           const parsed = JSON.parse(localStorage.getItem(offlineKey));
           if (parsed.id === s.id) {
               hasLocalAccess = true;
           }
        }
        
        if (s.peserta_id !== user.uid && !hasLocalAccess) {
           throw new Error("Forbidden");
        }
`;

code = code.replace(/if \(s\.peserta_id !== user\.uid\) throw new Error\("Forbidden"\);/, replacement);

fs.writeFileSync('src/pages/Hasil.jsx', code);
console.log("Patched Forbidden successfully");

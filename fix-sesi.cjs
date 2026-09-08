const fs = require('fs');
let code = fs.readFileSync('src/services/sesiService.js', 'utf8');

code = code.replace(
  "const q = query(collection(db, KOLEKSI.SESSIONS), where('perjalanan_id', '==', perjalananId));",
  "const { auth } = await import('./firebase');\n      const uid = auth.currentUser?.uid;\n      const q = query(collection(db, KOLEKSI.SESSIONS), where('peserta_id', '==', uid));"
);

code = code.replace(
  "snap.forEach(d => sessions.push(d.data()));",
  "snap.forEach(d => {\n        const data = d.data();\n        if (data.perjalanan_id === perjalananId) sessions.push(data);\n      });\n      console.log('[SESI]', sessions.length, sessions.map(s => s.jenis));"
);

fs.writeFileSync('src/services/sesiService.js', code);

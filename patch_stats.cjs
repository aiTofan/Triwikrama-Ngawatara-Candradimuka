const fs = require('fs');
let code = fs.readFileSync('src/services/soalService.js', 'utf8');

const replacement = `
  ambilStatistikSoal: async () => {
    const now = Date.now();
    if (now - soalService._cacheStats.timestamp < 300000 && soalService._cacheStats.data) {
       return soalService._cacheStats.data;
    }
    return jalankanOperasi(async () => {
      const snap = await getDocs(collection(db, KOLEKSI.BANK_SOAL));
      const stats = {};
      snap.forEach(d => {
        const data = d.data();
        const t = data[KOLOM.TINGKAT];
        const j = data[KOLOM.JENIS];
        if (!stats[t]) stats[t] = { inti: 0, pemeriksa: 0, 'tanpa-jangkar': 0, berjangkar: 0, 'jangkar-palsu': 0, total: 0 };
        if (stats[t][j] !== undefined) {
           stats[t][j]++;
        } else {
           stats[t].inti++; // fallback
        }
        stats[t].total++;
      });
      soalService._cacheStats = { data: stats, timestamp: Date.now() };
      return stats;
    });
  },
`;

code = code.replace(/ambilStatistikSoal:\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\},/g, replacement.trim() + ',');

fs.writeFileSync('src/services/soalService.js', code);
console.log("Patched stats");

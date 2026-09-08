const fs = require('fs');

let code = fs.readFileSync('src/services/soalService.js', 'utf8');

// Add import if not present
if (!code.includes('sandiSkor')) {
    code = 'import { sandiSkor } from "../lib/kunciSkor";\n' + code;
}

const obfuscateBlock = `
        const versiPublik = buatVersiPublik(q);
        if (versiPublik.pilihan) {
            let pArr = [...versiPublik.pilihan];
            for (let i = pArr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pArr[i], pArr[j]] = [pArr[j], pArr[i]];
            }
            versiPublik.pilihan = pArr.map(p => {
                const sp = { ...p, sk: sandiSkor(p.opsi_id, p.skor !== undefined ? p.skor : (p._skor !== undefined ? p._skor : 0)) };
                delete sp.skor;
                delete sp._skor;
                return sp;
            });
        }
        batch.set(docRefPublik, versiPublik);
`;

code = code.replace(/batch\.set\(docRefPublik, buatVersiPublik\(q\)\);/g, obfuscateBlock);

fs.writeFileSync('src/services/soalService.js', code);

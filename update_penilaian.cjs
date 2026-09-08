const fs = require('fs');

let code = fs.readFileSync('src/penilaian.js', 'utf8');

if (!code.includes('bukaSkor')) {
    code = 'import { bukaSkor } from "./lib/kunciSkor";\n' + code;
}

// Add penalty logic to hitungSkorSesi
code = code.replace(
    'skor_mentah += scoreVal;\n               disk.push(scoreVal);\n               max_skor += 100;',
    `skor_mentah += scoreVal;
               disk.push(scoreVal);
               max_skor += 100;
               if (soal.jenis === 'pemeriksa' && scoreVal < 100) {
                   penalti_jebakan = true;
                   skor_mentah -= 20;
               }`
);
if (!code.includes('let penalti_jebakan = false;')) {
    code = code.replace(
        'let gagal_dicocokkan = 0;',
        'let gagal_dicocokkan = 0;\n    let penalti_jebakan = false;'
    );
}

// Change return penalti_jebakan: false to penalti_jebakan
code = code.replace('penalti_jebakan: false,', 'penalti_jebakan: penalti_jebakan,');

const newFunc = `
export function hitungSkorDariPublik(sesi) {
   let skor_mentah = 0;
   let max_skor = 0;
   let disk = [];
   let penalti_jebakan = false;
   
   for (const soalId of sesi.soal_ids || []) {
       const soal = (sesi.soal_detail || {})[soalId];
       if (!soal || soal.is_trap) continue;

       const pilihan = soal.pilihan || [];
       const ans = (sesi.jawaban || {})[soalId];

       if (!ans) continue;
       
       const p = pilihan.find(x => x.opsi_id === ans || x.token === ans || x.id === ans);
       if (p) {
           const scoreVal = bukaSkor(p.opsi_id || p.token || p.id, p.sk);
           skor_mentah += scoreVal;
           disk.push(scoreVal);
           max_skor += 100;

           if (soal.jenis === 'pemeriksa' && scoreVal < 100) {
               penalti_jebakan = true;
               skor_mentah -= 20;
           }
       }
   }

   let persen = 0;
   if (max_skor > 0) {
       persen = Math.round((skor_mentah / max_skor) * 100);
   }
   
   if (skor_mentah < 0) skor_mentah = 0;
   if (persen < 0) persen = 0;

   return {
      skor: persen,
      skor_mentah: skor_mentah,
      disk: disk,
      penalti_deviasi: false,
      penalti_jebakan: penalti_jebakan,
      gagal_dinilai: false,
      gagal_count: 0
   };
}
`;

if (!code.includes('hitungSkorDariPublik')) {
    code += '\n' + newFunc;
}

fs.writeFileSync('src/penilaian.js', code);

const fs = require('fs');
let code = fs.readFileSync('src/domain/soal.js', 'utf8');

// Replace JENIS
const newJenis = `export const JENIS = {
  INTI: 'inti',
  PEMERIKSA: 'pemeriksa',
  TANPA_JANGKAR: 'tanpa-jangkar',
  BERJANGKAR: 'berjangkar',
  JANGKAR_PALSU: 'jangkar-palsu'
};`;
code = code.replace(/export const JENIS = \{[\s\S]*?\};/, newJenis);

// Replace normalisasiJenis
const newNormalisasiJenis = `export function normalisasiJenis(jenis, baris = null, warningsList = null) {
  if (!jenis) {
      if (warningsList && baris !== null) warningsList.push({ baris, alasan: "Jenis kosong, dilipat menjadi 'inti'" });
      return JENIS.INTI;
  }
  const str = String(jenis).toLowerCase().replace(/[\\s_-]+/g, '');
  if (str === 'inti') return JENIS.INTI;
  if (str === 'pemeriksa') return JENIS.PEMERIKSA;
  if (str === 'tanpajangkar') return JENIS.TANPA_JANGKAR;
  if (str === 'berjangkar') return JENIS.BERJANGKAR;
  if (str === 'jangkarpalsu') return JENIS.JANGKAR_PALSU;
  
  if (warningsList && baris !== null) {
      warningsList.push({ baris, alasan: \`Jenis soal '\${jenis}' tidak dikenali, dilipat menjadi 'inti'\` });
  }
  return JENIS.INTI; // everything else is considered normal (inti)
}`;
code = code.replace(/export function normalisasiJenis\(jenis\) \{[\s\S]*?return JENIS\.INTI; \/\/ everything else is considered normal \(inti\)\n\}/, newNormalisasiJenis);

fs.writeFileSync('src/domain/soal.js', code);
console.log("Patched domain/soal.js successfully");

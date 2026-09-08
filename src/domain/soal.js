export const TINGKAT = {
  BHURLOKA: 'Bhurloka',
  AKASA: 'Ākāśa',
  PARAMARTHA: 'Paramārtha',
};

export const JENIS = {
  INTI: 'inti',
  PEMERIKSA: 'pemeriksa',
};

export const KOLOM = {
  NO: 'no',
  TINGKAT: 'tingkat',
  JENIS: 'jenis',
  JUDUL: 'judul',
  SKENARIO: 'skenario',
  PILIHAN: 'pilihan',
  OPSI_ID: 'opsi_id',
  TEKS: 'teks',
  SKOR: 'skor',
};

export function normalisasiTingkat(tingkat) {
  if (!tingkat) return null;
  const str = String(tingkat).toLowerCase().trim();
  if (str === 'bhurloka') return TINGKAT.BHURLOKA;
  if (str === 'akasa' || str === 'akasha' || str === 'ākāśa' || str === 'akāśa' || str === 'ākāsa') return TINGKAT.AKASA;
  if (str === 'paramartha' || str === 'paramarta' || str === 'paramārtha') return TINGKAT.PARAMARTHA;
  return null; // return null for unknown
}

export function normalisasiJenis(jenis) {
  if (!jenis) return JENIS.INTI;
  const str = String(jenis).toLowerCase().trim();
  if (str === 'pemeriksa') return JENIS.PEMERIKSA;
  return JENIS.INTI; // everything else is considered normal (inti)
}

export function validasiSoal(soal) {
  return !!(soal[KOLOM.TINGKAT] && soal[KOLOM.SKENARIO] && Array.isArray(soal[KOLOM.PILIHAN]) && soal[KOLOM.PILIHAN].length > 0);
}

export async function sidikJariSoal(soal) {
  const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, ' ').trim();
  const base = norm(soal[KOLOM.SKENARIO]);
  const opsis = (soal[KOLOM.PILIHAN] || []).map(p => norm(p[KOLOM.TEKS])).sort().join('|');
  const dataString = `${base}|${opsis}`;
  
  const msgBuffer = new TextEncoder().encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Fisher-Yates shuffle
function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buatVersiPublik(soal) {
  // pastikan opsi_id selalu di-generate jika tidak ada, tidak berurutan a, b, c, d
  // dan urutan pilihan diacak
  const pilihanAcak = shuffleArray(soal[KOLOM.PILIHAN].map(p => ({
    [KOLOM.OPSI_ID]: p[KOLOM.OPSI_ID] || crypto.randomUUID().slice(0, 8),
    [KOLOM.TEKS]: p[KOLOM.TEKS]
  })));

  return {
    [KOLOM.NO]: soal[KOLOM.NO] || null,
    [KOLOM.TINGKAT]: soal[KOLOM.TINGKAT],
    [KOLOM.JENIS]: soal[KOLOM.JENIS],
    [KOLOM.JUDUL]: soal[KOLOM.JUDUL] || null,
    [KOLOM.SKENARIO]: soal[KOLOM.SKENARIO],
    [KOLOM.PILIHAN]: pilihanAcak
  };
}

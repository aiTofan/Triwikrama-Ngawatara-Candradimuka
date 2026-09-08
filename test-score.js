import { hitungSkorSesi } from './src/penilaian.js';

async function test() {
  try {
    const sesi = {
      id: "mock_sesi_id",
      jawaban: {"soal1": "opsiA"},
      soal_ids: ["soal1"]
    };
    const hasil = await hitungSkorSesi(sesi);
    console.log("HASIL:", hasil);
  } catch (e) {
    console.error("ERROR:", e);
  }
}
test();

export function analisisPerilaku(durasi_ms, jawaban, soal_ids, soal_detail, pindah_fokus) {
  let skor_curiga = 0;
  let alasan = [];
  
  if (!durasi_ms || durasi_ms.length === 0) return { skor_curiga: 0, alasan: [] };

  const total_durasi = durasi_ms.reduce((a, b) => a + b, 0);
  const mean = total_durasi / durasi_ms.length;

  if (mean < 2000) {
    skor_curiga += 30;
    alasan.push("Rata-rata waktu menjawab sangat cepat (di bawah 2 detik).");
  }

  const cepatCount = durasi_ms.filter(d => d < 1500).length;
  if (cepatCount / durasi_ms.length > 0.3) {
    skor_curiga += 30;
    alasan.push("Lebih dari 30 persen soal dijawab dalam waktu kurang dari 1,5 detik.");
  }

  const variance = durasi_ms.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / durasi_ms.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev < 300) {
    skor_curiga += 20;
    alasan.push("Kecepatan menjawab tidak wajar (simpangan baku sangat rendah di bawah 300 ms).");
  }

  if (pindah_fokus > 5) {
    skor_curiga += 20;
    alasan.push("Peserta terlalu sering berpindah tab/layar (lebih dari 5 kali).");
  }

  let sameIndex = true;
  let firstIndex = -1;
  let answered = 0;
  for (const id of soal_ids) {
    const ans = jawaban[id];
    if (!ans) continue;
    answered++;
    const pilihan = soal_detail[id]?.pilihan || [];
    const optIndex = pilihan.findIndex(o => o.opsi_id === ans || o.token === ans || o.id === ans);
    if (firstIndex === -1) {
      firstIndex = optIndex;
    } else if (optIndex !== firstIndex) {
      sameIndex = false;
      break;
    }
  }

  if (sameIndex && answered > 3 && firstIndex !== -1) {
    skor_curiga += 40;
    alasan.push("Seluruh jawaban memilih opsi pada posisi yang sama.");
  }

  if (skor_curiga > 100) skor_curiga = 100;

  return {
    skor_curiga,
    alasan
  };
}

import { bukaSkor } from "./lib/kunciSkor";
export async function hitungSkorSesi(sesi) {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const { db, auth } = await import("./firebase");
    
    const user = auth.currentUser;
    if (!user) throw new Error("Akses ditolak: Anda harus login.");
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
      throw new Error("Akses ditolak: Hanya admin yang dapat menghitung skor.");
    }
    
    let skor_mentah = 0;
    let max_skor = 0;
    let disk = [];
    let gagal_dicocokkan = 0;
    let penalti_jebakan = false;
    
    for (const soalId of sesi.soal_ids || []) {
      const soalSnap = await getDoc(doc(db, 'bank_soal', soalId));
      if (soalSnap.exists()) {
        const soal = soalSnap.data();
        if (soal.is_trap) continue;
        
        const pilihan = soal.pilihan || [];
        const ans = (sesi.jawaban || {})[soalId];
        
        if (!ans) continue;

        const p = pilihan.find(x => x.opsi_id === ans || x.token === ans || x.id === ans);
        
        if (p) {
           const scoreVal = p.skor !== undefined ? Number(p.skor) : (p._skor !== undefined ? Number(p._skor) : null);
           if (scoreVal !== null) {
               skor_mentah += scoreVal;
               disk.push(scoreVal);
               max_skor += 100;
               if (soal.jenis === 'pemeriksa' && scoreVal < 100) {
                   penalti_jebakan = true;
                   skor_mentah -= 20;
               }
           } else {
               console.log('[NILAI] tidak cocok - opsi ada tapi tidak berskor', soalId, ans);
               gagal_dicocokkan++;
           }
        } else {
           console.log('[NILAI] tidak cocok - opsi_id tidak ditemukan', soalId, ans);
           gagal_dicocokkan++;
        }
      }
    }

    let persen = 0;
    if (max_skor > 0) {
      persen = Math.round((skor_mentah / max_skor) * 100);
    }

    return {
      skor: persen,
      skor_mentah: skor_mentah,
      disk: disk,
      penalti_deviasi: false,
      penalti_jebakan: penalti_jebakan,
      gagal_dinilai: gagal_dicocokkan > 0,
      gagal_count: gagal_dicocokkan
    };
  } catch (e) {
    console.error("Gagal menghitung skor:", e);
    throw e;
  }
}


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

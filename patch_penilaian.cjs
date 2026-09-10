const fs = require('fs');

const code = `import { bukaSkor } from "./lib/kunciSkor";
import { JENIS } from "./domain/soal";

const SKALA_PENUH = 100;
const PENALTI_JANGKAR_PALSU = 0;

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
        
        const pilihan = soal.pilihan || [];
        const ans = (sesi.jawaban || {})[soalId];
        
        if (!ans) continue;

        const p = pilihan.find(x => x.opsi_id === ans || x.token === ans || x.id === ans);
        
        if (p) {
           const scoreVal = p.skor !== undefined ? Number(p.skor) : (p._skor !== undefined ? Number(p._skor) : null);
           if (scoreVal !== null) {
               skor_mentah += scoreVal;
               disk.push(scoreVal);
               
               // Penyebut sengaja 100 sementara nilai tertinggi butir adalah 96.3. Plafon 96.3 persen ini disengaja oleh pemilik aplikasi: kejernihan tidak pernah tuntas, selalu tersisa ruang untuk naik. JANGAN diubah menjadi nilai tertinggi butir.
               max_skor += SKALA_PENUH;

               if (soal.jenis === JENIS.JANGKAR_PALSU) {
                   const maxOpsi = Math.max(...pilihan.map(opt => opt.skor !== undefined ? Number(opt.skor) : (opt._skor !== undefined ? Number(opt._skor) : 0)));
                   if (scoreVal < maxOpsi) {
                       penalti_jebakan = true;
                       skor_mentah -= PENALTI_JANGKAR_PALSU;
                   }
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
      persen = Number(((skor_mentah / max_skor) * 100).toFixed(2));
    }

    return {
      skor: persen,
      skor_mentah: Number(skor_mentah.toFixed(2)),
      disk: disk,
      penalti_deviasi: false,
      penalti_jebakan: penalti_jebakan,
      gagal_dinilai: gagal_dicocokkan > 0,
      gagal_count: gagal_dicocokkan,
      skala_versi: 2
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
   let gagal_dicocokkan = 0;
   
   for (const soalId of sesi.soal_ids || []) {
       const soal = (sesi.soal_detail || {})[soalId];
       if (!soal) continue;

       const pilihan = soal.pilihan || [];
       const ans = (sesi.jawaban || {})[soalId];

       if (!ans) continue;
       
       const p = pilihan.find(x => x.opsi_id === ans || x.token === ans || x.id === ans);

       if (p) {
           if (p.sk === undefined || p.sk === null) {
               gagal_dicocokkan++;
           } else {
               const scoreVal = bukaSkor(p.opsi_id || p.token || p.id, p.sk);
               if (scoreVal === null) {
                   gagal_dicocokkan++;
               } else {
                   skor_mentah += scoreVal;
                   disk.push(scoreVal);

                   // Penyebut sengaja 100 sementara nilai tertinggi butir adalah 96.3. Plafon 96.3 persen ini disengaja oleh pemilik aplikasi: kejernihan tidak pernah tuntas, selalu tersisa ruang untuk naik. JANGAN diubah menjadi nilai tertinggi butir.
                   max_skor += SKALA_PENUH;

                   if (soal.jenis === JENIS.JANGKAR_PALSU) {
                       // We can't know the max score easily without decrypting all options, so we need to decrypt all options to find maxOpsi
                       let maxOpsi = -Infinity;
                       for (const opt of pilihan) {
                           if (opt.sk !== undefined && opt.sk !== null) {
                               const dec = bukaSkor(opt.opsi_id || opt.token || opt.id, opt.sk);
                               if (dec !== null && dec > maxOpsi) maxOpsi = dec;
                           }
                       }
                       if (scoreVal < maxOpsi) {
                           penalti_jebakan = true;
                           skor_mentah -= PENALTI_JANGKAR_PALSU;
                       }
                   }
               }
           }
       } else {
           gagal_dicocokkan++;
       }
   }

   let persen = 0;
   if (max_skor > 0) {
       persen = Number(((skor_mentah / max_skor) * 100).toFixed(2));
   }
   
   if (skor_mentah < 0) skor_mentah = 0;
   if (persen < 0) persen = 0;

   return {
      skor: persen,
      skor_mentah: Number(skor_mentah.toFixed(2)),
      disk: disk,
      penalti_deviasi: false,
      penalti_jebakan: penalti_jebakan,
      gagal_dinilai: gagal_dicocokkan > 0,
      gagal_count: gagal_dicocokkan,
      skala_versi: 2
   };
}
`;

fs.writeFileSync('src/penilaian.js', code);
console.log("Patched penilaian");

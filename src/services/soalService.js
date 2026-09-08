import { sandiSkor } from "../lib/kunciSkor";
import { KOLEKSI } from "./koleksi";
import { jalankanOperasi, db, collection, query, where, getDocs, writeBatch, doc, getDoc } from "./firestore";
import { TINGKAT, JENIS, KOLOM, validasiSoal, sidikJariSoal, buatVersiPublik, normalisasiTingkat, normalisasiJenis } from "../domain/soal";

export const soalService = {
  ambilPoolSoal: async (tingkat = TINGKAT.BHURLOKA) => {
    return jalankanOperasi(async () => {
      const q = query(collection(db, KOLEKSI.SOAL_PUBLIK), where(KOLOM.TINGKAT, '==', tingkat));
      const snap = await getDocs(q);
      const inti = [];
      const pemeriksa = [];
      snap.forEach(d => {
        const data = { ...d.data(), id: d.id };
        if (data[KOLOM.JENIS] === JENIS.PEMERIKSA) pemeriksa.push(data);
        else inti.push(data);
      });
      return { inti, pemeriksa };
    });
  },
  
  ambilStatistikSoal: async () => {
    return jalankanOperasi(async () => {
      const snap = await getDocs(collection(db, KOLEKSI.BANK_SOAL));
      const stats = {};
      snap.forEach(d => {
        const data = d.data();
        const t = data[KOLOM.TINGKAT];
        const j = data[KOLOM.JENIS];
        if (!stats[t]) stats[t] = { inti: 0, pemeriksa: 0, total: 0 };
        if (j === JENIS.PEMERIKSA) {
          stats[t].pemeriksa++;
        } else {
          stats[t].inti++;
        }
        stats[t].total++;
      });
      return stats;
    });
  },

  unggahBankSoal: async (soalArray, userUid) => {
    return jalankanOperasi(async () => {
      let count = 0;
      let duplicated = 0;
      let rejected = 0;
      const rejectedList = [];
      let batch = writeBatch(db);
      let opCount = 0;
      
      for (let i = 0; i < soalArray.length; i++) {
        const q = soalArray[i];
        const rowNum = i + 1;
        
        // Validation check
        if (!q[KOLOM.SKENARIO] || !q[KOLOM.JUDUL]) {
          rejected++;
          rejectedList.push({ baris: rowNum, alasan: "Skenario atau judul kosong" });
          continue;
        }

        const normTingkat = normalisasiTingkat(q[KOLOM.TINGKAT]);
        if (!normTingkat) {
          rejected++;
          rejectedList.push({ baris: rowNum, alasan: `Tingkat '${q[KOLOM.TINGKAT]}' tidak dikenali` });
          continue;
        }
        q[KOLOM.TINGKAT] = normTingkat;
        q[KOLOM.JENIS] = normalisasiJenis(q[KOLOM.JENIS]);

        if (!q[KOLOM.PILIHAN] || q[KOLOM.PILIHAN].length !== 4) {
          rejected++;
          rejectedList.push({ baris: rowNum, alasan: "Jumlah pilihan tidak tepat 4" });
          continue;
        }

        const scores = q[KOLOM.PILIHAN].map(p => parseInt(p[KOLOM.SKOR], 10)).sort();
        if (scores.join(',') !== "25,50,75,100") {
          rejected++;
          rejectedList.push({ baris: rowNum, alasan: "Skor tidak unik 25, 50, 75, 100" });
          continue;
        }

        q[KOLOM.NO] = q[KOLOM.NO] || count + 1;
        q[KOLOM.PILIHAN] = q[KOLOM.PILIHAN].map(p => ({
          ...p,
          [KOLOM.OPSI_ID]: p[KOLOM.OPSI_ID] || crypto.randomUUID().slice(0, 8),
          [KOLOM.SKOR]: parseInt(p[KOLOM.SKOR], 10)
        }));

        const hash = await sidikJariSoal(q);
        const docRefBank = doc(db, KOLEKSI.BANK_SOAL, hash);
        
        // Duplicate check
        const docSnap = await getDoc(docRefBank);
        if (docSnap.exists()) {
          duplicated++;
          rejectedList.push({ baris: rowNum, alasan: "Sidik jari (duplikat) sudah ada" });
          continue;
        }

        const docRefPublik = doc(db, KOLEKSI.SOAL_PUBLIK, hash);
        
        batch.set(docRefBank, {
          ...q,
          created_at: new Date().toISOString(),
          updated_by: userUid
        });
        opCount++;
        
        
        const versiPublik = buatVersiPublik(q);
        if (versiPublik.pilihan) {
            let pArr = [...versiPublik.pilihan];
            for (let i = pArr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pArr[i], pArr[j]] = [pArr[j], pArr[i]];
            }
            versiPublik.pilihan = pArr.map(p => {
                const sk = sandiSkor(p.opsi_id, p.skor !== undefined ? p.skor : (p._skor !== undefined ? p._skor : 0));
                return {
                    opsi_id: p.opsi_id,
                    teks: p.teks,
                    sk: sk
                };
            });
        }
        batch.set(docRefPublik, versiPublik);

        opCount++;

        count++;
        
        if (opCount >= 398) { // max 400
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }
      
      if (opCount > 0) {
        await batch.commit();
      }
      
      return { count, duplicated, rejected, rejectedList };
    });
  },

    sinkronkanSoalPublik: async () => {
    return jalankanOperasi(async () => {
      const snap = await getDocs(collection(db, KOLEKSI.BANK_SOAL));
      let batch = writeBatch(db);
      let opCount = 0;
      let count = 0;
      for (const d of snap.docs) {
        const docRefBank = doc(db, KOLEKSI.BANK_SOAL, d.id);
        const docRefPublik = doc(db, KOLEKSI.SOAL_PUBLIK, d.id);
        const q = d.data();
        let changedBank = false;
        
        q[KOLOM.JENIS] = normalisasiJenis(q[KOLOM.JENIS]);
        
        if (q[KOLOM.PILIHAN]) {
            q[KOLOM.PILIHAN] = q[KOLOM.PILIHAN].map(p => {
              if (!p[KOLOM.OPSI_ID]) {
                changedBank = true;
                return { ...p, [KOLOM.OPSI_ID]: crypto.randomUUID().slice(0, 8) };
              }
              return p;
            });
        }
        
        if (changedBank) {
            batch.update(docRefBank, { [KOLOM.PILIHAN]: q[KOLOM.PILIHAN], [KOLOM.JENIS]: q[KOLOM.JENIS] });
            opCount++;
        }

        
        const versiPublik = buatVersiPublik(q);
        if (versiPublik.pilihan) {
            let pArr = [...versiPublik.pilihan];
            for (let i = pArr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pArr[i], pArr[j]] = [pArr[j], pArr[i]];
            }
            versiPublik.pilihan = pArr.map(p => {
                const sk = sandiSkor(p.opsi_id, p.skor !== undefined ? p.skor : (p._skor !== undefined ? p._skor : 0));
                return {
                    opsi_id: p.opsi_id,
                    teks: p.teks,
                    sk: sk
                };
            });
        }
        batch.set(docRefPublik, versiPublik);

        opCount++;
        count++;
        if (opCount >= 398) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }
      if (opCount > 0) {
        await batch.commit();
      }
      return count;
    });
  },

  samakanOpsiId: async () => {
    return jalankanOperasi(async () => {
      const snapPublik = await getDocs(collection(db, KOLEKSI.SOAL_PUBLIK));
      let batch = writeBatch(db);
      let opCount = 0;
      let count = 0;
      
      for (const d of snapPublik.docs) {
         const id = d.id;
         const dataPublik = d.data();
         
         const docRefBank = doc(db, KOLEKSI.BANK_SOAL, id);
         const docSnapBank = await getDoc(docRefBank);
         if (docSnapBank.exists()) {
             const dataBank = docSnapBank.data();
             let changed = false;
             
             if (dataBank[KOLOM.PILIHAN] && dataPublik[KOLOM.PILIHAN]) {
                 for (let i = 0; i < dataBank[KOLOM.PILIHAN].length; i++) {
                     const optBank = dataBank[KOLOM.PILIHAN][i];
                     const optPublik = dataPublik[KOLOM.PILIHAN].find(p => p[KOLOM.TEKS] === optBank[KOLOM.TEKS]);
                     if (optPublik && optPublik[KOLOM.OPSI_ID] && optBank[KOLOM.OPSI_ID] !== optPublik[KOLOM.OPSI_ID]) {
                         optBank[KOLOM.OPSI_ID] = optPublik[KOLOM.OPSI_ID];
                         changed = true;
                     }
                 }
             }
             
             if (changed) {
                 batch.update(docRefBank, { [KOLOM.PILIHAN]: dataBank[KOLOM.PILIHAN] });
                 opCount++;
                 count++;
             }
         }
         
         if (opCount >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
         }
      }
      if (opCount > 0) {
         await batch.commit();
      }
      return count;
    });
  }
};
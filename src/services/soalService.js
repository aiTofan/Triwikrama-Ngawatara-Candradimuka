import { sandiSkor } from "../lib/kunciSkor";
import { KOLEKSI } from "./koleksi";
import { jalankanOperasi, db, collection, query, where, getDocs, writeBatch, doc, getDoc } from "./firestore";
import { TINGKAT, JENIS, KOLOM, validasiSoal, sidikJariSoal, buatVersiPublik, normalisasiTingkat, normalisasiJenis } from "../domain/soal";

export const soalService = {
  _cachePool: {},
  _cacheStats: { data: null, timestamp: 0 },
  ambilPoolSoal: async (tingkat = TINGKAT.BHURLOKA) => {
    const now = Date.now();
    if (soalService._cachePool[tingkat] && (now - soalService._cachePool[tingkat].timestamp < 3600000)) {
       return soalService._cachePool[tingkat].data;
    }
    return jalankanOperasi(async () => {
      const q = query(collection(db, KOLEKSI.SOAL_PUBLIK), where(KOLOM.TINGKAT, '==', tingkat));
      const snap = await getDocs(q);
      const inti = [];
      const pemeriksa = [];
      snap.forEach(d => {
        const data = { ...d.data(), id: d.id };
        if (data[KOLOM.JENIS] === JENIS.PEMERIKSA || data[KOLOM.JENIS] === JENIS.JANGKAR_PALSU) pemeriksa.push(data);
        else inti.push(data);
      });
      soalService._cachePool[tingkat] = { data: { inti, pemeriksa }, timestamp: Date.now() };
      return { inti, pemeriksa };
    });
  },
  
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

  unggahBankSoal: async (soalArray, userUid) => {
    return jalankanOperasi(async () => {
      let count = 0;
      let duplicated = 0;
      let updatedJenis = 0;
      let rejected = 0;
      const rejectedList = [];
      let batch = writeBatch(db);
      let opCount = 0;
      let failedOptionsCount = 0;
      
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
        q[KOLOM.JENIS] = normalisasiJenis(q[KOLOM.JENIS], rowNum, rejectedList);

        if (!q[KOLOM.PILIHAN] || q[KOLOM.PILIHAN].length !== 4) {
          rejected++;
          rejectedList.push({ baris: rowNum, alasan: "Jumlah pilihan tidak tepat 4" });
          continue;
        }

        const scores = q[KOLOM.PILIHAN].map(p => Number(p[KOLOM.SKOR]));
        const uniqueScores = new Set(scores);
        if (uniqueScores.size !== 4 || scores.some(isNaN)) {
          rejected++;
          rejectedList.push({ baris: rowNum, alasan: "Skor tidak valid atau tidak unik di antara 4 pilihan" });
          continue;
        }

        q[KOLOM.NO] = q[KOLOM.NO] || count + 1;
        q[KOLOM.PILIHAN] = q[KOLOM.PILIHAN].map(p => ({
          ...p,
          [KOLOM.OPSI_ID]: p[KOLOM.OPSI_ID] || crypto.randomUUID().slice(0, 8),
          [KOLOM.SKOR]: Number(p[KOLOM.SKOR])
        }));

        const hash = await sidikJariSoal(q);
        const docRefBank = doc(db, KOLEKSI.BANK_SOAL, hash);
        
        // Duplicate check
        const docSnap = await getDoc(docRefBank);
        if (docSnap.exists()) {
          const existingData = docSnap.data();
          if (existingData[KOLOM.JENIS] !== q[KOLOM.JENIS]) {
             batch.update(docRefBank, { [KOLOM.JENIS]: q[KOLOM.JENIS], updated_by: userUid });
             const docRefPublik = doc(db, KOLEKSI.SOAL_PUBLIK, hash);
             batch.update(docRefPublik, { [KOLOM.JENIS]: q[KOLOM.JENIS] });
             updatedJenis++;
             opCount += 2;
          } else {
             duplicated++;
          }
          // Do not continue if opCount > 400 since we might need to commit.
          if (opCount > 400) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
          continue;
        }

        const docRefPublik = doc(db, KOLEKSI.SOAL_PUBLIK, hash);
        
        batch.set(docRefBank, {
          ...q,
          created_at: new Date().toISOString(),
          updated_by: userUid
        });
        opCount++;
        
        
        const originalScores = {};
        if (q[KOLOM.PILIHAN]) {
            q[KOLOM.PILIHAN].forEach(p => {
                originalScores[p[KOLOM.OPSI_ID]] = p[KOLOM.SKOR] !== undefined ? Number(p[KOLOM.SKOR]) : (p._skor !== undefined ? Number(p._skor) : null);
            });
        }

        const versiPublik = buatVersiPublik(q);
        if (versiPublik.pilihan) {
            versiPublik.pilihan = versiPublik.pilihan.map(p => {
                const oriSkor = originalScores[p[KOLOM.OPSI_ID]];
                if (oriSkor !== undefined && oriSkor !== null) {
                    p.sk = sandiSkor(p[KOLOM.OPSI_ID], oriSkor);
                } else {
                    p.sk = sandiSkor(p[KOLOM.OPSI_ID], 0);
                    failedOptionsCount++;
                }
                return p;
            });
        }
        
        batch.set(docRefPublik, {
          ...versiPublik,
          created_at: new Date().toISOString(),
          updated_by: userUid
        });
        opCount++;
        count++;

        if (opCount > 400) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }
      
      if (opCount > 0) {
        await batch.commit();
      }
      
      return { count, duplicated, updatedJenis, rejected, rejectedList, failedOptionsCount };
    }, 60000); // Set timeout ke 60 detik untuk unggah JSON
  },

    sinkronkanSoalPublik: async () => {
    return jalankanOperasi(async () => {
      const snap = await getDocs(collection(db, KOLEKSI.BANK_SOAL));
      let batch = writeBatch(db);
      let opCount = 0;
      let count = 0;
      let failedOptionsCount = 0;
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

        
        const originalScores = {};
        if (q[KOLOM.PILIHAN]) {
            q[KOLOM.PILIHAN].forEach(p => {
                originalScores[p[KOLOM.OPSI_ID]] = p[KOLOM.SKOR] !== undefined ? Number(p[KOLOM.SKOR]) : (p._skor !== undefined ? Number(p._skor) : null);
            });
        }

        const versiPublik = buatVersiPublik(q);
        if (versiPublik.pilihan) {
            let pArr = [...versiPublik.pilihan];
            for (let i = pArr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pArr[i], pArr[j]] = [pArr[j], pArr[i]];
            }
            versiPublik.pilihan = pArr.map(p => {
                const nilai = originalScores[p.opsi_id || p[KOLOM.OPSI_ID]];
                let sk = null;
                if ([0, 25, 50, 52.8, 75, 85.2, 96.3, 100].includes(nilai)) {
                    sk = sandiSkor(p.opsi_id || p[KOLOM.OPSI_ID], nilai);
                } else {
                    failedOptionsCount++;
                }
                return {
                    opsi_id: p.opsi_id || p[KOLOM.OPSI_ID],
                    teks: p.teks || p[KOLOM.TEKS],
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
      return `${count} (opsi gagal disandikan: ${failedOptionsCount})`;
    }, 60000);
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
    }, 60000);
  }
};
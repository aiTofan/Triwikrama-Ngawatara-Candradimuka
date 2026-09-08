const fs = require('fs');
let code = fs.readFileSync('src/services/soalService.js', 'utf8');

const newSync = `  sinkronkanSoalPublik: async () => {
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

        batch.set(docRefPublik, buatVersiPublik(q));
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
  },`;

const samakanOpsiId = `
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
};`;

code = code.replace(/sinkronkanSoalPublik: async \(\) => \{[\s\S]*\}\);\n  \}/, newSync);
code = code.replace(/};\s*$/, samakanOpsiId);

fs.writeFileSync('src/services/soalService.js', code);

const fs = require('fs');
let code = fs.readFileSync('src/services/soalService.js', 'utf8');

const replacement = `
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
          rejectedList.push({ baris: rowNum, alasan: \`Tingkat '\${q[KOLOM.TINGKAT]}' tidak dikenali\` });
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
`;

code = code.replace(/unggahBankSoal:\s*async\s*\(soalArray,\s*userUid\)\s*=>\s*\{[\s\S]*?60000\);\s*\/\/\s*Set\s*timeout[\s\S]*?\},/g, replacement.trim() + ',');

fs.writeFileSync('src/services/soalService.js', code);
console.log("Patched unggahBankSoal");

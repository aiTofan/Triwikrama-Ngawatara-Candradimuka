import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, writeBatch } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  const snap = await getDocs(collection(db, 'bank_soal'));
  let batch = writeBatch(db);
  let count = 0;

  snap.forEach(d => {
    const data = d.data();
    let changed = false;
    if (data.pilihan) {
        data.pilihan = data.pilihan.map(p => {
            if (p.skor === 25) { changed = true; return { ...p, skor: 0 }; }
            if (p.skor === 75) { changed = true; return { ...p, skor: 80 }; }
            return p;
        });
    }
    if (changed) {
        batch.update(doc(db, 'bank_soal', d.id), { pilihan: data.pilihan });
        count++;
    }
  });
  await batch.commit();
  console.log(`Migrated ${count} questions to new scoring scheme.`);
  process.exit(0);
}
migrate().catch(console.error);

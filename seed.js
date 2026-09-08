import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch } from "firebase/firestore";
import fs from "fs";
import crypto from "crypto";

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp({
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId,
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain
});

const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function seed() {
  console.log("Loading data...");
  const data = JSON.parse(fs.readFileSync('./data/bank-soal.json', 'utf-8'));
  const questions = data.soal || (Array.isArray(data) ? data : []);
  
  console.log(`Found ${questions.length} questions. Uploading to Firestore...`);
  
  let count = 0;
  let batch = writeBatch(db);
  
  for (const q of questions) {
    if (!q.tingkat) continue;
    
    const hash = await sha256(JSON.stringify(q));
    const docRef = doc(db, 'bank_soal', hash);
    
    batch.set(docRef, {
      ...q,
      created_at: new Date().toISOString(),
      updated_by: "system_seeder"
    });
    
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      console.log(`Committed ${count} questions...`);
      batch = writeBatch(db);
    }
  }
  
  if (count % 400 !== 0) {
    await batch.commit();
    console.log(`Committed ${count} questions...`);
  }
  
  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(console.error);

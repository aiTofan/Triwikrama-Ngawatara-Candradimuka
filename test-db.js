import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: firebaseConfig.projectId
  });
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId);

async function test() {
  try {
    console.log("Fetching sessions limit 1...");
    const snap = await db.collection('sessions').limit(1).get();
    console.log("Sessions found:", snap.size);
    if (!snap.empty) {
      console.log(snap.docs[0].id, snap.docs[0].data());
    }
  } catch(e) {
    console.error("DB Error:", e);
  }
}
test();

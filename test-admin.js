import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: "json" };

const adminApp = initializeApp({
  credential: applicationDefault(),
  projectId: firebaseConfig.projectId
});
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

async function test() {
  try {
    const res = await db.collection('users').get();
    console.log("Success! Users count:", res.size);
  } catch(e) {
    console.error(e);
  }
}
test();

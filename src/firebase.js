import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

setLogLevel('silent');

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = getAuth(app);

let dbInstance;
try {
  if (window._firebaseDbInstance) {
    dbInstance = window._firebaseDbInstance;
  } else {
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
    }, firebaseConfig.firestoreDatabaseId);
    window._firebaseDbInstance = dbInstance;
  }
} catch (e) {
  dbInstance = getFirestore(app);
}
export const db = dbInstance;

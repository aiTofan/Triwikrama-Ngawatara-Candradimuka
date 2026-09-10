const fs = require('fs');
let code = fs.readFileSync('src/pages/Hasil.jsx', 'utf8');

const migrateBlockLanjut = `
           const linkedUser = await startLogin();
           if (!linkedUser) {
             setBusy(false);
             return;
           }
           try {
             const { addDoc, collection } = await import("firebase/firestore");
             const { db } = await import("../firebase");
             const offlineDataStr = localStorage.getItem('offline_session_' + sesiId);
             if (offlineDataStr) {
                 const offlineData = JSON.parse(offlineDataStr);
                 if (offlineData.peserta_id !== linkedUser.uid) {
                    const payload = { ...offlineData, peserta_id: linkedUser.uid };
                    delete payload.id;
                    const docRef = await addDoc(collection(db, "sessions"), payload);
                    const newSessionData = { ...payload, id: docRef.id };
                    localStorage.setItem('offline_session_' + docRef.id, JSON.stringify(newSessionData));
                    window.location.href = "/hasil/" + docRef.id;
                    return;
                 }
             }
           } catch (migErr) { console.error("Migration error", migErr); }
`;

code = code.replace(/const linkedUser = await startLogin\(\);\s*if \(\!linkedUser\) \{\s*setBusy\(false\);\s*return;\s*\}/, migrateBlockLanjut.trim());

fs.writeFileSync('src/pages/Hasil.jsx', code);
console.log("Patched lanjut migration successfully");

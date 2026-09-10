const fs = require('fs');
let code = fs.readFileSync('src/pages/Hasil.jsx', 'utf8');

// We will inject the migrate code right after startLogin is called.
const migrateBlock = `
                 if (linkedUser) {
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
                   window.location.reload();
                 } else {
                   setBusy(false);
                 }
`;

// Replace in the button onClick
code = code.replace(/if \(linkedUser\) \{\s*window\.location\.reload\(\);\s*\} else \{\s*setBusy\(false\);\s*\}/, migrateBlock.trim());

fs.writeFileSync('src/pages/Hasil.jsx', code);
console.log("Patched migration successfully");

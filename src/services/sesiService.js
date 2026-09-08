import { KOLEKSI } from "./koleksi";
import { jalankanOperasi, db, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "./firestore";

export const sesiService = {
  buatSesi: async (sesiData) => {
    return jalankanOperasi(async () => {
      await setDoc(doc(db, KOLEKSI.SESSIONS, sesiData.id), sesiData);
      return sesiData;
    });
  },

  ambilSesi: async (sesiId) => {
    return jalankanOperasi(async () => {
      const d = await getDoc(doc(db, KOLEKSI.SESSIONS, sesiId));
      if (!d.exists()) {
        const e = new Error("not-found");
        e.code = "not-found";
        throw e;
      }
      return d.data();
    });
  },

  updateSesi: async (sesiId, updateData) => {
    return jalankanOperasi(async () => {
      await updateDoc(doc(db, KOLEKSI.SESSIONS, sesiId), updateData);
      return true;
    });
  },

  ambilSesiPerjalanan: async (perjalananId) => {
    return jalankanOperasi(async () => {
      const { auth } = await import('../firebase');
      const uid = auth.currentUser?.uid;
      const q = query(collection(db, KOLEKSI.SESSIONS), where('peserta_id', '==', uid));
      const snap = await getDocs(q);
      const sessions = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.perjalanan_id === perjalananId) sessions.push(data);
      });
      console.log('[SESI]', sessions.length, sessions.map(s => s.jenis));
      return sessions;
    });
  },
  
  simpanOffline: (sesiId, sesiData) => {
    localStorage.setItem(`offline_session_${sesiId}`, JSON.stringify(sesiData));
  },
  
  ambilOffline: (sesiId) => {
    const raw = localStorage.getItem(`offline_session_${sesiId}`);
    return raw ? JSON.parse(raw) : null;
  }
};

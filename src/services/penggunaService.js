import { KOLEKSI } from "./koleksi";
import { jalankanOperasi, db, doc, getDoc, updateDoc, setDoc } from "./firestore";

export const penggunaService = {
  ambilProfil: async (userId) => {
    return jalankanOperasi(async () => {
      const d = await getDoc(doc(db, KOLEKSI.USERS, userId));
      return d.exists() ? d.data() : null;
    });
  },
  
  updateProfil: async (userId, data) => {
    return jalankanOperasi(async () => {
      await updateDoc(doc(db, KOLEKSI.USERS, userId), data);
      return true;
    });
  },

  simpanPenggunaAnonim: async (user, nama) => {
    return jalankanOperasi(async () => {
      const userRef = doc(db, KOLEKSI.USERS, user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          id: user.uid,
          email: '',
          nama_tampilan: nama || 'Peserta',
          nama_lengkap: nama || 'Peserta',
          avatar_url: '',
          role: 'user'
        });
      } else {
        await updateDoc(userRef, {
          nama_tampilan: nama || userSnap.data().nama_tampilan,
          nama_lengkap: nama || userSnap.data().nama_lengkap
        });
      }
      return true;
    });
  },

  sinkronkanPenggunaGoogle: async (user) => {
    return jalankanOperasi(async () => {
      const userRef = doc(db, KOLEKSI.USERS, user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          id: user.uid,
          email: user.email,
          nama_tampilan: user.displayName || 'Peserta',
          nama_lengkap: user.displayName || 'Peserta',
          avatar_url: user.photoURL || '',
          role: user.email === 'tofantriwikrama@gmail.com' ? 'admin' : 'user'
        });
      } else if (user.email === 'tofantriwikrama@gmail.com' && userSnap.data().role !== 'admin') {
         await updateDoc(userRef, { role: 'admin' });
      }
      return true;
    });
  }
};

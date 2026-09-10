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
  ambilRiwayatSesi: async (userId) => {
    return jalankanOperasi(async () => {
      const q = query(collection(db, KOLEKSI.SESSIONS), where('peserta_id', '==', userId), where('status', 'in', ['selesai', 'terverifikasi']));
      const snap = await getDocs(q);
      const sessions = [];
      snap.forEach(d => sessions.push(d.data()));
      
      // Mengurutkan dari yang terbaru
      sessions.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      return sessions;
    });
  },
  hitungPeringkat: async (jenis, skorMentah) => {
    return jalankanOperasi(async () => {
      // Untuk menghitung peringkat: berapa banyak sesi dengan jenis yang sama dan status selesai/terverifikasi
      // yang memiliki skor_mentah > skorMentah saat ini.
      const q = query(
        collection(db, KOLEKSI.SESSIONS), 
        where('jenis', '==', jenis),
        where('status', 'in', ['selesai', 'terverifikasi'])
      );
      const snap = await getDocs(q);
      let higherCount = 0;
      snap.forEach(d => {
        const data = d.data();
        if (data.skor_mentah > skorMentah) {
          higherCount++;
        }
      });
      return higherCount + 1; // Peringkat adalah jumlah yang lebih tinggi + 1
    });
  },
  ambilSesiAktif: async (userId) => {
    return jalankanOperasi(async () => {
      const q = query(collection(db, KOLEKSI.SESSIONS), where('peserta_id', '==', userId), where('status', '==', 'berjalan'));
      const snap = await getDocs(q);
      const sessions = [];
      snap.forEach(d => sessions.push(d.data()));
      
      // Mengurutkan dari yang terbaru
      sessions.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      return sessions.length > 0 ? sessions[0] : null;
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

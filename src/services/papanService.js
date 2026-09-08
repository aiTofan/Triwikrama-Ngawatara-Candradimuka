import { KOLEKSI } from "./koleksi";
import { jalankanOperasi, db, collection, getDocs, doc, getDoc, query, where } from "./firestore";

export const papanService = {
  ambilPapan: async () => {
    return jalankanOperasi(async () => {
      const snap = await getDocs(collection(db, KOLEKSI.PAPAN));
      const res = [];
      snap.forEach(d => res.push({ id: d.id, ...d.data() }));
      return res.sort((a, b) => b.total_skor - a.total_skor);
    });
  },

  ambilPapanTingkat: async (tingkat, userUid) => {
    return jalankanOperasi(async () => {
      const snap = await getDocs(
        query(collection(db, KOLEKSI.SESSIONS), 
          where('jenis', '==', tingkat),
          where("status", "in", ["selesai", "terverifikasi"])
        )
      );
      
      const sessions = [];
      snap.forEach(d => sessions.push(d.data()));
      
      const userBest = new Map();
      for (const s of sessions) {
        const existing = userBest.get(s.peserta_id);
        if (!existing || s.skor > existing.skor) {
          userBest.set(s.peserta_id, s);
        }
      }
      
      let allRanks = Array.from(userBest.values());
      allRanks.sort((a, b) => b.skor - a.skor || new Date(a.created_at) - new Date(b.created_at));
      
      const topSessions = allRanks.slice(0, 100);
      const top = [];
      
      const userCache = {};
      for (let i = 0; i < topSessions.length; i++) {
        const s = topSessions[i];
        let nama = "Anonim";
        
        if (userCache[s.peserta_id]) {
          nama = userCache[s.peserta_id];
        } else {
          try {
            const uDoc = await getDoc(doc(db, KOLEKSI.USERS, s.peserta_id));
            if (uDoc.exists()) {
              nama = uDoc.data().nama_tampilan || "Anonim";
              userCache[s.peserta_id] = nama;
            }
          } catch (e) {}
        }
        
        top.push({
          rank: i + 1,
          peserta_id: s.peserta_id,
          nama_tampilan: nama,
          skor: s.skor,
          tanggal: s.created_at
        });
      }
      
      let my_rank = null;
      if (userUid) {
        const myIndex = allRanks.findIndex(x => x.peserta_id === userUid);
        if (myIndex !== -1) {
          my_rank = { rank: myIndex + 1, total: allRanks.length };
        }
      }
      
      return { top, my_rank, total: allRanks.length };
    });
  }
};

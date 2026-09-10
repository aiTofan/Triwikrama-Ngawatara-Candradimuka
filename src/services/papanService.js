import { KOLEKSI } from "./koleksi";
import { jalankanOperasi, db, collection, getDocs, doc, getDoc, query, where, limit } from "./firestore";

export const papanService = {
  _cache: {},
  ambilPapan: async () => {
    return jalankanOperasi(async () => {
      const snap = await getDocs(collection(db, KOLEKSI.PAPAN));
      const res = [];
      snap.forEach(d => res.push({ id: d.id, ...d.data() }));
      return res.sort((a, b) => b.total_skor - a.total_skor);
    });
  },

  ambilPapanTingkat: async (tingkat, userUid, sortBy = 'skor') => {
    const cacheKey = `${tingkat}_${sortBy}`;
    const now = Date.now();
    if (papanService._cache[cacheKey] && (now - papanService._cache[cacheKey].timestamp < 300000)) {
       const cachedData = papanService._cache[cacheKey].data;
       let my_rank = null;
       if (userUid && cachedData.allRankings) {
          const myIndex = cachedData.allRankings.findIndex(x => x.peserta_id === userUid);
          if (myIndex !== -1) {
            const u = cachedData.allRankings[myIndex];
            my_rank = { rank: u.cur_rank, total: cachedData.allRankings.length, trend: u.trend };
          }
       }
       return { top: cachedData.top, my_rank, total: cachedData.total };
    }
    return jalankanOperasi(async () => {
      const snap = await getDocs(
        query(collection(db, KOLEKSI.SESSIONS), 
          where('jenis', '==', tingkat),
          where("status", "in", ["selesai", "terverifikasi"]),
          limit(2000)
        )
      );
      
      const sessions = [];
      snap.forEach(d => {
         const data = d.data();
         if (data.skor !== undefined && data.skor !== null && typeof data.skor === 'number') {
             sessions.push(data);
         }
      });
      
      const userSessions = new Map();
      for (const s of sessions) {
        if (!userSessions.has(s.peserta_id)) userSessions.set(s.peserta_id, []);
        userSessions.get(s.peserta_id).push(s);
      }

      for (const arr of userSessions.values()) {
        arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      }

      let userStats = [];
      for (const [uid, arr] of userSessions.entries()) {
        const N = arr.length;
        if (sortBy === 'frekuensi') {
          userStats.push({
            peserta_id: uid,
            cur_score: N,
            cur_date: arr[N - 1].created_at,
            prev_score: N > 1 ? N - 1 : null,
            prev_date: N > 1 ? arr[N - 2].created_at : null,
            frekuensi: N,
            skor: Math.max(...arr.map(x => x.skor))
          });
        } else {
          let cur_best = arr[0];
          for(let s of arr) { if(s.skor > cur_best.skor) cur_best = s; }

          let prev_best = null;
          if (N > 1) {
            prev_best = arr[0];
            for(let i=0; i < N-1; i++) { if(arr[i].skor > prev_best.skor) prev_best = arr[i]; }
          }

          userStats.push({
            peserta_id: uid,
            cur_score: cur_best.skor,
            cur_date: cur_best.created_at,
            prev_score: prev_best ? prev_best.skor : null,
            prev_date: prev_best ? prev_best.created_at : null,
            frekuensi: N,
            skor: cur_best.skor
          });
        }
      }

      let currentRanking = [...userStats].sort((a, b) => b.cur_score - a.cur_score || new Date(a.cur_date) - new Date(b.cur_date));
      currentRanking.forEach((u, i) => u.cur_rank = i + 1);

      let prevRanking = [...userStats].filter(u => u.prev_score !== null).sort((a, b) => b.prev_score - a.prev_score || new Date(a.prev_date) - new Date(b.prev_date));
      let prevRankLookup = {};
      prevRanking.forEach((u, i) => prevRankLookup[u.peserta_id] = i + 1);

      currentRanking.forEach(u => {
        if (u.prev_score === null) {
          u.trend = 'new';
        } else {
          const pr = prevRankLookup[u.peserta_id];
          if (pr) {
            if (u.cur_rank < pr) u.trend = 'up';
            else if (u.cur_rank > pr) u.trend = 'down';
            else u.trend = 'same';
          } else {
            u.trend = 'new';
          }
        }
      });

      const topSessions = currentRanking.slice(0, 100);
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
          rank: s.cur_rank,
          peserta_id: s.peserta_id,
          nama_tampilan: nama,
          skor: s.skor,
          frekuensi: s.frekuensi,
          tanggal: s.cur_date,
          trend: s.trend
        });
      }
      
      let my_rank = null;
      if (userUid) {
        const myIndex = currentRanking.findIndex(x => x.peserta_id === userUid);
        if (myIndex !== -1) {
          const u = currentRanking[myIndex];
          my_rank = { 
            rank: u.cur_rank, 
            total: currentRanking.length,
            trend: u.trend,
            prev_rank: prevRankLookup[u.peserta_id] || null
          };
        }
      }
      
      papanService._cache[cacheKey] = { data: { top, allRankings: currentRanking, total: currentRanking.length }, timestamp: Date.now() };
      return { top, my_rank, total: currentRanking.length };
    });
  }
};

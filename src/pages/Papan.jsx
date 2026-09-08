import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../auth";
import { db } from "../firebase";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";

function fmtWaktu(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });
}

const TABS = [
  ["bhurloka", "Bhurloka"],
  ["akasa", "Ākāśa"],
  ["paramartha", "Paramārtha"],
];

export default function Papan() {
  const { user } = useAuth();
  const [tab, setTab] = useState("bhurloka");
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      setData(null);
      try {
        const snap = await getDocs(
          query(collection(db, 'sessions'), 
            where('jenis', '==', tab),
            where('status', '==', 'selesai')
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
        
        // Caching user profiles
        const userCache = {};
        for (let i = 0; i < topSessions.length; i++) {
          const s = topSessions[i];
          let nama = "Anonim";
          
          if (userCache[s.peserta_id]) {
            nama = userCache[s.peserta_id];
          } else {
            try {
              const uDoc = await getDoc(doc(db, 'users', s.peserta_id));
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
        if (user) {
          const myIndex = allRanks.findIndex(x => x.peserta_id === user.uid);
          if (myIndex !== -1) {
            my_rank = { rank: myIndex + 1, total: allRanks.length };
          }
        }
        
        setData({ top, my_rank, total: allRanks.length });
      } catch (err) {
        console.error(err);
        setData({ top: [], my_rank: null, total: 0 });
      }
    })();
  }, [tab, user]);

  return (
    <Layout>
      <div className="cd-topbar">
        <span />
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Peta Kejernihan</span>
      </div>
      <h1 className="cd-h1" style={{ fontSize: 40 }}>Peta Kejernihan</h1>
      <div className="cd-tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={"cd-tab" + (tab === key ? " active" : "")} data-testid={`tab-${key}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      <p className="cd-faint" style={{ fontSize: 13, marginBottom: 12 }}>
        Skor tiap tingkat tidak sebanding, karena itu Peta Kejernihan dipisah per tingkat.
      </p>

      {!data ? <p className="cd-muted">Memuat…</p> : (
        <>
          <table className="cd-table" data-testid="papan-table">
            <thead><tr><th>#</th><th>Nama</th><th>Kejernihan</th><th>Waktu</th></tr></thead>
            <tbody>
              {data.top.length === 0 && <tr><td colSpan={4} className="cd-muted">Belum ada hasil.</td></tr>}
              {data.top.map((r) => (
                <tr key={r.rank}>
                  <td className="mono">{r.rank}</td>
                  <td>{r.nama_tampilan}</td>
                  <td className="mono">{r.skor}%</td>
                  <td className="mono">{fmtWaktu(r.tanggal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.my_rank && data.my_rank.rank > 10 && (
            <p className="cd-muted" style={{ marginTop: 14 }} data-testid="my-rank">
              Peringkatmu saat ini: {data.my_rank.rank} dari {data.my_rank.total.toLocaleString("id-ID")}.
            </p>
          )}
        </>
      )}
    </Layout>
  );
}

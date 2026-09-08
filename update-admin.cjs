const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

if (!code.includes('hitungSkorSesi')) {
  code = code.replace(
    'import { soalService } from "../services/soalService";',
    'import { soalService } from "../services/soalService";\nimport { sesiService } from "../services/sesiService";\nimport { hitungSkorSesi } from "../penilaian";\nimport { db, collection, query, where, getDocs, doc, getDoc } from "../firebase";'
  );
}

// add state variables
if (!code.includes('menunggu')) {
  code = code.replace(
    'const [syncing, setSyncing] = useState(false);',
    'const [syncing, setSyncing] = useState(false);\n  const [menunggu, setMenunggu] = useState([]);\n  const [verifying, setVerifying] = useState(false);'
  );
}

// add loadMenunggu function inside component
if (!code.includes('loadMenunggu')) {
  const insertIndex = code.indexOf('const loadStats = async () => {');
  code = code.slice(0, insertIndex) + `
  const loadMenunggu = async () => {
    try {
      const q = query(collection(db, "sessions"), where("status", "==", "menunggu_verifikasi"));
      const snap = await getDocs(q);
      const list = [];
      for (const d of snap.docs) {
         const data = d.data();
         let nama = "Anonim";
         const userDoc = await getDoc(doc(db, "users", data.peserta_id));
         if (userDoc.exists()) {
             nama = userDoc.data().nama_lengkap || userDoc.data().nama_tampilan || "Anonim";
         }
         list.push({ ...data, id: d.id, nama_peserta: nama });
      }
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setMenunggu(list);
    } catch (e) {
      console.error("Gagal muat antrean:", e);
    }
  };

  const verifikasiSesi = async (s) => {
    setVerifying(true);
    try {
       const hasil = await hitungSkorSesi(s);
       const payload = {
           skor: hasil.skor,
           skor_mentah: hasil.skor_mentah,
           disk: hasil.disk,
           penalti_deviasi: hasil.penalti_deviasi,
           penalti_jebakan: hasil.penalti_jebakan,
           status: 'terverifikasi',
           diverifikasi_pada: new Date().toISOString()
       };
       await sesiService.updateSesi(s.id, payload);
    } catch(e) {
       console.error("Error verifikasi", s.id, e);
       alert("Gagal verifikasi " + s.id + ": " + e.message);
    } finally {
       setVerifying(false);
    }
  };

  const verifikasiSemua = async () => {
     setVerifying(true);
     for (const s of menunggu) {
        try {
           const hasil = await hitungSkorSesi(s);
           const payload = {
               skor: hasil.skor,
               skor_mentah: hasil.skor_mentah,
               disk: hasil.disk,
               penalti_deviasi: hasil.penalti_deviasi,
               penalti_jebakan: hasil.penalti_jebakan,
               status: 'terverifikasi',
               diverifikasi_pada: new Date().toISOString()
           };
           await sesiService.updateSesi(s.id, payload);
        } catch(e) {
           console.error("Error verifikasi", s.id, e);
        }
     }
     await loadMenunggu();
     setVerifying(false);
  };
` + code.slice(insertIndex);
}

// call loadMenunggu in useEffect
code = code.replace(
  'loadStats();\n    }',
  'loadStats();\n      loadMenunggu();\n    }'
);

// render antrean
if (!code.includes('Sesi Menunggu Verifikasi')) {
  const insertRender = code.indexOf('Smart Upload Bank Soal');
  const divBefore = code.lastIndexOf('<div className="cd-block">', insertRender);
  code = code.slice(0, divBefore) + `
      <div className="cd-block" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
           <h2 className="cd-h2" style={{ fontSize: 24, margin: 0 }}>Sesi Menunggu Verifikasi ({menunggu.length})</h2>
           <button className="cd-btn" onClick={verifikasiSemua} disabled={verifying || menunggu.length === 0}>
             {verifying ? "Memproses..." : "Nilai Semua"}
           </button>
        </div>
        {menunggu.length === 0 ? (
           <p className="cd-muted">Tidak ada sesi yang menunggu verifikasi.</p>
        ) : (
           <div style={{ display: 'grid', gap: '1rem' }}>
             {menunggu.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                   <div>
                      <p style={{ fontWeight: 600, margin: 0 }}>{s.nama_peserta}</p>
                      <p className="cd-faint" style={{ margin: 0, fontSize: '13px' }}>Mandala: {s.jenis} | {new Date(s.created_at).toLocaleString()}</p>
                   </div>
                   <button className="cd-btn-ghost" onClick={async () => { await verifikasiSesi(s); await loadMenunggu(); }} disabled={verifying}>
                      Verifikasi & Nilai
                   </button>
                </div>
             ))}
           </div>
        )}
      </div>
` + code.slice(divBefore);
}

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);

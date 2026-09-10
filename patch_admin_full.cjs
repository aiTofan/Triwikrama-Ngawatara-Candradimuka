const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

if (!code.includes('import { bukaSkor }')) {
   code = code.replace(/import \{ TINGKAT, JENIS, KOLOM \} from "\.\.\/domain\/soal";/, 'import { TINGKAT, JENIS, KOLOM } from "../domain/soal";\nimport { bukaSkor } from "../lib/kunciSkor";\nimport { limit } from "firebase/firestore";');
}

// Add state
const stateInjection = `
  const [ujiSandiResult, setUjiSandiResult] = useState(null);
  const [ujiSandiRunning, setUjiSandiRunning] = useState(false);

  const runUjiSandi = async () => {
    setUjiSandiRunning(true);
    setUjiSandiResult(null);
    try {
      const qPub = query(collection(db, "soal_publik"), limit(20));
      const snapPub = await getDocs(qPub);
      let match = 0;
      let mismatch = 0;
      let failed = 0;
      let problems = [];

      for (const d of snapPub.docs) {
         const pub = d.data();
         const snapBank = await getDoc(doc(db, "bank_soal", d.id));
         if (!snapBank.exists()) {
             problems.push(\`Butir \${d.id}: Tidak ditemukan di bank_soal\`);
             continue;
         }
         const bank = snapBank.data();
         
         const bankOpsMap = {};
         if (bank.pilihan) {
            bank.pilihan.forEach(p => {
               bankOpsMap[p.opsi_id || p.id] = p.skor !== undefined ? Number(p.skor) : Number(p._skor);
            });
         }

         if (pub.pilihan) {
            pub.pilihan.forEach(p => {
               const dec = bukaSkor(p.opsi_id || p.token || p.id, p.sk);
               if (dec === null) {
                  failed++;
                  problems.push(\`Butir \${pub.no || d.id}: Gagal membaca sandi (opsi \${p.opsi_id || p.token || p.id})\`);
               } else {
                  const original = bankOpsMap[p.opsi_id || p.token || p.id];
                  if (original !== undefined && Math.abs(original - dec) < 0.05) {
                     match++;
                  } else {
                     mismatch++;
                     problems.push(\`Butir \${pub.no || d.id}: Opsi \${p.opsi_id || p.token || p.id} tidak cocok (asli: \${original}, dec: \${dec})\`);
                  }
               }
            });
         }
      }
      setUjiSandiResult({ match, mismatch, failed, problems });
    } catch (e) {
      console.error(e);
      setUjiSandiResult({ error: e.message });
    }
    setUjiSandiRunning(false);
  };
`;

code = code.replace(/const \[activeTab, setActiveTab\] = useState\("sessions"\);/, 'const [activeTab, setActiveTab] = useState("sessions");' + stateInjection);

// Replace Ringkasan Bank Soal block
const replacementRingkasan = `
          <h2 className="cd-h2" style={{ fontSize: 24 }}>Ringkasan Bank Soal</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {Object.values(TINGKAT).map(t => {
              const s = stats[t] || { inti: 0, pemeriksa: 0, 'tanpa-jangkar': 0, berjangkar: 0, 'jangkar-palsu': 0, total: 0 };
              const quota = quotas[t] || 0;
              return (
                <div key={t} style={{ padding: '1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--ink)' }}>{t}</h3>
                  <p className="cd-muted" style={{ margin: 0 }}>Inti: {s.inti || 0}</p>
                  <p className="cd-muted" style={{ margin: 0 }}>Pemeriksa: {s.pemeriksa || 0}</p>
                  <p className="cd-muted" style={{ margin: 0 }}>Tanpa Jangkar: {s['tanpa-jangkar'] || 0}</p>
                  <p className="cd-muted" style={{ margin: 0 }}>Berjangkar: {s.berjangkar || 0}</p>
                  <p className="cd-muted" style={{ margin: 0, color: s['jangkar-palsu'] > 0 ? 'var(--ink)' : 'var(--alert)' }}>Jangkar Palsu: {s['jangkar-palsu'] || 0}</p>
                  <p style={{ marginTop: '0.5rem', fontWeight: 500, color: s.total >= quota ? 'var(--patina)' : 'var(--alert)' }}>
                    Total: {s.total} / {quota} (Kuota)
                  </p>
                  {((s['jangkar-palsu'] || 0) === 0) && (
                    <p style={{ color: 'var(--alert)', fontSize: '12px', marginTop: '0.5rem', fontWeight: 500 }}>
                      Mandala ini belum punya soal jangkar-palsu, penalti tidak aktif.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          
          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '1rem', color: 'var(--ink)' }}>Uji Putar-Balik Sandi</h3>
            <p className="cd-muted" style={{ marginBottom: '1rem' }}>Mengambil 20 butir acak dari soal_publik, membaca sandi tiap opsi, dan mencocokkannya dengan angka di bank_soal.</p>
            <button className="cd-btn" onClick={runUjiSandi} disabled={ujiSandiRunning}>
              {ujiSandiRunning ? 'Menguji...' : 'Jalankan Uji Sandi'}
            </button>
            {ujiSandiResult && !ujiSandiResult.error && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <p>✅ Cocok: <strong>{ujiSandiResult.match}</strong> opsi</p>
                <p style={{ color: ujiSandiResult.mismatch > 0 ? 'var(--alert)' : 'var(--ink)' }}>❌ Tidak Cocok: <strong>{ujiSandiResult.mismatch}</strong> opsi</p>
                <p style={{ color: ujiSandiResult.failed > 0 ? 'var(--alert)' : 'var(--ink)' }}>⚠️ Gagal Dibaca: <strong>{ujiSandiResult.failed}</strong> opsi</p>
                {ujiSandiResult.problems.length > 0 && (
                  <div style={{ marginTop: '1rem', fontSize: '14px', color: 'var(--alert)' }}>
                    <p style={{ fontWeight: 600 }}>Daftar Bermasalah:</p>
                    <ul style={{ paddingLeft: '20px' }}>
                      {ujiSandiResult.problems.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {ujiSandiResult && ujiSandiResult.error && (
               <div style={{ marginTop: '1rem', padding: '1rem', background: '#ffebee', color: '#c62828', borderRadius: '8px' }}>
                 Galat: {ujiSandiResult.error}
               </div>
            )}
          </div>
`;

code = code.replace(/<h2 className="cd-h2" style=\{\{ fontSize: 24 \}\}>Ringkasan Bank Soal<\/h2>[\s\S]*?(?=<div style=\{\{ marginTop: '2rem', padding: '1\.5rem', background: 'var\(--surface\)',)/, replacementRingkasan);

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);
console.log("Patched AdminDashboard.jsx");

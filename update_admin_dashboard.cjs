const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

// 1. Add terverifikasi state
if (!code.includes('const [terverifikasi, setTerverifikasi] = useState([]);')) {
    code = code.replace(
        'const [menunggu, setMenunggu] = useState([]);',
        'const [menunggu, setMenunggu] = useState([]);\n  const [terverifikasi, setTerverifikasi] = useState([]);'
    );
}

// 2. Update loadMenunggu query
code = code.replace(
    'const q = query(collection(db, "sessions"), where("status", "==", "menunggu_verifikasi"));',
    'const q = query(collection(db, "sessions"), where("status", "in", ["selesai", "menunggu_verifikasi"]));'
);

// 3. Add loadTerverifikasi logic
if (!code.includes('const loadTerverifikasi = async () => {')) {
    const insertLoad = code.indexOf('const verifikasiSesi = async (s) => {');
    code = code.slice(0, insertLoad) + `
  const loadTerverifikasi = async () => {
    try {
      const q = query(collection(db, "sessions"), where("status", "==", "terverifikasi"));
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
      list.sort((a, b) => new Date(b.diverifikasi_pada || b.created_at) - new Date(a.diverifikasi_pada || a.created_at));
      setTerverifikasi(list);
    } catch (e) {
      console.error("Gagal muat terverifikasi:", e);
    }
  };
` + code.slice(insertLoad);
}

// 4. Update verifikasiSesi and verifikasiSemua to call loadTerverifikasi
code = code.replace(
    'await loadMenunggu(); }',
    'await loadMenunggu(); await loadTerverifikasi(); }'
);
code = code.replace(
    'await loadMenunggu();\n     setVerifying(false);',
    'await loadMenunggu();\n     await loadTerverifikasi();\n     setVerifying(false);'
);

// 5. Update useEffect to call loadTerverifikasi
code = code.replace(
    'loadMenunggu();\n    }',
    'loadMenunggu();\n      loadTerverifikasi();\n    }'
);

// 6. Add UI for Sesi Terverifikasi table
if (!code.includes('Sesi Terverifikasi')) {
    const insertUI = code.indexOf('<div className="cd-block">', code.indexOf('Sesi Menunggu Verifikasi'));
    code = code.slice(0, insertUI) + `
      <div className="cd-block" style={{ marginBottom: '2rem' }}>
        <h2 className="cd-h2" style={{ fontSize: 24, marginBottom: '1rem' }}>Sesi Terverifikasi ({terverifikasi.length})</h2>
        {terverifikasi.length === 0 ? (
           <p className="cd-muted">Belum ada sesi yang diverifikasi.</p>
        ) : (
           <div style={{ overflowX: 'auto' }}>
             <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ borderBottom: '1px solid var(--border)' }}>
                   <th style={{ padding: '0.5rem' }}>Nama</th>
                   <th style={{ padding: '0.5rem' }}>Mandala</th>
                   <th style={{ padding: '0.5rem' }}>Skor Akhir</th>
                   <th style={{ padding: '0.5rem' }}>Skor Mentah</th>
                   <th style={{ padding: '0.5rem' }}>Penalti</th>
                   <th style={{ padding: '0.5rem' }}>Tanggal Verifikasi</th>
                 </tr>
               </thead>
               <tbody>
                 {terverifikasi.map(s => (
                   <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                     <td style={{ padding: '0.5rem' }}>{s.nama_peserta}</td>
                     <td style={{ padding: '0.5rem', textTransform: 'capitalize' }}>{s.jenis}</td>
                     <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{s.skor}%</td>
                     <td style={{ padding: '0.5rem' }}>{s.skor_mentah}</td>
                     <td style={{ padding: '0.5rem', color: (s.penalti_deviasi || s.penalti_jebakan) ? 'var(--alert)' : 'var(--ink)' }}>
                        {s.penalti_deviasi ? 'Deviasi ' : ''}{s.penalti_jebakan ? 'Jebakan' : (!s.penalti_deviasi && !s.penalti_jebakan ? '-' : '')}
                     </td>
                     <td style={{ padding: '0.5rem', fontSize: '13px' }}>{s.diverifikasi_pada ? new Date(s.diverifikasi_pada).toLocaleString() : '-'}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        )}
      </div>
` + code.slice(insertUI);
}

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);

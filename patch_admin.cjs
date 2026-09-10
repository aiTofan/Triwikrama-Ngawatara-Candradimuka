const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

// 1. Add `useMemo`, `useCallback` to imports
code = code.replace(/import { useState, useEffect, useRef } from "react";/, 'import { useState, useEffect, useRef, useMemo, useCallback } from "react";');

// 2. Replace loadTerverifikasi to use a user cache and listener
const newLoadTerverifikasi = `
  const userCache = useRef({});
  const unsubscribeTerverifikasi = useRef(null);

  const loadTerverifikasi = useCallback(() => {
    try {
      const q = query(collection(db, "sessions"), where("status", "in", ["selesai", "terverifikasi", "gagal_dinilai"]));
      
      if (unsubscribeTerverifikasi.current) unsubscribeTerverifikasi.current();
      
      const unsub = onSnapshot(q, async (snap) => {
        const list = [];
        const missingUsers = new Set();
        
        // First pass: collect missing user IDs
        snap.docs.forEach(d => {
          const data = d.data();
          if (!userCache.current[data.peserta_id]) {
            missingUsers.add(data.peserta_id);
          }
        });

        // Fetch missing users sequentially or concurrently (minimize read with cache)
        if (missingUsers.size > 0) {
          const promises = Array.from(missingUsers).map(async (uid) => {
             try {
                const uDoc = await getDoc(doc(db, "users", uid));
                if (uDoc.exists()) {
                   userCache.current[uid] = uDoc.data().nama_lengkap || uDoc.data().nama_tampilan || "Anonim";
                } else {
                   userCache.current[uid] = "Anonim";
                }
             } catch(e) {
                userCache.current[uid] = "Anonim";
             }
          });
          await Promise.all(promises);
        }

        for (const d of snap.docs) {
           const data = d.data();
           list.push({ ...data, id: d.id, nama_peserta: userCache.current[data.peserta_id] });
        }
        
        list.sort((a, b) => new Date(b.diverifikasi_pada || b.created_at) - new Date(a.diverifikasi_pada || a.created_at));
        setTerverifikasi(list);
      }, (error) => {
        console.error("Gagal muat terverifikasi (onSnapshot):", error);
      });
      
      unsubscribeTerverifikasi.current = unsub;
      listenerManager.add(unsub);
      
    } catch (e) {
      console.error("Gagal setup terverifikasi:", e);
    }
  }, []);
`;

// Replace the old loadTerverifikasi
code = code.replace(/const loadTerverifikasi = async \(\) => \{[\s\S]*?console\.error\("Gagal muat terverifikasi:", e\);\n    \}\n  \};/, newLoadTerverifikasi);

// We need to stop calling it after every verifikasiSesi
code = code.replace(/await loadTerverifikasi\(\);/g, '// await loadTerverifikasi(); // Now handled by onSnapshot');

// 3. Let's do the same for loadStats
const newLoadStats = `
  const unsubscribeStats = useRef(null);

  const loadStats = useCallback(() => {
    try {
      if (unsubscribeStats.current) unsubscribeStats.current();
      
      const unsub = onSnapshot(collection(db, "bank_soal"), (snap) => {
         const newStats = {};
         snap.forEach(d => {
            const data = d.data();
            const t = data[KOLOM.TINGKAT];
            const j = data[KOLOM.JENIS];
            if (!newStats[t]) newStats[t] = { inti: 0, pemeriksa: 0, total: 0 };
            newStats[t].total++;
            if (j === JENIS.PEMERIKSA) newStats[t].pemeriksa++;
            else newStats[t].inti++;
         });
         setStats(newStats);
      });
      
      unsubscribeStats.current = unsub;
      listenerManager.add(unsub);
      
    } catch (e) {
       console.error("Gagal setup onSnapshot stats", e);
    }
  }, []);
`;

code = code.replace(/const loadStats = async \(\) => \{[\s\S]*?setStats\(st\);\n    \} catch \(e\) \{[\s\S]*?console\.error\(e\);\n    \}\n  \};/, newLoadStats);

// 4. Wrap the Sessions list render in useMemo to prevent re-renders when configs change
code = code.replace(
  /<div className="cd-block" style=\{\{ marginBottom: '2rem' \}\}>\s*<div style=\{\{ display: 'flex', justifyContent: 'space-between'[\s\S]*?<\/div>\s*<\/div>\s*<div className="cd-block">/m,
  `
      {useMemo(() => (
        <div className="cd-block" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 12 }}>
            <h2 className="cd-h2" style={{ fontSize: 24, margin: 0 }}>Semua Sesi Selesai ({filterCuriga ? terverifikasi.filter(s => s.curiga).length : terverifikasi.length})</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={filterCuriga} onChange={e => setFilterCuriga(e.target.checked)} />
              Tampilkan hanya sesi mencurigakan
            </label>
          </div>
          {(filterCuriga ? terverifikasi.filter(s => s.curiga) : terverifikasi).length === 0 ? (
            <p className="cd-muted">Belum ada sesi selesai.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.5rem', fontWeight: 600 }}>Tanda</th>
                    <th style={{ padding: '0.5rem', fontWeight: 600 }}>Peserta</th>
                    <th style={{ padding: '0.5rem', fontWeight: 600 }}>Mandala</th>
                    <th style={{ padding: '0.5rem', fontWeight: 600 }}>Skor</th>
                    <th style={{ padding: '0.5rem', fontWeight: 600 }}>Disk</th>
                    <th style={{ padding: '0.5rem', fontWeight: 600 }}>Waktu Selesai</th>
                    <th style={{ padding: '0.5rem', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.5rem', fontWeight: 600 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(filterCuriga ? terverifikasi.filter(s => s.curiga) : terverifikasi).map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.5rem' }}>
                        {s.curiga && (
                          <div style={{ background: '#fef08a', color: '#854d0e', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', display: 'inline-block', maxWidth: '200px' }}>
                            <strong style={{ display: 'block', marginBottom: '2px' }}>Curiga ({s.skor_curiga})</strong>
                            <span style={{ fontSize: '11px', opacity: 0.8 }}>{s.alasan_curiga}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <div style={{ fontWeight: 500 }}>{s.nama_peserta}</div>
                        <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>{s.peserta_id}</div>
                      </td>
                      <td style={{ padding: '0.5rem', textTransform: 'capitalize' }}>{s.jenis}</td>
                      <td style={{ padding: '0.5rem' }}>{s.skor !== undefined ? Number(s.skor).toFixed(1) : (s.skor_mentah !== undefined ? Number(s.skor_mentah).toFixed(1) : '-')}</td>
                      <td style={{ padding: '0.5rem' }}>
                         {s.disk && Object.keys(s.disk).length > 0 ? (
                            <div style={{ fontSize: '11px', display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '120px' }}>
                               {Object.entries(s.disk).map(([k,v]) => <span key={k} style={{background:'var(--surface)', padding:'2px 4px', border:'1px solid var(--line-2)', borderRadius:'4px'}}>{k}:{v}</span>)}
                            </div>
                         ) : '-'}
                      </td>
                      <td style={{ padding: '0.5rem', fontSize: '13px' }}>
                        {s.diverifikasi_pada ? new Date(s.diverifikasi_pada).toLocaleString('id-ID') : new Date(s.created_at).toLocaleString('id-ID')}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
                          background: s.status === 'terverifikasi' ? 'var(--patina)' : (s.status === 'gagal_dinilai' ? 'var(--alert)' : 'var(--line-2)'),
                          color: s.status === 'terverifikasi' ? 'var(--ground)' : (s.status === 'gagal_dinilai' ? 'var(--ground)' : 'var(--ink)')
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <button className="cd-btn-ghost" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => nav(\`/hasil/\${s.id}\`)}>Lihat</button>
                        {s.status !== 'terverifikasi' && s.status !== 'gagal_dinilai' && (
                           <button className="cd-btn-ghost" style={{ padding: '4px 8px', fontSize: '12px', marginTop: '4px' }} onClick={async () => { await verifikasiSesi(s); }} disabled={verifying}>
                             Nilai
                           </button>
                        )}
                        {(s.status === 'terverifikasi' || s.status === 'gagal_dinilai') && (
                           <button className="cd-btn-ghost" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={async () => { await verifikasiSesi(s); }} disabled={verifying}>
                             Nilai Ulang
                           </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ), [terverifikasi, filterCuriga, verifying, nav])}
      <div className="cd-block">
`
);

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);
console.log("Patched successfully");

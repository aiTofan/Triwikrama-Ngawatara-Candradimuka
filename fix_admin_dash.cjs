const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

// 1. Update loadTerverifikasi query to include gagal_dinilai
code = code.replace(
    'where("status", "==", "terverifikasi")',
    'where("status", "in", ["terverifikasi", "gagal_dinilai"])'
);

// 2. Update verifikasiSesi and verifikasiSemua logic
code = code.replace(
    /const hasil = await hitungSkorSesi\(s\);\s*const payload = {/g,
    `const hasil = await hitungSkorSesi(s);
       const payload = {
           gagal_dinilai: hasil.gagal_dinilai,
           gagal_count: hasil.gagal_count,`
);

code = code.replace(
    /status: 'terverifikasi',/g,
    `status: hasil.gagal_dinilai ? 'gagal_dinilai' : 'terverifikasi',`
);


// 3. Add handleSamakanOpsiId
if (!code.includes('handleSamakanOpsiId')) {
    const insertSync = code.indexOf('const handleSync = async () => {');
    code = code.slice(0, insertSync) + `
  const handleSamakanOpsiId = async () => {
    setSyncing(true);
    setMessage("Sedang menyamakan opsi_id dari publik ke bank_soal...");
    try {
      const res = await soalService.samakanOpsiId();
      setMessage(\`Berhasil menyamakan opsi_id pada \${res} soal.\`);
    } catch (err) {
      setMessage("Gagal menyamakan opsi_id: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

` + code.slice(insertSync);
}

// 4. Add the button in UI next to handleSync
code = code.replace(
    '<button className="cd-btn-ghost" onClick={handleSync} disabled={syncing}>',
    `<button className="cd-btn-ghost" onClick={handleSamakanOpsiId} disabled={syncing} style={{ marginRight: '1rem' }}>
               {syncing ? "Menyinkronkan..." : "Samakan opsi_id Bank Soal"}
             </button>
             <button className="cd-btn-ghost" onClick={handleSync} disabled={syncing}>`
);


// 5. Update Sesi Terverifikasi UI to show warning and Nilai Ulang button
code = code.replace(
    /<th style={{ padding: '0.5rem' }}>Tanggal Verifikasi<\/th>[\s\S]*?<\/tr>/,
    `<th style={{ padding: '0.5rem' }}>Tanggal Verifikasi</th>
                   <th style={{ padding: '0.5rem' }}>Aksi</th>
                 </tr>`
);

code = code.replace(
    /<td style={{ padding: '0.5rem', fontSize: '13px' }}>{s.diverifikasi_pada \? new Date\(s.diverifikasi_pada\).toLocaleString\(\) : '-'}<\/td>[\s\S]*?<\/tr>/g,
    `<td style={{ padding: '0.5rem', fontSize: '13px' }}>{s.diverifikasi_pada ? new Date(s.diverifikasi_pada).toLocaleString() : '-'}</td>
                     <td style={{ padding: '0.5rem' }}>
                        {s.status === 'gagal_dinilai' && (
                           <>
                              <span style={{ color: 'var(--alert)', fontSize: '12px', display: 'block' }}>⚠️ Gagal dicocokkan ({s.gagal_count || 0})</span>
                              <button className="cd-btn-ghost" style={{ padding: '4px 8px', fontSize: '12px', marginTop: '4px' }} onClick={async () => { await verifikasiSesi(s); await loadTerverifikasi(); }} disabled={verifying}>
                                 Nilai Ulang
                              </button>
                           </>
                        )}
                        {s.status !== 'gagal_dinilai' && s.skor === 0 && (
                           <button className="cd-btn-ghost" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={async () => { await verifikasiSesi(s); await loadTerverifikasi(); }} disabled={verifying}>
                              Nilai Ulang
                           </button>
                        )}
                     </td>
                   </tr>`
);

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);

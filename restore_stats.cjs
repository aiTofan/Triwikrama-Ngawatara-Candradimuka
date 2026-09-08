const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

const statsBlock = `{stats && (
        <div className="cd-block" style={{ marginBottom: '2rem' }}>
          <h2 className="cd-h2" style={{ fontSize: 24 }}>Ringkasan Bank Soal</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {Object.values(TINGKAT).map(t => {
              const s = stats[t] || { inti: 0, pemeriksa: 0, total: 0 };
              const quota = CONFIG.QUOTAS[t] || 0;
              return (
                <div key={t} style={{ padding: '1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--ink)' }}>{t}</h3>
                  <p className="cd-muted" style={{ margin: 0 }}>Inti: {s.inti}</p>
                  <p className="cd-muted" style={{ margin: 0, color: s.pemeriksa > 0 ? 'var(--ink)' : 'var(--alert)' }}>Pemeriksa: {s.pemeriksa}</p>
                  <p style={{ marginTop: '0.5rem', fontWeight: 500, color: s.total >= quota ? 'var(--patina)' : 'var(--alert)' }}>
                    Total: {s.total} / {quota} (Kuota)
                  </p>
                  {s.pemeriksa === 0 && (
                    <p style={{ color: 'var(--alert)', fontSize: '12px', marginTop: '0.5rem', fontWeight: 500 }}>
                      Mandala ini belum punya soal pemeriksa, penalti -20 tidak aktif.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '1rem' }}>
             <button className="cd-btn-ghost" onClick={handleSamakanOpsiId} disabled={syncing} style={{ marginRight: '1rem' }}>
               {syncing ? "Menyinkronkan..." : "Samakan opsi_id Bank Soal"}
             </button>
             <button className="cd-btn-ghost" onClick={handleSync} disabled={syncing}>
               {syncing ? "Menyinkronkan..." : "Sinkronkan Ulang Soal Publik"}
             </button>
             <p className="cd-faint" style={{ marginTop: '0.5rem', fontSize: '12px' }}>
               Aman diulang. Menurunkan ulang seluruh isi bank_soal menjadi soal_publik dengan id yang sama, opsi_id dienkripsi.
             </p>
          </div>
        </div>
      )}
`;

code = code.replace(/{stats && \(\s*\{notifMsg && \(/, statsBlock + '\n      {notifMsg && (');

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

// 1. Remove menunggu state and loadMenunggu function
code = code.replace(/const \[menunggu, setMenunggu\] = useState\(\[\]\);\n/, '');
code = code.replace(/const loadMenunggu = async \(\) => \{[\s\S]*?\};\n/, '');

// 2. Change loadTerverifikasi query
code = code.replace(
    'where("status", "in", ["terverifikasi", "gagal_dinilai"])',
    'where("status", "in", ["selesai", "terverifikasi", "gagal_dinilai"])'
);

// 3. Remove await loadMenunggu()
code = code.replace(/await loadMenunggu\(\);\s*/g, '');
code = code.replace(/loadMenunggu\(\);\s*/g, '');

// 4. Update UI labels
code = code.replace(
    '<h2 className="cd-h2" style={{ fontSize: 24, marginBottom: \'1rem\' }}>Sesi Terverifikasi ({terverifikasi.length})</h2>',
    '<h2 className="cd-h2" style={{ fontSize: 24, marginBottom: \'1rem\' }}>Semua Sesi Selesai ({terverifikasi.length})</h2>'
);
code = code.replace(
    '<p className="cd-muted">Belum ada sesi yang diverifikasi.</p>',
    '<p className="cd-muted">Belum ada sesi selesai.</p>'
);

// 5. Replace window.alert with notif state
if (!code.includes('const [notifMsg, setNotifMsg] = useState("");')) {
    code = code.replace(
        'const [terverifikasi, setTerverifikasi] = useState([]);',
        'const [terverifikasi, setTerverifikasi] = useState([]);\n  const [notifMsg, setNotifMsg] = useState("");'
    );
}

// Update alerts to setNotifMsg
code = code.replace(/alert\(\`Berhasil memproses sesi \$\{s\.nama_peserta\}\.\`\);/g, 'setNotifMsg(`Berhasil memproses sesi ${s.nama_peserta}.`);');
code = code.replace(/alert\("Gagal verifikasi " \+ s\.id \+ ": " \+ e\.message\);/g, 'setNotifMsg("Gagal verifikasi " + s.id + ": " + e.message);');
code = code.replace(/alert\(notif\);/g, 'setNotifMsg(notif);');

// Remove the Menunggu Verifikasi UI entirely
const rx = /<div className="cd-block" style=\{\{ marginBottom: '2rem' \}\}>[\s\S]*?Sesi Menunggu Verifikasi[\s\S]*?<\/div>\s*(<div className="cd-block" style=\{\{ marginBottom: '2rem' \}\}>\s*<h2 className="cd-h2" style=\{\{ fontSize: 24, marginBottom: '1rem' \}\}>Semua Sesi Selesai)/;
code = code.replace(rx, '$1');

// Add the notification banner
const banner = `
      {notifMsg && (
        <div className="cd-block" style={{ marginBottom: '2rem', background: 'var(--surface)', borderLeft: '4px solid var(--patina)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '14px', fontFamily: 'inherit' }}>{notifMsg}</pre>
              <button className="cd-btn-ghost" onClick={() => setNotifMsg("")}>Tutup</button>
           </div>
        </div>
      )}
`;
code = code.replace(/<div className="cd-block" style=\{\{ marginBottom: '2rem' \}\}>\s*<h2 className="cd-h2" style=\{\{ fontSize: 24, marginBottom: '1rem' \}\}>Semua Sesi Selesai/, banner + '\n      <div className="cd-block" style={{ marginBottom: \'2rem\' }}>\n        <h2 className="cd-h2" style={{ fontSize: 24, marginBottom: \'1rem\' }}>Semua Sesi Selesai');

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);

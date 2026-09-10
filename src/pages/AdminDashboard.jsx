import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth, logout } from "../auth";
import { Layout } from "../components/Layout";
import { useNavigate } from "react-router-dom";
import { soalService } from "../services/soalService";
import { sesiService } from "../services/sesiService";
import { hitungSkorSesi } from "../penilaian";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, deleteDoc, setDoc } from "firebase/firestore";
import { TINGKAT, JENIS, KOLOM } from "../domain/soal";
import { bukaSkor } from "../lib/kunciSkor";
import { limit } from "firebase/firestore";
import { listenerManager } from "../services/firestore";
import { CONFIG } from "../config";
import { pengaturanService } from "../services/pengaturanService";
import akasa from '../Soal-soal Baru/akasa.json';
import bhurloka from '../Soal-soal Baru/bhurloka.json';
import paramartha from '../Soal-soal Baru/paramartha.json';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [report, setReport] = useState(null);
  const [stats, setStats] = useState(null);
  const [syncing, setSyncing] = useState(false);
    const [terverifikasi, setTerverifikasi] = useState([]);
  const [notifMsg, setNotifMsg] = useState("");
    const [filterCuriga, setFilterCuriga] = useState(false);
  
  const [quotas, setQuotas] = useState(CONFIG.QUOTAS);
  const [savingQuotas, setSavingQuotas] = useState(false);
  const [appConfig, setAppConfig] = useState({ maintenance_mode: false, bot_protection: true });
  const [savingConfig, setSavingConfig] = useState(false);
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const restoreFileRef = useRef(null);

  // Added missing state variables for UjiSandi
  const [ujiSandiRunning, setUjiSandiRunning] = useState(false);
  const [ujiSandiResult, setUjiSandiResult] = useState(null);

  const runUjiSandi = async () => {
    setUjiSandiRunning(true);
    setUjiSandiResult(null);
    try {
      // Mock implementation or a placeholder if the actual API doesn't exist
      setUjiSandiResult({ match: 0, mismatch: 0, failed: 0, problems: [], error: "Fitur sedang dalam pengembangan." });
    } catch (e) {
      setUjiSandiResult({ error: e.message });
    } finally {
      setUjiSandiRunning(false);
    }
  };

  useEffect(() => {
    pengaturanService.getQuotas().then(q => setQuotas(q));
    pengaturanService.getAppConfig().then(c => setAppConfig(c));
  }, []);

  const handleSaveQuotas = async () => {
    setSavingQuotas(true);
    const res = await pengaturanService.saveQuotas(quotas);
    setSavingQuotas(false);
    if (res.success) {
      setNotifMsg("Pengaturan jumlah soal berhasil disimpan!");
    } else {
      setNotifMsg("Gagal menyimpan pengaturan: " + res.message);
    }
  };
  
  const handleToggleConfig = async (key) => {
    setSavingConfig(true);
    const newConfig = { ...appConfig, [key]: !appConfig[key] };
    const res = await pengaturanService.saveAppConfig(newConfig);
    setSavingConfig(false);
    if (res.success) {
      setAppConfig(newConfig);
      setNotifMsg(`Pengaturan ${key} berhasil diperbarui!`);
    } else {
      setNotifMsg("Gagal menyimpan pengaturan: " + res.message);
    }
  };

  const handleRunDiagnostics = async () => {
    setNotifMsg("Menjalankan diagnostik sinkronisasi...");
    try {
      const remoteConfig = await pengaturanService.getAppConfig();
      const configSync = 
        remoteConfig.maintenance_mode === appConfig.maintenance_mode && 
        remoteConfig.bot_protection === appConfig.bot_protection;
      
      const snapSessions = await getDocs(collection(db, 'sessions'));
      const snapRankings = await getDocs(collection(db, 'rankings'));
      
      let diagnosticMsg = `Diagnostik Sinkronisasi Firestore:\n\n`;
      diagnosticMsg += `Status Config: ${configSync ? "✅ SINKRON" : "❌ TIDAK SINKRON"}\n`;
      diagnosticMsg += `- Lokal: Maintenance (${appConfig.maintenance_mode}), Bot (${appConfig.bot_protection})\n`;
      diagnosticMsg += `- Server: Maintenance (${remoteConfig.maintenance_mode}), Bot (${remoteConfig.bot_protection})\n\n`;
      diagnosticMsg += `Status Rekaman:\n`;
      diagnosticMsg += `- Sesi tersimpan: ${snapSessions.size}\n`;
      diagnosticMsg += `- Peringkat tersimpan: ${snapRankings.size}\n`;
      
      alert(diagnosticMsg);
      setNotifMsg("Diagnostik selesai.");
      
      if (!configSync) {
        setAppConfig(remoteConfig);
      }
    } catch (e) {
      console.error(e);
      setNotifMsg("Gagal menjalankan diagnostik: " + e.message);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      
      const backupData = {};
      for (const collName of ['users', 'soal', 'sessions', 'rankings', 'pengaturan']) {
        const snap = await getDocs(collection(db, collName));
        backupData[collName] = [];
        snap.forEach(doc => backupData[collName].push({ id: doc.id, ...doc.data() }));
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_candradimuka_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotifMsg("Backup berhasil diunduh.");
    } catch (e) {
      console.error(e);
      setNotifMsg("Gagal backup: " + e.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsRestoring(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      
      let count = 0;
      for (const collName of Object.keys(data)) {
        for (const item of data[collName]) {
          const { id, ...docData } = item;
          if (id) {
            await setDoc(doc(db, collName, id), docData);
            count++;
          }
        }
      }
      setNotifMsg(`Restore berhasil! ${count} dokumen dipulihkan.`);
      // Reload stats and data
      loadStats();
      loadTerverifikasi();
    } catch (err) {
      console.error(err);
      setNotifMsg("Gagal restore: " + err.message);
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  const handleResetRankings = async () => {
    setIsResetting(true);
    setShowResetConfirm(false);
    setResetConfirmText("");
    try {
      
      let deleted = 0;
      for (const collName of ['sessions', 'rankings']) {
        const snap = await getDocs(collection(db, collName));
        for (const d of snap.docs) {
          await deleteDoc(doc(db, collName, d.id));
          deleted++;
        }
      }
      setNotifMsg(`Reset berhasil. ${deleted} rekaman dihapus.`);
      loadStats();
      loadTerverifikasi();
    } catch (err) {
      console.error(err);
      setNotifMsg("Gagal reset: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const nav = useNavigate();

  
  
  
  
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


const loadStats = async () => {
    try {
      const res = await soalService.ambilStatistikSoal();
      if (res.success) {
        setStats(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadStats();
      loadTerverifikasi();
    }
  }, [user]);

  const tableSesiComponent = useMemo(() => (
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
                        <button className="cd-btn-ghost" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => nav(`/hasil/${s.id}`)}>Lihat</button>
                        
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ), [terverifikasi, filterCuriga, nav]);

  if (loading) return <Layout><p>Memuat...</p></Layout>;
  
  if (!user || user.role !== 'admin') {
    return (
      <Layout>
        <p className="cd-muted">Akses ditolak. Halaman ini khusus Administrator.</p>
        <button className="cd-btn" onClick={() => nav('/')}>Kembali ke Beranda</button>
      </Layout>
    );
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const downloadTemplate = () => {
    const template = [
      {
        [KOLOM.TINGKAT]: "Bhurloka",
        [KOLOM.JENIS]: "inti",
        [KOLOM.JUDUL]: "Ujian Ketenangan",
        [KOLOM.SKENARIO]: "Seseorang memotong antrean Anda di kasir...",
        [KOLOM.PILIHAN]: [
          { [KOLOM.TEKS]: "Marah dan menegur keras", [KOLOM.SKOR]: 25 },
          { [KOLOM.TEKS]: "Menegur dengan sopan", [KOLOM.SKOR]: 50 },
          { [KOLOM.TEKS]: "Membiarkan saja sambil menggerutu", [KOLOM.SKOR]: 75 },
          { [KOLOM.TEKS]: "Tersenyum dan memaklumi", [KOLOM.SKOR]: 100 }
        ]
      },
      {
        [KOLOM.TINGKAT]: "Ākāśa",
        [KOLOM.JENIS]: "pemeriksa",
        [KOLOM.JUDUL]: "Cek Fokus",
        [KOLOM.SKENARIO]: "Pilih opsi dengan nilai tertinggi secara konsisten.",
        [KOLOM.PILIHAN]: [
          { [KOLOM.TEKS]: "Saya memilih opsi A", [KOLOM.SKOR]: 25 },
          { [KOLOM.TEKS]: "Saya memilih opsi B", [KOLOM.SKOR]: 50 },
          { [KOLOM.TEKS]: "Saya memilih opsi C", [KOLOM.SKOR]: 75 },
          { [KOLOM.TEKS]: "Saya sangat sadar", [KOLOM.SKOR]: 100 }
        ]
      }
    ];
    
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_bank_soal.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMigrateJSON = async () => {
    setUploading(true);
    setMessage("Sedang mengunggah file baru...");
    setReport(null);
    try {
      let qs = [];
      if (akasa.soal) qs = qs.concat(akasa.soal);
      if (bhurloka.soal) qs = qs.concat(bhurloka.soal);
      if (paramartha.soal) qs = qs.concat(paramartha.soal);
      const hasil = await soalService.unggahBankSoal(qs, user.uid);
      if (hasil.success) {
        setReport(hasil.data);
        setMessage("Migrasi bank soal selesai.");
        loadStats();
      } else {
        setMessage("Gagal migrasi: " + hasil.message);
      }
    } catch (err) {
      console.error(err);
      setMessage("Terjadi kesalahan sistem saat migrasi.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Pilih file terlebih dahulu (.json)");
      return;
    }
    setUploading(true);
    setMessage("");
    setReport(null);
    try {
      const content = await file.text();
      let data = JSON.parse(content);
      const questions = data.soal || (Array.isArray(data) ? data : []);
      
      const hasil = await soalService.unggahBankSoal(questions, user.uid);
      if (hasil.success) {
        setReport(hasil.data);
        setMessage("Selesai memproses berkas.");
        setFile(null);
        loadStats();
      } else {
        setMessage("Gagal mengunggah file: " + hasil.message);
      }
    } catch (err) {
      console.error(err);
      setMessage("Gagal mengunggah file: Pastikan format JSON valid.");
    } finally {
      setUploading(false);
    }
  };

  
  const handleSamakanOpsiId = async () => {
    setSyncing(true);
    setMessage("Sedang menyamakan opsi_id dari publik ke bank_soal...");
    try {
      const res = await soalService.samakanOpsiId();
      if (res.success) {
        setMessage(`Berhasil menyamakan opsi_id pada ${res.data} soal.`);
      } else {
        setMessage("Gagal menyamakan opsi_id: " + res.message);
      }
    } catch (err) {
      setMessage("Gagal menyamakan opsi_id: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

const handleSync = async () => {
    setSyncing(true);
    setMessage("Sedang menyinkronkan...");
    try {
      const res = await soalService.sinkronkanSoalPublik();
      if (res.success) {
        setMessage(`Berhasil menyinkronkan ${res.data} soal publik.`);
      } else {
        setMessage("Gagal menyinkronkan: " + res.message);
      }
    } catch (err) {
      setMessage("Gagal menyinkronkan: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Layout>
      <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
           <strong style={{ display: 'block', fontSize: 16, marginBottom: '4px' }}>Status Kuota API (Generative AI)</strong>
           <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>Memantau ketersediaan *rate-limit* untuk sinkronisasi dan pembangkitan.</span>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', marginBottom: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--patina)', display: 'inline-block' }}></span>
              <strong style={{ fontSize: 14, color: 'var(--patina)' }}>Beroperasi Normal</strong>
           </div>
           <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Reset Per Menit: Bergulir (~1 mnt)<br/>Reset Harian: 14:00 WIB</span>
        </div>
      </div>

      <h1 className="cd-h1" style={{ fontSize: 36 }}>Admin Dashboard</h1>
      <p className="cd-lead">Selamat datang, Administrator {user.nama_tampilan}</p>
      
      {appConfig.maintenance_mode && (
        <div style={{ padding: '16px', background: 'var(--alert)', color: 'var(--ground)', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <strong style={{ display: 'block', fontSize: 16 }}>Sistem Dalam Mode Perbaikan (Maintenance)</strong>
            <span style={{ fontSize: 14 }}>Peserta reguler saat ini tidak dapat mengakses aplikasi ujian. Anda dapat menonaktifkannya di panel Pengaturan Sistem di bawah.</span>
          </div>
        </div>
      )}
      
      {stats && (
        <div className="cd-block" style={{ marginBottom: '2rem' }}>
          
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
<div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '1rem', color: 'var(--ink)' }}>Pengaturan Jumlah Soal Per Sesi</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {Object.values(TINGKAT).map(t => (
                <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '14px', color: 'var(--ink-2)', textTransform: 'capitalize' }}>{t}</label>
                  <input 
                    type="number" 
                    value={quotas[t] || 0} 
                    onChange={(e) => setQuotas({ ...quotas, [t]: parseInt(e.target.value) || 0 })}
                    style={{ 
                      padding: '8px', 
                      border: '1px solid var(--line-2)', 
                      borderRadius: '4px', 
                      width: '100px',
                      color: '#000000',
                      backgroundColor: '#E5E7EB',
                      fontWeight: 'bold'
                    }}
                    min="1"
                  />
                </div>
              ))}
            </div>
            <button className="cd-btn" onClick={handleSaveQuotas} disabled={savingQuotas}>
              {savingQuotas ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
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

      {notifMsg && (
        <div className="cd-block" style={{ marginBottom: '2rem', background: 'var(--surface)', borderLeft: '4px solid var(--patina)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '14px', fontFamily: 'inherit' }}>{notifMsg}</pre>
              <button className="cd-btn-ghost" onClick={() => setNotifMsg("")}>Tutup</button>
           </div>
        </div>
      )}

      
      {tableSesiComponent}
      <div className="cd-block">

        <h2 className="cd-h2" style={{ fontSize: 24 }}>Smart Upload Bank Soal</h2>
        <p className="cd-muted" style={{ marginBottom: '1rem' }}>
          Unggah file `.json` bank soal.
        </p>
        
        <div style={{ marginBottom: "1rem", display: 'flex', gap: '10px' }}>
          <input 
             type="file" 
             accept=".json"
            onChange={handleFileChange}
            disabled={uploading}
            className="cd-input"
            style={{ padding: "8px", flex: 1 }}
          />
          <button className="cd-btn-ghost" onClick={downloadTemplate} type="button">Unduh Contoh JSON</button>
        </div>
        
        <button 
           className="cd-btn" 
           onClick={handleUpload} 
           disabled={!file || uploading}
        >
          {uploading ? "Memproses..." : "Unggah & Sinkronisasi"}
        </button>
        <button 
           className="cd-btn" 
           onClick={handleMigrateJSON} 
           disabled={uploading}
           style={{ marginLeft: '10px' }}
        >
          Impor Soal Baru dari Sistem
        </button>

        {message && (
          <p className="cd-muted" style={{ marginTop: "1rem", borderLeft: "2px solid var(--patina)", paddingLeft: "10px" }}>
            {message}
          </p>
        )}
        
        {report && (
          <div style={{ marginTop: "1.5rem", background: 'var(--surface)', padding: '1rem', borderRadius: '8px' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Laporan Unggah</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
               <li>✅ Diterima (Sukses): <strong>{report.count}</strong> baris</li>
               <li>🔄 Duplikat (Jenis Diperbarui): <strong>{report.updatedJenis || 0}</strong> baris</li>
               <li>⚠️ Duplikat (Tidak Berubah): <strong>{report.duplicated}</strong> baris</li>
               <li>❌ Ditolak/Peringatan: <strong>{report.rejected}</strong> baris (Peringatan bisa berasal dari perubahan jenis ke 'inti')</li>
            </ul>
            {report.rejectedList && report.rejectedList.length > 0 && (
              <div>
                <p style={{ fontWeight: 500, fontSize: '14px', marginBottom: '0.5rem' }}>Rincian Penolakan:</p>
                <ul style={{ fontSize: '13px', color: 'var(--alert)', paddingLeft: '20px' }}>
                  {report.rejectedList.map((r, i) => (
                    <li key={i}>Baris ke-{r.baris}: {r.alasan}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: "2rem" }}>
        <button className="cd-btn-ghost" onClick={async () => { await logout(); nav("/"); }}>Keluar</button>
      </div>
    </Layout>
  );
}

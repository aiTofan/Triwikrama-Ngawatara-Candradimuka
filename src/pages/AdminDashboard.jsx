import { useState, useEffect } from "react";
import { useAuth, logout } from "../auth";
import { Layout } from "../components/Layout";
import { useNavigate } from "react-router-dom";
import { soalService } from "../services/soalService";
import { sesiService } from "../services/sesiService";
import { hitungSkorSesi } from "../penilaian";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { TINGKAT, JENIS, KOLOM } from "../domain/soal";
import { CONFIG } from "../config";

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
  const [verifying, setVerifying] = useState(false);
  const nav = useNavigate();

  
  
  
  const loadTerverifikasi = async () => {
    try {
      const q = query(collection(db, "sessions"), where("status", "in", ["selesai", "terverifikasi", "gagal_dinilai"]));
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
const verifikasiSesiCore = async (s) => {
       const hasil = await hitungSkorSesi(s);
       const payload = {
           gagal_dinilai: hasil.gagal_dinilai,
           gagal_count: hasil.gagal_count,
           skor: hasil.skor,
           skor_mentah: hasil.skor_mentah,
           disk: hasil.disk,
           penalti_deviasi: hasil.penalti_deviasi,
           penalti_jebakan: hasil.penalti_jebakan,
           status: hasil.gagal_dinilai ? 'gagal_dinilai' : 'terverifikasi',
           diverifikasi_pada: new Date().toISOString()
       };
       const res = await sesiService.updateSesi(s.id, payload);
       if (!res.success) throw new Error(res.message || "Gagal mengupdate database");
       return hasil;
  };

  const verifikasiSesi = async (s) => {
    setVerifying(true);
    try {
       await verifikasiSesiCore(s);
       setNotifMsg(`Berhasil memproses sesi ${s.nama_peserta}.`);
    } catch(e) {
       console.error("Error verifikasi", s.id, e);
       setNotifMsg("Gagal verifikasi " + s.id + ": " + e.message);
    } finally {
       setVerifying(false);
    }
  };

  const verifikasiSemua = async () => {
     setVerifying(true);
     let berhasil = 0;
     let gagal = 0;
     let pesanError = [];
     
     for (const s of menunggu) {
        try {
           await verifikasiSesiCore(s);
           berhasil++;
        } catch(e) {
           console.error("Error verifikasi", s.id, e);
           gagal++;
           pesanError.push(`${s.nama_peserta}: ${e.message}`);
        }
     }
     
     await loadTerverifikasi();
     setVerifying(false);
     
     let notif = `Selesai memproses.\nBerhasil: ${berhasil}\nGagal: ${gagal}`;
     if (pesanError.length > 0) {
         notif += `\n\nRincian Gagal:\n` + pesanError.join('\n');
     }
     setNotifMsg(notif);
  };
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
      <h1 className="cd-h1" style={{ fontSize: 36 }}>Admin Dashboard</h1>
      <p className="cd-lead">Selamat datang, Administrator {user.nama_tampilan}</p>
      
      {stats && (
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

      {notifMsg && (
        <div className="cd-block" style={{ marginBottom: '2rem', background: 'var(--surface)', borderLeft: '4px solid var(--patina)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '14px', fontFamily: 'inherit' }}>{notifMsg}</pre>
              <button className="cd-btn-ghost" onClick={() => setNotifMsg("")}>Tutup</button>
           </div>
        </div>
      )}

      <div className="cd-block" style={{ marginBottom: '2rem' }}>
        <h2 className="cd-h2" style={{ fontSize: 24, marginBottom: '1rem' }}>Semua Sesi Selesai ({terverifikasi.length})</h2>
        {terverifikasi.length === 0 ? (
           <p className="cd-muted">Belum ada sesi selesai.</p>
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
                   <th style={{ padding: '0.5rem' }}>Aksi</th>
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
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        )}
      </div>
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
               <li>⚠️ Duplikat (Diabaikan): <strong>{report.duplicated}</strong> baris</li>
               <li>❌ Ditolak (Galat): <strong>{report.rejected}</strong> baris</li>
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

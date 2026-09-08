import { useState } from "react";
import { useAuth, logout } from "../auth";
import { Layout } from "../components/Layout";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, doc, writeBatch } from "firebase/firestore";

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const nav = useNavigate();

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

  const handleUpload = async () => {
    if (!file) {
      setMessage("Pilih file terlebih dahulu (.json)");
      return;
    }
    setUploading(true);
    setMessage("");

    try {
      const content = await file.text();
      let data = JSON.parse(content);
      const questions = data.soal || (Array.isArray(data) ? data : []);
      
      let count = 0;
      let batch = writeBatch(db);
      
      for (const q of questions) {
        if (!q.tingkat) continue;
        
        // Hash content for deduplication
        const hash = await sha256(JSON.stringify(q));
        const docRef = doc(db, 'bank_soal', hash);
        
        batch.set(docRef, {
          ...q,
          created_at: new Date().toISOString(),
          updated_by: user.uid
        });
        
        count++;
        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      
      if (count % 400 !== 0) {
        await batch.commit();
      }
      
      setMessage(`Berhasil mengunggah ${count} soal ke database.`);
      setFile(null);
    } catch (err) {
      console.error(err);
      setMessage("Gagal mengunggah file: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <h1 className="cd-h1" style={{ fontSize: 36 }}>Admin Dashboard</h1>
      <p className="cd-lead">Selamat datang, Administrator {user.nama_tampilan}</p>

      <div className="cd-block">
        <h2 className="cd-h2" style={{ fontSize: 24 }}>Smart Upload Bank Soal</h2>
        <p className="cd-muted" style={{ marginBottom: '1rem' }}>
          Unggah file `.json` bank soal. Sistem akan otomatis memvalidasi struktur skor, mengeleminasi duplikat menggunakan *Hash Fingerprint*, dan mengelompokkan ke Mandala yang tepat (Bhurloka, Ākāśa, Paramārtha).
        </p>
        
        <div style={{ marginBottom: "1rem" }}>
          <input 
            type="file" 
            accept=".json"
            onChange={handleFileChange}
            disabled={uploading}
            className="cd-input"
            style={{ padding: "8px" }}
          />
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
      </div>

      <div style={{ marginTop: "2rem" }}>
        <button className="cd-btn-ghost" onClick={async () => { await logout(); nav("/"); }}>Keluar</button>
      </div>
    </Layout>
  );
}

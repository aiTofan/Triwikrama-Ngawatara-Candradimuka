import { useState, useEffect } from "react";
import { useAuth, logout } from "../auth";
import { Layout } from "../components/Layout";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, loading, setUser } = useAuth();
  const [namaTampilan, setNamaTampilan] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    if (user && user.uid) {
      getDoc(doc(db, "users", user.uid)).then(d => {
        if (d.exists()) {
          setNamaTampilan(d.data().nama_tampilan || user.nama_tampilan || "");
          setAvatarUrl(d.data().avatar_url || user.avatar_url || "");
        }
      });
    }
  }, [user]);

  if (loading) return <Layout><p>Memuat...</p></Layout>;
  
  if (!user) {
    return (
      <Layout>
        <p className="cd-muted">Silakan masuk (login) untuk melihat profil.</p>
        <button className="cd-btn" onClick={() => nav('/')}>Kembali</button>
      </Layout>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await updateDoc(doc(db, "users", user.uid), {
        nama_tampilan: namaTampilan,
        avatar_url: avatarUrl
      });
      setUser(prev => ({ ...prev, nama_tampilan: namaTampilan, avatar_url: avatarUrl }));
      setMessage("Profil berhasil diperbarui.");
    } catch (err) {
      console.error(err);
      setMessage("Gagal memperbarui profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <h1 className="cd-h1" style={{ fontSize: 36 }}>Profil Peserta</h1>

      <div className="cd-block">
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--patina)' }} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 24, color: 'var(--ground)' }}>?</span>
            </div>
          )}
          <div>
            <p style={{ margin: 0, fontWeight: 'bold' }}>{user.email}</p>
            <p className="cd-muted" style={{ margin: 0, fontSize: 14 }}>Peran: {user.role === 'admin' ? 'Administrator' : 'Peserta'}</p>
          </div>
        </div>

        <div className="cd-field">
          <label>Nama Tampilan</label>
          <input 
            type="text" 
            className="cd-input" 
            value={namaTampilan} 
            onChange={(e) => setNamaTampilan(e.target.value)} 
          />
        </div>

        <div className="cd-field">
          <label>Tautan URL Avatar (Opsional)</label>
          <input 
            type="url" 
            className="cd-input" 
            value={avatarUrl} 
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/foto.jpg"
          />
        </div>

        <button className="cd-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Profil"}
        </button>

        {message && <p className="cd-muted" style={{ marginTop: 12 }}>{message}</p>}
      </div>

        <div style={{ display: 'flex', gap: 12, marginTop: '2rem' }}>
          <button className="cd-btn-ghost" onClick={() => nav("/")}>Kembali ke Beranda</button>
        </div>
    </Layout>
  );
}

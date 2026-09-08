import { useState, useEffect } from "react";
import { useAuth, logout } from "../auth";
import { Layout } from "../components/Layout";
import { penggunaService } from "../services/penggunaService";
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
      penggunaService.ambilProfil(user.uid).then(res => {
        if (res.success && res.data) {
          setNamaTampilan(res.data.nama_tampilan || user.nama_tampilan || "");
          setAvatarUrl(res.data.avatar_url || user.avatar_url || "");
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
      const res = await penggunaService.updateProfil(user.uid, {
        nama_tampilan: namaTampilan,
        avatar_url: avatarUrl
      });
      if (res.success) {
        setUser(prev => ({ ...prev, nama_tampilan: namaTampilan, avatar_url: avatarUrl }));
        setMessage("Profil berhasil diperbarui.");
      } else {
        setMessage("Gagal memperbarui profil: " + res.message);
      }
    } catch (err) {
      console.error(err);
      setMessage("Gagal memperbarui profil: " + err.message);
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
          <button className="cd-btn-ghost" onClick={async () => {
            const { logoutAndClear } = await import("../auth");
            await logoutAndClear();
          }} style={{ color: 'var(--alert)' }}>Keluar</button>
        </div>
    </Layout>
  );
}

import { useState, useEffect, useRef } from "react";
import { useAuth, logout, startLogin, logoutAndClear } from "../auth";
import { Layout } from "../components/Layout";
import { Loader } from "../components/Loader";
import { penggunaService } from "../services/penggunaService";
import { papanService } from "../services/papanService";
import { useNavigate } from "react-router-dom";
import { Camera, TrendingUp, TrendingDown, Minus } from "lucide-react";

const CameraModal = ({ onClose, onCapture }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    let stream = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(s => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error("Camera access error:", err);
        alert("Gagal mengakses kamera. Pastikan perangkat memiliki kamera dan izin telah diberikan.");
        onClose();
      });
      
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [onClose]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    
    // Crop to square and scale down to 400x400 max
    const minSize = Math.min(video.videoWidth, video.videoHeight);
    const targetSize = Math.min(minSize, 400); 
    canvas.width = targetSize;
    canvas.height = targetSize;
    
    const ctx = canvas.getContext("2d");
    const startX = (video.videoWidth - minSize) / 2;
    const startY = (video.videoHeight - minSize) / 2;
    
    ctx.drawImage(video, startX, startY, minSize, minSize, 0, 0, targetSize, targetSize);
    
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    onCapture(dataUrl);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '400px', aspectRatio: '1/1', background: '#000', borderRadius: '16px', overflow: 'hidden' }}>
        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ marginTop: '30px', display: 'flex', gap: '16px' }}>
        <button onClick={onClose} className="cd-btn-ghost" style={{ background: 'var(--ground)', color: 'var(--ink)' }}>Batal</button>
        <button onClick={capture} className="cd-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={18} />
          Jepret Foto
        </button>
      </div>
    </div>
  );
};

export default function Profile() {
  const { user, loading, setUser } = useAuth();
  const [namaTampilan, setNamaTampilan] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [trends, setTrends] = useState([]);
  const fileInputRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    if (user && user.uid) {
      penggunaService.ambilProfil(user.uid).then(res => {
        if (res.success && res.data) {
          setNamaTampilan(res.data.nama_tampilan || user.nama_tampilan || "");
          setAvatarUrl(res.data.avatar_url || user.avatar_url || "");
        }
      });
      
      const fetchTrends = async () => {
        const tiers = [
          { key: 'bhurloka', name: 'Bhurloka' },
          { key: 'akasa', name: 'Ākāśa' },
          { key: 'paramartha', name: 'Paramārtha' }
        ];
        
        const trendResults = [];
        for (const tier of tiers) {
          const res = await papanService.ambilPapanTingkat(tier.key, user.uid, 'skor');
          if (res && res.my_rank) {
            trendResults.push({
              tier: tier.name,
              ...res.my_rank
            });
          }
        }
        setTrends(trendResults);
      };
      
      fetchTrends();
    }
  }, [user]);

  if (loading) return <Layout><Loader /></Layout>;
  
  if (!user || user.isAnonymous) {
    return (
      <Layout>
        <div style={{ marginTop: 60, textAlign: 'center' }}>
          <h2 className="cd-h2" style={{ marginBottom: 12 }}>Profil Akun</h2>
          <p className="cd-muted" style={{ marginBottom: 24 }}>Kamu sedang menggunakan mode tamu. Silakan masuk (login) dengan akun Google untuk melihat dan mengatur profilmu.</p>
          <button className="cd-btn" onClick={() => startLogin()}>Masuk dengan Google</button>
        </div>
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarUrl(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Layout>
      {showCamera && (
        <CameraModal 
          onClose={() => setShowCamera(false)} 
          onCapture={(dataUrl) => {
            setAvatarUrl(dataUrl);
            setShowCamera(false);
          }} 
        />
      )}
      
      <h1 className="cd-h1" style={{ fontSize: 36 }}>Profil Peserta</h1>
      
      {trends.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {trends.map(t => {
            if (!t.trend || t.trend === 'new') return null;
            
            const isUp = t.trend === 'up';
            const isDown = t.trend === 'down';
            const isSame = t.trend === 'same';
            
            return (
              <div key={t.tier} style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
                background: isUp ? 'rgba(34, 197, 94, 0.05)' : isDown ? 'rgba(239, 68, 68, 0.05)' : 'var(--surface)',
                border: `1px solid ${isUp ? 'var(--patina)' : isDown ? 'var(--alert)' : 'var(--line-2)'}`,
                borderRadius: '12px'
              }}>
                {isUp && <TrendingUp style={{ color: 'var(--patina)' }} size={20} />}
                {isDown && <TrendingDown style={{ color: 'var(--alert)' }} size={20} />}
                {isSame && <Minus style={{ color: 'var(--ink-2)' }} size={20} />}
                
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>
                    Peringkat {t.tier} {isUp ? 'Naik' : isDown ? 'Turun' : 'Bertahan'}
                  </p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--ink-2)' }}>
                    {isUp && `Kerja bagus! Peringkatmu naik dari ${t.prev_rank} ke ${t.rank}.`}
                    {isDown && `Peringkatmu turun dari ${t.prev_rank} ke ${t.rank} setelah tes terakhir. Saatnya tingkatkan lagi!`}
                    {isSame && `Peringkatmu tetap di posisi ${t.rank}. Pertahankan atau raih lebih tinggi!`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="cd-block">
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" loading="lazy" decoding="async" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--patina)' }} />
            ) : (
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 24, color: 'var(--ground)' }}>?</span>
              </div>
            )}
            <button 
              onClick={() => setShowCamera(true)}
              style={{ position: 'absolute', bottom: -5, right: -5, background: 'var(--patina)', color: 'var(--ground)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
              title="Ambil Foto"
            >
              <Camera size={16} />
            </button>
          </div>
          
          <div style={{ flex: 1, minWidth: '200px' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>{user.email}</p>
            <p className="cd-muted" style={{ margin: '4px 0 12px 0', fontSize: 14 }}>Peran: {user.role === 'admin' ? 'Administrator' : 'Peserta'}</p>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="cd-btn-ghost" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setShowCamera(true)}>
                Kamera
              </button>
              <button className="cd-btn-ghost" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => fileInputRef.current?.click()}>
                Unggah
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
            </div>
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
          <label>Tautan URL Avatar</label>
          <input 
            type="text" 
            className="cd-input" 
            value={avatarUrl} 
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/foto.jpg (atau gunakan tombol kamera/unggah)"
          />
          <p className="cd-muted" style={{ fontSize: '12px', marginTop: '6px' }}>
            Anda dapat menempelkan URL gambar, mengambil foto secara langsung, atau mengunggah fail gambar.
          </p>
        </div>

        <button className="cd-btn" onClick={handleSave} disabled={saving} style={{ marginTop: '8px' }}>
          {saving ? "Menyimpan..." : "Simpan Profil"}
        </button>
        {message && <p className="cd-muted" style={{ marginTop: 12 }}>{message}</p>}
      </div>
      
      <div style={{ display: 'flex', gap: 12, marginTop: '2rem' }}>
        <button className="cd-btn-ghost" onClick={() => nav("/")}>Kembali ke Beranda</button>
        <button className="cd-btn-ghost" onClick={() => logoutAndClear()} style={{ color: 'var(--alert)' }}>Keluar</button>
      </div>
    </Layout>
  );
}

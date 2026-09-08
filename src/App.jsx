import { useEffect, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Home from "@/pages/Home";
import Uji from "@/pages/Uji";
import Hasil from "@/pages/Hasil";
import Papan from "@/pages/Papan";
import Pelatihan from "@/pages/Pelatihan";
import Sertifikat from "@/pages/Sertifikat";
import Harga from "@/pages/Harga";
import Validasi from "@/pages/Validasi";
import AdminKode from "@/pages/AdminKode";
import AdminPesanan from "@/pages/AdminPesanan";
import { exchangeSession } from "@/auth";
import { Layout } from "@/components/Layout";

function AuthCallback() {
  const location = useLocation();
  const nav = useNavigate();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const m = location.hash.match(/session_id=([^&]+)/);
    const sid = m ? decodeURIComponent(m[1]) : null;
    (async () => {
      if (sid) { try { await exchangeSession(sid); } catch {} }
      nav(location.pathname, { replace: true });
    })();
  }, [location, nav]);
  return <Layout><p className="cd-muted">Menyimpan sesi…</p></Layout>;
}

function NotFound() {
  return (
    <Layout>
      <p className="cd-label">404</p>
      <h1 className="cd-h1" style={{ fontSize: 40 }}>Halaman tidak ditemukan</h1>
      <p className="cd-muted">Tautan yang kamu tuju tidak ada atau sudah dipindahkan.</p>
      <p style={{ marginTop: 12 }}><a href="/">Kembali ke Candradimuka</a></p>
    </Layout>
  );
}

import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/AdminDashboard";

function AppInner() {
  const location = useLocation();
  if (location.hash && location.hash.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/uji/:sesiId" element={<Uji />} />
      <Route path="/hasil/:sesiId" element={<Hasil />} />
      <Route path="/papan" element={<Papan />} />
      <Route path="/pelatihan" element={<Pelatihan />} />
      <Route path="/sertifikat/:sesiId" element={<Sertifikat />} />
      <Route path="/harga" element={<Harga />} />
      <Route path="/validasi" element={<Validasi />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/kode" element={<AdminKode />} />
      <Route path="/admin/pesanan" element={<AdminPesanan />} />
      <Route path="/profil" element={<Profile />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </div>
  );
}

export default App;

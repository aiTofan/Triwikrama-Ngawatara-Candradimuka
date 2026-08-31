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
import Periksa from "@/pages/Periksa";
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
      <Route path="/periksa" element={<Periksa />} />
      <Route path="/validasi" element={<Validasi />} />
      <Route path="/admin/kode" element={<AdminKode />} />
      <Route path="/admin/pesanan" element={<AdminPesanan />} />
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

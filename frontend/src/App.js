import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Uji from "@/pages/Uji";
import Hasil from "@/pages/Hasil";
import Papan from "@/pages/Papan";
import Pelatihan from "@/pages/Pelatihan";
import Sertifikat from "@/pages/Sertifikat";
import Harga from "@/pages/Harga";
import Periksa from "@/pages/Periksa";
import AdminKode from "@/pages/AdminKode";
import AdminPesanan from "@/pages/AdminPesanan";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/uji/:sesiId" element={<Uji />} />
          <Route path="/hasil/:sesiId" element={<Hasil />} />
          <Route path="/papan" element={<Papan />} />
          <Route path="/pelatihan" element={<Pelatihan />} />
          <Route path="/sertifikat/:sesiId" element={<Sertifikat />} />
          <Route path="/harga" element={<Harga />} />
          <Route path="/periksa" element={<Periksa />} />
          <Route path="/admin/kode" element={<AdminKode />} />
          <Route path="/admin/pesanan" element={<AdminPesanan />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

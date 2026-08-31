import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";

export default function Harga() {
  return (
    <Layout>
      <div className="cd-topbar">
        <Link to="/" className="cd-brand">Candradimuka</Link>
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Harga</span>
      </div>
      <h1 className="cd-h1" style={{ fontSize: 40 }}>Harga</h1>

      <div className="cd-block">
        <p className="cd-label">Pembacaan lengkap</p>
        <p className="cd-muted">Rp15.000, sekali bayar per hasil uji. Bisa dipotongkan dari bulan pertama
          pelatihan bila mendaftar dalam 30 hari.</p>
      </div>

      <div className="cd-block">
        <p className="cd-label">Pelatihan Candradimuka</p>
        <p className="cd-muted">Mandiri Rp15.000 per bulan. Kohor per orang per bulan: 5-9 orang Rp12.000,
          10-14 orang Rp10.000, 15-20 orang Rp9.000.</p>
      </div>

      <p className="cd-muted" style={{ marginTop: 18 }}>
        Pembayaran lewat transfer atau QRIS di luar aplikasi. Setelah pembayaran diterima kamu menerima kode akses.
      </p>
      <p style={{ marginTop: 14 }}>
        <a href="mailto:halo@candradimuka.id?subject=Minta%20kode%20akses" data-testid="minta-kode">Minta kode akses</a>
      </p>
    </Layout>
  );
}

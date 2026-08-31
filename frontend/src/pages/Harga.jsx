import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";

const PRICES = [
  ["Melanjutkan ke 120 soal berikutnya, termasuk pembacaan lengkap", "Rp17.000"],
  ["Pelatihan Candradimuka, sekali bayar untuk enam modul", "Rp90.000"],
  ["Sertifikat cetak bertanda tangan, di luar ongkos kirim", "Rp137.000"],
  ["Profil Kesadaran digital, bisa dicetak sendiri", "Rp36.000"],
];

export default function Harga() {
  return (
    <Layout>
      <div className="cd-topbar">
        <span />
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Harga</span>
      </div>
      <h1 className="cd-h1" style={{ fontSize: 40 }}>Harga</h1>

      {PRICES.map(([label, price]) => (
        <div className="cd-block" key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
          <p className="cd-muted" style={{ margin: 0 }}>{label}</p>
          <p className="mono" style={{ margin: 0, color: "var(--ink)", whiteSpace: "nowrap" }}>{price}</p>
        </div>
      ))}

      <p className="cd-faint" style={{ fontSize: 14, marginTop: 12 }} data-testid="harga-potongan">
        Rp17.000 dipotongkan dari biaya pelatihan bila kamu mendaftar dalam 30 hari.
      </p>

      <p className="cd-muted" style={{ marginTop: 18 }}>
        Pembayaran lewat transfer atau QRIS di luar aplikasi. Setelah pembayaran diterima kamu menerima kode akses.
      </p>
      <p style={{ marginTop: 14 }}>
        <a href="mailto:halo@candradimuka.id?subject=Minta%20kode%20akses" data-testid="minta-kode">Minta kode akses</a>
      </p>
    </Layout>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { api } from "../api";
import { fmtTanggal } from "../peserta";

const STATUSES = ["baru", "dibayar", "dicetak", "dikirim"];

export default function AdminPesanan() {
  const [sp] = useSearchParams();
  const kunci = sp.get("kunci") || "";
  const [data, setData] = useState(null);
  const [denied, setDenied] = useState(false);

  const load = () => {
    api.get(`/admin/pesanan?kunci=${encodeURIComponent(kunci)}`)
      .then((r) => setData(r.data.pesanan))
      .catch(() => setDenied(true));
  };
  useEffect(load, [kunci]);

  const ubah = async (id, status) => {
    await api.patch(`/admin/pesanan/${id}/status?kunci=${encodeURIComponent(kunci)}`, { status });
    load();
  };

  if (denied) return <Layout><p data-testid="admin-denied">Kunci tidak sesuai.</p></Layout>;
  if (!data) return <Layout><p className="cd-muted">Memuat…</p></Layout>;

  return (
    <Layout>
      <h1 className="cd-h1" style={{ fontSize: 36 }}>Pesanan Sertifikat</h1>
      <div style={{ overflowX: "auto" }}>
        <table className="cd-table" data-testid="pesanan-table">
          <thead><tr>
            <th>Tanggal</th><th>Nama cetak</th><th>Profil</th><th>Skor</th><th>Telepon</th><th>Alamat</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            {data.length === 0 && <tr><td colSpan={8} className="cd-muted">Belum ada pesanan.</td></tr>}
            {data.map((o) => (
              <tr key={o.id}>
                <td className="mono">{fmtTanggal(o.tanggal)}</td>
                <td>{o.nama_cetak}</td>
                <td>{o.kategori}</td>
                <td className="mono">{o.skor}</td>
                <td className="mono">{o.telepon}</td>
                <td>{o.alamat}</td>
                <td>{o.status}</td>
                <td>
                  <select className="cd-select" style={{ minWidth: 120 }} data-testid={`status-${o.id}`} value={o.status} onChange={(e) => ubah(o.id, e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { api } from "../api";
import { fmtTanggal } from "../peserta";

export default function AdminKode() {
  const [sp] = useSearchParams();
  const kunci = sp.get("kunci") || "";
  const [data, setData] = useState(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    api.get(`/admin/kode?kunci=${encodeURIComponent(kunci)}`)
      .then((r) => setData(r.data.kode))
      .catch(() => setDenied(true));
  }, [kunci]);

  if (denied) return <Layout><p data-testid="admin-denied">Kunci tidak sesuai.</p></Layout>;
  if (!data) return <Layout><p className="cd-muted">Memuat…</p></Layout>;

  return (
    <Layout>
      <h1 className="cd-h1" style={{ fontSize: 36 }}>Kode Akses</h1>
      <table className="cd-table" data-testid="kode-table">
        <thead><tr><th>Kode</th><th>Jenis</th><th>Dipakai oleh</th><th>Dipakai pada</th></tr></thead>
        <tbody>
          {data.map((k) => (
            <tr key={k.kode}>
              <td className="mono">{k.kode}</td>
              <td>{k.jenis}</td>
              <td className="mono">{k.dipakai_oleh || "-"}</td>
              <td className="mono">{k.dipakai_pada ? fmtTanggal(k.dipakai_pada) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}

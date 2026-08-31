import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { api } from "../api";
import { fmtTanggal, getPeserta } from "../peserta";

export default function Papan() {
  const [tab, setTab] = useState("bhurloka");
  const [data, setData] = useState(null);

  useEffect(() => {
    const peserta = getPeserta();
    const q = peserta ? `&peserta_id=${peserta.id}` : "";
    setData(null);
    api.get(`/papan?jenis=${tab}${q}`).then((r) => setData(r.data)).catch(() => setData({ top: [], my_rank: null, total: 0 }));
  }, [tab]);

  return (
    <Layout>
      <div className="cd-topbar">
        <Link to="/" className="cd-brand">Candradimuka</Link>
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Papan Skor</span>
      </div>
      <h1 className="cd-h1" style={{ fontSize: 40 }}>Papan Skor</h1>

      <div className="cd-tabs">
        <button className={"cd-tab" + (tab === "bhurloka" ? " active" : "")} data-testid="tab-bhurloka" onClick={() => setTab("bhurloka")}>Bhurloka</button>
        <button className={"cd-tab" + (tab === "paramartha" ? " active" : "")} data-testid="tab-paramartha" onClick={() => setTab("paramartha")}>Paramārtha</button>
      </div>

      <p className="cd-faint" style={{ fontSize: 13, marginBottom: 12 }}>
        Skor tingkat Bhurloka dan Paramārtha tidak sebanding, karena itu papan dipisah.
      </p>

      {!data ? <p className="cd-muted">Memuat…</p> : (
        <>
          <table className="cd-table" data-testid="papan-table">
            <thead><tr><th>#</th><th>Nama</th><th>Skor</th><th>Tanggal</th></tr></thead>
            <tbody>
              {data.top.length === 0 && <tr><td colSpan={4} className="cd-muted">Belum ada hasil.</td></tr>}
              {data.top.map((r) => (
                <tr key={r.rank}>
                  <td className="mono">{r.rank}</td>
                  <td>{r.nama_tampilan}</td>
                  <td className="mono">{r.skor}%</td>
                  <td className="mono">{fmtTanggal(r.tanggal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.my_rank && data.my_rank.rank > 100 && (
            <p className="cd-muted" style={{ marginTop: 14 }} data-testid="my-rank">
              Peringkatmu saat ini: {data.my_rank.rank} dari {data.my_rank.total.toLocaleString("id-ID")}.
            </p>
          )}
        </>
      )}
    </Layout>
  );
}

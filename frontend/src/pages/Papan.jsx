import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { api } from "../api";
import { fmtWaktu, getPeserta } from "../peserta";

const TABS = [
  ["bhurloka", "Bhurloka"],
  ["akasa", "Ākāśa"],
  ["paramartha", "Paramārtha"],
];

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
        <span />
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Peta Kejernihan</span>
      </div>
      <h1 className="cd-h1" style={{ fontSize: 40 }}>Peta Kejernihan</h1>

      <div className="cd-tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={"cd-tab" + (tab === key ? " active" : "")} data-testid={`tab-${key}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      <p className="cd-faint" style={{ fontSize: 13, marginBottom: 12 }}>
        Skor tiap tingkat tidak sebanding, karena itu Peta Kejernihan dipisah per tingkat.
      </p>

      {!data ? <p className="cd-muted">Memuat…</p> : (
        <>
          <table className="cd-table" data-testid="papan-table">
            <thead><tr><th>#</th><th>Nama</th><th>Kejernihan</th><th>Waktu</th></tr></thead>
            <tbody>
              {data.top.length === 0 && <tr><td colSpan={4} className="cd-muted">Belum ada hasil.</td></tr>}
              {data.top.map((r) => (
                <tr key={r.rank}>
                  <td className="mono">{r.rank}</td>
                  <td>{r.nama_tampilan}</td>
                  <td className="mono">{r.skor}%</td>
                  <td className="mono">{fmtWaktu(r.tanggal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.my_rank && data.my_rank.rank > 10 && (
            <p className="cd-muted" style={{ marginTop: 14 }} data-testid="my-rank">
              Peringkatmu saat ini: {data.my_rank.rank} dari {data.my_rank.total.toLocaleString("id-ID")}.
            </p>
          )}
        </>
      )}
    </Layout>
  );
}

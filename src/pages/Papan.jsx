import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Layout } from "../components/Layout";
import { Loader } from "../components/Loader";
import { useAuth } from "../auth";
import { papanService } from "../services/papanService";
import { TINGKAT } from "../domain/soal";

function fmtWaktu(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });
}

const TABS = [
  ["bhurloka", TINGKAT.BHURLOKA],
  ["akasa", TINGKAT.AKASA],
  ["paramartha", TINGKAT.PARAMARTHA],
];

export default function Papan() {
  const { user } = useAuth();
  const [tab, setTab] = useState("bhurloka");
  const [sortBy, setSortBy] = useState("skor");
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      setData(null);
      const res = await papanService.ambilPapanTingkat(tab, user?.uid, sortBy);
      if (res.success) {
        setData(res.data);
      } else {
        setData({ top: [], my_rank: null, total: 0 });
      }
    })();
  }, [tab, user, sortBy]);

  return (
    <Layout>
      <div className="cd-topbar">
        <span />
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Mandala Peringkat</span>
      </div>
      <h1 className="cd-h1" style={{ fontSize: 40 }}>Mandala Peringkat</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div className="cd-tabs" style={{ marginBottom: 0 }}>
          {TABS.map(([key, label]) => (
            <button key={key} className={"cd-tab" + (tab === key ? " active" : "")} data-testid={`tab-${key}`} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setSortBy('skor')}
            style={{
              padding: '6px 16px', fontSize: '13px', borderRadius: '30px', cursor: 'pointer',
              background: sortBy === 'skor' ? 'var(--ink)' : 'transparent',
              color: sortBy === 'skor' ? 'var(--ground)' : 'var(--ink-2)',
              border: `1px solid ${sortBy === 'skor' ? 'var(--ink)' : 'var(--line-2)'}`,
              fontWeight: 500, transition: 'all 0.2s ease'
            }}
          >
            Skor Tertinggi
          </button>
          <button 
            onClick={() => setSortBy('frekuensi')}
            style={{
              padding: '6px 16px', fontSize: '13px', borderRadius: '30px', cursor: 'pointer',
              background: sortBy === 'frekuensi' ? 'var(--ink)' : 'transparent',
              color: sortBy === 'frekuensi' ? 'var(--ground)' : 'var(--ink-2)',
              border: `1px solid ${sortBy === 'frekuensi' ? 'var(--ink)' : 'var(--line-2)'}`,
              fontWeight: 500, transition: 'all 0.2s ease'
            }}
          >
            Frekuensi Uji
          </button>
        </div>
      </div>

      <p className="cd-faint" style={{ fontSize: 13, marginBottom: 12 }}>
        {sortBy === 'skor' 
          ? "Skor tiap tingkat tidak sebanding, karena itu Mandala Peringkat dipisah per tingkat."
          : "Menampilkan peringkat berdasarkan seberapa sering peserta melakukan ujian pada tingkat ini."}
      </p>

      {!data ? <Loader /> : (
        <>
          <table className="cd-table" data-testid="papan-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nama</th>
                <th>{sortBy === 'skor' ? 'Skor' : 'Jumlah Ujian'}</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {data.top.length === 0 && <tr><td colSpan={4} className="cd-muted">Belum ada hasil.</td></tr>}
              {data.top.map((r) => (
                <tr key={r.rank}>
                  <td className="mono">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{r.rank}</span>
                      {r.trend === 'up' && <ArrowUp size={14} style={{ color: 'var(--patina)' }} />}
                      {r.trend === 'down' && <ArrowDown size={14} style={{ color: 'var(--alert)' }} />}
                      {r.trend === 'same' && <Minus size={14} style={{ color: 'var(--line-2)' }} />}
                      {r.trend === 'new' && <span style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>Baru</span>}
                    </div>
                  </td>
                  <td>{r.nama_tampilan}</td>
                  <td className="mono">{sortBy === 'skor' ? `${Number(r.skor).toFixed(1).replace(/\.0$/, '')}%` : `${r.frekuensi}x`}</td>
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

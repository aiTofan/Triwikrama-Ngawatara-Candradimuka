import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Loader } from "../components/Loader";
import { useAuth, startLogin } from "../auth";
import { sesiService } from "../services/sesiService";

const TIER_BY_KEY = { bhurloka: 'Bhurloka', akasa: 'Ākāśa', paramartha: 'Paramārtha' };

export default function Riwayat() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [riwayat, setRiwayat] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user || user.isAnonymous) {
      return;
    }

    (async () => {
      try {
        setBusy(true);
        const res = await sesiService.ambilRiwayatSesi(user.uid);
        
        if (res.success && Array.isArray(res.data)) {
          // Fetch rank for each session
          const enriched = await Promise.all(res.data.map(async (sesi) => {
            let peringkat = "-";
            if (sesi.skor_mentah !== undefined) {
              const rankRes = await sesiService.hitungPeringkat(sesi.jenis, sesi.skor_mentah);
              if (rankRes.success) {
                peringkat = rankRes.data;
              }
            }
            return { ...sesi, peringkat };
          }));
          setRiwayat(enriched);
        } else {
          setErr("Gagal memuat riwayat ujian.");
        }
      } catch (error) {
        console.error("Gagal memuat riwayat", error);
        setErr("Gagal memuat riwayat ujian.");
      } finally {
        setBusy(false);
      }
    })();
  }, [user, loading, nav]);

  if (loading || (busy && user && !user.isAnonymous)) {
    return <Layout><Loader /></Layout>;
  }

  if (!user || user.isAnonymous) {
    return (
      <Layout>
        <div style={{ marginTop: 60, textAlign: 'center' }}>
          <h2 className="cd-h2" style={{ marginBottom: 12 }}>Riwayat Ujian</h2>
          <p className="cd-muted" style={{ marginBottom: 24 }}>Kamu sedang menggunakan mode tamu. Silakan masuk (login) dengan akun Google untuk menyimpan dan melihat riwayat ujianmu.</p>
          <button className="cd-btn" onClick={() => startLogin()}>Masuk dengan Google</button>
        </div>
      </Layout>
    );
  }

  if (err) {
    return <Layout><p className="err" style={{ textAlign: "center", marginTop: 40 }}>{err}</p></Layout>;
  }

  return (
    <Layout>
      <div className="cd-topbar">
        <span />
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Perkembangan Kesadaran</span>
      </div>
      <h1 className="cd-h1" style={{ fontSize: 32, letterSpacing: "-0.01em", marginBottom: 24 }}>Riwayat Ujian</h1>

      {riwayat && riwayat.length > 0 ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: "16px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--line-2)" }}>
                <th style={{ padding: "16px", fontSize: "14px", fontWeight: 600, color: "var(--ink-2)" }}>Tanggal</th>
                <th style={{ padding: "16px", fontSize: "14px", fontWeight: 600, color: "var(--ink-2)" }}>Mandala</th>
                <th style={{ padding: "16px", fontSize: "14px", fontWeight: 600, color: "var(--ink-2)" }}>Skor</th>
                <th style={{ padding: "16px", fontSize: "14px", fontWeight: 600, color: "var(--ink-2)" }}>Peringkat</th>
                <th style={{ padding: "16px", fontSize: "14px", fontWeight: 600, color: "var(--ink-2)", textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {riwayat.map((sesi) => (
                <tr key={sesi.id} style={{ borderBottom: "1px solid var(--line-2)", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.01)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: "16px", fontSize: "14px" }}>
                    {new Date(sesi.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: "16px", fontSize: "14px", fontWeight: 500 }}>
                    {TIER_BY_KEY[sesi.jenis] || sesi.jenis}
                  </td>
                  <td style={{ padding: "16px", fontSize: "14px" }}>
                    {sesi.skor !== undefined ? `${Number(sesi.skor).toFixed(1).replace(/\.0$/, '')}%` : '-'}
                  </td>
                  <td style={{ padding: "16px", fontSize: "14px" }}>
                    {sesi.peringkat !== "-" ? (
                      <span style={{ background: "var(--ink)", color: "var(--ground)", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 600 }}>
                        #{sesi.peringkat}
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: "16px", textAlign: "center" }}>
                    <Link to={`/hasil/${sesi.id}`} className="cd-btn-ghost" style={{ padding: "6px 12px", fontSize: "13px" }}>
                      Lihat Hasil
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: "16px" }}>
          <p className="cd-muted">Belum ada riwayat ujian yang diselesaikan.</p>
          <Link to="/" className="cd-btn" style={{ marginTop: 16 }}>Mulai Ujian</Link>
        </div>
      )}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
         <p className="cd-faint" style={{ fontSize: '13px' }}>Peringkat bersifat dinamis dan akan terus berfluktuasi seiring dengan nilai peserta lain yang masuk ke sistem.</p>
      </div>
    </Layout>
  );
}

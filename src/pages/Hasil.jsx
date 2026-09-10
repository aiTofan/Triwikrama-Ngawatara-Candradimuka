import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Loader, SkeletonResult } from "../components/Loader";
import { ProfileDisk } from "../components/ProfileDisk";
import { ResultMap } from "../components/ResultMap";
import { useAuth, startLogin } from "../auth";
import { sesiService } from "../services/sesiService";
import { soalService } from "../services/soalService";
import { CONFIG } from "../config";
import { TINGKAT, KOLOM } from "../domain/soal";

function shuffle(array) {
  const result = [...array];
  let currentIndex = result.length, randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [result[currentIndex], result[randomIndex]] = [result[randomIndex], result[currentIndex]];
  }
  return result;
}

export default function Hasil() {
  const { sesiId } = useParams();
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav("/");
      return;
    }

    (async () => {
      try {
        let s;
        const res = await sesiService.ambilSesi(sesiId);
        if (res.success) {
          s = res.data;
        } else {
          console.warn("ambilSesi failed, checking local storage", res.message);
          const offlineData = sesiService.ambilOffline(sesiId);
          if (offlineData) {
            s = offlineData;
          } else {
            throw new Error("Sesi tidak ditemukan");
          }
        }
        
        
        let hasLocalAccess = false;
        const offlineKey = 'offline_session_' + sesiId;
        if (localStorage.getItem(offlineKey)) {
           const parsed = JSON.parse(localStorage.getItem(offlineKey));
           if (parsed.id === s.id) {
               hasLocalAccess = true;
           }
        }
        
        if (s.peserta_id !== user.uid && !hasLocalAccess && user.role !== 'admin') {
           throw new Error("Forbidden");
        }

        
        const getKategori = (skor) => {
          if (skor === undefined || skor === null) return { nama: "Menunggu Kalkulasi", desc: "Sistem sedang mengkalkulasi skor Anda" };
          if (skor <= 53) return { nama: "Kesadaran Cicing", desc: "diam dan bereaksi dari rasa, emosi atau kebiasaan" };
          if (skor <= 86) return { nama: "Kesadaran Nyaring", desc: "sudah bangun dan melihat jernih" };
          return { nama: "Kesadaran Eling", desc: "sadar, berdaulat, dan menindaklanjuti apa yang dilihatnya" };
        };
        const kat = getKategori(s.skor);
        
        const TIER_BY_KEY = { bhurloka: TINGKAT.BHURLOKA, akasa: TINGKAT.AKASA, paramartha: TINGKAT.PARAMARTHA };
        const tierOrder = ['bhurloka', 'akasa', 'paramartha'];
        
        let sessions = [];
        const resPj = await sesiService.ambilSesiPerjalanan(s.perjalanan_id);
        if (resPj.success) {
          sessions = resPj.data.filter(d => ['selesai', 'terverifikasi'].includes(d.status));
        }

        if (['selesai', 'terverifikasi'].includes(s.status) && !sessions.find(x => x.id === s.id)) {
          sessions.push(s);
        }
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('offline_session_')) {
            try {
              const parsed = JSON.parse(localStorage.getItem(key));
              if (parsed.perjalanan_id === s.perjalanan_id && ['selesai', 'terverifikasi'].includes(parsed.status)) {
                if (!sessions.find(x => x.id === parsed.id)) {
                  sessions.push(parsed);
                }
              }
            } catch (e) {}
          }
        }
        
        const peta = tierOrder.map(key => {
          const ses = sessions.find(x => x.jenis === key);
          return {
            key,
            nama: TIER_BY_KEY[key],
            persen: ses ? ses.skor : null,
            selesai: !!ses
          };
        });
        
        const disk = s.disk || s.soal_ids.filter(no => !s.soal_detail[no]?.is_trap).map(no => {
          const tok = s.jawaban[no];
          if (tok) {
            const p = s.soal_detail[no].pilihan.find(x => x.opsi_id === tok || x.token === tok || x.id === tok);
            return p && p._skor !== undefined ? p._skor : null;
          }
          return null;
        }).filter(x => x !== null);

        setData({
          sesi_id: s.id, 
          jenis: s.jenis, 
          tier_nama: TIER_BY_KEY[s.jenis],
          skor: s.skor, status: s.status, 
          gagal_dinilai: s.gagal_dinilai,
          kategori: kat.nama, 
          kategori_desc: kat.desc,
          kategori_paragraf: `${kat.nama} — ${kat.desc}`,
          terbuka: true, 
          jumlah_soal: s.soal_ids.filter(id => !s.soal_detail[id]?.is_trap).length, 
          tampil_di_papan: false, // Legacy field
          perjalanan_id: s.perjalanan_id, 
          peta: peta, 
          disk: disk
        });
      } catch (e) {
        console.error(e);
        setErr("Gagal memuat hasil.");
      }
    })();
  }, [sesiId, user, loading, nav]);

  const lanjut = async () => {
    setBusy(true); setErr("");
    try {
      const tierOrder = ['bhurloka', 'akasa', 'paramartha'];
      const TIER_BY_KEY = {
        bhurloka: { match: TINGKAT.BHURLOKA, target: 17 },
        akasa: { match: TINGKAT.AKASA, target: 30 },
        paramartha: { match: TINGKAT.PARAMARTHA, target: 90 }, // Paramartha target handled differently, but we follow quotas
      };
      
      const completed = data.peta.filter(t => t.selesai).map(t => t.key);
      const nextTier = tierOrder.find(t => !completed.includes(t));
      
      if (!nextTier) {
        nav("/");
        return;
      }
      
      if (user && user.isAnonymous) {
        try {
           const linkedUser = await startLogin();
           if (!linkedUser) {
             setBusy(false);
             return;
           }
           try {
             const { addDoc, collection } = await import("firebase/firestore");
             const { db } = await import("../firebase");
             const offlineDataStr = localStorage.getItem('offline_session_' + sesiId);
             if (offlineDataStr) {
                 const offlineData = JSON.parse(offlineDataStr);
                 if (offlineData.peserta_id !== linkedUser.uid) {
                    const payload = { ...offlineData, peserta_id: linkedUser.uid };
                    delete payload.id;
                    const docRef = await addDoc(collection(db, "sessions"), payload);
                    const newSessionData = { ...payload, id: docRef.id };
                    localStorage.setItem('offline_session_' + docRef.id, JSON.stringify(newSessionData));
                    window.location.href = "/hasil/" + docRef.id;
                    return;
                 }
             }
           } catch (migErr) { console.error("Migration error", migErr); }
        } catch (authErr) {
           setErr("Kamu harus login dengan akun Google untuk melanjutkan. Jika jendela masuk (popup) terblokir, mohon izinkan popup di pengaturan peramban Anda.");
           setBusy(false);
           return;
        }
      }
      
      const tier = TIER_BY_KEY[nextTier];
      
      const poolResult = await soalService.ambilPoolSoal(tier.match);
      if (!poolResult.success) {
        setErr("Gagal memulai: " + poolResult.message);
        setBusy(false);
        return;
      }

      const { inti: intiPool, pemeriksa: pemeriksaPool } = poolResult.data;
      
      const quotas = await import('../services/pengaturanService').then(m => m.pengaturanService.getQuotas());
      const actualTarget = quotas[tier.match] || tier.target;
      const hasPemeriksa = pemeriksaPool.length > 0;
      const requiredInti = hasPemeriksa ? actualTarget - 1 : actualTarget;

      if (intiPool.length < requiredInti) {
        const totalTersedia = intiPool.length + (hasPemeriksa ? 1 : 0);
        setErr(`Soal untuk tahap ini belum lengkap (tersedia ${totalTersedia} dari ${actualTarget}).`);
        setBusy(false);
        return;
      }
      
      const drawnPemeriksa = hasPemeriksa ? shuffle(pemeriksaPool).slice(0, 1) : [];
      const drawnInti = shuffle(intiPool).slice(0, requiredInti);
      const drawn = shuffle([...drawnInti, ...drawnPemeriksa]);
      
      const new_sesi_id = crypto.randomUUID();
      const detail = {};
      drawn.forEach(it => {
        detail[it.id] = { 
          ...it, 
          [KOLOM.PILIHAN]: shuffle(it[KOLOM.PILIHAN] || it.pilihan).map(p => ({ 
            [KOLOM.TEKS]: p[KOLOM.TEKS] || p.teks,
            [KOLOM.OPSI_ID]: p[KOLOM.OPSI_ID] || p.token || crypto.randomUUID().slice(0, 8),
            sk: p.sk
          })) 
        };
      });
      
      const sessionData = {
        id: new_sesi_id,
        perjalanan_id: data.perjalanan_id,
        peserta_id: user.uid,
        jenis: nextTier,
        tingkat: tier.match,
        status: 'berjalan',
        posisi: 0,
        jawaban: {},
        soal_ids: drawn.map(d => d.id),
        soal_detail: detail,
        pemeriksa_tersedia: hasPemeriksa,
        created_at: new Date().toISOString()
      };
      
      const createRes = await sesiService.buatSesi(sessionData);
      if (!createRes.success) {
        if (createRes.errorCode === 'resource-exhausted' || createRes.errorCode === 'deadline-exceeded') {
          sesiService.simpanOffline(new_sesi_id, sessionData);
        } else {
          throw new Error(createRes.message);
        }
      }
      nav(`/uji/${new_sesi_id}`);
    } catch (e) {
      console.error(e);
      setErr("Gagal melanjutkan perjalanan.");
    } finally {
      setBusy(false);
    }
  };

  if (err) return <Layout><p className="err">{err}</p></Layout>;
  if (!data) return <Layout><Loader /><SkeletonResult /></Layout>;

  return (
    <Layout>
      <div className="cd-topbar">
        <span />
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Evaluasi Mandala {data.tier_nama}</span>
      </div>
      <h1 className="cd-h1" style={{ fontSize: 40, letterSpacing: "-0.01em" }}>Profil Kesadaranmu</h1>
      
      <div className="hasil-hero" data-testid="hasil-hero" style={{ textAlign: 'center' }}>
        {(data.skor === undefined || data.gagal_dinilai || (user && user.role === 'admin')) && (
          <div style={{ marginBottom: 16 }}>
             {data.gagal_dinilai && <p style={{ color: 'var(--alert)', marginBottom: 8, fontSize: '14px' }}>⚠️ Maaf, terjadi kegagalan saat mencocokkan beberapa skor jawaban Anda. Klik tombol di bawah ini untuk mencoba menghitung ulang.</p>}
             <button className="cd-btn" onClick={async () => {
                const { hitungSkorDariPublik } = await import('../penilaian');
                const { sesiService } = await import('../services/sesiService');
                const raw = await sesiService.ambilSesi(data.sesi_id);
                const hasil = hitungSkorDariPublik(raw);
                await sesiService.updateSesi(data.sesi_id, {
                   skor: hasil.skor, skor_mentah: hasil.skor_mentah, disk: hasil.disk,
                   penalti_jebakan: hasil.penalti_jebakan, status: 'selesai',
                   gagal_dinilai: hasil.gagal_dinilai, gagal_count: hasil.gagal_count
                });
                window.location.reload();
             }}>Hitung Ulang Skor</button>
          </div>
        )}
        <p className="cd-h1" style={{ fontSize: data.skor !== undefined ? 96 : 32, margin: 0, lineHeight: 1 }}>
          {(data.status === 'selesai' || data.status === 'terverifikasi') && data.skor !== undefined && data.skor !== null ? `${Number(data.skor).toFixed(1).replace(/\.0$/, '')}%` : ''}
        </p>
        <p className="cd-lead" style={{ marginTop: 8 }}>{data.kategori}</p>
        <p className="cd-muted">{data.kategori_desc}</p>
      </div>

      {data.disk && data.disk.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <p className="cd-label">Distribusi Pilihan</p>
          <div style={{ width: '100%', position: 'relative' }}>
            <ProfileDisk scores={data.disk} />
          </div>
          <p className="cd-faint" style={{ marginTop: 12, fontSize: 13, textAlign: 'center' }}>
            Tiap bilah mewakili satu skenario dalam ujian ini.<br />
            Panjang bilah menunjukkan tingkat kejernihan dari respon yang kamu pilih.
          </p>
        </div>
      )}

      {data.kategori_paragraf && (
        <div className="cd-block" style={{ marginTop: 32 }}>
          <p className="cd-label">Pembacaan</p>
          <p style={{ lineHeight: 1.7 }} data-testid="analisis-teks">{data.kategori_paragraf}</p>
        </div>
      )}

      <div className="cd-block" style={{ marginTop: 24 }} data-testid="peta-kesadaran">
        <p className="cd-label" style={{ marginBottom: 12 }}>Peta Perjalanan Kesadaran</p>
        <ResultMap peta={data.peta} />
      </div>

      {user && user.isAnonymous && (
        <div style={{ marginTop: 32, padding: '24px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--line-2)' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>Simpan Skor ke Mandala Peringkat</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Daftar atau masuk menggunakan akun Google untuk menyimpan perolehan skormu ke dalam Mandala Peringkat secara permanen. Hal ini juga diperlukan untuk melanjutkan ujian ke tahap Ākāśa dan Paramārtha.
          </p>
          <button className="cd-btn-ghost" onClick={() => {
             setBusy(true);
             startLogin()
               .then(async linkedUser => {
                 if (linkedUser) {
                   try {
                     const { addDoc, collection } = await import("firebase/firestore");
                     const { db } = await import("../firebase");
                     const offlineDataStr = localStorage.getItem('offline_session_' + sesiId);
                     if (offlineDataStr) {
                         const offlineData = JSON.parse(offlineDataStr);
                         if (offlineData.peserta_id !== linkedUser.uid) {
                            const payload = { ...offlineData, peserta_id: linkedUser.uid };
                            delete payload.id;
                            const docRef = await addDoc(collection(db, "sessions"), payload);
                            const newSessionData = { ...payload, id: docRef.id };
                            localStorage.setItem('offline_session_' + docRef.id, JSON.stringify(newSessionData));
                            window.location.href = "/hasil/" + docRef.id;
                            return;
                         }
                     }
                   } catch (migErr) { console.error("Migration error", migErr); }
                   window.location.reload();
                 } else {
                   setBusy(false);
                 }
               })
               .catch(authErr => {
                 console.error(authErr);
                 setErr("Gagal menghubungkan akun Google. Jika jendela masuk (popup) terblokir, mohon izinkan popup di pengaturan peramban Anda.");
                 setBusy(false);
               });
          }} disabled={busy}>
            {busy ? "Menyiapkan..." : "Masuk dengan Google"}
          </button>
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <div style={{ display: "flex", gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {data.terbuka && data.jenis !== 'paramartha' ? (
            <>
              {(() => {
                const isCurrentSelesai = data.peta.find(p => p.key === data.jenis)?.selesai;
                return (
                  <button className="cd-btn" onClick={lanjut} disabled={busy || !isCurrentSelesai} data-testid="btn-lanjut-mandala">
                    {!isCurrentSelesai ? "Selesaikan tahap ini dahulu" : (busy ? "Menyiapkan…" : `Lanjutkan ke ${data.jenis === 'bhurloka' ? 'Ākāśa' : 'Paramārtha'}`)}
                  </button>
                );
              })()}
            </>
          ) : (
            <button className="cd-btn" onClick={() => nav("/")}>Kembali ke Beranda</button>
          )}
        </div>
        {data.terbuka && data.jenis !== 'paramartha' && (
          <p className="cd-faint" style={{ marginTop: 12, fontSize: 13 }}>
            Tahap {data.jenis === 'bhurloka' ? '2' : '3'}: {data.jenis === 'bhurloka' ? 'Ākāśa' : 'Paramārtha'} — Estimasi waktu {CONFIG.WAKTU_MENIT[data.jenis === 'bhurloka' ? 'Ākāśa' : 'Paramārtha']} menit
          </p>
        )}
      </div>
    </Layout>
  );
}

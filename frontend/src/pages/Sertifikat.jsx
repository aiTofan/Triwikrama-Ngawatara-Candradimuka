import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { api } from "../api";
import { fmtTanggal } from "../peserta";

const AUTHOR = "Ki Ageng Candradimuka";

export default function Sertifikat() {
  const { sesiId } = useParams();
  const [h, setH] = useState(null);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ nama_cetak: "", telepon: "", alamat: "", catatan: "" });
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    api.get(`/sesi/${sesiId}/hasil`).then((r) => {
      if (r.data.jenis !== "lengkap" || !r.data.selesai_at) { setErr("Sertifikat hanya untuk uji lengkap yang telah selesai."); return; }
      setH(r.data);
      setF((p) => ({ ...p, nama_cetak: r.data.peserta?.nama_tampilan || "" }));
    }).catch(() => setErr("Hasil tidak ditemukan."));
  }, [sesiId]);

  if (err) return <Layout><p className="err">{err}</p><Link to="/">Kembali</Link></Layout>;
  if (!h) return <Layout><p className="cd-muted">Memuat…</p></Layout>;

  const submit = async () => {
    if (!f.nama_cetak.trim() || !f.telepon.trim() || !f.alamat.trim()) return;
    setBusy(true);
    try {
      const r = await api.post(`/sertifikat/${sesiId}`, f);
      setOrder(r.data);
      window.scrollTo(0, 0);
    } catch { setErr("Gagal menyimpan pesanan."); } finally { setBusy(false); }
  };

  const nama = f.nama_cetak.trim() || "[nama cetak]";
  const tanggal = fmtTanggal(h.selesai_at);

  return (
    <Layout>
      <div className="cd-topbar">
        <Link to={`/hasil/${sesiId}`} className="cd-brand">Candradimuka</Link>
        <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>Sertifikat Cetak</span>
      </div>
      <h1 className="cd-h1" style={{ fontSize: 40 }}>Sertifikat Cetak</h1>
      <p className="cd-muted">Sertifikat adalah benda cetak yang ditandatangani dan dikirim kepadamu.
        Tidak ada sertifikat digital.</p>

      {/* Preview */}
      <h2 className="cd-h2" style={{ marginTop: 24 }}>Pratinjau yang akan dicetak</h2>
      <div className="sertifikat-preview" data-testid="sertifikat-preview">
        <p className="body">
          Sertifikat ini menyatakan bahwa {nama} telah menyelesaikan Uji Profil Kesadaran Triwikrama
          sebanyak 45 soal pada {tanggal}, dan memperoleh profil {h.kategori} dengan skor {h.skor}.
        </p>
        <p className="small">
          Uji ini memetakan cara seseorang membaca situasi pada satu kesempatan, bukan kadar kemurnian kesadarannya.
        </p>
        <p className="kode" data-testid="preview-kode">
          Kode verifikasi: {order ? order.kode_verifikasi : "dibuat saat pemesanan"}
        </p>
        <p className="small">Dapat diperiksa di candradimuka.id/periksa</p>
        <p className="ttd">Ditandatangani,<br />{AUTHOR}</p>
      </div>

      {order ? (
        <div className="cd-block" style={{ marginTop: 22 }} data-testid="order-confirm">
          <p className="cd-label">Pesanan diterima</p>
          <p className="cd-muted">Nomor pesanan: <span className="mono">{order.order_id}</span></p>
          <p className="cd-muted">Kode verifikasi: <span className="mono" style={{ color: "var(--gold)" }}>{order.kode_verifikasi}</span></p>
          <p className="cd-muted">Total: {order.total}.</p>
          <p className="cd-muted">Silakan transfer sesuai instruksi yang kami kabarkan. Sertifikat dicetak
            setelah pembayaran diterima.</p>
        </div>
      ) : (
        <div style={{ marginTop: 22 }}>
          <h2 className="cd-h2">Formulir pemesanan</h2>
          <div className="cd-field"><label>Nama untuk dicetak</label>
            <input className="cd-input" data-testid="cert-nama" value={f.nama_cetak} onChange={set("nama_cetak")} /></div>
          <div className="cd-field"><label>Nomor telepon</label>
            <input className="cd-input" data-testid="cert-telepon" value={f.telepon} onChange={set("telepon")} /></div>
          <p className="cd-faint" style={{ fontSize: 13, marginBottom: 6 }}>
            Alamat hanya dipakai untuk mengirim sertifikatmu. Tidak ditampilkan di halaman mana pun dan
            tidak diikutkan dalam ekspor apa pun.
          </p>
          <div className="cd-field"><label>Alamat lengkap</label>
            <textarea className="cd-textarea" data-testid="cert-alamat" value={f.alamat} onChange={set("alamat")} /></div>
          <div className="cd-field"><label>Catatan</label>
            <textarea className="cd-textarea" data-testid="cert-catatan" value={f.catatan} onChange={set("catatan")} /></div>
          <button className="cd-btn" onClick={submit} disabled={busy} data-testid="cert-submit">
            {busy ? "Menyimpan…" : "Pesan sertifikat"}
          </button>
        </div>
      )}
    </Layout>
  );
}

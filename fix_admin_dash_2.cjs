const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');

// 1. Fix handleSamakanOpsiId message
code = code.replace(
    'setMessage(`Berhasil menyamakan opsi_id pada ${res} soal.`);',
    'setMessage(`Berhasil menyamakan opsi_id pada ${res.data} soal.`);'
);

// 2. Rewrite verifikasiSesi and verifikasiSemua completely to handle counts and errors
const newVerifikasiLogic = `
  const verifikasiSesiCore = async (s) => {
       const hasil = await hitungSkorSesi(s);
       const payload = {
           gagal_dinilai: hasil.gagal_dinilai,
           gagal_count: hasil.gagal_count,
           skor: hasil.skor,
           skor_mentah: hasil.skor_mentah,
           disk: hasil.disk,
           penalti_deviasi: hasil.penalti_deviasi,
           penalti_jebakan: hasil.penalti_jebakan,
           status: hasil.gagal_dinilai ? 'gagal_dinilai' : 'terverifikasi',
           diverifikasi_pada: new Date().toISOString()
       };
       const res = await sesiService.updateSesi(s.id, payload);
       if (!res.success) throw new Error(res.message || "Gagal mengupdate database");
       return hasil;
  };

  const verifikasiSesi = async (s) => {
    setVerifying(true);
    try {
       await verifikasiSesiCore(s);
       alert(\`Berhasil memproses sesi \${s.nama_peserta}.\`);
    } catch(e) {
       console.error("Error verifikasi", s.id, e);
       alert("Gagal verifikasi " + s.id + ": " + e.message);
    } finally {
       setVerifying(false);
    }
  };

  const verifikasiSemua = async () => {
     setVerifying(true);
     let berhasil = 0;
     let gagal = 0;
     let pesanError = [];
     
     for (const s of menunggu) {
        try {
           await verifikasiSesiCore(s);
           berhasil++;
        } catch(e) {
           console.error("Error verifikasi", s.id, e);
           gagal++;
           pesanError.push(\`\${s.nama_peserta}: \${e.message}\`);
        }
     }
     
     await loadMenunggu();
     await loadTerverifikasi();
     setVerifying(false);
     
     let notif = \`Selesai memproses.\\nBerhasil: \${berhasil}\\nGagal: \${gagal}\`;
     if (pesanError.length > 0) {
         notif += \`\\n\\nRincian Gagal:\\n\` + pesanError.join('\\n');
     }
     alert(notif);
  };
`;

code = code.replace(
    /const verifikasiSesi = async \(s\) => \{[\s\S]*?const verifikasiSemua = async \(\) => \{[\s\S]*?await loadTerverifikasi\(\);\s*setVerifying\(false\);\s*\};/m,
    newVerifikasiLogic.trim()
);

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);

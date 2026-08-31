# Candradimuka — PRD

## Original problem statement
Consciousness profile assessment web app titled "Seberapa Murni Kesadaranmu?".
Instrument = UPKT (Uji Profil Kesadaran Triwikrama). All UI text in Bahasa
Indonesia. NO authentication (display name + optional email, persisted in
localStorage). Out of scope: payment gateway, book sales, digital certificate.
Printed certificates ARE ordered through the app.

## Architecture
- Frontend: React (react-router), custom dark-first design system, hyperbolic
  canvas background, Tritangtu SVG progress mark, ProfileDisk canvas visual.
- Backend: FastAPI, all routes under /api.
- DB: MongoDB collections — peserta, sesi, kode_akses, minat, pesanan_sertifikat.
- Question bank: /app/data/bank-soal.json (seeded 3 items, owner replaces with 90).

## Core requirements (static)
- Free "dasar" test: 15 items from bagian 1. Full "lengkap": 15 per bagian (45).
- Exclusion rule across a participant's sessions; fill oldest-seen if short.
- 14-day JEDA between lengkap tests. Shuffle questions + options. Never expose
  option scores in the payload/source before submit.
- Scoring: skor = round(avg chosen scores); floor 25. Categories Cicing /
  Nyaring Sela / Nyaring Jati / Eling.
- Result: free section always (category, %, profile disk, paragraph, 25-floor
  line, share, cert link for lengkap). Paid section behind a bacaan-code unlock
  (per-bagian, sebaran, menonjol, tangga, latihan, credit note).
- Printed certificate order (/sertifikat/:id), verification (/periksa),
  leaderboards (/papan, two tabs), training interest (/pelatihan), pricing
  (/harga), admin gates (?kunci=CANDRA2026) for /admin/kode and /admin/pesanan.
- Privacy: alamat/telepon only on /admin/pesanan, never public/exported.

## Implemented (2026-06)
- All 10 routes + full backend API. Seeds 55 access codes on first run.
- Design system per spec (color tokens dark+light via prefers-color-scheme,
  Instrument Serif / Archivo / JetBrains Mono, Kropak panel, ornaments 1-4).
- Verified: 31/31 backend pytest + full frontend E2E (dark/light, 390px).

## Notes
- Seed bank has 3 items on purpose; draw/scoring logic is correct for full 90.
- Certificate wording ("sebanyak 45 soal") and the geodesic formula are kept
  verbatim per spec.

## Backlog (not requested / future)
- Replace bank-soal.json with the full 90-item bank.
- Build the six Candradimuka training worksheets/modules.
- CSV export for orders/leaderboard.

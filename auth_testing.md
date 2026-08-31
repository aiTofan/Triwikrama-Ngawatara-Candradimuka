See Emergent Auth Integration Playbook. Auth-Gated App Testing Playbook:

Step 1: Create Test User & Session (mongosh) — insert into `peserta` (with google_sub)
and `user_sessions` (session_token, expires_at 7 days), matching peserta_id.

Step 2: Test backend — GET /api/auth/me with `Authorization: Bearer <session_token>`
should return the linked peserta. Protected endpoints (pay, board opt-in, certificate
order) require a valid session.

Step 3: Browser — add cookie session_token (httpOnly, secure, sameSite None) then load app.

Notes for this app (Candradimuka / Triwikramā):
- Login is requested at the RESULT screen only, never before the first question.
- Google login only (no Facebook, no email/password).
- Session token stored in `user_sessions`; peserta gains google_sub, nama_lengkap, foto_url.
- Callback detection uses useLocation().hash.

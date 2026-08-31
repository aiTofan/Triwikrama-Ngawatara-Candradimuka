import { useEffect, useState } from "react";
import { api } from "./api";
import { getPeserta, savePeserta } from "./peserta";

// Start Google sign-in. Returns to the current page with #session_id=...
// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export function startLogin() {
  const redirectUrl = window.location.origin + window.location.pathname;
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export async function logout() {
  try { await api.post("/auth/logout"); } catch {}
  localStorage.removeItem("candra_token");
}

// Hook: returns the logged-in user (peserta with google fields) or null.
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (window.location.hash?.includes("session_id=")) { setLoading(false); return; }
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  return { user, loading, setUser };
}

// One-time exchange of session_id for a session token.
export async function exchangeSession(sessionId) {
  const peserta = getPeserta();
  const r = await api.post("/auth/session", { session_id: sessionId, peserta_id: peserta?.id || null });
  if (r.data.session_token) localStorage.setItem("candra_token", r.data.session_token);
  if (r.data.peserta) savePeserta({ id: r.data.peserta.id, nama_tampilan: r.data.peserta.nama_tampilan, email: r.data.peserta.email });
  return r.data.peserta;
}

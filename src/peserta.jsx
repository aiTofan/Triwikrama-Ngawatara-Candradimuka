const KEY = "candra_peserta";

export function savePeserta(p) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function getPeserta() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// "31 Agustus 2026 - 04:51PM" computed in Asia/Jakarta (not the server timezone).
export function fmtWaktu(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta", year: "numeric", month: "numeric", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    }).formatToParts(d);
    const g = (t) => parts.find((p) => p.type === t)?.value;
    const day = parseInt(g("day"), 10);
    const month = BULAN[parseInt(g("month"), 10) - 1];
    const year = g("year");
    const hour = g("hour");
    const minute = g("minute");
    const ap = (g("dayPeriod") || "").toUpperCase();
    return `${day} ${month} ${year} - ${hour}:${minute}${ap}`;
  } catch {
    return iso;
  }
}

export function fmtTanggal(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

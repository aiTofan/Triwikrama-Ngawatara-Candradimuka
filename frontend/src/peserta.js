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

export function fmtTanggal(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

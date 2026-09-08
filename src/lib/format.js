export function fmtTanggal(isoString) {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleDateString("id-ID", { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
}

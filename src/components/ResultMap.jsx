// Result map: three tier clarity bars (Ornament: patina/gold palette).
// Floor is 25 — percentages are NOT rescaled to 0-100.
export const ResultMap = ({ peta }) => (
  <div data-testid="result-map" style={{ margin: "22px 0" }}>
    {peta.map((t) => {
      const taken = t.persen != null;
      const selesai = t.selesai;
      return (
        <div key={t.key || t.nama} data-testid={`peta-row-${t.key || t.nama}`} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span className="serif" style={{ fontSize: 18, color: "var(--ink)" }}>{t.nama}</span>
            <span className="mono" data-testid={`peta-persen-${t.key || t.nama}`} style={{ fontSize: 13, color: taken ? "var(--patina)" : "var(--ink-3)" }}>
              {taken ? `${t.persen}%` : (selesai ? "Selesai, menunggu verifikasi." : "belum")}
            </span>
          </div>
          <div style={{
            height: 16, border: `1px solid var(--line-2)`, borderRadius: 2, overflow: "hidden",
            borderStyle: taken || selesai ? "solid" : "dashed", background: "var(--ground-2)",
          }}>
            {taken && (
              <div style={{
                height: "100%", width: `${t.persen}%`,
                background: "var(--patina)", borderRight: "2px solid var(--gold)",
              }} />
            )}
            {!taken && selesai && (
              <div style={{
                height: "100%", width: "100%",
                background: "var(--ground-2)", 
                backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, var(--line-2) 10px, var(--line-2) 20px)"
              }} />
            )}
          </div>
        </div>
      );
    })}
  </div>
);

// Tritangtu progress mark. The ONLY progress indicator during the test.

const TRI = {
  outer: [[50, 6], [94, 82], [6, 82]],
  c1: [[50, 6], [72, 44], [28, 44]],
  c2: [[72, 44], [94, 82], [50, 82]],
  c3: [[28, 44], [50, 82], [6, 82]],
  centre: [[72, 44], [50, 82], [28, 44]],
};

function pts(arr) {
  return arr.map((p) => p.join(",")).join(" ");
}

// Shrink a triangle toward its centroid by factor k.
function nested(arr, k = 0.5) {
  const cx = (arr[0][0] + arr[1][0] + arr[2][0]) / 3;
  const cy = (arr[0][1] + arr[1][1] + arr[2][1]) / 3;
  return arr.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
}

// corners: array of 3 fractions (0..1) or null for corners not used.
export const Tritangtu = ({ corners, answered = 0, total = 0, size = 34 }) => {
  const cornerTris = [TRI.c1, TRI.c2, TRI.c3];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${answered} dari ${total} pertanyaan terjawab`}
      data-testid="tritangtu"
    >
      {/* outer triangle */}
      <polygon points={pts(TRI.outer)} fill="none" stroke="var(--line-2)" strokeWidth="1" />
      {cornerTris.map((tri, i) => {
        const frac = corners[i];
        if (frac == null) {
          return <polygon key={i} points={pts(tri)} fill="none" stroke="var(--line-2)" strokeWidth="0.8" />;
        }
        if (frac <= 0) {
          return <polygon key={i} points={pts(tri)} fill="none" stroke="var(--line-2)" strokeWidth="0.8" />;
        }
        const complete = frac >= 1;
        return (
          <g key={i}>
            <polygon points={pts(tri)} fill="var(--patina)" fillOpacity={0.85 * Math.min(1, frac)} stroke="none" />
            {complete && <polygon points={pts(nested(tri, 0.5))} fill="var(--ground)" stroke="none" />}
          </g>
        );
      })}
      {/* centre — never filled */}
      <polygon
        points={pts(TRI.centre)}
        fill="none"
        stroke="var(--line-2)"
        strokeWidth="0.8"
        strokeDasharray="2 3"
      />
    </svg>
  );
};

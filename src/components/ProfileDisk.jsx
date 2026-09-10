import { useEffect, useRef } from "react";
import { geodesik } from "../lib/geometri";

const getStateVar = (skor) => {
  if (skor <= 0) return "--line-2";
  if (skor <= 53) return "--s25"; // Cicing
  if (skor <= 86) return "--s50"; // Nyaring
  return "--s75"; // Eling
};

// The result visual. Reuses geodesik(). One geodesic per answered question,
// coloured by the score the participant chose.
export const ProfileDisk = ({ scores }) => {
  const ref = useRef(null);

  useEffect(() => {
    const draw = () => {
      const cv = ref.current;
      if (!cv) return;
      const answered = (scores || []).filter((s) => s != null);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      cv.width = w * dpr; cv.height = h * dpr;
      const ctx = cv.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cs = getComputedStyle(document.documentElement);
      const R = Math.min(w, h) * 0.45, cx = w / 2, cy = h / 2;

      // unit circle
      ctx.lineWidth = 1;
      ctx.strokeStyle = cs.getPropertyValue("--line-2").trim();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

      const n = answered.length;
      if (n < 2) return;
      ctx.lineWidth = 1.3;
      for (let i = 0; i < n; i++) {
        const a = 2 * Math.PI * i / n;
        const b = 2 * Math.PI * ((i + Math.floor(n / 2) - 1) % n) / n;
        ctx.strokeStyle = cs.getPropertyValue(getStateVar(answered[i])).trim();
        geodesik(ctx, cx, cy, R, a, b);
      }
    };
    draw();
    window.addEventListener("resize", draw);
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener("change", draw);
    return () => {
      window.removeEventListener("resize", draw);
      mq.removeEventListener("change", draw);
    };
  }, [scores]);

  return (
    <div className="disk-wrap">
      <canvas ref={ref} className="disk-canvas" role="img" aria-label="Cakram profil hasil uji" data-testid="profile-disk" />
      <div className="disk-legend">
        <span><i className="swatch" style={{ background: "var(--s25)" }} />Cicing</span>
        <span><i className="swatch" style={{ background: "var(--s50)" }} />Nyaring</span>
        <span><i className="swatch" style={{ background: "var(--s75)" }} />Eling</span>
      </div>
    </div>
  );
};

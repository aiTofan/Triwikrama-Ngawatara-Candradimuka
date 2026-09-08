import { useEffect, useRef } from "react";
import { gambarCakram } from "../lib/geometri";

// Fixed full-viewport hyperbolic background, drawn once on load and on resize.
export const Background = () => {
  const ref = useRef(null);

  useEffect(() => {
    const draw = () => {
      const cv = ref.current;
      if (!cv) return;
      const light = window.matchMedia("(prefers-color-scheme: light)").matches;
      const garis = light ? "rgba(42,107,90,0.26)" : "rgba(79,179,148,0.30)";
      const tepi = light ? "rgba(142,110,34,0.20)" : "rgba(210,167,91,0.22)";
      gambarCakram(cv, garis, tepi);
    };
    draw();
    window.addEventListener("resize", draw);
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener("change", draw);
    return () => {
      window.removeEventListener("resize", draw);
      mq.removeEventListener("change", draw);
    };
  }, []);

  return <canvas ref={ref} className="cakram-bg" aria-hidden="true" data-testid="cakram-bg" />;
};

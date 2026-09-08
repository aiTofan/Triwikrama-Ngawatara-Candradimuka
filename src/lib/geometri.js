export const gambarCakram = (canvas, garis, tepi) => {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  
  ctx.strokeStyle = garis || "rgba(0,0,0,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.45, 0, Math.PI * 2);
  ctx.stroke();
};

export const geodesik = (ctx, cx, cy, R, a, b) => {
  const x1 = cx + R * Math.cos(a);
  const y1 = cy + R * Math.sin(a);
  const x2 = cx + R * Math.cos(b);
  const y2 = cy + R * Math.sin(b);
  
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
};

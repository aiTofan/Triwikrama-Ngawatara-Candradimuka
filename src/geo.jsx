// Verbatim hyperbolic-disk geometry. Do not rewrite the maths.

export function geodesik(ctx, cx, cy, R, a, b) {
  var c = Math.cos(a - b), den = 1 + c;
  var Ax = cx + R * Math.cos(a), Ay = cy + R * Math.sin(a);
  var Bx = cx + R * Math.cos(b), By = cy + R * Math.sin(b);
  if (Math.abs(den) < 1e-6) {
    ctx.beginPath(); ctx.moveTo(Ax, Ay); ctx.lineTo(Bx, By); ctx.stroke(); return;
  }
  var ux = (Math.cos(a) + Math.cos(b)) / den, uy = (Math.sin(a) + Math.sin(b)) / den;
  var r = Math.sqrt(Math.max(0, (1 - c) / (1 + c)));
  var Cx = cx + R * ux, Cy = cy + R * uy, rr = R * r;
  var a1 = Math.atan2(Ay - Cy, Ax - Cx), a2 = Math.atan2(By - Cy, Bx - Cx);
  var d = a2 - a1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  ctx.beginPath(); ctx.arc(Cx, Cy, rr, a1, a1 + d, d < 0); ctx.stroke();
}

export function gambarCakram(cv, warnaGaris, warnaTepi) {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  cv.width = w * dpr; cv.height = h * dpr;
  var ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  var R = Math.max(w, h) * 0.72, cx = w / 2, cy = h / 2;
  ctx.lineWidth = 0.8; ctx.strokeStyle = warnaTepi;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = warnaGaris; ctx.lineWidth = 0.55;
  var N = 24, skips = [7, 9, 11];
  for (var s = 0; s < skips.length; s++) {
    for (var i = 0; i < N; i++) {
      geodesik(ctx, cx, cy, R, 2 * Math.PI * i / N, 2 * Math.PI * ((i + skips[s]) % N) / N);
    }
  }
}

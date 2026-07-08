(function (global) {
  'use strict';
  function colorForValue(v, scale) {
    var t = v / scale; if (t > 1) t = 1; else if (t < -1) t = -1;
    if (t >= 0) { var c = Math.round(255 * (1 - t)); return { r: 255, g: c, b: c }; }
    var d = Math.round(255 * (1 + t)); return { r: d, g: d, b: 255 };
  }
  function drawField(ctx, field, scale, phase) {
    var Nx = field.Nx, Ny = field.Ny, re = field.re, im = field.im;
    var img = ctx.createImageData(Nx, Ny), d = img.data, c = Math.cos(phase), s = Math.sin(phase);
    for (var i = 0; i < Nx; i++) for (var j = 0; j < Ny; j++) {
      var idx = i * Ny + j, v = re[idx] * c + im[idx] * s, col = colorForValue(v, scale);
      var p = ((Ny - 1 - j) * Nx + i) * 4;
      d[p] = col.r; d[p + 1] = col.g; d[p + 2] = col.b; d[p + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  // 도선 점: 순시 전류값 v = cre·cosφ + cim·sinφ (A6, 장과 동일 부호)로 색
  function drawWireDots(ctx, wiresPix, cre, cim, phase, scale, Ny) {
    var c = Math.cos(phase), s = Math.sin(phase);
    for (var j = 0; j < wiresPix.length; j++) {
      var v = cre[j] * c + cim[j] * s;
      var mag = Math.abs(v) / scale; if (mag > 1) mag = 1;
      var col = colorForValue(v, scale);
      var cx = wiresPix[j].x, cy = Ny - 1 - wiresPix[j].y;
      var rad = 2.2 + 2.3 * mag;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgb(' + col.r + ',' + col.g + ',' + col.b + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
  }
  function drawPlatesWire(ctx, geom) {
    var Nx = geom.Nx, Ny = geom.Ny, y0 = geom.y0, a = geom.a, xLeft = geom.xLeft, L = geom.L;
    var yTop = Ny - 1 - (y0 + a / 2), yBot = Ny - 1 - (y0 - a / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(xLeft, yTop, L, yBot - yTop);            // 도파관 내부 밴드는 벽 사이만
    // 입구(x=0) 세로 안내선
    ctx.strokeStyle = 'rgba(154,166,216,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xLeft, 0); ctx.lineTo(xLeft, Ny); ctx.stroke();
  }
  // ④ 그래프: 픽셀 x축, refIPix에서 정규화, 이론 곡선 점선(차단만)
  function drawGraph(ctx, ampArr, refIPix, kappaThy, geom) {
    var W = geom.Nx, H = 120, xLeft = geom.xLeft;
    ctx.clearRect(0, 0, W, H);
    if (!ampArr) return;
    var baseline = 1e-9;
    for (var bx = refIPix; bx < ampArr.length; bx++) if (ampArr[bx] > baseline) baseline = ampArr[bx];
    if (baseline < 1e-10) return;
    function toY(v) { var c = v < 0 ? 0 : v > 1.1 ? 1.1 : v; return (H - 18) - c / 1.1 * (H - 30); }
    if (kappaThy) {
      var normRef = ampArr[refIPix] / baseline;
      ctx.strokeStyle = '#ffd479'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath();
      for (var t = refIPix; t < W; t++) {
        var xc = t - xLeft, xcRef = refIPix - xLeft;
        var tv = normRef * Math.exp(-kappaThy * (xc - xcRef));
        if (t === refIPix) ctx.moveTo(t, toY(tv)); else ctx.lineTo(t, toY(tv));
      }
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.strokeStyle = '#7fd6ff'; ctx.lineWidth = 1.8; ctx.beginPath();
    var first = true;
    for (var m = refIPix; m < W; m++) {
      var mv = ampArr[m] / baseline;
      if (first) { ctx.moveTo(m, toY(mv)); first = false; } else ctx.lineTo(m, toY(mv));
    }
    ctx.stroke();
  }
  function setPhasorLegend(el, evanescent) {
    if (!el) return;
    el.textContent = evanescent
      ? '위상자: 전 도선 동위상 (안쪽으로 감쇠)'
      : '위상자: 벽 따라 위상 전진';
    el.style.opacity = evanescent ? '0.7' : '1';
  }
  var API = { colorForValue: colorForValue, drawField: drawField, drawWireDots: drawWireDots,
              drawPlatesWire: drawPlatesWire, drawGraph: drawGraph, setPhasorLegend: setPhasorLegend };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { global.WG = global.WG || {}; Object.assign(global.WG, API); }
})(typeof globalThis !== 'undefined' ? globalThis : this);

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
  function drawSweep(ctx, sweepData, curLambda, a, stale) {
    var W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0, 0, W, H);
    var padL = 44, padB = 26, padT = 12, padR = 12;
    var x0 = padL, x1 = W - padR, y0p = H - padB, y1 = padT;
    var rMin = 0.7, rMax = 2.0;
    function X(r) { return x0 + (r - rMin) / (rMax - rMin) * (x1 - x0); }
    function Y(T) { return y0p - T * (y0p - y1); }
    // 축
    ctx.strokeStyle = '#3a4270'; ctx.lineWidth = 1;
    ctx.strokeRect(x0, y1, x1 - x0, y0p - y1);
    ctx.fillStyle = '#8892b5'; ctx.font = '11px "Segoe UI",sans-serif'; ctx.textAlign = 'center';
    [0.7, 1.0, 1.5, 2.0].forEach(function (r) { ctx.fillText(r.toFixed(1), X(r), H - 10); });
    ctx.textAlign = 'right';
    [0, 0.5, 1.0].forEach(function (T) { ctx.fillText((T * 100) + '%', x0 - 5, Y(T) + 4); });
    ctx.textAlign = 'center'; ctx.fillText('λ / 2a', (x0 + x1) / 2, H - 1);
    // 차단선 λ/2a=1
    ctx.strokeStyle = 'rgba(255,179,122,0.5)'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(X(1), y1); ctx.lineTo(X(1), y0p); ctx.stroke(); ctx.setLineDash([]);
    var colors = { 5: '#7fd6ff', 10: '#ffd479', 20: '#ff8f8f' };
    // 선 색 범례 (도선 간격 d) — 오른쪽 위 빈 공간, 항상 표시
    var legX = x0 + (x1 - x0) * 0.55, legY = y1 + 16;
    ctx.textAlign = 'left'; ctx.font = '12px "Segoe UI",sans-serif';
    ctx.fillStyle = '#aab2cf'; ctx.fillText('선 색 = 도선 간격 d (촘촘할수록 도체판)', legX, legY);
    [{ d: 5, t: 'd=5 (촘촘)' }, { d: 10, t: 'd=10' }, { d: 20, t: 'd=20 (성김)' }].forEach(function (it, i) {
      var yy = legY + 18 * (i + 1);
      ctx.strokeStyle = colors[it.d]; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(legX, yy - 4); ctx.lineTo(legX + 24, yy - 4); ctx.stroke();
      ctx.fillStyle = '#c3cae8'; ctx.fillText(it.t, legX + 32, yy);
    });
    ctx.font = '11px "Segoe UI",sans-serif';
    if (!sweepData) { ctx.textAlign = 'center'; ctx.fillStyle = '#8892b5'; ctx.fillText('스윕 계산 버튼을 누르세요', (x0 + x1) / 2, (y0p + y1) / 2); return; }
    ctx.globalAlpha = stale ? 0.35 : 1;
    sweepData.curves.forEach(function (cv) {
      ctx.strokeStyle = colors[cv.d] || '#fff'; ctx.lineWidth = 2; ctx.beginPath();
      cv.pts.forEach(function (p, i) { var xx = X(p.r), yy = Y(Math.max(0, Math.min(1, p.T))); if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); });
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    // 현재 λ 마커
    if (curLambda && a) {
      var r = curLambda / (2 * a);
      ctx.strokeStyle = '#e8ebf5'; ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(X(r), y1); ctx.lineTo(X(r), y0p); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function updateOverlays(wraps, geom) {
    var Nx = geom.Nx, Ny = geom.Ny, y0 = geom.y0, a = geom.a, xLeft = geom.xLeft;
    function clear(w) { var e = w.getElementsByClassName('cv-label'); while (e.length) e[0].parentNode.removeChild(e[0]); }
    function mk(w, text, leftPct, topPct, center, color) {
      var s = document.createElement('span'); s.className = 'cv-label' + (center ? ' cv-label-center' : '');
      s.style.left = leftPct.toFixed(2) + '%'; s.style.top = topPct.toFixed(2) + '%'; s.style.color = color; s.textContent = text; w.appendChild(s);
    }
    var yTop = Ny - 1 - (y0 + a / 2), yBot = Ny - 1 - (y0 - a / 2);
    [wraps.inc, wraps.scat, wraps.tot].forEach(function (w) {
      clear(w);
      mk(w, '도선 벽', (xLeft + 4) / Nx * 100, (yTop - 14) / Ny * 100, false, '#9aa6d8');
      mk(w, '도선 벽', (xLeft + 4) / Nx * 100, (yBot + 2) / Ny * 100, false, '#9aa6d8');
      mk(w, '입구', xLeft / Nx * 100, 2, true, '#6a74a0');
    });
  }
  var API = { colorForValue: colorForValue, drawField: drawField, drawWireDots: drawWireDots,
              drawPlatesWire: drawPlatesWire, drawGraph: drawGraph, setPhasorLegend: setPhasorLegend,
              drawSweep: drawSweep, updateOverlays: updateOverlays };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { global.WG = global.WG || {}; Object.assign(global.WG, API); }
})(typeof globalThis !== 'undefined' ? globalThis : this);

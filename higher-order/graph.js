(function (global) {
  'use strict';
  var COLORS = { 1: '#4a90d9', 2: '#3fb56b', 3: '#e8913a' };

  function drawModeGraph(ctx, s, CFG) {
    var W = ctx.canvas.width, H = ctx.canvas.height, padL = 52, padB = 30, padT = 16, padR = 12;
    ctx.clearRect(0, 0, W, H);
    var a = CFG.a, k = s.k, y0pix = CFG.y0pix, xLeft = CFG.xLeft, L = CFG.L;

    var kappas = [1, 2, 3].map(function (n) { return WGM.theoryKappa(n, a, k); }).filter(function (v) { return v; });
    var kappaMin = kappas.length ? Math.min.apply(null, kappas) : null;
    var win = WGM.fitWindowZ(CFG.z0, L, kappaMin);

    var amps = {}, refIPix = Math.round(win.zStart) + xLeft, norm = 1e-9;
    [1, 2, 3].forEach(function (n) {
      amps[n] = WGM.modeCoefGridN(s.tot, y0pix, a, n);
      if (amps[n][refIPix] > norm) norm = amps[n][refIPix];
    });

    var decades = 4, yMaxLog = 0.3;
    function X(zc) { return padL + (zc / L) * (W - padL - padR); }
    function Y(val) {
      var lg = Math.log(Math.max(val, 1e-12) / norm) / Math.LN10;
      var t = (yMaxLog - lg) / decades; if (t < 0) t = 0; if (t > 1) t = 1;
      return padT + t * (H - padT - padB);
    }
    ctx.strokeStyle = '#2a3050'; ctx.strokeRect(padL, padT, W - padL - padR, H - padT - padB);
    ctx.fillStyle = '#8892b5'; ctx.font = '11px "Segoe UI",sans-serif';
    for (var dd = 0; dd <= decades; dd++) {
      var yy = padT + (dd / decades) * (H - padT - padB);
      ctx.strokeStyle = '#1b2140'; ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(W - padR, yy); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText('1e' + (Math.round(yMaxLog) - dd), padL - 5, yy + 4);
    }
    ctx.textAlign = 'center'; ctx.fillText('z (진행축)', (padL + W) / 2, H - 4);
    // §3-4 y축 세로 라벨
    ctx.save();
    ctx.translate(13, padT + (H - padT - padB) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.fillStyle = '#8892b5'; ctx.font = '11px "Segoe UI",sans-serif';
    ctx.fillText('|cₙ(z)|  (모드 계수 크기, 로그)', 0, 0);
    ctx.restore();

    ctx.fillStyle = 'rgba(154,166,216,0.08)';
    ctx.fillRect(X(win.zStart), padT, X(win.zEnd) - X(win.zStart), H - padT - padB);

    var floorThresh = norm * 1e-4; // §3-6 수치 바닥(하단 1e-4 데케이드)
    [1, 2, 3].forEach(function (n) {
      var col = COLORS[n];
      // 실측 실선 — 바닥 아래 구간은 반투명(0.25)
      ctx.lineWidth = 1.8; ctx.setLineDash([]); ctx.strokeStyle = col;
      var seg = [], curBelow = null;
      function strokeSeg(pts, below) {
        if (pts.length < 2) return;
        ctx.globalAlpha = below ? 0.25 : 1; ctx.beginPath();
        for (var q = 0; q < pts.length; q++) { if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y); }
        ctx.stroke();
      }
      for (var zc = 0; zc <= L; zc += 1) {
        var v = amps[n][Math.round(zc) + xLeft];
        var below = v < floorThresh, pt = { x: X(zc), y: Y(v) };
        if (curBelow === null) { curBelow = below; seg = [pt]; }
        else if (below === curBelow) { seg.push(pt); }
        else { seg.push(pt); strokeSeg(seg, curBelow); seg = [pt]; curBelow = below; }
      }
      strokeSeg(seg, curBelow);
      ctx.globalAlpha = 1;

      // 이론 점선
      var kap = WGM.theoryKappa(n, a, k), kz = WGM.theoryKz(n, a, k);
      ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]); ctx.beginPath();
      if (kap) {
        var kwin = WGM.kappaWindowN(L, kap, s.d);
        var anchorI = Math.round(kwin.zStart) + xLeft;
        var anchor = amps[n][anchorI];
        for (var zc2 = kwin.zStart; zc2 <= L; zc2 += 1) {
          var tv = anchor * Math.exp(-kap * (zc2 - kwin.zStart));
          if (zc2 === kwin.zStart) ctx.moveTo(X(zc2), Y(tv)); else ctx.lineTo(X(zc2), Y(tv));
        }
      } else if (kz) {
        var h = theoryHeight(n, s, CFG, win, amps, xLeft);
        ctx.moveTo(X(win.zStart), Y(h)); ctx.lineTo(X(L), Y(h));
      }
      ctx.stroke(); ctx.setLineDash([]);
    });

    drawLegend(ctx, padL, padT);
    if (s.dOverLambda > 0.1 || s.wallT > 0.35) drawCollapseWarn(ctx, W, padT);
  }

  function theoryHeight(n, s, CFG, win, amps, xLeft) {
    var a = CFG.a, k = s.k, y0spec = window.__hoState.y0spec;
    var base = geoMean(amps[1], Math.round(win.zStart) + xLeft, Math.round(win.zEnd) + xLeft);
    var amp1 = WGM.theoryPropAmp(1, y0spec, a, k), ampN = WGM.theoryPropAmp(n, y0spec, a, k);
    if (!amp1 || amp1 < 1e-12 || ampN === null) return base;
    return base * (ampN / amp1);
  }
  function geoMean(arr, i0, i1) { var sIn = 0, c = 0;
    for (var i = i0; i <= i1; i++) { var v = arr[i]; if (v < 1e-14) v = 1e-14; sIn += Math.log(v); c++; }
    return c ? Math.exp(sIn / c) : 1e-9; }

  function drawLegend(ctx, x, y) {
    ctx.textAlign = 'left'; ctx.font = '11px "Segoe UI",sans-serif';
    var items = [[1, 'mode1'], [2, 'mode2'], [3, 'mode3']];
    items.forEach(function (it, i) {
      var yy = y + 12 + i * 15; ctx.strokeStyle = COLORS[it[0]]; ctx.lineWidth = 2;
      ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(x + 8, yy); ctx.lineTo(x + 26, yy); ctx.stroke();
      ctx.fillStyle = COLORS[it[0]]; ctx.fillText(it[1], x + 32, yy + 4);
    });
    // §3-5 실선/점선 샘플 획
    var lx = x + 92;
    ctx.strokeStyle = '#aab2cf'; ctx.lineWidth = 1.8; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(lx, y + 9); ctx.lineTo(lx + 22, y + 9); ctx.stroke();
    ctx.fillStyle = '#8892b5'; ctx.fillText('실측(MoM)', lx + 28, y + 12);
    ctx.strokeStyle = '#aab2cf'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(lx, y + 24); ctx.lineTo(lx + 22, y + 24); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#8892b5'; ctx.fillText('이론', lx + 28, y + 27);
    ctx.fillText('(n≥4 미표시)', lx, y + 42);
  }
  function drawCollapseWarn(ctx, W, y) {
    ctx.fillStyle = '#f4a261'; ctx.textAlign = 'right'; ctx.font = 'bold 12px "Segoe UI",sans-serif';
    ctx.fillText('⚠ 벽 근사 무너짐 — 모드 분해 신뢰도 낮음', W - 16, y + 12);
  }

  global.WG = global.WG || {}; global.WG.drawModeGraph = drawModeGraph;
})(typeof globalThis !== 'undefined' ? globalThis : this);

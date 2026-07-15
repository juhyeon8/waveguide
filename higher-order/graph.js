(function (global) {
  'use strict';
  var COLORS = { 1: '#4a90d9', 2: '#3fb56b', 3: '#e8913a' };

  function drawModeGraph(ctx, s, CFG) {
    var W = ctx.canvas.width, H = ctx.canvas.height, padL = 52, padB = 30, padT = 16, padR = 12;
    ctx.clearRect(0, 0, W, H);
    var a = CFG.a, k = s.k, y0pix = CFG.y0pix, xLeft = CFG.xLeft, L = CFG.L;

    // 관찰 구간: 차단 모드 최소 κ (없으면 null → fitWindowZ가 0.2L 분기)
    var kappas = [1, 2, 3].map(function (n) { return WGM.theoryKappa(n, a, k); }).filter(function (v) { return v; });
    var kappaMin = kappas.length ? Math.min.apply(null, kappas) : null;
    var win = WGM.fitWindowZ(CFG.z0, L, kappaMin);

    // 실측 |cₙ(z)| (픽셀 배열) + 공통 정규화 기준(관찰 시작 단면 최대 모드 진폭)
    var amps = {}, refIPix = Math.round(win.zStart) + xLeft, norm = 1e-9;
    [1, 2, 3].forEach(function (n) {
      amps[n] = WGM.modeCoefGridN(s.tot, y0pix, a, n);
      if (amps[n][refIPix] > norm) norm = amps[n][refIPix];
    });

    // 로그 y축 매핑
    var decades = 4, yMaxLog = 0.3; // log10(정규화값) 상단 여유
    function X(zc) { return padL + (zc / L) * (W - padL - padR); }
    function Y(val) {
      var lg = Math.log(Math.max(val, 1e-12) / norm) / Math.LN10;
      var t = (yMaxLog - lg) / decades; if (t < 0) t = 0; if (t > 1) t = 1;
      return padT + t * (H - padT - padB);
    }
    // 축·격자
    ctx.strokeStyle = '#2a3050'; ctx.strokeRect(padL, padT, W - padL - padR, H - padT - padB);
    ctx.fillStyle = '#8892b5'; ctx.font = '11px "Segoe UI",sans-serif';
    for (var dd = 0; dd <= decades; dd++) {
      var yy = padT + (dd / decades) * (H - padT - padB);
      ctx.strokeStyle = '#1b2140'; ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(W - padR, yy); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText('1e' + (Math.round(yMaxLog) - dd), padL - 5, yy + 4);
    }
    ctx.textAlign = 'center'; ctx.fillText('z (진행축)', (padL + W) / 2, H - 4);
    // 관찰 구간 음영
    ctx.fillStyle = 'rgba(154,166,216,0.08)';
    ctx.fillRect(X(win.zStart), padT, X(win.zEnd) - X(win.zStart), H - padT - padB);

    // 각 모드: 실측 실선 + 이론 점선
    [1, 2, 3].forEach(function (n) {
      var col = COLORS[n];
      // 실측 실선 (도파관 구간 z=0..L)
      ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.setLineDash([]); ctx.beginPath();
      var started = false;
      for (var zc = 0; zc <= L; zc += 1) {
        var v = amps[n][Math.round(zc) + xLeft];
        var px = X(zc), py = Y(v);
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // 이론 점선
      var kap = WGM.theoryKappa(n, a, k), kz = WGM.theoryKz(n, a, k);
      ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]); ctx.beginPath();
      if (kap) { // 차단: per-mode κ 창 시작 실측값에 앵커한 e^{-κz}
        var kwin = WGM.kappaWindowN(L, kap, s.d);
        var anchorI = Math.round(kwin.zStart) + xLeft;
        var anchor = amps[n][anchorI];
        for (var zc2 = kwin.zStart; zc2 <= L; zc2 += 1) {
          var tv = anchor * Math.exp(-kap * (zc2 - kwin.zStart));
          if (zc2 === kwin.zStart) ctx.moveTo(X(zc2), Y(tv)); else ctx.lineTo(X(zc2), Y(tv));
        }
      } else if (kz) { // 전파: 수평선. 높이는 mode1 대비 상대비, 전체는 mode1 실측 평균에 앵커
        var h = theoryHeight(n, s, CFG, win, amps, xLeft);
        ctx.moveTo(X(win.zStart), Y(h)); ctx.lineTo(X(L), Y(h));
      }
      ctx.stroke(); ctx.setLineDash([]);
    });

    drawLegend(ctx, padL, padT);
    if (s.dOverLambda > 0.1 || s.wallT > 0.35) drawCollapseWarn(ctx, W, padT);
  }

  // 전파 이론 수평선 높이: mode1은 자기 실측 평균에 앵커(→ 실측과 겹침이 정상),
  // mode n은 |sin(nπy0/a)|/kz 비율을 mode1 대비로 곱해 상대 높이 결정.
  function theoryHeight(n, s, CFG, win, amps, xLeft) {
    var a = CFG.a, k = s.k, y0spec = window.__hoState.y0spec;
    var base = geoMean(amps[1], Math.round(win.zStart) + xLeft, Math.round(win.zEnd) + xLeft);
    var amp1 = WGM.theoryPropAmp(1, y0spec, a, k), ampN = WGM.theoryPropAmp(n, y0spec, a, k);
    if (!amp1 || amp1 < 1e-12 || ampN === null) return base; // mode1 자기 앵커
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
    ctx.fillStyle = '#8892b5'; ctx.fillText('실선=실측(MoM)  점선=이론', x + 90, y + 12);
    ctx.fillText('(n≥4 미표시)', x + 90, y + 27);
  }
  function drawCollapseWarn(ctx, W, y) {
    ctx.fillStyle = '#f4a261'; ctx.textAlign = 'right'; ctx.font = 'bold 12px "Segoe UI",sans-serif';
    ctx.fillText('⚠ 벽 근사 무너짐 — 모드 분해 신뢰도 낮음', W - 16, y + 12);
  }

  global.WG = global.WG || {}; global.WG.drawModeGraph = drawModeGraph;
})(typeof globalThis !== 'undefined' ? globalThis : this);

(function () {
  'use strict';
  var WGc = WireWG;      // 물리 코어
  var xLeft = 110, xRight = 110, Ny = 220, y0 = 110;

  var state = { lambda: 140, a: 60, d: 5, aw: 0.8, L: 300, inc: 'plane',
                phase: 0, dPhi: 0.15, paused: false };
  var built = null;   // {Nx, wiresPix, cre, cim, inc, scat, tot, amp, info}
  var el = function (id) { return document.getElementById(id); };
  var cv = { inc: el('cvInc'), scat: el('cvScat'), tot: el('cvTot'), graph: el('cvGraph') };

  var sweepData = null, sweepStale = false, cvSweep = el('cvSweep');
  cvSweep.width = 1040; cvSweep.height = 240;
  function drawSweepPanel() {
    WG.drawSweep(cvSweep.getContext('2d'), sweepData, state.lambda, state.a, sweepStale);
  }
  function refreshSweepStale() {
    if (sweepData && (sweepData.a !== state.a || sweepData.L !== state.L)) sweepStale = true;
    drawSweepPanel();
  }
  el('sweepBtn').addEventListener('click', function () {
    if (state.inc !== 'plane') return;
    el('sweepBtn').disabled = true;
    WG.runSweep({ a: state.a, L: state.L, aw: state.aw, xLeft: xLeft, y0: y0, Ny: Ny },
      function (frac) { el('sweepStatus').textContent = '스윕 계산 중… ' + Math.round(frac * 100) + '%'; },
      function (data) { sweepData = data; sweepStale = false; el('sweepStatus').textContent = '완료';
        el('sweepBtn').disabled = (state.inc !== 'plane'); drawSweepPanel(); });
  });

  function geom() { return { Nx: built.Nx, Ny: Ny, y0: y0, a: state.a, xLeft: xLeft, L: state.L }; }

  function rebuild() {
    var s = state, k = 2 * Math.PI / s.lambda, Nx = xLeft + s.L + xRight;
    var wires = WGc.buildWires(s.a, s.L, s.d, s.aw);
    var wiresPix = wires.map(function (w) { return { x: w.x, y: y0 + w.y, aw: w.aw }; });
    var wiresPixDraw = wiresPix.map(function (w) { return { x: w.x + xLeft, y: w.y }; });
    var incFnCell = (s.inc === 'plane')
      ? function (x, y) { return WGc.incPlane(k, x, y); }
      : function (x, y) { return WGc.incLine(k, -80, 0, x, y); };
    var sol = WGc.solveMoM(wires, k, incFnCell);
    var table = WG.buildHankelTable(k, Nx + Ny + 20);
    var inc = WG.computeIncidentGrid(WG.makeField(Nx, Ny), incFnCell, xLeft, y0);
    var scat = WG.computeScatteredGrid(WG.makeField(Nx, Ny), wiresPix, sol[0], sol[1], table, xLeft);
    var tot = WG.addComplex(WG.makeField(Nx, Ny), inc, scat);
    var amp = WG.modeCoefGrid(tot, y0, s.a);
    var info = WGc.cutoffInfo(s.lambda, s.a);
    built = { Nx: Nx, wiresPix: wiresPix, wiresPixDraw: wiresPixDraw, cre: sol[0], cim: sol[1],
              inc: inc, scat: scat, tot: tot, amp: amp, info: info };
    [cv.inc, cv.scat, cv.tot].forEach(function (c) { c.width = Nx; c.height = Ny; });
    cv.graph.width = Nx; cv.graph.height = 120;
    WG.setPhasorLegend(el('phasorLegend'), info.evanescent);
  }

  function frame() {
    if (!state.paused) state.phase += state.dPhi;
    var g = geom(), ph = state.phase, b = built;
    var gi = cv.inc.getContext('2d'), gs = cv.scat.getContext('2d'), gt = cv.tot.getContext('2d');
    WG.drawField(gi, b.inc, 1, ph); WG.drawField(gs, b.scat, 1, ph); WG.drawField(gt, b.tot, 1, ph);
    WG.drawPlatesWire(gi, g); WG.drawPlatesWire(gs, g); WG.drawPlatesWire(gt, g);
    WG.drawWireDots(gs, b.wiresPixDraw, b.cre, b.cim, ph, 1, Ny);
    WG.drawWireDots(gt, b.wiresPixDraw, b.cre, b.cim, ph, 1, Ny);
    var refIPix = xLeft + Math.round(0.12 * state.L);
    WG.drawGraph(cv.graph.getContext('2d'), b.amp, refIPix, b.info.evanescent ? b.info.kappa : null, g);
    requestAnimationFrame(frame);
  }

  el('pauseBtn').addEventListener('click', function () {
    state.paused = !state.paused;
    el('pauseBtn').textContent = state.paused ? '▶ 재개' : '⏸ 일시정지';
  });
  el('speed').addEventListener('input', function (e) {
    state.dPhi = +e.target.value; el('speedVal').textContent = (+e.target.value).toFixed(2) + ' rad/f';
  });

  function mm(cell) { return cell * 2; }
  function clampLambda() {
    var lam = el('lambda');
    lam.min = Math.round(0.7 * 2 * state.a); lam.max = Math.round(2.0 * 2 * state.a);
    if (state.lambda < +lam.min) state.lambda = +lam.min;
    if (state.lambda > +lam.max) state.lambda = +lam.max;
    lam.value = state.lambda;
  }
  function syncReadouts() {
    el('lambdaVal').textContent = mm(state.lambda) + ' mm';
    el('aVal').textContent = mm(state.a) + ' mm  (2a = ' + mm(2 * state.a) + ' mm)';
    el('dVal').textContent = state.d + ' 셀 (' + mm(state.d) + ' mm)';
    el('lenVal').textContent = mm(state.L) + ' mm';
  }
  function updateInfo() {
    var b = built, info = b.info, plane = (state.inc === 'plane');
    var lamMm = mm(state.lambda);
    el('freqInfo').textContent = '자유공간 주파수 f = c/λ:  ' + (3e11 / lamMm / 1e9).toFixed(2) + ' GHz';
    el('cutoffBadge').textContent = info.evanescent ? '차단: λ > 2a → 감쇠파' : '전파: λ < 2a → 모드 진행';
    el('cutoffBadge').style.color = info.evanescent ? '#ffb37a' : '#7fd6ff';

    var refI = xLeft + Math.round(0.12 * state.L);
    if (info.evanescent) {
      el('kappaInfo').textContent = '이론 κ = ' + (info.kappa / 2).toFixed(4) + ' /mm';
      var m = WG.measureKappa(b.amp, state.L, info.kappa, xLeft);
      if (m.valid) {
        var pct = m.kappa / info.kappa * 100, ok = (pct > 85 && pct < 115);
        el('kappaCompare').textContent = '측정 κ = ' + (m.kappa / 2).toFixed(4) + ' /mm  (' + pct.toFixed(0) + '%)'
          + (ok ? '' : '  ⚠ d 감소 권장');
        el('kappaCompare').style.color = ok ? '' : '#f4a261';
        var ratio = Math.max(0, Math.min(1, m.kappa / info.kappa));
        el('plateGauge').style.width = (ratio * 100).toFixed(0) + '%';
      }
    } else {
      var kz = WG.measureKzFromGrid(b.tot, y0, state.a, state.L, xLeft);
      el('kappaInfo').textContent = 'k_z(이론) = ' + (info.kguide / 2).toFixed(4) + ' /mm';
      var pct2 = kz / info.kguide * 100;
      el('kappaCompare').textContent = '측정 k_z = ' + (kz / 2).toFixed(4) + ' /mm  (' + pct2.toFixed(0) + '%)'
        + ((pct2 > 85 && pct2 < 115) ? '' : '  ⚠ d 감소 권장');
      el('kappaCompare').style.color = (pct2 > 85 && pct2 < 115) ? '' : '#f4a261';
      el('plateGauge').style.width = Math.max(0, Math.min(100, pct2)).toFixed(0) + '%';
    }
    el('plateGaugeCap').textContent = info.evanescent
      ? '차단(κ)에서 가장 민감한 지표.'
      : '전파(k_z)는 성긴 벽에도 둔감 — 누설 지표를 함께 볼 것.';

    // 도체판 근사 상태 배지 (d/λ 기준; d·λ 모두 셀 단위라 비는 무차원)
    var dlRatio = state.d / state.lambda, badge = el('plateBadge');
    if (dlRatio <= 0.10) { badge.className = 'plate-badge good'; badge.textContent = '🟢 도체판 근사 좋음 (d ≪ λ · d/λ=' + dlRatio.toFixed(2) + ')'; }
    else if (dlRatio <= 0.20) { badge.className = 'plate-badge warn'; badge.textContent = '🟡 도체판 근사 경계 (d/λ=' + dlRatio.toFixed(2) + ')'; }
    else { badge.className = 'plate-badge bad'; badge.textContent = '🔴 성긴 벽 — 도체판에서 멀어짐 (d/λ=' + dlRatio.toFixed(2) + ')'; }

    var leak = WG.leakage(b.tot, y0, state.a, xLeft, state.L);
    el('leakInfo').textContent = '도선 사이 벽 |E| 평균(누설): ' + leak.toFixed(4)
      + '  — 0에 안 닿는 건 유한 벽 누설, d↓면 내려감';

    // A1: 투과율 (평면파 전용)
    if (plane) {
      el('transInfo').style.display = '';
      if (info.evanescent) {
        var T = WG.transmittance(b.amp, state.L, xLeft);
        var dB = (T > 1e-12) ? -10 * Math.log10(T) : 999;
        var Lmm = mm(state.L);
        el('transInfo').textContent = '진폭 감쇠 ≈ ' + (dB / 2).toFixed(1) + ' dB (L=' + Lmm + 'mm 기준), '
          + (dB / Lmm).toFixed(3) + ' dB/mm';
      } else {
        el('transInfo').textContent = '전력 투과율 T = ' + (WG.transmittance(b.amp, state.L, xLeft) * 100).toFixed(1) + ' %';
      }
    } else { el('transInfo').style.display = 'none'; }

    // A2: SWR (평면파 전용)
    if (plane) {
      var sw = WG.swr(b.tot, y0, xLeft);
      el('swrInfo').style.display = '';
      el('swrInfo').textContent = sw.swr
        ? '입구 앞 정재파 SWR = ' + sw.swr.toFixed(2) + ' (반사율 ≈ ' + (sw.reflect * 100).toFixed(0) + '%) — 차단 시 반사가 증거'
        : '입구 앞 정재파: 측정 불가';
    } else { el('swrInfo').style.display = 'none'; }

    // A1: 스윕 버튼 (평면파 전용)
    el('sweepBtn').disabled = !plane;
    el('sweepBtn').title = plane ? '' : '스윕은 평면파 입사 전용';

    // ① 입사 캡션
    el('incCap').textContent = (state.inc === 'plane')
      ? '입사 평면파는 도파관 모드가 아니다. 벽 밖에도 평면파가 그대로 존재(물리적 실재). 벽 전류의 산란파가 내부 균일 성분을 지운다.'
      : '선원파: 내부 여기. 선원 위치 x=−80(셀), y=0. 렌더 창 밖이면 점 생략.';

    // a_w 근사 경고
    if (state.aw > state.d / 4 || state.aw > state.lambda / 20)
      el('kappaCompare').textContent += '  ⚠ 얇은 도선 근사 경계';
  }

  function recompute() { clampLambda(); rebuild(); syncReadouts(); updateInfo(); drawSweepPanel(); refreshSweepStale(); }

  function applyPreset(p) {
    if (p === 'prop') { state.a = 60; state.d = 5; state.lambda = 90; }
    else if (p === 'cut') { state.a = 60; state.d = 5; state.lambda = 140; }
    else if (p === 'sparse') { state.a = 60; state.d = 20; state.lambda = 140; }
    el('aGap').value = state.a; el('dWire').value = state.d;
    recompute();
  }

  el('lambda').addEventListener('input', function (e) { state.lambda = +e.target.value; rebuild(); syncReadouts(); updateInfo(); refreshSweepStale(); });
  el('aGap').addEventListener('input', function (e) { state.a = +e.target.value; recompute(); });
  el('dWire').addEventListener('input', function (e) { state.d = +e.target.value; recompute(); });
  el('lenL').addEventListener('input', function (e) { state.L = +e.target.value; recompute(); });
  Array.prototype.forEach.call(document.getElementsByName('incType'), function (r) {
    r.addEventListener('change', function (e) { if (e.target.checked) { state.inc = e.target.value; rebuild(); updateInfo(); } });
  });
  el('presetProp').addEventListener('click', function () { applyPreset('prop'); });
  el('presetCut').addEventListener('click', function () { applyPreset('cut'); });
  el('presetSparse').addEventListener('click', function () { applyPreset('sparse'); });

  clampLambda(); rebuild(); syncReadouts(); updateInfo(); requestAnimationFrame(frame);
  window.__wg = { state: state, rebuild: rebuild };   // Task 8 확장용 훅
})();

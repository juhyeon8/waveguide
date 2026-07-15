(function () {
  'use strict';
  var core = WireWG;
  var CFG = { a: 60, L: 300, xLeft: 110, xRight: 110, Ny: 220, y0pix: 110, aw: 0.8, Nmax: 420, z0: 36 };
  var state = { lambda: 90, y0spec: 30, dManual: 5, dAutoOn: true, phase: 0, dPhi: 0.15, paused: false };
  var el = function (id) { return document.getElementById(id); };
  var cvTot = el('cvTot');

  function currentD() {
    return state.dAutoOn ? WGM.dAuto(state.lambda, CFG.L, CFG.Nmax) : state.dManual;
  }
  function rebuild() {
    var p = { lambda: state.lambda, a: CFG.a, L: CFG.L, d: currentD(), y0spec: state.y0spec,
      aw: CFG.aw, xLeft: CFG.xLeft, xRight: CFG.xRight, Ny: CFG.Ny, y0pix: CFG.y0pix, z0: CFG.z0 };
    var s = WGM.computeScene(core, WG, p);
    cvTot.width = s.Nx; cvTot.height = s.Ny;
    window.__scene = s;
    if (window.__afterRebuild) window.__afterRebuild(s); // Task 9·10에서 그래프·판독 갱신
  }

  var A = CFG.a;
  function syncReadouts() {
    el('lambdaVal').textContent = (state.lambda / A).toFixed(2) + ' a  (' + state.lambda.toFixed(0) + ' 셀)';
    el('y0Val').textContent = (state.y0spec / A).toFixed(2) + ' a';
    var d = currentD();
    el('dVal').textContent = d.toFixed(2) + ' 셀 (d/λ=' + (d / state.lambda).toFixed(3) + ')';
    el('dWire').disabled = state.dAutoOn;
  }
  var timer = null;
  function scheduleRebuild() { if (timer) clearTimeout(timer);
    timer = setTimeout(function () { rebuild(); timer = null; }, 150); }
  function rebuildNow() { if (timer) { clearTimeout(timer); timer = null; } rebuild(); }
  el('lambda').addEventListener('input', function (e) {
    state.lambda = (+e.target.value) * A; syncReadouts(); scheduleRebuild(); });
  el('y0').addEventListener('input', function (e) {
    state.y0spec = (+e.target.value) * A; syncReadouts(); scheduleRebuild(); });
  el('centerBtn').addEventListener('click', function () {
    state.y0spec = A / 2; el('y0').value = 0.5; syncReadouts(); rebuildNow(); });
  el('dWire').addEventListener('input', function (e) {
    state.dManual = +e.target.value; syncReadouts(); scheduleRebuild(); });
  el('dAuto').addEventListener('change', function (e) {
    state.dAutoOn = e.target.checked; syncReadouts(); rebuildNow(); });
  el('pauseBtn').addEventListener('click', function () {
    state.paused = !state.paused; el('pauseBtn').textContent = state.paused ? '▶ 재개' : '⏸ 일시정지'; });
  el('speed').addEventListener('input', function (e) { state.dPhi = +e.target.value; });

  function applyPreset(id) {
    var m = { '1': [2.4, null], '2': [1.5, null], '3': [0.8, 0.25], '4': [0.55, 1 / 6] };
    var v = m[id]; state.lambda = v[0] * A;
    if (v[1] !== null) { state.y0spec = v[1] * A; el('y0').value = v[1]; }
    el('lambda').value = v[0]; syncReadouts(); rebuildNow();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-preset]'), function (b) {
    b.addEventListener('click', function () { applyPreset(b.getAttribute('data-preset')); });
  });
  // 초기: state.lambda를 셀 단위로 세팅(슬라이더 기본 1.5a)
  state.lambda = 1.5 * A; state.y0spec = 0.5 * A; syncReadouts();

  function autoScale(field) { // 완전 차단 대비: 관찰 구간 근처 최대에 스케일
    var Ny = field.Ny, re = field.re, im = field.im, mx = 1e-6;
    var i0 = CFG.xLeft, i1 = CFG.xLeft + Math.round(0.4 * CFG.L);
    for (var i = i0; i < i1; i++) for (var j = 0; j < Ny; j++) {
      var idx = i * Ny + j, v = Math.sqrt(re[idx] * re[idx] + im[idx] * im[idx]);
      if (v > mx) mx = v;
    }
    return mx;
  }
  function geom(s) { return { Nx: s.Nx, Ny: s.Ny, y0: CFG.y0pix, a: CFG.a, xLeft: CFG.xLeft, L: CFG.L }; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frame() {
    var s = window.__scene;
    if (s) {
      if (!state.paused && !reduce) state.phase += state.dPhi;
      var g = cvTot.getContext('2d'), sc = autoScale(s.tot);
      WG.drawField(g, s.tot, sc, state.phase);
      WG.drawPlatesWire(g, geom(s));
      WG.drawWireDots(g, s.wiresPixDraw, s.cre, s.cim, state.phase, sc, s.Ny);
    }
    requestAnimationFrame(frame);
  }

  function renderReadouts(s) {
    var a = CFG.a, k = s.k, y0spec = state.y0spec, xLeft = CFG.xLeft, y0pix = CFG.y0pix, L = CFG.L;
    var kappas = [1, 2, 3].map(function (n) { return WGM.theoryKappa(n, a, k); }).filter(function (v) { return v; });
    var kappaMin = kappas.length ? Math.min.apply(null, kappas) : null;
    var win = WGM.fitWindowZ(CFG.z0, L, kappaMin);
    var html = '<div class="row"><b>벽 무결성</b>: |T|=' + s.wallT.toFixed(3) +
      ' , d/λ=' + s.dOverLambda.toFixed(3) +
      (s.dOverLambda > 0.1 || s.wallT > 0.35 ? ' <span class="warn">⚠ 벽 근사 무너짐</span>' : '') + ' — 차단 κ 정확도는 |T|보다 엄격(모드 분해 신뢰 d/λ≲0.06)' + '</div>';
    [1, 2, 3].forEach(function (n) {
      var coup = Math.abs(Math.sin(n * Math.PI * y0spec / a));
      var line = '<div class="row mode' + n + '">mode ' + n +
        ': 결합 |sin(nπy₀/a)|=' + coup.toFixed(3);
      if (coup < 0.02) { line += ' — <b>여기되지 않음(마디 위치)</b>'; }
      else {
        var kz = WGM.theoryKz(n, a, k), kap = WGM.theoryKappa(n, a, k);
        if (kz) {
          var amp = WGM.modeCoefGridN(s.tot, y0pix, a, n);
          var mkz = WGM.measureKzN(s.tot, y0pix, a, n, xLeft, win);
          line += ' — 전파: k_z 측정 ' + (mkz != null ? mkz.toFixed(4) : '—') + ' / 이론 ' + kz.toFixed(4) +
            (mkz != null ? ' (' + (mkz / kz * 100).toFixed(0) + '%)' : '');
        } else if (kap) {
          var amp2 = WGM.modeCoefGridN(s.tot, y0pix, a, n);
          var kwin = WGM.kappaWindowN(L, kap, s.d);
          var mkap = WGM.measureKappaN(amp2, xLeft, kwin);
          if (mkap != null) {
            line += ' — 차단: κ 측정 ' + mkap.toFixed(4) + ' / 이론 ' + kap.toFixed(4) +
              ' (' + (mkap / kap * 100).toFixed(0) + '%)';
          } else {
            line += ' — 차단: 이론 κ ' + kap.toFixed(4) + ' — <b>측정 불가</b>(감쇠길이 1/κ=' +
              (1 / kap).toFixed(1) + '셀 < 도선간격 d=' + s.d.toFixed(1) + '셀, 분해능 한계)';
          }
        }
      }
      html += line + '</div>';
    });
    el('readouts').innerHTML = html;
  }

  window.__hoState = state; window.__hoRebuild = rebuild; window.__hoCFG = CFG; window.__hoCurrentD = currentD;
  window.__afterRebuild = function (s) {
    WG.drawModeGraph(el('cvGraph').getContext('2d'), s, CFG);
    renderReadouts(s);
  };
  rebuild(); requestAnimationFrame(frame);
})();

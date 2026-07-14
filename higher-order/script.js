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

  window.__hoState = state; window.__hoRebuild = rebuild; window.__hoCFG = CFG; window.__hoCurrentD = currentD;
  rebuild(); requestAnimationFrame(frame);
})();

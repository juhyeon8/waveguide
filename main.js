(function () {
  'use strict';
  var WGc = WireWG;      // 물리 코어
  var xLeft = 110, xRight = 110, Ny = 220, y0 = 110;

  var state = { lambda: 140, a: 60, d: 5, aw: 0.8, L: 300, inc: 'plane',
                phase: 0, dPhi: 0.15, paused: false };
  var built = null;   // {Nx, wiresPix, cre, cim, inc, scat, tot, amp, info}
  var el = function (id) { return document.getElementById(id); };
  var cv = { inc: el('cvInc'), scat: el('cvScat'), tot: el('cvTot'), graph: el('cvGraph') };

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

  rebuild();
  requestAnimationFrame(frame);
  window.__wg = { state: state, rebuild: rebuild };   // Task 8 확장용 훅
})();

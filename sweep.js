(function (global) {
  'use strict';
  // params: {a, L, aw, xLeft, y0, Ny}. onProgress(frac). onDone(sweepData)
  // sweepData: { a, L, curves: [{d, pts:[{r, T}]}] }
  function runSweep(params, onProgress, onDone) {
    var a = params.a, L = params.L, aw = params.aw, xLeft = params.xLeft, y0 = params.y0, Ny = params.Ny;
    var ds = [5, 10, 20], nR = 24, rMin = 0.7, rMax = 2.0;
    var jobs = [];
    ds.forEach(function (d) { for (var i = 0; i < nR; i++) jobs.push({ d: d, r: rMin + (rMax - rMin) * i / (nR - 1) }); });
    var curves = ds.map(function (d) { return { d: d, pts: [] }; });
    var Nx = xLeft + L + xLeft, idx = 0;
    function step() {
      if (idx >= jobs.length) { onDone({ a: a, L: L, curves: curves }); return; }
      var job = jobs[idx++], lambda = job.r * 2 * a, k = 2 * Math.PI / lambda;
      var wires = WireWG.buildWires(a, L, d0(job), aw);
      var wiresPix = wires.map(function (w) { return { x: w.x, y: y0 + w.y, aw: w.aw }; });
      var sol = WireWG.solveMoM(wires, k, function (x, y) { return WireWG.incPlane(k, x, y); });
      var table = global.WG.buildHankelTable(k, Nx + Ny + 20);
      var inc = global.WG.computeIncidentGrid(global.WG.makeField(Nx, Ny), function (xc, yc) { return WireWG.incPlane(k, xc, yc); }, xLeft, y0);
      var scat = global.WG.computeScatteredGrid(global.WG.makeField(Nx, Ny), wiresPix, sol[0], sol[1], table, xLeft);
      var tot = global.WG.addComplex(global.WG.makeField(Nx, Ny), inc, scat);
      var amp = global.WG.modeCoefGrid(tot, y0, a);
      var T = global.WG.transmittance(amp, L, xLeft);
      curveFor(curves, job.d).pts.push({ r: job.r, T: T });
      onProgress(idx / jobs.length);
      setTimeout(step, 0);
    }
    function d0(job) { return job.d; }
    function curveFor(cs, d) { for (var i = 0; i < cs.length; i++) if (cs[i].d === d) return cs[i]; }
    step();
  }
  var API = { runSweep: runSweep };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { global.WG = global.WG || {}; Object.assign(global.WG, API); }
})(typeof globalThis !== 'undefined' ? globalThis : this);

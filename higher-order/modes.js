(function (global) {
  'use strict';
  // 진행축 z를 core.js의 위치 첫 인자(x)에 그대로 전달한다 (좌표 어댑터).

  function dAuto(lambda, L, Nmax) {
    var floor = L / Nmax, cap = 0.1 * lambda, target = 0.08 * lambda;
    return Math.min(cap, Math.max(target, floor));
  }

  function modeCoefGridN(field, y0, a, n) {
    var Nx = field.Nx, Ny = field.Ny, re = field.re, im = field.im;
    var jBot = Math.round(y0 - a / 2), jTop = Math.round(y0 + a / 2), span = jTop - jBot;
    var out = new Float32Array(Nx);
    if (span < 1) return out;
    for (var i = 0; i < Nx; i++) {
      var sr = 0, si = 0;
      for (var j = jBot; j <= jTop; j++) {
        var w = Math.sin(n * Math.PI * (j - jBot) / span), idx = i * Ny + j;
        sr += re[idx] * w; si += im[idx] * w;
      }
      out[i] = Math.sqrt(sr * sr + si * si) / span;
    }
    return out;
  }
  function modeCoefComplexAtN(field, y0, a, iPix, n) {
    var Ny = field.Ny, re = field.re, im = field.im;
    var jBot = Math.round(y0 - a / 2), jTop = Math.round(y0 + a / 2), span = jTop - jBot;
    var sr = 0, si = 0;
    for (var j = jBot; j <= jTop; j++) {
      var w = Math.sin(n * Math.PI * (j - jBot) / span), idx = iPix * Ny + j;
      sr += re[idx] * w; si += im[idx] * w;
    }
    return [sr / span, si / span];
  }

  function _kc(n, a) { return n * Math.PI / a; }
  function theoryKappa(n, a, k) { var kc = _kc(n, a); return (k < kc) ? Math.sqrt(kc * kc - k * k) : null; }
  function theoryKz(n, a, k) { var kc = _kc(n, a); return (k > kc) ? Math.sqrt(k * k - kc * kc) : null; }
  function theoryPropAmp(n, y0spec, a, k) {
    var kz = theoryKz(n, a, k); if (kz === null || kz < 1e-12) return null;
    return Math.abs(Math.sin(n * Math.PI * y0spec / a)) / kz;
  }

  function fitWindowZ(z0, L, kappaMin) {
    var lo = 0.2 * L, cap = 0.5 * L, zStart;
    if (kappaMin && isFinite(kappaMin) && kappaMin > 0) {
      zStart = z0 + 2 / kappaMin;
      if (zStart < lo) zStart = lo;
      if (zStart > cap) zStart = cap;
    } else {
      zStart = lo; // ⚠ 차단 모드 없음 → 여유 항 미사용 (NaN 방지)
    }
    var zEnd = 0.7 * L;
    return { zStart: zStart, zEnd: zEnd, valid: zEnd > zStart };
  }
  function _fitLogSlope(xs, amps) {
    var sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0;
    for (var i = 0; i < xs.length; i++) {
      if (amps[i] < 1e-14) continue;
      var lv = Math.log(amps[i]); sx += xs[i]; sy += lv; sxx += xs[i] * xs[i]; sxy += xs[i] * lv; n++;
    }
    if (n < 2) return null;
    return (n * sxy - sx * sy) / (n * sxx - sx * sx);
  }
  function measureKappaN(ampArr, xLeft, win) {
    if (!win.valid) return null;
    var xs = [], amps = [];
    for (var xc = win.zStart; xc <= win.zEnd; xc += 1) {
      var ip = Math.round(xc) + xLeft; if (ip < 0 || ip >= ampArr.length) continue;
      xs.push(xc); amps.push(ampArr[ip]);
    }
    var s = _fitLogSlope(xs, amps);
    return (s === null) ? null : -s;
  }
  function measureKzN(field, y0, a, n, xLeft, win) {
    if (!win.valid) return null;
    var xs = [], phis = [];
    for (var xc = win.zStart; xc <= win.zEnd; xc += 1) {
      var c = modeCoefComplexAtN(field, y0, a, Math.round(xc) + xLeft, n);
      xs.push(xc); phis.push(Math.atan2(c[1], c[0]));
    }
    if (xs.length < 2) return null;
    for (var i = 1; i < phis.length; i++) {
      while (phis[i] - phis[i - 1] > Math.PI) phis[i] -= 2 * Math.PI;
      while (phis[i] - phis[i - 1] < -Math.PI) phis[i] += 2 * Math.PI;
    }
    var sx = 0, sy = 0, sxx = 0, sxy = 0, m = xs.length;
    for (var j = 0; j < m; j++) { sx += xs[j]; sy += phis[j]; sxx += xs[j] * xs[j]; sxy += xs[j] * phis[j]; }
    return Math.abs((m * sxy - sx * sy) / (m * sxx - sx * sx));
  }

  function wallTransmittanceT(core, a, L, d, aw, k) {
    var wires = [], nW = Math.round(L / d) + 1;
    for (var i = 0; i < nW; i++) wires.push({ x: i * d, y: 0, aw: aw });
    var inc = function (x, y) { return [Math.cos(k * y), Math.sin(k * y)]; }; // +y 진행, 벽에 수직
    var sol = core.solveMoM(wires, k, inc), cre = sol[0], cim = sol[1];
    var yProbe = Math.max(5, Math.round(d));
    var z0 = 0.25 * L, z1 = 0.75 * L, s = 0, cnt = 0;
    for (var z = z0; z <= z1; z += 1) {
      var e = core.totalField(wires, cre, cim, k, inc, z, yProbe);
      s += Math.sqrt(e[0] * e[0] + e[1] * e[1]); cnt++;
    }
    return cnt ? s / cnt : 0;
  }

  function computeScene(core, WG, p) {
    var k = 2 * Math.PI / p.lambda, Nx = p.xLeft + p.L + p.xRight;
    var y0cell = p.y0spec - p.a / 2;
    var incFn = function (x, y) { return core.incLine(k, p.z0, y0cell, x, y); };
    var wires = core.buildWires(p.a, p.L, p.d, p.aw);
    var wiresPix = wires.map(function (w) { return { x: w.x, y: p.y0pix + w.y, aw: w.aw }; });
    var wiresPixDraw = wiresPix.map(function (w) { return { x: w.x + p.xLeft, y: w.y }; });
    var sol = core.solveMoM(wires, k, incFn);
    var table = WG.buildHankelTable(k, Nx + p.Ny + 20);
    var inc = WG.computeIncidentGrid(WG.makeField(Nx, p.Ny), incFn, p.xLeft, p.y0pix);
    var scat = WG.computeScatteredGrid(WG.makeField(Nx, p.Ny), wiresPix, sol[0], sol[1], table, p.xLeft);
    var tot = WG.addComplex(WG.makeField(Nx, p.Ny), inc, scat);
    return {
      Nx: Nx, Ny: p.Ny, k: k, d: p.d, wiresPix: wiresPix, wiresPixDraw: wiresPixDraw,
      cre: sol[0], cim: sol[1], inc: inc, scat: scat, tot: tot,
      info: core.cutoffInfo(p.lambda, p.a), dOverLambda: p.d / p.lambda,
      wallT: wallTransmittanceT(core, p.a, p.L, p.d, p.aw, k)
    };
  }

  var API = { dAuto: dAuto, modeCoefGridN: modeCoefGridN, modeCoefComplexAtN: modeCoefComplexAtN, theoryKappa: theoryKappa, theoryKz: theoryKz, theoryPropAmp: theoryPropAmp, fitWindowZ: fitWindowZ, measureKappaN: measureKappaN, measureKzN: measureKzN, wallTransmittanceT: wallTransmittanceT, computeScene: computeScene };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { global.WGM = global.WGM || {}; Object.assign(global.WGM, API); }
})(typeof globalThis !== 'undefined' ? globalThis : this);

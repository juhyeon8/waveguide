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

  var API = { dAuto: dAuto, modeCoefGridN: modeCoefGridN, modeCoefComplexAtN: modeCoefComplexAtN, theoryKappa: theoryKappa, theoryKz: theoryKz, theoryPropAmp: theoryPropAmp };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { global.WGM = global.WGM || {}; Object.assign(global.WGM, API); }
})(typeof globalThis !== 'undefined' ? globalThis : this);

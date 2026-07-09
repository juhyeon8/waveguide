(function (global) {
  'use strict';

  // 그리드 |c₁(x)|: sin 투영, /span 정규화 (reference modeCoefficient와 동일)
  function modeCoefGrid(field, y0, a) {
    var Nx = field.Nx, Ny = field.Ny, re = field.re, im = field.im;
    var jBot = Math.round(y0 - a / 2), jTop = Math.round(y0 + a / 2), span = jTop - jBot;
    var out = new Float32Array(Nx);
    if (span < 1) return out;
    for (var i = 0; i < Nx; i++) {
      var sr = 0, si = 0;
      for (var j = jBot; j <= jTop; j++) {
        var w = Math.sin(Math.PI * (j - jBot) / span), idx = i * Ny + j;
        sr += re[idx] * w; si += im[idx] * w;
      }
      out[i] = Math.sqrt(sr * sr + si * si) / span;
    }
    return out;
  }
  function modeCoefComplexAt(field, y0, a, iPix) {
    var Ny = field.Ny, re = field.re, im = field.im;
    var jBot = Math.round(y0 - a / 2), jTop = Math.round(y0 + a / 2), span = jTop - jBot;
    var sr = 0, si = 0;
    for (var j = jBot; j <= jTop; j++) {
      var w = Math.sin(Math.PI * (j - jBot) / span), idx = iPix * Ny + j;
      sr += re[idx] * w; si += im[idx] * w;
    }
    return [sr / span, si / span];
  }
  // κ 피팅: core.kappaFitWindow 규칙 (셀좌표). ampArr는 픽셀 인덱스라 xLeft 오프셋 적용.
  function measureKappa(ampArr, L, kappaThy, xLeft) {
    var win = wgCutoffWindow(L, kappaThy);
    if (!win.valid) return { kappa: null, valid: false };
    var xs = [], amps = [];
    for (var xc = win.xStart; xc <= win.xEnd; xc += 1) {
      var ip = Math.round(xc) + xLeft;
      if (ip < 0 || ip >= ampArr.length) continue;
      xs.push(xc); amps.push(ampArr[ip]);
    }
    var kap = fitLogSlope(xs, amps);
    return { kappa: kap, valid: kap != null };
  }
  // core.kappaFitWindow 재현 (브라우저에서 core 직접 호출도 가능하나 diag 자립)
  function wgCutoffWindow(L, kappaThy) {
    var xStart = L * 0.15, xEnd = Math.min(L * 0.7, xStart + 2.5 / kappaThy);
    return { xStart: xStart, xEnd: xEnd, valid: (xEnd - xStart) > 0 };
  }
  function fitLogSlope(xs, amps) {
    var sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0;
    for (var i = 0; i < xs.length; i++) {
      if (amps[i] < 1e-14) continue;
      var lv = Math.log(amps[i]); sx += xs[i]; sy += lv; sxx += xs[i] * xs[i]; sxy += xs[i] * lv; n++;
    }
    if (n < 2) return null;
    return -((n * sxy - sx * sy) / (n * sxx - sx * sx));
  }
  // k_z: 전파 영역, modeCoefComplex 위상 언랩 회귀 (셀좌표)
  function measureKzFromGrid(field, y0, a, L, xLeft) {
    var xs = [], phis = [];
    for (var xc = L * 0.2; xc <= L * 0.7; xc += 1) {
      var c = modeCoefComplexAt(field, y0, a, Math.round(xc) + xLeft);
      xs.push(xc); phis.push(Math.atan2(c[1], c[0]));
    }
    for (var i = 1; i < phis.length; i++) {
      while (phis[i] - phis[i - 1] > Math.PI) phis[i] -= 2 * Math.PI;
      while (phis[i] - phis[i - 1] < -Math.PI) phis[i] += 2 * Math.PI;
    }
    var sx = 0, sy = 0, sxx = 0, sxy = 0, n = xs.length;
    for (var j = 0; j < n; j++) { sx += xs[j]; sy += phis[j]; sxx += xs[j] * xs[j]; sxy += xs[j] * phis[j]; }
    return Math.abs((n * sxy - sx * sy) / (n * sxx - sx * sx));
  }
  // 기하평균 (A3): iPixCenter ± halfWidth 픽셀 구간
  function geoMeanAround(ampArr, iPixCenter, halfWidth) {
    var s = 0, cnt = 0;
    for (var i = iPixCenter - halfWidth; i <= iPixCenter + halfWidth; i++) {
      if (i < 0 || i >= ampArr.length) continue;
      var v = ampArr[i]; if (v < 1e-14) v = 1e-14;
      s += Math.log(v); cnt++;
    }
    return cnt ? Math.exp(s / cnt) : 0;
  }
  // 전력 투과율: |c₁(0.88L)/c₁(0.12L)|², 각 기준점 ±0.04L 기하평균 (셀→픽셀)
  function transmittance(ampArr, L, xLeft) {
    var half = Math.round(0.04 * L);
    var inAmp = geoMeanAround(ampArr, Math.round(0.12 * L) + xLeft, half);
    var outAmp = geoMeanAround(ampArr, Math.round(0.88 * L) + xLeft, half);
    if (inAmp < 1e-14) return 0;
    var ratio = outAmp / inAmp;
    return ratio * ratio;
  }
  // 누설: 벽 위(y=±a/2) |E| 평균 (도파관 내부 x 구간)
  function leakage(field, y0, a, xLeft, L) {
    var Ny = field.Ny, re = field.re, im = field.im;
    var jT = Math.round(y0 + a / 2), jB = Math.round(y0 - a / 2);
    var xf = xLeft + Math.round(0.1 * L), xt = xLeft + Math.round(0.9 * L);
    var s = 0, cnt = 0;
    for (var i = xf; i <= xt; i++) {
      var it = i * Ny + jT, ib = i * Ny + jB;
      s += Math.sqrt(re[it] * re[it] + im[it] * im[it]);
      s += Math.sqrt(re[ib] * re[ib] + im[ib] * im[ib]);
      cnt += 2;
    }
    return cnt ? s / cnt : 0;
  }
  // 입구 앞 정재파: x<0 축(y0)의 |E| 최대/최소 → SWR, 반사율
  function swr(field, y0, xLeft) {
    var Ny = field.Ny, re = field.re, im = field.im;
    var mx = 0, mn = 1e9;
    for (var i = 0; i < xLeft; i++) {
      var idx = i * Ny + y0, v = Math.sqrt(re[idx] * re[idx] + im[idx] * im[idx]);
      if (v > mx) mx = v; if (v < mn) mn = v;
    }
    if (mn < 1e-9 || mx < 1e-9) return { swr: null, reflect: null };
    var s = mx / mn, gamma = (s - 1) / (s + 1);
    return { swr: s, reflect: gamma * gamma };
  }
  var API = { modeCoefGrid: modeCoefGrid, modeCoefComplexAt: modeCoefComplexAt,
              measureKappa: measureKappa, measureKzFromGrid: measureKzFromGrid,
              geoMeanAround: geoMeanAround, transmittance: transmittance,
              leakage: leakage, swr: swr };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { global.WG = global.WG || {}; Object.assign(global.WG, API); }
})(typeof globalThis !== 'undefined' ? globalThis : this);

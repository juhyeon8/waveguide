(function (global) {
  'use strict';
  // 진행축 z를 core.js의 위치 첫 인자(x)에 그대로 전달한다 (좌표 어댑터).

  function dAuto(lambda, L, Nmax) {
    var floor = L / Nmax, cap = 0.1 * lambda, target = 0.08 * lambda;
    return Math.min(cap, Math.max(target, floor));
  }

  var API = { dAuto: dAuto };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { global.WGM = global.WGM || {}; Object.assign(global.WGM, API); }
})(typeof globalThis !== 'undefined' ? globalThis : this);

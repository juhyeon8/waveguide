'use strict';
var assert = require('assert');
var core = require('../core.js');
var WG = require('../hankel.js'); Object.assign(WG, require('../field.js'));
var WGM = require('../higher-order/modes.js');

// 프리셋 ② λ=1.5a=90, 중심 소스 y0=a/2=30
var p = { lambda: 90, a: 60, L: 300, d: WGM.dAuto(90, 300, 420), y0spec: 30,
          aw: 0.8, xLeft: 110, xRight: 110, Ny: 220, y0pix: 110, z0: 36 };
var s = WGM.computeScene(core, WG, p);
assert(s.tot && s.tot.Nx === 110 + 300 + 110, 'Nx');
assert(isFinite(s.tot.re[100 * s.Ny + 110]), '장 유한');
assert(s.info.evanescent === false, 'λ=1.5a 전파');
// 관찰 구간 시작에서 mode1 진폭 > 0
var amp1 = WGM.modeCoefGridN(s.tot, p.y0pix, p.a, 1);
assert(amp1[p.xLeft + 150] > 1e-6, 'mode1 실림');
// 중심 소스 → mode2 결합 바닥
var amp2 = WGM.modeCoefGridN(s.tot, p.y0pix, p.a, 2);
assert(amp2[p.xLeft + 150] < amp1[p.xLeft + 150] * 0.05, '중심 소스 mode2 바닥');
console.log('PASS: computeScene (mode1 실림, 중심 mode2 바닥)');

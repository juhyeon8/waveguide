'use strict';
var assert = require('assert');
var WGM = require('../higher-order/modes.js');
var WG = require('../hankel.js');
Object.assign(WG, require('../field.js'));

var Nx = 40, Ny = 220, a = 60, y0 = 110;
var jBot = Math.round(y0 - a / 2), jTop = Math.round(y0 + a / 2), span = jTop - jBot;

// 합성장: E(y) = sin(2π(j-jBot)/span) → n=2만 커야 함 (직교성)
var f = WG.makeField(Nx, Ny);
for (var i = 0; i < Nx; i++) for (var j = jBot; j <= jTop; j++)
  f.re[i * Ny + j] = Math.sin(2 * Math.PI * (j - jBot) / span);

var c1 = WGM.modeCoefGridN(f, y0, a, 1);
var c2 = WGM.modeCoefGridN(f, y0, a, 2);
var c3 = WGM.modeCoefGridN(f, y0, a, 3);
assert(c2[20] > 0.3, 'n=2 결합 커야: ' + c2[20]);
assert(c1[20] < 0.02, 'n=1 거의 0: ' + c1[20]);
assert(c3[20] < 0.02, 'n=3 거의 0: ' + c3[20]);

// 복소 계수: 위 실장에서 im=0 이므로 phase≈0
var cc = WGM.modeCoefComplexAtN(f, y0, a, 20, 2);
assert(Math.abs(cc[1]) < 1e-6, 'im≈0');
console.log('PASS: modeCoefGridN 직교성');

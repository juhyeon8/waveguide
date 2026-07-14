'use strict';
var assert = require('assert');
var WGM = require('../higher-order/modes.js');
var L = 300, z0 = 36;

// 큰 κ → 여유 작음 → 하한 0.2L에 걸림
var w1 = WGM.fitWindowZ(z0, L, 1.0);
assert(Math.abs(w1.zStart - 0.2 * L) < 1e-9, '큰κ→0.2L: ' + w1.zStart);
// 작은 κ=0.01 → z0+200=236 > 0.5L=150 → 상한 0.5L
var w2 = WGM.fitWindowZ(z0, L, 0.01);
assert(Math.abs(w2.zStart - 0.5 * L) < 1e-9, '작은κ→상한0.5L: ' + w2.zStart);
// ⚠ NaN 분기: 차단 모드 없음(null) → 0.2L, NaN 아님
var w3 = WGM.fitWindowZ(z0, L, null);
assert(!isNaN(w3.zStart) && Math.abs(w3.zStart - 0.2 * L) < 1e-9, 'null→0.2L(NaN 아님)');
var w4 = WGM.fitWindowZ(z0, L, NaN);
assert(!isNaN(w4.zStart), 'NaN→NaN 아님');
// 중간 κ: z0 + 2/0.05 = 36+40 = 76, 0.2L=60 → 76
var w5 = WGM.fitWindowZ(z0, L, 0.05);
assert(Math.abs(w5.zStart - 76) < 1e-9, '중간κ: ' + w5.zStart);

// Test measureKzN guards (win.valid and minimum points)
var badWin = { zStart: 100, zEnd: 50, valid: false };
var dummyField = { re: new Float64Array(300 * 300), im: new Float64Array(300 * 300), Nx: 300, Ny: 300 };
assert(WGM.measureKzN(dummyField, 110, 60, 1, 110, badWin) === null, 'measureKzN invalid win → null');

console.log('PASS: fitWindowZ (NaN 분기 포함)');

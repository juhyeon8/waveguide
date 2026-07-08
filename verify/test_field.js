'use strict';
var assert = require('assert');
var core = require('../core.js');           // require.main 아님 → selfTest 실행 안 함
var WG = require('../hankel.js');
Object.assign(WG, require('../field.js'));

var a = 60, L = 120, d = 5, aw = 0.8, lambda = 140;
var k = 2 * Math.PI / lambda;
var xLeft = 110, Ny = 220, y0 = 110;
var Nx = xLeft + L + xLeft;
var wires = core.buildWires(a, L, d, aw);
// 도선 y를 픽셀 좌표로 (y0 기준). core buildWires는 y=±a/2 (셀). 픽셀 = y0 + yCell.
var wiresPix = wires.map(function (w) { return { x: w.x + xLeft, y: y0 + w.y, aw: w.aw }; });
var incFn = function (x, y) { return core.incPlane(k, x, y); };  // 셀좌표 입력
var sol = core.solveMoM(wires, k, incFn), cre = sol[0], cim = sol[1];

var table = WG.buildHankelTable(k, Nx + Ny + 20);
var field = WG.makeField(Nx, Ny);
WG.computeScatteredGrid(field, wiresPix, cre, cim, table, 0); // wiresPix 이미 픽셀이므로 xLeft=0

// 대조점: 도파관 중앙 근처 셀 (x=60, y=0) → 픽셀 (170, 110)
var xc = 60, yc = 0;
var ref = core.scatteredField(wires, cre, cim, k, xc, yc);
var iPix = xc + xLeft, jPix = y0 + yc, idx = iPix * Ny + jPix;
var got = [field.re[idx], field.im[idx]];
assert(Math.abs(got[0] - ref[0]) < 0.05, 're mismatch: got ' + got[0] + ' ref ' + ref[0]);
assert(Math.abs(got[1] - ref[1]) < 0.05, 'im mismatch: got ' + got[1] + ' ref ' + ref[1]);
console.log('PASS: 격자 산란장 ≈ core.scatteredField  (re ' + got[0].toFixed(3) + ' vs ' + ref[0].toFixed(3) + ')');

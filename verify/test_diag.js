'use strict';
var assert = require('assert');
var core = require('../core.js');
var WG = require('../hankel.js');
Object.assign(WG, require('../field.js'));
Object.assign(WG, require('../diag.js'));

var a = 60, L = 300, d = 5, aw = 0.8, lambda = 140;   // 차단 케이스
var k = 2 * Math.PI / lambda, xLeft = 110, Ny = 220, y0 = 110;
var Nx = xLeft + L + xLeft;
var wires = core.buildWires(a, L, d, aw);
var wiresPix = wires.map(function (w) { return { x: w.x, y: y0 + w.y, aw: w.aw }; });
var incFn = function (x, y) { return core.incPlane(k, x, y); };
var sol = core.solveMoM(wires, k, incFn), cre = sol[0], cim = sol[1];

var table = WG.buildHankelTable(k, Nx + Ny + 20);
var inc = WG.computeIncidentGrid(WG.makeField(Nx, Ny), function (xc, yc) { return core.incPlane(k, xc, yc); }, xLeft, y0);
var scat = WG.computeScatteredGrid(WG.makeField(Nx, Ny), wiresPix, cre, cim, table, xLeft);
var tot = WG.addComplex(WG.makeField(Nx, Ny), inc, scat);

var amp = WG.modeCoefGrid(tot, y0, a);
var info = core.cutoffInfo(lambda, a);
var m = WG.measureKappa(amp, L, info.kappa, xLeft);
var pct = m.kappa / info.kappa * 100;
console.log('그리드 κ = ' + pct.toFixed(1) + '% (이론 대비)');
assert(pct > 85 && pct < 115, '그리드 κ 벗어남: ' + pct.toFixed(1) + '%');
console.log('PASS: 그리드 modeCoefGrid로 κ ±15% 유지 (C1)');

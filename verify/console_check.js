'use strict';
var assert = require('assert');
var core = require('../core.js');
var WG = require('../hankel.js');
Object.assign(WG, require('../field.js'));
Object.assign(WG, require('../diag.js'));

var a = 60, L = 300, aw = 0.8, xLeft = 110, Ny = 220, y0 = 110;
var Nx = xLeft + L + xLeft;

function run(lambda, d) {
  var k = 2 * Math.PI / lambda;
  var wires = core.buildWires(a, L, d, aw);
  var wiresPix = wires.map(function (w) { return { x: w.x, y: y0 + w.y, aw: w.aw }; });
  var sol = core.solveMoM(wires, k, function (x, y) { return core.incPlane(k, x, y); });
  var table = WG.buildHankelTable(k, Nx + Ny + 20);
  var inc = WG.computeIncidentGrid(WG.makeField(Nx, Ny), function (xc, yc) { return core.incPlane(k, xc, yc); }, xLeft, y0);
  var scat = WG.computeScatteredGrid(WG.makeField(Nx, Ny), wiresPix, sol[0], sol[1], table, xLeft);
  var tot = WG.addComplex(WG.makeField(Nx, Ny), inc, scat);
  var amp = WG.modeCoefGrid(tot, y0, a);
  var info = core.cutoffInfo(lambda, a);
  var T = WG.transmittance(amp, L, xLeft);
  var leak = WG.leakage(tot, y0, a, xLeft, L);
  var diag = { lambda: lambda, d: d, r: lambda / (2 * a), T: T, leak: leak, evan: info.evanescent };
  if (info.evanescent) {
    var m = WG.measureKappa(amp, L, info.kappa, xLeft);
    diag.pct = m.kappa / info.kappa * 100;
  } else {
    diag.pct = WG.measureKzFromGrid(tot, y0, a, L, xLeft) / info.kguide * 100;
  }
  return diag;
}

// (b) κ·k_z ±15% — 기본 d=5, 대표 λ
console.log('=== (b) 이론 대비 정확도 (d=5) ===');
[180, 140, 110, 90, 70].forEach(function (lam) {
  var r = run(lam, 5);
  var kind = r.evan ? 'κ' : 'k_z';
  console.log('λ=' + lam + ' (λ/2a=' + r.r.toFixed(2) + ')  ' + kind + ' ' + r.pct.toFixed(1) + '%  T=' + (r.T * 100).toFixed(1) + '%');
  assert(r.pct > 85 && r.pct < 115, 'λ=' + lam + ' 정확도 벗어남: ' + r.pct.toFixed(1) + '%');
});

// (a) λ/2a=1 무릎: 전파(λ<2a) T가 차단(λ>2a) T보다 뚜렷이 큼
console.log('\n=== (a) λ/2a=1 투과 무릎 (d=5) ===');
var Tprop = run(90, 5).T, Tcut = run(150, 5).T;
console.log('T(λ/2a=0.75)=' + (Tprop * 100).toFixed(1) + '%   T(λ/2a=1.25)=' + (Tcut * 100).toFixed(1) + '%');
assert(Tprop > Tcut + 0.2, '무릎이 약함: Tprop=' + Tprop.toFixed(3) + ' Tcut=' + Tcut.toFixed(3));

// (c) d↑ → 무릎 무뎌짐 + 누설 상승 (차단 λ=150 고정)
console.log('\n=== (c) d 증가 → 누설 상승 (λ=150, 차단) ===');
var d5 = run(150, 5), d10 = run(150, 10), d20 = run(150, 20);
console.log('d=5  leak=' + d5.leak.toFixed(4) + '  T=' + (d5.T * 100).toFixed(1) + '%');
console.log('d=10 leak=' + d10.leak.toFixed(4) + '  T=' + (d10.T * 100).toFixed(1) + '%');
console.log('d=20 leak=' + d20.leak.toFixed(4) + '  T=' + (d20.T * 100).toFixed(1) + '%');
assert(d20.leak > d5.leak, '누설이 d와 함께 오르지 않음');

console.log('\n전체 PASS — 콘솔 수치 검증 통과 (스펙 §7-2, 완료판정 C1)');

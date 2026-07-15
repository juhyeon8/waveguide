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

// --- Task 12: kappaWindowN & measureKappaN per-mode 테스트 ---

// Test kappaWindowN: 엔진 일치
var kappaThy1 = 1 / 6.6, d1 = 7.9;  // ①n3 류: unresolvable (1/κ=6.6 < d=7.9)
var kappaThy2 = 1 / 7.1, d2 = 5.0;  // ②n3 류: resolvable (1/κ=7.1 > d=5.0)
var L_test = 300;

var w_unres = WGM.kappaWindowN(L_test, kappaThy1, d1);
assert(w_unres.valid, 'kappaWindowN unresolvable: valid=true');
assert(!w_unres.resolvable, 'kappaWindowN unresolvable: resolvable=false (1/κ<d)');
assert(Math.abs(w_unres.zStart - 0.15 * L_test) < 1e-9, 'zStart == 0.15L');

var w_res = WGM.kappaWindowN(L_test, kappaThy2, d2);
assert(w_res.valid, 'kappaWindowN resolvable: valid=true');
assert(w_res.resolvable, 'kappaWindowN resolvable: resolvable=true (1/κ≥d)');
assert(Math.abs(w_res.zStart - 0.15 * L_test) < 1e-9, 'zStart == 0.15L');

// Test kappaWindowN: 여유 작을 때 zEnd = zStart + 2.5/κ (캡 전)
var kappaBig = 1.0;  // 여유 2.5/κ = 2.5 < 0.7L-0.15L=210
var w_cap = WGM.kappaWindowN(L_test, kappaBig, 0.01);  // d 매우 작음 → resolvable=true
var expectedEnd = 0.15 * L_test + 2.5 / kappaBig;
assert(Math.abs(w_cap.zEnd - expectedEnd) < 1e-9, 'zEnd == zStart+2.5/κ (κ=1.0): ' + w_cap.zEnd + ' vs ' + expectedEnd);

// Test kappaWindowN: 여유 큰 κ → zEnd = 0.7L (캡)
var kappaSmall = 0.01;  // 여유 2.5/κ = 250 > 0.7L-0.15L=210 → 캡
var w_ceiling = WGM.kappaWindowN(L_test, kappaSmall, 0.001);  // d 매우 작음 → resolvable=true
assert(Math.abs(w_ceiling.zEnd - 0.7 * L_test) < 1e-9, 'zEnd == 0.7L (κ very small): ' + w_ceiling.zEnd);

// Test kappaWindowN: invalid (negative/zero κ)
var w_invalid = WGM.kappaWindowN(L_test, 0, 0.01);
assert(!w_invalid.valid, 'κ=0 → valid=false');
var w_invalid_neg = WGM.kappaWindowN(L_test, -0.1, 0.01);
assert(!w_invalid_neg.valid, 'κ<0 → valid=false');
var w_invalid_nan = WGM.kappaWindowN(L_test, NaN, 0.01);
assert(!w_invalid_nan.valid, 'κ=NaN → valid=false');

console.log('PASS: kappaWindowN (엔진 일치, resolvable, invalid)');

// Test measureKappaN: 깨끗한 synthetic 배열 (exp(-κ·z))
var kappaTrue = 0.1;  // 알려진 κ = 0.1
var ampSynthetic = new Float32Array(200);
for (var i = 0; i < ampSynthetic.length; i++) {
  ampSynthetic[i] = Math.exp(-kappaTrue * i);
}
var dSmall = 0.001;  // resolvable=true 보장 (1/κ=10 >> d=0.001)
var win_res = WGM.kappaWindowN(L_test, kappaTrue, dSmall);
assert(win_res.resolvable, 'synthetic test: resolvable window 확보');
var kappaMeas = WGM.measureKappaN(ampSynthetic, 0, win_res);
assert(kappaMeas !== null, 'synthetic κ 측정: not null');
var relErr = Math.abs(kappaMeas - kappaTrue) / kappaTrue;
assert(relErr < 0.02, 'synthetic κ 오차 <2%: ' + relErr.toFixed(3) + ' (meas=' + kappaMeas.toFixed(4) + ' vs true=' + kappaTrue + ')');

console.log('PASS: measureKappaN synthetic (κ=0.1, relErr<2%)');

// Test measureKappaN: unresolvable 창 → null
var kappaBad = 0.05;  // 1/κ = 20
var dBad = 25;        // d > 1/κ → unresolvable
var win_unres = WGM.kappaWindowN(L_test, kappaBad, dBad);
assert(!win_unres.resolvable, 'unresolvable window setup');
var ampDummy = new Float32Array(200);
for (var i = 0; i < ampDummy.length; i++) ampDummy[i] = Math.exp(-kappaBad * i);
var kappaMeas_unres = WGM.measureKappaN(ampDummy, 0, win_unres);
assert(kappaMeas_unres === null, 'unresolvable window → null');

console.log('PASS: measureKappaN unresolvable → null');

// Test measureKappaN: 평탄 배열 (상수 진폭) → null (기울기≈0)
var ampFlat = new Float32Array(200);
for (var i = 0; i < ampFlat.length; i++) ampFlat[i] = 1.0;
var win_flat = WGM.kappaWindowN(L_test, 0.1, 0.001);  // resolvable window
var kappaMeas_flat = WGM.measureKappaN(ampFlat, 0, win_flat);
assert(kappaMeas_flat === null, 'flat array (기울기≈0) → null');

console.log('PASS: measureKappaN flat → null');

// Test measureKappaN: 성장 배열 (exp(+κz)) → null (기울기>0, 비물리)
var kappaGrow = 0.05;
var ampGrow = new Float32Array(200);
for (var i = 0; i < ampGrow.length; i++) {
  ampGrow[i] = Math.exp(kappaGrow * i);  // 성장 (감쇠 아님)
}
var win_grow = WGM.kappaWindowN(L_test, 0.1, 0.001);  // 감쇠 κ로 설정하지만 배열은 성장
var kappaMeas_grow = WGM.measureKappaN(ampGrow, 0, win_grow);
assert(kappaMeas_grow === null, 'growing array (기울기>0) → null');

console.log('PASS: measureKappaN growing → null');

// Test measureKappaN: 바닥 신호 (start/end 비율 < 1.5)
var ampWeak = new Float32Array(200);
ampWeak[0] = 1.0;
ampWeak[199] = 0.9;  // 거의 안 감쇠 → 비율 ~0.9 < 1.5
var win_weak = WGM.kappaWindowN(L_test, 0.1, 0.001);
var kappaMeas_weak = WGM.measureKappaN(ampWeak, 0, win_weak);
assert(kappaMeas_weak === null, 'weak decay (start/end<1.5) → null');

console.log('PASS: measureKappaN floor/weak decay → null');

console.log('\n=== ALL Task 12 Tests PASSED ===');

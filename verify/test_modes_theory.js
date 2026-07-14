'use strict';
var assert = require('assert');
var WGM = require('../higher-order/modes.js');
var a = 60;

// λ=1.5a=90 → k=2π/90. n=1 전파, n=2·3 차단
var k = 2 * Math.PI / 90;
assert(WGM.theoryKz(1, a, k) > 0, 'n=1 전파');
assert(WGM.theoryKz(2, a, k) === null, 'n=2 차단→kz null');
assert(WGM.theoryKappa(2, a, k) > 0, 'n=2 κ>0');
assert(Math.abs(WGM.theoryKz(1, a, k) - Math.sqrt(k * k - Math.pow(Math.PI / a, 2))) < 1e-12, 'kz 값');

// 중심 y0=a/2: n=2 결합 0 → propAmp 0 (전파일 때에도)
var k2 = 2 * Math.PI / 45; // λ=0.75a, n=1,2 전파
assert(WGM.theoryPropAmp(2, a / 2, a, k2) < 1e-9, '중심 n=2 propAmp 0');
assert(WGM.theoryPropAmp(2, a / 4, a, k2) > 0, 'y0=a/4 n=2 propAmp>0');
console.log('PASS: theory');

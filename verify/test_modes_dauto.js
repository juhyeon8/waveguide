'use strict';
var assert = require('assert');
var WGM = require('../higher-order/modes.js');

// 정상 구간: 0.055λ 반환 (floor·cap 미발동). λ=24(=0.4a), L=300, Nmax=420 → floor=0.714, target=1.32
assert(Math.abs(WGM.dAuto(24, 300, 420) - 0.055 * 24) < 1e-9, 'normal→0.055λ');
// λ=150(=2.5a): 0.055*150=8.25, floor=0.714, cap=15 → 8.25
assert(Math.abs(WGM.dAuto(150, 300, 420) - 8.25) < 1e-9, 'large λ→0.055λ');
// floor 발동: Nmax를 작게(=10) → floor=30. 0.055*24=1.32, cap=0.1*24=2.4 → min(2.4,max(1.32,30))=2.4
assert(Math.abs(WGM.dAuto(24, 300, 10) - 2.4) < 1e-9, 'floor>cap → cap(0.1λ) 상한');
// 항상 d/λ ≤ 0.1 (자동 모드 벽 무결성 보장)
assert(WGM.dAuto(24, 300, 420) / 24 <= 0.1 + 1e-9, 'd/λ≤0.1');
console.log('PASS: dAuto');

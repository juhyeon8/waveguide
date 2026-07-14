'use strict';
var assert = require('assert');
var core = require('../core.js');
var WGM = require('../higher-order/modes.js');
var a = 60, L = 200, aw = 0.8, k = 2 * Math.PI / 90;

var Tdense = WGM.wallTransmittanceT(core, a, L, 2, aw, k);   // 촘촘
var Tsparse = WGM.wallTransmittanceT(core, a, L, 12, aw, k);  // 성김
assert(Tdense >= 0 && Tsparse >= 0, '음수 아님');
assert(Tsparse > Tdense, 'd 커지면 |T| 증가해야: dense ' + Tdense.toFixed(3) + ' sparse ' + Tsparse.toFixed(3));
console.log('PASS: wallTransmittanceT 단조 (dense ' + Tdense.toFixed(3) + ' < sparse ' + Tsparse.toFixed(3) + ')');

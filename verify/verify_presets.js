'use strict';
var core = require('../core.js');
var WG = require('../hankel.js'); Object.assign(WG, require('../field.js'));
var WGM = require('../higher-order/modes.js');
var CFG = { a: 60, L: 300, xLeft: 110, xRight: 110, Ny: 220, y0pix: 110, aw: 0.8, Nmax: 420, z0: 36 };

function run(name, ratio, y0ratio) {
  var lambda = ratio * CFG.a, y0spec = y0ratio * CFG.a, k = 2 * Math.PI / lambda;
  var p = { lambda: lambda, a: CFG.a, L: CFG.L, d: WGM.dAuto(lambda, CFG.L, CFG.Nmax), y0spec: y0spec,
    aw: CFG.aw, xLeft: CFG.xLeft, xRight: CFG.xRight, Ny: CFG.Ny, y0pix: CFG.y0pix, z0: CFG.z0 };
  var s = WGM.computeScene(core, WG, p);
  var kappas = [1, 2, 3].map(function (n) { return WGM.theoryKappa(n, CFG.a, k); }).filter(function (v) { return v; });
  var win = WGM.fitWindowZ(CFG.z0, CFG.L, kappas.length ? Math.min.apply(null, kappas) : null);
  console.log('\n[' + name + '] λ=' + ratio + 'a y₀=' + y0ratio.toFixed(3) + 'a d=' + p.d.toFixed(2) +
    ' |T|=' + s.wallT.toFixed(3) + ' d/λ=' + s.dOverLambda.toFixed(3));
  [1, 2, 3].forEach(function (n) {
    var coup = Math.abs(Math.sin(n * Math.PI * y0spec / CFG.a));
    var kz = WGM.theoryKz(n, CFG.a, k), kap = WGM.theoryKappa(n, CFG.a, k);
    var amp = WGM.modeCoefGridN(s.tot, CFG.y0pix, CFG.a, n);
    var msg = '  n=' + n + ' 결합=' + coup.toFixed(3) + ' ';
    if (coup < 0.02) msg += '여기 안됨(마디)';
    else if (kz) { var m = WGM.measureKzN(s.tot, CFG.y0pix, CFG.a, n, CFG.xLeft, win);
      msg += '전파 k_z ' + (m != null ? m.toFixed(4) : '—') + '/' + kz.toFixed(4) + (m != null ? ' (' + (m / kz * 100).toFixed(0) + '%)' : ''); }
    else if (kap) {
      var kwin = WGM.kappaWindowN(CFG.L, kap, p.d);
      var mk = WGM.measureKappaN(amp, CFG.xLeft, kwin);
      if (mk != null) {
        var pct = mk / kap * 100;
        var band = pct > 85 && pct < 115 ? '[±15% OK]' : '[밴드 벗어남]';
        msg += '차단 κ ' + mk.toFixed(4) + '/' + kap.toFixed(4) + ' (' + pct.toFixed(0) + '%) ' + band;
      } else if (!kwin.resolvable) {
        msg += '차단 κ 측정 불가(감쇠길이 1/κ=' + (1/kap).toFixed(1) + '셀 < 도선간격 d=' + p.d.toFixed(1) + '셀, 분해능 한계)';
      } else {
        msg += '차단 κ 측정 불가(수치 바닥/분해능 한계)';
      }
    }
    console.log(msg);
  });
}
run('① 완전차단', 2.4, 0.5);
run('② 단일모드', 1.5, 0.5);
run('③ 2모드', 0.8, 0.25);
run('④ 3모드', 0.55, 1 / 6);

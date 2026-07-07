# 도선 배열 도파관 시뮬레이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 도선 두 줄로 도파관 벽을 만들어, 입사파가 도선 전류를 강제하고 그 산란파가 내부에서 차단(cutoff)을 만드는 과정을 3장 패널 + 진단 그래프 + T(λ) 스윕으로 보여주는 강의 시연용 인터랙티브 HTML(file:// 더블클릭 실행) 시뮬레이션.

**Architecture:** 검증된 물리 코어(`core.js` = wire_waveguide_core.js 원본)를 수정 없이 이식하고, 기존 도파관 시뮬(`reference/`)의 색 매핑·그리드 장 골격·mm 규약을 재사용한다. 도선의 복소 진폭을 다루기 위해 그리드 장 합산(`addWireSource`)과 전류 위상자 렌더(`drawWirePhasors`)만 신규 확장한다. 물리 수치는 node 콘솔 assert로 자동 검증, 렌더·애니메이션은 브라우저 육안 체크리스트로 검증한다.

**Tech Stack:** Vanilla JS (ES5 스타일, IIFE 모듈), 클래식 `<script src>`, Canvas 2D, node(콘솔 검증 전용). 빌드 도구·npm 의존성·ES 모듈·fetch 없음.

## Global Constraints

물리 규약·구현지시에서 온 프로젝트 전역 불변 규칙. 모든 태스크에 암묵 적용된다.

- **인과 방향**: 모든 라벨·캡션·주석은 "도선 표면 E=0 조건이 산란파를 강제 → 상쇄·차단은 그 결과" 순서. "상쇄가 차단을 일으킨다" 류 인과 역전 금지. (프롬프트 §1-1)
- **용어**: evanescent = "감쇠파" (증발장·소멸파 금지). 도선이 내는 파 = "산란파" (복사파 금지). 차단 = "차단(cutoff)". (§1-2)
- **차단 영역 위상 언어 금지**: λ > 2a에서 c₁(x)의 위상을 그래프·수치·라벨에 절대 표시하지 않는다. "위상 반대", "위상차로 상쇄"를 z(진행)방향에 쓰지 않는다. (§1-3)
- **편광 고정 표기**: UI에 "편광: E∥도선 — 이 편광에는 TEM 모드가 없음" 고정. (§1-4)
- **투과율 표기**: 전파(λ<2a)는 전력 투과율 T=|c₁(0.88L)/c₁(0.12L)|²를 %. 차단(λ>2a)은 "진폭 감쇠 = ○○ dB (L 기준)" + "○○ dB/mm". (§1-5)
- **누설 바닥 캡션**: "투과가 0에 닿지 않는 것은 유한 도선 벽의 누설 때문 — d를 줄이면 바닥이 내려간다." "시뮬레이션 한계"라 쓰지 않는다. (§1-6)
- **core.js 원본 수정 금지**: wire_waveguide_core.js를 그대로 `core.js`로 쓴다.
- **kappaFitWindow 규칙 고정**: 시작 0.15L, 끝 min(0.7L, 시작+2.5/κ). reference main.js의 `computeFitInterval`은 쓰지 않는다.
- **위상자 부호 = 장과 통일(A6)**: 도선 순시 전류값 = `c.re·cosφ + c.im·sinφ` (장 렌더 `re·cosφ+im·sinφ`와 동일 부호).
- **투과율·SWR·스윕은 평면파 전용(A1·A2)**: 선원파 입사 시 숨김/비활성.
- **입출구 |c₁| 완화 = 기하평균(A3)**: `exp(mean(log|c₁|))`.
- **a 슬라이더 step=2(C2)**: 짝수 픽셀만 허용.
- **mm/셀 = 2 규약(D8)**: 내부 상태는 셀, 표기는 mm(×2), 주파수 f = 3e11/λ_mm.
- **더블클릭 실행**: ES 모듈·로컬 fetch·Web Worker 금지. `<link>`·클래식 `<script src>`만.
- **한국어 UI·주석.**

**참조 문서(우선순위 순):** `구현_프롬프트_도선도파관.md`(물리 규약 불변) > `docs/specs/2026-07-08-도선도파관-design.md`(스펙) > `superpowers_구현지시_0708.md`(A1~A7).

---

## File Structure

```
core.js       — wire_waveguide_core.js 원본 그대로 복사 (수정 금지)
hankel.js     — reference/hankel.js 그대로 (buildHankelTable 룩업)
field.js      — 그리드 복소장: makeField/addComplex/subtractComplex 재사용 + addWireSource(신규 복소 가중 합산)
diag.js       — 진단: 그리드 modeCoefficient, κ피팅(core.kappaFitWindow), k_z, T(기하평균), 스윕, 누설·SWR
render.js     — colorForValue/drawField/drawGraph/updateOverlays 재사용 + drawWirePhasors(신규) + drawSweep(신규)
sweep.js      — T(λ/2a) 스윕 chunked 계산 (평면파 전용)
main.js       — 상태·슬라이더·프리셋·경고·애니메이션 루프·A1/A2 분기
index.html    — 5패널 + 사이드바 UI (한국어)
style.css     — reference/style.css 테마 재사용 + 단일열 레이아웃·게이지·위상자 범례·프리셋
verify/console_check.js — node 자동 검증 스크립트 (assert)
```

의존 로드 순서: `hankel → core → field → diag → render → sweep → main`.

**좌표 규약(스펙 §11):** `xPix = xCell + xLeft`, `xLeft = 110`, `xRight = 110`, `Nx = xLeft + L + xRight`, `Ny = 220`, `y0 = 110`. 도선 벽 y = y0 ± a/2 (픽셀). 도파관 입구 xCell=0 → 픽셀 110.

---

## Task 1: 코어·룩업 이식 + selfTest 재확인

**Files:**
- Create: `core.js` (= `wire_waveguide_core.js` 원본 복사)
- Create: `hankel.js` (= `reference/hankel.js` 원본 복사)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `WireWG` (globalThis): `buildWires(a,L,d,aw)→[{x,y,aw}]`, `incPlane(k,x,y)→[re,im]`, `incLine(k,xs,ys,x,y)→[re,im]`, `solveMoM(wires,k,incFn)→[Float64Array cre, Float64Array cim]`, `totalField/scatteredField(...)→[re,im]`, `modeCoefC(wires,cre,cim,k,incFn,a,x,nY)→[re,im]`, `kappaFitWindow(L,κ)→{xStart,xEnd,valid}`, `fitKappa(xs,amps)→κ`, `measureKz(xs,phis)→kz`, `cutoffInfo(lambda,a)→{evanescent,kappa,kguide}`
  - `WG` (globalThis): `buildHankelTable(k,rMax,dx)→{re,im,k,dx,n}`, `hankel0(x)→{re,im}`

- [ ] **Step 1: core.js / hankel.js 복사**

```bash
cp wire_waveguide_core.js core.js
cp reference/hankel.js hankel.js
```

- [ ] **Step 2: core selfTest 실행 (이식 후 재확인)**

Run: `node core.js`
Expected 출력 (5줄 전부 PASS):
```
평면파·차단 λ=180:  κ 99.9% PASS
평면파·차단 λ=140:  κ 100.4% PASS
선원파·차단 λ=140:  κ 100.1% PASS
평면파·전파 λ=90:  k_z 100.6% PASS
선원파·전파 λ=90:  k_z 100.5% PASS

전체 PASS — 물리 코어 정상
```

- [ ] **Step 3: hankel.js가 node에서 로드되는지 확인**

Run: `node -e "var W=require('./hankel.js'); var t=W.buildHankelTable(0.1,100); console.log('table n=',t.n, 're[10]=',t.re[10].toFixed(4));"`
Expected: `table n= ...` 형태로 숫자 출력 (에러 없음)

- [ ] **Step 4: Commit**

```bash
git add core.js hankel.js
git commit -m "chore: 검증된 물리 코어(core.js)·Hankel 룩업(hankel.js) 이식, selfTest PASS 확인"
```

---

## Task 2: 그리드 복소장 — addWireSource

**Files:**
- Create: `field.js`
- Test: `verify/test_field.js`

**Interfaces:**
- Consumes: `WG.buildHankelTable` (Task 1), core `totalField`(대조용, Task 1)
- Produces: `WG.makeField(Nx,Ny)→{re,im,Nx,Ny}`, `WG.addWireSource(field, wire, cre_j, cim_j, table, xLeft)→field`, `WG.computeScatteredGrid(field, wires, cre, cim, table, xLeft)→field`, `WG.computeIncidentGrid(field, k, incFnCell, xLeft)→field`, `WG.addComplex(dst,a,b)`, `WG.subtractComplex(dst,a,b)`

**설명:** reference `field.js`의 `addOneSource`는 실수 부호(±1)만 곱한다. 도선은 복소 진폭 c_j이므로 복소 곱: `E += c_j · H0(k r)` → `re += cre·h_re − cim·h_im`, `im += cre·h_im + cim·h_re`. 격자 픽셀 x는 셀좌표 = `iPix − xLeft`.

- [ ] **Step 1: 실패 테스트 작성** — 격자 산란장이 core.scatteredField와 한 점에서 일치

`verify/test_field.js`:
```js
'use strict';
var assert = require('assert');
var core = require('./core.js');           // require.main 아님 → selfTest 실행 안 함
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
```

- [ ] **Step 2: 실패 확인**

Run: `node verify/test_field.js`
Expected: FAIL — `Cannot find module '../field.js'` 또는 `computeScatteredGrid is not a function`

- [ ] **Step 3: field.js 구현**

`field.js`:
```js
(function (global) {
  'use strict';
  function makeField(Nx, Ny) {
    return { re: new Float32Array(Nx * Ny), im: new Float32Array(Nx * Ny), Nx: Nx, Ny: Ny };
  }
  // 도선 하나의 복소 산란장 누적: E += c_j·H0(k r)
  function addWireSource(field, wire, cre_j, cim_j, table, xLeft) {
    var Nx = field.Nx, Ny = field.Ny, re = field.re, im = field.im;
    var sx = wire.x + xLeft, sy = wire.y, aw = wire.aw;
    var tre = table.re, tim = table.im, kdx = table.k / table.dx, maxn = table.n;
    for (var i = 0; i < Nx; i++) {
      var dx = i - sx, dx2 = dx * dx, base = i * Ny;
      for (var j = 0; j < Ny; j++) {
        var dy = j - sy;
        var r = Math.sqrt(dx2 + dy * dy);
        if (r < aw) r = aw;                 // 자기 표면 클램프 (H0 발산 방지)
        var f = r * kdx, n = f | 0; if (n >= maxn) n = maxn - 1;
        var t = f - n;
        var hre = tre[n] + (tre[n + 1] - tre[n]) * t;
        var him = tim[n] + (tim[n + 1] - tim[n]) * t;
        var idx = base + j;
        re[idx] += cre_j * hre - cim_j * him;
        im[idx] += cre_j * him + cim_j * hre;
      }
    }
    return field;
  }
  function computeScatteredGrid(field, wiresPix, cre, cim, table, xLeft) {
    for (var j = 0; j < wiresPix.length; j++)
      addWireSource(field, wiresPix[j], cre[j], cim[j], table, xLeft);
    return field;
  }
  // 입사장: 셀좌표(iPix−xLeft, jPix−y0 아님 — 입사함수는 셀 x,y를 받음)
  // incFnCell(xCell, yCell) → [re,im]
  function computeIncidentGrid(field, incFnCell, xLeft, y0) {
    var Nx = field.Nx, Ny = field.Ny, re = field.re, im = field.im;
    for (var i = 0; i < Nx; i++) {
      var xCell = i - xLeft, base = i * Ny;
      for (var j = 0; j < Ny; j++) {
        var yCell = j - y0;
        var e = incFnCell(xCell, yCell);
        var idx = base + j;
        re[idx] = e[0]; im[idx] = e[1];
      }
    }
    return field;
  }
  function addComplex(dst, a, b) {
    var re = dst.re, im = dst.im, are = a.re, aim = a.im, bre = b.re, bim = b.im;
    for (var i = 0; i < re.length; i++) { re[i] = are[i] + bre[i]; im[i] = aim[i] + bim[i]; }
    return dst;
  }
  function subtractComplex(dst, a, b) {
    var re = dst.re, im = dst.im, are = a.re, aim = a.im, bre = b.re, bim = b.im;
    for (var i = 0; i < re.length; i++) { re[i] = are[i] - bre[i]; im[i] = aim[i] - bim[i]; }
    return dst;
  }
  var API = { makeField: makeField, addWireSource: addWireSource,
              computeScatteredGrid: computeScatteredGrid,
              computeIncidentGrid: computeIncidentGrid,
              addComplex: addComplex, subtractComplex: subtractComplex };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { global.WG = global.WG || {}; Object.assign(global.WG, API); }
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 4: 통과 확인**

Run: `node verify/test_field.js`
Expected: `PASS: 격자 산란장 ≈ core.scatteredField ...`

- [ ] **Step 5: Commit**

```bash
git add field.js verify/test_field.js
git commit -m "feat: 도선 복소 진폭 격자 산란장(addWireSource) + core 대조 테스트"
```

---

## Task 3: 진단 모듈 — 그리드 modeCoefficient·κ·k_z·T (C1 재검증)

**Files:**
- Create: `diag.js`
- Test: `verify/console_check.js` (부분 — Task 6에서 완성)

**Interfaces:**
- Consumes: core `cutoffInfo/kappaFitWindow/fitKappa/measureKz`, `WG` 격자 장(Task 2)
- Produces: `WG.modeCoefGrid(field, y0, a)→Float32Array`(|c₁(x)| per 픽셀 x), `WG.modeCoefComplexAt(field, y0, a, iPix)→[re,im]`, `WG.measureKappa(ampArr, L, kappaThy, xLeft)→{kappa,pct,valid}`, `WG.measureKzFromGrid(field, y0, a, L, xLeft)→kz`, `WG.geoMeanAround(ampArr, iPixCenter, halfWidth)→number`, `WG.transmittance(ampArr, L, xLeft)→number`(전력비), `WG.leakage(field, y0, a, xLeft, L)→number`, `WG.swr(field, y0, xLeft)→{swr,reflect}`

**설명(C1):** 그리드 기반 `modeCoefGrid`는 reference `modeCoefficient`와 동일하게 `sin(π(j−jBot)/span)` 투영·`/span` 정규화. core의 `modeCoefC`(/nY)와 정규화 상수는 다르지만 κ(로그 기울기)·T(비율)에서 소거된다. Task 6 콘솔 검증에서 ±15% 재확인.

- [ ] **Step 1: 실패 테스트 작성** — 그리드 κ가 core selfTest 값(이론 ±15%)과 일치

`verify/test_diag.js`:
```js
'use strict';
var assert = require('assert');
var core = require('./core.js');
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
```

- [ ] **Step 2: 실패 확인**

Run: `node verify/test_diag.js`
Expected: FAIL — `Cannot find module '../diag.js'`

- [ ] **Step 3: diag.js 구현**

`diag.js`:
```js
(function (global) {
  'use strict';
  var core = (typeof require !== 'undefined') ? null : null; // 브라우저는 WireWG 전역 사용

  // 그리드 |c₁(x)|: sin 투영, /span 정규화 (reference modeCoefficient와 동일)
  function modeCoefGrid(field, y0, a) {
    var Nx = field.Nx, Ny = field.Ny, re = field.re, im = field.im;
    var jBot = Math.round(y0 - a / 2), jTop = Math.round(y0 + a / 2), span = jTop - jBot;
    var out = new Float32Array(Nx);
    if (span < 1) return out;
    for (var i = 0; i < Nx; i++) {
      var sr = 0, si = 0;
      for (var j = jBot; j <= jTop; j++) {
        var w = Math.sin(Math.PI * (j - jBot) / span), idx = i * Ny + j;
        sr += re[idx] * w; si += im[idx] * w;
      }
      out[i] = Math.sqrt(sr * sr + si * si) / span;
    }
    return out;
  }
  function modeCoefComplexAt(field, y0, a, iPix) {
    var Ny = field.Ny, re = field.re, im = field.im;
    var jBot = Math.round(y0 - a / 2), jTop = Math.round(y0 + a / 2), span = jTop - jBot;
    var sr = 0, si = 0;
    for (var j = jBot; j <= jTop; j++) {
      var w = Math.sin(Math.PI * (j - jBot) / span), idx = iPix * Ny + j;
      sr += re[idx] * w; si += im[idx] * w;
    }
    return [sr / span, si / span];
  }
  // κ 피팅: core.kappaFitWindow 규칙 (셀좌표). ampArr는 픽셀 인덱스라 xLeft 오프셋 적용.
  function measureKappa(ampArr, L, kappaThy, xLeft) {
    var win = wgCutoffWindow(L, kappaThy);
    if (!win.valid) return { kappa: null, valid: false };
    var xs = [], amps = [];
    for (var xc = win.xStart; xc <= win.xEnd; xc += 1) {
      var ip = Math.round(xc) + xLeft;
      if (ip < 0 || ip >= ampArr.length) continue;
      xs.push(xc); amps.push(ampArr[ip]);
    }
    var kap = fitLogSlope(xs, amps);
    return { kappa: kap, valid: kap != null };
  }
  // core.kappaFitWindow 재현 (브라우저에서 core 직접 호출도 가능하나 diag 자립)
  function wgCutoffWindow(L, kappaThy) {
    var xStart = L * 0.15, xEnd = Math.min(L * 0.7, xStart + 2.5 / kappaThy);
    return { xStart: xStart, xEnd: xEnd, valid: (xEnd - xStart) > 0 };
  }
  function fitLogSlope(xs, amps) {
    var sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0;
    for (var i = 0; i < xs.length; i++) {
      if (amps[i] < 1e-14) continue;
      var lv = Math.log(amps[i]); sx += xs[i]; sy += lv; sxx += xs[i] * xs[i]; sxy += xs[i] * lv; n++;
    }
    if (n < 2) return null;
    return -((n * sxy - sx * sy) / (n * sxx - sx * sx));
  }
  // k_z: 전파 영역, modeCoefComplex 위상 언랩 회귀 (셀좌표)
  function measureKzFromGrid(field, y0, a, L, xLeft) {
    var xs = [], phis = [];
    for (var xc = L * 0.2; xc <= L * 0.7; xc += 1) {
      var c = modeCoefComplexAt(field, y0, a, Math.round(xc) + xLeft);
      xs.push(xc); phis.push(Math.atan2(c[1], c[0]));
    }
    for (var i = 1; i < phis.length; i++) {
      while (phis[i] - phis[i - 1] > Math.PI) phis[i] -= 2 * Math.PI;
      while (phis[i] - phis[i - 1] < -Math.PI) phis[i] += 2 * Math.PI;
    }
    var sx = 0, sy = 0, sxx = 0, sxy = 0, n = xs.length;
    for (var j = 0; j < n; j++) { sx += xs[j]; sy += phis[j]; sxx += xs[j] * xs[j]; sxy += xs[j] * phis[j]; }
    return Math.abs((n * sxy - sx * sy) / (n * sxx - sx * sx));
  }
  // 기하평균 (A3): iPixCenter ± halfWidth 픽셀 구간
  function geoMeanAround(ampArr, iPixCenter, halfWidth) {
    var s = 0, cnt = 0;
    for (var i = iPixCenter - halfWidth; i <= iPixCenter + halfWidth; i++) {
      if (i < 0 || i >= ampArr.length) continue;
      var v = ampArr[i]; if (v < 1e-14) v = 1e-14;
      s += Math.log(v); cnt++;
    }
    return cnt ? Math.exp(s / cnt) : 0;
  }
  // 전력 투과율: |c₁(0.88L)/c₁(0.12L)|², 각 기준점 ±0.04L 기하평균 (셀→픽셀)
  function transmittance(ampArr, L, xLeft) {
    var half = Math.round(0.04 * L);
    var inAmp = geoMeanAround(ampArr, Math.round(0.12 * L) + xLeft, half);
    var outAmp = geoMeanAround(ampArr, Math.round(0.88 * L) + xLeft, half);
    if (inAmp < 1e-14) return 0;
    var ratio = outAmp / inAmp;
    return ratio * ratio;
  }
  // 누설: 벽 위(y=±a/2) |E| 평균 (도파관 내부 x 구간)
  function leakage(field, y0, a, xLeft, L) {
    var Ny = field.Ny, re = field.re, im = field.im;
    var jT = Math.round(y0 + a / 2), jB = Math.round(y0 - a / 2);
    var xf = xLeft + Math.round(0.1 * L), xt = xLeft + Math.round(0.9 * L);
    var s = 0, cnt = 0;
    for (var i = xf; i <= xt; i++) {
      var it = i * Ny + jT, ib = i * Ny + jB;
      s += Math.sqrt(re[it] * re[it] + im[it] * im[it]);
      s += Math.sqrt(re[ib] * re[ib] + im[ib] * im[ib]);
      cnt += 2;
    }
    return cnt ? s / cnt : 0;
  }
  // 입구 앞 정재파: x<0 축(y0)의 |E| 최대/최소 → SWR, 반사율
  function swr(field, y0, xLeft) {
    var Ny = field.Ny, re = field.re, im = field.im;
    var mx = 0, mn = 1e9;
    for (var i = 0; i < xLeft; i++) {
      var idx = i * Ny + y0, v = Math.sqrt(re[idx] * re[idx] + im[idx] * im[idx]);
      if (v > mx) mx = v; if (v < mn) mn = v;
    }
    if (mn < 1e-9 || mx < 1e-9) return { swr: null, reflect: null };
    var s = mx / mn, gamma = (s - 1) / (s + 1);
    return { swr: s, reflect: gamma * gamma };
  }
  var API = { modeCoefGrid: modeCoefGrid, modeCoefComplexAt: modeCoefComplexAt,
              measureKappa: measureKappa, measureKzFromGrid: measureKzFromGrid,
              geoMeanAround: geoMeanAround, transmittance: transmittance,
              leakage: leakage, swr: swr };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { global.WG = global.WG || {}; Object.assign(global.WG, API); }
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 4: 통과 확인**

Run: `node verify/test_diag.js`
Expected: `그리드 κ = ...%` + `PASS: 그리드 modeCoefGrid로 κ ±15% 유지 (C1)`

- [ ] **Step 5: Commit**

```bash
git add diag.js verify/test_diag.js
git commit -m "feat: 진단 모듈(그리드 κ·k_z·기하평균 T·누설·SWR) + C1 재검증 테스트"
```

---

## Task 4: 콘솔 수치 검증 스크립트 (스펙 §7-2)

**Files:**
- Create: `verify/console_check.js`

**Interfaces:**
- Consumes: core + WG(field/diag) 전체
- Produces: 콘솔 표. assert로 (a) λ/2a=1 무릎, (b) κ·k_z ±15%, (c) d↑ 무릎 무뎌짐+누설 상승 확인

- [ ] **Step 1: 검증 스크립트 작성**

`verify/console_check.js`:
```js
'use strict';
var assert = require('assert');
var core = require('./core.js');
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
```

- [ ] **Step 2: 실행**

Run: `node verify/console_check.js`
Expected: 세 블록 표 출력 + `전체 PASS — 콘솔 수치 검증 통과`. 만약 (a)~(c) assert 실패 시 정규화/샘플링을 core 값과 대조해 조정(스펙 §12 C1).

- [ ] **Step 3: Commit**

```bash
git add verify/console_check.js
git commit -m "test: 콘솔 수치 검증(무릎·정확도·누설) 스크립트 — 스펙 §7-2 통과"
```

---

## Task 5: HTML 골격 + 테마 CSS (정적, φ=0 렌더 준비)

**Files:**
- Create: `index.html`
- Create: `style.css`

**Interfaces:**
- Consumes: 없음(정적 구조)
- Produces: DOM id 계약 — 슬라이더 `lambda/aGap/dWire/lenL`, 토글 `incType`(radio plane/line), 버튼 `pauseBtn/presetProp/presetCut/presetSparse/sweepBtn`, 속도 `speed`, 캔버스 `cvInc/cvScat/cvTot/cvGraph/cvSweep`, 정보 `cutoffBadge/freqInfo/kappaInfo/kappaCompare/plateGauge/plateGaugeCap/leakInfo/transInfo/swrInfo`, 위상자 범례 `phasorLegend`, 읽기값 `lambdaVal/aVal/dVal/lenVal/speedVal`

- [ ] **Step 1: index.html 작성**

`index.html`:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>도선 배열 도파관 — 입사파 + 산란파로 보는 차단</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="app-header">
  <h1>도선 배열 도파관 — 입사파 + 산란파로 보는 차단</h1>
  <p class="subtitle">도체 도선 두 줄로 도파관 벽을 만듭니다. 입사파가 도선 표면 E=0 조건을 통해 전류를 강제하고,
     그 산란파가 내부에서 균일 성분을 지워 차단(cutoff)을 만듭니다. 상쇄·차단은 경계조건의 <em>결과</em>입니다.</p>
  <p class="polar-fixed">편광: E∥도선 — 이 편광에는 TEM 모드가 없음</p>
</header>

<div class="app">
  <aside class="controls">
    <section class="control-group presets">
      <button id="presetProp" class="preset">① 전파 (λ&lt;2a)</button>
      <button id="presetCut" class="preset">② 차단 (λ&gt;2a)</button>
      <button id="presetSparse" class="preset">③ 성긴 벽 (d↑)</button>
    </section>

    <section class="control-group">
      <label class="slider-label">파장 λ <span class="readout" id="lambdaVal"></span></label>
      <input type="range" id="lambda" step="2">
      <label class="slider-label">도파관 간격 a <span class="readout" id="aVal"></span></label>
      <input type="range" id="aGap" min="40" max="90" step="2" value="60">
      <label class="slider-label">도선 간격 d <span class="readout" id="dVal"></span></label>
      <input type="range" id="dWire" min="2" max="25" step="1" value="5">
      <label class="slider-label">도파관 길이 L <span class="readout" id="lenVal"></span></label>
      <input type="range" id="lenL" min="200" max="400" step="20" value="300">
    </section>

    <section class="control-group">
      <label class="slider-label">입사 형태</label>
      <label class="radio-row"><input type="radio" name="incType" value="plane" checked> 평면파 (입구 결합)</label>
      <label class="radio-row"><input type="radio" name="incType" value="line"> 선원파 (내부 여기 x=−80)</label>
    </section>

    <section class="control-group">
      <label class="slider-label">속도 <span class="readout" id="speedVal">0.15 rad/f</span></label>
      <input type="range" id="speed" min="0.05" max="0.50" step="0.05" value="0.15">
      <button id="pauseBtn">⏸ 일시정지</button>
    </section>

    <section class="control-group info-box">
      <div class="info" id="cutoffBadge"></div>
      <div class="info" id="freqInfo"></div>
      <div class="info" id="kappaInfo"></div>
      <div class="info" id="kappaCompare"></div>
      <div class="gauge-wrap"><div class="gauge-label">도체판 근사</div><div class="gauge"><div class="gauge-fill" id="plateGauge"></div></div></div>
      <div class="note" id="plateGaugeCap"></div>
      <div class="info" id="leakInfo"></div>
      <div class="info" id="transInfo"></div>
      <div class="info" id="swrInfo"></div>
    </section>

    <section class="control-group">
      <button id="sweepBtn">⑤ T(λ) 스윕 계산 (평면파 전용)</button>
      <div class="note" id="sweepStatus"></div>
    </section>
  </aside>

  <main class="panels">
    <section class="panel"><h3>① 입사파 <span class="sub">평면파 또는 선원파만</span></h3><div class="cv-wrap"><canvas id="cvInc"></canvas></div>
      <p class="note" id="incCap"></p></section>
    <section class="panel"><h3>② 산란파 <span class="sub">도선 표면 E=0이 강제한 산란파</span> <span id="phasorLegend" class="legend"></span></h3><div class="cv-wrap"><canvas id="cvScat"></canvas></div></section>
    <section class="panel"><h3>③ 전체장 <span class="sub">① + ② — 눈으로 더하면 이 그림</span></h3><div class="cv-wrap"><canvas id="cvTot"></canvas></div></section>
    <section class="panel"><h3>④ n=1 모드 진폭 |c₁(x)| <span class="sub">측정 실선 · 이론 점선</span></h3><div class="cv-wrap"><canvas id="cvGraph"></canvas></div>
      <p class="note">세로축은 이 그래프 자체 정규화 — 위 패널의 색 밝기와 직접 비교하지 말 것.</p></section>
    <section class="panel panel-sweep"><h3>⑤ 투과율 T vs λ/2a <span class="sub">d=5·10·20, 세로축 선형 %</span></h3><div class="cv-wrap"><canvas id="cvSweep"></canvas></div>
      <p class="note">평면파 입사, L=현재값 기준. 차단 쪽 값은 길이에 따라 달라진다. a·L을 바꾸면 곡선이 흐려짐(재계산 필요).</p></section>
  </main>
</div>

<script src="hankel.js"></script>
<script src="core.js"></script>
<script src="field.js"></script>
<script src="diag.js"></script>
<script src="render.js"></script>
<script src="sweep.js"></script>
<script src="main.js"></script>
</body>
</html>
```

- [ ] **Step 2: style.css 작성** (reference 테마색 재사용 + 단일열·게이지·프리셋·위상자 범례)

`style.css`:
```css
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #0f1320; color: #e8ebf5;
  font-family: "Segoe UI", "Malgun Gothic", sans-serif; }
.app-header { padding: 18px 26px 6px; }
.app-header h1 { margin: 0 0 8px; font-size: 1.6rem; }        /* 프로젝터용 확대 */
.subtitle { margin: 0; color: #aab2cf; font-size: 1.0rem; max-width: 1000px; line-height: 1.55; }
.subtitle em { color: #ffd479; font-style: normal; }
.polar-fixed { margin: 8px 0 0; color: #ffd479; font-size: 0.95rem; font-weight: 600; }

.app { display: grid; grid-template-columns: 320px 1fr; gap: 18px; padding: 10px 26px 26px; align-items: start; }
.controls { background: #161b2e; border: 1px solid #2a3050; border-radius: 10px;
  padding: 18px; position: sticky; top: 14px; }
.control-group { margin-bottom: 18px; }
.slider-label { display: flex; justify-content: space-between; font-size: 0.95rem; margin: 12px 0 5px; }
.readout { color: #ffd479; font-weight: 600; }
input[type="range"] { width: 100%; }

.presets { display: flex; flex-direction: column; gap: 8px; }
.preset { background: #232a4a; color: #e8ebf5; border: 1px solid #3a4270; border-radius: 8px;
  padding: 10px; font-size: 0.95rem; cursor: pointer; text-align: left; }
.preset:hover { background: #2e3766; }
.radio-row { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; margin: 8px 0; cursor: pointer; }
#pauseBtn, #sweepBtn { width: 100%; margin-top: 8px; background: #232a4a; color: #e8ebf5;
  border: 1px solid #3a4270; border-radius: 6px; padding: 9px; font-size: 0.9rem; cursor: pointer; }
#pauseBtn:hover, #sweepBtn:hover { background: #2e3766; }
#sweepBtn:disabled { opacity: 0.45; cursor: not-allowed; }

.info-box { border-top: 1px solid #2a3050; padding-top: 10px; }
.info { font-size: 0.92rem; color: #c3cae8; line-height: 1.5; margin-top: 8px; }
.note { font-size: 0.82rem; color: #8892b5; line-height: 1.6; margin-top: 8px; }
.gauge-wrap { margin-top: 12px; }
.gauge-label { font-size: 0.88rem; color: #aab2cf; margin-bottom: 4px; }
.gauge { width: 100%; height: 16px; background: #0a0e1c; border: 1px solid #3a4270; border-radius: 8px; overflow: hidden; }
.gauge-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #5b9bff, #7fd6ff); transition: width 0.15s; }

.panels { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }  /* 단일 열 */
.panel { background: #161b2e; border: 1px solid #2a3050; border-radius: 10px; padding: 14px 16px; }
.panel h3 { margin: 0 0 8px; font-size: 1.05rem; color: #d6dcf7; }
.panel h3 .sub { font-size: 0.82rem; color: #8892b5; font-weight: 400; }
.legend { font-size: 0.8rem; color: #ffd479; margin-left: 8px; }
.cv-wrap { position: relative; width: 100%; display: block; }
.cv-wrap canvas { width: 100%; height: auto; display: block; background: #0a0e1c; border-radius: 6px; }
#cvInc, #cvScat, #cvTot { aspect-ratio: 520 / 220; }
#cvGraph { aspect-ratio: 520 / 120; }
#cvSweep { aspect-ratio: 520 / 240; }
.cv-label { position: absolute; font-size: 0.74rem; line-height: 1; pointer-events: none; white-space: nowrap; }
.cv-label-center { transform: translateX(-50%); }
.stale { opacity: 0.35; }

@media (max-width: 980px) { .app { grid-template-columns: 1fr; } .controls { position: static; } }
```

- [ ] **Step 3: 브라우저 육안 확인 (더블클릭)**

`index.html`을 더블클릭해 연다. 확인:
- [ ] 좌측 사이드바(프리셋 3버튼·슬라이더 4개·입사 라디오·속도·정보박스·스윕버튼) + 우측 5패널이 세로로 쌓임
- [ ] 콘솔(F12)에 스크립트 로드 에러 없음 (render/sweep/main 아직 미구현이라 "함수 없음"류는 Task 6~8에서 해소)
- [ ] "편광: E∥도선…" 문구 노출

- [ ] **Step 4: Commit**

```bash
git add index.html style.css
git commit -m "feat: HTML 골격 + 프로젝터용 다크 테마 CSS(단일열·게이지·프리셋)"
```

---

## Task 6: 정적 렌더 (φ=0) — 3패널 색 스케일 공유 + 도선 점

**Files:**
- Create: `render.js`
- Modify: (없음 — main.js는 Task 8)

**Interfaces:**
- Consumes: `WG` 색·장(Task 2), reference `colorForValue/drawField/drawGraph/updateOverlays` 이식
- Produces: `WG.colorForValue(v,scale)`, `WG.drawField(ctx,field,scale,phase)`, `WG.drawWireDots(ctx, wiresPix, cre, cim, phase, scale, Ny)`, `WG.drawGraph(ctx, ampArr, refIPix, kappaThy, geom)`, `WG.drawPlatesWire(ctx, geom)`, `WG.updateOverlays(wraps, geom)`, `WG.drawWirePhasors`(Task 7에서 확장 — 여기선 정적 점만)

**설명:** 색 스케일은 세 패널 공통, 입사파 진폭=1 기준 고정(`scale=1`, 초과 포화). reference `drawField`·`colorForValue` 그대로. 도선 점은 이 태스크에서 정적(φ=0 순시값 색), Task 7에서 애니메이션.

- [ ] **Step 1: render.js 작성** (reference 함수 이식 + 도선 점/벽)

`render.js`:
```js
(function (global) {
  'use strict';
  function colorForValue(v, scale) {
    var t = v / scale; if (t > 1) t = 1; else if (t < -1) t = -1;
    if (t >= 0) { var c = Math.round(255 * (1 - t)); return { r: 255, g: c, b: c }; }
    var d = Math.round(255 * (1 + t)); return { r: d, g: d, b: 255 };
  }
  function drawField(ctx, field, scale, phase) {
    var Nx = field.Nx, Ny = field.Ny, re = field.re, im = field.im;
    var img = ctx.createImageData(Nx, Ny), d = img.data, c = Math.cos(phase), s = Math.sin(phase);
    for (var i = 0; i < Nx; i++) for (var j = 0; j < Ny; j++) {
      var idx = i * Ny + j, v = re[idx] * c + im[idx] * s, col = colorForValue(v, scale);
      var p = ((Ny - 1 - j) * Nx + i) * 4;
      d[p] = col.r; d[p + 1] = col.g; d[p + 2] = col.b; d[p + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  // 도선 점: 순시 전류값 v = cre·cosφ + cim·sinφ (A6, 장과 동일 부호)로 색
  function drawWireDots(ctx, wiresPix, cre, cim, phase, scale, Ny) {
    var c = Math.cos(phase), s = Math.sin(phase);
    for (var j = 0; j < wiresPix.length; j++) {
      var v = cre[j] * c + cim[j] * s;
      var mag = Math.abs(v) / scale; if (mag > 1) mag = 1;
      var col = colorForValue(v, scale);
      var cx = wiresPix[j].x, cy = Ny - 1 - wiresPix[j].y;
      var rad = 2.2 + 2.3 * mag;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgb(' + col.r + ',' + col.g + ',' + col.b + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
  }
  function drawPlatesWire(ctx, geom) {
    var Nx = geom.Nx, Ny = geom.Ny, y0 = geom.y0, a = geom.a, xLeft = geom.xLeft, L = geom.L;
    var yTop = Ny - 1 - (y0 + a / 2), yBot = Ny - 1 - (y0 - a / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(xLeft, yTop, L, yBot - yTop);            // 도파관 내부 밴드는 벽 사이만
    // 입구(x=0) 세로 안내선
    ctx.strokeStyle = 'rgba(154,166,216,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xLeft, 0); ctx.lineTo(xLeft, Ny); ctx.stroke();
  }
  // ④ 그래프: 픽셀 x축, refIPix에서 정규화, 이론 곡선 점선(차단만)
  function drawGraph(ctx, ampArr, refIPix, kappaThy, geom) {
    var W = geom.Nx, H = 120, xLeft = geom.xLeft;
    ctx.clearRect(0, 0, W, H);
    if (!ampArr) return;
    var baseline = 1e-9;
    for (var bx = refIPix; bx < ampArr.length; bx++) if (ampArr[bx] > baseline) baseline = ampArr[bx];
    if (baseline < 1e-10) return;
    function toY(v) { var c = v < 0 ? 0 : v > 1.1 ? 1.1 : v; return (H - 18) - c / 1.1 * (H - 30); }
    if (kappaThy) {
      var normRef = ampArr[refIPix] / baseline;
      ctx.strokeStyle = '#ffd479'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath();
      for (var t = refIPix; t < W; t++) {
        var xc = t - xLeft, xcRef = refIPix - xLeft;
        var tv = normRef * Math.exp(-kappaThy * (xc - xcRef));
        if (t === refIPix) ctx.moveTo(t, toY(tv)); else ctx.lineTo(t, toY(tv));
      }
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.strokeStyle = '#7fd6ff'; ctx.lineWidth = 1.8; ctx.beginPath();
    var first = true;
    for (var m = refIPix; m < W; m++) {
      var mv = ampArr[m] / baseline;
      if (first) { ctx.moveTo(m, toY(mv)); first = false; } else ctx.lineTo(m, toY(mv));
    }
    ctx.stroke();
  }
  var API = { colorForValue: colorForValue, drawField: drawField, drawWireDots: drawWireDots,
              drawPlatesWire: drawPlatesWire, drawGraph: drawGraph };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { global.WG = global.WG || {}; Object.assign(global.WG, API); }
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 2: 임시 정적 렌더 확인용 스니펫**

`main.js`에 최소 부트스트랩을 넣기 전, 브라우저 콘솔에서 확인하기 위해 임시로 `index.html` 하단 `<script src="main.js">`를 잠시 주석 처리하고, 대신 아래를 콘솔(F12)에 붙여 실행:
```js
var a=60,L=300,d=5,aw=0.8,lam=140,k=2*Math.PI/lam,xLeft=110,Ny=220,y0=110,Nx=xLeft+L+xLeft;
var wires=WireWG.buildWires(a,L,d,aw);
var wp=wires.map(w=>({x:w.x,y:y0+w.y,aw:w.aw}));
var sol=WireWG.solveMoM(wires,k,(x,y)=>WireWG.incPlane(k,x,y));
var tbl=WG.buildHankelTable(k,Nx+Ny+20);
var inc=WG.computeIncidentGrid(WG.makeField(Nx,Ny),(xc,yc)=>WireWG.incPlane(k,xc,yc),xLeft,y0);
var sc=WG.computeScatteredGrid(WG.makeField(Nx,Ny),wp,sol[0],sol[1],tbl,xLeft);
var tot=WG.addComplex(WG.makeField(Nx,Ny),inc,sc);
[['cvInc',inc],['cvScat',sc],['cvTot',tot]].forEach(([id,f])=>{var cv=document.getElementById(id);cv.width=Nx;cv.height=Ny;WG.drawField(cv.getContext('2d'),f,1,0);WG.drawWireDots(cv.getContext('2d'),wp,sol[0],sol[1],0,1,Ny);});
```

- [ ] **Step 3: 브라우저 육안 확인 (핵심 장면)**

- [ ] 세 패널 색 스케일 공유(입사=1 고정): ①은 벽 밖까지 평면파 가득, ②는 도선에서 나온 산란파, ③ 내부는 어두움(차단 상쇄가 눈에 보임)
- [ ] **①+②를 눈으로 더하면 ③**이 되는지 (같은 빨강/파랑 강도)
- [ ] 도선 점이 벽(y=±a/2)을 따라 두 줄로 찍힘

- [ ] **Step 4: Commit**

```bash
git add render.js
git commit -m "feat: 정적 렌더(색 공유 3패널·도선 점·④그래프) — reference 색매핑 이식"
```

---

## Task 7: 애니메이션 + 전류 위상자 (A6)

**Files:**
- Modify: `render.js` (도선 점은 Task 6에서 이미 위상 인자 받음 — 위상자 범례·차단분기 추가)
- Create: `main.js` (부트스트랩·애니메이션 루프 최소판)

**Interfaces:**
- Consumes: Task 6 렌더, Task 2 장
- Produces: `WG.setPhasorLegend(el, evanescent)` (범례 텍스트), main.js 애니메이션 루프(`requestAnimationFrame`)

**설명(A6):** 도선 점 색은 이미 `cre·cosφ+cim·sinφ`. 애니메이션은 φ를 증가시키며 `drawField`+`drawWireDots`를 매 프레임 다시 그린다(장 재계산 없음). 목표: 전파=벽 따라 색 위상 흐름(파도타기), 차단=전 도선 동시 동색 깜빡임+안쪽 감쇠. 차단 시 범례를 "전 도선 동위상"으로 대체(위상 각도·눈금값 금지).

- [ ] **Step 1: render.js에 범례 함수 추가**

`render.js`의 API 직전에 추가하고 API에 등록:
```js
  function setPhasorLegend(el, evanescent) {
    if (!el) return;
    el.textContent = evanescent
      ? '위상자: 전 도선 동위상 (안쪽으로 감쇠)'
      : '위상자: 벽 따라 위상 전진';
    el.style.opacity = evanescent ? '0.7' : '1';
  }
```
API 객체에 `setPhasorLegend: setPhasorLegend,` 추가.

- [ ] **Step 2: main.js 최소 부트스트랩 + 애니메이션 루프 작성**

`main.js` (Task 8에서 슬라이더·프리셋 확장; 여기선 고정 파라미터로 루프만):
```js
(function () {
  'use strict';
  var WGc = WireWG;      // 물리 코어
  var xLeft = 110, xRight = 110, Ny = 220, y0 = 110;

  var state = { lambda: 140, a: 60, d: 5, aw: 0.8, L: 300, inc: 'plane',
                phase: 0, dPhi: 0.15, paused: false };
  var built = null;   // {Nx, wiresPix, cre, cim, inc, scat, tot, amp, info}
  var el = function (id) { return document.getElementById(id); };
  var cv = { inc: el('cvInc'), scat: el('cvScat'), tot: el('cvTot'), graph: el('cvGraph') };

  function geom() { return { Nx: built.Nx, Ny: Ny, y0: y0, a: state.a, xLeft: xLeft, L: state.L }; }

  function rebuild() {
    var s = state, k = 2 * Math.PI / s.lambda, Nx = xLeft + s.L + xRight;
    var wires = WGc.buildWires(s.a, s.L, s.d, s.aw);
    var wiresPix = wires.map(function (w) { return { x: w.x, y: y0 + w.y, aw: w.aw }; });
    var incFnCell = (s.inc === 'plane')
      ? function (x, y) { return WGc.incPlane(k, x, y); }
      : function (x, y) { return WGc.incLine(k, -80, 0, x, y); };
    var sol = WGc.solveMoM(wires, k, incFnCell);
    var table = WG.buildHankelTable(k, Nx + Ny + 20);
    var inc = WG.computeIncidentGrid(WG.makeField(Nx, Ny), incFnCell, xLeft, y0);
    var scat = WG.computeScatteredGrid(WG.makeField(Nx, Ny), wiresPix, sol[0], sol[1], table, xLeft);
    var tot = WG.addComplex(WG.makeField(Nx, Ny), inc, scat);
    var amp = WG.modeCoefGrid(tot, y0, s.a);
    var info = WGc.cutoffInfo(s.lambda, s.a);
    built = { Nx: Nx, wiresPix: wiresPix, cre: sol[0], cim: sol[1],
              inc: inc, scat: scat, tot: tot, amp: amp, info: info };
    [cv.inc, cv.scat, cv.tot].forEach(function (c) { c.width = Nx; c.height = Ny; });
    cv.graph.width = Nx; cv.graph.height = 120;
    WG.setPhasorLegend(el('phasorLegend'), info.evanescent);
  }

  function frame() {
    if (!state.paused) state.phase += state.dPhi;
    var g = geom(), ph = state.phase, b = built;
    var gi = cv.inc.getContext('2d'), gs = cv.scat.getContext('2d'), gt = cv.tot.getContext('2d');
    WG.drawField(gi, b.inc, 1, ph); WG.drawField(gs, b.scat, 1, ph); WG.drawField(gt, b.tot, 1, ph);
    WG.drawPlatesWire(gi, g); WG.drawPlatesWire(gs, g); WG.drawPlatesWire(gt, g);
    WG.drawWireDots(gs, b.wiresPix, b.cre, b.cim, ph, 1, Ny);
    WG.drawWireDots(gt, b.wiresPix, b.cre, b.cim, ph, 1, Ny);
    var refIPix = xLeft + Math.round(0.12 * state.L);
    WG.drawGraph(cv.graph.getContext('2d'), b.amp, refIPix, b.info.evanescent ? b.info.kappa : null, g);
    requestAnimationFrame(frame);
  }

  el('pauseBtn').addEventListener('click', function () {
    state.paused = !state.paused;
    el('pauseBtn').textContent = state.paused ? '▶ 재개' : '⏸ 일시정지';
  });
  el('speed').addEventListener('input', function (e) {
    state.dPhi = +e.target.value; el('speedVal').textContent = (+e.target.value).toFixed(2) + ' rad/f';
  });

  rebuild();
  requestAnimationFrame(frame);
  window.__wg = { state: state, rebuild: rebuild };   // Task 8 확장용 훅
})();
```

- [ ] **Step 3: index.html에서 임시 주석 해제**

Task 6 Step 2에서 주석 처리했던 `<script src="main.js"></script>`를 되살린다(원래 상태).

- [ ] **Step 4: 브라우저 육안 확인 (애니메이션 핵심 장면)**

차단(λ=140 기본 상태):
- [ ] 파동이 애니메이션됨(일시정지/재개·속도 동작)
- [ ] 도선 점이 **전 도선 동시에 같은 색**으로 깜빡이고 안쪽으로 갈수록 옅어짐
- [ ] 범례가 "전 도선 동위상 (안쪽으로 감쇠)"

`window.__wg.state.lambda = 90; window.__wg.rebuild();` 콘솔 입력 후 전파 확인:
- [ ] 도선 점 색 위상이 **벽을 따라 흐름**(파도타기)
- [ ] 범례가 "벽 따라 위상 전진"

- [ ] **Step 5: Commit**

```bash
git add render.js main.js index.html
git commit -m "feat: 애니메이션 루프 + 전류 위상자(A6 부호 통일) — 전파 파도타기/차단 동위상"
```

---

## Task 8: 슬라이더·프리셋·정보박스·경고 + λ 범위 클램프(D2·C2)

**Files:**
- Modify: `main.js`

**Interfaces:**
- Consumes: Task 3 진단(κ/k_z/T/누설/SWR), Task 7 루프
- Produces: 슬라이더 4개 + 라디오 + 프리셋 3개 핸들러, `clampLambda(a)`, 정보박스 갱신 `updateInfo()`, 경고(±15%)·게이지·A1/A2 분기

**설명:** λ 슬라이더 min/max를 a에 연동(λ/2a∈[0.7,2.0], step=2, a도 step=2 → C2). 선원파 시 투과·SWR·스윕 숨김/비활성(A1·A2). 재계산은 slider input마다 rebuild+updateInfo.

- [ ] **Step 1: main.js에 클램프·정보갱신·핸들러 추가**

`main.js`의 `window.__wg = ...` 직전에 삽입하고, 이벤트 바인딩을 추가:
```js
  function mm(cell) { return cell * 2; }
  function clampLambda() {
    var lam = el('lambda');
    lam.min = Math.round(0.7 * 2 * state.a); lam.max = Math.round(2.0 * 2 * state.a);
    if (state.lambda < +lam.min) state.lambda = +lam.min;
    if (state.lambda > +lam.max) state.lambda = +lam.max;
    lam.value = state.lambda;
  }
  function syncReadouts() {
    el('lambdaVal').textContent = mm(state.lambda) + ' mm';
    el('aVal').textContent = mm(state.a) + ' mm  (2a = ' + mm(2 * state.a) + ' mm)';
    el('dVal').textContent = state.d + ' 셀 (' + mm(state.d) + ' mm)';
    el('lenVal').textContent = mm(state.L) + ' mm';
  }
  function updateInfo() {
    var b = built, info = b.info, plane = (state.inc === 'plane');
    var lamMm = mm(state.lambda);
    el('freqInfo').textContent = '자유공간 주파수 f = c/λ:  ' + (3e11 / lamMm / 1e9).toFixed(2) + ' GHz';
    el('cutoffBadge').textContent = info.evanescent ? '차단: λ > 2a → 감쇠파' : '전파: λ < 2a → 모드 진행';
    el('cutoffBadge').style.color = info.evanescent ? '#ffb37a' : '#7fd6ff';

    var refI = xLeft + Math.round(0.12 * state.L);
    if (info.evanescent) {
      el('kappaInfo').textContent = '이론 κ = ' + (info.kappa / 2).toFixed(4) + ' /mm';
      var m = WG.measureKappa(b.amp, state.L, info.kappa, xLeft);
      if (m.valid) {
        var pct = m.kappa / info.kappa * 100, ok = (pct > 85 && pct < 115);
        el('kappaCompare').textContent = '측정 κ = ' + (m.kappa / 2).toFixed(4) + ' /mm  (' + pct.toFixed(0) + '%)'
          + (ok ? '' : '  ⚠ d 감소 권장');
        el('kappaCompare').style.color = ok ? '' : '#f4a261';
        var ratio = Math.max(0, Math.min(1, m.kappa / info.kappa));
        el('plateGauge').style.width = (ratio * 100).toFixed(0) + '%';
      }
    } else {
      var kz = WG.measureKzFromGrid(b.tot, y0, state.a, state.L, xLeft);
      el('kappaInfo').textContent = 'k_z(이론) = ' + (info.kguide / 2).toFixed(4) + ' /mm';
      var pct2 = kz / info.kguide * 100;
      el('kappaCompare').textContent = '측정 k_z = ' + (kz / 2).toFixed(4) + ' /mm  (' + pct2.toFixed(0) + '%)';
      el('kappaCompare').style.color = (pct2 > 85 && pct2 < 115) ? '' : '#f4a261';
      el('plateGauge').style.width = Math.max(0, Math.min(100, pct2)).toFixed(0) + '%';
    }
    el('plateGaugeCap').textContent = info.evanescent
      ? '차단(κ)에서 가장 민감한 지표.'
      : '전파(k_z)는 성긴 벽에도 둔감 — 누설 지표를 함께 볼 것.';

    var leak = WG.leakage(b.tot, y0, state.a, xLeft, state.L);
    el('leakInfo').textContent = '도선 사이 벽 |E| 평균(누설): ' + leak.toFixed(4)
      + '  — 0에 안 닿는 건 유한 벽 누설, d↓면 내려감';

    // A1: 투과율 (평면파 전용)
    if (plane) {
      el('transInfo').style.display = '';
      if (info.evanescent) {
        var T = WG.transmittance(b.amp, state.L, xLeft);
        var dB = (T > 1e-12) ? -10 * Math.log10(T) : 999;
        var Lmm = mm(state.L);
        el('transInfo').textContent = '진폭 감쇠 ≈ ' + (dB / 2).toFixed(1) + ' dB (L=' + Lmm + 'mm 기준), '
          + (dB / Lmm).toFixed(3) + ' dB/mm';
      } else {
        el('transInfo').textContent = '전력 투과율 T = ' + (WG.transmittance(b.amp, state.L, xLeft) * 100).toFixed(1) + ' %';
      }
    } else { el('transInfo').style.display = 'none'; }

    // A2: SWR (평면파 전용)
    if (plane) {
      var sw = WG.swr(b.tot, y0, xLeft);
      el('swrInfo').style.display = '';
      el('swrInfo').textContent = sw.swr
        ? '입구 앞 정재파 SWR = ' + sw.swr.toFixed(2) + ' (반사율 ≈ ' + (sw.reflect * 100).toFixed(0) + '%) — 차단 시 반사가 증거'
        : '입구 앞 정재파: 측정 불가';
    } else { el('swrInfo').style.display = 'none'; }

    // A1: 스윕 버튼 (평면파 전용)
    el('sweepBtn').disabled = !plane;
    el('sweepBtn').title = plane ? '' : '스윕은 평면파 입사 전용';

    // ① 입사 캡션
    el('incCap').textContent = (state.inc === 'plane')
      ? '입사 평면파는 도파관 모드가 아니다. 벽 밖에도 평면파가 그대로 존재(물리적 실재). 벽 전류의 산란파가 내부 균일 성분을 지운다.'
      : '선원파: 내부 여기. 선원 위치 x=−80(셀), y=0. 렌더 창 밖이면 점 생략.';

    // a_w 근사 경고
    if (state.aw > state.d / 4 || state.aw > state.lambda / 20)
      el('kappaCompare').textContent += '  ⚠ 얇은 도선 근사 경계';
  }

  function recompute() { clampLambda(); rebuild(); syncReadouts(); updateInfo(); refreshSweepStale(); }

  function applyPreset(p) {
    if (p === 'prop') { state.a = 60; state.d = 5; state.lambda = 90; }
    else if (p === 'cut') { state.a = 60; state.d = 5; state.lambda = 140; }
    else if (p === 'sparse') { state.a = 60; state.d = 20; state.lambda = 140; }
    el('aGap').value = state.a; el('dWire').value = state.d;
    recompute();
  }
```
그리고 이벤트 바인딩(파일 하단 `rebuild()` 호출 직전)에 추가:
```js
  el('lambda').addEventListener('input', function (e) { state.lambda = +e.target.value; rebuild(); syncReadouts(); updateInfo(); refreshSweepStale(); });
  el('aGap').addEventListener('input', function (e) { state.a = +e.target.value; recompute(); });
  el('dWire').addEventListener('input', function (e) { state.d = +e.target.value; recompute(); });
  el('lenL').addEventListener('input', function (e) { state.L = +e.target.value; recompute(); });
  Array.prototype.forEach.call(document.getElementsByName('incType'), function (r) {
    r.addEventListener('change', function (e) { if (e.target.checked) { state.inc = e.target.value; rebuild(); updateInfo(); } });
  });
  el('presetProp').addEventListener('click', function () { applyPreset('prop'); });
  el('presetCut').addEventListener('click', function () { applyPreset('cut'); });
  el('presetSparse').addEventListener('click', function () { applyPreset('sparse'); });
```
초기화 부분을 `rebuild(); requestAnimationFrame(frame);` → `clampLambda(); rebuild(); syncReadouts(); updateInfo(); requestAnimationFrame(frame);` 로 교체. (`refreshSweepStale`는 Task 9에서 정의 — 우선 `function refreshSweepStale(){}` 빈 스텁을 main.js 상단에 두고 Task 9에서 채운다.)

- [ ] **Step 2: 브라우저 육안 확인**

- [ ] 프리셋 ①②③ 클릭 시 파라미터·화면 전환(전파/차단/성긴 벽)
- [ ] a 슬라이더가 짝수 mm만 산출(내부 셀 짝수, C2), λ min/max가 a에 따라 갱신(D2)
- [ ] 차단에서 ±15% 밖이면 "⚠ d 감소 권장" 주황, 게이지 표시
- [ ] 선원파 라디오 선택 시 투과·SWR 숨김, 스윕 버튼 회색(A1·A2)
- [ ] 정보박스에 GHz·누설·게이지 캡션 노출

- [ ] **Step 3: Commit**

```bash
git add main.js
git commit -m "feat: 슬라이더·프리셋·정보박스·±15% 경고 + λ범위 클램프(D2)·짝수픽셀(C2)·평면파분기(A1·A2)"
```

---

## Task 9: T(λ/2a) 스윕 패널 (D1·D5, chunked)

**Files:**
- Create: `sweep.js`
- Modify: `main.js` (스윕 버튼 핸들러·스테일), `render.js` (drawSweep)

**Interfaces:**
- Consumes: core `solveMoM/cutoffInfo`, `WG.modeCoefGrid/transmittance`
- Produces: `WG.runSweep(params, onProgress, onDone)`(chunked), `WG.drawSweep(ctx, sweepData, curLambda, a, stale)`

**설명:** d∈{5,10,20} × λ/2a 0.7~2.0을 24점 = 72 solveMoM. `setTimeout(0)`으로 점당 분할(비블로킹). y축 선형 %, 현재 λ 수직 마커, λ/2a=1 차단선. a·L 변경 시 stale(흐리게).

- [ ] **Step 1: sweep.js 작성**

`sweep.js`:
```js
(function (global) {
  'use strict';
  // params: {a, L, aw, xLeft, y0, Ny}. onProgress(frac). onDone(sweepData)
  // sweepData: { a, L, curves: [{d, pts:[{r, T}]}] }
  function runSweep(params, onProgress, onDone) {
    var a = params.a, L = params.L, aw = params.aw, xLeft = params.xLeft, y0 = params.y0, Ny = params.Ny;
    var ds = [5, 10, 20], nR = 24, rMin = 0.7, rMax = 2.0;
    var jobs = [];
    ds.forEach(function (d) { for (var i = 0; i < nR; i++) jobs.push({ d: d, r: rMin + (rMax - rMin) * i / (nR - 1) }); });
    var curves = ds.map(function (d) { return { d: d, pts: [] }; });
    var Nx = xLeft + L + xLeft, idx = 0;
    function step() {
      if (idx >= jobs.length) { onDone({ a: a, L: L, curves: curves }); return; }
      var job = jobs[idx++], lambda = job.r * 2 * a, k = 2 * Math.PI / lambda;
      var wires = WireWG.buildWires(a, L, d0(job), aw);
      var wiresPix = wires.map(function (w) { return { x: w.x, y: y0 + w.y, aw: w.aw }; });
      var sol = WireWG.solveMoM(wires, k, function (x, y) { return WireWG.incPlane(k, x, y); });
      var table = global.WG.buildHankelTable(k, Nx + Ny + 20);
      var inc = global.WG.computeIncidentGrid(global.WG.makeField(Nx, Ny), function (xc, yc) { return WireWG.incPlane(k, xc, yc); }, xLeft, y0);
      var scat = global.WG.computeScatteredGrid(global.WG.makeField(Nx, Ny), wiresPix, sol[0], sol[1], table, xLeft);
      var tot = global.WG.addComplex(global.WG.makeField(Nx, Ny), inc, scat);
      var amp = global.WG.modeCoefGrid(tot, y0, a);
      var T = global.WG.transmittance(amp, L, xLeft);
      curveFor(curves, job.d).pts.push({ r: job.r, T: T });
      onProgress(idx / jobs.length);
      setTimeout(step, 0);
    }
    function d0(job) { return job.d; }
    function curveFor(cs, d) { for (var i = 0; i < cs.length; i++) if (cs[i].d === d) return cs[i]; }
    step();
  }
  var API = { runSweep: runSweep };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { global.WG = global.WG || {}; Object.assign(global.WG, API); }
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 2: render.js에 drawSweep 추가** (API 등록 포함)

```js
  function drawSweep(ctx, sweepData, curLambda, a, stale) {
    var W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0, 0, W, H);
    var padL = 44, padB = 26, padT = 12, padR = 12;
    var x0 = padL, x1 = W - padR, y0p = H - padB, y1 = padT;
    var rMin = 0.7, rMax = 2.0;
    function X(r) { return x0 + (r - rMin) / (rMax - rMin) * (x1 - x0); }
    function Y(T) { return y0p - T * (y0p - y1); }
    // 축
    ctx.strokeStyle = '#3a4270'; ctx.lineWidth = 1;
    ctx.strokeRect(x0, y1, x1 - x0, y0p - y1);
    ctx.fillStyle = '#8892b5'; ctx.font = '11px "Segoe UI",sans-serif'; ctx.textAlign = 'center';
    [0.7, 1.0, 1.5, 2.0].forEach(function (r) { ctx.fillText(r.toFixed(1), X(r), H - 10); });
    ctx.textAlign = 'right';
    [0, 0.5, 1.0].forEach(function (T) { ctx.fillText((T * 100) + '%', x0 - 5, Y(T) + 4); });
    ctx.textAlign = 'center'; ctx.fillText('λ / 2a', (x0 + x1) / 2, H - 1);
    // 차단선 λ/2a=1
    ctx.strokeStyle = 'rgba(255,179,122,0.5)'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(X(1), y1); ctx.lineTo(X(1), y0p); ctx.stroke(); ctx.setLineDash([]);
    if (!sweepData) { ctx.fillStyle = '#8892b5'; ctx.fillText('스윕 계산 버튼을 누르세요', (x0 + x1) / 2, (y0p + y1) / 2); return; }
    var colors = { 5: '#7fd6ff', 10: '#ffd479', 20: '#ff8f8f' };
    ctx.globalAlpha = stale ? 0.35 : 1;
    sweepData.curves.forEach(function (cv) {
      ctx.strokeStyle = colors[cv.d] || '#fff'; ctx.lineWidth = 2; ctx.beginPath();
      cv.pts.forEach(function (p, i) { var xx = X(p.r), yy = Y(Math.max(0, Math.min(1, p.T))); if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); });
      ctx.stroke();
      var last = cv.pts[cv.pts.length - 1];
      if (last) { ctx.fillStyle = colors[cv.d]; ctx.textAlign = 'left'; ctx.fillText('d=' + cv.d, X(last.r) + 4, Y(last.T)); }
    });
    ctx.globalAlpha = 1;
    // 현재 λ 마커
    if (curLambda && a) {
      var r = curLambda / (2 * a);
      ctx.strokeStyle = '#e8ebf5'; ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(X(r), y1); ctx.lineTo(X(r), y0p); ctx.stroke(); ctx.setLineDash([]);
    }
  }
```
API 객체에 `drawSweep: drawSweep,` 추가.

- [ ] **Step 3: main.js에 스윕 상태·핸들러·스테일 연결**

`main.js` 상단 스텁 `function refreshSweepStale(){}` 을 아래로 교체하고, 스윕 상태와 버튼 핸들러를 추가:
```js
  var sweepData = null, sweepStale = false, cvSweep = el('cvSweep');
  cvSweep.width = 520; cvSweep.height = 240;
  function drawSweepPanel() {
    WG.drawSweep(cvSweep.getContext('2d'), sweepData, state.lambda, state.a, sweepStale);
  }
  function refreshSweepStale() {
    if (sweepData && (sweepData.a !== state.a || sweepData.L !== state.L)) sweepStale = true;
    drawSweepPanel();
  }
  el('sweepBtn').addEventListener('click', function () {
    if (state.inc !== 'plane') return;
    el('sweepBtn').disabled = true;
    WG.runSweep({ a: state.a, L: state.L, aw: state.aw, xLeft: xLeft, y0: y0, Ny: Ny },
      function (frac) { el('sweepStatus').textContent = '스윕 계산 중… ' + Math.round(frac * 100) + '%'; },
      function (data) { sweepData = data; sweepStale = false; el('sweepStatus').textContent = '완료';
        el('sweepBtn').disabled = (state.inc !== 'plane'); drawSweepPanel(); });
  });
```
`frame()` 안 마지막(또는 recompute 끝)에서 현재 λ 마커가 움직이도록 `drawSweepPanel()` 호출을 `updateInfo()` 뒤에 한 번 추가(정적이므로 매 프레임 불필요, recompute 시로 충분).

- [ ] **Step 4: 브라우저 육안 확인**

- [ ] 스윕 버튼 클릭 → 진행률 % 증가 후 "완료"
- [ ] d=5·10·20 세 곡선 + λ/2a=1 차단선 + 현재 λ 흰 마커
- [ ] **λ/2a=1 부근 무릎**: 곡선이 급락, d 클수록 무릎 무뎌지고 차단쪽 바닥↑
- [ ] a 또는 L 슬라이더 변경 시 곡선 흐려짐(스테일)
- [ ] 선원파 전환 시 버튼 비활성

- [ ] **Step 5: Commit**

```bash
git add sweep.js render.js main.js
git commit -m "feat: T(λ/2a) 스윕 패널(d=5·10·20, chunked, 무릎·스테일) — D1·D5"
```

---

## Task 10: 드래그 프리뷰(저해상도)·오버레이 라벨·최종 검수

**Files:**
- Modify: `main.js` (debounce·해상도 2단계), `render.js` (updateOverlays 라벨)

**Interfaces:**
- Consumes: 전체
- Produces: `WG.updateOverlays(wraps, geom)`(도체판·mm 라벨), main.js debounce 로직

**설명:** 슬라이더 드래그 중 저해상도(½ 픽셀 밀도)로 빠르게, `input` 멈춤 후 150ms에 고해상도 재계산. 성능 예산(스펙 §6) 안에서 반응성 확보.

- [ ] **Step 1: render.js에 updateOverlays 추가** (reference 이식, 도선 도파관용)

```js
  function updateOverlays(wraps, geom) {
    var Nx = geom.Nx, Ny = geom.Ny, y0 = geom.y0, a = geom.a, xLeft = geom.xLeft;
    function clear(w) { var e = w.getElementsByClassName('cv-label'); while (e.length) e[0].parentNode.removeChild(e[0]); }
    function mk(w, text, leftPct, topPct, center, color) {
      var s = document.createElement('span'); s.className = 'cv-label' + (center ? ' cv-label-center' : '');
      s.style.left = leftPct.toFixed(2) + '%'; s.style.top = topPct.toFixed(2) + '%'; s.style.color = color; s.textContent = text; w.appendChild(s);
    }
    var yTop = Ny - 1 - (y0 + a / 2), yBot = Ny - 1 - (y0 - a / 2);
    [wraps.inc, wraps.scat, wraps.tot].forEach(function (w) {
      clear(w);
      mk(w, '도선 벽', (xLeft + 4) / Nx * 100, (yTop - 14) / Ny * 100, false, '#9aa6d8');
      mk(w, '도선 벽', (xLeft + 4) / Nx * 100, (yBot + 2) / Ny * 100, false, '#9aa6d8');
      mk(w, '입구', xLeft / Nx * 100, 2, true, '#6a74a0');
    });
  }
```
API에 `updateOverlays: updateOverlays,` 추가. main.js `rebuild()` 끝에서 `WG.updateOverlays({inc:cv.inc.parentNode,scat:cv.scat.parentNode,tot:cv.tot.parentNode}, geom())` 호출.

- [ ] **Step 2: main.js 드래그 프리뷰(debounce) 추가**

`rebuild(preview)` 시그니처로 확장: preview=true면 격자 계산 시 `Ny`·`Nx`를 절반 스텝으로 샘플링하는 대신, 간단히 **드래그 중엔 고해상도 계산을 미루는 debounce**로 구현(YAGNI — 실제 병목은 solveMoM이 아니라 격자 채움). 각 슬라이더 핸들러를 다음 패턴으로 교체:
```js
  var dragTimer = null;
  function scheduleRecompute() {
    if (dragTimer) clearTimeout(dragTimer);
    el('sweepStatus').textContent = '';
    dragTimer = setTimeout(function () { recompute(); dragTimer = null; }, 150);
  }
```
그리고 `aGap/dWire/lenL/lambda` 의 `input` 핸들러 본문을 각 상태 대입 + `syncReadouts()` (읽기값은 즉시) + `scheduleRecompute()` 로 바꾼다. (무거운 rebuild만 지연, 라벨은 즉각 갱신 → 반응성 확보.)

- [ ] **Step 3: 브라우저 육안 확인 (최종 검수 — 프롬프트 §5 + 스펙 §7)**

프리셋 순회하며 확인:
- [ ] ①전파: 도선 위상자 파도타기, T 높음, 모드 진행
- [ ] ②차단: ①패널 내부 파동 가득 ↔ ③패널 내부 어두움(상쇄 육안), 전 도선 동위상, 입구 앞 정재파 무늬
- [ ] ③성긴 벽(d=20): 게이지 하락 + 누설↑ + κ 경고
- [ ] 슬라이더 드래그가 끊기지 않고 반응(라벨 즉시, 화면 150ms)
- [ ] 도체판 라벨·입구 라벨·mm 눈금 노출
- [ ] 차단 어디에도 c₁ 위상 수치·"위상차" 문구 없음
- [ ] 모든 캡션이 인과 방향·용어 규약 준수

- [ ] **Step 4: 콘솔 검증 재실행(회귀 확인)**

Run: `node verify/console_check.js`
Expected: `전체 PASS`

- [ ] **Step 5: Commit**

```bash
git add render.js main.js
git commit -m "feat: 드래그 debounce 프리뷰 + 오버레이 라벨 + 최종 검수 통과"
```

---

## Self-Review 결과 (작성자 점검)

**스펙 커버리지:**
- D1 스윕 d겹치기 → Task 9 ✓ / D2 λ클램프 → Task 8 ✓ / D5 선형% → Task 9 ✓ / D6·A3 기하평균 → Task 3 ✓
- D7 색공유 → Task 6 ✓ / D8 mm·GHz → Task 8 ✓ / D9 프리셋 → Task 8 ✓ / D10 드래그프리뷰 → Task 10 ✓
- A1·A2 평면파 전용 → Task 8 ✓ / A4 게이지캡션 → Task 8 ✓ / A5 그래프캡션 → Task 5 ✓ / A6 위상자부호 → Task 6·7 ✓ / A7 재사용 → 전반 ✓
- C1 그리드 κ 재검증 → Task 3·4 ✓ / C2 짝수픽셀 → Task 8 ✓ / C3 스테일 → Task 9 ✓
- 프롬프트 §5 완료판정: selfTest(T1)·±15%(T4)·무릎(T4·9)·상쇄육안(T6·10)·위상자(T7)·정재파(T8·10)·성긴벽(T8·10)·위상수치금지(T7·10)·캡션규약(전반) ✓

**플레이스홀더 스캔:** 각 코드 스텝에 실제 구현 포함. Task 10 Step 2의 "저해상도 샘플링"은 debounce로 단순화(YAGNI 명시). 잔여 TODO 없음.

**타입 일관성:** `computeScatteredGrid/computeIncidentGrid/addComplex`(field.js) ↔ Task 6·7·9 호출 시그니처 일치. `modeCoefGrid(field,y0,a)→Float32Array`, `transmittance(amp,L,xLeft)`, `measureKappa(amp,L,κ,xLeft)` 전 태스크 통일. 도선 좌표는 항상 `wiresPix={x:셀,y:y0+셀}` + 격자 함수에 `xLeft` 별도 전달 규약 통일.

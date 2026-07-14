# 도체도선배열 고차 모드 분해 시뮬레이션 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 MoM 엔진(core.js)을 재사용해, 도선 배열 도파관 내부 장을 n=1·2·3 횡방향 모드로 분해하고 파장·소스 위치에 따른 전파/차단을 한 화면에서 보이는 단일 페이지를 만든다.

**Architecture:** 물리 엔진(core.js/field.js/hankel.js)은 그대로 재사용한다. 새 페이지는 하위 폴더 `higher-order/`에 둔다. 순수 물리 헬퍼(모드 분해 일반화, d 자동값, 관찰 구간, 이론선, 벽 무결성, 씬 계산)는 node로 단위 테스트 가능한 `higher-order/modes.js`(전역 `WGM`)에 모으고, DOM·렌더·애니메이션·컨트롤은 `higher-order/script.js`에 둔다.

**Tech Stack:** 바닐라 JS(ES 모듈 아님), 클래식 `<script src>`, Canvas 2D. 더블클릭으로 열림(로컬 fetch 없음). 테스트는 기존 `verify/`의 node 스크립트 패턴(require + assert).

## Global Constraints

- 물리 엔진은 '입사파(소스 도선 H₀) + 벽 도선 산란파' 중첩만으로 장 생성. 영상법 금지. 모드 전개로 장 생성 금지(모드 전개는 이론선 전용).
- 좌표 규약: 진행축 `z`(0…L), 폭축 `y`(0…a, 벽 y=0·y=a). 모드 `sin(nπy/a)`, 소스 횡위치 `y₀`, 소스 축위치 `z₀`. 새 코드 변수·라벨은 전부 `z`(진행)/`y`(폭). core.js의 위치 인자 `(x,y)`에는 `(z,y)`를 그대로 전달(어댑터 주석 1줄).
- 모드 분해·표시는 n=1,2,3만(n≥4 미표시, 화면·주석 명시).
- 고정 상수: `a=60`, `L=300`, `xLeft=110`, `xRight=110`, `Ny=220`, `y0pix=110`(폭축 중심 픽셀), `aw=0.8`, `Nmax=420`, `z0=0.12·L=36`(셀), `zStartCap=0.5·L`.
- 모드 색: n=1 파랑 `#4a90d9`, n=2 초록 `#3fb56b`, n=3 주황 `#e8913a`. 실선=실측(MoM), 점선=이론.
- 슬라이더: `input`은 수치 표시만, 재계산은 150ms 디바운스.
- 파일 배치는 되돌리기 안전 — 루트 `index.html`(기존 시뮬)은 건드리지 않는다.
- 커밋 메시지는 한국어, 끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

**참조 스펙:** `docs/superpowers/specs/2026-07-14-wire-array-mode-decomposition-design.md`

**재사용 엔진 API (수정 금지):**
- `core.js`(require 시 반환 / 브라우저 `WireWG`): `buildWires(a,L,d,aw)→[{x,y,aw}]`(y=±a/2 셀), `incLine(k,xs,ys,x,y)→[re,im]`, `incPlane(k,x,y)→[re,im]`, `solveMoM(wires,k,incFn)→[cre,cim]`(Float64Array), `totalField(wires,cre,cim,k,incFn,x,y)→[re,im]`, `scatteredField(...)→[re,im]`, `cutoffInfo(lambda,a)→{evanescent,kappa,kguide}`.
- `hankel.js`(`WG`): `buildHankelTable(k,rMax[,dx])→{re,im,k,dx,n}`.
- `field.js`(`WG`): `makeField(Nx,Ny)→{re,im,Nx,Ny}`, `computeIncidentGrid(field,incFnCell,xLeft,y0)`, `computeScatteredGrid(field,wiresPix,cre,cim,table,xLeft)`, `addComplex(dst,a,b)`.
- `render.js`(`WG`): `drawField(ctx,field,scale,phase)`, `drawWireDots(ctx,wiresPix,cre,cim,phase,scale,Ny)`, `drawPlatesWire(ctx,geom)`.

---

## File Structure

```
higher-order/
  index.html    새 페이지 마크업 (엔진 4파일 + modes.js + script.js 로드)
  style.css     새 페이지 스타일
  modes.js      순수 물리 헬퍼 (전역 WGM) — node 테스트 대상
  script.js     상태·컴퓨트 호출·렌더·애니메이션·컨트롤 (브라우저)
core.js field.js hankel.js render.js   [재사용] <script src="../core.js"> …
verify/
  test_modes_dauto.js
  test_modes_coef.js
  test_modes_theory.js
  test_modes_window.js
  test_modes_wall.js
  test_modes_scene.js
```

---

## Task 1: modes.js 골격 + dAuto (도선 간격 자동값)

**Files:**
- Create: `higher-order/modes.js`
- Test: `verify/test_modes_dauto.js`

**Interfaces:**
- Produces: `WGM.dAuto(lambda, L, Nmax) → number`. 자동 도선 간격(셀). `clamp` 의미는
  `Math.min(0.1*lambda, Math.max(0.08*lambda, L/Nmax))` — 벽 무결성 상한 `0.1λ`가 최종 상한,
  계산 보호 하한 `d_floor=L/Nmax`. 정상 구간에선 `0.08λ` 반환.

- [ ] **Step 1: 실패 테스트 작성** — `verify/test_modes_dauto.js`

```javascript
'use strict';
var assert = require('assert');
var WGM = require('../higher-order/modes.js');

// 정상 구간: 0.08λ 반환 (floor·cap 미발동). λ=24(=0.4a), L=300, Nmax=420 → floor=0.714
assert(Math.abs(WGM.dAuto(24, 300, 420) - 0.08 * 24) < 1e-9, 'normal→0.08λ');
// λ=150(=2.5a): 0.08*150=12, floor=0.714, cap=15 → 12
assert(Math.abs(WGM.dAuto(150, 300, 420) - 12) < 1e-9, 'large λ→0.08λ');
// floor 발동: Nmax를 작게(=10) → floor=30. 0.08*24=1.92, cap=0.1*24=2.4 → min(2.4,max(1.92,30))=2.4
assert(Math.abs(WGM.dAuto(24, 300, 10) - 2.4) < 1e-9, 'floor>cap → cap(0.1λ) 상한');
// 항상 d/λ ≤ 0.1 (자동 모드 벽 무결성 보장)
assert(WGM.dAuto(24, 300, 420) / 24 <= 0.1 + 1e-9, 'd/λ≤0.1');
console.log('PASS: dAuto');
```

- [ ] **Step 2: 실패 확인** — Run: `node verify/test_modes_dauto.js` · Expected: FAIL(`Cannot find module '../higher-order/modes.js'`).

- [ ] **Step 3: modes.js 골격 + dAuto 구현**

```javascript
(function (global) {
  'use strict';
  // 진행축 z를 core.js의 위치 첫 인자(x)에 그대로 전달한다 (좌표 어댑터).

  function dAuto(lambda, L, Nmax) {
    var floor = L / Nmax, cap = 0.1 * lambda, target = 0.08 * lambda;
    return Math.min(cap, Math.max(target, floor));
  }

  var API = { dAuto: dAuto };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { global.WGM = global.WGM || {}; Object.assign(global.WGM, API); }
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 4: 통과 확인** — Run: `node verify/test_modes_dauto.js` · Expected: `PASS: dAuto`.

- [ ] **Step 5: 커밋**

```bash
git add higher-order/modes.js verify/test_modes_dauto.js
git commit -m "feat: modes.js 골격 + dAuto(도선 간격 자동값, 벽무결성 상한/계산보호 하한)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: 모드 분해 일반화 (modeCoefGridN / modeCoefComplexAtN)

**Files:**
- Modify: `higher-order/modes.js`
- Test: `verify/test_modes_coef.js`

**Interfaces:**
- Consumes: 그리드 `field={re,im,Nx,Ny}`(픽셀 배열, `idx=i*Ny+j`).
- Produces:
  - `WGM.modeCoefGridN(field, y0, a, n) → Float32Array` 길이 Nx. 각 픽셀열 i에서
    `|cₙ|`. 폭축 j∈[round(y0−a/2), round(y0+a/2)], span=jTop−jBot, 가중 `sin(nπ(j−jBot)/span)`,
    `/span` 정규화. (n=1이면 기존 `diag.modeCoefGrid`와 동일.)
  - `WGM.modeCoefComplexAtN(field, y0, a, iPix, n) → [re, im]` 특정 열의 복소 계수.

- [ ] **Step 1: 실패 테스트 작성** — `verify/test_modes_coef.js`

```javascript
'use strict';
var assert = require('assert');
var WGM = require('../higher-order/modes.js');
var WG = require('../hankel.js');
Object.assign(WG, require('../field.js'));

var Nx = 40, Ny = 220, a = 60, y0 = 110;
var jBot = Math.round(y0 - a / 2), jTop = Math.round(y0 + a / 2), span = jTop - jBot;

// 합성장: E(y) = sin(2π(j-jBot)/span) → n=2만 커야 함 (직교성)
var f = WG.makeField(Nx, Ny);
for (var i = 0; i < Nx; i++) for (var j = jBot; j <= jTop; j++)
  f.re[i * Ny + j] = Math.sin(2 * Math.PI * (j - jBot) / span);

var c1 = WGM.modeCoefGridN(f, y0, a, 1);
var c2 = WGM.modeCoefGridN(f, y0, a, 2);
var c3 = WGM.modeCoefGridN(f, y0, a, 3);
assert(c2[20] > 0.3, 'n=2 결합 커야: ' + c2[20]);
assert(c1[20] < 0.02, 'n=1 거의 0: ' + c1[20]);
assert(c3[20] < 0.02, 'n=3 거의 0: ' + c3[20]);

// 복소 계수: 위 실장에서 im=0 이므로 phase≈0
var cc = WGM.modeCoefComplexAtN(f, y0, a, 20, 2);
assert(Math.abs(cc[1]) < 1e-6, 'im≈0');
console.log('PASS: modeCoefGridN 직교성');
```

- [ ] **Step 2: 실패 확인** — Run: `node verify/test_modes_coef.js` · Expected: FAIL(`modeCoefGridN is not a function`).

- [ ] **Step 3: 구현 추가** (modes.js의 `var API` 위에 삽입, API에 등록)

```javascript
  function modeCoefGridN(field, y0, a, n) {
    var Nx = field.Nx, Ny = field.Ny, re = field.re, im = field.im;
    var jBot = Math.round(y0 - a / 2), jTop = Math.round(y0 + a / 2), span = jTop - jBot;
    var out = new Float32Array(Nx);
    if (span < 1) return out;
    for (var i = 0; i < Nx; i++) {
      var sr = 0, si = 0;
      for (var j = jBot; j <= jTop; j++) {
        var w = Math.sin(n * Math.PI * (j - jBot) / span), idx = i * Ny + j;
        sr += re[idx] * w; si += im[idx] * w;
      }
      out[i] = Math.sqrt(sr * sr + si * si) / span;
    }
    return out;
  }
  function modeCoefComplexAtN(field, y0, a, iPix, n) {
    var Ny = field.Ny, re = field.re, im = field.im;
    var jBot = Math.round(y0 - a / 2), jTop = Math.round(y0 + a / 2), span = jTop - jBot;
    var sr = 0, si = 0;
    for (var j = jBot; j <= jTop; j++) {
      var w = Math.sin(n * Math.PI * (j - jBot) / span), idx = iPix * Ny + j;
      sr += re[idx] * w; si += im[idx] * w;
    }
    return [sr / span, si / span];
  }
```

(그리고 `API = { dAuto: dAuto, modeCoefGridN: modeCoefGridN, modeCoefComplexAtN: modeCoefComplexAtN };`)

- [ ] **Step 4: 통과 확인** — Run: `node verify/test_modes_coef.js` · Expected: `PASS: modeCoefGridN 직교성`.

- [ ] **Step 5: 커밋**

```bash
git add higher-order/modes.js verify/test_modes_coef.js
git commit -m "feat: 모드 분해 n=1..3 일반화 (modeCoefGridN/ComplexAtN)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 이론값 헬퍼 (κ, k_z, 전파 진폭비)

**Files:**
- Modify: `higher-order/modes.js`
- Test: `verify/test_modes_theory.js`

**Interfaces:**
- Produces:
  - `WGM.theoryKappa(n, a, k) → number|null` = `√((nπ/a)²−k²)` (차단일 때, 아니면 null).
  - `WGM.theoryKz(n, a, k) → number|null` = `√(k²−(nπ/a)²)` (전파일 때, 아니면 null).
  - `WGM.theoryPropAmp(n, y0spec, a, k) → number|null` = `|sin(nπy0spec/a)| / theoryKz` (전파일 때).
    `y0spec`는 폭축 위치(0…a). 차단이면 null.

- [ ] **Step 1: 실패 테스트 작성** — `verify/test_modes_theory.js`

```javascript
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
```

- [ ] **Step 2: 실패 확인** — Run: `node verify/test_modes_theory.js` · Expected: FAIL.

- [ ] **Step 3: 구현 추가**

```javascript
  function _kc(n, a) { return n * Math.PI / a; }
  function theoryKappa(n, a, k) { var kc = _kc(n, a); return (k < kc) ? Math.sqrt(kc * kc - k * k) : null; }
  function theoryKz(n, a, k) { var kc = _kc(n, a); return (k > kc) ? Math.sqrt(k * k - kc * kc) : null; }
  function theoryPropAmp(n, y0spec, a, k) {
    var kz = theoryKz(n, a, k); if (kz === null || kz < 1e-12) return null;
    return Math.abs(Math.sin(n * Math.PI * y0spec / a)) / kz;
  }
```

(API에 `theoryKappa, theoryKz, theoryPropAmp` 등록)

- [ ] **Step 4: 통과 확인** — Run: `node verify/test_modes_theory.js` · Expected: `PASS: theory`.

- [ ] **Step 5: 커밋**

```bash
git add higher-order/modes.js verify/test_modes_theory.js
git commit -m "feat: 이론값 헬퍼 (theoryKappa/Kz/PropAmp)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: 관찰 구간(κ 스케일 여유 + NaN 분기) + 측정 κ·k_z

**Files:**
- Modify: `higher-order/modes.js`
- Test: `verify/test_modes_window.js`

**Interfaces:**
- Produces:
  - `WGM.fitWindowZ(z0, L, kappaMin) → {zStart, zEnd, valid}` (셀 좌표).
    `kappaMin`이 유효(>0, 유한)하면 `zStart = clamp(z0 + 2/kappaMin, 0.2L, 0.5L)`.
    `kappaMin`이 null/NaN/0(차단 모드 없음)이면 `zStart = 0.2L` (⚠ NaN 분기 — 없으면 NaN).
    `zEnd = 0.7L`. `valid = zEnd > zStart`.
  - `WGM.measureKappaN(ampArr, xLeft, win) → number|null` : `ln|cₙ|` 최소제곱 기울기의 음수.
  - `WGM.measureKzN(field, y0, a, n, xLeft, win) → number` : 복소 계수 위상 언랩 기울기.

- [ ] **Step 1: 실패 테스트 작성** — `verify/test_modes_window.js`

```javascript
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
console.log('PASS: fitWindowZ (NaN 분기 포함)');
```

- [ ] **Step 2: 실패 확인** — Run: `node verify/test_modes_window.js` · Expected: FAIL.

- [ ] **Step 3: 구현 추가**

```javascript
  function fitWindowZ(z0, L, kappaMin) {
    var lo = 0.2 * L, cap = 0.5 * L, zStart;
    if (kappaMin && isFinite(kappaMin) && kappaMin > 0) {
      zStart = z0 + 2 / kappaMin;
      if (zStart < lo) zStart = lo;
      if (zStart > cap) zStart = cap;
    } else {
      zStart = lo; // ⚠ 차단 모드 없음 → 여유 항 미사용 (NaN 방지)
    }
    var zEnd = 0.7 * L;
    return { zStart: zStart, zEnd: zEnd, valid: zEnd > zStart };
  }
  function _fitLogSlope(xs, amps) {
    var sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0;
    for (var i = 0; i < xs.length; i++) {
      if (amps[i] < 1e-14) continue;
      var lv = Math.log(amps[i]); sx += xs[i]; sy += lv; sxx += xs[i] * xs[i]; sxy += xs[i] * lv; n++;
    }
    if (n < 2) return null;
    return (n * sxy - sx * sy) / (n * sxx - sx * sx);
  }
  function measureKappaN(ampArr, xLeft, win) {
    if (!win.valid) return null;
    var xs = [], amps = [];
    for (var xc = win.zStart; xc <= win.zEnd; xc += 1) {
      var ip = Math.round(xc) + xLeft; if (ip < 0 || ip >= ampArr.length) continue;
      xs.push(xc); amps.push(ampArr[ip]);
    }
    var s = _fitLogSlope(xs, amps);
    return (s === null) ? null : -s;
  }
  function measureKzN(field, y0, a, n, xLeft, win) {
    var xs = [], phis = [];
    for (var xc = win.zStart; xc <= win.zEnd; xc += 1) {
      var c = modeCoefComplexAtN(field, y0, a, Math.round(xc) + xLeft, n);
      xs.push(xc); phis.push(Math.atan2(c[1], c[0]));
    }
    for (var i = 1; i < phis.length; i++) {
      while (phis[i] - phis[i - 1] > Math.PI) phis[i] -= 2 * Math.PI;
      while (phis[i] - phis[i - 1] < -Math.PI) phis[i] += 2 * Math.PI;
    }
    var sx = 0, sy = 0, sxx = 0, sxy = 0, m = xs.length;
    for (var j = 0; j < m; j++) { sx += xs[j]; sy += phis[j]; sxx += xs[j] * xs[j]; sxy += xs[j] * phis[j]; }
    return Math.abs((m * sxy - sx * sy) / (m * sxx - sx * sx));
  }
```

(API에 `fitWindowZ, measureKappaN, measureKzN` 등록)

- [ ] **Step 4: 통과 확인** — Run: `node verify/test_modes_window.js` · Expected: `PASS: fitWindowZ (NaN 분기 포함)`.

- [ ] **Step 5: 커밋**

```bash
git add higher-order/modes.js verify/test_modes_window.js
git commit -m "feat: 관찰구간 fitWindowZ(κ 스케일 여유+NaN 분기)+측정 κ·k_z

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: 벽 무결성 |T| (단일 벽 수직 입사 누설)

**Files:**
- Modify: `higher-order/modes.js`
- Test: `verify/test_modes_wall.js`

**Interfaces:**
- Consumes: `core.solveMoM`.
- Produces: `WGM.wallTransmittanceT(core, a, L, d, aw, k) → number`.
  정의(스펙 §7.2 (a) 유한 배열 누설): 진행축 z를 따라 **한 줄** 도선(y=0)을 간격 d로 배열하고,
  **벽에 수직(+y 방향)** 평면파 `e^{iky}`(진폭 1)를 입사시켜 MoM으로 전류를 푼 뒤, **벽 반대편**
  (y = +yProbe) 중간 z 구간의 전체장 |E| 평균을 |T|로 반환. 좋은 벽일수록 산란파가 입사파를 상쇄해
  |T|→0, 성긴 벽일수록 |T|→1. `yProbe = max(5, round(d))`.

- [ ] **Step 1: 실패 테스트 작성** — `verify/test_modes_wall.js`

```javascript
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
```

- [ ] **Step 2: 실패 확인** — Run: `node verify/test_modes_wall.js` · Expected: FAIL.

- [ ] **Step 3: 구현 추가**

```javascript
  function wallTransmittanceT(core, a, L, d, aw, k) {
    var wires = [], nW = Math.round(L / d) + 1;
    for (var i = 0; i < nW; i++) wires.push({ x: i * d, y: 0, aw: aw });
    var inc = function (x, y) { return [Math.cos(k * y), Math.sin(k * y)]; }; // +y 진행, 벽에 수직
    var sol = core.solveMoM(wires, k, inc), cre = sol[0], cim = sol[1];
    var yProbe = Math.max(5, Math.round(d));
    var z0 = 0.25 * L, z1 = 0.75 * L, s = 0, cnt = 0;
    for (var z = z0; z <= z1; z += 1) {
      var e = core.totalField(wires, cre, cim, k, inc, z, yProbe);
      s += Math.sqrt(e[0] * e[0] + e[1] * e[1]); cnt++;
    }
    return cnt ? s / cnt : 0;
  }
```

(API에 `wallTransmittanceT` 등록)

- [ ] **Step 4: 통과 확인** — Run: `node verify/test_modes_wall.js` · Expected: `PASS: wallTransmittanceT 단조 …`.

- [ ] **Step 5: 커밋**

```bash
git add higher-order/modes.js verify/test_modes_wall.js
git commit -m "feat: 벽 무결성 |T|(단일 벽 수직 입사 누설, d/λ 단조)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: 씬 계산 파이프라인 computeScene (node 테스트 가능)

**Files:**
- Modify: `higher-order/modes.js`
- Test: `verify/test_modes_scene.js`

**Interfaces:**
- Consumes: `core`, `WG`(hankel+field 병합).
- Produces: `WGM.computeScene(core, WG, p) → scene`.
  `p = {lambda, a, L, d, y0spec, aw, xLeft, xRight, Ny, y0pix, z0}`.
  반환 `scene = {Nx, k, d, wiresPix, wiresPixDraw, cre, cim, inc, scat, tot, info, dOverLambda, wallT}`.
  - `k = 2π/lambda`, `Nx = xLeft + L + xRight`.
  - 소스: `incLine(k, z0, y0spec − a/2, ·)` (폭축 spec→셀 변환; 도파관 **내부** 선원).
  - 벽 도선: `core.buildWires(a, L, d, aw)`. `solveMoM` → 전류.
  - 그리드: `inc`(computeIncidentGrid) + `scat`(computeScatteredGrid) → `tot`(addComplex).
    **입사/산란 분리 유지**(§8): `inc`·`scat`를 각각 보관한 뒤 합산해 `tot` 생성.
  - `info = cutoffInfo(lambda, a)`, `dOverLambda = d/lambda`, `wallT = wallTransmittanceT(...)`.

- [ ] **Step 1: 실패 테스트 작성** — `verify/test_modes_scene.js`

```javascript
'use strict';
var assert = require('assert');
var core = require('../core.js');
var WG = require('../hankel.js'); Object.assign(WG, require('../field.js'));
var WGM = require('../higher-order/modes.js');

// 프리셋 ② λ=1.5a=90, 중심 소스 y0=a/2=30
var p = { lambda: 90, a: 60, L: 300, d: WGM.dAuto(90, 300, 420), y0spec: 30,
          aw: 0.8, xLeft: 110, xRight: 110, Ny: 220, y0pix: 110, z0: 36 };
var s = WGM.computeScene(core, WG, p);
assert(s.tot && s.tot.Nx === 110 + 300 + 110, 'Nx');
assert(isFinite(s.tot.re[100 * s.Ny + 110]), '장 유한');
assert(s.info.evanescent === false, 'λ=1.5a 전파');
// 관찰 구간 시작에서 mode1 진폭 > 0
var amp1 = WGM.modeCoefGridN(s.tot, p.y0pix, p.a, 1);
assert(amp1[p.xLeft + 150] > 1e-6, 'mode1 실림');
// 중심 소스 → mode2 결합 바닥
var amp2 = WGM.modeCoefGridN(s.tot, p.y0pix, p.a, 2);
assert(amp2[p.xLeft + 150] < amp1[p.xLeft + 150] * 0.05, '중심 소스 mode2 바닥');
console.log('PASS: computeScene (mode1 실림, 중심 mode2 바닥)');
```

- [ ] **Step 2: 실패 확인** — Run: `node verify/test_modes_scene.js` · Expected: FAIL.

- [ ] **Step 3: 구현 추가**

```javascript
  function computeScene(core, WG, p) {
    var k = 2 * Math.PI / p.lambda, Nx = p.xLeft + p.L + p.xRight;
    var y0cell = p.y0spec - p.a / 2;
    var incFn = function (x, y) { return core.incLine(k, p.z0, y0cell, x, y); };
    var wires = core.buildWires(p.a, p.L, p.d, p.aw);
    var wiresPix = wires.map(function (w) { return { x: w.x, y: p.y0pix + w.y, aw: w.aw }; });
    var wiresPixDraw = wiresPix.map(function (w) { return { x: w.x + p.xLeft, y: w.y }; });
    var sol = core.solveMoM(wires, k, incFn);
    var table = WG.buildHankelTable(k, Nx + p.Ny + 20);
    var inc = WG.computeIncidentGrid(WG.makeField(Nx, p.Ny), incFn, p.xLeft, p.y0pix);
    var scat = WG.computeScatteredGrid(WG.makeField(Nx, p.Ny), wiresPix, sol[0], sol[1], table, p.xLeft);
    var tot = WG.addComplex(WG.makeField(Nx, p.Ny), inc, scat);
    return {
      Nx: Nx, Ny: p.Ny, k: k, d: p.d, wiresPix: wiresPix, wiresPixDraw: wiresPixDraw,
      cre: sol[0], cim: sol[1], inc: inc, scat: scat, tot: tot,
      info: core.cutoffInfo(p.lambda, p.a), dOverLambda: p.d / p.lambda,
      wallT: wallTransmittanceT(core, p.a, p.L, p.d, p.aw, k)
    };
  }
```

(API에 `computeScene` 등록)

- [ ] **Step 4: 통과 확인** — Run: `node verify/test_modes_scene.js` · Expected: `PASS: computeScene …`.

- [ ] **Step 5: 커밋**

```bash
git add higher-order/modes.js verify/test_modes_scene.js
git commit -m "feat: computeScene 파이프라인(내부 선원+입사/산란 분리+벽|T|)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: HTML/CSS 골격 + 히트맵 렌더 + 애니메이션

**Files:**
- Create: `higher-order/index.html`, `higher-order/style.css`, `higher-order/script.js`

**Interfaces:**
- Consumes: `WGM.computeScene`, `WG.drawField/drawWireDots/drawPlatesWire`.
- Produces(script.js 내부): `state`, `rebuild()`(→`window.__scene`), `frame()` 애니메이션 루프.

- [ ] **Step 1: index.html 작성** — 엔진·헬퍼 로드 순서 주의(core→hankel→field→render→modes→script).

```html
<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>도체도선배열을 이용한 입사파-산란파 중첩 모형</title>
<link rel="stylesheet" href="style.css"></head>
<body>
<h1>도체도선배열을 이용한 입사파-산란파 중첩 모형</h1>
<p class="sub">벽=두 줄 도선, 각 도선 표면 경계조건으로 산란파 결정(MoM). 내부 장 = 입사파+산란파.
모드 분해는 n=1–3만 표시(n≥4 미표시).</p>
<div class="stage"><div class="cvwrap"><canvas id="cvTot"></canvas></div></div>
<div id="controls"></div>
<div class="stage"><canvas id="cvGraph" width="620" height="240"></canvas></div>
<div id="readouts"></div>
<script src="../core.js"></script>
<script src="../hankel.js"></script>
<script src="../field.js"></script>
<script src="../render.js"></script>
<script src="modes.js"></script>
<script src="script.js"></script>
</body></html>
```

- [ ] **Step 2: style.css 작성** (기존 톤과 맞춘 최소 스타일)

```css
:root { --bg:#0e1020; --fg:#e8ebf5; --mut:#8892b5; }
* { box-sizing:border-box; }
body { margin:0; padding:16px; background:var(--bg); color:var(--fg);
  font-family:"Segoe UI",system-ui,sans-serif; }
h1 { font-size:1.15rem; margin:0 0 4px; }
.sub { color:var(--mut); font-size:0.85rem; margin:0 0 12px; max-width:820px; }
.stage { margin:10px 0; }
.cvwrap { position:relative; display:inline-block; max-width:100%; }
canvas { max-width:100%; background:#0a0c18; border:1px solid #2a3050; image-rendering:pixelated; }
#cvGraph { image-rendering:auto; }
.row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:6px 0; }
.row label { min-width:120px; color:var(--mut); font-size:0.85rem; }
button { background:#1b2140; color:var(--fg); border:1px solid #3a4270;
  border-radius:6px; padding:5px 10px; cursor:pointer; font-size:0.85rem; }
button:hover { background:#252d54; }
.warn { color:#f4a261; }
.mode1 { color:#4a90d9; } .mode2 { color:#3fb56b; } .mode3 { color:#e8913a; }
```

- [ ] **Step 3: script.js — 상태·rebuild·애니메이션 작성**

```javascript
(function () {
  'use strict';
  var core = WireWG;
  var CFG = { a: 60, L: 300, xLeft: 110, xRight: 110, Ny: 220, y0pix: 110, aw: 0.8, Nmax: 420, z0: 36 };
  var state = { lambda: 90, y0spec: 30, dManual: 5, dAutoOn: true, phase: 0, dPhi: 0.15, paused: false };
  var el = function (id) { return document.getElementById(id); };
  var cvTot = el('cvTot');

  function currentD() {
    return state.dAutoOn ? WGM.dAuto(state.lambda, CFG.L, CFG.Nmax) : state.dManual;
  }
  function rebuild() {
    var p = { lambda: state.lambda, a: CFG.a, L: CFG.L, d: currentD(), y0spec: state.y0spec,
      aw: CFG.aw, xLeft: CFG.xLeft, xRight: CFG.xRight, Ny: CFG.Ny, y0pix: CFG.y0pix, z0: CFG.z0 };
    var s = WGM.computeScene(core, WG, p);
    cvTot.width = s.Nx; cvTot.height = s.Ny;
    window.__scene = s;
    if (window.__afterRebuild) window.__afterRebuild(s); // Task 9·10에서 그래프·판독 갱신
  }
  function autoScale(field) { // 완전 차단 대비: 관찰 구간 근처 최대에 스케일
    var Ny = field.Ny, re = field.re, im = field.im, mx = 1e-6;
    var i0 = CFG.xLeft, i1 = CFG.xLeft + Math.round(0.4 * CFG.L);
    for (var i = i0; i < i1; i++) for (var j = 0; j < Ny; j++) {
      var idx = i * Ny + j, v = Math.sqrt(re[idx] * re[idx] + im[idx] * im[idx]);
      if (v > mx) mx = v;
    }
    return mx;
  }
  function geom(s) { return { Nx: s.Nx, Ny: s.Ny, y0: CFG.y0pix, a: CFG.a, xLeft: CFG.xLeft, L: CFG.L }; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frame() {
    var s = window.__scene;
    if (s) {
      if (!state.paused && !reduce) state.phase += state.dPhi;
      var g = cvTot.getContext('2d'), sc = autoScale(s.tot);
      WG.drawField(g, s.tot, sc, state.phase);
      WG.drawPlatesWire(g, geom(s));
      WG.drawWireDots(g, s.wiresPixDraw, s.cre, s.cim, state.phase, sc, s.Ny);
    }
    requestAnimationFrame(frame);
  }

  window.__hoState = state; window.__hoRebuild = rebuild; window.__hoCFG = CFG; window.__hoCurrentD = currentD;
  rebuild(); requestAnimationFrame(frame);
})();
```

- [ ] **Step 4: 브라우저 확인** — `higher-order/index.html`을 더블클릭으로 연다.
  Expected: 히트맵에 소스에서 퍼지는 장 + 두 줄 도선 점이 보이고, 위상 애니메이션이 흐른다.
  `prefers-reduced-motion`이면 정지. 콘솔 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add higher-order/index.html higher-order/style.css higher-order/script.js
git commit -m "feat: 새 페이지 골격+히트맵 렌더+위상 애니메이션(내부 선원)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: 컨트롤 (λ·y₀·중심 버튼·프리셋·d 토글·디바운스)

**Files:**
- Modify: `higher-order/index.html`(controls 마크업), `higher-order/script.js`(이벤트)

**Interfaces:**
- Consumes: `window.__hoState`, `window.__hoRebuild`, `window.__hoCurrentD`.
- Produces: 디바운스된 `scheduleRebuild()`, 프리셋 적용 `applyPreset(id)`.

- [ ] **Step 1: index.html의 `#controls`에 마크업 삽입**

```html
<div id="controls">
  <div class="row"><label>λ / a</label>
    <input id="lambda" type="range" min="0.4" max="2.5" step="0.01" value="1.5">
    <span id="lambdaVal"></span></div>
  <div class="row"><label>소스 y₀ / a</label>
    <input id="y0" type="range" min="0.05" max="0.95" step="0.01" value="0.5">
    <span id="y0Val"></span><button id="centerBtn">중심으로</button></div>
  <div class="row"><label>도선 간격 d</label>
    <input id="dWire" type="range" min="2" max="20" step="1" value="5" disabled>
    <span id="dVal"></span>
    <label style="min-width:auto"><input id="dAuto" type="checkbox" checked> 자동(d=0.08λ)</label></div>
  <div class="row"><label>프리셋</label>
    <button data-preset="1">① 완전차단 2.4a</button>
    <button data-preset="2">② 단일모드 1.5a</button>
    <button data-preset="3">③ 2모드 0.8a·y₀=a/4</button>
    <button data-preset="4">④ 3모드 0.55a·y₀=a/6</button></div>
  <div class="row">
    <button id="pauseBtn">⏸ 일시정지</button>
    <label style="min-width:auto">속도</label>
    <input id="speed" type="range" min="0" max="0.4" step="0.01" value="0.15"></div>
</div>
```

- [ ] **Step 2: script.js에 컨트롤 로직 추가**(IIFE 내부, `rebuild()` 정의 뒤)

```javascript
  var A = CFG.a;
  function lamCells() { return state.lambda; } // state.lambda는 이미 셀 단위로 저장
  function syncReadouts() {
    el('lambdaVal').textContent = (state.lambda / A).toFixed(2) + ' a  (' + state.lambda.toFixed(0) + ' 셀)';
    el('y0Val').textContent = (state.y0spec / A).toFixed(2) + ' a';
    el('dVal').textContent = currentD().toFixed(2) + ' 셀 (d/λ=' + (currentD() / state.lambda).toFixed(3) + ')';
    el('dWire').disabled = state.dAutoOn;
  }
  var timer = null;
  function scheduleRebuild() { if (timer) clearTimeout(timer);
    timer = setTimeout(function () { rebuild(); timer = null; }, 150); }
  el('lambda').addEventListener('input', function (e) {
    state.lambda = (+e.target.value) * A; syncReadouts(); scheduleRebuild(); });
  el('y0').addEventListener('input', function (e) {
    state.y0spec = (+e.target.value) * A; syncReadouts(); scheduleRebuild(); });
  el('centerBtn').addEventListener('click', function () {
    state.y0spec = A / 2; el('y0').value = 0.5; syncReadouts(); rebuild(); });
  el('dWire').addEventListener('input', function (e) {
    state.dManual = +e.target.value; syncReadouts(); scheduleRebuild(); });
  el('dAuto').addEventListener('change', function (e) {
    state.dAutoOn = e.target.checked; syncReadouts(); rebuild(); });
  el('pauseBtn').addEventListener('click', function () {
    state.paused = !state.paused; el('pauseBtn').textContent = state.paused ? '▶ 재개' : '⏸ 일시정지'; });
  el('speed').addEventListener('input', function (e) { state.dPhi = +e.target.value; });

  function applyPreset(id) {
    var m = { '1': [2.4, null], '2': [1.5, null], '3': [0.8, 0.25], '4': [0.55, 1 / 6] };
    var v = m[id]; state.lambda = v[0] * A;
    if (v[1] !== null) { state.y0spec = v[1] * A; el('y0').value = v[1]; }
    el('lambda').value = v[0]; syncReadouts(); rebuild();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-preset]'), function (b) {
    b.addEventListener('click', function () { applyPreset(b.getAttribute('data-preset')); });
  });
  // 초기: state.lambda를 셀 단위로 세팅(슬라이더 기본 1.5a)
  state.lambda = 1.5 * A; state.y0spec = 0.5 * A; syncReadouts();
```

> **주의:** `state.lambda`는 셀 단위(=ratio·a)로 저장한다. Task 6·7의 `computeScene`/`dAuto`는 셀 단위 λ를 받는다. 슬라이더 값(0.4–2.5)은 a 배수이므로 `×A`로 변환해 저장한다.

- [ ] **Step 3: 브라우저 확인** — 슬라이더·프리셋·중심 버튼·자동 체크박스 동작.
  Expected: λ·y₀ 변경 시 150ms 뒤 장 갱신. 자동 해제 시 d 슬라이더 활성. 프리셋 ③④는 y₀도 함께 이동.
  d 판독에 d/λ 표시.

- [ ] **Step 4: 커밋**

```bash
git add higher-order/index.html higher-order/script.js
git commit -m "feat: 컨트롤(λ·y₀·중심 버튼·프리셋 4개·d 자동 토글·디바운스)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: 모드 분해 그래프 (3모드 실측+이론선, 로그 축, 공통 정규화)

**Files:**
- Create: `higher-order/graph.js`
- Modify: `higher-order/index.html`(graph.js 로드), `higher-order/script.js`(`__afterRebuild` 연결)

**Interfaces:**
- Consumes: `WGM.modeCoefGridN/theoryKappa/theoryKz/theoryPropAmp/fitWindowZ`, `scene`.
- Produces: `WG.drawModeGraph(ctx, scene, CFG)` — n=1,2,3 실측(실선)+이론(점선), 로그 y축,
  공통 정규화(관찰 구간 시작 단면 최대 모드 진폭), 범례. 벽 붕괴 시 경고 텍스트.

- [ ] **Step 1: graph.js 작성**

```javascript
(function (global) {
  'use strict';
  var COLORS = { 1: '#4a90d9', 2: '#3fb56b', 3: '#e8913a' };

  function drawModeGraph(ctx, s, CFG) {
    var W = ctx.canvas.width, H = ctx.canvas.height, padL = 52, padB = 30, padT = 16, padR = 12;
    ctx.clearRect(0, 0, W, H);
    var a = CFG.a, k = s.k, y0pix = CFG.y0pix, xLeft = CFG.xLeft, L = CFG.L;

    // 관찰 구간: 차단 모드 최소 κ (없으면 null → fitWindowZ가 0.2L 분기)
    var kappas = [1, 2, 3].map(function (n) { return WGM.theoryKappa(n, a, k); }).filter(function (v) { return v; });
    var kappaMin = kappas.length ? Math.min.apply(null, kappas) : null;
    var win = WGM.fitWindowZ(CFG.z0, L, kappaMin);

    // 실측 |cₙ(z)| (픽셀 배열) + 공통 정규화 기준(관찰 시작 단면 최대 모드 진폭)
    var amps = {}, refIPix = Math.round(win.zStart) + xLeft, norm = 1e-9;
    [1, 2, 3].forEach(function (n) {
      amps[n] = WGM.modeCoefGridN(s.tot, y0pix, a, n);
      if (amps[n][refIPix] > norm) norm = amps[n][refIPix];
    });

    // 로그 y축 매핑
    var decades = 4, yMaxLog = 0.3; // log10(정규화값) 상단 여유
    function X(zc) { return padL + (zc / L) * (W - padL - padR); }
    function Y(val) {
      var lg = Math.log(Math.max(val, 1e-12) / norm) / Math.LN10;
      var t = (yMaxLog - lg) / decades; if (t < 0) t = 0; if (t > 1) t = 1;
      return padT + t * (H - padT - padB);
    }
    // 축·격자
    ctx.strokeStyle = '#2a3050'; ctx.strokeRect(padL, padT, W - padL - padR, H - padT - padB);
    ctx.fillStyle = '#8892b5'; ctx.font = '11px "Segoe UI",sans-serif';
    for (var dd = 0; dd <= decades; dd++) {
      var yy = padT + (dd / decades) * (H - padT - padB);
      ctx.strokeStyle = '#1b2140'; ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(W - padR, yy); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText('1e' + (Math.round(yMaxLog) - dd), padL - 5, yy + 4);
    }
    ctx.textAlign = 'center'; ctx.fillText('z (진행축)', (padL + W) / 2, H - 4);
    // 관찰 구간 음영
    ctx.fillStyle = 'rgba(154,166,216,0.08)';
    ctx.fillRect(X(win.zStart), padT, X(win.zEnd) - X(win.zStart), H - padT - padB);

    // 각 모드: 실측 실선 + 이론 점선
    [1, 2, 3].forEach(function (n) {
      var col = COLORS[n];
      // 실측 실선 (도파관 구간 z=0..L)
      ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.setLineDash([]); ctx.beginPath();
      var started = false;
      for (var zc = 0; zc <= L; zc += 1) {
        var v = amps[n][Math.round(zc) + xLeft];
        var px = X(zc), py = Y(v);
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // 이론 점선
      var kap = WGM.theoryKappa(n, a, k), kz = WGM.theoryKz(n, a, k);
      ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]); ctx.beginPath();
      if (kap) { // 차단: 관찰 시작 실측값에 앵커한 e^{-κz}
        var anchor = amps[n][refIPix];
        for (var zc2 = win.zStart; zc2 <= L; zc2 += 1) {
          var tv = anchor * Math.exp(-kap * (zc2 - win.zStart));
          if (zc2 === win.zStart) ctx.moveTo(X(zc2), Y(tv)); else ctx.lineTo(X(zc2), Y(tv));
        }
      } else if (kz) { // 전파: 수평선. 높이는 mode1 대비 상대비, 전체는 mode1 실측 평균에 앵커
        var h = theoryHeight(n, s, CFG, win, amps, xLeft);
        ctx.moveTo(X(win.zStart), Y(h)); ctx.lineTo(X(L), Y(h));
      }
      ctx.stroke(); ctx.setLineDash([]);
    });

    drawLegend(ctx, padL, padT);
    if (s.dOverLambda > 0.1 || s.wallT > 0.35) drawCollapseWarn(ctx, W, padT);
  }

  // 전파 이론 수평선 높이: mode1은 자기 실측 평균에 앵커(→ 실측과 겹침이 정상),
  // mode n은 |sin(nπy0/a)|/kz 비율을 mode1 대비로 곱해 상대 높이 결정.
  function theoryHeight(n, s, CFG, win, amps, xLeft) {
    var a = CFG.a, k = s.k, y0spec = window.__hoState.y0spec;
    var base = geoMean(amps[1], Math.round(win.zStart) + xLeft, Math.round(win.zEnd) + xLeft);
    var amp1 = WGM.theoryPropAmp(1, y0spec, a, k), ampN = WGM.theoryPropAmp(n, y0spec, a, k);
    if (!amp1 || amp1 < 1e-12 || ampN === null) return base; // mode1 자기 앵커
    return base * (ampN / amp1);
  }
  function geoMean(arr, i0, i1) { var sIn = 0, c = 0;
    for (var i = i0; i <= i1; i++) { var v = arr[i]; if (v < 1e-14) v = 1e-14; sIn += Math.log(v); c++; }
    return c ? Math.exp(sIn / c) : 1e-9; }
  function drawLegend(ctx, x, y) {
    ctx.textAlign = 'left'; ctx.font = '11px "Segoe UI",sans-serif';
    var items = [[1, 'mode1'], [2, 'mode2'], [3, 'mode3']];
    items.forEach(function (it, i) {
      var yy = y + 12 + i * 15; ctx.strokeStyle = COLORS[it[0]]; ctx.lineWidth = 2;
      ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(x + 8, yy); ctx.lineTo(x + 26, yy); ctx.stroke();
      ctx.fillStyle = COLORS[it[0]]; ctx.fillText(it[1], x + 32, yy + 4);
    });
    ctx.fillStyle = '#8892b5'; ctx.fillText('실선=실측(MoM)  점선=이론', x + 90, y + 12);
    ctx.fillText('(n≥4 미표시)', x + 90, y + 27);
  }
  function drawCollapseWarn(ctx, W, y) {
    ctx.fillStyle = '#f4a261'; ctx.textAlign = 'right'; ctx.font = 'bold 12px "Segoe UI",sans-serif';
    ctx.fillText('⚠ 벽 근사 무너짐 — 모드 분해 신뢰도 낮음', W - 16, y + 12);
  }

  global.WG = global.WG || {}; global.WG.drawModeGraph = drawModeGraph;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 2: index.html에 `<script src="graph.js"></script>` 추가**(script.js 앞).

- [ ] **Step 3: script.js에서 그래프 갱신 연결** — IIFE 내부에 추가:

```javascript
  window.__afterRebuild = function (s) {
    var g = el('cvGraph').getContext('2d');
    WG.drawModeGraph(g, s, CFG);
  };
```

- [ ] **Step 4: 브라우저 확인** — 프리셋별 그래프.
  Expected: ② mode1 평평(이론 수평선과 거의 겹침), mode3 점선과 겹치는 감쇠, mode2 바닥.
  ④+y₀=a/6 세 실선 모두 평평, 상대 높이 순서가 이론과 대략 일치. 범례·관찰구간 음영 표시.

- [ ] **Step 5: 커밋**

```bash
git add higher-order/graph.js higher-order/index.html higher-order/script.js
git commit -m "feat: 모드 분해 그래프(3모드 실측+이론선, 로그축, 공통 정규화, 붕괴 경고)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: 수치 판독 (결합·측정 vs 이론·벽 무결성·마디)

**Files:**
- Modify: `higher-order/script.js`(`__afterRebuild`에 판독 추가), `higher-order/index.html`(`#readouts`)

**Interfaces:**
- Consumes: `WGM.theoryKappa/Kz/measureKappaN/measureKzN/modeCoefGridN/fitWindowZ`, `scene`.
- Produces: `#readouts` 갱신 함수(script.js 내부 `renderReadouts(s)`).

- [ ] **Step 1: script.js에 판독 렌더 추가**(`__afterRebuild`에서 호출)

```javascript
  function renderReadouts(s) {
    var a = CFG.a, k = s.k, y0spec = state.y0spec, xLeft = CFG.xLeft, y0pix = CFG.y0pix, L = CFG.L;
    var kappas = [1, 2, 3].map(function (n) { return WGM.theoryKappa(n, a, k); }).filter(function (v) { return v; });
    var kappaMin = kappas.length ? Math.min.apply(null, kappas) : null;
    var win = WGM.fitWindowZ(CFG.z0, L, kappaMin);
    var html = '<div class="row"><b>벽 무결성</b>: |T|=' + s.wallT.toFixed(3) +
      ' , d/λ=' + s.dOverLambda.toFixed(3) +
      (s.dOverLambda > 0.1 || s.wallT > 0.35 ? ' <span class="warn">⚠ 벽 근사 무너짐</span>' : '') + '</div>';
    [1, 2, 3].forEach(function (n) {
      var coup = Math.abs(Math.sin(n * Math.PI * y0spec / a));
      var line = '<div class="row mode' + n + '">mode ' + n +
        ': 결합 |sin(nπy₀/a)|=' + coup.toFixed(3);
      if (coup < 0.02) { line += ' — <b>여기되지 않음(마디 위치)</b>'; }
      else {
        var kz = WGM.theoryKz(n, a, k), kap = WGM.theoryKappa(n, a, k);
        if (kz) {
          var amp = WGM.modeCoefGridN(s.tot, y0pix, a, n);
          var mkz = WGM.measureKzN(s.tot, y0pix, a, n, xLeft, win);
          line += ' — 전파: k_z 측정 ' + mkz.toFixed(4) + ' / 이론 ' + kz.toFixed(4) +
            ' (' + (mkz / kz * 100).toFixed(0) + '%)';
        } else if (kap) {
          var amp2 = WGM.modeCoefGridN(s.tot, y0pix, a, n);
          var mkap = WGM.measureKappaN(amp2, xLeft, win);
          line += ' — 차단: κ 측정 ' + (mkap ? mkap.toFixed(4) : '—') + ' / 이론 ' + kap.toFixed(4) +
            (mkap ? ' (' + (mkap / kap * 100).toFixed(0) + '%)' : '');
        }
      }
      html += line + '</div>';
    });
    el('readouts').innerHTML = html;
  }
```

- [ ] **Step 2: `__afterRebuild`에서 호출** — 기존 `__afterRebuild`를 다음으로 교체:

```javascript
  window.__afterRebuild = function (s) {
    WG.drawModeGraph(el('cvGraph').getContext('2d'), s, CFG);
    renderReadouts(s);
  };
```

- [ ] **Step 3: 브라우저 확인**
  Expected: 각 모드 결합값 표시, 중심 소스에서 mode2가 "여기되지 않음(마디 위치)". 전파/차단별
  측정 vs 이론 % 표시. 수동 모드에서 d를 키우면 |T|·d/λ 증가, 임계 초과 시 경고.

- [ ] **Step 4: 커밋**

```bash
git add higher-order/script.js higher-order/index.html
git commit -m "feat: 수치 판독(결합·측정 vs 이론·벽 무결성 |T|·마디 표시)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: 검증 관문 — selfTest + 프리셋 로그 + 기준 1–6 확인·보고

**Files:**
- Create: `verify/verify_presets.js`

**Interfaces:**
- Consumes: `core`, `WG`, `WGM`. 프리셋 ①–④를 headless로 계산해 측정 κ·k_z를 이론과 대조 로그.

- [ ] **Step 1: 엔진 회귀 확인** — Run: `node core.js` · Expected: `전체 PASS — 물리 코어 정상`.
  (자체 selfTest의 κ·k_z 이론 대비 % 로그를 눈으로 확인.)

- [ ] **Step 2: verify_presets.js 작성** — 프리셋별 수치 로그(그럴듯함 아닌 수치 관문)

```javascript
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
      msg += '전파 k_z ' + m.toFixed(4) + '/' + kz.toFixed(4) + ' (' + (m / kz * 100).toFixed(0) + '%)'; }
    else if (kap) { var mk = WGM.measureKappaN(amp, CFG.xLeft, win);
      msg += '차단 κ ' + (mk ? mk.toFixed(4) : '—') + '/' + kap.toFixed(4) +
        (mk ? ' (' + (mk / kap * 100).toFixed(0) + '%)' : ''); }
    console.log(msg);
  });
}
run('① 완전차단', 2.4, 0.5);
run('② 단일모드', 1.5, 0.5);
run('③ 2모드', 0.8, 0.25);
run('④ 3모드', 0.55, 1 / 6);
```

- [ ] **Step 3: 실행 + 기준 대조** — Run: `node verify/verify_presets.js`
  다음 검증 기준을 로그로 확인(그럴듯함에서 멈추지 말 것):
  - 기준1: ①에서 세 모드 차단, mode1 측정 κ ≈ 이론(수 % 이내).
  - 기준2: ②에서 mode1 전파(측정 k_z ≈ 이론), mode3 차단 κ ≈ 이론, mode2 "여기 안됨".
  - 기준3: ②·③에서 y₀=0.5a면 mode2 "여기 안됨"; ③(y₀=0.25a)에서 mode2 전파로 등장.
  - 기준4: ④에서 n=1,2,3 결합 0.5/0.866/1 모두 나오고 전파.
  - **기준5(핵심): 모든 전파 k_z·차단 κ 측정이 이론과 수 % 이내.** 어긋나면 도선 간격(d)·
    관찰 구간(win)·끝단 반사(zEnd) 점검.
  - 기준6: 수동 d 확대 시 |T| 증가(Task 5 테스트로 이미 단조 확인, 여기선 로그값 관찰).

- [ ] **Step 4: 결과 보고** — 위 로그 수치(측정/이론 %)를 요약해 보고한다.
  기준5가 수 %를 벗어나면 원인(대개 d 과대 → d/λ↑, 또는 win이 소스/끝단에 걸림)을 적고 조정.

- [ ] **Step 5: 커밋**

```bash
git add verify/verify_presets.js
git commit -m "test: 프리셋 ①-④ 수치 검증 로그(측정 κ·k_z vs 이론)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (작성자 점검 결과)

**스펙 커버리지:**
- §2 좌표 규약(z/y) → Global Constraints + 어댑터 주석(Task 1·6). ✅
- §3 엔진 재사용·하위 폴더 → Task 6·7 파일 배치. ✅
- §4 λ 범위·프리셋 4개·n≥4 미표시 → Task 8·9. ✅
- §5 소스 y₀·중심 버튼·z₀ 고정·κ 여유 → Task 6·8, fitWindowZ(Task 4). ✅
- §6 히트맵·모드 그래프·이론선·공통 정규화·수치 → Task 7·9·10. ✅
- §6.3 앵커 겹침 주의 → graph.js `theoryHeight`(mode1 자기 앵커 주석). ✅
- §6.5 관찰 구간(κ 여유·NaN 분기·상한) → Task 4. ✅
- §7 d 자동 토글·|T|(유한 배열 (a))·붕괴 경고 → Task 1·5·8·9·10. ✅
- §8 입사/산란 분리 유지 → computeScene가 inc·scat 분리 보관(Task 6). ✅
- §10 검증 기준 1–6 + 수치 로그 관문 → Task 11. ✅

**플레이스홀더 스캔:** 모든 코드 단계에 실제 코드 포함. TODO/TBD 없음. ✅

**타입 일관성:** `computeScene` 반환 필드(tot/inc/scat/wiresPixDraw/cre/cim/info/k/d/dOverLambda/wallT)를
Task 7·9·10에서 동일 이름으로 사용. `modeCoefGridN(field,y0,a,n)`·`fitWindowZ(z0,L,kappaMin)`·
`measureKzN(field,y0,a,n,xLeft,win)`·`measureKappaN(ampArr,xLeft,win)` 시그니처가 정의 태스크와
사용 태스크에서 일치. `state.lambda`는 전 구간 셀 단위(주의 박스 명시). ✅

**주의(구현자 유의):**
- λ 최소(0.4a=24셀)에서 도선 ≈300여 개 + 벽 |T| 보조 풀이 → 재계산 수백 ms 가능. 디바운스로 흡수하되
  체감 느리면 Nmax 하향 또는 Ny 축소 검토(스펙 §9).
- 완전 차단(①)에서 `autoScale`이 관찰 구간 근처 최대에 맞추는지 확인(전역 최대 고정 금지).

# HANDOFF — 도선 배열 도파관 시뮬레이션

> 작성: 2026-07-08. 몇 시간 뒤(또는 새 세션)에 이어서 구현을 시작하기 위한 인수인계 문서.
> **다음 세션 시작 프롬프트는 `docs/RESUME_PROMPT.md`에 있습니다. 그 내용을 붙여넣고 시작하세요.**

## 지금 어디까지 왔나

- ✅ **기획(브레인스토밍) 완료** — 스펙 확정: `docs/specs/2026-07-08-도선도파관-design.md`
- ✅ **구현 계획 완료** — `docs/superpowers/plans/2026-07-08-도선도파관-simulation.md` (10개 태스크, TDD)
- ✅ **물리 코어 검증됨** — `wire_waveguide_core.js` selfTest 5케이스 PASS (이 환경에서 재확인)
- ✅ **git init + 베이스라인 커밋 완료** (기획 문서·reference·코어)
- ⬜ **구현 시작 전** — Task 1(코어 이식)부터 시작하면 됨

## 무엇을 만드는가 (한 문단)

도선 두 줄로 도파관 벽을 만들고, 입사파가 도선 표면 E=0 조건으로 전류를 강제 → 그 산란파가 내부 균일 성분을 지워 **차단(cutoff)** 을 만드는 과정을, ①입사 ②산란 ③전체 3패널 + ④|c₁(x)| 진단 + ⑤T(λ) 스윕으로 보여주는 **강의 시연용**(프로젝터) 인터랙티브 HTML. `file://` 더블클릭 실행.

## 절대 어기면 안 되는 규약 (물리 정합성)

계획서 "Global Constraints"에 전부 있지만, 핵심만:

1. **인과 방향**: "경계조건이 산란파를 강제 → 상쇄·차단은 결과". 역전 문장 금지.
2. **용어**: evanescent=감쇠파, 도선이 내는 파=산란파, 차단=차단(cutoff).
3. **차단 영역(λ>2a)에서 c₁ 위상 수치·"위상차" 문구 절대 금지.** 동위상+감쇠만.
4. **`core.js`(= wire_waveguide_core.js) 원본 수정 금지.** `kappaFitWindow` 규칙 변경 금지.
5. **위상자 부호(A6 확정)**: 도선 순시값 = `c.re·cosφ + c.im·sinφ` (장 렌더와 동일 부호. 지시문 A6의 `−`는 오기 → `+`로 통일).
6. **투과율·SWR·스윕은 평면파 전용(A1·A2)**, 선원파 시 숨김/비활성.
7. **입출구 |c₁| 완화 = 기하평균(A3)**, a 슬라이더 step=2 짝수픽셀(C2).

## 문서 우선순위 (충돌 시)

1. `구현_프롬프트_도선도파관.md` — 물리 규약 §1·코어이식 §2·함정 §6 (최상위 불변)
2. `superpowers_구현지시_0708.md` — A1~A7 수정지시, C1~C3
3. `docs/specs/2026-07-08-도선도파관-design.md` — 확정 스펙 (A·C 반영본)
4. `docs/superpowers/plans/2026-07-08-도선도파관-simulation.md` — 구현 계획 (실제 코드 포함)

## 파일 지도

**만들 파일** (계획서대로):
```
core.js       ← wire_waveguide_core.js 원본 복사 (수정 금지)
hankel.js     ← reference/hankel.js 복사 (이미 루트에 있음)
field.js      신규 — addWireSource(복소 격자 산란장)
diag.js       신규 — κ·k_z·기하평균T·누설·SWR (그리드 modeCoefGrid)
render.js     신규 — colorForValue/drawField(재사용) + drawWireDots/drawSweep(신규)
sweep.js      신규 — T(λ/2a) chunked 스윕
main.js       신규 — 상태·슬라이더·프리셋·애니메이션 루프
index.html    신규 — 5패널 UI
style.css     신규 — reference 테마 재사용 + 단일열·게이지·프리셋
verify/       신규 — node 검증 스크립트 (console_check.js 등)
```

**참조 전용** (`reference/`): 기존 도파관 시뮬. 색매핑(`colorForValue`)·mm규약(×2)·테마색·`drawField`의 단일 출처. **값을 새로 짓지 말 것(A7).**

**재사용 금지**: reference `main.js`의 `computeFitInterval`(영상법 전용), `physics.js`의 `computeModeField`(무한평행판) — 이 시뮬과 무관.

## 검증 방식 (확정됨)

- **물리 수치** = node 콘솔 자동 검증(assert): `node verify/console_check.js`
- **렌더·애니메이션·위상자** = 브라우저 육안 체크리스트 (계획서 각 태스크에 있음)
- Playwright 등 브라우저 자동화·npm 의존성 도입 안 함.

## 핵심 기본 파라미터

`a=60, L=300, d=5, aw=0.8` (셀 단위, mm=×2). 프리셋: ①전파 λ=90 / ②차단 λ=140 / ③성긴벽 d=20.
좌표: `xLeft=110, xRight=110, Nx=xLeft+L+xRight, Ny=220, y0=110`. 도선 픽셀 y=`y0±a/2`.

## 다음에 할 일 (순서)

1. 계획서 열고 **Task 1**부터 (코어 복사 → `node core.js` PASS 확인).
2. 각 태스크는 실패 테스트 → 구현 → 통과 → 커밋 순(TDD).
3. Task 5부터 브라우저 육안 확인 단계가 나옴 — `index.html` 더블클릭.
4. Task 4·10에서 `node verify/console_check.js`로 회귀 확인.

## 열린 결정 / 주의

- **커밋 습관**: 계획서엔 태스크별 커밋이 있음. git init 완료됨. 커밋은 되돌리기 쉬운 작업이니 계획대로 진행하되, 원치 않으면 세션 시작 시 알려주기.
- **성능 주의**: 격자 채움(도선 122개 × 픽셀 11만)이 수백 ms 가능. Task 10에서 드래그 debounce(150ms)로 처리. Web Worker는 범위 밖.
- **C1 재검증 필수**: 진단을 그리드 `modeCoefGrid`(/span)로 바꿨으므로, Task 3·4에서 κ·k_z가 여전히 이론 ±15%인지 반드시 확인. 벗어나면 정규화/샘플링을 core 값과 대조.

# HANDOFF — 도선 배열 도파관 시뮬 (구현 완료본, 2026-07-09)

> 이전 인수인계(`HANDOFF.md`)는 **구현 시작 전** 상태였음. 이 문서는 **구현 10/10 완료 + 최종 리뷰 완료** 시점 상태.
> 다음 세션 시작 프롬프트는 이 파일 맨 아래에 있음 — 그대로 붙여넣기.

## 지금 어디까지 왔나

- ✅ **계획서 Task 1~10 전부 구현·리뷰 완료** (서브에이전트 방식, TDD, 태스크별 커밋).
- ✅ **사용자 요청 2건 반영**: (1) 패널 3행 2열 배치(⑤ 전폭) + 도체판 근사 배지(d/λ), (2) ⑤ 스윕 선 색 범례.
- ✅ **물리 자동검증 통과**: `node core.js`(selfTest 5/5), `node verify/console_check.js`(전체 PASS: κ/k_z ±15%, λ/2a=1 무릎, d↑ 누설↑).
- ✅ **전체 브랜치 최종 리뷰(opus) 완료** — 판정 **"With fixes"**. Critical 없음.
- ⬜ **남은 일**: 아래 "병합 전 남은 일" 참조 (Important 1건 결정 + Minor 정리 + 최종 육안검수 + 브랜치 마무리).

## git 상태

- 브랜치 `master`, 베이스라인 `b55d8f4` → 현재 HEAD `c906262`. 총 15커밋.
- 작업트리에 **`화면 캡처 2026-07-09 070930.jpg`**(사용자 스크린샷, 추적 안 됨)가 루트에 있음 — 산출물 아님, 정리 대상.
- 진행 원장: `.superpowers/sdd/progress.md` (태스크별 커밋·리뷰·Minor 기록 전부 있음). 서브에이전트 리포트: `.superpowers/sdd/task-*-report.md`.

## 파일 (전부 생성됨)

`core.js`(=wire_waveguide_core.js 바이트동일), `hankel.js`, `field.js`, `diag.js`, `render.js`, `sweep.js`, `main.js`, `index.html`, `style.css`, `verify/{test_field,test_diag,console_check}.js`.

## 병합 전 남은 일 (우선순위 순)

### 1. [Important — 사용자 판정 필요] 전파 "전력 투과율 T"가 100% 초과 표시
- **현상**: 전파 영역 정보박스가 `전력 투과율 T = 123.4 %`(기본 ① 전파 프리셋 λ=90), λ=110에선 293%까지 표시. `main.js:142` 무클램프. (⑤ 스윕은 `Math.min(1,p.T)` 클램프돼 문제 없음 — 정보박스만.)
- **원인(물리적으로 정상)**: T는 |c₁(0.88L)/c₁(0.12L)|² — 열린/반사 도파관에서 입구 정재파로 100% 초과 가능. **실제 전력 이득 아님.** 설계 D6가 인정한 특성.
- **충돌**: 계획서 §1-5가 레이블 "전력 투과율" + 이 공식을 명시 → 계획 준수 vs 오해 방지가 상충. **물리교사(사용자) 결정 사항.**
- **선택지**:
  - **A (권장)**: 레이블 유지 + 한 줄 주석 추가 — 예 "※ 측정 |c₁| 비. 입구 정재파로 100% 초과 가능(실제 전력 이득 아님)". 물리코드 불변, 표기만.
  - B: 레이블을 "출구/입구 |c₁| 비"로 변경(계획 §1-5 문구에서 이탈).
  - C: 표시값을 100%로 클램프(연구·수업 도구엔 부적절할 수 있음).
- 물리 계산 코드(diag.js transmittance)는 **건드리지 말 것** — 표기만 조정.

### 2. [Minor 정리 — 선택] 죽은 코드 등
- `diag.js:2` `var core = (typeof require!=='undefined')?null:null;` 삭제.
- `main.js`의 `var refI = xLeft + Math.round(0.12*state.L);`(updateInfo 안, 안 읽힘) 삭제.
- 게이지 라벨 "(측정 κ / 이론)"이 전파 모드에선 k_z 비율 — 라벨 미세 불일치(plateGaugeCap이 보완설명).
- `recompute()`에서 `drawSweepPanel()` 직후 `refreshSweepStale()`가 또 그림 — 이중렌더(무해).
- (도달불가/무해로 판정된 것: modeCoefComplexAt span가드, console_check (c)주석, ④캡션 이론점선, 선원파시 이전 스윕곡선 잔존.)

### 3. [최종 육안 검수 — 사용자] Task 10 체크리스트
`index.html` 더블클릭 후: ①전파 파도타기·T높음 / ②차단 내부 어두움·전 도선 동위상·입구 정재파 / ③성긴벽 게이지↓·누설↑·κ경고 / 드래그 반응(라벨 즉시·화면 150ms) / 도선벽·입구 라벨 / 차단에 위상수치·"위상차" 없음 / 캡션 인과·용어 규약.

### 4. [브랜치 마무리] superpowers:finishing-a-development-branch
- 현재 master에 직접 커밋해옴(사용자 승인됨). 병합 PR 불필요할 수 있음 — 사용자에게 확인.
- 스크린샷 jpg·`.superpowers/`(gitignore 여부 확인) 정리.

## 불변 규약 (계속 지킬 것)
- core.js 원본 수정 금지, kappaFitWindow 규칙 불변.
- 차단 영역(λ>2a) 위상 수치·"위상차" 금지. A6 부호 `cre·cosφ+cim·sinφ`.
- 투과율·SWR·스윕 평면파 전용(A1·A2). 입출구 |c₁| 기하평균(A3). a step=2(C2).
- 좌표: `wiresPix`(x=셀)→computeScatteredGrid, `wiresPixDraw`(x=셀+xLeft)→drawWireDots. **뒤섞지 말 것**(Task 7 버그 수정분).
- 한국어 존댓말, 되돌리기 어려운 작업은 확인 후.

---

## 다음 세션 시작 프롬프트 (아래 블록 그대로 붙여넣기)

```
도선 배열 도파관 시뮬레이션 마무리 작업을 이어서 하려고 해. (작업폴더 C:\dev\sixth-task)

먼저 이 두 파일을 읽어서 맥락을 잡아줘:
1. docs/HANDOFF-2026-07-09-impl-done.md — 구현 완료 상태·남은 일·불변 규약 (여기부터)
2. .superpowers/sdd/progress.md — 태스크별 진행 원장(커밋·리뷰·Minor 기록)

읽고 나서 확인해줘:
- git log --oneline b55d8f4..HEAD 로 15커밋 확인
- node core.js (selfTest PASS) 와 node verify/console_check.js (전체 PASS) 재확인

구현·최종리뷰는 끝났고, 병합 전 남은 일만 처리하면 돼. HANDOFF의 "병합 전 남은 일" 순서대로:
1) [Important] 전파 "전력 투과율 T" 100% 초과 표시 문제 — 나한테 A/B/C 선택지 물어보고 결정 후 표기만 수정(물리코드 불변).
2) [Minor] 죽은 코드 정리(diag.js:2, main.js refI 등) — 할지 말지 물어봐.
3) 내가 index.html 더블클릭해서 Task 10 최종 체크리스트 육안검수.
4) 스크린샷 jpg 등 정리 + 브랜치 마무리 방식 확인.

지킬 것: core.js 수정 금지, 차단영역 위상수치 금지, A6 부호(+), wiresPix(셀)/wiresPixDraw(셀+xLeft) 구분 유지, 평면파 전용(A1·A2), 응답 한국어 존댓말, 되돌리기 어려운 작업은 먼저 확인.

먼저 두 문서 읽고 현재 상태부터 보고해줘.
```

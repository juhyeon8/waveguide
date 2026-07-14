# HANDOFF — 고차 모드 MoM 시뮬레이션 (2026-07-14 중단 지점)

## 지금 무엇을 하고 있었나

기존 도선 배열 도파관 시뮬레이션을 **대폭 수정**하는 새 프로젝트. 제목:
**"도체도선배열을 이용한 입사파-산란파 중첩 모형"**. 같은 MoM 엔진(입사파+산란파 중첩)을
재사용하되, λ 범위를 열고 소스 y₀ 위치를 노출해 **n=1·2·3 횡방향 모드**가 실제로 실리고
분해되는 것을 한 화면에서 보이는 **단일 페이지**를 `higher-order/` 하위 폴더에 만든다.

- 설계 문서(확정): `docs/superpowers/specs/2026-07-14-wire-array-mode-decomposition-design.md` (커밋 115aa1f)
- 구현 계획(확정, 11 태스크 TDD): `docs/superpowers/plans/2026-07-14-wire-array-mode-decomposition.md` (커밋 6f829ee)
- 진행 원장: `.superpowers/sdd/progress-mode-decomp.md`  ← **재개 시 이걸 먼저 읽을 것**

실행 방식: **superpowers subagent-driven-development** (태스크마다 새 구현 서브에이전트 →
리뷰 서브에이전트 → 원장 기록). 브랜치: **master 그대로**(로컬 단일, 원격·main 없음 — 사용자 승인).

## 어디까지 했나

- **Task 1: 완료·리뷰 통과** (6f829ee..0eece0a) — `higher-order/modes.js` 골격 + `dAuto()`. 4케이스 PASS.
- **Task 2: 구현·커밋됨, 리뷰 대기** (0eece0a..**97e62df**) — `modeCoefGridN`·`modeCoefComplexAtN`
  (n=1..3 모드 분해 일반화) 추가. 직교성 테스트 `verify/test_modes_coef.js` PASS.
  ⚠ **아직 태스크 리뷰어를 돌리지 않았다.** 재개하면 여기부터.
- **Task 3~11: 미착수.**

현재 HEAD = `97e62df`. 작업 트리 깨끗(아래 "미추적 파일" 제외).

## 재개 시 첫 행동 (순서)

1. 원장 확인: `cat .superpowers/sdd/progress-mode-decomp.md` + `git log --oneline -5`.
2. **Task 2 리뷰부터**: 리뷰 패키지 생성 후 태스크 리뷰어 디스패치.
   - `bash "<SKILL>/scripts/review-package" 0eece0a 97e62df` (SKILL = subagent-driven-development 스킬 폴더)
   - 리뷰어에게 줄 입력 3개: `task-2-brief.md`, `task-2-report.md`, 생성된 diff 파일.
   - Critical/Important 있으면 fix 서브에이전트 → 재리뷰. clean이면 원장에 완료 기록.
3. 이후 Task 3 → … → 11을 계획서대로 진행(각 태스크: task-brief 추출 → 구현 서브에이전트 →
   review-package → 리뷰어 → 원장 기록).

## 남은 태스크 요약 (계획서 기준)

- **Task 3** 이론값 헬퍼(theoryKappa/Kz/PropAmp) — modes.js 추가, node 테스트.
- **Task 4** 관찰구간 `fitWindowZ`(κ 스케일 여유 + **NaN 분기**) + 측정 κ·k_z.
- **Task 5** 벽 무결성 |T|(단일 벽 수직 입사 누설, d/λ 단조).
- **Task 6** `computeScene` 파이프라인(내부 선원 + 입사/산란 분리 보관).
- **Task 7** HTML/CSS 골격 + 히트맵 렌더 + 위상 애니메이션.
- **Task 8** 컨트롤(λ·y₀·중심 버튼·프리셋 ①~④·d 자동 토글·150ms 디바운스).
- **Task 9** 모드 분해 그래프(3모드 실측 실선+이론 점선, 로그축, 공통 정규화, 붕괴 경고).
- **Task 10** 수치 판독(결합·측정 vs 이론·|T|·마디).
- **Task 11** 검증 관문 — `node core.js` selfTest + `verify_presets.js`로 프리셋 ①~④ 측정
  κ·k_z를 이론과 대조 **로그로 확인 후 보고**(기준 5가 핵심).
- 완료 후: 최종 전체 브랜치 리뷰 → finishing-a-development-branch.

## 반드시 지킬 제약 (계획서 Global Constraints 요약)

- 엔진은 '입사파(소스 H₀)+벽 도선 산란파' 중첩만. **영상법 금지. 모드 전개로 장 생성 금지**(모드 전개는 이론선 전용).
- 좌표: 진행축 `z`, 폭축 `y`(벽 y=0·y=a). 새 코드 변수·라벨 전부 z/y. core.js 위치 인자엔 (z,y) 그대로 전달.
- 모드 표시는 n=1,2,3만(n≥4 미표시 명시).
- 고정상수: a=60, L=300, xLeft=xRight=110, Ny=220, y0pix=110, aw=0.8, Nmax=420, z0=36(=0.12L), zStartCap=0.5L.
- 모드 색: n1 파랑 #4a90d9 / n2 초록 #3fb56b / n3 주황 #e8913a. 실선=실측, 점선=이론.
- 기존 `index.html`(루트, 기존 시뮬)·`diag.js` 등 기존 앱 코드는 건드리지 않는다(CLAUDE.md #4).
- 커밋 메시지 한국어 + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## 알아둘 점

- **modes.js의 n 일반화 함수(modeCoefGridN 등)는 diag.js n=1 로직의 의도된 재구현**이다(기존 앱
  불변 유지 목적). 리뷰어가 "중복"으로 지적하면 정당한 것으로 판정할 것(계획서 변경 불필요).
- 서브에이전트 모델: 코드가 브리프에 완전히 있는 전사+테스트 태스크(1~6)는 저렴한 모델(haiku),
  UI 통합(7~10)은 표준 모델, 리뷰는 diff 규모에 맞춰. **디스패치마다 model 명시.**
- 파일 핸드오프: 브리프·리포트·diff는 파일로 주고받아 컨트롤러 컨텍스트 절약.

## 미추적 파일 (내 작업 아님 — 손대지 말 것)

- `preview-higher-order.html` — 세션 시작 전부터 있던 미추적 파일.
- `docs/superpowers/specs/2026-07-14-higher-order-modes-design.md` — 내가 만든 게 아닌 미추적 초안
  (내 설계 문서는 `…-wire-array-mode-decomposition-design.md`). 정체 불명 — 사용자에게 확인 권장.

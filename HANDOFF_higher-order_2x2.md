# HANDOFF — higher-order 2×2 개편 (미리보기까지)

> 작성: 2026-07-15. `higher-order/` 시뮬을 지시서대로 2×2 개편하는 작업의 인수인계.
> **다음 세션 시작 프롬프트는 `RESUME_higher-order_2x2.md`에 있음. 그 내용을 붙여넣고 시작.**

## 지금 어디까지 왔나

- ✅ 지시서 정독 + 실제 코드 대조 완료 — `구현지시_higher-order_2x2개편.md`
- ✅ **핵심 결정 2건 확정** (아래 "결정 사항")
- ✅ **미리보기 완성** — `higher-order/preview.html` (더블클릭 실행, 실제 물리로 돌아감)
  - 지시서 §1~§4 전 항목 반영
  - 추가로 사용자 요청 반영: **d '자동' 토글 시 슬라이더 손잡이 복귀** 수정
- ⬜ **실제 5개 파일 미반영** — 사용자의 미리보기 육안 승인 대기 중
- ⬜ 승인 후: 미리보기 인라인 블록 → 실제 파일로 분리 + 회귀 검증

## 결정 사항 (다음 세션에서 유지할 것)

1. **`render.js`는 공유 파일**(`../render.js`, 루트 시뮬도 사용) → **직접 수정하지 않음.**
   대신 higher-order 전용 오버라이드 `render-ho.js`(신규)로 감마·벽선·라벨을 higher-order에만 적용.
   **루트 시뮬(`index.html`+`main.js`)은 절대 건드리지 않음.**
2. **미리보기 먼저**(작업약속 6번). 레이아웃/렌더 변경은 `preview.html`로 확인 후 실제 파일 반영.

## 미리보기 구조 (→ 실제 파일 매핑)

`higher-order/preview.html`은 실제 물리는 `<script src>`로 불러오고, 바뀔 코드만 인라인 3블록으로 담음.
승인되면 아래처럼 **그대로 옮기면 됨**:

| 미리보기 인라인 | → 실제 파일 | 작업 |
|---|---|---|
| 블록 A (render-ho) | **`higher-order/render-ho.js` (신규)** | 새 파일로 저장 |
| 블록 B (graph) | `higher-order/graph.js` | 전체 교체 |
| 블록 C (script) | `higher-order/script.js` | 전체 교체 |
| `<head>` CSS | `higher-order/style.css` | grid2x2·panel·cv-label 등 추가 |
| `<body>` 마크업 | `higher-order/index.html` | 2×2 그리드·패널 제목·cvInc/cvScat·scale-note |

### index.html 스크립트 로드 순서 (중요)
```
../core.js → ../hankel.js → ../field.js → render-ho.js → modes.js → graph.js → script.js
```
- **`../render.js`는 로드에서 뺀다.** (draw 함수는 render-ho.js가 제공, buildHankelTable은 hankel.js, 그리드 함수는 field.js에 있어 안전)

## 지시서 반영 요약 (검증 포인트)

- §1 2×2: 좌상 입사·우상 전체·좌하 산란·우하 그래프 + 패널 제목, 좁은 화면 1열
- §2 공통 스케일: `sc = autoScale(s.tot)` 한 번 → 세 패널 동일 (입사 소스 근처만 포화)
- §3-1 감마 0.6 부호 보존 (`colorForValue`) — 너무 진하면 0.7, 약하면 0.5 한 단계만
- §3-2 벽 1px 실선 + '도선 벽' 라벨 3패널 / §3-3 '입구 (z=0)' 라벨
- §3-4 y축 세로 `|cₙ(z)|` / §3-5 실선·점선 샘플 획 / §3-6 바닥(norm×1e-4) 아래 실측선 alpha 0.25
- §4-1 T 캡션 줄(작은 글씨) / §4-2 λ·y₀·d 셀=mm 병기 + a·λ_c·전자레인지 한 줄 (캔버스·그래프축은 셀 유지)

## 추가 수정 (사용자 요청, 미리보기 블록 C에 반영됨)

- 원래도 d 계산값·판독은 자동값으로 정상 복귀했으나 **슬라이더 손잡이가 안 움직여** 혼란.
- `syncReadouts`: 자동 ON일 때 손잡이도 자동값(반올림) 반영.
- `dAuto` change: 자동 해제 시 수동 시작값을 현재 자동값에서 이어받아 급변 방지.
- (소수 4.95는 step=1이라 손잡이 5로 표시, 정확값은 `dVal` 판독)

## 절대 건드리지 말 것 (지시서 §0·§6)

1. `../core.js` 원본, `kappaFitWindow` 규칙
2. 측정·판정 로직: `measureKappaN` / `measureKzN` / `kappaWindowN` 수치 규칙
3. 물리 규약: 인과 방향(경계조건→산란파→차단), 차단 모드 "위상" 표기 금지, 용어(산란파/감쇠파/차단)
4. **루트 시뮬 및 공유 `../render.js`**

## 승인 후 회귀 검증 (지시서 §5.8)

- 프리셋 ①: 산란이 입사 상쇄 → 전체 내부 옅어짐 (세 패널 색 농도)
- 프리셋 ②③④: 판독 k_z·κ % 값이 개편 전과 동일(±15% 밴드)
- 프리셋 ④: mode2 결합 ≈0.87 정상 표시
- `higher-order/index.html` 더블클릭 육안 확인 (자동화 도입 안 함)

## 다음에 할 일 (순서)

1. 사용자에게 미리보기 육안 결과 확인 (감마 진하기 조정 필요?).
2. 승인되면 위 표대로 실제 5개 파일 반영 (render-ho.js 신규 포함, index.html에서 ../render.js 제거).
3. `higher-order/index.html` 더블클릭 → §5 회귀 검증.
4. 검증 통과 후 커밋 여부 사용자에게 확인 (되돌리기 어려운 작업 — 먼저 물어보기).
5. `preview.html`은 임시 파일 — 반영·검증 끝나면 삭제할지 사용자에게 확인.

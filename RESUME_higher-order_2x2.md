# 다음 세션 시작 프롬프트 (아래 블록을 복사해 붙여넣으세요)

---

higher-order 2×2 개편 작업을 이어서 합니다. 먼저 `HANDOFF_higher-order_2x2.md`를 읽고 현재 상태를 파악해 주세요.

핵심 맥락:
- 지시서 `구현지시_higher-order_2x2개편.md`대로 `higher-order/` 시뮬을 2×2로 개편 중.
- 이미 미리보기 `higher-order/preview.html`를 만들어 지시서 §1~§4 전 항목 + d 자동토글 슬라이더 복귀 수정을 반영했고, 더블클릭으로 실제 물리로 돌아갑니다.
- **확정 결정(유지할 것):**
  1) `../render.js`는 루트 시뮬과 공유하는 파일이라 직접 수정 금지 → higher-order 전용 `render-ho.js`(신규)로 대체. 루트 시뮬은 안 건드립니다.
  2) 레이아웃/렌더 변경은 미리보기 먼저(작업약속 6번).
- **건드리지 말 것:** `../core.js`, `kappaFitWindow`, measureKappaN/measureKzN/kappaWindowN 수치 규칙, 물리 규약(인과 방향·차단모드 위상표기 금지·용어), 루트 시뮬.

제가 미리보기를 이미 봤습니다. 결과는 이렇습니다:

  [여기에 육안 확인 결과를 적어 주세요. 예:
   - 전반적으로 좋음 → "그대로 실제 파일에 반영해 줘"
   - 감마가 너무 진함/약함 → "감마 0.7로 / 0.5로 조정해서 미리보기 다시"
   - 특정 라벨·배치·색 수정 요청
   - 회귀: 프리셋 ②③④ % 값 이상 여부]

수정 없이 반영이면: `HANDOFF_higher-order_2x2.md`의 "미리보기 구조 → 실제 파일 매핑" 표대로 실제 5개 파일(render-ho.js 신규, graph.js·script.js 교체, index.html·style.css 수정)에 옮기고, `higher-order/index.html`에서 `../render.js` 로드를 제거해 주세요. 그다음 §5 회귀 검증 안내하고, 커밋과 preview.html 삭제는 진행 전에 저에게 물어봐 주세요.

---

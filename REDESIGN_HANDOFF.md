# Redesign Handoff — Map Editor · Grade Cut Archive

Codex용 작업 지시서. 포털 홈과 Climate Atlas(World·Korea)는 이미 Design System 3.0으로 바뀌었고, 이 문서는 남은 두 페이지를 같은 기준으로 옮기는 작업을 다룸.

## 기준 파일 (먼저 읽기)

- `ds/tokens.css` · `ds/components.css` · `ds/patterns.css`: 3.0 토큰과 컴포넌트. 새 스타일은 이 토큰만 사용.
- `New project 8/design-system/README.md` · `CODEX_HANDOFF.md`: 규칙 원문.
- 완성 예시: `tools/climate/index.html`(뼈대) · `tools/climate/styles.css`(페이지 레이어) · `tools/climate/chart-kit.js`(그래프 스타일).

## 공통 규칙

1. `<head>`에서 루트의 2.1 CSS(`tokens.css`, `base.css`, `components.css`, `patterns.css`)를 빼고 `ds/fonts.css → tokens → base → components → patterns → 페이지 CSS` 순서로 불러옴.
2. 상단은 기후머신과 같은 `header.tw-nav.is-static`을 씀. 로고 마크 없이 `Promenade` 글자만 넣음. 현재 페이지 링크에 `aria-current="page"`.
3. 도구 페이지 흐름: 짧은 머리말(제목 + 필요하면 전환 컨트롤) → `tw-subnav`(스크롤해도 붙는 툴바. 행동 버튼, 검정은 하나) → 작업 영역.
4. **텍스트 최소화.** 설명 문장, 리드 문구, 도움말, 출처·평년값 설명, "자동 조합" 같은 괄호 부연은 넣지 않음. 라벨은 명사 하나로 씀(예: "정렬", "기준"). 숫자 옆 단위만 남김.
5. 색은 흑백만(`--tw-ink*`, `--tw-surface*`). 1px 검정 테두리 대신 회색 면이나 `--tw-hairline`. 컨트롤은 pill, 카드 20–28px.
6. **JS 훅은 건드리지 않음.** `id`, `data-*`, JS가 만드는 클래스명은 그대로 두고 HTML 뼈대와 CSS만 바꿈. JS 수정이 꼭 필요하면 기능은 두고 마크업 문자열만 바꿈.
7. 페이지 안 SVG 그래프는 `chart-kit.js`와 같은 문법을 씀: 헤어라인 그리드(`rgba(0,0,0,.08)`), 바닥선만 진하게, 점선 그리드 없음, 축 단위는 축 위에 `°C`·`mm`처럼 괄호 없이, 막대는 윤곽선 없는 `#d4d4d4`, 숫자는 TWK Lausanne, 음수는 `−`.
   - 예외: **내보내기용 SVG**(Map Editor의 지도 SVG, 출제형 Graph Builder)는 `GRAPH_AND_EXAM_GUIDE.md`의 시험지 규칙(0.3–0.4pt 선, 패턴 채우기, SidaeAi_S)을 그대로 따름. 바꾸는 건 화면 UI뿐.

## Map Editor (`map.html`, `styles.css`, `app.js`)

- 규모가 큼(`styles.css` 약 95KB, `app.js` 약 970KB). CSS를 새로 쓰되 셀렉터는 `app.js`에서 쓰는 클래스명을 기준으로 옮김. 먼저 `grep -o 'class="[^"]*"' app.js`로 훅 목록을 뽑아둠.
- 레이아웃: 왼쪽 `tw-sidebar`(국가/권역 검색·선택 목록), 가운데 캔버스(미리보기), 오른쪽 또는 하단에 속성 패널. 기존 `Quick Workspace` 도구 전환은 `tw-segmented`로.
- 세계/대한민국 전환은 머리말의 `tw-segmented`. `SVG 내보내기`는 툴바의 유일한 검정 버튼, 실행 취소·다시 실행은 ghost 버튼.
- 옵션 묶음(위선, 국경선, 축척, 서체, 인셋)은 `tw-disclosure`로 접고, 각 옵션은 `tw-chip`, `tw-segmented`, `tw-select`로.
- Graph Builder 패널: 카드 하나에 단계(후보 → 자료 구조 → 통계 → 출력)를 `tw-segmented` 또는 번호 없는 소제목으로. 학생용/제작자용 CSV 버튼은 회색 버튼 2개.
- 캔버스 크기 핸들, 드래그 박스, 인셋 편집 박스처럼 기능성 오버레이는 형태를 유지하고 색만 토큰으로 바꿈.

## Grade Cut Archive (`tools/cut/index.html`, `cut.css`, `cut.js`)

- 머리말: 제목 + 과목 전환(`tw-segmented`: 한국지리/세계지리).
- 필터(학년도·시험)는 `tw-chip` 줄. 모바일에서는 가로 스크롤.
- 등급컷 표는 `tw-table-wrap` + `tw-table`. 원점수·표준점수·백분위는 tabular 숫자, 헤더는 12px 보조색.
- 문항 이미지는 흰 카드 안 회색 면(`--tw-radius-md`)에 넣고, 이미지 자체에는 테두리를 두지 않음.
- EBSi 출처는 푸터 한 줄로만.

## 검수

```bash
npm run check          # 전체 회귀 (audits/ 필요)
npm run build          # dist/ 생성 + dist 검증
```

- 1440px, 390px에서 가로 넘침이 없어야 함. 브라우저 콘솔 에러 0.
- 기존 기능 확인: Map Editor는 국가 추가/제거, 한국 권역 on/off, 마커·인셋 추가, SVG 내보내기, 실행 취소, Graph Builder CSV 두 종류. 등급컷은 과목·시험 전환과 문항 이미지 열기.
- `tw-button is-primary`가 한 화면에 둘 이상 보이면 안 됨.

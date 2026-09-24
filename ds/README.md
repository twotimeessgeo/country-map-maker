# Promenade Design System 3.1

Design System 3.0의 흰 바탕, 흑백 작업 영역, Lausanne 영문·숫자, pill 컨트롤을 유지한다. 일반 화면에는 그라데이션을 쓰지 않는다.

색 예외는 `--tw-accent-gradient`를 쓰는 영문 페이지 제목 아래 56×3px 선(모바일 40×2px)과 선택적으로 켜는 Notes 읽기 진행선, 그리고 Notes 글 표지 및 선택적으로 켜는 목록 썸네일뿐이다. 표지 바탕은 짙은 남색으로 통일하고 시험 종류에 따라 Dawn(6월), Dusk(9월), Glacier(수능), Moss(교육청), Ember(기타)를 배정한다. frontmatter의 `cover` 값이 있으면 우선하고 slug 해시로 빛 위치와 각도를 고정한다.

`--tw-track-hero`, `--tw-track-display`, `--tw-track-3xl`, `--tw-track-2xl`, `--tw-track-xl`, `--tw-track-body`로 크기별 자간을 정한다. 한글 제목은 500을 넘기지 않는다. 선택한 지점 토큰은 흰색 윤곽 pill로 두고 필터 칩과 세그먼트는 3.0의 검정 선택·흰 thumb를 쓴다. 한 화면의 검정 행동 버튼은 하나만 둔다. 그림자는 팝오버처럼 떠 있는 층에만 쓰며 큰 구획은 64px(모바일 48px)과 헤어라인으로 나눈다.

홈은 가운데 Promenade 버튼을 열어 네 도구를 보여 주며 가운데에는 선 지구본 하나만 둔다. 지구본은 정지 상태로 시작하고 드래그·관성·더블클릭 복귀·방향키를 지원한다. 404에도 같은 지구본을 쓴다. 첫 방문 글자·메뉴 힌트, 제목 선 400ms, 카드/목록 reveal 50ms 간격, Archive 숫자 600ms, 막대 400ms, 행 재정렬 240ms, pill 누름 120ms를 적용한다. `prefers-reduced-motion`에서는 자동 모션을 끈다.

선택형 효과는 기본 꺼짐이다. `?fx-notes-thumb=1`은 Notes 목록 썸네일, `?fx-progress=1`은 Notes 글 읽기선, `?fx-coords=1`은 Climate 세계 지도 좌표, `?fx-season=1`은 기후 그래프 이번 달 점을 켠다. 각 화면의 `data-fx-*` 속성으로 상태를 확인할 수 있다.

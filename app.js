const d3 = window.d3;
const topojson = window.topojson;

if (!d3 || !topojson || !window.WORLD_ATLAS_TOPOLOGY || !window.WORLD_COUNTRY_NAMES_TSV || !window.KOREA_ADMIN_DATA) {
  throw new Error("필수 지도 데이터 또는 라이브러리를 불러오지 못했습니다.");
}

const latitudeGuideDefinitions = [
  { key: "equator", label: "적도", latitudes: [0], color: "#5c6f82" },
  { key: "lat30", label: "30°", latitudes: [30, -30], color: "#6a6a6a" },
  { key: "lat60", label: "60°", latitudes: [60, -60], color: "#7b7b7b" },
  { key: "tropicCancer", label: "북회귀선", latitudes: [23.4366], color: "#8d6130" },
  { key: "tropicCapricorn", label: "남회귀선", latitudes: [-23.4366], color: "#8d6130" },
];

const markerStyleOptions = [
  { value: "ring", label: "원형" },
  { value: "dashedOval", label: "점선 타원" },
  { value: "point", label: "점 표시" },
  { value: "filledDot", label: "검은 점" },
];

const EARTH_RADIUS_KM = 6371.0088;
const MAP_FONT_FAMILY = "SidaeAi_S";
const MAP_FONT_STRETCH_X = 0.95;
const OUTLINE_STROKE_WIDTH = "0.4pt";
const KOREA_CITY_BOUNDARY_STROKE_WIDTH = "0.24pt";
const KOREA_CITY_CONTEXT_STROKE_WIDTH = "0.6pt";
const KOREA_METRO_DISTRICT_BOUNDARY_STROKE_WIDTH = "0.72pt";
const MIN_INSET_PANEL_WIDTH = 36;
const MIN_INSET_PANEL_HEIGHT = 36;
const MAX_INSET_PANEL_WIDTH = 310;
const MAIN_CANVAS_WIDTH = 310;
const MIN_CANVAS_WIDTH = 140;
const MIN_CANVAS_HEIGHT = 120;
const MIN_ZOOM_DRAG_SIZE = 20;
const MIN_INSET_DRAG_SIZE = 2;
const MAP_RENDER_CLIP_PADDING = 24;
const INSET_RENDER_CLIP_PADDING = 18;
const MIN_INSET_ZOOM_SCALE = 0.2;
const MAX_INSET_ZOOM_SCALE = 2.4;
const MAX_STABLE_SPHERICAL_FILL_AREA = 2 * Math.PI;

const projectionModeLabels = {
  rectangular: "평면",
  northPolar: "북극",
  southPolar: "남극",
};
const mapVersionLabels = {
  world: "세계",
  korea: "대한민국",
};
const koreaRegionLevelLabels = {
  provinces: "도/광역시",
  cities: "시/군",
  metroDistricts: "구/군(특별·광역시)",
};
const koreaParentFieldLabels = {
  provinces: "상위 범위",
  cities: "시/군 범위",
  metroDistricts: "구/군 범위",
};
const koreaParentPlaceholderLabels = {
  cities: "도를 먼저 고르세요",
  metroDistricts: "특별시·광역시를 먼저 고르세요",
};
const koreaRouteLabels = {
  gyeongbuExpressway: "경부고속도로",
  gyeongbuHsr: "경부고속철도",
  yeongdongExpressway: "영동고속도로",
  honamHsr: "호남고속철도",
};
const koreaNameCollator = new Intl.Collator("ko", {
  numeric: true,
  sensitivity: "base",
});

const viewModeLabels = {
  zoom: "영역 확대",
  pan: "이동",
  marker: "마커 추가",
  inset: "인셋 추가",
};

const viewModeDetails = {
  zoom: {
    description: "드래그 박스로 원하는 부분만 크게 보고, 짧게 클릭하면 국가를 바로 선택합니다.",
    hint: "영역 확대 모드에서는 드래그 박스로 원하는 부분만 크게 잡을 수 있고, 짧게 클릭하면 국가를 바로 선택하거나 해제할 수 있습니다.",
    tips: ["클릭: 국가 선택", "드래그: 확대", "휠: 확대/축소", "0: 전체 보기"],
  },
  pan: {
    description: "지도를 끌어 위치를 바꾸고, 짧게 클릭하면 국가를 선택하거나 해제합니다.",
    hint: "이동 모드에서는 지도를 끌어 위치를 바꾸고, 짧게 클릭하면 해당 국가를 선택하거나 해제할 수 있습니다.",
    tips: ["드래그: 위치 이동", "클릭: 국가 선택", "Space: 임시 이동", "휠: 확대/축소"],
  },
  marker: {
    description: "클릭으로 바로 놓거나 드래그해서 크기까지 정한 뒤, 미리보기 위에서 다시 옮길 수 있습니다.",
    hint: "마커 추가 모드에서는 클릭으로 바로 놓거나 드래그해 크기까지 정해 넣을 수 있고, 만들어진 마커는 미리보기 박스에서 직접 이동하거나 크기를 조절할 수 있습니다.",
    tips: ["클릭: 기본 크기", "드래그: 크기 지정", "핸들: 이동/리사이즈", "3: 마커 모드"],
  },
  inset: {
    description: "확대하고 싶은 범위를 드래그하면 인셋이 생기고, 생성 뒤에는 패널 위치와 크기를 바로 조정할 수 있습니다.",
    hint: "인셋 추가 모드에서는 확대하고 싶은 범위를 드래그해 작은 확대 지도 박스를 만들 수 있고, 만들어진 인셋 패널도 미리보기에서 바로 끌어 조정할 수 있습니다.",
    tips: ["드래그: 인셋 만들기", "핸들: 크기 조절", "패널: 위치 이동", "4: 인셋 모드"],
  },
};

const atlasTopologyVariants = {
  "110m": window.WORLD_ATLAS_VARIANTS?.["110m"] ?? null,
  "50m": window.WORLD_ATLAS_TOPOLOGY,
  "10m": window.WORLD_ATLAS_VARIANTS?.["10m"] ?? null,
};
const atlasLakeVariants = {
  "110m": window.WORLD_LAKES_VARIANTS?.["110m"] ?? null,
  "50m": window.WORLD_LAKES_VARIANTS?.["50m"] ?? null,
  "10m": window.WORLD_LAKES_VARIANTS?.["10m"] ?? null,
};
const countryNameRows = d3.tsvParse(window.WORLD_COUNTRY_NAMES_TSV);
const countryNameById = new Map(
  countryNameRows.map((row) => [String(Number(row.id)), row.name.trim()]),
);

const atlasDatasets = Object.fromEntries(
  Object.entries(atlasTopologyVariants)
    .filter(([, variantTopology]) => Boolean(variantTopology))
    .map(([key, variantTopology]) => [key, buildAtlasDataset(variantTopology, key)]),
);
const atlasLakeDatasets = Object.fromEntries(
  Object.entries(atlasLakeVariants)
    .filter(([, geometry]) => geometry?.type === "GeometryCollection")
    .map(([key, geometry]) => [key, buildLakeDataset(geometry, key)]),
);
const baseAtlas = atlasDatasets["50m"] ?? atlasDatasets["110m"] ?? atlasDatasets["10m"];
const baseLakeDataset = atlasLakeDatasets["50m"] ?? atlasLakeDatasets["110m"] ?? atlasLakeDatasets["10m"] ?? null;

const countryFeatures = baseAtlas.countryFeatures;
const countryById = baseAtlas.countryById;
const countryByNormalizedName = new Map(
  countryFeatures.map((feature) => [normalizeText(feature.properties.name), feature]),
);

const countryAliasEntries = [
  ["South Korea", "Korea, Republic of"],
  ["Korea South", "Korea, Republic of"],
  ["Republic of Korea", "Korea, Republic of"],
  ["대한민국", "Korea, Republic of"],
  ["한국", "Korea, Republic of"],
  ["North Korea", "Korea, Democratic People's Republic of"],
  ["Korea North", "Korea, Democratic People's Republic of"],
  ["DPRK", "Korea, Democratic People's Republic of"],
  ["북한", "Korea, Democratic People's Republic of"],
  ["조선민주주의인민공화국", "Korea, Democratic People's Republic of"],
  ["United States of America", "United States"],
  ["USA", "United States"],
  ["US", "United States"],
  ["미국", "United States"],
  ["UK", "United Kingdom"],
  ["Britain", "United Kingdom"],
  ["Great Britain", "United Kingdom"],
  ["영국", "United Kingdom"],
  ["Russia", "Russian Federation"],
  ["러시아", "Russian Federation"],
  ["Vietnam", "Viet Nam"],
  ["베트남", "Viet Nam"],
  ["Laos", "Lao People's Democratic Republic"],
  ["라오스", "Lao People's Democratic Republic"],
  ["Iran", "Iran, Islamic Republic of"],
  ["이란", "Iran, Islamic Republic of"],
  ["Syria", "Syrian Arab Republic"],
  ["시리아", "Syrian Arab Republic"],
  ["Bolivia", "Bolivia, Plurinational State of"],
  ["볼리비아", "Bolivia, Plurinational State of"],
  ["Venezuela", "Venezuela, Bolivarian Republic of"],
  ["베네수엘라", "Venezuela, Bolivarian Republic of"],
  ["Tanzania", "Tanzania, United Republic of"],
  ["탄자니아", "Tanzania, United Republic of"],
  ["Moldova", "Moldova, Republic of"],
  ["몰도바", "Moldova, Republic of"],
  ["Palestine", "Palestinian Territory, Occupied"],
  ["팔레스타인", "Palestinian Territory, Occupied"],
  ["Czechia", "Czech Republic"],
  ["체코", "Czech Republic"],
  ["Ivory Coast", "Côte d'Ivoire"],
  ["코트디부아르", "Côte d'Ivoire"],
  ["DR Congo", "Congo, the Democratic Republic of the"],
  ["Democratic Republic of the Congo", "Congo, the Democratic Republic of the"],
  ["콩고민주공화국", "Congo, the Democratic Republic of the"],
  ["Congo Republic", "Congo"],
  ["Republic of the Congo", "Congo"],
  ["콩고공화국", "Congo"],
  ["North Macedonia", "Macedonia, the former Yugoslav Republic of"],
  ["Macedonia", "Macedonia, the former Yugoslav Republic of"],
  ["북마케도니아", "Macedonia, the former Yugoslav Republic of"],
  ["마케도니아", "Macedonia, the former Yugoslav Republic of"],
  ["Eswatini", "Swaziland"],
  ["Swatini", "Swaziland"],
  ["에스와티니", "Swaziland"],
  ["Taiwan", "Taiwan, Province of China"],
  ["대만", "Taiwan, Province of China"],
  ["Brunei", "Brunei Darussalam"],
  ["브루나이", "Brunei Darussalam"],
  ["Burma", "Myanmar"],
  ["버마", "Myanmar"],
  ["미얀마", "Myanmar"],
  ["France", "France"],
  ["프랑스", "France"],
  ["Poland", "Poland"],
  ["폴란드", "Poland"],
  ["Algeria", "Algeria"],
  ["알제리", "Algeria"],
  ["Japan", "Japan"],
  ["일본", "Japan"],
  ["China", "China"],
  ["중국", "China"],
  ["India", "India"],
  ["인도", "India"],
  ["Bangladesh", "Bangladesh"],
  ["방글라데시", "Bangladesh"],
  ["Nepal", "Nepal"],
  ["네팔", "Nepal"],
  ["Bhutan", "Bhutan"],
  ["부탄", "Bhutan"],
  ["Sri Lanka", "Sri Lanka"],
  ["스리랑카", "Sri Lanka"],
];

const countryByAlias = new Map(
  countryAliasEntries
    .map(([alias, canonicalName]) => [normalizeText(alias), countryByNormalizedName.get(normalizeText(canonicalName))])
    .filter(([, feature]) => Boolean(feature)),
);

const countryStatsById = window.COUNTRY_STATS_BY_ID ?? {};
const countryStatsMeta = window.COUNTRY_STATS_META ?? { sources: {} };
const countryStatsReligionLabels = {
  christians: "크리스트교",
  muslims: "이슬람교",
  hindus: "힌두교",
  buddhists: "불교",
  jews: "유대교",
  other: "기타 종교",
  noReligion: "무종교",
};
const countryStatsReligionFocusKeys = ["christians", "muslims", "hindus", "buddhists"];
const countryStatsEnergyLabels = {
  coal: "석탄",
  oil: "석유",
  gas: "가스",
  nuclear: "원자력",
  hydropower: "수력",
  wind: "풍력",
  solar: "태양광",
  biofuels: "바이오연료",
  bioenergy: "바이오에너지",
  otherRenewables: "기타 재생",
};
const countryStatsIndustryLabels = {
  agriculture: "농림어업",
  industry: "공업",
  services: "서비스업",
};
const countryStatsAgeLabels = {
  age0To14: "0-14세",
  age15To64: "15-64세",
  age65Plus: "65세 이상",
};
const countryStatsCropLabels = {
  wheat: "밀",
  rice: "쌀",
  maize: "옥수수",
};
const countryStatsDependencyLabels = {
  youth: "유소년 부양비",
  oldAge: "노년 부양비",
  total: "총부양비",
};
const metricExplorerRankPalette = [
  "#111111",
  "#2f3136",
  "#4d5158",
  "#6b727d",
  "#8b94a0",
  "#a7b2bf",
  "#bcc6d1",
  "#d3d9e0",
];
const metricExplorerCategoryDefinitions = [
  {
    key: "demography",
    label: "인구 변천 · 도시 · 이동",
    description: "총인구, 출생·사망률, 도시화, 연령 구조, 부양비, 이주·난민",
  },
  {
    key: "agriculture",
    label: "식량 · 가축",
    description: "밀·쌀·옥수수 생산·교역, 3대 가축 사육과 육류 생산",
  },
  {
    key: "religion",
    label: "종교",
    description: "4대 종교 비중과 신자 수 추정",
  },
  {
    key: "economy",
    label: "산업 · 무역",
    description: "수출 규모, 수출 의존도, 농업·공업·서비스업 구조",
  },
  {
    key: "energy",
    label: "에너지 · 자원",
    description: "1차 에너지 소비, 발전 구조, 화석연료 생산",
  },
];
const metricExplorerDisplayModeDefinitions = [
  { key: "overview", label: "개요" },
  { key: "amount", label: "양" },
  { key: "share", label: "비율" },
  { key: "flow", label: "수입·수출·이동" },
  { key: "relative", label: "상댓값 100" },
  { key: "scatter", label: "산포도" },
];
const koreaGeoStatsMeta = window.KOREA_GEO_STATS_META ?? { categories: {}, levels: {} };
const koreaGeoStatsRegionOrderByLevel = window.KOREA_GEO_STATS_REGION_ORDER ?? { provinces: [], cities: [] };
const koreaGeoStatsRegionsByLevel = window.KOREA_GEO_STATS_REGIONS ?? { provinces: {}, cities: {} };
const koreaGeoStatsMetricsByLevel = window.KOREA_GEO_STATS_METRICS ?? { provinces: {}, cities: {} };
const koreaGeoStatsCategoryDefinitions = [
  {
    key: "demography",
    label: "인구 구조 · 이동",
    description: "추계인구, 합계출산율, 노령화지수, 부양비, 전입·전출, 외국인",
  },
  {
    key: "urban",
    label: "도시 · 정주",
    description: "가구당 인구, 도시지역면적, 통근 취업, 주택보급률, 노후주택비율",
  },
  {
    key: "agriculture",
    label: "농업 · 촌락",
    description: "농가수, 농가인구, 농가 비율, 논경지면적",
  },
  {
    key: "industry",
    label: "공업 · 서비스",
    description: "GRDP, 제조업·서비스업 사업체와 종사자, 수출입, 무역수지",
  },
  {
    key: "energy",
    label: "기후 · 에너지",
    description: "최종에너지소비, 전력판매량, 기온, 강수량",
  },
];
const koreaGeoStatsDisplayModeDefinitions = [
  { key: "overview", label: "개요" },
  { key: "trend", label: "시점 변화" },
  { key: "latest", label: "최신 비교" },
  { key: "relative", label: "상댓값 100" },
  { key: "scatter", label: "지표 관계" },
];
const koreaGeoStatsRandomMetricBoosts = {
  "population-growth-rate": 16,
  "aging-index": 18,
  "elderly-share": 20,
  "fertility-rate": 20,
  "net-migration": 18,
  "natural-increase": 18,
  "foreign-resident-share": 16,
  "average-household-size": 12,
  "housing-supply-rate": 16,
  "aged-housing-rate": 14,
  "local-commute-share": 16,
  "outbound-commute-share": 16,
  "farm-household-share": 18,
  "farm-population-share": 18,
  "paddy-field-area": 10,
  "grdp-per-capita": 16,
  "manufacturing-employee-share": 18,
  "service-employee-share": 14,
  "trade-balance": 18,
  exports: 12,
  imports: 12,
  "final-energy-consumption": 12,
  "electricity-sales": 12,
  temperature: 10,
  precipitation: 10,
};
const koreaGeoStatsPreferredScatterCombos = [
  {
    levels: ["provinces", "cities"],
    categoryKey: "demography",
    xKey: "elderly-share",
    yKey: "fertility-rate",
    sizeKey: "population-estimate",
    boost: 34,
  },
  {
    levels: ["provinces", "cities"],
    categoryKey: "demography",
    xKey: "population-growth-rate",
    yKey: "foreign-resident-share",
    sizeKey: "resident-population",
    boost: 24,
  },
  {
    levels: ["provinces", "cities"],
    categoryKey: "demography",
    xKey: "natural-increase",
    yKey: "net-migration",
    sizeKey: "population-estimate",
    boost: 28,
  },
  {
    levels: ["provinces"],
    categoryKey: "urban",
    xKey: "housing-supply-rate",
    yKey: "aged-housing-rate",
    sizeKey: "housing-count",
    boost: 18,
  },
  {
    levels: ["cities"],
    categoryKey: "urban",
    xKey: "local-commute-share",
    yKey: "outbound-commute-share",
    sizeKey: "population-estimate",
    boost: 26,
  },
  {
    levels: ["provinces"],
    categoryKey: "agriculture",
    xKey: "farm-household-share",
    yKey: "farm-population-share",
    sizeKey: "paddy-field-area",
    boost: 28,
  },
  {
    levels: ["provinces"],
    categoryKey: "industry",
    xKey: "manufacturing-employee-share",
    yKey: "grdp-per-capita",
    sizeKey: "employees-total",
    boost: 26,
  },
  {
    levels: ["cities"],
    categoryKey: "industry",
    xKey: "manufacturing-employee-share",
    yKey: "grdp",
    sizeKey: "employees-total",
    boost: 18,
  },
  {
    levels: ["provinces"],
    categoryKey: "energy",
    xKey: "temperature",
    yKey: "precipitation",
    sizeKey: "electricity-sales",
    boost: 12,
  },
];
const countryStatsCropOrder = ["wheat", "rice", "maize"];
const countryStatsLivestockOrder = ["cattle", "pigs", "sheep"];
const countryStatsChartColors = {
  population: "#111111",
  urbanPopulation: "#404040",
  ruralPopulation: "#7a7a7a",
  wheat: "#5d5d5d",
  rice: "#7f7f7f",
  maize: "#9b9b9b",
  cattle: "#4e4e4e",
  pigs: "#6c6c6c",
  sheep: "#8d8d8d",
  christians: "#3f3f3f",
  muslims: "#5a5a5a",
  hindus: "#747474",
  buddhists: "#8b8b8b",
  jews: "#a2a2a2",
  other: "#b7b7b7",
  noReligion: "#2b2b2b",
  otherBlock: "#bcbcbc",
  fossil: "#2c2c2c",
  renewables: "#5f5f5f",
  nuclear: "#8f8f8f",
  coal: "#3b3b3b",
  oil: "#5a5a5a",
  gas: "#7a7a7a",
  hydropower: "#4e4e4e",
  wind: "#6c6c6c",
  solar: "#8a8a8a",
  biofuels: "#a1a1a1",
  bioenergy: "#a1a1a1",
  otherRenewables: "#b9b9b9",
};
const countryStatsVisualDefinitions = [
  { stroke: "#111111", dasharray: null, background: "#111111" },
  { stroke: "#333333", dasharray: "8 4", background: "repeating-linear-gradient(135deg, #4d4d4d 0 4px, #f3f3f3 4px 8px)" },
  { stroke: "#4f4f4f", dasharray: "2 3", background: "repeating-linear-gradient(90deg, #6c6c6c 0 3px, #f1f1f1 3px 7px)" },
  { stroke: "#686868", dasharray: "12 4 2 4", background: "repeating-linear-gradient(0deg, #8b8b8b 0 2px, #f1f1f1 2px 6px)" },
  { stroke: "#2f2f2f", dasharray: "4 2 1 2", background: "repeating-linear-gradient(45deg, #666666 0 2px, #f1f1f1 2px 5px, #a9a9a9 5px 7px)" },
  { stroke: "#585858", dasharray: "10 3", background: "repeating-linear-gradient(90deg, #585858 0 1px, #f1f1f1 1px 6px)" },
  { stroke: "#8b8b8b", dasharray: null, background: "#c7c7c7" },
];
const examGraphAliasLetters = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하"];
const examGraphPatternDefinitions = [
  { key: "light", fill: "#d9d9d9" },
  { key: "dark", fill: "#4a4a4a" },
  { key: "vertical", pattern: "vertical" },
  { key: "diagonal", pattern: "diagonal" },
  { key: "dots", pattern: "dots" },
  { key: "horizontal", pattern: "horizontal" },
  { key: "cross", pattern: "cross" },
];
const examGraphValueModeDefinitions = [
  { key: "amount", label: "양" },
  { key: "share", label: "비율" },
  { key: "relative", label: "상댓값100" },
];
const examGraphPresetDefinitions = [
  {
    key: "stacked100",
    label: "구성 누적막대",
    description: "구성 비중 또는 실제 양을 누적막대로 비교",
    allowedValueModes: ["share", "amount"],
  },
  {
    key: "rankBars",
    label: "단일 순위막대",
    description: "한 지표를 막대로 비교하는 기본형 그래프",
    allowedValueModes: ["amount", "share", "relative"],
  },
  {
    key: "pairedBars",
    label: "짝막대 비교",
    description: "두 지표를 같은 행에서 나란히 비교",
    allowedValueModes: ["amount", "share", "relative"],
  },
  {
    key: "timeCompare",
    label: "2시점 비교",
    description: "두 시점 값을 나란히 두는 가로 막대",
    allowedValueModes: ["amount", "share", "relative"],
  },
  {
    key: "trendLine",
    label: "시계열 선그래프",
    description: "여러 국가·대륙의 시계열을 한 축에서 비교",
    allowedValueModes: ["amount", "share", "relative"],
  },
  {
    key: "scatter",
    label: "산포도",
    description: "두 지표의 관계를 흑백 산포도로 정리",
    allowedValueModes: [],
  },
  {
    key: "top3share",
    label: "상위 3개국+기타",
    description: "대륙별 상위 3개국 비중을 한 번에 비교",
    allowedValueModes: ["share"],
  },
];
const examGraphCompositionDefinitions = [
  {
    key: "urban-rural",
    label: "도시·촌락 구성",
    description: "최신 가용연도의 도시 인구와 촌락 인구 비중",
    aggregation: "sum",
    getComponents: (stats) => {
      const row = getLatestPopulationRow(stats?.population);
      return [
        { key: "urbanPopulation", label: "도시", value: row?.urbanPopulation },
        { key: "ruralPopulation", label: "촌락", value: row?.ruralPopulation },
      ];
    },
  },
  {
    key: "age-structure",
    label: "연령 구조",
    description: "0-14세, 15-64세, 65세 이상 구성",
    aggregation: "sum",
    getComponents: (stats) => {
      const structure = stats?.populationStructure;
      const totalPopulation =
        Number(structure?.totalPopulation) || Number(getLatestPopulationRow(stats?.population)?.population) || null;
      return [
        { key: "age0To14", label: "0-14세", value: totalPopulation ? (Number(structure?.shares?.age0To14) || 0) * totalPopulation / 100 : null },
        { key: "age15To64", label: "15-64세", value: totalPopulation ? (Number(structure?.shares?.age15To64) || 0) * totalPopulation / 100 : null },
        { key: "age65Plus", label: "65세 이상", value: totalPopulation ? (Number(structure?.shares?.age65Plus) || 0) * totalPopulation / 100 : null },
      ];
    },
  },
  {
    key: "industry-structure",
    label: "산업 구조",
    description: "농림어업, 공업, 서비스업의 GDP 비중",
    aggregation: "mean",
    getComponents: (stats) => [
      { key: "agriculture", label: "농림어업", value: stats?.economy?.industry?.shares?.agriculture },
      { key: "industry", label: "공업", value: stats?.economy?.industry?.shares?.industry },
      { key: "services", label: "서비스업", value: stats?.economy?.industry?.shares?.services },
    ],
  },
  {
    key: "religion-major",
    label: "4대 종교 구도",
    description: "크리스트교, 이슬람교, 힌두교, 불교 중심 종교 비중",
    aggregation: "sum",
    getComponents: (stats) => {
      const religion = stats?.religion2020;
      return [
        { key: "christians", label: "크리스트교", value: religion?.counts?.christians },
        { key: "muslims", label: "이슬람교", value: religion?.counts?.muslims },
        { key: "hindus", label: "힌두교", value: religion?.counts?.hindus },
        { key: "buddhists", label: "불교", value: religion?.counts?.buddhists },
        {
          key: "otherBlock",
          label: "기타·무종교",
          value:
            (Number(religion?.counts?.noReligion) || 0) +
            (Number(religion?.counts?.jews) || 0) +
            (Number(religion?.counts?.other) || 0),
        },
      ];
    },
  },
  {
    key: "energy-summary",
    label: "1차 에너지 소비 구조",
    description: "화석, 재생, 원자력의 1차 에너지 소비 비중",
    aggregation: "sum",
    getComponents: (stats) => [
      { key: "fossil", label: "화석", value: stats?.energy?.consumption?.summaryAmountsTWh?.fossil },
      { key: "renewables", label: "재생", value: stats?.energy?.consumption?.summaryAmountsTWh?.renewables },
      { key: "nuclear", label: "원자력", value: stats?.energy?.consumption?.summaryAmountsTWh?.nuclear },
    ],
  },
  {
    key: "electricity-breakdown",
    label: "발전원 구성",
    description: "석탄, 석유, 가스, 원자력, 재생에너지 발전 비중",
    aggregation: "sum",
    getComponents: (stats) => {
      const source = stats?.energy?.electricity;
      return [
        { key: "coal", label: "석탄", value: source?.amountBreakdownTWh?.coal },
        { key: "oil", label: "석유", value: source?.amountBreakdownTWh?.oil },
        { key: "gas", label: "가스", value: source?.amountBreakdownTWh?.gas },
        { key: "nuclear", label: "원자력", value: source?.amountBreakdownTWh?.nuclear },
        { key: "renewables", label: "재생에너지", value: source?.summaryAmountsTWh?.renewables },
      ];
    },
  },
  {
    key: "fossil-production",
    label: "화석연료 생산 구조",
    description: "석유, 가스, 석탄 생산 비중",
    aggregation: "sum",
    getComponents: (stats) => [
      { key: "oil", label: "석유", value: stats?.energy?.fossilProduction?.amountBreakdownTWh?.oil },
      { key: "gas", label: "가스", value: stats?.energy?.fossilProduction?.amountBreakdownTWh?.gas },
      { key: "coal", label: "석탄", value: stats?.energy?.fossilProduction?.amountBreakdownTWh?.coal },
    ],
  },
  {
    key: "crops-production",
    label: "3대 곡물 생산 구성",
    description: "밀, 쌀, 옥수수 생산 비중",
    aggregation: "sum",
    getComponents: (stats) => [
      { key: "wheat", label: "밀", value: stats?.agriculture?.crops?.production?.wheat?.value },
      { key: "rice", label: "쌀", value: stats?.agriculture?.crops?.production?.rice?.value },
      { key: "maize", label: "옥수수", value: stats?.agriculture?.crops?.production?.maize?.value },
    ],
  },
  {
    key: "livestock-stocks",
    label: "가축 사육 구성",
    description: "소, 돼지, 양의 사육 두수 비중",
    aggregation: "sum",
    getComponents: (stats) => [
      { key: "cattle", label: "소", value: stats?.agriculture?.livestock?.stocks?.cattle?.value },
      { key: "pigs", label: "돼지", value: stats?.agriculture?.livestock?.stocks?.pigs?.value },
      { key: "sheep", label: "양", value: stats?.agriculture?.livestock?.stocks?.sheep?.value },
    ],
  },
  {
    key: "livestock-meat",
    label: "육류 생산 구성",
    description: "소고기, 돼지고기, 양고기 생산 비중",
    aggregation: "sum",
    getComponents: (stats) => [
      { key: "cattle", label: "소고기", value: stats?.agriculture?.livestock?.meat?.cattle?.value },
      { key: "pigs", label: "돼지고기", value: stats?.agriculture?.livestock?.meat?.pigs?.value },
      { key: "sheep", label: "양고기", value: stats?.agriculture?.livestock?.meat?.sheep?.value },
    ],
  },
];
const examGraphTimeMetricDefinitions = [
  {
    key: "population-total",
    label: "총인구",
    formatter: (value) => formatCompactStatNumber(value),
    getYearValue: (stats, year) => getExamGraphPopulationMetricValue(stats, year, "population"),
    aggregate: "sum",
  },
  {
    key: "population-urban-total",
    label: "도시 인구",
    formatter: (value) => formatCompactStatNumber(value),
    getYearValue: (stats, year) => getExamGraphPopulationMetricValue(stats, year, "urbanPopulation"),
    aggregate: "sum",
  },
  {
    key: "population-rural-total",
    label: "촌락 인구",
    formatter: (value) => formatCompactStatNumber(value),
    getYearValue: (stats, year) => getExamGraphPopulationMetricValue(stats, year, "ruralPopulation"),
    aggregate: "sum",
  },
  {
    key: "population-urban-share",
    label: "도시화율",
    formatter: (value) => formatPercent(value),
    getYearValue: (stats, year) => getExamGraphPopulationMetricValue(stats, year, "urbanShare"),
    aggregate: "weightedUrbanShare",
  },
  {
    key: "population-birth-rate",
    label: "출생률",
    formatter: (value) => formatPerThousand(value),
    getYearValue: (stats, year) => getExamGraphPopulationRateMetricValue(stats, year, "birthRate"),
    aggregate: "mean",
  },
  {
    key: "population-death-rate",
    label: "사망률",
    formatter: (value) => formatPerThousand(value),
    getYearValue: (stats, year) => getExamGraphPopulationRateMetricValue(stats, year, "deathRate"),
    aggregate: "mean",
  },
  {
    key: "population-natural-increase-rate",
    label: "자연적 증가율",
    formatter: (value) => formatPerThousand(value),
    getYearValue: (stats, year) => getExamGraphPopulationRateMetricValue(stats, year, "naturalIncreaseRate"),
    aggregate: "mean",
  },
];
const examGraphTopShareMetricDefinitions = [
  {
    key: "population-total",
    label: "총인구",
    formatter: (value) => formatCompactStatNumber(value),
    getValue: (stats) => getMetricFromPopulation(stats, "population"),
  },
  {
    key: "electricity-renewables-amount",
    label: "재생에너지 발전량",
    formatter: (value) => formatEnergyAmount(value),
    getValue: (stats) => getEnergyMetric(stats, "electricity", "summaryAmountsTWh.renewables"),
  },
  {
    key: "energy-consumption-total",
    label: "1차 에너지 소비량",
    formatter: (value) => formatEnergyAmount(value),
    getValue: (stats) => getEnergyMetric(stats, "consumption", "totalTWh"),
  },
  {
    key: "fossil-production-total",
    label: "화석연료 생산량",
    formatter: (value) => formatEnergyAmount(value),
    getValue: (stats) => getEnergyMetric(stats, "fossilProduction", "totalTWh"),
  },
  {
    key: "crops-total-production",
    label: "3대 곡물 생산 합",
    formatter: (value) => formatTonAmount(value),
    getValue: (stats) => getCropAggregateMetric(stats, "productionTotal"),
  },
  {
    key: "livestock-stock-total",
    label: "3대 가축 사육 두수 합",
    formatter: (value) => formatCompactStatNumber(value),
    getValue: (stats) => getLivestockAggregateMetric(stats, "stockTotal"),
  },
  {
    key: "exports-value",
    label: "수출액",
    formatter: (value) => formatCurrencyAmount(value),
    getValue: (stats) => getExportMetric(stats, "valueCurrentUsd"),
  },
];
const examGraphPairMetricDefinitions = [
  {
    key: "urban-rural-total",
    label: "도시/촌락 인구",
    description: "도시 인구와 촌락 인구를 짝막대로 비교",
    metricKeys: ["population-urban-total", "population-rural-total"],
  },
  {
    key: "young-old-share",
    label: "유소년/고령 비중",
    description: "유소년 인구 비중과 고령 인구 비중 비교",
    metricKeys: ["age-014-share", "age-65plus-share"],
  },
  {
    key: "birth-death-rate",
    label: "출생률/사망률",
    description: "인구 변천 단계 비교에 자주 쓰는 두 지표",
    metricKeys: ["population-birth-rate", "population-death-rate"],
  },
  {
    key: "dependency-balance",
    label: "유소년/노년 부양비",
    description: "개도국형과 선진국형 인구 구조를 대비",
    metricKeys: ["dependency-youth", "dependency-old-age"],
  },
  {
    key: "christians-muslims-share",
    label: "크리스트교/이슬람교 비중",
    description: "주요 종교 비중을 짝막대로 비교",
    metricKeys: ["religion-christians-share", "religion-muslims-share"],
  },
  {
    key: "hindus-buddhists-share",
    label: "힌두교/불교 비중",
    description: "남아시아와 불교 문화권 구분에 쓰기 좋은 종교 비중 비교",
    metricKeys: ["religion-hindus-share", "religion-buddhists-share"],
  },
  {
    key: "grain-total-trade",
    label: "3대 곡물 수출/수입",
    description: "3대 곡물 교역량 합을 수출과 수입으로 비교",
    metricKeys: ["crops-total-exports", "crops-total-imports"],
  },
  {
    key: "wheat-trade",
    label: "밀 수출/수입",
    description: "밀 교역량 비교",
    metricKeys: ["crops-wheat-exports", "crops-wheat-imports"],
  },
  {
    key: "rice-trade",
    label: "쌀 수출/수입",
    description: "쌀 교역량 비교",
    metricKeys: ["crops-rice-exports", "crops-rice-imports"],
  },
  {
    key: "maize-trade",
    label: "옥수수 수출/수입",
    description: "옥수수 교역량 비교",
    metricKeys: ["crops-maize-exports", "crops-maize-imports"],
  },
  {
    key: "solar-wind-amount",
    label: "태양광/풍력 발전량",
    description: "재생에너지 세부 발전량 비교",
    metricKeys: ["electricity-solar-amount", "electricity-wind-amount"],
  },
  {
    key: "oil-gas-production",
    label: "석유/가스 생산량",
    description: "화석연료 생산 구조를 석유와 가스로 비교",
    metricKeys: ["fossil-production-oil", "fossil-production-gas"],
  },
  {
    key: "agri-services-share",
    label: "농림어업/서비스업 비중",
    description: "산업 구조의 양 끝 축 비교",
    metricKeys: ["industry-agriculture-share", "industry-services-share"],
  },
];
const examGraphLineStyleDefinitions = [
  { stroke: "#111111", dasharray: null },
  { stroke: "#4a4a4a", dasharray: "10 6" },
  { stroke: "#111111", dasharray: "3 4" },
  { stroke: "#7a7a7a", dasharray: "12 5 3 5" },
  { stroke: "#2d2d2d", dasharray: "2 3" },
  { stroke: "#5f5f5f", dasharray: "14 4" },
];
const examGraphPopulationYears = getExamGraphPopulationYears();
const examGraphAvailableContinents = [...new Set(
  Object.values(countryStatsById)
    .map((stats) => stats?.continent?.name)
    .filter(Boolean),
)].sort((a, b) => a.localeCompare(b, "en"));
const examGraphRandomExcludedIso3 = new Set([
  "ABW",
  "AIA",
  "ASM",
  "BLM",
  "BMU",
  "COK",
  "CUW",
  "CYM",
  "FRO",
  "GLP",
  "GRL",
  "GUF",
  "GUM",
  "HKG",
  "MAC",
  "MAF",
  "MTQ",
  "NCL",
  "NIU",
  "PRI",
  "PYF",
  "REU",
  "SPM",
  "TCA",
  "VGB",
  "VIR",
  "WLF",
]);
const koreaDatasets = {
  provinces: buildKoreaDataset(window.KOREA_ADMIN_DATA.provinces, "provinces"),
  cities: buildKoreaDataset(window.KOREA_ADMIN_DATA.cities, "cities"),
  metroDistricts: buildKoreaDataset(window.KOREA_ADMIN_DATA.metroDistricts, "metroDistricts"),
};

function buildKoreaLineFeature(item) {
  const geometry = item.geometry?.type
    ? item.geometry
    : Array.isArray(item.coordinates)
      ? {
          type: "LineString",
          coordinates: item.coordinates,
        }
      : null;

  return {
    ...item,
    feature: geometry
      ? {
          type: "Feature",
          properties: {
            id: item.id,
            name: item.name,
          },
          geometry,
        }
      : null,
  };
}

const koreaRoutes = (window.KOREA_ROUTE_DATA?.routes ?? []).map((route) => ({
  ...buildKoreaLineFeature(route),
})).filter((route) => route.feature?.geometry);
const koreaWaterways = (window.KOREA_ROUTE_DATA?.waterways ?? []).map((waterway) => ({
  ...buildKoreaLineFeature(waterway),
})).filter((waterway) => waterway.feature?.geometry);
const koreaRouteById = new Map(koreaRoutes.map((route) => [route.id, route]));
const koreaProvinceByCode = koreaDatasets.provinces.featureById;
const koreaCitiesByParentCode = d3.group(koreaDatasets.cities.features, (feature) => feature.properties.parentCode);
const koreaCityContextProvinceCodes = [
  ...(window.KOREA_ADMIN_DATA.meta?.metroParentCodes ?? []),
]
  .map((code) => String(code))
  .filter((code, index, codes) => codes.indexOf(code) === index && koreaProvinceByCode.has(code));
const koreaCityContextProvinceFeatures = koreaCityContextProvinceCodes
  .map((code) => koreaProvinceByCode.get(code))
  .filter(Boolean);
const koreaCityFeatureById = new Map(
  [...koreaDatasets.cities.features, ...koreaCityContextProvinceFeatures].map((feature) => [feature.id, feature]),
);
const koreaMetroDistrictsByParentCode = d3.group(
  koreaDatasets.metroDistricts.features,
  (feature) => feature.properties.parentCode,
);
const koreaParentOptionsByLevel = {
  cities: [...koreaDatasets.provinces.features]
    .sort((a, b) => compareKoreaNames(a.properties.name, b.properties.name) || d3.ascending(a.id, b.id))
    .map((code) => ({
      code: code.id,
      name: code.properties.name,
    })),
  metroDistricts: [...(window.KOREA_ADMIN_DATA.meta?.metroParentCodes ?? koreaMetroDistrictsByParentCode.keys())]
    .map((code) => String(code))
    .filter((code) => koreaProvinceByCode.has(code))
    .sort((a, b) => compareKoreaNames(getKoreaProvinceName(a), getKoreaProvinceName(b)) || d3.ascending(a, b))
    .map((code) => ({
      code,
      name: getKoreaProvinceName(code),
    })),
};
const koreaParentCodeSetsByLevel = {
  cities: new Set(koreaParentOptionsByLevel.cities.map((option) => option.code)),
  metroDistricts: new Set(koreaParentOptionsByLevel.metroDistricts.map((option) => option.code)),
};

function buildAtlasDataset(variantTopology, datasetKey) {
  const countriesObject = variantTopology.objects.countries;
  const landFeature = topojson.feature(variantTopology, variantTopology.objects.land);
  const borderMesh = topojson.mesh(variantTopology, countriesObject, (a, b) => a !== b);
  const allCountryFeatures = topojson
    .feature(variantTopology, countriesObject)
    .features
    .map((feature) => ({
      ...feature,
      id: Number.isFinite(Number(feature.id)) ? String(Number(feature.id)) : null,
      properties: {
        ...feature.properties,
        name:
          (Number.isFinite(Number(feature.id)) ? countryNameById.get(String(Number(feature.id))) : null) ??
          feature.properties?.name ??
          "",
      },
    }));
  const variantCountryFeatures = allCountryFeatures
    .filter((feature) => feature.id && countryNameById.has(feature.id))
    .sort((a, b) => d3.ascending(a.properties.name, b.properties.name));
  const unstableFillCountryIds = new Set(
    variantCountryFeatures
      .filter((feature) => d3.geoArea(feature) > MAX_STABLE_SPHERICAL_FILL_AREA)
      .map((feature) => feature.id),
  );

  return {
    datasetKey,
    topology: variantTopology,
    countriesObject,
    landFeature,
    borderMesh,
    countryFeatures: variantCountryFeatures,
    countryById: new Map(variantCountryFeatures.map((feature) => [feature.id, feature])),
    unstableFillCountryIds,
  };
}

function buildLakeDataset(geometryCollection, datasetKey) {
  return {
    datasetKey,
    geometry: geometryCollection,
  };
}

function buildKoreaDataset(topology, level) {
  const objectKey = Object.keys(topology.objects)[0];
  const regionsObject = topology.objects[objectKey];
  const regionFeatures = topojson
    .feature(topology, regionsObject)
    .features
    .map((feature) => {
      const code = String(feature.properties?.code ?? feature.id ?? "");
      const parentCode = String(
        feature.properties?.parentCode ?? (level === "provinces" ? "" : code.slice(0, 2)),
      );
      return {
        ...feature,
        id: code,
        properties: {
          ...feature.properties,
          code,
          name: feature.properties?.name ?? code,
          parentCode,
          parentName: feature.properties?.parentName ?? "",
          unitType: feature.properties?.unitType ?? level,
        },
      };
    })
    .sort((a, b) => d3.ascending(a.properties.code, b.properties.code));

  return {
    level,
    topology,
    regionsObject,
    landFeature: topojson.merge(topology, regionsObject.geometries),
    features: regionFeatures,
    featureById: new Map(regionFeatures.map((feature) => [feature.id, feature])),
  };
}

function getAtlasLevelForZoom(zoomLevel = state.viewZoom, preferFine = false) {
  if (state.coastlineDetail === "performance") {
    return atlasDatasets["110m"] ? "110m" : "50m";
  }

  if (state.coastlineDetail === "detailed") {
    if (zoomLevel >= 4.4 && atlasDatasets["10m"]) {
      return "10m";
    }
    return atlasDatasets["50m"] ? "50m" : "110m";
  }

  if (state.coastlineDetail === "max") {
    if (atlasDatasets["10m"]) {
      return "10m";
    }
    return atlasDatasets["50m"] ? "50m" : "110m";
  }

  if (preferFine && zoomLevel >= 6.4 && atlasDatasets["10m"]) {
    return "10m";
  }

  if (zoomLevel >= 8 && atlasDatasets["10m"]) {
    return "10m";
  }

  if (zoomLevel >= 1.8 && atlasDatasets["50m"]) {
    return "50m";
  }

  return atlasDatasets["110m"] ? "110m" : "50m";
}

function getAtlasDataset(zoomLevel = state.viewZoom, preferFine = false) {
  return atlasDatasets[getAtlasLevelForZoom(zoomLevel, preferFine)] ?? baseAtlas;
}

const atlasPalette = ["#9c9c9c", "#b9b9b9", "#6a6a6a", "#858585", "#cacaca", "#777777"];

const state = {
  mapVersion: "world",
  width: MAIN_CANVAS_WIDTH,
  height: 310,
  paddingPercent: 10,
  centerLongitude: 0,
  projectionMode: "rectangular",
  viewMode: "zoom",
  viewZoom: 1,
  viewOffsetX: 0,
  viewOffsetY: 0,
  oceanColor: "#d8d8d8",
  landColor: "#ffffff",
  borderColor: "#101010",
  borderMode: "dashed",
  coastlineDetail: "auto",
  showFrame: true,
  selectedBordersOnly: false,
  autoFocusOnSelection: false,
  unifySelectedCountryColors: false,
  unifiedSelectedCountryColor: atlasPalette[0],
  showGuideLines: false,
  showLatitudeLabels: false,
  showScaleBar: false,
  mapFontSizePt: 8,
  activeStatsCountryId: null,
  metricExplorerCategoryKey: "demography",
  metricExplorerDisplayMode: "overview",
  metricExplorerMetricKey: "population-total",
  metricExplorerTopN: 12,
  metricExplorerGrouping: "countries",
  metricExplorerMapHighlightEnabled: false,
  metricExplorerScatterXKey: "population-total",
  metricExplorerScatterYKey: "exports-share",
  metricExplorerScatterSizeKey: "energy-consumption-total",
  koreaGeoStatsCategoryKey: "demography",
  koreaGeoStatsDisplayMode: "overview",
  koreaGeoStatsMetricKey: "population-estimate",
  koreaGeoStatsTopN: 10,
  koreaGeoStatsScatterXKey: "population-estimate",
  koreaGeoStatsScatterYKey: "grdp",
  koreaGeoStatsScatterSizeKey: "manufacturing-employees",
  examGraphPresetKey: "stacked100",
  examGraphMetricKey: "population-total",
  examGraphPairKey: "urban-rural-total",
  examGraphCompositionKey: "urban-rural",
  examGraphTimeMetricKey: "population-total",
  examGraphTopShareMetricKey: "electricity-renewables-amount",
  examGraphValueMode: "amount",
  examGraphGrouping: "countries",
  examGraphMergeAmericas: false,
  examGraphTopN: 4,
  examGraphYearStart: 1970,
  examGraphYearEnd: 2023,
  examGraphAliasMode: true,
  examGraphScatterXKey: "population-urban-share",
  examGraphScatterYKey: "age-65plus-share",
  examGraphScatterSizeKey: "population-total",
  examGraphFocusCountryIds: [],
  examGraphFocusLabel: "",
  guides: {
    equator: false,
    lat30: false,
    lat60: false,
    tropicCancer: false,
    tropicCapricorn: false,
  },
  selected: [],
  koreaLevel: "provinces",
  koreaParentCode: "",
  koreaCityScopeCodes: [],
  koreaCityScopeCollapsed: false,
  koreaSelectedProvinces: [],
  koreaSelectedCities: [],
  koreaSelectedMetroDistricts: [],
  koreaComparedProvinces: [],
  koreaComparedCities: [],
  koreaComparedMetroDistricts: [],
  koreaRegionListCollapsed: false,
  koreaRouteVisibility: {
    gyeongbuExpressway: false,
    gyeongbuHsr: false,
    yeongdongExpressway: false,
    honamHsr: false,
  },
  markerDraftStyle: "ring",
  markers: [],
  insets: [],
  nextMarkerSequence: 0,
  nextInsetSequence: 0,
};

const elements = {
  mapVersionButtons: [...document.querySelectorAll(".map-version-button")],
  worldSections: [...document.querySelectorAll(".world-only")],
  koreaSections: [...document.querySelectorAll(".korea-only")],
  countryInput: document.querySelector("#countryInput"),
  countryOptions: document.querySelector("#countryOptions"),
  addCountryButton: document.querySelector("#addCountryButton"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  selectionCardTitle: document.querySelector("#selectionCardTitle"),
  selectionDetailTitle: document.querySelector("#selectionDetailTitle"),
  selectionDetailHint: document.querySelector("#selectionDetailHint"),
  detailSectionTitle: document.querySelector("#detailSectionTitle"),
  detailSectionBadge: document.querySelector("#detailSectionBadge"),
  selectedCountryList: document.querySelector("#selectedCountryList"),
  examGraphPanel: document.querySelector("#examGraphPanel"),
  metricExplorerPanel: document.querySelector("#metricExplorerPanel"),
  countryStatsPanel: document.querySelector("#countryStatsPanel"),
  koreaGeoStatsPanel: document.querySelector("#koreaGeoStatsPanel"),
  statusMessage: document.querySelector("#statusMessage"),
  widthInput: document.querySelector("#widthInput"),
  heightInput: document.querySelector("#heightInput"),
  paddingInput: document.querySelector("#paddingInput"),
  paddingValue: document.querySelector("#paddingValue"),
  centerLongitudeInput: document.querySelector("#centerLongitudeInput"),
  centerLongitudeValue: document.querySelector("#centerLongitudeValue"),
  centerButtons: [...document.querySelectorAll(".center-button")],
  modeButtons: [...document.querySelectorAll(".mode-button")],
  projectionButtons: [...document.querySelectorAll(".projection-button")],
  undoButton: document.querySelector("#undoButton"),
  redoButton: document.querySelector("#redoButton"),
  zoomOutButton: document.querySelector("#zoomOutButton"),
  resetViewButton: document.querySelector("#resetViewButton"),
  guideToggles: [...document.querySelectorAll(".guide-toggle")],
  guideLineToggle: document.querySelector("#guideLineToggle"),
  latitudeLabelToggle: document.querySelector("#latitudeLabelToggle"),
  oceanColorInput: document.querySelector("#oceanColorInput"),
  landColorInput: document.querySelector("#landColorInput"),
  landColorLabelText: document.querySelector("#landColorLabelText"),
  borderColorInput: document.querySelector("#borderColorInput"),
  borderModeInput: document.querySelector("#borderModeInput"),
  borderModeLabelText: document.querySelector("#borderModeLabelText"),
  coastlineDetailInput: document.querySelector("#coastlineDetailInput"),
  coastlineDetailField: document.querySelector("#coastlineDetailField"),
  autoFocusSelectionToggle: document.querySelector("#autoFocusSelectionToggle"),
  unifySelectedCountryColorsToggle: document.querySelector("#unifySelectedCountryColorsToggle"),
  unifiedCountryColorInput: document.querySelector("#unifiedCountryColorInput"),
  frameToggle: document.querySelector("#frameToggle"),
  frameToggleLabelText: document.querySelector("#frameToggleLabelText"),
  scaleBarToggle: document.querySelector("#scaleBarToggle"),
  mapFontSizeInput: document.querySelector("#mapFontSizeInput"),
  mapFontSizeValue: document.querySelector("#mapFontSizeValue"),
  selectedBordersOnlyToggle: document.querySelector("#selectedBordersOnlyToggle"),
  downloadSvgButton: document.querySelector("#downloadSvgButton"),
  exportMeta: document.querySelector("#exportMeta"),
  previewStage: document.querySelector("#previewStage"),
  previewHint: document.querySelector("#previewHint"),
  activeModeLabel: document.querySelector("#activeModeLabel"),
  activeModeTitle: document.querySelector("#activeModeTitle"),
  activeModeDescription: document.querySelector("#activeModeDescription"),
  viewZoomLabel: document.querySelector("#viewZoomLabel"),
  workspaceObjectSummary: document.querySelector("#workspaceObjectSummary"),
  workspaceModeTips: document.querySelector("#workspaceModeTips"),
  selectionSummary: document.querySelector("#selectionSummary"),
  koreaLevelButtons: [...document.querySelectorAll(".korea-level-button")],
  koreaParentRegionField: document.querySelector("#koreaParentRegionField"),
  koreaParentRegionLabel: document.querySelector("#koreaParentRegionLabel"),
  koreaParentRegionSelect: document.querySelector("#koreaParentRegionSelect"),
  koreaCityScopeField: document.querySelector("#koreaCityScopeField"),
  koreaCityScopeBody: document.querySelector("#koreaCityScopeBody"),
  koreaCityScopeChipList: document.querySelector("#koreaCityScopeChipList"),
  clearKoreaCityScopeButton: document.querySelector("#clearKoreaCityScopeButton"),
  toggleKoreaCityScopeButton: document.querySelector("#toggleKoreaCityScopeButton"),
  koreaRegionBlockBody: document.querySelector("#koreaRegionBlockBody"),
  koreaRegionChipList: document.querySelector("#koreaRegionChipList"),
  toggleKoreaRegionListButton: document.querySelector("#toggleKoreaRegionListButton"),
  activateVisibleKoreaRegionsButton: document.querySelector("#activateVisibleKoreaRegionsButton"),
  clearVisibleKoreaRegionsButton: document.querySelector("#clearVisibleKoreaRegionsButton"),
  groupSelectedKoreaRegionsButton: document.querySelector("#groupSelectedKoreaRegionsButton"),
  ungroupSelectedKoreaRegionsButton: document.querySelector("#ungroupSelectedKoreaRegionsButton"),
  koreaRouteToggles: [...document.querySelectorAll(".korea-route-toggle")],
  unifySelectedColorLabel: document.querySelector("#unifySelectedColorLabel"),
  presetButtons: [...document.querySelectorAll(".preset-button[data-width]")],
  markerStyleInput: document.querySelector("#markerStyleInput"),
  clearAnnotationsButton: document.querySelector("#clearAnnotationsButton"),
  markerList: document.querySelector("#markerList"),
  insetList: document.querySelector("#insetList"),
};

let currentSvgNode = null;
let currentPreviewScale = 1;
let currentRenderContext = null;
let embeddedMapFontDataUrl = null;
let activeGestureScale = 1;
let currentCanvasSurface = null;
const previewInteraction = {
  scale: 1,
  translateX: 0,
  translateY: 0,
  commitTimer: null,
};
const interactionState = {
  temporaryViewMode: null,
};
const keyboardState = {
  temporaryPanSourceMode: null,
};
const koreaGroupingSelectionIds = new Set();
const historyState = {
  undoStack: [],
  redoStack: [],
  pendingSnapshot: null,
  pendingSerialized: "",
  pendingLabel: "",
  commitTimer: null,
  isApplying: false,
  maxEntries: 80,
};

normalizeKoreaState();
buildCountryDatalist();
buildKoreaParentRegionOptions();
attachEventListeners();
syncControls();
setStatus(getDefaultStatusMessage());
renderSelectionViews();
renderAnnotations();
renderMap();
void loadEmbeddedMapFontData();

function attachEventListeners() {
  elements.mapVersionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setMapVersion(button.dataset.mapVersion);
    });
  });

  elements.addCountryButton.addEventListener("click", () => {
    addCountriesFromInput(elements.countryInput.value);
  });

  elements.countryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCountriesFromInput(elements.countryInput.value);
    }
  });

  elements.clearSelectionButton.addEventListener("click", () => {
    const currentSelection = getCurrentSelectionEntries();
    if (!currentSelection.length) {
      setStatus(state.mapVersion === "world" ? "비울 선택 국가가 없습니다." : "비울 권역이 없습니다.");
      return;
    }

    beginHistoryStep(state.mapVersion === "world" ? "선택 국가 비우기" : "선택 권역 비우기");
    setCurrentSelectionEntries([]);
    syncActiveStatsCountry();
    resetViewForSelectionIfNeeded();
    renderSelectionViews();
    syncKoreaControls();
    renderMap();
    setStatus(state.mapVersion === "world" ? "선택한 국가를 모두 비웠습니다." : "선택한 권역을 모두 비웠습니다.");
  });

  elements.widthInput.addEventListener("input", () => {
    beginHistoryStep("캔버스 크기 변경");
    state.width = clampCanvasWidth(elements.widthInput.value, state.width);
    syncDimensionInputs();
    syncPresetButtons();
    renderMap();
  });

  elements.heightInput.addEventListener("input", () => {
    beginHistoryStep("캔버스 크기 변경");
    state.height = clampCanvasHeight(elements.heightInput.value, state.height);
    syncDimensionInputs();
    syncPresetButtons();
    renderMap();
  });

  elements.paddingInput.addEventListener("input", () => {
    beginHistoryStep("주변 여백 변경");
    state.paddingPercent = Number(elements.paddingInput.value);
    elements.paddingValue.textContent = `${state.paddingPercent}%`;
    renderMap();
  });

  elements.centerLongitudeInput.addEventListener("input", () => {
    beginHistoryStep("중심 경도 변경");
    state.centerLongitude = Number(elements.centerLongitudeInput.value);
    resetViewWindow();
    syncCenterControls();
    renderMap();
  });

  elements.centerButtons.forEach((button) => {
    button.addEventListener("click", () => {
      beginHistoryStep("중심 경도 변경");
      state.centerLongitude = Number(button.dataset.center);
      resetViewWindow();
      syncCenterControls();
      renderMap();
    });
  });

  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setViewMode(button.dataset.mode);
    });
  });

  elements.koreaLevelButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setKoreaLevel(button.dataset.koreaLevel);
    });
  });

  elements.koreaParentRegionSelect.addEventListener("change", () => {
    setKoreaParentCode(elements.koreaParentRegionSelect.value);
  });

  elements.clearKoreaCityScopeButton?.addEventListener("click", () => {
    clearKoreaCityScope();
  });

  elements.toggleKoreaCityScopeButton?.addEventListener("click", () => {
    toggleKoreaCityScopeCollapsed();
  });

  elements.toggleKoreaRegionListButton?.addEventListener("click", () => {
    toggleKoreaRegionListCollapsed();
  });

  elements.activateVisibleKoreaRegionsButton.addEventListener("click", () => {
    selectAllVisibleKoreaRegions();
  });

  elements.clearVisibleKoreaRegionsButton.addEventListener("click", () => {
    clearVisibleKoreaRegions();
  });

  elements.groupSelectedKoreaRegionsButton.addEventListener("click", () => {
    groupCheckedKoreaRegions();
  });

  elements.ungroupSelectedKoreaRegionsButton.addEventListener("click", () => {
    ungroupCheckedKoreaRegions();
  });

  elements.koreaRouteToggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
      beginHistoryStep("한국 노선 오버레이 변경");
      state.koreaRouteVisibility[toggle.dataset.route] = toggle.checked;
      renderMap();
      const activeRoutes = getActiveKoreaRoutes().map((route) => route.name);
      setStatus(activeRoutes.length ? `${activeRoutes.join(", ")} 오버레이를 표시합니다.` : "한국 노선 오버레이를 모두 껐습니다.");
    });
  });

  elements.projectionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      beginHistoryStep("시점 변경");
      state.projectionMode = button.dataset.projection;
      resetViewWindow();
      syncProjectionButtons();
      renderMap();
      setStatus(`${projectionModeLabels[state.projectionMode]} 시점으로 전환했습니다.`);
    });
  });

  elements.undoButton.addEventListener("click", undoLastChange);
  elements.redoButton.addEventListener("click", redoLastChange);

  elements.zoomOutButton.addEventListener("click", () => {
    if (state.mapVersion !== "world") {
      setStatus("한국 지도는 권역 on/off 전용으로 고정 보기입니다.");
      return;
    }

    if (state.viewZoom <= 1.001 && nearZero(state.viewOffsetX) && nearZero(state.viewOffsetY)) {
      setStatus("이미 전체 보기 상태입니다.");
      return;
    }

    beginHistoryStep("보기 축소");
    zoomOutOneStep();
    renderMap();
    setStatus("한 단계 줌 아웃했습니다.");
  });

  elements.resetViewButton.addEventListener("click", () => {
    if (state.mapVersion !== "world") {
      setStatus("한국 지도는 지도를 이동하지 않고 권역만 켜고 끕니다.");
      return;
    }

    beginHistoryStep("전체 보기");
    resetViewWindow();
    renderMap();
    setStatus("보기 범위를 전체 보기로 되돌렸습니다.");
  });

  elements.guideToggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
      beginHistoryStep("기준선 설정 변경");
      state.guides[toggle.dataset.guide] = toggle.checked;
      renderMap();
    });
  });

  elements.guideLineToggle.addEventListener("change", () => {
    beginHistoryStep("기준선 설정 변경");
    state.showGuideLines = elements.guideLineToggle.checked;
    renderMap();
  });

  elements.latitudeLabelToggle.addEventListener("change", () => {
    beginHistoryStep("기준선 설정 변경");
    state.showLatitudeLabels = elements.latitudeLabelToggle.checked;
    renderMap();
  });

  elements.oceanColorInput.addEventListener("input", () => {
    beginHistoryStep("지도 색상 변경");
    state.oceanColor = elements.oceanColorInput.value;
    renderMap();
  });

  elements.landColorInput.addEventListener("input", () => {
    beginHistoryStep("지도 색상 변경");
    state.landColor = elements.landColorInput.value;
    renderMap();
  });

  elements.borderColorInput.addEventListener("input", () => {
    beginHistoryStep("지도 색상 변경");
    state.borderColor = elements.borderColorInput.value;
    renderMap();
  });

  elements.borderModeInput.addEventListener("change", () => {
    beginHistoryStep(state.mapVersion === "world" ? "국경선 설정 변경" : "행정 경계 설정 변경");
    state.borderMode = elements.borderModeInput.value;
    renderMap();
  });

  elements.coastlineDetailInput.addEventListener("change", () => {
    beginHistoryStep("해안선 디테일 변경");
    state.coastlineDetail = elements.coastlineDetailInput.value;
    renderMap();
  });

  elements.autoFocusSelectionToggle.addEventListener("change", () => {
    beginHistoryStep("선택 자동 맞춤 변경");
    state.autoFocusOnSelection = elements.autoFocusSelectionToggle.checked;
    if (state.autoFocusOnSelection) {
      resetViewWindow();
    }
    renderMap();
  });

  elements.unifySelectedCountryColorsToggle.addEventListener("change", () => {
    beginHistoryStep(state.mapVersion === "world" ? "국가 색상 설정 변경" : "권역 색상 설정 변경");
    state.unifySelectedCountryColors = elements.unifySelectedCountryColorsToggle.checked;
    syncStyleControls();
    renderSelectionViews();
    renderMap();
  });

  elements.unifiedCountryColorInput.addEventListener("input", () => {
    beginHistoryStep(state.mapVersion === "world" ? "국가 색상 설정 변경" : "권역 색상 설정 변경");
    state.unifiedSelectedCountryColor = elements.unifiedCountryColorInput.value;
    renderSelectionViews();
    renderMap();
  });

  elements.frameToggle.addEventListener("change", () => {
    beginHistoryStep("프레임 표시 변경");
    state.showFrame = elements.frameToggle.checked;
    renderMap();
  });

  elements.scaleBarToggle.addEventListener("change", () => {
    beginHistoryStep("축척 설정 변경");
    state.showScaleBar = elements.scaleBarToggle.checked;
    renderMap();
  });

  elements.mapFontSizeInput.addEventListener("input", () => {
    beginHistoryStep("글자 크기 변경");
    state.mapFontSizePt = clamp(Number(elements.mapFontSizeInput.value), 7, 9);
    elements.mapFontSizeValue.textContent = formatPointSize(state.mapFontSizePt);
    renderMap();
  });

  elements.selectedBordersOnlyToggle.addEventListener("change", () => {
    beginHistoryStep("국경선 표시 범위 변경");
    state.selectedBordersOnly = elements.selectedBordersOnlyToggle.checked;
    renderMap();
  });

  elements.markerStyleInput.addEventListener("change", () => {
    beginHistoryStep("기본 마커 스타일 변경");
    state.markerDraftStyle = elements.markerStyleInput.value;
  });

  elements.clearAnnotationsButton.addEventListener("click", () => {
    if (!state.markers.length && !state.insets.length) {
      setStatus("지울 표시가 없습니다.");
      return;
    }

    beginHistoryStep("표시 요소 비우기");
    state.markers = [];
    state.insets = [];
    state.nextMarkerSequence = 0;
    state.nextInsetSequence = 0;
    renderAnnotations();
    renderMap();
    setStatus("마커와 인셋을 모두 지웠습니다.");
  });

  elements.downloadSvgButton.addEventListener("click", exportCurrentSvg);

  elements.presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      beginHistoryStep("캔버스 프리셋 변경");
      state.width = clampCanvasWidth(Number(button.dataset.width), state.width);
      state.height = clampCanvasHeight(Number(button.dataset.height), state.height);
      syncDimensionInputs();
      syncPresetButtons();
      renderMap();
    });
  });

  window.addEventListener("resize", () => {
    renderMap();
  });
  window.addEventListener("keydown", handleWindowKeyDown);
  window.addEventListener("keyup", handleWindowKeyUp);
  window.addEventListener("blur", releaseTemporaryViewMode);
}

function cloneStateSnapshot(source = state) {
  return JSON.parse(JSON.stringify(source));
}

function serializeStateSnapshot(snapshot) {
  return JSON.stringify(snapshot);
}

function beginHistoryStep(label) {
  if (historyState.isApplying) {
    return;
  }

  if (!historyState.pendingSnapshot) {
    const snapshot = cloneStateSnapshot();
    historyState.pendingSnapshot = snapshot;
    historyState.pendingSerialized = serializeStateSnapshot(snapshot);
    historyState.pendingLabel = label;
  }

  scheduleHistoryCommit();
  syncHistoryButtons();
}

function scheduleHistoryCommit() {
  if (historyState.commitTimer) {
    window.clearTimeout(historyState.commitTimer);
  }

  historyState.commitTimer = window.setTimeout(() => {
    commitPendingHistoryStep();
  }, 260);
}

function clearPendingHistoryStep() {
  if (historyState.commitTimer) {
    window.clearTimeout(historyState.commitTimer);
    historyState.commitTimer = null;
  }

  historyState.pendingSnapshot = null;
  historyState.pendingSerialized = "";
  historyState.pendingLabel = "";
}

function hasPendingHistoryChange() {
  if (!historyState.pendingSnapshot) {
    return false;
  }

  return serializeStateSnapshot(cloneStateSnapshot()) !== historyState.pendingSerialized;
}

function commitPendingHistoryStep() {
  if (!historyState.pendingSnapshot) {
    syncHistoryButtons();
    return;
  }

  const currentSnapshot = cloneStateSnapshot();
  const currentSerialized = serializeStateSnapshot(currentSnapshot);

  if (currentSerialized !== historyState.pendingSerialized) {
    historyState.undoStack.push({
      label: historyState.pendingLabel || "편집",
      snapshot: historyState.pendingSnapshot,
    });

    if (historyState.undoStack.length > historyState.maxEntries) {
      historyState.undoStack.shift();
    }

    historyState.redoStack = [];
  }

  clearPendingHistoryStep();
  syncHistoryButtons();
}

function flushPendingHistory() {
  if (!historyState.pendingSnapshot) {
    syncHistoryButtons();
    return;
  }

  if (historyState.commitTimer) {
    window.clearTimeout(historyState.commitTimer);
    historyState.commitTimer = null;
  }

  commitPendingHistoryStep();
}

function syncHistoryButtons() {
  elements.undoButton.disabled = false;
  elements.redoButton.disabled = false;
}

function applyStateSnapshot(snapshot) {
  historyState.isApplying = true;

  const nextState = cloneStateSnapshot(snapshot);
  Object.keys(nextState).forEach((key) => {
    state[key] = nextState[key];
  });
  normalizeKoreaState();
  clearKoreaGroupingDraft();
  normalizeCanvasStateDimensions();
  syncActiveStatsCountry(state.activeStatsCountryId);

  syncControls();
  renderSelectionViews();
  renderAnnotations();
  renderMap();

  historyState.isApplying = false;
  syncHistoryButtons();
}

function undoLastChange() {
  flushPendingHistory();

  if (!historyState.undoStack.length) {
    setStatus("되돌릴 작업이 없습니다.");
    return;
  }

  const entry = historyState.undoStack.pop();
  historyState.redoStack.push({
    label: entry.label,
    snapshot: cloneStateSnapshot(),
  });
  applyStateSnapshot(entry.snapshot);
  setStatus(`${entry.label || "최근 작업"}을 되돌렸습니다.`);
}

function redoLastChange() {
  flushPendingHistory();

  if (!historyState.redoStack.length) {
    setStatus("다시 실행할 작업이 없습니다.");
    return;
  }

  const entry = historyState.redoStack.pop();
  historyState.undoStack.push({
    label: entry.label,
    snapshot: cloneStateSnapshot(),
  });
  applyStateSnapshot(entry.snapshot);
  setStatus(`${entry.label || "최근 작업"}을 다시 실행했습니다.`);
}

function getActiveViewMode() {
  return interactionState.temporaryViewMode ?? state.viewMode;
}

function setViewMode(mode, { silent = false } = {}) {
  if (!viewModeLabels[mode] || state.viewMode === mode) {
    interactionState.temporaryViewMode = null;
    keyboardState.temporaryPanSourceMode = null;
    refreshInteractionUi();
    return;
  }

  state.viewMode = mode;
  interactionState.temporaryViewMode = null;
  keyboardState.temporaryPanSourceMode = null;
  refreshInteractionUi();

  if (!silent) {
    setStatus(`${viewModeLabels[state.viewMode]} 모드로 전환했습니다.`);
  }
}

function refreshInteractionUi() {
  syncModeButtons();
  updatePreviewHint();
  syncPreviewCanvasMode();
  updateWorkspaceStats();
}

function syncPreviewCanvasMode() {
  const shell = elements.previewStage.querySelector(".canvas-shell");
  if (!shell) {
    return;
  }

  Object.keys(viewModeLabels).forEach((mode) => {
    shell.classList.toggle(`mode-${mode}`, state.mapVersion === "world" && getActiveViewMode() === mode);
  });
}

function handleWindowKeyDown(event) {
  if (isFormControl(event.target)) {
    return;
  }

  const isModifierPressed = event.metaKey || event.ctrlKey;
  if (isModifierPressed && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) {
      redoLastChange();
      return;
    }

    undoLastChange();
    return;
  }

  if (event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redoLastChange();
    return;
  }

  if (state.mapVersion !== "world") {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    if (!keyboardState.temporaryPanSourceMode && getActiveViewMode() !== "pan") {
      keyboardState.temporaryPanSourceMode = state.viewMode;
      interactionState.temporaryViewMode = "pan";
      refreshInteractionUi();
    }
    return;
  }

  if (event.repeat) {
    return;
  }

  if (event.code === "Digit1") {
    event.preventDefault();
    setViewMode("zoom");
    return;
  }

  if (event.code === "Digit2") {
    event.preventDefault();
    setViewMode("pan");
    return;
  }

  if (event.code === "Digit3") {
    event.preventDefault();
    setViewMode("marker");
    return;
  }

  if (event.code === "Digit4") {
    event.preventDefault();
    setViewMode("inset");
    return;
  }

  if ((event.key === "+" || event.key === "=") && currentRenderContext) {
    event.preventDefault();
    beginHistoryStep("보기 확대");
    applyRelativeZoom(1.25, { x: state.width / 2, y: state.height / 2 });
    renderMap();
    setStatus("한 단계 확대했습니다.");
    return;
  }

  if ((event.key === "-" || event.key === "_") && currentRenderContext) {
    event.preventDefault();
    beginHistoryStep("보기 축소");
    zoomOutOneStep();
    renderMap();
    setStatus("한 단계 줌 아웃했습니다.");
    return;
  }

  if (event.key === "0" && currentRenderContext) {
    event.preventDefault();
    beginHistoryStep("전체 보기");
    resetViewWindow();
    renderMap();
    setStatus("보기 범위를 전체 보기로 되돌렸습니다.");
  }
}

function handleWindowKeyUp(event) {
  if (state.mapVersion !== "world") {
    return;
  }

  if (event.code !== "Space") {
    return;
  }

  releaseTemporaryViewMode();
}

function releaseTemporaryViewMode() {
  if (!keyboardState.temporaryPanSourceMode) {
    return;
  }

  interactionState.temporaryViewMode = null;
  keyboardState.temporaryPanSourceMode = null;
  refreshInteractionUi();
}

function isFormControl(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, select, textarea, [contenteditable='true']"));
}

function getDefaultStatusMessage() {
  return state.mapVersion === "world"
    ? "영역 확대 모드에서 드래그하면 원하는 부분만 바로 크게 잡을 수 있습니다."
    : "한국 지도에서는 지도를 움직이기보다 권역을 바로 켜고 끄면서 구도를 만듭니다.";
}

function buildKoreaParentRegionOptions() {
  const fragment = document.createDocumentFragment();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = koreaParentPlaceholderLabels[state.koreaLevel] ?? "상위 권역을 먼저 고르세요";
  fragment.appendChild(placeholder);

  (koreaParentOptionsByLevel[state.koreaLevel] ?? []).forEach((feature) => {
    const option = document.createElement("option");
    option.value = feature.code;
    option.textContent = feature.name;
    fragment.appendChild(option);
  });

  elements.koreaParentRegionSelect.replaceChildren(fragment);
}

function koreaLevelRequiresParent(level = state.koreaLevel) {
  return level === "metroDistricts";
}

function getKoreaParentCodeSet(level = state.koreaLevel) {
  return koreaParentCodeSetsByLevel[level] ?? new Set();
}

function isValidKoreaParentCodeForLevel(code, level = state.koreaLevel) {
  return Boolean(code) && getKoreaParentCodeSet(level).has(String(code));
}

function normalizeKoreaCityScopeCodes(codes = []) {
  const values = Array.isArray(codes) ? codes : [codes];
  return [...new Set(values.map((code) => String(code)).filter((code) => isValidKoreaParentCodeForLevel(code, "cities")))];
}

function hasKoreaCityScopeFilter() {
  return state.koreaLevel === "cities" && state.koreaCityScopeCodes.length > 0;
}

function getKoreaCityScopeCodeSet() {
  return new Set(state.koreaCityScopeCodes);
}

function getKoreaCityScopeLabel(codes = state.koreaCityScopeCodes, { maxNames = 2, emptyText = "전국" } = {}) {
  const normalizedCodes = normalizeKoreaCityScopeCodes(codes);
  if (!normalizedCodes.length) {
    return emptyText;
  }

  const names = normalizedCodes.map((code) => getKoreaProvinceName(code));
  if (names.length <= maxNames) {
    return names.join(" + ");
  }

  return `${names.slice(0, maxNames).join(" + ")} 외 ${names.length - maxNames}곳`;
}

function setKoreaCityScopeCodes(codes) {
  state.koreaCityScopeCodes = normalizeKoreaCityScopeCodes(codes);
}

function syncKoreaPreviewScopeFeedback() {
  window.requestAnimationFrame(() => {
    updatePreviewHint();
    updateWorkspaceStats();
  });
}

function toggleKoreaCityScopeCode(code) {
  if (!isValidKoreaParentCodeForLevel(code, "cities")) {
    return;
  }

  const nextCodes = getKoreaCityScopeCodeSet();
  if (nextCodes.has(String(code))) {
    nextCodes.delete(String(code));
  } else {
    nextCodes.add(String(code));
  }

  beginHistoryStep("시/군 범위 변경");
  setKoreaCityScopeCodes([...nextCodes]);
  syncKoreaControls();
  renderMap();
  syncKoreaPreviewScopeFeedback();

  const scopeLabel = getKoreaCityScopeLabel(state.koreaCityScopeCodes, { maxNames: 3 });
  setStatus(
    state.koreaCityScopeCodes.length
      ? `${scopeLabel} 범위의 시/군 보기를 표시합니다.`
      : "시/군 범위를 전국 보기로 되돌렸습니다.",
  );
}

function clearKoreaCityScope() {
  if (!state.koreaCityScopeCodes.length) {
    setStatus("이미 전국 시/군 보기입니다.");
    return;
  }

  beginHistoryStep("시/군 범위 변경");
  setKoreaCityScopeCodes([]);
  syncKoreaControls();
  renderMap();
  syncKoreaPreviewScopeFeedback();
  setStatus("시/군 범위를 전국 보기로 되돌렸습니다.");
}

function normalizeKoreaSelectionEntries(entries = []) {
  return entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    parentCode: entry.parentCode ?? "",
    color: entry.color || atlasPalette[0],
  }));
}

function clearKoreaGroupingDraft() {
  koreaGroupingSelectionIds.clear();
}

function getCurrentKoreaGroupingDraftIds() {
  const currentIds = new Set(getCurrentSelectionEntries().map((entry) => entry.id));
  [...koreaGroupingSelectionIds].forEach((id) => {
    if (!currentIds.has(id)) {
      koreaGroupingSelectionIds.delete(id);
    }
  });
  return [...koreaGroupingSelectionIds];
}

function syncKoreaGroupingActionButtons() {
  const checkedIds = getCurrentKoreaGroupingDraftIds();
  const shouldDisable = state.mapVersion !== "korea";
  const hasCompareView = getCurrentKoreaComparedIds().length >= 2;

  elements.groupSelectedKoreaRegionsButton.disabled = shouldDisable || checkedIds.length < 2;
  elements.ungroupSelectedKoreaRegionsButton.disabled = shouldDisable || !hasCompareView;
}

function normalizeComparedIds(ids = [], selectedEntries = []) {
  const selectedIdSet = new Set(selectedEntries.map((entry) => entry.id));
  return [...new Set(ids.map((id) => String(id)).filter((id) => selectedIdSet.has(id)))];
}

function getCurrentKoreaComparedIds() {
  if (state.koreaLevel === "provinces") {
    return state.koreaComparedProvinces;
  }

  if (state.koreaLevel === "cities") {
    return state.koreaComparedCities;
  }

  return state.koreaComparedMetroDistricts;
}

function setCurrentKoreaComparedIds(ids) {
  const normalizedIds = normalizeComparedIds(ids, getCurrentSelectionEntries());

  if (state.koreaLevel === "provinces") {
    state.koreaComparedProvinces = normalizedIds;
    return;
  }

  if (state.koreaLevel === "cities") {
    state.koreaComparedCities = normalizedIds;
    return;
  }

  state.koreaComparedMetroDistricts = normalizedIds;
}

function getCurrentKoreaComparedIdSet() {
  return new Set(getCurrentKoreaComparedIds());
}

function isKoreaCompareModeActive() {
  return state.mapVersion === "korea" && getCurrentKoreaComparedIds().length >= 2;
}

function getCurrentKoreaComparedFeatures() {
  const comparedIdSet = getCurrentKoreaComparedIdSet();
  if (!comparedIdSet.size) {
    return [];
  }

  if (state.koreaLevel === "cities") {
    return [...koreaCityFeatureById.values()].filter((feature) => comparedIdSet.has(feature.id));
  }

  return getCurrentKoreaDataset().features.filter((feature) => comparedIdSet.has(feature.id));
}

function inferPreferredKoreaParentCode(level = state.koreaLevel) {
  if (!koreaLevelRequiresParent(level)) {
    return "";
  }

  if (isValidKoreaParentCodeForLevel(state.koreaParentCode, level)) {
    return state.koreaParentCode;
  }

  if (state.koreaSelectedProvinces.length === 1) {
    const preferredProvinceCode = state.koreaSelectedProvinces[0].id;
    if (isValidKoreaParentCodeForLevel(preferredProvinceCode, level)) {
      return preferredProvinceCode;
    }
  }

  const levelSelections =
    level === "cities"
      ? state.koreaSelectedCities
      : level === "metroDistricts"
        ? state.koreaSelectedMetroDistricts
        : [];
  const parentCodes = [...new Set(levelSelections.map((region) => region.parentCode).filter(Boolean))];
  if (parentCodes.length === 1 && isValidKoreaParentCodeForLevel(parentCodes[0], level)) {
    return parentCodes[0];
  }

  return "";
}

function normalizeKoreaState() {
  state.koreaSelectedProvinces = normalizeKoreaSelectionEntries(state.koreaSelectedProvinces ?? []);
  state.koreaSelectedCities = normalizeKoreaSelectionEntries(state.koreaSelectedCities ?? []);
  state.koreaSelectedMetroDistricts = normalizeKoreaSelectionEntries(state.koreaSelectedMetroDistricts ?? []);
  state.koreaCityScopeCodes = normalizeKoreaCityScopeCodes(state.koreaCityScopeCodes ?? []);
  state.koreaCityScopeCollapsed = Boolean(state.koreaCityScopeCollapsed);
  state.koreaRegionListCollapsed = Boolean(state.koreaRegionListCollapsed);
  state.koreaComparedProvinces = normalizeComparedIds(
    state.koreaComparedProvinces ?? [],
    state.koreaSelectedProvinces,
  );
  state.koreaComparedCities = normalizeComparedIds(state.koreaComparedCities ?? [], state.koreaSelectedCities);
  state.koreaComparedMetroDistricts = normalizeComparedIds(
    state.koreaComparedMetroDistricts ?? [],
    state.koreaSelectedMetroDistricts,
  );
  state.koreaRouteVisibility = {
    gyeongbuExpressway: Boolean(state.koreaRouteVisibility?.gyeongbuExpressway),
    gyeongbuHsr: Boolean(state.koreaRouteVisibility?.gyeongbuHsr),
    yeongdongExpressway: Boolean(state.koreaRouteVisibility?.yeongdongExpressway),
    honamHsr: Boolean(state.koreaRouteVisibility?.honamHsr),
  };

  if (!koreaRegionLevelLabels[state.koreaLevel]) {
    state.koreaLevel = "provinces";
  }

  if (!koreaLevelRequiresParent(state.koreaLevel)) {
    state.koreaParentCode = "";
    return;
  }

  if (!isValidKoreaParentCodeForLevel(state.koreaParentCode, state.koreaLevel)) {
    state.koreaParentCode = inferPreferredKoreaParentCode(state.koreaLevel);
  }
}

function setSectionVisibility(nodes, isVisible) {
  nodes.forEach((node) => {
    node.hidden = !isVisible;
    node.style.display = isVisible ? "" : "none";
  });
}

function setNodeVisibility(node, isVisible) {
  if (!node) {
    return;
  }

  node.hidden = !isVisible;
  node.style.display = isVisible ? "" : "none";
}

function compareKoreaNames(a = "", b = "") {
  return koreaNameCollator.compare(String(a), String(b));
}

function sortKoreaFeaturesByName(features = []) {
  return [...features].sort(
    (a, b) =>
      compareKoreaNames(a?.properties?.name ?? "", b?.properties?.name ?? "") || d3.ascending(String(a?.id ?? ""), String(b?.id ?? "")),
  );
}

function syncKoreaCollapseControls() {
  if (elements.koreaCityScopeBody && elements.toggleKoreaCityScopeButton) {
    elements.koreaCityScopeBody.hidden = Boolean(state.koreaCityScopeCollapsed);
    elements.toggleKoreaCityScopeButton.textContent = state.koreaCityScopeCollapsed ? "펼치기" : "접기";
  }

  if (elements.koreaRegionBlockBody && elements.toggleKoreaRegionListButton) {
    elements.koreaRegionBlockBody.hidden = Boolean(state.koreaRegionListCollapsed);
    elements.toggleKoreaRegionListButton.textContent = state.koreaRegionListCollapsed ? "펼치기" : "접기";
  }
}

function toggleKoreaCityScopeCollapsed() {
  beginHistoryStep("시/군 범위 패널 토글");
  state.koreaCityScopeCollapsed = !state.koreaCityScopeCollapsed;
  syncKoreaCollapseControls();
}

function toggleKoreaRegionListCollapsed() {
  beginHistoryStep("권역 목록 패널 토글");
  state.koreaRegionListCollapsed = !state.koreaRegionListCollapsed;
  syncKoreaCollapseControls();
}

function setMapVersion(mapVersion, { silent = false } = {}) {
  if (!mapVersionLabels[mapVersion] || state.mapVersion === mapVersion) {
    syncMapVersionControls();
    return;
  }

  beginHistoryStep("지도 버전 변경");
  state.mapVersion = mapVersion;
  interactionState.temporaryViewMode = null;
  keyboardState.temporaryPanSourceMode = null;
  if (mapVersion !== "korea") {
    clearKoreaGroupingDraft();
  }
  syncControls();
  renderSelectionViews();
  renderMap();

  if (!silent) {
    setStatus(
      state.mapVersion === "world"
        ? "세계 지도 모드로 돌아왔습니다."
        : "대한민국 권역 지도 모드로 전환했습니다.",
    );
  }
}

function setKoreaLevel(level, { silent = false } = {}) {
  if (!koreaRegionLevelLabels[level] || state.koreaLevel === level) {
    syncKoreaControls();
    return;
  }

  beginHistoryStep("한국 권역 레벨 변경");
  state.koreaLevel = level;
  state.koreaParentCode = koreaLevelRequiresParent(level) ? inferPreferredKoreaParentCode(level) : "";
  clearKoreaGroupingDraft();
  syncControls();
  renderSelectionViews();
  renderMap();

  if (!silent) {
    setStatus(`${koreaRegionLevelLabels[level]} 보기로 전환했습니다.`);
  }
}

function setKoreaParentCode(code, { silent = false } = {}) {
  const nextCode = isValidKoreaParentCodeForLevel(code) ? String(code) : "";
  if (state.koreaParentCode === nextCode) {
    syncKoreaControls();
    return;
  }

  beginHistoryStep("한국 상위 권역 변경");
  state.koreaParentCode = nextCode;
  clearKoreaGroupingDraft();
  syncKoreaControls();
  renderSelectionViews();
  renderMap();

  if (!silent) {
    setStatus(
      nextCode
        ? `${getKoreaProvinceName(nextCode)} ${koreaRegionLevelLabels[state.koreaLevel]} 보기로 전환했습니다.`
        : `${koreaRegionLevelLabels[state.koreaLevel]} 범위 선택을 초기화했습니다.`,
    );
  }
}

function syncMapVersionControls() {
  const isWorldMode = state.mapVersion === "world";
  document.body.dataset.mapVersion = state.mapVersion;
  setSectionVisibility(elements.worldSections, isWorldMode);
  setSectionVisibility(elements.koreaSections, !isWorldMode);
  elements.mapVersionButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mapVersion === state.mapVersion);
  });
  elements.selectionCardTitle.textContent = isWorldMode ? "국가 선택" : "한국 권역 선택";
  elements.selectionDetailTitle.textContent = isWorldMode ? "선택 국가 랙" : "선택 권역 랙";
  elements.selectionDetailHint.textContent = isWorldMode
    ? "비교와 그래프에 쓸 국가를 여기서 색상과 함께 관리합니다."
    : "비교와 그래프에 쓸 권역을 여기서 색상과 비교 보기 상태와 함께 관리합니다.";
  elements.detailSectionTitle.textContent = isWorldMode ? "인문지리 비교 자료실" : "한국지리 비교 자료실";
  elements.detailSectionBadge.textContent = isWorldMode ? "구성비 · 변화 · 국가 프로필" : "권역 비교 · 구조 · 변화";
  elements.unifySelectedColorLabel.textContent = isWorldMode ? "선택 국가 색상 통일" : "선택 권역 색상 통일";
  elements.modeButtons.forEach((button) => {
    button.disabled = !isWorldMode;
  });
  elements.zoomOutButton.disabled = !isWorldMode;
  elements.resetViewButton.disabled = !isWorldMode;
  syncKoreaGroupingActionButtons();
}

function syncKoreaControls() {
  elements.koreaLevelButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.koreaLevel === state.koreaLevel);
  });

  buildKoreaParentRegionOptions();
  const requiresParent = koreaLevelRequiresParent();
  const showsCityScope = state.koreaLevel === "cities";
  setNodeVisibility(elements.koreaParentRegionField, requiresParent);
  elements.koreaParentRegionLabel.textContent = koreaParentFieldLabels[state.koreaLevel] ?? "상위 범위";
  elements.koreaParentRegionSelect.value = state.koreaParentCode;
  elements.koreaParentRegionSelect.disabled = !requiresParent;
  setNodeVisibility(elements.koreaCityScopeField, showsCityScope);
  if (elements.clearKoreaCityScopeButton) {
    elements.clearKoreaCityScopeButton.disabled = !state.koreaCityScopeCodes.length;
  }
  elements.koreaRouteToggles.forEach((toggle) => {
    toggle.checked = Boolean(state.koreaRouteVisibility[toggle.dataset.route]);
  });
  syncKoreaCollapseControls();
  renderKoreaCityScopeChips();
  renderKoreaRegionChips();
  syncKoreaGroupingActionButtons();
  updatePreviewHint();
  updateWorkspaceStats();
}

function syncControls() {
  normalizeCanvasStateDimensions();
  syncMapVersionControls();
  syncDimensionInputs();
  syncPresetButtons();
  syncCenterControls();
  syncModeButtons();
  syncProjectionButtons();
  syncGuideControls();
  syncStyleControls();
  syncKoreaControls();
  updatePreviewHint();
  updateWorkspaceStats();
  syncHistoryButtons();
}

function syncDimensionInputs() {
  elements.widthInput.value = String(clampCanvasWidth(state.width));
  elements.heightInput.value = String(clampCanvasHeight(state.height));
}

function syncPresetButtons() {
  elements.presetButtons.forEach((button) => {
    const isActive =
      Number(button.dataset.width) === state.width && Number(button.dataset.height) === state.height;
    button.classList.toggle("is-active", isActive);
  });
}

function syncCenterControls() {
  elements.centerLongitudeInput.value = String(state.centerLongitude);
  elements.centerLongitudeValue.textContent = formatLongitude(state.centerLongitude);
  elements.centerButtons.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.center) === state.centerLongitude);
  });
}

function syncModeButtons() {
  const activeMode = getActiveViewMode();
  elements.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === activeMode);
  });
}

function syncProjectionButtons() {
  elements.projectionButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.projection === state.projectionMode);
  });
}

function syncGuideControls() {
  elements.guideToggles.forEach((toggle) => {
    toggle.checked = Boolean(state.guides[toggle.dataset.guide]);
  });
}

function syncStyleControls() {
  const isWorldMode = state.mapVersion === "world";
  const canShowCanvasFrame = state.projectionMode === "rectangular" || state.mapVersion === "korea";
  elements.paddingValue.textContent = `${state.paddingPercent}%`;
  elements.oceanColorInput.value = state.oceanColor;
  elements.landColorInput.value = state.landColor;
  if (elements.landColorLabelText) {
    elements.landColorLabelText.textContent = isWorldMode ? "비선택 국가" : "비선택 권역";
  }
  elements.borderColorInput.value = state.borderColor;
  elements.borderModeInput.value = state.borderMode;
  if (elements.borderModeLabelText) {
    elements.borderModeLabelText.textContent = isWorldMode ? "국경선 스타일" : "행정 경계 스타일";
  }
  elements.coastlineDetailInput.value = state.coastlineDetail;
  setNodeVisibility(elements.coastlineDetailField, isWorldMode);
  elements.autoFocusSelectionToggle.checked = Boolean(state.autoFocusOnSelection);
  elements.unifySelectedCountryColorsToggle.checked = Boolean(state.unifySelectedCountryColors);
  elements.unifiedCountryColorInput.value = getUnifiedSelectedCountryColor();
  elements.unifiedCountryColorInput.disabled = !state.unifySelectedCountryColors;
  if (elements.frameToggleLabelText) {
    elements.frameToggleLabelText.textContent = isWorldMode ? "프레임 표시" : "지도 프레임 표시";
  }
  elements.frameToggle.checked = canShowCanvasFrame ? state.showFrame : false;
  elements.frameToggle.disabled = !canShowCanvasFrame;
  elements.frameToggle.title = canShowCanvasFrame
    ? ""
    : isWorldMode
      ? "극 시점에서는 바깥 프레임 대신 원형 윤곽선을 사용합니다."
      : "";
  elements.scaleBarToggle.checked = state.showScaleBar;
  elements.guideLineToggle.checked = state.showGuideLines;
  elements.latitudeLabelToggle.checked = state.showLatitudeLabels;
  elements.mapFontSizeInput.value = String(state.mapFontSizePt);
  elements.mapFontSizeValue.textContent = formatPointSize(state.mapFontSizePt);
  elements.selectedBordersOnlyToggle.checked = state.selectedBordersOnly;
  elements.markerStyleInput.value = state.markerDraftStyle;
}

function updatePreviewHint() {
  if (state.mapVersion === "korea") {
    if (isKoreaCompareModeActive()) {
      const comparedCount = getCurrentKoreaComparedIds().length;
      elements.previewHint.textContent = `체크해 둔 ${comparedCount}개 권역을 전국 비교 보기로 띄우고 있습니다.`;
      elements.activeModeLabel.textContent = "권역 비교";
      elements.activeModeTitle.textContent = "권역 비교";
      elements.activeModeDescription.textContent =
        "선택한 권역을 한 장의 한국 지도에서 비교하고, 필요한 경우 노선 오버레이를 함께 얹습니다.";
      renderWorkspaceModeTips(["체크 권역 비교", "전국 문맥 유지", "노선 오버레이 가능"]);
      return;
    }

    const scopeText =
      state.koreaLevel === "cities"
        ? hasKoreaCityScopeFilter()
          ? `${getKoreaCityScopeLabel(state.koreaCityScopeCodes, { maxNames: 3 })} 범위의 시/군 권역을 보고 있습니다.`
          : "전국 시/군 권역을 한 장의 지도에서 보고 있습니다."
        : koreaLevelRequiresParent(state.koreaLevel)
          ? state.koreaParentCode
            ? `${getKoreaProvinceName(state.koreaParentCode)} 범위에서 권역을 켜고 끄고 있습니다.`
            : "특별시 또는 광역시를 먼저 고르면 구/군 권역을 바로 켜고 끌 수 있습니다."
          : "도/광역시 권역을 클릭해서 바로 켜고 끌 수 있습니다.";
    elements.previewHint.textContent = scopeText;
    elements.activeModeLabel.textContent = "권역 on/off";
    elements.activeModeTitle.textContent = "권역 on/off";
    elements.activeModeDescription.textContent =
      "한국 지도에서는 지도를 이동하지 않고 권역을 바로 켜고 끄며 구도를 정합니다.";
    renderWorkspaceModeTips(
      state.koreaLevel === "cities"
        ? [
            "클릭: 권역 on/off",
            "도/광역시 복수 범위",
            hasKoreaCityScopeFilter() ? "선택 범위만 표시" : "전국 문맥 유지",
          ]
        : koreaLevelRequiresParent(state.koreaLevel)
          ? [
              "클릭: 권역 on/off",
              "상위 범위 선택",
              "체크 후 비교 가능",
            ]
          : ["클릭: 권역 on/off", "레벨 전환: 도/광역시·시/군·구/군", "체크 후 비교 가능"],
    );
    return;
  }

  const activeMode = getActiveViewMode();
  const details = viewModeDetails[activeMode] ?? viewModeDetails.zoom;

  elements.previewHint.textContent = details.hint;
  elements.activeModeLabel.textContent = viewModeLabels[activeMode] ?? viewModeLabels.zoom;
  elements.activeModeTitle.textContent = viewModeLabels[activeMode] ?? viewModeLabels.zoom;
  elements.activeModeDescription.textContent = details.description;
  renderWorkspaceModeTips(details.tips);
}

function renderWorkspaceModeTips(tips = []) {
  elements.workspaceModeTips.replaceChildren();

  tips.forEach((tip) => {
    const item = document.createElement("span");
    item.className = "workspace-mode-tip";
    item.textContent = tip;
    elements.workspaceModeTips.appendChild(item);
  });
}

function updateWorkspaceStats() {
  if (state.mapVersion === "korea") {
    const currentSelection = getCurrentSelectionEntries();
    const compareText = isKoreaCompareModeActive() ? ` · 비교 ${getCurrentKoreaComparedIds().length}개` : "";
    const scopeText =
      state.koreaLevel === "cities"
        ? ` · ${hasKoreaCityScopeFilter() ? getKoreaCityScopeLabel(state.koreaCityScopeCodes, { maxNames: 2 }) : "전국"}`
        : koreaLevelRequiresParent(state.koreaLevel) && state.koreaParentCode
          ? ` · ${getKoreaProvinceName(state.koreaParentCode)}`
          : "";
    elements.viewZoomLabel.textContent = "고정 보기";
    elements.workspaceObjectSummary.textContent =
      `권역 ${currentSelection.length} · ${koreaRegionLevelLabels[state.koreaLevel]}` +
      scopeText +
      compareText;
    return;
  }

  const zoomRatio = state.viewZoom * previewInteraction.scale;
  elements.viewZoomLabel.textContent = `${Math.round(zoomRatio * 100)}%`;
  elements.workspaceObjectSummary.textContent =
    `국가 ${state.selected.length} · 마커 ${state.markers.length} · 인셋 ${state.insets.length}`;
}

function buildCountryDatalist() {
  const fragment = document.createDocumentFragment();

  countryFeatures.forEach((feature) => {
    const option = document.createElement("option");
    option.value = feature.properties.name;
    fragment.appendChild(option);
  });

  elements.countryOptions.appendChild(fragment);
}

function addCountriesFromInput(rawValue) {
  if (state.mapVersion !== "world") {
    setStatus("한국 지도에서는 검색 대신 권역 칩이나 지도 클릭으로 선택합니다.");
    return;
  }

  const tokens = rawValue
    .split(/[,\n]/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (!tokens.length) {
    setStatus("추가할 국가명을 입력해 주세요.", true);
    return;
  }

  beginHistoryStep("국가 추가");
  const addedNames = [];
  const addedIds = [];
  const missingNames = [];

  tokens.forEach((token) => {
    const country = findCountry(token);
    if (!country) {
      missingNames.push(token);
      return;
    }

    if (state.selected.some((item) => item.id === country.id)) {
      return;
    }

    state.selected.push({
      id: country.id,
      name: country.properties.name,
      color: nextPaletteColor(state.selected.length),
    });
    addedNames.push(country.properties.name);
    addedIds.push(country.id);
  });

  elements.countryInput.value = "";

  if (addedNames.length) {
    syncActiveStatsCountry(addedIds[addedIds.length - 1] ?? null);
    resetViewForSelectionIfNeeded();
    setStatus(`${addedNames.join(", ")} 추가됨`);
  } else if (missingNames.length) {
    setStatus(`찾을 수 없는 국가: ${missingNames.join(", ")}`, true);
  } else {
    setStatus("이미 선택된 국가입니다.");
  }

  renderSelectionViews();
  renderMap();
}

function findCountry(query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return null;
  }

  if (countryByAlias.has(normalizedQuery)) {
    return countryByAlias.get(normalizedQuery);
  }

  const exactMatch = countryByNormalizedName.get(normalizedQuery);
  if (exactMatch) {
    return exactMatch;
  }

  const partialMatches = countryFeatures.filter((feature) =>
    normalizeText(feature.properties.name).includes(normalizedQuery),
  );

  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  const aliasMatches = [...countryByAlias.entries()]
    .filter(([alias]) => alias.includes(normalizedQuery))
    .map(([, feature]) => feature)
    .filter(Boolean);

  if (aliasMatches.length === 1) {
    return aliasMatches[0];
  }

  return partialMatches[0] ?? null;
}

function normalizeText(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function nextPaletteColor(index = state.selected.length) {
  return atlasPalette[index % atlasPalette.length];
}

function getCurrentKoreaDataset(level = state.koreaLevel) {
  return level === "provinces"
    ? koreaDatasets.provinces
    : level === "cities"
      ? koreaDatasets.cities
      : koreaDatasets.metroDistricts;
}

function getCurrentSelectionEntries() {
  if (state.mapVersion === "world") {
    return state.selected;
  }

  if (state.koreaLevel === "provinces") {
    return state.koreaSelectedProvinces;
  }

  if (state.koreaLevel === "cities") {
    return state.koreaSelectedCities;
  }

  return state.koreaSelectedMetroDistricts;
}

function setCurrentSelectionEntries(entries) {
  if (state.mapVersion === "world") {
    state.selected = entries;
    return;
  }

  const normalizedEntries = normalizeKoreaSelectionEntries(entries);

  if (state.koreaLevel === "provinces") {
    state.koreaSelectedProvinces = normalizedEntries;
    state.koreaComparedProvinces = normalizeComparedIds(state.koreaComparedProvinces, normalizedEntries);
    return;
  }

  if (state.koreaLevel === "cities") {
    state.koreaSelectedCities = normalizedEntries;
    state.koreaComparedCities = normalizeComparedIds(state.koreaComparedCities, normalizedEntries);
    return;
  }

  state.koreaSelectedMetroDistricts = normalizedEntries;
  state.koreaComparedMetroDistricts = normalizeComparedIds(state.koreaComparedMetroDistricts, normalizedEntries);
}

function getKoreaProvinceName(code) {
  return koreaProvinceByCode.get(code)?.properties?.name ?? code;
}

function formatSelectionDisplayName(selection) {
  if (state.mapVersion === "korea" && state.koreaLevel === "cities" && selection.parentCode) {
    return `${getKoreaProvinceName(selection.parentCode)} · ${selection.name}`;
  }

  if (state.mapVersion === "korea" && koreaLevelRequiresParent(state.koreaLevel)) {
    return `${getKoreaProvinceName(selection.parentCode)} · ${selection.name}`;
  }

  return selection.name;
}

function getCurrentSelectionEmptyMessage() {
  if (state.mapVersion === "world") {
    return "아직 선택된 국가가 없습니다. 검색창이나 미리보기 클릭으로 추가해 보세요.";
  }

  if (state.koreaLevel === "metroDistricts" && !state.koreaParentCode) {
    return "구/군을 보려면 먼저 특별시 또는 광역시를 고르거나 지도에서 한 번 클릭해 주세요.";
  }

  return "아직 선택된 권역이 없습니다. 권역 칩이나 미리보기 클릭으로 추가해 보세요.";
}

function createKoreaSelectionEntry(feature, color = nextPaletteColor(getCurrentSelectionEntries().length)) {
  return {
    id: feature.id,
    name: feature.properties.name,
    parentCode: feature.properties.parentCode,
    color,
  };
}

function renderKoreaCityScopeChips() {
  if (!elements.koreaCityScopeChipList) {
    return;
  }

  elements.koreaCityScopeChipList.replaceChildren();

  if (state.mapVersion !== "korea" || state.koreaLevel !== "cities") {
    return;
  }

  const fragment = document.createDocumentFragment();
  const activeScopeCodes = getKoreaCityScopeCodeSet();

  const nationwideButton = document.createElement("button");
  nationwideButton.type = "button";
  nationwideButton.className = "tw-chip region-chip";
  nationwideButton.textContent = "전국";
  nationwideButton.classList.toggle("is-active", !activeScopeCodes.size);
  nationwideButton.addEventListener("click", () => {
    clearKoreaCityScope();
  });
  fragment.appendChild(nationwideButton);

  koreaParentOptionsByLevel.cities.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tw-chip region-chip";
    button.textContent = option.name;
    button.classList.toggle("is-active", activeScopeCodes.has(option.code));
    button.addEventListener("click", () => {
      toggleKoreaCityScopeCode(option.code);
    });
    fragment.appendChild(button);
  });

  elements.koreaCityScopeChipList.appendChild(fragment);
}

function getVisibleKoreaSelectableFeatures() {
  if (state.koreaLevel === "provinces") {
    return koreaDatasets.provinces.features;
  }

  if (state.koreaLevel === "cities") {
    if (!state.koreaCityScopeCodes.length) {
      return [...koreaDatasets.cities.features, ...koreaCityContextProvinceFeatures];
    }

    return state.koreaCityScopeCodes.flatMap((code) => {
      if (koreaCitiesByParentCode.has(code)) {
        return koreaCitiesByParentCode.get(code) ?? [];
      }

      return koreaCityFeatureById.has(code) ? [koreaCityFeatureById.get(code)] : [];
    });
  }

  if (!state.koreaParentCode) {
    return [];
  }

  return koreaMetroDistrictsByParentCode.get(state.koreaParentCode) ?? [];
}

function getKoreaHitTestFeatures() {
  if (isKoreaCompareModeActive()) {
    return getCurrentKoreaDataset().features;
  }

  if (state.koreaLevel === "provinces") {
    return koreaDatasets.provinces.features;
  }

  if (state.koreaLevel === "cities") {
    return getVisibleKoreaSelectableFeatures();
  }

  if (!state.koreaParentCode) {
    return koreaDatasets.provinces.features;
  }

  return getVisibleKoreaSelectableFeatures();
}

function renderKoreaRegionChips() {
  elements.koreaRegionChipList.replaceChildren();

  if (state.mapVersion !== "korea") {
    return;
  }

  const visibleFeatures = getVisibleKoreaSelectableFeatures();
  const selectedIds = new Set(getCurrentSelectionEntries().map((selection) => selection.id));

  if (!visibleFeatures.length) {
    const emptyText = getCurrentSelectionEmptyMessage();
    elements.koreaRegionChipList.appendChild(createEmptyState(emptyText));
    elements.activateVisibleKoreaRegionsButton.disabled = true;
    elements.clearVisibleKoreaRegionsButton.disabled = true;
    return;
  }

  const fragment = document.createDocumentFragment();

  sortKoreaFeaturesByName(visibleFeatures).forEach((feature) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tw-chip region-chip";
    button.textContent = feature.properties.name;
    button.classList.toggle("is-active", selectedIds.has(feature.id));
    button.addEventListener("click", () => {
      toggleKoreaRegion(feature.id);
    });
    fragment.appendChild(button);
  });

  elements.koreaRegionChipList.appendChild(fragment);
  elements.activateVisibleKoreaRegionsButton.disabled = false;
  elements.clearVisibleKoreaRegionsButton.disabled = false;
}

function selectAllVisibleKoreaRegions() {
  const visibleFeatures = getVisibleKoreaSelectableFeatures();
  if (!visibleFeatures.length) {
    setStatus("현재 켤 수 있는 권역이 없습니다.");
    return;
  }

  const selections = [...getCurrentSelectionEntries()];
  const existingIds = new Set(selections.map((selection) => selection.id));
  let paletteIndex = selections.length;
  let addedCount = 0;

  visibleFeatures.forEach((feature) => {
    if (existingIds.has(feature.id)) {
      return;
    }

    selections.push(createKoreaSelectionEntry(feature, nextPaletteColor(paletteIndex)));
    existingIds.add(feature.id);
    paletteIndex += 1;
    addedCount += 1;
  });

  if (!addedCount) {
    setStatus("현재 보이는 권역은 이미 모두 켜져 있습니다.");
    return;
  }

  beginHistoryStep("권역 선택 변경");
  setCurrentSelectionEntries(selections);
  renderSelectionViews();
  syncKoreaControls();
  renderMap();
  setStatus(`현재 보이는 ${visibleFeatures.length}개 권역을 켰습니다.`);
}

function clearVisibleKoreaRegions() {
  const visibleFeatures = getVisibleKoreaSelectableFeatures();
  if (!visibleFeatures.length) {
    setStatus("현재 끌 수 있는 권역이 없습니다.");
    return;
  }

  const visibleIds = new Set(visibleFeatures.map((feature) => feature.id));
  const currentSelection = getCurrentSelectionEntries();
  const nextSelection = currentSelection.filter((selection) => !visibleIds.has(selection.id));

  if (nextSelection.length === currentSelection.length) {
    setStatus("현재 보이는 권역 중 꺼진 항목만 있습니다.");
    return;
  }

  beginHistoryStep("권역 선택 변경");
  setCurrentSelectionEntries(nextSelection);
  renderSelectionViews();
  syncKoreaControls();
  renderMap();
  setStatus("현재 보이는 권역을 모두 껐습니다.");
}

function groupCheckedKoreaRegions() {
  if (state.mapVersion !== "korea") {
    return;
  }

  const checkedIds = getCurrentKoreaGroupingDraftIds();
  if (checkedIds.length < 2) {
    setStatus("전국 비교로 볼 권역을 두 개 이상 체크해 주세요.");
    return;
  }

  beginHistoryStep("권역 비교 보기");
  setCurrentKoreaComparedIds(checkedIds);
  clearKoreaGroupingDraft();
  renderSelectionViews();
  syncKoreaControls();
  renderMap();
  setStatus(`${checkedIds.length}개 권역을 전국 비교 보기로 띄웠습니다.`);
}

function ungroupCheckedKoreaRegions() {
  if (state.mapVersion !== "korea") {
    return;
  }

  if (getCurrentKoreaComparedIds().length < 2) {
    setStatus("해제할 비교 보기가 없습니다.");
    return;
  }

  beginHistoryStep("권역 비교 해제");
  setCurrentKoreaComparedIds([]);
  clearKoreaGroupingDraft();
  renderSelectionViews();
  syncKoreaControls();
  renderMap();
  setStatus("권역 비교 보기를 해제했습니다.");
}

function getUnifiedSelectedCountryColor() {
  return state.unifiedSelectedCountryColor || atlasPalette[0];
}

function getSelectedCountryColor(country) {
  if (state.unifySelectedCountryColors) {
    return getUnifiedSelectedCountryColor();
  }

  return country.color || atlasPalette[0];
}

function buildSelectedColorById() {
  return new Map(getCurrentSelectionEntries().map((country) => [country.id, getSelectedCountryColor(country)]));
}

function getMetricExplorerTopN() {
  return clamp(Math.round(Number(state.metricExplorerTopN) || 10), 1, 30);
}

function buildMetricExplorerHighlightColorById() {
  if (state.mapVersion !== "world" || !state.metricExplorerMapHighlightEnabled) {
    return new Map();
  }

  const results = getMetricExplorerResults();
  if (!results.length) {
    return new Map();
  }

  const colorById = new Map();
  const topResults = results.slice(0, getMetricExplorerTopN());

  if (state.metricExplorerGrouping === "continents") {
    const continentByCountryId = new Map(
      Object.entries(countryStatsById)
        .filter(([, stats]) => stats?.continent?.name)
        .map(([countryId, stats]) => [countryId, stats.continent.name]),
    );
    topResults.forEach((entry, index) => {
      const color = metricExplorerRankPalette[index] ?? metricExplorerRankPalette[metricExplorerRankPalette.length - 1];
      continentByCountryId.forEach((continentName, countryId) => {
        if (continentName === entry.label) {
          colorById.set(countryId, color);
        }
      });
    });
    return colorById;
  }

  topResults.forEach((entry, index) => {
    const color = metricExplorerRankPalette[index] ?? metricExplorerRankPalette[metricExplorerRankPalette.length - 1];
    if (entry.id) {
      colorById.set(entry.id, color);
    }
  });

  return colorById;
}

function buildMapFillColorById() {
  const colorById = buildMetricExplorerHighlightColorById();
  const shouldKeepHighlightForSelectedScope =
    state.metricExplorerMapHighlightEnabled && getMetricExplorerScopeMode() === "selected";

  buildSelectedColorById().forEach((color, id) => {
    if (shouldKeepHighlightForSelectedScope && colorById.has(id)) {
      return;
    }
    colorById.set(id, color);
  });
  return colorById;
}

function getMetricExplorerScopeMode() {
  return state.selected.length ? "selected" : "global";
}

function getMetricExplorerScopeLabel() {
  return getMetricExplorerScopeMode() === "selected" ? `선택 국가 ${state.selected.length}개` : "전 세계";
}

function getMetricExplorerCategoryMeta(categoryKey = state.metricExplorerCategoryKey) {
  return (
    metricExplorerCategoryDefinitions.find((category) => category.key === categoryKey) ??
    metricExplorerCategoryDefinitions[0]
  );
}

function getMetricExplorerDisplayModeMeta(modeKey = state.metricExplorerDisplayMode) {
  return (
    metricExplorerDisplayModeDefinitions.find((mode) => mode.key === modeKey) ??
    metricExplorerDisplayModeDefinitions[0]
  );
}

function getMetricExplorerDefinitionCategoryKey(definitionOrKey) {
  const key = typeof definitionOrKey === "string" ? definitionOrKey : definitionOrKey?.key ?? "";

  if (key.startsWith("population-") || key.startsWith("age-")) {
    return "demography";
  }
  if (key.startsWith("dependency-") || key.startsWith("migration-") || key.startsWith("refugee-")) {
    return "demography";
  }
  if (key.startsWith("crops-")) {
    return "agriculture";
  }
  if (key.startsWith("livestock-")) {
    return "agriculture";
  }
  if (key.startsWith("religion-")) {
    return "religion";
  }
  if (key.startsWith("exports-") || key.startsWith("industry-")) {
    return "economy";
  }
  if (key.startsWith("energy-") || key.startsWith("electricity-") || key.startsWith("fossil-")) {
    return "energy";
  }

  return "demography";
}

function getMetricExplorerDefinitionBaseMode(definitionOrKey) {
  const key = typeof definitionOrKey === "string" ? definitionOrKey : definitionOrKey?.key ?? "";

  if (
    key.includes("-share") ||
    key.startsWith("religion-") ||
    key.startsWith("age-") ||
    key.startsWith("dependency-") ||
    key.includes("-ratio") ||
    key.includes("-rate")
  ) {
    return "share";
  }

  if (
    key.includes("imports") ||
    key.includes("exports") ||
    key.startsWith("exports-") ||
    key.startsWith("migration-") ||
    key.startsWith("refugee-")
  ) {
    return "flow";
  }

  return "amount";
}

function getMetricExplorerCategoryDefinitionsFiltered(definitions = getMetricExplorerDefinitions()) {
  return definitions.filter((definition) => getMetricExplorerDefinitionCategoryKey(definition) === state.metricExplorerCategoryKey);
}

function getMetricExplorerVisibleDefinitions(definitions = getMetricExplorerDefinitions()) {
  const categoryDefinitions = getMetricExplorerCategoryDefinitionsFiltered(definitions);
  const mode = state.metricExplorerDisplayMode;

  if (mode === "overview" || mode === "relative" || mode === "scatter") {
    return categoryDefinitions;
  }

  return categoryDefinitions.filter((definition) => getMetricExplorerDefinitionBaseMode(definition) === mode);
}

function ensureMetricExplorerState(definitions = getMetricExplorerDefinitions()) {
  const categoryDefinitions = getMetricExplorerCategoryDefinitionsFiltered(definitions);
  if (!categoryDefinitions.length) {
    state.metricExplorerCategoryKey = metricExplorerCategoryDefinitions[0].key;
    return;
  }

  if (!categoryDefinitions.some((definition) => definition.key === state.metricExplorerMetricKey)) {
    state.metricExplorerMetricKey = categoryDefinitions[0].key;
  }

  let visibleDefinitions = getMetricExplorerVisibleDefinitions(definitions);
  if (!visibleDefinitions.length) {
    state.metricExplorerDisplayMode = "overview";
    visibleDefinitions = getMetricExplorerVisibleDefinitions(definitions);
  }
  if (!visibleDefinitions.some((definition) => definition.key === state.metricExplorerMetricKey)) {
    state.metricExplorerMetricKey = visibleDefinitions[0]?.key ?? categoryDefinitions[0].key;
  }

  const scatterFallbacks = categoryDefinitions.map((definition) => definition.key);
  if (!scatterFallbacks.includes(state.metricExplorerScatterXKey)) {
    state.metricExplorerScatterXKey = scatterFallbacks[0] ?? state.metricExplorerMetricKey;
  }
  if (!scatterFallbacks.includes(state.metricExplorerScatterYKey)) {
    state.metricExplorerScatterYKey = scatterFallbacks[1] ?? scatterFallbacks[0] ?? state.metricExplorerMetricKey;
  }
  if (!scatterFallbacks.includes(state.metricExplorerScatterSizeKey)) {
    state.metricExplorerScatterSizeKey = scatterFallbacks[2] ?? scatterFallbacks[0] ?? state.metricExplorerMetricKey;
  }
}

function resetViewForSelectionIfNeeded() {
  if (state.mapVersion === "world" && state.autoFocusOnSelection) {
    resetViewWindow();
  }
}

function syncActiveStatsCountry(preferredId = null) {
  if (state.mapVersion !== "world") {
    return;
  }

  const selectedIds = new Set(state.selected.map((country) => country.id));
  if (preferredId && selectedIds.has(preferredId)) {
    state.activeStatsCountryId = preferredId;
    return;
  }

  if (state.activeStatsCountryId && selectedIds.has(state.activeStatsCountryId)) {
    return;
  }

  state.activeStatsCountryId = state.selected[state.selected.length - 1]?.id ?? null;
}

function renderSelectionViews() {
  renderSelectedCountries();
  renderExamGraphPanel();
  renderMetricExplorerPanel();
  renderCountryStatsPanel();
  renderKoreaGeoStatsPanel();
}

function getActiveStatsCountry() {
  if (state.mapVersion !== "world") {
    return null;
  }

  syncActiveStatsCountry();
  return state.selected.find((country) => country.id === state.activeStatsCountryId) ?? null;
}

function renderSelectedCountries() {
  elements.selectedCountryList.replaceChildren();

  const currentSelection = getCurrentSelectionEntries();
  const comparedIdSet = getCurrentKoreaComparedIdSet();
  if (state.mapVersion === "world") {
    syncActiveStatsCountry();
  }

  if (!currentSelection.length) {
    elements.selectedCountryList.appendChild(createEmptyState(getCurrentSelectionEmptyMessage()));
    syncKoreaGroupingActionButtons();
    return;
  }

  currentSelection.forEach((country) => {
    const displayedColor = getSelectedCountryColor(country);
    const listItem = document.createElement("li");
    listItem.className = "selected-country-item";

    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.backgroundColor = displayedColor;

    const textWrap = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = formatSelectionDisplayName(country);
    const code = document.createElement("span");
    const metaParts = [];
    if (state.mapVersion === "korea") {
      metaParts.push(koreaRegionLevelLabels[state.koreaLevel]);
      if (comparedIdSet.has(country.id)) {
        metaParts.push("비교 보기 중");
      }
    }
    metaParts.push(
      state.unifySelectedCountryColors
        ? "통일 색상 사용 중"
        : state.mapVersion === "world"
          ? "색상은 자유롭게 바꿀 수 있습니다"
          : "색상은 자유롭게 바꿀 수 있습니다",
    );
    const baseMetaText = metaParts.join(" · ");
    code.textContent =
      state.mapVersion === "world" && country.id === state.activeStatsCountryId
        ? `현재 통계 패널 표시 중 · ${baseMetaText}`
        : baseMetaText;
    textWrap.append(name, code);

    const controls = document.createElement("div");
    controls.className = "inline-actions";

    if (state.mapVersion === "world") {
      const statsButton = document.createElement("button");
      statsButton.className = "remove-button tw-button";
      statsButton.type = "button";
      statsButton.textContent = country.id === state.activeStatsCountryId ? "보고 있음" : "통계";
      statsButton.disabled = country.id === state.activeStatsCountryId;
      statsButton.addEventListener("click", () => {
        state.activeStatsCountryId = country.id;
        renderSelectionViews();
      });
      controls.appendChild(statsButton);
    }

    if (state.mapVersion === "korea") {
      const mergeToggle = document.createElement("label");
      mergeToggle.className = "selection-merge-toggle";
      const mergeCheckbox = document.createElement("input");
      mergeCheckbox.type = "checkbox";
      mergeCheckbox.checked = koreaGroupingSelectionIds.has(country.id);
      mergeCheckbox.setAttribute("aria-label", `${formatSelectionDisplayName(country)} 비교 대상으로 선택`);
      mergeCheckbox.addEventListener("change", () => {
        if (mergeCheckbox.checked) {
          koreaGroupingSelectionIds.add(country.id);
        } else {
          koreaGroupingSelectionIds.delete(country.id);
        }
        syncKoreaGroupingActionButtons();
      });
      const mergeLabel = document.createElement("span");
      mergeLabel.textContent = "비교";
      mergeToggle.append(mergeCheckbox, mergeLabel);
      controls.appendChild(mergeToggle);
    }

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = displayedColor;
    colorInput.disabled = state.unifySelectedCountryColors;
    colorInput.title = state.unifySelectedCountryColors ? "통일 색상 옵션이 켜져 있어 개별 색상 편집이 잠겨 있습니다." : "";
    colorInput.setAttribute("aria-label", `${formatSelectionDisplayName(country)} 색상`);
    colorInput.addEventListener("input", () => {
      beginHistoryStep(state.mapVersion === "world" ? "국가 색상 변경" : "권역 색상 변경");
      country.color = colorInput.value;
      swatch.style.backgroundColor = colorInput.value;
      renderMap();
    });

    const removeButton = document.createElement("button");
    removeButton.className = "remove-button tw-button";
    removeButton.type = "button";
    removeButton.textContent = "제거";
    removeButton.addEventListener("click", () => {
      removeSelectionEntry(country.id);
      setStatus(`${formatSelectionDisplayName(country)} 제거됨`);
    });

    controls.append(colorInput, removeButton);
    listItem.append(swatch, textWrap, controls);
    elements.selectedCountryList.appendChild(listItem);
  });

  syncKoreaGroupingActionButtons();
}

function renderMetricExplorerPanel() {
  if (!elements.metricExplorerPanel) {
    return;
  }

  elements.metricExplorerPanel.replaceChildren();

  if (state.mapVersion !== "world") {
    return;
  }

  const definitions = getMetricExplorerDefinitions();
  ensureMetricExplorerState(definitions);
  const categoryMeta = getMetricExplorerCategoryMeta();
  const displayModeMeta = getMetricExplorerDisplayModeMeta();
  const categoryDefinitions = getMetricExplorerCategoryDefinitionsFiltered(definitions);
  const visibleDefinitions = getMetricExplorerVisibleDefinitions(definitions);
  const activeDefinition = getMetricExplorerDefinition(definitions);
  const results = getMetricExplorerResults(activeDefinition);
  const continentResults = getMetricExplorerResults(activeDefinition, "continents");
  const countryResults = getMetricExplorerResults(activeDefinition, "countries");
  const topN = getMetricExplorerTopN();
  const scopeMode = getMetricExplorerScopeMode();
  const scopeLabel = getMetricExplorerScopeLabel();
  const scatterXDefinition = getMetricExplorerDefinitionByKey(definitions, state.metricExplorerScatterXKey);
  const scatterYDefinition = getMetricExplorerDefinitionByKey(definitions, state.metricExplorerScatterYKey);
  const scatterSizeDefinition = getMetricExplorerDefinitionByKey(definitions, state.metricExplorerScatterSizeKey);

  const shell = document.createElement("div");
  shell.className = "metric-explorer-shell";
  shell.appendChild(buildMetricExplorerControls(definitions, visibleDefinitions, activeDefinition));

  const summary = document.createElement("div");
  summary.className = "metric-explorer-summary";
  summary.append(
    createMetricExplorerSummaryCard(
      "대분류",
      categoryMeta.label,
      `${displayModeMeta.label} · ${scopeLabel}`,
    ),
    createMetricExplorerSummaryCard(
      "활성 지표",
      activeDefinition.label,
      `${state.metricExplorerGrouping === "continents" ? "대륙 집계" : "국가 비교"} · 사용 가능 지표 ${visibleDefinitions.length}개`,
    ),
    createMetricExplorerSummaryCard(
      "지도 강조",
      state.metricExplorerMapHighlightEnabled ? `상위 ${topN}개 표시` : "꺼짐",
      state.metricExplorerMapHighlightEnabled
        ? state.metricExplorerGrouping === "continents"
          ? "상위 대륙 국가 전체 색칠"
          : "상위 국가만 색칠"
        : "옵션을 켜면 지도에서만 강조",
    ),
    createMetricExplorerSummaryCard(
      "비교 대상",
      `${results.length}개`,
      scopeMode === "selected"
        ? state.metricExplorerGrouping === "continents"
          ? "선택 국가를 대륙 기준으로 묶은 결과"
          : "선택 국가 중 비교 가능한 결과 수"
        : state.metricExplorerGrouping === "continents"
          ? "대륙 집계 결과 수"
          : "국가별 집계 결과 수",
    ),
    createMetricExplorerSummaryCard("그래프 제작", displayModeMeta.label, categoryMeta.description),
  );
  shell.appendChild(summary);

  if (!results.length) {
    shell.appendChild(createEmptyState("선택한 지표로 정렬할 수 있는 국가 통계가 아직 없습니다."));
    elements.metricExplorerPanel.appendChild(shell);
    return;
  }

  const chartGrid = document.createElement("div");
  chartGrid.className = "metric-explorer-grid";
  if (state.metricExplorerDisplayMode === "scatter") {
    chartGrid.append(
      buildScatterChartCard({
        title: scopeMode === "selected" ? "선택 국가 산포도" : "전 세계 산포도",
        description: `${scatterXDefinition.label} · ${scatterYDefinition.label} · 버블 ${scatterSizeDefinition.label}`,
        entries: getMetricExplorerScatterEntries(
          scatterXDefinition,
          scatterYDefinition,
          scatterSizeDefinition,
          state.metricExplorerGrouping,
        ),
        xLabel: scatterXDefinition.label,
        yLabel: scatterYDefinition.label,
        xFormatter: scatterXDefinition.formatter,
        yFormatter: scatterYDefinition.formatter,
        sizeFormatter: scatterSizeDefinition.formatter,
      }),
      buildMetricExplorerTable({
        title: "비교표",
        description: "현재 선택한 축 기준으로 비교할 수 있는 항목입니다.",
        entries: results.slice(0, topN),
        valueFormatter: activeDefinition.formatter,
      }),
    );
  } else {
    chartGrid.append(
      buildAmountBarChartCard({
        title:
          state.metricExplorerGrouping === "continents"
            ? scopeMode === "selected"
              ? "선택 국가의 대륙 묶음"
              : `상위 ${topN}개 대륙`
            : scopeMode === "selected"
              ? "선택 국가 비교"
              : `상위 ${topN}개 국가`,
        description:
          state.metricExplorerGrouping === "continents"
            ? scopeMode === "selected"
              ? "선택한 국가들을 대륙 기준으로 묶어 정리했습니다."
              : "선택한 지표를 대륙별로 묶어 정렬한 결과입니다."
            : scopeMode === "selected"
              ? "현재 선택한 국가들을 같은 눈금에서 비교합니다."
              : "지도를 함께 보면서 상위 국가를 빠르게 확인할 수 있습니다.",
        entries: results.slice(0, topN).map((entry, index) => ({
          label: scopeMode === "selected" ? entry.label : `${index + 1}위 · ${entry.label}`,
          value: entry.value,
          detail: entry.detail,
          color: metricExplorerRankPalette[index] ?? metricExplorerRankPalette[metricExplorerRankPalette.length - 1],
        })),
        valueFormatter: activeDefinition.formatter,
      }),
      buildRelativeRankingCard(results, activeDefinition, topN),
    );

    if (state.metricExplorerDisplayMode === "overview") {
      chartGrid.append(
        buildAmountBarChartCard({
          title:
            state.metricExplorerGrouping === "continents"
              ? scopeMode === "selected"
                ? "선택 국가 개별값"
                : "상위 국가 미리보기"
              : "대륙별 비교",
          description:
            state.metricExplorerGrouping === "continents"
              ? scopeMode === "selected"
                ? "같은 지표를 다시 선택 국가 단위로 펼쳐 봅니다."
                : "같은 지표로 다시 국가 단위 상위권도 같이 봅니다."
              : `${activeDefinition.aggregation === "mean" ? "대륙 평균" : "대륙 합계"} 기준으로 묶었습니다.`,
          entries: (state.metricExplorerGrouping === "continents" ? countryResults : continentResults)
            .slice(0, state.metricExplorerGrouping === "continents" ? topN : 8)
            .map((entry, index) => ({
              label: entry.label,
              value: entry.value,
              detail: entry.detail,
              color: metricExplorerRankPalette[index] ?? metricExplorerRankPalette[metricExplorerRankPalette.length - 1],
            })),
          valueFormatter: activeDefinition.formatter,
        }),
        buildMetricExplorerTable({
          title: state.metricExplorerGrouping === "continents" ? "대륙 순위표" : "국가 순위표",
          description: "값, 최신 기준연도, 보조 메모를 함께 보여줍니다.",
          entries: results.slice(0, topN),
          valueFormatter: activeDefinition.formatter,
        }),
      );
    } else {
      chartGrid.append(
        buildMetricExplorerTable({
          title: scopeMode === "selected" ? "선택 국가 비교표" : "국가 순위표",
          description: "그래프를 만들 때 바로 옮겨 적기 쉬운 값 표입니다.",
          entries: results.slice(0, topN),
          valueFormatter: activeDefinition.formatter,
        }),
      );
    }
  }

  shell.appendChild(chartGrid);
  elements.metricExplorerPanel.appendChild(shell);
}

function getKoreaGeoStatsLevelKey(level = state.koreaLevel) {
  if (level === "provinces") {
    return "provinces";
  }
  if (level === "cities") {
    return "cities";
  }
  return "";
}

function getKoreaGeoStatsLevelLabel(levelKey = getKoreaGeoStatsLevelKey()) {
  return (
    koreaGeoStatsMeta?.levels?.[levelKey] ??
    (levelKey === "cities" ? "시/군" : levelKey === "provinces" ? "도/광역시" : "권역")
  );
}

function getKoreaGeoStatsRegionNoun(levelKey = getKoreaGeoStatsLevelKey(), compact = false) {
  if (levelKey === "cities") {
    return compact ? "시군" : "시·군";
  }
  return "시도";
}

function getKoreaGeoStatsRegionOrder(levelKey = getKoreaGeoStatsLevelKey()) {
  return koreaGeoStatsRegionOrderByLevel[levelKey] ?? [];
}

function getKoreaGeoStatsRegions(levelKey = getKoreaGeoStatsLevelKey()) {
  return koreaGeoStatsRegionsByLevel[levelKey] ?? {};
}

function getKoreaGeoStatsMetrics(levelKey = getKoreaGeoStatsLevelKey()) {
  return koreaGeoStatsMetricsByLevel[levelKey] ?? {};
}

function getKoreaGeoStatsDefinitions(levelKey = getKoreaGeoStatsLevelKey()) {
  return Object.values(getKoreaGeoStatsMetrics(levelKey));
}

function getKoreaGeoStatsCategoryMeta(categoryKey = state.koreaGeoStatsCategoryKey) {
  return (
    koreaGeoStatsCategoryDefinitions.find((category) => category.key === categoryKey) ??
    koreaGeoStatsCategoryDefinitions[0]
  );
}

function getKoreaGeoStatsDisplayModeMeta(modeKey = state.koreaGeoStatsDisplayMode) {
  return (
    koreaGeoStatsDisplayModeDefinitions.find((mode) => mode.key === modeKey) ??
    koreaGeoStatsDisplayModeDefinitions[0]
  );
}

function getKoreaGeoStatsDefinitionsByCategory(
  definitions = getKoreaGeoStatsDefinitions(),
  categoryKey = state.koreaGeoStatsCategoryKey,
) {
  return definitions.filter((definition) => definition.category === categoryKey);
}

function getKoreaGeoStatsMaxCount(levelKey = getKoreaGeoStatsLevelKey()) {
  return Math.max(1, getKoreaGeoStatsRegionOrder(levelKey).length || 1);
}

function getKoreaGeoStatsTopN(levelKey = getKoreaGeoStatsLevelKey()) {
  return clamp(Math.round(Number(state.koreaGeoStatsTopN) || 10), 1, getKoreaGeoStatsMaxCount(levelKey));
}

function getKoreaGeoStatsDefinition(definitions = getKoreaGeoStatsDefinitions()) {
  return definitions.find((definition) => definition.key === state.koreaGeoStatsMetricKey) ?? definitions[0];
}

function ensureKoreaGeoStatsState(definitions = getKoreaGeoStatsDefinitions()) {
  const availableCategories = koreaGeoStatsCategoryDefinitions.filter((category) =>
    definitions.some((definition) => definition.category === category.key),
  );
  if (!availableCategories.length) {
    state.koreaGeoStatsCategoryKey = koreaGeoStatsCategoryDefinitions[0]?.key ?? "demography";
    return;
  }

  if (!availableCategories.some((category) => category.key === state.koreaGeoStatsCategoryKey)) {
    state.koreaGeoStatsCategoryKey = availableCategories[0].key;
  }

  const categoryDefinitions = getKoreaGeoStatsDefinitionsByCategory(definitions, state.koreaGeoStatsCategoryKey);
  if (!categoryDefinitions.length) {
    state.koreaGeoStatsMetricKey = availableCategories[0]?.key ?? "demography";
    return;
  }

  if (!categoryDefinitions.some((definition) => definition.key === state.koreaGeoStatsMetricKey)) {
    state.koreaGeoStatsMetricKey = categoryDefinitions[0].key;
  }

  if (!koreaGeoStatsDisplayModeDefinitions.some((mode) => mode.key === state.koreaGeoStatsDisplayMode)) {
    state.koreaGeoStatsDisplayMode = "overview";
  }

  const activeDefinition = getKoreaGeoStatsDefinition(definitions);
  if (state.koreaGeoStatsDisplayMode === "relative" && !activeDefinition?.allowRelative) {
    const relativeFallback = categoryDefinitions.find((definition) => definition.allowRelative);
    if (relativeFallback) {
      state.koreaGeoStatsMetricKey = relativeFallback.key;
    } else {
      state.koreaGeoStatsDisplayMode = "overview";
    }
  }

  const scatterFallbacks = categoryDefinitions.map((definition) => definition.key);
  if (!scatterFallbacks.includes(state.koreaGeoStatsScatterXKey)) {
    state.koreaGeoStatsScatterXKey = scatterFallbacks[0] ?? state.koreaGeoStatsMetricKey;
  }
  if (!scatterFallbacks.includes(state.koreaGeoStatsScatterYKey)) {
    state.koreaGeoStatsScatterYKey = scatterFallbacks[1] ?? scatterFallbacks[0] ?? state.koreaGeoStatsMetricKey;
  }
  if (!scatterFallbacks.includes(state.koreaGeoStatsScatterSizeKey)) {
    state.koreaGeoStatsScatterSizeKey = scatterFallbacks[2] ?? scatterFallbacks[0] ?? state.koreaGeoStatsMetricKey;
  }
}

function getKoreaGeoStatsProvinceShortLabel(code) {
  return getKoreaGeoStatsRegions("provinces")[code]?.shortLabel ?? getKoreaProvinceName(code);
}

function formatKoreaGeoStatsRegionLabel(regionId, levelKey = getKoreaGeoStatsLevelKey(), { includeParent } = {}) {
  const regions = getKoreaGeoStatsRegions(levelKey);
  const region = regions[regionId];
  if (!region) {
    return regionId;
  }

  const shouldIncludeParent = includeParent ?? levelKey === "cities";
  if (levelKey === "cities" && shouldIncludeParent && region.parentCode) {
    return `${getKoreaGeoStatsProvinceShortLabel(region.parentCode)} · ${region.shortLabel ?? region.label ?? regionId}`;
  }

  return region.shortLabel ?? region.label ?? regionId;
}

function getKoreaGeoStatsSelectedRegions(levelKey = getKoreaGeoStatsLevelKey()) {
  const regions = getKoreaGeoStatsRegions(levelKey);
  if (levelKey === "cities") {
    return state.koreaSelectedCities.filter((region) => regions[region.id]);
  }
  if (levelKey === "provinces") {
    return state.koreaSelectedProvinces.filter((region) => regions[region.id]);
  }
  return [];
}

function getKoreaGeoStatsScopeMode(levelKey = getKoreaGeoStatsLevelKey()) {
  return getKoreaGeoStatsSelectedRegions(levelKey).length ? "selected" : "all";
}

function getKoreaGeoStatsScopeRegionIds(levelKey = getKoreaGeoStatsLevelKey()) {
  const regions = getKoreaGeoStatsRegions(levelKey);
  const selectedRegions = getKoreaGeoStatsSelectedRegions(levelKey);
  if (selectedRegions.length) {
    return selectedRegions.map((region) => region.id).filter((regionId) => regions[regionId]);
  }

  const regionOrder = getKoreaGeoStatsRegionOrder(levelKey).filter((regionId) => regions[regionId]);
  if (levelKey === "cities" && state.koreaCityScopeCodes.length) {
    const scopeCodes = getKoreaCityScopeCodeSet();
    return regionOrder.filter((regionId) => scopeCodes.has(regions[regionId]?.parentCode));
  }
  return regionOrder;
}

function getKoreaGeoStatsScopeEntries(levelKey = getKoreaGeoStatsLevelKey()) {
  const regions = getKoreaGeoStatsRegions(levelKey);
  const selectedRegions = getKoreaGeoStatsSelectedRegions(levelKey);
  if (selectedRegions.length) {
    return selectedRegions.map((region) => ({
      id: region.id,
      label: formatKoreaGeoStatsRegionLabel(region.id, levelKey),
      fullLabel: regions[region.id]?.label ?? formatSelectionDisplayName(region),
      color: getSelectedCountryColor(region),
    }));
  }

  return getKoreaGeoStatsScopeRegionIds(levelKey).map((regionId, index) => ({
    id: regionId,
    label: formatKoreaGeoStatsRegionLabel(regionId, levelKey),
    fullLabel: regions[regionId]?.label ?? regionId,
    color: metricExplorerRankPalette[index] ?? metricExplorerRankPalette[metricExplorerRankPalette.length - 1],
  }));
}

function getKoreaGeoStatsScopeLabel(levelKey = getKoreaGeoStatsLevelKey()) {
  const noun = getKoreaGeoStatsRegionNoun(levelKey, true);
  const selectedCount = getKoreaGeoStatsSelectedRegions(levelKey).length;
  if (selectedCount) {
    return `선택 ${noun} ${selectedCount}곳`;
  }

  const scopeRegionIds = getKoreaGeoStatsScopeRegionIds(levelKey);
  if (levelKey === "cities" && state.koreaCityScopeCodes.length) {
    return `${getKoreaCityScopeLabel(state.koreaCityScopeCodes, { maxNames: 2 })} 범위 ${noun} ${scopeRegionIds.length}곳`;
  }
  return `전국 ${noun} ${scopeRegionIds.length}곳`;
}

function getKoreaGeoStatsScopeDescription(levelKey = getKoreaGeoStatsLevelKey()) {
  const levelLabel = getKoreaGeoStatsLevelLabel(levelKey);
  if (getKoreaGeoStatsScopeMode(levelKey) === "selected") {
    return `선택 ${getKoreaGeoStatsRegionNoun(levelKey)}만 비교합니다.`;
  }
  if (levelKey === "cities" && state.koreaCityScopeCodes.length) {
    return `${getKoreaCityScopeLabel(state.koreaCityScopeCodes, { maxNames: 2 })} 범위의 ${getKoreaGeoStatsRegionNoun(levelKey)}만 비교합니다.`;
  }
  return `선택이 없으면 전국 ${getKoreaGeoStatsRegionOrder(levelKey).length}개 ${levelLabel}를 비교합니다.`;
}

function compareMetricLabels(a, b) {
  return koreaNameCollator.compare(String(a), String(b));
}

function getKoreaGeoStatsLatestEntries(definition = getKoreaGeoStatsDefinition(), levelKey = getKoreaGeoStatsLevelKey()) {
  return getKoreaGeoStatsScopeEntries(levelKey)
    .map((entry) => {
      const latest = definition?.latestByRegion?.[entry.id];
      if (!latest || !Number.isFinite(Number(latest.value))) {
        return null;
      }
      return {
        id: entry.id,
        label: entry.label,
        fullLabel: entry.fullLabel,
        color: entry.color,
        value: Number(latest.value),
        periodKey: latest.periodKey ?? "",
        periodLabel: latest.periodLabel ?? latest.periodKey ?? "",
        detail: definition.unit ? `${latest.periodLabel} · ${definition.unit}` : latest.periodLabel ?? "최신 시점",
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.value) - Number(a.value) || compareMetricLabels(a.label, b.label));
}

function parseKoreaGeoStatsPeriodKey(periodKey) {
  return Number.parseInt(String(periodKey ?? "").replace(/\D/g, ""), 10) || 0;
}

function getKoreaGeoStatsTrendSeries(
  definition,
  latestEntries = getKoreaGeoStatsLatestEntries(definition),
  levelKey = getKoreaGeoStatsLevelKey(),
) {
  const selectedRegions = getKoreaGeoStatsSelectedRegions(levelKey);
  const targetRegions = selectedRegions.length
    ? selectedRegions.map((region) => ({
        id: region.id,
        label: formatKoreaGeoStatsRegionLabel(region.id, levelKey),
        color: getSelectedCountryColor(region),
      }))
    : latestEntries.slice(0, 4).map((entry, index) => ({
        id: entry.id,
        label: entry.label,
        color: metricExplorerRankPalette[index] ?? metricExplorerRankPalette[metricExplorerRankPalette.length - 1],
      }));

  return targetRegions
    .map((region) => ({
      label: region.label,
      color: region.color,
      points: (definition?.seriesByRegion?.[region.id] ?? [])
        .map((point) => ({
          periodKey: point.periodKey,
          periodLabel: point.periodLabel,
          value: Number(point.value),
        }))
        .filter((point) => Number.isFinite(point.value))
        .sort((a, b) => parseKoreaGeoStatsPeriodKey(a.periodKey) - parseKoreaGeoStatsPeriodKey(b.periodKey)),
    }))
    .filter((entry) => entry.points.length >= 2);
}

function getKoreaGeoStatsDominantPeriodLabel(entries = []) {
  const counts = new Map();
  entries.forEach((entry) => {
    if (!entry?.periodLabel) {
      return;
    }
    counts.set(entry.periodLabel, (counts.get(entry.periodLabel) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || compareMetricLabels(a[0], b[0]))[0]?.[0] ?? "최신 시점";
}

function formatKoreaGeoStatsValue(definition, value) {
  if (definition?.formatter === "percent") {
    return formatPercent(value);
  }

  const digits = Number.isFinite(Number(definition?.decimals)) ? Number(definition.decimals) : 0;
  const formattedNumber = formatStatNumber(value, digits);
  return definition?.unit ? `${formattedNumber} ${definition.unit}` : formattedNumber;
}

function formatKoreaGeoStatsCompactValue(definition, value) {
  if (definition?.formatter === "percent") {
    return formatPercent(value);
  }

  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  const numericValue = Number(value);
  if (Math.abs(numericValue) >= 10_000) {
    return formatCompactStatNumber(numericValue, 1);
  }

  const digits = Number.isFinite(Number(definition?.decimals)) ? Number(definition.decimals) : 0;
  return formatStatNumber(numericValue, digits);
}

function getKoreaGeoStatsScatterEntries(
  xDefinition,
  yDefinition,
  sizeDefinition,
  levelKey = getKoreaGeoStatsLevelKey(),
) {
  const scopeIds = getKoreaGeoStatsScopeEntries(levelKey).map((entry) => entry.id);
  return getKoreaGeoStatsScatterEntriesForRegionIds(xDefinition, yDefinition, sizeDefinition, scopeIds, levelKey);
}

function getKoreaGeoStatsBaseScopeRegionIds(levelKey = getKoreaGeoStatsLevelKey()) {
  const regions = getKoreaGeoStatsRegions(levelKey);
  const regionOrder = getKoreaGeoStatsRegionOrder(levelKey).filter((regionId) => regions[regionId]);
  if (levelKey === "cities" && state.koreaCityScopeCodes.length) {
    const scopeCodes = getKoreaCityScopeCodeSet();
    return regionOrder.filter((regionId) => scopeCodes.has(regions[regionId]?.parentCode));
  }
  return regionOrder;
}

function getKoreaGeoStatsFeatureById(regionId, levelKey = getKoreaGeoStatsLevelKey()) {
  if (levelKey === "provinces") {
    return koreaDatasets.provinces.featureById.get(regionId) ?? null;
  }
  if (levelKey === "cities") {
    return koreaCityFeatureById.get(regionId) ?? null;
  }
  return koreaDatasets.metroDistricts.featureById.get(regionId) ?? null;
}

function getKoreaGeoStatsRecommendedSelectionCount(levelKey = getKoreaGeoStatsLevelKey()) {
  const regionCount = getKoreaGeoStatsBaseScopeRegionIds(levelKey).length;
  if (regionCount <= 0) {
    return 0;
  }
  return Math.min(levelKey === "cities" ? 5 : 4, regionCount);
}

function getKoreaGeoStatsLatestEntriesForRegionIds(
  definition,
  regionIds,
  levelKey = getKoreaGeoStatsLevelKey(),
) {
  const regions = getKoreaGeoStatsRegions(levelKey);
  return (regionIds ?? [])
    .map((regionId) => {
      const latest = definition?.latestByRegion?.[regionId];
      if (!latest || !Number.isFinite(Number(latest.value))) {
        return null;
      }
      return {
        id: regionId,
        label: formatKoreaGeoStatsRegionLabel(regionId, levelKey),
        value: Number(latest.value),
        parentCode: regions[regionId]?.parentCode ?? "",
        periodKey: latest.periodKey ?? "",
        periodLabel: latest.periodLabel ?? latest.periodKey ?? "",
        detail: definition?.unit ? `${latest.periodLabel} · ${definition.unit}` : latest.periodLabel ?? "최신 시점",
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.value) - Number(a.value) || compareMetricLabels(a.label, b.label));
}

function getKoreaGeoStatsTrendSeriesForRegionIds(
  definition,
  regionIds,
  levelKey = getKoreaGeoStatsLevelKey(),
) {
  const regions = getKoreaGeoStatsRegions(levelKey);
  return (regionIds ?? [])
    .map((regionId) => ({
      id: regionId,
      label: formatKoreaGeoStatsRegionLabel(regionId, levelKey),
      parentCode: regions[regionId]?.parentCode ?? "",
      points: (definition?.seriesByRegion?.[regionId] ?? [])
        .map((point) => ({
          periodKey: point.periodKey,
          periodLabel: point.periodLabel ?? point.periodKey,
          value: Number(point.value),
        }))
        .filter((point) => point.periodKey && Number.isFinite(point.value))
        .sort((a, b) => parseKoreaGeoStatsPeriodKey(a.periodKey) - parseKoreaGeoStatsPeriodKey(b.periodKey)),
    }))
    .filter((entry) => entry.points.length >= 2);
}

function getKoreaGeoStatsScatterEntriesForRegionIds(
  xDefinition,
  yDefinition,
  sizeDefinition,
  regionIds,
  levelKey = getKoreaGeoStatsLevelKey(),
) {
  const regions = getKoreaGeoStatsRegions(levelKey);
  return [...new Set(regionIds ?? [])]
    .map((regionId) => {
      const xRow = xDefinition?.latestByRegion?.[regionId];
      const yRow = yDefinition?.latestByRegion?.[regionId];
      const sizeRow = sizeDefinition?.latestByRegion?.[regionId];
      if (!xRow || !yRow || !sizeRow) {
        return null;
      }

      const xValue = Number(xRow.value);
      const yValue = Number(yRow.value);
      const sizeValue = Math.abs(Number(sizeRow.value));
      if (!Number.isFinite(xValue) || !Number.isFinite(yValue) || !Number.isFinite(sizeValue)) {
        return null;
      }

      return {
        id: regionId,
        label: formatKoreaGeoStatsRegionLabel(regionId, levelKey),
        parentCode: regions[regionId]?.parentCode ?? "",
        xValue,
        yValue,
        sizeValue,
        sizeDisplayValue: Number(sizeRow.value),
        detail: [xRow.periodLabel, yRow.periodLabel].filter(Boolean).join(" · ") || "최신 시점",
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.sizeValue) - Number(a.sizeValue) || compareMetricLabels(a.label, b.label));
}

function getKoreaGeoStatsDistributionScore(values = []) {
  const numericValues = (values ?? []).map(Number).filter((value) => Number.isFinite(value));
  if (numericValues.length < 2) {
    return 0;
  }
  const maximum = d3.max(numericValues) ?? 0;
  const minimum = d3.min(numericValues) ?? 0;
  const medianAbs = Math.abs(d3.median(numericValues) ?? 0);
  const meanAbs = d3.mean(numericValues, (value) => Math.abs(value)) ?? 0;
  return Math.abs(maximum - minimum) / Math.max(medianAbs, meanAbs, 1);
}

function computeKoreaGeoStatsCorrelation(valuesX = [], valuesY = []) {
  if (valuesX.length !== valuesY.length || valuesX.length < 2) {
    return NaN;
  }

  const meanX = d3.mean(valuesX) ?? 0;
  const meanY = d3.mean(valuesY) ?? 0;
  let numerator = 0;
  let varianceX = 0;
  let varianceY = 0;
  valuesX.forEach((valueX, index) => {
    const deltaX = Number(valueX) - meanX;
    const deltaY = Number(valuesY[index]) - meanY;
    numerator += deltaX * deltaY;
    varianceX += deltaX ** 2;
    varianceY += deltaY ** 2;
  });
  if (varianceX <= 0 || varianceY <= 0) {
    return NaN;
  }
  return numerator / Math.sqrt(varianceX * varianceY);
}

function getKoreaGeoStatsPreferredScatterBoost(levelKey, categoryKey, xKey, yKey, sizeKey) {
  return koreaGeoStatsPreferredScatterCombos.reduce((total, combo) => {
    const axisMatches =
      (combo.xKey === xKey && combo.yKey === yKey) || (combo.xKey === yKey && combo.yKey === xKey);
    if (!combo.levels.includes(levelKey) || combo.categoryKey !== categoryKey || combo.sizeKey !== sizeKey || !axisMatches) {
      return total;
    }
    return total + Number(combo.boost || 0);
  }, 0);
}

function scoreKoreaGeoStatsLatestCandidate(definition, entries, displayMode) {
  const values = entries.map((entry) => Number(entry.value));
  if (values.length < 3) {
    return 0;
  }

  let score = getKoreaGeoStatsDistributionScore(values) * 100 + values.length;
  if (definition?.canBeNegative && values.some((value) => value < 0) && values.some((value) => value > 0)) {
    score += 24;
  }
  if (definition?.formatter === "percent") {
    score += 8;
  }
  if (displayMode === "relative" && definition?.allowRelative) {
    score += 10;
  }
  score += koreaGeoStatsRandomMetricBoosts[definition?.key] ?? 0;
  return score;
}

function scoreKoreaGeoStatsTrendCandidate(series = []) {
  const scoredSeries = (series ?? [])
    .map((entry) => {
      const firstValue = Number(entry.points?.[0]?.value);
      const lastValue = Number(entry.points?.[entry.points.length - 1]?.value);
      const maximum = d3.max(entry.points, (point) => Number(point.value)) ?? 0;
      const minimum = d3.min(entry.points, (point) => Number(point.value)) ?? 0;
      const baseline = Math.max(Math.abs(firstValue), Math.abs(lastValue), 1);
      if (!Number.isFinite(firstValue) || !Number.isFinite(lastValue)) {
        return null;
      }
      return {
        changeRatio: Math.abs(lastValue - firstValue) / baseline,
        amplitudeRatio: Math.abs(maximum - minimum) / baseline,
      };
    })
    .filter(Boolean);

  if (!scoredSeries.length) {
    return 0;
  }

  return (d3.mean(scoredSeries, (entry) => entry.changeRatio) ?? 0) * 70 +
    (d3.mean(scoredSeries, (entry) => entry.amplitudeRatio) ?? 0) * 55 +
    scoredSeries.length;
}

function getKoreaGeoStatsMetricCandidates(
  definitions,
  displayMode = state.koreaGeoStatsDisplayMode,
  levelKey = getKoreaGeoStatsLevelKey(),
) {
  const baseScopeIds = getKoreaGeoStatsBaseScopeRegionIds(levelKey);
  if (!baseScopeIds.length) {
    return [];
  }

  if (displayMode === "scatter") {
    const definitionsByCategory = d3.group(definitions, (definition) => definition.category);
    const candidates = [];
    definitionsByCategory.forEach((categoryDefinitions, categoryKey) => {
      if (categoryDefinitions.length < 3) {
        return;
      }
      categoryDefinitions.forEach((xDefinition) => {
        categoryDefinitions.forEach((yDefinition) => {
          if (xDefinition.key === yDefinition.key) {
            return;
          }
          categoryDefinitions.forEach((sizeDefinition) => {
            if (
              sizeDefinition.key === xDefinition.key ||
              sizeDefinition.key === yDefinition.key ||
              sizeDefinition.canBeNegative
            ) {
              return;
            }
            const entries = getKoreaGeoStatsScatterEntriesForRegionIds(
              xDefinition,
              yDefinition,
              sizeDefinition,
              baseScopeIds,
              levelKey,
            );
            if (entries.length < 4) {
              return;
            }
            const xValues = entries.map((entry) => entry.xValue);
            const yValues = entries.map((entry) => entry.yValue);
            const sizeValues = entries.map((entry) => entry.sizeValue);
            const xMedian = d3.median(xValues) ?? 0;
            const yMedian = d3.median(yValues) ?? 0;
            const quadrantCount = new Set(
              entries.map((entry) => `${entry.xValue >= xMedian ? "right" : "left"}-${entry.yValue >= yMedian ? "top" : "bottom"}`),
            ).size;
            const correlation = computeKoreaGeoStatsCorrelation(xValues, yValues);
            let score =
              getKoreaGeoStatsDistributionScore(xValues) * 36 +
              getKoreaGeoStatsDistributionScore(yValues) * 36 +
              getKoreaGeoStatsDistributionScore(sizeValues) * 18 +
              quadrantCount * 8 +
              getKoreaGeoStatsPreferredScatterBoost(
                levelKey,
                categoryKey,
                xDefinition.key,
                yDefinition.key,
                sizeDefinition.key,
              );
            if (Number.isFinite(correlation)) {
              score += Math.max(0, 14 - Math.abs(Math.abs(correlation) - 0.55) * 18);
            }
            if (sizeDefinition.formatter === "percent") {
              score -= 8;
            }
            if (!Number.isFinite(score) || score <= 0) {
              return;
            }
            candidates.push({
              categoryKey,
              displayMode,
              score,
              xDefinition,
              yDefinition,
              sizeDefinition,
              label: `${xDefinition.label} × ${yDefinition.label}`,
            });
          });
        });
      });
    });
    return candidates.sort((a, b) => Number(b.score) - Number(a.score) || compareMetricLabels(a.label, b.label));
  }

  return (definitions ?? [])
    .map((definition) => {
      if (displayMode === "relative" && !definition.allowRelative) {
        return null;
      }

      const latestEntries = getKoreaGeoStatsLatestEntriesForRegionIds(definition, baseScopeIds, levelKey);
      if (!latestEntries.length) {
        return null;
      }

      let score = 0;
      if (displayMode === "trend") {
        const series = getKoreaGeoStatsTrendSeriesForRegionIds(definition, baseScopeIds, levelKey);
        score = scoreKoreaGeoStatsTrendCandidate(series) + (koreaGeoStatsRandomMetricBoosts[definition.key] ?? 0);
      } else if (displayMode === "overview") {
        const series = getKoreaGeoStatsTrendSeriesForRegionIds(definition, baseScopeIds, levelKey);
        score =
          scoreKoreaGeoStatsLatestCandidate(definition, latestEntries, displayMode) +
          scoreKoreaGeoStatsTrendCandidate(series) * 0.35;
      } else {
        score = scoreKoreaGeoStatsLatestCandidate(definition, latestEntries, displayMode);
      }

      if (!Number.isFinite(score) || score <= 0) {
        return null;
      }

      return {
        categoryKey: definition.category,
        displayMode,
        definition,
        score,
        label: definition.label,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.score) - Number(a.score) || compareMetricLabels(a.label, b.label));
}

function pickRandomKoreaGeoStatsCandidate(candidates = [], topCount = 6) {
  const shortlist = [...(candidates ?? [])]
    .sort((a, b) => Number(b.score) - Number(a.score) || compareMetricLabels(a.label, b.label))
    .slice(0, Math.min(topCount, candidates.length));
  return shuffleExamGraphItems(shortlist)[0] ?? null;
}

function selectKoreaGeoStatsRecommendedEntries(
  candidates = [],
  desiredCount = getKoreaGeoStatsRecommendedSelectionCount(),
  levelKey = getKoreaGeoStatsLevelKey(),
) {
  const uniqueCandidates = [];
  const seenIds = new Set();
  (candidates ?? []).forEach((candidate) => {
    if (!candidate?.id || seenIds.has(candidate.id) || !Number.isFinite(Number(candidate.score))) {
      return;
    }
    seenIds.add(candidate.id);
    uniqueCandidates.push(candidate);
  });

  if (!uniqueCandidates.length || desiredCount <= 0) {
    return [];
  }

  const pool = shuffleExamGraphItems(
    [...uniqueCandidates].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, Math.max(desiredCount * 4, 14)),
  );
  const selected = [];
  const usedIds = new Set();
  const usedParents = new Set();
  const usedGroups = new Set();

  const takeCandidates = (predicate) => {
    pool.forEach((candidate) => {
      if (selected.length >= desiredCount || usedIds.has(candidate.id) || !predicate(candidate)) {
        return;
      }
      selected.push(candidate);
      usedIds.add(candidate.id);
      if (candidate.parentCode) {
        usedParents.add(candidate.parentCode);
      }
      if (candidate.groupKey) {
        usedGroups.add(candidate.groupKey);
      }
    });
  };

  if (levelKey === "cities") {
    takeCandidates((candidate) => candidate.groupKey && candidate.parentCode && !usedGroups.has(candidate.groupKey) && !usedParents.has(candidate.parentCode));
  }
  takeCandidates((candidate) => candidate.groupKey && !usedGroups.has(candidate.groupKey));
  if (levelKey === "cities") {
    takeCandidates((candidate) => candidate.parentCode && !usedParents.has(candidate.parentCode));
  }
  takeCandidates(() => true);

  return selected.slice(0, desiredCount);
}

function getKoreaGeoStatsCandidateLabel(candidate) {
  if (candidate?.xDefinition && candidate?.yDefinition && candidate?.sizeDefinition) {
    return `${candidate.xDefinition.label} × ${candidate.yDefinition.label}`;
  }
  return candidate?.definition?.label ?? candidate?.label ?? "한국지리 통계";
}

function getKoreaGeoStatsRegionRecommendationForCandidate(
  candidate,
  levelKey = getKoreaGeoStatsLevelKey(),
) {
  const baseScopeIds = getKoreaGeoStatsBaseScopeRegionIds(levelKey);
  if (!baseScopeIds.length) {
    return null;
  }

  const displayMode = candidate?.displayMode ?? state.koreaGeoStatsDisplayMode;
  if (displayMode === "scatter") {
    const entries = getKoreaGeoStatsScatterEntriesForRegionIds(
      candidate?.xDefinition,
      candidate?.yDefinition,
      candidate?.sizeDefinition,
      baseScopeIds,
      levelKey,
    );
    if (!entries.length) {
      return null;
    }

    const xMedian = d3.median(entries, (entry) => Number(entry.xValue)) ?? 0;
    const yMedian = d3.median(entries, (entry) => Number(entry.yValue)) ?? 0;
    const xSpan = Math.max((d3.max(entries, (entry) => Number(entry.xValue)) ?? 0) - (d3.min(entries, (entry) => Number(entry.xValue)) ?? 0), 1);
    const ySpan = Math.max((d3.max(entries, (entry) => Number(entry.yValue)) ?? 0) - (d3.min(entries, (entry) => Number(entry.yValue)) ?? 0), 1);
    const maxBubble = d3.max(entries, (entry) => Number(entry.sizeValue)) || 1;
    const selected = selectKoreaGeoStatsRecommendedEntries(
      entries.map((entry) => ({
        id: entry.id,
        parentCode: entry.parentCode,
        score:
          (Number(entry.sizeValue) / maxBubble) * 70 +
          (Math.abs(Number(entry.xValue) - xMedian) / xSpan) * 20 +
          (Math.abs(Number(entry.yValue) - yMedian) / ySpan) * 20,
        groupKey: `${Number(entry.xValue) >= xMedian ? "right" : "left"}-${Number(entry.yValue) >= yMedian ? "top" : "bottom"}`,
      })),
      getKoreaGeoStatsRecommendedSelectionCount(levelKey),
      levelKey,
    );
    return {
      ids: selected.map((entry) => entry.id),
      label: `${candidate.xDefinition?.label ?? "X축"} × ${candidate.yDefinition?.label ?? "Y축"}`,
    };
  }

  const definition = candidate?.definition;
  if (!definition) {
    return null;
  }

  const buildLatestRecommendation = () => {
    const entries = getKoreaGeoStatsLatestEntriesForRegionIds(definition, baseScopeIds, levelKey);
    if (!entries.length) {
      return null;
    }
    const percentLike =
      definition.formatter === "percent" || entries.every((entry) => Number(entry.value) >= 0 && Number(entry.value) <= 100);
    const hasNegative =
      definition.canBeNegative || entries.some((entry) => Number(entry.value) < 0);
    const medianValue = d3.median(entries, (entry) => Number(entry.value)) ?? 0;
    const maxAbs = d3.max(entries, (entry) => Math.abs(Number(entry.value))) || 1;
    const selected = selectKoreaGeoStatsRecommendedEntries(
      entries.map((entry) => ({
        id: entry.id,
        parentCode: entry.parentCode,
        score: hasNegative
          ? Math.abs(Number(entry.value))
          : percentLike
            ? Math.abs(Number(entry.value) - medianValue) + (Math.abs(Number(entry.value)) / maxAbs) * 12
            : Number(entry.value),
        groupKey: hasNegative
          ? Number(entry.value) >= 0
            ? "plus"
            : "minus"
          : percentLike
            ? Number(entry.value) >= medianValue
              ? "high"
              : "low"
            : undefined,
      })),
      getKoreaGeoStatsRecommendedSelectionCount(levelKey),
      levelKey,
    );
    return {
      ids: selected.map((entry) => entry.id),
      label: definition.label,
    };
  };

  if (displayMode === "trend" || displayMode === "overview") {
    const series = getKoreaGeoStatsTrendSeriesForRegionIds(definition, baseScopeIds, levelKey);
    if (series.length) {
      const maxLevel = d3.max(series, (entry) => d3.max(entry.points, (point) => Math.abs(Number(point.value))) || 0) || 1;
      const selected = selectKoreaGeoStatsRecommendedEntries(
        series.map((entry) => {
          const firstValue = Number(entry.points?.[0]?.value) || 0;
          const lastValue = Number(entry.points?.[entry.points.length - 1]?.value) || 0;
          const amplitude =
            (d3.max(entry.points, (point) => Number(point.value)) || 0) -
            (d3.min(entry.points, (point) => Number(point.value)) || 0);
          const maximum = d3.max(entry.points, (point) => Math.abs(Number(point.value))) || 0;
          return {
            id: entry.id,
            parentCode: entry.parentCode,
            score: (maximum / maxLevel) * 60 + Math.abs(amplitude),
            groupKey: lastValue >= firstValue ? "up" : "down",
          };
        }),
        getKoreaGeoStatsRecommendedSelectionCount(levelKey),
        levelKey,
      );
      if (selected.length) {
        return {
          ids: selected.map((entry) => entry.id),
          label: `${definition.label} 추이`,
        };
      }
    }
  }

  return buildLatestRecommendation();
}

function getCurrentKoreaGeoStatsRegionRecommendation(levelKey = getKoreaGeoStatsLevelKey()) {
  const definitions = getKoreaGeoStatsDefinitions(levelKey);
  const candidate =
    state.koreaGeoStatsDisplayMode === "scatter"
      ? {
          displayMode: "scatter",
          categoryKey: state.koreaGeoStatsCategoryKey,
          xDefinition: definitions.find((definition) => definition.key === state.koreaGeoStatsScatterXKey),
          yDefinition: definitions.find((definition) => definition.key === state.koreaGeoStatsScatterYKey),
          sizeDefinition: definitions.find((definition) => definition.key === state.koreaGeoStatsScatterSizeKey),
        }
      : {
          displayMode: state.koreaGeoStatsDisplayMode,
          categoryKey: state.koreaGeoStatsCategoryKey,
          definition: getKoreaGeoStatsDefinition(definitions),
        };
  return getKoreaGeoStatsRegionRecommendationForCandidate(candidate, levelKey);
}

function commitKoreaGeoStatsScenario(
  { candidate = null, regionIds = null } = {},
  { historyLabel = "한국지리 통계 변경", statusText = "" } = {},
) {
  const levelKey = getKoreaGeoStatsLevelKey();
  if (!levelKey) {
    return false;
  }

  const definitions = getKoreaGeoStatsDefinitions(levelKey);
  beginHistoryStep(historyLabel);

  if (candidate) {
    state.koreaGeoStatsCategoryKey = candidate.categoryKey ?? state.koreaGeoStatsCategoryKey;
    state.koreaGeoStatsDisplayMode = candidate.displayMode ?? state.koreaGeoStatsDisplayMode;
    if (candidate.definition?.key) {
      state.koreaGeoStatsMetricKey = candidate.definition.key;
    }
    if (candidate.xDefinition?.key) {
      state.koreaGeoStatsScatterXKey = candidate.xDefinition.key;
      state.koreaGeoStatsMetricKey = candidate.xDefinition.key;
    }
    if (candidate.yDefinition?.key) {
      state.koreaGeoStatsScatterYKey = candidate.yDefinition.key;
    }
    if (candidate.sizeDefinition?.key) {
      state.koreaGeoStatsScatterSizeKey = candidate.sizeDefinition.key;
    }
    ensureKoreaGeoStatsState(definitions);
  }

  if (Array.isArray(regionIds)) {
    const nextSelection = regionIds
      .map((regionId) => getKoreaGeoStatsFeatureById(regionId, levelKey))
      .filter(Boolean)
      .map((feature, index) => createKoreaSelectionEntry(feature, nextPaletteColor(index)));
    setCurrentSelectionEntries(nextSelection);
    setCurrentKoreaComparedIds([]);
  }

  renderSelectionViews();
  if (Array.isArray(regionIds)) {
    syncKoreaControls();
    renderMap();
  }
  if (statusText) {
    setStatus(statusText);
  }
  return true;
}

function applyKoreaGeoStatsScopeReset() {
  const levelKey = getKoreaGeoStatsLevelKey();
  if (!levelKey) {
    return;
  }

  if (!getKoreaGeoStatsSelectedRegions(levelKey).length) {
    setStatus("이미 현재 범위 전체를 기준으로 비교하고 있습니다.");
    return;
  }

  const statusText =
    levelKey === "cities" && state.koreaCityScopeCodes.length
      ? `${getKoreaCityScopeLabel(state.koreaCityScopeCodes, { maxNames: 2 })} 범위 전체 비교로 되돌렸습니다.`
      : `전국 ${getKoreaGeoStatsRegionNoun(levelKey, true)} 전체 비교로 되돌렸습니다.`;
  commitKoreaGeoStatsScenario(
    { regionIds: [] },
    { historyLabel: "한국지리 통계 범위 초기화", statusText },
  );
}

function applyKoreaGeoStatsRandomRegions() {
  const levelKey = getKoreaGeoStatsLevelKey();
  if (!levelKey) {
    return;
  }

  const recommendation = getCurrentKoreaGeoStatsRegionRecommendation(levelKey);
  if (!recommendation?.ids?.length) {
    setStatus("추천할 지역 조합을 찾지 못했습니다. 다른 지표나 보기 모드를 골라 보세요.");
    return;
  }

  commitKoreaGeoStatsScenario(
    { regionIds: recommendation.ids },
    {
      historyLabel: "한국지리 지역 추천",
      statusText: `추천 지역을 비교 범위에 반영했습니다. (${recommendation.label} · ${recommendation.ids.length}곳)`,
    },
  );
}

function applyKoreaGeoStatsRandomMetric() {
  const levelKey = getKoreaGeoStatsLevelKey();
  if (!levelKey) {
    return;
  }

  const definitions = getKoreaGeoStatsDefinitions(levelKey);
  const currentCategoryDefinitions = getKoreaGeoStatsDefinitionsByCategory(definitions, state.koreaGeoStatsCategoryKey);
  const preferredCandidate = pickRandomKoreaGeoStatsCandidate(
    getKoreaGeoStatsMetricCandidates(currentCategoryDefinitions, state.koreaGeoStatsDisplayMode, levelKey),
  );
  const fallbackCandidate =
    preferredCandidate ??
    pickRandomKoreaGeoStatsCandidate(getKoreaGeoStatsMetricCandidates(definitions, state.koreaGeoStatsDisplayMode, levelKey));

  if (!fallbackCandidate) {
    setStatus("랜덤 추천에 쓸 한국지리 통계를 찾지 못했습니다.");
    return;
  }

  const displayModeLabel = getKoreaGeoStatsDisplayModeMeta(fallbackCandidate.displayMode).label;
  const metricLabel = getKoreaGeoStatsCandidateLabel(fallbackCandidate);
  const statusText =
    fallbackCandidate.displayMode === "scatter"
      ? `${displayModeLabel} 축을 ${metricLabel} · 크기 ${fallbackCandidate.sizeDefinition?.label ?? ""} 조합으로 바꿨습니다.`
      : `${displayModeLabel} 지표를 ${metricLabel}로 바꿨습니다.`;

  commitKoreaGeoStatsScenario(
    { candidate: fallbackCandidate },
    { historyLabel: "한국지리 통계 추천", statusText },
  );
}

function getKoreaGeoStatsRandomScenarioCandidates(levelKey = getKoreaGeoStatsLevelKey()) {
  const definitions = getKoreaGeoStatsDefinitions(levelKey);
  const scenarioCandidates = [];
  ["overview", "latest", "relative", "trend", "scatter"].forEach((displayMode) => {
    const candidates = getKoreaGeoStatsMetricCandidates(definitions, displayMode, levelKey);
    const candidatesByCategory = d3.group(candidates, (candidate) => candidate.categoryKey);
    candidatesByCategory.forEach((groupCandidates) => {
      scenarioCandidates.push(...groupCandidates.slice(0, displayMode === "scatter" ? 2 : 2));
    });
  });
  return scenarioCandidates.sort((a, b) => Number(b.score) - Number(a.score) || compareMetricLabels(a.label, b.label));
}

function applyKoreaGeoStatsRandomScenario() {
  const levelKey = getKoreaGeoStatsLevelKey();
  if (!levelKey) {
    return;
  }

  const scenarioPool = shuffleExamGraphItems(getKoreaGeoStatsRandomScenarioCandidates(levelKey));
  let appliedCandidate = null;
  let recommendation = null;

  scenarioPool.some((candidate) => {
    const nextRecommendation = getKoreaGeoStatsRegionRecommendationForCandidate(candidate, levelKey);
    if (!nextRecommendation?.ids?.length) {
      return false;
    }
    appliedCandidate = candidate;
    recommendation = nextRecommendation;
    return true;
  });

  if (!appliedCandidate || !recommendation?.ids?.length) {
    setStatus("랜덤 추천에 쓸 한국지리 세트 조합을 찾지 못했습니다.");
    return;
  }

  const categoryLabel = getKoreaGeoStatsCategoryMeta(appliedCandidate.categoryKey).label;
  const displayModeLabel = getKoreaGeoStatsDisplayModeMeta(appliedCandidate.displayMode).label;
  commitKoreaGeoStatsScenario(
    {
      candidate: appliedCandidate,
      regionIds: recommendation.ids,
    },
    {
      historyLabel: "한국지리 세트 추천",
      statusText: `세트 랜덤을 적용했습니다. (${categoryLabel} · ${displayModeLabel} · ${recommendation.label} · ${recommendation.ids.length}곳)`,
    },
  );
}

function getKoreaGeoStatsGuideText(levelKey = getKoreaGeoStatsLevelKey()) {
  const regionNoun = getKoreaGeoStatsRegionNoun(levelKey);
  const compactRegionNoun = getKoreaGeoStatsRegionNoun(levelKey, true);
  if (getKoreaGeoStatsScopeMode(levelKey) === "selected") {
    return `선택한 ${regionNoun}만 같은 축으로 비교합니다. 필요하면 랜덤 버튼으로 추천 ${compactRegionNoun} 조합이나 지표를 바로 바꿔 볼 수 있습니다.`;
  }
  if (levelKey === "cities" && state.koreaCityScopeCodes.length) {
    return `${getKoreaCityScopeLabel(state.koreaCityScopeCodes, { maxNames: 2 })} 범위 ${regionNoun}을 같은 축으로 묶어 비교합니다. 세트 랜덤은 이 범위 안에서 출제용 조합을 다시 골라 줍니다.`;
  }
  return `선택이 없으면 전국 ${getKoreaGeoStatsRegionOrder(levelKey).length}개 ${compactRegionNoun}를 같은 축으로 펼쳐 시험형 비교 자료처럼 정리합니다. 랜덤 버튼은 출제 포인트가 살아 있는 지역·지표 조합을 추천합니다.`;
}

function buildTimelineLineChartCard({ title, description, series, valueFormatter }) {
  const card = buildChartCardShell(title, description);
  const validSeries = (series ?? [])
    .map((entry) => ({
      ...entry,
      points: (entry.points ?? [])
        .filter((point) => point?.periodKey && Number.isFinite(Number(point.value)))
        .sort((a, b) => parseKoreaGeoStatsPeriodKey(a.periodKey) - parseKoreaGeoStatsPeriodKey(b.periodKey)),
    }))
    .filter((entry) => entry.points.length >= 2);

  if (!validSeries.length) {
    card.appendChild(createCountryStatsUnavailable("표시할 시계열 그래프가 없습니다."));
    return card;
  }

  const periods = [...new Set(validSeries.flatMap((entry) => entry.points.map((point) => point.periodKey)))].sort(
    (a, b) => parseKoreaGeoStatsPeriodKey(a) - parseKoreaGeoStatsPeriodKey(b),
  );
  const periodLabelByKey = new Map(
    validSeries.flatMap((entry) => entry.points.map((point) => [point.periodKey, point.periodLabel ?? point.periodKey])),
  );
  const values = validSeries.flatMap((entry) => entry.points.map((point) => Number(point.value)));
  let minimumValue = Math.min(...values);
  let maximumValue = Math.max(...values);
  if (minimumValue === maximumValue) {
    minimumValue -= 1;
    maximumValue += 1;
  }

  const width = 340;
  const height = 192;
  const plot = { left: 24, right: 12, top: 16, bottom: 28 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const step = periods.length > 1 ? plotWidth / (periods.length - 1) : 0;

  const periodToX = new Map(periods.map((period, index) => [period, plot.left + step * index]));
  const valueToY = (value) => plot.top + (maximumValue - Number(value)) / (maximumValue - minimumValue) * plotHeight;

  const svg = createSvgElement("svg");
  svg.setAttribute("class", "country-stats-line-chart");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", title);

  for (let index = 0; index < 4; index += 1) {
    const y = plot.top + (plotHeight / 3) * index;
    const line = createSvgElement("line");
    line.setAttribute("x1", String(plot.left));
    line.setAttribute("x2", String(width - plot.right));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("class", "country-stats-line-chart__grid");
    svg.appendChild(line);
  }

  const axisTop = createSvgElement("text");
  axisTop.setAttribute("x", String(plot.left));
  axisTop.setAttribute("y", "11");
  axisTop.setAttribute("class", "country-stats-line-chart__label");
  axisTop.textContent = valueFormatter(maximumValue);
  svg.appendChild(axisTop);

  const axisBottom = createSvgElement("text");
  axisBottom.setAttribute("x", String(plot.left));
  axisBottom.setAttribute("y", String(height - 4));
  axisBottom.setAttribute("class", "country-stats-line-chart__label");
  axisBottom.textContent = valueFormatter(minimumValue);
  svg.appendChild(axisBottom);

  validSeries.forEach((entry, entryIndex) => {
    const visual = getCountryStatsVisual(entryIndex);
    const polyline = createSvgElement("polyline");
    polyline.setAttribute(
      "points",
      entry.points.map((point) => `${periodToX.get(point.periodKey)},${valueToY(point.value)}`).join(" "),
    );
    polyline.setAttribute("class", "country-stats-line-chart__path");
    polyline.setAttribute("stroke", visual.stroke || entry.color || "#111111");
    if (visual.dasharray) {
      polyline.setAttribute("stroke-dasharray", visual.dasharray);
    }
    svg.appendChild(polyline);

    entry.points.forEach((point) => {
      const dot = createSvgElement("circle");
      dot.setAttribute("cx", String(periodToX.get(point.periodKey)));
      dot.setAttribute("cy", String(valueToY(point.value)));
      dot.setAttribute("r", "3");
      dot.setAttribute("fill", visual.stroke || entry.color || "#111111");
      svg.appendChild(dot);
    });
  });

  const tickStep = periods.length > 7 ? Math.ceil(periods.length / 6) : 1;
  periods.forEach((period, index) => {
    if (index !== 0 && index !== periods.length - 1 && index % tickStep !== 0) {
      return;
    }
    const label = createSvgElement("text");
    label.setAttribute("x", String(periodToX.get(period)));
    label.setAttribute("y", String(height - 10));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "country-stats-line-chart__year");
    label.textContent = String(periodLabelByKey.get(period) ?? period);
    svg.appendChild(label);
  });

  card.appendChild(svg);

  const legend = document.createElement("div");
  legend.className = "country-stats-line-legend";
  validSeries.forEach((entry, entryIndex) => {
    const latestPoint = entry.points[entry.points.length - 1];
    const visual = getCountryStatsVisual(entryIndex);
    const item = document.createElement("div");
    item.className = "country-stats-line-legend__item";
    const swatch = document.createElement("span");
    swatch.className = "country-stats-line-legend__swatch";
    applyCountryStatsPatternStyle(swatch, visual);
    const label = document.createElement("span");
    label.textContent = `${entry.label} ${valueFormatter(latestPoint.value)}`;
    item.append(swatch, label);
    legend.appendChild(item);
  });
  card.appendChild(legend);

  return card;
}

function buildKoreaGeoStatsRelativeCard(
  results,
  definition,
  topN,
  levelKey = getKoreaGeoStatsLevelKey(),
) {
  const topResults = results.slice(0, topN);
  const maximumValue = Number(topResults[0]?.value) || 0;
  if (!(maximumValue > 0) || topResults.some((entry) => Number(entry.value) < 0)) {
    const card = buildChartCardShell("상댓값 100 비교", "최댓값 100 기준 비교가 어려운 지표입니다.");
    card.appendChild(createCountryStatsUnavailable("음수 또는 0 이하 값이 포함되어 상댓값 100 비교를 생략했습니다."));
    return card;
  }

  return buildAmountBarChartCard({
    title: "상댓값 100 비교",
    description:
      getKoreaGeoStatsScopeMode(levelKey) === "selected"
        ? `선택한 ${getKoreaGeoStatsRegionNoun(levelKey)} 중 최댓값을 100으로 놓고 상대 비교합니다.`
        : `전국 ${getKoreaGeoStatsRegionNoun(levelKey)} 중 최댓값을 100으로 놓고 상대 비교합니다.`,
    entries: topResults.map((entry, index) => ({
      label: entry.label,
      value: maximumValue > 0 ? (Number(entry.value) / maximumValue) * 100 : 0,
      detail: `${formatKoreaGeoStatsValue(definition, entry.value)} · ${entry.periodLabel}`,
      color: metricExplorerRankPalette[index] ?? metricExplorerRankPalette[metricExplorerRankPalette.length - 1],
    })),
    valueFormatter: (value) => formatRelativeIndex(value),
  });
}

function buildKoreaGeoStatsRegionMetricList(
  regionCode,
  definitions,
  categoryLabel,
  levelKey = getKoreaGeoStatsLevelKey(),
) {
  const regionLabel = formatKoreaGeoStatsRegionLabel(regionCode, levelKey);
  const rows = definitions
    .map((definition) => {
      const latest = definition?.latestByRegion?.[regionCode];
      if (!latest || !Number.isFinite(Number(latest.value))) {
        return null;
      }
      return {
        label: definition.label,
        value: formatKoreaGeoStatsValue(definition, latest.value),
        detail: `${latest.periodLabel}${definition.unit ? ` · ${definition.unit}` : ""}`,
      };
    })
    .filter(Boolean);

  return buildStatListCard({
    title: `${regionLabel} ${categoryLabel} 핵심 묶음`,
    description: "한 권역을 기준으로 같은 대분류의 최신 공식값을 표로 다시 묶었습니다.",
    rows,
  });
}

function buildKoreaGeoStatsAgeStructureCard(
  regionCode,
  metricsByKey = getKoreaGeoStatsMetrics(),
  levelKey = getKoreaGeoStatsLevelKey(),
) {
  const youthRow = metricsByKey["youth-population-share"]?.latestByRegion?.[regionCode];
  const workingRow = metricsByKey["working-age-population-share"]?.latestByRegion?.[regionCode];
  const elderlyRow = metricsByKey["elderly-share"]?.latestByRegion?.[regionCode];
  if (!youthRow || !workingRow || !elderlyRow) {
    return createCountryStatsUnavailable("인구 구조를 계산할 수 없습니다.");
  }

  const youth = Number(youthRow.value);
  const working = Number(workingRow.value);
  const elderly = Number(elderlyRow.value);
  return buildShareCompositionCard({
    title: `${formatKoreaGeoStatsRegionLabel(regionCode, levelKey)} 인구 구조`,
    description: "유소년층·생산연령층·고령층의 100% 구성비를 한눈에 비교합니다.",
    totalLabel: `${youthRow.periodLabel} 기준`,
    segments: [
      { label: "유소년층", share: youth, color: countryStatsChartColors.population },
      { label: "생산연령층", share: working, color: "#7d8792" },
      { label: "고령층", share: elderly, color: "#1f6aa5" },
    ],
  });
}

function buildKoreaGeoStatsCommuteStructureCard(
  regionCode,
  metricsByKey = getKoreaGeoStatsMetrics(),
  levelKey = getKoreaGeoStatsLevelKey(),
) {
  const localRow = metricsByKey["local-commute-share"]?.latestByRegion?.[regionCode];
  const outboundRow = metricsByKey["outbound-commute-share"]?.latestByRegion?.[regionCode];
  if (!localRow || !outboundRow) {
    return createCountryStatsUnavailable("통근 취업 구조를 계산할 수 없습니다.");
  }

  return buildShareCompositionCard({
    title: `${formatKoreaGeoStatsRegionLabel(regionCode, levelKey)} 통근 취업 구조`,
    description: "거주지 안에서 일하는 비율과 다른 시·군·구로 통근하는 비율을 함께 봅니다.",
    totalLabel: `${localRow.periodLabel} 기준`,
    segments: [
      { label: "거주지내 취업", share: Number(localRow.value), color: countryStatsChartColors.population },
      { label: "타지역 통근", share: Number(outboundRow.value), color: "#7d8792" },
    ],
  });
}

function buildKoreaGeoStatsEmploymentStructureCard(
  regionCode,
  metricsByKey = getKoreaGeoStatsMetrics(),
  levelKey = getKoreaGeoStatsLevelKey(),
) {
  const totalRow = metricsByKey["employees-total"]?.latestByRegion?.[regionCode];
  const manufacturingRow = metricsByKey["manufacturing-employees"]?.latestByRegion?.[regionCode];
  const serviceRow = metricsByKey["service-employees"]?.latestByRegion?.[regionCode];
  if (!totalRow || !manufacturingRow || !serviceRow) {
    return createCountryStatsUnavailable("산업 종사 구조를 계산할 수 없습니다.");
  }

  const total = Number(totalRow.value);
  const manufacturing = Number(manufacturingRow.value);
  const services = Number(serviceRow.value);
  const other = total - manufacturing - services;
  if (!(total > 0) || other < 0) {
    return createCountryStatsUnavailable("산업 종사 구조를 계산할 수 없습니다.");
  }

  return buildShareCompositionCard({
    title: `${formatKoreaGeoStatsRegionLabel(regionCode, levelKey)} 종사자 구조`,
    description: "전산업 종사자를 100으로 두고 제조업·서비스업·기타 업종 비중을 읽습니다.",
    totalLabel: `${totalRow.periodLabel} 기준 · 총 ${formatKoreaGeoStatsValue(metricsByKey["employees-total"], total)}`,
    segments: [
      {
        label: "제조업",
        share: (manufacturing / total) * 100,
        color: countryStatsChartColors.cattle,
        amountLabel: formatKoreaGeoStatsValue(metricsByKey["manufacturing-employees"], manufacturing),
      },
      {
        label: "서비스업",
        share: (services / total) * 100,
        color: countryStatsChartColors.urbanPopulation,
        amountLabel: formatKoreaGeoStatsValue(metricsByKey["service-employees"], services),
      },
      {
        label: "기타",
        share: (other / total) * 100,
        color: "#7d8792",
        amountLabel: formatKoreaGeoStatsValue(metricsByKey["employees-total"], other),
      },
    ],
  });
}

function buildKoreaGeoStatsSourceRow(definition) {
  const row = document.createElement("div");
  row.className = "country-stats-source-row";

  const sourceCard = document.createElement("div");
  sourceCard.className = "country-stats-source";

  const sourceTitle = document.createElement("strong");
  sourceTitle.textContent = definition.sourceName || koreaGeoStatsMeta.provider || "KOSIS";
  sourceCard.appendChild(sourceTitle);
  sourceCard.appendChild(document.createElement("br"));

  const sourceDescription = document.createElement("span");
  sourceDescription.textContent = definition.sourceText || definition.description || "공식 지표 설명이 없습니다.";
  sourceCard.appendChild(sourceDescription);

  if (definition.statTableUrl) {
    sourceCard.appendChild(document.createElement("br"));
    const link = document.createElement("a");
    link.href = definition.statTableUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "공식 통계표 보기";
    sourceCard.appendChild(link);
  }

  row.appendChild(sourceCard);
  return row;
}

function renderKoreaGeoStatsPanel() {
  if (!elements.koreaGeoStatsPanel) {
    return;
  }

  elements.koreaGeoStatsPanel.replaceChildren();

  if (state.mapVersion !== "korea") {
    return;
  }

  const shell = document.createElement("div");
  shell.className = "metric-explorer-shell";

  const levelKey = getKoreaGeoStatsLevelKey();
  if (!levelKey) {
    shell.appendChild(
      createEmptyState("공식 한국지리 통계는 현재 도/광역시와 시/군 보기에서 제공합니다. 특별시·광역시 구/군 레벨은 아직 연결하지 않았습니다."),
    );
    elements.koreaGeoStatsPanel.appendChild(shell);
    return;
  }

  const definitions = getKoreaGeoStatsDefinitions(levelKey);
  if (!definitions.length) {
    shell.appendChild(createEmptyState(`불러온 ${getKoreaGeoStatsLevelLabel(levelKey)} 통계 데이터가 없습니다.`));
    elements.koreaGeoStatsPanel.appendChild(shell);
    return;
  }

  ensureKoreaGeoStatsState(definitions);
  const metricsByKey = getKoreaGeoStatsMetrics(levelKey);
  const categoryMeta = getKoreaGeoStatsCategoryMeta();
  const displayModeMeta = getKoreaGeoStatsDisplayModeMeta();
  const categoryDefinitions = getKoreaGeoStatsDefinitionsByCategory(definitions, state.koreaGeoStatsCategoryKey);
  const activeDefinition = getKoreaGeoStatsDefinition(definitions);
  const latestEntries = getKoreaGeoStatsLatestEntries(activeDefinition, levelKey);
  const topN = getKoreaGeoStatsTopN(levelKey);
  const scopeMode = getKoreaGeoStatsScopeMode(levelKey);
  const regionNoun = getKoreaGeoStatsRegionNoun(levelKey);
  const compactRegionNoun = getKoreaGeoStatsRegionNoun(levelKey, true);
  const latestPeriodLabel = getKoreaGeoStatsDominantPeriodLabel(latestEntries);
  const scatterXDefinition =
    definitions.find((definition) => definition.key === state.koreaGeoStatsScatterXKey) ?? categoryDefinitions[0];
  const scatterYDefinition =
    definitions.find((definition) => definition.key === state.koreaGeoStatsScatterYKey) ?? categoryDefinitions[0];
  const scatterSizeDefinition =
    definitions.find((definition) => definition.key === state.koreaGeoStatsScatterSizeKey) ?? categoryDefinitions[0];

  shell.appendChild(buildKoreaGeoStatsControls(definitions, categoryDefinitions, activeDefinition));

  const summary = document.createElement("div");
  summary.className = "metric-explorer-summary";
  summary.append(
    createMetricExplorerSummaryCard("대분류", categoryMeta.label, `그래프 모드 · ${displayModeMeta.label}`),
    createMetricExplorerSummaryCard(
      "활성 지표",
      activeDefinition.label,
      activeDefinition.unit ? `단위 ${activeDefinition.unit}` : "단위 정보 없음",
    ),
    createMetricExplorerSummaryCard(
      "비교 범위",
      getKoreaGeoStatsScopeLabel(levelKey),
      getKoreaGeoStatsScopeDescription(levelKey),
    ),
    createMetricExplorerSummaryCard("최신 시점", latestPeriodLabel, activeDefinition.description || "KOSIS 공식 설명"),
    createMetricExplorerSummaryCard(
      "자료원",
      activeDefinition.sourceName || "KOSIS",
      activeDefinition.sourceText || koreaGeoStatsMeta.note || "공식 통계표 링크 제공",
    ),
  );
  shell.appendChild(summary);

  if (!latestEntries.length) {
    shell.appendChild(createEmptyState(`선택한 지표로 비교할 수 있는 ${regionNoun} 통계가 없습니다.`));
    elements.koreaGeoStatsPanel.appendChild(shell);
    return;
  }

  const chartGrid = document.createElement("div");
  chartGrid.className = "metric-explorer-grid";
  const anchorRegionCode = getKoreaGeoStatsSelectedRegions(levelKey)[0]?.id ?? latestEntries[0]?.id ?? null;

  if (state.koreaGeoStatsDisplayMode === "scatter") {
    chartGrid.append(
      buildScatterChartCard({
        title: scopeMode === "selected" ? `선택 ${regionNoun} 지표 관계` : `전국 ${regionNoun} 지표 관계`,
        description: `${scatterXDefinition.label} · ${scatterYDefinition.label} · 크기 ${scatterSizeDefinition.label}`,
        entries: getKoreaGeoStatsScatterEntries(scatterXDefinition, scatterYDefinition, scatterSizeDefinition, levelKey),
        xLabel: scatterXDefinition.label,
        yLabel: scatterYDefinition.label,
        xFormatter: (value) => formatKoreaGeoStatsCompactValue(scatterXDefinition, value),
        yFormatter: (value) => formatKoreaGeoStatsCompactValue(scatterYDefinition, value),
        sizeFormatter: (value) => formatKoreaGeoStatsValue(scatterSizeDefinition, value),
      }),
      buildMetricExplorerTable({
        title: "최신 비교표",
        description: `현재 활성 지표 기준으로 함께 비교할 수 있는 ${regionNoun} 공식값입니다.`,
        entries: latestEntries.slice(0, topN),
        valueFormatter: (value) => formatKoreaGeoStatsValue(activeDefinition, value),
      }),
    );
  } else if (state.koreaGeoStatsDisplayMode === "trend") {
    chartGrid.append(
      buildTimelineLineChartCard({
        title: scopeMode === "selected" ? `선택 ${regionNoun} 시점 변화` : `상위 ${regionNoun} 시점 변화`,
        description:
          scopeMode === "selected"
            ? `선택한 ${regionNoun}을 같은 축으로 놓고 증가·감소 패턴을 읽습니다.`
            : `선택이 없을 때는 최신 공식값 상위 ${regionNoun} 권역을 같은 축으로 펼칩니다.`,
        series: getKoreaGeoStatsTrendSeries(activeDefinition, latestEntries, levelKey),
        valueFormatter: (value) => formatKoreaGeoStatsCompactValue(activeDefinition, value),
      }),
      buildMetricExplorerTable({
        title: "최신 비교표",
        description: "최신 공식값과 기준 시점을 그래프 옆에서 함께 확인합니다.",
        entries: latestEntries.slice(0, topN),
        valueFormatter: (value) => formatKoreaGeoStatsValue(activeDefinition, value),
      }),
    );
  } else if (state.koreaGeoStatsDisplayMode === "relative") {
    chartGrid.append(
      buildKoreaGeoStatsRelativeCard(latestEntries, activeDefinition, topN, levelKey),
      buildMetricExplorerTable({
        title: "최신 순위표",
        description: "최댓값 100 비교와 함께 실제 값도 옆에서 확인할 수 있습니다.",
        entries: latestEntries.slice(0, topN),
        valueFormatter: (value) => formatKoreaGeoStatsValue(activeDefinition, value),
      }),
    );
  } else if (state.koreaGeoStatsDisplayMode === "latest") {
    if (latestEntries.every((entry) => Number(entry.value) >= 0)) {
      chartGrid.append(
        buildAmountBarChartCard({
          title: scopeMode === "selected" ? `선택 ${regionNoun} 최신 비교` : `최신 상위 ${topN}개 ${compactRegionNoun}`,
          description: "현재 지표의 최신 공식값을 같은 눈금과 순서로 비교합니다.",
          entries: latestEntries.slice(0, topN).map((entry, index) => ({
            label: scopeMode === "selected" ? entry.label : `${index + 1}위 · ${entry.label}`,
            value: entry.value,
            detail: entry.detail,
            color: metricExplorerRankPalette[index] ?? metricExplorerRankPalette[metricExplorerRankPalette.length - 1],
          })),
          valueFormatter: (value) => formatKoreaGeoStatsValue(activeDefinition, value),
        }),
        buildMetricExplorerTable({
          title: "최신 순위표",
          description: "그래프 제작용으로 옮겨 적기 쉬운 순위표입니다.",
          entries: latestEntries.slice(0, topN),
          valueFormatter: (value) => formatKoreaGeoStatsValue(activeDefinition, value),
        }),
      );
    } else {
      chartGrid.append(
        buildMetricExplorerTable({
          title: "최신 순위표",
          description: "음수가 포함된 지표라 표 중심으로 정리했습니다.",
          entries: latestEntries.slice(0, topN),
          valueFormatter: (value) => formatKoreaGeoStatsValue(activeDefinition, value),
        }),
        buildKoreaGeoStatsRegionMetricList(anchorRegionCode, categoryDefinitions, categoryMeta.label, levelKey),
      );
    }
  } else {
    chartGrid.append(
      buildTimelineLineChartCard({
        title: scopeMode === "selected" ? `선택 ${regionNoun} 시점 변화` : `상위 ${regionNoun} 시점 변화`,
        description:
          scopeMode === "selected"
            ? `선택한 ${regionNoun}을 같은 축으로 놓고 기본 변화 패턴을 읽습니다.`
            : `선택이 없을 때는 최신 공식값 상위 ${regionNoun} 권역을 같은 축으로 보여줍니다.`,
        series: getKoreaGeoStatsTrendSeries(activeDefinition, latestEntries, levelKey),
        valueFormatter: (value) => formatKoreaGeoStatsCompactValue(activeDefinition, value),
      }),
      (scopeMode === "selected" && getKoreaGeoStatsSelectedRegions(levelKey).length === 1
        ? buildKoreaGeoStatsRegionMetricList(anchorRegionCode, categoryDefinitions, categoryMeta.label, levelKey)
        : buildMetricExplorerTable({
            title: "최신 순위표",
            description: "현재 지표의 최신 기준 시점과 값을 함께 정리했습니다.",
            entries: latestEntries.slice(0, topN),
            valueFormatter: (value) => formatKoreaGeoStatsValue(activeDefinition, value),
          })),
    );

    if (
      categoryMeta.key === "demography" &&
      anchorRegionCode &&
      metricsByKey["youth-population-share"] &&
      metricsByKey["working-age-population-share"] &&
      metricsByKey["elderly-share"]
    ) {
      chartGrid.append(buildKoreaGeoStatsAgeStructureCard(anchorRegionCode, metricsByKey, levelKey));
    }

    if (
      categoryMeta.key === "urban" &&
      anchorRegionCode &&
      metricsByKey["local-commute-share"] &&
      metricsByKey["outbound-commute-share"]
    ) {
      chartGrid.append(buildKoreaGeoStatsCommuteStructureCard(anchorRegionCode, metricsByKey, levelKey));
    }

    if (
      categoryMeta.key === "industry" &&
      anchorRegionCode &&
      metricsByKey["employees-total"] &&
      metricsByKey["manufacturing-employees"] &&
      metricsByKey["service-employees"]
    ) {
      chartGrid.append(buildKoreaGeoStatsEmploymentStructureCard(anchorRegionCode, metricsByKey, levelKey));
    }
  }

  shell.appendChild(chartGrid);
  shell.appendChild(buildKoreaGeoStatsSourceRow(activeDefinition));
  elements.koreaGeoStatsPanel.appendChild(shell);
}

function buildKoreaGeoStatsControls(definitions, categoryDefinitions, activeDefinition) {
  const wrapper = document.createElement("div");
  wrapper.className = "metric-explorer-control-shell";
  const levelKey = getKoreaGeoStatsLevelKey();
  const regionNoun = getKoreaGeoStatsRegionNoun(levelKey);
  const compactRegionNoun = getKoreaGeoStatsRegionNoun(levelKey, true);

  const actionRow = document.createElement("div");
  actionRow.className = "exam-graph-action-row";
  [
    {
      label: "현재 범위 사용",
      active: getKoreaGeoStatsScopeMode(levelKey) !== "all",
      handler: () => applyKoreaGeoStatsScopeReset(),
    },
    {
      label: "지역 랜덤",
      active: false,
      handler: () => applyKoreaGeoStatsRandomRegions(),
    },
    {
      label: "통계 랜덤",
      active: false,
      handler: () => applyKoreaGeoStatsRandomMetric(),
    },
    {
      label: "세트 랜덤",
      active: false,
      handler: () => applyKoreaGeoStatsRandomScenario(),
    },
  ].forEach((config) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "metric-explorer-chip exam-graph-chip--action";
    button.classList.toggle("is-active", Boolean(config.active));
    button.textContent = config.label;
    button.addEventListener("click", config.handler);
    actionRow.appendChild(button);
  });
  wrapper.appendChild(actionRow);

  const guide = document.createElement("p");
  guide.className = "metric-explorer-guide";
  guide.textContent = getKoreaGeoStatsGuideText(levelKey);
  wrapper.appendChild(guide);

  const categoryRow = document.createElement("div");
  categoryRow.className = "metric-explorer-tab-row";
  koreaGeoStatsCategoryDefinitions.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "metric-explorer-chip";
    button.classList.toggle("is-active", state.koreaGeoStatsCategoryKey === category.key);
    button.textContent = category.label;
    button.addEventListener("click", () => {
      state.koreaGeoStatsCategoryKey = category.key;
      const fallbackMetric = getKoreaGeoStatsDefinitionsByCategory(definitions, category.key)[0];
      if (fallbackMetric) {
        state.koreaGeoStatsMetricKey = fallbackMetric.key;
      }
      renderSelectionViews();
    });
    categoryRow.appendChild(button);
  });
  wrapper.appendChild(categoryRow);

  const modeRow = document.createElement("div");
  modeRow.className = "metric-explorer-tab-row metric-explorer-tab-row--compact";
  koreaGeoStatsDisplayModeDefinitions.forEach((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "metric-explorer-chip";
    button.classList.toggle("is-active", state.koreaGeoStatsDisplayMode === mode.key);
    button.textContent = mode.label;
    button.disabled = mode.key === "relative" && !categoryDefinitions.some((definition) => definition.allowRelative);
    button.addEventListener("click", () => {
      state.koreaGeoStatsDisplayMode = mode.key;
      if (mode.key === "relative" && !activeDefinition.allowRelative) {
        const relativeFallback = categoryDefinitions.find((definition) => definition.allowRelative);
        if (relativeFallback) {
          state.koreaGeoStatsMetricKey = relativeFallback.key;
        }
      }
      renderSelectionViews();
    });
    modeRow.appendChild(button);
  });
  wrapper.appendChild(modeRow);

  const metricGrid = document.createElement("div");
  metricGrid.className = "metric-explorer-metric-grid";
  categoryDefinitions.forEach((definition) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "metric-explorer-metric-chip";
    button.classList.toggle("is-active", state.koreaGeoStatsMetricKey === definition.key);
    button.textContent = definition.label;
    button.addEventListener("click", () => {
      state.koreaGeoStatsMetricKey = definition.key;
      if (state.koreaGeoStatsDisplayMode === "relative" && !definition.allowRelative) {
        state.koreaGeoStatsDisplayMode = "latest";
      }
      renderSelectionViews();
    });
    metricGrid.appendChild(button);
  });
  wrapper.appendChild(metricGrid);

  const controls = document.createElement("div");
  controls.className = "metric-explorer-controls";

  const topNLabel = document.createElement("label");
  topNLabel.className = "metric-explorer-control";
  topNLabel.setAttribute("for", "koreaGeoStatsTopNInput");
  topNLabel.textContent = `상위 ${compactRegionNoun} 수`;
  const topNInput = document.createElement("input");
  topNInput.id = "koreaGeoStatsTopNInput";
  topNInput.type = "number";
  topNInput.min = "1";
  topNInput.max = String(getKoreaGeoStatsMaxCount(levelKey));
  topNInput.value = String(getKoreaGeoStatsTopN(levelKey));
  topNInput.addEventListener("change", () => {
    state.koreaGeoStatsTopN = clamp(
      Math.round(Number(topNInput.value) || 10),
      1,
      getKoreaGeoStatsMaxCount(levelKey),
    );
    renderSelectionViews();
  });
  topNLabel.appendChild(topNInput);
  controls.appendChild(topNLabel);

  if (state.koreaGeoStatsDisplayMode === "scatter") {
    const scatterConfigs = [
      {
        id: "koreaGeoStatsScatterXSelect",
        label: "X축",
        value: state.koreaGeoStatsScatterXKey,
        onChange: (value) => {
          state.koreaGeoStatsScatterXKey = value;
        },
      },
      {
        id: "koreaGeoStatsScatterYSelect",
        label: "Y축",
        value: state.koreaGeoStatsScatterYKey,
        onChange: (value) => {
          state.koreaGeoStatsScatterYKey = value;
        },
      },
      {
        id: "koreaGeoStatsScatterSizeSelect",
        label: "버블 크기",
        value: state.koreaGeoStatsScatterSizeKey,
        onChange: (value) => {
          state.koreaGeoStatsScatterSizeKey = value;
        },
      },
    ];

    scatterConfigs.forEach((config) => {
      const label = document.createElement("label");
      label.className = "metric-explorer-control";
      label.setAttribute("for", config.id);
      label.textContent = config.label;
      const select = document.createElement("select");
      select.id = config.id;
      buildMetricExplorerOptions(categoryDefinitions, select, config.value);
      select.addEventListener("change", () => {
        config.onChange(select.value);
        renderSelectionViews();
      });
      label.appendChild(select);
      controls.appendChild(label);
    });
  }

  wrapper.appendChild(controls);
  return wrapper;
}

function buildMetricExplorerControls(definitions, visibleDefinitions, activeDefinition) {
  const wrapper = document.createElement("div");
  wrapper.className = "metric-explorer-control-shell";
  const categoryMeta = getMetricExplorerCategoryMeta();
  const displayModeMeta = getMetricExplorerDisplayModeMeta();

  const categoryTabs = document.createElement("div");
  categoryTabs.className = "metric-explorer-tab-row";
  metricExplorerCategoryDefinitions.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "metric-explorer-chip";
    button.classList.toggle("is-active", state.metricExplorerCategoryKey === category.key);
    button.textContent = category.label;
    button.addEventListener("click", () => {
      beginHistoryStep("지표 탐색기 변경");
      state.metricExplorerCategoryKey = category.key;
      ensureMetricExplorerState(definitions);
      renderSelectionViews();
      renderMap();
    });
    categoryTabs.appendChild(button);
  });
  wrapper.appendChild(categoryTabs);

  const modeTabs = document.createElement("div");
  modeTabs.className = "metric-explorer-tab-row metric-explorer-tab-row--compact";
  metricExplorerDisplayModeDefinitions.forEach((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "metric-explorer-chip";
    button.classList.toggle("is-active", state.metricExplorerDisplayMode === mode.key);
    button.textContent = mode.label;
    button.addEventListener("click", () => {
      beginHistoryStep("지표 탐색기 변경");
      state.metricExplorerDisplayMode = mode.key;
      ensureMetricExplorerState(definitions);
      renderSelectionViews();
      renderMap();
    });
    modeTabs.appendChild(button);
  });
  wrapper.appendChild(modeTabs);

  const guide = document.createElement("p");
  guide.className = "metric-explorer-guide";
  guide.textContent = `${categoryMeta.description} 중심으로 ${displayModeMeta.label} 그래프에 바로 쓸 지표만 먼저 보여줍니다.`;
  wrapper.appendChild(guide);

  const metricChips = document.createElement("div");
  metricChips.className = "metric-explorer-metric-grid";
  visibleDefinitions.forEach((definition) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "metric-explorer-metric-chip";
    button.classList.toggle("is-active", definition.key === activeDefinition.key);
    button.textContent = definition.label;
    button.addEventListener("click", () => {
      beginHistoryStep("지표 탐색기 변경");
      state.metricExplorerMetricKey = definition.key;
      renderSelectionViews();
      renderMap();
    });
    metricChips.appendChild(button);
  });
  wrapper.appendChild(metricChips);

  const controls = document.createElement("div");
  controls.className = "metric-explorer-controls";

  const groupingField = document.createElement("div");
  groupingField.className = "metric-explorer-control";
  const groupingLabel = document.createElement("label");
  groupingLabel.setAttribute("for", "metricExplorerGroupingSelect");
  groupingLabel.textContent = "비교 범위";
  const groupingSelect = document.createElement("select");
  groupingSelect.id = "metricExplorerGroupingSelect";
  [
    { value: "countries", label: "국가별 비교" },
    { value: "continents", label: "대륙별 묶음" },
  ].forEach((optionConfig) => {
    const option = document.createElement("option");
    option.value = optionConfig.value;
    option.textContent = optionConfig.label;
    option.selected = state.metricExplorerGrouping === optionConfig.value;
    groupingSelect.appendChild(option);
  });
  groupingSelect.addEventListener("change", () => {
    beginHistoryStep("지표 탐색기 변경");
    state.metricExplorerGrouping = groupingSelect.value;
    renderSelectionViews();
    renderMap();
  });
  groupingField.append(groupingLabel, groupingSelect);

  const topNField = document.createElement("div");
  topNField.className = "metric-explorer-control";
  const topNLabel = document.createElement("label");
  topNLabel.setAttribute("for", "metricExplorerTopNInput");
  topNLabel.textContent = "표시 개수";
  const topNInput = document.createElement("input");
  topNInput.id = "metricExplorerTopNInput";
  topNInput.type = "number";
  topNInput.min = "1";
  topNInput.max = "30";
  topNInput.step = "1";
  topNInput.value = String(getMetricExplorerTopN());
  topNInput.addEventListener("input", () => {
    beginHistoryStep("지표 탐색기 변경");
    state.metricExplorerTopN = clamp(Math.round(Number(topNInput.value) || 10), 1, 30);
    renderSelectionViews();
    renderMap();
  });
  topNField.append(topNLabel, topNInput);

  const highlightField = document.createElement("label");
  highlightField.className = "metric-explorer-toggle";
  const highlightCheckbox = document.createElement("input");
  highlightCheckbox.type = "checkbox";
  highlightCheckbox.checked = Boolean(state.metricExplorerMapHighlightEnabled);
  highlightCheckbox.addEventListener("change", () => {
    beginHistoryStep("지표 탐색기 변경");
    state.metricExplorerMapHighlightEnabled = highlightCheckbox.checked;
    renderSelectionViews();
    renderMap();
  });
  const highlightText = document.createElement("span");
  highlightText.textContent = "지도에서 상위 N 강조";
  highlightField.append(highlightCheckbox, highlightText);

  controls.append(groupingField, topNField, highlightField);

  if (state.metricExplorerDisplayMode === "scatter") {
    const categoryDefinitions = getMetricExplorerCategoryDefinitionsFiltered(definitions);
    const scatterXField = document.createElement("div");
    scatterXField.className = "metric-explorer-control";
    const scatterXLabel = document.createElement("label");
    scatterXLabel.setAttribute("for", "metricExplorerScatterXSelect");
    scatterXLabel.textContent = "산포도 X축";
    const scatterXSelect = document.createElement("select");
    scatterXSelect.id = "metricExplorerScatterXSelect";
    buildMetricExplorerOptions(categoryDefinitions, scatterXSelect, state.metricExplorerScatterXKey);
    scatterXSelect.addEventListener("change", () => {
      beginHistoryStep("지표 탐색기 변경");
      state.metricExplorerScatterXKey = scatterXSelect.value;
      renderSelectionViews();
    });
    scatterXField.append(scatterXLabel, scatterXSelect);

    const scatterYField = document.createElement("div");
    scatterYField.className = "metric-explorer-control";
    const scatterYLabel = document.createElement("label");
    scatterYLabel.setAttribute("for", "metricExplorerScatterYSelect");
    scatterYLabel.textContent = "산포도 Y축";
    const scatterYSelect = document.createElement("select");
    scatterYSelect.id = "metricExplorerScatterYSelect";
    buildMetricExplorerOptions(categoryDefinitions, scatterYSelect, state.metricExplorerScatterYKey);
    scatterYSelect.addEventListener("change", () => {
      beginHistoryStep("지표 탐색기 변경");
      state.metricExplorerScatterYKey = scatterYSelect.value;
      renderSelectionViews();
    });
    scatterYField.append(scatterYLabel, scatterYSelect);

    const scatterSizeField = document.createElement("div");
    scatterSizeField.className = "metric-explorer-control";
    const scatterSizeLabel = document.createElement("label");
    scatterSizeLabel.setAttribute("for", "metricExplorerScatterSizeSelect");
    scatterSizeLabel.textContent = "버블 크기";
    const scatterSizeSelect = document.createElement("select");
    scatterSizeSelect.id = "metricExplorerScatterSizeSelect";
    buildMetricExplorerOptions(categoryDefinitions, scatterSizeSelect, state.metricExplorerScatterSizeKey);
    scatterSizeSelect.addEventListener("change", () => {
      beginHistoryStep("지표 탐색기 변경");
      state.metricExplorerScatterSizeKey = scatterSizeSelect.value;
      renderSelectionViews();
    });
    scatterSizeField.append(scatterSizeLabel, scatterSizeSelect);

    controls.append(scatterXField, scatterYField, scatterSizeField);
  }

  wrapper.appendChild(controls);
  return wrapper;
}

function buildMetricExplorerOptions(definitions, selectNode, activeKey) {
  selectNode.replaceChildren();
  definitions.forEach((definition) => {
    const option = document.createElement("option");
    option.value = definition.key;
    option.textContent = definition.label;
    option.selected = definition.key === activeKey;
    selectNode.appendChild(option);
  });
}

function createMetricExplorerSummaryCard(label, value, detail) {
  const card = document.createElement("div");
  card.className = "metric-explorer-summary-card";
  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  const valueNode = document.createElement("strong");
  valueNode.textContent = value;
  const detailNode = document.createElement("small");
  detailNode.textContent = detail;
  card.append(labelNode, valueNode, detailNode);
  return card;
}

function buildMetricExplorerTable({ title, description, entries, valueFormatter }) {
  const card = document.createElement("div");
  card.className = "metric-explorer-table";

  const titleNode = document.createElement("h5");
  titleNode.className = "metric-explorer-table__title";
  titleNode.textContent = title;
  card.appendChild(titleNode);

  if (description) {
    const descriptionNode = document.createElement("p");
    descriptionNode.className = "metric-explorer-table__meta";
    descriptionNode.textContent = description;
    card.appendChild(descriptionNode);
  }

  if (!(entries ?? []).length) {
    card.appendChild(createCountryStatsUnavailable("표시할 순위표가 없습니다."));
    return card;
  }

  const rowsNode = document.createElement("div");
  rowsNode.className = "metric-explorer-table__rows";

  entries.forEach((entry, index) => {
    const row = document.createElement("div");
    row.className = "metric-explorer-table__row";

    const rankNode = document.createElement("div");
    rankNode.className = "metric-explorer-table__rank";
    rankNode.textContent = `${index + 1}위`;

    const labelNode = document.createElement("div");
    labelNode.className = "metric-explorer-table__label";
    const strong = document.createElement("strong");
    strong.textContent = entry.label;
    const small = document.createElement("small");
    small.textContent = entry.detail ?? "최신 가용연도";
    labelNode.append(strong, small);

    const valueNode = document.createElement("div");
    valueNode.className = "metric-explorer-table__value";
    const valueStrong = document.createElement("strong");
    valueStrong.textContent = valueFormatter(entry.value);
    const valueSmall = document.createElement("small");
    valueSmall.textContent = entry.year ? `${entry.year}년` : "최신값";
    valueNode.append(valueStrong, valueSmall);

    row.append(rankNode, labelNode, valueNode);
    rowsNode.appendChild(row);
  });

  card.appendChild(rowsNode);
  return card;
}

function buildRelativeRankingCard(results, activeDefinition, topN) {
  const topResults = results.slice(0, topN);
  const maximumValue = Number(topResults[0]?.value) || 0;
  const scopeMode = getMetricExplorerScopeMode();

  return buildAmountBarChartCard({
    title: "상댓값 비교",
    description:
      scopeMode === "selected"
        ? "선택 국가 중 최댓값을 100으로 놓고 상대 비교합니다."
        : "최댓값을 100으로 놓고 나머지 값을 상대 비교합니다.",
    entries: topResults.map((entry, index) => ({
      label: entry.label,
      value: maximumValue > 0 ? (Number(entry.value) / maximumValue) * 100 : 0,
      detail: `${activeDefinition.formatter(entry.value)} · ${entry.detail ?? "최신값"}`,
      color: metricExplorerRankPalette[index] ?? metricExplorerRankPalette[metricExplorerRankPalette.length - 1],
    })),
    valueFormatter: (value) => formatRelativeIndex(value),
  });
}

function getMetricExplorerScatterEntries(xDefinition, yDefinition, sizeDefinition, grouping = state.metricExplorerGrouping) {
  const xEntries = new Map(getMetricExplorerResults(xDefinition, grouping).map((entry) => [entry.id, entry]));
  const yEntries = new Map(getMetricExplorerResults(yDefinition, grouping).map((entry) => [entry.id, entry]));
  const sizeEntries = new Map(getMetricExplorerResults(sizeDefinition, grouping).map((entry) => [entry.id, entry]));
  const intersectionIds = [...xEntries.keys()].filter((id) => yEntries.has(id) && sizeEntries.has(id));

  return intersectionIds.map((id) => {
    const xEntry = xEntries.get(id);
    const yEntry = yEntries.get(id);
    const sizeEntry = sizeEntries.get(id);
    return {
      id,
      label: xEntry?.label ?? yEntry?.label ?? String(id),
      xValue: Number(xEntry?.value),
      yValue: Number(yEntry?.value),
      sizeValue: Math.abs(Number(sizeEntry?.value) || 0),
      sizeDisplayValue: Number(sizeEntry?.value),
      detail: [xEntry?.year, yEntry?.year].filter(Boolean).length
        ? `${[xEntry?.year, yEntry?.year].filter(Boolean).join(" · ")}년`
        : "최신 가용연도",
    };
  });
}

function getScatterLabelEntries(entries) {
  const validEntries = [...(entries ?? [])];
  if (getMetricExplorerScopeMode() === "selected" && validEntries.length <= 12) {
    return validEntries.sort((a, b) => d3.ascending(a.label, b.label));
  }

  return validEntries
    .sort((a, b) => Number(b.sizeValue) - Number(a.sizeValue))
    .slice(0, 10);
}

function getMetricExplorerDefinitions() {
  return [
    {
      key: "population-total",
      category: "인구 변천 · 도시 · 이동",
      label: "총인구",
      aggregation: "sum",
      formatter: (value) => formatCompactStatNumber(value),
      getValue: (stats) => getMetricFromPopulation(stats, "population"),
    },
    {
      key: "population-density",
      category: "인구 변천 · 도시 · 이동",
      label: "인구 밀도",
      aggregation: "mean",
      formatter: (value) => formatDensity(value),
      getValue: (stats) => getPopulationDensityMetric(stats),
    },
    {
      key: "population-birth-rate",
      category: "인구 변천 · 도시 · 이동",
      label: "출생률",
      aggregation: "mean",
      formatter: (value) => formatPerThousand(value),
      getValue: (stats) => getMetricFromPopulationRate(stats, "birthRate"),
    },
    {
      key: "population-death-rate",
      category: "인구 변천 · 도시 · 이동",
      label: "사망률",
      aggregation: "mean",
      formatter: (value) => formatPerThousand(value),
      getValue: (stats) => getMetricFromPopulationRate(stats, "deathRate"),
    },
    {
      key: "population-natural-increase-rate",
      category: "인구 변천 · 도시 · 이동",
      label: "자연적 증가율",
      aggregation: "mean",
      formatter: (value) => formatPerThousand(value),
      getValue: (stats) => getMetricFromPopulationRate(stats, "naturalIncreaseRate"),
    },
    {
      key: "population-urban-share",
      category: "인구 변천 · 도시 · 이동",
      label: "도시화율",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getMetricFromPopulation(stats, "urbanShare"),
    },
    {
      key: "population-urban-total",
      category: "인구 변천 · 도시 · 이동",
      label: "도시 인구",
      aggregation: "sum",
      formatter: (value) => formatCompactStatNumber(value),
      getValue: (stats) => getMetricFromPopulation(stats, "urbanPopulation"),
    },
    {
      key: "population-rural-total",
      category: "인구 변천 · 도시 · 이동",
      label: "촌락 인구",
      aggregation: "sum",
      formatter: (value) => formatCompactStatNumber(value),
      getValue: (stats) => getMetricFromPopulation(stats, "ruralPopulation"),
    },
    {
      key: "age-65plus-share",
      category: "인구 변천 · 도시 · 이동",
      label: "고령 인구 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getPopulationStructureMetric(stats, "age65Plus"),
    },
    {
      key: "age-014-share",
      category: "인구 변천 · 도시 · 이동",
      label: "유소년 인구 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getPopulationStructureMetric(stats, "age0To14"),
    },
    {
      key: "dependency-youth",
      category: "인구 변천 · 도시 · 이동",
      label: "유소년 부양비",
      aggregation: "mean",
      formatter: (value) => formatIndexValue(value),
      getValue: (stats) => getPopulationDependencyMetric(stats, "youth"),
    },
    {
      key: "dependency-old-age",
      category: "인구 변천 · 도시 · 이동",
      label: "노년 부양비",
      aggregation: "mean",
      formatter: (value) => formatIndexValue(value),
      getValue: (stats) => getPopulationDependencyMetric(stats, "oldAge"),
    },
    {
      key: "dependency-total",
      category: "인구 변천 · 도시 · 이동",
      label: "총부양비",
      aggregation: "mean",
      formatter: (value) => formatIndexValue(value),
      getValue: (stats) => getPopulationDependencyMetric(stats, "total"),
    },
    {
      key: "migration-stock-share",
      category: "인구 변천 · 도시 · 이동",
      label: "국제이주민 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getMigrationMetric(stats, "migrantStockShare"),
    },
    {
      key: "migration-net",
      category: "인구 변천 · 도시 · 이동",
      label: "순이동",
      aggregation: "sum",
      formatter: (value) => formatCompactStatNumber(value),
      getValue: (stats) => getMigrationMetric(stats, "netMigration"),
    },
    {
      key: "refugee-origin-total",
      category: "인구 변천 · 도시 · 이동",
      label: "난민 발생 수",
      aggregation: "sum",
      formatter: (value) => formatCompactStatNumber(value),
      getValue: (stats) => getRefugeeMetric(stats, "refugeeOriginTotal"),
    },
    {
      key: "refugee-hosted-total",
      category: "인구 변천 · 도시 · 이동",
      label: "난민 수용 수",
      aggregation: "sum",
      formatter: (value) => formatCompactStatNumber(value),
      getValue: (stats) => getRefugeeMetric(stats, "refugeeHostedTotal"),
    },
    {
      key: "crops-total-production",
      category: "식량 · 가축",
      label: "3대 곡물 생산 합",
      aggregation: "sum",
      formatter: (value) => formatTonAmount(value),
      getValue: (stats) => getCropAggregateMetric(stats, "productionTotal"),
    },
    {
      key: "crops-wheat-production",
      category: "식량 · 가축",
      label: "밀 생산량",
      aggregation: "sum",
      formatter: (value) => formatTonAmount(value),
      getValue: (stats) => getNamedCropMetric(stats, "wheat", "production"),
    },
    {
      key: "crops-rice-production",
      category: "식량 · 가축",
      label: "쌀 생산량",
      aggregation: "sum",
      formatter: (value) => formatTonAmount(value),
      getValue: (stats) => getNamedCropMetric(stats, "rice", "production"),
    },
    {
      key: "crops-maize-production",
      category: "식량 · 가축",
      label: "옥수수 생산량",
      aggregation: "sum",
      formatter: (value) => formatTonAmount(value),
      getValue: (stats) => getNamedCropMetric(stats, "maize", "production"),
    },
    {
      key: "crops-wheat-export-ratio",
      category: "식량 · 가축",
      label: "밀 생산 대비 수출 비율",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getCropExportRatioMetric(stats, "wheat"),
    },
    {
      key: "crops-rice-export-ratio",
      category: "식량 · 가축",
      label: "쌀 생산 대비 수출 비율",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getCropExportRatioMetric(stats, "rice"),
    },
    {
      key: "crops-maize-export-ratio",
      category: "식량 · 가축",
      label: "옥수수 생산 대비 수출 비율",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getCropExportRatioMetric(stats, "maize"),
    },
    {
      key: "crops-total-exports",
      category: "식량 · 가축",
      label: "3대 곡물 수출량 합",
      aggregation: "sum",
      formatter: (value) => formatTonAmount(value),
      getValue: (stats) => getCropAggregateMetric(stats, "exportTotal"),
    },
    {
      key: "crops-total-imports",
      category: "식량 · 가축",
      label: "3대 곡물 수입량 합",
      aggregation: "sum",
      formatter: (value) => formatTonAmount(value),
      getValue: (stats) => getCropAggregateMetric(stats, "importTotal"),
    },
    {
      key: "crops-wheat-imports",
      category: "식량 · 가축",
      label: "밀 수입량",
      aggregation: "sum",
      formatter: (value) => formatTonAmount(value),
      getValue: (stats) => getNamedCropMetric(stats, "wheat", "import"),
    },
    {
      key: "crops-rice-imports",
      category: "식량 · 가축",
      label: "쌀 수입량",
      aggregation: "sum",
      formatter: (value) => formatTonAmount(value),
      getValue: (stats) => getNamedCropMetric(stats, "rice", "import"),
    },
    {
      key: "crops-maize-imports",
      category: "식량 · 가축",
      label: "옥수수 수입량",
      aggregation: "sum",
      formatter: (value) => formatTonAmount(value),
      getValue: (stats) => getNamedCropMetric(stats, "maize", "import"),
    },
    {
      key: "crops-wheat-exports",
      category: "식량 · 가축",
      label: "밀 수출량",
      aggregation: "sum",
      formatter: (value) => formatTonAmount(value),
      getValue: (stats) => getNamedCropMetric(stats, "wheat", "export"),
    },
    {
      key: "crops-rice-exports",
      category: "식량 · 가축",
      label: "쌀 수출량",
      aggregation: "sum",
      formatter: (value) => formatTonAmount(value),
      getValue: (stats) => getNamedCropMetric(stats, "rice", "export"),
    },
    {
      key: "crops-maize-exports",
      category: "식량 · 가축",
      label: "옥수수 수출량",
      aggregation: "sum",
      formatter: (value) => formatTonAmount(value),
      getValue: (stats) => getNamedCropMetric(stats, "maize", "export"),
    },
    {
      key: "livestock-stock-total",
      category: "식량 · 가축",
      label: "3대 가축 사육 두수 합",
      aggregation: "sum",
      formatter: (value) => formatCompactStatNumber(value),
      getValue: (stats) => getLivestockAggregateMetric(stats, "stockTotal"),
    },
    {
      key: "livestock-meat-total",
      category: "식량 · 가축",
      label: "육류 생산량 합",
      aggregation: "sum",
      formatter: (value) => formatTonAmount(value),
      getValue: (stats) => getLivestockAggregateMetric(stats, "meatTotal"),
    },
    {
      key: "livestock-cattle-stock",
      category: "식량 · 가축",
      label: "소 사육 두수",
      aggregation: "sum",
      formatter: (value) => formatCompactStatNumber(value),
      getValue: (stats) => getNamedLivestockMetric(stats, "cattle", "stocks"),
    },
    {
      key: "livestock-pigs-stock",
      category: "식량 · 가축",
      label: "돼지 사육 두수",
      aggregation: "sum",
      formatter: (value) => formatCompactStatNumber(value),
      getValue: (stats) => getNamedLivestockMetric(stats, "pigs", "stocks"),
    },
    {
      key: "livestock-sheep-stock",
      category: "식량 · 가축",
      label: "양 사육 두수",
      aggregation: "sum",
      formatter: (value) => formatCompactStatNumber(value),
      getValue: (stats) => getNamedLivestockMetric(stats, "sheep", "stocks"),
    },
    {
      key: "religion-christians-share",
      category: "종교",
      label: "크리스트교 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getReligionMetric(stats, "christians"),
    },
    {
      key: "religion-muslims-share",
      category: "종교",
      label: "이슬람교 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getReligionMetric(stats, "muslims"),
    },
    {
      key: "religion-hindus-share",
      category: "종교",
      label: "힌두교 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getReligionMetric(stats, "hindus"),
    },
    {
      key: "religion-buddhists-share",
      category: "종교",
      label: "불교 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getReligionMetric(stats, "buddhists"),
    },
    {
      key: "energy-consumption-total",
      category: "에너지 · 자원",
      label: "1차 에너지 소비량",
      aggregation: "sum",
      formatter: (value) => formatEnergyAmount(value),
      getValue: (stats) => getEnergyMetric(stats, "consumption", "totalTWh"),
    },
    {
      key: "energy-consumption-per-capita",
      category: "에너지 · 자원",
      label: "1인당 에너지 소비량",
      aggregation: "mean",
      formatter: (value) => formatEnergyPerCapita(value),
      getValue: (stats) => getEnergyPerCapitaMetric(stats),
    },
    {
      key: "energy-fossil-share",
      category: "에너지 · 자원",
      label: "화석 에너지 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getEnergyMetric(stats, "consumption", "summaryShares.fossil"),
    },
    {
      key: "energy-renewables-share",
      category: "에너지 · 자원",
      label: "신재생 에너지 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getEnergyMetric(stats, "consumption", "summaryShares.renewables"),
    },
    {
      key: "electricity-total",
      category: "에너지 · 자원",
      label: "총발전량",
      aggregation: "sum",
      formatter: (value) => formatEnergyAmount(value),
      getValue: (stats) => getEnergyMetric(stats, "electricity", "totalTWh"),
    },
    {
      key: "electricity-nuclear-share",
      category: "에너지 · 자원",
      label: "원자력 발전 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getEnergyMetric(stats, "electricity", "shareBreakdown.nuclear"),
    },
    {
      key: "electricity-coal-share",
      category: "에너지 · 자원",
      label: "석탄 발전 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getEnergyMetric(stats, "electricity", "shareBreakdown.coal"),
    },
    {
      key: "electricity-hydropower-share",
      category: "에너지 · 자원",
      label: "수력 발전 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getEnergyMetric(stats, "electricity", "shareBreakdown.hydropower"),
    },
    {
      key: "electricity-solar-share",
      category: "에너지 · 자원",
      label: "태양광 발전 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getEnergyMetric(stats, "electricity", "shareBreakdown.solar"),
    },
    {
      key: "electricity-wind-share",
      category: "에너지 · 자원",
      label: "풍력 발전 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getEnergyMetric(stats, "electricity", "shareBreakdown.wind"),
    },
    {
      key: "electricity-solar-amount",
      category: "에너지 · 자원",
      label: "태양광 발전량",
      aggregation: "sum",
      formatter: (value) => formatEnergyAmount(value),
      getValue: (stats) => getEnergyMetric(stats, "electricity", "amountBreakdownTWh.solar"),
    },
    {
      key: "electricity-wind-amount",
      category: "에너지 · 자원",
      label: "풍력 발전량",
      aggregation: "sum",
      formatter: (value) => formatEnergyAmount(value),
      getValue: (stats) => getEnergyMetric(stats, "electricity", "amountBreakdownTWh.wind"),
    },
    {
      key: "fossil-production-total",
      category: "에너지 · 자원",
      label: "화석연료 생산량",
      aggregation: "sum",
      formatter: (value) => formatEnergyAmount(value),
      getValue: (stats) => getEnergyMetric(stats, "fossilProduction", "totalTWh"),
    },
    {
      key: "fossil-production-oil",
      category: "에너지 · 자원",
      label: "석유 생산량",
      aggregation: "sum",
      formatter: (value) => formatEnergyAmount(value),
      getValue: (stats) => getEnergyMetric(stats, "fossilProduction", "amountBreakdownTWh.oil"),
    },
    {
      key: "fossil-production-gas",
      category: "에너지 · 자원",
      label: "가스 생산량",
      aggregation: "sum",
      formatter: (value) => formatEnergyAmount(value),
      getValue: (stats) => getEnergyMetric(stats, "fossilProduction", "amountBreakdownTWh.gas"),
    },
    {
      key: "fossil-production-coal",
      category: "에너지 · 자원",
      label: "석탄 생산량",
      aggregation: "sum",
      formatter: (value) => formatEnergyAmount(value),
      getValue: (stats) => getEnergyMetric(stats, "fossilProduction", "amountBreakdownTWh.coal"),
    },
    {
      key: "exports-value",
      category: "산업 · 무역",
      label: "수출액",
      aggregation: "sum",
      formatter: (value) => formatCurrencyAmount(value),
      getValue: (stats) => getExportMetric(stats, "valueCurrentUsd"),
    },
    {
      key: "exports-share",
      category: "산업 · 무역",
      label: "수출 의존도",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getExportMetric(stats, "shareOfGdp"),
    },
    {
      key: "industry-services-share",
      category: "산업 · 무역",
      label: "서비스업 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getIndustryMetric(stats, "services"),
    },
    {
      key: "industry-agriculture-share",
      category: "산업 · 무역",
      label: "농림어업 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getIndustryMetric(stats, "agriculture"),
    },
    {
      key: "industry-industry-share",
      category: "산업 · 무역",
      label: "공업 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getIndustryMetric(stats, "industry"),
    },
  ];
}

function getMetricExplorerDefinition(definitions = getMetricExplorerDefinitions()) {
  return definitions.find((definition) => definition.key === state.metricExplorerMetricKey) ?? definitions[0];
}

function getMetricExplorerDefinitionByKey(definitions, key) {
  return definitions.find((definition) => definition.key === key) ?? definitions[0];
}

function getMetricExplorerResults(definition = getMetricExplorerDefinition(), grouping = state.metricExplorerGrouping) {
  const selectedIdSet = new Set(state.selected.map((country) => country.id));
  const useSelectedScope = selectedIdSet.size > 0;
  const countryEntries = Object.entries(countryStatsById)
    .filter(([countryId]) => !useSelectedScope || selectedIdSet.has(countryId))
    .map(([countryId, stats]) => {
      const metric = definition.getValue(stats);
      if (!metric || !Number.isFinite(Number(metric.value))) {
        return null;
      }

      return {
        id: countryId,
        label: stats.atlasName ?? countryById.get(countryId)?.properties?.name ?? countryId,
        value: Number(metric.value),
        year: metric.year ?? null,
        detail: [metric.detail, stats.continent?.name].filter(Boolean).join(" · "),
        continent: stats.continent?.name ?? "미분류",
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.value) - Number(a.value));

  if (grouping === "countries") {
    return countryEntries;
  }

  return [...d3.group(countryEntries, (entry) => entry.continent).entries()]
    .map(([continent, entries]) => {
      const values = entries.map((entry) => Number(entry.value));
      const aggregateValue =
        definition.aggregation === "mean" ? d3.mean(values) ?? null : d3.sum(values);
      if (!Number.isFinite(Number(aggregateValue))) {
        return null;
      }

      const years = entries.map((entry) => entry.year).filter(Boolean);
      return {
        id: continent,
        label: continent,
        value: Number(aggregateValue),
        year: years.length ? Math.max(...years) : null,
        detail:
          definition.aggregation === "mean"
            ? `${entries.length}개국 평균`
            : `${entries.length}개국 합계`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.value) - Number(a.value));
}

function renderCountryStatsPanel() {
  if (!elements.countryStatsPanel) {
    return;
  }

  elements.countryStatsPanel.replaceChildren();

  if (state.mapVersion !== "world") {
    return;
  }

  if (!state.selected.length) {
    elements.countryStatsPanel.appendChild(
      createEmptyState("국가를 선택하면 수능특강 세계지리에서 자주 쓰는 인구·식량·종교·산업·에너지 통계를 여기서 바로 묶어 볼 수 있습니다."),
    );
    return;
  }

  const activeCountry = getActiveStatsCountry();
  const stats = activeCountry ? countryStatsById[activeCountry.id] ?? null : null;
  const selectedStatsRows = state.selected
    .map((country) => ({
      country,
      stats: countryStatsById[country.id] ?? null,
    }))
    .filter((entry) => entry.stats);
  const shell = document.createElement("div");
  shell.className = "country-stats-shell";

  if (state.selected.length > 1) {
    shell.appendChild(buildCountryStatsTabs(activeCountry?.id ?? null));
  }

  shell.appendChild(buildCountryStatsHeader(activeCountry, stats));
  shell.appendChild(buildCountryStatsSummaryGrid(stats));

  const sectionGrid = document.createElement("div");
  sectionGrid.className = "country-stats-section-grid";
  if (selectedStatsRows.length > 1) {
    sectionGrid.appendChild(buildSelectedCountriesComparisonSection(selectedStatsRows));
  }
  sectionGrid.append(
    buildPopulationStatsSection(stats?.population),
    buildPopulationStructureStatsSection(stats?.populationStructure, stats?.migration, stats?.population),
    buildReligionStatsSection(stats?.religion2020),
    buildCropStatsSection(stats?.agriculture?.crops),
    buildLivestockStatsSection(stats?.agriculture?.livestock),
    buildEconomyStatsSection(stats?.economy),
    buildEnergyStatsSection(
      stats?.energy?.consumption,
      "에너지 소비 구조",
      "최신 가용연도 기준 1차 에너지 소비량과 화석·재생·원자력 비중을 함께 정리했습니다.",
    ),
    buildEnergyStatsSection(
      stats?.energy?.electricity,
      "발전 구조",
      "최신 가용연도 기준 발전량과 발전원별 비중을 함께 정리했습니다.",
    ),
    buildFossilProductionStatsSection(stats?.energy?.fossilProduction),
  );
  shell.appendChild(sectionGrid);
  shell.appendChild(buildCountryStatsSourceRow());

  elements.countryStatsPanel.appendChild(shell);
}

function buildCountryStatsTabs(activeId) {
  const tabs = document.createElement("div");
  tabs.className = "country-stats-tabs";

  state.selected.forEach((country) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "country-stats-tab";
    button.classList.toggle("is-active", country.id === activeId);
    button.textContent = country.name;
    button.addEventListener("click", () => {
      state.activeStatsCountryId = country.id;
      renderSelectionViews();
    });
    tabs.appendChild(button);
  });

  return tabs;
}

function buildCountryStatsHeader(activeCountry, stats) {
  const header = document.createElement("div");
  header.className = "country-stats-header";

  const copy = document.createElement("div");
  const kicker = document.createElement("p");
  kicker.className = "tw-kicker";
  kicker.textContent = stats?.iso3
    ? `선택 국가 · ${stats.iso3}${stats?.continent?.name ? ` · ${stats.continent.name}` : ""}`
    : "선택 국가";
  const title = document.createElement("h4");
  title.className = "country-stats-header__title";
  title.textContent = activeCountry?.name ?? "통계 국가 없음";
  const tags = buildCountryStatsHeaderTags(stats);
  if (tags.length) {
    const tagRow = document.createElement("div");
    tagRow.className = "tw-meta-grid country-stats-header__tags";
    tags.forEach((text) => {
      const pill = document.createElement("span");
      pill.className = "tw-meta-pill";
      pill.textContent = text;
      tagRow.appendChild(pill);
    });
    copy.append(kicker, title, tagRow);
  } else {
    copy.append(kicker, title);
  }
  const description = document.createElement("p");
  description.className = "country-stats-header__meta";
  description.textContent = stats
    ? buildCountryStatsMetaText(stats)
    : "이 국가는 현재 로컬 통계 묶음에 포함된 항목이 적어 일부 그래프 카드만 표시될 수 있습니다.";
  copy.append(description);

  const note = document.createElement("div");
  note.className = "country-stats-source";
  note.innerHTML = `<strong>자료 기준</strong><br />${countryStatsMeta.generatedAt ?? "알 수 없음"} · 최신 가용연도 기준`;

  header.append(copy, note);
  return header;
}

function buildCountryStatsHeaderTags(stats) {
  if (!stats) {
    return [];
  }

  const tags = [];
  if (stats.continent?.name) {
    tags.push(stats.continent.name);
  }

  const latestPopulationRow = getLatestPopulationRow(stats.population);
  if (latestPopulationRow?.urbanShare != null) {
    tags.push(`도시화 ${formatPercent(latestPopulationRow.urbanShare)}`);
  }

  const topIndustry = Object.entries(stats.economy?.industry?.shares ?? {})
    .map(([key, value]) => ({
      label: countryStatsIndustryLabels[key] ?? key,
      value: Number(value) || 0,
    }))
    .sort((a, b) => b.value - a.value)[0];
  if (topIndustry?.value > 0) {
    tags.push(`${topIndustry.label} 중심`);
  }

  const topReligion = Object.entries(stats.religion2020?.shares ?? {})
    .map(([key, value]) => ({
      label: countryStatsReligionLabels[key] ?? key,
      value: Number(value) || 0,
    }))
    .sort((a, b) => b.value - a.value)[0];
  if (topReligion?.value > 0) {
    tags.push(`${topReligion.label} 우세`);
  }

  const renewablePowerShare = stats.energy?.electricity?.summaryShares?.renewables;
  if (renewablePowerShare != null) {
    tags.push(`재생전력 ${formatPercent(renewablePowerShare)}`);
  }

  return tags.slice(0, 5);
}

function buildCountryStatsMetaText(stats) {
  const parts = [];

  const populationYears = [stats.population?.latestYear, stats.population?.rates?.latestYear].filter(Boolean);
  if (populationYears.length) {
    parts.push(`인구 ${Math.max(...populationYears)}`);
  }

  const faostatYears = [
    ...getOrderedMetricEntries(stats.agriculture?.crops?.production, countryStatsCropOrder).map((entry) => entry.year),
    ...countryStatsCropOrder.flatMap((key) => {
      const entry = stats.agriculture?.crops?.trade?.[key];
      return [entry?.import?.year, entry?.export?.year];
    }),
    ...getOrderedMetricEntries(stats.agriculture?.livestock?.stocks, countryStatsLivestockOrder).map((entry) => entry.year),
    ...getOrderedMetricEntries(stats.agriculture?.livestock?.meat, countryStatsLivestockOrder).map((entry) => entry.year),
  ].filter(Boolean);
  if (faostatYears.length) {
    parts.push(`FAOSTAT ${Math.max(...faostatYears)}`);
  }

  if (stats.religion2020?.year) {
    parts.push(`종교 ${stats.religion2020.year}`);
  }

  if (stats.economy?.industry?.year || stats.economy?.exports?.shareOfGdp?.year || stats.economy?.exports?.valueCurrentUsd?.year) {
    const economyYear = Math.max(
      stats.economy?.industry?.year || 0,
      stats.economy?.exports?.shareOfGdp?.year || 0,
      stats.economy?.exports?.valueCurrentUsd?.year || 0,
    );
    if (economyYear) {
      parts.push(`경제 ${economyYear}`);
    }
  }

  if (stats.populationStructure?.year || stats.populationStructure?.density?.year) {
    const structureYear = Math.max(
      stats.populationStructure?.year || 0,
      stats.populationStructure?.density?.year || 0,
    );
    if (structureYear) {
      parts.push(`구조 ${structureYear}`);
    }
  }

  if (
    stats.migration?.migrantStockShare?.year ||
    stats.migration?.netMigration?.year ||
    stats.migration?.refugeeOriginTotal?.year ||
    stats.migration?.refugeeHostedTotal?.year
  ) {
    const migrationYear = Math.max(
      stats.migration?.migrantStockShare?.year || 0,
      stats.migration?.netMigration?.year || 0,
      stats.migration?.refugeeOriginTotal?.year || 0,
      stats.migration?.refugeeHostedTotal?.year || 0,
    );
    if (migrationYear) {
      parts.push(`이동 ${migrationYear}`);
    }
  }

  if (stats.energy?.consumption?.year) {
    parts.push(`에너지 ${stats.energy.consumption.year}`);
  }
  if (stats.energy?.fossilProduction?.year) {
    parts.push(`생산 ${stats.energy.fossilProduction.year}`);
  }

  if (!parts.length) {
    return "선택 국가의 세부 통계가 아직 준비되지 않았습니다.";
  }

  return `${parts.join(" · ")} 기준으로 묶은 통계입니다. 시계열·양·비중 그래프를 함께 보여주고, 여러 국가를 선택하면 비교 카드도 추가됩니다.`;
}

function buildCountryStatsSummaryGrid(stats) {
  const grid = document.createElement("div");
  grid.className = "country-stats-summary-grid";

  const latestPopulationRow = getLatestPopulationRow(stats?.population);
  const latestRateRow = getLatestPopulationRateRow(stats?.population);
  const cropTotals = getCropTotals(stats?.agriculture?.crops);
  const energySummary = stats?.energy?.consumption?.summaryShares ?? null;

  grid.append(
    createCountryStatsSummaryCard(
      "최신 인구",
      latestPopulationRow ? formatStatNumber(latestPopulationRow.population) : "자료 없음",
      latestPopulationRow ? `${latestPopulationRow.year}년` : "UN 최신 가용연도",
    ),
    createCountryStatsSummaryCard(
      "도시화율",
      latestPopulationRow?.urbanShare != null ? formatPercent(latestPopulationRow.urbanShare) : "자료 없음",
      latestPopulationRow?.urbanPopulation != null
        ? `도시 인구 ${formatStatNumber(latestPopulationRow.urbanPopulation)}명`
        : "도시 인구 추정치 없음",
    ),
    createCountryStatsSummaryCard(
      "자연적 증가율",
      latestRateRow?.naturalIncreaseRate != null ? formatPerThousand(latestRateRow.naturalIncreaseRate) : "자료 없음",
      latestRateRow
        ? `${latestRateRow.year}년 · 출생 ${formatPerThousand(latestRateRow.birthRate)} / 사망 ${formatPerThousand(latestRateRow.deathRate)}`
        : "최신 인구 변천 자료 없음",
    ),
    createCountryStatsSummaryCard(
      "3대 곡물 생산",
      cropTotals.productionTotal > 0 ? formatTonAmount(cropTotals.productionTotal) : "자료 없음",
      cropTotals.topCropLabel ? `${cropTotals.topCropLabel} 비중 ${formatPercent(cropTotals.topCropShare)}` : "FAOSTAT 최신 가용연도",
    ),
    createCountryStatsSummaryCard(
      "에너지 소비",
      energySummary ? `화석 ${formatPercent(energySummary.fossil)}` : "자료 없음",
      energySummary ? `재생 ${formatPercent(energySummary.renewables)} · 원자력 ${formatPercent(energySummary.nuclear)}` : "최신 가용연도 데이터 없음",
    ),
  );

  return grid;
}

function createCountryStatsSummaryCard(label, value, detail) {
  const card = document.createElement("div");
  card.className = "country-stats-summary-card";

  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  const valueNode = document.createElement("strong");
  valueNode.textContent = value;
  const detailNode = document.createElement("small");
  detailNode.textContent = detail;

  card.append(labelNode, valueNode, detailNode);
  return card;
}

function buildPopulationStatsSection(population) {
  const section = createCountryStatsSection(
    "인구 변천 · 도시화",
    "UN 기반 총인구·도시화 시계열과 출생률·사망률·자연적 증가율을 같이 정리해 인구 변천 단계를 읽기 쉽게 만들었습니다.",
  );

  if (!population?.rows?.length) {
    section.appendChild(createCountryStatsUnavailable("표시할 인구·도시화 시계열이 없습니다."));
    return section;
  }

  const latestRow = getLatestPopulationRow(population);
  const latestRateRow = getLatestPopulationRateRow(population);
  const rateRows = population?.rates?.rows ?? [];

  const metricGrid = document.createElement("div");
  metricGrid.className = "country-stats-metric-grid";
  metricGrid.append(
    createCountryStatsMetric(
      "최신 도시 인구",
      latestRow?.urbanPopulation != null ? formatStatNumber(latestRow.urbanPopulation) : "자료 없음",
      latestRow?.urbanShare != null ? `${latestRow.year}년 · ${formatPercent(latestRow.urbanShare)}` : "최신 가용연도",
    ),
    createCountryStatsMetric(
      "최신 촌락 인구",
      latestRow?.ruralPopulation != null ? formatStatNumber(latestRow.ruralPopulation) : "자료 없음",
      latestRow?.ruralShare != null ? `${latestRow.year}년 · ${formatPercent(latestRow.ruralShare)}` : "최신 가용연도",
    ),
    createCountryStatsMetric(
      "출생률",
      latestRateRow?.birthRate != null ? formatPerThousand(latestRateRow.birthRate) : "자료 없음",
      latestRateRow?.year ? `${latestRateRow.year}년` : "최신 가용연도",
    ),
    createCountryStatsMetric(
      "자연적 증가율",
      latestRateRow?.naturalIncreaseRate != null ? formatPerThousand(latestRateRow.naturalIncreaseRate) : "자료 없음",
      latestRateRow?.year ? `${latestRateRow.year}년 · 사망률 ${formatPerThousand(latestRateRow.deathRate)}` : "최신 가용연도",
    ),
  );
  section.appendChild(metricGrid);

  const chartGrid = document.createElement("div");
  chartGrid.className = "country-stats-chart-grid";
  chartGrid.append(
    buildLineChartCard({
      title: "총인구·도시·촌락 추이",
      description: "10년 단위와 최신 가용연도의 규모 변화를 한 번에 비교합니다.",
      series: [
        {
          key: "population",
          label: "총인구",
          color: countryStatsChartColors.population,
          points: population.rows.map((row) => ({ year: row.year, value: row.population })),
        },
        {
          key: "urbanPopulation",
          label: "도시 인구",
          color: countryStatsChartColors.urbanPopulation,
          points: population.rows.map((row) => ({ year: row.year, value: row.urbanPopulation })),
        },
        {
          key: "ruralPopulation",
          label: "촌락 인구",
          color: countryStatsChartColors.ruralPopulation,
          points: population.rows.map((row) => ({ year: row.year, value: row.ruralPopulation })),
        },
      ],
      valueFormatter: (value) => formatCompactStatNumber(value),
    }),
    buildShareCompositionCard({
      title: "최신 도시·촌락 구성",
      description: "최신 가용연도의 도시화율과 촌락 인구 비중입니다.",
      totalLabel: latestRow?.population != null ? `${latestRow.year}년 총인구 ${formatStatNumber(latestRow.population)}명` : null,
      segments: [
        {
          label: "도시",
          share: latestRow?.urbanShare,
          amountLabel: latestRow?.urbanPopulation != null ? `${formatStatNumber(latestRow.urbanPopulation)}명` : null,
          color: countryStatsChartColors.urbanPopulation,
        },
        {
          label: "촌락",
          share: latestRow?.ruralShare,
          amountLabel: latestRow?.ruralPopulation != null ? `${formatStatNumber(latestRow.ruralPopulation)}명` : null,
          color: countryStatsChartColors.ruralPopulation,
        },
      ],
    }),
  );
  if (rateRows.length) {
    chartGrid.append(
      buildLineChartCard({
        title: "출생률·사망률·자연적 증가율",
        description: "수능특강에서 자주 쓰는 인구 변천 지표를 같은 축에서 비교합니다.",
        series: [
          {
            key: "birthRate",
            label: "출생률",
            color: countryStatsChartColors.population,
            points: rateRows.map((row) => ({ year: row.year, value: row.birthRate })),
          },
          {
            key: "deathRate",
            label: "사망률",
            color: countryStatsChartColors.urbanPopulation,
            points: rateRows.map((row) => ({ year: row.year, value: row.deathRate })),
          },
          {
            key: "naturalIncreaseRate",
            label: "자연적 증가율",
            color: countryStatsChartColors.ruralPopulation,
            points: rateRows.map((row) => ({ year: row.year, value: row.naturalIncreaseRate })),
          },
        ],
        valueFormatter: (value) => formatPerThousand(value),
      }),
    );
  }
  section.appendChild(chartGrid);
  return section;
}

function buildCropStatsSection(crops) {
  const section = createCountryStatsSection(
    "주요 곡물 생산 · 무역",
    "FAOSTAT 최신 가용연도를 기준으로 밀·쌀·옥수수의 생산량, 생산 비중, 수출·수입량을 함께 정리했습니다.",
  );

  const productionEntries = getOrderedMetricEntries(crops?.production, countryStatsCropOrder);
  const tradeEntries = buildCropTradeChartEntries(crops?.trade);
  if (!productionEntries.length && !tradeEntries.length) {
    section.appendChild(createCountryStatsUnavailable("표시할 곡물 생산·무역 자료가 없습니다."));
    return section;
  }

  const totals = getCropTotals(crops);
  const metricGrid = document.createElement("div");
  metricGrid.className = "country-stats-metric-grid";
  metricGrid.append(
    createCountryStatsMetric(
      "생산 총량",
      totals.productionTotal > 0 ? formatTonAmount(totals.productionTotal) : "자료 없음",
      totals.productionYear ? `${totals.productionYear}년 기준` : "최신 가용연도",
    ),
    createCountryStatsMetric(
      "수입 총량",
      totals.importTotal > 0 ? formatTonAmount(totals.importTotal) : "자료 없음",
      totals.tradeYear ? `${totals.tradeYear}년 기준` : "최신 가용연도",
    ),
    createCountryStatsMetric(
      "수출 총량",
      totals.exportTotal > 0 ? formatTonAmount(totals.exportTotal) : "자료 없음",
      totals.tradeYear ? `${totals.tradeYear}년 기준` : "최신 가용연도",
    ),
  );
  section.appendChild(metricGrid);

  const chartGrid = document.createElement("div");
  chartGrid.className = "country-stats-chart-grid";
  chartGrid.append(
    buildAmountBarChartCard({
      title: "곡물별 생산량",
      description: "밀·쌀·옥수수의 최신 생산량입니다.",
      entries: productionEntries.map((entry) => ({
        label: entry.label,
        value: entry.value,
        detail: `${entry.year}년 · ${formatTonAmount(entry.value)}`,
        color: getCountryStatsColor(entry.key),
      })),
      valueFormatter: (value) => formatTonAmount(value),
    }),
    buildShareCompositionCard({
      title: "3대 곡물 생산 비중",
      description: "세 곡물 내부에서 어느 품목 비중이 큰지 바로 볼 수 있습니다.",
      totalLabel: totals.productionTotal > 0 ? `합계 ${formatTonAmount(totals.productionTotal)}` : null,
      segments: productionEntries.map((entry) => ({
        label: entry.label,
        share: totals.productionTotal > 0 ? (Number(entry.value) / totals.productionTotal) * 100 : null,
        amountLabel: `${formatTonAmount(entry.value)} · ${entry.year}년`,
        color: getCountryStatsColor(entry.key),
      })),
    }),
    buildAmountBarChartCard({
      title: "곡물별 수입·수출량",
      description: "Detailed Trade Matrix에서 집계한 최신 수입량과 수출량입니다.",
      entries: tradeEntries,
      valueFormatter: (value) => formatTonAmount(value),
    }),
  );
  section.appendChild(chartGrid);
  return section;
}

function buildLivestockStatsSection(livestock) {
  const section = createCountryStatsSection(
    "주요 가축 사육 · 육류 생산",
    "소·돼지·양의 사육 두수와 대응하는 육류 생산량을 최신 가용연도로 정리했습니다.",
  );

  const stockEntries = getOrderedMetricEntries(livestock?.stocks, countryStatsLivestockOrder);
  const meatEntries = getOrderedMetricEntries(livestock?.meat, countryStatsLivestockOrder);
  if (!stockEntries.length && !meatEntries.length) {
    section.appendChild(createCountryStatsUnavailable("표시할 가축 사육·육류 생산 자료가 없습니다."));
    return section;
  }

  const totals = getLivestockTotals(livestock);
  const metricGrid = document.createElement("div");
  metricGrid.className = "country-stats-metric-grid";
  metricGrid.append(
    createCountryStatsMetric(
      "사육 두수 합",
      totals.stockTotal > 0 ? formatCompactStatNumber(totals.stockTotal) : "자료 없음",
      totals.stockYear ? `${totals.stockYear}년 기준` : "최신 가용연도",
    ),
    createCountryStatsMetric(
      "육류 생산 합",
      totals.meatTotal > 0 ? formatTonAmount(totals.meatTotal) : "자료 없음",
      totals.meatYear ? `${totals.meatYear}년 기준` : "최신 가용연도",
    ),
    createCountryStatsMetric(
      "최대 육류 비중",
      totals.topMeatLabel ? `${totals.topMeatLabel} ${formatPercent(totals.topMeatShare)}` : "자료 없음",
      totals.meatYear ? `${totals.meatYear}년` : "최신 가용연도",
    ),
  );
  section.appendChild(metricGrid);

  const chartGrid = document.createElement("div");
  chartGrid.className = "country-stats-chart-grid";
  chartGrid.append(
    buildAmountBarChartCard({
      title: "가축별 사육 두수",
      description: "축종별 사육 규모를 두수 기준으로 비교합니다.",
      entries: stockEntries.map((entry) => ({
        label: entry.label,
        value: entry.value,
        detail: `${entry.year}년 · ${formatStatNumber(entry.value)}두`,
        color: getCountryStatsColor(entry.key),
      })),
      valueFormatter: (value) => formatCompactStatNumber(value),
    }),
    buildAmountBarChartCard({
      title: "육류 생산량",
      description: "소고기·돼지고기·양고기의 최신 생산량입니다.",
      entries: meatEntries.map((entry) => ({
        label: entry.label,
        value: entry.value,
        detail: `${entry.year}년 · ${formatTonAmount(entry.value)}`,
        color: getCountryStatsColor(entry.key),
      })),
      valueFormatter: (value) => formatTonAmount(value),
    }),
    buildShareCompositionCard({
      title: "육류 생산 비중",
      description: "세 육류 내부 구성 비중을 보여줍니다.",
      totalLabel: totals.meatTotal > 0 ? `합계 ${formatTonAmount(totals.meatTotal)}` : null,
      segments: meatEntries.map((entry) => ({
        label: entry.label,
        share: totals.meatTotal > 0 ? (Number(entry.value) / totals.meatTotal) * 100 : null,
        amountLabel: `${formatTonAmount(entry.value)} · ${entry.year}년`,
        color: getCountryStatsColor(entry.key),
      })),
    }),
  );
  section.appendChild(chartGrid);
  return section;
}

function buildReligionStatsSection(religion) {
  const section = createCountryStatsSection(
    "주요 종교 구성",
    "2020년 기준 종교 비중을 크리스트교·이슬람교·힌두교·불교 중심으로 정리합니다.",
  );

  if (!religion?.shares || !religion?.counts) {
    section.appendChild(createCountryStatsUnavailable("표시할 2020년 종교 통계가 없습니다."));
    return section;
  }

  const entries = Object.entries(religion.shares)
    .map(([key, value]) => ({
      key,
      label: countryStatsReligionLabels[key] ?? key,
      value: Number(value) || 0,
      count: Number(religion.counts?.[key]) || 0,
    }))
    .sort((a, b) => b.value - a.value)
    .filter((entry) => entry.value > 0);

  const focusEntries = countryStatsReligionFocusKeys
    .map((key) => {
      const value = Number(religion.shares?.[key]) || 0;
      const count = Number(religion.counts?.[key]) || 0;
      if (value <= 0 && count <= 0) {
        return null;
      }
      return {
        key,
        label: countryStatsReligionLabels[key] ?? key,
        value,
        count,
      };
    })
    .filter(Boolean);

  const remainderKeys = entries.map((entry) => entry.key).filter((key) => !countryStatsReligionFocusKeys.includes(key));
  const remainderValue = d3.sum(remainderKeys, (key) => Number(religion.shares?.[key]) || 0);
  const remainderCount = d3.sum(remainderKeys, (key) => Number(religion.counts?.[key]) || 0);
  const overviewEntries = [
    ...focusEntries,
    ...(remainderValue > 0 || remainderCount > 0
      ? [{
          key: "otherBlock",
          label: "기타·무종교",
          value: remainderValue,
          count: remainderCount,
        }]
      : []),
  ];
  const topFocusEntry = [...focusEntries].sort((a, b) => b.value - a.value)[0] ?? entries[0] ?? null;

  const metricGrid = document.createElement("div");
  metricGrid.className = "country-stats-metric-grid";
  metricGrid.append(
    createCountryStatsMetric(
      "2020 총인구",
      religion.totalPopulation != null ? formatStatNumber(religion.totalPopulation) : "자료 없음",
      religion.year ? `${religion.year}년 기준` : "Pew 2020",
    ),
    createCountryStatsMetric(
      "주요 종교 우세",
      topFocusEntry ? `${topFocusEntry.label} ${formatPercent(topFocusEntry.value)}` : "자료 없음",
      topFocusEntry?.count ? `${formatStatNumber(topFocusEntry.count)}명` : "신자 수 자료 없음",
    ),
  );
  section.appendChild(metricGrid);

  const chartGrid = document.createElement("div");
  chartGrid.className = "country-stats-chart-grid";
  chartGrid.append(
    buildShareCompositionCard({
      title: "4대 종교 중심 종교 비중",
      description: "크리스트교·이슬람교·힌두교·불교를 중심으로, 나머지는 기타·무종교로 묶어 봅니다.",
      totalLabel: religion.totalPopulation != null ? `2020년 총인구 ${formatStatNumber(religion.totalPopulation)}명` : null,
      segments: overviewEntries.map((entry) => ({
        label: entry.label,
        share: entry.value,
        amountLabel: entry.count ? `${formatStatNumber(entry.count)}명` : null,
        color: getCountryStatsColor(entry.key),
      })),
    }),
    buildAmountBarChartCard({
      title: "4대 종교 신자 수",
      description: "2020 총인구에 종교 비중을 반영한 추정 신자 수입니다.",
      entries: (focusEntries.length ? focusEntries : overviewEntries).map((entry) => ({
        label: entry.label,
        value: entry.count,
        detail: formatPercent(entry.value),
        color: getCountryStatsColor(entry.key),
      })),
      valueFormatter: (value) => formatCompactStatNumber(value),
    }),
  );
  section.appendChild(chartGrid);
  return section;
}

function buildEconomyStatsSection(economy) {
  const section = createCountryStatsSection(
    "산업 구조 · 무역",
    "World Bank 지표로 수출 규모와 수출 의존도, 산업 구조를 함께 정리했습니다.",
  );

  const exportValue = economy?.exports?.valueCurrentUsd;
  const exportShare = economy?.exports?.shareOfGdp;
  const industryShares = Object.entries(economy?.industry?.shares ?? {})
    .map(([key, value]) => ({
      key,
      label: countryStatsIndustryLabels[key] ?? key,
      value: Number(value) || 0,
    }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  if (!exportValue && !exportShare && !industryShares.length) {
    section.appendChild(createCountryStatsUnavailable("표시할 경제 구조 자료가 없습니다."));
    return section;
  }

  const metricGrid = document.createElement("div");
  metricGrid.className = "country-stats-metric-grid";
  metricGrid.append(
    createCountryStatsMetric(
      "수출액",
      exportValue ? formatCurrencyAmount(exportValue.value) : "자료 없음",
      exportValue?.year ? `${exportValue.year}년` : "최신 가용연도",
    ),
    createCountryStatsMetric(
      "수출 의존도",
      exportShare ? formatPercent(exportShare.value) : "자료 없음",
      exportShare?.year ? `${exportShare.year}년 · GDP 대비` : "최신 가용연도",
    ),
    createCountryStatsMetric(
      "최대 산업",
      industryShares[0] ? `${industryShares[0].label} ${formatPercent(industryShares[0].value)}` : "자료 없음",
      economy?.industry?.year ? `${economy.industry.year}년` : "산업 구조 자료 없음",
    ),
  );
  section.appendChild(metricGrid);

  const chartGrid = document.createElement("div");
  chartGrid.className = "country-stats-chart-grid";
  chartGrid.append(
    buildShareCompositionCard({
      title: "산업 구조",
      description: "농림어업·공업·서비스업의 GDP 비중입니다.",
      totalLabel: economy?.industry?.year ? `${economy.industry.year}년 기준` : null,
      segments: industryShares.map((entry) => ({
        label: entry.label,
        share: entry.value,
        amountLabel: `${formatPercent(entry.value)} · GDP 비중`,
        color: getCountryStatsColor(entry.key),
      })),
    }),
    buildStatListCard({
      title: "수출 지표",
      description: "수출 규모와 수출/GDP 비율을 함께 확인합니다.",
      rows: [
        exportValue
          ? {
              label: "수출액",
              value: formatCurrencyAmount(exportValue.value),
              detail: exportValue.year ? `${exportValue.year}년` : "최신값",
            }
          : null,
        exportShare
          ? {
              label: "수출 의존도",
              value: formatPercent(exportShare.value),
              detail: exportShare.year ? `${exportShare.year}년 · GDP 대비` : "최신값",
            }
          : null,
      ].filter(Boolean),
    }),
  );
  section.appendChild(chartGrid);
  return section;
}

function buildPopulationStructureStatsSection(populationStructure, migration, population) {
  const section = createCountryStatsSection(
    "인구 구조 · 이동",
    "연령 구조, 부양비, 인구 밀도, 국제이주민과 난민 관련 지표를 함께 보여줍니다.",
  );

  const totalPopulationForAgeCounts =
    Number(populationStructure?.totalPopulation) || Number(getLatestPopulationRow(population)?.population) || 0;
  const ageEntries = Object.entries(populationStructure?.shares ?? {})
    .map(([key, value]) => ({
      key,
      label: countryStatsAgeLabels[key] ?? key,
      share: Number(value) || 0,
      count:
        Number(populationStructure?.counts?.[key]) ||
        (totalPopulationForAgeCounts > 0
          ? (Number(value) || 0) * totalPopulationForAgeCounts / 100
          : 0),
    }))
    .filter((entry) => entry.share > 0)
    .sort((a, b) => b.share - a.share);

  if (
    !ageEntries.length &&
    !populationStructure?.density &&
    !migration?.migrantStockShare &&
    !migration?.netMigration &&
    !migration?.refugeeOriginTotal &&
    !migration?.refugeeHostedTotal
  ) {
    section.appendChild(createCountryStatsUnavailable("표시할 인구 구조·이동 자료가 없습니다."));
    return section;
  }

  const metricGrid = document.createElement("div");
  metricGrid.className = "country-stats-metric-grid";
  metricGrid.append(
    createCountryStatsMetric(
      "인구 밀도",
      populationStructure?.density?.value != null ? formatDensity(populationStructure.density.value) : "자료 없음",
      populationStructure?.density?.year ? `${populationStructure.density.year}년` : "최신 가용연도",
    ),
    createCountryStatsMetric(
      "총부양비",
      populationStructure?.dependencyRatios?.total != null ? formatIndexValue(populationStructure.dependencyRatios.total) : "자료 없음",
      populationStructure?.year ? `${populationStructure.year}년` : "최신 가용연도",
    ),
    createCountryStatsMetric(
      "국제이주민 비중",
      migration?.migrantStockShare?.value != null ? formatPercent(migration.migrantStockShare.value) : "자료 없음",
      migration?.migrantStockShare?.year ? `${migration.migrantStockShare.year}년` : "최신 가용연도",
    ),
    createCountryStatsMetric(
      "순이동",
      migration?.netMigration?.value != null ? formatCompactStatNumber(migration.netMigration.value) : "자료 없음",
      migration?.netMigration?.year ? `${migration.netMigration.year}년` : "최신 가용연도",
    ),
  );
  section.appendChild(metricGrid);

  const chartGrid = document.createElement("div");
  chartGrid.className = "country-stats-chart-grid";
  chartGrid.append(
    buildShareCompositionCard({
      title: "연령 구조",
      description: "0-14세, 15-64세, 65세 이상 비중입니다.",
      totalLabel:
        populationStructure?.totalPopulation != null
          ? `${populationStructure.year}년 총인구 ${formatStatNumber(populationStructure.totalPopulation)}명`
          : populationStructure?.year
            ? `${populationStructure.year}년 기준`
            : null,
      segments: ageEntries.map((entry) => ({
        label: entry.label,
        share: entry.share,
        amountLabel: entry.count ? `${formatStatNumber(entry.count)}명` : null,
        color: getCountryStatsColor(entry.key),
      })),
    }),
    buildAmountBarChartCard({
      title: "연령대별 인구",
      description: "가능한 경우 같은 연도의 총인구를 반영한 연령대별 인구 수입니다.",
      entries: ageEntries.map((entry) => ({
        label: entry.label,
        value: entry.count,
        detail: formatPercent(entry.share),
        color: getCountryStatsColor(entry.key),
      })),
      valueFormatter: (value) => formatCompactStatNumber(value),
    }),
    buildStatListCard({
      title: "부양비 지표",
      description: "유소년·노년·총부양비를 한 번에 확인합니다.",
      rows: [
        populationStructure?.dependencyRatios?.youth != null
          ? {
              label: "유소년 부양비",
              value: formatIndexValue(populationStructure.dependencyRatios.youth),
              detail: populationStructure?.year ? `${populationStructure.year}년` : "최신값",
            }
          : null,
        populationStructure?.dependencyRatios?.oldAge != null
          ? {
              label: "노년 부양비",
              value: formatIndexValue(populationStructure.dependencyRatios.oldAge),
              detail: populationStructure?.year ? `${populationStructure.year}년` : "최신값",
            }
          : null,
        populationStructure?.dependencyRatios?.total != null
          ? {
              label: "총부양비",
              value: formatIndexValue(populationStructure.dependencyRatios.total),
              detail: populationStructure?.year ? `${populationStructure.year}년` : "최신값",
            }
          : null,
      ].filter(Boolean),
    }),
    buildStatListCard({
      title: "이동·난민 지표",
      description: "국제이주민, 순이동, 난민 발생·수용 규모를 함께 봅니다.",
      rows: [
        migration?.migrantStockShare
          ? {
              label: "국제이주민 비중",
              value: formatPercent(migration.migrantStockShare.value),
              detail: migration.migrantStockTotal?.value != null
                ? `${formatStatNumber(migration.migrantStockTotal.value)}명 · ${migration.migrantStockShare.year}년`
                : `${migration.migrantStockShare.year}년`,
            }
          : null,
        migration?.netMigration
          ? {
              label: "순이동",
              value: formatCompactStatNumber(migration.netMigration.value),
              detail: migration.netMigration.year ? `${migration.netMigration.year}년` : "최신값",
            }
          : null,
        migration?.refugeeOriginTotal
          ? {
              label: "난민 발생 수",
              value: formatCompactStatNumber(migration.refugeeOriginTotal.value),
              detail: migration.refugeeOriginTotal.year ? `${migration.refugeeOriginTotal.year}년` : "최신값",
            }
          : null,
        migration?.refugeeHostedTotal
          ? {
              label: "난민 수용 수",
              value: formatCompactStatNumber(migration.refugeeHostedTotal.value),
              detail: migration.refugeeHostedTotal.year ? `${migration.refugeeHostedTotal.year}년` : "최신값",
            }
          : null,
      ].filter(Boolean),
    }),
  );
  section.appendChild(chartGrid);
  return section;
}

function buildEnergyStatsSection(entry, title, description) {
  const section = createCountryStatsSection(title, description);

  if (!entry) {
    section.appendChild(createCountryStatsUnavailable("표시할 최신 에너지 자료가 없습니다."));
    return section;
  }

  const summaryGrid = document.createElement("div");
  summaryGrid.className = "country-stats-metric-grid";
  summaryGrid.append(
    createCountryStatsMetric(
      "총량",
      formatEnergyAmount(entry.totalTWh),
      `${entry.year}년 기준`,
    ),
    createCountryStatsMetric("화석", formatPercent(entry.summaryShares?.fossil), `${formatEnergyAmount(entry.summaryAmountsTWh?.fossil)}`),
    createCountryStatsMetric("재생", formatPercent(entry.summaryShares?.renewables), `${formatEnergyAmount(entry.summaryAmountsTWh?.renewables)}`),
    createCountryStatsMetric(
      "원자력",
      formatPercent(entry.summaryShares?.nuclear),
      `${formatEnergyAmount(entry.summaryAmountsTWh?.nuclear)}`,
    ),
  );
  section.appendChild(summaryGrid);

  const breakdownEntries = Object.entries(entry.shareBreakdown ?? {})
    .map(([key, value]) => ({
      key,
      label: countryStatsEnergyLabels[key] ?? key,
      value: Number(value) || 0,
      amount: Number(entry.amountBreakdownTWh?.[key]) || 0,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const chartGrid = document.createElement("div");
  chartGrid.className = "country-stats-chart-grid";
  chartGrid.append(
    buildShareCompositionCard({
      title: `${title} 요약`,
      description: "화석·재생·원자력 3개 묶음으로 크게 본 구성입니다.",
      totalLabel: `${entry.year}년 총량 ${formatEnergyAmount(entry.totalTWh)}`,
      segments: [
        {
          label: "화석",
          share: entry.summaryShares?.fossil,
          amountLabel: formatEnergyAmount(entry.summaryAmountsTWh?.fossil),
          color: countryStatsChartColors.fossil,
        },
        {
          label: "재생",
          share: entry.summaryShares?.renewables,
          amountLabel: formatEnergyAmount(entry.summaryAmountsTWh?.renewables),
          color: countryStatsChartColors.renewables,
        },
        {
          label: "원자력",
          share: entry.summaryShares?.nuclear,
          amountLabel: formatEnergyAmount(entry.summaryAmountsTWh?.nuclear),
          color: countryStatsChartColors.nuclear,
        },
      ],
    }),
    buildAmountBarChartCard({
      title: `${title} 세부 구성`,
      description: "에너지원별 양과 비중을 함께 확인할 수 있습니다.",
      entries: breakdownEntries.map((item) => ({
        label: item.label,
        value: item.amount,
        detail: formatPercent(item.value),
        color: getCountryStatsColor(item.key),
      })),
      valueFormatter: (value) => formatEnergyAmount(value),
    }),
  );
  section.appendChild(chartGrid);

  return section;
}

function buildFossilProductionStatsSection(entry) {
  const section = createCountryStatsSection(
    "화석연료 생산",
    "석유·가스·석탄 생산량과 생산 내부 비중을 최신 가용연도로 정리했습니다.",
  );

  if (!entry) {
    section.appendChild(createCountryStatsUnavailable("표시할 화석연료 생산 자료가 없습니다."));
    return section;
  }

  const breakdownEntries = Object.entries(entry.shareBreakdown ?? {})
    .map(([key, value]) => ({
      key,
      label: countryStatsEnergyLabels[key] ?? key,
      value: Number(value) || 0,
      amount: Number(entry.amountBreakdownTWh?.[key]) || 0,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const metricGrid = document.createElement("div");
  metricGrid.className = "country-stats-metric-grid";
  metricGrid.append(
    createCountryStatsMetric("생산 총량", formatEnergyAmount(entry.totalTWh), `${entry.year}년 기준`),
    createCountryStatsMetric(
      "최대 생산원",
      breakdownEntries[0] ? `${breakdownEntries[0].label} ${formatPercent(breakdownEntries[0].value)}` : "자료 없음",
      breakdownEntries[0] ? formatEnergyAmount(breakdownEntries[0].amount) : "최신 가용연도",
    ),
  );
  section.appendChild(metricGrid);

  const chartGrid = document.createElement("div");
  chartGrid.className = "country-stats-chart-grid";
  chartGrid.append(
    buildShareCompositionCard({
      title: "화석연료 생산 비중",
      description: "화석연료 내부에서 어떤 에너지원이 중심인지 보여줍니다.",
      totalLabel: `${entry.year}년 총량 ${formatEnergyAmount(entry.totalTWh)}`,
      segments: breakdownEntries.map((item) => ({
        label: item.label,
        share: item.value,
        amountLabel: formatEnergyAmount(item.amount),
        color: getCountryStatsColor(item.key),
      })),
    }),
    buildAmountBarChartCard({
      title: "화석연료별 생산량",
      description: "최신 가용연도의 생산량을 TWh 환산 기준으로 비교합니다.",
      entries: breakdownEntries.map((item) => ({
        label: item.label,
        value: item.amount,
        detail: formatPercent(item.value),
        color: getCountryStatsColor(item.key),
      })),
      valueFormatter: (value) => formatEnergyAmount(value),
    }),
  );
  section.appendChild(chartGrid);
  return section;
}

function createCountryStatsSection(title, description) {
  const section = document.createElement("article");
  section.className = "country-stats-section";

  const titleNode = document.createElement("h4");
  titleNode.textContent = title;
  const descriptionNode = document.createElement("p");
  descriptionNode.textContent = description;

  section.append(titleNode, descriptionNode);
  return section;
}

function createCountryStatsMetric(label, value, detail) {
  const card = document.createElement("div");
  card.className = "country-stats-metric";

  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  const valueNode = document.createElement("strong");
  valueNode.textContent = value;
  const detailNode = document.createElement("small");
  detailNode.textContent = detail;

  card.append(labelNode, valueNode, detailNode);
  return card;
}

function createCountryStatsUnavailable(message) {
  return createEmptyState(message);
}

function buildSelectedCountriesComparisonSection(selectedStatsRows) {
  const section = createCountryStatsSection(
    "선택 국가 비교",
    "여러 국가를 켰을 때 최신값을 같은 눈금에서 바로 비교할 수 있도록 핵심 지표를 나란히 보여줍니다.",
  );

  const chartGrid = document.createElement("div");
  chartGrid.className = "country-stats-chart-grid";
  chartGrid.append(
    buildAmountBarChartCard({
      title: "최신 총인구",
      description: "선택 국가들의 최신 총인구 비교입니다.",
      entries: selectedStatsRows
        .map(({ country, stats }) => {
          const row = getLatestPopulationRow(stats?.population);
          return row
            ? {
                label: country.name,
                value: row.population,
                detail: `${row.year}년`,
                color: country.color || countryStatsChartColors.population,
              }
            : null;
        })
        .filter(Boolean)
        .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)),
      valueFormatter: (value) => formatCompactStatNumber(value),
    }),
    buildAmountBarChartCard({
      title: "최신 도시화율",
      description: "도시화율만 따로 놓고 비교합니다.",
      entries: selectedStatsRows
        .map(({ country, stats }) => {
          const row = getLatestPopulationRow(stats?.population);
          return row?.urbanShare != null
            ? {
                label: country.name,
                value: row.urbanShare,
                detail: `${row.year}년`,
                color: country.color || countryStatsChartColors.urbanPopulation,
              }
            : null;
        })
        .filter(Boolean)
        .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)),
      valueFormatter: (value) => formatPercent(value),
    }),
    buildAmountBarChartCard({
      title: "3대 곡물 생산 합",
      description: "밀·쌀·옥수수 생산량 합계 비교입니다.",
      entries: selectedStatsRows
        .map(({ country, stats }) => {
          const totals = getCropTotals(stats?.agriculture?.crops);
          return totals.productionTotal > 0
            ? {
                label: country.name,
                value: totals.productionTotal,
                detail: totals.productionYear ? `${totals.productionYear}년` : "최신 가용연도",
                color: country.color || countryStatsChartColors.maize,
              }
            : null;
        })
        .filter(Boolean)
        .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)),
      valueFormatter: (value) => formatTonAmount(value),
    }),
    buildAmountBarChartCard({
      title: "육류 생산 합",
      description: "소·돼지·양 육류 생산량 합계 비교입니다.",
      entries: selectedStatsRows
        .map(({ country, stats }) => {
          const totals = getLivestockTotals(stats?.agriculture?.livestock);
          return totals.meatTotal > 0
            ? {
                label: country.name,
                value: totals.meatTotal,
                detail: totals.meatYear ? `${totals.meatYear}년` : "최신 가용연도",
                color: country.color || countryStatsChartColors.cattle,
              }
            : null;
        })
        .filter(Boolean)
        .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)),
      valueFormatter: (value) => formatTonAmount(value),
    }),
    buildAmountBarChartCard({
      title: "1차 에너지 화석 비중",
      description: "에너지 소비 구조에서 화석 비중만 뽑아 비교합니다.",
      entries: selectedStatsRows
        .map(({ country, stats }) => {
          const share = stats?.energy?.consumption?.summaryShares?.fossil;
          const year = stats?.energy?.consumption?.year;
          return share != null
            ? {
                label: country.name,
                value: share,
                detail: year ? `${year}년` : "최신 가용연도",
                color: country.color || countryStatsChartColors.fossil,
              }
            : null;
        })
        .filter(Boolean)
        .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)),
      valueFormatter: (value) => formatPercent(value),
    }),
    buildAmountBarChartCard({
      title: "발전량",
      description: "최신 가용연도 기준 총발전량 비교입니다.",
      entries: selectedStatsRows
        .map(({ country, stats }) => {
          const total = stats?.energy?.electricity?.totalTWh;
          const year = stats?.energy?.electricity?.year;
          return total != null
            ? {
                label: country.name,
                value: total,
                detail: year ? `${year}년` : "최신 가용연도",
                color: country.color || countryStatsChartColors.hydropower,
              }
            : null;
        })
        .filter(Boolean)
        .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)),
      valueFormatter: (value) => formatEnergyAmount(value),
    }),
  );

  section.appendChild(chartGrid);
  return section;
}

function buildCountryStatsSourceRow() {
  const row = document.createElement("div");
  row.className = "country-stats-source-row";

  [
    "population",
    "populationRates",
    "urbanization",
    "faostatProduction",
    "faostatTrade",
    "religion",
    "continents",
    "worldBankExports",
    "worldBankIndustry",
    "worldBankPopulationStructure",
    "worldBankPopulationContext",
    "worldBankMigration",
    "unhcrRefugees",
    "primaryEnergy",
    "electricityMix",
    "fossilProduction",
  ].forEach((key) => {
    const source = countryStatsMeta.sources?.[key];
    if (!source?.url) {
      return;
    }

    const card = document.createElement("div");
    card.className = "country-stats-source";
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = source.label;
    card.appendChild(link);
    row.appendChild(card);
  });

  return row;
}

function getLatestPopulationRow(population) {
  if (!population?.rows?.length) {
    return null;
  }

  return population.rows[population.rows.length - 1];
}

function getPopulationRateRow(population, year) {
  return population?.rates?.rows?.find((row) => row.year === Number(year)) ?? null;
}

function getLatestPopulationRateRow(population) {
  if (!population?.rates?.rows?.length) {
    return null;
  }

  return population.rates.rows[population.rates.rows.length - 1];
}

function getMetricFromPopulation(stats, key) {
  const row = getLatestPopulationRow(stats?.population);
  const value = row?.[key];
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return {
    value: Number(value),
    year: row.year,
    detail: row.year ? `${row.year}년` : "최신 인구 자료",
  };
}

function getMetricFromPopulationRate(stats, key) {
  const row = getLatestPopulationRateRow(stats?.population);
  const value = row?.[key];
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return {
    value,
    year: row.year,
    detail: row.year ? `${row.year}년` : "최신 인구 변천 자료",
  };
}

function getCropAggregateMetric(stats, key) {
  const totals = getCropTotals(stats?.agriculture?.crops);
  const value = totals?.[key];
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return {
    value: Number(value),
    year: key === "productionTotal" ? totals.productionYear : totals.tradeYear,
    detail: key === "productionTotal" ? "밀·쌀·옥수수 합계" : "세 곡물 교역 합계",
  };
}

function getNamedCropMetric(stats, cropKey, metricKey) {
  const entry = metricKey === "production"
    ? stats?.agriculture?.crops?.production?.[cropKey]
    : stats?.agriculture?.crops?.trade?.[cropKey]?.[metricKey];
  if (!Number.isFinite(Number(entry?.value))) {
    return null;
  }

  return {
    value: Number(entry.value),
    year: entry.year ?? null,
    detail: entry.label ?? cropKey,
  };
}

function getCropExportRatioMetric(stats, cropKey) {
  const productionValue = Number(stats?.agriculture?.crops?.production?.[cropKey]?.value);
  const exportValue = Number(stats?.agriculture?.crops?.trade?.[cropKey]?.export?.value);
  if (!Number.isFinite(productionValue) || productionValue <= 0 || !Number.isFinite(exportValue)) {
    return null;
  }

  return {
    value: exportValue / productionValue * 100,
    year: Math.max(
      stats?.agriculture?.crops?.production?.[cropKey]?.year || 0,
      stats?.agriculture?.crops?.trade?.[cropKey]?.export?.year || 0,
    ) || null,
    detail: `${countryStatsCropLabels[cropKey] ?? cropKey} 생산 대비 수출`,
  };
}

function getLivestockAggregateMetric(stats, key) {
  const totals = getLivestockTotals(stats?.agriculture?.livestock);
  const value = totals?.[key];
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return {
    value: Number(value),
    year: key === "stockTotal" ? totals.stockYear : totals.meatYear,
    detail: key === "stockTotal" ? "소·돼지·양 합계" : "세 육류 합계",
  };
}

function getNamedLivestockMetric(stats, livestockKey, metricKey) {
  const entry = stats?.agriculture?.livestock?.[metricKey]?.[livestockKey];
  if (!Number.isFinite(Number(entry?.value))) {
    return null;
  }

  return {
    value: Number(entry.value),
    year: entry.year ?? null,
    detail: entry.label ?? livestockKey,
  };
}

function getReligionMetric(stats, religionKey) {
  const value = stats?.religion2020?.shares?.[religionKey];
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return {
    value: Number(value),
    year: stats?.religion2020?.year ?? null,
    detail: countryStatsReligionLabels[religionKey] ?? religionKey,
  };
}

function getNestedMetricValue(source, path) {
  return path.split(".").reduce((currentValue, segment) => currentValue?.[segment], source);
}

function getEnergyMetric(stats, bucketKey, path) {
  const source = bucketKey === "fossilProduction" ? stats?.energy?.fossilProduction : stats?.energy?.[bucketKey];
  const value = getNestedMetricValue(source, path);
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return {
    value: Number(value),
    year: source?.year ?? null,
    detail: source?.year ? `${source.year}년` : "최신 에너지 자료",
  };
}

function getExportMetric(stats, key) {
  const entry = stats?.economy?.exports?.[key];
  if (!Number.isFinite(Number(entry?.value))) {
    return null;
  }

  return {
    value: Number(entry.value),
    year: entry.year ?? null,
    detail: entry.label ?? "수출 지표",
  };
}

function getIndustryMetric(stats, key) {
  const entry = stats?.economy?.industry;
  const value = entry?.shares?.[key];
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return {
    value: Number(value),
    year: entry.year ?? null,
    detail: countryStatsIndustryLabels[key] ?? key,
  };
}

function getPopulationStructureMetric(stats, key) {
  const entry = stats?.populationStructure;
  const value = entry?.shares?.[key];
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return {
    value: Number(value),
    year: entry.year ?? null,
    detail: countryStatsAgeLabels[key] ?? key,
  };
}

function getPopulationDensityMetric(stats) {
  const entry = stats?.populationStructure?.density;
  if (!Number.isFinite(Number(entry?.value))) {
    return null;
  }

  return {
    value: Number(entry.value),
    year: entry.year ?? null,
    detail: entry.label ?? "인구 밀도",
  };
}

function getPopulationDependencyMetric(stats, key) {
  const entry = stats?.populationStructure;
  const value = entry?.dependencyRatios?.[key];
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return {
    value: Number(value),
    year: entry.year ?? null,
    detail: countryStatsDependencyLabels[key] ?? key,
  };
}

function getMigrationMetric(stats, key) {
  const entry = stats?.migration?.[key];
  if (!Number.isFinite(Number(entry?.value))) {
    return null;
  }

  return {
    value: Number(entry.value),
    year: entry.year ?? null,
    detail: entry.label ?? key,
  };
}

function getRefugeeMetric(stats, key) {
  const entry = stats?.migration?.[key];
  if (!Number.isFinite(Number(entry?.value))) {
    return null;
  }

  return {
    value: Number(entry.value),
    year: entry.year ?? null,
    detail: entry.label ?? key,
  };
}

function getEnergyPerCapitaMetric(stats, bucketKey = "consumption") {
  const energyEntry = bucketKey === "electricity" ? stats?.energy?.electricity : stats?.energy?.consumption;
  const populationRow = getLatestPopulationRow(stats?.population);
  const total = Number(energyEntry?.totalTWh);
  const population = Number(populationRow?.population);
  if (!Number.isFinite(total) || !Number.isFinite(population) || population <= 0) {
    return null;
  }

  return {
    value: total * 1_000_000 / population,
    year: energyEntry?.year ?? populationRow?.year ?? null,
    detail: "1인당 소비량",
  };
}

function formatStatNumber(value, maximumFractionDigits = 0) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  return Number(value).toLocaleString("ko-KR", {
    maximumFractionDigits,
  });
}

function formatPercent(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  return `${Number(value).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;
}

function formatFaostatUnit(unit) {
  return unit === "An" ? "두" : unit || "";
}

function formatPerThousand(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  return `${Number(value).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}\u2030`;
}

function formatTonAmount(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  return `${formatCompactStatNumber(value)}t`;
}

function formatCurrencyAmount(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  const numericValue = Number(value);
  const absoluteValue = Math.abs(numericValue);
  if (absoluteValue >= 1_000_000_000_000) {
    return `$${(numericValue / 1_000_000_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}T`;
  }
  if (absoluteValue >= 1_000_000_000) {
    return `$${(numericValue / 1_000_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}B`;
  }
  if (absoluteValue >= 1_000_000) {
    return `$${(numericValue / 1_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}M`;
  }
  return `$${numericValue.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}`;
}

function formatRelativeIndex(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  return Number(value).toLocaleString("ko-KR", {
    maximumFractionDigits: 1,
  });
}

function formatEnergyAmount(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  return `${formatCompactStatNumber(value)} TWh`;
}

function formatEnergyPerCapita(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  return `${Number(value).toLocaleString("ko-KR", { maximumFractionDigits: 2 })} MWh/명`;
}

function formatDensity(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  return `${Number(value).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}명/km²`;
}

function formatIndexValue(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  return Number(value).toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function formatCompactStatNumber(value, maximumFractionDigits = 1) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  const numericValue = Number(value);
  const absoluteValue = Math.abs(numericValue);
  if (absoluteValue >= 1_000_000_000_000) {
    return `${(numericValue / 1_000_000_000_000).toLocaleString("ko-KR", { maximumFractionDigits })}조`;
  }
  if (absoluteValue >= 100_000_000) {
    return `${(numericValue / 100_000_000).toLocaleString("ko-KR", { maximumFractionDigits })}억`;
  }
  if (absoluteValue >= 10_000) {
    return `${(numericValue / 10_000).toLocaleString("ko-KR", { maximumFractionDigits })}만`;
  }
  return numericValue.toLocaleString("ko-KR", { maximumFractionDigits });
}

function formatSignedDelta(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  const numericValue = Number(value);
  const prefix = numericValue > 0 ? "+" : "";
  return `${prefix}${numericValue.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;
}

function getCountryStatsColor(key) {
  return countryStatsChartColors[key] ?? "#111111";
}

function getCountryStatsVisual(index = 0) {
  return countryStatsVisualDefinitions[((index % countryStatsVisualDefinitions.length) + countryStatsVisualDefinitions.length) % countryStatsVisualDefinitions.length];
}

function applyCountryStatsPatternStyle(node, visual) {
  if (!node || !visual) {
    return;
  }

  node.style.background = visual.background;
  node.style.backgroundRepeat = "repeat";
  node.style.backgroundSize = "auto";
}

function getOrderedMetricEntries(map, order) {
  return order
    .map((key) => {
      const entry = map?.[key];
      return entry ? { key, ...entry } : null;
    })
    .filter(Boolean);
}

function computeChangePercent(start, end) {
  if (!Number.isFinite(Number(start)) || !Number.isFinite(Number(end)) || Number(start) === 0) {
    return null;
  }

  return ((Number(end) - Number(start)) / Number(start)) * 100;
}

function getCropTotals(crops) {
  const productionEntries = getOrderedMetricEntries(crops?.production, countryStatsCropOrder);
  const tradeEntries = countryStatsCropOrder.map((key) => ({ key, ...crops?.trade?.[key] })).filter((entry) => entry.label);
  const productionTotal = productionEntries.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
  const importTotal = tradeEntries.reduce((sum, entry) => sum + (Number(entry.import?.value) || 0), 0);
  const exportTotal = tradeEntries.reduce((sum, entry) => sum + (Number(entry.export?.value) || 0), 0);
  const topCrop = productionEntries
    .map((entry) => ({
      label: entry.label,
      value: Number(entry.value) || 0,
    }))
    .sort((a, b) => b.value - a.value)[0];

  return {
    productionEntries,
    tradeEntries,
    productionTotal,
    importTotal,
    exportTotal,
    productionYear: productionEntries.length ? Math.max(...productionEntries.map((entry) => entry.year || 0)) : null,
    tradeYear: tradeEntries.length
      ? Math.max(
          ...tradeEntries.flatMap((entry) => [entry.import?.year || 0, entry.export?.year || 0]),
        )
      : null,
    topCropLabel: topCrop?.label ?? null,
    topCropShare: productionTotal > 0 && topCrop ? (topCrop.value / productionTotal) * 100 : null,
  };
}

function getLivestockTotals(livestock) {
  const stockEntries = getOrderedMetricEntries(livestock?.stocks, countryStatsLivestockOrder);
  const meatEntries = getOrderedMetricEntries(livestock?.meat, countryStatsLivestockOrder);
  const stockTotal = stockEntries.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
  const meatTotal = meatEntries.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
  const topMeat = meatEntries
    .map((entry) => ({
      label: entry.label,
      value: Number(entry.value) || 0,
    }))
    .sort((a, b) => b.value - a.value)[0];

  return {
    stockEntries,
    meatEntries,
    stockTotal,
    meatTotal,
    stockYear: stockEntries.length ? Math.max(...stockEntries.map((entry) => entry.year || 0)) : null,
    meatYear: meatEntries.length ? Math.max(...meatEntries.map((entry) => entry.year || 0)) : null,
    topMeatLabel: topMeat?.label ?? null,
    topMeatShare: meatTotal > 0 && topMeat ? (topMeat.value / meatTotal) * 100 : null,
  };
}

function buildCropTradeChartEntries(tradeMap) {
  return countryStatsCropOrder.flatMap((key) => {
    const entry = tradeMap?.[key];
    if (!entry) {
      return [];
    }

    const color = getCountryStatsColor(key);
    const rows = [];
    if (entry.import?.value != null) {
      rows.push({
        label: `${entry.label} 수입`,
        value: entry.import.value,
        detail: `${entry.import.year}년`,
        color,
      });
    }
    if (entry.export?.value != null) {
      rows.push({
        label: `${entry.label} 수출`,
        value: entry.export.value,
        detail: `${entry.export.year}년`,
        color,
      });
    }
    return rows;
  });
}

function buildChartCardShell(title, description) {
  const card = document.createElement("div");
  card.className = "country-stats-chart-card";

  const titleNode = document.createElement("h5");
  titleNode.className = "country-stats-chart-card__title";
  titleNode.textContent = title;
  card.appendChild(titleNode);

  if (description) {
    const descriptionNode = document.createElement("p");
    descriptionNode.className = "country-stats-chart-card__meta";
    descriptionNode.textContent = description;
    card.appendChild(descriptionNode);
  }

  return card;
}

function buildLineChartCard({ title, description, series, valueFormatter }) {
  const card = buildChartCardShell(title, description);
  const validSeries = series
    .map((entry) => ({
      ...entry,
      points: (entry.points ?? [])
        .filter((point) => point?.year != null && Number.isFinite(Number(point.value)))
        .sort((a, b) => a.year - b.year),
    }))
    .filter((entry) => entry.points.length >= 2);

  if (!validSeries.length) {
    card.appendChild(createCountryStatsUnavailable("표시할 시계열 그래프가 없습니다."));
    return card;
  }

  const years = [...new Set(validSeries.flatMap((entry) => entry.points.map((point) => point.year)))].sort((a, b) => a - b);
  const allValues = validSeries.flatMap((entry) => entry.points.map((point) => Number(point.value)));
  let minimumValue = Math.min(...allValues);
  let maximumValue = Math.max(...allValues);
  if (minimumValue === maximumValue) {
    minimumValue = 0;
    maximumValue = maximumValue || 1;
  }

  const width = 340;
  const height = 192;
  const plot = { left: 24, right: 12, top: 16, bottom: 28 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const yearStep = years.length > 1 ? plotWidth / (years.length - 1) : 0;

  const yearToX = new Map(years.map((year, index) => [year, plot.left + yearStep * index]));
  const valueToY = (value) => plot.top + (maximumValue - Number(value)) / (maximumValue - minimumValue) * plotHeight;

  const svg = createSvgElement("svg");
  svg.setAttribute("class", "country-stats-line-chart");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", title);

  for (let index = 0; index < 4; index += 1) {
    const y = plot.top + (plotHeight / 3) * index;
    const line = createSvgElement("line");
    line.setAttribute("x1", String(plot.left));
    line.setAttribute("x2", String(width - plot.right));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("class", "country-stats-line-chart__grid");
    svg.appendChild(line);
  }

  const axisTop = createSvgElement("text");
  axisTop.setAttribute("x", String(plot.left));
  axisTop.setAttribute("y", "11");
  axisTop.setAttribute("class", "country-stats-line-chart__label");
  axisTop.textContent = valueFormatter(maximumValue);
  svg.appendChild(axisTop);

  const axisBottom = createSvgElement("text");
  axisBottom.setAttribute("x", String(plot.left));
  axisBottom.setAttribute("y", String(height - 4));
  axisBottom.setAttribute("class", "country-stats-line-chart__label");
  axisBottom.textContent = valueFormatter(minimumValue);
  svg.appendChild(axisBottom);

  validSeries.forEach((entry, entryIndex) => {
    const visual = getCountryStatsVisual(entryIndex);
    const polyline = createSvgElement("polyline");
    polyline.setAttribute(
      "points",
      entry.points.map((point) => `${yearToX.get(point.year)},${valueToY(point.value)}`).join(" "),
    );
    polyline.setAttribute("class", "country-stats-line-chart__path");
    polyline.setAttribute("stroke", visual.stroke || entry.color || "#111111");
    if (visual.dasharray) {
      polyline.setAttribute("stroke-dasharray", visual.dasharray);
    }
    svg.appendChild(polyline);

    entry.points.forEach((point) => {
      const dot = createSvgElement("circle");
      dot.setAttribute("cx", String(yearToX.get(point.year)));
      dot.setAttribute("cy", String(valueToY(point.value)));
      dot.setAttribute("r", "3");
      dot.setAttribute("fill", visual.stroke || entry.color || "#111111");
      svg.appendChild(dot);
    });
  });

  years.forEach((year, index) => {
    if (years.length > 6 && index !== 0 && index !== years.length - 1 && index % 2 === 1) {
      return;
    }
    const label = createSvgElement("text");
    label.setAttribute("x", String(yearToX.get(year)));
    label.setAttribute("y", String(height - 10));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "country-stats-line-chart__year");
    label.textContent = String(year);
    svg.appendChild(label);
  });

  card.appendChild(svg);

  const legend = document.createElement("div");
  legend.className = "country-stats-line-legend";
  validSeries.forEach((entry, entryIndex) => {
    const latestPoint = entry.points[entry.points.length - 1];
    const visual = getCountryStatsVisual(entryIndex);
    const item = document.createElement("div");
    item.className = "country-stats-line-legend__item";
    const swatch = document.createElement("span");
    swatch.className = "country-stats-line-legend__swatch";
    applyCountryStatsPatternStyle(swatch, visual);
    const label = document.createElement("span");
    label.textContent = `${entry.label} ${valueFormatter(latestPoint.value)}`;
    item.append(swatch, label);
    legend.appendChild(item);
  });
  card.appendChild(legend);

  return card;
}

function buildAmountBarChartCard({ title, description, entries, valueFormatter }) {
  const card = buildChartCardShell(title, description);
  const validEntries = (entries ?? [])
    .filter((entry) => Number.isFinite(Number(entry?.value)))
    .filter((entry) => Number(entry.value) >= 0);

  if (!validEntries.length) {
    card.appendChild(createCountryStatsUnavailable("표시할 막대 그래프가 없습니다."));
    return card;
  }

  const bars = document.createElement("div");
  bars.className = "country-stats-bars";
  const maximumValue = Math.max(...validEntries.map((entry) => Number(entry.value)));

  validEntries.forEach((entry, entryIndex) => {
    const visual = getCountryStatsVisual(entryIndex);
    const wrapper = document.createElement("div");
    wrapper.className = "country-stats-bar";

    const head = document.createElement("div");
    head.className = "country-stats-bar__head";
    const labelNode = document.createElement("span");
    labelNode.textContent = entry.label;
    const valueNode = document.createElement("strong");
    valueNode.textContent = valueFormatter(entry.value);
    head.append(labelNode, valueNode);

    const track = document.createElement("div");
    track.className = "country-stats-bar__track";
    const fill = document.createElement("div");
    fill.className = "country-stats-bar__fill";
    fill.style.width = `${maximumValue > 0 ? (Number(entry.value) / maximumValue) * 100 : 0}%`;
    applyCountryStatsPatternStyle(fill, visual);
    track.appendChild(fill);

    wrapper.append(head, track);
    if (entry.detail) {
      const detailNode = document.createElement("small");
      detailNode.className = "country-stats-bar__detail";
      detailNode.textContent = entry.detail;
      wrapper.appendChild(detailNode);
    }
    bars.appendChild(wrapper);
  });

  card.appendChild(bars);
  return card;
}

function buildShareCompositionCard({ title, description, totalLabel, segments }) {
  const card = buildChartCardShell(title, description);
  const validSegments = (segments ?? [])
    .filter((segment) => Number.isFinite(Number(segment?.share)))
    .filter((segment) => Number(segment.share) > 0)
    .sort((a, b) => Number(b.share) - Number(a.share));

  if (!validSegments.length) {
    card.appendChild(createCountryStatsUnavailable("표시할 비중 그래프가 없습니다."));
    return card;
  }

  if (totalLabel) {
    const totalNode = document.createElement("small");
    totalNode.className = "country-stats-chart-card__total";
    totalNode.textContent = totalLabel;
    card.appendChild(totalNode);
  }

  const stack = document.createElement("div");
  stack.className = "country-stats-stacked-bar";
  validSegments.forEach((segment, segmentIndex) => {
    const visual = getCountryStatsVisual(segmentIndex);
    const block = document.createElement("div");
    block.className = "country-stats-stacked-bar__segment";
    block.style.width = `${clamp(Number(segment.share) || 0, 0, 100)}%`;
    applyCountryStatsPatternStyle(block, visual);
    block.title = `${segment.label} ${formatPercent(segment.share)}`;
    stack.appendChild(block);
  });
  card.appendChild(stack);

  const breakdown = document.createElement("div");
  breakdown.className = "country-stats-breakdown-list";
  validSegments.forEach((segment, segmentIndex) => {
    const visual = getCountryStatsVisual(segmentIndex);
    const row = document.createElement("div");
    row.className = "country-stats-breakdown-row";

    const head = document.createElement("div");
    head.className = "country-stats-breakdown-row__head";
    const labelWrap = document.createElement("div");
    labelWrap.className = "country-stats-breakdown-row__label";
    const swatch = document.createElement("span");
    swatch.className = "country-stats-breakdown-row__swatch";
    applyCountryStatsPatternStyle(swatch, visual);
    const labelNode = document.createElement("span");
    labelNode.textContent = segment.label;
    labelWrap.append(swatch, labelNode);

    const valueNode = document.createElement("strong");
    valueNode.textContent = formatPercent(segment.share);
    head.append(labelWrap, valueNode);
    row.appendChild(head);

    if (segment.amountLabel) {
      const detailNode = document.createElement("small");
      detailNode.className = "country-stats-breakdown-row__detail";
      detailNode.textContent = segment.amountLabel;
      row.appendChild(detailNode);
    }
    breakdown.appendChild(row);
  });
  card.appendChild(breakdown);

  return card;
}

function buildScatterChartCard({ title, description, entries, xLabel, yLabel, xFormatter, yFormatter, sizeFormatter }) {
  const card = buildChartCardShell(title, description);
  const validEntries = (entries ?? [])
    .filter((entry) => Number.isFinite(Number(entry?.xValue)) && Number.isFinite(Number(entry?.yValue)))
    .filter((entry) => Number.isFinite(Number(entry?.sizeValue)) && Number(entry.sizeValue) >= 0);

  if (!validEntries.length) {
    card.appendChild(createCountryStatsUnavailable("표시할 산포도 자료가 없습니다."));
    return card;
  }

  let minX = Math.min(...validEntries.map((entry) => Number(entry.xValue)));
  let maxX = Math.max(...validEntries.map((entry) => Number(entry.xValue)));
  let minY = Math.min(...validEntries.map((entry) => Number(entry.yValue)));
  let maxY = Math.max(...validEntries.map((entry) => Number(entry.yValue)));
  if (minX === maxX) {
    minX -= 1;
    maxX += 1;
  }
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }

  const maximumBubbleValue = Math.max(...validEntries.map((entry) => Number(entry.sizeValue)), 1);
  const width = 360;
  const height = 244;
  const plot = { left: 44, right: 18, top: 16, bottom: 34 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const xToPosition = (value) => plot.left + ((Number(value) - minX) / (maxX - minX)) * plotWidth;
  const yToPosition = (value) => plot.top + (1 - (Number(value) - minY) / (maxY - minY)) * plotHeight;
  const radiusForValue = (value) => 4 + Math.sqrt(Math.max(0, Number(value)) / maximumBubbleValue) * 12;

  const svg = createSvgElement("svg");
  svg.setAttribute("class", "country-stats-scatter-chart");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${title} 산포도`);

  for (let index = 0; index < 5; index += 1) {
    const x = plot.left + (plotWidth / 4) * index;
    const y = plot.top + (plotHeight / 4) * index;

    const vertical = createSvgElement("line");
    vertical.setAttribute("x1", String(x));
    vertical.setAttribute("x2", String(x));
    vertical.setAttribute("y1", String(plot.top));
    vertical.setAttribute("y2", String(height - plot.bottom));
    vertical.setAttribute("class", "country-stats-scatter-chart__grid");
    svg.appendChild(vertical);

    const horizontal = createSvgElement("line");
    horizontal.setAttribute("x1", String(plot.left));
    horizontal.setAttribute("x2", String(width - plot.right));
    horizontal.setAttribute("y1", String(y));
    horizontal.setAttribute("y2", String(y));
    horizontal.setAttribute("class", "country-stats-scatter-chart__grid");
    svg.appendChild(horizontal);
  }

  if (minX < 0 && maxX > 0) {
    const zeroXLine = createSvgElement("line");
    zeroXLine.setAttribute("x1", String(xToPosition(0)));
    zeroXLine.setAttribute("x2", String(xToPosition(0)));
    zeroXLine.setAttribute("y1", String(plot.top));
    zeroXLine.setAttribute("y2", String(height - plot.bottom));
    zeroXLine.setAttribute("class", "country-stats-scatter-chart__axis-line");
    svg.appendChild(zeroXLine);
  }

  if (minY < 0 && maxY > 0) {
    const zeroYLine = createSvgElement("line");
    zeroYLine.setAttribute("x1", String(plot.left));
    zeroYLine.setAttribute("x2", String(width - plot.right));
    zeroYLine.setAttribute("y1", String(yToPosition(0)));
    zeroYLine.setAttribute("y2", String(yToPosition(0)));
    zeroYLine.setAttribute("class", "country-stats-scatter-chart__axis-line");
    svg.appendChild(zeroYLine);
  }

  validEntries.forEach((entry) => {
    const circle = createSvgElement("circle");
    circle.setAttribute("cx", String(xToPosition(entry.xValue)));
    circle.setAttribute("cy", String(yToPosition(entry.yValue)));
    circle.setAttribute("r", String(radiusForValue(entry.sizeValue)));
    circle.setAttribute("class", "country-stats-scatter-chart__dot");
    const titleNode = createSvgElement("title");
    titleNode.textContent = `${entry.label} · X ${xFormatter(entry.xValue)} · Y ${yFormatter(entry.yValue)} · 크기 ${sizeFormatter(entry.sizeDisplayValue)}`;
    circle.appendChild(titleNode);
    svg.appendChild(circle);
  });

  getScatterLabelEntries(validEntries).forEach((entry) => {
    const label = createSvgElement("text");
    label.setAttribute("x", String(xToPosition(entry.xValue) + radiusForValue(entry.sizeValue) + 3));
    label.setAttribute("y", String(yToPosition(entry.yValue) - 2));
    label.setAttribute("class", "country-stats-scatter-chart__label");
    label.textContent = entry.label;
    svg.appendChild(label);
  });

  const axisLabels = [
    { x: plot.left, y: 12, text: yFormatter(maxY), anchor: "start" },
    { x: plot.left, y: height - 6, text: yFormatter(minY), anchor: "start" },
    { x: plot.left, y: height - 18, text: xFormatter(minX), anchor: "start" },
    { x: width - plot.right, y: height - 18, text: xFormatter(maxX), anchor: "end" },
  ];
  axisLabels.forEach((config) => {
    const label = createSvgElement("text");
    label.setAttribute("x", String(config.x));
    label.setAttribute("y", String(config.y));
    label.setAttribute("text-anchor", config.anchor);
    label.setAttribute("class", "country-stats-scatter-chart__axis");
    label.textContent = config.text;
    svg.appendChild(label);
  });

  card.appendChild(svg);
  const axisList = document.createElement("div");
  axisList.className = "country-stats-breakdown-list";
  [
    { label: "X축", value: xLabel, detail: `${xFormatter(minX)} ~ ${xFormatter(maxX)}` },
    { label: "Y축", value: yLabel, detail: `${yFormatter(minY)} ~ ${yFormatter(maxY)}` },
    { label: "버블 크기", value: sizeFormatter(maximumBubbleValue), detail: "가장 큰 버블 기준" },
  ].forEach((row) => {
    const item = document.createElement("div");
    item.className = "country-stats-breakdown-row";
    const head = document.createElement("div");
    head.className = "country-stats-breakdown-row__head";
    const label = document.createElement("span");
    label.textContent = row.label;
    const value = document.createElement("strong");
    value.textContent = row.value;
    head.append(label, value);
    item.appendChild(head);
    const detail = document.createElement("small");
    detail.className = "country-stats-breakdown-row__detail";
    detail.textContent = row.detail;
    item.appendChild(detail);
    axisList.appendChild(item);
  });
  card.appendChild(axisList);

  return card;
}

function buildStatListCard({ title, description, rows }) {
  const card = buildChartCardShell(title, description);
  const validRows = (rows ?? []).filter((row) => row?.label && row?.value);

  if (!validRows.length) {
    card.appendChild(createCountryStatsUnavailable("표시할 세부 지표가 없습니다."));
    return card;
  }

  const list = document.createElement("div");
  list.className = "country-stats-breakdown-list";
  validRows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "country-stats-breakdown-row";

    const head = document.createElement("div");
    head.className = "country-stats-breakdown-row__head";
    const label = document.createElement("span");
    label.textContent = row.label;
    const value = document.createElement("strong");
    value.textContent = row.value;
    head.append(label, value);
    item.appendChild(head);

    if (row.detail) {
      const detail = document.createElement("small");
      detail.className = "country-stats-breakdown-row__detail";
      detail.textContent = row.detail;
      item.appendChild(detail);
    }

    list.appendChild(item);
  });
  card.appendChild(list);
  return card;
}

function createSvgElement(tagName) {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}

function getExamGraphPopulationYears() {
  return [...new Set(
    Object.values(countryStatsById).flatMap((stats) => (stats?.population?.rows ?? []).map((row) => row.year)),
  )].sort((a, b) => a - b);
}

function getExamGraphAlias(index) {
  const token = examGraphAliasLetters[index] ?? `A${index + 1}`;
  return `(${token})`;
}

function getExamGraphPresetDefinition() {
  return examGraphPresetDefinitions.find((definition) => definition.key === state.examGraphPresetKey) ?? examGraphPresetDefinitions[0];
}

function getExamGraphValueModeDefinition() {
  return examGraphValueModeDefinitions.find((definition) => definition.key === state.examGraphValueMode) ?? examGraphValueModeDefinitions[0];
}

function getExamGraphMetricDefinition() {
  return getMetricExplorerDefinitionByKey(getMetricExplorerDefinitions(), state.examGraphMetricKey);
}

function getExamGraphPairDefinition() {
  return examGraphPairMetricDefinitions.find((definition) => definition.key === state.examGraphPairKey) ?? examGraphPairMetricDefinitions[0];
}

function getExamGraphCompositionDefinition() {
  return examGraphCompositionDefinitions.find((definition) => definition.key === state.examGraphCompositionKey) ?? examGraphCompositionDefinitions[0];
}

function getExamGraphTimeMetricDefinition() {
  return examGraphTimeMetricDefinitions.find((definition) => definition.key === state.examGraphTimeMetricKey) ?? examGraphTimeMetricDefinitions[0];
}

function getExamGraphTopShareMetricDefinition() {
  return examGraphTopShareMetricDefinitions.find((definition) => definition.key === state.examGraphTopShareMetricKey) ?? examGraphTopShareMetricDefinitions[0];
}

function getExamGraphAllowedValueModes(presetKey = state.examGraphPresetKey) {
  const preset = examGraphPresetDefinitions.find((definition) => definition.key === presetKey) ?? examGraphPresetDefinitions[0];
  return preset.allowedValueModes ?? [];
}

function getExamGraphFocusedCountryRows() {
  const focusIds = Array.isArray(state.examGraphFocusCountryIds) ? state.examGraphFocusCountryIds : [];
  return focusIds
    .map((countryId) => {
      const stats = countryStatsById[countryId] ?? null;
      if (!stats) {
        return null;
      }
      return {
        id: countryId,
        label: stats.atlasName ?? countryById.get(countryId)?.properties?.name ?? String(countryId),
        stats,
      };
    })
    .filter(Boolean);
}

function getExamGraphSelectedCountryRows() {
  const focusedRows = getExamGraphFocusedCountryRows();
  if (focusedRows.length) {
    return focusedRows;
  }

  return state.selected
    .map((country) => ({
      id: country.id,
      label: country.name,
      stats: countryStatsById[country.id] ?? null,
    }))
    .filter((entry) => entry.stats);
}

function getExamGraphScopeMode() {
  if (getExamGraphFocusedCountryRows().length) {
    return "focus";
  }
  if (state.selected.length) {
    return "selected";
  }
  return "auto";
}

function getExamGraphScopeSourceText() {
  const focusedRows = getExamGraphFocusedCountryRows();
  if (focusedRows.length) {
    return state.examGraphFocusLabel || `추천 국가 ${focusedRows.length}개`;
  }
  if (state.selected.length) {
    return "지도 선택 국가";
  }
  return "자동 상위 추출";
}

function getExamGraphCountryScopeLabel(count) {
  const scopeMode = getExamGraphScopeMode();
  if (scopeMode === "auto") {
    return `전체 자료 상위 ${count}개국`;
  }
  if (scopeMode === "focus") {
    return `추천 국가 ${count}개`;
  }
  return `지도 선택 국가 ${count}개`;
}

function isExamGraphRandomCountryAllowed(entryOrStats) {
  const stats = entryOrStats?.stats ?? entryOrStats;
  const iso3 = String(stats?.iso3 ?? "").trim().toUpperCase();
  return iso3 ? !examGraphRandomExcludedIso3.has(iso3) : true;
}

function shouldExamGraphMergeAmericas(grouping = state.examGraphGrouping, presetKey = state.examGraphPresetKey) {
  return Boolean(state.examGraphMergeAmericas) && (grouping === "continents" || presetKey === "top3share");
}

function getExamGraphContinentGroupName(continentName, { grouping = state.examGraphGrouping, presetKey = state.examGraphPresetKey } = {}) {
  const rawName = String(continentName || "미분류");
  if (shouldExamGraphMergeAmericas(grouping, presetKey) && (rawName === "North America" || rawName === "South America")) {
    return "Americas";
  }
  return rawName;
}

function getExamGraphGroupingLabel(grouping = state.examGraphGrouping, presetKey = state.examGraphPresetKey) {
  if (grouping !== "continents" && presetKey !== "top3share") {
    return "국가별";
  }
  return shouldExamGraphMergeAmericas(grouping, presetKey) ? "대륙별(아메리카 통합)" : "대륙별";
}

function getExamGraphContinentScopeSuffix(grouping = state.examGraphGrouping, presetKey = state.examGraphPresetKey) {
  return shouldExamGraphMergeAmericas(grouping, presetKey) ? " · 아메리카 통합" : "";
}

function getExamGraphContinentScopeLabel(count) {
  const scopeMode = getExamGraphScopeMode();
  if (scopeMode === "auto") {
    return `전 세계 대륙${getExamGraphContinentScopeSuffix("continents")}`;
  }
  if (scopeMode === "focus") {
    return `추천 국가가 속한 대륙 ${count}곳${getExamGraphContinentScopeSuffix("continents")}`;
  }
  return `지도 선택 국가가 속한 대륙 ${count}곳${getExamGraphContinentScopeSuffix("continents")}`;
}

function getExamGraphAllCountryRows() {
  return Object.entries(countryStatsById).map(([countryId, stats]) => ({
    id: countryId,
    label: stats.atlasName ?? countryById.get(countryId)?.properties?.name ?? String(countryId),
    stats,
  }));
}

function getExamGraphTopN() {
  return clamp(Math.round(Number(state.examGraphTopN) || 4), 2, 12);
}

function getExamGraphPopulationRow(stats, year) {
  return stats?.population?.rows?.find((row) => row.year === Number(year)) ?? null;
}

function getExamGraphPopulationMetricValue(stats, year, key) {
  const row = getExamGraphPopulationRow(stats, year);
  const value = row?.[key];
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function getExamGraphPopulationRateMetricValue(stats, year, key) {
  const row = getPopulationRateRow(stats?.population, year);
  const value = row?.[key];
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function isExamGraphNormalizedModeAllowedForMetric(metricDefinition) {
  return !["population-natural-increase-rate", "migration-net"].includes(metricDefinition?.key);
}

function ensureExamGraphState() {
  if (!examGraphPresetDefinitions.some((definition) => definition.key === state.examGraphPresetKey)) {
    state.examGraphPresetKey = examGraphPresetDefinitions[0].key;
  }
  const metricDefinitions = getMetricExplorerDefinitions();
  const metricKeys = new Set(metricDefinitions.map((definition) => definition.key));
  if (!metricKeys.has(state.examGraphMetricKey)) {
    state.examGraphMetricKey = "population-total";
  }
  if (!examGraphPairMetricDefinitions.some((definition) => definition.key === state.examGraphPairKey)) {
    state.examGraphPairKey = examGraphPairMetricDefinitions[0].key;
  }
  if (!examGraphCompositionDefinitions.some((definition) => definition.key === state.examGraphCompositionKey)) {
    state.examGraphCompositionKey = examGraphCompositionDefinitions[0].key;
  }
  if (!examGraphTimeMetricDefinitions.some((definition) => definition.key === state.examGraphTimeMetricKey)) {
    state.examGraphTimeMetricKey = examGraphTimeMetricDefinitions[0].key;
  }
  if (!examGraphTopShareMetricDefinitions.some((definition) => definition.key === state.examGraphTopShareMetricKey)) {
    state.examGraphTopShareMetricKey = examGraphTopShareMetricDefinitions[0].key;
  }
  if (!["countries", "continents"].includes(state.examGraphGrouping)) {
    state.examGraphGrouping = "countries";
  }
  state.examGraphMergeAmericas = Boolean(state.examGraphMergeAmericas);
  if (!Array.isArray(state.examGraphFocusCountryIds)) {
    state.examGraphFocusCountryIds = [];
  }
  state.examGraphFocusCountryIds = state.examGraphFocusCountryIds.filter((countryId) => Boolean(countryStatsById[countryId]));
  state.examGraphFocusLabel = typeof state.examGraphFocusLabel === "string" ? state.examGraphFocusLabel : "";

  state.examGraphTopN = getExamGraphTopN();
  state.examGraphAliasMode = Boolean(state.examGraphAliasMode);

  const allowedValueModes = getExamGraphAllowedValueModes(state.examGraphPresetKey);
  if (!allowedValueModes.includes(state.examGraphValueMode)) {
    state.examGraphValueMode = allowedValueModes[0] ?? "amount";
  }

  const availableYears = examGraphPopulationYears.length ? examGraphPopulationYears : [1970, 2023];
  if (!availableYears.includes(Number(state.examGraphYearStart))) {
    state.examGraphYearStart = availableYears[0];
  }
  if (!availableYears.includes(Number(state.examGraphYearEnd))) {
    state.examGraphYearEnd = availableYears[availableYears.length - 1];
  }
  if (Number(state.examGraphYearStart) > Number(state.examGraphYearEnd)) {
    const nextStart = state.examGraphYearEnd;
    state.examGraphYearEnd = state.examGraphYearStart;
    state.examGraphYearStart = nextStart;
  }

  if (!metricKeys.has(state.examGraphScatterXKey)) {
    state.examGraphScatterXKey = "population-urban-share";
  }
  if (!metricKeys.has(state.examGraphScatterYKey)) {
    state.examGraphScatterYKey = "age-65plus-share";
  }
  if (!metricKeys.has(state.examGraphScatterSizeKey)) {
    state.examGraphScatterSizeKey = "population-total";
  }
}

function updateExamGraphState(label, updater) {
  beginHistoryStep(label);
  updater();
  renderExamGraphPanel();
}

function renderExamGraphPanel() {
  if (!elements.examGraphPanel) {
    return;
  }

  elements.examGraphPanel.replaceChildren();

  if (state.mapVersion !== "world") {
    return;
  }

  ensureExamGraphState();
  const model = buildExamGraphModel();
  const shell = document.createElement("div");
  shell.className = "exam-graph-shell";
  shell.appendChild(buildExamGraphControls());

  if (!model) {
    shell.appendChild(createEmptyState("출제형 그래프에 쓸 수 있는 통계가 아직 부족합니다. 다른 프리셋이나 국가 조합을 골라 보세요."));
    elements.examGraphPanel.appendChild(shell);
    return;
  }

  const summary = document.createElement("div");
  summary.className = "exam-graph-summary";
  summary.append(
    createMetricExplorerSummaryCard("프리셋", model.presetLabel, model.title),
    createMetricExplorerSummaryCard("비교 단위", model.groupLabel, model.scopeLabel),
    createMetricExplorerSummaryCard("대상 소스", getExamGraphScopeSourceText(), model.sourceDetail || model.scopeLabel),
    createMetricExplorerSummaryCard("표시 방식", model.displayModeLabel ?? "기본", model.displayModeDetail ?? model.metricDetail),
    createMetricExplorerSummaryCard("라벨", state.examGraphAliasMode ? "가명 표기" : "실명 표기", model.rowCountText),
    createMetricExplorerSummaryCard("데이터", model.metricLabel, model.metricDetail),
  );
  shell.appendChild(summary);

  const grid = document.createElement("div");
  grid.className = "exam-graph-grid";
  grid.appendChild(buildExamGraphPreviewCard(model));

  const sideColumn = document.createElement("div");
  sideColumn.className = "exam-graph-side-column";
  sideColumn.appendChild(buildExamGraphValueCard(model));
  const guideCard = buildExamGraphGuideCard(model);
  if (guideCard) {
    sideColumn.appendChild(guideCard);
  }
  if (model.answerRows?.length) {
    sideColumn.appendChild(buildExamGraphAnswerCard(model.answerRows));
  }
  grid.appendChild(sideColumn);

  shell.appendChild(grid);
  elements.examGraphPanel.appendChild(shell);
}

function buildExamGraphControls() {
  const wrapper = document.createElement("div");
  wrapper.className = "exam-graph-control-shell";

  const presetRow = document.createElement("div");
  presetRow.className = "exam-graph-chip-row";
  examGraphPresetDefinitions.forEach((definition) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "exam-graph-chip";
    button.classList.toggle("is-active", definition.key === state.examGraphPresetKey);
    button.textContent = definition.label;
    button.addEventListener("click", () => {
      updateExamGraphState("출제형 그래프 변경", () => {
        state.examGraphPresetKey = definition.key;
      });
    });
    presetRow.appendChild(button);
  });
  wrapper.appendChild(presetRow);

  const actionRow = document.createElement("div");
  actionRow.className = "exam-graph-action-row";
  [
    {
      label: "지도 선택 사용",
      active: getExamGraphScopeMode() !== "focus",
      handler: () => {
        updateExamGraphState("출제형 그래프 대상 복귀", () => {
          state.examGraphFocusCountryIds = [];
          state.examGraphFocusLabel = "";
        });
        setStatus("출제형 그래프 대상을 지도 선택 또는 자동 상위 추출 기준으로 되돌렸습니다.");
      },
    },
    {
      label: "국가 랜덤",
      active: false,
      handler: () => applyExamGraphRandomCountries(),
    },
    {
      label: "통계 랜덤",
      active: false,
      handler: () => applyExamGraphRandomScenario({ graphOnly: true }),
    },
    {
      label: "세트 랜덤",
      active: false,
      handler: () => applyExamGraphRandomScenario({ graphOnly: false }),
    },
  ].forEach((config) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "exam-graph-chip exam-graph-chip--action";
    button.classList.toggle("is-active", Boolean(config.active));
    button.textContent = config.label;
    button.addEventListener("click", config.handler);
    actionRow.appendChild(button);
  });
  wrapper.appendChild(actionRow);

  const guide = document.createElement("p");
  guide.className = "exam-graph-guide";
  guide.textContent = getExamGraphGuideText();
  wrapper.appendChild(guide);

  const controls = document.createElement("div");
  controls.className = "exam-graph-controls";
  const valueModeOptions = getExamGraphValueModeOptionsForCurrentPreset();

  const aliasField = buildExamGraphToggleField("가명 처리", state.examGraphAliasMode, (checked) => {
    updateExamGraphState("출제형 그래프 변경", () => {
      state.examGraphAliasMode = checked;
    });
  });

  const topNField = buildExamGraphNumberField("표시 개수", getExamGraphTopN(), 2, 12, (value) => {
    updateExamGraphState("출제형 그래프 변경", () => {
      state.examGraphTopN = value;
    });
  });

  const groupingField = buildExamGraphSelectField(
    "비교 단위",
    [
      { key: "countries", label: "국가별" },
      { key: "continents", label: "대륙별" },
    ],
    state.examGraphGrouping,
    (value) => {
      updateExamGraphState("출제형 그래프 변경", () => {
        state.examGraphGrouping = value;
      });
    },
  );
  const mergeAmericasField = buildExamGraphToggleField("아메리카 통합", state.examGraphMergeAmericas, (checked) => {
    updateExamGraphState("출제형 그래프 변경", () => {
      state.examGraphMergeAmericas = checked;
    });
  });

  const valueModeField =
    valueModeOptions.length > 1
      ? buildExamGraphSelectField("표시 방식", valueModeOptions, state.examGraphValueMode, (value) => {
          updateExamGraphState("출제형 그래프 변경", () => {
            state.examGraphValueMode = value;
          });
        })
      : null;

  if (state.examGraphPresetKey === "stacked100") {
    controls.append(
      buildExamGraphSelectField(
        "구성 지표",
        examGraphCompositionDefinitions,
        state.examGraphCompositionKey,
        (value) => {
          updateExamGraphState("출제형 그래프 변경", () => {
            state.examGraphCompositionKey = value;
          });
        },
      ),
      groupingField,
      ...(state.examGraphGrouping === "continents" ? [mergeAmericasField] : []),
      ...(valueModeField ? [valueModeField] : []),
      topNField,
      aliasField,
    );
  } else if (state.examGraphPresetKey === "rankBars") {
    controls.append(
      buildExamGraphSelectField("기준 지표", getMetricExplorerDefinitions(), state.examGraphMetricKey, (value) => {
        updateExamGraphState("출제형 그래프 변경", () => {
          state.examGraphMetricKey = value;
        });
      }),
      groupingField,
      ...(state.examGraphGrouping === "continents" ? [mergeAmericasField] : []),
      ...(valueModeField ? [valueModeField] : []),
      topNField,
      aliasField,
    );
  } else if (state.examGraphPresetKey === "pairedBars") {
    controls.append(
      buildExamGraphSelectField("지표 쌍", examGraphPairMetricDefinitions, state.examGraphPairKey, (value) => {
        updateExamGraphState("출제형 그래프 변경", () => {
          state.examGraphPairKey = value;
        });
      }),
      groupingField,
      ...(state.examGraphGrouping === "continents" ? [mergeAmericasField] : []),
      ...(valueModeField ? [valueModeField] : []),
      topNField,
      aliasField,
    );
  } else if (state.examGraphPresetKey === "timeCompare") {
    controls.append(
      buildExamGraphSelectField(
        "비교 지표",
        examGraphTimeMetricDefinitions,
        state.examGraphTimeMetricKey,
        (value) => {
          updateExamGraphState("출제형 그래프 변경", () => {
            state.examGraphTimeMetricKey = value;
          });
        },
      ),
      groupingField,
      ...(state.examGraphGrouping === "continents" ? [mergeAmericasField] : []),
      ...(valueModeField ? [valueModeField] : []),
      buildExamGraphSelectField(
        "기준 시점",
        examGraphPopulationYears.map((year) => ({ key: String(year), label: `${year}년` })),
        String(state.examGraphYearStart),
        (value) => {
          updateExamGraphState("출제형 그래프 변경", () => {
            state.examGraphYearStart = Number(value);
          });
        },
      ),
      buildExamGraphSelectField(
        "비교 시점",
        examGraphPopulationYears.map((year) => ({ key: String(year), label: `${year}년` })),
        String(state.examGraphYearEnd),
        (value) => {
          updateExamGraphState("출제형 그래프 변경", () => {
            state.examGraphYearEnd = Number(value);
          });
        },
      ),
      topNField,
      aliasField,
    );
  } else if (state.examGraphPresetKey === "trendLine") {
    controls.append(
      buildExamGraphSelectField(
        "시계열 지표",
        examGraphTimeMetricDefinitions,
        state.examGraphTimeMetricKey,
        (value) => {
          updateExamGraphState("출제형 그래프 변경", () => {
            state.examGraphTimeMetricKey = value;
          });
        },
      ),
      groupingField,
      ...(state.examGraphGrouping === "continents" ? [mergeAmericasField] : []),
      ...(valueModeField ? [valueModeField] : []),
      buildExamGraphSelectField(
        "시작 시점",
        examGraphPopulationYears.map((year) => ({ key: String(year), label: `${year}년` })),
        String(state.examGraphYearStart),
        (value) => {
          updateExamGraphState("출제형 그래프 변경", () => {
            state.examGraphYearStart = Number(value);
          });
        },
      ),
      buildExamGraphSelectField(
        "종료 시점",
        examGraphPopulationYears.map((year) => ({ key: String(year), label: `${year}년` })),
        String(state.examGraphYearEnd),
        (value) => {
          updateExamGraphState("출제형 그래프 변경", () => {
            state.examGraphYearEnd = Number(value);
          });
        },
      ),
      topNField,
      aliasField,
    );
  } else if (state.examGraphPresetKey === "scatter") {
    const metricDefinitions = getMetricExplorerDefinitions();
    controls.append(
      groupingField,
      ...(state.examGraphGrouping === "continents" ? [mergeAmericasField] : []),
      buildExamGraphSelectField("산포도 X축", metricDefinitions, state.examGraphScatterXKey, (value) => {
        updateExamGraphState("출제형 그래프 변경", () => {
          state.examGraphScatterXKey = value;
        });
      }),
      buildExamGraphSelectField("산포도 Y축", metricDefinitions, state.examGraphScatterYKey, (value) => {
        updateExamGraphState("출제형 그래프 변경", () => {
          state.examGraphScatterYKey = value;
        });
      }),
      buildExamGraphSelectField("버블 크기", metricDefinitions, state.examGraphScatterSizeKey, (value) => {
        updateExamGraphState("출제형 그래프 변경", () => {
          state.examGraphScatterSizeKey = value;
        });
      }),
      topNField,
      aliasField,
    );
  } else {
    controls.append(
      buildExamGraphSelectField(
        "기준 지표",
        examGraphTopShareMetricDefinitions,
        state.examGraphTopShareMetricKey,
        (value) => {
          updateExamGraphState("출제형 그래프 변경", () => {
            state.examGraphTopShareMetricKey = value;
          });
        },
      ),
      mergeAmericasField,
      ...(valueModeField ? [valueModeField] : []),
      aliasField,
    );
  }

  wrapper.appendChild(controls);
  return wrapper;
}

function getExamGraphGuideText() {
  const scopeMode = getExamGraphScopeMode();
  if (scopeMode === "focus") {
    return `${getExamGraphScopeSourceText()} 기준 추천 대상을 우선 사용합니다. '지도 선택 사용'을 누르면 다시 지도 선택 또는 자동 상위 추출 기준으로 돌아갑니다.`;
  }
  if (scopeMode === "selected") {
    return "지도에서 고른 국가를 우선 사용합니다. 필요하면 랜덤 버튼으로 출제용 추천 국가나 통계를 바로 섞을 수 있습니다.";
  }
  return "선택 국가가 없으면 전체 자료에서 상위권 국가나 대륙을 자동으로 골라 시험지형 그래프를 만듭니다. 랜덤 버튼은 출제에 잘 맞는 통계·국가 조합을 추천합니다.";
}

function getExamGraphValueModeOptionsForCurrentPreset() {
  const allowedKeys = getExamGraphAllowedValueModes(state.examGraphPresetKey);
  let options = examGraphValueModeDefinitions.filter((definition) => allowedKeys.includes(definition.key));

  if (state.examGraphPresetKey === "rankBars") {
    if (!isExamGraphNormalizedModeAllowedForMetric(getExamGraphMetricDefinition())) {
      options = options.filter((definition) => definition.key === "amount");
    }
  } else if (state.examGraphPresetKey === "pairedBars") {
    const metricDefinitions = getMetricExplorerDefinitions();
    const pairDefinition = getExamGraphPairDefinition();
    const definitions = pairDefinition.metricKeys.map((key) => getMetricExplorerDefinitionByKey(metricDefinitions, key));
    if (definitions.some((definition) => !isExamGraphNormalizedModeAllowedForMetric(definition))) {
      options = options.filter((definition) => definition.key === "amount");
    }
  } else if (state.examGraphPresetKey === "timeCompare" || state.examGraphPresetKey === "trendLine") {
    if (!isExamGraphNormalizedModeAllowedForMetric(getExamGraphTimeMetricDefinition())) {
      options = options.filter((definition) => definition.key === "amount");
    }
  }

  if (!options.some((definition) => definition.key === state.examGraphValueMode)) {
    state.examGraphValueMode = options[0]?.key ?? "amount";
  }
  return options;
}

function buildExamGraphSelectField(labelText, options, activeValue, onChange) {
  const field = document.createElement("div");
  field.className = "exam-graph-control";
  const label = document.createElement("label");
  label.textContent = labelText;
  const select = document.createElement("select");
  options.forEach((optionConfig) => {
    const option = document.createElement("option");
    option.value = optionConfig.key;
    option.textContent = optionConfig.label;
    option.selected = optionConfig.key === activeValue;
    select.appendChild(option);
  });
  select.addEventListener("change", () => onChange(select.value));
  field.append(label, select);
  return field;
}

function buildExamGraphNumberField(labelText, value, min, max, onChange) {
  const field = document.createElement("div");
  field.className = "exam-graph-control";
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(min);
  input.max = String(max);
  input.step = "1";
  input.value = String(value);
  input.addEventListener("input", () => {
    onChange(clamp(Math.round(Number(input.value) || value), min, max));
  });
  field.append(label, input);
  return field;
}

function buildExamGraphToggleField(labelText, checked, onChange) {
  const field = document.createElement("label");
  field.className = "exam-graph-toggle";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(checked);
  input.addEventListener("change", () => onChange(input.checked));
  const text = document.createElement("span");
  text.textContent = labelText;
  field.append(input, text);
  return field;
}

function captureExamGraphStateSnapshot() {
  return {
    examGraphPresetKey: state.examGraphPresetKey,
    examGraphCompositionKey: state.examGraphCompositionKey,
    examGraphTimeMetricKey: state.examGraphTimeMetricKey,
    examGraphTopShareMetricKey: state.examGraphTopShareMetricKey,
    examGraphMetricKey: state.examGraphMetricKey,
    examGraphPairKey: state.examGraphPairKey,
    examGraphGrouping: state.examGraphGrouping,
    examGraphTopN: state.examGraphTopN,
    examGraphAliasMode: state.examGraphAliasMode,
    examGraphYearStart: state.examGraphYearStart,
    examGraphYearEnd: state.examGraphYearEnd,
    examGraphScatterXKey: state.examGraphScatterXKey,
    examGraphScatterYKey: state.examGraphScatterYKey,
    examGraphScatterSizeKey: state.examGraphScatterSizeKey,
    examGraphValueMode: state.examGraphValueMode,
    examGraphMergeAmericas: state.examGraphMergeAmericas,
    examGraphFocusCountryIds: [...state.examGraphFocusCountryIds],
    examGraphFocusLabel: state.examGraphFocusLabel,
  };
}

function restoreExamGraphStateSnapshot(snapshot) {
  Object.assign(state, {
    examGraphPresetKey: snapshot.examGraphPresetKey,
    examGraphCompositionKey: snapshot.examGraphCompositionKey,
    examGraphTimeMetricKey: snapshot.examGraphTimeMetricKey,
    examGraphTopShareMetricKey: snapshot.examGraphTopShareMetricKey,
    examGraphMetricKey: snapshot.examGraphMetricKey,
    examGraphPairKey: snapshot.examGraphPairKey,
    examGraphGrouping: snapshot.examGraphGrouping,
    examGraphTopN: snapshot.examGraphTopN,
    examGraphAliasMode: snapshot.examGraphAliasMode,
    examGraphYearStart: snapshot.examGraphYearStart,
    examGraphYearEnd: snapshot.examGraphYearEnd,
    examGraphScatterXKey: snapshot.examGraphScatterXKey,
    examGraphScatterYKey: snapshot.examGraphScatterYKey,
    examGraphScatterSizeKey: snapshot.examGraphScatterSizeKey,
    examGraphValueMode: snapshot.examGraphValueMode,
    examGraphMergeAmericas: snapshot.examGraphMergeAmericas,
    examGraphFocusCountryIds: [...snapshot.examGraphFocusCountryIds],
    examGraphFocusLabel: snapshot.examGraphFocusLabel,
  });
}

function shuffleExamGraphItems(items) {
  const copy = [...(items ?? [])];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function getExamGraphRecommendedCount() {
  return clamp(Math.min(getExamGraphTopN(), 5), 3, 6);
}

function buildExamGraphAllCountryCompositionRows(definition) {
  return getExamGraphAllCountryRows()
    .map((entry) => {
      const components = (definition.getComponents(entry.stats) ?? [])
        .map((component) => ({
          ...component,
          value: Number(component?.value),
        }))
        .filter((component) => Number.isFinite(component.value) && component.value >= 0);
      const total = d3.sum(components, (component) => component.value);
      if (!components.length || total <= 0) {
        return null;
      }

      return {
        id: entry.id,
        label: entry.label,
        actualLabel: entry.label,
        continent: entry.stats?.continent?.name ?? "미분류",
        total,
        segments: components.map((component) => ({
          ...component,
          share: total > 0 ? (component.value / total) * 100 : 0,
        })),
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.total) - Number(a.total));
}

function buildExamGraphAllCountryMetricRows(definition) {
  return getExamGraphAllCountryRows()
    .map((entry) => {
      const metric = definition.getValue(entry.stats);
      if (!metric || !Number.isFinite(Number(metric.value))) {
        return null;
      }
      return {
        id: entry.id,
        label: entry.label,
        actualLabel: entry.label,
        value: Number(metric.value),
        year: metric.year ?? null,
        detail: [metric.detail, entry.stats?.continent?.name].filter(Boolean).join(" · "),
        continent: entry.stats?.continent?.name ?? "미분류",
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.value) - Number(a.value));
}

function buildExamGraphAllCountryPairRows(pairDefinition) {
  const metricDefinitions = getMetricExplorerDefinitions();
  const firstDefinition = getMetricExplorerDefinitionByKey(metricDefinitions, pairDefinition.metricKeys[0]);
  const secondDefinition = getMetricExplorerDefinitionByKey(metricDefinitions, pairDefinition.metricKeys[1]);

  return getExamGraphAllCountryRows()
    .map((entry) => {
      const firstMetric = firstDefinition.getValue(entry.stats);
      const secondMetric = secondDefinition.getValue(entry.stats);
      if (!firstMetric || !secondMetric) {
        return null;
      }
      if (!Number.isFinite(Number(firstMetric.value)) || !Number.isFinite(Number(secondMetric.value))) {
        return null;
      }
      return {
        id: entry.id,
        label: entry.label,
        actualLabel: entry.label,
        continent: entry.stats?.continent?.name ?? "미분류",
        firstValue: Number(firstMetric.value),
        secondValue: Number(secondMetric.value),
        totalValue: Number(firstMetric.value) + Number(secondMetric.value),
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.totalValue) - Number(a.totalValue));
}

function buildExamGraphAllCountryTimeRows(definition, yearStart, yearEnd) {
  return getExamGraphAllCountryRows()
    .map((entry) => {
      const startValue = definition.getYearValue(entry.stats, yearStart);
      const endValue = definition.getYearValue(entry.stats, yearEnd);
      if (!Number.isFinite(Number(startValue)) || !Number.isFinite(Number(endValue))) {
        return null;
      }
      return {
        id: entry.id,
        label: entry.label,
        actualLabel: entry.label,
        continent: entry.stats?.continent?.name ?? "미분류",
        startValue: Number(startValue),
        endValue: Number(endValue),
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.endValue) - Number(a.endValue));
}

function buildExamGraphAllCountryTrendRows(definition, yearStart, yearEnd) {
  const years = examGraphPopulationYears.filter((year) => Number(year) >= Number(yearStart) && Number(year) <= Number(yearEnd));
  return getExamGraphAllCountryRows()
    .map((entry) => {
      const points = years
        .map((year) => {
          const value = definition.getYearValue(entry.stats, year);
          return Number.isFinite(Number(value)) ? { year, value: Number(value) } : null;
        })
        .filter(Boolean);
      if (points.length < 2) {
        return null;
      }
      return {
        id: entry.id,
        label: entry.label,
        actualLabel: entry.label,
        continent: entry.stats?.continent?.name ?? "미분류",
        points,
      };
    })
    .filter(Boolean);
}

function buildExamGraphAllCountryScatterRows(xDefinition, yDefinition, sizeDefinition) {
  const xEntries = new Map(buildExamGraphAllCountryMetricRows(xDefinition).map((entry) => [entry.id, entry]));
  const yEntries = new Map(buildExamGraphAllCountryMetricRows(yDefinition).map((entry) => [entry.id, entry]));
  const sizeEntries = new Map(buildExamGraphAllCountryMetricRows(sizeDefinition).map((entry) => [entry.id, entry]));

  return [...xEntries.keys()]
    .filter((id) => yEntries.has(id) && sizeEntries.has(id))
    .map((id) => {
      const xEntry = xEntries.get(id);
      const yEntry = yEntries.get(id);
      const sizeEntry = sizeEntries.get(id);
      return {
        id,
        label: xEntry?.label ?? yEntry?.label ?? String(id),
        continent: xEntry?.detail?.split(" · ").at(-1) ?? "미분류",
        xValue: Number(xEntry?.value),
        yValue: Number(yEntry?.value),
        sizeValue: Math.abs(Number(sizeEntry?.value) || 0),
      };
    })
    .filter((entry) => Number.isFinite(entry.xValue) && Number.isFinite(entry.yValue) && Number.isFinite(entry.sizeValue));
}

function buildExamGraphAllCountryTopShareContributors(definition) {
  return getExamGraphAllCountryRows()
    .map((entry) => {
      const metric = definition.getValue(entry.stats);
      if (!metric || !Number.isFinite(Number(metric.value))) {
        return null;
      }
      return {
        id: entry.id,
        label: entry.label,
        continent: entry.stats?.continent?.name ?? "미분류",
        value: Number(metric.value),
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.value) - Number(a.value));
}

function selectExamGraphRecommendedCountries(candidates, desiredCount = getExamGraphRecommendedCount()) {
  const uniqueCandidates = [];
  const seenIds = new Set();
  (candidates ?? []).forEach((candidate) => {
    const stats = candidate?.id ? countryStatsById[candidate.id] : null;
    if (!candidate?.id || seenIds.has(candidate.id) || !Number.isFinite(Number(candidate.score)) || !isExamGraphRandomCountryAllowed(stats)) {
      return;
    }
    seenIds.add(candidate.id);
    uniqueCandidates.push({
      ...candidate,
      continent: getExamGraphContinentGroupName(candidate.continent, { grouping: state.examGraphGrouping, presetKey: state.examGraphPresetKey }),
    });
  });

  if (!uniqueCandidates.length) {
    return [];
  }

  const pool = shuffleExamGraphItems(
    [...uniqueCandidates].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, Math.max(desiredCount * 4, 14)),
  );
  const selected = [];
  const usedIds = new Set();
  const usedContinents = new Set();
  const usedGroups = new Set();

  const takeCandidates = (predicate) => {
    pool.forEach((candidate) => {
      if (selected.length >= desiredCount || usedIds.has(candidate.id) || !predicate(candidate)) {
        return;
      }
      selected.push(candidate);
      usedIds.add(candidate.id);
      if (candidate.continent) {
        usedContinents.add(candidate.continent);
      }
      if (candidate.groupKey) {
        usedGroups.add(candidate.groupKey);
      }
    });
  };

  takeCandidates((candidate) => candidate.groupKey && !usedGroups.has(candidate.groupKey) && candidate.continent && !usedContinents.has(candidate.continent));
  takeCandidates((candidate) => candidate.groupKey && !usedGroups.has(candidate.groupKey));
  takeCandidates((candidate) => candidate.continent && !usedContinents.has(candidate.continent));
  takeCandidates(() => true);

  return selected.slice(0, desiredCount);
}

function buildExamGraphRecommendation(baseLabel, candidates) {
  const picked = selectExamGraphRecommendedCountries(candidates);
  return {
    ids: picked.map((candidate) => candidate.id),
    label: picked.length ? `${baseLabel} 추천 ${picked.length}개국` : "",
  };
}

function getExamGraphRecommendedFocus() {
  if (state.examGraphPresetKey === "stacked100") {
    const definition = getExamGraphCompositionDefinition();
    const rows = buildExamGraphAllCountryCompositionRows(definition);
    const maxTotal = d3.max(rows, (row) => Number(row.total)) || 1;
    return buildExamGraphRecommendation(
      definition.label,
      rows.map((row) => {
        const orderedSegments = [...row.segments].sort((a, b) => Number(b.share) - Number(a.share));
        const dominantSegment = orderedSegments[0];
        const nextSegment = orderedSegments[1];
        const contrast = Number(dominantSegment?.share || 0) - Number(nextSegment?.share || 0);
        return {
          id: row.id,
          continent: row.continent,
          score: Number(dominantSegment?.share || 0) + contrast + (Number(row.total) / maxTotal) * 25,
          groupKey: dominantSegment?.key ?? "mixed",
        };
      }),
    );
  }

  if (state.examGraphPresetKey === "rankBars") {
    const definition = getExamGraphMetricDefinition();
    const rows = buildExamGraphAllCountryMetricRows(definition);
    const percentLike = rows.every((row) => Number(row.value) >= 0 && Number(row.value) <= 100);
    const hasNegative = rows.some((row) => Number(row.value) < 0);
    const medianValue = d3.median(rows, (row) => Number(row.value)) ?? 0;
    const maxAbs = d3.max(rows, (row) => Math.abs(Number(row.value))) || 1;
    return buildExamGraphRecommendation(
      definition.label,
      rows.map((row) => ({
        id: row.id,
        continent: row.continent,
        score:
          hasNegative
            ? Math.abs(Number(row.value))
            : percentLike
              ? Math.abs(Number(row.value) - medianValue) + (Math.abs(Number(row.value)) / maxAbs) * 12
              : Number(row.value),
        groupKey: hasNegative ? (Number(row.value) >= 0 ? "plus" : "minus") : percentLike ? (Number(row.value) >= medianValue ? "high" : "low") : undefined,
      })),
    );
  }

  if (state.examGraphPresetKey === "pairedBars") {
    const pairDefinition = getExamGraphPairDefinition();
    const rows = buildExamGraphAllCountryPairRows(pairDefinition);
    const maxTotal = d3.max(rows, (row) => Number(row.totalValue)) || 1;
    return buildExamGraphRecommendation(
      pairDefinition.label,
      rows.map((row) => {
        const total = Math.max(1, Number(row.totalValue) || 0);
        const contrast = Math.abs(Number(row.firstValue) - Number(row.secondValue)) / total;
        return {
          id: row.id,
          continent: row.continent,
          score: (Number(row.totalValue) / maxTotal) * 70 + contrast * 100,
          groupKey: Number(row.firstValue) >= Number(row.secondValue) ? "first" : "second",
        };
      }),
    );
  }

  if (state.examGraphPresetKey === "timeCompare") {
    const definition = getExamGraphTimeMetricDefinition();
    const rows = buildExamGraphAllCountryTimeRows(definition, state.examGraphYearStart, state.examGraphYearEnd);
    const maxLevel = d3.max(rows, (row) => Math.max(Number(row.startValue), Number(row.endValue))) || 1;
    return buildExamGraphRecommendation(
      `${definition.label} ${state.examGraphYearStart}-${state.examGraphYearEnd}`,
      rows.map((row) => {
        const delta = Number(row.endValue) - Number(row.startValue);
        return {
          id: row.id,
          continent: row.continent,
          score: (Math.max(Number(row.startValue), Number(row.endValue)) / maxLevel) * 60 + Math.abs(delta),
          groupKey: delta >= 0 ? "increase" : "decrease",
        };
      }),
    );
  }

  if (state.examGraphPresetKey === "trendLine") {
    const definition = getExamGraphTimeMetricDefinition();
    const rows = buildExamGraphAllCountryTrendRows(definition, state.examGraphYearStart, state.examGraphYearEnd);
    const maxLevel = d3.max(rows, (row) => d3.max(row.points, (point) => Number(point.value)) || 0) || 1;
    return buildExamGraphRecommendation(
      `${definition.label} 추이`,
      rows.map((row) => {
        const firstValue = Number(row.points[0]?.value) || 0;
        const lastValue = Number(row.points[row.points.length - 1]?.value) || 0;
        const amplitude = (d3.max(row.points, (point) => Number(point.value)) || 0) - (d3.min(row.points, (point) => Number(point.value)) || 0);
        return {
          id: row.id,
          continent: row.continent,
          score: (d3.max(row.points, (point) => Number(point.value)) / maxLevel) * 60 + amplitude,
          groupKey: lastValue >= firstValue ? "up" : "down",
        };
      }),
    );
  }

  if (state.examGraphPresetKey === "scatter") {
    const definitions = getMetricExplorerDefinitions();
    const xDefinition = getMetricExplorerDefinitionByKey(definitions, state.examGraphScatterXKey);
    const yDefinition = getMetricExplorerDefinitionByKey(definitions, state.examGraphScatterYKey);
    const sizeDefinition = getMetricExplorerDefinitionByKey(definitions, state.examGraphScatterSizeKey);
    const rows = buildExamGraphAllCountryScatterRows(xDefinition, yDefinition, sizeDefinition);
    const xMedian = d3.median(rows, (row) => Number(row.xValue)) ?? 0;
    const yMedian = d3.median(rows, (row) => Number(row.yValue)) ?? 0;
    const xSpan = Math.max((d3.max(rows, (row) => Number(row.xValue)) || 0) - (d3.min(rows, (row) => Number(row.xValue)) || 0), 1);
    const ySpan = Math.max((d3.max(rows, (row) => Number(row.yValue)) || 0) - (d3.min(rows, (row) => Number(row.yValue)) || 0), 1);
    const maxBubble = d3.max(rows, (row) => Number(row.sizeValue)) || 1;
    return buildExamGraphRecommendation(
      "산포도 사분면",
      rows.map((row) => ({
        id: row.id,
        continent: row.continent,
        score:
          (Number(row.sizeValue) / maxBubble) * 70 +
          (Math.abs(Number(row.xValue) - xMedian) / xSpan) * 20 +
          (Math.abs(Number(row.yValue) - yMedian) / ySpan) * 20,
        groupKey: `${Number(row.xValue) >= xMedian ? "right" : "left"}-${Number(row.yValue) >= yMedian ? "top" : "bottom"}`,
      })),
    );
  }

  const definition = getExamGraphTopShareMetricDefinition();
  const contributors = buildExamGraphAllCountryTopShareContributors(definition);
  return buildExamGraphRecommendation(
    `${definition.label} 기여`,
    contributors.map((entry) => ({
      id: entry.id,
      continent: entry.continent,
      score: Number(entry.value),
      groupKey: entry.continent,
    })),
  );
}

function getExamGraphRandomYearPairs() {
  if (examGraphPopulationYears.length < 2) {
    return [];
  }

  const indices = [
    0,
    Math.floor(examGraphPopulationYears.length * 0.25),
    Math.floor(examGraphPopulationYears.length * 0.5),
    Math.max(0, examGraphPopulationYears.length - 6),
  ];
  const endYear = examGraphPopulationYears[examGraphPopulationYears.length - 1];
  return [...new Set(indices.map((index) => clamp(index, 0, examGraphPopulationYears.length - 2)))]
    .map((index) => ({
      yearStart: examGraphPopulationYears[index],
      yearEnd: endYear,
    }))
    .filter((pair) => Number(pair.yearStart) < Number(pair.yearEnd));
}

function getExamGraphRandomScenarioPool() {
  const yearPairs = getExamGraphRandomYearPairs();
  return [
    ...[
      ["urban-rural", "share", "countries"],
      ["age-structure", "share", "countries"],
      ["industry-structure", "share", "countries"],
      ["religion-major", "share", "countries"],
      ["energy-summary", "share", "continents"],
      ["electricity-breakdown", "share", "countries"],
      ["fossil-production", "amount", "countries"],
      ["crops-production", "share", "countries"],
      ["livestock-stocks", "share", "countries"],
      ["livestock-meat", "amount", "countries"],
    ].map(([compositionKey, valueMode, grouping]) => ({
      presetKey: "stacked100",
      compositionKey,
      valueMode,
      grouping,
    })),
    ...[
      ["population-total", "amount", "countries"],
      ["population-total", "relative", "continents"],
      ["population-density", "amount", "countries"],
      ["population-urban-share", "amount", "countries"],
      ["population-birth-rate", "amount", "countries"],
      ["population-death-rate", "amount", "countries"],
      ["population-natural-increase-rate", "amount", "countries"],
      ["crops-total-production", "amount", "countries"],
      ["crops-total-exports", "amount", "countries"],
      ["crops-total-imports", "amount", "countries"],
      ["livestock-stock-total", "amount", "countries"],
      ["religion-christians-share", "amount", "countries"],
      ["religion-muslims-share", "amount", "countries"],
      ["religion-hindus-share", "amount", "countries"],
      ["religion-buddhists-share", "amount", "countries"],
      ["energy-renewables-share", "amount", "countries"],
      ["electricity-solar-amount", "amount", "countries"],
      ["electricity-wind-amount", "amount", "countries"],
      ["fossil-production-total", "amount", "countries"],
      ["exports-value", "amount", "countries"],
      ["exports-share", "amount", "countries"],
      ["industry-agriculture-share", "amount", "countries"],
      ["industry-services-share", "amount", "countries"],
      ["age-65plus-share", "amount", "countries"],
      ["age-014-share", "amount", "countries"],
      ["dependency-total", "amount", "countries"],
      ["migration-stock-share", "amount", "countries"],
      ["migration-net", "amount", "countries"],
      ["refugee-origin-total", "amount", "countries"],
      ["refugee-hosted-total", "amount", "countries"],
      ["energy-consumption-per-capita", "amount", "countries"],
      ["electricity-nuclear-share", "amount", "countries"],
    ].map(([metricKey, valueMode, grouping]) => ({
      presetKey: "rankBars",
      metricKey,
      valueMode,
      grouping,
    })),
    ...[
      ["urban-rural-total", "amount", "countries"],
      ["young-old-share", "share", "countries"],
      ["birth-death-rate", "amount", "countries"],
      ["dependency-balance", "share", "countries"],
      ["christians-muslims-share", "share", "countries"],
      ["hindus-buddhists-share", "share", "countries"],
      ["grain-total-trade", "amount", "continents"],
      ["wheat-trade", "amount", "countries"],
      ["rice-trade", "amount", "countries"],
      ["maize-trade", "amount", "countries"],
      ["solar-wind-amount", "amount", "countries"],
      ["oil-gas-production", "amount", "countries"],
      ["agri-services-share", "share", "countries"],
    ].map(([pairKey, valueMode, grouping]) => ({
      presetKey: "pairedBars",
      pairKey,
      valueMode,
      grouping,
    })),
    ...yearPairs.flatMap((pair) => [
      {
        presetKey: "timeCompare",
        timeMetricKey: "population-total",
        valueMode: "amount",
        grouping: "countries",
        ...pair,
      },
      {
        presetKey: "timeCompare",
        timeMetricKey: "population-total",
        valueMode: "relative",
        grouping: "continents",
        ...pair,
      },
      {
        presetKey: "timeCompare",
        timeMetricKey: "population-urban-share",
        valueMode: "amount",
        grouping: "countries",
        ...pair,
      },
      {
        presetKey: "timeCompare",
        timeMetricKey: "population-urban-total",
        valueMode: "amount",
        grouping: "countries",
        ...pair,
      },
      {
        presetKey: "trendLine",
        timeMetricKey: "population-total",
        valueMode: "amount",
        grouping: "countries",
        ...pair,
      },
      {
        presetKey: "trendLine",
        timeMetricKey: "population-total",
        valueMode: "relative",
        grouping: "continents",
        ...pair,
      },
      {
        presetKey: "trendLine",
        timeMetricKey: "population-urban-share",
        valueMode: "amount",
        grouping: "countries",
        ...pair,
      },
      {
        presetKey: "trendLine",
        timeMetricKey: "population-urban-total",
        valueMode: "share",
        grouping: "continents",
        ...pair,
      },
      {
        presetKey: "trendLine",
        timeMetricKey: "population-birth-rate",
        valueMode: "amount",
        grouping: "countries",
        ...pair,
      },
      {
        presetKey: "trendLine",
        timeMetricKey: "population-natural-increase-rate",
        valueMode: "amount",
        grouping: "countries",
        ...pair,
      },
    ]),
    ...[
      ["population-urban-share", "age-65plus-share", "population-total"],
      ["population-birth-rate", "population-death-rate", "population-total"],
      ["population-natural-increase-rate", "migration-net", "population-total"],
      ["industry-agriculture-share", "industry-services-share", "exports-value"],
      ["energy-renewables-share", "electricity-coal-share", "energy-consumption-total"],
      ["crops-total-exports", "crops-total-imports", "crops-total-production"],
      ["religion-christians-share", "religion-muslims-share", "population-total"],
      ["religion-hindus-share", "religion-buddhists-share", "population-total"],
    ].map(([xKey, yKey, sizeKey]) => ({
      presetKey: "scatter",
      grouping: "countries",
      scatterXKey: xKey,
      scatterYKey: yKey,
      scatterSizeKey: sizeKey,
    })),
    ...[
      "population-total",
      "electricity-renewables-amount",
      "energy-consumption-total",
      "fossil-production-total",
      "crops-total-production",
      "livestock-stock-total",
      "exports-value",
    ].map((topShareMetricKey) => ({
      presetKey: "top3share",
      topShareMetricKey,
      grouping: "continents",
      valueMode: "share",
    })),
  ];
}

function applyExamGraphScenarioConfig(config) {
  if (!config) {
    return;
  }
  state.examGraphPresetKey = config.presetKey ?? state.examGraphPresetKey;
  state.examGraphGrouping = config.grouping ?? state.examGraphGrouping;
  state.examGraphValueMode = config.valueMode ?? state.examGraphValueMode;
  if (config.compositionKey) {
    state.examGraphCompositionKey = config.compositionKey;
  }
  if (config.metricKey) {
    state.examGraphMetricKey = config.metricKey;
  }
  if (config.pairKey) {
    state.examGraphPairKey = config.pairKey;
  }
  if (config.timeMetricKey) {
    state.examGraphTimeMetricKey = config.timeMetricKey;
  }
  if (config.topShareMetricKey) {
    state.examGraphTopShareMetricKey = config.topShareMetricKey;
  }
  if (config.scatterXKey) {
    state.examGraphScatterXKey = config.scatterXKey;
  }
  if (config.scatterYKey) {
    state.examGraphScatterYKey = config.scatterYKey;
  }
  if (config.scatterSizeKey) {
    state.examGraphScatterSizeKey = config.scatterSizeKey;
  }
  if (Number.isFinite(Number(config.yearStart))) {
    state.examGraphYearStart = Number(config.yearStart);
  }
  if (Number.isFinite(Number(config.yearEnd))) {
    state.examGraphYearEnd = Number(config.yearEnd);
  }
}

function tryApplyRandomExamGraphScenario({ includeCountries = false } = {}) {
  const snapshot = captureExamGraphStateSnapshot();
  const scenarios = shuffleExamGraphItems(getExamGraphRandomScenarioPool());

  for (const scenario of scenarios) {
    restoreExamGraphStateSnapshot(snapshot);
    applyExamGraphScenarioConfig(scenario);
    ensureExamGraphState();

    let recommendation = null;
    if (includeCountries) {
      recommendation = getExamGraphRecommendedFocus();
      if (!recommendation?.ids?.length) {
        continue;
      }
      state.examGraphFocusCountryIds = recommendation.ids;
      state.examGraphFocusLabel = recommendation.label;
      state.examGraphGrouping = scenario.grouping ?? "countries";
      ensureExamGraphState();
    }

    const model = buildExamGraphModel();
    if (model) {
      const result = { scenario, model, recommendation };
      restoreExamGraphStateSnapshot(snapshot);
      return result;
    }
  }

  restoreExamGraphStateSnapshot(snapshot);
  return null;
}

function applyExamGraphRandomCountries() {
  const recommendation = getExamGraphRecommendedFocus();
  if (!recommendation?.ids?.length) {
    setStatus("추천할 국가 조합을 찾지 못했습니다. 다른 프리셋이나 통계를 선택해 보세요.");
    return;
  }

  updateExamGraphState("출제형 그래프 국가 추천", () => {
    state.examGraphFocusCountryIds = recommendation.ids;
    state.examGraphFocusLabel = recommendation.label;
  });
  setStatus(`추천 대상을 그래프 범위에 반영했습니다. (${recommendation.label})`);
}

function applyExamGraphRandomScenario({ graphOnly = false } = {}) {
  const result = tryApplyRandomExamGraphScenario({ includeCountries: !graphOnly });
  if (!result?.model) {
    setStatus("랜덤 추천에 쓸 통계 조합을 찾지 못했습니다.");
    return;
  }

  updateExamGraphState(graphOnly ? "출제형 그래프 통계 추천" : "출제형 그래프 세트 추천", () => {
    applyExamGraphScenarioConfig(result.scenario);
    if (!graphOnly && result.recommendation?.ids?.length) {
      state.examGraphFocusCountryIds = result.recommendation.ids;
      state.examGraphFocusLabel = result.recommendation.label;
    }
  });

  setStatus(
    graphOnly
      ? `${result.model.title} 기준으로 그래프 통계를 바꿨습니다.`
      : `${result.model.title}와 함께 추천 대상을 갱신했습니다. (${result.recommendation?.label ?? "자동 추천"})`,
  );
}

function buildExamGraphModel() {
  const preset = getExamGraphPresetDefinition();
  if (preset.key === "stacked100") {
    return buildExamStackedGraphModel();
  }
  if (preset.key === "rankBars") {
    return buildExamRankBarGraphModel();
  }
  if (preset.key === "pairedBars") {
    return buildExamPairedBarGraphModel();
  }
  if (preset.key === "timeCompare") {
    return buildExamTimeCompareModel();
  }
  if (preset.key === "trendLine") {
    return buildExamTrendLineGraphModel();
  }
  if (preset.key === "scatter") {
    return buildExamScatterGraphModel();
  }
  return buildExamTopShareGraphModel();
}

function buildExamStackedGraphModel() {
  const definition = getExamGraphCompositionDefinition();
  const result = getExamGraphCompositionRows(definition, state.examGraphGrouping);
  if (!result.rows.length) {
    return null;
  }

  const rows = applyExamGraphDisplayLabels(result.rows);
  const legendItems = buildExamLegendItemsFromRows(rows);
  const valueMode = state.examGraphValueMode === "amount" ? "amount" : "share";
  const amountFormatter = buildExamGraphAmountFormatter(rows, definition.key);
  const svgNode = buildExamStackedCompositionSvg({
    title: definition.label,
    subtitle: definition.description,
    rows,
    legendItems,
    mode: valueMode,
    valueFormatter: valueMode === "amount" ? amountFormatter : (value) => formatPercent(value),
    footnote:
      valueMode === "amount"
        ? state.examGraphGrouping === "continents"
          ? `* ${result.scopeLabel} 기준으로 묶은 실제 양입니다.`
          : "* 각 행의 실제 값을 같은 눈금에서 비교한 값입니다."
        : state.examGraphGrouping === "continents"
          ? `* ${result.scopeLabel} 기준으로 묶은 합 또는 평균 비중입니다.`
          : "* 각 행의 합을 100%로 환산한 값입니다.",
  });

  return {
    presetKey: getExamGraphPresetDefinition().key,
    metricKey: definition.key,
    presetLabel: getExamGraphPresetDefinition().label,
    title: definition.label,
    description: definition.description,
    metricLabel: definition.label,
    metricDetail: state.examGraphGrouping === "continents" ? `대륙 묶음${getExamGraphContinentScopeSuffix("continents")}` : "국가별 비교",
    groupLabel: getExamGraphGroupingLabel(state.examGraphGrouping),
    scopeLabel: result.scopeLabel,
    sourceDetail: result.sourceDetail,
    rowCountText: `${rows.length}개 행`,
    displayModeLabel: valueMode === "amount" ? "양" : "비율",
    displayModeDetail:
      valueMode === "amount" ? "구성 요소의 실제 양을 누적막대로 비교" : "각 행의 합을 100으로 환산",
    rows,
    svgNode,
    exportName: buildExamGraphFileName(["stacked", definition.key, state.examGraphGrouping, valueMode]),
    valueRows: buildExamGraphValueRows(
      rows,
      (row) =>
        row.segments
          .map((segment) =>
            valueMode === "amount"
              ? `${segment.label} ${amountFormatter(segment.value)}`
              : `${segment.label} ${formatPercent(segment.share)}`,
          )
          .join(" · "),
    ),
    answerRows: buildExamGraphAnswerRows(
      rows,
      (row) =>
        row.segments
          .map((segment) =>
            valueMode === "amount"
              ? `${segment.label} ${amountFormatter(segment.value)}`
              : `${segment.label} ${formatPercent(segment.share)}`,
          )
          .join(" · "),
    ),
  };
}

function buildExamRankBarGraphModel() {
  const definition = getExamGraphMetricDefinition();
  const result = getExamGraphMetricRows(definition, state.examGraphGrouping);
  if (!result.rows.length) {
    return null;
  }

  const transformed = transformExamGraphRowsByMode(
    result.rows.map((row) => ({ ...row, formatter: definition.formatter })),
    state.examGraphValueMode,
  );
  const rows = applyExamGraphDisplayLabels(transformed.rows);
  const svgNode = buildExamSingleBarSvg({
    title: definition.label,
    subtitle: definition.category,
    rows,
    valueFormatter: transformed.valueFormatter,
  });

  return {
    presetKey: getExamGraphPresetDefinition().key,
    metricKey: definition.key,
    presetLabel: getExamGraphPresetDefinition().label,
    title: definition.label,
    description: definition.category,
    metricLabel: definition.label,
    metricDetail: definition.category,
    groupLabel: getExamGraphGroupingLabel(state.examGraphGrouping),
    scopeLabel: result.scopeLabel,
    sourceDetail: result.sourceDetail,
    rowCountText: `${rows.length}개 막대`,
    displayModeLabel: transformed.displayModeLabel,
    displayModeDetail: transformed.displayModeDetail,
    rows,
    svgNode,
    exportName: buildExamGraphFileName(["rank", definition.key, state.examGraphGrouping, state.examGraphValueMode]),
    valueRows: buildExamGraphValueRows(
      rows,
      (row) =>
        `${definition.formatter(row.value)}${
          state.examGraphValueMode === "share"
            ? ` · 범위 비중 ${formatPercent(row.displayValue)}`
            : state.examGraphValueMode === "relative"
              ? ` · 상댓값 ${formatRelativeIndex(row.displayValue)}`
              : row.detail
                ? ` · ${row.detail}`
                : ""
        }`,
    ),
    answerRows: buildExamGraphAnswerRows(
      rows,
      (row) => `${definition.formatter(row.value)}${row.detail ? ` · ${row.detail}` : ""}`,
    ),
  };
}

function buildExamPairedBarGraphModel() {
  const pairDefinition = getExamGraphPairDefinition();
  const result = getExamGraphPairRows(pairDefinition, state.examGraphGrouping);
  if (!result.rows.length) {
    return null;
  }

  const [firstDefinition, secondDefinition] = result.definitions;
  const transformed = transformExamGraphPairRowsByMode(
    result.rows,
    state.examGraphValueMode,
    firstDefinition,
    secondDefinition,
  );
  const rows = applyExamGraphDisplayLabels(transformed.rows);
  const svgNode = buildExamPairedBarSvg({
    title: pairDefinition.label,
    subtitle: pairDefinition.description,
    rows,
    legendItems: [
      { label: firstDefinition.label, fill: getExamGraphFill(0) },
      { label: secondDefinition.label, fill: getExamGraphFill(1) },
    ],
    valueFormatter: transformed.valueFormatter,
  });

  return {
    presetKey: getExamGraphPresetDefinition().key,
    metricKey: pairDefinition.key,
    presetLabel: getExamGraphPresetDefinition().label,
    title: pairDefinition.label,
    description: pairDefinition.description,
    metricLabel: `${firstDefinition.label} / ${secondDefinition.label}`,
    metricDetail: pairDefinition.description,
    groupLabel: getExamGraphGroupingLabel(state.examGraphGrouping),
    scopeLabel: result.scopeLabel,
    sourceDetail: result.sourceDetail,
    rowCountText: `${rows.length}개 행`,
    displayModeLabel: transformed.displayModeLabel,
    displayModeDetail: transformed.displayModeDetail,
    rows,
    svgNode,
    exportName: buildExamGraphFileName(["pair", pairDefinition.key, state.examGraphGrouping, state.examGraphValueMode]),
    valueRows: buildExamGraphValueRows(
      rows,
      (row) =>
        `${firstDefinition.label} ${firstDefinition.formatter(row.firstValue)} · ${secondDefinition.label} ${secondDefinition.formatter(row.secondValue)}${
          state.examGraphValueMode === "share"
            ? ` · 행내 비중 ${formatPercent(row.displayFirstValue)} / ${formatPercent(row.displaySecondValue)}`
            : state.examGraphValueMode === "relative"
              ? ` · 상댓값 ${formatRelativeIndex(row.displayFirstValue)} / ${formatRelativeIndex(row.displaySecondValue)}`
              : row.detail
                ? ` · ${row.detail}`
                : ""
        }`,
    ),
    answerRows: buildExamGraphAnswerRows(
      rows,
      (row) => `${firstDefinition.label} ${firstDefinition.formatter(row.firstValue)} · ${secondDefinition.label} ${secondDefinition.formatter(row.secondValue)}`,
    ),
  };
}

function buildExamTimeCompareModel() {
  const definition = getExamGraphTimeMetricDefinition();
  const result = getExamGraphTimeRows(definition, state.examGraphGrouping, state.examGraphYearStart, state.examGraphYearEnd);
  if (!result.rows.length) {
    return null;
  }

  const transformedRows = transformExamGraphTimeRowsByMode(result.rows, state.examGraphValueMode, definition.formatter);
  const rows = applyExamGraphDisplayLabels(transformedRows.rows);
  const svgNode = buildExamTimeCompareSvg({
    title: `${definition.label} 변화`,
    subtitle: `${state.examGraphYearStart}년과 ${state.examGraphYearEnd}년 값을 같은 눈금으로 비교합니다.`,
    rows,
    startYear: state.examGraphYearStart,
    endYear: state.examGraphYearEnd,
    valueFormatter: transformedRows.valueFormatter,
  });

  return {
    presetKey: getExamGraphPresetDefinition().key,
    metricKey: definition.key,
    presetLabel: getExamGraphPresetDefinition().label,
    title: `${definition.label} 변화`,
    description: `${state.examGraphYearStart}년과 ${state.examGraphYearEnd}년 비교`,
    metricLabel: definition.label,
    metricDetail: `${state.examGraphYearStart}년 ↔ ${state.examGraphYearEnd}년`,
    groupLabel: getExamGraphGroupingLabel(state.examGraphGrouping),
    scopeLabel: result.scopeLabel,
    sourceDetail: result.sourceDetail,
    rowCountText: `${rows.length}개 행`,
    displayModeLabel: transformedRows.displayModeLabel,
    displayModeDetail: transformedRows.displayModeDetail,
    rows,
    svgNode,
    exportName: buildExamGraphFileName(["time", definition.key, state.examGraphYearStart, state.examGraphYearEnd, state.examGraphValueMode]),
    startYear: state.examGraphYearStart,
    endYear: state.examGraphYearEnd,
    valueRows: buildExamGraphValueRows(
      rows,
      (row) =>
        `${state.examGraphYearStart}년 ${definition.formatter(row.startValue)} · ${state.examGraphYearEnd}년 ${definition.formatter(row.endValue)}${
          state.examGraphValueMode === "share"
            ? ` · 범위 비중 ${formatPercent(row.displayStartValue)} / ${formatPercent(row.displayEndValue)}`
            : state.examGraphValueMode === "relative"
              ? ` · 상댓값 ${formatRelativeIndex(row.displayStartValue)} / ${formatRelativeIndex(row.displayEndValue)}`
              : ""
        }`,
    ),
    answerRows: buildExamGraphAnswerRows(
      rows,
      (row) => `${state.examGraphYearStart}년 ${definition.formatter(row.startValue)} → ${state.examGraphYearEnd}년 ${definition.formatter(row.endValue)}`,
    ),
  };
}

function buildExamTrendLineGraphModel() {
  const definition = getExamGraphTimeMetricDefinition();
  const result = getExamGraphTrendRows(definition, state.examGraphGrouping, state.examGraphYearStart, state.examGraphYearEnd);
  if (!result.rows.length || result.years.length < 2) {
    return null;
  }

  const transformed = transformExamGraphTrendRowsByMode(result.rows, result.years, state.examGraphValueMode, definition.formatter);
  const rows = applyExamGraphDisplayLabels(transformed.rows);
  const svgNode = buildExamTrendLineSvg({
    title: `${definition.label} 추이`,
    subtitle: `${state.examGraphYearStart}년~${state.examGraphYearEnd}년`,
    rows,
    years: result.years,
    valueFormatter: transformed.valueFormatter,
  });

  return {
    presetKey: getExamGraphPresetDefinition().key,
    metricKey: definition.key,
    presetLabel: getExamGraphPresetDefinition().label,
    title: `${definition.label} 추이`,
    description: `${state.examGraphYearStart}년부터 ${state.examGraphYearEnd}년까지`,
    metricLabel: definition.label,
    metricDetail: `${state.examGraphYearStart}년~${state.examGraphYearEnd}년`,
    groupLabel: getExamGraphGroupingLabel(state.examGraphGrouping),
    scopeLabel: result.scopeLabel,
    sourceDetail: result.sourceDetail,
    rowCountText: `${rows.length}개 선`,
    displayModeLabel: transformed.displayModeLabel,
    displayModeDetail: transformed.displayModeDetail,
    rows,
    svgNode,
    exportName: buildExamGraphFileName(["trend", definition.key, state.examGraphYearStart, state.examGraphYearEnd, state.examGraphValueMode]),
    valueRows: buildExamGraphValueRows(
      rows,
      (row) => {
        const startPoint = row.points[0];
        const endPoint = row.points[row.points.length - 1];
        return `${startPoint.year}년 ${definition.formatter(startPoint.value)} → ${endPoint.year}년 ${definition.formatter(endPoint.value)}`;
      },
    ),
    answerRows: buildExamGraphAnswerRows(
      rows,
      (row) => {
        const startPoint = row.points[0];
        const endPoint = row.points[row.points.length - 1];
        return `${startPoint.year}년 ${definition.formatter(startPoint.value)} → ${endPoint.year}년 ${definition.formatter(endPoint.value)}`;
      },
    ),
  };
}

function buildExamScatterGraphModel() {
  const metricDefinitions = getMetricExplorerDefinitions();
  const xDefinition = getMetricExplorerDefinitionByKey(metricDefinitions, state.examGraphScatterXKey);
  const yDefinition = getMetricExplorerDefinitionByKey(metricDefinitions, state.examGraphScatterYKey);
  const sizeDefinition = getMetricExplorerDefinitionByKey(metricDefinitions, state.examGraphScatterSizeKey);
  const selectedRows = getExamGraphSelectedCountryRows();
  const selectionOrder = new Map(selectedRows.map((entry, index) => [entry.id, index]));
  let rows = getExamGraphScatterRows(xDefinition, yDefinition, sizeDefinition, state.examGraphGrouping);
  if (state.examGraphGrouping === "countries" && selectedRows.length) {
    rows = rows.sort((a, b) => d3.ascending(selectionOrder.get(a.id) ?? 999, selectionOrder.get(b.id) ?? 999));
  } else if (state.examGraphGrouping === "countries") {
    rows = rows.sort((a, b) => Number(b.sizeValue) - Number(a.sizeValue)).slice(0, getExamGraphTopN());
  } else {
    rows = rows.sort((a, b) => Number(b.sizeValue) - Number(a.sizeValue));
  }

  if (!rows.length) {
    return null;
  }

  const displayRows = rows.map((row, index) => ({
    ...row,
    actualLabel: row.label,
    displayLabel: state.examGraphAliasMode ? getExamGraphAlias(index) : row.label,
  }));
  const svgNode = buildExamScatterSvg({
    title: `${xDefinition.label}와 ${yDefinition.label}`,
    subtitle: `버블 크기: ${sizeDefinition.label}`,
    rows: displayRows,
    xLabel: xDefinition.label,
    yLabel: yDefinition.label,
    xFormatter: xDefinition.formatter,
    yFormatter: yDefinition.formatter,
    sizeFormatter: sizeDefinition.formatter,
  });

  return {
    presetKey: getExamGraphPresetDefinition().key,
    metricKey: `${xDefinition.key}:${yDefinition.key}:${sizeDefinition.key}`,
    presetLabel: getExamGraphPresetDefinition().label,
    title: `${xDefinition.label}와 ${yDefinition.label}`,
    description: `버블 크기 ${sizeDefinition.label}`,
    metricLabel: `${xDefinition.label} / ${yDefinition.label}`,
    metricDetail: `버블 ${sizeDefinition.label}`,
    groupLabel: getExamGraphGroupingLabel(state.examGraphGrouping),
    sourceDetail: getExamGraphScopeSourceText(),
    scopeLabel:
      state.examGraphGrouping === "continents"
        ? `대륙별 평균 또는 합계${getExamGraphContinentScopeSuffix("continents")}`
        : selectedRows.length
          ? `선택 국가 ${displayRows.length}개`
          : `전체 자료 상위 ${displayRows.length}개국`,
    rowCountText: `${displayRows.length}개 점`,
    rows: displayRows,
    svgNode,
    exportName: buildExamGraphFileName(["scatter", xDefinition.key, yDefinition.key, sizeDefinition.key]),
    xLabel: xDefinition.label,
    yLabel: yDefinition.label,
    sizeLabel: sizeDefinition.label,
    valueRows: buildExamGraphValueRows(
      displayRows,
      (row) =>
        `X ${xDefinition.formatter(row.xValue)} · Y ${yDefinition.formatter(row.yValue)} · 크기 ${sizeDefinition.formatter(row.sizeDisplayValue)}`,
    ),
    answerRows: buildExamGraphAnswerRows(
      displayRows,
      (row) => `X ${xDefinition.formatter(row.xValue)} · Y ${yDefinition.formatter(row.yValue)}`,
    ),
  };
}

function buildExamTopShareGraphModel() {
  const definition = getExamGraphTopShareMetricDefinition();
  const selectedContinents = [...new Set(
    getExamGraphSelectedCountryRows()
      .map((entry) => getExamGraphContinentGroupName(entry.stats?.continent?.name, { grouping: "continents", presetKey: "top3share" }))
      .filter(Boolean),
  )];
  const allowedContinentSet = selectedContinents.length ? new Set(selectedContinents) : null;
  const contributors = getExamGraphAllCountryRows()
    .filter((entry) => !allowedContinentSet || allowedContinentSet.has(getExamGraphContinentGroupName(entry.stats?.continent?.name, { grouping: "continents", presetKey: "top3share" })))
    .map((entry) => {
      const metric = definition.getValue(entry.stats);
      if (!metric || !Number.isFinite(Number(metric.value))) {
        return null;
      }
      return {
        label: entry.label,
        continent: getExamGraphContinentGroupName(entry.stats?.continent?.name, { grouping: "continents", presetKey: "top3share" }),
        value: Number(metric.value),
      };
    })
    .filter(Boolean);

  const rows = [...d3.group(contributors, (entry) => entry.continent).entries()]
    .map(([continent, entries]) => {
      const ordered = [...entries].sort((a, b) => Number(b.value) - Number(a.value));
      const total = d3.sum(ordered, (entry) => Number(entry.value) || 0);
      if (!total) {
        return null;
      }
      const topEntries = ordered.slice(0, 3);
      const topValue = d3.sum(topEntries, (entry) => Number(entry.value) || 0);
      const segments = topEntries.map((entry, index) => ({
        key: `top-${index + 1}`,
        label: String.fromCharCode(65 + index),
        actualLabel: entry.label,
        value: Number(entry.value),
        share: (Number(entry.value) / total) * 100,
      }));
      if (total - topValue > 0) {
        segments.push({
          key: "others",
          label: "기타",
          actualLabel: "기타",
          value: total - topValue,
          share: ((total - topValue) / total) * 100,
        });
      }

      return {
        id: continent,
        label: continent,
        actualLabel: continent,
        total,
        segments,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.total) - Number(a.total));

  if (!rows.length) {
    return null;
  }

  const displayRows = applyExamGraphDisplayLabels(rows);
  const svgNode = buildExamStackedCompositionSvg({
    title: `${definition.label} 상위 3개국 비중`,
    subtitle: `대륙별 상위 3개국과 기타 비중${getExamGraphContinentScopeSuffix("continents", "top3share")}`,
    rows: displayRows,
    legendItems: [
      { label: "A" },
      { label: "B" },
      { label: "C" },
      { label: "기타" },
    ],
    footnote: `* 각 대륙 내부에서 해당 지표 상위 3개국이 차지하는 비율입니다.${shouldExamGraphMergeAmericas("continents", "top3share") ? " 아메리카는 북·남아메리카를 합산했습니다." : ""}`,
  });

  return {
    presetKey: getExamGraphPresetDefinition().key,
    metricKey: definition.key,
    presetLabel: getExamGraphPresetDefinition().label,
    title: `${definition.label} 상위 3개국 비중`,
    description: `대륙별 상위 3개국과 기타 비중${getExamGraphContinentScopeSuffix("continents", "top3share")}`,
    metricLabel: definition.label,
    metricDetail: selectedContinents.length ? `${selectedContinents.length}개 대륙 선택` : `전 세계 대륙${getExamGraphContinentScopeSuffix("continents", "top3share")}`,
    groupLabel: getExamGraphGroupingLabel("continents", "top3share"),
    sourceDetail: selectedContinents.length ? `선택 국가가 속한 대륙${getExamGraphContinentScopeSuffix("continents", "top3share")}` : `전 세계 대륙${getExamGraphContinentScopeSuffix("continents", "top3share")}`,
    scopeLabel: selectedContinents.length ? selectedContinents.join(" · ") : `전 세계 대륙${getExamGraphContinentScopeSuffix("continents", "top3share")}`,
    rowCountText: `${displayRows.length}개 대륙`,
    displayModeLabel: "비율",
    displayModeDetail: "각 대륙 내부 합을 100으로 환산",
    rows: displayRows,
    svgNode,
    exportName: buildExamGraphFileName(["top3", definition.key]),
    valueRows: buildExamGraphValueRows(
      displayRows,
      (row) => row.segments.map((segment) => `${segment.label} ${formatPercent(segment.share)}`).join(" · "),
    ),
    answerRows: buildExamGraphAnswerRows(
      displayRows,
      (row) =>
        row.segments
          .filter((segment) => segment.label !== "기타")
          .map((segment) => `${segment.label} ${segment.actualLabel}`)
          .join(" · "),
    ),
  };
}

function getExamGraphCompositionRows(definition, grouping) {
  const selectedRows = getExamGraphSelectedCountryRows();
  const sourceRows = selectedRows.length ? selectedRows : getExamGraphAllCountryRows();
  const countryRows = sourceRows
    .map((entry) => {
      const components = (definition.getComponents(entry.stats) ?? [])
        .map((component) => ({
          ...component,
          value: Number(component?.value),
        }))
        .filter((component) => Number.isFinite(component.value) && component.value >= 0);
      const total = d3.sum(components, (component) => component.value);
      if (!components.length || total <= 0) {
        return null;
      }

      return {
        id: entry.id,
        label: entry.label,
        actualLabel: entry.label,
        continent: entry.stats?.continent?.name ?? "미분류",
        total,
        segments: components.map((component) => ({
          ...component,
          share: total > 0 ? (component.value / total) * 100 : 0,
        })),
      };
    })
    .filter(Boolean);

  if (grouping === "countries") {
    return {
      rows: selectedRows.length ? countryRows : countryRows.sort((a, b) => Number(b.total) - Number(a.total)).slice(0, getExamGraphTopN()),
      scopeLabel: selectedRows.length ? getExamGraphCountryScopeLabel(countryRows.length) : `전체 자료 상위 ${Math.min(countryRows.length, getExamGraphTopN())}개국`,
    };
  }

  const groupedRows = [...d3.group(countryRows, (row) => getExamGraphContinentGroupName(row.continent, { grouping })).entries()]
    .map(([continent, rows]) => {
      const componentMeta = new Map();
      rows.forEach((row) => {
        row.segments.forEach((segment) => {
          if (!componentMeta.has(segment.key)) {
            componentMeta.set(segment.key, segment.label);
          }
        });
      });

      const segments = [...componentMeta.entries()]
        .map(([key, label]) => {
          const values = rows
            .map((row) => row.segments.find((segment) => segment.key === key)?.value)
            .filter((value) => Number.isFinite(Number(value)));
          if (!values.length) {
            return null;
          }
          const value =
            definition.aggregation === "mean"
              ? d3.mean(values) ?? null
              : d3.sum(values);
          if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
            return null;
          }
          return {
            key,
            label,
            value: Number(value),
          };
        })
        .filter(Boolean);

      const total = d3.sum(segments, (segment) => Number(segment.value) || 0);
      if (!segments.length || total <= 0) {
        return null;
      }

      return {
        id: continent,
        label: continent,
        actualLabel: continent,
        total,
        segments: segments.map((segment) => ({
          ...segment,
          share: (Number(segment.value) / total) * 100,
        })),
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.total) - Number(a.total));

  return {
    rows: groupedRows,
    scopeLabel: selectedRows.length ? getExamGraphContinentScopeLabel(groupedRows.length) : `전 세계 대륙${getExamGraphContinentScopeSuffix(grouping)}`,
  };
}

function getExamGraphTimeRows(definition, grouping, yearStart, yearEnd) {
  const selectedRows = getExamGraphSelectedCountryRows();
  const sourceRows = selectedRows.length ? selectedRows : getExamGraphAllCountryRows();

  if (grouping === "countries") {
    const rows = sourceRows
      .map((entry) => {
        const startValue = definition.getYearValue(entry.stats, yearStart);
        const endValue = definition.getYearValue(entry.stats, yearEnd);
        if (!Number.isFinite(Number(startValue)) || !Number.isFinite(Number(endValue))) {
          return null;
        }
        return {
          id: entry.id,
          label: entry.label,
          actualLabel: entry.label,
          startValue: Number(startValue),
          endValue: Number(endValue),
        };
      })
      .filter(Boolean);

    return {
      rows: selectedRows.length ? rows : rows.sort((a, b) => Number(b.endValue) - Number(a.endValue)).slice(0, getExamGraphTopN()),
      scopeLabel: selectedRows.length ? getExamGraphCountryScopeLabel(rows.length) : `전체 자료 상위 ${Math.min(rows.length, getExamGraphTopN())}개국`,
    };
  }

  const rows = [...d3.group(sourceRows, (entry) => getExamGraphContinentGroupName(entry.stats?.continent?.name, { grouping })).entries()]
    .map(([continent, entries]) => {
      const startValue = getExamGraphTimeGroupValue(definition, entries, yearStart);
      const endValue = getExamGraphTimeGroupValue(definition, entries, yearEnd);
      if (!Number.isFinite(Number(startValue)) || !Number.isFinite(Number(endValue))) {
        return null;
      }
      return {
        id: continent,
        label: continent,
        actualLabel: continent,
        startValue: Number(startValue),
        endValue: Number(endValue),
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.endValue) - Number(a.endValue));

  return {
    rows,
    scopeLabel: selectedRows.length ? getExamGraphContinentScopeLabel(rows.length) : `전 세계 대륙${getExamGraphContinentScopeSuffix(grouping)}`,
  };
}

function getExamGraphTimeGroupValue(definition, entries, year) {
  if (definition.key === "population-urban-share") {
    const rows = entries.map((entry) => getExamGraphPopulationRow(entry.stats, year)).filter(Boolean);
    const urbanTotal = d3.sum(rows, (row) => Number(row.urbanPopulation) || 0);
    const populationTotal = d3.sum(rows, (row) => Number(row.population) || 0);
    return populationTotal > 0 ? (urbanTotal / populationTotal) * 100 : null;
  }

  const values = entries
    .map((entry) => definition.getYearValue(entry.stats, year))
    .filter((value) => Number.isFinite(Number(value)));
  if (!values.length) {
    return null;
  }
  if (definition.aggregate === "mean") {
    return d3.mean(values) ?? null;
  }
  return d3.sum(values);
}

function getExamGraphMetricRows(definition, grouping) {
  const selectedRows = getExamGraphSelectedCountryRows();
  const sourceRows = selectedRows.length ? selectedRows : getExamGraphAllCountryRows();
  const countryRows = sourceRows
    .map((entry) => {
      const metric = definition.getValue(entry.stats);
      if (!metric || !Number.isFinite(Number(metric.value))) {
        return null;
      }

      return {
        id: entry.id,
        label: entry.label,
        actualLabel: entry.label,
        value: Number(metric.value),
        year: metric.year ?? null,
        detail: [metric.detail, entry.stats?.continent?.name].filter(Boolean).join(" · "),
        continent: entry.stats?.continent?.name ?? "미분류",
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.value) - Number(a.value));

  if (grouping === "countries") {
    const rows = selectedRows.length ? countryRows : countryRows.slice(0, getExamGraphTopN());
    return {
      rows,
      scopeLabel: getExamGraphCountryScopeLabel(rows.length),
      sourceDetail: getExamGraphScopeSourceText(),
    };
  }

  const rows = [...d3.group(countryRows, (entry) => getExamGraphContinentGroupName(entry.continent, { grouping })).entries()]
    .map(([continent, entries]) => {
      const values = entries.map((entry) => Number(entry.value));
      const aggregateValue =
        definition.aggregation === "mean" ? d3.mean(values) ?? null : d3.sum(values);
      if (!Number.isFinite(Number(aggregateValue))) {
        return null;
      }

      const years = entries.map((entry) => entry.year).filter(Boolean);
      return {
        id: continent,
        label: continent,
        actualLabel: continent,
        value: Number(aggregateValue),
        year: years.length ? Math.max(...years) : null,
        detail:
          definition.aggregation === "mean"
            ? `${entries.length}개국 평균`
            : `${entries.length}개국 합계`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.value) - Number(a.value));

  return {
    rows,
    scopeLabel: getExamGraphContinentScopeLabel(rows.length),
    sourceDetail: getExamGraphScopeSourceText(),
  };
}

function getExamGraphPairRows(pairDefinition, grouping) {
  const metricDefinitions = getMetricExplorerDefinitions();
  const firstDefinition = getMetricExplorerDefinitionByKey(metricDefinitions, pairDefinition.metricKeys[0]);
  const secondDefinition = getMetricExplorerDefinitionByKey(metricDefinitions, pairDefinition.metricKeys[1]);
  const selectedRows = getExamGraphSelectedCountryRows();
  const sourceRows = selectedRows.length ? selectedRows : getExamGraphAllCountryRows();
  const countryRows = sourceRows
    .map((entry) => {
      const firstMetric = firstDefinition.getValue(entry.stats);
      const secondMetric = secondDefinition.getValue(entry.stats);
      if (!firstMetric || !secondMetric) {
        return null;
      }
      if (!Number.isFinite(Number(firstMetric.value)) || !Number.isFinite(Number(secondMetric.value))) {
        return null;
      }

      return {
        id: entry.id,
        label: entry.label,
        actualLabel: entry.label,
        firstValue: Number(firstMetric.value),
        secondValue: Number(secondMetric.value),
        totalValue: Number(firstMetric.value) + Number(secondMetric.value),
        detail: [entry.stats?.continent?.name].filter(Boolean).join(" · "),
        continent: entry.stats?.continent?.name ?? "미분류",
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.totalValue) - Number(a.totalValue));

  if (grouping === "countries") {
    const rows = selectedRows.length ? countryRows : countryRows.slice(0, getExamGraphTopN());
    return {
      rows,
      definitions: [firstDefinition, secondDefinition],
      scopeLabel: getExamGraphCountryScopeLabel(rows.length),
      sourceDetail: getExamGraphScopeSourceText(),
    };
  }

  const rows = [...d3.group(countryRows, (entry) => getExamGraphContinentGroupName(entry.continent, { grouping })).entries()]
    .map(([continent, entries]) => {
      const firstValues = entries.map((entry) => Number(entry.firstValue));
      const secondValues = entries.map((entry) => Number(entry.secondValue));
      const firstValue =
        firstDefinition.aggregation === "mean" ? d3.mean(firstValues) ?? null : d3.sum(firstValues);
      const secondValue =
        secondDefinition.aggregation === "mean" ? d3.mean(secondValues) ?? null : d3.sum(secondValues);
      if (!Number.isFinite(Number(firstValue)) || !Number.isFinite(Number(secondValue))) {
        return null;
      }

      return {
        id: continent,
        label: continent,
        actualLabel: continent,
        firstValue: Number(firstValue),
        secondValue: Number(secondValue),
        totalValue: Number(firstValue) + Number(secondValue),
        detail:
          firstDefinition.aggregation === "mean" || secondDefinition.aggregation === "mean"
            ? `${entries.length}개국 평균/합`
            : `${entries.length}개국 합계`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.totalValue) - Number(a.totalValue));

  return {
    rows,
    definitions: [firstDefinition, secondDefinition],
    scopeLabel: getExamGraphContinentScopeLabel(rows.length),
    sourceDetail: getExamGraphScopeSourceText(),
  };
}

function getExamGraphTrendRows(definition, grouping, yearStart, yearEnd) {
  const years = examGraphPopulationYears.filter((year) => Number(year) >= Number(yearStart) && Number(year) <= Number(yearEnd));
  const selectedRows = getExamGraphSelectedCountryRows();
  const sourceRows = selectedRows.length ? selectedRows : getExamGraphAllCountryRows();

  if (grouping === "countries") {
    const rows = sourceRows
      .map((entry) => {
        const points = years
          .map((year) => {
            const value = definition.getYearValue(entry.stats, year);
            return Number.isFinite(Number(value)) ? { year, value: Number(value) } : null;
          })
          .filter(Boolean);
        if (points.length < 2) {
          return null;
        }
        return {
          id: entry.id,
          label: entry.label,
          actualLabel: entry.label,
          points,
          lastValue: Number(points[points.length - 1]?.value) || 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.lastValue) - Number(a.lastValue));

    const limitedRows = selectedRows.length ? rows : rows.slice(0, clamp(getExamGraphTopN(), 2, 6));
    return {
      rows: limitedRows,
      years,
      scopeLabel: getExamGraphCountryScopeLabel(limitedRows.length),
      sourceDetail: getExamGraphScopeSourceText(),
    };
  }

  const rows = [...d3.group(sourceRows, (entry) => getExamGraphContinentGroupName(entry.stats?.continent?.name, { grouping })).entries()]
    .map(([continent, entries]) => {
      const points = years
        .map((year) => {
          const value = getExamGraphTimeGroupValue(definition, entries, year);
          return Number.isFinite(Number(value)) ? { year, value: Number(value) } : null;
        })
        .filter(Boolean);
      if (points.length < 2) {
        return null;
      }
      return {
        id: continent,
        label: continent,
        actualLabel: continent,
        points,
        lastValue: Number(points[points.length - 1]?.value) || 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.lastValue) - Number(a.lastValue));

  return {
    rows,
    years,
    scopeLabel: getExamGraphContinentScopeLabel(rows.length),
    sourceDetail: getExamGraphScopeSourceText(),
  };
}

function getExamGraphScatterRows(xDefinition, yDefinition, sizeDefinition, grouping) {
  const selectedRows = getExamGraphSelectedCountryRows();
  const sourceRows = selectedRows.length ? selectedRows : getExamGraphAllCountryRows();
  const countryRows = sourceRows
    .map((entry) => {
      const xMetric = xDefinition.getValue(entry.stats);
      const yMetric = yDefinition.getValue(entry.stats);
      const sizeMetric = sizeDefinition.getValue(entry.stats);
      if (!xMetric || !yMetric || !sizeMetric) {
        return null;
      }
      if (
        !Number.isFinite(Number(xMetric.value)) ||
        !Number.isFinite(Number(yMetric.value)) ||
        !Number.isFinite(Number(sizeMetric.value))
      ) {
        return null;
      }
      return {
        id: entry.id,
        label: entry.label,
        actualLabel: entry.label,
        continent: entry.stats?.continent?.name ?? "미분류",
        xValue: Number(xMetric.value),
        yValue: Number(yMetric.value),
        sizeValue: Math.abs(Number(sizeMetric.value) || 0),
        sizeDisplayValue: Number(sizeMetric.value),
      };
    })
    .filter(Boolean);

  if (grouping === "countries") {
    return countryRows;
  }

  const aggregateForDefinition = (values, definition) =>
    definition.aggregation === "mean" ? d3.mean(values) ?? null : d3.sum(values);

  return [...d3.group(countryRows, (entry) => getExamGraphContinentGroupName(entry.continent, { grouping })).entries()]
    .map(([continent, entries]) => {
      const xValue = aggregateForDefinition(entries.map((entry) => Number(entry.xValue)), xDefinition);
      const yValue = aggregateForDefinition(entries.map((entry) => Number(entry.yValue)), yDefinition);
      const sizeDisplayValue = aggregateForDefinition(entries.map((entry) => Number(entry.sizeDisplayValue)), sizeDefinition);
      if (
        !Number.isFinite(Number(xValue)) ||
        !Number.isFinite(Number(yValue)) ||
        !Number.isFinite(Number(sizeDisplayValue))
      ) {
        return null;
      }
      return {
        id: continent,
        label: continent,
        actualLabel: continent,
        xValue: Number(xValue),
        yValue: Number(yValue),
        sizeValue: Math.abs(Number(sizeDisplayValue) || 0),
        sizeDisplayValue: Number(sizeDisplayValue),
      };
    })
    .filter(Boolean);
}

function transformExamGraphRowsByMode(rows, mode) {
  const validRows = (rows ?? []).filter((row) => Number.isFinite(Number(row?.value)));
  if (!validRows.length) {
    return {
      rows: [],
      valueFormatter: (value) => value,
      displayModeLabel: "자료 없음",
      displayModeDetail: "표시할 값이 없습니다.",
    };
  }

  if (mode === "share") {
    const total = d3.sum(validRows, (row) => Math.max(0, Number(row.value) || 0));
    return {
      rows: validRows.map((row) => ({
        ...row,
        displayValue: total > 0 ? (Math.max(0, Number(row.value) || 0) / total) * 100 : 0,
      })),
      valueFormatter: (value) => formatPercent(value),
      displayModeLabel: "비율",
      displayModeDetail: "비교 대상 전체 합을 100으로 환산",
    };
  }

  if (mode === "relative") {
    const maximumValue = Math.max(...validRows.map((row) => Math.max(0, Number(row.value) || 0)), 1);
    return {
      rows: validRows.map((row) => ({
        ...row,
        displayValue: maximumValue > 0 ? (Math.max(0, Number(row.value) || 0) / maximumValue) * 100 : 0,
      })),
      valueFormatter: (value) => formatRelativeIndex(value),
      displayModeLabel: "상댓값100",
      displayModeDetail: "최댓값을 100으로 환산",
    };
  }

  return {
    rows: validRows.map((row) => ({
      ...row,
      displayValue: Number(row.value),
    })),
    valueFormatter: (value) => validRows[0]?.formatter?.(value) ?? String(value),
    displayModeLabel: "양",
    displayModeDetail: "실제 값을 같은 눈금으로 비교",
  };
}

function transformExamGraphPairRowsByMode(rows, mode, firstDefinition, secondDefinition) {
  const validRows = (rows ?? []).filter(
    (row) => Number.isFinite(Number(row?.firstValue)) && Number.isFinite(Number(row?.secondValue)),
  );
  if (!validRows.length) {
    return {
      rows: [],
      valueFormatter: (value) => value,
      displayModeLabel: "자료 없음",
      displayModeDetail: "표시할 값이 없습니다.",
    };
  }

  if (mode === "share") {
    return {
      rows: validRows.map((row) => {
        const total = Math.max(0, Number(row.firstValue) || 0) + Math.max(0, Number(row.secondValue) || 0);
        return {
          ...row,
          displayFirstValue: total > 0 ? (Math.max(0, Number(row.firstValue) || 0) / total) * 100 : 0,
          displaySecondValue: total > 0 ? (Math.max(0, Number(row.secondValue) || 0) / total) * 100 : 0,
        };
      }),
      valueFormatter: (value) => formatPercent(value),
      displayModeLabel: "비율",
      displayModeDetail: "각 행의 두 값을 100으로 환산",
    };
  }

  if (mode === "relative") {
    const firstMaximum = Math.max(...validRows.map((row) => Math.max(0, Number(row.firstValue) || 0)), 1);
    const secondMaximum = Math.max(...validRows.map((row) => Math.max(0, Number(row.secondValue) || 0)), 1);
    return {
      rows: validRows.map((row) => ({
        ...row,
        displayFirstValue: firstMaximum > 0 ? (Math.max(0, Number(row.firstValue) || 0) / firstMaximum) * 100 : 0,
        displaySecondValue: secondMaximum > 0 ? (Math.max(0, Number(row.secondValue) || 0) / secondMaximum) * 100 : 0,
      })),
      valueFormatter: (value) => formatRelativeIndex(value),
      displayModeLabel: "상댓값100",
      displayModeDetail: "각 지표의 최댓값을 100으로 환산",
    };
  }

  return {
    rows: validRows.map((row) => ({
      ...row,
      displayFirstValue: Number(row.firstValue),
      displaySecondValue: Number(row.secondValue),
    })),
    valueFormatter: (value, seriesIndex = 0) =>
      (seriesIndex === 0 ? firstDefinition.formatter : secondDefinition.formatter)(value),
    displayModeLabel: "양",
    displayModeDetail: "실제 값을 같은 눈금으로 비교",
  };
}

function transformExamGraphTrendRowsByMode(rows, years, mode, formatter) {
  const validRows = (rows ?? []).filter((row) => (row?.points ?? []).length >= 2);
  if (!validRows.length) {
    return {
      rows: [],
      valueFormatter: formatter,
      displayModeLabel: "자료 없음",
      displayModeDetail: "표시할 값이 없습니다.",
    };
  }

  if (mode === "share") {
    const yearTotals = new Map(
      years.map((year) => [
        year,
        d3.sum(validRows, (row) => {
          const point = row.points.find((entry) => entry.year === year);
          return Math.max(0, Number(point?.value) || 0);
        }),
      ]),
    );
    return {
      rows: validRows.map((row) => ({
        ...row,
        points: row.points.map((point) => ({
          ...point,
          displayValue: yearTotals.get(point.year) > 0 ? (Math.max(0, Number(point.value) || 0) / yearTotals.get(point.year)) * 100 : 0,
        })),
      })),
      valueFormatter: (value) => formatPercent(value),
      displayModeLabel: "비율",
      displayModeDetail: "각 시점의 전체 합을 100으로 환산",
    };
  }

  if (mode === "relative") {
    const maximumValue = Math.max(
      ...validRows.flatMap((row) => row.points.map((point) => Math.max(0, Number(point.value) || 0))),
      1,
    );
    return {
      rows: validRows.map((row) => ({
        ...row,
        points: row.points.map((point) => ({
          ...point,
          displayValue: maximumValue > 0 ? (Math.max(0, Number(point.value) || 0) / maximumValue) * 100 : 0,
        })),
      })),
      valueFormatter: (value) => formatRelativeIndex(value),
      displayModeLabel: "상댓값100",
      displayModeDetail: "전체 시계열 최댓값을 100으로 환산",
    };
  }

  return {
    rows: validRows.map((row) => ({
      ...row,
      points: row.points.map((point) => ({
        ...point,
        displayValue: Number(point.value),
      })),
    })),
    valueFormatter: formatter,
    displayModeLabel: "양",
    displayModeDetail: "실제 값을 같은 축에서 비교",
  };
}

function transformExamGraphTimeRowsByMode(rows, mode, formatter) {
  const validRows = (rows ?? []).filter(
    (row) => Number.isFinite(Number(row?.startValue)) && Number.isFinite(Number(row?.endValue)),
  );
  if (!validRows.length) {
    return {
      rows: [],
      valueFormatter: formatter,
      displayModeLabel: "자료 없음",
      displayModeDetail: "표시할 값이 없습니다.",
    };
  }

  if (mode === "share") {
    const startTotal = d3.sum(validRows, (row) => Math.max(0, Number(row.startValue) || 0));
    const endTotal = d3.sum(validRows, (row) => Math.max(0, Number(row.endValue) || 0));
    return {
      rows: validRows.map((row) => ({
        ...row,
        displayStartValue: startTotal > 0 ? (Math.max(0, Number(row.startValue) || 0) / startTotal) * 100 : 0,
        displayEndValue: endTotal > 0 ? (Math.max(0, Number(row.endValue) || 0) / endTotal) * 100 : 0,
      })),
      valueFormatter: (value) => formatPercent(value),
      displayModeLabel: "비율",
      displayModeDetail: "각 시점의 전체 합을 100으로 환산",
    };
  }

  if (mode === "relative") {
    const maximumValue = Math.max(
      ...validRows.flatMap((row) => [Math.max(0, Number(row.startValue) || 0), Math.max(0, Number(row.endValue) || 0)]),
      1,
    );
    return {
      rows: validRows.map((row) => ({
        ...row,
        displayStartValue: maximumValue > 0 ? (Math.max(0, Number(row.startValue) || 0) / maximumValue) * 100 : 0,
        displayEndValue: maximumValue > 0 ? (Math.max(0, Number(row.endValue) || 0) / maximumValue) * 100 : 0,
      })),
      valueFormatter: (value) => formatRelativeIndex(value),
      displayModeLabel: "상댓값100",
      displayModeDetail: "두 시점 전체에서 최댓값을 100으로 환산",
    };
  }

  return {
    rows: validRows.map((row) => ({
      ...row,
      displayStartValue: Number(row.startValue),
      displayEndValue: Number(row.endValue),
    })),
    valueFormatter: formatter,
    displayModeLabel: "양",
    displayModeDetail: "실제 값을 같은 눈금으로 비교",
  };
}

function buildExamGraphAmountFormatter(rows, metricKey = "") {
  const metricKeyToFormatter = {
    "urban-rural": (value) => formatCompactStatNumber(value),
    "age-structure": (value) => formatCompactStatNumber(value),
    "industry-structure": (value) => formatPercent(value),
    "religion-major": (value) => formatCompactStatNumber(value),
    "energy-summary": (value) => formatEnergyAmount(value),
    "electricity-breakdown": (value) => formatEnergyAmount(value),
    "fossil-production": (value) => formatEnergyAmount(value),
    "crops-production": (value) => formatTonAmount(value),
    "livestock-stocks": (value) => formatCompactStatNumber(value),
    "livestock-meat": (value) => formatTonAmount(value),
  };
  if (metricKeyToFormatter[metricKey]) {
    return metricKeyToFormatter[metricKey];
  }

  const maximumValue = Math.max(
    ...rows.flatMap((row) => [
      Number(row?.total) || 0,
      ...(row?.segments ?? []).map((segment) => Number(segment?.value) || 0),
    ]),
    0,
  );
  if (maximumValue >= 1_000_000_000_000) {
    return (value) => formatCurrencyAmount(value);
  }
  if (maximumValue >= 1_000) {
    return (value) => formatCompactStatNumber(value);
  }
  return (value) => formatStatNumber(value, 1);
}

function applyExamGraphDisplayLabels(rows) {
  return rows.map((row, index) => ({
    ...row,
    displayLabel: state.examGraphAliasMode ? getExamGraphAlias(index) : row.label,
  }));
}

function buildExamGraphValueRows(rows, detailBuilder) {
  return rows.map((row) => ({
    label: state.examGraphAliasMode ? row.displayLabel : row.actualLabel ?? row.label ?? row.displayLabel,
    value: state.examGraphAliasMode ? row.actualLabel ?? row.label : "",
    detail: detailBuilder(row),
  }));
}

function buildExamGraphAnswerRows(rows, detailBuilder) {
  if (!state.examGraphAliasMode) {
    return [];
  }
  return rows.map((row) => ({
    label: row.displayLabel,
    value: row.actualLabel ?? row.label,
    detail: detailBuilder(row),
  }));
}

function buildExamLegendItemsFromRows(rows) {
  const firstRow = rows[0];
  return (firstRow?.segments ?? []).map((segment) => ({
    label: segment.label,
  }));
}

function buildExamGraphPreviewCard(model) {
  const card = document.createElement("div");
  card.className = "exam-graph-preview-card country-stats-chart-card";

  const head = document.createElement("div");
  head.className = "exam-graph-preview-card__head";
  const copy = document.createElement("div");
  const title = document.createElement("h5");
  title.className = "country-stats-chart-card__title";
  title.textContent = model.title;
  const description = document.createElement("p");
  description.className = "country-stats-chart-card__meta";
  description.textContent = model.description;
  copy.append(title, description);

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.className = "tw-button ghost-button ghost-button--compact";
  exportButton.textContent = "SVG 내보내기";
  exportButton.addEventListener("click", () => {
    downloadStandaloneSvgNode(model.svgNode, model.exportName);
    setStatus("출제형 그래프 SVG를 내보냈습니다.");
  });

  head.append(copy, exportButton);
  card.appendChild(head);

  const stage = document.createElement("div");
  stage.className = "exam-graph-stage";
  stage.appendChild(model.svgNode);
  card.appendChild(stage);

  return card;
}

function buildExamGraphValueCard(model) {
  const card = document.createElement("div");
  card.className = "exam-graph-data-card";

  const title = document.createElement("h5");
  title.className = "metric-explorer-table__title";
  title.textContent = "값 정리";
  const description = document.createElement("p");
  description.className = "metric-explorer-table__meta";
  description.textContent = state.examGraphAliasMode
    ? "왼쪽은 그래프 라벨, 오른쪽은 실제 지역입니다."
    : "실제 지역 이름과 그래프에 쓰인 비중/값을 바로 확인합니다.";
  card.append(title, description);

  const list = document.createElement("div");
  list.className = "country-stats-breakdown-list";
  model.valueRows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "country-stats-breakdown-row";
    const head = document.createElement("div");
    head.className = "country-stats-breakdown-row__head";
    const label = document.createElement("span");
    label.textContent = row.label;
    head.appendChild(label);
    if (row.value) {
      const value = document.createElement("strong");
      value.textContent = row.value;
      head.appendChild(value);
    }
    item.appendChild(head);
    const detail = document.createElement("small");
    detail.className = "country-stats-breakdown-row__detail";
    detail.textContent = row.detail;
    item.appendChild(detail);
    list.appendChild(item);
  });
  card.appendChild(list);

  return card;
}

function buildExamGraphAnswerCard(answerRows) {
  const card = document.createElement("div");
  card.className = "exam-graph-data-card";

  const title = document.createElement("h5");
  title.className = "metric-explorer-table__title";
  title.textContent = "가명 정답표";
  const description = document.createElement("p");
  description.className = "metric-explorer-table__meta";
  description.textContent = "문항에는 가명을 쓰고, 실제 지역은 여기서 확인합니다.";
  card.append(title, description);

  const list = document.createElement("div");
  list.className = "country-stats-breakdown-list";
  answerRows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "country-stats-breakdown-row";
    const head = document.createElement("div");
    head.className = "country-stats-breakdown-row__head";
    const label = document.createElement("span");
    label.textContent = row.label;
    const value = document.createElement("strong");
    value.textContent = row.value;
    head.append(label, value);
    item.appendChild(head);
    if (row.detail) {
      const detail = document.createElement("small");
      detail.className = "country-stats-breakdown-row__detail";
      detail.textContent = row.detail;
      item.appendChild(detail);
    }
    list.appendChild(item);
  });
  card.appendChild(list);

  return card;
}

function buildExamGraphGuideCard(model) {
  const guideRows = getExamGraphGuideRows(model);
  if (!guideRows.length) {
    return null;
  }

  const card = document.createElement("div");
  card.className = "exam-graph-data-card";

  const title = document.createElement("h5");
  title.className = "metric-explorer-table__title";
  title.textContent = "출제 확장";
  const description = document.createElement("p");
  description.className = "metric-explorer-table__meta";
  description.textContent = "지금 그래프를 문항으로 이어 붙일 때 바로 쓸 수 있는 판별 포인트와 후속 통계입니다.";
  card.append(title, description);

  const list = document.createElement("div");
  list.className = "country-stats-breakdown-list";
  guideRows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "country-stats-breakdown-row";
    const head = document.createElement("div");
    head.className = "country-stats-breakdown-row__head";

    const label = document.createElement("span");
    label.textContent = row.label;
    const value = document.createElement("strong");
    value.textContent = row.value;
    head.append(label, value);
    item.appendChild(head);

    const detail = document.createElement("small");
    detail.className = "country-stats-breakdown-row__detail";
    detail.textContent = row.detail;
    item.appendChild(detail);

    list.appendChild(item);
  });
  card.appendChild(list);

  return card;
}

function getExamGraphGuideRows(model) {
  if (model.presetKey === "stacked100") {
    const guideByMetric = {
      "urban-rural": {
        point: "도시화 단계",
        detail: "도시 비중이 높은 지역과 촌락 비중이 큰 지역을 바로 대비할 수 있어 개발 수준, 대도시 집중, 농촌 인구 비중을 함께 묻기 좋습니다.",
        related: "총인구 · 도시화율 · 산업 구조",
      },
      "age-structure": {
        point: "인구 피라미드 추론",
        detail: "유소년 비중과 고령 비중의 대비가 뚜렷해서 선진국형·개도국형 인구 구조를 빠르게 가려내는 문항에 잘 맞습니다.",
        related: "총인구 · 도시화율 · 국제이주민 비중",
      },
      "industry-structure": {
        point: "산업 발달 단계",
        detail: "1·2·3차 산업의 무게 중심을 비교하기 쉬워 제조업 중심 국가, 서비스업 중심 국가, 농업 비중이 큰 국가를 묶어 내기 좋습니다.",
        related: "수출액 · 도시화율 · 1차 에너지 소비 구조",
      },
      "religion-major": {
        point: "문화권 판별",
        detail: "크리스트교·이슬람교·힌두교·불교의 대비가 뚜렷한 국가를 고르면 문화권, 이민 유입, 역사적 배경까지 연결하는 추론형 문항으로 확장하기 쉽습니다.",
        related: "국제이주민 비중 · 총인구 · 도시화율",
      },
      "energy-summary": {
        point: "에너지 체제 구분",
        detail: "화석, 재생, 원자력 비중으로 자원 부국·원전 의존국·재생 중심 국가를 한 번에 가를 수 있습니다.",
        related: "발전원 구성 · 화석연료 생산 구조 · 수출액",
      },
      "electricity-breakdown": {
        point: "발전 방식 판별",
        detail: "석탄·가스·원자력·재생의 조합이 분명해서 산유국, 원전 국가, 수력 중심 국가를 섞어 제시하기 좋습니다.",
        related: "재생에너지 발전량 · 화석연료 생산량 · 1차 에너지 소비량",
      },
      "fossil-production": {
        point: "자원 편중도",
        detail: "석유·가스·석탄 가운데 어느 자원이 중심인지 드러나므로 자원 구조와 수출 구조를 연결하는 문항에 잘 맞습니다.",
        related: "수출액 · 1차 에너지 소비 구조 · 발전원 구성",
      },
      "crops-production": {
        point: "농업 전문화",
        detail: "밀·쌀·옥수수 비중만으로도 온대 곡물 지대와 몬순 아시아형 농업을 비교하는 데 효과적입니다.",
        related: "곡물 수입·수출 · 가축 사육 구성 · 수출액",
      },
      "livestock-stocks": {
        point: "목축 구조",
        detail: "소·돼지·양 비중의 차이가 커서 온대 목축, 이슬람권, 초지 활용 유형을 비교하기 좋습니다.",
        related: "육류 생산 구성 · 곡물 생산 구성 · 수출액",
      },
      "livestock-meat": {
        point: "식문화·사육 방식",
        detail: "육류 생산 구조는 식문화와 사육 환경을 함께 읽을 수 있어 가축 사육량과 짝지어 제시하기 좋습니다.",
        related: "가축 사육 구성 · 수출액 · 도시화율",
      },
    };
    const guide = guideByMetric[model.metricKey] ?? {
      point: "구성 차이",
      detail: `${model.metricLabel}의 구성 차이를 이용해 ${model.groupLabel} 비교 문항을 만들기 좋습니다.`,
      related: "총인구 · 도시화율 · 수출액",
    };
    return [
      { label: "판별 포인트", value: guide.point, detail: guide.detail },
      {
        label: "같이 붙일 통계",
        value: guide.related,
        detail: "아래 지표 탐색기에서 같은 범위를 다시 뽑아 두 장짜리 세트 문항으로 바로 확장할 수 있습니다.",
      },
      {
        label: "변형 아이디어",
        value: `${model.groupLabel} 전환`,
        detail: "같은 지표를 국가별과 대륙별로 각각 한 장씩 뽑으면, 개별 국가 판별과 대권역 구조 비교를 한 세트로 묶기 쉽습니다.",
      },
    ];
  }

  if (model.presetKey === "timeCompare") {
    const relatedByMetric = {
      "population-total": "도시 인구 · 연령 구조 · 국제이주민 비중",
      "population-urban-total": "총인구 · 도시화율 · 산업 구조",
      "population-rural-total": "총인구 · 도시화율 · 산업 구조",
      "population-urban-share": "총인구 · 도시 인구 · 촌락 인구",
    };
    return [
      {
        label: "판별 포인트",
        value: `${model.startYear}년 → ${model.endYear}년`,
        detail: "막대 길이 자체와 증가 폭을 함께 읽게 할 수 있어서 단순 순위보다 변화 과정에 초점을 둔 문항에 유리합니다.",
      },
      {
        label: "같이 붙일 통계",
        value: relatedByMetric[model.metricKey] ?? "총인구 · 도시화율 · 수출액",
        detail: "같은 국가 묶음에 다른 지표를 한 장 더 붙이면 성장 규모와 구조 변화를 동시에 비교하는 문제가 됩니다.",
      },
      {
        label: "변형 아이디어",
        value: "시점 바꾸기",
        detail: "1970년대와 최근, 1990년과 최근처럼 두 시점을 바꿔 산업화 초기와 성숙 단계의 차이를 드러내기 좋습니다.",
      },
    ];
  }

  if (model.presetKey === "rankBars") {
    return [
      {
        label: "판별 포인트",
        value: model.displayModeLabel,
        detail: `${model.metricLabel}을 ${model.displayModeLabel.toLowerCase()} 기준으로 정렬한 그래프라서 상위권 집중, 하위권 격차, 음수/양수 전환 여부를 빠르게 읽게 할 수 있습니다.`,
      },
      {
        label: "같이 붙일 통계",
        value: `${model.metricLabel} 구성 · 관련 보조 지표`,
        detail: "같은 국가 묶음에 구성 누적막대나 짝막대를 붙이면 단순 순위가 왜 나왔는지까지 설명하는 세트 문항으로 확장됩니다.",
      },
      {
        label: "변형 아이디어",
        value: "양 ↔ 비율 ↔ 상댓값100",
        detail: "같은 통계를 세 방식으로 바꾸면 절대 규모, 전체 비중, 최댓값 기준 상대 격차를 각각 묻는 변형 문제를 만들 수 있습니다.",
      },
    ];
  }

  if (model.presetKey === "pairedBars") {
    return [
      {
        label: "판별 포인트",
        value: "두 축의 우세 비교",
        detail: "같은 행 안에서 어느 값이 더 큰지, 격차가 어느 정도인지 한 번에 읽게 할 수 있어 국가 유형 분류에 유리합니다.",
      },
      {
        label: "같이 붙일 통계",
        value: `${model.metricLabel}와 연결된 제3지표`,
        detail: "예를 들어 수출/수입 짝막대 뒤에 순수출량이나 생산량 순위표를 붙이면 추론 단서가 더 또렷해집니다.",
      },
      {
        label: "변형 아이디어",
        value: "행내 비율 또는 상댓값",
        detail: "같은 자료를 행내 비율로 바꾸면 구조 비교가 되고, 상댓값100으로 바꾸면 각 지표의 최댓값 대비 격차를 묻는 문항이 됩니다.",
      },
    ];
  }

  if (model.presetKey === "scatter") {
    return [
      {
        label: "판별 포인트",
        value: "사분면 해석",
        detail: `${model.xLabel}과 ${model.yLabel}의 고저를 사분면으로 읽게 하고, 버블 크기 ${model.sizeLabel}로 최종 판별을 강화하면 변별력이 높습니다.`,
      },
      {
        label: "같이 붙일 통계",
        value: `${model.xLabel} 순위 · ${model.yLabel} 순위`,
        detail: "같은 범위를 막대그래프로 한 장 더 붙이면 산포도에서 애매한 국가를 추가 단서로 구분하기 좋습니다.",
      },
      {
        label: "변형 아이디어",
        value: "축 성격 바꾸기",
        detail: "한 축은 비율, 다른 축은 절댓값으로 바꾸면 대국과 소국, 선진국과 개도국의 차이가 더 또렷하게 드러납니다.",
      },
    ];
  }

  if (model.presetKey === "trendLine") {
    return [
      {
        label: "판별 포인트",
        value: "시계열 방향과 교차",
        detail: "증가·감소 추세와 시점별 교차 여부를 함께 읽게 할 수 있어 단순 순위보다 변화 과정 자체를 묻는 문제에 잘 맞습니다.",
      },
      {
        label: "같이 붙일 통계",
        value: `${model.metricLabel} 2시점 비교 · 구성 그래프`,
        detail: "같은 국가 묶음에 2시점 막대 또는 구성 그래프를 한 장 더 붙이면 변화 원인과 결과를 같이 묻게 됩니다.",
      },
      {
        label: "변형 아이디어",
        value: "종점 비교 또는 증감률 비교",
        detail: "같은 선그래프에서 마지막 시점만 잘라 순위막대로 바꾸거나, 시작 대비 증감폭만 다시 정리하면 후속 문항 만들기가 쉽습니다.",
      },
    ];
  }

  if (model.presetKey === "top3share") {
    return [
      {
        label: "판별 포인트",
        value: "집중도 비교",
        detail: `${model.metricLabel}이 몇 개 국가에 몰려 있는지, 아니면 여러 국가로 분산되는지를 대륙별로 한 번에 읽게 할 수 있습니다.`,
      },
      {
        label: "같이 붙일 통계",
        value: `${model.metricLabel} 국가 순위 · 수출액`,
        detail: "A·B·C 실제 국가를 추론시키려면 같은 지표의 국가 순위표나 수출 구조를 함께 제시하는 구성이 잘 맞습니다.",
      },
      {
        label: "변형 아이디어",
        value: "A·B·C 정체 찾기",
        detail: "상위 3개국 비중 그래프를 먼저 제시하고, 뒤에 100% 구성 그래프나 산포도를 붙여 A·B·C의 실제 국가를 맞히게 만들 수 있습니다.",
      },
    ];
  }

  return [];
}

function buildExamGraphFileName(parts) {
  const filename = parts
    .map((part) => String(part))
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `exam-graph-${filename || "chart"}.svg`;
}

function downloadStandaloneSvgNode(svgNode, filename) {
  const exportNode = svgNode.cloneNode(true);
  const defs = ensureDefsElement(exportNode);
  const styleElement = createSvgElement("style");
  styleElement.textContent = buildSvgFontStyle();
  defs.insertBefore(styleElement, defs.firstChild);

  const serializer = new XMLSerializer();
  const serialized = serializer.serializeToString(exportNode);
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getExamGraphAxisDomain(values, { forceZeroStart = false, paddingRatio = 0.06, niceCount = 5 } = {}) {
  const validValues = (values ?? []).filter((value) => Number.isFinite(Number(value))).map(Number);
  if (!validValues.length) {
    return { minimum: 0, maximum: 1 };
  }

  let minimum = Math.min(...validValues);
  let maximum = Math.max(...validValues);
  if (forceZeroStart || minimum > 0) {
    minimum = 0;
  }
  if (maximum < 0) {
    maximum = 0;
  }

  if (minimum === maximum) {
    if (minimum === 0) {
      maximum = 1;
    } else {
      const padding = Math.abs(minimum) * 0.12 || 1;
      minimum -= padding;
      maximum += padding;
    }
  }

  const span = maximum - minimum;
  if (span > 0 && paddingRatio > 0) {
    if (!(forceZeroStart && Math.abs(minimum) < 0.000001)) {
      minimum -= span * paddingRatio;
    }
    maximum += span * paddingRatio;
  }
  if (forceZeroStart && minimum > 0) {
    minimum = 0;
  }

  const [niceMinimum, niceMaximum] = d3.scaleLinear().domain([minimum, maximum]).nice(niceCount).domain();
  return { minimum: niceMinimum, maximum: niceMaximum };
}

function getExamGraphAxisTicks(minimum, maximum, count = 5) {
  const baseTicks = d3.ticks(minimum, maximum, count);
  const allTicks = [...baseTicks, minimum, maximum];
  if (minimum < 0 && maximum > 0) {
    allTicks.push(0);
  }
  return [...new Set(allTicks.map((value) => Number(value.toFixed(6))))].sort((a, b) => a - b);
}

function buildExamGraphPositionScale(minimum, maximum, plotLeft, plotWidth) {
  return (value) => plotLeft + ((Number(value) - minimum) / (maximum - minimum)) * plotWidth;
}

function formatExamGraphAxisTick(value, maximumAbsolute = 0) {
  const numericValue = Number(value);
  const absMaximum = Math.abs(Number(maximumAbsolute) || 0);
  if (absMaximum >= 10_000) {
    return formatCompactStatNumber(numericValue, 0);
  }
  if (absMaximum >= 1_000) {
    return numericValue.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  }
  if (absMaximum >= 100) {
    return numericValue.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  }
  if (absMaximum >= 10) {
    return numericValue.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
  }
  return numericValue.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function appendExamGraphXAxis(svg, { plotLeft, plotTop, plotWidth, plotHeight, ticks, minimum, maximum, valueFormatter, axisFormatter = null }) {
  const valueToX = buildExamGraphPositionScale(minimum, maximum, plotLeft, plotWidth);
  const formatTick = axisFormatter ?? ((tick) => valueFormatter(tick));
  ticks.forEach((tick) => {
    const x = valueToX(tick);
    const isEdge = Math.abs(tick - minimum) < 0.000001 || Math.abs(tick - maximum) < 0.000001;
    const isZero = Math.abs(tick) < 0.000001;
    const line = createSvgElement("line");
    line.setAttribute("x1", String(x));
    line.setAttribute("x2", String(x));
    line.setAttribute("y1", String(plotTop));
    line.setAttribute("y2", String(plotTop + plotHeight));
    line.setAttribute("stroke", "#111111");
    line.setAttribute("stroke-width", isEdge || isZero ? "1.4" : "1");
    if (!isEdge && !isZero) {
      line.setAttribute("stroke-dasharray", "7 7");
    }
    svg.appendChild(line);

    const label = createSvgElement("text");
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(plotTop + plotHeight + 28));
    label.setAttribute("text-anchor", Math.abs(tick - minimum) < 0.000001 ? "start" : Math.abs(tick - maximum) < 0.000001 ? "end" : "middle");
    applyExamGraphTextStyle(label, { fontSize: 10.5, fontWeight: 700 });
    label.textContent = formatTick(tick);
    svg.appendChild(label);
  });
  return valueToX;
}

function appendExamGraphLineLegend(svg, rows, centerX, y) {
  const itemWidths = rows.map((row) => 42 + String(row.displayLabel).length * 12);
  const totalWidth = itemWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, rows.length - 1) * 12 + 20;
  const startX = centerX - totalWidth / 2 + 10;

  const box = createSvgElement("rect");
  box.setAttribute("x", String(centerX - totalWidth / 2));
  box.setAttribute("y", String(y - 18));
  box.setAttribute("width", String(totalWidth));
  box.setAttribute("height", "38");
  box.setAttribute("fill", "#ffffff");
  box.setAttribute("stroke", "#111111");
  box.setAttribute("stroke-width", "1.2");
  svg.appendChild(box);

  let cursorX = startX;
  rows.forEach((row, index) => {
    const style = examGraphLineStyleDefinitions[index % examGraphLineStyleDefinitions.length];
    const sample = createSvgElement("line");
    sample.setAttribute("x1", String(cursorX));
    sample.setAttribute("x2", String(cursorX + 18));
    sample.setAttribute("y1", String(y + 1));
    sample.setAttribute("y2", String(y + 1));
    sample.setAttribute("stroke", style.stroke);
    sample.setAttribute("stroke-width", "2.3");
    if (style.dasharray) {
      sample.setAttribute("stroke-dasharray", style.dasharray);
    }
    svg.appendChild(sample);

    const label = createSvgElement("text");
    label.setAttribute("x", String(cursorX + 24));
    label.setAttribute("y", String(y + 5));
    applyExamGraphTextStyle(label, { fontSize: 13, fontWeight: 700 });
    label.textContent = row.displayLabel;
    svg.appendChild(label);

    cursorX += itemWidths[index] + 12;
  });
}

function buildExamStackedCompositionSvg({ title, subtitle, rows, legendItems, footnote, mode = "share", valueFormatter = (value) => formatPercent(value) }) {
  const width = 880;
  const plotLeft = 158;
  const plotTop = 74;
  const plotWidth = 660;
  const barHeight = 34;
  const rowGap = 18;
  const legendHeight = 72;
  const footnoteHeight = footnote ? 30 : 0;
  const plotHeight = rows.length * (barHeight + rowGap) - rowGap;
  const height = plotTop + plotHeight + 68 + legendHeight + footnoteHeight;
  const svg = createSvgElement("svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", title);
  svg.setAttribute("class", "exam-graph-svg");
  appendExamGraphPatternDefs(svg);
  appendExamGraphTitle(svg, title, subtitle, width);

  const amountDomain = getExamGraphAxisDomain(rows.map((row) => Number(row.total) || 0), { forceZeroStart: true, paddingRatio: 0.04 });
  const domainMinimum = mode === "amount" ? amountDomain.minimum : 0;
  const domainMaximum = mode === "amount" ? amountDomain.maximum : 100;
  const ticks = mode === "amount" ? getExamGraphAxisTicks(domainMinimum, domainMaximum, 5) : [0, 20, 40, 60, 80, 100];

  const frame = createSvgElement("rect");
  frame.setAttribute("x", String(plotLeft));
  frame.setAttribute("y", String(plotTop));
  frame.setAttribute("width", String(plotWidth));
  frame.setAttribute("height", String(plotHeight));
  frame.setAttribute("fill", "#ffffff");
  frame.setAttribute("stroke", "#111111");
  frame.setAttribute("stroke-width", "1.4");
  svg.appendChild(frame);

  appendExamGraphXAxis(svg, {
    plotLeft,
    plotTop,
    plotWidth,
    plotHeight,
    ticks,
    minimum: domainMinimum,
    maximum: domainMaximum,
    valueFormatter: mode === "amount" ? valueFormatter : (tick) => (tick === 100 ? "100(%)" : String(tick)),
    axisFormatter: mode === "amount" ? (tick) => formatExamGraphAxisTick(tick, domainMaximum) : null,
  });

  rows.forEach((row, rowIndex) => {
    const y = plotTop + rowIndex * (barHeight + rowGap);
    const label = createSvgElement("text");
    label.setAttribute("x", String(plotLeft - 18));
    label.setAttribute("y", String(y + barHeight / 2 + 1));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("dominant-baseline", "middle");
    applyExamGraphTextStyle(label, { fontSize: 18, fontWeight: 700 });
    label.textContent = row.displayLabel;
    svg.appendChild(label);

    let cursorX = plotLeft;
    row.segments.forEach((segment, segmentIndex) => {
      const rect = createSvgElement("rect");
      const segmentValue = mode === "amount" ? Number(segment.value) || 0 : clamp(Number(segment.share) || 0, 0, 100);
      const segmentWidth = domainMaximum > 0 ? (plotWidth * segmentValue) / domainMaximum : 0;
      rect.setAttribute("x", String(cursorX));
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", String(segmentWidth));
      rect.setAttribute("height", String(barHeight));
      rect.setAttribute("fill", getExamGraphFill(segmentIndex));
      rect.setAttribute("stroke", "#111111");
      rect.setAttribute("stroke-width", "1");
      svg.appendChild(rect);
      cursorX += segmentWidth;
    });
  });

  appendExamGraphLegend(svg, legendItems, width / 2, plotTop + plotHeight + 58);

  if (footnote) {
    const note = createSvgElement("text");
    note.setAttribute("x", String(plotLeft));
    note.setAttribute("y", String(height - 10));
    applyExamGraphTextStyle(note, { fontSize: 11, fontWeight: 500 });
    note.textContent = footnote;
    svg.appendChild(note);
  }

  return svg;
}

function buildExamSingleBarSvg({ title, subtitle, rows, valueFormatter, axisFormatter = null }) {
  const width = 880;
  const plotLeft = 170;
  const plotTop = 74;
  const plotWidth = 650;
  const barHeight = 22;
  const rowGap = 16;
  const plotHeight = rows.length * (barHeight + rowGap) - rowGap;
  const height = plotTop + plotHeight + 72;
  const values = rows.map((row) => Number(row.displayValue ?? row.value));
  const { minimum, maximum } = getExamGraphAxisDomain(values, { paddingRatio: 0.04 });
  const ticks = getExamGraphAxisTicks(minimum, maximum, 5);

  const svg = createSvgElement("svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", title);
  svg.setAttribute("class", "exam-graph-svg");
  appendExamGraphPatternDefs(svg);
  appendExamGraphTitle(svg, title, subtitle, width);

  const frame = createSvgElement("rect");
  frame.setAttribute("x", String(plotLeft));
  frame.setAttribute("y", String(plotTop));
  frame.setAttribute("width", String(plotWidth));
  frame.setAttribute("height", String(plotHeight));
  frame.setAttribute("fill", "#ffffff");
  frame.setAttribute("stroke", "#111111");
  frame.setAttribute("stroke-width", "1.4");
  svg.appendChild(frame);

  const valueToX = appendExamGraphXAxis(svg, {
    plotLeft,
    plotTop,
    plotWidth,
    plotHeight,
    ticks,
    minimum,
    maximum,
    valueFormatter,
    axisFormatter: axisFormatter ?? ((tick) => formatExamGraphAxisTick(tick, Math.max(Math.abs(minimum), Math.abs(maximum)))),
  });
  const zeroX = valueToX(0);

  rows.forEach((row, rowIndex) => {
    const y = plotTop + rowIndex * (barHeight + rowGap);
    const value = Number(row.displayValue ?? row.value) || 0;
    const barStart = Math.min(zeroX, valueToX(value));
    const barWidth = Math.max(1, Math.abs(valueToX(value) - zeroX));

    const label = createSvgElement("text");
    label.setAttribute("x", String(plotLeft - 16));
    label.setAttribute("y", String(y + barHeight / 2));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("dominant-baseline", "middle");
    applyExamGraphTextStyle(label, { fontSize: 17, fontWeight: 700 });
    label.textContent = row.displayLabel;
    svg.appendChild(label);

    const rect = createSvgElement("rect");
    rect.setAttribute("x", String(barStart));
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", String(barWidth));
    rect.setAttribute("height", String(barHeight));
    rect.setAttribute("fill", getExamGraphFill(rowIndex));
    rect.setAttribute("stroke", "#111111");
    rect.setAttribute("stroke-width", "1");
    svg.appendChild(rect);
  });

  return svg;
}

function buildExamPairedBarSvg({ title, subtitle, rows, legendItems, valueFormatter, axisFormatter = null }) {
  const width = 900;
  const plotLeft = 178;
  const plotTop = 78;
  const plotWidth = 660;
  const barHeight = 15;
  const groupGap = 28;
  const groupHeight = barHeight * 2 + 10;
  const legendHeight = 66;
  const plotHeight = rows.length * (groupHeight + groupGap) - groupGap;
  const height = plotTop + plotHeight + legendHeight + 22;
  const values = rows.flatMap((row) => [Number(row.displayFirstValue), Number(row.displaySecondValue)]);
  const { minimum, maximum } = getExamGraphAxisDomain(values, { forceZeroStart: true, paddingRatio: 0.04 });
  const ticks = getExamGraphAxisTicks(minimum, maximum, 5);

  const svg = createSvgElement("svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", title);
  svg.setAttribute("class", "exam-graph-svg");
  appendExamGraphPatternDefs(svg);
  appendExamGraphTitle(svg, title, subtitle, width);

  const frame = createSvgElement("rect");
  frame.setAttribute("x", String(plotLeft));
  frame.setAttribute("y", String(plotTop));
  frame.setAttribute("width", String(plotWidth));
  frame.setAttribute("height", String(plotHeight));
  frame.setAttribute("fill", "#ffffff");
  frame.setAttribute("stroke", "#111111");
  frame.setAttribute("stroke-width", "1.4");
  svg.appendChild(frame);

  const valueToX = appendExamGraphXAxis(svg, {
    plotLeft,
    plotTop,
    plotWidth,
    plotHeight,
    ticks,
    minimum,
    maximum,
    valueFormatter,
    axisFormatter: axisFormatter ?? ((tick) => formatExamGraphAxisTick(tick, Math.max(Math.abs(minimum), Math.abs(maximum)))),
  });
  const zeroX = valueToX(0);

  rows.forEach((row, rowIndex) => {
    const y = plotTop + rowIndex * (groupHeight + groupGap);
    const label = createSvgElement("text");
    label.setAttribute("x", String(plotLeft - 18));
    label.setAttribute("y", String(y + groupHeight / 2));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("dominant-baseline", "middle");
    applyExamGraphTextStyle(label, { fontSize: 18, fontWeight: 700 });
    label.textContent = row.displayLabel;
    svg.appendChild(label);

    [
      { value: row.displayFirstValue, yOffset: 0, fill: legendItems[0]?.fill ?? getExamGraphFill(0), seriesIndex: 0 },
      { value: row.displaySecondValue, yOffset: barHeight + 10, fill: legendItems[1]?.fill ?? getExamGraphFill(1), seriesIndex: 1 },
    ].forEach((bar) => {
      const x = Math.min(zeroX, valueToX(bar.value));
      const rect = createSvgElement("rect");
      rect.setAttribute("x", String(x));
      rect.setAttribute("y", String(y + bar.yOffset));
      rect.setAttribute("width", String(Math.max(1, Math.abs(valueToX(bar.value) - zeroX))));
      rect.setAttribute("height", String(barHeight));
      rect.setAttribute("fill", bar.fill);
      rect.setAttribute("stroke", "#111111");
      rect.setAttribute("stroke-width", "1");
      svg.appendChild(rect);
    });
  });

  appendExamGraphLegend(svg, legendItems, width / 2, plotTop + plotHeight + 56);
  return svg;
}

function buildExamTimeCompareSvg({ title, subtitle, rows, startYear, endYear, valueFormatter, axisFormatter = null }) {
  const width = 900;
  const plotLeft = 178;
  const plotTop = 78;
  const plotWidth = 660;
  const barHeight = 16;
  const rowGap = 28;
  const groupHeight = barHeight * 2 + 10;
  const plotHeight = rows.length * (groupHeight + rowGap) - rowGap;
  const height = plotTop + plotHeight + 92;
  const values = rows.flatMap((row) => [Number(row.displayStartValue ?? row.startValue), Number(row.displayEndValue ?? row.endValue)]);
  const { minimum, maximum } = getExamGraphAxisDomain(values, { forceZeroStart: true, paddingRatio: 0.04 });
  const ticks = getExamGraphAxisTicks(minimum, maximum, 5);
  const svg = createSvgElement("svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", title);
  svg.setAttribute("class", "exam-graph-svg");
  appendExamGraphPatternDefs(svg);
  appendExamGraphTitle(svg, title, subtitle, width);

  const frame = createSvgElement("rect");
  frame.setAttribute("x", String(plotLeft));
  frame.setAttribute("y", String(plotTop));
  frame.setAttribute("width", String(plotWidth));
  frame.setAttribute("height", String(plotHeight));
  frame.setAttribute("fill", "#ffffff");
  frame.setAttribute("stroke", "#111111");
  frame.setAttribute("stroke-width", "1.4");
  svg.appendChild(frame);

  const valueToX = appendExamGraphXAxis(svg, {
    plotLeft,
    plotTop,
    plotWidth,
    plotHeight,
    ticks,
    minimum,
    maximum,
    valueFormatter,
    axisFormatter: axisFormatter ?? ((tick) => formatExamGraphAxisTick(tick, Math.max(Math.abs(minimum), Math.abs(maximum)))),
  });
  const zeroX = valueToX(0);

  rows.forEach((row, rowIndex) => {
    const y = plotTop + rowIndex * (groupHeight + rowGap);
    const label = createSvgElement("text");
    label.setAttribute("x", String(plotLeft - 18));
    label.setAttribute("y", String(y + groupHeight / 2));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("dominant-baseline", "middle");
    applyExamGraphTextStyle(label, { fontSize: 18, fontWeight: 700 });
    label.textContent = row.displayLabel;
    svg.appendChild(label);

    [
      { value: row.displayStartValue ?? row.startValue, yOffset: 0, fill: getExamGraphFill(1) },
      { value: row.displayEndValue ?? row.endValue, yOffset: barHeight + 10, fill: getExamGraphFill(0) },
    ].forEach((bar) => {
      const rect = createSvgElement("rect");
      rect.setAttribute("x", String(Math.min(zeroX, valueToX(bar.value))));
      rect.setAttribute("y", String(y + bar.yOffset));
      rect.setAttribute("width", String(Math.max(1, Math.abs(valueToX(bar.value) - zeroX))));
      rect.setAttribute("height", String(barHeight));
      rect.setAttribute("fill", bar.fill);
      rect.setAttribute("stroke", "#111111");
      rect.setAttribute("stroke-width", "1");
      svg.appendChild(rect);
    });
  });

  appendExamGraphLegend(
    svg,
    [
      { label: `${startYear}년`, fill: getExamGraphFill(1) },
      { label: `${endYear}년`, fill: getExamGraphFill(0) },
    ],
    width / 2,
    plotTop + plotHeight + 58,
  );

  return svg;
}

function buildExamTrendLineSvg({ title, subtitle, rows, years, valueFormatter, axisFormatter = null }) {
  const width = 900;
  const height = 620;
  const plot = { left: 84, right: 42, top: 88, bottom: 102 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const values = rows.flatMap((row) => row.points.map((point) => Number(point.displayValue ?? point.value)));
  const { minimum, maximum } = getExamGraphAxisDomain(values, { paddingRatio: 0.08 });
  const ticks = getExamGraphAxisTicks(minimum, maximum, 5);
  const xStep = years.length > 1 ? plotWidth / (years.length - 1) : 0;
  const yearToX = new Map(years.map((year, index) => [year, plot.left + xStep * index]));
  const valueToY = (value) => plot.top + (1 - (Number(value) - minimum) / (maximum - minimum)) * plotHeight;

  const svg = createSvgElement("svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", title);
  svg.setAttribute("class", "exam-graph-svg");
  appendExamGraphPatternDefs(svg);
  appendExamGraphTitle(svg, title, subtitle, width);

  const frame = createSvgElement("rect");
  frame.setAttribute("x", String(plot.left));
  frame.setAttribute("y", String(plot.top));
  frame.setAttribute("width", String(plotWidth));
  frame.setAttribute("height", String(plotHeight));
  frame.setAttribute("fill", "#ffffff");
  frame.setAttribute("stroke", "#111111");
  frame.setAttribute("stroke-width", "1.4");
  svg.appendChild(frame);

  ticks.forEach((tick) => {
    const y = valueToY(tick);
    const line = createSvgElement("line");
    line.setAttribute("x1", String(plot.left));
    line.setAttribute("x2", String(plot.left + plotWidth));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", "#111111");
    line.setAttribute("stroke-width", Math.abs(tick) < 0.000001 ? "1.4" : "1");
    if (Math.abs(tick) >= 0.000001) {
      line.setAttribute("stroke-dasharray", "7 7");
    }
    svg.appendChild(line);

    const label = createSvgElement("text");
    label.setAttribute("x", String(plot.left - 10));
    label.setAttribute("y", String(y + 4));
    label.setAttribute("text-anchor", "end");
    applyExamGraphTextStyle(label, { fontSize: 10.5, fontWeight: 700 });
    label.textContent = axisFormatter ? axisFormatter(tick) : formatExamGraphAxisTick(tick, Math.max(Math.abs(minimum), Math.abs(maximum)));
    svg.appendChild(label);
  });

  const tickStep = years.length > 8 ? Math.ceil(years.length / 6) : 1;
  years.forEach((year, index) => {
    if (index !== 0 && index !== years.length - 1 && index % tickStep !== 0) {
      return;
    }
    const x = yearToX.get(year);
    const line = createSvgElement("line");
    line.setAttribute("x1", String(x));
    line.setAttribute("x2", String(x));
    line.setAttribute("y1", String(plot.top));
    line.setAttribute("y2", String(plot.top + plotHeight));
    line.setAttribute("stroke", "#111111");
    line.setAttribute("stroke-width", "1");
    line.setAttribute("stroke-dasharray", "7 7");
    svg.appendChild(line);

    const label = createSvgElement("text");
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(height - 40));
    label.setAttribute("text-anchor", "middle");
    applyExamGraphTextStyle(label, { fontSize: 10.5, fontWeight: 700 });
    label.textContent = `${year}`;
    svg.appendChild(label);
  });

  rows.forEach((row, rowIndex) => {
    const style = examGraphLineStyleDefinitions[rowIndex % examGraphLineStyleDefinitions.length];
    const path = createSvgElement("polyline");
    path.setAttribute(
      "points",
      row.points
        .map((point) => `${yearToX.get(point.year)},${valueToY(point.displayValue ?? point.value)}`)
        .join(" "),
    );
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", style.stroke);
    path.setAttribute("stroke-width", "2.4");
    if (style.dasharray) {
      path.setAttribute("stroke-dasharray", style.dasharray);
    }
    svg.appendChild(path);

    row.points.forEach((point) => {
      const dot = createSvgElement("circle");
      dot.setAttribute("cx", String(yearToX.get(point.year)));
      dot.setAttribute("cy", String(valueToY(point.displayValue ?? point.value)));
      dot.setAttribute("r", "2.6");
      dot.setAttribute("fill", style.stroke);
      svg.appendChild(dot);
    });
  });

  appendExamGraphLineLegend(svg, rows, width / 2, height - 18);
  return svg;
}

function buildExamScatterSvg({ title, subtitle, rows, xLabel, yLabel, xFormatter, yFormatter, sizeFormatter }) {
  const width = 860;
  const height = 620;
  const plot = { left: 92, right: 42, top: 88, bottom: 88 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const svg = createSvgElement("svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", title);
  svg.setAttribute("class", "exam-graph-svg");
  appendExamGraphTitle(svg, title, subtitle, width);

  const xDomain = getExamGraphAxisDomain(rows.map((row) => Number(row.xValue)), { paddingRatio: 0.08 });
  const yDomain = getExamGraphAxisDomain(rows.map((row) => Number(row.yValue)), { paddingRatio: 0.08 });
  const minX = xDomain.minimum;
  const maxX = xDomain.maximum;
  const minY = yDomain.minimum;
  const maxY = yDomain.maximum;
  const xTicks = getExamGraphAxisTicks(minX, maxX, 5);
  const yTicks = getExamGraphAxisTicks(minY, maxY, 5);

  const maximumBubbleValue = Math.max(...rows.map((row) => Number(row.sizeValue) || 0), 1);
  const xToPosition = (value) => plot.left + ((Number(value) - minX) / (maxX - minX)) * plotWidth;
  const yToPosition = (value) => plot.top + (1 - (Number(value) - minY) / (maxY - minY)) * plotHeight;
  const radiusForValue = (value) => 6 + Math.sqrt(Math.max(0, Number(value)) / maximumBubbleValue) * 13;

  const frame = createSvgElement("rect");
  frame.setAttribute("x", String(plot.left));
  frame.setAttribute("y", String(plot.top));
  frame.setAttribute("width", String(plotWidth));
  frame.setAttribute("height", String(plotHeight));
  frame.setAttribute("fill", "#ffffff");
  frame.setAttribute("stroke", "#111111");
  frame.setAttribute("stroke-width", "1.4");
  svg.appendChild(frame);

  xTicks.forEach((tick) => {
    const x = xToPosition(tick);
    const isEdge = Math.abs(tick - minX) < 0.000001 || Math.abs(tick - maxX) < 0.000001;
    const isZero = Math.abs(tick) < 0.000001;
    if (!isEdge || isZero) {
      const vertical = createSvgElement("line");
      vertical.setAttribute("x1", String(x));
      vertical.setAttribute("x2", String(x));
      vertical.setAttribute("y1", String(plot.top));
      vertical.setAttribute("y2", String(plot.top + plotHeight));
      vertical.setAttribute("stroke", "#111111");
      vertical.setAttribute("stroke-width", isZero ? "1.4" : "1");
      if (!isZero) {
        vertical.setAttribute("stroke-dasharray", "7 7");
      }
      svg.appendChild(vertical);
    }

    const label = createSvgElement("text");
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(plot.top + plotHeight + 26));
    label.setAttribute("text-anchor", Math.abs(tick - minX) < 0.000001 ? "start" : Math.abs(tick - maxX) < 0.000001 ? "end" : "middle");
    applyExamGraphTextStyle(label, { fontSize: 10.5, fontWeight: 700 });
    label.textContent = xFormatter(tick);
    svg.appendChild(label);
  });

  yTicks.forEach((tick) => {
    const y = yToPosition(tick);
    const isEdge = Math.abs(tick - minY) < 0.000001 || Math.abs(tick - maxY) < 0.000001;
    const isZero = Math.abs(tick) < 0.000001;
    if (!isEdge || isZero) {
      const horizontal = createSvgElement("line");
      horizontal.setAttribute("x1", String(plot.left));
      horizontal.setAttribute("x2", String(plot.left + plotWidth));
      horizontal.setAttribute("y1", String(y));
      horizontal.setAttribute("y2", String(y));
      horizontal.setAttribute("stroke", "#111111");
      horizontal.setAttribute("stroke-width", isZero ? "1.4" : "1");
      if (!isZero) {
        horizontal.setAttribute("stroke-dasharray", "7 7");
      }
      svg.appendChild(horizontal);
    }

    const label = createSvgElement("text");
    label.setAttribute("x", String(plot.left - 10));
    label.setAttribute("y", String(y + 4));
    label.setAttribute("text-anchor", "end");
    applyExamGraphTextStyle(label, { fontSize: 10.5, fontWeight: 700 });
    label.textContent = yFormatter(tick);
    svg.appendChild(label);
  });

  rows.forEach((row) => {
    const circle = createSvgElement("circle");
    circle.setAttribute("cx", String(xToPosition(row.xValue)));
    circle.setAttribute("cy", String(yToPosition(row.yValue)));
    circle.setAttribute("r", String(radiusForValue(row.sizeValue)));
    circle.setAttribute("fill", "#f3f3f3");
    circle.setAttribute("stroke", "#111111");
    circle.setAttribute("stroke-width", "1.4");
    svg.appendChild(circle);

    const label = createSvgElement("text");
    label.setAttribute("x", String(xToPosition(row.xValue) + radiusForValue(row.sizeValue) + 4));
    label.setAttribute("y", String(yToPosition(row.yValue) - 2));
    applyExamGraphTextStyle(label, { fontSize: 11, fontWeight: 700 });
    label.textContent = row.displayLabel;
    svg.appendChild(label);
  });

  const xAxisLabel = createSvgElement("text");
  xAxisLabel.setAttribute("x", String(plot.left + plotWidth / 2));
  xAxisLabel.setAttribute("y", String(height - 18));
  xAxisLabel.setAttribute("text-anchor", "middle");
  applyExamGraphTextStyle(xAxisLabel, { fontSize: 16, fontWeight: 700 });
  xAxisLabel.textContent = `${xLabel} · 버블 ${sizeFormatter(maximumBubbleValue)}`;
  svg.appendChild(xAxisLabel);

  const yAxisLabel = createSvgElement("text");
  yAxisLabel.setAttribute("x", "28");
  yAxisLabel.setAttribute("y", String(plot.top + plotHeight / 2));
  yAxisLabel.setAttribute("text-anchor", "middle");
  yAxisLabel.setAttribute("transform", `rotate(-90 28 ${plot.top + plotHeight / 2})`);
  applyExamGraphTextStyle(yAxisLabel, { fontSize: 16, fontWeight: 700 });
  yAxisLabel.textContent = yLabel;
  svg.appendChild(yAxisLabel);

  return svg;
}

function appendExamGraphPatternDefs(svg) {
  const defs = ensureDefsElement(svg);
  examGraphPatternDefinitions.forEach((definition) => {
    if (!definition.pattern) {
      return;
    }
    const pattern = createSvgElement("pattern");
    pattern.setAttribute("id", `exam-pattern-${definition.key}`);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("width", "8");
    pattern.setAttribute("height", "8");

    const background = createSvgElement("rect");
    background.setAttribute("width", "8");
    background.setAttribute("height", "8");
    background.setAttribute("fill", "#ffffff");
    pattern.appendChild(background);

    if (definition.pattern === "vertical") {
      const line = createSvgElement("line");
      line.setAttribute("x1", "3");
      line.setAttribute("x2", "3");
      line.setAttribute("y1", "0");
      line.setAttribute("y2", "8");
      line.setAttribute("stroke", "#111111");
      line.setAttribute("stroke-width", "1");
      pattern.appendChild(line);
    } else if (definition.pattern === "diagonal") {
      [
        { x1: "-1", y1: "7", x2: "7", y2: "-1" },
        { x1: "3", y1: "9", x2: "11", y2: "1" },
      ].forEach((config) => {
        const line = createSvgElement("line");
        Object.entries(config).forEach(([key, value]) => line.setAttribute(key, value));
        line.setAttribute("stroke", "#111111");
        line.setAttribute("stroke-width", "1");
        pattern.appendChild(line);
      });
    } else if (definition.pattern === "dots") {
      const dot = createSvgElement("circle");
      dot.setAttribute("cx", "4");
      dot.setAttribute("cy", "4");
      dot.setAttribute("r", "1.2");
      dot.setAttribute("fill", "#111111");
      pattern.appendChild(dot);
    } else if (definition.pattern === "horizontal") {
      const line = createSvgElement("line");
      line.setAttribute("x1", "0");
      line.setAttribute("x2", "8");
      line.setAttribute("y1", "4");
      line.setAttribute("y2", "4");
      line.setAttribute("stroke", "#111111");
      line.setAttribute("stroke-width", "1");
      pattern.appendChild(line);
    } else if (definition.pattern === "cross") {
      [
        { x1: "0", y1: "4", x2: "8", y2: "4" },
        { x1: "4", y1: "0", x2: "4", y2: "8" },
      ].forEach((config) => {
        const line = createSvgElement("line");
        Object.entries(config).forEach(([key, value]) => line.setAttribute(key, value));
        line.setAttribute("stroke", "#111111");
        line.setAttribute("stroke-width", "1");
        pattern.appendChild(line);
      });
    }

    defs.appendChild(pattern);
  });
}

function getExamGraphFill(index) {
  const definition = examGraphPatternDefinitions[index % examGraphPatternDefinitions.length];
  return definition.pattern ? `url(#exam-pattern-${definition.key})` : definition.fill;
}

function appendExamGraphTitle(svg, title, subtitle, width) {
  const titleNode = createSvgElement("text");
  titleNode.setAttribute("x", String(width / 2));
  titleNode.setAttribute("y", "34");
  titleNode.setAttribute("text-anchor", "middle");
  applyExamGraphTextStyle(titleNode, { fontSize: 20, fontWeight: 800 });
  titleNode.textContent = title;
  svg.appendChild(titleNode);

  if (subtitle) {
    const subtitleNode = createSvgElement("text");
    subtitleNode.setAttribute("x", String(width / 2));
    subtitleNode.setAttribute("y", "56");
    subtitleNode.setAttribute("text-anchor", "middle");
    applyExamGraphTextStyle(subtitleNode, { fontSize: 11, fontWeight: 500, fill: "#555555" });
    subtitleNode.textContent = subtitle;
    svg.appendChild(subtitleNode);
  }
}

function appendExamGraphLegend(svg, items, centerX, y) {
  const itemWidths = items.map((item) => 34 + String(item.label).length * 12);
  const totalWidth = itemWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, items.length - 1) * 14 + 20;
  const startX = centerX - totalWidth / 2 + 10;

  const box = createSvgElement("rect");
  box.setAttribute("x", String(centerX - totalWidth / 2));
  box.setAttribute("y", String(y - 20));
  box.setAttribute("width", String(totalWidth));
  box.setAttribute("height", "42");
  box.setAttribute("fill", "#ffffff");
  box.setAttribute("stroke", "#111111");
  box.setAttribute("stroke-width", "1.2");
  svg.appendChild(box);

  let cursorX = startX;
  items.forEach((item, index) => {
    const swatch = createSvgElement("rect");
    swatch.setAttribute("x", String(cursorX));
    swatch.setAttribute("y", String(y - 8));
    swatch.setAttribute("width", "18");
    swatch.setAttribute("height", "18");
    swatch.setAttribute("fill", item.fill ?? getExamGraphFill(index));
    swatch.setAttribute("stroke", "#111111");
    swatch.setAttribute("stroke-width", "1");
    svg.appendChild(swatch);

    const label = createSvgElement("text");
    label.setAttribute("x", String(cursorX + 26));
    label.setAttribute("y", String(y + 5));
    applyExamGraphTextStyle(label, { fontSize: 13, fontWeight: 700 });
    label.textContent = item.label;
    svg.appendChild(label);

    cursorX += itemWidths[index] + 14;
  });
}

function applyExamGraphTextStyle(node, { fontSize = 12, fontWeight = 700, fill = "#111111" } = {}) {
  node.setAttribute("fill", fill);
  node.setAttribute("font-size", `${fontSize}px`);
  node.setAttribute("font-weight", String(fontWeight));
  node.setAttribute("font-family", MAP_FONT_FAMILY);
  node.setAttribute("letter-spacing", "-0.02em");
}

function renderAnnotations() {
  renderMarkerList();
  renderInsetList();
}

function renderMarkerList() {
  elements.markerList.innerHTML = "";

  if (!state.markers.length) {
    elements.markerList.appendChild(createEmptyState("마커 추가 모드에서 지도를 클릭하면 표시가 생깁니다."));
    return;
  }

  state.markers.forEach((marker) => {
    const item = document.createElement("li");
    item.className = "annotation-item";

    const head = document.createElement("div");
    head.className = "annotation-head";
    const title = document.createElement("strong");
    title.textContent = `${marker.label || "무라벨"} · ${markerStyleLabel(marker.style)}`;
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-button tw-button";
    removeButton.textContent = "삭제";
    removeButton.addEventListener("click", () => {
      beginHistoryStep("마커 삭제");
      state.markers = state.markers.filter((entry) => entry.id !== marker.id);
      renderAnnotations();
      renderMap();
      setStatus("마커를 삭제했습니다.");
    });
    head.append(title, removeButton);

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.value = marker.label;
    labelInput.addEventListener("input", () => {
      beginHistoryStep("마커 라벨 변경");
      marker.label = labelInput.value;
      renderAnnotations();
      renderMap();
    });

    const styleSelect = buildMarkerStyleSelect(marker.style);
    styleSelect.addEventListener("change", () => {
      beginHistoryStep("마커 스타일 변경");
      marker.style = styleSelect.value;
      applyMarkerDefaultsIfNeeded(marker);
      renderAnnotations();
      renderMap();
    });

    const sizeInput = buildNumberInput(marker.size, 2, 140, 1, "마커 크기 변경", (value) => {
      marker.size = clamp(value, 2, 140);
      renderMap();
    });

    const aspectInput = buildNumberInput(marker.aspect, 0.2, 3, 0.05, "마커 비율 변경", (value) => {
      marker.aspect = clamp(value, 0.2, 3);
      renderMap();
    });

    const rotationInput = buildNumberInput(marker.rotation, -180, 180, 1, "마커 회전 변경", (value) => {
      marker.rotation = clamp(value, -180, 180);
      renderMap();
    });

    const offsetXInput = buildNumberInput(marker.offsetX, -320, 320, 1, "마커 라벨 위치 변경", (value) => {
      marker.offsetX = clamp(value, -320, 320);
      renderMap();
    });

    const offsetYInput = buildNumberInput(marker.offsetY, -320, 320, 1, "마커 라벨 위치 변경", (value) => {
      marker.offsetY = clamp(value, -320, 320);
      renderMap();
    });

    const fieldGrid = document.createElement("div");
    fieldGrid.className = "annotation-grid";
    fieldGrid.append(
      createField("라벨", labelInput),
      createField("스타일", styleSelect),
      createField("크기", sizeInput),
      createField("세로비", aspectInput),
      createField("회전", rotationInput),
      createField("라벨 X", offsetXInput),
      createField("라벨 Y", offsetYInput),
    );

    const meta = document.createElement("div");
    meta.className = "annotation-meta";
    meta.textContent = `${formatCoordinate(marker.lat, "lat")} · ${formatCoordinate(marker.lon, "lon")} · 미리보기에서 직접 이동/크기 조절`;

    item.append(head, fieldGrid, meta);
    elements.markerList.appendChild(item);
  });
}

function renderInsetList() {
  elements.insetList.innerHTML = "";

  if (!state.insets.length) {
    elements.insetList.appendChild(createEmptyState("인셋 추가 모드에서 드래그하면 확대 박스가 생깁니다."));
    return;
  }

  state.insets.forEach((inset) => {
    const item = document.createElement("li");
    item.className = "annotation-item";

    const head = document.createElement("div");
    head.className = "annotation-head";
    const title = document.createElement("strong");
    title.textContent = inset.label ? `인셋 ${inset.label}` : "인셋";
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-button tw-button";
    removeButton.textContent = "삭제";
    removeButton.addEventListener("click", () => {
      beginHistoryStep("인셋 삭제");
      state.insets = state.insets.filter((entry) => entry.id !== inset.id);
      renderAnnotations();
      renderMap();
      setStatus("인셋을 삭제했습니다.");
    });
    head.append(title, removeButton);

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.value = inset.label;
    labelInput.addEventListener("input", () => {
      beginHistoryStep("인셋 라벨 변경");
      inset.label = labelInput.value;
      renderMap();
      renderAnnotations();
    });

    const xInput = buildNumberInput(inset.panelX, 0, state.width, 1, "인셋 위치 변경", (value) => {
      inset.panelX = clamp(value, 0, state.width);
      renderMap();
    });

    const yInput = buildNumberInput(inset.panelY, 0, state.height, 1, "인셋 위치 변경", (value) => {
      inset.panelY = clamp(value, 0, state.height);
      renderMap();
    });

    const widthInput = buildNumberInput(
      inset.panelWidth,
      MIN_INSET_PANEL_WIDTH,
      Math.min(MAX_INSET_PANEL_WIDTH, state.width),
      1,
      "인셋 크기 변경",
      (value) => {
        setInsetPanelSizeFromWidth(inset, value);
        renderAnnotations();
        renderMap();
      },
    );

    const heightInput = buildNumberInput(inset.panelHeight, MIN_INSET_PANEL_HEIGHT, state.height, 1, "인셋 크기 변경", (value) => {
      setInsetPanelSizeFromHeight(inset, value);
      renderAnnotations();
      renderMap();
    });

    const zoomInput = buildNumberInput(
      Math.round(getInsetZoomScale(inset) * 100),
      Math.round(MIN_INSET_ZOOM_SCALE * 100),
      Math.round(MAX_INSET_ZOOM_SCALE * 100),
      5,
      "인셋 확대 배율 변경",
      (value) => {
        inset.zoomScale = clamp(value / 100, MIN_INSET_ZOOM_SCALE, MAX_INSET_ZOOM_SCALE);
        renderMap();
      },
    );

    const fieldGrid = document.createElement("div");
    fieldGrid.className = "annotation-grid";
    fieldGrid.append(
      createField("라벨", labelInput),
      createField("패널 X", xInput),
      createField("패널 Y", yInput),
      createField("너비", widthInput),
      createField("높이", heightInput),
      createField("확대 %", zoomInput),
    );

    const meta = document.createElement("div");
    meta.className = "annotation-meta";
    meta.textContent =
      `확대 ${Math.round(getInsetZoomScale(inset) * 100)}% · 샘플 점 ${inset.focusPoints.length}개 기준 · ` +
      `미리보기에서 직접 이동/크기 조절`;

    item.append(head, fieldGrid, meta);
    elements.insetList.appendChild(item);
  });
}

function createEmptyState(text) {
  const item = document.createElement("li");
  item.className = "empty-state";
  item.textContent = text;
  return item;
}

function createField(labelText, control) {
  const label = document.createElement("label");
  label.className = "tw-field compact-field";
  const text = document.createElement("span");
  text.textContent = labelText;
  label.append(text, control);
  return label;
}

function buildMarkerStyleSelect(currentValue) {
  const select = document.createElement("select");
  markerStyleOptions.forEach((optionData) => {
    const option = document.createElement("option");
    option.value = optionData.value;
    option.textContent = optionData.label;
    option.selected = optionData.value === currentValue;
    select.appendChild(option);
  });
  return select;
}

function buildNumberInput(value, min, max, step, historyLabel, onInput) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener("input", () => {
    const parsed = Number(input.value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    beginHistoryStep(historyLabel);
    onInput(parsed);
  });
  return input;
}

function removeSelectionEntry(regionId) {
  beginHistoryStep(state.mapVersion === "world" ? "국가 제거" : "권역 제거");
  setCurrentSelectionEntries(getCurrentSelectionEntries().filter((country) => country.id !== regionId));
  syncActiveStatsCountry();
  resetViewForSelectionIfNeeded();
  renderSelectionViews();
  syncKoreaControls();
  renderMap();
}

function toggleCountry(countryId) {
  const existing = state.selected.find((country) => country.id === countryId);
  const feature = countryById.get(countryId);

  if (!feature) {
    return;
  }

  if (existing) {
    removeSelectionEntry(countryId);
    setStatus(`${existing.name} 제거됨`);
    return;
  }

  beginHistoryStep("국가 선택 변경");
  state.selected.push({
    id: feature.id,
    name: feature.properties.name,
    color: nextPaletteColor(state.selected.length),
  });
  syncActiveStatsCountry(feature.id);
  resetViewForSelectionIfNeeded();
  renderSelectionViews();
  renderMap();
  setStatus(`${feature.properties.name} 추가됨`);
}

function toggleKoreaRegion(regionId) {
  if (koreaLevelRequiresParent(state.koreaLevel) && !state.koreaParentCode) {
    if (koreaProvinceByCode.has(regionId)) {
      if (isValidKoreaParentCodeForLevel(regionId, state.koreaLevel)) {
        setKoreaParentCode(regionId);
      } else if (state.koreaLevel === "cities") {
        setStatus("이 권역은 시/군 대신 구/군 보기에서 세부 권역을 볼 수 있습니다.");
      } else {
        setStatus("구/군 보기는 특별시와 광역시만 지원합니다.");
      }
    }
    return;
  }

  const feature =
    state.koreaLevel === "provinces"
      ? koreaDatasets.provinces.featureById.get(regionId)
      : state.koreaLevel === "cities"
        ? koreaCityFeatureById.get(regionId)
        : koreaDatasets.metroDistricts.featureById.get(regionId);
  const currentSelection = getCurrentSelectionEntries();
  const existing = currentSelection.find((region) => region.id === regionId);

  if (!feature) {
    return;
  }

  if (existing) {
    removeSelectionEntry(regionId);
    setStatus(`${formatSelectionDisplayName(existing)} 제거됨`);
    return;
  }

  beginHistoryStep("권역 선택 변경");
  setCurrentSelectionEntries([
    ...currentSelection,
    createKoreaSelectionEntry(feature, nextPaletteColor(currentSelection.length)),
  ]);
  renderSelectionViews();
  syncKoreaControls();
  renderMap();
  setStatus(`${formatSelectionDisplayName(createKoreaSelectionEntry(feature))} 추가됨`);
}

function renderMap() {
  if (state.mapVersion === "korea") {
    renderKoreaMap();
    return;
  }

  normalizeCanvasStateDimensions();
  const focusGeometry = buildFocusGeometry();
  const padding = Math.max(
    16,
    Math.round(Math.min(state.width, state.height) * (state.paddingPercent / 100)),
  );
  const projectionMeta = createProjectionMeta(focusGeometry, padding);
  const projection = projectionMeta.projection;
  const path = d3.geoPath(projection);
  const atlasDataset = getAtlasDataset(state.viewZoom);
  const selectedIds = new Set(state.selected.map((country) => country.id));
  const selectedColorById = buildMapFillColorById();
  const borderGeometry = buildBorderGeometry(atlasDataset, selectedIds);
  const guideGraphics = buildGuideGraphics(projection);
  const latitudeScaleGraphics = buildLatitudeScaleGraphics(projection);

  const svg = d3
    .create("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("viewBox", `0 0 ${state.width} ${state.height}`)
    .attr("width", state.width)
    .attr("height", state.height)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr(
      "aria-label",
      state.metricExplorerMapHighlightEnabled
        ? `${projectionModeLabels[state.projectionMode]} 시점의 세계 지도, 선택 국가 ${state.selected.length}개, 지표 상위 ${getMetricExplorerTopN()}개 강조`
        : `${projectionModeLabels[state.projectionMode]} 시점의 세계 지도, 선택 국가 ${state.selected.length}개`,
    );
  svg.style("background", state.oceanColor);

  const defs = svg.append("defs");
  const root = svg.append("g").attr("class", "root-layer");

  if (state.projectionMode === "rectangular") {
    defs
      .append("clipPath")
      .attr("id", "map-canvas-clip")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", state.width)
      .attr("height", state.height);
  }

  root
    .append("rect")
    .attr("class", "map-ocean")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", state.width)
    .attr("height", state.height)
    .attr("fill", state.oceanColor);

  const countriesGroup = root.append("g").attr("class", "countries-layer");

  if (state.projectionMode === "rectangular") {
    countriesGroup.attr("clip-path", "url(#map-canvas-clip)");
  }

  if (shouldRenderProjectionOutline()) {
    root
      .append("path")
      .datum({ type: "Sphere" })
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", "0.4pt")
      .attr("opacity", 0.8)
      .attr("vector-effect", "non-scaling-stroke");
  }

  renderAtlasLayer(countriesGroup, projection, atlasDataset, selectedColorById, borderGeometry, {
    clipRect: {
      x: 0,
      y: 0,
      width: state.width,
      height: state.height,
    },
    clipPadding: MAP_RENDER_CLIP_PADDING,
  });

  if (guideGraphics.length) {
    renderGuideLayer(root, guideGraphics);
  }

  if (latitudeScaleGraphics.length) {
    renderGuideLayer(root, latitudeScaleGraphics, {
      labelOpacity: 0.84,
      lineOpacity: 0.22,
    });
  }

  renderMarkerLayer(root, projection);
  renderInsetLayer(root, defs, projection, selectedColorById);

  if (state.showScaleBar) {
    renderScaleBar(root, projection, padding);
  }

  if (shouldRenderCanvasFrame()) {
    root
      .append("rect")
      .attr("x", 0.2)
      .attr("y", 0.2)
      .attr("width", Math.max(0, state.width - 0.4))
      .attr("height", Math.max(0, state.height - 0.4))
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", "0.4pt")
      .attr("vector-effect", "non-scaling-stroke");
  }

  currentSvgNode = svg.node();
  currentRenderContext = {
    projection,
    path,
    baseScale: projectionMeta.baseScale,
    baseTranslate: projectionMeta.baseTranslate,
    padding,
  };

  resetPreviewInteractionState();
  mountPreviewCanvas();
  updatePreviewHint();
  updateSelectionSummary();
  updateExportMeta();
  updateWorkspaceStats();
}

function renderKoreaMap() {
  normalizeCanvasStateDimensions();
  const compareMode = isKoreaCompareModeActive();
  const visibleFeatures = compareMode ? getCurrentKoreaComparedFeatures() : getVisibleKoreaRenderFeatures();
  const visibleProvinceCodeSet =
    state.koreaLevel === "cities" ? getKoreaProvinceCodeSetFromVisibleFeatures(visibleFeatures) : new Set();
  const fitGeometry = buildKoreaFitGeometry(visibleFeatures, visibleProvinceCodeSet);
  const padding = Math.max(
    18,
    Math.round(Math.min(state.width, state.height) * (state.paddingPercent / 100)),
  );
  const projection = d3.geoMercator();
  projection.fitExtent(
    [
      [padding, padding],
      [state.width - padding, state.height - padding],
    ],
    fitGeometry,
  );
  projection.precision(0.14);

  const path = d3.geoPath(projection);
  const selectedEntries = getCurrentSelectionEntries();
  const comparedIdSet = getCurrentKoreaComparedIdSet();
  const activeEntries = comparedIdSet.size
    ? selectedEntries.filter((region) => comparedIdSet.has(region.id))
    : selectedEntries;
  const selectedIds = new Set(activeEntries.map((region) => region.id));
  const selectedColorById = new Map(activeEntries.map((region) => [region.id, getSelectedCountryColor(region)]));
  const koreaDataset = getCurrentKoreaDataset();
  const visibleIds = new Set(visibleFeatures.map((feature) => feature.id));
  const landFeature = compareMode
    ? koreaDatasets.provinces.landFeature
    : state.koreaLevel === "cities"
      ? buildKoreaProvinceLandFeature(visibleProvinceCodeSet)
      : buildKoreaLandFeature(koreaDataset, visibleIds);
  const borderGeometry = compareMode
    ? buildKoreaCompareContextBorderGeometry()
    : buildKoreaBorderGeometry(koreaDataset, visibleIds, selectedIds);
  const provinceBoundaryGeometry =
    state.koreaLevel === "cities" && !compareMode ? buildKoreaProvinceBoundaryGeometry(visibleProvinceCodeSet) : null;
  const renderSubregionBoundaries = !compareMode && (state.koreaLevel === "cities" || state.koreaLevel === "metroDistricts");

  const svg = d3
    .create("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("viewBox", `0 0 ${state.width} ${state.height}`)
    .attr("width", state.width)
    .attr("height", state.height)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr(
      "aria-label",
      `대한민국 ${koreaRegionLevelLabels[state.koreaLevel]} 지도, 선택 권역 ${selectedEntries.length}개`,
    );
  svg.style("background", state.oceanColor);

  const landClipId = landFeature ? `korea-land-clip-${Math.round(Math.random() * 1_000_000_000)}` : "";
  if (landClipId) {
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", landClipId)
      .append("path")
      .datum(landFeature)
      .attr("d", path);
  }

  const root = svg.append("g").attr("class", "root-layer");
  root
    .append("rect")
    .attr("class", "map-ocean")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", state.width)
    .attr("height", state.height)
    .attr("fill", state.oceanColor);

  if (landFeature) {
    root
      .append("path")
      .datum(landFeature)
      .attr("class", "map-land")
      .attr("d", path)
      .attr("fill", state.landColor)
      .attr("stroke", "none");
  }

  root
    .selectAll(".map-region")
    .data(visibleFeatures.filter((feature) => selectedColorById.has(feature.id)))
    .join("path")
    .attr("class", "map-region")
    .attr("d", path)
    .attr("fill", (feature) => selectedColorById.get(feature.id) ?? state.landColor)
    .attr("stroke", "none");

  if (compareMode && visibleFeatures.length) {
    root
      .selectAll(".map-region-outline")
      .data(visibleFeatures.filter((feature) => selectedColorById.has(feature.id)))
      .join("path")
      .attr("class", "map-region-outline")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("stroke-dasharray", getBorderStrokeDasharray())
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("vector-effect", "non-scaling-stroke");
  }

  if (borderGeometry) {
    root
      .append("path")
      .datum(borderGeometry)
      .attr("class", "map-border-lines")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-opacity", renderSubregionBoundaries ? (state.koreaLevel === "metroDistricts" ? 0.8 : 0.42) : 1)
      .attr(
        "stroke-width",
        renderSubregionBoundaries
          ? state.koreaLevel === "metroDistricts"
            ? KOREA_METRO_DISTRICT_BOUNDARY_STROKE_WIDTH
            : KOREA_CITY_BOUNDARY_STROKE_WIDTH
          : OUTLINE_STROKE_WIDTH,
      )
      .attr("stroke-dasharray", renderSubregionBoundaries ? null : getBorderStrokeDasharray())
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("vector-effect", "non-scaling-stroke");
  }

  if (provinceBoundaryGeometry) {
    root
      .append("path")
      .datum(provinceBoundaryGeometry)
      .attr("class", "map-province-boundary-lines")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", KOREA_CITY_CONTEXT_STROKE_WIDTH)
      .attr("stroke-dasharray", getBorderStrokeDasharray())
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("vector-effect", "non-scaling-stroke");
  }

  renderKoreaWaterwayLayer(root, path, landClipId);
  renderKoreaRouteLayer(root, path);

  if (landFeature) {
    root
      .append("path")
      .datum(landFeature)
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", state.koreaLevel === "cities" && !compareMode ? KOREA_CITY_CONTEXT_STROKE_WIDTH : OUTLINE_STROKE_WIDTH)
      .attr("stroke-linejoin", "round")
      .attr("vector-effect", "non-scaling-stroke");
  }

  if (state.showScaleBar) {
    renderScaleBar(root, projection, padding);
  }

  if (state.showFrame) {
    root
      .append("rect")
      .attr("x", 0.2)
      .attr("y", 0.2)
      .attr("width", Math.max(0, state.width - 0.4))
      .attr("height", Math.max(0, state.height - 0.4))
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("vector-effect", "non-scaling-stroke");
  }

  currentSvgNode = svg.node();
  currentRenderContext = {
    projection,
    path,
    baseScale: projection.scale(),
    baseTranslate: [...projection.translate()],
    padding,
  };

  resetPreviewInteractionState();
  mountPreviewCanvas();
  updatePreviewHint();
  updateSelectionSummary();
  updateExportMeta();
  updateWorkspaceStats();
}

function getVisibleKoreaRenderFeatures() {
  if (isKoreaCompareModeActive()) {
    return getCurrentKoreaDataset().features;
  }

  if (state.koreaLevel === "provinces") {
    return koreaDatasets.provinces.features;
  }

  if (state.koreaLevel === "cities") {
    return getVisibleKoreaSelectableFeatures();
  }

  if (!state.koreaParentCode) {
    return koreaDatasets.provinces.features;
  }

  return getVisibleKoreaSelectableFeatures();
}

function buildKoreaFitGeometry(visibleFeatures, visibleProvinceCodeSet = new Set()) {
  if (isKoreaCompareModeActive()) {
    return koreaDatasets.provinces.landFeature;
  }

  if (state.koreaLevel === "cities") {
    if (hasKoreaCityScopeFilter()) {
      return buildKoreaProvinceLandFeature(visibleProvinceCodeSet) ?? koreaDatasets.provinces.landFeature;
    }

    return koreaDatasets.provinces.landFeature;
  }

  if (koreaLevelRequiresParent(state.koreaLevel) && state.koreaParentCode) {
    return koreaProvinceByCode.get(state.koreaParentCode) ?? {
      type: "FeatureCollection",
      features: visibleFeatures,
    };
  }

  return {
    type: "FeatureCollection",
    features: visibleFeatures.length ? visibleFeatures : koreaDatasets.provinces.features,
  };
}

function buildKoreaLandFeature(dataset, visibleIds) {
  if (visibleIds.size === dataset.features.length) {
    return dataset.landFeature;
  }

  const geometries = dataset.regionsObject.geometries.filter((geometry) =>
    visibleIds.has(String(geometry.properties?.code ?? geometry.id ?? "")),
  );
  return geometries.length ? topojson.merge(dataset.topology, geometries) : null;
}

function getKoreaProvinceCodeSetFromVisibleFeatures(visibleFeatures = []) {
  const provinceCodes = new Set();

  visibleFeatures.forEach((feature) => {
    const featureCode = String(feature?.id ?? feature?.properties?.code ?? "");
    if (koreaProvinceByCode.has(featureCode)) {
      provinceCodes.add(featureCode);
      return;
    }

    const parentCode = String(feature?.properties?.parentCode ?? "");
    if (koreaProvinceByCode.has(parentCode)) {
      provinceCodes.add(parentCode);
    }
  });

  return provinceCodes;
}

function buildKoreaProvinceLandFeature(visibleProvinceCodeSet = new Set()) {
  if (!visibleProvinceCodeSet.size) {
    return null;
  }

  if (visibleProvinceCodeSet.size === koreaDatasets.provinces.features.length) {
    return koreaDatasets.provinces.landFeature;
  }

  const geometries = koreaDatasets.provinces.regionsObject.geometries.filter((geometry) =>
    visibleProvinceCodeSet.has(String(geometry.properties?.code ?? geometry.id ?? "")),
  );
  return geometries.length ? topojson.merge(koreaDatasets.provinces.topology, geometries) : null;
}

function buildKoreaProvinceBoundaryGeometry(visibleProvinceCodeSet = new Set()) {
  if (state.borderMode === "none" || visibleProvinceCodeSet.size < 2) {
    return null;
  }

  return topojson.mesh(
    koreaDatasets.provinces.topology,
    koreaDatasets.provinces.regionsObject,
    (a, b) => {
      const aCode = String(a?.properties?.code ?? a?.id ?? "");
      const bCode = String(b?.properties?.code ?? b?.id ?? "");
      return visibleProvinceCodeSet.has(aCode) && visibleProvinceCodeSet.has(bCode) && a !== b;
    },
  );
}

function buildKoreaCompareContextBorderGeometry() {
  if (state.borderMode === "none") {
    return null;
  }

  return topojson.mesh(
    koreaDatasets.provinces.topology,
    koreaDatasets.provinces.regionsObject,
    (a, b) => a !== b,
  );
}

function isHanRiverCorridorWaterway(waterway) {
  return waterway?.id === "hanRiverSeoul";
}

function getHanRiverCorridorWidth() {
  const minDimension = Math.min(state.width, state.height);
  const baseWidth =
    state.koreaLevel === "metroDistricts"
      ? clamp(minDimension * 0.032, 8, 16)
      : clamp(minDimension * 0.022, 6, 11);
  return {
    fillWidth: baseWidth,
    bankWidth: baseWidth + 2.1,
  };
}

function renderKoreaWaterwayLayer(root, path, clipId = "") {
  const activeWaterways = getActiveKoreaWaterways();
  if (!activeWaterways.length) {
    return;
  }

  const waterLayer = root.append("g").attr("class", "korea-waterway-layer");
  if (clipId) {
    waterLayer.attr("clip-path", `url(#${clipId})`);
  }
  activeWaterways.forEach((waterway) => {
    const geometryType = String(waterway.feature?.geometry?.type ?? "");

    if (geometryType.includes("Polygon")) {
      waterLayer
        .append("path")
        .datum(waterway.feature)
        .attr("class", "korea-waterway korea-waterway--fill")
        .attr("d", path)
        .attr("fill", state.oceanColor)
        .attr("stroke", state.borderColor)
        .attr("stroke-width", "0.5pt")
        .attr("stroke-linejoin", "round")
        .attr("vector-effect", "non-scaling-stroke");
      return;
    }

    if (isHanRiverCorridorWaterway(waterway)) {
      const { fillWidth, bankWidth } = getHanRiverCorridorWidth();
      waterLayer
        .append("path")
        .datum(waterway.feature)
        .attr("class", "korea-waterway korea-waterway--bank")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", state.borderColor)
        .attr("stroke-opacity", 0.9)
        .attr("stroke-width", bankWidth)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round");

      waterLayer
        .append("path")
        .datum(waterway.feature)
        .attr("class", "korea-waterway korea-waterway--corridor")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", state.oceanColor)
        .attr("stroke-width", fillWidth)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round");
      return;
    }

    waterLayer
      .append("path")
      .datum(waterway.feature)
      .attr("class", "korea-waterway korea-waterway--halo")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#ffffff")
      .attr("stroke-opacity", 0.92)
      .attr("stroke-width", `${waterway.width + 1.25}pt`)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("vector-effect", "non-scaling-stroke");

    waterLayer
      .append("path")
      .datum(waterway.feature)
      .attr("class", "korea-waterway")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", waterway.color)
      .attr("stroke-width", `${waterway.width}pt`)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("vector-effect", "non-scaling-stroke");
  });
}

function renderKoreaRouteLayer(root, path) {
  const activeRoutes = getActiveKoreaRoutes();
  if (!activeRoutes.length) {
    return;
  }

  const routeLayer = root.append("g").attr("class", "korea-route-layer");
  activeRoutes.forEach((route) => {
    routeLayer
      .append("path")
      .datum(route.feature)
      .attr("class", "korea-route korea-route--halo")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#ffffff")
      .attr("stroke-opacity", 0.88)
      .attr("stroke-width", `${route.width + 0.7}pt`)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("vector-effect", "non-scaling-stroke");

    routeLayer
      .append("path")
      .datum(route.feature)
      .attr("class", "korea-route")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", route.color)
      .attr("stroke-width", `${route.width}pt`)
      .attr("stroke-dasharray", route.dashArray || null)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("vector-effect", "non-scaling-stroke");
  });

  renderKoreaRouteLegend(root, activeRoutes);
}

function renderKoreaRouteLegend(root, activeRoutes) {
  const legend = root.append("g").attr("class", "korea-route-legend");
  const legendX = 16;
  const legendY = 16;
  const rowHeight = activeRoutes.length >= 4 ? 10.5 : 11.5;
  const fontSize = activeRoutes.length >= 4 ? 4.8 : 5.2;
  const swatchLength = 14;
  const textOffset = 22;
  const panelWidth = clamp(40 + Math.max(...activeRoutes.map((route) => route.name.length)) * 11, 104, 132);
  const panelHeight = 16 + activeRoutes.length * rowHeight;

  legend
    .append("rect")
    .attr("x", legendX - 8)
    .attr("y", legendY - 8)
    .attr("width", panelWidth)
    .attr("height", panelHeight)
    .attr("fill", "#ffffff")
    .attr("stroke", state.borderColor)
    .attr("stroke-width", OUTLINE_STROKE_WIDTH)
    .attr("vector-effect", "non-scaling-stroke");

  activeRoutes.forEach((route, index) => {
    const y = legendY + index * rowHeight;
    legend
      .append("line")
      .attr("x1", legendX)
      .attr("x2", legendX + swatchLength)
      .attr("y1", y)
      .attr("y2", y)
      .attr("stroke", route.color)
      .attr("stroke-width", `${route.width}pt`)
      .attr("stroke-dasharray", route.dashArray || null)
      .attr("stroke-linecap", "round")
      .attr("vector-effect", "non-scaling-stroke");

    legend
      .append("text")
      .attr("x", legendX + textOffset)
      .attr("y", y)
      .attr("dominant-baseline", "middle")
      .attr("font-size", `${fontSize}pt`)
      .attr("font-family", "Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif")
      .attr("font-weight", 700)
      .attr("letter-spacing", "-0.02em")
      .attr("fill", state.borderColor)
      .text(route.name);
  });
}

function getActiveKoreaRoutes() {
  return Object.entries(state.koreaRouteVisibility)
    .filter(([, isVisible]) => isVisible)
    .map(([routeId]) => koreaRouteById.get(routeId))
    .filter(Boolean);
}

function getActiveKoreaWaterways() {
  return [];
}

function buildKoreaBorderGeometry(dataset, visibleIds, selectedIds) {
  if (state.borderMode === "none") {
    return null;
  }

  const hasVisibleSelection = [...selectedIds].some((id) => visibleIds.has(id));

  return topojson.mesh(dataset.topology, dataset.regionsObject, (a, b) => {
    const aCode = String(a?.properties?.code ?? a?.id ?? "");
    const bCode = String(b?.properties?.code ?? b?.id ?? "");

    if (!visibleIds.has(aCode) || !visibleIds.has(bCode)) {
      return false;
    }

    if (!state.selectedBordersOnly || !selectedIds.size || !hasVisibleSelection) {
      return a !== b;
    }

    return a !== b && (selectedIds.has(aCode) || selectedIds.has(bCode));
  });
}

function shouldRenderProjectionOutline() {
  return state.projectionMode !== "rectangular";
}

function shouldRenderCanvasFrame() {
  return state.showFrame && state.projectionMode === "rectangular";
}

function buildFocusGeometry() {
  if (!state.autoFocusOnSelection || !state.selected.length) {
    return { type: "Sphere" };
  }

  return {
    type: "FeatureCollection",
    features: state.selected.map((country) => countryById.get(country.id)).filter(Boolean),
  };
}

function createProjectionMeta(focusGeometry, padding) {
  const target = buildProjectionFitGeometry(focusGeometry);
  const baseProjection = buildBaseProjection();
  baseProjection.fitExtent(
    [
      [padding, padding],
      [state.width - padding, state.height - padding],
    ],
    target,
  );

  const baseScale = baseProjection.scale();
  const baseTranslate = [...baseProjection.translate()];

  const projection = buildBaseProjection();
  projection.scale(baseScale * state.viewZoom);
  projection.translate([
    baseTranslate[0] + state.viewOffsetX,
    baseTranslate[1] + state.viewOffsetY,
  ]);

  return {
    projection,
    baseScale,
    baseTranslate,
  };
}

function buildProjectionFitGeometry(focusGeometry) {
  if (state.projectionMode === "northPolar") {
    return d3.geoCircle().center([0, 90]).radius(90)();
  }

  if (state.projectionMode === "southPolar") {
    return d3.geoCircle().center([0, -90]).radius(90)();
  }

  return focusGeometry ?? { type: "Sphere" };
}

function buildBaseProjection() {
  let projection;

  if (state.projectionMode === "northPolar") {
    projection = d3.geoAzimuthalEquidistant().rotate([-state.centerLongitude, -90]);
    projection.clipAngle(90);
  } else if (state.projectionMode === "southPolar") {
    projection = d3.geoAzimuthalEquidistant().rotate([-state.centerLongitude, 90]);
    projection.clipAngle(90);
  } else {
    projection = typeof d3.geoMiller === "function" ? d3.geoMiller() : d3.geoEquirectangular();
    projection.rotate([-state.centerLongitude, 0]);
  }

  projection.precision(getProjectionPrecision());
  return projection;
}

function getProjectionPrecision() {
  const zoomFactor = Math.max(1, state.viewZoom);
  const basePrecision =
    state.projectionMode === "rectangular" ? 0.34 / Math.pow(zoomFactor, 0.42) : 0.24 / Math.pow(zoomFactor, 0.4);

  const detailMultiplier =
    state.coastlineDetail === "performance"
      ? 1.6
      : state.coastlineDetail === "detailed"
        ? 0.82
        : state.coastlineDetail === "max"
          ? 0.58
          : 1;

  return clamp(basePrecision * detailMultiplier, 0.025, 0.3);
}

function buildBorderGeometry(atlasDataset, selectedIds) {
  if (state.borderMode === "none") {
    return null;
  }

  if (!state.selectedBordersOnly || !selectedIds.size) {
    return atlasDataset.borderMesh;
  }

  return topojson.mesh(atlasDataset.topology, atlasDataset.countriesObject, (a, b) => {
    const aId = a ? String(Number(a.id)) : "";
    const bId = b ? String(Number(b.id)) : "";
    return selectedIds.has(aId) || selectedIds.has(bId);
  });
}

function renderAtlasLayer(container, projection, atlasDataset, selectedColorById, borderGeometry, options = {}) {
  const copyOffsets = options.wrap === false ? [0] : getProjectionCopyOffsets(projection);
  const lakeDataset = atlasLakeDatasets[atlasDataset.datasetKey] ?? baseLakeDataset;
  const renderDetailedCountryFills = atlasDataset.datasetKey === "10m";
  const fallbackCountryDataset =
    renderDetailedCountryFills ? atlasDatasets["50m"] ?? atlasDatasets["110m"] ?? atlasDataset : null;
  const fillAtlasDataset =
    renderDetailedCountryFills
      ? atlasDataset
      : atlasDataset.datasetKey === "10m"
        ? atlasDatasets["50m"] ?? atlasDatasets["110m"] ?? atlasDataset
        : atlasDataset;
  const detailedFillFeatures = renderDetailedCountryFills
    ? atlasDataset.countryFeatures
        .map((feature) =>
          atlasDataset.unstableFillCountryIds.has(feature.id)
            ? fallbackCountryDataset?.countryById.get(feature.id) ?? feature
            : feature,
        )
        .filter(Boolean)
    : [];
  // Paint shared land once for coarse layers; at 10m, fill countries individually to avoid merged-land inversions.
  const selectedFeatures = renderDetailedCountryFills
    ? []
    : fillAtlasDataset.countryFeatures.filter((feature) => selectedColorById.has(feature.id));
  const clipRect = normalizeClipRect(options.clipRect, options.clipPadding ?? 0);

  copyOffsets.forEach((offset) => {
    const renderProjection = createRenderProjection(projection, shiftClipRect(clipRect, -offset, 0));
    const path = d3.geoPath(renderProjection);
    const copyGroup = container
      .append("g")
      .attr("class", "map-copy")
      .attr("transform", offset ? `translate(${offset} 0)` : null);

    if (renderDetailedCountryFills) {
      copyGroup
        .selectAll(".map-country-fill")
        .data(detailedFillFeatures)
        .join("path")
        .attr("class", "map-country-fill")
        .attr("d", path)
        .attr("fill", (feature) => selectedColorById.get(feature.id) ?? state.landColor)
        .attr("stroke", "none")
        .attr("data-country-id", (feature) => feature.id);
    } else {
      copyGroup
        .append("path")
        .datum(fillAtlasDataset.landFeature)
        .attr("class", "map-land")
        .attr("d", path)
        .attr("fill", state.landColor)
        .attr("stroke", "none");
    }

    if (selectedFeatures.length) {
      copyGroup
        .selectAll(".map-country")
        .data(selectedFeatures)
        .join("path")
        .attr("class", "map-country")
        .attr("d", path)
        .attr("fill", (feature) => selectedColorById.get(feature.id) ?? state.landColor)
        .attr("stroke", "none")
        .attr("data-country-id", (feature) => feature.id)
        .attr("data-selected", "true");
    }

    if (lakeDataset?.geometry?.geometries?.length) {
      copyGroup
        .append("path")
        .datum(lakeDataset.geometry)
        .attr("class", "map-lakes")
        .attr("d", path)
        .attr("fill", state.oceanColor)
        .attr("stroke", "none");

      copyGroup
        .append("path")
        .datum(lakeDataset.geometry)
        .attr("class", "map-lake-lines")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", state.borderColor)
        .attr("stroke-width", OUTLINE_STROKE_WIDTH)
        .attr("stroke-linejoin", "round")
        .attr("vector-effect", "non-scaling-stroke");
    }

    if (borderGeometry) {
      copyGroup
        .append("path")
        .datum(borderGeometry)
        .attr("class", "map-border-lines")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", state.borderColor)
        .attr("stroke-width", "0.4pt")
        .attr("stroke-dasharray", getBorderStrokeDasharray())
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("vector-effect", "non-scaling-stroke");
    }

    copyGroup
      .append("path")
      .datum(atlasDataset.landFeature)
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", "0.4pt")
      .attr("stroke-linejoin", "round")
      .attr("vector-effect", "non-scaling-stroke");
  });
}

function getBorderStrokeDasharray() {
  return state.borderMode === "dashed" ? "2.8pt 2.2pt" : null;
}

function normalizeClipRect(rect, padding = 0) {
  if (!rect) {
    return null;
  }

  const x = Number(rect.x);
  const y = Number(rect.y);
  const width = Number(rect.width);
  const height = Number(rect.height);
  const insetPadding = Math.max(0, Number(padding) || 0);

  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return null;
  }

  return {
    x: x - insetPadding,
    y: y - insetPadding,
    width: width + insetPadding * 2,
    height: height + insetPadding * 2,
  };
}

function shiftClipRect(rect, deltaX = 0, deltaY = 0) {
  if (!rect) {
    return null;
  }

  return {
    x: rect.x + deltaX,
    y: rect.y + deltaY,
    width: rect.width,
    height: rect.height,
  };
}

function createRenderProjection(projection, clipRect) {
  if (!clipRect || typeof projection.copy !== "function") {
    return projection;
  }

  return projection.copy().clipExtent([
    [clipRect.x, clipRect.y],
    [clipRect.x + clipRect.width, clipRect.y + clipRect.height],
  ]);
}

function getProjectionCopyOffsets(projection) {
  if (state.projectionMode !== "rectangular") {
    return [0];
  }

  const wrapWidth = getProjectionWrapWidth(projection);
  if (!Number.isFinite(wrapWidth) || wrapWidth < 1) {
    return [0];
  }

  const viewportReach = Math.abs(state.viewOffsetX) + state.width * 1.5;
  const extraCopies =
    state.coastlineDetail === "performance" ? 0 : state.coastlineDetail === "max" ? 2 : 1;
  const repeatCount = clamp(Math.ceil(viewportReach / wrapWidth) + extraCopies, 1, 4);
  return d3.range(-repeatCount, repeatCount + 1).map((step) => wrapWidth * step);
}

function getProjectionWrapWidth(projection) {
  if (state.projectionMode !== "rectangular") {
    return 0;
  }

  return projection.scale() * Math.PI * 2;
}

function buildGuideGraphics(projection) {
  const graphics = [];

  latitudeGuideDefinitions.forEach((definition) => {
    if (!state.guides[definition.key]) {
      return;
    }

    definition.latitudes.forEach((latitude) => {
      const feature = {
        type: "LineString",
        coordinates: d3.range(-180, 181, 1).map((longitude) => [longitude, latitude]),
      };
      const visiblePoints = feature.coordinates
        .map((coordinate) => projectCoordinate(projection, coordinate))
        .filter(Boolean);

      if (!visiblePoints.length) {
        return;
      }

      const key = `${definition.key}-${latitude}`;
      const anchors =
        state.projectionMode === "rectangular"
          ? buildRectangularGuideAnchors(visiblePoints, latitude)
          : buildPolarGuideAnchor(visiblePoints, latitude);

      graphics.push({
        key,
        pathData: d3.geoPath(projection)(feature),
        color: state.borderColor,
        latitude,
        anchors,
      });
    });
  });

  return graphics;
}

function buildLatitudeScaleGraphics(projection) {
  if (!state.showLatitudeLabels || state.projectionMode !== "rectangular") {
    return [];
  }

  const visibleRange = getVisibleLatitudeRange(projection);
  if (!visibleRange) {
    return [];
  }

  const step = pickLatitudeScaleStep(visibleRange);
  const latitudes = buildLatitudeScaleLatitudes(visibleRange, step);
  const manualLatitudes = new Set(
    latitudeGuideDefinitions
      .filter((definition) => state.guides[definition.key])
      .flatMap((definition) => definition.latitudes.map((latitude) => latitude.toFixed(2))),
  );

  return latitudes
    .filter((latitude) => !manualLatitudes.has(latitude.toFixed(2)))
    .map((latitude) => {
      const feature = {
        type: "LineString",
        coordinates: d3.range(-180, 181, 1).map((longitude) => [longitude, latitude]),
      };
      const visiblePoints = feature.coordinates
        .map((coordinate) => projectCoordinate(projection, coordinate))
        .filter(Boolean)
        .filter((point) => point.y >= 8 && point.y <= state.height - 8);

      if (!visiblePoints.length) {
        return null;
      }

      return {
        key: `latitude-scale-${latitude}`,
        pathData: d3.geoPath(projection)(feature),
        color: state.borderColor,
        latitude,
        anchors: buildRectangularGuideAnchors(visiblePoints, latitude),
      };
    })
    .filter(Boolean);
}

function getVisibleLatitudeRange(projection) {
  const sampleX = state.width / 2;
  const top = projection.invert([sampleX, 0]);
  const bottom = projection.invert([sampleX, state.height]);
  if (!isFiniteCoordinate(top) || !isFiniteCoordinate(bottom)) {
    return null;
  }

  return {
    min: clamp(Math.min(top[1], bottom[1]), -90, 90),
    max: clamp(Math.max(top[1], bottom[1]), -90, 90),
  };
}

function pickLatitudeScaleStep(range) {
  const span = Math.abs(range.max - range.min);
  if (span <= 45) {
    return 5;
  }
  if (span <= 120) {
    return 10;
  }
  return 30;
}

function buildLatitudeScaleLatitudes(range, step) {
  const paddedMin = clamp(range.min - step * 0.5, -90, 90);
  const paddedMax = clamp(range.max + step * 0.5, -90, 90);
  const latitudes = [];
  const start = Math.ceil(paddedMin / step) * step;

  for (let latitude = start; latitude <= paddedMax + 0.001; latitude += step) {
    const rounded = Number(latitude.toFixed(4));
    if (Math.abs(rounded) > 89.999) {
      continue;
    }
    latitudes.push(rounded);
  }

  if (!latitudes.some((latitude) => Math.abs(latitude) < 0.001) && range.min <= 0 && range.max >= 0) {
    latitudes.push(0);
  }

  return [...new Set(latitudes)].sort((a, b) => a - b);
}

function buildRectangularGuideAnchors(visiblePoints, latitude) {
  const leftPoint = visiblePoints.reduce((best, point) => (point.x < best.x ? point : best), visiblePoints[0]);
  const label = formatLatitudeLabel(latitude);
  const edgePadding = 6;
  const clampedY = clamp(leftPoint.y, 18, state.height - 12);

  if (leftPoint.x <= 20) {
    return [{ x: edgePadding, y: clampedY, label, side: "right" }];
  }

  if (leftPoint.x >= state.width - 20) {
    return [{ x: state.width - edgePadding, y: clampedY, label, side: "left" }];
  }

  return [{ x: leftPoint.x, y: clampedY, label, side: "left" }];
}

function buildPolarGuideAnchor(visiblePoints, latitude) {
  const topPoint = visiblePoints.reduce((best, point) => (point.y < best.y ? point : best), visiblePoints[0]);
  return [{ x: topPoint.x, y: topPoint.y, label: formatLatitudeLabel(latitude), side: "top" }];
}

function renderGuideLayer(root, guideGraphics, options = {}) {
  const group = root.append("g").attr("class", "guides-layer");
  const labelOpacity = options.labelOpacity ?? 1;
  const lineOpacity = options.lineOpacity ?? 0.42;

  guideGraphics.forEach((guide) => {
    if (state.showGuideLines) {
      group
        .append("path")
        .attr("d", guide.pathData)
        .attr("fill", "none")
        .attr("stroke", guide.color)
        .attr("stroke-width", "0.4pt")
        .attr("stroke-linecap", "round")
        .attr("opacity", lineOpacity)
        .attr("vector-effect", "non-scaling-stroke");
    }

    if (state.showLatitudeLabels) {
      guide.anchors.forEach((anchor) => {
        renderGuideAnchor(group, anchor, guide.color, labelOpacity);
      });
    }
  });
}

function renderGuideAnchor(group, anchor, color, opacity = 1) {
  const tick = group
    .append("path")
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", "0.4pt")
    .attr("opacity", opacity);

  if (anchor.side === "left") {
    tick.attr("d", `M ${anchor.x - 2} ${anchor.y} L ${anchor.x - 16} ${anchor.y}`);
    appendMapLabel(group, {
      x: anchor.x - 20,
      y: anchor.y + 3,
      text: anchor.label,
      anchor: "end",
      fill: color,
      opacity,
    });
    return;
  }

  if (anchor.side === "right") {
    tick.attr("d", `M ${anchor.x + 2} ${anchor.y} L ${anchor.x + 12} ${anchor.y}`);
    appendMapLabel(group, {
      x: anchor.x + 15,
      y: anchor.y + 3,
      text: anchor.label,
      anchor: "start",
      fill: color,
      opacity,
    });
    return;
  }

  tick.attr("d", `M ${anchor.x} ${anchor.y - 2} L ${anchor.x} ${anchor.y - 16}`);
  appendMapLabel(group, {
    x: anchor.x,
    y: anchor.y - 18,
    text: anchor.label,
    anchor: "middle",
    fill: color,
    opacity,
  });
}

function renderMarkerLayer(root, projection) {
  if (!state.markers.length) {
    return;
  }

  const group = root.append("g").attr("class", "markers-layer");

  state.markers.forEach((marker) => {
    const point = projectCoordinate(projection, [marker.lon, marker.lat]);
    if (!point) {
      return;
    }

    const markerGroup = group.append("g").attr("class", `marker marker--${marker.style}`);
    const labelPoint = {
      x: point.x + marker.offsetX,
      y: point.y + marker.offsetY,
    };

    drawMarkerShape(markerGroup, marker, point);

    if (marker.label.trim()) {
      const leaderStart = projectLeaderAnchor(point, labelPoint, marker);
      markerGroup
        .append("path")
        .attr("d", `M ${leaderStart.x} ${leaderStart.y} L ${labelPoint.x} ${labelPoint.y}`)
        .attr("fill", "none")
        .attr("stroke", state.borderColor)
        .attr("stroke-width", OUTLINE_STROKE_WIDTH)
        .attr("vector-effect", "non-scaling-stroke");

      appendMapLabel(markerGroup, {
        x: labelPoint.x + (marker.offsetX >= 0 ? 6 : -6),
        y: labelPoint.y + 3,
        text: marker.label.trim(),
        anchor: marker.offsetX >= 0 ? "start" : "end",
        fill: state.borderColor,
      });
    }
  });
}

function drawMarkerShape(group, marker, point) {
  const strokeWidth = marker.style === "filledDot" ? 0 : OUTLINE_STROKE_WIDTH;

  if (marker.style === "ring") {
    group
      .append("circle")
      .attr("cx", point.x)
      .attr("cy", point.y)
      .attr("r", Math.max(7, marker.size))
      .attr("fill", "#ffffff")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", strokeWidth)
      .attr("vector-effect", "non-scaling-stroke");
    return;
  }

  if (marker.style === "dashedOval") {
    group
      .append("ellipse")
      .attr("cx", point.x)
      .attr("cy", point.y)
      .attr("rx", Math.max(9, marker.size))
      .attr("ry", Math.max(7, marker.size * marker.aspect))
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("stroke-dasharray", "5pt 4pt")
      .attr("transform", `rotate(${marker.rotation} ${point.x} ${point.y})`)
      .attr("vector-effect", "non-scaling-stroke");
    return;
  }

  if (marker.style === "point") {
    group
      .append("circle")
      .attr("cx", point.x)
      .attr("cy", point.y)
      .attr("r", Math.max(4.5, marker.size * 0.62))
      .attr("fill", "#ffffff")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("vector-effect", "non-scaling-stroke");
    return;
  }

  group
    .append("circle")
    .attr("cx", point.x)
    .attr("cy", point.y)
    .attr("r", Math.max(2.8, marker.size))
    .attr("fill", state.borderColor)
    .attr("stroke", "none");
}

function projectLeaderAnchor(origin, labelPoint, marker) {
  const deltaX = labelPoint.x - origin.x;
  const deltaY = labelPoint.y - origin.y;
  const distance = Math.hypot(deltaX, deltaY) || 1;
  const unitX = deltaX / distance;
  const unitY = deltaY / distance;
  const radius =
    marker.style === "dashedOval"
      ? Math.max(marker.size, marker.size * marker.aspect, 10)
      : marker.style === "filledDot"
        ? Math.max(2.8, marker.size)
        : Math.max(6, marker.size);

  return {
    x: origin.x + unitX * radius,
    y: origin.y + unitY * radius,
  };
}

function renderInsetLayer(root, defs, mainProjection, selectedColorById) {
  if (!state.insets.length) {
    return;
  }

  const layer = root.append("g").attr("class", "insets-layer");

  state.insets.forEach((inset, index) => {
    renderSingleInset(layer, defs, mainProjection, inset, selectedColorById, index);
  });
}

function renderSingleInset(layer, defs, mainProjection, inset, selectedColorById, index) {
  const frame = normalizeInsetFrame(inset);
  const sourceFrame = buildInsetSourceFrame(mainProjection, inset, frame);

  if (sourceFrame) {
    renderDashedFrame(layer, sourceFrame, {
      stroke: state.borderColor,
      dasharray: "4.5pt 3.2pt",
    });
  }

  const panelGroup = layer.append("g").attr("class", "inset-panel");
  const clipId = `inset-clip-${sanitizeIdentifier(inset.id)}-${index}`;

  defs
    .append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("x", frame.x)
    .attr("y", frame.y)
    .attr("width", frame.width)
    .attr("height", frame.height);

  panelGroup
    .append("rect")
    .attr("x", frame.x)
    .attr("y", frame.y)
    .attr("width", frame.width)
    .attr("height", frame.height)
      .attr("fill", state.oceanColor)
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("vector-effect", "non-scaling-stroke");

  const insetGroup = panelGroup.append("g").attr("clip-path", `url(#${clipId})`);
  renderInsetMapContent(insetGroup, mainProjection, frame, sourceFrame, selectedColorById, inset);

  if (inset.label.trim()) {
    appendMapLabel(panelGroup, {
      x: frame.x + 14,
      y: frame.y + 22,
      text: inset.label.trim(),
      anchor: "start",
      fill: state.borderColor,
    });
  }

  if (sourceFrame) {
    renderInsetConnectors(layer, frame, sourceFrame);
  }
}

function renderInsetMapContent(insetGroup, mainProjection, frame, sourceFrame, selectedColorById, inset) {
  if (!sourceFrame) {
    const insetProjection = buildInsetProjection(frame, inset);
    const insetAtlasDataset = getAtlasDataset(Math.max(state.viewZoom * 2.4, 10), true);
    const selectedIds = new Set(state.selected.map((country) => country.id));
    const insetBorderGeometry = buildBorderGeometry(insetAtlasDataset, selectedIds);
    renderAtlasLayer(insetGroup, insetProjection, insetAtlasDataset, selectedColorById, insetBorderGeometry, {
      wrap: false,
      clipRect: frame,
      clipPadding: INSET_RENDER_CLIP_PADDING,
    });
    return;
  }

  const scale = Math.min(frame.width / sourceFrame.width, frame.height / sourceFrame.height);
  const offsetX = frame.x + (frame.width - sourceFrame.width * scale) / 2;
  const offsetY = frame.y + (frame.height - sourceFrame.height * scale) / 2;
  const transformedGroup = insetGroup
    .append("g")
    .attr(
      "transform",
      `translate(${offsetX - sourceFrame.x * scale} ${offsetY - sourceFrame.y * scale}) scale(${scale})`,
    );
  const insetAtlasDataset = getAtlasDataset(Math.max(state.viewZoom * scale * 2.2, 6), true);
  const selectedIds = new Set(state.selected.map((country) => country.id));
  const insetBorderGeometry = buildBorderGeometry(insetAtlasDataset, selectedIds);
  renderAtlasLayer(transformedGroup, mainProjection, insetAtlasDataset, selectedColorById, insetBorderGeometry, {
    wrap: false,
    clipRect: sourceFrame,
    clipPadding: INSET_RENDER_CLIP_PADDING,
  });
}

function buildInsetProjection(frame, inset) {
  const projection = buildBaseProjection();
  const target = buildInsetFocusGeometry(inset) ?? { type: "MultiPoint", coordinates: inset.focusPoints };
  projection.fitExtent(
    [
      [frame.x + 10, frame.y + 10],
      [frame.x + frame.width - 10, frame.y + frame.height - 10],
    ],
    target,
  );
  return projection;
}

function buildInsetFocusGeometry(inset) {
  const features = [];
  const outline = getInsetOutline(inset);
  if (outline.length >= 4) {
    features.push({
      type: "Polygon",
      coordinates: [outline],
    });
  }

  const focusPoints = getInsetFocusPoints(inset);
  if (focusPoints.length) {
    features.push({
      type: "MultiPoint",
      coordinates: focusPoints,
    });
  }

  if (!features.length) {
    const bounds = getInsetGeoBounds(inset);
    if (!bounds) {
      return null;
    }
    const { west, east, south, north } = bounds;
    features.push(
      {
        type: "MultiPoint",
        coordinates: [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [(west + east) / 2, (south + north) / 2],
        ],
      },
      {
        type: "Polygon",
        coordinates: [[
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ]],
      },
    );
  }

  return { type: "FeatureCollection", features };
}

function buildInsetSourceFrame(mainProjection, inset, panelFrame = null) {
  const projectedBounds = buildInsetProjectedBounds(mainProjection, inset);
  if (!projectedBounds) {
    return null;
  }

  const padding = clamp(Math.round(Math.min(projectedBounds.width, projectedBounds.height) * 0.12), 1, 10);
  const paddedBounds = padRect(projectedBounds, padding);
  const aspectFrame =
    panelFrame && panelFrame.width > 0 && panelFrame.height > 0
      ? expandRectToAspect(paddedBounds, panelFrame.width / panelFrame.height)
      : paddedBounds;

  return scaleRectFromCenter(aspectFrame, 1 / getInsetZoomScale(inset));
}

function renderInsetConnectors(layer, frame, sourceFrame) {
  const sourceCenter = {
    x: sourceFrame.x + sourceFrame.width / 2,
    y: sourceFrame.y + sourceFrame.height / 2,
  };
  const panelCenter = {
    x: frame.x + frame.width / 2,
    y: frame.y + frame.height / 2,
  };
  const sourceCorners = getFrameCorners(sourceFrame);
  const panelCorners = getFrameCorners(frame);
  const useHorizontal = Math.abs(panelCenter.x - sourceCenter.x) >= Math.abs(panelCenter.y - sourceCenter.y);
  let sourceAnchors;
  let panelAnchors;

  if (useHorizontal) {
    if (panelCenter.x >= sourceCenter.x) {
      sourceAnchors = [sourceCorners.topRight, sourceCorners.bottomRight];
      panelAnchors = [panelCorners.topLeft, panelCorners.bottomLeft];
    } else {
      sourceAnchors = [sourceCorners.topLeft, sourceCorners.bottomLeft];
      panelAnchors = [panelCorners.topRight, panelCorners.bottomRight];
    }
  } else if (panelCenter.y >= sourceCenter.y) {
    sourceAnchors = [sourceCorners.bottomLeft, sourceCorners.bottomRight];
    panelAnchors = [panelCorners.topLeft, panelCorners.topRight];
  } else {
    sourceAnchors = [sourceCorners.topLeft, sourceCorners.topRight];
    panelAnchors = [panelCorners.bottomLeft, panelCorners.bottomRight];
  }

  sourceAnchors.forEach((sourceAnchor, index) => {
    const panelAnchor = panelAnchors[index];
    layer
      .append("path")
      .attr("d", `M ${sourceAnchor.x} ${sourceAnchor.y} L ${panelAnchor.x} ${panelAnchor.y}`)
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("opacity", 0.76)
      .attr("vector-effect", "non-scaling-stroke");
  });
}

function buildInsetProjectedBounds(mainProjection, inset) {
  const outline = getInsetOutline(inset);
  const focusPoints = getInsetFocusPoints(inset);
  const bounds = getInsetGeoBounds(inset);
  const coordinateSet =
    outline.length >= 4 ? outline : focusPoints.length ? focusPoints : bounds ? buildInsetBoundsRing(bounds) : [];

  if (!coordinateSet.length) {
    return null;
  }

  const projectedPoints = getCompactProjectedPoints(mainProjection, coordinateSet);
  if (!projectedPoints.length) {
    return null;
  }

  return rectFromBounds(computeBounds(projectedPoints), 1, 1);
}

function rectFromBounds(bounds, minWidth = 1, minHeight = 1) {
  const width = Math.max(minWidth, bounds.maxX - bounds.minX);
  const height = Math.max(minHeight, bounds.maxY - bounds.minY);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

function padRect(rect, padding) {
  const safePadding = Math.max(0, Number(padding) || 0);
  return {
    x: rect.x - safePadding,
    y: rect.y - safePadding,
    width: rect.width + safePadding * 2,
    height: rect.height + safePadding * 2,
  };
}

function expandRectToAspect(rect, aspectRatio) {
  const safeAspect = Math.max(0.05, Number(aspectRatio) || 1);
  const currentAspect = rect.width / Math.max(rect.height, 1);
  if (Math.abs(currentAspect - safeAspect) < 0.0001) {
    return rect;
  }

  if (currentAspect < safeAspect) {
    const width = Math.max(1, rect.height * safeAspect);
    return {
      x: rect.x + rect.width / 2 - width / 2,
      y: rect.y,
      width,
      height: rect.height,
    };
  }

  const height = Math.max(1, rect.width / safeAspect);
  return {
    x: rect.x,
    y: rect.y + rect.height / 2 - height / 2,
    width: rect.width,
    height,
  };
}

function normalizeInsetFrame(inset) {
  const defaultSize = getDefaultInsetPanelSize(getInsetAspectRatio(inset));
  const preferredWidth =
    Number.isFinite(Number(inset.panelWidth)) && Number(inset.panelWidth) > 0
      ? Number(inset.panelWidth)
      : defaultSize.width;
  const preferredHeight =
    Number.isFinite(Number(inset.panelHeight)) && Number(inset.panelHeight) > 0
      ? Number(inset.panelHeight)
      : defaultSize.height;
  const { width, height } = normalizeInsetPanelSize(
    preferredWidth,
    preferredHeight,
    Math.min(MAX_INSET_PANEL_WIDTH, state.width),
    state.height,
  );
  const x = clamp(inset.panelX, 0, Math.max(0, state.width - width));
  const y = clamp(inset.panelY, 0, Math.max(0, state.height - height));

  inset.panelWidth = width;
  inset.panelHeight = height;
  inset.panelX = x;
  inset.panelY = y;

  return { x, y, width, height };
}

function getInsetZoomScale(inset) {
  const zoomScale = Number(inset?.zoomScale);
  const normalized = Number.isFinite(zoomScale) ? zoomScale : 1;
  inset.zoomScale = clamp(normalized, MIN_INSET_ZOOM_SCALE, MAX_INSET_ZOOM_SCALE);
  return inset.zoomScale;
}

function scaleRectFromCenter(rect, factor) {
  const normalizedFactor = Math.max(0.05, Number(factor) || 1);
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const width = Math.max(1, rect.width * normalizedFactor);
  const height = Math.max(1, rect.height * normalizedFactor);
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

function getInsetAspectRatio(inset) {
  const storedRatio = Number(inset?.aspectRatio);
  if (Number.isFinite(storedRatio) && storedRatio > 0) {
    return clamp(storedRatio, 0.35, 3.8);
  }

  const width = Number(inset?.panelWidth);
  const height = Number(inset?.panelHeight);
  if (Number.isFinite(width) && Number.isFinite(height) && height > 0) {
    return clamp(width / height, 0.35, 3.8);
  }

  return 1;
}

function normalizeInsetPanelSize(preferredWidth, preferredHeight, maxWidth, maxHeight) {
  const constrainedMaxWidth = Math.max(MIN_INSET_PANEL_WIDTH, Number(maxWidth) || MIN_INSET_PANEL_WIDTH);
  const constrainedMaxHeight = Math.max(MIN_INSET_PANEL_HEIGHT, Number(maxHeight) || MIN_INSET_PANEL_HEIGHT);
  return {
    width: clamp(Math.round(Number(preferredWidth) || MIN_INSET_PANEL_WIDTH), MIN_INSET_PANEL_WIDTH, constrainedMaxWidth),
    height: clamp(
      Math.round(Number(preferredHeight) || MIN_INSET_PANEL_HEIGHT),
      MIN_INSET_PANEL_HEIGHT,
      constrainedMaxHeight,
    ),
  };
}

function setInsetPanelSizeFromWidth(inset, preferredWidth) {
  const defaultSize = getDefaultInsetPanelSize(getInsetAspectRatio(inset));
  const size = normalizeInsetPanelSize(
    preferredWidth,
    inset.panelHeight ?? defaultSize.height,
    Math.min(MAX_INSET_PANEL_WIDTH, Math.max(MIN_INSET_PANEL_WIDTH, state.width - inset.panelX)),
    Math.max(MIN_INSET_PANEL_HEIGHT, state.height - inset.panelY),
  );
  inset.panelWidth = size.width;
  inset.panelHeight = size.height;
  inset.panelX = clamp(inset.panelX, 0, Math.max(0, state.width - size.width));
  inset.panelY = clamp(inset.panelY, 0, Math.max(0, state.height - size.height));
  return size;
}

function setInsetPanelSizeFromHeight(inset, preferredHeight) {
  const defaultSize = getDefaultInsetPanelSize(getInsetAspectRatio(inset));
  const size = normalizeInsetPanelSize(
    inset.panelWidth ?? defaultSize.width,
    preferredHeight,
    Math.min(MAX_INSET_PANEL_WIDTH, Math.max(MIN_INSET_PANEL_WIDTH, state.width - inset.panelX)),
    Math.max(MIN_INSET_PANEL_HEIGHT, state.height - inset.panelY),
  );
  inset.panelWidth = size.width;
  inset.panelHeight = size.height;
  inset.panelX = clamp(inset.panelX, 0, Math.max(0, state.width - size.width));
  inset.panelY = clamp(inset.panelY, 0, Math.max(0, state.height - size.height));
  return size;
}

function buildInsetResizeFrame(inset, startFrame, deltaX, deltaY) {
  const { width, height } = normalizeInsetPanelSize(
    startFrame.width + deltaX,
    startFrame.height + deltaY,
    Math.min(MAX_INSET_PANEL_WIDTH, state.width - startFrame.x),
    state.height - startFrame.y,
  );
  return {
    x: startFrame.x,
    y: startFrame.y,
    width,
    height,
  };
}

function getFrameCorners(frame) {
  return {
    topLeft: { x: frame.x, y: frame.y },
    topRight: { x: frame.x + frame.width, y: frame.y },
    bottomRight: { x: frame.x + frame.width, y: frame.y + frame.height },
    bottomLeft: { x: frame.x, y: frame.y + frame.height },
  };
}

function renderDashedFrame(container, frame, options = {}) {
  const group = container.append("g").attr("class", "dashed-frame");
  const stroke = options.stroke ?? state.borderColor;
  const strokeWidth = options.strokeWidth ?? OUTLINE_STROKE_WIDTH;
  const dasharray = options.dasharray ?? "4.5pt 3.2pt";
  const opacity = options.opacity ?? 1;
  const corners = getFrameCorners(frame);
  const edges = [
    [corners.topLeft, corners.topRight],
    [corners.topRight, corners.bottomRight],
    [corners.bottomRight, corners.bottomLeft],
    [corners.bottomLeft, corners.topLeft],
  ];

  edges.forEach(([start, end]) => {
    group
      .append("path")
      .attr("d", `M ${start.x} ${start.y} L ${end.x} ${end.y}`)
      .attr("fill", "none")
      .attr("stroke", stroke)
      .attr("stroke-width", strokeWidth)
      .attr("stroke-dasharray", dasharray)
      .attr("stroke-linecap", "butt")
      .attr("opacity", opacity)
      .attr("vector-effect", "non-scaling-stroke");
  });
}

function computeBounds(points) {
  return points.reduce(
    (accumulator, point) => ({
      minX: Math.min(accumulator.minX, point.x),
      minY: Math.min(accumulator.minY, point.y),
      maxX: Math.max(accumulator.maxX, point.x),
      maxY: Math.max(accumulator.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

function getInsetGeoBounds(inset) {
  if (inset.geoBounds) {
    return inset.geoBounds;
  }

  if (!Array.isArray(inset.focusPoints) || inset.focusPoints.length < 2) {
    return null;
  }

  return computeGeoBounds(inset.focusPoints);
}

function getInsetOutline(inset) {
  if (!Array.isArray(inset?.outline)) {
    return [];
  }

  const coordinates = inset.outline
    .filter(isFiniteCoordinate)
    .map(([longitude, latitude]) => [Number(longitude), clamp(Number(latitude), -90, 90)]);
  if (coordinates.length < 3) {
    return [];
  }

  return closeCoordinateRing(unwrapLongitudeCoordinates(coordinates));
}

function getInsetFocusPoints(inset) {
  if (!Array.isArray(inset?.focusPoints)) {
    return [];
  }

  const coordinates = inset.focusPoints
    .filter(isFiniteCoordinate)
    .map(([longitude, latitude]) => [Number(longitude), clamp(Number(latitude), -90, 90)]);
  return coordinates.length ? unwrapLongitudeCoordinates(coordinates) : [];
}

function buildInsetBoundsRing(bounds) {
  return [
    [bounds.west, bounds.south],
    [bounds.east, bounds.south],
    [bounds.east, bounds.north],
    [bounds.west, bounds.north],
    [bounds.west, bounds.south],
  ];
}

function renderScaleBar(root, projection, padding) {
  const spec = buildScaleBarSpec(projection, padding);
  if (!spec) {
    return;
  }

  const group = root.append("g").attr("class", "scale-bar");
  const y = spec.y;
  const x = spec.x;
  const rightX = x + spec.lengthPx;

  group
    .append("path")
    .attr("d", `M ${x} ${y} L ${rightX} ${y}`)
    .attr("fill", "none")
    .attr("stroke", state.borderColor)
    .attr("stroke-width", OUTLINE_STROKE_WIDTH)
    .attr("vector-effect", "non-scaling-stroke");

  group
    .append("path")
    .attr("d", `M ${x} ${y - 8} L ${x} ${y + 1} M ${rightX} ${y - 8} L ${rightX} ${y + 1}`)
    .attr("fill", "none")
    .attr("stroke", state.borderColor)
    .attr("stroke-width", OUTLINE_STROKE_WIDTH)
    .attr("vector-effect", "non-scaling-stroke");

  appendMapLabel(group, {
    x,
    y: y - 12,
    text: "0",
    anchor: "middle",
    fill: state.borderColor,
  });
  appendMapLabel(group, {
    x: rightX,
    y: y - 12,
    text: formatScaleDistance(spec.distanceKm),
    anchor: "middle",
    fill: state.borderColor,
  });
}

function buildScaleBarSpec(projection, padding) {
  const maxUsablePx = Math.max(60, state.width - padding * 2 - 70);
  const targetPx = clamp(state.width * 0.15, 60, Math.min(220, maxUsablePx));
  const x = clamp(padding + 28, 14, Math.max(14, state.width - padding - targetPx - 20));
  const yCandidates = [
    state.height - padding - 28,
    state.height - padding - 48,
    state.height - padding - 68,
  ];

  for (const y of yCandidates) {
    const start = projection.invert([x, y]);
    const end = projection.invert([x + targetPx, y]);
    if (!isFiniteCoordinate(start) || !isFiniteCoordinate(end)) {
      continue;
    }

    const rawDistanceKm = d3.geoDistance(start, end) * EARTH_RADIUS_KM;
    if (!Number.isFinite(rawDistanceKm) || rawDistanceKm <= 0) {
      continue;
    }

    const niceDistanceKm = pickNiceDistanceKm(rawDistanceKm);
    if (!niceDistanceKm) {
      continue;
    }

    return {
      x,
      y,
      lengthPx: targetPx * (niceDistanceKm / rawDistanceKm),
      distanceKm: niceDistanceKm,
    };
  }

  return null;
}

function pickNiceDistanceKm(maxDistanceKm) {
  const magnitude = 10 ** Math.floor(Math.log10(maxDistanceKm));
  const candidates = [1, 2, 5].flatMap((base) => [
    base * magnitude * 0.1,
    base * magnitude,
    base * magnitude * 10,
  ]);
  const filtered = candidates.filter((candidate) => candidate > 0 && candidate <= maxDistanceKm);
  return filtered.length ? Math.max(...filtered) : null;
}

function appendMapLabel(group, { x, y, text, anchor = "start", fill = "#000000", opacity = 1 }) {
  const labelGroup = group
    .append("g")
    .attr("class", "map-output-text")
    .attr("transform", `translate(${x} ${y}) scale(${MAP_FONT_STRETCH_X} 1)`)
    .attr("opacity", opacity);

  labelGroup
    .append("text")
    .attr("x", 0)
    .attr("y", 0)
    .attr("text-anchor", anchor)
    .attr("dominant-baseline", "alphabetic")
    .attr("fill", fill)
    .attr("font-family", MAP_FONT_FAMILY)
    .attr("font-size", `${state.mapFontSizePt}pt`)
    .attr("paint-order", "stroke fill")
    .attr("stroke", "rgba(255,255,255,0.92)")
    .attr("stroke-width", getMapLabelStrokeWidth())
    .attr("stroke-linejoin", "round")
    .text(text);
}

function getMapLabelStrokeWidth() {
  return `${Math.max(1.4, state.mapFontSizePt * 0.22)}px`;
}

function updateSelectionSummary() {
  const parts = [];
  const currentSelection = getCurrentSelectionEntries();

  if (currentSelection.length) {
    parts.push(`${currentSelection.length}개 ${state.mapVersion === "world" ? "국가" : "권역"}`);
  } else {
    parts.push(state.mapVersion === "world" ? "국가 선택 없음" : "권역 선택 없음");
  }

  if (state.mapVersion === "world" && state.markers.length) {
    parts.push(`마커 ${state.markers.length}개`);
  }

  if (state.mapVersion === "world" && state.insets.length) {
    parts.push(`인셋 ${state.insets.length}개`);
  }

  if (state.mapVersion === "korea") {
    parts.push(koreaRegionLevelLabels[state.koreaLevel]);
    if (isKoreaCompareModeActive()) {
      parts.push(`비교 ${getCurrentKoreaComparedIds().length}개`);
    } else if (state.koreaLevel === "cities") {
      parts.push(hasKoreaCityScopeFilter() ? getKoreaCityScopeLabel(state.koreaCityScopeCodes, { maxNames: 2 }) : "전국");
    } else if (koreaLevelRequiresParent(state.koreaLevel) && state.koreaParentCode) {
      parts.push(getKoreaProvinceName(state.koreaParentCode));
    }
  }

  elements.selectionSummary.textContent = parts.join(" · ");
}

function updateExportMeta() {
  if (state.mapVersion === "korea") {
    const scaleText = state.showScaleBar ? "축척 포함" : "축척 없음";
    const borderText =
      state.borderMode === "none" ? "경계선 없음" : state.borderMode === "dashed" ? "경계선 점선" : "경계선 실선";
    const activeRouteNames = getActiveKoreaRoutes().map((route) => route.name);
    const activeWaterwayNames = getActiveKoreaWaterways().map((waterway) => waterway.name);
    const activeOverlayNames = [...activeRouteNames, ...activeWaterwayNames];
    const scopeText =
      isKoreaCompareModeActive()
        ? `비교 ${getCurrentKoreaComparedIds().length}개`
        : state.koreaLevel === "cities"
          ? hasKoreaCityScopeFilter()
            ? `범위 ${getKoreaCityScopeLabel(state.koreaCityScopeCodes, { maxNames: 2 })}`
            : "범위 전국"
        : koreaLevelRequiresParent(state.koreaLevel) && state.koreaParentCode
        ? `범위 ${getKoreaProvinceName(state.koreaParentCode)}`
        : "범위 전국";
    elements.exportMeta.textContent =
      `${state.width} × ${state.height} px · 대한민국 · ${koreaRegionLevelLabels[state.koreaLevel]} · ` +
      `${scopeText} · ${formatPointSize(state.mapFontSizePt)} · ${scaleText} · ${borderText}` +
      (activeOverlayNames.length ? ` · 오버레이 ${activeOverlayNames.length}개` : "") +
      " · 윤곽선 0.4pt";
    return;
  }

  const scaleText = state.showScaleBar ? "축척 포함" : "축척 없음";
  const borderText =
    state.borderMode === "none" ? "국경선 없음" : state.borderMode === "dashed" ? "국경선 점선" : "국경선 실선";
  const detailModeText =
    state.coastlineDetail === "performance"
      ? "성능 우선"
      : state.coastlineDetail === "detailed"
        ? "선명하게"
        : state.coastlineDetail === "max"
          ? "최대"
          : "자동";
  const detailText = getAtlasLevelForZoom(state.viewZoom).replace("m", "m 디테일");
  elements.exportMeta.textContent =
    `${state.width} × ${state.height} px · ${projectionModeLabels[state.projectionMode]} · ` +
    `중심 ${formatLongitude(state.centerLongitude)} · 보기 ${Math.round(state.viewZoom * 100)}% · ` +
    `${formatPointSize(state.mapFontSizePt)} · ${scaleText} · ${borderText} · ${detailModeText} · ${detailText} · 윤곽선 0.4pt`;
}

function exportCurrentSvg() {
  if (!previewTransformIsIdentity()) {
    commitPreviewInteraction();
  }

  if (!currentSvgNode) {
    setStatus("내보낼 지도를 아직 그리지 못했습니다.", true);
    return;
  }

  const serializer = new XMLSerializer();
  const exportNode = buildExportSvgNode();
  const serialized = serializer.serializeToString(exportNode);
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
  const blob = new Blob([svgContent], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildDownloadName();
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus("SVG 파일을 내보냈습니다.");
}

function buildExportSvgNode() {
  const exportNode = currentSvgNode.cloneNode(true);
  const defs = ensureDefsElement(exportNode);
  const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleElement.textContent = buildSvgFontStyle();
  defs.insertBefore(styleElement, defs.firstChild);
  return exportNode;
}

function ensureDefsElement(svgNode) {
  const existingDefs = svgNode.querySelector("defs");
  if (existingDefs) {
    return existingDefs;
  }

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  svgNode.insertBefore(defs, svgNode.firstChild);
  return defs;
}

function buildSvgFontStyle() {
  const fontSrc = embeddedMapFontDataUrl || "./fonts/SidaeAi_S-Regular.otf";
  return [
    `@font-face { font-family: '${MAP_FONT_FAMILY}'; src: url("${fontSrc}") format('opentype'); }`,
    `.map-output-text { font-family: '${MAP_FONT_FAMILY}'; }`,
  ].join("\n");
}

function buildDownloadName() {
  if (state.mapVersion === "korea") {
    const currentSelection = getCurrentSelectionEntries();
    const prefix = currentSelection.length
      ? currentSelection
          .slice(0, 4)
          .map((region) => region.id)
          .join("-")
      : state.koreaLevel;
    return `korea-map-${prefix || "selection"}-${state.koreaLevel}.svg`;
  }

  const prefix = state.selected.length
    ? state.selected
        .slice(0, 4)
        .map((country) =>
          country.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
        )
        .filter(Boolean)
        .join("-")
    : "world";

  return `country-map-${prefix || "selection"}-${state.projectionMode}.svg`;
}

function mountPreviewCanvas() {
  if (!currentSvgNode) {
    return;
  }

  const maxWidth = Math.max(260, elements.previewStage.clientWidth - 28);
  const maxHeight = Math.max(260, elements.previewStage.clientHeight - 28);
  // Preview can scale up independently from the export canvas so small outputs remain easy to edit.
  currentPreviewScale = Math.max(1, Math.min(maxWidth / state.width, maxHeight / state.height));

  const canvasShell = document.createElement("div");
  canvasShell.className = `canvas-shell mode-${getActiveViewMode()}`;
  canvasShell.style.width = `${Math.round(state.width * currentPreviewScale)}px`;
  canvasShell.style.height = `${Math.round(state.height * currentPreviewScale)}px`;
  canvasShell.style.backgroundColor = state.oceanColor;
  canvasShell.addEventListener("pointerdown", handleCanvasPointerDown);
  canvasShell.addEventListener("wheel", handleCanvasWheel, { passive: false });
  canvasShell.addEventListener("gesturestart", handleCanvasGestureStart);
  canvasShell.addEventListener("gesturechange", handleCanvasGestureChange);
  canvasShell.addEventListener("gestureend", handleCanvasGestureEnd);

  const surface = document.createElement("div");
  surface.className = "canvas-surface";
  surface.style.backgroundColor = state.oceanColor;
  surface.append(currentSvgNode);

  const editorLayer = document.createElement("div");
  editorLayer.className = "editor-layer";
  surface.append(editorLayer);

  canvasShell.append(surface);
  currentCanvasSurface = surface;

  const overlay = document.createElement("div");
  overlay.className = "interaction-overlay";
  canvasShell.append(overlay);

  const resizeHandle = document.createElement("button");
  resizeHandle.type = "button";
  resizeHandle.className = "resize-handle";
  resizeHandle.title = "드래그해 지도 비율 조절";
  resizeHandle.addEventListener("pointerdown", startArtboardResize);
  canvasShell.append(resizeHandle);

  mountAnnotationEditors(editorLayer, canvasShell);
  elements.previewStage.replaceChildren(canvasShell);
  elements.previewStage.style.backgroundColor = state.oceanColor;
}

function mountAnnotationEditors(editorLayer, shell) {
  editorLayer.replaceChildren();

  state.insets.forEach((inset) => {
    mountInsetEditor(editorLayer, shell, inset);
  });

  state.markers.forEach((marker) => {
    mountMarkerEditor(editorLayer, shell, marker);
  });
}

function mountInsetEditor(editorLayer, shell, inset) {
  const frame = normalizeInsetFrame(inset);
  const editor = document.createElement("div");
  editor.className = "annotation-editor inset-editor";

  const tag = document.createElement("span");
  tag.className = "annotation-editor__tag";
  tag.textContent = inset.label || "Inset";
  editor.appendChild(tag);

  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "annotation-editor__handle";
  handle.setAttribute("aria-label", "인셋 크기 조절");
  editor.appendChild(handle);

  positionEditorFrame(editor, frame);

  editor.addEventListener("pointerdown", (event) => {
    if (event.target === handle) {
      return;
    }
    startInsetEditorDrag(event, shell, inset, editor);
  });

  handle.addEventListener("pointerdown", (event) => {
    startInsetEditorResize(event, shell, inset, editor);
  });

  editorLayer.appendChild(editor);
}

function mountMarkerEditor(editorLayer, shell, marker) {
  const point = projectCoordinate(currentRenderContext.projection, [marker.lon, marker.lat]);
  if (!point || !isPointNearViewport(point, 120)) {
    return;
  }

  const editor = document.createElement("div");
  editor.className = `annotation-editor marker-editor marker-editor--${marker.style}`;

  const tag = document.createElement("span");
  tag.className = "annotation-editor__tag";
  tag.textContent = marker.label || markerStyleLabel(marker.style);
  editor.appendChild(tag);

  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "annotation-editor__handle";
  handle.setAttribute("aria-label", "마커 크기 조절");
  editor.appendChild(handle);

  positionEditorFrame(editor, buildMarkerEditorFrame(point, marker));

  editor.addEventListener("pointerdown", (event) => {
    if (event.target === handle) {
      return;
    }
    startMarkerEditorDrag(event, shell, marker, editor);
  });

  handle.addEventListener("pointerdown", (event) => {
    startMarkerEditorResize(event, shell, marker, editor);
  });

  editorLayer.appendChild(editor);
}

function startInsetEditorDrag(event, shell, inset, editor) {
  event.preventDefault();
  event.stopPropagation();
  if (!previewTransformIsIdentity()) {
    commitPreviewInteraction();
  }

  const startX = event.clientX;
  const startY = event.clientY;
  const startFrame = normalizeInsetFrame(inset);

  const onPointerMove = (moveEvent) => {
    const deltaX = (moveEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaY = (moveEvent.clientY - startY) / (currentPreviewScale || 1);
    const nextFrame = {
      x: clamp(startFrame.x + deltaX, 0, Math.max(0, state.width - startFrame.width)),
      y: clamp(startFrame.y + deltaY, 0, Math.max(0, state.height - startFrame.height)),
      width: startFrame.width,
      height: startFrame.height,
    };
    positionEditorFrame(editor, nextFrame);
  };

  const stop = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);

    const deltaX = (upEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaY = (upEvent.clientY - startY) / (currentPreviewScale || 1);
    beginHistoryStep("인셋 위치 변경");
    inset.panelX = clamp(startFrame.x + deltaX, 0, Math.max(0, state.width - startFrame.width));
    inset.panelY = clamp(startFrame.y + deltaY, 0, Math.max(0, state.height - startFrame.height));
    renderAnnotations();
    renderMap();
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function startInsetEditorResize(event, shell, inset, editor) {
  event.preventDefault();
  event.stopPropagation();
  if (!previewTransformIsIdentity()) {
    commitPreviewInteraction();
  }

  const startX = event.clientX;
  const startY = event.clientY;
  const startFrame = normalizeInsetFrame(inset);

  const onPointerMove = (moveEvent) => {
    const deltaX = (moveEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaY = (moveEvent.clientY - startY) / (currentPreviewScale || 1);
    const nextFrame = buildInsetResizeFrame(inset, startFrame, deltaX, deltaY);
    positionEditorFrame(editor, nextFrame);
  };

  const stop = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);

    const deltaX = (upEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaY = (upEvent.clientY - startY) / (currentPreviewScale || 1);
    const nextFrame = buildInsetResizeFrame(inset, startFrame, deltaX, deltaY);
    beginHistoryStep("인셋 크기 변경");
    inset.panelWidth = nextFrame.width;
    inset.panelHeight = nextFrame.height;
    renderAnnotations();
    renderMap();
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function startMarkerEditorDrag(event, shell, marker, editor) {
  event.preventDefault();
  event.stopPropagation();
  if (!previewTransformIsIdentity()) {
    commitPreviewInteraction();
  }

  const onPointerMove = (moveEvent) => {
    const point = getCanvasPointFromEvent(moveEvent, shell);
    if (!point) {
      return;
    }
    positionEditorFrame(editor, buildMarkerEditorFrame(point, marker));
  };

  const stop = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);

    const point = getCanvasPointFromEvent(upEvent, shell);
    const coordinate = point ? invertCanvasPoint(point) : null;
    if (coordinate) {
      beginHistoryStep("마커 위치 변경");
      marker.lon = coordinate[0];
      marker.lat = coordinate[1];
    }
    renderAnnotations();
    renderMap();
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function startMarkerEditorResize(event, shell, marker, editor) {
  event.preventDefault();
  event.stopPropagation();
  if (!previewTransformIsIdentity()) {
    commitPreviewInteraction();
  }

  const startX = event.clientX;
  const startY = event.clientY;
  const startSize = marker.size;
  const startAspect = marker.aspect;
  const startPoint = projectCoordinate(currentRenderContext.projection, [marker.lon, marker.lat]);
  if (!startPoint) {
    return;
  }

  const onPointerMove = (moveEvent) => {
    const deltaX = (moveEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaY = (moveEvent.clientY - startY) / (currentPreviewScale || 1);

    if (marker.style === "dashedOval") {
      const width = clamp(startSize * 2 + deltaX * 2, 18, 320);
      const height = clamp(startSize * startAspect * 2 + deltaY * 2, 14, 320);
      const previewMarker = {
        ...marker,
        size: width / 2,
        aspect: clamp(height / Math.max(width, 1), 0.2, 3),
      };
      positionEditorFrame(editor, buildMarkerEditorFrame(startPoint, previewMarker));
      return;
    }

    const nextSize = clamp(startSize + Math.max(deltaX, deltaY) / 2, 4, 180);
    positionEditorFrame(editor, buildMarkerEditorFrame(startPoint, { ...marker, size: nextSize }));
  };

  const stop = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);

    const deltaX = (upEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaY = (upEvent.clientY - startY) / (currentPreviewScale || 1);
    beginHistoryStep("마커 크기 변경");
    if (marker.style === "dashedOval") {
      const width = clamp(startSize * 2 + deltaX * 2, 18, 320);
      const height = clamp(startSize * startAspect * 2 + deltaY * 2, 14, 320);
      marker.size = width / 2;
      marker.aspect = clamp(height / Math.max(width, 1), 0.2, 3);
    } else {
      marker.size = clamp(startSize + Math.max(deltaX, deltaY) / 2, 4, 180);
    }
    renderAnnotations();
    renderMap();
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function positionEditorFrame(editor, frame) {
  editor.style.left = `${frame.x * currentPreviewScale}px`;
  editor.style.top = `${frame.y * currentPreviewScale}px`;
  editor.style.width = `${frame.width * currentPreviewScale}px`;
  editor.style.height = `${frame.height * currentPreviewScale}px`;
}

function buildMarkerEditorFrame(point, marker) {
  const padding = 12;
  const radiusX = marker.style === "dashedOval" ? Math.max(9, marker.size) : getMarkerVisualRadius(marker);
  const radiusY = marker.style === "dashedOval" ? Math.max(7, marker.size * marker.aspect) : getMarkerVisualRadius(marker);
  return {
    x: point.x - radiusX - padding,
    y: point.y - radiusY - padding,
    width: radiusX * 2 + padding * 2,
    height: radiusY * 2 + padding * 2,
  };
}

function getMarkerVisualRadius(marker) {
  if (marker.style === "ring") {
    return Math.max(7, marker.size);
  }
  if (marker.style === "point") {
    return Math.max(4.5, marker.size * 0.62);
  }
  if (marker.style === "filledDot") {
    return Math.max(2.8, marker.size);
  }
  return Math.max(9, marker.size);
}

function handleCanvasWheel(event) {
  if (!currentRenderContext || state.mapVersion !== "world") {
    return;
  }

  event.preventDefault();
  const point = getCanvasPointFromEvent(event, event.currentTarget);
  if (!point) {
    return;
  }

  const desiredFactor = Math.pow(2, -event.deltaY / 320);
  const actualFactor = clampPreviewScaleFactor(desiredFactor);
  updatePreviewInteraction(actualFactor, point);
  queuePreviewCommit();
}

function handleCanvasGestureStart(event) {
  if (state.mapVersion !== "world") {
    return;
  }

  activeGestureScale = event.scale || 1;
  event.preventDefault();
}

function handleCanvasGestureChange(event) {
  if (!currentRenderContext || state.mapVersion !== "world") {
    return;
  }

  event.preventDefault();
  const point = getCanvasPointFromEvent(event, event.currentTarget) ?? {
    x: state.width / 2,
    y: state.height / 2,
  };
  const nextScale = event.scale || 1;
  const factor = clampPreviewScaleFactor(nextScale / (activeGestureScale || 1));
  activeGestureScale = nextScale;
  updatePreviewInteraction(factor, point);
  queuePreviewCommit();
}

function handleCanvasGestureEnd(event) {
  if (state.mapVersion !== "world") {
    return;
  }

  activeGestureScale = 1;
  event.preventDefault();
}

function clampPreviewScaleFactor(desiredFactor) {
  const absoluteZoom = state.viewZoom * previewInteraction.scale * desiredFactor;
  const clampedZoom = clampViewZoom(absoluteZoom);
  const currentAbsoluteZoom = state.viewZoom * previewInteraction.scale;
  return clampedZoom / currentAbsoluteZoom;
}

function updatePreviewInteraction(scaleFactor, pivotPoint) {
  previewInteraction.scale *= scaleFactor;
  previewInteraction.translateX = scaleFactor * previewInteraction.translateX + (1 - scaleFactor) * pivotPoint.x;
  previewInteraction.translateY = scaleFactor * previewInteraction.translateY + (1 - scaleFactor) * pivotPoint.y;
  applyPreviewInteraction();
}

function applyPreviewInteraction() {
  if (!currentCanvasSurface) {
    return;
  }

  currentCanvasSurface.style.transform = [
    `translate(${previewInteraction.translateX * currentPreviewScale}px, ${previewInteraction.translateY * currentPreviewScale}px)`,
    `scale(${previewInteraction.scale})`,
  ].join(" ");
  updateWorkspaceStats();
}

function queuePreviewCommit() {
  if (previewInteraction.commitTimer) {
    window.clearTimeout(previewInteraction.commitTimer);
  }

  previewInteraction.commitTimer = window.setTimeout(() => {
    commitPreviewInteraction();
  }, 120);
}

function commitPreviewInteraction() {
  if (state.mapVersion !== "world") {
    resetPreviewInteractionState();
    return;
  }

  if (!currentRenderContext || previewTransformIsIdentity()) {
    resetPreviewInteractionState();
    return;
  }

  if (previewInteraction.commitTimer) {
    window.clearTimeout(previewInteraction.commitTimer);
    previewInteraction.commitTimer = null;
  }

  const oldZoom = state.viewZoom;
  const nextZoom = clampViewZoom(oldZoom * previewInteraction.scale);
  const actualScale = nextZoom / oldZoom;
  const baseTranslate = currentRenderContext.baseTranslate;

  beginHistoryStep("보기 이동");
  state.viewZoom = nextZoom;
  state.viewOffsetX =
    actualScale * state.viewOffsetX +
    previewInteraction.translateX +
    (actualScale - 1) * baseTranslate[0];
  state.viewOffsetY =
    actualScale * state.viewOffsetY +
    previewInteraction.translateY +
    (actualScale - 1) * baseTranslate[1];

  resetPreviewInteractionState();
  renderMap();
}

function resetPreviewInteractionState() {
  if (previewInteraction.commitTimer) {
    window.clearTimeout(previewInteraction.commitTimer);
    previewInteraction.commitTimer = null;
  }

  previewInteraction.scale = 1;
  previewInteraction.translateX = 0;
  previewInteraction.translateY = 0;

  if (currentCanvasSurface) {
    currentCanvasSurface.style.transform = "";
  }

  updateWorkspaceStats();
}

function previewTransformIsIdentity() {
  return (
    Math.abs(previewInteraction.scale - 1) < 0.0001 &&
    nearZero(previewInteraction.translateX) &&
    nearZero(previewInteraction.translateY)
  );
}

function startArtboardResize(event) {
  event.preventDefault();
  event.stopPropagation();

  const shell = event.currentTarget.parentElement;
  if (!shell) {
    return;
  }

  const startX = event.clientX;
  const startY = event.clientY;
  const startWidth = state.width;
  const startHeight = state.height;

  shell.classList.add("is-resizing");

  const onPointerMove = (moveEvent) => {
    const deltaWidth = (moveEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaHeight = (moveEvent.clientY - startY) / (currentPreviewScale || 1);
    const nextWidth = clampCanvasWidth(startWidth + deltaWidth, startWidth);
    const nextHeight = clampCanvasHeight(startHeight + deltaHeight, startHeight);

    shell.style.width = `${Math.round(nextWidth * currentPreviewScale)}px`;
    shell.style.height = `${Math.round(nextHeight * currentPreviewScale)}px`;
  };

  const stopResize = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopResize);
    window.removeEventListener("pointercancel", stopResize);
    shell.classList.remove("is-resizing");

    const deltaWidth = (upEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaHeight = (upEvent.clientY - startY) / (currentPreviewScale || 1);
    beginHistoryStep("캔버스 크기 변경");
    state.width = clampCanvasWidth(startWidth + deltaWidth, startWidth);
    state.height = clampCanvasHeight(startHeight + deltaHeight, startHeight);
    syncDimensionInputs();
    syncPresetButtons();
    renderMap();
    setStatus("미리보기 핸들로 캔버스 비율을 조절했습니다.");
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stopResize);
  window.addEventListener("pointercancel", stopResize);
}

function handleCanvasPointerDown(event) {
  if (event.button !== 0 || !currentRenderContext) {
    return;
  }

  if (state.mapVersion === "world" && !previewTransformIsIdentity()) {
    commitPreviewInteraction();
    return;
  }

  const shell = event.currentTarget;
  const startPoint = getCanvasPointFromEvent(event, shell);
  if (!startPoint) {
    return;
  }

  event.preventDefault();

  if (state.mapVersion === "korea") {
    startKoreaSelectionInteraction(shell, startPoint);
    return;
  }

  const activeMode = getActiveViewMode();

  if (activeMode === "pan") {
    startPanInteraction(startPoint);
    return;
  }

  if (activeMode === "marker") {
    startMarkerInteraction(shell, startPoint);
    return;
  }

  startBoxInteraction(shell, startPoint, activeMode === "inset" ? "inset" : "zoom");
}

function startKoreaSelectionInteraction(shell, startPoint) {
  let didMove = false;

  const onPointerMove = (moveEvent) => {
    const nextPoint = getCanvasPointFromEvent(moveEvent, shell);
    if (!nextPoint) {
      return;
    }
    didMove = didMove || Math.hypot(nextPoint.x - startPoint.x, nextPoint.y - startPoint.y) > 5;
  };

  const stop = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);

    if (didMove) {
      return;
    }

    const point = getCanvasPointFromEvent(upEvent, shell);
    if (!point) {
      return;
    }

    const toggled = toggleCountryAtCanvasPoint(point);
    if (!toggled) {
      setStatus("권역을 클릭하면 바로 켜고 끌 수 있습니다.");
    }
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function startPanInteraction(startPoint) {
  const startTranslateX = previewInteraction.translateX;
  const startTranslateY = previewInteraction.translateY;
  let didMove = false;

  const onPointerMove = (moveEvent) => {
    const nextPoint = getCanvasPointFromEvent(moveEvent, elements.previewStage.firstElementChild);
    if (!nextPoint) {
      return;
    }

    const deltaX = nextPoint.x - startPoint.x;
    const deltaY = nextPoint.y - startPoint.y;
    didMove = didMove || Math.hypot(deltaX, deltaY) > 3;
    previewInteraction.translateX = startTranslateX + deltaX;
    previewInteraction.translateY = startTranslateY + deltaY;
    applyPreviewInteraction();
  };

  const stopPan = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopPan);
    window.removeEventListener("pointercancel", stopPan);

    if (!didMove) {
      const point = getCanvasPointFromEvent(upEvent, elements.previewStage.firstElementChild);
      if (point) {
        toggleCountryAtCanvasPoint(point);
      }
      return;
    }

    commitPreviewInteraction();
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stopPan);
  window.addEventListener("pointercancel", stopPan);
}

function startMarkerInteraction(shell, startPoint) {
  const overlay = shell.querySelector(".interaction-overlay");
  const draft = document.createElement("div");
  draft.className = `marker-draft marker-draft--${state.markerDraftStyle}`;
  overlay.appendChild(draft);
  let latestPoint = startPoint;

  const stop = (upEvent) => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", cancel);
    draft.remove();

    const point = getCanvasPointFromEvent(upEvent, shell);
    if (!point) {
      return;
    }

    if (Math.hypot(point.x - startPoint.x, point.y - startPoint.y) <= 6) {
      addMarkerAtCanvasPoint(point);
      return;
    }

    addMarkerFromDrag(startPoint, latestPoint);
  };

  const handleMove = (moveEvent) => {
    const point = getCanvasPointFromEvent(moveEvent, shell);
    if (!point) {
      return;
    }

    latestPoint = point;
    updateMarkerDraft(draft, startPoint, point);
  };

  const cancel = () => {
    draft.remove();
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", cancel);
  };

  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", cancel);
}

function startBoxInteraction(shell, startPoint, mode) {
  const overlay = shell.querySelector(".interaction-overlay");
  const box = document.createElement("div");
  box.className = "selection-box";
  overlay.appendChild(box);

  const updateBox = (point) => {
    const rect = normalizeRect(startPoint, point);
    box.style.left = `${rect.x * currentPreviewScale}px`;
    box.style.top = `${rect.y * currentPreviewScale}px`;
    box.style.width = `${rect.width * currentPreviewScale}px`;
    box.style.height = `${rect.height * currentPreviewScale}px`;
    return rect;
  };

  updateBox(startPoint);

  const onPointerMove = (moveEvent) => {
    const point = getCanvasPointFromEvent(moveEvent, shell);
    if (!point) {
      return;
    }
    updateBox(point);
  };

  const stop = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    box.remove();

    const endPoint = getCanvasPointFromEvent(upEvent, shell);
    if (!endPoint) {
      return;
    }

    const rect = normalizeRect(startPoint, endPoint);
    const minimumDragSize = mode === "inset" ? MIN_INSET_DRAG_SIZE : MIN_ZOOM_DRAG_SIZE;
    if (rect.width < minimumDragSize || rect.height < minimumDragSize) {
      if (mode === "zoom") {
        const toggled = toggleCountryAtCanvasPoint(endPoint);
        if (!toggled) {
          setStatus("짧게 클릭하면 국가를 선택하고, 크게 드래그하면 그 영역으로 확대합니다.");
        }
        return;
      }

      setStatus("인셋 영역이 너무 작습니다. 조금 더 넓게 드래그해 주세요.", true);
      return;
    }

    if (mode === "zoom") {
      applyZoomToRect(rect);
      renderMap();
      setStatus("드래그한 영역으로 확대했습니다.");
      return;
    }

    addInsetFromRect(rect);
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function addMarkerAtCanvasPoint(point) {
  const coordinate = invertCanvasPoint(point);
  if (!coordinate) {
    setStatus("이 위치에는 마커를 둘 수 없습니다.", true);
    return;
  }

  beginHistoryStep("마커 추가");
  state.markers.push(createMarkerData(coordinate));
  renderAnnotations();
  renderMap();
  setStatus(`${markerStyleLabel(state.markerDraftStyle)} 마커를 추가했습니다.`);
}

function addMarkerFromDrag(startPoint, endPoint) {
  const rect = normalizeRect(startPoint, endPoint);
  const centerPoint = {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
  const coordinate = invertCanvasPoint(centerPoint);
  if (!coordinate) {
    setStatus("이 위치에는 마커를 둘 수 없습니다.", true);
    return;
  }

  const marker = createMarkerData(coordinate);
  if (state.markerDraftStyle === "dashedOval") {
    marker.size = clamp(rect.width / 2, 9, 180);
    marker.aspect = clamp(rect.height / Math.max(rect.width, 1), 0.2, 3);
  } else {
    marker.size = clamp(Math.max(rect.width, rect.height) / 2, 4, 180);
  }

  beginHistoryStep("마커 추가");
  state.markers.push(marker);
  renderAnnotations();
  renderMap();
  setStatus(`${markerStyleLabel(state.markerDraftStyle)} 마커를 드래그 크기로 추가했습니다.`);
}

function createMarkerData(coordinate) {
  const defaults = markerDefaults(state.markerDraftStyle);
  return {
    id: makeId("marker"),
    lon: coordinate[0],
    lat: coordinate[1],
    style: state.markerDraftStyle,
    label: defaults.label === "auto" ? nextAnnotationLabel("marker") : defaults.label,
    size: defaults.size,
    aspect: defaults.aspect,
    rotation: defaults.rotation,
    offsetX: defaults.offsetX,
    offsetY: defaults.offsetY,
  };
}

function updateMarkerDraft(draft, startPoint, endPoint) {
  const rect = normalizeRect(startPoint, endPoint);
  if (rect.width < 6 && rect.height < 6) {
    draft.style.opacity = "0";
    return;
  }

  draft.style.opacity = "1";
  draft.style.left = `${rect.x * currentPreviewScale}px`;
  draft.style.top = `${rect.y * currentPreviewScale}px`;
  draft.style.width = `${Math.max(14, rect.width) * currentPreviewScale}px`;
  draft.style.height = `${Math.max(14, rect.height) * currentPreviewScale}px`;
}

function addInsetFromRect(rect) {
  const sample = sampleGeoCollectionFromRect(rect);
  if (!sample || sample.focusPoints.length < 1) {
    setStatus("이 영역으로는 인셋을 만들기 어렵습니다. 조금 더 넓게 잡아 주세요.", true);
    return;
  }

  const aspectRatio = clamp(rect.width / Math.max(rect.height, 1), 0.35, 3.8);
  const frame = getDefaultInsetFrame(state.insets.length, aspectRatio);
  beginHistoryStep("인셋 추가");
  state.insets.push({
    id: makeId("inset"),
    label: nextAnnotationLabel("inset"),
    panelX: frame.x,
    panelY: frame.y,
    panelWidth: frame.width,
    panelHeight: frame.height,
    aspectRatio,
    zoomScale: 0.7,
    outline: sample.outline,
    focusPoints: sample.focusPoints,
    geoBounds: sample.geoBounds,
  });

  renderAnnotations();
  renderMap();
  setStatus("확대 인셋을 추가했습니다.");
}

function sampleGeoCollectionFromRect(rect) {
  const outlineScreenPoints = [];
  const edgeSteps = clamp(Math.round(Math.max(rect.width, rect.height) / 12), 2, 12);

  for (let step = 0; step <= edgeSteps; step += 1) {
    const ratio = step / edgeSteps;
    outlineScreenPoints.push({ x: rect.x + rect.width * ratio, y: rect.y });
  }
  for (let step = 1; step <= edgeSteps; step += 1) {
    const ratio = step / edgeSteps;
    outlineScreenPoints.push({ x: rect.x + rect.width, y: rect.y + rect.height * ratio });
  }
  for (let step = edgeSteps - 1; step >= 0; step -= 1) {
    const ratio = step / edgeSteps;
    outlineScreenPoints.push({ x: rect.x + rect.width * ratio, y: rect.y + rect.height });
  }
  for (let step = edgeSteps - 1; step >= 1; step -= 1) {
    const ratio = step / edgeSteps;
    outlineScreenPoints.push({ x: rect.x, y: rect.y + rect.height * ratio });
  }

  const outline = dedupeCoordinates(
    outlineScreenPoints.map((point) => invertCanvasPoint(point)).filter(Boolean),
    6,
  );

  const focusPoints = [];
  const gridSize = clamp(Math.round(Math.min(rect.width, rect.height) / 14), 1, 4);
  for (let row = 0; row <= gridSize; row += 1) {
    for (let column = 0; column <= gridSize; column += 1) {
      const point = {
        x: rect.x + (rect.width * column) / gridSize,
        y: rect.y + (rect.height * row) / gridSize,
      };
      const coordinate = invertCanvasPoint(point);
      if (coordinate) {
        focusPoints.push(coordinate);
      }
    }
  }

  const centerCoordinate = invertCanvasPoint({
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  });
  if (centerCoordinate) {
    focusPoints.push(centerCoordinate);
  }

  if (!focusPoints.length) {
    return null;
  }

  const closedOutline = [...outline];
  const first = outline[0];
  const last = outline[outline.length - 1];
  if (first && (!last || first[0] !== last[0] || first[1] !== last[1])) {
    closedOutline.push(first);
  }

  return {
    outline: closedOutline,
    focusPoints: dedupeCoordinates(focusPoints, 6),
    geoBounds: computeGeoBounds(focusPoints),
  };
}

function toggleCountryAtCanvasPoint(point) {
  const coordinate = invertCanvasPoint(point);
  if (!coordinate) {
    return false;
  }

  const featureSet = state.mapVersion === "world" ? countryFeatures : getKoreaHitTestFeatures();
  const feature = featureSet.find((country) => d3.geoContains(country, coordinate));
  if (!feature) {
    return false;
  }

  if (state.mapVersion === "world") {
    toggleCountry(feature.id);
  } else {
    toggleKoreaRegion(feature.id);
  }
  return true;
}

function invertCanvasPoint(point) {
  if (!currentRenderContext?.projection?.invert) {
    return null;
  }

  const inverted = currentRenderContext.projection.invert([point.x, point.y]);
  if (!inverted || !Number.isFinite(inverted[0]) || !Number.isFinite(inverted[1])) {
    return null;
  }

  return [normalizeLongitude(inverted[0]), clamp(inverted[1], -90, 90)];
}

function applyZoomToRect(rect) {
  const rectCenter = {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
  const factor = Math.min(state.width / rect.width, state.height / rect.height);
  applyRelativeZoom(factor, rectCenter, {
    x: state.width / 2,
    y: state.height / 2,
  });
}

function zoomOutOneStep() {
  const center = {
    x: state.width / 2,
    y: state.height / 2,
  };
  applyRelativeZoom(1 / 1.6, center, center);
}

function applyRelativeZoom(factor, sourcePoint, destinationPoint = sourcePoint) {
  if (!currentRenderContext) {
    return;
  }

  beginHistoryStep("보기 변경");
  const oldZoom = state.viewZoom;
  const newZoom = clampViewZoom(oldZoom * factor);
  const actualFactor = newZoom / oldZoom;
  const baseTranslate = currentRenderContext.baseTranslate;

  state.viewOffsetX =
    actualFactor * state.viewOffsetX +
    (destinationPoint.x - baseTranslate[0]) +
    actualFactor * (baseTranslate[0] - sourcePoint.x);
  state.viewOffsetY =
    actualFactor * state.viewOffsetY +
    (destinationPoint.y - baseTranslate[1]) +
    actualFactor * (baseTranslate[1] - sourcePoint.y);
  state.viewZoom = newZoom;

  if (Math.abs(state.viewZoom - 1) < 0.001) {
    state.viewZoom = 1;
  }
}

function resetViewWindow() {
  state.viewZoom = 1;
  state.viewOffsetX = 0;
  state.viewOffsetY = 0;
}

function clampViewZoom(value) {
  return clamp(value, 0.35, 24);
}

function getCanvasPointFromEvent(event, shell = event.currentTarget ?? elements.previewStage.firstElementChild) {
  const targetShell =
    shell && typeof shell.getBoundingClientRect === "function" ? shell : elements.previewStage.firstElementChild;

  if (!targetShell || typeof targetShell.getBoundingClientRect !== "function") {
    return null;
  }

  const rect = targetShell.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }

  if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
    return null;
  }

  return {
    x: clamp((event.clientX - rect.left) / (currentPreviewScale || 1), 0, state.width),
    y: clamp((event.clientY - rect.top) / (currentPreviewScale || 1), 0, state.height),
  };
}

function normalizeRect(startPoint, endPoint) {
  const x = Math.min(startPoint.x, endPoint.x);
  const y = Math.min(startPoint.y, endPoint.y);
  return {
    x,
    y,
    width: Math.abs(endPoint.x - startPoint.x),
    height: Math.abs(endPoint.y - startPoint.y),
  };
}

function markerDefaults(style) {
  if (style === "dashedOval") {
    return { label: "auto", size: 24, aspect: 0.62, rotation: 0, offsetX: 44, offsetY: -24 };
  }

  if (style === "point") {
    return { label: "auto", size: 10, aspect: 1, rotation: 0, offsetX: 26, offsetY: -18 };
  }

  if (style === "filledDot") {
    return { label: "", size: 4, aspect: 1, rotation: 0, offsetX: 18, offsetY: -18 };
  }

  return { label: "auto", size: 16, aspect: 1, rotation: 0, offsetX: 36, offsetY: -22 };
}

function applyMarkerDefaultsIfNeeded(marker) {
  const defaults = markerDefaults(marker.style);
  if (!marker.label.trim() && defaults.label === "auto" && marker.style !== "filledDot") {
    marker.label = nextAnnotationLabel("marker");
  }

  marker.size = defaults.size;
  marker.aspect = defaults.aspect;
  marker.rotation = defaults.rotation;
  marker.offsetX = defaults.offsetX;
  marker.offsetY = defaults.offsetY;
}

function markerStyleLabel(style) {
  return markerStyleOptions.find((option) => option.value === style)?.label ?? style;
}

function nextAnnotationLabel(type) {
  const sequenceKey = type === "inset" ? "nextInsetSequence" : "nextMarkerSequence";
  const sequence = state[sequenceKey];
  state[sequenceKey] += 1;

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const base = alphabet[sequence % alphabet.length];
  const round = Math.floor(sequence / alphabet.length);
  return round ? `${base}${round + 1}` : base;
}

function getDefaultInsetFrame(index, aspectRatio = 1) {
  const { width, height } = getDefaultInsetPanelSize(aspectRatio);
  const positions = [
    { x: 36, y: state.height - height - 36 },
    { x: state.width - width - 36, y: state.height - height - 36 },
    { x: state.width - width - 36, y: 36 },
    { x: 36, y: 36 },
  ];
  const position = positions[index % positions.length];

  return {
    x: clamp(position.x, 0, Math.max(0, state.width - width)),
    y: clamp(position.y, 0, Math.max(0, state.height - height)),
    width,
    height,
  };
}

function getDefaultInsetPanelSize(aspectRatio) {
  const safeAspectRatio = clamp(Number(aspectRatio) || 1, 0.35, 3.8);
  const shorterCanvasSide = Math.max(1, Math.min(state.width, state.height));
  const targetLongSide = clamp(Math.round(shorterCanvasSide * 0.22), 72, 180);
  const preferredWidth = safeAspectRatio >= 1 ? targetLongSide : targetLongSide * safeAspectRatio;
  const preferredHeight = safeAspectRatio >= 1 ? targetLongSide / safeAspectRatio : targetLongSide;
  return normalizeInsetPanelSize(
    preferredWidth,
    preferredHeight,
    Math.min(MAX_INSET_PANEL_WIDTH, state.width),
    Math.max(MIN_INSET_PANEL_HEIGHT, state.height - 72),
  );
}

function projectCoordinateRaw(projection, coordinate) {
  const point = projection(coordinate);
  if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    return null;
  }

  return { x: point[0], y: point[1] };
}

function projectCoordinateVariants(projection, coordinate) {
  const basePoint = projectCoordinateRaw(projection, coordinate);
  if (!basePoint) {
    return [];
  }

  return getProjectionCopyOffsets(projection).map((offset) => ({
    x: basePoint.x + offset,
    y: basePoint.y,
  }));
}

function projectCoordinate(projection, coordinate) {
  const variants = projectCoordinateVariants(projection, coordinate);
  return variants.find((point) => isPointNearViewport(point)) ?? variants[0] ?? null;
}

function getCompactProjectedPoints(projection, coordinates) {
  const rawPoints = coordinates.map((coordinate) => projectCoordinateRaw(projection, coordinate)).filter(Boolean);
  if (!rawPoints.length) {
    return [];
  }

  const wrapWidth = getProjectionWrapWidth(projection);
  if (!wrapWidth) {
    return rawPoints;
  }

  let runningCenter = rawPoints[0].x;
  const adjusted = rawPoints.map((point, index) => {
    const candidates = [-2, -1, 0, 1, 2].map((step) => ({
      x: point.x + wrapWidth * step,
      y: point.y,
    }));
    const best = candidates.reduce((selected, candidate) =>
      Math.abs(candidate.x - runningCenter) < Math.abs(selected.x - runningCenter) ? candidate : selected,
    );
    runningCenter += (best.x - runningCenter) / (index + 1);
    return best;
  });

  const centerX = adjusted.reduce((sum, point) => sum + point.x, 0) / adjusted.length;
  const shiftSteps = Math.round((state.width / 2 - centerX) / wrapWidth);
  return adjusted.map((point) => ({
    x: point.x + wrapWidth * shiftSteps,
    y: point.y,
  }));
}

function unwrapLongitudeCoordinates(coordinates) {
  let runningLongitude = coordinates[0]?.[0] ?? 0;
  return coordinates.map(([longitude, latitude], index) => {
    let adjustedLongitude = longitude;
    while (adjustedLongitude - runningLongitude > 180) {
      adjustedLongitude -= 360;
    }
    while (adjustedLongitude - runningLongitude < -180) {
      adjustedLongitude += 360;
    }
    runningLongitude += (adjustedLongitude - runningLongitude) / (index + 1);
    return [adjustedLongitude, latitude];
  });
}

function isPointNearViewport(point, buffer = 48) {
  return point.x >= -buffer && point.x <= state.width + buffer && point.y >= -buffer && point.y <= state.height + buffer;
}

function clampCanvasWidth(value, fallback = MAIN_CANVAS_WIDTH) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clamp(Math.round(parsed), MIN_CANVAS_WIDTH, MAIN_CANVAS_WIDTH);
}

function clampCanvasHeight(value, fallback = 310) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clamp(Math.round(parsed), MIN_CANVAS_HEIGHT, 3200);
}

function normalizeCanvasStateDimensions() {
  state.width = clampCanvasWidth(state.width, MAIN_CANVAS_WIDTH);
  state.height = clampCanvasHeight(state.height, 310);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dedupeCoordinates(coordinates, precision = 4) {
  const seen = new Set();
  return coordinates.filter((coordinate) => {
    const key = `${coordinate[0].toFixed(precision)}:${coordinate[1].toFixed(precision)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function closeCoordinateRing(coordinates) {
  const ring = coordinates.map(([longitude, latitude]) => [longitude, latitude]);
  if (!ring.length) {
    return ring;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!last || first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return ring;
}

function computeGeoBounds(coordinates) {
  if (!Array.isArray(coordinates) || !coordinates.length) {
    return null;
  }

  const unwrapped = unwrapLongitudeCoordinates(coordinates);
  const longitudes = unwrapped.map((coordinate) => coordinate[0]);
  const latitudes = unwrapped.map((coordinate) => coordinate[1]);

  return {
    west: Math.min(...longitudes),
    east: Math.max(...longitudes),
    south: Math.min(...latitudes),
    north: Math.max(...latitudes),
  };
}

function normalizeLongitude(longitude) {
  let value = longitude;
  while (value <= -180) {
    value += 360;
  }
  while (value > 180) {
    value -= 360;
  }
  return value;
}

function sanitizeIdentifier(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, "-");
}

function nearZero(value) {
  return Math.abs(value) < 0.001;
}

function isFiniteCoordinate(coordinate) {
  return (
    Array.isArray(coordinate) &&
    coordinate.length >= 2 &&
    Number.isFinite(coordinate[0]) &&
    Number.isFinite(coordinate[1])
  );
}

async function loadEmbeddedMapFontData() {
  try {
    const response = await fetch("./fonts/SidaeAi_S-Regular.otf");
    if (!response.ok) {
      return;
    }

    const buffer = await response.arrayBuffer();
    embeddedMapFontDataUrl = `data:font/otf;base64,${arrayBufferToBase64(buffer)}`;
  } catch (_error) {
    embeddedMapFontDataUrl = null;
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
}

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.toggle("is-error", isError);
}

function formatLongitude(value) {
  const rounded = Math.round(value);
  if (rounded === 0) {
    return "0°";
  }
  return `${Math.abs(rounded)}°${rounded > 0 ? "E" : "W"}`;
}

function formatLatitudeLabel(value) {
  if (Math.abs(value) < 0.0001) {
    return "0°";
  }

  const magnitude = Math.abs(value);
  const rounded = magnitude % 1 === 0 ? String(Math.round(magnitude)) : magnitude.toFixed(1);
  return `${rounded}°${value > 0 ? "N" : "S"}`;
}

function formatCoordinate(value, type) {
  const absolute = Math.abs(value).toFixed(2);
  if (type === "lat") {
    return `${absolute}°${value >= 0 ? "N" : "S"}`;
  }
  return `${absolute}°${value >= 0 ? "E" : "W"}`;
}

function formatScaleDistance(distanceKm) {
  return `${new Intl.NumberFormat("en-US").format(distanceKm)} km`;
}

function formatPointSize(value) {
  const numericValue = Number(value);
  return `${numericValue.toFixed(Number.isInteger(numericValue) ? 0 : 1)}pt`;
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

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
const SITE_GRAPH_FONT_FAMILY = '"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
const MAP_FONT_FAMILY = SITE_GRAPH_FONT_FAMILY;
const MAP_FONT_STRETCH_X = 1;
const EXAM_GRAPH_FONT_FAMILY = SITE_GRAPH_FONT_FAMILY;
const MAP_FONT_STYLE_ELEMENT_ID = "map-live-font-style";
const MAP_SVG_FONT_STYLE_SELECTOR = "style[data-map-font-style='embedded']";
const OUTLINE_STROKE_WIDTH = "0.3pt";
const KOREA_CITY_BOUNDARY_STROKE_WIDTH = "0.18pt";
const KOREA_CITY_CONTEXT_STROKE_WIDTH = "0.45pt";
const KOREA_METRO_DISTRICT_BOUNDARY_STROKE_WIDTH = "0.54pt";
const KOREA_HSR_STATION_RADIUS = 1.45;
const KOREA_HSR_STATION_HALO_RADIUS = 2.25;
const MIN_INSET_PANEL_WIDTH = 36;
const MIN_INSET_PANEL_HEIGHT = 36;
const MAX_INSET_PANEL_WIDTH = 310;
const MAIN_CANVAS_WIDTH = 310;
const MIN_CANVAS_WIDTH = 140;
const MIN_CANVAS_HEIGHT = 120;
const MAX_CANVAS_WIDTH = MAIN_CANVAS_WIDTH;
const MIN_ZOOM_DRAG_SIZE = 20;
const MIN_INSET_DRAG_SIZE = 2;
const MAP_RENDER_CLIP_PADDING = 24;
const INSET_RENDER_CLIP_PADDING = 18;
const COASTLINE_FRAGMENT_MAX_POINTS = 160;
const MIN_INSET_ZOOM_SCALE = 0.2;
const MAX_INSET_ZOOM_SCALE = 4;
const MAX_STABLE_SPHERICAL_FILL_AREA = 2 * Math.PI;
const PNG_EXPORT_DPI = 500;
const CSS_PIXEL_DPI = 96;

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
    description: "클릭하면 기본 크기, 드래그하면 지정한 범위로 인셋을 만들고 위치와 크기를 바로 조정합니다.",
    hint: "인셋 추가 모드에서는 클릭으로 기본 크기의 확대 지도 박스를 만들거나, 드래그로 원하는 범위를 잡을 수 있습니다. 만들어진 인셋 패널은 미리보기에서 바로 끌어 조정할 수 있습니다.",
    tips: ["클릭: 기본 인셋", "드래그: 범위 지정", "핸들: 크기 조절", "4: 인셋 모드"],
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
const countryStatsCropUseLabels = {
  food: "식용",
  feed: "사료용",
  bioenergy: "바이오에너지·비식용",
  other: "기타",
};
const countryStatsDependencyLabels = {
  youth: "유소년 부양비",
  oldAge: "노년 부양비",
  total: "총부양비",
};
const countryStatsRegionLabels = {
  asia: "아시아",
  africa: "아프리카",
  europe: "유럽",
  latinAmerica: "라틴 아메리카",
  northAmerica: "앵글로아메리카",
  oceania: "오세아니아",
};
const countryStatsYearModeDefinitions = [
  { key: "exam", label: "수능특강 기준", detail: "교재 표와 맞춘 기준연도" },
  { key: "latest", label: "최신 가용", detail: "원천 데이터의 최신연도" },
];
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
    description: "밀·쌀·옥수수 생산·교역·용도, 3대 가축 사육과 육류 생산",
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
    description: "1차 에너지 소비, 발전 구조, 화석연료 생산과 국제 이동",
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
const koreaGeoStatsRegionOrderByLevel = window.KOREA_GEO_STATS_REGION_ORDER ?? {
  provinces: [],
  cities: [],
  metroDistricts: [],
};
const koreaGeoStatsRegionsByLevel = window.KOREA_GEO_STATS_REGIONS ?? {
  provinces: {},
  cities: {},
  metroDistricts: {},
};
const koreaGeoStatsMetricsByLevel = window.KOREA_GEO_STATS_METRICS ?? {
  provinces: {},
  cities: {},
  metroDistricts: {},
};
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
const koreaGeoStatsTrendIntervalDefinitions = [
  { key: "1", label: "1년 단위" },
  { key: "5", label: "5년 단위" },
  { key: "10", label: "10년 단위" },
];
const koreaGeoStatsTrendValueModeDefinitions = [
  { key: "index", label: "기준 시점 = 100" },
  { key: "actual", label: "실제 값" },
];
const koreaGeoStatsCityPopulationTrendFallbackKeys = [
  "population-census-linked-2020",
  "population-census-2020-boundary",
  "population-census-2020-admin",
  "resident-population",
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
const programGraphTheme = {
  colors: {
    ink: "#111111",
    mutedInk: "#555555",
    paper: "#ffffff",
    card: "#f7f7f7",
    gridLight: "rgba(17, 17, 17, 0.1)",
    gridStrong: "rgba(17, 17, 17, 0.22)",
    precipitation: "#5f5f5f",
    precipitationFill: "rgba(95, 95, 95, 0.18)",
    neutralBar: "#bcbcbc",
    frame: "#d7d7d7",
  },
  lineStyles: [
    { stroke: "#111111", dasharray: null, background: "#bcbcbc" },
    { stroke: "#5f5f5f", dasharray: "7 4", background: "#5f5f5f" },
    { stroke: "#111111", dasharray: "2 4", background: "#ffffff" },
    { stroke: "#777777", dasharray: "10 4 2 4", background: "#969696" },
    {
      stroke: "#444444",
      dasharray: "5 3",
      background: "repeating-linear-gradient(90deg, #777777 0 2px, #ffffff 2px 7px)",
    },
    {
      stroke: "#111111",
      dasharray: "3 3",
      background: "repeating-linear-gradient(135deg, #777777 0 2px, #ffffff 2px 7px)",
    },
    {
      stroke: "#6f6f6f",
      dasharray: "1.5 4",
      background: "radial-gradient(circle, #777777 0 1.3px, transparent 1.4px)",
      backgroundSize: "7px 7px",
    },
    {
      stroke: "#4a4a4a",
      dasharray: "8 2 1 2",
      background: "repeating-linear-gradient(0deg, #777777 0 2px, #ffffff 2px 7px)",
    },
  ],
  markerRadius: 3.8,
  markerStrokeWidth: "1",
  scatterMinRadius: 3,
  scatterMaxRadius: 5,
};
const countryStatsChartColors = {
  population: "#111111",
  urbanPopulation: "#404040",
  ruralPopulation: "#7a7a7a",
  wheat: "#5d5d5d",
  rice: "#7f7f7f",
  maize: "#9b9b9b",
  food: "#3f3f3f",
  feed: "#6f6f6f",
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
const countryStatsVisualDefinitions = programGraphTheme.lineStyles;
const examGraphAliasLetters = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하"];
const examGraphTheme = {
  colors: {
    ink: "#202020",
    mutedInk: "#707070",
    paper: "#ffffff",
    fillLight: "#dddddd",
    fillMid: "#a9a9a9",
    fillDark: "#6f6f6f",
  },
  strokes: {
    frame: "0.55",
    legendFrame: "0.55",
    grid: "0.45",
    edgeGrid: "0.45",
    zeroAxis: "0.55",
    dataOutline: "0.45",
    line: "0.65",
    marker: "0.55",
  },
  dash: {
    grid: "4 4",
  },
  pattern: {
    size: 6,
    strokeWidth: "0.4pt",
  },
  type: {
    title: 8.4,
    subtitle: 6.6,
    axisTick: 6.8,
    rowLabel: 7.2,
    rowLabelCompact: 6.8,
    legend: 7.1,
    footnote: 7,
    axisTitle: 7,
    pointLabel: 7,
  },
  legend: {
    itemGap: 10,
    paddingX: 6,
    paddingY: 4,
    swatch: 6,
    swatchGap: 10,
    sample: 14,
    lineLabelGap: 4,
    charWidth: 4,
    rowHeight: 12,
    maxItemsPerRow: 4,
    height: 22,
  },
  layout: {
    width: 430,
    titleY: 14,
    subtitleY: 26,
    plotTop: 28,
    xTickGap: 11,
    yTickGap: 7,
    labelGap: 8,
    plotToLegend: 12,
    legendToNote: 14,
    legendSidePadding: 10,
    bottomPadding: 14,
    blockGap: 10,
    axisRangePadding: 10,
    spacingUnit: 2,
  },
  marker: {
    trendRadius: 2.8,
    scatterMinRadius: 2.8,
    scatterMaxRadius: 4.8,
  },
  font: {
    family: EXAM_GRAPH_FONT_FAMILY,
    stretchPercent: 100,
    label: "Pretendard",
  },
};
const examGraphBasicTheme = {
  colors: {
    ink: "#202020",
    mutedInk: "#707070",
    paper: "#ffffff",
    grid: "#e9e9e9",
    frame: "#d8d8d8",
    dataStroke: "#9c9c9c",
    pointFill: "rgba(95, 95, 95, 0.14)",
    fillLight: "#dddddd",
    fillMid: "#a9a9a9",
    fillDark: "#6f6f6f",
  },
  strokes: {
    frame: "0.55",
    legendFrame: "0.55",
    grid: "0.45",
    edgeGrid: "0.45",
    zeroAxis: "0.55",
    dataOutline: "0.45",
    line: "0.65",
    marker: "0.55",
  },
  dash: {
    grid: "4 4",
  },
  pattern: {
    size: 6,
    strokeWidth: "0.4pt",
  },
  type: examGraphTheme.type,
  legend: examGraphTheme.legend,
  layout: examGraphTheme.layout,
  marker: {
    trendRadius: 3,
    scatterMinRadius: 2.8,
    scatterMaxRadius: 4.8,
  },
  font: {
    family: EXAM_GRAPH_FONT_FAMILY,
    stretchPercent: 100,
    label: "Pretendard",
  },
};
const examGraphPatternDefinitions = [
  { key: "light", fill: examGraphTheme.colors.fillLight },
  { key: "dark", fill: examGraphTheme.colors.fillDark },
  { key: "blank", fill: examGraphTheme.colors.paper },
  { key: "mid", fill: examGraphTheme.colors.fillMid },
  { key: "vertical", pattern: "vertical" },
  { key: "diagonal", pattern: "diagonal" },
  { key: "dots", pattern: "dots" },
  { key: "horizontal", pattern: "horizontal" },
  { key: "cross", pattern: "cross" },
];
const examGraphBasicPatternDefinitions = [
  { key: "basic-light", fill: "#d9d9d9" },
  { key: "basic-dark", fill: "#6f6f6f" },
  { key: "basic-blank", fill: "#ffffff" },
  { key: "basic-mid", fill: "#a6a6a6" },
  { key: "basic-vertical", pattern: "vertical" },
  { key: "basic-diagonal", pattern: "diagonal" },
  { key: "basic-dots", pattern: "dots" },
  { key: "basic-horizontal", pattern: "horizontal" },
];
const examGraphValueModeDefinitions = [
  { key: "amount", label: "양" },
  { key: "share", label: "비율" },
  { key: "relative", label: "상댓값100" },
];
const examGraphOrientationDefinitions = [
  { key: "auto", label: "자동 구도" },
  { key: "landscape", label: "가로형" },
  { key: "portrait", label: "세로형" },
];
const examGraphPreviewCountDefinitions = [
  { key: "1", label: "1개" },
  { key: "2", label: "2개" },
  { key: "3", label: "3개" },
];
const examGraphStyleModeDefinitions = [
  { key: "basic", label: "기본" },
];
const EXAM_GRAPH_FONT_BASE_PT = 8;
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
    formatter: (value) => formatPeopleAmount(value),
    getYearValue: (stats, year) => getExamGraphPopulationMetricValue(stats, year, "population"),
    aggregate: "sum",
  },
  {
    key: "population-urban-total",
    label: "도시 인구",
    formatter: (value) => formatPeopleAmount(value),
    getYearValue: (stats, year) => getExamGraphPopulationMetricValue(stats, year, "urbanPopulation"),
    aggregate: "sum",
  },
  {
    key: "population-rural-total",
    label: "촌락 인구",
    formatter: (value) => formatPeopleAmount(value),
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
    formatter: (value) => formatPeopleAmount(value),
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
    formatter: (value) => formatHeadCountAmount(value),
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
  { stroke: examGraphTheme.colors.ink, dasharray: null },
  { stroke: examGraphTheme.colors.ink, dasharray: "5 3" },
  { stroke: examGraphTheme.colors.ink, dasharray: "1.5 2.5" },
  { stroke: examGraphTheme.colors.fillDark, dasharray: "6 2.5 1.5 2.5" },
  { stroke: examGraphTheme.colors.fillMid, dasharray: null },
  { stroke: examGraphTheme.colors.fillDark, dasharray: "1 2" },
];
const examGraphBasicLineStyleDefinitions = [
  { stroke: "#111111", dasharray: null },
  { stroke: "#5f5f5f", dasharray: "7 4" },
  { stroke: "#111111", dasharray: "2 4" },
  { stroke: "#777777", dasharray: "10 4 2 4" },
  { stroke: "#444444", dasharray: "5 3" },
  { stroke: "#6f6f6f", dasharray: "1.5 4" },
  { stroke: "#4a4a4a", dasharray: "8 2 1 2" },
].map((style) => ({
  stroke: style.stroke,
  dasharray: style.dasharray,
}));
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
  "PNG",
]);
const examGraphTextbookPriorityIso3 = new Set([
  "USA",
  "CHN",
  "IND",
  "JPN",
  "KOR",
  "PRK",
  "RUS",
  "GBR",
  "DEU",
  "FRA",
  "ITA",
  "ESP",
  "NLD",
  "SWE",
  "NOR",
  "POL",
  "UKR",
  "TUR",
  "SAU",
  "ARE",
  "QAT",
  "IRN",
  "IRQ",
  "ISR",
  "EGY",
  "NGA",
  "ETH",
  "KEN",
  "UGA",
  "ZAF",
  "COD",
  "SDN",
  "SSD",
  "AFG",
  "SYR",
  "MMR",
  "PAK",
  "BGD",
  "IDN",
  "VNM",
  "THA",
  "PHL",
  "SGP",
  "AUS",
  "NZL",
  "CAN",
  "MEX",
  "BRA",
  "ARG",
  "CHL",
  "PER",
  "COL",
  "VEN",
  "BOL",
  "ECU",
  "NER",
  "RWA",
  "BDI",
  "MAR",
  "DZA",
  "KWT",
  "ISL",
  "DNK",
  "FJI",
  "MYS",
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
  const coastlineMesh = stitchGeometryIfPossible(topojson.mesh(variantTopology, variantTopology.objects.land));
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
  const coastlineFragments = splitLineGeometryFragments(getLineGeometryFragments(coastlineMesh));

  return {
    datasetKey,
    topology: variantTopology,
    countriesObject,
    landFeature,
    borderMesh,
    coastlineMesh,
    coastlineFragments,
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

function stitchGeometryIfPossible(geometry) {
  if (!geometry || typeof d3.geoStitch !== "function") {
    return geometry;
  }

  try {
    return d3.geoStitch(geometry);
  } catch (error) {
    return geometry;
  }
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

function getLakeDatasetForAtlasDataset(atlasDataset, zoomLevel = state.viewZoom) {
  const datasetKey = atlasDataset?.datasetKey;
  const fineLakeThreshold = state.coastlineDetail === "max" ? 9.6 : 10.8;
  if (datasetKey === "10m") {
    if (zoomLevel >= fineLakeThreshold && atlasLakeDatasets["10m"]) {
      return atlasLakeDatasets["10m"];
    }
    return atlasLakeDatasets["50m"] ?? atlasLakeDatasets["110m"] ?? atlasLakeDatasets["10m"] ?? baseLakeDataset;
  }

  if (datasetKey === "50m") {
    return atlasLakeDatasets["110m"] ?? atlasLakeDatasets["50m"] ?? atlasLakeDatasets["10m"] ?? baseLakeDataset;
  }

  return atlasLakeDatasets["110m"] ?? atlasLakeDatasets["50m"] ?? atlasLakeDatasets["10m"] ?? baseLakeDataset;
}

const atlasPalette = ["#9c9c9c", "#b9b9b9", "#6a6a6a", "#858585", "#cacaca", "#777777"];

const state = {
  mapVersion: "world",
  width: MAIN_CANVAS_WIDTH,
  height: 310,
  paddingPercent: 10,
  centerLongitude: 0,
  projectionMode: "rectangular",
  viewMode: "pan",
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
  metricExplorerMetricKey: "",
  metricExplorerTopN: 5,
  metricExplorerGrouping: "countries",
  metricExplorerMapHighlightEnabled: false,
  metricExplorerScatterXKey: "population-total",
  metricExplorerScatterYKey: "exports-share",
  metricExplorerScatterSizeKey: "energy-consumption-total",
  metricExplorerOptionsExpanded: false,
  worldStatsYearMode: "exam",
  koreaGeoStatsCategoryKey: "demography",
  koreaGeoStatsDisplayMode: "overview",
  koreaGeoStatsMetricKey: "population-estimate",
  koreaGeoStatsTopN: 10,
  koreaGeoStatsScatterXKey: "population-estimate",
  koreaGeoStatsScatterYKey: "grdp",
  koreaGeoStatsScatterSizeKey: "manufacturing-employees",
  koreaGeoStatsTrendInterval: 5,
  koreaGeoStatsTrendValueMode: "index",
  koreaGeoStatsTrendBasePeriodKey: "",
  koreaGeoStatsTrendStartPeriodKey: "",
  koreaGeoStatsTrendEndPeriodKey: "",
  koreaGeoStatsActionsExpanded: false,
  examGraphPresetKey: "",
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
  examGraphAliasMode: false,
  examGraphStyleMode: "basic",
  examGraphOrientation: "auto",
  examGraphPreviewCount: 1,
  examGraphFontSizePt: 8,
  examGraphScatterXKey: "population-urban-share",
  examGraphScatterYKey: "age-65plus-share",
  examGraphScatterSizeKey: "population-total",
  examGraphFocusCountryIds: [],
  examGraphFocusLabel: "",
  examGraphDesignExpanded: false,
  examGraphActionsExpanded: false,
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
  selectionFilterLabel: document.querySelector("#selectionFilterLabel"),
  selectionFilterInput: document.querySelector("#selectionFilterInput"),
  selectionFilterMeta: document.querySelector("#selectionFilterMeta"),
  selectionCompareActions: document.querySelector("#selectionCompareActions"),
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
  heightSlider: document.querySelector("#heightSlider"),
  heightSliderValue: document.querySelector("#heightSliderValue"),
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
  downloadPngButton: document.querySelector("#downloadPngButton"),
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
  koreaRegionFilterInput: document.querySelector("#koreaRegionFilterInput"),
  koreaRegionFilterMeta: document.querySelector("#koreaRegionFilterMeta"),
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
let embeddedMapFontDataUrl = window.EMBEDDED_MAP_FONT_DATA_URL ?? null;
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
ensureDocumentMapFontStyle();
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

  elements.heightSlider?.addEventListener("input", () => {
    beginHistoryStep("캔버스 비율 변경");
    state.height = clampCanvasHeight(elements.heightSlider.value, state.height);
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
  elements.selectionFilterInput?.addEventListener("input", () => {
    renderSelectedCountries();
  });
  elements.koreaRegionFilterInput?.addEventListener("input", () => {
    renderKoreaRegionChips();
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

  elements.downloadSvgButton.addEventListener("click", () => {
    void exportCurrentSvg();
  });
  elements.downloadPngButton?.addEventListener("click", () => {
    void exportCurrentPng();
  });

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
  const hasSelection = getCurrentSelectionEntries().length > 0;

  setNodeVisibility(elements.selectionCompareActions, state.mapVersion === "korea" && hasSelection);

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
  resetContextualSearchInputs({ selection: true, koreaRegion: true });
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
  resetContextualSearchInputs({ selection: true, koreaRegion: true });
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
  resetContextualSearchInputs({ koreaRegion: true });
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
  if (elements.selectionFilterLabel) {
    elements.selectionFilterLabel.textContent = isWorldMode ? "선택 국가 찾기" : "선택 권역 찾기";
  }
  if (elements.selectionFilterInput) {
    elements.selectionFilterInput.placeholder = isWorldMode ? "예: Brazil, AUS" : "예: 경기, 전주, 강남구";
  }
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
  if (elements.heightSlider) {
    const sliderMin = Number(elements.heightSlider.min);
    const sliderMax = Number(elements.heightSlider.max);
    elements.heightSlider.value = String(clamp(state.height, sliderMin, sliderMax));
  }
  if (elements.heightSliderValue) {
    elements.heightSliderValue.textContent = `${clampCanvasHeight(state.height)}px`;
  }
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

function normalizeFilterText(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function getSelectionFilterQuery() {
  return normalizeFilterText(elements.selectionFilterInput?.value);
}

function getKoreaRegionFilterQuery() {
  return normalizeFilterText(elements.koreaRegionFilterInput?.value);
}

function buildSelectionFilterHaystack(selection) {
  const parts = [selection?.id, selection?.name, formatSelectionDisplayName(selection)];
  if (state.mapVersion === "korea" && selection?.parentCode) {
    parts.push(getKoreaProvinceName(selection.parentCode));
  }
  return normalizeFilterText(parts.filter(Boolean).join(" "));
}

function buildKoreaFeatureFilterHaystack(feature) {
  const parts = [feature?.id, feature?.properties?.name];
  if (feature?.properties?.parentCode) {
    parts.push(getKoreaProvinceName(feature.properties.parentCode));
  }
  return normalizeFilterText(parts.filter(Boolean).join(" "));
}

function formatFilteredCountText(filteredCount, totalCount, emptyLabel = "없음") {
  if (!(totalCount > 0)) {
    return emptyLabel;
  }
  if (filteredCount === totalCount) {
    return `전체 ${totalCount}개`;
  }
  return `${filteredCount} / ${totalCount}개 표시`;
}

function resetContextualSearchInputs({ selection = false, koreaRegion = false } = {}) {
  if (selection && elements.selectionFilterInput) {
    elements.selectionFilterInput.value = "";
  }

  if (koreaRegion && elements.koreaRegionFilterInput) {
    elements.koreaRegionFilterInput.value = "";
  }
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

function getFilteredVisibleKoreaSelectableFeatures() {
  const visibleFeatures = getVisibleKoreaSelectableFeatures();
  const filterQuery = getKoreaRegionFilterQuery();
  if (!filterQuery) {
    return visibleFeatures;
  }

  return visibleFeatures.filter((feature) => buildKoreaFeatureFilterHaystack(feature).includes(filterQuery));
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
  const filteredFeatures = getFilteredVisibleKoreaSelectableFeatures();
  const selectedIds = new Set(getCurrentSelectionEntries().map((selection) => selection.id));
  const filterQuery = getKoreaRegionFilterQuery();

  if (elements.koreaRegionFilterMeta) {
    elements.koreaRegionFilterMeta.textContent = formatFilteredCountText(
      filteredFeatures.length,
      visibleFeatures.length,
      "표시할 권역 없음",
    );
  }

  if (!visibleFeatures.length) {
    const emptyText = getCurrentSelectionEmptyMessage();
    elements.koreaRegionChipList.appendChild(createEmptyState(emptyText));
    elements.activateVisibleKoreaRegionsButton.disabled = true;
    elements.clearVisibleKoreaRegionsButton.disabled = true;
    return;
  }

  const fragment = document.createDocumentFragment();

  if (!filteredFeatures.length) {
    elements.koreaRegionChipList.appendChild(
      createEmptyState(filterQuery ? "검색과 일치하는 권역이 없습니다." : getCurrentSelectionEmptyMessage()),
    );
    elements.activateVisibleKoreaRegionsButton.disabled = true;
    elements.clearVisibleKoreaRegionsButton.disabled = true;
    return;
  }

  sortKoreaFeaturesByName(filteredFeatures).forEach((feature) => {
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
  const visibleFeatures = getFilteredVisibleKoreaSelectableFeatures();
  const isFiltered = Boolean(getKoreaRegionFilterQuery());
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
  setStatus(`${isFiltered ? "검색 결과" : "현재 보이는"} ${visibleFeatures.length}개 권역을 켰습니다.`);
}

function clearVisibleKoreaRegions() {
  const visibleFeatures = getFilteredVisibleKoreaSelectableFeatures();
  const isFiltered = Boolean(getKoreaRegionFilterQuery());
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
  setStatus(`${isFiltered ? "검색 결과" : "현재 보이는"} 권역을 모두 껐습니다.`);
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
  return clamp(Math.round(Number(state.metricExplorerTopN) || 5), 1, 30);
}

function getWorldStatsYearMode() {
  return state.worldStatsYearMode === "latest" ? "latest" : "exam";
}

function getWorldStatsYearModeMeta() {
  return (
    countryStatsYearModeDefinitions.find((definition) => definition.key === getWorldStatsYearMode()) ??
    countryStatsYearModeDefinitions[0]
  );
}

function getVersionedStatEntry(entry) {
  if (!entry) {
    return null;
  }
  if (getWorldStatsYearMode() === "latest" && entry.latest) {
    return { ...entry, ...entry.latest };
  }
  return entry;
}

function getVersionedStatValue(entry) {
  return getVersionedStatEntry(entry)?.value;
}

function getVersionedEnergyEntry(entry) {
  return getWorldStatsYearMode() === "latest" && entry?.latest ? entry.latest : entry;
}

function getVersionedPopulationStructure(entry) {
  if (!entry) {
    return null;
  }
  const selected = getWorldStatsYearMode() === "latest" && entry.latest ? { ...entry, ...entry.latest } : entry;
  return {
    ...selected,
    density: getVersionedStatEntry(entry.density),
  };
}

function getSelectedPopulationRow(population) {
  if (!population?.rows?.length) {
    return null;
  }
  if (getWorldStatsYearMode() === "latest") {
    return population.rows[population.rows.length - 1];
  }
  const referenceYear = countryStatsMeta.examReferenceYears?.population ?? 2023;
  return [...population.rows].reverse().find((row) => Number(row.year) <= referenceYear) ?? population.rows[0];
}

function getSelectedPopulationRateRow(population) {
  if (!population?.rates?.rows?.length) {
    return null;
  }
  if (getWorldStatsYearMode() === "latest") {
    return population.rates.rows[population.rates.rows.length - 1];
  }
  const referenceYear = countryStatsMeta.examReferenceYears?.population ?? 2023;
  return [...population.rates.rows].reverse().find((row) => Number(row.year) <= referenceYear) ?? population.rates.rows[0];
}

function formatWorldStatsYearModeLabel() {
  return getWorldStatsYearModeMeta().label;
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
    key.includes("imports") ||
    key.includes("exports") ||
    key.includes("-import-") ||
    key.includes("-export-") ||
    key.startsWith("exports-") ||
    key.startsWith("migration-") ||
    key.startsWith("refugee-")
  ) {
    return "flow";
  }

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
    state.metricExplorerMetricKey = "";
    return;
  }

  if (
    state.metricExplorerMetricKey &&
    !categoryDefinitions.some((definition) => definition.key === state.metricExplorerMetricKey)
  ) {
    state.metricExplorerMetricKey = "";
  }

  let visibleDefinitions = getMetricExplorerVisibleDefinitions(definitions);
  if (!visibleDefinitions.length) {
    state.metricExplorerDisplayMode = "overview";
    visibleDefinitions = getMetricExplorerVisibleDefinitions(definitions);
  }
  if (
    state.metricExplorerMetricKey &&
    !visibleDefinitions.some((definition) => definition.key === state.metricExplorerMetricKey)
  ) {
    state.metricExplorerMetricKey = "";
  }

  const scatterFallbacks = categoryDefinitions.map((definition) => definition.key);
  if (!scatterFallbacks.includes(state.metricExplorerScatterXKey)) {
    state.metricExplorerScatterXKey = scatterFallbacks[0] ?? "";
  }
  if (!scatterFallbacks.includes(state.metricExplorerScatterYKey)) {
    state.metricExplorerScatterYKey = scatterFallbacks[1] ?? scatterFallbacks[0] ?? "";
  }
  if (!scatterFallbacks.includes(state.metricExplorerScatterSizeKey)) {
    state.metricExplorerScatterSizeKey = scatterFallbacks[2] ?? scatterFallbacks[0] ?? "";
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
  const filterQuery = getSelectionFilterQuery();
  const filteredSelection = filterQuery
    ? currentSelection.filter((selection) => buildSelectionFilterHaystack(selection).includes(filterQuery))
    : currentSelection;
  const comparedIdSet = getCurrentKoreaComparedIdSet();
  if (state.mapVersion === "world") {
    syncActiveStatsCountry();
  }

  if (elements.selectionFilterMeta) {
    elements.selectionFilterMeta.textContent = formatFilteredCountText(
      filteredSelection.length,
      currentSelection.length,
      "선택 없음",
    );
  }

  if (!currentSelection.length) {
    elements.selectedCountryList.appendChild(createEmptyState(getCurrentSelectionEmptyMessage()));
    syncKoreaGroupingActionButtons();
    return;
  }

  if (!filteredSelection.length) {
    elements.selectedCountryList.appendChild(createEmptyState("검색과 일치하는 선택 항목이 없습니다."));
    syncKoreaGroupingActionButtons();
    return;
  }

  filteredSelection.forEach((country) => {
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

  const shell = document.createElement("div");
  shell.className = "metric-explorer-shell";
  shell.appendChild(buildMetricExplorerControls(definitions, visibleDefinitions, activeDefinition));

  if (!activeDefinition) {
    shell.appendChild(createEmptyState("지표를 선택하면 그래프와 순위표가 표시됩니다."));
    elements.metricExplorerPanel.appendChild(shell);
    return;
  }

  const results = getMetricExplorerResults(activeDefinition);
  const continentResults = getMetricExplorerResults(activeDefinition, "continents");
  const countryResults = getMetricExplorerResults(activeDefinition, "countries");
  const topN = getMetricExplorerTopN();
  const scopeMode = getMetricExplorerScopeMode();
  const scopeLabel = getMetricExplorerScopeLabel();
  const scatterXDefinition = getMetricExplorerDefinitionByKey(definitions, state.metricExplorerScatterXKey);
  const scatterYDefinition = getMetricExplorerDefinitionByKey(definitions, state.metricExplorerScatterYKey);
  const scatterSizeDefinition = getMetricExplorerDefinitionByKey(definitions, state.metricExplorerScatterSizeKey);
  const usesRelativeTable = state.metricExplorerDisplayMode === "relative";
  const rankingTableEntries = usesRelativeTable
    ? buildRelativeIndexTableEntries(results, activeDefinition.formatter, topN)
    : results.slice(0, topN);
  const rankingTableValueFormatter = usesRelativeTable
    ? (value) => formatRelativeIndex(value)
    : activeDefinition.formatter;
  const rankingTableDescription = usesRelativeTable
    ? "그래프의 상댓값 100 기준으로 환산한 표입니다. 실제 값은 항목 설명에 함께 남겼습니다."
    : "그래프를 만들 때 바로 옮겨 적기 쉬운 값 표입니다.";

  const summary = document.createElement("div");
  summary.className = "metric-explorer-summary";
  summary.append(
    createMetricExplorerSummaryCard(
      "대분류",
      categoryMeta.label,
      `${displayModeMeta.label} · ${scopeLabel} · ${formatWorldStatsYearModeLabel()}`,
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
          entries: rankingTableEntries,
          valueFormatter: rankingTableValueFormatter,
        }),
      );
    } else {
      chartGrid.append(
        buildMetricExplorerTable({
          title: usesRelativeTable ? "상댓값 순위표" : scopeMode === "selected" ? "선택 국가 비교표" : "국가 순위표",
          description: rankingTableDescription,
          entries: rankingTableEntries,
          valueFormatter: rankingTableValueFormatter,
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
  if (level === "metroDistricts") {
    return "metroDistricts";
  }
  return "";
}

function getKoreaGeoStatsLevelLabel(levelKey = getKoreaGeoStatsLevelKey()) {
  return (
    koreaGeoStatsMeta?.levels?.[levelKey] ??
    (levelKey === "metroDistricts"
      ? "구/군"
      : levelKey === "cities"
        ? "시/군"
        : levelKey === "provinces"
          ? "도/광역시"
          : "권역")
  );
}

function getKoreaGeoStatsRegionNoun(levelKey = getKoreaGeoStatsLevelKey(), compact = false) {
  if (levelKey === "metroDistricts") {
    return compact ? "구군" : "구·군";
  }
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

function getKoreaGeoStatsTrendInterval() {
  const interval = Math.round(Number(state.koreaGeoStatsTrendInterval) || 5);
  return [1, 5, 10].includes(interval) ? interval : 5;
}

function getKoreaGeoStatsTrendValueMode() {
  return state.koreaGeoStatsTrendValueMode === "actual" ? "actual" : "index";
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

  state.koreaGeoStatsTrendInterval = getKoreaGeoStatsTrendInterval();
  if (!koreaGeoStatsTrendValueModeDefinitions.some((definition) => definition.key === state.koreaGeoStatsTrendValueMode)) {
    state.koreaGeoStatsTrendValueMode = "index";
  }
  if (getKoreaGeoStatsTrendValueMode() === "index" && !activeDefinition?.allowRelative) {
    state.koreaGeoStatsTrendValueMode = "actual";
  }
  state.koreaGeoStatsTrendBasePeriodKey =
    typeof state.koreaGeoStatsTrendBasePeriodKey === "string" ? state.koreaGeoStatsTrendBasePeriodKey : "";
  state.koreaGeoStatsTrendStartPeriodKey =
    typeof state.koreaGeoStatsTrendStartPeriodKey === "string" ? state.koreaGeoStatsTrendStartPeriodKey : "";
  state.koreaGeoStatsTrendEndPeriodKey =
    typeof state.koreaGeoStatsTrendEndPeriodKey === "string" ? state.koreaGeoStatsTrendEndPeriodKey : "";

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

  const shouldIncludeParent = includeParent ?? (levelKey === "cities" || levelKey === "metroDistricts");
  if ((levelKey === "cities" || levelKey === "metroDistricts") && shouldIncludeParent && region.parentCode) {
    return `${getKoreaGeoStatsProvinceShortLabel(region.parentCode)} · ${region.shortLabel ?? region.label ?? regionId}`;
  }

  return region.shortLabel ?? region.label ?? regionId;
}

function getKoreaGeoStatsSelectedRegions(levelKey = getKoreaGeoStatsLevelKey()) {
  const regions = getKoreaGeoStatsRegions(levelKey);
  if (levelKey === "cities") {
    return state.koreaSelectedCities.filter((region) => regions[region.id]);
  }
  if (levelKey === "metroDistricts") {
    return state.koreaSelectedMetroDistricts.filter((region) => regions[region.id]);
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
  if (levelKey === "metroDistricts" && state.koreaParentCode) {
    return regionOrder.filter((regionId) => regions[regionId]?.parentCode === state.koreaParentCode);
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
  if (levelKey === "metroDistricts" && state.koreaParentCode) {
    return `${getKoreaProvinceName(state.koreaParentCode)} ${noun} ${scopeRegionIds.length}곳`;
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
  if (levelKey === "metroDistricts" && state.koreaParentCode) {
    return `${getKoreaProvinceName(state.koreaParentCode)} 안의 ${getKoreaGeoStatsRegionNoun(levelKey)}만 비교합니다.`;
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

function buildRelativeIndexTableEntries(
  entries = [],
  formatter = (value) => String(value),
  topN = entries.length,
  { detailFormatter } = {},
) {
  const slicedEntries = (entries ?? []).slice(0, topN);
  const maximumValue = Number(slicedEntries[0]?.value) || 0;
  if (!(maximumValue > 0) || slicedEntries.some((entry) => Number(entry.value) < 0)) {
    return [];
  }

  return slicedEntries.map((entry) => ({
    ...entry,
    value: (Number(entry.value) / maximumValue) * 100,
    detail: detailFormatter ? detailFormatter(entry) : `실제 ${formatter(entry.value)} · ${entry.detail ?? entry.periodLabel ?? "최신값"}`,
    valueDetail: "최댓값=100",
  }));
}

function getKoreaGeoStatsDefinitionMaxSeriesLength(definition) {
  return Object.values(definition?.seriesByRegion ?? {}).reduce((maximumLength, series) => {
    const nextLength = Array.isArray(series) ? series.length : 0;
    return Math.max(maximumLength, nextLength);
  }, 0);
}

function findKoreaGeoStatsCityPopulationTrendDefinition(definition, metricsByKey = getKoreaGeoStatsMetrics("cities")) {
  if (!definition || definition.key !== "population-estimate") {
    return null;
  }

  return koreaGeoStatsCityPopulationTrendFallbackKeys
    .map((key) => metricsByKey[key])
    .filter(Boolean)
    .find(
      (candidate) =>
        candidate.key !== definition.key &&
        getKoreaGeoStatsDefinitionMaxSeriesLength(candidate) >
          getKoreaGeoStatsDefinitionMaxSeriesLength(definition),
    );
}

function resolveKoreaGeoStatsTrendDefinition(
  definition,
  levelKey = getKoreaGeoStatsLevelKey(),
  metricsByKey = getKoreaGeoStatsMetrics(levelKey),
) {
  if (!definition) {
    return definition;
  }

  if (levelKey === "cities" && definition.key === "population-estimate") {
    const populationTrendDefinition = findKoreaGeoStatsCityPopulationTrendDefinition(definition, metricsByKey);
    if (populationTrendDefinition) {
      return populationTrendDefinition;
    }
  }

  return definition;
}

function getKoreaGeoStatsTrendCoverageLabel(series = []) {
  const years = (series ?? [])
    .flatMap((entry) => entry.points ?? [])
    .map((point) => getKoreaGeoStatsPeriodMeta(point.periodKey).year)
    .filter((year) => Number.isFinite(year) && year > 0);
  if (!years.length) {
    return "";
  }
  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);
  return firstYear === lastYear ? `${firstYear}년` : `${firstYear}~${lastYear}년`;
}

function getKoreaGeoStatsTrendSourceNote(displayDefinition, seriesDefinition, levelKey = getKoreaGeoStatsLevelKey()) {
  if (!displayDefinition || !seriesDefinition) {
    return "";
  }

  if (levelKey === "cities" && displayDefinition.key === "population-estimate") {
    if (seriesDefinition.key === "population-census-linked-2020") {
      return `시·군 인구 시계열은 ${seriesDefinition.label} 기준입니다. KOSIS 총조사 시군구 원표를 2020년 시·군 경계에 면적가중으로 맞춘 장기 시계열이라 행정구역 변화가 큰 곳은 해석에 주의하세요.`;
    }
    if (seriesDefinition.key === "resident-population") {
      return `시·군 인구 시계열은 ${seriesDefinition.label} 기준입니다. 2020년 시·군 경계 장기 원표가 없을 때만 주민등록인구 fallback을 사용합니다.`;
    }
    if (seriesDefinition.key !== displayDefinition.key) {
      return `시·군 인구 시계열은 ${seriesDefinition.label} 기준으로 보정했습니다. 2020년 기준 장기 원표가 아닌 경우 행정구역 변화가 큰 곳은 해석에 주의하세요.`;
    }
  }

  if (seriesDefinition.key !== displayDefinition.key) {
    return `시·군 장기 시계열은 ${seriesDefinition.label} 기준으로 보정했습니다.`;
  }
  return "";
}

function getKoreaGeoStatsPeriodMeta(periodKey) {
  const digits = String(periodKey ?? "").replace(/\D/g, "");
  const sortValue = Number.parseInt(digits || "0", 10) || 0;
  const year = digits.length >= 4 ? Number.parseInt(digits.slice(0, 4), 10) || 0 : sortValue;
  const subKey = digits.length > 4 ? digits.slice(4) : "";
  const subValue = subKey ? Number.parseInt(subKey, 10) || 0 : 0;
  return { digits, sortValue, year, subKey, subValue };
}

function parseKoreaGeoStatsPeriodKey(periodKey) {
  return getKoreaGeoStatsPeriodMeta(periodKey).sortValue;
}

function getKoreaGeoStatsPeriodSubDistance(meta, referenceSubKey = "") {
  if (!meta?.subKey || !referenceSubKey) {
    return 0;
  }
  const referenceValue = Number.parseInt(referenceSubKey, 10);
  if (!Number.isFinite(referenceValue)) {
    return meta.subKey === referenceSubKey ? 0 : 1;
  }
  return Math.abs((meta.subValue || 0) - referenceValue);
}

function getKoreaGeoStatsRepresentativePeriodKeys(periodKeys = []) {
  const sortedKeys = [...new Set(periodKeys)].sort((a, b) => parseKoreaGeoStatsPeriodKey(a) - parseKoreaGeoStatsPeriodKey(b));
  const metas = sortedKeys.map((key) => ({ key, meta: getKoreaGeoStatsPeriodMeta(key) }));
  if (!metas.some(({ meta }) => meta.subKey)) {
    return sortedKeys;
  }

  const subKeyCounts = new Map();
  metas.forEach(({ meta }) => {
    if (!meta.subKey) {
      return;
    }
    subKeyCounts.set(meta.subKey, (subKeyCounts.get(meta.subKey) ?? 0) + 1);
  });
  const preferredSubKey =
    [...subKeyCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "";

  const representativesByYear = new Map();
  metas.forEach(({ key, meta }) => {
    const bucketKey = String(meta.year || key);
    const candidateDistance = getKoreaGeoStatsPeriodSubDistance(meta, preferredSubKey);
    const current = representativesByYear.get(bucketKey);
    if (
      !current ||
      candidateDistance < current.distance ||
      (candidateDistance === current.distance && meta.sortValue < current.meta.sortValue)
    ) {
      representativesByYear.set(bucketKey, { key, meta, distance: candidateDistance });
    }
  });

  return [...representativesByYear.values()]
    .sort((a, b) => a.meta.sortValue - b.meta.sortValue)
    .map((entry) => entry.key);
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

function getKoreaGeoStatsTrendPeriodOptions(series = []) {
  const validSeries = (series ?? []).filter((entry) => Array.isArray(entry?.points) && entry.points.length);
  if (!validSeries.length) {
    return [];
  }

  const periodLabelByKey = new Map();
  let commonPeriodKeys = null;
  validSeries.forEach((entry) => {
    const currentKeys = new Set();
    (entry.points ?? []).forEach((point) => {
      if (!point?.periodKey) {
        return;
      }
      currentKeys.add(point.periodKey);
      if (!periodLabelByKey.has(point.periodKey)) {
        periodLabelByKey.set(point.periodKey, point.periodLabel ?? point.periodKey);
      }
    });
    commonPeriodKeys = commonPeriodKeys
      ? new Set([...commonPeriodKeys].filter((key) => currentKeys.has(key)))
      : currentKeys;
  });
  return getKoreaGeoStatsRepresentativePeriodKeys(commonPeriodKeys?.size ? [...commonPeriodKeys] : [...periodLabelByKey.keys()])
    .sort((a, b) => parseKoreaGeoStatsPeriodKey(a) - parseKoreaGeoStatsPeriodKey(b))
    .map((key) => ({ key, label: periodLabelByKey.get(key) ?? key }));
}

function resolveKoreaGeoStatsTrendPeriodRange(periodOptions = []) {
  const sortedOptions = [...(periodOptions ?? [])].sort(
    (a, b) => parseKoreaGeoStatsPeriodKey(a.key) - parseKoreaGeoStatsPeriodKey(b.key),
  );
  if (!sortedOptions.length) {
    return { startPeriodKey: "", endPeriodKey: "", periodOptions: [] };
  }

  let startIndex = sortedOptions.findIndex((option) => option.key === state.koreaGeoStatsTrendStartPeriodKey);
  let endIndex = sortedOptions.findIndex((option) => option.key === state.koreaGeoStatsTrendEndPeriodKey);
  if (startIndex < 0) {
    startIndex = 0;
  }
  if (endIndex < 0) {
    endIndex = sortedOptions.length - 1;
  }
  if (startIndex > endIndex) {
    [startIndex, endIndex] = [endIndex, startIndex];
  }

  return {
    startPeriodKey: sortedOptions[startIndex]?.key ?? "",
    endPeriodKey: sortedOptions[endIndex]?.key ?? "",
    periodOptions: sortedOptions.slice(startIndex, endIndex + 1),
  };
}

function filterKoreaGeoStatsTrendPointsByPeriodRange(points = [], startPeriodKey = "", endPeriodKey = "") {
  const startValue = startPeriodKey ? parseKoreaGeoStatsPeriodKey(startPeriodKey) : -Infinity;
  const endValue = endPeriodKey ? parseKoreaGeoStatsPeriodKey(endPeriodKey) : Infinity;
  return (points ?? []).filter((point) => {
    const periodValue = parseKoreaGeoStatsPeriodKey(point.periodKey);
    return periodValue >= startValue && periodValue <= endValue;
  });
}

function resolveKoreaGeoStatsTrendBasePeriodKey(periodOptions = []) {
  if (periodOptions.some((option) => option.key === state.koreaGeoStatsTrendBasePeriodKey)) {
    return state.koreaGeoStatsTrendBasePeriodKey;
  }
  return periodOptions[0]?.key ?? "";
}

function sampleKoreaGeoStatsTrendPoints(points = [], interval = getKoreaGeoStatsTrendInterval(), anchorPeriodKey = "") {
  const sortedPoints = [...(points ?? [])].sort(
    (a, b) => parseKoreaGeoStatsPeriodKey(a.periodKey) - parseKoreaGeoStatsPeriodKey(b.periodKey),
  );
  if (interval <= 1 || sortedPoints.length <= 2) {
    return sortedPoints;
  }

  const anchorPoint = sortedPoints.find((point) => point.periodKey === anchorPeriodKey) ?? sortedPoints[0] ?? null;
  const anchorMeta = getKoreaGeoStatsPeriodMeta(anchorPoint?.periodKey);
  if (!anchorPoint || !anchorMeta.year) {
    return sortedPoints;
  }

  const sampledByYear = new Map();

  sortedPoints.forEach((point) => {
    const pointMeta = getKoreaGeoStatsPeriodMeta(point.periodKey);
    if (!pointMeta.year) {
      return;
    }
    if (Math.abs(pointMeta.year - anchorMeta.year) % interval !== 0) {
      return;
    }
    const bucketKey = String(pointMeta.year);
    const candidateDistance = getKoreaGeoStatsPeriodSubDistance(pointMeta, anchorMeta.subKey);
    const current = sampledByYear.get(bucketKey);
    if (
      !current ||
      candidateDistance < current.distance ||
      (candidateDistance === current.distance && pointMeta.sortValue < current.meta.sortValue)
    ) {
      sampledByYear.set(bucketKey, { point, meta: pointMeta, distance: candidateDistance });
    }
  });

  const sampledByKey = new Map(
    [...sampledByYear.values()].map((entry) => [entry.point.periodKey, entry.point]),
  );
  [sortedPoints[0], sortedPoints[sortedPoints.length - 1], anchorPoint]
    .filter(Boolean)
    .forEach((point) => {
      sampledByKey.set(point.periodKey, point);
    });

  return [...sampledByKey.values()].sort(
    (a, b) => parseKoreaGeoStatsPeriodKey(a.periodKey) - parseKoreaGeoStatsPeriodKey(b.periodKey),
  );
}

function buildKoreaGeoStatsTrendPresentation(
  definition,
  latestEntries = getKoreaGeoStatsLatestEntries(definition),
  levelKey = getKoreaGeoStatsLevelKey(),
) {
  const displayDefinition = definition;
  const seriesDefinition = resolveKoreaGeoStatsTrendDefinition(displayDefinition, levelKey);
  const rawSeries = getKoreaGeoStatsTrendSeries(seriesDefinition, latestEntries, levelKey);
  const rangePeriodOptions = getKoreaGeoStatsTrendPeriodOptions(rawSeries);
  const periodRange = resolveKoreaGeoStatsTrendPeriodRange(rangePeriodOptions);
  const rangedRawSeries = rawSeries
    .map((entry) => ({
      ...entry,
      points: filterKoreaGeoStatsTrendPointsByPeriodRange(
        entry.points,
        periodRange.startPeriodKey,
        periodRange.endPeriodKey,
      ),
    }))
    .filter((entry) => entry.points.length);
  const periodOptions = getKoreaGeoStatsTrendPeriodOptions(rangedRawSeries);
  const basePeriodKey = resolveKoreaGeoStatsTrendBasePeriodKey(periodOptions);
  const interval = getKoreaGeoStatsTrendInterval();
  const valueMode = getKoreaGeoStatsTrendValueMode();
  const sampledSeries = rangedRawSeries
    .map((entry) => ({
      ...entry,
      points: sampleKoreaGeoStatsTrendPoints(entry.points, interval, basePeriodKey),
    }))
    .filter((entry) => entry.points.length >= 2);
  const basePeriodLabel = periodOptions.find((option) => option.key === basePeriodKey)?.label ?? basePeriodKey;
  const canUseIndex = Boolean(seriesDefinition?.allowRelative);
  const usesIndex = valueMode === "index" && canUseIndex && Boolean(basePeriodKey);

  const series = usesIndex
    ? sampledSeries
        .map((entry) => {
          const basePoint = (entry.points ?? []).find((point) => point.periodKey === basePeriodKey);
          const baseValue = Number(basePoint?.value);
          if (!(baseValue > 0)) {
            return null;
          }
          return {
            ...entry,
            points: entry.points.map((point) => ({
              ...point,
              value: (Number(point.value) / baseValue) * 100,
            })),
          };
        })
        .filter(Boolean)
    : sampledSeries;
  const usesAlternateSeriesDefinition = Boolean(
    seriesDefinition?.key && displayDefinition?.key && seriesDefinition.key !== displayDefinition.key,
  );
  const coverageLabel = getKoreaGeoStatsTrendCoverageLabel(rangedRawSeries);
  const detailLabel = [coverageLabel, `${interval}년 단위`].filter(Boolean).join(" · ");
  const sourceNote = getKoreaGeoStatsTrendSourceNote(displayDefinition, seriesDefinition, levelKey);

  return {
    series,
    rawSeries: rangedRawSeries,
    rangePeriodOptions,
    periodOptions,
    basePeriodKey,
    basePeriodLabel,
    startPeriodKey: periodRange.startPeriodKey,
    endPeriodKey: periodRange.endPeriodKey,
    interval,
    usesIndex,
    canUseIndex,
    seriesDefinition,
    usesAlternateSeriesDefinition,
    sourceNote,
    valueFormatter: usesIndex
      ? (value) => formatRelativeIndex(value)
      : (value) => formatKoreaGeoStatsCompactValue(seriesDefinition, value),
    summaryLabel: usesIndex ? `${basePeriodLabel || "기준 시점"} = 100` : "실제 값",
    detailLabel,
  };
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
  if (levelKey === "metroDistricts" && state.koreaParentCode) {
    return regionOrder.filter((regionId) => regions[regionId]?.parentCode === state.koreaParentCode);
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
  const activeDefinition = getKoreaGeoStatsDefinition();
  const trendHint =
    state.koreaGeoStatsDisplayMode === "trend" || state.koreaGeoStatsDisplayMode === "overview"
      ? ` 시계열은 시작·종료 시점과 ${getKoreaGeoStatsTrendInterval()}년 단위를 조절하고, 필요하면 기준 시점을 100으로 맞춰 읽을 수 있습니다.`
      : "";
  const cityPopulationBoundaryHint =
    levelKey === "cities" && activeDefinition?.key === "population-estimate"
      ? " 시·군 인구 추이는 2020년 시·군 경계 면적가중 장기 시계열을 우선 사용하고, 없을 때만 주민등록인구로 대체합니다."
      : "";
  if (getKoreaGeoStatsScopeMode(levelKey) === "selected") {
    return `선택한 ${regionNoun}만 같은 축으로 비교합니다. 필요하면 랜덤 버튼으로 추천 ${compactRegionNoun} 조합이나 지표를 바로 바꿔 볼 수 있습니다.${trendHint}${cityPopulationBoundaryHint}`;
  }
  if (levelKey === "cities" && state.koreaCityScopeCodes.length) {
    return `${getKoreaCityScopeLabel(state.koreaCityScopeCodes, { maxNames: 2 })} 범위 ${regionNoun}을 같은 축으로 묶어 비교합니다. 세트 랜덤은 이 범위 안에서 출제용 조합을 다시 골라 줍니다.${trendHint}${cityPopulationBoundaryHint}`;
  }
  return `선택이 없으면 전국 ${getKoreaGeoStatsRegionOrder(levelKey).length}개 ${compactRegionNoun}를 같은 축으로 펼쳐 비교 그래프로 정리합니다. 랜덤 버튼은 출제 포인트가 살아 있는 지역·지표 조합을 추천합니다.${trendHint}${cityPopulationBoundaryHint}`;
}

function getProgramGraphPlotBox(width, height, margin) {
  const left = Number(margin.left) || 0;
  const top = Number(margin.top) || 0;
  const right = width - (Number(margin.right) || 0);
  const bottom = height - (Number(margin.bottom) || 0);
  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function getProgramGraphLayout({
  stepCount = 5,
  seriesCount = 1,
  yLabelMaxLength = 4,
  xLabelMaxLength = 4,
  scatter = false,
} = {}) {
  const safeStepCount = Math.max(1, Number(stepCount) || 1);
  const safeSeriesCount = Math.max(1, Number(seriesCount) || 1);
  const left = clamp(Math.round(34 + Math.max(4, yLabelMaxLength) * 4.8), 54, 98);
  const right = scatter ? 30 : 22;
  const top = scatter ? 28 : 24;
  const bottom = clamp(Math.round(40 + Math.max(0, xLabelMaxLength - 4) * 2), scatter ? 54 : 44, 70);
  const plotWidth = clamp(
    Math.round((scatter ? 328 : 318) + safeStepCount * (scatter ? 20 : 24) + Math.min(safeSeriesCount, 8) * 10),
    scatter ? 360 : 344,
    scatter ? 620 : 600,
  );
  const plotHeight = clamp(
    Math.round((scatter ? 192 : 172) + Math.min(safeSeriesCount, 8) * 13 + Math.max(0, safeStepCount - 6) * 4),
    scatter ? 210 : 190,
    scatter ? 330 : 304,
  );
  const width = left + plotWidth + right;
  const height = top + plotHeight + bottom;
  return {
    width,
    height,
    plot: getProgramGraphPlotBox(width, height, { left, right, top, bottom }),
  };
}

function getProgramGraphAxisDomain(values, { forceZeroStart = false, paddingRatio = 0.08, niceCount = 5 } = {}) {
  const validValues = (values ?? []).filter((value) => Number.isFinite(Number(value))).map(Number);
  if (!validValues.length) {
    return { minimum: 0, maximum: 1 };
  }

  let minimum = Math.min(...validValues);
  let maximum = Math.max(...validValues);
  if (forceZeroStart && minimum > 0) {
    minimum = 0;
  }
  if (maximum < 0) {
    maximum = 0;
  }

  if (minimum === maximum) {
    const padding = Math.abs(minimum) * 0.12 || 1;
    minimum -= padding;
    maximum += padding;
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

function getProgramGraphAxisTicks(minimum, maximum, count = 5) {
  const baseTicks = d3.ticks(minimum, maximum, count);
  const ticks = [...baseTicks, minimum, maximum];
  if (minimum < 0 && maximum > 0) {
    ticks.push(0);
  }
  return [...new Set(ticks.map((value) => Number(value.toFixed(6))))].sort((a, b) => a - b);
}

function createProgramGraphSvg(className, width, height, title) {
  const svg = createSvgElement("svg");
  svg.setAttribute("class", className);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", title);
  return svg;
}

function appendProgramGraphFrame(svg, plot) {
  const frame = createSvgElement("rect");
  frame.setAttribute("x", String(plot.left));
  frame.setAttribute("y", String(plot.top));
  frame.setAttribute("width", String(plot.width));
  frame.setAttribute("height", String(plot.height));
  frame.setAttribute("class", "country-stats-chart-frame");
  svg.appendChild(frame);
}

function appendProgramGraphHorizontalGrid(svg, { plot, ticks, minimum, maximum, valueToY, valueFormatter }) {
  ticks.forEach((tick) => {
    const y = valueToY(tick);
    const isZero = Math.abs(tick) < 0.000001;
    const line = createSvgElement("line");
    line.setAttribute("x1", String(plot.left));
    line.setAttribute("x2", String(plot.right));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("class", isZero ? "country-stats-chart-axis-line" : "country-stats-chart-grid-line");
    svg.appendChild(line);

    const label = createSvgElement("text");
    label.setAttribute("x", String(plot.left - 7));
    label.setAttribute("y", String(y + 3));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "country-stats-chart-axis-label");
    label.textContent = valueFormatter(tick, Math.max(Math.abs(minimum), Math.abs(maximum)));
    svg.appendChild(label);
  });
}

function appendProgramGraphVerticalGrid(svg, { plot, ticks, minimum, maximum, valueToX, valueFormatter }) {
  ticks.forEach((tick) => {
    const x = valueToX(tick);
    const isZero = Math.abs(tick) < 0.000001;
    const line = createSvgElement("line");
    line.setAttribute("x1", String(x));
    line.setAttribute("x2", String(x));
    line.setAttribute("y1", String(plot.top));
    line.setAttribute("y2", String(plot.bottom));
    line.setAttribute("class", isZero ? "country-stats-chart-axis-line" : "country-stats-chart-grid-line");
    svg.appendChild(line);

    const label = createSvgElement("text");
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(plot.bottom + 18));
    label.setAttribute(
      "text-anchor",
      Math.abs(tick - minimum) < 0.000001 ? "start" : Math.abs(tick - maximum) < 0.000001 ? "end" : "middle",
    );
    label.setAttribute("class", "country-stats-chart-axis-label");
    label.textContent = valueFormatter(tick, Math.max(Math.abs(minimum), Math.abs(maximum)));
    svg.appendChild(label);
  });
}

function createProgramGraphAxisRow(leftLabel, centerLabel, rightLabel) {
  const axis = document.createElement("div");
  axis.className = "country-stats-bar-axis";
  [leftLabel, centerLabel, rightLabel].forEach((label) => {
    const item = document.createElement("span");
    item.textContent = label;
    axis.appendChild(item);
  });
  return axis;
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
  const domain = getProgramGraphAxisDomain(values, { paddingRatio: 0.08, niceCount: 5 });
  const minimumValue = domain.minimum;
  const maximumValue = domain.maximum;
  const yTicks = getProgramGraphAxisTicks(minimumValue, maximumValue, 5);
  const layout = getProgramGraphLayout({
    stepCount: periods.length,
    seriesCount: validSeries.length,
    yLabelMaxLength: Math.max(...yTicks.map((tick) => String(valueFormatter(tick)).length), 4),
    xLabelMaxLength: Math.max(...periods.map((period) => String(periodLabelByKey.get(period) ?? period).length), 4),
  });
  const { width, height, plot } = layout;
  const step = periods.length > 1 ? plot.width / (periods.length - 1) : 0;

  const periodToX = new Map(periods.map((period, index) => [period, plot.left + step * index]));
  const valueToY = (value) => plot.top + (maximumValue - Number(value)) / (maximumValue - minimumValue) * plot.height;

  const svg = createProgramGraphSvg("country-stats-line-chart", width, height, title);
  appendProgramGraphHorizontalGrid(svg, {
    plot,
    ticks: yTicks,
    minimum: minimumValue,
    maximum: maximumValue,
    valueToY,
    valueFormatter: (value) => valueFormatter(value),
  });
  appendProgramGraphFrame(svg, plot);

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
      dot.setAttribute("r", String(programGraphTheme.markerRadius));
      dot.setAttribute("class", "country-stats-line-chart__dot");
      dot.setAttribute("fill", visual.stroke || entry.color || "#111111");
      dot.setAttribute("stroke", programGraphTheme.colors.paper);
      dot.setAttribute("stroke-width", programGraphTheme.markerStrokeWidth);
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
    label.setAttribute("y", String(plot.bottom + 25));
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

function getKoreaGeoStatsScopeCompositionData(
  definition,
  latestEntries = getKoreaGeoStatsLatestEntries(definition),
  { levelKey = getKoreaGeoStatsLevelKey(), maxSegments = getKoreaGeoStatsTopN(levelKey) } = {},
) {
  const validEntries = (latestEntries ?? []).filter((entry) => Number(entry?.value) > 0);
  const total = validEntries.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
  if (!(total > 0) || !validEntries.length) {
    return null;
  }

  const visibleCount = clamp(Math.round(Number(maxSegments) || 6), 2, validEntries.length);
  const visibleEntries = validEntries.slice(0, visibleCount);
  const otherEntries = validEntries.slice(visibleEntries.length);
  const dominantPeriodLabel = getKoreaGeoStatsDominantPeriodLabel(validEntries);
  const rows = visibleEntries.map((entry, index) => ({
    rankLabel: `${index + 1}위`,
    label: entry.label,
    value: Number(entry.value),
    valueLabel: formatKoreaGeoStatsValue(definition, entry.value),
    share: (Number(entry.value) / total) * 100,
    periodLabel: entry.periodLabel ?? dominantPeriodLabel,
  }));
  const otherValue = otherEntries.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
  if (otherValue > 0) {
    rows.push({
      rankLabel: "기타",
      label: `기타 ${otherEntries.length}곳`,
      value: otherValue,
      valueLabel: formatKoreaGeoStatsValue(definition, otherValue),
      share: (otherValue / total) * 100,
      periodLabel: dominantPeriodLabel,
    });
  }

  return {
    total,
    dominantPeriodLabel,
    totalLabel: `${dominantPeriodLabel} 기준 · 총 ${formatKoreaGeoStatsValue(definition, total)}`,
    rows,
    segments: rows.map((row) => ({
      label: row.label,
      share: row.share,
      amountLabel: row.valueLabel,
    })),
  };
}

function buildKoreaGeoStatsScopeCompositionCard(
  definition,
  latestEntries = getKoreaGeoStatsLatestEntries(definition),
  { title, description, levelKey = getKoreaGeoStatsLevelKey(), maxSegments = getKoreaGeoStatsTopN(levelKey) } = {},
) {
  const compositionData = getKoreaGeoStatsScopeCompositionData(definition, latestEntries, { levelKey, maxSegments });
  if (!compositionData) {
    return createCountryStatsUnavailable("구성비를 계산할 수 없습니다.");
  }

  return buildShareCompositionCard({
    title,
    description,
    totalLabel: compositionData.totalLabel,
    segments: compositionData.segments,
  });
}

function buildKoreaGeoStatsScopeCompositionDataTable(
  definition,
  latestEntries = getKoreaGeoStatsLatestEntries(definition),
  { title, description, levelKey = getKoreaGeoStatsLevelKey(), maxSegments = getKoreaGeoStatsTopN(levelKey) } = {},
) {
  const compositionData = getKoreaGeoStatsScopeCompositionData(definition, latestEntries, { levelKey, maxSegments });
  return buildMetricExplorerMatrixTable({
    title,
    description: compositionData ? `${description} ${compositionData.totalLabel}` : description,
    columns: [
      { key: "rankLabel", label: "구분" },
      { key: "label", label: getKoreaGeoStatsRegionNoun(levelKey) },
      { key: "valueLabel", label: "실제 값", align: "end" },
      { key: "shareLabel", label: "구성비", align: "end" },
    ],
    rows: (compositionData?.rows ?? []).map((row) => ({
      ...row,
      shareLabel: formatPercent(row.share),
    })),
    emptyText: "표시할 구성비 원자료가 없습니다.",
  });
}

function buildKoreaGeoStatsStackedComparisonCard({ title, description, totalLabel, rows = [], legendSegments = [] }) {
  const card = buildChartCardShell(title, description);
  const validRows = (rows ?? []).filter((row) => Array.isArray(row?.segments) && row.segments.length);
  if (!validRows.length) {
    card.appendChild(createCountryStatsUnavailable("표시할 구조 비교 자료가 없습니다."));
    return card;
  }

  if (totalLabel) {
    const totalNode = document.createElement("small");
    totalNode.className = "country-stats-chart-card__total";
    totalNode.textContent = totalLabel;
    card.appendChild(totalNode);
  }

  if (legendSegments.length) {
    const legend = document.createElement("div");
    legend.className = "country-stats-line-legend";
    legendSegments.forEach((segment, segmentIndex) => {
      const item = document.createElement("div");
      item.className = "country-stats-line-legend__item";
      const swatch = document.createElement("span");
      swatch.className = "country-stats-line-legend__swatch";
      applyCountryStatsPatternStyle(swatch, getCountryStatsVisual(segmentIndex));
      const labelNode = document.createElement("span");
      labelNode.textContent = segment.label;
      item.append(swatch, labelNode);
      legend.appendChild(item);
    });
    card.appendChild(legend);
  }

  const list = document.createElement("div");
  list.className = "country-stats-bars";
  validRows.forEach((row) => {
    const wrapper = document.createElement("div");
    wrapper.className = "country-stats-bar";

    const head = document.createElement("div");
    head.className = "country-stats-bar__head";
    const labelNode = document.createElement("span");
    labelNode.textContent = row.label;
    head.appendChild(labelNode);
    if (row.valueLabel) {
      const valueNode = document.createElement("strong");
      valueNode.textContent = row.valueLabel;
      head.appendChild(valueNode);
    }
    wrapper.appendChild(head);

    const stack = document.createElement("div");
    stack.className = "country-stats-stacked-bar";
    row.segments.forEach((segment, segmentIndex) => {
      const block = document.createElement("div");
      block.className = "country-stats-stacked-bar__segment";
      block.style.width = `${clamp(Number(segment.share) || 0, 0, 100)}%`;
      block.title = `${segment.label} ${formatPercent(segment.share)}`;
      applyCountryStatsPatternStyle(block, getCountryStatsVisual(segmentIndex));
      stack.appendChild(block);
    });
    wrapper.appendChild(stack);

    if (row.detail) {
      const detailNode = document.createElement("small");
      detailNode.className = "country-stats-bar__detail";
      detailNode.textContent = row.detail;
      wrapper.appendChild(detailNode);
    }

    list.appendChild(wrapper);
  });
  card.appendChild(list);
  card.appendChild(createProgramGraphAxisRow("0", "50", "100(%)"));

  return card;
}

function getKoreaGeoStatsProvinceAgeStructureCompareData(
  metricsByKey = getKoreaGeoStatsMetrics("provinces"),
  populationEntries = [],
) {
  const levelKey = "provinces";
  const populationDefinition = metricsByKey["resident-population"] ?? metricsByKey["population-estimate"];
  const comparisonEntries = (populationEntries ?? []).filter(Boolean);
  const rows = comparisonEntries
    .map((entry) => {
      const youthRow = metricsByKey["youth-population-share"]?.latestByRegion?.[entry.id];
      const workingRow = metricsByKey["working-age-population-share"]?.latestByRegion?.[entry.id];
      const elderlyRow = metricsByKey["elderly-share"]?.latestByRegion?.[entry.id];
      if (!youthRow || !workingRow || !elderlyRow) {
        return null;
      }
      const youth = Number(youthRow.value);
      const working = Number(workingRow.value);
      const elderly = Number(elderlyRow.value);
      return {
        label: formatKoreaGeoStatsRegionLabel(entry.id, levelKey),
        valueLabel: populationDefinition ? formatKoreaGeoStatsCompactValue(populationDefinition, entry.value) : "",
        detail: `유소년 ${formatPercent(youth)} · 생산연령 ${formatPercent(working)} · 고령 ${formatPercent(elderly)}`,
        periodLabel: elderlyRow.periodLabel ?? workingRow.periodLabel ?? youthRow.periodLabel ?? "",
        youth,
        working,
        elderly,
        segments: [
          { label: "유소년층", share: youth },
          { label: "생산연령층", share: working },
          { label: "고령층", share: elderly },
        ],
      };
    })
    .filter(Boolean);

  if (!rows.length) {
    return null;
  }

  return {
    populationDefinition,
    rows,
    totalLabel: `${getKoreaGeoStatsDominantPeriodLabel(rows)} 기준 · 같은 100% 축`,
  };
}

function buildKoreaGeoStatsProvinceAgeStructureCompareCard(
  metricsByKey = getKoreaGeoStatsMetrics("provinces"),
  populationEntries = [],
) {
  const levelKey = "provinces";
  const comparisonData = getKoreaGeoStatsProvinceAgeStructureCompareData(metricsByKey, populationEntries);
  if (!comparisonData) {
    return createCountryStatsUnavailable("도별 인구 구조 비교를 계산할 수 없습니다.");
  }

  const { rows, totalLabel } = comparisonData;
  const selectedCount = getKoreaGeoStatsSelectedRegions(levelKey).length;
  return buildKoreaGeoStatsStackedComparisonCard({
    title: selectedCount > 1 ? "선택 시도 인구 구조 비교" : "도별 인구 구조 비교",
    description:
      selectedCount > 1
        ? "선택한 시도를 같은 100% 축에 놓고 유소년층·생산연령층·고령층 구성비를 비교합니다."
        : "인구 규모가 큰 시도부터 연령층 구성비를 같은 100% 축에 놓아 구성 비교 그래프로 읽습니다.",
    totalLabel,
    rows,
    legendSegments: rows[0]?.segments ?? [],
  });
}

function buildKoreaGeoStatsProvinceAgeStructureCompareDataTable(
  metricsByKey = getKoreaGeoStatsMetrics("provinces"),
  populationEntries = [],
) {
  const comparisonData = getKoreaGeoStatsProvinceAgeStructureCompareData(metricsByKey, populationEntries);
  return buildMetricExplorerMatrixTable({
    title: "연령 구조 비교 원자료 표",
    description: comparisonData
      ? `그래프에 사용한 시도별 인구 규모와 연령층 비중을 그대로 적었습니다. ${comparisonData.totalLabel}`
      : "그래프에 사용한 시도별 인구 규모와 연령층 비중을 그대로 적었습니다.",
    columns: [
      { key: "label", label: "시도" },
      { key: "valueLabel", label: "인구", align: "end" },
      { key: "youthLabel", label: "유소년층", align: "end" },
      { key: "workingLabel", label: "생산연령층", align: "end" },
      { key: "elderlyLabel", label: "고령층", align: "end" },
    ],
    rows: (comparisonData?.rows ?? []).map((row) => ({
      ...row,
      youthLabel: formatPercent(row.youth),
      workingLabel: formatPercent(row.working),
      elderlyLabel: formatPercent(row.elderly),
    })),
    emptyText: "표시할 인구 구조 원자료가 없습니다.",
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

function buildKoreaGeoStatsSourceRow(definition, supplementaryNote = "") {
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

  if (supplementaryNote) {
    sourceCard.appendChild(document.createElement("br"));
    const note = document.createElement("span");
    note.textContent = supplementaryNote;
    sourceCard.appendChild(note);
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
      createEmptyState("공식 한국지리 통계는 현재 도/광역시, 시/군, 서울·부산 구/군 보기에서 제공합니다."),
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
  const trendPresentation = buildKoreaGeoStatsTrendPresentation(activeDefinition, latestEntries, levelKey);
  if (state.koreaGeoStatsTrendBasePeriodKey !== trendPresentation.basePeriodKey) {
    state.koreaGeoStatsTrendBasePeriodKey = trendPresentation.basePeriodKey;
  }
  if (state.koreaGeoStatsTrendStartPeriodKey !== trendPresentation.startPeriodKey) {
    state.koreaGeoStatsTrendStartPeriodKey = trendPresentation.startPeriodKey;
  }
  if (state.koreaGeoStatsTrendEndPeriodKey !== trendPresentation.endPeriodKey) {
    state.koreaGeoStatsTrendEndPeriodKey = trendPresentation.endPeriodKey;
  }

  shell.appendChild(buildKoreaGeoStatsControls(definitions, categoryDefinitions, activeDefinition, trendPresentation));

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
  if (state.koreaGeoStatsDisplayMode === "trend" || state.koreaGeoStatsDisplayMode === "overview") {
    summary.append(
      createMetricExplorerSummaryCard("시계열", trendPresentation.summaryLabel, trendPresentation.detailLabel),
    );
    if (trendPresentation.usesAlternateSeriesDefinition) {
      summary.append(
        createMetricExplorerSummaryCard(
          "시계열 원자료",
          trendPresentation.seriesDefinition?.label ?? activeDefinition.label,
          trendPresentation.sourceNote,
        ),
      );
    }
  }
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
    const scatterEntries = getKoreaGeoStatsScatterEntries(scatterXDefinition, scatterYDefinition, scatterSizeDefinition, levelKey);
    chartGrid.append(
      buildScatterChartCard({
        title: scopeMode === "selected" ? `선택 ${regionNoun} 지표 관계` : `전국 ${regionNoun} 지표 관계`,
        description: `${scatterXDefinition.label} · ${scatterYDefinition.label} · 크기 ${scatterSizeDefinition.label}`,
        entries: scatterEntries,
        xLabel: scatterXDefinition.label,
        yLabel: scatterYDefinition.label,
        xFormatter: (value) => formatKoreaGeoStatsCompactValue(scatterXDefinition, value),
        yFormatter: (value) => formatKoreaGeoStatsCompactValue(scatterYDefinition, value),
        sizeFormatter: (value) => formatKoreaGeoStatsValue(scatterSizeDefinition, value),
      }),
      buildKoreaGeoStatsScatterRawDataTable(scatterEntries, scatterXDefinition, scatterYDefinition, scatterSizeDefinition),
      buildMetricExplorerTable({
        title: "최신 비교표",
        description: `현재 활성 지표 기준으로 함께 비교할 수 있는 ${regionNoun} 공식값입니다.`,
        entries: latestEntries.slice(0, topN),
        valueFormatter: (value) => formatKoreaGeoStatsValue(activeDefinition, value),
      }),
    );
  } else if (state.koreaGeoStatsDisplayMode === "trend") {
    const trendSourceNote = trendPresentation.sourceNote ? ` ${trendPresentation.sourceNote}` : "";
    chartGrid.append(
      buildTimelineLineChartCard({
        title: scopeMode === "selected" ? `선택 ${regionNoun} 시점 변화` : `상위 ${regionNoun} 시점 변화`,
        description:
          scopeMode === "selected"
            ? `선택한 ${regionNoun}을 ${trendPresentation.detailLabel}로 줄여 같은 축에 놓고 ${trendPresentation.summaryLabel} 기준으로 읽습니다.${trendSourceNote}`
            : `선택이 없을 때는 최신 공식값 상위 ${regionNoun} 권역을 ${trendPresentation.detailLabel}로 정리해 ${trendPresentation.summaryLabel} 기준으로 비교합니다.${trendSourceNote}`,
        series: trendPresentation.series,
        valueFormatter: trendPresentation.valueFormatter,
      }),
      buildKoreaGeoStatsTrendRawDataTable(trendPresentation),
      buildMetricExplorerTable({
        title: "최신 비교표",
        description: "최신 공식값과 기준 시점을 그래프 옆에서 함께 확인합니다.",
        entries: latestEntries.slice(0, topN),
        valueFormatter: (value) => formatKoreaGeoStatsValue(activeDefinition, value),
      }),
    );
  } else if (state.koreaGeoStatsDisplayMode === "relative") {
    const relativeEntries = buildRelativeIndexTableEntries(
      latestEntries,
      (value) => formatKoreaGeoStatsValue(activeDefinition, value),
      topN,
      {
        detailFormatter: (entry) =>
          `실제 ${formatKoreaGeoStatsValue(activeDefinition, entry.value)} · ${entry.periodLabel ?? "최신 시점"}`,
      },
    );
    chartGrid.append(
      buildKoreaGeoStatsRelativeCard(latestEntries, activeDefinition, topN, levelKey),
      buildMetricExplorerTable({
        title: "상댓값 순위표",
        description: "그래프와 같은 최댓값 100 기준으로 환산한 표입니다. 실제 공식값은 항목 설명에 함께 남겼습니다.",
        entries: relativeEntries,
        valueFormatter: (value) => formatRelativeIndex(value),
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
    const trendSourceNote = trendPresentation.sourceNote ? ` ${trendPresentation.sourceNote}` : "";
    chartGrid.append(
      buildTimelineLineChartCard({
        title: scopeMode === "selected" ? `선택 ${regionNoun} 시점 변화` : `상위 ${regionNoun} 시점 변화`,
        description:
          scopeMode === "selected"
            ? `선택한 ${regionNoun}을 ${trendPresentation.detailLabel}로 줄여 ${trendPresentation.summaryLabel} 기준의 기본 변화 패턴을 읽습니다.${trendSourceNote}`
            : `선택이 없을 때는 최신 공식값 상위 ${regionNoun} 권역을 ${trendPresentation.detailLabel} 기준으로 펼쳐 봅니다.${trendSourceNote}`,
        series: trendPresentation.series,
        valueFormatter: trendPresentation.valueFormatter,
      }),
      buildKoreaGeoStatsTrendRawDataTable(trendPresentation),
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
      metricsByKey["youth-population-share"] &&
      metricsByKey["working-age-population-share"] &&
      metricsByKey["elderly-share"]
    ) {
      if (levelKey === "provinces") {
        const selectedCount = getKoreaGeoStatsSelectedRegions(levelKey).length;
        const populationDefinition = metricsByKey["resident-population"] ?? metricsByKey["population-estimate"];
        const provincePopulationEntries = populationDefinition
          ? selectedCount > 1
            ? getKoreaGeoStatsLatestEntries(populationDefinition, levelKey)
            : getKoreaGeoStatsLatestEntriesForRegionIds(
                populationDefinition,
                getKoreaGeoStatsRegionOrder(levelKey),
                levelKey,
              )
          : [];
        const provinceComparisonEntries =
          selectedCount > 1
            ? provincePopulationEntries
            : provincePopulationEntries.slice(0, clamp(Math.round(Number(topN) || 8), 4, provincePopulationEntries.length || 4));
        if (populationDefinition && provincePopulationEntries.length) {
          chartGrid.append(
            buildKoreaGeoStatsScopeCompositionCard(populationDefinition, provincePopulationEntries, {
              title: selectedCount > 1 ? "선택 시도 인구 구조" : "도별 인구 구조",
              description:
                selectedCount > 1
                  ? "선택한 시도의 주민등록인구를 합쳐 100으로 두고 비중을 읽습니다."
                  : "전국 주민등록인구를 시도 비중으로 다시 묶어 구조 비교 그래프로 정리했습니다.",
              levelKey,
              maxSegments: selectedCount > 1 ? provincePopulationEntries.length : Math.min(topN, 8),
            }),
            buildKoreaGeoStatsScopeCompositionDataTable(populationDefinition, provincePopulationEntries, {
              title: "인구 구조 원자료 표",
              description: "구조 그래프에 쓴 시도별 실제 인구와 비중을 함께 적었습니다.",
              levelKey,
              maxSegments: selectedCount > 1 ? provincePopulationEntries.length : Math.min(topN, 8),
            }),
          );
        }
        if (selectedCount === 1 && anchorRegionCode) {
          chartGrid.append(buildKoreaGeoStatsAgeStructureCard(anchorRegionCode, metricsByKey, levelKey));
        }
        if (provinceComparisonEntries.length >= 2) {
          chartGrid.append(
            buildKoreaGeoStatsProvinceAgeStructureCompareCard(metricsByKey, provinceComparisonEntries),
            buildKoreaGeoStatsProvinceAgeStructureCompareDataTable(metricsByKey, provinceComparisonEntries),
          );
        }
      } else if (anchorRegionCode) {
        chartGrid.append(buildKoreaGeoStatsAgeStructureCard(anchorRegionCode, metricsByKey, levelKey));
      }
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

    if (categoryMeta.key === "energy" && levelKey === "provinces") {
      const selectedCount = getKoreaGeoStatsSelectedRegions(levelKey).length;
      const allProvinceIds = getKoreaGeoStatsRegionOrder(levelKey);
      const energyDefinitions = [
        {
          definition: metricsByKey["final-energy-consumption"],
          title: selectedCount > 1 ? "선택 시도 최종에너지소비량 구조" : "도별 최종에너지소비량 구조",
          description:
            selectedCount > 1
              ? "선택한 시도의 최종에너지소비량을 합쳐 100으로 두고 비중을 읽습니다."
              : "전국 최종에너지소비량을 시도 비중으로 다시 묶어 구조 그래프로 확인합니다.",
        },
        {
          definition: metricsByKey["electricity-sales"],
          title: selectedCount > 1 ? "선택 시도 전력판매량 구조" : "도별 전력판매량 구조",
          description:
            selectedCount > 1
              ? "선택한 시도의 전력판매량을 합쳐 100으로 두고 비중을 비교합니다."
              : "전국 전력판매량이 어느 시도에 많이 집중되는지 구조 그래프로 보여 줍니다.",
        },
      ];
      energyDefinitions.forEach((config) => {
        if (!config.definition) {
          return;
        }
        const compositionEntries =
          selectedCount > 1
            ? getKoreaGeoStatsLatestEntries(config.definition, levelKey)
            : getKoreaGeoStatsLatestEntriesForRegionIds(config.definition, allProvinceIds, levelKey);
        if (!compositionEntries.length) {
          return;
        }
        chartGrid.append(
          buildKoreaGeoStatsScopeCompositionCard(config.definition, compositionEntries, {
            title: config.title,
            description: config.description,
            levelKey,
            maxSegments: selectedCount > 1 ? compositionEntries.length : Math.min(topN, 8),
          }),
          buildKoreaGeoStatsScopeCompositionDataTable(config.definition, compositionEntries, {
            title: `${config.definition.label} 원자료 표`,
            description: "구조 그래프에 쓴 시도별 실제 값과 비중을 함께 적었습니다.",
            levelKey,
            maxSegments: selectedCount > 1 ? compositionEntries.length : Math.min(topN, 8),
          }),
        );
      });
    }
  }

  shell.appendChild(chartGrid);
  const chartDefinition =
    (state.koreaGeoStatsDisplayMode === "trend" || state.koreaGeoStatsDisplayMode === "overview") &&
    trendPresentation?.seriesDefinition
      ? trendPresentation.seriesDefinition
      : activeDefinition;
  const sourceNotes = [];
  if (chartDefinition?.key !== activeDefinition?.key) {
    sourceNotes.push(`최신 비교표와 선택 지표는 ${activeDefinition.label}, 장기 시계열 그래프는 ${chartDefinition.label}을 사용했습니다.`);
  }
  if (trendPresentation?.sourceNote) {
    sourceNotes.push(trendPresentation.sourceNote);
  }
  const sourceNote = [...new Set(sourceNotes)].join(" ");
  shell.appendChild(buildKoreaGeoStatsSourceRow(chartDefinition, sourceNote));
  elements.koreaGeoStatsPanel.appendChild(shell);
}

function buildKoreaGeoStatsControls(definitions, categoryDefinitions, activeDefinition, trendPresentation = null) {
  const wrapper = document.createElement("div");
  wrapper.className = "metric-explorer-control-shell";
  const levelKey = getKoreaGeoStatsLevelKey();
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
  wrapper.appendChild(
    buildControlDisclosure({
      title: "빠른 추천과 범위 조정",
      detail: "현재 범위 복귀, 지역 추천, 통계 추천",
      contentNode: actionRow,
      open: state.koreaGeoStatsActionsExpanded,
      onToggle: (nextOpen) => {
        state.koreaGeoStatsActionsExpanded = nextOpen;
      },
    }),
  );

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

  if ((state.koreaGeoStatsDisplayMode === "trend" || state.koreaGeoStatsDisplayMode === "overview") && trendPresentation) {
    const valueModeLabel = document.createElement("div");
    valueModeLabel.className = "metric-explorer-control";
    const valueModeText = document.createElement("label");
    valueModeText.setAttribute("for", "koreaGeoStatsTrendValueModeSelect");
    valueModeText.textContent = "시계열 기준";
    const valueModeSelect = document.createElement("select");
    valueModeSelect.id = "koreaGeoStatsTrendValueModeSelect";
    koreaGeoStatsTrendValueModeDefinitions
      .filter((definition) => definition.key !== "index" || trendPresentation.canUseIndex)
      .forEach((definition) => {
        const option = document.createElement("option");
        option.value = definition.key;
        option.textContent = definition.label;
        option.selected = definition.key === getKoreaGeoStatsTrendValueMode();
        valueModeSelect.appendChild(option);
      });
    valueModeSelect.addEventListener("change", () => {
      state.koreaGeoStatsTrendValueMode = valueModeSelect.value;
      renderSelectionViews();
    });
    valueModeLabel.append(valueModeText, valueModeSelect);
    controls.appendChild(valueModeLabel);

    const intervalField = document.createElement("div");
    intervalField.className = "metric-explorer-control";
    const intervalLabel = document.createElement("label");
    intervalLabel.setAttribute("for", "koreaGeoStatsTrendIntervalSelect");
    intervalLabel.textContent = "시점 간격";
    const intervalSelect = document.createElement("select");
    intervalSelect.id = "koreaGeoStatsTrendIntervalSelect";
    koreaGeoStatsTrendIntervalDefinitions.forEach((definition) => {
      const option = document.createElement("option");
      option.value = definition.key;
      option.textContent = definition.label;
      option.selected = Number(definition.key) === getKoreaGeoStatsTrendInterval();
      intervalSelect.appendChild(option);
    });
    intervalSelect.addEventListener("change", () => {
      state.koreaGeoStatsTrendInterval = Number(intervalSelect.value);
      renderSelectionViews();
    });
    intervalField.append(intervalLabel, intervalSelect);
    controls.appendChild(intervalField);

    const rangePeriodOptions = trendPresentation.rangePeriodOptions?.length
      ? trendPresentation.rangePeriodOptions
      : trendPresentation.periodOptions;
    const startPeriodField = document.createElement("div");
    startPeriodField.className = "metric-explorer-control";
    const startPeriodLabel = document.createElement("label");
    startPeriodLabel.setAttribute("for", "koreaGeoStatsTrendStartPeriodSelect");
    startPeriodLabel.textContent = "시작 시점";
    const startPeriodSelect = document.createElement("select");
    startPeriodSelect.id = "koreaGeoStatsTrendStartPeriodSelect";
    rangePeriodOptions.forEach((optionConfig) => {
      const option = document.createElement("option");
      option.value = optionConfig.key;
      option.textContent = optionConfig.label;
      option.selected = optionConfig.key === trendPresentation.startPeriodKey;
      startPeriodSelect.appendChild(option);
    });
    startPeriodSelect.disabled = rangePeriodOptions.length <= 1;
    startPeriodSelect.addEventListener("change", () => {
      state.koreaGeoStatsTrendStartPeriodKey = startPeriodSelect.value;
      renderSelectionViews();
    });
    startPeriodField.append(startPeriodLabel, startPeriodSelect);
    controls.appendChild(startPeriodField);

    const endPeriodField = document.createElement("div");
    endPeriodField.className = "metric-explorer-control";
    const endPeriodLabel = document.createElement("label");
    endPeriodLabel.setAttribute("for", "koreaGeoStatsTrendEndPeriodSelect");
    endPeriodLabel.textContent = "종료 시점";
    const endPeriodSelect = document.createElement("select");
    endPeriodSelect.id = "koreaGeoStatsTrendEndPeriodSelect";
    rangePeriodOptions.forEach((optionConfig) => {
      const option = document.createElement("option");
      option.value = optionConfig.key;
      option.textContent = optionConfig.label;
      option.selected = optionConfig.key === trendPresentation.endPeriodKey;
      endPeriodSelect.appendChild(option);
    });
    endPeriodSelect.disabled = rangePeriodOptions.length <= 1;
    endPeriodSelect.addEventListener("change", () => {
      state.koreaGeoStatsTrendEndPeriodKey = endPeriodSelect.value;
      renderSelectionViews();
    });
    endPeriodField.append(endPeriodLabel, endPeriodSelect);
    controls.appendChild(endPeriodField);

    const basePeriodField = document.createElement("div");
    basePeriodField.className = "metric-explorer-control";
    const basePeriodLabel = document.createElement("label");
    basePeriodLabel.setAttribute("for", "koreaGeoStatsTrendBasePeriodSelect");
    basePeriodLabel.textContent = "기준 시점";
    const basePeriodSelect = document.createElement("select");
    basePeriodSelect.id = "koreaGeoStatsTrendBasePeriodSelect";
    trendPresentation.periodOptions.forEach((optionConfig) => {
      const option = document.createElement("option");
      option.value = optionConfig.key;
      option.textContent = optionConfig.label;
      option.selected = optionConfig.key === trendPresentation.basePeriodKey;
      basePeriodSelect.appendChild(option);
    });
    basePeriodSelect.disabled = trendPresentation.periodOptions.length <= 1;
    basePeriodSelect.addEventListener("change", () => {
      state.koreaGeoStatsTrendBasePeriodKey = basePeriodSelect.value;
      renderSelectionViews();
    });
    basePeriodField.append(basePeriodLabel, basePeriodSelect);
    controls.appendChild(basePeriodField);
  }

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
      state.metricExplorerMetricKey = "";
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
      state.metricExplorerMetricKey = "";
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
    button.classList.toggle("is-active", definition.key === activeDefinition?.key);
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

  const yearModeField = document.createElement("div");
  yearModeField.className = "metric-explorer-control";
  const yearModeLabel = document.createElement("label");
  yearModeLabel.setAttribute("for", "worldStatsYearModeSelect");
  yearModeLabel.textContent = "통계 연도";
  const yearModeSelect = document.createElement("select");
  yearModeSelect.id = "worldStatsYearModeSelect";
  countryStatsYearModeDefinitions.forEach((optionConfig) => {
    const option = document.createElement("option");
    option.value = optionConfig.key;
    option.textContent = optionConfig.label;
    option.selected = getWorldStatsYearMode() === optionConfig.key;
    yearModeSelect.appendChild(option);
  });
  yearModeSelect.addEventListener("change", () => {
    beginHistoryStep("지표 탐색기 변경");
    state.worldStatsYearMode = yearModeSelect.value;
    renderSelectionViews();
    renderMap();
  });
  yearModeField.append(yearModeLabel, yearModeSelect);

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
    state.metricExplorerTopN = clamp(Math.round(Number(topNInput.value) || 5), 1, 30);
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

  controls.append(groupingField, yearModeField, topNField, highlightField);

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

  wrapper.appendChild(
    buildControlDisclosure({
      title: "비교 범위와 표시 옵션",
      detail:
        state.metricExplorerDisplayMode === "scatter"
          ? `${state.metricExplorerGrouping === "continents" ? "대륙" : "국가"} · 상위 ${getMetricExplorerTopN()}개 · ${formatWorldStatsYearModeLabel()} · 산포도 축`
          : `${state.metricExplorerGrouping === "continents" ? "대륙" : "국가"} · 상위 ${getMetricExplorerTopN()}개${
              state.metricExplorerMapHighlightEnabled ? " · 지도 강조" : ""
            } · ${formatWorldStatsYearModeLabel()}`,
      contentNode: controls,
      open: state.metricExplorerOptionsExpanded,
      onToggle: (nextOpen) => {
        state.metricExplorerOptionsExpanded = nextOpen;
      },
    }),
  );
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

function buildControlDisclosure({ title, detail, contentNode, open = false, onToggle = null }) {
  const details = document.createElement("details");
  details.className = "control-disclosure";
  details.open = Boolean(open);

  const summary = document.createElement("summary");
  summary.className = "control-disclosure__summary";
  const titleNode = document.createElement("strong");
  titleNode.textContent = title;
  const detailNode = document.createElement("span");
  detailNode.textContent = detail;
  summary.append(titleNode, detailNode);

  contentNode.classList.add("control-disclosure__content");
  details.append(summary, contentNode);

  if (typeof onToggle === "function") {
    details.addEventListener("toggle", () => {
      onToggle(details.open);
    });
  }

  return details;
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
    valueSmall.textContent = entry.valueDetail ?? (entry.year ? `${entry.year}년` : "최신값");
    valueNode.append(valueStrong, valueSmall);

    row.append(rankNode, labelNode, valueNode);
    rowsNode.appendChild(row);
  });

  card.appendChild(rowsNode);
  return card;
}

function buildMetricExplorerMatrixTable({
  title,
  description,
  columns = [],
  rows = [],
  emptyText = "표시할 원자료 표가 없습니다.",
}) {
  const card = document.createElement("div");
  card.className = "metric-explorer-table metric-explorer-table--matrix";

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

  if (!(columns ?? []).length || !(rows ?? []).length) {
    card.appendChild(createCountryStatsUnavailable(emptyText));
    return card;
  }

  const wrap = document.createElement("div");
  wrap.className = "metric-explorer-table__matrix-wrap";
  const table = document.createElement("table");
  table.className = "metric-explorer-table__matrix";

  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  columns.forEach((column, index) => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.className = "metric-explorer-table__cell";
    if (index === 0) {
      cell.classList.add("is-primary");
    }
    if (column.align === "end") {
      cell.classList.add("is-align-end");
    }
    cell.textContent = column.label;
    headRow.appendChild(cell);
  });
  head.appendChild(headRow);
  table.appendChild(head);

  const body = document.createElement("tbody");
  rows.forEach((rowData) => {
    const row = document.createElement("tr");
    columns.forEach((column, index) => {
      const cell = document.createElement(index === 0 ? "th" : "td");
      if (index === 0) {
        cell.scope = "row";
      }
      cell.className = "metric-explorer-table__cell";
      if (index === 0) {
        cell.classList.add("is-primary");
      }
      if (column.align === "end") {
        cell.classList.add("is-align-end");
      }
      cell.textContent = rowData?.[column.key] ?? "—";
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
  table.appendChild(body);
  wrap.appendChild(table);
  card.appendChild(wrap);

  return card;
}

function buildKoreaGeoStatsTrendRawDataTable(trendPresentation) {
  const sampledGraphSeries = (trendPresentation?.series ?? [])
    .map((entry) => ({
      ...entry,
      points: [...(entry.points ?? [])].sort(
        (a, b) => parseKoreaGeoStatsPeriodKey(a.periodKey) - parseKoreaGeoStatsPeriodKey(b.periodKey),
      ),
    }))
    .filter((entry) => entry.points.length);
  const periodKeys = [...new Set(sampledGraphSeries.flatMap((entry) => entry.points.map((point) => point.periodKey)))].sort(
    (a, b) => parseKoreaGeoStatsPeriodKey(a) - parseKoreaGeoStatsPeriodKey(b),
  );
  const periodLabelByKey = new Map(
    sampledGraphSeries.flatMap((entry) => entry.points.map((point) => [point.periodKey, point.periodLabel ?? point.periodKey])),
  );
  const columns = [
    { key: "periodLabel", label: "시점" },
    ...sampledGraphSeries.map((entry, index) => ({
      key: `series-${index}`,
      label: entry.label,
      align: "end",
    })),
  ];
  const rows = periodKeys.map((periodKey) => {
    const row = {
      periodLabel: periodLabelByKey.get(periodKey) ?? periodKey,
    };
    sampledGraphSeries.forEach((entry, index) => {
      const point = entry.points.find((candidate) => candidate.periodKey === periodKey);
      row[`series-${index}`] = point
        ? trendPresentation.usesIndex
          ? trendPresentation.valueFormatter(point.value)
          : formatKoreaGeoStatsValue(trendPresentation.seriesDefinition, point.value)
        : "—";
    });
    return row;
  });

  return buildMetricExplorerMatrixTable({
    title: "그래프 값 표",
    description:
      trendPresentation?.usesIndex
        ? `그래프와 같은 ${trendPresentation.basePeriodLabel || "기준 시점"} = 100 기준 상댓값입니다.`
        : "그래프에 실제로 사용한 시점만 공식값으로 다시 펼쳤습니다.",
    columns,
    rows,
    emptyText: "표시할 시계열 원자료가 없습니다.",
  });
}

function buildKoreaGeoStatsScatterRawDataTable(entries, xDefinition, yDefinition, sizeDefinition) {
  return buildMetricExplorerMatrixTable({
    title: "산포도 원자료 표",
    description: `산포도에 찍힌 권역의 X·Y축 값과 버블 크기 기준값을 함께 정리했습니다.`,
    columns: [
      { key: "label", label: "권역" },
      { key: "xLabel", label: xDefinition?.label ?? "X축", align: "end" },
      { key: "yLabel", label: yDefinition?.label ?? "Y축", align: "end" },
      { key: "sizeLabel", label: sizeDefinition?.label ?? "버블 크기", align: "end" },
      { key: "detail", label: "시점" },
    ],
    rows: (entries ?? []).map((entry) => ({
      label: entry.label,
      xLabel: formatKoreaGeoStatsValue(xDefinition, entry.xValue),
      yLabel: formatKoreaGeoStatsValue(yDefinition, entry.yValue),
      sizeLabel: formatKoreaGeoStatsValue(sizeDefinition, entry.sizeDisplayValue),
      detail: entry.detail ?? "최신 시점",
    })),
    emptyText: "표시할 산포도 원자료가 없습니다.",
  });
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
      formatter: (value) => formatPeopleAmount(value),
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
      formatter: (value) => formatPeopleAmount(value),
      getValue: (stats) => getMetricFromPopulation(stats, "urbanPopulation"),
    },
    {
      key: "population-rural-total",
      category: "인구 변천 · 도시 · 이동",
      label: "촌락 인구",
      aggregation: "sum",
      formatter: (value) => formatPeopleAmount(value),
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
      formatter: (value) => formatPeopleAmount(value),
      getValue: (stats) => getMigrationMetric(stats, "netMigration"),
    },
    {
      key: "refugee-origin-total",
      category: "인구 변천 · 도시 · 이동",
      label: "난민 발생 수",
      aggregation: "sum",
      formatter: (value) => formatPeopleAmount(value),
      getValue: (stats) => getRefugeeMetric(stats, "refugeeOriginTotal"),
    },
    {
      key: "refugee-hosted-total",
      category: "인구 변천 · 도시 · 이동",
      label: "난민 수용 수",
      aggregation: "sum",
      formatter: (value) => formatPeopleAmount(value),
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
      key: "crops-wheat-area",
      category: "식량 · 가축",
      label: "밀 재배 면적",
      aggregation: "sum",
      formatter: (value) => formatHectareAmount(value),
      getValue: (stats) => getNamedCropMetric(stats, "wheat", "areaHarvested"),
    },
    {
      key: "crops-rice-area",
      category: "식량 · 가축",
      label: "쌀 재배 면적",
      aggregation: "sum",
      formatter: (value) => formatHectareAmount(value),
      getValue: (stats) => getNamedCropMetric(stats, "rice", "areaHarvested"),
    },
    {
      key: "crops-maize-area",
      category: "식량 · 가축",
      label: "옥수수 재배 면적",
      aggregation: "sum",
      formatter: (value) => formatHectareAmount(value),
      getValue: (stats) => getNamedCropMetric(stats, "maize", "areaHarvested"),
    },
    {
      key: "crops-wheat-yield",
      category: "식량 · 가축",
      label: "밀 단위 면적당 생산량",
      aggregation: "mean",
      formatter: (value) => formatCropYield(value),
      getValue: (stats) => getNamedCropMetric(stats, "wheat", "yield"),
    },
    {
      key: "crops-rice-yield",
      category: "식량 · 가축",
      label: "쌀 단위 면적당 생산량",
      aggregation: "mean",
      formatter: (value) => formatCropYield(value),
      getValue: (stats) => getNamedCropMetric(stats, "rice", "yield"),
    },
    {
      key: "crops-maize-yield",
      category: "식량 · 가축",
      label: "옥수수 단위 면적당 생산량",
      aggregation: "mean",
      formatter: (value) => formatCropYield(value),
      getValue: (stats) => getNamedCropMetric(stats, "maize", "yield"),
    },
    {
      key: "crops-wheat-food-share",
      category: "식량 · 가축",
      label: "밀 식용 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getCropUseMetric(stats, "wheat", "food"),
    },
    {
      key: "crops-rice-food-share",
      category: "식량 · 가축",
      label: "쌀 식용 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getCropUseMetric(stats, "rice", "food"),
    },
    {
      key: "crops-maize-feed-share",
      category: "식량 · 가축",
      label: "옥수수 사료용 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getCropUseMetric(stats, "maize", "feed"),
    },
    {
      key: "crops-maize-bioenergy-share",
      category: "식량 · 가축",
      label: "옥수수 바이오에너지·비식용 비중",
      aggregation: "mean",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getCropUseMetric(stats, "maize", "bioenergy"),
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
      formatter: (value) => formatHeadCountAmount(value),
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
      formatter: (value) => formatHeadCountAmount(value),
      getValue: (stats) => getNamedLivestockMetric(stats, "cattle", "stocks"),
    },
    {
      key: "livestock-pigs-stock",
      category: "식량 · 가축",
      label: "돼지 사육 두수",
      aggregation: "sum",
      formatter: (value) => formatHeadCountAmount(value),
      getValue: (stats) => getNamedLivestockMetric(stats, "pigs", "stocks"),
    },
    {
      key: "livestock-sheep-stock",
      category: "식량 · 가축",
      label: "양 사육 두수",
      aggregation: "sum",
      formatter: (value) => formatHeadCountAmount(value),
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
      key: "fossil-coal-export-share",
      category: "에너지 · 자원",
      label: "석탄 세계 수출 비율",
      aggregation: "sum",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getFossilTradeMetric(stats, "coal", "export"),
    },
    {
      key: "fossil-coal-import-share",
      category: "에너지 · 자원",
      label: "석탄 세계 수입 비율",
      aggregation: "sum",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getFossilTradeMetric(stats, "coal", "import"),
    },
    {
      key: "fossil-oil-export-share",
      category: "에너지 · 자원",
      label: "석유 세계 수출 비율",
      aggregation: "sum",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getFossilTradeMetric(stats, "oil", "export"),
    },
    {
      key: "fossil-oil-import-share",
      category: "에너지 · 자원",
      label: "석유 세계 수입 비율",
      aggregation: "sum",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getFossilTradeMetric(stats, "oil", "import"),
    },
    {
      key: "fossil-gas-export-share",
      category: "에너지 · 자원",
      label: "천연가스 세계 수출 비율",
      aggregation: "sum",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getFossilTradeMetric(stats, "gas", "export"),
    },
    {
      key: "fossil-gas-import-share",
      category: "에너지 · 자원",
      label: "천연가스 세계 수입 비율",
      aggregation: "sum",
      formatter: (value) => formatPercent(value),
      getValue: (stats) => getFossilTradeMetric(stats, "gas", "import"),
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
  return definitions.find((definition) => definition.key === state.metricExplorerMetricKey) ?? null;
}

function getMetricExplorerDefinitionByKey(definitions, key) {
  return definitions.find((definition) => definition.key === key) ?? definitions[0];
}

function getMetricExplorerResults(definition = getMetricExplorerDefinition(), grouping = state.metricExplorerGrouping) {
  if (!definition) {
    return [];
  }

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
  shell.appendChild(buildSuneungReferenceSummarySection());

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
      "선택한 통계 연도 기준으로 1차 에너지 소비량과 화석·재생·원자력 비중을 함께 정리했습니다.",
    ),
    buildEnergyStatsSection(
      stats?.energy?.electricity,
      "발전 구조",
      "선택한 통계 연도 기준으로 발전량과 발전원별 비중을 함께 정리했습니다.",
    ),
    buildFossilProductionStatsSection(stats?.energy?.fossilProduction),
    buildFossilTradeStatsSection(stats?.energy?.fossilTrade),
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
  note.className = "country-stats-source country-stats-year-mode";
  const noteTitle = document.createElement("strong");
  noteTitle.textContent = "자료 기준";
  const noteMeta = document.createElement("span");
  noteMeta.textContent = `${countryStatsMeta.generatedAt ?? "알 수 없음"} · ${getWorldStatsYearModeMeta().detail}`;
  note.append(noteTitle, noteMeta, buildCountryStatsYearModeControl());

  header.append(copy, note);
  return header;
}

function buildCountryStatsYearModeControl() {
  const field = document.createElement("label");
  field.className = "metric-explorer-control country-stats-year-mode__control";
  field.setAttribute("for", "countryStatsYearModeSelect");
  const label = document.createElement("span");
  label.textContent = "보기";
  const select = document.createElement("select");
  select.id = "countryStatsYearModeSelect";
  countryStatsYearModeDefinitions.forEach((optionConfig) => {
    const option = document.createElement("option");
    option.value = optionConfig.key;
    option.textContent = optionConfig.label;
    option.selected = getWorldStatsYearMode() === optionConfig.key;
    select.appendChild(option);
  });
  select.addEventListener("change", () => {
    beginHistoryStep("세계 통계 기준 변경");
    state.worldStatsYearMode = select.value;
    renderSelectionViews();
    renderMap();
  });
  field.append(label, select);
  return field;
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

  const renewablePowerShare = getVersionedEnergyEntry(stats.energy?.electricity)?.summaryShares?.renewables;
  if (renewablePowerShare != null) {
    tags.push(`재생전력 ${formatPercent(renewablePowerShare)}`);
  }

  return tags.slice(0, 5);
}

function buildCountryStatsMetaText(stats) {
  const parts = [];

  const populationYears = [getLatestPopulationRow(stats.population)?.year, getLatestPopulationRateRow(stats.population)?.year].filter(Boolean);
  if (populationYears.length) {
    parts.push(`인구 ${Math.max(...populationYears)}`);
  }

  const faostatYears = [
    ...getOrderedMetricEntries(stats.agriculture?.crops?.production, countryStatsCropOrder).map((entry) => entry.year),
    ...getOrderedMetricEntries(stats.agriculture?.crops?.areaHarvested, countryStatsCropOrder).map((entry) => entry.year),
    ...getOrderedMetricEntries(stats.agriculture?.crops?.yield, countryStatsCropOrder).map((entry) => entry.year),
    ...countryStatsCropOrder.flatMap((key) => {
      const entry = stats.agriculture?.crops?.trade?.[key];
      return [getVersionedStatEntry(entry?.import)?.year, getVersionedStatEntry(entry?.export)?.year];
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

  const populationStructure = getVersionedPopulationStructure(stats.populationStructure);
  if (populationStructure?.year || populationStructure?.density?.year) {
    const structureYear = Math.max(
      populationStructure?.year || 0,
      populationStructure?.density?.year || 0,
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
      getVersionedStatEntry(stats.migration?.migrantStockShare)?.year || 0,
      getVersionedStatEntry(stats.migration?.netMigration)?.year || 0,
      getVersionedStatEntry(stats.migration?.refugeeOriginTotal)?.year || 0,
      getVersionedStatEntry(stats.migration?.refugeeHostedTotal)?.year || 0,
    );
    if (migrationYear) {
      parts.push(`이동 ${migrationYear}`);
    }
  }

  const energyConsumption = getVersionedEnergyEntry(stats.energy?.consumption);
  const fossilProduction = getVersionedEnergyEntry(stats.energy?.fossilProduction);
  if (energyConsumption?.year) {
    parts.push(`에너지 ${energyConsumption.year}`);
  }
  if (fossilProduction?.year) {
    parts.push(`생산 ${fossilProduction.year}`);
  }

  if (!parts.length) {
    return "선택 국가의 세부 통계가 아직 준비되지 않았습니다.";
  }

  return `${parts.join(" · ")} 기준으로 묶은 ${formatWorldStatsYearModeLabel()} 통계입니다. 시계열·양·비중 그래프를 함께 보여주고, 여러 국가를 선택하면 비교 카드도 추가됩니다.`;
}

function buildCountryStatsSummaryGrid(stats) {
  const grid = document.createElement("div");
  grid.className = "country-stats-summary-grid";

  const latestPopulationRow = getLatestPopulationRow(stats?.population);
  const latestRateRow = getLatestPopulationRateRow(stats?.population);
  const cropTotals = getCropTotals(stats?.agriculture?.crops);
  const energyConsumption = getVersionedEnergyEntry(stats?.energy?.consumption);
  const energySummary = energyConsumption?.summaryShares ?? null;

  grid.append(
    createCountryStatsSummaryCard(
      getWorldStatsYearMode() === "latest" ? "최신 인구" : "기준 인구",
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
      cropTotals.topCropLabel ? `${cropTotals.topCropLabel} 비중 ${formatPercent(cropTotals.topCropShare)}` : "FAOSTAT 기준",
    ),
    createCountryStatsSummaryCard(
      "에너지 소비",
      energySummary ? `화석 ${formatPercent(energySummary.fossil)}` : "자료 없음",
      energySummary ? `재생 ${formatPercent(energySummary.renewables)} · 원자력 ${formatPercent(energySummary.nuclear)}` : "최신 가용연도 데이터 없음",
    ),
  );

  return grid;
}

function buildSuneungReferenceSummarySection() {
  const section = createCountryStatsSection(
    "교재 전세계 기준표",
    "국가별 프로필에 직접 귀속되지 않는 도시화 전망, 곡물 용도, 화석연료 이동 표를 함께 보관합니다.",
  );
  const summaries = countryStatsMeta.referenceSummaries ?? {};
  const chartGrid = document.createElement("div");
  chartGrid.className = "country-stats-chart-grid";

  const cityCounts = summaries.urbanization?.citySizeCounts ?? [];
  if (cityCounts.length) {
    chartGrid.append(
      buildAmountBarChartCard({
        title: "도시 규모별 도시 수 증가",
        description: "UN 2018 도시화 전망의 1975년 대비 2025년 도시 수 증가분입니다.",
        entries: cityCounts.map((entry) => {
          const startValue = Number(entry.values?.["1975"]) || 0;
          const endValue = Number(entry.values?.["2025"]) || 0;
          return {
            label: entry.sizeClass,
            value: Math.max(0, endValue - startValue),
            detail: `1975년 ${startValue}개 · 2025년 ${endValue}개`,
            color: "#111111",
          };
        }),
        valueFormatter: (value) => `${formatStatNumber(value)}개`,
      }),
    );
  }

  const cropUse = summaries.cropUse ?? {};
  const cropUseEntries = countryStatsCropOrder
    .map((key) => {
      const entry = getVersionedEnergyEntry(cropUse[key]);
      return entry ? { key, ...entry } : null;
    })
    .filter(Boolean);
  chartGrid.append(
    ...cropUseEntries.map((entry) =>
      buildShareCompositionCard({
        title: `세계 ${entry.label} 용도별 소비`,
        description: "FAOSTAT Food Balance Sheets 기준으로 식용·사료용·비식용·기타를 나눴습니다.",
        totalLabel: entry.total != null ? `${entry.year}년 세계 공급 ${formatTonAmount(entry.total)}` : `${entry.year}년 기준`,
        segments: Object.entries(entry.shares ?? {}).map(([key, share]) => ({
          label: countryStatsCropUseLabels[key] ?? key,
          share,
          amountLabel: entry.amounts?.[key] != null ? formatTonAmount(entry.amounts[key]) : null,
          color: getCountryStatsColor(key),
        })),
      }),
    ),
  );

  const fossilTradeRows = Object.entries(summaries.fossilTrade ?? {}).flatMap(([resourceKey, resource]) =>
    ["exports", "imports"].flatMap((directionKey) =>
      (resource?.[directionKey] ?? []).slice(0, 3).map(([iso3, countryLabel, share]) => ({
        label: `${resource.label} ${directionKey === "exports" ? "수출" : "수입"} · ${countryLabel}`,
        value: formatPercent(share),
        detail: `${resource.source} 2023 · ${iso3}`,
      })),
    ),
  );
  if (fossilTradeRows.length) {
    chartGrid.append(
      buildStatListCard({
        title: "화석연료 수출입 상위국",
        description: "교재 표의 상위 국가를 자원별로 3개씩 요약했습니다.",
        rows: fossilTradeRows,
      }),
    );
  }

  if (!chartGrid.childNodes.length) {
    section.appendChild(createCountryStatsUnavailable("표시할 교재 기준표가 아직 없습니다."));
    return section;
  }

  section.appendChild(chartGrid);
  return section;
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
      getWorldStatsYearMode() === "latest" ? "최신 도시 인구" : "기준 도시 인구",
      latestRow?.urbanPopulation != null ? formatStatNumber(latestRow.urbanPopulation) : "자료 없음",
      latestRow?.urbanShare != null ? `${latestRow.year}년 · ${formatPercent(latestRow.urbanShare)}` : "최신 가용연도",
    ),
    createCountryStatsMetric(
      getWorldStatsYearMode() === "latest" ? "최신 촌락 인구" : "기준 촌락 인구",
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
      title: getWorldStatsYearMode() === "latest" ? "최신 도시·촌락 구성" : "기준 도시·촌락 구성",
      description: "선택한 통계 연도의 도시화율과 촌락 인구 비중입니다.",
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
    "수능특강의 기준연도에 맞춰 밀·쌀·옥수수의 생산량, 용도별 소비 구조, 수출·수입량을 함께 정리했습니다.",
  );

  const productionEntries = getOrderedMetricEntries(crops?.production, countryStatsCropOrder);
  const areaEntries = getOrderedMetricEntries(crops?.areaHarvested, countryStatsCropOrder);
  const yieldEntries = getOrderedMetricEntries(crops?.yield, countryStatsCropOrder);
  const useEntries = countryStatsCropOrder
    .map((key) => {
      const entry = getVersionedEnergyEntry(crops?.use?.[key]);
      return entry ? { key, ...entry } : null;
    })
    .filter(Boolean);
  const tradeEntries = buildCropTradeChartEntries(crops?.trade);
  if (!productionEntries.length && !areaEntries.length && !yieldEntries.length && !useEntries.length && !tradeEntries.length) {
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
    createCountryStatsMetric(
      "옥수수 사료용",
      useEntries.find((entry) => entry.key === "maize")?.shares?.feed != null
        ? formatPercent(useEntries.find((entry) => entry.key === "maize").shares.feed)
        : "자료 없음",
      useEntries.find((entry) => entry.key === "maize")?.year
        ? `${useEntries.find((entry) => entry.key === "maize").year}년 용도별 소비`
        : "Food Balance Sheets",
    ),
  );
  section.appendChild(metricGrid);

  const chartGrid = document.createElement("div");
  chartGrid.className = "country-stats-chart-grid";
  const chartCards = [
    buildAmountBarChartCard({
      title: "곡물별 생산량",
      description: "선택한 통계 연도의 밀·쌀·옥수수 생산량입니다.",
      entries: productionEntries.map((entry) => ({
        label: entry.label,
        value: entry.value,
        detail: `${entry.year}년 · ${formatTonAmount(entry.value)}`,
        color: getCountryStatsColor(entry.key),
      })),
      valueFormatter: (value) => formatTonAmount(value),
    }),
  ];
  if (areaEntries.length) {
    chartCards.push(
      buildAmountBarChartCard({
        title: "곡물별 재배 면적",
        description: "수능특강에서 생산량과 함께 비교하는 재배 면적입니다.",
        entries: areaEntries.map((entry) => ({
          label: entry.label,
          value: entry.value,
          detail: `${entry.year}년 · ${formatHectareAmount(entry.value)}`,
          color: getCountryStatsColor(entry.key),
        })),
        valueFormatter: (value) => formatHectareAmount(value),
      }),
    );
  }
  if (yieldEntries.length) {
    chartCards.push(
      buildAmountBarChartCard({
        title: "단위 면적당 생산량",
        description: "FAOSTAT Yield를 t/ha로 환산했습니다.",
        entries: yieldEntries.map((entry) => ({
          label: entry.label,
          value: entry.value,
          detail: `${entry.year}년 · ${formatCropYield(entry.value)}`,
          color: getCountryStatsColor(entry.key),
        })),
        valueFormatter: (value) => formatCropYield(value),
      }),
    );
  }
  if (useEntries.length) {
    chartCards.push(
      ...useEntries.map((entry) =>
        buildShareCompositionCard({
          title: `${entry.label} 용도별 소비 구조`,
          description: "식용·사료용·바이오에너지 및 기타 비식용 용도를 나눠 봅니다.",
          totalLabel: entry.total != null ? `${entry.year}년 국내 공급 ${formatTonAmount(entry.total)}` : `${entry.year}년 기준`,
          segments: Object.entries(entry.shares ?? {}).map(([key, share]) => ({
            label: countryStatsCropUseLabels[key] ?? key,
            share,
            amountLabel: entry.amounts?.[key] != null ? formatTonAmount(entry.amounts[key]) : null,
            color: getCountryStatsColor(key),
          })),
        }),
      ),
    );
  }
  chartCards.push(
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
      description: "Detailed Trade Matrix에서 집계한 수입량과 수출량입니다.",
      entries: tradeEntries,
      valueFormatter: (value) => formatTonAmount(value),
    }),
  );
  chartGrid.append(...chartCards);
  section.appendChild(chartGrid);
  return section;
}

function buildLivestockStatsSection(livestock) {
  const section = createCountryStatsSection(
    "주요 가축 사육 · 육류 생산",
    "선택한 통계 연도 기준으로 소·돼지·양의 사육 두수와 대응하는 육류 생산량을 정리했습니다.",
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
      description: "소고기·돼지고기·양고기의 생산량입니다.",
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
  populationStructure = getVersionedPopulationStructure(populationStructure);

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
      getVersionedStatValue(migration?.migrantStockShare) != null ? formatPercent(getVersionedStatValue(migration.migrantStockShare)) : "자료 없음",
      getVersionedStatEntry(migration?.migrantStockShare)?.year ? `${getVersionedStatEntry(migration.migrantStockShare).year}년` : "최신 가용연도",
    ),
    createCountryStatsMetric(
      "순이동",
      getVersionedStatValue(migration?.netMigration) != null ? formatCompactStatNumber(getVersionedStatValue(migration.netMigration)) : "자료 없음",
      getVersionedStatEntry(migration?.netMigration)?.year ? `${getVersionedStatEntry(migration.netMigration).year}년` : "최신 가용연도",
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
        getVersionedStatEntry(migration?.migrantStockShare)
          ? {
              label: "국제이주민 비중",
              value: formatPercent(getVersionedStatEntry(migration.migrantStockShare).value),
              detail: migration.migrantStockTotal?.value != null
                ? `${formatStatNumber(migration.migrantStockTotal.value)}명 · ${getVersionedStatEntry(migration.migrantStockShare).year}년`
                : `${getVersionedStatEntry(migration.migrantStockShare).year}년`,
            }
          : null,
        getVersionedStatEntry(migration?.netMigration)
          ? {
              label: "순이동",
              value: formatCompactStatNumber(getVersionedStatEntry(migration.netMigration).value),
              detail: getVersionedStatEntry(migration.netMigration).year ? `${getVersionedStatEntry(migration.netMigration).year}년` : "최신값",
            }
          : null,
        getVersionedStatEntry(migration?.refugeeOriginTotal)
          ? {
              label: "난민 발생 수",
              value: formatCompactStatNumber(getVersionedStatEntry(migration.refugeeOriginTotal).value),
              detail: getVersionedStatEntry(migration.refugeeOriginTotal).year ? `${getVersionedStatEntry(migration.refugeeOriginTotal).year}년` : "최신값",
            }
          : null,
        getVersionedStatEntry(migration?.refugeeHostedTotal)
          ? {
              label: "난민 수용 수",
              value: formatCompactStatNumber(getVersionedStatEntry(migration.refugeeHostedTotal).value),
              detail: getVersionedStatEntry(migration.refugeeHostedTotal).year ? `${getVersionedStatEntry(migration.refugeeHostedTotal).year}년` : "최신값",
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
  entry = getVersionedEnergyEntry(entry);

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
    "수능특강 기준연도와 최신 가용연도 중 선택한 기준에 맞춰 석유·가스·석탄 생산량과 생산 내부 비중을 정리했습니다.",
  );
  entry = getVersionedEnergyEntry(entry);

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
      description: "선택한 통계 연도 생산량을 TWh 환산 기준으로 비교합니다.",
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

function buildFossilTradeStatsSection(trade) {
  const section = createCountryStatsSection(
    "화석연료 국제 이동",
    "교재의 EI/OPEC 2023년 표에 나온 석탄·석유·천연가스 수출입 비율을 국가별로 붙였습니다.",
  );

  const rows = ["coal", "oil", "gas"].flatMap((resourceKey) => {
    const entry = trade?.[resourceKey];
    if (!entry) {
      return [];
    }
    return ["export", "import"]
      .map((directionKey) => {
        const directionEntry = getVersionedStatEntry(entry[directionKey]);
        if (!Number.isFinite(Number(directionEntry?.value))) {
          return null;
        }
        return {
          resourceKey,
          directionKey,
          label: `${countryStatsEnergyLabels[resourceKey] ?? resourceKey} ${directionKey === "export" ? "수출" : "수입"}`,
          value: Number(directionEntry.value),
          detail: `${directionEntry.year}년 · 세계 ${directionKey === "export" ? "수출" : "수입"} 중 ${formatPercent(directionEntry.value)} · ${directionEntry.source ?? "교재"}`,
          color: getCountryStatsColor(resourceKey),
        };
      })
      .filter(Boolean);
  });

  if (!rows.length) {
    section.appendChild(createCountryStatsUnavailable("이 국가는 교재의 화석연료 수출입 상위 표에 포함되지 않았습니다."));
    return section;
  }

  const metricGrid = document.createElement("div");
  metricGrid.className = "country-stats-metric-grid";
  const topRow = [...rows].sort((a, b) => b.value - a.value)[0];
  metricGrid.append(
    createCountryStatsMetric(
      "최대 수출입 항목",
      topRow ? `${topRow.label} ${formatPercent(topRow.value)}` : "자료 없음",
      topRow?.detail ?? "교재 기준",
    ),
  );
  section.appendChild(metricGrid);

  const chartGrid = document.createElement("div");
  chartGrid.className = "country-stats-chart-grid";
  chartGrid.append(
    buildAmountBarChartCard({
      title: "세계 수출입 비율",
      description: "각 자원의 세계 수출량 또는 수입량에서 이 국가가 차지하는 비율입니다.",
      entries: rows,
      valueFormatter: (value) => formatPercent(value),
    }),
    buildStatListCard({
      title: "교재 표 원천",
      description: "석탄·석유는 EI, 천연가스 수출입은 OPEC 표를 반영했습니다.",
      rows: rows.map((row) => ({
        label: row.label,
        value: formatPercent(row.value),
        detail: row.detail,
      })),
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
          const energy = getVersionedEnergyEntry(stats?.energy?.consumption);
          const share = energy?.summaryShares?.fossil;
          const year = energy?.year;
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
          const electricity = getVersionedEnergyEntry(stats?.energy?.electricity);
          const total = electricity?.totalTWh;
          const year = electricity?.year;
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
    "faostatFoodBalance",
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
    "fossilTrade",
  ].forEach((key) => {
    const source = countryStatsMeta.sources?.[key];
    if (!source?.label) {
      return;
    }

    const card = document.createElement("div");
    card.className = "country-stats-source";
    if (source.url) {
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = source.label;
      card.appendChild(link);
    } else {
      card.textContent = source.label;
    }
    row.appendChild(card);
  });

  return row;
}

function getLatestPopulationRow(population) {
  return getSelectedPopulationRow(population);
}

function getPopulationRateRow(population, year) {
  return population?.rates?.rows?.find((row) => row.year === Number(year)) ?? null;
}

function getLatestPopulationRateRow(population) {
  return getSelectedPopulationRateRow(population);
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
  const cropMetrics = stats?.agriculture?.crops;
  const rawEntry = ["production", "areaHarvested", "yield"].includes(metricKey)
    ? cropMetrics?.[metricKey]?.[cropKey]
    : cropMetrics?.trade?.[cropKey]?.[metricKey];
  const sourceEntry = getVersionedStatEntry(rawEntry);
  if (!Number.isFinite(Number(sourceEntry?.value))) {
    return null;
  }

  return {
    value: Number(sourceEntry.value),
    year: sourceEntry.year ?? null,
    detail: sourceEntry.label ?? cropKey,
  };
}

function getCropExportRatioMetric(stats, cropKey) {
  const productionEntry = getVersionedStatEntry(stats?.agriculture?.crops?.production?.[cropKey]);
  const exportEntry = getVersionedStatEntry(stats?.agriculture?.crops?.trade?.[cropKey]?.export);
  const productionValue = Number(productionEntry?.value);
  const exportValue = Number(exportEntry?.value);
  if (!Number.isFinite(productionValue) || productionValue <= 0 || !Number.isFinite(exportValue)) {
    return null;
  }

  return {
    value: exportValue / productionValue * 100,
    year: Math.max(
      productionEntry?.year || 0,
      exportEntry?.year || 0,
    ) || null,
    detail: `${countryStatsCropLabels[cropKey] ?? cropKey} 생산 대비 수출`,
  };
}

function getCropUseMetric(stats, cropKey, useKey) {
  const entry = getVersionedEnergyEntry(stats?.agriculture?.crops?.use?.[cropKey]);
  const value = entry?.shares?.[useKey];
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return {
    value: Number(value),
    year: entry.year ?? null,
    detail: `${countryStatsCropLabels[cropKey] ?? cropKey} ${countryStatsCropUseLabels[useKey] ?? useKey}`,
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
  const entry = getVersionedStatEntry(stats?.agriculture?.livestock?.[metricKey]?.[livestockKey]);
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
  const rawSource = bucketKey === "fossilProduction" ? stats?.energy?.fossilProduction : stats?.energy?.[bucketKey];
  const source = getVersionedEnergyEntry(rawSource);
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

function getFossilTradeMetric(stats, resourceKey, directionKey) {
  const entry = getVersionedStatEntry(stats?.energy?.fossilTrade?.[resourceKey]?.[directionKey]);
  if (!Number.isFinite(Number(entry?.value))) {
    return null;
  }

  return {
    value: Number(entry.value),
    year: entry.year ?? null,
    detail: `${countryStatsEnergyLabels[resourceKey] ?? resourceKey} ${directionKey === "export" ? "수출" : "수입"}`,
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
  const entry = getVersionedPopulationStructure(stats?.populationStructure);
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
  const entry = getVersionedStatEntry(stats?.populationStructure?.density);
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
  const entry = getVersionedPopulationStructure(stats?.populationStructure);
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
  const entry = getVersionedStatEntry(stats?.migration?.[key]);
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
  const entry = getVersionedStatEntry(stats?.migration?.[key]);
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
  const energyEntry = getVersionedEnergyEntry(bucketKey === "electricity" ? stats?.energy?.electricity : stats?.energy?.consumption);
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

function formatHectareAmount(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  return `${formatCompactStatNumber(value)}ha`;
}

function formatCropYield(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  return `${(Number(value) / 1000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}t/ha`;
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

function formatCompactStatNumberWithUnit(value, unit, maximumFractionDigits = 1) {
  const formattedValue = formatCompactStatNumber(value, maximumFractionDigits);
  return formattedValue === "자료 없음" ? formattedValue : `${formattedValue} ${unit}`;
}

function formatPeopleAmount(value) {
  return formatCompactStatNumberWithUnit(value, "명");
}

function formatHeadCountAmount(value) {
  return formatCompactStatNumberWithUnit(value, "두");
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
  node.style.backgroundSize = visual.backgroundSize ?? "auto";
}

function getOrderedMetricEntries(map, order) {
  return order
    .map((key) => {
      const entry = getVersionedStatEntry(map?.[key]);
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
  const tradeEntries = countryStatsCropOrder
    .map((key) => {
      const entry = crops?.trade?.[key];
      if (!entry?.label) {
        return null;
      }
      return {
        key,
        label: entry.label,
        import: getVersionedStatEntry(entry.import),
        export: getVersionedStatEntry(entry.export),
      };
    })
    .filter(Boolean);
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
    const importEntry = getVersionedStatEntry(entry.import);
    const exportEntry = getVersionedStatEntry(entry.export);
    if (importEntry?.value != null) {
      rows.push({
        label: `${entry.label} 수입`,
        value: importEntry.value,
        detail: `${importEntry.year}년`,
        color,
      });
    }
    if (exportEntry?.value != null) {
      rows.push({
        label: `${entry.label} 수출`,
        value: exportEntry.value,
        detail: `${exportEntry.year}년`,
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
  const domain = getProgramGraphAxisDomain(allValues, { paddingRatio: 0.08, niceCount: 5 });
  const minimumValue = domain.minimum;
  const maximumValue = domain.maximum;
  const yTicks = getProgramGraphAxisTicks(minimumValue, maximumValue, 5);
  const layout = getProgramGraphLayout({
    stepCount: years.length,
    seriesCount: validSeries.length,
    yLabelMaxLength: Math.max(...yTicks.map((tick) => String(valueFormatter(tick)).length), 4),
    xLabelMaxLength: Math.max(...years.map((year) => String(year).length), 4),
  });
  const { width, height, plot } = layout;
  const yearStep = years.length > 1 ? plot.width / (years.length - 1) : 0;

  const yearToX = new Map(years.map((year, index) => [year, plot.left + yearStep * index]));
  const valueToY = (value) => plot.top + (maximumValue - Number(value)) / (maximumValue - minimumValue) * plot.height;

  const svg = createProgramGraphSvg("country-stats-line-chart", width, height, title);
  appendProgramGraphHorizontalGrid(svg, {
    plot,
    ticks: yTicks,
    minimum: minimumValue,
    maximum: maximumValue,
    valueToY,
    valueFormatter: (value) => valueFormatter(value),
  });
  appendProgramGraphFrame(svg, plot);

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
      dot.setAttribute("r", String(programGraphTheme.markerRadius));
      dot.setAttribute("class", "country-stats-line-chart__dot");
      dot.setAttribute("fill", visual.stroke || entry.color || "#111111");
      dot.setAttribute("stroke", programGraphTheme.colors.paper);
      dot.setAttribute("stroke-width", programGraphTheme.markerStrokeWidth);
      svg.appendChild(dot);
    });
  });

  years.forEach((year, index) => {
    if (years.length > 6 && index !== 0 && index !== years.length - 1 && index % 2 === 1) {
      return;
    }
    const label = createSvgElement("text");
    label.setAttribute("x", String(yearToX.get(year)));
    label.setAttribute("y", String(plot.bottom + 25));
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
  card.appendChild(createProgramGraphAxisRow("0", valueFormatter(maximumValue / 2), valueFormatter(maximumValue)));
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
  card.appendChild(createProgramGraphAxisRow("0", "50", "100(%)"));

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

  const xValues = validEntries.map((entry) => Number(entry.xValue));
  const yValues = validEntries.map((entry) => Number(entry.yValue));
  const xDomain = getProgramGraphAxisDomain(xValues, {
    forceZeroStart: xValues.every((value) => value >= 0),
    paddingRatio: 0.08,
    niceCount: 5,
  });
  const yDomain = getProgramGraphAxisDomain(yValues, {
    forceZeroStart: yValues.every((value) => value >= 0),
    paddingRatio: 0.08,
    niceCount: 5,
  });
  const minX = xDomain.minimum;
  const maxX = xDomain.maximum;
  const minY = yDomain.minimum;
  const maxY = yDomain.maximum;
  const xTicks = getProgramGraphAxisTicks(minX, maxX, 5);
  const yTicks = getProgramGraphAxisTicks(minY, maxY, 5);
  const maximumBubbleValue = Math.max(...validEntries.map((entry) => Number(entry.sizeValue)), 1);
  const layout = getProgramGraphLayout({
    stepCount: xTicks.length,
    seriesCount: validEntries.length,
    yLabelMaxLength: Math.max(...yTicks.map((tick) => String(yFormatter(tick)).length), 4),
    xLabelMaxLength: Math.max(...xTicks.map((tick) => String(xFormatter(tick)).length), 4),
    scatter: true,
  });
  const { width, height, plot } = layout;
  const xToPosition = (value) => plot.left + ((Number(value) - minX) / (maxX - minX)) * plot.width;
  const yToPosition = (value) => plot.top + (1 - (Number(value) - minY) / (maxY - minY)) * plot.height;
  const radiusForValue = (value) => {
    const ratio = Math.sqrt(Math.max(0, Number(value)) / maximumBubbleValue);
    return programGraphTheme.scatterMinRadius + ratio * (programGraphTheme.scatterMaxRadius - programGraphTheme.scatterMinRadius);
  };

  const svg = createProgramGraphSvg("country-stats-scatter-chart", width, height, `${title} 산포도`);
  appendProgramGraphVerticalGrid(svg, {
    plot,
    ticks: xTicks,
    minimum: minX,
    maximum: maxX,
    valueToX: xToPosition,
    valueFormatter: (value) => xFormatter(value),
  });
  appendProgramGraphHorizontalGrid(svg, {
    plot,
    ticks: yTicks,
    minimum: minY,
    maximum: maxY,
    valueToY: yToPosition,
    valueFormatter: (value) => yFormatter(value),
  });
  appendProgramGraphFrame(svg, plot);

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
    const x = xToPosition(entry.xValue);
    const y = yToPosition(entry.yValue);
    const radius = radiusForValue(entry.sizeValue);
    const placeLeft = x > plot.left + plot.width * 0.72;
    const label = createSvgElement("text");
    label.setAttribute("x", String(x + (placeLeft ? -radius - 4 : radius + 4)));
    label.setAttribute("y", String(clamp(y - 2, plot.top + 8, plot.bottom - 4)));
    label.setAttribute("text-anchor", placeLeft ? "end" : "start");
    label.setAttribute("class", "country-stats-scatter-chart__label");
    label.textContent = entry.label;
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

function getExamGraphPresetDefinition(presetKey = state.examGraphPresetKey) {
  return examGraphPresetDefinitions.find((definition) => definition.key === presetKey) ?? null;
}

function getExamGraphValueModeDefinition() {
  return examGraphValueModeDefinitions.find((definition) => definition.key === state.examGraphValueMode) ?? examGraphValueModeDefinitions[0];
}

function getExamGraphValueModeLabel(valueModeKey) {
  return examGraphValueModeDefinitions.find((definition) => definition.key === valueModeKey)?.label ?? "기본";
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
  const preset = getExamGraphPresetDefinition(presetKey);
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

function getExamGraphRandomCountryPriority(entryOrStats) {
  const stats = entryOrStats?.stats ?? entryOrStats;
  const iso3 = String(stats?.iso3 ?? "").trim().toUpperCase();
  if (!iso3) {
    return 0;
  }
  if (examGraphTextbookPriorityIso3.has(iso3)) {
    return 2;
  }
  return 0;
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

function roundToStep(value, step = 1) {
  return Math.round(Number(value) / step) * step;
}

function getExamGraphOrientation() {
  return examGraphOrientationDefinitions.some((definition) => definition.key === state.examGraphOrientation)
    ? state.examGraphOrientation
    : "auto";
}

function getExamGraphOrientationLabel(orientation = state.examGraphOrientation) {
  if (orientation === "auto") {
    return "자동 구도";
  }
  return examGraphOrientationDefinitions.find((definition) => definition.key === orientation)?.label ?? "가로형";
}

function getExamGraphAutoOrientation(model) {
  if (!model) {
    return "landscape";
  }
  if (model.chartKind === "trendLine" || model.chartKind === "scatter") {
    return "landscape";
  }
  const rows = Array.isArray(model.rows) ? model.rows : [];
  const longestLabel = Math.max(0, ...rows.map((row) => String(row.displayLabel ?? row.label ?? "").length));
  if (model.chartKind === "pairedBar" || model.chartKind === "timeCompare" || model.chartKind === "stacked") {
    return rows.length >= 4 || longestLabel >= 14 ? "portrait" : "landscape";
  }
  return rows.length >= 6 || longestLabel >= 16 ? "portrait" : "landscape";
}

function resolveExamGraphOrientation(model, orientation = getExamGraphOrientation()) {
  if (orientation === "portrait" || orientation === "landscape") {
    return orientation;
  }
  return getExamGraphAutoOrientation(model);
}

function getExamGraphResolvedOrientationLabel(model) {
  const orientation = getExamGraphOrientation();
  const resolvedOrientation = resolveExamGraphOrientation(model, orientation);
  const resolvedLabel = getExamGraphOrientationLabel(resolvedOrientation);
  return orientation === "auto" ? `자동 구도(${resolvedLabel})` : resolvedLabel;
}

function getExamGraphStyleMode() {
  return "basic";
}

function getExamGraphStyleModeDefinition(styleMode = getExamGraphStyleMode()) {
  return examGraphStyleModeDefinitions.find((definition) => definition.key === styleMode) ?? examGraphStyleModeDefinitions[0];
}

function isExamGraphBasicStyle() {
  return getExamGraphStyleMode() === "basic";
}

function getActiveExamGraphVisualTheme() {
  return isExamGraphBasicStyle() ? examGraphBasicTheme : examGraphTheme;
}

function getActiveExamGraphPatternDefinitions() {
  return isExamGraphBasicStyle() ? examGraphBasicPatternDefinitions : examGraphPatternDefinitions;
}

function getExamGraphLineStyle(index = 0) {
  const definitions = isExamGraphBasicStyle() ? examGraphBasicLineStyleDefinitions : examGraphLineStyleDefinitions;
  return definitions[((index % definitions.length) + definitions.length) % definitions.length];
}

function getExamGraphPreviewCount() {
  return clamp(Math.round(Number(state.examGraphPreviewCount) || 1), 1, 3);
}

function getExamGraphFontSizePt() {
  return clamp(roundToStep(Number(state.examGraphFontSizePt) || EXAM_GRAPH_FONT_BASE_PT, 0.5), 7, 9);
}

function formatExamGraphPtLabel(value = getExamGraphFontSizePt()) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}pt`;
}

function getExamGraphTextScale() {
  return getExamGraphFontSizePt() / EXAM_GRAPH_FONT_BASE_PT;
}

function scaleExamGraphFontSize(fontSize) {
  return clamp(roundToStep(Number(fontSize) * getExamGraphTextScale(), 0.5), 7, 9);
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
    state.examGraphPresetKey = "";
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
  if (!examGraphOrientationDefinitions.some((definition) => definition.key === state.examGraphOrientation)) {
    state.examGraphOrientation = "auto";
  }
  state.examGraphStyleMode = "basic";
  state.examGraphPreviewCount = getExamGraphPreviewCount();
  state.examGraphFontSizePt = getExamGraphFontSizePt();

  if (state.examGraphPresetKey) {
    const allowedValueModes = getExamGraphAllowedValueModes(state.examGraphPresetKey);
    if (!allowedValueModes.includes(state.examGraphValueMode)) {
      state.examGraphValueMode = allowedValueModes[0] ?? "amount";
    }
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
    shell.appendChild(
      createEmptyState(
        state.examGraphPresetKey
          ? "비교 그래프에 쓸 수 있는 통계가 아직 부족합니다. 다른 그래프 종류나 국가 조합을 골라 보세요."
          : "그래프 종류와 지표를 선택하면 비교 그래프가 표시됩니다.",
      ),
    );
    elements.examGraphPanel.appendChild(shell);
    return;
  }

  const summary = document.createElement("div");
  summary.className = "exam-graph-summary";
  summary.append(
    createMetricExplorerSummaryCard("프리셋", model.presetLabel, model.title),
    createMetricExplorerSummaryCard("비교 단위", model.groupLabel, model.scopeLabel),
    createMetricExplorerSummaryCard("표시 방식", model.displayModeLabel ?? "기본", model.displayModeDetail ?? model.metricDetail),
    createMetricExplorerSummaryCard("데이터", model.metricLabel, model.metricDetail),
  );
  shell.appendChild(summary);

  const grid = document.createElement("div");
  grid.className = "exam-graph-grid";
  grid.appendChild(buildExamGraphPreviewGallery(model));

  const sideColumn = document.createElement("div");
  sideColumn.className = "exam-graph-side-column";
  sideColumn.appendChild(buildExamGraphValueCard(model));
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
      updateExamGraphState("비교 그래프 변경", () => {
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
        updateExamGraphState("비교 그래프 대상 복귀", () => {
          state.examGraphFocusCountryIds = [];
          state.examGraphFocusLabel = "";
        });
        setStatus("비교 그래프 대상을 지도 선택 또는 자동 상위 추출 기준으로 되돌렸습니다.");
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
  wrapper.appendChild(
    buildControlDisclosure({
      title: "빠른 추천과 대상 변경",
      detail: "지도 선택 복귀, 국가 추천, 세트 추천",
      contentNode: actionRow,
      open: state.examGraphActionsExpanded,
      onToggle: (nextOpen) => {
        state.examGraphActionsExpanded = nextOpen;
      },
    }),
  );

  const guide = document.createElement("p");
  guide.className = "exam-graph-guide";
  guide.textContent = getExamGraphGuideText();
  wrapper.appendChild(guide);

  if (!getExamGraphPresetDefinition()) {
    return wrapper;
  }

  const coreControls = document.createElement("div");
  coreControls.className = "exam-graph-controls";
  const designControls = document.createElement("div");
  designControls.className = "exam-graph-controls";
  const valueModeOptions = getExamGraphValueModeOptionsForCurrentPreset();

  const aliasField = buildExamGraphToggleField("가명 처리", state.examGraphAliasMode, (checked) => {
    updateExamGraphState("비교 그래프 변경", () => {
      state.examGraphAliasMode = checked;
    });
  });

  const topNField = buildExamGraphNumberField("표시 개수", getExamGraphTopN(), 2, 12, (value) => {
    updateExamGraphState("비교 그래프 변경", () => {
      state.examGraphTopN = value;
    });
  });
  const orientationField = buildExamGraphSelectField(
    "그래프 방향",
    examGraphOrientationDefinitions,
    getExamGraphOrientation(),
    (value) => {
      updateExamGraphState("비교 그래프 변경", () => {
        state.examGraphOrientation = value;
      });
    },
  );
  const previewCountField = buildExamGraphSelectField(
    "나란히 보기",
    examGraphPreviewCountDefinitions,
    String(getExamGraphPreviewCount()),
    (value) => {
      updateExamGraphState("비교 그래프 변경", () => {
        state.examGraphPreviewCount = Number(value);
      });
    },
  );
  const fontSizeField = buildExamGraphNumberField(
    "글자 크기(pt)",
    getExamGraphFontSizePt(),
    7,
    9,
    (value) => {
      updateExamGraphState("비교 그래프 변경", () => {
        state.examGraphFontSizePt = value;
      });
    },
    { step: 0.5 },
  );

  const groupingField = buildExamGraphSelectField(
    "비교 단위",
    [
      { key: "countries", label: "국가별" },
      { key: "continents", label: "대륙별" },
    ],
    state.examGraphGrouping,
    (value) => {
      updateExamGraphState("비교 그래프 변경", () => {
        state.examGraphGrouping = value;
      });
    },
  );
  const mergeAmericasField = buildExamGraphToggleField("아메리카 통합", state.examGraphMergeAmericas, (checked) => {
    updateExamGraphState("비교 그래프 변경", () => {
      state.examGraphMergeAmericas = checked;
    });
  });

  const valueModeField =
    valueModeOptions.length > 1
      ? buildExamGraphSelectField("표시 방식", valueModeOptions, state.examGraphValueMode, (value) => {
          updateExamGraphState("비교 그래프 변경", () => {
            state.examGraphValueMode = value;
          });
        })
      : null;
  const shouldShowMergeAmericas = state.examGraphGrouping === "continents" || state.examGraphPresetKey === "top3share";

  if (shouldShowMergeAmericas) {
    designControls.appendChild(mergeAmericasField);
  }
  designControls.append(orientationField, previewCountField, fontSizeField, aliasField);

  if (state.examGraphPresetKey === "stacked100") {
    coreControls.append(
      buildExamGraphSelectField(
        "구성 지표",
        examGraphCompositionDefinitions,
        state.examGraphCompositionKey,
        (value) => {
          updateExamGraphState("비교 그래프 변경", () => {
            state.examGraphCompositionKey = value;
          });
        },
      ),
      groupingField,
      ...(valueModeField ? [valueModeField] : []),
      topNField,
    );
  } else if (state.examGraphPresetKey === "rankBars") {
    coreControls.append(
      buildExamGraphSelectField("기준 지표", getMetricExplorerDefinitions(), state.examGraphMetricKey, (value) => {
        updateExamGraphState("비교 그래프 변경", () => {
          state.examGraphMetricKey = value;
        });
      }),
      groupingField,
      ...(valueModeField ? [valueModeField] : []),
      topNField,
    );
  } else if (state.examGraphPresetKey === "pairedBars") {
    coreControls.append(
      buildExamGraphSelectField("지표 쌍", examGraphPairMetricDefinitions, state.examGraphPairKey, (value) => {
        updateExamGraphState("비교 그래프 변경", () => {
          state.examGraphPairKey = value;
        });
      }),
      groupingField,
      ...(valueModeField ? [valueModeField] : []),
      topNField,
    );
  } else if (state.examGraphPresetKey === "timeCompare") {
    coreControls.append(
      buildExamGraphSelectField(
        "비교 지표",
        examGraphTimeMetricDefinitions,
        state.examGraphTimeMetricKey,
        (value) => {
          updateExamGraphState("비교 그래프 변경", () => {
            state.examGraphTimeMetricKey = value;
          });
        },
      ),
      groupingField,
      ...(valueModeField ? [valueModeField] : []),
      buildExamGraphSelectField(
        "기준 시점",
        examGraphPopulationYears.map((year) => ({ key: String(year), label: `${year}년` })),
        String(state.examGraphYearStart),
        (value) => {
          updateExamGraphState("비교 그래프 변경", () => {
            state.examGraphYearStart = Number(value);
          });
        },
      ),
      buildExamGraphSelectField(
        "비교 시점",
        examGraphPopulationYears.map((year) => ({ key: String(year), label: `${year}년` })),
        String(state.examGraphYearEnd),
        (value) => {
          updateExamGraphState("비교 그래프 변경", () => {
            state.examGraphYearEnd = Number(value);
          });
        },
      ),
      topNField,
    );
  } else if (state.examGraphPresetKey === "trendLine") {
    coreControls.append(
      buildExamGraphSelectField(
        "시계열 지표",
        examGraphTimeMetricDefinitions,
        state.examGraphTimeMetricKey,
        (value) => {
          updateExamGraphState("비교 그래프 변경", () => {
            state.examGraphTimeMetricKey = value;
          });
        },
      ),
      groupingField,
      ...(valueModeField ? [valueModeField] : []),
      buildExamGraphSelectField(
        "시작 시점",
        examGraphPopulationYears.map((year) => ({ key: String(year), label: `${year}년` })),
        String(state.examGraphYearStart),
        (value) => {
          updateExamGraphState("비교 그래프 변경", () => {
            state.examGraphYearStart = Number(value);
          });
        },
      ),
      buildExamGraphSelectField(
        "종료 시점",
        examGraphPopulationYears.map((year) => ({ key: String(year), label: `${year}년` })),
        String(state.examGraphYearEnd),
        (value) => {
          updateExamGraphState("비교 그래프 변경", () => {
            state.examGraphYearEnd = Number(value);
          });
        },
      ),
      topNField,
    );
  } else if (state.examGraphPresetKey === "scatter") {
    const metricDefinitions = getMetricExplorerDefinitions();
    coreControls.append(
      groupingField,
      buildExamGraphSelectField("산포도 X축", metricDefinitions, state.examGraphScatterXKey, (value) => {
        updateExamGraphState("비교 그래프 변경", () => {
          state.examGraphScatterXKey = value;
        });
      }),
      buildExamGraphSelectField("산포도 Y축", metricDefinitions, state.examGraphScatterYKey, (value) => {
        updateExamGraphState("비교 그래프 변경", () => {
          state.examGraphScatterYKey = value;
        });
      }),
      buildExamGraphSelectField("버블 크기", metricDefinitions, state.examGraphScatterSizeKey, (value) => {
        updateExamGraphState("비교 그래프 변경", () => {
          state.examGraphScatterSizeKey = value;
        });
      }),
      topNField,
    );
  } else {
    coreControls.append(
      buildExamGraphSelectField(
        "기준 지표",
        examGraphTopShareMetricDefinitions,
        state.examGraphTopShareMetricKey,
        (value) => {
          updateExamGraphState("비교 그래프 변경", () => {
            state.examGraphTopShareMetricKey = value;
          });
        },
      ),
      ...(valueModeField ? [valueModeField] : []),
    );
  }

  wrapper.appendChild(coreControls);
  wrapper.appendChild(
    buildControlDisclosure({
      title: "디자인과 출력 형태",
      detail: `${getExamGraphStyleModeDefinition().label} · ${getExamGraphOrientationLabel()} · ${getExamGraphPreviewCount()}개 나란히 · ${formatExamGraphPtLabel()}`,
      contentNode: designControls,
      open: state.examGraphDesignExpanded,
      onToggle: (nextOpen) => {
        state.examGraphDesignExpanded = nextOpen;
      },
    }),
  );
  return wrapper;
}

function getExamGraphGuideText() {
  if (!getExamGraphPresetDefinition()) {
    return "위에서 그래프 종류를 먼저 선택하세요. 선택 전에는 자동 추천 그래프를 만들지 않습니다.";
  }
  const scopeMode = getExamGraphScopeMode();
  if (scopeMode === "focus") {
    return `${getExamGraphScopeSourceText()} 기준 추천 대상을 우선 사용합니다. 랜덤 추천은 수능특강에 실제로 자주 등장하는 국가를 먼저 고릅니다. '지도 선택 사용'을 누르면 다시 지도 선택 또는 자동 상위 추출 기준으로 돌아갑니다.`;
  }
  if (scopeMode === "selected") {
    return "지도에서 고른 국가를 우선 사용합니다. 필요하면 랜덤 버튼으로 수능특강 등장국 위주의 추천 국가나 통계를 바로 섞을 수 있습니다.";
  }
  return "선택 국가가 없으면 전체 자료에서 수능특강 등장국을 우선으로 골라 비교 그래프를 만듭니다. 랜덤 버튼은 출제에 잘 맞는 통계·국가 조합을 추천합니다.";
}

function getExamGraphValueModeOptionsForCurrentPreset() {
  const allowedKeys = getExamGraphAllowedValueModes(state.examGraphPresetKey);
  let options = examGraphValueModeDefinitions.filter((definition) => allowedKeys.includes(definition.key));
  if (!options.length) {
    return [];
  }

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

function buildExamGraphNumberField(labelText, value, min, max, onChange, { step = 1 } = {}) {
  const field = document.createElement("div");
  field.className = "exam-graph-control";
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener("input", () => {
    onChange(clamp(roundToStep(Number(input.value) || value, step), min, max));
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
    examGraphStyleMode: state.examGraphStyleMode,
    examGraphOrientation: state.examGraphOrientation,
    examGraphPreviewCount: state.examGraphPreviewCount,
    examGraphFontSizePt: state.examGraphFontSizePt,
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
    examGraphStyleMode: snapshot.examGraphStyleMode,
    examGraphOrientation: snapshot.examGraphOrientation,
    examGraphPreviewCount: snapshot.examGraphPreviewCount,
    examGraphFontSizePt: snapshot.examGraphFontSizePt,
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
      priority: getExamGraphRandomCountryPriority(stats),
      continent: getExamGraphContinentGroupName(candidate.continent, { grouping: state.examGraphGrouping, presetKey: state.examGraphPresetKey }),
    });
  });

  if (!uniqueCandidates.length) {
    return [];
  }

  const preferredCandidates = uniqueCandidates.filter((candidate) => candidate.priority > 0);
  const candidateBase = preferredCandidates.length >= desiredCount ? preferredCandidates : uniqueCandidates;
  const pool = shuffleExamGraphItems(
    [...candidateBase]
      .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || Number(b.score) - Number(a.score))
      .slice(0, Math.max(desiredCount * 5, 18)),
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
    label: picked.length ? `${baseLabel} · 수능특강 등장국 우선 ${picked.length}개국` : "",
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

  updateExamGraphState("비교 그래프 국가 추천", () => {
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

  updateExamGraphState(graphOnly ? "비교 그래프 통계 추천" : "비교 그래프 세트 추천", () => {
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
  if (!preset) {
    return null;
  }
  let model = null;
  if (preset.key === "stacked100") {
    model = buildExamStackedGraphModel();
  } else if (preset.key === "rankBars") {
    model = buildExamRankBarGraphModel();
  } else if (preset.key === "pairedBars") {
    model = buildExamPairedBarGraphModel();
  } else if (preset.key === "timeCompare") {
    model = buildExamTimeCompareModel();
  } else if (preset.key === "trendLine") {
    model = buildExamTrendLineGraphModel();
  } else if (preset.key === "scatter") {
    model = buildExamScatterGraphModel();
  } else {
    model = buildExamTopShareGraphModel();
  }
  if (!model) {
    return null;
  }
  model.orientationPreference = getExamGraphOrientation();
  model.orientation = resolveExamGraphOrientation(model, model.orientationPreference);
  model.orientationLabel = getExamGraphResolvedOrientationLabel(model);
  model.styleMode = getExamGraphStyleMode();
  model.styleModeLabel = getExamGraphStyleModeDefinition(model.styleMode).label;
  model.fontSizePt = getExamGraphFontSizePt();
  model.fontStretchPercent = getActiveExamGraphVisualTheme().font.stretchPercent;
  return model;
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

  return {
    presetKey: getExamGraphPresetDefinition().key,
    chartKind: "stacked",
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
    legendItems,
    chartMode: valueMode,
    valueFormatter: valueMode === "amount" ? amountFormatter : (value) => formatPercent(value),
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

  return {
    presetKey: getExamGraphPresetDefinition().key,
    chartKind: "singleBar",
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
    valueFormatter: transformed.valueFormatter,
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
  const legendItems = [
    { label: firstDefinition.label },
    { label: secondDefinition.label },
  ];

  return {
    presetKey: getExamGraphPresetDefinition().key,
    chartKind: "pairedBar",
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
    legendItems,
    valueFormatter: transformed.valueFormatter,
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
  const legendItems = [
    { label: `${state.examGraphYearStart}년` },
    { label: `${state.examGraphYearEnd}년` },
  ];

  return {
    presetKey: getExamGraphPresetDefinition().key,
    chartKind: "timeCompare",
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
    legendItems,
    valueFormatter: transformedRows.valueFormatter,
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

  return {
    presetKey: getExamGraphPresetDefinition().key,
    chartKind: "trendLine",
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
    years: result.years,
    valueFormatter: transformed.valueFormatter,
    exportName: buildExamGraphFileName(["trend", definition.key, state.examGraphYearStart, state.examGraphYearEnd, state.examGraphValueMode]),
    valueRows: buildExamGraphValueRows(
      rows,
      (row) => {
        const startPoint = row.points[0];
        const endPoint = row.points[row.points.length - 1];
        const actualLabel = `${startPoint.year}년 ${definition.formatter(startPoint.value)} → ${endPoint.year}년 ${definition.formatter(endPoint.value)}`;
        if (state.examGraphValueMode === "share") {
          return `${actualLabel} · 그래프값 ${formatPercent(startPoint.displayValue)} → ${formatPercent(endPoint.displayValue)}`;
        }
        if (state.examGraphValueMode === "relative") {
          return `${actualLabel} · 그래프값 ${formatRelativeIndex(startPoint.displayValue)} → ${formatRelativeIndex(endPoint.displayValue)}`;
        }
        return actualLabel;
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

  return {
    presetKey: getExamGraphPresetDefinition().key,
    chartKind: "scatter",
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
    xFormatter: xDefinition.formatter,
    yFormatter: yDefinition.formatter,
    sizeFormatter: sizeDefinition.formatter,
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
  const legendItems = [
    { label: "A" },
    { label: "B" },
    { label: "C" },
    { label: "기타" },
  ];

  return {
    presetKey: getExamGraphPresetDefinition().key,
    chartKind: "stacked",
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
    legendItems,
    chartMode: "share",
    valueFormatter: (value) => formatPercent(value),
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

const examGraphReadableLabelMap = new Map([
  ["Bolivia, Plurinational State of", "Bolivia"],
  ["Congo, the Democratic Republic of the", "DR Congo"],
  ["Congo, the Republic of", "Congo"],
  ["Iran, Islamic Republic of", "Iran"],
  ["Korea, Democratic People's Republic of", "North Korea"],
  ["Korea, Republic of", "South Korea"],
  ["Lao People's Democratic Republic", "Laos"],
  ["Moldova, Republic of", "Moldova"],
  ["Russian Federation", "Russia"],
  ["Syrian Arab Republic", "Syria"],
  ["Tanzania, United Republic of", "Tanzania"],
  ["Venezuela, Bolivarian Republic of", "Venezuela"],
]);

function getExamGraphReadableLabel(label) {
  const normalized = String(label ?? "").trim();
  return examGraphReadableLabelMap.get(normalized) ?? normalized;
}

function applyExamGraphDisplayLabels(rows) {
  return rows.map((row, index) => ({
    ...row,
    displayLabel: state.examGraphAliasMode ? getExamGraphAlias(index) : getExamGraphReadableLabel(row.label),
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

function buildExamGraphVariantModel(overrides) {
  const snapshot = captureExamGraphStateSnapshot();
  Object.assign(state, overrides);
  ensureExamGraphState();
  const variant = buildExamGraphModel();
  restoreExamGraphStateSnapshot(snapshot);
  ensureExamGraphState();
  return variant;
}

function buildExamGraphPreviewExportName(filename, suffix) {
  if (!suffix) {
    return filename;
  }
  const extensionMatch = String(filename).match(/(\.[a-z0-9]+)$/i);
  if (!extensionMatch) {
    return `${filename}-${suffix}`;
  }
  return String(filename).replace(extensionMatch[1], `-${suffix}${extensionMatch[1]}`);
}

function getExamGraphDefinitionCycleDistance(index, currentIndex, length) {
  if (length <= 0 || currentIndex < 0) {
    return index;
  }
  return (index - currentIndex + length) % length;
}

function getOrderedExamGraphAlternateDefinitions(definitions, currentKey, scoreDefinition) {
  const currentIndex = definitions.findIndex((definition) => definition.key === currentKey);
  return definitions
    .map((definition, index) => ({
      definition,
      distance: getExamGraphDefinitionCycleDistance(index, currentIndex, definitions.length),
      score: Number(scoreDefinition?.(definition) ?? 0),
    }))
    .filter((entry) => entry.definition.key !== currentKey)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }
      return left.distance - right.distance;
    })
    .map((entry) => entry.definition);
}

function getExamGraphCompositionCategoryKey(definitionOrKey) {
  const key = typeof definitionOrKey === "string" ? definitionOrKey : definitionOrKey?.key ?? "";
  if (key === "urban-rural" || key === "age-structure") {
    return "demography";
  }
  if (key === "industry-structure") {
    return "economy";
  }
  if (key === "religion-major") {
    return "religion";
  }
  if (key === "energy-summary" || key === "electricity-breakdown" || key === "fossil-production") {
    return "energy";
  }
  if (key === "crops-production" || key === "livestock-stocks" || key === "livestock-meat") {
    return "agriculture";
  }
  return "demography";
}

function getExamGraphPairCategoryKey(definitionOrKey) {
  const definition =
    typeof definitionOrKey === "string"
      ? examGraphPairMetricDefinitions.find((entry) => entry.key === definitionOrKey)
      : definitionOrKey;
  return getMetricExplorerDefinitionCategoryKey(definition?.metricKeys?.[0] ?? "");
}

function buildExamGraphScatterPreviewCandidateDefinitions() {
  const metricDefinitions = getMetricExplorerDefinitions();
  const xDefinition = getMetricExplorerDefinitionByKey(metricDefinitions, state.examGraphScatterXKey);
  const yDefinition = getMetricExplorerDefinitionByKey(metricDefinitions, state.examGraphScatterYKey);
  const sizeDefinition = getMetricExplorerDefinitionByKey(metricDefinitions, state.examGraphScatterSizeKey);
  const primaryCategoryKey = getMetricExplorerDefinitionCategoryKey(yDefinition ?? xDefinition ?? sizeDefinition);
  const yCandidates = getOrderedExamGraphAlternateDefinitions(metricDefinitions, yDefinition?.key, (definition) => {
    let score = 0;
    if (getMetricExplorerDefinitionCategoryKey(definition) === primaryCategoryKey) {
      score += 2;
    }
    if (getMetricExplorerDefinitionBaseMode(definition) === getMetricExplorerDefinitionBaseMode(yDefinition)) {
      score += 1;
    }
    return score;
  }).filter((definition) => ![xDefinition?.key, sizeDefinition?.key].includes(definition.key));
  const xCandidates = getOrderedExamGraphAlternateDefinitions(metricDefinitions, xDefinition?.key, (definition) => {
    let score = 0;
    if (getMetricExplorerDefinitionCategoryKey(definition) === primaryCategoryKey) {
      score += 2;
    }
    if (getMetricExplorerDefinitionBaseMode(definition) === getMetricExplorerDefinitionBaseMode(xDefinition)) {
      score += 1;
    }
    return score;
  }).filter((definition) => ![yDefinition?.key, sizeDefinition?.key].includes(definition.key));
  const sizeCandidates = getOrderedExamGraphAlternateDefinitions(metricDefinitions, sizeDefinition?.key, (definition) => {
    let score = 0;
    if (getMetricExplorerDefinitionCategoryKey(definition) === primaryCategoryKey) {
      score += 2;
    }
    if (getMetricExplorerDefinitionBaseMode(definition) === getMetricExplorerDefinitionBaseMode(sizeDefinition)) {
      score += 1;
    }
    return score;
  }).filter((definition) => ![xDefinition?.key, yDefinition?.key].includes(definition.key));

  const definitions = [];
  if (yCandidates[0]) {
    definitions.push({
      key: `scatter-y-${yCandidates[0].key}`,
      badge: `Y축 ${yCandidates[0].label}`,
      description: `X축 ${xDefinition?.label ?? "-"} · Y축 ${yCandidates[0].label} · 버블 ${sizeDefinition?.label ?? "-"}`,
      suffix: `scatter-y-${yCandidates[0].key}`,
      overrides: { examGraphScatterYKey: yCandidates[0].key },
    });
  }
  if (xCandidates[0]) {
    definitions.push({
      key: `scatter-x-${xCandidates[0].key}`,
      badge: `X축 ${xCandidates[0].label}`,
      description: `X축 ${xCandidates[0].label} · Y축 ${yDefinition?.label ?? "-"} · 버블 ${sizeDefinition?.label ?? "-"}`,
      suffix: `scatter-x-${xCandidates[0].key}`,
      overrides: { examGraphScatterXKey: xCandidates[0].key },
    });
  }
  if (sizeCandidates[0]) {
    definitions.push({
      key: `scatter-size-${sizeCandidates[0].key}`,
      badge: `버블 ${sizeCandidates[0].label}`,
      description: `X축 ${xDefinition?.label ?? "-"} · Y축 ${yDefinition?.label ?? "-"} · 버블 ${sizeCandidates[0].label}`,
      suffix: `scatter-size-${sizeCandidates[0].key}`,
      overrides: { examGraphScatterSizeKey: sizeCandidates[0].key },
    });
  }
  return definitions;
}

function getExamGraphPreviewCandidateDefinitions() {
  const presetKey = state.examGraphPresetKey;

  if (presetKey === "stacked100") {
    const currentDefinition = getExamGraphCompositionDefinition();
    const currentCategoryKey = getExamGraphCompositionCategoryKey(currentDefinition);
    return getOrderedExamGraphAlternateDefinitions(
      examGraphCompositionDefinitions,
      currentDefinition.key,
      (definition) => Number(getExamGraphCompositionCategoryKey(definition) === currentCategoryKey),
    ).map((definition) => ({
      key: `composition-${definition.key}`,
      badge: definition.label,
      description: definition.description,
      suffix: definition.key,
      overrides: { examGraphCompositionKey: definition.key },
    }));
  }

  if (presetKey === "rankBars") {
    const currentDefinition = getExamGraphMetricDefinition();
    const currentCategoryKey = getMetricExplorerDefinitionCategoryKey(currentDefinition);
    const currentBaseMode = getMetricExplorerDefinitionBaseMode(currentDefinition);
    return getOrderedExamGraphAlternateDefinitions(getMetricExplorerDefinitions(), currentDefinition.key, (definition) => {
      let score = 0;
      if (getMetricExplorerDefinitionCategoryKey(definition) === currentCategoryKey) {
        score += 2;
      }
      if (getMetricExplorerDefinitionBaseMode(definition) === currentBaseMode) {
        score += 1;
      }
      return score;
    }).map((definition) => ({
      key: `metric-${definition.key}`,
      badge: definition.label,
      description: definition.category,
      suffix: definition.key,
      overrides: { examGraphMetricKey: definition.key },
    }));
  }

  if (presetKey === "pairedBars") {
    const currentDefinition = getExamGraphPairDefinition();
    const currentCategoryKey = getExamGraphPairCategoryKey(currentDefinition);
    return getOrderedExamGraphAlternateDefinitions(
      examGraphPairMetricDefinitions,
      currentDefinition.key,
      (definition) => Number(getExamGraphPairCategoryKey(definition) === currentCategoryKey),
    ).map((definition) => ({
      key: `pair-${definition.key}`,
      badge: definition.label,
      description: definition.description,
      suffix: definition.key,
      overrides: { examGraphPairKey: definition.key },
    }));
  }

  if (presetKey === "timeCompare" || presetKey === "trendLine") {
    const currentDefinition = getExamGraphTimeMetricDefinition();
    const currentCategoryKey = getMetricExplorerDefinitionCategoryKey(currentDefinition.key);
    const currentBaseMode = getMetricExplorerDefinitionBaseMode(currentDefinition.key);
    return getOrderedExamGraphAlternateDefinitions(examGraphTimeMetricDefinitions, currentDefinition.key, (definition) => {
      let score = 0;
      if (getMetricExplorerDefinitionCategoryKey(definition.key) === currentCategoryKey) {
        score += 2;
      }
      if (getMetricExplorerDefinitionBaseMode(definition.key) === currentBaseMode) {
        score += 1;
      }
      return score;
    }).map((definition) => ({
      key: `time-${definition.key}`,
      badge: definition.label,
      description:
        presetKey === "trendLine"
          ? `${state.examGraphYearStart}년~${state.examGraphYearEnd}년 시계열`
          : `${state.examGraphYearStart}년 ↔ ${state.examGraphYearEnd}년 비교`,
      suffix: definition.key,
      overrides: { examGraphTimeMetricKey: definition.key },
    }));
  }

  if (presetKey === "scatter") {
    return buildExamGraphScatterPreviewCandidateDefinitions();
  }

  const currentDefinition = getExamGraphTopShareMetricDefinition();
  const currentCategoryKey = getMetricExplorerDefinitionCategoryKey(currentDefinition.key);
  const currentBaseMode = getMetricExplorerDefinitionBaseMode(currentDefinition.key);
  return getOrderedExamGraphAlternateDefinitions(examGraphTopShareMetricDefinitions, currentDefinition.key, (definition) => {
    let score = 0;
    if (getMetricExplorerDefinitionCategoryKey(definition.key) === currentCategoryKey) {
      score += 2;
    }
    if (getMetricExplorerDefinitionBaseMode(definition.key) === currentBaseMode) {
      score += 1;
    }
    return score;
  }).map((definition) => ({
    key: `topshare-${definition.key}`,
    badge: definition.label,
    description: "대륙별 상위 3개국과 기타 비중",
    suffix: definition.key,
    overrides: { examGraphTopShareMetricKey: definition.key },
  }));
}

function buildExamGraphPreviewEntries(model) {
  const entries = [
    {
      key: "current",
      badge: "현재 통계",
      description: `${model.styleModeLabel} · ${model.orientationLabel} · ${formatExamGraphPtLabel(model.fontSizePt)} · ${model.displayModeLabel ?? "기본"}`,
      exportName: buildExamGraphPreviewExportName(
        model.exportName,
        `${model.styleMode}-${model.orientationPreference}-${model.orientation}-${String(model.fontSizePt).replace(".", "_")}pt`,
      ),
      model,
    },
  ];
  const targetCount = getExamGraphPreviewCount();
  if (targetCount === 1) {
    return entries;
  }

  const candidateDefinitions = getExamGraphPreviewCandidateDefinitions();
  const signatures = new Set([JSON.stringify([model.presetKey, model.metricKey, model.exportName])]);
  candidateDefinitions.forEach((candidate) => {
    if (entries.length >= targetCount) {
      return;
    }
    const variant = buildExamGraphVariantModel(candidate.overrides);
    if (!variant) {
      return;
    }
    const signature = JSON.stringify([variant.presetKey, variant.metricKey, variant.exportName]);
    if (signatures.has(signature)) {
      return;
    }
    signatures.add(signature);
    entries.push({
      key: candidate.key,
      badge: candidate.badge,
      description: `${variant.styleModeLabel} · ${candidate.description}`,
      exportName: buildExamGraphPreviewExportName(variant.exportName, `${candidate.suffix}-${variant.styleMode}`),
      model: variant,
    });
  });

  return entries;
}

function buildExamGraphPreviewGallery(model) {
  const gallery = document.createElement("div");
  gallery.className = "exam-graph-preview-gallery";
  gallery.dataset.style = model.styleMode ?? getExamGraphStyleMode();
  gallery.style.setProperty("--exam-graph-preview-columns", String(getExamGraphPreviewCount()));
  buildExamGraphPreviewEntries(model).forEach((entry) => {
    gallery.appendChild(buildExamGraphPreviewCard(entry));
  });
  return gallery;
}

function buildExamGraphPreviewCard(preview) {
  const model = preview.model;
  const card = document.createElement("div");
  card.className = "exam-graph-preview-card country-stats-chart-card";
  card.dataset.examGraphStyle = model.styleMode ?? getExamGraphStyleMode();

  const stage = document.createElement("div");
  stage.className = "exam-graph-stage";
  stage.dataset.orientation = model.orientation ?? "landscape";
  stage.dataset.style = model.styleMode ?? getExamGraphStyleMode();
  stage.appendChild(buildExamGraphNativeChart(model));
  card.appendChild(stage);

  return card;
}

function createExamGraphNativeNode(className, textContent = "") {
  const node = document.createElement("div");
  node.className = className;
  if (textContent) {
    node.textContent = textContent;
  }
  return node;
}

let examGraphNativeLineLayoutScheduled = false;
let examGraphNativeLineResizeBound = false;

function layoutExamGraphNativeLineSegments(plot) {
  if (!plot?.querySelectorAll) {
    return;
  }
  const width = plot.clientWidth;
  const height = plot.clientHeight;
  if (!width || !height) {
    return;
  }

  plot.querySelectorAll(".exam-graph-native-line-segment").forEach((segment) => {
    const x1 = (Number(segment.dataset.x1) / 100) * width;
    const y1 = (Number(segment.dataset.y1) / 100) * height;
    const x2 = (Number(segment.dataset.x2) / 100) * width;
    const y2 = (Number(segment.dataset.y2) / 100) * height;
    if (![x1, y1, x2, y2].every(Number.isFinite)) {
      return;
    }
    const dx = x2 - x1;
    const dy = y2 - y1;
    segment.style.left = `${x1}px`;
    segment.style.top = `${y1}px`;
    segment.style.width = `${Math.hypot(dx, dy)}px`;
    segment.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  });
}

function scheduleExamGraphNativeLineLayout() {
  if (typeof window === "undefined" || typeof document === "undefined" || examGraphNativeLineLayoutScheduled) {
    return;
  }
  examGraphNativeLineLayoutScheduled = true;
  window.requestAnimationFrame(() => {
    examGraphNativeLineLayoutScheduled = false;
    document.querySelectorAll(".exam-graph-native-line-plot").forEach((plot) => {
      layoutExamGraphNativeLineSegments(plot);
    });
  });
}

function ensureExamGraphNativeLineLayoutEvents() {
  if (typeof window === "undefined" || examGraphNativeLineResizeBound) {
    return;
  }
  examGraphNativeLineResizeBound = true;
  window.addEventListener("resize", scheduleExamGraphNativeLineLayout, { passive: true });
  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleExamGraphNativeLineLayout).catch(() => {});
  }
}

function getExamGraphNativeAxis(values, valueFormatter, options = {}) {
  const { minimum, maximum } = getExamGraphAxisDomain(values, options);
  const ticks = getExamGraphAxisTicks(minimum, maximum, 5);
  const tickFormat = buildExamGraphAxisTickFormatter([...ticks, ...(values ?? [])], valueFormatter ?? ((value) => String(value)));
  return {
    minimum,
    maximum,
    ticks,
    formatTick: tickFormat.formatTick,
    unitLabel: tickFormat.unitLabel,
    toPercent: (value) => {
      const rangePadding = Number(options.rangePadding ?? 7);
      if (Math.abs(maximum - minimum) < 0.000001) {
        return 50;
      }
      return rangePadding + ((Number(value) - minimum) / (maximum - minimum)) * (100 - rangePadding * 2);
    },
  };
}

function appendExamGraphNativeGrid(plot, axis, direction = "x") {
  axis.ticks.forEach((tick) => {
    const line = createExamGraphNativeNode(`exam-graph-native-grid-line exam-graph-native-grid-line--${direction}`);
    line.classList.toggle("is-zero", Math.abs(Number(tick)) < 0.000001);
    if (direction === "x") {
      line.style.left = `${axis.toPercent(tick)}%`;
    } else {
      line.style.top = `${axis.toPercent(tick)}%`;
    }
    plot.appendChild(line);
  });
}

function appendExamGraphNativeXAxis(chart, axis) {
  const axisRow = createExamGraphNativeNode("exam-graph-native-axis-row");
  axisRow.appendChild(createExamGraphNativeNode("exam-graph-native-axis-spacer"));
  const plotAxis = createExamGraphNativeNode("exam-graph-native-axis-plot");
  axis.ticks.forEach((tick, index) => {
    const label = createExamGraphNativeNode("exam-graph-native-axis-tick", axis.formatTick(tick));
    if (index === 0) {
      label.classList.add("is-edge-start");
    }
    if (index === axis.ticks.length - 1) {
      label.classList.add("is-edge-end");
    }
    label.style.left = `${axis.toPercent(tick)}%`;
    plotAxis.appendChild(label);
  });
  if (axis.unitLabel) {
    const unit = createExamGraphNativeNode("exam-graph-native-axis-unit", axis.unitLabel);
    plotAxis.appendChild(unit);
  }
  axisRow.appendChild(plotAxis);
  chart.appendChild(axisRow);
}

function appendExamGraphNativeLegend(chart, legendItems = []) {
  if (!legendItems.length) {
    return;
  }
  const legend = createExamGraphNativeNode("exam-graph-native-legend");
  legendItems.forEach((item, index) => {
    const legendItem = createExamGraphNativeNode("exam-graph-native-legend-item");
    const swatch = createExamGraphNativeNode("exam-graph-native-swatch");
    swatch.dataset.series = String(index);
    const label = document.createElement("span");
    label.textContent = item.label;
    legendItem.append(swatch, label);
    legend.appendChild(legendItem);
  });
  chart.appendChild(legend);
}

const EXAM_GRAPH_CLIMATE_SERIES = ["#111111", "#666666", "#a9a9a9", "#dedede"];
const EXAM_GRAPH_CLIMATE_LINE_STYLES = [
  { marker: "circle", dasharray: "" },
  { marker: "square", dasharray: "10 7" },
  { marker: "triangle", dasharray: "5 7" },
  { marker: "diamond", dasharray: "2 6" },
];

function setExamGraphClimateSvgAttributes(node, attributes = {}) {
  Object.entries(attributes).forEach(([key, value]) => {
    if (value == null) {
      return;
    }
    node.setAttribute(key, String(value));
  });
  return node;
}

function createExamGraphClimateSvgElement(tagName, attributes = {}, textContent = null) {
  const node = createSvgElement(tagName);
  setExamGraphClimateSvgAttributes(node, attributes);
  if (textContent != null) {
    node.textContent = String(textContent);
  }
  return node;
}

function appendExamGraphClimateSvgElement(parent, tagName, attributes = {}, textContent = null) {
  const node = createExamGraphClimateSvgElement(tagName, attributes, textContent);
  parent.appendChild(node);
  return node;
}

function getExamGraphClimateSeriesColor(index) {
  return EXAM_GRAPH_CLIMATE_SERIES[index % EXAM_GRAPH_CLIMATE_SERIES.length];
}

function createExamGraphClimateSvg(width, height, ariaLabel, modifier = "") {
  const svg = createExamGraphClimateSvgElement("svg", {
    class: `exam-graph-climate-svg${modifier ? ` exam-graph-climate-svg--${modifier}` : ""}`,
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": ariaLabel || "인문지리 통계 그래프",
  });
  return svg;
}

function getExamGraphClimateScale(domainStart, domainEnd, rangeStart, rangeEnd) {
  const start = Number(domainStart);
  const end = Number(domainEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || Math.abs(end - start) < 0.000001) {
    return () => (rangeStart + rangeEnd) / 2;
  }
  return (value) => rangeStart + ((Number(value) - start) / (end - start)) * (rangeEnd - rangeStart);
}

function getExamGraphClimateYScale(domainStart, domainEnd, plotTop, plotBottom) {
  const scale = getExamGraphClimateScale(domainStart, domainEnd, plotBottom, plotTop);
  return (value) => scale(value);
}

function getExamGraphClimateHorizontalLayout(rows, { legend = false, paired = false, orientation = "landscape" } = {}) {
  const rowCount = rows?.length || 1;
  const longestLabel = Math.max(0, ...(rows ?? []).map((row) => String(row.displayLabel ?? row.label ?? "").length));
  const isPortrait = orientation === "portrait";
  const left = clamp(Math.round(86 + longestLabel * 5.5), 118, 232);
  const top = 24;
  const right = isPortrait ? 28 : 36;
  const bottom = legend ? (isPortrait ? 88 : 78) : (isPortrait ? 58 : 52);
  const plotWidth = isPortrait
    ? clamp(292 + rowCount * 16 + (paired ? 40 : 0), 340, 470)
    : clamp(438 + rowCount * 24 + (paired ? 64 : 0), 520, 720);
  const width = left + plotWidth + right;
  const rowHeight = isPortrait
    ? paired ? 66 : rowCount >= 8 ? 50 : rowCount >= 6 ? 54 : 58
    : paired ? 58 : rowCount >= 8 ? 43 : rowCount >= 6 ? 46 : 50;
  const plotHeight = Math.max(paired ? 190 : 156, rowCount * rowHeight);
  const height = top + plotHeight + bottom;
  return {
    width,
    height,
    margin: { top, right, bottom, left },
    plotLeft: left,
    plotRight: left + plotWidth,
    plotTop: top,
    plotBottom: top + plotHeight,
    plotWidth,
    plotHeight,
  };
}

function getExamGraphClimateCartesianLayout({
  legend = false,
  steps = 6,
  series = 1,
  scatter = false,
  orientation = "landscape",
} = {}) {
  const isPortrait = orientation === "portrait";
  const width = isPortrait
    ? clamp(430 + Number(steps || 0) * 12 + (scatter ? 28 : 0), 500, 640)
    : clamp(620 + Number(steps || 0) * 18 + (scatter ? 56 : 0), 720, 900);
  const plotHeight = isPortrait
    ? clamp((scatter ? 302 : 286) + Number(series || 1) * 16, 320, 470)
    : clamp((scatter ? 232 : 214) + Number(series || 1) * 12, 232, 320);
  const margin = {
    top: 26,
    right: scatter ? (isPortrait ? 34 : 42) : (isPortrait ? 26 : 32),
    bottom: legend ? (isPortrait ? 92 : 86) : (isPortrait ? 66 : 60),
    left: isPortrait ? 64 : 60,
  };
  const height = margin.top + plotHeight + margin.bottom;
  return {
    width,
    height,
    margin,
    plotLeft: margin.left,
    plotRight: width - margin.right,
    plotTop: margin.top,
    plotBottom: height - margin.bottom,
    plotWidth: width - margin.left - margin.right,
    plotHeight,
  };
}

function appendExamGraphClimateFrame(svg, layout) {
  appendExamGraphClimateSvgElement(svg, "rect", {
    class: "exam-graph-svg-frame",
    x: layout.plotLeft,
    y: layout.plotTop,
    width: layout.plotWidth,
    height: layout.plotHeight,
  });
}

function appendExamGraphClimateXAxis(svg, axis, layout, xScale) {
  axis.ticks.forEach((tick, index) => {
    const x = xScale(tick);
    appendExamGraphClimateSvgElement(svg, "line", {
      class: `exam-graph-svg-grid exam-graph-svg-grid--x${Math.abs(Number(tick)) < 0.000001 ? " is-zero" : ""}`,
      x1: x,
      y1: layout.plotTop,
      x2: x,
      y2: layout.plotBottom,
    });
    const label = appendExamGraphClimateSvgElement(svg, "text", {
      class: "exam-graph-svg-tick",
      x,
      y: layout.plotBottom + 24,
      "text-anchor": index === 0 ? "start" : index === axis.ticks.length - 1 ? "end" : "middle",
    }, axis.formatTick(tick));
    if (index === 0) {
      label.setAttribute("dx", "1");
    }
  });
  if (axis.unitLabel) {
    appendExamGraphClimateSvgElement(svg, "text", {
      class: "exam-graph-svg-unit",
      x: layout.plotRight,
      y: layout.height - 16,
      "text-anchor": "end",
    }, axis.unitLabel);
  }
}

function appendExamGraphClimateYAxis(svg, axis, layout, yScale) {
  axis.ticks.forEach((tick) => {
    const y = yScale(tick);
    appendExamGraphClimateSvgElement(svg, "line", {
      class: `exam-graph-svg-grid exam-graph-svg-grid--y${Math.abs(Number(tick)) < 0.000001 ? " is-zero" : ""}`,
      x1: layout.plotLeft,
      y1: y,
      x2: layout.plotRight,
      y2: y,
    });
    appendExamGraphClimateSvgElement(svg, "text", {
      class: "exam-graph-svg-tick",
      x: layout.plotLeft - 12,
      y: y + 4,
      "text-anchor": "end",
    }, axis.formatTick(tick));
  });
  if (axis.unitLabel) {
    appendExamGraphClimateSvgElement(svg, "text", {
      class: "exam-graph-svg-unit exam-graph-svg-unit--y",
      x: layout.plotLeft,
      y: 16,
      "text-anchor": "start",
    }, axis.unitLabel);
  }
}

function appendExamGraphClimateLegend(svg, items = [], layout, { line = false } = {}) {
  if (!items.length) {
    return;
  }
  const gap = 18;
  const rowGap = 21;
  const maxRowWidth = layout.width - 36;
  const itemWidths = items.map((item) => clamp(34 + String(item.label ?? "").length * 8.4, 60, maxRowWidth));
  const rows = [];
  items.forEach((item, index) => {
    const currentRow = rows[rows.length - 1];
    const nextWidth = itemWidths[index];
    if (!currentRow || currentRow.width + gap + nextWidth > maxRowWidth) {
      rows.push({ items: [{ item, index, width: nextWidth }], width: nextWidth });
      return;
    }
    currentRow.items.push({ item, index, width: nextWidth });
    currentRow.width += gap + nextWidth;
  });
  const firstY = layout.height - 18 - Math.max(0, rows.length - 1) * rowGap;
  rows.forEach((row, rowIndex) => {
    let x = Math.max(18, (layout.width - row.width) / 2);
    const y = firstY + rowIndex * rowGap;
    row.items.forEach(({ item, index, width }) => {
      const color = item.color ?? getExamGraphClimateSeriesColor(index);
      const group = appendExamGraphClimateSvgElement(svg, "g", {
        class: "exam-graph-svg-legend-item",
        transform: `translate(${x} ${y})`,
      });
      if (line) {
        const style = EXAM_GRAPH_CLIMATE_LINE_STYLES[index % EXAM_GRAPH_CLIMATE_LINE_STYLES.length];
        appendExamGraphClimateSvgElement(group, "line", {
          class: "exam-graph-svg-legend-line",
          x1: 0,
          y1: -5,
          x2: 26,
          y2: -5,
          stroke: color,
          "stroke-dasharray": style.dasharray,
        });
        appendExamGraphClimateMarker(group, 13, -5, style.marker, color, index);
        appendExamGraphClimateSvgElement(group, "text", {
          class: "exam-graph-svg-legend-text",
          x: 36,
          y: 0,
        }, item.label);
      } else {
        appendExamGraphClimateSvgElement(group, "rect", {
          class: "exam-graph-svg-legend-swatch",
          x: 0,
          y: -13,
          width: 18,
          height: 10,
          fill: color,
        });
        appendExamGraphClimateSvgElement(group, "text", {
          class: "exam-graph-svg-legend-text",
          x: 26,
          y: -4,
        }, item.label);
      }
      x += width + gap;
    });
  });
}

function appendExamGraphClimateMarker(parent, x, y, marker, color, seriesIndex = 0) {
  const markerClass = "exam-graph-svg-marker";
  if (marker === "square") {
    return appendExamGraphClimateSvgElement(parent, "rect", {
      class: markerClass,
      "data-series": seriesIndex,
      x: x - 4,
      y: y - 4,
      width: 8,
      height: 8,
      fill: "#ffffff",
      stroke: color,
      "stroke-width": 1.5,
    });
  }
  if (marker === "triangle") {
    return appendExamGraphClimateSvgElement(parent, "path", {
      class: markerClass,
      "data-series": seriesIndex,
      d: `M ${x} ${y - 5} L ${x + 5} ${y + 4.2} L ${x - 5} ${y + 4.2} Z`,
      fill: color,
      stroke: color,
      "stroke-width": 1,
    });
  }
  if (marker === "diamond") {
    return appendExamGraphClimateSvgElement(parent, "path", {
      class: markerClass,
      "data-series": seriesIndex,
      d: `M ${x} ${y - 5} L ${x + 5} ${y} L ${x} ${y + 5} L ${x - 5} ${y} Z`,
      fill: "#ffffff",
      stroke: color,
      "stroke-width": 1.5,
    });
  }
  return appendExamGraphClimateSvgElement(parent, "circle", {
    class: markerClass,
    "data-series": seriesIndex,
    cx: x,
    cy: y,
    r: 4,
    fill: color,
    stroke: "#ffffff",
    "stroke-width": 1.5,
  });
}

function appendExamGraphClimateBar(svg, { xScale, zeroX, value, y, height, color, seriesIndex = 0, title = "" }) {
  const valueX = xScale(value);
  const x = Math.min(zeroX, valueX);
  const width = Math.max(1, Math.abs(valueX - zeroX));
  const bar = appendExamGraphClimateSvgElement(svg, "rect", {
    class: "exam-graph-svg-bar",
    "data-series": seriesIndex,
    x,
    y,
    width,
    height,
    fill: color,
  });
  if (title) {
    appendExamGraphClimateSvgElement(bar, "title", {}, title);
  }
  return bar;
}

function buildExamGraphClimateEmptyChart() {
  const width = 760;
  const height = 248;
  const svg = createExamGraphClimateSvg(width, height, "인문지리 그래프 입력 대기", "empty");
  appendExamGraphClimateSvgElement(svg, "rect", {
    class: "exam-graph-svg-frame",
    x: 58,
    y: 28,
    width: width - 116,
    height: height - 76,
  });
  appendExamGraphClimateSvgElement(svg, "text", {
    class: "exam-graph-svg-empty-text",
    x: width / 2,
    y: height / 2,
    "text-anchor": "middle",
  }, "그래프를 만들 항목을 선택하세요");
  return svg;
}

function buildExamGraphClimateSingleBarChart(model) {
  const rows = model.rows ?? [];
  if (!rows.length) {
    return buildExamGraphClimateEmptyChart();
  }
  const values = rows.map((row) => Number(row.displayValue ?? row.value));
  const axis = getExamGraphNativeAxis(values, model.valueFormatter, { paddingRatio: 0.04, rangePadding: 0 });
  const layout = getExamGraphClimateHorizontalLayout(rows, { orientation: model.orientation });
  const svg = createExamGraphClimateSvg(layout.width, layout.height, "인문지리 막대 그래프", "bar");
  const xScale = getExamGraphClimateScale(axis.minimum, axis.maximum, layout.plotLeft, layout.plotRight);
  const zeroX = xScale(0);
  appendExamGraphClimateFrame(svg, layout);
  appendExamGraphClimateXAxis(svg, axis, layout, xScale);

  rows.forEach((row, rowIndex) => {
    const centerY = layout.plotTop + ((rowIndex + 0.5) / rows.length) * layout.plotHeight;
    const value = Number(row.displayValue ?? row.value) || 0;
    appendExamGraphClimateSvgElement(svg, "text", {
      class: "exam-graph-svg-label",
      x: layout.plotLeft - 14,
      y: centerY + 4,
      "text-anchor": "end",
    }, row.displayLabel ?? row.label ?? "");
    appendExamGraphClimateBar(svg, {
      xScale,
      zeroX,
      value,
      y: centerY - 5,
      height: 10,
      color: getExamGraphClimateSeriesColor(rowIndex),
      seriesIndex: rowIndex,
    });
  });
  return svg;
}

function buildExamGraphClimateStackedChart(model) {
  const rows = model.rows ?? [];
  if (!rows.length) {
    return buildExamGraphClimateEmptyChart();
  }
  const mode = model.chartMode === "amount" ? "amount" : "share";
  const values = mode === "amount" ? rows.map((row) => Number(row.total) || 0) : [0, 100];
  const axis = mode === "amount"
    ? getExamGraphNativeAxis(values, model.valueFormatter, { forceZeroStart: true, paddingRatio: 0.04, rangePadding: 0 })
    : {
        minimum: 0,
        maximum: 100,
        ticks: [0, 20, 40, 60, 80, 100],
        formatTick: (value) => String(value),
        unitLabel: "(%)",
      };
  const layout = getExamGraphClimateHorizontalLayout(rows, { legend: true, orientation: model.orientation });
  const svg = createExamGraphClimateSvg(layout.width, layout.height, "인문지리 누적 막대 그래프", "stacked");
  const xScale = getExamGraphClimateScale(axis.minimum, axis.maximum, layout.plotLeft, layout.plotRight);
  appendExamGraphClimateFrame(svg, layout);
  appendExamGraphClimateXAxis(svg, axis, layout, xScale);

  rows.forEach((row, rowIndex) => {
    const centerY = layout.plotTop + ((rowIndex + 0.5) / rows.length) * layout.plotHeight;
    let cumulativeValue = 0;
    appendExamGraphClimateSvgElement(svg, "text", {
      class: "exam-graph-svg-label",
      x: layout.plotLeft - 14,
      y: centerY + 4,
      "text-anchor": "end",
    }, row.displayLabel ?? row.label ?? "");
    (row.segments ?? []).forEach((segment, segmentIndex) => {
      const segmentValue = mode === "amount" ? Number(segment.value) || 0 : clamp(Number(segment.share) || 0, 0, 100);
      const startX = xScale(cumulativeValue);
      cumulativeValue += segmentValue;
      const endX = xScale(cumulativeValue);
      appendExamGraphClimateSvgElement(svg, "rect", {
        class: "exam-graph-svg-bar exam-graph-svg-bar--stacked",
        "data-series": segmentIndex,
        x: Math.min(startX, endX),
        y: centerY - 5.5,
        width: Math.max(1, Math.abs(endX - startX)),
        height: 11,
        fill: getExamGraphClimateSeriesColor(segmentIndex),
      });
    });
  });
  appendExamGraphClimateLegend(svg, model.legendItems ?? [], layout);
  return svg;
}

function buildExamGraphClimatePairedChart(model) {
  const rows = model.rows ?? [];
  if (!rows.length) {
    return buildExamGraphClimateEmptyChart();
  }
  const values = rows.flatMap((row) =>
    model.chartKind === "timeCompare"
      ? [Number(row.displayStartValue ?? row.startValue), Number(row.displayEndValue ?? row.endValue)]
      : [Number(row.displayFirstValue), Number(row.displaySecondValue)],
  );
  const axis = getExamGraphNativeAxis(values, model.valueFormatter, { paddingRatio: 0.04, rangePadding: 0 });
  const layout = getExamGraphClimateHorizontalLayout(rows, { legend: true, paired: true, orientation: model.orientation });
  const svg = createExamGraphClimateSvg(layout.width, layout.height, "인문지리 비교 막대 그래프", "paired");
  const xScale = getExamGraphClimateScale(axis.minimum, axis.maximum, layout.plotLeft, layout.plotRight);
  const zeroX = xScale(0);
  appendExamGraphClimateFrame(svg, layout);
  appendExamGraphClimateXAxis(svg, axis, layout, xScale);

  rows.forEach((row, rowIndex) => {
    const centerY = layout.plotTop + ((rowIndex + 0.5) / rows.length) * layout.plotHeight;
    const pairValues = model.chartKind === "timeCompare"
      ? [row.displayStartValue ?? row.startValue, row.displayEndValue ?? row.endValue]
      : [row.displayFirstValue, row.displaySecondValue];
    appendExamGraphClimateSvgElement(svg, "text", {
      class: "exam-graph-svg-label",
      x: layout.plotLeft - 14,
      y: centerY + 4,
      "text-anchor": "end",
    }, row.displayLabel ?? row.label ?? "");
    pairValues.forEach((value, valueIndex) => {
      appendExamGraphClimateBar(svg, {
        xScale,
        zeroX,
        value: Number(value) || 0,
        y: centerY + (valueIndex === 0 ? -13 : 4),
        height: 9,
        color: getExamGraphClimateSeriesColor(valueIndex),
        seriesIndex: valueIndex,
      });
    });
  });
  appendExamGraphClimateLegend(svg, model.legendItems ?? [], layout);
  return svg;
}

function buildExamGraphClimateTrendChart(model) {
  const rows = model.rows ?? [];
  const years = model.years ?? [];
  if (!rows.length || !years.length) {
    return buildExamGraphClimateEmptyChart();
  }
  const values = rows.flatMap((row) => (row.points ?? []).map((point) => Number(point.displayValue ?? point.value)));
  const axis = getExamGraphNativeAxis(values, model.valueFormatter, { paddingRatio: 0.08, rangePadding: 0 });
  const layout = getExamGraphClimateCartesianLayout({
    legend: true,
    steps: years.length,
    series: rows.length,
    orientation: model.orientation,
  });
  const svg = createExamGraphClimateSvg(layout.width, layout.height, "인문지리 시계열 그래프", "trend");
  const yScale = getExamGraphClimateYScale(axis.minimum, axis.maximum, layout.plotTop, layout.plotBottom);
  const xPadding = years.length > 1 ? 12 : layout.plotWidth / 2;
  const xScale = (year) => {
    const index = years.indexOf(year);
    if (years.length <= 1) {
      return layout.plotLeft + layout.plotWidth / 2;
    }
    return layout.plotLeft + xPadding + (Math.max(0, index) / (years.length - 1)) * (layout.plotWidth - xPadding * 2);
  };
  appendExamGraphClimateFrame(svg, layout);
  appendExamGraphClimateYAxis(svg, axis, layout, yScale);
  years.forEach((year, index) => {
    const x = xScale(year);
    appendExamGraphClimateSvgElement(svg, "line", {
      class: "exam-graph-svg-grid exam-graph-svg-grid--x",
      x1: x,
      y1: layout.plotTop,
      x2: x,
      y2: layout.plotBottom,
    });
    if (index === 0 || index === years.length - 1 || years.length <= 7 || index % Math.ceil(years.length / 6) === 0) {
      appendExamGraphClimateSvgElement(svg, "text", {
        class: "exam-graph-svg-tick",
        x,
        y: layout.plotBottom + 28,
        "text-anchor": "middle",
      }, year);
    }
  });

  rows.forEach((row, rowIndex) => {
    const color = getExamGraphClimateSeriesColor(rowIndex);
    const style = EXAM_GRAPH_CLIMATE_LINE_STYLES[rowIndex % EXAM_GRAPH_CLIMATE_LINE_STYLES.length];
    const points = (row.points ?? [])
      .slice()
      .filter((point) => years.includes(point.year))
      .sort((left, right) => years.indexOf(left.year) - years.indexOf(right.year))
      .map((point) => ({
        x: xScale(point.year),
        y: yScale(point.displayValue ?? point.value),
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (points.length) {
      appendExamGraphClimateSvgElement(svg, "polyline", {
        class: "exam-graph-svg-line",
        "data-series": rowIndex,
        fill: "none",
        stroke: color,
        "stroke-dasharray": style.dasharray,
        points: points.map((point) => `${point.x},${point.y}`).join(" "),
      });
      points.forEach((point) => appendExamGraphClimateMarker(svg, point.x, point.y, style.marker, color, rowIndex));
    }
  });
  appendExamGraphClimateLegend(svg, rows.map((row, index) => ({
    label: row.displayLabel,
    color: getExamGraphClimateSeriesColor(index),
  })), layout, { line: true });
  return svg;
}

function buildExamGraphClimateScatterChart(model) {
  const rows = model.rows ?? [];
  if (!rows.length) {
    return buildExamGraphClimateEmptyChart();
  }
  const xValues = rows.map((row) => Number(row.xValue));
  const yValues = rows.map((row) => Number(row.yValue));
  const sizeValues = rows.map((row) => Number(row.sizeValue) || 0);
  const xAxis = getExamGraphNativeAxis(xValues, model.xFormatter, { paddingRatio: 0.08, rangePadding: 0 });
  const yAxis = getExamGraphNativeAxis(yValues, model.yFormatter, { paddingRatio: 0.08, rangePadding: 0 });
  const layout = getExamGraphClimateCartesianLayout({
    steps: 5,
    series: rows.length,
    scatter: true,
    orientation: model.orientation,
  });
  const svg = createExamGraphClimateSvg(layout.width, layout.height, "인문지리 산포도", "scatter");
  const xScale = getExamGraphClimateScale(xAxis.minimum, xAxis.maximum, layout.plotLeft, layout.plotRight);
  const yScale = getExamGraphClimateYScale(yAxis.minimum, yAxis.maximum, layout.plotTop, layout.plotBottom);
  const maxSize = Math.max(...sizeValues, 1);
  appendExamGraphClimateFrame(svg, layout);
  appendExamGraphClimateYAxis(svg, yAxis, layout, yScale);
  xAxis.ticks.forEach((tick, index) => {
    const x = xScale(tick);
    appendExamGraphClimateSvgElement(svg, "line", {
      class: `exam-graph-svg-grid exam-graph-svg-grid--x${Math.abs(Number(tick)) < 0.000001 ? " is-zero" : ""}`,
      x1: x,
      y1: layout.plotTop,
      x2: x,
      y2: layout.plotBottom,
    });
    appendExamGraphClimateSvgElement(svg, "text", {
      class: "exam-graph-svg-tick",
      x,
      y: layout.plotBottom + 28,
      "text-anchor": index === 0 ? "start" : index === xAxis.ticks.length - 1 ? "end" : "middle",
    }, xAxis.formatTick(tick));
  });
  if (xAxis.unitLabel) {
    appendExamGraphClimateSvgElement(svg, "text", {
      class: "exam-graph-svg-unit",
      x: layout.plotRight,
      y: layout.height - 16,
      "text-anchor": "end",
    }, xAxis.unitLabel);
  }
  rows.forEach((row, rowIndex) => {
    const radius = 4 + Math.sqrt(Math.max(0, Number(row.sizeValue) || 0) / maxSize) * 7;
    const x = xScale(row.xValue);
    const y = yScale(row.yValue);
    const color = getExamGraphClimateSeriesColor(rowIndex);
    appendExamGraphClimateSvgElement(svg, "circle", {
      class: "exam-graph-svg-scatter-point",
      "data-series": rowIndex,
      cx: x,
      cy: y,
      r: radius,
      fill: color,
    });
    appendExamGraphClimateSvgElement(svg, "text", {
      class: "exam-graph-svg-point-label",
      x: x + radius + 5,
      y: y - radius,
    }, row.displayLabel ?? row.label ?? "");
  });
  return svg;
}

function buildExamGraphNativeChart(model) {
  if (model.chartKind === "trendLine") {
    return buildExamGraphClimateTrendChart(model);
  }
  if (model.chartKind === "scatter") {
    return buildExamGraphClimateScatterChart(model);
  }
  if (model.chartKind === "stacked") {
    return buildExamGraphClimateStackedChart(model);
  }
  if (model.chartKind === "pairedBar" || model.chartKind === "timeCompare") {
    return buildExamGraphClimatePairedChart(model);
  }
  return buildExamGraphClimateSingleBarChart(model);
}

function buildExamGraphNativeSingleBarChart(model) {
  const rows = model.rows ?? [];
  const values = rows.map((row) => Number(row.displayValue ?? row.value));
  const axis = getExamGraphNativeAxis(values, model.valueFormatter, { paddingRatio: 0.04 });
  const chart = createExamGraphNativeNode("exam-graph-native-chart exam-graph-native-chart--bars");
  const rowsNode = createExamGraphNativeNode("exam-graph-native-rows");
  const zeroPosition = axis.toPercent(0);

  rows.forEach((row, rowIndex) => {
    const value = Number(row.displayValue ?? row.value) || 0;
    const valuePosition = axis.toPercent(value);
    const item = createExamGraphNativeNode("exam-graph-native-row");
    const label = createExamGraphNativeNode("exam-graph-native-row-label", row.displayLabel ?? row.label ?? "");
    const plot = createExamGraphNativeNode("exam-graph-native-plot");
    appendExamGraphNativeGrid(plot, axis, "x");

    const bar = createExamGraphNativeNode("exam-graph-native-bar");
    bar.dataset.series = String(rowIndex % 4);
    bar.style.left = `${Math.min(zeroPosition, valuePosition)}%`;
    bar.style.width = `${Math.max(0.7, Math.abs(valuePosition - zeroPosition))}%`;
    plot.appendChild(bar);
    item.append(label, plot);
    rowsNode.appendChild(item);
  });

  chart.appendChild(rowsNode);
  appendExamGraphNativeXAxis(chart, axis);
  return chart;
}

function buildExamGraphNativeStackedChart(model) {
  const rows = model.rows ?? [];
  const mode = model.chartMode === "amount" ? "amount" : "share";
  const values = mode === "amount" ? rows.map((row) => Number(row.total) || 0) : [0, 100];
  const axis = mode === "amount"
    ? getExamGraphNativeAxis(values, model.valueFormatter, { forceZeroStart: true, paddingRatio: 0.04 })
    : {
        minimum: 0,
        maximum: 100,
        ticks: [0, 20, 40, 60, 80, 100],
        formatTick: (value) => String(value),
        unitLabel: "(%)",
        toPercent: (value) => 6 + (Number(value) / 100) * 88,
      };
  const chart = createExamGraphNativeNode("exam-graph-native-chart exam-graph-native-chart--stacked");
  const rowsNode = createExamGraphNativeNode("exam-graph-native-rows");

  rows.forEach((row) => {
    const item = createExamGraphNativeNode("exam-graph-native-row");
    const label = createExamGraphNativeNode("exam-graph-native-row-label", row.displayLabel ?? row.label ?? "");
    const plot = createExamGraphNativeNode("exam-graph-native-plot");
    appendExamGraphNativeGrid(plot, axis, "x");
    let cumulativeValue = 0;
    (row.segments ?? []).forEach((segment, segmentIndex) => {
      const segmentValue = mode === "amount" ? Number(segment.value) || 0 : clamp(Number(segment.share) || 0, 0, 100);
      const startPosition = axis.toPercent(cumulativeValue);
      cumulativeValue += segmentValue;
      const endPosition = axis.toPercent(cumulativeValue);
      const block = createExamGraphNativeNode("exam-graph-native-bar exam-graph-native-bar--segment");
      block.dataset.series = String(segmentIndex % 4);
      block.title = `${segment.label} ${model.valueFormatter ? model.valueFormatter(segmentValue) : segmentValue}`;
      block.style.left = `${Math.min(startPosition, endPosition)}%`;
      block.style.width = `${Math.max(0.7, Math.abs(endPosition - startPosition))}%`;
      plot.appendChild(block);
    });
    item.append(label, plot);
    rowsNode.appendChild(item);
  });

  chart.appendChild(rowsNode);
  appendExamGraphNativeXAxis(chart, axis);
  appendExamGraphNativeLegend(chart, model.legendItems ?? []);
  return chart;
}

function buildExamGraphNativePairedChart(model) {
  const rows = model.rows ?? [];
  const values = rows.flatMap((row) =>
    model.chartKind === "timeCompare"
      ? [Number(row.displayStartValue ?? row.startValue), Number(row.displayEndValue ?? row.endValue)]
      : [Number(row.displayFirstValue), Number(row.displaySecondValue)],
  );
  const axis = getExamGraphNativeAxis(values, model.valueFormatter, { forceZeroStart: true, paddingRatio: 0.04 });
  const chart = createExamGraphNativeNode("exam-graph-native-chart exam-graph-native-chart--paired");
  const rowsNode = createExamGraphNativeNode("exam-graph-native-rows");
  const zeroPosition = axis.toPercent(0);

  rows.forEach((row) => {
    const item = createExamGraphNativeNode("exam-graph-native-row exam-graph-native-row--paired");
    const label = createExamGraphNativeNode("exam-graph-native-row-label", row.displayLabel ?? row.label ?? "");
    const plot = createExamGraphNativeNode("exam-graph-native-plot exam-graph-native-plot--paired");
    appendExamGraphNativeGrid(plot, axis, "x");
    const pairValues = model.chartKind === "timeCompare"
      ? [row.displayStartValue ?? row.startValue, row.displayEndValue ?? row.endValue]
      : [row.displayFirstValue, row.displaySecondValue];
    pairValues.forEach((value, valueIndex) => {
      const valuePosition = axis.toPercent(Number(value) || 0);
      const bar = createExamGraphNativeNode("exam-graph-native-bar exam-graph-native-bar--paired");
      bar.dataset.series = String(valueIndex);
      bar.style.left = `${Math.min(zeroPosition, valuePosition)}%`;
      bar.style.width = `${Math.max(0.7, Math.abs(valuePosition - zeroPosition))}%`;
      bar.style.top = valueIndex === 0 ? "10px" : "28px";
      plot.appendChild(bar);
    });
    item.append(label, plot);
    rowsNode.appendChild(item);
  });

  chart.appendChild(rowsNode);
  appendExamGraphNativeXAxis(chart, axis);
  appendExamGraphNativeLegend(chart, model.legendItems ?? []);
  return chart;
}

function buildExamGraphNativeTrendChart(model) {
  const rows = model.rows ?? [];
  const years = model.years ?? [];
  const values = rows.flatMap((row) => (row.points ?? []).map((point) => Number(point.displayValue ?? point.value)));
  const axis = getExamGraphNativeAxis(values, model.valueFormatter, { paddingRatio: 0.08 });
  const chart = createExamGraphNativeNode("exam-graph-native-chart exam-graph-native-chart--trend");
  const body = createExamGraphNativeNode("exam-graph-native-chart-body");
  const yAxis = createExamGraphNativeNode("exam-graph-native-y-axis");
  const plot = createExamGraphNativeNode("exam-graph-native-line-plot");
  const yearIndex = new Map(years.map((year, index) => [year, index]));
  const xForYear = (year) => {
    const index = yearIndex.get(year) ?? 0;
    return years.length > 1 ? 4 + (index / (years.length - 1)) * 92 : 50;
  };
  const yForValue = (value) => 4 + (1 - (Number(value) - axis.minimum) / (axis.maximum - axis.minimum)) * 92;

  axis.ticks.forEach((tick) => {
    const y = yForValue(tick);
    const line = createExamGraphNativeNode("exam-graph-native-grid-line exam-graph-native-grid-line--y");
    line.classList.toggle("is-zero", Math.abs(Number(tick)) < 0.000001);
    line.style.top = `${y}%`;
    plot.appendChild(line);
    const label = createExamGraphNativeNode("exam-graph-native-y-tick", axis.formatTick(tick));
    label.style.top = `${y}%`;
    yAxis.appendChild(label);
  });
  if (axis.unitLabel) {
    const unit = createExamGraphNativeNode("exam-graph-native-y-unit", axis.unitLabel);
    yAxis.appendChild(unit);
  }

  years.forEach((year) => {
    const x = xForYear(year);
    const line = createExamGraphNativeNode("exam-graph-native-grid-line exam-graph-native-grid-line--x");
    line.style.left = `${x}%`;
    plot.appendChild(line);
  });

  rows.forEach((row, rowIndex) => {
    const points = (row.points ?? [])
      .map((point) => ({
        x: xForYear(point.year),
        y: yForValue(point.displayValue ?? point.value),
        year: point.year,
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    points.forEach((point, pointIndex) => {
      if (pointIndex > 0) {
        const previous = points[pointIndex - 1];
        const segment = createExamGraphNativeNode("exam-graph-native-line-segment");
        segment.dataset.series = String(rowIndex % 4);
        segment.dataset.x1 = String(previous.x);
        segment.dataset.y1 = String(previous.y);
        segment.dataset.x2 = String(point.x);
        segment.dataset.y2 = String(point.y);
        plot.appendChild(segment);
      }
      const dot = createExamGraphNativeNode("exam-graph-native-dot");
      dot.dataset.series = String(rowIndex % 4);
      dot.style.left = `${point.x}%`;
      dot.style.top = `${point.y}%`;
      plot.appendChild(dot);
    });
  });

  body.append(yAxis, plot);
  chart.appendChild(body);
  const xAxis = createExamGraphNativeNode("exam-graph-native-trend-x-axis");
  years.forEach((year, index) => {
    if (index !== 0 && index !== years.length - 1 && years.length > 8 && index % Math.ceil(years.length / 6) !== 0) {
      return;
    }
    const label = createExamGraphNativeNode("exam-graph-native-axis-tick", String(year));
    if (index === 0) {
      label.classList.add("is-edge-start");
    }
    if (index === years.length - 1) {
      label.classList.add("is-edge-end");
    }
    label.style.left = `${xForYear(year)}%`;
    xAxis.appendChild(label);
  });
  chart.appendChild(xAxis);
  appendExamGraphNativeLegend(chart, rows.map((row) => ({ label: row.displayLabel })));
  ensureExamGraphNativeLineLayoutEvents();
  scheduleExamGraphNativeLineLayout();
  return chart;
}

function buildExamGraphNativeScatterChart(model) {
  const rows = model.rows ?? [];
  const xValues = rows.map((row) => Number(row.xValue));
  const yValues = rows.map((row) => Number(row.yValue));
  const sizeValues = rows.map((row) => Number(row.sizeValue) || 0);
  const xAxis = getExamGraphNativeAxis(xValues, model.xFormatter, { paddingRatio: 0.08 });
  const yAxis = getExamGraphNativeAxis(yValues, model.yFormatter, { paddingRatio: 0.08 });
  const yToPercent = (value) => 100 - yAxis.toPercent(value);
  const maxSize = Math.max(...sizeValues, 1);
  const chart = createExamGraphNativeNode("exam-graph-native-chart exam-graph-native-chart--scatter");
  const body = createExamGraphNativeNode("exam-graph-native-chart-body");
  const yAxisNode = createExamGraphNativeNode("exam-graph-native-y-axis");
  const plot = createExamGraphNativeNode("exam-graph-native-line-plot");

  yAxis.ticks.forEach((tick) => {
    const y = yToPercent(tick);
    const line = createExamGraphNativeNode("exam-graph-native-grid-line exam-graph-native-grid-line--y");
    line.classList.toggle("is-zero", Math.abs(Number(tick)) < 0.000001);
    line.style.top = `${y}%`;
    plot.appendChild(line);
    const label = createExamGraphNativeNode("exam-graph-native-y-tick", yAxis.formatTick(tick));
    label.style.top = `${y}%`;
    yAxisNode.appendChild(label);
  });
  if (yAxis.unitLabel) {
    yAxisNode.appendChild(createExamGraphNativeNode("exam-graph-native-y-unit", yAxis.unitLabel));
  }
  xAxis.ticks.forEach((tick) => {
    const x = xAxis.toPercent(tick);
    const line = createExamGraphNativeNode("exam-graph-native-grid-line exam-graph-native-grid-line--x");
    line.classList.toggle("is-zero", Math.abs(Number(tick)) < 0.000001);
    line.style.left = `${x}%`;
    plot.appendChild(line);
  });

  rows.forEach((row, rowIndex) => {
    const point = createExamGraphNativeNode("exam-graph-native-scatter-point");
    point.dataset.series = String(rowIndex % 4);
    point.style.left = `${xAxis.toPercent(row.xValue)}%`;
    point.style.top = `${yToPercent(row.yValue)}%`;
    point.style.width = `${8 + Math.sqrt(Math.max(0, Number(row.sizeValue) || 0) / maxSize) * 16}px`;
    point.style.height = point.style.width;
    point.title = `${row.displayLabel}`;
    const label = createExamGraphNativeNode("exam-graph-native-point-label", row.displayLabel);
    label.style.left = `${xAxis.toPercent(row.xValue)}%`;
    label.style.top = `${yToPercent(row.yValue)}%`;
    plot.append(point, label);
  });

  body.append(yAxisNode, plot);
  chart.appendChild(body);
  const xAxisNode = createExamGraphNativeNode("exam-graph-native-trend-x-axis");
  xAxis.ticks.forEach((tick, index) => {
    const label = createExamGraphNativeNode("exam-graph-native-axis-tick", xAxis.formatTick(tick));
    if (index === 0) {
      label.classList.add("is-edge-start");
    }
    if (index === xAxis.ticks.length - 1) {
      label.classList.add("is-edge-end");
    }
    label.style.left = `${xAxis.toPercent(tick)}%`;
    xAxisNode.appendChild(label);
  });
  if (xAxis.unitLabel) {
    xAxisNode.appendChild(createExamGraphNativeNode("exam-graph-native-axis-unit", xAxis.unitLabel));
  }
  chart.appendChild(xAxisNode);
  return chart;
}

function buildExamGraphValueCard(model) {
  const card = document.createElement("div");
  card.className = "exam-graph-data-card";

  const head = document.createElement("div");
  head.className = "exam-graph-data-card__head";
  const title = document.createElement("h5");
  title.className = "metric-explorer-table__title";
  title.textContent = "값 정리";
  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.className = "exam-graph-download-button";
  downloadButton.textContent = "CSV 다운로드";
  downloadButton.addEventListener("click", () => downloadExamGraphCsv(model));
  head.append(title, downloadButton);
  card.appendChild(head);

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

function normalizeExamGraphCsvValue(value) {
  if (value == null) {
    return "";
  }
  if (Number.isFinite(Number(value))) {
    return Number(value);
  }
  return String(value);
}

function buildExamGraphCsvRows(model) {
  const rows = Array.isArray(model?.rows) ? model.rows : [];
  if (!rows.length) {
    return [["항목", "값"]];
  }

  if (rows.some((row) => Array.isArray(row.segments))) {
    const segmentLabels = [
      ...new Set(rows.flatMap((row) => (row.segments ?? []).map((segment) => segment.label))),
    ];
    return [
      ["표시명", "실제명", ...segmentLabels.flatMap((label) => [`${label} 값`, `${label} 비율(%)`])],
      ...rows.map((row) => {
        const segmentMap = new Map((row.segments ?? []).map((segment) => [segment.label, segment]));
        return [
          row.displayLabel ?? row.label,
          row.actualLabel ?? row.label,
          ...segmentLabels.flatMap((label) => {
            const segment = segmentMap.get(label);
            return [
              normalizeExamGraphCsvValue(segment?.value),
              normalizeExamGraphCsvValue(segment?.share),
            ];
          }),
        ];
      }),
    ];
  }

  if (rows.some((row) => row.firstValue != null || row.secondValue != null)) {
    return [
      ["표시명", "실제명", "첫 번째 원값", "두 번째 원값", "첫 번째 그래프값", "두 번째 그래프값", "상세"],
      ...rows.map((row) => [
        row.displayLabel ?? row.label,
        row.actualLabel ?? row.label,
        normalizeExamGraphCsvValue(row.firstValue),
        normalizeExamGraphCsvValue(row.secondValue),
        normalizeExamGraphCsvValue(row.displayFirstValue),
        normalizeExamGraphCsvValue(row.displaySecondValue),
        row.detail ?? "",
      ]),
    ];
  }

  if (rows.some((row) => row.startValue != null || row.endValue != null)) {
    return [
      ["표시명", "실제명", `${model.startYear ?? "시작"} 원값`, `${model.endYear ?? "종료"} 원값`, "시작 그래프값", "종료 그래프값"],
      ...rows.map((row) => [
        row.displayLabel ?? row.label,
        row.actualLabel ?? row.label,
        normalizeExamGraphCsvValue(row.startValue),
        normalizeExamGraphCsvValue(row.endValue),
        normalizeExamGraphCsvValue(row.displayStartValue),
        normalizeExamGraphCsvValue(row.displayEndValue),
      ]),
    ];
  }

  if (rows.some((row) => Array.isArray(row.points))) {
    const years = [
      ...new Set(rows.flatMap((row) => (row.points ?? []).map((point) => point.year))),
    ].sort((left, right) => Number(left) - Number(right));
    return [
      ["표시명", "실제명", ...years.map((year) => `${year}년`)],
      ...rows.map((row) => {
        const pointMap = new Map((row.points ?? []).map((point) => [point.year, point]));
        return [
          row.displayLabel ?? row.label,
          row.actualLabel ?? row.label,
          ...years.map((year) => normalizeExamGraphCsvValue(pointMap.get(year)?.value)),
        ];
      }),
    ];
  }

  if (rows.some((row) => row.xValue != null || row.yValue != null)) {
    return [
      ["표시명", "실제명", model.xLabel ?? "X", model.yLabel ?? "Y", model.sizeLabel ?? "크기"],
      ...rows.map((row) => [
        row.displayLabel ?? row.label,
        row.actualLabel ?? row.label,
        normalizeExamGraphCsvValue(row.xValue),
        normalizeExamGraphCsvValue(row.yValue),
        normalizeExamGraphCsvValue(row.sizeValue),
      ]),
    ];
  }

  return [
    ["표시명", "실제명", "원값", "그래프값", "상세"],
    ...rows.map((row) => [
      row.displayLabel ?? row.label,
      row.actualLabel ?? row.label,
      normalizeExamGraphCsvValue(row.value),
      normalizeExamGraphCsvValue(row.displayValue),
      row.detail ?? "",
    ]),
  ];
}

function buildExamGraphCsvLine(values) {
  return values
    .map((value) => {
      const text = value == null ? "" : String(value);
      return /[",\n]/u.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    })
    .join(",");
}

function downloadExamGraphCsv(model) {
  const csvRows = buildExamGraphCsvRows(model).map(buildExamGraphCsvLine);
  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  downloadBlob(blob, String(model?.exportName ?? "exam-graph.csv").replace(/\.[a-z0-9]+$/iu, ".csv"));
}

function buildExamGraphAnswerCard(answerRows) {
  const card = document.createElement("div");
  card.className = "exam-graph-data-card";

  const title = document.createElement("h5");
  title.className = "metric-explorer-table__title";
  title.textContent = "가명 정답표";
  card.appendChild(title);

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

function buildExamGraphFileName(parts) {
  const filename = parts
    .map((part) => String(part))
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `exam-graph-${filename || "chart"}.csv`;
}

function getExamGraphAxisDomain(values, { forceZeroStart = false, paddingRatio = 0.06, niceCount = 5 } = {}) {
  const validValues = (values ?? []).filter((value) => Number.isFinite(Number(value))).map(Number);
  if (!validValues.length) {
    return { minimum: 0, maximum: 1 };
  }

  const sourceMinimum = Math.min(...validValues);
  let minimum = sourceMinimum;
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
    if (!((forceZeroStart || sourceMinimum >= 0) && Math.abs(minimum) < 0.000001)) {
      minimum -= span * paddingRatio;
    }
    maximum += span * paddingRatio;
  }
  if ((forceZeroStart || sourceMinimum >= 0) && minimum > 0) {
    minimum = 0;
  }

  const [niceMinimum, niceMaximum] = d3.scaleLinear().domain([minimum, maximum]).nice(niceCount).domain();
  return {
    minimum: forceZeroStart || sourceMinimum >= 0 ? Math.max(0, niceMinimum) : niceMinimum,
    maximum: niceMaximum,
  };
}

function getExamGraphAxisTicks(minimum, maximum, count = 5) {
  const baseTicks = d3.ticks(minimum, maximum, count);
  const allTicks = [...baseTicks, minimum, maximum];
  if (minimum < 0 && maximum > 0) {
    allTicks.push(0);
  }
  return [...new Set(allTicks.map((value) => Number(value.toFixed(6))))].sort((a, b) => a - b);
}

function inferExamGraphAxisUnit(valueFormatter, referenceValue) {
  if (typeof valueFormatter !== "function") {
    return "";
  }
  const sample = String(valueFormatter(referenceValue) ?? "");
  if (sample.includes("%")) {
    return "%";
  }
  if (sample.includes("\u2030")) {
    return "\u2030";
  }
  if (sample.includes("MWh/명")) {
    return "MWh/명";
  }
  if (sample.includes("명/km")) {
    return "명/km²";
  }
  if (sample.includes("t/ha")) {
    return "t/ha";
  }
  if (sample.includes("TWh")) {
    return "TWh";
  }
  if (sample.includes("ha")) {
    return "ha";
  }
  if (sample.includes("t")) {
    return "t";
  }
  if (sample.includes("명")) {
    return "명";
  }
  if (sample.includes("$")) {
    return "달러";
  }
  return "";
}

function buildExamGraphAxisTickFormatter(values, valueFormatter) {
  const validValues = (values ?? []).filter((value) => Number.isFinite(Number(value))).map(Number);
  const maximumAbsolute = Math.max(...validValues.map((value) => Math.abs(value)), 0);
  const unit = inferExamGraphAxisUnit(valueFormatter, validValues.find((value) => Math.abs(value) === maximumAbsolute) ?? maximumAbsolute);
  const isPercentLike = unit === "%" || unit === "\u2030";
  const divisor = isPercentLike
    ? 1
    : maximumAbsolute >= 100_000_000
      ? 100_000_000
      : maximumAbsolute >= 10_000
        ? 10_000
        : 1;
  const compactUnit =
    divisor === 100_000_000
      ? "억"
      : divisor === 10_000
        ? "만"
        : "";
  const unitLabel = compactUnit ? `${compactUnit}${unit ? ` ${unit}` : ""}` : unit;

  return {
    unitLabel: unitLabel ? `(${unitLabel})` : "",
    formatTick: (value) => {
      const scaledValue = Number(value) / divisor;
      const absoluteScaledValue = Math.abs(scaledValue);
      const maximumFractionDigits = absoluteScaledValue >= 100 ? 0 : absoluteScaledValue >= 10 ? 1 : 2;
      return scaledValue.toLocaleString("ko-KR", { maximumFractionDigits });
    },
  };
}

function appendExamGraphAxisUnitLabel(svg, { text, x, y, anchor = "start" }) {
  if (!text) {
    return null;
  }
  const label = createSvgElement("text");
  setExamGraphCoordinate(label, "x", x);
  setExamGraphCoordinate(label, "y", y);
  label.setAttribute("text-anchor", anchor);
  applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.axisTick, fontWeight: 500 });
  label.setAttribute("fill", getActiveExamGraphVisualTheme().colors.mutedInk);
  label.textContent = text;
  svg.appendChild(label);
  return label;
}

function appendExamGraphPlotFrame(svg, { x, y, width, height }) {
  const theme = getActiveExamGraphVisualTheme();
  const frame = createSvgElement("rect");
  setExamGraphBox(frame, { x, y, width, height });
  frame.setAttribute("fill", theme.colors.paper);
  frame.setAttribute("stroke", theme.colors.frame ?? theme.colors.ink);
  frame.setAttribute("stroke-width", theme.strokes.frame);
  applyExamGraphStrokeStyle(frame);
  svg.appendChild(frame);
  return frame;
}

function appendExamGraphPlotBorder(svg, { x, y, width, height }) {
  const theme = getActiveExamGraphVisualTheme();
  const border = createSvgElement("rect");
  setExamGraphBox(border, { x, y, width, height });
  border.setAttribute("fill", "none");
  border.setAttribute("stroke", theme.colors.frame ?? theme.colors.ink);
  border.setAttribute("stroke-width", theme.strokes.frame);
  applyExamGraphStrokeStyle(border);
  svg.appendChild(border);
  return border;
}

function styleExamGraphGridLine(line, { zero = false } = {}) {
  const theme = getActiveExamGraphVisualTheme();
  line.setAttribute("stroke", zero ? theme.colors.ink : theme.colors.grid ?? theme.colors.ink);
  line.setAttribute("stroke-width", zero ? theme.strokes.zeroAxis : theme.strokes.grid);
  applyExamGraphStrokeStyle(line);
  if (!zero) {
    line.setAttribute("stroke-dasharray", theme.dash.grid);
  }
}

function styleExamGraphDataRect(rect, fill) {
  const theme = getActiveExamGraphVisualTheme();
  rect.setAttribute("fill", fill);
  rect.setAttribute("stroke", theme.colors.dataStroke ?? theme.colors.ink);
  rect.setAttribute("stroke-width", theme.strokes.dataOutline);
  applyExamGraphStrokeStyle(rect);
}

function appendExamGraphXAxis(svg, {
  plotLeft,
  plotTop,
  plotWidth,
  plotHeight,
  ticks,
  minimum,
  maximum,
  valueFormatter,
  axisFormatter = null,
  axisUnitLabel = "",
  rangePadding = 0,
}) {
  const scaleLeft = plotLeft + rangePadding;
  const scaleWidth = Math.max(1, plotWidth - rangePadding * 2);
  const valueToX = buildExamGraphPositionScale(minimum, maximum, scaleLeft, scaleWidth);
  const formatTick = axisFormatter ?? ((tick) => valueFormatter(tick));
  ticks.forEach((tick) => {
    const x = valueToX(tick);
    const isEdge = Math.abs(tick - minimum) < 0.000001 || Math.abs(tick - maximum) < 0.000001;
    const isZero = Math.abs(tick) < 0.000001;
    if (!isEdge) {
      const line = createSvgElement("line");
      setExamGraphCoordinate(line, "x1", x);
      setExamGraphCoordinate(line, "x2", x);
      setExamGraphCoordinate(line, "y1", plotTop);
      setExamGraphCoordinate(line, "y2", plotTop + plotHeight);
      styleExamGraphGridLine(line, { zero: isZero });
      svg.appendChild(line);
    }

    const label = createSvgElement("text");
    setExamGraphCoordinate(label, "x", x);
    setExamGraphCoordinate(label, "y", plotTop + plotHeight + examGraphTheme.layout.xTickGap);
    label.setAttribute("text-anchor", Math.abs(tick - minimum) < 0.000001 ? "start" : Math.abs(tick - maximum) < 0.000001 ? "end" : "middle");
    applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.axisTick, fontWeight: 600 });
    label.textContent = formatTick(tick);
    svg.appendChild(label);
  });
  appendExamGraphAxisUnitLabel(svg, {
    text: axisUnitLabel,
    x: plotLeft + plotWidth,
    y: plotTop + plotHeight + examGraphTheme.layout.xTickGap + examGraphTheme.type.axisTick + 6,
    anchor: "end",
  });
  return valueToX;
}

function appendExamGraphYAxis(svg, {
  plotLeft,
  plotTop,
  plotWidth,
  plotHeight,
  ticks,
  minimum,
  maximum,
  valueFormatter,
  axisFormatter = null,
  axisUnitLabel = "",
  rangePadding = 0,
}) {
  const scaleTop = plotTop + rangePadding;
  const scaleHeight = Math.max(1, plotHeight - rangePadding * 2);
  const valueToY = (value) => snapExamGraphCoordinate(scaleTop + (1 - (Number(value) - minimum) / (maximum - minimum)) * scaleHeight);
  const formatTick = axisFormatter ?? ((tick) => valueFormatter(tick));
  ticks.forEach((tick) => {
    const y = valueToY(tick);
    const isEdge = Math.abs(tick - minimum) < 0.000001 || Math.abs(tick - maximum) < 0.000001;
    const isZero = Math.abs(tick) < 0.000001;
    if (!isEdge) {
      const line = createSvgElement("line");
      setExamGraphCoordinate(line, "x1", plotLeft);
      setExamGraphCoordinate(line, "x2", plotLeft + plotWidth);
      setExamGraphCoordinate(line, "y1", y);
      setExamGraphCoordinate(line, "y2", y);
      styleExamGraphGridLine(line, { zero: isZero });
      svg.appendChild(line);
    }

    const label = createSvgElement("text");
    setExamGraphCoordinate(label, "x", plotLeft - examGraphTheme.layout.yTickGap);
    setExamGraphCoordinate(label, "y", y + 2.5);
    label.setAttribute("text-anchor", "end");
    applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.axisTick, fontWeight: 600 });
    label.textContent = formatTick(tick);
    svg.appendChild(label);
  });
  appendExamGraphAxisUnitLabel(svg, {
    text: axisUnitLabel,
    x: plotLeft + 4,
    y: plotTop + 8,
    anchor: "start",
  });
  return valueToY;
}

function chunkExamGraphLegendItems(items, itemWidthGetter, maxLegendWidth = examGraphTheme.layout.width) {
  const rowSize = Math.max(1, Number(examGraphTheme.legend.maxItemsPerRow) || 4);
  const availableWidth = Math.max(
    80,
    maxLegendWidth - examGraphTheme.layout.legendSidePadding * 2 - examGraphTheme.legend.paddingX * 2,
  );
  const rows = [];
  let currentRow = [];
  let currentRowWidth = 0;

  items.forEach((item) => {
    const itemContentWidth = itemWidthGetter(item);
    const itemSpacing = currentRow.length ? examGraphTheme.legend.itemGap : 0;
    const nextWidth = currentRowWidth + itemContentWidth + itemSpacing;
    const shouldWrap = currentRow.length > 0 && (currentRow.length >= rowSize || nextWidth > availableWidth);
    if (shouldWrap) {
      rows.push(currentRow);
      currentRow = [];
      currentRowWidth = 0;
    }
    currentRow.push(item);
    currentRowWidth = Math.min(
      availableWidth,
      currentRow.reduce(
        (sum, currentItem, index) => sum + itemWidthGetter(currentItem) + (index ? examGraphTheme.legend.itemGap : 0),
        0,
      ),
    );
  });
  if (currentRowWidth > 0) {
    rows.push(currentRow);
  }
  return rows.length ? rows : [[]];
}

function measureExamGraphLegendRows(items, itemWidthGetter, maxLegendWidth = examGraphTheme.layout.width) {
  const rows = chunkExamGraphLegendItems(items, itemWidthGetter, maxLegendWidth);
  const measuredMaxWidth = Math.max(
    80,
    maxLegendWidth - examGraphTheme.layout.legendSidePadding * 2 - examGraphTheme.legend.paddingX * 2,
  );
  const rowWidths = rows.map((row) => {
    const itemWidths = row.map(itemWidthGetter);
    const rawRowWidth = itemWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, row.length - 1) * examGraphTheme.legend.itemGap;
    return Math.min(rawRowWidth, measuredMaxWidth);
  });
  const width = snapExamGraphCoordinate(Math.max(...rowWidths, 0) + examGraphTheme.legend.paddingX * 2);
  const height = snapExamGraphCoordinate(rows.length * examGraphTheme.legend.rowHeight + examGraphTheme.legend.paddingY * 2);
  return { rows, rowWidths, width, height };
}

function measureExamGraphSwatchLegend(items, maxLegendWidth = examGraphTheme.layout.width) {
  return measureExamGraphLegendRows(
    items,
    (item) => examGraphTheme.legend.swatchGap + String(item.label).length * examGraphTheme.legend.charWidth,
    maxLegendWidth,
  );
}

function measureExamGraphLineLegend(rows, maxLegendWidth = examGraphTheme.layout.width) {
  const theme = getActiveExamGraphVisualTheme();
  return measureExamGraphLegendRows(
    rows,
    (row) =>
      2 * theme.marker.trendRadius +
      examGraphTheme.legend.lineLabelGap +
      String(row.displayLabel).length * examGraphTheme.legend.charWidth,
    maxLegendWidth,
  );
}

function getExamGraphLegendCenterY(plotBottom, measurement) {
  const tickBand = examGraphTheme.layout.xTickGap + examGraphTheme.type.axisTick;
  return snapExamGraphCoordinate(plotBottom + tickBand + examGraphTheme.layout.plotToLegend + measurement.height / 2);
}

function getExamGraphLegendBottomY(legendCenterY, measurement) {
  return snapExamGraphCoordinate(legendCenterY + measurement.height / 2);
}

function getExamGraphNoteBaselineY(legendCenterY, measurement) {
  return snapExamGraphCoordinate(getExamGraphLegendBottomY(legendCenterY, measurement) + examGraphTheme.layout.legendToNote + examGraphTheme.type.footnote);
}

function getExamGraphHeightAfterLegend(legendCenterY, measurement) {
  return snapExamGraphCoordinate(getExamGraphLegendBottomY(legendCenterY, measurement) + examGraphTheme.layout.bottomPadding);
}

function getExamGraphHeightAfterNote(noteY) {
  return snapExamGraphCoordinate(noteY + examGraphTheme.layout.bottomPadding);
}

function appendExamGraphLineLegend(svg, rows, centerX, y, maxLegendWidth = examGraphTheme.layout.width) {
  const theme = getActiveExamGraphVisualTheme();
  const measurement = measureExamGraphLineLegend(rows, maxLegendWidth);
  const halfLegendWidth = measurement.width / 2;
  const minBoxX = examGraphTheme.layout.legendSidePadding;
  const maxBoxX = maxLegendWidth - examGraphTheme.layout.legendSidePadding - measurement.width;
  const boxX = snapExamGraphCoordinate(
    clamp(centerX - halfLegendWidth, minBoxX, Math.max(minBoxX, maxBoxX)),
  );
  const boxY = snapExamGraphCoordinate(y - measurement.height / 2);

  let itemIndex = 0;
  measurement.rows.forEach((legendRow, rowIndex) => {
    const innerWidth = Math.max(0, measurement.width - examGraphTheme.legend.paddingX * 2);
    const rowWidth = Math.min(innerWidth, measurement.rowWidths[rowIndex]);
    let cursorX = snapExamGraphCoordinate(boxX + examGraphTheme.legend.paddingX + (innerWidth - rowWidth) / 2);
    const rowY = snapExamGraphCoordinate(boxY + examGraphTheme.legend.paddingY + rowIndex * examGraphTheme.legend.rowHeight + examGraphTheme.legend.rowHeight / 2);
    legendRow.forEach((row) => {
      const style = getExamGraphLineStyle(itemIndex);
      const itemWidth =
        2 * theme.marker.trendRadius +
        examGraphTheme.legend.lineLabelGap +
        String(row.displayLabel).length * examGraphTheme.legend.charWidth;
      const sample = createSvgElement("circle");
      setExamGraphCoordinate(sample, "cx", cursorX + theme.marker.trendRadius);
      setExamGraphCoordinate(sample, "cy", rowY);
      setExamGraphCoordinate(sample, "r", theme.marker.trendRadius);
      sample.setAttribute("fill", style.stroke);
      if (isExamGraphBasicStyle()) {
        sample.setAttribute("stroke", theme.colors.paper);
        sample.setAttribute("stroke-width", theme.strokes.marker);
        applyExamGraphStrokeStyle(sample);
      }
      svg.appendChild(sample);

      const label = createSvgElement("text");
      setExamGraphCoordinate(
        label,
        "x",
        cursorX + 2 * theme.marker.trendRadius + examGraphTheme.legend.lineLabelGap,
      );
      setExamGraphCoordinate(label, "y", rowY + 2.8);
      applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.legend, fontWeight: 600 });
      label.textContent = row.displayLabel;
      svg.appendChild(label);

      cursorX = snapExamGraphCoordinate(cursorX + itemWidth + examGraphTheme.legend.itemGap);
      itemIndex += 1;
    });
  });
  return measurement;
}

function buildExamStackedCompositionSvg({ title, subtitle, rows, legendItems, footnote, mode = "share", valueFormatter = (value) => formatPercent(value) }) {
  if (getExamGraphOrientation() === "portrait") {
    return buildExamStackedCompositionSvgPortrait({ title, subtitle, rows, legendItems, footnote, mode, valueFormatter });
  }

  const width = examGraphTheme.layout.width;
  const plotLeft = 88;
  const plotTop = examGraphTheme.layout.plotTop;
  const plotWidth = width - plotLeft - 24;
  const barHeight = 12.5;
  const rowGap = examGraphTheme.layout.blockGap;
  const plotHeight = rows.length * (barHeight + rowGap) - rowGap;
  const legendMeasurement = measureExamGraphSwatchLegend(legendItems);
  const legendY = getExamGraphLegendCenterY(plotTop + plotHeight, legendMeasurement);
  const height = getExamGraphHeightAfterLegend(legendY, legendMeasurement);
  const svg = createExamGraphSvg(width, height, title);
  appendExamGraphPatternDefs(svg);
  appendExamGraphTitle(svg, title, subtitle, width);

  const amountDomain = getExamGraphAxisDomain(rows.map((row) => Number(row.total) || 0), { forceZeroStart: true, paddingRatio: 0.04 });
  const domainMinimum = mode === "amount" ? amountDomain.minimum : 0;
  const domainMaximum = mode === "amount" ? amountDomain.maximum : 100;
  const ticks = mode === "amount" ? getExamGraphAxisTicks(domainMinimum, domainMaximum, 5) : [0, 20, 40, 60, 80, 100];
  const axisTickFormat = buildExamGraphAxisTickFormatter(
    mode === "amount" ? [...ticks, ...rows.map((row) => Number(row.total) || 0)] : ticks,
    mode === "amount" ? valueFormatter : (tick) => `${tick}%`,
  );

  appendExamGraphPlotFrame(svg, { x: plotLeft, y: plotTop, width: plotWidth, height: plotHeight });

  const valueToX = appendExamGraphXAxis(svg, {
    plotLeft,
    plotTop,
    plotWidth,
    plotHeight,
    ticks,
    minimum: domainMinimum,
    maximum: domainMaximum,
    valueFormatter: mode === "amount" ? valueFormatter : (tick) => (tick === 100 ? "100(%)" : String(tick)),
    axisFormatter: axisTickFormat.formatTick,
    axisUnitLabel: axisTickFormat.unitLabel,
    rangePadding: getExamGraphAxisRangePadding(),
  });

  rows.forEach((row, rowIndex) => {
    const y = snapExamGraphCoordinate(plotTop + rowIndex * (barHeight + rowGap));
    const label = createSvgElement("text");
    setExamGraphCoordinate(label, "x", plotLeft - examGraphTheme.layout.labelGap);
    setExamGraphCoordinate(label, "y", y + barHeight / 2 + 1);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("dominant-baseline", "middle");
    applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.rowLabel, fontWeight: 600 });
    label.textContent = row.displayLabel;
    svg.appendChild(label);

    let cumulativeValue = 0;
    let cursorX = valueToX(0);
    row.segments.forEach((segment, segmentIndex) => {
      const rect = createSvgElement("rect");
      const segmentValue = mode === "amount" ? Number(segment.value) || 0 : clamp(Number(segment.share) || 0, 0, 100);
      const nextValue = cumulativeValue + segmentValue;
      const segmentWidth = Math.max(1, Math.abs(valueToX(nextValue) - valueToX(cumulativeValue)));
      setExamGraphBox(rect, { x: cursorX, y, width: segmentWidth, height: barHeight });
      styleExamGraphDataRect(rect, getExamGraphFill(segmentIndex));
      svg.appendChild(rect);
      cursorX += segmentWidth;
      cumulativeValue = nextValue;
    });
  });

  appendExamGraphPlotBorder(svg, { x: plotLeft, y: plotTop, width: plotWidth, height: plotHeight });
  appendExamGraphLegend(svg, legendItems, width / 2, legendY);

  return svg;
}

function buildExamStackedCompositionSvgPortrait({ title, subtitle, rows, legendItems, footnote, mode = "share", valueFormatter = (value) => formatPercent(value) }) {
  const width = examGraphTheme.layout.width;
  const plot = { left: 34, right: 8, top: examGraphTheme.layout.plotTop };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = 218;
  const legendMeasurement = measureExamGraphSwatchLegend(legendItems);
  const legendY = getExamGraphLegendCenterY(plot.top + plotHeight, legendMeasurement);
  const height = getExamGraphHeightAfterLegend(legendY, legendMeasurement);
  const step = plotWidth / rows.length;
  const columnWidth = Math.min(17, step * 0.68);
  const amountDomain = getExamGraphAxisDomain(rows.map((row) => Number(row.total) || 0), { forceZeroStart: true, paddingRatio: 0.04 });
  const domainMinimum = mode === "amount" ? amountDomain.minimum : 0;
  const domainMaximum = mode === "amount" ? amountDomain.maximum : 100;
  const ticks = mode === "amount" ? getExamGraphAxisTicks(domainMinimum, domainMaximum, 5) : [0, 20, 40, 60, 80, 100];
  const axisTickFormat = buildExamGraphAxisTickFormatter(
    mode === "amount" ? [...ticks, ...rows.map((row) => Number(row.total) || 0)] : ticks,
    mode === "amount" ? valueFormatter : (tick) => `${tick}%`,
  );
  const svg = createExamGraphSvg(width, height, title);
  appendExamGraphPatternDefs(svg);
  appendExamGraphTitle(svg, title, subtitle, width);

  appendExamGraphPlotFrame(svg, { x: plot.left, y: plot.top, width: plotWidth, height: plotHeight });

  const valueToY = appendExamGraphYAxis(svg, {
    plotLeft: plot.left,
    plotTop: plot.top,
    plotWidth,
    plotHeight,
    ticks,
    minimum: domainMinimum,
    maximum: domainMaximum,
    valueFormatter: mode === "amount" ? valueFormatter : (tick) => (tick === 100 ? "100(%)" : String(tick)),
    axisFormatter: axisTickFormat.formatTick,
    axisUnitLabel: axisTickFormat.unitLabel,
    rangePadding: getExamGraphAxisRangePadding(),
  });
  const baselineY = valueToY(domainMinimum);

  rows.forEach((row, rowIndex) => {
    const x = plot.left + step * rowIndex + (step - columnWidth) / 2;
    let cumulativeValue = 0;
    let cursorY = baselineY;
    row.segments.forEach((segment, segmentIndex) => {
      const segmentValue = mode === "amount" ? Number(segment.value) || 0 : clamp(Number(segment.share) || 0, 0, 100);
      cumulativeValue += segmentValue;
      const nextY = valueToY(cumulativeValue);
      const rect = createSvgElement("rect");
      rect.setAttribute("x", String(x));
      rect.setAttribute("y", String(nextY));
      rect.setAttribute("width", String(columnWidth));
      rect.setAttribute("height", String(Math.max(1, cursorY - nextY)));
      styleExamGraphDataRect(rect, getExamGraphFill(segmentIndex));
      svg.appendChild(rect);
      cursorY = nextY;
    });

    const label = createSvgElement("text");
    label.setAttribute("x", String(x + columnWidth / 2));
    label.setAttribute("y", String(plot.top + plotHeight + 13));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("transform", `rotate(-55 ${x + columnWidth / 2} ${plot.top + plotHeight + 13})`);
    applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.axisTick, fontWeight: 600 });
    label.textContent = row.displayLabel;
    svg.appendChild(label);
  });

  appendExamGraphPlotBorder(svg, { x: plot.left, y: plot.top, width: plotWidth, height: plotHeight });
  appendExamGraphLegend(svg, legendItems, width / 2, legendY);

  return svg;
}

function buildExamSingleBarSvg({ title, subtitle, rows, valueFormatter, axisFormatter = null }) {
  if (getExamGraphOrientation() === "portrait") {
    return buildExamSingleBarSvgPortrait({ title, subtitle, rows, valueFormatter, axisFormatter });
  }

  const width = examGraphTheme.layout.width;
  const plotLeft = 88;
  const plotTop = examGraphTheme.layout.plotTop;
  const plotWidth = width - plotLeft - 24;
  const barHeight = 9.5;
  const rowGap = examGraphTheme.layout.blockGap;
  const plotHeight = rows.length * (barHeight + rowGap) - rowGap;
  const height = plotTop + plotHeight + 28;
  const values = rows.map((row) => Number(row.displayValue ?? row.value));
  const { minimum, maximum } = getExamGraphAxisDomain(values, { paddingRatio: 0.04 });
  const ticks = getExamGraphAxisTicks(minimum, maximum, 5);
  const axisTickFormat = buildExamGraphAxisTickFormatter([...ticks, ...values], valueFormatter);

  const svg = createExamGraphSvg(width, height, title);
  appendExamGraphPatternDefs(svg);
  appendExamGraphTitle(svg, title, subtitle, width);

  appendExamGraphPlotFrame(svg, { x: plotLeft, y: plotTop, width: plotWidth, height: plotHeight });

  const valueToX = appendExamGraphXAxis(svg, {
    plotLeft,
    plotTop,
    plotWidth,
    plotHeight,
    ticks,
    minimum,
    maximum,
    valueFormatter,
    axisFormatter: axisFormatter ?? axisTickFormat.formatTick,
    axisUnitLabel: axisTickFormat.unitLabel,
    rangePadding: getExamGraphAxisRangePadding(),
  });
  const zeroX = valueToX(0);

  rows.forEach((row, rowIndex) => {
    const y = snapExamGraphCoordinate(plotTop + rowIndex * (barHeight + rowGap));
    const value = Number(row.displayValue ?? row.value) || 0;
    const barStart = Math.min(zeroX, valueToX(value));
    const barWidth = Math.max(1, Math.abs(valueToX(value) - zeroX));

    const label = createSvgElement("text");
    setExamGraphCoordinate(label, "x", plotLeft - examGraphTheme.layout.labelGap);
    setExamGraphCoordinate(label, "y", y + barHeight / 2);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("dominant-baseline", "middle");
    applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.rowLabelCompact, fontWeight: 600 });
    label.textContent = row.displayLabel;
    svg.appendChild(label);

    const rect = createSvgElement("rect");
    setExamGraphBox(rect, { x: barStart, y, width: barWidth, height: barHeight });
    styleExamGraphDataRect(rect, getExamGraphFill(rowIndex));
    svg.appendChild(rect);
  });

  appendExamGraphPlotBorder(svg, { x: plotLeft, y: plotTop, width: plotWidth, height: plotHeight });
  return svg;
}

function buildExamSingleBarSvgPortrait({ title, subtitle, rows, valueFormatter, axisFormatter = null }) {
  const width = examGraphTheme.layout.width;
  const height = 308;
  const plot = { left: 34, right: 8, top: examGraphTheme.layout.plotTop, bottom: 58 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const values = rows.map((row) => Number(row.displayValue ?? row.value));
  const { minimum, maximum } = getExamGraphAxisDomain(values, { paddingRatio: 0.04 });
  const ticks = getExamGraphAxisTicks(minimum, maximum, 5);
  const axisTickFormat = buildExamGraphAxisTickFormatter([...ticks, ...values], valueFormatter);
  const step = plotWidth / rows.length;
  const columnWidth = Math.min(16, step * 0.7);
  const svg = createExamGraphSvg(width, height, title);
  appendExamGraphPatternDefs(svg);
  appendExamGraphTitle(svg, title, subtitle, width);

  appendExamGraphPlotFrame(svg, { x: plot.left, y: plot.top, width: plotWidth, height: plotHeight });

  const valueToY = appendExamGraphYAxis(svg, {
    plotLeft: plot.left,
    plotTop: plot.top,
    plotWidth,
    plotHeight,
    ticks,
    minimum,
    maximum,
    valueFormatter,
    axisFormatter: axisFormatter ?? axisTickFormat.formatTick,
    axisUnitLabel: axisTickFormat.unitLabel,
    rangePadding: getExamGraphAxisRangePadding(),
  });
  const zeroY = valueToY(0);

  rows.forEach((row, rowIndex) => {
    const value = Number(row.displayValue ?? row.value) || 0;
    const x = snapExamGraphCoordinate(plot.left + step * rowIndex + (step - columnWidth) / 2);
    const y = Math.min(zeroY, valueToY(value));
    const rect = createSvgElement("rect");
    setExamGraphBox(rect, { x, y, width: columnWidth, height: Math.max(1, Math.abs(valueToY(value) - zeroY)) });
    styleExamGraphDataRect(rect, getExamGraphFill(rowIndex));
    svg.appendChild(rect);

    const label = createSvgElement("text");
    label.setAttribute("x", String(x + columnWidth / 2));
    label.setAttribute("y", String(plot.top + plotHeight + 13));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("transform", `rotate(-55 ${x + columnWidth / 2} ${plot.top + plotHeight + 13})`);
    applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.axisTick, fontWeight: 600 });
    label.textContent = row.displayLabel;
    svg.appendChild(label);
  });

  appendExamGraphPlotBorder(svg, { x: plot.left, y: plot.top, width: plotWidth, height: plotHeight });
  return svg;
}

function buildExamPairedBarSvg({ title, subtitle, rows, legendItems, valueFormatter, axisFormatter = null }) {
  if (getExamGraphOrientation() === "portrait") {
    return buildExamPairedBarSvgPortrait({ title, subtitle, rows, legendItems, valueFormatter, axisFormatter });
  }

  const width = examGraphTheme.layout.width;
  const plotLeft = 88;
  const plotTop = examGraphTheme.layout.plotTop;
  const plotWidth = width - plotLeft - 24;
  const barHeight = 7;
  const groupGap = examGraphTheme.layout.blockGap;
  const groupHeight = barHeight * 2 + 4;
  const plotHeight = rows.length * (groupHeight + groupGap) - groupGap;
  const legendMeasurement = measureExamGraphSwatchLegend(legendItems);
  const legendY = getExamGraphLegendCenterY(plotTop + plotHeight, legendMeasurement);
  const height = getExamGraphHeightAfterLegend(legendY, legendMeasurement);
  const values = rows.flatMap((row) => [Number(row.displayFirstValue), Number(row.displaySecondValue)]);
  const { minimum, maximum } = getExamGraphAxisDomain(values, { forceZeroStart: true, paddingRatio: 0.04 });
  const ticks = getExamGraphAxisTicks(minimum, maximum, 5);
  const axisTickFormat = buildExamGraphAxisTickFormatter([...ticks, ...values], valueFormatter);

  const svg = createExamGraphSvg(width, height, title);
  appendExamGraphPatternDefs(svg);
  appendExamGraphTitle(svg, title, subtitle, width);

  appendExamGraphPlotFrame(svg, { x: plotLeft, y: plotTop, width: plotWidth, height: plotHeight });

  const valueToX = appendExamGraphXAxis(svg, {
    plotLeft,
    plotTop,
    plotWidth,
    plotHeight,
    ticks,
    minimum,
    maximum,
    valueFormatter,
    axisFormatter: axisFormatter ?? axisTickFormat.formatTick,
    axisUnitLabel: axisTickFormat.unitLabel,
    rangePadding: getExamGraphAxisRangePadding(),
  });
  const zeroX = valueToX(0);

  rows.forEach((row, rowIndex) => {
    const y = snapExamGraphCoordinate(plotTop + rowIndex * (groupHeight + groupGap));
    const label = createSvgElement("text");
    setExamGraphCoordinate(label, "x", plotLeft - examGraphTheme.layout.labelGap);
    setExamGraphCoordinate(label, "y", y + groupHeight / 2);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("dominant-baseline", "middle");
    applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.rowLabel, fontWeight: 600 });
    label.textContent = row.displayLabel;
    svg.appendChild(label);

    [
      { value: row.displayFirstValue, yOffset: 0, fill: legendItems[0]?.fill ?? getExamGraphFill(0), seriesIndex: 0 },
      { value: row.displaySecondValue, yOffset: barHeight + 4, fill: legendItems[1]?.fill ?? getExamGraphFill(1), seriesIndex: 1 },
    ].forEach((bar) => {
      const x = Math.min(zeroX, valueToX(bar.value));
      const rect = createSvgElement("rect");
      setExamGraphBox(rect, { x, y: y + bar.yOffset, width: Math.max(1, Math.abs(valueToX(bar.value) - zeroX)), height: barHeight });
      styleExamGraphDataRect(rect, bar.fill);
      svg.appendChild(rect);
    });
  });

  appendExamGraphPlotBorder(svg, { x: plotLeft, y: plotTop, width: plotWidth, height: plotHeight });
  appendExamGraphLegend(svg, legendItems, width / 2, legendY);
  return svg;
}

function buildExamPairedBarSvgPortrait({ title, subtitle, rows, legendItems, valueFormatter, axisFormatter = null }) {
  const width = examGraphTheme.layout.width;
  const height = 326;
  const plot = { left: 34, right: 8, top: examGraphTheme.layout.plotTop, bottom: 76 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const values = rows.flatMap((row) => [Number(row.displayFirstValue), Number(row.displaySecondValue)]);
  const { minimum, maximum } = getExamGraphAxisDomain(values, { forceZeroStart: true, paddingRatio: 0.04 });
  const ticks = getExamGraphAxisTicks(minimum, maximum, 5);
  const axisTickFormat = buildExamGraphAxisTickFormatter([...ticks, ...values], valueFormatter);
  const step = plotWidth / rows.length;
  const groupWidth = Math.min(20, step * 0.78);
  const barGap = Math.min(3, groupWidth * 0.12);
  const barWidth = Math.max(6, (groupWidth - barGap) / 2);

  const svg = createExamGraphSvg(width, height, title);
  appendExamGraphPatternDefs(svg);
  appendExamGraphTitle(svg, title, subtitle, width);

  appendExamGraphPlotFrame(svg, { x: plot.left, y: plot.top, width: plotWidth, height: plotHeight });

  const valueToY = appendExamGraphYAxis(svg, {
    plotLeft: plot.left,
    plotTop: plot.top,
    plotWidth,
    plotHeight,
    ticks,
    minimum,
    maximum,
    valueFormatter,
    axisFormatter: axisFormatter ?? axisTickFormat.formatTick,
    axisUnitLabel: axisTickFormat.unitLabel,
    rangePadding: getExamGraphAxisRangePadding(),
  });
  const zeroY = valueToY(0);

  rows.forEach((row, rowIndex) => {
    const x = plot.left + step * rowIndex + (step - groupWidth) / 2;
    [
      { value: row.displayFirstValue, fill: legendItems[0]?.fill ?? getExamGraphFill(0), xOffset: 0 },
      { value: row.displaySecondValue, fill: legendItems[1]?.fill ?? getExamGraphFill(1), xOffset: barWidth + barGap },
    ].forEach((bar) => {
      const y = Math.min(zeroY, valueToY(bar.value));
      const rect = createSvgElement("rect");
      rect.setAttribute("x", String(x + bar.xOffset));
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", String(barWidth));
      rect.setAttribute("height", String(Math.max(1, Math.abs(valueToY(bar.value) - zeroY))));
      styleExamGraphDataRect(rect, bar.fill);
      svg.appendChild(rect);
    });

    const label = createSvgElement("text");
    label.setAttribute("x", String(x + groupWidth / 2));
    label.setAttribute("y", String(plot.top + plotHeight + 13));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("transform", `rotate(-55 ${x + groupWidth / 2} ${plot.top + plotHeight + 13})`);
    applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.axisTick, fontWeight: 600 });
    label.textContent = row.displayLabel;
    svg.appendChild(label);
  });

  const legendMeasurement = measureExamGraphSwatchLegend(legendItems);
  const legendY = getExamGraphLegendCenterY(plot.top + plotHeight, legendMeasurement);
  appendExamGraphPlotBorder(svg, { x: plot.left, y: plot.top, width: plotWidth, height: plotHeight });
  appendExamGraphLegend(svg, legendItems, width / 2, legendY);
  return svg;
}

function buildExamTimeCompareSvg({ title, subtitle, rows, startYear, endYear, valueFormatter, axisFormatter = null }) {
  if (getExamGraphOrientation() === "portrait") {
    return buildExamTimeCompareSvgPortrait({ title, subtitle, rows, startYear, endYear, valueFormatter, axisFormatter });
  }

  const width = examGraphTheme.layout.width;
  const plotLeft = 88;
  const plotTop = examGraphTheme.layout.plotTop;
  const plotWidth = width - plotLeft - 24;
  const barHeight = 7;
  const rowGap = examGraphTheme.layout.blockGap;
  const groupHeight = barHeight * 2 + 4;
  const plotHeight = rows.length * (groupHeight + rowGap) - rowGap;
  const legendItems = [
    { label: `${startYear}년`, fill: getExamGraphFill(1) },
    { label: `${endYear}년`, fill: getExamGraphFill(0) },
  ];
  const legendMeasurement = measureExamGraphSwatchLegend(legendItems);
  const legendY = getExamGraphLegendCenterY(plotTop + plotHeight, legendMeasurement);
  const height = getExamGraphHeightAfterLegend(legendY, legendMeasurement);
  const values = rows.flatMap((row) => [Number(row.displayStartValue ?? row.startValue), Number(row.displayEndValue ?? row.endValue)]);
  const { minimum, maximum } = getExamGraphAxisDomain(values, { forceZeroStart: true, paddingRatio: 0.04 });
  const ticks = getExamGraphAxisTicks(minimum, maximum, 5);
  const axisTickFormat = buildExamGraphAxisTickFormatter([...ticks, ...values], valueFormatter);
  const svg = createExamGraphSvg(width, height, title);
  appendExamGraphPatternDefs(svg);
  appendExamGraphTitle(svg, title, subtitle, width);

  appendExamGraphPlotFrame(svg, { x: plotLeft, y: plotTop, width: plotWidth, height: plotHeight });

  const valueToX = appendExamGraphXAxis(svg, {
    plotLeft,
    plotTop,
    plotWidth,
    plotHeight,
    ticks,
    minimum,
    maximum,
    valueFormatter,
    axisFormatter: axisFormatter ?? axisTickFormat.formatTick,
    axisUnitLabel: axisTickFormat.unitLabel,
    rangePadding: getExamGraphAxisRangePadding(),
  });
  const zeroX = valueToX(0);

  rows.forEach((row, rowIndex) => {
    const y = snapExamGraphCoordinate(plotTop + rowIndex * (groupHeight + rowGap));
    const label = createSvgElement("text");
    setExamGraphCoordinate(label, "x", plotLeft - examGraphTheme.layout.labelGap);
    setExamGraphCoordinate(label, "y", y + groupHeight / 2);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("dominant-baseline", "middle");
    applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.rowLabel, fontWeight: 600 });
    label.textContent = row.displayLabel;
    svg.appendChild(label);

    [
      { value: row.displayStartValue ?? row.startValue, yOffset: 0, fill: getExamGraphFill(1) },
      { value: row.displayEndValue ?? row.endValue, yOffset: barHeight + 4, fill: getExamGraphFill(0) },
    ].forEach((bar) => {
      const rect = createSvgElement("rect");
      setExamGraphBox(rect, {
        x: Math.min(zeroX, valueToX(bar.value)),
        y: y + bar.yOffset,
        width: Math.max(1, Math.abs(valueToX(bar.value) - zeroX)),
        height: barHeight,
      });
      styleExamGraphDataRect(rect, bar.fill);
      svg.appendChild(rect);
    });
  });

  appendExamGraphPlotBorder(svg, { x: plotLeft, y: plotTop, width: plotWidth, height: plotHeight });
  appendExamGraphLegend(svg, legendItems, width / 2, legendY);

  return svg;
}

function buildExamTimeCompareSvgPortrait({ title, subtitle, rows, startYear, endYear, valueFormatter, axisFormatter = null }) {
  const width = examGraphTheme.layout.width;
  const height = 326;
  const plot = { left: 34, right: 8, top: examGraphTheme.layout.plotTop, bottom: 76 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const values = rows.flatMap((row) => [Number(row.displayStartValue ?? row.startValue), Number(row.displayEndValue ?? row.endValue)]);
  const { minimum, maximum } = getExamGraphAxisDomain(values, { forceZeroStart: true, paddingRatio: 0.04 });
  const ticks = getExamGraphAxisTicks(minimum, maximum, 5);
  const axisTickFormat = buildExamGraphAxisTickFormatter([...ticks, ...values], valueFormatter);
  const step = plotWidth / rows.length;
  const groupWidth = Math.min(20, step * 0.78);
  const barGap = Math.min(3, groupWidth * 0.12);
  const barWidth = Math.max(6, (groupWidth - barGap) / 2);
  const svg = createExamGraphSvg(width, height, title);
  appendExamGraphPatternDefs(svg);
  appendExamGraphTitle(svg, title, subtitle, width);

  appendExamGraphPlotFrame(svg, { x: plot.left, y: plot.top, width: plotWidth, height: plotHeight });

  const valueToY = appendExamGraphYAxis(svg, {
    plotLeft: plot.left,
    plotTop: plot.top,
    plotWidth,
    plotHeight,
    ticks,
    minimum,
    maximum,
    valueFormatter,
    axisFormatter: axisFormatter ?? axisTickFormat.formatTick,
    axisUnitLabel: axisTickFormat.unitLabel,
    rangePadding: getExamGraphAxisRangePadding(),
  });
  const zeroY = valueToY(0);

  rows.forEach((row, rowIndex) => {
    const x = plot.left + step * rowIndex + (step - groupWidth) / 2;
    [
      { value: row.displayStartValue ?? row.startValue, fill: getExamGraphFill(1), xOffset: 0 },
      { value: row.displayEndValue ?? row.endValue, fill: getExamGraphFill(0), xOffset: barWidth + barGap },
    ].forEach((bar) => {
      const y = Math.min(zeroY, valueToY(bar.value));
      const rect = createSvgElement("rect");
      rect.setAttribute("x", String(x + bar.xOffset));
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", String(barWidth));
      rect.setAttribute("height", String(Math.max(1, Math.abs(valueToY(bar.value) - zeroY))));
      styleExamGraphDataRect(rect, bar.fill);
      svg.appendChild(rect);
    });

    const label = createSvgElement("text");
    label.setAttribute("x", String(x + groupWidth / 2));
    label.setAttribute("y", String(plot.top + plotHeight + 13));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("transform", `rotate(-55 ${x + groupWidth / 2} ${plot.top + plotHeight + 13})`);
    applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.axisTick, fontWeight: 600 });
    label.textContent = row.displayLabel;
    svg.appendChild(label);
  });

  const legendItems = [
    { label: `${startYear}년`, fill: getExamGraphFill(1) },
    { label: `${endYear}년`, fill: getExamGraphFill(0) },
  ];
  const legendMeasurement = measureExamGraphSwatchLegend(legendItems);
  const legendY = getExamGraphLegendCenterY(plot.top + plotHeight, legendMeasurement);
  appendExamGraphPlotBorder(svg, { x: plot.left, y: plot.top, width: plotWidth, height: plotHeight });
  appendExamGraphLegend(svg, legendItems, width / 2, legendY);

  return svg;
}

function buildExamTrendLineSvg({ title, subtitle, rows, years, valueFormatter, axisFormatter = null }) {
  const isPortrait = getExamGraphOrientation() === "portrait";
  const width = examGraphTheme.layout.width;
  const plot = isPortrait
    ? { left: 32, right: 8, top: examGraphTheme.layout.plotTop }
    : { left: 32, right: 8, top: examGraphTheme.layout.plotTop };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = isPortrait ? 142 : 124;
  const legendMeasurement = measureExamGraphLineLegend(rows, width);
  const legendY = getExamGraphLegendCenterY(plot.top + plotHeight, legendMeasurement);
  const height = getExamGraphHeightAfterLegend(legendY, legendMeasurement);
  const values = rows.flatMap((row) => row.points.map((point) => Number(point.displayValue ?? point.value)));
  const { minimum, maximum } = getExamGraphAxisDomain(values, { paddingRatio: 0.08 });
  const ticks = getExamGraphAxisTicks(minimum, maximum, 5);
  const axisTickFormat = buildExamGraphAxisTickFormatter([...ticks, ...values], valueFormatter);
  const rangePadding = getExamGraphAxisRangePadding();
  const scaleLeft = plot.left + rangePadding;
  const scaleWidth = Math.max(1, plotWidth - rangePadding * 2);
  const scaleTop = plot.top + rangePadding;
  const scaleHeight = Math.max(1, plotHeight - rangePadding * 2);
  const xStep = years.length > 1 ? scaleWidth / (years.length - 1) : 0;
  const yearToX = new Map(years.map((year, index) => [year, snapExamGraphCoordinate(scaleLeft + xStep * index)]));
  const valueToY = (value) => snapExamGraphCoordinate(scaleTop + (1 - (Number(value) - minimum) / (maximum - minimum)) * scaleHeight);

  const svg = createExamGraphSvg(width, height, title);
  appendExamGraphPatternDefs(svg);
  appendExamGraphTitle(svg, title, subtitle, width);

  appendExamGraphPlotFrame(svg, { x: plot.left, y: plot.top, width: plotWidth, height: plotHeight });

  ticks.forEach((tick) => {
    const y = valueToY(tick);
    const line = createSvgElement("line");
    setExamGraphCoordinate(line, "x1", plot.left);
    setExamGraphCoordinate(line, "x2", plot.left + plotWidth);
    setExamGraphCoordinate(line, "y1", y);
    setExamGraphCoordinate(line, "y2", y);
    styleExamGraphGridLine(line, { zero: Math.abs(tick) < 0.000001 });
    svg.appendChild(line);

    const label = createSvgElement("text");
    setExamGraphCoordinate(label, "x", plot.left - examGraphTheme.layout.yTickGap);
    setExamGraphCoordinate(label, "y", y + 2.5);
    label.setAttribute("text-anchor", "end");
    applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.axisTick, fontWeight: 600 });
    label.textContent = axisFormatter ? axisFormatter(tick) : axisTickFormat.formatTick(tick);
    svg.appendChild(label);
  });
  appendExamGraphAxisUnitLabel(svg, {
    text: axisTickFormat.unitLabel,
    x: plot.left + 4,
    y: plot.top + 8,
    anchor: "start",
  });

  const tickStep = years.length > 8 ? Math.ceil(years.length / 6) : 1;
  years.forEach((year, index) => {
    if (index !== 0 && index !== years.length - 1 && index % tickStep !== 0) {
      return;
    }
    const x = yearToX.get(year);
    const line = createSvgElement("line");
    setExamGraphCoordinate(line, "x1", x);
    setExamGraphCoordinate(line, "x2", x);
    setExamGraphCoordinate(line, "y1", plot.top);
    setExamGraphCoordinate(line, "y2", plot.top + plotHeight);
    styleExamGraphGridLine(line);
    svg.appendChild(line);

    const label = createSvgElement("text");
    setExamGraphCoordinate(label, "x", x);
    setExamGraphCoordinate(label, "y", plot.top + plotHeight + examGraphTheme.layout.xTickGap);
    label.setAttribute("text-anchor", "middle");
    applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.axisTick, fontWeight: 600 });
    label.textContent = `${year}`;
    svg.appendChild(label);
  });

  rows.forEach((row, rowIndex) => {
    const theme = getActiveExamGraphVisualTheme();
    const style = getExamGraphLineStyle(rowIndex);
    const points = row.points
      .map((point) => ({
        x: yearToX.get(point.year),
        y: valueToY(point.displayValue ?? point.value),
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (points.length > 1) {
      const path = createSvgElement("path");
      path.setAttribute(
        "d",
        points.map((point, index) => `${index ? "L" : "M"} ${formatExamGraphCoordinate(point.x)} ${formatExamGraphCoordinate(point.y)}`).join(" "),
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", style.stroke);
      path.setAttribute("stroke-width", theme.strokes.line);
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      if (style.dasharray) {
        path.setAttribute("stroke-dasharray", style.dasharray);
      }
      applyExamGraphStrokeStyle(path);
      svg.appendChild(path);
    }
    row.points.forEach((point) => {
      const dot = createSvgElement("circle");
      setExamGraphCoordinate(dot, "cx", yearToX.get(point.year));
      setExamGraphCoordinate(dot, "cy", valueToY(point.displayValue ?? point.value));
      setExamGraphCoordinate(dot, "r", theme.marker.trendRadius);
      dot.setAttribute("fill", style.stroke);
      if (isExamGraphBasicStyle()) {
        dot.setAttribute("stroke", theme.colors.paper);
        dot.setAttribute("stroke-width", theme.strokes.marker);
        applyExamGraphStrokeStyle(dot);
      }
      svg.appendChild(dot);
    });
  });

  appendExamGraphPlotBorder(svg, { x: plot.left, y: plot.top, width: plotWidth, height: plotHeight });
  appendExamGraphLineLegend(svg, rows, width / 2, legendY, width);
  return svg;
}

function buildExamScatterSvg({ title, subtitle, rows, xLabel, yLabel, xFormatter, yFormatter, sizeFormatter }) {
  const theme = getActiveExamGraphVisualTheme();
  const isPortrait = getExamGraphOrientation() === "portrait";
  const width = examGraphTheme.layout.width;
  const height = isPortrait ? 236 : 218;
  const plot = isPortrait
    ? { left: 36, right: 10, top: examGraphTheme.layout.plotTop, bottom: 46 }
    : { left: 36, right: 10, top: examGraphTheme.layout.plotTop, bottom: 40 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const svg = createExamGraphSvg(width, height, title);
  appendExamGraphTitle(svg, title, subtitle, width);

  const xDomain = getExamGraphAxisDomain(rows.map((row) => Number(row.xValue)), { paddingRatio: 0.08 });
  const yDomain = getExamGraphAxisDomain(rows.map((row) => Number(row.yValue)), { paddingRatio: 0.08 });
  const minX = xDomain.minimum;
  const maxX = xDomain.maximum;
  const minY = yDomain.minimum;
  const maxY = yDomain.maximum;
  const xTicks = getExamGraphAxisTicks(minX, maxX, 5);
  const yTicks = getExamGraphAxisTicks(minY, maxY, 5);
  const xAxisTickFormat = buildExamGraphAxisTickFormatter([...xTicks, ...rows.map((row) => Number(row.xValue))], xFormatter);
  const yAxisTickFormat = buildExamGraphAxisTickFormatter([...yTicks, ...rows.map((row) => Number(row.yValue))], yFormatter);
  const rangePadding = getExamGraphAxisRangePadding();
  const scaleLeft = plot.left + rangePadding;
  const scaleWidth = Math.max(1, plotWidth - rangePadding * 2);
  const scaleTop = plot.top + rangePadding;
  const scaleHeight = Math.max(1, plotHeight - rangePadding * 2);

  const maximumBubbleValue = Math.max(...rows.map((row) => Number(row.sizeValue) || 0), 1);
  const xToPosition = (value) => snapExamGraphCoordinate(scaleLeft + ((Number(value) - minX) / (maxX - minX)) * scaleWidth);
  const yToPosition = (value) => snapExamGraphCoordinate(scaleTop + (1 - (Number(value) - minY) / (maxY - minY)) * scaleHeight);
  const radiusForValue = (value) =>
    theme.marker.scatterMinRadius +
    Math.sqrt(Math.max(0, Number(value)) / maximumBubbleValue) *
      (theme.marker.scatterMaxRadius - theme.marker.scatterMinRadius);

  appendExamGraphPlotFrame(svg, { x: plot.left, y: plot.top, width: plotWidth, height: plotHeight });

  xTicks.forEach((tick) => {
    const x = xToPosition(tick);
    const isEdge = Math.abs(tick - minX) < 0.000001 || Math.abs(tick - maxX) < 0.000001;
    const isZero = Math.abs(tick) < 0.000001;
    if (!isEdge || isZero) {
      const vertical = createSvgElement("line");
      setExamGraphCoordinate(vertical, "x1", x);
      setExamGraphCoordinate(vertical, "x2", x);
      setExamGraphCoordinate(vertical, "y1", plot.top);
      setExamGraphCoordinate(vertical, "y2", plot.top + plotHeight);
      styleExamGraphGridLine(vertical, { zero: isZero });
      svg.appendChild(vertical);
    }

    const label = createSvgElement("text");
    setExamGraphCoordinate(label, "x", x);
    setExamGraphCoordinate(label, "y", plot.top + plotHeight + examGraphTheme.layout.xTickGap);
    label.setAttribute("text-anchor", Math.abs(tick - minX) < 0.000001 ? "start" : Math.abs(tick - maxX) < 0.000001 ? "end" : "middle");
    applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.axisTick, fontWeight: 600 });
    label.textContent = xAxisTickFormat.formatTick(tick);
    svg.appendChild(label);
  });
  appendExamGraphAxisUnitLabel(svg, {
    text: xAxisTickFormat.unitLabel,
    x: plot.left + plotWidth,
    y: plot.top + plotHeight + examGraphTheme.layout.xTickGap + examGraphTheme.type.axisTick + 6,
    anchor: "end",
  });

  yTicks.forEach((tick) => {
    const y = yToPosition(tick);
    const isEdge = Math.abs(tick - minY) < 0.000001 || Math.abs(tick - maxY) < 0.000001;
    const isZero = Math.abs(tick) < 0.000001;
    if (!isEdge || isZero) {
      const horizontal = createSvgElement("line");
      setExamGraphCoordinate(horizontal, "x1", plot.left);
      setExamGraphCoordinate(horizontal, "x2", plot.left + plotWidth);
      setExamGraphCoordinate(horizontal, "y1", y);
      setExamGraphCoordinate(horizontal, "y2", y);
      styleExamGraphGridLine(horizontal, { zero: isZero });
      svg.appendChild(horizontal);
    }

    const label = createSvgElement("text");
    setExamGraphCoordinate(label, "x", plot.left - examGraphTheme.layout.yTickGap);
    setExamGraphCoordinate(label, "y", y + 2.5);
    label.setAttribute("text-anchor", "end");
    applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.axisTick, fontWeight: 600 });
    label.textContent = yAxisTickFormat.formatTick(tick);
    svg.appendChild(label);
  });
  appendExamGraphAxisUnitLabel(svg, {
    text: yAxisTickFormat.unitLabel,
    x: plot.left + 4,
    y: plot.top + 8,
    anchor: "start",
  });

  rows.forEach((row) => {
    const circle = createSvgElement("circle");
    setExamGraphCoordinate(circle, "cx", xToPosition(row.xValue));
    setExamGraphCoordinate(circle, "cy", yToPosition(row.yValue));
    setExamGraphCoordinate(circle, "r", radiusForValue(row.sizeValue));
    circle.setAttribute("fill", isExamGraphBasicStyle() ? theme.colors.pointFill : theme.colors.paper);
    circle.setAttribute("stroke", theme.colors.ink);
    circle.setAttribute("stroke-width", theme.strokes.marker);
    applyExamGraphStrokeStyle(circle);
    svg.appendChild(circle);

    const label = createSvgElement("text");
    setExamGraphCoordinate(label, "x", xToPosition(row.xValue) + radiusForValue(row.sizeValue) + 2.5);
    setExamGraphCoordinate(label, "y", yToPosition(row.yValue) - 1.5);
    applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.pointLabel, fontWeight: 600 });
    label.textContent = row.displayLabel;
    svg.appendChild(label);
  });

  const xAxisLabel = createSvgElement("text");
  setExamGraphCoordinate(xAxisLabel, "x", plot.left + plotWidth / 2);
  setExamGraphCoordinate(xAxisLabel, "y", height - 8);
  xAxisLabel.setAttribute("text-anchor", "middle");
  applyExamGraphTextStyle(xAxisLabel, { fontSize: examGraphTheme.type.axisTitle, fontWeight: 600 });
  xAxisLabel.textContent = `${xLabel} · 버블 ${sizeFormatter(maximumBubbleValue)}`;
  svg.appendChild(xAxisLabel);

  const yAxisLabel = createSvgElement("text");
  setExamGraphCoordinate(yAxisLabel, "x", 9);
  setExamGraphCoordinate(yAxisLabel, "y", plot.top + plotHeight / 2);
  yAxisLabel.setAttribute("text-anchor", "middle");
  yAxisLabel.setAttribute("transform", `rotate(-90 9 ${plot.top + plotHeight / 2})`);
  applyExamGraphTextStyle(yAxisLabel, { fontSize: examGraphTheme.type.axisTitle, fontWeight: 600 });
  yAxisLabel.textContent = yLabel;
  svg.appendChild(yAxisLabel);

  appendExamGraphPlotBorder(svg, { x: plot.left, y: plot.top, width: plotWidth, height: plotHeight });
  return svg;
}

function appendExamGraphPatternDefs(svg) {
  const theme = getActiveExamGraphVisualTheme();
  const defs = ensureDefsElement(svg);
  getActiveExamGraphPatternDefinitions().forEach((definition) => {
    if (!definition.pattern) {
      return;
    }
    const pattern = createSvgElement("pattern");
    pattern.setAttribute("id", `exam-pattern-${definition.key}`);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("width", String(theme.pattern.size));
    pattern.setAttribute("height", String(theme.pattern.size));

    const background = createSvgElement("rect");
    background.setAttribute("width", String(theme.pattern.size));
    background.setAttribute("height", String(theme.pattern.size));
    background.setAttribute("fill", theme.colors.paper);
    pattern.appendChild(background);

    if (definition.pattern === "vertical") {
      const line = createSvgElement("line");
      line.setAttribute("x1", String(theme.pattern.size / 2));
      line.setAttribute("x2", String(theme.pattern.size / 2));
      line.setAttribute("y1", "0");
      line.setAttribute("y2", String(theme.pattern.size));
      line.setAttribute("stroke", theme.colors.ink);
      line.setAttribute("stroke-width", String(theme.pattern.strokeWidth));
      pattern.appendChild(line);
    } else if (definition.pattern === "diagonal") {
      [
        { x1: "-1", y1: String(theme.pattern.size + 1), x2: String(theme.pattern.size + 1), y2: "-1" },
        { x1: String(theme.pattern.size / 2), y1: String(theme.pattern.size + 2), x2: String(theme.pattern.size + 4), y2: "0" },
      ].forEach((config) => {
        const line = createSvgElement("line");
        Object.entries(config).forEach(([key, value]) => line.setAttribute(key, value));
        line.setAttribute("stroke", theme.colors.ink);
        line.setAttribute("stroke-width", String(theme.pattern.strokeWidth));
        pattern.appendChild(line);
      });
    } else if (definition.pattern === "dots") {
      const dot = createSvgElement("circle");
      dot.setAttribute("cx", String(theme.pattern.size / 2));
      dot.setAttribute("cy", String(theme.pattern.size / 2));
      dot.setAttribute("r", "0.9");
      dot.setAttribute("fill", theme.colors.ink);
      pattern.appendChild(dot);
    } else if (definition.pattern === "horizontal") {
      const line = createSvgElement("line");
      line.setAttribute("x1", "0");
      line.setAttribute("x2", String(theme.pattern.size));
      line.setAttribute("y1", String(theme.pattern.size / 2));
      line.setAttribute("y2", String(theme.pattern.size / 2));
      line.setAttribute("stroke", theme.colors.ink);
      line.setAttribute("stroke-width", String(theme.pattern.strokeWidth));
      pattern.appendChild(line);
    } else if (definition.pattern === "cross") {
      [
        { x1: "0", y1: String(theme.pattern.size / 2), x2: String(theme.pattern.size), y2: String(theme.pattern.size / 2) },
        { x1: String(theme.pattern.size / 2), y1: "0", x2: String(theme.pattern.size / 2), y2: String(theme.pattern.size) },
      ].forEach((config) => {
        const line = createSvgElement("line");
        Object.entries(config).forEach(([key, value]) => line.setAttribute(key, value));
        line.setAttribute("stroke", theme.colors.ink);
        line.setAttribute("stroke-width", String(theme.pattern.strokeWidth));
        pattern.appendChild(line);
      });
    }

    defs.appendChild(pattern);
  });
}

function getExamGraphFill(index) {
  const definitions = getActiveExamGraphPatternDefinitions();
  const definition = definitions[index % definitions.length];
  return definition.pattern ? `url(#exam-pattern-${definition.key})` : definition.fill;
}

function appendExamGraphTitle() {
  // Preview cards already provide context outside the SVG. Keep the exported chart clean and reusable.
}

function appendExamGraphLegend(svg, items, centerX, y, maxLegendWidth = examGraphTheme.layout.width) {
  const theme = getActiveExamGraphVisualTheme();
  const measurement = measureExamGraphSwatchLegend(items, maxLegendWidth);
  const halfLegendWidth = measurement.width / 2;
  const minBoxX = examGraphTheme.layout.legendSidePadding;
  const maxBoxX = maxLegendWidth - examGraphTheme.layout.legendSidePadding - measurement.width;
  const boxX = snapExamGraphCoordinate(
    clamp(centerX - halfLegendWidth, minBoxX, Math.max(minBoxX, maxBoxX)),
  );
  const boxY = snapExamGraphCoordinate(y - measurement.height / 2);

  let itemIndex = 0;
  measurement.rows.forEach((legendRow, rowIndex) => {
    const innerWidth = Math.max(0, measurement.width - examGraphTheme.legend.paddingX * 2);
    const rowWidth = Math.min(innerWidth, measurement.rowWidths[rowIndex]);
    let cursorX = snapExamGraphCoordinate(boxX + examGraphTheme.legend.paddingX + (innerWidth - rowWidth) / 2);
    const rowY = snapExamGraphCoordinate(boxY + examGraphTheme.legend.paddingY + rowIndex * examGraphTheme.legend.rowHeight + examGraphTheme.legend.rowHeight / 2);
    legendRow.forEach((item) => {
      const itemWidth = examGraphTheme.legend.swatchGap + String(item.label).length * examGraphTheme.legend.charWidth;
      const swatch = createSvgElement("rect");
      setExamGraphBox(swatch, {
        x: cursorX,
        y: rowY - examGraphTheme.legend.swatch / 2,
        width: examGraphTheme.legend.swatch,
        height: examGraphTheme.legend.swatch,
      });
      swatch.setAttribute("fill", item.fill ?? getExamGraphFill(itemIndex));
      swatch.setAttribute("stroke", theme.colors.dataStroke ?? theme.colors.ink);
      swatch.setAttribute("stroke-width", theme.strokes.dataOutline);
      applyExamGraphStrokeStyle(swatch);
      svg.appendChild(swatch);

      const label = createSvgElement("text");
      setExamGraphCoordinate(label, "x", cursorX + examGraphTheme.legend.swatchGap);
      setExamGraphCoordinate(label, "y", rowY + 2.8);
      applyExamGraphTextStyle(label, { fontSize: examGraphTheme.type.legend, fontWeight: 600 });
      label.textContent = item.label;
      svg.appendChild(label);

      cursorX = snapExamGraphCoordinate(cursorX + itemWidth + examGraphTheme.legend.itemGap);
      itemIndex += 1;
    });
  });
  return measurement;
}

function applyExamGraphTextStyle(node, { fontSize = 12, fontWeight = 700, fill = getActiveExamGraphVisualTheme().colors.ink } = {}) {
  const theme = getActiveExamGraphVisualTheme();
  node.setAttribute("fill", fill);
  node.setAttribute("font-size", `${scaleExamGraphFontSize(fontSize)}pt`);
  node.setAttribute("font-weight", String(fontWeight));
  node.setAttribute("font-family", theme.font.family);
  node.setAttribute("font-stretch", `${theme.font.stretchPercent}%`);
  node.setAttribute("letter-spacing", "0");
  node.setAttribute("text-rendering", "geometricPrecision");
}

function renderAnnotations() {
  renderMarkerList();
  renderInsetList();
}

function renderMarkerList() {
  elements.markerList.innerHTML = "";

  if (!state.markers.length) {
    elements.markerList.appendChild(createEmptyState("3번 마커 모드에서 지도 위를 클릭하거나 드래그하면 조절 카드가 바로 생깁니다."));
    return;
  }

  state.markers.forEach((marker) => {
    const item = document.createElement("li");
    item.className = "annotation-item";

    const head = document.createElement("div");
    head.className = "annotation-head";
    const title = document.createElement("strong");
    title.textContent = markerStyleLabel(marker.style);
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

    const styleSelect = buildMarkerStyleSelect(marker.style);
    styleSelect.addEventListener("change", () => {
      beginHistoryStep("마커 스타일 변경");
      marker.style = styleSelect.value;
      applyMarkerDefaultsIfNeeded(marker);
      renderAnnotations();
      renderMap();
    });

    const sizeRange = getMarkerSizeRange(marker.style);
    const sizeInput = buildNumberInput(marker.size, sizeRange.min, sizeRange.max, 1, "마커 크기 변경", (value) => {
      marker.size = clampMarkerSize(marker, value);
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

    const fieldGrid = document.createElement("div");
    fieldGrid.className = "annotation-grid";
    fieldGrid.append(
      createField("스타일", styleSelect),
      createField("크기", sizeInput),
      createField("세로비", aspectInput),
      createField("회전", rotationInput),
    );

    const meta = document.createElement("div");
    meta.className = "annotation-meta";
    meta.textContent = `${formatCoordinate(marker.lat, "lat")} · ${formatCoordinate(marker.lon, "lon")} · 캔버스 핸들로 이동/크기 조절`;

    item.append(head, fieldGrid, meta);
    elements.markerList.appendChild(item);
  });
}

function renderInsetList() {
  elements.insetList.innerHTML = "";

  if (!state.insets.length) {
    elements.insetList.appendChild(createEmptyState("4번 인셋 모드에서 확대할 영역을 드래그하면 조절 카드가 바로 생깁니다."));
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
      `캔버스 핸들로 위치/크기 조절`;

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

  const renderModel = buildWorldMapSvg();
  currentSvgNode = renderModel.svgNode;
  currentRenderContext = {
    projection: renderModel.projection,
    path: renderModel.path,
    baseScale: renderModel.baseScale,
    baseTranslate: renderModel.baseTranslate,
    padding: renderModel.padding,
  };

  resetPreviewInteractionState();
  mountPreviewCanvas();
  updatePreviewHint();
  updateSelectionSummary();
  updateExportMeta();
  updateWorkspaceStats();
}

function buildWorldMapSvg(options = {}) {
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
  const canvasClipId = options.exportMode ? "map-canvas-export-clip" : "map-canvas-clip";

  if (state.projectionMode === "rectangular") {
    const clipPath = defs
      .append("clipPath")
      .attr("id", canvasClipId)
      .attr("clipPathUnits", "userSpaceOnUse");
    if (options.exportMode) {
      clipPath.attr("data-export-clip", "keep");
    }
    clipPath
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
    countriesGroup.attr("clip-path", `url(#${canvasClipId})`);
  }

  if (shouldRenderProjectionOutline()) {
    root
      .append("path")
      .datum({ type: "Sphere" })
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("opacity", 0.8)
      .attr("vector-effect", "non-scaling-stroke");
  }

  renderAtlasLayer(countriesGroup, projection, atlasDataset, selectedColorById, borderGeometry, {
    exportMode: Boolean(options.exportMode),
    clipRect: {
      x: 0,
      y: 0,
      width: state.width,
      height: state.height,
    },
    clipPadding: options.exportMode ? 0 : MAP_RENDER_CLIP_PADDING,
    copyOffsets: options.exportMode ? getVisibleProjectionCopyOffsets(projection, 0) : null,
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
  renderInsetLayer(root, defs, projection, selectedColorById, options);

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
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("vector-effect", "non-scaling-stroke");
  }

  const svgNode = svg.node();
  ensureSvgFontStyle(svgNode);
  if (options.exportMode) {
    finalizeVectorExportNode(svgNode);
  }
  return {
    svgNode,
    projection,
    path,
    baseScale: projectionMeta.baseScale,
    baseTranslate: projectionMeta.baseTranslate,
    padding,
  };
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
  renderKoreaRouteLayer(root, path, projection);

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
  ensureSvgFontStyle(currentSvgNode);
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

function renderKoreaRouteLayer(root, path, projection) {
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

  renderKoreaRouteStationLayer(routeLayer, projection, activeRoutes);
  renderKoreaRouteLegend(root, activeRoutes);
}

function renderKoreaRouteStationLayer(routeLayer, projection, activeRoutes) {
  const stations = getActiveKoreaRouteStations(activeRoutes, projection);
  if (!stations.length) {
    return;
  }

  const stationLayer = routeLayer.append("g").attr("class", "korea-route-station-layer");

  stationLayer
    .selectAll(".korea-route-station-halo")
    .data(stations)
    .join("circle")
    .attr("class", "korea-route-station-halo")
    .attr("cx", (station) => station.point[0])
    .attr("cy", (station) => station.point[1])
    .attr("r", KOREA_HSR_STATION_HALO_RADIUS)
    .attr("fill", "#ffffff")
    .attr("stroke", state.borderColor)
    .attr("stroke-width", "0.25pt")
    .attr("vector-effect", "non-scaling-stroke");

  const stationMarkers = stationLayer
    .selectAll(".korea-route-station")
    .data(stations)
    .join("circle")
    .attr("class", "korea-route-station")
    .attr("cx", (station) => station.point[0])
    .attr("cy", (station) => station.point[1])
    .attr("r", KOREA_HSR_STATION_RADIUS)
    .attr("fill", state.borderColor)
    .attr("stroke", "none")
    .attr("data-station-id", (station) => station.id)
    .attr("data-route-id", (station) => station.routeId);

  stationMarkers.append("title").text((station) => `${station.name} · ${station.routeName}`);
}

function getActiveKoreaRouteStations(activeRoutes, projection) {
  if (typeof projection !== "function") {
    return [];
  }

  const seen = new Set();
  const stations = [];

  activeRoutes.forEach((route) => {
    (route.stations ?? []).forEach((station) => {
      const coordinates = normalizeKoreaRouteCoordinate(station.coordinates);
      if (!coordinates) {
        return;
      }

      const id = String(station.id ?? `${station.name ?? "station"}-${coordinates.join(",")}`);
      if (seen.has(id)) {
        return;
      }

      const point = projection(coordinates);
      if (!point || !point.every(Number.isFinite)) {
        return;
      }

      seen.add(id);
      stations.push({
        ...station,
        id,
        routeId: route.id,
        routeName: route.name,
        coordinates,
        point,
      });
    });
  });

  return stations;
}

function normalizeKoreaRouteCoordinate(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  return Number.isFinite(longitude) && Number.isFinite(latitude) ? [longitude, latitude] : null;
}

function renderKoreaRouteLegend(root, activeRoutes) {
  const legend = root.append("g").attr("class", "korea-route-legend");
  const legendX = 16;
  const legendY = 16;
  const showStationLegend = activeRoutes.some((route) => route.stations?.length);
  const rowCount = activeRoutes.length + (showStationLegend ? 1 : 0);
  const rowHeight = rowCount >= 4 ? 10.5 : 11.5;
  const fontSize = rowCount >= 4 ? 4.8 : 5.2;
  const swatchLength = 14;
  const textOffset = 22;
  const legendNames = [...activeRoutes.map((route) => route.name), ...(showStationLegend ? ["고속철도 정차역"] : [])];
  const panelWidth = clamp(40 + Math.max(...legendNames.map((name) => name.length)) * 11, 104, 132);
  const panelHeight = 16 + rowCount * rowHeight;

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

  if (showStationLegend) {
    const y = legendY + activeRoutes.length * rowHeight;
    legend
      .append("circle")
      .attr("cx", legendX + swatchLength / 2)
      .attr("cy", y)
      .attr("r", KOREA_HSR_STATION_RADIUS)
      .attr("fill", state.borderColor)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", "0.5pt")
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
      .text("고속철도 정차역");
  }
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
  const clipRect = normalizeClipRect(options.clipRect, options.clipPadding ?? 0);
  const limitToVisibleRect = state.projectionMode === "rectangular" && Boolean(clipRect);
  const copyOffsets =
    options.wrap === false
      ? [0]
      : Array.isArray(options.copyOffsets) && options.copyOffsets.length
        ? options.copyOffsets
        : limitToVisibleRect
          ? getVisibleProjectionCopyOffsets(projection, options.clipPadding ?? 0)
          : getProjectionCopyOffsets(projection);
  const lakeDataset = getLakeDatasetForAtlasDataset(atlasDataset, state.viewZoom);
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

  copyOffsets.forEach((offset) => {
    const shiftedClipRect = shiftClipRect(clipRect, -offset, 0);
    const path = createRenderPath(projection, shiftedClipRect);
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

      appendLineGeometryPaths(copyGroup, getLineGeometryFragments(lakeDataset.geometry), path, {
        className: "map-lake-lines",
        stroke: state.borderColor,
        strokeWidth: OUTLINE_STROKE_WIDTH,
        strokeLinejoin: "round",
      });
    }

    if (borderGeometry) {
      appendLineGeometryPaths(
        copyGroup,
        options.exportMode ? getLineGeometryFragments(borderGeometry) : [borderGeometry],
        path,
        {
          className: "map-border-lines",
          stroke: state.borderColor,
          strokeWidth: OUTLINE_STROKE_WIDTH,
          strokeDasharray: getBorderStrokeDasharray(),
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
      );
    }

    const coastlineSourceGeometries = getCoastlineRenderSourceGeometries(atlasDataset);
    const coastlineRenderGeometries = limitToVisibleRect
      ? getProjectedVisibleLineRenderGeometries(coastlineSourceGeometries, path, shiftedClipRect)
      : coastlineSourceGeometries;

    appendLineGeometryPaths(copyGroup, coastlineRenderGeometries, path, {
      className: "map-coast-lines",
      stroke: state.borderColor,
      strokeWidth: OUTLINE_STROKE_WIDTH,
      strokeLinejoin: "round",
    });
  });
}

function appendLineGeometryPaths(group, geometries, path, options = {}) {
  const validGeometries = (geometries || []).filter(Boolean);
  if (!validGeometries.length) {
    return;
  }

  group
    .selectAll(`.${options.className || "map-line"}`)
    .data(validGeometries)
    .join("path")
    .attr("class", options.className || "map-line")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", options.stroke ?? state.borderColor)
    .attr("stroke-width", options.strokeWidth ?? OUTLINE_STROKE_WIDTH)
    .attr("stroke-dasharray", options.strokeDasharray ?? null)
    .attr("stroke-linecap", options.strokeLinecap ?? null)
    .attr("stroke-linejoin", options.strokeLinejoin ?? null)
    .attr("vector-effect", "non-scaling-stroke");
}

function getCoastlineRenderSourceGeometries(atlasDataset) {
  if (!atlasDataset) {
    return [];
  }

  if (atlasDataset.coastlineFragments?.length) {
    return atlasDataset.coastlineFragments;
  }

  return getLineGeometryFragments(atlasDataset.coastlineMesh ?? atlasDataset.landFeature);
}

function getProjectedVisibleLineRenderGeometries(geometries, path, clipRect) {
  if (!clipRect) {
    return geometries;
  }

  const visibleGeometries = (geometries || []).filter((geometry) => {
    const bounds = getGeometryScreenBounds(path, geometry);
    return bounds ? rectsIntersect(bounds, clipRect) : true;
  });

  return visibleGeometries.length ? visibleGeometries : geometries;
}

function getLineGeometryFragments(geometry) {
  if (!geometry) {
    return [];
  }

  if (geometry.type === "Feature") {
    return getLineGeometryFragments(geometry.geometry);
  }

  if (geometry.type === "LineString") {
    return [geometry];
  }

  if (geometry.type === "MultiLineString") {
    return geometry.coordinates.map((coordinates) => ({ type: "LineString", coordinates }));
  }

  if (geometry.type === "Polygon") {
    return geometry.coordinates.map((coordinates) => ({ type: "LineString", coordinates }));
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((polygon) =>
      polygon.map((coordinates) => ({ type: "LineString", coordinates })),
    );
  }

  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap((entry) => getLineGeometryFragments(entry));
  }

  return [];
}

function splitLineGeometryFragments(geometries, maxPoints = COASTLINE_FRAGMENT_MAX_POINTS) {
  const chunkSize = Math.max(2, Math.floor(Number(maxPoints) || COASTLINE_FRAGMENT_MAX_POINTS));

  return (geometries || []).flatMap((geometry) => {
    const coordinates = geometry?.coordinates;
    if (geometry?.type !== "LineString" || !Array.isArray(coordinates) || coordinates.length <= chunkSize) {
      return geometry ? [geometry] : [];
    }

    const chunks = [];
    const step = chunkSize - 1;
    for (let start = 0; start < coordinates.length - 1; start += step) {
      const chunkCoordinates = coordinates.slice(start, Math.min(start + chunkSize, coordinates.length));
      if (chunkCoordinates.length >= 2) {
        chunks.push({ type: "LineString", coordinates: chunkCoordinates });
      }
    }

    return chunks;
  });
}

function getGeometryScreenBounds(path, geometry) {
  if (!geometry) {
    return null;
  }

  try {
    const [[x0, y0], [x1, y1]] = path.bounds(geometry);
    if (![x0, y0, x1, y1].every(Number.isFinite)) {
      return null;
    }

    return {
      x: x0,
      y: y0,
      width: Math.max(0, x1 - x0),
      height: Math.max(0, y1 - y0),
    };
  } catch (_error) {
    return null;
  }
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

function createRenderPath(projection, clipRect) {
  if (!clipRect || typeof projection?.clipExtent !== "function") {
    return d3.geoPath(projection);
  }

  const clipExtent = [
    [clipRect.x, clipRect.y],
    [clipRect.x + clipRect.width, clipRect.y + clipRect.height],
  ];

  if (typeof projection.copy === "function") {
    return d3.geoPath(projection.copy().clipExtent(clipExtent));
  }

  return d3.geoPath({
    stream(stream) {
      const previousClipExtent = projection.clipExtent();
      projection.clipExtent(clipExtent);
      const projectedStream = projection.stream(stream);
      projection.clipExtent(previousClipExtent);
      return projectedStream;
    },
  });
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

function getVisibleProjectionCopyOffsets(projection, padding = 0) {
  if (state.projectionMode !== "rectangular") {
    return [0];
  }

  const wrapWidth = getProjectionWrapWidth(projection);
  const translateX = projection.translate?.()[0];
  if (!Number.isFinite(wrapWidth) || wrapWidth < 1 || !Number.isFinite(translateX)) {
    return [0];
  }

  const viewportLeft = -Math.max(0, Number(padding) || 0);
  const viewportRight = state.width + Math.max(0, Number(padding) || 0);
  const halfWrap = wrapWidth / 2;
  const baseLeft = translateX - halfWrap;
  const baseRight = translateX + halfWrap;
  const minStep = Math.ceil((viewportLeft - baseRight) / wrapWidth);
  const maxStep = Math.floor((viewportRight - baseLeft) / wrapWidth);

  if (!Number.isFinite(minStep) || !Number.isFinite(maxStep) || minStep > maxStep) {
    return [0];
  }

  return d3.range(minStep, maxStep + 1).map((step) => wrapWidth * step);
}

function finalizeVectorExportNode(svgNode) {
  if (!(svgNode instanceof SVGSVGElement) || !document.body) {
    return;
  }

  const mount = document.createElement("div");
  mount.style.position = "fixed";
  mount.style.left = "-100000px";
  mount.style.top = "-100000px";
  mount.style.visibility = "hidden";
  mount.style.pointerEvents = "none";
  mount.appendChild(svgNode);
  document.body.appendChild(mount);

  try {
    pruneOffscreenExportElements(svgNode);
    stripExportClipArtifacts(svgNode);
  } finally {
    mount.remove();
  }
}

function stripExportClipArtifacts(svgNode) {
  svgNode.querySelectorAll("[clip-path]").forEach((node) => {
    node.removeAttribute("clip-path");
  });

  svgNode.querySelectorAll("clipPath").forEach((node) => {
    node.remove();
  });
}

function extractClipPathIdentifier(value) {
  const match = String(value ?? "").match(/url\(\s*["']?#([^"')\s]+)["']?\s*\)/i);
  return match?.[1] ?? "";
}

function pruneOffscreenExportElements(svgNode) {
  const viewport = { x: 0, y: 0, width: state.width, height: state.height };
  const exportClipRects = collectExportClipRects(svgNode);
  const removableSelectors = [
    ".map-copy",
    ".map-country-fill",
    ".map-land",
    ".map-country",
    ".map-lakes",
    ".map-lake-lines",
    ".map-border-lines",
    ".map-coast-lines",
  ];

  svgNode.querySelectorAll(removableSelectors.join(",")).forEach((node) => {
    if (!(node instanceof SVGGraphicsElement)) {
      return;
    }

    const bounds = getTransformedSvgBounds(node);
    const clipRect = getNearestExportClipRect(node, exportClipRects);
    const visibleRect = clipRect ?? viewport;

    if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) {
      return;
    }

    if (bounds.width <= 0 || bounds.height <= 0) {
      node.remove();
      return;
    }

    if (!rectsIntersect(bounds, visibleRect)) {
      node.remove();
    }
  });
}

function collectExportClipRects(svgNode) {
  return new Map(
    [...svgNode.querySelectorAll('clipPath[data-export-clip="keep"]')]
      .map((clipPath) => {
        const rect = clipPath.querySelector("rect");
        if (!clipPath.id || !rect) {
          return null;
        }

        const clipRect = {
          x: Number(rect.getAttribute("x")) || 0,
          y: Number(rect.getAttribute("y")) || 0,
          width: Number(rect.getAttribute("width")) || 0,
          height: Number(rect.getAttribute("height")) || 0,
        };

        if (clipRect.width <= 0 || clipRect.height <= 0) {
          return null;
        }

        return [clipPath.id, clipRect];
      })
      .filter(Boolean),
  );
}

function getNearestExportClipRect(node, exportClipRects) {
  const clippedAncestor = node.closest("[clip-path]");
  if (!clippedAncestor) {
    return null;
  }

  const clipId = extractClipPathIdentifier(clippedAncestor.getAttribute("clip-path"));
  return clipId ? exportClipRects.get(clipId) ?? null : null;
}

function getTransformedSvgBounds(node) {
  try {
    const bounds = node.getBBox();
    const matrix = node.getCTM();
    if (!matrix) {
      return bounds;
    }

    const points = [
      [bounds.x, bounds.y],
      [bounds.x + bounds.width, bounds.y],
      [bounds.x + bounds.width, bounds.y + bounds.height],
      [bounds.x, bounds.y + bounds.height],
    ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  } catch (_error) {
    return null;
  }
}

function rectsIntersect(a, b) {
  return (
    a.x + a.width >= b.x &&
    b.x + b.width >= a.x &&
    a.y + a.height >= b.y &&
    b.y + b.height >= a.y
  );
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
        .attr("stroke-width", OUTLINE_STROKE_WIDTH)
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
    .attr("stroke-width", OUTLINE_STROKE_WIDTH)
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

    drawMarkerShape(group.append("g").attr("class", `marker marker--${marker.style}`), marker, point);
  });
}

function drawMarkerShape(group, marker, point) {
  const strokeWidth = marker.style === "filledDot" ? 0 : OUTLINE_STROKE_WIDTH;
  const scale = getMarkerRenderScale(marker);

  if (marker.style === "ring") {
    group
      .append("circle")
      .attr("cx", point.x)
      .attr("cy", point.y)
      .attr("r", Math.max(7, marker.size * scale))
      .attr("fill", "none")
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
      .attr("rx", Math.max(9, marker.size * scale))
      .attr("ry", Math.max(7, marker.size * marker.aspect * scale))
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
      .attr("r", Math.max(4.5, marker.size * 0.62 * scale))
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("vector-effect", "non-scaling-stroke");
    return;
  }

  group
    .append("circle")
    .attr("cx", point.x)
    .attr("cy", point.y)
    .attr("r", clampMarkerSize(marker, marker.size))
    .attr("fill", state.borderColor)
    .attr("stroke", "none");
}

function getMarkerRenderScale(marker) {
  if (marker.style === "filledDot") {
    return 1;
  }

  const anchorZoom = Number(marker.viewZoom);
  if (!Number.isFinite(anchorZoom) || anchorZoom <= 0) {
    marker.viewZoom = state.viewZoom;
    return 1;
  }

  return clamp(state.viewZoom / anchorZoom, 0.18, 8);
}

function renderInsetLayer(root, defs, mainProjection, selectedColorById, options = {}) {
  if (!state.insets.length) {
    return;
  }

  const layer = root.append("g").attr("class", "insets-layer");

  state.insets.forEach((inset, index) => {
    renderSingleInset(layer, defs, mainProjection, inset, selectedColorById, index, options);
  });
}

function renderSingleInset(layer, defs, mainProjection, inset, selectedColorById, index, options = {}) {
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

  const clipPath = defs
    .append("clipPath")
    .attr("id", clipId)
    .attr("clipPathUnits", "userSpaceOnUse");
  if (options.exportMode) {
    clipPath.attr("data-export-clip", "keep");
  }
  clipPath
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
  renderInsetMapContent(insetGroup, mainProjection, frame, sourceFrame, selectedColorById, inset, options);

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

function renderInsetMapContent(insetGroup, mainProjection, frame, sourceFrame, selectedColorById, inset, options = {}) {
  if (!sourceFrame) {
    const insetProjection = buildInsetProjection(frame, inset);
    const insetAtlasDataset = getAtlasDataset(Math.max(state.viewZoom * 2.4, 10), true);
    const selectedIds = new Set(state.selected.map((country) => country.id));
    const insetBorderGeometry = buildBorderGeometry(insetAtlasDataset, selectedIds);
    renderAtlasLayer(insetGroup, insetProjection, insetAtlasDataset, selectedColorById, insetBorderGeometry, {
      exportMode: Boolean(options.exportMode),
      wrap: false,
      clipRect: frame,
      clipPadding: options.exportMode ? 0 : INSET_RENDER_CLIP_PADDING,
    });
    return;
  }

  const scale = Math.min(frame.width / sourceFrame.width, frame.height / sourceFrame.height);
  const offsetX = frame.x + (frame.width - sourceFrame.width * scale) / 2;
  const offsetY = frame.y + (frame.height - sourceFrame.height * scale) / 2;
  const transformedGroup = insetGroup
    .append("g")
    .attr("class", "inset-map-transform")
    .attr(
      "transform",
      `translate(${offsetX - sourceFrame.x * scale} ${offsetY - sourceFrame.y * scale}) scale(${scale})`,
    );
  const insetAtlasDataset = getAtlasDataset(Math.max(state.viewZoom * scale * 2.2, 6), true);
  const selectedIds = new Set(state.selected.map((country) => country.id));
  const insetBorderGeometry = buildBorderGeometry(insetAtlasDataset, selectedIds);
  renderAtlasLayer(transformedGroup, mainProjection, insetAtlasDataset, selectedColorById, insetBorderGeometry, {
    exportMode: Boolean(options.exportMode),
    wrap: false,
    clipRect: sourceFrame,
    clipPadding: options.exportMode ? 0 : INSET_RENDER_CLIP_PADDING,
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
      ` · 윤곽선 ${OUTLINE_STROKE_WIDTH}`;
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
    `${formatPointSize(state.mapFontSizePt)} · ${scaleText} · ${borderText} · ${detailModeText} · ${detailText} · 윤곽선 ${OUTLINE_STROKE_WIDTH}`;
}

async function exportCurrentSvg() {
  try {
    const exportNode = buildExportSvgNode();
    const serializer = new XMLSerializer();
    const serialized = serializer.serializeToString(exportNode);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`], {
      type: "image/svg+xml;charset=utf-8",
    });
    downloadBlob(blob, buildDownloadName());
    setStatus("벡터 SVG 파일을 내보냈습니다.");
  } catch (error) {
    console.error(error);
    setStatus("SVG 파일을 내보내지 못했습니다.", true);
  }
}

async function exportCurrentPng() {
  try {
    const rasterScale = PNG_EXPORT_DPI / CSS_PIXEL_DPI;
    const rawExportNode = prepareExportSourceSvgNode({ rasterScale });
    const pngBlob = await rasterizeSvgNodeToPngBlob(rawExportNode, {
      scale: rasterScale,
      dpi: PNG_EXPORT_DPI,
    });
    downloadBlob(pngBlob, buildPngDownloadName());
    setStatus(`500 DPI PNG 파일을 내보냈습니다.`);
  } catch (error) {
    console.error(error);
    setStatus("PNG 파일을 내보내지 못했습니다.", true);
  }
}

function buildExportSvgNode() {
  if (!previewTransformIsIdentity()) {
    commitPreviewInteraction();
  }

  if (state.mapVersion === "world") {
    return buildWorldMapSvg({ exportMode: true }).svgNode;
  }

  if (!currentSvgNode) {
    throw new Error("내보낼 지도를 아직 그리지 못했습니다.");
  }

  const exportNode = currentSvgNode.cloneNode(true);
  ensureSvgFontStyle(exportNode);
  return exportNode;
}

function prepareExportSourceSvgNode(options = {}) {
  if (!previewTransformIsIdentity()) {
    commitPreviewInteraction();
  }

  if (!currentSvgNode) {
    throw new Error("내보낼 지도를 아직 그리지 못했습니다.");
  }

  const exportNode = currentSvgNode.cloneNode(true);
  ensureSvgFontStyle(exportNode);
  normalizeExportStrokeEffects(exportNode, options.rasterScale);
  return exportNode;
}

function normalizeExportStrokeEffects(svgNode, rasterScale = 1) {
  if (!svgNode) {
    return;
  }

  const safeRasterScale = Math.max(0.1, Number(rasterScale) || 1);
  svgNode.querySelectorAll('[vector-effect="non-scaling-stroke"]').forEach((node) => {
    const localScale = extractAncestorSvgScale(node);
    bakeNonScalingStrokeForExport(node, safeRasterScale * localScale);
  });
}

function extractAncestorSvgScale(node) {
  let scale = 1;
  let current = node instanceof Element ? node : node?.parentElement;

  while (current && current instanceof Element) {
    const transformText = current.getAttribute("transform");
    if (transformText) {
      scale *= extractSvgScale(transformText);
    }
    current = current.parentElement;
  }

  return scale > 0 ? scale : 1;
}

function extractSvgScale(transformText) {
  if (!transformText) {
    return 1;
  }

  const match = String(transformText).match(/scale\(\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*(?:[, ]\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*)?\)/i);
  if (!match) {
    return 1;
  }

  const scaleX = Number(match[1]);
  const scaleY = match[2] != null ? Number(match[2]) : scaleX;
  if (!(scaleX > 0) || !(scaleY > 0)) {
    return 1;
  }

  return (scaleX + scaleY) / 2;
}

function bakeNonScalingStrokeForExport(node, scale) {
  node.removeAttribute("vector-effect");

  const strokeWidth = node.getAttribute("stroke-width");
  if (strokeWidth) {
    node.setAttribute("stroke-width", scaleSvgMeasureList(strokeWidth, 1 / scale));
  }

  const dasharray = node.getAttribute("stroke-dasharray");
  if (dasharray && dasharray !== "none") {
    node.setAttribute("stroke-dasharray", scaleSvgMeasureList(dasharray, 1 / scale));
  }
}

function scaleSvgMeasureList(value, factor) {
  return String(value)
    .trim()
    .split(/[\s,]+/)
    .map((token) => scaleSvgMeasureToken(token, factor))
    .join(" ");
}

function scaleSvgMeasureToken(token, factor) {
  const match = String(token).match(/^([+-]?\d*\.?\d+(?:e[+-]?\d+)?)([a-z%]*)$/i);
  if (!match) {
    return token;
  }

  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) {
    return token;
  }

  return `${formatSvgNumeric(numeric * factor)}${match[2] ?? ""}`;
}

function formatSvgNumeric(value) {
  const rounded = Number(value.toFixed(4));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");
}

async function rasterizeSvgNode(svgNode, options = {}) {
  const scale = Math.max(0.1, Number(options.scale) || 1);
  const width = Math.max(1, Math.round(state.width * scale));
  const height = Math.max(1, Math.round(state.height * scale));
  const serializer = new XMLSerializer();
  const serialized = serializer.serializeToString(svgNode);
  const svgBlob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImageElement(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("PNG용 캔버스를 만들지 못했습니다.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, "image/png");
    if (options.dpi) {
      blob = await applyPngDpiMetadata(blob, options.dpi);
    }

    return {
      blob,
      dataUrl: await readBlobAsDataUrl(blob),
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

async function rasterizeSvgNodeToPngBlob(svgNode, options = {}) {
  const { blob } = await rasterizeSvgNode(svgNode, options);
  return blob;
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "sync";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("내보내기용 SVG 이미지를 불러오지 못했습니다."));
    image.src = src;
  });
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("이미지 데이터를 만들지 못했습니다."));
        return;
      }
      resolve(blob);
    }, type);
  });
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("내보내기 데이터를 읽지 못했습니다."));
    reader.readAsDataURL(blob);
  });
}

async function applyPngDpiMetadata(blob, dpi) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const signature = bytes.slice(0, 8);
  const chunks = [signature];
  const physChunk = buildPngPhysChunk(dpi);
  let offset = 8;
  let inserted = false;

  while (offset + 8 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const end = offset + length + 12;
    if (end > bytes.length) {
      break;
    }

    const type = decodePngChunkType(bytes, offset + 4);
    if (type === "pHYs") {
      if (!inserted) {
        chunks.push(physChunk);
        inserted = true;
      }
    } else {
      chunks.push(bytes.slice(offset, end));
      if (type === "IHDR" && !inserted) {
        chunks.push(physChunk);
        inserted = true;
      }
    }

    offset = end;
  }

  return new Blob(chunks, { type: "image/png" });
}

function buildPngPhysChunk(dpi) {
  const pixelsPerMeter = Math.max(1, Math.round(Number(dpi) / 0.0254));
  const data = new Uint8Array(9);
  const view = new DataView(data.buffer);
  view.setUint32(0, pixelsPerMeter);
  view.setUint32(4, pixelsPerMeter);
  data[8] = 1;

  const type = new TextEncoder().encode("pHYs");
  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  const chunkView = new DataView(chunk.buffer);
  chunkView.setUint32(0, data.length);
  chunk.set(type, 4);
  chunk.set(data, 8);
  chunkView.setUint32(8 + data.length, getCrc32(concatenateUint8Arrays(type, data)));
  return chunk;
}

function readUint32(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
}

function decodePngChunkType(bytes, offset) {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function concatenateUint8Arrays(...arrays) {
  const totalLength = arrays.reduce((sum, array) => sum + array.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  arrays.forEach((array) => {
    merged.set(array, offset);
    offset += array.length;
  });
  return merged;
}

let cachedCrc32Table = null;

function getCrc32(bytes) {
  const table = getCrc32Table();
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function getCrc32Table() {
  if (cachedCrc32Table) {
    return cachedCrc32Table;
  }

  cachedCrc32Table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    cachedCrc32Table[index] = value >>> 0;
  }
  return cachedCrc32Table;
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

function buildSvgFontStyle({ includeExamGraph = true } = {}) {
  const mapFontStretch = Math.round(MAP_FONT_STRETCH_X * 100);
  const rules = [
    `.map-output-text, .map-output-text text, .map-output-text tspan { font-family: ${MAP_FONT_FAMILY}; font-stretch: ${mapFontStretch}%; }`,
  ];

  return rules.join("\n");
}

function getMapFontSource() {
  return embeddedMapFontDataUrl;
}

function buildDocumentMapFontStyle() {
  const mapFontStretch = Math.round(MAP_FONT_STRETCH_X * 100);
  return `.map-output-text, .map-output-text text, .map-output-text tspan { font-family: ${MAP_FONT_FAMILY}; font-stretch: ${mapFontStretch}%; }`;
}

function ensureDocumentMapFontStyle() {
  if (!document.head) {
    return;
  }
  let styleElement = document.getElementById(MAP_FONT_STYLE_ELEMENT_ID);
  if (!(styleElement instanceof HTMLStyleElement)) {
    styleElement = document.createElement("style");
    styleElement.id = MAP_FONT_STYLE_ELEMENT_ID;
    styleElement.type = "text/css";
    document.head.appendChild(styleElement);
  }
  styleElement.textContent = buildDocumentMapFontStyle();
}

function ensureSvgFontStyle(svgNode, options = {}) {
  if (!svgNode) {
    return;
  }
  const config = {
    includeExamGraph: true,
    ...options,
  };
  const defs = ensureDefsElement(svgNode);
  let styleElement = defs.querySelector(MAP_SVG_FONT_STYLE_SELECTOR);
  if (!styleElement) {
    styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleElement.setAttribute("data-map-font-style", "embedded");
    styleElement.setAttribute("type", "text/css");
    defs.insertBefore(styleElement, defs.firstChild);
  }
  styleElement.textContent = buildSvgFontStyle(config);
}

function rerenderFontDependentViews() {
  renderSelectionViews();
  renderMap();
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

function buildPngDownloadName() {
  return buildDownloadName().replace(/\.svg$/u, `-${PNG_EXPORT_DPI}dpi.png`);
}

function downloadBlob(blob, filename) {
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
  resizeHandle.title = "드래그해 캔버스 크기 조절";
  resizeHandle.setAttribute("aria-label", "캔버스 크기 조절");
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
  editor.title = "드래그해 인셋 위치 이동";

  if (inset.label.trim()) {
    const tag = document.createElement("span");
    tag.className = "annotation-editor__tag";
    tag.textContent = inset.label.trim();
    editor.appendChild(tag);
  }

  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "annotation-editor__handle";
  handle.setAttribute("aria-label", "인셋 크기 조절");
  handle.title = "인셋 크기 조절";
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
  editor.title = "드래그해 마커 위치 이동";

  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "annotation-editor__handle";
  handle.setAttribute("aria-label", "마커 크기 조절");
  handle.title = "마커 크기 조절";
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
  event.currentTarget.setPointerCapture?.(event.pointerId);
  editor.classList.add("is-dragging");
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
    editor.classList.remove("is-dragging");

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
  event.currentTarget.setPointerCapture?.(event.pointerId);
  editor.classList.add("is-dragging");
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
    editor.classList.remove("is-dragging");

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
  event.currentTarget.setPointerCapture?.(event.pointerId);
  editor.classList.add("is-dragging");
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
    editor.classList.remove("is-dragging");

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
  event.currentTarget.setPointerCapture?.(event.pointerId);
  editor.classList.add("is-dragging");
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
      const markerScale = getMarkerRenderScale(marker);
      const width = clamp((startSize * markerScale * 2 + deltaX * 2) / markerScale, 18, 320);
      const height = clamp((startSize * startAspect * markerScale * 2 + deltaY * 2) / markerScale, 14, 320);
      const previewMarker = {
        ...marker,
        size: width / 2,
        aspect: clamp(height / Math.max(width, 1), 0.2, 3),
      };
      positionEditorFrame(editor, buildMarkerEditorFrame(startPoint, previewMarker));
      return;
    }

    const markerScale = getMarkerRenderScale(marker);
    const nextSize = clampMarkerSize(marker, startSize + getUniformResizeDelta(deltaX, deltaY) / markerScale);
    positionEditorFrame(editor, buildMarkerEditorFrame(startPoint, { ...marker, size: nextSize }));
  };

  const stop = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    editor.classList.remove("is-dragging");

    const deltaX = (upEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaY = (upEvent.clientY - startY) / (currentPreviewScale || 1);
    beginHistoryStep("마커 크기 변경");
    if (marker.style === "dashedOval") {
      const markerScale = getMarkerRenderScale(marker);
      const width = clamp((startSize * markerScale * 2 + deltaX * 2) / markerScale, 18, 320);
      const height = clamp((startSize * startAspect * markerScale * 2 + deltaY * 2) / markerScale, 14, 320);
      marker.size = width / 2;
      marker.aspect = clamp(height / Math.max(width, 1), 0.2, 3);
    } else {
      const markerScale = getMarkerRenderScale(marker);
      marker.size = clampMarkerSize(marker, startSize + getUniformResizeDelta(deltaX, deltaY) / markerScale);
    }
    renderAnnotations();
    renderMap();
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function getUniformResizeDelta(deltaX, deltaY) {
  return (deltaX + deltaY) / 1.6;
}

function positionEditorFrame(editor, frame) {
  editor.style.left = `${frame.x * currentPreviewScale}px`;
  editor.style.top = `${frame.y * currentPreviewScale}px`;
  editor.style.width = `${frame.width * currentPreviewScale}px`;
  editor.style.height = `${frame.height * currentPreviewScale}px`;
}

function buildMarkerEditorFrame(point, marker) {
  const padding = marker.style === "filledDot" ? 10 : 12;
  const scale = getMarkerRenderScale(marker);
  const radiusX = marker.style === "dashedOval" ? Math.max(9, marker.size * scale) : getMarkerVisualRadius(marker);
  const radiusY =
    marker.style === "dashedOval" ? Math.max(7, marker.size * marker.aspect * scale) : getMarkerVisualRadius(marker);
  return {
    x: point.x - radiusX - padding,
    y: point.y - radiusY - padding,
    width: radiusX * 2 + padding * 2,
    height: radiusY * 2 + padding * 2,
  };
}

function getMarkerVisualRadius(marker) {
  if (marker.style === "ring") {
    return Math.max(7, marker.size * getMarkerRenderScale(marker));
  }
  if (marker.style === "point") {
    return Math.max(4.5, marker.size * 0.62 * getMarkerRenderScale(marker));
  }
  if (marker.style === "filledDot") {
    return clampMarkerSize(marker, marker.size);
  }
  return Math.max(9, marker.size * getMarkerRenderScale(marker));
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
  if (hasMapAnnotations()) {
    applyRelativeZoom(actualFactor, point, point, { recordHistory: false });
    renderMap();
    setStatus(`보기 ${Math.round(state.viewZoom * 100)}%`);
    return;
  }

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
  if (hasMapAnnotations()) {
    applyRelativeZoom(factor, point, point, { recordHistory: false });
    renderMap();
    return;
  }

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
  event.currentTarget.setPointerCapture?.(event.pointerId);

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
    const { width: nextWidth, height: nextHeight } = getArtboardResizeFrame(
      startWidth,
      startHeight,
      deltaWidth,
      deltaHeight,
    );

    shell.style.width = `${Math.round(nextWidth * currentPreviewScale)}px`;
    shell.style.height = `${Math.round(nextHeight * currentPreviewScale)}px`;
    setStatus(`${nextWidth} × ${nextHeight}px`);
  };

  const stopResize = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopResize);
    window.removeEventListener("pointercancel", stopResize);
    shell.classList.remove("is-resizing");

    const deltaWidth = (upEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaHeight = (upEvent.clientY - startY) / (currentPreviewScale || 1);
    const nextFrame = getArtboardResizeFrame(startWidth, startHeight, deltaWidth, deltaHeight);
    beginHistoryStep("캔버스 크기 변경");
    state.width = nextFrame.width;
    state.height = nextFrame.height;
    syncDimensionInputs();
    syncPresetButtons();
    renderMap();
    setStatus("미리보기 핸들로 캔버스 비율을 조절했습니다.");
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stopResize);
  window.addEventListener("pointercancel", stopResize);
}

function getArtboardResizeFrame(startWidth, startHeight, deltaWidth, deltaHeight) {
  const width = clampCanvasWidth(startWidth + deltaWidth, startWidth);
  const maxedWidth = startWidth >= MAX_CANVAS_WIDTH - 0.5 && deltaWidth > Math.abs(deltaHeight) * 1.15;
  const heightDelta = maxedWidth ? -deltaWidth : deltaHeight;
  return {
    width,
    height: clampCanvasHeight(startHeight + heightDelta, startHeight),
  };
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

      addInsetFromRect(buildDefaultInsetSourceRect(endPoint));
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

function buildDefaultInsetSourceRect(centerPoint) {
  const shorterSide = Math.max(1, Math.min(state.width, state.height));
  const width = clamp(Math.round(shorterSide * 0.28), 48, Math.min(180, state.width));
  const height = clamp(Math.round(shorterSide * 0.22), 42, Math.min(150, state.height));
  return {
    x: clamp(centerPoint.x - width / 2, 0, Math.max(0, state.width - width)),
    y: clamp(centerPoint.y - height / 2, 0, Math.max(0, state.height - height)),
    width,
    height,
  };
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
  } else if (state.markerDraftStyle === "filledDot") {
    marker.size = clampMarkerSize(marker, marker.size);
  } else {
    marker.size = clampMarkerSize(marker, Math.max(rect.width, rect.height) / 2);
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
    label: defaults.label,
    size: defaults.size,
    aspect: defaults.aspect,
    rotation: defaults.rotation,
    offsetX: defaults.offsetX,
    offsetY: defaults.offsetY,
    viewZoom: state.viewZoom,
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
    label: "",
    panelX: frame.x,
    panelY: frame.y,
    panelWidth: frame.width,
    panelHeight: frame.height,
    aspectRatio,
    zoomScale: 1,
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

function applyRelativeZoom(factor, sourcePoint, destinationPoint = sourcePoint, options = {}) {
  if (!currentRenderContext) {
    return;
  }

  if (options.recordHistory !== false) {
    beginHistoryStep("보기 변경");
  }
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

function hasMapAnnotations() {
  return state.markers.length > 0 || state.insets.length > 0;
}

function clampViewZoom(value) {
  return clamp(value, 0.35, 48);
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
    return { label: "", size: 24, aspect: 0.62, rotation: 0, offsetX: 0, offsetY: 0 };
  }

  if (style === "point") {
    return { label: "", size: 10, aspect: 1, rotation: 0, offsetX: 0, offsetY: 0 };
  }

  if (style === "filledDot") {
    return { label: "", size: 4, aspect: 1, rotation: 0, offsetX: 0, offsetY: 0 };
  }

  return { label: "", size: 16, aspect: 1, rotation: 0, offsetX: 0, offsetY: 0 };
}

function applyMarkerDefaultsIfNeeded(marker) {
  const defaults = markerDefaults(marker.style);
  marker.size = defaults.size;
  marker.aspect = defaults.aspect;
  marker.rotation = defaults.rotation;
  marker.offsetX = defaults.offsetX;
  marker.offsetY = defaults.offsetY;
  marker.viewZoom = state.viewZoom;
}

function getMarkerSizeRange(style) {
  return style === "filledDot" ? { min: 3, max: 5 } : { min: 2, max: 140 };
}

function clampMarkerSize(markerOrStyle, value) {
  const style = typeof markerOrStyle === "string" ? markerOrStyle : markerOrStyle?.style;
  const range = getMarkerSizeRange(style);
  return clamp(Number(value) || range.min, range.min, range.max);
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

  return clamp(Math.round(parsed), MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH);
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
  embeddedMapFontDataUrl = null;
  ensureDocumentMapFontStyle();
  if (document.fonts?.load) {
    try {
      await document.fonts.load(`12px ${MAP_FONT_FAMILY}`);
    } catch (_error) {
      // 브라우저가 폰트 로드를 거부해도 시스템 기본 서체로 계속 렌더링합니다.
    }
  }
  rerenderFontDependentViews();
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

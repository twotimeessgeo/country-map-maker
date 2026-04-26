const DEFAULT_WORLD_SAMPLE_NAMES = ["케이프타운", "브라질리아", "파리", "양곤"];
const CONTINENT_ORDER = ["전체", "아프리카", "아메리카", "오세아니아", "유라시아"];
const HEMISPHERE_ORDER = ["전체", "북반구", "남반구"];
const CLIMATE_FILTER_ORDER = [
  "전체",
  "Af",
  "Am",
  "Aw",
  "BS",
  "Bw",
  "Cfa",
  "Cfb",
  "Cs",
  "Cw",
  "Df",
  "Dw",
  "ET",
  "EF",
  "H",
];
const MAP_SCOPE_ORDER = ["all", "selected"];
const MAP_SCOPE_LABELS = {
  all: "전체 지역",
  selected: "선택 지역만",
};
const CUSTOM_REGIONS_STORAGE_KEY = "climate-atlas-custom-regions-v1";
const STANDARDIZED_BASE_REGIONS_STORAGE_KEY = "climate-atlas-standardized-base-regions-v1";
const COMPARISON_MONTHS = [0, 6];
const RANDOM_CLIMATE_SELECTION_SIZE = 4;
const COMPARISON_LINE_STYLES = [
  { dasharray: "", marker: "circle" },
  { dasharray: "10 6", marker: "square" },
  { dasharray: "4 4", marker: "triangle" },
  { dasharray: "2 4", marker: "diamond" },
  { dasharray: "14 5 3 5", marker: "circle" },
  { dasharray: "1 5", marker: "square" },
];
const API_SEARCH_URL = "https://geocoding-api.open-meteo.com/v1/search";
const API_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const API_NORMAL_PERIOD = {
  start: "1991-01-01",
  end: "2020-12-31",
  label: "1991-2020",
};
const SOLAR_DECLINATION_MONTH_DAY = {
  january: 15,
  july: 196,
};
const EXAM_MONTH_OPTIONS = [
  { value: 0, label: "1월", dayOfYear: SOLAR_DECLINATION_MONTH_DAY.january },
  { value: 6, label: "7월", dayOfYear: SOLAR_DECLINATION_MONTH_DAY.july },
];
const EXAM_VARIABLE_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const EXAM_LATITUDE_VARIABLE_PRIORITY_DIFFERENCE = 10;
const EXAM_POSITIVE_DIRECTION_WEIGHT = 0.72;
const EXAM_DUPLICATE_CATEGORY_GROUPS = {
  tropicOfCancerDistance: "tropicDistance",
  tropicOfCapricornDistance: "tropicDistance",
};
const EXAM_STATEMENT_PERIOD_LABELS = {
  "2022-suneung-q17-opt-03": { 가: "1월" },
  "2022-suneung-q17-opt-04": { 나: "7월" },
  "2025-suneung-q19-opt-03": { 가: "1월" },
};
const EXAM_COMPARISON_TEMPLATES = [
  {
    sourceIds: ["2021-06-q03-opt-02", "2023-09-q16-opt-05", "2025-09-q19-opt-02"],
    categoryKey: "monthlyPrecipitation",
    title: "월 강수량 비교",
    label: (context) => `${context.monthLabel} 강수량`,
    pattern: (context) => `한 지역은 다른 지역보다 ${context.monthLabel} 강수량이 많다.`,
    reversePattern: (context) => `한 지역은 다른 지역보다 ${context.monthLabel} 강수량이 적다.`,
    unit: "mm",
    minDifference: 20,
    usesMonth: true,
    getValue: (region, context) => region.monthlyPrecipitationMm[context.monthIndex],
    renderPositive: (higher, lower, context) =>
      `${withTopicParticle(higher.name)} ${lower.name}보다 ${context.monthLabel} 강수량이 많다.`,
    renderReverse: (higher, lower, context) =>
      `${withTopicParticle(lower.name)} ${higher.name}보다 ${context.monthLabel} 강수량이 적다.`,
    renderFalse: (higher, lower, context) =>
      `${withTopicParticle(higher.name)} ${lower.name}보다 ${context.monthLabel} 강수량이 적다.`,
    renderSuperlativePositive: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 ${context.monthLabel} 강수량이 가장 많은 곳은 ${region.name}이다.`,
    renderSuperlativeReverse: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 ${context.monthLabel} 강수량이 가장 적은 곳은 ${region.name}이다.`,
  },
  {
    sourceIds: ["2021-06-q03-opt-01", "2021-09-q04-opt-03"],
    categoryKey: "monthlyTemperature",
    title: "월 평균 기온 비교",
    label: (context) => `${context.monthLabel} 평균 기온`,
    pattern: (context) => `한 지역은 다른 지역보다 ${context.monthLabel} 평균 기온이 높다.`,
    reversePattern: (context) => `한 지역은 다른 지역보다 ${context.monthLabel} 평균 기온이 낮다.`,
    unit: "°C",
    minDifference: 1.5,
    usesMonth: true,
    getValue: (region, context) => region.monthlyTemperatureC[context.monthIndex],
    renderPositive: (higher, lower, context) =>
      `${withTopicParticle(higher.name)} ${lower.name}보다 ${context.monthLabel} 평균 기온이 높다.`,
    renderReverse: (higher, lower, context) =>
      `${withTopicParticle(lower.name)} ${higher.name}보다 ${context.monthLabel} 평균 기온이 낮다.`,
    renderFalse: (higher, lower, context) =>
      `${withTopicParticle(higher.name)} ${lower.name}보다 ${context.monthLabel} 평균 기온이 낮다.`,
    renderSuperlativePositive: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 ${context.monthLabel} 평균 기온이 가장 높은 곳은 ${region.name}이다.`,
    renderSuperlativeReverse: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 ${context.monthLabel} 평균 기온이 가장 낮은 곳은 ${region.name}이다.`,
  },
  {
    sourceIds: ["2021-09-q04-opt-04"],
    categoryKey: "annualPrecipitation",
    title: "연 강수량 비교",
    label: "연 강수량",
    pattern: "한 지역은 다른 지역보다 연 강수량이 많다.",
    reversePattern: "한 지역은 다른 지역보다 연 강수량이 적다.",
    unit: "mm",
    minDifference: 150,
    getValue: (region) => region.annualPrecipitationMm,
    renderPositive: (higher, lower) => `${withTopicParticle(higher.name)} ${lower.name}보다 연 강수량이 많다.`,
    renderReverse: (higher, lower) => `${withTopicParticle(lower.name)} ${higher.name}보다 연 강수량이 적다.`,
    renderFalse: (higher, lower) => `${withTopicParticle(higher.name)} ${lower.name}보다 연 강수량이 적다.`,
    renderSuperlativePositive: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 연 강수량이 가장 많은 곳은 ${region.name}이다.`,
    renderSuperlativeReverse: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 연 강수량이 가장 적은 곳은 ${region.name}이다.`,
  },
  {
    sourceIds: ["2021-06-q03-opt-04", "2023-09-q16-opt-03", "2025-06-q19-opt-02", "2025-suneung-q19-opt-04"],
    categoryKey: "annualTemperatureRange",
    title: "연교차 비교",
    label: "기온의 연교차",
    pattern: "한 지역은 다른 지역보다 기온의 연교차가 크다.",
    reversePattern: "한 지역은 다른 지역보다 기온의 연교차가 작다.",
    unit: "°C",
    minDifference: 1.5,
    getValue: getWorldAnnualTemperatureRange,
    renderPositive: (higher, lower) => `${withTopicParticle(higher.name)} ${lower.name}보다 기온의 연교차가 크다.`,
    renderReverse: (higher, lower) => `${withTopicParticle(lower.name)} ${higher.name}보다 기온의 연교차가 작다.`,
    renderFalse: (higher, lower) => `${withTopicParticle(higher.name)} ${lower.name}보다 기온의 연교차가 작다.`,
    renderSuperlativePositive: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 기온의 연교차가 가장 큰 곳은 ${region.name}이다.`,
    renderSuperlativeReverse: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 기온의 연교차가 가장 작은 곳은 ${region.name}이다.`,
  },
  {
    sourceIds: ["2024-09-q06-opt-03"],
    categoryKey: "annualMeanTemperature",
    title: "연평균 기온 비교",
    label: "연평균 기온",
    pattern: "한 지역은 다른 지역보다 연평균 기온이 높다.",
    reversePattern: "한 지역은 다른 지역보다 연평균 기온이 낮다.",
    unit: "°C",
    minDifference: 1.5,
    getValue: (region) => region.annualMeanTemperatureC,
    renderPositive: (higher, lower) => `${withTopicParticle(higher.name)} ${lower.name}보다 연평균 기온이 높다.`,
    renderReverse: (higher, lower) => `${withTopicParticle(lower.name)} ${higher.name}보다 연평균 기온이 낮다.`,
    renderFalse: (higher, lower) => `${withTopicParticle(higher.name)} ${lower.name}보다 연평균 기온이 낮다.`,
    renderSuperlativePositive: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 연평균 기온이 가장 높은 곳은 ${region.name}이다.`,
    renderSuperlativeReverse: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 연평균 기온이 가장 낮은 곳은 ${region.name}이다.`,
  },
  {
    sourceIds: ["2021-09-q04-opt-01", "2024-09-q06-opt-04", "2025-suneung-q19-opt-01"],
    categoryKey: "coldestMonthTemperature",
    title: "최한월 평균 기온 비교",
    label: "최한월 평균 기온",
    pattern: "한 지역은 다른 지역보다 최한월 평균 기온이 높다.",
    reversePattern: "한 지역은 다른 지역보다 최한월 평균 기온이 낮다.",
    unit: "°C",
    minDifference: 1.5,
    getValue: getColdestMonthTemperature,
    renderPositive: (higher, lower) => `${withTopicParticle(higher.name)} ${lower.name}보다 최한월 평균 기온이 높다.`,
    renderReverse: (higher, lower) => `${withTopicParticle(lower.name)} ${higher.name}보다 최한월 평균 기온이 낮다.`,
    renderFalse: (higher, lower) => `${withTopicParticle(higher.name)} ${lower.name}보다 최한월 평균 기온이 낮다.`,
    renderSuperlativePositive: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 최한월 평균 기온이 가장 높은 곳은 ${region.name}이다.`,
    renderSuperlativeReverse: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 최한월 평균 기온이 가장 낮은 곳은 ${region.name}이다.`,
  },
  {
    sourceIds: ["2021-06-q03-opt-03", "2022-suneung-q17-opt-05", "2023-06-q13-opt-01", "2024-09-q06-opt-05", "2025-06-q19-opt-04", "2025-09-q19-opt-04"],
    categoryKey: "dayLength",
    title: (context) => `${context.dayNightLabel} 비교`,
    label: (context) => `${context.monthLabel} ${context.dayNightLabel}`,
    pattern: (context) => `한 지역은 다른 지역보다 ${context.monthLabel} ${context.dayNightLabel}가 길다.`,
    reversePattern: (context) => `한 지역은 다른 지역보다 ${context.monthLabel} ${context.dayNightLabel}가 짧다.`,
    unit: "시간",
    minDifference: 0.5,
    usesMonth: true,
    supportsNightToggle: true,
    getValue: (region, context) => {
      const dayLength = getApproximateDayLength(region, context.dayOfYear);
      return context.useNightLength ? 24 - dayLength : dayLength;
    },
    renderPositive: (higher, lower, context) =>
      `${withTopicParticle(higher.name)} ${lower.name}보다 ${context.monthLabel} ${context.dayNightLabel}가 길다.`,
    renderReverse: (higher, lower, context) =>
      `${withTopicParticle(lower.name)} ${higher.name}보다 ${context.monthLabel} ${context.dayNightLabel}가 짧다.`,
    renderFalse: (higher, lower, context) =>
      `${withTopicParticle(higher.name)} ${lower.name}보다 ${context.monthLabel} ${context.dayNightLabel}가 짧다.`,
    renderSuperlativePositive: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 ${context.monthLabel} ${context.dayNightLabel}가 가장 긴 곳은 ${region.name}이다.`,
    renderSuperlativeReverse: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 ${context.monthLabel} ${context.dayNightLabel}가 가장 짧은 곳은 ${region.name}이다.`,
  },
  {
    sourceIds: ["2025-suneung-q19-opt-03"],
    categoryKey: "solarNoonAltitude",
    title: "태양 고도각 비교",
    label: (context) => `${context.monthLabel} 정오 태양 고도각`,
    pattern: (context) => `한 지역은 다른 지역보다 ${context.monthLabel} 정오의 태양 고도가 높다.`,
    reversePattern: (context) => `한 지역은 다른 지역보다 ${context.monthLabel} 정오의 태양 고도가 낮다.`,
    unit: "°",
    minDifference: 3,
    usesMonth: true,
    getValue: (region, context) => getApproximateSolarNoonAltitude(region, context.dayOfYear),
    renderPositive: (higher, lower, context) =>
      `${withTopicParticle(higher.name)} ${lower.name}보다 ${context.monthLabel} 정오의 태양 고도가 높다.`,
    renderReverse: (higher, lower, context) =>
      `${withTopicParticle(lower.name)} ${higher.name}보다 ${context.monthLabel} 정오의 태양 고도가 낮다.`,
    renderFalse: (higher, lower, context) =>
      `${withTopicParticle(higher.name)} ${lower.name}보다 ${context.monthLabel} 정오의 태양 고도가 낮다.`,
    renderSuperlativePositive: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 ${context.monthLabel} 정오의 태양 고도가 가장 높은 곳은 ${region.name}이다.`,
    renderSuperlativeReverse: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 ${context.monthLabel} 정오의 태양 고도가 가장 낮은 곳은 ${region.name}이다.`,
  },
  {
    sourceIds: ["2023-06-q13-opt-04", "2023-09-q16-opt-04"],
    categoryKey: "equatorDistance",
    title: "적도 거리 비교",
    label: "적도까지의 거리",
    pattern: "한 지역은 다른 지역보다 적도에서 멀다.",
    reversePattern: "한 지역은 다른 지역보다 적도에 가깝다.",
    unit: "°",
    minDifference: 3,
    getValue: (region) => Math.abs(region.coordinates?.latitude ?? NaN),
    renderPositive: (higher, lower) => `${withTopicParticle(higher.name)} ${lower.name}보다 적도에서 멀다.`,
    renderReverse: (higher, lower) => `${withTopicParticle(lower.name)} ${higher.name}보다 적도에 가깝다.`,
    renderFalse: (higher, lower) => `${withTopicParticle(higher.name)} ${lower.name}보다 적도에 가깝다.`,
    renderSuperlativePositive: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 적도에서 가장 먼 곳은 ${region.name}이다.`,
    renderSuperlativeReverse: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 적도에 가장 가까운 곳은 ${region.name}이다.`,
  },
  {
    sourceIds: ["2024-09-q06-opt-02"],
    categoryKey: "tropicOfCancerDistance",
    title: "북회귀선 거리 비교",
    label: "북회귀선까지의 위도 차",
    pattern: "한 지역은 다른 지역보다 북회귀선에서 멀다.",
    reversePattern: "한 지역은 다른 지역보다 북회귀선에 가깝다.",
    unit: "°",
    minDifference: 3,
    getValue: (region) => Math.abs((region.coordinates?.latitude ?? NaN) - 23.44),
    renderPositive: (higher, lower) => `${withTopicParticle(higher.name)} ${lower.name}보다 북회귀선에서 멀다.`,
    renderReverse: (higher, lower) => `${withTopicParticle(lower.name)} ${higher.name}보다 북회귀선에 가깝다.`,
    renderFalse: (higher, lower) => `${withTopicParticle(higher.name)} ${lower.name}보다 북회귀선에 가깝다.`,
    renderSuperlativePositive: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 북회귀선에서 가장 먼 곳은 ${region.name}이다.`,
    renderSuperlativeReverse: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 북회귀선에 가장 가까운 곳은 ${region.name}이다.`,
  },
  {
    sourceIds: ["2024-06-q20-opt-05"],
    categoryKey: "tropicOfCapricornDistance",
    title: "남회귀선 거리 비교",
    label: "남회귀선까지의 위도 차",
    pattern: "한 지역은 다른 지역보다 남회귀선에서 멀다.",
    reversePattern: "한 지역은 다른 지역보다 남회귀선에 가깝다.",
    unit: "°",
    minDifference: 3,
    getValue: (region) => Math.abs((region.coordinates?.latitude ?? NaN) + 23.44),
    renderPositive: (higher, lower) => `${withTopicParticle(higher.name)} ${lower.name}보다 남회귀선에서 멀다.`,
    renderReverse: (higher, lower) => `${withTopicParticle(lower.name)} ${higher.name}보다 남회귀선에 가깝다.`,
    renderFalse: (higher, lower) => `${withTopicParticle(higher.name)} ${lower.name}보다 남회귀선에 가깝다.`,
    renderSuperlativePositive: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 남회귀선에서 가장 먼 곳은 ${region.name}이다.`,
    renderSuperlativeReverse: (region, context, scopeLabel) =>
      `${scopeLabel} 중에서 남회귀선에 가장 가까운 곳은 ${region.name}이다.`,
  },
];
const HERO_MESSAGE_FULL_LINES = [
  "케이프타운과 카이로를 나란히 두면, 위도보다 바다가 더 말이 많아집니다.",
  "사막, 스텝, 열대우림, 툰드라. 지도에서는 범주지만 그래프에서는 성격입니다.",
  "기후는 암기보다 비교가 재밌습니다. 숫자를 붙여 놓는 순간 바로 캐릭터가 생깁니다.",
  "같은 위도라고 안심하면 늘 바다가 반전을 준비하고 있습니다.",
  "도시 하나를 고르면 그곳의 계절 리듬이, 여러 도시를 고르면 지리의 성격이 보입니다.",
  "멀리 떨어진 도시들도 월별 그래프에선 금방 같은 토론 테이블에 앉습니다.",
  "세계지리는 멀리 있어 어려운 게 아니라, 너무 멀어서 오히려 비교가 재밌습니다.",
  "지도에서는 한 점인데, 그래프에서는 도시마다 말투가 전부 다릅니다.",
];
const HERO_MESSAGE_QUIZZES = [
  "같은 위도인데도 더 따뜻한 도시는 왜 생길까요. 해류를 먼저 의심하면 꽤 잘 맞습니다.",
  "적도에 가깝다고 늘 비가 많을까요. 사막은 이런 일반화를 별로 좋아하지 않습니다.",
  "1월과 7월 차이가 유독 큰 지역은 보통 바다보다 무엇의 영향을 더 크게 받을까요.",
  "대륙 동안과 서안 중 어느 쪽이 더 온순한 그래프를 보일까요. 정답은 바다가 힌트를 줍니다.",
  "비슷한 기온인데 강수 패턴이 완전히 다른 두 도시는 무엇이 갈라놓았을까요.",
  "산지가 끼어 있으면 바람은 어느 쪽에서 더 쉽게 성격이 달라질까요.",
  "해양성 기후는 왜 여름과 겨울 모두 조금 덜 극적일까요. 바다가 힌트를 거의 다 말해줍니다.",
  "같은 아열대라도 어떤 곳은 촉촉하고 어떤 곳은 바삭한 이유가 뭘까요.",
];
const HERO_MESSAGE_ASIDES = [
  "산맥은 지도에선 얇은 선인데 날씨에서는 생각보다 자주 편 가르기를 합니다.",
  "해류는 바다 속 조연처럼 보이지만 기후 문제에서는 꽤 자주 주연입니다.",
  "강수량 막대가 조용하면 그 지역은 대개 말수보다 건조함이 많습니다.",
  "지리는 면적으로 배우지만 기후는 리듬으로 기억하면 더 오래 갑니다.",
  "지도에서 가까워 보여도 바다 하나 끼면 생활감각이 꽤 달라집니다.",
  "대륙 내부는 계절을 세게 타고, 해안은 바다 눈치를 꽤 봅니다.",
  "숫자는 차갑지만, 월별 그래프를 늘어놓으면 지역성이 꽤 수다스러워집니다.",
  "사막은 덥기만 한 곳이 아니라, 비 이야기가 유난히 짧은 곳이기도 합니다.",
  "고도가 높아지면 위도보다 먼저 분위기가 달라지는 장면이 자주 나옵니다.",
  "기후대 분류는 깔끔해 보여도 실제 도시는 늘 그 경계에서 재미를 만듭니다.",
];
const HERO_MESSAGE_DARKS = [
  "대륙성 기후는 계절에 늘 과몰입합니다. 여름도 세고 겨울도 세서 타협이 없습니다.",
  "사막의 강수 그래프는 너무 조용해서 오히려 눈치가 보일 정도입니다.",
  "몬순은 계절풍이라기보다 매년 공지 없이 들이닥치는 대형 일정에 가깝습니다.",
  "해양성 기후는 온건한 척하지만, 비로 끝까지 존재감을 챙깁니다.",
  "같은 위도만 믿고 접근하면 해류가 뒤에서 비웃는 장면을 자주 보게 됩니다.",
  "열대우림은 촉촉함을 포기하지 않고, 스텝은 강수 소식에 늘 답장이 느립니다.",
  "기후대 경계는 지도에선 반듯한데, 실제 도시는 늘 그 선 바깥에서 사고를 칩니다.",
  "고산 기후는 높다는 이유 하나로 늘 예외를 선언하는데, 이상하게 또 납득이 됩니다.",
  "건조 지역은 비가 없는 게 아니라, 강수량 표가 말을 아끼는 쪽에 가깝습니다.",
  "해류 한 줄 바뀌면 같은 위도 도시도 갑자기 서로 남처럼 굴기 시작합니다.",
  "내륙은 계절 기복을 숨길 생각이 없고, 해안은 바다 뒤에 숨어서 부드러운 척을 합니다.",
  "교과서에서는 기후가 차분해 보이지만, 그래프를 켜면 지역마다 성격이 꽤 험합니다.",
];
const ECONOMY_EGG_MESSAGE = "준비중입니다.";
const HERO_MESSAGE_OPENERS = [
  "비슷한 위도끼리 모아 놔도,",
  "지도에서 멀어 보이는 도시들도,",
  "적도 근처를 줄 세워 봐도,",
  "대륙 동안과 서안을 나란히 놓으면,",
  "사막과 해안을 같은 축에 올리면,",
  "산맥 하나를 사이에 둔 지역만 골라도,",
  "북반구 겨울과 남반구 여름을 함께 켜 두면,",
  "도시 네 곳만 찍어도,",
  "바다를 낀 도시와 내륙 도시를 붙여 보면,",
  "겉보기엔 온순한 중위도도,",
  "해류 하나만 끼어들어도,",
  "건조 지역을 얕보는 순간,",
  "몬순권 도시를 가져다 붙이면,",
  "대륙 내부를 슬쩍 끼워 넣는 순간,",
];
const HERO_MESSAGE_PAYOFFS = [
  "그래프에서 바로 성격이 갈립니다.",
  "해류가 슬쩍 주인공 자리를 가져갑니다.",
  "강수 막대가 의외로 제일 수다스럽습니다.",
  "1월과 7월이 서로 다른 증언을 합니다.",
  "기후대 이름표보다 숫자가 더 빨리 설명합니다.",
  "대륙성은 숨지 못하고 해양성은 티를 냅니다.",
  "건조함과 습윤함이 같은 화면에서 맞붙습니다.",
  "고도 한 번, 바다 한 번이 판을 바꿉니다.",
  "계절 리듬이 도시마다 딱 다르게 울립니다.",
  "지리는 조용한데 기후는 꽤 드라마틱합니다.",
  "온순해 보이던 도시도 갑자기 본색을 드러냅니다.",
  "교과서 한 줄 설명이 갑자기 너무 순하게 느껴집니다.",
  "강수 막대가 생각보다 훨씬 독하게 증언합니다.",
  "바다가 중재하지 않는 순간 계절이 과격해집니다.",
];
const MONTH_LABELS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const COLORS = {
  rain: "#5f5f5f",
  rainLight: "rgba(95, 95, 95, 0.18)",
  temperature: "#111111",
  grid: "rgba(17, 17, 17, 0.22)",
  gridSoft: "rgba(17, 17, 17, 0.1)",
  ink: "#111111",
  barNeutral: "#bcbcbc",
  zero: "#111111",
  white: "#ffffff",
};
const AFRICA_COUNTRY_CODES = new Set([
  "AO", "BF", "BI", "BJ", "BW", "CD", "CF", "CG", "CI", "CM", "CV", "DJ", "DZ", "EG",
  "EH", "ER", "ET", "GA", "GH", "GM", "GN", "GQ", "GW", "KE", "KM", "LR", "LS", "LY",
  "MA", "MG", "ML", "MR", "MU", "MW", "MZ", "NA", "NE", "NG", "RE", "RW", "SC", "SD",
  "SH", "SL", "SN", "SO", "SS", "ST", "SZ", "TD", "TG", "TN", "TZ", "UG", "YT", "ZA",
  "ZM", "ZW",
]);
const AMERICAS_COUNTRY_CODES = new Set([
  "AG", "AI", "AR", "AW", "BB", "BL", "BM", "BO", "BR", "BS", "BZ", "CA", "CL", "CO",
  "CR", "CU", "DM", "DO", "EC", "FK", "GD", "GF", "GL", "GP", "GT", "GY", "HN", "HT",
  "JM", "KN", "KY", "LC", "MF", "MQ", "MS", "MX", "NI", "PA", "PE", "PM", "PR", "PY",
  "SR", "SV", "SX", "TC", "TT", "US", "UY", "VC", "VE", "VG", "VI",
]);
const OCEANIA_COUNTRY_CODES = new Set([
  "AS", "AU", "CK", "FJ", "FM", "GU", "KI", "MH", "MP", "NC", "NF", "NR", "NU", "NZ",
  "PF", "PG", "PN", "PW", "SB", "TK", "TO", "TV", "VU", "WF", "WS",
]);
const CLIMATE_COLORS = {
  Af: "#111111",
  Am: "#202020",
  Aw: "#2f2f2f",
  BS: "#404040",
  Bw: "#525252",
  Cfa: "#666666",
  Cfb: "#787878",
  Cs: "#8a8a8a",
  Cw: "#9c9c9c",
  Df: "#a8a8a8",
  Dw: "#b3b3b3",
  ET: "#c0c0c0",
  EF: "#d8d8d8",
  H: "#4a4a4a",
};
const MAP_VIEWBOX = {
  width: 1000,
  height: 520,
  minLatitude: -60,
  maxLatitude: 82,
};
const MAP_PROJECTION_PADDING = {
  top: 18,
  right: 20,
  bottom: 18,
  left: 20,
};
const WORLD_TOPOLOGY_URL = "./data/world-countries-50m.json";
const WORLD_TOPOLOGY_FALLBACK_URL = "./data/world-countries-110m.json";
const MAP_MARKER_MIN_DISTANCE = 22;
const MAP_MARKER_MAX_DISPLACEMENT = 26;
const MAP_LAYOUT_ITERATIONS = 90;
const MAP_LEADER_THRESHOLD = 7;
const MAP_GRATICULE_LONGITUDES = [-120, -60, 0, 60, 120];
const MAP_GRATICULE_LATITUDES = [-30, 0, 30, 60];
const WORLD_LANDMASSES = [
  [
    [-168, 72],
    [-150, 74],
    [-136, 70],
    [-126, 60],
    [-124, 50],
    [-118, 32],
    [-110, 28],
    [-104, 24],
    [-98, 18],
    [-90, 18],
    [-84, 24],
    [-80, 28],
    [-76, 36],
    [-70, 44],
    [-62, 52],
    [-58, 60],
    [-64, 66],
    [-86, 72],
    [-116, 76],
    [-145, 76]
  ],
  [
    [-75, 60],
    [-52, 60],
    [-34, 66],
    [-22, 74],
    [-24, 82],
    [-46, 84],
    [-64, 78],
    [-74, 70]
  ],
  [
    [-82, 12],
    [-78, 4],
    [-76, -8],
    [-72, -18],
    [-68, -28],
    [-64, -38],
    [-60, -50],
    [-54, -56],
    [-48, -52],
    [-44, -40],
    [-40, -26],
    [-38, -12],
    [-44, 0],
    [-54, 6],
    [-66, 10]
  ],
  [
    [-12, 36],
    [-8, 46],
    [2, 52],
    [16, 58],
    [34, 60],
    [54, 62],
    [74, 66],
    [96, 72],
    [124, 68],
    [148, 60],
    [168, 58],
    [178, 50],
    [168, 44],
    [148, 40],
    [136, 34],
    [120, 24],
    [102, 18],
    [88, 20],
    [78, 28],
    [66, 24],
    [54, 24],
    [42, 30],
    [30, 36],
    [20, 42],
    [8, 36],
    [-2, 40]
  ],
  [
    [68, 24],
    [80, 22],
    [90, 18],
    [102, 12],
    [110, 8],
    [118, 0],
    [120, -8],
    [112, -10],
    [104, -4],
    [94, 4],
    [84, 8],
    [76, 16]
  ],
  [
    [-18, 36],
    [-6, 36],
    [10, 34],
    [24, 31],
    [34, 27],
    [44, 12],
    [50, 2],
    [46, -10],
    [40, -20],
    [30, -33],
    [18, -34],
    [8, -26],
    [0, -10],
    [-8, 10],
    [-16, 24]
  ],
  [
    [113, -10],
    [126, -12],
    [138, -16],
    [152, -24],
    [152, -36],
    [140, -43],
    [122, -38],
    [114, -28]
  ],
  [
    [166, -35],
    [178, -38],
    [176, -47],
    [169, -46],
    [166, -40]
  ],
  [
    [47, -13],
    [50, -19],
    [49, -26],
    [45, -25],
    [44, -17]
  ],
];

const collator = new Intl.Collator("ko-KR");
const numberFormatter = new Intl.NumberFormat("ko-KR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const coordinateFormatter = new Intl.NumberFormat("ko-KR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
let mapLayoutAnimationFrame = 0;
const APP_CONFIG = normalizeAppConfig(window.CLIMATE_APP_CONFIG ?? {});

const state = {
  dataset: null,
  worldMapData: null,
  mapLoadError: null,
  regions: [],
  selectedIds: new Set(),
  comparisonBaseline: "mean",
  continent: "전체",
  hemisphere: "전체",
  climateGroup: "전체",
  query: "",
  regionSort: document.querySelector("#regionSortSelect")?.value || "default",
  mapScope: "all",
  examMonthIndex: 0,
  examUseNightLength: false,
  examUseVariableLabels: true,
  examReversedCategoryKeys: new Set(),
  examQuestionSeed: 1,
  apiResults: [],
  apiLoading: false,
  apiStandardizing: false,
  apiBusyKey: "",
  apiMessage: "",
};

const elements = {
  searchInput: document.querySelector("#searchInput"),
  regionSortSelect: document.querySelector("#regionSortSelect"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  randomClimateSelectionButton: document.querySelector("#randomClimateSelectionButton"),
  continentChips: document.querySelector("#continentChips"),
  hemisphereChips: document.querySelector("#hemisphereChips"),
  climateChips: document.querySelector("#climateChips"),
  regionList: document.querySelector("#regionList"),
  selectionSummary: document.querySelector("#selectionSummary"),
  selectedRegionsContent: document.querySelector("#selectedRegionsContent"),
  comparisonContent: document.querySelector("#comparisonContent"),
  heroText: document.querySelector("#heroText"),
  economyEggButton: document.querySelector("#economyEggButton"),
  heroCount: document.querySelector("#heroCount"),
  heroCaption: document.querySelector("#heroCaption"),
  worldMap: document.querySelector("#worldMap"),
  mapSummary: document.querySelector("#mapSummary"),
  mapScopeChips: document.querySelector("#mapScopeChips"),
  apiSearchInput: document.querySelector("#apiSearchInput"),
  apiSearchButton: document.querySelector("#apiSearchButton"),
  syncBaseDatasetButton: document.querySelector("#syncBaseDatasetButton"),
  apiStatusSummary: document.querySelector("#apiStatusSummary"),
  apiStatusText: document.querySelector("#apiStatusText"),
  apiResults: document.querySelector("#apiResults"),
};

init();

async function init() {
  try {
    state.dataset = window.CLIMATE_DATA ?? (await loadDataset());
    try {
      state.worldMapData = await loadWorldMapData();
    } catch (error) {
      state.mapLoadError =
        error instanceof Error ? error.message : "세계 지도 데이터를 불러오지 못했습니다.";
      state.worldMapData = null;
      console.warn("Failed to load projected world map data:", error);
    }
    const standardizedOverrides = state.dataset.regions.some(shouldStandardizeBaseRegion)
      ? loadSavedStandardizedBaseRegions()
      : [];
    state.regions = mergeRegions(
      mergeRegions(state.dataset.regions, standardizedOverrides),
      loadSavedCustomRegions()
    ).sort(sortRegions);
    applyDefaultSelection();
    applyRandomHeroMessage();
    bindEvents();
    render();
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    elements.selectedRegionsContent.innerHTML = renderEmptyState(
      "데이터를 불러오지 못했습니다.",
      message
    );
    elements.comparisonContent.innerHTML = "";
  }
}

async function loadDataset() {
  const response = await fetch(APP_CONFIG.datasetPath);
  if (!response.ok) {
    throw new Error(`데이터를 불러오지 못했습니다. (${response.status})`);
  }
  return response.json();
}

async function loadWorldMapData() {
  if (!window.d3 || !window.topojson) {
    throw new Error("지도 라이브러리를 불러오지 못했습니다.");
  }

  let topology = window.WORLD_COUNTRIES_TOPOLOGY ?? null;
  let resolution = topology ? "50m" : "";

  if (!topology) {
    const loaded = await fetchWorldTopologyWithFallback([
      WORLD_TOPOLOGY_URL,
      WORLD_TOPOLOGY_FALLBACK_URL,
    ]);
    topology = loaded.topology;
    resolution = loaded.resolution;
  }
  const countriesObject =
    topology.objects?.countries ?? Object.values(topology.objects ?? {})[0] ?? null;
  const landObject = topology.objects?.land ?? countriesObject;

  if (!countriesObject || !landObject) {
    throw new Error("세계 지도 Topology 구조를 해석하지 못했습니다.");
  }

  return {
    topology,
    land: window.topojson.feature(topology, landObject),
    borders: window.topojson.mesh(topology, countriesObject, (left, right) => left !== right),
    resolution,
  };
}

async function fetchWorldTopologyWithFallback(urls) {
  let lastError = null;

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`세계 지도 데이터를 불러오지 못했습니다. (${response.status})`);
      }

      return {
        topology: await response.json(),
        resolution: url.includes("50m") ? "50m" : "110m",
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("세계 지도 데이터를 불러오지 못했습니다.");
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    render();
  });

  elements.regionSortSelect?.addEventListener("change", (event) => {
    state.regionSort = event.target.value || "default";
    render();
  });

  elements.clearSelectionButton.addEventListener("click", () => {
    state.selectedIds = new Set();
    state.comparisonBaseline = "mean";
    render();
  });

  elements.randomClimateSelectionButton.addEventListener("click", () => {
    applyRandomClimateSelection();
    render();
  });

  elements.comparisonContent.addEventListener("change", (event) => {
    const baselineSelect = event.target.closest("[data-baseline-select]");
    if (baselineSelect) {
      state.comparisonBaseline = baselineSelect.value || "mean";
      render();
      return;
    }

    const examMonthSelect = event.target.closest("[data-exam-month-select]");
    if (examMonthSelect) {
      state.examMonthIndex = normalizeExamMonthIndex(Number(examMonthSelect.value));
      state.examQuestionSeed += 1;
      render();
      return;
    }

    const examMonthToggle = event.target.closest("[data-exam-month-toggle]");
    if (examMonthToggle) {
      state.examMonthIndex = examMonthToggle.checked ? 6 : 0;
      state.examQuestionSeed += 1;
      render();
      return;
    }

    const examNightToggle = event.target.closest("[data-exam-night-toggle]");
    if (examNightToggle) {
      state.examUseNightLength = examNightToggle.checked;
      state.examQuestionSeed += 1;
      render();
      return;
    }

    const examVariableToggle = event.target.closest("[data-exam-variable-toggle]");
    if (examVariableToggle) {
      state.examUseVariableLabels = examVariableToggle.checked;
      render();
      return;
    }

    const examReverseToggle = event.target.closest("[data-exam-reverse-toggle]");
    if (examReverseToggle) {
      const categoryKey = examReverseToggle.dataset.examReverseToggle;
      if (categoryKey) {
        if (examReverseToggle.checked) {
          state.examReversedCategoryKeys.add(categoryKey);
        } else {
          state.examReversedCategoryKeys.delete(categoryKey);
        }
      }
      state.examQuestionSeed += 1;
      render();
    }
  });

  elements.comparisonContent.addEventListener("click", (event) => {
    const randomRegionButton = event.target.closest("[data-exam-region-random]");
    if (randomRegionButton) {
      applyRandomClimateSelection();
      state.examQuestionSeed += 1;
      render();
      return;
    }

    const refreshButton = event.target.closest("[data-exam-question-refresh]");
    if (!refreshButton) {
      return;
    }

    state.examQuestionSeed += 1;
    render();
  });

  elements.syncBaseDatasetButton.addEventListener("click", () => {
    void standardizeBaseDatasetFromApi();
  });

  elements.continentChips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-continent]");
    if (!button) {
      return;
    }

    state.continent = button.dataset.continent;
    render();
  });

  elements.hemisphereChips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-hemisphere]");
    if (!button) {
      return;
    }

    state.hemisphere = button.dataset.hemisphere;
    render();
  });

  elements.climateChips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-climate-group]");
    if (!button || button.disabled) {
      return;
    }

    state.climateGroup = button.dataset.climateGroup;
    render();
  });

  elements.mapScopeChips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-map-scope]");
    if (!button) {
      return;
    }

    state.mapScope = button.dataset.mapScope;
    render();
  });

  elements.regionList.addEventListener("change", (event) => {
    const input = event.target.closest("input[data-region-id]");
    if (!input) {
      return;
    }

    toggleRegion(input.dataset.regionId, input.checked);
    render();
  });

  elements.worldMap.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-map-region-id]");
    if (!button) {
      return;
    }

    const regionId = button.dataset.mapRegionId;
    toggleRegion(regionId, !state.selectedIds.has(regionId));
    render();
  });

  elements.apiSearchButton.addEventListener("click", () => {
    void searchApiRegions();
  });

  elements.apiSearchInput.addEventListener("input", () => {
    elements.apiSearchButton.disabled =
      state.apiLoading || state.apiStandardizing || elements.apiSearchInput.value.trim().length < 2;
    if (!elements.apiSearchInput.value.trim()) {
      state.apiMessage = "";
      state.apiResults = [];
      render();
    }
  });

  elements.apiSearchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    void searchApiRegions();
  });

  elements.apiResults.addEventListener("click", (event) => {
    const existingButton = event.target.closest("[data-existing-region-id]");
    if (existingButton) {
      const regionId = existingButton.dataset.existingRegionId;
      toggleRegion(regionId, true);
      state.query = existingButton.dataset.regionName ?? "";
      elements.searchInput.value = state.query;
      state.continent = "전체";
      state.hemisphere = "전체";
      state.climateGroup = "전체";
      state.apiMessage = "이미 있는 지역을 선택했습니다.";
      render();
      return;
    }

    const addButton = event.target.closest("[data-api-result-index]");
    if (!addButton || addButton.disabled) {
      return;
    }

    void addRegionFromApiResult(Number(addButton.dataset.apiResultIndex));
  });

  elements.economyEggButton?.addEventListener("click", () => {
    showEconomyEggToast();
  });

  window.addEventListener("resize", () => {
    if (mapLayoutAnimationFrame) {
      cancelAnimationFrame(mapLayoutAnimationFrame);
    }
    mapLayoutAnimationFrame = requestAnimationFrame(() => {
      applyMapMarkerLayout();
      mapLayoutAnimationFrame = 0;
    });
  });
}

function applyDefaultSelection() {
  const randomRegions = pickRandomClimateSelection();
  if (randomRegions.length > 0) {
    state.selectedIds = new Set(randomRegions.map((region) => region.id));
    return;
  }

  const fallbackRegions = state.regions.filter((region) =>
    APP_CONFIG.defaultSampleNames.includes(region.name)
  );
  state.selectedIds = new Set(fallbackRegions.map((region) => region.id));
}

function normalizeComparisonBaseline(selectedRegions) {
  if (state.comparisonBaseline === "mean") {
    return;
  }

  if (!selectedRegions.some((region) => region.id === state.comparisonBaseline)) {
    state.comparisonBaseline = "mean";
  }
}

function applyRandomClimateSelection() {
  const pickedRegions = pickRandomClimateSelection();
  if (pickedRegions.length === 0) {
    return;
  }

  state.selectedIds = new Set(pickedRegions.map((region) => region.id));
  state.query = "";
  elements.searchInput.value = "";
  state.continent = "전체";
  state.hemisphere = "전체";
  state.climateGroup = "전체";
  state.mapScope = "selected";
  state.comparisonBaseline = "mean";
}

function pickRandomClimateSelection() {
  const groups = new Map();
  state.regions.forEach((region) => {
    if (!region.climateGroup || region.climateGroup === "전체") {
      return;
    }

    if (!groups.has(region.climateGroup)) {
      groups.set(region.climateGroup, []);
    }
    groups.get(region.climateGroup).push(region);
  });

  const randomGroups = shuffleArray([...groups.keys()]).slice(0, RANDOM_CLIMATE_SELECTION_SIZE);
  const pickedRegions = [];
  randomGroups.forEach((climateGroup) => {
    const candidates = groups.get(climateGroup) ?? [];
    if (candidates.length === 0) {
      return;
    }
    const pickedRegion = candidates[Math.floor(Math.random() * candidates.length)];
    pickedRegions.push(pickedRegion);
  });

  if (pickedRegions.length >= RANDOM_CLIMATE_SELECTION_SIZE) {
    return pickedRegions;
  }

  return shuffleArray(state.regions).slice(0, RANDOM_CLIMATE_SELECTION_SIZE);
}

function toggleRegion(regionId, isChecked) {
  const nextSelected = new Set(state.selectedIds);
  if (isChecked) {
    nextSelected.add(regionId);
  } else {
    nextSelected.delete(regionId);
  }
  state.selectedIds = nextSelected;
}

function applyRandomHeroMessage() {
  if (!elements.heroText) {
    return;
  }

  elements.heroText.textContent = buildRandomHeroMessage();
}

function buildRandomHeroMessage() {
  const roll = Math.random();

  if (roll < 0.18) {
    return pickRandomItem(HERO_MESSAGE_FULL_LINES);
  }

  if (roll < 0.36) {
    return pickRandomItem(HERO_MESSAGE_QUIZZES);
  }

  if (roll < 0.58) {
    return pickRandomItem(HERO_MESSAGE_ASIDES);
  }

  if (roll < 0.8) {
    return pickRandomItem(HERO_MESSAGE_DARKS);
  }

  return `${pickRandomItem(HERO_MESSAGE_OPENERS)} ${pickRandomItem(HERO_MESSAGE_PAYOFFS)}`;
}

function showEconomyEggToast() {
  window.alert(ECONOMY_EGG_MESSAGE);
}

function pickRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function render() {
  const visibleRegions = sortDisplayedRegions(getVisibleRegions());
  const selectedRegions = sortDisplayedRegions(getSelectedRegions());
  normalizeComparisonBaseline(selectedRegions);
  const mappableRegions = getMapRegions(visibleRegions, selectedRegions);

  elements.heroCount.textContent = `${state.regions.length}개 지역`;
  elements.heroCaption.textContent = buildHeroCaption();
  elements.selectionSummary.textContent = `${selectedRegions.length}개 선택됨`;
  elements.mapSummary.textContent = buildMapSummary(mappableRegions, selectedRegions);
  elements.continentChips.innerHTML = renderContinentChips();
  elements.hemisphereChips.innerHTML = renderHemisphereChips();
  elements.climateChips.innerHTML = renderClimateChips();
  elements.mapScopeChips.innerHTML = renderMapScopeChips();
  elements.worldMap.innerHTML = renderWorldMap(mappableRegions);
  applyMapMarkerLayout();
  elements.regionList.innerHTML = renderRegionOptions(visibleRegions);
  elements.syncBaseDatasetButton.textContent = buildSyncBaseDatasetButtonLabel();
  elements.syncBaseDatasetButton.disabled =
    state.apiLoading || state.apiStandardizing || getPendingBaseStandardizationRegions().length === 0;
  elements.apiStatusSummary.textContent = buildApiStatusSummary();
  elements.apiStatusText.textContent = buildApiStatusText();
  elements.apiResults.innerHTML = renderApiResults();
  elements.apiSearchButton.disabled =
    state.apiLoading || state.apiStandardizing || elements.apiSearchInput.value.trim().length < 2;
  elements.selectedRegionsContent.innerHTML = renderSelectedRegions(selectedRegions);
  elements.comparisonContent.innerHTML = renderComparison(selectedRegions);
}

function getVisibleRegions() {
  const normalizedQuery = state.query.toLowerCase();
  return state.regions.filter((region) => {
    const matchesContinent =
      state.continent === "전체" || region.continent === state.continent;
    const matchesHemisphere =
      state.hemisphere === "전체" || getHemisphere(region) === state.hemisphere;
    const matchesClimate =
      state.climateGroup === "전체" || region.climateGroup === state.climateGroup;

    if (!matchesContinent || !matchesHemisphere || !matchesClimate) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchable = [
      region.name,
      region.englishName,
      region.continent,
      getHemisphere(region),
      region.country,
      region.climateGroup,
      region.climateCode,
      region.id,
      ...(region.aliases ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return searchable.includes(normalizedQuery);
  });
}

function getSelectedRegions() {
  return state.regions.filter((region) => state.selectedIds.has(region.id));
}

function sortDisplayedRegions(regions) {
  return [...regions].sort(compareRegionsByActiveSort);
}

function compareRegionsByActiveSort(left, right) {
  switch (state.regionSort) {
    case "name":
      return collator.compare(left.name, right.name);
    case "annualPrecipitationDesc":
      return compareNumericDescending(left.annualPrecipitationMm, right.annualPrecipitationMm, left, right);
    case "annualRangeDesc":
      return compareNumericDescending(getWorldAnnualTemperatureRange(left), getWorldAnnualTemperatureRange(right), left, right);
    case "warmestMonthDesc":
      return compareNumericDescending(getWarmestMonthTemperature(left), getWarmestMonthTemperature(right), left, right);
    case "coldestMonthAsc":
      return compareNumericAscending(getColdestMonthTemperature(left), getColdestMonthTemperature(right), left, right);
    default:
      return sortRegions(left, right);
  }
}

function getMapRegions(visibleRegions, selectedRegions) {
  if (state.mapScope === "selected") {
    return selectedRegions.filter(hasCoordinates);
  }

  return visibleRegions.filter(hasCoordinates);
}

function buildHeroCaption() {
  const openMeteoCount =
    state.dataset?.summary?.sourceBreakdown?.["open-meteo"] ??
    state.regions.filter((region) => region.source?.type === "open-meteo").length;
  const liveApiCount = state.regions.filter((region) => region.source?.type === "open-meteo-live").length;
  const pendingCount = getPendingBaseStandardizationRegions().length;

  if (liveApiCount > 0) {
    return `Open-Meteo ${openMeteoCount}개 + 사용자 추가 ${liveApiCount}개`;
  }

  if (pendingCount > 0) {
    return `Open-Meteo ${API_NORMAL_PERIOD.label} 기준으로 대체 중`;
  }

  if (openMeteoCount > 0) {
    return `Open-Meteo ${API_NORMAL_PERIOD.label} 기준 데이터`;
  }

  return "Open-Meteo 기후 데이터";
}

function buildMapSummary(mappableRegions, selectedRegions) {
  if (state.mapScope === "selected") {
    return `선택 ${mappableRegions.length}개 표시 · 전체 선택 ${selectedRegions.length}개`;
  }

  const totalMappable = state.regions.filter(hasCoordinates).length;
  return `표시 ${mappableRegions.length}개 · 전체 ${totalMappable}개`;
}

function buildSyncBaseDatasetButtonLabel() {
  if (state.apiStandardizing) {
    return "기본 데이터 재동기화 중...";
  }

  const pendingCount = getPendingBaseStandardizationRegions().length;
  return pendingCount > 0 ? `기본 ${pendingCount}개 API 대체` : "기본 데이터 API 기준 완료";
}

function formatSourceLabel(region) {
  const source = region.source ?? {};

  if (source.type === "open-meteo") {
    return `Open-Meteo ERA5 ${source.period ?? ""}`.trim();
  }

  if (source.type === "open-meteo-live") {
    return `Open-Meteo API ${source.period ?? ""}`.trim();
  }

  return source.label ?? "Open-Meteo 기반";
}

function renderMapScopeChips() {
  return MAP_SCOPE_ORDER.map((scopeId) => {
    const isActive = state.mapScope === scopeId;
    return `
      <button
        type="button"
        class="chip-button ${isActive ? "is-active" : ""}"
        data-map-scope="${scopeId}"
      >
        ${escapeHtml(MAP_SCOPE_LABELS[scopeId])}
      </button>
    `;
  }).join("");
}

function renderContinentChips() {
  const primaryFilterOrder = APP_CONFIG.primaryFilterOrder;
  const counts = primaryFilterOrder.reduce((accumulator, continent) => {
    if (continent === "전체") {
      accumulator[continent] = state.regions.length;
    } else {
      accumulator[continent] = state.regions.filter(
        (region) => region.continent === continent
      ).length;
    }
    return accumulator;
  }, {});

  return primaryFilterOrder.map((continent) => {
    const isActive = state.continent === continent;
    return `
      <button
        type="button"
        class="chip-button ${isActive ? "is-active" : ""}"
        data-continent="${escapeHtml(continent)}"
      >
        ${escapeHtml(continent)} (${counts[continent]})
      </button>
    `;
  }).join("");
}

function renderHemisphereChips() {
  const counts = HEMISPHERE_ORDER.reduce((accumulator, hemisphere) => {
    if (hemisphere === "전체") {
      accumulator[hemisphere] = state.regions.length;
    } else {
      accumulator[hemisphere] = state.regions.filter(
        (region) => getHemisphere(region) === hemisphere
      ).length;
    }
    return accumulator;
  }, {});

  return HEMISPHERE_ORDER.map((hemisphere) => {
    const isActive = state.hemisphere === hemisphere;
    return `
      <button
        type="button"
        class="chip-button ${isActive ? "is-active" : ""}"
        data-hemisphere="${escapeHtml(hemisphere)}"
      >
        ${escapeHtml(hemisphere)} (${counts[hemisphere]})
      </button>
    `;
  }).join("");
}

function renderClimateChips() {
  const counts = CLIMATE_FILTER_ORDER.reduce((accumulator, climateGroup) => {
    if (climateGroup === "전체") {
      accumulator[climateGroup] = state.regions.length;
    } else {
      accumulator[climateGroup] = state.regions.filter(
        (region) => region.climateGroup === climateGroup
      ).length;
    }
    return accumulator;
  }, {});

  return CLIMATE_FILTER_ORDER.map((climateGroup) => {
    const isActive = state.climateGroup === climateGroup;
    const count = counts[climateGroup];
    const isDisabled = climateGroup !== "전체" && count === 0;
    return `
      <button
        type="button"
        class="chip-button ${isActive ? "is-active" : ""} ${isDisabled ? "is-disabled" : ""}"
        data-climate-group="${escapeHtml(climateGroup)}"
        ${isDisabled ? "disabled" : ""}
      >
        ${escapeHtml(climateGroup)} (${count})
      </button>
    `;
  }).join("");
}

function renderRegionOptions(regions) {
  if (regions.length === 0) {
    return renderEmptyState(
      "검색 결과가 없습니다.",
      "검색어를 바꾸거나 대륙/기후 필터를 전체로 돌려보세요."
    );
  }

  return regions
    .map((region) => {
      const isSelected = state.selectedIds.has(region.id);
      return `
        <label class="region-option ${isSelected ? "is-selected" : ""}">
          <div class="region-option-top">
            <div class="region-option-title">
              <strong>${escapeHtml(region.name)}</strong>
              <span>${escapeHtml(
                [region.continent, getHemisphere(region), region.climateGroup, region.country]
                  .filter(Boolean)
                  .join(" · ")
              )}</span>
            </div>
            <input
              type="checkbox"
              data-region-id="${region.id}"
              ${isSelected ? "checked" : ""}
              aria-label="${escapeHtml(region.name)} 선택"
            />
          </div>
          <div class="region-option-meta">
            기후 코드 ${escapeHtml(region.climateCode)} ·
            연평균 기온 ${formatTemp(region.annualMeanTemperatureC)} · 연강수량 ${formatMm(
              region.annualPrecipitationMm
            )}
          </div>
          ${
            hasCoordinates(region)
              ? `<div class="region-option-coordinates">좌표 ${escapeHtml(
                  formatCoordinatePair(region.coordinates)
                )}</div>`
              : ""
          }
        </label>
      `;
    })
    .join("");
}

function renderSelectedRegions(selectedRegions) {
  if (selectedRegions.length === 0) {
    return renderEmptyState(
      "아직 선택된 지역이 없습니다.",
      "왼쪽에서 지역을 골라 월별 기후 통계를 확인해보세요."
    );
  }

  const sharedChartScale = buildClimateChartScale(selectedRegions);

  return selectedRegions
    .map(
      (region, index) => `
        <article class="region-card world-region-card" style="animation-delay: ${index * 50}ms">
          <div class="region-card-top">
            <div class="region-card-body">
              <div>
                <div class="region-card-header">
                  <div>
                    <h3>${escapeHtml(region.name)}</h3>
                    <div class="region-meta">
                      <span class="meta-pill">${escapeHtml(region.continent)}</span>
                      <span class="meta-pill">${escapeHtml(getHemisphere(region))}</span>
                      ${region.country ? `<span class="meta-pill">${escapeHtml(region.country)}</span>` : ""}
                      <span class="meta-pill">기후 ${escapeHtml(region.climateGroup)}</span>
                      ${
                        region.climateCode !== region.climateGroup
                          ? `<span class="meta-pill">세부 코드 ${escapeHtml(region.climateCode)}</span>`
                          : ""
                      }
                      <span class="meta-pill">${escapeHtml(formatSourceLabel(region))}</span>
                    </div>
                  </div>
                </div>
                <div class="stat-grid">
                  <span class="stat-pill">연평균 기온 ${formatTemp(region.annualMeanTemperatureC)}</span>
                  <span class="stat-pill">연강수량 ${formatMm(region.annualPrecipitationMm)}</span>
                  <span class="stat-pill">1월 ${formatTemp(region.monthlyTemperatureC[0])} / ${formatMm(
                    region.monthlyPrecipitationMm[0]
                  )}</span>
                  <span class="stat-pill">7월 ${formatTemp(region.monthlyTemperatureC[6])} / ${formatMm(
                    region.monthlyPrecipitationMm[6]
                  )}</span>
                  ${
                    hasCoordinates(region)
                      ? `<span class="stat-pill">좌표 ${escapeHtml(
                          formatCoordinatePair(region.coordinates)
                        )}</span>`
                      : ""
                  }
                  ${
                    Number.isFinite(region.elevationM)
                      ? `<span class="stat-pill">해발 ${escapeHtml(formatMeters(region.elevationM))}</span>`
                      : ""
                  }
                </div>
              </div>
            </div>
            <div class="region-card-chart">
              <div class="world-region-chart-frame">
                ${renderClimateChart(region, sharedChartScale)}
              </div>
              <p class="chart-caption">* 회색 막대는 강수량, 검은 선은 평균 기온입니다.</p>
            </div>
          </div>
          <div class="table-wrap region-card-table is-transposed">
            <table class="transpose-table">
              <thead>
                <tr>
                  <th>항목</th>
                  ${region.months.map((month) => `<th>${escapeHtml(month)}</th>`).join("")}
                  <th>연간</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">평균 기온</th>
                  ${region.monthlyTemperatureC.map((value) => `<td>${formatTemp(value)}</td>`).join("")}
                  <td>${formatTemp(region.annualMeanTemperatureC)}</td>
                </tr>
                <tr>
                  <th scope="row">강수량</th>
                  ${region.monthlyPrecipitationMm.map((value) => `<td>${formatMm(value)}</td>`).join("")}
                  <td>${formatMm(region.annualPrecipitationMm)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      `
    )
    .join("");
}

function buildClimateChartScale(regions) {
  const temperatureValues = regions.flatMap((region) => region.monthlyTemperatureC);
  const precipitationValues = regions.flatMap((region) => region.monthlyPrecipitationMm);
  const temperatureMinValue = Math.min(...temperatureValues);
  const temperatureMaxValue = Math.max(...temperatureValues);
  const precipitationMaxValue = Math.max(...precipitationValues);
  const precipitationStep = pickPrecipitationStep(precipitationMaxValue);
  const temperatureStep = pickTemperatureStep(temperatureMaxValue - temperatureMinValue);

  return {
    precipitationMax: niceCeil(precipitationMaxValue, precipitationStep),
    temperatureMin: niceFloor(temperatureMinValue - temperatureStep, temperatureStep),
    temperatureMax: niceCeil(temperatureMaxValue + temperatureStep, temperatureStep),
  };
}

function buildApiStatusSummary() {
  const pendingCount = getPendingBaseStandardizationRegions().length;
  if (state.apiLoading) {
    return "Open-Meteo 검색 중";
  }
  if (state.apiStandardizing) {
    return "기본 데이터 재동기화 중";
  }

  const resultCount = state.apiResults.length;
  const liveApiCount = state.regions.filter((region) => region.source?.type === "open-meteo-live").length;
  const baseCount = state.regions.filter((region) => region.source?.type === "open-meteo").length;
  return `기본 API ${baseCount}개 · 대기 ${pendingCount}개 · 검색 결과 ${resultCount}개 · 추가 ${liveApiCount}개`;
}

function buildApiStatusText() {
  if (state.apiMessage) {
    return state.apiMessage;
  }

  return "* 기본 제공 지역은 Open-Meteo Historical Weather API(ERA5) 1991-2020 기준으로 맞추고, 추가 지역도 같은 기준으로 계산합니다. 검색으로 새 지역을 붙일 수 있고, 필요하면 기본 데이터 재동기화로 다시 계산할 수 있습니다.";
}

function renderApiResults() {
  if (state.apiResults.length === 0) {
    return renderEmptyState(
      "아직 API 검색 결과가 없습니다.",
      "도시나 지역명을 검색하면 좌표 후보를 찾고, 원하는 위치를 현재 기후 데이터셋에 바로 추가할 수 있습니다."
    );
  }

  return state.apiResults
    .map((result, index) => {
      const existingRegion = findExistingRegionForApiResult(result);
      const resultKey = getApiResultKey(result);
      const isBusy = state.apiBusyKey === resultKey || state.apiStandardizing;
      const locationMeta = [result.country, result.admin1, result.timezone].filter(Boolean).join(" · ");

      return `
        <article class="api-result-card">
          <div class="api-result-card-head">
            <div>
              <h3>${escapeHtml(result.name)}</h3>
              <p class="api-result-meta">${escapeHtml(locationMeta)}</p>
            </div>
            ${
              existingRegion
                ? `
                  <button
                    type="button"
                    class="ghost-button"
                    data-existing-region-id="${existingRegion.id}"
                    data-region-name="${escapeHtml(existingRegion.name)}"
                  >
                    기존 지역 선택
                  </button>
                `
                : `
                  <button
                    type="button"
                    class="ghost-button"
                    data-api-result-index="${index}"
                    ${isBusy ? "disabled" : ""}
                  >
                    ${isBusy ? "기후 불러오는 중..." : "기후 불러와 추가"}
                  </button>
                `
            }
          </div>
          <div class="api-result-pills">
            <span class="stat-pill">좌표 ${escapeHtml(formatCoordinatePair(result))}</span>
            ${
              Number.isFinite(result.elevation)
                ? `<span class="stat-pill">해발 ${escapeHtml(formatMeters(result.elevation))}</span>`
                : ""
            }
            ${
              Number.isFinite(result.population)
                ? `<span class="stat-pill">인구 ${escapeHtml(formatPopulation(result.population))}</span>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");
}

async function searchApiRegions() {
  const query = elements.apiSearchInput.value.trim();
  if (query.length < 2 || state.apiLoading || state.apiStandardizing) {
    return;
  }

  state.apiLoading = true;
  state.apiBusyKey = "";
  state.apiMessage = `"${query}" 위치 후보를 찾는 중입니다...`;
  render();

  try {
    const url = new URL(API_SEARCH_URL);
    url.searchParams.set("name", query);
    url.searchParams.set("count", "8");
    url.searchParams.set("language", "ko");
    url.searchParams.set("format", "json");
    if (APP_CONFIG.apiSearchCountryCode) {
      url.searchParams.set("countryCode", APP_CONFIG.apiSearchCountryCode);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`위치 검색에 실패했습니다. (${response.status})`);
    }

    const payload = await response.json();
    state.apiResults = (payload.results ?? []).map(normalizeApiSearchResult);
    state.apiMessage =
      state.apiResults.length > 0
        ? `"${query}" 검색 결과 ${state.apiResults.length}개를 찾았습니다.`
        : `"${query}"에 해당하는 위치를 찾지 못했습니다.`;
  } catch (error) {
    state.apiResults = [];
    state.apiMessage =
      error instanceof Error
        ? error.message
        : "Open-Meteo API 검색 중 알 수 없는 오류가 발생했습니다.";
  } finally {
    state.apiLoading = false;
    render();
  }
}

async function addRegionFromApiResult(resultIndex) {
  if (state.apiStandardizing) {
    return;
  }
  const result = state.apiResults[resultIndex];
  if (!result) {
    return;
  }

  const existingRegion = findExistingRegionForApiResult(result);
  if (existingRegion) {
    toggleRegion(existingRegion.id, true);
    state.apiMessage = `${existingRegion.name}은(는) 이미 데이터셋에 있어 바로 선택했습니다.`;
    render();
    return;
  }

  const resultKey = getApiResultKey(result);
  state.apiLoading = true;
  state.apiBusyKey = resultKey;
  state.apiMessage = `${result.name}의 1991-2020 월별 기후를 계산하고 있습니다...`;
  render();

  try {
    const climate = await fetchApiClimateNormals(result);
    const region = createRegionFromApiResult(result, climate);

    state.regions = mergeRegions(state.regions, [region]).sort(sortRegions);
    persistCustomRegions();
    toggleRegion(region.id, true);
    state.continent = "전체";
    state.hemisphere = "전체";
    state.climateGroup = "전체";
    state.query = region.name;
    elements.searchInput.value = region.name;
    state.apiMessage = `${region.name}을(를) 데이터셋에 추가했습니다.`;
  } catch (error) {
    state.apiMessage =
      error instanceof Error
        ? error.message
        : `${result.name}의 기후 정보를 가져오는 중 오류가 발생했습니다.`;
  } finally {
    state.apiLoading = false;
    state.apiBusyKey = "";
    render();
  }
}

function normalizeApiSearchResult(result) {
  return {
    id: result.id ?? null,
    name: result.name,
    englishName: result.name,
    latitude: Number(result.latitude),
    longitude: Number(result.longitude),
    elevation: Number.isFinite(result.elevation) ? Number(result.elevation) : null,
    country: result.country ?? "",
    countryCode: result.country_code ?? "",
    timezone: result.timezone ?? "",
    population: Number.isFinite(result.population) ? Number(result.population) : null,
    admin1: result.admin1 ?? "",
  };
}

async function fetchApiClimateNormals(location) {
  const url = buildArchiveApiUrl(location);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`기후 데이터를 불러오지 못했습니다. (${response.status})`);
  }

  const payload = await response.json();
  const daily = payload.daily ?? {};
  const time = daily.time ?? [];
  const temperatures = daily.temperature_2m_mean ?? [];
  const precipitations = daily.precipitation_sum ?? [];

  if (time.length === 0 || temperatures.length !== time.length || precipitations.length !== time.length) {
    throw new Error("월별 기후를 계산하기 위한 일별 자료가 충분하지 않습니다.");
  }

  return {
    ...buildMonthlyNormalsFromDaily(time, temperatures, precipitations),
    apiUrl: url.toString(),
  };
}

function buildMonthlyNormalsFromDaily(times, temperatures, precipitations) {
  const byMonthOfYear = new Array(12).fill(null).map(() => ({
    temperatureSum: 0,
    temperatureCount: 0,
    precipitationSum: 0,
    monthCount: 0,
  }));
  const byYearMonth = new Map();

  times.forEach((time, index) => {
    const monthIndex = Number(time.slice(5, 7)) - 1;
    const bucketKey = time.slice(0, 7);
    if (!byYearMonth.has(bucketKey)) {
      byYearMonth.set(bucketKey, {
        monthIndex,
        temperatureSum: 0,
        temperatureCount: 0,
        precipitationTotal: 0,
      });
    }

    const bucket = byYearMonth.get(bucketKey);
    const temperatureValue = Number(temperatures[index]);
    const precipitationValue = Number(precipitations[index]);

    if (Number.isFinite(temperatureValue)) {
      bucket.temperatureSum += temperatureValue;
      bucket.temperatureCount += 1;
    }

    if (Number.isFinite(precipitationValue)) {
      bucket.precipitationTotal += precipitationValue;
    }
  });

  for (const bucket of byYearMonth.values()) {
    const monthBucket = byMonthOfYear[bucket.monthIndex];
    if (bucket.temperatureCount > 0) {
      monthBucket.temperatureSum += bucket.temperatureSum / bucket.temperatureCount;
      monthBucket.temperatureCount += 1;
    }
    monthBucket.precipitationSum += bucket.precipitationTotal;
    monthBucket.monthCount += 1;
  }

  const monthlyTemperatureC = byMonthOfYear.map((bucket) =>
    bucket.temperatureCount > 0 ? round(bucket.temperatureSum / bucket.temperatureCount) : 0
  );
  const monthlyPrecipitationMm = byMonthOfYear.map((bucket) =>
    bucket.monthCount > 0 ? round(bucket.precipitationSum / bucket.monthCount) : 0
  );

  return {
    months: MONTH_LABELS,
    monthlyTemperatureC,
    monthlyPrecipitationMm,
    annualMeanTemperatureC: average(monthlyTemperatureC),
    annualPrecipitationMm: round(
      monthlyPrecipitationMm.reduce((sum, value) => sum + Number(value), 0)
    ),
  };
}

function createRegionFromApiResult(result, climate) {
  const climateGroup = classifyClimateGroup({
    monthlyTemperatureC: climate.monthlyTemperatureC,
    monthlyPrecipitationMm: climate.monthlyPrecipitationMm,
    latitude: result.latitude,
    elevationM: result.elevation,
  });
  const regionId = result.id ? `api-${result.id}` : buildFallbackApiRegionId(result);

  return {
    id: regionId,
    name: result.name,
    englishName: result.englishName,
    aliases: [result.name, result.englishName, result.admin1, result.country].filter(Boolean),
    continent: inferPrimaryCategory(result.countryCode, result.latitude, result.longitude),
    country: result.country,
    countryCode: result.countryCode,
    timezone: result.timezone,
    elevationM: result.elevation,
    climateCode: climateGroup,
    climateGroup,
    months: climate.months,
    monthlyTemperatureC: climate.monthlyTemperatureC,
    monthlyPrecipitationMm: climate.monthlyPrecipitationMm,
    annualMeanTemperatureC: climate.annualMeanTemperatureC,
    annualPrecipitationMm: climate.annualPrecipitationMm,
    coordinates: {
      latitude: result.latitude,
      longitude: result.longitude,
    },
    hemisphere: result.latitude >= 0 ? "북반구" : "남반구",
    source: {
      type: "open-meteo-live",
      label: "Open-Meteo API",
      period: API_NORMAL_PERIOD.label,
      geocodingUrl: "https://open-meteo.com/en/docs/geocoding-api",
      weatherUrl: "https://open-meteo.com/en/docs/historical-weather-api",
      apiUrl: climate.apiUrl,
      note: "Open-Meteo Geocoding API와 Historical Weather API(ERA5) 일별 자료를 이용해 월평년값을 계산했습니다.",
    },
  };
}

function buildArchiveApiUrl(location) {
  const url = new URL(API_ARCHIVE_URL);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("start_date", API_NORMAL_PERIOD.start);
  url.searchParams.set("end_date", API_NORMAL_PERIOD.end);
  url.searchParams.set("daily", "temperature_2m_mean,precipitation_sum");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("models", "era5");
  url.searchParams.set("cell_selection", "land");

  if (Number.isFinite(location.elevation)) {
    url.searchParams.set("elevation", String(location.elevation));
  }

  return url;
}

function findExistingRegionForApiResult(result) {
  return state.regions.find((region) => {
    if (!hasCoordinates(region)) {
      return false;
    }

    const sameCountry =
      !result.country || normalizeText(region.country ?? "") === normalizeText(result.country);
    const sameName =
      normalizeText(region.name) === normalizeText(result.name) ||
      normalizeText(region.englishName ?? "") === normalizeText(result.englishName ?? "");
    const closeDistance =
      Math.abs(region.coordinates.latitude - result.latitude) < 0.45 &&
      Math.abs(region.coordinates.longitude - result.longitude) < 0.45;
    const nearlySamePoint =
      Math.abs(region.coordinates.latitude - result.latitude) < 0.15 &&
      Math.abs(region.coordinates.longitude - result.longitude) < 0.15;

    return (sameName && closeDistance) || (sameCountry && nearlySamePoint);
  });
}

function getApiResultKey(result) {
  return result.id ? String(result.id) : `${result.name}-${result.latitude}-${result.longitude}`;
}

function buildFallbackApiRegionId(result) {
  return `api-${normalizeText(result.name).replaceAll(/\s+/g, "-")}-${Math.abs(
    Math.round(result.latitude * 10)
  )}-${Math.abs(Math.round(result.longitude * 10))}`;
}

function loadSavedCustomRegions() {
  try {
    if (!window.localStorage) {
      return [];
    }
    const rawValue = window.localStorage.getItem(CUSTOM_REGIONS_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidPersistedRegion);
  } catch (error) {
    console.warn("Failed to restore custom climate regions:", error);
    return [];
  }
}

function loadSavedStandardizedBaseRegions() {
  try {
    if (!window.localStorage) {
      return [];
    }
    const rawValue = window.localStorage.getItem(STANDARDIZED_BASE_REGIONS_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidPersistedRegion);
  } catch (error) {
    console.warn("Failed to restore standardized base regions:", error);
    return [];
  }
}

function persistCustomRegions() {
  try {
    if (!window.localStorage) {
      return;
    }
    const customRegions = state.regions
      .filter((region) => region.source?.type === "open-meteo-live")
      .filter(isValidPersistedRegion);
    window.localStorage.setItem(CUSTOM_REGIONS_STORAGE_KEY, JSON.stringify(customRegions));
  } catch (error) {
    console.warn("Failed to save custom climate regions:", error);
  }
}

function persistStandardizedBaseRegions() {
  try {
    if (!window.localStorage || !state.dataset?.regions) {
      return;
    }

    const baseRegionMap = new Map(state.dataset.regions.map((region) => [region.id, region]));
    const standardizedBaseRegions = state.regions
      .filter((region) => {
        const baseRegion = baseRegionMap.get(region.id);
        if (!baseRegion) {
          return false;
        }
        return (
          shouldStandardizeBaseRegion(baseRegion) &&
          region.source?.type === "open-meteo" &&
          region.source?.period === API_NORMAL_PERIOD.label
        );
      })
      .filter(isValidPersistedRegion);

    window.localStorage.setItem(
      STANDARDIZED_BASE_REGIONS_STORAGE_KEY,
      JSON.stringify(standardizedBaseRegions)
    );
  } catch (error) {
    console.warn("Failed to save standardized base regions:", error);
  }
}

function mergeRegions(baseRegions, incomingRegions) {
  const merged = new Map(baseRegions.map((region) => [region.id, region]));

  incomingRegions.forEach((region) => {
    if (!isValidPersistedRegion(region)) {
      return;
    }

    merged.set(region.id, region);
  });

  return [...merged.values()];
}

function isValidPersistedRegion(region) {
  return (
    typeof region?.id === "string" &&
    typeof region?.name === "string" &&
    Array.isArray(region?.months) &&
    region.months.length === 12 &&
    Array.isArray(region?.monthlyTemperatureC) &&
    region.monthlyTemperatureC.length === 12 &&
    Array.isArray(region?.monthlyPrecipitationMm) &&
    region.monthlyPrecipitationMm.length === 12 &&
    typeof region?.continent === "string" &&
    typeof region?.climateGroup === "string" &&
    Number.isFinite(region?.annualMeanTemperatureC) &&
    Number.isFinite(region?.annualPrecipitationMm) &&
    hasCoordinates(region)
  );
}

function shouldStandardizeBaseRegion(region) {
  return (
    region?.source?.type !== "open-meteo" ||
    region?.source?.period !== API_NORMAL_PERIOD.label
  );
}

function getPendingBaseStandardizationRegions() {
  if (!state.dataset?.regions) {
    return [];
  }

  const currentRegionMap = new Map(state.regions.map((region) => [region.id, region]));
  return state.dataset.regions
    .map((baseRegion) => currentRegionMap.get(baseRegion.id) ?? baseRegion)
    .filter(shouldStandardizeBaseRegion)
    .filter(hasCoordinates);
}

function createStandardizedBaseRegion(region, climate) {
  return {
    ...region,
    months: climate.months,
    monthlyTemperatureC: climate.monthlyTemperatureC,
    monthlyPrecipitationMm: climate.monthlyPrecipitationMm,
    annualMeanTemperatureC: climate.annualMeanTemperatureC,
    annualPrecipitationMm: climate.annualPrecipitationMm,
    source: {
      type: "open-meteo",
      label: "Open-Meteo Historical Weather API",
      url: "https://open-meteo.com/en/docs/historical-weather-api",
      apiUrl: climate.apiUrl,
      model: "ERA5",
      period: API_NORMAL_PERIOD.label,
      note: "브라우저에서 Open-Meteo Historical Weather API(ERA5) 1991-2020 일별 자료로 기본 지역 통계를 다시 계산했습니다.",
    },
  };
}

async function standardizeBaseDatasetFromApi() {
  if (state.apiLoading || state.apiStandardizing) {
    return;
  }

  const pendingRegions = getPendingBaseStandardizationRegions();
  if (pendingRegions.length === 0) {
    state.apiMessage = "기본 지역 통계가 이미 Open-Meteo 1991-2020 기준으로 맞춰져 있습니다.";
    render();
    return;
  }

  state.apiStandardizing = true;
  state.apiMessage = `기본 지역 ${pendingRegions.length}개를 Open-Meteo 기준으로 다시 계산하는 중입니다...`;
  render();

  let completedCount = 0;
  try {
    for (const region of pendingRegions) {
      state.apiMessage = `기본 데이터 재동기화 중 ${completedCount + 1}/${pendingRegions.length}: ${region.name}`;
      render();

      const climate = await fetchApiClimateNormals({
        latitude: region.coordinates.latitude,
        longitude: region.coordinates.longitude,
        elevation: region.elevationM,
      });
      const standardizedRegion = createStandardizedBaseRegion(region, climate);
      state.regions = mergeRegions(state.regions, [standardizedRegion]).sort(sortRegions);
      persistStandardizedBaseRegions();
      completedCount += 1;
      render();
      await wait(500);
    }

    state.apiMessage = `기본 지역 ${completedCount}개를 Open-Meteo ${API_NORMAL_PERIOD.label} 기준으로 다시 계산했습니다.`;
  } catch (error) {
    state.apiMessage =
      error instanceof Error
        ? `${error.message} 이미 갱신된 지역은 저장됐고, 잠시 후 버튼을 다시 누르면 이어서 진행합니다.`
        : "기본 지역 통계를 다시 계산하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  } finally {
    state.apiStandardizing = false;
    render();
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function renderComparison(selectedRegions) {
  if (selectedRegions.length < 2) {
    return renderEmptyState(
      "비교 그래프는 2개 이상 지역을 선택해야 생성됩니다.",
      "1월과 7월 편차, 월 평균 기온, 누적 강수량 비교는 2개 이상 지역을 선택해야 생성됩니다."
    );
  }

  const sharedChartScale = buildClimateChartScale(selectedRegions);
  const baseline = resolveWorldComparisonBaseline(selectedRegions);

  return `
    <div class="comparison-controls">
      <p>편차 기준을 선택 지역 평균이나 특정 지역으로 바꿔, 각 지역이 어느 기준보다 높고 낮은지 바로 비교할 수 있습니다.</p>
      <label class="comparison-select">
        <span>편차 기준</span>
        <select data-baseline-select aria-label="세계지리 편차 기준">
          <option value="mean" ${baseline.mode === "mean" ? "selected" : ""}>선택 지역 평균</option>
          ${selectedRegions
            .map(
              (region) => `
                <option value="${region.id}" ${baseline.mode === "region" && baseline.region.id === region.id ? "selected" : ""}>
                  ${escapeHtml(region.name)}
                </option>
              `
            )
            .join("")}
        </select>
      </label>
    </div>
    <div class="comparison-grid">
      ${COMPARISON_MONTHS.map((monthIndex, panelIndex) =>
        renderMonthPanel(selectedRegions, monthIndex, panelIndex, baseline)
      ).join("")}
    </div>
    <div class="charts-grid">
      <article class="chart-card world-trend-card">
        <h4>월 평균 기온</h4>
        ${renderMonthlyTemperatureTrendChart(selectedRegions, sharedChartScale)}
        ${renderTrendLegend(selectedRegions, COLORS.temperature)}
        ${renderFootnoteLines(["선택한 지역 전체에 같은 기온 축을 적용했습니다."])}
      </article>
      <article class="chart-card world-trend-card">
        <h4>누적 강수량</h4>
        ${renderCumulativePrecipitationTrendChart(selectedRegions)}
        ${renderTrendLegend(selectedRegions, COLORS.rain)}
        ${renderFootnoteLines([
          "누적 강수량은 1월부터 해당 월까지의 강수량 합입니다.",
          "선택한 지역 전체에 같은 강수 축을 적용했습니다.",
        ])}
      </article>
    </div>
    ${renderExamClimateSourcePanel(selectedRegions)}
  `;
}

function renderExamClimateSourcePanel(selectedRegions) {
  const statements = getExamClimateStatements();
  if (statements.length === 0) {
    return "";
  }

  const monthContext = getExamMonthContext();
  const generatedGroups = buildExamGeneratedComparisonGroups(selectedRegions, statements, monthContext);
  const matchedFeatureGroups = getMatchedExamFeatureGroups(selectedRegions, statements);
  const comparisonCatalog = buildExamComparisonTemplateCatalog(statements, monthContext);
  const multipleChoiceQuestion = buildExamMultipleChoiceQuestion(
    selectedRegions,
    generatedGroups,
    matchedFeatureGroups,
    statements,
    monthContext
  );

  return `
    <article class="exam-source-panel">
      <div class="section-heading compact nested-heading">
        <div>
          <p class="section-kicker">기출 선지 자동화</p>
          <h3>선택 지점에 붙일 수 있는 원문 기반 선지</h3>
        </div>
        <div class="selection-summary is-muted">원문 ${statements.length}개</div>
      </div>
      ${renderExamMultipleChoiceQuestion(multipleChoiceQuestion)}
      <div class="exam-source-grid">
        <section class="exam-source-block">
          <h4>지역 간 비교 선지</h4>
          <p class="exam-source-note">
            같은 의미의 선지는 하나의 카테고리로 묶고, 많다·높다·크다·길다·멀다 쪽을 기본 방향으로 보여줍니다.
          </p>
          ${
            generatedGroups.length > 0
              ? `<div class="exam-generated-list">${generatedGroups
                  .slice(0, 13)
                  .map(renderExamGeneratedGroup)
                  .join("")}</div>`
              : renderExamMiniEmptyState("선택 지점끼리 적용할 수 있는 비교형 표현틀이 아직 없습니다.")
          }
        </section>
        <section class="exam-source-block">
          <h4>지역 특성 원문</h4>
          <p class="exam-source-note">선택 지역명이나 기후 구분과 맞는 기출 선지입니다. 해당 지역을 함께 표시합니다.</p>
          ${
            matchedFeatureGroups.length > 0
              ? `<div class="exam-statement-list">${matchedFeatureGroups
                  .slice(0, 16)
                  .map(renderExamFeatureItem)
                  .join("")}</div>`
              : renderExamMiniEmptyState("선택 지역과 직접 맞는 지역 특성 원문이 없습니다.")
          }
        </section>
      </div>
      <details class="exam-source-details">
        <summary>기출 비교 카테고리 풀 보기</summary>
        <div class="exam-statement-list compact">
          ${comparisonCatalog.map(renderExamComparisonCatalogItem).join("")}
        </div>
      </details>
    </article>
  `;
}

function getExamClimateStatements() {
  if (!Array.isArray(window.EXAM_CLIMATE_STATEMENTS)) {
    return [];
  }

  return window.EXAM_CLIMATE_STATEMENTS.filter((statement) => !statement.source?.includes("해설"));
}

function getExamMonthContext() {
  return buildExamMonthContext(state.examMonthIndex, state.examUseNightLength);
}

function buildExamMonthContext(monthIndex, useNightLength = state.examUseNightLength) {
  const normalizedMonthIndex = normalizeExamMonthIndex(monthIndex);
  const option = EXAM_MONTH_OPTIONS.find((candidate) => candidate.value === normalizedMonthIndex) ?? EXAM_MONTH_OPTIONS[0];
  return {
    monthIndex: option.value,
    monthLabel: option.label,
    dayOfYear: option.dayOfYear,
    useNightLength,
    dayNightLabel: useNightLength ? "밤 길이" : "낮 길이",
  };
}

function normalizeExamMonthIndex(monthIndex) {
  return EXAM_MONTH_OPTIONS.some((option) => option.value === monthIndex) ? monthIndex : EXAM_MONTH_OPTIONS[0].value;
}

function buildExamGeneratedComparisonGroups(selectedRegions, statements, monthContext) {
  const sourceMap = new Map(statements.map((statement) => [statement.id, statement]));
  const groupMap = new Map();

  for (const template of EXAM_COMPARISON_TEMPLATES) {
    const sources = template.sourceIds.map((sourceId) => sourceMap.get(sourceId)).filter(Boolean);
    if (sources.length === 0) {
      continue;
    }

    let group = groupMap.get(template.categoryKey);
    if (!group) {
      group = {
        id: template.categoryKey,
        categoryGroupKey: getExamTemplateCategoryGroupKey(template.categoryKey),
        title: resolveExamTemplateValue(template.title, monthContext),
        pattern: resolveExamTemplateValue(template.pattern, monthContext),
        reversePattern: resolveExamTemplateValue(template.reversePattern, monthContext),
        metricLabel: resolveExamTemplateValue(template.label, monthContext),
        unit: template.unit,
        minDifference: template.minDifference,
        usesMonth: Boolean(template.usesMonth),
        supportsNightToggle: Boolean(template.supportsNightToggle),
        badges: template.badges ?? [],
        renderSuperlativePositive: template.renderSuperlativePositive,
        renderSuperlativeReverse: template.renderSuperlativeReverse,
        monthContext,
        sources: [],
        sourceIds: new Set(),
        examples: [],
        exampleKeys: new Set(),
        regionValues: [],
        regionValueKeys: new Set(),
        maxDifference: 0,
      };
      groupMap.set(template.categoryKey, group);
    }

    sources.forEach((source) => {
      if (!group.sourceIds.has(source.id)) {
        group.sources.push(source);
        group.sourceIds.add(source.id);
      }
    });

    selectedRegions.forEach((region) => {
      if (group.regionValueKeys.has(region.id)) {
        return;
      }
      const value = template.getValue(region, monthContext);
      if (!Number.isFinite(value)) {
        return;
      }
      group.regionValues.push({ region, value });
      group.regionValueKeys.add(region.id);
    });

    for (let leftIndex = 0; leftIndex < selectedRegions.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < selectedRegions.length; rightIndex += 1) {
        const left = selectedRegions[leftIndex];
        const right = selectedRegions[rightIndex];
        const leftValue = template.getValue(left, monthContext);
        const rightValue = template.getValue(right, monthContext);
        if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
          continue;
        }

        const difference = Math.abs(leftValue - rightValue);
        if (difference < template.minDifference) {
          continue;
        }

        const higher = leftValue >= rightValue ? left : right;
        const lower = leftValue >= rightValue ? right : left;
        const exampleKey = `${higher.id}-${lower.id}`;
        if (group.exampleKeys.has(exampleKey)) {
          continue;
        }

        const higherValue = Math.max(leftValue, rightValue);
        const lowerValue = Math.min(leftValue, rightValue);
        group.maxDifference = Math.max(group.maxDifference, difference);
        group.exampleKeys.add(exampleKey);
        group.examples.push({
          id: `${template.categoryKey}-${higher.id}-${lower.id}`,
          categoryKey: template.categoryKey,
          categoryTitle: group.title,
          text: template.renderPositive(higher, lower, monthContext),
          reverseText: template.renderReverse(higher, lower, monthContext),
          falseText: template.renderFalse(higher, lower, monthContext),
          falseReverseText: template.renderPositive(lower, higher, monthContext),
          higherName: higher.name,
          lowerName: lower.name,
          regionNames: [higher.name, lower.name],
          pairKey: buildPairKey(higher.name, lower.name),
          higherValue,
          lowerValue,
          difference,
          source: group.sources[0] ?? null,
        });
      }
    }
  }

  return [...groupMap.values()]
    .filter((group) => group.examples.length > 0)
    .map((group) => ({
      ...group,
      sourceIds: undefined,
      exampleKeys: undefined,
      regionValueKeys: undefined,
      regionValues: group.regionValues.sort((left, right) => right.value - left.value),
      examples: group.examples.sort((left, right) => right.difference - left.difference),
    }))
    .sort((left, right) => right.maxDifference - left.maxDifference);
}

function getMatchedExamFeatureGroups(selectedRegions, statements) {
  const selectedNames = new Set(selectedRegions.map((region) => normalizeText(region.name)));

  return statements
    .filter((statement) => statement.kind === "region-feature")
    .map((statement) => ({
      statement,
      matchingRegions: selectedRegions.filter((region) => doesExamFeatureMatchRegion(statement, region)),
    }))
    .filter((group) => group.matchingRegions.length > 0)
    .sort((left, right) => {
      const leftDirect = (left.statement.regions ?? []).some((regionName) => selectedNames.has(normalizeText(regionName)));
      const rightDirect = (right.statement.regions ?? []).some((regionName) => selectedNames.has(normalizeText(regionName)));
      if (leftDirect !== rightDirect) {
        return leftDirect ? -1 : 1;
      }
      return collator.compare(left.statement.source, right.statement.source);
    });
}

function doesExamFeatureMatchRegion(statement, region) {
  const regionMatches = (statement.regions ?? []).some((regionName) => normalizeText(regionName) === normalizeText(region.name));
  const climateMatches = (statement.climateGroups ?? []).includes(region.climateGroup);
  return regionMatches || climateMatches;
}

function resolveExamTemplateValue(value, monthContext) {
  return typeof value === "function" ? value(monthContext) : value;
}

function buildPairKey(leftName, rightName) {
  return [leftName, rightName].sort((left, right) => collator.compare(left, right)).join("__");
}

function getExamTemplateCategoryGroupKey(categoryKey) {
  return EXAM_DUPLICATE_CATEGORY_GROUPS[categoryKey] ?? categoryKey;
}

function buildExamComparisonTemplateCatalog(statements, monthContext) {
  const sourceMap = new Map(statements.map((statement) => [statement.id, statement]));
  const catalogMap = new Map();

  EXAM_COMPARISON_TEMPLATES.forEach((template) => {
    const sources = template.sourceIds.map((sourceId) => sourceMap.get(sourceId)).filter(Boolean);
    if (sources.length === 0) {
      return;
    }

    const item = catalogMap.get(template.categoryKey) ?? {
      id: template.categoryKey,
      title: resolveExamTemplateValue(template.title, monthContext),
      pattern: resolveExamTemplateValue(template.pattern, monthContext),
      reversePattern: resolveExamTemplateValue(template.reversePattern, monthContext),
      metricLabel: resolveExamTemplateValue(template.label, monthContext),
      badges: template.badges ?? [],
      sources: [],
      sourceIds: new Set(),
    };

    sources.forEach((source) => {
      if (!item.sourceIds.has(source.id)) {
        item.sources.push(source);
        item.sourceIds.add(source.id);
      }
    });

    catalogMap.set(item.id, item);
  });

  return [...catalogMap.values()]
    .map((item) => ({ ...item, sourceIds: undefined }))
    .sort((left, right) => collator.compare(left.metricLabel, right.metricLabel));
}

function buildExamMultipleChoiceQuestion(selectedRegions, comparisonGroups, featureGroups, statements, monthContext) {
  if (selectedRegions.length < 2) {
    return null;
  }

  const seed = buildExamQuestionSeed(selectedRegions, monthContext);
  const questionComparisonGroups = buildExamQuestionComparisonGroups(selectedRegions, statements, monthContext);
  const discriminatingFeatureGroups = featureGroups.filter((group) =>
    isExamFeatureDiscriminatingForSelection(group.statement, selectedRegions)
  );
  const trueCandidates = [
    ...questionComparisonGroups.flatMap((group, groupIndex) =>
      group.examples.map((example, exampleIndex) =>
        buildComparisonChoiceCandidate(group, example, true, seed + groupIndex * 101 + exampleIndex)
      )
    ),
    ...buildSuperlativeChoiceCandidates(questionComparisonGroups, selectedRegions, monthContext, true, seed + 5009),
    ...discriminatingFeatureGroups.flatMap((group, groupIndex) =>
      group.matchingRegions.map((region, regionIndex) =>
        buildFeatureChoiceCandidate(group.statement, region, true, seed + groupIndex * 307 + regionIndex)
      )
    ),
  ];
  const falseCandidates = [
    ...questionComparisonGroups.flatMap((group, groupIndex) =>
      group.examples.map((example, exampleIndex) =>
        buildComparisonChoiceCandidate(group, example, false, seed + groupIndex * 149 + exampleIndex + 9001)
      )
    ),
    ...buildSuperlativeChoiceCandidates(questionComparisonGroups, selectedRegions, monthContext, false, seed + 8009),
    ...buildFalseFeatureChoiceCandidates(selectedRegions, statements, seed + 11003),
  ];

  if (trueCandidates.length === 0 || falseCandidates.length < 4) {
    return null;
  }

  const hasSuperlativeCandidates = [...trueCandidates, ...falseCandidates].some(
    (candidate) => candidate.kind === "superlative"
  );
  const shouldUseSuperlativeSlot = hasSuperlativeCandidates && state.examQuestionSeed % 3 === 0;
  const preferredTrueKind =
    shouldUseSuperlativeSlot && state.examQuestionSeed % 6 === 0
      ? "superlative"
      : seed % 2 === 0
        ? "comparison"
        : "feature";
  const shuffledTrueCandidates = seededShuffle(trueCandidates, seed);
  const trueChoice =
    shuffledTrueCandidates.find((candidate) => candidate.kind === preferredTrueKind) ?? shuffledTrueCandidates[0];
  const selectedChoices = [trueChoice];
  const tracker = createExamChoiceTracker();
  rememberExamChoice(tracker, trueChoice);

  const desiredKinds =
    trueChoice.kind === "comparison"
      ? shouldUseSuperlativeSlot
        ? ["feature", "superlative", "feature", "comparison"]
        : ["feature", "comparison", "feature", "comparison"]
      : trueChoice.kind === "feature"
        ? shouldUseSuperlativeSlot
          ? ["comparison", "feature", "superlative", "comparison"]
          : ["comparison", "feature", "comparison", "feature"]
        : ["comparison", "feature", "comparison", "feature"];
  const shuffledFalseCandidates = seededShuffle(falseCandidates, seed + 17);
  const regularFalseCandidates = shuffledFalseCandidates.filter((candidate) => candidate.kind !== "superlative");
  const superlativeFalseCandidates = shuffledFalseCandidates.filter((candidate) => candidate.kind === "superlative");

  desiredKinds.forEach((kind) => {
    if (selectedChoices.length >= 5) {
      return;
    }
    const candidate = shuffledFalseCandidates.find(
      (item) => item.kind === kind && canUseExamChoice(item, tracker, true)
    );
    if (candidate) {
      selectedChoices.push(candidate);
      rememberExamChoice(tracker, candidate);
    }
  });

  regularFalseCandidates.forEach((candidate) => {
    if (selectedChoices.length >= 5 || !canUseExamChoice(candidate, tracker, true)) {
      return;
    }
    selectedChoices.push(candidate);
    rememberExamChoice(tracker, candidate);
  });

  regularFalseCandidates.forEach((candidate) => {
    if (selectedChoices.length >= 5 || !canUseExamChoice(candidate, tracker, false)) {
      return;
    }
    selectedChoices.push(candidate);
    rememberExamChoice(tracker, candidate);
  });

  superlativeFalseCandidates.forEach((candidate) => {
    if (selectedChoices.length >= 5 || !canUseExamChoice(candidate, tracker, false)) {
      return;
    }
    selectedChoices.push(candidate);
    rememberExamChoice(tracker, candidate);
  });

  if (selectedChoices.length < 5) {
    return null;
  }

  const variableRegions = orderExamRegionsForVariables(selectedRegions);
  const variables = buildExamVariableLabels(variableRegions);
  const choices = orderExamChoices(selectedChoices, seed + 31, variables);
  const answerIndex = choices.findIndex((choice) => choice.isTrue);

  return {
    prompt: `다음 중 옳은 설명은? (월별 선지는 1월·7월 중 자동 조합, ${monthContext.dayNightLabel} 전환값 반영)`,
    choices,
    answerIndex,
    mapRegions: variableRegions.filter(hasCoordinates),
    variables,
  };
}

function orderExamRegionsForVariables(selectedRegions) {
  const projection = buildMapProjection();
  return [...selectedRegions]
    .map((region, index) => ({
      region,
      index,
      mapLeft: getExamRegionMapLeft(region, projection),
      latitude: Number.isFinite(region.coordinates?.latitude)
        ? region.coordinates.latitude
        : Number.NEGATIVE_INFINITY,
    }))
    .sort((left, right) => {
      const latitudeDifference = Math.abs(left.latitude - right.latitude);
      if (latitudeDifference >= EXAM_LATITUDE_VARIABLE_PRIORITY_DIFFERENCE) {
        return right.latitude - left.latitude;
      }
      if (left.mapLeft !== right.mapLeft) {
        return left.mapLeft - right.mapLeft;
      }
      return left.index - right.index;
    })
    .map((item) => item.region);
}

function getExamRegionMapLeft(region, projection) {
  if (!hasCoordinates(region)) {
    return Number.POSITIVE_INFINITY;
  }

  const position = projectCoordinateToPercent(region.coordinates, projection);
  if (Number.isFinite(position.left)) {
    return position.left;
  }

  return region.coordinates.longitude;
}

function buildExamVariableLabels(regions) {
  return regions.map((region, index) => ({
    regionId: region.id,
    regionName: region.name,
    label: EXAM_VARIABLE_LABELS[index] ?? `R${index + 1}`,
  }));
}

function buildExamQuestionComparisonGroups(selectedRegions, statements, monthContext) {
  const baseGroups = comparisonGroupsWithQuestionContext(
    buildExamGeneratedComparisonGroups(selectedRegions, statements, monthContext),
    monthContext
  );
  const nonMonthlyGroups = baseGroups.filter((group) => !group.usesMonth);
  const monthlyGroups = EXAM_MONTH_OPTIONS.flatMap((option) => {
    const optionContext = buildExamMonthContext(option.value, monthContext.useNightLength);
    return comparisonGroupsWithQuestionContext(
      buildExamGeneratedComparisonGroups(selectedRegions, statements, optionContext),
      optionContext
    ).filter((group) => group.usesMonth);
  });

  return [...nonMonthlyGroups, ...monthlyGroups];
}

function comparisonGroupsWithQuestionContext(groups, monthContext) {
  return groups.map((group) => ({ ...group, monthContext }));
}

function buildComparisonChoiceCandidate(group, example, isTrue, seed) {
  const usePositiveDirection = shouldUsePositiveExamDirection(seed, group.id, example.id, isTrue);
  const higherValue = formatExamMetricValue(example.higherValue, group.unit);
  const lowerValue = formatExamMetricValue(example.lowerValue, group.unit);
  const difference = formatExamMetricValue(example.difference, group.unit);
  return {
    kind: "comparison",
    categoryKey: group.id,
    categoryGroupKey: group.categoryGroupKey ?? group.id,
    categoryTitle: group.title,
    text: usePositiveDirection
      ? isTrue
        ? example.text
        : example.falseReverseText
      : isTrue
        ? example.reverseText
        : example.falseText,
    isTrue,
    regionNames: example.regionNames,
    pairKey: example.pairKey,
    source: example.source,
    badges: group.badges ?? [],
    explanation: `${group.title}: ${example.higherName} ${higherValue}, ${example.lowerName} ${lowerValue}`,
    evidence: {
      title: "실제 데이터",
      rows: [
        { label: example.higherName, value: higherValue },
        { label: example.lowerName, value: lowerValue },
        { label: "차이", value: difference },
      ],
      summary: `${example.higherName}이 ${example.lowerName}보다 ${group.metricLabel} 값이 큽니다.`,
    },
  };
}

function buildSuperlativeChoiceCandidates(comparisonGroups, selectedRegions, monthContext, isTrue, seed) {
  if (selectedRegions.length < 4) {
    return [];
  }

  return comparisonGroups
    .filter(
      (group) =>
        typeof group.renderSuperlativePositive === "function" &&
        typeof group.renderSuperlativeReverse === "function" &&
        (group.regionValues ?? []).length >= 4
    )
    .map((group, index) =>
      buildSuperlativeChoiceCandidate(group, group.monthContext ?? monthContext, isTrue, seed + index * 409)
    )
    .filter(Boolean);
}

function buildSuperlativeChoiceCandidate(group, monthContext, isTrue, seed) {
  const usePositiveDirection = shouldUsePositiveExamDirection(seed, group.id, "superlative", isTrue);
  const rankedValues = [...(group.regionValues ?? [])].sort((left, right) =>
    usePositiveDirection ? right.value - left.value : left.value - right.value
  );
  const correctEntry = rankedValues[0];
  const wrongEntry = rankedValues.find(
    (entry, index) => index > 0 && Math.abs(entry.value - correctEntry.value) >= group.minDifference
  ) ?? rankedValues[rankedValues.length - 1];
  const selectedEntry = isTrue ? correctEntry : wrongEntry;
  if (!correctEntry || !selectedEntry || (!isTrue && selectedEntry.region.id === correctEntry.region.id)) {
    return null;
  }

  const renderSuperlative = usePositiveDirection ? group.renderSuperlativePositive : group.renderSuperlativeReverse;
  const scopeLabel = getExamSuperlativeScopeLabel(rankedValues);
  const correctDirectionLabel = usePositiveDirection ? "최댓값" : "최솟값";
  const correctValue = formatExamMetricValue(correctEntry.value, group.unit);
  return {
    kind: "superlative",
    categoryKey: group.id,
    categoryGroupKey: group.categoryGroupKey ?? group.id,
    categoryTitle: getExamSuperlativeTitle(group),
    text: renderSuperlative(selectedEntry.region, monthContext, scopeLabel),
    isTrue,
    regionNames: rankedValues.map((entry) => entry.region.name),
    pairKey: "",
    source: group.sources[0] ?? null,
    badges: group.badges ?? [],
    explanation: `${group.title}: ${correctEntry.region.name} ${correctValue} (${scopeLabel} 중 ${correctDirectionLabel})`,
    evidence: {
      title: "실제 데이터",
      rows: rankedValues.map((entry) => ({
        label: entry.region.name,
        value: formatExamMetricValue(entry.value, group.unit),
      })),
      summary: `${correctEntry.region.name}이 ${scopeLabel} 중 ${correctDirectionLabel}입니다.`,
    },
  };
}

function getExamSuperlativeScopeLabel(regionValues) {
  return regionValues.length === 4 ? "네 지역" : "선택 지역";
}

function getExamSuperlativeTitle(group) {
  return group.title.endsWith(" 비교") ? group.title.replace(/ 비교$/, " 최상급") : `${group.title} 최상급`;
}

function buildFeatureChoiceCandidate(statement, region, isTrue, seed = 0) {
  const regionLabel = getExamFeatureRegionLabel(statement, region);
  return {
    kind: "feature",
    categoryKey: statement.id,
    categoryTitle: getExamFeatureTitle(statement),
    text: materializeExamFeatureStatementText(statement, regionLabel, region, isTrue, seed),
    isTrue,
    regionNames: [region.name],
    pairKey: "",
    source: statement,
    badges: [],
    explanation: `${region.name}: ${getExamFeatureTitle(statement)}`,
    evidence: buildFeatureChoiceEvidence(statement, region, isTrue),
  };
}

function buildFeatureChoiceEvidence(statement, region, isTrue) {
  const rows = [
    { label: region.name, value: `기후 ${region.climateCode || region.climateGroup}` },
    Number.isFinite(region.annualMeanTemperatureC)
      ? { label: "연평균 기온", value: formatTemp(region.annualMeanTemperatureC) }
      : null,
    Number.isFinite(region.annualPrecipitationMm)
      ? { label: "연 강수량", value: formatMm(region.annualPrecipitationMm) }
      : null,
    Number.isFinite(region.elevationM) ? { label: "해발", value: formatMeters(region.elevationM) } : null,
  ].filter(Boolean);

  return {
    title: "지역 데이터",
    rows,
    summary: isTrue
      ? `${region.name}은 기출 원문 조건에 해당합니다.`
      : `${region.name}은 기출 원문 조건에 해당하지 않습니다.`,
  };
}

function getExamFeatureRegionLabel(statement, region) {
  return region.name;
}

function buildFalseFeatureChoiceCandidates(selectedRegions, statements, seed = 0) {
  return statements
    .filter((statement) => statement.kind === "region-feature")
    .filter((statement) => (statement.regions ?? []).length > 0 || (statement.climateGroups ?? []).length > 0)
    .filter((statement) => isExamFeatureDiscriminatingForSelection(statement, selectedRegions))
    .flatMap((statement, statementIndex) =>
      selectedRegions
        .filter((region) => !doesExamFeatureMatchRegion(statement, region))
        .filter((region) => isPlausibleFalseFeatureChoice(statement, region))
        .map((region, regionIndex) =>
          buildFeatureChoiceCandidate(statement, region, false, seed + statementIndex * 503 + regionIndex)
        )
    );
}

function isExamFeatureDiscriminatingForSelection(statement, selectedRegions) {
  const matchCount = selectedRegions.filter((region) => doesExamFeatureMatchRegion(statement, region)).length;
  return matchCount > 0 && matchCount < selectedRegions.length;
}

function isPlausibleFalseFeatureChoice(statement, region) {
  const statementGroups = statement.climateGroups ?? [];
  if (statementGroups.length === 0 || !region.climateGroup || isSpecificExamFeatureStatement(statement)) {
    return false;
  }

  const targetFamilies = new Set(statementGroups.map(getExamClimateFamily));
  return targetFamilies.has(getExamClimateFamily(region.climateGroup));
}

function isSpecificExamFeatureStatement(statement) {
  const specificTags = new Set([
    "경엽수림",
    "수목 농업",
    "올리브",
    "오렌지",
    "커피",
    "카카오",
    "플랜테이션",
    "대추야자",
    "오아시스",
    "외래 하천",
    "고상 가옥",
    "순록 유목",
    "수렵",
    "타이가",
    "침엽수림대",
  ]);
  return (statement.tags ?? []).some((tag) => specificTags.has(tag));
}

function getExamClimateFamily(climateGroup) {
  if (["Af", "Am", "Aw"].includes(climateGroup)) return "tropical";
  if (["BS", "Bw"].includes(climateGroup)) return "dry";
  if (["Cfa", "Cfb", "Cs", "Cw"].includes(climateGroup)) return "temperate";
  if (["Df", "Dw"].includes(climateGroup)) return "cold";
  if (["ET", "EF"].includes(climateGroup)) return "polar";
  return climateGroup;
}

function createExamChoiceTracker() {
  return {
    texts: new Set(),
    comparisonPairs: new Set(),
    featureRegions: new Set(),
    categories: new Set(),
    featureCount: 0,
    superlativeCount: 0,
  };
}

function canUseExamChoice(candidate, tracker, strict) {
  if (tracker.texts.has(candidate.text)) {
    return false;
  }
  if (candidate.kind === "feature" && tracker.featureCount >= 2) {
    return false;
  }
  if (candidate.kind === "superlative" && tracker.superlativeCount >= 1) {
    return false;
  }
  if (tracker.categories.has(getExamChoiceCategoryIdentity(candidate))) {
    return false;
  }
  if (!strict) {
    return true;
  }
  if (candidate.kind === "comparison" && tracker.comparisonPairs.has(candidate.pairKey)) {
    return false;
  }
  if (candidate.kind === "feature" && candidate.regionNames.some((name) => tracker.featureRegions.has(name))) {
    return false;
  }
  return true;
}

function rememberExamChoice(tracker, candidate) {
  tracker.texts.add(candidate.text);
  tracker.categories.add(getExamChoiceCategoryIdentity(candidate));
  if (candidate.kind === "comparison") {
    tracker.comparisonPairs.add(candidate.pairKey);
  }
  if (candidate.kind === "feature") {
    tracker.featureCount += 1;
    candidate.regionNames.forEach((name) => tracker.featureRegions.add(name));
  }
  if (candidate.kind === "superlative") {
    tracker.superlativeCount += 1;
  }
}

function getExamChoiceCategoryIdentity(candidate) {
  if (candidate.categoryGroupKey) {
    return candidate.categoryGroupKey;
  }
  return candidate.kind === "feature" ? candidate.categoryTitle : candidate.categoryKey;
}

function orderExamChoices(choices, seed, variables = []) {
  return seededShuffle(choices, seed)
    .map((choice, index) => ({ choice, index }))
    .sort((left, right) => {
      const regionCountDifference = getExamChoiceRegionCount(left.choice) - getExamChoiceRegionCount(right.choice);
      if (regionCountDifference !== 0) {
        return regionCountDifference;
      }
      const variableOrderDifference = compareExamChoiceVariableOrder(left.choice, right.choice, variables);
      if (variableOrderDifference !== 0) {
        return variableOrderDifference;
      }
      return left.index - right.index;
    })
    .map((item) => item.choice);
}

function getExamChoiceRegionCount(choice) {
  return new Set(choice.regionNames).size;
}

function compareExamChoiceVariableOrder(leftChoice, rightChoice, variables) {
  const leftOrder = getExamChoiceVariableOrder(leftChoice, variables);
  const rightOrder = getExamChoiceVariableOrder(rightChoice, variables);
  const maxLength = Math.max(leftOrder.length, rightOrder.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftRank = leftOrder[index] ?? Number.POSITIVE_INFINITY;
    const rightRank = rightOrder[index] ?? Number.POSITIVE_INFINITY;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
  }

  return 0;
}

function getExamChoiceVariableOrder(choice, variables) {
  const variableRanks = new Map(variables.map((variable, index) => [variable.regionName, index]));
  const seenRanks = new Set();
  const textRanks = variables
    .map((variable, index) => ({
      index,
      textIndex: choice.text.indexOf(variable.regionName),
    }))
    .filter((item) => item.textIndex >= 0)
    .sort((left, right) => left.textIndex - right.textIndex)
    .map((item) => item.index);
  const fallbackRanks = (choice.regionNames ?? [])
    .map((name) => variableRanks.get(name))
    .filter((rank) => typeof rank === "number");

  return [...textRanks, ...fallbackRanks].filter((rank) => {
    if (seenRanks.has(rank)) {
      return false;
    }
    seenRanks.add(rank);
    return true;
  });
}

function buildExamQuestionSeed(selectedRegions, monthContext) {
  const reverseKeys = [...state.examReversedCategoryKeys].sort().join(",");
  const key = `${state.examQuestionSeed}|${monthContext.monthIndex}|${monthContext.useNightLength}|${reverseKeys}|${selectedRegions
    .map((region) => region.id)
    .join("|")}`;
  return hashStringToPositiveInteger(key);
}

function shouldUsePositiveExamDirection(seed, ...parts) {
  const bucket = hashStringToPositiveInteger([seed, ...parts].join("|")) % 1000;
  return bucket / 1000 < EXAM_POSITIVE_DIRECTION_WEIGHT;
}

function seededShuffle(items, seed) {
  const shuffled = [...items];
  let stateValue = seed || 1;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    stateValue = (stateValue * 1664525 + 1013904223) % 4294967296;
    const swapIndex = stateValue % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function hashStringToPositiveInteger(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function renderExamMultipleChoiceQuestion(question) {
  if (!question) {
    return `
      <section class="exam-question-card">
        <div class="exam-question-head">
          <h4>5지선다 자동 조합</h4>
          <div class="exam-question-actions">
            <label class="exam-toggle-option">
              <input type="checkbox" data-exam-variable-toggle ${state.examUseVariableLabels ? "checked" : ""} />
              <span>지역명 변수 처리</span>
            </label>
            <button type="button" class="ghost-button" data-exam-question-refresh>다른 조합</button>
            <button type="button" class="ghost-button" data-exam-region-random>지역 랜덤 조합</button>
          </div>
        </div>
        ${renderExamMiniEmptyState("참 1개와 거짓 4개를 만들 후보가 아직 부족합니다. 서로 다른 기후 지역을 3개 이상 선택하면 조합이 안정적입니다.")}
      </section>
    `;
  }

  return `
    <section class="exam-question-card">
      <div class="exam-question-head">
        <div>
          <h4>5지선다 자동 조합</h4>
          <p>${escapeHtml(question.prompt)}</p>
        </div>
        <div class="exam-question-actions">
          <label class="exam-toggle-option">
            <input type="checkbox" data-exam-variable-toggle ${state.examUseVariableLabels ? "checked" : ""} />
            <span>지역명 변수 처리</span>
          </label>
          <button type="button" class="ghost-button" data-exam-question-refresh>다른 조합</button>
          <button type="button" class="ghost-button" data-exam-region-random>지역 랜덤 조합</button>
        </div>
      </div>
      ${renderExamQuestionMap(question)}
      <ol class="exam-choice-list">
        ${question.choices
          .map(
            (choice, index) => `
              <li>
                <span>${escapeHtml(getChoiceMarker(index))}</span>
                <p>
                  <span class="exam-choice-line">
                    <span class="exam-choice-text">${escapeHtml(formatExamQuestionText(choice.text, question.variables))}</span>
                    ${renderExamTruthBadge(choice)}
                  </span>
                  ${renderExamBadgeSet(choice.badges)}
                </p>
              </li>
            `
          )
          .join("")}
      </ol>
      <details class="exam-answer-details">
        <summary>정답 보기</summary>
        <div class="exam-answer-box">
          <strong>정답 ${escapeHtml(getChoiceMarker(question.answerIndex))}</strong>
          <p>${escapeHtml(formatExamQuestionText(question.choices[question.answerIndex].explanation, question.variables))}</p>
          <div class="exam-answer-choice-list">
            ${question.choices.map((choice, index) => renderExamAnswerChoice(choice, index, question.variables)).join("")}
          </div>
        </div>
      </details>
    </section>
  `;
}

function renderExamAnswerChoice(choice, index, variables) {
  return `
    <article class="exam-answer-choice">
      <div class="exam-answer-choice-head">
        <strong>${escapeHtml(getChoiceMarker(index))} ${choice.isTrue ? "정답" : "오답"} · ${escapeHtml(
          choice.categoryTitle
        )}</strong>
        ${renderExamTruthBadge(choice)}
      </div>
      <p class="exam-answer-choice-text">${escapeHtml(formatExamQuestionText(choice.text, variables))}</p>
      <p>${escapeHtml(formatExamQuestionText(choice.explanation, variables))}</p>
      ${renderExamChoiceEvidence(choice, variables)}
    </article>
  `;
}

function renderExamChoiceEvidence(choice, variables) {
  const evidence = choice.evidence;
  if (!evidence || !Array.isArray(evidence.rows) || evidence.rows.length === 0) {
    return "";
  }

  return `
    <div class="exam-answer-evidence">
      <strong>${escapeHtml(evidence.title ?? "실제 데이터")}</strong>
      <dl>
        ${evidence.rows
          .map(
            (row) => `
              <div>
                <dt>${escapeHtml(formatExamQuestionText(row.label, variables))}</dt>
                <dd>${escapeHtml(formatExamQuestionText(row.value, variables))}</dd>
              </div>
            `
          )
          .join("")}
      </dl>
      ${evidence.summary ? `<p>${escapeHtml(formatExamQuestionText(evidence.summary, variables))}</p>` : ""}
    </div>
  `;
}

function renderExamQuestionMap(question) {
  const regions = (question.mapRegions ?? []).filter(hasCoordinates);
  const projection = buildMapProjection();

  if (regions.length === 0 || !projection) {
    return "";
  }

  return `
    <div class="exam-question-map">
      <div class="exam-question-map-frame" aria-label="선택 지역 지도">
        ${renderProjectedWorldMapBackground(projection)}
        <div class="exam-question-map-markers">
          ${regions.map((region) => renderExamQuestionMapMarker(region, projection, question.variables)).join("")}
        </div>
      </div>
      <div class="exam-question-map-legend">
        ${regions.map((region) => renderExamQuestionMapLegendItem(region, question.variables)).join("")}
      </div>
    </div>
  `;
}

function renderExamQuestionMapMarker(region, projection, variables) {
  const position = projectCoordinateToPercent(region.coordinates, projection);
  const markerColor = getClimateColor(region.climateGroup);
  const markerLabel = getExamQuestionMapLabel(region, variables);
  const title = [
    markerLabel,
    state.examUseVariableLabels ? region.name : "",
    region.climateGroup,
    formatCoordinatePair(region.coordinates),
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <span
      class="exam-map-marker"
      title="${escapeHtml(title)}"
      style="
        left: ${position.left.toFixed(3)}%;
        top: ${position.top.toFixed(3)}%;
        --marker-color: ${markerColor};
      "
    >
      <span>${escapeHtml(markerLabel)}</span>
    </span>
  `;
}

function renderExamQuestionMapLegendItem(region, variables) {
  const label = getExamQuestionMapLabel(region, variables);
  const showVariable = state.examUseVariableLabels && label !== region.name;
  return `
    <span>
      ${showVariable ? `<b>${escapeHtml(label)}</b>` : ""}
      ${escapeHtml(region.name)}
    </span>
  `;
}

function getExamQuestionMapLabel(region, variables) {
  if (!state.examUseVariableLabels) {
    return region.name;
  }

  return variables?.find((item) => item.regionId === region.id)?.label ?? region.name;
}

function formatExamQuestionText(text, variables) {
  if (!state.examUseVariableLabels || !Array.isArray(variables) || variables.length === 0) {
    return text;
  }

  const orderedVariables = [...variables]
    .filter((item) => item.regionName && item.label)
    .sort((left, right) => right.regionName.length - left.regionName.length);
  let result = String(text);
  orderedVariables.forEach((item) => {
    result = result.split(item.regionName).join(item.label);
  });

  const labelPattern = orderedVariables.map((item) => escapeRegExp(item.label)).join("|");
  if (!labelPattern) {
    return result;
  }

  return result.replace(new RegExp(`(${labelPattern})(은|이|을|과)`, "g"), (match, label, particle) => {
    const particleMap = {
      은: "는",
      이: "가",
      을: "를",
      과: "와",
    };
    return `${label}${particleMap[particle] ?? particle}`;
  });
}

function getChoiceMarker(index) {
  return ["①", "②", "③", "④", "⑤"][index] ?? `${index + 1}.`;
}

function renderExamTruthBadge(choice) {
  const label = choice.isTrue ? "정답" : "오답";
  const className = choice.isTrue ? "is-true" : "is-false";
  return `<span class="exam-truth-badge ${className}">${label}</span>`;
}

function renderExamBadgeSet(badges) {
  const visibleBadges = [...new Set(badges ?? [])].filter(Boolean);
  if (visibleBadges.length === 0) {
    return "";
  }
  return ` <span class="exam-auto-badges">${visibleBadges
    .map((badge) => `<span class="exam-auto-badge">${escapeHtml(badge)}</span>`)
    .join("")}</span>`;
}

function renderExamGeneratedGroup(group) {
  const examplePreview = group.examples.slice(0, 4);
  const isReversed = state.examReversedCategoryKeys.has(group.id);
  const activePattern = isReversed ? group.reversePattern : group.pattern;
  const directionLabel = isReversed ? "반대 방향" : "기본 방향";
  return `
    <article class="exam-generated-item">
      <div class="exam-category-heading">
        <p><span>${escapeHtml(group.title)}</span>${renderExamBadgeSet(group.badges)}</p>
        <strong>${escapeHtml(activePattern)} · ${directionLabel}</strong>
      </div>
      ${renderExamGroupTransformControls(group, isReversed)}
      <div class="exam-generated-meta">
        <span>기출 선지 ${group.sources.length}개</span>
        <span>${escapeHtml(group.sources.map((source) => source.source).join(" · "))}</span>
        <span>적용 가능 ${group.examples.length}개 조합</span>
        <span>최대 차이 ${escapeHtml(formatExamMetricValue(group.maxDifference, group.unit))}</span>
      </div>
      <div class="exam-example-list">
        ${examplePreview
          .map(
            (example) => `
              <div class="exam-example-row">
                <span>${escapeHtml(isReversed ? example.reverseText : example.text)}</span>
                <small>${escapeHtml(isReversed ? example.lowerName : example.higherName)} ${escapeHtml(
                  formatExamMetricValue(isReversed ? example.lowerValue : example.higherValue, group.unit)
                )} / ${escapeHtml(isReversed ? example.higherName : example.lowerName)} ${escapeHtml(
                  formatExamMetricValue(isReversed ? example.higherValue : example.lowerValue, group.unit)
                )} · 차이 ${escapeHtml(formatExamMetricValue(example.difference, group.unit))}</small>
              </div>
            `
          )
          .join("")}
      </div>
    </article>
  `;
}

function renderExamGroupTransformControls(group, isReversed) {
  const controls = [];
  if (group.usesMonth) {
    controls.push(`
      <label class="exam-toggle-option">
        <input type="checkbox" data-exam-month-toggle ${state.examMonthIndex === 6 ? "checked" : ""} />
        <span>7월 기준</span>
      </label>
    `);
  }
  if (group.supportsNightToggle) {
    controls.push(`
      <label class="exam-toggle-option">
        <input type="checkbox" data-exam-night-toggle ${state.examUseNightLength ? "checked" : ""} />
        <span>밤 길이 기준</span>
      </label>
    `);
  }
  controls.push(`
    <label class="exam-toggle-option">
      <input type="checkbox" data-exam-reverse-toggle="${escapeHtml(group.id)}" ${isReversed ? "checked" : ""} />
      <span>반대 방향</span>
    </label>
  `);

  return `<div class="exam-transform-controls">${controls.join("")}</div>`;
}

function renderExamFeatureItem(group) {
  const { statement, matchingRegions } = group;
  const tags = [...(statement.climateGroups ?? []), ...(statement.tags ?? [])];
  const normalizedText = normalizeExamFeatureStatementText(statement.text, getExamStatementPeriodLabels(statement));
  return `
    <article class="exam-statement-item">
      <div class="exam-category-heading">
        <p>${escapeHtml(getExamFeatureTitle(statement))}</p>
        <strong>${escapeHtml(normalizedText)}</strong>
      </div>
      <div class="exam-generated-meta">
        <span>${escapeHtml(statement.source)}</span>
        ${tags.slice(0, 5).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="exam-region-pills">
        <strong>해당 지역</strong>
        ${matchingRegions
          .slice(0, 10)
          .map((region) => `<span>${escapeHtml(region.name)}</span>`)
          .join("")}
      </div>
    </article>
  `;
}

function renderExamComparisonCatalogItem(item) {
  return `
    <article class="exam-statement-item">
      <div class="exam-category-heading">
        <p><span>${escapeHtml(item.title)}</span>${renderExamBadgeSet(item.badges)}</p>
        <strong>${escapeHtml(item.pattern)}</strong>
      </div>
      <div class="exam-generated-meta">
        <span>${escapeHtml(item.metricLabel)}</span>
        <span>반대: ${escapeHtml(item.reversePattern)}</span>
        <span>기출 선지 ${item.sources.length}개</span>
      </div>
      <div class="exam-generated-meta">
        ${item.sources.map((source) => `<span>${escapeHtml(source.source)}</span>`).join("")}
      </div>
    </article>
  `;
}

function renderExamMiniEmptyState(message) {
  return `<div class="exam-mini-empty">${escapeHtml(message)}</div>`;
}

function getExamFeatureTitle(statement) {
  const tags = new Set([...(statement.tags ?? []), ...(statement.climateGroups ?? [])]);
  if (tags.has("일교차") && tags.has("연교차")) return "일교차와 연교차 비교";
  if (tags.has("타이가") || tags.has("침엽수림대")) return "타이가 분포";
  if (tags.has("수목 농업") || tags.has("올리브") || tags.has("오렌지")) return "수목 농업";
  if (tags.has("경엽수림")) return "경엽수림 분포";
  if (tags.has("스콜")) return "스콜 발생";
  if (tags.has("대류성 강수") || tags.has("대류성 강수일수")) return "대류성 강수";
  if (tags.has("초원") || tags.has("사바나")) return "사바나 초원";
  if (tags.has("적도 수렴대")) return "적도 수렴대 영향";
  if (tags.has("아열대 고압대") || tags.has("건기")) return "아열대 고압대와 건기";
  if (tags.has("최한월 평균 기온")) return "최한월 평균 기온 조건";
  if (tags.has("커피") || tags.has("카카오") || tags.has("플랜테이션")) return "플랜테이션 농업";
  if (tags.has("대추야자") || tags.has("오아시스") || tags.has("외래 하천")) return "건조 지역 농업";
  if (tags.has("고상 가옥")) return "고상 가옥";
  if (tags.has("순록 유목") || tags.has("수렵")) return "순록 유목과 수렵";
  if (tags.has("한류")) return "한류 영향";
  if (tags.has("남동 무역풍") || tags.has("무역풍")) return "무역풍 영향";
  return (statement.tags ?? [])[0] ? `${statement.tags[0]} 특성` : "지역 특성";
}

function normalizeExamFeatureStatementText(text, periodLabels = {}) {
  return text
    .replace(/[A-D]\s*～\s*[A-D]\s*중/g, "선택 지역 중")
    .replace(/[A-D]\s*와\s*[A-D]\s*에는/g, "해당 지역들에는")
    .replace(/[A-D]\s*와\s*[A-D]\s*는/g, "해당 지역들은")
    .replace(/[A-D]\s*와\s*[A-D]\s*에서는/g, "해당 지역들에서는")
    .replace(/[A-D]\s*주변에서는/g, "해당 지역 주변에서는")
    .replace(/[A-D]\s*에서는/g, "해당 지역에서는")
    .replace(/[A-D]\s*는/g, "해당 지역은")
    .replace(/[A-D]\s*의/g, "해당 지역의")
    .replace(/[A-D]\s*보다/g, "다른 지역보다")
    .replace(/\(([가-라])\)\s*에서는/g, "해당 지역에서는")
    .replace(/\(([가-라])\)\s*는/g, "해당 지역은")
    .replace(/\(([가-라])\)\s*의/g, "해당 지역의")
    .replace(/\(([가-라])\)\s*시기에\s*/g, (_, periodKey) =>
      periodLabels[periodKey] ? `${periodLabels[periodKey]}에 ` : "해당 시기에 "
    )
    .replace(/\([가-라]\)\s*/g, "");
}

function materializeExamFeatureStatementText(statement, regionName, region, isTrue, seed = 0) {
  const periodLabels = getExamFeaturePeriodLabels(statement, region, isTrue, seed);
  return normalizeExamFeatureStatementText(statement.text, periodLabels)
    .replace(/^에서는\s*/, `${regionName}에서는 `)
    .replace(/^는\s*/, `${withTopicParticle(regionName)} `)
    .replace(/^의\s*/, `${regionName}의 `)
    .replace(/해당 지역들에는 모두/g, `${regionName}에는`)
    .replace(/해당 지역들에는/g, `${regionName}에는`)
    .replace(/해당 지역들은/g, withTopicParticle(regionName))
    .replace(/해당 지역 주변에서는/g, `${regionName} 주변에서는`)
    .replace(/해당 지역에서는/g, `${regionName}에서는`)
    .replace(/해당 지역은/g, withTopicParticle(regionName))
    .replace(/해당 지역의/g, `${regionName}의`)
    .replace(/해당 지역/g, regionName);
}

function getExamStatementPeriodLabels(statement) {
  return EXAM_STATEMENT_PERIOD_LABELS[statement.id] ?? {};
}

function getExamFeaturePeriodLabels(statement, region, isTrue, seed) {
  if (!/\([가-라]\)\s*시기에/.test(statement.text)) {
    return getExamStatementPeriodLabels(statement);
  }

  if (isMediterraneanDrySeasonStatement(statement) && region) {
    const monthLabel = isTrue
      ? getMediterraneanDrySeasonMonthLabel(region)
      : getSeededExamMonthLabel(seed, statement.id, region.id);
    return { 가: monthLabel, 나: monthLabel, 다: monthLabel, 라: monthLabel };
  }

  return getExamStatementPeriodLabels(statement);
}

function isMediterraneanDrySeasonStatement(statement) {
  const tags = new Set(statement.tags ?? []);
  return tags.has("아열대 고압대") && tags.has("건기");
}

function getMediterraneanDrySeasonMonthLabel(region) {
  return getHemisphere(region) === "남반구" ? "1월" : "7월";
}

function getSeededExamMonthLabel(seed, ...parts) {
  const value = hashStringToPositiveInteger([seed, ...parts].join("|")) % EXAM_MONTH_OPTIONS.length;
  return EXAM_MONTH_OPTIONS[value]?.label ?? EXAM_MONTH_OPTIONS[0].label;
}

function formatExamMetricValue(value, unit) {
  if (unit === "시간") {
    return `${round(value, 1)}시간`;
  }
  if (unit === "°") {
    return `${round(value, 1)}°`;
  }
  if (unit === "°C") {
    return formatTemp(value);
  }
  if (unit === "mm") {
    return formatMm(value);
  }
  return `${round(value, 1)}${unit}`;
}

function getApproximateDayLength(region, dayOfYear) {
  const latitude = region.coordinates?.latitude;
  if (!Number.isFinite(latitude)) {
    return NaN;
  }

  const latitudeRadians = degreesToRadians(latitude);
  const declinationRadians = degreesToRadians(getSolarDeclination(dayOfYear));
  const hourAngleInput = -Math.tan(latitudeRadians) * Math.tan(declinationRadians);
  if (hourAngleInput >= 1) {
    return 0;
  }
  if (hourAngleInput <= -1) {
    return 24;
  }
  return (24 / Math.PI) * Math.acos(hourAngleInput);
}

function getApproximateSolarNoonAltitude(region, dayOfYear) {
  const latitude = region.coordinates?.latitude;
  if (!Number.isFinite(latitude)) {
    return NaN;
  }
  return 90 - Math.abs(latitude - getSolarDeclination(dayOfYear));
}

function getSolarDeclination(dayOfYear) {
  return 23.44 * Math.sin(degreesToRadians((360 / 365) * (dayOfYear - 81)));
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function withTopicParticle(text) {
  return `${text}${hasFinalConsonant(text) ? "은" : "는"}`;
}

function hasFinalConsonant(text) {
  const lastCharacter = [...String(text).trim()].pop();
  if (!lastCharacter) {
    return false;
  }

  const code = lastCharacter.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) {
    return false;
  }
  return (code - 0xac00) % 28 !== 0;
}

function resolveWorldComparisonBaseline(selectedRegions) {
  const baselineRegion = selectedRegions.find((region) => region.id === state.comparisonBaseline);
  if (!baselineRegion) {
    return {
      mode: "mean",
      label: "선택 지역 평균",
      formulaLabel: "선택 지역 평균값",
    };
  }

  return {
    mode: "region",
    region: baselineRegion,
    label: baselineRegion.name,
    formulaLabel: `${baselineRegion.name} 값`,
  };
}

function renderMonthPanel(selectedRegions, monthIndex, panelIndex, baseline) {
  const monthLabel = state.dataset.months[monthIndex];
  const rows = selectedRegions.map((region) => ({
    id: region.id,
    name: region.name,
    temperature: region.monthlyTemperatureC[monthIndex],
    precipitation: region.monthlyPrecipitationMm[monthIndex],
  }));

  const meanTemperature = average(rows.map((row) => row.temperature));
  const meanPrecipitation = average(rows.map((row) => row.precipitation));
  const temperatureReference =
    baseline.mode === "region" ? baseline.region.monthlyTemperatureC[monthIndex] : meanTemperature;
  const precipitationReference =
    baseline.mode === "region" ? baseline.region.monthlyPrecipitationMm[monthIndex] : meanPrecipitation;
  const rowsWithDeviation = rows.map((row) => ({
    ...row,
    temperatureDeviation: round(row.temperature - temperatureReference),
    precipitationDeviation: round(row.precipitation - precipitationReference),
  }));
  const chartRows =
    baseline.mode === "region"
      ? rowsWithDeviation.filter((row) => row.id !== baseline.region.id)
      : rowsWithDeviation;

  const temperatureValues = rows.map((row) => row.temperature);
  const precipitationValues = rows.map((row) => row.precipitation);

  return `
    <article class="month-panel world-month-panel" style="animation-delay: ${panelIndex * 70}ms">
      <h3>${escapeHtml(monthLabel)} 비교</h3>
      <div class="stats-row">
        <span class="stat-pill">평균 기온 ${formatTemp(meanTemperature)}</span>
        <span class="stat-pill">기온 범위 ${formatTemp(Math.max(...temperatureValues) - Math.min(...temperatureValues))}</span>
        <span class="stat-pill">평균 강수량 ${formatMm(meanPrecipitation)}</span>
        <span class="stat-pill">강수량 범위 ${formatMm(
          Math.max(...precipitationValues) - Math.min(...precipitationValues)
        )}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>지역</th>
              <th>평균 기온</th>
              <th>기온 편차</th>
              <th>강수량</th>
              <th>강수 편차</th>
            </tr>
          </thead>
          <tbody>
            ${rowsWithDeviation
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(
                      baseline.mode === "region" && baseline.region.id === row.id
                        ? `${row.name} (기준)`
                        : row.name
                    )}</td>
                    <td>${formatTemp(row.temperature)}</td>
                    <td>${formatSigned(row.temperatureDeviation, "°C")}</td>
                    <td>${formatMm(row.precipitation)}</td>
                    <td>${formatSigned(row.precipitationDeviation, " mm")}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="charts-grid">
        <article class="chart-card">
          <h4>${escapeHtml(monthLabel)} 평균 기온 차이</h4>
          ${renderDeviationTemperatureChart(chartRows)}
        </article>
        <article class="chart-card">
          <h4>${escapeHtml(monthLabel)} 강수량 차이</h4>
          ${renderDeviationPrecipitationChart(chartRows)}
        </article>
      </div>
      ${renderFootnoteLines([
        `현재 기준: ${baseline.label}`,
        `평균 기온 차이 = 해당 지역 기온 − ${baseline.formulaLabel}`,
        `강수량 차이 = 해당 지역 강수량 − ${baseline.formulaLabel}`,
        baseline.mode === "region" ? "기준 지역은 편차 그래프에서 제외했습니다." : "",
      ])}
    </article>
  `;
}

function renderMonthlyTemperatureTrendChart(selectedRegions, sharedChartScale) {
  const width = 520;
  const height = 286;
  const margin = { top: 18, right: 38, bottom: 36, left: 46 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const stepX = chartWidth / Math.max(MONTH_LABELS.length - 1, 1);
  const yMin = sharedChartScale.temperatureMin;
  const yMax = sharedChartScale.temperatureMax;
  const temperatureStep = pickTemperatureStep(yMax - yMin);
  const tickValues = buildTrendTicks(yMin, yMax, temperatureStep);
  const zeroY = yMin <= 0 && yMax >= 0 ? scaleY(0, yMin, yMax, margin.top, margin.top + chartHeight) : null;

  return `
    <svg class="svg-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="선택 지역 월 평균 기온 비교 그래프">
      <rect
        x="${margin.left}"
        y="${margin.top}"
        width="${chartWidth}"
        height="${chartHeight}"
        fill="${COLORS.white}"
        stroke="${COLORS.gridSoft}"
      />
      ${tickValues
        .map((tick) => {
          const y = scaleY(tick, yMin, yMax, margin.top, margin.top + chartHeight);
          return `
            <line
              x1="${margin.left}"
              y1="${y}"
              x2="${width - margin.right}"
              y2="${y}"
              stroke="${tick === 0 ? COLORS.zero : COLORS.gridSoft}"
              stroke-width="${tick === 0 ? 1.5 : 1}"
            />
            <text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="${COLORS.ink}">
              ${formatSignedPlain(tick)}
            </text>
          `;
        })
        .join("")}
      ${MONTH_LABELS.map((month, index) => {
        const x = margin.left + stepX * index;
        const tickY = margin.top + chartHeight;
        return `
          <line x1="${x}" y1="${tickY}" x2="${x}" y2="${tickY + 7}" stroke="${COLORS.grid}" />
          <text x="${x}" y="${height - 12}" text-anchor="middle" font-size="11" fill="${COLORS.ink}">
            ${escapeHtml(month.replace("월", ""))}
          </text>
        `;
      }).join("")}
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="${COLORS.grid}" />
      <line x1="${width - margin.right}" y1="${margin.top}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="${COLORS.grid}" />
      <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="${COLORS.grid}" />
      ${zeroY ? `<line x1="${margin.left}" y1="${zeroY}" x2="${width - margin.right}" y2="${zeroY}" stroke="${COLORS.zero}" stroke-width="1.4" />` : ""}
      ${selectedRegions
        .map((region, index) =>
          renderTrendSeriesLine(
            { name: region.name, values: region.monthlyTemperatureC },
            index,
            margin,
            stepX,
            yMin,
            yMax,
            margin.top + chartHeight,
            COLORS.temperature
          )
        )
        .join("")}
      <text x="${margin.left}" y="12" font-size="11" fill="${COLORS.temperature}" font-weight="700">(°C)</text>
    </svg>
  `;
}

function renderCumulativePrecipitationTrendChart(selectedRegions) {
  const width = 520;
  const height = 286;
  const margin = { top: 18, right: 38, bottom: 36, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const stepX = chartWidth / Math.max(MONTH_LABELS.length - 1, 1);
  const cumulativeSeries = selectedRegions.map((region) => ({
    name: region.name,
    values: region.monthlyPrecipitationMm.reduce((accumulator, value) => {
      const previous = accumulator.length > 0 ? accumulator[accumulator.length - 1] : 0;
      accumulator.push(round(previous + value));
      return accumulator;
    }, []),
  }));
  const maxValue = Math.max(...cumulativeSeries.flatMap((item) => item.values));
  const step = pickCumulativePrecipitationStep(maxValue);
  const yMax = Math.max(step * 2, niceCeil(maxValue, step));
  const tickValues = buildTrendTicks(0, yMax, step);

  return `
    <svg class="svg-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="선택 지역 누적 강수량 비교 그래프">
      <rect
        x="${margin.left}"
        y="${margin.top}"
        width="${chartWidth}"
        height="${chartHeight}"
        fill="${COLORS.white}"
        stroke="${COLORS.gridSoft}"
      />
      ${tickValues
        .map((tick) => {
          const y = scaleY(tick, 0, yMax, margin.top, margin.top + chartHeight);
          return `
            <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="${COLORS.gridSoft}" />
            <text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="${COLORS.ink}">
              ${formatPlainNumber(tick)}
            </text>
          `;
        })
        .join("")}
      ${MONTH_LABELS.map((month, index) => {
        const x = margin.left + stepX * index;
        const tickY = margin.top + chartHeight;
        return `
          <line x1="${x}" y1="${tickY}" x2="${x}" y2="${tickY + 7}" stroke="${COLORS.grid}" />
          <text x="${x}" y="${height - 12}" text-anchor="middle" font-size="11" fill="${COLORS.ink}">
            ${escapeHtml(month.replace("월", ""))}
          </text>
        `;
      }).join("")}
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="${COLORS.grid}" />
      <line x1="${width - margin.right}" y1="${margin.top}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="${COLORS.grid}" />
      <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="${COLORS.grid}" />
      ${cumulativeSeries
        .map((series, index) =>
          renderTrendSeriesLine(series, index, margin, stepX, 0, yMax, margin.top + chartHeight, COLORS.rain)
        )
        .join("")}
      <text x="${margin.left}" y="12" font-size="11" fill="${COLORS.rain}" font-weight="700">(mm)</text>
    </svg>
  `;
}

function renderTrendLegend(regions, strokeColor) {
  return `
    <div class="series-legend">
      ${regions
        .map(
          (region, index) => `
            <span class="series-legend-item">
              ${renderTrendLegendSwatch(index, strokeColor)}
              <span>${escapeHtml(region.name)}</span>
            </span>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTrendLegendSwatch(seriesIndex, strokeColor) {
  const style = COMPARISON_LINE_STYLES[seriesIndex % COMPARISON_LINE_STYLES.length];
  const dasharray = style.dasharray ? `stroke-dasharray="${style.dasharray}"` : "";
  return `
    <svg class="series-swatch-line" viewBox="0 0 30 12" aria-hidden="true">
      <line x1="2" y1="6" x2="28" y2="6" stroke="${strokeColor}" stroke-width="1.8" ${dasharray}></line>
      ${renderTrendMarker(15, 6, style.marker, strokeColor)}
    </svg>
  `;
}

function renderTrendSeriesLine(series, seriesIndex, margin, stepX, yMin, yMax, chartBottom, strokeColor) {
  const style = COMPARISON_LINE_STYLES[seriesIndex % COMPARISON_LINE_STYLES.length];
  const points = series.values
    .map((value, monthIndex) => {
      const x = margin.left + stepX * monthIndex;
      const y = scaleY(value, yMin, yMax, margin.top, chartBottom);
      return { x, y };
    });
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");

  return `
    <polyline
      fill="none"
      stroke="${strokeColor}"
      stroke-width="2"
      stroke-dasharray="${style.dasharray}"
      points="${linePoints}"
    />
    ${points.map((point) => renderTrendMarker(point.x, point.y, style.marker, strokeColor)).join("")}
  `;
}

function renderTrendMarker(x, y, marker, strokeColor) {
  if (marker === "square") {
    return `<rect x="${x - 3.8}" y="${y - 3.8}" width="7.6" height="7.6" fill="${COLORS.white}" stroke="${strokeColor}" stroke-width="1.4" />`;
  }

  if (marker === "triangle") {
    return `<path d="M ${x} ${y - 4.8} L ${x + 4.8} ${y + 3.9} L ${x - 4.8} ${y + 3.9} Z" fill="${strokeColor}" />`;
  }

  if (marker === "diamond") {
    return `<path d="M ${x} ${y - 4.8} L ${x + 4.8} ${y} L ${x} ${y + 4.8} L ${x - 4.8} ${y} Z" fill="${COLORS.white}" stroke="${strokeColor}" stroke-width="1.4" />`;
  }

  return `<circle cx="${x}" cy="${y}" r="3.9" fill="${strokeColor}" stroke="${COLORS.white}" stroke-width="1.4" />`;
}

function renderClimateChart(region, sharedChartScale = null) {
  const width = 428;
  const height = 272;
  const margin = { top: 18, right: 44, bottom: 34, left: 40 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const monthCount = region.months.length;
  const chartScale = sharedChartScale ?? buildClimateChartScale([region]);
  const precipitationMax = chartScale.precipitationMax;
  const temperatureMin = chartScale.temperatureMin;
  const temperatureMax = chartScale.temperatureMax;

  const tickCount = 5;
  const horizontalTicks = new Array(tickCount).fill(null).map((_, tickIndex) => {
    const ratio = tickIndex / (tickCount - 1);
    const y = margin.top + chartHeight - ratio * chartHeight;
    const tempValue = round(temperatureMin + ratio * (temperatureMax - temperatureMin));
    const precipValue = round(ratio * precipitationMax);
    return { y, tempValue, precipValue };
  });

  const stepX = chartWidth / monthCount;
  const barWidth = stepX * 0.56;
  const points = region.monthlyTemperatureC
    .map((value, index) => {
      const x = margin.left + stepX * index + stepX / 2;
      const y = scaleY(value, temperatureMin, temperatureMax, margin.top, margin.top + chartHeight);
      return `${x},${y}`;
    })
    .join(" ");

  const bars = region.monthlyPrecipitationMm
    .map((value, index) => {
      const x = margin.left + stepX * index + (stepX - barWidth) / 2;
      const y = scaleY(value, 0, precipitationMax, margin.top, margin.top + chartHeight);
      const barHeight = margin.top + chartHeight - y;
      return `
        <rect
          x="${x}"
          y="${y}"
          width="${barWidth}"
          height="${barHeight}"
          fill="${COLORS.rainLight}"
          stroke="${COLORS.rain}"
          stroke-width="1.2"
        />
      `;
    })
    .join("");

  const pointDots = region.monthlyTemperatureC
    .map((value, index) => {
      const x = margin.left + stepX * index + stepX / 2;
      const y = scaleY(value, temperatureMin, temperatureMax, margin.top, margin.top + chartHeight);
      return `<circle cx="${x}" cy="${y}" r="4.2" fill="${COLORS.temperature}" stroke="${COLORS.white}" stroke-width="1.8" />`;
    })
    .join("");

  const monthLabels = region.months
    .map((month, index) => {
      const x = margin.left + stepX * index + stepX / 2;
      return `<text x="${x}" y="${height - 12}" text-anchor="middle" font-size="11" fill="${COLORS.ink}">${escapeHtml(
        month.replace("월", "")
      )}</text>`;
    })
    .join("");

  return `
    <svg class="svg-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(
      region.name
    )}의 월별 기온과 강수량 그래프">
      <rect
        x="${margin.left}"
        y="${margin.top}"
        width="${chartWidth}"
        height="${chartHeight}"
        fill="${COLORS.white}"
        stroke="${COLORS.gridSoft}"
      />
      ${horizontalTicks
        .map(
          (tick) => `
            <line
              x1="${margin.left}"
              y1="${tick.y}"
              x2="${width - margin.right}"
              y2="${tick.y}"
              stroke="${COLORS.gridSoft}"
              stroke-dasharray="4 6"
            />
            <text x="${margin.left - 12}" y="${tick.y + 4}" text-anchor="end" font-size="11" fill="${COLORS.ink}">
              ${formatPlainNumber(tick.tempValue)}
            </text>
            <text x="${width - margin.right + 10}" y="${tick.y + 4}" text-anchor="start" font-size="11" fill="${COLORS.ink}">
              ${formatPlainNumber(tick.precipValue)}
            </text>
          `
        )
        .join("")}
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="${COLORS.grid}" />
      <line x1="${width - margin.right}" y1="${margin.top}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="${COLORS.grid}" />
      <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="${COLORS.grid}" />
      ${bars}
      <polyline fill="none" stroke="${COLORS.temperature}" stroke-width="3" points="${points}" />
      ${pointDots}
      ${monthLabels}
      <text x="${margin.left}" y="12" font-size="11" fill="${COLORS.temperature}" font-weight="700">(°C)</text>
      <text x="${width - margin.right}" y="12" text-anchor="end" font-size="11" fill="${COLORS.rain}" font-weight="700">(mm)</text>
    </svg>
  `;
}

function renderDeviationTemperatureChart(rows) {
  const width = 430;
  const height = 308;
  const margin = { top: 24, right: 20, bottom: 70, left: 48 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maxAbs = Math.max(...rows.map((row) => Math.abs(row.temperatureDeviation)), 1);
  const step = pickDeviationTemperatureStep(maxAbs);
  const yMax = Math.max(step * 2, niceCeil(maxAbs, step));
  const yMin = -yMax;
  const tickValues = buildSymmetricTicks(yMax, step);
  const stepX = chartWidth / Math.max(rows.length, 1);

  const points = rows
    .map((row, index) => {
      const x = margin.left + stepX * index + stepX / 2;
      const y = scaleY(row.temperatureDeviation, yMin, yMax, margin.top, margin.top + chartHeight);
      return `
        <circle cx="${x}" cy="${y}" r="6.4" fill="${COLORS.zero}" />
        ${renderSvgAxisLabel(x, height - 28, row.name, 7)}
      `;
    })
    .join("");

  return `
    <svg class="svg-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="기온 편차 그래프">
      <rect
        x="${margin.left}"
        y="${margin.top}"
        width="${chartWidth}"
        height="${chartHeight}"
        fill="${COLORS.white}"
        stroke="${COLORS.gridSoft}"
      />
      ${tickValues
        .map((tick) => {
          const y = scaleY(tick, yMin, yMax, margin.top, margin.top + chartHeight);
          const isZero = tick === 0;
          return `
            <line
              x1="${margin.left}"
              y1="${y}"
              x2="${width - margin.right}"
              y2="${y}"
              stroke="${isZero ? COLORS.zero : COLORS.grid}"
              stroke-width="${isZero ? 1.6 : 1}"
              stroke-dasharray="${isZero ? "" : "6 6"}"
            />
            <text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="${COLORS.ink}">
              ${formatSignedPlain(tick)}
            </text>
          `;
        })
        .join("")}
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="${COLORS.grid}" />
      <line x1="${width - margin.right}" y1="${margin.top}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="${COLORS.grid}" />
      <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="${COLORS.grid}" />
      ${points}
      <text x="${margin.left}" y="14" font-size="11" fill="${COLORS.ink}" font-weight="700">(°C)</text>
    </svg>
  `;
}

function renderDeviationPrecipitationChart(rows) {
  const width = 430;
  const height = 308;
  const margin = { top: 24, right: 20, bottom: 70, left: 54 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maxAbs = Math.max(...rows.map((row) => Math.abs(row.precipitationDeviation)), 20);
  const step = pickDeviationPrecipitationStep(maxAbs);
  const yMax = Math.max(step * 2, niceCeil(maxAbs, step));
  const yMin = -yMax;
  const tickValues = buildSymmetricTicks(yMax, step);
  const stepX = chartWidth / Math.max(rows.length, 1);
  const barWidth = stepX * 0.48;
  const zeroY = scaleY(0, yMin, yMax, margin.top, margin.top + chartHeight);

  const bars = rows
    .map((row, index) => {
      const x = margin.left + stepX * index + (stepX - barWidth) / 2;
      const y = scaleY(row.precipitationDeviation, yMin, yMax, margin.top, margin.top + chartHeight);
      const rectY = Math.min(y, zeroY);
      const rectHeight = Math.abs(zeroY - y);
      return `
        <rect
          x="${x}"
          y="${rectY}"
          width="${barWidth}"
          height="${rectHeight}"
          fill="${COLORS.barNeutral}"
          stroke="${COLORS.ink}"
          stroke-width="1.2"
        />
        ${renderSvgAxisLabel(x + barWidth / 2, height - 28, row.name, 7)}
      `;
    })
    .join("");

  return `
    <svg class="svg-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="강수량 편차 그래프">
      <rect
        x="${margin.left}"
        y="${margin.top}"
        width="${chartWidth}"
        height="${chartHeight}"
        fill="${COLORS.white}"
        stroke="${COLORS.gridSoft}"
      />
      ${tickValues
        .map((tick) => {
          const y = scaleY(tick, yMin, yMax, margin.top, margin.top + chartHeight);
          const isZero = tick === 0;
          return `
            <line
              x1="${margin.left}"
              y1="${y}"
              x2="${width - margin.right}"
              y2="${y}"
              stroke="${isZero ? COLORS.zero : COLORS.grid}"
              stroke-width="${isZero ? 1.6 : 1}"
              stroke-dasharray="${isZero ? "" : "6 6"}"
            />
            <text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="${COLORS.ink}">
              ${formatSignedPlain(tick)}
            </text>
          `;
        })
        .join("")}
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="${COLORS.grid}" />
      <line x1="${width - margin.right}" y1="${margin.top}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="${COLORS.grid}" />
      <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="${COLORS.grid}" />
      ${bars}
      <text x="${margin.left}" y="14" font-size="11" fill="${COLORS.ink}" font-weight="700">(mm)</text>
    </svg>
  `;
}

function renderWorldMap(regions) {
  if (regions.length === 0) {
    return renderEmptyState(
      state.mapScope === "selected" ? "아직 지도에 고른 지역이 없습니다." : "지도에 표시할 지역이 없습니다.",
      state.mapScope === "selected"
        ? "지역을 선택한 뒤 \"선택 지역만\" 보기로 현재 선택 지점만 지도에 모아볼 수 있습니다."
        : "검색어나 필터를 조금 넓히면 다시 마커가 나타납니다."
    );
  }

  const selectedVisibleCount = regions.filter((region) => state.selectedIds.has(region.id)).length;
  const projection = buildMapProjection();
  if (!projection) {
    return renderEmptyState(
      "투영 지도를 불러오지 못했습니다.",
      state.mapLoadError ?? "세계 지도 데이터를 다시 확인해 주세요."
    );
  }

  const background = renderProjectedWorldMapBackground(projection);
  const mapTypeLabel = "투영 지도";
  const mapStatusLabel = state.mapLoadError ? "지도 로드 실패" : "위경도 기준";
  const mapScopeLabel = state.mapScope === "selected" ? "선택 지역만 표시" : "전체 지역 표시";

  return `
    <div class="world-map-frame is-natural">
      ${background}
      <svg class="world-map-leaders" aria-hidden="true"></svg>
      <div class="world-map-markers">
        ${regions.map((region) => renderMapMarker(region, projection)).join("")}
      </div>
      <div class="world-map-overlay">
        <span class="map-overlay-pill">${mapTypeLabel}</span>
        <span class="map-overlay-pill">${mapStatusLabel}</span>
        <span class="map-overlay-pill">${mapScopeLabel}</span>
        <span class="map-overlay-pill">마커 ${regions.length}개</span>
        <span class="map-overlay-pill">현재 선택 ${selectedVisibleCount}개</span>
      </div>
    </div>
  `;
}

function buildMapProjection() {
  if (!state.worldMapData || !window.d3) {
    return null;
  }

  const projection = createMapProjection(window.d3, APP_CONFIG.mapProjection);
  const fitTarget = buildMapFitTarget() ?? state.worldMapData.land;
  return projection.fitExtent(
    [
      [MAP_PROJECTION_PADDING.left, MAP_PROJECTION_PADDING.top],
      [
        MAP_VIEWBOX.width - MAP_PROJECTION_PADDING.right,
        MAP_VIEWBOX.height - MAP_PROJECTION_PADDING.bottom,
      ],
    ],
    fitTarget
  );
}

function renderProjectedWorldMapBackground(projection) {
  const d3 = window.d3;
  const width = MAP_VIEWBOX.width;
  const height = MAP_VIEWBOX.height;
  const path = d3.geoPath(projection);
  const sphere = path({ type: "Sphere" });
  const graticule = path(d3.geoGraticule10());
  const land = path(state.worldMapData.land);
  const borders = path(state.worldMapData.borders);
  const shouldShowEquator = APP_CONFIG.mapShowEquator;
  const equator = shouldShowEquator
    ? path({
        type: "LineString",
        coordinates: [
          [-180, 0],
          [180, 0],
        ],
      })
    : "";
  const equatorLabelPosition =
    shouldShowEquator && projection([174, 0]) ? projection([174, 0]) : [width - 32, height / 2];

  return `
    <svg class="world-map-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(
      APP_CONFIG.mapAriaLabel
    )}">
      <rect width="${width}" height="${height}" rx="0" fill="#d9d9d9" />
      <path d="${sphere}" class="map-sphere" />
      <path d="${graticule}" class="map-graticule" />
      <path d="${land}" class="map-landmass" />
      <path d="${borders}" class="map-country-borders" />
      ${
        shouldShowEquator
          ? `
            <path d="${equator}" class="map-equator" />
            <text
              x="${round(equatorLabelPosition[0])}"
              y="${round(equatorLabelPosition[1] - 10)}"
              text-anchor="end"
              class="map-equator-label"
            >
              0°
            </text>
          `
          : ""
      }
    </svg>
  `;
}

function renderLegacyWorldMapBackground() {
  const width = MAP_VIEWBOX.width;
  const height = MAP_VIEWBOX.height;
  const longitudeLines = MAP_GRATICULE_LONGITUDES.map(
    (longitude) => `
      <line
        x1="${projectMapX(longitude)}"
        y1="0"
        x2="${projectMapX(longitude)}"
        y2="${height}"
        class="map-graticule"
      />
    `
  ).join("");
  const latitudeLines = MAP_GRATICULE_LATITUDES.map(
    (latitude) => `
      <line
        x1="0"
        y1="${projectMapY(latitude)}"
        x2="${width}"
        y2="${projectMapY(latitude)}"
        class="map-graticule"
      />
    `
  ).join("");
  const landmasses = WORLD_LANDMASSES.map(
    (landmass) => `
      <polygon
        points="${landmass.map(([longitude, latitude]) => `${projectMapX(longitude)},${projectMapY(latitude)}`).join(" ")}"
        class="map-landmass"
      />
    `
  ).join("");
  const equatorY = projectMapY(0);

  return `
    <svg class="world-map-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="세계 지도">
      <rect width="${width}" height="${height}" rx="0" fill="#d9d9d9" />
      ${longitudeLines}
      ${latitudeLines}
      <line x1="0" y1="${equatorY}" x2="${width}" y2="${equatorY}" class="map-equator" />
      <text x="${width - 16}" y="${equatorY - 8}" text-anchor="end" class="map-equator-label">0°</text>
      ${landmasses}
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="0" class="map-frame-stroke" />
    </svg>
  `;
}

function renderMapMarker(region, projection = null) {
  const position = projectCoordinateToPercent(region.coordinates, projection);
  const markerColor = getClimateColor(region.climateGroup);
  const isSelected = state.selectedIds.has(region.id);
  const label = [
    region.name,
    region.englishName,
    region.climateGroup,
    hasCoordinates(region) ? formatCoordinatePair(region.coordinates) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <button
      type="button"
      class="map-marker ${isSelected ? "is-selected" : ""}"
      data-map-region-id="${region.id}"
      data-label="${escapeHtml(region.name)}"
      aria-pressed="${isSelected ? "true" : "false"}"
      aria-label="${escapeHtml(region.name)} ${isSelected ? "선택 해제" : "선택"}"
      title="${escapeHtml(label)}"
      style="
        left: ${position.left.toFixed(3)}%;
        top: ${position.top.toFixed(3)}%;
        --marker-color: ${markerColor};
        --marker-dx: 0px;
        --marker-dy: 0px;
      "
    >
      <span class="sr-only">${escapeHtml(region.name)}</span>
    </button>
  `;
}

function hasCoordinates(region) {
  return (
    typeof region.coordinates?.latitude === "number" &&
    typeof region.coordinates?.longitude === "number"
  );
}

function projectCoordinateToPercent(coordinates, projection = null) {
  if (projection) {
    const projected = projection([coordinates.longitude, coordinates.latitude]);
    if (Array.isArray(projected)) {
      return {
        left: (projected[0] / MAP_VIEWBOX.width) * 100,
        top: (projected[1] / MAP_VIEWBOX.height) * 100,
      };
    }
  }

  return {
    left: ((coordinates.longitude + 180) / 360) * 100,
    top:
      ((MAP_VIEWBOX.maxLatitude - coordinates.latitude) /
        (MAP_VIEWBOX.maxLatitude - MAP_VIEWBOX.minLatitude)) *
      100,
  };
}

function applyMapMarkerLayout() {
  const frame = elements.worldMap.querySelector(".world-map-frame");
  const leaderLayer = elements.worldMap.querySelector(".world-map-leaders");
  const markers = [...elements.worldMap.querySelectorAll(".map-marker")];

  if (!frame || !leaderLayer || markers.length === 0) {
    return;
  }

  markers.forEach((marker) => {
    marker.style.setProperty("--marker-auto-dx", "0px");
    marker.style.setProperty("--marker-auto-dy", "0px");
  });
  leaderLayer.innerHTML = "";
}

function relaxMapMarkerLayout(nodes, width, height) {
  const padding = 12;

  for (let iteration = 0; iteration < MAP_LAYOUT_ITERATIONS; iteration += 1) {
    for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
        const leftNode = nodes[leftIndex];
        const rightNode = nodes[rightIndex];
        const dx = rightNode.x - leftNode.x;
        const dy = rightNode.y - leftNode.y;
        const distance = Math.hypot(dx, dy);
        const minDistance =
          MAP_MARKER_MIN_DISTANCE + (leftNode.isSelected || rightNode.isSelected ? 2 : 0);

        if (distance >= minDistance) {
          continue;
        }

        const angle = distance > 0.0001 ? Math.atan2(dy, dx) : fallbackMarkerAngle(leftIndex, rightIndex);
        const overlap = (minDistance - Math.max(distance, 0.0001)) / 2;
        const shiftX = Math.cos(angle) * overlap;
        const shiftY = Math.sin(angle) * overlap;

        leftNode.x -= shiftX;
        leftNode.y -= shiftY;
        rightNode.x += shiftX;
        rightNode.y += shiftY;
      }
    }

    for (const node of nodes) {
      node.x += (node.anchorX - node.x) * 0.12;
      node.y += (node.anchorY - node.y) * 0.12;
      clampMarkerNode(node, padding, width - padding, padding, height - padding);
      limitMarkerDisplacement(node);
    }
  }
}

function fallbackMarkerAngle(leftIndex, rightIndex) {
  const seed = (leftIndex + 1) * 37 + (rightIndex + 1) * 19;
  return ((seed % 360) * Math.PI) / 180;
}

function clampMarkerNode(node, minX, maxX, minY, maxY) {
  node.x = clamp(node.x, minX, maxX);
  node.y = clamp(node.y, minY, maxY);
}

function limitMarkerDisplacement(node) {
  const displacementX = node.x - node.anchorX;
  const displacementY = node.y - node.anchorY;
  const displacement = Math.hypot(displacementX, displacementY);

  if (displacement <= MAP_MARKER_MAX_DISPLACEMENT || displacement === 0) {
    return;
  }

  const ratio = MAP_MARKER_MAX_DISPLACEMENT / displacement;
  node.x = node.anchorX + displacementX * ratio;
  node.y = node.anchorY + displacementY * ratio;
}

function updateMapMarkerStyles(nodes) {
  for (const node of nodes) {
    node.marker.style.setProperty("--marker-auto-dx", `${round(node.x - node.anchorX, 2)}px`);
    node.marker.style.setProperty("--marker-auto-dy", `${round(node.y - node.anchorY, 2)}px`);
  }
}

function renderMapLeaderLines(nodes) {
  return nodes
    .filter((node) => Math.hypot(node.x - node.geoX, node.y - node.geoY) >= MAP_LEADER_THRESHOLD)
    .map(
      (node) => `
        <line
          x1="${round(node.geoX, 2)}"
          y1="${round(node.geoY, 2)}"
          x2="${round(node.x, 2)}"
          y2="${round(node.y, 2)}"
          class="map-leader-line"
        />
      `
    )
    .join("");
}

function projectMapX(longitude) {
  return round(((longitude + 180) / 360) * MAP_VIEWBOX.width);
}

function projectMapY(latitude) {
  return round(
    ((MAP_VIEWBOX.maxLatitude - latitude) /
      (MAP_VIEWBOX.maxLatitude - MAP_VIEWBOX.minLatitude)) *
      MAP_VIEWBOX.height
  );
}

function getClimateColor(climateGroup) {
  return CLIMATE_COLORS[climateGroup] ?? COLORS.rain;
}

function getWarmestMonthTemperature(region) {
  return Math.max(...region.monthlyTemperatureC);
}

function getColdestMonthTemperature(region) {
  return Math.min(...region.monthlyTemperatureC);
}

function getWorldAnnualTemperatureRange(region) {
  return round(getWarmestMonthTemperature(region) - getColdestMonthTemperature(region));
}

function compareNumericDescending(leftValue, rightValue, leftRegion, rightRegion) {
  const difference = rightValue - leftValue;
  if (Math.abs(difference) > 0.0001) {
    return difference;
  }
  return sortRegions(leftRegion, rightRegion);
}

function compareNumericAscending(leftValue, rightValue, leftRegion, rightRegion) {
  const difference = leftValue - rightValue;
  if (Math.abs(difference) > 0.0001) {
    return difference;
  }
  return sortRegions(leftRegion, rightRegion);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatCoordinatePair(location) {
  const latitude =
    typeof location?.latitude === "number" ? location.latitude : location?.coordinates?.latitude;
  const longitude =
    typeof location?.longitude === "number" ? location.longitude : location?.coordinates?.longitude;
  return `${formatLatitude(latitude)} · ${formatLongitude(longitude)}`;
}

function formatLatitude(value) {
  return `${value >= 0 ? "북위" : "남위"} ${formatDegrees(Math.abs(value))}°`;
}

function formatLongitude(value) {
  return `${value >= 0 ? "동경" : "서경"} ${formatDegrees(Math.abs(value))}°`;
}

function formatDegrees(value) {
  return coordinateFormatter.format(Number(value.toFixed(2)));
}

function formatMeters(value) {
  return `${Math.round(value).toLocaleString("ko-KR")} m`;
}

function formatPopulation(value) {
  return value >= 10000
    ? `${Math.round(value).toLocaleString("ko-KR")}명`
    : `${value.toLocaleString("ko-KR")}명`;
}

function inferContinentFromCountryCode(countryCode, latitude, longitude) {
  const normalized = String(countryCode ?? "").toUpperCase();

  if (AFRICA_COUNTRY_CODES.has(normalized)) {
    return "아프리카";
  }
  if (AMERICAS_COUNTRY_CODES.has(normalized)) {
    return "아메리카";
  }
  if (OCEANIA_COUNTRY_CODES.has(normalized)) {
    return "오세아니아";
  }

  if (longitude <= -30) {
    return "아메리카";
  }
  if (latitude < 0 && longitude >= 110) {
    return "오세아니아";
  }
  if (latitude <= 37 && longitude >= -20 && longitude <= 55) {
    return "아프리카";
  }
  return "유라시아";
}

function inferPrimaryCategory(countryCode, latitude, longitude) {
  if (APP_CONFIG.primaryCategoryMode === "korea-region") {
    return inferKoreanRegionCategory(latitude, longitude);
  }

  return inferContinentFromCountryCode(countryCode, latitude, longitude);
}

function inferKoreanRegionCategory(latitude, longitude) {
  if (latitude < 34.2) {
    return "제주";
  }
  if (latitude >= 37 && longitude <= 127.2) {
    return "수도권";
  }
  if (latitude >= 37.2) {
    return longitude >= 128 ? "강원 영동" : "강원 영서";
  }
  if (latitude >= 36 && longitude < 127.9) {
    return "충청";
  }
  if (longitude >= 128) {
    return "영남";
  }
  return latitude >= 35.2 ? "충청" : "호남";
}

function classifyClimateGroup({ monthlyTemperatureC, monthlyPrecipitationMm, latitude, elevationM }) {
  const annualMeanTemperature = average(monthlyTemperatureC);
  const annualPrecipitation = monthlyPrecipitationMm.reduce((sum, value) => sum + value, 0);
  const coldestMonth = Math.min(...monthlyTemperatureC);
  const warmestMonth = Math.max(...monthlyTemperatureC);
  const driestMonth = Math.min(...monthlyPrecipitationMm);

  if (Number.isFinite(elevationM) && elevationM >= 1500 && annualMeanTemperature > 0 && annualMeanTemperature < 18) {
    return "H";
  }
  if (warmestMonth < 0) {
    return "EF";
  }
  if (warmestMonth < 10) {
    return "ET";
  }

  const isNorthernHemisphere = latitude >= 0;
  const summerMonths = isNorthernHemisphere ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 0, 1, 2];
  const winterMonths = isNorthernHemisphere ? [9, 10, 11, 0, 1, 2] : [3, 4, 5, 6, 7, 8];
  const summerPrecipitation = sumMonthValues(monthlyPrecipitationMm, summerMonths);
  const winterPrecipitation = sumMonthValues(monthlyPrecipitationMm, winterMonths);
  const summerPrecipitationRatio =
    annualPrecipitation > 0 ? summerPrecipitation / annualPrecipitation : 0;
  let drynessThreshold = 20 * annualMeanTemperature;

  if (summerPrecipitationRatio >= 0.7) {
    drynessThreshold += 280;
  } else if (summerPrecipitationRatio >= 0.3) {
    drynessThreshold += 140;
  }

  if (annualPrecipitation < drynessThreshold) {
    return annualPrecipitation < drynessThreshold / 2 ? "Bw" : "BS";
  }

  if (coldestMonth >= 18) {
    if (driestMonth >= 60) {
      return "Af";
    }
    if (driestMonth >= 100 - annualPrecipitation / 25) {
      return "Am";
    }
    return "Aw";
  }

  const summerDryness = Math.min(...summerMonths.map((index) => monthlyPrecipitationMm[index]));
  const winterWettest = Math.max(...winterMonths.map((index) => monthlyPrecipitationMm[index]));
  const winterDryness = Math.min(...winterMonths.map((index) => monthlyPrecipitationMm[index]));
  const summerWettest = Math.max(...summerMonths.map((index) => monthlyPrecipitationMm[index]));
  const hasDrySummer = summerDryness < 40 && summerDryness < winterWettest / 3;
  const hasDryWinter = winterDryness < summerWettest / 10;
  const warmMonths = monthlyTemperatureC.filter((value) => value >= 10).length;

  if (coldestMonth > 0) {
    if (hasDrySummer) {
      return "Cs";
    }
    if (hasDryWinter) {
      return "Cw";
    }
    return warmestMonth >= 22 && warmMonths >= 4 ? "Cfa" : "Cfb";
  }

  return hasDryWinter ? "Dw" : "Df";
}

function sumMonthValues(values, monthIndexes) {
  return monthIndexes.reduce((sum, monthIndex) => sum + values[monthIndex], 0);
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}

function shuffleArray(values) {
  const cloned = [...values];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }
  return cloned;
}

function getHemisphere(region) {
  return region.hemisphere ?? (region.coordinates?.latitude >= 0 ? "북반구" : "남반구");
}

function renderEmptyState(title, description) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}

function sortRegions(left, right) {
  const primaryFilterOrder = APP_CONFIG.primaryFilterOrder;
  const leftIndex = primaryFilterOrder.indexOf(left.continent);
  const rightIndex = primaryFilterOrder.indexOf(right.continent);
  if (leftIndex !== rightIndex) {
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
      (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
  }
  return collator.compare(left.name, right.name);
}

function normalizeAppConfig(config) {
  return {
    datasetPath: config.datasetPath ?? "./data/climate-data.json",
    defaultSampleNames:
      Array.isArray(config.defaultSampleNames) && config.defaultSampleNames.length > 0
        ? config.defaultSampleNames
        : DEFAULT_WORLD_SAMPLE_NAMES,
    primaryFilterOrder:
      Array.isArray(config.primaryFilterOrder) && config.primaryFilterOrder.length > 0
        ? config.primaryFilterOrder
        : CONTINENT_ORDER,
    primaryCategoryMode: config.primaryCategoryMode ?? "continent",
    apiSearchCountryCode: config.apiSearchCountryCode ?? "",
    mapProjection: config.mapProjection ?? "naturalEarth1",
    mapBounds: config.mapBounds ?? null,
    mapShowEquator: config.mapShowEquator ?? true,
    mapAriaLabel: config.mapAriaLabel ?? "세계 지도",
  };
}

function createMapProjection(d3, projectionName) {
  if (projectionName === "mercator") {
    return d3.geoMercator();
  }
  return d3.geoNaturalEarth1();
}

function buildMapFitTarget() {
  const bounds = APP_CONFIG.mapBounds;
  if (!bounds) {
    return null;
  }

  return {
    type: "Polygon",
    coordinates: [[
      [bounds.minLongitude, bounds.minLatitude],
      [bounds.maxLongitude, bounds.minLatitude],
      [bounds.maxLongitude, bounds.maxLatitude],
      [bounds.minLongitude, bounds.maxLatitude],
      [bounds.minLongitude, bounds.minLatitude],
    ]],
  };
}

function average(values) {
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function round(value) {
  return Number(value.toFixed(1));
}

function niceCeil(value, step) {
  return Math.ceil(value / step) * step;
}

function niceFloor(value, step) {
  return Math.floor(value / step) * step;
}

function pickPrecipitationStep(maxValue) {
  if (maxValue <= 120) return 20;
  if (maxValue <= 300) return 50;
  if (maxValue <= 700) return 100;
  return 200;
}

function pickCumulativePrecipitationStep(maxValue) {
  if (maxValue <= 300) return 50;
  if (maxValue <= 700) return 100;
  if (maxValue <= 1400) return 250;
  return 500;
}

function pickTemperatureStep(span) {
  if (span <= 8) return 2;
  if (span <= 20) return 5;
  return 10;
}

function pickDeviationTemperatureStep(maxAbs) {
  if (maxAbs <= 3) return 1;
  if (maxAbs <= 8) return 2;
  return 5;
}

function pickDeviationPrecipitationStep(maxAbs) {
  if (maxAbs <= 80) return 20;
  if (maxAbs <= 200) return 50;
  return 100;
}

function buildSymmetricTicks(maxValue, step) {
  const ticks = [];
  for (let value = maxValue; value >= -maxValue; value -= step) {
    ticks.push(round(value));
  }
  return ticks;
}

function buildTrendTicks(minValue, maxValue, step) {
  const ticks = [];
  for (let value = minValue; value <= maxValue + 0.0001; value += step) {
    ticks.push(round(value));
  }
  return ticks;
}

function splitLabelLines(label, maxCharsPerLine = 7, maxLines = 2) {
  const normalized = String(label ?? "").trim();
  if (!normalized) {
    return [""];
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const lines = [];

  if (words.length > 1) {
    let current = "";
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxCharsPerLine || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    });
    if (current) {
      lines.push(current);
    }
  } else {
    for (let index = 0; index < normalized.length; index += maxCharsPerLine) {
      lines.push(normalized.slice(index, index + maxCharsPerLine));
    }
  }

  if (lines.length > maxLines) {
    const clipped = lines.slice(0, maxLines);
    const lastLine = clipped[maxLines - 1];
    clipped[maxLines - 1] =
      lastLine.length >= maxCharsPerLine ? `${lastLine.slice(0, maxCharsPerLine - 1)}…` : `${lastLine}…`;
    return clipped;
  }

  return lines;
}

function renderSvgAxisLabel(x, y, label, maxCharsPerLine = 7) {
  const lines = splitLabelLines(label, maxCharsPerLine, 2);
  return `
    <text x="${x}" y="${y}" text-anchor="middle" font-size="11" fill="${COLORS.ink}">
      ${lines
        .map(
          (line, index) => `
            <tspan x="${x}" dy="${index === 0 ? 0 : 12}">${escapeHtml(line)}</tspan>
          `
        )
        .join("")}
    </text>
  `;
}

function scaleY(value, min, max, top, bottom) {
  if (max === min) {
    return (top + bottom) / 2;
  }
  const ratio = (value - min) / (max - min);
  return bottom - ratio * (bottom - top);
}

function formatPlainNumber(value) {
  return numberFormatter.format(value);
}

function formatTemp(value) {
  return `${numberFormatter.format(round(value))}°C`;
}

function formatMm(value) {
  return `${numberFormatter.format(round(value))} mm`;
}

function formatSigned(value, unit) {
  return `${value > 0 ? "+" : ""}${numberFormatter.format(round(value))}${unit}`;
}

function formatSignedPlain(value) {
  return numberFormatter.format(round(value));
}

function renderFootnoteLines(lines, className = "formula-note") {
  const visibleLines = lines.filter(Boolean);
  return `<p class="${className}">${visibleLines
    .map((line, index) => `${index > 0 ? "<br />" : ""}${"*".repeat(index + 1)} ${escapeHtml(line)}`)
    .join("")}</p>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

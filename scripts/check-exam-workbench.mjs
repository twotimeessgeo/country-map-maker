import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dependencyPaths = [
  "vendor/d3.min.js",
  "vendor/d3-geo-projection.min.js",
  "vendor/topojson-client.min.js",
  "data/world-atlas.js",
  "data/world-atlas-variants.js",
  "data/world-lakes.js",
  "data/exam-country-catalog.js",
  "data/country-stats.js",
];

const math = Object.create(Math);
const context = {
  console,
  Intl,
  Date,
  Math: math,
  Number,
  String,
  Boolean,
  Array,
  Object,
  Map,
  Set,
  WeakMap,
  WeakSet,
  JSON,
  Promise,
  Uint8Array,
  ArrayBuffer,
  TextEncoder,
  TextDecoder,
  URL,
  Blob: globalThis.Blob,
  structuredClone: globalThis.structuredClone,
  setTimeout,
  clearTimeout,
  requestAnimationFrame: (callback) => callback(),
  cancelAnimationFrame: () => {},
};
context.window = context;
context.self = context;
context.globalThis = context;
context.navigator = { language: "ko-KR" };
context.location = { href: "http://localhost/map.html" };
context.document = {
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  createElement: () => ({}),
  createElementNS: () => ({}),
  head: { appendChild: () => {} },
  body: { dataset: {}, classList: { toggle: () => {} } },
  fonts: null,
};

vm.createContext(context);
for (const relativePath of dependencyPaths) {
  vm.runInContext(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"), context, {
    filename: relativePath,
  });
}

let appSource = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");
const initStartMarker = "const initialWorkspaceRestore = restoreSavedWorkspace();";
const initEndMarker = "void loadEmbeddedMapFontData();";
const initStart = appSource.indexOf(initStartMarker);
const initEndStart = appSource.indexOf(initEndMarker, initStart);
if (initStart < 0 || initEndStart < 0) {
  throw new Error("app.js 초기화 구간을 찾지 못했습니다. VM 회귀검사 부트스트랩을 갱신하세요.");
}
appSource = appSource.slice(0, initStart) + appSource.slice(initEndStart + initEndMarker.length);
appSource += `\n;globalThis.__examWorkbenchAudit = (${runAuditInsideAppScope.toString()})();\n`;

vm.runInContext(appSource, context, {
  filename: "app.js",
  timeout: 120_000,
});

const report = context.__examWorkbenchAudit;
if (!report || !Array.isArray(report.checks)) {
  throw new Error("Exam Workbench 회귀검사가 결과를 반환하지 않았습니다.");
}

console.log("Exam Workbench 실행 기반 회귀검사");
for (const check of report.checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} · ${check.name} · ${check.summary}`);
  if (!check.ok && check.details) {
    console.log(`  ${check.details}`);
  }
}
console.log(
  `요약 · ${report.passedCount}/${report.checks.length} 통과 · ` +
    `선택 순서 ${report.metrics.directSelectionPresetCount}개 프리셋 · ` +
    `Item Lab ${report.metrics.matrixCaseCount}개 조합/${report.metrics.matrixPanelCount}개 패널 · ` +
    `Edit ${report.metrics.editPanelCount}개 패널 · CSV ${report.metrics.csvModelCount}개 모델`,
);

if (report.failedCount > 0) {
  console.error(`Exam Workbench 회귀검사 실패: ${report.failedCount}개 계약 위반`);
  process.exitCode = 1;
} else {
  console.log("Exam Workbench 회귀검사 완료");
}

function runAuditInsideAppScope() {
  const checks = [];
  const matrixResults = [];
  const aliases = ["(가)", "(나)", "(다)", "(라)", "(마)"];

  const addCheck = (name, errors, summary, details = "") => {
    checks.push({
      name,
      ok: errors.length === 0,
      summary: errors.length === 0 ? summary : `${errors.length}개 오류`,
      details: errors.length === 0 ? "" : details || errors.slice(0, 5).join("; "),
      errors,
    });
  };

  const catalogErrors = [];
  const catalogEntries = Object.entries(examCountryCatalog);
  const catalogCoreCount = catalogEntries.filter(([, definition]) => definition.tier === "core").length;
  const catalogSupportCount = catalogEntries.filter(([, definition]) => definition.tier === "support").length;
  const rawCountryRows = getExamGraphRawCountryRows();
  const automaticCountryRows = getExamGraphAllCountryRows();
  const searchEntries = getExamGraphCountrySearchEntries();
  const hiddenTerritories = ["ASM", "GUM", "HKG", "MAC", "PRI", "VIR", "GUF", "NCL", "PYF", "ABW", "CUW", "BES"];
  if (catalogEntries.length >= rawCountryRows.length) {
    catalogErrors.push(`출제국 ${catalogEntries.length}개가 원자료 ${rawCountryRows.length}개와 분리되지 않음`);
  }
  if (catalogCoreCount < 30 || catalogSupportCount < 20) {
    catalogErrors.push(`핵심 ${catalogCoreCount}개·보조 ${catalogSupportCount}개로 주제 풀이에 필요한 폭이 부족함`);
  }
  const exposedTerritories = hiddenTerritories.filter((iso3) => getExamCountryCatalogDefinition(iso3));
  if (exposedTerritories.length) {
    catalogErrors.push(`영토·별도 지역이 출제국으로 노출됨: ${exposedTerritories.join(", ")}`);
  }
  if (searchEntries.length !== catalogEntries.length || searchEntries.some((entry) => entry.tier === "reference")) {
    catalogErrors.push(`검색 후보 ${searchEntries.length}개가 카탈로그 ${catalogEntries.length}개와 일치하지 않음`);
  }
  const invalidAutomaticRows = automaticCountryRows.filter((entry) => {
    const definition = getExamCountryCatalogDefinition(entry.stats?.iso3);
    return definition?.tier !== "core" && !(
      definition?.tier === "support" &&
      (Number(definition.examWeight) >= 4 || getExamCountryTopicWeight(entry.stats, getExamGraphCurrentTopicKey()) >= 5)
    );
  });
  if (invalidAutomaticRows.length) {
    catalogErrors.push(`자동 그래프 후보에 저빈도 보조국이 섞임: ${invalidAutomaticRows.map((entry) => entry.stats?.iso3).join(", ")}`);
  }
  if (!automaticCountryRows.some((entry) => getExamCountryCatalogDefinition(entry.stats?.iso3)?.tier === "support")) {
    catalogErrors.push("평가원 반복 사례인 보조국이 자동 후보에 한 곳도 포함되지 않음");
  }
  const incompletePriorityEntries = catalogEntries.filter(([, definition]) =>
    definition.dataTier !== definition.tier ||
    !["A", "B", "C"].includes(definition.examBand) ||
    !Number.isFinite(Number(definition.examWeight)) ||
    Number(definition.examWeight) < 1 ||
    !["demography", "agriculture", "economy", "energy", "religion", "region"]
      .every((topic) => Object.hasOwn(definition.topicWeights ?? {}, topic)),
  );
  if (incompletePriorityEntries.length) {
    catalogErrors.push(`출제 빈도·주제 가중치 메타 누락: ${incompletePriorityEntries.slice(0, 5).map(([iso3]) => iso3).join(", ")}`);
  }
  if (!findExamGraphCountrySearchEntry("KOR") || !findExamGraphCountrySearchEntry("대한민국")) {
    catalogErrors.push("ISO3 또는 한국어명 검색이 핵심 사례국을 찾지 못함");
  }
  const aliasExpectations = new Map([
    ["한국", "KOR"], ["태국", "THA"], ["대만", "TWN"], ["호주", "AUS"],
    ["스페인", "ESP"], ["남아공", "ZAF"], ["버마", "MMR"],
  ]);
  for (const [alias, iso3] of aliasExpectations) {
    if (findExamGraphCountrySearchEntry(alias)?.iso3 !== iso3) {
      catalogErrors.push(`국가 별칭 ${alias}이 ${iso3}로 연결되지 않음`);
    }
  }
  if (findExamGraphCountrySearchEntry("ASM") || findExamGraphCountrySearchEntry("American Samoa")) {
    catalogErrors.push("아메리칸사모아가 직접 검색에 노출됨");
  }
  addCheck(
    "수능 출제국 카탈로그·빈도 메타",
    catalogErrors,
    `원자료 ${rawCountryRows.length}개는 보존하고 핵심 ${catalogCoreCount}개·보조 ${catalogSupportCount}개를 검색, 자동 후보는 핵심+고빈도 보조국만 사용`,
  );

  const seededRandom = (seed) => {
    let value = seed >>> 0;
    return () => {
      value = (1664525 * value + 1013904223) >>> 0;
      return value / 4294967296;
    };
  };

  const generateWithDeterministicRetries = (definition, pool, rowCount, panelCount) => {
    examDrillPoolKey = pool;
    for (let seed = 1; seed <= 12; seed += 1) {
      Math.random = seededRandom(seed);
      const result = createExamDrillResult(definition.topicKey, {
        templateKey: definition.key,
        patternKey: definition.patternKey,
        panelCount,
        rowCount,
      });
      if (result) {
        return { result, seed };
      }
    }
    return { result: null, seed: null };
  };

  const directSelectionErrors = [];
  const directSelectionConfigs = [
    { presetKey: "stacked100", compositionKey: "age-structure", valueMode: "share", grouping: "countries" },
    { presetKey: "groupedBars", compositionKey: "crops-production", valueMode: "amount", grouping: "countries" },
    { presetKey: "rankBars", metricKey: "population-total", valueMode: "amount", grouping: "countries" },
    { presetKey: "pairedBars", pairKey: "birth-death-rate", valueMode: "amount", grouping: "countries" },
    {
      presetKey: "timeCompare",
      timeMetricKey: "population-total",
      valueMode: "relative",
      grouping: "countries",
      yearStart: 1970,
      yearEnd: 2023,
    },
    {
      presetKey: "trendLine",
      timeMetricKey: "population-urban-share",
      valueMode: "amount",
      grouping: "countries",
      yearStart: 1970,
      yearEnd: 2023,
    },
    {
      presetKey: "scatter",
      grouping: "countries",
      scatterXKey: "population-urban-share",
      scatterYKey: "age-65plus-share",
      scatterSizeKey: "population-total",
    },
  ];

  for (const config of directSelectionConfigs) {
    state.selected = [];
    state.examGraphFocusCountryIds = [];
    state.examGraphAliasMode = false;
    state.examGraphTopN = 5;
    applyExamGraphScenarioConfig(config);
    ensureExamGraphState();
    const automaticModel = buildExamGraphModel();
    if (!automaticModel || automaticModel.rows.length < 5) {
      directSelectionErrors.push(`${config.presetKey}: 기준 행 5개를 만들지 못함`);
      continue;
    }

    const selectedIds = automaticModel.rows.slice(0, 5).map((row) => row.id).reverse();
    state.selected = selectedIds.map((countryId) => ({
      id: countryId,
      name: countryStatsById[countryId]?.atlasName ?? String(countryId),
    }));
    state.examGraphFocusCountryIds = [];
    state.examGraphAliasMode = true;
    ensureExamGraphState();
    const selectedModel = buildExamGraphModel();
    const expectedIds = selectedIds.map(String);
    const actualIds = (selectedModel?.rows ?? []).map((row) => String(row.id));
    const expectedAliases = aliases.slice(0, 5);
    const rowAliases = (selectedModel?.rows ?? []).map((row) => row.displayLabel);
    const answerAliases = (selectedModel?.answerRows ?? []).map((row) => row.label);
    const csvAliases = buildExamGraphCsvRows(selectedModel).slice(1).map((row) => row[0]);
    if (actualIds.join("|") !== expectedIds.join("|")) {
      directSelectionErrors.push(`${config.presetKey}: ${actualIds.join("|")} != ${expectedIds.join("|")}`);
    }
    if (rowAliases.join("|") !== expectedAliases.join("|")) {
      directSelectionErrors.push(`${config.presetKey}: 그래프 가명 순서 오류`);
    }
    if (answerAliases.join("|") !== expectedAliases.join("|")) {
      directSelectionErrors.push(`${config.presetKey}: 정답표 가명 순서 오류`);
    }
    if (csvAliases.join("|") !== expectedAliases.join("|")) {
      directSelectionErrors.push(`${config.presetKey}: CSV 가명 순서 오류`);
    }

    state.selected = [];
    state.examGraphFocusCountryIds = selectedIds;
    state.examGraphFocusKind = "custom";
    ensureExamGraphState();
    const focusedModel = buildExamGraphModel();
    const focusedIds = (focusedModel?.rows ?? []).map((row) => String(row.id));
    const focusedAliases = (focusedModel?.rows ?? []).map((row) => row.displayLabel);
    const focusedAnswerAliases = (focusedModel?.answerRows ?? []).map((row) => row.label);
    const focusedCsvAliases = buildExamGraphCsvRows(focusedModel).slice(1).map((row) => row[0]);
    if (focusedIds.join("|") !== expectedIds.join("|")) {
      directSelectionErrors.push(`${config.presetKey}: focus 경로 국가 순서 오류`);
    }
    if (
      focusedAliases.join("|") !== expectedAliases.join("|") ||
      focusedAnswerAliases.join("|") !== expectedAliases.join("|") ||
      focusedCsvAliases.join("|") !== expectedAliases.join("|")
    ) {
      directSelectionErrors.push(`${config.presetKey}: focus 경로 그래프·정답표·CSV 가명 순서 오류`);
    }
  }
  addCheck(
    "직접 선택 국가 순서",
    directSelectionErrors,
    `${directSelectionConfigs.length}개 국가형 프리셋의 지도 선택·focus 두 경로에서 역순 5개국과 가명·정답표·CSV 순서 보존`,
  );

  const recommendationErrors = [];
  const recommendationConfigs = [
    { presetKey: "stacked100", compositionKey: "industry-structure", valueMode: "share", grouping: "countries" },
    { presetKey: "stacked100", compositionKey: "electricity-breakdown", valueMode: "share", grouping: "countries" },
    { presetKey: "pairedBars", pairKey: "christians-muslims-share", valueMode: "amount", grouping: "countries" },
    { presetKey: "rankBars", metricKey: "exports-value", valueMode: "amount", grouping: "countries" },
    {
      presetKey: "scatter",
      grouping: "countries",
      scatterXKey: "population-urban-share",
      scatterYKey: "age-65plus-share",
      scatterSizeKey: "population-total",
    },
  ];
  for (const config of recommendationConfigs) {
    state.selected = [];
    state.examGraphFocusCountryIds = [];
    state.examGraphTopN = 4;
    applyExamGraphScenarioConfig(config);
    ensureExamGraphState();
    const recommendation = getExamGraphRecommendedFocus();
    if ((recommendation?.ids?.length ?? 0) !== 4) {
      recommendationErrors.push(`${config.presetKey}:${config.compositionKey ?? config.pairKey ?? config.metricKey ?? "scatter"}: 4개국 추천 실패`);
      continue;
    }
    const signatures = [...new Set(recommendation.ids.map((countryId) => getExamGraphCurrentYearSignature(countryId)).filter(Boolean))];
    if (signatures.length !== 1 || signatures[0] !== recommendation.yearSignature) {
      recommendationErrors.push(
        `${config.presetKey}:${config.compositionKey ?? config.pairKey ?? config.metricKey ?? "scatter"}: 기준연도 혼합 ${signatures.join("/") || "없음"}`,
      );
    }
    if (!recommendation.label.includes("평가원 빈도·자료 판별력")) {
      recommendationErrors.push(`${config.presetKey}: 추천 근거 라벨 누락`);
    }
  }

  const randomScenarios = getExamGraphRandomScenarioPool();
  const randomPresetCounts = new Map();
  const randomPresetMass = new Map();
  randomScenarios.forEach((scenario) => {
    const weight = Number(scenario.examWeight);
    randomPresetCounts.set(scenario.presetKey, (randomPresetCounts.get(scenario.presetKey) ?? 0) + 1);
    randomPresetMass.set(scenario.presetKey, (randomPresetMass.get(scenario.presetKey) ?? 0) + (Number.isFinite(weight) ? weight : 0));
    if (!(weight > 0)) recommendationErrors.push(`${scenario.presetKey}: 그래프 유형 가중치 누락`);
  });
  if (!(randomPresetCounts.get("rankBars") > 0)) {
    recommendationErrors.push("평가원 빈출 단일 지표 비교(rankBars)가 랜덤 풀에 없음");
  }
  if (randomScenarios.some((scenario) => scenario.compositionKey === "industry-structure" && scenario.valueMode === "amount")) {
    recommendationErrors.push("산업 구조 비율을 실제 양으로 오인하는 랜덤 조합이 남아 있음");
  }
  const frequentStyleMass = ["stacked100", "pairedBars", "rankBars", "groupedBars"]
    .reduce((sum, presetKey) => sum + (randomPresetMass.get(presetKey) ?? 0), 0);
  const temporalStyleMass = ["timeCompare", "trendLine"]
    .reduce((sum, presetKey) => sum + (randomPresetMass.get(presetKey) ?? 0), 0);
  if (frequentStyleMass <= temporalStyleMass) {
    recommendationErrors.push(`빈출 구성·순위형 가중합 ${frequentStyleMass}이 시계열형 ${temporalStyleMass}보다 크지 않음`);
  }

  const expectedPresetMass = new Map([
    ["stacked100", 6], ["pairedBars", 5], ["rankBars", 5], ["groupedBars", 4],
    ["timeCompare", 3], ["scatter", 2.5], ["trendLine", 2], ["top3share", 1],
  ]);
  for (const [presetKey, expectedMass] of expectedPresetMass) {
    if (Math.abs((randomPresetMass.get(presetKey) ?? 0) - expectedMass) > 1e-9) {
      recommendationErrors.push(`${presetKey}: 유형 내 설정 수로 정규화한 가중합이 ${expectedMass}가 아님 (${randomPresetMass.get(presetKey) ?? 0})`);
    }
  }

  let mixedComponentRowsRejected = 0;
  const assertUniformComponentYears = (label, total, entries, accessor = (entry) => entry) => {
    const years = entries.map((entry) => Number(accessor(entry)?.year)).filter(Number.isFinite);
    const mixed = years.length === entries.length && new Set(years).size > 1;
    if (mixed && total === null) mixedComponentRowsRejected += 1;
    if (total !== null && (years.length !== entries.length || new Set(years).size !== 1)) {
      recommendationErrors.push(`${label}: 합계 지표가 내부 혼합연도를 수용함 (${years.join("/")})`);
    }
  };
  getExamGraphRawCountryRows().forEach((entry) => {
    const crops = getCropTotals(entry.stats?.agriculture?.crops);
    assertUniformComponentYears(`${entry.stats?.iso3}:곡물 생산`, crops.productionTotal, crops.productionEntries);
    assertUniformComponentYears(`${entry.stats?.iso3}:곡물 수입`, crops.importTotal, crops.tradeEntries, (row) => row.import);
    assertUniformComponentYears(`${entry.stats?.iso3}:곡물 수출`, crops.exportTotal, crops.tradeEntries, (row) => row.export);
    const livestock = getLivestockTotals(entry.stats?.agriculture?.livestock);
    assertUniformComponentYears(`${entry.stats?.iso3}:가축 사육`, livestock.stockTotal, livestock.stockEntries);
    assertUniformComponentYears(`${entry.stats?.iso3}:육류 생산`, livestock.meatTotal, livestock.meatEntries);
  });
  if (!mixedComponentRowsRejected) {
    recommendationErrors.push("내부 혼합연도 합계 차단 회귀검사가 실제 혼합 자료를 포착하지 못함");
  }
  const syntheticStats = JSON.parse(JSON.stringify(findExamGraphCountrySearchEntry("CHN")?.stats ?? {}));
  if (syntheticStats?.agriculture?.crops) {
    state.worldStatsYearMode = "exam";
    const nullCrop = JSON.parse(JSON.stringify(syntheticStats.agriculture.crops));
    nullCrop.production.maize.value = null;
    if (getCropTotals(nullCrop).productionTotal !== null) recommendationErrors.push("곡물 합계가 null 생산량을 0으로 수용함");
    const mixedUnitCrop = JSON.parse(JSON.stringify(syntheticStats.agriculture.crops));
    mixedUnitCrop.production.maize.unit = "kg";
    if (getCropTotals(mixedUnitCrop).productionTotal !== null) recommendationErrors.push("곡물 합계가 혼합 단위를 수용함");
    const nullTrade = JSON.parse(JSON.stringify(syntheticStats.agriculture.crops));
    nullTrade.trade.maize.import.value = "";
    if (getCropTotals(nullTrade).importTotal !== null) recommendationErrors.push("곡물 교역 합계가 빈 문자열을 0으로 수용함");
  } else {
    recommendationErrors.push("합계 결측·혼합 단위 synthetic fixture 원자료를 찾지 못함");
  }

  let fullScenarioRecommendationCount = 0;
  let aggregateSourceRowCount = 0;
  for (const scenario of randomScenarios) {
    state.selected = [];
    state.examGraphFocusCountryIds = [];
    state.examGraphFocusKind = "";
    state.examGraphTopN = 4;
    state.examGraphAliasMode = true;
    applyExamGraphScenarioConfig(scenario);
    ensureExamGraphState();
    const scenarioKey = `${scenario.presetKey}:${scenario.compositionKey ?? scenario.pairKey ?? scenario.metricKey ?? scenario.timeMetricKey ?? scenario.topShareMetricKey ?? scenario.scatterYKey ?? "unknown"}`;
    const recommendation = getExamGraphRecommendedFocus();
    if ((recommendation?.ids?.length ?? 0) !== 4) {
      recommendationErrors.push(`${scenarioKey}: 동일 연도 4개국 추천 실패`);
      continue;
    }
    const rawSignatures = recommendation.ids.map((countryId) => getExamGraphCurrentYearSignature(countryId));
    if (rawSignatures.some((signature) => !signature) || new Set(rawSignatures).size !== 1 || rawSignatures[0] !== recommendation.yearSignature) {
      recommendationErrors.push(`${scenarioKey}: 추천국 기준연도 누락·혼합 ${rawSignatures.join("/")}`);
      continue;
    }
    fullScenarioRecommendationCount += 1;
    state.examGraphFocusCountryIds = recommendation.ids;
    state.examGraphFocusKind = "recommendation";
    const selectedRows = getExamGraphSelectedCountryRows();
    const aggregateRows = getExamGraphAggregateSourceRows(selectedRows, scenario.grouping, scenario.presetKey);
    const aggregateSignatures = aggregateRows.map((row) => getExamGraphCurrentYearSignature(row));
    aggregateSourceRowCount += aggregateRows.length;
    if (
      !aggregateRows.length ||
      aggregateSignatures.some((signature) => !signature) ||
      new Set(aggregateSignatures).size !== 1 ||
      aggregateSignatures[0] !== recommendation.yearSignature
    ) {
      recommendationErrors.push(`${scenarioKey}: 실제 집계 원자료 기준연도 혼합 ${[...new Set(aggregateSignatures)].join("/") || "없음"}`);
      continue;
    }
    if (!buildExamGraphModel()) {
      recommendationErrors.push(`${scenarioKey}: 추천국 반영 뒤 그래프 모델 생성 실패`);
    }

    state.examGraphFocusCountryIds = [];
    state.examGraphFocusKind = "";
    const automaticRows = getExamGraphAggregateSourceRows([], scenario.grouping, scenario.presetKey);
    const automaticSignatures = automaticRows.map((row) => getExamGraphCurrentYearSignature(row));
    if (
      !automaticRows.length ||
      automaticSignatures.some((signature) => !signature) ||
      new Set(automaticSignatures).size !== 1 ||
      !buildExamGraphModel()
    ) {
      recommendationErrors.push(`${scenarioKey}: 국가 미지정 그래프가 단일 기준연도 원자료로 생성되지 않음`);
    }
  }

  for (const pairDefinition of examGraphPairMetricDefinitions.filter((definition) => !definition.partsOfWhole)) {
    state.examGraphPresetKey = "pairedBars";
    state.examGraphPairKey = pairDefinition.key;
    state.examGraphValueMode = "share";
    ensureExamGraphState();
    if (state.examGraphValueMode === "share" || getExamGraphAllowedValueModes("pairedBars").includes("share")) {
      recommendationErrors.push(`${pairDefinition.key}: 전체의 부분이 아닌 두 지표를 100%로 재정규화할 수 있음`);
    }
  }

  applyExamGraphScenarioConfig({
    presetKey: "scatter",
    grouping: "countries",
    scatterXKey: "religion-christians-share",
    scatterYKey: "religion-muslims-share",
    scatterSizeKey: "population-total",
  });
  ensureExamGraphState();
  const mixedYearEntry = findExamGraphCountrySearchEntry("USA");
  if (mixedYearEntry && getExamGraphCurrentYearSignature(mixedYearEntry)) {
    recommendationErrors.push("2020년 종교 비율과 2023년 총인구가 같은 연도 산포도로 승인됨");
  }

  applyExamGraphScenarioConfig({ presetKey: "pairedBars", pairKey: "grain-total-trade", valueMode: "amount", grouping: "continents" });
  ensureExamGraphState();
  const mixedTradeEntry = ["COD", "QAT"]
    .map((iso3) => findExamGraphCountrySearchEntry(iso3))
    .find((entry) => entry && !getExamGraphCurrentYearSignature(entry));
  if (!mixedTradeEntry) {
    recommendationErrors.push("직접 선택 혼합연도 대륙 집계 차단 fixture를 찾지 못함");
  } else {
    state.examGraphFocusCountryIds = [mixedTradeEntry.id];
    state.examGraphFocusKind = "custom";
    const mixedRows = getExamGraphSelectedCountryRows();
    const availability = getExamGraphScopeAvailability(mixedRows);
    if (getExamGraphAggregateSourceRows(mixedRows, "continents", "pairedBars").length !== 0 || availability.invalidYearSignatureCount !== 1) {
      recommendationErrors.push(`${mixedTradeEntry.stats?.iso3}: 혼합연도 직접 선택이 대륙 전체 원자료로 확장됨`);
    }
  }

  applyExamGraphScenarioConfig({ presetKey: "pairedBars", pairKey: "christians-muslims-share", valueMode: "amount", grouping: "countries" });
  ensureExamGraphState();
  const sriLankaEntry = findExamGraphCountrySearchEntry("LKA");
  if (!sriLankaEntry || !isExamGraphRandomCountryAllowed(sriLankaEntry.stats)) {
    recommendationErrors.push("종교 주제 고빈도 보조국 스리랑카가 자동 후보에서 제외됨");
  }
  if (!sriLankaEntry || getExamItemLabCountryTier({
    topicKey: "religion",
    config: { presetKey: "pairedBars", pairKey: "hindus-buddhists-share", valueMode: "amount", grouping: "countries" },
  }, sriLankaEntry.stats) < 3) {
    recommendationErrors.push("종교 주제 고빈도 보조국 스리랑카가 Item Lab 핵심 후보에서 제외됨");
  }

  const distributionRandom = seededRandom(20260717);
  const sampledPresetCounts = new Map();
  const distributionSamples = 5000;
  for (let sampleIndex = 0; sampleIndex < distributionSamples; sampleIndex += 1) {
    let selectedScenario = null;
    let bestOrder = Infinity;
    randomScenarios.forEach((scenario) => {
      const order = -Math.log(Math.max(distributionRandom(), 1e-9)) / getExamGraphScenarioSamplingWeight(scenario);
      if (order < bestOrder) {
        bestOrder = order;
        selectedScenario = scenario;
      }
    });
    sampledPresetCounts.set(selectedScenario.presetKey, (sampledPresetCounts.get(selectedScenario.presetKey) ?? 0) + 1);
  }
  const temporalSampleShare = ((sampledPresetCounts.get("timeCompare") ?? 0) + (sampledPresetCounts.get("trendLine") ?? 0)) / distributionSamples;
  const rankSampleShare = (sampledPresetCounts.get("rankBars") ?? 0) / distributionSamples;
  if (temporalSampleShare > 0.25 || rankSampleShare < 0.1) {
    recommendationErrors.push(`유형 가중 추출 분포 이상: 시계열 ${(temporalSampleShare * 100).toFixed(1)}%, 단일 지표 ${(rankSampleShare * 100).toFixed(1)}%`);
  }
  addCheck(
    "동일 연도 국가 추천·그래프 유형 가중치",
    recommendationErrors,
    `${recommendationConfigs.length}개 대표+랜덤 ${fullScenarioRecommendationCount}/${randomScenarios.length}개 전수 추천, 집계 원자료 ${aggregateSourceRowCount}행 동일 연도, 시계열 표본 ${(temporalSampleShare * 100).toFixed(1)}%`,
    recommendationErrors.join("; "),
  );

  const missingAliasErrors = [];
  applyExamGraphScenarioConfig({
    presetKey: "stacked100",
    compositionKey: "crops-production",
    valueMode: "share",
    grouping: "countries",
  });
  const cropDefinition = getExamGraphCompositionDefinition();
  const allCountryRows = getExamGraphAllCountryRows();
  const validCropRows = allCountryRows
    .filter((entry) => {
      const components = cropDefinition.getComponents(entry.stats) ?? [];
      return components.length > 0 && d3.sum(components, (component) => Number(component.value) || 0) > 0;
    })
    .slice(0, 4);
  const missingCropRow = allCountryRows.find((entry) => {
    const components = cropDefinition.getComponents(entry.stats) ?? [];
    return components.length === 0 || d3.sum(components, (component) => Number(component.value) || 0) <= 0;
  });
  if (!missingCropRow || validCropRows.length !== 4) {
    missingAliasErrors.push("누락 선행 국가 재현 데이터를 구성하지 못함");
  } else {
    state.selected = [missingCropRow, ...validCropRows].map((entry) => ({ id: entry.id, name: entry.label }));
    state.examGraphFocusCountryIds = [];
    state.examGraphAliasMode = true;
    ensureExamGraphState();
    const model = buildExamGraphModel();
    const expectedAliases = aliases.slice(0, validCropRows.length);
    const rowAliases = (model?.rows ?? []).map((row) => row.displayLabel);
    const answerAliases = (model?.answerRows ?? []).map((row) => row.label);
    const csvAliases = buildExamGraphCsvRows(model).slice(1).map((row) => row[0]);
    if (rowAliases.join("|") !== expectedAliases.join("|")) {
      missingAliasErrors.push(
        `${missingCropRow.label} 누락 뒤 그래프가 ${rowAliases.join(", ")}로 시작함; 기대 ${expectedAliases.join(", ")}`,
      );
    }
    if (answerAliases.join("|") !== expectedAliases.join("|")) {
      missingAliasErrors.push(`정답표가 ${answerAliases.join(", ")}로 시작함`);
    }
    if (csvAliases.join("|") !== expectedAliases.join("|")) {
      missingAliasErrors.push(`CSV가 ${csvAliases.join(", ")}로 시작함`);
    }
  }
  addCheck(
    "누락 행 이후 visible alias 연속성",
    missingAliasErrors,
    "통계가 없는 첫 선택국을 제외해도 남은 행은 (가)부터 연속",
    missingAliasErrors.join("; "),
  );

  const matrixErrors = [];
  let matrixPanelCount = 0;
  for (const pool of ["core", "extended"]) {
    for (const definition of examItemLabTemplateDefinitions) {
      for (const rowCount of [3, 4, 5]) {
        const panelCount = Math.min(3, Number(definition.maxPanelCount) || 2);
        const { result, seed } = generateWithDeterministicRetries(definition, pool, rowCount, panelCount);
        if (!result) {
          matrixErrors.push(`${pool}:${definition.key}:Rows${rowCount}: 12개 결정적 시드 모두 생성 실패`);
          continue;
        }
        matrixResults.push({ pool, definition, rowCount, result, seed });
        matrixPanelCount += result.panels.length;
        if (result.rowCount !== rowCount || result.recommendation.ids.length !== rowCount) {
          matrixErrors.push(`${pool}:${definition.key}:Rows${rowCount}: 결과 행 수 불일치`);
        }
        const extendedUsed = result.recommendation.ids.filter(
          (countryId) =>
            getExamItemLabTemplateCountryTier(result.templateDefinition, countryStatsById[countryId]) === 2,
        ).length;
        if (pool === "core" && extendedUsed !== 0) {
          matrixErrors.push(`${pool}:${definition.key}:Rows${rowCount}: Extended ${extendedUsed}개 혼입`);
        }
        if (pool === "extended" && extendedUsed !== 1) {
          matrixErrors.push(`${pool}:${definition.key}:Rows${rowCount}: Extended ${extendedUsed}개, 기대 1개`);
        }

        const expectedAliases = aliases.slice(0, rowCount);
        for (const panel of result.panels) {
          if (panel.model.rows.length !== rowCount) {
            matrixErrors.push(`${pool}:${definition.key}:Rows${rowCount}:${panel.definition.label}: 패널 행 수 불일치`);
          }
          if (panel.model.rows.map((row) => row.displayLabel).join("|") !== expectedAliases.join("|")) {
            matrixErrors.push(`${pool}:${definition.key}:Rows${rowCount}:${panel.definition.label}: 그래프 가명 불일치`);
          }
          if ((panel.model.answerRows ?? []).map((row) => row.label).join("|") !== expectedAliases.join("|")) {
            matrixErrors.push(`${pool}:${definition.key}:Rows${rowCount}:${panel.definition.label}: 정답표 가명 불일치`);
          }
          if (
            panel.definition.scope === "seed" &&
            panel.model.rows.map((row) => String(row.id)).join("|") !==
              result.recommendation.ids.map(String).join("|")
          ) {
            matrixErrors.push(`${pool}:${definition.key}:Rows${rowCount}:${panel.definition.label}: 국가 순서 불일치`);
          }
        }
      }
    }
  }
  addCheck(
    "Core + Extended · Rows 3/4/5",
    matrixErrors,
    `${matrixResults.length}개 템플릿/풀/행 조합과 ${matrixPanelCount}개 패널의 행 수·가명·정답표·국가 순서 통과`,
  );

  beginHistoryStep = () => {};
  renderSelectionViews = () => {};
  renderMap = () => {};
  setStatus = () => {};
  state.selected = [];
  const editErrors = [];
  let editPanelCount = 0;
  for (const entry of matrixResults.filter((item) => item.pool === "extended")) {
    examDrillResult = entry.result;
    for (let panelIndex = 0; panelIndex < entry.result.panels.length; panelIndex += 1) {
      editPanelCount += 1;
      const panel = entry.result.panels[panelIndex];
      const originalModel = panel.model;
      applyExamDrillResultToBuilder(panelIndex);
      const rebuiltModel = buildExamGraphModel();
      if (state.examGraphTopN !== originalModel.rows.length) {
        editErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}: topN 손실`);
      }
      if (
        panel.definition.scope === "seed" &&
        state.examGraphFocusCountryIds.map(String).join("|") !== entry.result.recommendation.ids.map(String).join("|")
      ) {
        editErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}: focus 순서 손실`);
      }
      if (panel.definition.scope === "world" && state.examGraphFocusCountryIds.length !== 0) {
        editErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}: world focus 잔존`);
      }
      if (!rebuiltModel || rebuiltModel.rows.length !== originalModel.rows.length) {
        editErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}: 재생성 행 수 불일치`);
        continue;
      }
      if (
        rebuiltModel.rows.map((row) => `${row.id}:${row.displayLabel}`).join("|") !==
        originalModel.rows.map((row) => `${row.id}:${row.displayLabel}`).join("|")
      ) {
        editErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}: 행/focus 순서 변경`);
      }
      if (
        (rebuiltModel.answerRows ?? []).map((row) => `${row.label}=${row.value}`).join("|") !==
        (originalModel.answerRows ?? []).map((row) => `${row.label}=${row.value}`).join("|")
      ) {
        editErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}: 정답표 변경`);
      }
    }
  }
  addCheck(
    "Item Lab → Edit handoff",
    editErrors,
    `${editPanelCount}개 패널의 rowCount·focus·행 순서·정답표 보존`,
  );

  const csvErrors = [];
  let csvModelCount = 0;
  for (const entry of matrixResults.filter((item) => item.pool === "extended")) {
    for (const panel of entry.result.panels) {
      csvModelCount += 1;
      const model = panel.model;
      const csv = buildExamGraphCsvRows(model);
      if (csv.length !== model.rows.length + 1) {
        csvErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}: CSV 행 수 불일치`);
        continue;
      }
      const studentHeaders = new Set((csv[0] ?? []).map(String));
      if (String(csv[0]?.[0]) !== "표시명") {
        csvErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}: 학생 CSV 표시명 헤더 누락`);
      }
      if (["실제명", "실제 항목", "ISO3", "상세"].some((header) => [...studentHeaders].some((value) => value.includes(header)))) {
        csvErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}: 학생 CSV에 제작자 필드 노출`);
      }
      const studentValues = new Set(csv.flat().map(String));
      if (model.isAnonymous && (model.valueRows ?? []).some((row) => row.value || !/^\([가-하]\)$/u.test(String(row.label ?? "")))) {
        csvErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}: 값 정리 카드에 실제명 또는 비가명 라벨 노출`);
      }
      model.rows.forEach((row, rowIndex) => {
        const csvRow = csv[rowIndex + 1] ?? [];
        if (String(csvRow[0]) !== String(getExamGraphStudentLabel(model, row))) {
          csvErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}:${rowIndex}: 표시명 불일치`);
        }
        const forbiddenActualLabels = [row.actualLabel, row.label]
          .map((value) => getExamGraphReadableLabel(value))
          .filter((value) => value && value !== row.displayLabel);
        if (model.isAnonymous && forbiddenActualLabels.some((value) => studentValues.has(String(value)))) {
          csvErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}:${rowIndex}: 학생 CSV 실제명 누출`);
        }
        const iso3 = String(countryStatsById[row.id]?.iso3 ?? row.iso3 ?? "").toUpperCase();
        if (model.isAnonymous && iso3 && studentValues.has(iso3)) {
          csvErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}:${rowIndex}: 학생 CSV ISO3 누출`);
        }
        if (csvRow.some((value) => String(value) === "undefined" || String(value) === "NaN")) {
          csvErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}:${rowIndex}: 비정상 값`);
        }
        buildExamGraphCsvLine(csvRow);
      });
      const authorMap = buildExamGraphAuthorMappingCsvRows(model);
      const authorValues = new Set(authorMap.flat().map(String));
      if (String(authorMap[0]?.[0]) !== "구분" || !authorMap[0]?.includes("실제명") || !authorMap[0]?.includes("ISO3")) {
        csvErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}: 제작자 대응표 헤더 누락`);
      }
      if (model.isAnonymous) {
        model.rows.forEach((row, rowIndex) => {
          const actualLabel = getExamGraphReadableLabel(row.actualLabel ?? row.label);
          if (actualLabel && !authorValues.has(String(actualLabel))) {
            csvErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}:${rowIndex}: 제작자 대응표 실제명 누락`);
          }
        });
      }
      if (model.presetKey === "top3share") {
        const leakedMappings = model.rows.flatMap((row) =>
          (row.segments ?? [])
            .filter((segment) => segment.label !== "기타" && segment.actualLabel)
            .map((segment) => String(segment.actualLabel))
            .filter((actualLabel) => studentValues.has(actualLabel)),
        );
        if (leakedMappings.length > 0) {
          csvErrors.push(
            `${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}: 학생 CSV top3 실제명 누출 ` +
              `(${[...new Set(leakedMappings)].slice(0, 4).join(", ")})`,
          );
        }
        const missingAuthorMappings = model.rows.flatMap((row) =>
          (row.segments ?? [])
            .filter((segment) => segment.label !== "기타" && segment.actualLabel)
            .map((segment) => String(segment.actualLabel))
            .filter((actualLabel) => !authorValues.has(actualLabel)),
        );
        if (missingAuthorMappings.length > 0) csvErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}: 제작자 top3 매핑 누락`);
      }
    }
  }
  const quotedLine = buildExamGraphCsvLine(["a,b", 'x"y', "line\nbreak"]);
  if (quotedLine !== '"a,b","x""y","line\nbreak"') {
    csvErrors.push("쉼표·따옴표·개행 CSV escaping 오류");
  }
  addCheck(
    "Graph Builder CSV 구조",
    csvErrors,
    `${csvModelCount}개 모델의 학생용/제작자용 분리·가명 순서·escaping·top3 매핑 보존`,
    csvErrors.slice(0, 8).join("; "),
  );

  const generationErrors = [];
  const failedSeeds = [];
  examDrillPoolKey = "core";
  for (let seed = 1; seed <= 50; seed += 1) {
    Math.random = seededRandom(seed);
    const result = createExamDrillResult("demography", {
      templateKey: "demography-structure-scale",
      patternKey: "scale",
      panelCount: 2,
      rowCount: 5,
    });
    if (!result) {
      failedSeeds.push(seed);
    }
  }

  let generationDiagnostic = null;
  if (failedSeeds.length > 0) {
    generationDiagnostic = diagnoseDemographyStructureFailure(failedSeeds[0], seededRandom);
    const failureRate = (failedSeeds.length / 50) * 100;
    generationErrors.push(
      `결정적 시드 50개 중 ${failedSeeds.length}개 null (${failureRate.toFixed(1)}%); ` +
        `실패 시드 ${failedSeeds.slice(0, 12).join(", ")}`,
    );
    if (generationDiagnostic) {
      const panelReasons = formatReasonCounts(generationDiagnostic.panelRejectionReasons);
      const compositeReasons = formatReasonCounts(generationDiagnostic.compositeRejectionReasons);
      generationErrors.push(
        `시드 ${failedSeeds[0]} 진단: eligible ${generationDiagnostic.eligibleCount}, ` +
          `sampled ${generationDiagnostic.sampleCount}, panel reject ${generationDiagnostic.panelRejected}, ` +
          `composite reject ${generationDiagnostic.compositeRejected}, valid ${generationDiagnostic.validCount}; ` +
          `panel reasons ${panelReasons || "없음"}; composite reasons ${compositeReasons || "없음"}`,
      );
    }
  }
  addCheck(
    "demography-structure-scale · Core · Rows 5 반복 생성",
    generationErrors,
    "결정적 시드 50개에서 null 없이 생성",
    generationErrors.join("; "),
  );

  const passedCount = checks.filter((check) => check.ok).length;
  return {
    checks,
    passedCount,
    failedCount: checks.length - passedCount,
    metrics: {
      directSelectionPresetCount: directSelectionConfigs.length,
      matrixCaseCount: matrixResults.length,
      matrixPanelCount,
      editPanelCount,
      csvModelCount,
      generationFailureCount: failedSeeds.length,
      generationDiagnostic,
    },
  };

  function diagnoseDemographyStructureFailure(seed, randomFactory) {
    const originalSnapshot = captureExamGraphStateSnapshot();
    const originalSelected = state.selected;
    const originalPool = examDrillPoolKey;
    try {
      examDrillPoolKey = "core";
      Math.random = randomFactory(seed);
      state.selected = [];
      state.worldStatsYearMode = "exam";
      state.examGraphAliasMode = true;
      state.examGraphTopN = 5;
      state.examGraphOrientation = "auto";
      state.examGraphPreviewCount = 1;
      state.examGraphFontSizePt = 8;
      state.examGraphMergeAmericas = false;
      state.examGraphFocusCountryIds = [];
      state.examGraphFocusLabel = "";
      ensureExamGraphState();
      const drillSnapshot = captureExamGraphStateSnapshot();
      const template = getExamItemLabTemplateCandidates(
        "demography",
        "scale",
        "demography-structure-scale",
        2,
      )[0];
      if (!template) {
        return { eligibleCount: 0, sampleCount: 0, panelRejected: 0, compositeRejected: 0, validCount: 0 };
      }
      const eligibleCountryIds = getExamItemLabTemplateEligibleCountryIds(template);
      const countrySets = getExamDrillCountrySetSamples(
        template.scenarioDefinition,
        eligibleCountryIds,
        160,
        (countryId) => getExamItemLabTemplateCountryTier(template, countryStatsById[countryId]),
        5,
      );
      let panelRejected = 0;
      let compositeRejected = 0;
      let validCount = 0;
      const panelRejectionReasons = {};
      const compositeRejectionReasons = {};
      for (const countryIds of countrySets) {
        const panels = template.panels.map((panelDefinition) => {
          restoreExamGraphStateSnapshot(drillSnapshot);
          return buildExamItemLabPanelResult(panelDefinition, countryIds, 5);
        });
        const rejectedPanelReasons = panels.flatMap((panel) =>
          getPanelValidationFailureReasons(panel, countryIds).map(
            (reason) => `${panel.definition.label}:${reason}`,
          ),
        );
        if (rejectedPanelReasons.length > 0) {
          panelRejected += 1;
          rejectedPanelReasons.forEach((reason) => incrementReasonCount(panelRejectionReasons, reason));
          continue;
        }
        const compositeMeta = buildExamItemLabCompositeMeta(panels, countryIds);
        if (!compositeMeta.valid) {
          compositeRejected += 1;
          getCompositeValidationFailureReasons(panels, countryIds, compositeMeta).forEach((reason) =>
            incrementReasonCount(compositeRejectionReasons, reason),
          );
          continue;
        }
        validCount += 1;
      }
      return {
        eligibleCount: eligibleCountryIds.length,
        sampleCount: countrySets.length,
        panelRejected,
        compositeRejected,
        validCount,
        panelRejectionReasons,
        compositeRejectionReasons,
      };
    } finally {
      examDrillPoolKey = originalPool;
      state.selected = originalSelected;
      restoreExamGraphStateSnapshot(originalSnapshot);
      ensureExamGraphState();
    }
  }

  function getPanelValidationFailureReasons(panelResult, countryIds) {
    const reasons = [];
    const { definition, model } = panelResult;
    if (!model || !Array.isArray(model.rows)) {
      return ["model missing"];
    }
    if (model.rows.length !== panelResult.rowCount || model.rows.length < 3) {
      reasons.push("row count");
    }
    if (model.answerRows?.length !== model.rows.length) {
      reasons.push("answer count");
    }
    const signatures = model.rows.map((row) => buildExamDrillRowSignature(model, row));
    if (new Set(signatures).size < Math.max(2, model.rows.length - 1)) {
      reasons.push("duplicate row signatures");
    }
    if (definition.scope === "seed") {
      const modelIds = new Set(model.rows.map((row) => String(row.id)));
      if (!countryIds.every((countryId) => modelIds.has(String(countryId)))) {
        reasons.push("seed id missing");
      }
      if (!validateExamDrillSourceData({ config: definition.config }, countryIds)) {
        reasons.push("source data");
      }
      if (!isExamItemLabPanelReadable(model)) {
        reasons.push("readability threshold");
      }
    }
    return reasons;
  }

  function getCompositeValidationFailureReasons(panelResults, countryIds, compositeMeta) {
    const reasons = [];
    const seedPanels = panelResults.filter((panel) => panel.definition.scope === "seed");
    const featureMaps = seedPanels.map((panel) => buildExamItemLabNormalizedFeatureMap(panel.model, countryIds));
    if (!featureMaps.length || featureMaps.some((featureMap) => !featureMap)) {
      return ["feature map"];
    }
    const informativePanelCount = (compositeMeta.panelMinimumDistances ?? []).filter(
      (distance) => distance >= 0.045,
    ).length;
    const combinedSignatures = countryIds.map((countryId) =>
      featureMaps
        .flatMap((featureMap) => featureMap.get(String(countryId)) ?? [])
        .map((value) => Number(value).toFixed(3))
        .join(":"),
    );
    if (!Number.isFinite(compositeMeta.combinedMinimumDistance)) {
      reasons.push("combined distance non-finite");
    } else if (compositeMeta.combinedMinimumDistance < 0.13) {
      reasons.push("combined distance < 0.13");
    }
    if (informativePanelCount < 2) {
      reasons.push("informative panels < 2");
    }
    if ((compositeMeta.strictPanelCount ?? 0) < Math.ceil(seedPanels.length / 2)) {
      reasons.push("strict panels insufficient");
    }
    if (new Set(combinedSignatures).size !== countryIds.length) {
      reasons.push("combined signatures duplicate");
    }
    return reasons.length ? reasons : ["unclassified composite rejection"];
  }

  function incrementReasonCount(target, reason) {
    target[reason] = (target[reason] ?? 0) + 1;
  }

  function formatReasonCounts(reasonCounts) {
    return Object.entries(reasonCounts ?? {})
      .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
      .map(([reason, count]) => `${reason}=${count}`)
      .join(", ");
  }
}

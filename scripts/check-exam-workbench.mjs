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
  if (automaticCountryRows.some((entry) => getExamGraphCountryTier(entry.stats?.iso3) !== "core")) {
    catalogErrors.push("자동 그래프 후보에 보조·원자료 전용 국가가 섞임");
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
    "수능 출제국 카탈로그 분리",
    catalogErrors,
    `원자료 ${rawCountryRows.length}개는 보존하고 핵심 ${catalogCoreCount}개·보조 ${catalogSupportCount}개만 검색, 자동 후보는 핵심만 사용`,
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
  }
  addCheck(
    "직접 선택 국가 순서",
    directSelectionErrors,
    `${directSelectionConfigs.length}개 국가형 프리셋에서 역순 5개국의 그래프·정답표·CSV 순서 보존`,
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
      if (String(csv[0]?.[0]) !== "표시명" || String(csv[0]?.[1]) !== "실제명") {
        csvErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}: CSV 기본 헤더 누락`);
      }
      model.rows.forEach((row, rowIndex) => {
        const csvRow = csv[rowIndex + 1] ?? [];
        if (String(csvRow[0]) !== String(row.displayLabel ?? row.label)) {
          csvErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}:${rowIndex}: 표시명 불일치`);
        }
        if (String(csvRow[1]) !== String(row.actualLabel ?? row.label)) {
          csvErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}:${rowIndex}: 실제명 불일치`);
        }
        if (csvRow.some((value) => String(value) === "undefined" || String(value) === "NaN")) {
          csvErrors.push(`${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}:${rowIndex}: 비정상 값`);
        }
        buildExamGraphCsvLine(csvRow);
      });
      if (model.presetKey === "top3share") {
        const csvValues = new Set(csv.flat().map(String));
        const missingMappings = model.rows.flatMap((row) =>
          (row.segments ?? [])
            .filter((segment) => segment.label !== "기타" && segment.actualLabel)
            .map((segment) => String(segment.actualLabel))
            .filter((actualLabel) => !csvValues.has(actualLabel)),
        );
        if (missingMappings.length > 0) {
          csvErrors.push(
            `${entry.definition.key}:Rows${entry.rowCount}:${panel.definition.label}: top3 국가 매핑 누락 ` +
              `(${[...new Set(missingMappings)].slice(0, 4).join(", ")})`,
          );
        }
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
    `${csvModelCount}개 모델의 행·헤더·가명·실제명·escaping·top3 매핑 보존`,
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

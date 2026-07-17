import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const climateDataPath = path.join(rootDir, "tools", "climate", "data", "exam-climate-statements.js");
const climateDatasetPath = path.join(rootDir, "tools", "climate", "data", "climate-data.js");
const climateAppPath = path.join(rootDir, "tools", "climate", "app.js");
const choiceDataPath = path.join(rootDir, "tools", "choices", "data", "exam-choice-patterns.js");
const choiceAppPath = path.join(rootDir, "tools", "choices", "app.js");

const climateStatements = loadWindowArray(climateDataPath, "EXAM_CLIMATE_STATEMENTS");
const choicePatterns = loadWindowArray(choiceDataPath, "EXAM_CHOICE_PATTERNS");
const climateAppText = fs.readFileSync(climateAppPath, "utf8");
const choiceAppText = fs.readFileSync(choiceAppPath, "utf8");

validateClimateStatements(climateStatements, climateAppText);
validateChoicePatterns(choicePatterns, choiceAppText);
const climateSmokeCount = smokeRunClimate(climateStatements, climateAppText);
smokeRunChoiceLab(choicePatterns, choiceAppText);

if (errors.length > 0) {
  console.error(`선지 레지스트리 검증 실패 (${errors.length}건)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `선지 레지스트리 검증 완료: 기후 ${climateStatements.length}개 · 타 단원 ${choicePatterns.length}개 · 기후 생성 smoke ${climateSmokeCount}개 조합`
);

function validateClimateStatements(statements, appText) {
  const allowedKinds = new Set(["comparison-source", "region-feature"]);
  const allowedAutomation = new Set(["computed", "climate-group", "allowlist", "reference-only"]);
  const allowedNormalizationKinds = new Set(["period-resolved", "inverted", "corrected"]);
  const expectedNormalizationCounts = new Map([
    ["period-resolved", 12],
    ["inverted", 10],
    ["corrected", 5],
  ]);
  const requiredSourceItems = new Map(
    ["2022-suneung-q19", "2023-09-q15", "2023-suneung-q19"].flatMap((prefix) =>
      ["ㄱ", "ㄴ", "ㄷ", "ㄹ"].map((sourceItem, index) => [
        `${prefix}-opt-${String(index + 1).padStart(2, "0")}`,
        sourceItem,
      ])
    )
  );
  const expectedAdministrations = [
    "2021-06",
    "2021-09",
    "2021-suneung",
    "2022-06",
    "2022-09",
    "2022-suneung",
    "2023-06",
    "2023-09",
    "2023-suneung",
    "2024-06",
    "2024-09",
    "2024-suneung",
    "2025-06",
    "2025-09",
    "2025-suneung",
  ];
  const knownPredicates = new Set(["coldestMonthAtLeast18", "coldestMonthBelow18", "southernHemisphere"]);
  const dangerousReferenceOnlyIds = new Set([
    "2021-06-q09-opt-01",
    "2021-06-q09-opt-02",
    "2021-09-q07-opt-02",
    "2021-09-q07-opt-03",
    "2021-09-q07-opt-01",
    "2021-suneung-q17-opt-02",
    "2021-suneung-q17-opt-03",
    "2021-suneung-q17-opt-04",
    "2022-09-q05-opt-03",
    "2022-09-q05-opt-04",
    "2022-09-q13-opt-03",
    "2024-06-q20-opt-01",
    "2024-06-q20-opt-02",
    "2024-06-q20-opt-03",
    "2025-suneung-q13-opt-03",
    "2025-suneung-q19-opt-02",
  ]);
  const forbiddenLegacyIds = new Set([
    "2022-suneung-q17-opt-01",
    "2023-06-q05-opt-01",
    "2023-06-q13-opt-01",
    "2023-09-q16-opt-01",
    "2025-06-q19-opt-01",
    "2025-09-q19-opt-05",
  ]);
  const templateSourceIds = new Set(
    [...appText.matchAll(/sourceIds:\s*\[([\s\S]*?)\]/g)].flatMap((match) =>
      [...match[1].matchAll(/["']([^"']+)["']/g)].map((idMatch) => idMatch[1])
    )
  );
  const ids = new Set();

  if (statements.length < 85) {
    errors.push(`기후 선지 수가 기대치보다 적습니다: ${statements.length} / 85`);
  }

  for (const statement of statements) {
    if (!statement.id || ids.has(statement.id)) errors.push(`기후 선지 id가 없거나 중복됩니다: ${statement.id || "(없음)"}`);
    ids.add(statement.id);
    if (!allowedKinds.has(statement.kind)) errors.push(`${statement.id}: 허용되지 않은 kind ${statement.kind}`);
    if (!statement.source || !statement.text || !Array.isArray(statement.tags) || statement.tags.length === 0) {
      errors.push(`${statement.id}: source, text, tags 중 필수값이 비어 있습니다.`);
    }
    if (statement.automation && !allowedAutomation.has(statement.automation)) {
      errors.push(`${statement.id}: 허용되지 않은 automation ${statement.automation}`);
    }
    if (statement.kind === "region-feature" && !statement.automation) {
      errors.push(`${statement.id}: 지역 특성 선지에 automation 안전 등급이 없습니다.`);
    }
    if (statement.automation === "computed" && !knownPredicates.has(statement.predicateKey)) {
      errors.push(`${statement.id}: 알려지지 않은 계산 predicate ${statement.predicateKey || "(없음)"}`);
    }
    if (statement.automation === "climate-group" && !statement.climateGroups?.length) {
      errors.push(`${statement.id}: climate-group 자동화에 climateGroups가 없습니다.`);
    }
    if (statement.kind === "comparison-source" && !templateSourceIds.has(statement.id) && statement.automation !== "reference-only") {
      errors.push(`${statement.id}: 비교 템플릿에 연결되지 않았고 참조 전용 표시도 없습니다.`);
    }
    if (statement.normalized && !allowedNormalizationKinds.has(statement.normalizationKind)) {
      errors.push(`${statement.id}: normalized 선지의 normalizationKind가 없거나 잘못되었습니다: ${statement.normalizationKind || "(없음)"}`);
    }
    if (!statement.normalized && statement.normalizationKind) {
      errors.push(`${statement.id}: normalized가 아닌 선지에 normalizationKind가 지정되었습니다.`);
    }
    if (statement.sourceItem && !["ㄱ", "ㄴ", "ㄷ", "ㄹ"].includes(statement.sourceItem)) {
      errors.push(`${statement.id}: 허용되지 않은 sourceItem ${statement.sourceItem}`);
    }
  }

  const normalizedStatements = statements.filter((statement) => statement.normalized);
  if (normalizedStatements.length !== 27) {
    errors.push(`정규화 선지 수가 다릅니다: ${normalizedStatements.length} / 27`);
  }
  for (const [normalizationKind, expectedCount] of expectedNormalizationCounts) {
    const count = normalizedStatements.filter((statement) => statement.normalizationKind === normalizationKind).length;
    if (count !== expectedCount) {
      errors.push(`정규화 유형 ${normalizationKind} 수가 다릅니다: ${count} / ${expectedCount}`);
    }
  }
  for (const [id, sourceItem] of requiredSourceItems) {
    const statement = statements.find((item) => item.id === id);
    if (statement?.sourceItem !== sourceItem) {
      errors.push(`${id}: <보기> 출처 항목이 ${sourceItem}으로 기록되지 않았습니다.`);
    }
  }
  const sourceItemCount = statements.filter((statement) => statement.sourceItem).length;
  if (sourceItemCount !== requiredSourceItems.size) {
    errors.push(`<보기> 출처 항목 수가 다릅니다: ${sourceItemCount} / ${requiredSourceItems.size}`);
  }
  if (
    normalizedStatements.length > 0 &&
    (!["기간 확정", "논리 반전", "참 명제 재작성"].every((label) => appText.includes(label)) ||
      !appText.includes("원문 그대로가 아님"))
  ) {
    errors.push("정규화한 기출 기반 선지가 UI에서 유형별로 구분되지 않습니다.");
  }
  const questionChoiceMarkup = appText.slice(
    appText.indexOf('<ol class="exam-choice-list">'),
    appText.indexOf('<details class="exam-answer-details">')
  );
  if (questionChoiceMarkup.includes("renderExamTruthBadge(choice)")) {
    errors.push("정답 보기 전 선택지 목록에 정답·오답 배지가 노출됩니다.");
  }

  for (const sourceId of templateSourceIds) {
    if (!ids.has(sourceId)) errors.push(`${sourceId}: 비교 템플릿이 존재하지 않는 선지 id를 참조합니다.`);
  }

  const automatableFeatureIds = statements
    .filter(
      (statement) =>
        statement.kind === "region-feature" &&
        ["computed", "climate-group", "allowlist"].includes(statement.automation)
    )
    .map((statement) => statement.id);
  const automatedIds = new Set([...templateSourceIds, ...automatableFeatureIds]);
  const referenceOnlyCount = statements.filter((statement) => !automatedIds.has(statement.id)).length;
  if (automatedIds.size !== 53 || referenceOnlyCount !== 32) {
    errors.push(`기후 자동/참조 선지 수가 다릅니다: 자동 ${automatedIds.size} / 참조 ${referenceOnlyCount}`);
  }

  for (const prefix of expectedAdministrations) {
    if (!statements.some((statement) => statement.id.startsWith(`${prefix}-`))) {
      errors.push(`기후 레지스트리에 ${prefix} 회차가 없습니다.`);
    }
  }
  for (const id of dangerousReferenceOnlyIds) {
    if (statements.find((statement) => statement.id === id)?.automation !== "reference-only") {
      errors.push(`${id}: 현재 자료만으로 판정할 수 없는 선지가 자동 생성에 열려 있습니다.`);
    }
  }
  for (const id of forbiddenLegacyIds) {
    if (ids.has(id)) errors.push(`${id}: 잘못 붙었던 구 출처 id가 남아 있습니다.`);
  }

  for (const required of [
    "janJulPrecipitationRange",
    "janJulTemperatureRange",
    "monthlyPrecipitationRange",
    "winterPrecipitationShare",
    "summerPrecipitation",
    "summerPrecipitationShare",
    "getLocalSeasonPrecipitationShare",
    "EXAM_FEATURE_PREDICATES",
    "EXAM_NORMALIZATION_LABELS",
    "isExamFeatureAutomatable",
    "renderExamNormalizationBadges",
    "formatExamStatementSource",
    "참조 전용 선지",
    "examSourcePanelWasOpen",
    "withSubjectParticle",
    "withObjectParticle",
  ]) {
    if (!appText.includes(required)) errors.push(`기후 자동화 구현이 누락되었습니다: ${required}`);
  }
  for (const forbidden of [
    "${example.higherName}이 ",
    "${correctEntry.region.name}이 ",
    "${region.name}은 ",
    "은(는)",
    "을(를)",
  ]) {
    if (appText.includes(forbidden)) errors.push(`기후 자동 문장에 고정 조사가 남아 있습니다: ${forbidden}`);
  }
  if (appText.includes("return regionMatches || climateMatches")) {
    errors.push("기후형 코드만으로 모든 정성 선지를 참으로 판정하던 구 로직이 남아 있습니다.");
  }
}

function validateChoicePatterns(patterns, appText) {
  const expectedUnits = new Set(["landform", "religion", "population", "urban", "resources", "regional"]);
  const allowedAutomation = new Set(["static", "derived", "yearly", "context-only"]);
  const requiredFields = ["id", "unit", "title", "template", "rule", "trap", "automation"];
  const ids = new Set();

  if (patterns.length !== 61) errors.push(`타 단원 패턴 수가 다릅니다: ${patterns.length} / 61`);

  for (const pattern of patterns) {
    if (!pattern.id || ids.has(pattern.id)) errors.push(`타 단원 패턴 id가 없거나 중복됩니다: ${pattern.id || "(없음)"}`);
    ids.add(pattern.id);
    for (const field of requiredFields) {
      if (!String(pattern[field] ?? "").trim()) errors.push(`${pattern.id}: ${field}가 비어 있습니다.`);
    }
    if (!expectedUnits.has(pattern.unit)) errors.push(`${pattern.id}: 허용되지 않은 unit ${pattern.unit}`);
    if (!allowedAutomation.has(pattern.automation)) errors.push(`${pattern.id}: 허용되지 않은 automation ${pattern.automation}`);
    if (!Array.isArray(pattern.tags) || pattern.tags.length === 0) errors.push(`${pattern.id}: tags가 비어 있습니다.`);
    if (!Array.isArray(pattern.sources) || pattern.sources.length < 2) errors.push(`${pattern.id}: 기출 출처가 2개 미만입니다.`);
    for (const source of pattern.sources ?? []) {
      if (!/^202[1-5]학년도 (6월 모의평가|9월 모의평가|수능) [1-9][0-9]?번$/.test(source)) {
        errors.push(`${pattern.id}: 기출 출처 표기 형식이 잘못되었습니다: ${source}`);
      }
    }
    if (pattern.automation === "yearly" && !/연도|기준 시점|출처/.test(`${pattern.rule} ${pattern.trap}`)) {
      errors.push(`${pattern.id}: 연도형 규칙에 연도·시점·출처 안전 조건이 없습니다.`);
    }
    if (pattern.automation === "context-only" && !/자료|제시/.test(`${pattern.rule} ${pattern.trap}`)) {
      errors.push(`${pattern.id}: 맥락형 규칙에 제시 자료 조건이 없습니다.`);
    }
  }

  const patternById = new Map(patterns.map((pattern) => [pattern.id, pattern]));
  if (!patternById.get("urban-02")?.rule.includes("/ 100")) {
    errors.push("urban-02: 0~100 도시화율을 인구에 곱할 때 / 100 보정이 없습니다.");
  }
  if (!patternById.get("resources-09")?.rule.includes("/ 100")) {
    errors.push("resources-09: 0~100 산업 비율을 GDP에 곱할 때 / 100 보정이 없습니다.");
  }
  if (patterns.some((pattern) => pattern.rule.includes("가장 이름"))) {
    errors.push("Choice Lab 판정 규칙에 '가장 이름' 오탈자가 남아 있습니다.");
  }

  for (const unit of expectedUnits) {
    const count = patterns.filter((pattern) => pattern.unit === unit).length;
    if (count < 8 || count > 12) errors.push(`${unit}: 단원별 패턴 수가 8~12 범위를 벗어납니다: ${count}`);
  }

  for (const required of ["UNIT_LABELS", "AUTOMATION_LABELS", "getFilteredPatterns", "copySelection", "원문 대조 필요"]) {
    if (!appText.includes(required)) errors.push(`Choice Lab 구현이 누락되었습니다: ${required}`);
  }
}

function smokeRunClimate(statements, appText) {
  const combinations = [
    ["케이프타운", "브라질리아", "파리", "양곤"],
    ["배로", "카이로", "싱가포르", "시드니"],
    ["몬트리올", "샌프란시스코", "멕시코시티", "부에노스아이레스"],
    ["런던", "울란바토르", "자카르타", "리마"],
  ];
  const context = {
    window: { EXAM_CLIMATE_STATEMENTS: statements },
    document: {
      querySelector() {
        return null;
      },
    },
    console,
  };
  vm.createContext(context);

  const appWithoutInit = appText.replace("\ninit();\n", "\n");
  if (appWithoutInit === appText) {
    errors.push("Climate 생성 smoke에서 앱 자동 초기화를 분리하지 못했습니다.");
    return 0;
  }

  const smokeExports = `
    window.__CLIMATE_EXAM_SMOKE__ = {
      buildExamMonthContext,
      buildExamGeneratedComparisonGroups,
      getMatchedExamFeatureGroups,
      buildExamMultipleChoiceQuestion,
      getExamClimateStatements,
      setQuestionSeed(value) { state.examQuestionSeed = value; },
    };
  `;

  try {
    vm.runInContext(fs.readFileSync(climateDatasetPath, "utf8"), context, { filename: climateDatasetPath });
    vm.runInContext(`${appWithoutInit}\n${smokeExports}`, context, { filename: climateAppPath });

    const api = context.window.__CLIMATE_EXAM_SMOKE__;
    const regions = context.window.CLIMATE_DATA?.regions ?? [];
    const statementRegistry = api.getExamClimateStatements();

    combinations.forEach((names, combinationIndex) => {
      const selectedRegions = names.map((name) => regions.find((region) => region.name === name));
      const missingNames = names.filter((name, index) => !selectedRegions[index]);
      if (missingNames.length > 0) {
        errors.push(`Climate 생성 smoke 지역을 찾지 못했습니다: ${missingNames.join(", ")}`);
        return;
      }

      const monthContext = api.buildExamMonthContext(combinationIndex % 2 === 0 ? 0 : 6, false);
      const buildQuestion = () => {
        api.setQuestionSeed(combinationIndex + 1);
        const comparisonGroups = api.buildExamGeneratedComparisonGroups(
          selectedRegions,
          statementRegistry,
          monthContext
        );
        const featureGroups = api.getMatchedExamFeatureGroups(selectedRegions, statementRegistry);
        return api.buildExamMultipleChoiceQuestion(
          selectedRegions,
          comparisonGroups,
          featureGroups,
          statementRegistry,
          monthContext
        );
      };
      const firstQuestion = buildQuestion();
      const secondQuestion = buildQuestion();
      const label = names.join(" · ");

      if (!firstQuestion || !secondQuestion) {
        errors.push(`Climate 생성 smoke가 5지선다를 만들지 못했습니다: ${label}`);
        return;
      }
      const trueCount = firstQuestion.choices.filter((choice) => choice.isTrue).length;
      const falseCount = firstQuestion.choices.filter((choice) => !choice.isTrue).length;
      if (firstQuestion.choices.length !== 5 || trueCount !== 1 || falseCount !== 4) {
        errors.push(
          `Climate 생성 smoke 선지 구성이 잘못되었습니다 (${label}): 전체 ${firstQuestion.choices.length}, 참 ${trueCount}, 거짓 ${falseCount}`
        );
      }
      if (firstQuestion.answerIndex < 0 || !firstQuestion.choices[firstQuestion.answerIndex]?.isTrue) {
        errors.push(`Climate 생성 smoke 정답 인덱스가 참 선지를 가리키지 않습니다: ${label}`);
      }
      if (
        firstQuestion.choices.some(
          (choice) => !Array.isArray(choice.evidence?.rows) || choice.evidence.rows.length === 0
        )
      ) {
        errors.push(`Climate 생성 smoke 선지에 근거 데이터가 없습니다: ${label}`);
      }

      const serializeQuestion = (question) =>
        JSON.stringify({
          answerIndex: question.answerIndex,
          choices: question.choices.map((choice) => ({
            text: choice.text,
            isTrue: choice.isTrue,
            categoryKey: choice.categoryKey,
          })),
        });
      if (serializeQuestion(firstQuestion) !== serializeQuestion(secondQuestion)) {
        errors.push(`Climate 생성 smoke가 같은 seed에서 결정론적으로 재현되지 않습니다: ${label}`);
      }
    });
  } catch (error) {
    errors.push(`Climate 생성 smoke 실행이 실패합니다: ${error instanceof Error ? error.message : String(error)}`);
    return 0;
  }

  return combinations.length;
}

function smokeRunChoiceLab(patterns, appText) {
  const elements = new Map();
  const createElementStub = () => ({
    value: "",
    textContent: "",
    innerHTML: "",
    hidden: false,
    disabled: false,
    addEventListener() {},
    append() {},
    select() {},
    remove() {},
  });
  const document = {
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, createElementStub());
      return elements.get(selector);
    },
    createElement: createElementStub,
    body: createElementStub(),
    execCommand() {
      return true;
    },
  };
  const context = {
    window: { EXAM_CHOICE_PATTERNS: patterns },
    document,
    navigator: { clipboard: { writeText: async () => {} } },
    console,
  };
  vm.createContext(context);
  try {
    vm.runInContext(appText, context, { filename: choiceAppPath });
    const sourceSearchCount = vm.runInContext(
      'state.query = normalizeText("2025 수능"); getFilteredPatterns().length',
      context
    );
    if (sourceSearchCount !== 13) {
      errors.push(`Choice Lab '2025 수능' 검색 결과가 다릅니다: ${sourceSearchCount} / 13`);
    }
  } catch (error) {
    errors.push(`Choice Lab 초기 렌더링이 실패합니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function loadWindowArray(filePath, key) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(filePath, "utf8"), context, { filename: filePath });
  const value = context.window[key];
  if (!Array.isArray(value)) {
    throw new Error(`${path.relative(rootDir, filePath)}에서 window.${key} 배열을 찾지 못했습니다.`);
  }
  return value;
}

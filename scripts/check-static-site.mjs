import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootArgument = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const rootDir = rootArgument ? path.resolve(projectRoot, rootArgument) : projectRoot;
const htmlFiles = [
  path.join(rootDir, "index.html"),
  path.join(rootDir, "map.html"),
  path.join(rootDir, "tools", "stats", "index.html"),
  path.join(rootDir, "tools", "climate", "index.html"),
  path.join(rootDir, "tools", "climate", "korea.html"),
  path.join(rootDir, "tools", "cut", "index.html"),
];
const errors = [];
let localReferenceCount = 0;

for (const htmlPath of htmlFiles) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const referencePattern = /\b(?:href|src)=["']([^"']+)["']/g;

  for (const match of html.matchAll(referencePattern)) {
    const reference = match[1];
    if (isExternalReference(reference)) continue;

    const cleanReference = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
    if (!cleanReference) continue;

    const resolvedPath = cleanReference.startsWith("/")
      ? path.join(rootDir, cleanReference)
      : path.resolve(path.dirname(htmlPath), cleanReference);
    localReferenceCount += 1;

    if (!fs.existsSync(resolvedPath)) {
      errors.push(
        `${path.relative(rootDir, htmlPath)}: ${reference} -> ${path.relative(rootDir, resolvedPath)}`
      );
    }
  }
}

const graphCatalogPath = path.join(rootDir, "data", "graph-catalog.json");
const graphCatalog = JSON.parse(fs.readFileSync(graphCatalogPath, "utf8"));
const graphItems = Array.isArray(graphCatalog.items) ? graphCatalog.items : [];
if (graphItems.length === 0 || Number(graphCatalog.meta?.itemCount) !== graphItems.length) {
  errors.push(`기존 그래프 카탈로그 수 불일치: ${graphCatalog.meta?.itemCount} / ${graphItems.length}`);
}
if (graphCatalog.meta?.schemaVersion !== 2 || graphItems.some((item) => !item.examPattern)) {
  errors.push("기존 그래프 카탈로그에 수능형 패턴 분류가 없습니다.");
}
const catalogReferenceOnlyCount = graphItems.filter((item) => item.examPattern === "reference-only").length;
if (Number(graphCatalog.meta?.referenceOnlyCount) !== catalogReferenceOnlyCount) {
  errors.push(`기존 그래프 참고 전용 수 불일치: ${graphCatalog.meta?.referenceOnlyCount} / ${catalogReferenceOnlyCount}`);
}

const statisticsIndexPath = path.join(rootDir, "data", "statistics-index.json");
const statisticsIndex = JSON.parse(fs.readFileSync(statisticsIndexPath, "utf8"));
const indexedMetrics = Array.isArray(statisticsIndex.metrics) ? statisticsIndex.metrics : [];
const examPatterns = Array.isArray(statisticsIndex.graphPatterns) ? statisticsIndex.graphPatterns : [];
if (indexedMetrics.length !== Number(statisticsIndex.coverage?.metricIndexEntries)) {
  errors.push(`통계 색인 지표 수 불일치: ${indexedMetrics.length} / ${statisticsIndex.coverage?.metricIndexEntries}`);
}
const indexedExamReferenceCount = examPatterns.reduce((sum, pattern) => sum + Number(pattern.count || 0), 0);
if (
  examPatterns.length !== 7 ||
  indexedExamReferenceCount !== Number(statisticsIndex.coverage?.examPatternReferences) ||
  catalogReferenceOnlyCount !== Number(statisticsIndex.coverage?.referenceOnlyReferences) ||
  indexedExamReferenceCount + catalogReferenceOnlyCount !== graphItems.length
) {
  errors.push("통계 색인의 수능형 SVG 패턴 수가 맞지 않습니다.");
}
const statsUiText = [
  fs.readFileSync(path.join(rootDir, "tools", "stats", "index.html"), "utf8"),
  fs.readFileSync(path.join(rootDir, "tools", "stats", "app.js"), "utf8"),
].join("\n");
for (const forbidden of ["SidaeAi_S", "downloadSvgButton", "downloadCurrentSvg", "탐색기에서 열기"]) {
  if (statsUiText.includes(forbidden)) errors.push(`Data Library에 제거 대상 기능이 남아 있습니다: ${forbidden}`);
}

const mapAppText = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const randomScenarioStart = mapAppText.indexOf("function getExamGraphRandomScenarioPool()");
const randomScenarioEnd = mapAppText.indexOf("\nfunction ", randomScenarioStart + 1);
const randomScenarioText = randomScenarioStart >= 0
  ? mapAppText.slice(randomScenarioStart, randomScenarioEnd >= 0 ? randomScenarioEnd : undefined)
  : "";
const drillScenarioStart = mapAppText.indexOf("const examDrillScenarioDefinitions = [");
const drillScenarioEnd = mapAppText.indexOf("\n];", drillScenarioStart + 1);
const drillScenarioText = drillScenarioStart >= 0
  ? mapAppText.slice(drillScenarioStart, drillScenarioEnd >= 0 ? drillScenarioEnd + 3 : undefined)
  : "";
if (!randomScenarioText || /presetKey:\s*["']rankBars["']/.test(randomScenarioText)) {
  errors.push("Graph Builder 랜덤 추천에 단일 지표 순위가 남아 있습니다.");
}
if (!drillScenarioText || /skillKey:\s*["']rank["']/.test(drillScenarioText)) {
  errors.push("Exam Drill 자동 후보에 단일 지표 순위가 남아 있습니다.");
}
if (/state\.examGraphPresetKey\s*=\s*["']rankBars["']/.test(mapAppText)) {
  errors.push("일반 탐색 동작이 Graph Builder를 단일 지표 순위로 강제합니다.");
}

const supplementalPath = path.join(rootDir, "data", "supplemental-stats.json");
const supplemental = JSON.parse(fs.readFileSync(supplementalPath, "utf8"));
const supplementalDatasets = Array.isArray(supplemental.datasets) ? supplemental.datasets : [];
const supplementalPointers = Array.isArray(supplemental.sourcePointers) ? supplemental.sourcePointers : [];
if (supplementalDatasets.length === 0 || Number(supplemental.meta?.normalizedDatasetCount) !== supplementalDatasets.length) {
  errors.push("보완 통계 공개 레지스트리의 데이터셋 수가 비어 있거나 메타와 다릅니다.");
}
if (Number(supplemental.meta?.sourcePointerCount) !== supplementalPointers.length) {
  errors.push("보완 통계 공개 레지스트리의 원천 포인터 수가 메타와 다릅니다.");
}
const supplementalText = JSON.stringify(supplemental);
for (const forbidden of ["sourceRootConfig", "data_downloads/", "/Users/", "Documents/New project", "Fieldwork_"]) {
  if (supplementalText.includes(forbidden)) errors.push(`보완 통계 공개본에 내부 경로 단서가 남아 있습니다: ${forbidden}`);
}

const worldClimate = JSON.parse(fs.readFileSync(path.join(rootDir, "tools", "climate", "data", "climate-data.json"), "utf8"));
const koreaClimate = JSON.parse(fs.readFileSync(path.join(rootDir, "tools", "climate", "data", "korea-climate-data.json"), "utf8"));
if (worldClimate.regions?.length !== worldClimate.summary?.regionCount) {
  errors.push(`세계 기후 지점 수 불일치: ${worldClimate.regions?.length} / ${worldClimate.summary?.regionCount}`);
}
if (koreaClimate.regions?.length !== koreaClimate.summary?.regionCount) {
  errors.push(`한국 기후 지점 수 불일치: ${koreaClimate.regions?.length} / ${koreaClimate.summary?.regionCount}`);
}

const cutDataPath = path.join(rootDir, "tools", "cut", "data", "ebsi_geo_data.json");
const cutData = JSON.parse(fs.readFileSync(cutDataPath, "utf8"));
const cutRecords = Array.isArray(cutData.records) ? cutData.records : [];
if (cutRecords.length === 0) {
  errors.push("EBSi 등급컷 records가 비어 있습니다.");
}

const questionManifestPath = path.join(
  rootDir,
  "tools",
  "cut",
  "data",
  "question-image-manifest.json"
);
if (!fs.existsSync(questionManifestPath)) {
  errors.push("문항 이미지 manifest가 없습니다.");
} else {
  const questionManifest = JSON.parse(fs.readFileSync(questionManifestPath, "utf8"));
  const manifestItems = Array.isArray(questionManifest.items) ? questionManifest.items : [];
  const knownExamQuestions = new Set(
    cutRecords.flatMap((record) => (record.items || []).map((item) => [
      record.subject,
      record.exam_year,
      String(record.month).padStart(2, "0"),
      item.question,
    ].join("|")))
  );
  const manifestIds = new Set();
  let linkedImageCount = 0;
  let selectableImageCount = 0;

  if (manifestItems.length === 0) {
    errors.push("문항 이미지 manifest items가 비어 있습니다.");
  }
  if (Number(questionManifest.count) !== manifestItems.length) {
    errors.push(
      `문항 이미지 manifest count 불일치: ${questionManifest.count} / ${manifestItems.length}`
    );
  }

  for (const item of manifestItems) {
    if (!item.id || manifestIds.has(item.id)) {
      errors.push(`문항 이미지 id가 없거나 중복됩니다: ${item.id || "(없음)"}`);
      continue;
    }
    manifestIds.add(item.id);

    const examQuestionKey = [
      item.subject,
      item.exam_year,
      String(item.month).padStart(2, "0"),
      item.question,
    ].join("|");
    if (knownExamQuestions.has(examQuestionKey)) selectableImageCount += 1;

    const cleanUrl = String(item.url || "").split(/[?#]/, 1)[0];
    const imagePath = path.resolve(path.dirname(path.join(rootDir, "tools", "cut", "index.html")), cleanUrl);
    const cutRoot = path.join(rootDir, "tools", "cut") + path.sep;
    if (!cleanUrl || !imagePath.startsWith(cutRoot) || !fs.existsSync(imagePath)) {
      errors.push(`문항 이미지 파일을 찾지 못했습니다: ${item.id} -> ${item.url || "(없음)"}`);
      continue;
    }
    linkedImageCount += 1;
  }

  if (linkedImageCount !== manifestItems.length) {
    errors.push(`문항 이미지 연결 수 불일치: ${linkedImageCount} / ${manifestItems.length}`);
  }
  if (selectableImageCount === 0) {
    errors.push("선택 가능한 등급컷 기록과 연결된 문항 이미지가 없습니다.");
  }
}

if (errors.length > 0) {
  console.error(`정적 사이트 검증에 실패했습니다.\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `정적 사이트 검증 완료(${path.relative(projectRoot, rootDir) || "source"}): ` +
    `HTML ${htmlFiles.length}개 · 로컬 링크/에셋 ${localReferenceCount}개 · ` +
    `통계 색인 ${indexedMetrics.length}개 · SVG 패턴 ${examPatterns.length}종 · 보완 자료 ${supplementalDatasets.length}개 · ` +
    `등급컷 기록 ${cutRecords.length}개 · 문항 이미지 검증 완료`
);

function isExternalReference(reference) {
  return /^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(reference);
}

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUDIT_DIR = path.join(ROOT_DIR, "audits");
const JSON_PATH = path.join(ROOT_DIR, "data", "graph-catalog.json");
const JS_PATH = path.join(ROOT_DIR, "data", "graph-catalog.js");
const SUPPLEMENTAL_PATH = path.join(ROOT_DIR, "data", "supplemental-stats.json");
const args = process.argv.slice(2);
const shouldWrite = args.includes("--write");
const shouldCheck = args.includes("--check");
const explicitSource = readOption("--source");

if (shouldWrite === shouldCheck) fail("--write 또는 --check 중 하나만 지정해야 합니다.");

const sourcePath = explicitSource
  ? path.resolve(ROOT_DIR, explicitSource)
  : findLatestAuditPath();
const audit = readJson(sourcePath);
validateAuditRegistrySnapshot(audit, readJson(SUPPLEMENTAL_PATH));
const catalog = buildCatalog(audit, path.basename(sourcePath));
validateCatalog(catalog);

const jsonOutput = `${JSON.stringify(catalog, null, 2)}\n`;
const jsOutput = `window.GRAPH_REFERENCE_CATALOG = ${JSON.stringify(catalog)};\n`;

if (shouldWrite) {
  fs.writeFileSync(JSON_PATH, jsonOutput, "utf8");
  fs.writeFileSync(JS_PATH, jsOutput, "utf8");
  console.log(summary(catalog, "그래프 카탈로그 동기화 완료"));
} else {
  if (!fs.existsSync(JSON_PATH) || fs.readFileSync(JSON_PATH, "utf8") !== jsonOutput) {
    fail("graph-catalog.json이 최신 SVG 인벤토리와 일치하지 않습니다.");
  }
  if (!fs.existsSync(JS_PATH) || fs.readFileSync(JS_PATH, "utf8") !== jsOutput) {
    fail("graph-catalog.js가 graph-catalog.json과 일치하지 않습니다.");
  }
  console.log(summary(catalog, "그래프 카탈로그 검증 완료"));
}

function findLatestAuditPath() {
  if (!fs.existsSync(AUDIT_DIR)) fail("audits 디렉터리를 찾지 못했습니다.");
  const candidates = fs
    .readdirSync(AUDIT_DIR)
    .filter((filename) => /^svg-statistics-inventory-\d{8}\.json$/.test(filename))
    .sort();
  if (!candidates.length) fail("SVG 통계 인벤토리 JSON을 찾지 못했습니다.");
  return path.join(AUDIT_DIR, candidates.at(-1));
}

function buildCatalog(audit, sourceFilename) {
  const statisticsFiles = (audit.files ?? [])
    .filter((file) => file.category === "statistics")
    .sort((a, b) => basename(a.relativePath).localeCompare(basename(b.relativePath), "ko"));

  const items = statisticsFiles.map((file, index) => {
    const filename = basename(file.relativePath);
    return {
      id: `graph-${String(index + 1).padStart(3, "0")}`,
      filename,
      title: humanizeFilename(filename),
      topic: inferTopic(filename, file.sourceHints ?? []),
      chartType: inferChartType(filename),
      years: file.years ?? [],
      sourceResolution: file.sourceResolution,
      provenanceGap: Boolean(file.provenanceGap),
      unresolvedSource: Boolean(file.unresolvedSource),
      datasetIds: file.registryDatasetIds ?? [],
      sourcePointerIds: file.sourcePointerIds ?? [],
      relatedSourcePointerIds: file.relatedSourcePointerIds ?? [],
      sourceHints: file.sourceHints ?? [],
      sourceUrls: file.sourceUrls ?? [],
    };
  });

  return {
    meta: {
      schemaVersion: 1,
      snapshotDate: audit.meta?.snapshotDate ?? "unknown",
      sourceInventory: sourceFilename,
      description: "기존 통계 SVG를 값이나 로컬 경로 없이 탐색하기 위한 공개용 레퍼런스 카탈로그",
      itemCount: items.length,
      topicCounts: countBy(items, (item) => item.topic),
      chartTypeCounts: countBy(items, (item) => item.chartType),
      sourceResolutionCounts: countBy(items, (item) => item.sourceResolution),
      provenanceGapCount: items.filter((item) => item.provenanceGap).length,
      unresolvedSourceCount: items.filter((item) => item.unresolvedSource).length,
    },
    items,
  };
}

function validateCatalog(catalog) {
  if (catalog.meta?.schemaVersion !== 1) fail("지원하지 않는 그래프 카탈로그 스키마입니다.");
  if (!Array.isArray(catalog.items) || !catalog.items.length) fail("그래프 카탈로그가 비어 있습니다.");
  if (catalog.meta.itemCount !== catalog.items.length) fail("그래프 카탈로그 itemCount가 맞지 않습니다.");
  const ids = catalog.items.map((item) => item.id);
  const filenames = catalog.items.map((item) => item.filename);
  if (new Set(ids).size !== ids.length) fail("그래프 카탈로그 id가 중복됩니다.");
  if (new Set(filenames).size !== filenames.length) fail("그래프 카탈로그 filename이 중복됩니다.");
  for (const item of catalog.items) {
    if (!item.filename.endsWith(".svg")) fail(`${item.id}: SVG 파일명이 아닙니다.`);
    if (!item.title || !item.topic || !item.chartType) fail(`${item.id}: 탐색 메타데이터가 부족합니다.`);
  }
}

function validateAuditRegistrySnapshot(audit, supplemental) {
  const snapshot = audit.registrySnapshot || {};
  if (snapshot.generatedAt !== supplemental.meta?.generatedAt) {
    fail("SVG 인벤토리가 현재 보완 통계 레지스트리보다 오래됐습니다. 인벤토리를 다시 생성하세요.");
  }
  const datasetIds = (supplemental.datasets || []).map((entry) => entry.id);
  const pointerIds = (supplemental.sourcePointers || []).map((entry) => entry.id);
  if (JSON.stringify(snapshot.datasetIds || []) !== JSON.stringify(datasetIds)) {
    fail("SVG 인벤토리의 보완 데이터셋 목록이 현재 레지스트리와 다릅니다.");
  }
  if (JSON.stringify(snapshot.sourcePointerIds || []) !== JSON.stringify(pointerIds)) {
    fail("SVG 인벤토리의 원천 포인터 목록이 현재 레지스트리와 다릅니다.");
  }
}

function inferTopic(filename, sourceHints) {
  const text = `${filename} ${sourceHints.join(" ")}`.toLowerCase();
  const rules = [
    [/(climate|temperature|precip|snow|heatwave|monsoon|permafrost|rhine|pollution)/, "기후·환경"],
    [/(energy|renewable|electricity|power|generation|fossil|coal|oil|gas)/, "에너지"],
    [/(population|age|sex_ratio|pyramid|migration|foreign|refugee|urban|(?:^|[_\s-])city(?:[_\s-]|$))/, "인구·도시"],
    [/(crop|coffee|cacao|cobalt|tea|rubber|palm|agri|farm|livestock)/, "농업·자원"],
    [/(export|import|trade|freight|manufacturing|shipments|travel|passenger)/, "산업·교통"],
    [/(coast|profile|alluvial|distance|extremes|srtm|elevation)/, "지형·위치"],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? "기타 통계";
}

function inferChartType(filename) {
  const text = filename.toLowerCase();
  const rules = [
    [/(scatter|correlation)/, "산점도"],
    [/(pyramid)/, "인구 피라미드"],
    [/(donut|pie)/, "원·도넛"],
    [/(table)/, "표"],
    [/(profile|cross_section)/, "단면도"],
    [/(hourly|timeline|time_series|index_|_trend|growth)/, "시계열"],
    [/(share|mix|structure|top\d|top_|exports|imports|capacity|supply)/, "구성·비교"],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? "비교 그래프";
}

function humanizeFilename(filename) {
  return filename
    .replace(/\.svg$/i, "")
    .replace(/_\d{2,4}px$/i, "")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function basename(relativePath) {
  return String(relativePath ?? "").split("/").at(-1) ?? "";
}

function countBy(items, getKey) {
  return Object.fromEntries(
    [...items.reduce((counts, item) => {
      const key = getKey(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map())].sort(([a], [b]) => String(a).localeCompare(String(b), "ko"))
  );
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) fail(`파일을 찾지 못했습니다: ${filePath}`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${filePath}을 JSON으로 읽지 못했습니다: ${error.message}`);
  }
}

function readOption(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  const value = args[index + 1];
  if (!value || value.startsWith("--")) fail(`${name} 뒤에 경로가 필요합니다.`);
  return value;
}

function summary(catalog, prefix) {
  return (
    `${prefix}: ${catalog.meta.itemCount}개 · 상위 원천 미기록 ${catalog.meta.provenanceGapCount}개 · ` +
    `미해결 ${catalog.meta.unresolvedSourceCount}개`
  );
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

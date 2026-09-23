import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "dist");
const publicEntries = [
  ".nojekyll",
  "index.html",
  "portal.css",
  "ds",
  "data",
  "fonts",
  "tools",
];
const requiredOutputs = [
  "index.html",
  "data/graph-catalog.js",
  "data/graph-catalog.json",
  "data/statistics-index.js",
  "data/statistics-index.json",
  "data/supplemental-stats.js",
  "data/supplemental-stats.json",
  "tools/climate/index.html",
  "tools/climate/data/climate-data.js",
  "tools/climate/data/climate-data.json",
  "tools/climate/korea.html",
  "tools/climate/data/korea-climate-data.js",
  "tools/climate/data/korea-climate-data.json",
  "tools/climate/data/exam-climate-statements.js",
  "tools/cut/index.html",
  "tools/stats/index.html",
  "tools/stats/data/stats.json",
  "tools/cut/data/ebsi_geo_data.json",
  "tools/cut/data/question-image-manifest.json",
  "tools/cut/question-images",
];
const forbiddenOutputs = [
  "map.html",
  "app.js",
  "styles.css",
  "tokens.css",
  "base.css",
  "components.css",
  "patterns.css",
  "vendor",
  "data/country-stats.js",
  "data/embedded-font.js",
  "data/exam-country-catalog.js",
  "data/korea-admin.js",
  "data/korea-routes.js",
  "data/korea-stats.js",
  "data/world-atlas.js",
  "data/world-atlas-variants.js",
  "data/world-lakes.js",
  "tools/choices",
];
const unpublishedToolRoots = ["tools/choices"];
const publicStatsFiles = new Set([
  "tools/stats", "tools/stats/index.html", "tools/stats/app.js", "tools/stats/styles.css",
  "tools/stats/data", "tools/stats/data/stats.json",
]);
const publicDataFiles = new Set([
  "data/graph-catalog.js",
  "data/graph-catalog.json",
  "data/statistics-index.js",
  "data/statistics-index.json",
  "data/supplemental-stats.js",
  "data/supplemental-stats.json",
]);

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const entry of publicEntries) {
  const sourcePath = path.join(rootDir, entry);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`공개 파일을 찾지 못했습니다: ${entry}`);
  }

  fs.cpSync(sourcePath, path.join(outputDir, entry), {
    recursive: true,
    filter: shouldPublish,
  });
}

for (const requiredPath of requiredOutputs) {
  if (!fs.existsSync(path.join(outputDir, requiredPath))) {
    throw new Error(`빌드 결과에 필수 파일이 없습니다: ${requiredPath}`);
  }
}

for (const forbiddenPath of forbiddenOutputs) {
  if (fs.existsSync(path.join(outputDir, forbiddenPath))) {
    throw new Error(`공개 제외 파일이 정적 빌드에 남았습니다: ${forbiddenPath}`);
  }
}

const publishedFiles = listFiles(outputDir);
const totalBytes = publishedFiles.reduce(
  (total, filePath) => total + fs.statSync(filePath).size,
  0
);

console.log(
  `정적 사이트 빌드 완료: ${publishedFiles.length.toLocaleString("ko-KR")}개 파일 · ` +
    `${formatMegabytes(totalBytes)} MB`
);

function shouldPublish(sourcePath) {
  const relativePath = path.relative(rootDir, sourcePath).split(path.sep).join("/");
  if (!relativePath) return true;
  if (path.basename(sourcePath) === ".DS_Store") return false;
  if (relativePath.startsWith("data/") && !publicDataFiles.has(relativePath)) return false;
  if (relativePath.startsWith("tools/stats") && !publicStatsFiles.has(relativePath)) return false;
  if (unpublishedToolRoots.some((root) => relativePath === root || relativePath.startsWith(`${root}/`))) {
    return false;
  }
  if (/^tools\/climate\/data\/climate-data_jma_\d{8}\.json$/.test(relativePath)) {
    return false;
  }
  if (/^tools\/climate\/data\/korea-climate-data_kma_\d{8}\.json$/.test(relativePath)) {
    return false;
  }
  return true;
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

function formatMegabytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(1);
}

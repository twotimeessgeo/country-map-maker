import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "dist");
const publicEntries = [
  ".nojekyll",
  "index.html",
  "map.html",
  "app.js",
  "portal.js",
  "tokens.css",
  "base.css",
  "components.css",
  "patterns.css",
  "styles.css",
  "portal.css",
  "assets",
  "data",
  "fonts",
  "vendor",
  "tools",
];
const requiredOutputs = [
  "index.html",
  "map.html",
  "app.js",
  "portal.js",
  "data/korea-admin.js",
  "data/korea-routes.js",
  "data/korea-stats.js",
  "tools/climate/index.html",
  "tools/climate/data/climate-data.js",
  "tools/climate/data/climate-data.json",
  "tools/climate/korea.html",
  "tools/cut/index.html",
  "tools/cut/data/cut-data.js",
];

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
  if (/^tools\/climate\/data\/climate-data_jma_\d{8}\.json$/.test(relativePath)) {
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

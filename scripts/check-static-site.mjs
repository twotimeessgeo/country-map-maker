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

const manifestPath = path.join(rootDir, "tools", "cut", "data", "question-image-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (!Array.isArray(manifest.items)) {
  errors.push("문항 이미지 manifest의 items가 배열이 아닙니다.");
} else {
  if (manifest.count !== manifest.items.length) {
    errors.push(`문항 이미지 manifest count(${manifest.count})와 items(${manifest.items.length})가 다릅니다.`);
  }

  const cutDir = path.join(rootDir, "tools", "cut");
  for (const item of manifest.items) {
    const imagePath = path.resolve(cutDir, String(item.url ?? ""));
    if (!item.url || !fs.existsSync(imagePath)) {
      errors.push(`문항 이미지 누락: ${item.id ?? "id 없음"} -> ${item.url ?? "url 없음"}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`정적 사이트 검증에 실패했습니다.\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `정적 사이트 검증 완료(${path.relative(projectRoot, rootDir) || "source"}): ` +
    `HTML ${htmlFiles.length}개 · 로컬 링크/에셋 ${localReferenceCount}개 · ` +
    `문항 이미지 ${manifest.items.length}개`
);

function isExternalReference(reference) {
  return /^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(reference);
}

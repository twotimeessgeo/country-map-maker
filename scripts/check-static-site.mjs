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
    `등급컷 기록 ${cutRecords.length}개 · 문항 이미지 검증 완료`
);

function isExternalReference(reference) {
  return /^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(reference);
}

import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootArgument = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const rootDir = rootArgument ? path.resolve(projectRoot, rootArgument) : projectRoot;
const isSourceCheck = rootDir === projectRoot;
const publicHtmlFiles = [
  path.join(rootDir, "index.html"),
  path.join(rootDir, "tools", "climate", "index.html"),
  path.join(rootDir, "tools", "climate", "korea.html"),
  path.join(rootDir, "tools", "cut", "index.html"),
  path.join(rootDir, "tools", "stats", "index.html"),
  path.join(rootDir, "notes", "index.html"),
  path.join(rootDir, "notes", "2027-09-world", "index.html"),
];
const htmlFiles = isSourceCheck
  ? [
      ...publicHtmlFiles,
      path.join(rootDir, "map.html"),
      path.join(rootDir, "tools", "choices", "index.html"),
    ]
  : publicHtmlFiles;
const errors = [];
if (isSourceCheck) {
  try {
    execFileSync(process.execPath, [path.join(projectRoot, "scripts", "build-climate-mini-maps.mjs"), "--check"], { stdio: "pipe" });
  } catch (error) {
    errors.push(`Climate 위치 지도 생성본 검사 실패: ${error.message}`);
  }
}
for (const name of ["world-mini.svg", "korea-mini.svg"]) {
  if (!fs.existsSync(path.join(rootDir, "tools", "climate", "data", name))) {
    errors.push(`Climate 위치 지도가 없습니다: ${name}`);
  }
}
try {
  const geo=vm.createContext({window:{}});
  for(const name of ["vendor-d3.min.js","vendor-topojson-client.min.js"])
    vm.runInContext(fs.readFileSync(path.join(rootDir,"tools","climate","data",name),"utf8"),geo);
  const halfSphere=2*Math.PI;
  for(const resolution of ["110m","50m","10m"]) {
    const topology=JSON.parse(fs.readFileSync(path.join(rootDir,"tools","climate","data",`world-countries-${resolution}.json`),"utf8"));
    for(const [name,object] of Object.entries(topology.objects)) {
      const geometries=object.type==="GeometryCollection"?object.geometries:[object];
      for(const geometry of geometries) {
        const polygons=geometry.type==="MultiPolygon"?geometry.arcs:geometry.type==="Polygon"?[geometry.arcs]:[];
        for(const rings of polygons)if(geo.d3.geoArea(geo.topojson.feature(topology,{type:"Polygon",arcs:rings}))>halfSphere)
          errors.push(`Climate ${resolution} ${name} 폴리곤 방향 오류`);
      }
    }
  }
  vm.runInContext(fs.readFileSync(path.join(rootDir,"tools","climate","data","korea-peninsula-geo.js"),"utf8"),geo);
  for(const feature of geo.window.KOREA_PENINSULA_GEOJSON.features) {
    const geometry=feature.geometry;
    const polygons=geometry.type==="MultiPolygon"?geometry.coordinates:geometry.type==="Polygon"?[geometry.coordinates]:[];
    for(const coordinates of polygons)if(geo.d3.geoArea({type:"Polygon",coordinates})>halfSphere)
      errors.push("Climate 한반도 폴리곤 방향 오류");
  }
} catch(error) {errors.push(`Climate 지도 방향 검사 실패: ${error.message}`);}
let localReferenceCount = 0;
const unpublishedToolRoots = [
  "tools/choices", "map.html", "app.js", "styles.css", "vendor",
  "tokens.css", "base.css", "components.css", "patterns.css",
  "data/country-stats.js", "data/embedded-font.js", "data/exam-country-catalog.js",
  "data/korea-admin.js", "data/korea-routes.js", "data/korea-stats.js",
  "data/world-atlas.js", "data/world-atlas-variants.js", "data/world-lakes.js",
];

if (!isSourceCheck) {
  for (const relativePath of unpublishedToolRoots) {
    if (fs.existsSync(path.join(rootDir, relativePath))) {
      errors.push(`공개 제외 도구가 빌드 결과에 남았습니다: ${relativePath}`);
    }
  }
}

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

const notesListHtml = fs.readFileSync(path.join(rootDir, "notes", "index.html"), "utf8");
const notesArticleHtml = fs.readFileSync(path.join(rootDir, "notes", "2027-09-world", "index.html"), "utf8");
const questionHeadings = [...notesArticleHtml.matchAll(/<section class="notes-section tw-reveal" id="q(\d+)"><h2 class="notes-question-number" aria-label="(\d+)번">(\d{2})<\/h2>/g)];
if (questionHeadings.length !== 20 || questionHeadings.some((match, index) => Number(match[1]) !== index + 1 || Number(match[2]) !== index + 1 || match[3] !== String(index + 1).padStart(2, "0"))) {
  errors.push("Notes 첫 글의 1~20번 문항 머리말이 누락되었거나 순서가 틀렸습니다.");
}
const notesToc = notesArticleHtml.match(/<aside class="notes-desktop-toc"><nav[^>]*>[\s\S]*?<\/nav><\/aside>/)?.[0] || "";
const tocQuestions = [...notesToc.matchAll(/href="#q(\d+)"/g)].map((match) => Number(match[1]));
if (tocQuestions.length !== 20 || tocQuestions.some((number, index) => number !== index + 1) || /href="#(?:intro|ending)"/.test(notesToc)) {
  errors.push("Notes 목차는 1~20번 문항만 포함해야 합니다.");
}
if (!notesArticleHtml.includes('class="notes-overview-label">문항별 오답률</span>')
  || !notesArticleHtml.includes('data-tooltip="9번 오답률 하위 5문항"')
  || !/data-tooltip="16번 오답률 [\d.]+% 3점"/.test(notesArticleHtml)) {
  errors.push("Notes 대표 그림의 라벨 또는 오답률 툴팁이 틀렸습니다.");
}
const removedNotesElements = [
  [notesArticleHtml, /class="notes-summary"|class="notes-author"|class="notes-overview-stats"|property="og:description"|<h2>서두<\/h2>|<h2>맺음<\/h2>|35분|topic/, "기사"],
  [notesListHtml, /class="notes-list-summary"|35분|topic/, "목록"],
];
for (const [html, pattern, page] of removedNotesElements) {
  if (pattern.test(html)) errors.push(`Notes ${page}에 삭제한 요약·읽는 시간·큰 숫자·topic 요소가 남았습니다.`);
}
if (!notesListHtml.includes('class="notes-list-subject">세계지리</span>')) {
  errors.push("Notes 목록에 과목 표시가 없습니다.");
}
if (isSourceCheck && /"topic"\s*:/.test(fs.readFileSync(path.join(rootDir, "notes", "posts", "2027-09-world.md"), "utf8"))) {
  errors.push("Notes front matter에 topic 항목이 남았습니다.");
}
const notesImages = [...notesArticleHtml.matchAll(/<img src="images\/[^"\s]+\.webp"[^>]*>/g)].map((match) => match[0]);
if (notesImages.length !== 61 || notesImages.some((image) => !/\bwidth="\d+" height="\d+"/.test(image))) {
  errors.push(`Notes 첫 글의 그림 수 또는 크기 속성이 틀렸습니다: ${notesImages.length} / 61`);
}
const currentFigureCount = (notesArticleHtml.match(/class="notes-figure-pill is-current">이번 문항<\/span>/g) || []).length;
if (currentFigureCount !== 20) errors.push(`Notes 이번 문항 그림 수 불일치: ${currentFigureCount} / 20`);
const figureIds = new Set([...notesArticleHtml.matchAll(/<figure class="notes-figure" id="(fig-\d+)"/g)].map((match) => match[1]));
for (const match of notesArticleHtml.matchAll(/class="notes-lineage-chip[^"]*"[^>]*href="#(fig-\d+)"/g)) {
  if (!figureIds.has(match[1])) errors.push(`Notes 기출 계보 대상 그림이 없습니다: ${match[1]}`);
}
if (notesImages[0]?.includes('loading="eager"') !== true || notesImages.slice(1).some((image) => !image.includes('loading="lazy"'))) {
  errors.push("Notes 첫 그림 eager 및 나머지 lazy 설정이 틀렸습니다.");
}
if (!notesListHtml.includes('2027-09-world/index.html') || !notesArticleHtml.includes('id="ending"') || /<figcaption>\d{6}<\/figcaption>/.test(notesArticleHtml)) {
  errors.push("Notes 목록, 맺음 또는 캡션 표기를 확인해 주세요.");
}
const notesOgPath = path.join(rootDir, "notes", "2027-09-world", "og.png");
if (!notesArticleHtml.includes('property="og:title"') || !notesArticleHtml.includes('property="og:image"')) {
  errors.push("Notes 공유 제목 또는 이미지가 없습니다.");
}
if (notesArticleHtml.includes('property="og:image"')) {
  if (!fs.existsSync(notesOgPath)) errors.push("Notes 공유 이미지 파일이 없습니다.");
  else {
    const png = fs.readFileSync(notesOgPath);
    if (png.toString("hex", 0, 8) !== "89504e470d0a1a0a" || png.readUInt32BE(16) !== 1200 || png.readUInt32BE(20) !== 630) {
      errors.push("Notes 공유 이미지는 1200×630 PNG여야 합니다.");
    }
  }
}
if ((notesListHtml.match(/<rect /g) || []).length < 20) errors.push("Notes 목록의 20문항 축소 그래프가 없습니다.");
if (!isSourceCheck && fs.existsSync(path.join(rootDir, "notes", "posts"))) {
  errors.push("Notes 원천 마크다운이 정적 빌드에 포함되었습니다.");
}

const publicSurfaceText = [
  ...publicHtmlFiles.map((htmlPath) => fs.readFileSync(htmlPath, "utf8")),
].join("\n");
for (const forbidden of ["Data Library", "Choice Lab", "Map Editor", "map.html", "tools/choices/"]) {
  if (publicSurfaceText.includes(forbidden)) {
    errors.push(`공개 화면에 숨김 도구의 이름 또는 링크가 남았습니다: ${forbidden}`);
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
if (isSourceCheck) {
  const statsUiText = [
    fs.readFileSync(path.join(rootDir, "tools", "stats", "index.html"), "utf8"),
    fs.readFileSync(path.join(rootDir, "tools", "stats", "app.js"), "utf8"),
  ].join("\n");
  for (const forbidden of [
    "SidaeAi_S",
    "downloadSvgButton",
    "downloadCurrentSvg",
    "탐색기에서 열기",
    "기존 SVG에서 확인한 수능형 자료 구조",
    "보완 통계와 출처 상태",
    "patternGrid",
    "sourceAudit",
  ]) {
    if (statsUiText.includes(forbidden)) errors.push(`Data Library에 제거 대상 기능이 남아 있습니다: ${forbidden}`);
  }
  const statsPath = path.join(rootDir, "tools", "stats", "data", "stats.json");
  const stats = JSON.parse(fs.readFileSync(statsPath, "utf8"));
  const seenIds = new Set();
  const checkView = (view, tableId) => {
    if (!view?.rows?.length || !view.columns?.length || !view.sources?.length || view.sources.some(source=>
      !source.name || !source.url || !/^\d{4}$/.test(source.year))) {
      errors.push("Statistics 표 내용·출처가 비었습니다: " + tableId); return;
    }
    const sourceNames=new Set(["행정안전부","국가데이터처","국토교통부","농림축산식품부","서울특별시","에너지경제연구원","한국에너지공단","한국전력공사","한국전력거래소","한국교통연구원","FAOSTAT","UN","World Bank","Energy Institute","Ember","Pew Research Center","U.S. Census Bureau","WTO","IRENA","UNHCR","IEA","U.S. Geological Survey","UN Statistics Division","OEC","UNCTAD","World Mining Data","CIA World Factbook","OPEC"]);
    if(view.sources.some(source=>!sourceNames.has(source.name))) errors.push("Statistics 출처 기관명이 올바르지 않습니다: "+tableId);
    if(view.note && (view.note.length>30 || view.note.includes(";"))) errors.push("Statistics 화면 주석이 깁니다: "+tableId);
    const checkTime = (time) => !time || /^\d{4}년(?: \d{1,2}(?:~\d{1,2})?월(?: \d{1,2}일)?| 하반기)?$/.test(time);
    if (!checkTime(view.year)) errors.push("Statistics 기준 시점 표기 오류: " + tableId + " / " + view.year);
    for (const column of view.columns) {
      const compactMonth = /^\d{4}\.\d{1,2}(?:~\d{1,2})?$/.test(column.label);
      if (!checkTime(column.year) || (/\d{4}\.\d|\d{4}[–-]\d{4}/.test(column.label) && !compactMonth)) errors.push("Statistics 열 시점 표기 오류: " + tableId);
    }
    for (const row of view.rows) {
      if (!row.label || row.values?.length !== view.columns.length || row.values.some((cell) =>
        cell === undefined || typeof cell === "number" && !Number.isFinite(cell) ||
        typeof cell === "string" && /^(?:NaN|undefined|null)$/i.test(cell) ||
        cell && typeof cell === "object" && (!cell.name || !Number.isFinite(cell.value)))) {
        errors.push("Statistics 행 값이 올바르지 않습니다: " + tableId + " / " + row.label);
      }
    }
    for (const sub of view.subviews || []) checkView(sub, tableId);
  };
  for (const [subject, value] of Object.entries(stats.subjects || {})) {
    let count = 0;
    for (const topic of value.topics || []) {
      if (!topic.id || !topic.title) errors.push("Statistics 주제 메타가 비었습니다: " + subject);
      const tables = topic.regions ? topic.regions.flatMap((region) => region.tables) : topic.tables || [];
      for (const table of tables) {
        count += 1;
        if (!table.id || seenIds.has(table.id) || !/^(?:korea|world)-[a-z0-9-]+$/.test(table.id)) errors.push("Statistics 표 ID 오류: " + table.id);
        seenIds.add(table.id);
        if (!table.title || !table.views?.length) errors.push("Statistics 표 제목·전환 누락: " + table.id);
        if (!["firstNumeric","latestYearOrFirstNumeric","rank","year","intrinsic"].includes(table.defaultSort?.mode) ||
            ["firstNumeric","latestYearOrFirstNumeric"].includes(table.defaultSort.mode)&&table.defaultSort.direction!=="desc" ||
            table.defaultSort.mode==="year"&&table.defaultSort.direction!=="asc")
          errors.push("Statistics 기본 정렬 정의 오류: " + table.id);
        for (const view of table.views || []) checkView(view, table.id);
      }
    }
    if (count !== stats.meta?.tableCount?.[subject]) errors.push("Statistics 표 수가 메타와 다릅니다: " + subject);
  }
  if (stats.meta?.gapCount > 20) errors.push("Statistics 미수록 표가 20건을 초과합니다.");
  if (isSourceCheck) {
    const gapsText = fs.readFileSync(path.join(rootDir,"tools","stats","GAPS.md"),"utf8");
    const gapRows = gapsText.split(/\r?\n/).filter((line) => /^\| (?:korea|world)-/.test(line));
    if (gapRows.length !== stats.meta?.gapCount || gapRows.some((line) => line.includes("data_downloads 카탈로그") || line.includes("원천 경로 미기록"))) {
      errors.push("Statistics GAPS 건수 또는 직접 확인 경로가 올바르지 않습니다.");
    }
  }
  const publicStatsText = [
    fs.readFileSync(path.join(rootDir,"tools","stats","index.html"),"utf8"),
    fs.readFileSync(path.join(rootDir,"tools","stats","app.js"),"utf8"),
    fs.readFileSync(statsPath,"utf8"),
  ].join("\n");
  for (const forbidden of ["수록", " · ", ";", "아님", "참고값", "재고량", "신재생"]) {
    if (fs.readFileSync(statsPath,"utf8").includes(forbidden)) errors.push("Statistics 공개 JSON 문구가 남았습니다: " + forbidden);
  }
  for (const forbidden of ["textbook", "교재", "수능특강", "textbook-stats.json", "기독교"]) {
    if (publicStatsText.includes(forbidden)) errors.push("Statistics 공개 파일에 이전 분류 표현이 남았습니다: " + forbidden);
  }
  if (publicStatsText.includes("stats-ref/") || publicStatsText.includes("Documents/New project")) errors.push("Statistics 공개 파일에 로컬 참조 경로가 남았습니다.");
  try {
    execFileSync(process.execPath, [path.join(projectRoot,"scripts","build-stats.mjs"),"--check"], {cwd:projectRoot,stdio:"pipe"});
  } catch (error) {
    errors.push("Statistics 생성본이 원천·정의와 다릅니다: " + String(error.stderr || error.message).trim());
  }
}

if (isSourceCheck) {
const mapAppText = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const mapHtmlText = fs.readFileSync(path.join(rootDir, "map.html"), "utf8");
for (const required of ["stats-module--builder", "examGraphModule", "examGraphPanel"]) {
  if (!mapHtmlText.includes(required)) errors.push(`Map Editor Graph Builder 구조가 누락되었습니다: ${required}`);
}
for (const required of [
  "Exam Material Builder",
  "examGraphPresetGroupDefinitions",
  "buildExamGraphScopeCard",
  "후보 추천",
  "자료 추천",
  "세트 추천",
]) {
  if (!mapAppText.includes(required)) errors.push(`Map Editor Graph Builder 제작 흐름이 누락되었습니다: ${required}`);
}
const compactMapAppText = mapAppText.replace(/\s+/g, " ");
for (const required of [
  "if (!selectedRows.length) { countryRows.sort((a, b) => Number(b.value) - Number(a.value)); }",
  "if (!selectedRows.length) { countryRows.sort((a, b) => Number(b.totalValue) - Number(a.totalValue)); }",
  "if (!selectedRows.length) { rows.sort((a, b) => Number(b.lastValue) - Number(a.lastValue)); }",
]) {
  if (!compactMapAppText.includes(required)) {
    errors.push("Graph Builder가 선택 후보 순서를 값순으로 다시 정렬할 수 있습니다.");
  }
}
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
if (!randomScenarioText || !/presetKey:\s*["']rankBars["']/.test(randomScenarioText)) {
  errors.push("Graph Builder 랜덤 추천에 평가원 빈출 단일 지표 비교가 없습니다.");
}
if (!randomScenarioText.includes("examWeight") || !randomScenarioText.includes("weightByPreset")) {
  errors.push("Graph Builder 랜덤 그래프 유형에 평가원 빈도 가중치가 없습니다.");
}
if (/\["industry-structure",\s*"amount"/.test(randomScenarioText)) {
  errors.push("산업 구조 비율을 실제 양으로 오인하는 랜덤 조합이 남아 있습니다.");
}
if (!drillScenarioText || /skillKey:\s*["']rank["']/.test(drillScenarioText)) {
  errors.push("Exam Drill 자동 후보에 단일 지표 순위가 남아 있습니다.");
}
if (/state\.examGraphPresetKey\s*=\s*["']rankBars["']/.test(mapAppText)) {
  errors.push("일반 탐색 동작이 Graph Builder를 단일 지표 순위로 강제합니다.");
}

}

for (const climateAppPath of [
  path.join(rootDir, "tools", "climate", "app.js"),
  path.join(rootDir, "tools", "climate", "korea-app.js"),
]) {
  const climateAppText = fs.readFileSync(climateAppPath, "utf8");
  for (const required of ["collectNearbyMapCandidates", "renderMapCandidatePicker", "data-map-candidate-id"]) {
    if (!climateAppText.includes(required)) {
      errors.push(`${path.relative(rootDir, climateAppPath)}: 밀집 지점 선택 기능이 누락되었습니다: ${required}`);
    }
  }
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
if (Object.hasOwn(cutData, "easy_missing_rate_method")) {
  errors.push("공개되지 않은 문항의 정답률 추정 설정이 남았습니다.");
}
const archiveHtml = fs.readFileSync(path.join(rootDir, "tools", "cut", "index.html"), "utf8");
for (const required of ["scopeChips", "cutTrendChart", "questionUnpublished", "cutLightbox"]) {
  if (!archiveHtml.includes(required)) errors.push("Archive 구조가 누락되었습니다: " + required);
}
for (const record of cutRecords) {
  const published = new Map((record.wrong_top15 || []).map((item) => [Number(item.question), item]));
  for (const item of record.items || []) {
    if (item.source === "ebsi_not_in_top15" && (item.national_rate !== null || item.points !== null)) {
      errors.push("미공개 문항에 추정 수치가 남았습니다: " + record.school_year + " " + record.subject + " " + item.question);
    }
    if (item.source === "ebsi_wrong_top15" && (item.national_rate == null || !Number.isFinite(Number(item.national_rate)))) {
      errors.push("공개 문항 정답률이 비어 있습니다: " + record.school_year + " " + record.subject + " " + item.question);
    }
    if (item.source === "ebsi_wrong_top15" && !published.has(Number(item.question))) {
      errors.push("공개 문항의 EBSi 상위 15행을 찾지 못했습니다.");
    }
  }
  if (Number(record.school_year) === 2027) {
    if ((record.wrong_top15 || []).length && new Set((record.wrong_top15 || []).map((item) => item.question)).size !== 15) {
      errors.push("2027학년도 공개 오답률 15문항 수가 맞지 않습니다.");
    }
    if (record.source_cache?.grade === null && ["1", "2", "3"].some((grade) => record["raw" + grade] !== null)) {
      errors.push("등급컷 원문 없이 2027학년도 컷 숫자가 들어갔습니다.");
    }
  }
}
for (const month of ["06", "07", "09"]) {
  for (const subject of ["한국지리", "세계지리"]) {
    if (!cutRecords.some((record) => Number(record.school_year) === 2027 &&
      String(record.month).padStart(2, "0") === month && record.subject === subject)) {
      errors.push("2027학년도 " + month + " " + subject + " 기록이 없습니다.");
    }
  }
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

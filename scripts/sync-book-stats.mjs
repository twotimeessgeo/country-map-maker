import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "data/book-stats.json");
const args = process.argv.slice(2);
const write = args.includes("--write");
const check = args.includes("--check");
const sourceRoot = args.includes("--source-root") ? args[args.indexOf("--source-root") + 1] : null;
const scope = args.includes("--scope") ? args[args.indexOf("--scope") + 1] : "all";
if (write === check || !["all", "korea", "world"].includes(scope) || (write && !sourceRoot)) {
  throw new Error("사용법: --write --source-root <통계집> [--scope korea|world|all] 또는 --check");
}

const sourceUrls = {
  "국가데이터처": "https://kosis.kr/", "행정안전부": "https://jumin.mois.go.kr/",
  "국토교통부": "https://stat.molit.go.kr/", "농림축산식품부": "https://www.mafra.go.kr/",
  "한국지질자원연구원": "https://www.kigam.re.kr/",
  "서울특별시": "https://data.seoul.go.kr/",
  "에너지경제연구원": "https://www.keei.re.kr/", "한국에너지공단": "https://www.knrec.or.kr/",
  "한국전력공사": "https://home.kepco.co.kr/", "한국교통연구원": "https://www.ktdb.go.kr/",
  "한국전력거래소": "https://www.kpx.or.kr/", "UN": "https://population.un.org/",
  "World Bank": "https://data.worldbank.org/", "FAOSTAT": "https://www.fao.org/faostat/",
  "Energy Institute": "https://www.energyinst.org/statistical-review", "Ember": "https://ember-energy.org/",
  "Pew Research Center": "https://www.pewresearch.org/", "IRENA": "https://www.irena.org/Data/",
  "UNHCR": "https://www.unhcr.org/refugee-statistics/", "IEA": "https://www.iea.org/data-and-statistics",
  "U.S. Geological Survey": "https://www.usgs.gov/centers/national-minerals-information-center/",
  "U.S. Census Bureau": "https://www.census.gov/programs-surveys/aies.html",
  "UN Statistics Division": "https://unstats.un.org/unsd/snaama/",
  "OEC": "https://oec.world/", "UNCTAD": "https://unctadstat.unctad.org/",
  "WTO": "https://www.wto.org/english/res_e/statis_e/statis_e.htm",
  "Australian DFAT": "https://www.dfat.gov.au/",
  "World Mining Data": "https://www.world-mining-data.info/",
  "CIA World Factbook": "https://www.cia.gov/the-world-factbook/",
  "OPEC": "https://asb.opec.org/",
};
function sourceName(source) {
  const text = String(source.upstream || source.institution || source.publisher || source.underlying || source.file || source.url || "");
  const patterns = [
    [/한국교통연구원|국가교통DB|ktdb/i, "한국교통연구원"], [/한국전력거래소/, "한국전력거래소"],
    [/한국지질자원연구원|kigam/i, "한국지질자원연구원"],
    [/data\.seoul\.go\.kr|서울특별시/, "서울특별시"],
    [/한국전력공사/, "한국전력공사"], [/한국에너지공단/, "한국에너지공단"],
    [/에너지경제연구원|keei/i, "에너지경제연구원"], [/농림축산식품부|mafra/i, "농림축산식품부"],
    [/국토교통부|molit/i, "국토교통부"], [/행정안전부|mois/i, "행정안전부"],
    [/국가데이터처|통계청|kostat|KOSIS|kosis|mods\.go\.kr|DT_|north_statistics/i, "국가데이터처"],
    [/Pew|pew/i, "Pew Research Center"], [/UNHCR|unhcr/i, "UNHCR"],
    [/IRENA|irena/i, "IRENA"], [/IEA\b/i, "IEA"], [/Energy Institute|energy_institute|EI_Statistical/i, "Energy Institute"],
    [/Ember|ember/i, "Ember"], [/FAOSTAT|faostat/i, "FAOSTAT"],
    [/World Bank|world_bank/i, "World Bank"], [/UN Statistics|UNSD|National Accounts Main/i, "UN Statistics Division"],
    [/UNCTAD|unctad/i, "UNCTAD"],
    [/UN DESA|UN WUP|UNHCR|UN |un_desa/i, "UN"],
    [/U\.S\. Geological|USGS|usgs/i, "U.S. Geological Survey"],
    [/US Census|U\.S\. Census|aies/i, "U.S. Census Bureau"],
    [/World Mining|world_mining/i, "World Mining Data"], [/CEPII|OEC|BACI|oec_baci/i, "OEC"],
    [/WTO|wto/i, "WTO"],
    [/Australian Department of Foreign Affairs and Trade|DFAT/i, "Australian DFAT"],
    [/CIA|cia_world_factbook/i, "CIA World Factbook"], [/OPEC|opec/i, "OPEC"],
  ];
  const found = patterns.find(([pattern]) => pattern.test(text));
  if (!found) throw new Error("출처 기관을 확인할 수 없습니다: " + text);
  return found[1];
}
function sourcesFor(table) {
  const out = new Map();
  const rowYears = [
    ...(table.rows || []), ...(table.groups || []).flatMap(group => group.rows || []),
    ...(table.sections || []).flatMap(section => [...(section.rows || []), ...(section.groups || []).flatMap(group => group.rows || [])]),
  ].flatMap(row => String(row.year || "").match(/(?:19|20)\d{2}/g) || []);
  for (const item of table.sources || []) {
    let name;
    try { name = sourceName(item); } catch (error) { throw new Error(`${table.id}: ${error.message}`); }
    const years = String(item.years || item.year || table.year || "").match(/(?:19|20)\d{2}/g) || rowYears;
    const year = years.at(-1);
    if (!year) throw new Error(`${table.id}: 출처 연도를 확인할 수 없습니다`);
    const url = /^https:\/\//.test(item.url || "") ? item.url : sourceUrls[name];
    out.set(name + year + url, { name, year, url });
  }
  if (!out.size) throw new Error(`${table.id}: 출처가 없습니다`);
  return [...out.values()];
}
const replaceText = (text, replacements = {}) => {
  let result = String(text ?? "");
  for (const [from, to] of Object.entries(replacements)) result = result.replaceAll(from, to);
  return result;
};
function topicFor(subject, id, table) {
  const [chapter, number] = id.split("-").map(Number);
  if (subject === "korea") {
    if (chapter === 1) return "disaster";
    if (chapter === 2) return number === 6 || number === 7 ? "foreigners" : "population";
    if (chapter === 3) return "urban";
    if (chapter === 5) return "region";
    if ([5, 6, 7, 20, 23].includes(number)) return "food";
    if ([9, 10, 11, 13, 15, 16, 27, 28].includes(number)) return "energy";
    if ([1, 2, 3, 4, 19, 21, 22].includes(number)) return "industry";
    return "service";
  }
  if (chapter === 2) return "urban";
  if (chapter === 3) return "religion";
  if (chapter === 4) return "population";
  if (chapter === 5) return "food";
  if (chapter === 6) return "energy";
  if (/크리스트교|종교/.test(table.title)) return "religion";
  if (/제조업|산업 구조|공업/.test(table.title)) return "industry";
  if (/무역|수출|수입|경제 블록/.test(table.title)) return "trade";
  return "region";
}
function regionFor(subject, id) {
  if (subject === "korea") {
    if (id.startsWith("5-8") || id.startsWith("5-9") || id.startsWith("5-10")) return "north";
    return ({ "5-1":"capital", "5-2":"gangwon", "5-3":"chungcheong", "5-4":"honam", "5-5":"yeongnam", "5-6":"jeju" })[id] || "capital";
  }
  return ({ 7:"europe-america", 8:"africa-latin", 9:"monsoon", 10:"dry" })[Number(id.split("-")[0])] || "monsoon";
}
function flatten(table, patch, subject, correction) {
  const result = [];
  const names = { ...correction.names, ...patch.names };
  const rename = value => names[value] || value;
  function add(row, section, subgroup) {
    const label = row.label || row.name;
    const renamed = rename(patch.rows?.[label] || label);
    if (!label || patch.dropRows?.includes(label) || patch.dropRows?.includes(renamed)) return;
    const values = row.values?.map(value => value && typeof value === "object" && value.name
      ? { name: rename(value.name), value: value.value ?? null } : typeof value === "string" ? rename(value) : value);
    const item = { label: renamed, values };
    if (section === "전국" || renamed === "전국") item.group = "national";
    if (section === "대륙") item.group = "continent";
    if (section === "국가" || subgroup && subject === "world") {
      item.group = "country";
      if (subgroup) item.continent = subgroup;
    }
    if (subgroup && subject === "korea") item.section = subgroup;
    else if (section && !["전국", "시·도", "시도", "대륙", "국가", "연도", "권역"].includes(section)) item.section = section;
    if (row.rank != null) item.rank = row.rank;
    if (row.year != null) item.year = row.year;
    result.push(item);
  }
  for (const row of table.rows || []) add(row);
  for (const group of table.groups || []) {
    if (patch.dropGroups?.includes(group.label) || patch.dropGroups?.includes(patch.groups?.[group.label])) continue;
    for (const row of group.rows || []) add(row, "", patch.groups?.[group.label] || group.label);
  }
  for (const section of table.sections || []) {
    const sectionName = patch.sections?.[section.label] || correction.sectionLabels?.[section.label] || section.label;
    if (patch.dropSections?.includes(section.label) || patch.dropSections?.includes(sectionName)) continue;
    for (const row of section.rows || []) add(row, sectionName);
    for (const group of section.groups || []) {
      if (patch.dropGroups?.includes(group.label) || patch.dropGroups?.includes(patch.groups?.[group.label])) continue;
      const subgroup = patch.groups?.[group.label] || correction.sectionLabels?.[group.label] || group.label;
      for (const row of group.rows || []) add(row, sectionName, subgroup);
    }
  }
  return result;
}
function convert(table, subject, correction) {
  const patch = correction.tables?.[table.id] || {};
  if (correction.exclude?.includes(table.id) || patch.exclude) return { skip: "표기 보정의 exclude" };
  if (subject === "korea" && table.id.startsWith("1-") && table.id !== "1-8") return { skip: "기후 관측값은 Climate 도구 대상" };
  if (subject === "world" && table.id.startsWith("1-")) return { skip: "기후 관측값은 Climate 도구 대상" };
  if (subject === "world" && table.id === "6-20") return { skip: "광물 매장량의 공통 기준 연도가 명시되지 않음" };
  if ((table.sources || []).some(source => /\bEBS\b/.test(source.institution || ""))) return { skip: "EBS 자료를 옮긴 표는 사이트에 싣지 않음" };
  const title = replaceText(patch.title || table.title, correction.titleReplace);
  const rowLabel = (patch.rowLabel || table.rowLabel || "지역")
    .replaceAll("시·군·구", "시군구").replaceAll("시·도", "시도").replaceAll("시·군", "시군");
  const columns = (table.columns || []).map((column, index) => ({ ...column, index,
    label: replaceText(patch.columns?.[column.label] || column.label, correction.columnReplace),
    group: patch.groups?.[column.group] || column.group }));
  for (const column of columns) if (patch.setGroup?.[column.label]) column.group = patch.setGroup[column.label];
  let selected = columns.filter(column => !patch.dropColumns?.includes(column.label) && !patch.dropColumns?.includes(table.columns[column.index].label));
  if (patch.columnOrder) selected.sort((a,b) => {
    // the book orders by the table's own column names (before renaming); accept either spelling
    const at = column => { const raw = patch.columnOrder.indexOf(table.columns[column.index].label); return raw >= 0 ? raw : patch.columnOrder.indexOf(column.label); };
    const ai = at(a), bi = at(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.index - b.index;
  });
  const rows = flatten(table, patch, subject, correction);
  const groups = [...new Set(selected.map(column => column.group || ""))];
  const sources = sourcesFor(table);
  let views = groups.map((group, viewIndex) => {
    const subset = selected.filter(column => (column.group || "") === group);
    const hasRowYears = rows.some(row => row.year != null);
    const projected = rows.map(row => {
      const values = subset.map(column => row.values?.[column.index] ?? null);
      if (hasRowYears) values.push(row.year == null ? null : String(row.year));
      return { label: row.label, values,
        ...(row.group ? { group: row.group } : {}), ...(row.continent ? { continent: row.continent } : {}),
        ...(row.section ? { section: row.section } : {}), ...(row.rank != null ? { rank: row.rank } : {}) };
    });
    if (!subset.length || !projected.some(row => row.values.some(value => value !== null))) return null;
    const years = String(table.year || "").match(/(?:19|20)\d{2}/g) || [];
    return { id: group || `view-${viewIndex+1}`, label: group || (groups.length > 1 && subset.length === 1 ? subset[0].label : "기본"), rowLabel,
      columns: [...subset.map(column => ({ label: column.label.replace(/((?:19|20)\d{2})[–-]((?:19|20)\d{2})/g, "$1~$2"), unit: column.unit || "",
        ...(Number.isInteger(column.decimals) ? { digits: subject === "korea" &&
          (table.id === "2-12" || /합계\s*출산율/.test(column.label)) ? 2 : column.decimals } : {}),
        ...(column.year && /^\d{4}$/.test(String(column.year)) ? { year: column.year + "년" } : {}),
        ...(column.type === "text" ? { barEligible: false } : {}) })),
        ...(hasRowYears ? [{ label: "기준", unit: "", barEligible: false }] : [])],
      rows: projected, sources,
      ...(years.length === 1 && /^\d{4}$/.test(String(table.year)) ? { year: years[0] + "년" } : {}) };
  }).filter(Boolean);
  if (table.type === "rank" && table.groups?.length) {
    views = table.groups.filter(group => !patch.dropGroups?.includes(group.label) && !patch.dropGroups?.includes(patch.groups?.[group.label])).flatMap(group => {
      const label = patch.nameLabels?.[patch.groups?.[group.label] || group.label] || patch.groups?.[group.label] || group.label;
      const groupColumns = group.columns || table.columns;
      return groupColumns.map((column, columnIndex) => {
        const corrected = patch.columns?.[column.label] || replaceText(column.label, correction.columnReplace);
        if (patch.dropColumns?.includes(corrected)) return null;
        const rankRows = (group.rows || []).filter(row => !patch.dropRows?.includes(row.name || row.label))
          .map((row, index) => ({ label: `${row.rank || index + 1}위`,
            values: [{ name: patch.names?.[row.name || row.label] || correction.names?.[row.name || row.label] || row.name || row.label,
              value: row.values?.[columnIndex] ?? null }] }));
        if (!rankRows.length || rankRows.every(row => row.values[0].value == null)) return null;
        return { id: `${label}-${columnIndex}`, label: groupColumns.length === 1 ? label : `${label} ${corrected}`,
          rowLabel: "순위", columns: [{ label: corrected, unit: column.unit || "",
            ...(Number.isInteger(column.decimals) ? { digits: column.decimals } : {}) }], rows: rankRows, sources };
      }).filter(Boolean);
    });
  }
  if (table.type === "rank" && table.rows?.length) {
    const rankIndex = (table.columns || []).findIndex(column => column.label === "순위");
    views = selected.filter(column => column.index !== rankIndex && column.type !== "text").map(column => {
      const rankRows = table.rows.map((row, index) => ({
        label: `${row.rank || row.values?.[rankIndex] || index + 1}위`,
        values: [{ name: patch.names?.[row.label] || correction.names?.[row.label] || patch.rows?.[row.label] || row.label,
          value: row.values?.[column.index] ?? null }],
      })).filter(row => typeof row.values[0].value === "number" && Number.isFinite(row.values[0].value));
      if (!rankRows.length) return null;
      return { id: `rank-${column.index}`, label: column.label, rowLabel: "순위",
        columns: [{ label: column.label, unit: column.unit || "",
          ...(Number.isInteger(column.decimals) ? { digits: column.decimals } : {}) }], rows: rankRows, sources };
    }).filter(Boolean);
  }
  if (!views.length) return { skip: "유효한 값이 없음" };
  return { bookId: table.id, title, type: table.type || "region", topic: topicFor(subject, table.id, table),
    ...(Number(table.id.split("-")[0]) >= (subject === "korea" ? 5 : 7) ? { region: regionFor(subject, table.id) } : {}), views };
}
function tablesDir(folder, files) {
  const marked = path.join(sourceRoot, folder, "tables_marked");
  if (!fs.existsSync(marked)) throw new Error(`${folder}/tables_marked 없음: 먼저 python3 claude_sample/watermark.py mark ../${folder}/tables ../${folder}/tables_marked`);
  for (const file of files) {
    const source = path.join(sourceRoot, folder, "tables", file), copy = path.join(marked, file);
    if (!fs.existsSync(copy) || fs.statSync(copy).mtimeMs < fs.statSync(source).mtimeMs)
      throw new Error(`${folder}/tables_marked/${file}이 원본보다 오래됨: watermark.py mark를 다시 실행해 주세요`);
  }
  return "tables_marked";
}
function readSubject(subject) {
  const folder = subject === "korea" ? "kr" : "v5";
  const correctionFile = subject === "korea" ? "kr/text.json" : "claude_sample/text.json";
  const correction = JSON.parse(fs.readFileSync(path.join(sourceRoot, correctionFile), "utf8"));
  const files = fs.readdirSync(path.join(sourceRoot, folder, "tables")).filter(name => name.endsWith(".json"))
    .sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
  // the book prints from tables_marked (claude_sample/watermark.py); the site must show the same printed values
  const dir = tablesDir(folder, files);
  const tables = [], skipped = [];
  for (const file of files) {
    const table = JSON.parse(fs.readFileSync(path.join(sourceRoot, folder, dir, file), "utf8"));
    const converted = convert(table, subject, correction);
    if (converted.skip) skipped.push({ id: table.id, reason: converted.skip });
    else tables.push(converted);
  }
  return { tables, skipped };
}
function validate(snapshot) {
  if (snapshot.schemaVersion !== 1 || !snapshot.subjects || !snapshot.skipped) throw new Error("스냅숏 스키마 오류");
  for (const subject of ["korea", "world"]) {
    for (const table of snapshot.subjects[subject] || []) {
      if (!table.bookId || !table.title || !table.topic || !table.views?.length) throw new Error("표 메타 오류");
      if (JSON.stringify(table).includes("/Users/") || JSON.stringify(table).includes("data_downloads/"))
        throw new Error(`${subject} ${table.bookId}: 스냅숏에 로컬 경로가 있습니다`);
      for (const view of table.views) {
        if (!view.columns?.length || !view.rows?.length || !view.sources?.length) throw new Error(`보기 오류: ${table.bookId}`);
        for (const row of view.rows) if (!row.label || row.values.length !== view.columns.length) throw new Error(`행 오류: ${table.bookId}`);
        for (const source of view.sources) if (!source.name || !source.url || !/^\d{4}$/.test(source.year)) throw new Error(`출처 오류: ${table.bookId}`);
      }
    }
  }
  if (JSON.stringify(snapshot).includes("/Users/") || JSON.stringify(snapshot).includes("data_downloads/")) throw new Error("스냅숏에 로컬 경로가 있습니다");
}
if (write) {
  const old = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, "utf8")) : { schemaVersion: 1, subjects: { korea: [], world: [] }, skipped: { korea: [], world: [] } };
  const subjects = scope === "all" ? ["korea", "world"] : [scope];
  for (const subject of subjects) {
    const value = readSubject(subject);
    old.subjects[subject] = value.tables;
    old.skipped[subject] = value.skipped;
  }
  validate(old);
  fs.writeFileSync(output, JSON.stringify(old, null, 2) + "\n");
  console.log(subjects.map(subject => `${subject}: ${old.subjects[subject].length}표, 제외 ${old.skipped[subject].length}표`).join(" / "));
} else {
  const snapshot = JSON.parse(fs.readFileSync(output, "utf8"));
  validate(snapshot);
  if (fs.readFileSync(output, "utf8") !== JSON.stringify(snapshot, null, 2) + "\n") throw new Error("스냅숏 형식이 일치하지 않습니다");
  console.log("통계집 스냅숏 확인: 한국 " + snapshot.subjects.korea.length + "표, 세계 " + snapshot.subjects.world.length + "표");
}

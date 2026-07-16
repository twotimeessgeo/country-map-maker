import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT_DIR, "tools", "climate", "data");
const DEFAULT_RAW_DIR =
  process.env.KMA_CLIMATE_RAW_DIR ??
  path.join(ROOT_DIR, "data_downloads", "kma");
const PERIOD_START = Date.parse("1991-01-01T00:00:00Z");
const PERIOD_END = Date.parse("2020-12-31T23:59:59Z");
const EXPECTED_MONTH_COUNT = 12;
const KMA_SOURCE_LABEL = "기상청 기후평년값 / 지점정보";
const KMA_SOURCE_NOTE =
  "한국지리 버전은 기상청 1991-2020 월평년값이 제공되는 지상관측지점 219개와 기상청 지점정보를 기준으로 구성했습니다. 남북한 통일 비교를 위해 보조 지표는 일최저기온 계급별 일수를 사용합니다.";

// 2021 한국기후표(1991-2020)의 종관기상관측지점(ASOS) 85개.
// 나머지 134개는 방재기상관측지점(AWS)이며 둘 다 최종 집계에 포함한다.
const ASOS_STATION_IDS = new Set([
  90, 95, 98, 99, 100, 101, 102, 105, 106, 108, 112, 114, 115, 119, 121,
  127, 129, 130, 131, 133, 135, 136, 137, 138, 140, 152, 155, 156, 159, 162,
  165, 168, 169, 170, 172, 184, 185, 188, 189, 192, 201, 202, 203, 211, 212,
  216, 217, 221, 226, 232, 235, 236, 238, 243, 244, 245, 247, 248, 252, 253,
  254, 257, 259, 260, 261, 262, 263, 264, 271, 272, 273, 276, 277, 278, 279,
  281, 283, 284, 285, 288, 289, 294, 295, 860, 864,
]);

const ZONE_BY_NEW_STATION_ID = new Map([
  ...[201, 202, 203].map((stationId) => [stationId, "수도권·서해"]),
  ...[211, 212, 217].map((stationId) => [stationId, "강원 영서"]),
  ...[216].map((stationId) => [stationId, "강원 영동"]),
  ...[221, 226, 232, 235, 236, 238].map((stationId) => [stationId, "충청"]),
  ...[243, 244, 245, 247, 248, 252, 254, 259, 260, 261, 262].map((stationId) => [
    stationId,
    "호남",
  ]),
  ...[253, 257, 263, 264, 271, 272, 273, 276, 277, 278, 279, 281, 283, 284,
    285, 288, 289, 294, 295].map((stationId) => [stationId, "영남"]),
]);

const args = process.argv.slice(2);
const rawDir = path.resolve(readArgument("--raw-dir") ?? DEFAULT_RAW_DIR);
const snapshotDate = readArgument("--date") ?? findLatestRawDate(rawDir);
const inputPath = path.resolve(
  ROOT_DIR,
  readArgument("--input") ?? "tools/climate/data/korea-climate-data.json"
);
const outputPath = path.join(DATA_DIR, `korea-climate-data_kma_${snapshotDate}.json`);

if (!/^\d{8}$/.test(snapshotDate)) {
  fail("KMA 원천 스냅샷 날짜를 찾지 못했거나 --date가 YYYYMMDD 형식이 아닙니다.");
}

const monthlyPath = path.join(
  rawDir,
  `kma_normals_monthly_1991_2020_${snapshotDate}.json`
);
const categorizedPath = path.join(
  rawDir,
  `kma_normals_categorized_days_1991_2020_${snapshotDate}.json`
);
const metadataPath = path.join(rawDir, `kma_station_metadata_${snapshotDate}.csv`);
const stationTreePath = path.join(
  rawDir,
  `kma_normals_station_tree_1991_2020_${snapshotDate}.json`
);
for (const sourcePath of [monthlyPath, categorizedPath, metadataPath, stationTreePath]) {
  if (!fs.existsSync(sourcePath)) fail(`KMA 원천 파일을 찾지 못했습니다: ${sourcePath}`);
}

const dataset = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const originalNorthJson = JSON.stringify(
  dataset.regions.filter((region) => region.nation === "북한")
);
const monthlyRows = readKmaRows(monthlyPath, "월별 기본요소");
const categorizedRows = readKmaRows(categorizedPath, "월별 계급별일수");
const metadataRows = parseKmaStationMetadata(metadataPath);
const monthlyByStation = groupRowsByStation(monthlyRows);
const categorizedByStation = groupRowsByStation(categorizedRows);
const metadataByStation = groupMetadataByStation(metadataRows);
const stationTreeByStation = parseStationTree(stationTreePath);
const existingByStation = new Map(
  dataset.regions
    .filter((region) => region.nation === "남한")
    .map((region) => [Number(region.stationId), region])
);

const availableStationIds = [...monthlyByStation.keys()].sort((left, right) => left - right);
const unknownExistingStations = [...existingByStation.keys()].filter(
  (stationId) => !monthlyByStation.has(stationId)
);
if (unknownExistingStations.length > 0) {
  fail(`기존 남한 데이터에 KMA 219개 지점 밖 지점이 있습니다: ${unknownExistingStations.join(", ")}`);
}

for (const [stationId, region] of existingByStation) {
  validateExistingRegionAgainstRaw(
    region,
    getMonthlyRows(monthlyByStation, stationId, "월별 기본요소"),
    getMonthlyRows(categorizedByStation, stationId, "월별 계급별일수")
  );
}

const missingStationIds = availableStationIds.filter(
  (stationId) => !existingByStation.has(stationId)
);
const newRegions = missingStationIds.map((stationId) => {
  const monthly = getMonthlyRows(monthlyByStation, stationId, "월별 기본요소");
  const categorized = getMonthlyRows(
    categorizedByStation,
    stationId,
    "월별 계급별일수"
  );
  const stationMetadata = selectPeriodRepresentativeMetadata(
    metadataByStation.get(stationId) ?? [],
    stationId
  );
  const stationTree = stationTreeByStation.get(stationId);
  if (!stationTree) fail(`${stationId}: 기상청 지점 트리 항목이 없습니다.`);
  return buildRegion(
    stationId,
    monthly,
    categorized,
    stationMetadata,
    stationTree,
    dataset.months
  );
});

const southRegions = dataset.regions.filter((region) => region.nation === "남한");
const northRegions = dataset.regions.filter((region) => region.nation === "북한");
disambiguateNewRegionNames(southRegions, newRegions);
dataset.regions = [...southRegions, ...newRegions, ...northRegions];
dataset.summary = {
  regionCount: dataset.regions.length,
  nationBreakdown: {
    남한: southRegions.length + newRegions.length,
    북한: northRegions.length,
  },
  observationNetworkBreakdown: {
    ASOS: availableStationIds.filter((stationId) => ASOS_STATION_IDS.has(stationId)).length,
    AWS: availableStationIds.filter((stationId) => !ASOS_STATION_IDS.has(stationId)).length,
  },
  period: "1991-2020",
  sourceLabel: KMA_SOURCE_LABEL,
};

if (JSON.stringify(northRegions) !== originalNorthJson) {
  fail("북한 27개 레코드가 원본과 달라졌습니다.");
}
if (dataset.summary.nationBreakdown.남한 !== 219 || northRegions.length !== 27) {
  fail(
    `최종 지점 수가 남한 지상관측 219·북한 27과 일치하지 않습니다: ` +
      `${dataset.summary.nationBreakdown.남한}·${northRegions.length}`
  );
}

fs.writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);
console.log(
  `KMA 지상관측 219개 반영 완료: ${path.relative(ROOT_DIR, outputPath)} · ` +
    `기존 남한 ${southRegions.length}개 보존 · 신규 ${newRegions.length}개 · 북한 ${northRegions.length}개 보존`
);

function buildRegion(stationId, monthly, categorized, metadata, stationTree, months) {
  const name = monthly[0].stnNm;
  const monthlyTemperatureC = monthly.map((row) => readNumber(row.avgTa, stationId, "avgTa"));
  const monthlyPrecipitationMm = monthly.map((row) =>
    readNumber(row.sumRn, stationId, "sumRn")
  );
  const monthlyColdDaysBelowZero = categorized.map((row) =>
    readNumber(row.t00UdrDminTaDays, stationId, "t00UdrDminTaDays")
  );
  const monthlyHotDaysAboveTwentyFiveMin = categorized.map((row) =>
    readNumber(row.t250AbvDminTaDays, stationId, "t250AbvDminTaDays")
  );
  const aliases = [...new Set([name, stripAdministrativeSuffix(name)])];
  const zone =
    ZONE_BY_NEW_STATION_ID.get(stationId) ??
    inferZone(stationTree.administrativeArea, Number(metadata.longitude), name);

  return {
    id: `kma-${stationId}`,
    stationId,
    name,
    officialName: name,
    aliases,
    nation: "남한",
    zone,
    administrativeArea: stationTree.administrativeArea,
    observationNetwork: ASOS_STATION_IDS.has(stationId) ? "ASOS" : "AWS",
    months: [...months],
    coordinates: {
      latitude: round(Number(metadata.latitude), 4),
      longitude: round(Number(metadata.longitude), 4),
    },
    elevationM: round(Number(metadata.elevationM), 1),
    monthlyTemperatureC,
    monthlyPrecipitationMm,
    monthlyColdDaysBelowZero,
    monthlyHotDaysAboveTwentyFiveMin,
    annualMeanTemperatureC: round(average(monthlyTemperatureC), 1),
    annualPrecipitationMm: round(sum(monthlyPrecipitationMm), 1),
    annualColdDaysBelowZero: round(sum(monthlyColdDaysBelowZero), 1),
    annualHotDaysAboveTwentyFiveMin: round(
      sum(monthlyHotDaysAboveTwentyFiveMin),
      1
    ),
    source: {
      type: "kma",
      label: KMA_SOURCE_LABEL,
      period: "1991-2020",
      note: KMA_SOURCE_NOTE,
      observationNetwork: ASOS_STATION_IDS.has(stationId) ? "ASOS" : "AWS",
    },
  };
}

function parseStationTree(filePath) {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(payload?.data)) fail("KMA 지점 트리 형식이 올바르지 않습니다.");
  const byId = new Map(payload.data.map((row) => [row.id, row]));
  const result = new Map();
  for (const row of payload.data.filter((item) => item.stnid)) {
    const stationId = Number(row.stnid);
    const parent = byId.get(row.pId);
    if (!Number.isInteger(stationId) || !parent?.name) {
      fail(`KMA 지점 트리 항목을 해석하지 못했습니다: ${JSON.stringify(row)}`);
    }
    result.set(stationId, {
      administrativeArea: parent.name,
      stationTreeName: row.name.replace(/\s*\(\d+\)\s*$/, ""),
    });
  }
  if (result.size !== 219) fail(`KMA 지점 트리 지점 수가 219개가 아닙니다: ${result.size}`);
  return result;
}

function inferZone(administrativeArea, longitude, name) {
  if (/서울|인천|경기/.test(administrativeArea)) return "수도권·서해";
  if (/강원/.test(administrativeArea)) {
    const eastNames = /속초|대관령|강릉|동해|태백|간성|진부령|양양|삼척/;
    return eastNames.test(name) || longitude >= 128.6 ? "강원 영동" : "강원 영서";
  }
  if (/충청|대전|세종/.test(administrativeArea)) return "충청";
  if (/전북|전남|광주/.test(administrativeArea)) return "호남";
  if (/경상|부산|대구|울산/.test(administrativeArea)) return "영남";
  if (/제주/.test(administrativeArea)) return "제주";
  fail(`${administrativeArea} ${name}: 권역을 판정하지 못했습니다.`);
}

function disambiguateNewRegionNames(existingRegions, newRegions) {
  const usedNames = new Set(existingRegions.map((region) => region.name));
  for (const region of newRegions) {
    const originalName = region.name;
    if (usedNames.has(region.name)) {
      const area = shortAdministrativeArea(region.administrativeArea);
      region.name = `${originalName}(${area})`;
      region.aliases = [...new Set([...region.aliases, originalName])];
    }
    if (usedNames.has(region.name)) region.name = `${region.name}-${region.stationId}`;
    usedNames.add(region.name);
  }
}

function shortAdministrativeArea(value) {
  return String(value)
    .replace("전남광주통합특별시", "광주·전남")
    .replace(/특별자치도|특별자치시|특별시|광역시|도$/g, "");
}

function readKmaRows(filePath, label) {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (payload?.code !== "00" || !Array.isArray(payload.dataList)) {
    fail(`${label} 원천 JSON 형식이 올바르지 않습니다.`);
  }
  if (payload.dataList.length !== 219 * EXPECTED_MONTH_COUNT) {
    fail(`${label} 원천 행 수가 2,628개가 아닙니다: ${payload.dataList.length}`);
  }
  return payload.dataList;
}

function groupRowsByStation(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const stationId = Number(row.stnId);
    if (!grouped.has(stationId)) grouped.set(stationId, []);
    grouped.get(stationId).push(row);
  }
  for (const stationRows of grouped.values()) {
    stationRows.sort((left, right) => Number(left.mnh) - Number(right.mnh));
  }
  return grouped;
}

function getMonthlyRows(grouped, stationId, label) {
  const rows = grouped.get(stationId) ?? [];
  if (
    rows.length !== EXPECTED_MONTH_COUNT ||
    rows.some((row, index) => Number(row.mnh) !== index + 1)
  ) {
    fail(`${stationId}: ${label}가 1~12월 12개 행으로 구성되지 않았습니다.`);
  }
  return rows;
}

function validateExistingRegionAgainstRaw(region, monthly, categorized) {
  const stationId = Number(region.stationId);
  const comparisons = [
    ["월평균 기온", region.monthlyTemperatureC, monthly.map((row) => Number(row.avgTa))],
    ["월강수량", region.monthlyPrecipitationMm, monthly.map((row) => Number(row.sumRn))],
    [
      "일최저기온 0℃ 미만 일수",
      region.monthlyColdDaysBelowZero,
      categorized.map((row) => Number(row.t00UdrDminTaDays)),
    ],
    [
      "일최저기온 25℃ 이상 일수",
      region.monthlyHotDaysAboveTwentyFiveMin,
      categorized.map((row) => Number(row.t250AbvDminTaDays)),
    ],
  ];
  for (const [label, current, raw] of comparisons) {
    if (JSON.stringify(current) !== JSON.stringify(raw)) {
      fail(`${stationId} ${region.name}: 기존 ${label}이 KMA 원천과 다릅니다.`);
    }
  }
}

function parseKmaStationMetadata(filePath) {
  const text = new TextDecoder("euc-kr").decode(fs.readFileSync(filePath));
  const rows = parseCsv(text).filter((row) => row.some((value) => value.trim()));
  const headerIndex = rows.findIndex((row) => row[0]?.trim() === "지점");
  if (headerIndex < 0) fail("KMA 지점 메타데이터 CSV 머리글을 찾지 못했습니다.");
  const headers = rows[headerIndex].map((value) => value.trim());
  const column = (name) => headers.indexOf(name);
  const indexes = {
    stationId: column("지점"),
    startDate: column("시작일"),
    endDate: column("종료일"),
    stationName: column("지점명"),
    latitude: column("위도"),
    longitude: column("경도"),
    elevationM: column("노장해발고도(m)"),
  };
  if (Object.values(indexes).some((index) => index < 0)) {
    fail("KMA 지점 메타데이터 CSV의 필수 열을 찾지 못했습니다.");
  }
  return rows.slice(headerIndex + 1).map((row) => ({
    stationId: Number(row[indexes.stationId]),
    startDate: row[indexes.startDate],
    endDate: row[indexes.endDate],
    stationName: row[indexes.stationName],
    latitude: Number(row[indexes.latitude]),
    longitude: Number(row[indexes.longitude]),
    elevationM: Number(row[indexes.elevationM]),
  }));
}

function groupMetadataByStation(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!Number.isFinite(row.stationId)) continue;
    if (!grouped.has(row.stationId)) grouped.set(row.stationId, []);
    grouped.get(row.stationId).push(row);
  }
  return grouped;
}

function selectPeriodRepresentativeMetadata(rows, stationId) {
  const candidates = rows
    .filter(
      (row) =>
        Number.isFinite(row.latitude) &&
        Number.isFinite(row.longitude) &&
        Number.isFinite(row.elevationM)
    )
    .map((row) => ({ ...row, overlap: normalPeriodOverlap(row) }))
    .filter((row) => row.overlap > 0)
    .sort((left, right) => right.overlap - left.overlap);
  if (candidates.length === 0) {
    fail(`${stationId}: 1991-2020 기간과 겹치는 지점 메타데이터가 없습니다.`);
  }
  return candidates[0];
}

function normalPeriodOverlap(row) {
  const start = Date.parse(`${row.startDate}T00:00:00Z`);
  const end = row.endDate ? Date.parse(`${row.endDate}T23:59:59Z`) : PERIOD_END;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.min(end, PERIOD_END) - Math.max(start, PERIOD_START));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function findLatestRawDate(rawDirectory) {
  if (!fs.existsSync(rawDirectory)) return "";
  const dates = fs
    .readdirSync(rawDirectory)
    .map((filename) => filename.match(/^kma_normals_monthly_1991_2020_(\d{8})\.json$/)?.[1])
    .filter(Boolean)
    .sort();
  return dates.at(-1) ?? "";
}

function stripAdministrativeSuffix(name) {
  if (name.endsWith("군") || name.endsWith("시")) return name.slice(0, -1);
  return name;
}

function readNumber(value, stationId, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(`${stationId}: ${field} 값이 유효한 숫자가 아닙니다.`);
  return number;
}

function readArgument(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function average(values) {
  return sum(values) / values.length;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

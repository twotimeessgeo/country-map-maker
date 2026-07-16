import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUTPUT_DIR =
  process.env.KMA_CLIMATE_RAW_DIR ??
  path.join(ROOT_DIR, "data_downloads", "kma");
const NORMALS_ENDPOINT = "https://data.kma.go.kr/normals/tableAjax.do";
const STATION_TREE_URL =
  "https://data.kma.go.kr/resources/contents/climate/Average30Years4.json";
const STATION_METADATA_URL =
  "https://data.kma.go.kr/tmeta/stn/selectStnListDownload.do";
const NORMALS_PAGE_URL = "https://data.kma.go.kr/normals/table.do";
const args = process.argv.slice(2);
const outputDir = path.resolve(readArgument("--output-dir") ?? DEFAULT_OUTPUT_DIR);
const snapshotDate = readArgument("--date") ?? formatDate(new Date());

if (!/^\d{8}$/.test(snapshotDate)) {
  fail("--date는 YYYYMMDD 형식이어야 합니다.");
}

fs.mkdirSync(outputDir, { recursive: true });

const monthlyFilename = `kma_normals_monthly_1991_2020_${snapshotDate}.json`;
const categorizedFilename =
  `kma_normals_categorized_days_1991_2020_${snapshotDate}.json`;
const stationTreeFilename =
  `kma_normals_station_tree_1991_2020_${snapshotDate}.json`;
const stationMetadataFilename = `kma_station_metadata_${snapshotDate}.csv`;

const [monthly, categorized, stationTree, stationMetadata] = await Promise.all([
  fetchNormals("MNH", "AVG_TA,SUM_RN"),
  fetchNormals(
    "MNH_CFWP",
    "T0_0_UDR_DMIN_TA_DAYS,T25_0_ABV_DMIN_TA_DAYS,T33_0_ABV_DMAX_TA_DAYS"
  ),
  fetchJson(STATION_TREE_URL),
  fetchStationMetadata(),
]);

validateNormalsResponse(monthly, "월별 기본요소");
validateNormalsResponse(categorized, "월별 계급별일수");
const stationLeaves = stationTree?.data?.filter((row) => row.stnid).length ?? 0;
if (stationLeaves !== 219) {
  fail(`기상청 지점 트리의 지점 수가 219개가 아닙니다: ${stationLeaves}`);
}
if (stationMetadata.byteLength < 100_000) {
  fail(`기상청 지점 메타데이터 CSV가 비정상적으로 작습니다: ${stationMetadata.byteLength} bytes`);
}

const outputs = [
  writeJson(monthlyFilename, monthly),
  writeJson(categorizedFilename, categorized),
  writeJson(stationTreeFilename, stationTree),
  writeBytes(stationMetadataFilename, stationMetadata),
];

updateManifest(outputs);
console.log(
  `KMA 기후평년값 원천 저장 완료: ${outputDir} · ` +
    `219개 지점 × 12개월 · ${snapshotDate}`
);

async function fetchNormals(depth2, elementIds) {
  const body = new URLSearchParams({
    selectElmType: "2",
    selectElmCount: "99",
    selectStnType: "2",
    selectStnCount: "99",
    difStnCount: "1",
    schElmId: elementIds,
    schStnId: "",
    stnIdArr: "",
    stnFileNm: "Average30Years4.json",
    DEPTH1: "TBL_KOR_1991_30",
    DEPTH2: depth2,
    startMonth: "01",
    endMonth: "12",
    startDay: "01",
    endDay: "31",
    startYear: "",
    endYear: "",
    week: "",
    tdom: "",
    sesn: "",
  });
  return fetchJson(NORMALS_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": "PROMENADE-climate-data-collector/1.0",
    },
    body,
  });
}

async function fetchStationMetadata() {
  const body = new URLSearchParams({
    fileType: "csv",
    pageIndex: "1",
    schListCnt: "10000",
    mddlClssCd: "",
    stnIds: "",
    serviceSe: "F00101",
    txtStnNm: "",
    txtElementNm: "",
    dTreeId: "",
    gTreeId: "",
    mddlClssCdDiff: "",
    pgmNo: "82",
  });
  const response = await fetch(STATION_METADATA_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": "PROMENADE-climate-data-collector/1.0",
    },
    body,
  });
  if (!response.ok) {
    fail(`${STATION_METADATA_URL}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "PROMENADE-climate-data-collector/1.0",
      ...options.headers,
    },
    ...options,
  });
  if (!response.ok) {
    fail(`${url}: HTTP ${response.status}`);
  }
  try {
    return JSON.parse(await response.text());
  } catch (error) {
    fail(`${url}: JSON 해석 실패: ${error.message}`);
  }
}

function validateNormalsResponse(response, label) {
  if (response?.code !== "00") {
    fail(`${label} 응답 코드가 00이 아닙니다: ${response?.code ?? "없음"}`);
  }
  if (!Array.isArray(response.dataList) || response.dataList.length !== 219 * 12) {
    fail(`${label} 행 수가 2,628개가 아닙니다: ${response?.dataList?.length ?? 0}`);
  }
  const stationIds = new Set(response.dataList.map((row) => Number(row.stnId)));
  if (stationIds.size !== 219) {
    fail(`${label} 지점 수가 219개가 아닙니다: ${stationIds.size}`);
  }
}

function writeJson(filename, value) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, filename), bytes);
  return buildFileRecord(filename, bytes);
}

function writeBytes(filename, bytes) {
  fs.writeFileSync(path.join(outputDir, filename), bytes);
  return buildFileRecord(filename, bytes);
}

function buildFileRecord(filename, bytes) {
  const sourceUrl = filename.includes("station_metadata")
    ? STATION_METADATA_URL
    : filename.includes("station_tree")
      ? STATION_TREE_URL
      : NORMALS_ENDPOINT;
  return {
    filename,
    sourceUrl,
    pageUrl: NORMALS_PAGE_URL,
    period: "1991-2020",
    retrievedDate: snapshotDate,
    bytes: bytes.byteLength,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

function updateManifest(newRecords) {
  const manifestPath = path.join(outputDir, "manifest.json");
  let manifest = {
    version: 1,
    source: "Korea Meteorological Administration (KMA)",
    pageUrl: NORMALS_PAGE_URL,
    files: [],
  };
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  }

  const existingByFilename = new Map(
    (manifest.files ?? []).map((record) => [record.filename, record])
  );
  for (const record of newRecords) existingByFilename.set(record.filename, record);

  for (const filename of [
    "korea_climate_normals_1991_2020.pdf",
    "korea_climate_normals_1991_2020.txt",
  ]) {
    const filePath = path.join(outputDir, filename);
    if (!fs.existsSync(filePath) || existingByFilename.has(filename)) continue;
    const bytes = fs.readFileSync(filePath);
    existingByFilename.set(filename, {
      filename,
      sourceUrl: "https://data.kma.go.kr/normals/info1.do",
      pageUrl: NORMALS_PAGE_URL,
      period: "1991-2020",
      role: filename.endsWith(".pdf") ? "official-publication" : "pdf-text-extract",
      bytes: bytes.byteLength,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    });
  }

  manifest.updatedAt = new Date().toISOString();
  manifest.files = [...existingByFilename.values()].sort((left, right) =>
    left.filename.localeCompare(right.filename)
  );
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function readArgument(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replaceAll("-", "");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

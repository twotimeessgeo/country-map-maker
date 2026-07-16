import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT_DIR, "tools", "climate", "data");
const DEFAULT_RAW_DIR =
  process.env.JMA_WORLD_NORMALS_DIR ??
  path.join(ROOT_DIR, "data_downloads", "jma_world_normals");
const JMA_LABEL = "気象庁 世界の地点別平年値 (JMA World Station Normals)";
const JMA_INDEX_URL = "https://www.data.jma.go.jp/cpd/monitor/nrmlist/";

const COUNTRIES = {
  AE: country("United Arab Emirates", "아시아", "20360", "アラブ首長国連邦", "Asia/Dubai"),
  AR: country("Argentina", "아메리카", "31300", "アルゼンチン"),
  AU: country("Australia", "오세아니아", "52500", "オーストラリア"),
  BR: country("Brazil", "아메리카", "30600", "ブラジル", "America/Sao_Paulo"),
  CD: country(
    "Democratic Republic of the Congo",
    "아프리카",
    "12820",
    "コンゴ（民主共和国）",
    "Africa/Kinshasa"
  ),
  CH: country("Switzerland", "유라시아", "61200", "スイス・リヒテンシュタイン", "Europe/Zurich"),
  CN: country("China", "유라시아", "22500", "中華人民共和国", "Asia/Shanghai"),
  CR: country("Costa Rica", "아메리카", "41800", "コスタリカ", "America/Costa_Rica"),
  CZ: country("Czechia", "유라시아", "61900", "チェコ", "Europe/Prague"),
  DK: country(
    "Denmark",
    "유라시아",
    "60800",
    "デンマーク・フェロー諸島",
    "Europe/Copenhagen"
  ),
  ES: country("Spain", "유라시아", "61400", "スペイン", "Europe/Madrid"),
  HU: country("Hungary", "유라시아", "62100", "ハンガリー", "Europe/Budapest"),
  ID: country("Indonesia", "유라시아", "53300", "インドネシア", "Asia/Jakarta"),
  IE: country("Ireland", "유라시아", "60500", "アイルランド", "Europe/Dublin"),
  IL: country("Israel", "유라시아", "63400", "イスラエル", "Asia/Jerusalem"),
  KH: country("Cambodia", "유라시아", "22400", "カンボジア", "Asia/Phnom_Penh"),
  KZ: country("Kazakhstan", "유라시아", "20120", "カザフスタン", "Asia/Almaty"),
  LK: country("Sri Lanka", "유라시아", "21200", "スリランカ", "Asia/Colombo"),
  MG: country("Madagascar", "아프리카", "14300", "マダガスカル", "Indian/Antananarivo"),
  ML: country("Mali", "아프리카", "10600", "マリ", "Africa/Bamako"),
  MY: country("Malaysia", "유라시아", "50100", "マレーシア", "Asia/Kuala_Lumpur"),
  MZ: country("Mozambique", "아프리카", "14400", "モザンビーク", "Africa/Maputo"),
  PG: country("Papua New Guinea", "오세아니아", "52400", "パプアニューギニア", "Pacific/Port_Moresby"),
  PK: country("Pakistan", "유라시아", "20900", "パキスタン", "Asia/Karachi"),
  PL: country("Poland", "유라시아", "62000", "ポーランド", "Europe/Warsaw"),
  PT: country("Portugal", "유라시아", "61600", "ポルトガル", "Europe/Lisbon"),
  PY: country("Paraguay", "아메리카", "31100", "パラグアイ", "America/Asuncion"),
  RO: country("Romania", "유라시아", "62400", "ルーマニア", "Europe/Bucharest"),
  UA: country("Ukraine", "유라시아", "63200", "ウクライナ", "Europe/Kyiv"),
  US: country("United States of America", "아메리카", "40300", "アメリカ合衆国"),
  UZ: country("Uzbekistan", "유라시아", "20140", "ウズベキスタン", "Asia/Tashkent"),
  ZW: country("Zimbabwe", "아프리카", "14700", "ジンバブエ", "Africa/Harare"),
};

// Every entry below has complete monthly temperature and precipitation values
// on JMA's official 1991-2020 normal page. Candidate stations with either
// variable missing are intentionally excluded instead of mixing sources.
const STATIONS = [
  station("64210", "kinshasa", "킨샤사", "Kinshasa", "CD", "Aw", "キンシャサ"),
  station(
    "67083",
    "antananarivo",
    "안타나나리보",
    "Antananarivo",
    "MG",
    "Cw",
    "アンタナナリボ"
  ),
  station("61291", "bamako", "바마코", "Bamako", "ML", "Aw", "バマコ"),
  station("67297", "beira", "베이라", "Beira", "MZ", "Aw", "ベイラ"),
  station("67964", "bulawayo", "불라와요", "Bulawayo", "ZW", "BS", "ブラワヨ"),
  station(
    "41217",
    "abu_dhabi",
    "아부다비",
    "Abu Dhabi",
    "AE",
    "Bw",
    "アブダビ国際空港"
  ),
  station("35188", "astana", "아스타나", "Astana", "KZ", "Df", "アスタナ"),
  station("36870", "almaty", "알마티", "Almaty", "KZ", "Df", "アルマトイ"),
  station("38457", "tashkent", "타슈켄트", "Tashkent", "UZ", "Cs", "タシケント"),
  station(
    "41780",
    "karachi",
    "카라치",
    "Karachi",
    "PK",
    "Bw",
    "カラチ国際空港"
  ),
  station("48991", "phnom_penh", "프놈펜", "Phnom Penh", "KH", "Aw", "プノンペン"),
  station(
    "59287",
    "guangzhou",
    "광저우",
    "Guangzhou",
    "CN",
    "Cw",
    "コワンチョウ（広州）〔コワントン（広東）省〕",
    { aliases: ["Canton", "广州"] }
  ),
  station(
    "57516",
    "chongqing",
    "충칭",
    "Chongqing",
    "CN",
    "Cfa",
    "チョンチン（重慶）〔チョンチン（重慶）市〕",
    { aliases: ["Chungking", "重庆"] }
  ),
  station(
    "58238",
    "nanjing",
    "난징",
    "Nanjing",
    "CN",
    "Cfa",
    "ナンキン（南京）〔チアンスー（江蘇）省〕",
    { aliases: ["Nanking", "南京"] }
  ),
  station(
    "48647",
    "kuala_lumpur",
    "쿠알라룸푸르",
    "Kuala Lumpur",
    "MY",
    "Af",
    "クアラルンプール"
  ),
  station(
    "96749",
    "jakarta_soekarno_hatta",
    "자카르타",
    "Jakarta",
    "ID",
    "Aw",
    "ジャカルタ/スカルノハッタ国際空港",
    { aliases: ["Jakarta Soekarno-Hatta"] }
  ),
  station("43466", "colombo", "콜롬보", "Colombo", "LK", "Af", "コロンボ"),
  station(
    "40180",
    "tel_aviv",
    "텔아비브",
    "Tel Aviv",
    "IL",
    "Cs",
    "テルアビブヤフォ/ベングリオン",
    { aliases: ["Tel Aviv-Yafo"] }
  ),
  station(
    "92035",
    "port_moresby",
    "포트모르즈비",
    "Port Moresby",
    "PG",
    "Aw",
    "ポートモレスビー"
  ),
  station(
    "12375",
    "warsaw",
    "바르샤바",
    "Warsaw",
    "PL",
    "Df",
    "ワルシャワ/オケンツィエ",
    { aliases: ["Warszawa"] }
  ),
  station("03969", "dublin", "더블린", "Dublin", "IE", "Cfb", "ダブリン"),
  station(
    "06186",
    "copenhagen",
    "코펜하겐",
    "Copenhagen",
    "DK",
    "Cfb",
    "コペンハーゲン",
    { aliases: ["Kobenhavn", "København"] }
  ),
  station(
    "06660",
    "zurich",
    "취리히",
    "Zurich",
    "CH",
    "Cfb",
    "チューリヒ",
    { aliases: ["Zürich"] }
  ),
  station(
    "08221",
    "madrid",
    "마드리드",
    "Madrid",
    "ES",
    "BS",
    "マドリード・バラハス",
    { aliases: ["Madrid-Barajas"] }
  ),
  station("08535", "lisbon", "리스본", "Lisbon", "PT", "Cs", "リスボン", {
    aliases: ["Lisboa"],
  }),
  station(
    "11520",
    "prague",
    "프라하",
    "Prague",
    "CZ",
    "Cfb",
    "プラハ/LIBUS",
    { aliases: ["Praha"] }
  ),
  station("12843", "budapest", "부다페스트", "Budapest", "HU", "Df", "ブダペスト"),
  station(
    "15420",
    "bucharest",
    "부쿠레슈티",
    "Bucharest",
    "RO",
    "Df",
    "ブカレスト",
    { aliases: ["Bucuresti", "București"] }
  ),
  station("33345", "kyiv", "키이우", "Kyiv", "UA", "Df", "キーウ", {
    aliases: ["Kiev"],
  }),
  station(
    "72530",
    "chicago",
    "시카고",
    "Chicago",
    "US",
    "Df",
    "シカゴ〔イリノイ州〕",
    { timezone: "America/Chicago" }
  ),
  station(
    "72793",
    "seattle",
    "시애틀",
    "Seattle",
    "US",
    "Cs",
    "シアトル〔ワシントン州〕",
    { timezone: "America/Los_Angeles" }
  ),
  station(
    "72469",
    "denver",
    "덴버",
    "Denver",
    "US",
    "BS",
    "デンバー〔コロラド州〕",
    { timezone: "America/Denver" }
  ),
  station(
    "72278",
    "phoenix",
    "피닉스",
    "Phoenix",
    "US",
    "Bw",
    "フェニックス〔アリゾナ州〕",
    { timezone: "America/Phoenix" }
  ),
  station(
    "72243",
    "houston",
    "휴스턴",
    "Houston",
    "US",
    "Cfa",
    "ヒューストン〔テキサス州〕",
    { timezone: "America/Chicago" }
  ),
  station(
    "72405",
    "washington_dc",
    "워싱턴 D.C.",
    "Washington, D.C.",
    "US",
    "Cfa",
    "ワシントン・ナショナル空港〔バージニア州〕",
    { aliases: ["Washington DC", "Washington"], timezone: "America/New_York" }
  ),
  station(
    "78762",
    "san_jose_costa_rica",
    "산호세",
    "San Jose",
    "CR",
    "Aw",
    "サンホセ",
    { aliases: ["San José"] }
  ),
  station(
    "86218",
    "asuncion",
    "아순시온",
    "Asuncion",
    "PY",
    "Cfa",
    "アスンシオン",
    { aliases: ["Asunción"] }
  ),
  station(
    "83967",
    "porto_alegre",
    "포르투알레그리",
    "Porto Alegre",
    "BR",
    "Cfa",
    "ポルトアレグレ"
  ),
  station(
    "87418",
    "mendoza_airport",
    "멘도사",
    "Mendoza",
    "AR",
    "Bw",
    "メンドーサ空港",
    { aliases: ["Mendoza Airport"], timezone: "America/Argentina/Mendoza" }
  ),
  station(
    "94672",
    "adelaide",
    "애들레이드",
    "Adelaide",
    "AU",
    "Cs",
    "アデレード",
    { timezone: "Australia/Adelaide" }
  ),
];

validateStationCatalog(STATIONS);

const args = process.argv.slice(2);
const rawDir = path.resolve(readArgument("--raw-dir") ?? DEFAULT_RAW_DIR);
const snapshotDate = readArgument("--date") ?? formatDate(new Date());
const inputPath = path.resolve(
  ROOT_DIR,
  readArgument("--input") ?? findLatestSnapshot() ?? "tools/climate/data/climate-data.json"
);
const outputPath = path.join(DATA_DIR, `climate-data_jma_${snapshotDate}.json`);

if (!/^\d{8}$/.test(snapshotDate)) {
  fail("--date는 YYYYMMDD 형식이어야 합니다.");
}

const dataset = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const existingStationIds = new Set(
  dataset.regions.map((region) => String(region?.source?.stn ?? "")).filter(Boolean)
);
let nextRegionNumber = Math.max(
  ...dataset.regions.map((region) => Number(String(region.id).match(/(\d+)$/)?.[1] ?? 0))
);

for (const station of STATIONS) {
  const htmlPath = path.join(rawDir, station.filename);
  if (!fs.existsSync(htmlPath)) {
    fail(`JMA 원문 파일을 찾지 못했습니다: ${htmlPath}`);
  }

  const parsed = parseJmaNormalHtml(fs.readFileSync(htmlPath, "utf8"));
  if (parsed.jmaStationName !== station.jmaStationName) {
    fail(
      `${station.stn}: JMA 지점명이 원문과 다릅니다. ` +
        `예상=${station.jmaStationName}, 원문=${parsed.jmaStationName}`
    );
  }
  if (parsed.jmaCountry !== station.jmaCountry) {
    fail(
      `${station.stn}: JMA 국가명이 원문과 다릅니다. ` +
        `예상=${station.jmaCountry}, 원문=${parsed.jmaCountry}`
    );
  }
  if (existingStationIds.has(station.stn)) {
    const existing = dataset.regions.find(
      (region) => String(region?.source?.stn ?? "") === station.stn
    );
    applyParsedValues(existing, parsed, station);
    continue;
  }

  nextRegionNumber += 1;
  dataset.regions.push(buildRegion(station, parsed, nextRegionNumber, dataset.months));
  existingStationIds.add(station.stn);
}

const jmaRegions = dataset.regions.filter((region) => region?.source?.type === "jma");
const jmaTemperatureOnly = jmaRegions.filter(
  (region) => region.source?.variableSources?.precipitation === "open-meteo"
).length;
const openMeteoCount = dataset.regions.filter(
  (region) => region?.source?.type === "open-meteo"
).length;

dataset.meta ??= {};
dataset.meta.jmaMerge = {
  date: snapshotDate,
  jma_full: jmaRegions.length - jmaTemperatureOnly,
  jma_temp_only: jmaTemperatureOnly,
  open_meteo_kept: openMeteoCount,
  period: "1991-2020",
  source: "気象庁 世界の地点別平年値",
};
dataset.summary = {
  regionCount: dataset.regions.length,
  period: "1991-2020",
  primarySource: "jma",
  sourceBreakdown: {
    "open-meteo": openMeteoCount,
    jma: jmaRegions.length,
  },
  jmaFull: jmaRegions.length - jmaTemperatureOnly,
  jmaTemperatureOnly,
  openMeteoFallback: openMeteoCount,
};

fs.writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);
console.log(
  `JMA 원문 반영 완료: ${path.relative(ROOT_DIR, outputPath)} · ` +
    `${dataset.regions.length}개 지역 · JMA 전면 ${jmaRegions.length - jmaTemperatureOnly}개`
);

function buildRegion(station, parsed, regionNumber, months) {
  return {
    name: station.name,
    englishName: station.englishName,
    aliases: station.aliases,
    continent: station.continent,
    country: station.country,
    countryCode: station.countryCode,
    timezone: station.timezone,
    elevationM: parsed.elevationM,
    climateCode: station.climateCode,
    climateGroup: station.climateGroup,
    months: [...months],
    monthlyTemperatureC: parsed.monthlyTemperatureC,
    monthlyPrecipitationMm: parsed.monthlyPrecipitationMm,
    annualMeanTemperatureC: round(average(parsed.monthlyTemperatureC), 1),
    annualPrecipitationMm: round(sum(parsed.monthlyPrecipitationMm), 1),
    coordinates: {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
    },
    source: {
      type: "jma",
      label: JMA_LABEL,
      url: JMA_INDEX_URL,
      period: "1991-2020",
      stn: station.stn,
      jmaStationName: parsed.jmaStationName,
      country: parsed.jmaCountry,
      apiUrl: `${JMA_INDEX_URL}NrmMonth.php?stn=${station.stn}`,
      stationListUrl: `${JMA_INDEX_URL}StationList.php?ccode=${station.ccode}`,
      rawCacheFile: station.filename,
      sourceKind: "jma-world-normals",
      note: "일본 기상청(JMA) 1991-2020 지점별 평년값을 사용했습니다.",
      variableSources: {
        temperature: "jma",
        precipitation: "jma",
      },
    },
    hemisphere: parsed.latitude >= 0 ? "북반구" : "남반구",
    id: `region-${String(regionNumber).padStart(2, "0")}`,
    classificationBasis: "curriculum-curated",
  };
}

function applyParsedValues(region, parsed, station) {
  region.monthlyTemperatureC = parsed.monthlyTemperatureC;
  region.monthlyPrecipitationMm = parsed.monthlyPrecipitationMm;
  region.annualMeanTemperatureC = round(average(parsed.monthlyTemperatureC), 1);
  region.annualPrecipitationMm = round(sum(parsed.monthlyPrecipitationMm), 1);
  region.elevationM = parsed.elevationM;
  region.coordinates = {
    latitude: parsed.latitude,
    longitude: parsed.longitude,
  };
  region.hemisphere = parsed.latitude >= 0 ? "북반구" : "남반구";
  region.source = {
    ...region.source,
    jmaStationName: parsed.jmaStationName,
    country: parsed.jmaCountry,
    stationListUrl: `${JMA_INDEX_URL}StationList.php?ccode=${station.ccode}`,
    rawCacheFile: station.filename,
  };
}

function parseJmaNormalHtml(html) {
  const header = decodeHtml(html.match(/<h3>([\s\S]*?)<\/h3>/i)?.[1] ?? "");
  const headerMatch = header.match(
    /^(.*?)\s+-\s+(.*?)\s+緯度[：:]\s*([\d.]+)°([NS]).*?経度[：:]\s*([\d.]+)°([EW]).*?高度[：:]\s*([-\d.]+)\s*\(m\)/
  );
  if (!headerMatch) {
    fail("JMA HTML에서 지점 좌표와 고도를 해석하지 못했습니다.");
  }

  const monthlyTemperatureC = [];
  const monthlyPrecipitationMm = [];
  const rowPattern =
    /<tr\s+class=["']c["'][^>]*>[\s\S]*?<th[^>]*>\s*(\d{1,2})\s*<\/th>[\s\S]*?<td[^>]*>\s*([-\d.]+)\s*<\/th>[\s\S]*?<td[^>]*>\s*([-\d.]+)\s*<\/th>[\s\S]*?<\/tr>/gi;
  for (const match of html.matchAll(rowPattern)) {
    const month = Number(match[1]);
    monthlyTemperatureC[month - 1] = Number(match[2]);
    monthlyPrecipitationMm[month - 1] = Number(match[3]);
  }
  if (
    monthlyTemperatureC.length !== 12 ||
    monthlyPrecipitationMm.length !== 12 ||
    !Array.from({ length: 12 }, (_, index) => monthlyTemperatureC[index]).every(
      Number.isFinite
    ) ||
    !Array.from({ length: 12 }, (_, index) => monthlyPrecipitationMm[index]).every(
      Number.isFinite
    )
  ) {
    fail("JMA HTML에서 12개월 기온·강수량을 해석하지 못했습니다.");
  }

  return {
    jmaStationName: headerMatch[1],
    jmaCountry: headerMatch[2],
    latitude: signedCoordinate(headerMatch[3], headerMatch[4]),
    longitude: signedCoordinate(headerMatch[5], headerMatch[6]),
    elevationM: numberOrNull(headerMatch[7]),
    monthlyTemperatureC,
    monthlyPrecipitationMm,
  };
}

function country(name, continent, ccode, jmaCountry, timezone = null) {
  return { name, continent, ccode, jmaCountry, timezone };
}

function station(
  stn,
  fileStem,
  name,
  englishName,
  countryCode,
  climateGroup,
  jmaStationName,
  { aliases = [], timezone = null } = {}
) {
  const countryMetadata = COUNTRIES[countryCode];
  if (!countryMetadata) {
    fail(`${englishName}: 국가 메타데이터(${countryCode})가 없습니다.`);
  }

  const resolvedTimezone = timezone ?? countryMetadata.timezone;
  if (!resolvedTimezone) {
    fail(`${englishName}: 시간대가 없습니다.`);
  }

  return {
    stn,
    filename: `${fileStem}_jma_1991_2020_${stn}.html`,
    name,
    englishName,
    aliases: [...new Set([name, englishName, ...aliases])],
    continent: countryMetadata.continent,
    country: countryMetadata.name,
    countryCode,
    timezone: resolvedTimezone,
    climateCode: climateGroup,
    climateGroup,
    jmaStationName,
    jmaCountry: countryMetadata.jmaCountry,
    ccode: countryMetadata.ccode,
  };
}

function validateStationCatalog(stations) {
  const fields = ["stn", "filename", "name", "englishName"];
  for (const field of fields) {
    const seen = new Set();
    for (const station of stations) {
      const value = station[field];
      if (seen.has(value)) {
        fail(`JMA 지점 목록의 ${field} 값이 중복됩니다: ${value}`);
      }
      seen.add(value);
    }
  }

  for (const station of stations) {
    if (!/^\d{5}$/.test(station.stn)) {
      fail(`JMA 지점 번호는 5자리여야 합니다: ${station.stn}`);
    }
  }
}

function findLatestSnapshot() {
  const snapshots = fs
    .readdirSync(DATA_DIR)
    .filter((filename) => /^climate-data_jma_\d{8}\.json$/.test(filename))
    .sort();
  return snapshots.length ? path.join("tools", "climate", "data", snapshots.at(-1)) : null;
}

function readArgument(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function decodeHtml(value) {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&deg;/g, "°")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function signedCoordinate(value, direction) {
  const coordinate = Number(value);
  return direction === "S" || direction === "W" ? -coordinate : coordinate;
}

function numberOrNull(value) {
  const number = Number(value);
  return value === "-" || !Number.isFinite(number) ? null : number;
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

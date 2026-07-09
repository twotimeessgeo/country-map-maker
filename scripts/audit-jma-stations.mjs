import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DATASET_PATH = path.join(
  ROOT_DIR,
  "tools",
  "climate",
  "data",
  "climate-data.json"
);
const CLIMATVIEW_NORMAL_URL =
  "https://www.data.jma.go.jp/cpd/monitor/climatview/graph_mkhtml_nrm.php?m=1&n=";
const AMEDAS_TABLE_URL = "https://www.jma.go.jp/bosai/amedas/const/amedastable.json";
const CONCURRENCY = 4;

// JMA domestic climate pages use WMO station numbers, while the AMeDAS
// metadata endpoint uses JMA's five-digit local station keys.
const DOMESTIC_AMEDAS_KEYS = {
  "47412": "14163", // Sapporo
  "47662": "44132", // Tokyo
};

const datasetArgument = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const datasetPath = datasetArgument
  ? path.resolve(ROOT_DIR, datasetArgument)
  : DEFAULT_DATASET_PATH;
const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
const regions = dataset.regions.filter((region) => region?.source?.type === "jma");
const amedasTable = await fetchJson(AMEDAS_TABLE_URL);

const stationRows = await mapWithConcurrency(regions, CONCURRENCY, async (region) => {
  const sourceKind = region.source.sourceKind;
  const metadata =
    sourceKind === "jma-domestic"
      ? readDomesticMetadata(region, amedasTable)
      : await readWorldMetadata(region);

  return {
    regionId: region.id,
    regionName: region.name,
    stn: String(region.source.stn),
    stationName: metadata.stationName || region.source.jmaStationName,
    sourceKind,
    latitude: metadata.latitude,
    longitude: metadata.longitude,
    elevationM: metadata.elevationM,
    metadataUrl: metadata.metadataUrl,
    climateUrl: metadata.climateUrl,
    displayLatitude: region.coordinates.latitude,
    displayLongitude: region.coordinates.longitude,
    displayDistanceKm: round(
      haversineKm(
        region.coordinates.latitude,
        region.coordinates.longitude,
        metadata.latitude,
        metadata.longitude
      ),
      1
    ),
  };
});

const output = {
  dataset: path.relative(ROOT_DIR, datasetPath),
  generatedAt: new Date().toISOString(),
  regionCount: stationRows.length,
  sources: {
    worldNormals: "https://www.data.jma.go.jp/cpd/monitor/nrmlist/",
    climatView: CLIMATVIEW_NORMAL_URL,
    domesticStationMetadata: AMEDAS_TABLE_URL,
  },
  stations: Object.fromEntries(stationRows.map((row) => [row.regionId, row])),
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

async function readWorldMetadata(region) {
  const primaryUrl = region.source.apiUrl;
  let primaryMetadata = null;
  try {
    const primaryHtml = await fetchText(primaryUrl);
    primaryMetadata = parseWorldStationHeader(primaryHtml) ?? parseClimatViewHeader(primaryHtml);
  } catch {
    // Some manually mapped records can have a stale URL. The station number is
    // still enough to resolve the official ClimatView normal page below.
  }

  if (primaryMetadata) {
    return {
      ...primaryMetadata,
      metadataUrl: primaryUrl,
      climateUrl: primaryUrl,
    };
  }

  const fallbackUrl = `${CLIMATVIEW_NORMAL_URL}${encodeURIComponent(region.source.stn)}`;
  const fallbackHtml = await fetchText(fallbackUrl);
  const fallbackMetadata = parseClimatViewHeader(fallbackHtml);
  if (!fallbackMetadata) {
    throw new Error(`${region.id} ${region.name}: JMA 지점 좌표를 해석하지 못했습니다.`);
  }

  return {
    ...fallbackMetadata,
    metadataUrl: fallbackUrl,
    climateUrl: fallbackUrl,
  };
}

function readDomesticMetadata(region, amedasTable) {
  const amedasKey = DOMESTIC_AMEDAS_KEYS[String(region.source.stn)];
  const station = amedasTable[amedasKey];
  if (!station) {
    throw new Error(
      `${region.id} ${region.name}: 국내 JMA 지점 ${region.source.stn}의 AMeDAS 키가 없습니다.`
    );
  }

  return {
    stationName: station.kjName,
    latitude: degreesMinutesToDecimal(station.lat),
    longitude: degreesMinutesToDecimal(station.lon),
    elevationM: numberOrNull(station.alt),
    metadataUrl: AMEDAS_TABLE_URL,
    climateUrl: region.source.apiUrl,
  };
}

function parseWorldStationHeader(html) {
  const header = decodeHtml(html.match(/<h3>([\s\S]*?)<\/h3>/i)?.[1] ?? "");
  const match = header.match(
    /^(.*?)\s+-\s+.*?緯度[：:]\s*([\d.]+)°([NS]).*?経度[：:]\s*([\d.]+)°([EW]).*?高度[：:]\s*([-\d.]+)\s*\(m\)/
  );
  return match ? buildParsedMetadata(match) : null;
}

function parseClimatViewHeader(html) {
  const info = decodeHtml(
    html.match(/<div\s+id=["']info["']>([\s\S]*?)<\/div>/i)?.[1] ?? ""
  );
  const match = info.match(
    /([^<>\n]+?)\s+-[^<>\n]*?緯度[：:]\s*([\d.]+)\s*°([NS]).*?経度[：:]\s*([\d.]+)°([EW]).*?高度[：:]\s*([-\d.]+)\s*\(m\)/
  );
  return match ? buildParsedMetadata(match) : null;
}

function buildParsedMetadata(match) {
  return {
    stationName: match[1].trim(),
    latitude: signedCoordinate(match[2], match[3]),
    longitude: signedCoordinate(match[4], match[5]),
    elevationM: numberOrNull(match[6]),
  };
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

function degreesMinutesToDecimal(parts) {
  if (!Array.isArray(parts) || parts.length !== 2) {
    return null;
  }
  return round(Number(parts[0]) + Number(parts[1]) / 60, 4);
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "PROMENADE-climate-data-audit/1.0" },
  });
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  return response.text();
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

async function mapWithConcurrency(items, concurrency, worker) {
  const output = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      output[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
  return output;
}

function haversineKm(latitude1, longitude1, latitude2, longitude2) {
  const earthRadiusKm = 6371;
  const phi1 = toRadians(latitude1);
  const phi2 = toRadians(latitude2);
  const deltaPhi = toRadians(latitude2 - latitude1);
  const deltaLambda = toRadians(longitude2 - longitude1);
  const term =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(term));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

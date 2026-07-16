import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT_DIR, "tools", "climate", "data");
const JSON_OUTPUT_PATH = path.join(DATA_DIR, "korea-climate-data.json");
const JS_OUTPUT_PATH = path.join(DATA_DIR, "korea-climate-data.js");
const EXPECTED_MONTH_COUNT = 12;
const SUPPORTED_NATIONS = new Set(["남한", "북한"]);
const args = process.argv.slice(2);
const shouldWrite = args.includes("--write");
const shouldCheck = args.includes("--check");
const inputArgument = args.find((argument) => !argument.startsWith("--"));

if (shouldWrite === shouldCheck) {
  fail("--write 또는 --check 중 하나만 지정해야 합니다.");
}

const sourcePath = resolveSourcePath(inputArgument);
const dataset = normalizeDataset(readJson(sourcePath));
const errors = validateDataset(dataset);

if (errors.length > 0) {
  fail(`한국 기후 데이터 검증에 실패했습니다.\n- ${errors.join("\n- ")}`);
}

const jsonOutput = `${JSON.stringify(dataset, null, 2)}\n`;
const jsOutput = `window.KOREA_CLIMATE_DATA = ${JSON.stringify(dataset)};\n`;

if (shouldWrite) {
  if (sourcePath !== JSON_OUTPUT_PATH) fs.writeFileSync(sourcePath, jsonOutput);
  fs.writeFileSync(JSON_OUTPUT_PATH, jsonOutput);
  fs.writeFileSync(JS_OUTPUT_PATH, jsOutput);
  console.log(
    `한국 기후 데이터 동기화 완료: ${path.relative(ROOT_DIR, sourcePath)} -> ` +
      `${path.relative(ROOT_DIR, JSON_OUTPUT_PATH)}, ${path.relative(ROOT_DIR, JS_OUTPUT_PATH)}`
  );
} else {
  if (fs.readFileSync(JSON_OUTPUT_PATH, "utf8") !== jsonOutput) {
    fail("korea-climate-data.json이 최신 원본 또는 정규화된 요약 정보와 일치하지 않습니다.");
  }
  if (fs.readFileSync(JS_OUTPUT_PATH, "utf8") !== jsOutput) {
    fail("korea-climate-data.js가 korea-climate-data.json과 일치하지 않습니다.");
  }
  console.log(buildValidationSummary(dataset));
}

function resolveSourcePath(inputPath) {
  if (inputPath) return path.resolve(ROOT_DIR, inputPath);
  const candidates = fs
    .readdirSync(DATA_DIR)
    .filter((filename) => /^korea-climate-data_kma_\d{8}\.json$/.test(filename))
    .sort();
  if (candidates.length === 0) {
    fail("korea-climate-data_kma_YYYYMMDD.json 형식의 원본 파일을 찾지 못했습니다.");
  }
  return path.join(DATA_DIR, candidates.at(-1));
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${path.relative(ROOT_DIR, filePath)}을 읽지 못했습니다: ${error.message}`);
  }
}

function normalizeDataset(rawDataset) {
  const dataset = structuredClone(rawDataset);
  const regions = Array.isArray(dataset.regions) ? dataset.regions : [];
  const nationBreakdown = countBy(regions, (region) => region?.nation ?? "unknown");
  const observationNetworkBreakdown = countBy(
    regions.filter((region) => region?.nation === "남한"),
    (region) => region?.observationNetwork ?? region?.source?.observationNetwork ?? "ASOS"
  );
  dataset.summary = {
    regionCount: regions.length,
    nationBreakdown,
    observationNetworkBreakdown,
    period: inferPeriod(regions),
    sourceLabel: "기상청 기후평년값 / 지점정보",
  };
  return dataset;
}

function validateDataset(dataset) {
  const errors = [];
  const regions = dataset?.regions;
  if (!Array.isArray(dataset?.months) || dataset.months.length !== EXPECTED_MONTH_COUNT) {
    errors.push("최상위 months가 12개월 배열이 아닙니다.");
  }
  if (!Array.isArray(regions) || regions.length === 0) {
    return [...errors, "regions가 비어 있거나 배열이 아닙니다."];
  }

  const seenIds = new Set();
  const seenStationIds = new Set();
  const seenNamesByNation = new Set();
  const zoneOrder = new Set(dataset.zoneOrder ?? []);

  regions.forEach((region, index) => {
    const label = region?.name ? `${region.name}(${region.id ?? index})` : `regions[${index}]`;
    checkUniqueString(region?.id, label, "id", seenIds, errors);

    if (!Number.isInteger(Number(region?.stationId))) {
      errors.push(`${label}: stationId가 유효한 정수가 아닙니다.`);
    } else if (seenStationIds.has(Number(region.stationId))) {
      errors.push(`${label}: stationId가 중복됩니다.`);
    } else {
      seenStationIds.add(Number(region.stationId));
    }

    if (!String(region?.name ?? "").trim()) {
      errors.push(`${label}: 지역명이 없습니다.`);
    } else {
      const nameKey = `${region.nation}:${region.name}`;
      if (seenNamesByNation.has(nameKey)) errors.push(`${label}: 지역명이 중복됩니다.`);
      seenNamesByNation.add(nameKey);
    }
    if (!String(region?.officialName ?? "").trim()) {
      errors.push(`${label}: 공식 지점명이 없습니다.`);
    }
    if (!SUPPORTED_NATIONS.has(region?.nation)) {
      errors.push(`${label}: nation이 남한 또는 북한이 아닙니다.`);
    }
    if (!zoneOrder.has(region?.zone)) {
      errors.push(`${label}: zone(${region?.zone ?? "없음"})이 zoneOrder에 없습니다.`);
    }

    validateMonthlySeries(region?.monthlyTemperatureC, `${label}: 월평균 기온`, errors);
    validateMonthlySeries(region?.monthlyPrecipitationMm, `${label}: 월강수량`, errors, {
      nonNegative: true,
    });
    validateMonthlySeries(
      region?.monthlyColdDaysBelowZero,
      `${label}: 일최저기온 0℃ 미만 일수`,
      errors,
      { nonNegative: true }
    );
    validateMonthlySeries(
      region?.monthlyHotDaysAboveTwentyFiveMin,
      `${label}: 일최저기온 25℃ 이상 일수`,
      errors,
      { nonNegative: true }
    );

    validateAnnualAgainstMonthly(
      region?.monthlyTemperatureC,
      region?.annualMeanTemperatureC,
      `${label}: 연평균 기온`,
      errors,
      "average"
    );
    validateAnnualAgainstMonthly(
      region?.monthlyPrecipitationMm,
      region?.annualPrecipitationMm,
      `${label}: 연강수량`,
      errors,
      "sum"
    );
    validateAnnualAgainstMonthly(
      region?.monthlyColdDaysBelowZero,
      region?.annualColdDaysBelowZero,
      `${label}: 연 일최저기온 0℃ 미만 일수`,
      errors,
      "sum"
    );
    validateAnnualAgainstMonthly(
      region?.monthlyHotDaysAboveTwentyFiveMin,
      region?.annualHotDaysAboveTwentyFiveMin,
      `${label}: 연 일최저기온 25℃ 이상 일수`,
      errors,
      "sum"
    );

    const latitude = region?.coordinates?.latitude;
    const longitude = region?.coordinates?.longitude;
    if (!Number.isFinite(latitude) || latitude < 32 || latitude > 44) {
      errors.push(`${label}: 한반도 범위의 유효한 위도가 아닙니다.`);
    }
    if (!Number.isFinite(longitude) || longitude < 123 || longitude > 132) {
      errors.push(`${label}: 한반도 범위의 유효한 경도가 아닙니다.`);
    }
    if (!Number.isFinite(region?.elevationM)) {
      errors.push(`${label}: 해발고도가 유효한 숫자가 아닙니다.`);
    }
    if (region?.source?.type !== "kma") {
      errors.push(`${label}: source.type이 kma가 아닙니다.`);
    }
    if (region?.source?.period !== "1991-2020") {
      errors.push(`${label}: 출처 기준 기간이 1991-2020이 아닙니다.`);
    }
  });

  const actualBreakdown = countBy(regions, (region) => region.nation);
  if (JSON.stringify(dataset.summary?.nationBreakdown) !== JSON.stringify(actualBreakdown)) {
    errors.push("summary.nationBreakdown이 실제 남북한 지점 수와 일치하지 않습니다.");
  }
  if (dataset.summary?.regionCount !== regions.length) {
    errors.push("summary.regionCount가 실제 지역 수와 일치하지 않습니다.");
  }
  if ((actualBreakdown.남한 ?? 0) !== 219 || (actualBreakdown.북한 ?? 0) !== 27) {
    errors.push(
      `지점 수가 남한 지상관측 219·북한 27과 일치하지 않습니다: ` +
        `${actualBreakdown.남한 ?? 0}·${actualBreakdown.북한 ?? 0}`
    );
  }
  const networkBreakdown = countBy(
    regions.filter((region) => region.nation === "남한"),
    (region) => region.observationNetwork ?? region.source?.observationNetwork ?? "ASOS"
  );
  if ((networkBreakdown.ASOS ?? 0) !== 85 || (networkBreakdown.AWS ?? 0) !== 134) {
    errors.push(
      `남한 관측망 수가 ASOS 85·AWS 134와 일치하지 않습니다: ` +
        `${networkBreakdown.ASOS ?? 0}·${networkBreakdown.AWS ?? 0}`
    );
  }

  const regionNames = new Set(regions.map((region) => region.name));
  for (const sampleName of dataset.defaultSampleNames ?? []) {
    if (!regionNames.has(sampleName)) errors.push(`기본 표본 지역(${sampleName})이 regions에 없습니다.`);
  }
  return errors;
}

function checkUniqueString(value, label, field, seen, errors) {
  if (typeof value !== "string" || !value) {
    errors.push(`${label}: ${field}가 없습니다.`);
  } else if (seen.has(value)) {
    errors.push(`${label}: ${field}가 중복됩니다.`);
  } else {
    seen.add(value);
  }
}

function validateMonthlySeries(series, label, errors, { nonNegative = false } = {}) {
  if (!Array.isArray(series) || series.length !== EXPECTED_MONTH_COUNT) {
    errors.push(`${label}이 12개 값으로 구성되지 않았습니다.`);
    return;
  }
  if (!series.every(Number.isFinite)) errors.push(`${label}에 숫자가 아닌 값이 있습니다.`);
  if (nonNegative && series.some((value) => value < 0)) errors.push(`${label}에 음수가 있습니다.`);
}

function validateAnnualAgainstMonthly(series, annual, label, errors, mode) {
  if (!Number.isFinite(annual)) {
    errors.push(`${label}이 유효한 숫자가 아닙니다.`);
    return;
  }
  if (!Array.isArray(series) || !series.every(Number.isFinite)) return;
  const expected = mode === "average" ? average(series) : sum(series);
  if (Math.abs(expected - annual) > 0.11) {
    errors.push(`${label}이 월별 값의 ${mode === "average" ? "평균" : "합계"}과 다릅니다.`);
  }
}

function inferPeriod(regions) {
  const periods = [...new Set(regions.map((region) => region?.source?.period).filter(Boolean))];
  return periods.length === 1 ? periods[0] : "혼합";
}

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function average(values) {
  return sum(values) / values.length;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function buildValidationSummary(dataset) {
  return [
    `한국 기후 데이터 검증 완료: ${dataset.summary.regionCount}개 지역`,
    `남한 지상관측 ${dataset.summary.nationBreakdown.남한}개`,
    `ASOS ${dataset.summary.observationNetworkBreakdown?.ASOS ?? 85}개`,
    `AWS ${dataset.summary.observationNetworkBreakdown?.AWS ?? 134}개`,
    `북한 ${dataset.summary.nationBreakdown.북한}개`,
    `기준 ${dataset.summary.period}`,
  ].join(" · ");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

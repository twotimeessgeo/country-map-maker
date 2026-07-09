import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT_DIR, "tools", "climate", "data");
const JSON_OUTPUT_PATH = path.join(DATA_DIR, "climate-data.json");
const JS_OUTPUT_PATH = path.join(DATA_DIR, "climate-data.js");
const EXPECTED_MONTH_COUNT = 12;
const SUPPORTED_SOURCE_TYPES = new Set(["jma", "open-meteo"]);

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
  fail(`기후 데이터 검증에 실패했습니다.\n- ${errors.join("\n- ")}`);
}

const jsonOutput = `${JSON.stringify(dataset, null, 2)}\n`;
const jsOutput = `window.CLIMATE_DATA = ${JSON.stringify(dataset)};\n`;

if (shouldWrite) {
  if (sourcePath !== JSON_OUTPUT_PATH) {
    fs.writeFileSync(sourcePath, jsonOutput);
  }
  fs.writeFileSync(JSON_OUTPUT_PATH, jsonOutput);
  fs.writeFileSync(JS_OUTPUT_PATH, jsOutput);
  console.log(
    `기후 데이터 동기화 완료: ${path.relative(ROOT_DIR, sourcePath)} -> ` +
      `${path.relative(ROOT_DIR, JSON_OUTPUT_PATH)}, ${path.relative(ROOT_DIR, JS_OUTPUT_PATH)}`
  );
} else {
  const currentJson = fs.readFileSync(JSON_OUTPUT_PATH, "utf8");
  const currentJs = fs.readFileSync(JS_OUTPUT_PATH, "utf8");

  if (currentJson !== jsonOutput) {
    fail("climate-data.json이 정규화된 형식 또는 요약 정보와 일치하지 않습니다.");
  }
  if (currentJs !== jsOutput) {
    fail("climate-data.js가 climate-data.json과 일치하지 않습니다.");
  }

  console.log(buildValidationSummary(dataset));
}

function resolveSourcePath(inputPath) {
  if (inputPath) {
    return path.resolve(ROOT_DIR, inputPath);
  }

  const candidates = fs
    .readdirSync(DATA_DIR)
    .filter((filename) => /^climate-data_jma_\d{8}\.json$/.test(filename))
    .sort();

  if (candidates.length === 0) {
    fail("climate-data_jma_YYYYMMDD.json 형식의 원본 파일을 찾지 못했습니다.");
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
  dataset.regions = Array.isArray(dataset.regions)
    ? dataset.regions.map(normalizeRegionSource)
    : [];
  const regions = dataset.regions;
  const sourceBreakdown = countBy(regions, (region) => region?.source?.type ?? "unknown");
  const jmaTemperatureOnly = regions.filter(
    (region) =>
      region?.source?.type === "jma" &&
      region.source.variableSources?.precipitation === "open-meteo"
  ).length;
  const jmaCount = sourceBreakdown.jma ?? 0;
  const openMeteoFallback = sourceBreakdown["open-meteo"] ?? 0;
  const mergeMeta = dataset.meta?.jmaMerge ?? {};

  dataset.summary = {
    regionCount: regions.length,
    period: mergeMeta.period ?? inferPeriod(regions),
    primarySource: jmaCount > 0 ? "jma" : "open-meteo",
    sourceBreakdown,
    jmaFull: jmaCount - jmaTemperatureOnly,
    jmaTemperatureOnly,
    openMeteoFallback,
  };

  return dataset;
}

function normalizeRegionSource(region) {
  const normalizedRegion = structuredClone(region);
  normalizedRegion.classificationBasis =
    normalizedRegion.classificationBasis ?? "curriculum-curated";
  const appDerivedClimateGroup = deriveAppClimateGroup(normalizedRegion);
  normalizedRegion.classificationReview = {
    status:
      appDerivedClimateGroup && appDerivedClimateGroup !== normalizedRegion.climateGroup
        ? "review-required"
        : "aligned",
    appDerivedGroup: appDerivedClimateGroup,
  };
  const source = normalizedRegion.source ?? {};

  if (source.type === "jma") {
    const precipitationUsesOpenMeteo =
      source.variableSources?.precipitation === "open-meteo" ||
      String(source.note ?? "").includes("강수=Open-Meteo유지") ||
      String(source.note ?? "").includes("JMA 결측으로 Open-Meteo");
    normalizedRegion.source = {
      ...source,
      variableSources: {
        temperature: "jma",
        precipitation: precipitationUsesOpenMeteo ? "open-meteo" : "jma",
      },
      note: precipitationUsesOpenMeteo
        ? "기온은 일본 기상청(JMA) 1991-2020 지점별 평년값, 강수량은 JMA 결측으로 Open-Meteo ERA5 1991-2020 자료를 사용했습니다."
        : "일본 기상청(JMA) 1991-2020 지점별 평년값을 사용했습니다.",
    };
    return normalizedRegion;
  }

  if (source.type === "open-meteo") {
    normalizedRegion.source = {
      ...source,
      variableSources: {
        temperature: "open-meteo",
        precipitation: "open-meteo",
      },
      note: source.jmaStatus === "unavailable"
        ? "일본 기상청(JMA)에 해당 지점의 1991-2020 평년값이 없어 Open-Meteo ERA5 자료로 보완했습니다."
        : source.note,
    };
  }

  return normalizedRegion;
}

function deriveAppClimateGroup(region) {
  const monthlyTemperatureC = region?.monthlyTemperatureC;
  const monthlyPrecipitationMm = region?.monthlyPrecipitationMm;
  const latitude = region?.coordinates?.latitude;
  const elevationM = region?.elevationM;

  if (
    !Array.isArray(monthlyTemperatureC) ||
    monthlyTemperatureC.length !== EXPECTED_MONTH_COUNT ||
    !monthlyTemperatureC.every(Number.isFinite) ||
    !Array.isArray(monthlyPrecipitationMm) ||
    monthlyPrecipitationMm.length !== EXPECTED_MONTH_COUNT ||
    !monthlyPrecipitationMm.every(Number.isFinite) ||
    !Number.isFinite(latitude)
  ) {
    return null;
  }

  const annualMeanTemperature = average(monthlyTemperatureC);
  const annualPrecipitation = sum(monthlyPrecipitationMm);
  const coldestMonth = Math.min(...monthlyTemperatureC);
  const warmestMonth = Math.max(...monthlyTemperatureC);
  const driestMonth = Math.min(...monthlyPrecipitationMm);

  if (
    Number.isFinite(elevationM) &&
    elevationM >= 1500 &&
    annualMeanTemperature > 0 &&
    annualMeanTemperature < 18
  ) {
    return "H";
  }
  if (warmestMonth < 0) return "EF";
  if (warmestMonth < 10) return "ET";

  const summerMonths = latitude >= 0 ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 0, 1, 2];
  const winterMonths = latitude >= 0 ? [9, 10, 11, 0, 1, 2] : [3, 4, 5, 6, 7, 8];
  const summerPrecipitation = sum(summerMonths.map((monthIndex) => monthlyPrecipitationMm[monthIndex]));
  const summerPrecipitationRatio =
    annualPrecipitation > 0 ? summerPrecipitation / annualPrecipitation : 0;
  let drynessThreshold = 20 * annualMeanTemperature;

  if (summerPrecipitationRatio >= 0.7) {
    drynessThreshold += 280;
  } else if (summerPrecipitationRatio >= 0.3) {
    drynessThreshold += 140;
  }

  if (annualPrecipitation < drynessThreshold) {
    return annualPrecipitation < drynessThreshold / 2 ? "Bw" : "BS";
  }

  if (coldestMonth >= 18) {
    if (driestMonth >= 60) return "Af";
    if (driestMonth >= 100 - annualPrecipitation / 25) return "Am";
    return "Aw";
  }

  const summerDryness = Math.min(...summerMonths.map((monthIndex) => monthlyPrecipitationMm[monthIndex]));
  const winterWettest = Math.max(...winterMonths.map((monthIndex) => monthlyPrecipitationMm[monthIndex]));
  const winterDryness = Math.min(...winterMonths.map((monthIndex) => monthlyPrecipitationMm[monthIndex]));
  const summerWettest = Math.max(...summerMonths.map((monthIndex) => monthlyPrecipitationMm[monthIndex]));
  const hasDrySummer = summerDryness < 40 && summerDryness < winterWettest / 3;
  const hasDryWinter = winterDryness < summerWettest / 10;
  const warmMonths = monthlyTemperatureC.filter((value) => value >= 10).length;

  if (coldestMonth > 0) {
    if (hasDrySummer) return "Cs";
    if (hasDryWinter) return "Cw";
    return warmestMonth >= 22 && warmMonths >= 4 ? "Cfa" : "Cfb";
  }

  return hasDryWinter ? "Dw" : "Df";
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
  const seenNames = new Set();

  regions.forEach((region, index) => {
    const label = region?.name ? `${region.name}(${region.id ?? index})` : `regions[${index}]`;

    if (typeof region?.id !== "string" || !region.id) {
      errors.push(`${label}: id가 없습니다.`);
    } else if (seenIds.has(region.id)) {
      errors.push(`${label}: id가 중복됩니다.`);
    } else {
      seenIds.add(region.id);
    }

    if (typeof region?.name !== "string" || !region.name.trim()) {
      errors.push(`${label}: 지역명이 없습니다.`);
    } else if (seenNames.has(region.name)) {
      errors.push(`${label}: 지역명이 중복됩니다.`);
    } else {
      seenNames.add(region.name);
    }

    validateMonthlySeries(region?.monthlyTemperatureC, `${label}: 월평균 기온`, errors);
    validateMonthlySeries(region?.monthlyPrecipitationMm, `${label}: 월강수량`, errors, {
      nonNegative: true,
    });

    if (!Number.isFinite(region?.annualMeanTemperatureC)) {
      errors.push(`${label}: 연평균 기온이 유효한 숫자가 아닙니다.`);
    }
    if (!Number.isFinite(region?.annualPrecipitationMm) || region.annualPrecipitationMm < 0) {
      errors.push(`${label}: 연강수량이 유효한 숫자가 아닙니다.`);
    }

    if (
      Array.isArray(region?.monthlyTemperatureC) &&
      region.monthlyTemperatureC.length === EXPECTED_MONTH_COUNT &&
      region.monthlyTemperatureC.every(Number.isFinite)
    ) {
      const monthlyMean = average(region.monthlyTemperatureC);
      if (Math.abs(monthlyMean - region.annualMeanTemperatureC) > 0.25) {
        errors.push(`${label}: 월평균 기온 평균과 연평균 기온의 차이가 0.25℃를 넘습니다.`);
      }
    }

    if (
      Array.isArray(region?.monthlyPrecipitationMm) &&
      region.monthlyPrecipitationMm.length === EXPECTED_MONTH_COUNT &&
      region.monthlyPrecipitationMm.every(Number.isFinite)
    ) {
      const monthlyTotal = sum(region.monthlyPrecipitationMm);
      if (Math.abs(monthlyTotal - region.annualPrecipitationMm) > 1.2) {
        errors.push(`${label}: 월강수량 합계와 연강수량의 차이가 1.2mm를 넘습니다.`);
      }
    }

    const latitude = region?.coordinates?.latitude;
    const longitude = region?.coordinates?.longitude;
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      errors.push(`${label}: 위도가 유효하지 않습니다.`);
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      errors.push(`${label}: 경도가 유효하지 않습니다.`);
    }

    const sourceType = region?.source?.type;
    if (!SUPPORTED_SOURCE_TYPES.has(sourceType)) {
      errors.push(`${label}: 지원하지 않는 출처 유형(${sourceType ?? "없음"})입니다.`);
    }
    if (region?.source?.period !== "1991-2020") {
      errors.push(`${label}: 출처 기준 기간이 1991-2020이 아닙니다.`);
    }
    if (sourceType === "jma" && !region.source.stn) {
      errors.push(`${label}: JMA 지점 번호가 없습니다.`);
    }
    if (region?.classificationBasis !== "curriculum-curated") {
      errors.push(`${label}: 기후 분류 기준이 curriculum-curated로 명시되지 않았습니다.`);
    }
    if (!['aligned', 'review-required'].includes(region?.classificationReview?.status)) {
      errors.push(`${label}: 기후 분류 검토 상태가 없습니다.`);
    }
  });

  const actualBreakdown = countBy(regions, (region) => region.source.type);
  if (JSON.stringify(dataset.summary?.sourceBreakdown) !== JSON.stringify(actualBreakdown)) {
    errors.push("summary.sourceBreakdown이 실제 지역별 출처 수와 일치하지 않습니다.");
  }
  if (dataset.summary?.regionCount !== regions.length) {
    errors.push("summary.regionCount가 실제 지역 수와 일치하지 않습니다.");
  }

  const mergeMeta = dataset.meta?.jmaMerge;
  if (mergeMeta) {
    const expectedJmaCount = Number(mergeMeta.jma_full) + Number(mergeMeta.jma_temp_only);
    if ((actualBreakdown.jma ?? 0) !== expectedJmaCount) {
      errors.push("JMA 반영 지역 수가 meta.jmaMerge와 일치하지 않습니다.");
    }
    if ((actualBreakdown["open-meteo"] ?? 0) !== Number(mergeMeta.open_meteo_kept)) {
      errors.push("Open-Meteo 보완 지역 수가 meta.jmaMerge와 일치하지 않습니다.");
    }
    if (dataset.summary?.jmaTemperatureOnly !== Number(mergeMeta.jma_temp_only)) {
      errors.push("JMA 기온 단독 반영 지역 수가 meta.jmaMerge와 일치하지 않습니다.");
    }
  }

  return errors;
}

function validateMonthlySeries(series, label, errors, { nonNegative = false } = {}) {
  if (!Array.isArray(series) || series.length !== EXPECTED_MONTH_COUNT) {
    errors.push(`${label}이 12개 값으로 구성되지 않았습니다.`);
    return;
  }
  if (!series.every(Number.isFinite)) {
    errors.push(`${label}에 숫자가 아닌 값이 있습니다.`);
  }
  if (nonNegative && series.some((value) => value < 0)) {
    errors.push(`${label}에 음수가 있습니다.`);
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
  const { summary } = dataset;
  return [
    `기후 데이터 검증 완료: ${summary.regionCount}개 지역`,
    `JMA 전면 반영 ${summary.jmaFull}개`,
    `JMA 기온 반영 ${summary.jmaTemperatureOnly}개`,
    `Open-Meteo 보완 ${summary.openMeteoFallback}개`,
    `기준 ${summary.period}`,
  ].join(" · ");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

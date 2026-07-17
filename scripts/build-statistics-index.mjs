import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = path.join(ROOT_DIR, "data", "statistics-index.json");
const JS_PATH = path.join(ROOT_DIR, "data", "statistics-index.js");
const args = process.argv.slice(2);
const shouldWrite = args.includes("--write");
const shouldCheck = args.includes("--check");

if (shouldWrite === shouldCheck) fail("--write 또는 --check 중 하나만 지정해야 합니다.");

function main() {
  const worldBundle = readBrowserBundle(path.join(ROOT_DIR, "data", "country-stats.js"));
  const examCountryCatalogBundle = readBrowserBundle(path.join(ROOT_DIR, "data", "exam-country-catalog.js"));
  const koreaBundle = readBrowserBundle(path.join(ROOT_DIR, "data", "korea-stats.js"));
  const worldClimate = readJson(path.join(ROOT_DIR, "tools", "climate", "data", "climate-data.json"));
  const koreaClimate = readJson(path.join(ROOT_DIR, "tools", "climate", "data", "korea-climate-data.json"));
  const supplemental = readJson(path.join(ROOT_DIR, "data", "supplemental-stats.json"));
  const graphCatalog = readJson(path.join(ROOT_DIR, "data", "graph-catalog.json"));

  const index = buildIndex({
    worldBundle,
    examCountryCatalog: examCountryCatalogBundle.EXAM_COUNTRY_CATALOG || {},
    koreaBundle,
    worldClimate,
    koreaClimate,
    supplemental,
    graphCatalog,
  });
  validateIndex(index);

  const jsonOutput = `${JSON.stringify(index, null, 2)}\n`;
  const jsOutput = `window.STATISTICS_DATA_INDEX = ${JSON.stringify(index)};\n`;

  if (shouldWrite) {
    fs.writeFileSync(JSON_PATH, jsonOutput, "utf8");
    fs.writeFileSync(JS_PATH, jsOutput, "utf8");
    console.log(summary(index, "통계 색인 생성 완료"));
  } else {
    if (!fs.existsSync(JSON_PATH) || fs.readFileSync(JSON_PATH, "utf8") !== jsonOutput) {
      fail("statistics-index.json이 현재 통계 번들과 다릅니다.");
    }
    if (!fs.existsSync(JS_PATH) || fs.readFileSync(JS_PATH, "utf8") !== jsOutput) {
      fail("statistics-index.js가 JSON 색인과 다릅니다.");
    }
    console.log(summary(index, "통계 색인 검증 완료"));
  }
}

function buildIndex({ worldBundle, examCountryCatalog, koreaBundle, worldClimate, koreaClimate, supplemental, graphCatalog }) {
  const worldMeta = worldBundle.COUNTRY_STATS_META || {};
  const worldById = worldBundle.COUNTRY_STATS_BY_ID || {};
  const koreaMeta = koreaBundle.KOREA_GEO_STATS_META || {};
  const koreaRegions = koreaBundle.KOREA_GEO_STATS_REGIONS || {};
  const koreaMetrics = koreaBundle.KOREA_GEO_STATS_METRICS || {};
  const worldMetrics = buildWorldMetrics(worldMeta, worldById);
  const countries = buildWorldCountryIndex(worldById, worldMetrics, examCountryCatalog);
  const metrics = [
    ...worldMetrics,
    ...buildKoreaMetrics(koreaMetrics, koreaRegions),
    ...buildClimateMetrics(worldClimate, koreaClimate),
  ].sort((a, b) => `${a.scopeOrder}|${a.category}|${a.label}|${a.level || ""}`.localeCompare(`${b.scopeOrder}|${b.category}|${b.label}|${b.level || ""}`, "ko"));

  const patternDefinitions = buildGraphPatterns(graphCatalog.items || []);
  const examPatternReferences = patternDefinitions.reduce((sum, pattern) => sum + pattern.count, 0);
  const referenceOnlyReferences = (graphCatalog.items || []).filter((item) => item.examPattern === "reference-only").length;
  const koreaLevelCoverage = Object.fromEntries(
    Object.entries(koreaRegions).map(([level, regions]) => [level, Object.keys(regions || {}).length])
  );
  const koreaMetricCoverage = Object.fromEntries(
    Object.entries(koreaMetrics).map(([level, entries]) => [level, Object.keys(entries || {}).length])
  );

  return {
    meta: {
      schemaVersion: 2,
      snapshotDate: graphCatalog.meta?.snapshotDate || worldMeta.cacheSnapshotDate || "unknown",
      worldGeneratedAt: worldMeta.generatedAt || "",
      koreaGeneratedAt: koreaMeta.generatedAt || "",
      description: "그래프를 생성하지 않고 최신 통계의 범위·시점·출처와 수능형 활용 위치를 찾기 위한 경량 색인",
    },
    coverage: {
      worldCountries: Object.values(worldById).filter((entry) => entry?.iso3).length,
      examCountries: countries.length,
      examCoreCountries: countries.filter((country) => country.tier === "core").length,
      examSupportCountries: countries.filter((country) => country.tier === "support").length,
      koreaRegions: koreaLevelCoverage,
      koreaMetrics: koreaMetricCoverage,
      worldClimateStations: worldClimate.regions?.length || 0,
      koreaClimateStations: koreaClimate.regions?.length || 0,
      graphReferences: graphCatalog.items?.length || 0,
      examPatternReferences,
      referenceOnlyReferences,
      metricIndexEntries: metrics.length,
      supplementalDatasets: supplemental.datasets?.length || 0,
      supplementalSourcePointers: supplemental.sourcePointers?.length || 0,
    },
    workflows: [
      {
        key: "map-editor",
        label: "Map Editor",
        eyebrow: "SELECT · COMBINE · EXPORT",
        description: "세계·한국 대상 선택, Item Lab의 교차 문항 설계, Graph Builder의 수능형 그래프 제작을 한 흐름에서 처리함.",
        href: "../../map.html#statisticsSection",
      },
      {
        key: "climate-world",
        label: "Climate Atlas · World",
        eyebrow: "COMPARE · NORMALS",
        description: "세계 169개 지점의 1991–2020 월별 기온·강수량을 지도와 비교 그래프로 확인함.",
        href: "../climate/index.html",
      },
      {
        key: "climate-korea",
        label: "Climate Atlas · Korea",
        eyebrow: "ASOS · AWS · NORTH",
        description: "남한 219개와 북한 27개 지점의 기후 평년값을 같은 비교 도구에서 확인함.",
        href: "../climate/korea.html",
      },
    ],
    graphPatterns: patternDefinitions,
    countries,
    metrics: metrics.map(({ scopeOrder, entityAvailability, ...metric }) => metric),
    supplemental: {
      datasets: (supplemental.datasets || []).map((dataset) => ({
        id: dataset.id,
        title: dataset.title,
        topic: dataset.topic || "multiple",
        scope: dataset.scope || "world",
        recordCount: Number(dataset.recordCount || dataset.records?.length || 0),
        referenceYears: dataset.referenceYears || [],
        units: dataset.units || [],
        sourceName: dataset.source?.name || "출처 정보 확인 필요",
        sourceUrl: dataset.source?.url || "",
      })),
      sourcePointers: (supplemental.sourcePointers || []).map((pointer) => ({
        id: pointer.id,
        title: pointer.title,
        topic: pointer.topic || "multiple",
        scope: pointer.scope || "multiple",
        assetCount: nullableNonNegativeNumber(pointer.assetCount),
        sourceName: pointer.source?.name || "출처 정보 확인 필요",
        sourceUrl: pointer.source?.url || "",
      })),
    },
    sourceAudit: {
      resolved: (graphCatalog.items || []).filter((item) => !item.provenanceGap && !item.unresolvedSource).length,
      provenanceGap: Number(graphCatalog.meta?.provenanceGapCount || 0),
      unresolved: Number(graphCatalog.meta?.unresolvedSourceCount || 0),
    },
  };
}

function buildWorldMetrics(meta, statsById) {
  const entities = Object.entries(statsById)
    .filter(([, entry]) => entry?.iso3)
    .map(([id, entry]) => ({ id: String(id), entry }));
  const metrics = [];
  const seriesSpecs = [
    ["population", "총인구", "population.rows", "population", "명", "population"],
    ["urbanPopulation", "도시 인구", "population.rows", "urbanPopulation", "명", "population"],
    ["ruralPopulation", "촌락 인구", "population.rows", "ruralPopulation", "명", "population"],
    ["urbanShare", "도시 인구 비율", "population.rows", "urbanShare", "%", "population"],
    ["ruralShare", "촌락 인구 비율", "population.rows", "ruralShare", "%", "population"],
    ["birthRate", "조출생률", "population.rates.rows", "birthRate", "‰", "populationRates"],
    ["deathRate", "조사망률", "population.rates.rows", "deathRate", "‰", "populationRates"],
    ["naturalIncreaseRate", "자연 증가율", "population.rates.rows", "naturalIncreaseRate", "‰", "populationRates"],
  ];

  for (const [key, label, rowsPath, valueKey, unit, sourceKey] of seriesSpecs) {
    const observations = entities.map(({ id, entry }) => {
      const rows = (getPath(entry, rowsPath) || []).filter((row) => isFiniteNumber(row?.[valueKey]));
      const row = rows.at(-1);
      return { entityId: id, value: row?.[valueKey], period: row?.year };
    });
    metrics.push(makeMetric({
      id: `world:series:${key}`,
      scope: "world",
      scopeLabel: "세계 국가",
      scopeOrder: 1,
      category: "인구·도시",
      label,
      unit,
      kind: "series",
      observations,
      totalCount: entities.length,
      source: sourceFromWorldMeta(meta, sourceKey),
      uses: ["교차 비교", "변화·지수", "Map Editor"],
    }));
  }

  const objectPaths = new Map();
  for (const entity of entities) {
    walkWorldEntryObjects(entity.entry, [], (entryPath, entry) => {
      if (!objectPaths.has(entryPath)) objectPaths.set(entryPath, entry);
    });
  }
  for (const [entryPath, sample] of objectPaths) {
    const observations = entities.map(({ id, entry: entity }) => {
      const entry = getPath(entity, entryPath);
      if (isFiniteNumber(entry?.latest?.value)) return { entityId: id, value: entry.latest.value, period: entry.latest.year };
      return { entityId: id, value: entry?.value, period: entry?.year };
    });
    metrics.push(makeMetric({
      id: `world:entry:${entryPath}`,
      scope: "world",
      scopeLabel: "세계 국가",
      scopeOrder: 1,
      category: categoryLabelForWorldPath(entryPath),
      label: labelForWorldObjectPath(entryPath, sample),
      unit: normalizeUnit(sample.unit),
      kind: "scalar",
      observations,
      totalCount: entities.length,
      source: sourceFromWorldMeta(meta, sourceKeyForWorldPath(entryPath), entryPath),
      uses: ["대상 비교", "교차 지표", "Map Editor"],
    }));
  }

  const primitiveRoots = ["populationStructure", "economy.industry", "religion2020", "energy", "agriculture.crops.use"];
  const primitivePaths = new Set();
  for (const entity of entities) {
    for (const root of primitiveRoots) walkNumericLeaves(getPath(entity.entry, root), root.split("."), primitivePaths);
  }
  for (const primitivePath of primitivePaths) {
    if (shouldSkipPrimitivePath(primitivePath)) continue;
    const observations = entities.map(({ id, entry }) => ({ entityId: id, ...resolveWorldPrimitive(entry, primitivePath) }));
    const isShare = primitivePath.includes("share") || primitivePath.includes("shares") || primitivePath.includes("dependencyRatios");
    metrics.push(makeMetric({
      id: `world:value:${primitivePath}`,
      scope: "world",
      scopeLabel: "세계 국가",
      scopeOrder: 1,
      category: categoryLabelForWorldPath(primitivePath),
      label: labelForWorldPrimitivePath(primitivePath),
      unit: unitForPrimitivePath(primitivePath),
      kind: "scalar",
      observations,
      totalCount: entities.length,
      source: sourceFromWorldMeta(meta, sourceKeyForWorldPath(primitivePath), primitivePath),
      uses: isShare ? ["구성비", "사례국 비교", "Map Editor"] : ["대상 비교", "교차 지표", "Map Editor"],
    }));
  }

  const compositions = [
    ["age-structure", "연령별 인구 구성", "populationStructure", "populationStructure.shares", ["age0To14", "age15To64", "age65Plus"]],
    ["industry-structure", "산업별 부가가치 구성", "industry", "economy.industry.shares", ["agriculture", "industry", "services"]],
    ["religion", "종교 구성", "religion", "religion2020.shares", ["christians", "muslims", "hindus", "buddhists", "jews", "noReligion", "other"]],
    ["consumption-mix", "1차 에너지 소비 구성", "energyConsumption", "energy.consumption.shareBreakdown", PRIMARY_ENERGY_KEYS],
    ["electricity-mix", "발전량 구성", "electricity", "energy.electricity.shareBreakdown", ELECTRICITY_KEYS],
    ["fossil-production-mix", "화석 에너지 생산 구성", "fossilProduction", "energy.fossilProduction.shareBreakdown", ["coal", "oil", "gas"]],
    ["wheat-use", "밀 용도별 구성", "cropUse", "agriculture.crops.use.wheat.shares", ["food", "feed", "bioenergy", "other"]],
    ["rice-use", "쌀 용도별 구성", "cropUse", "agriculture.crops.use.rice.shares", ["food", "feed", "bioenergy", "other"]],
    ["maize-use", "옥수수 용도별 구성", "cropUse", "agriculture.crops.use.maize.shares", ["food", "feed", "bioenergy", "other"]],
  ];
  for (const [key, label, sourceKey, root, components] of compositions) {
    const observations = entities.map(({ id, entry }) => {
      const componentValues = components.map((component) => resolveWorldPrimitive(entry, `${root}.${component}`));
      const validValues = componentValues.filter((entry) => isFiniteNumber(entry.value));
      const complete = validValues.length === components.length;
      return {
        entityId: id,
        value: complete ? validValues.reduce((sum, entry) => sum + entry.value, 0) : null,
        period: complete ? summarizePeriods(validValues.map((entry) => entry.period)).label : "",
        partial: validValues.length > 0 && !complete,
      };
    });
    metrics.push(makeMetric({
      id: `world:composition:${key}`,
      scope: "world",
      scopeLabel: "세계 국가",
      scopeOrder: 1,
      category: categoryLabelForWorldPath(root),
      label,
      unit: "%",
      kind: "composition",
      observations,
      totalCount: entities.length,
      source: sourceFromWorldMeta(meta, sourceKey, root),
      uses: ["구성비", "병렬 비교", "Map Editor"],
      coverageBasis: "complete-components",
      partialCoverageCount: observations.filter((observation) => observation.partial).length,
    }));
  }

  return uniqueBy(metrics, (metric) => metric.id);
}

function buildWorldCountryIndex(statsById, worldMetrics, examCountryCatalog) {
  const categories = [...new Set(worldMetrics.map((metric) => metric.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ko"));
  const statsByIso3 = new Map(
    Object.entries(statsById)
      .filter(([, entry]) => entry?.iso3)
      .map(([id, entry]) => [String(entry.iso3).toUpperCase(), { id: String(id), entry }])
  );
  const availabilityByMetric = new Map(
    worldMetrics.map((metric) => [
      metric.id,
      new Map((metric.entityAvailability || []).map((entry) => [entry.entityId, entry.status])),
    ])
  );

  return Object.entries(examCountryCatalog)
    .map(([rawIso3, definition]) => {
      const iso3 = String(rawIso3).toUpperCase();
      const source = statsByIso3.get(iso3);
      if (!source) fail(`출제 국가 카탈로그와 원자료를 연결할 수 없습니다: ${iso3}`);
      const { id, entry } = source;
      const categoryCoverage = categories.map((category) => {
        const categoryMetrics = worldMetrics.filter((metric) => metric.category === category);
        const statuses = categoryMetrics.map((metric) => availabilityByMetric.get(metric.id)?.get(String(id)) || "missing");
        const availableCount = statuses.filter((status) => status === "available").length;
        const partialCount = statuses.filter((status) => status === "partial").length;
        const missingCount = statuses.length - availableCount - partialCount;
        return {
          category,
          availableCount,
          partialCount,
          missingCount,
          totalCount: statuses.length,
          coverageRate: statuses.length ? Number(((availableCount / statuses.length) * 100).toFixed(1)) : 0,
        };
      });
      const availableMetricCount = categoryCoverage.reduce((sum, group) => sum + group.availableCount, 0);
      const partialMetricCount = categoryCoverage.reduce((sum, group) => sum + group.partialCount, 0);
      const missingMetricCount = categoryCoverage.reduce((sum, group) => sum + group.missingCount, 0);
      const totalMetricCount = categoryCoverage.reduce((sum, group) => sum + group.totalCount, 0);
      return {
        id: String(id),
        iso3,
        tier: definition.tier,
        nameKo: definition.nameKo,
        aliases: Array.isArray(definition.aliases) ? definition.aliases : [],
        topics: definition.topics,
        name: entry.atlasName || iso3,
        continent: entry.continent?.name || "대륙 분류 없음",
        availableMetricCount,
        partialMetricCount,
        missingMetricCount,
        totalMetricCount,
        coverageRate: totalMetricCount ? Number(((availableMetricCount / totalMetricCount) * 100).toFixed(1)) : 0,
        availableCategoryCount: categoryCoverage.filter((group) => group.availableCount > 0).length,
        missingCategories: categoryCoverage.filter((group) => group.availableCount === 0).map((group) => group.category),
        categoryCoverage,
        graphBuilderHref: `../../map.html?graphCountry=${encodeURIComponent(iso3)}#examGraphModule`,
      };
    })
    .sort((a, b) => {
      const tierOrder = { core: 0, support: 1 };
      return (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9)
        || a.nameKo.localeCompare(b.nameKo, "ko")
        || a.name.localeCompare(b.name, "en");
    });
}

function buildKoreaMetrics(metricsByLevel, regionsByLevel) {
  const levelLabels = { provinces: "시도", cities: "시군", metroDistricts: "특·광역시 구군" };
  const output = [];
  for (const [level, rawMetrics] of Object.entries(metricsByLevel)) {
    const totalCount = Object.keys(regionsByLevel[level] || {}).length;
    for (const raw of Object.values(rawMetrics || {})) {
      const observations = Object.values(raw.latestByRegion || {}).map((row) => ({ value: row?.value, period: row?.periodLabel || row?.periodKey }));
      const hasSeries = Object.values(raw.seriesByRegion || {}).some((rows) => (rows || []).filter((row) => isFiniteNumber(row?.value)).length > 1);
      const uses = hasSeries ? ["지역 비교", "변화·지수", "Map Editor"] : ["지역 비교", "교차 지표", "Map Editor"];
      if (raw.canBeNegative) uses.unshift("양·음 대조");
      output.push(makeMetric({
        id: `korea:${level}:${raw.key}`,
        scope: "korea",
        scopeLabel: `한국 ${levelLabels[level] || level}`,
        scopeOrder: 2,
        level,
        levelLabel: levelLabels[level] || level,
        category: raw.categoryLabel || raw.category || "기타",
        label: raw.label,
        unit: raw.unit || "",
        kind: hasSeries ? "series" : "scalar",
        observations,
        totalCount,
        source: { name: raw.sourceText || raw.sourceName || "KOSIS", url: raw.statTableUrl || raw.pageUrl || "" },
        uses,
        canBeNegative: Boolean(raw.canBeNegative),
      }));
    }
  }
  return output;
}

function buildClimateMetrics(worldClimate, koreaClimate) {
  const specs = [
    ["temperature", "연평균 기온", "annualMeanTemperatureC", "℃"],
    ["precipitation", "연 강수량", "annualPrecipitationMm", "mm"],
  ];
  const output = [];
  for (const [key, label, field, unit] of specs) {
    output.push(makeMetric({
      id: `climate:world:${key}`,
      scope: "climate-world",
      scopeLabel: "세계 기후",
      scopeOrder: 3,
      category: "기후",
      label,
      unit,
      kind: "series",
      observations: (worldClimate.regions || []).map((region) => ({ value: region[field], period: worldClimate.summary?.period || "1991–2020" })),
      totalCount: worldClimate.regions?.length || 0,
      source: worldClimateSource(worldClimate),
      uses: ["계절 대조", "지점 비교", "Climate Atlas"],
    }));
  }
  const koreaSpecs = [
    ...specs,
    ["cold-days", "일최저기온 0℃ 미만 일수", "annualColdDaysBelowZero", "일"],
    ["hot-nights", "일최저기온 25℃ 이상 일수", "annualHotDaysAboveTwentyFiveMin", "일"],
  ];
  for (const [key, label, field, unit] of koreaSpecs) {
    output.push(makeMetric({
      id: `climate:korea:${key}`,
      scope: "climate-korea",
      scopeLabel: "한반도 기후",
      scopeOrder: 4,
      category: "기후",
      label,
      unit,
      kind: "series",
      observations: (koreaClimate.regions || []).map((region) => ({ value: region[field], period: koreaClimate.summary?.period || "1991–2020" })),
      totalCount: koreaClimate.regions?.length || 0,
      source: { name: koreaClimate.summary?.sourceLabel || "기상청 기후평년값", url: "https://data.kma.go.kr/normals/table.do" },
      uses: ["계절 대조", "지점 비교", "Climate Atlas"],
    }));
  }
  return output;
}

function makeMetric({ observations, totalCount, source, ...metric }) {
  const valid = observations.filter((observation) => isFiniteNumber(observation?.value));
  const periods = summarizePeriods(valid.map((observation) => observation.period));
  const entityAvailability = observations
    .filter((observation) => observation?.entityId != null)
    .map((observation) => ({
      entityId: String(observation.entityId),
      status: isFiniteNumber(observation.value) ? "available" : observation.partial ? "partial" : "missing",
    }));
  return {
    ...metric,
    category: normalizeExamMetricCategory(metric.category),
    coverageCount: valid.length,
    totalCount,
    coverageRate: totalCount ? Number(((valid.length / totalCount) * 100).toFixed(1)) : 0,
    latestPeriod: periods.label || "시점 확인 필요",
    periodValues: periods.values,
    sourceName: source.name || "출처 정보 확인 필요",
    sourceUrl: source.url || "",
    ...(source.links?.length ? { sourceLinks: source.links } : {}),
    ...(entityAvailability.length ? { entityAvailability } : {}),
  };
}

function normalizeExamMetricCategory(category) {
  const normalized = String(category || "기타").trim();
  const aliases = {
    "인구 구조": "인구·도시",
    "인구 구조·이동": "인구·도시",
    "인구 이동": "인구·도시",
    "인구·도시": "인구·도시",
    "도시·정주": "인구·도시",
    "농업·토지": "식량·농업",
    "농업·촌락": "식량·농업",
    "경제·산업": "산업·교역",
    "공업·서비스": "산업·교역",
    "에너지": "자원·에너지",
    "기후·에너지": "자원·에너지",
    "기후": "기후",
    "종교": "종교·문화",
  };
  return aliases[normalized] || normalized;
}

function buildGraphPatterns(items) {
  const definitions = [
    {
      key: "composition-contrast",
      label: "구성 구조 대조",
      description: "같은 3~5개 후보의 내부 구성을 100% 누적 막대나 병렬 원으로 비교함.",
      transform: "비율 · 기타 합산 · 표시 임계값",
      tool: "Map Editor · Graph Builder",
      exampleMatchers: [/export_product_composition/, /power_capacity_mix/, /manufacturing_industry_region_pies/],
    },
    {
      key: "cross-indicator",
      label: "교차 지표 판별",
      description: "동일 후보를 서로 다른 지표와 패널에 반복 배치해 조합의 모양으로 판별함.",
      transform: "단위 분리 · 필요 시 상댓값화 · 지표별 시점 명시",
      tool: "Map Editor · Item Lab",
      exampleMatchers: [/hwaseong_icheon/, /seoul_district_land_density/, /density_industry_gdp_table/],
    },
    {
      key: "relationship-scatter",
      label: "관계·산점도",
      description: "X·Y와 규모를 함께 읽거나 같은 후보를 두 산점도에 반복 배치함.",
      transform: "사분면 · 버블 크기 · 예외 후보",
      tool: "Map Editor · Graph Builder",
      exampleMatchers: [/region_crop_production_area_scatter/, /snow_precip_heatwave_scatter/, /air_energy_power.*side_by_side/],
    },
    {
      key: "change-index",
      label: "변화·지수·궤적",
      description: "최신값 순위 대신 시작점, 변화 폭, 역전 시점과 기준 연도 대비 경로를 분리함.",
      transform: "기준 연도=100 · 2시점 · 다중 패널",
      tool: "Map Editor · Graph Builder",
      exampleMatchers: [/population_index.*1975base/, /manufacturing_shipments_index/, /natural_increase_net_migration.*three_panel/],
    },
    {
      key: "climate-contrast",
      label: "기후 대조·편차",
      description: "Climate Atlas에서 월별 원자료를 확인하고, 기준 지점 차·평균 편차·월 대조는 별도 변환해 설계함.",
      transform: "기준 지점 차 · 평균 편차 · 월 대조",
      tool: "Climate Atlas 원자료 · 전용 변환 필요",
      exampleMatchers: [/climate_deviation/, /climate_difference/, /foehn_temperature_humidity/],
    },
    {
      key: "profile-structure",
      label: "연령·분포 프로필",
      description: "인구 피라미드와 연령·성비 프로필처럼 범용 순위 막대로 환원할 수 없는 구조임.",
      transform: "좌우 축 · 연령대 · 패널 대응",
      tool: "전용 템플릿 참고",
      exampleMatchers: [/pop_pyramid/, /age_sex_ratio/, /region_age_structure/],
    },
    {
      key: "spatial-process",
      label: "공간·과정 자료",
      description: "하천 수위, 해안선 변화, 단면처럼 위치와 과정이 함께 있어야 의미가 고정됨.",
      transform: "기준선 · 거리 · 시점 비교",
      tool: "Map Editor · 지도 결합",
      exampleMatchers: [/coastline_sinuosity/, /waterlevel/, /alluvial_fan_profile/],
    },
  ];
  return definitions.map(({ exampleMatchers, ...definition }) => {
    const matching = items.filter((item) => item.examPattern === definition.key);
    const examples = uniqueBy(
      exampleMatchers.flatMap((matcher) => matching.filter((item) => matcher.test(item.filename)).slice(0, 1)),
      (item) => item.id,
    ).slice(0, 3);
    return {
      ...definition,
      count: matching.length,
      examples: (examples.length ? examples : matching.slice(0, 3)).map((item) => item.title),
    };
  });
}

function summarizePeriods(periods) {
  const values = [...new Set(periods.map((period) => String(period ?? "").trim()).filter(Boolean))]
    .sort(comparePeriod);
  if (!values.length) return { label: "", values: [] };
  if (values.length === 1) return { label: values[0], values };
  const numericYears = values.filter((value) => /^\d{4}$/.test(value)).map(Number);
  if (numericYears.length === values.length) {
    const min = Math.min(...numericYears);
    const max = Math.max(...numericYears);
    return { label: min === max ? String(max) : `${min}–${max} 혼합`, values };
  }
  if (values.length <= 3) return { label: values.join(" · "), values };
  return { label: `${values[0]}–${values.at(-1)} 혼합`, values };
}

function comparePeriod(a, b) {
  const numericA = Number(String(a).match(/^\d{4}/)?.[0]);
  const numericB = Number(String(b).match(/^\d{4}/)?.[0]);
  if (Number.isFinite(numericA) && Number.isFinite(numericB) && numericA !== numericB) return numericA - numericB;
  return String(a).localeCompare(String(b), "ko");
}

function walkWorldEntryObjects(value, segments, callback) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  if (isWorldEntryObject(value)) {
    callback(segments.join("."), value);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (["latest", "source", "sources", "rows", "continent"].includes(key)) continue;
    walkWorldEntryObjects(child, [...segments, key], callback);
  }
}

function walkNumericLeaves(value, segments, output) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  if (isWorldEntryObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "latest") continue;
    const next = [...segments, key];
    if (isFiniteNumber(child)) output.add(next.join("."));
    else walkNumericLeaves(child, next, output);
  }
}

function isWorldEntryObject(value) {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && isFiniteNumber(value.value)
    && ("year" in value || "unit" in value || "label" in value)
  );
}

function shouldSkipPrimitivePath(entryPath) {
  if (/(^|\.)(year|latestYear)$/.test(entryPath)) return true;
  if (entryPath.includes(".latest.") || entryPath.endsWith(".value")) return true;
  return /^energy\.(consumption|electricity)\.summary(Shares|AmountsTWh)\.nuclear$/.test(entryPath);
}

function resolveWorldPrimitive(data, entryPath) {
  const referenceValue = getPath(data, entryPath);
  const container = versionContainerForPath(entryPath);
  if (container) {
    const rest = entryPath.slice(container.length + 1);
    const latestValue = getPath(data, `${container}.latest.${rest}`);
    const latestYear = getPath(data, `${container}.latest.year`);
    if (isFiniteNumber(latestValue)) return { value: latestValue, period: latestYear };
  }
  return { value: isFiniteNumber(referenceValue) ? referenceValue : null, period: container ? getPath(data, `${container}.year`) : findNearestYear(data, entryPath) };
}

function versionContainerForPath(entryPath) {
  if (entryPath.startsWith("populationStructure.")) return "populationStructure";
  if (entryPath.startsWith("economy.industry.")) return "economy.industry";
  const energyMatch = entryPath.match(/^energy\.([^.]+)\./);
  return energyMatch ? `energy.${energyMatch[1]}` : null;
}

function findNearestYear(data, entryPath) {
  const segments = entryPath.split(".");
  while (segments.length) {
    segments.pop();
    const year = getPath(data, [...segments, "year"]);
    if (year != null) return year;
  }
  return "";
}

function sourceFromWorldMeta(meta, sourceKey, entryPath = "") {
  const source = meta?.sources?.[WORLD_SOURCE_KEYS[sourceKey] || sourceKey] || {};
  const indicatorCodes = worldBankIndicatorCodesForPath(entryPath);
  if (!indicatorCodes.length) return { name: source.label || "저장된 원천 자료", url: source.url || "" };
  const links = indicatorCodes.map((indicatorCode) => ({
    label: `World Bank WDI · ${indicatorCode}`,
    url: worldBankIndicatorUrl(indicatorCode),
  }));
  return {
    name: `${source.label || "World Bank WDI"} · ${indicatorCodes.join(" · ")}`,
    url: links[0].url,
    links,
  };
}

function worldBankIndicatorCodesForPath(entryPath) {
  const exact = WORLD_BANK_INDICATORS_BY_PATH[entryPath];
  if (exact) return Array.isArray(exact) ? exact : [exact];
  const ageKey = entryPath.match(/^populationStructure\.(?:shares|counts)\.([^.]+)$/)?.[1];
  if (ageKey && WORLD_BANK_AGE_INDICATORS[ageKey]) return [WORLD_BANK_AGE_INDICATORS[ageKey]];
  const industryKey = entryPath.match(/^economy\.industry\.shares\.([^.]+)$/)?.[1];
  if (industryKey && WORLD_BANK_INDUSTRY_INDICATORS[industryKey]) return [WORLD_BANK_INDUSTRY_INDICATORS[industryKey]];
  return [];
}

function worldBankIndicatorUrl(indicatorCode) {
  return `https://api.worldbank.org/v2/country/all/indicator/${indicatorCode}?format=json&per_page=20000&mrv=5`;
}

function worldClimateSource(worldClimate) {
  const sources = worldClimate.sources || [];
  const jma = sources.find((source) => source.type === "jma");
  const openMeteo = sources.find((source) => source.type === "open-meteo" && /historical/i.test(source.label || ""))
    || sources.find((source) => source.type === "open-meteo");
  const fullFallbackCount = Number(worldClimate.summary?.openMeteoFallback || worldClimate.summary?.sourceBreakdown?.["open-meteo"] || 0);
  const precipitationFallbackCount = Number(worldClimate.summary?.jmaTemperatureOnly || 0);
  const links = [jma, openMeteo]
    .filter((source) => source?.url)
    .map((source) => ({ label: source.label || source.type, url: source.url }));
  const fallbackDescription = [
    fullFallbackCount > 0 ? `전면 ${fullFallbackCount}개` : "",
    precipitationFallbackCount > 0 ? `강수 ${precipitationFallbackCount}개` : "",
  ].filter(Boolean).join(" · ");
  return {
    name: fallbackDescription
      ? `JMA 세계 평년값(주 출처·링크) · Open-Meteo ERA5 ${fallbackDescription} 보완`
      : "JMA 세계 평년값",
    url: jma?.url || openMeteo?.url || "",
    links,
  };
}

function sourceKeyForWorldPath(entryPath) {
  if (entryPath.startsWith("populationStructure.density")) return "populationDensity";
  if (entryPath.startsWith("populationStructure")) return "populationStructure";
  if (entryPath.startsWith("migration.refugee")) return "refugees";
  if (entryPath.startsWith("migration")) return "migration";
  if (entryPath.includes("agriculture.land")) return "agriculturalLand";
  if (entryPath.includes("crops.trade")) return "cropTrade";
  if (entryPath.includes("crops.use")) return "cropUse";
  if (entryPath.includes("agriculture.crops")) return "cropProduction";
  if (entryPath.includes("livestock")) return "livestock";
  if (entryPath.startsWith("energy.consumption")) return "energyConsumption";
  if (entryPath.startsWith("energy.electricity")) return "electricity";
  if (entryPath.startsWith("energy.fossilProduction")) return "fossilProduction";
  if (entryPath.startsWith("energy.fossilTrade")) return "fossilTrade";
  if (entryPath.includes("economy.gdp")) return "gdp";
  if (entryPath.includes("economy.exports")) return "exports";
  if (entryPath.includes("economy.industry")) return "industry";
  if (entryPath.startsWith("religion2020")) return "religion";
  return "population";
}

function categoryLabelForWorldPath(entryPath) {
  const root = entryPath.split(".")[0];
  return CATEGORY_LABELS[root] || "기타";
}

function labelForWorldObjectPath(entryPath, sample = {}) {
  const parts = entryPath.split(".");
  if (entryPath.startsWith("agriculture.crops.production.")) return `${SEGMENT_LABELS[parts.at(-1)] || sample.label || parts.at(-1)} 생산량`;
  if (entryPath.startsWith("agriculture.crops.areaHarvested.")) return `${SEGMENT_LABELS[parts.at(-1)] || sample.label || parts.at(-1)} 수확 면적`;
  if (entryPath.startsWith("agriculture.crops.yield.")) return `${SEGMENT_LABELS[parts.at(-1)] || sample.label || parts.at(-1)} 단위면적당 수확량`;
  if (entryPath.startsWith("agriculture.crops.trade.")) return `${SEGMENT_LABELS[parts[3]] || parts[3]} ${parts[4] === "import" ? "수입량" : "수출량"}`;
  if (entryPath.startsWith("agriculture.livestock.stocks.")) return `${SEGMENT_LABELS[parts.at(-1)] || parts.at(-1)} 사육 두수`;
  if (entryPath.startsWith("agriculture.livestock.meat.")) return `${SEGMENT_LABELS[parts.at(-1)] || parts.at(-1)} 고기 생산량`;
  return sample.label || parts.map((part) => SEGMENT_LABELS[part] || part).join(" · ");
}

function labelForWorldPrimitivePath(entryPath) {
  const parts = entryPath.split(".");
  const last = parts.at(-1);
  if (entryPath.startsWith("populationStructure.shares.")) return `${SEGMENT_LABELS[last] || last} 인구 비율`;
  if (entryPath.startsWith("populationStructure.counts.")) return `${SEGMENT_LABELS[last] || last} 인구`;
  if (entryPath.startsWith("populationStructure.dependencyRatios.")) return SEGMENT_LABELS[last] || last;
  if (entryPath === "populationStructure.totalPopulation") return "인구 구조 기준 총인구";
  if (entryPath.startsWith("economy.industry.shares.")) return `${SEGMENT_LABELS[last] || last} 부가가치 비율`;
  if (entryPath.startsWith("religion2020.shares.")) return `${SEGMENT_LABELS[last] || last} 인구 비율`;
  if (entryPath.startsWith("religion2020.counts.")) return `${SEGMENT_LABELS[last] || last} 인구`;
  if (entryPath === "religion2020.totalPopulation") return "종교 통계 기준 총인구";
  if (entryPath.startsWith("agriculture.crops.use.")) {
    const crop = SEGMENT_LABELS[parts[3]] || parts[3];
    if (parts[4] === "shares") return `${crop} ${SEGMENT_LABELS[last] || last} 이용 비율`;
    if (parts[4] === "amounts") return `${crop} ${SEGMENT_LABELS[last] || last} 이용량`;
    if (last === "total") return `${crop} 총이용량`;
  }
  if (entryPath.startsWith("energy.")) {
    const group = parts[1] === "consumption" ? "1차 에너지 소비" : parts[1] === "electricity" ? "발전량" : "화석 에너지 생산";
    if (parts[2] === "totalTWh") return `${group} 합계`;
    if (["shareBreakdown", "summaryShares"].includes(parts[2])) return `${group} 중 ${SEGMENT_LABELS[last] || last} 비율`;
    if (["amountBreakdownTWh", "summaryAmountsTWh"].includes(parts[2])) return `${group} 중 ${SEGMENT_LABELS[last] || last}`;
  }
  return parts.map((part) => SEGMENT_LABELS[part] || part).join(" · ");
}

function unitForPrimitivePath(entryPath) {
  if (entryPath.startsWith("energy.")) {
    if (entryPath.includes(".shareBreakdown.") || entryPath.includes(".summaryShares.")) return "%";
    if (entryPath.includes(".amountBreakdownTWh.") || entryPath.includes(".summaryAmountsTWh.") || entryPath.endsWith(".totalTWh")) return "TWh";
    return "";
  }
  if (entryPath.includes(".shares.") || entryPath.includes(".shareBreakdown.") || entryPath.includes(".summaryShares.") || entryPath.includes("dependencyRatios")) return "%";
  if (entryPath.includes(".counts.") || entryPath.endsWith("totalPopulation")) return "명";
  if (entryPath.includes("agriculture.crops.use") && (entryPath.includes(".amounts.") || entryPath.endsWith(".total"))) return "t";
  return "";
}

function normalizeUnit(unit = "") {
  return ({
    people: "명",
    "people per sq. km of land area": "명/㎢",
    "current US$": "US$",
    An: "두",
    t: "t",
    ha: "ha",
    "kg/ha": "kg/ha",
    "% of population": "%",
    "% of land area": "%",
    "% of GDP": "%",
    "% of world exports": "%",
    "% of world imports": "%",
  })[String(unit)] || String(unit);
}

function getPath(value, entryPath) {
  const segments = Array.isArray(entryPath) ? entryPath : String(entryPath).split(".");
  return segments.reduce((current, segment) => current?.[segment], value);
}

function uniqueBy(values, getKey) {
  const seen = new Set();
  return values.filter((value) => {
    const key = getKey(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function nullableNonNegativeNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function validateIndex(index) {
  if (index.meta?.schemaVersion !== 2) fail("지원하지 않는 통계 색인 스키마입니다.");
  if (!Array.isArray(index.metrics) || index.metrics.length < 100) fail("통계 색인 항목이 지나치게 적습니다.");
  if (!Array.isArray(index.countries) || index.countries.length < 40 || index.countries.length >= index.coverage.worldCountries) {
    fail("출제 국가 카탈로그가 없거나 원자료 전체와 분리되지 않았습니다.");
  }
  if (index.coverage.examCountries !== index.countries.length) fail("출제 국가 카탈로그 수가 coverage와 다릅니다.");
  if (index.coverage.examCoreCountries + index.coverage.examSupportCountries !== index.countries.length) {
    fail("핵심·보조 출제 국가 수의 합이 카탈로그 전체와 다릅니다.");
  }
  const allowedTopics = new Set(EXAM_COUNTRY_TOPIC_KEYS);
  for (const country of index.countries) {
    if (!country.id || !country.iso3 || !country.name || !country.continent) fail(`국가·영토 기본 식별자가 누락되었습니다: ${country.id || "unknown"}`);
    if (!country.nameKo || !["core", "support"].includes(country.tier)) fail(`출제 국가 분류 또는 한국어명이 누락되었습니다: ${country.iso3}`);
    if (!Array.isArray(country.aliases) || country.aliases.some((alias) => typeof alias !== "string" || !alias.trim())) {
      fail(`출제 국가 검색 별칭이 유효하지 않습니다: ${country.iso3}`);
    }
    if (!Array.isArray(country.topics) || !country.topics.length || country.topics.some((topic) => !allowedTopics.has(topic))) {
      fail(`출제 국가 주제 태그가 유효하지 않습니다: ${country.iso3}`);
    }
    if (country.graphBuilderHref !== `../../map.html?graphCountry=${encodeURIComponent(country.iso3)}#examGraphModule`) {
      fail(`Graph Builder 연결이 올바르지 않습니다: ${country.iso3}`);
    }
    if (!Array.isArray(country.categoryCoverage) || !country.categoryCoverage.length) fail(`지표군 가용성 요약이 누락되었습니다: ${country.iso3}`);
    if (country.availableMetricCount + country.partialMetricCount + country.missingMetricCount !== country.totalMetricCount) {
      fail(`국가·영토 지표 가용성 합계가 맞지 않습니다: ${country.iso3}`);
    }
  }
  if (new Set(index.countries.map((country) => country.iso3)).size !== index.countries.length) fail("출제 국가 ISO3가 중복됩니다.");
  if (!Array.isArray(index.graphPatterns) || index.graphPatterns.length !== 7) fail("수능형 그래프 패턴이 7종이 아닙니다.");
  if (index.graphPatterns.reduce((sum, pattern) => sum + pattern.count, 0) !== index.coverage.examPatternReferences) {
    fail("수능형 그래프 패턴 합계가 수능형 SVG 레퍼런스 수와 다릅니다.");
  }
  if (index.coverage.examPatternReferences + index.coverage.referenceOnlyReferences !== index.coverage.graphReferences) {
    fail("수능형 및 참고용 SVG 레퍼런스 합계가 전체 SVG 수와 다릅니다.");
  }
  const ids = index.metrics.map((metric) => metric.id);
  if (new Set(ids).size !== ids.length) fail("통계 색인 id가 중복됩니다.");
  const metricCategories = new Set(index.metrics.map((metric) => metric.category));
  const unexpectedCategories = [...metricCategories].filter((category) => !EXAM_METRIC_CATEGORY_KEYS.includes(category));
  const missingCategories = EXAM_METRIC_CATEGORY_KEYS.filter((category) => !metricCategories.has(category));
  if (unexpectedCategories.length || missingCategories.length) {
    fail(`수능 대분류가 일관되지 않습니다. 초과: ${unexpectedCategories.join(", ") || "없음"} · 누락: ${missingCategories.join(", ") || "없음"}`);
  }
  const garbageValuePaths = ids.filter((id) => id.startsWith("world:value:") && id.endsWith(".value"));
  if (garbageValuePaths.length) fail(`stat-entry의 value leaf가 별도 지표로 수록되었습니다: ${garbageValuePaths.join(", ")}`);
  const redundantEnergyPaths = ids.filter((id) => /^world:value:energy\.(consumption|electricity)\.summary(Shares|AmountsTWh)\.nuclear$/.test(id));
  if (redundantEnergyPaths.length) fail(`에너지 의미 중복 지표가 수록되었습니다: ${redundantEnergyPaths.join(", ")}`);

  for (const metric of index.metrics) {
    if (!Number.isFinite(metric.coverageCount) || metric.coverageCount < 0 || metric.coverageCount > metric.totalCount) {
      fail(`수록 건수가 유효하지 않습니다: ${metric.id}`);
    }
    if (!Number.isFinite(metric.coverageRate) || metric.coverageRate < 0 || metric.coverageRate > 100) {
      fail(`수록률이 유효하지 않습니다: ${metric.id}`);
    }
    if (metric.kind === "composition") {
      if (metric.coverageBasis !== "complete-components") fail(`구성 지표가 완전 구성 기준이 아닙니다: ${metric.id}`);
      if (!Number.isFinite(metric.partialCoverageCount) || metric.partialCoverageCount < 0 || metric.coverageCount + metric.partialCoverageCount > metric.totalCount) {
        fail(`구성 지표의 부분 수록 건수가 유효하지 않습니다: ${metric.id}`);
      }
    }
  }

  const energyUnitErrors = index.metrics.filter((metric) => {
    if (!metric.id.startsWith("world:value:energy.")) return false;
    const entryPath = metric.id.slice("world:value:".length);
    const expectedUnit = unitForPrimitivePath(entryPath);
    return !expectedUnit || metric.unit !== expectedUnit;
  });
  if (energyUnitErrors.length) fail(`에너지 지표 단위를 판별할 수 없거나 잘못 지정했습니다: ${energyUnitErrors.map((metric) => metric.id).join(", ")}`);

  const missingKnownWorldSources = index.metrics.filter((metric) => (
    metric.scope === "world"
    && !metric.sourceUrl
    && !metric.id.startsWith("world:entry:energy.fossilTrade.")
  ));
  if (missingKnownWorldSources.length) fail(`URL이 알려진 세계 통계의 출처 연결이 누락되었습니다: ${missingKnownWorldSources.map((metric) => metric.id).join(", ")}`);

  const netMigration = index.metrics.find((metric) => metric.id === "world:entry:migration.netMigration");
  if (!netMigration?.sourceUrl.includes("/indicator/SM.POP.NETM?")) {
    fail("순이동 지표가 World Bank SM.POP.NETM 원천으로 연결되지 않았습니다.");
  }

  const worldClimateMetrics = index.metrics.filter((metric) => metric.scope === "climate-world");
  for (const metric of worldClimateMetrics) {
    const sourceUrls = (metric.sourceLinks || []).map((source) => source.url);
    if (!sourceUrls.some((url) => /data\.jma\.go\.jp/.test(url)) || !sourceUrls.some((url) => /open-meteo\.com/.test(url))) {
      fail(`세계 기후 통계에 JMA와 Open-Meteo 출처가 모두 연결되지 않았습니다: ${metric.id}`);
    }
  }

  for (const pointer of index.supplemental?.sourcePointers || []) {
    if (pointer.assetCount !== null && (!Number.isFinite(pointer.assetCount) || pointer.assetCount < 0)) {
      fail(`원천 포인터의 자산 수가 유효하지 않습니다: ${pointer.id}`);
    }
  }
  const serialized = JSON.stringify(index);
  for (const forbidden of ["/Users/", "Documents/New project", "SidaeAi_S", "downloadSvg"]) {
    if (serialized.includes(forbidden)) fail(`통계 색인에 공개하면 안 되는 문자열이 있습니다: ${forbidden}`);
  }
}

function readBrowserBundle(filePath) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(filePath, "utf8"), context, { filename: filePath, timeout: 30_000 });
  return context.window;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function summary(index, prefix) {
  return `${prefix}: 출제 국가 ${index.countries.length}개(핵심 ${index.coverage.examCoreCountries} · 보조 ${index.coverage.examSupportCountries}) · 원자료 ${index.coverage.worldCountries}개 국가·영토 · ${index.metrics.length}개 지표 · SVG ${index.coverage.graphReferences}개 중 수능형 ${index.coverage.examPatternReferences}개를 ${index.graphPatterns.length}개 패턴으로 분류 · 참고용 ${index.coverage.referenceOnlyReferences}개`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const CATEGORY_LABELS = {
  population: "인구·도시",
  populationStructure: "인구 구조",
  migration: "인구 이동",
  agriculture: "농업·토지",
  energy: "에너지",
  economy: "경제·산업",
  religion2020: "종교",
};

const SEGMENT_LABELS = {
  population: "총인구", urbanPopulation: "도시 인구", ruralPopulation: "촌락 인구",
  urbanShare: "도시 인구 비율", ruralShare: "촌락 인구 비율",
  birthRate: "조출생률", deathRate: "조사망률", naturalIncreaseRate: "자연 증가율",
  totalPopulation: "총인구", age0To14: "0~14세", age15To64: "15~64세", age65Plus: "65세 이상",
  youth: "유소년 부양비", oldAge: "노년 부양비", total: "합계",
  agriculture: "농림어업", industry: "광공업", services: "서비스업",
  christians: "그리스도교", muslims: "이슬람교", hindus: "힌두교", buddhists: "불교", jews: "유대교",
  noReligion: "무종교", other: "기타", wheat: "밀", rice: "쌀", maize: "옥수수",
  cattle: "소", pigs: "돼지", sheep: "양", food: "식량", feed: "사료", bioenergy: "바이오에너지", biofuels: "바이오연료",
  coal: "석탄", gas: "천연가스", naturalGas: "천연가스", oil: "석유", nuclear: "원자력",
  hydropower: "수력", wind: "풍력", solar: "태양광", renewable: "재생에너지", renewables: "재생에너지",
  fossil: "화석 에너지", otherRenewables: "기타 재생에너지", geoBiomassOther: "지열·바이오매스 등",
};

const PRIMARY_ENERGY_KEYS = ["coal", "oil", "gas", "nuclear", "hydropower", "wind", "solar", "biofuels", "otherRenewables"];
const ELECTRICITY_KEYS = ["coal", "oil", "gas", "nuclear", "hydropower", "wind", "solar", "bioenergy", "otherRenewables"];
const EXAM_COUNTRY_TOPIC_KEYS = ["demography", "agriculture", "economy", "energy", "religion", "region"];
const EXAM_METRIC_CATEGORY_KEYS = ["인구·도시", "식량·농업", "산업·교역", "자원·에너지", "기후", "종교·문화"];

const WORLD_BANK_AGE_INDICATORS = {
  age0To14: "SP.POP.0014.TO.ZS",
  age15To64: "SP.POP.1564.TO.ZS",
  age65Plus: "SP.POP.65UP.TO.ZS",
};

const WORLD_BANK_INDUSTRY_INDICATORS = {
  agriculture: "NV.AGR.TOTL.ZS",
  industry: "NV.IND.TOTL.ZS",
  services: "NV.SRV.TOTL.ZS",
};

const WORLD_BANK_INDICATORS_BY_PATH = {
  "agriculture.land.agriculturalLandShare": "AG.LND.AGRI.ZS",
  "economy.exports.shareOfGdp": "NE.EXP.GNFS.ZS",
  "economy.exports.valueCurrentUsd": "NE.EXP.GNFS.CD",
  "economy.gdp.valueCurrentUsd": "NY.GDP.MKTP.CD",
  "economy.industry.shares": Object.values(WORLD_BANK_INDUSTRY_INDICATORS),
  "migration.migrantStockShare": "SM.POP.TOTL.ZS",
  "migration.migrantStockTotal": ["SM.POP.TOTL.ZS", "SP.POP.TOTL"],
  "migration.netMigration": "SM.POP.NETM",
  "populationStructure.density": "EN.POP.DNST",
  "populationStructure.dependencyRatios.oldAge": "SP.POP.DPND.OL",
  "populationStructure.dependencyRatios.total": "SP.POP.DPND",
  "populationStructure.dependencyRatios.youth": "SP.POP.DPND.YG",
  "populationStructure.shares": Object.values(WORLD_BANK_AGE_INDICATORS),
  "populationStructure.totalPopulation": "SP.POP.TOTL",
};

const WORLD_SOURCE_KEYS = {
  population: "population",
  populationRates: "populationRates",
  populationStructure: "worldBankPopulationStructure",
  populationDensity: "worldBankPopulationContext",
  migration: "worldBankMigration",
  refugees: "unhcrRefugees",
  cropProduction: "faostatProduction",
  cropTrade: "faostatTrade",
  cropUse: "faostatFoodBalance",
  agriculturalLand: "worldBankAgriculturalLand",
  livestock: "faostatProduction",
  energyConsumption: "primaryEnergy",
  electricity: "electricityMix",
  fossilProduction: "fossilProduction",
  fossilTrade: "fossilTrade",
  gdp: "worldBankGdp",
  exports: "worldBankExports",
  industry: "worldBankIndustry",
  religion: "religion",
};

main();

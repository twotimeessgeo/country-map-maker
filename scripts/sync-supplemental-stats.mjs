import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = path.join(ROOT_DIR, "data", "supplemental-stats.json");
const JS_PATH = path.join(ROOT_DIR, "data", "supplemental-stats.js");
const SOURCE_ROOT_ENV = "GEOGRAPHY_STATS_SOURCE_ROOT";

const args = process.argv.slice(2);
const shouldWrite = args.includes("--write");
const shouldCheck = args.includes("--check");
const explicitSourceRoot = readOption("--source-root");
const configuredSourceRoot = explicitSourceRoot || process.env[SOURCE_ROOT_ENV] || "";
const sourceRoot = configuredSourceRoot ? path.resolve(configuredSourceRoot) : null;

if (shouldWrite === shouldCheck) {
  fail("--write 또는 --check 중 하나만 지정해야 합니다.");
}

if (shouldWrite) {
  if (!sourceRoot) fail(`--source-root 또는 ${SOURCE_ROOT_ENV}를 지정해야 합니다.`);
  requireDirectory(sourceRoot, "보조 통계 원천 루트");
  const internalRegistry = buildRegistry(sourceRoot, new Date().toISOString());
  validateRegistry(internalRegistry);
  verifySourceFiles(internalRegistry, sourceRoot);
  const publicRegistry = buildPublicRegistry(internalRegistry);
  validateRegistry(publicRegistry, { publicBundle: true });
  writeRegistry(publicRegistry);
  console.log(summary(publicRegistry, `공개용 동기화 완료 (${sourceRoot})`));
} else {
  const registry = readJson(JSON_PATH);
  validateRegistry(registry, { publicBundle: true });
  assertBrowserBundle(registry);

  if (sourceRoot && fs.existsSync(sourceRoot)) {
    const rebuiltInternal = buildRegistry(sourceRoot, registry.meta.generatedAt);
    validateRegistry(rebuiltInternal);
    verifySourceFiles(rebuiltInternal, sourceRoot);
    const rebuiltPublic = buildPublicRegistry(rebuiltInternal);
    validateRegistry(rebuiltPublic, { publicBundle: true });
    assertEqualJson(registry, rebuiltPublic, "원천 자료와 supplemental-stats.json이 다릅니다.");
    console.log(summary(registry, `검증 완료 · 원천 대조 (${sourceRoot})`));
  } else {
    if (sourceRoot) {
      fail(`지정한 원천 루트를 찾지 못했습니다: ${sourceRoot}`);
    }
    console.log(summary(registry, "검증 완료 · 원천 루트 없음, 정규화본/브라우저 번들만 대조"));
  }
}

function buildRegistry(root, generatedAt) {
  const datasets = [
    buildWitsExportGroups(root),
    buildWtoExportGroups(root),
    buildIrenaPowerCapacity(root, 2024),
    buildIrenaFossilCapacity(root, 2024),
    buildIrenaPowerCapacity(root, 2025),
    buildIrenaFossilCapacity(root, 2025),
    buildWppMigrationRates(root),
    buildCiaEthnicity(root),
    buildFaostatCropAreaShares(root),
    buildEiPrimaryRenewablesShare(root),
    buildEiRenewableMix(root),
    buildEiRenewablesGrowth(root),
  ];
  const sourcePointers = buildSourcePointers(root);
  const normalizedRecordCount = datasets.reduce(
    (total, dataset) => total + dataset.recordCount,
    0
  );

  return {
    meta: {
      schemaVersion: 1,
      generatedAt,
      description:
        "country-stats.js와 korea-stats.js에 아직 편입되지 않은 로컬 통계의 정규화 레지스트리",
      normalizedDatasetCount: datasets.length,
      normalizedRecordCount,
      sourcePointerCount: sourcePointers.length,
    },
    datasets,
    sourcePointers,
  };
}

function buildWitsExportGroups(root) {
  const sourcePath = "data_downloads/wits/export_summarytext_2023/processed_export_groups_2023.csv";
  const iso3ByCountry = {
    "튀르키예": "TUR",
    "튀니지": "TUN",
    "카자흐스탄": "KAZ",
    "아랍 에미리트": "ARE",
  };
  const rows = readCsv(root, sourcePath);
  const grouped = groupBy(rows, (row) => row.country);
  const records = Object.entries(grouped).map(([countryKo, countryRows]) => ({
    iso3: requiredMapValue(iso3ByCountry, countryKo, "WITS 국가 ISO3"),
    countryKo,
    mark: countryRows[0].mark,
    year: 2023,
    unit: "%",
    groups: countryRows.map((row) => ({
      label: row.group,
      sharePercent: number(row.share_percent),
    })),
  }));

  return dataset({
    id: "wits-export-product-groups-2023",
    title: "튀르키예·튀니지·카자흐스탄·아랍에미리트 수출품 구성",
    scope: "country",
    topic: "trade",
    sourceName: "World Bank WITS summarytext",
    sourcePaths: [
      sourcePath,
      ...["TUR", "TUN", "KAZ", "ARE"].flatMap((iso3) => [
        `data_downloads/wits/export_summarytext_2023/${iso3}_2023_summarytext.html`,
        `data_downloads/wits/export_summarytext_2023/${iso3}_2023_summarytext.txt`,
      ]),
    ],
    referenceYears: [2023],
    units: ["% of total merchandise exports"],
    suggestedTargetKeys: ["economy.exports.productGroups"],
    records,
  });
}

function buildWtoExportGroups(root) {
  const sourcePath = "data_downloads/wto/trade_profiles_2023/africa_export_commodity_groups_2021.csv";
  const iso3ByCode = { CD: "COD", ET: "ETH", ZA: "ZAF", BW: "BWA" };
  const rows = readCsv(root, sourcePath);
  const records = rows.map((row) => ({
    iso3: requiredMapValue(iso3ByCode, row.code, "WTO 국가 ISO3"),
    countryKo: row.country,
    displayLabel: row.label,
    year: 2021,
    unit: "%",
    sharesPercent: {
      agriculture: number(row.agriculture),
      fuelsAndMining: number(row.fuels_mining),
      manufactures: number(row.manufactures),
      other: number(row.other),
    },
    sourcePdf: `data_downloads/wto/trade_profiles_2023/${row.source_pdf}`,
  }));

  return dataset({
    id: "wto-africa-export-commodity-groups-2021",
    title: "아프리카 4개국 상품군별 수출 비율",
    scope: "country",
    topic: "trade",
    sourceName: "WTO Trade Profiles 2023",
    sourcePaths: [
      sourcePath,
      ...rows.map((row) => `data_downloads/wto/trade_profiles_2023/${row.source_pdf}`),
    ],
    referenceYears: [2021],
    units: ["% of total merchandise exports"],
    suggestedTargetKeys: ["economy.exports.commodityGroups"],
    records,
  });
}

function buildIrenaPowerCapacity(root, year) {
  const sourcePath = `data_downloads/irena/country_power_capacity_mix_usa_mex_bra_can_${year}.csv`;
  const iso3BySourceCountry = { USA: "USA", Mexico: "MEX", Brazil: "BRA", Canada: "CAN" };
  const records = readCsv(root, sourcePath).map((row) => ({
    iso3: requiredMapValue(iso3BySourceCountry, row.source_country, "IRENA 국가 ISO3"),
    countryKo: row.country,
    year: integer(row.year),
    unit: "MW",
    capacityMw: {
      coal: number(row.coal_mw),
      oil: number(row.oil_mw),
      naturalGas: number(row.gas_mw),
      renewable: number(row.renewable_mw),
      nuclear: number(row.nuclear_mw),
      selectedTotal: number(row.selected_total_mw),
    },
    sharesPercent: {
      coal: number(row.coal_share_pct),
      oil: number(row.oil_share_pct),
      naturalGas: number(row.gas_share_pct),
      renewable: number(row.renewable_share_pct),
      nuclear: number(row.nuclear_share_pct),
    },
  }));

  return dataset({
    id: `irena-electricity-capacity-mix-${year}`,
    title: "미국·멕시코·브라질·캐나다 발전 설비 용량 구성",
    scope: "country",
    topic: "energy",
    sourceName: "IRENASTAT Country Electricity Capacity",
    sourceUrl:
      "https://pxweb.irena.org/api/v1/en/IRENASTAT/Power%20Capacity%20and%20Generation/Country_ELECCAP_2026_H1_v-PX%201.px",
    sourcePaths: [
      sourcePath,
      `data_downloads/irena/country_power_capacity_usa_mex_bra_can_${year}_raw.csv`,
      "data_downloads/irena/Country_ELECCAP_2026_H1_metadata.json",
      ...(year === 2025
        ? ["data_downloads/irena/raw/IRENA_Renewable_Capacity_Statistics_2026.pdf"]
        : []),
    ],
    referenceYears: [year],
    units: ["MW", "% of selected capacity"],
    suggestedTargetKeys: ["energy.electricityCapacity"],
    records,
  });
}

function buildIrenaFossilCapacity(root, year) {
  const sourcePath = `data_downloads/irena/country_fossil_capacity_mix_usa_mex_bra_can_${year}.csv`;
  const iso3BySourceCountry = { USA: "USA", Mexico: "MEX", Brazil: "BRA", Canada: "CAN" };
  const records = readCsv(root, sourcePath).map((row) => ({
    iso3: requiredMapValue(iso3BySourceCountry, row.source_country, "IRENA 국가 ISO3"),
    countryKo: row.country,
    year: integer(row.year),
    unit: "MW",
    capacityMw: {
      coal: number(row.coal_mw),
      oil: number(row.oil_mw),
      naturalGas: number(row.gas_mw),
      selectedFossilTotal: number(row.selected_fossil_total_mw),
    },
    sharesPercent: {
      coal: number(row.coal_share_pct),
      oil: number(row.oil_share_pct),
      naturalGas: number(row.gas_share_pct),
    },
  }));

  return dataset({
    id: `irena-fossil-capacity-mix-${year}`,
    title: "미국·멕시코·브라질·캐나다 화석연료 발전 설비 구성",
    scope: "country",
    topic: "energy",
    sourceName: "IRENASTAT Country Electricity Capacity",
    sourceUrl:
      "https://pxweb.irena.org/api/v1/en/IRENASTAT/Power%20Capacity%20and%20Generation/Country_ELECCAP_2026_H1_v-PX%201.px",
    sourcePaths: [
      sourcePath,
      `data_downloads/irena/country_fossil_capacity_usa_mex_bra_can_${year}_raw.csv`,
      "data_downloads/irena/Country_ELECCAP_2026_H1_metadata.json",
      ...(year === 2025
        ? ["data_downloads/irena/raw/IRENA_Renewable_Capacity_Statistics_2026.pdf"]
        : []),
    ],
    referenceYears: [year],
    units: ["MW", "% of selected fossil capacity"],
    suggestedTargetKeys: ["energy.electricityCapacity.fossilMix"],
    records,
  });
}

function buildWppMigrationRates(root) {
  const sourcePath =
    "data_downloads/un_desa/wpp2024/processed/jpn_tha_chn_natural_change_net_migration_rate_1950_2020_decennial.csv";
  const records = readCsv(root, sourcePath).map((row) => ({
    iso3: row.iso3,
    countryKo: row.country_ko,
    year: integer(row.year),
    naturalChangeRatePer1000: number(row.natural_change_rate_per_1000),
    netMigrationRatePer1000: number(row.net_migration_rate_per_1000),
  }));

  return dataset({
    id: "un-wpp2024-natural-change-net-migration-rates",
    title: "일본·타이·중국 자연증가율·순이동률 시계열",
    scope: "country-time-series",
    topic: "population",
    sourceName: "UN DESA World Population Prospects 2024, medium variant",
    sourceUrl:
      "https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_Demographic_Indicators_Medium.csv.gz",
    sourcePaths: [
      sourcePath,
      "data_downloads/un_desa/wpp2024/raw/WPP2024_Demographic_Indicators_Medium.csv.gz",
      "data_downloads/un_desa/wpp2024/SOURCE.md",
    ],
    referenceYears: [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020],
    units: ["rate per 1,000 population (‰)"],
    suggestedTargetKeys: ["population.rates.naturalChange", "migration.netMigrationRate"],
    records,
  });
}

function buildCiaEthnicity(root) {
  const sourcePath = "data_downloads/cia_world_factbook/ethnic_composition_jm_co_br_uy.json";
  const payload = readJson(path.join(root, sourcePath));
  const iso3ByCountry = { 자메이카: "JAM", 콜롬비아: "COL", 브라질: "BRA", 우루과이: "URY" };
  const records = payload.countries.map((row) => ({
    iso3: requiredMapValue(iso3ByCountry, row.country, "CIA 국가 ISO3"),
    countryKo: row.country,
    mark: row.symbol,
    year: integer(row.data_year),
    unit: "%",
    sharesPercent: row.shares_raw,
    sourceNote: row.source_note,
    sourceUrl: row.source_url,
  }));

  return dataset({
    id: "cia-ethnic-composition-jm-col-bra-ury",
    title: "자메이카·콜롬비아·브라질·우루과이 민족 구성",
    scope: "country",
    topic: "population",
    sourceName: "CIA World Factbook archives and archived Colombia Factbook page",
    sourcePaths: [sourcePath, "data_downloads/cia_world_factbook/raw/CO_factbook_2003.html"],
    referenceYears: [...new Set(records.map((record) => record.year))].sort(),
    units: ["% of population"],
    categories: payload.categories,
    processing: payload.processing,
    suggestedTargetKeys: ["demography.ethnicComposition"],
    records,
  });
}

function buildFaostatCropAreaShares(root) {
  const sourcePath = "data_downloads/faostat/kaz_irn_tur_egy_crop_area_share_2022.csv";
  const iso3ByCountry = { 카자흐스탄: "KAZ", 이란: "IRN", 튀르키예: "TUR", 이집트: "EGY" };
  const rows = readCsv(root, sourcePath);
  const grouped = groupBy(rows, (row) => row.country_ko);
  const records = Object.entries(grouped)
    .sort(([, left], [, right]) => integer(left[0].country_order) - integer(right[0].country_order))
    .map(([countryKo, countryRows]) => ({
      iso3: requiredMapValue(iso3ByCountry, countryKo, "FAOSTAT 국가 ISO3"),
      countryKo,
      year: 2022,
      unit: "% of cropland area",
      cropSharesPercent: countryRows.map((row) => ({
        cropKey: row.crop_key,
        cropKo: row.crop_ko,
        value: number(row.share_pct),
      })),
    }));

  return dataset({
    id: "faostat-crop-area-shares-2022",
    title: "카자흐스탄·이란·튀르키예·이집트 주요 작물 수확 면적 비율",
    scope: "country",
    topic: "agriculture",
    sourceName: "FAOSTAT Production Crops and Livestock + Inputs Land Use",
    sourcePaths: [
      sourcePath,
      "data_downloads/faostat/raw/Production_Crops_Livestock_E_All_Data_Normalized_20251231.zip",
      "data_downloads/faostat/raw/Inputs_LandUse_E_All_Data_Normalized_20251114.zip",
      "data_downloads/faostat/SOURCE_kaz_irn_tur_egy_crop_area_2022.md",
    ],
    referenceYears: [2022],
    units: ["% of cropland area"],
    suggestedTargetKeys: ["agriculture.crops.areaHarvestedShare"],
    records,
  });
}

function buildEiPrimaryRenewablesShare(root) {
  const sourcePath = "data_downloads/energy_institute/regional_primary_energy_renewables_share_2023.csv";
  const records = readCsv(root, sourcePath).map((row) => ({
    regionKo: row.region,
    sourceRegion: row.source_region,
    year: integer(row.year),
    renewablesEj: number(row.renewables_ej),
    primaryEnergyTotalEj: number(row.primary_energy_total_ej),
    renewablesSharePercent: number(row.renewables_share_pct),
  }));
  return dataset({
    id: "ei-regional-primary-energy-renewables-share-2023",
    title: "지역별 1차 에너지 소비 중 재생에너지 비율",
    scope: "world-region",
    topic: "energy",
    sourceName: "Energy Institute Statistical Review of World Energy 2024",
    sourcePaths: [
      sourcePath,
      "data_downloads/energy_institute/EI_Stats_Review_All_Data_2024.xlsx",
      "data_downloads/energy_institute/README.md",
    ],
    referenceYears: [2023],
    units: ["EJ", "% of primary energy"],
    suggestedTargetKeys: ["referenceSummaries.regionalEnergy.primaryRenewablesShare"],
    records,
  });
}

function buildEiRenewableMix(root) {
  const sourcePath = "data_downloads/energy_institute/regional_renewable_primary_energy_mix_2023.csv";
  const records = readCsv(root, sourcePath).map((row) => ({
    regionKo: row.region,
    sourceRegion: row.source_region,
    year: integer(row.year),
    amountsEj: {
      renewableTotal: number(row.renewable_total_ej),
      hydro: number(row.hydro_ej),
      wind: number(row.wind_ej),
      solar: number(row.solar_ej),
      other: number(row.other_ej),
      geoBiomassOther: number(row.geo_biomass_other_ej),
      biofuels: number(row.biofuels_ej),
      reconciliationAdjustment: number(row.reconciliation_adjustment_ej),
    },
    sharesPercent: {
      hydro: number(row.hydro_share_pct),
      wind: number(row.wind_share_pct),
      solar: number(row.solar_share_pct),
      other: number(row.other_share_pct),
    },
  }));
  return dataset({
    id: "ei-regional-renewable-primary-energy-mix-2023",
    title: "지역별 재생에너지 소비 구성",
    scope: "world-region",
    topic: "energy",
    sourceName: "Energy Institute Statistical Review of World Energy 2024",
    sourcePaths: [
      sourcePath,
      "data_downloads/energy_institute/EI_Stats_Review_All_Data_2024.xlsx",
      "data_downloads/energy_institute/README.md",
    ],
    referenceYears: [2023],
    units: ["EJ", "% of renewable energy"],
    suggestedTargetKeys: ["referenceSummaries.regionalEnergy.renewableMix"],
    records,
  });
}

function buildEiRenewablesGrowth(root) {
  const sourcePath = "data_downloads/energy_institute/renewables_region_scatter_2014_2024.csv";
  const records = readCsv(root, sourcePath).map((row) => ({
    regionKo: row.region,
    referencePeriod: "2014-2024",
    consumptionSharePercent2024: number(row.consumption_share_pct),
    cagrPercent2014To2024: number(row.cagr_2014_2024_pct),
    mixPercent2024: {
      hydro: number(row.hydro_share_pct),
      wind: number(row.wind_share_pct),
      solar: number(row.solar_share_pct),
    },
    totalEj: {
      2014: number(row.total_2014_ej),
      2024: number(row.total_2024_ej),
    },
  }));
  return dataset({
    id: "ei-regional-renewables-consumption-growth-2014-2024",
    title: "지역별 수력·풍력·태양광 소비 비율과 증가율",
    scope: "world-region",
    topic: "energy",
    sourceName: "Energy Institute Statistical Review of World Energy 2025",
    sourcePaths: [
      sourcePath,
      "data_downloads/energy_institute/EI_Statistical_Review_2025_ALL_data.xlsx",
      "data_downloads/energy_institute/README.md",
    ],
    referenceYears: [2014, 2024],
    units: ["EJ", "%", "% CAGR"],
    suggestedTargetKeys: ["referenceSummaries.regionalEnergy.renewablesGrowth"],
    records,
  });
}

function buildSourcePointers(root) {
  const manifestPath = "data_downloads/kosis/manifest.json";
  const kosisManifest = readJson(path.join(root, manifestPath));
  const eRegionManifestPath = "data_downloads/kosis/e_region/20260716/manifest.json";
  const eRegionManifest = readJson(path.join(root, eRegionManifestPath));
  if (
    eRegionManifest.source !== "KOSIS e-지방지표" ||
    !Array.isArray(eRegionManifest.requests) ||
    eRegionManifest.requestCount !== eRegionManifest.requests.length
  ) {
    fail("KOSIS e-지방지표 manifest 구조가 예상과 다릅니다.");
  }
  for (const request of eRegionManifest.requests) {
    if (!request.rawPath || path.isAbsolute(request.rawPath) || request.rawPath.split("/").includes("..")) {
      fail(`KOSIS e-지방지표 rawPath가 잘못되었습니다: ${request.rawPath}`);
    }
    requireFile(path.join(root, "data_downloads/kosis/e_region/20260716", request.rawPath));
  }
  const eRegionCacheBytes = eRegionManifest.requests.reduce(
    (total, request) => total + number(request.bytes),
    0
  );
  const kmaManifestPath = "data_downloads/kma/manifest.json";
  const kmaManifest = readJson(path.join(root, kmaManifestPath));
  if (kmaManifest.source !== "Korea Meteorological Administration (KMA)" || !Array.isArray(kmaManifest.files)) {
    fail("기상청 평년값 manifest 구조가 예상과 다릅니다.");
  }
  const kmaAssetPaths = kmaManifest.files.map((file) => {
    if (!file.filename || path.basename(file.filename) !== file.filename) {
      fail(`기상청 manifest filename이 잘못되었습니다: ${file.filename}`);
    }
    return `data_downloads/kma/${file.filename}`;
  });
  const kosisUnits = {
    DT_1B04005N: ["명"],
    DT_1B040M5: ["명"],
    DT_1FS1001: ["개", "명", "백만원"],
    DT_1FS1001_S: ["개", "명", "백만원"],
    DT_1FS1101: ["개", "명", "백만원"],
    DT_1JU1520: ["호"],
    DT_1PA2021: ["명"],
  };
  const kosisAssets = kosisManifest.datasets.map((row) => ({
    tableId: row.tableId,
    year: row.year,
    title: row.title,
    units: requiredMapValue(kosisUnits, row.tableId, "KOSIS 단위"),
    csvPath: `data_downloads/kosis/${row.csvPath}`,
    metaPath: `data_downloads/kosis/${row.metaPath}`,
  }));
  const moisSidoPath = "data_downloads/mois/foreign_resident_types_by_sido_2024.csv";
  const moisSigunguPath = "data_downloads/mois/foreign_resident_types_by_sigungu_2024.csv";
  const moisSidoRows = readCsv(root, moisSidoPath);
  const moisSigunguRows = readCsv(root, moisSigunguPath);
  if (moisSidoRows.length !== 17 || moisSigunguRows.length !== 264) {
    fail(
      `MOIS 정규화 행 수가 예상과 다릅니다: 시도 ${moisSidoRows.length}, 시군구 ${moisSigunguRows.length}`
    );
  }

  return [
    pointer({
      id: "kosis-e-region-cache-20260716",
      title: "KOSIS e-지방지표 로컬 요청 캐시",
      scope: "korea-province-city-district",
      topic: "multiple",
      sourceName: eRegionManifest.source,
      sourceUrl: eRegionManifest.sourceUrl,
      sourcePaths: [eRegionManifestPath],
      units: ["지표별 원천 응답의 unit 필드 참조"],
      contents: [
        "e-지방지표 통합 서비스 HTML",
        "시도·시군구 지표 상세 JSON",
        "manifest에 요청 파라미터·raw 경로·바이트 크기를 보존함",
      ],
      suggestedTargetKeys: ["korea-stats historical and regional metric extensions"],
      assetCount: eRegionManifest.requestCount,
      cacheBytes: eRegionCacheBytes,
      generatedAt: eRegionManifest.generatedAt,
    }),
    pointer({
      id: "kma-climate-normals-1991-2020",
      title: "기상청 기후평년값 1991~2020 로컬 캐시",
      scope: "korea-weather-station",
      topic: "climate",
      sourceName: kmaManifest.source,
      sourceUrl: kmaManifest.pageUrl,
      sourcePaths: [kmaManifestPath, ...kmaAssetPaths],
      referencePeriod: "1991-2020",
      units: ["℃", "mm", "%", "days", "hours"],
      contents: ["월별 평년값", "현상일수", "관측지점 트리·메타데이터", "공식 평년값 간행물"],
      suggestedTargetKeys: ["climate station normals", "korea climate graph sources"],
      assetCount: kmaAssetPaths.length,
      generatedAt: kmaManifest.updatedAt,
    }),
    pointer({
      id: "us-census-aies-state-manufacturing-2023",
      title: "미국 주별 제조업 출하액",
      scope: "us-state-industry",
      topic: "manufacturing",
      sourceName: "U.S. Census Bureau Annual Integrated Economic Survey",
      sourceUrl: "https://data.census.gov/table/AIESBASICTIMESERIES.AIES31BASIC02",
      sourcePaths: [
        "data_downloads/aies2023/AIES31BASIC02.dat",
        "data_downloads/aies2023/AIES31BASIC02_FIELDS.txt",
        "data_downloads/aies2023/AIES31BASIC02_README.txt",
        "scripts/generate_us_state_mfg_svgs.py",
        "outputs/us_state_mfg_shipments_2023_5states_300px_svg.zip",
        "outputs/us_state_mfg_shipments_2023_5states_revised_300px_svg.zip",
      ],
      referenceYears: [2023],
      units: ["$1,000", "% of state manufacturing shipments"],
      contents: ["NAICS 31-33 제조업 출하액", "주별 상위 3개 세부 업종 구성비"],
      suggestedTargetKeys: ["economy.manufacturingShipmentsByState"],
    }),
    pointer({
      id: "opentopodata-srtm30m-gurye-profile",
      title: "구례 화엄사 방면 SRTM30m 고도 단면",
      scope: "korea-local-terrain-profile",
      topic: "physical-geography",
      sourceName: "OpenTopodata API, NASA SRTM30m",
      sourceUrl: "https://api.opentopodata.org/v1/srtm30m",
      sourcePaths: [
        "data_downloads/opentopodata_srtm/gurye_hwaeomsa_fan_profile_srtm30m.csv",
        "data_downloads/opentopodata_srtm/SOURCE.md",
        "scripts/build-gurye-hwaeomsa-fan-profile.mjs",
      ],
      units: ["m", "km", "decimal degrees"],
      contents: ["73개 표본점의 거리·위경도·고도"],
      suggestedTargetKeys: ["terrainProfiles.guryeHwaeomsa"],
    }),
    pointer({
      id: "world-bank-population-structure-local-cache",
      title: "세계 국가별 유소년·생산연령·노년 인구 비율",
      scope: "country",
      topic: "population",
      sourceName: "World Bank World Development Indicators",
      sourcePaths: [
        "data_downloads/country_stats/world_bank/SP.POP.0014.TO.ZS.json",
        "data_downloads/country_stats/world_bank/SP.POP.0014.TO.ZS.json.meta.json",
        "data_downloads/country_stats/world_bank/SP.POP.1564.TO.ZS.json",
        "data_downloads/country_stats/world_bank/SP.POP.1564.TO.ZS.json.meta.json",
        "data_downloads/country_stats/world_bank/SP.POP.65UP.TO.ZS.json",
        "data_downloads/country_stats/world_bank/SP.POP.65UP.TO.ZS.json.meta.json",
        "data_downloads/country_stats/world_bank/SP.POP.TOTL.json",
        "data_downloads/country_stats/world_bank/SP.POP.TOTL.json.meta.json",
        "scripts/build-region-age-structure-scatter.mjs",
        "data_downloads/CATALOG_scraped_stats_20260703.md",
      ],
      referenceYears: [2023],
      units: ["% of total population", "people"],
      contents: ["0~14세", "15~64세", "65세 이상", "총인구", "인구 가중 지역권 평균"],
      suggestedTargetKeys: ["populationStructure", "referenceSummaries.regionalAgeStructure"],
    }),
    pointer({
      id: "energy-transition-forum-renewable-generation-2020-local-script",
      title: "해남·평창·춘천 재생에너지 발전량",
      scope: "korea-city-district",
      topic: "energy",
      sourceName: "에너지전환포럼; 로컬 생성 스크립트에 가공값 보존",
      sourcePaths: [
        "scripts/build-korea-renewable-dominant-regions-chart.mjs",
        "data_downloads/CATALOG_scraped_stats_20260703.md",
      ],
      referenceYears: [2020],
      units: ["MWh", "100,000 MWh"],
      contents: ["태양광·풍력·수력 발전량", "수력은 양수식 제외"],
      suggestedTargetKeys: ["energy.renewableGenerationByCity"],
    }),
    pointer({
      id: "local-inline-chart-values-upstream-unrecorded",
      title: "상위 원천이 기록되지 않은 로컬 SVG 생성값",
      scope: "multiple-country",
      topic: "multiple",
      sourceName: "로컬 SVG 생성 스크립트 (상위 원천 기관·기준 연도 미기록)",
      sourcePaths: [
        "scripts/build-export-top5-products-chart.mjs",
        "scripts/build-renewable-top3-supply-chart.mjs",
        "scripts/build-energy-source-donut-chart.mjs",
        "scripts/build-brics-energy-supply-chart.mjs",
        "scripts/build-saudi-iran-turkiye-energy-supply-chart.mjs",
        "scripts/build-cobalt-coffee-cacao-production-share-chart.mjs",
        "data_downloads/CATALOG_scraped_stats_20260703.md",
      ],
      units: ["%"],
      contents: [
        "싱가포르·인도네시아·스리랑카·중국 수출 상위 5개 품목",
        "지열·풍력·수력·태양광 공급량 상위 3개국",
        "네팔·인도·프랑스 전력 공급원",
        "BRICS 5개국 에너지 공급 구성",
        "사우디아라비아·이란·튀르키예 에너지 공급 구성",
        "코발트·커피·카카오 생산량 상위 3개국 비율",
        "외부 원천은 확정되지 않아 재사용 전 출처 확인 필요",
      ],
      suggestedTargetKeys: ["provenanceReview.required"],
    }),
    pointer({
      id: "rte-eco2mix-france-hourly-20260601-06",
      title: "프랑스 시간대별 발전원·전력 수요",
      scope: "country-hourly-time-series",
      topic: "energy",
      sourceName: "RTE éCO2mix; 로컬 검수 보고서에 출처 연결 보존",
      sourceUrl: "https://www.rte-france.com/en/data-publications/eco2mix/power-generation-energy-source",
      sourcePaths: [
        "data_downloads/CATALOG_scraped_stats_20260703.md",
      ],
      referencePeriod: "2026-06-01/2026-06-06",
      units: ["GW"],
      contents: ["원자력·화력·수력·풍력·태양광·기타 발전량", "전력 수요량", "매시 정각값"],
      suggestedTargetKeys: ["energy.electricityGenerationHourly", "energy.electricityDemandHourly"],
    }),
    pointer({
      id: "un-wpp-world-bank-population-indicators-2023",
      title: "중국·사우디아라비아·니제르·일본 인구 지표",
      scope: "country",
      topic: "population",
      sourceName: "UN DESA World Population Prospects 2024 and World Bank WDI",
      sourcePaths: [
        "data_downloads/un_desa/wpp2024/raw/WPP2024_Demographic_Indicators_Medium.csv.gz",
        "data_downloads/un_desa/wpp2024/SOURCE.md",
        "data_downloads/country_stats/world_bank/SP.POP.0014.TO.ZS.json",
        "data_downloads/country_stats/world_bank/SP.POP.0014.TO.ZS.json.meta.json",
        "data_downloads/country_stats/world_bank/SP.POP.1564.TO.ZS.json",
        "data_downloads/country_stats/world_bank/SP.POP.1564.TO.ZS.json.meta.json",
        "data_downloads/country_stats/world_bank/SP.POP.65UP.TO.ZS.json",
        "data_downloads/country_stats/world_bank/SP.POP.65UP.TO.ZS.json.meta.json",
        "data_downloads/country_stats/world_bank/SP.POP.TOTL.json",
        "data_downloads/country_stats/world_bank/SP.POP.TOTL.json.meta.json",
        "data_downloads/CATALOG_scraped_stats_20260703.md",
      ],
      referenceYears: [2023],
      units: ["males per 100 females", "rate per 1,000 population (‰)", "%", "people"],
      contents: ["성비", "자연증가율", "사망률", "0~14세·15~64세·65세 이상 비율"],
      suggestedTargetKeys: ["population.demographicIndicators"],
    }),
    pointer({
      id: "keei-regional-energy-yearbook-2025",
      title: "2025 지역에너지통계연보(2024 자료)",
      scope: "korea-province",
      topic: "energy",
      sourceName: "에너지경제연구원",
      sourcePaths: [
        "data_downloads/keei/2025_지역에너지통계연보_2024자료.xlsx",
        "data_downloads/keei/2025_지역에너지통계연보_2024자료.pdf",
      ],
      referenceYears: [2024],
      units: ["1,000 toe", "GWh", "MWh", "kW"],
      contents: [
        "1차에너지 공급",
        "최종에너지 원별 소비",
        "지역별 발전량",
        "신재생에너지 발전량·보급용량",
      ],
      suggestedTargetKeys: [
        "primary-energy-supply",
        "final-energy-consumption-by-source",
        "power-generation",
        "renewable-generation",
        "renewable-capacity",
      ],
    }),
    pointer({
      id: "mois-local-foreign-residents-2024",
      title: "2024 지방자치단체 외국인주민 현황",
      scope: "korea-province-city-district",
      topic: "population",
      sourceName: "행정안전부",
      sourcePaths: [
        "data_downloads/mois/2024_local_government_foreign_residents_2024-11-01.xlsx",
        moisSidoPath,
        moisSigunguPath,
      ],
      referenceDate: "2024-11-01",
      units: ["명", "% of resident population"],
      contents: ["외국인근로자", "결혼이민자", "유학생", "외국국적동포", "국적취득자", "외국인주민 자녀"],
      suggestedTargetKeys: ["foreign-residents-by-type", "foreign-residents-by-nationality"],
      normalizedAssets: [
        { path: moisSidoPath, scope: "korea-province", recordCount: moisSidoRows.length },
        { path: moisSigunguPath, scope: "korea-city-district", recordCount: moisSigunguRows.length },
      ],
      validation: {
        status: "passed",
        checks: [
          "foreignResidentsTotal = nonCitizenResidents + naturalizedCitizens + foreignResidentChildren",
          "foreignResidentSharePct = foreignResidentsTotal / totalPopulation * 100",
        ],
      },
    }),
    pointer({
      id: "capss-emissions-by-admin-2022",
      title: "행정구역·배출원별 대기오염물질 배출량",
      scope: "korea-province-city-district",
      topic: "environment",
      sourceName: "국가미세먼지정보센터·국립환경과학원 CAPSS",
      sourcePaths: [
        "data_downloads/airkorea_capss/capss_2022_emissions_by_admin.xlsx",
        "data_downloads/airkorea_capss/SOURCE.md",
      ],
      referenceYears: [2022],
      units: ["kg/yr"],
      contents: ["CO", "NOx", "SOx", "TSP", "PM-10", "PM-2.5", "VOC", "NH3", "BC"],
      suggestedTargetKeys: ["air-pollutant-emissions"],
    }),
    pointer({
      id: "khoa-coastline-by-local-2014-2024",
      title: "지자체별 자연·인공 해안선 길이",
      scope: "korea-province-city-district",
      topic: "physical-geography",
      sourceName: "국립해양조사원",
      sourcePaths: [
        "data_downloads/khoa_coastline/khoa_coastline_2014.csv",
        "data_downloads/khoa_coastline/khoa_coastline_by_local_20241231.csv",
        "data_downloads/khoa_coastline/SOURCE.md",
      ],
      referenceYears: [2014, 2024],
      units: ["km"],
      contents: ["자연해안선", "인공해안선", "합계"],
      suggestedTargetKeys: ["coastline-natural-length", "coastline-artificial-length"],
    }),
    pointer({
      id: "kosis-local-cache",
      title: "KOSIS 대용량 CSV 로컬 캐시",
      scope: "korea-multiple-levels",
      topic: "multiple",
      sourceName: "KOSIS 국가데이터처",
      sourcePaths: [
        manifestPath,
        ...kosisAssets.flatMap((asset) => [asset.csvPath, asset.metaPath]),
      ],
      referenceYears: [...new Set(kosisAssets.map((asset) => asset.year))].sort(),
      units: [...new Set(kosisAssets.flatMap((asset) => asset.units))],
      datasetCount: kosisAssets.length,
      assets: kosisAssets,
      suggestedTargetKeys: ["korea-stats metric extensions"],
    }),
    pointer({
      id: "un-wup2025-cities-population-surface",
      title: "세계 도시 인구·면적·밀도 데이터",
      scope: "world-city",
      topic: "urbanization",
      sourceName: "UN DESA World Urbanization Prospects 2025",
      sourcePaths: [
        "data_downloads/wup2025/WUP2025-DB-DEGURBA-Cities-Population-Surface-Data.csv.gz",
        "data_downloads/wup2025/WUP2025_Cities_Indicators.csv",
      ],
      referencePeriod: "1975-2050",
      units: ["thousands", "per cent", "square kilometre", "persons per square kilometre"],
      contents: ["population", "land area", "built-up area", "population density", "annual rate of change"],
      suggestedTargetKeys: ["referenceSummaries.worldCities"],
    }),
    pointer({
      id: "un-desa-international-migrant-stock-2020",
      title: "출발지·도착지별 국제이주민 수",
      scope: "country-pair",
      topic: "migration",
      sourceName: "UN DESA International Migrant Stock 2020",
      sourceUrl:
        "https://www.un.org/development/desa/pd/sites/www.un.org.development.desa.pd/files/undesa_pd_2020_ims_stock_by_sex_destination_and_origin.xlsx",
      sourcePaths: [
        "data_downloads/un_desa/undesa_pd_2020_ims_stock_by_sex_destination_and_origin.xlsx",
        "data_downloads/un_desa/README.md",
      ],
      referenceYears: [2020],
      units: ["people"],
      contents: ["bilateral migrant stock by sex, destination and origin"],
      suggestedTargetKeys: ["migration.migrantStockByOrigin"],
    }),
    pointer({
      id: "un-wpp2024-demographic-indicators-raw",
      title: "세계 인구 전망 인구지표 원천",
      scope: "country-time-series",
      topic: "population",
      sourceName: "UN DESA World Population Prospects 2024, medium variant",
      sourceUrl:
        "https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_Demographic_Indicators_Medium.csv.gz",
      sourcePaths: [
        "data_downloads/un_desa/wpp2024/raw/WPP2024_Demographic_Indicators_Medium.csv.gz",
        "data_downloads/un_desa/wpp2024/SOURCE.md",
      ],
      referencePeriod: "1950-2101",
      units: ["people", "rate per 1,000 population (‰)"],
      contents: ["demographic indicators, medium variant"],
      suggestedTargetKeys: ["population latest/versioned rows", "migration historical rates"],
    }),
  ];
}

function dataset(config) {
  return {
    id: config.id,
    status: "normalized",
    title: config.title,
    scope: config.scope,
    topic: config.topic,
    source: {
      name: config.sourceName,
      ...(config.sourceUrl ? { url: config.sourceUrl } : {}),
      paths: [...new Set(config.sourcePaths)],
    },
    referenceYears: config.referenceYears,
    units: config.units,
    ...(config.categories ? { categories: config.categories } : {}),
    ...(config.processing ? { processing: config.processing } : {}),
    suggestedTargetKeys: config.suggestedTargetKeys,
    recordCount: config.records.length,
    records: config.records,
  };
}

function pointer(config) {
  return {
    id: config.id,
    status: "source-pointer",
    title: config.title,
    scope: config.scope,
    topic: config.topic,
    source: {
      name: config.sourceName,
      ...(config.sourceUrl ? { url: config.sourceUrl } : {}),
      paths: config.sourcePaths,
    },
    ...(config.referenceYears ? { referenceYears: config.referenceYears } : {}),
    ...(config.referenceDate ? { referenceDate: config.referenceDate } : {}),
    ...(config.referencePeriod ? { referencePeriod: config.referencePeriod } : {}),
    units: config.units,
    contents: config.contents ?? [],
    suggestedTargetKeys: config.suggestedTargetKeys,
    ...(config.datasetCount ? { datasetCount: config.datasetCount } : {}),
    ...(config.assetCount ? { assetCount: config.assetCount } : {}),
    ...(config.cacheBytes ? { cacheBytes: config.cacheBytes } : {}),
    ...(config.generatedAt ? { generatedAt: config.generatedAt } : {}),
    ...(config.assets ? { assets: config.assets } : {}),
    ...(config.normalizedAssets ? { normalizedAssets: config.normalizedAssets } : {}),
    ...(config.validation ? { validation: config.validation } : {}),
  };
}

function buildPublicRegistry(internalRegistry) {
  const publicRegistry = stripInternalMetadata(internalRegistry);
  publicRegistry.meta.description =
    "country-stats.js와 korea-stats.js에 아직 편입되지 않은 보조 통계의 공개용 정규화 레지스트리";
  return publicRegistry;
}

function stripInternalMetadata(value) {
  if (Array.isArray(value)) return value.map(stripInternalMetadata);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !isInternalMetadataKey(key))
      .map(([key, child]) => [key, stripInternalMetadata(child)])
  );
}

function isInternalMetadataKey(key) {
  return (
    key === "sourceRootConfig" ||
    key === "sourcePdf" ||
    ["path", "paths", "filename", "file"].includes(key) ||
    /(?:Path|Paths|Filename|FileName|File)$/.test(key) ||
    /(?:_|-)(?:path|paths|filename|file)$/i.test(key)
  );
}

function validateRegistry(registry, { publicBundle = false } = {}) {
  if (registry?.meta?.schemaVersion !== 1) fail("지원하지 않는 보조 통계 스키마입니다.");
  if (!Array.isArray(registry.datasets) || !Array.isArray(registry.sourcePointers)) {
    fail("datasets/sourcePointers 배열이 필요합니다.");
  }

  const ids = [...registry.datasets, ...registry.sourcePointers].map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) fail("보조 통계 데이터셋 id가 중복됩니다.");

  for (const datasetEntry of registry.datasets) {
    if (datasetEntry.status !== "normalized") fail(`${datasetEntry.id}: status가 normalized가 아닙니다.`);
    if (!Array.isArray(datasetEntry.records) || datasetEntry.records.length !== datasetEntry.recordCount) {
      fail(`${datasetEntry.id}: recordCount가 records 길이와 다릅니다.`);
    }
    validateSource(datasetEntry, { publicBundle });
  }
  for (const pointerEntry of registry.sourcePointers) {
    if (pointerEntry.status !== "source-pointer") fail(`${pointerEntry.id}: pointer status가 잘못됐습니다.`);
    validateSource(pointerEntry, { publicBundle });
  }

  const normalizedRecordCount = registry.datasets.reduce(
    (total, datasetEntry) => total + datasetEntry.records.length,
    0
  );
  if (registry.meta.normalizedDatasetCount !== registry.datasets.length) {
    fail("meta.normalizedDatasetCount가 실제 데이터셋 수와 다릅니다.");
  }
  if (registry.meta.normalizedRecordCount !== normalizedRecordCount) {
    fail("meta.normalizedRecordCount가 실제 레코드 수와 다릅니다.");
  }
  if (registry.meta.sourcePointerCount !== registry.sourcePointers.length) {
    fail("meta.sourcePointerCount가 실제 포인터 수와 다릅니다.");
  }

  if (publicBundle) assertPublicBundleSafety(registry);
}

function validateSource(entry, { publicBundle }) {
  if (!entry.source?.name) {
    fail(`${entry.id}: source name이 필요합니다.`);
  }

  if (publicBundle) {
    if ("paths" in entry.source) fail(`${entry.id}: 공개 번들에 source paths를 넣을 수 없습니다.`);
    if (entry.source.url && !/^https?:\/\//.test(entry.source.url)) {
      fail(`${entry.id}: 공개 source URL은 http(s) URL이어야 합니다.`);
    }
  } else {
    if (!Array.isArray(entry.source.paths) || entry.source.paths.length === 0) {
      fail(`${entry.id}: source paths가 필요합니다.`);
    }
    for (const sourcePath of entry.source.paths) {
      if (path.isAbsolute(sourcePath) || sourcePath.split("/").includes("..")) {
        fail(`${entry.id}: source path는 원천 루트 상대경로여야 합니다: ${sourcePath}`);
      }
    }
  }

  if (!Array.isArray(entry.units) || entry.units.length === 0) {
    fail(`${entry.id}: units가 필요합니다.`);
  }
}

function assertPublicBundleSafety(registry) {
  walk(registry, [], (key, value, keyPath) => {
    if (isInternalMetadataKey(key)) {
      fail(`공개 번들에 내부 경로/파일명 키가 남아 있습니다: ${keyPath}`);
    }
    if (
      typeof value === "string" &&
      !/^https?:\/\//.test(value) &&
      /(?:^|\/)(?:data_downloads|scripts|outputs?|audits)(?:\/|$)/.test(value)
    ) {
      fail(`공개 번들에 내부 경로가 남아 있습니다: ${keyPath}`);
    }
    if (typeof value === "string" && (path.isAbsolute(value) || value.startsWith("~/"))) {
      fail(`공개 번들에 로컬 절대 경로가 남아 있습니다: ${keyPath}`);
    }
  });
}

function walk(value, keyPath, visitor) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => walk(child, [...keyPath, index], visitor));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...keyPath, key];
    visitor(key, child, childPath.join("."));
    walk(child, childPath, visitor);
  }
}

function verifySourceFiles(registry, root) {
  for (const entry of [...registry.datasets, ...registry.sourcePointers]) {
    for (const sourcePath of entry.source.paths) {
      requireFile(path.join(root, sourcePath));
    }
  }
}

function writeRegistry(registry) {
  fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
  fs.writeFileSync(JSON_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  fs.writeFileSync(JS_PATH, browserBundle(registry), "utf8");
}

function assertBrowserBundle(registry) {
  const current = fs.readFileSync(JS_PATH, "utf8");
  const expected = browserBundle(registry);
  if (current !== expected) fail("supplemental-stats.js가 JSON 정규화본과 다릅니다.");
}

function browserBundle(registry) {
  return `window.SUPPLEMENTAL_STATS = ${JSON.stringify(registry)};\n`;
}

function assertEqualJson(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(message);
}

function summary(registry, prefix) {
  return (
    `${prefix}: 정규화 데이터셋 ${registry.meta.normalizedDatasetCount}개 · ` +
    `레코드 ${registry.meta.normalizedRecordCount}개 · 원천 포인터 ${registry.meta.sourcePointerCount}개`
  );
}

function readCsv(root, relativePath) {
  const fullPath = path.join(root, relativePath);
  requireFile(fullPath);
  const rows = parseCsv(fs.readFileSync(fullPath, "utf8").replace(/^\uFEFF/, ""));
  if (rows.length < 2) fail(`${relativePath}: CSV 데이터 행이 없습니다.`);
  const headers = rows[0];
  return rows.slice(1).filter((row) => row.some((cell) => cell !== "")).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))
  );
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function groupBy(rows, keyFn) {
  const grouped = {};
  for (const row of rows) {
    const key = keyFn(row);
    (grouped[key] ??= []).push(row);
  }
  return grouped;
}

function number(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) fail(`숫자를 해석하지 못했습니다: ${value}`);
  return parsed;
}

function integer(value) {
  const parsed = number(value);
  if (!Number.isInteger(parsed)) fail(`정수가 아닙니다: ${value}`);
  return parsed;
}

function requiredMapValue(mapping, key, label) {
  if (!(key in mapping)) fail(`${label} 매핑이 없습니다: ${key}`);
  return mapping[key];
}

function readOption(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  const value = args[index + 1];
  if (!value || value.startsWith("--")) fail(`${name} 뒤에 경로가 필요합니다.`);
  return value;
}

function requireFile(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(`원천 파일을 찾지 못했습니다: ${filePath}`);
  }
}

function requireDirectory(directoryPath, label) {
  if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
    fail(`${label}를 찾지 못했습니다: ${directoryPath}`);
  }
}

function readJson(filePath) {
  requireFile(filePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${filePath}을 JSON으로 읽지 못했습니다: ${error.message}`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

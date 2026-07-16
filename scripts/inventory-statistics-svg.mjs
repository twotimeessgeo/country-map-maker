import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ROOTS = [
  { id: "new-project-8", path: path.join(os.homedir(), "Documents", "New project 8") },
  { id: "codex-documents", path: path.join(os.homedir(), "Documents", "Codex") },
  { id: "map", path: ROOT_DIR },
];
const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist", ".cache"]);
const args = process.argv.slice(2);
const shouldWrite = args.includes("--write");
const shouldCheck = args.includes("--check");
const snapshotDate = readOption("--date") || new Date().toISOString().slice(0, 10);
const compactDate = snapshotDate.replaceAll("-", "");
const outputDir = path.join(ROOT_DIR, "audits");
const jsonPath = path.join(outputDir, `svg-statistics-inventory-${compactDate}.json`);
const markdownPath = path.join(outputDir, `svg-statistics-inventory-${compactDate}.md`);

if (shouldWrite === shouldCheck) fail("--write 또는 --check 중 하나만 지정해야 합니다.");
if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate)) fail("--date는 YYYY-MM-DD 형식이어야 합니다.");

const roots = DEFAULT_ROOTS.filter((root) => fs.existsSync(root.path));
const registry = readRegistry();
const inventory = buildInventory(roots, registry, snapshotDate);
validateInventory(inventory, registry);
const markdown = renderMarkdown(inventory);

if (shouldWrite) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownPath, markdown, "utf8");
  console.log(summary(inventory, "인벤토리 생성 완료"));
} else {
  const current = readJson(jsonPath);
  if (JSON.stringify(current) !== JSON.stringify(inventory)) {
    fail(`${path.basename(jsonPath)}이 현재 SVG 파일 상태와 다릅니다.`);
  }
  if (fs.readFileSync(markdownPath, "utf8") !== markdown) {
    fail(`${path.basename(markdownPath)}이 JSON 인벤토리와 다릅니다.`);
  }
  console.log(summary(inventory, "인벤토리 검증 완료"));
}

function buildInventory(rootsToScan, supplementalRegistry, date) {
  const files = rootsToScan.flatMap((root) =>
    walkSvgFiles(root.path).map((fullPath) => inspectSvg(root, fullPath, supplementalRegistry))
  );
  files.sort((a, b) => a.root.localeCompare(b.root) || a.relativePath.localeCompare(b.relativePath));

  const categoryCounts = countBy(files, (file) => file.category);
  const sourceResolutionCounts = countBy(
    files.filter((file) => file.category === "statistics"),
    (file) => file.sourceResolution
  );
  const mappedDatasetIds = unique(files.flatMap((file) => file.registryDatasetIds));
  const mappedSourcePointerIds = unique(files.flatMap((file) => file.sourcePointerIds));

  return {
    meta: {
      schemaVersion: 1,
      snapshotDate: date,
      description:
        "수능 지리 제작 폴더의 SVG를 통계·지도·로고·교육 도식으로 구분하고 보조 통계 레지스트리와 연결한 로컬 감사 인벤토리",
      scanRootIds: rootsToScan.map((root) => root.id),
      ignoredDirectories: [...IGNORED_DIRECTORIES].sort(),
      totalFileCount: files.length,
      categoryCounts,
      statisticsSourceResolutionCounts: sourceResolutionCounts,
      mappedSupplementalDatasetCount: mappedDatasetIds.length,
      mappedSupplementalSourcePointerCount: mappedSourcePointerIds.length,
      provenanceGapStatisticsCount: files.filter((file) => file.provenanceGap).length,
      unresolvedStatisticsCount: files.filter((file) => file.unresolvedSource).length,
    },
    registrySnapshot: {
      schemaVersion: supplementalRegistry.meta.schemaVersion,
      generatedAt: supplementalRegistry.meta.generatedAt,
      datasetIds: supplementalRegistry.datasets.map((entry) => entry.id),
      sourcePointerIds: supplementalRegistry.sourcePointers.map((entry) => entry.id),
    },
    files,
  };
}

function inspectSvg(root, fullPath, supplementalRegistry) {
  const relativePath = path.relative(root.path, fullPath).split(path.sep).join("/");
  const basename = path.basename(fullPath);
  const buffer = fs.readFileSync(fullPath);
  const sample = textSample(buffer);
  const category = classify(root.id, relativePath, basename);
  const sourceHints = extractSourceHints(sample);
  const registryDatasetIds = category === "statistics" ? mapDatasetIds(basename) : [];
  const sourcePointerIds =
    category === "statistics" ? mapSourcePointerIds(basename, sourceHints, registryDatasetIds) : [];
  const relatedSourcePointerIds =
    category === "statistics"
      ? mapRelatedSourcePointerIds(basename, sourceHints, registryDatasetIds, sourcePointerIds)
      : [];
  const sourceUrls = extractSourceUrls(sample);
  const years = extractYears(basename);
  const sourceResolution = resolveSource(
    category,
    registryDatasetIds,
    sourcePointerIds,
    relatedSourcePointerIds,
    sourceHints,
    sourceUrls
  );

  for (const id of registryDatasetIds) {
    if (!supplementalRegistry.datasets.some((entry) => entry.id === id)) {
      fail(`${relativePath}: 존재하지 않는 보조 데이터셋 id ${id}`);
    }
  }
  for (const id of sourcePointerIds) {
    if (!supplementalRegistry.sourcePointers.some((entry) => entry.id === id)) {
      fail(`${relativePath}: 존재하지 않는 원천 포인터 id ${id}`);
    }
  }

  return {
    root: root.id,
    relativePath,
    category,
    sizeBytes: buffer.length,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    ...(years.length ? { years } : {}),
    registryDatasetIds,
    sourcePointerIds,
    relatedSourcePointerIds,
    sourceHints,
    sourceUrls,
    sourceResolution,
    provenanceGap: sourceResolution === "knownProvenanceGap",
    unresolvedSource: sourceResolution === "unresolvedSource",
  };
}

function classify(rootId, relativePath, basename) {
  const lowerPath = relativePath.toLowerCase();
  const lowerName = basename.toLowerCase();
  if (
    rootId === "codex-documents" ||
    /(?:prime-meridian|_pm_|_final_(?:wire|primary))/.test(lowerName)
  ) {
    return "brandAsset";
  }
  if (
    lowerPath.includes("/map_assets/") ||
    lowerPath.startsWith("outputs/map_assets/") ||
    lowerPath.includes("korea_admin_svg") ||
    lowerPath.includes("internet_map_candidates/") ||
    lowerPath.includes("river_terrace_extract/") ||
    /(?:coast_landform|daedongyeojido|ebs_worldgeo_.*_map|capital_region_expressways)/.test(lowerName)
  ) {
    return "mapAsset";
  }
  if (/crossword/.test(lowerName)) return "educationalDiagram";
  return "statistics";
}

function mapDatasetIds(basename) {
  const rules = [
    [/^export_product_composition_tur_tun_kaz_are_2023_280px\.svg$/, "wits-export-product-groups-2023"],
    [/^africa_export_commodity_groups_2021_280px\.svg$/, "wto-africa-export-commodity-groups-2021"],
    [/^usa_mexico_brazil_canada_power_capacity_mix_2024_280px\.svg$/, "irena-electricity-capacity-mix-2024"],
    [/^usa_mexico_brazil_canada_fossil_capacity_mix_2024_280px\.svg$/, "irena-fossil-capacity-mix-2024"],
    [
      /^japan_thailand_china_natural_increase_net_migration_1950_2020(?:_three_panel(?:_xscaled(?:_fine)?)?)?_310px\.svg$/,
      "un-wpp2024-natural-change-net-migration-rates",
    ],
    [/^ethnic_composition_jm_co_br_uy_280px\.svg$/, "cia-ethnic-composition-jm-col-bra-ury"],
    [/^kazakhstan_iran_turkiye_egypt_crop_area_share_2022_280px\.svg$/, "faostat-crop-area-shares-2022"],
    [/^regional_primary_energy_renewables_share_2023_280px\.svg$/, "ei-regional-primary-energy-renewables-share-2023"],
    [/^regional_renewable_primary_energy_mix_2023_280px\.svg$/, "ei-regional-renewable-primary-energy-mix-2023"],
    [/^renewables_region_consumption_growth_2024_300px\.svg$/, "ei-regional-renewables-consumption-growth-2014-2024"],
  ];
  return rules.filter(([pattern]) => pattern.test(basename)).map(([, id]) => id);
}

function mapSourcePointerIds(basename, sourceHints, datasetIds) {
  if (datasetIds.length) return [];
  const ids = [];
  const hintSet = new Set(sourceHints);
  if (/^us_state_mfg_shipments_(?:ia|la|mi|or|tx|wa)_2023_300px\.svg$/.test(basename)) {
    ids.push("us-census-aies-state-manufacturing-2023");
  }
  if (/^gurye_hwaeomsa_alluvial_fan_profile_srtm30m_280px\.svg$/.test(basename)) {
    ids.push("opentopodata-srtm30m-gurye-profile");
  }
  if (/^region_age_structure_youth_old_2023_300px\.svg$/.test(basename)) {
    ids.push("world-bank-population-structure-local-cache");
  }
  if (/^korea_renewable_dominant_regions_2020_150px\.svg$/.test(basename)) {
    ids.push("energy-transition-forum-renewable-generation-2020-local-script");
  }
  if (
    /^(?:brics-energy-supply-share|cobalt-coffee-cacao-production-share|energy-source-donut-nepal-india-france|export-top5-products|renewable-top3-supply-share|saudi-iran-turkiye-energy-supply-share)\.svg$/.test(
      basename
    )
  ) {
    ids.push("local-inline-chart-values-upstream-unrecorded");
  }
  if (
    /^france_(?:generation_demand_hourly_20260601_(?:05|06)|renewables_demand_hourly_20260601_05(?:_smooth)?)_310px\.svg$/.test(
      basename
    )
  ) {
    ids.push("rte-eco2mix-france-hourly-20260601-06");
  }
  if (/^china_saudi_niger_japan_sex_ratio_population_2023_310px\.svg$/.test(basename)) {
    ids.push("un-wpp-world-bank-population-indicators-2023");
  }
  if (
    /^(?:gangneung_mokpo_daejeon_seogwipo_climate_deviation_1991_2020_280px|korea_snow_precip_heatwave_scatter_1991_2020_250px)\.svg$/.test(
      basename
    ) && hintSet.has("기상청")
  ) {
    ids.push("kma-climate-normals-1991-2020");
  }
  if (/^korea_final_energy_consumption_2024_/.test(basename) && hintSet.has("에너지경제연구원")) {
    ids.push("keei-regional-energy-yearbook-2025");
  }
  if (/^korea_air_energy_power_/.test(basename) && hintSet.has("CAPSS")) {
    ids.push("capss-emissions-by-admin-2022");
  }
  if (/^latin_america_top3_city_population_/.test(basename)) {
    ids.push("un-wup2025-cities-population-surface");
  }
  if (/^korea_coastline_sinuosity_(?:gyeonggi_jeonnam_gangwon_2024|relative_2014_2024)/.test(basename)) {
    ids.push("khoa-coastline-by-local-2014-2024");
  }
  if (/^(?:foreign_national_population_|migration-destination-continent-ratios|saudi_oman_uae_migrant_origins_2020)/.test(basename)) {
    ids.push("un-desa-international-migrant-stock-2020");
  }
  if (/^pop_pyramid_/.test(basename) && hintSet.has("UN WPP 2024")) {
    ids.push("un-wpp2024-demographic-indicators-raw");
  }
  if (
    /^(?:age_sex_ratio_|gangwon_age_sex_ratio_|busan_commute_|hwaseong_icheon_gimpo_goyang_paddy_mfg_seoul_commute_|korea_(?:industry_region_groups_shipments_2024|manufacturing_shipments_index_2024|mfg_top2_region_pairs_2022)|manufacturing_industry_region_pies_)/.test(
      basename
    ) && hintSet.has("KOSIS")
  ) {
    ids.push("kosis-local-cache");
  }
  return unique(ids);
}

function mapRelatedSourcePointerIds(basename, sourceHints, datasetIds, exactPointerIds) {
  if (datasetIds.length) return [];
  const ids = [];
  const hintSet = new Set(sourceHints);
  if (
    hintSet.has("에너지경제연구원") &&
    /(?:energy|renewable)/.test(basename) &&
    !exactPointerIds.includes("keei-regional-energy-yearbook-2025")
  ) {
    ids.push("keei-regional-energy-yearbook-2025");
  }
  if (/^foreign_resident_/.test(basename) && hintSet.has("행정안전부")) {
    ids.push("mois-local-foreign-residents-2024");
  }
  if (
    hintSet.has("KOSIS") &&
    !exactPointerIds.includes("kosis-local-cache")
  ) {
    ids.push("kosis-local-cache");
  }
  if (
    hintSet.has("UN WUP 2025") &&
    !exactPointerIds.includes("un-wup2025-cities-population-surface")
  ) {
    ids.push("un-wup2025-cities-population-surface");
  }
  return unique(ids);
}

function extractSourceHints(text) {
  const rules = [
    [/(?:UN\s+DESA\s+)?WPP\s*2024|World Population Prospects\s*2024/i, "UN WPP 2024"],
    [/\bUN\s+WPP\b/i, "UN WPP"],
    [/WUP\s*2025|World Urbanization Prospects\s*2025/i, "UN WUP 2025"],
    [/UN\s+DESA/i, "UN DESA"],
    [/World Bank\s+WDI|\bWDI\b/i, "World Bank WDI"],
    [/\bWorld Bank\b(?!\s+WDI)/i, "World Bank"],
    [/\bWITS\b/i, "WITS"],
    [/World Trade Organization|\bWTO\b/i, "WTO"],
    [/BACI\s*[\u00b7/]\s*OEC/i, "BACI·OEC"],
    [/\bIRENA\b/i, "IRENA"],
    [/\bFAOSTAT\b/i, "FAOSTAT"],
    [/CIA\s+(?:World\s+)?Factbook/i, "CIA World Factbook"],
    [/Energy Institute|Statistical Review of World Energy/i, "Energy Institute"],
    [/에너지경제연구원|Korea Energy Economics Institute/i, "에너지경제연구원"],
    [/행정안전부|Ministry of the Interior and Safety/i, "행정안전부"],
    [/CAPSS|국가미세먼지정보센터/i, "CAPSS"],
    [/국립해양조사원|Korea Hydrographic and Oceanographic Agency/i, "국립해양조사원"],
    [/KOSIS|국가통계포털|국가데이터처/i, "KOSIS"],
    [/Japan Meteorological Agency|\bJMA\b/i, "JMA"],
    [/기상청|Korea Meteorological Administration|\bKMA\b/i, "기상청"],
    [/RTE\s*(?:éCO2mix)?|\béCO2mix\b/i, "RTE éCO2mix"],
    [/Bureau of Meteorology|\bBOM\b/i, "BOM"],
    [/국토교통부|국토교통\s*통계누리|Ministry of Land, Infrastructure and Transport/i, "국토교통부"],
    [/한국교통연구원|국가교통DB|Korea Transport Institute/i, "한국교통연구원"],
    [/서울교통공사|Seoul Metro/i, "서울교통공사"],
    [/산업통상자원부|Ministry of Trade, Industry and Energy/i, "산업통상자원부"],
    [/한국전력공사|Korea Electric Power Corporation|\bKEPCO\b/i, "한국전력공사"],
    [/전력거래소|Korea Power Exchange|\bKPX\b/i, "전력거래소"],
    [/WAMIS|국가수자원관리종합정보시스템/i, "WAMIS"],
    [/GTN-P|Global Terrestrial Network for Permafrost/i, "GTN-P"],
    [/Capel\s+et\s+al\.\s*\(1988\)/i, "Capel et al. (1988)"],
    [/국립환경과학원|National Institute of Environmental Research/i, "국립환경과학원"],
    [/국토지리정보원|\bOSM\b|OpenStreetMap/i, "국토지리정보원·OSM"],
    [/에너지전환포럼|Energy Transition Forum/i, "에너지전환포럼"],
    [/U\.S\. Census|Census Bureau/i, "U.S. Census Bureau"],
    [/Eurostat/i, "Eurostat"],
    [/\bOECD\b/i, "OECD"],
    [/Our World in Data/i, "Our World in Data"],
  ];
  return rules.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
}

function extractSourceUrls(text) {
  const matches = text.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
  return unique(
    matches
      .map((url) => url.replace(/[),.;]+$/, ""))
      .filter((url) =>
        !url.includes("w3.org/2000/svg") &&
        !url.includes("w3.org/1999/xlink") &&
        !url.includes("inkscape.org/namespaces/inkscape")
      )
      .slice(0, 12)
  );
}

function extractYears(basename) {
  return unique((basename.match(/(?:19|20)\d{2}/g) ?? []).map(Number)).sort((a, b) => a - b);
}

function resolveSource(
  category,
  datasetIds,
  pointerIds,
  relatedPointerIds,
  sourceHints,
  sourceUrls
) {
  if (category !== "statistics") return "notApplicable";
  if (datasetIds.length) return "supplementalDataset";
  if (pointerIds.includes("local-inline-chart-values-upstream-unrecorded")) {
    return "knownProvenanceGap";
  }
  if (pointerIds.length) return "supplementalSourcePointer";
  if (relatedPointerIds.length) return "relatedSupplementalSource";
  if (sourceHints.length || sourceUrls.length) return "embeddedSourceHint";
  return "unresolvedSource";
}

function textSample(buffer) {
  const maxChunk = 512 * 1024;
  if (buffer.length <= maxChunk * 2) return buffer.toString("utf8");
  return `${buffer.subarray(0, maxChunk).toString("utf8")}\n${buffer
    .subarray(buffer.length - maxChunk)
    .toString("utf8")}`;
}

function walkSvgFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkSvgFiles(fullPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".svg")) files.push(fullPath);
  }
  return files;
}

function validateInventory(inventory, supplementalRegistry) {
  if (inventory.meta.totalFileCount !== inventory.files.length) fail("SVG 전체 개수가 맞지 않습니다.");
  const keys = inventory.files.map((file) => `${file.root}:${file.relativePath}`);
  if (new Set(keys).size !== keys.length) fail("SVG 경로가 중복되었습니다.");
  const validCategories = new Set(["statistics", "mapAsset", "brandAsset", "educationalDiagram"]);
  for (const file of inventory.files) {
    if (!validCategories.has(file.category)) fail(`${file.relativePath}: 잘못된 category`);
    if (file.unresolvedSource !== (file.sourceResolution === "unresolvedSource")) {
      fail(`${file.relativePath}: unresolvedSource 상태가 맞지 않습니다.`);
    }
    if (file.provenanceGap !== (file.sourceResolution === "knownProvenanceGap")) {
      fail(`${file.relativePath}: provenanceGap 상태가 맞지 않습니다.`);
    }
    if (file.unresolvedSource && file.category !== "statistics") {
      fail(`${file.relativePath}: 비통계 자산은 unresolvedSource가 될 수 없습니다.`);
    }
  }
  const knownDatasetIds = new Set(supplementalRegistry.datasets.map((entry) => entry.id));
  const knownPointerIds = new Set(supplementalRegistry.sourcePointers.map((entry) => entry.id));
  for (const id of inventory.files.flatMap((file) => file.registryDatasetIds)) {
    if (!knownDatasetIds.has(id)) fail(`알 수 없는 데이터셋 id: ${id}`);
  }
  for (const id of inventory.files.flatMap((file) => file.sourcePointerIds)) {
    if (!knownPointerIds.has(id)) fail(`알 수 없는 원천 포인터 id: ${id}`);
  }
}

function renderMarkdown(inventory) {
  const statistics = inventory.files.filter((file) => file.category === "statistics");
  const datasetMapped = statistics.filter((file) => file.registryDatasetIds.length);
  const pointerMapped = statistics.filter(
    (file) => !file.registryDatasetIds.length && file.sourcePointerIds.length
  );
  const sourceHinted = statistics.filter((file) => file.sourceResolution === "embeddedSourceHint");
  const provenanceGaps = statistics.filter((file) => file.provenanceGap);
  const unresolved = statistics.filter((file) => file.unresolvedSource);
  const lines = [
    `# SVG 통계·자산 인벤토리 (${inventory.meta.snapshotDate})`,
    "",
    "이 문서는 로컬 제작 폴더의 SVG를 통계 자료와 지도·로고·교육 도식 자산으로 분리하고, 통계 SVG를 `supplemental-stats.json`의 정규화 데이터셋 또는 원천 포인터에 연결한 감사 스냅샷이다. 경로는 절대경로 대신 스캔 루트 id와 상대경로로 적었다.",
    "",
    "## 요약",
    "",
    `- 전체 SVG: ${inventory.meta.totalFileCount}개`,
    `- 통계 SVG: ${inventory.meta.categoryCounts.statistics ?? 0}개`,
    `- 지도 자산: ${inventory.meta.categoryCounts.mapAsset ?? 0}개`,
    `- 로고 자산: ${inventory.meta.categoryCounts.brandAsset ?? 0}개`,
    `- 교육 도식: ${inventory.meta.categoryCounts.educationalDiagram ?? 0}개`,
    `- 보조 정규화 데이터셋에 직접 매핑: ${datasetMapped.length}개 SVG / ${inventory.meta.mappedSupplementalDatasetCount}개 데이터셋`,
    `- 보조 원천 포인터에 매핑: ${pointerMapped.length}개 SVG / ${inventory.meta.mappedSupplementalSourcePointerCount}개 포인터`,
    `- SVG 내부 출처 힌트만 확인: ${sourceHinted.length}개`,
    `- 로컬 값은 연결됐으나 상위 원천 미기록: ${provenanceGaps.length}개`,
    `- 기계적 연결 미해결: ${unresolved.length}개`,
    "",
    "`knownProvenanceGap`은 SVG 생성값과 로컬 스크립트의 연결은 확인했지만 상위 원천 기관·기준 연도가 기록되지 않았다는 뜻이다. `unresolvedSource`는 이 스냅샷에서 SVG와 로컬 원천 파일의 연결 자체를 기계적으로 고정하지 못했다는 뜻이다.",
    "",
    "## 보조 정규화 데이터셋 직접 매핑",
    "",
    ...renderFileGroups(datasetMapped, (file) => file.registryDatasetIds.join(", ")),
    "",
    "## 보조 원천 포인터 매핑",
    "",
    ...renderFileGroups(pointerMapped, (file) => file.sourcePointerIds.join(", ")),
    "",
    "## SVG 내부 출처 힌트만 확인",
    "",
    ...renderFileGroups(sourceHinted, (file) => file.sourceHints.join(", ") || file.sourceUrls.join(", ")),
    "",
    "## 상위 원천 미기록 통계 SVG",
    "",
    ...(provenanceGaps.length
      ? provenanceGaps.map((file) => `- \`${file.root}/${file.relativePath}\``)
      : ["- 없음"]),
    "",
    "## 기계적 연결 미해결 통계 SVG",
    "",
    ...(unresolved.length
      ? unresolved.map((file) => `- \`${file.root}/${file.relativePath}\``)
      : ["- 없음"]),
    "",
    "## 비통계 자산 목록",
    "",
    ...["mapAsset", "brandAsset", "educationalDiagram"].flatMap((category) => {
      const rows = inventory.files.filter((file) => file.category === category);
      return [
        `### ${category} (${rows.length})`,
        "",
        ...rows.map((file) => `- \`${file.root}/${file.relativePath}\``),
        "",
      ];
    }),
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

function renderFileGroups(files, keyFn) {
  if (!files.length) return ["- 없음"];
  const grouped = new Map();
  for (const file of files) {
    const key = keyFn(file);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(file);
  }
  return [...grouped.entries()].flatMap(([key, rows]) => [
    `- ${key}`,
    ...rows.map((file) => `  - \`${file.root}/${file.relativePath}\``),
  ]);
}

function readRegistry() {
  return readJson(path.join(ROOT_DIR, "data", "supplemental-stats.json"));
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) fail(`파일을 찾지 못했습니다: ${filePath}`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${filePath}을 JSON으로 읽지 못했습니다: ${error.message}`);
  }
}

function countBy(items, keyFn) {
  return Object.fromEntries(
    [...items.reduce((map, item) => {
      const key = keyFn(item);
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map())].sort(([a], [b]) => a.localeCompare(b))
  );
}

function unique(items) {
  return [...new Set(items)];
}

function summary(inventory, prefix) {
  return (
    `${prefix}: 전체 ${inventory.meta.totalFileCount}개 · 통계 ${inventory.meta.categoryCounts.statistics ?? 0}개 · ` +
    `지도 ${inventory.meta.categoryCounts.mapAsset ?? 0}개 · 로고 ${inventory.meta.categoryCounts.brandAsset ?? 0}개 · ` +
    `상위 원천 미기록 ${inventory.meta.provenanceGapStatisticsCount ?? 0}개 · ` +
    `미해결 ${inventory.meta.unresolvedStatisticsCount}개`
  );
}

function readOption(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  const value = args[index + 1];
  if (!value || value.startsWith("--")) fail(`${name} 뒤에 값이 필요합니다.`);
  return value;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

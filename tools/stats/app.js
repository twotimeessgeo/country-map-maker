(() => {
  "use strict";

  const DATA_URLS = {
    world: "../../data/country-stats.js?v=20260716",
    korea: "../../data/korea-stats.js?v=20260716",
    supplemental: "../../data/supplemental-stats.js?v=20260716",
    worldClimate: "../climate/data/climate-data.js?v=20260716",
    koreaClimate: "../climate/data/korea-climate-data.js?v=20260716",
  };

  const CATEGORY_LABELS = {
    population: "인구·도시",
    populationStructure: "인구 구조",
    migration: "인구 이동",
    agriculture: "농업·토지",
    energy: "에너지",
    economy: "경제·산업",
    religion2020: "종교",
    climate: "기후",
    demography: "인구 구조·이동",
    household: "가구·생활",
    labor: "노동·소득",
    industry: "산업·경제",
    land: "토지·교통",
    environment: "환경·에너지",
    health: "보건·복지",
    education: "교육",
    multiple: "복합 지표",
    supplemental: "보완 통계",
  };

  const SEGMENT_LABELS = {
    population: "총인구",
    urbanPopulation: "도시 인구",
    ruralPopulation: "촌락 인구",
    urbanShare: "도시 인구 비율",
    ruralShare: "촌락 인구 비율",
    birthRate: "조출생률",
    deathRate: "조사망률",
    naturalIncreaseRate: "자연 증가율",
    totalPopulation: "총인구",
    age0To14: "0~14세",
    age15To64: "15~64세",
    age65Plus: "65세 이상",
    youth: "유소년 부양비",
    oldAge: "노년 부양비",
    total: "합계",
    agriculture: "농림어업",
    industry: "광공업",
    services: "서비스업",
    fuelsAndMining: "연료·광물",
    manufactures: "공산품",
    african: "아프리카계",
    mixed: "혼혈",
    christians: "그리스도교",
    muslims: "이슬람교",
    hindus: "힌두교",
    buddhists: "불교",
    jews: "유대교",
    noReligion: "무종교",
    other: "기타",
    wheat: "밀",
    rice: "쌀",
    maize: "옥수수",
    barley: "보리",
    oats: "귀리",
    cotton: "목화",
    cattle: "소",
    pigs: "돼지",
    sheep: "양",
    food: "식량",
    feed: "사료",
    bioenergy: "바이오에너지",
    coal: "석탄",
    gas: "천연가스",
    naturalGas: "천연가스",
    oil: "석유",
    nuclear: "원자력",
    hydropower: "수력",
    wind: "풍력",
    solar: "태양광",
    renewable: "재생에너지",
    renewables: "재생에너지",
    fossil: "화석 에너지",
    otherRenewables: "기타 재생에너지",
    geoBiomassOther: "지열·바이오매스 등",
    biofuels: "바이오연료",
    reconciliationAdjustment: "조정값",
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

  const HATCH_PATTERNS = [
    { id: "solid", fill: "#111" },
    { id: "gray", fill: "#777" },
    { id: "light", fill: "#c7c7c7" },
    { id: "hatch", fill: "url(#stats-hatch)" },
    { id: "cross", fill: "url(#stats-cross)" },
    { id: "dots", fill: "url(#stats-dots)" },
    { id: "horizontal", fill: "url(#stats-horizontal)" },
    { id: "vertical", fill: "url(#stats-vertical)" },
    { id: "white", fill: "#fff" },
    { id: "backhatch", fill: "url(#stats-backhatch)" },
    { id: "checker", fill: "url(#stats-checker)" },
    { id: "dash", fill: "url(#stats-dash)" },
    { id: "ring", fill: "url(#stats-ring)" },
  ];

  const state = {
    scope: "world",
    koreaLevel: "provinces",
    climateDataset: "world",
    category: "all",
    metricSearch: "",
    metricId: null,
    chartType: "rank",
    version: "latest",
    sort: "desc",
    limit: 12,
    selectedEntityIds: new Set(),
    anonymize: false,
    librarySearch: "",
    supplementalLoaded: false,
  };

  const cache = {
    scripts: new Map(),
    catalogs: new Map(),
    currentCatalog: null,
    currentExport: null,
    supplemental: null,
  };

  const dom = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    collectDom();
    bindEvents();
    renderGraphLibrary();
    updateReferenceCoverage();
    try {
      await activateScope("world", { initial: true });
    } catch (error) {
      showFatalError(error);
    }
  }

  function collectDom() {
    for (const id of [
      "scopeSwitch", "worldCoverage", "koreaCoverage", "climateCoverage", "referenceCoverage",
      "loadStatus", "koreaLevelField", "koreaLevelSelect", "climateDatasetField",
      "climateDatasetSelect", "categorySelect", "metricSearch", "metricSelect",
      "chartTypeSelect", "versionField", "versionSelect", "secondaryMetricField",
      "secondaryMetricSelect", "rankingFields", "sortSelect", "limitSelect", "entitySearch",
      "entityList", "clearEntitySelection", "anonymizeToggle", "chartEyebrow", "chartHeading",
      "chartMeta", "chartSurface", "chartStatus", "answerKey", "sourcePeriod", "sourceName",
      "sourceLink", "downloadSvgButton", "downloadCsvButton", "metricLibrarySearch",
      "metricLibrary", "metricLibraryCount", "loadSupplementalButton", "sourceSearchField",
      "sourceLibrarySearch", "sourceLibrary", "sourceLibraryCount", "graphLibrarySearch",
      "graphStatusFilter", "graphLibrary", "graphLibraryCount",
    ]) {
      dom[id] = document.getElementById(id);
    }
  }

  function bindEvents() {
    dom.scopeSwitch.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-scope]");
      if (button && button.dataset.scope !== state.scope) activateScope(button.dataset.scope).catch(showFatalError);
    });
    dom.koreaLevelSelect.addEventListener("change", () => {
      state.koreaLevel = dom.koreaLevelSelect.value;
      state.selectedEntityIds.clear();
      activateScope("korea", { force: true }).catch(showFatalError);
    });
    dom.climateDatasetSelect.addEventListener("change", () => {
      state.climateDataset = dom.climateDatasetSelect.value;
      state.selectedEntityIds.clear();
      activateScope("climate", { force: true }).catch(showFatalError);
    });
    dom.categorySelect.addEventListener("change", () => {
      state.category = dom.categorySelect.value;
      refreshMetricPicker({ chooseFirst: true });
    });
    dom.metricSearch.addEventListener("input", () => {
      state.metricSearch = dom.metricSearch.value.trim();
      refreshMetricPicker({ chooseFirst: false });
    });
    dom.metricSelect.addEventListener("change", () => selectMetric(dom.metricSelect.value));
    dom.chartTypeSelect.addEventListener("change", () => {
      state.chartType = dom.chartTypeSelect.value;
      updateModeControls();
      renderAllForMetric();
    });
    dom.versionSelect.addEventListener("change", () => {
      state.version = dom.versionSelect.value;
      renderAllForMetric();
    });
    dom.secondaryMetricSelect.addEventListener("change", renderChart);
    dom.sortSelect.addEventListener("change", () => {
      state.sort = dom.sortSelect.value;
      renderEntityList();
      renderChart();
    });
    dom.limitSelect.addEventListener("change", () => {
      state.limit = Number(dom.limitSelect.value) || 12;
      renderChart();
    });
    dom.entitySearch.addEventListener("input", renderEntityList);
    dom.clearEntitySelection.addEventListener("click", () => {
      state.selectedEntityIds.clear();
      renderEntityList();
      renderChart();
    });
    dom.entityList.addEventListener("change", (event) => {
      const checkbox = event.target.closest("input[type=checkbox][data-entity-id]");
      if (!checkbox) return;
      if (checkbox.checked) state.selectedEntityIds.add(checkbox.dataset.entityId);
      else state.selectedEntityIds.delete(checkbox.dataset.entityId);
      renderChart();
    });
    dom.anonymizeToggle.addEventListener("change", () => {
      state.anonymize = dom.anonymizeToggle.checked;
      renderChart();
    });
    dom.downloadSvgButton.addEventListener("click", downloadCurrentSvg);
    dom.downloadCsvButton.addEventListener("click", downloadCurrentCsv);
    dom.metricLibrarySearch.addEventListener("input", renderMetricLibrary);
    dom.metricLibrary.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-metric-id]");
      if (button) selectMetric(button.dataset.metricId, { scroll: true });
    });
    dom.loadSupplementalButton.addEventListener("click", loadSupplementalLibrary);
    dom.sourceLibrarySearch.addEventListener("input", renderSourceLibrary);
    dom.sourceLibrary.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-supplemental-metric]");
      if (button) openSupplementalMetric(button.dataset.supplementalMetric).catch(showFatalError);
    });
    dom.graphLibrarySearch.addEventListener("input", renderGraphLibrary);
    dom.graphStatusFilter.addEventListener("change", renderGraphLibrary);
    dom.graphLibrary.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-graph-type][data-graph-topic]");
      if (button) applyGraphReferencePreset(button.dataset.graphType, button.dataset.graphTopic).catch(showFatalError);
    });
  }

  async function activateScope(scope, options = {}) {
    state.scope = scope;
    state.category = "all";
    state.metricSearch = "";
    dom.metricSearch.value = "";
    if (!options.initial) state.selectedEntityIds.clear();
    updateScopeControls();
    setLoading(true, scopeLoadMessage(scope));

    const request = { koreaLevel: state.koreaLevel, climateDataset: state.climateDataset };
    let key = scope;
    if (scope === "korea") key = `korea:${request.koreaLevel}`;
    if (scope === "climate") key = `climate:${request.climateDataset}`;
    try {
      if (!options.force && cache.catalogs.has(key)) {
        cache.currentCatalog = cache.catalogs.get(key);
      } else {
        cache.currentCatalog = await buildCatalogForScope(scope, request);
        cache.catalogs.set(key, cache.currentCatalog);
      }
    } catch (error) {
      setLoading(false, "자료 로드 실패 · 다시 선택해 재시도 가능");
      throw error;
    }

    state.metricId = cache.currentCatalog.defaultMetricId;
    state.chartType = cache.currentCatalog.defaultChartType || "rank";
    refreshCategoryPicker();
    refreshMetricPicker({ chooseFirst: false });
    updateCoverageCounters();
    setLoading(false, `${cache.currentCatalog.entities.length.toLocaleString("ko-KR")}개 대상 · ${cache.currentCatalog.metrics.length.toLocaleString("ko-KR")}개 지표`);
  }

  async function buildCatalogForScope(scope, request) {
    if (scope === "world") {
      await loadScript(DATA_URLS.world, "COUNTRY_STATS_BY_ID");
      return buildWorldCatalog();
    }
    if (scope === "korea") {
      await loadScript(DATA_URLS.korea, "KOREA_GEO_STATS_METRICS");
      return buildKoreaCatalog(request.koreaLevel);
    }
    const isWorld = request.climateDataset === "world";
    await loadScript(
      isWorld ? DATA_URLS.worldClimate : DATA_URLS.koreaClimate,
      isWorld ? "CLIMATE_DATA" : "KOREA_CLIMATE_DATA"
    );
    return buildClimateCatalog(request.climateDataset);
  }

  function loadScript(src, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (cache.scripts.has(src)) return cache.scripts.get(src);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.addEventListener("load", () => {
        if (window[globalName]) resolve(window[globalName]);
        else reject(new Error(`${globalName} 전역 데이터를 찾지 못함.`));
      });
      script.addEventListener("error", () => {
        cache.scripts.delete(src);
        reject(new Error(`${src} 로드 실패`));
      });
      document.head.appendChild(script);
    });
    cache.scripts.set(src, promise);
    return promise;
  }

  function scopeLoadMessage(scope) {
    if (scope === "korea") return "한국 지역 통계 33MB를 처음 한 번만 불러오는 중임";
    if (scope === "climate") return "1991–2020 기후 평년값을 불러오는 중임";
    return "세계 국가 통계를 불러오는 중임";
  }

  function setLoading(isLoading, message) {
    dom.loadStatus.textContent = message;
    dom.scopeSwitch.querySelectorAll("button").forEach((button) => {
      button.disabled = isLoading;
    });
    dom.koreaLevelSelect.disabled = isLoading;
    dom.climateDatasetSelect.disabled = isLoading;
  }

  function updateScopeControls() {
    dom.scopeSwitch.querySelectorAll("button[data-scope]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.scope === state.scope);
      button.setAttribute("aria-pressed", String(button.dataset.scope === state.scope));
    });
    dom.koreaLevelField.hidden = state.scope !== "korea";
    dom.climateDatasetField.hidden = state.scope !== "climate";
    dom.koreaLevelSelect.value = state.koreaLevel;
    dom.climateDatasetSelect.value = state.climateDataset;
  }

  function showFatalError(error) {
    console.error(error);
    dom.chartHeading.textContent = "통계를 불러오지 못함";
    dom.chartSurface.innerHTML = `<p class="empty-state">${escapeHtml(error.message || String(error))}</p>`;
    dom.loadStatus.textContent = "자료 로드 실패";
  }

  function buildWorldCatalog() {
    const meta = window.COUNTRY_STATS_META || {};
    const entities = Object.entries(window.COUNTRY_STATS_BY_ID || {})
      .map(([atlasId, data]) => ({
        id: `country:${data.iso3 || atlasId}`,
        label: data.atlasName || data.iso3 || atlasId,
        secondaryLabel: data.iso3 || "",
        data,
        meta: { atlasId, continent: data.continent?.name || "" },
      }))
      .filter((entity) => entity.data && entity.data.iso3)
      .sort((a, b) => a.label.localeCompare(b.label, "ko"));

    const metrics = [
      ...buildWorldSeriesMetrics(meta),
      ...buildWorldObjectMetrics(entities, meta),
      ...buildWorldPrimitiveMetrics(entities, meta),
      ...buildWorldCompositionMetrics(meta),
    ];
    const uniqueMetrics = uniqueBy(metrics, (metric) => metric.id)
      .sort((a, b) => `${a.categoryLabel}|${a.label}`.localeCompare(`${b.categoryLabel}|${b.label}`, "ko"));

    return {
      key: "world",
      scopeLabel: "세계 국가",
      eyebrow: "WORLD · COUNTRY",
      entities,
      metrics: uniqueMetrics,
      defaultMetricId: "world:series:population",
      defaultChartType: "rank",
      meta,
    };
  }

  function buildWorldSeriesMetrics(meta) {
    const specs = [
      ["population", "총인구", "population.rows", "population", "명", 0, "population"],
      ["urbanPopulation", "도시 인구", "population.rows", "urbanPopulation", "명", 0, "population"],
      ["ruralPopulation", "촌락 인구", "population.rows", "ruralPopulation", "명", 0, "population"],
      ["urbanShare", "도시 인구 비율", "population.rows", "urbanShare", "%", 2, "urbanization"],
      ["ruralShare", "촌락 인구 비율", "population.rows", "ruralShare", "%", 2, "urbanization"],
      ["birthRate", "조출생률", "population.rates.rows", "birthRate", "‰", 2, "populationRates"],
      ["deathRate", "조사망률", "population.rates.rows", "deathRate", "‰", 2, "populationRates"],
      ["naturalIncreaseRate", "자연 증가율", "population.rates.rows", "naturalIncreaseRate", "‰", 2, "populationRates"],
    ];
    return specs.map(([key, label, rowsPath, valueKey, unit, decimals, sourceKey]) => ({
      id: `world:series:${key}`,
      scope: "world",
      category: "population",
      categoryLabel: "인구·도시",
      label,
      description: "1960년 이후 주요 시점과 최신 가용 연도를 함께 수록함.",
      unit,
      decimals,
      kind: "series",
      capabilities: ["rank", "compare", "timeseries", "scatter", "table"],
      source: sourceFromWorldMeta(meta, sourceKey),
      getObservation(entity) {
        const rows = getPath(entity.data, rowsPath) || [];
        const row = [...rows].reverse().find((item) => isFiniteNumber(item?.[valueKey]));
        return observationFromValue(row?.[valueKey], row?.year, "latestAvailable");
      },
      getSeries(entity) {
        return (getPath(entity.data, rowsPath) || [])
          .filter((row) => isFiniteNumber(row?.[valueKey]))
          .map((row) => ({ period: String(row.year), periodLabel: String(row.year), value: row[valueKey] }));
      },
      getComparison(entity) {
        const rows = (getPath(entity.data, rowsPath) || []).filter((row) => isFiniteNumber(row?.[valueKey]));
        if (!rows.length) return { reference: missingObservation(), latest: missingObservation() };
        return {
          reference: observationFromValue(rows[0][valueKey], rows[0].year, "reference"),
          latest: observationFromValue(rows.at(-1)[valueKey], rows.at(-1).year, "latestAvailable"),
        };
      },
    }));
  }

  function buildWorldObjectMetrics(entities, meta) {
    const paths = new Map();
    for (const entity of entities) {
      walkWorldEntryObjects(entity.data, [], (path, entry) => {
        if (!paths.has(path)) paths.set(path, { sample: entry, hasLatest: false });
        if (isFiniteNumber(entry.latest?.value)) paths.get(path).hasLatest = true;
      });
    }

    return [...paths.entries()].map(([path, info]) => {
      const category = path.split(".")[0];
      const sourceKey = sourceKeyForWorldPath(path);
      return {
        id: `world:entry:${path}`,
        scope: "world",
        category,
        categoryLabel: CATEGORY_LABELS[category] || "기타",
        label: labelForWorldObjectPath(path, info.sample),
        description: info.hasLatest ? "교재 기준값과 최신 가용값을 함께 보존함." : "현재 저장된 기준 연도의 국가별 값임.",
        unit: normalizeUnit(info.sample.unit),
        rawUnit: info.sample.unit || "",
        decimals: decimalsForUnit(info.sample.unit),
        kind: "scalar",
        hasLatest: info.hasLatest,
        capabilities: ["rank", ...(info.hasLatest ? ["compare"] : []), "scatter", "table"],
        source: sourceFromWorldMeta(meta, sourceKey),
        getObservation(entity, version = "latest") {
          const entry = getPath(entity.data, path);
          if (!entry || !isFiniteNumber(entry.value)) return missingObservation();
          if (version === "latest" && isFiniteNumber(entry.latest?.value)) {
            return observationFromValue(entry.latest.value, entry.latest.year, "latestAvailable");
          }
          return observationFromValue(entry.value, entry.year, version === "latest" ? "referenceFallback" : "reference");
        },
        getComparison(entity) {
          const entry = getPath(entity.data, path);
          return {
            reference: entry && isFiniteNumber(entry.value)
              ? observationFromValue(entry.value, entry.year, "reference")
              : missingObservation(),
            latest: entry && isFiniteNumber(entry.latest?.value)
              ? observationFromValue(entry.latest.value, entry.latest.year, "latestAvailable")
              : missingObservation("최신값 없음"),
          };
        },
      };
    });
  }

  function walkWorldEntryObjects(value, segments, callback) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    if (isFiniteNumber(value.value) && ("year" in value || "unit" in value || "label" in value)) {
      callback(segments.join("."), value);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (["latest", "source", "sources", "rows", "continent"].includes(key)) continue;
      walkWorldEntryObjects(child, [...segments, key], callback);
    }
  }

  function buildWorldPrimitiveMetrics(entities, meta) {
    const roots = ["populationStructure", "economy.industry", "religion2020", "energy", "agriculture.crops.use"];
    const paths = new Set();
    for (const entity of entities) {
      for (const root of roots) {
        walkNumericLeaves(getPath(entity.data, root), root.split("."), paths);
      }
    }

    return [...paths]
      .filter((path) => !/(^|\.)(year|latestYear)$/.test(path))
      .filter((path) => !path.includes(".latest."))
      .filter((path) => !path.endsWith(".density.value"))
      .map((path) => {
        const category = path.split(".")[0];
        const unit = unitForPrimitivePath(path);
        const hasLatest = entities.some((entity) => isFiniteNumber(resolveWorldPrimitive(entity.data, path, "latest").value)
          && resolveWorldPrimitive(entity.data, path, "latest").versionResolved === "latestAvailable");
        return {
          id: `world:value:${path}`,
          scope: "world",
          category,
          categoryLabel: CATEGORY_LABELS[category] || "기타",
          label: labelForWorldPrimitivePath(path),
          description: path.includes("shares") ? "원자료의 구성비를 재정규화하지 않고 그대로 표시함." : "국가별 저장값을 같은 단위로 비교함.",
          unit,
          decimals: unit === "명" ? 0 : 2,
          kind: "scalar",
          hasLatest,
          capabilities: ["rank", ...(hasLatest ? ["compare"] : []), "scatter", "table"],
          source: sourceFromWorldMeta(meta, sourceKeyForWorldPath(path)),
          getObservation(entity, version = "latest") {
            const resolved = resolveWorldPrimitive(entity.data, path, version);
            return observationFromValue(resolved.value, resolved.year, resolved.versionResolved);
          },
          getComparison(entity) {
            const reference = resolveWorldPrimitive(entity.data, path, "reference");
            const latest = resolveWorldPrimitive(entity.data, path, "latest", { noFallback: true });
            return {
              reference: observationFromValue(reference.value, reference.year, "reference"),
              latest: observationFromValue(latest.value, latest.year, "latestAvailable"),
            };
          },
        };
      });
  }

  function walkNumericLeaves(value, segments, output) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "latest") continue;
      const next = [...segments, key];
      if (isFiniteNumber(child)) output.add(next.join("."));
      else walkNumericLeaves(child, next, output);
    }
  }

  function buildWorldCompositionMetrics(meta) {
    const specs = [
      {
        id: "age-structure", label: "연령별 인구 구성", category: "populationStructure",
        sourceKey: "populationStructure", root: "populationStructure.shares",
        keys: ["age0To14", "age15To64", "age65Plus"],
      },
      {
        id: "industry-structure", label: "산업별 부가가치 구성", category: "economy",
        sourceKey: "industry", root: "economy.industry.shares",
        keys: ["agriculture", "industry", "services"],
      },
      {
        id: "religion", label: "종교 구성", category: "religion2020",
        sourceKey: "religion", root: "religion2020.shares",
        keys: ["christians", "muslims", "hindus", "buddhists", "jews", "noReligion", "other"],
      },
      ...["consumption", "electricity", "fossilProduction"].map((group) => ({
        id: `${group}-mix`,
        label: group === "consumption" ? "1차 에너지 소비 구성" : group === "electricity" ? "발전량 구성" : "화석 에너지 생산 구성",
        category: "energy",
        sourceKey: group === "consumption" ? "energyConsumption" : group,
        root: `energy.${group}.shareBreakdown`,
        keys: group === "fossilProduction"
          ? ["coal", "oil", "gas"]
          : ["coal", "oil", "gas", "nuclear", "hydropower", "wind", "solar", "bioenergy", "otherRenewables"],
      })),
      ...["wheat", "rice", "maize"].map((crop) => ({
        id: `${crop}-use`, label: `${SEGMENT_LABELS[crop]} 용도별 구성`, category: "agriculture",
        sourceKey: "cropUse", root: `agriculture.crops.use.${crop}.shares`,
        keys: ["food", "feed", "bioenergy", "other"],
      })),
    ];

    return specs.map((spec) => ({
      id: `world:composition:${spec.id}`,
      scope: "world",
      category: spec.category,
      categoryLabel: CATEGORY_LABELS[spec.category] || "기타",
      label: spec.label,
      description: spec.id === "industry-structure"
        ? "누락된 부문을 임의로 보정하지 않아 합계가 100%보다 작을 수 있음."
        : "원자료의 비율을 그대로 사용하며 합계를 강제로 100으로 바꾸지 않음.",
      unit: "%",
      decimals: 2,
      kind: "composition",
      hasLatest: /^(populationStructure|economy\.industry|energy\.)/.test(spec.root),
      capabilities: ["composition", "table"],
      source: sourceFromWorldMeta(meta, WORLD_SOURCE_KEYS[spec.sourceKey] || spec.sourceKey),
      components: spec.keys.map((key) => ({ key, label: SEGMENT_LABELS[key] || key })),
      getComposition(entity, version = "latest") {
        return spec.keys.map((key) => {
          const path = `${spec.root}.${key}`;
          const resolved = resolveWorldPrimitive(entity.data, path, version);
          return {
            key,
            label: SEGMENT_LABELS[key] || key,
            value: isFiniteNumber(resolved.value) ? resolved.value : null,
            period: resolved.year,
          };
        });
      },
      getObservation(entity, version = "latest") {
        const values = this.getComposition(entity, version).map((item) => item.value).filter(isFiniteNumber);
        return values.length ? observationFromValue(values.reduce((sum, value) => sum + value, 0), "", "derived") : missingObservation();
      },
    }));
  }

  function resolveWorldPrimitive(data, path, version = "latest", options = {}) {
    const referenceValue = getPath(data, path);
    const container = versionContainerForPath(path);
    let latestValue;
    let latestYear;
    if (container) {
      const rest = path.slice(container.length + 1);
      latestValue = getPath(data, `${container}.latest.${rest}`);
      latestYear = getPath(data, `${container}.latest.year`);
    }
    if (version === "latest" && isFiniteNumber(latestValue)) {
      return { value: latestValue, year: latestYear, versionResolved: "latestAvailable" };
    }
    if (options.noFallback && version === "latest") return { value: null, year: null, versionResolved: "missing" };
    const year = container ? getPath(data, `${container}.year`) : findNearestYear(data, path);
    return {
      value: isFiniteNumber(referenceValue) ? referenceValue : null,
      year,
      versionResolved: version === "latest" ? "referenceFallback" : "reference",
    };
  }

  function versionContainerForPath(path) {
    if (path.startsWith("populationStructure.")) return "populationStructure";
    if (path.startsWith("economy.industry.")) return "economy.industry";
    const energyMatch = path.match(/^energy\.([^.]+)\./);
    if (energyMatch) return `energy.${energyMatch[1]}`;
    return null;
  }

  function findNearestYear(data, path) {
    const segments = path.split(".");
    while (segments.length) {
      segments.pop();
      const value = getPath(data, [...segments, "year"]);
      if (value != null) return value;
    }
    return "";
  }

  function sourceKeyForWorldPath(path) {
    if (path.startsWith("populationStructure.density")) return WORLD_SOURCE_KEYS.populationDensity;
    if (path.startsWith("populationStructure")) return WORLD_SOURCE_KEYS.populationStructure;
    if (path.startsWith("migration.refugee")) return WORLD_SOURCE_KEYS.refugees;
    if (path.startsWith("migration")) return WORLD_SOURCE_KEYS.migration;
    if (path.includes("agriculture.land")) return WORLD_SOURCE_KEYS.agriculturalLand;
    if (path.includes("crops.trade")) return WORLD_SOURCE_KEYS.cropTrade;
    if (path.includes("crops.use")) return WORLD_SOURCE_KEYS.cropUse;
    if (path.includes("agriculture.crops")) return WORLD_SOURCE_KEYS.cropProduction;
    if (path.includes("livestock")) return WORLD_SOURCE_KEYS.livestock;
    if (path.startsWith("energy.consumption")) return WORLD_SOURCE_KEYS.energyConsumption;
    if (path.startsWith("energy.electricity")) return WORLD_SOURCE_KEYS.electricity;
    if (path.startsWith("energy.fossilProduction")) return WORLD_SOURCE_KEYS.fossilProduction;
    if (path.startsWith("energy.fossilTrade")) return WORLD_SOURCE_KEYS.fossilTrade;
    if (path.includes("economy.gdp")) return WORLD_SOURCE_KEYS.gdp;
    if (path.includes("economy.exports")) return WORLD_SOURCE_KEYS.exports;
    if (path.includes("economy.industry")) return WORLD_SOURCE_KEYS.industry;
    if (path.startsWith("religion2020")) return WORLD_SOURCE_KEYS.religion;
    return WORLD_SOURCE_KEYS.population;
  }

  function sourceFromWorldMeta(meta, sourceKey) {
    const source = meta?.sources?.[sourceKey] || {};
    return { name: source.label || "저장된 원천 자료", url: source.url || "" };
  }

  function buildKoreaCatalog(level) {
    const regionsById = window.KOREA_GEO_STATS_REGIONS?.[level] || {};
    const order = window.KOREA_GEO_STATS_REGION_ORDER?.[level] || Object.keys(regionsById);
    const rawMetrics = window.KOREA_GEO_STATS_METRICS?.[level] || {};
    const entities = order
      .filter((id) => regionsById[id])
      .map((id) => ({
        id: `korea:${level}:${id}`,
        rawId: id,
        label: regionsById[id].shortLabel || regionsById[id].label || id,
        secondaryLabel: regionsById[id].label || "",
        data: regionsById[id],
        meta: { level },
      }));

    const metrics = Object.values(rawMetrics).map((raw) => {
      const hasMultiplePeriods = Object.values(raw.seriesByRegion || {}).some((rows) =>
        Array.isArray(rows) && rows.filter((row) => isFiniteNumber(row?.value)).length > 1
      );
      const coverage = Object.values(raw.latestByRegion || {}).filter((row) => isFiniteNumber(row?.value)).length;
      return {
        id: `korea:${level}:${raw.key}`,
        rawKey: raw.key,
        scope: "korea",
        category: raw.category || "multiple",
        categoryLabel: raw.categoryLabel || CATEGORY_LABELS[raw.category] || "기타",
        label: raw.label,
        description: raw.description || "KOSIS e-지방지표의 지역별 저장값임.",
        unit: raw.unit || "",
        decimals: Number.isInteger(raw.decimals) ? raw.decimals : 1,
        kind: hasMultiplePeriods ? "series" : "scalar",
        canBeNegative: Boolean(raw.canBeNegative),
        coverage,
        capabilities: ["rank", ...(hasMultiplePeriods ? ["compare", "timeseries"] : []), "scatter", "table"],
        source: {
          name: raw.sourceText || raw.sourceName || "KOSIS e-지방지표",
          url: raw.statTableUrl || raw.pageUrl || "",
        },
        getObservation(entity) {
          const record = raw.latestByRegion?.[entity.rawId];
          if (!record || !isFiniteNumber(record.value)) {
            return missingObservation(record && record.value === null ? "원천 공란" : "미수록");
          }
          return observationFromValue(record.value, record.periodLabel || record.periodKey, "latestAvailable");
        },
        getSeries(entity) {
          return (raw.seriesByRegion?.[entity.rawId] || []).map((row) => ({
            period: String(row.periodKey ?? row.periodLabel ?? ""),
            periodLabel: String(row.periodLabel ?? row.periodKey ?? ""),
            value: isFiniteNumber(row.value) ? row.value : null,
            status: isFiniteNumber(row.value) ? "ok" : "missing",
          }));
        },
        getComparison(entity) {
          const rows = raw.seriesByRegion?.[entity.rawId] || [];
          const valid = rows.filter((row) => isFiniteNumber(row?.value));
          const explicitLatest = raw.latestByRegion?.[entity.rawId];
          return {
            reference: valid.length
              ? observationFromValue(valid[0].value, valid[0].periodLabel || valid[0].periodKey, "reference")
              : missingObservation(),
            latest: explicitLatest && isFiniteNumber(explicitLatest.value)
              ? observationFromValue(explicitLatest.value, explicitLatest.periodLabel || explicitLatest.periodKey, "latestAvailable")
              : missingObservation(explicitLatest?.value === null ? "원천 공란" : "최신값 없음"),
          };
        },
      };
    }).sort((a, b) => `${a.categoryLabel}|${a.label}`.localeCompare(`${b.categoryLabel}|${b.label}`, "ko"));

    const defaultMetric = metrics.find((metric) => metric.rawKey === "resident-population") || metrics[0];
    return {
      key: `korea:${level}`,
      scopeLabel: level === "provinces" ? "한국 시도" : level === "cities" ? "한국 시군" : "특·광역시 구군",
      eyebrow: `KOREA · ${level === "provinces" ? "PROVINCE" : level === "cities" ? "CITY" : "DISTRICT"}`,
      entities,
      metrics,
      defaultMetricId: defaultMetric?.id,
      defaultChartType: "rank",
      meta: window.KOREA_GEO_STATS_META || {},
    };
  }

  function buildClimateCatalog(dataset) {
    const isWorld = dataset === "world";
    const raw = isWorld ? window.CLIMATE_DATA : window.KOREA_CLIMATE_DATA;
    const regions = raw?.regions || [];
    const entities = regions.map((region, index) => ({
      id: `${isWorld ? "world-climate" : "korea-climate"}:${region.id || region.stationId || index}`,
      rawId: region.id || String(region.stationId || index),
      label: region.name || region.officialName || `지점 ${index + 1}`,
      secondaryLabel: isWorld
        ? [region.country, region.climateCode, region.classificationReview?.status === "review-required" ? "분류 검토" : ""].filter(Boolean).join(" · ")
        : [region.nation, region.zone, region.observationNetwork].filter(Boolean).join(" · "),
      data: region,
      meta: {
        source: region.source,
        reviewRequired: region.classificationReview?.status === "review-required",
      },
    })).sort((a, b) => a.label.localeCompare(b.label, "ko"));

    const specs = [
      {
        id: "temperature", label: "월평균 기온", annualLabel: "연평균 기온",
        unit: "℃", decimals: 1, annualKey: "annualMeanTemperatureC", monthlyKey: "monthlyTemperatureC", canBeNegative: true,
      },
      {
        id: "precipitation", label: "월 강수량", annualLabel: "연 강수량",
        unit: "mm", decimals: 1, annualKey: "annualPrecipitationMm", monthlyKey: "monthlyPrecipitationMm", canBeNegative: false,
      },
    ];
    if (!isWorld) {
      specs.push(
        {
          id: "cold-days", label: "일최저기온 0℃ 미만 일수", annualLabel: "연간 일최저기온 0℃ 미만 일수",
          unit: "일", decimals: 1, annualKey: "annualColdDaysBelowZero", monthlyKey: "monthlyColdDaysBelowZero", canBeNegative: false,
        },
        {
          id: "hot-nights", label: "일최저기온 25℃ 이상 일수", annualLabel: "연간 일최저기온 25℃ 이상 일수",
          unit: "일", decimals: 1, annualKey: "annualHotDaysAboveTwentyFiveMin", monthlyKey: "monthlyHotDaysAboveTwentyFiveMin", canBeNegative: false,
        }
      );
    }

    const source = isWorld
      ? { name: "JMA 세계 평년값 · Open-Meteo 보완", url: raw.sources?.find((item) => item.type === "jma")?.url || "" }
      : { name: raw.summary?.sourceLabel || "기상청 기후평년값", url: "https://data.kma.go.kr/normals/table.do" };
    const metrics = specs.map((spec) => ({
      id: `climate:${dataset}:${spec.id}`,
      scope: "climate",
      category: "climate",
      categoryLabel: "기후",
      label: spec.annualLabel,
      description: `${raw.summary?.period || "1991-2020"} 월별 평년값과 연간 요약을 함께 탐색함.`,
      unit: spec.unit,
      decimals: spec.decimals,
      kind: "series",
      canBeNegative: spec.canBeNegative,
      capabilities: ["rank", "timeseries", "scatter", "table"],
      source,
      getObservation(entity) {
        return observationFromValue(entity.data[spec.annualKey], raw.summary?.period || "1991-2020", "normalPeriod");
      },
      getSeries(entity) {
        const months = entity.data.months || raw.months || Array.from({ length: 12 }, (_, index) => `${index + 1}월`);
        const values = entity.data[spec.monthlyKey] || [];
        return months.map((month, index) => ({
          period: String(index + 1).padStart(2, "0"),
          periodLabel: month,
          value: isFiniteNumber(values[index]) ? values[index] : null,
        }));
      },
    }));

    return {
      key: `climate:${dataset}`,
      scopeLabel: isWorld ? "세계 기후 지점" : "한반도 기후 지점",
      eyebrow: isWorld ? "CLIMATE · WORLD" : "CLIMATE · KOREA",
      entities,
      metrics,
      defaultMetricId: metrics[0]?.id,
      defaultChartType: "rank",
      meta: raw.summary || {},
    };
  }

  function refreshCategoryPicker() {
    const catalog = cache.currentCatalog;
    if (!catalog) return;
    const categories = uniqueBy(
      catalog.metrics.map((metric) => ({ key: metric.category, label: metric.categoryLabel || CATEGORY_LABELS[metric.category] || "기타" })),
      (item) => item.key
    ).sort((a, b) => a.label.localeCompare(b.label, "ko"));
    dom.categorySelect.innerHTML = [
      `<option value="all">전체 분류 (${catalog.metrics.length})</option>`,
      ...categories.map((item) => {
        const count = catalog.metrics.filter((metric) => metric.category === item.key).length;
        return `<option value="${escapeHtml(item.key)}">${escapeHtml(item.label)} (${count})</option>`;
      }),
    ].join("");
    dom.categorySelect.value = state.category;
  }

  function refreshMetricPicker(options = {}) {
    const catalog = cache.currentCatalog;
    if (!catalog) return;
    const query = normalizeSearch(state.metricSearch);
    const filtered = catalog.metrics.filter((metric) => {
      if (state.category !== "all" && metric.category !== state.category) return false;
      if (!query) return true;
      return normalizeSearch([metric.label, metric.categoryLabel, metric.description, metric.source?.name].join(" ")).includes(query);
    });

    if (!filtered.some((metric) => metric.id === state.metricId)) {
      if (options.chooseFirst || !state.metricId) state.metricId = filtered[0]?.id || null;
    }
    dom.metricSelect.innerHTML = filtered.length
      ? filtered.map((metric) => `<option value="${escapeHtml(metric.id)}">${escapeHtml(metric.label)}</option>`).join("")
      : `<option value="">일치하는 지표 없음</option>`;
    if (filtered.some((metric) => metric.id === state.metricId)) dom.metricSelect.value = state.metricId;
    else if (filtered[0]) {
      state.metricId = filtered[0].id;
      dom.metricSelect.value = state.metricId;
    }
    updateModeControls();
    renderAllForMetric();
  }

  function selectMetric(metricId, options = {}) {
    const metric = cache.currentCatalog?.metrics.find((item) => item.id === metricId);
    if (!metric) return;
    state.metricId = metricId;
    if (metric.category !== state.category && state.category !== "all") {
      state.category = "all";
      dom.categorySelect.value = "all";
      refreshMetricPicker({ chooseFirst: false });
      return;
    }
    dom.metricSelect.value = metricId;
    const capabilities = metric.capabilities || ["rank", "table"];
    if (!capabilities.includes(state.chartType)) {
      state.chartType = capabilities.includes("rank") ? "rank" : capabilities[0];
    }
    updateModeControls();
    renderAllForMetric();
    if (options.scroll) document.querySelector(".explorer-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function currentMetric() {
    return cache.currentCatalog?.metrics.find((metric) => metric.id === state.metricId) || null;
  }

  function updateModeControls() {
    const metric = currentMetric();
    if (!metric) return;
    const capabilities = metric.capabilities || ["rank", "table"];
    for (const option of dom.chartTypeSelect.options) {
      option.disabled = !capabilities.includes(option.value);
    }
    if (!capabilities.includes(state.chartType)) {
      state.chartType = capabilities[0] || "table";
    }
    dom.chartTypeSelect.value = state.chartType;
    dom.versionField.hidden = state.scope !== "world" || !metric.hasLatest;
    dom.secondaryMetricField.hidden = state.chartType !== "scatter";
    dom.rankingFields.hidden = state.chartType === "composition";
    refreshSecondaryMetricPicker(metric);
  }

  function refreshSecondaryMetricPicker(metric) {
    const previous = dom.secondaryMetricSelect.value;
    const compatible = (cache.currentCatalog?.metrics || []).filter((candidate) =>
      candidate.id !== metric.id && candidate.capabilities?.includes("scatter") && typeof candidate.getObservation === "function"
    );
    dom.secondaryMetricSelect.innerHTML = compatible
      .map((candidate) => `<option value="${escapeHtml(candidate.id)}">${escapeHtml(candidate.label)} (${escapeHtml(candidate.unit || "단위 없음")})</option>`)
      .join("");
    if (compatible.some((candidate) => candidate.id === previous)) dom.secondaryMetricSelect.value = previous;
    else {
      const sameUnit = compatible.find((candidate) => candidate.unit === metric.unit);
      if (sameUnit) dom.secondaryMetricSelect.value = sameUnit.id;
    }
  }

  function renderAllForMetric() {
    if (!currentMetric()) return;
    renderEntityList();
    renderChart();
    renderMetricLibrary();
  }

  function renderEntityList() {
    const metric = currentMetric();
    const catalog = cache.currentCatalog;
    if (!metric || !catalog) return;
    const query = normalizeSearch(dom.entitySearch.value);
    const entities = catalog.entities.filter((entity) =>
      !query || normalizeSearch(`${entity.label} ${entity.secondaryLabel || ""}`).includes(query)
    );
    const rows = entities.slice(0, 260).map((entity) => {
      const observation = safeObservation(metric, entity);
      const checked = state.selectedEntityIds.has(entity.id);
      const value = observation.status === "ok" ? formatValue(observation.value, metric, { compact: true }) : "—";
      return `<label class="entity-option">
        <input type="checkbox" data-entity-id="${escapeHtml(entity.id)}" ${checked ? "checked" : ""} />
        <span>${escapeHtml(entity.label)}${entity.secondaryLabel ? `<small> · ${escapeHtml(entity.secondaryLabel)}</small>` : ""}</span>
        <span>${escapeHtml(value)}</span>
      </label>`;
    });
    dom.entityList.innerHTML = rows.length ? rows.join("") : `<p class="empty-state">일치하는 대상이 없음.</p>`;
  }

  function renderChart() {
    const metric = currentMetric();
    const catalog = cache.currentCatalog;
    if (!metric || !catalog) return;
    const entities = chooseDisplayEntities(metric);
    const labels = buildEntityLabels(entities);
    let result;
    if (state.chartType === "compare") result = renderCompareChart(metric, entities, labels);
    else if (state.chartType === "timeseries") result = renderTimeSeriesChart(metric, entities, labels);
    else if (state.chartType === "composition") result = renderCompositionChart(metric, entities, labels);
    else if (state.chartType === "scatter") result = renderScatterChart(metric, entities, labels);
    else if (state.chartType === "table") result = renderDataTable(metric, entities, labels);
    else result = renderRankChart(metric, entities, labels);

    dom.chartSurface.classList.toggle("is-table", state.chartType === "table");
    dom.chartSurface.replaceChildren(result.node);
    cache.currentExport = { ...result, metric };
    dom.downloadSvgButton.disabled = !(result.node instanceof SVGElement);
    dom.downloadCsvButton.disabled = !result.rows?.length;

    dom.chartEyebrow.textContent = `${catalog.eyebrow} · ${state.version === "latest" ? "LATEST AVAILABLE" : "REFERENCE"}`;
    dom.chartHeading.textContent = metric.label;
    dom.chartMeta.textContent = [chartTypeLabel(state.chartType), metric.unit ? `단위: ${metric.unit}` : "", result.periodSummary]
      .filter(Boolean).join(" · ");
    dom.chartStatus.textContent = result.status || `${entities.length}개 대상 표시`;
    renderAnswerKey(entities, labels);
    const sourceAttribution = deriveSourceAttribution(metric, entities);
    if (sourceAttribution) {
      result.sourceName = sourceAttribution.name;
      result.sourceUrl = sourceAttribution.url;
    }
    updateSourcePanel(metric, result);
  }

  function chooseDisplayEntities(metric) {
    const catalog = cache.currentCatalog;
    const selected = catalog.entities.filter((entity) => state.selectedEntityIds.has(entity.id));
    if (selected.length) {
      const maximum = state.chartType === "timeseries" ? 8 : state.chartType === "composition" ? 14 : 40;
      return selected.slice(0, maximum);
    }

    const scored = catalog.entities.map((entity) => ({ entity, observation: safeObservation(metric, entity) }));
    let available = scored.filter((item) => item.observation.status === "ok");
    if (state.sort === "name") available.sort((a, b) => a.entity.label.localeCompare(b.entity.label, "ko"));
    else available.sort((a, b) => {
      const difference = a.observation.value - b.observation.value;
      return state.sort === "asc" ? difference : -difference;
    });
    const maximum = state.chartType === "timeseries" ? Math.min(6, state.limit)
      : state.chartType === "composition" ? Math.min(10, state.limit)
        : state.chartType === "scatter" ? Math.min(40, Math.max(state.limit, 20))
          : state.limit;
    return available.slice(0, maximum).map((item) => item.entity);
  }

  function safeObservation(metric, entity, version = state.version) {
    if (typeof metric.getObservation !== "function") return missingObservation();
    try {
      const value = metric.getObservation(entity, version);
      if (!value || !isFiniteNumber(value.value)) return { ...missingObservation(value?.missingReason), ...value, status: "missing" };
      return { status: "ok", ...value };
    } catch (error) {
      console.warn("지표 관측값 처리 실패", metric.id, entity.id, error);
      return missingObservation("처리 오류");
    }
  }

  function buildEntityLabels(entities) {
    const map = new Map();
    entities.forEach((entity, index) => {
      map.set(entity.id, state.anonymize ? anonymousLabel(index) : entity.label);
    });
    return map;
  }

  function renderAnswerKey(entities, labels) {
    if (!state.anonymize || !entities.length) {
      dom.answerKey.hidden = true;
      dom.answerKey.textContent = "";
      return;
    }
    dom.answerKey.hidden = false;
    dom.answerKey.textContent = entities.map((entity) => `${labels.get(entity.id)} ${entity.label}`).join(" · ");
  }

  function updateSourcePanel(metric, result) {
    dom.sourcePeriod.textContent = result.periodSummary || "국가·지역별 최신 가용 시점";
    dom.sourceName.textContent = result.sourceName || metric.source?.name || "저장된 원천 자료";
    const sourceUrl = result.sourceUrl || metric.source?.url;
    if (sourceUrl) {
      dom.sourceLink.href = sourceUrl;
      dom.sourceLink.hidden = false;
    } else {
      dom.sourceLink.hidden = true;
      dom.sourceLink.removeAttribute("href");
    }
  }

  function deriveSourceAttribution(metric, entities) {
    if (state.scope !== "climate" || state.climateDataset !== "world") return null;
    const metrics = [metric];
    if (state.chartType === "scatter") {
      const secondary = cache.currentCatalog?.metrics.find((candidate) => candidate.id === dom.secondaryMetricSelect.value);
      if (secondary) metrics.push(secondary);
    }
    const variables = metrics.map((candidate) => candidate.id.endsWith(":temperature") ? "temperature"
      : candidate.id.endsWith(":precipitation") ? "precipitation" : null).filter(Boolean);
    if (!variables.length) return null;
    const sourceTypes = new Set();
    for (const entity of entities) {
      const source = entity.data?.source || {};
      for (const variable of variables) {
        const variableSource = source.variableSources?.[variable] || source.type;
        if (variableSource) sourceTypes.add(variableSource);
      }
    }
    if (!sourceTypes.size) return null;
    const sourceRows = window.CLIMATE_DATA?.sources || [];
    if (sourceTypes.size === 1) {
      const type = [...sourceTypes][0];
      const source = sourceRows.find((row) => row.type === type) || {};
      return {
        name: source.label || (type === "jma" ? "JMA 세계 지점별 평년값" : "Open-Meteo Historical Weather API"),
        url: source.url || "",
      };
    }
    return {
      name: "JMA 세계 지점별 평년값 / Open-Meteo Historical Weather API",
      url: "",
    };
  }

  function renderRankChart(metric, entities, labels) {
    if (!entities.length) return emptyChartResult("표시 가능한 값이 없음.");
    const data = entities.map((entity) => ({ entity, label: labels.get(entity.id), observation: safeObservation(metric, entity) }));
    const validValues = data.map((item) => item.observation.value).filter(isFiniteNumber);
    if (!validValues.length) return emptyChartResult("선택한 대상에 값이 없음.");

    const width = 900;
    const margin = { top: 40, right: 160, bottom: 42, left: 190 };
    const rowHeight = 34;
    const height = Math.max(300, margin.top + margin.bottom + data.length * rowHeight);
    const svg = createSvg(width, height, `${metric.label} 순위 막대그래프`);
    const domain = valueDomain(validValues, metric.canBeNegative);
    const scale = linearScale(domain[0], domain[1], margin.left, width - margin.right);
    const zeroX = scale(0);
    appendHorizontalAxis(svg, domain, scale, height - margin.bottom, margin, width, metric);
    svg.appendChild(svgEl("line", {
      x1: zeroX, y1: margin.top - 8, x2: zeroX, y2: height - margin.bottom,
      stroke: "#111", "stroke-width": 1,
    }));

    data.forEach((item, index) => {
      const y = margin.top + index * rowHeight + 5;
      const value = item.observation.value;
      svg.appendChild(svgText(margin.left - 12, y + 12, item.label, {
        "text-anchor": "end", "font-size": 12, "font-weight": 600,
      }));
      if (!isFiniteNumber(value)) {
        svg.appendChild(svgText(zeroX + 8, y + 12, "—", { "font-size": 11, fill: "#777" }));
        return;
      }
      const valueX = scale(value);
      const x = Math.min(zeroX, valueX);
      const barWidth = Math.max(1, Math.abs(valueX - zeroX));
      svg.appendChild(svgEl("rect", {
        x, y, width: barWidth, height: 18,
        fill: value < 0 ? "url(#stats-hatch)" : "#111",
        stroke: "#111", "stroke-width": 0.7,
      }));
      const labelX = value < 0 ? x - 7 : x + barWidth + 7;
      svg.appendChild(svgText(labelX, y + 12, `${formatValue(value, metric)}${item.observation.period ? ` · ${item.observation.period}` : ""}`, {
        "text-anchor": value < 0 ? "end" : "start", "font-size": 10.5, fill: "#333",
      }));
    });

    const rows = data.map((item) => ({
      대상: item.entity.label,
      값: isFiniteNumber(item.observation.value) ? item.observation.value : "",
      단위: metric.unit || "",
      시점: item.observation.period || "",
      상태: item.observation.status === "ok" ? "수록" : item.observation.missingReason || "결측",
    }));
    const periods = data.map((item) => item.observation.period);
    const missing = data.filter((item) => item.observation.status !== "ok").length;
    return {
      node: svg,
      rows,
      filename: `${slugify(metric.label)}_rank`,
      periodSummary: summarizePeriods(periods),
      status: `${data.length}개 표시${missing ? ` · 결측 ${missing}개(0으로 대체하지 않음)` : ""}`,
    };
  }

  function renderCompareChart(metric, entities, labels) {
    if (!entities.length || typeof metric.getComparison !== "function") {
      return emptyChartResult("이 지표에는 비교 가능한 기준값과 최신값이 없음.");
    }
    const data = entities.map((entity) => {
      const comparison = metric.getComparison(entity) || {};
      return {
        entity,
        label: labels.get(entity.id),
        reference: normalizeObservation(comparison.reference),
        latest: normalizeObservation(comparison.latest),
      };
    });
    const values = data.flatMap((item) => [item.reference.value, item.latest.value]).filter(isFiniteNumber);
    if (!values.length) return emptyChartResult("선택한 대상에 비교 가능한 값이 없음.");

    const width = 900;
    const margin = { top: 58, right: 155, bottom: 42, left: 190 };
    const rowHeight = 48;
    const height = Math.max(340, margin.top + margin.bottom + data.length * rowHeight);
    const svg = createSvg(width, height, `${metric.label} 기준값과 최신값 비교`);
    appendCompareLegend(svg, width - margin.right - 180, 18);
    const domain = valueDomain(values, metric.canBeNegative);
    const scale = linearScale(domain[0], domain[1], margin.left, width - margin.right);
    const zeroX = scale(0);
    appendHorizontalAxis(svg, domain, scale, height - margin.bottom, margin, width, metric);
    svg.appendChild(svgEl("line", {
      x1: zeroX, y1: margin.top - 8, x2: zeroX, y2: height - margin.bottom,
      stroke: "#111", "stroke-width": 1,
    }));

    data.forEach((item, index) => {
      const centerY = margin.top + index * rowHeight + 15;
      svg.appendChild(svgText(margin.left - 12, centerY + 2, item.label, {
        "text-anchor": "end", "font-size": 12, "font-weight": 600,
      }));
      drawCompareBar(svg, item.reference, centerY - 11, "url(#stats-hatch)", scale, zeroX, metric, width - margin.right);
      drawCompareBar(svg, item.latest, centerY + 6, "#111", scale, zeroX, metric, width - margin.right);
    });

    const rows = data.map((item) => ({
      대상: item.entity.label,
      기준값: isFiniteNumber(item.reference.value) ? item.reference.value : "",
      기준시점: item.reference.period || "",
      최신값: isFiniteNumber(item.latest.value) ? item.latest.value : "",
      최신시점: item.latest.period || "",
      단위: metric.unit || "",
    }));
    const periods = data.flatMap((item) => [item.reference.period, item.latest.period]);
    const missingLatest = data.filter((item) => item.latest.status !== "ok").length;
    return {
      node: svg,
      rows,
      filename: `${slugify(metric.label)}_reference_latest`,
      periodSummary: summarizePeriods(periods),
      status: `${data.length}개 비교${missingLatest ? ` · 최신값 미수록 ${missingLatest}개` : ""}`,
    };
  }

  function drawCompareBar(svg, observation, y, fill, scale, zeroX, metric, chartRight) {
    if (!isFiniteNumber(observation.value)) {
      svg.appendChild(svgText(zeroX + 7, y + 9, "—", { "font-size": 10, fill: "#777" }));
      return;
    }
    const valueX = scale(observation.value);
    const x = Math.min(zeroX, valueX);
    const width = Math.max(1, Math.abs(valueX - zeroX));
    svg.appendChild(svgEl("rect", {
      x, y, width, height: 11, fill, stroke: "#111", "stroke-width": 0.65,
    }));
    let textX = observation.value < 0 ? x - 6 : x + width + 6;
    let anchor = observation.value < 0 ? "end" : "start";
    if (textX > chartRight + 82) {
      textX = chartRight + 82;
      anchor = "end";
    }
    svg.appendChild(svgText(textX, y + 9, `${formatValue(observation.value, metric)}${observation.period ? ` · ${observation.period}` : ""}`, {
      "text-anchor": anchor, "font-size": 9.5, fill: "#333",
    }));
  }

  function appendCompareLegend(svg, x, y) {
    svg.appendChild(svgEl("rect", { x, y, width: 15, height: 10, fill: "url(#stats-hatch)", stroke: "#111", "stroke-width": 0.6 }));
    svg.appendChild(svgText(x + 21, y + 9, "기준", { "font-size": 10 }));
    svg.appendChild(svgEl("rect", { x: x + 68, y, width: 15, height: 10, fill: "#111" }));
    svg.appendChild(svgText(x + 89, y + 9, "최신 가용", { "font-size": 10 }));
  }

  function renderTimeSeriesChart(metric, entities, labels) {
    if (!entities.length || typeof metric.getSeries !== "function") {
      return emptyChartResult("이 지표에는 시계열이 없음.");
    }
    const data = entities.map((entity) => ({
      entity,
      label: labels.get(entity.id),
      series: (metric.getSeries(entity) || []).map((point) => ({
        ...point,
        period: String(point.period ?? point.periodLabel ?? ""),
        periodLabel: String(point.periodLabel ?? point.period ?? ""),
        value: isFiniteNumber(point.value) ? point.value : null,
      })),
    })).filter((item) => item.series.some((point) => isFiniteNumber(point.value)));
    if (!data.length) return emptyChartResult("선택한 대상에 시계열 값이 없음.");

    const periods = uniqueBy(
      data.flatMap((item) => item.series.map((point) => ({ key: point.period, label: point.periodLabel }))),
      (item) => item.key
    ).sort((a, b) => periodSortKey(a.key) - periodSortKey(b.key));
    const values = data.flatMap((item) => item.series.map((point) => point.value)).filter(isFiniteNumber);
    const width = 900;
    const height = 540;
    const margin = { top: 38, right: 38, bottom: 110, left: 88 };
    const svg = createSvg(width, height, `${metric.label} 시계열`);
    const domain = paddedDomain(values, metric.canBeNegative);
    const xScale = (period) => {
      const index = Math.max(0, periods.findIndex((item) => item.key === String(period)));
      if (periods.length <= 1) return margin.left;
      return margin.left + index / (periods.length - 1) * (width - margin.left - margin.right);
    };
    const yScale = linearScale(domain[0], domain[1], height - margin.bottom, margin.top);
    appendTimeSeriesAxes(svg, periods, xScale, domain, yScale, width, height, margin, metric);

    const lineStyles = ["", "5 3", "2 2", "8 3 2 3", "10 4", "1 3", "6 2 1 2", "12 3"];
    data.forEach((item, index) => {
      const style = lineStyles[index % lineStyles.length];
      let path = "";
      let penDown = false;
      for (const point of item.series) {
        if (!isFiniteNumber(point.value)) {
          penDown = false;
          continue;
        }
        const x = xScale(point.period);
        const y = yScale(point.value);
        path += `${penDown ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)} `;
        penDown = true;
      }
      svg.appendChild(svgEl("path", {
        d: path.trim(), fill: "none", stroke: index % 3 === 0 ? "#111" : index % 3 === 1 ? "#555" : "#999",
        "stroke-width": index < 3 ? 1.7 : 1.35, "stroke-dasharray": style,
      }));
      for (const point of item.series) {
        if (!isFiniteNumber(point.value)) continue;
        const circle = svgEl("circle", {
          cx: xScale(point.period), cy: yScale(point.value), r: 2.3,
          fill: index % 3 === 0 ? "#111" : index % 3 === 1 ? "#555" : "#999",
        });
        circle.appendChild(svgEl("title", {}, `${item.label} · ${point.periodLabel}: ${formatValue(point.value, metric)}`));
        svg.appendChild(circle);
      }
    });
    appendLineLegend(svg, data, lineStyles, margin.left, height - 64, width - margin.left - margin.right);

    const rows = data.flatMap((item) => item.series.map((point) => ({
      대상: item.entity.label,
      시점: point.periodLabel,
      값: isFiniteNumber(point.value) ? point.value : "",
      단위: metric.unit || "",
      상태: isFiniteNumber(point.value) ? "수록" : "결측",
    })));
    const missing = rows.filter((row) => row.상태 === "결측").length;
    return {
      node: svg,
      rows,
      filename: `${slugify(metric.label)}_timeseries`,
      periodSummary: summarizePeriods(periods.map((item) => item.label)),
      status: `${data.length}개 대상 · ${periods.length}개 시점${missing ? ` · 결측 ${missing}점` : ""}`,
    };
  }

  function appendLineLegend(svg, data, lineStyles, startX, startY, availableWidth) {
    const itemWidth = Math.max(120, Math.min(210, availableWidth / Math.min(4, data.length)));
    data.forEach((item, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const x = startX + column * itemWidth;
      const y = startY + row * 23;
      svg.appendChild(svgEl("line", {
        x1: x, y1: y, x2: x + 24, y2: y,
        stroke: index % 3 === 0 ? "#111" : index % 3 === 1 ? "#555" : "#999",
        "stroke-width": 1.6, "stroke-dasharray": lineStyles[index % lineStyles.length],
      }));
      svg.appendChild(svgText(x + 31, y + 4, truncateText(item.label, 18), { "font-size": 10 }));
    });
  }

  function renderCompositionChart(metric, entities, labels) {
    if (!entities.length || typeof metric.getComposition !== "function") {
      return emptyChartResult("이 지표에는 구성비 데이터가 없음.");
    }
    const data = entities.map((entity) => ({
      entity,
      label: labels.get(entity.id),
      components: (metric.getComposition(entity, state.version) || []).map((component) => ({
        ...component,
        value: isFiniteNumber(component.value) ? component.value : null,
      })),
    })).filter((item) => item.components.some((component) => isFiniteNumber(component.value)));
    if (!data.length) return emptyChartResult("선택한 대상에 구성비 값이 없음.");

    const componentKeys = uniqueBy(
      data.flatMap((item) => item.components.map((component) => ({ key: component.key, label: component.label }))),
      (item) => item.key
    );
    const sums = data.map((item) => item.components.reduce((sum, component) => sum + (isFiniteNumber(component.value) ? component.value : 0), 0));
    const domainMax = Math.max(100, ...sums);
    const legendRows = Math.ceil(componentKeys.length / 4);
    const width = 900;
    const margin = { top: 48, right: 45, bottom: Math.max(95, 55 + legendRows * 23), left: 180 };
    const rowHeight = 38;
    const height = Math.max(350, margin.top + margin.bottom + data.length * rowHeight);
    const svg = createSvg(width, height, `${metric.label} 구성비`);
    const scale = linearScale(0, domainMax, margin.left, width - margin.right);
    appendHorizontalAxis(svg, [0, domainMax], scale, height - margin.bottom, margin, width, { ...metric, unit: "%" });

    data.forEach((item, rowIndex) => {
      const y = margin.top + rowIndex * rowHeight;
      svg.appendChild(svgText(margin.left - 12, y + 17, item.label, {
        "text-anchor": "end", "font-size": 12, "font-weight": 600,
      }));
      let cursor = 0;
      for (const component of item.components) {
        if (!isFiniteNumber(component.value)) continue;
        const x = scale(cursor);
        const nextX = scale(cursor + component.value);
        const patternIndex = componentKeys.findIndex((candidate) => candidate.key === component.key);
        const fill = HATCH_PATTERNS[patternIndex % HATCH_PATTERNS.length].fill;
        const rect = svgEl("rect", {
          x, y, width: Math.max(0, nextX - x), height: 23,
          fill, stroke: "#111", "stroke-width": 0.65,
        });
        rect.appendChild(svgEl("title", {}, `${item.label} · ${component.label}: ${formatNumber(component.value, metric.decimals)}%`));
        svg.appendChild(rect);
        if (nextX - x > 42) {
          const darkFill = ["#111", "#777"].includes(fill);
          svg.appendChild(svgText((x + nextX) / 2, y + 16, formatNumber(component.value, metric.decimals), {
            "text-anchor": "middle", "font-size": 9.5, fill: darkFill ? "#fff" : "#111",
          }));
        }
        cursor += component.value;
      }
      if (Math.abs(cursor - 100) >= 0.05) {
        svg.appendChild(svgText(width - margin.right + 5, y + 16, `합 ${formatNumber(cursor, 2)}`, { "font-size": 9.5, fill: "#666" }));
      }
    });
    appendCompositionLegend(svg, componentKeys, margin.left, height - legendRows * 23 - 12, width - margin.left - margin.right);

    const rows = data.flatMap((item) => item.components.map((component) => ({
      대상: item.entity.label,
      항목: component.label,
      비율: isFiniteNumber(component.value) ? component.value : "",
      단위: "%",
      시점: component.period || "",
      상태: isFiniteNumber(component.value) ? "수록" : "결측",
    })));
    const periods = data.flatMap((item) => item.components.map((component) => component.period));
    const partial = sums.filter((sum) => Math.abs(sum - 100) >= 0.05).length;
    return {
      node: svg,
      rows,
      filename: `${slugify(metric.label)}_composition`,
      periodSummary: summarizePeriods(periods),
      status: `${data.length}개 대상 · 원자료 비율 유지${partial ? ` · 합계가 100%와 다른 대상 ${partial}개` : ""}`,
    };
  }

  function appendCompositionLegend(svg, components, startX, startY, availableWidth) {
    const itemWidth = Math.max(110, Math.min(175, availableWidth / Math.min(4, components.length)));
    components.forEach((component, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const x = startX + column * itemWidth;
      const y = startY + row * 23;
      const fill = HATCH_PATTERNS[index % HATCH_PATTERNS.length].fill;
      svg.appendChild(svgEl("rect", { x, y: y - 9, width: 16, height: 11, fill, stroke: "#111", "stroke-width": 0.6 }));
      svg.appendChild(svgText(x + 22, y, truncateText(component.label, 16), { "font-size": 10 }));
    });
  }

  function renderScatterChart(metric, initialEntities, initialLabels) {
    const secondary = cache.currentCatalog.metrics.find((candidate) => candidate.id === dom.secondaryMetricSelect.value);
    if (!secondary) return emptyChartResult("세로축 지표를 선택해야 함.");
    const hasManualSelection = state.selectedEntityIds.size > 0;
    let entities = hasManualSelection ? initialEntities : cache.currentCatalog.entities;
    let data = entities.map((entity) => ({
      entity,
      x: safeObservation(metric, entity),
      y: safeObservation(secondary, entity),
    })).filter((item) => item.x.status === "ok" && item.y.status === "ok");
    if (!hasManualSelection) {
      data.sort((a, b) => state.sort === "asc" ? a.x.value - b.x.value : b.x.value - a.x.value);
      data = data.slice(0, Math.min(40, Math.max(state.limit, 20)));
    }
    entities = data.map((item) => item.entity);
    const labels = hasManualSelection ? initialLabels : buildEntityLabels(entities);
    data.forEach((item) => { item.label = labels.get(item.entity.id); });
    if (!data.length) return emptyChartResult("두 지표가 모두 수록된 공통 대상이 없음.");

    const width = 900;
    const height = 560;
    const margin = { top: 42, right: 58, bottom: 92, left: 92 };
    const xDomain = paddedDomain(data.map((item) => item.x.value), metric.canBeNegative);
    const yDomain = paddedDomain(data.map((item) => item.y.value), secondary.canBeNegative);
    const xScale = linearScale(xDomain[0], xDomain[1], margin.left, width - margin.right);
    const yScale = linearScale(yDomain[0], yDomain[1], height - margin.bottom, margin.top);
    const svg = createSvg(width, height, `${metric.label}과 ${secondary.label} 산점도`);
    appendScatterAxes(svg, xDomain, yDomain, xScale, yScale, width, height, margin, metric, secondary);

    data.forEach((item, index) => {
      const x = xScale(item.x.value);
      const y = yScale(item.y.value);
      const circle = svgEl("circle", {
        cx: x, cy: y, r: data.length <= 15 ? 4 : 3.2,
        fill: index % 2 ? "#777" : "#111", stroke: "#fff", "stroke-width": 0.7,
      });
      circle.appendChild(svgEl("title", {}, `${item.label}: ${formatValue(item.x.value, metric)} / ${formatValue(item.y.value, secondary)}`));
      svg.appendChild(circle);
      if (data.length <= 15) {
        svg.appendChild(svgText(x + 6, y - 6, item.label, { "font-size": 9.5, fill: "#333" }));
      }
    });

    const rows = data.map((item) => ({
      대상: item.entity.label,
      [`가로축_${metric.label}`]: item.x.value,
      가로축_시점: item.x.period || "",
      [`세로축_${secondary.label}`]: item.y.value,
      세로축_시점: item.y.period || "",
    }));
    return {
      node: svg,
      rows,
      filename: `${slugify(metric.label)}_${slugify(secondary.label)}_scatter`,
      periodSummary: summarizePeriods(data.flatMap((item) => [item.x.period, item.y.period])),
      status: `${data.length}개 공통 대상 · 축별 실제 시점은 CSV에 별도 기록`,
      sourceName: `${metric.source?.name || ""} / ${secondary.source?.name || ""}`,
      sourceUrl: metric.source?.url || secondary.source?.url || "",
    };
  }

  function renderDataTable(metric, entities, labels) {
    if (!entities.length) return emptyChartResult("표시 가능한 값이 없음.", { asTable: true });
    if (metric.kind === "composition" && typeof metric.getComposition === "function") {
      return renderCompositionDataTable(metric, entities, labels);
    }
    const data = entities.map((entity) => ({ entity, label: labels.get(entity.id), observation: safeObservation(metric, entity) }));
    const wrapper = document.createElement("div");
    wrapper.className = "stats-table-wrap";
    const table = document.createElement("table");
    table.className = "stats-table";
    table.innerHTML = `<thead><tr><th>대상</th><th>값</th><th>단위</th><th>시점</th><th>상태</th></tr></thead><tbody>${data.map((item) => {
      const observation = item.observation;
      return `<tr>
        <td>${escapeHtml(item.label)}</td>
        <td>${observation.status === "ok" ? escapeHtml(formatValue(observation.value, metric)) : "—"}</td>
        <td>${escapeHtml(metric.unit || "")}</td>
        <td>${escapeHtml(String(observation.period || "—"))}</td>
        <td>${observation.status === "ok" ? "수록" : escapeHtml(observation.missingReason || "결측")}</td>
      </tr>`;
    }).join("")}</tbody>`;
    wrapper.appendChild(table);
    const rows = data.map((item) => ({
      대상: item.entity.label,
      값: item.observation.status === "ok" ? item.observation.value : "",
      단위: metric.unit || "",
      시점: item.observation.period || "",
      상태: item.observation.status === "ok" ? "수록" : item.observation.missingReason || "결측",
    }));
    const missing = data.filter((item) => item.observation.status !== "ok").length;
    return {
      node: wrapper,
      rows,
      filename: `${slugify(metric.label)}_table`,
      periodSummary: summarizePeriods(data.map((item) => item.observation.period)),
      status: `${data.length}개 행${missing ? ` · 결측 ${missing}개는 —로 표시` : ""}`,
    };
  }

  function renderCompositionDataTable(metric, entities, labels) {
    const data = entities.flatMap((entity) => (metric.getComposition(entity, state.version) || []).map((component) => ({
      entity,
      label: labels.get(entity.id),
      component,
    })));
    if (!data.length) return emptyChartResult("선택한 대상에 구성비 값이 없음.", { asTable: true });
    const wrapper = document.createElement("div");
    wrapper.className = "stats-table-wrap";
    const table = document.createElement("table");
    table.className = "stats-table";
    table.innerHTML = `<thead><tr><th>대상</th><th>항목</th><th>비율</th><th>시점</th><th>상태</th></tr></thead><tbody>${data.map((item) => `<tr>
      <td>${escapeHtml(item.label)}</td>
      <td>${escapeHtml(item.component.label || item.component.key)}</td>
      <td>${isFiniteNumber(item.component.value) ? escapeHtml(formatNumber(item.component.value, metric.decimals)) : "—"}</td>
      <td>${escapeHtml(String(item.component.period || "—"))}</td>
      <td>${isFiniteNumber(item.component.value) ? "수록" : "결측"}</td>
    </tr>`).join("")}</tbody>`;
    wrapper.appendChild(table);
    const rows = data.map((item) => ({
      대상: item.entity.label,
      항목: item.component.label || item.component.key,
      비율: isFiniteNumber(item.component.value) ? item.component.value : "",
      단위: "%",
      시점: item.component.period || "",
      상태: isFiniteNumber(item.component.value) ? "수록" : "결측",
    }));
    return {
      node: wrapper,
      rows,
      filename: `${slugify(metric.label)}_table`,
      periodSummary: summarizePeriods(data.map((item) => item.component.period)),
      status: `${entities.length}개 대상 · ${rows.length}개 구성 항목`,
    };
  }

  function createSvg(width, height, ariaLabel) {
    const svg = svgEl("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      role: "img",
      "aria-label": ariaLabel,
    });
    const defs = svgEl("defs");
    const hatch = svgEl("pattern", { id: "stats-hatch", patternUnits: "userSpaceOnUse", width: 5, height: 5 });
    hatch.appendChild(svgEl("path", { d: "M-1,5 L5,-1 M1,7 L7,1", stroke: "#111", "stroke-width": 0.8 }));
    const cross = svgEl("pattern", { id: "stats-cross", patternUnits: "userSpaceOnUse", width: 6, height: 6 });
    cross.appendChild(svgEl("path", { d: "M0,0 L6,6 M6,0 L0,6", stroke: "#666", "stroke-width": 0.6 }));
    const dots = svgEl("pattern", { id: "stats-dots", patternUnits: "userSpaceOnUse", width: 5, height: 5 });
    dots.appendChild(svgEl("circle", { cx: 2.5, cy: 2.5, r: 0.9, fill: "#555" }));
    const horizontal = svgEl("pattern", { id: "stats-horizontal", patternUnits: "userSpaceOnUse", width: 5, height: 5 });
    horizontal.appendChild(svgEl("path", { d: "M0,1 L5,1", stroke: "#555", "stroke-width": 0.75 }));
    const vertical = svgEl("pattern", { id: "stats-vertical", patternUnits: "userSpaceOnUse", width: 5, height: 5 });
    vertical.appendChild(svgEl("path", { d: "M1,0 L1,5", stroke: "#555", "stroke-width": 0.75 }));
    const backhatch = svgEl("pattern", { id: "stats-backhatch", patternUnits: "userSpaceOnUse", width: 5, height: 5 });
    backhatch.appendChild(svgEl("path", { d: "M-1,-1 L6,6", stroke: "#555", "stroke-width": 0.75 }));
    const checker = svgEl("pattern", { id: "stats-checker", patternUnits: "userSpaceOnUse", width: 6, height: 6 });
    checker.appendChild(svgEl("rect", { x: 0, y: 0, width: 3, height: 3, fill: "#777" }));
    checker.appendChild(svgEl("rect", { x: 3, y: 3, width: 3, height: 3, fill: "#777" }));
    const dash = svgEl("pattern", { id: "stats-dash", patternUnits: "userSpaceOnUse", width: 7, height: 5 });
    dash.appendChild(svgEl("path", { d: "M1,2.5 L5,2.5", stroke: "#555", "stroke-width": 1 }));
    const ring = svgEl("pattern", { id: "stats-ring", patternUnits: "userSpaceOnUse", width: 6, height: 6 });
    ring.appendChild(svgEl("circle", { cx: 3, cy: 3, r: 1.5, fill: "none", stroke: "#555", "stroke-width": 0.7 }));
    defs.append(hatch, cross, dots, horizontal, vertical, backhatch, checker, dash, ring);
    const style = svgEl("style", {}, `
      text { font-family: 'SidaeAi_S', 'Pretendard Variable', 'Pretendard', sans-serif; fill: #111; }
      line, path, rect, circle { vector-effect: non-scaling-stroke; }
    `);
    svg.append(defs, style);
    return svg;
  }

  function svgEl(tagName, attributes = {}, textContent = "") {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== null && value !== "") node.setAttribute(key, String(value));
    }
    if (textContent !== "") node.textContent = textContent;
    return node;
  }

  function svgText(x, y, value, attributes = {}) {
    return svgEl("text", { x, y, ...attributes }, String(value ?? ""));
  }

  function appendHorizontalAxis(svg, domain, scale, y, margin, width, metric) {
    svg.appendChild(svgEl("line", {
      x1: margin.left, y1: y, x2: width - margin.right, y2: y,
      stroke: "#111", "stroke-width": 0.8,
    }));
    for (const tick of numericTicks(domain[0], domain[1], 5)) {
      const x = scale(tick);
      svg.appendChild(svgEl("line", {
        x1: x, y1: margin.top - 5, x2: x, y2: y,
        stroke: "#ddd", "stroke-width": 0.7,
      }));
      svg.appendChild(svgEl("line", { x1: x, y1: y, x2: x, y2: y + 5, stroke: "#111", "stroke-width": 0.8 }));
      svg.appendChild(svgText(x, y + 19, formatAxisValue(tick, metric), { "text-anchor": "middle", "font-size": 9.5, fill: "#555" }));
    }
  }

  function appendTimeSeriesAxes(svg, periods, xScale, domain, yScale, width, height, margin, metric) {
    const bottom = height - margin.bottom;
    svg.appendChild(svgEl("line", { x1: margin.left, y1: bottom, x2: width - margin.right, y2: bottom, stroke: "#111", "stroke-width": 0.9 }));
    svg.appendChild(svgEl("line", { x1: margin.left, y1: margin.top, x2: margin.left, y2: bottom, stroke: "#111", "stroke-width": 0.9 }));
    const step = Math.max(1, Math.ceil(periods.length / 8));
    periods.forEach((period, index) => {
      if (index % step !== 0 && index !== periods.length - 1) return;
      const x = xScale(period.key);
      svg.appendChild(svgEl("line", { x1: x, y1: bottom, x2: x, y2: bottom + 5, stroke: "#111", "stroke-width": 0.7 }));
      svg.appendChild(svgText(x, bottom + 20, period.label, { "text-anchor": "middle", "font-size": 9.5, fill: "#555" }));
    });
    for (const tick of numericTicks(domain[0], domain[1], 5)) {
      const y = yScale(tick);
      svg.appendChild(svgEl("line", { x1: margin.left, y1: y, x2: width - margin.right, y2: y, stroke: "#ddd", "stroke-width": 0.7 }));
      svg.appendChild(svgText(margin.left - 10, y + 4, formatAxisValue(tick, metric), { "text-anchor": "end", "font-size": 9.5, fill: "#555" }));
    }
    svg.appendChild(svgText(18, margin.top - 12, metric.unit ? `(단위: ${metric.unit})` : "", { "font-size": 10, fill: "#555" }));
  }

  function appendScatterAxes(svg, xDomain, yDomain, xScale, yScale, width, height, margin, xMetric, yMetric) {
    const bottom = height - margin.bottom;
    svg.appendChild(svgEl("line", { x1: margin.left, y1: bottom, x2: width - margin.right, y2: bottom, stroke: "#111", "stroke-width": 0.9 }));
    svg.appendChild(svgEl("line", { x1: margin.left, y1: margin.top, x2: margin.left, y2: bottom, stroke: "#111", "stroke-width": 0.9 }));
    for (const tick of numericTicks(xDomain[0], xDomain[1], 5)) {
      const x = xScale(tick);
      svg.appendChild(svgEl("line", { x1: x, y1: margin.top, x2: x, y2: bottom, stroke: "#e0e0e0", "stroke-width": 0.7 }));
      svg.appendChild(svgText(x, bottom + 20, formatAxisValue(tick, xMetric), { "text-anchor": "middle", "font-size": 9.5, fill: "#555" }));
    }
    for (const tick of numericTicks(yDomain[0], yDomain[1], 5)) {
      const y = yScale(tick);
      svg.appendChild(svgEl("line", { x1: margin.left, y1: y, x2: width - margin.right, y2: y, stroke: "#e0e0e0", "stroke-width": 0.7 }));
      svg.appendChild(svgText(margin.left - 10, y + 4, formatAxisValue(tick, yMetric), { "text-anchor": "end", "font-size": 9.5, fill: "#555" }));
    }
    svg.appendChild(svgText((margin.left + width - margin.right) / 2, height - 28, `${xMetric.label}${xMetric.unit ? ` (${xMetric.unit})` : ""}`, {
      "text-anchor": "middle", "font-size": 11, "font-weight": 600,
    }));
    const yTitle = svgText(22, (margin.top + bottom) / 2, `${yMetric.label}${yMetric.unit ? ` (${yMetric.unit})` : ""}`, {
      "text-anchor": "middle", "font-size": 11, "font-weight": 600,
      transform: `rotate(-90 22 ${(margin.top + bottom) / 2})`,
    });
    svg.appendChild(yTitle);
  }

  function valueDomain(values) {
    let min = Math.min(...values, 0);
    let max = Math.max(...values, 0);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const span = max - min;
    if (min < 0) min -= span * 0.04;
    if (max > 0) max += span * 0.04;
    return [min, max];
  }

  function paddedDomain(values, canBeNegative = false) {
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (!canBeNegative && min >= 0) min = 0;
    if (min === max) {
      const padding = Math.abs(min || 1) * 0.15;
      min -= padding;
      max += padding;
    } else {
      const padding = (max - min) * 0.08;
      min -= canBeNegative ? padding : 0;
      max += padding;
    }
    return [min, max];
  }

  function linearScale(domainMin, domainMax, rangeMin, rangeMax) {
    const span = domainMax - domainMin || 1;
    return (value) => rangeMin + (Number(value) - domainMin) / span * (rangeMax - rangeMin);
  }

  function numericTicks(min, max, count) {
    if (!isFiniteNumber(min) || !isFiniteNumber(max)) return [];
    const step = (max - min) / Math.max(1, count - 1);
    return Array.from({ length: count }, (_, index) => min + step * index);
  }

  function formatAxisValue(value, metric) {
    const absolute = Math.abs(value);
    if (absolute >= 1e12) return `${formatNumber(value / 1e12, 1)}조`;
    if (absolute >= 1e8) return `${formatNumber(value / 1e8, 1)}억`;
    if (absolute >= 1e4) return `${formatNumber(value / 1e4, 1)}만`;
    return formatNumber(value, absolute < 10 ? Math.min(2, metric.decimals ?? 1) : 1);
  }

  function emptyChartResult(message, options = {}) {
    const node = document.createElement("p");
    node.className = "empty-state";
    node.textContent = message;
    return {
      node,
      rows: [],
      filename: "statistics",
      periodSummary: "—",
      status: message,
      asTable: options.asTable,
    };
  }

  function normalizeObservation(value) {
    if (!value || !isFiniteNumber(value.value)) return { ...missingObservation(value?.missingReason), ...value, status: "missing" };
    return { status: "ok", ...value };
  }

  function observationFromValue(value, period, versionResolved = "latestAvailable") {
    if (!isFiniteNumber(value)) return missingObservation();
    return {
      value,
      period: period == null ? "" : String(period),
      periodLabel: period == null ? "" : String(period),
      versionResolved,
      status: "ok",
    };
  }

  function missingObservation(reason = "결측") {
    return { value: null, period: "", periodLabel: "", versionResolved: "missing", status: "missing", missingReason: reason };
  }

  function labelForWorldObjectPath(path, sample = {}) {
    const parts = path.split(".");
    if (path.startsWith("agriculture.crops.production.")) return `${SEGMENT_LABELS[parts.at(-1)] || sample.label || parts.at(-1)} 생산량`;
    if (path.startsWith("agriculture.crops.areaHarvested.")) return `${SEGMENT_LABELS[parts.at(-1)] || sample.label || parts.at(-1)} 수확 면적`;
    if (path.startsWith("agriculture.crops.yield.")) return `${SEGMENT_LABELS[parts.at(-1)] || sample.label || parts.at(-1)} 단위면적당 수확량`;
    if (path.startsWith("agriculture.crops.trade.")) {
      const crop = SEGMENT_LABELS[parts[3]] || sample.label || parts[3];
      return `${crop} ${parts[4] === "import" ? "수입량" : "수출량"}`;
    }
    if (path.startsWith("agriculture.livestock.stocks.")) return `${SEGMENT_LABELS[parts.at(-1)] || parts.at(-1)} 사육 두수`;
    if (path.startsWith("agriculture.livestock.meat.")) return `${SEGMENT_LABELS[parts.at(-1)] || parts.at(-1)} 고기 생산량`;
    if (path.includes("fossilTrade")) return sample.label || `${SEGMENT_LABELS[parts[2]] || parts[2]} ${parts[3]}`;
    return sample.label || parts.map((part) => SEGMENT_LABELS[part] || part).join(" · ");
  }

  function labelForWorldPrimitivePath(path) {
    const parts = path.split(".");
    const last = parts.at(-1);
    if (path.startsWith("populationStructure.shares.")) return `${SEGMENT_LABELS[last] || last} 인구 비율`;
    if (path.startsWith("populationStructure.counts.")) return `${SEGMENT_LABELS[last] || last} 인구`;
    if (path.startsWith("populationStructure.dependencyRatios.")) return SEGMENT_LABELS[last] || last;
    if (path === "populationStructure.totalPopulation") return "인구 구조 기준 총인구";
    if (path.startsWith("economy.industry.shares.")) return `${SEGMENT_LABELS[last] || last} 부가가치 비율`;
    if (path.startsWith("religion2020.shares.")) return `${SEGMENT_LABELS[last] || last} 인구 비율`;
    if (path.startsWith("religion2020.counts.")) return `${SEGMENT_LABELS[last] || last} 인구`;
    if (path === "religion2020.totalPopulation") return "종교 통계 기준 총인구";
    if (path.startsWith("agriculture.crops.use.")) {
      const crop = SEGMENT_LABELS[parts[3]] || parts[3];
      if (parts[4] === "shares") return `${crop} ${SEGMENT_LABELS[last] || last} 이용 비율`;
      if (parts[4] === "amounts") return `${crop} ${SEGMENT_LABELS[last] || last} 이용량`;
      if (last === "total") return `${crop} 총이용량`;
    }
    if (path.startsWith("energy.")) {
      const group = parts[1] === "consumption" ? "1차 에너지 소비" : parts[1] === "electricity" ? "발전량" : "화석 에너지 생산";
      const subgroup = parts[2];
      if (subgroup === "totalTWh") return `${group} 합계`;
      if (subgroup === "shareBreakdown") return `${group} 중 ${SEGMENT_LABELS[last] || last} 비율`;
      if (subgroup === "amountBreakdownTWh") return `${group} 중 ${SEGMENT_LABELS[last] || last}`;
      if (subgroup === "summaryShares") return `${group} 중 ${SEGMENT_LABELS[last] || last} 비율`;
      if (subgroup === "summaryAmountsTWh") return `${group} 중 ${SEGMENT_LABELS[last] || last}`;
    }
    return parts.map((part) => SEGMENT_LABELS[part] || part).join(" · ");
  }

  function unitForPrimitivePath(path) {
    if (path.includes(".shares.") || path.includes(".shareBreakdown.") || path.includes(".summaryShares.") || path.includes("dependencyRatios")) return "%";
    if (path.includes(".counts.") || path.endsWith("totalPopulation")) return "명";
    if (path.startsWith("energy.")) return "TWh";
    if (path.includes("agriculture.crops.use") && (path.includes(".amounts.") || path.endsWith(".total"))) return "t";
    return "";
  }

  function normalizeUnit(unit = "") {
    const normalized = String(unit);
    const map = {
      people: "명",
      "people per sq. km of land area": "명/㎢",
      "current US$": "US$",
      "An": "두",
      "t": "t",
      "ha": "ha",
      "kg/ha": "kg/ha",
      "% of population": "%",
      "% of land area": "%",
      "% of GDP": "%",
      "% of world exports": "%",
      "% of world imports": "%",
    };
    return map[normalized] || normalized;
  }

  function decimalsForUnit(unit = "") {
    const normalized = normalizeUnit(unit);
    if (["명", "두"].includes(normalized)) return 0;
    if (["US$", "t", "ha"].includes(normalized)) return 1;
    return 2;
  }

  function formatValue(value, metric, options = {}) {
    if (!isFiniteNumber(value)) return "—";
    if (options.compact && Math.abs(value) >= 1000000) return formatAxisValue(value, metric);
    return formatNumber(value, metric.decimals ?? 1);
  }

  function formatNumber(value, decimals = 1) {
    if (!isFiniteNumber(Number(value))) return "—";
    return new Intl.NumberFormat("ko-KR", {
      maximumFractionDigits: Math.max(0, decimals),
      minimumFractionDigits: 0,
    }).format(Number(value));
  }

  function summarizePeriods(values) {
    const periods = [...new Set(values.filter((value) => value !== null && value !== undefined && String(value).trim()).map(String))]
      .sort((a, b) => periodSortKey(a) - periodSortKey(b));
    if (!periods.length) return "시점 혼합";
    if (periods.length === 1) return periods[0];
    if (periods.length === 2) return periods.join(" · ");
    return `${periods[0]}–${periods.at(-1)} · ${periods.length}개 시점`;
  }

  function periodSortKey(value) {
    const digits = String(value).replace(/[^\d]/g, "");
    return Number(digits || 0);
  }

  function anonymousLabel(index) {
    const labels = [
      "가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하",
      "거", "너", "더", "러", "머", "버", "서", "어", "저", "처", "커", "터", "퍼", "허",
      "고", "노", "도", "로", "모", "보", "소", "오", "조", "초", "코", "토",
    ];
    return `(${labels[index] || index + 1})`;
  }

  function chartTypeLabel(type) {
    return ({
      rank: "순위 막대", compare: "기준↔최신", timeseries: "시계열", composition: "구성비",
      scatter: "산점도", table: "자료표",
    })[type] || type;
  }

  function getPath(object, path) {
    const segments = Array.isArray(path) ? path : String(path).split(".");
    return segments.reduce((value, segment) => value?.[segment], object);
  }

  function uniqueBy(values, keyFunction) {
    const seen = new Set();
    return values.filter((value) => {
      const key = keyFunction(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function normalizeSearch(value) {
    return String(value || "").trim().toLocaleLowerCase("ko-KR").replace(/\s+/g, " ");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
    })[character]);
  }

  function truncateText(value, maximum) {
    const text = String(value || "");
    return text.length > maximum ? `${text.slice(0, maximum - 1)}…` : text;
  }

  function slugify(value) {
    return String(value || "statistics")
      .normalize("NFKD")
      .replace(/[^\p{Letter}\p{Number}]+/gu, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase() || "statistics";
  }

  function renderMetricLibrary() {
    const catalog = cache.currentCatalog;
    if (!catalog) return;
    const query = normalizeSearch(dom.metricLibrarySearch.value);
    const filtered = catalog.metrics.filter((metric) => {
      if (!query) return true;
      return normalizeSearch([metric.label, metric.categoryLabel, metric.description, metric.source?.name].join(" ")).includes(query);
    });
    dom.metricLibraryCount.textContent = `${filtered.length.toLocaleString("ko-KR")} / ${catalog.metrics.length.toLocaleString("ko-KR")}개 지표`;
    dom.metricLibrary.innerHTML = filtered.slice(0, 96).map((metric) => {
      const coverage = metric.coverage ?? catalog.entities.filter((entity) => safeObservation(metric, entity).status === "ok").length;
      const current = metric.id === state.metricId;
      return `<article class="metric-card${current ? " is-current" : ""}">
        <p class="card-kicker">${escapeHtml(metric.categoryLabel || "기타")} · ${escapeHtml(metric.kind || "scalar")}</p>
        <h3>${escapeHtml(metric.label)}</h3>
        <p class="card-description">${escapeHtml(metric.description || "저장된 통계 지표")}</p>
        <p class="card-meta">${escapeHtml(metric.unit || "단위 없음")} · ${coverage.toLocaleString("ko-KR")}개 대상 · ${escapeHtml(metric.source?.name || "출처 정보")}</p>
        <button type="button" data-metric-id="${escapeHtml(metric.id)}">탐색기에서 열기</button>
      </article>`;
    }).join("") || `<p class="empty-state">일치하는 지표가 없음.</p>`;
  }

  function updateReferenceCoverage() {
    const catalog = window.GRAPH_REFERENCE_CATALOG;
    const count = catalog?.meta?.itemCount ?? catalog?.items?.length ?? 0;
    dom.referenceCoverage.textContent = count ? `${count.toLocaleString("ko-KR")}개 기존 그래프` : "카탈로그 없음";
  }

  function renderGraphLibrary() {
    const catalog = window.GRAPH_REFERENCE_CATALOG || { items: [], meta: {} };
    const query = normalizeSearch(dom.graphLibrarySearch?.value);
    const status = dom.graphStatusFilter?.value || "all";
    const items = (catalog.items || []).filter((item) => {
      const isGap = Boolean(item.provenanceGap || item.unresolvedSource);
      if (status === "resolved" && isGap) return false;
      if (status === "gap" && !isGap) return false;
      if (!query) return true;
      return normalizeSearch([item.filename, item.title, item.topic, item.chartType, ...(item.years || [])].join(" ")).includes(query);
    });
    if (dom.graphLibraryCount) dom.graphLibraryCount.textContent = `${items.length.toLocaleString("ko-KR")} / ${(catalog.items || []).length.toLocaleString("ko-KR")}개`;
    if (!dom.graphLibrary) return;
    dom.graphLibrary.innerHTML = items.slice(0, 80).map((item) => {
      const gap = Boolean(item.provenanceGap || item.unresolvedSource);
      const sourceStatus = item.unresolvedSource ? "출처 미해결" : item.provenanceGap ? "출처 보강 필요" : "출처 연결됨";
      return `<article class="graph-card">
        <p class="card-kicker">${escapeHtml(item.topic)} · ${escapeHtml(item.chartType)}</p>
        <h3>${escapeHtml(item.filename)}</h3>
        <p class="card-description">${item.years?.length ? escapeHtml(item.years.join(", ")) : "연도 표기 없음"}</p>
        <span class="status-badge${gap ? " is-gap" : ""}">${escapeHtml(sourceStatus)}</span>
        <button type="button" data-graph-type="${escapeHtml(item.chartType)}" data-graph-topic="${escapeHtml(item.topic)}">같은 형식으로 탐색</button>
      </article>`;
    }).join("") || `<p class="empty-state">일치하는 기존 그래프가 없음.</p>`;
  }

  async function applyGraphReferencePreset(graphType, topic) {
    const targetScope = topic.includes("기후") ? "climate" : "world";
    if (state.scope !== targetScope) await activateScope(targetScope);
    const chartType = graphType.includes("구성") || graphType.includes("도넛") || graphType.includes("피라미드")
      ? "composition"
      : graphType.includes("시계열") ? "timeseries"
        : graphType.includes("산점도") ? "scatter"
          : graphType.includes("표") ? "table" : "rank";
    const categoryCandidates = topic.includes("인구") ? ["population", "populationStructure", "migration"]
      : topic.includes("농업") ? ["agriculture"]
        : topic.includes("에너지") ? ["energy"]
          : topic.includes("산업") ? ["economy"]
            : topic.includes("기후") ? ["climate"] : [];
    const metric = cache.currentCatalog.metrics.find((candidate) =>
      categoryCandidates.includes(candidate.category) && candidate.capabilities?.includes(chartType)
    ) || cache.currentCatalog.metrics.find((candidate) => candidate.capabilities?.includes(chartType));
    if (!metric) return;
    state.category = "all";
    dom.categorySelect.value = "all";
    state.chartType = chartType;
    selectMetric(metric.id, { scroll: true });
  }

  async function loadSupplementalLibrary() {
    if (!state.supplementalLoaded) {
      dom.loadSupplementalButton.disabled = true;
      dom.loadSupplementalButton.textContent = "불러오는 중";
      try {
        await loadScript(DATA_URLS.supplemental, "SUPPLEMENTAL_STATS");
        cache.supplemental = window.SUPPLEMENTAL_STATS;
        state.supplementalLoaded = true;
        augmentWorldCatalogWithSupplemental(cache.supplemental);
      } catch (error) {
        dom.sourceLibrary.innerHTML = `<p class="empty-state">${escapeHtml(error.message || String(error))}</p>`;
        dom.loadSupplementalButton.disabled = false;
        dom.loadSupplementalButton.textContent = "다시 시도";
        return;
      }
    }
    dom.loadSupplementalButton.textContent = "불러옴";
    dom.loadSupplementalButton.disabled = true;
    dom.sourceSearchField.hidden = false;
    renderSourceLibrary();
    if (state.scope === "world") {
      refreshCategoryPicker();
      refreshMetricPicker({ chooseFirst: false });
    }
  }

  function augmentWorldCatalogWithSupplemental(registry) {
    const worldCatalog = cache.catalogs.get("world");
    if (!worldCatalog || worldCatalog.supplementalAugmented) return;
    const built = buildSupplementalAdapters(registry);
    worldCatalog.entities = uniqueBy([...worldCatalog.entities, ...built.entities], (entity) => entity.id);
    worldCatalog.metrics = uniqueBy([...worldCatalog.metrics, ...built.metrics], (metric) => metric.id)
      .sort((a, b) => `${a.categoryLabel}|${a.label}`.localeCompare(`${b.categoryLabel}|${b.label}`, "ko"));
    worldCatalog.supplementalAugmented = true;
    worldCatalog.supplementalMetricByDataset = built.metricByDataset;
  }

  function buildSupplementalAdapters(registry) {
    const metrics = [];
    const entities = [];
    const metricByDataset = new Map();
    const countryLabels = new Map(
      (registry.datasets || []).flatMap((dataset) => (dataset.records || [])
        .filter((record) => record.iso3)
        .map((record) => [record.iso3, record.countryKo || record.displayLabel || record.iso3]))
    );
    for (const [iso3, label] of countryLabels) {
      entities.push({ id: `country:${iso3}`, label, secondaryLabel: iso3, data: { iso3 }, meta: { supplementalOnly: true } });
    }
    for (const dataset of registry.datasets || []) {
      for (const record of dataset.records || []) {
        if (record.regionKo) {
          entities.push({
            id: `supplemental-region:${slugify(record.regionKo)}`,
            label: record.regionKo,
            secondaryLabel: "세계 권역",
            data: { supplementalRegion: record.regionKo },
            meta: { supplementalOnly: true },
          });
        }
      }

      const datasetMetrics = buildMetricsForSupplementalDataset(dataset);
      if (datasetMetrics.length) metricByDataset.set(dataset.id, datasetMetrics[0].id);
      metrics.push(...datasetMetrics);
    }
    return { metrics, entities: uniqueBy(entities, (entity) => entity.id), metricByDataset };
  }

  function buildMetricsForSupplementalDataset(dataset) {
    const source = { name: dataset.source?.name || "보완 통계", url: dataset.source?.url || "" };
    const category = dataset.topic === "energy" ? "energy"
      : dataset.topic === "trade" ? "economy"
        : dataset.topic === "agriculture" ? "agriculture"
          : dataset.topic === "population" ? "population" : "supplemental";
    const base = {
      scope: "world",
      category,
      categoryLabel: CATEGORY_LABELS[category] || "보완 통계",
      description: "기본 통계에 아직 합치지 않은 공개용 보완 레지스트리의 정규화 값임.",
      source,
      datasetId: dataset.id,
    };
    const recordsByEntity = new Map((dataset.records || []).map((record) => [supplementalEntityId(record), record]));
    const compositionAccessor = compositionAccessorForDataset(dataset);
    const output = [];
    if (compositionAccessor) {
      const metric = {
        ...base,
        id: `supplemental:${dataset.id}:composition`,
        label: dataset.title,
        unit: "%",
        decimals: 2,
        kind: "composition",
        capabilities: ["composition", "table"],
        getComposition(entity) {
          const record = recordsByEntity.get(entity.id);
          return record ? compositionAccessor(record).map((item) => ({ ...item, period: record.year || record.referencePeriod || "" })) : [];
        },
        getObservation(entity) {
          const components = this.getComposition(entity);
          const values = components.map((item) => item.value).filter(isFiniteNumber);
          const record = recordsByEntity.get(entity.id);
          return values.length
            ? observationFromValue(values.reduce((sum, value) => sum + value, 0), record?.year || record?.referencePeriod || "", "supplemental")
            : missingObservation();
        },
      };
      output.push(metric);
    }

    if (dataset.id === "un-wpp2024-natural-change-net-migration-rates") {
      for (const [field, label] of [["naturalChangeRatePer1000", "자연 증가율"], ["netMigrationRatePer1000", "순이동률"]]) {
        const grouped = groupBy(dataset.records || [], (record) => `country:${record.iso3}`);
        output.push({
          ...base,
          id: `supplemental:${dataset.id}:${field}`,
          label: `${dataset.title} · ${label}`,
          unit: "‰", decimals: 3, kind: "series", canBeNegative: true,
          capabilities: ["rank", "compare", "timeseries", "scatter", "table"],
          getObservation(entity) {
            const rows = (grouped.get(entity.id) || []).filter((row) => isFiniteNumber(row[field]));
            const row = rows.at(-1);
            return observationFromValue(row?.[field], row?.year, "supplemental");
          },
          getSeries(entity) {
            return (grouped.get(entity.id) || []).map((row) => ({ period: String(row.year), periodLabel: String(row.year), value: row[field] }));
          },
          getComparison(entity) {
            const rows = (grouped.get(entity.id) || []).filter((row) => isFiniteNumber(row[field]));
            return {
              reference: observationFromValue(rows[0]?.[field], rows[0]?.year, "reference"),
              latest: observationFromValue(rows.at(-1)?.[field], rows.at(-1)?.year, "latestAvailable"),
            };
          },
        });
      }
    }

    const scalarFields = [];
    if (dataset.id === "ei-regional-primary-energy-renewables-share-2023") scalarFields.push(["renewablesSharePercent", "1차 에너지 소비 중 재생에너지 비율", "%"]);
    if (dataset.id === "ei-regional-renewables-consumption-growth-2014-2024") {
      scalarFields.push(["consumptionSharePercent2024", "수력·풍력·태양광 소비 비율", "%"]);
      scalarFields.push(["cagrPercent2014To2024", "수력·풍력·태양광 소비 연평균 증가율", "%"]);
    }
    for (const [field, label, unit] of scalarFields) {
      output.push({
        ...base,
        id: `supplemental:${dataset.id}:${field}`,
        label: `${dataset.title} · ${label}`,
        unit, decimals: 2, kind: "scalar", canBeNegative: field.includes("cagr"),
        capabilities: ["rank", "scatter", "table"],
        getObservation(entity) {
          const record = recordsByEntity.get(entity.id);
          return observationFromValue(record?.[field], record?.year || record?.referencePeriod, "supplemental");
        },
      });
    }
    return output;
  }

  function compositionAccessorForDataset(dataset) {
    const sample = dataset.records?.[0];
    if (!sample) return null;
    if (Array.isArray(sample.groups)) {
      return (record) => record.groups.map((item) => ({ key: slugify(item.label), label: item.label, value: item.sharePercent }));
    }
    if (Array.isArray(sample.cropSharesPercent)) {
      return (record) => record.cropSharesPercent.map((item) => ({ key: item.cropKey, label: item.cropKo, value: item.value }));
    }
    if (sample.mixPercent2024 && typeof sample.mixPercent2024 === "object") {
      return (record) => objectComposition(record.mixPercent2024);
    }
    if (sample.sharesPercent && typeof sample.sharesPercent === "object") {
      return (record) => objectComposition(record.sharesPercent).filter((item) => !(["A", "B"].includes(item.key) && item.value === 0));
    }
    return null;
  }

  function objectComposition(value) {
    return Object.entries(value || {}).map(([key, number]) => ({
      key,
      label: SEGMENT_LABELS[key] || key,
      value: isFiniteNumber(number) ? number : null,
    }));
  }

  function supplementalEntityId(record) {
    if (record.iso3) return `country:${record.iso3}`;
    if (record.regionKo) return `supplemental-region:${slugify(record.regionKo)}`;
    return `supplemental:${slugify(record.countryKo || record.displayLabel || record.sourceRegion || "unknown")}`;
  }

  function groupBy(values, keyFunction) {
    const groups = new Map();
    for (const value of values) {
      const key = keyFunction(value);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(value);
    }
    return groups;
  }

  function renderSourceLibrary() {
    const registry = cache.supplemental;
    if (!registry) return;
    const query = normalizeSearch(dom.sourceLibrarySearch.value);
    const worldCatalog = cache.catalogs.get("world");
    const datasetCards = (registry.datasets || []).filter((dataset) =>
      !query || normalizeSearch([dataset.title, dataset.topic, dataset.scope, dataset.source?.name, ...(dataset.referenceYears || [])].join(" ")).includes(query)
    ).map((dataset) => {
      const metricId = worldCatalog?.supplementalMetricByDataset?.get(dataset.id);
      const sourceLink = dataset.source?.url
        ? `<a href="${escapeHtml(dataset.source.url)}" target="_blank" rel="noreferrer">원문 열기</a>` : "";
      return `<article class="source-card">
        <p class="card-kicker">정규화 자료 · ${escapeHtml(dataset.topic || "multiple")}</p>
        <h3>${escapeHtml(dataset.title)}</h3>
        <p class="card-description">${escapeHtml(dataset.source?.name || "출처 정보")} · ${Number(dataset.recordCount || 0).toLocaleString("ko-KR")}개 레코드</p>
        <p class="card-meta">${escapeHtml((dataset.referenceYears || []).join(", ") || "시점 혼합")} · ${escapeHtml((dataset.units || []).join(", ") || "단위 혼합")}</p>
        ${metricId ? `<button type="button" data-supplemental-metric="${escapeHtml(metricId)}">그래프로 보기</button>` : sourceLink}
        ${metricId && sourceLink ? sourceLink : ""}
      </article>`;
    });
    const pointerCards = (registry.sourcePointers || []).filter((pointer) =>
      !query || normalizeSearch([pointer.title, pointer.topic, pointer.scope, pointer.source?.name, ...(pointer.contents || [])].join(" ")).includes(query)
    ).map((pointer) => `<article class="source-card">
      <p class="card-kicker">원천 포인터 · ${escapeHtml(pointer.topic || "multiple")}</p>
      <h3>${escapeHtml(pointer.title)}</h3>
      <p class="card-description">그래프 값으로 정규화하기 전의 원천 위치와 범위만 기록함.</p>
      <p class="card-meta">${escapeHtml(pointer.source?.name || "출처 정보")}${pointer.assetCount ? ` · ${Number(pointer.assetCount).toLocaleString("ko-KR")}개 자산` : ""}</p>
      ${pointer.source?.url ? `<a href="${escapeHtml(pointer.source.url)}" target="_blank" rel="noreferrer">원문 열기</a>` : `<span class="status-badge is-gap">공개 URL 확인 필요</span>`}
    </article>`);
    const cards = [...datasetCards, ...pointerCards];
    dom.sourceLibraryCount.textContent = `${datasetCards.length}개 자료 · ${pointerCards.length}개 원천 포인터`;
    dom.sourceLibrary.innerHTML = cards.join("") || `<p class="empty-state">일치하는 보완 통계가 없음.</p>`;
  }

  async function openSupplementalMetric(metricId) {
    if (state.scope !== "world") await activateScope("world");
    const worldCatalog = cache.catalogs.get("world");
    if (!worldCatalog?.supplementalAugmented) augmentWorldCatalogWithSupplemental(cache.supplemental);
    cache.currentCatalog = worldCatalog;
    state.category = "all";
    state.chartType = worldCatalog.metrics.find((metric) => metric.id === metricId)?.capabilities?.[0] || "table";
    refreshCategoryPicker();
    refreshMetricPicker({ chooseFirst: false });
    selectMetric(metricId, { scroll: true });
  }

  function downloadCurrentSvg() {
    const current = cache.currentExport;
    if (!current?.node || !(current.node instanceof SVGElement)) return;
    const clone = current.node.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const source = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
    downloadBlob(new Blob([source], { type: "image/svg+xml;charset=utf-8" }), `${current.filename || "statistics"}.svg`);
  }

  function downloadCurrentCsv() {
    const current = cache.currentExport;
    if (!current?.rows?.length) return;
    const headers = [...new Set(current.rows.flatMap((row) => Object.keys(row)))];
    const lines = [headers, ...current.rows.map((row) => headers.map((header) => row[header] ?? ""))]
      .map((row) => row.map(csvCell).join(","));
    downloadBlob(new Blob(["\ufeff", lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `${current.filename || "statistics"}.csv`);
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function updateCoverageCounters() {
    if (window.COUNTRY_STATS_META) {
      const coverage = window.COUNTRY_STATS_META.coverage || {};
      dom.worldCoverage.textContent = `${Number(coverage.countriesWithAnyStats || 0).toLocaleString("ko-KR")}개 국가 · ${window.COUNTRY_STATS_META.cacheSnapshotDate || "저장본"}`;
    }
    if (window.KOREA_GEO_STATS_METRICS) {
      const levelCounts = Object.fromEntries(Object.entries(window.KOREA_GEO_STATS_REGIONS || {}).map(([level, regions]) => [level, Object.keys(regions || {}).length]));
      const metricCount = Object.values(window.KOREA_GEO_STATS_METRICS).reduce((sum, metrics) => sum + Object.keys(metrics || {}).length, 0);
      dom.koreaCoverage.textContent = `${(levelCounts.provinces || 0) + (levelCounts.cities || 0) + (levelCounts.metroDistricts || 0)}개 지역 · ${metricCount}개 지표`;
    }
    const climateParts = [];
    if (window.CLIMATE_DATA) climateParts.push(`세계 ${window.CLIMATE_DATA.summary?.regionCount || window.CLIMATE_DATA.regions?.length || 0}`);
    if (window.KOREA_CLIMATE_DATA) climateParts.push(`한반도 ${window.KOREA_CLIMATE_DATA.summary?.regionCount || window.KOREA_CLIMATE_DATA.regions?.length || 0}`);
    if (climateParts.length) dom.climateCoverage.textContent = `${climateParts.join(" · ")}개 지점`;
    updateReferenceCoverage();
  }
})();

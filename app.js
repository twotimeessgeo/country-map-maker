const d3 = window.d3;
const topojson = window.topojson;

if (!d3 || !topojson || !window.WORLD_ATLAS_TOPOLOGY || !window.WORLD_COUNTRY_NAMES_TSV || !window.KOREA_ADMIN_DATA) {
  throw new Error("필수 지도 데이터 또는 라이브러리를 불러오지 못했습니다.");
}

const latitudeGuideDefinitions = [
  { key: "equator", label: "적도", latitudes: [0], color: "#5c6f82" },
  { key: "lat30", label: "30°", latitudes: [30, -30], color: "#6a6a6a" },
  { key: "lat60", label: "60°", latitudes: [60, -60], color: "#7b7b7b" },
  { key: "tropicCancer", label: "북회귀선", latitudes: [23.4366], color: "#8d6130" },
  { key: "tropicCapricorn", label: "남회귀선", latitudes: [-23.4366], color: "#8d6130" },
];

const markerStyleOptions = [
  { value: "ring", label: "원형" },
  { value: "dashedOval", label: "점선 타원" },
  { value: "point", label: "점 표시" },
  { value: "filledDot", label: "검은 점" },
];

const EARTH_RADIUS_KM = 6371.0088;
const MAP_FONT_FAMILY = "SidaeAi_S";
const MAP_FONT_STRETCH_X = 0.95;
const OUTLINE_STROKE_WIDTH = "0.4pt";
const MIN_INSET_PANEL_WIDTH = 36;
const MIN_INSET_PANEL_HEIGHT = 36;
const MAX_INSET_PANEL_WIDTH = 310;
const MAIN_CANVAS_WIDTH = 310;
const MIN_CANVAS_WIDTH = 140;
const MIN_CANVAS_HEIGHT = 120;
const MIN_ZOOM_DRAG_SIZE = 20;
const MIN_INSET_DRAG_SIZE = 2;
const MAP_RENDER_CLIP_PADDING = 24;
const INSET_RENDER_CLIP_PADDING = 18;
const MIN_INSET_ZOOM_SCALE = 0.2;
const MAX_INSET_ZOOM_SCALE = 2.4;

const projectionModeLabels = {
  rectangular: "평면",
  northPolar: "북극",
  southPolar: "남극",
};
const mapVersionLabels = {
  world: "세계",
  korea: "대한민국",
};
const koreaRegionLevelLabels = {
  provinces: "도/광역시",
  municipalities: "시/군/구",
};

const viewModeLabels = {
  zoom: "영역 확대",
  pan: "이동",
  marker: "마커 추가",
  inset: "인셋 추가",
};

const viewModeDetails = {
  zoom: {
    description: "드래그 박스로 원하는 부분만 크게 보고, 짧게 클릭하면 국가를 바로 선택합니다.",
    hint: "영역 확대 모드에서는 드래그 박스로 원하는 부분만 크게 잡을 수 있고, 짧게 클릭하면 국가를 바로 선택하거나 해제할 수 있습니다.",
    tips: ["클릭: 국가 선택", "드래그: 확대", "휠: 확대/축소", "0: 전체 보기"],
  },
  pan: {
    description: "지도를 끌어 위치를 바꾸고, 짧게 클릭하면 국가를 선택하거나 해제합니다.",
    hint: "이동 모드에서는 지도를 끌어 위치를 바꾸고, 짧게 클릭하면 해당 국가를 선택하거나 해제할 수 있습니다.",
    tips: ["드래그: 위치 이동", "클릭: 국가 선택", "Space: 임시 이동", "휠: 확대/축소"],
  },
  marker: {
    description: "클릭으로 바로 놓거나 드래그해서 크기까지 정한 뒤, 미리보기 위에서 다시 옮길 수 있습니다.",
    hint: "마커 추가 모드에서는 클릭으로 바로 놓거나 드래그해 크기까지 정해 넣을 수 있고, 만들어진 마커는 미리보기 박스에서 직접 이동하거나 크기를 조절할 수 있습니다.",
    tips: ["클릭: 기본 크기", "드래그: 크기 지정", "핸들: 이동/리사이즈", "3: 마커 모드"],
  },
  inset: {
    description: "확대하고 싶은 범위를 드래그하면 인셋이 생기고, 생성 뒤에는 패널 위치와 크기를 바로 조정할 수 있습니다.",
    hint: "인셋 추가 모드에서는 확대하고 싶은 범위를 드래그해 작은 확대 지도 박스를 만들 수 있고, 만들어진 인셋 패널도 미리보기에서 바로 끌어 조정할 수 있습니다.",
    tips: ["드래그: 인셋 만들기", "핸들: 크기 조절", "패널: 위치 이동", "4: 인셋 모드"],
  },
};

const atlasTopologyVariants = {
  "110m": window.WORLD_ATLAS_VARIANTS?.["110m"] ?? null,
  "50m": window.WORLD_ATLAS_TOPOLOGY,
  "10m": window.WORLD_ATLAS_VARIANTS?.["10m"] ?? null,
};
const atlasLakeVariants = {
  "110m": window.WORLD_LAKES_VARIANTS?.["110m"] ?? null,
  "50m": window.WORLD_LAKES_VARIANTS?.["50m"] ?? null,
  "10m": window.WORLD_LAKES_VARIANTS?.["10m"] ?? null,
};
const countryNameRows = d3.tsvParse(window.WORLD_COUNTRY_NAMES_TSV);
const countryNameById = new Map(
  countryNameRows.map((row) => [String(Number(row.id)), row.name.trim()]),
);

const atlasDatasets = Object.fromEntries(
  Object.entries(atlasTopologyVariants)
    .filter(([, variantTopology]) => Boolean(variantTopology))
    .map(([key, variantTopology]) => [key, buildAtlasDataset(variantTopology, key)]),
);
const atlasLakeDatasets = Object.fromEntries(
  Object.entries(atlasLakeVariants)
    .filter(([, geometry]) => geometry?.type === "GeometryCollection")
    .map(([key, geometry]) => [key, buildLakeDataset(geometry, key)]),
);
const baseAtlas = atlasDatasets["50m"] ?? atlasDatasets["110m"] ?? atlasDatasets["10m"];
const baseLakeDataset = atlasLakeDatasets["50m"] ?? atlasLakeDatasets["110m"] ?? atlasLakeDatasets["10m"] ?? null;

const countryFeatures = baseAtlas.countryFeatures;
const countryById = baseAtlas.countryById;
const countryByNormalizedName = new Map(
  countryFeatures.map((feature) => [normalizeText(feature.properties.name), feature]),
);

const countryAliasEntries = [
  ["South Korea", "Korea, Republic of"],
  ["Korea South", "Korea, Republic of"],
  ["Republic of Korea", "Korea, Republic of"],
  ["대한민국", "Korea, Republic of"],
  ["한국", "Korea, Republic of"],
  ["North Korea", "Korea, Democratic People's Republic of"],
  ["Korea North", "Korea, Democratic People's Republic of"],
  ["DPRK", "Korea, Democratic People's Republic of"],
  ["북한", "Korea, Democratic People's Republic of"],
  ["조선민주주의인민공화국", "Korea, Democratic People's Republic of"],
  ["United States of America", "United States"],
  ["USA", "United States"],
  ["US", "United States"],
  ["미국", "United States"],
  ["UK", "United Kingdom"],
  ["Britain", "United Kingdom"],
  ["Great Britain", "United Kingdom"],
  ["영국", "United Kingdom"],
  ["Russia", "Russian Federation"],
  ["러시아", "Russian Federation"],
  ["Vietnam", "Viet Nam"],
  ["베트남", "Viet Nam"],
  ["Laos", "Lao People's Democratic Republic"],
  ["라오스", "Lao People's Democratic Republic"],
  ["Iran", "Iran, Islamic Republic of"],
  ["이란", "Iran, Islamic Republic of"],
  ["Syria", "Syrian Arab Republic"],
  ["시리아", "Syrian Arab Republic"],
  ["Bolivia", "Bolivia, Plurinational State of"],
  ["볼리비아", "Bolivia, Plurinational State of"],
  ["Venezuela", "Venezuela, Bolivarian Republic of"],
  ["베네수엘라", "Venezuela, Bolivarian Republic of"],
  ["Tanzania", "Tanzania, United Republic of"],
  ["탄자니아", "Tanzania, United Republic of"],
  ["Moldova", "Moldova, Republic of"],
  ["몰도바", "Moldova, Republic of"],
  ["Palestine", "Palestinian Territory, Occupied"],
  ["팔레스타인", "Palestinian Territory, Occupied"],
  ["Czechia", "Czech Republic"],
  ["체코", "Czech Republic"],
  ["Ivory Coast", "Côte d'Ivoire"],
  ["코트디부아르", "Côte d'Ivoire"],
  ["DR Congo", "Congo, the Democratic Republic of the"],
  ["Democratic Republic of the Congo", "Congo, the Democratic Republic of the"],
  ["콩고민주공화국", "Congo, the Democratic Republic of the"],
  ["Congo Republic", "Congo"],
  ["Republic of the Congo", "Congo"],
  ["콩고공화국", "Congo"],
  ["North Macedonia", "Macedonia, the former Yugoslav Republic of"],
  ["Macedonia", "Macedonia, the former Yugoslav Republic of"],
  ["북마케도니아", "Macedonia, the former Yugoslav Republic of"],
  ["마케도니아", "Macedonia, the former Yugoslav Republic of"],
  ["Eswatini", "Swaziland"],
  ["Swatini", "Swaziland"],
  ["에스와티니", "Swaziland"],
  ["Taiwan", "Taiwan, Province of China"],
  ["대만", "Taiwan, Province of China"],
  ["Brunei", "Brunei Darussalam"],
  ["브루나이", "Brunei Darussalam"],
  ["Burma", "Myanmar"],
  ["버마", "Myanmar"],
  ["미얀마", "Myanmar"],
  ["France", "France"],
  ["프랑스", "France"],
  ["Poland", "Poland"],
  ["폴란드", "Poland"],
  ["Algeria", "Algeria"],
  ["알제리", "Algeria"],
  ["Japan", "Japan"],
  ["일본", "Japan"],
  ["China", "China"],
  ["중국", "China"],
  ["India", "India"],
  ["인도", "India"],
  ["Bangladesh", "Bangladesh"],
  ["방글라데시", "Bangladesh"],
  ["Nepal", "Nepal"],
  ["네팔", "Nepal"],
  ["Bhutan", "Bhutan"],
  ["부탄", "Bhutan"],
  ["Sri Lanka", "Sri Lanka"],
  ["스리랑카", "Sri Lanka"],
];

const countryByAlias = new Map(
  countryAliasEntries
    .map(([alias, canonicalName]) => [normalizeText(alias), countryByNormalizedName.get(normalizeText(canonicalName))])
    .filter(([, feature]) => Boolean(feature)),
);

const countryStatsById = window.COUNTRY_STATS_BY_ID ?? {};
const countryStatsMeta = window.COUNTRY_STATS_META ?? { sources: {} };
const countryStatsReligionLabels = {
  christians: "기독교",
  muslims: "이슬람",
  hindus: "힌두교",
  buddhists: "불교",
  jews: "유대교",
  other: "기타 종교",
  noReligion: "무종교",
};
const countryStatsEnergyLabels = {
  coal: "석탄",
  oil: "석유",
  gas: "가스",
  nuclear: "원자력",
  hydropower: "수력",
  wind: "풍력",
  solar: "태양광",
  biofuels: "바이오연료",
  bioenergy: "바이오에너지",
  otherRenewables: "기타 재생",
};
const koreaDatasets = {
  provinces: buildKoreaDataset(window.KOREA_ADMIN_DATA.provinces, "provinces"),
  municipalities: buildKoreaDataset(window.KOREA_ADMIN_DATA.municipalities, "municipalities"),
};
const koreaProvinceByCode = koreaDatasets.provinces.featureById;
const koreaMunicipalitiesByParentCode = d3.group(
  koreaDatasets.municipalities.features,
  (feature) => feature.properties.parentCode,
);

const MAX_STABLE_SPHERICAL_FILL_AREA = 2 * Math.PI;
function buildAtlasDataset(variantTopology, datasetKey) {
  const countriesObject = variantTopology.objects.countries;
  const landFeature = topojson.feature(variantTopology, variantTopology.objects.land);
  const borderMesh = topojson.mesh(variantTopology, countriesObject, (a, b) => a !== b);
  const allCountryFeatures = topojson
    .feature(variantTopology, countriesObject)
    .features
    .map((feature) => ({
      ...feature,
      id: Number.isFinite(Number(feature.id)) ? String(Number(feature.id)) : null,
      properties: {
        ...feature.properties,
        name:
          (Number.isFinite(Number(feature.id)) ? countryNameById.get(String(Number(feature.id))) : null) ??
          feature.properties?.name ??
          "",
      },
    }));
  const variantCountryFeatures = allCountryFeatures
    .filter((feature) => feature.id && countryNameById.has(feature.id))
    .sort((a, b) => d3.ascending(a.properties.name, b.properties.name));
  const unstableFillCountryIds = new Set(
    variantCountryFeatures
      .filter((feature) => d3.geoArea(feature) > MAX_STABLE_SPHERICAL_FILL_AREA)
      .map((feature) => feature.id),
  );

  return {
    datasetKey,
    topology: variantTopology,
    countriesObject,
    landFeature,
    borderMesh,
    countryFeatures: variantCountryFeatures,
    countryById: new Map(variantCountryFeatures.map((feature) => [feature.id, feature])),
    unstableFillCountryIds,
  };
}

function buildLakeDataset(geometryCollection, datasetKey) {
  return {
    datasetKey,
    geometry: geometryCollection,
  };
}

function buildKoreaDataset(topology, level) {
  const objectKey = Object.keys(topology.objects)[0];
  const regionsObject = topology.objects[objectKey];
  const regionFeatures = topojson
    .feature(topology, regionsObject)
    .features
    .map((feature) => {
      const code = String(feature.properties?.code ?? feature.id ?? "");
      return {
        ...feature,
        id: code,
        properties: {
          ...feature.properties,
          code,
          name: feature.properties?.name ?? code,
          parentCode: level === "municipalities" ? code.slice(0, 2) : "",
        },
      };
    })
    .sort((a, b) => d3.ascending(a.properties.code, b.properties.code));

  return {
    level,
    topology,
    regionsObject,
    landFeature: topojson.merge(topology, regionsObject.geometries),
    features: regionFeatures,
    featureById: new Map(regionFeatures.map((feature) => [feature.id, feature])),
  };
}

function getAtlasLevelForZoom(zoomLevel = state.viewZoom, preferFine = false) {
  if (state.coastlineDetail === "performance") {
    return atlasDatasets["110m"] ? "110m" : "50m";
  }

  if (state.coastlineDetail === "detailed") {
    if (zoomLevel >= 4.4 && atlasDatasets["10m"]) {
      return "10m";
    }
    return atlasDatasets["50m"] ? "50m" : "110m";
  }

  if (state.coastlineDetail === "max") {
    if (atlasDatasets["10m"]) {
      return "10m";
    }
    return atlasDatasets["50m"] ? "50m" : "110m";
  }

  if (preferFine && zoomLevel >= 6.4 && atlasDatasets["10m"]) {
    return "10m";
  }

  if (zoomLevel >= 8 && atlasDatasets["10m"]) {
    return "10m";
  }

  if (zoomLevel >= 1.8 && atlasDatasets["50m"]) {
    return "50m";
  }

  return atlasDatasets["110m"] ? "110m" : "50m";
}

function getAtlasDataset(zoomLevel = state.viewZoom, preferFine = false) {
  return atlasDatasets[getAtlasLevelForZoom(zoomLevel, preferFine)] ?? baseAtlas;
}

const atlasPalette = ["#9c9c9c", "#b9b9b9", "#6a6a6a", "#858585", "#cacaca", "#777777"];

const state = {
  mapVersion: "world",
  width: MAIN_CANVAS_WIDTH,
  height: 310,
  paddingPercent: 10,
  centerLongitude: 0,
  projectionMode: "rectangular",
  viewMode: "zoom",
  viewZoom: 1,
  viewOffsetX: 0,
  viewOffsetY: 0,
  oceanColor: "#d8d8d8",
  landColor: "#ffffff",
  borderColor: "#101010",
  borderMode: "dashed",
  coastlineDetail: "auto",
  showFrame: true,
  selectedBordersOnly: false,
  autoFocusOnSelection: false,
  unifySelectedCountryColors: false,
  unifiedSelectedCountryColor: atlasPalette[0],
  showGuideLines: false,
  showLatitudeLabels: false,
  showScaleBar: false,
  mapFontSizePt: 8,
  activeStatsCountryId: null,
  guides: {
    equator: false,
    lat30: false,
    lat60: false,
    tropicCancer: false,
    tropicCapricorn: false,
  },
  selected: [],
  koreaLevel: "provinces",
  koreaParentCode: "",
  koreaSelectedProvinces: [],
  koreaSelectedMunicipalities: [],
  markerDraftStyle: "ring",
  markers: [],
  insets: [],
  nextMarkerSequence: 0,
  nextInsetSequence: 0,
};

const elements = {
  mapVersionButtons: [...document.querySelectorAll(".map-version-button")],
  worldSections: [...document.querySelectorAll(".world-only")],
  koreaSections: [...document.querySelectorAll(".korea-only")],
  countryInput: document.querySelector("#countryInput"),
  countryOptions: document.querySelector("#countryOptions"),
  addCountryButton: document.querySelector("#addCountryButton"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  selectionCardTitle: document.querySelector("#selectionCardTitle"),
  selectionDetailTitle: document.querySelector("#selectionDetailTitle"),
  selectionDetailHint: document.querySelector("#selectionDetailHint"),
  selectedCountryList: document.querySelector("#selectedCountryList"),
  countryStatsPanel: document.querySelector("#countryStatsPanel"),
  statusMessage: document.querySelector("#statusMessage"),
  widthInput: document.querySelector("#widthInput"),
  heightInput: document.querySelector("#heightInput"),
  paddingInput: document.querySelector("#paddingInput"),
  paddingValue: document.querySelector("#paddingValue"),
  centerLongitudeInput: document.querySelector("#centerLongitudeInput"),
  centerLongitudeValue: document.querySelector("#centerLongitudeValue"),
  centerButtons: [...document.querySelectorAll(".center-button")],
  modeButtons: [...document.querySelectorAll(".mode-button")],
  projectionButtons: [...document.querySelectorAll(".projection-button")],
  undoButton: document.querySelector("#undoButton"),
  redoButton: document.querySelector("#redoButton"),
  zoomOutButton: document.querySelector("#zoomOutButton"),
  resetViewButton: document.querySelector("#resetViewButton"),
  guideToggles: [...document.querySelectorAll(".guide-toggle")],
  guideLineToggle: document.querySelector("#guideLineToggle"),
  latitudeLabelToggle: document.querySelector("#latitudeLabelToggle"),
  oceanColorInput: document.querySelector("#oceanColorInput"),
  landColorInput: document.querySelector("#landColorInput"),
  borderColorInput: document.querySelector("#borderColorInput"),
  borderModeInput: document.querySelector("#borderModeInput"),
  coastlineDetailInput: document.querySelector("#coastlineDetailInput"),
  autoFocusSelectionToggle: document.querySelector("#autoFocusSelectionToggle"),
  unifySelectedCountryColorsToggle: document.querySelector("#unifySelectedCountryColorsToggle"),
  unifiedCountryColorInput: document.querySelector("#unifiedCountryColorInput"),
  frameToggle: document.querySelector("#frameToggle"),
  scaleBarToggle: document.querySelector("#scaleBarToggle"),
  mapFontSizeInput: document.querySelector("#mapFontSizeInput"),
  mapFontSizeValue: document.querySelector("#mapFontSizeValue"),
  selectedBordersOnlyToggle: document.querySelector("#selectedBordersOnlyToggle"),
  downloadSvgButton: document.querySelector("#downloadSvgButton"),
  exportMeta: document.querySelector("#exportMeta"),
  previewStage: document.querySelector("#previewStage"),
  previewHint: document.querySelector("#previewHint"),
  activeModeLabel: document.querySelector("#activeModeLabel"),
  activeModeTitle: document.querySelector("#activeModeTitle"),
  activeModeDescription: document.querySelector("#activeModeDescription"),
  viewZoomLabel: document.querySelector("#viewZoomLabel"),
  workspaceObjectSummary: document.querySelector("#workspaceObjectSummary"),
  workspaceModeTips: document.querySelector("#workspaceModeTips"),
  selectionSummary: document.querySelector("#selectionSummary"),
  koreaLevelButtons: [...document.querySelectorAll(".korea-level-button")],
  koreaParentRegionSelect: document.querySelector("#koreaParentRegionSelect"),
  koreaRegionChipList: document.querySelector("#koreaRegionChipList"),
  activateVisibleKoreaRegionsButton: document.querySelector("#activateVisibleKoreaRegionsButton"),
  clearVisibleKoreaRegionsButton: document.querySelector("#clearVisibleKoreaRegionsButton"),
  unifySelectedColorLabel: document.querySelector("#unifySelectedColorLabel"),
  presetButtons: [...document.querySelectorAll(".preset-button[data-width]")],
  markerStyleInput: document.querySelector("#markerStyleInput"),
  clearAnnotationsButton: document.querySelector("#clearAnnotationsButton"),
  markerList: document.querySelector("#markerList"),
  insetList: document.querySelector("#insetList"),
};

let currentSvgNode = null;
let currentPreviewScale = 1;
let currentRenderContext = null;
let embeddedMapFontDataUrl = null;
let activeGestureScale = 1;
let currentCanvasSurface = null;
const previewInteraction = {
  scale: 1,
  translateX: 0,
  translateY: 0,
  commitTimer: null,
};
const interactionState = {
  temporaryViewMode: null,
};
const keyboardState = {
  temporaryPanSourceMode: null,
};
const historyState = {
  undoStack: [],
  redoStack: [],
  pendingSnapshot: null,
  pendingSerialized: "",
  pendingLabel: "",
  commitTimer: null,
  isApplying: false,
  maxEntries: 80,
};

buildCountryDatalist();
buildKoreaParentRegionOptions();
attachEventListeners();
syncControls();
setStatus(getDefaultStatusMessage());
renderSelectionViews();
renderAnnotations();
renderMap();
void loadEmbeddedMapFontData();

function attachEventListeners() {
  elements.mapVersionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setMapVersion(button.dataset.mapVersion);
    });
  });

  elements.addCountryButton.addEventListener("click", () => {
    addCountriesFromInput(elements.countryInput.value);
  });

  elements.countryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCountriesFromInput(elements.countryInput.value);
    }
  });

  elements.clearSelectionButton.addEventListener("click", () => {
    const currentSelection = getCurrentSelectionEntries();
    if (!currentSelection.length) {
      setStatus(state.mapVersion === "world" ? "비울 선택 국가가 없습니다." : "비울 권역이 없습니다.");
      return;
    }

    beginHistoryStep(state.mapVersion === "world" ? "선택 국가 비우기" : "선택 권역 비우기");
    setCurrentSelectionEntries([]);
    syncActiveStatsCountry();
    resetViewForSelectionIfNeeded();
    renderSelectionViews();
    syncKoreaControls();
    renderMap();
    setStatus(state.mapVersion === "world" ? "선택한 국가를 모두 비웠습니다." : "선택한 권역을 모두 비웠습니다.");
  });

  elements.widthInput.addEventListener("input", () => {
    beginHistoryStep("캔버스 크기 변경");
    state.width = clampCanvasWidth(elements.widthInput.value, state.width);
    syncDimensionInputs();
    syncPresetButtons();
    renderMap();
  });

  elements.heightInput.addEventListener("input", () => {
    beginHistoryStep("캔버스 크기 변경");
    state.height = clampCanvasHeight(elements.heightInput.value, state.height);
    syncDimensionInputs();
    syncPresetButtons();
    renderMap();
  });

  elements.paddingInput.addEventListener("input", () => {
    beginHistoryStep("주변 여백 변경");
    state.paddingPercent = Number(elements.paddingInput.value);
    elements.paddingValue.textContent = `${state.paddingPercent}%`;
    renderMap();
  });

  elements.centerLongitudeInput.addEventListener("input", () => {
    beginHistoryStep("중심 경도 변경");
    state.centerLongitude = Number(elements.centerLongitudeInput.value);
    resetViewWindow();
    syncCenterControls();
    renderMap();
  });

  elements.centerButtons.forEach((button) => {
    button.addEventListener("click", () => {
      beginHistoryStep("중심 경도 변경");
      state.centerLongitude = Number(button.dataset.center);
      resetViewWindow();
      syncCenterControls();
      renderMap();
    });
  });

  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setViewMode(button.dataset.mode);
    });
  });

  elements.koreaLevelButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setKoreaLevel(button.dataset.koreaLevel);
    });
  });

  elements.koreaParentRegionSelect.addEventListener("change", () => {
    setKoreaParentCode(elements.koreaParentRegionSelect.value);
  });

  elements.activateVisibleKoreaRegionsButton.addEventListener("click", () => {
    selectAllVisibleKoreaRegions();
  });

  elements.clearVisibleKoreaRegionsButton.addEventListener("click", () => {
    clearVisibleKoreaRegions();
  });

  elements.projectionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      beginHistoryStep("시점 변경");
      state.projectionMode = button.dataset.projection;
      resetViewWindow();
      syncProjectionButtons();
      renderMap();
      setStatus(`${projectionModeLabels[state.projectionMode]} 시점으로 전환했습니다.`);
    });
  });

  elements.undoButton.addEventListener("click", undoLastChange);
  elements.redoButton.addEventListener("click", redoLastChange);

  elements.zoomOutButton.addEventListener("click", () => {
    if (state.mapVersion !== "world") {
      setStatus("한국 지도는 권역 on/off 전용으로 고정 보기입니다.");
      return;
    }

    if (state.viewZoom <= 1.001 && nearZero(state.viewOffsetX) && nearZero(state.viewOffsetY)) {
      setStatus("이미 전체 보기 상태입니다.");
      return;
    }

    beginHistoryStep("보기 축소");
    zoomOutOneStep();
    renderMap();
    setStatus("한 단계 줌 아웃했습니다.");
  });

  elements.resetViewButton.addEventListener("click", () => {
    if (state.mapVersion !== "world") {
      setStatus("한국 지도는 지도를 이동하지 않고 권역만 켜고 끕니다.");
      return;
    }

    beginHistoryStep("전체 보기");
    resetViewWindow();
    renderMap();
    setStatus("보기 범위를 전체 보기로 되돌렸습니다.");
  });

  elements.guideToggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
      beginHistoryStep("기준선 설정 변경");
      state.guides[toggle.dataset.guide] = toggle.checked;
      renderMap();
    });
  });

  elements.guideLineToggle.addEventListener("change", () => {
    beginHistoryStep("기준선 설정 변경");
    state.showGuideLines = elements.guideLineToggle.checked;
    renderMap();
  });

  elements.latitudeLabelToggle.addEventListener("change", () => {
    beginHistoryStep("기준선 설정 변경");
    state.showLatitudeLabels = elements.latitudeLabelToggle.checked;
    renderMap();
  });

  elements.oceanColorInput.addEventListener("input", () => {
    beginHistoryStep("지도 색상 변경");
    state.oceanColor = elements.oceanColorInput.value;
    renderMap();
  });

  elements.landColorInput.addEventListener("input", () => {
    beginHistoryStep("지도 색상 변경");
    state.landColor = elements.landColorInput.value;
    renderMap();
  });

  elements.borderColorInput.addEventListener("input", () => {
    beginHistoryStep("지도 색상 변경");
    state.borderColor = elements.borderColorInput.value;
    renderMap();
  });

  elements.borderModeInput.addEventListener("change", () => {
    beginHistoryStep("국경선 설정 변경");
    state.borderMode = elements.borderModeInput.value;
    renderMap();
  });

  elements.coastlineDetailInput.addEventListener("change", () => {
    beginHistoryStep("해안선 디테일 변경");
    state.coastlineDetail = elements.coastlineDetailInput.value;
    renderMap();
  });

  elements.autoFocusSelectionToggle.addEventListener("change", () => {
    beginHistoryStep("선택 자동 맞춤 변경");
    state.autoFocusOnSelection = elements.autoFocusSelectionToggle.checked;
    if (state.autoFocusOnSelection) {
      resetViewWindow();
    }
    renderMap();
  });

  elements.unifySelectedCountryColorsToggle.addEventListener("change", () => {
    beginHistoryStep(state.mapVersion === "world" ? "국가 색상 설정 변경" : "권역 색상 설정 변경");
    state.unifySelectedCountryColors = elements.unifySelectedCountryColorsToggle.checked;
    syncStyleControls();
    renderSelectionViews();
    renderMap();
  });

  elements.unifiedCountryColorInput.addEventListener("input", () => {
    beginHistoryStep(state.mapVersion === "world" ? "국가 색상 설정 변경" : "권역 색상 설정 변경");
    state.unifiedSelectedCountryColor = elements.unifiedCountryColorInput.value;
    renderSelectionViews();
    renderMap();
  });

  elements.frameToggle.addEventListener("change", () => {
    beginHistoryStep("프레임 표시 변경");
    state.showFrame = elements.frameToggle.checked;
    renderMap();
  });

  elements.scaleBarToggle.addEventListener("change", () => {
    beginHistoryStep("축척 설정 변경");
    state.showScaleBar = elements.scaleBarToggle.checked;
    renderMap();
  });

  elements.mapFontSizeInput.addEventListener("input", () => {
    beginHistoryStep("글자 크기 변경");
    state.mapFontSizePt = clamp(Number(elements.mapFontSizeInput.value), 7, 9);
    elements.mapFontSizeValue.textContent = formatPointSize(state.mapFontSizePt);
    renderMap();
  });

  elements.selectedBordersOnlyToggle.addEventListener("change", () => {
    beginHistoryStep("국경선 표시 범위 변경");
    state.selectedBordersOnly = elements.selectedBordersOnlyToggle.checked;
    renderMap();
  });

  elements.markerStyleInput.addEventListener("change", () => {
    beginHistoryStep("기본 마커 스타일 변경");
    state.markerDraftStyle = elements.markerStyleInput.value;
  });

  elements.clearAnnotationsButton.addEventListener("click", () => {
    if (!state.markers.length && !state.insets.length) {
      setStatus("지울 표시가 없습니다.");
      return;
    }

    beginHistoryStep("표시 요소 비우기");
    state.markers = [];
    state.insets = [];
    state.nextMarkerSequence = 0;
    state.nextInsetSequence = 0;
    renderAnnotations();
    renderMap();
    setStatus("마커와 인셋을 모두 지웠습니다.");
  });

  elements.downloadSvgButton.addEventListener("click", exportCurrentSvg);

  elements.presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      beginHistoryStep("캔버스 프리셋 변경");
      state.width = clampCanvasWidth(Number(button.dataset.width), state.width);
      state.height = clampCanvasHeight(Number(button.dataset.height), state.height);
      syncDimensionInputs();
      syncPresetButtons();
      renderMap();
    });
  });

  window.addEventListener("resize", () => {
    renderMap();
  });
  window.addEventListener("keydown", handleWindowKeyDown);
  window.addEventListener("keyup", handleWindowKeyUp);
  window.addEventListener("blur", releaseTemporaryViewMode);
}

function cloneStateSnapshot(source = state) {
  return JSON.parse(JSON.stringify(source));
}

function serializeStateSnapshot(snapshot) {
  return JSON.stringify(snapshot);
}

function beginHistoryStep(label) {
  if (historyState.isApplying) {
    return;
  }

  if (!historyState.pendingSnapshot) {
    const snapshot = cloneStateSnapshot();
    historyState.pendingSnapshot = snapshot;
    historyState.pendingSerialized = serializeStateSnapshot(snapshot);
    historyState.pendingLabel = label;
  }

  scheduleHistoryCommit();
  syncHistoryButtons();
}

function scheduleHistoryCommit() {
  if (historyState.commitTimer) {
    window.clearTimeout(historyState.commitTimer);
  }

  historyState.commitTimer = window.setTimeout(() => {
    commitPendingHistoryStep();
  }, 260);
}

function clearPendingHistoryStep() {
  if (historyState.commitTimer) {
    window.clearTimeout(historyState.commitTimer);
    historyState.commitTimer = null;
  }

  historyState.pendingSnapshot = null;
  historyState.pendingSerialized = "";
  historyState.pendingLabel = "";
}

function hasPendingHistoryChange() {
  if (!historyState.pendingSnapshot) {
    return false;
  }

  return serializeStateSnapshot(cloneStateSnapshot()) !== historyState.pendingSerialized;
}

function commitPendingHistoryStep() {
  if (!historyState.pendingSnapshot) {
    syncHistoryButtons();
    return;
  }

  const currentSnapshot = cloneStateSnapshot();
  const currentSerialized = serializeStateSnapshot(currentSnapshot);

  if (currentSerialized !== historyState.pendingSerialized) {
    historyState.undoStack.push({
      label: historyState.pendingLabel || "편집",
      snapshot: historyState.pendingSnapshot,
    });

    if (historyState.undoStack.length > historyState.maxEntries) {
      historyState.undoStack.shift();
    }

    historyState.redoStack = [];
  }

  clearPendingHistoryStep();
  syncHistoryButtons();
}

function flushPendingHistory() {
  if (!historyState.pendingSnapshot) {
    syncHistoryButtons();
    return;
  }

  if (historyState.commitTimer) {
    window.clearTimeout(historyState.commitTimer);
    historyState.commitTimer = null;
  }

  commitPendingHistoryStep();
}

function syncHistoryButtons() {
  elements.undoButton.disabled = false;
  elements.redoButton.disabled = false;
}

function applyStateSnapshot(snapshot) {
  historyState.isApplying = true;

  const nextState = cloneStateSnapshot(snapshot);
  Object.keys(nextState).forEach((key) => {
    state[key] = nextState[key];
  });
  normalizeCanvasStateDimensions();
  syncActiveStatsCountry(state.activeStatsCountryId);

  syncControls();
  renderSelectionViews();
  renderAnnotations();
  renderMap();

  historyState.isApplying = false;
  syncHistoryButtons();
}

function undoLastChange() {
  flushPendingHistory();

  if (!historyState.undoStack.length) {
    setStatus("되돌릴 작업이 없습니다.");
    return;
  }

  const entry = historyState.undoStack.pop();
  historyState.redoStack.push({
    label: entry.label,
    snapshot: cloneStateSnapshot(),
  });
  applyStateSnapshot(entry.snapshot);
  setStatus(`${entry.label || "최근 작업"}을 되돌렸습니다.`);
}

function redoLastChange() {
  flushPendingHistory();

  if (!historyState.redoStack.length) {
    setStatus("다시 실행할 작업이 없습니다.");
    return;
  }

  const entry = historyState.redoStack.pop();
  historyState.undoStack.push({
    label: entry.label,
    snapshot: cloneStateSnapshot(),
  });
  applyStateSnapshot(entry.snapshot);
  setStatus(`${entry.label || "최근 작업"}을 다시 실행했습니다.`);
}

function getActiveViewMode() {
  return interactionState.temporaryViewMode ?? state.viewMode;
}

function setViewMode(mode, { silent = false } = {}) {
  if (!viewModeLabels[mode] || state.viewMode === mode) {
    interactionState.temporaryViewMode = null;
    keyboardState.temporaryPanSourceMode = null;
    refreshInteractionUi();
    return;
  }

  state.viewMode = mode;
  interactionState.temporaryViewMode = null;
  keyboardState.temporaryPanSourceMode = null;
  refreshInteractionUi();

  if (!silent) {
    setStatus(`${viewModeLabels[state.viewMode]} 모드로 전환했습니다.`);
  }
}

function refreshInteractionUi() {
  syncModeButtons();
  updatePreviewHint();
  syncPreviewCanvasMode();
  updateWorkspaceStats();
}

function syncPreviewCanvasMode() {
  const shell = elements.previewStage.querySelector(".canvas-shell");
  if (!shell) {
    return;
  }

  Object.keys(viewModeLabels).forEach((mode) => {
    shell.classList.toggle(`mode-${mode}`, state.mapVersion === "world" && getActiveViewMode() === mode);
  });
}

function handleWindowKeyDown(event) {
  if (isFormControl(event.target)) {
    return;
  }

  const isModifierPressed = event.metaKey || event.ctrlKey;
  if (isModifierPressed && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) {
      redoLastChange();
      return;
    }

    undoLastChange();
    return;
  }

  if (event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redoLastChange();
    return;
  }

  if (state.mapVersion !== "world") {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    if (!keyboardState.temporaryPanSourceMode && getActiveViewMode() !== "pan") {
      keyboardState.temporaryPanSourceMode = state.viewMode;
      interactionState.temporaryViewMode = "pan";
      refreshInteractionUi();
    }
    return;
  }

  if (event.repeat) {
    return;
  }

  if (event.code === "Digit1") {
    event.preventDefault();
    setViewMode("zoom");
    return;
  }

  if (event.code === "Digit2") {
    event.preventDefault();
    setViewMode("pan");
    return;
  }

  if (event.code === "Digit3") {
    event.preventDefault();
    setViewMode("marker");
    return;
  }

  if (event.code === "Digit4") {
    event.preventDefault();
    setViewMode("inset");
    return;
  }

  if ((event.key === "+" || event.key === "=") && currentRenderContext) {
    event.preventDefault();
    beginHistoryStep("보기 확대");
    applyRelativeZoom(1.25, { x: state.width / 2, y: state.height / 2 });
    renderMap();
    setStatus("한 단계 확대했습니다.");
    return;
  }

  if ((event.key === "-" || event.key === "_") && currentRenderContext) {
    event.preventDefault();
    beginHistoryStep("보기 축소");
    zoomOutOneStep();
    renderMap();
    setStatus("한 단계 줌 아웃했습니다.");
    return;
  }

  if (event.key === "0" && currentRenderContext) {
    event.preventDefault();
    beginHistoryStep("전체 보기");
    resetViewWindow();
    renderMap();
    setStatus("보기 범위를 전체 보기로 되돌렸습니다.");
  }
}

function handleWindowKeyUp(event) {
  if (state.mapVersion !== "world") {
    return;
  }

  if (event.code !== "Space") {
    return;
  }

  releaseTemporaryViewMode();
}

function releaseTemporaryViewMode() {
  if (!keyboardState.temporaryPanSourceMode) {
    return;
  }

  interactionState.temporaryViewMode = null;
  keyboardState.temporaryPanSourceMode = null;
  refreshInteractionUi();
}

function isFormControl(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, select, textarea, [contenteditable='true']"));
}

function getDefaultStatusMessage() {
  return state.mapVersion === "world"
    ? "영역 확대 모드에서 드래그하면 원하는 부분만 바로 크게 잡을 수 있습니다."
    : "한국 지도에서는 지도를 움직이기보다 권역을 바로 켜고 끄면서 구도를 만듭니다.";
}

function buildKoreaParentRegionOptions() {
  const fragment = document.createDocumentFragment();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "광역시도를 먼저 고르세요";
  fragment.appendChild(placeholder);

  koreaDatasets.provinces.features.forEach((feature) => {
    const option = document.createElement("option");
    option.value = feature.id;
    option.textContent = feature.properties.name;
    fragment.appendChild(option);
  });

  elements.koreaParentRegionSelect.replaceChildren(fragment);
}

function setSectionVisibility(nodes, isVisible) {
  nodes.forEach((node) => {
    node.hidden = !isVisible;
    node.style.display = isVisible ? "" : "none";
  });
}

function setMapVersion(mapVersion, { silent = false } = {}) {
  if (!mapVersionLabels[mapVersion] || state.mapVersion === mapVersion) {
    syncMapVersionControls();
    return;
  }

  beginHistoryStep("지도 버전 변경");
  state.mapVersion = mapVersion;
  interactionState.temporaryViewMode = null;
  keyboardState.temporaryPanSourceMode = null;
  syncControls();
  renderSelectionViews();
  renderMap();

  if (!silent) {
    setStatus(
      state.mapVersion === "world"
        ? "세계 지도 모드로 돌아왔습니다."
        : "대한민국 권역 지도 모드로 전환했습니다.",
    );
  }
}

function setKoreaLevel(level, { silent = false } = {}) {
  if (!koreaRegionLevelLabels[level] || state.koreaLevel === level) {
    syncKoreaControls();
    return;
  }

  beginHistoryStep("한국 권역 레벨 변경");
  state.koreaLevel = level;
  if (level === "municipalities" && !state.koreaParentCode) {
    state.koreaParentCode = inferPreferredKoreaParentCode();
  }
  syncControls();
  renderSelectionViews();
  renderMap();

  if (!silent) {
    setStatus(`${koreaRegionLevelLabels[level]} 보기로 전환했습니다.`);
  }
}

function inferPreferredKoreaParentCode() {
  if (state.koreaSelectedProvinces.length === 1) {
    return state.koreaSelectedProvinces[0].id;
  }

  const municipalityParents = [...new Set(state.koreaSelectedMunicipalities.map((region) => region.parentCode))];
  return municipalityParents.length === 1 ? municipalityParents[0] : "";
}

function setKoreaParentCode(code, { silent = false } = {}) {
  const nextCode = code && koreaProvinceByCode.has(code) ? code : "";
  if (state.koreaParentCode === nextCode) {
    syncKoreaControls();
    return;
  }

  beginHistoryStep("시군구 범위 변경");
  state.koreaParentCode = nextCode;
  syncKoreaControls();
  renderMap();

  if (!silent) {
    setStatus(
      nextCode
        ? `${getKoreaProvinceName(nextCode)} 시/군/구 보기로 전환했습니다.`
        : "시/군/구 범위 선택을 초기화했습니다.",
    );
  }
}

function syncMapVersionControls() {
  const isWorldMode = state.mapVersion === "world";
  document.body.dataset.mapVersion = state.mapVersion;
  setSectionVisibility(elements.worldSections, isWorldMode);
  setSectionVisibility(elements.koreaSections, !isWorldMode);
  elements.mapVersionButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mapVersion === state.mapVersion);
  });
  elements.selectionCardTitle.textContent = isWorldMode ? "국가 선택" : "한국 권역 선택";
  elements.selectionDetailTitle.textContent = isWorldMode ? "선택 국가" : "선택 권역";
  elements.selectionDetailHint.textContent = isWorldMode
    ? "검색창 또는 지도 클릭으로 추가한 국가를 여기서 색상과 함께 관리합니다."
    : "도/광역시 또는 시/군/구 권역을 켜고 끈 결과를 여기서 색상과 함께 관리합니다.";
  elements.unifySelectedColorLabel.textContent = isWorldMode ? "선택 국가 색상 통일" : "선택 권역 색상 통일";
  elements.modeButtons.forEach((button) => {
    button.disabled = !isWorldMode;
  });
  elements.zoomOutButton.disabled = !isWorldMode;
  elements.resetViewButton.disabled = !isWorldMode;
}

function syncKoreaControls() {
  elements.koreaLevelButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.koreaLevel === state.koreaLevel);
  });

  elements.koreaParentRegionSelect.value = state.koreaParentCode;
  elements.koreaParentRegionSelect.disabled = state.koreaLevel !== "municipalities";
  renderKoreaRegionChips();
}

function syncControls() {
  normalizeCanvasStateDimensions();
  syncMapVersionControls();
  syncDimensionInputs();
  syncPresetButtons();
  syncCenterControls();
  syncModeButtons();
  syncProjectionButtons();
  syncGuideControls();
  syncStyleControls();
  syncKoreaControls();
  updatePreviewHint();
  updateWorkspaceStats();
  syncHistoryButtons();
}

function syncDimensionInputs() {
  elements.widthInput.value = String(clampCanvasWidth(state.width));
  elements.heightInput.value = String(clampCanvasHeight(state.height));
}

function syncPresetButtons() {
  elements.presetButtons.forEach((button) => {
    const isActive =
      Number(button.dataset.width) === state.width && Number(button.dataset.height) === state.height;
    button.classList.toggle("is-active", isActive);
  });
}

function syncCenterControls() {
  elements.centerLongitudeInput.value = String(state.centerLongitude);
  elements.centerLongitudeValue.textContent = formatLongitude(state.centerLongitude);
  elements.centerButtons.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.center) === state.centerLongitude);
  });
}

function syncModeButtons() {
  const activeMode = getActiveViewMode();
  elements.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === activeMode);
  });
}

function syncProjectionButtons() {
  elements.projectionButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.projection === state.projectionMode);
  });
}

function syncGuideControls() {
  elements.guideToggles.forEach((toggle) => {
    toggle.checked = Boolean(state.guides[toggle.dataset.guide]);
  });
}

function syncStyleControls() {
  const canShowCanvasFrame = state.projectionMode === "rectangular" || state.mapVersion === "korea";
  elements.paddingValue.textContent = `${state.paddingPercent}%`;
  elements.oceanColorInput.value = state.oceanColor;
  elements.landColorInput.value = state.landColor;
  elements.borderColorInput.value = state.borderColor;
  elements.borderModeInput.value = state.borderMode;
  elements.coastlineDetailInput.value = state.coastlineDetail;
  elements.autoFocusSelectionToggle.checked = Boolean(state.autoFocusOnSelection);
  elements.unifySelectedCountryColorsToggle.checked = Boolean(state.unifySelectedCountryColors);
  elements.unifiedCountryColorInput.value = getUnifiedSelectedCountryColor();
  elements.unifiedCountryColorInput.disabled = !state.unifySelectedCountryColors;
  elements.frameToggle.checked = canShowCanvasFrame ? state.showFrame : false;
  elements.frameToggle.disabled = !canShowCanvasFrame;
  elements.frameToggle.title = canShowCanvasFrame ? "" : "극 시점에서는 바깥 프레임 대신 원형 윤곽선을 사용합니다.";
  elements.scaleBarToggle.checked = state.showScaleBar;
  elements.guideLineToggle.checked = state.showGuideLines;
  elements.latitudeLabelToggle.checked = state.showLatitudeLabels;
  elements.mapFontSizeInput.value = String(state.mapFontSizePt);
  elements.mapFontSizeValue.textContent = formatPointSize(state.mapFontSizePt);
  elements.selectedBordersOnlyToggle.checked = state.selectedBordersOnly;
  elements.markerStyleInput.value = state.markerDraftStyle;
}

function updatePreviewHint() {
  if (state.mapVersion === "korea") {
    const scopeText =
      state.koreaLevel === "municipalities" && state.koreaParentCode
        ? `${getKoreaProvinceName(state.koreaParentCode)} 범위에서 권역을 켜고 끄고 있습니다.`
        : "광역시도 또는 시/군/구 권역을 클릭해서 바로 켜고 끌 수 있습니다.";
    elements.previewHint.textContent = scopeText;
    elements.activeModeLabel.textContent = "권역 on/off";
    elements.activeModeTitle.textContent = "권역 on/off";
    elements.activeModeDescription.textContent =
      "한국 지도에서는 지도를 이동하지 않고 권역을 바로 켜고 끄며 구도를 정합니다.";
    renderWorkspaceModeTips(
      state.koreaLevel === "municipalities"
        ? ["클릭: 권역 on/off", "상위 범위: 광역시도 선택", "Undo: 최근 변경 되돌리기"]
        : ["클릭: 권역 on/off", "레벨 전환: 도/광역시/시·군·구", "Undo: 최근 변경 되돌리기"],
    );
    return;
  }

  const activeMode = getActiveViewMode();
  const details = viewModeDetails[activeMode] ?? viewModeDetails.zoom;

  elements.previewHint.textContent = details.hint;
  elements.activeModeLabel.textContent = viewModeLabels[activeMode] ?? viewModeLabels.zoom;
  elements.activeModeTitle.textContent = viewModeLabels[activeMode] ?? viewModeLabels.zoom;
  elements.activeModeDescription.textContent = details.description;
  renderWorkspaceModeTips(details.tips);
}

function renderWorkspaceModeTips(tips = []) {
  elements.workspaceModeTips.replaceChildren();

  tips.forEach((tip) => {
    const item = document.createElement("span");
    item.className = "workspace-mode-tip";
    item.textContent = tip;
    elements.workspaceModeTips.appendChild(item);
  });
}

function updateWorkspaceStats() {
  if (state.mapVersion === "korea") {
    const currentSelection = getCurrentSelectionEntries();
    elements.viewZoomLabel.textContent = "고정 보기";
    elements.workspaceObjectSummary.textContent =
      `권역 ${currentSelection.length} · ${koreaRegionLevelLabels[state.koreaLevel]}` +
      (state.koreaLevel === "municipalities" && state.koreaParentCode
        ? ` · ${getKoreaProvinceName(state.koreaParentCode)}`
        : "");
    return;
  }

  const zoomRatio = state.viewZoom * previewInteraction.scale;
  elements.viewZoomLabel.textContent = `${Math.round(zoomRatio * 100)}%`;
  elements.workspaceObjectSummary.textContent =
    `국가 ${state.selected.length} · 마커 ${state.markers.length} · 인셋 ${state.insets.length}`;
}

function buildCountryDatalist() {
  const fragment = document.createDocumentFragment();

  countryFeatures.forEach((feature) => {
    const option = document.createElement("option");
    option.value = feature.properties.name;
    fragment.appendChild(option);
  });

  elements.countryOptions.appendChild(fragment);
}

function addCountriesFromInput(rawValue) {
  if (state.mapVersion !== "world") {
    setStatus("한국 지도에서는 검색 대신 권역 칩이나 지도 클릭으로 선택합니다.");
    return;
  }

  const tokens = rawValue
    .split(/[,\n]/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (!tokens.length) {
    setStatus("추가할 국가명을 입력해 주세요.", true);
    return;
  }

  beginHistoryStep("국가 추가");
  const addedNames = [];
  const addedIds = [];
  const missingNames = [];

  tokens.forEach((token) => {
    const country = findCountry(token);
    if (!country) {
      missingNames.push(token);
      return;
    }

    if (state.selected.some((item) => item.id === country.id)) {
      return;
    }

    state.selected.push({
      id: country.id,
      name: country.properties.name,
      color: nextPaletteColor(state.selected.length),
    });
    addedNames.push(country.properties.name);
    addedIds.push(country.id);
  });

  elements.countryInput.value = "";

  if (addedNames.length) {
    syncActiveStatsCountry(addedIds[addedIds.length - 1] ?? null);
    resetViewForSelectionIfNeeded();
    setStatus(`${addedNames.join(", ")} 추가됨`);
  } else if (missingNames.length) {
    setStatus(`찾을 수 없는 국가: ${missingNames.join(", ")}`, true);
  } else {
    setStatus("이미 선택된 국가입니다.");
  }

  renderSelectionViews();
  renderMap();
}

function findCountry(query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return null;
  }

  if (countryByAlias.has(normalizedQuery)) {
    return countryByAlias.get(normalizedQuery);
  }

  const exactMatch = countryByNormalizedName.get(normalizedQuery);
  if (exactMatch) {
    return exactMatch;
  }

  const partialMatches = countryFeatures.filter((feature) =>
    normalizeText(feature.properties.name).includes(normalizedQuery),
  );

  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  const aliasMatches = [...countryByAlias.entries()]
    .filter(([alias]) => alias.includes(normalizedQuery))
    .map(([, feature]) => feature)
    .filter(Boolean);

  if (aliasMatches.length === 1) {
    return aliasMatches[0];
  }

  return partialMatches[0] ?? null;
}

function normalizeText(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function nextPaletteColor(index = state.selected.length) {
  return atlasPalette[index % atlasPalette.length];
}

function getCurrentSelectionEntries() {
  if (state.mapVersion === "world") {
    return state.selected;
  }

  return state.koreaLevel === "provinces" ? state.koreaSelectedProvinces : state.koreaSelectedMunicipalities;
}

function setCurrentSelectionEntries(entries) {
  if (state.mapVersion === "world") {
    state.selected = entries;
    return;
  }

  if (state.koreaLevel === "provinces") {
    state.koreaSelectedProvinces = entries;
    return;
  }

  state.koreaSelectedMunicipalities = entries;
}

function getKoreaProvinceName(code) {
  return koreaProvinceByCode.get(code)?.properties?.name ?? code;
}

function formatSelectionDisplayName(selection) {
  if (state.mapVersion === "korea" && state.koreaLevel === "municipalities") {
    return `${getKoreaProvinceName(selection.parentCode)} · ${selection.name}`;
  }

  return selection.name;
}

function getCurrentSelectionEmptyMessage() {
  if (state.mapVersion === "world") {
    return "아직 선택된 국가가 없습니다. 검색창이나 미리보기 클릭으로 추가해 보세요.";
  }

  if (state.koreaLevel === "municipalities" && !state.koreaParentCode) {
    return "시/군/구를 보려면 먼저 광역시도를 고르거나 지도에서 한 번 클릭해 주세요.";
  }

  return "아직 선택된 권역이 없습니다. 권역 칩이나 미리보기 클릭으로 추가해 보세요.";
}

function createKoreaSelectionEntry(feature, color = nextPaletteColor(getCurrentSelectionEntries().length)) {
  return {
    id: feature.id,
    name: feature.properties.name,
    parentCode: feature.properties.parentCode,
    color,
  };
}

function getVisibleKoreaSelectableFeatures() {
  if (state.koreaLevel === "provinces") {
    return koreaDatasets.provinces.features;
  }

  if (!state.koreaParentCode) {
    return [];
  }

  return koreaMunicipalitiesByParentCode.get(state.koreaParentCode) ?? [];
}

function getKoreaHitTestFeatures() {
  if (state.koreaLevel === "provinces") {
    return koreaDatasets.provinces.features;
  }

  if (!state.koreaParentCode) {
    return koreaDatasets.provinces.features;
  }

  return getVisibleKoreaSelectableFeatures();
}

function renderKoreaRegionChips() {
  elements.koreaRegionChipList.replaceChildren();

  if (state.mapVersion !== "korea") {
    return;
  }

  const visibleFeatures = getVisibleKoreaSelectableFeatures();
  const selectedIds = new Set(getCurrentSelectionEntries().map((selection) => selection.id));

  if (!visibleFeatures.length) {
    const emptyText =
      state.koreaLevel === "municipalities"
        ? "시/군/구를 보려면 먼저 광역시도를 고르거나 지도에서 한 번 클릭해 주세요."
        : "표시할 권역이 없습니다.";
    elements.koreaRegionChipList.appendChild(createEmptyState(emptyText));
    elements.activateVisibleKoreaRegionsButton.disabled = true;
    elements.clearVisibleKoreaRegionsButton.disabled = true;
    return;
  }

  const fragment = document.createDocumentFragment();

  visibleFeatures.forEach((feature) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tw-chip region-chip";
    button.textContent = feature.properties.name;
    button.classList.toggle("is-active", selectedIds.has(feature.id));
    button.addEventListener("click", () => {
      toggleKoreaRegion(feature.id);
    });
    fragment.appendChild(button);
  });

  elements.koreaRegionChipList.appendChild(fragment);
  elements.activateVisibleKoreaRegionsButton.disabled = false;
  elements.clearVisibleKoreaRegionsButton.disabled = false;
}

function selectAllVisibleKoreaRegions() {
  const visibleFeatures = getVisibleKoreaSelectableFeatures();
  if (!visibleFeatures.length) {
    setStatus("현재 켤 수 있는 권역이 없습니다.");
    return;
  }

  const selections = [...getCurrentSelectionEntries()];
  const existingIds = new Set(selections.map((selection) => selection.id));
  let paletteIndex = selections.length;
  let addedCount = 0;

  visibleFeatures.forEach((feature) => {
    if (existingIds.has(feature.id)) {
      return;
    }

    selections.push(createKoreaSelectionEntry(feature, nextPaletteColor(paletteIndex)));
    existingIds.add(feature.id);
    paletteIndex += 1;
    addedCount += 1;
  });

  if (!addedCount) {
    setStatus("현재 보이는 권역은 이미 모두 켜져 있습니다.");
    return;
  }

  beginHistoryStep("권역 선택 변경");
  setCurrentSelectionEntries(selections);
  renderSelectionViews();
  syncKoreaControls();
  renderMap();
  setStatus(`현재 보이는 ${visibleFeatures.length}개 권역을 켰습니다.`);
}

function clearVisibleKoreaRegions() {
  const visibleFeatures = getVisibleKoreaSelectableFeatures();
  if (!visibleFeatures.length) {
    setStatus("현재 끌 수 있는 권역이 없습니다.");
    return;
  }

  const visibleIds = new Set(visibleFeatures.map((feature) => feature.id));
  const currentSelection = getCurrentSelectionEntries();
  const nextSelection = currentSelection.filter((selection) => !visibleIds.has(selection.id));

  if (nextSelection.length === currentSelection.length) {
    setStatus("현재 보이는 권역 중 꺼진 항목만 있습니다.");
    return;
  }

  beginHistoryStep("권역 선택 변경");
  setCurrentSelectionEntries(nextSelection);
  renderSelectionViews();
  syncKoreaControls();
  renderMap();
  setStatus("현재 보이는 권역을 모두 껐습니다.");
}

function getUnifiedSelectedCountryColor() {
  return state.unifiedSelectedCountryColor || atlasPalette[0];
}

function getSelectedCountryColor(country) {
  if (state.unifySelectedCountryColors) {
    return getUnifiedSelectedCountryColor();
  }

  return country.color || atlasPalette[0];
}

function buildSelectedColorById() {
  return new Map(getCurrentSelectionEntries().map((country) => [country.id, getSelectedCountryColor(country)]));
}

function resetViewForSelectionIfNeeded() {
  if (state.mapVersion === "world" && state.autoFocusOnSelection) {
    resetViewWindow();
  }
}

function syncActiveStatsCountry(preferredId = null) {
  if (state.mapVersion !== "world") {
    return;
  }

  const selectedIds = new Set(state.selected.map((country) => country.id));
  if (preferredId && selectedIds.has(preferredId)) {
    state.activeStatsCountryId = preferredId;
    return;
  }

  if (state.activeStatsCountryId && selectedIds.has(state.activeStatsCountryId)) {
    return;
  }

  state.activeStatsCountryId = state.selected[state.selected.length - 1]?.id ?? null;
}

function renderSelectionViews() {
  renderSelectedCountries();
  renderCountryStatsPanel();
}

function getActiveStatsCountry() {
  if (state.mapVersion !== "world") {
    return null;
  }

  syncActiveStatsCountry();
  return state.selected.find((country) => country.id === state.activeStatsCountryId) ?? null;
}

function renderSelectedCountries() {
  elements.selectedCountryList.replaceChildren();

  const currentSelection = getCurrentSelectionEntries();
  if (state.mapVersion === "world") {
    syncActiveStatsCountry();
  }

  if (!currentSelection.length) {
    elements.selectedCountryList.appendChild(createEmptyState(getCurrentSelectionEmptyMessage()));
    return;
  }

  currentSelection.forEach((country) => {
    const displayedColor = getSelectedCountryColor(country);
    const listItem = document.createElement("li");
    listItem.className = "selected-country-item";

    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.backgroundColor = displayedColor;

    const textWrap = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = formatSelectionDisplayName(country);
    const code = document.createElement("span");
    const baseMetaText = state.unifySelectedCountryColors
      ? "통일 색상 사용 중"
      : state.mapVersion === "world"
        ? "색상은 자유롭게 바꿀 수 있습니다"
        : `${koreaRegionLevelLabels[state.koreaLevel]} · 색상은 자유롭게 바꿀 수 있습니다`;
    code.textContent =
      state.mapVersion === "world" && country.id === state.activeStatsCountryId
        ? `현재 통계 패널 표시 중 · ${baseMetaText}`
        : baseMetaText;
    textWrap.append(name, code);

    const controls = document.createElement("div");
    controls.className = "inline-actions";

    if (state.mapVersion === "world") {
      const statsButton = document.createElement("button");
      statsButton.className = "remove-button tw-button";
      statsButton.type = "button";
      statsButton.textContent = country.id === state.activeStatsCountryId ? "보고 있음" : "통계";
      statsButton.disabled = country.id === state.activeStatsCountryId;
      statsButton.addEventListener("click", () => {
        state.activeStatsCountryId = country.id;
        renderSelectionViews();
      });
      controls.appendChild(statsButton);
    }

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = displayedColor;
    colorInput.disabled = state.unifySelectedCountryColors;
    colorInput.title = state.unifySelectedCountryColors ? "통일 색상 옵션이 켜져 있어 개별 색상 편집이 잠겨 있습니다." : "";
    colorInput.setAttribute("aria-label", `${formatSelectionDisplayName(country)} 색상`);
    colorInput.addEventListener("input", () => {
      beginHistoryStep(state.mapVersion === "world" ? "국가 색상 변경" : "권역 색상 변경");
      country.color = colorInput.value;
      swatch.style.backgroundColor = colorInput.value;
      renderMap();
    });

    const removeButton = document.createElement("button");
    removeButton.className = "remove-button tw-button";
    removeButton.type = "button";
    removeButton.textContent = "제거";
    removeButton.addEventListener("click", () => {
      removeSelectionEntry(country.id);
      setStatus(`${formatSelectionDisplayName(country)} 제거됨`);
    });

    controls.append(colorInput, removeButton);
    listItem.append(swatch, textWrap, controls);
    elements.selectedCountryList.appendChild(listItem);
  });
}

function renderCountryStatsPanel() {
  if (!elements.countryStatsPanel) {
    return;
  }

  elements.countryStatsPanel.replaceChildren();

  if (state.mapVersion !== "world") {
    return;
  }

  if (!state.selected.length) {
    elements.countryStatsPanel.appendChild(
      createEmptyState("국가를 선택하면 인구, 도시화, FAOSTAT, 종교, 에너지 통계를 여기서 함께 볼 수 있습니다."),
    );
    return;
  }

  const activeCountry = getActiveStatsCountry();
  const stats = activeCountry ? countryStatsById[activeCountry.id] ?? null : null;
  const shell = document.createElement("div");
  shell.className = "country-stats-shell";

  if (state.selected.length > 1) {
    shell.appendChild(buildCountryStatsTabs(activeCountry?.id ?? null));
  }

  shell.appendChild(buildCountryStatsHeader(activeCountry, stats));
  shell.appendChild(buildCountryStatsSummaryGrid(stats));

  const sectionGrid = document.createElement("div");
  sectionGrid.className = "country-stats-section-grid";
  sectionGrid.append(
    buildPopulationStatsSection(stats?.population),
    buildAgricultureStatsSection(stats?.agriculture),
    buildReligionStatsSection(stats?.religion2020),
    buildEnergyStatsSection(
      stats?.energy?.consumption,
      "에너지 소비 구조",
      "최신 가용연도 기준 1차 에너지 소비를 화석·재생·원자력 비중과 세부 에너지원으로 정리했습니다.",
    ),
    buildEnergyStatsSection(
      stats?.energy?.electricity,
      "발전 구조",
      "최신 가용연도 기준 발전량 구성을 비중 중심으로 정리했습니다.",
    ),
  );
  shell.appendChild(sectionGrid);
  shell.appendChild(buildCountryStatsSourceRow());

  elements.countryStatsPanel.appendChild(shell);
}

function buildCountryStatsTabs(activeId) {
  const tabs = document.createElement("div");
  tabs.className = "country-stats-tabs";

  state.selected.forEach((country) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "country-stats-tab";
    button.classList.toggle("is-active", country.id === activeId);
    button.textContent = country.name;
    button.addEventListener("click", () => {
      state.activeStatsCountryId = country.id;
      renderSelectionViews();
    });
    tabs.appendChild(button);
  });

  return tabs;
}

function buildCountryStatsHeader(activeCountry, stats) {
  const header = document.createElement("div");
  header.className = "country-stats-header";

  const copy = document.createElement("div");
  const kicker = document.createElement("p");
  kicker.className = "tw-kicker";
  kicker.textContent = stats?.iso3 ? `선택 국가 · ${stats.iso3}` : "선택 국가";
  const title = document.createElement("h4");
  title.className = "country-stats-header__title";
  title.textContent = activeCountry?.name ?? "통계 국가 없음";
  const description = document.createElement("p");
  description.className = "country-stats-header__meta";
  description.textContent = stats
    ? buildCountryStatsMetaText(stats)
    : "이 국가는 현재 로컬 통계 묶음에 포함된 항목이 적어 일부 카드만 표시될 수 있습니다.";
  copy.append(kicker, title, description);

  const note = document.createElement("div");
  note.className = "country-stats-source";
  note.innerHTML = `<strong>생성 기준</strong><br />${countryStatsMeta.generatedAt ?? "알 수 없음"} · 최신 가용연도 기준`;

  header.append(copy, note);
  return header;
}

function buildCountryStatsMetaText(stats) {
  const parts = [];

  if (stats.population?.latestYear) {
    parts.push(`인구 ${stats.population.latestYear}`);
  }

  const faostatYears = [
    ...Object.values(stats.agriculture?.crops ?? {}).map((entry) => entry.year),
    ...Object.values(stats.agriculture?.livestock ?? {}).map((entry) => entry.year),
  ].filter(Boolean);
  if (faostatYears.length) {
    parts.push(`FAOSTAT ${Math.max(...faostatYears)}`);
  }

  if (stats.religion2020?.year) {
    parts.push(`종교 ${stats.religion2020.year}`);
  }

  if (stats.energy?.consumption?.year) {
    parts.push(`에너지 ${stats.energy.consumption.year}`);
  }

  if (!parts.length) {
    return "선택 국가의 세부 통계가 아직 준비되지 않았습니다.";
  }

  return `${parts.join(" · ")} 기준으로 묶은 통계입니다. 인구/도시화는 10년 단위와 최신 가용연도를 함께 보여줍니다.`;
}

function buildCountryStatsSummaryGrid(stats) {
  const grid = document.createElement("div");
  grid.className = "country-stats-summary-grid";

  const latestPopulationRow = getLatestPopulationRow(stats?.population);
  const topReligion = getTopReligionShare(stats?.religion2020);
  const energySummary = stats?.energy?.consumption?.summaryShares ?? null;

  grid.append(
    createCountryStatsSummaryCard(
      "최신 인구",
      latestPopulationRow ? formatStatNumber(latestPopulationRow.population) : "자료 없음",
      latestPopulationRow ? `${latestPopulationRow.year}년` : "UN 최신 가용연도",
    ),
    createCountryStatsSummaryCard(
      "도시화율",
      latestPopulationRow?.urbanShare != null ? formatPercent(latestPopulationRow.urbanShare) : "자료 없음",
      latestPopulationRow?.urbanPopulation != null
        ? `도시 인구 ${formatStatNumber(latestPopulationRow.urbanPopulation)}명`
        : "도시 인구 추정치 없음",
    ),
    createCountryStatsSummaryCard(
      "종교 구도",
      topReligion ? `${topReligion.label} ${formatPercent(topReligion.value)}` : "자료 없음",
      stats?.religion2020?.year ? `${stats.religion2020.year}년 Pew 기준` : "Pew 2020 없음",
    ),
    createCountryStatsSummaryCard(
      "에너지 소비",
      energySummary ? `화석 ${formatPercent(energySummary.fossil)}` : "자료 없음",
      energySummary
        ? `재생 ${formatPercent(energySummary.renewables)} · 원자력 ${formatPercent(energySummary.nuclear)}`
        : "최신 가용연도 데이터 없음",
    ),
  );

  return grid;
}

function createCountryStatsSummaryCard(label, value, detail) {
  const card = document.createElement("div");
  card.className = "country-stats-summary-card";

  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  const valueNode = document.createElement("strong");
  valueNode.textContent = value;
  const detailNode = document.createElement("small");
  detailNode.textContent = detail;

  card.append(labelNode, valueNode, detailNode);
  return card;
}

function buildPopulationStatsSection(population) {
  const section = createCountryStatsSection(
    "인구 · 도시화",
    "UN 기반 시계열을 10년 단위와 최신 가용연도로 묶었습니다.",
  );

  if (!population?.rows?.length) {
    section.appendChild(createCountryStatsUnavailable("표시할 인구/도시화 시계열이 없습니다."));
    return section;
  }

  const table = document.createElement("table");
  table.className = "country-stats-table";

  const thead = document.createElement("thead");
  thead.innerHTML =
    "<tr><th>연도</th><th>총인구</th><th>도시화율</th><th>도시인구</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  population.rows.forEach((row) => {
    const tableRow = document.createElement("tr");
    tableRow.innerHTML =
      `<td>${row.year}</td>` +
      `<td>${formatStatNumber(row.population)}</td>` +
      `<td>${row.urbanShare != null ? formatPercent(row.urbanShare) : "자료 없음"}</td>` +
      `<td>${row.urbanPopulation != null ? formatStatNumber(row.urbanPopulation) : "자료 없음"}</td>`;
    tbody.appendChild(tableRow);
  });
  table.appendChild(tbody);
  section.appendChild(table);
  return section;
}

function buildAgricultureStatsSection(agriculture) {
  const section = createCountryStatsSection(
    "FAOSTAT 최신 농축산",
    "밀·쌀·옥수수 생산량과 소·돼지·양 사육두수의 최신 가용연도입니다.",
  );

  const metricGrid = document.createElement("div");
  metricGrid.className = "country-stats-metric-grid";

  [
    ["crops", "wheat"],
    ["crops", "rice"],
    ["crops", "maize"],
    ["livestock", "cattle"],
    ["livestock", "pigs"],
    ["livestock", "sheep"],
  ].forEach(([group, key]) => {
    metricGrid.appendChild(buildAgricultureMetricCard(agriculture?.[group]?.[key] ?? null));
  });

  section.appendChild(metricGrid);
  return section;
}

function buildAgricultureMetricCard(entry) {
  const card = document.createElement("div");
  card.className = "country-stats-metric";

  const labelNode = document.createElement("span");
  labelNode.textContent = entry?.label ?? "자료 없음";
  const valueNode = document.createElement("strong");
  valueNode.textContent = entry ? `${formatStatNumber(entry.value, 2)} ${formatFaostatUnit(entry.unit)}` : "자료 없음";
  const detailNode = document.createElement("small");
  detailNode.textContent = entry ? `${entry.year}년` : "최신 가용연도 없음";

  card.append(labelNode, valueNode, detailNode);
  return card;
}

function buildReligionStatsSection(religion) {
  const section = createCountryStatsSection(
    "Pew 종교 구성",
    "2020년 종교별 인구 비중입니다.",
  );

  if (!religion?.shares) {
    section.appendChild(createCountryStatsUnavailable("표시할 2020년 종교 통계가 없습니다."));
    return section;
  }

  const list = document.createElement("div");
  list.className = "country-stats-religion-list";

  Object.entries(religion.shares)
    .map(([key, value]) => ({
      key,
      label: countryStatsReligionLabels[key] ?? key,
      value: Number(value) || 0,
    }))
    .sort((a, b) => b.value - a.value)
    .forEach((entry) => {
      const bar = buildShareBar(entry.label, entry.value);
      list.appendChild(bar);
    });

  section.appendChild(list);
  return section;
}

function buildEnergyStatsSection(entry, title, description) {
  const section = createCountryStatsSection(title, description);

  if (!entry) {
    section.appendChild(createCountryStatsUnavailable("표시할 최신 에너지 구성이 없습니다."));
    return section;
  }

  const summaryGrid = document.createElement("div");
  summaryGrid.className = "country-stats-metric-grid";
  summaryGrid.append(
    createCountryStatsMetric("화석", formatPercent(entry.summaryShares?.fossil), `${entry.year}년 비중`),
    createCountryStatsMetric("재생", formatPercent(entry.summaryShares?.renewables), `${entry.year}년 비중`),
    createCountryStatsMetric(
      "원자력",
      formatPercent(entry.summaryShares?.nuclear),
      `총량 ${formatStatNumber(entry.totalTWh, 2)} TWh`,
    ),
  );
  section.appendChild(summaryGrid);

  const bars = document.createElement("div");
  bars.className = "country-stats-bars";
  Object.entries(entry.shareBreakdown ?? {})
    .map(([key, value]) => ({
      key,
      label: countryStatsEnergyLabels[key] ?? key,
      value: Number(value) || 0,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .forEach((item) => {
      bars.appendChild(buildShareBar(item.label, item.value));
    });
  section.appendChild(bars);

  return section;
}

function createCountryStatsSection(title, description) {
  const section = document.createElement("article");
  section.className = "country-stats-section";

  const titleNode = document.createElement("h4");
  titleNode.textContent = title;
  const descriptionNode = document.createElement("p");
  descriptionNode.textContent = description;

  section.append(titleNode, descriptionNode);
  return section;
}

function createCountryStatsMetric(label, value, detail) {
  const card = document.createElement("div");
  card.className = "country-stats-metric";

  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  const valueNode = document.createElement("strong");
  valueNode.textContent = value;
  const detailNode = document.createElement("small");
  detailNode.textContent = detail;

  card.append(labelNode, valueNode, detailNode);
  return card;
}

function createCountryStatsUnavailable(message) {
  return createEmptyState(message);
}

function buildShareBar(label, value) {
  const wrapper = document.createElement("div");
  wrapper.className = "country-stats-bar";

  const head = document.createElement("div");
  head.className = "country-stats-bar__head";
  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  const valueNode = document.createElement("strong");
  valueNode.textContent = formatPercent(value);
  head.append(labelNode, valueNode);

  const track = document.createElement("div");
  track.className = "country-stats-bar__track";
  const fill = document.createElement("div");
  fill.className = "country-stats-bar__fill";
  fill.style.width = `${clamp(Number(value) || 0, 0, 100)}%`;
  track.appendChild(fill);

  wrapper.append(head, track);
  return wrapper;
}

function buildCountryStatsSourceRow() {
  const row = document.createElement("div");
  row.className = "country-stats-source-row";

  ["population", "urbanization", "faostat", "religion", "primaryEnergy", "electricityMix"].forEach((key) => {
    const source = countryStatsMeta.sources?.[key];
    if (!source?.url) {
      return;
    }

    const card = document.createElement("div");
    card.className = "country-stats-source";
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = source.label;
    card.appendChild(link);
    row.appendChild(card);
  });

  return row;
}

function getLatestPopulationRow(population) {
  if (!population?.rows?.length) {
    return null;
  }

  return population.rows[population.rows.length - 1];
}

function getTopReligionShare(religion) {
  if (!religion?.shares) {
    return null;
  }

  return Object.entries(religion.shares)
    .map(([key, value]) => ({
      key,
      label: countryStatsReligionLabels[key] ?? key,
      value: Number(value) || 0,
    }))
    .sort((a, b) => b.value - a.value)[0];
}

function formatStatNumber(value, maximumFractionDigits = 0) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  return Number(value).toLocaleString("ko-KR", {
    maximumFractionDigits,
  });
}

function formatPercent(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "자료 없음";
  }

  return `${Number(value).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;
}

function formatFaostatUnit(unit) {
  return unit === "An" ? "두" : unit || "";
}

function renderAnnotations() {
  renderMarkerList();
  renderInsetList();
}

function renderMarkerList() {
  elements.markerList.innerHTML = "";

  if (!state.markers.length) {
    elements.markerList.appendChild(createEmptyState("마커 추가 모드에서 지도를 클릭하면 표시가 생깁니다."));
    return;
  }

  state.markers.forEach((marker) => {
    const item = document.createElement("li");
    item.className = "annotation-item";

    const head = document.createElement("div");
    head.className = "annotation-head";
    const title = document.createElement("strong");
    title.textContent = `${marker.label || "무라벨"} · ${markerStyleLabel(marker.style)}`;
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-button tw-button";
    removeButton.textContent = "삭제";
    removeButton.addEventListener("click", () => {
      beginHistoryStep("마커 삭제");
      state.markers = state.markers.filter((entry) => entry.id !== marker.id);
      renderAnnotations();
      renderMap();
      setStatus("마커를 삭제했습니다.");
    });
    head.append(title, removeButton);

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.value = marker.label;
    labelInput.addEventListener("input", () => {
      beginHistoryStep("마커 라벨 변경");
      marker.label = labelInput.value;
      renderAnnotations();
      renderMap();
    });

    const styleSelect = buildMarkerStyleSelect(marker.style);
    styleSelect.addEventListener("change", () => {
      beginHistoryStep("마커 스타일 변경");
      marker.style = styleSelect.value;
      applyMarkerDefaultsIfNeeded(marker);
      renderAnnotations();
      renderMap();
    });

    const sizeInput = buildNumberInput(marker.size, 2, 140, 1, "마커 크기 변경", (value) => {
      marker.size = clamp(value, 2, 140);
      renderMap();
    });

    const aspectInput = buildNumberInput(marker.aspect, 0.2, 3, 0.05, "마커 비율 변경", (value) => {
      marker.aspect = clamp(value, 0.2, 3);
      renderMap();
    });

    const rotationInput = buildNumberInput(marker.rotation, -180, 180, 1, "마커 회전 변경", (value) => {
      marker.rotation = clamp(value, -180, 180);
      renderMap();
    });

    const offsetXInput = buildNumberInput(marker.offsetX, -320, 320, 1, "마커 라벨 위치 변경", (value) => {
      marker.offsetX = clamp(value, -320, 320);
      renderMap();
    });

    const offsetYInput = buildNumberInput(marker.offsetY, -320, 320, 1, "마커 라벨 위치 변경", (value) => {
      marker.offsetY = clamp(value, -320, 320);
      renderMap();
    });

    const fieldGrid = document.createElement("div");
    fieldGrid.className = "annotation-grid";
    fieldGrid.append(
      createField("라벨", labelInput),
      createField("스타일", styleSelect),
      createField("크기", sizeInput),
      createField("세로비", aspectInput),
      createField("회전", rotationInput),
      createField("라벨 X", offsetXInput),
      createField("라벨 Y", offsetYInput),
    );

    const meta = document.createElement("div");
    meta.className = "annotation-meta";
    meta.textContent = `${formatCoordinate(marker.lat, "lat")} · ${formatCoordinate(marker.lon, "lon")} · 미리보기에서 직접 이동/크기 조절`;

    item.append(head, fieldGrid, meta);
    elements.markerList.appendChild(item);
  });
}

function renderInsetList() {
  elements.insetList.innerHTML = "";

  if (!state.insets.length) {
    elements.insetList.appendChild(createEmptyState("인셋 추가 모드에서 드래그하면 확대 박스가 생깁니다."));
    return;
  }

  state.insets.forEach((inset) => {
    const item = document.createElement("li");
    item.className = "annotation-item";

    const head = document.createElement("div");
    head.className = "annotation-head";
    const title = document.createElement("strong");
    title.textContent = inset.label ? `인셋 ${inset.label}` : "인셋";
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-button tw-button";
    removeButton.textContent = "삭제";
    removeButton.addEventListener("click", () => {
      beginHistoryStep("인셋 삭제");
      state.insets = state.insets.filter((entry) => entry.id !== inset.id);
      renderAnnotations();
      renderMap();
      setStatus("인셋을 삭제했습니다.");
    });
    head.append(title, removeButton);

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.value = inset.label;
    labelInput.addEventListener("input", () => {
      beginHistoryStep("인셋 라벨 변경");
      inset.label = labelInput.value;
      renderMap();
      renderAnnotations();
    });

    const xInput = buildNumberInput(inset.panelX, 0, state.width, 1, "인셋 위치 변경", (value) => {
      inset.panelX = clamp(value, 0, state.width);
      renderMap();
    });

    const yInput = buildNumberInput(inset.panelY, 0, state.height, 1, "인셋 위치 변경", (value) => {
      inset.panelY = clamp(value, 0, state.height);
      renderMap();
    });

    const widthInput = buildNumberInput(
      inset.panelWidth,
      MIN_INSET_PANEL_WIDTH,
      Math.min(MAX_INSET_PANEL_WIDTH, state.width),
      1,
      "인셋 크기 변경",
      (value) => {
        setInsetPanelSizeFromWidth(inset, value);
        renderAnnotations();
        renderMap();
      },
    );

    const heightInput = buildNumberInput(inset.panelHeight, MIN_INSET_PANEL_HEIGHT, state.height, 1, "인셋 크기 변경", (value) => {
      setInsetPanelSizeFromHeight(inset, value);
      renderAnnotations();
      renderMap();
    });

    const zoomInput = buildNumberInput(
      Math.round(getInsetZoomScale(inset) * 100),
      Math.round(MIN_INSET_ZOOM_SCALE * 100),
      Math.round(MAX_INSET_ZOOM_SCALE * 100),
      5,
      "인셋 확대 배율 변경",
      (value) => {
        inset.zoomScale = clamp(value / 100, MIN_INSET_ZOOM_SCALE, MAX_INSET_ZOOM_SCALE);
        renderMap();
      },
    );

    const fieldGrid = document.createElement("div");
    fieldGrid.className = "annotation-grid";
    fieldGrid.append(
      createField("라벨", labelInput),
      createField("패널 X", xInput),
      createField("패널 Y", yInput),
      createField("너비", widthInput),
      createField("높이", heightInput),
      createField("확대 %", zoomInput),
    );

    const meta = document.createElement("div");
    meta.className = "annotation-meta";
    meta.textContent =
      `확대 ${Math.round(getInsetZoomScale(inset) * 100)}% · 샘플 점 ${inset.focusPoints.length}개 기준 · ` +
      `미리보기에서 직접 이동/크기 조절`;

    item.append(head, fieldGrid, meta);
    elements.insetList.appendChild(item);
  });
}

function createEmptyState(text) {
  const item = document.createElement("li");
  item.className = "empty-state";
  item.textContent = text;
  return item;
}

function createField(labelText, control) {
  const label = document.createElement("label");
  label.className = "tw-field compact-field";
  const text = document.createElement("span");
  text.textContent = labelText;
  label.append(text, control);
  return label;
}

function buildMarkerStyleSelect(currentValue) {
  const select = document.createElement("select");
  markerStyleOptions.forEach((optionData) => {
    const option = document.createElement("option");
    option.value = optionData.value;
    option.textContent = optionData.label;
    option.selected = optionData.value === currentValue;
    select.appendChild(option);
  });
  return select;
}

function buildNumberInput(value, min, max, step, historyLabel, onInput) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener("input", () => {
    const parsed = Number(input.value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    beginHistoryStep(historyLabel);
    onInput(parsed);
  });
  return input;
}

function removeSelectionEntry(regionId) {
  beginHistoryStep(state.mapVersion === "world" ? "국가 제거" : "권역 제거");
  setCurrentSelectionEntries(getCurrentSelectionEntries().filter((country) => country.id !== regionId));
  syncActiveStatsCountry();
  resetViewForSelectionIfNeeded();
  renderSelectionViews();
  syncKoreaControls();
  renderMap();
}

function toggleCountry(countryId) {
  const existing = state.selected.find((country) => country.id === countryId);
  const feature = countryById.get(countryId);

  if (!feature) {
    return;
  }

  if (existing) {
    removeSelectionEntry(countryId);
    setStatus(`${existing.name} 제거됨`);
    return;
  }

  beginHistoryStep("국가 선택 변경");
  state.selected.push({
    id: feature.id,
    name: feature.properties.name,
    color: nextPaletteColor(state.selected.length),
  });
  syncActiveStatsCountry(feature.id);
  resetViewForSelectionIfNeeded();
  renderSelectionViews();
  renderMap();
  setStatus(`${feature.properties.name} 추가됨`);
}

function toggleKoreaRegion(regionId) {
  if (state.koreaLevel === "municipalities" && !state.koreaParentCode) {
    if (koreaProvinceByCode.has(regionId)) {
      setKoreaParentCode(regionId);
    }
    return;
  }

  const sourceDataset =
    state.koreaLevel === "provinces" ? koreaDatasets.provinces : koreaDatasets.municipalities;
  const feature = sourceDataset.featureById.get(regionId);
  const currentSelection = getCurrentSelectionEntries();
  const existing = currentSelection.find((region) => region.id === regionId);

  if (!feature) {
    return;
  }

  if (existing) {
    removeSelectionEntry(regionId);
    setStatus(`${formatSelectionDisplayName(existing)} 제거됨`);
    return;
  }

  beginHistoryStep("권역 선택 변경");
  setCurrentSelectionEntries([
    ...currentSelection,
    createKoreaSelectionEntry(feature, nextPaletteColor(currentSelection.length)),
  ]);
  renderSelectionViews();
  syncKoreaControls();
  renderMap();
  setStatus(`${formatSelectionDisplayName(createKoreaSelectionEntry(feature))} 추가됨`);
}

function renderMap() {
  if (state.mapVersion === "korea") {
    renderKoreaMap();
    return;
  }

  normalizeCanvasStateDimensions();
  const focusGeometry = buildFocusGeometry();
  const padding = Math.max(
    16,
    Math.round(Math.min(state.width, state.height) * (state.paddingPercent / 100)),
  );
  const projectionMeta = createProjectionMeta(focusGeometry, padding);
  const projection = projectionMeta.projection;
  const path = d3.geoPath(projection);
  const atlasDataset = getAtlasDataset(state.viewZoom);
  const selectedIds = new Set(state.selected.map((country) => country.id));
  const selectedColorById = buildSelectedColorById();
  const borderGeometry = buildBorderGeometry(atlasDataset, selectedIds);
  const guideGraphics = buildGuideGraphics(projection);
  const latitudeScaleGraphics = buildLatitudeScaleGraphics(projection);

  const svg = d3
    .create("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("viewBox", `0 0 ${state.width} ${state.height}`)
    .attr("width", state.width)
    .attr("height", state.height)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr(
      "aria-label",
      `${projectionModeLabels[state.projectionMode]} 시점의 세계 지도, 선택 국가 ${state.selected.length}개`,
    );
  svg.style("background", state.oceanColor);

  const defs = svg.append("defs");
  const root = svg.append("g").attr("class", "root-layer");

  if (state.projectionMode === "rectangular") {
    defs
      .append("clipPath")
      .attr("id", "map-canvas-clip")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", state.width)
      .attr("height", state.height);
  }

  root
    .append("rect")
    .attr("class", "map-ocean")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", state.width)
    .attr("height", state.height)
    .attr("fill", state.oceanColor);

  const countriesGroup = root.append("g").attr("class", "countries-layer");

  if (state.projectionMode === "rectangular") {
    countriesGroup.attr("clip-path", "url(#map-canvas-clip)");
  }

  if (shouldRenderProjectionOutline()) {
    root
      .append("path")
      .datum({ type: "Sphere" })
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", "0.4pt")
      .attr("opacity", 0.8)
      .attr("vector-effect", "non-scaling-stroke");
  }

  renderAtlasLayer(countriesGroup, projection, atlasDataset, selectedColorById, borderGeometry, {
    clipRect: {
      x: 0,
      y: 0,
      width: state.width,
      height: state.height,
    },
    clipPadding: MAP_RENDER_CLIP_PADDING,
  });

  if (guideGraphics.length) {
    renderGuideLayer(root, guideGraphics);
  }

  if (latitudeScaleGraphics.length) {
    renderGuideLayer(root, latitudeScaleGraphics, {
      labelOpacity: 0.84,
      lineOpacity: 0.22,
    });
  }

  renderMarkerLayer(root, projection);
  renderInsetLayer(root, defs, projection, selectedColorById);

  if (state.showScaleBar) {
    renderScaleBar(root, projection, padding);
  }

  if (shouldRenderCanvasFrame()) {
    root
      .append("rect")
      .attr("x", 0.2)
      .attr("y", 0.2)
      .attr("width", Math.max(0, state.width - 0.4))
      .attr("height", Math.max(0, state.height - 0.4))
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", "0.4pt")
      .attr("vector-effect", "non-scaling-stroke");
  }

  currentSvgNode = svg.node();
  currentRenderContext = {
    projection,
    path,
    baseScale: projectionMeta.baseScale,
    baseTranslate: projectionMeta.baseTranslate,
    padding,
  };

  resetPreviewInteractionState();
  mountPreviewCanvas();
  updateSelectionSummary();
  updateExportMeta();
  updateWorkspaceStats();
}

function renderKoreaMap() {
  normalizeCanvasStateDimensions();
  const visibleFeatures = getVisibleKoreaRenderFeatures();
  const fitGeometry = buildKoreaFitGeometry(visibleFeatures);
  const padding = Math.max(
    18,
    Math.round(Math.min(state.width, state.height) * (state.paddingPercent / 100)),
  );
  const projection = d3.geoMercator();
  projection.fitExtent(
    [
      [padding, padding],
      [state.width - padding, state.height - padding],
    ],
    fitGeometry,
  );
  projection.precision(0.14);

  const path = d3.geoPath(projection);
  const selectedEntries = getCurrentSelectionEntries();
  const selectedIds = new Set(selectedEntries.map((region) => region.id));
  const selectedColorById = buildSelectedColorById();
  const koreaDataset =
    state.koreaLevel === "provinces" || !state.koreaParentCode ? koreaDatasets.provinces : koreaDatasets.municipalities;
  const visibleIds = new Set(visibleFeatures.map((feature) => feature.id));
  const landFeature = buildKoreaLandFeature(koreaDataset, visibleIds);
  const borderGeometry = buildKoreaBorderGeometry(koreaDataset, visibleIds, selectedIds);

  const svg = d3
    .create("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("viewBox", `0 0 ${state.width} ${state.height}`)
    .attr("width", state.width)
    .attr("height", state.height)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr(
      "aria-label",
      `대한민국 ${koreaRegionLevelLabels[state.koreaLevel]} 지도, 선택 권역 ${selectedEntries.length}개`,
    );
  svg.style("background", state.oceanColor);

  const root = svg.append("g").attr("class", "root-layer");
  root
    .append("rect")
    .attr("class", "map-ocean")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", state.width)
    .attr("height", state.height)
    .attr("fill", state.oceanColor);

  if (landFeature) {
    root
      .append("path")
      .datum(landFeature)
      .attr("class", "map-land")
      .attr("d", path)
      .attr("fill", state.landColor)
      .attr("stroke", "none");
  }

  root
    .selectAll(".map-region")
    .data(visibleFeatures.filter((feature) => selectedColorById.has(feature.id)))
    .join("path")
    .attr("class", "map-region")
    .attr("d", path)
    .attr("fill", (feature) => selectedColorById.get(feature.id) ?? state.landColor)
    .attr("stroke", "none");

  if (borderGeometry) {
    root
      .append("path")
      .datum(borderGeometry)
      .attr("class", "map-border-lines")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("stroke-dasharray", getBorderStrokeDasharray())
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("vector-effect", "non-scaling-stroke");
  }

  if (landFeature) {
    root
      .append("path")
      .datum(landFeature)
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("stroke-linejoin", "round")
      .attr("vector-effect", "non-scaling-stroke");
  }

  if (state.showScaleBar) {
    renderScaleBar(root, projection, padding);
  }

  if (state.showFrame) {
    root
      .append("rect")
      .attr("x", 0.2)
      .attr("y", 0.2)
      .attr("width", Math.max(0, state.width - 0.4))
      .attr("height", Math.max(0, state.height - 0.4))
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("vector-effect", "non-scaling-stroke");
  }

  currentSvgNode = svg.node();
  currentRenderContext = {
    projection,
    path,
    baseScale: projection.scale(),
    baseTranslate: [...projection.translate()],
    padding,
  };

  resetPreviewInteractionState();
  mountPreviewCanvas();
  updateSelectionSummary();
  updateExportMeta();
  updateWorkspaceStats();
}

function getVisibleKoreaRenderFeatures() {
  if (state.koreaLevel === "provinces") {
    return koreaDatasets.provinces.features;
  }

  if (!state.koreaParentCode) {
    return koreaDatasets.provinces.features;
  }

  return getVisibleKoreaSelectableFeatures();
}

function buildKoreaFitGeometry(visibleFeatures) {
  if (state.koreaLevel === "municipalities" && state.koreaParentCode) {
    return koreaProvinceByCode.get(state.koreaParentCode) ?? {
      type: "FeatureCollection",
      features: visibleFeatures,
    };
  }

  return {
    type: "FeatureCollection",
    features: visibleFeatures.length ? visibleFeatures : koreaDatasets.provinces.features,
  };
}

function buildKoreaLandFeature(dataset, visibleIds) {
  const geometries = dataset.regionsObject.geometries.filter((geometry) =>
    visibleIds.has(String(geometry.properties?.code ?? geometry.id ?? "")),
  );
  return geometries.length ? topojson.merge(dataset.topology, geometries) : null;
}

function buildKoreaBorderGeometry(dataset, visibleIds, selectedIds) {
  if (state.borderMode === "none") {
    return null;
  }

  const hasVisibleSelection = [...selectedIds].some((id) => visibleIds.has(id));

  return topojson.mesh(dataset.topology, dataset.regionsObject, (a, b) => {
    const aCode = String(a?.properties?.code ?? a?.id ?? "");
    const bCode = String(b?.properties?.code ?? b?.id ?? "");

    if (!visibleIds.has(aCode) || !visibleIds.has(bCode)) {
      return false;
    }

    if (!state.selectedBordersOnly || !selectedIds.size || !hasVisibleSelection) {
      return a !== b;
    }

    return a !== b && (selectedIds.has(aCode) || selectedIds.has(bCode));
  });
}

function shouldRenderProjectionOutline() {
  return state.projectionMode !== "rectangular";
}

function shouldRenderCanvasFrame() {
  return state.showFrame && state.projectionMode === "rectangular";
}

function buildFocusGeometry() {
  if (!state.autoFocusOnSelection || !state.selected.length) {
    return { type: "Sphere" };
  }

  return {
    type: "FeatureCollection",
    features: state.selected.map((country) => countryById.get(country.id)).filter(Boolean),
  };
}

function createProjectionMeta(focusGeometry, padding) {
  const target = buildProjectionFitGeometry(focusGeometry);
  const baseProjection = buildBaseProjection();
  baseProjection.fitExtent(
    [
      [padding, padding],
      [state.width - padding, state.height - padding],
    ],
    target,
  );

  const baseScale = baseProjection.scale();
  const baseTranslate = [...baseProjection.translate()];

  const projection = buildBaseProjection();
  projection.scale(baseScale * state.viewZoom);
  projection.translate([
    baseTranslate[0] + state.viewOffsetX,
    baseTranslate[1] + state.viewOffsetY,
  ]);

  return {
    projection,
    baseScale,
    baseTranslate,
  };
}

function buildProjectionFitGeometry(focusGeometry) {
  if (state.projectionMode === "northPolar") {
    return d3.geoCircle().center([0, 90]).radius(90)();
  }

  if (state.projectionMode === "southPolar") {
    return d3.geoCircle().center([0, -90]).radius(90)();
  }

  return focusGeometry ?? { type: "Sphere" };
}

function buildBaseProjection() {
  let projection;

  if (state.projectionMode === "northPolar") {
    projection = d3.geoAzimuthalEquidistant().rotate([-state.centerLongitude, -90]);
    projection.clipAngle(90);
  } else if (state.projectionMode === "southPolar") {
    projection = d3.geoAzimuthalEquidistant().rotate([-state.centerLongitude, 90]);
    projection.clipAngle(90);
  } else {
    projection = typeof d3.geoMiller === "function" ? d3.geoMiller() : d3.geoEquirectangular();
    projection.rotate([-state.centerLongitude, 0]);
  }

  projection.precision(getProjectionPrecision());
  return projection;
}

function getProjectionPrecision() {
  const zoomFactor = Math.max(1, state.viewZoom);
  const basePrecision =
    state.projectionMode === "rectangular" ? 0.34 / Math.pow(zoomFactor, 0.42) : 0.24 / Math.pow(zoomFactor, 0.4);

  const detailMultiplier =
    state.coastlineDetail === "performance"
      ? 1.6
      : state.coastlineDetail === "detailed"
        ? 0.82
        : state.coastlineDetail === "max"
          ? 0.58
          : 1;

  return clamp(basePrecision * detailMultiplier, 0.025, 0.3);
}

function buildBorderGeometry(atlasDataset, selectedIds) {
  if (state.borderMode === "none") {
    return null;
  }

  if (!state.selectedBordersOnly || !selectedIds.size) {
    return atlasDataset.borderMesh;
  }

  return topojson.mesh(atlasDataset.topology, atlasDataset.countriesObject, (a, b) => {
    const aId = a ? String(Number(a.id)) : "";
    const bId = b ? String(Number(b.id)) : "";
    return selectedIds.has(aId) || selectedIds.has(bId);
  });
}

function renderAtlasLayer(container, projection, atlasDataset, selectedColorById, borderGeometry, options = {}) {
  const copyOffsets = options.wrap === false ? [0] : getProjectionCopyOffsets(projection);
  const lakeDataset = atlasLakeDatasets[atlasDataset.datasetKey] ?? baseLakeDataset;
  const renderDetailedCountryFills = atlasDataset.datasetKey === "10m";
  const fallbackCountryDataset =
    renderDetailedCountryFills ? atlasDatasets["50m"] ?? atlasDatasets["110m"] ?? atlasDataset : null;
  const fillAtlasDataset =
    renderDetailedCountryFills
      ? atlasDataset
      : atlasDataset.datasetKey === "10m"
        ? atlasDatasets["50m"] ?? atlasDatasets["110m"] ?? atlasDataset
        : atlasDataset;
  const detailedFillFeatures = renderDetailedCountryFills
    ? atlasDataset.countryFeatures
        .map((feature) =>
          atlasDataset.unstableFillCountryIds.has(feature.id)
            ? fallbackCountryDataset?.countryById.get(feature.id) ?? feature
            : feature,
        )
        .filter(Boolean)
    : [];
  // Paint shared land once for coarse layers; at 10m, fill countries individually to avoid merged-land inversions.
  const selectedFeatures = renderDetailedCountryFills
    ? []
    : fillAtlasDataset.countryFeatures.filter((feature) => selectedColorById.has(feature.id));
  const clipRect = normalizeClipRect(options.clipRect, options.clipPadding ?? 0);

  copyOffsets.forEach((offset) => {
    const renderProjection = createRenderProjection(projection, shiftClipRect(clipRect, -offset, 0));
    const path = d3.geoPath(renderProjection);
    const copyGroup = container
      .append("g")
      .attr("class", "map-copy")
      .attr("transform", offset ? `translate(${offset} 0)` : null);

    if (renderDetailedCountryFills) {
      copyGroup
        .selectAll(".map-country-fill")
        .data(detailedFillFeatures)
        .join("path")
        .attr("class", "map-country-fill")
        .attr("d", path)
        .attr("fill", (feature) => selectedColorById.get(feature.id) ?? state.landColor)
        .attr("stroke", "none")
        .attr("data-country-id", (feature) => feature.id);
    } else {
      copyGroup
        .append("path")
        .datum(fillAtlasDataset.landFeature)
        .attr("class", "map-land")
        .attr("d", path)
        .attr("fill", state.landColor)
        .attr("stroke", "none");
    }

    if (selectedFeatures.length) {
      copyGroup
        .selectAll(".map-country")
        .data(selectedFeatures)
        .join("path")
        .attr("class", "map-country")
        .attr("d", path)
        .attr("fill", (feature) => selectedColorById.get(feature.id) ?? state.landColor)
        .attr("stroke", "none")
        .attr("data-country-id", (feature) => feature.id)
        .attr("data-selected", "true");
    }

    if (lakeDataset?.geometry?.geometries?.length) {
      copyGroup
        .append("path")
        .datum(lakeDataset.geometry)
        .attr("class", "map-lakes")
        .attr("d", path)
        .attr("fill", state.oceanColor)
        .attr("stroke", "none");

      copyGroup
        .append("path")
        .datum(lakeDataset.geometry)
        .attr("class", "map-lake-lines")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", state.borderColor)
        .attr("stroke-width", OUTLINE_STROKE_WIDTH)
        .attr("stroke-linejoin", "round")
        .attr("vector-effect", "non-scaling-stroke");
    }

    if (borderGeometry) {
      copyGroup
        .append("path")
        .datum(borderGeometry)
        .attr("class", "map-border-lines")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", state.borderColor)
        .attr("stroke-width", "0.4pt")
        .attr("stroke-dasharray", getBorderStrokeDasharray())
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("vector-effect", "non-scaling-stroke");
    }

    copyGroup
      .append("path")
      .datum(atlasDataset.landFeature)
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", "0.4pt")
      .attr("stroke-linejoin", "round")
      .attr("vector-effect", "non-scaling-stroke");
  });
}

function getBorderStrokeDasharray() {
  return state.borderMode === "dashed" ? "2.8pt 2.2pt" : null;
}

function normalizeClipRect(rect, padding = 0) {
  if (!rect) {
    return null;
  }

  const x = Number(rect.x);
  const y = Number(rect.y);
  const width = Number(rect.width);
  const height = Number(rect.height);
  const insetPadding = Math.max(0, Number(padding) || 0);

  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return null;
  }

  return {
    x: x - insetPadding,
    y: y - insetPadding,
    width: width + insetPadding * 2,
    height: height + insetPadding * 2,
  };
}

function shiftClipRect(rect, deltaX = 0, deltaY = 0) {
  if (!rect) {
    return null;
  }

  return {
    x: rect.x + deltaX,
    y: rect.y + deltaY,
    width: rect.width,
    height: rect.height,
  };
}

function createRenderProjection(projection, clipRect) {
  if (!clipRect || typeof projection.copy !== "function") {
    return projection;
  }

  return projection.copy().clipExtent([
    [clipRect.x, clipRect.y],
    [clipRect.x + clipRect.width, clipRect.y + clipRect.height],
  ]);
}

function getProjectionCopyOffsets(projection) {
  if (state.projectionMode !== "rectangular") {
    return [0];
  }

  const wrapWidth = getProjectionWrapWidth(projection);
  if (!Number.isFinite(wrapWidth) || wrapWidth < 1) {
    return [0];
  }

  const viewportReach = Math.abs(state.viewOffsetX) + state.width * 1.5;
  const extraCopies =
    state.coastlineDetail === "performance" ? 0 : state.coastlineDetail === "max" ? 2 : 1;
  const repeatCount = clamp(Math.ceil(viewportReach / wrapWidth) + extraCopies, 1, 4);
  return d3.range(-repeatCount, repeatCount + 1).map((step) => wrapWidth * step);
}

function getProjectionWrapWidth(projection) {
  if (state.projectionMode !== "rectangular") {
    return 0;
  }

  return projection.scale() * Math.PI * 2;
}

function buildGuideGraphics(projection) {
  const graphics = [];

  latitudeGuideDefinitions.forEach((definition) => {
    if (!state.guides[definition.key]) {
      return;
    }

    definition.latitudes.forEach((latitude) => {
      const feature = {
        type: "LineString",
        coordinates: d3.range(-180, 181, 1).map((longitude) => [longitude, latitude]),
      };
      const visiblePoints = feature.coordinates
        .map((coordinate) => projectCoordinate(projection, coordinate))
        .filter(Boolean);

      if (!visiblePoints.length) {
        return;
      }

      const key = `${definition.key}-${latitude}`;
      const anchors =
        state.projectionMode === "rectangular"
          ? buildRectangularGuideAnchors(visiblePoints, latitude)
          : buildPolarGuideAnchor(visiblePoints, latitude);

      graphics.push({
        key,
        pathData: d3.geoPath(projection)(feature),
        color: state.borderColor,
        latitude,
        anchors,
      });
    });
  });

  return graphics;
}

function buildLatitudeScaleGraphics(projection) {
  if (!state.showLatitudeLabels || state.projectionMode !== "rectangular") {
    return [];
  }

  const visibleRange = getVisibleLatitudeRange(projection);
  if (!visibleRange) {
    return [];
  }

  const step = pickLatitudeScaleStep(visibleRange);
  const latitudes = buildLatitudeScaleLatitudes(visibleRange, step);
  const manualLatitudes = new Set(
    latitudeGuideDefinitions
      .filter((definition) => state.guides[definition.key])
      .flatMap((definition) => definition.latitudes.map((latitude) => latitude.toFixed(2))),
  );

  return latitudes
    .filter((latitude) => !manualLatitudes.has(latitude.toFixed(2)))
    .map((latitude) => {
      const feature = {
        type: "LineString",
        coordinates: d3.range(-180, 181, 1).map((longitude) => [longitude, latitude]),
      };
      const visiblePoints = feature.coordinates
        .map((coordinate) => projectCoordinate(projection, coordinate))
        .filter(Boolean)
        .filter((point) => point.y >= 8 && point.y <= state.height - 8);

      if (!visiblePoints.length) {
        return null;
      }

      return {
        key: `latitude-scale-${latitude}`,
        pathData: d3.geoPath(projection)(feature),
        color: state.borderColor,
        latitude,
        anchors: buildRectangularGuideAnchors(visiblePoints, latitude),
      };
    })
    .filter(Boolean);
}

function getVisibleLatitudeRange(projection) {
  const sampleX = state.width / 2;
  const top = projection.invert([sampleX, 0]);
  const bottom = projection.invert([sampleX, state.height]);
  if (!isFiniteCoordinate(top) || !isFiniteCoordinate(bottom)) {
    return null;
  }

  return {
    min: clamp(Math.min(top[1], bottom[1]), -90, 90),
    max: clamp(Math.max(top[1], bottom[1]), -90, 90),
  };
}

function pickLatitudeScaleStep(range) {
  const span = Math.abs(range.max - range.min);
  if (span <= 45) {
    return 5;
  }
  if (span <= 120) {
    return 10;
  }
  return 30;
}

function buildLatitudeScaleLatitudes(range, step) {
  const paddedMin = clamp(range.min - step * 0.5, -90, 90);
  const paddedMax = clamp(range.max + step * 0.5, -90, 90);
  const latitudes = [];
  const start = Math.ceil(paddedMin / step) * step;

  for (let latitude = start; latitude <= paddedMax + 0.001; latitude += step) {
    const rounded = Number(latitude.toFixed(4));
    if (Math.abs(rounded) > 89.999) {
      continue;
    }
    latitudes.push(rounded);
  }

  if (!latitudes.some((latitude) => Math.abs(latitude) < 0.001) && range.min <= 0 && range.max >= 0) {
    latitudes.push(0);
  }

  return [...new Set(latitudes)].sort((a, b) => a - b);
}

function buildRectangularGuideAnchors(visiblePoints, latitude) {
  const leftPoint = visiblePoints.reduce((best, point) => (point.x < best.x ? point : best), visiblePoints[0]);
  const label = formatLatitudeLabel(latitude);
  const edgePadding = 6;
  const clampedY = clamp(leftPoint.y, 18, state.height - 12);

  if (leftPoint.x <= 20) {
    return [{ x: edgePadding, y: clampedY, label, side: "right" }];
  }

  if (leftPoint.x >= state.width - 20) {
    return [{ x: state.width - edgePadding, y: clampedY, label, side: "left" }];
  }

  return [{ x: leftPoint.x, y: clampedY, label, side: "left" }];
}

function buildPolarGuideAnchor(visiblePoints, latitude) {
  const topPoint = visiblePoints.reduce((best, point) => (point.y < best.y ? point : best), visiblePoints[0]);
  return [{ x: topPoint.x, y: topPoint.y, label: formatLatitudeLabel(latitude), side: "top" }];
}

function renderGuideLayer(root, guideGraphics, options = {}) {
  const group = root.append("g").attr("class", "guides-layer");
  const labelOpacity = options.labelOpacity ?? 1;
  const lineOpacity = options.lineOpacity ?? 0.42;

  guideGraphics.forEach((guide) => {
    if (state.showGuideLines) {
      group
        .append("path")
        .attr("d", guide.pathData)
        .attr("fill", "none")
        .attr("stroke", guide.color)
        .attr("stroke-width", "0.4pt")
        .attr("stroke-linecap", "round")
        .attr("opacity", lineOpacity)
        .attr("vector-effect", "non-scaling-stroke");
    }

    if (state.showLatitudeLabels) {
      guide.anchors.forEach((anchor) => {
        renderGuideAnchor(group, anchor, guide.color, labelOpacity);
      });
    }
  });
}

function renderGuideAnchor(group, anchor, color, opacity = 1) {
  const tick = group
    .append("path")
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", "0.4pt")
    .attr("opacity", opacity);

  if (anchor.side === "left") {
    tick.attr("d", `M ${anchor.x - 2} ${anchor.y} L ${anchor.x - 16} ${anchor.y}`);
    appendMapLabel(group, {
      x: anchor.x - 20,
      y: anchor.y + 3,
      text: anchor.label,
      anchor: "end",
      fill: color,
      opacity,
    });
    return;
  }

  if (anchor.side === "right") {
    tick.attr("d", `M ${anchor.x + 2} ${anchor.y} L ${anchor.x + 12} ${anchor.y}`);
    appendMapLabel(group, {
      x: anchor.x + 15,
      y: anchor.y + 3,
      text: anchor.label,
      anchor: "start",
      fill: color,
      opacity,
    });
    return;
  }

  tick.attr("d", `M ${anchor.x} ${anchor.y - 2} L ${anchor.x} ${anchor.y - 16}`);
  appendMapLabel(group, {
    x: anchor.x,
    y: anchor.y - 18,
    text: anchor.label,
    anchor: "middle",
    fill: color,
    opacity,
  });
}

function renderMarkerLayer(root, projection) {
  if (!state.markers.length) {
    return;
  }

  const group = root.append("g").attr("class", "markers-layer");

  state.markers.forEach((marker) => {
    const point = projectCoordinate(projection, [marker.lon, marker.lat]);
    if (!point) {
      return;
    }

    const markerGroup = group.append("g").attr("class", `marker marker--${marker.style}`);
    const labelPoint = {
      x: point.x + marker.offsetX,
      y: point.y + marker.offsetY,
    };

    drawMarkerShape(markerGroup, marker, point);

    if (marker.label.trim()) {
      const leaderStart = projectLeaderAnchor(point, labelPoint, marker);
      markerGroup
        .append("path")
        .attr("d", `M ${leaderStart.x} ${leaderStart.y} L ${labelPoint.x} ${labelPoint.y}`)
        .attr("fill", "none")
        .attr("stroke", state.borderColor)
        .attr("stroke-width", OUTLINE_STROKE_WIDTH)
        .attr("vector-effect", "non-scaling-stroke");

      appendMapLabel(markerGroup, {
        x: labelPoint.x + (marker.offsetX >= 0 ? 6 : -6),
        y: labelPoint.y + 3,
        text: marker.label.trim(),
        anchor: marker.offsetX >= 0 ? "start" : "end",
        fill: state.borderColor,
      });
    }
  });
}

function drawMarkerShape(group, marker, point) {
  const strokeWidth = marker.style === "filledDot" ? 0 : OUTLINE_STROKE_WIDTH;

  if (marker.style === "ring") {
    group
      .append("circle")
      .attr("cx", point.x)
      .attr("cy", point.y)
      .attr("r", Math.max(7, marker.size))
      .attr("fill", "#ffffff")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", strokeWidth)
      .attr("vector-effect", "non-scaling-stroke");
    return;
  }

  if (marker.style === "dashedOval") {
    group
      .append("ellipse")
      .attr("cx", point.x)
      .attr("cy", point.y)
      .attr("rx", Math.max(9, marker.size))
      .attr("ry", Math.max(7, marker.size * marker.aspect))
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("stroke-dasharray", "5pt 4pt")
      .attr("transform", `rotate(${marker.rotation} ${point.x} ${point.y})`)
      .attr("vector-effect", "non-scaling-stroke");
    return;
  }

  if (marker.style === "point") {
    group
      .append("circle")
      .attr("cx", point.x)
      .attr("cy", point.y)
      .attr("r", Math.max(4.5, marker.size * 0.62))
      .attr("fill", "#ffffff")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("vector-effect", "non-scaling-stroke");
    return;
  }

  group
    .append("circle")
    .attr("cx", point.x)
    .attr("cy", point.y)
    .attr("r", Math.max(2.8, marker.size))
    .attr("fill", state.borderColor)
    .attr("stroke", "none");
}

function projectLeaderAnchor(origin, labelPoint, marker) {
  const deltaX = labelPoint.x - origin.x;
  const deltaY = labelPoint.y - origin.y;
  const distance = Math.hypot(deltaX, deltaY) || 1;
  const unitX = deltaX / distance;
  const unitY = deltaY / distance;
  const radius =
    marker.style === "dashedOval"
      ? Math.max(marker.size, marker.size * marker.aspect, 10)
      : marker.style === "filledDot"
        ? Math.max(2.8, marker.size)
        : Math.max(6, marker.size);

  return {
    x: origin.x + unitX * radius,
    y: origin.y + unitY * radius,
  };
}

function renderInsetLayer(root, defs, mainProjection, selectedColorById) {
  if (!state.insets.length) {
    return;
  }

  const layer = root.append("g").attr("class", "insets-layer");

  state.insets.forEach((inset, index) => {
    renderSingleInset(layer, defs, mainProjection, inset, selectedColorById, index);
  });
}

function renderSingleInset(layer, defs, mainProjection, inset, selectedColorById, index) {
  const frame = normalizeInsetFrame(inset);
  const sourceFrame = buildInsetSourceFrame(mainProjection, inset, frame);

  if (sourceFrame) {
    renderDashedFrame(layer, sourceFrame, {
      stroke: state.borderColor,
      dasharray: "4.5pt 3.2pt",
    });
  }

  const panelGroup = layer.append("g").attr("class", "inset-panel");
  const clipId = `inset-clip-${sanitizeIdentifier(inset.id)}-${index}`;

  defs
    .append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("x", frame.x)
    .attr("y", frame.y)
    .attr("width", frame.width)
    .attr("height", frame.height);

  panelGroup
    .append("rect")
    .attr("x", frame.x)
    .attr("y", frame.y)
    .attr("width", frame.width)
    .attr("height", frame.height)
      .attr("fill", state.oceanColor)
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("vector-effect", "non-scaling-stroke");

  const insetGroup = panelGroup.append("g").attr("clip-path", `url(#${clipId})`);
  renderInsetMapContent(insetGroup, mainProjection, frame, sourceFrame, selectedColorById, inset);

  if (inset.label.trim()) {
    appendMapLabel(panelGroup, {
      x: frame.x + 14,
      y: frame.y + 22,
      text: inset.label.trim(),
      anchor: "start",
      fill: state.borderColor,
    });
  }

  if (sourceFrame) {
    renderInsetConnectors(layer, frame, sourceFrame);
  }
}

function renderInsetMapContent(insetGroup, mainProjection, frame, sourceFrame, selectedColorById, inset) {
  if (!sourceFrame) {
    const insetProjection = buildInsetProjection(frame, inset);
    const insetAtlasDataset = getAtlasDataset(Math.max(state.viewZoom * 2.4, 10), true);
    const selectedIds = new Set(state.selected.map((country) => country.id));
    const insetBorderGeometry = buildBorderGeometry(insetAtlasDataset, selectedIds);
    renderAtlasLayer(insetGroup, insetProjection, insetAtlasDataset, selectedColorById, insetBorderGeometry, {
      wrap: false,
      clipRect: frame,
      clipPadding: INSET_RENDER_CLIP_PADDING,
    });
    return;
  }

  const scale = Math.min(frame.width / sourceFrame.width, frame.height / sourceFrame.height);
  const offsetX = frame.x + (frame.width - sourceFrame.width * scale) / 2;
  const offsetY = frame.y + (frame.height - sourceFrame.height * scale) / 2;
  const transformedGroup = insetGroup
    .append("g")
    .attr(
      "transform",
      `translate(${offsetX - sourceFrame.x * scale} ${offsetY - sourceFrame.y * scale}) scale(${scale})`,
    );
  const insetAtlasDataset = getAtlasDataset(Math.max(state.viewZoom * scale * 2.2, 6), true);
  const selectedIds = new Set(state.selected.map((country) => country.id));
  const insetBorderGeometry = buildBorderGeometry(insetAtlasDataset, selectedIds);
  renderAtlasLayer(transformedGroup, mainProjection, insetAtlasDataset, selectedColorById, insetBorderGeometry, {
    wrap: false,
    clipRect: sourceFrame,
    clipPadding: INSET_RENDER_CLIP_PADDING,
  });
}

function buildInsetProjection(frame, inset) {
  const projection = buildBaseProjection();
  const target = buildInsetFocusGeometry(inset) ?? { type: "MultiPoint", coordinates: inset.focusPoints };
  projection.fitExtent(
    [
      [frame.x + 10, frame.y + 10],
      [frame.x + frame.width - 10, frame.y + frame.height - 10],
    ],
    target,
  );
  return projection;
}

function buildInsetFocusGeometry(inset) {
  const features = [];
  const outline = getInsetOutline(inset);
  if (outline.length >= 4) {
    features.push({
      type: "Polygon",
      coordinates: [outline],
    });
  }

  const focusPoints = getInsetFocusPoints(inset);
  if (focusPoints.length) {
    features.push({
      type: "MultiPoint",
      coordinates: focusPoints,
    });
  }

  if (!features.length) {
    const bounds = getInsetGeoBounds(inset);
    if (!bounds) {
      return null;
    }
    const { west, east, south, north } = bounds;
    features.push(
      {
        type: "MultiPoint",
        coordinates: [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [(west + east) / 2, (south + north) / 2],
        ],
      },
      {
        type: "Polygon",
        coordinates: [[
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ]],
      },
    );
  }

  return { type: "FeatureCollection", features };
}

function buildInsetSourceFrame(mainProjection, inset, panelFrame = null) {
  const projectedBounds = buildInsetProjectedBounds(mainProjection, inset);
  if (!projectedBounds) {
    return null;
  }

  const padding = clamp(Math.round(Math.min(projectedBounds.width, projectedBounds.height) * 0.12), 1, 10);
  const paddedBounds = padRect(projectedBounds, padding);
  const aspectFrame =
    panelFrame && panelFrame.width > 0 && panelFrame.height > 0
      ? expandRectToAspect(paddedBounds, panelFrame.width / panelFrame.height)
      : paddedBounds;

  return scaleRectFromCenter(aspectFrame, 1 / getInsetZoomScale(inset));
}

function renderInsetConnectors(layer, frame, sourceFrame) {
  const sourceCenter = {
    x: sourceFrame.x + sourceFrame.width / 2,
    y: sourceFrame.y + sourceFrame.height / 2,
  };
  const panelCenter = {
    x: frame.x + frame.width / 2,
    y: frame.y + frame.height / 2,
  };
  const sourceCorners = getFrameCorners(sourceFrame);
  const panelCorners = getFrameCorners(frame);
  const useHorizontal = Math.abs(panelCenter.x - sourceCenter.x) >= Math.abs(panelCenter.y - sourceCenter.y);
  let sourceAnchors;
  let panelAnchors;

  if (useHorizontal) {
    if (panelCenter.x >= sourceCenter.x) {
      sourceAnchors = [sourceCorners.topRight, sourceCorners.bottomRight];
      panelAnchors = [panelCorners.topLeft, panelCorners.bottomLeft];
    } else {
      sourceAnchors = [sourceCorners.topLeft, sourceCorners.bottomLeft];
      panelAnchors = [panelCorners.topRight, panelCorners.bottomRight];
    }
  } else if (panelCenter.y >= sourceCenter.y) {
    sourceAnchors = [sourceCorners.bottomLeft, sourceCorners.bottomRight];
    panelAnchors = [panelCorners.topLeft, panelCorners.topRight];
  } else {
    sourceAnchors = [sourceCorners.topLeft, sourceCorners.topRight];
    panelAnchors = [panelCorners.bottomLeft, panelCorners.bottomRight];
  }

  sourceAnchors.forEach((sourceAnchor, index) => {
    const panelAnchor = panelAnchors[index];
    layer
      .append("path")
      .attr("d", `M ${sourceAnchor.x} ${sourceAnchor.y} L ${panelAnchor.x} ${panelAnchor.y}`)
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("opacity", 0.76)
      .attr("vector-effect", "non-scaling-stroke");
  });
}

function buildInsetProjectedBounds(mainProjection, inset) {
  const outline = getInsetOutline(inset);
  const focusPoints = getInsetFocusPoints(inset);
  const bounds = getInsetGeoBounds(inset);
  const coordinateSet =
    outline.length >= 4 ? outline : focusPoints.length ? focusPoints : bounds ? buildInsetBoundsRing(bounds) : [];

  if (!coordinateSet.length) {
    return null;
  }

  const projectedPoints = getCompactProjectedPoints(mainProjection, coordinateSet);
  if (!projectedPoints.length) {
    return null;
  }

  return rectFromBounds(computeBounds(projectedPoints), 1, 1);
}

function rectFromBounds(bounds, minWidth = 1, minHeight = 1) {
  const width = Math.max(minWidth, bounds.maxX - bounds.minX);
  const height = Math.max(minHeight, bounds.maxY - bounds.minY);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

function padRect(rect, padding) {
  const safePadding = Math.max(0, Number(padding) || 0);
  return {
    x: rect.x - safePadding,
    y: rect.y - safePadding,
    width: rect.width + safePadding * 2,
    height: rect.height + safePadding * 2,
  };
}

function expandRectToAspect(rect, aspectRatio) {
  const safeAspect = Math.max(0.05, Number(aspectRatio) || 1);
  const currentAspect = rect.width / Math.max(rect.height, 1);
  if (Math.abs(currentAspect - safeAspect) < 0.0001) {
    return rect;
  }

  if (currentAspect < safeAspect) {
    const width = Math.max(1, rect.height * safeAspect);
    return {
      x: rect.x + rect.width / 2 - width / 2,
      y: rect.y,
      width,
      height: rect.height,
    };
  }

  const height = Math.max(1, rect.width / safeAspect);
  return {
    x: rect.x,
    y: rect.y + rect.height / 2 - height / 2,
    width: rect.width,
    height,
  };
}

function normalizeInsetFrame(inset) {
  const defaultSize = getDefaultInsetPanelSize(getInsetAspectRatio(inset));
  const preferredWidth =
    Number.isFinite(Number(inset.panelWidth)) && Number(inset.panelWidth) > 0
      ? Number(inset.panelWidth)
      : defaultSize.width;
  const preferredHeight =
    Number.isFinite(Number(inset.panelHeight)) && Number(inset.panelHeight) > 0
      ? Number(inset.panelHeight)
      : defaultSize.height;
  const { width, height } = normalizeInsetPanelSize(
    preferredWidth,
    preferredHeight,
    Math.min(MAX_INSET_PANEL_WIDTH, state.width),
    state.height,
  );
  const x = clamp(inset.panelX, 0, Math.max(0, state.width - width));
  const y = clamp(inset.panelY, 0, Math.max(0, state.height - height));

  inset.panelWidth = width;
  inset.panelHeight = height;
  inset.panelX = x;
  inset.panelY = y;

  return { x, y, width, height };
}

function getInsetZoomScale(inset) {
  const zoomScale = Number(inset?.zoomScale);
  const normalized = Number.isFinite(zoomScale) ? zoomScale : 1;
  inset.zoomScale = clamp(normalized, MIN_INSET_ZOOM_SCALE, MAX_INSET_ZOOM_SCALE);
  return inset.zoomScale;
}

function scaleRectFromCenter(rect, factor) {
  const normalizedFactor = Math.max(0.05, Number(factor) || 1);
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const width = Math.max(1, rect.width * normalizedFactor);
  const height = Math.max(1, rect.height * normalizedFactor);
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

function getInsetAspectRatio(inset) {
  const storedRatio = Number(inset?.aspectRatio);
  if (Number.isFinite(storedRatio) && storedRatio > 0) {
    return clamp(storedRatio, 0.35, 3.8);
  }

  const width = Number(inset?.panelWidth);
  const height = Number(inset?.panelHeight);
  if (Number.isFinite(width) && Number.isFinite(height) && height > 0) {
    return clamp(width / height, 0.35, 3.8);
  }

  return 1;
}

function normalizeInsetPanelSize(preferredWidth, preferredHeight, maxWidth, maxHeight) {
  const constrainedMaxWidth = Math.max(MIN_INSET_PANEL_WIDTH, Number(maxWidth) || MIN_INSET_PANEL_WIDTH);
  const constrainedMaxHeight = Math.max(MIN_INSET_PANEL_HEIGHT, Number(maxHeight) || MIN_INSET_PANEL_HEIGHT);
  return {
    width: clamp(Math.round(Number(preferredWidth) || MIN_INSET_PANEL_WIDTH), MIN_INSET_PANEL_WIDTH, constrainedMaxWidth),
    height: clamp(
      Math.round(Number(preferredHeight) || MIN_INSET_PANEL_HEIGHT),
      MIN_INSET_PANEL_HEIGHT,
      constrainedMaxHeight,
    ),
  };
}

function setInsetPanelSizeFromWidth(inset, preferredWidth) {
  const defaultSize = getDefaultInsetPanelSize(getInsetAspectRatio(inset));
  const size = normalizeInsetPanelSize(
    preferredWidth,
    inset.panelHeight ?? defaultSize.height,
    Math.min(MAX_INSET_PANEL_WIDTH, Math.max(MIN_INSET_PANEL_WIDTH, state.width - inset.panelX)),
    Math.max(MIN_INSET_PANEL_HEIGHT, state.height - inset.panelY),
  );
  inset.panelWidth = size.width;
  inset.panelHeight = size.height;
  inset.panelX = clamp(inset.panelX, 0, Math.max(0, state.width - size.width));
  inset.panelY = clamp(inset.panelY, 0, Math.max(0, state.height - size.height));
  return size;
}

function setInsetPanelSizeFromHeight(inset, preferredHeight) {
  const defaultSize = getDefaultInsetPanelSize(getInsetAspectRatio(inset));
  const size = normalizeInsetPanelSize(
    inset.panelWidth ?? defaultSize.width,
    preferredHeight,
    Math.min(MAX_INSET_PANEL_WIDTH, Math.max(MIN_INSET_PANEL_WIDTH, state.width - inset.panelX)),
    Math.max(MIN_INSET_PANEL_HEIGHT, state.height - inset.panelY),
  );
  inset.panelWidth = size.width;
  inset.panelHeight = size.height;
  inset.panelX = clamp(inset.panelX, 0, Math.max(0, state.width - size.width));
  inset.panelY = clamp(inset.panelY, 0, Math.max(0, state.height - size.height));
  return size;
}

function buildInsetResizeFrame(inset, startFrame, deltaX, deltaY) {
  const { width, height } = normalizeInsetPanelSize(
    startFrame.width + deltaX,
    startFrame.height + deltaY,
    Math.min(MAX_INSET_PANEL_WIDTH, state.width - startFrame.x),
    state.height - startFrame.y,
  );
  return {
    x: startFrame.x,
    y: startFrame.y,
    width,
    height,
  };
}

function getFrameCorners(frame) {
  return {
    topLeft: { x: frame.x, y: frame.y },
    topRight: { x: frame.x + frame.width, y: frame.y },
    bottomRight: { x: frame.x + frame.width, y: frame.y + frame.height },
    bottomLeft: { x: frame.x, y: frame.y + frame.height },
  };
}

function renderDashedFrame(container, frame, options = {}) {
  const group = container.append("g").attr("class", "dashed-frame");
  const stroke = options.stroke ?? state.borderColor;
  const strokeWidth = options.strokeWidth ?? OUTLINE_STROKE_WIDTH;
  const dasharray = options.dasharray ?? "4.5pt 3.2pt";
  const opacity = options.opacity ?? 1;
  const corners = getFrameCorners(frame);
  const edges = [
    [corners.topLeft, corners.topRight],
    [corners.topRight, corners.bottomRight],
    [corners.bottomRight, corners.bottomLeft],
    [corners.bottomLeft, corners.topLeft],
  ];

  edges.forEach(([start, end]) => {
    group
      .append("path")
      .attr("d", `M ${start.x} ${start.y} L ${end.x} ${end.y}`)
      .attr("fill", "none")
      .attr("stroke", stroke)
      .attr("stroke-width", strokeWidth)
      .attr("stroke-dasharray", dasharray)
      .attr("stroke-linecap", "butt")
      .attr("opacity", opacity)
      .attr("vector-effect", "non-scaling-stroke");
  });
}

function computeBounds(points) {
  return points.reduce(
    (accumulator, point) => ({
      minX: Math.min(accumulator.minX, point.x),
      minY: Math.min(accumulator.minY, point.y),
      maxX: Math.max(accumulator.maxX, point.x),
      maxY: Math.max(accumulator.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

function getInsetGeoBounds(inset) {
  if (inset.geoBounds) {
    return inset.geoBounds;
  }

  if (!Array.isArray(inset.focusPoints) || inset.focusPoints.length < 2) {
    return null;
  }

  return computeGeoBounds(inset.focusPoints);
}

function getInsetOutline(inset) {
  if (!Array.isArray(inset?.outline)) {
    return [];
  }

  const coordinates = inset.outline
    .filter(isFiniteCoordinate)
    .map(([longitude, latitude]) => [Number(longitude), clamp(Number(latitude), -90, 90)]);
  if (coordinates.length < 3) {
    return [];
  }

  return closeCoordinateRing(unwrapLongitudeCoordinates(coordinates));
}

function getInsetFocusPoints(inset) {
  if (!Array.isArray(inset?.focusPoints)) {
    return [];
  }

  const coordinates = inset.focusPoints
    .filter(isFiniteCoordinate)
    .map(([longitude, latitude]) => [Number(longitude), clamp(Number(latitude), -90, 90)]);
  return coordinates.length ? unwrapLongitudeCoordinates(coordinates) : [];
}

function buildInsetBoundsRing(bounds) {
  return [
    [bounds.west, bounds.south],
    [bounds.east, bounds.south],
    [bounds.east, bounds.north],
    [bounds.west, bounds.north],
    [bounds.west, bounds.south],
  ];
}

function renderScaleBar(root, projection, padding) {
  const spec = buildScaleBarSpec(projection, padding);
  if (!spec) {
    return;
  }

  const group = root.append("g").attr("class", "scale-bar");
  const y = spec.y;
  const x = spec.x;
  const rightX = x + spec.lengthPx;

  group
    .append("path")
    .attr("d", `M ${x} ${y} L ${rightX} ${y}`)
    .attr("fill", "none")
    .attr("stroke", state.borderColor)
    .attr("stroke-width", OUTLINE_STROKE_WIDTH)
    .attr("vector-effect", "non-scaling-stroke");

  group
    .append("path")
    .attr("d", `M ${x} ${y - 8} L ${x} ${y + 1} M ${rightX} ${y - 8} L ${rightX} ${y + 1}`)
    .attr("fill", "none")
    .attr("stroke", state.borderColor)
    .attr("stroke-width", OUTLINE_STROKE_WIDTH)
    .attr("vector-effect", "non-scaling-stroke");

  appendMapLabel(group, {
    x,
    y: y - 12,
    text: "0",
    anchor: "middle",
    fill: state.borderColor,
  });
  appendMapLabel(group, {
    x: rightX,
    y: y - 12,
    text: formatScaleDistance(spec.distanceKm),
    anchor: "middle",
    fill: state.borderColor,
  });
}

function buildScaleBarSpec(projection, padding) {
  const maxUsablePx = Math.max(60, state.width - padding * 2 - 70);
  const targetPx = clamp(state.width * 0.15, 60, Math.min(220, maxUsablePx));
  const x = clamp(padding + 28, 14, Math.max(14, state.width - padding - targetPx - 20));
  const yCandidates = [
    state.height - padding - 28,
    state.height - padding - 48,
    state.height - padding - 68,
  ];

  for (const y of yCandidates) {
    const start = projection.invert([x, y]);
    const end = projection.invert([x + targetPx, y]);
    if (!isFiniteCoordinate(start) || !isFiniteCoordinate(end)) {
      continue;
    }

    const rawDistanceKm = d3.geoDistance(start, end) * EARTH_RADIUS_KM;
    if (!Number.isFinite(rawDistanceKm) || rawDistanceKm <= 0) {
      continue;
    }

    const niceDistanceKm = pickNiceDistanceKm(rawDistanceKm);
    if (!niceDistanceKm) {
      continue;
    }

    return {
      x,
      y,
      lengthPx: targetPx * (niceDistanceKm / rawDistanceKm),
      distanceKm: niceDistanceKm,
    };
  }

  return null;
}

function pickNiceDistanceKm(maxDistanceKm) {
  const magnitude = 10 ** Math.floor(Math.log10(maxDistanceKm));
  const candidates = [1, 2, 5].flatMap((base) => [
    base * magnitude * 0.1,
    base * magnitude,
    base * magnitude * 10,
  ]);
  const filtered = candidates.filter((candidate) => candidate > 0 && candidate <= maxDistanceKm);
  return filtered.length ? Math.max(...filtered) : null;
}

function appendMapLabel(group, { x, y, text, anchor = "start", fill = "#000000", opacity = 1 }) {
  const labelGroup = group
    .append("g")
    .attr("class", "map-output-text")
    .attr("transform", `translate(${x} ${y}) scale(${MAP_FONT_STRETCH_X} 1)`)
    .attr("opacity", opacity);

  labelGroup
    .append("text")
    .attr("x", 0)
    .attr("y", 0)
    .attr("text-anchor", anchor)
    .attr("dominant-baseline", "alphabetic")
    .attr("fill", fill)
    .attr("font-family", MAP_FONT_FAMILY)
    .attr("font-size", `${state.mapFontSizePt}pt`)
    .attr("paint-order", "stroke fill")
    .attr("stroke", "rgba(255,255,255,0.92)")
    .attr("stroke-width", getMapLabelStrokeWidth())
    .attr("stroke-linejoin", "round")
    .text(text);
}

function getMapLabelStrokeWidth() {
  return `${Math.max(1.4, state.mapFontSizePt * 0.22)}px`;
}

function updateSelectionSummary() {
  const parts = [];
  const currentSelection = getCurrentSelectionEntries();

  if (currentSelection.length) {
    parts.push(`${currentSelection.length}개 ${state.mapVersion === "world" ? "국가" : "권역"}`);
  } else {
    parts.push(state.mapVersion === "world" ? "국가 선택 없음" : "권역 선택 없음");
  }

  if (state.mapVersion === "world" && state.markers.length) {
    parts.push(`마커 ${state.markers.length}개`);
  }

  if (state.mapVersion === "world" && state.insets.length) {
    parts.push(`인셋 ${state.insets.length}개`);
  }

  if (state.mapVersion === "korea") {
    parts.push(koreaRegionLevelLabels[state.koreaLevel]);
    if (state.koreaLevel === "municipalities" && state.koreaParentCode) {
      parts.push(getKoreaProvinceName(state.koreaParentCode));
    }
  }

  elements.selectionSummary.textContent = parts.join(" · ");
}

function updateExportMeta() {
  if (state.mapVersion === "korea") {
    const scaleText = state.showScaleBar ? "축척 포함" : "축척 없음";
    const borderText =
      state.borderMode === "none" ? "경계선 없음" : state.borderMode === "dashed" ? "경계선 점선" : "경계선 실선";
    const scopeText =
      state.koreaLevel === "municipalities" && state.koreaParentCode
        ? `범위 ${getKoreaProvinceName(state.koreaParentCode)}`
        : "범위 전국";
    elements.exportMeta.textContent =
      `${state.width} × ${state.height} px · 대한민국 · ${koreaRegionLevelLabels[state.koreaLevel]} · ` +
      `${scopeText} · ${formatPointSize(state.mapFontSizePt)} · ${scaleText} · ${borderText} · 윤곽선 0.4pt`;
    return;
  }

  const scaleText = state.showScaleBar ? "축척 포함" : "축척 없음";
  const borderText =
    state.borderMode === "none" ? "국경선 없음" : state.borderMode === "dashed" ? "국경선 점선" : "국경선 실선";
  const detailModeText =
    state.coastlineDetail === "performance"
      ? "성능 우선"
      : state.coastlineDetail === "detailed"
        ? "선명하게"
        : state.coastlineDetail === "max"
          ? "최대"
          : "자동";
  const detailText = getAtlasLevelForZoom(state.viewZoom).replace("m", "m 디테일");
  elements.exportMeta.textContent =
    `${state.width} × ${state.height} px · ${projectionModeLabels[state.projectionMode]} · ` +
    `중심 ${formatLongitude(state.centerLongitude)} · 보기 ${Math.round(state.viewZoom * 100)}% · ` +
    `${formatPointSize(state.mapFontSizePt)} · ${scaleText} · ${borderText} · ${detailModeText} · ${detailText} · 윤곽선 0.4pt`;
}

function exportCurrentSvg() {
  if (!previewTransformIsIdentity()) {
    commitPreviewInteraction();
  }

  if (!currentSvgNode) {
    setStatus("내보낼 지도를 아직 그리지 못했습니다.", true);
    return;
  }

  const serializer = new XMLSerializer();
  const exportNode = buildExportSvgNode();
  const serialized = serializer.serializeToString(exportNode);
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
  const blob = new Blob([svgContent], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildDownloadName();
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus("SVG 파일을 내보냈습니다.");
}

function buildExportSvgNode() {
  const exportNode = currentSvgNode.cloneNode(true);
  const defs = ensureDefsElement(exportNode);
  const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleElement.textContent = buildSvgFontStyle();
  defs.insertBefore(styleElement, defs.firstChild);
  return exportNode;
}

function ensureDefsElement(svgNode) {
  const existingDefs = svgNode.querySelector("defs");
  if (existingDefs) {
    return existingDefs;
  }

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  svgNode.insertBefore(defs, svgNode.firstChild);
  return defs;
}

function buildSvgFontStyle() {
  const fontSrc = embeddedMapFontDataUrl || "./fonts/SidaeAi_S-Regular.otf";
  return [
    `@font-face { font-family: '${MAP_FONT_FAMILY}'; src: url("${fontSrc}") format('opentype'); }`,
    `.map-output-text { font-family: '${MAP_FONT_FAMILY}'; }`,
  ].join("\n");
}

function buildDownloadName() {
  if (state.mapVersion === "korea") {
    const currentSelection = getCurrentSelectionEntries();
    const prefix = currentSelection.length
      ? currentSelection
          .slice(0, 4)
          .map((region) => region.id)
          .join("-")
      : state.koreaLevel;
    return `korea-map-${prefix || "selection"}-${state.koreaLevel}.svg`;
  }

  const prefix = state.selected.length
    ? state.selected
        .slice(0, 4)
        .map((country) =>
          country.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
        )
        .filter(Boolean)
        .join("-")
    : "world";

  return `country-map-${prefix || "selection"}-${state.projectionMode}.svg`;
}

function mountPreviewCanvas() {
  if (!currentSvgNode) {
    return;
  }

  const maxWidth = Math.max(260, elements.previewStage.clientWidth - 28);
  const maxHeight = Math.max(260, elements.previewStage.clientHeight - 28);
  // Preview can scale up independently from the export canvas so small outputs remain easy to edit.
  currentPreviewScale = Math.max(1, Math.min(maxWidth / state.width, maxHeight / state.height));

  const canvasShell = document.createElement("div");
  canvasShell.className = `canvas-shell mode-${getActiveViewMode()}`;
  canvasShell.style.width = `${Math.round(state.width * currentPreviewScale)}px`;
  canvasShell.style.height = `${Math.round(state.height * currentPreviewScale)}px`;
  canvasShell.style.backgroundColor = state.oceanColor;
  canvasShell.addEventListener("pointerdown", handleCanvasPointerDown);
  canvasShell.addEventListener("wheel", handleCanvasWheel, { passive: false });
  canvasShell.addEventListener("gesturestart", handleCanvasGestureStart);
  canvasShell.addEventListener("gesturechange", handleCanvasGestureChange);
  canvasShell.addEventListener("gestureend", handleCanvasGestureEnd);

  const surface = document.createElement("div");
  surface.className = "canvas-surface";
  surface.style.backgroundColor = state.oceanColor;
  surface.append(currentSvgNode);

  const editorLayer = document.createElement("div");
  editorLayer.className = "editor-layer";
  surface.append(editorLayer);

  canvasShell.append(surface);
  currentCanvasSurface = surface;

  const overlay = document.createElement("div");
  overlay.className = "interaction-overlay";
  canvasShell.append(overlay);

  const resizeHandle = document.createElement("button");
  resizeHandle.type = "button";
  resizeHandle.className = "resize-handle";
  resizeHandle.title = "드래그해 지도 비율 조절";
  resizeHandle.addEventListener("pointerdown", startArtboardResize);
  canvasShell.append(resizeHandle);

  mountAnnotationEditors(editorLayer, canvasShell);
  elements.previewStage.replaceChildren(canvasShell);
  elements.previewStage.style.backgroundColor = state.oceanColor;
}

function mountAnnotationEditors(editorLayer, shell) {
  editorLayer.replaceChildren();

  state.insets.forEach((inset) => {
    mountInsetEditor(editorLayer, shell, inset);
  });

  state.markers.forEach((marker) => {
    mountMarkerEditor(editorLayer, shell, marker);
  });
}

function mountInsetEditor(editorLayer, shell, inset) {
  const frame = normalizeInsetFrame(inset);
  const editor = document.createElement("div");
  editor.className = "annotation-editor inset-editor";

  const tag = document.createElement("span");
  tag.className = "annotation-editor__tag";
  tag.textContent = inset.label || "Inset";
  editor.appendChild(tag);

  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "annotation-editor__handle";
  handle.setAttribute("aria-label", "인셋 크기 조절");
  editor.appendChild(handle);

  positionEditorFrame(editor, frame);

  editor.addEventListener("pointerdown", (event) => {
    if (event.target === handle) {
      return;
    }
    startInsetEditorDrag(event, shell, inset, editor);
  });

  handle.addEventListener("pointerdown", (event) => {
    startInsetEditorResize(event, shell, inset, editor);
  });

  editorLayer.appendChild(editor);
}

function mountMarkerEditor(editorLayer, shell, marker) {
  const point = projectCoordinate(currentRenderContext.projection, [marker.lon, marker.lat]);
  if (!point || !isPointNearViewport(point, 120)) {
    return;
  }

  const editor = document.createElement("div");
  editor.className = `annotation-editor marker-editor marker-editor--${marker.style}`;

  const tag = document.createElement("span");
  tag.className = "annotation-editor__tag";
  tag.textContent = marker.label || markerStyleLabel(marker.style);
  editor.appendChild(tag);

  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "annotation-editor__handle";
  handle.setAttribute("aria-label", "마커 크기 조절");
  editor.appendChild(handle);

  positionEditorFrame(editor, buildMarkerEditorFrame(point, marker));

  editor.addEventListener("pointerdown", (event) => {
    if (event.target === handle) {
      return;
    }
    startMarkerEditorDrag(event, shell, marker, editor);
  });

  handle.addEventListener("pointerdown", (event) => {
    startMarkerEditorResize(event, shell, marker, editor);
  });

  editorLayer.appendChild(editor);
}

function startInsetEditorDrag(event, shell, inset, editor) {
  event.preventDefault();
  event.stopPropagation();
  if (!previewTransformIsIdentity()) {
    commitPreviewInteraction();
  }

  const startX = event.clientX;
  const startY = event.clientY;
  const startFrame = normalizeInsetFrame(inset);

  const onPointerMove = (moveEvent) => {
    const deltaX = (moveEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaY = (moveEvent.clientY - startY) / (currentPreviewScale || 1);
    const nextFrame = {
      x: clamp(startFrame.x + deltaX, 0, Math.max(0, state.width - startFrame.width)),
      y: clamp(startFrame.y + deltaY, 0, Math.max(0, state.height - startFrame.height)),
      width: startFrame.width,
      height: startFrame.height,
    };
    positionEditorFrame(editor, nextFrame);
  };

  const stop = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);

    const deltaX = (upEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaY = (upEvent.clientY - startY) / (currentPreviewScale || 1);
    beginHistoryStep("인셋 위치 변경");
    inset.panelX = clamp(startFrame.x + deltaX, 0, Math.max(0, state.width - startFrame.width));
    inset.panelY = clamp(startFrame.y + deltaY, 0, Math.max(0, state.height - startFrame.height));
    renderAnnotations();
    renderMap();
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function startInsetEditorResize(event, shell, inset, editor) {
  event.preventDefault();
  event.stopPropagation();
  if (!previewTransformIsIdentity()) {
    commitPreviewInteraction();
  }

  const startX = event.clientX;
  const startY = event.clientY;
  const startFrame = normalizeInsetFrame(inset);

  const onPointerMove = (moveEvent) => {
    const deltaX = (moveEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaY = (moveEvent.clientY - startY) / (currentPreviewScale || 1);
    const nextFrame = buildInsetResizeFrame(inset, startFrame, deltaX, deltaY);
    positionEditorFrame(editor, nextFrame);
  };

  const stop = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);

    const deltaX = (upEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaY = (upEvent.clientY - startY) / (currentPreviewScale || 1);
    const nextFrame = buildInsetResizeFrame(inset, startFrame, deltaX, deltaY);
    beginHistoryStep("인셋 크기 변경");
    inset.panelWidth = nextFrame.width;
    inset.panelHeight = nextFrame.height;
    renderAnnotations();
    renderMap();
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function startMarkerEditorDrag(event, shell, marker, editor) {
  event.preventDefault();
  event.stopPropagation();
  if (!previewTransformIsIdentity()) {
    commitPreviewInteraction();
  }

  const onPointerMove = (moveEvent) => {
    const point = getCanvasPointFromEvent(moveEvent, shell);
    if (!point) {
      return;
    }
    positionEditorFrame(editor, buildMarkerEditorFrame(point, marker));
  };

  const stop = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);

    const point = getCanvasPointFromEvent(upEvent, shell);
    const coordinate = point ? invertCanvasPoint(point) : null;
    if (coordinate) {
      beginHistoryStep("마커 위치 변경");
      marker.lon = coordinate[0];
      marker.lat = coordinate[1];
    }
    renderAnnotations();
    renderMap();
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function startMarkerEditorResize(event, shell, marker, editor) {
  event.preventDefault();
  event.stopPropagation();
  if (!previewTransformIsIdentity()) {
    commitPreviewInteraction();
  }

  const startX = event.clientX;
  const startY = event.clientY;
  const startSize = marker.size;
  const startAspect = marker.aspect;
  const startPoint = projectCoordinate(currentRenderContext.projection, [marker.lon, marker.lat]);
  if (!startPoint) {
    return;
  }

  const onPointerMove = (moveEvent) => {
    const deltaX = (moveEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaY = (moveEvent.clientY - startY) / (currentPreviewScale || 1);

    if (marker.style === "dashedOval") {
      const width = clamp(startSize * 2 + deltaX * 2, 18, 320);
      const height = clamp(startSize * startAspect * 2 + deltaY * 2, 14, 320);
      const previewMarker = {
        ...marker,
        size: width / 2,
        aspect: clamp(height / Math.max(width, 1), 0.2, 3),
      };
      positionEditorFrame(editor, buildMarkerEditorFrame(startPoint, previewMarker));
      return;
    }

    const nextSize = clamp(startSize + Math.max(deltaX, deltaY) / 2, 4, 180);
    positionEditorFrame(editor, buildMarkerEditorFrame(startPoint, { ...marker, size: nextSize }));
  };

  const stop = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);

    const deltaX = (upEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaY = (upEvent.clientY - startY) / (currentPreviewScale || 1);
    beginHistoryStep("마커 크기 변경");
    if (marker.style === "dashedOval") {
      const width = clamp(startSize * 2 + deltaX * 2, 18, 320);
      const height = clamp(startSize * startAspect * 2 + deltaY * 2, 14, 320);
      marker.size = width / 2;
      marker.aspect = clamp(height / Math.max(width, 1), 0.2, 3);
    } else {
      marker.size = clamp(startSize + Math.max(deltaX, deltaY) / 2, 4, 180);
    }
    renderAnnotations();
    renderMap();
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function positionEditorFrame(editor, frame) {
  editor.style.left = `${frame.x * currentPreviewScale}px`;
  editor.style.top = `${frame.y * currentPreviewScale}px`;
  editor.style.width = `${frame.width * currentPreviewScale}px`;
  editor.style.height = `${frame.height * currentPreviewScale}px`;
}

function buildMarkerEditorFrame(point, marker) {
  const padding = 12;
  const radiusX = marker.style === "dashedOval" ? Math.max(9, marker.size) : getMarkerVisualRadius(marker);
  const radiusY = marker.style === "dashedOval" ? Math.max(7, marker.size * marker.aspect) : getMarkerVisualRadius(marker);
  return {
    x: point.x - radiusX - padding,
    y: point.y - radiusY - padding,
    width: radiusX * 2 + padding * 2,
    height: radiusY * 2 + padding * 2,
  };
}

function getMarkerVisualRadius(marker) {
  if (marker.style === "ring") {
    return Math.max(7, marker.size);
  }
  if (marker.style === "point") {
    return Math.max(4.5, marker.size * 0.62);
  }
  if (marker.style === "filledDot") {
    return Math.max(2.8, marker.size);
  }
  return Math.max(9, marker.size);
}

function handleCanvasWheel(event) {
  if (!currentRenderContext || state.mapVersion !== "world") {
    return;
  }

  event.preventDefault();
  const point = getCanvasPointFromEvent(event, event.currentTarget);
  if (!point) {
    return;
  }

  const desiredFactor = Math.pow(2, -event.deltaY / 320);
  const actualFactor = clampPreviewScaleFactor(desiredFactor);
  updatePreviewInteraction(actualFactor, point);
  queuePreviewCommit();
}

function handleCanvasGestureStart(event) {
  if (state.mapVersion !== "world") {
    return;
  }

  activeGestureScale = event.scale || 1;
  event.preventDefault();
}

function handleCanvasGestureChange(event) {
  if (!currentRenderContext || state.mapVersion !== "world") {
    return;
  }

  event.preventDefault();
  const point = getCanvasPointFromEvent(event, event.currentTarget) ?? {
    x: state.width / 2,
    y: state.height / 2,
  };
  const nextScale = event.scale || 1;
  const factor = clampPreviewScaleFactor(nextScale / (activeGestureScale || 1));
  activeGestureScale = nextScale;
  updatePreviewInteraction(factor, point);
  queuePreviewCommit();
}

function handleCanvasGestureEnd(event) {
  if (state.mapVersion !== "world") {
    return;
  }

  activeGestureScale = 1;
  event.preventDefault();
}

function clampPreviewScaleFactor(desiredFactor) {
  const absoluteZoom = state.viewZoom * previewInteraction.scale * desiredFactor;
  const clampedZoom = clampViewZoom(absoluteZoom);
  const currentAbsoluteZoom = state.viewZoom * previewInteraction.scale;
  return clampedZoom / currentAbsoluteZoom;
}

function updatePreviewInteraction(scaleFactor, pivotPoint) {
  previewInteraction.scale *= scaleFactor;
  previewInteraction.translateX = scaleFactor * previewInteraction.translateX + (1 - scaleFactor) * pivotPoint.x;
  previewInteraction.translateY = scaleFactor * previewInteraction.translateY + (1 - scaleFactor) * pivotPoint.y;
  applyPreviewInteraction();
}

function applyPreviewInteraction() {
  if (!currentCanvasSurface) {
    return;
  }

  currentCanvasSurface.style.transform = [
    `translate(${previewInteraction.translateX * currentPreviewScale}px, ${previewInteraction.translateY * currentPreviewScale}px)`,
    `scale(${previewInteraction.scale})`,
  ].join(" ");
  updateWorkspaceStats();
}

function queuePreviewCommit() {
  if (previewInteraction.commitTimer) {
    window.clearTimeout(previewInteraction.commitTimer);
  }

  previewInteraction.commitTimer = window.setTimeout(() => {
    commitPreviewInteraction();
  }, 120);
}

function commitPreviewInteraction() {
  if (state.mapVersion !== "world") {
    resetPreviewInteractionState();
    return;
  }

  if (!currentRenderContext || previewTransformIsIdentity()) {
    resetPreviewInteractionState();
    return;
  }

  if (previewInteraction.commitTimer) {
    window.clearTimeout(previewInteraction.commitTimer);
    previewInteraction.commitTimer = null;
  }

  const oldZoom = state.viewZoom;
  const nextZoom = clampViewZoom(oldZoom * previewInteraction.scale);
  const actualScale = nextZoom / oldZoom;
  const baseTranslate = currentRenderContext.baseTranslate;

  beginHistoryStep("보기 이동");
  state.viewZoom = nextZoom;
  state.viewOffsetX =
    actualScale * state.viewOffsetX +
    previewInteraction.translateX +
    (actualScale - 1) * baseTranslate[0];
  state.viewOffsetY =
    actualScale * state.viewOffsetY +
    previewInteraction.translateY +
    (actualScale - 1) * baseTranslate[1];

  resetPreviewInteractionState();
  renderMap();
}

function resetPreviewInteractionState() {
  if (previewInteraction.commitTimer) {
    window.clearTimeout(previewInteraction.commitTimer);
    previewInteraction.commitTimer = null;
  }

  previewInteraction.scale = 1;
  previewInteraction.translateX = 0;
  previewInteraction.translateY = 0;

  if (currentCanvasSurface) {
    currentCanvasSurface.style.transform = "";
  }

  updateWorkspaceStats();
}

function previewTransformIsIdentity() {
  return (
    Math.abs(previewInteraction.scale - 1) < 0.0001 &&
    nearZero(previewInteraction.translateX) &&
    nearZero(previewInteraction.translateY)
  );
}

function startArtboardResize(event) {
  event.preventDefault();
  event.stopPropagation();

  const shell = event.currentTarget.parentElement;
  if (!shell) {
    return;
  }

  const startX = event.clientX;
  const startY = event.clientY;
  const startWidth = state.width;
  const startHeight = state.height;

  shell.classList.add("is-resizing");

  const onPointerMove = (moveEvent) => {
    const deltaWidth = (moveEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaHeight = (moveEvent.clientY - startY) / (currentPreviewScale || 1);
    const nextWidth = clampCanvasWidth(startWidth + deltaWidth, startWidth);
    const nextHeight = clampCanvasHeight(startHeight + deltaHeight, startHeight);

    shell.style.width = `${Math.round(nextWidth * currentPreviewScale)}px`;
    shell.style.height = `${Math.round(nextHeight * currentPreviewScale)}px`;
  };

  const stopResize = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopResize);
    window.removeEventListener("pointercancel", stopResize);
    shell.classList.remove("is-resizing");

    const deltaWidth = (upEvent.clientX - startX) / (currentPreviewScale || 1);
    const deltaHeight = (upEvent.clientY - startY) / (currentPreviewScale || 1);
    beginHistoryStep("캔버스 크기 변경");
    state.width = clampCanvasWidth(startWidth + deltaWidth, startWidth);
    state.height = clampCanvasHeight(startHeight + deltaHeight, startHeight);
    syncDimensionInputs();
    syncPresetButtons();
    renderMap();
    setStatus("미리보기 핸들로 캔버스 비율을 조절했습니다.");
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stopResize);
  window.addEventListener("pointercancel", stopResize);
}

function handleCanvasPointerDown(event) {
  if (event.button !== 0 || !currentRenderContext) {
    return;
  }

  if (state.mapVersion === "world" && !previewTransformIsIdentity()) {
    commitPreviewInteraction();
    return;
  }

  const shell = event.currentTarget;
  const startPoint = getCanvasPointFromEvent(event, shell);
  if (!startPoint) {
    return;
  }

  event.preventDefault();

  if (state.mapVersion === "korea") {
    startKoreaSelectionInteraction(shell, startPoint);
    return;
  }

  const activeMode = getActiveViewMode();

  if (activeMode === "pan") {
    startPanInteraction(startPoint);
    return;
  }

  if (activeMode === "marker") {
    startMarkerInteraction(shell, startPoint);
    return;
  }

  startBoxInteraction(shell, startPoint, activeMode === "inset" ? "inset" : "zoom");
}

function startKoreaSelectionInteraction(shell, startPoint) {
  let didMove = false;

  const onPointerMove = (moveEvent) => {
    const nextPoint = getCanvasPointFromEvent(moveEvent, shell);
    if (!nextPoint) {
      return;
    }
    didMove = didMove || Math.hypot(nextPoint.x - startPoint.x, nextPoint.y - startPoint.y) > 5;
  };

  const stop = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);

    if (didMove) {
      return;
    }

    const point = getCanvasPointFromEvent(upEvent, shell);
    if (!point) {
      return;
    }

    const toggled = toggleCountryAtCanvasPoint(point);
    if (!toggled) {
      setStatus("권역을 클릭하면 바로 켜고 끌 수 있습니다.");
    }
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function startPanInteraction(startPoint) {
  const startTranslateX = previewInteraction.translateX;
  const startTranslateY = previewInteraction.translateY;
  let didMove = false;

  const onPointerMove = (moveEvent) => {
    const nextPoint = getCanvasPointFromEvent(moveEvent, elements.previewStage.firstElementChild);
    if (!nextPoint) {
      return;
    }

    const deltaX = nextPoint.x - startPoint.x;
    const deltaY = nextPoint.y - startPoint.y;
    didMove = didMove || Math.hypot(deltaX, deltaY) > 3;
    previewInteraction.translateX = startTranslateX + deltaX;
    previewInteraction.translateY = startTranslateY + deltaY;
    applyPreviewInteraction();
  };

  const stopPan = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopPan);
    window.removeEventListener("pointercancel", stopPan);

    if (!didMove) {
      const point = getCanvasPointFromEvent(upEvent, elements.previewStage.firstElementChild);
      if (point) {
        toggleCountryAtCanvasPoint(point);
      }
      return;
    }

    commitPreviewInteraction();
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stopPan);
  window.addEventListener("pointercancel", stopPan);
}

function startMarkerInteraction(shell, startPoint) {
  const overlay = shell.querySelector(".interaction-overlay");
  const draft = document.createElement("div");
  draft.className = `marker-draft marker-draft--${state.markerDraftStyle}`;
  overlay.appendChild(draft);
  let latestPoint = startPoint;

  const stop = (upEvent) => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", cancel);
    draft.remove();

    const point = getCanvasPointFromEvent(upEvent, shell);
    if (!point) {
      return;
    }

    if (Math.hypot(point.x - startPoint.x, point.y - startPoint.y) <= 6) {
      addMarkerAtCanvasPoint(point);
      return;
    }

    addMarkerFromDrag(startPoint, latestPoint);
  };

  const handleMove = (moveEvent) => {
    const point = getCanvasPointFromEvent(moveEvent, shell);
    if (!point) {
      return;
    }

    latestPoint = point;
    updateMarkerDraft(draft, startPoint, point);
  };

  const cancel = () => {
    draft.remove();
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", cancel);
  };

  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", cancel);
}

function startBoxInteraction(shell, startPoint, mode) {
  const overlay = shell.querySelector(".interaction-overlay");
  const box = document.createElement("div");
  box.className = "selection-box";
  overlay.appendChild(box);

  const updateBox = (point) => {
    const rect = normalizeRect(startPoint, point);
    box.style.left = `${rect.x * currentPreviewScale}px`;
    box.style.top = `${rect.y * currentPreviewScale}px`;
    box.style.width = `${rect.width * currentPreviewScale}px`;
    box.style.height = `${rect.height * currentPreviewScale}px`;
    return rect;
  };

  updateBox(startPoint);

  const onPointerMove = (moveEvent) => {
    const point = getCanvasPointFromEvent(moveEvent, shell);
    if (!point) {
      return;
    }
    updateBox(point);
  };

  const stop = (upEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    box.remove();

    const endPoint = getCanvasPointFromEvent(upEvent, shell);
    if (!endPoint) {
      return;
    }

    const rect = normalizeRect(startPoint, endPoint);
    const minimumDragSize = mode === "inset" ? MIN_INSET_DRAG_SIZE : MIN_ZOOM_DRAG_SIZE;
    if (rect.width < minimumDragSize || rect.height < minimumDragSize) {
      if (mode === "zoom") {
        const toggled = toggleCountryAtCanvasPoint(endPoint);
        if (!toggled) {
          setStatus("짧게 클릭하면 국가를 선택하고, 크게 드래그하면 그 영역으로 확대합니다.");
        }
        return;
      }

      setStatus("인셋 영역이 너무 작습니다. 조금 더 넓게 드래그해 주세요.", true);
      return;
    }

    if (mode === "zoom") {
      applyZoomToRect(rect);
      renderMap();
      setStatus("드래그한 영역으로 확대했습니다.");
      return;
    }

    addInsetFromRect(rect);
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function addMarkerAtCanvasPoint(point) {
  const coordinate = invertCanvasPoint(point);
  if (!coordinate) {
    setStatus("이 위치에는 마커를 둘 수 없습니다.", true);
    return;
  }

  beginHistoryStep("마커 추가");
  state.markers.push(createMarkerData(coordinate));
  renderAnnotations();
  renderMap();
  setStatus(`${markerStyleLabel(state.markerDraftStyle)} 마커를 추가했습니다.`);
}

function addMarkerFromDrag(startPoint, endPoint) {
  const rect = normalizeRect(startPoint, endPoint);
  const centerPoint = {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
  const coordinate = invertCanvasPoint(centerPoint);
  if (!coordinate) {
    setStatus("이 위치에는 마커를 둘 수 없습니다.", true);
    return;
  }

  const marker = createMarkerData(coordinate);
  if (state.markerDraftStyle === "dashedOval") {
    marker.size = clamp(rect.width / 2, 9, 180);
    marker.aspect = clamp(rect.height / Math.max(rect.width, 1), 0.2, 3);
  } else {
    marker.size = clamp(Math.max(rect.width, rect.height) / 2, 4, 180);
  }

  beginHistoryStep("마커 추가");
  state.markers.push(marker);
  renderAnnotations();
  renderMap();
  setStatus(`${markerStyleLabel(state.markerDraftStyle)} 마커를 드래그 크기로 추가했습니다.`);
}

function createMarkerData(coordinate) {
  const defaults = markerDefaults(state.markerDraftStyle);
  return {
    id: makeId("marker"),
    lon: coordinate[0],
    lat: coordinate[1],
    style: state.markerDraftStyle,
    label: defaults.label === "auto" ? nextAnnotationLabel("marker") : defaults.label,
    size: defaults.size,
    aspect: defaults.aspect,
    rotation: defaults.rotation,
    offsetX: defaults.offsetX,
    offsetY: defaults.offsetY,
  };
}

function updateMarkerDraft(draft, startPoint, endPoint) {
  const rect = normalizeRect(startPoint, endPoint);
  if (rect.width < 6 && rect.height < 6) {
    draft.style.opacity = "0";
    return;
  }

  draft.style.opacity = "1";
  draft.style.left = `${rect.x * currentPreviewScale}px`;
  draft.style.top = `${rect.y * currentPreviewScale}px`;
  draft.style.width = `${Math.max(14, rect.width) * currentPreviewScale}px`;
  draft.style.height = `${Math.max(14, rect.height) * currentPreviewScale}px`;
}

function addInsetFromRect(rect) {
  const sample = sampleGeoCollectionFromRect(rect);
  if (!sample || sample.focusPoints.length < 1) {
    setStatus("이 영역으로는 인셋을 만들기 어렵습니다. 조금 더 넓게 잡아 주세요.", true);
    return;
  }

  const aspectRatio = clamp(rect.width / Math.max(rect.height, 1), 0.35, 3.8);
  const frame = getDefaultInsetFrame(state.insets.length, aspectRatio);
  beginHistoryStep("인셋 추가");
  state.insets.push({
    id: makeId("inset"),
    label: nextAnnotationLabel("inset"),
    panelX: frame.x,
    panelY: frame.y,
    panelWidth: frame.width,
    panelHeight: frame.height,
    aspectRatio,
    zoomScale: 0.7,
    outline: sample.outline,
    focusPoints: sample.focusPoints,
    geoBounds: sample.geoBounds,
  });

  renderAnnotations();
  renderMap();
  setStatus("확대 인셋을 추가했습니다.");
}

function sampleGeoCollectionFromRect(rect) {
  const outlineScreenPoints = [];
  const edgeSteps = clamp(Math.round(Math.max(rect.width, rect.height) / 12), 2, 12);

  for (let step = 0; step <= edgeSteps; step += 1) {
    const ratio = step / edgeSteps;
    outlineScreenPoints.push({ x: rect.x + rect.width * ratio, y: rect.y });
  }
  for (let step = 1; step <= edgeSteps; step += 1) {
    const ratio = step / edgeSteps;
    outlineScreenPoints.push({ x: rect.x + rect.width, y: rect.y + rect.height * ratio });
  }
  for (let step = edgeSteps - 1; step >= 0; step -= 1) {
    const ratio = step / edgeSteps;
    outlineScreenPoints.push({ x: rect.x + rect.width * ratio, y: rect.y + rect.height });
  }
  for (let step = edgeSteps - 1; step >= 1; step -= 1) {
    const ratio = step / edgeSteps;
    outlineScreenPoints.push({ x: rect.x, y: rect.y + rect.height * ratio });
  }

  const outline = dedupeCoordinates(
    outlineScreenPoints.map((point) => invertCanvasPoint(point)).filter(Boolean),
    6,
  );

  const focusPoints = [];
  const gridSize = clamp(Math.round(Math.min(rect.width, rect.height) / 14), 1, 4);
  for (let row = 0; row <= gridSize; row += 1) {
    for (let column = 0; column <= gridSize; column += 1) {
      const point = {
        x: rect.x + (rect.width * column) / gridSize,
        y: rect.y + (rect.height * row) / gridSize,
      };
      const coordinate = invertCanvasPoint(point);
      if (coordinate) {
        focusPoints.push(coordinate);
      }
    }
  }

  const centerCoordinate = invertCanvasPoint({
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  });
  if (centerCoordinate) {
    focusPoints.push(centerCoordinate);
  }

  if (!focusPoints.length) {
    return null;
  }

  const closedOutline = [...outline];
  const first = outline[0];
  const last = outline[outline.length - 1];
  if (first && (!last || first[0] !== last[0] || first[1] !== last[1])) {
    closedOutline.push(first);
  }

  return {
    outline: closedOutline,
    focusPoints: dedupeCoordinates(focusPoints, 6),
    geoBounds: computeGeoBounds(focusPoints),
  };
}

function toggleCountryAtCanvasPoint(point) {
  const coordinate = invertCanvasPoint(point);
  if (!coordinate) {
    return false;
  }

  const featureSet = state.mapVersion === "world" ? countryFeatures : getKoreaHitTestFeatures();
  const feature = featureSet.find((country) => d3.geoContains(country, coordinate));
  if (!feature) {
    return false;
  }

  if (state.mapVersion === "world") {
    toggleCountry(feature.id);
  } else {
    toggleKoreaRegion(feature.id);
  }
  return true;
}

function invertCanvasPoint(point) {
  if (!currentRenderContext?.projection?.invert) {
    return null;
  }

  const inverted = currentRenderContext.projection.invert([point.x, point.y]);
  if (!inverted || !Number.isFinite(inverted[0]) || !Number.isFinite(inverted[1])) {
    return null;
  }

  return [normalizeLongitude(inverted[0]), clamp(inverted[1], -90, 90)];
}

function applyZoomToRect(rect) {
  const rectCenter = {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
  const factor = Math.min(state.width / rect.width, state.height / rect.height);
  applyRelativeZoom(factor, rectCenter, {
    x: state.width / 2,
    y: state.height / 2,
  });
}

function zoomOutOneStep() {
  const center = {
    x: state.width / 2,
    y: state.height / 2,
  };
  applyRelativeZoom(1 / 1.6, center, center);
}

function applyRelativeZoom(factor, sourcePoint, destinationPoint = sourcePoint) {
  if (!currentRenderContext) {
    return;
  }

  beginHistoryStep("보기 변경");
  const oldZoom = state.viewZoom;
  const newZoom = clampViewZoom(oldZoom * factor);
  const actualFactor = newZoom / oldZoom;
  const baseTranslate = currentRenderContext.baseTranslate;

  state.viewOffsetX =
    actualFactor * state.viewOffsetX +
    (destinationPoint.x - baseTranslate[0]) +
    actualFactor * (baseTranslate[0] - sourcePoint.x);
  state.viewOffsetY =
    actualFactor * state.viewOffsetY +
    (destinationPoint.y - baseTranslate[1]) +
    actualFactor * (baseTranslate[1] - sourcePoint.y);
  state.viewZoom = newZoom;

  if (Math.abs(state.viewZoom - 1) < 0.001) {
    state.viewZoom = 1;
  }
}

function resetViewWindow() {
  state.viewZoom = 1;
  state.viewOffsetX = 0;
  state.viewOffsetY = 0;
}

function clampViewZoom(value) {
  return clamp(value, 0.35, 24);
}

function getCanvasPointFromEvent(event, shell = event.currentTarget ?? elements.previewStage.firstElementChild) {
  const targetShell =
    shell && typeof shell.getBoundingClientRect === "function" ? shell : elements.previewStage.firstElementChild;

  if (!targetShell || typeof targetShell.getBoundingClientRect !== "function") {
    return null;
  }

  const rect = targetShell.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }

  if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
    return null;
  }

  return {
    x: clamp((event.clientX - rect.left) / (currentPreviewScale || 1), 0, state.width),
    y: clamp((event.clientY - rect.top) / (currentPreviewScale || 1), 0, state.height),
  };
}

function normalizeRect(startPoint, endPoint) {
  const x = Math.min(startPoint.x, endPoint.x);
  const y = Math.min(startPoint.y, endPoint.y);
  return {
    x,
    y,
    width: Math.abs(endPoint.x - startPoint.x),
    height: Math.abs(endPoint.y - startPoint.y),
  };
}

function markerDefaults(style) {
  if (style === "dashedOval") {
    return { label: "auto", size: 24, aspect: 0.62, rotation: 0, offsetX: 44, offsetY: -24 };
  }

  if (style === "point") {
    return { label: "auto", size: 10, aspect: 1, rotation: 0, offsetX: 26, offsetY: -18 };
  }

  if (style === "filledDot") {
    return { label: "", size: 4, aspect: 1, rotation: 0, offsetX: 18, offsetY: -18 };
  }

  return { label: "auto", size: 16, aspect: 1, rotation: 0, offsetX: 36, offsetY: -22 };
}

function applyMarkerDefaultsIfNeeded(marker) {
  const defaults = markerDefaults(marker.style);
  if (!marker.label.trim() && defaults.label === "auto" && marker.style !== "filledDot") {
    marker.label = nextAnnotationLabel("marker");
  }

  marker.size = defaults.size;
  marker.aspect = defaults.aspect;
  marker.rotation = defaults.rotation;
  marker.offsetX = defaults.offsetX;
  marker.offsetY = defaults.offsetY;
}

function markerStyleLabel(style) {
  return markerStyleOptions.find((option) => option.value === style)?.label ?? style;
}

function nextAnnotationLabel(type) {
  const sequenceKey = type === "inset" ? "nextInsetSequence" : "nextMarkerSequence";
  const sequence = state[sequenceKey];
  state[sequenceKey] += 1;

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const base = alphabet[sequence % alphabet.length];
  const round = Math.floor(sequence / alphabet.length);
  return round ? `${base}${round + 1}` : base;
}

function getDefaultInsetFrame(index, aspectRatio = 1) {
  const { width, height } = getDefaultInsetPanelSize(aspectRatio);
  const positions = [
    { x: 36, y: state.height - height - 36 },
    { x: state.width - width - 36, y: state.height - height - 36 },
    { x: state.width - width - 36, y: 36 },
    { x: 36, y: 36 },
  ];
  const position = positions[index % positions.length];

  return {
    x: clamp(position.x, 0, Math.max(0, state.width - width)),
    y: clamp(position.y, 0, Math.max(0, state.height - height)),
    width,
    height,
  };
}

function getDefaultInsetPanelSize(aspectRatio) {
  const safeAspectRatio = clamp(Number(aspectRatio) || 1, 0.35, 3.8);
  const shorterCanvasSide = Math.max(1, Math.min(state.width, state.height));
  const targetLongSide = clamp(Math.round(shorterCanvasSide * 0.22), 72, 180);
  const preferredWidth = safeAspectRatio >= 1 ? targetLongSide : targetLongSide * safeAspectRatio;
  const preferredHeight = safeAspectRatio >= 1 ? targetLongSide / safeAspectRatio : targetLongSide;
  return normalizeInsetPanelSize(
    preferredWidth,
    preferredHeight,
    Math.min(MAX_INSET_PANEL_WIDTH, state.width),
    Math.max(MIN_INSET_PANEL_HEIGHT, state.height - 72),
  );
}

function projectCoordinateRaw(projection, coordinate) {
  const point = projection(coordinate);
  if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    return null;
  }

  return { x: point[0], y: point[1] };
}

function projectCoordinateVariants(projection, coordinate) {
  const basePoint = projectCoordinateRaw(projection, coordinate);
  if (!basePoint) {
    return [];
  }

  return getProjectionCopyOffsets(projection).map((offset) => ({
    x: basePoint.x + offset,
    y: basePoint.y,
  }));
}

function projectCoordinate(projection, coordinate) {
  const variants = projectCoordinateVariants(projection, coordinate);
  return variants.find((point) => isPointNearViewport(point)) ?? variants[0] ?? null;
}

function getCompactProjectedPoints(projection, coordinates) {
  const rawPoints = coordinates.map((coordinate) => projectCoordinateRaw(projection, coordinate)).filter(Boolean);
  if (!rawPoints.length) {
    return [];
  }

  const wrapWidth = getProjectionWrapWidth(projection);
  if (!wrapWidth) {
    return rawPoints;
  }

  let runningCenter = rawPoints[0].x;
  const adjusted = rawPoints.map((point, index) => {
    const candidates = [-2, -1, 0, 1, 2].map((step) => ({
      x: point.x + wrapWidth * step,
      y: point.y,
    }));
    const best = candidates.reduce((selected, candidate) =>
      Math.abs(candidate.x - runningCenter) < Math.abs(selected.x - runningCenter) ? candidate : selected,
    );
    runningCenter += (best.x - runningCenter) / (index + 1);
    return best;
  });

  const centerX = adjusted.reduce((sum, point) => sum + point.x, 0) / adjusted.length;
  const shiftSteps = Math.round((state.width / 2 - centerX) / wrapWidth);
  return adjusted.map((point) => ({
    x: point.x + wrapWidth * shiftSteps,
    y: point.y,
  }));
}

function unwrapLongitudeCoordinates(coordinates) {
  let runningLongitude = coordinates[0]?.[0] ?? 0;
  return coordinates.map(([longitude, latitude], index) => {
    let adjustedLongitude = longitude;
    while (adjustedLongitude - runningLongitude > 180) {
      adjustedLongitude -= 360;
    }
    while (adjustedLongitude - runningLongitude < -180) {
      adjustedLongitude += 360;
    }
    runningLongitude += (adjustedLongitude - runningLongitude) / (index + 1);
    return [adjustedLongitude, latitude];
  });
}

function isPointNearViewport(point, buffer = 48) {
  return point.x >= -buffer && point.x <= state.width + buffer && point.y >= -buffer && point.y <= state.height + buffer;
}

function clampCanvasWidth(value, fallback = MAIN_CANVAS_WIDTH) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clamp(Math.round(parsed), MIN_CANVAS_WIDTH, MAIN_CANVAS_WIDTH);
}

function clampCanvasHeight(value, fallback = 310) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clamp(Math.round(parsed), MIN_CANVAS_HEIGHT, 3200);
}

function normalizeCanvasStateDimensions() {
  state.width = clampCanvasWidth(state.width, MAIN_CANVAS_WIDTH);
  state.height = clampCanvasHeight(state.height, 310);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dedupeCoordinates(coordinates, precision = 4) {
  const seen = new Set();
  return coordinates.filter((coordinate) => {
    const key = `${coordinate[0].toFixed(precision)}:${coordinate[1].toFixed(precision)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function closeCoordinateRing(coordinates) {
  const ring = coordinates.map(([longitude, latitude]) => [longitude, latitude]);
  if (!ring.length) {
    return ring;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!last || first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return ring;
}

function computeGeoBounds(coordinates) {
  if (!Array.isArray(coordinates) || !coordinates.length) {
    return null;
  }

  const unwrapped = unwrapLongitudeCoordinates(coordinates);
  const longitudes = unwrapped.map((coordinate) => coordinate[0]);
  const latitudes = unwrapped.map((coordinate) => coordinate[1]);

  return {
    west: Math.min(...longitudes),
    east: Math.max(...longitudes),
    south: Math.min(...latitudes),
    north: Math.max(...latitudes),
  };
}

function normalizeLongitude(longitude) {
  let value = longitude;
  while (value <= -180) {
    value += 360;
  }
  while (value > 180) {
    value -= 360;
  }
  return value;
}

function sanitizeIdentifier(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, "-");
}

function nearZero(value) {
  return Math.abs(value) < 0.001;
}

function isFiniteCoordinate(coordinate) {
  return (
    Array.isArray(coordinate) &&
    coordinate.length >= 2 &&
    Number.isFinite(coordinate[0]) &&
    Number.isFinite(coordinate[1])
  );
}

async function loadEmbeddedMapFontData() {
  try {
    const response = await fetch("./fonts/SidaeAi_S-Regular.otf");
    if (!response.ok) {
      return;
    }

    const buffer = await response.arrayBuffer();
    embeddedMapFontDataUrl = `data:font/otf;base64,${arrayBufferToBase64(buffer)}`;
  } catch (_error) {
    embeddedMapFontDataUrl = null;
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
}

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.toggle("is-error", isError);
}

function formatLongitude(value) {
  const rounded = Math.round(value);
  if (rounded === 0) {
    return "0°";
  }
  return `${Math.abs(rounded)}°${rounded > 0 ? "E" : "W"}`;
}

function formatLatitudeLabel(value) {
  if (Math.abs(value) < 0.0001) {
    return "0°";
  }

  const magnitude = Math.abs(value);
  const rounded = magnitude % 1 === 0 ? String(Math.round(magnitude)) : magnitude.toFixed(1);
  return `${rounded}°${value > 0 ? "N" : "S"}`;
}

function formatCoordinate(value, type) {
  const absolute = Math.abs(value).toFixed(2);
  if (type === "lat") {
    return `${absolute}°${value >= 0 ? "N" : "S"}`;
  }
  return `${absolute}°${value >= 0 ? "E" : "W"}`;
}

function formatScaleDistance(distanceKm) {
  return `${new Intl.NumberFormat("en-US").format(distanceKm)} km`;
}

function formatPointSize(value) {
  const numericValue = Number(value);
  return `${numericValue.toFixed(Number.isInteger(numericValue) ? 0 : 1)}pt`;
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

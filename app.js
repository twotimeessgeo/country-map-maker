const d3 = window.d3;
const topojson = window.topojson;

if (!d3 || !topojson || !window.WORLD_ATLAS_TOPOLOGY || !window.WORLD_COUNTRY_NAMES_TSV) {
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
const MIN_INSET_PANEL_WIDTH = 120;
const MIN_INSET_PANEL_HEIGHT = 120;
const MAX_INSET_PANEL_WIDTH = 310;
const MAIN_CANVAS_WIDTH = 310;
const MIN_CANVAS_WIDTH = 140;
const MIN_CANVAS_HEIGHT = 120;
const MIN_ZOOM_DRAG_SIZE = 20;
const MIN_INSET_DRAG_SIZE = 8;
const MAP_RENDER_CLIP_PADDING = 24;
const INSET_RENDER_CLIP_PADDING = 18;
const MIN_INSET_ZOOM_SCALE = 0.45;
const MAX_INSET_ZOOM_SCALE = 2.4;

const projectionModeLabels = {
  rectangular: "평면",
  northPolar: "북극",
  southPolar: "남극",
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
const countryNameRows = d3.tsvParse(window.WORLD_COUNTRY_NAMES_TSV);
const countryNameById = new Map(
  countryNameRows.map((row) => [String(Number(row.id)), row.name.trim()]),
);

const atlasDatasets = Object.fromEntries(
  Object.entries(atlasTopologyVariants)
    .filter(([, variantTopology]) => Boolean(variantTopology))
    .map(([key, variantTopology]) => [key, buildAtlasDataset(variantTopology, key)]),
);
const baseAtlas = atlasDatasets["50m"] ?? atlasDatasets["110m"] ?? atlasDatasets["10m"];

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

  return {
    datasetKey,
    topology: variantTopology,
    countriesObject,
    landFeature,
    borderMesh,
    countryFeatures: variantCountryFeatures,
    countryById: new Map(variantCountryFeatures.map((feature) => [feature.id, feature])),
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
  guides: {
    equator: false,
    lat30: false,
    lat60: false,
    tropicCancer: false,
    tropicCapricorn: false,
  },
  selected: [],
  markerDraftStyle: "ring",
  markers: [],
  insets: [],
  nextMarkerSequence: 0,
  nextInsetSequence: 0,
};

const elements = {
  countryInput: document.querySelector("#countryInput"),
  countryOptions: document.querySelector("#countryOptions"),
  addCountryButton: document.querySelector("#addCountryButton"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  selectedCountryList: document.querySelector("#selectedCountryList"),
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
attachEventListeners();
syncControls();
setStatus("영역 확대 모드에서 드래그하면 원하는 부분만 바로 크게 잡을 수 있습니다.");
renderSelectedCountries();
renderAnnotations();
renderMap();
void loadEmbeddedMapFontData();

function attachEventListeners() {
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
    if (!state.selected.length) {
      setStatus("비울 선택 국가가 없습니다.");
      return;
    }

    beginHistoryStep("선택 국가 비우기");
    state.selected = [];
    resetViewForSelectionIfNeeded();
    renderSelectedCountries();
    renderMap();
    setStatus("선택한 국가를 모두 비웠습니다.");
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
    beginHistoryStep("국가 색상 설정 변경");
    state.unifySelectedCountryColors = elements.unifySelectedCountryColorsToggle.checked;
    syncStyleControls();
    renderSelectedCountries();
    renderMap();
  });

  elements.unifiedCountryColorInput.addEventListener("input", () => {
    beginHistoryStep("국가 색상 설정 변경");
    state.unifiedSelectedCountryColor = elements.unifiedCountryColorInput.value;
    renderSelectedCountries();
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

  syncControls();
  renderSelectedCountries();
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
    shell.classList.toggle(`mode-${mode}`, getActiveViewMode() === mode);
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

function syncControls() {
  normalizeCanvasStateDimensions();
  syncDimensionInputs();
  syncPresetButtons();
  syncCenterControls();
  syncModeButtons();
  syncProjectionButtons();
  syncGuideControls();
  syncStyleControls();
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
  const canShowCanvasFrame = state.projectionMode === "rectangular";
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
      color: nextPaletteColor(),
    });
    addedNames.push(country.properties.name);
  });

  elements.countryInput.value = "";

  if (addedNames.length) {
    resetViewForSelectionIfNeeded();
    setStatus(`${addedNames.join(", ")} 추가됨`);
  } else if (missingNames.length) {
    setStatus(`찾을 수 없는 국가: ${missingNames.join(", ")}`, true);
  } else {
    setStatus("이미 선택된 국가입니다.");
  }

  renderSelectedCountries();
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

function nextPaletteColor() {
  return atlasPalette[state.selected.length % atlasPalette.length];
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
  return new Map(state.selected.map((country) => [country.id, getSelectedCountryColor(country)]));
}

function resetViewForSelectionIfNeeded() {
  if (state.autoFocusOnSelection) {
    resetViewWindow();
  }
}

function renderSelectedCountries() {
  elements.selectedCountryList.innerHTML = "";

  if (!state.selected.length) {
    elements.selectedCountryList.appendChild(
      createEmptyState("아직 선택된 국가가 없습니다. 검색창이나 미리보기 클릭으로 추가해 보세요."),
    );
    return;
  }

  state.selected.forEach((country) => {
    const displayedColor = getSelectedCountryColor(country);
    const listItem = document.createElement("li");
    listItem.className = "selected-country-item";

    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.backgroundColor = displayedColor;

    const textWrap = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = country.name;
    const code = document.createElement("span");
    code.textContent = state.unifySelectedCountryColors ? "통일 색상 사용 중" : "색상은 자유롭게 바꿀 수 있습니다";
    textWrap.append(name, code);

    const controls = document.createElement("div");
    controls.className = "inline-actions";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = displayedColor;
    colorInput.disabled = state.unifySelectedCountryColors;
    colorInput.title = state.unifySelectedCountryColors ? "통일 색상 옵션이 켜져 있어 개별 색상 편집이 잠겨 있습니다." : "";
    colorInput.setAttribute("aria-label", `${country.name} 색상`);
    colorInput.addEventListener("input", () => {
      beginHistoryStep("국가 색상 변경");
      country.color = colorInput.value;
      swatch.style.backgroundColor = colorInput.value;
      renderMap();
    });

    const removeButton = document.createElement("button");
    removeButton.className = "remove-button tw-button";
    removeButton.type = "button";
    removeButton.textContent = "제거";
    removeButton.addEventListener("click", () => {
      removeCountry(country.id);
      setStatus(`${country.name} 제거됨`);
    });

    controls.append(colorInput, removeButton);
    listItem.append(swatch, textWrap, controls);
    elements.selectedCountryList.appendChild(listItem);
  });
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

function removeCountry(countryId) {
  beginHistoryStep("국가 제거");
  state.selected = state.selected.filter((country) => country.id !== countryId);
  resetViewForSelectionIfNeeded();
  renderSelectedCountries();
  renderMap();
}

function toggleCountry(countryId) {
  const existing = state.selected.find((country) => country.id === countryId);
  const feature = countryById.get(countryId);

  if (!feature) {
    return;
  }

  if (existing) {
    removeCountry(countryId);
    setStatus(`${existing.name} 제거됨`);
    return;
  }

  beginHistoryStep("국가 선택 변경");
  state.selected.push({
    id: feature.id,
    name: feature.properties.name,
    color: nextPaletteColor(),
  });
  resetViewForSelectionIfNeeded();
  renderSelectedCountries();
  renderMap();
  setStatus(`${feature.properties.name} 추가됨`);
}

function renderMap() {
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
  const fillAtlasDataset =
    atlasDataset.datasetKey === "10m" ? atlasDatasets["50m"] ?? atlasDatasets["110m"] ?? atlasDataset : atlasDataset;
  // Keep zoom rerenders responsive by painting shared land once, then overlaying only selected countries.
  const selectedFeatures = fillAtlasDataset.countryFeatures.filter((feature) => selectedColorById.has(feature.id));
  const clipRect = normalizeClipRect(options.clipRect, options.clipPadding ?? 0);

  copyOffsets.forEach((offset) => {
    const renderProjection = createRenderProjection(projection, shiftClipRect(clipRect, -offset, 0));
    const path = d3.geoPath(renderProjection);
    const copyGroup = container
      .append("g")
      .attr("class", "map-copy")
      .attr("transform", offset ? `translate(${offset} 0)` : null);

    copyGroup
      .append("path")
      .datum(fillAtlasDataset.landFeature)
      .attr("class", "map-land")
      .attr("d", path)
      .attr("fill", state.landColor)
      .attr("stroke", "none");

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
  const sourceFrame = buildInsetSourceFrame(mainProjection, inset);

  if (sourceFrame) {
    layer
      .append("rect")
      .attr("x", sourceFrame.x)
      .attr("y", sourceFrame.y)
      .attr("width", sourceFrame.width)
      .attr("height", sourceFrame.height)
      .attr("fill", "none")
      .attr("stroke", state.borderColor)
      .attr("stroke-width", OUTLINE_STROKE_WIDTH)
      .attr("stroke-dasharray", "4.5pt 3.2pt")
      .attr("vector-effect", "non-scaling-stroke");
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

  const insetPadding = 10;
  const zoomScale = getInsetZoomScale(inset);
  const adjustedSourceFrame = scaleRectFromCenter(sourceFrame, 1 / zoomScale);
  const availableWidth = Math.max(1, frame.width - insetPadding * 2);
  const availableHeight = Math.max(1, frame.height - insetPadding * 2);
  const scale = Math.min(availableWidth / adjustedSourceFrame.width, availableHeight / adjustedSourceFrame.height);
  const offsetX = frame.x + insetPadding + (availableWidth - adjustedSourceFrame.width * scale) / 2;
  const offsetY = frame.y + insetPadding + (availableHeight - adjustedSourceFrame.height * scale) / 2;
  const transformedGroup = insetGroup
    .append("g")
    .attr(
      "transform",
      `translate(${offsetX - adjustedSourceFrame.x * scale} ${offsetY - adjustedSourceFrame.y * scale}) scale(${scale})`,
    );
  const insetAtlasDataset = getAtlasDataset(Math.max(state.viewZoom * scale * 2.2, 6), true);
  const selectedIds = new Set(state.selected.map((country) => country.id));
  const insetBorderGeometry = buildBorderGeometry(insetAtlasDataset, selectedIds);
  renderAtlasLayer(transformedGroup, mainProjection, insetAtlasDataset, selectedColorById, insetBorderGeometry, {
    wrap: false,
    clipRect: adjustedSourceFrame,
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

function buildInsetSourceFrame(mainProjection, inset) {
  const outline = getInsetOutline(inset);
  const bounds = getInsetGeoBounds(inset);
  if (outline.length < 4 && !bounds) {
    return null;
  }
  const outlinePoints = getCompactProjectedPoints(
    mainProjection,
    outline.length >= 4 ? outline : buildInsetBoundsRing(bounds),
  );
  if (outlinePoints.length < 3) {
    return null;
  }

  const projectedBounds = computeBounds(outlinePoints);
  const padding = clamp(
    Math.round(Math.min(projectedBounds.maxX - projectedBounds.minX, projectedBounds.maxY - projectedBounds.minY) * 0.16),
    6,
    12,
  );
  return {
    x: projectedBounds.minX - padding,
    y: projectedBounds.minY - padding,
    width: projectedBounds.maxX - projectedBounds.minX + padding * 2,
    height: projectedBounds.maxY - projectedBounds.minY + padding * 2,
  };
}

function renderInsetConnectors(layer, frame, sourceFrame) {
  const bounds = {
    minX: sourceFrame.x,
    minY: sourceFrame.y,
    maxX: sourceFrame.x + sourceFrame.width,
    maxY: sourceFrame.y + sourceFrame.height,
  };
  const sourceCenter = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
  const panelCenter = {
    x: frame.x + frame.width / 2,
    y: frame.y + frame.height / 2,
  };

  const useHorizontal = Math.abs(panelCenter.x - sourceCenter.x) >= Math.abs(panelCenter.y - sourceCenter.y);
  const panelAnchors = [];
  const sourceAnchors = [];

  if (useHorizontal) {
    const panelOnRight = panelCenter.x >= sourceCenter.x;
    const sourceX = panelOnRight ? bounds.maxX : bounds.minX;
    const panelX = panelOnRight ? frame.x : frame.x + frame.width;
    sourceAnchors.push(
      { x: sourceX, y: bounds.minY },
      { x: sourceX, y: bounds.maxY },
    );
    panelAnchors.push(
      { x: panelX, y: frame.y + frame.height * 0.24 },
      { x: panelX, y: frame.y + frame.height * 0.76 },
    );
  } else {
    const panelBelow = panelCenter.y >= sourceCenter.y;
    const sourceY = panelBelow ? bounds.maxY : bounds.minY;
    const panelY = panelBelow ? frame.y : frame.y + frame.height;
    sourceAnchors.push(
      { x: bounds.minX, y: sourceY },
      { x: bounds.maxX, y: sourceY },
    );
    panelAnchors.push(
      { x: frame.x + frame.width * 0.24, y: panelY },
      { x: frame.x + frame.width * 0.76, y: panelY },
    );
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

function normalizeInsetFrame(inset) {
  const aspectRatio = getInsetAspectRatio(inset);
  const maxWidth = Math.min(MAX_INSET_PANEL_WIDTH, state.width);
  const preferredWidth =
    Number.isFinite(Number(inset.panelWidth)) && Number(inset.panelWidth) > 0
      ? Number(inset.panelWidth)
      : Math.round(state.width * 0.28);
  const { width, height } = fitInsetPanelSize(aspectRatio, preferredWidth, maxWidth, state.height);
  const x = clamp(inset.panelX, 0, Math.max(0, state.width - width));
  const y = clamp(inset.panelY, 0, Math.max(0, state.height - height));

  inset.aspectRatio = aspectRatio;
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

function fitInsetPanelSize(aspectRatio, preferredWidth, maxWidth, maxHeight) {
  const safeAspectRatio = clamp(Number(aspectRatio) || 1, 0.35, 3.8);
  const constrainedMaxWidth = Math.max(MIN_INSET_PANEL_WIDTH, maxWidth);
  const constrainedMaxHeight = Math.max(MIN_INSET_PANEL_HEIGHT, maxHeight);
  const minScale = Math.max(MIN_INSET_PANEL_WIDTH / safeAspectRatio, MIN_INSET_PANEL_HEIGHT);
  const maxScale = Math.max(
    minScale,
    Math.min(constrainedMaxWidth / safeAspectRatio, constrainedMaxHeight),
  );
  const preferredScale = Number(preferredWidth) / safeAspectRatio;
  const scale = clamp(preferredScale, minScale, maxScale);
  return {
    width: Math.round(safeAspectRatio * scale),
    height: Math.round(scale),
  };
}

function setInsetPanelSizeFromWidth(inset, preferredWidth) {
  const aspectRatio = getInsetAspectRatio(inset);
  const maxWidth = Math.min(MAX_INSET_PANEL_WIDTH, Math.max(MIN_INSET_PANEL_WIDTH, state.width - inset.panelX));
  const maxHeight = Math.max(MIN_INSET_PANEL_HEIGHT, state.height - inset.panelY);
  const size = fitInsetPanelSize(aspectRatio, preferredWidth, maxWidth, maxHeight);
  inset.aspectRatio = aspectRatio;
  inset.panelWidth = size.width;
  inset.panelHeight = size.height;
  inset.panelX = clamp(inset.panelX, 0, Math.max(0, state.width - size.width));
  inset.panelY = clamp(inset.panelY, 0, Math.max(0, state.height - size.height));
  return size;
}

function setInsetPanelSizeFromHeight(inset, preferredHeight) {
  return setInsetPanelSizeFromWidth(inset, Number(preferredHeight) * getInsetAspectRatio(inset));
}

function buildInsetResizeFrame(inset, startFrame, deltaX, deltaY) {
  const aspectRatio = getInsetAspectRatio(inset);
  const widthFromHorizontalDrag = startFrame.width + deltaX;
  const widthFromVerticalDrag = (startFrame.height + deltaY) * aspectRatio;
  const horizontalChange = Math.abs(deltaX / Math.max(startFrame.width, 1));
  const verticalChange = Math.abs(deltaY / Math.max(startFrame.height, 1));
  const preferredWidth =
    verticalChange > horizontalChange ? widthFromVerticalDrag : widthFromHorizontalDrag;
  const { width, height } = fitInsetPanelSize(
    aspectRatio,
    preferredWidth,
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

  if (state.selected.length) {
    parts.push(`${state.selected.length}개 국가`);
  } else {
    parts.push("국가 선택 없음");
  }

  if (state.markers.length) {
    parts.push(`마커 ${state.markers.length}개`);
  }

  if (state.insets.length) {
    parts.push(`인셋 ${state.insets.length}개`);
  }

  elements.selectionSummary.textContent = parts.join(" · ");
}

function updateExportMeta() {
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
  if (!currentRenderContext) {
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
  activeGestureScale = event.scale || 1;
  event.preventDefault();
}

function handleCanvasGestureChange(event) {
  if (!currentRenderContext) {
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

  if (!previewTransformIsIdentity()) {
    commitPreviewInteraction();
    return;
  }

  const shell = event.currentTarget;
  const startPoint = getCanvasPointFromEvent(event, shell);
  if (!startPoint) {
    return;
  }

  event.preventDefault();

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
  if (!sample || sample.focusPoints.length < 3 || sample.outline.length < 4) {
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
    zoomScale: 1,
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
  const edgeSteps = clamp(Math.round(Math.max(rect.width, rect.height) / 18), 4, 12);

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
    5,
  );

  const focusPoints = [];
  const gridSize = clamp(Math.round(Math.min(rect.width, rect.height) / 22), 2, 4);
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

  if (!outline.length || !focusPoints.length) {
    return null;
  }

  const closedOutline = [...outline];
  const first = outline[0];
  const last = outline[outline.length - 1];
  if (!last || first[0] !== last[0] || first[1] !== last[1]) {
    closedOutline.push(first);
  }

  return {
    outline: closedOutline,
    focusPoints: dedupeCoordinates(focusPoints, 5),
    geoBounds: computeGeoBounds(focusPoints),
  };
}

function toggleCountryAtCanvasPoint(point) {
  const coordinate = invertCanvasPoint(point);
  if (!coordinate) {
    return false;
  }

  const feature = countryFeatures.find((country) => d3.geoContains(country, coordinate));
  if (!feature) {
    return false;
  }

  toggleCountry(feature.id);
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
  const preferredWidth = clamp(Math.round(state.width * 0.28), 180, Math.min(MAX_INSET_PANEL_WIDTH, state.width));
  const { width, height } = fitInsetPanelSize(
    aspectRatio,
    preferredWidth,
    Math.min(MAX_INSET_PANEL_WIDTH, state.width),
    Math.max(MIN_INSET_PANEL_HEIGHT, state.height - 72),
  );
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

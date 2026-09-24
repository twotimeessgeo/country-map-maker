const KOREA_MAP_VIEWBOX = {
  width: 400,
  height: 650,
};

const KOREA_MAP_PADDING = {
  top: 40,
  right: 28,
  bottom: 52,
  left: 28,
};

const COMPARISON_PAIR_CONFIGS = [
  {
    id: "jan-aug",
    title: "1월과 8월",
    leftPeriodId: "jan",
    rightPeriodId: "aug",
    leftStyle: "dot-filled",
    rightStyle: "dot-hollow",
    leftBarStyle: "bar-light",
    rightBarStyle: "bar-dark",
  },
  {
    id: "winter-summer",
    title: "겨울과 여름",
    leftPeriodId: "winter",
    rightPeriodId: "summer",
    leftStyle: "dot-filled",
    rightStyle: "dot-hollow",
    leftBarStyle: "bar-light",
    rightBarStyle: "bar-dark",
  },
];

const RANDOM_SELECTION_SIZE = 4;
const RANDOM_SELECTION_ATTEMPTS = 200;
const RANDOM_SELECTION_MIN_DISTANCE_STEPS = [80, 60, 45, 30];
const MAP_CANDIDATE_RADIUS_MIN = 7;
const MAP_CANDIDATE_RADIUS_MAX = 9;
const MAP_CANDIDATE_LIMIT = 12;
const URL_STATE_KEYS = ["regions", "nation", "zone", "query", "sort", "map", "baseline"];
const REGION_SORT_VALUES = new Set([
  "default",
  "name",
  "annualPrecipitationDesc",
  "annualRangeDesc",
  "warmestMonthDesc",
  "coldestMonthAsc",
]);
const COMPARISON_LINE_STYLES = [
  { dasharray: "", marker: "circle" },
  { dasharray: "10 6", marker: "square" },
  { dasharray: "4 4", marker: "triangle" },
  { dasharray: "2 4", marker: "diamond" },
  { dasharray: "14 5 3 5", marker: "circle" },
  { dasharray: "1 5", marker: "square" },
];

const collator = new Intl.Collator("ko-KR", { numeric: true, sensitivity: "base" });
const numberFormatter = new Intl.NumberFormat("ko-KR");
const climateNumberFormatter = new Intl.NumberFormat("ko-KR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const coordinateFormatter = new Intl.NumberFormat("ko-KR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const climateCsvExports = new Map();
let climateCsvExportId = 0;
let nextUrlSyncMode = "replace";
let isRestoringUrlState = false;
let utilityStatusTimer = 0;
const state = {
  dataset: window.KOREA_CLIMATE_DATA ?? null,
  regions: [],
  search: "",
  regionSort: document.querySelector("#regionSortSelect")?.value || "default",
  nation: "전체",
  zone: "전체",
  mapScope: "major",
  comparisonBaseline: "mean",
  comparisonMode: "value",
  selectedIds: new Set(),
  mapCandidatePicker: null,
};

const elements = {
  heroCount: document.querySelector("#heroCount"),
  heroCaption: document.querySelector("#heroCaption"),
  selectionSummary: document.querySelector("#selectionSummary"),
  searchInput: document.querySelector("#searchInput"),
  regionSortSelect: document.querySelector("#regionSortSelect"),
  randomSpacedSelectionButton: document.querySelector("#randomSpacedSelectionButton"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  nationChips: document.querySelector("#nationChips"),
  zoneChips: document.querySelector("#zoneChips"),
  regionList: document.querySelector("#regionList"),
  worldMap: document.querySelector("#worldMap"),
  mapSummary: document.querySelector("#mapSummary"),
  mapScopeChips: document.querySelector("#mapScopeChips"),
  mapCandidatePicker: document.querySelector("#mapCandidatePicker"),
  selectedRegionsContent: document.querySelector("#selectedRegionsContent"),
  comparisonContent: document.querySelector("#comparisonContent"),
  copyShareLinkButton: document.querySelector("#copyShareLinkButton"),
  downloadSelectedCsvButton: document.querySelector("#downloadSelectedCsvButton"),
  selectionUtilityStatus: document.querySelector("#selectionUtilityStatus"),
  selectedTray: document.querySelector("#selectedTray"),
};

document.addEventListener("DOMContentLoaded", () => {
  void init();
});

async function init() {
  try {
    if (!state.dataset) {
      const response = await fetch("./data/korea-climate-data.json");
      if (!response.ok) throw new Error(`Korea climate data: ${response.status}`);
      state.dataset = await response.json();
    }
    state.regions = [...state.dataset.regions].sort(sortRegions);
    applyUrlStateFromLocation();
    bindEvents();
    render();
  } catch (error) {
    console.warn("Korea climate data load failed:", error);
    elements.selectedRegionsContent.innerHTML = renderEmptyState("자료를 불러오지 못했습니다", "");
    elements.comparisonContent.innerHTML = "";
    elements.worldMap.innerHTML = renderEmptyState("지도를 불러오지 못했습니다", "");
  }
}

function resetClimateCsvExports() {
  climateCsvExports.clear();
  climateCsvExportId = 0;
}

function sanitizeClimateCsvExportId(rawValue) {
  const text = String(rawValue ?? "").toLowerCase().trim();
  const normalized = text.normalize("NFKC").replace(/[^a-z0-9가-힣._-]/gi, "-");
  const collapsed = normalized.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return collapsed || `dataset-${climateCsvExportId + 1}`;
}

function buildClimateCsvFilename(label, index) {
  const baseName = sanitizeClimateCsvExportId(label).replace(/[^a-z0-9가-힣._-]/gi, "-");
  return `${baseName}-${String(index).padStart(3, "0")}`;
}

function buildClimateCsvLine(values) {
  return values
    .map((value) => {
      const text = String(value ?? "");
      if (/[",\n\r]/.test(text)) {
        return `"${text.replaceAll('"', '""')}"`;
      }
      return text;
    })
    .join(",");
}

function registerClimateCsvExport(context, headers, rows, filename) {
  climateCsvExportId += 1;
  const key = `climate-csv-${sanitizeClimateCsvExportId(context)}-${String(climateCsvExportId).padStart(3, "0")}`;
  const safeHeaders = headers.map((value) => String(value ?? ""));
  const safeRows = rows.map((row) => row.map((value) => String(value ?? "")));
  climateCsvExports.set(key, {
    filename: buildClimateCsvFilename(filename || context, climateCsvExportId),
    headers: safeHeaders,
    rows: safeRows,
  });
  return key;
}

function handleClimateCsvDownload(event) {
  const button = event.target.closest("[data-climate-csv-download]");
  if (!button) return;
  const payload = climateCsvExports.get(button.dataset.climateCsvDownload);
  if (!payload) return;

  downloadClimateCsvPayload(payload);
}

function downloadClimateCsvPayload(payload) {
  const rows = [];
  if (payload.headers.length) rows.push(buildClimateCsvLine(payload.headers));
  payload.rows.forEach((row) => rows.push(buildClimateCsvLine(row)));

  const blob = new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const anchor = document.createElement("a");
  const url = URL.createObjectURL(blob);
  anchor.href = url;
  anchor.download = `${payload.filename || "climate-data"}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadSelectedRegionsCsv() {
  const selectedRegions = getSelectedRegions();
  if (selectedRegions.length === 0) {
    setSelectionUtilityStatus("지도나 목록에서 지역을 선택해 주세요", "warning");
    return;
  }

  const headers = [
    "지역 ID", "지점 번호", "지역", "지점명", "국가", "권역", "월", "월 번호",
    "월평균 기온(°C)", "월 강수량(mm)", "영하 일수", "열대야 일수",
    "연평균 기온(°C)", "연 강수량(mm)", "위도", "경도", "해발(m)", "평년 기간", "출처",
  ];
  const rows = selectedRegions.flatMap((region) =>
    region.months.map((month, monthIndex) => [
      region.id,
      region.stationId,
      region.name,
      region.officialName,
      region.nation,
      region.zone,
      month,
      monthIndex + 1,
      region.monthlyTemperatureC[monthIndex],
      region.monthlyPrecipitationMm[monthIndex],
      region.monthlyColdDaysBelowZero[monthIndex],
      region.monthlyHotDaysAboveTwentyFiveMin[monthIndex],
      region.annualMeanTemperatureC,
      region.annualPrecipitationMm,
      region.coordinates?.latitude ?? "",
      region.coordinates?.longitude ?? "",
      region.elevationM ?? "",
      region.source?.period ?? state.dataset.summary?.period ?? "",
      region.source?.label ?? state.dataset.summary?.sourceLabel ?? "",
    ])
  );

  downloadClimateCsvPayload({
    filename: `한국기후-선택지역-${selectedRegions.length}곳`,
    headers,
    rows,
  });
  setSelectionUtilityStatus("CSV를 저장했습니다");
}

async function copyCurrentViewLink() {
  syncUrlState("replace");
  const shareUrl = buildCurrentViewUrl().href;

  try {
    await writeClipboardText(shareUrl);
    setSelectionUtilityStatus("링크를 복사했습니다");
  } catch (error) {
    console.warn("기후 비교 링크 복사 실패:", error);
    setSelectionUtilityStatus("복사하지 못했습니다. 주소창의 주소를 복사해 주세요.", "error");
  }
}

async function writeClipboardText(text) {
  let clipboardAttempt = null;
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      clipboardAttempt = navigator.clipboard.writeText(text).then(
        () => true,
        () => false,
      );
    } catch (error) {
      console.warn("Clipboard API 호출을 시작하지 못했습니다.", error);
    }
  }

  try {
    copyTextWithFallback(text);
    return;
  } catch (fallbackError) {
    if (!clipboardAttempt) throw fallbackError;
  }

  const copied = await Promise.race([
    clipboardAttempt,
    new Promise((resolve) => {
      window.setTimeout(() => resolve(false), 900);
    }),
  ]);
  if (copied) {
    return;
  }
  throw new Error("Clipboard copy failed");
}

function copyTextWithFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard fallback failed");
}

function setSelectionUtilityStatus(message, tone = "success") {
  if (!elements.selectionUtilityStatus) return;
  window.clearTimeout(utilityStatusTimer);
  elements.selectionUtilityStatus.textContent = message;
  elements.selectionUtilityStatus.classList.toggle("is-warning", tone === "warning");
  elements.selectionUtilityStatus.classList.toggle("is-error", tone === "error");
  utilityStatusTimer = window.setTimeout(() => {
    elements.selectionUtilityStatus.textContent = "";
    elements.selectionUtilityStatus.classList.remove("is-warning", "is-error");
  }, 4200);
}

let searchRenderTimer = 0;

function bindEvents() {
  elements.selectionSummary?.addEventListener("click", () => {
    document.querySelector("#selectedPanel")?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
  });
  let trayDrag = null;
  let suppressTrayClick = false;
  elements.selectedTray?.addEventListener("pointerdown", (event) => {
    const chip = event.target.closest("[data-tray-remove-id]");
    if (!chip || event.button !== 0) return;
    trayDrag = { id: chip.dataset.trayRemoveId, x: event.clientX, y: event.clientY, active: false };
  });
  elements.selectedTray?.addEventListener("pointermove", (event) => {
    if (!trayDrag) return;
    if (!trayDrag.active && Math.hypot(event.clientX - trayDrag.x, event.clientY - trayDrag.y) < 8) return;
    trayDrag.active = true;
    elements.selectedTray.querySelector(`[data-tray-remove-id="${trayDrag.id}"]`)?.classList.add("is-dragging");
    elements.selectedTray.querySelectorAll(".is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
    document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-tray-remove-id]")?.classList.add("is-drop-target");
  });
  window.addEventListener("pointerup", (event) => {
    if (!trayDrag) return;
    const drag = trayDrag;
    trayDrag = null;
    elements.selectedTray?.querySelectorAll(".is-dragging, .is-drop-target").forEach((chip) => chip.classList.remove("is-dragging", "is-drop-target"));
    if (!drag.active) return;
    suppressTrayClick = true;
    setTimeout(() => { suppressTrayClick = false; }, 0);
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-tray-remove-id]");
    const ids = [...state.selectedIds];
    const from = drag.id;
    const to = target?.dataset.trayRemoveId;
    if (!ids.includes(from) || !ids.includes(to) || from === to) return;
    ids.splice(ids.indexOf(from), 1);
    ids.splice(ids.indexOf(to), 0, from);
    state.selectedIds = new Set(ids);
    pushUrlStateOnNextRender();
    renderSelection();
  });
  window.addEventListener("pointercancel", () => {
    trayDrag = null;
    elements.selectedTray?.querySelectorAll(".is-dragging, .is-drop-target").forEach((chip) => chip.classList.remove("is-dragging", "is-drop-target"));
  });
  elements.selectedTray?.addEventListener("click", (event) => {
    if (!suppressTrayClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressTrayClick = false;
  }, true);
  document.addEventListener("keydown", (event) => {
    if ((event.key !== "/" && event.code !== "Slash") || event.altKey || event.ctrlKey || event.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "")) return;
    event.preventDefault();
    elements.searchInput?.focus();
  });
  elements.searchInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !state.search && !state.query) return;
    const results = sortDisplayedRegions(getVisibleRegions());
    if (results.length !== 1) return;
    event.preventDefault();
    state.selectedIds.add(results[0].id);
    pushUrlStateOnNextRender();
    renderSelection();
  });
  for (const panel of [elements.selectedRegionsContent, elements.comparisonContent]) {
    panel?.addEventListener("click", (event) => {
      if (event.target.closest("[data-random-selection]")) elements.randomSpacedSelectionButton.click();
    });
  }

  elements.selectedRegionsContent?.addEventListener("click", handleClimateCsvDownload);
  elements.comparisonContent?.addEventListener("click", handleClimateCsvDownload);

  elements.searchInput?.addEventListener("input", (event) => {
    state.search = event.target.value ?? "";
    clearTimeout(searchRenderTimer);
    searchRenderTimer = setTimeout(renderBrowse, 120);
  });

  elements.regionSortSelect?.addEventListener("change", (event) => {
    state.regionSort = event.target.value || "default";
    pushUrlStateOnNextRender();
    renderBrowse();
  });

  elements.randomSpacedSelectionButton?.addEventListener("click", () => {
    applyRandomSpacedSelection();
  });

  elements.clearSelectionButton?.addEventListener("click", () => {
    state.selectedIds.clear();
    state.comparisonBaseline = "mean";
    pushUrlStateOnNextRender();
    renderSelection();
  });

  elements.copyShareLinkButton?.addEventListener("click", () => {
    void copyCurrentViewLink();
  });

  elements.downloadSelectedCsvButton?.addEventListener("click", downloadSelectedRegionsCsv);

  elements.nationChips?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-nation]");
    if (!button) {
      return;
    }
    state.nation = button.dataset.nation;
    pushUrlStateOnNextRender();
    renderBrowse();
    restoreFocusByDataAttribute("data-nation", button.dataset.nation);
  });

  elements.zoneChips?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-zone]");
    if (!button) {
      return;
    }
    state.zone = button.dataset.zone;
    pushUrlStateOnNextRender();
    renderBrowse();
    restoreFocusByDataAttribute("data-zone", button.dataset.zone);
  });

  elements.mapScopeChips?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-map-scope]");
    if (!button) {
      return;
    }
    state.mapScope = button.dataset.mapScope;
    pushUrlStateOnNextRender();
    renderBrowse();
    restoreFocusByDataAttribute("data-map-scope", button.dataset.mapScope);
  });

  elements.selectedTray?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-tray-remove-id]");
    if (!chip) return;
    const chips = [...elements.selectedTray.querySelectorAll("[data-tray-remove-id]")];
    const index = chips.indexOf(chip);
    toggleSelection(chip.dataset.trayRemoveId);
    focusSelectedTrayAfterRemoval(index);
  });

  elements.regionList?.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-region-checkbox]");
    if (!checkbox) {
      return;
    }
    toggleSelection(checkbox.dataset.regionCheckbox, "data-region-checkbox");
  });

  elements.worldMap?.addEventListener("click", (event) => {
    const marker = event.target.closest("[data-map-region-id]");
    if (!marker) {
      return;
    }

    if (window.ClimateMapZoom?.focusMarkerOnMobile(marker)) return;

    // Direct selection; dense areas are handled by zoom (map-zoom.js) and the 주요 지점 scope.
    const regionId = marker.dataset.mapRegionId;
    closeMapCandidatePicker();
    toggleSelection(regionId, "data-map-region-id");
  });

  elements.mapCandidatePicker?.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-map-candidate-close]");
    if (closeButton) {
      closeMapCandidatePicker(true);
      return;
    }

    const candidateButton = event.target.closest("[data-map-candidate-id]");
    if (!candidateButton) {
      return;
    }

    toggleSelection(candidateButton.dataset.mapCandidateId, "data-map-candidate-id");
  });

  elements.comparisonContent?.addEventListener("click", (event) => {
    const modeButton = event.target.closest("[data-comparison-mode]");
    if (!modeButton) return;
    const oldTicks = window.TwMotion?.snapshotChartTicks(elements.comparisonContent);
    state.comparisonMode = modeButton.dataset.comparisonMode === "deviation" ? "deviation" : "value";
    renderComparisonOnly();
    window.TwMotion?.animateChartTicks(elements.comparisonContent, oldTicks);
    restoreFocusByDataAttribute("data-comparison-mode", state.comparisonMode);
  });

  elements.comparisonContent?.addEventListener("change", (event) => {
    const select = event.target.closest("[data-baseline-select]");
    if (!select) {
      return;
    }
    state.comparisonBaseline = select.value || "mean";
    pushUrlStateOnNextRender();
    renderComparisonOnly();
  });

  window.addEventListener("popstate", restoreUrlStateFromHistory);
}

function applyDefaultSelection() {
  const defaults = state.dataset.defaultSampleNames ?? [];
  const defaultRegions = state.regions.filter((region) => defaults.includes(region.name));
  if (defaultRegions.length > 0) {
    state.selectedIds = new Set(defaultRegions.map((region) => region.id));
    return;
  }

  const randomRegions = pickRandomSpacedSelection();
  state.selectedIds = new Set(randomRegions.map((region) => region.id));
}

function applyUrlStateFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const knownRegionIds = new Set(state.regions.map((region) => region.id));
  const nationValues = new Set(["전체", ...(state.dataset.nationOrder ?? [])]);
  const zoneValues = new Set(["전체", ...(state.dataset.zoneOrder ?? [])]);

  state.nation = readUrlEnum(params, "nation", nationValues, "전체");
  state.zone = readUrlEnum(params, "zone", zoneValues, "전체");
  state.regionSort = readUrlEnum(params, "sort", REGION_SORT_VALUES, "default");
  state.mapScope = readUrlEnum(params, "map", new Set(["major", "all", "selected"]), "major");
  state.search = (params.get("query") ?? "").slice(0, 160);
  state.comparisonBaseline = "mean";

  if (params.has("regions")) {
    state.selectedIds = new Set(
      (params.get("regions") ?? "")
        .split(",")
        .map((regionId) => regionId.trim())
        .filter((regionId) => knownRegionIds.has(regionId))
    );
  } else {
    applyDefaultSelection();
  }

  const requestedBaseline = params.get("baseline") ?? "mean";
  if (requestedBaseline === "mean" || state.selectedIds.has(requestedBaseline)) {
    state.comparisonBaseline = requestedBaseline;
  }

  if (elements.searchInput) elements.searchInput.value = state.search;
  if (elements.regionSortSelect) elements.regionSortSelect.value = state.regionSort;
}

function readUrlEnum(params, key, allowedValues, fallback) {
  const value = params.get(key);
  return value && allowedValues.has(value) ? value : fallback;
}

function buildCurrentViewUrl() {
  const url = new URL(window.location.href);
  URL_STATE_KEYS.forEach((key) => url.searchParams.delete(key));
  const selectedIds = [...state.selectedIds];

  url.searchParams.set("regions", selectedIds.join(","));
  if (state.nation !== "전체") url.searchParams.set("nation", state.nation);
  if (state.zone !== "전체") url.searchParams.set("zone", state.zone);
  if (state.search) url.searchParams.set("query", state.search);
  if (state.regionSort !== "default") url.searchParams.set("sort", state.regionSort);
  if (state.mapScope !== "major") url.searchParams.set("map", state.mapScope);
  if (state.comparisonBaseline !== "mean") {
    url.searchParams.set("baseline", state.comparisonBaseline);
  }
  return url;
}

function pushUrlStateOnNextRender() {
  if (!isRestoringUrlState) nextUrlSyncMode = "push";
}

function syncUrlState(mode = "replace") {
  if (isRestoringUrlState || !window.history?.replaceState) return;
  const nextUrl = buildCurrentViewUrl();
  if (nextUrl.href === window.location.href) return;

  try {
    const method = mode === "push" ? "pushState" : "replaceState";
    window.history[method]({ climateView: "korea" }, "", nextUrl);
  } catch (error) {
    console.warn("기후 비교 URL 상태를 갱신하지 못했습니다.", error);
  }
}

function restoreUrlStateFromHistory() {
  isRestoringUrlState = true;
  nextUrlSyncMode = "replace";
  try {
    applyUrlStateFromLocation();
    render();
  } finally {
    isRestoringUrlState = false;
  }
  syncUrlState("replace");
}

function renderMetaList(parts) {
  return `<span class="tw-meta-list">${parts
    .filter((part) => part !== undefined && part !== null && part !== "")
    .map((part) => `<span>${escapeHtml(part)}</span>`)
    .join("")}</span>`;
}

function renderSelectedTray(selectedRegions) {
  if (selectedRegions.length === 0) {
    return `<span class="selected-tray-empty">선택한 곳이 없습니다</span>`;
  }

  return selectedRegions
    .map(
      (region) => `
        <button
          type="button"
          class="selected-tray-chip"
          data-tray-remove-id="${escapeHtml(region.id)}"
          aria-label="${escapeHtml(region.name)} 선택 해제"
          title="드래그로 순서 변경, 클릭하여 선택 해제"
        >
          <span>${escapeHtml(region.name)}</span>
          <span class="selected-tray-x" aria-hidden="true"></span>
        </button>
      `
    )
    .join("");
}

function focusSelectedTrayAfterRemoval(index) {
  const chips = elements.selectedTray?.querySelectorAll("[data-tray-remove-id]") ?? [];
  const next = chips[Math.min(index, chips.length - 1)];
  next?.focus({ preventScroll: true });
}

function toggleSelection(regionId, focusAttribute = "") {
  if (state.selectedIds.has(regionId)) {
    state.selectedIds.delete(regionId);
  } else {
    state.selectedIds.add(regionId);
  }
  pushUrlStateOnNextRender();
  renderSelection();
  restoreFocusByDataAttribute(focusAttribute, regionId);
}

function restoreFocusByDataAttribute(attributeName, attributeValue) {
  if (!attributeName || !attributeValue) return;

  const nextTarget = [...document.querySelectorAll(`[${attributeName}]`)].find(
    (element) => element.getAttribute(attributeName) === attributeValue
  );
  nextTarget?.focus({ preventScroll: true });
}

function applyRandomSpacedSelection() {
  const pickedRegions = pickRandomSpacedSelection();
  if (pickedRegions.length === 0) {
    return;
  }

  state.search = "";
  state.nation = "전체";
  state.zone = "전체";
  state.comparisonBaseline = "mean";
  state.selectedIds = new Set(pickedRegions.map((region) => region.id));

  if (elements.searchInput) {
    elements.searchInput.value = "";
  }

  pushUrlStateOnNextRender();
  render();
}

function pickRandomSpacedSelection() {
  const candidates = state.regions.filter(hasCoordinates);
  if (candidates.length < RANDOM_SELECTION_SIZE) {
    return [];
  }

  return findSpacedSelection(candidates, RANDOM_SELECTION_SIZE);
}

function findSpacedSelection(candidates, selectionSize) {
  for (const minDistanceKm of RANDOM_SELECTION_MIN_DISTANCE_STEPS) {
    const validSelections = [];

    for (let attemptIndex = 0; attemptIndex < RANDOM_SELECTION_ATTEMPTS; attemptIndex += 1) {
      const picked = [];
      const shuffledCandidates = shuffleArray(candidates);

      shuffledCandidates.forEach((candidate) => {
        if (
          picked.length < selectionSize &&
          picked.every(
            (selectedRegion) =>
              calculateDistanceKm(selectedRegion.coordinates, candidate.coordinates) >= minDistanceKm
          )
        ) {
          picked.push(candidate);
        }
      });

      if (picked.length === selectionSize) {
        validSelections.push(picked);
      }
    }

    if (validSelections.length > 0) {
      return validSelections[Math.floor(Math.random() * validSelections.length)];
    }
  }

  return shuffleArray(candidates).slice(0, selectionSize);
}

function hasCoordinates(region) {
  return (
    typeof region.coordinates?.latitude === "number" && typeof region.coordinates?.longitude === "number"
  );
}

function normalizeComparisonBaseline(selectedRegions) {
  if (state.comparisonBaseline === "mean") {
    return;
  }

  if (!selectedRegions.some((region) => region.id === state.comparisonBaseline)) {
    state.comparisonBaseline = "mean";
  }
}

function finishPartialRender() {
  const urlSyncMode = nextUrlSyncMode;
  nextUrlSyncMode = "replace";
  syncUrlState(urlSyncMode);
}

function renderBrowse() {
  clearTimeout(searchRenderTimer);
  const visibleRegions = sortDisplayedRegions(getVisibleRegions());
  const selectedRegions = getSelectedRegions();
  const mapRegions = getMapRegions(visibleRegions, selectedRegions);
  if (elements.mapSummary) {
    elements.mapSummary.textContent = state.mapScope === "selected"
      ? `선택 ${mapRegions.length}곳` : `${mapRegions.length}곳`;
  }
  elements.nationChips.innerHTML = renderNationChips();
  elements.zoneChips.innerHTML = renderZoneChips();
  elements.mapScopeChips.innerHTML = renderMapScopeChips();
  elements.regionList.innerHTML = renderRegionList(visibleRegions);
  renderMap(visibleRegions, selectedRegions);
  renderMapCandidatePicker();
  finishPartialRender();
}

function syncSelectionControls() {
  for (const input of elements.regionList.querySelectorAll("input[data-region-checkbox]")) {
    const selected = state.selectedIds.has(input.dataset.regionCheckbox);
    input.checked = selected;
    input.closest(".region-option")?.classList.toggle("is-selected", selected);
  }
  for (const marker of elements.worldMap.querySelectorAll("[data-map-region-id]")) {
    const selected = state.selectedIds.has(marker.dataset.mapRegionId);
    marker.classList.toggle("is-selected", selected);
    marker.setAttribute("aria-pressed", String(selected));
    marker.setAttribute("aria-label", `${marker.dataset.mobileLabel} ${selected ? "선택 해제" : "선택"}`);
  }
  elements.worldMap.dispatchEvent(new Event("climate-map-selection"));
}

function renderSelection() {
  const selectedRegions = getSelectedRegions();
  normalizeComparisonBaseline(selectedRegions);
  const trayMotion = window.ClimateMotion?.snapshotTray(elements.selectedTray);
  const cardMotion = window.ClimateMotion?.snapshotCards(elements.selectedRegionsContent);
  const chartMotion = window.TwMotion?.snapshotCharts(elements.comparisonContent);
  resetClimateCsvExports();
  if (elements.selectionSummary) elements.selectionSummary.textContent = `${selectedRegions.length}곳 선택`;
  if (elements.selectedTray) {
    elements.selectedTray.innerHTML = renderSelectedTray(selectedRegions);
    window.ClimateMotion?.animateTray(elements.selectedTray, trayMotion);
  }
  if (elements.downloadSelectedCsvButton) {
    elements.downloadSelectedCsvButton.disabled = selectedRegions.length === 0;
    elements.downloadSelectedCsvButton.textContent = "CSV";
  }
  if (state.mapScope === "all") {
    syncSelectionControls();
  } else {
    const visibleRegions = sortDisplayedRegions(getVisibleRegions());
    const mapRegions = getMapRegions(visibleRegions, selectedRegions);
    if (elements.mapSummary) elements.mapSummary.textContent = state.mapScope === "selected"
      ? `선택 ${mapRegions.length}곳` : `${mapRegions.length}곳`;
    renderMap(visibleRegions, selectedRegions);
  }
  elements.selectedRegionsContent.innerHTML = renderSelectedRegions(selectedRegions);
  window.ClimateMotion?.animateCards(elements.selectedRegionsContent, cardMotion, elements.selectionSummary);
  elements.comparisonContent.innerHTML = renderComparison(selectedRegions);
  window.TwMotion?.animateCharts(elements.comparisonContent, chartMotion);
  finishPartialRender();
}

function renderComparisonOnly() {
  const selectedRegions = getSelectedRegions();
  normalizeComparisonBaseline(selectedRegions);
  const chartMotion = window.TwMotion?.snapshotCharts(elements.comparisonContent);
  elements.comparisonContent.innerHTML = renderComparison(selectedRegions);
  window.TwMotion?.animateCharts(elements.comparisonContent, chartMotion);
  finishPartialRender();
}

function render() {
  const trayMotion = window.ClimateMotion?.snapshotTray(elements.selectedTray);
  const cardMotion = window.ClimateMotion?.snapshotCards(elements.selectedRegionsContent);
  const chartMotion = window.TwMotion?.snapshotCharts(elements.comparisonContent);
  resetClimateCsvExports();

  const visibleRegions = sortDisplayedRegions(getVisibleRegions());
  const selectedRegions = getSelectedRegions();
  normalizeComparisonBaseline(selectedRegions);

  if (elements.heroCount) {
    elements.heroCount.textContent = `${state.dataset.summary.regionCount}곳`;
  }
  if (elements.heroCaption) {
    const period = String(state.dataset.summary.period ?? "1991-2020").replace("-", "–");
    elements.heroCaption.textContent = `KMA ${period}`;
  }
  if (elements.selectionSummary) {
    elements.selectionSummary.textContent = `${selectedRegions.length}곳 선택`;
  }
  if (elements.selectedTray) {
    elements.selectedTray.innerHTML = renderSelectedTray(selectedRegions);
    window.ClimateMotion?.animateTray(elements.selectedTray, trayMotion);
  }
  if (elements.mapSummary) {
    const mapRegions = getMapRegions(visibleRegions, selectedRegions);
    elements.mapSummary.textContent =
      state.mapScope === "selected"
        ? `선택 ${mapRegions.length}곳`
        : `${mapRegions.length}곳`;
  }

  elements.nationChips.innerHTML = renderNationChips();
  elements.zoneChips.innerHTML = renderZoneChips();
  elements.mapScopeChips.innerHTML = renderMapScopeChips();
  elements.regionList.innerHTML = renderRegionList(visibleRegions);
  if (elements.downloadSelectedCsvButton) {
    elements.downloadSelectedCsvButton.disabled = selectedRegions.length === 0;
    elements.downloadSelectedCsvButton.textContent = "CSV";
  }
  elements.selectedRegionsContent.innerHTML = renderSelectedRegions(selectedRegions);
  window.ClimateMotion?.animateCards(elements.selectedRegionsContent, cardMotion, elements.selectionSummary);
  elements.comparisonContent.innerHTML = renderComparison(selectedRegions);
  window.TwMotion?.animateCharts(elements.comparisonContent, chartMotion);
  renderMap(visibleRegions, selectedRegions);
  renderMapCandidatePicker();
  const urlSyncMode = nextUrlSyncMode;
  nextUrlSyncMode = "replace";
  syncUrlState(urlSyncMode);
}

function getVisibleRegions() {
  const query = normalizeText(state.search);

  return state.regions.filter((region) => {
    const matchesNation = state.nation === "전체" || region.nation === state.nation;
    const matchesZone = state.zone === "전체" || region.zone === state.zone;
    const matchesSearch =
      !query ||
      window.ClimateSearchKit.matches([
        region.name, region.officialName, region.nation, region.zone,
        String(region.stationId), ...(region.aliases ?? []),
      ], query);

    return matchesNation && matchesZone && matchesSearch;
  });
}

function getSelectedRegions() {
  return [...state.selectedIds].map((id) => state.regions.find((region) => region.id === id)).filter(Boolean);
}

function sortDisplayedRegions(regions) {
  return [...regions].sort(compareRegionsByActiveSort);
}

function compareRegionsByActiveSort(left, right) {
  switch (state.regionSort) {
    case "name":
      return collator.compare(left.name, right.name);
    case "annualPrecipitationDesc":
      return compareNumericDescending(left.annualPrecipitationMm, right.annualPrecipitationMm, left, right);
    case "annualRangeDesc":
      return compareNumericDescending(getAnnualTemperatureRange(left), getAnnualTemperatureRange(right), left, right);
    case "warmestMonthDesc":
      return compareNumericDescending(getWarmestMonthTemperature(left), getWarmestMonthTemperature(right), left, right);
    case "coldestMonthAsc":
      return compareNumericAscending(getColdestMonthTemperature(left), getColdestMonthTemperature(right), left, right);
    default:
      return sortRegions(left, right);
  }
}

function getMapRegions(visibleRegions, selectedRegions) {
  if (state.mapScope === "selected") return selectedRegions;
  if (state.mapScope === "major") {
    // ASOS·북한 지점(지점번호 300 미만)만 표시하고, 선택한 지점은 항상 남김
    return visibleRegions.filter((region) => region.stationId < 300 || state.selectedIds.has(region.id));
  }
  return visibleRegions;
}

function renderNationChips() {
  return state.dataset.nationOrder
    .map((nation) => {
      const count =
        nation === "전체"
          ? state.regions.length
          : state.regions.filter((region) => region.nation === nation).length;
      return `
        <button
          type="button"
          class="chip-button ${state.nation === nation ? "is-active" : ""}"
          data-nation="${escapeHtml(nation)}"
          aria-pressed="${state.nation === nation}"
        >
          ${escapeHtml(nation)} (${count})
        </button>
      `;
    })
    .join("");
}

function renderZoneChips() {
  return state.dataset.zoneOrder
    .map((zone) => {
      const count =
        zone === "전체"
          ? state.regions.length
          : state.regions.filter((region) => region.zone === zone).length;
      return `
        <button
          type="button"
          class="chip-button ${state.zone === zone ? "is-active" : ""}"
          data-zone="${escapeHtml(zone)}"
          aria-pressed="${state.zone === zone}"
        >
          ${escapeHtml(zone)} (${count})
        </button>
      `;
    })
    .join("");
}

function renderMapScopeChips() {
  const items = [
    { id: "major", label: "주요 지점" },
    { id: "all", label: "전체" },
    { id: "selected", label: "선택한 곳" },
  ];
  return items
    .map(
      (item) => `
        <button
          type="button"
          class="chip-button ${state.mapScope === item.id ? "is-active" : ""}"
          data-map-scope="${item.id}"
          aria-pressed="${state.mapScope === item.id}"
        >
          ${item.label}
        </button>
      `
    )
    .join("");
}

function renderRegionList(regions) {
  if (!regions.length) {
    return renderEmptyState("검색 결과가 없습니다", "");
  }

  return regions
    .map((region) => {
      const checked = state.selectedIds.has(region.id);
      return `
        <label class="region-option ${checked ? "is-selected" : ""}" data-region-option="${region.id}">
          <div class="region-option-top">
            <div class="region-option-title">
              <strong>${escapeHtml(region.name)}</strong>
              ${renderMetaList([region.nation, region.zone])}
            </div>
            <span class="region-option-check-wrap">
              <input
                type="checkbox"
                ${checked ? "checked" : ""}
                data-region-checkbox="${region.id}"
                aria-label="${escapeHtml(region.name)} 선택"
              />
              <svg class="region-option-check-mark" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3.5 3.5L15 6" /></svg>
            </span>
          </div>
        </label>
      `;
    })
    .join("");
}

function renderSelectedRegions(regions) {
  if (!regions.length) {
    return renderEmptyState("지도나 목록에서 지역을 선택해 주세요", "", true);
  }

  const sharedChartScale = buildClimateChartScale(regions);
  return regions.map((region) => renderRegionCard(region, sharedChartScale)).join("");
}

function buildClimateChartScale(regions) {
  return window.ClimateChartKit.buildScale(regions);
}

function renderRegionCard(region, sharedChartScale) {
  const monthlyRows = region.months.map((month, monthIndex) => ({
    label: month,
    temperature: region.monthlyTemperatureC[monthIndex],
    precipitation: region.monthlyPrecipitationMm[monthIndex],
    coldDays: region.monthlyColdDaysBelowZero[monthIndex],
    hotDays: region.monthlyHotDaysAboveTwentyFiveMin[monthIndex],
  }));
  const csvKey = registerClimateCsvExport(
    `korea-region-${region.id}-raw`,
    ["월", "월평균 기온(°C)", "월 강수량(mm)", "영하 일수", "열대야 일수"],
    [
      ...monthlyRows.map((row) => [
        row.label,
        row.temperature,
        row.precipitation,
        row.coldDays,
        row.hotDays,
      ]),
      [
        "연간",
        region.annualMeanTemperatureC,
        region.annualPrecipitationMm,
        region.annualColdDaysBelowZero,
        region.annualHotDaysAboveTwentyFiveMin,
      ],
    ],
    `${region.name}-월별-원데이터`
  );

  return `
    <article class="region-card" data-region-id="${escapeHtml(region.id)}">
      <header class="region-card-head">
        <div class="region-card-title">
          <h3>${escapeHtml(region.name)}</h3>
          <p class="region-card-sub">${renderMetaList([region.nation, "아시아", region.coordinates?.latitude < 0 ? "남반구" : "북반구"])}</p>
        </div>
        ${window.ClimateChartKit.renderLocator(region, true)}
        <dl class="region-card-stats">
          <div><dt>연평균 기온</dt><dd>${formatTemp(region.annualMeanTemperatureC)}</dd></div>
          <div><dt>연 강수량</dt><dd>${formatMm(region.annualPrecipitationMm)}</dd></div>
        </dl>
      </header>
      <div class="region-card-chart">
        ${renderClimateChart(region, sharedChartScale)}
      </div>
      <details class="climate-data-details">
        <summary>원 데이터</summary>
        <div class="climate-data-tools">
          <button
            type="button"
            class="ghost-button climate-csv-download"
            data-climate-csv-download="${escapeHtml(csvKey)}"
          >
            CSV
          </button>
        </div>
        <div class="table-wrap region-card-table">
          <table>
            <thead>
              <tr>
                <th>월</th>
                <th>월평균 기온</th>
                <th>월 강수량</th>
                <th title="일 최저기온 0°C 미만">영하 일수</th>
                <th title="일 최저기온 25°C 이상">열대야 일수</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyRows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.label)}</td>
                      <td>${formatTemp(row.temperature)}</td>
                      <td>${formatMm(row.precipitation)}</td>
                      <td>${formatDays(row.coldDays)}</td>
                      <td>${formatDays(row.hotDays)}</td>
                    </tr>
                  `
                )
                .join("")}
              <tr>
                <th scope="row">연간</th>
                <td>${formatTemp(region.annualMeanTemperatureC)}</td>
                <td>${formatMm(region.annualPrecipitationMm)}</td>
                <td>${formatDays(region.annualColdDaysBelowZero)}</td>
                <td>${formatDays(region.annualHotDaysAboveTwentyFiveMin)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </article>
  `;
}

function renderComparison(regions) {
  if (regions.length < 2) {
    return renderEmptyState("두 곳 이상 선택하면 비교할 수 있습니다", "", true);
  }

  return window.ComparisonKit.render({
    mode: state.comparisonMode,
    baselineId: state.comparisonBaseline,
    regions: regions.map((region) => ({
      id: region.id,
      name: region.name,
      temps: region.monthlyTemperatureC,
      precs: region.monthlyPrecipitationMm,
      source: region,
    })),
    extras: [{ title: "연교차", unit: "°C", kind: "bar", value: (item) => getAnnualTemperatureRange(item.source) }],
    csv: (key, headers, rows, filename) => registerClimateCsvExport(`korea-${key}`, headers, rows, filename),
  });
}

let koreaMapGeometry = null;

function renderMap(visibleRegions, selectedRegions) {
  const d3 = window.d3;
  const countries = window.KOREA_PENINSULA_GEOJSON;

  if (!d3 || !countries) {
    elements.worldMap.innerHTML = renderEmptyState(
      "지도를 불러오지 못했습니다",
      ""
    );
    return;
  }

  const regions = getMapRegions(visibleRegions, selectedRegions).filter(
    (region) => typeof region.coordinates?.latitude === "number" && typeof region.coordinates?.longitude === "number"
  );
  const width = KOREA_MAP_VIEWBOX.width;
  const height = KOREA_MAP_VIEWBOX.height;
  if (!koreaMapGeometry) {
    const projection = d3.geoMercator()
      .fitExtent(
        [[KOREA_MAP_PADDING.left, KOREA_MAP_PADDING.top],
          [width - KOREA_MAP_PADDING.right, height - KOREA_MAP_PADDING.bottom]],
        countries
      )
      .clipExtent([[0, 0], [width, height]]);
    koreaMapGeometry = { projection, landPath: d3.geoPath(projection)(countries) };
  }
  const { projection, landPath } = koreaMapGeometry;

  const markers = regions
    .map((region) => {
      const projected = projection([region.coordinates.longitude, region.coordinates.latitude]);
      if (!projected) {
        return "";
      }
      const [x, y] = projected;
      const isSelected = state.selectedIds.has(region.id);
      return `
        <button
          type="button"
          class="map-marker ${isSelected ? "is-selected" : ""}"
          data-map-region-id="${region.id}"
          tabindex="0"
          data-label="${escapeHtml(`${region.name} · ${region.nation}`)}"
          data-mobile-label="${escapeHtml(region.name)}"
          data-tooltip="${escapeHtml(`${region.name} ${region.nation}`)}"
          data-map-x="${((x / width) * 100).toFixed(3)}"
          data-map-y="${((y / height) * 100).toFixed(3)}"
          aria-label="${escapeHtml(region.name)} ${isSelected ? "선택 해제" : "선택"}"
          aria-pressed="${isSelected}"
        ></button>
      `;
    })
    .join("");

  elements.worldMap.innerHTML = `
    <div class="world-map-frame is-natural is-korea" data-map-scope="${state.mapScope}">
      <svg class="world-map-svg" viewBox="0 0 ${width} ${height}" aria-label="한국 기후 지도">
        <rect class="map-sphere" x="0" y="0" width="${width}" height="${height}"></rect>
        <g>
          <path class="map-landmass" d="${landPath}"></path>
          <path class="map-country-borders" d="${landPath}"></path>
        </g>
      </svg>
      <div class="world-map-markers">${markers}</div>
    </div>
  `;
  for (const marker of elements.worldMap.querySelectorAll(".map-marker[data-map-x]")) {
    marker.style.left = `${marker.dataset.mapX}%`;
    marker.style.top = `${marker.dataset.mapY}%`;
  }
}

function collectNearbyMapCandidates(event, preferredMarker) {
  const frame = preferredMarker.closest(".world-map-frame");
  if (!frame) {
    return { ids: [preferredMarker.dataset.mapRegionId], total: 1 };
  }

  const preferredRect = preferredMarker.getBoundingClientRect();
  const usePreferredCenter = event.detail === 0 || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY);
  const clickX = usePreferredCenter ? preferredRect.left + preferredRect.width / 2 : event.clientX;
  const clickY = usePreferredCenter ? preferredRect.top + preferredRect.height / 2 : event.clientY;
  const frameWidth = frame.getBoundingClientRect().width;
  const radius = Math.min(
    MAP_CANDIDATE_RADIUS_MAX,
    Math.max(MAP_CANDIDATE_RADIUS_MIN, frameWidth * 0.055)
  );
  const preferredId = preferredMarker.dataset.mapRegionId;
  const candidates = [...frame.querySelectorAll("button[data-map-region-id]")]
    .map((marker) => {
      const rect = marker.getBoundingClientRect();
      const distance = Math.hypot(
        rect.left + rect.width / 2 - clickX,
        rect.top + rect.height / 2 - clickY
      );
      return { id: marker.dataset.mapRegionId, distance };
    })
    .filter((candidate) => candidate.id === preferredId || candidate.distance <= radius)
    .sort((left, right) => left.distance - right.distance || collator.compare(left.id, right.id));

  return {
    ids: candidates.slice(0, MAP_CANDIDATE_LIMIT).map((candidate) => candidate.id),
    total: candidates.length,
  };
}

function closeMapCandidatePicker(restoreAnchorFocus = false) {
  const anchorRegionId = state.mapCandidatePicker?.anchorRegionId ?? "";
  state.mapCandidatePicker = null;
  renderMapCandidatePicker();

  if (restoreAnchorFocus && anchorRegionId) {
    restoreFocusByDataAttribute("data-map-region-id", anchorRegionId);
  }
}

function renderMapCandidatePicker() {
  if (!elements.mapCandidatePicker) {
    return;
  }

  const picker = state.mapCandidatePicker;
  const visibleMarkerIds = new Set(
    [...elements.worldMap.querySelectorAll("[data-map-region-id]")].map(
      (marker) => marker.dataset.mapRegionId
    )
  );
  const regions = (picker?.ids ?? [])
    .map((regionId) => state.regions.find((region) => region.id === regionId))
    .filter((region) => region && visibleMarkerIds.has(region.id));

  if (!picker || regions.length < 2) {
    elements.mapCandidatePicker.hidden = true;
    elements.mapCandidatePicker.innerHTML = "";
    if (picker && regions.length < 2) {
      state.mapCandidatePicker = null;
    }
    return;
  }

  elements.mapCandidatePicker.innerHTML = `
    <div class="map-candidate-picker-header">
      <div class="map-candidate-picker-copy">
        <strong>주변 지점 ${regions.length}곳</strong>
      </div>
      <button type="button" class="map-candidate-close" data-map-candidate-close>닫기</button>
    </div>
    <div class="map-candidate-list">
      ${regions.map(renderMapCandidateOption).join("")}
    </div>
  `;
  elements.mapCandidatePicker.hidden = false;
}

function renderMapCandidateOption(region) {
  const isSelected = state.selectedIds.has(region.id);
  const meta = [region.officialName, region.nation, region.zone].filter(Boolean);
  return `
    <button
      type="button"
      class="map-candidate-option ${isSelected ? "is-selected" : ""}"
      data-map-candidate-id="${escapeHtml(region.id)}"
      aria-pressed="${isSelected}"
      aria-label="${escapeHtml(region.name)} ${isSelected ? "선택 해제" : "선택"}"
    >
      <span class="map-candidate-option-copy">
        <strong>${escapeHtml(region.name)}</strong>
        ${renderMetaList(meta)}
      </span>
      <span class="map-candidate-option-state">${isSelected ? "선택 중" : "선택"}</span>
    </button>
  `;
}

function getAnnualTemperatureRange(region) {
  return round(getWarmestMonthTemperature(region) - getColdestMonthTemperature(region));
}

function getWarmestMonthTemperature(region) {
  return Math.max(...region.monthlyTemperatureC);
}

function getColdestMonthTemperature(region) {
  return Math.min(...region.monthlyTemperatureC);
}

function renderClimateChart(region, sharedChartScale = null) {
  return window.ClimateChartKit.render(region, sharedChartScale);
}

function sortRegions(left, right) {
  const zoneOrder = state.dataset.zoneOrder;
  const leftIndex = zoneOrder.indexOf(left.zone);
  const rightIndex = zoneOrder.indexOf(right.zone);
  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }
  return collator.compare(left.name, right.name);
}

function compareNumericDescending(leftValue, rightValue, leftRegion, rightRegion) {
  const difference = rightValue - leftValue;
  if (Math.abs(difference) > 0.0001) {
    return difference;
  }
  return sortRegions(leftRegion, rightRegion);
}

function compareNumericAscending(leftValue, rightValue, leftRegion, rightRegion) {
  const difference = leftValue - rightValue;
  if (Math.abs(difference) > 0.0001) {
    return difference;
  }
  return sortRegions(leftRegion, rightRegion);
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}

function renderEmptyState(title, description, withAction = false) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      ${description ? `<p>${escapeHtml(description)}</p>` : ""}
      ${withAction ? `<button type="button" class="tw-button is-ghost is-sm" data-random-selection>무작위 4곳</button>` : ""}
    </div>
  `;
}

function climateDisplayNumber(value) {
  return climateNumberFormatter.format(round(value)).replace(/^-/, "−");
}

function formatTemp(value) {
  return `${climateDisplayNumber(value)}°C`;
}

function formatMm(value) {
  return `${climateDisplayNumber(value)} mm`;
}

function formatDays(value) {
  return `${value.toFixed(1).replace(/^-/, "−")}일`;
}

function average(values) {
  return round(sum(values) / values.length);
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function round(value) {
  return Number(Number(value).toFixed(1));
}

function calculateDistanceKm(from, to) {
  const earthRadiusKm = 6371;
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function shuffleArray(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

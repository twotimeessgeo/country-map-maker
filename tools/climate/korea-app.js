const KOREA_MAP_VIEWBOX = {
  width: 760,
  height: 1120,
};

const KOREA_MAP_PADDING = {
  top: 40,
  right: 54,
  bottom: 52,
  left: 54,
};

const COMPARISON_PAIR_CONFIGS = [
  {
    id: "jan-aug",
    title: "1월 / 8월",
    leftPeriodId: "jan",
    rightPeriodId: "aug",
    leftStyle: "dot-filled",
    rightStyle: "dot-hollow",
    leftBarStyle: "bar-light",
    rightBarStyle: "bar-dark",
  },
  {
    id: "winter-summer",
    title: "겨울 / 여름",
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
const HERO_MESSAGE_FULL_LINES = [
  "태백산맥은 지도에선 선 하나인데, 기후 그래프에선 거의 연출 담당입니다.",
  "백령도, 서울, 울릉도, 제주를 같이 보면 한반도는 갑자기 꽤 넓어집니다.",
  "서해안의 안개, 동해안의 바람, 남해안의 비. 한국지리는 해안선부터 바쁩니다.",
  "같은 남한인데도 내륙은 연교차로 말하고 해안은 습도로 반응합니다.",
  "추풍령 하나로 공기 결이 달라지는 걸 보면 지형은 정말 성실한 과목입니다.",
  "서울만 보고 지나가면 아쉽습니다. 속초, 완도, 울진이 들어오면 한국지리가 훨씬 살아납니다.",
  "한반도는 작아 보여도 바다 셋과 산맥 하나만으로 꽤 많은 변주를 만듭니다.",
  "영동, 영서, 남해안, 제주를 같이 보면 한국지리는 은근히 아니라 꽤 대놓고 입체적입니다.",
];
const HERO_MESSAGE_QUIZZES = [
  "영동과 영서의 겨울 표정이 다른 이유를 하나만 고르라면, 산맥을 먼저 떠올리면 절반은 맞았습니다.",
  "제주와 울릉도 중 연교차가 더 작아 보일 곳은 어디일까요. 바다가 힌트를 꽤 많이 줍니다.",
  "서울과 강릉의 겨울 느낌이 다른 건 위도보다 무엇의 영향이 더 클까요.",
  "같은 동해안이어도 속초와 울진의 그래프 결이 조금 다른 이유는 무엇일까요.",
  "남해안이 대체로 겨울에 덜 거칠어 보이는 이유를 설명할 단어 하나는 무엇일까요.",
  "추풍령이 자꾸 등장하는 이유는 단순히 유명해서일까요, 아니면 공기 흐름 때문일까요.",
  "백령도와 서울을 나란히 두면 겨울 바람의 영향은 어느 쪽에서 더 먼저 보일까요.",
  "영남 내륙과 해안 도시를 비교할 때 연교차를 갈라놓는 핵심은 무엇일까요.",
];
const HERO_MESSAGE_ASIDES = [
  "태백산맥은 한국지리에서 너무 자주 등장해서 거의 고정 출연진입니다.",
  "서해안은 안개와 조수, 동해안은 바람과 겨울, 남해안은 비와 온난함으로 기억하면 편합니다.",
  "한반도는 작아 보여도 동서 차이를 설명할 때는 꽤 성실하게 증거를 냅니다.",
  "내륙 도시는 계절을 크게 타고, 해안 도시는 바다 눈치를 꽤 많이 봅니다.",
  "강수량 막대를 보면 해안선이 지도보다 먼저 떠오르는 순간이 있습니다.",
  "울릉도와 제주는 둘 다 섬이지만, 그래프를 펴 보면 분위기는 생각보다 다르게 움직입니다.",
  "서울 하나만 보면 평범한데, 속초 하나를 붙이면 갑자기 한국지리가 살아납니다.",
  "추풍령은 이름이 자주 나오는 데엔 이유가 있습니다. 공기 흐름이 정말 열심히 일합니다.",
  "제주가 들어오면 한국 기후 비교는 갑자기 훨씬 남쪽 이야기가 됩니다.",
  "영동과 영서는 늘 같이 불리지만, 날씨에서는 의외로 꽤 다른 팀입니다.",
];
const HERO_MESSAGE_DARKS = [
  "태백산맥은 지도에서는 선 하나지만, 날씨 입장에서는 조용한 판 흔들기 담당입니다.",
  "영동과 영서는 늘 같이 불리는데 그래프를 펴 보면 서로 합의가 잘 안 됩니다.",
  "제주는 한국 기후 비교에 들어오는 순간 혼자 시즌 2를 시작합니다.",
  "추풍령은 이름만 순하고 공기 흐름한테는 거의 교차로 수준으로 바쁩니다.",
  "서울은 무난한 척하지만, 속초를 옆에 두는 순간 태백산맥이 또 일 냈다는 게 드러납니다.",
  "서해안은 흐림으로 존재감을 챙기고, 동해안은 바람으로 밀어붙이고, 남해안은 비까지 얹습니다.",
  "내륙 도시는 계절에 과몰입하고, 해안 도시는 바다 뒤에 숨어서 온화한 척을 합니다.",
  "울릉도와 제주는 둘 다 섬이지만, 그래프에서는 서로 다른 장르를 찍고 있습니다.",
  "한반도는 좁아 보여도 산맥 하나와 바다 셋으로 날씨를 꽤 집요하게 갈라놓습니다.",
  "영남 내륙과 해안은 같은 팀처럼 보이지만 연교차 앞에서는 생각보다 냉정하게 갈립니다.",
  "백령도와 서울을 나란히 두면 겨울 바람이 누구 편인지 꽤 노골적으로 드러납니다.",
  "한국지리는 면적이 작아서 쉬운 게 아니라, 작아 보이는데도 차이가 자꾸 나서 더 얄밉습니다.",
];
const ECONOMY_EGG_MESSAGE = "준비중입니다.";
const HERO_MESSAGE_OPENERS = [
  "백령도에서 서귀포까지 훑어 보면,",
  "영동과 영서를 한 화면에 올리면,",
  "같은 남한끼리만 비교해도,",
  "서울과 평양을 나란히 두면,",
  "서해안과 동해안을 붙여 놓으면,",
  "추풍령 하나 끼워 넣는 순간,",
  "울릉도와 제주를 같이 보면,",
  "내륙 도시와 해안 도시를 섞어 고르면,",
  "태백산맥을 사이에 두고 보면,",
  "좁아 보이는 한반도도,",
  "서울 옆에 속초 하나만 붙여도,",
  "추풍령을 슬쩍 끼워 넣는 순간,",
  "서해안과 남해안을 같이 세워 두면,",
  "제주가 비교표에 들어오는 순간,",
];
const HERO_MESSAGE_PAYOFFS = [
  "지형이 얼마나 성실하게 일하는지 바로 보입니다.",
  "겨울 바람과 여름 비가 서로 다른 흔적을 남깁니다.",
  "그래프가 먼저 지역색을 설명하기 시작합니다.",
  "바다와 산맥이 번갈아 주연을 맡습니다.",
  "기온선 하나에도 동서 차이가 꽤 또렷합니다.",
  "강수량 막대가 해안선의 존재감을 크게 키웁니다.",
  "한반도 기후가 생각보다 입체적이라는 게 금방 드러납니다.",
  "위도만으로는 설명 안 되는 장면이 자꾸 나옵니다.",
  "영남, 호남, 영서, 영동이 각자 자기 얘기를 합니다.",
  "한국지리가 은근히 아니라 꽤 대놓고 재밌어집니다.",
  "산맥이 또 조용히 판을 바꿔 놓았다는 게 드러납니다.",
  "해안과 내륙이 서로 다른 계절을 사는 것처럼 보입니다.",
  "교과서 설명보다 현실 그래프가 훨씬 독하게 말합니다.",
  "평범해 보이던 지점도 갑자기 지역색을 숨기지 못합니다.",
];
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
const coordinateFormatter = new Intl.NumberFormat("ko-KR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const climateCsvExports = new Map();
let climateCsvExportId = 0;
const state = {
  dataset: window.KOREA_CLIMATE_DATA ?? null,
  regions: [],
  search: "",
  regionSort: document.querySelector("#regionSortSelect")?.value || "default",
  nation: "전체",
  zone: "전체",
  mapScope: "all",
  comparisonBaseline: "mean",
  selectedIds: new Set(),
};

const elements = {
  heroText: document.querySelector("#heroText"),
  heroCount: document.querySelector("#heroCount"),
  heroCaption: document.querySelector("#heroCaption"),
  economyEggButton: document.querySelector("#economyEggButton"),
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
  selectedRegionsContent: document.querySelector("#selectedRegionsContent"),
  comparisonContent: document.querySelector("#comparisonContent"),
};

document.addEventListener("DOMContentLoaded", () => {
  void init();
});

async function init() {
  if (!state.dataset) {
    const response = await fetch("./data/korea-climate-data.json");
    state.dataset = await response.json();
  }

  state.regions = [...state.dataset.regions].sort(sortRegions);
  applyDefaultSelection();
  applyRandomHeroMessage();
  bindEvents();
  render();
}

function applyRandomHeroMessage() {
  if (!elements.heroText) {
    return;
  }

  elements.heroText.textContent = buildRandomHeroMessage();
}

function buildRandomHeroMessage() {
  const roll = Math.random();

  if (roll < 0.18) {
    return pickRandomItem(HERO_MESSAGE_FULL_LINES);
  }

  if (roll < 0.36) {
    return pickRandomItem(HERO_MESSAGE_QUIZZES);
  }

  if (roll < 0.58) {
    return pickRandomItem(HERO_MESSAGE_ASIDES);
  }

  if (roll < 0.8) {
    return pickRandomItem(HERO_MESSAGE_DARKS);
  }

  return `${pickRandomItem(HERO_MESSAGE_OPENERS)} ${pickRandomItem(HERO_MESSAGE_PAYOFFS)}`;
}

function pickRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
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

  const rows = [];
  if (payload.headers.length) {
    rows.push(buildClimateCsvLine(payload.headers));
  }
  payload.rows.forEach((row) => rows.push(buildClimateCsvLine(row)));

  const blob = new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const anchor = document.createElement("a");
  const url = URL.createObjectURL(blob);
  anchor.href = url;
  anchor.download = `${payload.filename || "climate-data"}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function showEconomyEggToast() {
  window.alert(ECONOMY_EGG_MESSAGE);
}

function bindEvents() {
  elements.selectedRegionsContent?.addEventListener("click", handleClimateCsvDownload);
  elements.comparisonContent?.addEventListener("click", handleClimateCsvDownload);

  elements.searchInput?.addEventListener("input", (event) => {
    state.search = event.target.value ?? "";
    render();
  });

  elements.regionSortSelect?.addEventListener("change", (event) => {
    state.regionSort = event.target.value || "default";
    render();
  });

  elements.randomSpacedSelectionButton?.addEventListener("click", () => {
    applyRandomSpacedSelection();
  });

  elements.economyEggButton?.addEventListener("click", () => {
    showEconomyEggToast();
  });

  elements.clearSelectionButton?.addEventListener("click", () => {
    state.selectedIds.clear();
    state.comparisonBaseline = "mean";
    render();
  });

  elements.nationChips?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-nation]");
    if (!button) {
      return;
    }
    state.nation = button.dataset.nation;
    render();
  });

  elements.zoneChips?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-zone]");
    if (!button) {
      return;
    }
    state.zone = button.dataset.zone;
    render();
  });

  elements.mapScopeChips?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-map-scope]");
    if (!button) {
      return;
    }
    state.mapScope = button.dataset.mapScope;
    render();
  });

  elements.regionList?.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-region-checkbox]");
    if (!checkbox) {
      return;
    }
    toggleSelection(checkbox.dataset.regionCheckbox);
  });

  elements.regionList?.addEventListener("click", (event) => {
    const option = event.target.closest("[data-region-option]");
    if (!option || event.target.matches("input")) {
      return;
    }
    toggleSelection(option.dataset.regionOption);
  });

  elements.worldMap?.addEventListener("click", (event) => {
    const marker = event.target.closest("[data-map-region-id]");
    if (!marker) {
      return;
    }
    toggleSelection(marker.dataset.mapRegionId);
  });

  elements.comparisonContent?.addEventListener("change", (event) => {
    const select = event.target.closest("[data-baseline-select]");
    if (!select) {
      return;
    }
    state.comparisonBaseline = select.value || "mean";
    render();
  });
}

function applyDefaultSelection() {
  const randomRegions = pickRandomSpacedSelection();
  if (randomRegions.length > 0) {
    state.selectedIds = new Set(randomRegions.map((region) => region.id));
    return;
  }

  const defaults = state.dataset.defaultSampleNames ?? [];
  state.selectedIds = new Set(
    state.regions.filter((region) => defaults.includes(region.name)).map((region) => region.id)
  );
}

function toggleSelection(regionId) {
  if (state.selectedIds.has(regionId)) {
    state.selectedIds.delete(regionId);
  } else {
    state.selectedIds.add(regionId);
  }
  render();
}

function applyRandomSpacedSelection() {
  const pickedRegions = pickRandomSpacedSelection();
  if (pickedRegions.length === 0) {
    return;
  }

  state.search = "";
  state.nation = "전체";
  state.zone = "전체";
  state.mapScope = "selected";
  state.comparisonBaseline = "mean";
  state.selectedIds = new Set(pickedRegions.map((region) => region.id));

  if (elements.searchInput) {
    elements.searchInput.value = "";
  }

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

function render() {
  resetClimateCsvExports();

  const visibleRegions = sortDisplayedRegions(getVisibleRegions());
  const selectedRegions = sortDisplayedRegions(getSelectedRegions());
  normalizeComparisonBaseline(selectedRegions);

  if (elements.heroCount) {
    elements.heroCount.textContent = `${state.dataset.summary.regionCount}개 지역`;
  }
  if (elements.heroCaption) {
    elements.heroCaption.textContent = `${state.dataset.summary.sourceLabel} ${state.dataset.summary.period} 기준`;
  }
  if (elements.selectionSummary) {
    elements.selectionSummary.textContent = `${selectedRegions.length}개 선택됨`;
  }
  if (elements.mapSummary) {
    const mapRegions = getMapRegions(visibleRegions, selectedRegions);
    elements.mapSummary.textContent =
      state.mapScope === "selected"
        ? `선택 지역 ${mapRegions.length}개 표시`
        : `필터 결과 ${mapRegions.length}개 표시`;
  }

  elements.nationChips.innerHTML = renderNationChips();
  elements.zoneChips.innerHTML = renderZoneChips();
  elements.mapScopeChips.innerHTML = renderMapScopeChips();
  elements.regionList.innerHTML = renderRegionList(visibleRegions);
  elements.selectedRegionsContent.innerHTML = renderSelectedRegions(selectedRegions);
  elements.comparisonContent.innerHTML = renderComparison(selectedRegions);
  renderMap(visibleRegions, selectedRegions);
}

function getVisibleRegions() {
  const query = normalizeText(state.search);

  return state.regions.filter((region) => {
    const matchesNation = state.nation === "전체" || region.nation === state.nation;
    const matchesZone = state.zone === "전체" || region.zone === state.zone;
    const matchesSearch =
      !query ||
      [
        region.name,
        region.officialName,
        region.nation,
        region.zone,
        String(region.stationId),
        ...(region.aliases ?? []),
      ]
        .filter(Boolean)
        .some((value) => normalizeText(value).includes(query));

    return matchesNation && matchesZone && matchesSearch;
  });
}

function getSelectedRegions() {
  return state.regions.filter((region) => state.selectedIds.has(region.id));
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
  return state.mapScope === "selected" ? selectedRegions : visibleRegions;
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
        >
          ${escapeHtml(zone)} (${count})
        </button>
      `;
    })
    .join("");
}

function renderMapScopeChips() {
  const items = [
    { id: "all", label: "필터 결과" },
    { id: "selected", label: "선택 지역만" },
  ];
  return items
    .map(
      (item) => `
        <button
          type="button"
          class="chip-button ${state.mapScope === item.id ? "is-active" : ""}"
          data-map-scope="${item.id}"
        >
          ${item.label}
        </button>
      `
    )
    .join("");
}

function renderRegionList(regions) {
  if (!regions.length) {
    return renderEmptyState("조건에 맞는 지역이 없습니다.", "검색어 또는 필터를 조금 넓혀보세요.");
  }

  return regions
    .map((region) => {
      const checked = state.selectedIds.has(region.id);
      return `
        <label class="region-option ${checked ? "is-selected" : ""}" data-region-option="${region.id}">
          <div class="region-option-top">
            <div class="region-option-title">
              <strong>${escapeHtml(region.name)}</strong>
              <span>${escapeHtml(region.officialName)} · ${escapeHtml(region.nation)}</span>
            </div>
            <input
              type="checkbox"
              ${checked ? "checked" : ""}
              data-region-checkbox="${region.id}"
              aria-label="${escapeHtml(region.name)} 선택"
            />
          </div>
          <div class="region-option-meta">${escapeHtml(region.zone)} · 지점 ${region.stationId}</div>
          <div class="region-option-coordinates">${escapeHtml(formatCoordinatePair(region.coordinates))}</div>
        </label>
      `;
    })
    .join("");
}

function renderSelectedRegions(regions) {
  if (!regions.length) {
    return renderEmptyState(
      "지역을 선택해 주세요.",
      "지도나 목록에서 지역을 고르면 1월·8월과 겨울·여름 기준 표와 그래프가 나타납니다."
    );
  }

  const sharedChartScale = buildClimateChartScale(regions);
  return regions.map((region) => renderRegionCard(region, sharedChartScale)).join("");
}

function buildClimateChartScale(regions) {
  const temperatureValues = regions.flatMap((region) => region.monthlyTemperatureC);
  const precipitationValues = regions.flatMap((region) => region.monthlyPrecipitationMm);
  const precipitationStep = pickPrecipitationStep(Math.max(...precipitationValues));
  const tempMinValue = Math.min(...temperatureValues);
  const tempMaxValue = Math.max(...temperatureValues);
  const temperatureStep = pickTemperatureStep(tempMaxValue - tempMinValue);

  return {
    precipitationMax: niceCeil(Math.max(...precipitationValues), precipitationStep),
    temperatureMin: niceFloor(tempMinValue - temperatureStep, temperatureStep),
    temperatureMax: niceCeil(tempMaxValue + temperatureStep, temperatureStep),
  };
}

function renderRegionCard(region, sharedChartScale) {
  const periodMetrics = state.dataset.comparisonPeriods.map((period) => getPeriodMetrics(region, period));
  const annualRange = getAnnualTemperatureRange(region);
  const csvKey = registerClimateCsvExport(
    `korea-region-${region.id}-raw`,
    ["시기", "평균 기온(°C)", "강수량(mm)", "일최저<0℃", "일최저≥25℃"],
    periodMetrics.map((metric) => [
      metric.label,
      metric.temperature,
      metric.precipitation,
      metric.coldDays,
      metric.hotDays,
    ]),
    `${region.name}-월별-원데이터`
  );

  return `
    <article class="region-card">
      <div class="region-card-top">
        <div class="region-card-body">
          <div class="region-card-header">
            <div>
              <p class="section-kicker">지점 ${region.stationId}</p>
              <h3>${escapeHtml(region.name)}</h3>
            </div>
            <div class="selection-summary is-muted">${escapeHtml(region.nation)} · ${escapeHtml(region.zone)}</div>
          </div>
          <div class="region-meta">
            <span class="meta-pill">${escapeHtml(region.officialName)}</span>
            <span class="meta-pill">${escapeHtml(formatCoordinatePair(region.coordinates))}</span>
            <span class="meta-pill">해발 ${formatMeters(region.elevationM)}</span>
          </div>
          <div class="stats-row">
            <span class="stat-pill">연평균 ${formatTemp(region.annualMeanTemperatureC)}</span>
            <span class="stat-pill">연강수 ${formatMm(region.annualPrecipitationMm)}</span>
            <span class="stat-pill">연교차(8월-1월) ${formatTemp(annualRange)}</span>
            <span class="stat-pill">연간 일최저 &lt;0℃ ${formatDays(region.annualColdDaysBelowZero)}</span>
            <span class="stat-pill">연간 일최저 ≥25℃ ${formatDays(region.annualHotDaysAboveTwentyFiveMin)}</span>
          </div>
        </div>
        <div class="region-card-chart">
          <div class="chart-card">
            <h4>연중 기온·강수량</h4>
            ${renderClimateChart(region, sharedChartScale)}
            <p class="chart-caption">* 회색 막대는 강수량, 검은 선은 평균 기온입니다.</p>
          </div>
        </div>
      </div>
      <details class="climate-data-details">
        <summary>원 데이터</summary>
        <div class="climate-data-tools">
          <button
            type="button"
            class="ghost-button climate-csv-download"
            data-climate-csv-download="${escapeHtml(csvKey)}"
          >
            CSV 다운로드
          </button>
        </div>
        <div class="table-wrap region-card-table">
          <table>
            <thead>
              <tr>
                <th>시기</th>
                <th>평균 기온</th>
                <th>강수량</th>
                <th>일최저 &lt;0℃</th>
                <th>일최저 ≥25℃</th>
              </tr>
            </thead>
            <tbody>
              ${periodMetrics
                .map(
                  (metric) => `
                    <tr>
                      <td>${escapeHtml(metric.label)}</td>
                      <td>${formatTemp(metric.temperature)}</td>
                      <td>${formatMm(metric.precipitation)}</td>
                      <td>${formatDays(metric.coldDays)}</td>
                      <td>${formatDays(metric.hotDays)}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </details>
    </article>
  `;
}

function renderComparison(regions) {
  if (regions.length < 2) {
    return renderEmptyState(
      "두 지역 이상 선택해 주세요.",
      "여러 지역을 함께 고르면 1월·8월, 겨울·여름의 기온과 강수량 편차와 연교차를 비교할 수 있습니다."
    );
  }

  const rows = buildComparisonRows(regions);
  const baseline = resolveComparisonBaseline(rows);
  const allMonthIndexes = state.dataset.months.map((_, index) => index);
  const januaryAugustMonthIndexes = [0, 7];
  const periodLookup = Object.fromEntries(
    state.dataset.comparisonPeriods.map((period) => [period.id, period])
  );
  const rowsWithComparisonTag = rows.map((row) => {
    const isBaseline = baseline.mode === "region" && baseline.row.region.id === row.region.id;
    return {
      row,
      isBaseline,
    };
  });
  const comparisonCsvKey = registerClimateCsvExport(
    `korea-comparison-${regions.length}-raw`,
    [
      "지역",
      "1월 기온",
      "1월 강수",
      "8월 기온",
      "8월 강수",
      "겨울 기온",
      "겨울 강수",
      "여름 기온",
      "여름 강수",
      "연교차",
      "기준구분",
    ],
    rowsWithComparisonTag.map(({ row, isBaseline }) => [
      row.region.name,
      row.metrics.jan.temperature,
      row.metrics.jan.precipitation,
      row.metrics.aug.temperature,
      row.metrics.aug.precipitation,
      row.metrics.winter.temperature,
      row.metrics.winter.precipitation,
      row.metrics.summer.temperature,
      row.metrics.summer.precipitation,
      row.annualRange,
      isBaseline ? "기준" : "일반",
    ]),
    `${rows.length}개지역-비교-원데이터`
  );

  return `
    <div class="comparison-controls">
      <p>편차 기준을 선택 지역 평균이나 특정 지점으로 바꿔, 각 지역이 어느 기준보다 높고 낮은지 바로 볼 수 있습니다.</p>
      <label class="comparison-select">
        <span>편차 기준</span>
        <select data-baseline-select aria-label="편차 기준">
          <option value="mean" ${baseline.mode === "mean" ? "selected" : ""}>선택 지역 평균</option>
          ${rows
            .map(
              (row) => `
                <option value="${row.region.id}" ${baseline.mode === "region" && baseline.row.region.id === row.region.id ? "selected" : ""}>
                  ${escapeHtml(row.region.name)}
                </option>
              `
            )
            .join("")}
        </select>
      </label>
    </div>
    <details class="climate-data-details">
      <summary>원 데이터</summary>
      <div class="climate-data-tools">
        <button
          type="button"
          class="ghost-button climate-csv-download"
          data-climate-csv-download="${escapeHtml(comparisonCsvKey)}"
        >
          CSV 다운로드
        </button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>지역</th>
              <th>1월 기온</th>
              <th>1월 강수</th>
              <th>8월 기온</th>
              <th>8월 강수</th>
              <th>겨울 기온</th>
              <th>겨울 강수</th>
              <th>여름 기온</th>
              <th>여름 강수</th>
              <th>연교차</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(
                      baseline.mode === "region" && baseline.row.region.id === row.region.id
                        ? `${row.region.name} (기준)`
                        : row.region.name
                    )}</td>
                    <td>${formatTemp(row.metrics.jan.temperature)}</td>
                    <td>${formatMm(row.metrics.jan.precipitation)}</td>
                    <td>${formatTemp(row.metrics.aug.temperature)}</td>
                    <td>${formatMm(row.metrics.aug.precipitation)}</td>
                    <td>${formatTemp(row.metrics.winter.temperature)}</td>
                    <td>${formatMm(row.metrics.winter.precipitation)}</td>
                    <td>${formatTemp(row.metrics.summer.temperature)}</td>
                    <td>${formatMm(row.metrics.summer.precipitation)}</td>
                    <td>${formatTemp(row.annualRange)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </details>
    ${renderFootnoteLines([
      `현재 편차 기준: ${baseline.label}.`,
      `편차 = 해당 지점 값 - ${baseline.formulaLabel}`,
      baseline.mode === "region" ? "기준 지점은 편차 그래프에서 제외됩니다." : "",
    ])}
    <div class="charts-grid">
      <article class="chart-card world-trend-card">
        <h4>월 평균 기온 편차</h4>
        ${renderMonthlyTemperatureTrendChart(rows, baseline)}
        ${renderTrendLegend(comparableTrendRows(rows, baseline), "#111111")}
        ${renderFootnoteLines([
          `월 평균 기온 편차 = 해당 지점 월 평균 기온 - ${baseline.formulaLabel}`,
          baseline.mode === "region" ? "기준 지점은 편차선에서 제외했습니다." : "월별 선택 지점 평균을 기준선으로 삼았습니다.",
        ])}
      </article>
      <article class="chart-card world-trend-card">
        <h4>누적 강수량 편차</h4>
        ${renderCumulativePrecipitationTrendChart(rows, baseline)}
        ${renderTrendLegend(comparableTrendRows(rows, baseline), "#555555")}
        ${renderFootnoteLines([
          "누적 강수량은 1월부터 해당 월까지의 강수량 합입니다.",
          `누적 강수량 편차 = 해당 지점 누적 강수량 - ${baseline.formulaLabel}`,
          baseline.mode === "region" ? "기준 지점은 편차선에서 제외했습니다." : "월별 선택 지점 평균 누적값을 기준선으로 삼았습니다.",
        ])}
      </article>
      <article class="chart-card world-trend-card">
        <h4>월 평균 기온</h4>
        ${renderMonthlyTemperatureActualTrendChart(
          rows,
          allMonthIndexes,
          (row, monthIndex) => row.region.monthlyTemperatureC[monthIndex],
          {
            pointPadding: 14,
          }
        )}
        ${renderTrendLegend(rows, "#111111")}
        ${renderFootnoteLines(["선택 지점의 월 평균 기온(°C) 실제값을 함께 확인합니다."])}
      </article>
      <article class="chart-card world-trend-card">
        <h4>누적 강수량</h4>
        ${renderCumulativePrecipitationActualTrendChart(
          rows,
          allMonthIndexes,
          (row, monthIndex) => cumulativePrecipitationValues(row.region)[monthIndex],
          {
            pointPadding: 14,
          }
        )}
        ${renderTrendLegend(rows, "#555555")}
        ${renderFootnoteLines(["선택 지점의 누적 강수량(mm) 실제값을 함께 확인합니다."])}
      </article>
      <article class="chart-card world-trend-card">
        <h4>1월·8월 강수량</h4>
        ${renderCumulativePrecipitationActualTrendChart(
          rows,
          januaryAugustMonthIndexes,
          (row, monthIndex) => row.region.monthlyPrecipitationMm[monthIndex],
          {
            showLine: false,
            horizontalPadding: 30,
            pointPadding: 24,
          }
        )}
        ${renderTrendLegend(rows, "#555555")}
        ${renderFootnoteLines(["선택 지점의 1월·8월 시기 강수량(mm) 실제값을 함께 확인합니다."])}
      </article>
      <article class="chart-card world-trend-card">
        <h4>1월·8월 평균 기온</h4>
        ${renderMonthlyTemperatureActualTrendChart(
          rows,
          januaryAugustMonthIndexes,
          (row, monthIndex) => row.region.monthlyTemperatureC[monthIndex],
          {
            showLine: false,
            horizontalPadding: 30,
            pointPadding: 24,
          }
        )}
        ${renderTrendLegend(rows, "#111111")}
        ${renderFootnoteLines(["선택 지점의 1월·8월 시기 평균 기온(°C) 실제값을 함께 확인합니다."])}
      </article>
    </div>
    <div class="comparison-pair-grid">
      ${COMPARISON_PAIR_CONFIGS.map((pair) => {
        const leftPeriod = periodLookup[pair.leftPeriodId];
        const rightPeriod = periodLookup[pair.rightPeriodId];
        return `
          <div class="chart-card">
            <h4>${escapeHtml(pair.title)} 기온 편차</h4>
            ${renderPairedTemperatureDeviationChart(rows, leftPeriod, rightPeriod, baseline)}
            ${renderSeriesLegend([
              { label: leftPeriod.label, style: pair.leftStyle },
              { label: rightPeriod.label, style: pair.rightStyle },
            ])}
          </div>
          <div class="chart-card">
            <h4>${escapeHtml(pair.title)} 강수량 편차</h4>
            ${renderPairedPrecipitationDeviationChart(rows, leftPeriod, rightPeriod, baseline)}
            ${renderSeriesLegend([
              { label: leftPeriod.label, style: pair.leftBarStyle },
              { label: rightPeriod.label, style: pair.rightBarStyle },
            ])}
          </div>
        `;
      }).join("")}
      <div class="chart-card is-wide">
        <h4>연교차 비교</h4>
        ${renderAnnualRangeChart(rows)}
        ${renderFootnoteLines(["연교차는 8월 평균 기온에서 1월 평균 기온을 뺀 값입니다."])}
      </div>
    </div>
  `;
}

function renderMap(visibleRegions, selectedRegions) {
  const d3 = window.d3;
  const countries = window.KOREA_PENINSULA_GEOJSON;

  if (!d3 || !countries) {
    elements.worldMap.innerHTML = renderEmptyState(
      "지도를 불러오지 못했습니다.",
      "로컬 지도 데이터가 준비되지 않았습니다."
    );
    return;
  }

  const regions = getMapRegions(visibleRegions, selectedRegions).filter(
    (region) => typeof region.coordinates?.latitude === "number" && typeof region.coordinates?.longitude === "number"
  );
  const width = KOREA_MAP_VIEWBOX.width;
  const height = KOREA_MAP_VIEWBOX.height;
  const projection = d3
    .geoMercator()
    .fitExtent(
      [
        [KOREA_MAP_PADDING.left, KOREA_MAP_PADDING.top],
        [width - KOREA_MAP_PADDING.right, height - KOREA_MAP_PADDING.bottom],
      ],
      countries
    )
    .clipExtent([
      [0, 0],
      [width, height],
    ]);
  const path = d3.geoPath(projection);

  const markers = regions
    .map((region) => {
      const projected = projection([region.coordinates.longitude, region.coordinates.latitude]);
      if (!projected) {
        return "";
      }
      const [x, y] = projected;
      return `
        <button
          type="button"
          class="map-marker ${state.selectedIds.has(region.id) ? "is-selected" : ""}"
          data-map-region-id="${region.id}"
          data-label="${escapeHtml(`${region.name} · ${region.nation}`)}"
          style="left:${((x / width) * 100).toFixed(3)}%; top:${((y / height) * 100).toFixed(3)}%; --marker-color: #111111;"
          aria-label="${escapeHtml(region.name)} 선택"
        ></button>
      `;
    })
    .join("");

  elements.worldMap.innerHTML = `
    <div class="world-map-frame is-natural is-korea">
      <svg class="world-map-svg" viewBox="0 0 ${width} ${height}" aria-label="한국 기후 지도">
        <rect class="map-sphere" x="0" y="0" width="${width}" height="${height}"></rect>
        <g>
          <path class="map-landmass" d="${path(countries)}"></path>
          <path class="map-country-borders" d="${path(countries)}"></path>
        </g>
      </svg>
      <div class="world-map-overlay">
        <span class="map-overlay-pill">지도</span>
        <span class="map-overlay-pill">세로형 확대 보기</span>
        <span class="map-overlay-pill">기상청 지점정보 좌표</span>
      </div>
      <div class="world-map-markers">${markers}</div>
    </div>
  `;
}

function buildComparisonRows(regions) {
  return regions.map((region) => ({
    region,
    metrics: Object.fromEntries(
      state.dataset.comparisonPeriods.map((period) => [period.id, getPeriodMetrics(region, period)])
    ),
    annualRange: getAnnualTemperatureRange(region),
  }));
}

function resolveComparisonBaseline(rows) {
  const baselineRow = rows.find((row) => row.region.id === state.comparisonBaseline);
  if (!baselineRow) {
    return {
      mode: "mean",
      label: "선택 지역 평균",
      formulaLabel: "선택 지역 평균값",
    };
  }

  return {
    mode: "region",
    row: baselineRow,
    label: baselineRow.region.name,
    formulaLabel: `${baselineRow.region.name} 값`,
  };
}

function getPeriodMetrics(region, period) {
  const monthIndexes = period.monthIndexes;
  return {
    id: period.id,
    label: period.label,
    temperature: average(monthIndexes.map((index) => region.monthlyTemperatureC[index])),
    precipitation: round(sum(monthIndexes.map((index) => region.monthlyPrecipitationMm[index]))),
    coldDays: round(sum(monthIndexes.map((index) => region.monthlyColdDaysBelowZero[index]))),
    hotDays: round(sum(monthIndexes.map((index) => region.monthlyHotDaysAboveTwentyFiveMin[index]))),
  };
}

function getAnnualTemperatureRange(region) {
  return round(region.monthlyTemperatureC[7] - region.monthlyTemperatureC[0]);
}

function getWarmestMonthTemperature(region) {
  return Math.max(...region.monthlyTemperatureC);
}

function getColdestMonthTemperature(region) {
  return Math.min(...region.monthlyTemperatureC);
}

function renderClimateChart(region, sharedChartScale = null) {
  const width = 460;
  const height = 300;
  const margin = { top: 18, right: 50, bottom: 40, left: 48 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const monthCount = region.months.length;
  const chartScale = sharedChartScale ?? buildClimateChartScale([region]);
  const precipitationMax = chartScale.precipitationMax;
  const temperatureMin = chartScale.temperatureMin;
  const temperatureMax = chartScale.temperatureMax;
  const tickCount = 5;
  const stepX = chartWidth / monthCount;
  const barWidth = stepX * 0.54;

  const horizontalTicks = new Array(tickCount).fill(null).map((_, tickIndex) => {
    const ratio = tickIndex / (tickCount - 1);
    const y = margin.top + chartHeight - ratio * chartHeight;
    return {
      y,
      tempValue: round(temperatureMin + ratio * (temperatureMax - temperatureMin)),
      precipValue: round(ratio * precipitationMax),
    };
  });

  const points = region.monthlyTemperatureC
    .map((value, index) => {
      const x = margin.left + stepX * index + stepX / 2;
      const y = scaleY(value, temperatureMin, temperatureMax, margin.top, margin.top + chartHeight);
      return `${x},${y}`;
    })
    .join(" ");

  return `
    <svg class="svg-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(
      region.name
    )}의 월별 기온과 강수량 그래프">
      <rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" fill="#ffffff" stroke="#d7d7d7"></rect>
      ${horizontalTicks
        .map(
          (tick) => `
            <line x1="${margin.left}" y1="${tick.y}" x2="${width - margin.right}" y2="${tick.y}" stroke="#d0d0d0" stroke-dasharray="4 4"></line>
            <text x="${margin.left - 10}" y="${tick.y + 4}" text-anchor="end" font-size="11" fill="#555555">${formatPlainNumber(
              tick.tempValue
            )}</text>
            <text x="${width - margin.right + 10}" y="${tick.y + 4}" text-anchor="start" font-size="11" fill="#555555">${formatPlainNumber(
              tick.precipValue
            )}</text>
          `
        )
        .join("")}
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="#111111"></line>
      <line x1="${width - margin.right}" y1="${margin.top}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="#111111"></line>
      <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="#111111"></line>
      ${region.monthlyPrecipitationMm
        .map((value, index) => {
          const x = margin.left + stepX * index + (stepX - barWidth) / 2;
          const y = scaleY(value, 0, precipitationMax, margin.top, margin.top + chartHeight);
          const barHeight = margin.top + chartHeight - y;
          return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#bcbcbc" stroke="#555555"></rect>`;
        })
        .join("")}
      <polyline fill="none" stroke="#111111" stroke-width="2.4" points="${points}"></polyline>
      ${region.monthlyTemperatureC
        .map((value, index) => {
          const x = margin.left + stepX * index + stepX / 2;
          const y = scaleY(value, temperatureMin, temperatureMax, margin.top, margin.top + chartHeight);
          return `<circle cx="${x}" cy="${y}" r="4.2" fill="#111111"></circle>`;
        })
        .join("")}
      ${region.months
        .map((month, index) => {
          const x = margin.left + stepX * index + stepX / 2;
          return `<text x="${x}" y="${height - 12}" text-anchor="middle" font-size="11" fill="#555555">${escapeHtml(
            month.replace("월", "")
          )}</text>`;
        })
        .join("")}
      <text x="${margin.left}" y="12" font-size="11" fill="#111111" font-weight="700">(°C)</text>
      <text x="${width - margin.right}" y="12" text-anchor="end" font-size="11" fill="#555555" font-weight="700">(mm)</text>
    </svg>
  `;
}

function renderPairedTemperatureDeviationChart(rows, leftPeriod, rightPeriod, baseline) {
  const width = 420;
  const height = 274;
  const margin = { top: 24, right: 16, bottom: 70, left: 44 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const pairedRows = buildPairedDeviationRows(rows, leftPeriod.id, rightPeriod.id, "temperature", baseline);
  const maxAbs = Math.max(...pairedRows.flatMap((row) => [Math.abs(row.leftDeviation), Math.abs(row.rightDeviation)]), 1);
  const step = pickDeviationTemperatureStep(maxAbs);
  const axisBound = niceCeil(maxAbs, step);
  const ticks = buildSymmetricTicks(axisBound, step);
  const stepX = chartWidth / Math.max(pairedRows.length, 1);

  return `
    <svg class="svg-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(
      `${leftPeriod.label}와 ${rightPeriod.label} 기온 편차 그래프`
    )}">
      <rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" fill="#ffffff" stroke="#d7d7d7"></rect>
      ${ticks
        .map((tick) => {
          const y = scaleY(tick, -axisBound, axisBound, margin.top, margin.top + chartHeight);
          return `
            <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="${tick === 0 ? "#111111" : "#d0d0d0"}" stroke-dasharray="${tick === 0 ? "0" : "4 4"}"></line>
            <text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#555555">${formatSignedPlain(tick)}</text>
          `;
        })
        .join("")}
      ${pairedRows
        .map((row, index) => {
          const xCenter = margin.left + stepX * index + stepX / 2;
          const leftY = scaleY(row.leftDeviation, -axisBound, axisBound, margin.top, margin.top + chartHeight);
          const rightY = scaleY(row.rightDeviation, -axisBound, axisBound, margin.top, margin.top + chartHeight);
          return `
            <circle cx="${xCenter - 11}" cy="${leftY}" r="5" fill="#111111"></circle>
            <circle cx="${xCenter + 11}" cy="${rightY}" r="5" fill="#ffffff" stroke="#111111" stroke-width="1.8"></circle>
            ${renderSvgAxisLabel(xCenter, height - 30, row.name, 6)}
          `;
        })
        .join("")}
      <text x="${margin.left}" y="14" font-size="11" fill="#111111" font-weight="700">(°C)</text>
    </svg>
  `;
}

function renderPairedPrecipitationDeviationChart(rows, leftPeriod, rightPeriod, baseline) {
  const width = 420;
  const height = 274;
  const margin = { top: 24, right: 16, bottom: 70, left: 46 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const pairedRows = buildPairedDeviationRows(rows, leftPeriod.id, rightPeriod.id, "precipitation", baseline);
  const maxAbs = Math.max(...pairedRows.flatMap((row) => [Math.abs(row.leftDeviation), Math.abs(row.rightDeviation)]), 20);
  const step = pickDeviationPrecipitationStep(maxAbs);
  const axisBound = niceCeil(maxAbs, step);
  const ticks = buildSymmetricTicks(axisBound, step);
  const stepX = chartWidth / Math.max(pairedRows.length, 1);
  const barWidth = Math.min(18, stepX * 0.24);

  return `
    <svg class="svg-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(
      `${leftPeriod.label}와 ${rightPeriod.label} 강수 편차 그래프`
    )}">
      <rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" fill="#ffffff" stroke="#d7d7d7"></rect>
      ${ticks
        .map((tick) => {
          const y = scaleY(tick, -axisBound, axisBound, margin.top, margin.top + chartHeight);
          return `
            <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="${tick === 0 ? "#111111" : "#d0d0d0"}" stroke-dasharray="${tick === 0 ? "0" : "4 4"}"></line>
            <text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#555555">${formatSignedPlain(tick)}</text>
          `;
        })
        .join("")}
      ${pairedRows
        .map((row, index) => {
          const xCenter = margin.left + stepX * index + stepX / 2;
          const leftHeight = Math.abs(scaleY(row.leftDeviation, -axisBound, axisBound, margin.top, margin.top + chartHeight) - scaleY(0, -axisBound, axisBound, margin.top, margin.top + chartHeight));
          const rightHeight = Math.abs(scaleY(row.rightDeviation, -axisBound, axisBound, margin.top, margin.top + chartHeight) - scaleY(0, -axisBound, axisBound, margin.top, margin.top + chartHeight));
          const zeroY = scaleY(0, -axisBound, axisBound, margin.top, margin.top + chartHeight);
          const leftY = row.leftDeviation >= 0 ? zeroY - leftHeight : zeroY;
          const rightY = row.rightDeviation >= 0 ? zeroY - rightHeight : zeroY;
          return `
            <rect x="${xCenter - barWidth - 4}" y="${leftY}" width="${barWidth}" height="${leftHeight}" fill="#ffffff" stroke="#111111"></rect>
            <rect x="${xCenter + 4}" y="${rightY}" width="${barWidth}" height="${rightHeight}" fill="#a9a9a9" stroke="#111111"></rect>
            ${renderSvgAxisLabel(xCenter, height - 30, row.name, 6)}
          `;
        })
        .join("")}
      <text x="${margin.left}" y="14" font-size="11" fill="#111111" font-weight="700">(mm)</text>
    </svg>
  `;
}

function renderAnnualRangeChart(rows) {
  const width = 900;
  const height = 280;
  const margin = { top: 24, right: 16, bottom: 70, left: 46 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(...rows.map((row) => row.annualRange), 1);
  const step = pickTemperatureStep(maxValue);
  const yMax = niceCeil(maxValue + step / 2, step);
  const ticks = buildTicks(0, yMax, step);
  const stepX = chartWidth / Math.max(rows.length, 1);
  const barWidth = Math.min(28, stepX * 0.45);

  return `
    <svg class="svg-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="연교차 비교 그래프">
      <rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" fill="#ffffff" stroke="#d7d7d7"></rect>
      ${ticks
        .map((tick) => {
          const y = scaleY(tick, 0, yMax, margin.top, margin.top + chartHeight);
          return `
            <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="${tick === 0 ? "#111111" : "#d0d0d0"}" stroke-dasharray="${tick === 0 ? "0" : "4 4"}"></line>
            <text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#555555">${formatPlainNumber(tick)}</text>
          `;
        })
        .join("")}
      ${rows
        .map((row, index) => {
          const xCenter = margin.left + stepX * index + stepX / 2;
          const y = scaleY(row.annualRange, 0, yMax, margin.top, margin.top + chartHeight);
          const barHeight = margin.top + chartHeight - y;
          return `
            <rect x="${xCenter - barWidth / 2}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#111111"></rect>
            <text x="${xCenter}" y="${y - 8}" text-anchor="middle" font-size="11" fill="#111111">${row.annualRange.toFixed(1)}</text>
            ${renderSvgAxisLabel(xCenter, height - 30, row.region.name, 7)}
          `;
        })
        .join("")}
      <text x="${margin.left}" y="14" font-size="11" fill="#111111" font-weight="700">(°C)</text>
    </svg>
  `;
}

function comparableTrendRows(rows, baseline) {
  return baseline.mode === "region"
    ? rows.filter((row) => row.region.id !== baseline.row.region.id)
    : rows;
}

function cumulativePrecipitationValues(region) {
  return region.monthlyPrecipitationMm.reduce((accumulator, value) => {
    const previous = accumulator.length > 0 ? accumulator[accumulator.length - 1] : 0;
    accumulator.push(round(previous + value));
    return accumulator;
  }, []);
}

function monthlyTemperatureTrendReference(rows, baseline, monthIndex) {
  if (baseline.mode === "region") return baseline.row.region.monthlyTemperatureC[monthIndex];
  return average(rows.map((row) => row.region.monthlyTemperatureC[monthIndex]));
}

function cumulativePrecipitationTrendReference(rows, baseline, monthIndex) {
  if (baseline.mode === "region") return cumulativePrecipitationValues(baseline.row.region)[monthIndex];
  return average(rows.map((row) => cumulativePrecipitationValues(row.region)[monthIndex]));
}

function trendDeviationAxis(values, stepPicker, fallbackMax) {
  const maxAbs = Math.max(...values.map((value) => Math.abs(value)), fallbackMax);
  const step = stepPicker(maxAbs);
  const axisMax = Math.max(step, niceCeil(maxAbs, step));
  return {
    yMin: -axisMax,
    yMax: axisMax,
    step,
  };
}

function renderMonthlyTemperatureTrendChart(rows, baseline) {
  const width = 520;
  const height = 286;
  const margin = { top: 18, right: 38, bottom: 36, left: 46 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const stepX = chartWidth / Math.max(state.dataset.months.length - 1, 1);
  const series = comparableTrendRows(rows, baseline).map((row) => ({
    name: row.region.name,
    values: row.region.monthlyTemperatureC.map((value, monthIndex) =>
      round(value - monthlyTemperatureTrendReference(rows, baseline, monthIndex))
    ),
  }));
  const axis = trendDeviationAxis(series.flatMap((item) => item.values), pickDeviationTemperatureStep, 1);
  const ticks = buildTrendTicks(axis.yMin, axis.yMax, axis.step);
  const zeroY = scaleY(0, axis.yMin, axis.yMax, margin.top, margin.top + chartHeight);

  return `
    <svg class="svg-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="선택 지점 월 평균 기온 편차 그래프">
      <rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" fill="#ffffff" stroke="#d7d7d7"></rect>
      ${ticks
        .map((tick) => {
          const y = scaleY(tick, axis.yMin, axis.yMax, margin.top, margin.top + chartHeight);
          return `
            <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="${tick === 0 ? "#111111" : "#d0d0d0"}" stroke-dasharray="${tick === 0 ? "0" : "4 4"}"></line>
            <text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="#555555">${formatSignedPlain(tick)}</text>
          `;
        })
        .join("")}
      ${state.dataset.months
        .map((month, index) => {
          const x = margin.left + stepX * index;
          const tickY = margin.top + chartHeight;
          return `
            <line x1="${x}" y1="${tickY}" x2="${x}" y2="${tickY + 7}" stroke="#111111"></line>
            <text x="${x}" y="${height - 12}" text-anchor="middle" font-size="11" fill="#555555">${escapeHtml(month.replace("월", ""))}</text>
          `;
        })
        .join("")}
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="#111111"></line>
      <line x1="${width - margin.right}" y1="${margin.top}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="#111111"></line>
      <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="#111111"></line>
      <line x1="${margin.left}" y1="${zeroY}" x2="${width - margin.right}" y2="${zeroY}" stroke="#111111" stroke-width="1.4"></line>
      ${series
        .map((item, index) =>
          renderTrendSeriesLine(
            item,
            index,
            margin,
            stepX,
            axis.yMin,
            axis.yMax,
            margin.top + chartHeight,
            "#111111"
          )
        )
        .join("")}
      <text x="${margin.left}" y="12" font-size="11" fill="#111111" font-weight="700">(°C)</text>
    </svg>
  `;
}

function renderCumulativePrecipitationTrendChart(rows, baseline) {
  const width = 520;
  const height = 286;
  const margin = { top: 18, right: 38, bottom: 36, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const stepX = chartWidth / Math.max(state.dataset.months.length - 1, 1);
  const series = comparableTrendRows(rows, baseline).map((row) => ({
    name: row.region.name,
    values: cumulativePrecipitationValues(row.region).map((value, monthIndex) =>
      round(value - cumulativePrecipitationTrendReference(rows, baseline, monthIndex))
    ),
  }));
  const axis = trendDeviationAxis(series.flatMap((item) => item.values), pickDeviationPrecipitationStep, 20);
  const ticks = buildTrendTicks(axis.yMin, axis.yMax, axis.step);
  const zeroY = scaleY(0, axis.yMin, axis.yMax, margin.top, margin.top + chartHeight);

  return `
    <svg class="svg-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="선택 지점 누적 강수량 편차 그래프">
      <rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" fill="#ffffff" stroke="#d7d7d7"></rect>
      ${ticks
        .map((tick) => {
          const y = scaleY(tick, axis.yMin, axis.yMax, margin.top, margin.top + chartHeight);
          return `
            <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="${tick === 0 ? "#111111" : "#d0d0d0"}" stroke-dasharray="${tick === 0 ? "0" : "4 4"}"></line>
            <text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="#555555">${formatSignedPlain(tick)}</text>
          `;
        })
        .join("")}
      ${state.dataset.months
        .map((month, index) => {
          const x = margin.left + stepX * index;
          const tickY = margin.top + chartHeight;
          return `
            <line x1="${x}" y1="${tickY}" x2="${x}" y2="${tickY + 7}" stroke="#111111"></line>
            <text x="${x}" y="${height - 12}" text-anchor="middle" font-size="11" fill="#555555">${escapeHtml(month.replace("월", ""))}</text>
          `;
        })
        .join("")}
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="#111111"></line>
      <line x1="${width - margin.right}" y1="${margin.top}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="#111111"></line>
      <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="#111111"></line>
      <line x1="${margin.left}" y1="${zeroY}" x2="${width - margin.right}" y2="${zeroY}" stroke="#111111" stroke-width="1.4"></line>
      ${series
        .map((item, index) =>
          renderTrendSeriesLine(item, index, margin, stepX, axis.yMin, axis.yMax, margin.top + chartHeight, "#555555")
        )
        .join("")}
      <text x="${margin.left}" y="12" font-size="11" fill="#555555" font-weight="700">(mm)</text>
    </svg>
  `;
}

function renderMonthlyTemperatureActualTrendChart(
  rows,
  monthIndexes = state.dataset.months.map((_, index) => index),
  valueAccessor = (row, monthIndex) => row.region.monthlyTemperatureC[monthIndex],
  options = {}
) {
  const width = 520;
  const height = 286;
  const margin = { top: 18, right: 38, bottom: 36, left: 46 };
  const horizontalPadding = Number.isFinite(options.horizontalPadding) ? options.horizontalPadding : 18;
  const pointPadding = Number.isFinite(options.pointPadding) ? options.pointPadding : 0;
  const showLine = options.showLine !== false;
  const plotLeft = margin.left + horizontalPadding;
  const plotRight = width - margin.right - horizontalPadding;
  const chartWidth = plotRight - plotLeft;
  const chartHeight = height - margin.top - margin.bottom;
  const monthLabels = monthIndexes.map((index) => state.dataset.months[index].replace("월", ""));
  const pointRangeWidth = Math.max(chartWidth - pointPadding * 2, 0);
  const stepX = pointRangeWidth / Math.max(monthLabels.length - 1, 1);
  const pointPlotLeft = plotLeft + pointPadding;
  const series = rows.map((row) => ({
    name: row.region.name,
    values: monthIndexes.map((monthIndex) => valueAccessor(row, monthIndex)),
  }));
  const values = series.flatMap((item) => item.values);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = Math.max(maximum - minimum, 1);
  const step = pickTemperatureStep(span);
  const yMin = niceFloor(minimum - step, step);
  const yMax = niceCeil(maximum + step, step);
  const ticks = buildTrendTicks(yMin, yMax, step);

  return `
    <svg class="svg-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="선택 지점 월별 평균 기온 그래프">
      <rect x="${plotLeft}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" fill="#ffffff" stroke="#d7d7d7"></rect>
      ${ticks
        .map((tick) => {
          const y = scaleY(tick, yMin, yMax, margin.top, margin.top + chartHeight);
          return `
            <line x1="${plotLeft}" y1="${y}" x2="${plotRight}" y2="${y}" stroke="${tick === 0 ? "#111111" : "#d0d0d0"}" stroke-dasharray="${tick === 0 ? "0" : "4 4"}"></line>
            <text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="#555555">${formatPlainNumber(tick)}</text>
          `;
        })
        .join("")}
      ${monthLabels
        .map((month, index) => {
          const x = pointPlotLeft + stepX * index;
          const tickY = margin.top + chartHeight;
          return `
            <line x1="${x}" y1="${tickY}" x2="${x}" y2="${tickY + 7}" stroke="#111111"></line>
            <text x="${x}" y="${height - 12}" text-anchor="middle" font-size="11" fill="#555555">${escapeHtml(month)}</text>
          `;
        })
        .join("")}
      <line x1="${plotLeft}" y1="${margin.top}" x2="${plotLeft}" y2="${margin.top + chartHeight}" stroke="#111111"></line>
      <line x1="${plotRight}" y1="${margin.top}" x2="${plotRight}" y2="${margin.top + chartHeight}" stroke="#111111"></line>
      <line x1="${plotLeft}" y1="${margin.top + chartHeight}" x2="${plotRight}" y2="${margin.top + chartHeight}" stroke="#111111"></line>
      ${series
        .map((item, seriesIndex) => {
          const style = COMPARISON_LINE_STYLES[seriesIndex % COMPARISON_LINE_STYLES.length];
          const points = item.values.map((value, pointIndex) => {
            const x = pointPlotLeft + stepX * pointIndex;
            const y = scaleY(value, yMin, yMax, margin.top, margin.top + chartHeight);
            return { x, y };
          });
          return `
            ${showLine ? `<polyline fill="none" stroke="#111111" stroke-width="2" stroke-dasharray="${style.dasharray}" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>` : ""}
            ${points.map((point) => renderTrendMarker(point.x, point.y, style.marker, "#111111")).join("")}
          `;
        })
        .join("")}
      <text x="${margin.left}" y="12" font-size="11" fill="#111111" font-weight="700">(°C)</text>
    </svg>
  `;
}

function renderCumulativePrecipitationActualTrendChart(
  rows,
  monthIndexes = state.dataset.months.map((_, index) => index),
  valueAccessor = (row, monthIndex) => cumulativePrecipitationValues(row.region)[monthIndex],
  options = {}
) {
  const width = 520;
  const height = 286;
  const margin = { top: 18, right: 38, bottom: 36, left: 50 };
  const horizontalPadding = Number.isFinite(options.horizontalPadding) ? options.horizontalPadding : 18;
  const pointPadding = Number.isFinite(options.pointPadding) ? options.pointPadding : 0;
  const showLine = options.showLine !== false;
  const plotLeft = margin.left + horizontalPadding;
  const plotRight = width - margin.right - horizontalPadding;
  const chartWidth = plotRight - plotLeft;
  const chartHeight = height - margin.top - margin.bottom;
  const monthLabels = monthIndexes.map((index) => state.dataset.months[index].replace("월", ""));
  const pointRangeWidth = Math.max(chartWidth - pointPadding * 2, 0);
  const stepX = pointRangeWidth / Math.max(monthLabels.length - 1, 1);
  const pointPlotLeft = plotLeft + pointPadding;
  const series = rows.map((row) => ({
    name: row.region.name,
    values: monthIndexes.map((monthIndex) => valueAccessor(row, monthIndex)),
  }));
  const values = series.flatMap((item) => item.values);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const step = pickPrecipitationStep(Math.max(maximum, 1));
  const yMin = Math.min(0, niceFloor(minimum - step, step));
  const yMax = niceCeil(maximum + step, step);
  const ticks = buildTrendTicks(yMin, yMax, step);

  return `
    <svg class="svg-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="선택 지점 월별 누적 강수량 그래프">
      <rect x="${plotLeft}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" fill="#ffffff" stroke="#d7d7d7"></rect>
      ${ticks
        .map((tick) => {
          const y = scaleY(tick, yMin, yMax, margin.top, margin.top + chartHeight);
          return `
            <line x1="${plotLeft}" y1="${y}" x2="${plotRight}" y2="${y}" stroke="${tick === 0 ? "#111111" : "#d0d0d0"}" stroke-dasharray="${tick === 0 ? "0" : "4 4"}"></line>
            <text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="#555555">${formatPlainNumber(tick)}</text>
          `;
        })
        .join("")}
      ${monthLabels
        .map((month, index) => {
          const x = pointPlotLeft + stepX * index;
          const tickY = margin.top + chartHeight;
          return `
            <line x1="${x}" y1="${tickY}" x2="${x}" y2="${tickY + 7}" stroke="#111111"></line>
            <text x="${x}" y="${height - 12}" text-anchor="middle" font-size="11" fill="#555555">${escapeHtml(month)}</text>
          `;
        })
        .join("")}
      <line x1="${plotLeft}" y1="${margin.top}" x2="${plotLeft}" y2="${margin.top + chartHeight}" stroke="#111111"></line>
      <line x1="${plotRight}" y1="${margin.top}" x2="${plotRight}" y2="${margin.top + chartHeight}" stroke="#111111"></line>
      <line x1="${plotLeft}" y1="${margin.top + chartHeight}" x2="${plotRight}" y2="${margin.top + chartHeight}" stroke="#111111"></line>
      ${series
        .map((item, seriesIndex) => {
          const style = COMPARISON_LINE_STYLES[seriesIndex % COMPARISON_LINE_STYLES.length];
          const points = item.values.map((value, pointIndex) => {
            const x = pointPlotLeft + stepX * pointIndex;
            const y = scaleY(value, yMin, yMax, margin.top, margin.top + chartHeight);
            return { x, y };
          });
          return `
            ${showLine ? `<polyline fill="none" stroke="#555555" stroke-width="2" stroke-dasharray="${style.dasharray}" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>` : ""}
            ${points.map((point) => renderTrendMarker(point.x, point.y, style.marker, "#555555")).join("")}
          `;
        })
        .join("")}
      <text x="${margin.left}" y="12" font-size="11" fill="#555555" font-weight="700">(mm)</text>
    </svg>
  `;
}

function buildPairedDeviationRows(rows, leftPeriodId, rightPeriodId, key, baseline) {
  const comparableRows =
    baseline.mode === "region"
      ? rows.filter((row) => row.region.id !== baseline.row.region.id)
      : rows;
  const leftReference =
    baseline.mode === "region"
      ? baseline.row.metrics[leftPeriodId][key]
      : average(rows.map((row) => row.metrics[leftPeriodId][key]));
  const rightReference =
    baseline.mode === "region"
      ? baseline.row.metrics[rightPeriodId][key]
      : average(rows.map((row) => row.metrics[rightPeriodId][key]));
  return comparableRows.map((row) => ({
    name: row.region.name,
    leftDeviation: round(row.metrics[leftPeriodId][key] - leftReference),
    rightDeviation: round(row.metrics[rightPeriodId][key] - rightReference),
  }));
}

function renderTrendLegend(rows, strokeColor = "#111111") {
  return `
    <div class="series-legend">
      ${rows
        .map(
          (row, index) => `
            <span class="series-legend-item">
              ${renderTrendLegendSwatch(index, strokeColor)}
              <span>${escapeHtml(row.name || row.region?.name || "")}</span>
            </span>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTrendLegendSwatch(seriesIndex, strokeColor) {
  const style = COMPARISON_LINE_STYLES[seriesIndex % COMPARISON_LINE_STYLES.length];
  const dasharray = style.dasharray ? `stroke-dasharray="${style.dasharray}"` : "";
  return `
    <svg class="series-swatch-line" viewBox="0 0 30 12" aria-hidden="true">
      <line x1="2" y1="6" x2="28" y2="6" stroke="${strokeColor}" stroke-width="1.8" ${dasharray}></line>
      ${renderTrendMarker(15, 6, style.marker, strokeColor)}
    </svg>
  `;
}

function renderTrendSeriesLine(series, seriesIndex, margin, stepX, yMin, yMax, chartBottom, strokeColor) {
  const style = COMPARISON_LINE_STYLES[seriesIndex % COMPARISON_LINE_STYLES.length];
  const points = series.values
    .map((value, monthIndex) => {
      const x = margin.left + stepX * monthIndex;
      const y = scaleY(value, yMin, yMax, margin.top, chartBottom);
      return { x, y };
    });
  return `
    <polyline fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="${style.dasharray}" points="${points
      .map((point) => `${point.x},${point.y}`)
      .join(" ")}"></polyline>
    ${points.map((point) => renderTrendMarker(point.x, point.y, style.marker, strokeColor)).join("")}
  `;
}

function renderTrendMarker(x, y, marker, strokeColor) {
  if (marker === "square") {
    return `<rect x="${x - 3.8}" y="${y - 3.8}" width="7.6" height="7.6" fill="#ffffff" stroke="${strokeColor}" stroke-width="1.4"></rect>`;
  }

  if (marker === "triangle") {
    return `<path d="M ${x} ${y - 4.8} L ${x + 4.8} ${y + 3.9} L ${x - 4.8} ${y + 3.9} Z" fill="${strokeColor}"></path>`;
  }

  if (marker === "diamond") {
    return `<path d="M ${x} ${y - 4.8} L ${x + 4.8} ${y} L ${x} ${y + 4.8} L ${x - 4.8} ${y} Z" fill="#ffffff" stroke="${strokeColor}" stroke-width="1.4"></path>`;
  }

  return `<circle cx="${x}" cy="${y}" r="3.9" fill="${strokeColor}" stroke="#ffffff" stroke-width="1.4"></circle>`;
}

function renderSeriesLegend(items) {
  return `
    <div class="series-legend">
      ${items
        .map(
          (item) => `
            <span class="series-legend-item">
              <span class="series-swatch ${item.style}"></span>
              <span>${escapeHtml(item.label)}</span>
            </span>
          `
        )
        .join("")}
    </div>
  `;
}

function buildTicks(minValue, maxValue, step) {
  const ticks = [];
  for (let value = minValue; value <= maxValue + 0.0001; value += step) {
    ticks.push(round(value));
  }
  return ticks;
}

function buildSymmetricTicks(maxValue, step) {
  const ticks = [];
  for (let value = maxValue; value >= -maxValue; value -= step) {
    ticks.push(round(value));
  }
  return ticks;
}

function buildTrendTicks(minValue, maxValue, step) {
  const ticks = [];
  for (let value = minValue; value <= maxValue + 0.0001; value += step) {
    ticks.push(round(value));
  }
  return ticks;
}

function niceCeil(value, step) {
  return Math.ceil(value / step) * step;
}

function niceFloor(value, step) {
  return Math.floor(value / step) * step;
}

function pickPrecipitationStep(maxValue) {
  if (maxValue <= 120) return 20;
  if (maxValue <= 300) return 50;
  if (maxValue <= 700) return 100;
  return 200;
}

function pickCumulativePrecipitationStep(maxValue) {
  if (maxValue <= 300) return 50;
  if (maxValue <= 700) return 100;
  if (maxValue <= 1400) return 250;
  return 500;
}

function pickTemperatureStep(span) {
  if (span <= 8) return 2;
  if (span <= 20) return 5;
  return 10;
}

function pickDeviationTemperatureStep(maxAbs) {
  if (maxAbs <= 3) return 1;
  if (maxAbs <= 8) return 2;
  return 5;
}

function pickDeviationPrecipitationStep(maxAbs) {
  if (maxAbs <= 80) return 20;
  if (maxAbs <= 200) return 50;
  return 100;
}

function splitLabelLines(label, maxCharsPerLine = 7, maxLines = 2) {
  const normalized = String(label ?? "").trim();
  if (!normalized) {
    return [""];
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const lines = [];

  if (words.length > 1) {
    let current = "";
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxCharsPerLine || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    });
    if (current) {
      lines.push(current);
    }
  } else {
    for (let index = 0; index < normalized.length; index += maxCharsPerLine) {
      lines.push(normalized.slice(index, index + maxCharsPerLine));
    }
  }

  if (lines.length > maxLines) {
    const clipped = lines.slice(0, maxLines);
    const lastLine = clipped[maxLines - 1];
    clipped[maxLines - 1] =
      lastLine.length >= maxCharsPerLine ? `${lastLine.slice(0, maxCharsPerLine - 1)}…` : `${lastLine}…`;
    return clipped;
  }

  return lines;
}

function renderSvgAxisLabel(x, y, label, maxCharsPerLine = 7) {
  const lines = splitLabelLines(label, maxCharsPerLine, 2);
  return `
    <text x="${x}" y="${y}" text-anchor="middle" font-size="11" fill="#111111">
      ${lines
        .map(
          (line, index) => `
            <tspan x="${x}" dy="${index === 0 ? 0 : 12}">${escapeHtml(line)}</tspan>
          `
        )
        .join("")}
    </text>
  `;
}

function scaleY(value, minValue, maxValue, top, bottom) {
  if (maxValue === minValue) {
    return (top + bottom) / 2;
  }
  const ratio = (value - minValue) / (maxValue - minValue);
  return bottom - ratio * (bottom - top);
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

function renderEmptyState(title, description) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}

function formatTemp(value) {
  return `${numberFormatter.format(round(value))}°C`;
}

function formatMm(value) {
  return `${numberFormatter.format(round(value))} mm`;
}

function formatDays(value) {
  return `${value.toFixed(1)}일`;
}

function formatMeters(value) {
  return `${Math.round(value).toLocaleString("ko-KR")} m`;
}

function formatCoordinatePair(location) {
  return `${formatLatitude(location.latitude)} · ${formatLongitude(location.longitude)}`;
}

function formatLatitude(value) {
  return `${value >= 0 ? "북위" : "남위"} ${coordinateFormatter.format(Math.abs(value))}°`;
}

function formatLongitude(value) {
  return `${value >= 0 ? "동경" : "서경"} ${coordinateFormatter.format(Math.abs(value))}°`;
}

function formatPlainNumber(value) {
  return numberFormatter.format(round(value));
}

function formatSignedPlain(value) {
  const rounded = round(value);
  return `${rounded > 0 ? "+" : ""}${numberFormatter.format(rounded)}`;
}

function renderFootnoteLines(lines, className = "formula-note") {
  const visibleLines = lines.filter(Boolean);
  return `<p class="${className}">${visibleLines
    .map((line, index) => `${index > 0 ? "<br />" : ""}${"*".repeat(index + 1)} ${escapeHtml(line)}`)
    .join("")}</p>`;
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

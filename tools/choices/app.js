const patterns = Array.isArray(window.EXAM_CHOICE_PATTERNS) ? window.EXAM_CHOICE_PATTERNS : [];

const UNIT_LABELS = {
  all: "전체",
  landform: "지형",
  religion: "종교·문화",
  population: "인구·이주",
  urban: "도시·도시화",
  resources: "자원·산업",
  regional: "지역지리",
};

const AUTOMATION_LABELS = {
  all: "전체",
  static: "불변 지식",
  derived: "자료 계산",
  yearly: "연도·출처 필수",
  "context-only": "제시 자료 전용",
};

const state = {
  query: "",
  unit: "all",
  automation: "all",
  selectedIds: [],
};

const searchInput = document.querySelector("#searchInput");
const unitFilters = document.querySelector("#unitFilters");
const automationFilters = document.querySelector("#automationFilters");
const patternGrid = document.querySelector("#patternGrid");
const emptyState = document.querySelector("#emptyState");
const totalCount = document.querySelector("#totalCount");
const resultCount = document.querySelector("#resultCount");
const selectionCount = document.querySelector("#selectionCount");
const resultSummary = document.querySelector("#resultSummary");
const selectionList = document.querySelector("#selectionList");
const copySelectionButton = document.querySelector("#copySelectionButton");
const copyStatus = document.querySelector("#copyStatus");

renderFilters();
bindEvents();
render();

function bindEvents() {
  searchInput.addEventListener("input", () => {
    state.query = normalizeText(searchInput.value);
    render();
  });

  document.querySelector("#resetFiltersButton").addEventListener("click", () => {
    state.query = "";
    state.unit = "all";
    state.automation = "all";
    searchInput.value = "";
    renderFilters();
    render();
  });

  document.querySelector("#clearSelectionButton").addEventListener("click", () => {
    state.selectedIds = [];
    copyStatus.textContent = "조합 선택을 모두 지움.";
    render();
  });

  unitFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-unit]");
    if (!button) return;
    state.unit = button.dataset.unit;
    syncFilterButtons();
    render();
  });

  automationFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-automation]");
    if (!button) return;
    state.automation = button.dataset.automation;
    syncFilterButtons();
    render();
  });

  patternGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-select-pattern]");
    if (!button) return;
    togglePatternSelection(button.dataset.selectPattern);
  });

  selectionList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-pattern]");
    if (!button) return;
    const removedPattern = patterns.find((pattern) => pattern.id === button.dataset.removePattern);
    state.selectedIds = state.selectedIds.filter((id) => id !== button.dataset.removePattern);
    copyStatus.textContent = removedPattern ? `‘${removedPattern.title}’ 패턴을 조합에서 뺌.` : "선택 항목을 조합에서 뺌.";
    render();
  });

  copySelectionButton.addEventListener("click", copySelection);
}

function renderFilters() {
  unitFilters.innerHTML = Object.entries(UNIT_LABELS)
    .map(([value, label]) => renderFilterButton("unit", value, label, state.unit === value))
    .join("");
  automationFilters.innerHTML = Object.entries(AUTOMATION_LABELS)
    .map(([value, label]) => renderFilterButton("automation", value, label, state.automation === value))
    .join("");
}

function syncFilterButtons() {
  unitFilters.querySelectorAll("[data-unit]").forEach((button) => {
    const active = button.dataset.unit === state.unit;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  automationFilters.querySelectorAll("[data-automation]").forEach((button) => {
    const active = button.dataset.automation === state.automation;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderFilterButton(kind, value, label, active) {
  const count = value === "all" ? patterns.length : patterns.filter((pattern) => pattern[kind] === value).length;
  return `<button class="choice-filter-button ${active ? "is-active" : ""}" type="button" data-${kind}="${escapeHtml(value)}" aria-pressed="${active}">${escapeHtml(label)} ${count}</button>`;
}

function render({ focusPatternId = "" } = {}) {
  const filteredPatterns = getFilteredPatterns();
  totalCount.textContent = `${patterns.length}개`;
  resultCount.textContent = `${filteredPatterns.length}개`;
  selectionCount.textContent = `${state.selectedIds.length} / 5`;
  resultSummary.textContent = `${UNIT_LABELS[state.unit]} · ${AUTOMATION_LABELS[state.automation]} · ${filteredPatterns.length}개`;
  patternGrid.innerHTML = filteredPatterns.map(renderPatternCard).join("");
  emptyState.hidden = filteredPatterns.length > 0;
  renderSelection();
  if (focusPatternId) {
    window.requestAnimationFrame(() => {
      patternGrid.querySelector(`[data-select-pattern="${focusPatternId}"]`)?.focus();
    });
  }
}

function getFilteredPatterns() {
  return patterns.filter((pattern) => {
    if (state.unit !== "all" && pattern.unit !== state.unit) return false;
    if (state.automation !== "all" && pattern.automation !== state.automation) return false;
    if (!state.query) return true;
    const queryTokens = state.query.split(/\s+/u).filter(Boolean);
    const sourceConstraintTokens = queryTokens.filter(
      (token) => /^20\d{2}(?:학년도)?$/u.test(token) || /^(?:6월|9월|수능)$/u.test(token)
    );
    const hasSourceYear = sourceConstraintTokens.some((token) => /^20\d{2}/u.test(token));
    const hasAdministration = sourceConstraintTokens.some((token) => /^(?:6월|9월|수능)$/u.test(token));
    if (
      hasSourceYear &&
      hasAdministration &&
      !(pattern.sources ?? []).some((source) => {
        const normalizedSource = normalizeText(source);
        return sourceConstraintTokens.every((token) => normalizedSource.includes(token));
      })
    ) {
      return false;
    }
    const haystack = normalizeText([
      pattern.id,
      pattern.title,
      pattern.template,
      pattern.rule,
      pattern.trap,
      ...(pattern.tags ?? []),
      ...(pattern.sources ?? []),
    ].join(" "));
    return queryTokens.every((token) => haystack.includes(token));
  });
}

function renderPatternCard(pattern) {
  const selected = state.selectedIds.includes(pattern.id);
  const selectionLimitReached = state.selectedIds.length >= 5 && !selected;
  return `
    <article class="choice-card ${selected ? "is-selected" : ""}">
      <div class="choice-card-head">
        <div>
          <span class="choice-card-id">${escapeHtml(pattern.id)}</span>
          <h3 class="choice-card-title">${escapeHtml(pattern.title)}</h3>
        </div>
        <div class="choice-card-badges">
          <span class="choice-badge">${escapeHtml(UNIT_LABELS[pattern.unit] ?? pattern.unit)}</span>
          <span class="choice-badge is-automation">${escapeHtml(AUTOMATION_LABELS[pattern.automation] ?? pattern.automation)}</span>
        </div>
      </div>
      <p class="choice-template">${escapeHtml(pattern.template)}</p>
      <dl class="choice-card-detail">
        <dt>판정</dt><dd>${escapeHtml(pattern.rule)}</dd>
        <dt>함정</dt><dd>${escapeHtml(pattern.trap)}</dd>
      </dl>
      <div class="choice-card-sources">
        ${(pattern.sources ?? []).map((source) => `<span>${escapeHtml(source)}</span>`).join("")}
      </div>
      <button class="tw-button choice-select-button" type="button" data-select-pattern="${escapeHtml(pattern.id)}" aria-pressed="${selected}" ${selectionLimitReached ? "disabled" : ""}>${selected ? "조합에서 빼기" : selectionLimitReached ? "5개 선택 완료" : "조합에 추가"}</button>
    </article>
  `;
}

function togglePatternSelection(id) {
  const pattern = patterns.find((candidate) => candidate.id === id);
  if (state.selectedIds.includes(id)) {
    state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id);
    copyStatus.textContent = pattern ? `‘${pattern.title}’ 패턴을 조합에서 뺌.` : "패턴을 조합에서 뺌.";
  } else if (state.selectedIds.length < 5) {
    state.selectedIds = [...state.selectedIds, id];
    copyStatus.textContent = pattern ? `‘${pattern.title}’ 패턴을 조합에 추가함.` : "패턴을 조합에 추가함.";
  } else {
    copyStatus.textContent = "5개까지 선택 가능함.";
  }
  render({ focusPatternId: id });
}

function renderSelection() {
  const selectedPatterns = state.selectedIds
    .map((id) => patterns.find((pattern) => pattern.id === id))
    .filter(Boolean);
  selectionList.innerHTML = selectedPatterns.length
    ? selectedPatterns
        .map(
          (pattern, index) => `
            <li>
              <span>${String(index + 1).padStart(2, "0")}</span>
              <p><strong>${escapeHtml(pattern.id)}</strong><br />${escapeHtml(pattern.template)}</p>
              <button class="choice-remove-button" type="button" data-remove-pattern="${escapeHtml(pattern.id)}" aria-label="${escapeHtml(pattern.id)} 제거">×</button>
            </li>
          `
        )
        .join("")
    : "<li><span>—</span><p>라이브러리에서 패턴을 선택하면 여기에 쌓임.</p></li>";
  copySelectionButton.disabled = selectedPatterns.length === 0;
}

async function copySelection() {
  const selectedPatterns = state.selectedIds
    .map((id) => patterns.find((pattern) => pattern.id === id))
    .filter(Boolean);
  if (selectedPatterns.length === 0) return;

  const text = selectedPatterns
    .map(
      (pattern, index) =>
        `${index + 1}. [${pattern.id}] ${pattern.title}\n판정 방식: ${AUTOMATION_LABELS[pattern.automation] ?? pattern.automation}\n템플릿: ${pattern.template}\n판정: ${pattern.rule}\n함정: ${pattern.trap}\n근거 회차: ${(pattern.sources ?? []).join(", ")}\n주의: 최종 출제 전 원문 대조 필요`
    )
    .join("\n\n");

  try {
    await navigator.clipboard.writeText(text);
    copyStatus.textContent = `${selectedPatterns.length}개 패턴을 복사함.`;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.append(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    } finally {
      textarea.remove();
    }
    copyStatus.textContent = copied
      ? `${selectedPatterns.length}개 패턴을 복사함.`
      : "자동 복사에 실패함. 브라우저의 클립보드 권한을 확인해야 함.";
  }
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFKC").trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

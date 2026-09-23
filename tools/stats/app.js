(() => {
  "use strict";

  const elements = {};
  const tableState = new Map();
  let data = null;
  let query = "";
  let toastTimer = null;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    for (const id of ["statsSearch", "resultCount", "unitList", "unitSelect", "statsContent", "statsToast"]) {
      elements[id] = document.getElementById(id);
    }
    bindEvents();
    try {
      const response = await fetch("./data/textbook-stats.json");
      if (!response.ok) throw new Error("HTTP " + response.status);
      data = await response.json();
      render();
    } catch (error) {
      elements.statsContent.innerHTML = '<p class="stats-empty">통계표를 불러오지 못했습니다</p>';
      console.error("Statistics data load failed", error);
    }
  }

  function bindEvents() {
    document.querySelector(".stats-subject").addEventListener("click", (event) => {
      const link = event.target.closest("[data-subject]");
      if (!link) return;
      event.preventDefault();
      updateUrl({ subject: link.dataset.subject, unit: null });
    });
    document.querySelector(".stats-set").addEventListener("click", (event) => {
      const link = event.target.closest("[data-set]");
      if (!link) return;
      event.preventDefault();
      updateUrl({ set: link.dataset.set === "textbook" ? "textbook" : null });
    });
    elements.unitList.addEventListener("click", (event) => {
      const link = event.target.closest("[data-unit]");
      if (!link) return;
      event.preventDefault();
      updateUrl({ unit: link.dataset.unit });
    });
    elements.unitSelect.addEventListener("change", () => updateUrl({ unit: elements.unitSelect.value }));
    elements.statsSearch.addEventListener("input", () => {
      query = normalize(elements.statsSearch.value);
      render();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "/" || event.altKey || event.ctrlKey || event.metaKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable) return;
      event.preventDefault();
      elements.statsSearch.focus();
    });
    elements.statsContent.addEventListener("click", async (event) => {
      const sort = event.target.closest("[data-sort]");
      if (sort) {
        const id = sort.dataset.table;
        const state = tableState.get(id) || { column: null, direction: null, variant: 0 };
        const column = Number(sort.dataset.sort);
        if (state.column !== column || state.direction === null) {
          state.column = column;
          state.direction = "desc";
        } else if (state.direction === "desc") {
          state.direction = "asc";
        } else {
          state.column = null;
          state.direction = null;
        }
        tableState.set(id, state);
        renderContent();
        return;
      }
      const variant = event.target.closest("[data-variant]");
      if (variant) {
        const id = variant.dataset.table;
        const state = tableState.get(id) || { column: null, direction: null, variant: 0 };
        state.variant = Number(variant.dataset.variant);
        state.column = null;
        state.direction = null;
        tableState.set(id, state);
        renderContent();
        return;
      }
      const copy = event.target.closest("[data-copy]");
      if (copy) {
        const found = findTable(copy.dataset.copy);
        if (!found) return;
        const state = tableState.get(found.id) || { column: null, direction: null, variant: 0 };
        const rows = getSortedRows(found.variants?.[state.variant]?.rows || found.rows, state);
        const lines = [
          [found.rowLabel, ...found.columns.map((column) => column.label)].join("\t"),
          ...rows.map((row) => [row.label, ...row.values].map((value) => String(value ?? "")).join("\t")),
        ];
        try {
          await navigator.clipboard.writeText(lines.join("\n"));
          showToast("복사했습니다.");
        } catch (error) {
          console.error("Statistics clipboard write failed", error);
          showToast("복사하지 못했습니다");
        }
      }
    });
    window.addEventListener("popstate", render);
  }

  function readState() {
    const params = new URLSearchParams(location.search);
    const subject = params.get("subject") === "world" ? "world" : "korea";
    const units = data?.subjects?.[subject]?.units || [];
    const preferred = units.find((unit) => unit.chapters.some((chapter) => chapter.tables.length)) || units[0];
    const unit = units.find((item) => item.id === params.get("unit")) || preferred;
    return { subject, unit, set: params.get("set") === "textbook" ? "textbook" : "all" };
  }
  function updateUrl(changes) {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    history.pushState(null, "", url);
    render();
  }
  function render() {
    if (!data) return;
    const state = readState();
    document.querySelectorAll(".stats-subject [data-subject]").forEach((link) => {
      const active = link.dataset.subject === state.subject;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.querySelectorAll(".stats-set [data-set]").forEach((link) => {
      const active = link.dataset.set === state.set;
      link.classList.toggle("is-active", active);
      link.setAttribute("aria-pressed", String(active));
      const url = new URL(location.href);
      if (link.dataset.set === "textbook") url.searchParams.set("set", "textbook");
      else url.searchParams.delete("set");
      link.href = url.search;
    });
    renderUnits(state);
    renderContent(state);
  }
  function renderUnits(state) {
    const units = data.subjects[state.subject].units;
    elements.unitList.innerHTML = units.map((unit) => {
      const count = unit.chapters.reduce((sum, chapter) =>
        sum + chapter.tables.filter((table) => state.set === "all" || !table.extra).length, 0);
      const selected = unit.id === state.unit.id;
      return '<a class="stats-unit-link' + (selected ? ' is-active' : '') +
        '" href="?subject=' + state.subject + '&unit=' + unit.id +
        '" data-unit="' + unit.id + '"' + (selected ? ' aria-current="page"' : '') +
        '><span>' + escapeHtml(unit.id + " " + unit.title) + '</span><span class="stats-unit-count">' +
        (unit.climate ? "" : count) + '</span></a>';
    }).join("");
    elements.unitSelect.innerHTML = units.map((unit) =>
      '<option value="' + unit.id + '"' + (unit.id === state.unit.id ? " selected" : "") + '>' +
      escapeHtml(unit.id + " " + unit.title) + '</option>').join("");
  }
  function renderContent(state = readState()) {
    if (!data) return;
    let count = 0;
    if (state.unit.climate) {
      const href = state.subject === "korea" ? "../climate/korea.html" : "../climate/index.html";
      elements.statsContent.innerHTML = '<a class="stats-climate-link" href="' + href + '">Climate Atlas에서 보기</a>';
      elements.resultCount.textContent = "";
      return;
    }
    const chapters = state.unit.chapters.map((chapter) => {
      const tables = chapter.tables.filter((table) => state.set === "all" || !table.extra)
        .filter((table) => matchesTable(table));
      count += tables.length;
      if (!tables.length) return "";
      return '<section class="stats-chapter"><h2 class="stats-chapter-heading"><span class="stats-chapter-no">' +
        escapeHtml(chapter.no) + '</span>' + escapeHtml(chapter.title) + '</h2>' +
        tables.map(renderTable).join("") + '</section>';
    }).join("");
    elements.statsContent.innerHTML = chapters || '<p class="stats-empty">검색 결과가 없습니다</p>';
    elements.resultCount.textContent = count + "표";
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    }
  }
  function matchesTable(table) {
    if (!query) return true;
    if (normalize(table.title).includes(query)) return true;
    const rows = table.variants ? table.variants.flatMap((variant) => variant.rows) : table.rows;
    return rows.some((item) => normalize(item.label).includes(query));
  }
  function renderTable(table) {
    const state = tableState.get(table.id) || { column: null, direction: null, variant: 0 };
    const variants = table.variants || null;
    if (variants && state.variant >= variants.length) state.variant = 0;
    const rows = getSortedRows(variants?.[state.variant]?.rows || table.rows, state);
    const max = table.columns.map((_, index) =>
      Math.max(...rows.map((item) => Number(item.values[index])).filter(Number.isFinite)));
    const titleMatch = query && normalize(table.title).includes(query);
    const variantMarkup = variants ? '<nav class="tw-segmented stats-variants" aria-label="' + escapeHtml(table.title) + ' 전환">' +
      variants.map((variant, index) => '<button type="button" data-table="' + table.id +
        '" data-variant="' + index + '" aria-pressed="' + (state.variant === index) +
        '" class="' + (state.variant === index ? "is-active" : "") + '">' + escapeHtml(variant.label) + '</button>').join("") + '</nav>' : "";
    return '<section class="stats-table-section" id="' + escapeHtml(table.id) + '">' +
      '<div class="stats-table-top"><h3 class="stats-table-title"><a href="#' + escapeHtml(table.id) + '">' +
      escapeHtml(table.title) + '</a>' + (table.extra ? '<span class="tw-badge stats-extra-badge">추가</span>' : "") +
      '</h3><button class="tw-button is-ghost is-sm stats-copy" type="button" data-copy="' +
      escapeHtml(table.id) + '">복사</button></div>' +
      '<div class="tw-meta-list stats-table-meta"><span>' + escapeHtml(table.unit) +
      '</span><span>' + escapeHtml(table.year) + '</span>' +
      (table.source.url ? '<a href="' + escapeHtml(table.source.url) +
        '" target="_blank" rel="noopener noreferrer">' + escapeHtml(table.source.name) + '</a>' :
        '<span>' + escapeHtml(table.source.name) + '</span>') + '</div>' +
      variantMarkup +
      '<div class="tw-table-wrap stats-table-wrap"><table class="tw-table stats-table"><thead><tr>' +
      [{ label: table.rowLabel }, ...table.columns].map((column, index) => {
        const active = state.column === index;
        const sort = active ? (state.direction === "desc" ? "descending" : "ascending") : "none";
        return '<th scope="col" aria-sort="' + sort + '"><button class="stats-sort" type="button" data-table="' +
          escapeHtml(table.id) + '" data-sort="' + index + '">' + escapeHtml(column.label) +
          (active ? '<span class="stats-sort-symbol" aria-hidden="true">' + (state.direction === "desc" ? "↓" : "↑") + '</span>' : "") +
          (column.year ? '<span class="stats-col-year">' + escapeHtml(column.year) + '</span>' : "") +
          '</button></th>';
      }).join("") + '</tr></thead><tbody>' + rows.map((item, rowIndex) => {
        const matched = query && !titleMatch && normalize(item.label).includes(query);
        const previousGroup = rowIndex ? rows[rowIndex - 1].group : null;
        const classes = [matched ? "is-match" : "", item.group === "continent" ? "is-continent" : "",
          item.group === "country" && previousGroup === "continent" ? "is-country-start" : ""].filter(Boolean).join(" ");
        return '<tr class="' + classes + '"><th scope="row">' + escapeHtml(item.label) + '</th>' +
          item.values.map((value, index) => {
            const numeric = typeof value === "number" && Number.isFinite(value);
            return '<td class="' + (numeric ? "is-number " : "") + (numeric && value === max[index] ? "is-max" : "") +
              '">' + escapeHtml(formatValue(value)) + '</td>';
          }).join("") + '</tr>';
      }).join("") + '</tbody></table></div>' +
      (table.note ? '<p class="stats-note">' + escapeHtml(table.note) + '</p>' : "") + '</section>';
  }
  function getSortedRows(rows, state) {
    if (state.column === null || !state.direction) return [...rows];
    const index = state.column;
    const compareRows = (a, b) => {
      const left = index === 0 ? a.label : a.values[index - 1];
      const right = index === 0 ? b.label : b.values[index - 1];
      const compare = typeof left === "number" && typeof right === "number"
        ? left - right : String(left).localeCompare(String(right), "ko");
      return state.direction === "desc" ? -compare : compare;
    };
    if (!rows.some((item) => item.group === "continent")) return [...rows].sort(compareRows);
    const continents = rows.filter((item) => item.group === "continent");
    const countryGroups = new Map();
    for (const item of rows.filter((entry) => entry.group === "country")) {
      if (!countryGroups.has(item.continent)) countryGroups.set(item.continent, []);
      countryGroups.get(item.continent).push(item);
    }
    return [...continents, ...continents.flatMap((item) => (countryGroups.get(item.label) || []).sort(compareRows))];
  }
  function findTable(id) {
    for (const subject of Object.values(data.subjects)) {
      for (const unit of subject.units) {
        for (const chapter of unit.chapters) {
          const found = chapter.tables.find((table) => table.id === id);
          if (found) return found;
        }
      }
    }
    return null;
  }
  function normalize(value) { return String(value || "").trim().toLocaleLowerCase("ko"); }
  function formatValue(value) {
    if (typeof value !== "number") return String(value ?? "");
    const digits = Number.isInteger(value) ? 0 : String(value).split(".")[1]?.length || 0;
    return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: Math.min(digits, 2) }).format(value).replace(/-/g, "−");
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }
  function showToast(message) {
    elements.statsToast.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { elements.statsToast.textContent = ""; }, 2400);
  }
})();


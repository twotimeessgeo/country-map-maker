(() => {
  "use strict";

  const index = window.STATISTICS_DATA_INDEX;
  const state = {
    scope: "all",
    category: "all",
    search: "",
    visibleCount: 60,
  };

  const dom = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    collectDom();
    if (!index?.metrics?.length) {
      dom.metricTableBody.innerHTML = `<tr><td colspan="5">통계 색인을 불러오지 못함.</td></tr>`;
      return;
    }
    bindEvents();
    renderCoverage();
    renderWorkflows();
    renderCategoryOptions();
    renderMetrics();
  }

  function collectDom() {
    for (const id of [
      "metricCoverage", "worldCoverage", "koreaCoverage", "workflowGrid", "scopeFilter",
      "metricSearch", "categoryFilter", "metricResultCount", "metricTableBody", "loadMoreMetrics",
    ]) {
      dom[id] = document.getElementById(id);
    }
  }

  function bindEvents() {
    dom.scopeFilter.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-scope]");
      if (!button || button.dataset.scope === state.scope) return;
      state.scope = button.dataset.scope;
      state.visibleCount = 60;
      dom.scopeFilter.querySelectorAll("button[data-scope]").forEach((candidate) => {
        const active = candidate.dataset.scope === state.scope;
        candidate.classList.toggle("is-active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      renderCategoryOptions();
      renderMetrics();
    });
    dom.metricSearch.addEventListener("input", () => {
      state.search = dom.metricSearch.value.trim();
      state.visibleCount = 60;
      renderMetrics();
    });
    dom.categoryFilter.addEventListener("change", () => {
      state.category = dom.categoryFilter.value;
      state.visibleCount = 60;
      renderMetrics();
    });
    dom.loadMoreMetrics.addEventListener("click", () => {
      state.visibleCount += 60;
      renderMetrics();
    });
  }

  function renderCoverage() {
    const coverage = index.coverage;
    dom.metricCoverage.textContent = `${coverage.metricIndexEntries.toLocaleString("ko-KR")}개 지표`;
    dom.worldCoverage.textContent = `${coverage.worldCountries.toLocaleString("ko-KR")}개 국가 · 기후 ${coverage.worldClimateStations}곳`;
    const koreaRegionCount = Object.values(coverage.koreaRegions || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    dom.koreaCoverage.textContent = `${koreaRegionCount.toLocaleString("ko-KR")}개 권역 · 기후 ${coverage.koreaClimateStations}곳`;
  }

  function renderWorkflows() {
    dom.workflowGrid.innerHTML = (index.workflows || []).map((workflow) => `
      <a class="workflow-card" href="${escapeHtml(workflow.href)}">
        <p class="workflow-card__eyebrow">${escapeHtml(workflow.eyebrow)}</p>
        <h3 lang="en">${escapeHtml(workflow.label)}</h3>
        <p>${escapeHtml(workflow.description)}</p>
      </a>
    `).join("");
  }

  function renderCategoryOptions() {
    const scoped = index.metrics.filter(matchesScope);
    const categories = [...new Set(scoped.map((metric) => metric.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "ko"));
    if (state.category !== "all" && !categories.includes(state.category)) state.category = "all";
    dom.categoryFilter.innerHTML = [
      `<option value="all">전체 분류 (${categories.length})</option>`,
      ...categories.map((category) => {
        const count = scoped.filter((metric) => metric.category === category).length;
        return `<option value="${escapeHtml(category)}">${escapeHtml(category)} (${count})</option>`;
      }),
    ].join("");
    dom.categoryFilter.value = state.category;
  }

  function renderMetrics() {
    const query = normalizeSearch(state.search);
    const filtered = index.metrics.filter((metric) => {
      if (!matchesScope(metric)) return false;
      if (state.category !== "all" && metric.category !== state.category) return false;
      if (!query) return true;
      return normalizeSearch([
        metric.scopeLabel, metric.levelLabel, metric.category, metric.label, metric.unit,
        metric.latestPeriod, metric.sourceName,
      ].join(" ")).includes(query);
    });
    const visible = filtered.slice(0, state.visibleCount);
    dom.metricResultCount.textContent = `${visible.length.toLocaleString("ko-KR")} / ${filtered.length.toLocaleString("ko-KR")}개 표시`;
    dom.loadMoreMetrics.hidden = visible.length >= filtered.length;
    dom.loadMoreMetrics.textContent = `더 보기 · ${Math.min(60, filtered.length - visible.length)}개`;
    dom.metricTableBody.innerHTML = visible.length
      ? visible.map(renderMetricRow).join("")
      : `<tr><td colspan="5"><p class="empty-state">조건에 맞는 지표가 없음.</p></td></tr>`;
  }

  function renderMetricRow(metric) {
    const source = metric.sourceUrl
      ? `<a class="source-link" href="${escapeHtml(metric.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(shortenSource(metric.sourceName))}</a>`
      : `<span class="source-link is-missing">${escapeHtml(shortenSource(metric.sourceName))}</span>`;
    const partialCoverage = Number(metric.partialCoverageCount || 0);
    const coverageDetail = `${metric.coverageCount.toLocaleString("ko-KR")} / ${metric.totalCount.toLocaleString("ko-KR")}${partialCoverage ? ` · 부분 ${partialCoverage.toLocaleString("ko-KR")}` : ""}`;
    return `<tr>
      <td><span class="metric-scope">${escapeHtml(metric.scopeLabel)}</span></td>
      <td class="metric-name"><strong>${escapeHtml(metric.label)}</strong><small>${escapeHtml(metric.category)} · ${escapeHtml(metric.unit || "단위 없음")}</small></td>
      <td>${escapeHtml(metric.latestPeriod)}</td>
      <td class="coverage-cell"><strong>${metric.coverageRate.toFixed(1)}%</strong><small>${coverageDetail}</small></td>
      <td>${source}</td>
    </tr>`;
  }

  function matchesScope(metric) {
    if (state.scope === "all") return true;
    if (state.scope === "climate") return metric.scope.startsWith("climate-");
    return metric.scope === state.scope;
  }

  function shortenSource(value) {
    const text = String(value || "출처 정보 확인 필요");
    return text.length > 42 ? `${text.slice(0, 39)}…` : text;
  }

  function normalizeSearch(value) {
    return String(value || "").normalize("NFKC").toLocaleLowerCase("ko").replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();

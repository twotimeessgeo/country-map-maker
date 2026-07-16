(() => {
  "use strict";

  const index = window.STATISTICS_DATA_INDEX;
  const state = {
    scope: "all",
    category: "all",
    use: "all",
    search: "",
    visibleCount: 60,
    sourceSearch: "",
  };

  const dom = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    collectDom();
    if (!index?.metrics?.length) {
      dom.metricTableBody.innerHTML = `<tr><td colspan="6">통계 색인을 불러오지 못함.</td></tr>`;
      return;
    }
    bindEvents();
    renderCoverage();
    renderWorkflows();
    renderPatterns();
    renderCategoryOptions();
    renderMetrics();
    renderSourceAudit();
    renderSources();
  }

  function collectDom() {
    for (const id of [
      "metricCoverage", "referenceCoverage", "worldCoverage", "koreaCoverage",
      "workflowGrid", "patternGrid", "patternSummary", "scopeFilter", "metricSearch",
      "categoryFilter", "useFilter", "metricResultCount", "metricTableBody", "loadMoreMetrics",
      "sourceAudit", "sourceSearch", "sourceGrid", "sourceSummary",
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
    dom.useFilter.addEventListener("change", () => {
      state.use = dom.useFilter.value;
      state.visibleCount = 60;
      renderMetrics();
    });
    dom.loadMoreMetrics.addEventListener("click", () => {
      state.visibleCount += 60;
      renderMetrics();
    });
    dom.sourceSearch.addEventListener("input", () => {
      state.sourceSearch = dom.sourceSearch.value.trim();
      renderSources();
    });
  }

  function renderCoverage() {
    const coverage = index.coverage;
    dom.metricCoverage.textContent = `${coverage.metricIndexEntries.toLocaleString("ko-KR")}개 지표`;
    dom.referenceCoverage.textContent = `${coverage.graphReferences.toLocaleString("ko-KR")}개 SVG 분석`;
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

  function renderPatterns() {
    const patterns = index.graphPatterns || [];
    const examReferences = Number(index.coverage?.examPatternReferences || 0);
    const referenceOnly = Number(index.coverage?.referenceOnlyReferences || 0);
    dom.patternSummary.textContent = `${examReferences}개 수능형 참조 · ${patterns.length}개 설계 패턴 · ${referenceOnly}개 참고 전용`;
    dom.patternGrid.innerHTML = patterns.map((pattern) => `
      <article class="pattern-card">
        <p class="pattern-card__count">${String(pattern.count).padStart(2, "0")} REFERENCES</p>
        <h3>${escapeHtml(pattern.label)}</h3>
        <p class="pattern-card__description">${escapeHtml(pattern.description)}</p>
        <p class="pattern-card__meta">${escapeHtml(pattern.transform)}<br />${escapeHtml(pattern.tool)}</p>
        <details>
          <summary>참고한 기존 자료</summary>
          <ul>${(pattern.examples || []).map((example) => `<li>${escapeHtml(example)}</li>`).join("")}</ul>
        </details>
      </article>
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
      if (state.use !== "all" && !(metric.uses || []).some((use) => use.includes(state.use))) return false;
      if (!query) return true;
      return normalizeSearch([
        metric.scopeLabel, metric.levelLabel, metric.category, metric.label, metric.unit,
        metric.latestPeriod, metric.sourceName, ...(metric.uses || []),
      ].join(" ")).includes(query);
    });
    const visible = filtered.slice(0, state.visibleCount);
    dom.metricResultCount.textContent = `${visible.length.toLocaleString("ko-KR")} / ${filtered.length.toLocaleString("ko-KR")}개 표시`;
    dom.loadMoreMetrics.hidden = visible.length >= filtered.length;
    dom.loadMoreMetrics.textContent = `더 보기 · ${Math.min(60, filtered.length - visible.length)}개`;
    dom.metricTableBody.innerHTML = visible.length
      ? visible.map(renderMetricRow).join("")
      : `<tr><td colspan="6"><p class="empty-state">조건에 맞는 지표가 없음.</p></td></tr>`;
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
      <td><div class="use-list">${(metric.uses || []).map((use) => `<span class="use-chip">${escapeHtml(use)}</span>`).join("")}</div></td>
      <td>${source}</td>
    </tr>`;
  }

  function renderSourceAudit() {
    const audit = index.sourceAudit;
    dom.sourceAudit.innerHTML = [
      ["연결된 기존 SVG", `${audit.resolved}개`],
      ["출처 보강 필요", `${audit.provenanceGap}개`],
      ["출처 미해결", `${audit.unresolved}개`],
      ["색인 스냅샷", index.meta.snapshotDate],
    ].map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  }

  function renderSources() {
    const query = normalizeSearch(state.sourceSearch);
    const datasets = (index.supplemental?.datasets || []).map((source) => ({ ...source, type: "정규화 자료" }));
    const pointers = (index.supplemental?.sourcePointers || []).map((source) => ({ ...source, type: "원천 포인터" }));
    const sources = [...datasets, ...pointers].filter((source) => {
      if (!query) return true;
      return normalizeSearch([
        source.title, source.topic, source.scope, source.sourceName,
        ...(source.referenceYears || []), ...(source.units || []),
      ].join(" ")).includes(query);
    });
    const visibleDatasetCount = sources.filter((source) => source.type === "정규화 자료").length;
    const visiblePointerCount = sources.filter((source) => source.type === "원천 포인터").length;
    dom.sourceSummary.textContent = query
      ? `${visibleDatasetCount} / ${datasets.length}개 정규화 자료 · ${visiblePointerCount} / ${pointers.length}개 원천 포인터`
      : `${datasets.length}개 정규화 자료 · ${pointers.length}개 원천 포인터`;
    dom.sourceGrid.innerHTML = sources.length ? sources.map((source) => {
      const detail = source.type === "정규화 자료"
        ? `${Number(source.recordCount || 0).toLocaleString("ko-KR")}개 레코드 · ${(source.referenceYears || []).join(", ") || "시점 혼합"}`
        : `${source.assetCount == null ? "자산 수 미기록" : `${Number(source.assetCount).toLocaleString("ko-KR")}개 자산`} · 그래프 정규화 전 원천`;
      const action = source.sourceUrl
        ? `<a href="${escapeHtml(source.sourceUrl)}" target="_blank" rel="noreferrer">원문 확인</a>`
        : `<span class="source-missing">공개 URL 확인 필요</span>`;
      return `<article class="source-card">
        <p class="source-card__kicker">${escapeHtml(source.type)} · ${escapeHtml(source.topic || "multiple")}</p>
        <h3>${escapeHtml(source.title)}</h3>
        <p>${escapeHtml(source.sourceName)}<br />${escapeHtml(detail)}</p>
        ${action}
      </article>`;
    }).join("") : `<p class="empty-state">조건에 맞는 자료가 없음.</p>`;
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

(() => {
  "use strict";

  const index = window.STATISTICS_DATA_INDEX;
  const countryTopicLabels = {
    demography: "인구·도시",
    agriculture: "식량·농업",
    economy: "산업·교역",
    energy: "자원·에너지",
    religion: "종교·문화",
    region: "지역 판별",
  };
  const countryPageSize = window.matchMedia("(max-width: 700px)").matches ? 8 : 24;
  const state = {
    countrySearch: "",
    countryTier: "core",
    countryTopic: "all",
    countryVisibleCount: countryPageSize,
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
    renderCountryTopicOptions();
    renderCountries();
    renderCategoryOptions();
    renderMetrics();
  }

  function collectDom() {
    for (const id of [
      "metricCoverage", "worldCoverage", "koreaCoverage", "workflowGrid", "scopeFilter",
      "metricSearch", "categoryFilter", "metricResultCount", "metricTableBody", "loadMoreMetrics",
      "countrySearch", "countryTierFilter", "countryTopicFilter", "countryResultCount", "countryGrid", "loadMoreCountries",
    ]) {
      dom[id] = document.getElementById(id);
    }
  }

  function bindEvents() {
    dom.countryTierFilter.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-tier]");
      if (!button || button.dataset.tier === state.countryTier) return;
      state.countryTier = button.dataset.tier;
      state.countryVisibleCount = countryPageSize;
      dom.countryTierFilter.querySelectorAll("button[data-tier]").forEach((candidate) => {
        const active = candidate.dataset.tier === state.countryTier;
        candidate.classList.toggle("is-active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      renderCountries();
    });
    dom.countryTopicFilter.addEventListener("change", () => {
      state.countryTopic = dom.countryTopicFilter.value;
      state.countryVisibleCount = countryPageSize;
      renderCountries();
    });
    dom.countrySearch.addEventListener("input", () => {
      state.countrySearch = dom.countrySearch.value.trim();
      state.countryVisibleCount = countryPageSize;
      renderCountries();
    });
    dom.loadMoreCountries.addEventListener("click", () => {
      state.countryVisibleCount += countryPageSize;
      renderCountries();
    });
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
    dom.worldCoverage.textContent = `출제국 ${coverage.examCountries.toLocaleString("ko-KR")}개 · 원자료 ${coverage.worldCountries.toLocaleString("ko-KR")}개`;
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

  function renderCountryTopicOptions() {
    const topics = [...new Set((index.countries || []).flatMap((country) => country.topics || []))]
      .sort((a, b) => Object.keys(countryTopicLabels).indexOf(a) - Object.keys(countryTopicLabels).indexOf(b));
    dom.countryTopicFilter.innerHTML = [
      `<option value="all">전체 주제</option>`,
      ...topics.map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(countryTopicLabels[topic] || topic)}</option>`),
    ].join("");
  }

  function renderCountries() {
    const query = normalizeSearch(state.countrySearch);
    const countries = (index.countries || []).filter((country) => {
      if (state.countryTier !== "all" && country.tier !== state.countryTier) return false;
      if (state.countryTopic !== "all" && !country.topics.includes(state.countryTopic)) return false;
      if (!query) return true;
      const topicText = country.topics.map((topic) => countryTopicLabels[topic] || topic).join(" ");
      return normalizeSearch([country.nameKo, ...(country.aliases || []), country.name, country.iso3, country.continent, topicText].join(" ")).includes(query);
    });
    const visible = countries.slice(0, state.countryVisibleCount);
    dom.countryResultCount.textContent = `${visible.length.toLocaleString("ko-KR")} / ${countries.length.toLocaleString("ko-KR")}개 표시 · 핵심 ${index.coverage.examCoreCountries.toLocaleString("ko-KR")} · 보조 ${index.coverage.examSupportCountries.toLocaleString("ko-KR")}`;
    dom.loadMoreCountries.hidden = visible.length >= countries.length;
    dom.loadMoreCountries.textContent = `출제 국가 더 보기 · ${Math.min(countryPageSize, countries.length - visible.length)}개`;
    dom.countryGrid.innerHTML = visible.length
      ? visible.map(renderCountryCard).join("")
      : `<p class="empty-state">조건에 맞는 출제 국가가 없음.</p>`;
  }

  function renderCountryCard(country) {
    const categoryRows = country.categoryCoverage.map((group) => {
      const statusClass = group.availableCount === 0
        ? "is-missing"
        : group.missingCount === 0 && group.partialCount === 0
          ? "is-complete"
          : "is-partial";
      const partialText = group.partialCount ? ` · 부분 ${group.partialCount.toLocaleString("ko-KR")}` : "";
      return `<li class="country-category ${statusClass}">
        <span>${escapeHtml(group.category)}</span>
        <strong>${group.availableCount.toLocaleString("ko-KR")} / ${group.totalCount.toLocaleString("ko-KR")}</strong>
        <small>빈칸 ${group.missingCount.toLocaleString("ko-KR")}${partialText}</small>
      </li>`;
    }).join("");
    const coverageLabel = `${country.nameKo} 전체 지표 수록률 ${country.coverageRate.toFixed(1)}%`;
    const missingGroups = country.missingCategories.length
      ? `완전 빈 지표군: ${country.missingCategories.join(", ")}`
      : "모든 지표군에 수록 자료가 있음";
    const tierLabel = country.tier === "core" ? "핵심" : "보조";
    const topicTags = country.topics.map((topic) => `<li>${escapeHtml(countryTopicLabels[topic] || topic)}</li>`).join("");
    return `<article class="country-card">
      <header class="country-card__header">
        <div>
          <p>${escapeHtml(country.continent)} · <span lang="en">${escapeHtml(country.iso3)}</span> · <span class="country-tier country-tier--${escapeHtml(country.tier)}">${tierLabel}</span></p>
          <h3>${escapeHtml(country.nameKo)}</h3>
          <p class="country-card__english" lang="en">${escapeHtml(country.name)}</p>
        </div>
        <strong class="country-card__rate">${country.coverageRate.toFixed(1)}%</strong>
      </header>
      <ul class="country-topic-list" aria-label="수능 주제">${topicTags}</ul>
      <div class="country-coverage-bar" role="img" aria-label="${escapeHtml(coverageLabel)}">
        <span style="width: ${country.coverageRate.toFixed(1)}%"></span>
      </div>
      <p class="country-card__summary">
        ${country.availableMetricCount.toLocaleString("ko-KR")}개 수록 · ${country.missingMetricCount.toLocaleString("ko-KR")}개 빈칸${country.partialMetricCount ? ` · 부분 ${country.partialMetricCount.toLocaleString("ko-KR")}` : ""}
      </p>
      <details class="country-card__details">
        <summary>지표군별 가용성 보기</summary>
        <ul>${categoryRows}</ul>
        <p>${escapeHtml(missingGroups)}</p>
      </details>
      <a
        class="country-handoff"
        href="${escapeHtml(country.graphBuilderHref)}"
        aria-label="${escapeHtml(`${country.nameKo} (${country.iso3})를 Graph Builder 후보로 가져가기`)}"
      >Graph Builder로 가져가기 <span aria-hidden="true">→</span></a>
    </article>`;
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
    const source = renderMetricSource(metric);
    const partialCoverage = Number(metric.partialCoverageCount || 0);
    const coverageDetail = `${metric.coverageCount.toLocaleString("ko-KR")} / ${metric.totalCount.toLocaleString("ko-KR")}${partialCoverage ? ` · 부분 ${partialCoverage.toLocaleString("ko-KR")}` : ""}`;
    return `<tr>
      <td data-label="범위"><span class="metric-scope">${escapeHtml(metric.scopeLabel)}</span></td>
      <td class="metric-name" data-label="지표"><strong>${escapeHtml(metric.label)}</strong><small>${escapeHtml(metric.category)} · ${escapeHtml(metric.unit || "단위 없음")}</small></td>
      <td data-label="최신 수록 시점">${escapeHtml(metric.latestPeriod)}</td>
      <td class="coverage-cell" data-label="수록률"><strong>${metric.coverageRate.toFixed(1)}%</strong><small>${coverageDetail}</small></td>
      <td data-label="출처">${source}</td>
    </tr>`;
  }

  function renderMetricSource(metric) {
    if (metric.sourceLinks?.length) {
      return `<span class="source-link-group">${metric.sourceLinks.map((source) => `
        <a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(shortenSource(source.label))}</a>
      `).join("")}</span>`;
    }
    return metric.sourceUrl
      ? `<a class="source-link" href="${escapeHtml(metric.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(shortenSource(metric.sourceName))}</a>`
      : `<span class="source-link is-missing">${escapeHtml(shortenSource(metric.sourceName))}</span>`;
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

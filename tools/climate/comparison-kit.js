/*
 * Climate Atlas — comparison section (Design System 3.0).
 * Shared by app.js (world) and korea-app.js (korea). The apps pass plain data; this file owns layout and charts.
 * One 값/편차 toggle drives every chart; 편차 is measured against the selected-region mean or one region.
 */
(function () {
  const INK = "#0d0d0d";
  const INK_2 = "#5d5d5d";
  const INK_3 = "#737373";
  const BAR = "#d4d4d4";
  const BAR_DARK = "#8f8f8f";
  const GRID = "rgba(0, 0, 0, 0.08)";
  const BASE = "rgba(0, 0, 0, 0.32)";
  const FONT = "TWK Lausanne, Pretendard Variable, Pretendard, sans-serif";
  const DASHES = ["", "6 4", "2 3", "10 4 2 4", "1 3", "12 4 4 4"];
  const MARKERS = ["circle", "square-o", "triangle", "diamond-o", "circle-o", "square"];
  const charts = new Map();
  let nextChartId = 0;
  let resizeTimer;

  const esc = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const round1 = (value) => Math.round(value * 10) / 10;
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);

  function num(value, signed = false) {
    if (!Number.isFinite(value)) return "–";
    const rounded = round1(value);
    const abs = Math.abs(rounded);
    const body = abs.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (rounded < 0) return `−${body}`;
    return signed && rounded > 0 ? `+${body}` : body;
  }

  function axisNum(value, signed = false) {
    if (!Number.isFinite(value)) return "–";
    const body = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: Number.isInteger(value) ? 0 : 1 })
      .format(value).replace(/^-/, "−");
    return signed && value > 0 ? `+${body}` : body;
  }

  function niceStep(raw) {
    const power = 10 ** Math.floor(Math.log10(raw || 1));
    const unit = raw / power;
    const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10;
    return nice * power;
  }

  function scale(values, { includeZero = true, count = 5 } = {}) {
    const finite = values.filter(Number.isFinite);
    let min = finite.length ? Math.min(...finite) : 0;
    let max = finite.length ? Math.max(...finite) : 1;
    if (includeZero) {
      min = Math.min(min, 0);
      max = Math.max(max, 0);
    }
    if (min === max) max = min + 1;
    const step = niceStep((max - min) / count);
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let tick = lo; tick <= hi + step / 1000; tick += step) ticks.push(round1(tick));
    return { lo, hi, ticks };
  }

  function marker(kind, x, y, r = 3.6) {
    const fill = kind.endsWith("-o") ? "#ffffff" : INK;
    const shape = kind.replace("-o", "");
    const common = `class="tw-chart-dot tw-value-shape" fill="${fill}" stroke="${INK}" stroke-width="1.4"`;
    if (shape === "square") return `<rect x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" ${common} />`;
    if (shape === "triangle") return `<path d="M${x},${y - r * 1.2}L${x + r * 1.1},${y + r * 0.8}L${x - r * 1.1},${y + r * 0.8}Z" ${common} />`;
    if (shape === "diamond") return `<path d="M${x},${y - r * 1.25}L${x + r * 1.1},${y}L${x},${y + r * 1.25}L${x - r * 1.1},${y}Z" ${common} />`;
    return `<circle cx="${x}" cy="${y}" r="${r}" ${common} />`;
  }

  function seriesStyle(index) {
    return { dash: DASHES[index % DASHES.length], marker: MARKERS[index % MARKERS.length] };
  }

  function legend(names) {
    return `<div class="chart-legend">${names
      .map((name, index) => {
        const style = seriesStyle(index);
        return `<button type="button" class="chart-legend-item" data-chart-series="${index}" aria-pressed="false"><svg width="28" height="12" viewBox="0 0 28 12" aria-hidden="true"><line x1="1" y1="6" x2="27" y2="6" stroke="${INK}" stroke-width="1.6" stroke-dasharray="${style.dash}" />${marker(style.marker, 14, 6, 3.2)}</svg>${esc(name)}</button>`;
      })
      .join("")}</div>`;
  }

  function frame(width, height, body, label, id) {
    return `<svg class="svg-chart kit-chart" data-kit-chart="${id}" data-chart-width="${width}" viewBox="0 0 ${width} ${height}" role="img" font-size="11" font-family="${FONT}" aria-label="${esc(label)}">${body}</svg>`;
  }

  function yAxis(s, m, width, plotH, unit, signed) {
    const y = (value) => m.top + plotH - ((value - s.lo) / (s.hi - s.lo)) * plotH;
    let out = `<text class="chart-axis-unit" x="${m.left - 10}" y="${m.top - 14}" text-anchor="end" fill="${INK_3}">${esc(unit)}</text>`;
    s.ticks.forEach((tick) => {
      out += `<line x1="${m.left}" y1="${y(tick)}" x2="${width - m.right}" y2="${y(tick)}" stroke="${tick === 0 ? BASE : GRID}" />`;
      out += `<text class="tw-axis-tick" x="${m.left - 10}" y="${y(tick) + 4}" text-anchor="end" fill="${INK_2}">${axisNum(tick, signed)}</text>`;
    });
    return { out, y };
  }

  /* 12-month multi-series line chart */
  function lineChart({ series, unit, signed, label }, requestedWidth = 600, chartId = null) {
    const id = chartId ?? String(++nextChartId);
    charts.set(id, { type: "line", options: { series, unit, signed, label } });
    const width = Math.max(240, Math.round(requestedWidth));
    const height = 300;
    const m = { top: 32, right: 16, bottom: 30, left: 52 };
    const plotW = width - m.left - m.right;
    const plotH = height - m.top - m.bottom;
    const s = scale(series.flatMap((item) => item.values), { includeZero: true });
    const axis = yAxis(s, m, width, plotH, unit, signed);
    const x = (index) => m.left + (plotW * (index + 0.5)) / 12;
    let body = axis.out;
    for (let i = 0; i < 12; i += 1) {
      body += `<text x="${x(i)}" y="${height - 8}" text-anchor="middle" fill="${INK_3}">${i + 1}</text>`;
    }
    series.forEach((item, index) => {
      const style = seriesStyle(index);
      const points = item.values.map((value, i) => [x(i), axis.y(value), value]).filter((point) => Number.isFinite(point[2]));
      body += `<g class="kit-line-series" data-series-index="${index}"><polyline class="tw-chart-line tw-value-shape" points="${points.map((p) => `${p[0]},${p[1]}`).join(" ")}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="${style.dash}" stroke-linejoin="round" />`;
      body += points
        .map((p, i) => `<g data-tooltip="${esc(`${item.name}  ${i + 1}월  ${num(p[2], signed)}${unit === "mm" ? " mm" : unit}`)}" tabindex="0">${marker(style.marker, p[0], p[1])}</g>`)
        .join("");
      body += "</g>";
    });
    return `<div class="kit-line-chart ${series.length >= 7 ? "is-many-series" : ""}">${frame(width, height, body, label, id)}${legend(series.map((item) => item.name))}</div>`;
  }

  /* One value per region: dots (temperature) or bars (precipitation) */
  function categoryChart({ categories, values, kind, unit, signed, label }, requestedWidth = 600, chartId = null) {
    const id = chartId ?? String(++nextChartId);
    const options = { categories, values, kind, unit, signed, label };
    charts.set(id, { type: "category", options });
    const width = Math.max(240, Math.round(requestedWidth));
    if (width < 480 || categories.length >= 5) return `<div class="kit-category-chart">${horizontalCategoryChart(options, width, id)}</div>`;
    const height = 230;
    const m = { top: 30, right: 6, bottom: 30, left: 40 };
    const plotW = width - m.left - m.right;
    const plotH = height - m.top - m.bottom;
    const s = scale(values, { includeZero: kind !== "dot" || signed });
    const axis = yAxis(s, m, width, plotH, unit, signed);
    const step = plotW / Math.max(categories.length, 1);
    const barW = Math.min(28, step * 0.5);
    const maxChars = categories.length > 5 ? 3 : 5;
    let body = axis.out;
    categories.forEach((name, i) => {
      const cx = m.left + step * (i + 0.5);
      const value = values[i];
      const short = name.length > maxChars + 1 ? `${name.slice(0, maxChars)}…` : name;
      body += `<text x="${cx}" y="${height - 9}" text-anchor="middle" font-size="11" fill="${INK_2}">${esc(short)}</text>`;
      if (!Number.isFinite(value)) return;
      const tip = `data-tooltip="${esc(`${name}  ${num(value, signed)}${unit === "mm" ? " mm" : unit}`)}" tabindex="0"`;
      if (kind === "bar") {
        const y0 = axis.y(0);
        const y1 = axis.y(value);
        const top = Math.min(y0, y1);
        const h = Math.max(Math.abs(y1 - y0), 0.5);
        body += `<g ${tip}><rect class="tw-chart-bar tw-value-shape" x="${cx - barW / 2}" y="${top}" width="${barW}" height="${h}" rx="3" fill="${BAR}" /></g>`;
      } else {
        body += `<g ${tip}><circle class="tw-chart-dot tw-value-shape" cx="${cx}" cy="${axis.y(value)}" r="4.5" fill="${INK}" stroke="#ffffff" stroke-width="1.5" /></g>`;
      }
    });
    return `<div class="kit-category-chart">${frame(width, height, body, label, id)}</div>`;
  }

  function horizontalCategoryChart({ categories, values, kind, unit, signed, label }, width, id) {
    const height = Math.max(250, categories.length * 32 + 48);
    const m = { top: 30, right: 34, bottom: 30, left: Math.min(width * 0.48, Math.max(90, Math.max(...categories.map((name) => name.length)) * 12 + 18)) };
    const plotW = width - m.left - m.right;
    const s = scale(values, { includeZero: kind !== "dot" || signed });
    const x = (value) => m.left + (value - s.lo) / (s.hi - s.lo) * plotW;
    let body = `<text class="chart-axis-unit" x="${width - m.right}" y="16" text-anchor="end" fill="${INK_3}">${esc(unit)}</text>`;
    for (const tick of s.ticks) {
      body += `<line x1="${x(tick)}" y1="${m.top}" x2="${x(tick)}" y2="${height - m.bottom}" stroke="${tick === 0 ? BASE : GRID}" />`;
      body += `<text class="tw-axis-tick" x="${x(tick)}" y="${height - 8}" text-anchor="middle" fill="${INK_2}">${axisNum(tick, signed)}</text>`;
    }
    categories.forEach((name, i) => {
      const cy = m.top + 16 + i * 32;
      const value = values[i];
      body += `<text x="${m.left - 10}" y="${cy + 4}" text-anchor="end" font-size="11" fill="${INK_2}">${esc(name)}</text>`;
      if (!Number.isFinite(value)) return;
      const tip = `data-tooltip="${esc(`${name}  ${num(value, signed)}${unit === "mm" ? " mm" : unit}`)}" tabindex="0"`;
      if (kind === "bar") {
        const x0 = x(0);
        const x1 = x(value);
        body += `<g ${tip}><rect class="tw-chart-bar tw-value-shape" x="${Math.min(x0, x1)}" y="${cy - 8}" width="${Math.max(Math.abs(x1 - x0), 0.5)}" height="16" rx="3" fill="${BAR}" /></g>`;
      } else {
        body += `<g ${tip}><circle class="tw-chart-dot tw-value-shape" cx="${x(value)}" cy="${cy}" r="4.5" fill="${INK}" stroke="#ffffff" stroke-width="1.5" /></g>`;
      }
    });
    return frame(width, height, body, label, id);
  }

  function table(headers, rows) {
    return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
      .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`)
      .join("")}</tbody></table></div>`;
  }

  function dataBlock(csvKey, headers, rows) {
    const button = csvKey
      ? `<div class="climate-data-tools"><button type="button" class="ghost-button climate-csv-download" data-climate-csv-download="${esc(csvKey)}">CSV</button></div>`
      : "";
    return `<details class="climate-data-details"><summary>원 데이터</summary>${button}${table(headers, rows)}</details>`;
  }

  function card(title, chart, data, wide = false) {
    return `<article class="chart-card kit-card${wide ? " is-wide" : ""}"><h4>${esc(title)}</h4>${chart}${data}</article>`;
  }

  /*
   * input = {
   *   mode: "value" | "deviation", baselineId: "mean" | regionId,
   *   regions: [{ id, name, temps[12], precs[12] }],
   *   extras: [{ title, unit, kind, value: (region) => number }],   // value-only charts (e.g. 연교차)
   *   csv: (key, headers, rows, filename) => csvKey
   * }
   */
  function render(input) {
    const { regions, mode, csv } = input;
    const deviation = mode === "deviation";
    const baseline = regions.find((region) => region.id === input.baselineId) ?? null;
    const shown = deviation && baseline ? regions.filter((region) => region.id !== baseline.id) : regions;
    const cumulative = (region) => region.precs.reduce((acc, value, i) => (acc.push((acc[i - 1] ?? 0) + value), acc), []);
    const suffix = deviation ? " 편차" : "";

    const controls = `
      <div class="comparison-controls">
        <div class="tw-segmented" role="group" aria-label="값 또는 편차">
          <button type="button" data-comparison-mode="value" aria-pressed="${!deviation}">값</button>
          <button type="button" data-comparison-mode="deviation" aria-pressed="${deviation}">편차</button>
        </div>
        ${
          deviation
            ? `<label class="comparison-select"><span class="tw-sr-only">편차 기준</span><select data-baseline-select aria-label="편차 기준">
                <option value="mean" ${baseline ? "" : "selected"}>평균 대비</option>
                ${regions.map((region) => `<option value="${esc(region.id)}" ${baseline?.id === region.id ? "selected" : ""}>${esc(region.name)} 대비</option>`).join("")}
              </select></label>`
            : ""
        }
      </div>`;

    const monthHeaders = ["지역", ...Array.from({ length: 12 }, (_, i) => `${i + 1}월`)];
    const trend = (title, unit, pick) => {
      const series = shown.map((region) => ({
        name: region.name,
        values: pick(region).map((value, i) =>
          deviation ? round1(value - (baseline ? pick(baseline)[i] : mean(regions.map((r) => pick(r)[i])))) : round1(value)
        ),
      }));
      const key = csv?.(`cmp-trend-${title}-${mode}`, monthHeaders, series.map((item) => [item.name, ...item.values]), `${title}${suffix}`);
      return card(
        `${title}${suffix}`,
        lineChart({ series, unit, signed: deviation, label: `${title}${suffix}` }),
        dataBlock(key, monthHeaders, series.map((item) => [item.name, ...item.values.map((value) => num(value, deviation))]))
      );
    };

    const extras = (input.extras ?? [])
      .map((extra) => {
        const values = regions.map(extra.value);
        const rows = regions.map((region, i) => [region.name, num(values[i])]);
        const key = csv?.(`cmp-extra-${extra.title}`, ["지역", `${extra.title}(${extra.unit})`], regions.map((region, i) => [region.name, values[i]]), extra.title);
        return card(
          extra.title,
          categoryChart({ categories: regions.map((region) => region.name), values, kind: extra.kind ?? "bar", unit: extra.unit, signed: false, label: extra.title }),
          dataBlock(key, ["지역", `${extra.title}(${extra.unit})`], rows)
        );
      })
      .join("");

    return `
      ${controls}
      <div class="charts-grid kit-trends">
        ${trend("월평균 기온", "°C", (region) => region.temps)}
        ${trend("누적 강수량", "mm", cumulative)}
        ${extras}
      </div>`;
  }

  function resizeCharts() {
    const live = new Set();
    for (const svg of document.querySelectorAll("#comparisonContent svg[data-kit-chart]")) {
      const id = svg.dataset.kitChart;
      live.add(id);
      const data = charts.get(id);
      if (!data) continue;
      const host = svg.closest(data.type === "line" ? ".kit-line-chart" : ".kit-category-chart");
      const width = Math.round(host?.clientWidth || 0);
      if (!width || width === Number(svg.dataset.chartWidth)) continue;
      const template = document.createElement("template");
      template.innerHTML = (data.type === "line"
        ? lineChart(data.options, width, id)
        : categoryChart(data.options, width, id)).trim();
      if (data.type === "category") {
        host.innerHTML = template.content.querySelector(".kit-category-chart").innerHTML;
      } else {
        const next = template.content.querySelector("svg");
        svg.setAttribute("viewBox", next.getAttribute("viewBox"));
        svg.innerHTML = next.innerHTML;
        svg.dataset.chartWidth = String(width);
        svg.classList.remove("tw-chart-enter");
      }
    }
    for (const id of charts.keys()) if (!live.has(id)) charts.delete(id);
  }

  function scheduleResize(delay = 0) {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCharts, delay);
  }

  function startResizeTracking() {
    const root = document.getElementById("comparisonContent");
    if (!root) return;
    new MutationObserver(() => scheduleResize()).observe(root, { childList: true, subtree: true });
    if ("ResizeObserver" in window) new ResizeObserver(() => scheduleResize(150)).observe(root);
    else window.addEventListener("resize", () => scheduleResize(150));
    scheduleResize();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startResizeTracking, { once: true });
  else startResizeTracking();

  function applyLineHighlight(chart, index) {
    if (!chart) return;
    const selected = index === null ? "" : String(index);
    for (const series of chart.querySelectorAll(".kit-line-series")) {
      const active = selected !== "" && series.dataset.seriesIndex === selected;
      series.classList.toggle("is-emphasized", active);
      series.classList.toggle("is-muted", selected !== "" ? !active : chart.classList.contains("is-many-series"));
    }
    for (const item of chart.querySelectorAll(".chart-legend-item")) {
      item.classList.toggle("is-emphasized", selected !== "" && item.dataset.chartSeries === selected);
      item.setAttribute("aria-pressed", String(chart.dataset.lockedSeries === item.dataset.chartSeries));
    }
  }

  function legendTarget(event) {
    return event.target.closest?.(".chart-legend-item");
  }

  document.addEventListener("pointerover", (event) => {
    const item = legendTarget(event);
    if (item) applyLineHighlight(item.closest(".kit-line-chart"), item.dataset.chartSeries);
  });
  document.addEventListener("pointerout", (event) => {
    const item = legendTarget(event);
    if (!item || item.contains(event.relatedTarget)) return;
    const chart = item.closest(".kit-line-chart");
    applyLineHighlight(chart, chart.dataset.lockedSeries ?? null);
  });
  document.addEventListener("focusin", (event) => {
    const item = legendTarget(event);
    if (item) applyLineHighlight(item.closest(".kit-line-chart"), item.dataset.chartSeries);
  });
  document.addEventListener("focusout", (event) => {
    const item = legendTarget(event);
    if (!item || item.contains(event.relatedTarget)) return;
    const chart = item.closest(".kit-line-chart");
    applyLineHighlight(chart, chart.dataset.lockedSeries ?? null);
  });
  document.addEventListener("click", (event) => {
    const item = legendTarget(event);
    if (!item) return;
    const chart = item.closest(".kit-line-chart");
    if (chart.dataset.lockedSeries === item.dataset.chartSeries) delete chart.dataset.lockedSeries;
    else chart.dataset.lockedSeries = item.dataset.chartSeries;
    applyLineHighlight(chart, chart.dataset.lockedSeries ?? null);
  });

  window.ComparisonKit = { render };
})();

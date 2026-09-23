/*
 * Climate Atlas — climograph renderer (Design System 3.0).
 * Shared by app.js (world) and korea-app.js (korea).
 * Left axis: temperature (°C, line). Right axis: precipitation (mm, bars).
 * Both axes share the same gridlines, so every tick is a round number on each side.
 */
(function () {
  const INK = "#0d0d0d";
  const INK_2 = "#5d5d5d";
  const INK_3 = "#8f8f8f";
  const BAR = "#d4d4d4";
  const GRID = "rgba(0, 0, 0, 0.08)";
  const BASE = "rgba(0, 0, 0, 0.28)";
  const PRECIP_STEPS = [10, 20, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000];

  function finite(values) {
    return values.filter((value) => Number.isFinite(value));
  }

  function buildScale(regions) {
    const temps = finite(regions.flatMap((region) => region.monthlyTemperatureC ?? []));
    const precs = finite(regions.flatMap((region) => region.monthlyPrecipitationMm ?? []));
    const tLow = temps.length ? Math.min(...temps) : 0;
    const tHigh = temps.length ? Math.max(...temps) : 30;
    const pHigh = precs.length ? Math.max(...precs) : 100;

    const tStep = tHigh - tLow >= 15 ? 10 : 5;
    let tMin = Math.floor(tLow / tStep) * tStep;
    let tMax = Math.ceil(tHigh / tStep) * tStep;
    if (tMax === tMin) tMax += tStep;
    let intervals = Math.round((tMax - tMin) / tStep);
    while (intervals < 4) {
      if (intervals % 2) tMax += tStep;
      else tMin -= tStep;
      intervals += 1;
    }

    const pStep = PRECIP_STEPS.find((step) => step * intervals >= pHigh) ?? Math.ceil(pHigh / intervals / 100) * 100;
    return {
      temperatureMin: tMin,
      temperatureMax: tMax,
      temperatureStep: tStep,
      precipitationMax: pStep * intervals,
      precipitationStep: pStep,
      intervals,
    };
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function num(value) {
    const rounded = Math.round(value * 10) / 10;
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return text.replace(/^-/, "−");
  }

  function barPath(x, y, w, h, r) {
    if (h <= 0) return "";
    const radius = Math.min(r, h, w / 2);
    return `M${x},${y + h}V${y + radius}Q${x},${y} ${x + radius},${y}H${x + w - radius}Q${x + w},${y} ${x + w},${y + radius}V${y + h}Z`;
  }

  function render(region, scale) {
    const s = scale ?? buildScale([region]);
    const width = 600;
    const height = 318;
    const m = { top: 44, right: 46, bottom: 30, left: 42 };
    const plotW = width - m.left - m.right;
    const plotH = height - m.top - m.bottom;
    const months = region.months ?? [];
    const temps = region.monthlyTemperatureC ?? [];
    const precs = region.monthlyPrecipitationMm ?? [];
    const count = Math.max(months.length, 12);
    const stepX = plotW / count;
    const barW = stepX * 0.56;
    const yT = (value) => m.top + plotH - ((value - s.temperatureMin) / (s.temperatureMax - s.temperatureMin)) * plotH;
    const yP = (value) => m.top + plotH - (value / s.precipitationMax) * plotH;
    const cx = (index) => m.left + stepX * index + stepX / 2;

    let grid = "";
    for (let i = 0; i <= s.intervals; i += 1) {
      const y = m.top + plotH - (plotH * i) / s.intervals;
      const t = s.temperatureMin + s.temperatureStep * i;
      const p = s.precipitationStep * i;
      grid += `<line x1="${m.left}" y1="${y}" x2="${width - m.right}" y2="${y}" stroke="${i === 0 ? BASE : GRID}" />`;
      grid += `<text x="${m.left - 10}" y="${y + 4}" text-anchor="end" fill="${INK_2}">${num(t)}</text>`;
      grid += `<text x="${width - m.right + 10}" y="${y + 4}" text-anchor="start" fill="${INK_3}">${num(p)}</text>`;
    }
    if (s.temperatureMin < 0 && s.temperatureMax > 0) {
      const y0 = yT(0);
      grid += `<line x1="${m.left}" y1="${y0}" x2="${width - m.right}" y2="${y0}" stroke="${BASE}" stroke-dasharray="2 3" />`;
    }

    let hits = "";
    let bars = "";
    let labels = "";
    const points = [];
    for (let i = 0; i < count; i += 1) {
      const t = temps[i];
      const p = precs[i];
      const month = months[i] ?? `${i + 1}월`;
      const tip = `${month}  기온 ${Number.isFinite(t) ? num(t) + "°C" : "–"}  강수량 ${Number.isFinite(p) ? num(p) + "mm" : "–"}`;
      hits += `<rect class="chart-hit" x="${m.left + stepX * i}" y="${m.top}" width="${stepX}" height="${plotH}" fill="transparent"><title>${esc(tip)}</title></rect>`;
      if (Number.isFinite(p)) {
        const y = yP(p);
        bars += `<path d="${barPath(cx(i) - barW / 2, y, barW, m.top + plotH - y, 3)}" fill="${BAR}" />`;
      }
      if (Number.isFinite(t)) points.push([cx(i), yT(t)]);
      labels += `<text x="${cx(i)}" y="${height - 8}" text-anchor="middle" fill="${INK_3}">${i + 1}</text>`;
    }

    const line = points.length
      ? `<polyline points="${points.map((point) => point.join(",")).join(" ")}" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`
      : "";
    const dots = points
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${INK}" stroke="#ffffff" stroke-width="1.5" />`)
      .join("");

    const legendX = width / 2;
    const legend = `
      <g transform="translate(${legendX - 78}, 14)">
        <line x1="0" y1="0" x2="18" y2="0" stroke="${INK}" stroke-width="2" />
        <circle cx="9" cy="0" r="3" fill="${INK}" />
        <text x="24" y="4" fill="${INK_2}">기온</text>
        <rect x="74" y="-5" width="10" height="10" rx="2" fill="${BAR}" />
        <text x="90" y="4" fill="${INK_2}">강수량</text>
      </g>`;

    return `
      <svg class="svg-chart climograph" viewBox="0 0 ${width} ${height}" role="img" font-size="11"
        font-family="TWK Lausanne, Pretendard Variable, Pretendard, sans-serif"
        aria-label="${esc(region.name)} 월별 기온·강수량">
        ${grid}
        <text x="${m.left - 10}" y="18" text-anchor="end" fill="${INK_2}">°C</text>
        <text x="${width - m.right + 10}" y="18" text-anchor="start" fill="${INK_3}">mm</text>
        ${legend}
        ${hits}
        <g pointer-events="none">${bars}${line}${dots}</g>
        ${labels}
      </svg>`;
  }

  window.ClimateChartKit = { buildScale, render };
})();

(() => {
  "use strict";
  const finite = value => typeof value === "number" && Number.isFinite(value);
  const numeric = value => value && typeof value === "object" ? value.value : value;
  const scales = {
    "명": [["백만 명", 1e6], ["천 명", 1e3]],
    "천 명": [["백만 명", 1e3]],
    "t": [["백만 t", 1e6], ["천 t", 1e3]],
    "만 t": [["백만 t", 100]],
  };
  function defaultDigits(column) {
    if (Number.isInteger(column.digits)) return column.digits;
    if (/합계\s*출산율/.test(column.label || "")) return 2;
    if (["%", "‰", "지수"].includes(column.unit)) return 1;
    if (/^(명|개|가구|마리|t|천 명|MWh|천 toe|ha|호|대|건|곳)$/.test(column.unit || "")) return 0;
    return 1;
  }
  function spec(column, values) {
    const unit = column.unit || "";
    const absolute = values.map(numeric).filter(finite).map(Math.abs).sort((a,b) => a-b);
    const mid = Math.floor(absolute.length / 2);
    const median = absolute.length ? absolute.length % 2 ? absolute[mid] : (absolute[mid-1] + absolute[mid]) / 2 : 0;
    const max = absolute.at(-1) || 0;
    const choice = (scales[unit] || []).find(([,divisor]) => median / divisor >= 10);
    const displayUnit = choice?.[0] || unit, divisor = choice?.[1] || 1;
    const scaledMax = max / divisor;
    const digits = divisor > 1 ? scaledMax >= 100 ? 0 : scaledMax >= 10 ? 1 : 2 : defaultDigits(column);
    return { unit: displayUnit, divisor, digits };
  }
  function specsForView(view) {
    const years = view.columns.length >= 2 && view.columns.every(column =>
      /^(?:19|20)\d{2}(?:[.~-]\d+)*(?:년)?$/.test(column.label) && column.unit === view.columns[0].unit);
    if (years) {
      const common = spec(view.columns[0], view.rows.flatMap(row => row.values));
      return view.columns.map(() => common);
    }
    return view.columns.map((column,index) => spec(column, view.rows.map(row => row.values[index])));
  }
  function format(value, display, digitsOverride) {
    if (value === null || value === undefined || value === "") return "–";
    if (!finite(value)) return String(value);
    const digits = Number.isInteger(digitsOverride) ? digitsOverride : display.digits;
    const scaled = value / (display.divisor || 1);
    const rounded = Number(scaled.toFixed(digits));
    return new Intl.NumberFormat("ko-KR", { minimumFractionDigits: digits, maximumFractionDigits: digits })
      .format(rounded === 0 ? 0 : rounded).replaceAll("-", "−");
  }
  window.TWStatsNumbers = { defaultDigits, spec, specsForView, format };
})();

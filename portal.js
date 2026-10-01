/* Home: the brand spells itself in once per session; the four links stay in view. */
(() => {
  const brand = document.querySelector("#homeBrand");
  if (!brand) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  if (!reduced.matches && !(() => { try { return sessionStorage.getItem("tw-home-brand-intro"); } catch { return "1"; } })()) {
    try { sessionStorage.setItem("tw-home-brand-intro", "1"); } catch {}
    brand.setAttribute("aria-label", "Promenade");
    brand.classList.add("is-intro");
    brand.innerHTML = [..."Promenade"].map((letter, index) => `<span aria-hidden="true"><span style="--letter-index:${index}">${letter}</span></span>`).join("");
    setTimeout(() => { brand.textContent = "Promenade"; brand.classList.remove("is-intro"); }, 1000);
  }
})();

/* Home: countdown to the first 탐구 elective of 수능 (2026-11-19 15:35 KST), hours:minutes:seconds; digits roll on change. */
(() => {
  const root = document.querySelector("#homeCountdown");
  if (!root) return;
  const TARGET = Date.parse("2026-11-19T15:35:00+09:00");
  const digitsEl = root.querySelector(".home-countdown-digits");
  const srText = root.querySelector("#homeCountdownText");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ROLL_MS = 460;

  const remaining = () => Math.max(0, Math.floor((TARGET - Date.now()) / 1000));
  const format = (seconds) => {
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  };
  const describe = (seconds) => {
    const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60);
    return seconds ? `수능 탐구 제1선택 시작까지 ${d}일 ${h}시간 ${m}분` : "수능 탐구 제1선택 시작";
  };

  let shown = "";
  const build = (text) => {
    digitsEl.textContent = "";
    for (const ch of text) {
      const cell = document.createElement("span");
      if (ch === ":") { cell.className = "home-countdown-sep"; cell.textContent = ":"; }
      else { cell.className = "home-countdown-cell"; cell.innerHTML = `<span class="home-countdown-digit">${ch}</span>`; }
      digitsEl.append(cell);
    }
    shown = text;
  };
  const roll = (cell, ch, delay = 0) => {
    const current = cell.lastElementChild;
    const next = document.createElement("span");
    next.className = "home-countdown-digit is-in";
    next.style.animationDelay = `${delay}ms`;
    next.textContent = ch;
    if (current) {
      current.style.animationDelay = `${delay}ms`;
      current.classList.add("is-out");
      setTimeout(() => current.remove(), ROLL_MS + delay);
    }
    cell.append(next);
  };
  const render = (text, stagger = 0) => {
    if (reduced || text.length !== shown.length) { build(text); return; }
    const cells = digitsEl.children;
    [...text].forEach((ch, i) => {
      if (ch !== shown[i] && ch !== ":") roll(cells[i], ch, stagger ? i * stagger : 0);
    });
    shown = text;
  };

  const tick = () => {
    const left = remaining();
    render(format(left));
    srText.textContent = describe(left);
    if (!left) { root.classList.add("is-zero"); return; }
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  };

  const first = format(remaining());
  if (reduced) { tick(); return; }
  build(first.replace(/\d/g, "0"));
  srText.textContent = describe(remaining());
  requestAnimationFrame(() => {
    root.classList.add("is-live");
    setTimeout(() => {
      render(format(remaining()), 45);
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    }, 260);
  });
})();

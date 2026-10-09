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

  const remaining = () => Math.max(0, Math.floor((TARGET - Date.now()) / 1000));
  const format = (seconds) => {
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  };
  const describe = (seconds) => {
    const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60);
    return seconds ? `수능 탐구 제1선택 시작까지 ${d}일 ${h}시간 ${m}분` : "수능 탐구 제1선택 시작";
  };

  const build = (text) => { delete digitsEl.dataset.value; window.TwMotion.rollDigits(digitsEl,text,1); };
  const render = (text) => { window.TwMotion.rollDigits(digitsEl,text,1); };

  const tick = () => {
    const left = remaining();
    render(format(left));
    srText.textContent = describe(left);
    if (!left) { root.classList.add("is-zero"); return; }
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  };

  const first = format(remaining());
  const host = document.querySelector("[data-armillary]");
  if (reduced) { root.classList.add("is-live"); tick(); return; }
  build(first.replace(/\d/g, "0"));
  srText.textContent = describe(remaining());
  let live = false, fallback;
  const show = () => {
    if (live) return; live = true; clearTimeout(fallback);
    host?.removeEventListener("tw-merid-landed", show);
    requestAnimationFrame(() => {
      root.classList.add("is-live");
      setTimeout(() => {
        render(format(remaining()), 45);
        setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
      }, 260);
    });
  };
  if (!host || !window.WebGLRenderingContext) { show(); return; }
  host.addEventListener("tw-merid-landed", show, { once: true });
  fallback = setTimeout(show, 4000);
})();

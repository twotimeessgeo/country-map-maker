/* Visit counter for the public build (scripts/build-static-site.mjs adds it to every page; the source pages do not load it).
   Sends one page view on load, the time spent and the data actually fetched on leave, and a few actions: file downloads,
   table copies (guarded or not), the CAPTCHA result and outbound links. No cookies; a random id in localStorage tells
   returning browsers apart. Open any page with ?notrack=1 to stop counting this browser, ?notrack=0 to resume. */
(() => {
  "use strict";
  if (window.twStat) return;
  const ENDPOINT = (window.TW_STATS_URL || "https://promenade-stats.twotimess.workers.dev") + "/c";
  const store = (area, key, value) => {
    try {
      if (value === undefined) return window[area].getItem(key);
      if (value === null) window[area].removeItem(key); else window[area].setItem(key, value);
    } catch {}
    return null;
  };
  const params = new URLSearchParams(location.search);
  if (params.has("notrack")) store("localStorage", "tw-notrack", params.get("notrack") === "0" ? null : "1");
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && !window.TW_STATS_URL;
  if (local || location.protocol === "file:" || store("localStorage", "tw-notrack") === "1") {
    window.twStat = () => {};
    return;
  }

  const rid = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => (b % 36).toString(36)).join("");
  const timeId = () => Date.now().toString(36).padStart(9, "0") + rid(6);
  let vid = store("localStorage", "tw-vid");
  const newVisitor = !vid;
  if (!vid) { vid = rid(12); store("localStorage", "tw-vid", vid); }
  let sid = store("sessionStorage", "tw-sid");
  if (!sid) { sid = rid(10); store("sessionStorage", "tw-sid", sid); }

  // ?ref=orbi-0915 같은 유입 태그는 읽고 나서 주소창에서 지운다 (다시 공유될 때 섞이지 않게).
  const tagKeys = ["ref", "utm_source", "utm_medium", "utm_campaign", "notrack"];
  const tag = [params.get("ref"), params.get("utm_source"), params.get("utm_campaign")].filter(Boolean).join("/") || null;
  if (tagKeys.some((key) => params.has(key))) {
    tagKeys.forEach((key) => params.delete(key));
    const rest = params.toString();
    try { history.replaceState(history.state, "", location.pathname + (rest ? `?${rest}` : "") + location.hash); } catch {}
  }

  const path = location.pathname.replace(/^\/country-map-maker/, "").replace(/index\.html$/, "") || "/";
  let pid = timeId();
  const queue = [];
  const send = (messages) => {
    const body = JSON.stringify({ m: messages });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain" }))) return;
    } catch {}
    try { fetch(ENDPOINT, { method: "POST", body, keepalive: true, mode: "no-cors", credentials: "omit" }).catch(() => {}); } catch {}
  };

  const flags = () => {
    const out = [];
    if (navigator.webdriver) out.push("wd");
    if (/HeadlessChrome/.test(navigator.userAgent)) out.push("hl");
    if (!screen.width || !screen.height || !innerWidth) out.push("zs");
    if (!navigator.languages || !navigator.languages.length) out.push("nl");
    return out;
  };
  const device = () => {
    const coarse = matchMedia("(pointer: coarse)").matches;
    const short = Math.min(screen.width || 0, screen.height || 0);
    return coarse ? (short && short < 600 ? "m" : "t") : "d";
  };
  const pageView = () => {
    const query = new URLSearchParams(location.search);
    send([{ t: "pv", pid, v: vid, s: sid, nv: newVisitor, p: path, q: query.toString() || null, r: document.referrer || null, tag,
      d: device(), w: innerWidth, l: navigator.language, f: flags() }]);
  };

  // 실제로 받아 간 데이터 양: 데이터 파일, 문항 이미지, 영상·음악.
  const meter = { dn: 0, dkb: 0, imn: 0, imkb: 0, mkb: 0 };
  const seen = new Set();
  const measure = (entry) => {
    const name = entry.name || "";
    const bytes = entry.encodedBodySize || entry.transferSize || 0;
    if (/question-images\//.test(name)) { meter.imn += 1; meter.imkb += bytes / 1024; }
    else if (/\.(mp4|webm|m4a|mp3|ogg)(\?|$)/.test(name)) { if (!seen.has(name)) { seen.add(name); meter.mkb += bytes / 1024; } }
    else if (/\/data\/|\.json(\?|$)/.test(name)) { meter.dn += 1; meter.dkb += bytes / 1024; }
  };
  try {
    performance.setResourceTimingBufferSize?.(2000);
    new PerformanceObserver((list) => list.getEntries().forEach(measure)).observe({ type: "resource", buffered: true });
  } catch {}

  // 화면을 보고 있던 시간: 보이는 상태에서 최근 30초 안에 입력·스크롤이 있었던 구간만 센다.
  const start = Date.now();
  let active = 0;
  let lastInput = Date.now();
  let maxScroll = 0;
  const poke = () => { lastInput = Date.now(); };
  ["pointerdown", "keydown", "wheel", "touchstart", "scroll"].forEach((type) => addEventListener(type, poke, { passive: true, capture: true }));
  addEventListener("scroll", () => {
    const height = document.documentElement.scrollHeight - innerHeight;
    maxScroll = Math.max(maxScroll, height > 0 ? Math.round((scrollY / height) * 100) : 100);
  }, { passive: true });
  setInterval(() => {
    if (document.visibilityState === "visible" && Date.now() - lastInput < 30000) active += 5000;
  }, 5000);

  let lastLeave = 0;
  const leave = () => {
    if (Date.now() - lastLeave < 1000) return;
    lastLeave = Date.now();
    const round = (value) => Math.round(value);
    const messages = queue.splice(0);
    messages.push({ t: "lv", pid, dur: Date.now() - start, act: active, sc: maxScroll, dn: meter.dn, dkb: round(meter.dkb),
      imn: meter.imn, imkb: round(meter.imkb), mkb: round(meter.mkb) });
    send(messages);
  };
  addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") leave(); });
  addEventListener("pagehide", leave);
  addEventListener("pageshow", (event) => { if (event.persisted) { pid = timeId(); pageView(); } });

  let budget = 40;
  let timer = 0;
  const event = (name, value) => {
    if (budget <= 0) return;
    budget -= 1;
    queue.push({ t: "ev", pid, v: vid, p: path, n: name, x: value == null ? null : String(value).slice(0, 160) });
    clearTimeout(timer);
    timer = setTimeout(() => { if (queue.length) send(queue.splice(0)); }, 1500);
  };
  window.twStat = event;

  // 파일 다운로드: 화면에 없는 <a download>를 .click()으로 누르는 경우까지 잡는다.
  const clicked = new WeakSet();
  const download = (anchor) => {
    if (!anchor?.download || clicked.has(anchor)) return;
    clicked.add(anchor);
    setTimeout(() => clicked.delete(anchor), 0);
    event("download", anchor.download);
  };
  const nativeClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function click() { download(this); return nativeClick.apply(this, arguments); };
  document.addEventListener("click", (e) => {
    const anchor = e.target.closest?.("a[href]");
    if (!anchor) return;
    if (anchor.download) { download(anchor); return; }
    try {
      const url = new URL(anchor.href, location.href);
      if (/^https?:$/.test(url.protocol) && url.host !== location.host) event("out", (url.host + url.pathname).replace(/\/$/, ""));
    } catch {}
  }, true);

  // 표 복사: 캡차를 안 거친 복사는 ds/guard.js가 숫자를 ₩로 바꾼다. 둘을 구분해서 센다.
  const TABLES = ".stats-table, .stats-rank-card, .stats-content table, .table-wrap, .region-card-table";
  document.addEventListener("copy", () => {
    const selection = document.getSelection();
    if (!selection || selection.isCollapsed) return;
    const inTable = [selection.anchorNode, selection.focusNode].some((node) => (node?.nodeType === 1 ? node : node?.parentElement)?.closest(TABLES));
    if (!inTable) return;
    event(window.TwCaptcha?.passed() ? "copy" : "copy_guard", selection.toString().length);
  });
  if (navigator.clipboard?.writeText) {
    const writeText = navigator.clipboard.writeText.bind(navigator.clipboard);
    try {
      navigator.clipboard.writeText = (text) => { event("copy_btn", String(text ?? "").length); return writeText(text); };
    } catch {}
  }

  // 캡차: 처음 통과했는지, 창을 닫고 포기했는지.
  const hookCaptcha = () => {
    const captcha = window.TwCaptcha;
    if (!captcha || captcha.__counted) return;
    const require = captcha.require;
    captcha.require = (...args) => {
      const already = captcha.passed();
      return require.apply(captcha, args).then((ok) => { if (!already) event(ok ? "captcha_pass" : "captcha_cancel"); return ok; });
    };
    captcha.__counted = true;
  };
  hookCaptcha();
  document.addEventListener("DOMContentLoaded", hookCaptcha);
  addEventListener("load", hookCaptcha);

  pageView();
})();

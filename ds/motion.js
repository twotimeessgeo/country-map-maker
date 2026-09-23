/* Page, chart and control motion shared by the public tools. */
(function () {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const seen = new Set();
  const thumbPositions = new Map();
  const thumbIntent = new Map();
  const revealSelector = ".region-card, .kit-card, .kit-period, .map-card, .filter-bar";
  function motionTiming(token) {
    const css = getComputedStyle(document.documentElement);
    return {
      duration: parseFloat(css.getPropertyValue(token)) || 0,
      easing: css.getPropertyValue("--tw-ease-out").trim() || "linear",
    };
  }
  const revealObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target;
          seen.add(element.dataset.motionKey);
          element.classList.add("is-visible");
          for (const svg of element.querySelectorAll(".climograph, .kit-chart")) {
            for (const line of svg.querySelectorAll(".tw-chart-line")) {
              if (typeof line.getTotalLength === "function") {
                line.style.setProperty("--chart-line-length", String(Math.ceil(line.getTotalLength() + 1)));
              }
            }
            svg.classList.add("tw-chart-enter");
            setTimeout(() => svg.classList.remove("tw-chart-enter"), motionTiming("--tw-dur-3").duration);
          }
          revealObserver.unobserve(element);
        }
      }, { threshold: 0.08, rootMargin: "0px 0px 80px 0px" })
    : null;

  function motionKey(element) {
    if (element.dataset.motionKey) return element.dataset.motionKey;
    if (element.classList.contains("region-card")) {
      const id = element.dataset.regionId || element.querySelector("h3")?.textContent || "";
      return `region:${id}`;
    }
    const title = element.querySelector("h3, h4")?.textContent || "";
    const index = [...element.parentElement.children].indexOf(element);
    return `${element.classList[0]}:${title}:${index}`;
  }

  function hashTarget() {
    try { return document.getElementById(decodeURIComponent(window.location.hash.slice(1))); }
    catch { return null; }
  }

  function enhanceReveals(root = document) {
    for (const element of root.querySelectorAll(revealSelector)) {
      if (element.dataset.motionObserved) continue;
      element.dataset.motionObserved = "true";
      element.dataset.motionKey = motionKey(element);
      const rect = element.getBoundingClientRect();
      const inAnchor = hashTarget()?.contains(element);
      if (inAnchor || (rect.top < innerHeight && rect.bottom > 0)) {
        seen.add(element.dataset.motionKey);
        element.classList.add("is-visible");
        continue;
      }
      if (reduced.matches || seen.has(element.dataset.motionKey) || !revealObserver) continue;
      element.classList.add("tw-reveal");
      revealObserver.observe(element);
    }
  }

  function revealAnchored() {
    const target = hashTarget();
    if (!target) return;
    for (const element of target.querySelectorAll(revealSelector)) {
      element.classList.remove("tw-reveal");
      element.classList.add("is-visible");
      revealObserver?.unobserve(element);
    }
  }

  function thumbKey(group) {
    return group.id || group.getAttribute("aria-label") || group.className.replace(/\s*(?:has-motion-thumb|thumb-no-motion)\b/g, "");
  }

  function markThumbIntent(group) {
    const key = thumbKey(group);
    thumbIntent.set(key, true);
    requestAnimationFrame(() => requestAnimationFrame(() => thumbIntent.delete(key)));
  }

  function syncThumb(group) {
    const active = group.querySelector(":scope > .is-active, :scope > [aria-current='page'], :scope > [aria-pressed='true']");
    if (!active) return;
    const key = thumbKey(group);
    const next = { x: active.offsetLeft, width: active.offsetWidth };
    const previous = thumbPositions.get(key);
    const first = !group.dataset.motionThumb;
    const animate = !reduced.matches && thumbIntent.has(key) && previous && (previous.x !== next.x || previous.width !== next.width);
    if (first) {
      group.dataset.motionThumb = "true";
      group.classList.add("has-motion-thumb");
      if (animate) {
        group.style.setProperty("--seg-x", `${previous.x}px`);
        group.style.setProperty("--seg-width", `${previous.width}px`);
        requestAnimationFrame(() => {
          group.style.setProperty("--seg-x", `${next.x}px`);
          group.style.setProperty("--seg-width", `${next.width}px`);
        });
      } else {
        group.style.setProperty("--seg-x", `${next.x}px`);
        group.style.setProperty("--seg-width", `${next.width}px`);
      }
    } else if (group.style.getPropertyValue("--seg-x") !== `${next.x}px` || group.style.getPropertyValue("--seg-width") !== `${next.width}px`) {
      if (!animate) group.classList.add("thumb-no-motion");
      group.style.setProperty("--seg-x", `${next.x}px`);
      group.style.setProperty("--seg-width", `${next.width}px`);
      if (!animate) requestAnimationFrame(() => group.classList.remove("thumb-no-motion"));
    }
    thumbPositions.set(key, next);
    if (animate) thumbIntent.delete(key);
  }

  function enhanceThumbs(root = document) {
    for (const group of root.querySelectorAll(".tw-segmented, .map-scope")) syncThumb(group);
  }

  function enhance(root = document) {
    enhanceReveals(root);
    enhanceThumbs(root);
  }

  function snapshotTray(container) {
    if (!container || reduced.matches) return null;
    return new Map([...container.querySelectorAll("[data-tray-remove-id]")]
      .map((chip) => [chip.dataset.trayRemoveId, chip.getBoundingClientRect()]));
  }

  function animateTray(container, previous) {
    if (!container || !previous || reduced.matches) return;
    const timing = motionTiming("--tw-dur-2");
    for (const chip of container.querySelectorAll("[data-tray-remove-id]")) {
      const old = previous.get(chip.dataset.trayRemoveId);
      if (!old) {
        chip.animate([{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "scale(1)" }], timing);
        continue;
      }
      const next = chip.getBoundingClientRect();
      const dx = old.left - next.left;
      const dy = old.top - next.top;
      if (Math.abs(dx) + Math.abs(dy) < 0.5) continue;
      chip.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], timing);
    }
  }

  function chartShapes(container) {
    if (!container) return [];
    return [...container.querySelectorAll(".kit-chart")].map((svg) =>
      [...svg.querySelectorAll(".tw-value-shape")].map((element) => element.getBoundingClientRect()));
  }

  function snapshotCharts(container) {
    return reduced.matches ? null : chartShapes(container);
  }

  function animateCharts(container, previous) {
    if (!container || !previous || reduced.matches) return;
    const timing = motionTiming("--tw-dur-2");
    [...container.querySelectorAll(".kit-chart")].forEach((svg, chartIndex) => {
      const shapes = [...svg.querySelectorAll(".tw-value-shape")];
      const oldShapes = previous[chartIndex];
      if (!oldShapes || oldShapes.length !== shapes.length) return;
      shapes.forEach((shape, index) => {
        const old = oldShapes[index];
        const next = shape.getBoundingClientRect();
        const dx = old.left + old.width / 2 - next.left - next.width / 2;
        const dy = old.top + old.height / 2 - next.top - next.height / 2;
        const sx = Math.max(0.05, old.width / Math.max(next.width, 0.1));
        const sy = Math.max(0.05, old.height / Math.max(next.height, 0.1));
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(sx - 1) * 10 + Math.abs(sy - 1) * 10 < 0.5) return;
        shape.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transform: "none" }
        ], timing);
      });
    });
  }

  function snapshotChartTicks(container) {
    if (!container || reduced.matches) return null;
    return [...container.querySelectorAll(".kit-chart")].map((svg) =>
      [...svg.querySelectorAll(".tw-axis-tick:not(.tw-axis-tick-old)")].map((tick) => tick.cloneNode(true)));
  }

  function animateChartTicks(container, previous) {
    if (!container || !previous || reduced.matches) return;
    const timing = motionTiming("--tw-dur-1");
    [...container.querySelectorAll(".kit-chart")].forEach((svg, index) => {
      const oldTicks = previous[index] || [];
      const newTicks = [...svg.querySelectorAll(".tw-axis-tick:not(.tw-axis-tick-old)")];
      if (!oldTicks.length || !newTicks.length) return;
      newTicks.forEach((tick) => tick.animate([{ opacity: 0 }, { opacity: 1 }], timing));
      oldTicks.forEach((tick) => {
        tick.classList.add("tw-axis-tick-old");
        svg.appendChild(tick);
        const animation = tick.animate([{ opacity: 1 }, { opacity: 0 }], timing);
        animation.finished.then(() => tick.remove(), () => tick.remove());
      });
    });
  }

  window.TwMotion = { snapshotTray, animateTray, snapshotCharts, animateCharts, snapshotChartTicks, animateChartTicks };
  function syncToolbarMenu() {
    const narrow = matchMedia("(max-width: 390px)").matches;
    for (const menu of document.querySelectorAll(".atlas-more")) {
      if (menu.dataset.toolbarNarrow === String(narrow)) continue;
      menu.dataset.toolbarNarrow = String(narrow);
      menu.open = !narrow;
    }
  }
  function start() {
    const subnav = document.querySelector(".tw-subnav");
    if (subnav) {
      const syncSubnavHeight = () => document.documentElement.style.setProperty("--tw-subnav-h", `${Math.ceil(subnav.getBoundingClientRect().height)}px`);
      syncSubnavHeight();
      if ("ResizeObserver" in window) new ResizeObserver(syncSubnavHeight).observe(subnav);
      else window.addEventListener("resize", syncSubnavHeight);
    }
    let firstVisit = false;
    try {
      firstVisit = !sessionStorage.getItem("tw-motion-hero-seen");
      sessionStorage.setItem("tw-motion-hero-seen", "true");
    } catch { /* Navigation still works without session storage. */ }
    if (firstVisit && !reduced.matches) {
      for (const hero of document.querySelectorAll(".tw-hero")) hero.classList.add("tw-hero-sequence");
    }
    enhance();
    window.addEventListener("hashchange", revealAnchored);
    document.addEventListener("pointerdown", (event) => {
      const group = event.target.closest?.(".tw-segmented, .map-scope");
      if (group) markThumbIntent(group);
    }, true);
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const group = event.target.closest?.(".tw-segmented, .map-scope");
      if (group) markThumbIntent(group);
    }, true);
    syncToolbarMenu();
    window.addEventListener("resize", syncToolbarMenu);
    for (const menu of document.querySelectorAll(".atlas-more")) {
      menu.addEventListener("click", (event) => {
        if (matchMedia("(max-width: 390px)").matches && event.target.closest("button")) menu.open = false;
      });
    }
    let pending = false;
    const motionObserver = new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        enhance();
      });
    });
    if (document.body) motionObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-pressed", "class", "aria-current"],
    });
    window.addEventListener("resize", () => requestAnimationFrame(() => enhanceThumbs()));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();

/* Page, chart and control motion shared by the public tools. */
(function () {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const seen = new Set();
  const thumbPositions = new Map();
  const revealSelector = ".region-card, .kit-card, .kit-period, .map-card, .filter-bar";
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
            setTimeout(() => svg.classList.remove("tw-chart-enter"), 400);
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

  function enhanceReveals(root = document) {
    for (const element of root.querySelectorAll(revealSelector)) {
      if (element.dataset.motionObserved) continue;
      element.dataset.motionObserved = "true";
      element.dataset.motionKey = motionKey(element);
      if (reduced.matches || seen.has(element.dataset.motionKey) || !revealObserver) continue;
      element.classList.add("tw-reveal");
      revealObserver.observe(element);
    }
  }

  function enhanceThumbs(root = document) {
    for (const group of root.querySelectorAll(".tw-segmented, .map-scope")) {
      if (group.dataset.motionThumb) continue;
      const active = group.querySelector(":scope > .is-active, :scope > [aria-current='page'], :scope > [aria-pressed='true']");
      if (!active) continue;
      const key = group.getAttribute("aria-label") || group.id || group.className;
      const next = { x: active.offsetLeft, width: active.offsetWidth };
      const previous = thumbPositions.get(key) || (group.classList.contains("app-switch")
        ? JSON.parse(sessionStorage.getItem("tw-motion-app-switch") || "null")
        : null);
      group.dataset.motionThumb = "true";
      group.classList.add("has-motion-thumb");
      group.style.setProperty("--seg-x", `${previous?.x ?? next.x}px`);
      group.style.setProperty("--seg-width", `${previous?.width ?? next.width}px`);
      if (previous && !reduced.matches && previous.x !== next.x) {
        requestAnimationFrame(() => {
          group.style.setProperty("--seg-x", `${next.x}px`);
          group.style.setProperty("--seg-width", `${next.width}px`);
        });
      } else {
        group.style.setProperty("--seg-x", `${next.x}px`);
        group.style.setProperty("--seg-width", `${next.width}px`);
      }
      thumbPositions.set(key, next);
      if (group.classList.contains("app-switch")) {
        sessionStorage.setItem("tw-motion-app-switch", JSON.stringify(next));
      }
    }
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
    for (const chip of container.querySelectorAll("[data-tray-remove-id]")) {
      const old = previous.get(chip.dataset.trayRemoveId);
      if (!old) {
        chip.animate([{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "scale(1)" }], {
          duration: 200, easing: "cubic-bezier(0.16, 1, 0.3, 1)"
        });
        continue;
      }
      const next = chip.getBoundingClientRect();
      const dx = old.left - next.left;
      const dy = old.top - next.top;
      if (Math.abs(dx) + Math.abs(dy) < 0.5) continue;
      chip.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], {
        duration: 200, easing: "cubic-bezier(0.16, 1, 0.3, 1)"
      });
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
        ], { duration: 240, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
      });
    });
  }

  window.TwMotion = { snapshotTray, animateTray, snapshotCharts, animateCharts };
  function start() {
    if (!reduced.matches) {
      for (const hero of document.querySelectorAll(".tw-hero")) hero.classList.add("tw-hero-sequence");
    }
    enhance();
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        enhance();
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();

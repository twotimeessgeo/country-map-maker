/*
 * Climate Atlas — map zoom & pan.
 * +/− buttons, double-click, ⌘/Ctrl + wheel or trackpad pinch to zoom; drag to pan when zoomed.
 * The app re-renders #worldMap on every change, so the view is kept here and re-applied.
 * Markers stay the same on-screen size (counter-scaled via --map-k in styles.css).
 */
(function () {
  const host = document.querySelector("#worldMap");
  if (!host) return;

  const MAX_ZOOM = 8;
  const view = { k: 1, x: 0, y: 0 };
  let frame = null;
  let drag = null;
  let suppressClick = false;

  function layers() {
    if (!frame) return [];
    return [...frame.children].filter((el) => !el.classList.contains("map-zoom-controls"));
  }

  function clamp() {
    const w = frame.clientWidth;
    const h = frame.clientHeight;
    view.k = Math.min(MAX_ZOOM, Math.max(1, view.k));
    view.x = Math.min(0, Math.max(w - w * view.k, view.x));
    view.y = Math.min(0, Math.max(h - h * view.k, view.y));
  }

  function apply() {
    if (!frame) return;
    clamp();
    const transform = view.k === 1 ? "" : `translate(${view.x}px, ${view.y}px) scale(${view.k})`;
    layers().forEach((el) => {
      el.style.transformOrigin = "0 0";
      el.style.transform = transform;
    });
    frame.style.setProperty("--map-k", String(view.k));
    frame.classList.toggle("is-zoomed", view.k > 1.001);
    const controls = frame.querySelector(".map-zoom-controls");
    if (controls) {
      controls.querySelector("[data-zoom='in']").disabled = view.k >= MAX_ZOOM;
      controls.querySelector("[data-zoom='out']").disabled = view.k <= 1;
      controls.querySelector("[data-zoom='reset']").hidden = view.k <= 1;
    }
  }

  function zoomAt(factor, px, py) {
    const next = Math.min(MAX_ZOOM, Math.max(1, view.k * factor));
    view.x = px - ((px - view.x) * next) / view.k;
    view.y = py - ((py - view.y) * next) / view.k;
    view.k = next;
    apply();
  }

  function local(event) {
    const rect = frame.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  function attach() {
    const next = host.querySelector(".world-map-frame");
    if (!next || next === frame) return;
    frame = next;
    const controls = document.createElement("div");
    controls.className = "map-zoom-controls";
    controls.innerHTML = `
      <button type="button" data-zoom="in" aria-label="확대">+</button>
      <button type="button" data-zoom="out" aria-label="축소">−</button>
      <button type="button" data-zoom="reset" aria-label="전체 보기" hidden>전체</button>`;
    frame.appendChild(controls);
    apply();
  }

  new MutationObserver(attach).observe(host, { childList: true, subtree: true });
  attach();

  host.addEventListener("click", (event) => {
    const button = event.target.closest(".map-zoom-controls button");
    if (!button || !frame) return;
    event.stopPropagation();
    const cx = frame.clientWidth / 2;
    const cy = frame.clientHeight / 2;
    if (button.dataset.zoom === "in") zoomAt(2, cx, cy);
    if (button.dataset.zoom === "out") zoomAt(0.5, cx, cy);
    if (button.dataset.zoom === "reset") {
      view.k = 1;
      view.x = 0;
      view.y = 0;
      apply();
    }
  });

  host.addEventListener(
    "click",
    (event) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.stopPropagation();
      event.preventDefault();
    },
    true
  );

  host.addEventListener("dblclick", (event) => {
    if (!frame || !frame.contains(event.target) || event.target.closest("button")) return;
    event.preventDefault();
    const [px, py] = local(event);
    zoomAt(2, px, py);
  });

  host.addEventListener(
    "wheel",
    (event) => {
      if (!frame || !frame.contains(event.target) || !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      const [px, py] = local(event);
      zoomAt(Math.exp(-event.deltaY * 0.01), px, py);
    },
    { passive: false }
  );

  host.addEventListener("pointerdown", (event) => {
    if (!frame || view.k <= 1 || !frame.contains(event.target) || event.target.closest(".map-zoom-controls")) return;
    if (event.button !== 0) return;
    drag = { id: event.pointerId, sx: event.clientX, sy: event.clientY, x: view.x, y: view.y, moved: false };
  });

  window.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.sx;
    const dy = event.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    frame.classList.add("is-panning");
    view.x = drag.x + dx;
    view.y = drag.y + dy;
    apply();
  });

  window.addEventListener("pointerup", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.moved) suppressClick = true;
    frame?.classList.remove("is-panning");
    drag = null;
    setTimeout(() => {
      suppressClick = false;
    }, 0);
  });

  window.addEventListener("resize", apply);
})();

/*
 * Climate Atlas — map zoom & pan.
 * +/− buttons, double-click, ⌘/Ctrl + wheel or trackpad pinch to zoom; drag to pan when zoomed.
 * The app re-renders #worldMap on every change, so the view is kept here and re-applied.
 * The SVG viewBox changes while HTML markers keep their on-screen size.
 */
(function () {
  const host = document.querySelector("#worldMap");
  if (!host) return;

  const MAX_ZOOM = 8;
  const view = { k: 1, x: 0, y: 0 };
  let frame = null;
  let svg = null;
  let baseWidth = 1000;
  let baseHeight = 520;
  let markers = [];
  let drag = null;
  let animation = 0;
  let highResPromise = null;
  let highResTopology = null;
  let highResRejected = false;
  let highResPending = false;
  const pointers = new Map();
  let pinch = null;
  let suppressClick = false;
  let mapScope = null;
  let previousSelected = null;
  let gestureFrame = 0;
  let gestureTimer = 0;
  let gesturePending = null;
  let gestureActive = false;

  function clamp() {
    view.k = Math.min(MAX_ZOOM, Math.max(1, view.k));
    view.x = Math.min(baseWidth * (1 - 1 / view.k), Math.max(0, view.x));
    view.y = Math.min(baseHeight * (1 - 1 / view.k), Math.max(0, view.y));
  }

  function apply() {
    if (!frame || !svg) return;
    clamp();
    const width = baseWidth / view.k;
    const height = baseHeight / view.k;
    svg.setAttribute("viewBox", `${view.x} ${view.y} ${width} ${height}`);
    const ocean = svg.querySelector(".map-ocean");
    if (ocean) {
      ocean.setAttribute("x", String(view.x));
      ocean.setAttribute("y", String(view.y));
      ocean.setAttribute("width", String(width));
      ocean.setAttribute("height", String(height));
    }
    const frameWidth = frame.clientWidth;
    const frameHeight = frame.clientHeight;
    for (const marker of markers) {
      const x = ((marker._mapX - view.x) / width) * 100;
      const y = ((marker._mapY - view.y) / height) * 100;
      marker.style.setProperty("--marker-zoom-dx", `${(x - marker._mapX / baseWidth * 100) * frameWidth / 100}px`);
      marker.style.setProperty("--marker-zoom-dy", `${(y - marker._mapY / baseHeight * 100) * frameHeight / 100}px`);
      const outside = x < -2 || x > 102 || y < -2 || y > 102;
      if (marker.hidden !== outside) marker.hidden = outside;
    }
    frame.style.setProperty("--map-k", String(view.k));
    frame.style.setProperty("--grid-dash", `${3 / view.k}px`);
    frame.style.setProperty("--grid-gap", `${6 / view.k}px`);
    frame.classList.toggle("is-zoomed", view.k > 1.001);
    const controls = frame.querySelector(".map-zoom-controls");
    if (controls) {
      controls.querySelector("[data-zoom='in']").disabled = view.k >= MAX_ZOOM - 0.001;
      controls.querySelector("[data-zoom='out']").disabled = view.k <= 1.001;
      controls.querySelector("[data-zoom='reset']").hidden = view.k <= 1.001;
      const level=controls.querySelector(".map-zoom-level");
      if(level){level.hidden=view.k<=1.001;level.textContent=`×${Number(view.k.toFixed(1))}`;}
    }
    if (!gestureActive) {
      layoutLabels();
      if (view.k >= 3 && !frame.classList.contains("is-korea")) void loadHighResolution();
    }
  }

  function cancelAnimation() {
    if (animation) cancelAnimationFrame(animation);
    animation = 0;
  }

  function cancelGesture() {
    if (gestureFrame) cancelAnimationFrame(gestureFrame);
    clearTimeout(gestureTimer);
    gestureFrame = 0;
    gestureTimer = 0;
    gesturePending = null;
    gestureActive = false;
  }

  function finishGesture() {
    if (gestureFrame) {
      gestureTimer = setTimeout(finishGesture, 16);
      return;
    }
    gestureTimer = 0;
    gestureActive = false;
    layoutLabels();
    if (view.k >= 3 && frame && !frame.classList.contains("is-korea")) void loadHighResolution();
  }

  function queueGesture(next) {
    cancelAnimation();
    gestureActive = true;
    gesturePending = next;
    if (!gestureFrame) gestureFrame = requestAnimationFrame(() => {
      gestureFrame = 0;
      Object.assign(view, gesturePending);
      gesturePending = null;
      apply();
    });
    clearTimeout(gestureTimer);
    gestureTimer = setTimeout(finishGesture, 150);
  }

  function easeFromToken(progress, controls) {
    if (!controls || controls.length !== 4 || controls.some((value) => !Number.isFinite(value))) return progress;
    const [x1, y1, x2, y2] = controls;
    const curve = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
    let low = 0, high = 1;
    for (let step = 0; step < 12; step += 1) {
      const middle = (low + high) / 2;
      if (curve(middle, x1, x2) < progress) low = middle;
      else high = middle;
    }
    return curve((low + high) / 2, y1, y2);
  }

  function setView(next, animate = false) {
    cancelGesture();
    cancelAnimation();
    const css = getComputedStyle(document.documentElement);
    const duration = parseFloat(css.getPropertyValue("--tw-climate-map-dur")) || parseFloat(css.getPropertyValue("--tw-dur-2")) || 0;
    if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches || !duration) {
      Object.assign(view, next);
      apply();
      return;
    }
    const controls = css.getPropertyValue("--tw-ease-out")
      .match(/cubic-bezier\(([^)]+)\)/)?.[1].split(",").map(Number);
    const start = { ...view };
    const begun = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - begun) / duration);
      const t = easeFromToken(progress, controls);
      for (const key of ["k", "x", "y"]) view[key] = start[key] + (next[key] - start[key]) * t;
      apply();
      animation = progress < 1 ? requestAnimationFrame(tick) : 0;
    }
    animation = requestAnimationFrame(tick);
  }

  function zoomTarget(source, factor, px, py) {
    const k = Math.min(MAX_ZOOM, Math.max(1, source.k * factor));
    const cx = px / frame.clientWidth;
    const cy = py / frame.clientHeight;
    const anchorX = source.x + cx * baseWidth / source.k;
    const anchorY = source.y + cy * baseHeight / source.k;
    return { k, x: anchorX - cx * baseWidth / k, y: anchorY - cy * baseHeight / k };
  }

  function zoomAt(factor, px, py, animate = false) {
    setView(zoomTarget(view, factor, px, py), animate);
  }

  function queueZoom(factor, px, py) {
    queueGesture(zoomTarget(gesturePending ?? view, factor, px, py));
  }

  function layoutLabels() {
    if (view.k <= 1.001) return;
    const bounds = frame.getBoundingClientRect();
    const placed = [];
    const mobile = matchMedia("(max-width: 760px)").matches;
    const canvas = layoutLabels.canvas ?? (layoutLabels.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = `${mobile ? 11 : 12}px sans-serif`;
    for (const marker of markers) {
      marker.removeAttribute("data-zoom-label-hidden");
      marker.classList.remove("label-below");
      marker.style.removeProperty("--label-shift-x");
      if (!marker.classList.contains("is-selected") || marker.hidden) continue;
      const rect = marker.getBoundingClientRect();
      const center = rect.left + rect.width / 2 - bounds.left;
      const top = rect.top - bounds.top;
      const label = mobile ? marker.dataset.mobileLabel : marker.dataset.label;
      const width = (context?.measureText(label || "").width ?? (label || "").length * 8) + (mobile ? 18 : 24);
      const height = mobile ? 24 : 29;
      const left = Math.max(2, Math.min(bounds.width - width - 2, center - width / 2));
      const below = top - height - 10 < 0;
      const y = below ? top + rect.height + 8 : top - height - 10;
      const box = { left, right: left + width, top: y, bottom: y + height };
      if (placed.some((other) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)) {
        marker.dataset.zoomLabelHidden = "true";
        continue;
      }
      marker.style.setProperty("--label-shift-x", `${left + width / 2 - center}px`);
      marker.classList.toggle("label-below", below);
      placed.push(box);
    }
  }

  async function loadHighResolution() {
    if (gestureActive || frame.dataset.mapResolution === "10m" || highResRejected || highResPending) return;
    if (!highResPromise) {
      highResPromise = fetch("./data/world-countries-10m.json")
        .then((response) => {
          if (!response.ok) throw new Error(`10m map: ${response.status}`);
          return response.json();
        })
        .then((topology) => (highResTopology = topology));
    }
    try {
      await highResPromise;
      if (!frame || gestureActive || frame.classList.contains("is-korea") || view.k < 3 || frame.dataset.mapResolution === "10m") return;
      const projection = typeof buildMapProjection === "function" ? buildMapProjection() : null;
      if (!projection || !window.topojson) return;
      const path = window.d3.geoPath(projection);
      const countries = highResTopology.objects.countries;
      const land = highResTopology.objects.land ?? countries;
      const landFeature=window.topojson.feature(highResTopology,land);
      const countryFeatures=window.topojson.feature(highResTopology,countries);
      const features=countryFeatures.type==="FeatureCollection"?countryFeatures.features:[countryFeatures];
      if(window.d3.geoArea(landFeature)>2*Math.PI||features.some(feature=>window.d3.geoArea(feature)>2*Math.PI)) {
        highResRejected=true;
        console.warn("High-resolution map has invalid polygon winding; keeping 50m map");
        return;
      }
      const landPath=path(landFeature);
      const borderPath=path(window.topojson.mesh(highResTopology,countries,(a,b)=>a!==b));
      const nextFrame=frame,nextSvg=svg;
      highResPending=true;
      requestAnimationFrame(()=>{
        highResPending=false;
        if(frame!==nextFrame||svg!==nextSvg||gestureActive||view.k<3||nextFrame.classList.contains("is-korea"))return;
        const landNode=nextSvg.querySelector(".map-landmass"),borderNode=nextSvg.querySelector(".map-country-borders");
        if(!landNode||!borderNode)return;
        landNode.setAttribute("d",landPath);
        borderNode.setAttribute("d",borderPath);
        nextFrame.dataset.mapResolution="10m";
      });
    } catch (error) {
      highResPromise = null;
      console.warn("High-resolution map unavailable", error);
    }
  }

  function local(event) {
    const rect = frame.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  function focusMarkerOnMobile(marker) {
    if (!frame || !marker || !matchMedia("(max-width: 760px)").matches || view.k > 1.51) return false;
    const rect = marker.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const crowded = markers.some((other) => {
      if (other === marker || other.hidden) return false;
      const point = other.getBoundingClientRect();
      return Math.hypot(point.left + point.width / 2 - centerX, point.top + point.height / 2 - centerY) < 20;
    });
    if (!crowded) return false;
    const [x, y] = local({ clientX: centerX, clientY: centerY });
    zoomAt(2, x, y, true);
    return true;
  }

  window.ClimateMapZoom = { focusMarkerOnMobile };

  function fitSelected() {
    const selected=markers.filter(marker=>marker.classList.contains("is-selected"));
    if(!selected.length)return {k:1,x:0,y:0};
    const xs=selected.map(marker=>marker._mapX),ys=selected.map(marker=>marker._mapY);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const width=Math.max((maxX-minX)/.76,baseWidth/4),height=Math.max((maxY-minY)/.76,baseHeight/4);
    const k=Math.max(1,Math.min(MAX_ZOOM,baseWidth/width,baseHeight/height));
    return {k,x:(minX+maxX)/2-baseWidth/(2*k),y:(minY+maxY)/2-baseHeight/(2*k)};
  }

  function pulseSelection() {
    const selected=new Set(markers.filter(marker=>marker.classList.contains("is-selected")).map(marker=>marker.dataset.mapRegionId));
    if(previousSelected)for(const marker of markers) {
      const id=marker.dataset.mapRegionId;
      const action=selected.has(id)&&!previousSelected.has(id)?"is-selecting":!selected.has(id)&&previousSelected.has(id)?"is-deselecting":"";
      if(!action)continue;
      marker.classList.remove("is-selecting","is-deselecting");
      void marker.offsetWidth;
      marker.classList.add(action);
      const duration=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tw-climate-marker-dur"))||420;
      setTimeout(()=>marker.classList.remove(action),duration+30);
    }
    previousSelected=selected;
  }

  function attach() {
    const next = host.querySelector(".world-map-frame");
    if (!next || next === frame) return;
    cancelAnimation();
    cancelGesture();
    const oldScope=mapScope;
    frame = next;
    mapScope=frame.dataset.mapScope||"all";
    svg = frame.querySelector(".world-map-svg");
    if (!svg) return;
    baseWidth = svg.viewBox.baseVal.width;
    baseHeight = svg.viewBox.baseVal.height;
    markers = [...frame.querySelectorAll(".map-marker")];
    for (const marker of markers) {
      marker._mapX = parseFloat(marker.style.left) * baseWidth / 100;
      marker._mapY = parseFloat(marker.style.top) * baseHeight / 100;
    }
    pulseSelection();
    if (!attach.mobileStarted && matchMedia("(max-width: 760px)").matches) {
      attach.mobileStarted = true;
      const selected = markers.filter((marker) => marker.classList.contains("is-selected"));
      const targets = selected.length ? selected : markers;
      const centerX = targets.length ? targets.reduce((sum, marker) => sum + marker._mapX, 0) / targets.length : baseWidth / 2;
      const centerY = targets.length ? targets.reduce((sum, marker) => sum + marker._mapY, 0) / targets.length : baseHeight / 2;
      view.k = 1.5;
      view.x = centerX - baseWidth / (2 * view.k);
      view.y = centerY - baseHeight / (2 * view.k);
    }
    const controls = document.createElement("div");
    controls.className = "map-zoom-controls";
    controls.innerHTML = `
      <span class="map-zoom-level" aria-label="확대 배율" hidden></span>
      <button type="button" data-zoom="in" aria-label="확대">+</button>
      <button type="button" data-zoom="out" aria-label="축소">−</button>
      <button type="button" data-zoom="reset" aria-label="전체 보기" hidden>전체</button>`;
    frame.appendChild(controls);
    if(mapScope==="selected")setView(fitSelected(),oldScope!==null);
    else if(oldScope==="selected")setView({k:1,x:0,y:0},true);
    else apply();
  }

  new MutationObserver(attach).observe(host, { childList: true, subtree: true });
  attach();
  host.addEventListener("climate-map-selection",()=>{pulseSelection();apply();});

  host.addEventListener("click", (event) => {
    const button = event.target.closest(".map-zoom-controls button");
    if (!button || !frame) return;
    event.stopPropagation();
    const cx = frame.clientWidth / 2;
    const cy = frame.clientHeight / 2;
    if (button.dataset.zoom === "in") zoomAt(2, cx, cy, true);
    if (button.dataset.zoom === "out") zoomAt(0.5, cx, cy, true);
    if (button.dataset.zoom === "reset") {
      setView({ k: 1, x: 0, y: 0 }, true);
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
    zoomAt(2, px, py, true);
  });

  host.addEventListener(
    "wheel",
    (event) => {
      if (!frame || !frame.contains(event.target) || !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      const [px, py] = local(event);
      queueZoom(Math.max(0.75, Math.min(1.25, Math.exp(-event.deltaY * 0.02))), px, py);
    },
    { passive: false }
  );

  host.addEventListener("pointerdown", (event) => {
    if (!frame || !frame.contains(event.target) || event.target.closest(".map-zoom-controls")) return;
    if (event.pointerType !== "touch" && event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    cancelAnimation();
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const center = { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 };
      pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), k: view.k, x: view.x, y: view.y, at: local(center) };
      drag = null;
    } else if (view.k > 1) {
      drag = { id: event.pointerId, sx: event.clientX, sy: event.clientY, x: view.x, y: view.y, moved: false };
    }
  });

  window.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId) || !frame) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const center = local({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      const k = Math.max(1, Math.min(MAX_ZOOM, pinch.k * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.distance)));
      const cx = center[0] / frame.clientWidth;
      const cy = center[1] / frame.clientHeight;
      const anchorX = pinch.x + pinch.at[0] / frame.clientWidth * baseWidth / pinch.k;
      const anchorY = pinch.y + pinch.at[1] / frame.clientHeight * baseHeight / pinch.k;
      queueGesture({ k, x: anchorX - cx * baseWidth / k, y: anchorY - cy * baseHeight / k });
      return;
    }
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.sx;
    const dy = event.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    frame.classList.add("is-panning");
    queueGesture({
      k: view.k,
      x: drag.x - dx * baseWidth / view.k / frame.clientWidth,
      y: drag.y - dy * baseHeight / view.k / frame.clientHeight,
    });
  });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (pinch) {
      if (pointers.size < 2) pinch = null;
      suppressClick = true;
    }
    if (drag?.id === event.pointerId) {
      if (drag.moved) suppressClick = true;
      drag = null;
    }
    frame?.classList.remove("is-panning");
    setTimeout(() => {
      suppressClick = false;
    }, 0);
  }
  window.addEventListener("pointerup", endPointer);
  window.addEventListener("pointercancel", endPointer);

  window.addEventListener("resize", apply);
})();

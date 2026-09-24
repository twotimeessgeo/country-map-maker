/* Small, unfilled orthographic globe. Coastlines are derived from world-atlas 110m. */
(() => {
  const canvases = [...document.querySelectorAll("canvas[data-globe]")];
  if (!canvases.length) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const DEG = Math.PI / 180;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const normalize = angle => ((angle + 540) % 360) - 180;
  const source = canvases[0].dataset.globeSrc || "./ds/globe-land.json";
  fetch(source).then(response => {
    if (!response.ok) throw new Error(`Globe land ${response.status}`);
    return response.json();
  }).then(data => canvases.forEach(canvas => mount(canvas, data.map(ring => {
    const points = [];
    for (let i = 0; i < ring.length; i += 2) points.push([ring[i] / 10, ring[i + 1] / 10]);
    return points;
  })))).catch(error => console.error(error));

  function mount(canvas, land) {
    const ctx = canvas.getContext("2d");
    let width = 240, yaw = 127, pitch = 20, progress = reduced.matches ? 1 : 0;
    let drag = null, vx = 0, vy = 0, motion = 0, lastFrame = 0, lastTap = 0;
    const graticule = [];
    for (let lon = -180; lon <= 180; lon += 30) {
      const line = [];
      for (let lat = -90; lat <= 90; lat += 3) line.push([lon, lat]);
      graticule.push(line);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const line = [];
      for (let lon = -180; lon <= 180; lon += 3) line.push([lon, lat]);
      graticule.push(line);
    }
    function resize() {
      width = canvas.getBoundingClientRect().width || 240;
      const dpr = devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(width * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render();
    }
    function project([lon, lat]) {
      const lambda = normalize(lon - yaw) * DEG, phi = lat * DEG, phi0 = pitch * DEG;
      const cos = Math.cos(phi), sin = Math.sin(phi);
      return {
        x: cos * Math.sin(lambda),
        y: Math.cos(phi0) * sin - Math.sin(phi0) * cos * Math.cos(lambda),
        z: Math.sin(phi0) * sin + Math.cos(phi0) * cos * Math.cos(lambda),
      };
    }
    function horizon(a, b) {
      let lo = 0, hi = 1;
      const delta = normalize(b[0] - a[0]);
      const front = project(a).z >= 0;
      for (let i = 0; i < 12; i++) {
        const t = (lo + hi) / 2;
        const point = [a[0] + delta * t, a[1] + (b[1] - a[1]) * t];
        if ((project(point).z >= 0) === front) lo = t;
        else hi = t;
      }
      return project([a[0] + delta * (lo + hi) / 2, a[1] + (b[1] - a[1]) * (lo + hi) / 2]);
    }
    function trace(points, radius, center) {
      if (points.length < 2) return;
      ctx.beginPath();
      let previous = project(points[0]);
      for (let i = 1; i < points.length; i++) {
        const current = project(points[i]);
        if (previous.z >= 0 && current.z >= 0) {
          if (i === 1 || project(points[i - 2]).z < 0) ctx.moveTo(center + previous.x * radius, center - previous.y * radius);
          ctx.lineTo(center + current.x * radius, center - current.y * radius);
        } else if ((previous.z >= 0) !== (current.z >= 0)) {
          const edge = horizon(points[i - 1], points[i]);
          if (previous.z >= 0) {
            ctx.moveTo(center + previous.x * radius, center - previous.y * radius);
            ctx.lineTo(center + edge.x * radius, center - edge.y * radius);
          } else {
            ctx.moveTo(center + edge.x * radius, center - edge.y * radius);
            ctx.lineTo(center + current.x * radius, center - current.y * radius);
          }
        }
        previous = current;
      }
      ctx.stroke();
    }
    function render() {
      const center = width / 2, radius = width / 2 - 3;
      ctx.clearRect(0, 0, width, width);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = "#0d0d0d";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * Math.min(1, progress * 2));
      ctx.stroke();
      if (progress < .5) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width * Math.min(1, (progress - .5) * 2), width);
      ctx.clip();
      ctx.strokeStyle = "rgba(13,13,13,.09)";
      ctx.lineWidth = .6;
      for (const line of graticule) trace(line, radius, center);
      ctx.strokeStyle = "#0d0d0d";
      ctx.lineWidth = .8;
      for (const ring of land) trace(ring, radius, center);
      ctx.restore();
    }
    function cancelMotion() { if (motion) cancelAnimationFrame(motion); motion = 0; }
    function settle(time) {
      const dt = Math.min(48, time - (lastFrame || time));
      lastFrame = time;
      const decay = Math.pow(.93, dt / 16.67);
      vx *= decay; vy *= decay;
      yaw = normalize(yaw + vx * dt / 16.67);
      pitch = clamp(pitch + vy * dt / 16.67, -45, 45);
      render();
      if (Math.abs(vx) + Math.abs(vy) > .04) motion = requestAnimationFrame(settle);
      else motion = 0;
    }
    function tweenTo(targetYaw, targetPitch, duration = 500) {
      cancelMotion();
      if (reduced.matches) { yaw = targetYaw; pitch = targetPitch; render(); return; }
      const startYaw = yaw, startPitch = pitch, delta = normalize(targetYaw - yaw), start = performance.now();
      const frame = time => {
        const t = clamp((time - start) / duration, 0, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        yaw = normalize(startYaw + delta * ease);
        pitch = startPitch + (targetPitch - startPitch) * ease;
        render();
        motion = t < 1 ? requestAnimationFrame(frame) : 0;
      };
      motion = requestAnimationFrame(frame);
    }
    canvas.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      cancelMotion();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), moved: false };
      vx = vy = 0;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("is-dragging");
    });
    canvas.addEventListener("pointermove", event => {
      if (!drag || event.pointerId !== drag.id) return;
      const now = performance.now(), dt = Math.max(1, now - drag.time);
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 1) drag.moved = true;
      yaw = normalize(yaw - dx * .65);
      pitch = clamp(pitch + dy * .45, -45, 45);
      vx = clamp(-dx * .65 * 16.67 / dt, -12, 12);
      vy = clamp(dy * .45 * 16.67 / dt, -8, 8);
      drag.x = event.clientX; drag.y = event.clientY; drag.time = now;
      render();
    });
    function endDrag(event) {
      if (!drag || event.pointerId !== drag.id) return;
      const moved = drag.moved;
      drag = null;
      canvas.classList.remove("is-dragging");
      if (event.type === "pointercancel") return;
      if (!moved) {
        const now = performance.now();
        if (now - lastTap < 320) { lastTap = 0; tweenTo(127, 20); return; }
        lastTap = now;
      }
      if (!reduced.matches && moved && Math.abs(vx) + Math.abs(vy) > .04) {
        lastFrame = 0;
        motion = requestAnimationFrame(settle);
      }
    }
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("dblclick", () => tweenTo(127, 20));
    canvas.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault(); cancelMotion();
      if (event.key === "ArrowLeft") yaw = normalize(yaw - 15);
      if (event.key === "ArrowRight") yaw = normalize(yaw + 15);
      if (event.key === "ArrowUp") pitch = clamp(pitch + 10, -45, 45);
      if (event.key === "ArrowDown") pitch = clamp(pitch - 10, -45, 45);
      render();
    });
    canvas.addEventListener("pointerenter", event => {
      if (event.pointerType !== "mouse" || sessionStorage.getItem("tw-globe-hover")) return;
      sessionStorage.setItem("tw-globe-hover", "1");
      tweenTo(yaw + 6, pitch, 400);
    }, { once: true });
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else addEventListener("resize", resize);
    resize();
    if (!reduced.matches) {
      const start = performance.now();
      const intro = time => {
        progress = clamp((time - start) / 600, 0, 1);
        render();
        if (progress < 1) requestAnimationFrame(intro);
      };
      requestAnimationFrame(intro);
    }
  }
})();

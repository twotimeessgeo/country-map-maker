// Source of ds/merid-3d.js. Rebuild: npx esbuild scripts/merid-3d.src.js --bundle --minify --format=iife --target=es2020 --legal-comments=none --outfile=ds/merid-3d.js  (needs three@0.170)
/* Home: the armillary sundial (ds/armillary.glb) in polished steel on black.
   three.js + GLTFLoader and a small strip-light studio for reflections, bundled into one file (ds/merid-3d.js).
   Slow turntable spin, drag to turn; still with reduced motion; the stipple drawing stays as the fallback. */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const host = document.querySelector("[data-armillary]");
if (host) start(host);

function start(host) {
  const canvas = document.createElement("canvas");
  canvas.className = "home-3d";
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch { return; }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  // a black studio to mirror: long strip lights and two softboxes, so the steel shows crisp streaks, not grey
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new THREE.Scene(); studio.background = new THREE.Color(0x000000);
  const lamp = (w, h, x, y, z, ry, rz, k) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide, toneMapped: false });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    q.position.set(x, y, z); q.lookAt(0, 0, 0); q.rotateZ(rz || 0); studio.add(q);
  };
  lamp(0.5, 9, -4.5, 1.5, 3.5, 0, 0, 5.5);     // tall strip, front left
  lamp(0.35, 9, 5, 1, 2.5, 0, 0, 3.5);         // tall strip, front right
  lamp(0.3, 10, 1.5, 0, -6, 0, 0, 2.5);        // back strip for rims
  lamp(6, 3, 0, 6.5, 1.5, 0, 0, 2.2);          // overhead softbox
  lamp(9, 0.25, 0, -1.2, 6, 0, 0, 1.4);        // low horizontal line
  lamp(3, 3, -5, -2, -3, 0, 0, 0.8);           // faint fill from behind
  lamp(14, 7, -2, 2, 8, 0, 0, 0.22);          // a wide, dim wall behind the viewer: broad faces keep some tone
  lamp(14, 7, 3, 1, -9, 0, 0, 0.12);
  scene.environment = pmrem.fromScene(studio, 0.015).texture;
  scene.environmentIntensity = 1.0;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  const pivot = new THREE.Group(); scene.add(pivot);

  const steel = new THREE.MeshStandardMaterial({ color: 0xf4f5f7, metalness: 1, roughness: 0.035 });
  const band = new THREE.MeshStandardMaterial({ color: 0xeef0f2, metalness: 1, roughness: 0.07 });

  let model = null, size = new THREE.Vector3();
  new GLTFLoader().load(host.dataset.armillary, gltf => {
    model = gltf.scene;
    const drop = [];
    model.traverse(o => {
      if (!o.isMesh) return;
      if (/slab|ground|cube/i.test(o.name) || /stone/i.test(o.material?.name || "")) { drop.push(o); return; }
      o.material = /band/i.test(o.material?.name || o.name) ? band : steel;
    });
    drop.forEach(o => o.parent.remove(o));
    const box = new THREE.Box3().setFromObject(model);
    box.getSize(size); const c = box.getCenter(new THREE.Vector3());
    model.position.sub(c);                       // turn about the sculpture's own centre
    pivot.add(model);
    fit();
    host.appendChild(canvas);
    requestAnimationFrame(() => { canvas.classList.add("is-live"); host.classList.add("has-3d"); });
    loop(performance.now());
  }, undefined, () => {});

  // fill the height (a little cut at the bottom) and sit a touch right of centre
  function fit() {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tall = Math.max(size.y, size.x * 0.7) || 4;
    const phone = w / h < 0.8;
    const fill = phone ? 0.78 : 1.08;            // share of the viewport height the sculpture takes
    const dist = (tall / fill) / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, tall * 0.02, dist);
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(w, h, phone ? w * 0.03 : -w * 0.10, h * (phone ? 0.0 : 0.05), w, h);
    camera.updateProjectionMatrix();
    draw();
  }
  new ResizeObserver(fit).observe(host);

  let yaw = -0.6, vel = reduced ? 0 : 0.12, drag = null, last = 0, raf = 0, visible = true;
  function draw() { pivot.rotation.y = yaw; renderer.render(scene, camera); }
  function loop(ts) {
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
    if (!drag) yaw += vel * dt;
    draw();
    if (!reduced && visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  function resume() { cancelAnimationFrame(raf); last = 0; if (model && !reduced) raf = requestAnimationFrame(loop); }
  canvas.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: yaw }; canvas.setPointerCapture(e.pointerId); canvas.classList.add("is-dragging"); });
  canvas.addEventListener("pointermove", e => { if (!drag) return; yaw = drag.y + (e.clientX - drag.x) * 0.006; if (reduced) draw(); });
  const end = () => { drag = null; canvas.classList.remove("is-dragging"); };
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) resume(); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) resume(); }).observe(host);
}

// Source of ds/merid-3d.js. Rebuild: npx esbuild scripts/merid-3d.src.js --bundle --minify --format=iife --target=es2020 --legal-comments=none --outfile=ds/merid-3d.js  (needs three@0.170)
/* Home: the armillary sundial (ds/armillary.glb) in polished steel on black.
   three.js + GLTFLoader and a small strip-light studio for reflections, bundled into one file (ds/merid-3d.js).
   An entrance, then still; drag to turn a little; no entrance with reduced motion; the stipple drawing stays as the fallback. */
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
  const camera = new THREE.PerspectiveCamera(12, 1, 0.1, 200);   // long lens: near-orthographic, so the turning model keeps the same height on screen
  // post: the scene renders into a float target, then one full-screen pass prints it.
  //   stipple (default): 1-bit random dots like the Meridian cover drawings; the dot pattern is fixed, so a still sculpture is a still print
  //   bayer: ordered 1-bit dither    grain: continuous tone with film grain    none: plain
  const EFFECT = { none: 0, grain: 1, stipple: 2, bayer: 3 }[host.dataset.effect || "stipple"] ?? 2;
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const post = new THREE.ShaderMaterial({
    uniforms: { tScene: { value: rt.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 }, uSeed: { value: 0 }, uMode: { value: EFFECT }, uExposure: { value: 1.05 }, uFloor: { value: -1 }, uFade: { value: .3 }, uReveal: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
    fragmentShader: `precision highp float; varying vec2 vUv;
      uniform sampler2D tScene; uniform vec2 uRes; uniform float uDpr, uSeed, uExposure, uFloor, uFade, uReveal; uniform int uMode;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
      float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21) + uSeed); p += dot(p, p+45.32); return fract(p.x*p.y); }
      float bayer(vec2 p){ vec2 q = mod(p, 4.);
        int i = int(q.x) + 4*int(q.y); float m[16];
        m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
        for(int k=0;k<16;k++){ if(k==i) return (m[k]+.5)/16.; } return .5; }
      void main(){
        vec3 c = aces(texture2D(tScene, vUv).rgb * uExposure);
        float L = pow(dot(c, vec3(.2126,.7152,.0722)), 1./2.2);
        // below the floor line: the mirror image, dimmed and fading out with depth (phones)
        if (vUv.y < uFloor) L *= .5 * (1. - smoothstep(0., uFade, uFloor - vUv.y));
        vec2 cell = floor(gl_FragCoord.xy / max(1., floor(uDpr+.25)));   // one dot per CSS pixel
        float o = L;
        // entrance: the print develops from the spike down, a ragged bright front leading the dots in
        if (uReveal < 1.) {
          float n = hash(floor(gl_FragCoord.xy / 6.) + 7.1);
          float front = 1.15 - uReveal * 1.35 + n * .08;      // screen height of the front, falling from above the top to below the bottom
          float d = vUv.y - front;                            // > 0: already developed
          L = d < 0. ? 0. : L * smoothstep(0., .12, d) + (1. - smoothstep(0., .035, d)) * L * 2.2;
        }
        if (L < .012) { gl_FragColor = vec4(0.,0.,0.,1.); return; }   // pure black stays black: no stray dots
        if (uMode == 2) o = step(hash(cell), pow(L, 1.15) * 1.08);
        else if (uMode == 3) o = step(bayer(cell), L);
        else if (uMode == 1) o = clamp(L + (hash(cell) - .5) * .09, 0., 1.);
        gl_FragColor = vec4(vec3(o), 1.);
      }`,
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post);
  const postScene = new THREE.Scene(); postScene.add(quad);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  renderer.toneMapping = THREE.NoToneMapping;       // tone mapping happens in the post pass
  if (EFFECT >= 2) canvas.classList.add("is-dither");

  // tilt (the pose) > pivot (the turn, about the sculpture's own vertical) > orient > model (+ its mirror twin on phones)
  const tilt = new THREE.Group(), pivot = new THREE.Group(), orient = new THREE.Group();
  scene.add(tilt); tilt.add(pivot); pivot.add(orient);
  let portrait = null;
  const TILT_X = 0.35, TILT_Z = -0.28;   // the resting pose: the angle of the Meridian cover drawing

  const steel = new THREE.MeshStandardMaterial({ color: 0xf4f5f7, metalness: 1, roughness: 0.035 });
  const band = new THREE.MeshStandardMaterial({ color: 0xeef0f2, metalness: 1, roughness: 0.07 });
  // phones: the sculpture stands on a black mirror floor; the floor is the ground plane of the Blender scene
  renderer.localClippingEnabled = true;
  const above = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), below = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const mSteel = steel.clone(), mBand = band.clone();
  for (const m of [steel, band, mSteel, mBand]) m.side = THREE.DoubleSide;
  const mirror = new THREE.Group(); mirror.visible = false;
  // the reflection dims and fades out with depth below the floor (measured in the floor's own plane, so it holds under any tilt)
  const uPlane = { value: new THREE.Vector4(0, 1, 0, 0) }, uFadeLen = { value: 1 };
  for (const m of [mSteel, mBand]) m.onBeforeCompile = sh => {
    sh.uniforms.uPlane = uPlane; sh.uniforms.uFadeLen = uFadeLen;
    sh.vertexShader = "varying vec3 vWp;\n" + sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = "varying vec3 vWp; uniform vec4 uPlane; uniform float uFadeLen;\n" + sh.fragmentShader.replace("#include <dithering_fragment>",
      "#include <dithering_fragment>\nfloat dd = -(dot(uPlane.xyz, vWp) + uPlane.w);\ngl_FragColor.rgb *= .45 * pow(1. - smoothstep(0., uFadeLen, dd), 1.6);");
  };
  let floorY = 0;

  let model = null, size = new THREE.Vector3(), ext = null;
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
    floorY = -c.y;                               // Blender's ground (z = 0) after centring
    orient.add(model);
    const twin = model.clone(true);
    twin.traverse(o => { if (o.isMesh) o.material = o.material === band ? mBand : mSteel; });
    mirror.add(twin); mirror.scale.y = -1; mirror.position.y = 2 * floorY; orient.add(mirror);
    fit();
    host.appendChild(canvas);
    requestAnimationFrame(() => { canvas.classList.add("is-live"); host.classList.add("has-3d"); });
    loop(performance.now());
  }, undefined, () => {});

  // the spike sits near the top; the foot always runs past the bottom edge (desktop and phone)
  // extents sampled over a full turn: lowest and highest point, widest reach left or right of the centre
  function measure() {
    const pts = [], v = new THREE.Vector3();
    tilt.updateMatrixWorld(true);
    model.traverse(o => { if (!o.isMesh) return; const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 3) pts.push(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).clone()); });
    const inv = new THREE.Matrix4().copy(pivot.matrixWorld).invert(), local = pts.map(p => p.clone().applyMatrix4(inv));
    const e = { minY: Infinity, maxY: -Infinity, r: 0 }, m = new THREE.Matrix4(), keep = pivot.rotation.y;
    for (let k = 0; k < 24; k++) {
      pivot.rotation.y = k / 24 * Math.PI * 2; tilt.updateMatrixWorld(true); m.copy(pivot.matrixWorld);
      for (const q of local) { v.copy(q).applyMatrix4(m); e.minY = Math.min(e.minY, v.y); e.maxY = Math.max(e.maxY, v.y); e.r = Math.max(e.r, Math.abs(v.x)); }
    }
    pivot.rotation.y = keep; tilt.updateMatrixWorld(true);
    return e;
  }
  // wide screens: the Meridian cover angle (looking down on it, the frame rolled so the needle leans left).
  // phones: the same look-down, but level, because there it stands on a mirror floor and a rolled floor would slide the reflection sideways
  function setPose(phone) {
    if (phone === portrait) return; portrait = phone;
    tilt.rotation.set(+host.dataset.tilt || TILT_X, 0, phone ? 0 : (host.dataset.roll ? +host.dataset.roll : TILT_Z));
    tilt.updateMatrixWorld(true);
    // the floor (Blender's ground) in world space; it only depends on the tilt, since the turn is about its normal
    const n = new THREE.Vector3(0, 1, 0).applyQuaternion(tilt.quaternion), p = new THREE.Vector3(0, floorY, 0).applyMatrix4(tilt.matrixWorld);
    above.setFromNormalAndCoplanarPoint(n, p); below.setFromNormalAndCoplanarPoint(n.clone().negate(), p);
    uPlane.value.set(above.normal.x, above.normal.y, above.normal.z, above.constant);
    ext = measure();
  }
  let frame = null;
  const FOV = 12;
  function applyCamera() {                          // the resting (hero) camera
    if (!frame) return;
    camera.fov = FOV; camera.position.set(0, frame.yc, frame.dist); camera.lookAt(0, frame.yc, 0);
    camera.clearViewOffset(); if (frame.cx) camera.setViewOffset(frame.w, frame.h, -frame.w * frame.cx, 0, frame.w, frame.h);
    camera.updateProjectionMatrix();
  }
  function fit() {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    rt.setSize(Math.round(w * renderer.getPixelRatio()), Math.round(h * renderer.getPixelRatio()));
    post.uniforms.uRes.value.set(rt.width, rt.height);
    post.uniforms.uDpr.value = renderer.getPixelRatio();
    camera.aspect = w / h;
    if (!model) return;
    const phone = w / h < 0.8, aspect = w / h;
    setPose(phone);
    const cx = phone ? 0 : 0.10;                  // model centre sits 10% right of the middle on wide screens
    let vis, yc;
    // phones: the whole sculpture stands on a mirror floor; the reflection fills the lower part of the tall screen
    mirror.visible = phone;
    const clip = phone ? [above] : [], clipM = phone ? [below] : [];
    for (const m of [steel, band]) { m.clippingPlanes = clip; m.needsUpdate = true; }
    for (const m of [mSteel, mBand]) { m.clippingPlanes = clipM; m.needsUpdate = true; }
    if (phone) {
      const up = ext.maxY - ext.minY;
      uFadeLen.value = up * 0.5;                         // the reflection is gone a little over half the sculpture's height down
      const needW = (ext.r * 1.04) / (0.5 * aspect);
      vis = Math.max(up * 1.52, needW);                  // the sculpture, its fading reflection, and a margin
      const top = ext.maxY + up * 0.06;
      yc = top - vis / 2;
      post.uniforms.uFloor.value = -1;
    } else {
      const H = ext.maxY - ext.minY, cut = H * 0.06;     // only the very foot runs below the bottom edge
      // tall enough for spike + margin; wide enough that the widest ring never leaves the sides, whatever the turn
      vis = Math.max((H - cut) * 1.10, (ext.r * 1.12) / ((0.5 - cx) * aspect));
      yc = ext.minY + cut + vis / 2;                     // bottom edge fixed above the foot; any spare room goes to the top
      post.uniforms.uFloor.value = -1;
    }
    frame = { dist: vis / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)), yc, cx, w, h };
    if (introDone) applyCamera(); else shot = null;   // mid-entrance: rebuild the flight for the new size
    draw();
  }
  new ResizeObserver(fit).observe(host);

  // motion: one entrance, then it holds still. Drag turns it (with a little glide); it never spins on its own.
  //   entrance (2.8 s): the light sweeps across the steel while the sculpture turns a third of the way into its pose
  //   and the exposure rises out of black. Reduced motion: the pose, straight away.
  const POSE = host.dataset.pose ? +host.dataset.pose : 1.2, INTRO = +host.dataset.introMs || 4600;
  let yaw = POSE, vel = 0, drag = null, last = 0, raf = 0, visible = true, t0 = 0, introDone = reduced, shot = null;
  const ease = t => t * t * t * (t * (t * 6 - 15) + 10);                      // smootherstep: eases in and out
  const settle = t => 1 - Math.pow(1 - t, 4);
  function draw(ts) {
    pivot.rotation.y = yaw;
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  }
  function loop(ts) {
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
    let busy = false;
    if (!introDone) {
      t0 = t0 || ts;
      // entrance (4.6 s), one continuous flight: from a macro shot of the needle tip, down the shaft
      // past the hub, out through a wide arc around the rings, and back to the resting view.
      // The lens widens then closes (a slow dolly zoom), and the light sweeps across the steel.
      if (!shot) shot = flight();
      const k = Math.max(0, Math.min(1, (ts - t0) / INTRO)), u = ease(k);   // rAF time can trail the first call
      camera.position.copy(shot.pos.getPoint(u));
      camera.lookAt(shot.tgt.getPoint(u));
      camera.fov = shot.fov(u);
      const off = Math.pow(u, 3) * (frame?.cx || 0);
      camera.clearViewOffset(); if (off && frame) camera.setViewOffset(frame.w, frame.h, -frame.w * off, 0, frame.w, frame.h);
      camera.updateProjectionMatrix();
      scene.environmentRotation.y = -2.4 * (1 - settle(k));
      post.uniforms.uExposure.value = 1.05 * Math.min(1, k * 5);        // up from black in the first ~0.9 s
      if (k >= 1) { introDone = true; scene.environmentRotation.y = 0; post.uniforms.uExposure.value = 1.05; applyCamera(); }
      busy = true;
    } else if (!drag && Math.abs(vel) > 0.002) {
      yaw += vel * dt; vel *= Math.pow(0.04, dt); busy = true;        // glide after a drag, then stop
    }
    if (drag) busy = true;
    draw(ts);
    // keep rendering while moving; when still, only the stipple needs frames (its dots re-seed), and only while on screen
    if (visible && !document.hidden && busy) raf = requestAnimationFrame(loop);   // idle: no frames at all
  }
  function resume() { cancelAnimationFrame(raf); last = 0; if (model) raf = requestAnimationFrame(loop); }
  if (!reduced) post.uniforms.uExposure.value = 0;
  // the path, in world space, for the current layout
  function flight() {
    pivot.rotation.y = yaw; tilt.updateMatrixWorld(true);
    const rod = model.getObjectByName("Rod"), hubN = model.getObjectByName("Hub_N");
    const tip = rod ? rod.localToWorld(new THREE.Vector3(0, 2.05, 0)) : new THREE.Vector3(0, ext.maxY, 0);
    const hub = hubN ? hubN.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
    const kw = Math.min(2.6, Math.max(1, 1.2 * frame.h / frame.w));   // a tall screen sees far less sideways: pull the wide arc out
    const R = ext.r, end = new THREE.Vector3(0, frame.yc, frame.dist), endT = new THREE.Vector3(0, frame.yc, 0);
    const pos = new THREE.CatmullRomCurve3([
      tip.clone().add(new THREE.Vector3(0.35, -0.25, 0.55)),          // macro on the tip, looking up it
      hub.clone().add(new THREE.Vector3(0.9, 0.35, 1.1)),             // down along the shaft to the hub
      new THREE.Vector3(-R * 2.6 * kw, hub.y + R * 0.6, R * 3.2 * kw),          // out wide, round the far side of the rings
      new THREE.Vector3(-R * 1.2 * kw, frame.yc + R * 0.3, frame.dist * 0.55),
      end,
    ], false, "centripetal");
    const tgt = new THREE.CatmullRomCurve3([tip.clone(), tip.clone().lerp(hub, 0.7), hub.clone(), endT.clone().lerp(hub, 0.3), endT], false, "centripetal");
    const fov = u => u < 0.35 ? THREE.MathUtils.lerp(38, 30, u / 0.35) : u < 0.7 ? THREE.MathUtils.lerp(30, 22, (u - 0.35) / 0.35) : THREE.MathUtils.lerp(22, FOV, Math.pow((u - 0.7) / 0.3, 0.7));
    return { pos, tgt, fov };
  }
  let px = 0, pt = 0;
  canvas.addEventListener("pointerdown", e => { introDone = true; scene.environmentRotation.y = 0; post.uniforms.uExposure.value = 1.05; applyCamera();
    drag = { x: e.clientX, y: yaw }; px = e.clientX; pt = performance.now(); vel = 0; canvas.setPointerCapture(e.pointerId); canvas.classList.add("is-dragging"); resume(); });
  canvas.addEventListener("pointermove", e => { if (!drag) return;
    const now = performance.now(), ny = drag.y + (e.clientX - drag.x) * 0.006;
    if (now > pt) vel = (e.clientX - px) * 0.006 / ((now - pt) / 1000);
    px = e.clientX; pt = now; yaw = ny; });
  const end = () => { if (!drag) return; drag = null; if (reduced || performance.now() - pt > 80) vel = 0; vel = Math.max(-3, Math.min(3, vel)); canvas.classList.remove("is-dragging"); resume(); };
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) resume(); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) resume(); }).observe(host);
}

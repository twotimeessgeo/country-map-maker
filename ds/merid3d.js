/* Meridian sculpture, drawn live: a ray-marched metal armillary (needle, meridian band, equator ring)
   shaded against a soft studio light and printed as 1-bit stipple, like the drawing on the Meridian covers.
   No library; one full-screen WebGL pass. Falls back to the still drawing when WebGL is missing. */
(() => {
  const canvas = document.querySelector("[data-merid3d]");
  if (!canvas) return;
  const still = document.querySelector(".home-merid");
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: "low-power" });
  if (!gl) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const vs = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  const fs = `precision highp float;
uniform vec2 uRes; uniform float uSpin; uniform float uTilt; uniform float uZoom; uniform vec2 uShift; uniform float uSeed; uniform float uStipple; uniform float uPx;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32+uSeed);return fract(p.x*p.y);}
float sdCone(vec3 p,float h,float r1,float r2){vec2 q=vec2(length(p.xz),p.y);vec2 k1=vec2(r2,h);vec2 k2=vec2(r2-r1,2.*h);
  vec2 ca=vec2(q.x-min(q.x,(q.y<0.)?r1:r2),abs(q.y)-h);vec2 cb=q-k1+k2*clamp(dot(k1-q,k2)/dot(k2,k2),0.,1.);
  float s=(cb.x<0.&&ca.y<0.)?-1.:1.;return s*sqrt(min(dot(ca,ca),dot(cb,cb)));}
float sdBox(vec3 p,vec3 b){vec3 d=abs(p)-b;return length(max(d,0.))+min(max(d.x,max(d.y,d.z)),0.);}
float map(vec3 p){
  p.yz=rot(-.42)*p.yz; p.xy=rot(uTilt)*p.xy; p.xz=rot(uSpin)*p.xz;
  float needle=min(sdCone(p-vec3(0.,-.42,0.),1.30,.050,.058), sdCone(p-vec3(0.,1.50,0.),.62,.058,.0));
  vec2 q=vec2(length(p.xy)-1.,p.z); vec2 d=abs(q)-vec2(.016,.115);
  float band=max(length(max(d,0.))+min(max(d.x,d.y),0.),-p.x);
  float feet=min(sdBox(p-vec3(.07,.972,0.),vec3(.085,.03,.1)),sdBox(p-vec3(.07,-.972,0.),vec3(.085,.03,.1)));
  vec2 e=vec2(length(p.xz)-1.,p.y); float ring=length(e)-.02;
  vec2 e2=vec2(length(p.xz)-.955,p.y); float ring2=length(e2)-.014;
  return min(min(needle,band),min(min(ring,feet),ring2));
}
vec3 nrm(vec3 p){vec2 k=vec2(.0015,0.);return normalize(vec3(map(p+k.xyy)-map(p-k.xyy),map(p+k.yxy)-map(p-k.yxy),map(p+k.yyx)-map(p-k.yyx)));}
float env(vec3 r){
  // a studio for chrome: an overcast sky with soft cloud banks, a dark ground under a crisp horizon,
  // a low sun, two soft panels and a couple of dark strips, so the metal has something to mirror
  float cloud=.5+.5*sin(r.x*7.3+sin(r.z*5.1+r.y*3.))*sin(r.z*4.3-r.x*2.+r.y*6.);
  float sky=.70+.20*smoothstep(0.,.8,r.y)+.10*cloud;
  float grain=.5+.5*sin(r.x*23.+r.z*17.)*sin(r.z*13.-r.x*9.);
  float ground=.07+.20*smoothstep(-1.,-.04,r.y)+.05*grain;
  float e=mix(ground,sky,smoothstep(-.02,.02,r.y));
  e+=.85*smoothstep(.88,.975,dot(r,normalize(vec3(.55,.55,.62))));
  e+=.40*smoothstep(.91,.99,dot(r,normalize(vec3(-.75,.12,.66))));
  e+=1.6*smoothstep(.994,.9995,dot(r,normalize(vec3(-.45,.35,.82))));
  e-=.45*smoothstep(.015,.0,abs(r.x-.42))*step(0.,r.y);
  e-=.30*smoothstep(.02,.0,abs(r.x+.63))*step(.05,r.y);
  return e;}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  uv=uv*uZoom+uShift;
  vec3 ro=vec3(0.,0.,6.); vec3 rd=normalize(vec3(uv,-1.75));
  float ink=0.; float shade=1.;
  float b=dot(ro,rd); float c=dot(ro,ro)-5.2; float h=b*b-c;
  if(h>0.){
    float t=max(-b-sqrt(h),0.); float tmax=-b+sqrt(h); bool hit=false;
    for(int i=0;i<110;i++){ float dd=map(ro+rd*t); if(dd<.0006){hit=true;break;} t+=dd*.9; if(t>tmax)break; }
    if(hit){
      vec3 p=ro+rd*t; vec3 n=nrm(p);
      float fr=pow(1.-max(dot(n,-rd),0.),4.);
      float lum=env(reflect(rd,n));
      lum=mix(lum,.5+.4*n.y,.12);
      shade=clamp(lum*.9+fr*.18,0.,1.); ink=1.;
    }
  }
  vec3 col;
  if(uStipple>.5){
    float k=smoothstep(.04,.98,clamp(1.-pow(shade,.7),0.,1.))*ink;
    float d=k>.002?step(hash(floor(gl_FragCoord.xy/uPx)),k):0.;
    col=mix(vec3(1.),vec3(.078),d);
  } else {
    col=mix(vec3(1.),vec3(pow(shade,1.15)*.94),ink);
  }
  gl_FragColor=vec4(col,1.);
}`;
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; }
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return;
  const prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const uRes = U("uRes"), uSpin = U("uSpin"), uTilt = U("uTilt"), uZoom = U("uZoom"), uShift = U("uShift"), uSeed = U("uSeed");
  gl.uniform1f(uSeed, 0.37);
  const STIPPLE = canvas.dataset.merid3d === "stipple";
  const DPR = STIPPLE ? 1 : Math.min(window.devicePixelRatio || 1, 2);   // chrome at device pixels; stipple at CSS pixels
  gl.uniform1f(U("uStipple"), STIPPLE ? 1 : 0); gl.uniform1f(U("uPx"), 1);

  // one canvas pixel per CSS pixel: the dots stay the size of the drawing's dots, and a phone draws a quarter of the pixels
  let w = 0, h = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width * DPR)); h = Math.max(1, Math.round(r.height * DPR));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    // the sculpture fills the height; its foot runs a little past the bottom edge
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uZoom, Math.max(0.84, 0.66 / (w / h)));   // height-filling on wide screens, width-fitting on phones
    gl.uniform2f(uShift, 0, 0.15);
  }
  let spin = 0.55, vel = reduced ? 0 : 0.16, drag = null, last = 0, running = true, raf = 0;
  const TILT = 0.36;
  function frame(ts) {
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
    if (!drag) spin += vel * dt;
    gl.uniform1f(uSpin, spin); gl.uniform1f(uTilt, TILT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (running && !reduced) raf = requestAnimationFrame(frame);
  }
  resize();
  new ResizeObserver(() => { resize(); if (reduced || !running) frame(performance.now()); }).observe(canvas);
  canvas.addEventListener("pointerdown", e => { drag = { x: e.clientX, s: spin }; canvas.setPointerCapture(e.pointerId); canvas.classList.add("is-dragging"); });
  canvas.addEventListener("pointermove", e => { if (!drag) return; spin = drag.s + (e.clientX - drag.x) * 0.008; if (reduced) frame(performance.now()); });
  const end = () => { drag = null; canvas.classList.remove("is-dragging"); };
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running && !reduced) { last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } });
  if (STIPPLE) canvas.classList.add("is-stipple");
  canvas.classList.add("is-live"); if (still) still.hidden = true;
  raf = requestAnimationFrame(frame);
})();

/* PR6 v16 · the landing: keynote slide 1, alive. Out-of-focus steel-blue cells on pale mist, with darker nuclei, that
   drift like a lava lamp, divide (one cell pinches into two daughters that drift apart) and merge again. A small
   simulation in JS (positions, radii, the pinch) feeds a metaball shader; the defocus, the nuclei and the fibrous grain
   are in the shader. Drawn at half resolution (it is all soft) and upscaled; reduced motion gets one still frame.
   createCells(canvas) → {start(), stop(), burst(), destroy()} */
import {RM} from './util.js';

const MAX = 14;
const VS = `attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
const FS = `precision highp float;
varying vec2 v;
uniform vec2 res; uniform float t, out_;
uniform vec4 C[${MAX}];   /* x, y (in units of the short side), r, id */
uniform int n;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a * vn(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
void main(){
  float k = min(res.x, res.y);
  vec2 q = (v * res) / k;
  float f = 0., nuc = 0., wsum = 0.;
  for (int i = 0; i < ${MAX}; i++){
    if (i >= n) break;
    vec4 c = C[i];
    vec2 d = q - c.xy;
    float r2 = c.z * c.z;
    float g = r2 / (dot(d, d) + r2 * .02);
    f += g;
    /* nuclei: darker blotches that live in the cell's own frame */
    float w = smoothstep(.6, 2.2, g);
    vec2 lp = d / c.z * 1.7 + c.w * 7.31;
    float bl = fbm(lp + vec2(t * .03, -t * .02));
    nuc += w * smoothstep(.5, .78, bl);
    wsum += w;
  }
  nuc = wsum > 0. ? nuc / max(wsum, 1.) : 0.;
  /* defocused body: a wide soft edge, darker toward the centre */
  float body = smoothstep(.7, 2.3, f);
  float core = smoothstep(2.2, 7., f);
  vec3 mist = vec3(.80, .85, .88), mist2 = vec3(.70, .77, .82);
  vec3 steel = vec3(.37, .49, .58), deep = vec3(.17, .25, .32);
  /* the room: lighter low right, a little darker top left (as on the slide) */
  vec3 col = mix(mist, mist2, smoothstep(.2, 1.2, 1. - v.y + (1. - v.x) * .3));
  col = mix(col, steel, body * .92);
  col = mix(col, mix(steel, deep, .55), core * .55);
  col = mix(col, deep, nuc * body * .62);
  /* the fibrous grain of the print: two scales of ridged noise, very faint */
  vec2 gp = v * res;
  float fib = abs(vn(gp * .55) - .5) + abs(vn(gp * .23 + 9.) - .5);
  col *= .93 + .1 * fib;
  col += (h(gp + fract(t) * 91.) - .5) * .035;
  col = mix(col, vec3(.86, .89, .91), out_);
  gl_FragColor = vec4(col, 1.);
}`;

export function createCells(canvas) {
  const gl = canvas.getContext('webgl', {antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false});
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {res: gl.getUniformLocation(pr, 'res'), t: gl.getUniformLocation(pr, 't'), out: gl.getUniformLocation(pr, 'out_'), C: gl.getUniformLocation(pr, 'C'), n: gl.getUniformLocation(pr, 'n')};

  /* the simulation, in units of the short side; the long side is A */
  let A = 1, W = 1, H = 1, nid = 1;
  const cells = [];
  const R0 = () => .12 + Math.random() * .06;
  const add = (x, y, r, vx = 0, vy = 0) => { const c = {x, y, r, tr: r, vx, vy, id: (nid++ * 0.61803) % 1 * 10, ph: Math.random() * 6.28, life: 0}; cells.push(c); return c; };
  function seed() {
    cells.length = 0;
    const n = A > 1.3 ? 9 : 7;
    for (let i = 0; i < n; i++) add(((i + .5) / n) * (A > 1 ? A : 1) + (Math.random() - .5) * .15, (A > 1 ? 1 : 1 / A) * (.15 + Math.random() * .7), R0());
  }
  let tSplit = 2.5, tMerge = 7, out = 0, outTo = 0, pointer = null;
  function split() {
    const big = cells.filter(c => c.r > .12 && !c.pair).sort((a, b) => b.r - a.r);
    if (!big.length || cells.length >= MAX - 1) return;
    const c = big[Math.floor(Math.random() * Math.min(3, big.length))];
    const a = Math.random() * Math.PI * 2, r = c.r * .72, s = .028;
    const d = add(c.x, c.y, r * .3, Math.cos(a) * s, Math.sin(a) * s);
    c.tr = r; c.vx -= Math.cos(a) * s; c.vy -= Math.sin(a) * s; d.tr = r;
    c.pair = d; d.pair = c; c.pt = d.pt = 0;
  }
  function merge() {
    if (cells.length <= 5) return;
    let best = null, bd = 1e9;
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i], b = cells[j]; if (a.pair || b.pair) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < bd) { bd = d; best = [a, b]; }
    }
    if (best) { best[0].join = best[1]; }
  }
  function step(dt, t) {
    const yMax = A >= 1 ? 1 : 1 / A, xMax = A >= 1 ? A : 1;
    tSplit -= dt; tMerge -= dt;
    if (tSplit < 0) { split(); tSplit = 5 + Math.random() * 4; }
    if (tMerge < 0) { merge(); tMerge = 6 + Math.random() * 5; }
    for (let i = cells.length - 1; i >= 0; i--) {
      const c = cells[i];
      /* lava-lamp drift: a slow wandering current plus a gentle rise and fall */
      const fx = Math.sin(t * .11 + c.ph + c.y * 2.1) * .022, fy = Math.cos(t * .09 + c.ph * 1.7 + c.x * 1.9) * .022;
      c.vx += fx * dt; c.vy += fy * dt;
      /* daughters push apart for a while, then the pair lets go */
      if (c.pair) { c.pt += dt; if (c.pt > 7) { c.pair = null; } }
      /* a merge: the two draw together; when they touch, one takes the other's area */
      if (c.join) {
        const o = c.join; if (!cells.includes(o)) { c.join = null; }
        else { const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy) || 1;
          c.vx += dx / d * .018 * dt; c.vy += dy / d * .018 * dt; o.vx -= dx / d * .018 * dt; o.vy -= dy / d * .018 * dt;
          if (d < (c.r + o.r) * .45) { c.tr = Math.min(.22, Math.sqrt(c.r * c.r + o.r * o.r)); c.x = (c.x + o.x) / 2; c.y = (c.y + o.y) / 2; cells.splice(cells.indexOf(o), 1); c.join = null; if (cells.indexOf(c) < i) i--; } }
      }
      /* the pointer moves the medium a little */
      if (pointer) { const dx = c.x - pointer.x, dy = c.y - pointer.y, d2 = dx * dx + dy * dy + .02; c.vx += dx / d2 * .0009 * dt * 60; c.vy += dy / d2 * .0009 * dt * 60; }
      /* stay roughly in the frame (soft walls), damping */
      const m = .05;
      if (c.x < -m) c.vx += .02 * dt; if (c.x > xMax + m) c.vx -= .02 * dt;
      if (c.y < -m) c.vy += .02 * dt; if (c.y > yMax + m) c.vy -= .02 * dt;
      const damp = Math.pow(.55, dt); c.vx *= damp; c.vy *= damp;
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.r += (c.tr - c.r) * Math.min(1, dt * .5);
      /* a cell slowly grows back to full size, so it can divide again */
      if (!c.pair && !c.join) c.tr = Math.min(.19, c.tr + dt * .004);
    }
    /* keep the population between five and the cap */
    while (cells.length < 5) add(Math.random() * xMax, Math.random() * yMax, .02).tr = R0();
  }

  const DPR = Math.min(devicePixelRatio || 1, 2), SC = .5;
  function size() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(2, Math.round(r.width * DPR * SC)), hh = Math.max(2, Math.round(r.height * DPR * SC));
    if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; }
    const nA = w / hh; if (Math.abs(nA - A) > .2 || !cells.length) { A = nA; seed(); } else A = nA;
    W = w; H = hh;
  }
  const arr = new Float32Array(MAX * 4);
  let raf = 0, last = 0, T = Math.random() * 100, live = false;
  function draw() {
    gl.viewport(0, 0, W, H);
    gl.uniform2f(U.res, W, H); gl.uniform1f(U.t, T); gl.uniform1f(U.out, out);
    arr.fill(0);
    /* shader y runs up; the sim's runs down */
    const yMax = A >= 1 ? 1 : 1 / A;
    cells.forEach((c, i) => { if (i < MAX) { arr[i * 4] = c.x; arr[i * 4 + 1] = yMax - c.y; arr[i * 4 + 2] = c.r; arr[i * 4 + 3] = c.id; } });
    gl.uniform4fv(U.C, arr); gl.uniform1i(U.n, Math.min(MAX, cells.length));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) {
    raf = 0; if (!live) return;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    T += dt; out += (outTo - out) * Math.min(1, dt * 3);
    size(); step(dt * (1 + out * 2), T); draw();
    raf = requestAnimationFrame(loop);
  }
  const onMove = e => { const r = canvas.getBoundingClientRect(), k = Math.min(r.width, r.height); pointer = {x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k}; };
  const onLeave = () => { pointer = null; };
  const host = canvas.parentElement;
  host.addEventListener('pointermove', onMove); host.addEventListener('pointerleave', onLeave);
  return {
    start() { if (live) return; live = true; last = 0; size(); if (RM) { for (let i = 0; i < 60; i++) step(.1, T += .1); draw(); live = false; return; } raf = requestAnimationFrame(loop); },
    stop() { live = false; cancelAnimationFrame(raf); raf = 0; },
    /* on the way in: every cell divides at once and the field pales out */
    burst() { const n = cells.length; for (let i = 0; i < n; i++) { const c = cells[i]; if (cells.length < MAX - 1 && c.r > .1) { c.pair = null; split.call(null); } } outTo = 1; },
    reset() { outTo = 0; out = 0; },
    destroy() { this.stop(); host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave); const x = gl.getExtension('WEBGL_lose_context'); x && x.loseContext(); }
  };
}

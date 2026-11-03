/* PR6 v17 · the living medium. Keynote slide 1 made into the site's own material: out-of-focus steel-blue cells with
   darker nuclei that drift like a lava lamp, divide and merge. v16 had them on the landing only; in v17 the same nine
   cells, one for each Series, carry through the store.
     hero  the landing: the nine Series cells sit loosely round the wordmark (tap one to open its Series), with a few
           free cells dividing and merging among them; deep register (steel on mist), nuclei on.
     bg    behind every page: the same nine, small and pale (mist on chalk), no nuclei, slower; the page's own Series
           cell (focus) swells and drifts to the upper right; scrolling stirs the medium.
   A small simulation in JS (positions, radii, the pinch) feeds a metaball shader; defocus, nuclei and the fibrous grain
   are in the shader. Drawn at reduced resolution (it is all soft) and upscaled; reduced motion gets one still frame.
   createCells(canvas, {scale}) → {start, stop, mode, focus, hover, cells, burst, reset, push, destroy}
   createMitosis(canvas) → {run(x, y, r, mid) → Promise}: the page transition. One cell grows from where you pressed
   until it fills the screen, the next page mounts under it, and the cell divides: the two daughters pull apart and the
   new page shows through the widening cleft. */
import {RM, Q} from './util.js';

const MAX = 14;
const VS = `attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
const FS = `precision highp float;
varying vec2 v;
uniform vec2 res; uniform float t, out_, tone, nucA, ov, nucS;
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
    if (c.z < .001) continue;
    vec2 d = q - c.xy;
    float r2 = c.z * c.z;
    float g = r2 / (dot(d, d) + r2 * .02);
    f += g;
    if (nucA > .01) {
      /* nuclei: darker blotches that live in the cell's own frame */
      float w = smoothstep(.6, 2.2, g);
      vec2 lp = d / (nucS > 0. ? nucS : c.z) * 1.7 + c.w * 7.31;
      float bl = fbm(lp + vec2(t * .03, -t * .02));
      nuc += w * smoothstep(.5, .78, bl);
      wsum += w;
    }
  }
  nuc = wsum > 0. ? nuc / max(wsum, 1.) : 0.;
  float body = smoothstep(.7, 2.3, f);
  float core = smoothstep(2.2, 7., f);
  /* deep register (slide 1): steel cells on mist, lighter low right */
  vec3 mist = vec3(.80, .85, .88), mist2 = vec3(.70, .77, .82);
  vec3 steel = vec3(.37, .49, .58), deep = vec3(.17, .25, .32);
  vec3 cd = mix(mist, mist2, smoothstep(.2, 1.2, 1. - v.y + (1. - v.x) * .3));
  cd = mix(cd, steel, body * .92);
  cd = mix(cd, mix(steel, deep, .55), core * .55);
  cd = mix(cd, deep, nuc * body * .62 * nucA);
  /* pale register (behind the pages): mist cells on chalk, a breath of steel at the core */
  vec3 chalk = vec3(.949, .953, .937), pm = vec3(.835, .868, .882), ps = vec3(.70, .76, .80);
  vec3 cp = mix(chalk, pm, body * .85);
  cp = mix(cp, ps, core * .45);
  vec3 col = mix(cp, cd, tone);
  /* the fibrous grain of the print: two scales of ridged noise, very faint */
  vec2 gp = v * res;
  float fib = abs(vn(gp * .55) - .5) + abs(vn(gp * .23 + 9.) - .5);
  col *= mix(.975, .93, tone) + mix(.035, .1, tone) * fib;
  col += (h(gp + fract(t) * 91.) - .5) * mix(.018, .035, tone);
  col = mix(col, mix(chalk, vec3(.86, .89, .91), tone), out_);
  float a = mix(1., smoothstep(.75, 1.9, f), ov);
  gl_FragColor = vec4(col * a, a);
}`;

function program(canvas, alpha) {
  const gl = canvas.getContext('webgl', {antialias: false, alpha, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power'});
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['res', 't', 'out_', 'tone', 'nucA', 'ov', 'nucS', 'C', 'n'].forEach(k => { U[k] = gl.getUniformLocation(pr, k); });
  const arr = new Float32Array(MAX * 4);
  /* list: [{x, y, r, id}] in short-side units, y down; u: uniforms */
  function draw(W, H, list, u) {
    gl.viewport(0, 0, W, H);
    gl.uniform2f(U.res, W, H); gl.uniform1f(U.t, u.t); gl.uniform1f(U.out_, u.out || 0); gl.uniform1f(U.tone, u.tone);
    gl.uniform1f(U.nucA, u.nuc); gl.uniform1f(U.ov, u.ov || 0); gl.uniform1f(U.nucS, u.nucS || 0);
    arr.fill(0);
    const A = W / H, yMax = A >= 1 ? 1 : 1 / A;
    let m = 0;
    for (const c of list) { if (m >= MAX) break; arr[m * 4] = c.x; arr[m * 4 + 1] = yMax - c.y; arr[m * 4 + 2] = Math.max(0, c.r); arr[m * 4 + 3] = c.id; m++; }
    gl.uniform4fv(U.C, arr); gl.uniform1i(U.n, m);
    if (alpha) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  return {gl, draw, lose() { const x = gl.getExtension('WEBGL_lose_context'); x && x.loseContext(); }};
}

export function createCells(canvas, opt = {}) {
  const P = program(canvas, false);
  if (!P) return null;

  /* the simulation, in units of the short side; the long side is A */
  let A = 1, W = 1, H = 1, nid = 1, mode = 'hero', foc = -1, hov = -1;
  const cells = [];
  const series = [];   /* the nine, by index */
  const add = (x, y, r, vx = 0, vy = 0) => { const c = {x, y, r, tr: r, vx, vy, id: (nid++ * 0.61803) % 1 * 10, ph: Math.random() * 6.28, s: -1}; cells.push(c); return c; };
  const ext = () => ({xMax: A >= 1 ? A : 1, yMax: A >= 1 ? 1 : 1 / A});
  /* hero anchors: an ellipse round the wordmark, one cell at the top, so the bottom (ENTER) falls between two */
  function anchor(i) {
    const {xMax, yMax} = ext();
    const cx = xMax / 2, cy = A >= 1 ? .47 : yMax * (yMax < 1.8 ? .42 : .47);
    const rx = A >= 1 ? Math.min(xMax * .36, .66) : .37, ry = A >= 1 ? .33 : Math.min(yMax * .27, .54);
    const a = -Math.PI / 2 + i / 9 * Math.PI * 2;
    return {x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry};
  }
  const heroR = () => A >= 1 ? .085 : .095;
  function targetR(c) {
    if (c.s < 0) return c.tr;
    if (mode === 'hero') return heroR() * (hov === c.s ? 1.35 : hov >= 0 ? .9 : 1);
    return foc === c.s ? (A >= 1 ? .26 : .3) : (A >= 1 ? .07 : .085) * (.8 + (c.s % 3) * .15);
  }
  function seed() {
    cells.length = 0; series.length = 0;
    for (let i = 0; i < 9; i++) {
      const p = mode === 'hero' ? anchor(i) : {x: Math.random() * ext().xMax, y: Math.random() * ext().yMax};
      const c = add(p.x, p.y, .02); c.s = i; series.push(c);
    }
    if (mode === 'hero') for (let i = 0; i < 3; i++) add(Math.random() * ext().xMax, Math.random() * ext().yMax, .11 + Math.random() * .04);
  }
  let tSplit = 1.8, tMerge = 6, out = 0, outTo = 0, pointer = null, tone = 1, nuc = 1;
  /* a division: c pinches into itself and a free daughter that drifts off */
  function divide(c, big) {
    if (cells.length >= MAX) return;
    const a = Math.random() * Math.PI * 2, s = big ? .06 : .028;
    const d = add(c.x, c.y, c.r * .3, Math.cos(a) * s, Math.sin(a) * s);
    d.tr = (c.s >= 0 ? c.r * .8 : c.r * .72); if (c.s < 0) c.tr = c.r * .72;
    c.vx -= Math.cos(a) * s; c.vy -= Math.sin(a) * s;
    c.pair = d; d.pair = c; c.pt = d.pt = 0;
  }
  function split() {
    if (mode !== 'hero') return;
    const pool = cells.filter(c => !c.pair && (c.s < 0 ? c.r > .1 : Math.random() < .25));
    if (!pool.length) return;
    divide(pool[Math.floor(Math.random() * pool.length)]);
  }
  /* merges take free cells only, into the nearest cell (a series cell can swallow a daughter; it never vanishes) */
  function merge() {
    const free = cells.filter(c => c.s < 0 && !c.pair && !c.join);
    if (!free.length || (mode === 'hero' && free.length <= 2)) return;
    let best = null, bd = 1e9;
    for (const a of free) for (const b of cells) { if (a === b || b.pair) continue; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < bd) { bd = d; best = [b, a]; } }
    if (best) best[0].join = best[1];
  }
  function step(dt, t) {
    const {xMax, yMax} = ext(), hero = mode === 'hero';
    tSplit -= dt; tMerge -= dt;
    if (tSplit < 0) { split(); tSplit = 4 + Math.random() * 4; }
    if (tMerge < 0) { merge(); tMerge = hero ? 6 + Math.random() * 5 : 2.5; }
    const sp = hero ? 1 : .55;
    for (let i = cells.length - 1; i >= 0; i--) {
      const c = cells[i];
      const fx = Math.sin(t * .11 + c.ph + c.y * 2.1) * .022 * sp, fy = Math.cos(t * .09 + c.ph * 1.7 + c.x * 1.9) * .022 * sp;
      c.vx += fx * dt; c.vy += fy * dt;
      /* anchors: on the landing the nine hold their places round the wordmark; behind a page the focused one keeps to
         the upper right, the rest wander */
      let an = null;
      if (c.s >= 0 && hero && !c.pair) an = anchor(c.s);
      if (c.s >= 0 && !hero && c.s === foc) an = {x: xMax * (A >= 1 ? .8 : .78), y: A >= 1 ? .34 : .42};
      if (an) { c.vx += (an.x - c.x) * .5 * dt; c.vy += (an.y - c.y) * .5 * dt; }
      if (c.pair) { c.pt += dt; if (c.pt > 6) c.pair = null; }
      if (c.join) {
        const o = c.join; if (!cells.includes(o)) c.join = null;
        else { const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy) || 1;
          o.vx -= dx / d * .03 * dt; o.vy -= dy / d * .03 * dt; if (c.s < 0) { c.vx += dx / d * .018 * dt; c.vy += dy / d * .018 * dt; }
          if (d < (c.r + o.r) * .5) { if (c.s < 0) c.tr = Math.min(.2, Math.hypot(c.r, o.r)); cells.splice(cells.indexOf(o), 1); c.join = null; if (cells.indexOf(c) < i) i--; } }
      }
      if (pointer && hero) { const dx = c.x - pointer.x, dy = c.y - pointer.y, d2 = dx * dx + dy * dy + .02; c.vx += dx / d2 * .0007 * dt * 60; c.vy += dy / d2 * .0007 * dt * 60; }
      const m = .05;
      if (c.x < -m) c.vx += .02 * dt; if (c.x > xMax + m) c.vx -= .02 * dt;
      if (c.y < -m) c.vy += .02 * dt; if (c.y > yMax + m) c.vy -= .02 * dt;
      const damp = Math.pow(an ? .3 : .55, dt); c.vx *= damp; c.vy *= damp;
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.s >= 0) c.tr = targetR(c);
      else if (!hero && !c.join) c.tr = Math.max(0, c.tr - dt * .03);
      c.r += (c.tr - c.r) * Math.min(1, dt * (c.s >= 0 ? 1.6 : .5));
      if (c.s < 0 && !c.pair && !c.join && hero) c.tr = Math.min(.17, c.tr + dt * .004);
      if (c.s < 0 && !hero && c.r < .004 && !c.pair) { cells.splice(i, 1); }
    }
    if (hero) while (cells.length < 11) add(Math.random() * xMax, Math.random() * yMax, .02).tr = .11 + Math.random() * .04;
  }

  const DPR = Math.min(devicePixelRatio || 1, 2);
  let SC = opt.scale || .5;
  function size() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(2, Math.round(r.width * DPR * SC)), hh = Math.max(2, Math.round(r.height * DPR * SC));
    if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; }
    const nA = w / hh; if (Math.abs(nA - A) > .2 || !cells.length) { A = nA; seed(); } else A = nA;
    W = w; H = hh;
  }
  let raf = 0, last = 0, T = Math.random() * 100, live = false, acc = 0, cb = null;
  const draw = () => P.draw(W, H, cells, {t: T, out, tone, nuc});
  function loop(now) {
    raf = 0; if (!live) return;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    raf = requestAnimationFrame(loop);
    /* behind the pages the medium runs at half rate: it is slow and pale, and the page above it is what matters */
    acc += dt; if (mode === 'bg' && acc < 1 / 31 && !cb) return;
    const st = acc; acc = 0;
    T += st; out += (outTo - out) * Math.min(1, st * 3);
    const tt = mode === 'hero' ? 1 : 0; tone += (tt - tone) * Math.min(1, st * 2.2); nuc += (tt - nuc) * Math.min(1, st * 2.2);
    size(); step(st * (1 + out * 2), T); draw();
    cb && cb(api);
  }
  const onMove = e => { const r = canvas.getBoundingClientRect(), k = Math.min(r.width, r.height); pointer = {x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k}; };
  const onLeave = () => { pointer = null; };
  addEventListener('pointermove', onMove, {passive: true}); document.addEventListener('pointerleave', onLeave);
  const settle = () => { for (let i = 0; i < 90; i++) { step(.1, T += .1); tone += ((mode === 'hero' ? 1 : 0) - tone) * .3; nuc = tone; } draw(); };
  const api = {
    start() { if (live) return; size(); if (RM) { settle(); cb && cb(api); return; } live = true; last = 0; raf = requestAnimationFrame(loop); },
    stop() { live = false; cancelAnimationFrame(raf); raf = 0; },
    get live() { return live; },
    /* 'hero' | 'bg'; scale is the render resolution */
    mode(m) { if (m === mode) return; mode = m; out = outTo = 0; SC = m === 'hero' ? (opt.scale || .5) : .34; if (m === 'hero') { foc = -1; hov = -1; } if (RM) { size(); settle(); } },
    get current() { return mode; },
    focus(i) { foc = i == null ? -1 : i; if (RM) settle(); },
    hover(i) { hov = i == null ? -1 : i; },
    /* the nine, in CSS pixels of the canvas: [{x, y, r}] */
    nine() { const r = canvas.getBoundingClientRect(), k = Math.min(r.width, r.height); return series.map(c => ({x: c.x * k, y: c.y * k, r: c.r * k})); },
    divide(i) { const c = series[i]; c && divide(c, true); },
    onFrame(f) { cb = f; },
    /* scrolling stirs the medium: the cells drift against it, a little */
    push(dy) { if (mode !== 'bg' || RM) return; const k = Math.max(-1, Math.min(1, dy / 300)); for (const c of cells) c.vy -= k * .02 * (.6 + (c.id % 1) * .8); },
    burst() { for (const c of cells.slice()) if (c.r > .07) divide(c, true); outTo = 1; },
    reset() { outTo = 0; out = 0; },
    destroy() { api.stop(); removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); P.lose(); }
  };
  return api;
}

const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const out3 = t => 1 - Math.pow(1 - t, 3);
export function createMitosis(canvas) {
  let P = null;
  try { P = program(canvas, true); } catch (e) { P = null; }
  if (!P) return null;
  const DPR = Math.min(devicePixelRatio || 1, 2), SC = .4;
  let busy = false;
  return {
    get busy() { return busy; },
    /* x, y: CSS px where the cell starts; r0: its radius in px; mid(): runs once the screen is covered (await-able) */
    run(x, y, r0, mid) {
      busy = true;
      canvas.hidden = false;
      const r = {width: innerWidth, height: innerHeight};
      const W = Math.max(2, Math.round(r.width * DPR * SC)), H = Math.max(2, Math.round(r.height * DPR * SC));
      canvas.width = W; canvas.height = H;
      const k = Math.min(r.width, r.height), A = r.width / r.height, xM = A >= 1 ? A : 1, yM = A >= 1 ? 1 : 1 / A;
      const cx = x / k, cy = y / k, R0 = Math.max(.04, (r0 || 40) / k);
      /* big enough to cover the far corner, with the soft edge */
      const far = Math.max(Math.hypot(cx, cy), Math.hypot(xM - cx, cy), Math.hypot(cx, yM - cy), Math.hypot(xM - cx, yM - cy));
      const RB = far * 1.05;
      const id = Math.random() * 10, t0 = performance.now(), T0 = Math.random() * 50;
      /* the division axis: across the long side, so the cleft opens the way the page reads */
      const ang = (A >= 1 ? 0 : Math.PI / 2) + (Math.random() - .5) * .5;
      const ux = Math.cos(ang), uy = Math.sin(ang);
      canvas.hidden = false; canvas.classList.add('on');
      const SLOW = +(Q.get('slow') || 1) || 1, IN = 380 * SLOW, OUT = 760 * SLOW;   /* ?slow=N: the test hook, for mid-division frames */
      return new Promise(res => {
        let phase = 0, tPh = t0, mx = xM / 2, my = yM / 2;
        const frame = now => {
          const t = now - tPh, T = T0 + (now - t0) / 1000;
          if (phase === 0) {
            const e = out3(Math.min(1, t / IN));
            const rr = R0 + (RB - R0) * e;
            /* the cell slides toward the middle as it grows, so the division happens at the centre */
            const px = cx + (xM / 2 - cx) * e, py = cy + (yM / 2 - cy) * e;
            P.draw(W, H, [{x: px, y: py, r: rr, id}], {t: T, tone: 1, nuc: 1, ov: 1, nucS: .22});
            if (t >= IN) {
              phase = 1;
              P.draw(W, H, [{x: xM / 2, y: yM / 2, r: RB * 1.4, id}], {t: T, tone: 1, nuc: 1, ov: 1, nucS: .22});
              Promise.resolve(mid && mid()).catch(() => {}).then(() => { phase = 2; tPh = performance.now(); requestAnimationFrame(frame); });
              return;
            }
          } else if (phase === 2) {
            const e = ease(Math.min(1, t / OUT));
            /* two daughters at the centre pull apart; the neck thins, pinches and opens */
            const sep = e * (Math.max(xM, yM) * 1.25 + RB * .3);
            const rr = RB * (1.15 - .55 * e);
            const L = [{x: mx - ux * sep, y: my - uy * sep, r: rr, id}, {x: mx + ux * sep, y: my + uy * sep, r: rr, id: id + 3.7}];
            P.draw(W, H, L, {t: T, tone: 1, nuc: 1, ov: 1, nucS: .22});
            if (t >= OUT) { canvas.classList.remove('on'); P.draw(W, H, [], {t: T, tone: 1, nuc: 0, ov: 1}); canvas.hidden = true; busy = false; res(); return; }
          }
          if (phase !== 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
    }
  };
}

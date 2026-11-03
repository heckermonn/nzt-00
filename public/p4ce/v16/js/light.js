/* PR6 v16 · "Raking Light": the relight.
   Every product image is a path-traced photograph rendered once in Cycles with each light written as its own pass
   (light groups key_l, key_r, top, rim, amb, ink; see assets/light/manifest.json). Light adds linearly, so the sum of
   the passes is the photograph, and a weighted sum is the same photograph under different light. This module draws
   that weighted sum on a WebGL2 quad: each pass is uploaded as an sRGB texture (the GPU linearises on sampling),
   sum(w_i · scale_i · pass_i) · exposure is taken in linear light (each pass carries its own scale, so 8 bits hold its
   range), Khronos PBR Neutral tonemaps it exactly as the posters were made, the result is encoded back to sRGB, and a triangular hash dither of one 8-bit step hides banding in the soft floor gradients.

   One light for the whole store: LIGHT holds the light's position (x: -1 left … 1 right, y: 0 low … 1 overhead) and
   the ink level, each on a spring (about 130 ms of lag, so the light has weight). Every relightable picture on screen
   reads the same state, so the light keeps its place across the lineup and across a route change.
   Inputs: drag or touch on a picture (touch-action: pan-y keeps vertical scroll), the page scroll (sweeps the light
   as a section passes), an idle sweep on first view, a long press of 600 ms (or dragging to the far edge) for the
   ink, arrow keys and I. Without WebGL, with ?nogl, or until the passes arrive, the poster stands in and a press
   crossfades to an ink still mixed once from the passes. Reduced motion (?rm): no sweeps, the light rests at the
   left key, ink on press only.
   Rendering runs only while something changes (a spring moving, a sweep, a resize) and only for pictures on screen. */
import {Q, RM, clamp, lerp, sm, E, Spring} from './util.js';

export const GROUPS = ['key_l', 'key_r', 'top', 'rim', 'amb', 'ink'];
const NOGL = Q.has('nogl');
const DPR_CAP = Q.has('lowdpr') ? 1 : 2;
const REST = {x: -.72, y: .22};
/* ?slow=N runs the light's own clock N times slower (for recording frames); nothing else changes */
const TS = +(Q.get('slow') || 1) > 0 ? 1 / +(Q.get('slow') || 1) : 1;
const now = () => performance.now() * TS;

/* ================================================================ the one light */
const spring = (v, k, c) => new Spring(v, {k, c});
export const LIGHT = {
  x: spring(REST.x, 230, 28), y: spring(REST.y, 230, 28), ink: spring(0, 140, 23),
  lean: spring(0, 90, 19),        /* 0..1: the picture leaning in to the label while the ink is held (a hold or I) */
  dawn: 1,                       /* 0: black (the gate's night), 1: lit */
  hand: -1e9,                    /* now() of the last direct input */
  sweep: null,                   /* the idle sweep, when running */
  sweeps: 0, inkHeld: false, inkKey: false,
  set(x, y) { if (x != null) this.x.set(clamp(x, -1.08, 1.08)); if (y != null) this.y.set(clamp(y, 0, 1)); kick(); },
  rest() { this.x.set(RM ? REST.x : REST.x); this.y.set(REST.y); kick(); },
  state() { return {x: +this.x.v.toFixed(3), y: +this.y.v.toFixed(3), ink: +this.ink.v.toFixed(3), tx: +this.x.to.toFixed(3), dawn: +this.dawn.toFixed(3), sweeping: !!this.sweep, sweeps: this.sweeps}; }
};
if (RM) { LIGHT.x.snap(REST.x); LIGHT.y.snap(REST.y); }

/* the light's position as weights on the six groups.
   The light travels an arc over the pack: from a low raking key on the left, up and over the top, down to a low raking
   key on the right. Across the middle third both keys fall away and the top light carries the picture, so the emboss
   lies flat under the overhead light and rises again as the beam drops to either side; that change in relief, with the
   floor shadow swinging opposite the finger, is what the member reads as moving a light. Past either edge the key keeps
   raking lower (a little extra, a grazing beam). Raising the light (y) moves energy from the keys into the top light.
   Rim stays low and constant; the ambient fill steps back a little while a key rakes, so the side away from it falls
   into shade. When the ink rises each group moves toward the manifest's ink mix, so the white light cools off and the
   label reads. The dawn brings key_l up first, then everything else. */
export function weights(x, y, ink, dawn, mix) {
  const s = clamp((x + 1) / 2);
  const kl = (1 - s) ** 1.7, kr = s ** 1.7;
  const over = Math.max(0, Math.abs(x) - 1) * 2.5;
  const mid = (1 - Math.min(1, Math.abs(x))) ** 2;
  const rake = 1 - .5 * y;
  const R = mix.inkR || INKR0, c = i => 1 + (R[i] - 1) * ink;
  const late = sm(.3, 1, dawn), early = sm(0, .75, dawn);
  return [
    (mix.key * (kl + (x < 0 ? over : 0)) * rake + mix.fill) * c(0) * early,
    (mix.key * (kr + (x > 0 ? over : 0)) * rake + mix.fill) * c(1) * late,
    (mix.top * (.5 + 2.2 * y) + mix.topMid * mid) * c(2) * late,
    mix.rim * c(3) * late,
    mix.amb * (1 - .3 * (1 - mid)) * c(4) * late,
    mix.ink * ink * early
  ];
}
/* the store's mix. The light agent's default_weights (key_l 1, key_r .12, top .18, rim .25, amb .5) light a warm,
   mid-grey room; the store wants the kit's pale Mist room with the metal still reading as metal, so the rest frame
   lifts the exposure a step and the top and fill a little, keeps the rim where the manifest has it, and grades the
   white balance a touch cooler (the warm left key otherwise turns the cyclorama olive). All within the manifest's
   ranges: at rest (x -0.72, y 0.22) the weights are about key_l 1.0, key_r .08, top .28, rim .25, amb .43, × 1.15. */
function mixFrom(m, s) {
  const dw = Object.assign({key_l: 1, key_r: .12, top: .18, rim: .25, amb: .5}, (m && m.default_weights) || {});
  const iw = (m && m.ink_weights) || null;
  const inkR = iw ? GROUPS.slice(0, 5).map((g, i) => dw[g] > 1e-4 && iw[g] != null ? iw[g] / dw[g] : INKR0[i]) : INKR0;
  return Object.assign({
    key: 1.4, fill: .04, top: .24, topMid: .55, rim: dw.rim, amb: .6, inkR,
    ink: ((iw && iw.ink) || 1) * 1.1, exposure: ((m && m.exposure) || 1) * 1.15, wb: [.965, 1, 1.045],
    /* the set alone (by the shot's mask) is exposed a stop paler and cooler: the room reads as the kit's Mist while
       the packs keep their own exposure, so metal stays metal; shadows on the floor keep their ratio */
    lift: [1.55, 1.65, 1.78]
  }, (s && s.mix) || {});
}
const INKR0 = [.35, .35, .35, .55, .5];
const MIX0 = {key: 1.3, fill: .04, top: .24, topMid: .55, rim: .25, amb: .6, ink: 1.2, exposure: 1.1, wb: [1, 1, 1]};

/* ================================================================ the manifest */
let MAN = null, manP = null;
export const MANIFEST_URL = 'assets/light/manifest.json';
export function loadManifest() {
  return manP || (manP = fetch(MANIFEST_URL, {cache: 'no-cache'}).then(r => r.ok ? r.json() : null).then(m => {
    if (!m || !m.shots) return null;
    m.base = new URL(m.base || 'assets/light/', location.href.replace(/[#?].*$/, '')).href;
    MAN = m; return m;
  }).catch(() => null));
}
export const manifest = () => MAN;
const abs = (m, f) => !f ? null : /^(https?:|data:|blob:|\/)/.test(f) ? f : new URL(f.replace(/^\.\//, ''), m.base).href;
/* a shot's file for this screen: m (1024) on a phone or a small screen, d (1600) otherwise */
export const wantD = () => Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2) > 1700 && innerWidth > 860;
export function shotFiles(name, size) {
  const m = MAN; if (!m || !m.shots || !m.shots[name]) return null;
  const s = m.shots[name], sz = size || (wantD() ? 'd' : 'm');
  const pick = v => v == null ? null : typeof v === 'string' ? abs(m, v) : abs(m, v[sz] || v.d || v.m);
  const passes = {}, scale = [];
  let ok = true;
  GROUPS.forEach((g, i) => { const v = s.passes && s.passes[g]; const u = pick(v); scale[i] = v && typeof v === 'object' && +v.scale > 0 ? +v.scale : 1; if (u) passes[g] = u; else if (g !== 'ink') ok = false; });
  const box = Array.isArray(s.packs) && s.packs.length === 1 && Array.isArray(s.packs[0].box) ? s.packs[0].box : (s.bbox || null);
  return {name, w: s.w, h: s.h, product: s.product || null, pack: s.pack || null, passes: ok ? passes : null, scale, poster: pick(s.poster), mask: pick(s.mask), inkStill: pick(s.poster_ink || s.ink_still), inkText: s.ink_text || '', mix: mixFrom(m, s), packs: s.packs || null, box, setBox: s.set_box || null, status: s.status || '', size: sz};
}
export const hasShot = name => !!(MAN && MAN.shots && MAN.shots[name]);

/* ================================================================ GL */
const VS = `#version 300 es
in vec2 p; out vec2 v; uniform vec4 fit;
void main(){ v = vec2(fit.z + (p.x * .5 + .5) * fit.x, fit.w + (.5 - p.y * .5) * fit.y); gl_Position = vec4(p, 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform sampler2D t0, t1, t2, t3, t4, t5, t6;   /* t6: the shot's mask (pack > 0, set 0) */
uniform float w[6];
uniform float expo, seed, dim;
uniform vec4 focus;            /* x: centre (uv), y: half width, z: amount, w: feather */
uniform vec3 bg;               /* the room's colour, linear: what the other packs recede into */
uniform vec3 wb;               /* white balance, linear */
uniform vec3 lift;             /* the set's exposure (cyclorama and floor only): the pale Mist room */
float h(vec2 q){ vec3 p3 = fract(vec3(q.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 enc(vec3 c){ c = max(c, 0.); return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
vec3 pbrNeutral(vec3 c){ const float s = .76; const float dsat = .15; float x = min(c.r, min(c.g, c.b)); float off = x < .08 ? x - 6.25 * x * x : .04; c -= off; float p = max(c.r, max(c.g, c.b)); if (p < s) return c; const float d = 1. - s; float np = 1. - d * d / (p + d - s); c *= np / p; float g = 1. - 1. / (dsat * (p - np) + 1.); return mix(c, vec3(np), g); }
void main(){
  vec3 c = w[0] * texture(t0, v).rgb + w[1] * texture(t1, v).rgb + w[2] * texture(t2, v).rgb
         + w[3] * texture(t3, v).rgb + w[4] * texture(t4, v).rgb + w[5] * texture(t5, v).rgb;
  c *= expo * wb;
  float pk = clamp(texture(t6, v).r * 10.2, 0., 1.);
  c *= mix(lift, vec3(1.), pk);
  if (focus.z > 0.) { float m = smoothstep(focus.y, focus.y + focus.w, abs(v.x - focus.x)) * focus.z; c = mix(c, bg * expo * wb * lift * dim, m * .72); }
  vec3 s = enc(pbrNeutral(c));
  float n = h(gl_FragCoord.xy + seed) + h(gl_FragCoord.xy * 1.37 + seed * 1.7 + 19.) - 1.;
  o = vec4(s + n / 255., 1.);
}`;
function compile(gl) {
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['fit', 'expo', 'seed', 'dim', 'focus', 'bg', 'w', 'wb', 'lift'].forEach(n => U[n] = gl.getUniformLocation(pr, n));
  for (let i = 0; i < 7; i++) gl.uniform1i(gl.getUniformLocation(pr, 't' + i), i);
  return U;
}
let glOK = null;
export function glSupported() {
  if (glOK != null) return glOK;
  if (NOGL) return (glOK = false);
  try { const c = document.createElement('canvas'), g = c.getContext('webgl2'); glOK = !!g; if (g) { const x = g.getExtension('WEBGL_lose_context'); x && x.loseContext(); } } catch (e) { glOK = false; }
  return glOK;
}

/* images arrive decoded off the main thread where the browser can */
const bmpCache = new Map();
function bitmap(src) {
  if (src instanceof HTMLCanvasElement || (typeof ImageBitmap !== 'undefined' && src instanceof ImageBitmap)) return Promise.resolve(src);
  if (bmpCache.has(src)) return bmpCache.get(src);
  const p = fetch(src).then(r => { if (!r.ok) throw new Error(r.status + ' ' + src); return r.blob(); })
    .then(b => typeof createImageBitmap === 'function' ? createImageBitmap(b, {colorSpaceConversion: 'none', premultiplyAlpha: 'none'}) : new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(b); }));
  bmpCache.set(src, p); p.catch(() => bmpCache.delete(src));
  return p;
}
/* the room's colour, sampled from the top corners of the poster (in linear light) */
function roomColour(img) {
  try {
    const c = document.createElement('canvas'); c.width = 32; c.height = 32; const g = c.getContext('2d', {willReadFrequently: true});
    g.drawImage(img, 0, 0, 32, 32); const d = g.getImageData(0, 0, 32, 4).data; let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
    const lin = u => { u /= 255; return u <= .04045 ? u / 12.92 : Math.pow((u + .055) / 1.055, 2.4); };
    return [lin(r / n), lin(gg / n), lin(b / n)];
  } catch (e) { return [.85, .87, .86]; }
}

/* ================================================================ the ink still (the no-WebGL path): poster + ink,
   added in linear light once, in a 2D canvas */
const inkStills = new Map();
export function inkStill(shot) {
  if (shot.inkStill) return Promise.resolve(shot.inkStill);
  if (!shot.passes || !shot.passes.ink || !shot.poster) return Promise.resolve(null);
  const key = shot.poster + '|' + shot.passes.ink;
  if (inkStills.has(key)) return inkStills.get(key);
  const p = Promise.all([bitmap(shot.poster), bitmap(shot.passes.ink)]).then(([a, b]) => {
    const w = a.width, h = a.height, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', {willReadFrequently: true});
    g.drawImage(a, 0, 0); const A = g.getImageData(0, 0, w, h);
    g.drawImage(b, 0, 0, w, h); const B = g.getImageData(0, 0, w, h);
    const L = new Float32Array(256); for (let i = 0; i < 256; i++) { const u = i / 255; L[i] = u <= .04045 ? u / 12.92 : Math.pow((u + .055) / 1.055, 2.4); }
    const enc = x => 255 * (x <= .0031308 ? 12.92 * x : 1.055 * Math.pow(Math.min(1, x), 1 / 2.4) - .055);
    const k = shot.mix.ink || 1, a2 = A.data, b2 = B.data;
    for (let i = 0; i < a2.length; i += 4) for (let j = 0; j < 3; j++) a2[i + j] = enc(L[a2[i + j]] * .82 + L[b2[i + j]] * k);
    g.putImageData(A, 0, 0);
    return new Promise(r => c.toBlob(bl => r(bl ? URL.createObjectURL(bl) : null), 'image/webp', .9));
  }).catch(() => null);
  inkStills.set(key, p);
  return p;
}

/* ================================================================ a relightable picture
   host: an element that already holds the poster (<img class="lt-po">). relight() adds the canvas over it.
   o.fit(W, H, iw, ih) → {zoom, cx, cy}: how the photograph sits in the box (default: cover, centred).
   o.focus(): null or {x, hw, amt} in image u, for the lineup. o.ink: whether this shot's ink pass belongs to the
   product on the page (a shared format render never shows another product's ingredients). */
const LIVE = new Set();
let io = null;
function observe(inst) {
  if (!io) io = new IntersectionObserver(es => es.forEach(e => { const i = e.target.__lt; if (!i) return; i.vis = e.isIntersecting; if (i.vis) { i.dirty = true; kick(); i.onVisible && i.onVisible(); } }), {rootMargin: '80px 0px'});
  io.observe(inst.host);
}
/* the phone's texture budget (six passes of 1024² at most on a screen): a picture loads its passes as it comes within
   about half a screen of view, and on a phone lets them go again once it is that far away (the framed poster stays) */
const PHONE = () => innerWidth <= 860;
const nios = new Map();
function near(inst) {
  const pg = document.getElementById('page'), root = pg && pg.contains(inst.host) ? pg : null;
  let n = nios.get(root);
  if (!n) { n = new IntersectionObserver(es => es.forEach(e => { const i = e.target.__lt; if (!i) return; i.near = e.isIntersecting; if (i.near) want(i); else if (PHONE()) unload(i); }), {root, rootMargin: '50% 0px'}); nios.set(root, n); }
  n.observe(inst.host); inst.nio = n;
}
function want(inst) { if (inst.destroyed || inst.failed || !inst.gl || inst.ready || inst.loading) return; load(inst); }
function unload(inst) {
  if (!inst.ready || inst.destroyed || !inst.gl) return;
  inst.tex.forEach(t => inst.gl.deleteTexture(t)); inst.tex = [];
  inst.ready = false; inst.last = null; inst.mode = 'poster'; inst.host.classList.remove('lt-on');
}
export function relight(host, shot, o = {}) {
  const inst = {
    host, shot, o, vis: false, dirty: true, gl: null, U: null, tex: [], ready: false, failed: false, last: null, bg: [.85, .87, .86],
    W: 0, H: 0, ink: o.ink !== false && !!(shot.passes && shot.passes.ink), mode: 'poster', destroyed: false
  };
  host.__lt = inst;
  host.classList.add('lt');
  /* the poster, framed exactly as the live picture will be (same fit, the same clamped edges), in a 2D canvas: the
     first paint, the no-WebGL picture, and what the live canvas dissolves in over */
  const po = host.querySelector('.lt-po');
  inst.po = po;
  const pc = document.createElement('canvas'); pc.className = 'lt-pc'; pc.setAttribute('aria-hidden', 'true'); host.appendChild(pc); inst.pc = pc;
  if (po) {
    const take = () => { if (inst.destroyed) return; inst.bg = roomColour(po); if (!inst.iw) { inst.iw = po.naturalWidth; inst.ih = po.naturalHeight; } inst.poDirty = true; paintPoster(inst); host.classList.add('lt-pcon'); };
    po.complete && po.naturalWidth ? take() : po.addEventListener('load', take, {once: true});
  }

  const canGL = glSupported() && shot.passes;
  if (canGL) {
    const cv = document.createElement('canvas'); cv.className = 'lt-cv'; cv.setAttribute('aria-hidden', 'true');
    host.appendChild(cv); inst.cv = cv;
    try {
      const gl = cv.getContext('webgl2', {alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power'});
      if (!gl) throw new Error('no webgl2');
      inst.gl = gl; inst.U = compile(gl);
      cv.addEventListener('webglcontextlost', e => { e.preventDefault(); inst.ready = false; inst.failed = true; host.classList.remove('lt-on'); stillMode(inst); }, false);
      near(inst);
    } catch (e) { console.warn('[pr6] relight unavailable, the poster stands in', e); inst.failed = true; cv.remove(); inst.cv = null; stillMode(inst); }
  } else stillMode(inst);

  inst.ro = new ResizeObserver(() => { inst.dirty = true; inst.poDirty = true; kick(); });
  inst.ro.observe(host);
  observe(inst);
  bindInput(inst);
  LIVE.add(inst);
  kick();
  inst.destroy = () => {
    if (inst.destroyed) return; inst.destroyed = true; LIVE.delete(inst); io && io.unobserve(host); inst.nio && inst.nio.unobserve(host); inst.ro.disconnect(); inst.unbind && inst.unbind();
    if (inst.gl) { const x = inst.gl.getExtension('WEBGL_lose_context'); inst.tex.forEach(t => inst.gl.deleteTexture(t)); x && x.loseContext(); }
    host.__lt = null;
  };
  inst.state = () => ({shot: shot.name, mode: inst.mode, ready: inst.ready, vis: inst.vis, ink: inst.ink, failed: inst.failed, W: inst.W, H: inst.H, product: shot.product, frames: inst.frames || 0, fake: !!shot.fake});
  /* a frame of the live picture as a still (for the view transition and the flight into Protocol), drawn now */
  inst.snapshot = (x0 = 0, y0 = 0, w = 1, h = 1) => {
    const src = inst.ready ? inst.cv : inst.pc; if (!src || !src.width) return null;
    if (inst.ready) draw(inst, true);
    const sw = src.width, sh = src.height;
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(sw * w)); c.height = Math.max(1, Math.round(sh * h));
    try { c.getContext('2d').drawImage(src, sw * x0, sh * y0, sw * w, sh * h, 0, 0, c.width, c.height); return c; } catch (e) { return null; }
  };
  return inst;
}
async function load(inst) {
  const {gl, shot} = inst;
  inst.loading = true;
  try {
    const srcs = GROUPS.map(g => shot.passes[g] || null);
    const [bms, mk] = await Promise.all([Promise.all(srcs.map(s => s ? bitmap(s) : null)), shot.mask ? bitmap(shot.mask).catch(() => null) : null]);
    if (inst.destroyed) return;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    bms.forEach((b, i) => {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
      if (b) gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, b);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      if (b) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, b ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      inst.tex.push(t);
    });
    /* the mask, in linear units; without one every pixel counts as pack and nothing is lifted */
    { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, t);
      if (mk) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, mk);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      inst.tex.push(t); }
    inst.loading = false;
    const b0 = bms[0]; inst.iw = b0.width; inst.ih = b0.height;
    if (!inst.ink) inst.inkOff = true;
    inst.ready = true; inst.dirty = true; inst.mode = 'gl';
    draw(inst, true);
    requestAnimationFrame(() => { if (!inst.destroyed) inst.host.classList.add('lt-on'); });
    inst.onReady && inst.onReady();
    if (PHONE() && inst.near === false) unload(inst);
    kick();
  } catch (e) {
    inst.loading = false;
    console.warn('[pr6] passes did not load, the poster stands in', e);
    inst.failed = true; if (inst.cv) inst.cv.remove(); stillMode(inst);
  }
}
/* the poster path: the ink still (poster + ink, added in linear light once) crossfades in on press, only when the
   ink belongs to this product */
function stillMode(inst) {
  inst.mode = 'poster';
  if (!inst.ink || inst.inkIm) return;
  inkStill(inst.shot).then(u => {
    if (!u || inst.destroyed) return;
    const im = new Image(); im.decoding = 'async'; im.src = u;
    im.onload = () => { if (inst.destroyed) return; inst.inkIm = im; const c = document.createElement('canvas'); c.className = 'lt-pk'; c.setAttribute('aria-hidden', 'true'); inst.host.appendChild(c); inst.pk = c; inst.poDirty = true; paintPoster(inst); };
  });
}
/* paint an image into a 2D canvas with the live picture's framing; past the image, its edge rows and columns are
   stretched outward, exactly as the GPU's clamp-to-edge extends the passes */
function paintFramed(c, img, inst) {
  const r = inst.host.getBoundingClientRect(); if (!r.width || !img || !img.naturalWidth) return;
  const dpr = Math.min(devicePixelRatio || 1, DPR_CAP), W = Math.max(2, Math.round(r.width * dpr)), H = Math.max(2, Math.round(r.height * dpr));
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const [sx, sy, ox, oy] = fitOf({W, H, iw: inst.iw || iw, ih: inst.ih || ih, o: inst.o});
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  const dx = -ox / sx * W, dw = W / sx, dy = -oy / sy * H, dh = H / sy;
  g.clearRect(0, 0, W, H);
  g.drawImage(img, dx, dy, dw, dh);
  const L = Math.max(0, dx), R = Math.max(0, W - (dx + dw)), T = Math.max(0, dy), B = Math.max(0, H - (dy + dh));
  if (L > 0) g.drawImage(img, 0, 0, 1, ih, 0, dy, L + 1, dh);
  if (R > 0) g.drawImage(img, iw - 1, 0, 1, ih, dx + dw - 1, dy, R + 1, dh);
  if (T > 0) g.drawImage(img, 0, 0, iw, 1, dx, 0, dw, T + 1);
  if (B > 0) g.drawImage(img, 0, ih - 1, iw, 1, dx, dy + dh - 1, dw, B + 1);
  if (L > 0 && T > 0) g.drawImage(img, 0, 0, 1, 1, 0, 0, L + 1, T + 1);
  if (R > 0 && T > 0) g.drawImage(img, iw - 1, 0, 1, 1, dx + dw - 1, 0, R + 1, T + 1);
  if (L > 0 && B > 0) g.drawImage(img, 0, ih - 1, 1, 1, 0, dy + dh - 1, L + 1, B + 1);
  if (R > 0 && B > 0) g.drawImage(img, iw - 1, ih - 1, 1, 1, dx + dw - 1, dy + dh - 1, R + 1, B + 1);
}
function paintPoster(inst) {
  if (!inst.poDirty || inst.destroyed) return;
  inst.poDirty = false;
  if (inst.po && inst.po.naturalWidth) paintFramed(inst.pc, inst.po, inst);
  if (inst.pk && inst.inkIm) paintFramed(inst.pk, inst.inkIm, inst);
}

/* how the photograph sits in the box: cover, scaled by zoom (below 1 the edges extend: the cyclorama and the floor
   are clamped outward, which reads as more room), centred on (cx, cy) in image units */
/* where the ink sits on each hero's label (centre, in image units, measured from the ink passes): while the ink is up
   the live picture leans in toward it, as you would bring a label closer to read it under a lamp; on a phone that
   takes the printed lines from about 9 px to about 13 px tall */
const INKAT = {vial_hero: [.536, .507], vial_blank: null, tin_hero: [.449, .611], pouch_hero: [.432, .595], box_hero: [.57, .5], dropper_hero: [.468, .782], jar_hero: [.368, .754]};
function fitOf(inst) {
  const {W, H, iw, ih} = inst;
  const f = Object.assign({}, inst.o.fit ? inst.o.fit(W, H, iw, ih) : {zoom: 1, cx: .5, cy: .5});
  const at = inst.mode === 'gl' && inst.ink && !inst.inkOff && inst.o.inkZoom !== 0 && inst.shot && INKAT[inst.shot.name];
  if (at && LIGHT.lean.v > .001) {
    const e = E.io(clamp(LIGHT.lean.v)), k = inst.o.inkZoom || 1.38;
    f.zoom = (f.zoom || 1) * (1 + (k - 1) * e);
    f.cx = lerp(f.cx ?? .5, at[0], e * .8); f.cy = lerp(f.cy ?? .5, at[1], e * .8);
  }
  const s = Math.max(W / iw, H / ih) * (f.zoom || 1);
  const sx = W / (iw * s), sy = H / (ih * s);
  let ox = (f.cx ?? .5) - sx / 2, oy = (f.cy ?? .5) - sy / 2;
  if (!f.free) { if (sx <= 1) ox = clamp(ox, 0, 1 - sx); if (sy <= 1) oy = clamp(oy, 0, 1 - sy); }
  return [sx, sy, ox, oy];
}
function size(inst) {
  const r = inst.host.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, DPR_CAP);
  const W = Math.max(2, Math.round(r.width * dpr)), H = Math.max(2, Math.round(r.height * dpr));
  if (W !== inst.cv.width || H !== inst.cv.height) { inst.cv.width = W; inst.cv.height = H; }
  inst.W = W; inst.H = H; inst.cssW = r.width; inst.cssH = r.height;
}
function draw(inst, force) {
  if (!inst.ready || inst.destroyed) return;
  const gl = inst.gl, U = inst.U;
  if (force || inst.dirty) size(inst);
  const mix = inst.shot.mix;
  const ink = inst.inkOff ? 0 : LIGHT.ink.v;
  const w = weights(LIGHT.x.v, LIGHT.y.v, ink, LIGHT.dawn, mix);
  const sc = inst.shot.scale || [];
  for (let i = 0; i < 6; i++) w[i] *= sc[i] || 1;
  const f = inst.o.focus ? inst.o.focus() : null;
  const fit = fitOf(inst);
  const sig = w.map(x => x.toFixed(4)).join() + '|' + fit.map(x => x.toFixed(5)).join() + '|' + (f ? [f.x, f.hw, f.amt].map(x => (+x).toFixed(4)).join() : '') + '|' + inst.W + 'x' + inst.H;
  if (!force && sig === inst.last) { inst.dirty = false; return; }
  inst.last = sig; inst.dirty = false;
  gl.viewport(0, 0, inst.W, inst.H);
  gl.uniform4f(U.fit, fit[0], fit[1], fit[2], fit[3]);
  gl.uniform1fv(U.w, w);
  gl.uniform1f(U.expo, mix.exposure || 1);
  const wb = mix.wb || [1, 1, 1]; gl.uniform3f(U.wb, wb[0], wb[1], wb[2]);
  /* the set's lift eases off as the ink rises, so the room goes darker and colder and the ink carries */
  const lf = mix.lift || [1, 1, 1], li = 1 - .45 * clamp(ink); gl.uniform3f(U.lift, 1 + (lf[0] - 1) * li, 1 + (lf[1] - 1) * li, 1 + (lf[2] - 1) * li);
  gl.uniform1f(U.seed, (now() % 1000) * .37);
  gl.uniform1f(U.dim, f ? f.dim ?? 1 : 1);
  gl.uniform3f(U.bg, inst.bg[0], inst.bg[1], inst.bg[2]);
  gl.uniform4f(U.focus, f ? f.x : 0, f ? f.hw : 0, f ? f.amt : 0, f ? (f.feather || .03) : .03);
  for (let i = 0; i < 7; i++) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, inst.tex[i]); }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  inst.frames = (inst.frames || 0) + 1;
}

/* ================================================================ input on a picture */
function bindInput(inst) {
  const el = inst.host, o = inst.o;
  const coarse = matchMedia('(pointer: coarse)').matches;
  let down = null, lp = 0, backT = 0;
  const pos = e => { const r = el.getBoundingClientRect(); return {u: (e.clientX - r.left) / r.width, v: (e.clientY - r.top) / r.height}; };
  /* the finger's place on the picture → the light's place: across is x (with a little overreach at the edges, so
     the beam can graze from past the frame), down the picture is the light coming lower */
  const toLight = p => ({x: lerp(-1.12, 1.12, clamp(p.u)), y: clamp(1 - (p.v - .05) / .9) * .95});
  const take = p => { const t = toLight(p); LIGHT.hand = now(); stopSweep(); LIGHT.set(t.x, t.y); edgeInk(t.x); };
  const edgeInk = x => { if (!inst.ink || RM) return; if (LIGHT.inkHeld || LIGHT.inkKey) return; LIGHT.ink.set(down ? .6 * sm(.98, 1.1, Math.abs(x)) : 0); };
  const inkOn = on => { if (!inst.ink) return; LIGHT.inkHeld = on; LIGHT.ink.set(on || LIGHT.inkKey ? 1 : 0); LIGHT.lean.set(on || LIGHT.inkKey ? 1 : 0); el.classList.toggle('lt-inked', on || LIGHT.inkKey); inkStillShow(inst, on || LIGHT.inkKey); kick(); o.onInk && o.onInk(on); };
  /* the ink: a finger (or the mouse button) held still for 600 ms, anywhere on the picture, whether or not it dragged
     first. Under reduced motion the light stays at the left key and a press shows the ink at once. */
  const still = () => { clearTimeout(lp); lp = setTimeout(() => { if (down && !LIGHT.inkHeld) inkOn(true); }, 600 / TS); };
  const onDown = e => {
    if (e.button > 0) return;
    clearTimeout(backT);
    down = {x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, id: e.pointerId, t: now(), moved: 0, type: e.pointerType, axis: null};
    if (RM) { inkOn(true); return; }
    if (e.pointerType !== 'touch') take(pos(e));
    still();
  };
  const onMove = e => {
    if (down && e.pointerId === down.id) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y; down.moved = Math.max(down.moved, Math.hypot(dx, dy));
      if (!down.axis && down.moved > 6) down.axis = Math.abs(dx) >= Math.abs(dy) * .8 ? 'x' : 'y';
      if (RM) return;
      if (down.type !== 'touch' || down.axis === 'x' || LIGHT.inkHeld) take(pos(e));
      /* moved more than a few pixels since the last still point: start counting the hold again */
      if (Math.hypot(e.clientX - down.sx, e.clientY - down.sy) > 10) { down.sx = e.clientX; down.sy = e.clientY; if (!LIGHT.inkHeld) still(); }
      return;
    }
    /* a mouse over the picture moves the light without a press: the first thing a desktop visitor finds */
    if (e.pointerType === 'mouse' && !coarse && o.hover !== false && !RM) take(pos(e));
  };
  const onUp = e => {
    if (!down || (e && e.pointerId !== down.id)) return;
    const wasTap = down.moved < 8 && now() - down.t < 350 && !LIGHT.inkHeld;
    clearTimeout(lp);
    if (LIGHT.inkHeld) inkOn(false);
    down = null;
    if (!LIGHT.inkKey) LIGHT.ink.set(0);
    if (wasTap && o.onTap) o.onTap(e);
    /* released: the light eases back to the left key, a moment later */
    if (e && e.pointerType !== 'mouse' && !RM) { clearTimeout(backT); backT = setTimeout(() => { if (!down) { LIGHT.rest(); } }, 900); }
    kick();
  };
  const onLeave = e => { if (down) return; if (e.pointerType === 'mouse') { clearTimeout(backT); backT = setTimeout(() => { if (!down) LIGHT.rest(); }, 700); } };
  const onKey = e => {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    const step = e.shiftKey ? .08 : .25;
    let used = true;
    if (RM && /^Arrow/.test(e.key)) used = false;
    else if (e.key === 'ArrowLeft') LIGHT.set(LIGHT.x.to - step); else if (e.key === 'ArrowRight') LIGHT.set(LIGHT.x.to + step);
    else if (e.key === 'ArrowUp') LIGHT.set(null, LIGHT.y.to + step); else if (e.key === 'ArrowDown') LIGHT.set(null, LIGHT.y.to - step);
    else if ((e.key === 'i' || e.key === 'I') && inst.ink) { LIGHT.inkKey = !LIGHT.inkKey; inkOn(LIGHT.inkKey); }
    else if (e.key === 'Home' || e.key === 'Escape') { LIGHT.inkKey = false; inkOn(false); LIGHT.rest(); }
    else used = false;
    if (used) { e.preventDefault(); e.stopPropagation(); LIGHT.hand = now(); stopSweep(); kick(); }
  };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('pointerleave', onLeave);
  el.addEventListener('keydown', onKey);
  const cm = e => e.preventDefault(); el.addEventListener('contextmenu', cm);
  inst.unbind = () => { clearTimeout(lp); clearTimeout(backT); el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp); el.removeEventListener('pointerleave', onLeave); el.removeEventListener('keydown', onKey); el.removeEventListener('contextmenu', cm); };
}
function inkStillShow(inst, on) { if (inst.mode !== 'gl' && inst.pk) inst.pk.classList.toggle('on', on); }

/* ================================================================ choreography: the dawn, the idle sweep, the scroll */
/* the gate hand-off: from black, key_l rises, then the room */
export function dawn(ms = 1500) {
  LIGHT.dawn = 0; LIGHT.x.snap(REST.x); LIGHT.y.snap(REST.y);
  const t0 = now(), d = RM ? Math.min(ms, 500) : ms;
  return new Promise(res => { LIGHT._dawn = {t0, d, res}; kick(); });
}
export function setDark() { LIGHT.dawn = 0; kick(); }
/* the idle sweep: an eased arc from the left key across to the right, a breath, and back */
export function sweep(o = {}) {
  if (RM || LIGHT.sweep) return;
  if (now() - LIGHT.hand < 2500 && !o.force) return;
  const x0 = LIGHT.x.to, y0 = LIGHT.y.to;
  LIGHT.sweep = {t0: now() + (o.delay || 0), x0, y0};
  LIGHT.sweeps++;
  kick();
}
export function stopSweep() { LIGHT.sweep = null; }
function stepSweep(now) {
  const s = LIGHT.sweep; if (!s) return;
  const t = (now - s.t0) / 1000; if (t < 0) return;
  const A = 2.4, H = .55, B = 2.2;
  let x, y;
  if (t < A) { const u = E.io(t / A); x = lerp(s.x0, .86, u); y = s.y0 + .2 * Math.sin(Math.PI * u); }
  else if (t < A + H) { x = .86; y = s.y0; }
  else if (t < A + H + B) { const u = E.io((t - A - H) / B); x = lerp(.86, REST.x, u); y = s.y0 + .08 * Math.sin(Math.PI * u); }
  else { LIGHT.sweep = null; LIGHT.x.set(REST.x); LIGHT.y.set(REST.y); return; }
  LIGHT.x.set(x); LIGHT.y.set(y);
}
/* the page scroll drives the light while no hand is on it: a picture moving through the screen sweeps its light.
   driver(): the picture (host element) and how its position maps to x, provided by the page. */
let scrollDriver = null;
export function setScrollDriver(fn) { scrollDriver = fn; }
export function onScroll() {
  if (RM || !scrollDriver) return;
  if (now() - LIGHT.hand < 2200) return;
  const t = scrollDriver(); if (t == null) return;
  stopSweep();
  LIGHT.x.set(t.x); if (t.y != null) LIGHT.y.set(t.y);
  kick();
}

/* ================================================================ the loop: runs only while something moves */
let raf = 0, lastT = 0;
export function kick() { if (!raf) { lastT = now(); raf = requestAnimationFrame(loop); } LIVE.forEach(i => { i.dirty = true; }); }
function loop(ts) {
  raf = 0;
  const t = now(); const dt = Math.min(.05, Math.max(0, (t - lastT) / 1000)); lastT = t;
  if (LIGHT._dawn) { const k = clamp((t - LIGHT._dawn.t0) / LIGHT._dawn.d); LIGHT.dawn = E.io(k); if (k >= 1) { const r = LIGHT._dawn.res; LIGHT._dawn = null; r(); } }
  stepSweep(t);
  LIGHT.x.step(dt); LIGHT.y.step(dt); LIGHT.ink.step(dt); LIGHT.lean.step(dt);
  let busy = !!(LIGHT._dawn || LIGHT.sweep) || !LIGHT.x.rest || !LIGHT.y.rest || !LIGHT.ink.rest || !LIGHT.lean.rest;
  LIVE.forEach(i => { if (i.o.tick) busy = i.o.tick(dt) || busy; if (i.vis && !document.hidden) { if (i.ready) draw(i); else if (i.poDirty || i.o.panning) paintPoster(i); } });
  LISTEN.forEach(f => f(LIGHT));
  /* while the ink is up the page steps back from the picture (the display line fades; see app.css) */
  const inked = LIGHT.lean.v > .3; if (inked !== HTMLINK) { HTMLINK = inked; document.documentElement.classList.toggle('inked', inked); }
  if (busy && !document.hidden) raf = requestAnimationFrame(loop);
}
const LISTEN = new Set();
let HTMLINK = false;
export const onLight = f => { LISTEN.add(f); return () => LISTEN.delete(f); };
document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
export const liveCount = () => LIVE.size;
export const instances = () => [...LIVE];
export const lightNow = now;

/* ================================================================ fake passes (development only: until the light
   agent's manifest lands, a v11 pack render is split into directional "passes" in a canvas, so the shader, the
   springs and the inputs can be built against something). Never used once assets/light/manifest.json exists. */
export async function fakeShot(name, src, product) {
  const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const w = im.naturalWidth, h = im.naturalHeight;
  const mk = paint => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'multiply'; paint(g); return c; };
  const lg = (x0, y0, x1, y1, a, b) => g => { const gr = g.createLinearGradient(x0 * w, y0 * h, x1 * w, y1 * h); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
  const passes = {
    key_l: mk(lg(0, 0, 1, 0, '#ffffff', '#101010')), key_r: mk(lg(1, 0, 0, 0, '#ffffff', '#101010')),
    top: mk(lg(0, 0, 0, 1, '#d0d0d0', '#202020')), rim: mk(lg(0, 0, 0, 1, '#303030', '#050505')), amb: mk(g => { g.fillStyle = '#3a3a3a'; g.fillRect(0, 0, w, h); })
  };
  const ink = document.createElement('canvas'); ink.width = w; ink.height = h; const g = ink.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#7fa6c0'; g.font = `${Math.round(w * .026)}px DejaVu Sans Mono, monospace`; g.textAlign = 'center';
  (product || 'FAKE INK').split(' · ').forEach((l, k) => g.fillText(l, w / 2, h * .56 + k * w * .04));
  passes.ink = ink;
  return {name, w, h, product: null, passes, poster: src, inkText: '', mix: Object.assign({}, MIX0, {exposure: 1.1}), scale: [1, 1, 1, 1, 1, 1], fake: true};
}

// PR6 / Alley: outside -> threshold -> inside.
// Black. Footsteps; each one brings a light up in the alley. A hologram speaks four lines, looks at you, loses signal.
// You walk (scroll, swipe, arrow keys, or hold) to the one lit door. A small terminal asks for a code.
// Wrong: SUBJECT NOT RECOGNIZED. Right: the city's sound stops in one sample, the door slides, white, and the corridor.
import { createScene } from './scene.js';
import { createHolo } from './holo.js';
import { createSound } from './sound.js';

const CODE = '0047RSRV';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s) => document.querySelector(s);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

const LINES = [
  'YOU HAVE EXCEEDED THE EXPECTED RANGE.',
  'RESULTS REMAIN INCOMPLETE.',
  'ANOTHER VERSION HAS BEEN DETECTED.',
  'ACCESS HAS NOT BEEN GRANTED.',
];
// the order the alley comes up in, one group per footstep
const REVEAL = ['crimson', 'steam', 'wash', 'amb', 'fluor', 'haze', 'sign', 'holo'];
const OUT_W = { amb: 0.9, crimson: 1.0, wash: 1.0, steam: 0.6, fluor: 1.0, haze: 1.3, sign: 0.8, holo: 1.0, door: 2.2, inside: 0 };
// tints that override the render's own (luma-normalised): the sign burns red, not amber
const TINT = { sign: [2.2, 0.62, 0.55] };
const IN_W = { amb: 1, bank1: 1, bank2: 1, bank3: 1, bank4: 1, end: 1 };
const LOOK = { outside: { expo: 1.0, vp: [0.5, 0.537], shiftL: 0.035 }, inside: { expo: 0.9, vp: [0.5, 0.52], shiftL: 0.02 } };

{ // review: ?w=crimson:.8,steam:.4&expo=1.1 overrides the grade
  const q = new URLSearchParams(location.search);
  (q.get('w') || '').split(',').filter(Boolean).forEach((kv) => { const [k, v] = kv.split(':'); if (k in OUT_W) OUT_W[k] = +v; else IN_W[k] = +v; });
  if (q.get('expo')) LOOK.outside.expo = +q.get('expo');
  if (q.get('iexpo')) LOOK.inside.expo = +q.get('iexpo');
}
const canvas = $('#scene');
let S = null, H = null, snd = null;
try { S = createScene(canvas); } catch (e) { console.warn(e); }
try { H = S && createHolo($('#holo')); } catch (e) { console.warn(e); }

const st = {
  phase: 'black', world: 'outside', set: null, sets: {}, walk: [], wi: 0,
  target: {}, on: {}, catchT: {},          // per light group: target weight, when it switched on
  trans: null,                              // a running footstep transition
  bob: 0, bobSign: 1, roll: 0,
  holo: { alpha: 0, signal: 1, glitch: 0, yaw: -0.55, flick: 1 }, holoActive: false,
  queue: 0, frozen: false, muted: false, t0: performance.now(),
};

async function getJSON(u) { const r = await fetch(u); if (!r.ok) throw new Error(u); return r.json(); }
function setFrames(set, prefix) { return Object.keys(set.man.frames).filter((k) => k.startsWith(prefix)).sort(); }

// ------------------------------------------------------------------ boot
(async function boot() {
  if (!S) return fallback();
  try {
    const [a, b] = await Promise.all([getJSON('assets/alley/manifest.json'), getJSON('assets/inside/manifest.json').catch(() => null)]);
    st.sets.outside = { base: 'assets/alley/', man: a };
    if (b) st.sets.inside = { base: 'assets/inside/', man: b };
  } catch (e) { console.warn(e); return fallback(); }
  st.set = st.sets.outside; S.useSet(st.set);
  st.walk = setFrames(st.set, 'f');
  st.door = setFrames(st.set, 'd');
  S.resize(); H && H.resize();
  const first = await S.load(st.set, st.walk[0]);
  S.A = first; S.B = null;
  for (const g of Object.keys(OUT_W)) { st.target[g] = 0; S.weights[g] = 0; }
  S.expo = LOOK.outside.expo; S.vp = LOOK.outside.vp; Object.assign(S.tint, TINT);
  ready();
  // everything else, nearest first
  const order = [...st.walk.slice(1), ...st.door];
  (async () => { for (const f of order) { try { await S.load(st.set, f); } catch (e) { /* missing frame */ } } preloadInside(); })();
  requestAnimationFrame(frame);
})();

function preloadInside() {
  const I = st.sets.inside; if (!I) return;
  (async () => { for (const f of setFrames(I, 'c')) { try { await S.load(I, f); } catch (e) { /* */ } } })();
}

function fallback() {
  const p = $('#poster'); p.src = 'assets/alley/poster.jpg'; p.hidden = false;
  ready(); st.noGL = true;
}

function ready() {
  const go = $('#go'), q = $('#quiet');
  go.disabled = false; q.disabled = false; go.innerHTML = '<span class="m">Begin</span>'; go.focus({ preventScroll: true });
  go.addEventListener('click', () => begin(true), { once: true });
  q.addEventListener('click', () => begin(false), { once: true });
}

async function begin(withSound) {
  if (withSound) { snd = createSound(); if (snd) { await snd.resume(); snd.cityOn(RM ? 1 : 5); } }
  st.muted = !withSound;
  const m = $('#mute'); m.hidden = false; m.setAttribute('aria-pressed', String(!snd));
  m.addEventListener('click', () => {
    if (!snd) { snd = createSound(); if (!snd) return; snd.resume(); if (st.world === 'outside' && !st.frozen) snd.cityOn(1); else snd.insideOn(1); m.setAttribute('aria-pressed', 'false'); return; }
    const on = snd.ac.state === 'running'; on ? snd.ac.suspend() : snd.ac.resume(); m.setAttribute('aria-pressed', String(on));
  });
  $('#begin').classList.add('gone'); document.body.classList.remove('is-black');
  if (st.noGL) return fallbackFlow();
  const at = new URLSearchParams(location.search).get('at');   // review shortcuts: ?at=walk | door | inside
  if (at) return jump(at);
  st.phase = 'reveal';
  await sleep(1400);
  // footsteps first, nothing seen for two of them
  for (let i = 0; i < 2; i++) { footstep(0.8); await sleep(1050); }
  for (const g of REVEAL) {
    footstep(1); await sleep(140);
    if (g === 'holo') { startHolo(); } else lightOn(g);
    await sleep(g === 'fluor' ? 1500 : 1150);
  }
}

async function jump(at) {
  for (const g of Object.keys(OUT_W)) if (g !== 'holo' && g !== 'inside') { st.target[g] = OUT_W[g]; S.weights[g] = OUT_W[g]; }
  if (at === 'holo') { st.target.door = 0; S.weights.door = 0; startHolo(); return; }
  if (at === 'walk') { st.phase = 'walk'; showHint(); return; }
  if (at === 'door') { while (!S.get(st.set, st.walk[st.walk.length - 1])) await sleep(100); st.wi = st.walk.length - 1; S.A = S.get(st.set, st.walk[st.wi]); openTerminal(); return; }
  if (at === 'inside') { for (const f of st.door) await S.load(st.set, f); openDoor(); }
}

function lightOn(g, w) { st.target[g] = w ?? OUT_W[g] ?? IN_W[g] ?? 1; st.catchT[g] = performance.now(); }

function footstep(weight = 1) {
  if (snd && !(st.world === 'outside' && st.frozen)) snd.step(st.world === 'outside', weight);
  st.bob = 1; st.bobSign *= -1;
}

// ------------------------------------------------------------------ the hologram
async function startHolo() {
  st.holoActive = true; st.target.holo = OUT_W.holo; st.catchT.holo = performance.now();
  const h = st.holo; const T = performance.now();
  const at = (ms) => sleep(Math.max(0, T + ms - performance.now()));
  // flicker in
  animate(1200, (t) => { h.alpha = t * (0.6 + 0.4 * Math.random()); });
  snd && snd.holo(0.6);
  await at(1600); say(LINES[0]);
  await at(4900); say(LINES[1]);
  await at(8100); say(LINES[2]);
  await at(8300); animate(RM ? 1 : 1100, (t) => { h.yaw = -0.55 * (1 - ease(t)); });   // it turns to you
  await at(11300); say(LINES[3]);
  await at(12900); animate(RM ? 1 : 900, (t) => { h.yaw = -0.32 * ease(t); });
  await at(14300);
  snd && snd.holo(1.0);
  animate(700, (t) => { h.glitch = t; });
  await at(14900);
  animate(RM ? 1 : 520, (t) => { h.signal = 1 - ease(t); });
  sayOut();
  await at(15500);
  h.alpha = 0; st.holoActive = false; st.target.holo = 0; snd && snd.holo(0);
  await at(16200);
  footstep(0.5); lightOn('door');
  await at(17400);
  st.phase = 'walk'; showHint();
}

function scramble(el, text, dur = 900) {
  const glyphs = '▮▯/\\_-:·░';
  const spans = [...text].map((c) => { const s = document.createElement('span'); s.textContent = c === ' ' ? ' ' : glyphs[(Math.random() * glyphs.length) | 0]; return s; });
  el.replaceChildren(...spans);
  const order = spans.map((_, i) => i).sort(() => Math.random() - 0.5);
  const t0 = performance.now();
  (function tick() {
    const k = clamp((performance.now() - t0) / dur);
    const n = Math.floor(order.length * k);
    spans.forEach((s, i) => { if (text[i] === ' ') return; const done = order.indexOf(i) < n; s.textContent = done ? text[i] : (Math.random() < 0.2 ? glyphs[(Math.random() * glyphs.length) | 0] : s.textContent); });
    if (k < 1) requestAnimationFrame(tick);
  })();
}
function say(text) { const el = $('#say'); el.classList.remove('out'); scramble(el, text, RM ? 1 : 900); }
function sayOut() { $('#say').classList.add('out'); }

function showHint(text) {
  const h = $('#hint');
  const touch = matchMedia('(pointer:coarse)').matches;
  h.textContent = text || (touch ? 'Swipe up or hold to walk' : 'Scroll or hold to walk');
  h.hidden = false;
}
function hideHint() { $('#hint').hidden = true; }

// ------------------------------------------------------------------ walking
function stepTo(dir) {
  if (st.phase !== 'walk' && st.phase !== 'inwalk') return;
  if (st.trans) { st.queue = clamp(st.queue + dir, -1, 1); return; }
  const j = st.wi + dir;
  if (j < 0 || j >= st.walk.length) return;
  const next = S.get(st.set, st.walk[j]);
  if (!next) { S.load(st.set, st.walk[j]); return; }
  hideHint();
  const prev = S.get(st.set, st.walk[st.wi]);
  st.wi = j;
  S.B = prev; S.A = next; S.mix = 0;
  // a rough per-step zoom: how much nearer the vanishing point gets in one camera position
  const k = st.world === 'outside' ? 0.13 : 0.12;
  st.trans = { t0: performance.now(), dur: RM ? 420 : 820, dir, k };
  footstep(1);
}

function arrived() {
  if (st.world === 'outside' && st.wi === st.walk.length - 1) openTerminal();
  if (st.world === 'inside' && st.wi === st.walk.length - 1) { hideHint(); $('#held').hidden = false; requestAnimationFrame(() => $('#held').classList.add('on')); }
}

let wheelAcc = 0, wheelT = 0;
addEventListener('wheel', (e) => {
  if (st.phase !== 'walk' && st.phase !== 'inwalk') return;
  const now = performance.now(); if (now - wheelT > 300) wheelAcc = 0; wheelT = now;
  wheelAcc += e.deltaY;
  if (Math.abs(wheelAcc) > 60) { stepTo(Math.sign(wheelAcc)); wheelAcc = 0; }
}, { passive: true });
let ty = null, holdTimer = null;
function holdStart() { clearInterval(holdTimer); stepTo(1); holdTimer = setInterval(() => stepTo(1), RM ? 600 : 880); }
function holdEnd() { clearInterval(holdTimer); holdTimer = null; }
addEventListener('pointerdown', (e) => {
  if (e.target.closest('.tpanel,.slab,button,a,input')) return;
  ty = e.clientY;
  if (st.phase === 'walk' || st.phase === 'inwalk') { holdTimer = setTimeout(holdStart, 260); }
});
addEventListener('pointermove', (e) => {
  if (ty == null) return;
  const dy = ty - e.clientY;
  if (Math.abs(dy) > 46) { clearTimeout(holdTimer); holdEnd(); stepTo(dy > 0 ? 1 : -1); ty = e.clientY; }
});
addEventListener('pointerup', () => { ty = null; clearTimeout(holdTimer); holdEnd(); });
addEventListener('pointercancel', () => { ty = null; clearTimeout(holdTimer); holdEnd(); });
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input')) return;
  if (['ArrowUp', 'ArrowRight', 'PageDown', ' ', 'w', 'W'].includes(e.key)) { e.preventDefault(); stepTo(1); }
  if (['ArrowDown', 'ArrowLeft', 'PageUp', 's', 'S'].includes(e.key)) { e.preventDefault(); stepTo(-1); }
});

// ------------------------------------------------------------------ the terminal
const term = $('#term'), input = $('#code'), cells = term.querySelector('.cells');
for (let i = 0; i < 8; i++) cells.appendChild(document.createElement('b'));
function paintCells() {
  const v = input.value.toUpperCase();
  [...cells.children].forEach((b, i) => { b.textContent = v[i] || ''; b.classList.toggle('cur', i === Math.min(v.length, 7) && document.activeElement === input); });
}
async function openTerminal() {
  if (st.phase === 'term') return;
  st.phase = 'term'; hideHint();
  term.hidden = false; placeTerminal();
  await sleep(60); term.classList.add('on');
  const ls = term.querySelectorAll('.tl');
  for (const l of ls) { await sleep(RM ? 0 : 340); l.classList.add('on'); snd && snd.key(); }
  input.focus({ preventScroll: true }); paintCells();
}
input.addEventListener('input', () => {
  input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  term.classList.remove('deny'); $('#tmsg').textContent = '';
  snd && snd.key(); paintCells();
  if (input.value.length === 8) check();
});
input.addEventListener('focus', paintCells); input.addEventListener('blur', paintCells);
$('#tform').addEventListener('submit', (e) => { e.preventDefault(); check(); });
term.addEventListener('pointerdown', (e) => { if (e.target.closest('.tpanel')) input.focus({ preventScroll: true }); });

async function check() {
  const v = input.value.trim().toUpperCase();
  if (!v) return;
  if (v !== CODE) {
    term.classList.remove('deny'); void term.offsetWidth; term.classList.add('deny');
    $('#tmsg').textContent = 'SUBJECT NOT RECOGNIZED.';
    snd && snd.deny();
    await sleep(1400); input.value = ''; paintCells();
    return;
  }
  // the city stops
  snd && snd.cityCut();
  st.frozen = true; S.rain = 0; S.steam = 0;
  term.classList.add('ok'); $('#tmsg').textContent = 'SUBJECT 0047';
  input.blur(); input.disabled = true;
  await sleep(1100);
  term.classList.remove('on'); await sleep(400); term.hidden = true;
  openDoor();
}

async function openDoor() {
  st.phase = 'door';
  snd && snd.hiss();
  const frames = st.door.map((f) => S.get(st.set, f)).filter(Boolean);
  for (let i = 1; i < frames.length; i++) {
    S.B = frames[i - 1]; S.A = frames[i];
    st.target.inside = 1.4 * i / (frames.length - 1); S.weights.inside = st.target.inside;
    await animate(RM ? 60 : 230, (t) => { S.mix = t; });
  }
  S.B = null; S.mix = 1;
  // into the light
  const last = S.A; const d = last.info.door; const cx = (d[0][0] + d[1][0]) / 2, cy = (d[0][1] + d[1][1]) / 2;
  S.vp = [cx, cy];
  await animate(RM ? 300 : 1700, (t) => { const e = t * t; S.zA = 1 + e * 3.4; S.white = smooth(0.45, 1, t); });
  enterInside();
}

// ------------------------------------------------------------------ inside
async function enterInside() {
  const I = st.sets.inside;
  st.world = 'inside'; document.body.classList.add('is-inside');
  if (!I) { S.white = 1; $('#held').hidden = false; $('#held').classList.add('on'); return; }
  st.set = I; S.useSet(I); st.walk = setFrames(I, 'c'); st.wi = 0;
  const f0 = await S.load(I, st.walk[0]);
  S.A = f0; S.B = null; S.zA = 1; S.vp = LOOK.inside.vp; S.expo = LOOK.inside.expo;
  for (const g of Object.keys(S.weights)) S.weights[g] = 0;
  st.target = {}; st.catchT = {};
  for (const g of Object.keys(IN_W)) { st.target[g] = 0; S.weights[g] = 0; }
  S.weights.amb = st.target.amb = 1; S.weights.end = st.target.end = 0.8;
  S.rain = 0; S.steam = 0; S.grain = 0.018; S.vig = 0.3; S.lift = 0;
  snd && snd.insideOn(2.5);
  await animate(RM ? 200 : 1400, (t) => { S.white = 1 - ease(t); });
  // the corridor switches on, bank by bank, away from you
  for (const [i, g] of ['bank1', 'bank2', 'bank3', 'bank4'].entries()) {
    await sleep(RM ? 80 : 520);
    lightOn(g, IN_W[g]); snd && snd.relay((i % 2 ? 0.2 : -0.2));
  }
  $('#chrome').hidden = false; $('#welcome').hidden = false;
  await sleep(200); $('#chrome').classList.add('on'); $('#welcome').classList.add('on');
  await sleep(2600); $('#welcome').classList.remove('on');
  st.phase = 'inwalk'; showHint();
}

// ------------------------------------------------------------------ frame loop
function animate(ms, fn) {
  return new Promise((res) => {
    const t0 = performance.now();
    (function tick() { const t = clamp((performance.now() - t0) / ms); fn(t); if (t < 1) requestAnimationFrame(tick); else res(); })();
  });
}

function flicker(g, t) {
  if (RM || st.frozen) return 1;
  if (g === 'fluor') {   // a failing tube: mostly on, dropouts, sometimes a stutter burst
    const k = Math.floor(t * 22); const burst = (Math.floor(t / 5.3) % 3 === 0) && (t % 5.3) < 0.9;
    const off = hash(k) < (burst ? 0.55 : 0.05);
    return off ? 0.08 + hash(k + 9) * 0.2 : 0.92 + hash(k + 3) * 0.08;
  }
  if (g === 'sign') { const k = Math.floor(t * 9); return hash(k * 1.7) < 0.06 ? 0.25 : 1; }
  if (g === 'haze') return 0.88 + 0.12 * Math.sin(t * 0.7) + 0.04 * Math.sin(t * 2.3);
  if (g === 'crimson') return 0.97 + 0.03 * Math.sin(t * 50) * Math.sin(t * 0.9);
  if (g === 'steam') return 0.9 + 0.1 * Math.sin(t * 1.3);
  return 1;
}

function frame(now) {
  requestAnimationFrame(frame);
  const t = (now - st.t0) / 1000;
  S.resize();
  const look = LOOK[st.world];
  const asp = S.cw / Math.max(1, S.ch);
  S.c = [0.5, 0.5 + (asp > 1 ? look.shiftL : 0)];

  // light groups: ease to target, catch with a stutter when switched on, then live flicker
  for (const g of Object.keys(st.target)) {
    let w = st.target[g];
    const c = st.catchT[g];
    if (c && w > 0 && !RM) { const age = now - c; if (age < 700) w *= hash(Math.floor(age / 45) + g.length * 7) < 0.45 ? 0.15 : 1; }
    if (g === 'holo') w *= st.holo.alpha * Math.max(st.holo.signal, 0) * (0.75 + 0.25 * hash(Math.floor(t * 14)));
    w *= flicker(g, t);
    if (g === 'crimson' && st.world === 'outside') w *= 1 - 0.62 * smooth(0.5, 1, st.wi / Math.max(1, st.walk.length - 1));   // near the door, its own lamp wins
    const cur = S.weights[g] || 0;
    S.weights[g] = cur + (w - cur) * (c && now - c < 700 ? 1 : 0.12);
  }
  if (snd && st.world === 'outside') { snd.buzz(st.frozen ? 0 : (S.weights.fluor || 0) * (st.target.fluor ? 1 : 0)); snd.tick(now); }
  if (st.world === 'outside' && !st.frozen) {
    S.rain = st.phase === 'black' ? 0 : clamp((S.weights.crimson || 0) + (S.weights.wash || 0)) * (RM ? 0.4 : 1);
    S.steam = RM ? 0 : 1; S.lift = 0.35; S.grain = 0.04; S.vig = 0.85;
  }

  // footstep transition
  if (st.trans) {
    const tr = st.trans; const p = clamp((now - tr.t0) / tr.dur); const e = ease(p);
    if (tr.dir > 0) { S.zB = 1 + tr.k * e; S.zA = (1 + tr.k * e) / (1 + tr.k); }
    else { S.zB = 1 / (1 + tr.k * e); S.zA = (1 + tr.k) / (1 + tr.k * e); }
    S.mix = smooth(0.12, 0.88, p);
    if (p >= 1) {
      st.trans = null; S.B = null; S.zA = 1; S.mix = 1;
      arrived();
      if (st.queue) { const q = st.queue; st.queue = 0; stepTo(q); }
    }
  }
  // the head bob of a step
  st.bob = Math.max(0, st.bob - 0.028);
  const bb = RM ? 0 : Math.sin((1 - st.bob) * Math.PI) * st.bob;
  S.c[1] += bb * 0.005; S.roll = RM ? 0 : st.bobSign * bb * 0.0035;

  S.draw(t);
  placeHolo(t);
  if (!term.hidden) placeTerminal();
  if (st.world === 'inside') placeTag();
}

function placeHolo(t) {
  if (!H) return;
  const el = $('#holo');
  const h = st.holo;
  if (!st.holoActive && h.alpha <= 0) { el.style.opacity = 0; return; }
  const A = S.A && S.A.info.holo; if (!A) return;
  let [u, v, z] = A;
  if (st.trans && S.B && S.B.info.holo) { /* follow the outgoing frame until the cross is half done */
    const [ub, vb, zb] = S.B.info.holo;
    if (S.mix < 0.5) { u = ub; v = vb; z = zb; }
  }
  if (z <= 0.5) { el.style.opacity = 0; return; }
  const [x, y] = S.toScreen(u, v);
  const zoom = S.mix < 0.5 && S.B ? S.zB : S.zA;
  const size = Math.round(S.cw / S.span[0] * zoom * 0.2 * (17.3 / z));
  if (Math.abs(el.clientWidth - size) > 2) { el.style.width = el.style.height = size + 'px'; H.resize(); }
  el.style.transform = `translate(${x - size / 2}px, ${y - size * 0.55 + Math.sin(t * 0.8) * size * 0.012}px)`;
  el.style.opacity = 1;
  H.alpha = h.alpha; H.signal = h.signal; H.glitch = Math.max(h.glitch, RM ? 0 : 0.06 + 0.1 * (hash(Math.floor(t * 2)) > 0.85)); H.yaw = h.yaw + Math.sin(t * 0.4) * 0.03;
  H.pitch = 0.06 + Math.sin(t * 0.33) * 0.02;
  H.draw(t);
}

function placeTerminal() {
  const info = S.A && S.A.info; if (!info || !info.term) return;
  const [x, y] = S.toScreen(info.term[0], info.term[1]);
  const panel = term.querySelector('.tpanel'); const pw = panel.offsetWidth, ph = panel.offsetHeight;
  const phone = S.cw < 700;
  let px, py;
  if (phone) { px = (S.cw - pw) / 2; py = S.ch - ph - Math.max(28, S.ch * 0.06); }
  else { px = Math.min(S.cw - pw - 24, x + Math.max(60, S.cw * 0.08)); py = clamp(y - ph * 0.62, 24, S.ch - ph - 24); }
  panel.style.left = px + 'px'; panel.style.top = py + 'px';
  const l = $('#lead');
  const ax = phone ? px + pw / 2 : px, ay = phone ? py : py + 22;
  l.setAttribute('x1', x); l.setAttribute('y1', y); l.setAttribute('x2', ax); l.setAttribute('y2', ay);
}

function placeTag() {
  const tag = $('#tag'); const info = S.A && S.A.info; if (!info || !info.locker) return;
  const near = st.wi >= st.walk.length - 4 && st.phase === 'inwalk';
  const [u, v, z] = info.locker;
  if (!near || z <= 0) { tag.classList.remove('on'); return; }
  const [x, y] = S.toScreen(u, v);
  tag.hidden = false; tag.classList.add('on');
  tag.style.transform = `translate(${x - 34}px, ${y - 8}px)`;
  tag.style.flexDirection = 'row-reverse';
}

// no WebGL: the stills, the same terminal, the same words
async function fallbackFlow() {
  say(LINES[0]); await sleep(2600); say(LINES[3]); await sleep(2600); sayOut();
  term.hidden = false; term.classList.add('on'); term.querySelectorAll('.tl').forEach((l) => l.classList.add('on'));
  const panel = term.querySelector('.tpanel'); panel.style.left = '50%'; panel.style.top = '60%'; panel.style.transform = 'translate(-50%,0)';
  input.focus(); paintCells();
  openDoor = async () => { document.body.classList.add('is-inside'); const p = $('#poster'); p.src = 'assets/inside/poster.jpg'; $('#held').hidden = false; $('#held').classList.add('on'); };
}

/* PR6 v9 · the film. One continuous path-traced camera move through the studio, as numbered frames (assets/film/,
   rendered by blender/film.py), drawn into one canvas. The position is a float frame index: the two frames either side
   of it are drawn and crossfaded, so a slow scrub is smooth between rendered frames.
   Scroll, swipe, drag and the keys move the position; on release it carries on with the hand's speed and eases to rest
   on a station frame (a damped spring), so it always lands on one of the nine still lifes.
   Loading never blocks: the poster and the nine station frames first, then the frames nearest the position, then the
   rest by distance; a frame that has not arrived is stood in for by the nearest one that has.
   ?rm: no scrub, no inertia; changing station is a crossfade between station frames.
   ?nofilm: static stills only (the nine station frames), crossfaded.
   The manifest (assets/film/manifest.json) is read at runtime; until the film lands, assets/film/placeholder.json. */
import {Q, RM, clamp, pad2} from './util.js';

const NOFILM = Q.has('nofilm');
const DISCRETE = RM || NOFILM;
const DIR = 'assets/film/';

/* ---------------------------------------------------------------- the manifest */
async function getJSON(u) { const r = await fetch(u, {cache: 'no-cache'}); if (!r.ok) throw new Error(r.status); return r.json(); }
export async function loadManifest() {
  for (const [f, ph] of [['manifest.json', false], ['placeholder.json', true]]) {
    try { const m = norm(await getJSON(DIR + f), ph); if (m) return m; } catch (e) { /* try the next */ }
  }
  return null;
}
function norm(m, ph) {
  const count = Math.round(+(m && m.count));
  if (!(count > 0) || !Array.isArray(m.stations) || !m.stations.length) return null;
  const base = DIR + (m.base || '');
  const pat = m.pattern || '{tier}/{NNN}.webp';
  const url = (tier, i) => base + pat.replace('{tier}', tier).replace(/\{(N+)\}/, (_, n) => String(i).padStart(n.length, '0'));
  const stations = m.stations.map((s, k) => ({code: String(s.code || pad2(k + 1)).padStart(2, '0'), frame: clamp(Math.round(+s.frame), 0, count - 1)}))
    .filter(s => isFinite(s.frame)).sort((a, b) => a.frame - b.frame);
  const intro = Array.isArray(m.intro) && m.intro.length === 2 ? [clamp(+m.intro[0], 0, count - 1), clamp(+m.intro[1], 0, count - 1)] : [0, stations[0].frame];
  /* the station stills for the collection pages: the film's own higher-quality renders, or (placeholder) the desktop frame */
  const stillPat = typeof m.stills === 'string' ? m.stills : 'stations/{NN}.webp';
  const still = code => { const s = stations.find(x => x.code === code); return ph || !s ? (s ? url('d', s.frame) : null) : base + stillPat.replace(/\{(N+)\}/, (_, n) => code.padStart(n.length, '0')); };
  const stillFallback = code => { const s = stations.find(x => x.code === code); return s ? url('d', s.frame) : null; };
  return {count, stations, intro, url, still, stillFallback, poster: base + (m.poster || 'poster.webp'), placeholder: ph, size: m.size || {}};
}

/* ---------------------------------------------------------------- the player */
export function createFilm(M, o) {
  const cv = o.canvas, host = o.host, g = cv.getContext('2d', {alpha: false});
  const N = M.count, F = M.stations.map(s => s.frame), NS = F.length;
  const GAP = NS > 1 ? (F[NS - 1] - F[0]) / (NS - 1) : 16;
  const tier = () => (Math.min(innerWidth, 900) <= 760 ? 'm' : 'd');
  let TIER = tier();
  const IM = new Map();          /* frame index → {im, ok} for the current tier */
  let poster = null;
  const S = {
    pos: DISCRETE ? F[0] : M.intro[0], vel: 0, mode: 'idle', T: F[0], tw: null, st: 0, settled: false, moving: false,
    drag: null, wheel: null, fade: null, input: true, drawn: '', dirty: true, introDone: false
  };
  const nearestSt = p => { let b = 0, bd = 1e9; F.forEach((f, i) => { const d = Math.abs(f - p); if (d < bd) { bd = d; b = i; } }); return b; };

  /* ---- loading */
  let inflight = 0;
  const MAXQ = 6;
  function want(i) { return !IM.has(i); }
  function prio() {
    const list = [];
    if (DISCRETE) { F.forEach(f => want(f) && list.push(f)); return list; }   /* ?rm and ?nofilm only ever show the station frames */
    F.forEach(f => want(f) && list.push(f));
    if (list.length) return list;
    const c = Math.round(S.drag || S.wheel || S.mode !== 'idle' ? S.pos : S.pos), near = [];
    for (let d = 0; d < N; d++) { for (const i of d ? [c + d, c - d] : [c]) if (i >= 0 && i < N && want(i)) near.push(i); if (near.length >= MAXQ) break; }
    return near;
  }
  function pump() {
    while (inflight < MAXQ) {
      const next = prio()[0]; if (next == null) return;
      load(next);
    }
  }
  function load(i) {
    const rec = {im: new Image(), ok: false}; IM.set(i, rec); inflight++;
    rec.im.decoding = 'async';
    const t = TIER;
    rec.im.onload = () => { (rec.im.decode ? rec.im.decode() : Promise.resolve()).catch(() => {}).then(() => { if (t !== TIER) return; rec.ok = true; S.dirty = true; inflight--; pump(); }); };
    rec.im.onerror = () => { inflight--; rec.bad = true; pump(); };
    rec.im.src = M.url(TIER, i);
  }
  function loadPoster() {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => { poster = im; S.dirty = true; };
    im.src = M.poster;
  }
  const ready = i => { const r = IM.get(i); return r && r.ok ? r.im : null; };
  function nearestReady(i) {
    i = clamp(i, 0, N - 1);
    if (ready(i)) return i;
    for (let d = 1; d < N; d++) { if (i - d >= 0 && ready(i - d)) return i - d; if (i + d < N && ready(i + d)) return i + d; }
    return -1;
  }

  /* ---- drawing */
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2), w = Math.max(1, Math.round(host.clientWidth * dpr)), h = Math.max(1, Math.round(host.clientHeight * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; S.dirty = true; }
  }
  function cover(im, a) {
    if (!im) return;
    const W = cv.width, H = cv.height, iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    const s = Math.max(W / iw, H / ih), dw = iw * s, dh = ih * s;
    g.globalAlpha = a; g.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }
  function draw() {
    let key, A, B = -1, f = 0;
    if (S.fade) { A = nearestReady(S.fade.a); B = nearestReady(S.fade.b); f = S.fade.t; }
    else { const a = Math.floor(S.pos); f = S.pos - a; A = nearestReady(a); if (f > .002) B = nearestReady(a + 1); }
    if (A < 0 && B >= 0) { A = B; B = -1; }
    key = `${A}:${B}:${Math.round(f * 96)}:${cv.width}x${cv.height}:${A < 0 && poster ? 'p' : ''}`;
    if (key === S.drawn && !S.dirty) return;
    S.drawn = key; S.dirty = false;
    g.globalAlpha = 1; g.fillStyle = '#cad5da'; g.fillRect(0, 0, cv.width, cv.height);
    if (A < 0) { if (poster) cover(poster, 1); return; }
    cover(ready(A), 1);
    if (B >= 0 && B !== A && f > 0) cover(ready(B), f);
    g.globalAlpha = 1;
  }

  /* ---- motion */
  const lo = F[0], hi = F[NS - 1];
  const band = p => p < lo ? lo - (lo - p) * .35 : p > hi ? hi + (p - hi) * .35 : p;
  function moving(on) { if (S.moving === on) return; S.moving = on; o.onMove && o.onMove(on); if (on) S.settled = false; }
  function settle() {
    S.mode = 'idle'; S.vel = 0; S.tw = null; S.fade = null;
    const i = nearestSt(S.pos); S.pos = F[i]; S.st = i; S.settled = true; S.dirty = true;
    moving(false); o.onSettle && o.onSettle(i);
    pump();
  }
  /* a released hand: carry on with its speed and spring onto the chosen station */
  function release(fromPos) {
    const s0 = nearestSt(fromPos);
    const proj = S.pos + S.vel * .32;
    let i = nearestSt(proj);
    const moved = S.pos - F[s0];
    if (i === s0 && Math.abs(moved) > GAP * .18) i = clamp(s0 + Math.sign(moved), 0, NS - 1);
    i = clamp(i, s0 - 2, s0 + 2);
    spring(i);
  }
  function spring(i) { S.T = F[clamp(i, 0, NS - 1)]; S.mode = 'spring'; S.tw = null; moving(true); }
  function glide(i, dur) {
    i = clamp(i, 0, NS - 1);
    if (DISCRETE) { crossfade(i); return; }
    const d = Math.abs(F[i] - S.pos);
    if (d < .01) { settle(); return; }
    S.T = F[i]; S.mode = 'tween'; S.vel = 0;
    S.tw = {a: S.pos, b: F[i], t: 0, dur: dur || clamp(.75 + .16 * d / GAP, .8, 1.9)};
    moving(true);
  }
  function crossfade(i) {
    const a = F[S.st], b = F[i];
    if (a === b || RM && NOFILM && false) { S.pos = b; settle(); return; }
    S.fade = {a, b, t: 0, dur: .55}; S.pos = b; S.T = b; S.mode = 'fade';
    moving(true);
  }
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3.2);
  function step(dt) {
    if (S.mode === 'tween' && S.tw) {
      const tw = S.tw; tw.t = Math.min(1, tw.t + dt / tw.dur);
      S.pos = tw.a + (tw.b - tw.a) * (tw.ease || ease)(tw.t);
      if (tw.t >= 1) { S.pos = tw.b; if (tw.intro) S.introDone = true; settle(); }
    } else if (S.mode === 'spring') {
      /* slightly under critical: it carries the hand's speed in and settles without a visible bounce */
      const k = 46, c = 2 * Math.sqrt(k) * .96;
      let t = Math.min(dt, .05); const n = Math.ceil(t / .008), h = t / n;
      for (let j = 0; j < n; j++) { const a = -k * (S.pos - S.T) - c * S.vel; S.vel += a * h; S.pos += S.vel * h; }
      if (Math.abs(S.pos - S.T) < .02 && Math.abs(S.vel) < .25) settle();
    } else if (S.mode === 'fade' && S.fade) {
      S.fade.t = Math.min(1, S.fade.t + dt / S.fade.dur); S.dirty = true;
      if (S.fade.t >= 1) settle();
    }
  }

  /* ---- input: drag and swipe (either axis: left or up goes forward) */
  const isUI = t => t.closest && t.closest('a,button,input,select,label,[data-noscrub]');
  host.addEventListener('pointerdown', e => {
    if (!S.input || e.button > 0 || isUI(e.target)) return;
    S.drag = {x: e.clientX, y: e.clientY, p0: S.pos, axis: null, moved: false, lt: performance.now(), lp: S.pos, id: e.pointerId, tap: true};
  });
  host.addEventListener('pointermove', e => {
    const d = S.drag; if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.axis) {
      if (Math.hypot(dx, dy) < 7) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; d.tap = false;
      try { host.setPointerCapture(e.pointerId); } catch (x) {}
      host.classList.add('grab');
      if (!DISCRETE) { S.mode = 'drag'; S.tw = null; S.fade = null; S.vel = 0; moving(true); }
    }
    if (DISCRETE) return;
    const span = d.axis === 'x' ? host.clientWidth : host.clientHeight;
    const fwd = d.axis === 'x' ? -dx : -dy;
    S.pos = band(d.p0 + fwd * GAP / (span * .55));
    const now = performance.now(), dtt = Math.max(1, now - d.lt);
    S.vel = S.vel * .55 + ((S.pos - d.lp) / dtt * 1000) * .45; d.lt = now; d.lp = S.pos;
    d.moved = true;
  });
  const up = e => {
    const d = S.drag; if (!d || (e && e.pointerId !== d.id)) return;
    S.drag = null; host.classList.remove('grab');
    if (d.tap) { if (e && e.type === 'pointerup') o.onTap && o.onTap(S.settled ? S.st : nearestSt(S.T)); return; }
    if (DISCRETE) {
      const dx = e.clientX - d.x, dy = e.clientY - d.y, fwd = d.axis === 'x' ? -dx : -dy;
      if (Math.abs(fwd) > 40) glide(S.st + Math.sign(fwd));
      return;
    }
    if (performance.now() - d.lt > 90) S.vel = 0;   /* held still before letting go: no throw */
    release(d.p0);
  };
  host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);

  /* ---- input: the wheel. A mouse notch goes one station; a trackpad scrubs, then eases to rest */
  let wAcc = 0, wLast = 0, wT = 0, notchUntil = 0;
  host.addEventListener('wheel', e => {
    if (!S.input) return;
    e.preventDefault();
    const raw = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const d = raw * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1);
    const now = performance.now(), fresh = now - wLast > 220; wLast = now;
    if (DISCRETE) {
      if (now < notchUntil) return;
      wAcc = fresh ? d : wAcc + d;
      if (Math.abs(wAcc) > 30) { glide(S.st + Math.sign(wAcc)); wAcc = 0; notchUntil = now + 650; }
      return;
    }
    const notch = e.deltaMode === 1 || (fresh && Math.abs(d) >= 50 && !S.wheel) || (S.wheel && S.wheel.notch);
    if (notch) {
      if (fresh || !S.wheel) S.wheel = {notch: true};
      clearTimeout(wT); wT = setTimeout(() => { S.wheel = null; }, 240);
      if (now < notchUntil || Math.abs(d) < 4) return;
      const base = S.mode === 'tween' || S.mode === 'spring' ? nearestSt(S.T) : nearestSt(S.pos);
      glide(base + Math.sign(d)); notchUntil = now + 170;
      return;
    }
    if (!S.wheel) { S.wheel = {p0: S.pos, lt: now, lp: S.pos}; S.mode = 'drag'; S.tw = null; S.vel = 0; moving(true); }
    const w = S.wheel;
    S.pos = band(S.pos + d * GAP / 520);
    const dtt = Math.max(8, now - w.lt); S.vel = S.vel * .6 + ((S.pos - w.lp) / dtt * 1000) * .4; w.lt = now; w.lp = S.pos;
    clearTimeout(wT);
    wT = setTimeout(() => { const p0 = w.p0; S.wheel = null; S.vel *= .6; release(p0); }, 130);
  }, {passive: false});

  /* ---- start */
  loadPoster(); pump();
  addEventListener('resize', () => {
    size();
    const t = tier();
    if (t !== TIER) { TIER = t; IM.clear(); inflight = 0; pump(); }
  });
  size();

  return {
    M, F, get tier() { return TIER; },
    get station() { return S.st; },
    get settled() { return S.settled; },
    get pos() { return S.pos; },
    set input(v) { S.input = !!v; if (!v) { S.drag = null; S.wheel = null; } },
    /* frames are in: is the first stretch (the intro, or the stations) ready to play? */
    readyFor(a, b) { for (let i = a; i <= b; i++) if (!ready(i) && !(IM.get(i) || {}).bad) return false; return true; },
    intro() {
      if (DISCRETE || S.introDone) { S.pos = F[0]; S.st = 0; S.introDone = true; settle(); return; }
      S.pos = M.intro[0]; S.mode = 'tween'; S.tw = {a: M.intro[0], b: F[0], t: 0, dur: 3.4, ease: easeOut, intro: true}; moving(true);
    },
    at(i) { i = clamp(i, 0, NS - 1); S.pos = F[i]; S.st = i; S.introDone = true; S.fade = null; settle(); },
    go(i) { glide(i); },
    step(d) { const base = S.mode === 'tween' || S.mode === 'spring' ? nearestSt(S.T) : S.st; glide(base + d); },
    frame(dt) { if (S.mode !== 'idle' && S.mode !== 'drag') step(dt); size(); draw(); if (S.mode === 'drag' || S.mode === 'tween') pump(); },
    state: () => ({pos: +S.pos.toFixed(2), station: S.st, code: M.stations[S.st].code, mode: S.mode, settled: S.settled, moving: S.moving, tier: TIER, loaded: [...IM.values()].filter(r => r.ok).length, count: N, placeholder: M.placeholder, discrete: DISCRETE, nofilm: NOFILM})
  };
}

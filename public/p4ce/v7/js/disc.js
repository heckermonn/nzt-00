/* PR6 v7 · the disc. One debossed circle on the slab, and the object on it: the real pack render, drawn from the
   turntable frames (manifest, 24 frames, 15° each) into a canvas, so turning never flickers. Adjacent frames are
   blended, so a slow idle turn is smooth rather than stepped.
   The disc persists across screens: Index, Collection and the Dossier all put their object here, so a screen change
   keeps the object and swaps it with a turn. On a collection it is a picker: a track of products the user swipes,
   drags, wheels or arrows through; each product slides and turns from disc to disc on a spring. */
import {byId} from './catalog.js';
import {Renders, packOf, placeholderSVG} from './renders.js';
import {$, RM, clamp, Spring, sm} from './util.js';

const N = 24;
const FR = {};               /* pack → [Image] */
const READY = {};            /* pack → Set of decoded frame indices */
function frames(p) { return Renders.frames(p); }
function loadPack(p) {
  const pack = packOf(p), list = frames(p);
  if (!list.length) return null;
  if (!FR[pack]) {
    FR[pack] = []; READY[pack] = new Set();
    /* frame 0 first (it is the hero), then outward from it, so a turn in either direction is ready soonest */
    const order = [0]; for (let i = 1; i <= N / 2; i++) { order.push(i % N); if (N - i !== i) order.push(N - i); }
    order.forEach((k, j) => { const im = new Image(); im.decoding = 'async'; FR[pack][k] = im;
      setTimeout(() => { im.src = list[k]; im.decode().then(() => { READY[pack].add(k); DISC.dirty = true; }).catch(() => {}); }, j < 3 ? 0 : 40 + j * 12); });
  }
  return FR[pack];
}
export function preload(p) { loadPack(p); }

/* one object on the disc */
function makeItem(p) {
  const el = document.createElement('div'); el.className = 'di'; el.dataset.id = p.id;
  const it = {p, el, cv: null, k: 0, drawn: -1, pack: packOf(p), real: frames(p).length > 0};
  if (it.real) { it.cv = document.createElement('canvas'); it.cv.className = 'di-cv'; el.appendChild(it.cv); loadPack(p); }
  else el.innerHTML = `<span class="pk pk-${it.pack}">${placeholderSVG(p)}</span>`;
  return it;
}
const wrap = k => ((k % N) + N) % N;
function draw(it, size) {
  if (!it.cv) return;
  const fr = FR[it.pack], rd = READY[it.pack]; if (!fr) return;
  const k = wrap(it.k), a = Math.floor(k), b = (a + 1) % N, f = k - a;
  /* nearest decoded frames: never blank while the rest load */
  const pickReady = i => { if (rd.has(i)) return i; for (let d = 1; d < N / 2; d++) { if (rd.has(wrap(i - d))) return wrap(i - d); if (rd.has(wrap(i + d))) return wrap(i + d); } return -1; };
  const A = pickReady(a), B = pickReady(b);
  const fb = sm(.36, .64, f), key = A + ':' + B + ':' + (A === B || fb <= 0 ? 0 : Math.round(fb * 40)) + ':' + size;
  if (key === it.drawn || A < 0) return;
  it.drawn = key;
  const dpr = Math.min(devicePixelRatio || 1, 2), w = Math.round(size * .8 * dpr), h = Math.round(size * dpr);
  if (it.cv.width !== w || it.cv.height !== h) { it.cv.width = w; it.cv.height = h; }
  const g = it.cv.getContext('2d', {willReadFrequently: true}); g.clearRect(0, 0, w, h); g.imageSmoothingQuality = 'high';
  g.globalAlpha = 1; g.drawImage(fr[A], 0, 0, w, h);
  if (B !== A && f > .36 && !RM) { g.globalAlpha = sm(.36, .64, f); g.drawImage(fr[B], 0, 0, w, h); g.globalAlpha = 1; }
  mist(g, w, h);
}
/* the renders carry a neutral black contact shadow; on the mist disc it reads as a hole, so it is re-tinted
   to the disc's own blue-grey and softened (only the translucent dark pixels: the pack itself is untouched) */
function mist(g, w, h) {
  const y0 = Math.round(h * .45), hh = h - y0; if (hh <= 0) return;
  let im; try { im = g.getImageData(0, y0, w, hh); } catch (e) { return; }
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]; if (a === 0 || a > 250) continue;
    if (d[i] + d[i + 1] + d[i + 2] > 150) continue;
    d[i] = 54; d[i + 1] = 72; d[i + 2] = 86; d[i + 3] = a * .62;
  }
  g.putImageData(im, 0, y0);
}

const DISC = {
  root: null, host: null, items: [], pos: new Spring(0, {k: 150, c: 21}), mode: 'swap', spacing: .24,
  turn: 0, turnV: 0, idle: 'sway', away: new Spring(1, {k: 120, c: 18}), lift: new Spring(0, {k: 200, c: 18}), size: 300, dirty: true,
  drag: null, onPick: null, onChange: null, swapT: 0, target: 0, dim: 0
};
export const Disc = {
  init() {
    DISC.root = $('#disc'); DISC.host = $('.disc-items', DISC.root);
    const ro = new ResizeObserver(() => { DISC.size = DISC.root.offsetWidth || 300; DISC.items.forEach(i => i.drawn = -1); DISC.dirty = true; });
    ro.observe(DISC.root);
    bindPicker();
  },
  /* the product on the disc; a different one swaps in with a turn */
  show(p, o = {}) {
    if (typeof p === 'string') p = byId(p); if (!p) return;
    const wasPicker = DISC.mode === 'picker', cur = Disc.current();
    const old = DISC.items.length ? DISC.items[wasPicker ? DISC.target : Math.round(clamp(DISC.pos.v, 0, DISC.items.length - 1))] : null;
    DISC.mode = 'swap'; DISC.spacing = .2; DISC.ids = null;
    /* the same object (the picker into its Dossier): keep it on the disc, drop the neighbours */
    if (cur && cur.id === p.id && old) {
      DISC.items.forEach(i => { if (i !== old) i.el.remove(); });
      DISC.items = [old]; DISC.pos.snap(0); DISC.dirty = true; Disc.setAway(false); return;
    }
    DISC.items.forEach(i => { if (i !== old) i.el.remove(); });
    const it = makeItem(p); it.k = old ? -4 : 0;
    if (!old || o.instant || RM) { if (old) old.el.remove(); DISC.items = [it]; DISC.pos.snap(0); DISC.host.appendChild(it.el); it.k = 0; }
    else { DISC.items = [old, it]; DISC.host.appendChild(it.el); DISC.pos.snap(0).set(1); DISC.swapT = 1; }
    DISC.turn = 0; DISC.dirty = true; Disc.setAway(false);
  },
  /* a collection: the picker */
  track(list, index = 0, o = {}) {
    const ids = list.map(p => p.id).join(',');
    if (DISC.mode === 'picker' && DISC.ids === ids) { Disc.go(index); Disc.setAway(false); return; }
    const cur = Disc.current();
    DISC.items.forEach(i => i.el.remove());
    DISC.items = list.map(makeItem); DISC.ids = ids; DISC.mode = 'picker'; DISC.spacing = .86;
    DISC.items.forEach(i => DISC.host.appendChild(i.el));
    /* arriving from the same product (the Dossier back to its collection): keep it where it is */
    DISC.pos.snap(cur && list.some(p => p.id === cur.id) ? list.findIndex(p => p.id === cur.id) : index);
    if (DISC.pos.v !== index) DISC.pos.set(index);
    DISC.target = index; DISC.turn = 0; DISC.dirty = true; Disc.setAway(false);
  },
  go(i) { if (DISC.mode !== 'picker') return; const n = DISC.items.length; i = clamp(Math.round(i), 0, n - 1); if (i !== DISC.target) { DISC.target = i; DISC.onChange && DISC.onChange(i, DISC.items[i].p); } DISC.pos.set(i); },
  step(d) { Disc.go(DISC.target + d); },
  get index() { return DISC.target; },
  current() { const n = DISC.items.length; if (!n) return null; if (DISC.mode === 'picker') return DISC.items[DISC.target].p; return DISC.items[n - 1].p; },
  setAway(v) { DISC.away.set(v ? 0 : 1); DISC.root.classList.toggle('away', !!v); },
  set onChange(f) { DISC.onChange = f; },
  /* turning the object: idle sway, a slow idle turn, drag, or a scroll position */
  setIdle(mode) { DISC.idle = mode; },
  setTurn(k) { DISC.turnSet = k; },
  dragTurn(dx) { DISC.turn -= dx / 12; DISC.turnV = -dx / 12 * 60; },
  dim(v) { DISC.dim = v; },
  lift(v) { DISC.lift.set(v); },
  /* where the object is drawn now (for the flight into Your Protocol) */
  objectRect() { const it = DISC.items[DISC.mode === 'picker' ? DISC.target : DISC.items.length - 1]; if (!it) return null; const r = it.el.getBoundingClientRect(); return {x: r.left + r.width * .16, y: r.top + r.height * .17, w: r.width * .68, h: r.height * .66}; },
  objectEl() { const it = DISC.items[DISC.mode === 'picker' ? DISC.target : DISC.items.length - 1]; return it ? it.el : null; },
  state: () => ({mode: DISC.mode, index: DISC.target, pos: +DISC.pos.v.toFixed(3), items: DISC.items.map(i => i.p.id), away: DISC.away.to === 0, turn: +DISC.turn.toFixed(2)}),
  frame(dt, now) {
    if (!DISC.root) return;
    const pos = DISC.pos.step(dt), away = DISC.away.step(dt), lift = DISC.lift.step(dt);
    /* the turn: drag inertia, then the screen's idle */
    if (DISC.drag) { /* held */ }
    else if (Math.abs(DISC.turnV) > .05) { DISC.turn += DISC.turnV * dt; DISC.turnV *= Math.pow(.04, dt); }
    else if (DISC.turnSet != null) { DISC.turn += (DISC.turnSet - DISC.turn) * (1 - Math.pow(.0005, dt)); }
    else if (!RM && DISC.idle === 'spin') DISC.turn += dt * .9;
    else if (!RM && DISC.idle === 'sway') { const g = Math.round(DISC.turn / N) * N; DISC.turn += (g + Math.sin(now / 2400) * .9 - DISC.turn) * (1 - Math.pow(.2, dt)); }
    const S = DISC.size, n = DISC.items.length;
    DISC.items.forEach((it, i) => {
      const d = i - pos, ad = Math.abs(d);
      let x, sc, op, k, y;
      if (DISC.mode === 'picker') {
        /* the picker: slide from disc to disc, turning a quarter as it goes, smaller and fainter off the disc */
        const live = clamp(Math.abs(DISC.pos.vel) * .5 + (DISC.drag && DISC.drag.moved ? 1 : 0));
        x = d * DISC.spacing * S; sc = 1 - Math.min(ad, 1.6) * .36; op = 1 - (.8 - .32 * live) * sm(.12, 1, ad) - (.2 + .32 * live) * sm(1, 1.7, ad); k = d * -6 + (Math.round(pos) === i ? DISC.turn : 0); y = -Math.min(ad, 1) * S * .05;
      } else {
        /* a swap: the old object turns away and fades as the new one turns in */
        const isNew = i === n - 1, vis = n === 1 ? 1 : isNew ? clamp(pos) : 1 - clamp(pos);
        x = (isNew ? 1 : -1) * (1 - vis) * DISC.spacing * S * .5; sc = .9 + .1 * vis; op = sm(0, 1, vis); k = (1 - vis) * (isNew ? -5 : 5) + DISC.turn; y = 0;
      }
      op *= away; sc *= .86 + .14 * away;
      y += -lift * S * .1;
      it.k = k;
      if (op < .01) { it.el.style.visibility = 'hidden'; return; }
      it.el.style.visibility = '';
      it.el.style.opacity = op.toFixed(3);
      it.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
      it.el.style.zIndex = String(100 - Math.round(ad * 10));
      draw(it, S);
    });
    /* a swap is over: drop the old object */
    if (DISC.mode === 'swap' && n > 1 && DISC.pos.rest) { DISC.items.slice(0, -1).forEach(i => i.el.remove()); DISC.items = DISC.items.slice(-1); DISC.pos.snap(0); }
    DISC.root.style.setProperty('--away', away.toFixed(3));
    DISC.root.style.setProperty('--dim', DISC.dim.toFixed(3));
  }
};

/* the picker's gestures: drag or swipe across the disc, the wheel, and the arrow keys (wired by the screen) */
function bindPicker() {
  const host = DISC.root;
  let st = null;
  host.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    st = {x: e.clientX, y: e.clientY, p0: DISC.pos.v, k0: DISC.turn, t: performance.now(), lx: e.clientX, lt: performance.now(), v: 0, moved: false, axis: null, id: e.pointerId};
    DISC.drag = st;
  });
  host.addEventListener('pointermove', e => {
    if (!st || e.pointerId !== st.id) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.axis && Math.hypot(dx, dy) > 6) { st.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; if (st.axis === 'x') { try { host.setPointerCapture(e.pointerId); } catch (x) {} host.classList.add('grab'); } }
    if (st.axis !== 'x') return;
    st.moved = true;
    const now = performance.now(), ddx = e.clientX - st.lx, ddt = Math.max(1, now - st.lt); st.v = st.v * .6 + (ddx / ddt) * .4; st.lx = e.clientX; st.lt = now;
    if (DISC.mode === 'picker') {
      /* rubber-band past the ends */
      const n = DISC.items.length; let p = st.p0 - dx / (DISC.spacing * DISC.size);
      if (p < 0) p = p * .3; if (p > n - 1) p = n - 1 + (p - n + 1) * .3;
      DISC.pos.snap(p);
    } else { DISC.turn = st.k0 - dx / 12; DISC.turnV = 0; }
  });
  const end = e => {
    if (!st || (e && e.pointerId !== st.id)) return;
    host.classList.remove('grab');
    if (st.moved) {
      if (DISC.mode === 'picker') {
        /* project the release velocity: a flick carries on to the next product, or further */
        const proj = DISC.pos.v - st.v * 260 / (DISC.spacing * DISC.size);
        const i = clamp(Math.round(proj), Math.round(DISC.pos.v) - 2, Math.round(DISC.pos.v) + 2);
        DISC.pos.vel = -st.v * 1000 / (DISC.spacing * DISC.size) * .6;
        Disc.go(i);
      } else DISC.turnV = -st.v * 1000 / 12 * .5;
    }
    st = null; DISC.drag = null;
  };
  host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end);
  /* a click on a neighbour brings it to the disc */
  host.addEventListener('click', e => {
    if (DISC.mode !== 'picker') return;
    const el = e.target.closest('.di'); if (!el) return;
    const i = DISC.items.findIndex(x => x.el === el); if (i >= 0 && i !== DISC.target) Disc.go(i);
  });
  /* the wheel: one product per notch (trackpads accumulate) */
  let acc = 0, lastW = 0;
  host.addEventListener('wheel', e => {
    if (DISC.mode !== 'picker') return;
    e.preventDefault();
    const now = performance.now(); if (now - lastW > 260) acc = 0; lastW = now;
    acc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(acc) > 60) { Disc.step(Math.sign(acc)); acc = 0; lastW = now + 200; }
  }, {passive: false});
}

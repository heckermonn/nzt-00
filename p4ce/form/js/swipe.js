/* PR6 / Form · the collection swipe, three quick prototypes (lu, 4 Nov, after the TikTok line-up clip and Abel):
   A lineup  every vial in one row in mist; tap or scroll zooms into the row, then swipe one vial at a time while
             the neighbours fog out (the clip's move)
   B rail    vertical scroll slides sideways through nine Series panels, three vials side by side in each (Aesop)
   C ring    the 27 vials on a slow ring seen edge-on; swipe spins it, the front vial comes forward
   Each view(): html string. Each mount(root, {setWorld, go}): returns destroy(). Data is SAMPLE (catalog.js). */
import {AREAS, ALL, cad} from './catalog.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]rm\b/.test(location.search);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const img = p => `assets/lineup/${p.id}.webp`;
const seriesOf = p => AREAS.find(a => a.c === p.c);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;

const SWITCH = cur => `<nav class="sw-switch m" aria-label="Swipe prototypes">
  <span>Prototype</span>${[['lineup', 'A The line-up'], ['rail', 'B The Series rail'], ['ring', 'C The ring']].map(([k, l]) =>
    `<a href="#${k}" ${k === cur ? 'aria-current="page"' : ''}><span class="u">${l}</span></a>`).join('')}</nav>`;
const INFO = `<div class="sw-info" aria-live="polite">
  <p class="m sw-s" data-k="s"></p><h1 class="sw-n" data-k="n"></h1>
  <p class="m sw-id" data-k="id"></p><p class="sw-pr tab" data-k="pr"></p>
  <a class="m more sw-open" data-k="open" href="#"><span class="u">Open record</span></a></div>`;
function info(root, p) {
  const box = root.querySelector('.sw-info'); if (!box) return;
  if (!p) { box.classList.add('idle'); box.querySelector('[data-k=s]').textContent = 'Catalogue · 27 compounds · sample'; box.querySelector('[data-k=n]').textContent = 'Nine series'; box.querySelector('[data-k=id]').textContent = ''; box.querySelector('[data-k=pr]').textContent = ''; return; }
  if (box.dataset.id === p.id) return;
  box.dataset.id = p.id; box.classList.remove('idle');
  const a = seriesOf(p);
  box.querySelector('[data-k=s]').textContent = `Series ${a.c} · ${a.f}`;
  box.querySelector('[data-k=n]').textContent = p.n;
  box.querySelector('[data-k=id]').textContent = p.id + ' · ' + p.cls;
  box.querySelector('[data-k=pr]').textContent = 'from ' + cad(p.sizes[0].price);
  box.querySelector('[data-k=open]').href = '#c-' + p.id;
  if (!RM) { box.classList.remove('flip'); void box.offsetWidth; box.classList.add('flip'); }
}
/* the kit's slider rule: 27 ticks, Series marks, one dot */
const RULE = `<div class="sw-rule" aria-hidden="true">${ALL.map((p, i) => `<i class="${i && p.c !== ALL[i - 1].c ? 'b' : ''}"></i>`).join('')}<b class="dot"></b>
  <div class="sw-rule-n m">${AREAS.map(a => `<span>${a.c}</span>`).join('')}</div></div>`;
function rule(root, f) { const d = root.querySelector('.sw-rule .dot'); if (d) d.style.left = (f * 100).toFixed(2) + '%'; }

/* a spring-ish follower: x eases toward a target, velocity is exposed for motion blur */
function follower(v0, k = 9) {
  return {x: v0, t: v0, v: 0, step(dt) { const nx = this.x + (this.t - this.x) * (1 - Math.exp(-k * dt)); this.v = (nx - this.x) / Math.max(dt, 1e-3); this.x = nx; return Math.abs(this.t - this.x) > 1e-4 || Math.abs(this.v) > 1e-3; }};
}
function loop(fn) {
  let raf = 0, last = 0, live = true;
  const f = now => { raf = 0; if (!live) return; const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60; last = now; if (fn(dt) !== false) raf = requestAnimationFrame(f); else last = 0; };
  return {kick() { if (!raf && live) raf = requestAnimationFrame(f); }, stop() { live = false; cancelAnimationFrame(raf); }};
}
/* wheel + drag + keys feed one "index" target; returns detach() */
function input(el, {onStep, onDrag, onRelease, onKey}) {
  let acc = 0, lastWheel = 0, drag = null;
  const wheel = e => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    e.preventDefault();
    const now = performance.now(); if (now - lastWheel > 260) acc = 0; lastWheel = now;
    acc += d; if (Math.abs(acc) > 60) { onStep(Math.sign(acc)); acc = 0; lastWheel = now + 180; }
  };
  const down = e => { if (e.button !== 0) return; drag = {x: e.clientX, y: e.clientY, moved: 0, t: performance.now(), el: e.target}; el.setPointerCapture?.(e.pointerId); };
  const move = e => { if (!drag) return; const dx = e.clientX - drag.x; drag.moved = Math.max(drag.moved, Math.abs(dx)); onDrag && onDrag(dx, drag); };
  const up = e => { if (!drag) return; const dx = e.clientX - drag.x, dt = performance.now() - drag.t; const d = drag; drag = null; onRelease && onRelease(dx, dx / Math.max(dt, 1), d, e); };
  const key = e => { if (e.key === 'ArrowRight') { onStep(1); e.preventDefault(); } else if (e.key === 'ArrowLeft') { onStep(-1); e.preventDefault(); } else onKey && onKey(e); };
  el.addEventListener('wheel', wheel, {passive: false}); el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  addEventListener('keydown', key);
  return () => { el.removeEventListener('wheel', wheel); el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); removeEventListener('keydown', key); };
}

/* ================================================================ A · the line-up */
export const vLineup = () => `<section class="sw sw-a" tabindex="0" aria-label="The line-up: all compounds in one row. Use arrow keys to move, Enter to open.">
  ${SWITCH('lineup')}${INFO}
  <div class="sw-track">${ALL.map((p, i) => `<button class="sw-v" data-i="${i}" aria-label="${esc(p.n)}, ${p.id}"><img src="${img(p)}" alt="" draggable="false" decoding="async"></button>`).join('')}</div>
  <div class="sw-groups m" aria-hidden="true">${AREAS.map(a => `<span data-c="${a.c}">${a.c}</span>`).join('')}</div>
  ${RULE}
  <p class="sw-hint m"><span class="o">Tap a vial or scroll to step in</span><span class="f">Swipe, scroll or use arrows · tap the vial to open · <a href="#" data-out><span class="u">All</span></a></span></p>
</section>`;
export function mountLineup(root, {setWorld, go}) {
  const els = [...root.querySelectorAll('.sw-v')], N = els.length, groups = [...root.querySelectorAll('.sw-groups span')];
  const pos = follower(0, 7), mode = follower(0, 5);
  let hover = -1, W = 0, H = 0, dragBase = null;
  const size = () => { const r = root.getBoundingClientRect(); W = r.width; H = r.height; };
  size();
  /* overview layout: the whole row across the width, Series gaps; focus layout: one vial large in the centre */
  const gapAt = i => { let g = 0; for (let k = 1; k <= i; k++) if (ALL[k].c !== ALL[k - 1].c) g++; return g; };
  const draw = dt => {
    const moving = pos.step(dt) | mode.step(dt);
    const m = mode.x, mob = W < 700;
    /* overview: one row on desktop; on a phone the nine Series sit as a 3 x 3 grid of triplets */
    let h0, ovr;
    if (mob) {
      const cw = W * .92 / 3, u = cw / 3.5; h0 = Math.min(u / .3, H * .16);
      const rowH = h0 * 1.05, top = H * .34;
      ovr = i => { const g = AREAS.findIndex(a => a.c === ALL[i].c), k = ALL.slice(0, i).filter(p => p.c === ALL[i].c).length;
        return [W * .04 + (g % 3) * cw + cw / 2 + (k - 1) * u, top + Math.floor(g / 3) * rowH + h0 * .82]; };
    } else {
      h0 = Math.min(H * .36, (W * .9 / (N + 8 * .9)) / .3);
      const unit = h0 * .3, gap = unit * .9, x0 = (W - (N * unit + 8 * gap)) / 2;
      ovr = i => [x0 + i * unit + gapAt(i) * gap + unit / 2, H * .62];
    }
    const h1 = Math.min(H * (mob ? .62 : .74), 900);
    const spacing = mob ? W * .55 : Math.min(W * .26, h1 * .62);
    const cx = W / 2, base1 = H * (mob ? .86 : .9);
    const blur = Math.min(10, Math.abs(pos.v) * 2.2) * m;
    els.forEach((el, i) => {
      const [ox, base0] = ovr(i);
      const d = i - pos.x, ad = Math.abs(d);
      const fx = cx + d * spacing * (1 - .06 * Math.min(ad, 3));
      const x = lerp(ox, fx, m), h = lerp(h0, h1 * (1 - .18 * Math.min(ad, 2)), m), b = lerp(base0, base1, m);
      const hov = hover >= 0 && m < .5 ? (i === hover ? 1 : .32) : 1;
      const op = lerp(hov, ad < .5 ? 1 : clamp(.42 - (ad - 1) * .12, .06, .42), m);
      const bl = lerp(hover >= 0 && i !== hover ? 1.2 : 0, ad < .5 ? 0 : Math.min(9, 2.5 + ad * 2), m) + blur * (ad < .5 ? .4 : 1);
      el.style.transform = `translate3d(${(x - h * .28).toFixed(1)}px,${(b - h).toFixed(1)}px,0)`;
      el.style.width = (h * .56).toFixed(1) + 'px'; el.style.height = h.toFixed(1) + 'px';
      el.style.opacity = op.toFixed(3); el.style.filter = bl > .2 ? `blur(${bl.toFixed(1)}px)` : '';
      el.style.zIndex = String(100 - Math.round(ad * 2));
      el.tabIndex = m > .5 && ad < .5 ? 0 : -1;
    });
    groups.forEach((g, k) => { const i = ALL.findIndex(p => p.c === AREAS[k].c) + 1; const [ox, by] = ovr(i); g.style.transform = `translate(${(ox - 8).toFixed(1)}px,${(by + (mob ? 4 : 30)).toFixed(1)}px)`; g.style.opacity = (1 - m).toFixed(2); });
    root.classList.toggle('focus', m > .5);
    const cur = clamp(Math.round(pos.x), 0, N - 1);
    rule(root, cur / (N - 1));
    return moving || dragBase !== null;
  };
  const L = loop(draw);
  const focusOn = i => { pos.t = clamp(i, 0, N - 1); mode.t = 1; const p = ALL[Math.round(pos.t)]; info(root, p); setWorld(p.c); L.kick(); };
  const overview = () => { mode.t = 0; hover = -1; info(root, null); setWorld('pale'); L.kick(); };
  if (RM) { pos.x = pos.t; }
  info(root, null);
  const det = input(root, {
    onStep(s) { if (mode.t < .5) { focusOn(hover >= 0 ? hover : 0); return; } focusOn(Math.round(pos.t) + s); },
    onDrag(dx) { if (mode.t < .5) return; if (dragBase === null) dragBase = pos.t; const sp = W < 700 ? W * .55 : Math.min(W * .26, H * .46); pos.t = clamp(dragBase - dx / sp, -.4, N - .6); L.kick(); },
    onRelease(dx, v, d, e) {
      if (dragBase !== null) { const t = Math.round(pos.t - v * 3); dragBase = null; if (d.moved > 6) { focusOn(t); return; } }
      dragBase = null;
      if (d.moved > 6) return;
      const b = d.el?.closest?.('.sw-v'); if (!b) return;
      const i = +b.dataset.i;
      if (mode.t < .5) focusOn(i); else if (i === Math.round(pos.t)) go('#c-' + ALL[i].id); else focusOn(i);
    },
    onKey(e) { if (e.key === 'Escape') overview(); if (e.key === 'Enter' && mode.t > .5 && document.activeElement?.closest?.('.sw-a')) go('#c-' + ALL[Math.round(pos.t)].id); }
  });
  const over = e => { if (mode.t > .5) return; const b = e.target.closest('.sw-v'); const h = b ? +b.dataset.i : -1; if (h !== hover) { hover = h; info(root, h >= 0 ? ALL[h] : null); L.kick(); } };
  root.addEventListener('pointerover', over);
  root.querySelector('[data-out]').addEventListener('click', e => { e.preventDefault(); overview(); });
  const ro = new ResizeObserver(() => { size(); L.kick(); }); ro.observe(root);
  L.kick();
  return () => { det(); L.stop(); ro.disconnect(); root.removeEventListener('pointerover', over); };
}

/* ================================================================ B · the Series rail */
export const vRail = () => `<section class="sw sw-b" aria-label="The Series rail">
  <div class="sw-pin">${SWITCH('rail')}
    <div class="sw-rail">${AREAS.map(a => `<article class="sw-panel" data-c="${a.c}" style="--w:var(--w${a.c})">
      <div class="sw-big" aria-hidden="true">${a.c}</div>
      <header><p class="m">Series ${a.c} · ${a.it.length} compounds</p><h2 class="d2">${esc(a.f)}</h2><p class="body">${esc(a.d)}</p></header>
      <div class="sw-set">${a.it.map(p => `<a class="sw-item" href="#c-${p.id}"><img src="${img(p)}" alt="" draggable="false" loading="lazy" decoding="async"><span class="nm">${esc(p.n)}</span><span class="m"><span class="sid">${p.id} · </span>from ${cad(p.sizes[0].price)}</span></a>`).join('')}</div>
    </article>`).join('')}</div>
    <div class="sw-railrule">${RULE}</div>
  </div>
</section>`;
export function mountRail(root, {setWorld}) {
  const rail = root.querySelector('.sw-rail'), panels = [...root.querySelectorAll('.sw-panel')], N = panels.length;
  const native = () => innerWidth < 900;
  let cur = -1;
  const pick = f => { const k = clamp(Math.round(f * (N - 1)), 0, N - 1); if (k !== cur) { cur = k; setWorld(AREAS[k].c); panels.forEach((p, i) => p.classList.toggle('on', i === k)); } rule(root, f); };
  const fol = follower(0, 10);
  const L = loop(dt => {
    const mv = fol.step(RM ? 1 : dt);
    const sk = clamp(Math.abs(fol.v) * .0025, 0, 4);
    rail.style.transform = `translate3d(${(-fol.x).toFixed(1)}px,0,0)`;
    panels.forEach(p => { p.style.setProperty('--sk', sk.toFixed(2)); });
    return mv;
  });
  /* desktop: the section is tall; while it is pinned, vertical scroll maps to sideways travel */
  const onScroll = () => {
    if (native()) return;
    const r = root.getBoundingClientRect(), total = root.offsetHeight - innerHeight;
    const f = clamp(-r.top / Math.max(1, total), 0, 1);
    fol.t = f * (rail.scrollWidth - innerWidth); L.kick(); pick(f);
    /* when the reader stops between two Series, settle on the nearer one */
    clearTimeout(snapT);
    if (r.top < 0 && -r.top < total) snapT = setTimeout(() => {
      const k = Math.round(f * (N - 1));
      const target = scrollY + root.getBoundingClientRect().top + k / (N - 1) * total;
      if (Math.abs(target - scrollY) > 4) scrollTo({top: target, behavior: RM ? 'auto' : 'smooth'});
    }, 200);
  };
  let snapT = 0;
  /* phone: a native horizontal swipe with snap */
  const onRail = () => { if (!native()) return; const f = rail.scrollLeft / Math.max(1, rail.scrollWidth - rail.clientWidth); pick(f); };
  const setup = () => { root.classList.toggle('native', native()); root.style.height = native() ? '' : `${N * 100}vh`; if (native()) rail.style.transform = ''; onScroll(); onRail(); };
  addEventListener('scroll', onScroll, {passive: true}); rail.addEventListener('scroll', onRail, {passive: true}); addEventListener('resize', setup);
  setup(); pick(0);
  return () => { clearTimeout(snapT); removeEventListener('scroll', onScroll); rail.removeEventListener('scroll', onRail); removeEventListener('resize', setup); L.stop(); };
}

/* ================================================================ C · the ring */
export const vRing = () => `<section class="sw sw-c" tabindex="0" aria-label="The ring: all compounds on a turning ring. Use arrow keys to turn, Enter to open.">
  ${SWITCH('ring')}${INFO}
  <div class="sw-floor" aria-hidden="true"></div>
  <div class="sw-ringset">${ALL.map((p, i) => `<button class="sw-v" data-i="${i}" aria-label="${esc(p.n)}, ${p.id}"><img src="${img(p)}" alt="" draggable="false" decoding="async"></button>`).join('')}</div>
  ${RULE}
  <p class="sw-hint m"><span>Swipe or scroll to turn · tap the front vial to open</span></p>
</section>`;
export function mountRing(root, {setWorld, go}) {
  const els = [...root.querySelectorAll('.sw-v')], N = els.length;
  const pos = follower(0, 6), STEP = Math.PI * 2 / 13;
  let W = 0, H = 0, dragBase = null, idle = 0;
  const size = () => { const r = root.getBoundingClientRect(); W = r.width; H = r.height; };
  size();
  const L = loop(dt => {
    /* a slow drift when nobody is touching it */
    idle += dt; if (!RM && dragBase === null && idle > 4) { pos.t += dt * .12; }
    const mv = pos.step(dt);
    const mob = W < 700, Rx = mob ? W * .78 : Math.min(W * .44, 720), Rz = 1, hF = Math.min(H * (mob ? .36 : .58), 640);
    const cy = H * (mob ? .8 : .84);
    const blur = Math.min(8, Math.abs(pos.v) * 3);
    els.forEach((el, i) => {
      /* a wider step than 2pi/N: about 13 vials share the ring at once, the rest wait behind it and feed through */
      let dd = ((i - pos.x) % N + N) % N; if (dd > N / 2) dd -= N;
      const th = dd * STEP, hide = Math.abs(th) > Math.PI * .96;
      el.style.visibility = hide ? 'hidden' : '';
      const z = Math.cos(th) * Rz, x = Math.sin(th) * Rx;            /* z: 1 front, -1 back */
      const s = .34 + .66 * Math.pow((z + 1) / 2, 1.6), h = hF * s;
      const y = cy - (1 - z) * H * .11;
      el.style.transform = `translate3d(${(W / 2 + x - h * .28).toFixed(1)}px,${(y - h).toFixed(1)}px,0)`;
      el.style.width = (h * .56).toFixed(1) + 'px'; el.style.height = h.toFixed(1) + 'px';
      const edge = clamp((Math.PI * .96 - Math.abs(th)) / .9, 0, 1);
      el.style.opacity = (clamp(.12 + .88 * Math.pow((z + 1) / 2, 2.2), 0, 1) * edge).toFixed(3);
      const bl = (1 - z) * 3.2 + (z > .97 ? blur * .3 : blur);
      el.style.filter = bl > .3 ? `blur(${bl.toFixed(1)}px)` : '';
      el.style.zIndex = String(Math.round((z + 1) * 100));
    });
    const cur = ((Math.round(pos.x) % N) + N) % N;
    info(root, ALL[cur]); setWorld(ALL[cur].c); rule(root, cur / (N - 1));
    return true;
  });
  const det = input(root, {
    onStep(s) { idle = 0; pos.t = Math.round(pos.t) + s; L.kick(); },
    onDrag(dx) { idle = 0; if (dragBase === null) dragBase = pos.t; pos.t = dragBase - dx / ((W < 700 ? W * .78 : Math.min(W * .44, 720)) * STEP * .9); L.kick(); },
    onRelease(dx, v, d, e) {
      idle = 0;
      if (dragBase !== null && d.moved > 6) { pos.t = Math.round(pos.t - v * 4); dragBase = null; return; }
      dragBase = null;
      const b = d.el?.closest?.('.sw-v'); if (!b) return;
      const i = +b.dataset.i, cur = ((Math.round(pos.x) % N) + N) % N;
      if (i === cur) go('#c-' + ALL[i].id);
      else { let d2 = i - cur; if (d2 > N / 2) d2 -= N; if (d2 < -N / 2) d2 += N; pos.t = Math.round(pos.t) + d2; }
    },
    onKey(e) { if (e.key === 'Enter' && document.activeElement?.closest?.('.sw-c')) go('#c-' + ALL[((Math.round(pos.x) % N) + N) % N].id); }
  });
  const ro = new ResizeObserver(() => size()); ro.observe(root);
  L.kick();
  return () => { det(); L.stop(); ro.disconnect(); };
}

/* PR6 v7 · "The Device": the member bundle. The whole store lives on one thick, rounded, frosted-glass slab floating in
   front of the Atlas. This file owns the slab (its springs, tilt and bevel light), the chrome around it, the router and
   the morph between screens, the Atlas camera, roaming (panel hidden), Your Protocol's slide-out slab, search, the
   phone menu, the flight of a pack into Protocol (n), and the test hooks (window.PR6V7).
   Loaded only after the gate has been opened (or straight away for a member). */
import {ALL, CAT, byId, colOf} from './catalog.js';
import {$, $$, Q, esc, money, store, say, RM, CLOCK, stepTweens, isPhone, Spring, roll, clamp, pad2, ic} from './util.js';
import {Renders, packHTML, ensureDefs} from './renders.js';
import {Protocol} from './protocol.js';
import {makeView, MPAGES} from './views.js';
import {Disc, preload} from './disc.js';

const HTML = document.documentElement;
const BAR = $('#bar'), STAGE = $('#stage'), SLAB = $('#slab'), SLABIN = $('#slabIn'), VIEWS = $('#views'), FLY = $('#fly'), SEARCH = $('#search'), SHEET = $('#sheet'), DOCK = $('#dock'), WORLDH = $('#world'), DRAWER = $('#drawer');
const SEC = $('[data-sec]', SLAB), CAP = $('[data-cap]', SLAB), TR = $('[data-tr]', SLAB);
const S = {cur: null, member: false, tok: 0, roam: false, world: null, entered: false};
history.scrollRestoration = 'manual';

/* ================================================================ routes */
function parse(h) {
  const s = (h || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!s.length) return {v: 'home'};
  if (s[0] === 'formulary') return {v: 'formulary'};
  if (s[0] === 'c' && s[1]) return {v: 'col', c: s[1], id: s[2] || null};
  if (s[0] === 'p' && s[1]) return {v: 'product', id: s[1]};
  if (s[0] === 'club') return {v: 'club', sub: s[1] || ''};
  if (s[0] === 'm' && s[1]) return {v: 'member', page: s[1]};
  if (s[0] === 'protocol') return {v: 'home', drawer: true};
  if (s[0] === 'exit') return {v: 'exit'};
  return {v: 'nf'};
}
const navKey = r => r.v === 'formulary' || r.v === 'col' || r.v === 'product' || r.v === 'home' ? 'index' : r.v === 'club' ? 'club' : r.v === 'member' ? (r.page === 'notes' ? 'notes' : 'member') : '';
const cleanURL = () => { const q = new URLSearchParams(location.search); q.delete('key'); q.delete('gate'); const s = q.toString(); return location.pathname + (s ? '?' + s : ''); };

/* ================================================================ the chrome around the slab */
function buildChrome() {
  ensureDefs();
  BAR.className = 'bar';
  BAR.innerHTML = `<div class="bar-in">
    <nav class="b-nav mono" aria-label="Main">
      <a href="#/" data-nav="index">Index</a>
      <a href="#/club" data-nav="club">Field Club</a>
      <a href="#/m/notes" data-nav="notes">Field Notes</a>
      <span class="b-mem"><button type="button" id="bMem" data-nav="member" aria-expanded="false" aria-controls="memMenu">Member</button>
        <span class="menu" id="memMenu" hidden>${MPAGES.map(([k, n], i) => `<a href="#/m/${k}"><span>M/${pad2(i + 1)}</span>${esc(n)}</a>`).join('')}<a href="#/exit"><span>--</span>Exit this device</a></span></span>
    </nav>
    <button type="button" class="b-menu mono" id="bMenu" aria-expanded="false" aria-controls="sheet">Menu</button>
    <div class="b-tools mono">
      <button type="button" id="bSearch" class="b-ic" aria-expanded="false" aria-controls="search"><span class="t">Search</span>${ic('search')}</button>
      <button type="button" id="bRoam" class="b-ic" aria-pressed="false"><span class="t" data-roamt>Hide panel</span><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="5" width="13" height="10" rx="3"/><path d="M6.5 15.5l7-11"/></svg></button>
      <button type="button" id="bPro" class="b-pro" data-pro data-cnt-wrap><span class="t">Protocol</span> <span class="cnt">(<span data-cnt aria-hidden="true">00</span>)</span><i class="dot" aria-hidden="true"></i></button>
    </div>
  </div>`;
  DOCK.innerHTML = `<p class="dk-l"><i class="live" aria-hidden="true"></i><span data-dk-st>Atlas / Overview</span> <span class="dk-xyz" data-dk-xyz></span></p>
    <p class="dk-r"><span class="dk-hint">Drag outside the glass to look around</span><span class="dk-tag">The practice of progress</span></p>
    <button type="button" class="dk-show pill" id="bShow"><span class="pl">SHOW PANEL</span><span class="arr" aria-hidden="true">&uarr;</span></button>`;
  const bMem = $('#bMem'), menu = $('#memMenu');
  bMem.addEventListener('click', e => { e.stopPropagation(); const on = menu.hidden; closeMenus(); menu.hidden = !on; bMem.setAttribute('aria-expanded', on); if (on) $('a', menu).focus(); });
  $('#bSearch').addEventListener('click', () => openSearch());
  $('#bPro').addEventListener('click', () => { closeMenus(); if (S.roam) setRoam(false); Protocol.isOpen ? Protocol.close() : Protocol.open(); });
  $('#bMenu').addEventListener('click', () => openSheet());
  $('#bRoam').addEventListener('click', () => setRoam(!S.roam));
  $('#bShow').addEventListener('click', () => setRoam(false));
  document.addEventListener('click', e => { if (!e.target.closest('.b-mem')) closeMenus(); });
  menu.addEventListener('click', e => { if (e.target.closest('a')) closeMenus(); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!menu.hidden) { closeMenus(); bMem.focus(); } else if (!SEARCH.hidden) closeSearch(); else if (!SHEET.hidden) closeSheet(); else if (S.roam) setRoam(false); }
    if (e.key === '/' && S.member && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !Protocol.isOpen) { e.preventDefault(); openSearch(); }
    if (S.cur && S.cur.api && S.cur.api.keydown && !Protocol.isOpen && SEARCH.hidden && SHEET.hidden && !S.roam) S.cur.api.keydown(e);
  });
  Protocol.count();
}
function closeMenus() { const m = $('#memMenu'); if (m) { m.hidden = true; $('#bMem').setAttribute('aria-expanded', 'false'); } }

/* ================================================================ the slab: springs, tilt, the bevel light
   The slab tilts a few degrees toward the pointer (device tilt on a phone, or a slow drift where tilt needs a permission),
   the bevel highlight follows the light, and every move of the slab itself (arrive, hide to roam, make room for
   Your Protocol) runs on a spring that overshoots a little and settles. */
const SL = {rx: new Spring(0, {k: 90, c: 14}), ry: new Spring(0, {k: 90, c: 14}), tx: new Spring(0, {k: 140, c: 20}), ty: new Spring(0, {k: 120, c: 17}), s: new Spring(1, {k: 140, c: 18}), o: new Spring(1, {k: 120, c: 20}),
  lx: 30, ly: 0, tlx: 30, tly: 0, nx: 0, ny: 0, tnx: 0, tny: 0, tilt: false, moved: 0};
const TILT = RM ? 0 : 1;
addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  SL.tnx = clamp((e.clientX / innerWidth - .5) * 2, -1, 1); SL.tny = clamp((e.clientY / innerHeight - .5) * 2, -1, 1); SL.moved = performance.now();
  const r = SLAB.getBoundingClientRect(); SL.tlx = (e.clientX - r.left) / r.width * 100; SL.tly = (e.clientY - r.top) / r.height * 100;
}, {passive: true});
document.addEventListener('pointerleave', () => { SL.tnx = SL.tny = 0; SL.tlx = 30; SL.tly = -10; });
/* device tilt where it is given without asking (Android); elsewhere a slow drift stands in */
addEventListener('deviceorientation', e => { if (e.gamma == null) return; SL.tilt = true; SL.tnx = clamp(e.gamma / 25, -1, 1); SL.tny = clamp((e.beta - 45) / 25, -1, 1); SL.tlx = 50 + SL.tnx * 45; SL.tly = 50 + SL.tny * 45; }, {passive: true});
function slabGoal() {
  const ph = isPhone();
  let tx = 0, ty = 0, s = 1, o = 1;
  if (!S.entered) { ty = ph ? 60 : 70; s = .94; o = 0; }
  else if (S.roam) { ty = innerHeight * .72; s = .9; o = 0; }
  else if (Protocol.isOpen) {
    if (ph) { s = .94; ty = -6; }
    else { const W = SLAB.offsetWidth, dw = Math.min(420, innerWidth * .32), gap = 24, avail = innerWidth - dw - gap * 3; s = Math.min(1, avail / W); tx = (gap + W * s / 2) - innerWidth / 2; }
  }
  SL.tx.set(tx); SL.ty.set(ty); SL.s.set(s); SL.o.set(o);
}
function slabFrame(dt, now) {
  slabGoal();
  const touch = matchMedia('(hover: none)').matches;
  if (touch && !SL.tilt) { SL.tnx = Math.sin(now / 4200) * .45; SL.tny = Math.sin(now / 5300) * .3; SL.tlx = 50 + SL.tnx * 50; SL.tly = 20 + SL.tny * 40; }
  SL.nx += (SL.tnx - SL.nx) * (1 - Math.pow(.02, dt)); SL.ny += (SL.tny - SL.ny) * (1 - Math.pow(.02, dt));
  SL.lx += (SL.tlx - SL.lx) * (1 - Math.pow(.004, dt)); SL.ly += (SL.tly - SL.ly) * (1 - Math.pow(.004, dt));
  const maxR = isPhone() ? 2.2 : 1.7;
  SL.rx.set(-SL.ny * maxR * TILT); SL.ry.set(SL.nx * maxR * 1.25 * TILT);
  const rx = SL.rx.step(dt), ry = SL.ry.step(dt), tx = SL.tx.step(dt), ty = SL.ty.step(dt), s = SL.s.step(dt), o = SL.o.step(dt);
  SLAB.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${s.toFixed(4)})`;
  SLAB.style.opacity = clamp(o, 0, 1).toFixed(3);
  SLAB.style.setProperty('--lx', SL.lx.toFixed(1) + '%'); SLAB.style.setProperty('--ly', SL.ly.toFixed(1) + '%');
  /* the bevel catches more light on the side the slab tips toward */
  SLAB.style.setProperty('--bev', (.75 + .25 * clamp(-SL.ny * .6 - SL.nx * .4 + .3, -1, 1)).toFixed(3));
  STAGE.style.setProperty('--px', (SL.nx * -7).toFixed(2) + 'px'); STAGE.style.setProperty('--py', (SL.ny * -5).toFixed(2) + 'px');
  STAGE.style.setProperty('--plo', clamp(o, 0, 1).toFixed(3));
  if (S.world) S.world.pointer(SL.nx, SL.ny);
}

/* ================================================================ roaming: hide the panel, look around the Atlas */
function setRoam(v) {
  if (v === S.roam) return;
  S.roam = v; HTML.classList.toggle('roam', v);
  if (v) { Protocol.close(false); closeSearch(false); }
  if (S.world) S.world.setRoam(v);
  const b = $('#bRoam'); b.setAttribute('aria-pressed', v); roll($('[data-roamt]', b), v ? 'Show panel' : 'Hide panel', {noLabel: true});
  SLAB.inert = v;
  say(v ? 'Panel hidden. Drag to look around the Atlas; choose a station to open its collection.' : 'Panel shown.');
  if (!v) setTimeout(() => { const h = $('h1', VIEWS); if (h) h.focus({preventScroll: true}); }, RM ? 0 : 500);
}

/* ================================================================ search */
let sBack = null;
function openSearch() {
  closeMenus(); closeSheet(); sBack = document.activeElement; if (S.roam) setRoam(false);
  SEARCH.innerHTML = `<div class="s-in glass">
    <p class="slab-mark"><span class="wm" aria-hidden="true">PR6</span><i aria-hidden="true">/</i><span class="mono sec">Search</span></p>
    <label class="fld-l mono" for="sQ">The Formulary</label>
    <div class="s-f"><input id="sQ" class="fld-in mono" type="search" placeholder="${innerWidth < 600 ? 'Name, ingredient or code' : 'Name, ingredient, format or code'}" autocomplete="off" spellcheck="false"><kbd class="mono">Esc</kbd></div>
    <p class="s-meta mono" id="sMeta" role="status"></p>
    <ol class="s-res" id="sRes"></ol>
    <button type="button" class="s-x mono" data-sx aria-label="Close search">${ic('x', 's')}</button></div>`;
  SEARCH.hidden = false; HTML.classList.add('s-open'); $('#bSearch').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => requestAnimationFrame(() => SEARCH.classList.add('on')));
  const q = $('#sQ'); q.focus();
  q.addEventListener('input', renderSearch);
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = $('#sRes a'); if (a) { nav(a.getAttribute('href')); closeSearch(false); } } if (e.key === 'ArrowDown') { const a = $('#sRes a'); if (a) { e.preventDefault(); a.focus(); } } });
  $('[data-sx]', SEARCH).onclick = () => closeSearch();
  SEARCH.onclick = e => { if (e.target === SEARCH) closeSearch(); if (e.target.closest('#sRes a')) closeSearch(false); };
  renderSearch();
}
function closeSearch(restore = true) {
  if (SEARCH.hidden) return; SEARCH.classList.remove('on'); HTML.classList.remove('s-open'); $('#bSearch').setAttribute('aria-expanded', 'false');
  setTimeout(() => { if (!SEARCH.classList.contains('on')) SEARCH.hidden = true; }, RM ? 0 : 420);
  if (restore && sBack && document.contains(sBack)) sBack.focus({preventScroll: true});
}
function renderSearch() {
  const raw = $('#sQ').value.trim(), q = raw.toLowerCase();
  const rank = p => { const n = p.n.toLowerCase(); return p.id === q ? -1 : n.startsWith(q) ? 0 : n.split(/\s+/).some(w => w.startsWith(q)) ? 1 : n.includes(q) ? 2 : 3; };
  const hits = !q ? [] : ALL.filter(p => (p.n + ' ' + p.g + ' ' + p.cn + ' ' + p.id + ' ' + p.q + ' ' + p.act.map(a => a.name).join(' ') + ' ' + p.oth).toLowerCase().includes(q))
    .map((p, i) => [rank(p), i, p]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]).slice(0, 12);
  $('#sMeta').textContent = !q ? 'Try: creatine, magnesium, sachets, serum, 07' : hits.length ? `${pad2(hits.length)} ${hits.length === 1 ? 'entry' : 'entries'}` : `Nothing in the Formulary matches “${raw}”.`;
  $('#sRes').innerHTML = (q ? hits : CAT.map(c => c.it[0])).map((p, i) => `<li style="--i:${i}"><a href="#/p/${p.id}"><span class="s-v disc-s">${packHTML(p)}</span><span class="mono s-c">${p.id}</span><b>${esc(p.n)}</b><span class="mono s-f">${esc(p.g)} · ${esc(p.q)}</span><span class="mono s-p">${money(p.pc)}</span></a></li>`).join('');
}

/* ================================================================ the phone menu: a glass slab from the top */
let shBack = null;
function openSheet() {
  shBack = document.activeElement; if (S.roam) setRoam(false);
  SHEET.innerHTML = `<div class="sh-in glass">
    <div class="sh-top"><p class="slab-mark"><span class="wm" aria-hidden="true">PR6</span><i aria-hidden="true">/</i><span class="mono sec">Menu</span></p><button type="button" class="mono sh-x" data-shx aria-label="Close menu">${ic('x', 's')}</button></div>
    <nav aria-label="Menu"><ol class="sh-main">
      <li style="--i:0"><a href="#/">The Index</a></li><li style="--i:1"><a href="#/formulary">The Formulary</a></li><li style="--i:2"><a href="#/club">Field Club</a></li><li style="--i:3"><a href="#/m/notes">Field Notes</a></li>
    </ol>
    <p class="fld-l mono">Collections</p>
    <div class="sh-cols mono">${CAT.map(co => `<a href="#/c/${co.c}"><span>${co.c}</span>${esc(co.n)}</a>`).join('')}</div>
    <p class="fld-l mono">Member</p>
    <ol class="sh-mem mono">${MPAGES.filter(m => m[0] !== 'notes').map(([k, n]) => `<li><a href="#/m/${k}">${esc(n)}</a></li>`).join('')}<li><a href="#/exit">Exit this device</a></li></ol></nav>
    <button type="button" class="pill sh-search" data-shs><span class="pl">SEARCH THE FORMULARY</span><span class="arr" aria-hidden="true">&rarr;</span></button></div>`;
  SHEET.hidden = false; HTML.classList.add('sh-open'); $('#bMenu').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => requestAnimationFrame(() => SHEET.classList.add('on')));
  $('[data-shx]', SHEET).onclick = () => closeSheet();
  $('[data-shs]', SHEET).onclick = () => { closeSheet(false); openSearch(); };
  SHEET.onclick = e => { if (e.target === SHEET) closeSheet(); if (e.target.closest('a')) closeSheet(false); };
  setTimeout(() => $('a', SHEET).focus({preventScroll: true}), 60);
}
function closeSheet(restore = true) {
  if (SHEET.hidden) return; SHEET.classList.remove('on'); HTML.classList.remove('sh-open'); $('#bMenu').setAttribute('aria-expanded', 'false');
  setTimeout(() => { if (!SHEET.classList.contains('on')) SHEET.hidden = true; }, RM ? 0 : 420);
  if (restore && shBack && document.contains(shBack)) shBack.focus({preventScroll: true});
}

/* ================================================================ Add to Protocol: the pack lifts off the disc and arcs into the pill */
function addFly(id, srcEl) {
  const p = byId(id); if (!p) return;
  const pill = $('#bPro'); const pr = pill.getBoundingClientRect();
  const onDisc = Disc.current() && Disc.current().id === id && !S.roam;
  let r = onDisc ? Disc.objectRect() : null;
  if (!r && srcEl) { const b = (srcEl.closest('li,.ix-row') || srcEl).getBoundingClientRect(); r = {x: b.left + b.width / 2 - 40, y: b.top + b.height / 2 - 50, w: 80, h: 100}; }
  if (!r) return;
  if (RM) { Protocol.hold(0); bump(); return; }
  const DUR = 980;
  Protocol.hold(DUR - 60);
  const src = (Renders.frames(p)[0]) || Renders.hero(p);
  const g = document.createElement('div'); g.className = 'fly-pk';
  g.innerHTML = src ? `<img src="${esc(src)}" alt="">` : packHTML(p);
  /* the image's frame is larger than the pack in it: place the frame so the pack sits on r */
  const fw = r.w / .68, fh = r.h / .66;
  Object.assign(g.style, {left: (r.x - fw * .16) + 'px', top: (r.y - fh * .17) + 'px', width: fw + 'px', height: fh + 'px'});
  FLY.appendChild(g);
  if (onDisc) Disc.lift(1);
  const cx0 = r.x + r.w / 2, cy0 = r.y + r.h / 2, cx1 = pr.left + pr.width / 2, cy1 = pr.top + pr.height / 2;
  const sc1 = Math.max(.08, 26 / fh);
  /* a quadratic arc: up and over, toward the pill */
  const mx = cx0 + (cx1 - cx0) * .45, my = Math.min(cy0, cy1) - Math.max(80, Math.abs(cx1 - cx0) * .18);
  const K = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, lift = Math.min(1, t / .16);
    /* first it lifts off the disc (a little up, a little larger), then it travels */
    const u = t < .16 ? 0 : (t - .16) / .84, e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    const x = (1 - e) * (1 - e) * cx0 + 2 * (1 - e) * e * mx + e * e * cx1, y = (1 - e) * (1 - e) * (cy0 - 18 * lift) + 2 * (1 - e) * e * my + e * e * cy1;
    const s = t < .16 ? 1 + .05 * lift : (1.05 + (sc1 - 1.05) * e);
    K.push({transform: `translate(${(x - cx0).toFixed(1)}px, ${(y - cy0).toFixed(1)}px) scale(${s.toFixed(3)}) rotate(${(e * 14).toFixed(1)}deg)`, opacity: t > .9 ? 1 - (t - .9) * 8 : 1, offset: t});
  }
  const an = g.animate(K, {duration: DUR, easing: 'linear', fill: 'forwards'});
  an.onfinish = () => { g.remove(); bump(); };
  setTimeout(() => { if (onDisc) Disc.lift(0); }, 380);
}
function bump() { const b = $('#bPro'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); setTimeout(() => b.classList.remove('bump'), 900); }

/* ================================================================ the screens: one slab, contents that morph */
async function transition(r, o = {}) {
  const my = ++S.tok;
  if (r.v === 'exit') { store.del('pr6.v7.member'); location.reload(); return; }
  const v = makeView(r);
  const old = S.cur;
  const instant = o.instant || RM || !old;
  closeMenus(); closeSearch(false); closeSheet(false); if (Protocol.isOpen && !r.drawer) Protocol.close(false);
  if (S.roam && !o.keepRoam) setRoam(false);
  /* what the old screen's readouts say, so the same readouts on the new screen roll from there */
  const morph = {};
  if (old) $$('[data-morph]', old.el).forEach(m => { const t = $('[data-v]', m); morph[m.dataset.morph] = t ? (t.dataset.txt != null ? t.dataset.txt : t.textContent) : null; });
  const el = document.createElement('div');
  el.className = 'screen ' + v.cls; el.innerHTML = v.html; el.dataset.key = v.key;
  if (old) {
    if (old.api && old.api.destroy) old.api.destroy();
    $$('[data-morph]', old.el).forEach(m => { if (morph[m.dataset.morph] != null && $(`[data-morph="${m.dataset.morph}"]`, el)) m.style.visibility = 'hidden'; });
    old.el.classList.add('leaving'); old.el.inert = true;
    if (instant) old.el.remove(); else setTimeout(() => old.el.remove(), 420);
  }
  const rolls = [];
  $$('[data-morph]', el).forEach(m => {
    const t = $('[data-v]', m), was = morph[m.dataset.morph];
    if (!t || was == null || instant) return;
    const now = t.textContent; t.textContent = was; t.dataset.txt = was; m.classList.add('m'); m.classList.remove('e');
    rolls.push(() => roll(t, now, {per: 16}));
  });
  /* the slab takes the new screen's layout (the disc glides to its place on a phone) */
  SLAB.dataset.s = v.key; HTML.dataset.view = r.v; SLAB.style.setProperty('--up', 0); Disc.dim(0);
  if (!instant) el.classList.add('in');
  VIEWS.appendChild(el);
  S.cur = {r, el, hash: location.hash, api: null, v};
  const ctx = {addFly, setHash: h => { if (S.cur) S.cur.hash = h; }};
  /* the disc keeps its object and swaps it with a turn, or steps aside */
  if (v.disc && v.disc.show) Disc.show(v.disc.show, {instant: instant && !old});
  else if (v.disc && v.disc.track) Disc.track(v.disc.track, v.disc.i);
  else Disc.setAway(true);
  S.cur.api = v.init(el, ctx, r) || {};
  /* the head and the caption roll like a readout */
  roll(SEC, v.sec.toUpperCase(), {per: 18, instant: instant && !old, noLabel: true});
  roll(CAP, v.cap.toUpperCase(), {per: 12, instant: instant && !old, noLabel: true});
  if (TR.dataset.html !== v.tr) {
    TR.dataset.html = v.tr;
    if (instant) TR.innerHTML = v.tr;
    else { TR.classList.add('swap'); setTimeout(() => { if (my !== S.tok) return; TR.innerHTML = v.tr; TR.classList.remove('swap'); }, 200); }
  } else $$('a', TR).forEach(a => { const on = a.getAttribute('href') === location.hash; a.classList.toggle('on', on); });
  document.title = v.title;
  $$('[data-nav]', BAR).forEach(a => { const on = a.dataset.nav === navKey(r); a.classList.toggle('on', on); if (a.tagName === 'A') { if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); } });
  /* the Atlas: the camera glides to the collection's station behind the slab; the slab stays put */
  if (S.world && v.cam) S.world.go(v.cam.st, {close: v.cam.close, instant: o.instant && !S.entered});
  dockStation(v.cam ? v.cam.st : -1);
  rolls.forEach(f => f());
  if (!instant) requestAnimationFrame(() => requestAnimationFrame(() => { if (my === S.tok) el.classList.remove('in'); }));
  setTimeout(() => { if (my === S.tok) el.classList.add('settled'); }, instant ? 0 : 1400);
  if (r.drawer) setTimeout(() => Protocol.open(), instant ? 0 : 400);
  if (!o.noFocus) setTimeout(() => { const h = $('h1', el); if (h && my === S.tok && !Protocol.isOpen) h.focus({preventScroll: true}); }, instant ? 0 : 380);
}
let popping = false, linked = false;
const nav = h => { linked = true; location.hash = h; linked = false; };
document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href^="#"]'); if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey) { linked = true; setTimeout(() => { linked = false; }, 0); } }, true);
addEventListener('popstate', () => { popping = !linked; });
function route() {
  const r = parse(location.hash); popping = false;
  if (S.cur && S.cur.hash === location.hash) return;
  /* within a collection, moving the picker only changes the address; same screen, no new screen */
  if (S.cur && r.v === 'col' && S.cur.r.v === 'col' && S.cur.r.c === r.c) { S.cur.hash = location.hash; const i = colOf(r.c).it.findIndex(p => p.id === r.id); Disc.go(i < 0 ? 0 : i); return; }
  transition(r);
}

/* ================================================================ the dock under the slab: where the camera is, live */
let dkSt = null;
function dockStation(st) {
  const s = st >= 0 ? `Atlas / Station ${CAT[st].c} ${CAT[st].n}` : 'Atlas / Overview';
  if (s !== dkSt) { dkSt = s; roll($('[data-dk-st]', DOCK), s.toUpperCase(), {per: 14, noLabel: true}); }
}
let dkT = 0;
function dockFrame(now) {
  if (!S.world || now - dkT < 120) return; dkT = now;
  const r = S.world.readout(), f = v => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(2).padStart(5, '0');
  $('[data-dk-xyz]', DOCK).textContent = `X ${f(r.x)}  Z ${f(r.z)}  H ${f(r.h)}`;
}

/* ================================================================ the loop */
let looping = false;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = CLOCK.tick(now);
  if (document.hidden) return;
  stepTweens();
  const t = CLOCK.now();
  slabFrame(dt, t);
  Disc.frame(dt, t);
  if (S.world) S.world.frame(t, dt);
  dockFrame(t);
  if (S.cur && S.cur.api && S.cur.api.frame) S.cur.api.frame(dt);
}
const startLoop = () => { if (!looping) { looping = true; requestAnimationFrame(loop); } };
export const running = () => looping;
addEventListener('resize', () => { if (S.cur && S.cur.api && S.cur.api.resize) S.cur.api.resize(); });

/* ================================================================ the Atlas: start it (or the misty still where there is no WebGL) */
let worldP = null;
function startWorld() {
  if (worldP) return worldP;
  if (Q.has('nogl')) { HTML.classList.add('nogl'); return (worldP = Promise.resolve(null)); }
  return (worldP = import('./atlas/world.js').then(m => {
    const w = m.createWorld(WORLDH, $('#labels'));
    if (!w) { HTML.classList.add('nogl'); return null; }
    S.world = w; HTML.classList.add('gl');
    w.onPick = st => { setRoam(false); nav('#/c/' + CAT[st].c); };
    if (S.cur && S.cur.v.cam) w.go(S.cur.v.cam.st, {close: S.cur.v.cam.close, instant: true});
    return w.warm().then(() => w);
  }).catch(e => { console.warn('[pr6] the Atlas is unavailable; the misty still stands in', e); HTML.classList.add('nogl'); return null; }));
}
document.addEventListener('visibilitychange', () => { if (S.world) S.world.setVisible(!document.hidden); });

/* ================================================================ boot: a member, straight in */
function common() {
  S.member = true;
  buildChrome(); hooks(); Disc.init(); startLoop();
  Protocol.on(() => {});
  DRAWER.addEventListener('transitionstart', () => {}, {passive: true});
  /* preload the turntable for the lead products of every collection, quietly */
  setTimeout(() => CAT.forEach(co => preload(co.it[0])), 2500);
}
export async function boot() {
  await Renders.ready;
  common();
  STAGE.hidden = false; BAR.hidden = false;
  const r = parse(location.hash);
  if (r.v === 'exit') { store.del('pr6.v7.member'); location.reload(); return; }
  startWorld();
  await transition(r, {instant: true, noFocus: true});
  arrive();
  addEventListener('hashchange', route);
  HTML.classList.add('ready');
}
/* the slab arrives: it springs up out of the light, its rows come in one after another, the camera settles */
function arrive() {
  requestAnimationFrame(() => {
    S.entered = true;
    if (S.world) S.world.intro();
    if (S.cur) { S.cur.el.classList.add('in'); requestAnimationFrame(() => requestAnimationFrame(() => S.cur && S.cur.el.classList.remove('in'))); }
    BAR.classList.add('arrive'); setTimeout(() => BAR.classList.remove('arrive'), 50);
  });
}
/* a guest who has just opened the gate: everything loads behind the gate's light, then the gate hands over */
let FG = null;
export function fromGate() {
  return FG || (FG = (async () => {
    showSplash();
    await Renders.ready;
    common();
    await Promise.race([startWorld(), new Promise(r => setTimeout(r, 4000))]);
    return enter;
  })());
}
let splash = null;
function showSplash() {
  if (splash) return;
  splash = document.createElement('div'); splash.id = 'splash'; splash.setAttribute('aria-hidden', 'true');
  splash.innerHTML = '<div class="sp-in"><span class="sp-wm">PR6</span><span class="sp-tag mono">The practice of progress</span></div>';
  document.body.appendChild(splash);
}
function dropSplash() {
  if (!splash) return; const s = splash; splash = null;
  s.style.setProperty('--o', getComputedStyle(s).opacity); s.style.transition = 'none'; s.style.animation = ''; s.classList.add('out'); setTimeout(() => s.remove(), RM ? 0 : 1100);
}
let entered = false;
const enter = {
  prepare() {},
  async go() {
    if (entered) return; entered = true;
    HTML.classList.remove('out'); HTML.classList.add('in');
    history.replaceState(null, '', cleanURL() + '#/');
    STAGE.hidden = false; BAR.hidden = false;
    await transition({v: 'home'}, {instant: true, noFocus: true});
    if (S.world) S.world.go(-1, {instant: true});
    if (splash && !RM) { const o = +getComputedStyle(splash).opacity; if (o < .95) { splash.style.animation = 'none'; splash.style.transition = 'opacity .3s ease, filter .3s ease'; splash.style.opacity = o; void splash.offsetWidth; splash.style.opacity = 1; splash.style.filter = 'none'; } setTimeout(() => { dropSplash(); setTimeout(arrive, 180); }, o < .95 ? 650 : 350); }
    else { dropSplash(); arrive(); }
    addEventListener('hashchange', route);
    HTML.classList.add('ready');
    setTimeout(() => { const h = $('h1', VIEWS); if (h) h.focus({preventScroll: true}); }, RM ? 0 : 1400);
  }
};

/* ================================================================ test hooks */
function hooks() {
  window.PR6V7 = {
    state: () => ({
      route: S.cur ? S.cur.r : null, hash: location.hash, member: S.member, view: HTML.dataset.view || null, screen: S.cur ? S.cur.v.key : null,
      rm: RM, phone: isPhone(), roam: S.roam, entered: S.entered,
      protocol: {open: Protocol.isOpen, count: Protocol.size(), lines: Protocol.lines(), total: Protocol.total()},
      disc: Disc.state(), world: S.world ? S.world.state() : null, gl: !!S.world,
      renders: Renders.status(), search: !SEARCH.hidden, sheet: !SHEET.hidden
    }),
    go: h => { nav(h); },
    roam: v => setRoam(v),
    protocol: Protocol, disc: Disc,
    get world() { return S.world; }
  };
}

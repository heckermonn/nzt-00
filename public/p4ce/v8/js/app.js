/* PR6 v8 · "Stations": the member bundle. The Atlas is the front: nine standing glass panels on one arc, full screen.
   Choose one and the camera glides up to it until it fills the screen, and the panel becomes the collection slab
   (a pane starts exactly over the 3D panel, carrying its face, and grows into the DOM slab: one object, no cut).
   On the slab: the collection (every entry at once), the Dossier (a disc grows out of the collection's disc), the
   Index, Field Club and the member pages. Back shrinks the slab into its panel and the camera pulls back.
   This file owns the chrome over the Atlas (#home: the side list on a desktop, the centred station's caption on a
   phone), the slab (springs, tilt, bevel light), the router and the morphs, Your Protocol, search, the phone menu, the
   flight of a pack into Protocol (n), and the test hooks (window.PR6V8).
   Loaded only after the gate has been opened (or straight away for a member). */
import {ALL, CAT, byId, colOf} from './catalog.js';
import {$, $$, Q, esc, money, store, say, RM, CLOCK, stepTweens, isPhone, Spring, roll, clamp, pad2, ic} from './util.js';
import {Renders, packHTML, ensureDefs} from './renders.js';
import {Protocol} from './protocol.js';
import {makeView, MPAGES} from './views.js';
import {Disc, preload} from './disc.js';

const HTML = document.documentElement;
const BAR = $('#bar'), STAGE = $('#stage'), SLAB = $('#slab'), VIEWS = $('#views'), FLY = $('#fly'), SEARCH = $('#search'), SHEET = $('#sheet'), DOCK = $('#dock'), WORLDH = $('#world'), HOME = $('#home'), GH = $('#ghost'), DISCEL = $('#disc');
const SEC = $('[data-sec]', SLAB), CAP = $('[data-cap]', SLAB), TR = $('[data-tr]', SLAB);
const S = {cur: null, r: null, member: false, tok: 0, world: null, entered: false, slab: false, st: 0, hsel: -1, busy: false};
const NOGL = () => !S.world;
const PHONE = () => innerWidth <= 760;
history.scrollRestoration = 'manual';

/* ================================================================ routes */
function parse(h) {
  const s = (h || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!s.length) return {v: 'home'};
  if (s[0] === 'index') return {v: 'index'};
  if (s[0] === 'formulary') return {v: 'formulary'};
  if (s[0] === 'c' && s[1]) return {v: 'col', c: s[1]};
  if (s[0] === 'p' && s[1]) return {v: 'product', id: s[1]};
  if (s[0] === 'club') return {v: 'club', sub: s[1] || ''};
  if (s[0] === 'm' && s[1]) return {v: 'member', page: s[1]};
  if (s[0] === 'protocol') return {v: 'home', drawer: true};
  if (s[0] === 'exit') return {v: 'exit'};
  return {v: 'nf'};
}
const navKey = r => r.v === 'home' || r.v === 'col' || r.v === 'product' ? 'atlas' : r.v === 'index' || r.v === 'formulary' ? 'index' : r.v === 'club' ? 'club' : r.v === 'member' ? (r.page === 'notes' ? 'notes' : 'member') : '';
const cleanURL = () => { const q = new URLSearchParams(location.search); q.delete('key'); q.delete('gate'); const s = q.toString(); return location.pathname + (s ? '?' + s : ''); };
const stOf = r => r.v === 'col' ? CAT.findIndex(c => c.c === r.c) : r.v === 'product' && byId(r.id) ? CAT.findIndex(c => c.c === byId(r.id).c) : -1;

/* ================================================================ the chrome */
function buildChrome() {
  ensureDefs();
  BAR.className = 'bar';
  BAR.innerHTML = `<div class="bar-in">
    <a class="b-mark" href="#/" aria-label="PR6, the Atlas"><span class="wm" aria-hidden="true">PR6</span><i aria-hidden="true">/</i><span class="mono b-sec" data-bsec aria-hidden="true">The Atlas</span></a>
    <nav class="b-nav mono" aria-label="Main">
      <a href="#/" data-nav="atlas">Atlas</a>
      <a href="#/index" data-nav="index">Index</a>
      <a href="#/club" data-nav="club">Field Club</a>
      <a href="#/m/notes" data-nav="notes">Field Notes</a>
      <span class="b-mem"><button type="button" id="bMem" data-nav="member" aria-expanded="false" aria-controls="memMenu">Member</button>
        <span class="menu" id="memMenu" hidden>${MPAGES.map(([k, n], i) => `<a href="#/m/${k}"><span>M/${pad2(i + 1)}</span>${esc(n)}</a>`).join('')}<a href="#/exit"><span>--</span>Exit this device</a></span></span>
    </nav>
    <div class="b-tools mono">
      <button type="button" id="bSearch" class="b-ic" aria-expanded="false" aria-controls="search"><span class="t">Search</span>${ic('search')}</button>
      <button type="button" id="bPro" class="b-pro" data-pro data-cnt-wrap><span class="t">Protocol</span> <span class="cnt">(<span data-cnt aria-hidden="true">00</span>)</span><i class="dot" aria-hidden="true"></i></button>
      <button type="button" class="b-menu mono" id="bMenu" aria-expanded="false" aria-controls="sheet" aria-label="Menu"><i></i><i></i></button>
    </div>
  </div>`;
  DOCK.innerHTML = `<p class="dk-l"><i class="live" aria-hidden="true"></i><span data-dk-st>Atlas / Overview</span> <span class="dk-xyz" data-dk-xyz></span></p><p class="dk-r"><span class="dk-tag">The practice of progress</span></p>`;
  const bMem = $('#bMem'), menu = $('#memMenu');
  bMem.addEventListener('click', e => { e.stopPropagation(); const on = menu.hidden; closeMenus(); menu.hidden = !on; bMem.setAttribute('aria-expanded', on); if (on) $('a', menu).focus(); });
  $('#bSearch').addEventListener('click', () => openSearch());
  $('#bPro').addEventListener('click', () => { closeMenus(); Protocol.isOpen ? Protocol.close() : Protocol.open(); });
  $('#bMenu').addEventListener('click', () => openSheet());
  document.addEventListener('click', e => { if (!e.target.closest('.b-mem')) closeMenus(); });
  menu.addEventListener('click', e => { if (e.target.closest('a')) closeMenus(); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!menu.hidden) { closeMenus(); bMem.focus(); return; } if (!SEARCH.hidden) { closeSearch(); return; } if (!SHEET.hidden) { closeSheet(); return; } if (Protocol.isOpen) return; }
    if (e.key === '/' && S.member && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !Protocol.isOpen) { e.preventDefault(); openSearch(); return; }
    if (Protocol.isOpen || !SEARCH.hidden || !SHEET.hidden) return;
    if (S.r && S.r.v === 'home') homeKey(e);
    else if (S.cur && S.cur.api && S.cur.api.keydown) S.cur.api.keydown(e);
  });
  Protocol.count();
}
function closeMenus() { const m = $('#memMenu'); if (m) { m.hidden = true; $('#bMem').setAttribute('aria-expanded', 'false'); } }

/* ================================================================ #home: the chrome over the Atlas
   desktop: a clean mono list of the nine collections on the left (hover raises the station, click travels there),
   a quiet way to the full Index, and a hint. phone: the centred station's big caption under it, ENTER 04 →, nine ticks.
   no WebGL (?nogl): the nine stations as rounded cards in a grid. */
function buildHome() {
  const n = ALL.length;
  HOME.innerHTML = `
    <div class="h-side">
      <p class="h-k mono"><i class="live" aria-hidden="true"></i>The Atlas <span>/ 09 stations</span></p>
      <h1 class="h-h" tabindex="-1">Progress, in practice.</h1>
      <ol class="h-list mono">${CAT.map((co, i) => `<li style="--k:${i}"><a href="#/c/${co.c}" data-hs="${i}"><span class="c">${co.c}</span><span class="n">${esc(co.n)}</span><span class="k">${pad2(co.it.length)}</span><span class="arr" aria-hidden="true">&rarr;</span></a></li>`).join('')}</ol>
      <a class="h-ix mono" href="#/index"><span>The full Index</span><span class="k">${n} entries</span><span class="arr" aria-hidden="true">&rarr;</span></a>
    </div>
    <p class="h-hint mono" aria-hidden="true"><span class="hh-d">Drag to look around <i>/</i> click a station to enter</span><span class="hh-p"><span class="sh-a">&larr;</span> Swipe between stations <span class="sh-a">&rarr;</span></span></p>
    <div class="h-cap" aria-live="polite">
      <p class="hc-k mono"><span data-hk>Station 01</span> <span class="hc-of">/ 09</span></p>
      <p class="hc-n"><span class="hc-c" data-hc>01</span><i aria-hidden="true">/</i><span class="hc-name mono" data-hn>FOUNDATION</span></p>
      <p class="hc-d" data-hdesc>${esc(CAT[0].d)}</p>
      <a class="pill hc-go" href="#/c/01" data-hgo><span class="pl" data-hgl>ENTER 01</span><span class="arr" aria-hidden="true">&rarr;</span></a>
      <div class="hc-dots" role="group" aria-label="Stations">${CAT.map((co, i) => `<button type="button" data-hd="${i}" aria-label="Station ${co.c}, ${esc(co.n)}"><i></i></button>`).join('')}</div>
    </div>
    <ol class="h-cards">${CAT.map((co, i) => `<li><a class="hcard" href="#/c/${co.c}" data-hc="${i}">
      <span class="hcd-h"><span class="wm">PR6</span><i>/</i><span class="mono">Station ${co.c}</span></span>
      <span class="hcd-disc disc-s">${packHTML(co.it[0])}</span>
      <span class="hcd-n"><b>${co.c}</b><span class="mono">${esc(co.n)}</span></span>
      <span class="hcd-d">${esc(co.d)}</span></a></li>`).join('')}</ol>`;
  $$('[data-hs]', HOME).forEach(a => {
    const i = +a.dataset.hs;
    a.addEventListener('pointerenter', () => { if (S.world) S.world.hover(i); });
    a.addEventListener('pointerleave', () => { if (S.world) S.world.hover(-1); });
    a.addEventListener('focus', () => { if (S.world) S.world.hover(i); });
    a.addEventListener('blur', () => { if (S.world) S.world.hover(-1); });
  });
  $$('[data-hd]', HOME).forEach(b => b.addEventListener('click', () => { if (S.world) S.world.focusTo(+b.dataset.hd); }));
  /* swipes on the caption move the Atlas too (the whole lower screen is a swipe surface) */
  const cap = $('.h-cap', HOME); let sw = null;
  cap.addEventListener('pointerdown', e => { if (e.target.closest('a,button')) return; sw = {x: e.clientX, y: e.clientY}; });
  cap.addEventListener('pointerup', e => { if (!sw) return; const dx = e.clientX - sw.x; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - sw.y) && S.world) S.world.step(dx < 0 ? 1 : -1); sw = null; });
}
/* the centred station changed (phone): its caption rolls to it */
function homeFocus(i) {
  S.st = i; const co = CAT[i];
  roll($('[data-hk]', HOME), 'STATION ' + co.c, {per: 14, noLabel: true});
  roll($('[data-hc]', HOME), co.c, {per: 30, noLabel: true});
  roll($('[data-hn]', HOME), co.n.toUpperCase(), {per: 16, noLabel: true});
  const d = $('[data-hdesc]', HOME); d.classList.remove('swp'); void d.offsetWidth; d.classList.add('swp'); d.textContent = co.d;
  roll($('[data-hgl]', HOME), 'ENTER ' + co.c, {per: 18, noLabel: true});
  $('[data-hgo]', HOME).setAttribute('href', '#/c/' + co.c); $('[data-hgo]', HOME).setAttribute('aria-label', 'Enter station ' + co.c + ', ' + co.n);
  $$('[data-hd]', HOME).forEach((b, j) => { if (b.tagName === 'BUTTON') { b.classList.toggle('on', j === i); b.setAttribute('aria-pressed', j === i); } });
  dockStation(i);
}
function homeHover(i) {
  $$('[data-hs]', HOME).forEach(a => a.classList.toggle('on', +a.dataset.hs === i));
  HTML.classList.toggle('h-over', i >= 0);
  if (!PHONE()) dockStation(i);
}
function homeKey(e) {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if (!S.world) return;
  if (S.world.phone) {
    if (e.key === 'ArrowRight') { e.preventDefault(); S.world.step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); S.world.step(-1); }
    if (e.key === 'Enter' && document.activeElement === document.body) nav('#/c/' + CAT[S.world.focus].c);
  } else {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); S.hsel = clamp((S.hsel < 0 ? (e.key === 'ArrowRight' ? -1 : 9) : S.hsel) + (e.key === 'ArrowRight' ? 1 : -1), 0, 8); S.world.hover(S.hsel); }
    if (e.key === 'Enter' && S.hsel >= 0 && (document.activeElement === document.body || document.activeElement.classList.contains('h-h'))) nav('#/c/' + CAT[S.hsel].c);
  }
}

/* ================================================================ the slab: springs, tilt, the bevel light (from v7) */
const SL = {rx: new Spring(0, {k: 90, c: 14}), ry: new Spring(0, {k: 90, c: 14}), tx: new Spring(0, {k: 140, c: 20}), ty: new Spring(60, {k: 120, c: 17}), s: new Spring(.94, {k: 140, c: 18}), o: new Spring(0, {k: 120, c: 20}),
  lx: 30, ly: 0, tlx: 30, tly: 0, nx: 0, ny: 0, tnx: 0, tny: 0, tilt: false};
const TILT = RM ? 0 : 1;
addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  SL.tnx = clamp((e.clientX / innerWidth - .5) * 2, -1, 1); SL.tny = clamp((e.clientY / innerHeight - .5) * 2, -1, 1);
  const r = SLAB.getBoundingClientRect(); SL.tlx = (e.clientX - r.left) / r.width * 100; SL.tly = (e.clientY - r.top) / r.height * 100;
}, {passive: true});
document.addEventListener('pointerleave', () => { SL.tnx = SL.tny = 0; SL.tlx = 30; SL.tly = -10; });
let tiltBase = null;
addEventListener('deviceorientation', e => {
  if (e.gamma == null) return; SL.tilt = true;
  if (!tiltBase) tiltBase = {g: e.gamma, b: e.beta};
  tiltBase.g += (e.gamma - tiltBase.g) * .01; tiltBase.b += (e.beta - tiltBase.b) * .01;
  const dz = v => Math.sign(v) * Math.max(0, Math.abs(v) - 2.5);
  SL.tnx = clamp(dz(e.gamma - tiltBase.g) / 30, -.8, .8); SL.tny = clamp(dz(e.beta - tiltBase.b) / 30, -.8, .8);
  SL.tlx = 50 + SL.tnx * 45; SL.tly = 30 + SL.tny * 45;
}, {passive: true});
let press = null;
addEventListener('pointerdown', e => { if (e.pointerType !== 'touch' || SL.tilt) return; press = {x: clamp((e.clientX / innerWidth - .5) * 2, -1, 1) * .35, y: clamp((e.clientY / innerHeight - .5) * 2, -1, 1) * .25}; }, {passive: true});
const unpress = e => { if (e.pointerType === 'touch') press = null; };
addEventListener('pointerup', unpress, {passive: true}); addEventListener('pointercancel', unpress, {passive: true});
function slabGoal() {
  const ph = PHONE();
  let tx = 0, ty = 0, s = 1, o = 1;
  if (!S.slab) { ty = ph ? 50 : 60; s = .94; o = 0; }
  else if (Protocol.isOpen) {
    if (ph) { s = .94; ty = -6; }
    else { const W = SLAB.offsetWidth, dw = Math.min(420, innerWidth * .32), gap = 24, avail = innerWidth - dw - gap * 3 - 12; s = Math.min(1, avail / (W * 1.03)); tx = (gap + W * s * 1.015 / 2) - innerWidth / 2; }
  }
  SL.tx.set(tx); SL.ty.set(ty); SL.s.set(s); SL.o.set(o);
}
/* the slab appears in place at once (a panel has just grown into it) */
function slabSnap(on) { S.slab = on; if (on) { SL.tx.snap(0); SL.ty.snap(0); SL.s.snap(1); SL.o.snap(1); } else { SL.o.snap(0); SL.ty.snap(PHONE() ? 50 : 60); SL.s.snap(.94); } slabApply(); HTML.classList.toggle('slab-on', on); }
function setSlab(on) { S.slab = on; HTML.classList.toggle('slab-on', on); }
let slabRT = {rx: 0, ry: 0};
function slabApply() {
  const tx = SL.tx.v, ty = SL.ty.v, s = SL.s.v, o = SL.o.v;
  SLAB.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotateX(${slabRT.rx.toFixed(3)}deg) rotateY(${slabRT.ry.toFixed(3)}deg) scale(${s.toFixed(4)})`;
  SLAB.style.opacity = clamp(o, 0, 1).toFixed(3);
  STAGE.style.setProperty('--plo', clamp(o, 0, 1).toFixed(3));
}
function slabFrame(dt, now) {
  slabGoal();
  const touch = matchMedia('(hover: none)').matches;
  if (touch && !SL.tilt) { SL.tnx = press ? press.x : 0; SL.tny = press ? press.y : 0; SL.tlx = 50 + Math.sin(now / 9000) * 30; SL.tly = 12 + Math.sin(now / 11000) * 14; }
  SL.nx += (SL.tnx - SL.nx) * (1 - Math.pow(.02, dt)); SL.ny += (SL.tny - SL.ny) * (1 - Math.pow(.02, dt));
  SL.lx += (SL.tlx - SL.lx) * (1 - Math.pow(.004, dt)); SL.ly += (SL.tly - SL.ly) * (1 - Math.pow(.004, dt));
  const maxR = PHONE() ? 1.6 : 1.5;
  SL.rx.set(-SL.ny * maxR * TILT); SL.ry.set(SL.nx * maxR * 1.25 * TILT);
  slabRT.rx = SL.rx.step(dt); slabRT.ry = SL.ry.step(dt); SL.tx.step(dt); SL.ty.step(dt); SL.s.step(dt); SL.o.step(dt);
  slabApply();
  SLAB.style.setProperty('--lx', SL.lx.toFixed(1) + '%'); SLAB.style.setProperty('--ly', SL.ly.toFixed(1) + '%');
  SLAB.style.setProperty('--bev', (.75 + .25 * clamp(-SL.ny * .6 - SL.nx * .4 + .3, -1, 1)).toFixed(3));
  STAGE.style.setProperty('--px', (SL.nx * -7).toFixed(2) + 'px'); STAGE.style.setProperty('--py', (SL.ny * -5).toFixed(2) + 'px');
  if (S.world) S.world.pointer(SL.nx, SL.ny);
}
/* the slab's own rectangle on screen, ignoring its springs (#stage is fixed, inset 0, so offsets are viewport px) */
const slabRect = () => ({x: SLAB.offsetLeft, y: SLAB.offsetTop, w: SLAB.offsetWidth, h: SLAB.offsetHeight});
const slabRadius = () => parseFloat(getComputedStyle(SLAB).borderTopLeftRadius) || 28;

/* ================================================================ the morph: panel ⇄ slab
   The ghost is a pane with the slab's own glass. It starts exactly over the 3D panel (or a card, without WebGL),
   carrying the panel's face, and its edges run on springs (a little overshoot, then settle) to the slab's rectangle
   while the face dissolves into the glass; then the slab is there, and its contents come in. Back is the same, reversed. */
const GHC = $('canvas', GH), GHF = {x: new Spring(0, {k: 150, c: 22}), y: new Spring(0, {k: 150, c: 22}), w: new Spring(0, {k: 150, c: 22}), h: new Spring(0, {k: 150, c: 22}), r: new Spring(0, {k: 150, c: 22}), run: null};
function ghost(from, to, o = {}) {
  if (GHF.run) GHF.run.res(false);
  const face = o.face;
  if (face) {
    /* the panel's face sits a little inside its rounded glass edge: draw the edge, then the face inset in it */
    GHC.width = 384; GHC.height = 512; const g = GHC.getContext('2d'), m = 11;
    const bg = g.createLinearGradient(0, 0, 0, 512); bg.addColorStop(0, '#e9eff1'); bg.addColorStop(1, '#cdd7dc'); g.fillStyle = bg; g.fillRect(0, 0, 384, 512);
    g.save(); g.beginPath(); g.roundRect ? g.roundRect(m, m, 384 - m * 2, 512 - m * 2, 16) : g.rect(m, m, 384 - m * 2, 512 - m * 2); g.clip(); g.drawImage(face, m, m, 384 - m * 2, 512 - m * 2); g.restore();
    GHC.style.display = '';
  }
  else GHC.style.display = 'none';
  GH.hidden = false; GH.classList.remove('out');
  ['x', 'y', 'w', 'h', 'r'].forEach(k => GHF[k].snap(from[k]).set(to[k]));
  const d0 = Math.abs(from.w - to.w) + Math.abs(from.h - to.h) + Math.abs(from.x - to.x) + Math.abs(from.y - to.y) || 1;
  return new Promise(res => { GHF.run = {res, d0, grow: !!o.grow, t0: CLOCK.now(), face: !!face}; ghostApply(); if (RM) { ['x', 'y', 'w', 'h', 'r'].forEach(k => GHF[k].snap(to[k])); ghostApply(); GHF.run = null; res(true); } });
}
function ghostApply() {
  const run = GHF.run;
  Object.assign(GH.style, {left: GHF.x.v.toFixed(1) + 'px', top: GHF.y.v.toFixed(1) + 'px', width: Math.max(1, GHF.w.v).toFixed(1) + 'px', height: Math.max(1, GHF.h.v).toFixed(1) + 'px', borderRadius: Math.max(0, GHF.r.v).toFixed(1) + 'px'});
  if (run) {
    const d = Math.abs(GHF.w.v - GHF.w.to) + Math.abs(GHF.h.v - GHF.h.to) + Math.abs(GHF.x.v - GHF.x.to) + Math.abs(GHF.y.v - GHF.y.to);
    const p = clamp(1 - d / run.d0);
    /* growing, the face dissolves early (before it stretches much); shrinking, it resolves late, as the pane lands */
    GHC.style.opacity = run.face ? (run.grow ? clamp(1 - p * 2.4) : clamp((p - .45) * 2.2)).toFixed(3) : 0;
  }
}
function ghostFrame(dt) {
  if (!GHF.run) return;
  ['x', 'y', 'w', 'h', 'r'].forEach(k => GHF[k].step(dt));
  ghostApply();
  const done = ['x', 'y', 'w', 'h'].every(k => Math.abs(GHF[k].v - GHF[k].to) < .6 && Math.abs(GHF[k].vel) < 30);
  if (done || CLOCK.now() - GHF.run.t0 > 1600) { const r = GHF.run; GHF.run = null; ['x', 'y', 'w', 'h', 'r'].forEach(k => GHF[k].snap(GHF[k].to)); ghostApply(); r.res(true); }
}
function ghostOut() { if (GH.hidden) return; GH.classList.add('out'); setTimeout(() => { if (GH.classList.contains('out')) { GH.hidden = true; GH.classList.remove('out'); } }, RM ? 0 : 320); }

/* ================================================================ search (from v7) */
let sBack = null;
function openSearch() {
  closeMenus(); closeSheet(); sBack = document.activeElement;
  SEARCH.innerHTML = `<div class="s-in glass">
    <p class="slab-mark"><span class="wm" aria-hidden="true">PR6</span><i aria-hidden="true">/</i><span class="mono sec">Search</span></p>
    <label class="fld-l mono" for="sQ">The Formulary</label>
    <div class="s-f"><input id="sQ" class="fld-in mono" type="search" placeholder="${innerWidth < 600 ? 'Name, ingredient or code' : 'Name, ingredient, format or code'}" autocomplete="off" spellcheck="false"><kbd class="mono">Esc</kbd></div>
    <p class="s-meta mono" id="sMeta" role="status"></p>
    <ol class="s-res" id="sRes"></ol>
    <button type="button" class="s-x mono" data-sx aria-label="Close search">${ic('x', 's')}</button></div>`;
  SEARCH.hidden = false; HTML.classList.add('s-open'); SEARCH.classList.add('enter'); setTimeout(() => SEARCH.classList.remove('enter'), RM ? 0 : 900); $('#bSearch').setAttribute('aria-expanded', 'true');
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

/* ================================================================ the phone menu (from v7) */
let shBack = null;
function openSheet() {
  shBack = document.activeElement;
  SHEET.innerHTML = `<div class="sh-in glass">
    <div class="sh-top"><p class="slab-mark"><span class="wm" aria-hidden="true">PR6</span><i aria-hidden="true">/</i><span class="mono sec">Menu</span></p><button type="button" class="mono sh-x" data-shx aria-label="Close menu">${ic('x', 's')}</button></div>
    <nav aria-label="Menu"><ol class="sh-main">
      <li style="--i:0"><a href="#/">The Atlas</a></li><li style="--i:1"><a href="#/index">The Index</a></li><li style="--i:2"><a href="#/club">Field Club</a></li><li style="--i:3"><a href="#/m/notes">Field Notes</a></li>
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

/* ================================================================ Add to Protocol: the pack lifts off the disc and arcs into the pill (from v7) */
function addFly(id, srcEl) {
  const p = byId(id); if (!p) return;
  const pill = $('#bPro'); const pr = pill.getBoundingClientRect();
  const onDisc = Disc.current() && Disc.current().id === id && S.slab;
  let r = onDisc ? Disc.objectRect() : null;
  if (!r && srcEl) { const b = (srcEl.closest('li,.ix-row') || srcEl).getBoundingClientRect(); r = {x: b.left + b.width / 2 - 40, y: b.top + b.height / 2 - 50, w: 80, h: 100}; }
  if (!r) return;
  if (RM) { Protocol.hold(0); bump(); return; }
  const DUR = 980;
  Protocol.hold(DUR - 60);
  const src = (Renders.frames(p)[0]) || Renders.hero(p);
  const g = document.createElement('div'); g.className = 'fly-pk';
  g.innerHTML = src ? `<img src="${esc(src)}" alt="">` : packHTML(p);
  const fw = r.w / .68, fh = r.h / .66;
  Object.assign(g.style, {left: (r.x - fw * .16) + 'px', top: (r.y - fh * .17) + 'px', width: fw + 'px', height: fh + 'px'});
  FLY.appendChild(g);
  if (onDisc) Disc.lift(1);
  const cx0 = r.x + r.w / 2, cy0 = r.y + r.h / 2, cx1 = pr.left + pr.width / 2, cy1 = pr.top + pr.height / 2;
  const sc1 = Math.max(.08, 26 / fh);
  const mx = cx0 + (cx1 - cx0) * .45, my = Math.min(cy0, cy1) - Math.max(80, Math.abs(cx1 - cx0) * .18);
  const K = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, lift = Math.min(1, t / .16);
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

/* ================================================================ the screens on the slab: contents that morph (from v7) */
function mount(r, o = {}) {
  const v = makeView(r);
  const old = S.cur;
  const instant = o.instant || RM || !old;
  const morph = {};
  if (old && !o.fresh) $$('[data-morph]', old.el).forEach(m => { const t = $('[data-v]', m); morph[m.dataset.morph] = t ? (t.dataset.txt != null ? t.dataset.txt : t.textContent) : null; });
  /* a disc in the collection grows into the Dossier's disc */
  let grow = null;
  if (old && old.v.key === 'col' && r.v === 'product' && S.slab) { const c = $(`.cd[data-id="${r.id}"] .cd-disc`, old.el); if (c) grow = c.getBoundingClientRect(); }
  const el = document.createElement('div');
  el.className = 'screen ' + v.cls; el.innerHTML = v.html; el.dataset.key = v.key;
  if (old) {
    if (old.api && old.api.destroy) old.api.destroy();
    $$('[data-morph]', old.el).forEach(m => { if (morph[m.dataset.morph] != null && $(`[data-morph="${m.dataset.morph}"]`, el)) m.style.visibility = 'hidden'; });
    old.el.classList.add('leaving'); old.el.inert = true;
    if (instant || o.fresh) old.el.remove(); else setTimeout(() => old.el.remove(), 420);
  }
  const rolls = [];
  if (!o.fresh) $$('[data-morph]', el).forEach(m => {
    const t = $('[data-v]', m), was = morph[m.dataset.morph];
    if (!t || was == null || instant) return;
    const now = t.textContent; t.textContent = was; t.dataset.txt = was; m.classList.add('m'); m.classList.remove('e');
    rolls.push(() => roll(t, now, {per: 16}));
  });
  SLAB.dataset.s = v.key; HTML.dataset.view = r.v; SLAB.style.setProperty('--up', 0); Disc.dim(0);
  el.classList.add('in');
  VIEWS.appendChild(el);
  S.cur = {r, el, hash: location.hash, api: null, v};
  const ctx = {addFly, setHash: h => { if (S.cur) S.cur.hash = h; }};
  if (grow) DISCEL.classList.add('nomove');
  if (v.disc && v.disc.show) Disc.show(v.disc.show, {instant: instant || !!grow});
  else Disc.setAway(true);
  if (grow) { Disc.snapIn(); discGrow(grow); }
  S.cur.api = v.init(el, ctx, r) || {};
  roll(SEC, v.sec.toUpperCase(), {per: 18, instant: !old || o.fresh, noLabel: true});
  roll(CAP, v.cap.toUpperCase(), {per: 12, instant: !old || o.fresh, noLabel: true});
  if (TR.dataset.html !== v.tr) {
    TR.dataset.html = v.tr;
    if (instant || o.fresh) TR.innerHTML = v.tr;
    else { const my = S.tok; TR.classList.add('swap'); setTimeout(() => { if (my !== S.tok) return; TR.innerHTML = v.tr; TR.classList.remove('swap'); }, 200); }
  }
  document.title = v.title;
  rolls.forEach(f => f());
  return {v, el, reveal: () => reveal(el)};
}
/* the screen's rows and fields come in one after another (held until the slab is actually there) */
function reveal(el) {
  const my = S.tok;
  requestAnimationFrame(() => requestAnimationFrame(() => { if (S.cur && S.cur.el === el) el.classList.remove('in'); }));
  setTimeout(() => { if (S.cur && S.cur.el === el && my === S.tok) el.classList.add('settled'); }, RM ? 0 : 1400);
}
/* the disc grows from the collection's small disc into the Dossier's big one (FLIP on the disc, uniform: both are circles) */
function discGrow(from) {
  const to = DISCEL.getBoundingClientRect();
  DISCEL.classList.remove('nomove');
  if (RM || !to.width) return;
  const s = from.width / to.width, dx = from.left - to.left, dy = from.top - to.top;
  DISCEL.animate([{transform: `translate(${dx}px, ${dy}px) scale(${s})`, transformOrigin: '0 0'}, {transform: 'none', transformOrigin: '0 0'}], {duration: 820, easing: 'cubic-bezier(.3, 1.22, .48, 1)'});
}

/* ================================================================ the router: where the Atlas camera goes, and how the slab arrives or leaves */
async function transition(r, o = {}) {
  const my = ++S.tok;
  if (r.v === 'exit') { store.del('pr6.v8.member'); location.reload(); return; }
  closeMenus(); closeSearch(false); closeSheet(false); if (Protocol.isOpen && !r.drawer) Protocol.close(false);
  const prev = S.r; S.r = r;
  setNav(r);
  const st = stOf(r);
  const instant = !!o.instant;
  if (r.v === 'home') { await goHome(prev, my, instant); if (r.drawer) setTimeout(() => Protocol.open(), instant ? 0 : 400); return; }
  HTML.classList.remove('home-on');
  /* a collection opened from the Atlas: the camera glides to its panel, the panel becomes the slab */
  if (r.v === 'col' && !S.slab && !instant) { await openFromPanel(r, st, my); return; }
  const fresh = !S.slab;
  const m = mount(r, {instant: instant || fresh, fresh});
  if (S.world) {
    const rect = slabRect();
    if (m.v.cam === 'enter') S.world.enter(st, rect, {instant});
    else if (m.v.cam === 'product') S.world.product(st, rect, {instant});
    else S.world.over({st: S.world.phone ? S.world.focus : undefined, instant});
    S.world.faceOn(m.v.cam === 'home');
  }
  if (fresh) { setSlab(true); if (instant) slabSnap(true); }
  m.reveal();
  dockStation(st);
  if (!o.noFocus) setTimeout(() => { const h = $('h1', m.el); if (h && my === S.tok && !Protocol.isOpen) h.focus({preventScroll: true}); }, instant ? 0 : 420);
}
async function openFromPanel(r, st, my) {
  if (S.world) S.world.input = false;
  HTML.dataset.view = 'col'; HTML.classList.remove('home-on');
  const m = mount(r, {fresh: true});           /* built now, behind; shown when the panel has become the slab */
  const rect = slabRect();
  let from;
  if (S.world) {
    await S.world.enter(st, rect);
    if (my !== S.tok) return;
    from = S.world.panelRect(st);
  } else {
    const card = $(`.hcard[data-hc="${st}"]`, HOME), b = card ? card.getBoundingClientRect() : {left: rect.x + rect.w * .3, top: rect.y + rect.h * .3, width: rect.w * .4, height: rect.h * .4};
    from = {x: b.left, y: b.top, w: b.width, h: b.height, r: 22};
  }
  await ghost(from, Object.assign({r: slabRadius()}, rect), {grow: true, face: S.world ? S.world.faceCanvas(st) : null});
  if (my !== S.tok) return;
  slabSnap(true); ghostOut(); m.reveal(); dockStation(st);
  if (S.world) S.world.faceOn(false);
  setTimeout(() => { const h = $('h1', m.el); if (h && my === S.tok && !Protocol.isOpen) h.focus({preventScroll: true}); }, 380);
}
async function goHome(prev, my, instant) {
  const st = prev ? stOf(prev) : -1;
  HTML.dataset.view = 'home'; document.title = 'PR6 · The Atlas';
  dockStation(S.world && S.world.phone ? S.world.focus : -1);
  if (S.slab && st >= 0 && !instant && (S.world || $(`.hcard[data-hc="${st}"]`, HOME))) {
    /* the slab shrinks back into its panel, then the camera pulls back */
    const rect = slabRect(), from = Object.assign({r: slabRadius()}, rect);
    let to;
    if (S.world) { S.world.faceOn(true); if (S.world.state().mode !== 'enter') { S.world.enter(st, rect, {instant: true}); S.world.frame(CLOCK.now(), 0); } to = S.world.panelRect(st); }
    else { const b = $(`.hcard[data-hc="${st}"]`, HOME).getBoundingClientRect(); to = {x: b.left, y: b.top, w: b.width, h: b.height, r: 22}; }
    slabSnap(false); unmountSoon();
    await ghost(from, to, {grow: false, face: S.world ? S.world.faceCanvas(st) : null});
    if (my !== S.tok) return;
    ghostOut();
    if (S.world) { S.world.input = true; S.world.home({st}); }
    homeOn(my);
    return;
  }
  if (S.slab) { setSlab(false); unmountSoon(); }
  if (S.world) { S.world.faceOn(true); S.world.input = true; S.world.home({st: st >= 0 ? st : undefined, instant}); }
  homeOn(my, instant);
}
function unmountSoon() { const c = S.cur; if (!c) return; S.cur = null; if (c.api && c.api.destroy) c.api.destroy(); c.el.inert = true; Disc.setAway(true); setTimeout(() => { if (S.cur !== c) c.el.remove(); }, RM ? 0 : 500); TR.dataset.html = ''; }
function homeOn(my, instant) {
  HTML.classList.add('home-on');
  HOME.classList.remove('in'); void HOME.offsetWidth;
  if (!instant) HOME.classList.add('in');
  setTimeout(() => { const h = $('.h-h', HOME); if (h && my === S.tok && !Protocol.isOpen && !PHONE()) h.focus({preventScroll: true}); }, 500);
}
function setNav(r) {
  $$('[data-nav]', BAR).forEach(a => { const on = a.dataset.nav === navKey(r); a.classList.toggle('on', on); if (a.tagName === 'A') { if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); } });
  const v = r.v === 'home' ? 'The Atlas' : r.v === 'col' ? 'Station ' + r.c : r.v === 'product' ? 'The Dossier' : r.v === 'index' ? 'The Index' : r.v === 'club' ? 'Field Club' : r.v === 'member' ? 'Member' : '';
  roll($('[data-bsec]', BAR), v.toUpperCase(), {per: 14, noLabel: true});
}
let linked = false;
const nav = h => { linked = true; location.hash = h; linked = false; };
function route() {
  const r = parse(location.hash);
  if (S.cur && S.cur.hash === location.hash && S.slab) return;
  transition(r);
}

/* ================================================================ the dock: where the camera is, live (desktop) */
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
  ghostFrame(dt);
  Disc.frame(dt, t);
  if (S.world) S.world.frame(t, dt);
  dockFrame(t);
  if (S.cur && S.cur.api && S.cur.api.frame) S.cur.api.frame(dt);
}
const startLoop = () => { if (!looping) { looping = true; requestAnimationFrame(loop); } };
export const running = () => looping;
addEventListener('resize', () => {
  if (S.cur && S.cur.api && S.cur.api.resize) S.cur.api.resize();
  if (S.world && S.slab) S.world.setRect(slabRect());
});

/* ================================================================ the Atlas: start it (or the cards, where there is no WebGL) */
let worldP = null;
function startWorld() {
  if (worldP) return worldP;
  if (Q.has('nogl')) { HTML.classList.add('nogl'); return (worldP = Promise.resolve(null)); }
  return (worldP = import('./atlas/world.js').then(m => {
    const w = m.createWorld(WORLDH, $('#labels'));
    if (!w) { HTML.classList.add('nogl'); return null; }
    S.world = w; HTML.classList.add('gl');
    w.onPick = st => nav('#/c/' + CAT[st].c);
    w.onFocus = homeFocus;
    w.onHover = homeHover;
    const r = S.r;
    if (r) {
      const st = stOf(r);
      if (r.v === 'home') w.home({instant: true});
      else if (S.cur && S.cur.v.cam === 'enter') w.enter(st, slabRect(), {instant: true});
      else if (S.cur && S.cur.v.cam === 'product') w.product(st, slabRect(), {instant: true});
    }
    return w.warm().then(() => w);
  }).catch(e => { console.warn('[pr6] the Atlas is unavailable; the cards stand in', e); HTML.classList.add('nogl'); return null; }));
}
document.addEventListener('visibilitychange', () => { if (S.world) S.world.setVisible(!document.hidden); });

/* ================================================================ boot: a member, straight in */
function common() {
  S.member = true;
  buildChrome(); buildHome(); hooks(); Disc.init(); startLoop();
  STAGE.hidden = false;
  setTimeout(() => CAT.forEach(co => preload(co.it[0])), 2500);
}
export async function boot() {
  await Renders.ready;
  common();
  BAR.hidden = false; HOME.hidden = false;
  const r = parse(location.hash);
  if (r.v === 'exit') { store.del('pr6.v8.member'); location.reload(); return; }
  await Promise.race([startWorld(), new Promise(res => setTimeout(res, 4000))]);
  await transition(r, {instant: true, noFocus: true});
  arrive();
  addEventListener('hashchange', route);
  HTML.classList.add('ready');
}
function arrive() {
  requestAnimationFrame(() => {
    S.entered = true;
    if (S.world && S.r && S.r.v === 'home') S.world.intro();
    if (S.cur) { S.cur.el.classList.add('in'); reveal(S.cur.el); }
    if (S.r && S.r.v === 'home') homeOn(S.tok);
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
    BAR.hidden = false; HOME.hidden = false;
    await transition({v: 'home'}, {instant: true, noFocus: true});
    if (splash && !RM) { const o = +getComputedStyle(splash).opacity; if (o < .95) { splash.style.animation = 'none'; splash.style.transition = 'opacity .3s ease, filter .3s ease'; splash.style.opacity = o; void splash.offsetWidth; splash.style.opacity = 1; splash.style.filter = 'none'; } setTimeout(() => { dropSplash(); setTimeout(arrive, 120); }, o < .95 ? 650 : 350); }
    else { dropSplash(); arrive(); }
    addEventListener('hashchange', route);
    HTML.classList.add('ready');
  }
};

/* ================================================================ test hooks */
function hooks() {
  window.PR6V8 = {
    state: () => ({
      route: S.r, hash: location.hash, member: S.member, view: HTML.dataset.view || null, screen: S.cur ? S.cur.v.key : null,
      slab: S.slab, rm: RM, phone: isPhone(), entered: S.entered, ghost: !GH.hidden, home: S.r && S.r.v === 'home' ? {focus: S.world ? S.world.focus : S.st} : null,
      protocol: {open: Protocol.isOpen, count: Protocol.size(), lines: Protocol.lines(), total: Protocol.total()},
      disc: Disc.state(), world: S.world ? S.world.state() : null, gl: !!S.world,
      renders: Renders.status(), search: !SEARCH.hidden, sheet: !SHEET.hidden
    }),
    go: h => { nav(h); },
    focus: i => S.world && S.world.focusTo(i),
    protocol: Protocol, disc: Disc,
    get world() { return S.world; }
  };
}

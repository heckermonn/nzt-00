/* PR6 v12 · "Raking Light": the member bundle. Owns the chrome (a thin bar on a desktop; on a phone a top line that
   says where you are and is the Back control, a bottom thumb bar, and the More sheet listing every section), the
   router (route changes are a same-document View Transition where the browser has it, a short crossfade otherwise;
   a tapped pack's frame becomes the next page's picture), the gate hand-off (black, then the store's first light), the
   flight of a pack into Protocol, and the test hooks (window.PR6V12). Loaded only after the gate has been opened (or
   straight away for a member). */
import {CAT, byId} from './catalog.js';
import {$, $$, esc, store, RM, clamp, ic, isPhone} from './util.js';
import {Protocol} from './protocol.js';
import {makeView, MPAGES} from './views.js';
import {LIGHT, onScroll as lightScroll, kick, instances, setDark, liveCount} from './light.js';
import * as SH from './shots.js';

const HTML = document.documentElement;
const BAR = $('#bar'), TOP = $('#top'), THUMB = $('#thumb'), PAGE = $('#page'), FLY = $('#fly'), SHEET = $('#sheet');
const S = {r: null, cur: null, member: false, tok: 0, hist: [], focusSearch: false, vt: null, fromGate: false};
history.scrollRestoration = 'manual';
const VT = typeof document.startViewTransition === 'function' && !RM;

/* ================================================================ routes */
function parse(h) {
  const s = (h || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!s.length) return {v: 'home'};
  if (s[0] === 'formulary') return {v: 'formulary'};
  if (s[0] === 'index' || s[0] === 'dossier') return {v: 'index'};
  if (s[0] === 'c' && s[1]) return {v: 'col', c: s[1]};
  if (s[0] === 'p' && s[1]) return {v: 'product', id: s[1]};
  if (s[0] === 'club') return {v: 'club', sub: s[1] || ''};
  if (s[0] === 'm' && s[1]) return {v: 'member', page: s[1]};
  if (s[0] === 'search') return {v: 'search'};
  if (s[0] === 'credits') return {v: 'credits'};
  if (s[0] === 'protocol') return {v: 'home', drawer: true};
  if (s[0] === 'exit') return {v: 'exit'};
  return {v: 'nf'};
}
const navKey = r => r.v === 'formulary' || r.v === 'col' || r.v === 'product' || r.v === 'index' ? 'formulary' : r.v === 'club' ? 'club' : r.v === 'search' ? 'search' : r.v === 'member' ? (r.page === 'notes' ? 'notes' : 'member') : '';
const cleanURL = () => { const q = new URLSearchParams(location.search); q.delete('key'); q.delete('gate'); const s = q.toString(); return location.pathname + (s ? '?' + s : ''); };
const nav = h => { location.hash = h; };

/* ================================================================ the chrome */
const SECTIONS = [['The Formulary', '#/formulary'], ['Your Protocol', '#/protocol'], ['Dispatches', '#/m/dispatches'], ['Nominations', '#/m/nominations'], ['Member Record', '#/m/record'], ['Your Cabinet', '#/m/cabinet'],
  ['The Dossier', '#/index'], ['Field Notes', '#/m/notes'], ['New Entries', '#/m/new'], ['Member Liaison', '#/m/liaison'], ['Your Key', '#/m/key'], ['Field Club', '#/club']];
function buildChrome() {
  BAR.className = 'bar';
  BAR.innerHTML = `<div class="bar-in">
    <a class="b-mark wm" href="#/" aria-label="PR6, home">PR6</a>
    <nav class="b-nav" aria-label="Main">
      <a href="#/formulary" data-nav="formulary">Formulary</a>
      <a href="#/club" data-nav="club">Field Club</a>
      <a href="#/m/notes" data-nav="notes">Field Notes</a>
      <span class="b-mem"><button type="button" id="bMem" data-nav="member" aria-expanded="false" aria-controls="memMenu">Member</button>
        <span class="menu" id="memMenu" hidden>${MPAGES.filter(m => m[0] !== 'notes').map(([k, n]) => `<a href="#/m/${k}">${esc(n)}</a>`).join('')}<a href="#/exit" class="m-x">Exit this device</a></span></span>
    </nav>
    <div class="b-tools">
      <a href="#/search" class="b-t" data-nav="search">Search</a>
      <button type="button" id="bPro" class="b-t b-pro" data-pro data-cnt-wrap>Protocol <span class="cnt mono" data-cnt aria-hidden="true">0</span></button>
    </div>
  </div>`;
  TOP.className = 'tl';
  TOP.innerHTML = `<button type="button" class="tl-b" id="tlB"><span class="tl-ar">${ic('back')}</span><span class="tl-wm wm">PR6</span><span class="tl-x" data-tl></span></button>`;
  THUMB.className = 'tb';
  THUMB.innerHTML = `<a href="#/formulary" class="tb-i" data-nav="formulary" id="tbF">${ic('stack')}<span>Formulary</span></a>
    <a href="#/search" class="tb-i" data-nav="search">${ic('search')}<span>Search</span></a>
    <a href="#/club" class="tb-i" data-nav="club">${ic('club')}<span>Field Club</span></a>
    <button type="button" class="tb-i tb-pro" data-pro data-cnt-wrap><span class="tb-n mono" data-cnt aria-hidden="true">0</span><span>Protocol</span></button>
    <button type="button" class="tb-i" id="tbMore" aria-expanded="false" aria-controls="sheet">${ic('more')}<span>More</span></button>`;

  const bMem = $('#bMem'), menu = $('#memMenu');
  bMem.addEventListener('click', e => { e.stopPropagation(); const on = menu.hidden; closeMenus(); menu.hidden = !on; bMem.setAttribute('aria-expanded', on); if (on) $('a', menu).focus(); });
  $$('[data-pro]').forEach(b => b.addEventListener('click', () => { closeMenus(); closeSheet(false); Protocol.isOpen ? Protocol.close() : Protocol.open(); }));
  $('#tbMore').addEventListener('click', () => SHEET.hidden ? openSheet() : closeSheet());
  $('#tlB').addEventListener('click', back);
  $$('[href="#/search"]').forEach(a => a.addEventListener('click', () => { S.focusSearch = true; }));
  const tbF = $('#tbF'); let lp = 0, lpFired = false;
  tbF.addEventListener('pointerdown', () => { lpFired = false; clearTimeout(lp); lp = setTimeout(() => { lpFired = true; openSheet(); }, 520); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => tbF.addEventListener(t, () => clearTimeout(lp)));
  tbF.addEventListener('click', e => { if (lpFired) { e.preventDefault(); lpFired = false; } });
  tbF.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('click', e => { if (!e.target.closest('.b-mem')) closeMenus(); });
  menu.addEventListener('click', e => { if (e.target.closest('a')) closeMenus(); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!menu.hidden) { closeMenus(); bMem.focus(); return; } if (!SHEET.hidden) { closeSheet(); return; } if (Protocol.isOpen) return; }
    if (e.key === '/' && S.member && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !Protocol.isOpen) { e.preventDefault(); S.focusSearch = true; nav('#/search'); return; }
  });
  PAGE.addEventListener('scroll', onScroll, {passive: true});
  Protocol.count();
}
let scrollRaf = 0;
function onScroll() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    const y = PAGE.scrollTop, v = S.cur && S.cur.v.key;
    const lim = v === 'home' || v === 'col' ? innerHeight * .78 : v === 'product' ? innerHeight * .9 : 12;
    const solid = y > lim;
    BAR.classList.toggle('solid', solid); TOP.classList.toggle('solid', solid);
    /* the night band under the chrome */
    const night = PAGE.querySelector('.night');
    if (night) { const r = night.getBoundingClientRect(), dk = r.top < 40 && r.bottom > 40; TOP.classList.toggle('dark', dk); BAR.classList.toggle('dark', dk); }
    lightScroll();
  });
}
function closeMenus() { const m = $('#memMenu'); if (m && !m.hidden) { m.hidden = true; $('#bMem').setAttribute('aria-expanded', 'false'); } }
function setCrumb(r, v) {
  const c = v && v.crumb;
  TOP.classList.toggle('home', !c);
  $('[data-tl]', TOP).innerHTML = c ? `<i aria-hidden="true">/</i> ${esc(c.label)}` : '';
  const b = $('#tlB');
  if (c) { const parent = S.hist.length > 1 ? 'the previous page' : c.back === '#/' ? 'the start' : (c.back.startsWith('#/c/') ? CAT.find(x => '#/c/' + x.c === c.back).n : c.back === '#/formulary' ? 'The Formulary' : 'the start'); b.setAttribute('aria-label', `PR6, ${c.label}. Back to ${parent}`); }
  else b.setAttribute('aria-label', 'PR6, home. Back to the top');
  S.crumb = c;
}
function back() {
  if (!S.crumb) { PAGE.scrollTo({top: 0, behavior: RM ? 'auto' : 'smooth'}); return; }
  if (S.hist.length > 1) history.back(); else nav(S.crumb.back);
}

/* ================================================================ the More sheet */
let shBack = null;
function openSheet() {
  if (!SHEET.hidden) return;
  shBack = document.activeElement; closeMenus(); if (Protocol.isOpen) Protocol.close(false);
  SHEET.innerHTML = `<div class="sh-in">
    <div class="sh-top"><h2 id="shH" class="sh-t">Sections</h2><button type="button" class="sh-x" data-shx>Close</button></div>
    <nav aria-label="Every section">
      <ol class="sh-main"><li><a href="${SECTIONS[0][1]}">${esc(SECTIONS[0][0])}</a></li></ol>
      <ol class="sh-cols" aria-label="Collections">${CAT.map(co => `<li><a href="#/c/${co.c}"><span class="mono">${co.c}</span> ${esc(co.n)}</a></li>`).join('')}</ol>
      <ol class="sh-main sh-2">${SECTIONS.slice(1).map(([n, h]) => `<li><a href="${h}">${esc(n)}</a></li>`).join('')}</ol>
      <ol class="sh-more"><li><a href="#/search">Search</a></li><li><a href="#/credits">Credits</a></li><li><a href="#/exit">Exit this device</a></li></ol>
    </nav></div>`;
  SHEET.hidden = false; $('#scrim').hidden = false; HTML.classList.add('sh-open'); $('#tbMore').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => requestAnimationFrame(() => { SHEET.classList.add('on'); $('#scrim').classList.add('on'); }));
  $('[data-shx]', SHEET).onclick = () => closeSheet();
  SHEET.onclick = e => { const a = e.target.closest('a'); if (!a) return; if (a.getAttribute('href') === '#/protocol') { e.preventDefault(); closeSheet(false); Protocol.open(); return; } closeSheet(false); };
  SHEET.onkeydown = e => {
    if (e.key !== 'Tab') return; const f = $$('button,a[href]', SHEET).filter(x => x.offsetParent); if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  };
  setTimeout(() => $('a', SHEET).focus({preventScroll: true}), 80);
}
function closeSheet(restore = true) {
  if (SHEET.hidden) return; SHEET.classList.remove('on'); HTML.classList.remove('sh-open'); $('#tbMore').setAttribute('aria-expanded', 'false');
  if (!Protocol.isOpen) $('#scrim').classList.remove('on');
  setTimeout(() => { if (!SHEET.classList.contains('on')) { SHEET.hidden = true; if (!Protocol.isOpen) $('#scrim').hidden = true; } }, RM ? 0 : 420);
  if (restore && shBack && document.contains(shBack)) shBack.focus({preventScroll: true});
}
$('#scrim').addEventListener('click', () => closeSheet());

/* ================================================================ the view transition's shared frame
   markVT(el): the element on this page that becomes the next page's picture (named "pack" for the transition). From
   the lineup (one canvas, nine packs), a still of that pack's slice of the live picture is laid over it first, so
   the frame that travels carries the light as it is. */
function markVT(el) { if (!VT || !el) return; $$('[style*="view-transition-name"]', PAGE).forEach(x => { if (x !== el) x.style.viewTransitionName = ''; }); el.style.viewTransitionName = 'pack'; S.vt = el; }
function toCollection(c, k, lu) {
  if (VT && lu && lu.frame) {
    const f = lu.frame(k);
    if (f) {
      const snap = lu.inst && lu.inst.snapshot(f.u0, 0, f.u1 - f.u0, 1);
      const g = document.createElement('div'); g.className = 'vt-ghost';
      Object.assign(g.style, {left: (f.r.left + f.r.width * f.u0) + 'px', top: f.r.top + 'px', width: (f.r.width * (f.u1 - f.u0)) + 'px', height: f.r.height + 'px'});
      if (snap) { snap.className = 'vt-snap'; g.appendChild(snap); }
      document.body.appendChild(g); markVT(g);
      setTimeout(() => g.remove(), 1200);
    }
  }
  nav('#/c/' + c);
}

/* ================================================================ #page: mounting a page */
const ctx = {addFly, toCollection, markVT, fromGate: false, onDawn: null};
function mount(r, o = {}) {
  const vt = !!(o.vt);
  const v = makeView(r, {vt});
  const old = S.cur;
  if (old && old.api && old.api.destroy) old.api.destroy();
  HTML.dataset.view = v.key; HTML.dataset.tone = v.tone || 'light';
  PAGE.className = v.cls;
  PAGE.innerHTML = `<div class="pg">${v.html}</div>`;
  PAGE.scrollTop = 0;
  S.cur = {r, v, el: PAGE.firstElementChild, api: null, hash: location.hash};
  S.cur.api = v.init(S.cur.el, ctx, r) || {};
  setCrumb(r, v); onScroll();
  document.title = v.title;
  /* the shared frame is named only for the length of the transition */
  if (vt) setTimeout(() => $$('[style*="view-transition-name"]', PAGE).forEach(x => { x.style.viewTransitionName = ''; }), 900);
  return S.cur;
}
function focusTitle(my, delay) {
  setTimeout(() => {
    if (my !== S.tok || Protocol.isOpen || !SHEET.hidden) return;
    if (S.focusSearch && S.cur && S.cur.api.focus) { S.focusSearch = false; S.cur.api.focus(); return; }
    const h = $('h1', PAGE); if (h) h.focus({preventScroll: true});
  }, delay);
}

/* ================================================================ the router */
const wait = ms => new Promise(r => setTimeout(r, RM ? Math.min(ms, 60) : ms));
async function transition(r, o = {}) {
  const my = ++S.tok;
  if (r.v === 'exit') { store.del('pr6.v12.member'); location.reload(); return; }
  closeMenus(); closeSheet(false); if (Protocol.isOpen && !r.drawer) Protocol.close(false);
  S.r = r;
  setNav(r);
  const shared = !!(S.vt && document.contains(S.vt) && (r.v === 'col' || r.v === 'product'));
  const oldVT = S.vt; S.vt = null;
  /* the old page's frame gives its name up as the new page mounts (a ghost over the lineup lives outside #page) */
  const release = () => { if (!oldVT) return; oldVT.style.viewTransitionName = ''; if (oldVT.classList.contains('vt-ghost')) oldVT.remove(); };
  if (o.instant || PAGE.hidden) { PAGE.hidden = false; mount(r); }
  else if (VT) {
    HTML.classList.toggle('vt-pack', shared);
    try {
      const t = document.startViewTransition(() => { release(); if (my === S.tok) mount(r, {vt: shared}); });
      await t.finished.catch(() => {});
    } catch (e) { mount(r); }
    HTML.classList.remove('vt-pack');
  } else {
    PAGE.classList.add('swap'); await wait(140); if (my !== S.tok) return;
    mount(r); requestAnimationFrame(() => PAGE.classList.remove('swap'));
  }
  focusTitle(my, o.instant ? 0 : 60);
  if (r.drawer) setTimeout(() => Protocol.open(), o.instant ? 0 : 250);
}
function setNav(r) {
  const k = navKey(r);
  $$('[data-nav]').forEach(a => { const on = a.dataset.nav === k; a.classList.toggle('on', on); if (a.tagName === 'A') { if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); } });
}
function route() {
  const h = location.hash || '#/';
  if (S.hist.length > 1 && S.hist[S.hist.length - 2] === h) S.hist.pop(); else if (S.hist[S.hist.length - 1] !== h) S.hist.push(h);
  const r = parse(h);
  if (S.cur && S.cur.hash === location.hash) return;
  transition(r);
}

/* ================================================================ Add to Protocol: the pack, in the light it is in now,
   lifts off the disc and arcs into Protocol (n) */
function addFly(id, srcEl, inst) {
  const p = byId(id); if (!p) return;
  const pill = $$('[data-pro]').find(b => b.offsetParent); if (!pill) return;
  const pr = pill.getBoundingClientRect();
  let r = null, img = null;
  if (inst && inst.host && document.contains(inst.host)) {
    const b = inst.host.getBoundingClientRect();
    if (b.bottom > 0 && b.top < innerHeight) { r = {x: b.left + b.width * .2, y: b.top + b.height * .12, w: b.width * .6, h: b.height * .76}; img = inst.snapshot(.2, .12, .6, .76); }
  }
  if (!r && srcEl) { const b = (srcEl.closest('li,.buy,.pn-act') || srcEl).getBoundingClientRect(); r = {x: b.left + b.width / 2 - 40, y: b.top + b.height / 2 - 50, w: 80, h: 100}; }
  if (!r) return;
  if (RM) { Protocol.hold(0); bump(); return; }
  const DUR = 900;
  Protocol.hold(DUR - 60);
  const g = document.createElement('div'); g.className = 'fly-pk';
  if (img) { img.className = 'fly-im'; g.appendChild(img); } else g.innerHTML = `<img class="fly-im" src="${esc(SH.posterFor(SH.packOf(p)))}" alt="">`;
  Object.assign(g.style, {left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px'});
  FLY.appendChild(g);
  const cx0 = r.x + r.w / 2, cy0 = r.y + r.h / 2, cx1 = pr.left + pr.width / 2, cy1 = pr.top + pr.height / 2;
  const sc1 = Math.max(.06, 28 / r.h);
  const mx = cx0 + (cx1 - cx0) * .45, my = Math.min(cy0, cy1) - Math.max(60, Math.abs(cx1 - cx0) * .16);
  const K = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const x = (1 - e) * (1 - e) * cx0 + 2 * (1 - e) * e * mx + e * e * cx1, y = (1 - e) * (1 - e) * cy0 + 2 * (1 - e) * e * my + e * e * cy1;
    const s = 1 + (sc1 - 1) * e;
    K.push({transform: `translate(${(x - cx0).toFixed(1)}px, ${(y - cy0).toFixed(1)}px) scale(${s.toFixed(3)})`, opacity: t > .88 ? 1 - (t - .88) * 8 : 1, offset: t});
  }
  const an = g.animate(K, {duration: DUR, easing: 'linear', fill: 'forwards'});
  an.onfinish = () => { g.remove(); bump(); };
}
function bump() { $$('[data-pro]').forEach(b => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); setTimeout(() => b.classList.remove('bump'), 700); }); }

/* ================================================================ boot */
let started = false;
export const running = () => started;
function common() { S.member = true; started = true; buildChrome(); hooks(); }
const showChrome = () => { BAR.hidden = false; TOP.hidden = false; THUMB.hidden = false; };
/* the posters of the five format renders are fetched early, so a view transition never lands on an empty frame */
function warm() { SH.PACKS.forEach(k => { const u = SH.posterFor(k); if (u) { const i = new Image(); i.decoding = 'async'; i.src = u; } }); }
export async function boot() {
  await SH.ready;
  common(); showChrome(); warm();
  const r = parse(location.hash);
  if (r.v === 'exit') { store.del('pr6.v12.member'); location.reload(); return; }
  S.hist = [location.hash || '#/'];
  await transition(r, {instant: true});
  addEventListener('hashchange', route);
  HTML.classList.add('ready');
}
/* a guest who has just opened the gate: everything loads behind the night, then the gate lets go onto black and the
   home page's first light comes up (views.js home(): the dawn) */
let FG = null;
export function fromGate() {
  return FG || (FG = (async () => {
    await SH.ready;
    /* fetch the tin's passes while the gate is still turning its light out */
    const hs = SH.heroFor('tin');
    if (hs && hs.passes) await Promise.race([Promise.all(Object.values(hs.passes).map(u => typeof u === 'string' ? fetch(u).catch(() => {}) : null)), new Promise(r => setTimeout(r, 2600))]);
    common(); return enter;
  })());
}
let entered = false;
const enter = {
  prepare() {},
  async go() {
    if (entered) return; entered = true;
    HTML.classList.remove('out'); HTML.classList.add('in', 'dawning');
    history.replaceState(null, '', cleanURL() + '#/');
    setDark();
    ctx.fromGate = true;
    ctx.onDawn = () => { HTML.classList.remove('dawning'); ctx.onDawn = null; };
    showChrome();
    S.hist = ['#/'];
    await transition({v: 'home'}, {instant: true});
    ctx.fromGate = false;
    addEventListener('hashchange', route);
    HTML.classList.add('ready');
    setTimeout(() => HTML.classList.remove('dawning'), 4000);
  }
};

/* ================================================================ test hooks */
function hooks() {
  window.PR6V12 = {
    state: () => ({
      route: S.r, hash: location.hash, member: S.member, view: HTML.dataset.view || null, tone: HTML.dataset.tone || null,
      crumb: S.crumb ? S.crumb.label : null, hist: S.hist.slice(),
      protocol: {open: Protocol.isOpen, count: Protocol.size(), lines: Protocol.lines(), total: Protocol.total()},
      light: LIGHT.state(), pictures: instances().map(i => i.state()), live: liveCount(), shots: SH.status(), sheet: !SHEET.hidden, rm: RM, phone: isPhone(), vt: VT,
      lineup: S.cur && S.cur.api && S.cur.api.lineup ? S.cur.api.lineup.index : null
    }),
    go: h => nav(h), back, openSheet, closeSheet,
    lineup: k => S.cur && S.cur.api && S.cur.api.lineup && S.cur.api.lineup.go(k),
    protocol: Protocol, light: LIGHT, kick
  };
}

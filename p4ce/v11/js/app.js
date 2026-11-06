/* PR6 v11 · "The Practice, Observed": the member bundle. Owns the chrome (a thin bar on a desktop; on a phone a top line
   that says where you are and is the Back control, a bottom thumb bar in Ink, and the More sheet listing every section),
   the router, the Atlas (the v9 film, at #/atlas), the flight of a pack into Protocol, and the test hooks (window.PR6V11).
   Loaded only after the gate has been opened (or straight away for a member). */
import {CAT, byId} from './catalog.js';
import {$, $$, esc, store, RM, CLOCK, stepTweens, clamp, ic, isPhone} from './util.js';
import {Renders, packHTML, ensureDefs} from './renders.js';
import {Protocol} from './protocol.js';
import {makeView, MPAGES, colData} from './views.js';
import {Disc} from './disc.js';
import {loadManifest, createFilm} from './film.js';
import {IMG} from './img.js';

const HTML = document.documentElement;
const BAR = $('#bar'), TOP = $('#top'), THUMB = $('#thumb'), ATLAS = $('#atlas'), PAGE = $('#page'), FLY = $('#fly'), SHEET = $('#sheet'), TYPE = $('#filmType'), MARKS = $('#marks');
const S = {r: null, cur: null, member: false, tok: 0, film: null, M: null, hist: [], focusSearch: false};
history.scrollRestoration = 'manual';

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
  if (s[0] === 'atlas') return {v: 'atlas'};
  if (s[0] === 'protocol') return {v: 'home', drawer: true};
  if (s[0] === 'exit') return {v: 'exit'};
  return {v: 'nf'};
}
const navKey = r => r.v === 'formulary' || r.v === 'col' || r.v === 'product' || r.v === 'index' || r.v === 'atlas' ? 'formulary' : r.v === 'club' ? 'club' : r.v === 'search' ? 'search' : r.v === 'member' ? (r.page === 'notes' ? 'notes' : 'member') : '';
const cleanURL = () => { const q = new URLSearchParams(location.search); q.delete('key'); q.delete('gate'); const s = q.toString(); return location.pathname + (s ? '?' + s : ''); };
let linked = false;
const nav = h => { linked = true; location.hash = h; linked = false; };

/* ================================================================ the chrome */
/* every section name from DESIGN.md, for the More sheet */
const SECTIONS = [['The Formulary', '#/formulary'], ['Your Protocol', '#/protocol'], ['Dispatches', '#/m/dispatches'], ['Nominations', '#/m/nominations'], ['Member Record', '#/m/record'], ['Your Cabinet', '#/m/cabinet'],
  ['The Dossier', '#/index'], ['Field Notes', '#/m/notes'], ['New Entries', '#/m/new'], ['Member Liaison', '#/m/liaison'], ['Your Key', '#/m/key'], ['Field Club', '#/club']];
function buildChrome() {
  ensureDefs();
  /* desktop: the wordmark and plain links; Search and Protocol (n) on the right */
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
  /* phone: the top line (where you are, and Back) */
  TOP.className = 'tl';
  TOP.innerHTML = `<button type="button" class="tl-b" id="tlB"><span class="tl-ar">${ic('back')}</span><span class="tl-wm wm">PR6</span><span class="tl-x" data-tl></span></button>`;
  /* phone: the thumb bar */
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
  /* a long press on Formulary also opens the sheet */
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
    if (Protocol.isOpen || !SHEET.hidden) return;
    if (S.r && S.r.v === 'atlas') atlasKey(e);
    else if (S.cur && S.cur.api && S.cur.api.keydown) S.cur.api.keydown(e);
  });
  PAGE.addEventListener('scroll', onScroll, {passive: true});
  Protocol.count();
}
function onScroll() {
  const y = PAGE.scrollTop, lim = S.cur && S.cur.v.key === 'home' ? innerHeight * .8 : S.cur && /col|member|club|search|credits|index|nf/.test(S.cur.v.key) ? innerHeight * .5 : 12;
  const solid = y > lim;
  BAR.classList.toggle('solid', solid); TOP.classList.toggle('solid', solid);
}
function closeMenus() { const m = $('#memMenu'); if (m && !m.hidden) { m.hidden = true; $('#bMem').setAttribute('aria-expanded', 'false'); } }
/* the top line: "PR6 / 04 Endure". It is the Back control: back through this visit, or up to the parent page */
function setCrumb(r, v) {
  const c = r.v === 'atlas' ? {label: 'The Atlas', back: '#/formulary'} : v && v.crumb;
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

/* ================================================================ the More sheet: every section, large and plain */
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
      <ol class="sh-more"><li><a href="#/atlas">The Atlas</a></li><li><a href="#/search">Search</a></li><li><a href="#/credits">Credits</a></li><li><a href="#/exit">Exit this device</a></li></ol>
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

/* ================================================================ the Atlas: the v9 film, kept reachable */
function buildFilmUI() {
  TYPE.innerHTML = `<div class="ft" data-ft>
      <h1 class="ft-n" tabindex="-1" data-ft-n></h1>
      <p class="ft-d" data-ft-d></p>
      <div class="ft-r"><p class="ft-m mono" data-ft-m></p><a class="btn ft-go" href="#/c/01" data-ft-go><span class="pl">ENTER</span><span class="arr" aria-hidden="true">&rarr;</span></a></div>
    </div>`;
  const F = S.M ? S.M.stations.map(s => s.frame) : CAT.map((c, i) => i), n = F.length;
  const a = F[0], b = F[n - 1] || 1;
  S.markX = f => b > a ? (f - a) / (b - a) : 0;
  MARKS.innerHTML = `<div class="mk-track" aria-hidden="true"><i class="mk-head"></i></div>
    ${F.map((f, k) => { const co = stCol(k); return `<button type="button" class="mk" data-mk="${k}" style="--x:${(S.markX(f) * 100).toFixed(2)}%" aria-label="${esc(co.n)}"><i></i><span class="mk-l">${esc(co.n)}</span></button>`; }).join('')}`;
  $$('[data-mk]', MARKS).forEach(btn => btn.addEventListener('click', () => { if (S.film) S.film.go(+btn.dataset.mk); }));
}
const stCode = k => S.M ? S.M.stations[k].code : CAT[k].c;
const stCol = k => CAT.find(c => c.c === stCode(k)) || CAT[clamp(k, 0, 8)];
function setType(k) {
  const co = stCol(k);
  $('[data-ft-n]', TYPE).textContent = co.n;
  $('[data-ft-d]', TYPE).textContent = co.d + '.';
  $('[data-ft-m]', TYPE).innerHTML = `${co.c} <span class="dot" aria-hidden="true">·</span> ${colData(co)}`;
  const go = $('[data-ft-go]', TYPE); go.setAttribute('href', '#/c/' + co.c); go.setAttribute('aria-label', 'Enter ' + co.n);
  $$('[data-mk]', MARKS).forEach(b => { const on = +b.dataset.mk === k; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  if (S.r && S.r.v === 'atlas') document.title = `PR6 · The Atlas · ${co.n}`;
}
function atlasKey(e) {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || !S.film) return;
  if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key)) { e.preventDefault(); S.film.step(1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); S.film.step(-1); }
  else if (e.key === 'Enter' && !e.target.closest('a,button')) { e.preventDefault(); nav('#/c/' + stCol(S.film.station).c); }
}
let filmP = null;
function startFilm() {
  if (filmP) return filmP;
  const stub = () => { let st = 0; const go = i => { st = clamp(i, 0, 8); setType(st); }; return {get station() { return st; }, set input(v) {}, at: go, go, step: d => go(st + d), frame() {}, intro() {}, state: () => ({station: st, stub: true})}; };
  return (filmP = loadManifest().then(M => {
    S.M = M; buildFilmUI();
    if (!M) { HTML.classList.add('no-film'); S.film = stub(); setType(0); return S.film; }
    S.film = createFilm(M, {
      canvas: $('#filmCv'), host: ATLAS,
      onMove(on) { HTML.classList.toggle('scrub', on); },
      onSettle(k) { setType(k); HTML.classList.remove('scrub'); },
      onTap(k) { if (S.r && S.r.v === 'atlas') nav('#/c/' + stCol(k).c); }
    });
    setType(0);
    return S.film;
  }).catch(e => { console.warn('[pr6] the Atlas is unavailable', e); HTML.classList.add('no-film'); S.film = stub(); setType(0); return S.film; }));
}

/* ================================================================ #page: mounting a page */
const ctx = {addFly};
function mount(r) {
  const v = makeView(r);
  const old = S.cur;
  if (old && old.api && old.api.destroy) old.api.destroy();
  HTML.dataset.view = v.key; HTML.dataset.tone = v.tone || 'light';
  PAGE.className = v.cls;
  PAGE.innerHTML = `<div class="pg">${v.html}</div>`;
  PAGE.scrollTop = 0;
  S.cur = {r, v, el: PAGE.firstElementChild, api: null, hash: location.hash};
  S.cur.api = v.init(S.cur.el, ctx, r) || {};
  IMG.watch(PAGE);
  /* a page that opens on a dark picture: the chrome turns Chalk over it until the page is scrolled */
  const ih = PAGE.querySelector('.ih'); HTML.classList.toggle('hd-dk', !!ih && ih.classList.contains('dk') && ih.getBoundingClientRect().top < 2);
  setCrumb(r, v); onScroll();
  document.title = v.title;
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
  if (r.v === 'exit') { store.del('pr6.v11.member'); location.reload(); return; }
  closeMenus(); closeSheet(false); if (Protocol.isOpen && !r.drawer) Protocol.close(false);
  S.r = r;
  setNav(r);
  if (r.v === 'atlas') { await toAtlas(my); return; }
  const fromAtlas = !ATLAS.hidden;
  if (!o.instant && !RM && !PAGE.hidden && !fromAtlas) { PAGE.classList.add('swap'); await wait(150); if (my !== S.tok) return; }
  if (S.film) S.film.input = false;
  ATLAS.hidden = true; HTML.classList.remove('film-on');
  PAGE.hidden = false;
  mount(r);
  requestAnimationFrame(() => PAGE.classList.remove('swap'));
  focusTitle(my, o.instant ? 0 : 80);
  if (r.drawer) setTimeout(() => Protocol.open(), o.instant ? 0 : 250);
}
async function toAtlas(my) {
  if (S.cur && S.cur.api && S.cur.api.destroy) S.cur.api.destroy();
  S.cur = null;
  HTML.dataset.view = 'atlas'; HTML.dataset.tone = 'light'; HTML.classList.remove('hd-dk');
  setCrumb(S.r, null); TOP.classList.remove('solid'); BAR.classList.remove('solid');
  document.title = 'PR6 · The Atlas';
  await startFilm();
  if (my !== S.tok) return;
  PAGE.hidden = true; PAGE.innerHTML = '';
  ATLAS.hidden = false; HTML.classList.add('film-on');
  if (S.film) { S.film.input = true; if (!S.introPlayed) { S.introPlayed = true; S.film.intro(); } setType(S.film.station); }
  setTimeout(() => { if (my === S.tok) { const h = $('[data-ft-n]', TYPE); h && h.focus({preventScroll: true}); } }, 200);
}
function setNav(r) {
  const k = navKey(r);
  $$('[data-nav]').forEach(a => { const on = a.dataset.nav === k; a.classList.toggle('on', on); if (a.tagName === 'A') { if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); } });
}
function route() {
  const h = location.hash || '#/';
  /* this visit's trail, for the top line's Back */
  if (S.hist.length > 1 && S.hist[S.hist.length - 2] === h) S.hist.pop(); else if (S.hist[S.hist.length - 1] !== h) S.hist.push(h);
  const r = parse(h);
  if (r.v !== 'atlas' && S.cur && S.cur.hash === location.hash) return;
  transition(r);
}

/* ================================================================ Add to Protocol: the pack lifts off the disc and arcs into Protocol (n) */
function addFly(id, srcEl) {
  const p = byId(id); if (!p) return;
  const pill = $$('[data-pro]').find(b => b.offsetParent); if (!pill) return;
  const pr = pill.getBoundingClientRect();
  const onDisc = Disc.current() && Disc.current().id === id && S.cur && S.cur.v.key === 'product';
  let r = onDisc ? Disc.objectRect() : null;
  if (r && (r.y + r.h < 0 || r.y > innerHeight)) r = null;
  if (!r && srcEl) { const b = (srcEl.closest('li,.buy') || srcEl).getBoundingClientRect(); r = {x: b.left + b.width / 2 - 40, y: b.top + b.height / 2 - 50, w: 80, h: 100}; }
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
function bump() { $$('[data-pro]').forEach(b => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); setTimeout(() => b.classList.remove('bump'), 700); }); }

/* ================================================================ the loop */
let looping = false;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = CLOCK.tick(now);
  if (document.hidden) return;
  stepTweens();
  if (S.film && !ATLAS.hidden) {
    S.film.frame(dt);
    if (S.markX && S.M) MARKS.style.setProperty('--p', (clamp(S.markX(S.film.pos), 0, 1) * 100).toFixed(2) + '%');
  }
  Disc.frame(dt, CLOCK.now());
}
const startLoop = () => { if (!looping) { looping = true; requestAnimationFrame(loop); } };
export const running = () => looping;

/* ================================================================ boot */
function common() { S.member = true; buildChrome(); hooks(); startLoop(); }
const showChrome = () => { BAR.hidden = false; TOP.hidden = false; THUMB.hidden = false; };
export async function boot() {
  await Promise.all([Renders.ready, IMG.ready]);
  common(); showChrome();
  const r = parse(location.hash);
  if (r.v === 'exit') { store.del('pr6.v11.member'); location.reload(); return; }
  S.hist = [location.hash || '#/'];
  await transition(r, {instant: true});
  addEventListener('hashchange', route);
  HTML.classList.add('ready');
}
/* a guest who has just opened the gate: everything loads behind the gate's light, then the gate hands over */
let FG = null;
export function fromGate() {
  return FG || (FG = (async () => { showSplash(); await Promise.all([Renders.ready, IMG.ready]); common(); return enter; })());
}
let splash = null;
function showSplash() {
  if (splash) return;
  splash = document.createElement('div'); splash.id = 'splash'; splash.setAttribute('aria-hidden', 'true');
  splash.innerHTML = '<div class="sp-in"><span class="sp-wm">PR6</span><span class="sp-tag">The practice of progress</span></div>';
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
    showChrome();
    S.hist = ['#/'];
    await transition({v: 'home'}, {instant: true});
    if (splash && !RM) { const o = +getComputedStyle(splash).opacity; if (o < .95) { splash.style.animation = 'none'; splash.style.transition = 'opacity .3s ease'; splash.style.opacity = o; void splash.offsetWidth; splash.style.opacity = 1; } setTimeout(dropSplash, o < .95 ? 650 : 350); }
    else dropSplash();
    addEventListener('hashchange', route);
    HTML.classList.add('ready');
  }
};

/* ================================================================ test hooks */
function hooks() {
  window.PR6V11 = {
    state: () => ({
      route: S.r, hash: location.hash, member: S.member, view: HTML.dataset.view || null, tone: HTML.dataset.tone || null,
      crumb: S.crumb ? S.crumb.label : null, hist: S.hist.slice(),
      protocol: {open: Protocol.isOpen, count: Protocol.size(), lines: Protocol.lines(), total: Protocol.total()},
      disc: Disc.state(), renders: Renders.status(), img: IMG.status(), sheet: !SHEET.hidden, rm: RM, phone: isPhone(),
      lineup: S.cur && S.cur.api && S.cur.api.lineup ? S.cur.api.lineup.index : null,
      atlas: S.film ? S.film.state() : null
    }),
    go: h => nav(h), back, openSheet, closeSheet,
    lineup: k => S.cur && S.cur.api && S.cur.api.lineup && S.cur.api.lineup.go(k),
    protocol: Protocol, disc: Disc, img: IMG,
    get film() { return S.film; }
  };
}

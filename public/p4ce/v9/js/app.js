/* PR6 v9 · "The Film": the member bundle. After the gate the home is a film (js/film.js): one continuous path-traced
   camera move through a misty studio holding the nine stations, scrubbed by scroll, swipe, drag or the keys, easing to
   rest on a station. Over it, only quiet type: the wordmark, a thin nav, and the name of the collection it rests on.
   Enter (the frame, or the one pill) pushes into the frame and it becomes the collection page (#page). Every other page
   (the Dossier, the Index, Field Club, member pages) is a plain scrolling surface in #page.
   This file owns the chrome, the film's type and marks, the router and the push-in, search, the phone menu, the flight of
   a pack into Protocol, and the test hooks (window.PR6V9).
   Loaded only after the gate has been opened (or straight away for a member). */
import {ALL, CAT, byId} from './catalog.js';
import {$, $$, Q, esc, store, RM, CLOCK, stepTweens, clamp, ic, money, isPhone} from './util.js';
import {Renders, packHTML, ensureDefs} from './renders.js';
import {Protocol} from './protocol.js';
import {makeView, MPAGES, colData} from './views.js';
import {Disc} from './disc.js';
import {loadManifest, createFilm} from './film.js';

const HTML = document.documentElement;
const BAR = $('#bar'), FILM = $('#film'), PAGE = $('#page'), FLY = $('#fly'), SEARCH = $('#search'), SHEET = $('#sheet'), TYPE = $('#filmType'), MARKS = $('#marks');
const S = {r: null, cur: null, member: false, tok: 0, film: null, M: null, entered: false, intro: false, k: 0};
history.scrollRestoration = 'manual';

/* ================================================================ routes */
function parse(h) {
  const s = (h || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!s.length) return {v: 'home'};
  if (s[0] === 'index' || s[0] === 'formulary') return {v: 'index'};
  if (s[0] === 'c' && s[1]) return {v: 'col', c: s[1]};
  if (s[0] === 'p' && s[1]) return {v: 'product', id: s[1]};
  if (s[0] === 'club') return {v: 'club', sub: s[1] || ''};
  if (s[0] === 'm' && s[1]) return {v: 'member', page: s[1]};
  if (s[0] === 'protocol') return {v: 'home', drawer: true};
  if (s[0] === 'exit') return {v: 'exit'};
  return {v: 'nf'};
}
const navKey = r => r.v === 'index' ? 'index' : r.v === 'club' ? 'club' : r.v === 'member' ? (r.page === 'notes' ? 'notes' : 'member') : '';
const cleanURL = () => { const q = new URLSearchParams(location.search); q.delete('key'); q.delete('gate'); const s = q.toString(); return location.pathname + (s ? '?' + s : ''); };
/* the collection (index into CAT) a route belongs to */
const colIx = r => r.v === 'col' ? CAT.findIndex(c => c.c === r.c) : r.v === 'product' && byId(r.id) ? CAT.findIndex(c => c.c === byId(r.id).c) : -1;
/* film station k ⇄ collection */
const stCode = k => S.M ? S.M.stations[k].code : CAT[k].c;
const stCol = k => CAT.find(c => c.c === stCode(k)) || CAT[clamp(k, 0, 8)];
const colSt = ci => { if (ci < 0) return -1; const code = CAT[ci].c; if (!S.M) return ci; const k = S.M.stations.findIndex(s => s.code === code); return k; };

/* ================================================================ the chrome: a thin bar, flat, type only */
function buildChrome() {
  ensureDefs();
  BAR.className = 'bar';
  BAR.innerHTML = `<div class="bar-in">
    <a class="b-mark wm" href="#/" aria-label="PR6, back to the film">PR6</a>
    <nav class="b-nav" aria-label="Main">
      <a href="#/index" data-nav="index">Index</a>
      <a href="#/club" data-nav="club">Field Club</a>
      <a href="#/m/notes" data-nav="notes">Field Notes</a>
      <span class="b-mem"><button type="button" id="bMem" data-nav="member" aria-expanded="false" aria-controls="memMenu">Member</button>
        <span class="menu" id="memMenu" hidden>${MPAGES.filter(m => m[0] !== 'notes').map(([k, n]) => `<a href="#/m/${k}">${esc(n)}</a>`).join('')}<a href="#/exit" class="m-x">Exit this device</a></span></span>
    </nav>
    <div class="b-tools">
      <button type="button" id="bSearch" class="b-t" aria-expanded="false" aria-controls="search">Search</button>
      <button type="button" id="bPro" class="b-t b-pro" data-pro data-cnt-wrap>Protocol <span class="cnt mono" data-cnt aria-hidden="true">0</span></button>
      <button type="button" class="b-t b-menu" id="bMenu" aria-expanded="false" aria-controls="sheet">Menu</button>
    </div>
  </div>`;
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
  PAGE.addEventListener('scroll', () => BAR.classList.toggle('solid', PAGE.scrollTop > 12), {passive: true});
  Protocol.count();
}
function closeMenus() { const m = $('#memMenu'); if (m && !m.hidden) { m.hidden = true; $('#bMem').setAttribute('aria-expanded', 'false'); } }

/* ================================================================ the film's type and marks */
function buildFilmUI() {
  TYPE.innerHTML = `<div class="ft" data-ft>
      <h1 class="ft-n" tabindex="-1" data-ft-n></h1>
      <p class="ft-d" data-ft-d></p>
      <div class="ft-r"><p class="ft-m mono" data-ft-m></p><a class="pill ft-go" href="#/c/01" data-ft-go><span class="pl">ENTER</span><span class="arr" aria-hidden="true">&rarr;</span></a></div>
    </div>`;
  const n = S.M ? S.M.stations.length : CAT.length, F = S.M ? S.M.stations.map(s => s.frame) : CAT.map((c, i) => i);
  const a = F[0], b = F[n - 1] || 1;
  S.markX = f => b > a ? (f - a) / (b - a) : 0;
  MARKS.innerHTML = `<div class="mk-track" aria-hidden="true"><i class="mk-head"></i></div>
    ${F.map((f, k) => { const co = stCol(k); return `<button type="button" class="mk" data-mk="${k}" style="--x:${(S.markX(f) * 100).toFixed(2)}%" aria-label="${esc(co.n)}"><i></i><span class="mk-l">${esc(co.n)}</span></button>`; }).join('')}`;
  $$('[data-mk]', MARKS).forEach(btn => btn.addEventListener('click', () => { if (S.film) S.film.go(+btn.dataset.mk); }));
}
function setType(k) {
  const co = stCol(k); S.k = k;
  $('[data-ft-n]', TYPE).textContent = co.n;
  $('[data-ft-d]', TYPE).textContent = co.d + '.';
  $('[data-ft-m]', TYPE).innerHTML = colData(co);
  const go = $('[data-ft-go]', TYPE); go.setAttribute('href', '#/c/' + co.c); go.setAttribute('aria-label', 'Enter ' + co.n);
  $$('[data-mk]', MARKS).forEach(b => { const on = +b.dataset.mk === k; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  if (S.r && S.r.v === 'home') document.title = `PR6 · ${co.n}`;
}
function homeKey(e) {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || !S.film) return;
  const f = document.activeElement === document.body || FILM.contains(document.activeElement) || document.activeElement === PAGE;
  if (!f) return;
  if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && !e.target.closest('a,button'))) { e.preventDefault(); S.film.step(1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); S.film.step(-1); }
  else if (e.key === 'Home') { e.preventDefault(); S.film.go(0); }
  else if (e.key === 'End') { e.preventDefault(); S.film.go(99); }
  else if (e.key === 'Enter' && !e.target.closest('a,button')) { e.preventDefault(); nav('#/c/' + stCol(S.film.station).c); }
}

/* ================================================================ the film */
let filmP = null;
function startFilm() {
  if (filmP) return filmP;
  return (filmP = loadManifest().then(M => {
    S.M = M;
    buildFilmUI();
    if (!M) { HTML.classList.add('no-film'); S.film = stubFilm(); setType(0); return S.film; }
    S.film = createFilm(M, {
      canvas: $('#filmCv'), host: FILM,
      onMove(on) { HTML.classList.toggle('scrub', on); },
      onSettle(k) { setType(k); HTML.classList.remove('scrub'); warmStill(k); },
      onTap(k) { if (S.r && S.r.v === 'home' && !HTML.classList.contains('pushing')) nav('#/c/' + stCol(k).c); }
    });
    setType(0);
    return S.film;
  }).catch(e => { console.warn('[pr6] the film is unavailable', e); HTML.classList.add('no-film'); S.film = stubFilm(); setType(0); return S.film; }));
}
/* the collection page's still for a station, fetched while the film rests there, so Enter never waits for it */
const STILLS = new Map();
function warmStill(k) {
  if (!S.M) return null;
  const code = stCode(k);
  if (STILLS.has(code)) return STILLS.get(code);
  const im = new Image(); im.decoding = 'async';
  const p = new Promise(res => { im.onload = () => res(true); im.onerror = () => { const fb = S.M.stillFallback(code); if (fb && im.src.indexOf(fb) < 0) im.src = fb; else res(false); }; });
  im.src = S.M.still(code);
  const rec = {im, p}; STILLS.set(code, rec); return rec;
}
/* no manifest at all: the type and marks still work over a plain mist field */
function stubFilm() {
  let st = 0;
  const go = i => { st = clamp(i, 0, CAT.length - 1); setType(st); };
  return {get station() { return st; }, get settled() { return true; }, get pos() { return st; }, set input(v) {}, intro() {}, at: go, go, step: d => go(st + d), frame() {}, readyFor: () => true, state: () => ({station: st, stub: true})};
}

/* ================================================================ #page: mounting a page */
const ctx = {
  addFly,
  still: code => S.M ? {src: S.M.still(code), fb: S.M.stillFallback(code)} : null
};
function mount(r) {
  const v = makeView(r, ctx);
  const old = S.cur;
  if (old && old.api && old.api.destroy) old.api.destroy();
  PAGE.dataset.view = r.v;
  HTML.dataset.view = r.v;
  PAGE.className = v.cls;
  PAGE.innerHTML = `<div class="pg">${v.html}</div>`;
  PAGE.scrollTop = 0; BAR.classList.remove('solid');
  S.cur = {r, v, el: PAGE.firstElementChild, api: null, hash: location.hash};
  S.cur.api = v.init(S.cur.el, ctx, r) || {};
  document.title = v.title;
  return S.cur;
}
function focusTitle(my, delay) {
  setTimeout(() => { if (my !== S.tok || Protocol.isOpen) return; const h = $('h1', PAGE); if (h) h.focus({preventScroll: true}); }, delay);
}

/* ================================================================ the router */
const wait = ms => new Promise(r => setTimeout(r, RM ? Math.min(ms, 60) : ms));
async function transition(r, o = {}) {
  const my = ++S.tok;
  if (r.v === 'exit') { store.del('pr6.v9.member'); location.reload(); return; }
  closeMenus(); closeSearch(false); closeSheet(false); if (Protocol.isOpen && !r.drawer) Protocol.close(false);
  const prev = S.r; S.r = r;
  setNav(r);
  if (r.v === 'home') { await toHome(prev, my, o); if (r.drawer) setTimeout(() => Protocol.open(), o.instant ? 0 : 300); return; }
  const fromHome = !prev || prev.v === 'home';
  if (fromHome && !o.instant && r.v === 'col' && S.film) { await pushIn(r, my); return; }
  if (fromHome) {
    /* any other page from the film: the film steps back and the page comes up over it */
    mount(r);
    showPage(my, o.instant);
    focusTitle(my, o.instant ? 0 : 300);
    return;
  }
  /* page to page: a quick fade of the surface, nothing else moves */
  if (!o.instant && !RM) { PAGE.classList.add('swap'); await wait(140); if (my !== S.tok) return; }
  mount(r);
  requestAnimationFrame(() => PAGE.classList.remove('swap'));
  focusTitle(my, 60);
}
/* Enter: the frame pushes in (scale and a little blur, from the same frame) and becomes the collection page */
async function pushIn(r, my) {
  const k = colSt(colIx(r));
  if (S.film && k >= 0 && S.film.station !== k) S.film.at(k);
  S.film.input = false;
  HTML.classList.add('pushing');
  const still = warmStill(k >= 0 ? k : S.film.station);
  mount(r);
  PAGE.hidden = false; PAGE.classList.add('rise');
  void PAGE.offsetWidth;
  /* the frame leads (it pushes in), then the page resolves out of it */
  await Promise.all([wait(360), still ? Promise.race([still.p, wait(700)]) : null]);
  if (my !== S.tok) return;
  PAGE.classList.remove('rise');
  await wait(760);
  if (my !== S.tok) return;
  HTML.classList.remove('film-on'); HTML.classList.add('page-on');
  HTML.classList.remove('pushing');
  focusTitle(my, 0);
}
function showPage(my, instant) {
  S.film && (S.film.input = false);
  PAGE.hidden = false;
  if (instant || RM) { HTML.classList.remove('film-on'); HTML.classList.add('page-on'); PAGE.classList.remove('rise'); return; }
  PAGE.classList.add('rise'); void PAGE.offsetWidth;
  requestAnimationFrame(() => PAGE.classList.remove('rise'));
  setTimeout(() => { if (my === S.tok) { HTML.classList.remove('film-on'); HTML.classList.add('page-on'); } }, 520);
}
/* back to the film: the page clears and the frame settles back out of its push */
async function toHome(prev, my, o) {
  document.title = 'PR6 · The film';
  const k = prev ? colSt(colIx(prev)) : -1;
  if (S.film && k >= 0) S.film.at(k);
  if (S.film) setType(S.film.station);
  const fromPage = prev && prev.v !== 'home' && !PAGE.hidden;
  FILM.hidden = false;
  if (fromPage && !o.instant && !RM) {
    FILM.classList.add('snap'); HTML.classList.add('pushing', 'film-on', 'scrub');
    void FILM.offsetWidth; FILM.classList.remove('snap'); void FILM.offsetWidth;
    PAGE.classList.add('rise');
    await wait(60);
    if (my !== S.tok) return;
    HTML.classList.remove('pushing');
    await wait(560);
    if (my !== S.tok) return;
    HTML.classList.remove('scrub');
  }
  HTML.classList.add('film-on'); HTML.classList.remove('page-on', 'pushing');
  if (!S.film || S.film.settled) HTML.classList.remove('scrub');
  if (S.cur && S.cur.api && S.cur.api.destroy) S.cur.api.destroy();
  S.cur = null; PAGE.hidden = true; PAGE.classList.remove('rise'); PAGE.innerHTML = ''; delete HTML.dataset.view; HTML.dataset.view = 'home';
  if (S.film) S.film.input = true;
  BAR.classList.remove('solid');
  if (!S.intro && S.film) playIntro(my);
  setTimeout(() => { if (my === S.tok && !Protocol.isOpen && document.activeElement && (document.activeElement === document.body || PAGE.contains(document.activeElement))) { const h = $('[data-ft-n]', TYPE); h && h.focus({preventScroll: true}); } }, 400);
}
/* the establishing move plays once per visit, when its frames are in (or after a short wait, never blocking) */
function playIntro(my) {
  S.intro = true;
  const f = S.film; if (!f || !S.M) return;
  HTML.classList.add('scrub');
  const a = S.M.intro[0], b = S.M.intro[1], t0 = performance.now();
  const tick = () => {
    if (my !== S.tok && S.r && S.r.v !== 'home') { f.at(0); HTML.classList.remove('scrub'); return; }
    if (f.state().discrete || f.readyFor(a, b) || performance.now() - t0 > 2600) f.intro();
    else setTimeout(tick, 120);
  };
  tick();
}
function setNav(r) {
  $$('[data-nav]', BAR).forEach(a => { const on = a.dataset.nav === navKey(r); a.classList.toggle('on', on); if (a.tagName === 'A') { if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); } });
}
let linked = false;
const nav = h => { linked = true; location.hash = h; linked = false; };
function route() {
  const r = parse(location.hash);
  if (S.cur && S.cur.hash === location.hash) return;
  transition(r);
}

/* ================================================================ search: a plain surface, a big field, a list */
let sBack = null;
function openSearch() {
  closeMenus(); closeSheet(); sBack = document.activeElement;
  SEARCH.innerHTML = `<div class="s-in">
    <div class="s-top"><label class="s-l" for="sQ">Search the Formulary</label><button type="button" class="s-x" data-sx>Close</button></div>
    <input id="sQ" class="s-q" type="search" placeholder="Name, ingredient, format or code" autocomplete="off" spellcheck="false">
    <p class="s-meta" id="sMeta" role="status"></p>
    <ol class="rows s-res" id="sRes"></ol></div>`;
  SEARCH.hidden = false; HTML.classList.add('s-open'); $('#bSearch').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => requestAnimationFrame(() => SEARCH.classList.add('on')));
  const q = $('#sQ'); q.focus();
  q.addEventListener('input', renderSearch);
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = $('#sRes a'); if (a) { nav(a.getAttribute('href')); closeSearch(false); } } if (e.key === 'ArrowDown') { const a = $('#sRes a'); if (a) { e.preventDefault(); a.focus(); } } });
  $('[data-sx]', SEARCH).onclick = () => closeSearch();
  SEARCH.onclick = e => { if (e.target.closest('#sRes a')) closeSearch(false); };
  SEARCH.onkeydown = e => {
    if (e.key !== 'Tab') return; const f = $$('input,button,a[href]', SEARCH).filter(x => x.offsetParent); if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  };
  renderSearch();
}
function closeSearch(restore = true) {
  if (SEARCH.hidden) return; SEARCH.classList.remove('on'); HTML.classList.remove('s-open'); $('#bSearch').setAttribute('aria-expanded', 'false');
  setTimeout(() => { if (!SEARCH.classList.contains('on')) SEARCH.hidden = true; }, RM ? 0 : 260);
  if (restore && sBack && document.contains(sBack)) sBack.focus({preventScroll: true});
}
function renderSearch() {
  const raw = $('#sQ').value.trim(), q = raw.toLowerCase();
  const rank = p => { const n = p.n.toLowerCase(); return p.id === q ? -1 : n.startsWith(q) ? 0 : n.split(/\s+/).some(w => w.startsWith(q)) ? 1 : n.includes(q) ? 2 : 3; };
  const hits = !q ? [] : ALL.filter(p => (p.n + ' ' + p.g + ' ' + p.cn + ' ' + p.id + ' ' + p.q + ' ' + p.act.map(a => a.name).join(' ') + ' ' + p.oth).toLowerCase().includes(q))
    .map((p, i) => [rank(p), i, p]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]).slice(0, 12);
  $('#sMeta').textContent = !q ? 'Try creatine, magnesium, sachets, serum or 07. The first entry of each collection:' : hits.length ? `${hits.length} ${hits.length === 1 ? 'entry' : 'entries'}` : `Nothing in the Formulary matches “${raw}”.`;
  $('#sRes').innerHTML = (q ? hits : CAT.map(c => c.it[0])).map(p => `<li class="row"><a class="row-a" href="#/p/${p.id}"><span class="r-c mono">${p.id}</span><span class="r-n">${esc(p.n)}</span><span class="r-f">${esc(p.g)}, ${esc(p.q)}</span><span class="r-p mono">${money(p.pc)}</span></a></li>`).join('');
}

/* ================================================================ the phone menu: a plain sheet of large links */
let shBack = null;
function openSheet() {
  shBack = document.activeElement;
  SHEET.innerHTML = `<div class="sh-in">
    <div class="sh-top"><a class="wm" href="#/" aria-label="PR6, back to the film">PR6</a><button type="button" class="sh-x" data-shx>Close</button></div>
    <nav aria-label="Menu">
      <ol class="sh-main"><li><a href="#/">The film</a></li><li><a href="#/index">Index</a></li><li><a href="#/club">Field Club</a></li><li><a href="#/m/notes">Field Notes</a></li><li><button type="button" data-shs>Search</button></li></ol>
      <h2 class="sh-h">Collections</h2>
      <ol class="sh-cols">${CAT.map(co => `<li><a href="#/c/${co.c}">${esc(co.n)}</a></li>`).join('')}</ol>
      <h2 class="sh-h">Member</h2>
      <ol class="sh-mem">${MPAGES.filter(m => m[0] !== 'notes').map(([k, n]) => `<li><a href="#/m/${k}">${esc(n)}</a></li>`).join('')}<li><a href="#/exit">Exit this device</a></li></ol>
    </nav></div>`;
  SHEET.hidden = false; HTML.classList.add('sh-open'); $('#bMenu').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => requestAnimationFrame(() => SHEET.classList.add('on')));
  $('[data-shx]', SHEET).onclick = () => closeSheet();
  $('[data-shs]', SHEET).onclick = () => { closeSheet(false); openSearch(); };
  SHEET.onclick = e => { if (e.target.closest('a')) closeSheet(false); };
  setTimeout(() => $('a', SHEET).focus({preventScroll: true}), 60);
}
function closeSheet(restore = true) {
  if (SHEET.hidden) return; SHEET.classList.remove('on'); HTML.classList.remove('sh-open'); $('#bMenu').setAttribute('aria-expanded', 'false');
  setTimeout(() => { if (!SHEET.classList.contains('on')) SHEET.hidden = true; }, RM ? 0 : 260);
  if (restore && shBack && document.contains(shBack)) shBack.focus({preventScroll: true});
}

/* ================================================================ Add to Protocol: the pack lifts off the disc and arcs into Protocol (from v7) */
function addFly(id, srcEl) {
  const p = byId(id); if (!p) return;
  const pill = $('#bPro'); const pr = pill.getBoundingClientRect();
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
function bump() { const b = $('#bPro'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); setTimeout(() => b.classList.remove('bump'), 700); }

/* ================================================================ the loop */
let looping = false;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = CLOCK.tick(now);
  if (document.hidden) return;
  stepTweens();
  if (S.film && !FILM.hidden && HTML.classList.contains('film-on')) {
    S.film.frame(dt);
    if (S.markX && S.M) MARKS.style.setProperty('--p', (clamp(S.markX(S.film.pos), 0, 1) * 100).toFixed(2) + '%');
  }
  Disc.frame(dt, CLOCK.now());
}
const startLoop = () => { if (!looping) { looping = true; requestAnimationFrame(loop); } };
export const running = () => looping;

/* ================================================================ boot */
function common() {
  S.member = true;
  buildChrome(); hooks(); startLoop();
}
export async function boot() {
  await Renders.ready;
  common();
  BAR.hidden = false;
  const r = parse(location.hash);
  if (r.v === 'exit') { store.del('pr6.v9.member'); location.reload(); return; }
  await Promise.race([startFilm(), new Promise(res => setTimeout(res, 3000))]);
  if (r.v !== 'home') S.intro = true;   /* a deep link: no establishing move when they come back to the film */
  await transition(r, {instant: true});
  addEventListener('hashchange', route);
  HTML.classList.add('ready');
}
/* a guest who has just opened the gate: everything loads behind the gate's light, then the gate hands over */
let FG = null;
export function fromGate() {
  return FG || (FG = (async () => {
    showSplash();
    await Renders.ready;
    common();
    await Promise.race([startFilm(), new Promise(r => setTimeout(r, 3000))]);
    return enter;
  })());
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
    BAR.hidden = false;
    await transition({v: 'home'}, {instant: true});
    if (splash && !RM) { const o = +getComputedStyle(splash).opacity; if (o < .95) { splash.style.animation = 'none'; splash.style.transition = 'opacity .3s ease'; splash.style.opacity = o; void splash.offsetWidth; splash.style.opacity = 1; } setTimeout(dropSplash, o < .95 ? 650 : 350); }
    else dropSplash();
    addEventListener('hashchange', route);
    HTML.classList.add('ready');
  }
};

/* ================================================================ test hooks */
function hooks() {
  window.PR6V9 = {
    state: () => ({
      route: S.r, hash: location.hash, member: S.member, view: HTML.dataset.view || null, page: !PAGE.hidden,
      film: S.film ? S.film.state() : null, filmOn: HTML.classList.contains('film-on'), pushing: HTML.classList.contains('pushing'), scrub: HTML.classList.contains('scrub'),
      station: S.film ? {k: S.film.station, code: stCode(S.film.station), name: stCol(S.film.station).n} : null,
      protocol: {open: Protocol.isOpen, count: Protocol.size(), lines: Protocol.lines(), total: Protocol.total()},
      disc: Disc.state(), renders: Renders.status(), search: !SEARCH.hidden, sheet: !SHEET.hidden, rm: RM, phone: isPhone()
    }),
    go: h => { nav(h); },
    station: i => S.film && S.film.go(i),
    protocol: Protocol, disc: Disc,
    get film() { return S.film; }
  };
}

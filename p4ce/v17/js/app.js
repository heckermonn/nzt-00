/* PR6 v17 · the institutional portal: the member bundle. Owns the chrome (a thin bar on a desktop; on a phone a top line that
   says where you are and is the Back control, a bottom thumb bar, and the More sheet listing every section), the
   router (route changes are a same-document View Transition where the browser has it, a short crossfade otherwise;
   a tapped pack's frame becomes the next page's picture), the gate hand-off (black, then the store's first light), the
   flight of a vial into the Quote List, and the test hooks (window.PR6V17). Loaded only after the gate has been opened (or
   straight away for a member). */
import {AREAS, ALL, byId, areaOf} from './catalog.js';
import {$, $$, esc, store, RM, clamp, ic, isPhone} from './util.js';
import {Quote as Protocol} from './quote.js';
import {makeView, MPAGES} from './views.js';
import {LIGHT, onScroll as lightScroll, kick, instances, setDark, liveCount} from './light.js';
import * as SH from './shots.js';
import {loadManifest, createFilm} from './film.js';
import {createCells, createMitosis} from './cells.js';
import {colData} from './views.js';

const HTML = document.documentElement;
const BAR = $('#bar'), TOP = $('#top'), THUMB = $('#thumb'), PAGE = $('#page'), FLY = $('#fly'), SHEET = $('#sheet'), FILM = $('#film'), TYPE = $('#filmType'), MARKS = $('#marks');
const S = {r: null, cur: null, member: false, tok: 0, hist: [], focusSearch: false, vt: null, fromGate: false};
history.scrollRestoration = 'manual';
addEventListener('pointerdown', e => { S.pt = {x: e.clientX, y: e.clientY, r: 30, t: performance.now()}; }, {capture: true, passive: true});
const VT = typeof document.startViewTransition === 'function' && !RM;

/* ================================================================ routes */
function parse(h) {
  const s = (h || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!s.length || s[0] === 'film') return {v: 'home'};
  if (s[0] === 'catalogue' || s[0] === 'formulary') return {v: 'catalogue'};
  if (s[0] === 'index') return {v: 'index'};
  if (s[0] === 'dossier') return {v: 'dossier'};
  if ((s[0] === 'a' || s[0] === 'c') && s[1]) return {v: 'col', c: s[1]};
  if (s[0] === 'p' && s[1]) return {v: 'product', id: s[1]};
  if (s[0] === 'club') return {v: 'club', sub: s[1] || ''};
  if (s[0] === 'm' && s[1]) return {v: 'member', page: s[1]};
  if (s[0] === 'search') return {v: 'search'};
  if (s[0] === 'credits') return {v: 'credits'};
  if (s[0] === 'quote' || s[0] === 'protocol') return {v: 'home', drawer: true};
  if (s[0] === 'exit') return {v: 'exit'};
  return {v: 'nf'};
}
const navKey = r => r.v === 'catalogue' || r.v === 'col' || r.v === 'product' || r.v === 'index' ? 'catalogue' : r.v === 'club' ? 'club' : r.v === 'search' ? 'search' : r.v === 'dossier' ? 'dossier' : r.v === 'member' ? 'member' : '';
const cleanURL = () => { const q = new URLSearchParams(location.search); q.delete('key'); q.delete('gate'); const s = q.toString(); return location.pathname + (s ? '?' + s : ''); };
const nav = h => { location.hash = h; };

/* ================================================================ the chrome */
const SECTIONS = [['The Atlas', '#/'], ['The Catalogue', '#/catalogue'], ['Quote List', '#/quote'], ['Dispatches', '#/m/orders'], ['The Dossier', '#/dossier'], ['Institution Record', '#/m/institution'],
  ['References', '#/m/references'], ['New Entries', '#/m/new'], ['Member Liaison', '#/m/liaison'], ['Field Club', '#/club']];
function buildChrome() {
  BAR.className = 'bar';
  BAR.innerHTML = `<div class="bar-in">
    <a class="b-mark wm" href="#/" aria-label="PR6, home">PR6</a>
    <nav class="b-nav" aria-label="Main">
      <a href="#/catalogue" data-nav="catalogue">Catalogue</a>
      <a href="#/dossier" data-nav="dossier">Dossier</a>
      <a href="#/club" data-nav="club">Field Club</a>
      <span class="b-mem"><button type="button" id="bMem" data-nav="member" aria-expanded="false" aria-controls="memMenu">Account</button>
        <span class="menu" id="memMenu" hidden>${MPAGES.map(([k, n]) => `<a href="#/m/${k}">${esc(n)}</a>`).join('')}<a href="#/exit" class="m-x">Exit this device</a></span></span>
    </nav>
    <div class="b-tools">
      <a href="#/search" class="b-t" data-nav="search">Search</a>
      <button type="button" id="bPro" class="b-t b-pro" data-pro data-cnt-wrap>Quote <span class="cnt mono" data-cnt aria-hidden="true">0</span></button>
    </div>
  </div>`;
  TOP.className = 'tl';
  $('.b-mark', BAR).addEventListener('click', e => { if (S.r && S.r.v === 'home' && !H0.up) { e.preventDefault(); showHero(); } });
  TOP.innerHTML = `<button type="button" class="tl-b" id="tlB"><span class="tl-ar">${ic('back')}</span><span class="tl-wm wm">PR6</span><span class="tl-x" data-tl></span></button>`;
  THUMB.className = 'tb';
  THUMB.innerHTML = `<a href="#/catalogue" class="tb-i" data-nav="catalogue" id="tbF">${ic('stack')}<span>Catalogue</span></a>
    <a href="#/search" class="tb-i" data-nav="search">${ic('search')}<span>Search</span></a>
    <a href="#/dossier" class="tb-i" data-nav="dossier">${ic('club')}<span>Dossier</span></a>
    <button type="button" class="tb-i tb-pro" data-pro data-cnt-wrap><span class="tb-n mono" data-cnt aria-hidden="true">0</span><span>Quote</span></button>
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
  addEventListener('keydown', filmKey);
  Protocol.count();
}
let scrollRaf = 0;
function onScroll() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    const y = PAGE.scrollTop, v = S.cur && S.cur.v.key;
    const lim = v === 'catalogue' || v === 'col' ? innerHeight * .78 : v === 'product' ? innerHeight * .9 : 12;
    const solid = y > lim;
    BAR.classList.toggle('solid', solid); TOP.classList.toggle('solid', solid);
    /* the night band under the chrome */
    const night = PAGE.querySelector('.night');
    if (night) { const r = night.getBoundingClientRect(), dk = r.top < 40 && r.bottom > 40; TOP.classList.toggle('dark', dk); BAR.classList.toggle('dark', dk); }
    lightScroll();
    if (MED.c && !H0.up) { MED.c.push(y - (S.lastY || 0)); } S.lastY = y; ruler();
  });
}
function closeMenus() { const m = $('#memMenu'); if (m && !m.hidden) { m.hidden = true; $('#bMem').setAttribute('aria-expanded', 'false'); } }
function setCrumb(r, v) {
  const c = v && v.crumb;
  TOP.classList.toggle('home', !c);
  $('[data-tl]', TOP).innerHTML = c ? `<i aria-hidden="true">/</i> ${esc(c.label)}` : '';
  const b = $('#tlB');
  if (c) { const parent = S.hist.length > 1 ? 'the previous page' : c.back === '#/' ? 'the start' : (c.back.startsWith('#/a/') ? AREAS.find(x => '#/a/' + x.c === c.back).n : c.back === '#/catalogue' ? 'The Catalogue' : 'the start'); b.setAttribute('aria-label', `PR6, ${c.label}. Back to ${parent}`); }
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
      <ol class="sh-main">${SECTIONS.slice(0, 2).map(([n, h]) => `<li><a href="${h}">${esc(n)}</a></li>`).join('')}</ol>
      <ol class="sh-cols" aria-label="Series">${AREAS.map(co => `<li><a href="#/a/${co.c}">${esc(co.n)}</a></li>`).join('')}</ol>
      <ol class="sh-main sh-2">${SECTIONS.slice(2).map(([n, h]) => `<li><a href="${h}">${esc(n)}</a></li>`).join('')}</ol>
      <ol class="sh-more"><li><a href="#/search">Search</a></li><li><a href="#/credits">Credits</a></li><li><a href="#/exit">Exit this device</a></li></ol>
    </nav></div>`;
  SHEET.hidden = false; $('#scrim').hidden = false; HTML.classList.add('sh-open'); $('#tbMore').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => requestAnimationFrame(() => { SHEET.classList.add('on'); $('#scrim').classList.add('on'); }));
  $('[data-shx]', SHEET).onclick = () => closeSheet();
  SHEET.onclick = e => { const a = e.target.closest('a'); if (!a) return; if (a.getAttribute('href') === '#/quote') { e.preventDefault(); closeSheet(false); Protocol.open(); return; } closeSheet(false); };
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
  nav('#/a/' + c);
}

/* ================================================================ v14: the Atlas film is the first screen after the
   gate (js/film.js, from v9): one path-traced camera move past nine still lifes, one per series, each holding
   that area's vial. Scroll, swipe, drag, the keys or the marks move it; it eases to rest on a station. Tap the frame or
   Enter: the frame pushes in and the series opens. Every other page lives in #page, over it. */
const FS = {film: null, M: null, p: null, k: 0, intro: false, raf: 0, t: 0};
function buildFilmUI() {
  TYPE.innerHTML = `<div class="ft" data-ft>
      <p class="ft-c mono" data-ft-c></p>
      <h1 class="ft-n" tabindex="-1" data-ft-n></h1>
      <p class="ft-d" data-ft-d></p>
      <div class="ft-r"><p class="ft-m mono" data-ft-m></p><a class="btn ft-go" href="#/a/01" data-ft-go><span class="pl">ENTER</span><span class="arr" aria-hidden="true">&rarr;</span></a></div>
    </div>`;
  const F = FS.M ? FS.M.stations.map(s => s.frame) : AREAS.map((c, i) => i), n = F.length, a = F[0], b = F[n - 1] || 1;
  FS.markX = f => b > a ? (f - a) / (b - a) : 0;
  MARKS.innerHTML = `<div class="mk-track" aria-hidden="true"><i class="mk-head"></i></div>
    ${F.map((f, k) => { const ar = AREAS[k]; return `<button type="button" class="mk" data-mk="${k}" style="--x:${(FS.markX(f) * 100).toFixed(2)}%" aria-label="${esc(ar.n + ', ' + ar.f)}"><i></i><span class="mk-l">${esc(ar.n)}</span></button>`; }).join('')}`;
  $$('[data-mk]', MARKS).forEach(btn => btn.addEventListener('click', () => { if (FS.film) FS.film.go(+btn.dataset.mk); }));
}
function setType(k) {
  k = clamp(k, 0, AREAS.length - 1); FS.k = k;
  const ar = AREAS[k];
  $('[data-ft-c]', TYPE).textContent = ar.f.toUpperCase();
  $('[data-ft-n]', TYPE).textContent = ar.n;
  $('[data-ft-d]', TYPE).textContent = ar.d;
  $('[data-ft-m]', TYPE).innerHTML = colData(ar);
  const go = $('[data-ft-go]', TYPE); go.setAttribute('href', '#/a/' + ar.c); go.setAttribute('aria-label', 'Enter ' + ar.n);
  $$('[data-mk]', MARKS).forEach(b => { const on = +b.dataset.mk === k; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  if (S.r && S.r.v === 'home') document.title = `PR6 · ${ar.n}`;
}
function stubFilm() {
  let st = 0; const go = i => { st = clamp(i, 0, AREAS.length - 1); setType(st); };
  return {get station() { return st; }, get settled() { return true; }, set input(v) {}, intro() {}, at: go, go, step: d => go(st + d), frame() {}, state: () => ({station: st, stub: true})};
}
function startFilm() {
  if (FS.p) return FS.p;
  return (FS.p = loadManifest().then(M => {
    FS.M = M; buildFilmUI();
    if (!M) { HTML.classList.add('no-film'); FS.film = stubFilm(); setType(0); return FS.film; }
    FS.film = createFilm(M, {
      canvas: $('#filmCv'), host: FILM,
      onMove(on) { HTML.classList.toggle('scrub', on); },
      onSettle(k) { setType(k); HTML.classList.remove('scrub'); },
      onTap(k) { if (S.r && S.r.v === 'home' && !HTML.classList.contains('pushing')) nav('#/a/' + AREAS[clamp(k, 0, 8)].c); }
    });
    setType(0);
    return FS.film;
  }).catch(e => { console.warn('[pr6] the film is unavailable', e); HTML.classList.add('no-film'); FS.film = stubFilm(); setType(0); return FS.film; }));
}
function filmLoop(t) {
  FS.raf = 0;
  if (!HTML.classList.contains('film-on') || !FS.film) return;
  const dt = FS.t ? Math.min(.1, (t - FS.t) / 1000) : 0; FS.t = t;
  if (!document.hidden) { FS.film.frame(dt); if (FS.markX && FS.M && FS.film.pos != null) MARKS.style.setProperty('--p', (clamp(FS.markX(FS.film.pos), 0, 1) * 100).toFixed(2) + '%'); }
  FS.raf = requestAnimationFrame(filmLoop);
}
const runFilm = () => { if (!FS.raf) { FS.t = 0; FS.raf = requestAnimationFrame(filmLoop); } };
async function showFilm(prev, o = {}) {
  const old = S.cur; if (old && old.api && old.api.destroy) old.api.destroy();
  setScrollDriverOff();
  HTML.dataset.view = 'home'; HTML.dataset.tone = 'light';
  S.cur = {r: {v: 'home'}, v: {key: 'home', crumb: null}, el: null, api: {}, hash: location.hash};
  setCrumb({v: 'home'}, null);
  FILM.hidden = false; HTML.classList.add('film-on');
  const f = await startFilm();
  /* back from a series: the film stands at that area's station */
  const k = prev && prev.v === 'col' ? AREAS.findIndex(a => a.c === prev.c) : -1;
  if (k >= 0) f.at(k);
  f.input = true; runFilm();
  bindHero();
  if (!FS.intro) { FS.intro = true; if (o.intro) { f.at(0); showHero().then(() => f.intro()); } else f.at(FS.k); }
  else if (o.hero) { showHero(); }
  if (!o.instant && !RM) { PAGE.classList.add('swap'); await wait(220); }
  PAGE.hidden = true; PAGE.classList.remove('swap');
  BAR.classList.remove('solid'); TOP.classList.remove('solid');
  setType(f.station);
  setMedium(S.r); ruler();
}
function hideFilm() { dropHero(); if (FS.film) FS.film.input = false; HTML.classList.remove('film-on', 'scrub', 'pushing'); FILM.hidden = true; }
function filmKey(e) {
  if (H0.up) return;
  if (!S.r || S.r.v !== 'home' || !FS.film || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || !SHEET.hidden || Protocol.isOpen) return;
  if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && !e.target.closest('a,button'))) { e.preventDefault(); FS.film.step(1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); FS.film.step(-1); }
  else if (e.key === 'Home') { e.preventDefault(); FS.film.go(0); }
  else if (e.key === 'End') { e.preventDefault(); FS.film.go(99); }
  else if (e.key === 'Enter' && !e.target.closest('a,button')) { e.preventDefault(); nav('#/a/' + AREAS[FS.film.station].c); }
}

/* ================================================================ v17: the living medium. One canvas (#medium) of the
   slide 1 cells: on the landing it lies under the type, deep, with the nine Series held round the wordmark (each a
   button: tap and that cell divides and opens its Series); behind every page it is pale and slow, and the page's own
   Series cell swells in the upper right. On the Atlas it rests (the film is opaque). */
const MEDC = $('#medium'), MITOC = $('#mito'), RULER = $('#ruler');
const MED = {c: null, tried: false};
function med() {
  if (!MED.tried) { MED.tried = true; try { MED.c = createCells(MEDC, {scale: .5}); } catch (e) { console.warn('[pr6] cells unavailable', e); MED.c = null; } if (!MED.c) HTML.classList.add('no-med'); else MED.c.onFrame(heroFrame); }
  return MED.c;
}
let MITO = null, mitoTried = false;
function mito() { if (!mitoTried) { mitoTried = true; if (!RM) { try { MITO = createMitosis(MITOC); } catch (e) { MITO = null; } } } return MITO; }
/* which Series a route belongs to: its cell is the one that swells behind the page */
function seriesOf(r) {
  if (!r) return -1;
  if (r.v === 'col') return AREAS.findIndex(a => a.c === r.c);
  if (r.v === 'product') { const p = byId(r.id); return p ? AREAS.indexOf(areaOf(p)) : -1; }
  return -1;
}
function setMedium(r) {
  const m = med();
  const night = HTML.dataset.tone === 'night';
  HTML.classList.toggle('med-hero', H0.up);
  if (!m) return;
  if (H0.up) { m.mode('hero'); m.start(); return; }
  if (!FILM.hidden && HTML.classList.contains('film-on') || night) { m.stop(); MEDC.classList.add('rest'); return; }
  MEDC.classList.remove('rest');
  m.mode('bg'); m.focus(seriesOf(r)); m.start();
}

/* the landing: after the gate, and whenever the wordmark is pressed on the Atlas, it covers the film. Scroll, swipe, a
   key or ENTER and every cell divides at once, the field pales out, and the Atlas runs its intro underneath; a Series
   cell opens that Series. */
const H0 = {el: null, up: false, done: null, t0: 0, built: false};
function heroUp() { return H0.up; }
function buildHero() {
  if (H0.built) return; H0.built = true;
  const el = H0.el = $('#h0');
  $('#h0Nine').innerHTML = AREAS.map((a, i) => `<button type="button" class="h0-c" data-h0-c="${i}" aria-label="${esc(a.n)}, ${esc(a.f)}"><span class="mono h0-cn">${a.c}</span><span class="mono h0-cf" aria-hidden="true">${esc(a.f.toUpperCase())}</span></button>`).join('');
  $('[data-h0-count]', el).textContent = `${String(AREAS.length).padStart(2, '0')} SERIES · ${String(ALL.length).padStart(2, '0')} COMPOUNDS · SAMPLE`;
  $$('[data-h0-c]', el).forEach(b => {
    const i = +b.dataset.h0C;
    b.addEventListener('pointerenter', () => MED.c && MED.c.hover(i));
    b.addEventListener('pointerleave', () => MED.c && MED.c.hover(null));
    b.addEventListener('focus', () => MED.c && MED.c.hover(i));
    b.addEventListener('blur', () => MED.c && MED.c.hover(null));
    b.addEventListener('click', e => { e.stopPropagation(); openSeriesCell(i, b); });
  });
}
/* the nine buttons ride on their cells; the clock counts the time under observation */
function heroFrame(m) {
  if (!H0.up || !H0.el) return;
  const P = m.nine(), bs = H0.el.querySelectorAll('[data-h0-c]');
  for (let i = 0; i < bs.length && i < P.length; i++) { const q = P[i]; bs[i].style.transform = `translate(${q.x.toFixed(1)}px, ${q.y.toFixed(1)}px)`; bs[i].style.setProperty('--r', Math.max(24, q.r * 1.15).toFixed(1) + 'px'); }
  const s = Math.floor((performance.now() - H0.t0) / 1000), ck = $('[data-h0-clock]', H0.el);
  if (ck) ck.textContent = `T+${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function openSeriesCell(i, b) {
  const m = MED.c, a = AREAS[i]; if (!a) return;
  let pt = null;
  if (m) { m.divide(i); const q = m.nine()[i], r = MEDC.getBoundingClientRect(); pt = {x: r.left + q.x, y: r.top + q.y, r: q.r}; }
  else if (b) { const r = b.getBoundingClientRect(); pt = {x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2}; }
  S.mitoFrom = pt;
  nav('#/a/' + a.c);
}
function showHero() {
  buildHero();
  const el = H0.el; if (!el) return Promise.resolve();
  H0.t0 = performance.now();
  el.hidden = false; el.classList.remove('h0-out'); H0.up = true; HTML.classList.add('h0-on');
  MEDC.classList.remove('h0-fade', 'rest');
  const m = med(); if (m) { m.reset(); } else el.classList.add('h0-still');
  setMedium(S.r);
  if (FS.film) FS.film.input = false;
  setTimeout(() => { const h = $('.h0-wm', el); h && h.focus({preventScroll: true}); }, 60);
  return new Promise(res => { H0.done = res; });
}
function dismissHero() {
  if (!H0.up) return; H0.up = false;
  const el = H0.el, m = MED.c; m && m.burst(); el.classList.add('h0-out'); HTML.classList.remove('h0-on'); MEDC.classList.add('h0-fade');
  setTimeout(() => { if (H0.up) return; el.hidden = true; MEDC.classList.remove('h0-fade'); HTML.classList.remove('med-hero'); setMedium(S.r); }, RM ? 60 : 1300);
  if (FS.film) FS.film.input = true;
  const d = H0.done; H0.done = null; d && d();
}
/* leaving the landing straight into a page (a Series cell): no Atlas intro, the medium turns pale behind the page */
function dropHero() {
  if (!H0.up) return; H0.up = false; H0.done = null;
  H0.el.hidden = true; H0.el.classList.remove('h0-out'); HTML.classList.remove('h0-on', 'med-hero');
}
function bindHero() {
  const el = $('#h0'); if (!el || el.dataset.b) return; el.dataset.b = 1;
  let y0 = null;
  el.addEventListener('wheel', e => { if (e.deltaY > 6) dismissHero(); }, {passive: true});
  el.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, {passive: true});
  el.addEventListener('touchmove', e => { if (y0 != null && y0 - e.touches[0].clientY > 30) { y0 = null; dismissHero(); } }, {passive: true});
  el.addEventListener('click', () => dismissHero());
  addEventListener('keydown', e => { if (H0.up && !e.target.closest('[data-h0-c]') && ['ArrowDown', 'PageDown', 'Enter', ' ', 'ArrowRight'].includes(e.key)) { e.preventDefault(); dismissHero(); } });
}

/* slide 2's ruler: six ticks, the sixth in Safety Orange, and a hairline that runs down them as the page is read */
function ruler() {
  if (!RULER) return;
  const on = !PAGE.hidden && FILM.hidden && !H0.up && HTML.dataset.tone !== 'night';
  RULER.hidden = !on; if (!on) return;
  const max = PAGE.scrollHeight - PAGE.clientHeight, p = max > 4 ? clamp(PAGE.scrollTop / max) : 0;
  RULER.style.setProperty('--p', p.toFixed(4));
  const k = Math.min(5, Math.floor(p * 6 - 1e-6 + (p >= 1 ? 1 : 0)));
  RULER.querySelectorAll('i').forEach((x, j) => x.classList.toggle('on', j <= Math.max(0, k)));
}
const setScrollDriverOff = () => {};

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
  setCrumb(r, v); onScroll(); setMedium(r);
  document.title = v.title;
  /* the shared frame is named only for the length of the transition */
  if (vt) setTimeout(() => $$('[style*="view-transition-name"]', PAGE).forEach(x => { x.style.viewTransitionName = ''; }), 900);
  return S.cur;
}
function focusFilm(my, delay) { setTimeout(() => { if (my !== S.tok || Protocol.isOpen || !SHEET.hidden) return; const h = $('[data-ft-n]', TYPE); if (h) h.focus({preventScroll: true}); }, delay); }
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
  if (r.v === 'exit') { store.del('pr6.v17.member'); location.reload(); return; }
  closeMenus(); closeSheet(false); if (Protocol.isOpen && !r.drawer) Protocol.close(false);
  const prev = S.r; S.r = r;
  setNav(r);
  if (r.v === 'home') { await showFilm(prev, o); focusFilm(my, o.instant ? 0 : 120); if (r.drawer) setTimeout(() => Protocol.open(), o.instant ? 0 : 250); return; }
  const M = !o.instant && !RM ? mito() : null;
  const from = S.mitoFrom || (S.pt && performance.now() - S.pt.t < 1500 ? S.pt : null); S.mitoFrom = null;
  if (M && !M.busy && (H0.up && from || FILM.hidden && !PAGE.hidden)) {
    /* the division: a cell grows from where you pressed, the page mounts under it, and it divides open */
    const pt = from || {x: innerWidth / 2, y: innerHeight / 2, r: 40};
    const oldVT = S.vt; S.vt = null;
    await M.run(pt.x, pt.y, pt.r || 36, () => {
      if (my !== S.tok) return;
      if (oldVT) { oldVT.style.viewTransitionName = ''; if (oldVT.classList.contains('vt-ghost')) oldVT.remove(); }
      PAGE.hidden = false; PAGE.classList.remove('swap'); mount(r); if (!FILM.hidden) hideFilm(); setMedium(r);
    });
    if (my !== S.tok) return;
    focusTitle(my, 0);
    if (r.drawer) setTimeout(() => Protocol.open(), 250);
    return;
  }
  if (prev && prev.v === 'home' || !FILM.hidden) {
    /* leaving the film: into a series the frame pushes in (scale and blur) and the page comes up out of it */
    if (r.v === 'col' && !o.instant && !RM && !FILM.hidden) { HTML.classList.add('pushing'); if (FS.film) FS.film.input = false; await wait(420); if (my !== S.tok) return; }
    PAGE.hidden = false; PAGE.classList.add('swap'); mount(r); void PAGE.offsetWidth;
    requestAnimationFrame(() => PAGE.classList.remove('swap'));
    setTimeout(() => { if (my === S.tok) { hideFilm(); setMedium(r); ruler(); } }, o.instant ? 0 : 360);
    focusTitle(my, o.instant ? 0 : 120);
    return;
  }
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

/* ================================================================ Add to quote: the vial, in the light it is in now,
   lifts off the disc and arcs into Quote (n) */
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
  if (img) { img.className = 'fly-im'; g.appendChild(img); } else g.innerHTML = `<img class="fly-im" src="${esc(SH.posterFor(p.id))}" alt="">`;
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
function warm() { [SH.posterFor('PR6-C-0103'), SH.posterFor()].forEach(u => { if (u) { const i = new Image(); i.decoding = 'async'; i.src = u; } }); }
export async function boot() {
  await SH.ready;
  common(); showChrome(); warm();
  const r = parse(location.hash);
  if (r.v === 'exit') { store.del('pr6.v17.member'); location.reload(); return; }
  S.hist = [location.hash || '#/'];
  await transition(r, {instant: true, intro: true});
  addEventListener('hashchange', route);
  HTML.classList.add('ready');
}
/* a guest who has just opened the gate: everything loads behind the night, then the gate lets go onto black and the
   home page's first light comes up (views.js home(): the dawn) */
let FG = null;
export function fromGate() {
  return FG || (FG = (async () => {
    await SH.ready;
    /* fetch the vial's passes while the gate is still turning its light out */
    await Promise.race([startFilm(), new Promise(r => setTimeout(r, 2600))]);
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
    /* 'dawned' holds the dark under the thumb bar while it rises, so no strip of Chalk shows beneath the tin */
    const lift = () => { if (!HTML.classList.contains('dawning')) return; HTML.classList.remove('dawning'); HTML.classList.add('dawned'); setTimeout(() => HTML.classList.remove('dawned'), 900); };
    ctx.onDawn = () => { lift(); ctx.onDawn = null; };
    showChrome();
    S.hist = ['#/'];
    await transition({v: 'home'}, {instant: true, intro: true});
    ctx.fromGate = false;
    setTimeout(() => ctx.onDawn && ctx.onDawn(), RM ? 100 : 700);
    addEventListener('hashchange', route);
    HTML.classList.add('ready');
    setTimeout(lift, 4000);
  }
};

/* ================================================================ test hooks */
function hooks() {
  window.PR6V17 = {
    state: () => ({
      route: S.r, hash: location.hash, member: S.member, view: HTML.dataset.view || null, tone: HTML.dataset.tone || null,
      crumb: S.crumb ? S.crumb.label : null, hist: S.hist.slice(),
      quote: {open: Protocol.isOpen, count: Protocol.size(), lines: Protocol.lines(), total: Protocol.total()},
      light: LIGHT.state(), pictures: instances().map(i => i.state()), live: liveCount(), shots: SH.status(), sheet: !SHEET.hidden, rm: RM, phone: isPhone(), vt: VT,
      lineup: S.cur && S.cur.api && S.cur.api.lineup ? S.cur.api.lineup.index : null,
      film: FS.film ? FS.film.state() : null
    }),
    go: h => nav(h), back, openSheet, closeSheet, get film() { return FS.film; }, hero: {show: () => showHero(), dismiss: () => dismissHero(), open: i => openSeriesCell(i), get up() { return H0.up; }}, medium: () => MED.c, get mitoBusy() { return !!(MITO && MITO.busy); },
    lineup: k => S.cur && S.cur.api && S.cur.api.lineup && S.cur.api.lineup.go(k),
    quote: Protocol, light: LIGHT, kick
  };
}

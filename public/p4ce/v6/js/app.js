/* PR6 v6 · the member bundle: chrome (bar, member menu, search, phone sheet), the router, the frost transitions,
   the product that stays on screen across a page change, and the test hooks (window.PR6V6).
   Loaded only after the gate has been opened (or straight away for a member). */
import {ALL, CAT, byId} from './catalog.js';
import {$, $$, Q, esc, money, store, say, RM, CLOCK, stepTweens, isPhone} from './util.js';
import {Renders, packHTML, ensureDefs} from './renders.js';
import {Protocol} from './protocol.js';
import {makeView, MPAGES} from './views.js';

const HTML = document.documentElement;
const BAR = $('#bar'), VIEWS = $('#views'), FLY = $('#fly'), SEARCH = $('#search'), SHEET = $('#sheet');
const S = {cur: null, member: false, busy: false, carry: null, tok: 0, scroll: {}, last: null};
history.scrollRestoration = 'manual';

/* ================================================================ routes */
function parse(h) {
  const s = (h || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!s.length) return {v: 'home'};
  if (s[0] === 'formulary') return {v: 'formulary'};
  if (s[0] === 'c' && s[1]) return {v: 'col', c: s[1]};
  if (s[0] === 'p' && s[1]) return {v: 'product', id: s[1]};
  if (s[0] === 'club') return {v: 'club', sub: s[1] || ''};
  if (s[0] === 'm' && s[1]) return {v: 'member', page: s[1]};
  if (s[0] === 'protocol') return {v: 'home', drawer: true};
  if (s[0] === 'exit') return {v: 'exit'};
  if (s[0] === 'index') return {v: 'home', jump: 'index'};
  return {v: 'nf'};
}
const navKey = r => r.v === 'formulary' || r.v === 'col' || r.v === 'product' ? 'formulary' : r.v === 'club' ? 'club' : r.v === 'member' ? (r.page === 'notes' ? 'notes' : 'member') : r.v === 'home' ? 'home' : '';
const cleanURL = () => { const q = new URLSearchParams(location.search); q.delete('key'); q.delete('gate'); const s = q.toString(); return location.pathname + (s ? '?' + s : ''); };

/* ================================================================ the bar */
function buildChrome() {
  ensureDefs();
  BAR.className = 'bar';
  BAR.innerHTML = `<div class="bar-in">
    <a class="b-wm" href="#/" aria-label="PR6, the Index">PR6</a>
    <p class="b-crumb mono"><i aria-hidden="true">/</i> <span data-crumb>The Index</span></p>
    <nav class="b-nav mono" aria-label="Main">
      <a href="#/formulary" data-nav="formulary">Formulary</a>
      <a href="#/club" data-nav="club">Field Club</a>
      <a href="#/m/notes" data-nav="notes">Field Notes</a>
      <span class="b-mem"><button type="button" id="bMem" data-nav="member" aria-expanded="false" aria-controls="memMenu">Member</button>
        <span class="menu" id="memMenu" hidden>${MPAGES.map(([k, n], i) => `<a href="#/m/${k}"><span>M/${String(i + 1).padStart(2, '0')}</span>${esc(n)}</a>`).join('')}<a href="#/exit"><span>--</span>Exit this device</a></span></span>
    </nav>
    <div class="b-tools mono">
      <button type="button" id="bSearch" aria-expanded="false" aria-controls="search"><span class="t">Search</span><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.5"/><path d="M13.2 13.2L17 17"/></svg></button>
      <button type="button" id="bPro" data-pro data-cnt-wrap><span class="t">Protocol</span> <span class="cnt">(<span data-cnt>00</span>)</span><i class="dot" aria-hidden="true"></i></button>
      <button type="button" id="bMenu" aria-expanded="false" aria-controls="sheet">Menu</button>
    </div>
  </div>`;
  const bMem = $('#bMem'), menu = $('#memMenu');
  bMem.addEventListener('click', e => { e.stopPropagation(); const on = menu.hidden; closeMenus(); menu.hidden = !on; bMem.setAttribute('aria-expanded', on); if (on) $('a', menu).focus(); });
  $('#bSearch').addEventListener('click', () => openSearch());
  $('#bPro').addEventListener('click', () => { closeMenus(); Protocol.open(); });
  $('#bMenu').addEventListener('click', () => openSheet());
  document.addEventListener('click', e => { if (!e.target.closest('.b-mem')) closeMenus(); });
  menu.addEventListener('click', e => { if (e.target.closest('a')) closeMenus(); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!menu.hidden) { closeMenus(); bMem.focus(); } else if (!SEARCH.hidden) closeSearch(); else if (!SHEET.hidden) closeSheet(); }
    if (e.key === '/' && S.member && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !Protocol.isOpen) { e.preventDefault(); openSearch(); }
  });
  Protocol.count();
}
function closeMenus() { const m = $('#memMenu'); if (m) { m.hidden = true; $('#bMem').setAttribute('aria-expanded', 'false'); } }
function pulse() { const b = $('#bPro'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); }

/* ================================================================ search */
let sBack = null;
function openSearch() {
  closeMenus(); closeSheet(); sBack = document.activeElement;
  SEARCH.innerHTML = `<div class="s-in">
    <p class="lbl mono">Search <i>/</i> The Formulary</p>
    <label class="sr" for="sQ">Search the Formulary</label>
    <input id="sQ" type="search" placeholder="Name, ingredient, format or code" autocomplete="off" spellcheck="false">
    <button type="button" class="s-x mono" data-sx>Close <kbd>Esc</kbd></button>
    <p class="s-meta mono" id="sMeta" role="status"></p>
    <ol class="s-res" id="sRes"></ol></div>`;
  SEARCH.hidden = false; HTML.classList.add('s-open'); $('#bSearch').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => SEARCH.classList.add('on'));
  const q = $('#sQ'); q.focus();
  q.addEventListener('input', renderSearch);
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = $('#sRes a'); if (a) { location.hash = a.getAttribute('href'); closeSearch(false); } } if (e.key === 'ArrowDown') { const a = $('#sRes a'); if (a) { e.preventDefault(); a.focus(); } } });
  $('[data-sx]', SEARCH).onclick = () => closeSearch();
  SEARCH.onclick = e => { if (e.target === SEARCH) closeSearch(); if (e.target.closest('#sRes a')) closeSearch(false); };
  renderSearch();
}
function closeSearch(restore = true) {
  if (SEARCH.hidden) return; SEARCH.classList.remove('on'); HTML.classList.remove('s-open'); $('#bSearch').setAttribute('aria-expanded', 'false');
  setTimeout(() => { if (!SEARCH.classList.contains('on')) SEARCH.hidden = true; }, RM ? 0 : 300);
  if (restore && sBack && document.contains(sBack)) sBack.focus({preventScroll: true});
}
function renderSearch() {
  const raw = $('#sQ').value.trim(), q = raw.toLowerCase();
  const rank = p => { const n = p.n.toLowerCase(); return p.id === q ? -1 : n.startsWith(q) ? 0 : n.split(/\s+/).some(w => w.startsWith(q)) ? 1 : n.includes(q) ? 2 : 3; };
  const hits = !q ? [] : ALL.filter(p => (p.n + ' ' + p.g + ' ' + p.cn + ' ' + p.id + ' ' + p.q + ' ' + p.act.map(a => a.name).join(' ') + ' ' + p.oth).toLowerCase().includes(q))
    .map((p, i) => [rank(p), i, p]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]).slice(0, 14);
  $('#sMeta').textContent = !q ? 'Try: creatine, magnesium, sachets, serum, 07' : hits.length ? `${String(hits.length).padStart(2, '0')} ${hits.length === 1 ? 'entry' : 'entries'}` : `Nothing in the Formulary matches “${raw}”.`;
  $('#sRes').innerHTML = (q ? hits : CAT.map(c => c.it[0])).map(p => `<li><a href="#/p/${p.id}" data-carry="${p.id}"><span class="s-v">${packHTML(p, {mist: true})}</span><span class="mono s-c">${p.id}</span><b>${esc(p.n)}</b><span class="mono s-f">${esc(p.g)} · ${esc(p.q)}</span><span class="mono s-p">${money(p.pc)}</span></a></li>`).join('');
}

/* ================================================================ the phone sheet */
let shBack = null;
function openSheet() {
  shBack = document.activeElement;
  SHEET.innerHTML = `<div class="sh-in">
    <div class="sh-top"><span class="b-wm" aria-hidden="true">PR6</span><button type="button" class="mono" data-shx>Close</button></div>
    <nav aria-label="Menu"><ol class="sh-main">
      <li><a href="#/">The Index</a></li><li><a href="#/formulary">The Formulary</a></li><li><a href="#/club">Field Club</a></li><li><a href="#/m/notes">Field Notes</a></li>
    </ol>
    <p class="lbl mono">Member</p>
    <ol class="sh-mem mono">${MPAGES.filter(m => m[0] !== 'notes').map(([k, n]) => `<li><a href="#/m/${k}">${esc(n)}</a></li>`).join('')}<li><a href="#/exit">Exit this device</a></li></ol></nav>
    <p class="sh-f mono">PR6 <i>/</i> The practice of progress</p></div>`;
  SHEET.hidden = false; HTML.classList.add('sh-open'); $('#bMenu').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => SHEET.classList.add('on'));
  $('[data-shx]', SHEET).onclick = () => closeSheet();
  SHEET.onclick = e => { if (e.target.closest('a')) closeSheet(false); };
  setTimeout(() => $('a', SHEET).focus({preventScroll: true}), 60);
}
function closeSheet(restore = true) {
  if (SHEET.hidden) return; SHEET.classList.remove('on'); HTML.classList.remove('sh-open'); $('#bMenu').setAttribute('aria-expanded', 'false');
  setTimeout(() => { if (!SHEET.classList.contains('on')) SHEET.hidden = true; }, RM ? 0 : 300);
  if (restore && shBack && document.contains(shBack)) shBack.focus({preventScroll: true});
}

/* ================================================================ the carry: the chosen product stays on screen.
   A click on any [data-carry] link remembers where that product is drawn now; after the page changes, a copy flies
   from there to where the new page draws it, unblurred, while everything else frosts over and clears. */
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-carry]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const id = a.dataset.carry, ctx = S.cur && S.cur.ctx;
  let rect = ctx && ctx.stageRectOf ? ctx.stageRectOf(id) : null;
  if (!rect) { const pk = $('.pk', a); if (pk) rect = pk.getBoundingClientRect(); }
  if (!rect && ctx && ctx.dossierRect && a.classList.contains('dos-back')) rect = ctx.dossierRect();
  S.carry = rect && rect.width > 8 && rect.bottom > 0 && rect.top < innerHeight ? {id, rect} : null;
}, true);
function findTarget(el, id) { return $(`.dos-obj[data-target="${CSS.escape(id)}"] .pk`, el) || $(`.colh-lead[data-carry="${CSS.escape(id)}"] .pk`, el); }
function fly(carry, target) {
  const p = byId(carry.id); if (!p || !target) return;
  const to = target.getBoundingClientRect(), fr = carry.rect;
  if (to.width < 8) return;
  const g = document.createElement('div'); g.className = 'ghost';
  g.innerHTML = packHTML(p, {eager: true});
  Object.assign(g.style, {left: to.left + 'px', top: to.top + 'px', width: to.width + 'px', height: to.height + 'px'});
  FLY.appendChild(g); target.style.visibility = 'hidden';
  const sx = fr.width / to.width, dx = fr.left - to.left, dy = fr.top - to.top;
  const an = g.animate([{transform: `translate(${dx}px, ${dy}px) scale(${sx})`}, {transform: 'none'}], {duration: 860, easing: 'cubic-bezier(.65,0,.15,1)', fill: 'both'});
  const done = () => { target.style.visibility = ''; g.animate([{opacity: 1}, {opacity: 0}], {duration: 200, fill: 'forwards'}).onfinish = () => g.remove(); };
  an.onfinish = done; an.oncancel = done;
}

/* ================================================================ the frost transition */
async function transition(r, o = {}) {
  const my = ++S.tok;
  if (r.v === 'exit') { store.del('pr6.v6.member'); location.reload(); return; }
  const v = makeView(r.v === 'nf' ? {v: 'nf'} : r);
  const old = S.cur;
  if (old) S.scroll[old.hash] = scrollY;
  const el = document.createElement('div');
  el.className = 'view ' + v.cls; el.innerHTML = v.html;
  const ctx = {pulse};
  const carry = S.carry; S.carry = null;
  closeMenus(); closeSearch(false); closeSheet(false); if (Protocol.isOpen && !r.drawer) Protocol.close(false);
  const instant = o.instant || RM || !old;
  if (old) {
    /* the old page freezes where it is and frosts out over the new one */
    const y = scrollY; old.el.classList.add('leaving');
    Object.assign(old.el.style, {position: 'fixed', top: -y + 'px', left: 0, right: 0});
    if (old.api && old.api.destroy) old.api.destroy();
    if (old.ctx && old.ctx.destroy) old.ctx.destroy();
    if (instant) old.el.remove();
    else { old.el.classList.add('v-out'); setTimeout(() => old.el.remove(), 560); }
  }
  if (!instant) el.classList.add('v-in');
  VIEWS.appendChild(el);
  const back = o.pop && S.scroll[location.hash] != null;
  scrollTo(0, back ? S.scroll[location.hash] : 0);
  S.cur = {r, el, ctx, hash: location.hash, api: null};
  S.cur.api = v.init(el, ctx, r) || null;
  document.title = v.title;
  $('[data-crumb]', BAR).textContent = v.crumb;
  $$('[data-nav]', BAR).forEach(a => { const on = a.dataset.nav === navKey(r); a.classList.toggle('on', on); if (a.tagName === 'A') { if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); } });
  HTML.dataset.view = r.v;
  if (!instant) {
    /* two frames later the new page clears out of the frost; the carried product lands as it does */
    requestAnimationFrame(() => requestAnimationFrame(() => { if (my === S.tok) el.classList.remove('v-in'); }));
    if (carry) { const t = findTarget(el, carry.id); if (t) fly(carry, t); }
  }
  if (r.jump) setTimeout(() => { const j = $('#' + r.jump, el); if (j) j.scrollIntoView(); }, 30);
  if (r.drawer) setTimeout(() => Protocol.open(), instant ? 0 : 400);
  if (r.v === 'club' && r.sub === 'reviews') setTimeout(() => { const j = $('#reviews', el); if (j) j.scrollIntoView({behavior: RM ? 'auto' : 'smooth'}); }, instant ? 30 : 500);
  if (!o.noFocus) setTimeout(() => { const h = $('h1', el); if (h && my === S.tok && !Protocol.isOpen) h.focus({preventScroll: true}); }, instant ? 0 : 420);
}
let popping = false;
addEventListener('popstate', () => { popping = true; });
function route() {
  const r = parse(location.hash), pop = popping; popping = false;
  if (S.cur && S.cur.hash === location.hash) return;
  transition(r, {pop});
}

/* ================================================================ the loop */
let looping = false, lastBar = '';
function loop(now) {
  requestAnimationFrame(loop);
  const dt = CLOCK.tick(now);
  if (document.hidden) return;
  stepTweens();
  if (S.cur && S.cur.api && S.cur.api.frame) S.cur.api.frame(dt);
  const over = HTML.dataset.view === 'home' && scrollY < innerHeight * .82 ? 'over' : HTML.dataset.view === 'club' && scrollY < innerHeight * .7 ? 'dark' : scrollY > 8 ? 'solid' : 'top';
  if (over !== lastBar) { lastBar = over; BAR.dataset.state = over; }
}
const startLoop = () => { if (!looping) { looping = true; requestAnimationFrame(loop); } };
export const running = () => looping;

/* ================================================================ boot: a member, straight in */
export async function boot() {
  S.member = true;
  await Renders.ready;
  buildChrome(); hooks(); startLoop();
  BAR.hidden = false;
  const r = parse(location.hash);
  if (r.v === 'exit') { store.del('pr6.v6.member'); location.reload(); return; }
  await transition(r, {instant: true, noFocus: true});
  VIEWS.classList.add('arrive'); setTimeout(() => VIEWS.classList.remove('arrive'), 50);
  addEventListener('hashchange', route);
  HTML.classList.add('ready');
}
/* a guest who has just opened the gate: everything loads behind the gate's light, then the gate hands over */
let FG = null;
export function fromGate() {
  return FG || (FG = (async () => {
    await Renders.ready;
    buildChrome(); hooks(); startLoop();
    const img = new Image(); img.src = 'assets/photos/hero-cyclist.webp';
    try { await img.decode(); } catch (e) {}
    return enter;
  })());
}
let entered = false;
const enter = {
  prepare() {},
  async go() {
    if (entered) return; entered = true;
    S.member = true;
    HTML.classList.remove('out'); HTML.classList.add('in');
    history.replaceState(null, '', cleanURL() + '#/');
    BAR.hidden = false; BAR.classList.add('arrive');
    /* the Index comes up out of the gate's Chalk light as a frost that clears */
    await transition({v: 'home'}, {instant: true, noFocus: true});
    if (!RM) { VIEWS.classList.add('frost-arrive'); requestAnimationFrame(() => requestAnimationFrame(() => VIEWS.classList.remove('frost-arrive'))); }
    setTimeout(() => BAR.classList.remove('arrive'), RM ? 0 : 900);
    addEventListener('hashchange', route);
    HTML.classList.add('ready');
    setTimeout(() => { const h = $('h1', VIEWS); if (h) h.focus({preventScroll: true}); }, RM ? 0 : 1200);
  }
};

/* ================================================================ test hooks */
function hooks() {
  window.PR6V6 = {
    state: () => ({
      route: S.cur ? S.cur.r : null, hash: location.hash, member: S.member, view: HTML.dataset.view || null,
      bar: BAR.dataset.state || null, rm: RM, phone: isPhone(),
      protocol: {open: Protocol.isOpen, count: Protocol.count(), lines: Protocol.lines(), total: Protocol.total()},
      renders: Renders.status(), search: !SEARCH.hidden, sheet: !SHEET.hidden
    }),
    go: h => { location.hash = h; },
    protocol: Protocol
  };
}

/* PR6 v11 · Your Protocol: the cart and the subscription, in a drawer (from the right on a desktop, up from the bottom on
   a phone). The drawer is frosted glass (with the hero pane and the product panel, the only glass on the site). Its
   lines are ritual cards (kit 3): DAILY / 01 or RITUAL / 02, the time, the image, the ingredients and [+]. These are the
   only cards on the site. Logic from v8, unchanged in substance: lines are keyed by id + mode + frequency.
   Prices in CAD (catalogue x1.38, whole dollars). Persisted in localStorage pr6.v11.protocol. */
import {byId, keyLine, SLOTS, slotsFor} from './catalog.js';
import {$, $$, esc, money, moneyTotal, pad2, store, ic, say, RM, roll} from './util.js';
import {packHTML} from './renders.js';
import {IMG} from './img.js';

const KEY = 'pr6.v11.protocol';
const FREQ = [30, 60, 90];
const clean = a => (Array.isArray(a) ? a : []).filter(l => l && byId(l.id) && l.q > 0).map(l => ({id: l.id, m: l.m === 'sub' ? 'sub' : 'one', fr: FREQ.includes(+l.fr) ? +l.fr : 30, q: Math.min(99, Math.max(1, l.q | 0))}));
let L = clean(store.get(KEY, []));
const subs = new Set();
const keyOf = l => l.id + '|' + l.m + '|' + (l.m === 'sub' ? l.fr : 0);
const save = () => { store.set(KEY, L); count(); subs.forEach(f => f()); };
const price = l => { const p = byId(l.id); return (l.m === 'sub' ? p.psc : p.pc) * l.q; };
const ritual = p => p.top || /as needed|evening/.test(p.s);

/* the next dispatch: Friday, for anything changed before Thursday 12:00 */
export function nextDispatch(now = new Date()) {
  const d = new Date(now), dow = d.getDay(), h = d.getHours();
  let add = dow < 4 || (dow === 4 && h < 12) ? 5 - dow : dow === 4 ? 8 : ((5 - dow + 7) % 7 || 7);
  d.setDate(d.getDate() + add);
  return d;
}
export const dispatchLabel = (d = nextDispatch()) => d.toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short'}).replace(/\./g, '').replace(',', '');

/* the count can be held back a moment (the pack is still in the air on its way to the pill) */
let HOLD = 0, holdT = 0;
function count() {
  const n = L.reduce((s, l) => s + l.q, 0);
  const wait = HOLD - performance.now();
  if (wait > 0) { clearTimeout(holdT); holdT = setTimeout(count, wait + 10); return n; }
  $$('[data-cnt]').forEach(c => { c.textContent = n; c.closest('[data-cnt-wrap]') && c.closest('[data-cnt-wrap]').classList.toggle('has', n > 0); });
  $$('[data-pro]').forEach(b => b.setAttribute('aria-label', 'Your Protocol, ' + n + (n === 1 ? ' item' : ' items')));
  return n;
}

const dw = document.getElementById('drawer'), scrim = document.getElementById('scrim');
let isOpen = false, NEW = null, back = null;
const hhmm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
function card(l, n) {
  const p = byId(l.id), k = keyOf(l), sub = l.m === 'sub', rit = ritual(p);
  const slot = SLOTS.find(s => s.k === slotsFor(p)[0]) || SLOTS[1];
  const ing = keyLine(p) || p.g;
  return `<li class="pc rc${NEW === k ? ' new' : ''}" data-key="${esc(k)}">
    <p class="rc-top mono"><span>${rit ? 'RITUAL' : 'DAILY'} / ${pad2(n)}</span><span>${hhmm(slot.base)}</span></p>
    <a class="rc-im" href="#/p/${p.id}" data-go aria-hidden="true" tabindex="-1">${IMG.pic('c' + p.c, {cls: 'rc-ph', sizes: '120px', alt: ''})}<span class="rc-pk">${packHTML(p)}</span></a>
    <div class="pc-b">
      <h3 class="pc-n"><a href="#/p/${p.id}" data-go>${esc(p.n)}</a></h3>
      <p class="pc-k"><span class="mono">${p.id}</span> ${esc(p.g)}, ${esc(p.q)}</p>
      <p class="rc-ing mono">${esc(ing)}</p>
      <div class="pc-m" role="group" aria-label="How often, ${esc(p.n)}">
        <button type="button" class="seg${sub ? '' : ' on'}" data-mode="one" data-k="${esc(k)}" aria-pressed="${!sub}">One-off</button>
        <button type="button" class="seg${sub ? ' on' : ''}" data-mode="sub" data-k="${esc(k)}" aria-pressed="${sub}">Subscribe</button>
        ${sub ? `<label class="fr"><span class="sr">Frequency</span><select data-fr="${esc(k)}">${FREQ.map(f => `<option value="${f}"${f === l.fr ? ' selected' : ''}>every ${f} days</option>`).join('')}</select></label>` : ''}
      </div>
      <div class="pc-f">
        <span class="step rc-step" role="group" aria-label="Quantity, ${esc(p.n)}"><button type="button" class="mono" data-k="${esc(k)}" data-d="-1" aria-label="One fewer">[&minus;]</button><output class="mono" aria-live="polite">${l.q}</output><button type="button" class="mono" data-k="${esc(k)}" data-d="1" aria-label="One more">[+]</button></span>
        <button type="button" class="pc-rm" data-rm="${esc(k)}">Remove<span class="sr"> ${esc(p.n)}</span></button>
        <span class="pc-p mono">${money(price(l))}</span>
      </div>
    </div></li>`;
}
/* DAILY and RITUAL are numbered separately, in the order they were added */
function cards() { const c = {d: 0, r: 0}; return L.map(l => card(l, ritual(byId(l.id)) ? ++c.r : ++c.d)).join(''); }
function render() {
  const n = count();
  const once = L.filter(l => l.m !== 'sub').reduce((s, l) => s + price(l), 0), subT = L.filter(l => l.m === 'sub').reduce((s, l) => s + price(l), 0);
  const hasSub = L.some(l => l.m === 'sub');
  dw.innerHTML = `<div class="dw-glass" aria-hidden="true"></div>
    <header class="dw-h">
      <h2 id="dwH" class="dw-t" tabindex="-1">Your Protocol</h2>
      <p class="dw-n">${n ? `${n} ${n === 1 ? 'item' : 'items'}` : 'Empty'}</p>
      <button class="dw-x" type="button" data-close aria-label="Close Your Protocol">${ic('x')}</button>
    </header>
    <div class="dw-b">${n ? `<ol class="pcs">${cards()}</ol>` : `<div class="dw-empty"><p class="dw-e1">Nothing here yet.</p><p>Open any entry and choose Add to Protocol, once or on a schedule.</p><a class="lnk" href="#/formulary" data-close>Open the Formulary <span aria-hidden="true">&rarr;</span></a></div>`}</div>
    ${n ? `<footer class="dw-f">
      <dl>
        ${once ? `<div><dt>One-off</dt><dd class="mono">${money(once)}</dd></div>` : ''}
        ${hasSub ? `<div><dt>Each dispatch, on subscription</dt><dd class="mono">${money(subT)}</dd></div>` : ''}
        <div class="tot"><dt>Subtotal</dt><dd class="mono">${moneyTotal(once + subT)}</dd></div>
        <div class="nx"><dt>Next dispatch</dt><dd class="mono">${dispatchLabel()}</dd></div>
      </dl>
      <button class="btn wide" type="button" data-checkout><span class="pl">CHECKOUT</span><span class="arr" aria-hidden="true">&rarr;</span></button>
      <p class="dw-note" role="status"></p>
      <p class="fine">Placeholder prices in CAD, saved on this device.${hasSub ? ' Skip or change a dispatch from Dispatches.' : ''}</p>
    </footer>` : ''}`;
  bind();
  IMG.watch(dw);
}
function find(k) { return L.find(x => keyOf(x) === k); }
function bind() {
  $$('[data-close]', dw).forEach(b => b.addEventListener('click', () => close()));
  $$('[data-go]', dw).forEach(a => a.addEventListener('click', () => close(false)));
  $$('[data-d]', dw).forEach(b => b.onclick = () => {
    const l = find(b.dataset.k); if (!l) return; l.q += +b.dataset.d; NEW = null;
    if (l.q <= 0) { L.splice(L.indexOf(l), 1); say('Removed ' + byId(l.id).n + '.'); save(); render(); $('#dwH', dw).focus(); return; }
    l.q = Math.min(99, l.q); save(); render(); const nb = $(`[data-k="${CSS.escape(keyOf(l))}"][data-d="${b.dataset.d}"]`, dw); if (nb) nb.focus();
  });
  $$('[data-rm]', dw).forEach(b => b.onclick = () => { const l = find(b.dataset.rm); if (!l) return; L.splice(L.indexOf(l), 1); NEW = null; save(); render(); say('Removed ' + byId(l.id).n + '.'); $('#dwH', dw).focus(); });
  const move = (l, m, fr) => {
    const nk = keyOf({id: l.id, m, fr}); const other = L.find(x => x !== l && keyOf(x) === nk);
    if (other) { other.q = Math.min(99, other.q + l.q); L.splice(L.indexOf(l), 1); NEW = nk; } else { l.m = m; l.fr = fr; NEW = keyOf(l); }
    save(); render(); return nk;
  };
  $$('[data-mode]', dw).forEach(b => b.onclick = () => { const l = find(b.dataset.k); if (!l || l.m === b.dataset.mode) return; const nk = move(l, b.dataset.mode, l.fr); const nb = $(`[data-k="${CSS.escape(nk)}"][data-mode="${b.dataset.mode}"]`, dw); if (nb) nb.focus(); say(b.dataset.mode === 'sub' ? 'Now on your Protocol, every ' + l.fr + ' days.' : 'Now a one-off.'); });
  $$('[data-fr]', dw).forEach(s => s.onchange = () => { const l = find(s.dataset.fr); if (!l) return; const nk = move(l, 'sub', +s.value); const ns = $(`[data-fr="${CSS.escape(nk)}"]`, dw); if (ns) ns.focus(); });
  const co = $('[data-checkout]', dw); if (co) co.onclick = () => { $('.dw-note', dw).textContent = 'Checkout is not live in this preview. Nothing has been charged.'; };
}
function open() {
  render();
  if (isOpen) return;
  isOpen = true; back = document.activeElement;
  dw.hidden = false; scrim.hidden = false; 
  document.documentElement.classList.add('dw-open');
  requestAnimationFrame(() => requestAnimationFrame(() => { dw.classList.add('on'); scrim.classList.add('on'); }));
  setTimeout(() => { const h = $('#dwH', dw); if (h) h.focus({preventScroll: true}); }, RM ? 0 : 360);
  const nw = $('.pc.new', dw); if (nw) setTimeout(() => nw.scrollIntoView({block: 'nearest'}), 60);
}
function close(restore = true) {
  if (!isOpen) return;
  isOpen = false; dw.classList.remove('on'); scrim.classList.remove('on');
  document.documentElement.classList.remove('dw-open');
  setTimeout(() => { if (!isOpen) { dw.hidden = true; scrim.hidden = true; } }, RM ? 0 : 620);
  if (restore && back && document.contains(back)) back.focus({preventScroll: true});
}
scrim.addEventListener('click', () => close());
dw.addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.preventDefault(); close(); return; }
  if (e.key !== 'Tab') return; const f = $$('button,a[href],select,[tabindex="0"]', dw).filter(x => !x.disabled && x.offsetParent && x.tabIndex !== -1); if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
});

export const Protocol = {
  KEY, FREQ, lines: () => L.map(l => ({...l})), count, open, close, render, get isOpen() { return isOpen; },
  hold(ms) { HOLD = performance.now() + ms; },
  size: () => L.reduce((s, l) => s + l.q, 0),
  on(f) { subs.add(f); }, off(f) { subs.delete(f); },
  clear() { L = []; save(); if (isOpen) render(); },
  total: () => L.reduce((s, l) => s + price(l), 0),
  /* add a line; the drawer opens on it unless told not to (the index's quick [+]) */
  add(id, m = 'one', fr = 30, q = 1, o = {}) {
    const p = byId(id); if (!p) return;
    const nl = {id, m: m === 'sub' ? 'sub' : 'one', fr: FREQ.includes(+fr) ? +fr : 30, q: Math.max(1, q | 0)};
    const k = keyOf(nl), l = L.find(x => keyOf(x) === k);
    if (l) l.q = Math.min(99, l.q + nl.q); else L.push(nl);
    NEW = k; save();
    say(p.n + ' added to Your Protocol' + (nl.m === 'sub' ? ', every ' + nl.fr + ' days.' : '.'));
    if (o.open !== false) open(); else if (isOpen) render();
  }
};
count();
addEventListener('storage', e => { if (e.key === KEY) { L = clean(store.get(KEY, [])); count(); if (isOpen) render(); subs.forEach(f => f()); } });

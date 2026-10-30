/* PR6 v7 · Your Protocol: the cart and the subscription on a smaller glass slab that slides out from the main one
   (from the right on desktop, up from the bottom on a phone). Logic from v6/js/protocol.js, unchanged in substance.
   Lines are keyed by id + mode + frequency (one-off and subscription lines never merge); each line is a daily card,
   numbered like the kit: DAILY / 01 for what is taken, RITUAL / 02 for what is applied or taken as needed.
   Prices in CAD (catalogue x1.38, whole dollars). Persisted in localStorage pr6.v7.protocol.
   Logic adapted from v5/js/protocol.js. */
import {byId, keyLine} from './catalog.js';
import {$, $$, esc, money, moneyTotal, pad2, store, ic, say, RM, roll} from './util.js';
import {packHTML} from './renders.js';

const KEY = 'pr6.v7.protocol';
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
export const dispatchLabel = (d = nextDispatch()) => d.toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short'}).toUpperCase().replace(/\./g, '').replace(',', '');

/* the count can be held back a moment (the pack is still in the air on its way to the pill) */
let HOLD = 0, holdT = 0;
function count() {
  const n = L.reduce((s, l) => s + l.q, 0);
  const wait = HOLD - performance.now();
  if (wait > 0) { clearTimeout(holdT); holdT = setTimeout(count, wait + 10); return n; }
  $$('[data-cnt]').forEach(c => { roll(c, pad2(n), {noLabel: true}); c.closest('[data-cnt-wrap]') && c.closest('[data-cnt-wrap]').classList.toggle('has', n > 0); });
  $$('[data-pro]').forEach(b => b.setAttribute('aria-label', 'Your Protocol, ' + n + (n === 1 ? ' item' : ' items')));
  return n;
}

const dw = document.getElementById('drawer'), scrim = document.getElementById('scrim');
let isOpen = false, NEW = null, back = null;
function card(l, label) {
  const p = byId(l.id), k = keyOf(l), sub = l.m === 'sub';
  return `<article class="pc${NEW === k ? ' new' : ''}" data-key="${esc(k)}">
    <a class="pc-v disc-s" href="#/p/${p.id}" data-go aria-hidden="true" tabindex="-1">${packHTML(p)}</a>
    <div class="pc-b">
      <p class="pc-l mono"><span>${label}</span><span class="pc-code">${p.id}</span></p>
      <h3 class="pc-n"><a href="#/p/${p.id}" data-go>${esc(p.n)}</a></h3>
      <p class="pc-k mono">${esc(keyLine(p) || p.q)}</p>
      <div class="pc-m" role="group" aria-label="How often, ${esc(p.n)}">
        <button type="button" class="seg${sub ? '' : ' on'}" data-mode="one" data-k="${esc(k)}" aria-pressed="${!sub}">One-off</button>
        <button type="button" class="seg${sub ? ' on' : ''}" data-mode="sub" data-k="${esc(k)}" aria-pressed="${sub}">Subscribe</button>
        ${sub ? `<label class="fr mono"><span class="sr">Frequency</span><select data-fr="${esc(k)}">${FREQ.map(f => `<option value="${f}"${f === l.fr ? ' selected' : ''}>Every ${f} days</option>`).join('')}</select></label>` : ''}
      </div>
      <div class="pc-f mono">
        <span class="step" role="group" aria-label="Quantity, ${esc(p.n)}"><button type="button" data-k="${esc(k)}" data-d="-1" aria-label="One fewer">${ic('minus', 's')}</button><output aria-live="polite">${l.q}</output><button type="button" data-k="${esc(k)}" data-d="1" aria-label="One more">${ic('plus', 's')}</button></span>
        <button type="button" class="pc-rm" data-rm="${esc(k)}">Remove<span class="sr"> ${esc(p.n)}</span></button>
        <span class="pc-p">${money(price(l))}</span>
      </div>
    </div></article>`;
}
function render() {
  const n = count();
  let d = 0, r = 0;
  const cards = L.map(l => { const p = byId(l.id); return card(l, ritual(p) ? 'RITUAL / ' + pad2(++r) : 'DAILY / ' + pad2(++d)); }).join('');
  const once = L.filter(l => l.m !== 'sub').reduce((s, l) => s + price(l), 0), subT = L.filter(l => l.m === 'sub').reduce((s, l) => s + price(l), 0);
  const hasSub = L.some(l => l.m === 'sub');
  dw.innerHTML = `<header class="dw-h">
      <p class="slab-mark"><span class="wm">PR6</span><i>/</i><span class="mono sec">Your Protocol</span></p>
      <h2 id="dwH" class="sr" tabindex="-1">Your Protocol</h2>
      <p class="dw-n mono">${pad2(L.length)} ${L.length === 1 ? 'line' : 'lines'} · ${pad2(n)} ${n === 1 ? 'item' : 'items'}</p>
      <button class="dw-x mono" type="button" data-close aria-label="Close Your Protocol">${ic('x', 's')}</button>
    </header>
    <div class="dw-b">${n ? cards : `<div class="dw-empty"><p>Nothing in your Protocol yet.</p><p class="mono">Open any entry in the Formulary and choose <b>[+] Add to Protocol</b>: once, or on a schedule.</p><a class="pill" href="#/formulary" data-close><span>Open the Formulary</span> <span class="arr">&rarr;</span></a></div>`}</div>
    ${n ? `<footer class="dw-f">
      <dl class="mono">
        ${once ? `<div><dt>One-off</dt><dd>${money(once)}</dd></div>` : ''}
        ${hasSub ? `<div><dt>Your Protocol, per dispatch</dt><dd>${money(subT)}</dd></div>` : ''}
        <div class="tot"><dt>Subtotal</dt><dd>${moneyTotal(once + subT)}</dd></div>
        <div class="nx"><dt>Next dispatch</dt><dd><i class="live" aria-hidden="true"></i>${dispatchLabel()}</dd></div>
      </dl>
      <button class="pill wide" type="button" data-checkout><span>Checkout</span> <span class="arr">&rarr;</span></button>
      <p class="dw-note mono" role="status"></p>
      <p class="fine mono">Placeholder prices in CAD. Saved on this device. ${hasSub ? 'Change or skip a dispatch from Dispatches.' : ''}</p>
    </footer>` : ''}`;
  bind();
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
  $$('.pc', dw).forEach((c, i) => c.style.setProperty('--i', i));
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

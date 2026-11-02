/* PR6 v14 · the Quote List: replaces Your Protocol. A drawer (from the right on a desktop, up from the bottom on a
   phone) holding lines of compound + vial size + quantity. There is no cart and no card payment: the institution
   requests a quote, PR6 confirms it, the institution issues a purchase order, PR6 releases the lot with its CoA and
   SDS and invoices on the account's terms. Lines are keyed by id + size. Persisted in localStorage pr6.v14.quote. */
import {byId, cad, fmtSize, RUO} from './catalog.js';
import {INST} from './content.js';
import {$, $$, esc, pad2, store, ic, say, RM} from './util.js';
import {posterFor} from './shots.js';

const KEY = 'pr6.v14.quote', SENT = 'pr6.v14.sent';
const clean = a => (Array.isArray(a) ? a : []).filter(l => l && byId(l.id) && l.q > 0).map(l => ({id: l.id, s: l.s ? 1 : 0, q: Math.min(99, Math.max(1, l.q | 0))}));
let L = clean(store.get(KEY, []));
const subs = new Set();
const keyOf = l => l.id + '|' + l.s;
const save = () => { store.set(KEY, L); count(); subs.forEach(f => f()); };
const price = l => byId(l.id).sizes[l.s].price * l.q;

/* the next cold-pack dispatch: Monday, for purchase orders approved before Thursday 12:00 */
export function nextDispatch(now = new Date()) {
  const d = new Date(now), dow = d.getDay(), h = d.getHours();
  const late = dow > 4 || dow === 0 || (dow === 4 && h >= 12);
  d.setDate(d.getDate() + ((8 - dow) % 7 || 7) + (late && dow !== 0 ? 7 : 0));
  return d;
}
export const dispatchLabel = (d = nextDispatch()) => d.toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short'}).replace(/\./g, '').replace(',', '');

let HOLD = 0, holdT = 0;
function count() {
  const n = L.reduce((s, l) => s + l.q, 0);
  const wait = HOLD - performance.now();
  if (wait > 0) { clearTimeout(holdT); holdT = setTimeout(count, wait + 10); return n; }
  $$('[data-cnt]').forEach(c => { c.textContent = n; c.closest('[data-cnt-wrap]') && c.closest('[data-cnt-wrap]').classList.toggle('has', n > 0); });
  $$('[data-pro]').forEach(b => b.setAttribute('aria-label', 'Quote list, ' + n + (n === 1 ? ' vial' : ' vials')));
  return n;
}

const dw = document.getElementById('drawer'), scrim = document.getElementById('scrim');
let isOpen = false, NEW = null, back = null, step = 'list';
function card(l, n) {
  const p = byId(l.id), k = keyOf(l), sz = p.sizes[l.s];
  return `<li class="pc rc${NEW === k ? ' new' : ''}" data-key="${esc(k)}">
    <p class="rc-top mono"><span>LINE / ${pad2(n)}</span><span>${esc(p.lot)}</span></p>
    <a class="rc-im" href="#/p/${p.id}" data-go aria-hidden="true" tabindex="-1"><img class="rc-ph" src="${esc(posterFor(p.id))}" alt="" loading="lazy" decoding="async"></a>
    <div class="pc-b">
      <h3 class="pc-n"><a href="#/p/${p.id}" data-go>${esc(p.n)}</a></h3>
      <p class="pc-k"><span class="mono">${p.id}</span> ${esc(p.form)}</p>
      <div class="pc-m" role="group" aria-label="Vial size, ${esc(p.n)}">
        ${p.sizes.map((s, j) => `<button type="button" class="seg${j === l.s ? ' on' : ''}" data-size="${j}" data-k="${esc(k)}" aria-pressed="${j === l.s}">${esc(fmtSize(s))}</button>`).join('')}
      </div>
      <div class="pc-f">
        <span class="step rc-step" role="group" aria-label="Vials, ${esc(p.n)}"><button type="button" class="mono" data-k="${esc(k)}" data-d="-1" aria-label="One fewer">[&minus;]</button><output class="mono" aria-live="polite">${l.q}</output><button type="button" class="mono" data-k="${esc(k)}" data-d="1" aria-label="One more">[+]</button></span>
        <button type="button" class="pc-rm" data-rm="${esc(k)}">Remove<span class="sr"> ${esc(p.n)}</span></button>
        <span class="pc-p mono">${cad(price(l))}</span>
      </div>
    </div></li>`;
}
const head = (t, n) => `<div class="dw-glass" aria-hidden="true"></div>
    <header class="dw-h">
      <h2 id="dwH" class="dw-t" tabindex="-1">${t}</h2>
      <p class="dw-n">${n}</p>
      <button class="dw-x" type="button" data-close aria-label="Close the quote list">${ic('x')}</button>
    </header>`;
function render() {
  const n = count();
  if (step === 'req' && n) return renderReq();
  if (step === 'sent') return renderSent();
  step = 'list';
  const sub = L.reduce((s, l) => s + price(l), 0);
  dw.innerHTML = `${head('Quote list', n ? `${n} ${n === 1 ? 'vial' : 'vials'}` : 'Empty')}
    <div class="dw-b">${n ? `<ol class="pcs">${L.map((l, i) => card(l, i + 1)).join('')}</ol>` : `<div class="dw-empty"><p class="dw-e1">Nothing on the list yet.</p><p>Open any compound and choose Add to quote. PR6 confirms the quote, then your institution issues a purchase order.</p><a class="lnk" href="#/catalogue" data-close>Open the catalogue <span aria-hidden="true">&rarr;</span></a></div>`}</div>
    ${n ? `<footer class="dw-f">
      <dl>
        <div class="tot"><dt>List value</dt><dd class="mono">${cad(sub)}</dd></div>
        <div><dt>Terms</dt><dd>${esc(INST.terms)}</dd></div>
        <div class="nx"><dt>Next cold-pack dispatch</dt><dd class="mono">${dispatchLabel()}</dd></div>
      </dl>
      <button class="btn wide" type="button" data-req><span class="pl">REQUEST QUOTE</span><span class="arr" aria-hidden="true">&rarr;</span></button>
      <p class="fine">Sample prices in CAD, before tax and cold-pack shipping. Saved on this device.</p>
    </footer>` : ''}`;
  bind();
}
/* the request: PO number (optional now, required before release), ship-to site, the end-use statement */
function renderReq() {
  const n = count(), sub = L.reduce((s, l) => s + price(l), 0);
  dw.innerHTML = `${head('Request a quote', `${n} ${n === 1 ? 'vial' : 'vials'} · ${cad(sub)}`)}
    <form class="dw-b qf" data-qf novalidate>
      <p class="qf-l">For <b>${esc(INST.name)}</b>, ${esc(INST.unit)}. Account <span class="mono">${INST.acct}</span>.</p>
      <label class="fl"><span class="fl-l">Ship to</span><select class="fl-in" name="site">${INST.sites.map(([nm, ad], i) => `<option value="${i}">${esc(nm)}: ${esc(ad)}</option>`).join('')}</select></label>
      <label class="fl"><span class="fl-l">Purchase order no. <span class="opt-l">(can follow the quote)</span></span><input class="fl-in mono" name="po" autocomplete="off" placeholder="PO-"></label>
      <label class="fl"><span class="fl-l">Research use, one line</span><textarea class="fl-in" name="use" rows="3" placeholder="The study or method these compounds are for"></textarea></label>
      <label class="ck"><input type="checkbox" name="ruo"><span>I confirm these compounds are for laboratory research use at the address above only, and are not for human or veterinary use, or for resale.</span></label>
      <div class="qf-a"><button class="btn wide" type="submit"><span class="pl">SEND REQUEST</span><span class="arr" aria-hidden="true">&rarr;</span></button>
        <button class="lnk" type="button" data-backlist>Back to the list</button>
        <p class="mf-s" role="status"></p></div>
      <p class="fine">${esc(RUO)} PR6 may decline any request.</p>
    </form>`;
  bind();
  const f = $('[data-qf]', dw);
  f.addEventListener('submit', e => {
    e.preventDefault();
    const s = $('.mf-s', f);
    f.use.toggleAttribute('aria-invalid', !f.use.value.trim());
    if (!f.use.value.trim()) { s.textContent = 'Add one line on the research use.'; f.use.focus(); return; }
    if (!f.ruo.checked) { s.textContent = 'Please confirm the research-use statement.'; f.ruo.focus(); return; }
    const sent = store.get(SENT, []); const no = 'Q-2026-' + String(118 + sent.length).padStart(4, '0');
    sent.unshift({no, d: new Date().toISOString().slice(0, 10), lines: L.map(l => ({...l})), po: f.po.value.trim(), site: +f.site.value});
    store.set(SENT, sent.slice(0, 12));
    L = []; save(); step = 'sent'; render();
    say('Quote request ' + no + ' sent.');
  });
}
function renderSent() {
  const last = (store.get(SENT, []) || [])[0];
  dw.innerHTML = `${head('Request sent', last ? last.no : '')}
    <div class="dw-b"><div class="dw-empty">
      <p class="dw-e1">PR6 has your request${last ? ` <span class="mono">${last.no}</span>` : ''}.</p>
      <p>Your account manager confirms prices and availability by email within one business day. Lots ship once the purchase order is in, each with its CoA and SDS.</p>
      <p class="fine">In this preview nothing has been sent.</p>
      <a class="lnk" href="#/m/orders" data-close>See orders and quotes <span aria-hidden="true">&rarr;</span></a></div></div>`;
  bind(); step = 'list';
}
function find(k) { return L.find(x => keyOf(x) === k); }
function bind() {
  $$('[data-close]', dw).forEach(b => b.addEventListener('click', () => close()));
  $$('[data-go]', dw).forEach(a => a.addEventListener('click', () => close(false)));
  const rq = $('[data-req]', dw); if (rq) rq.onclick = () => { step = 'req'; render(); $('#dwH', dw).focus(); };
  const bl = $('[data-backlist]', dw); if (bl) bl.onclick = () => { step = 'list'; render(); $('#dwH', dw).focus(); };
  $$('[data-d]', dw).forEach(b => b.onclick = () => {
    const l = find(b.dataset.k); if (!l) return; l.q += +b.dataset.d; NEW = null;
    if (l.q <= 0) { L.splice(L.indexOf(l), 1); say('Removed ' + byId(l.id).n + '.'); save(); render(); $('#dwH', dw).focus(); return; }
    l.q = Math.min(99, l.q); save(); render(); const nb = $(`[data-k="${CSS.escape(keyOf(l))}"][data-d="${b.dataset.d}"]`, dw); if (nb) nb.focus();
  });
  $$('[data-rm]', dw).forEach(b => b.onclick = () => { const l = find(b.dataset.rm); if (!l) return; L.splice(L.indexOf(l), 1); NEW = null; save(); render(); say('Removed ' + byId(l.id).n + '.'); $('#dwH', dw).focus(); });
  $$('[data-size]', dw).forEach(b => b.onclick = () => {
    const l = find(b.dataset.k); const s = +b.dataset.size; if (!l || l.s === s) return;
    const other = L.find(x => x !== l && x.id === l.id && x.s === s);
    if (other) { other.q = Math.min(99, other.q + l.q); L.splice(L.indexOf(l), 1); NEW = keyOf(other); } else { l.s = s; NEW = keyOf(l); }
    save(); render(); const nb = $(`[data-k="${CSS.escape(NEW)}"][data-size="${s}"]`, dw); if (nb) nb.focus();
  });
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
  setTimeout(() => { if (!isOpen) { dw.hidden = true; scrim.hidden = true; step = 'list'; } }, RM ? 0 : 620);
  if (restore && back && document.contains(back)) back.focus({preventScroll: true});
}
scrim.addEventListener('click', () => close());
dw.addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.preventDefault(); close(); return; }
  if (e.key !== 'Tab') return; const f = $$('button,a[href],select,input,textarea,[tabindex="0"]', dw).filter(x => !x.disabled && x.offsetParent && x.tabIndex !== -1); if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
});

export const Quote = {
  KEY, lines: () => L.map(l => ({...l})), sent: () => store.get(SENT, []), count, open, close, render, get isOpen() { return isOpen; },
  hold(ms) { HOLD = performance.now() + ms; },
  size: () => L.reduce((s, l) => s + l.q, 0),
  on(f) { subs.add(f); }, off(f) { subs.delete(f); },
  clear() { L = []; save(); if (isOpen) render(); },
  total: () => L.reduce((s, l) => s + price(l), 0),
  add(id, s = 0, q = 1, o = {}) {
    const p = byId(id); if (!p) return;
    const nl = {id, s: s ? 1 : 0, q: Math.max(1, q | 0)};
    const k = keyOf(nl), l = L.find(x => keyOf(x) === k);
    if (l) l.q = Math.min(99, l.q + nl.q); else L.push(nl);
    NEW = k; step = 'list'; save();
    say(`${p.n}, ${fmtSize(p.sizes[nl.s])}, added to the quote list.`);
    if (o.open !== false) open(); else if (isOpen) render();
  }
};
count();
addEventListener('storage', e => { if (e.key === KEY) { L = clean(store.get(KEY, [])); count(); if (isOpen) render(); subs.forEach(f => f()); } });

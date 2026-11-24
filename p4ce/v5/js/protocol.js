/* P4CE v5 · Your Protocol: the cart as a daily ritual (pin #1: DAWN AM-01 [MORNING] 08:02).
   Lines are keyed by id + mode + frequency; one-time and subscription lines never merge. localStorage p4ce.v5.protocol */
import {byId, keyLine, SLOTS, slotsFor, PACK} from './catalog.js';
import {$, $$, esc, money, pad2, store, ic, say, RM, isPhone, tween, E} from './util.js';
import {frames, hasRender, cleanImgs} from './renders.js';
import {Stage, rectOf} from './stage.js';

const KEY = 'p4ce.v5.protocol';
let L = (store.get(KEY, []) || []).filter(l => l && byId(l.id));
const subs = new Set();
const keyOf = (id, m, fr) => id + '|' + m + '|' + (m === 'sub' ? fr : 0);
const save = () => { store.set(KEY, L); subs.forEach(f => f()); count(); };
const hm = m => pad2(Math.floor(m / 60) % 24) + ':' + pad2(m % 60);
const ap = t => { const [h, m] = t.split(':').map(Number); return pad2(((h + 11) % 12) + 1) + ':' + pad2(m) + (h < 12 ? ' AM' : ' PM'); };

function count() {
  const n = L.reduce((s, l) => s + l.q, 0);
  $$('[data-cnt]').forEach(c => c.textContent = n);
  const b = $('#bPro'); if (b) b.setAttribute('aria-label', 'Your Protocol, ' + n + (n === 1 ? ' item' : ' items'));
  return n;
}
function ritual() {
  const out = {am: [], md: [], pm: []};
  L.forEach(l => { const p = byId(l.id); slotsFor(p).forEach(s => out[s].push({l, p})); });
  SLOTS.forEach(S => out[S.k].forEach((c, j) => { c.code = S.code + '-' + pad2(j + 1); c.time = hm(S.base + j * 4); c.S = S; }));
  return out;
}
/* dot-matrix numerals, after pin #21: used once, for the time in the drawer */
const DM = {0: '01110100011001110101110011000101110', 1: '00100011000010000100001000010001110', 2: '01110100010000100010001000100011111', 3: '11111000100010000010000011000101110', 4: '00010001100101010010111110001000010', 5: '11111100001111000001000011000101110', 6: '00110010001000011110100011000101110', 7: '11111000010001000100010000100001000', 8: '01110100011000101110100011000101110', 9: '01110100011000101111000010001001100'};
function dotMatrix(str) {
  let x = 0, d = '';
  for (const ch of str) {
    if (ch === ':') { for (let r = 0; r < 7; r++) d += `<circle cx="${x + .5}" cy="${r + .5}" r=".36"${r === 2 || r === 4 ? '' : ' class="off"'}/>`; x += 2; continue; }
    const g = DM[ch]; if (!g) continue;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) d += `<circle cx="${x + c + .5}" cy="${r + .5}" r=".36"${g[r * 5 + c] === '1' ? '' : ' class="off"'}/>`;
    x += 6;
  }
  return `<svg class="dm" viewBox="0 0 ${x - 1} 7" aria-hidden="true">${d}</svg>`;
}

const dw = document.getElementById('drawer'), scrim = document.getElementById('scrim');
let isOpen = false, NEW = null, back = null;
function render() {
  const R = ritual(), n = count();
  const now = new Date(), t = hm(now.getHours() * 60 + now.getMinutes());
  /* one card per line, under the first part of the day it slots into, carrying every slot it takes */
  const lines = new Map();
  SLOTS.forEach(S => R[S.k].forEach(c => { const e = lines.get(c.l); if (e) e.at.push(c); else lines.set(c.l, {first: S.k, at: [c], l: c.l, p: c.p}); }));
  const card = e => {
    const l = e.l, p = e.p, k = keyOf(l.id, l.m, l.fr), pr = (l.m === 'sub' ? p.ps : p.po) * l.q;
    const dayF = c => { const [h, mi] = c.time.split(':').map(Number); return ((h * 60 + mi) / 1440 * 100).toFixed(1); };
    const vis = hasRender(p.id) ? `<img src="${esc(frames(p.id)[0] || '')}" data-clean="280" alt="" decoding="async">` : `<span class="nocv mono">${p.id}</span>`;
    return `<article class="card${NEW === k ? ' new' : ''}" data-key="${esc(k)}" aria-label="${e.at.map(c => `${c.S.w} ${c.code}, ${ap(c.time)}`).join('; ')}: ${esc(p.n)}">
      <div class="cv" data-cv="${esc(k)}" aria-hidden="true">${vis}</div>
      <div class="cb">
        ${e.at.map(c => `<p class="cd mono"><span>${c.S.w.toUpperCase()} ${c.code}</span><span class="ct">[${c.S.tag.toUpperCase()}] ${ap(c.time)}</span></p>`).join('')}
        <div class="tln" aria-hidden="true">${e.at.map(c => `<i style="left:${dayF(c)}%"></i>`).join('')}</div>
        <p class="nm">${esc(p.n)}</p>
        <p class="ing mono">${esc(keyLine(p))}${p.top ? ' <span class="sample">Sample</span>' : ''}</p>
        <p class="md mono">[${l.m === 'sub' ? '&#8635;' : '1'}] ${l.m === 'sub' ? 'Every ' + l.fr + ' days' : 'One-time'}</p>
        <div class="cf mono"><span class="step" role="group" aria-label="Quantity of ${esc(p.n)}, ${l.m === 'sub' ? 'every ' + l.fr + ' days' : 'one-time'}"><button type="button" data-k="${esc(k)}" data-d="-1" aria-label="Decrease">${ic('minus', 's')}</button><output>${l.q}</output><button type="button" data-k="${esc(k)}" data-d="1" aria-label="Increase">${ic('plus', 's')}</button></span><span class="pr">${money(pr)}</span><button class="rm" type="button" data-rm="${esc(k)}">Remove<span class="sr"> ${esc(p.n)}</span></button></div>
      </div></article>`;
  };
  const tOnce = L.filter(l => l.m !== 'sub').reduce((s, l) => s + byId(l.id).po * l.q, 0), tSub = L.filter(l => l.m === 'sub').reduce((s, l) => s + byId(l.id).ps * l.q, 0);
  dw.innerHTML = `<header class="dw-h"><h2 id="dwH" tabindex="-1">Your <em>Protocol</em></h2><span class="dw-clock" role="img" aria-label="Now ${t}">${dotMatrix(t)}</span><button class="dw-x" type="button" data-close aria-label="Close your Protocol">${ic('x')}</button></header>
  <div class="dw-b">${n ? SLOTS.map(S => [S, [...lines.values()].filter(e => e.first === S.k)]).filter(g => g[1].length).map(([S, es]) => `<section class="dw-g" aria-label="${S.w}, ${S.tag}"><h3 class="mono"><span>${S.w} · ${S.code}</span><span>${S.tag}</span></h3>${es.map(card).join('')}</section>`).join('')
    : `<p class="dw-empty">Nothing in your day yet. Products slot in by the time their directions give: morning, daily or evening.</p>`}</div>
  <footer class="dw-f">${n ? `<dl><div><dt>One-time</dt><dd class="mono">${money(tOnce)}</dd></div><div><dt>Subscription, per dispatch</dt><dd class="mono">${money(tSub)}</dd></div><div class="tot"><dt>Subtotal</dt><dd class="mono">${money(tOnce + tSub)}</dd></div></dl>
    <button class="btn wide" type="button" data-checkout>Checkout</button><p class="dw-note" role="status"></p>` : ''}<p class="fine">Sample prices. Saved on this device.</p></footer>`;
  cleanImgs(dw);
  $$('[data-close]', dw).forEach(b => b.onclick = () => close(true));
  $$('[data-d]', dw).forEach(b => b.onclick = () => { const l = L.find(x => keyOf(x.id, x.m, x.fr) === b.dataset.k); if (!l) return; l.q += +b.dataset.d; if (l.q <= 0) { L.splice(L.indexOf(l), 1); say('Removed ' + byId(l.id).n + '.'); } NEW = null; save(); render(); const nb = $(`[data-k="${CSS.escape(b.dataset.k)}"][data-d="${b.dataset.d}"]`, dw); (nb || $('#dwH', dw)).focus(); });
  $$('[data-rm]', dw).forEach(b => b.onclick = () => { const i = L.findIndex(x => keyOf(x.id, x.m, x.fr) === b.dataset.rm); if (i < 0) return; const nm = byId(L[i].id).n; L.splice(i, 1); NEW = null; save(); render(); say('Removed ' + nm + '.'); $('#dwH', dw).focus(); });
  const co = $('[data-checkout]', dw); if (co) co.onclick = () => { $('.dw-note', dw).textContent = 'Checkout is not live in this preview. Nothing has been charged.'; };
}
function open(o = {}) {
  render();
  if (isOpen) return Promise.resolve();
  isOpen = true; back = document.activeElement;
  dw.hidden = false; scrim.hidden = false;
  document.documentElement.classList.add('dw-open');
  requestAnimationFrame(() => { dw.classList.add('on'); scrim.classList.add('on'); });
  setTimeout(() => $('#dwH', dw).focus({preventScroll: true}), RM ? 0 : 380);
  return new Promise(r => setTimeout(r, RM ? 0 : 420));
}
function close(viaUI) {
  if (!isOpen) return;
  if (viaUI && /^#\/protocol/.test(location.hash)) { history.back(); return; }
  isOpen = false; dw.classList.remove('on'); scrim.classList.remove('on');
  document.documentElement.classList.remove('dw-open');
  setTimeout(() => { if (!isOpen) { dw.hidden = true; scrim.hidden = true; } }, RM ? 0 : 420);
  if (back && document.contains(back)) back.focus({preventScroll: true});
}
scrim.addEventListener('click', () => close(true));
dw.addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
  if (e.key !== 'Tab') return; const f = $$('button,a[href],input,[tabindex="0"]', dw).filter(x => !x.disabled && x.offsetParent); if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
});

export const Protocol = {
  lines: () => L.slice(), count, ritual, render, open, close, get isOpen() { return isOpen; },
  on(f) { subs.add(f); }, off(f) { subs.delete(f); },
  clear() { L = []; save(); },
  /* add, then the drawer opens and a small copy of the product drops into its new card */
  async add(id, m, fr, q, fromEl) {
    const k = keyOf(id, m, fr); let l = L.find(x => keyOf(x.id, x.m, x.fr) === k);
    if (l) l.q = Math.min(99, l.q + q); else { l = {id, m, fr: m === 'sub' ? fr : 30, q}; L.push(l); }
    NEW = k; save();
    const p = byId(id); say(p.n + ' added to your Protocol.');
    let from = null;
    if (fromEl && hasRender(id)) { const r = rectOf(fromEl); from = r.w > 4 ? r : null; if (from && fromEl.matches('.slot')) { const a = Stage.has(id) && Stage.get(id); if (a) from = a.screenRect(); } }
    if (!/^#\/protocol/.test(location.hash)) location.hash = '#/protocol'; else render();
    await open();
    const cv = $(`.card.new [data-cv="${CSS.escape(k)}"]`, dw);
    if (!cv) return;
    cv.scrollIntoView({block: 'nearest'});
    if (!from || RM) { cv.classList.add('in'); return; }
    const im = cv.querySelector('img'); if (im) im.style.opacity = '0';
    /* the copy: the same frame, small, falling into the card it becomes */
    const fa = Stage.has(id) && Stage.get(id);
    await Stage.ghost(id, from, () => { const r = rectOf(cv); return {x: r.x + (r.w - r.h * .8) / 2, y: r.y, w: r.h * .8, h: r.h}; }, {dur: 900, arc: .35, frame: fa ? fa.frame : 0});
    if (im) im.style.opacity = '';
    cv.closest('.card').classList.add('landed');
  }
};
count();
addEventListener('storage', e => { if (e.key === KEY) { L = (store.get(KEY, []) || []).filter(l => l && byId(l.id)); count(); if (isOpen) render(); subs.forEach(f => f()); } });

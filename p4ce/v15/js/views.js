/* PR6 v15 · the institutional portal: the pages. Each is markup plus an init(); app.js mounts it into #page.
   PR6 supplies research compounds only to institutions it has vetted in person; nobody signs up, and the decoy gate
   stays in front. Inside, the catalogue is listed by research area (a field of study, never an outcome) and by
   catalogue number; each compound record carries its lot, its third-party testing and its paperwork (CoA, SDS, HPLC,
   MS). Buying is a quote, then the institution's purchase order, then an invoice on account terms.
   Copy rules: describe the compound, the lot and the paperwork only. No dose, no use in people or animals, no effect,
   no reviews, no people in the pictures. Every figure here is SAMPLE data and says so on screen.
   Pictures: our own path-traced renders of sealed vials (one pale set, relightable under the hand: js/light.js).
   Type: six sizes, two weights, mono only for real data. Canadian spelling, CA$. */
import {AREAS, ALL, byId, areaOf, cad, range, RUO, fmtSize, SAMPLE} from './catalog.js';
import {$, $$, esc, ic, say, store, RM, clamp, lerp, isPhone, Spring, E} from './util.js';
import {Quote, dispatchLabel} from './quote.js';
import {FEED, FEED_KINDS, INST, ORDERS, NEW, REFS, refsFor, fmtDate} from './content.js';
import {relight, LIGHT, sweep, setScrollDriver, kick, lightNow, dawn as lightDawn} from './light.js';
import * as SH from './shots.js';

const N = ALL.length;
const PAGE = () => document.getElementById('page');
const from = p => cad(p.sizes[0].price);
export const colData = a => `${a.it.length} compounds <span aria-hidden="true">·</span> ${range(a)}`;
const row = (p, extra = '') => `<li class="row" data-id="${p.id}"><a class="row-a" href="#/p/${p.id}"><span class="r-c mono">${p.id}</span><span class="r-n">${esc(p.n)}</span><span class="r-f">${esc(p.cls)}</span><span class="r-s">${extra || `<span class="mono">${esc(p.lot)}</span>`}</span><span class="r-p mono">${from(p)}</span></a></li>`;
const smp = () => SAMPLE ? ' <span class="smp">Sample</span>' : '';
const foot = () => `<footer class="foot wrap"><p><span class="wm">PR6</span> Research compounds for institutions PR6 has vetted. <span class="ruo-f">${esc(RUO)}</span></p>
  <nav aria-label="About"><a href="#/credits">Credits</a><a href="#/m/liaison">Member Liaison</a><a href="#/exit">Exit this device</a></nav></footer>`;

/* ================================================================ the relightable picture
   The poster is in the markup (first paint, and the fallback); light.js adds the live canvas over it. The mono line
   under it carries the same facts as the ink, for screen readers and for anyone who never presses. */
let uid = 0;
function lightFig(s, o = {}) {
  const id = 'lf' + (++uid);
  const p = o.product, own = !!(s && o.own);
  const label = o.label || (p ? `${p.n}, a sealed vial, in raking light` : 'The PR6 catalogue in one room, in raking light');
  const how = own ? ' Drag across it, or use the arrow keys, to move the light. Hold, or press I, to show the lot and purity printed in ink on the label.' : ' Drag across it, or use the arrow keys, to move the light.';
  const poster = (s && s.poster) || o.poster || '';
  return `<div class="lt-host ${o.cls || ''}" data-lt tabindex="0" role="img" aria-roledescription="relightable photograph" aria-label="${esc(label + '.' + how)}"${o.desc ? ` aria-describedby="${o.desc}"` : ''}${o.vt ? ` style="view-transition-name:${o.vt}"` : ''}>
    ${poster ? `<img class="lt-po" src="${esc(poster)}" alt="" decoding="async"${o.eager ? ' fetchpriority="high"' : ' loading="lazy"'}>` : ''}
  </div>`;
}
/* fit helpers for light.js: where the photograph's centre lands in the box (fx, fy as fractions of the box) and how
   big it is (k: the image's width as a fraction of a portrait box's width, or its height in a landscape box). Past the
   photograph's edges the cyclorama and the floor continue (clamped), so a portrait render can fill any box. */
const placeFit = o => (W, H, iw, ih) => {
  const s0 = Math.max(W / iw, H / ih);
  const portrait = W / H < (o.split || .9);
  const s = portrait ? W * (o.kw || 1) / iw : H * (o.kh || 1) / ih;
  const sx = W / (iw * s), sy = H / (ih * s);
  const fx = portrait ? (o.pfx ?? .5) : (o.fx ?? .5), fy = portrait ? (o.pfy ?? .5) : (o.fy ?? .5);
  return {zoom: s / s0, cx: .5 + sx * (.5 - fx), cy: .5 + sy * (.5 - fy), free: true};
};
/* the disc: the pack (its box from the manifest, pack and contact shadow) centred in the circle with room around it,
   its diagonal about 80% of the disc, so nothing is cut by the rim and the pack reads as seated, not cropped */
const seatFit = shot => (W, H, iw, ih) => {
  const b = shot && shot.box; const s0 = Math.max(W / iw, H / ih);
  if (!b) return {zoom: 1.1, cx: .5, cy: .56};
  const bw = (b[2] - b[0]) * iw, bh = (b[3] - b[1]) * ih, s = .8 * Math.min(W, H) / Math.hypot(bw, bh);
  return {zoom: s / s0, cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2 + .015, free: true};
};
/* v15: the area's counter set as a hero. Wide: the whole sweep, set to the right, type in the empty left. Narrow:
   zoom until the set spans the box and sit it in the lower part, under the type */
const shelfFit = shot => (W, H, iw, ih) => {
  const sb = shot.setBox || [.3, .2, .95, .9], s0 = Math.max(W / iw, H / ih);
  if (W / H >= 1.15) return {zoom: .76, cx: .4, cy: .46, free: true};
  const s = 1.02 * W / ((sb[2] - sb[0]) * iw);
  return {zoom: s / s0, cx: (sb[0] + sb[2]) / 2, cy: (sb[1] + sb[3]) / 2 - .2 * H / (ih * s), free: true};
};
/* the first idle sweep: once the picture is on screen, unless a hand or another sweep came recently */
let lastSweep = -1e9;
function sweepSoon(inst, delay = 1200) {
  if (RM) return;
  let t = 0;
  const go = () => { clearTimeout(t); t = setTimeout(() => { if (inst.destroyed || !inst.vis) return; if (performance.now() - lastSweep < 14000) return; lastSweep = performance.now(); sweep(); }, delay); };
  inst.onVisible = go; if (inst.vis) go();
  return () => clearTimeout(t);
}
/* the scroll drives the light while a picture crosses the screen */
function heroDriver(el) {
  return () => {
    const r = el.getBoundingClientRect(), vh = innerHeight;
    if (r.bottom < 0 || r.top > vh) return null;
    return {x: lerp(-.72, .9, clamp(-r.top / (r.height * .75))), y: .22};
  };
}
const passDriver = el => () => {
  const r = el.getBoundingClientRect(), vh = innerHeight;
  if (r.bottom < 0 || r.top > vh) return null;
  return {x: lerp(-.92, .92, clamp((vh - r.top) / (vh + r.height))), y: .25};
};
const chain = (...fns) => () => { for (const f of fns) { const t = f(); if (t) return t; } return null; };

/* ================================================================ the lineup of the nine lead packs: one render, one
   room, the same light. Phone: swipe through it (a native scroll-snap track over a canvas that pans with it).
   Desktop: the whole row; the pack under the pointer comes forward and the rest recede to about 20%. */
function packsOf(s, n = 9) {
  const raw = s && s.packs;
  let xs = null;
  if (Array.isArray(raw) && raw.length) {
    /* match each collection's lead pack by product id when the manifest names them, else take the row in order */
    const L = SH.leads(), byLead = L.map(p => raw.find(q => q && typeof q === 'object' && (q.id === p.id || q.product === p.id)));
    const list = byLead.every(Boolean) ? byLead : raw;
    xs = list.map(q => {
      if (typeof q === 'number') return q > 1 ? q / s.w : q;
      const b = q.bbox || q.box; if (Array.isArray(b)) { const x = (b[0] + b[2]) / 2; return x > 1 ? x / s.w : x; }
      const x = q.x ?? q.u ?? q.cx ?? q.center ?? (q.x0 != null && q.x1 != null ? (q.x0 + q.x1) / 2 : null);
      return x == null ? null : x > 1 ? x / s.w : x;
    });
    if (xs.some(x => x == null)) xs = null;
  }
  if (!xs || xs.length !== n) xs = Array.from({length: n}, (_, i) => .06 + .88 * (i + .5) / n);
  return xs;
}
function lineupHTML(s, vt) {
  const L = SH.leads();
  return `<div class="lu${s ? '' : ' lu-none'}" data-lu>
      ${s ? lightFig(s, {cls: 'lu-lt', label: 'Nine sealed vials, the first entry of each research area, standing in one row in raking light'}) : ''}
      <ol class="lu-tr" data-lutr>${AREAS.map((co, i) => `<li class="lu-i${i ? '' : ' on'}" data-i="${i}">
        <a class="lu-a" href="#/a/${co.c}" data-c="${co.c}">${s ? '' : `<span class="lu-ph"><img src="${esc(SH.posterFor(L[i].id))}" alt="" loading="lazy" decoding="async"></span>`}
          <span class="lu-cap"><span class="lu-n"><span class="mono">${co.c}</span> ${esc(co.n)}</span><span class="lu-d">${esc(co.s)}</span><span class="lu-m mono">${colData(co)}</span></span></a></li>`).join('')}</ol>
    </div>`;
}
function bindLineup(el, s, onGo) {
  const lu = $('[data-lu]', el); if (!lu) return {destroy() {}};
  const tr = $('[data-lutr]', lu), items = $$('.lu-i', tr), host = $('[data-lt]', lu);
  const xs = packsOf(s);
  const F = {x: new Spring(xs[0], {k: 170, c: 26}), amt: new Spring(0, {k: 140, c: 24})};
  let cur = 0, pan = xs[0], panF = 0;
  const phone = () => getComputedStyle(tr).overflowX !== 'visible';
  const set = k => { if (k === cur) return; cur = k; items.forEach((it, j) => it.classList.toggle('on', j === k)); };
  const spacing = xs.length > 1 ? (xs[xs.length - 1] - xs[0]) / (xs.length - 1) : .1;
  const boxes = (s && Array.isArray(s.packs) ? s.packs : []).map(q => q && (q.box || q.bbox)).filter(b => Array.isArray(b) && b.length === 4 && b[3] <= 1);
  /* desktop: each caption starts under its own pack's left edge (the manifest's boxes; the picture spans the width) */
  const L9 = SH.leads(), bx = s && Array.isArray(s.packs) ? L9.map(p => { const q = s.packs.find(q => q && (q.id === p.id || q.product === p.id)); return q && (q.box || q.bbox); }) : null;
  const okBx = bx && bx.every(b => Array.isArray(b) && b[2] <= 1);
  const boxAt = f => { const a = clamp(Math.floor(f), 0, bx.length - 1), c = Math.min(bx.length - 1, a + 1), t = clamp(f - a); return bx[a].map((v, i) => lerp(v, bx[c][i], t)); };
  const placeCaps = () => {
    if (!okBx || !host || phone()) { tr.style.gridTemplateColumns = ''; tr.style.paddingLeft = ''; return; }
    /* one caption width, each centred under its pack, then nudged apart where two packs stand close */
    const W = host.getBoundingClientRect().width, gx = parseFloat(getComputedStyle(tr).paddingRight) || 40, gap = 12;
    const w = Math.min(160, (W - 2 * gx) / bx.length - gap), n = bx.length;
    const L = bx.map(b => (b[0] + b[2]) / 2 * W - w / 2);
    for (let pass = 0; pass < 3; pass++) {
      L[0] = Math.max(L[0], gx); for (let i = 1; i < n; i++) L[i] = Math.max(L[i], L[i - 1] + w + gap);
      L[n - 1] = Math.min(L[n - 1], W - gx - w); for (let i = n - 2; i >= 0; i--) L[i] = Math.min(L[i], L[i + 1] - w - gap);
    }
    tr.style.paddingLeft = Math.round(L[0]) + 'px';
    tr.style.gridTemplateColumns = L.map((x, i) => (i < n - 1 ? L[i + 1] - x : w).toFixed(1) + 'px').join(' ');
    tr.style.setProperty('--capw', w.toFixed(1) + 'px');
  };
  placeCaps(); addEventListener('resize', placeCaps);
  const band = boxes.length ? {t: Math.min(...boxes.map(b => b[1])), b: Math.max(...boxes.map(b => b[3]))} : {t: .3, b: .78};
  let inst = null;
  if (host && s) {
    inst = relight(host, s, {
      ink: false, hover: true,
      fit: (W, H, iw, ih) => {
        const s0 = Math.max(W / iw, H / ih);
        if (phone()) {
          /* the camera frames the pack in front: its box (from the manifest, eased between neighbours as the row
             is swiped) about half the frame wide or 60% of it tall, whichever comes first, its feet at 78% of the
             frame so the floor and the shadow show; a low tin and a tall pouch both arrive at the same presence */
          const b = okBx ? boxAt(panF) : null;
          if (b) {
            const bw = (b[2] - b[0]) * iw, bh = (b[3] - b[1]) * ih;
            const sc = Math.min(W * .44 / bw, H * .62 / bh, W / (iw * spacing / .62));
            const sy = H / (ih * sc);
            return {zoom: sc / s0, cx: (b[0] + b[2]) / 2, cy: b[3] + (.5 - .78) * sy, free: true};
          }
          const ww = spacing / .46, sc = W / (iw * ww), sy = H / (ih * sc);
          return {zoom: sc / s0, cx: pan, cy: clamp(band.b - .3 * sy, sy / 2, 1 - sy / 2), free: true};
        }
        /* desktop: the whole row across the width, cropped to the band the packs stand in (not the empty wall) */
        const sc = W / iw, sy = H / (ih * sc);
        return {zoom: sc / s0, cx: .5, cy: Math.min(1 - sy / 2, band.b + .13 - sy / 2), free: true};
      },
      focus: () => F.amt.v > .002 ? {x: F.x.v, hw: spacing * .36, amt: F.amt.v, feather: spacing * .42} : null,
      tick: dt => { F.x.step(dt); F.amt.step(dt); return !(F.x.rest && F.amt.rest); },
      onTap: () => { if (!phone()) onGo(AREAS[cur].c, cur); }
    });
    /* desktop: the pack under the pointer comes forward */
    host.addEventListener('pointermove', e => {
      if (phone() || e.pointerType === 'touch') return;
      const r = host.getBoundingClientRect(); const u = (e.clientX - r.left) / r.width;
      let b = 0, bd = 9; xs.forEach((x, j) => { const d = Math.abs(x - u); if (d < bd) { bd = d; b = j; } });
      set(b); F.x.set(xs[b]); F.amt.set(1); kick();
    });
    host.addEventListener('pointerleave', () => { if (!phone()) { F.amt.set(0); kick(); } });
    host.style.cursor = 'pointer';
  }
  /* desktop: a caption under each pack; focus or hover on a caption brings its pack forward */
  tr.addEventListener('pointerover', e => { if (phone()) return; const it = e.target.closest('.lu-i'); if (!it) return; const k = +it.dataset.i; set(k); F.x.set(xs[k]); F.amt.set(1); kick(); });
  tr.addEventListener('pointerleave', () => { if (!phone()) { F.amt.set(0); kick(); } });
  tr.addEventListener('focusin', e => { const it = e.target.closest('.lu-i'); if (!it) return; const k = +it.dataset.i; set(k); F.x.set(xs[k]); F.amt.set(phone() ? 0 : 1); if (phone()) go(k, 'auto'); kick(); });
  tr.addEventListener('focusout', e => { if (!tr.contains(e.relatedTarget) && !phone()) { F.amt.set(0); kick(); } });
  /* phone: the track's scroll pans the photograph, and sweeps the light along the row */
  const onTr = () => {
    if (!phone()) return;
    const max = Math.max(1, tr.scrollWidth - tr.clientWidth), t = tr.scrollLeft / max;
    const f = t * (items.length - 1), k = Math.round(f);
    set(clamp(k, 0, items.length - 1));
    const a = Math.floor(f), b = Math.min(items.length - 1, a + 1);
    pan = lerp(xs[clamp(a, 0, items.length - 1)], xs[b], f - a);
    panF = clamp(f, 0, items.length - 1);
    if (!RM && lightNow() - LIGHT.hand > 400) { LIGHT.set(lerp(-.85, .85, t)); }
    if (inst) inst.poDirty = true;
    kick();
  };
  tr.addEventListener('scroll', onTr, {passive: true});
  const go = (k, behavior) => { const it = items[clamp(k, 0, items.length - 1)]; tr.scrollTo({left: it.offsetLeft - (tr.clientWidth - it.offsetWidth) / 2, behavior: behavior || (RM ? 'auto' : 'smooth')}); };
  tr.addEventListener('click', e => { const a = e.target.closest('[data-c]'); if (!a) return; e.preventDefault(); onGo(a.dataset.c, +a.closest('.lu-i').dataset.i); });
  /* the pack's frame, for the view transition into its collection */
  const frame = k => {
    if (!inst || !host) return null;
    const r = host.getBoundingClientRect(); const fit = inst.state();
    const x = xs[k];
    /* the box on screen around pack k: half a spacing either side, the middle 80% of the height */
    const pf = inst.o.fit(inst.W || r.width, inst.H || r.height, inst.iw || 1, inst.ih || 1);
    const s0 = Math.max((inst.W || r.width) / (inst.iw || 1), (inst.H || r.height) / (inst.ih || 1)), sc = s0 * pf.zoom;
    const sx = (inst.W || r.width) / ((inst.iw || 1) * sc), ox = pf.cx - sx / 2;
    const u0 = (x - spacing * .55 - ox) / sx, u1 = (x + spacing * .55 - ox) / sx;
    return {r, u0: clamp(u0), u1: clamp(u1), fit};
  };
  return {inst, go, frame, get index() { return cur; }, destroy() { removeEventListener('resize', placeCaps); inst && inst.destroy(); }};
}

/* ================================================================ the paperwork: one sheet per document, in a modal.
   Every sheet is a placeholder layout for the testing lab's real document and says so in its own header. */
const DOCS = {coa: 'Certificate of analysis', sds: 'Safety data sheet', hplc: 'HPLC chromatogram', ms: 'Mass spectrum'};
const docBtns = (p, cls = '') => `<ul class="docs ${cls}">${Object.entries(DOCS).map(([k, n]) => `<li><button type="button" class="doc-b" data-doc="${k}" data-id="${p.id}"><span class="doc-n">${n}</span><span class="doc-m mono">${k.toUpperCase()} <span aria-hidden="true">·</span> ${esc(p.lot)}</span></button></li>`).join('')}</ul>`;
const SDS16 = ['Identification', 'Hazard identification', 'Composition', 'First-aid measures', 'Fire-fighting measures', 'Accidental release measures', 'Handling and storage', 'Exposure controls and personal protection', 'Physical and chemical properties', 'Stability and reactivity', 'Toxicological information', 'Ecological information', 'Disposal considerations', 'Transport information', 'Regulatory information', 'Other information'];
function docSheet(kind, p) {
  const a = areaOf(p);
  const headr = `<header class="sh-hd"><p class="wm">PR6</p><p class="mono">${esc(DOCS[kind].toUpperCase())}</p></header>
    <p class="sh-smp">Sample layout. The testing lab's signed document for this lot replaces this sheet.</p>
    <dl class="sh-id"><div><dt>Catalogue no.</dt><dd class="mono">${p.id}</dd></div><div><dt>Name</dt><dd>${esc(p.n)}</dd></div><div><dt>Lot</dt><dd class="mono">${esc(p.lot)}</dd></div><div><dt>Research area</dt><dd>${a.c} ${esc(a.n)}</dd></div></dl>`;
  let body = '';
  if (kind === 'coa') body = `<table class="tbl sh-t"><thead><tr><th scope="col">Test</th><th scope="col">Method</th><th scope="col">Specification</th><th scope="col">Result</th></tr></thead><tbody>
      <tr><td>Appearance</td><td>Visual</td><td>White lyophilised powder</td><td>[Conforms]</td></tr>
      <tr><td>Identity</td><td>ESI-MS</td><td>[Theoretical mass] ± 1 Da</td><td class="mono">[observed]</td></tr>
      <tr><td>Purity</td><td>RP-HPLC, 220 nm</td><td>[≥ spec]%</td><td class="mono">${esc(p.purity)}</td></tr>
      <tr><td>Peptide content</td><td>[Method]</td><td>[spec]</td><td class="mono">[result]</td></tr>
      <tr><td>Water content</td><td>Karl Fischer</td><td>[spec]</td><td class="mono">[result]</td></tr>
      <tr><td>Counter-ion</td><td>[Method]</td><td>[spec]</td><td class="mono">[result]</td></tr></tbody></table>
    <dl class="sh-id sh-sig"><div><dt>Tested by</dt><dd>${esc(p.tested)}</dd></div><div><dt>Date</dt><dd>${fmtDate(p.tdate)}</dd></div><div><dt>Approved</dt><dd>[Name, title, signature]</dd></div></dl>`;
  if (kind === 'sds') body = `<ol class="sh-sds">${SDS16.map((s, i) => `<li><span class="mono">${String(i + 1).padStart(2, '0')}</span> ${esc(s)} <span class="sh-ph">[from the supplier's SDS]</span></li>`).join('')}</ol>`;
  if (kind === 'hplc' || kind === 'ms') body = `<div class="sh-fig" role="img" aria-label="Placeholder for the testing lab's ${kind === 'hplc' ? 'chromatogram' : 'mass spectrum'}"><p class="mono">${kind === 'hplc' ? 'RP-HPLC, 220 nm' : 'ESI-MS'} <span aria-hidden="true">·</span> ${esc(p.lot)}</p><p>The testing lab's ${kind === 'hplc' ? 'chromatogram' : 'spectrum'} for this lot is placed here, as issued.</p></div>`;
  return `${headr}${body}<p class="sh-ruo mono">${esc(RUO.toUpperCase())}</p>`;
}
let docEl = null;
function openDoc(kind, id, opener) {
  const p = byId(id); if (!p || !DOCS[kind]) return;
  if (!docEl) {
    docEl = document.createElement('dialog'); docEl.className = 'doc'; docEl.setAttribute('aria-labelledby', 'docH');
    document.body.appendChild(docEl);
    docEl.addEventListener('click', e => { if (e.target === docEl || e.target.closest('[data-docx]')) docEl.close(); });
    docEl.addEventListener('close', () => { if (docEl.__back && document.contains(docEl.__back)) docEl.__back.focus({preventScroll: true}); });
  }
  docEl.__back = opener || null;
  docEl.innerHTML = `<div class="doc-in"><div class="doc-top"><h2 id="docH" class="doc-t">${esc(DOCS[kind])}, <span class="mono">${esc(p.lot)}</span></h2><button type="button" class="sh-x" data-docx>Close</button></div>
    <article class="sheet">${docSheet(kind, p)}</article>
    <p class="fine">In the live portal this opens the PDF and keeps a copy in the Dossier with the order it shipped with.</p></div>`;
  docEl.showModal();
  $('[data-docx]', docEl).focus();
}
/* any page: a document button opens its sheet */
function bindDocs(el) { el.addEventListener('click', e => { const b = e.target.closest('[data-doc]'); if (!b) return; e.preventDefault(); openDoc(b.dataset.doc, b.dataset.id, b); }); }

/* ================================================================ home: the vial, the nine areas, how buying works, notices */
const STEPS = [
  ['01', 'Quote', 'Add compounds and vial sizes to the quote list and send it. Nothing is charged.'],
  ['02', 'Confirmation', 'PR6 confirms price, lot and dispatch date in writing, usually the same business day.'],
  ['03', 'Purchase order', 'Your institution issues a purchase order against the confirmed quote.'],
  ['04', 'Release and invoice', 'The lot ships cold-packed with its CoA and SDS. Invoice on your account terms.']
];
function home(o = {}) {
  const hs = SH.heroFor(), hp = SH.productOf(hs), own = !!(hs && hs.product === hp.id && hs.passes && hs.passes.ink);
  const L = SH.lineup();
  const notices = FEED.slice(0, 3);
  return {
    key: 'catalogue', cls: 'v-home', title: 'PR6 · The Catalogue', crumb: {label: 'The Catalogue', back: '#/'},
    html: `<section class="hero h-home" data-hero aria-labelledby="hH">
        ${lightFig(hs, {cls: 'hero-lt', product: hp, own, eager: true, desc: 'hInk'})}
        <div class="hero-t wrap"><h1 id="hH" class="t-disp hero-h" tabindex="-1">Every lot, on the record.</h1></div>
        <div class="hero-f wrap"><p class="ink-l mono" id="hInk"><span class="ink-c">${hp.id}</span> ${esc(hp.n)} <span aria-hidden="true">·</span> ${esc(SH.inkLine(hp))}</p>
          ${own ? `<p class="hint" data-hint aria-hidden="true">Hold the vial to read its lot.</p>` : ''}</div>
      </section>

      <section class="sec lu-sec" aria-labelledby="fH">
        <header class="wrap sec-h"><h2 id="fH" class="t-head">The Catalogue</h2>
          <p class="sec-l">Nine research areas, ${N} compounds${smp()}, each lot tested by a third-party lab. <span class="only-ph">Swipe along the row; tap</span><span class="only-dt">Choose</span> a vial to open its area.</p></header>
        ${lineupHTML(L)}
      </section>

      <section class="sec ix-sec wrap" aria-labelledby="xH">
        <h2 id="xH" class="t-title sec-k">Research areas</h2>
        ${areaIndex()}
        <p class="sec-more"><a class="u" href="#/index">Every compound on one list</a></p>
      </section>

      <section class="sec wrap how" aria-labelledby="bH">
        <h2 id="bH" class="t-title sec-k">How ${esc(INST.name)} buys</h2>
        <ol class="steps">${STEPS.map(([n, t, d]) => `<li><p class="mono st-n">${n}</p><h3 class="st-t">${esc(t)}</h3><p class="st-d">${esc(d)}</p></li>`).join('')}</ol>
        <p class="fine">Account <span class="mono">${INST.acct}</span>, ${esc(INST.terms)}. Payment by EFT or wire against the invoice; there is no card checkout.</p>
      </section>

      <section class="night" data-tone="night" aria-labelledby="nH">
        <div class="night-in wrap">
          <figure class="night-ph"><img src="assets/img/night-m.webp" srcset="assets/img/night-m.webp 900w, assets/img/night-d.webp 1800w" sizes="(max-width: 860px) 100vw, 44vw" alt="Object 0047, the frosted cube, glowing on black" loading="lazy" decoding="async"></figure>
          <div class="night-t">
            <h2 id="nH" class="t-head">Field Club</h2>
            <p class="sec-l">Notices from PR6: new lots, new entries, document updates and dispatch windows.${smp()}</p>
            <ol class="lv">${notices.map(fd => `<li class="lv-r"><p class="lv-k mono">${fmtDate(fd.d)}</p><p class="lv-v"><b>${esc(fd.t)}.</b> ${esc(fd.b)}</p></li>`).join('')}</ol>
            <a class="u more" href="#/club">Open Field Club</a>
          </div>
        </div>
      </section>
      ${foot()}`,
    init(el, ctx) {
      const hero = $('[data-hero]', el), host = $('.hero-lt', el);
      const inst = hs ? relight(host, hs, {product: hp, ink: own, fit: placeFit({kw: .98, pfx: .5, pfy: .56, kh: .96, fx: .7, fy: .52}),
        onInk: on => { if (on) hint(false); } }) : null;
      const hintEl = $('[data-hint]', el);
      const hint = on => { if (hintEl) hintEl.classList.toggle('on', on); };
      let stopSweep = () => {};
      if (inst) {
        if (ctx.fromGate) {
          hero.classList.add('dark');
          const go = () => { hero.classList.add('dawn'); lightDawn(RM ? 400 : 1500).then(() => { hero.classList.remove('dark'); ctx.onDawn && ctx.onDawn(); setTimeout(() => { if (!RM) { lastSweep = performance.now(); sweep(); } }, 1200); }); };
          if (inst.ready || inst.failed || inst.mode === 'poster') setTimeout(go, 60); else { inst.onReady = go; setTimeout(() => { if (!hero.classList.contains('dawn')) go(); }, 2200); }
        } else stopSweep = sweepSoon(inst, 1200) || stopSweep;
      }
      const hintT = own && !RM ? setTimeout(() => { if (lightNow() - LIGHT.hand > 4000) hint(true); }, ctx.fromGate ? 7600 : 6200) : 0;
      if (host) host.addEventListener('pointerdown', () => setTimeout(() => hint(false), 700), {once: true});
      const lu = bindLineup(el, L, (c, k) => ctx.toCollection(c, k, lu));
      setScrollDriver(chain(heroDriver(hero), passDriver($('[data-lu]', el))));
      return {lineup: lu, light: inst, destroy() { clearTimeout(hintT); stopSweep(); inst && inst.destroy(); lu.destroy(); setScrollDriver(null); }};
    }
  };
}
/* the nine areas as type rows: number, name, what is studied, count, CA$ range */
const areaIndex = () => `<ol class="cx">${AREAS.map(a => `<li><a class="cx-a" href="#/a/${a.c}"><span class="cx-c mono">${a.c}</span><span class="cx-n">${esc(a.n)}</span><span class="cx-d">${esc(a.s)}</span><span class="cx-m mono">${a.it.length} compounds</span><span class="cx-p mono">${range(a)}</span></a></li>`).join('')}</ol>`;

/* ================================================================ The Catalogue: the lineup and the nine rows */
function catalogue() {
  const L = SH.lineup();
  return {
    key: 'catalogue', cls: 'v-fm', title: 'PR6 · The Catalogue', crumb: {label: 'The Catalogue', back: '#/'},
    html: `<section class="sec fm-page" aria-labelledby="fpH">
        <header class="wrap sec-h"><h1 id="fpH" class="t-head" tabindex="-1">The Catalogue</h1>
          <p class="sec-l">Nine research areas, ${N} compounds${smp()}. Or open <a class="u" href="#/index">every compound on one list</a>.</p></header>
        ${lineupHTML(L)}
      </section>
      <section class="sec ix-sec wrap" aria-label="Research areas">${areaIndex()}</section>${foot()}`,
    init(el, ctx) { const lu = bindLineup(el, L, (c, k) => ctx.toCollection(c, k, lu)); setScrollDriver(passDriver($('[data-lu]', el))); if (lu.inst) sweepSoon(lu.inst, 900); return {lineup: lu, destroy() { lu.destroy(); setScrollDriver(null); }}; }
  };
}

/* ================================================================ every compound, one line each */
function index() {
  return {
    key: 'index', cls: 'v-index', title: 'PR6 · Every compound', crumb: {label: 'Every compound', back: '#/catalogue'},
    html: `<header class="wrap tp-h"><h1 class="t-head" tabindex="-1">Every compound</h1>
        <p class="sec-l">${N} compounds in nine research areas, one line each, with the lot now on sale${smp()}. Prices per vial in Canadian dollars, before tax, on account terms.</p></header>
      <div class="wrap ixl">${AREAS.map(a => `<section class="ix-g" aria-labelledby="g${a.c}">
          <h2 class="t-title ix-h" id="g${a.c}"><a href="#/a/${a.c}"><span class="mono">${a.c}</span> ${esc(a.n)}</a></h2>
          <p class="ix-gd">${esc(a.d)}</p>
          <ol class="rows">${a.it.map(p => row(p)).join('')}</ol></section>`).join('')}</div>${foot()}`,
    init() { return {}; }
  };
}

/* ================================================================ a research area: its first vial in the light, then
   its compounds, then the list. Every compound is the same sealed vial, so each card's facts are in type. */
function area(c, vt) {
  const a = AREAS.find(x => x.c === c); if (!a) return notFound();
  const lead = a.it[0], SHF = SH.shelf(a.c), F = SHF ? {shot: SHF, own: false, poster: SHF.poster} : SH.forProduct(lead, {area: true});
  const i = AREAS.indexOf(a), prev = AREAS[(i + 8) % 9], next = AREAS[(i + 1) % 9];
  return {
    key: 'col', cls: 'v-col', title: `PR6 · ${a.n}`, crumb: {label: `${a.c} ${a.n}`, back: '#/'},
    html: `<section class="hero h-col${SHF ? ' h-shelf' : ''}" data-hero aria-labelledby="cH">
        ${lightFig(F.shot, {cls: 'hero-lt', product: lead, own: F.own, eager: true, desc: 'cInk', poster: F.poster, vt: vt ? 'pack' : '', label: SHF ? `The ${a.it.length} compounds of ${a.n} standing side by side, each in a 5 mg and a 10 mg vial, in raking light` : F.shot && F.shot.name === 'pair_hero' ? 'Two sealed vials of ' + lead.n + ', 5 mg and 10 mg, in raking light' : 'A sealed vial, in raking light'})}
        <div class="hero-t wrap"><p class="mono hero-k">${a.c}</p><h1 id="cH" class="t-disp" tabindex="-1">${esc(a.n)}</h1><p class="hero-d">${esc(a.d)}</p></div>
        <div class="hero-f wrap"><p class="ink-l mono" id="cInk"><span class="ink-c">${lead.id}</span> ${esc(lead.n)} <span aria-hidden="true">·</span> ${esc(SH.inkLine(lead))}</p></div>
      </section>
      <section class="sec plu-sec" aria-labelledby="pluH">
        <header class="wrap sec-h sec-h-s"><h2 id="pluH" class="t-title">${a.it.length} compounds in ${esc(a.n)}${smp()}</h2><p class="mono sec-m">${a.c} <span aria-hidden="true">·</span> ${range(a)}</p></header>
        <ol class="plu" data-plu style="--n:${a.it.length}">${a.it.map((p, k) => { const f = SH.forProduct(p); return `<li class="plu-i${k ? '' : ' on'}" data-id="${p.id}"><a class="plu-a" href="#/p/${p.id}" data-pid="${p.id}">
          <span class="plu-im"><img src="${esc(f.poster)}" alt="" loading="lazy" decoding="async"><span class="plu-lot mono" aria-hidden="true">${esc(p.lot)}</span></span>
          <span class="plu-n">${esc(p.n)}${p.isNew ? ' <span class="nw mono">NEW</span>' : ''}</span><span class="plu-m mono">${p.id} <span aria-hidden="true">·</span> ${esc(p.cls)} <span aria-hidden="true">·</span> ${p.sizes.map(fmtSize).join(' / ')} <span aria-hidden="true">·</span> from ${from(p)}</span></a></li>`; }).join('')}</ol>
      </section>
      <section class="sec wrap ixl col-ix" aria-labelledby="ixH">
        <h2 id="ixH" class="t-title sec-k">Every compound in ${esc(a.n)}</h2>
        <ol class="rows">${a.it.map(p => row(p)).join('')}</ol>
        <nav class="col-nav" aria-label="Other research areas">
          <a href="#/a/${prev.c}"><span aria-hidden="true">&larr;</span> <span class="mono">${prev.c}</span> ${esc(prev.n)}</a>
          <a href="#/a/${next.c}"><span class="mono">${next.c}</span> ${esc(next.n)} <span aria-hidden="true">&rarr;</span></a>
        </nav>
      </section>${foot()}`,
    init(el, ctx) {
      const hero = $('[data-hero]', el), host = $('.hero-lt', el);
      const inst = F.shot ? relight(host, F.shot, {product: lead, ink: F.own, fit: SHF ? shelfFit(SHF) : placeFit({kw: 1.02, pfx: .5, pfy: .58, kh: .96, fx: .7, fy: .52})}) : null;
      const stop = inst ? sweepSoon(inst, 1000) : null;
      const tr = $('[data-plu]', el), items = $$('.plu-i', tr);
      const set = k => items.forEach((it, j) => it.classList.toggle('on', j === k));
      let raf = 0;
      const near = () => { raf = 0; if (getComputedStyle(tr).overflowX === 'visible') return; const c = tr.scrollLeft + tr.clientWidth / 2; let b = 0, bd = 1e9; items.forEach((it, j) => { const d = Math.abs(it.offsetLeft + it.offsetWidth / 2 - c); if (d < bd) { bd = d; b = j; } }); set(b); };
      tr.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(near); }, {passive: true});
      tr.addEventListener('pointerover', e => { const it = e.target.closest('.plu-i'); if (!it || e.pointerType === 'touch') return; tr.classList.add('hov'); set(items.indexOf(it)); });
      tr.addEventListener('pointerleave', () => tr.classList.remove('hov'));
      tr.addEventListener('focusin', e => { const it = e.target.closest('.plu-i'); if (!it) return; tr.classList.add('hov'); set(items.indexOf(it)); });
      tr.addEventListener('focusout', e => { if (!tr.contains(e.relatedTarget)) tr.classList.remove('hov'); });
      tr.addEventListener('click', e => { const a = e.target.closest('[data-pid]'); if (!a) return; ctx.markVT($('.plu-im', a)); });
      setScrollDriver(chain(heroDriver(hero), passDriver(tr)));
      return {
        light: inst,
        lineup: {track: tr, go(k) { const it = items[clamp(k, 0, items.length - 1)]; tr.scrollTo({left: it.offsetLeft - (tr.clientWidth - it.offsetWidth) / 2, behavior: RM ? 'auto' : 'smooth'}); }, get index() { return items.findIndex(x => x.classList.contains('on')); }},
        destroy() { stop && stop(); inst && inst.destroy(); setScrollDriver(null); }
      };
    }
  };
}

/* ================================================================ the compound record: the kit's slide 4 panel with the
   relightable vial in the disc, then the record on flat Chalk: identity, lot and testing, documents, storage,
   references, and the quote form */
function product(id, vt) {
  const p = byId(id); if (!p) return notFound();
  const a = areaOf(p), F = SH.forProduct(p), refs = refsFor(p.id), SHF = SH.shelf(a.c);
  const fld = (cls, label, value) => `<div class="fld ${cls}"><p class="fld-l mono">${esc(label.toUpperCase())}</p><p class="fld-v mono">${esc(String(value).toUpperCase())}</p></div>`;
  /* v15: every block below the hero is the same object as slide 4: a rounded frosted panel, PR6 / SECTION at the top
     left, debossed mono fields, one black pill. f(): a field in the flow (label above, debossed value) */
  const f = (label, value, o = {}) => `<div class="gf${o.w ? ' gf-' + o.w : ''}"><p class="fld-l mono">${esc(label.toUpperCase())}</p><p class="gf-v${o.sans ? '' : ' mono'}">${value}</p></div>`;
  const gl = (sec, body, o = {}) => `<section class="gl ${o.cls || ''}"${o.id ? ` aria-labelledby="${o.id}"` : ''}><div class="panel-glass" aria-hidden="true"></div>
      <header class="gl-h"><span class="wm" aria-hidden="true">PR6</span><i aria-hidden="true">/</i><h2 class="gl-sec mono"${o.id ? ` id="${o.id}"` : ''}>${esc(sec.toUpperCase())}</h2>${o.n ? `<span class="gl-n mono" aria-hidden="true">${o.n}</span>` : ''}</header>
      <div class="gl-b">${body}</div></section>`;
  /* the counter: the area's compounds, each in its 5 mg and 10 mg vial, standing together (one render per area) */
  const sib = a.it.map(x => ({p: x, here: x.id === p.id}));
  const shelfHTML = SHF ? `<section class="shf" aria-labelledby="shH">
      <div class="shf-pic" data-shf>
        <div class="shf-in" data-shfin>
          ${lightFig(SHF, {cls: 'shf-lt', label: `The ${a.it.length} compounds of ${a.n} standing side by side, each in a 5 mg and a 10 mg vial, in raking light`})}
          ${(SHF.packs || []).map((q, i) => { const x = byId(q.id); const b = q.box; if (!x || !b) return '';
            return `<a class="shf-v${x.id === p.id ? ' here' : ''}" href="#/p/${x.id}" data-sv="${x.id}" style="left:${(b[0] * 100).toFixed(2)}%;top:${(b[1] * 100).toFixed(2)}%;width:${((b[2] - b[0]) * 100).toFixed(2)}%;height:${((b[3] - b[1]) * 100).toFixed(2)}%" aria-label="${esc(x.n)}, ${esc(q.size || '')} vial${x.id === p.id ? ' (this record)' : ''}"${i % 2 ? ' tabindex="-1" aria-hidden="true"' : ''}><span class="shf-tag mono" aria-hidden="true">${x.id} · ${esc((q.size || '').toUpperCase())}</span></a>`; }).join('')}
        </div>
      </div>
      <div class="shf-t">
        <p class="shf-k mono"><span class="ink-c">${a.c}</span>${esc(a.n.toUpperCase())}</p>
        <h2 class="shf-h t-title" id="shH">The ${a.it.length === 3 ? 'three' : a.it.length} compounds of this area, side by side.</h2>
        <p class="shf-d">Each one in a 5 mg and a 10 mg vial, from the lot on its record.${smp()}</p>
        <ol class="shf-l">${sib.map(({p: x, here}) => `<li><a class="shf-a${here ? ' here' : ''}" href="#/p/${x.id}" data-sl="${x.id}"${here ? ' aria-current="page"' : ''}><span class="mono">${x.id}</span><span class="shf-an">${esc(x.n)}</span><span class="mono shf-ap">${from(x)}</span></a></li>`).join('')}</ol>
        <a class="btn btn-s" href="#/a/${a.c}"><span class="pl">VIEW THE AREA</span><span class="arr" aria-hidden="true">&rarr;</span></a>
      </div>
    </section>` : '';
  const docs = `<ul class="gdocs">${Object.entries(DOCS).map(([k, n]) => `<li><button type="button" class="gdoc" data-doc="${k}" data-id="${p.id}"><span class="gdoc-k mono">${k.toUpperCase()}</span><span class="gdoc-n">${n}</span><span class="gdoc-m mono">${esc(p.lot)} <span aria-hidden="true">&nearr;</span></span></button></li>`).join('')}</ul>`;
  return {
    key: 'product', cls: 'v-product', title: `PR6 · ${p.id} ${p.n}`, crumb: {label: `${a.c} ${a.n}`, back: '#/a/' + a.c},
    html: `<div class="pd">
      <section class="pd-stage" aria-labelledby="pnT">
        <div class="plate" aria-hidden="true"></div>
        <div class="panel">
          <div class="panel-glass" aria-hidden="true"></div>
          <header class="pn-h"><a class="pn-mark" href="#/a/${a.c}" aria-label="PR6, back to ${esc(a.n)}"><span class="wm" aria-hidden="true">PR6</span><i aria-hidden="true">/</i><span class="pn-sec mono" aria-hidden="true">${esc(a.n.toUpperCase())}</span></a></header>
          ${fld('f1', 'Catalogue no.', p.id)}${fld('f2', 'Form', p.form)}${fld('f3', 'Lot', p.lot)}
          <h1 class="pn-t" id="pnT" tabindex="-1">${esc(p.n)}</h1>
          <div class="pn-disc"><div class="disc" aria-hidden="true"></div>${lightFig(F.shot, {cls: 'disc-lt', product: p, own: F.own, eager: true, desc: 'pInk', poster: F.poster, vt: vt ? 'pack' : ''})}</div>
          <div class="pn-act"><button class="btn" type="button" data-add1><span class="pl">ADD TO QUOTE</span><span class="arr" aria-hidden="true">&rarr;</span></button><p class="pn-p"><span class="sr">From </span>${from(p)}</p></div>
          <footer class="pn-f"><span class="mono">HPLC ${esc(p.purity)}</span><span class="mono">${p.sizes.map(fmtSize).join(' / ').toUpperCase()}</span><i class="hair" aria-hidden="true"></i></footer>
        </div>
        <p class="pd-ink mono" id="pInk">${esc(SH.inkLine(p))}</p>
      </section>

      ${shelfHTML}

      <div class="rec wrap" aria-label="The record">
        <div class="rec-main">
          ${gl('Identity', `<div class="gfs">${f('Catalogue no.', p.id)}${f('Name', esc(p.n), {sans: 1})}${f('Class', esc(p.cls), {sans: 1})}${f('Form', esc(p.form), {sans: 1})}${f('Research area', `<a class="u" href="#/a/${a.c}">${a.c} ${esc(a.n)}</a>`, {sans: 1, w: '2'})}${f('Sequence', esc(p.seq), {w: 'full'})}${f('CAS no.', esc(p.cas))}${f('Formula', esc(p.formula))}${f('Molecular weight', esc(p.mw))}</div>
            <p class="gl-d">${esc(p.cls)}, supplied as a ${esc(p.form.toLowerCase())} in a sealed glass vial.${smp()}</p>`, {id: 'gI', n: '01'})}
          ${gl('This lot', `<div class="gfs">${f('Lot', esc(p.lot))}${f('Purity', `${esc(p.purity)} <span class="gf-s">RP-HPLC, 220 nm</span>`)}${f('CoA date', fmtDate(p.tdate), {sans: 1})}${f('Identity', 'Confirmed by ESI-MS', {sans: 1})}${f('Tested by', esc(p.tested) + ', independent of PR6', {sans: 1, w: '2'})}</div>
            <p class="gl-d">Each vial carries its lot on the label. These documents belong to this lot only; a new lot gets its own.</p>${docs}`, {id: 'gL', n: '02'})}
          ${gl('Storage and handling', `<div class="gfs">${f('Storage', esc(p.store), {sans: 1})}${f('Shelf life', esc(p.shelf), {sans: 1})}${f('Shipping', 'Cold-packed, with the CoA and SDS in the box', {sans: 1, w: 'full'})}</div>`, {id: 'gS', n: '03'})}
          ${gl('References', `${refs.length ? `<ol class="grefs">${refs.map(r => `<li><p>${esc(r.a)}. ${esc(r.t)}. <i>${esc(r.j)}</i>, ${esc(r.y)}.</p><p class="fld-v mono">DOI:${esc(r.doi)}</p></li>`).join('')}</ol>` : '<p class="gl-d">None listed yet.</p>'}
            <p class="gl-d">Published literature in which this compound appears, listed as references only. PR6 does not summarise findings or suggest uses.</p>`, {id: 'gR', n: '04'})}
          ${gl('Research use only', `<p class="gl-ruo">${esc(RUO)} Supplied only to institutions with an account opened by PR6, for use by trained personnel in a laboratory.</p>`, {id: 'gU', n: '05', cls: 'gl-ruo-p'})}
        </div>
        <aside class="rec-side">
          <form class="gl gl-buy" data-buy novalidate aria-labelledby="buyH"><div class="panel-glass" aria-hidden="true"></div>
            <header class="gl-h"><span class="wm" aria-hidden="true">PR6</span><i aria-hidden="true">/</i><h2 class="gl-sec mono" id="buyH">QUOTE LIST</h2></header>
            <div class="gl-b">
              <p class="fld-l mono">VIAL SIZE</p>
              <fieldset class="gopts"><legend class="sr">Vial size</legend>
                ${p.sizes.map((s, j) => `<label class="gopt"><input type="radio" name="s" value="${j}"${j ? '' : ' checked'}><span class="gopt-b"><span class="gopt-t mono">${esc(fmtSize(s).toUpperCase())}</span><span class="gopt-p">${cad(s.price)}</span></span></label>`).join('')}
              </fieldset>
              <p class="fld-l mono">VIALS</p>
              <span class="gstep" role="group" aria-label="Vials"><button type="button" data-q="-1" aria-label="One fewer">${ic('minus', 's')}</button><output class="mono" name="q" aria-live="polite">1</output><button type="button" data-q="1" aria-label="One more">${ic('plus', 's')}</button></span>
              <div class="gbuy-a"><button class="btn" type="submit" data-addq><span class="pl">ADD TO QUOTE</span><span class="arr" aria-hidden="true">&rarr;</span></button><p class="gbuy-t" aria-live="polite" data-tot>${cad(p.sizes[0].price)}</p></div>
              <p class="gl-d">${esc(p.lot)}, per vial, before tax. Next cold-pack dispatch <span class="mono">${dispatchLabel()}</span>, for purchase orders approved by Thursday 12:00 ET.</p>
            </div>
          </form>
        </aside>
      </div>
    </div>${foot()}`,
    init(el, ctx) {
      const host = $('.disc-lt', el);
      const inst = F.shot ? relight(host, F.shot, {product: p, ink: F.own, hover: true, fit: seatFit(F.shot)}) : null;
      const stop = inst ? sweepSoon(inst, 900) : null;
      const shf = SHF ? bindShelf(el, SHF, p) : null;
      const fm = $('[data-buy]', el), out = $('output', fm), tot = $('[data-tot]', fm); let q = 1;
      const sync = () => { $$('.gopt', fm).forEach(o => o.classList.toggle('on', o.querySelector('input').checked)); tot.textContent = cad(p.sizes[+fm.s.value].price * q); };
      fm.addEventListener('change', sync); sync();
      $$('[data-q]', fm).forEach(b => b.onclick = () => { q = clamp(q + +b.dataset.q, 1, 99); out.textContent = q; sync(); });
      const added = (btn, s, qq, label) => {
        ctx.addFly(p.id, btn, inst);
        Quote.add(p.id, s, qq, {open: false});
        const pl = $('.pl', btn) || btn; const was = pl.innerHTML;
        pl.textContent = label; btn.classList.add('done');
        setTimeout(() => { pl.innerHTML = was; btn.classList.remove('done'); }, 1900);
      };
      $('[data-add1]', el).addEventListener('click', e => added(e.currentTarget, 0, 1, 'ADDED'));
      fm.addEventListener('submit', e => { e.preventDefault(); added($("[data-addq]", fm), +fm.s.value, q, "ADDED"); });
      bindDocs(el);
      return {light: inst, destroy() { stop && stop(); inst && inst.destroy(); shf && shf.destroy(); }};
    }
  };
}

/* the counter set: a 2:1 render with the set to the right. Desktop: the whole picture, type in the empty sweep at
   the left. Phone: the picture is cropped to the set (set_box), type below. Pointing at a vial (or its name in the
   list) brings that compound's pair forward and lets the rest recede, as on the catalogue lineup. */
function bindShelf(el, s, p) {
  const box = $('[data-shf]', el), inn = $('[data-shfin]', el), host = $('.shf-lt', el);
  const sb = s.setBox || [.3, .2, .95, .9];
  const pairOf = id => { const bs = (s.packs || []).filter(q => q.id === id && q.box).map(q => q.box); if (!bs.length) return null;
    const x0 = Math.min(...bs.map(b => b[0])), x1 = Math.max(...bs.map(b => b[2])); return {x: (x0 + x1) / 2, hw: (x1 - x0) / 2 + .01}; };
  const fx = {x: new Spring(.5, {k: 170, c: 26}), hw: new Spring(.1, {k: 170, c: 26}), amt: new Spring(0, {k: 140, c: 24})};
  let inst = null, raf = 0;
  const tick = () => { raf = 0; const t = 1 / 60; fx.x.step(t); fx.hw.step(t); fx.amt.step(t); if (inst) { inst.dirty = true; kick(); }
    if (!fx.x.rest || !fx.hw.rest || !fx.amt.rest) raf = requestAnimationFrame(tick); };
  const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const on = id => { const f = id && pairOf(id); $$('[data-sv]', el).forEach(a => a.classList.toggle('on', a.dataset.sv === id)); $$('[data-sl]', el).forEach(a => a.classList.toggle('on', a.dataset.sl === id));
    if (f) { fx.x.set(f.x); fx.hw.set(f.hw); fx.amt.set(1); } else fx.amt.set(0); box.classList.toggle('hov', !!f); go(); };
  /* phone: size the 2:1 picture so the set fills the box, centred on it */
  const place = () => {
    const W = box.clientWidth, H = box.clientHeight; if (!W || !H) return;
    const ar = (s.w || 2) / (s.h || 1);
    /* at least cover the box; on a narrow box, grow until the set spans about the box's width */
    let iw = W / H >= 1.6 ? Math.max(W, H * ar) : Math.max(W, W * .97 / Math.max(.2, sb[2] - sb[0])), ih = iw / ar;
    if (ih < H) { ih = H; iw = H * ar; }
    const cx = (sb[0] + sb[2]) / 2 * iw, cy = (sb[1] + sb[3]) / 2 * ih;
    const left = clamp(W / 2 - cx, W - iw, 0), top = clamp(H * .54 - cy, H - ih, 0);
    inn.style.width = iw + 'px'; inn.style.height = ih + 'px'; inn.style.left = left + 'px'; inn.style.top = top + 'px';
  };
  place();
  const ro = new ResizeObserver(place); ro.observe(box);
  inst = relight(host, s, {ink: false, focus: () => fx.amt.v > .002 ? {x: fx.x.v, hw: fx.hw.v, amt: fx.amt.v, feather: .09} : null});
  const st = sweepSoon(inst, 1400);
  const ent = e => { const a = e.target.closest('[data-sv],[data-sl]'); on(a ? (a.dataset.sv || a.dataset.sl) : null); };
  el.addEventListener('pointerover', ent); el.addEventListener('focusin', ent);
  box.addEventListener('pointerleave', () => on(null));
  $('.shf-l', el).addEventListener('pointerleave', () => on(null));
  return {inst, destroy() { ro.disconnect(); cancelAnimationFrame(raf); st && st(); inst.destroy(); el.removeEventListener('pointerover', ent); el.removeEventListener('focusin', ent); }};
}

/* ================================================================ The Dossier: every lot's paperwork in one place */
function dossier() {
  return {
    key: 'dossier', cls: 'v-mem v-dos', title: 'PR6 · The Dossier', crumb: {label: 'The Dossier', back: '#/'},
    html: `<header class="wrap tp-h"><h1 class="t-head" tabindex="-1">The Dossier</h1>
        <p class="sec-l">The certificate of analysis, safety data sheet, HPLC chromatogram and mass spectrum for every lot on sale${smp()}. Documents for lots you have received stay here after the lot sells out.</p>
        <label class="sr" for="dQ">Filter by catalogue number, name or lot</label><input id="dQ" class="s-q s-q-s" type="search" placeholder="Catalogue no., name or lot" autocomplete="off" spellcheck="false"></header>
      <div class="wrap ixl">${AREAS.map(a => `<section class="ix-g" data-g aria-labelledby="d${a.c}">
          <h2 class="t-title ix-h" id="d${a.c}"><span class="mono">${a.c}</span> ${esc(a.n)}</h2>
          <ol class="dl">${a.it.map(p => `<li class="dl-r" data-s="${esc((p.id + ' ' + p.n + ' ' + p.lot).toLowerCase())}">
            <p class="dl-k"><a class="u" href="#/p/${p.id}"><span class="mono">${p.id}</span> ${esc(p.n)}</a><span class="mono dl-l">${esc(p.lot)} <span aria-hidden="true">·</span> CoA ${fmtDate(p.tdate)}</span></p>
            ${docBtns(p, 'docs-s')}</li>`).join('')}</ol></section>`).join('')}
        <p class="fine" data-none hidden>No lot matches that.</p></div>${foot()}`,
    init(el) {
      bindDocs(el);
      const q = $('#dQ', el), none = $('[data-none]', el);
      q.addEventListener('input', () => { const s = q.value.trim().toLowerCase(); let any = false;
        $$('[data-g]', el).forEach(g => { let n = 0; $$('.dl-r', g).forEach(r => { const on = !s || r.dataset.s.includes(s); r.hidden = !on; n += on; }); g.hidden = !n; any = any || n > 0; });
        none.hidden = any; });
      return {focus() { q.focus({preventScroll: true}); }};
    }
  };
}

/* ================================================================ Field Club: notices only, in the night register */
const CLUB = 'pr6.v15.club';
function club() {
  const prefs = Object.assign({lot: true, new: true, doc: true, dispatch: true}, store.get(CLUB, {}));
  return {
    key: 'club', cls: 'v-club', tone: 'night', title: 'PR6 · Field Club', crumb: {label: 'Field Club', back: '#/'},
    html: `<header class="club-h">
        <figure class="club-ph"><img src="assets/img/night-m.webp" srcset="assets/img/night-m.webp 900w, assets/img/night-d.webp 1800w" sizes="(max-width: 860px) 100vw, 50vw" alt="Object 0047, the frosted cube, glowing on black" decoding="async"></figure>
        <div class="club-t wrap"><h1 class="t-hero" tabindex="-1">Field Club</h1><p class="sec-l">Notices from PR6 to every account: new lots, new entries, document updates and dispatch windows.</p></div>
      </header>
    <div class="wrap club">
      <figure class="pause"><img src="assets/img/macro-cell-m.webp" srcset="assets/img/macro-cell-m.webp 782w, assets/img/macro-cell-d.webp 1564w" sizes="(max-width: 860px) 100vw, 60vw" alt="Soft-focus macro of rounded cells in steel blue on pale mist" loading="lazy" decoding="async"><figcaption>From the PR6 brand kit, slide 1 (concept).</figcaption></figure>
      <div class="club-cols">
        <section aria-labelledby="nH">
          <h2 id="nH" class="t-title sec-k">Notices${smp()}</h2>
          <ol class="lv">${FEED.map(fd => { const p = fd.id && byId(fd.id); return `<li class="lv-r fd" data-k="${fd.k}"${prefs[fd.k] === false ? ' data-muted' : ''}>
            <p class="lv-k mono">${fmtDate(fd.d)}</p>
            <p class="lv-v"><b>${esc(fd.t)}.</b> ${esc(fd.b)}${p ? ` <a class="u" href="#/p/${p.id}">${p.id}</a>` : ''}</p></li>`; }).join('')}</ol>
        </section>
        <section aria-labelledby="pH">
          <h2 id="pH" class="t-title sec-k">Tell us about</h2>
          <ul class="prefs">${Object.keys(FEED_KINDS).map(kk => `<li><label class="sw"><input type="checkbox" data-pref="${kk}"${prefs[kk] ? ' checked' : ''}><span class="sw-t">${esc(FEED_KINDS[kk])}</span><span class="sw-k" aria-hidden="true"></span></label></li>`).join('')}</ul>
          <p class="fine">By email to the account's purchasers. Saved on this device in the preview.</p>
        </section>
      </div>
    </div>${foot()}`,
    init(el) {
      $$('[data-pref]', el).forEach(c => c.addEventListener('change', () => {
        const all = Object.assign({}, prefs); $$('[data-pref]', el).forEach(x => all[x.dataset.pref] = x.checked); store.set(CLUB, all);
        $$(`.fd[data-k="${c.dataset.pref}"]`, el).forEach(fd => fd.toggleAttribute('data-muted', !c.checked));
        say((c.checked ? 'On: ' : 'Off: ') + FEED_KINDS[c.dataset.pref] + '.');
      }));
      return {};
    }
  };
}

/* ================================================================ account pages: clean type pages, one shell */
export const MPAGES = [['orders', 'Dispatches'], ['institution', 'Institution Record'], ['references', 'References'], ['new', 'New Entries'], ['liaison', 'Member Liaison']];
const form = (id, fields, btn, note) => `<form class="mf" data-mf="${id}" novalidate>${fields}<div class="mf-a"><button class="btn" type="submit"><span class="pl">${esc(btn.toUpperCase())}</span><span class="arr" aria-hidden="true">&rarr;</span></button><p class="mf-s" role="status"></p></div>${note ? `<p class="fine">${note}</p>` : ''}</form>`;
const kv = rows => `<dl class="kv">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const lineTotal = items => items.reduce((s, [id, si, q]) => s + byId(id).sizes[si].price * q, 0);
const MBODY = {
  orders: () => `<div data-sent></div>
    <h2 class="t-title sub-t mt">Purchase orders${smp()}</h2>
    <div class="tbl-w"><table class="tbl disp"><thead><tr><th scope="col">PO</th><th scope="col">Date</th><th scope="col">Lines</th><th scope="col">Invoice</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead><tbody>
    ${ORDERS.map(o => `<tr><td class="mono">${esc(o.no)}</td><td>${fmtDate(o.d)}</td><td>${o.items.map(([id, si, q]) => { const p = byId(id); return `<a class="u mono" href="#/p/${id}">${id}</a> <span class="mono">${fmtSize(p.sizes[si])} ×${q}</span> <button type="button" class="doc-i" data-doc="coa" data-id="${id}">CoA</button>`; }).join('<br>')}</td><td class="mono">${esc(o.inv)}</td><td class="mono">${cad(lineTotal(o.items))}</td><td>${esc(o.st)}, ${esc(o.paid).toLowerCase()}</td></tr>`).join('')}</tbody></table></div>
    <p class="fine">Next cold-pack dispatch ${dispatchLabel()}. Each line ships with the CoA and SDS of the lot it came from.</p>`,
  institution: () => `${kv([['Institution', esc(INST.name)], ['Department', esc(INST.unit)], ['Legal entity', esc(INST.entity)], ['Registration', `<span class="mono">${esc(INST.bn)}</span>`], ['Account', `<span class="mono">${INST.acct}</span>, opened ${fmtDate(INST.since)}`], ['Responsible researcher', esc(INST.pi)], ['Vetted', `${esc(INST.vettedBy)}, ${fmtDate(INST.vetted)}`], ['Terms', esc(INST.terms)]])}
    <h2 class="t-title sub-t mt">People on the account</h2>
    <div class="tbl-w"><table class="tbl"><thead><tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Sign-in</th></tr></thead><tbody>${INST.users.map(u => `<tr><td>${esc(u[0])}</td><td>${esc(u[1])}</td><td>${esc(u[2])}</td></tr>`).join('')}</tbody></table></div>
    <h2 class="t-title sub-t mt">Delivery sites</h2>
    ${kv(INST.sites.map(s => [esc(s[0]), esc(s[1])]))}
    <p class="fine">Sample record. PR6 opens every account itself after meeting the institution; there is no sign-up. To add a person or a site, write to <a class="u" href="#/m/liaison">Member Liaison</a>.</p>`,
  references: () => `<p class="lede">Published literature in which catalogue compounds appear. Listed as references only: PR6 does not summarise findings or suggest uses.</p>
    <ol class="refs refs-l">${REFS.map(r => `<li><p class="mono rf-k">${r.id}</p><div><p>${esc(r.a)}. ${esc(r.t)}. <i>${esc(r.j)}</i>, ${esc(r.y)}. <span class="mono">doi:${esc(r.doi)}</span></p><p class="rf-c">${r.ids.map(id => `<a class="u mono" href="#/p/${id}">${id}</a>`).join(' ')}</p></div></li>`).join('')}</ol>
    <p class="fine">Sample entries; the owner supplies the real citations.</p>`,
  new: () => `<p class="lede">New compounds and newly released lots.</p>
    <ol class="rows">${NEW.map(([id, d, k]) => row(byId(id), `${esc(k)}, ${fmtDate(d)}`)).join('')}</ol>
    <p class="fine">Dates are sample dates.</p>`,
  liaison: () => `<p class="lede">One desk for quotes, purchase orders, documents, account users and any question about a compound's specification.</p>
    ${kv([['Hours', 'Monday to Friday, 09:00 to 17:00 ET'], ['Reply', 'Within one business day'], ['Email', 'liaison@pr6.example']])}
    ${form('liai', `<label class="fl"><span class="fl-l">About</span><select class="fl-in" name="about"><option>A quote</option><option>A purchase order</option><option>A CoA or SDS</option><option>People or sites on the account</option><option>A specification</option><option>Something else</option></select></label><label class="fl"><span class="fl-l">Message</span><textarea class="fl-in" name="msg" rows="4"></textarea></label>`, 'Send to Member Liaison', 'Liaison answers questions about specifications, documents and orders. It does not advise on uses.')}`
};
const MLEDE = {orders: 'Quotes, purchase orders and what has shipped.', institution: 'Your institution, as PR6 holds it.', references: 'The literature, cited.', new: 'Recent additions to the catalogue.', liaison: 'Write to the desk that handles everything.'};
function member(pg) {
  const i = MPAGES.findIndex(m => m[0] === pg); if (i < 0) return notFound();
  const [k, name] = MPAGES[i];
  return {
    key: 'member', cls: 'v-mem', title: 'PR6 · ' + name, crumb: {label: name, back: '#/'},
    html: `<header class="wrap tp-h"><h1 class="t-head" tabindex="-1">${esc(name)}</h1><p class="sec-l">${MLEDE[k]}</p></header>
    <div class="wrap mem">
      <section class="mem-main" aria-label="${esc(name)}"><div class="mem-b mb-${k}">${MBODY[k]()}</div></section>
      <nav class="mem-nav" aria-label="Account pages"><h2 class="t-title sub-t">Account</h2><ol>${MPAGES.map(([kk, nn]) => `<li><a class="${kk === k ? 'on' : ''}" href="#/m/${kk}"${kk === k ? ' aria-current="page"' : ''}>${esc(nn)}</a></li>`).join('')}<li><a href="#/dossier">The Dossier</a></li><li><a href="#/exit">Exit this device</a></li></ol></nav>
    </div>${foot()}`,
    init(el) {
      $$('[data-mf]', el).forEach(fm => fm.addEventListener('submit', e => {
        e.preventDefault(); const req = $$('textarea', fm);
        const empty = req.find(x => !x.value.trim()); req.forEach(x => x.toggleAttribute('aria-invalid', !x.value.trim()));
        const s = $('.mf-s', fm);
        if (empty) { s.textContent = 'Please write a message.'; empty.focus(); return; }
        s.textContent = 'Received. In this preview nothing has been sent.'; fm.reset();
      }));
      bindDocs(el);
      const sn = $('[data-sent]', el); if (sn) {
        const sent = Quote.sent();
        sn.innerHTML = `<h2 class="t-title sub-t">Quote requests</h2>` + (sent.length ? `<ol class="rows">${sent.map(q => `<li class="row"><div class="row-a"><span class="r-c mono">${esc(q.no)}</span><span class="r-n">${q.lines.length} ${q.lines.length === 1 ? 'line' : 'lines'}${q.po ? `, PO <span class="mono">${esc(q.po)}</span>` : ''}</span><span class="r-f">Sent ${fmtDate(q.d)}</span><span class="r-s">Awaiting PR6's confirmation</span><span class="r-p mono">${cad(q.lines.reduce((s, l) => { const p = byId(l.id); return s + (p ? p.sizes[l.s].price * l.q : 0); }, 0))}</span></div></li>`).join('')}</ol>`
          : `<p class="fine">No open quote requests. Add compounds to the <button type="button" class="u lnk" data-pro>quote list</button> and send it from there.</p>`);
        const b = $('[data-pro]', sn); if (b) b.addEventListener('click', () => Quote.open());
      }
      return {};
    }
  };
}

/* ================================================================ Search */
function search() {
  return {
    key: 'search', cls: 'v-search', title: 'PR6 · Search', crumb: {label: 'Search', back: '#/'},
    html: `<header class="wrap tp-h s-h"><h1 class="t-head" tabindex="-1">Search the catalogue</h1>
        <label class="sr" for="sQ">Catalogue number, name, class, lot or research area</label>
        <input id="sQ" class="s-q" type="search" placeholder="Catalogue no., name, class, lot or area" autocomplete="off" spellcheck="false" enterkeyhint="search"></header>
      <div class="wrap s-body"><p class="s-meta" id="sMeta" role="status"></p><ol class="rows" id="sRes"></ol></div>${foot()}`,
    init(el) {
      const q = $('#sQ', el), meta = $('#sMeta', el), res = $('#sRes', el);
      const render = () => {
        const raw = q.value.trim(), s = raw.toLowerCase();
        const rank = p => { const n = p.n.toLowerCase(); return p.id.toLowerCase() === s ? -1 : n.startsWith(s) ? 0 : p.id.toLowerCase().includes(s) ? 1 : 2; };
        const hits = !s ? [] : ALL.filter(p => (p.n + ' ' + p.id + ' ' + p.cls + ' ' + p.lot + ' ' + p.c + ' ' + areaOf(p).n).toLowerCase().includes(s))
          .map((p, i) => [rank(p), i, p]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]).slice(0, 18);
        meta.textContent = !s ? 'Try 0201, cyclic, neuroscience or LOT 2606. The first compound in each area:' : hits.length ? `${hits.length} ${hits.length === 1 ? 'compound' : 'compounds'}` : `Nothing in the catalogue matches “${raw}”.`;
        res.innerHTML = (s ? hits : AREAS.map(a => a.it[0])).map(p => row(p)).join('');
      };
      q.addEventListener('input', render);
      q.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = $('a', res); if (a) location.hash = a.getAttribute('href'); } });
      render();
      return {focus() { q.focus({preventScroll: true}); }};
    }
  };
}

/* ================================================================ Credits */
function credits() {
  const st = SH.status();
  return {
    key: 'credits', cls: 'v-credits', title: 'PR6 · Credits', crumb: {label: 'Credits', back: '#/'},
    html: `<header class="wrap tp-h"><h1 class="t-head" tabindex="-1">Credits</h1><p class="sec-l">Who made the pictures and the type, and under which licence.</p></header>
    <div class="wrap cr">
      <h2 class="t-title sec-k">Renders</h2>
      <p class="cr-p">Every vial in the portal is an original PR6 render: one pale set, path-traced in Blender (Cycles), with each light written as its own pass. The browser adds the passes back together under your hand; nothing is generated and nothing is composited. Scripts in <span class="mono">v13/blender/</span>.</p>
      <p class="cr-p fine">${st.manifest ? `Shots in this build: <span class="mono">${st.shots.map(esc).join(', ')}</span>.` : 'The renders have not landed in this build.'}</p>
      <h2 class="t-title sec-k">Field Club</h2>
      <p class="cr-p">Object 0047, the frosted cube, is a PR6 render. The cell still is from the PR6 brand kit, slide 1 (concept), type removed.</p>
      <h2 class="t-title sec-k">Type</h2>
      <p class="cr-p">FreeSans (GNU FreeFont, GPL with font exception) and DejaVu Sans Mono (Bitstream Vera licence), self-hosted, Latin subset.</p>
    </div>${foot()}`,
    init() { return {}; }
  };
}

function notFound() {
  return {key: 'nf', cls: 'v-nf', title: 'PR6 · Not found', crumb: {label: 'Not found', back: '#/'},
    html: `<header class="wrap tp-h"><h1 class="t-head" tabindex="-1">Not in the catalogue.</h1><p class="sec-l">That address does not lead anywhere. <a class="u" href="#/">Back to the start</a> or <a class="u" href="#/catalogue">open the catalogue</a>.</p></header>${foot()}`, init() { return {}; }};
}

export function makeView(r, o = {}) {
  switch (r.v) {
    case 'catalogue': return home(o);
    case 'index': return index();
    case 'col': return area(r.c, o.vt);
    case 'product': return product(r.id, o.vt);
    case 'dossier': return dossier();
    case 'club': return club();
    case 'member': return member(r.page);
    case 'search': return search();
    case 'credits': return credits();
    default: return notFound();
  }
}

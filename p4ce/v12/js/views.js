/* PR6 v12 · "Raking Light": the pages. Each is markup plus an init(); app.js mounts it into #page.
   One material world: every store picture is our own path-traced render from one pale set, and the relightable ones
   answer the member's hand (js/light.js). No stock photography on store screens, no pack ever composited onto a photo,
   no leader lines: product facts sit on the product (the ink layer) and in the Dossier.
   Type: six sizes (13 mono / 17 body / 22 title / 34 headline / 56 display / 88 hero on a phone, larger on a desktop),
   two weights. Mono only for real data. British/Canadian spelling, CA$, no effect claims. */
import {CAT, ALL, byId, colOf, servingSize, purpose, directions, cautions, batch, CONC, PACKNAME} from './catalog.js';
import {$, $$, esc, money, ic, say, store, RM, clamp, lerp, isPhone, Spring, E} from './util.js';
import {Protocol, dispatchLabel} from './protocol.js';
import {FEED, FEED_KINDS, REVIEWS, reviewOf, PAST, MEMBER, NEW, NOTES, fmtDate, APPROACH} from './content.js';
import {relight, LIGHT, sweep, setScrollDriver, kick, lightNow, dawn as lightDawn} from './light.js';
import * as SH from './shots.js';

const N = ALL.length;
const PAGE = () => document.getElementById('page');
const range = co => { const ps = co.it.map(p => p.pc); const a = Math.min(...ps), b = Math.max(...ps); return a === b ? money(a) : `${money(a)}–${Math.round(b)}`; };
export const colData = co => `${co.it.length} entries <span aria-hidden="true">·</span> ${range(co)}`;
const row = (p, extra = '') => `<li class="row" data-id="${p.id}"><a class="row-a" href="#/p/${p.id}"><span class="r-c mono">${p.id}</span><span class="r-n">${esc(p.n)}</span><span class="r-f">${esc(p.g)}</span><span class="r-s">${esc(extra || p.q)}</span><span class="r-p mono">${money(p.pc)}</span></a></li>`;
const foot = () => `<footer class="foot wrap"><p><span class="wm">PR6</span> The practice of progress.</p>
  <nav aria-label="About"><a href="#/credits">Credits</a><a href="#/m/liaison">Member Liaison</a><a href="#/exit">Exit this device</a></nav></footer>`;

/* ================================================================ the relightable picture
   The poster is in the markup (first paint, and the fallback); light.js adds the live canvas over it. The mono line
   under it carries the same facts as the ink, for screen readers and for anyone who never presses. */
let uid = 0;
function lightFig(s, o = {}) {
  const id = 'lf' + (++uid);
  const p = o.product, own = !!(s && o.own);
  const label = o.label || (p ? `${p.n}, ${PACKNAME[SH.packOf(p)].toLowerCase()}, in raking light` : 'The PR6 range in one room, in raking light');
  const how = own ? ' Drag across it, or use the arrow keys, to move the light. Hold, or press I, to show what is printed in ink on the label.' : ' Drag across it, or use the arrow keys, to move the light.';
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
      ${s ? lightFig(s, {cls: 'lu-lt', label: 'The nine lead packs of the Formulary standing in one row, in one room, in raking light'}) : ''}
      <ol class="lu-tr" data-lutr>${CAT.map((co, i) => `<li class="lu-i${i ? '' : ' on'}" data-i="${i}">
        <a class="lu-a" href="#/c/${co.c}" data-c="${co.c}">${s ? '' : `<span class="lu-ph"><img src="${esc(SH.posterFor(SH.packOf(L[i])))}" alt="" loading="lazy" decoding="async"></span>`}
          <span class="lu-cap"><span class="lu-n"><span class="mono">${co.c}</span> ${esc(co.n)}</span><span class="lu-d">${esc(co.d)}</span><span class="lu-m mono">${colData(co)}</span></span></a></li>`).join('')}</ol>
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
      onTap: () => { if (!phone()) onGo(CAT[cur].c, cur); }
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

/* ================================================================ home: the tin, the lineup, the index, the night */
function home(o = {}) {
  const hs = SH.heroFor('tin'), hp = SH.productOf(hs, 'tin'), own = !!(hs && hs.product === hp.id);
  const L = SH.lineup();
  const notices = FEED.slice(0, 3);
  return {
    key: 'home', cls: 'v-home', title: 'PR6 · The practice of progress', crumb: null,
    html: `<section class="hero h-home" data-hero aria-labelledby="hH">
        ${lightFig(hs, {cls: 'hero-lt', product: hp, own, eager: true, desc: 'hInk'})}
        <div class="hero-t wrap"><h1 id="hH" class="t-disp hero-h" tabindex="-1">Your place has been reserved.</h1></div>
        <div class="hero-f wrap"><p class="ink-l mono" id="hInk"><span class="ink-c">${hp.id}</span> ${esc(hp.n)} <span aria-hidden="true">·</span> ${esc(SH.inkLine(hp))}</p>
          ${own ? `<p class="hint" data-hint aria-hidden="true">Hold the tin to read its label.</p>` : ''}</div>
      </section>

      <section class="sec lu-sec" aria-labelledby="fH">
        <header class="wrap sec-h"><h2 id="fH" class="t-head">The Formulary</h2>
          <p class="sec-l">Nine collections, ${N} entries, one room and one light. <span class="only-ph">Swipe along the row; tap</span><span class="only-dt">Choose</span> a pack to open its collection.</p></header>
        ${lineupHTML(L)}
      </section>

      <section class="sec ix-sec wrap" aria-labelledby="xH">
        <h2 id="xH" class="t-title sec-k">Every collection</h2>
        ${colIndex()}
        <p class="sec-more"><a class="u" href="#/index">Every entry on one list</a></p>
      </section>

      <section class="night" data-tone="night" aria-labelledby="nH">
        <div class="night-in wrap">
          <figure class="night-ph"><img src="assets/img/night-m.webp" srcset="assets/img/night-m.webp 900w, assets/img/night-d.webp 1800w" sizes="(max-width: 860px) 100vw, 44vw" alt="Object 0047, the frosted cube, glowing on black" loading="lazy" decoding="async"></figure>
          <div class="night-t">
            <h2 id="nH" class="t-head">Field Club</h2>
            <p class="sec-l">Notices and reviews from the Formulary. Every member has it. <span class="smp">Sample</span></p>
            <ol class="lv">${notices.map(fd => `<li class="lv-r"><p class="lv-k mono">${fmtDate(fd.d)}</p><p class="lv-v"><b>${esc(fd.t)}.</b> ${esc(fd.b)}</p></li>`).join('')}</ol>
            <a class="u more" href="#/club">Open Field Club</a>
          </div>
        </div>
      </section>
      ${foot()}`,
    init(el, ctx) {
      const hero = $('[data-hero]', el), host = $('.hero-lt', el);
      const inst = hs ? relight(host, hs, {product: hp, ink: own, fit: placeFit({kw: 1.02, pfx: .5, pfy: .6, kh: .94, fx: .68, fy: .54}),
        onInk: on => { if (on) hint(false); } }) : null;
      const hintEl = $('[data-hint]', el);
      const hint = on => { if (hintEl) hintEl.classList.toggle('on', on); };
      let stopSweep = () => {};
      if (inst) {
        if (ctx.fromGate) {
          /* frames 1 to 3: black, then key_l rises, the room appears, the line arrives, then the sweep */
          hero.classList.add('dark');
          const go = () => { hero.classList.add('dawn'); lightDawn(RM ? 400 : 1500).then(() => { hero.classList.remove('dark'); ctx.onDawn && ctx.onDawn(); setTimeout(() => { if (!RM) { lastSweep = performance.now(); sweep(); } }, 1200); }); };
          if (inst.ready || inst.failed || inst.mode === 'poster') setTimeout(go, 60); else { inst.onReady = go; setTimeout(() => { if (!hero.classList.contains('dawn')) go(); }, 2200); }
        } else stopSweep = sweepSoon(inst, 1200) || stopSweep;
      }
      /* the hint appears once, after the first sweep has shown what the light does, and goes at the first touch */
      const hintT = own && !RM ? setTimeout(() => { if (lightNow() - LIGHT.hand > 4000) hint(true); }, ctx.fromGate ? 7600 : 6200) : 0;
      if (host) host.addEventListener('pointerdown', () => setTimeout(() => hint(false), 700), {once: true});
      const lu = bindLineup(el, L, (c, k) => ctx.toCollection(c, k, lu));
      setScrollDriver(chain(heroDriver(hero), passDriver($('[data-lu]', el))));
      return {lineup: lu, light: inst, destroy() { clearTimeout(hintT); stopSweep(); inst && inst.destroy(); lu.destroy(); setScrollDriver(null); }};
    }
  };
}
/* the nine collections as type rows: code, name at title size, descriptor, count, CA$ range, hairlines */
const colIndex = () => `<ol class="cx">${CAT.map(co => `<li><a class="cx-a" href="#/c/${co.c}"><span class="cx-c mono">${co.c}</span><span class="cx-n">${esc(co.n)}</span><span class="cx-d">${esc(co.d)}</span><span class="cx-m mono">${co.it.length} entries</span><span class="cx-p mono">${range(co)}</span></a></li>`).join('')}</ol>`;

/* ================================================================ The Formulary: the lineup and the nine rows */
function formulary() {
  const L = SH.lineup();
  return {
    key: 'formulary', cls: 'v-fm', title: 'PR6 · The Formulary', crumb: {label: 'The Formulary', back: '#/'},
    html: `<section class="sec fm-page" aria-labelledby="fpH">
        <header class="wrap sec-h"><h1 id="fpH" class="t-head" tabindex="-1">The Formulary</h1>
          <p class="sec-l">Nine collections, ${N} entries. Or open <a class="u" href="#/index">every entry on one list</a>.</p></header>
        ${lineupHTML(L)}
      </section>
      <section class="sec ix-sec wrap" aria-label="Every collection">${colIndex()}</section>${foot()}`,
    init(el, ctx) { const lu = bindLineup(el, L, (c, k) => ctx.toCollection(c, k, lu)); setScrollDriver(passDriver($('[data-lu]', el))); if (lu.inst) sweepSoon(lu.inst, 900); return {lineup: lu, destroy() { lu.destroy(); setScrollDriver(null); }}; }
  };
}

/* ================================================================ The Dossier index: every entry, one line each */
function index() {
  return {
    key: 'index', cls: 'v-index', title: 'PR6 · The Dossier', crumb: {label: 'The Dossier', back: '#/formulary'},
    html: `<header class="wrap tp-h"><h1 class="t-head" tabindex="-1">The Dossier</h1>
        <p class="sec-l">Every entry in the Formulary, one line each: ${N} entries in nine collections. Open any line for its full Dossier. Prices in Canadian dollars.</p></header>
      <div class="wrap ixl">${CAT.map(co => `<section class="ix-g" aria-labelledby="g${co.c}">
          <h2 class="t-title ix-h" id="g${co.c}"><a href="#/c/${co.c}"><span class="mono">${co.c}</span> ${esc(co.n)}</a></h2>
          <p class="ix-gd">${esc(co.d)}.</p>
          <ol class="rows">${co.it.map(p => row(p)).join('')}</ol></section>`).join('')}</div>${foot()}`,
    init() { return {}; }
  };
}

/* ================================================================ a collection: its lead pack in the light, then its
   products, then the full list. The product lineup reuses the five format renders (one per product, so several
   products share a picture); each carries its own label note: code, format and pack size. */
function collection(c, vt) {
  const co = colOf(c); if (!co) return notFound();
  const lead = co.it[0], F = SH.forProduct(lead);
  const i = CAT.indexOf(co), prev = CAT[(i + 8) % 9], next = CAT[(i + 1) % 9];
  return {
    key: 'col', cls: 'v-col', title: `PR6 · ${co.n}`, crumb: {label: `${co.c} ${co.n}`, back: '#/formulary'},
    html: `<section class="hero h-col" data-hero aria-labelledby="cH">
        ${lightFig(F.shot, {cls: 'hero-lt', product: lead, own: F.own, eager: true, desc: 'cInk', poster: F.poster, vt: vt ? 'pack' : ''})}
        <div class="hero-t wrap"><h1 id="cH" class="t-disp" tabindex="-1">${esc(co.n)}</h1><p class="hero-d">${esc(co.d)}.</p></div>
        <div class="hero-f wrap"><p class="ink-l mono" id="cInk"><span class="ink-c">${lead.id}</span> ${esc(lead.n)} <span aria-hidden="true">·</span> ${esc(SH.inkLine(lead))}</p></div>
      </section>
      <section class="sec plu-sec" aria-labelledby="pluH">
        <header class="wrap sec-h sec-h-s"><h2 id="pluH" class="t-title">${co.it.length} entries in ${esc(co.n)}</h2><p class="mono sec-m">${co.c} <span aria-hidden="true">·</span> ${range(co)}</p></header>
        <ol class="plu" data-plu style="--n:${co.it.length}">${co.it.map((p, k) => { const f = SH.forProduct(p); return `<li class="plu-i${k ? '' : ' on'}" data-id="${p.id}"><a class="plu-a" href="#/p/${p.id}" data-pid="${p.id}">
          <span class="plu-im"><img src="${esc(f.poster)}" alt="" loading="lazy" decoding="async"></span>
          <span class="plu-n">${esc(p.n)}</span><span class="plu-m mono">${p.id} <span aria-hidden="true">·</span> ${esc(p.g)}, ${esc(p.q)} <span aria-hidden="true">·</span> ${money(p.pc)}</span></a></li>`; }).join('')}</ol>
      </section>
      <section class="sec wrap ixl col-ix" aria-labelledby="ixH">
        <h2 id="ixH" class="t-title sec-k">Every entry in ${esc(co.n)}</h2>
        <ol class="rows">${co.it.map(p => row(p)).join('')}</ol>
        <nav class="col-nav" aria-label="Other collections">
          <a href="#/c/${prev.c}"><span aria-hidden="true">&larr;</span> <span class="mono">${prev.c}</span> ${esc(prev.n)}</a>
          <a href="#/c/${next.c}"><span class="mono">${next.c}</span> ${esc(next.n)} <span aria-hidden="true">&rarr;</span></a>
        </nav>
      </section>${foot()}`,
    init(el, ctx) {
      const hero = $('[data-hero]', el), host = $('.hero-lt', el);
      const inst = F.shot ? relight(host, F.shot, {product: lead, ink: F.own, fit: placeFit({kw: 1.02, pfx: .5, pfy: .6, kh: .94, fx: .68, fy: .54})}) : null;
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
      /* the pack's frame becomes the disc: name the tapped picture for the view transition */
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

/* ================================================================ the product: the kit's slide 4 to DESIGN.md's
   measured spec, on clean Stage Mist, with the relightable pack in the disc; then the Dossier on flat Chalk */
function ingTable(p) {
  if (p.top) {
    const c = CONC[p.id] || [];
    return `${c.length ? `<table class="tbl"><thead><tr><th scope="col">Key ingredient</th><th scope="col">Concentration</th></tr></thead><tbody>${c.map(r => `<tr><td>${esc(r[0])}</td><td class="mono">${esc(r[1])}</td></tr>`).join('')}</tbody></table>` : ''}
      <p class="full"><b>Full ingredients.</b> ${esc(p.oth)}</p>`;
  }
  const per = (p.act.find(a => a.per) || {}).per || 'per serving';
  return `<table class="tbl"><thead><tr><th scope="col">Ingredient</th><th scope="col">Amount, ${esc(per)}</th></tr></thead><tbody>
    ${p.act.map(a => `<tr><td>${esc(a.name)}${a.form ? ` <span class="frm">(${esc(a.form)})</span>` : ''}</td><td class="mono">${esc(a.amt)}</td></tr>`).join('')}</tbody></table>
    <p class="full"><b>Other ingredients.</b> ${esc(p.oth)}</p>`;
}
function product(id, vt) {
  const p = byId(id); if (!p) return notFound();
  const co = colOf(p.c), rel = co.it.filter(x => x.id !== p.id), rv = reviewOf(p.id), F = SH.forProduct(p, {disc: true}), pack = F.pack;
  const fld = (cls, label, value) => `<div class="fld ${cls}"><p class="fld-l mono">${esc(label.toUpperCase())}</p><p class="fld-v mono">${esc(String(value).toUpperCase())}</p></div>`;
  return {
    key: 'product', cls: 'v-product', title: `PR6 · ${p.n}`, crumb: {label: `${co.c} ${co.n}`, back: '#/c/' + co.c},
    html: `<div class="pd">
      <section class="pd-stage" aria-labelledby="pnT">
        <div class="plate" aria-hidden="true"></div>
        <div class="panel">
          <div class="panel-glass" aria-hidden="true"></div>
          <header class="pn-h"><a class="pn-mark" href="#/c/${co.c}" aria-label="PR6, back to ${esc(co.n)}"><span class="wm" aria-hidden="true">PR6</span><i aria-hidden="true">/</i><span class="pn-sec mono" aria-hidden="true">${esc(co.n.toUpperCase())}</span></a></header>
          ${fld('f1', 'Collection', `${co.c} ${co.n}`)}${fld('f2', 'Format', p.g)}${fld('f3', 'Approach', APPROACH[co.c] || 'Practice')}
          <h1 class="pn-t" id="pnT" tabindex="-1">${esc(p.n)}</h1>
          <div class="pn-disc"><div class="disc" aria-hidden="true"></div>${lightFig(F.shot, {cls: 'disc-lt', product: p, own: F.own, eager: true, desc: 'pInk', poster: F.poster, vt: vt ? 'pack' : ''})}</div>
          <div class="pn-act"><button class="btn" type="button" data-add1><span class="pl">ADD TO PROTOCOL</span><span class="arr" aria-hidden="true">&rarr;</span></button><p class="pn-p"><span class="sr">One-off price </span>${money(p.pc)}</p></div>
          <footer class="pn-f"><span class="mono">${p.id}</span><span class="mono">${esc(p.q)}</span><i class="hair" aria-hidden="true"></i></footer>
        </div>
        <p class="pd-ink mono" id="pInk">${esc(SH.inkLine(p))}</p>
      </section>

      <article class="dos" aria-labelledby="pdH">
        <header class="wrap dos-h"><h2 id="pdH" class="t-head">The Dossier</h2><p class="dos-w">${esc(p.w)}</p></header>
        <div class="wrap pd-grid">
          <div class="pd-main">
            <section class="ds"><h3 class="ds-h">Serving</h3><dl class="kv"><div><dt>Serving</dt><dd>${esc(servingSize(p))}</dd></div><div><dt>How often</dt><dd>${esc(p.s)}</dd></div><div><dt>In the pack</dt><dd>${esc(p.q)}</dd></div></dl><p class="ds-p">${esc(purpose(p))} ${esc(p.e)}</p></section>
            <section class="ds"><h3 class="ds-h">Ingredients</h3>${ingTable(p)}</section>
            <section class="ds"><h3 class="ds-h">Directions</h3><ol class="ds-list">${directions(p).map(d => `<li>${esc(d)}</li>`).join('')}</ol></section>
            <section class="ds"><h3 class="ds-h">Cautions</h3><ul class="ds-list">${cautions(p).map(d => `<li>${esc(d)}</li>`).join('')}</ul></section>
          </div>
          <aside class="pd-side">
            <form class="buy" data-buy novalidate aria-labelledby="buyH">
              <h3 class="ds-h" id="buyH">One-off, or on Your Protocol</h3>
              <fieldset class="opts"><legend class="sr">How you would like it</legend>
                <label class="opt"><input type="radio" name="m" value="sub" checked><span class="o-b"><span class="o-t">On Your Protocol</span><span class="o-p mono">${money(p.psc)}</span><span class="o-s">Sent every <select name="fr" aria-label="Frequency"><option value="30">30</option><option value="60">60</option><option value="90">90</option></select> days. Skip or stop from Dispatches.</span></span></label>
                <label class="opt"><input type="radio" name="m" value="one"><span class="o-b"><span class="o-t">One-off</span><span class="o-p mono">${money(p.pc)}</span><span class="o-s">Sent once, with the next dispatch.</span></span></label>
              </fieldset>
              <div class="buy-r">
                <span class="step" role="group" aria-label="Quantity"><button type="button" data-q="-1" aria-label="One fewer">${ic('minus', 's')}</button><output class="mono" name="q" aria-live="polite">1</output><button type="button" data-q="1" aria-label="One more">${ic('plus', 's')}</button></span>
                <button class="add-txt" type="submit">Add to Your Protocol <span aria-hidden="true">&rarr;</span></button>
              </div>
              <p class="buy-f">Next dispatch <span class="mono">${dispatchLabel()}</span></p>
            </form>
            <section class="ds"><h3 class="ds-h">Testing and sourcing</h3><dl class="kv"><div><dt>Batch</dt><dd class="mono">${batch(p)}</dd></div><div><dt>Certificate</dt><dd>On request</dd></div><div><dt>Pack</dt><dd>${esc(PACKNAME[pack])}</dd></div></dl><p class="ds-p">Each batch is identified by the code on the base of the pack. A certificate of analysis for your batch is available from <a class="u" href="#/m/liaison">Member Liaison</a>. Sourcing details for each ingredient will be published here.</p></section>
            ${rv ? `<section class="ds"><h3 class="ds-h">From Field Club</h3><p class="rv-s"><span class="mono">${rv.r.toFixed(1)} / 5</span> from ${rv.n} sample reviews</p><blockquote class="rv-q">“${esc(rv.q[0].t)}”</blockquote><p class="rv-m">Member <span class="mono">${rv.q[0].m}</span>, ${esc(rv.q[0].d)}</p><a class="u" href="#/club/reviews">All reviews</a></section>` : ''}
          </aside>
        </div>
        <section class="wrap rel" aria-labelledby="relH">
          <h3 id="relH" class="t-title sec-k">More from ${esc(co.n)}</h3>
          <ol class="rows">${rel.map(x => row(x)).join('')}</ol>
        </section>
      </article>
    </div>${foot()}`,
    init(el, ctx) {
      const host = $('.disc-lt', el);
      const disc = !!(F.shot && /^disc_/.test(F.shot.name || ''));
      const inst = F.shot ? relight(host, F.shot, {product: p, ink: F.own, hover: true,
        fit: disc ? (W, H, iw, ih) => ({zoom: 1, cx: .5, cy: .5}) : seatFit(F.shot)}) : null;
      const stop = inst ? sweepSoon(inst, 900) : null;
      const f = $('[data-buy]', el), out = $('output', f); let q = 1;
      const sync = () => { const sub = f.m.value === 'sub'; $$('.opt', f).forEach(o => o.classList.toggle('on', o.querySelector('input').checked)); f.fr.disabled = !sub; };
      f.addEventListener('change', sync); sync();
      $$('[data-q]', f).forEach(b => b.onclick = () => { q = clamp(q + +b.dataset.q, 1, 99); out.textContent = q; });
      const added = (btn, m, fr, qq, label) => {
        ctx.addFly(p.id, btn, inst);
        Protocol.add(p.id, m, fr, qq, {open: false});
        const pl = $('.pl', btn) || btn; const was = pl.innerHTML;
        pl.textContent = label; btn.classList.add('done');
        setTimeout(() => { pl.innerHTML = was; btn.classList.remove('done'); }, 1900);
      };
      $('[data-add1]', el).addEventListener('click', e => added(e.currentTarget, 'one', 30, 1, 'ADDED'));
      f.addEventListener('submit', e => { e.preventDefault(); added($('.add-txt', f), f.m.value, +f.fr.value, q, 'Added to Your Protocol'); });
      return { light: inst, destroy() { stop && stop(); inst && inst.destroy(); } };
    }
  };
}

/* ================================================================ PR6 / Field Club: the night register, with the cube
   and one still from the owner's kit (slide 1, cells) as a pause */
const CLUB = 'pr6.v12.club';
const PLURAL = {restock: 'Restocks', new: 'New entries', session: 'Session notes', dispatch: 'Dispatch reminders', note: 'Field notes'};
function club(sub) {
  const prefs = Object.assign({restock: true, new: true, session: true, dispatch: false, note: true}, store.get(CLUB, {}));
  const total = REVIEWS.reduce((s, r) => s + r.n, 0), rvAll = REVIEWS.reduce((s, r) => s + r.r * r.n, 0) / total;
  return {
    key: 'club', cls: 'v-club', tone: 'night', title: 'PR6 · Field Club', crumb: {label: 'Field Club', back: '#/'},
    html: `<header class="club-h">
        <figure class="club-ph"><img src="assets/img/night-m.webp" srcset="assets/img/night-m.webp 900w, assets/img/night-d.webp 1800w" sizes="(max-width: 860px) 100vw, 50vw" alt="Object 0047, the frosted cube, glowing on black" decoding="async"></figure>
        <div class="club-t wrap"><h1 class="t-hero" tabindex="-1">Field Club</h1><p class="sec-l">Notices and reviews from the Formulary. Field Club is not a membership tier; every member has it.</p></div>
      </header>
    <div class="wrap club">
      <section class="sess" aria-labelledby="sH">
        <h2 id="sH" class="t-title sec-k">Session 006</h2>
        <dl class="kit6"><div><dt class="mono">SESSION</dt><dd class="mono">006</dd></div><div><dt class="mono">WHEN</dt><dd>Saturday, 08:00</dd></div><div><dt class="mono">WHAT</dt><dd>A 6 km easy loop, then coffee</dd></div><div><dt class="mono">WHERE</dt><dd>Member Liaison sends the meeting point on Friday</dd></div><div><dt class="mono">PRINCIPLE</dt><dd>Go further. Together.</dd></div></dl>
      </section>
      <figure class="pause"><img src="assets/img/macro-cell-m.webp" srcset="assets/img/macro-cell-m.webp 782w, assets/img/macro-cell-d.webp 1564w" sizes="(max-width: 860px) 100vw, 60vw" alt="Soft-focus macro of rounded cells in steel blue on pale mist" loading="lazy" decoding="async"><figcaption>From the PR6 brand kit, slide 1 (concept).</figcaption></figure>
      <div class="club-cols">
        <section aria-labelledby="nH">
          <h2 id="nH" class="t-title sec-k">Notices <span class="smp">Sample</span></h2>
          <ol class="lv">${FEED.map(fd => { const p = fd.id && byId(fd.id); return `<li class="lv-r fd" data-k="${fd.k}"${prefs[fd.k] === false ? ' data-muted' : ''}>
            <p class="lv-k mono">${fmtDate(fd.d)}</p>
            <p class="lv-v"><b>${esc(fd.t)}.</b> ${esc(fd.b)}${p ? ` <a class="u" href="#/p/${p.id}">${esc(p.n)}</a>` : fd.href ? ` <a class="u" href="${fd.href}">Read it</a>` : ''}</p></li>`; }).join('')}</ol>
          <div class="prefs-w"><h3 class="t-title sub-t">Tell me about</h3>
            <ul class="prefs">${Object.keys(FEED_KINDS).map(kk => `<li><label class="sw"><input type="checkbox" data-pref="${kk}"${prefs[kk] ? ' checked' : ''}><span class="sw-t">${esc(PLURAL[kk])}</span><span class="sw-k" aria-hidden="true"></span></label></li>`).join('')}</ul>
            <p class="fine">By email, from Member Liaison. Saved on this device in the preview.</p></div>
        </section>
        <section id="reviews" aria-labelledby="rH">
          <h2 id="rH" class="t-title sec-k">Reviews <span class="smp">Sample</span></h2>
          <p class="rv-all"><span class="mono">${rvAll.toFixed(1)} / 5</span> across ${total} reviews of ${REVIEWS.length} entries</p>
          <ol class="lv">${REVIEWS.map(r => { const p = byId(r.id); return `<li class="lv-r">
            <p class="lv-k mono">${r.r.toFixed(1)} / 5</p>
            <div class="lv-v"><p class="rv-p"><a class="u" href="#/p/${p.id}">${esc(p.n)}</a> <span class="mono">${p.id}</span>, ${r.n} reviews</p>
            ${r.q.map(q => `<blockquote class="rv-q"><p>“${esc(q.t)}”</p><footer>Member <span class="mono">${q.m}</span>, ${esc(q.d)}</footer></blockquote>`).join('')}</div></li>`; }).join('')}</ol>
          <p class="fine">Reviews describe the pack, the taste, the texture and the dispatch. Reviews that describe effects are not published.</p>
        </section>
      </div>
    </div>${foot()}`,
    init(el) {
      $$('[data-pref]', el).forEach(c => c.addEventListener('change', () => {
        const all = Object.assign({}, prefs); $$('[data-pref]', el).forEach(x => all[x.dataset.pref] = x.checked); store.set(CLUB, all);
        $$(`.fd[data-k="${c.dataset.pref}"]`, el).forEach(fd => fd.toggleAttribute('data-muted', !c.checked));
        say((c.checked ? 'On: ' : 'Off: ') + PLURAL[c.dataset.pref] + '.');
      }));
      if (sub === 'reviews') setTimeout(() => { const r = $('#reviews', el); if (r) r.scrollIntoView({behavior: RM ? 'auto' : 'smooth', block: 'start'}); }, RM ? 30 : 400);
      return {};
    }
  };
}

/* ================================================================ member pages: clean type pages, one shell */
export const MPAGES = [
  ['record', 'Member Record'], ['cabinet', 'Your Cabinet'], ['dispatches', 'Dispatches'], ['nominations', 'Nominations'],
  ['notes', 'Field Notes'], ['new', 'New Entries'], ['liaison', 'Member Liaison'], ['key', 'Your Key']
];
const form = (id, fields, btn, note) => `<form class="mf" data-mf="${id}" novalidate>${fields}<div class="mf-a"><button class="btn" type="submit"><span class="pl">${esc(btn.toUpperCase())}</span><span class="arr" aria-hidden="true">&rarr;</span></button><p class="mf-s" role="status"></p></div>${note ? `<p class="fine">${note}</p>` : ''}</form>`;
const inp = (n, l, t = 'text', o = '') => `<label class="fl"><span class="fl-l">${l}</span><input class="fl-in" name="${n}" type="${t}" ${o}></label>`;
const kv = rows => `<dl class="kv">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const MBODY = {
  record: () => `${kv([['Member', `<span class="mono">${MEMBER.no}</span>`], ['Member since', fmtDate(MEMBER.since)], ['Name', MEMBER.name], ['Email', MEMBER.email], ['Delivery', MEMBER.city + ' <span class="mono">' + MEMBER.post + '</span>'], ['Key', MEMBER.key], ['Your Protocol', '<span data-rec-pro></span>'], ['Field Club', '<a class="u" href="#/club">Notifications on</a>']])}
    <p class="fine">Sample record. To change any of these details, write to <a class="u" href="#/m/liaison">Member Liaison</a>.</p>`,
  cabinet: () => { const ids = [...new Set(PAST.flatMap(d => d.items.map(i => i[0])))]; return `<p class="lede">Everything that has come to you, in one place. Reorder a single item without changing Your Protocol.</p>
    <ol class="rows cab">${ids.map(id => { const p = byId(id); return `<li class="row" data-id="${id}"><a class="row-a" href="#/p/${id}"><span class="r-c mono">${id}</span><span class="r-n">${esc(p.n)}</span><span class="r-f">${esc(p.g)}</span><span class="r-s">Last sent ${fmtDate(PAST.find(d => d.items.some(x => x[0] === id)).d)}</span><span class="r-p mono">${money(p.pc)}</span></a><button class="r-add" type="button" data-add="${id}" data-lbl="Reorder" aria-label="Reorder ${esc(p.n)}, one-off">Reorder</button></li>`; }).join('')}</ol>
    <p class="fine">Sample cabinet, built from the sample dispatches.</p>`; },
  dispatches: () => `<div class="nxd"><h2 class="t-title sub-t">Next dispatch</h2><p class="nxd-d">${dispatchLabel()}</p><div data-nxd></div></div>
    <h2 class="t-title sub-t mt">Past dispatches <span class="smp">Sample</span></h2>
    <div class="tbl-w"><table class="tbl disp"><thead><tr><th scope="col">No.</th><th scope="col">Sent</th><th scope="col">Items</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead><tbody>
    ${PAST.map(d => `<tr><td class="mono">${d.no}</td><td>${fmtDate(d.d)}</td><td class="mono">${d.items.map(([id, q]) => `<a class="u" href="#/p/${id}">${id}</a>${q > 1 ? ' ×' + q : ''}`).join(', ')}</td><td class="mono">${money(d.items.reduce((s, [id, q]) => s + byId(id).pc * q, 0))}</td><td>${d.st}</td></tr>`).join('')}</tbody></table></div>`,
  nominations: () => `<p class="lede">Members may nominate someone for a key. Member Liaison reviews each nomination and replies to you, not to them.</p>
    ${form('nom', inp('name', 'Their name') + inp('email', 'Their email', 'email', 'autocomplete="off"') + `<label class="fl"><span class="fl-l">One line on why</span><textarea class="fl-in" name="why" rows="3"></textarea></label>`, 'Send nomination', 'Two nominations per member per year.')}
    <h2 class="t-title sub-t mt">Your nominations <span class="smp">Sample</span></h2><p class="noms"><span class="mono">N-0031</span> J. Okafor, under review</p>`,
  notes: () => `<ol class="notes">${NOTES.map(n => `<li><details><summary><span class="n-t">${esc(n.t)}</span><span class="n-x">${esc(n.x)}</span><span class="n-m">${fmtDate(n.d)}, ${n.min} min read</span></summary><div class="n-b">${n.b.map(x => `<p>${esc(x)}</p>`).join('')}</div></details></li>`).join('')}</ol>`,
  new: () => `<p class="lede">The most recent additions to the Formulary.</p>
    <ol class="rows">${NEW.map(([id, d]) => row(byId(id), 'Added ' + fmtDate(d))).join('')}</ol>
    <p class="fine">Dates are sample dates.</p>`,
  liaison: () => `<p class="lede">One desk for everything: dispatches, your key, certificates of analysis, nominations, and any question about an entry.</p>
    ${kv([['Hours', 'Monday to Friday, 09:00 to 17:00 ET'], ['Reply', 'Within one business day'], ['Email', 'liaison@pr6.example']])}
    ${form('liai', `<label class="fl"><span class="fl-l">About</span><select class="fl-in" name="about"><option>A dispatch</option><option>Your Protocol</option><option>A certificate of analysis</option><option>Your key</option><option>Something else</option></select></label><label class="fl"><span class="fl-l">Message</span><textarea class="fl-in" name="msg" rows="4"></textarea></label>`, 'Send to Member Liaison')}`,
  key: () => `<div class="keyc"><div class="card" aria-hidden="true"><span class="card-wm">PR6</span><span class="card-c mono">0047 RSRV</span><span class="card-chip"></span></div>
    <div><p class="lede">Your key is a card with an NFC chip. Hold it to a phone and the Formulary opens already unlocked. The code on the card works on any device.</p>
    ${kv([['Code', '<span class="mono">0047RSRV</span>'], ['Card', MEMBER.key], ['Lost it?', '<a class="u" href="#/m/liaison">Member Liaison</a> retires the old code']])}
    <p class="kp"><a class="u" href="#/exit">Exit this device</a></p><p class="fine">Exit forgets the key on this browser and closes the Formulary.</p></div></div>`
};
const MLEDE = {record: 'Your details, as we hold them.', cabinet: 'What has come to you before.', dispatches: 'What is coming, and what has been sent.', nominations: 'Put someone forward for a key.', notes: 'Short notes on reading, storing and using the Formulary.', new: 'Recent additions to the range.', liaison: 'Write to the one desk that handles everything.', key: 'Activate, replace or retire your key.'};
function member(pg) {
  const i = MPAGES.findIndex(m => m[0] === pg); if (i < 0) return notFound();
  const [k, name] = MPAGES[i];
  return {
    key: 'member', cls: 'v-mem', title: 'PR6 · ' + name, crumb: {label: name, back: '#/'},
    html: `<header class="wrap tp-h"><h1 class="t-head" tabindex="-1">${esc(name)}</h1><p class="sec-l">${MLEDE[k]}</p></header>
    <div class="wrap mem">
      <section class="mem-main" aria-label="${esc(name)}"><div class="mem-b mb-${k}">${MBODY[k]()}</div></section>
      <nav class="mem-nav" aria-label="Member pages"><h2 class="t-title sub-t">Member</h2><ol>${MPAGES.map(([kk, nn]) => `<li><a class="${kk === k ? 'on' : ''}" href="#/m/${kk}"${kk === k ? ' aria-current="page"' : ''}>${esc(nn)}</a></li>`).join('')}<li><a href="#/exit">Exit this device</a></li></ol></nav>
    </div>${foot()}`,
    init(el, ctx) {
      $$('[data-mf]', el).forEach(fm => fm.addEventListener('submit', e => {
        e.preventDefault(); const req = $$('input,textarea', fm).filter(x => x.type !== 'checkbox');
        const empty = req.find(x => !x.value.trim()); req.forEach(x => x.toggleAttribute('aria-invalid', !x.value.trim()));
        const s = $('.mf-s', fm);
        if (empty) { s.textContent = 'Please fill in every field.'; empty.focus(); return; }
        s.textContent = 'Received. In this preview nothing has been sent.'; fm.reset();
      }));
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-add]'); if (!b) return;
        e.preventDefault(); ctx.addFly(b.dataset.add, b); Protocol.add(b.dataset.add, 'one', 30, 1, {open: false});
        b.textContent = 'Added'; b.classList.add('done'); setTimeout(() => { b.textContent = b.dataset.lbl || 'Add'; b.classList.remove('done'); }, 1600);
      });
      const rp = $('[data-rec-pro]', el); if (rp) { const ls = Protocol.lines(); rp.textContent = ls.length ? `${ls.length} ${ls.length === 1 ? 'line' : 'lines'}, ${ls.filter(l => l.m === 'sub').length} on subscription` : 'Empty'; }
      const nx = $('[data-nxd]', el); if (nx) {
        const subs = Protocol.lines().filter(l => l.m === 'sub');
        nx.innerHTML = subs.length ? `<ol class="rows">${subs.map(l => { const p = byId(l.id); return `<li class="row"><a class="row-a" href="#/p/${p.id}"><span class="r-c mono">${p.id}</span><span class="r-n">${esc(p.n)} <span class="mono">×${l.q}</span></span><span class="r-f">${esc(p.g)}</span><span class="r-s">Every ${l.fr} days</span><span class="r-p mono">${money(p.psc * l.q)}</span></a></li>`; }).join('')}</ol>`
          : `<p class="fine">Nothing on subscription yet. Choose “On Your Protocol” on any entry to have it sent on a schedule.</p>`;
      }
      return {};
    }
  };
}

/* ================================================================ Search: a big field and a list */
function search() {
  return {
    key: 'search', cls: 'v-search', title: 'PR6 · Search', crumb: {label: 'Search', back: '#/'},
    html: `<header class="wrap tp-h s-h"><h1 class="t-head" tabindex="-1">Search the Formulary</h1>
        <label class="sr" for="sQ">Name, ingredient, format or code</label>
        <input id="sQ" class="s-q" type="search" placeholder="Name, ingredient, format or code" autocomplete="off" spellcheck="false" enterkeyhint="search"></header>
      <div class="wrap s-body"><p class="s-meta" id="sMeta" role="status"></p><ol class="rows" id="sRes"></ol></div>${foot()}`,
    init(el) {
      const q = $('#sQ', el), meta = $('#sMeta', el), res = $('#sRes', el);
      const render = () => {
        const raw = q.value.trim(), s = raw.toLowerCase();
        const rank = p => { const n = p.n.toLowerCase(); return p.id === s ? -1 : n.startsWith(s) ? 0 : n.split(/\s+/).some(w => w.startsWith(s)) ? 1 : n.includes(s) ? 2 : 3; };
        const hits = !s ? [] : ALL.filter(p => (p.n + ' ' + p.g + ' ' + p.cn + ' ' + p.id + ' ' + p.q + ' ' + p.act.map(a => a.name).join(' ') + ' ' + p.oth).toLowerCase().includes(s))
          .map((p, i) => [rank(p), i, p]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]).slice(0, 14);
        meta.textContent = !s ? 'Try creatine, magnesium, sachets, serum or 07. The first entry of each collection:' : hits.length ? `${hits.length} ${hits.length === 1 ? 'entry' : 'entries'}` : `Nothing in the Formulary matches “${raw}”.`;
        res.innerHTML = (s ? hits : CAT.map(c => c.it[0])).map(p => row(p)).join('');
      };
      q.addEventListener('input', render);
      q.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = $('a', res); if (a) location.hash = a.getAttribute('href'); } });
      render();
      return { focus() { q.focus({preventScroll: true}); } };
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
      <p class="cr-p">Every product picture in the store is an original PR6 render: one pale set, path-traced in Blender (Cycles), with each light written as its own pass. The browser adds the passes back together under your hand; nothing is generated and nothing is composited. Scripts in <span class="mono">v12/blender/</span>.</p>
      <p class="cr-p fine">${st.manifest ? `Shots in this build: <span class="mono">${st.shots.map(esc).join(', ')}</span>.` : 'The light renders have not landed in this build; earlier PR6 renders stand in.'}</p>
      ${(window.__pr6credits || []).length ? `<ol class="cr-l">${window.__pr6credits.map(c => `<li><p class="cr-k mono">${esc(c.k)}</p><p class="cr-v">${esc(c.v)}</p></li>`).join('')}</ol>` : ''}
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
    html: `<header class="wrap tp-h"><h1 class="t-head" tabindex="-1">Not in the Formulary.</h1><p class="sec-l">That address does not lead anywhere. <a class="u" href="#/">Back to the start</a> or <a class="u" href="#/formulary">open the Formulary</a>.</p></header>${foot()}`, init() { return {}; }};
}

export function makeView(r, o = {}) {
  switch (r.v) {
    case 'home': return home(o);
    case 'formulary': return formulary();
    case 'index': return index();
    case 'col': return collection(r.c, o.vt);
    case 'product': return product(r.id, o.vt);
    case 'club': return club(r.sub);
    case 'member': return member(r.page);
    case 'search': return search();
    case 'credits': return credits();
    default: return notFound();
  }
}

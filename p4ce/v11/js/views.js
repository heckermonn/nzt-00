/* PR6 v11 · "The Practice, Observed": the pages. Each is plain markup plus an init(); app.js mounts it into #page.
   v11 brings the references back (people, the body as data, macro, sealed metal, the night register) on v9's de-AI
   rules: FreeSans hierarchy, mono only for real data, glass only on the hero pane, the product panel and the Protocol
   drawer, no eyebrows, no identical card grids, no scattered fade-ups. Every phone screen opens on a full picture.
   Leader lines carry only true facts (an ingredient, its amount, the serving). No effect claims, no invented studies.
   British/Canadian spelling. */
import {CAT, ALL, byId, colOf, servingSize, purpose, directions, cautions, batch, CONC, PACKNAME} from './catalog.js';
import {$, $$, esc, money, ic, say, store, RM, clamp, sm} from './util.js';
import {packHTML, packOf} from './renders.js';
import {Protocol, dispatchLabel} from './protocol.js';
import {Disc} from './disc.js';
import {FEED, FEED_KINDS, REVIEWS, reviewOf, PAST, MEMBER, NEW, NOTES, fmtDate} from './content.js';
import {IMG} from './img.js';

const pic = IMG.pic;
const N = ALL.length;
const PAGE = () => document.getElementById('page');
/* APPROACH on the Dossier: one of the kit's pillars, read off the product's own directions (a filing label, not a claim) */
export const approach = p => /daily/.test(p.s) ? 'Consistency' : /as needed/.test(p.s) ? 'Intent' : 'Practice';
const range = co => { const ps = co.it.map(p => p.pc); const a = Math.min(...ps), b = Math.max(...ps); return a === b ? money(a) : `${money(a)}–${Math.round(b)}`; };
export const colData = co => `${co.it.length} entries <span class="dot" aria-hidden="true">·</span> ${range(co)}`;
const sizeOf = p => p.q.replace(/ (capsules|tablets|softgels|sachets)$/, m => m);
/* one index row: code (mono), name, format, size, CA$ */
const row = (p, extra = '') => `<li class="row" data-id="${p.id}"><a class="row-a" href="#/p/${p.id}"><span class="r-c mono">${p.id}</span><span class="r-n">${esc(p.n)}</span><span class="r-f">${esc(p.g)}</span><span class="r-s">${esc(extra || sizeOf(p))}</span><span class="r-p mono">${money(p.pc)}</span></a></li>`;

/* ================================================================ shared pieces */
/* an image header: the picture full-bleed (60%+ of a phone's first view), the title set on it */
function header(key, h1, lede, o = {}) {
  const dk = IMG.tone(key) === 'dark' && !/night-h/.test(o.cls || '') ? ' dk' : '';
  return `<header class="ih${o.cls ? ' ' + o.cls : ''}${dk}">${pic(key, {cls: 'ih-im', eager: true, alt: o.alt, sizes: '(orientation: portrait) 112vh, 100vw'})}
    <div class="ih-t wrap"><h1 class="${o.big ? 'dp' : 'hl'}" tabindex="-1">${h1}</h1>${lede ? `<p class="ih-d">${lede}</p>` : ''}${o.meta ? `<p class="ih-m">${o.meta}</p>` : ''}</div></header>`;
}
/* the body as data: a figure on mist with leader lines to true facts about one product */
function facts(p) {
  if (p.top) return (CONC[p.id] || []).slice(0, 4).map(c => [c[0], c[1]]).concat([['Serving', servingSize(p)]]);
  return p.act.filter(a => a.amt).slice(0, 4).map(a => [a.name, a.amt]).concat([['Serving', servingSize(p)]]);
}
const ANCH = [[50, 18], [46, 34], [54, 49], [48, 63], [51, 78]];
const LABY = [12, 30, 46, 62, 80];
export function bodyData(p, key = 'body-xray') {
  const f = facts(p).slice(0, 5);
  return `<figure class="bd" data-bd>
    <div class="bd-box">${pic(key, {cls: 'bd-im', sizes: '(max-width: 760px) 100vw, 56vw', alt: ''})}
      <svg class="bd-svg" aria-hidden="true" focusable="false"></svg>
      ${f.map((x, i) => `<span class="bd-dot" style="--x:${ANCH[i][0]}%;--y:${ANCH[i][1]}%;--d:${i}" aria-hidden="true"></span>`).join('')}
      <ul class="bd-ls">${f.map((x, i) => `<li class="bd-l ${i % 2 ? 'r' : 'l'}" style="--y:${LABY[i]}%;--d:${i}"><span class="bd-n">${esc(x[0])}</span> <span class="bd-v mono">${esc(x[1])}</span></li>`).join('')}</ul>
    </div>
    <figcaption class="bd-cap"><span class="mono">${p.id}</span> ${esc(p.n)}${p.top ? ', concentration in the formula' : ', amounts per serving'}</figcaption>
  </figure>`;
}
/* the leader lines: measured off the laid-out labels, drawn when the figure comes into view */
function bindBody(el) {
  const figs = $$('[data-bd]', el); if (!figs.length) return () => {};
  const lay = fig => {
    const box = $('.bd-box', fig), svg = $('.bd-svg', fig), b = box.getBoundingClientRect(); if (!b.width) return;
    svg.setAttribute('viewBox', `0 0 ${b.width.toFixed(1)} ${b.height.toFixed(1)}`);
    const dots = $$('.bd-dot', fig), ls = $$('.bd-l', fig);
    svg.innerHTML = ls.map((l, i) => {
      const d = dots[i].getBoundingClientRect(), r = l.getBoundingClientRect(), nr = l.firstElementChild.getBoundingClientRect();
      const x0 = d.left + d.width / 2 - b.left, y0 = d.top + d.height / 2 - b.top;
      const left = l.classList.contains('l'), ex = (left ? r.right : r.left) - b.left, ey = nr.top + nr.height * .6 - b.top;
      const kx = ex + (left ? 18 : -18);
      return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} L${kx.toFixed(1)} ${ey.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)}" pathLength="1" style="--d:${i}"/>`;
    }).join('');
  };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { lay(e.target); e.target.classList.add('on'); io.unobserve(e.target); } }), {threshold: .35});
  figs.forEach(f => { lay(f); io.observe(f); });
  const ro = new ResizeObserver(() => figs.forEach(lay)); figs.forEach(f => ro.observe($('.bd-box', f)));
  return () => { io.disconnect(); ro.disconnect(); };
}
/* the Formulary as nine full-width image tiles (phone) */
const tiles = () => `<ol class="tiles">${CAT.map((co, i) => `<li><a class="tile${i % 2 ? ' alt' : ''}${IMG.tone('c' + co.c) === 'dark' ? ' dk' : ''}" href="#/c/${co.c}">
    ${pic('c' + co.c, {cls: 'tile-ph', sizes: '100vw', alt: ''})}
    <span class="tile-pk" aria-hidden="true">${packHTML(co.it[0])}</span>
    <span class="tile-t"><span class="tile-n">${esc(co.n)}</span><span class="tile-c mono">${co.c}</span><span class="tile-d">${esc(co.d)}</span></span></a></li>`).join('')}</ol>`;
/* …and on a desktop, a lineup of the nine lead packs over one large photograph that changes with the pack */
const stage = () => `<div class="fx" data-fx>
    <div class="fx-ph" aria-hidden="true">${CAT.map((co, i) => pic('c' + co.c, {cls: 'fx-im' + (i ? '' : ' on'), sizes: '100vw', alt: '', attrs: ` data-i="${i}"`})).join('')}</div>
    <div class="fx-t"><h3 class="fx-n" data-fxn>${esc(CAT[0].n)}</h3><p class="fx-d" data-fxd>${esc(CAT[0].d)}.</p><p class="fx-m mono" data-fxm>${CAT[0].c} <span class="dot" aria-hidden="true">·</span> ${colData(CAT[0])}</p></div>
    <ol class="fx-row">${CAT.map((co, i) => `<li><a href="#/c/${co.c}" data-fi="${i}" class="fx-a${i ? '' : ' on'}"><span class="fx-pk" aria-hidden="true">${packHTML(co.it[0])}</span><span class="fx-l"><span class="mono">${co.c}</span> ${esc(co.n)}</span></a></li>`).join('')}</ol>
  </div>`;
function bindStage(el) {
  const fx = $('[data-fx]', el); if (!fx) return;
  let cur = 0;
  const show = i => {
    if (i === cur) return; cur = i; const co = CAT[i];
    $$('.fx-im', fx).forEach(d => { const on = +d.dataset.i === i; if (on && !RM) { d.classList.remove('in'); void d.offsetWidth; requestAnimationFrame(() => IMG.play(d)); } d.classList.toggle('on', on); });
    $$('.fx-a', fx).forEach(a => a.classList.toggle('on', +a.dataset.fi === i));
    $('[data-fxn]', fx).textContent = co.n; $('[data-fxd]', fx).textContent = co.d + '.';
    $('[data-fxm]', fx).innerHTML = `${co.c} <span class="dot" aria-hidden="true">·</span> ${colData(co)}`;
  };
  fx.addEventListener('pointerover', e => { const a = e.target.closest('[data-fi]'); if (a) show(+a.dataset.fi); });
  fx.addEventListener('focusin', e => { const a = e.target.closest('[data-fi]'); if (a) show(+a.dataset.fi); });
}

/* ================================================================ home: a scroll story of chapters, each opening on a full image */
const FEAT = '04-1';
function home() {
  const fp = byId(FEAT);
  const hr = IMG.rec('hero'), hs = IMG.rec('hero-sharp');
  const same = !hs || (hr && hs && hr.d === hs.d);
  const notices = FEED.slice(0, 3), revs = REVIEWS.slice(0, 2);
  return {
    key: 'home', cls: 'v-home', title: 'PR6 · The practice of progress', crumb: null,
    html: `<section class="hero${same ? ' same' : ''}" data-hero aria-labelledby="hH">
        <div class="hero-im">${pic('hero', {cls: 'h-blur', eager: true, sizes: '(orientation: portrait) 150vh, 100vw'})}${pic(hs ? 'hero-sharp' : 'hero', {cls: 'h-sharp', eager: true, alt: '', sizes: '(orientation: portrait) 150vh, 100vw'})}</div>
        <div class="pane"><div class="pane-g" aria-hidden="true"></div>
          <h1 id="hH" class="pane-t" tabindex="-1">The practice of progress</h1>
          <p class="pane-l">A private formulary of nine collections, kept for members. Progress, in practice.</p>
        </div>
      </section>

      <section class="ch fm" aria-labelledby="fH">
        <header class="ch-h wrap"><h2 id="fH" class="hl">The Formulary</h2>
          <p class="ch-l">Nine collections, ${N} entries, the same range as always. Each opens on its own picture and its full list. <a class="u" href="#/atlas">Walk the Atlas</a>, the studio film, to see the nine as still lifes.</p></header>
        ${tiles()}${stage()}
      </section>

      <section class="ch macro" data-macro aria-label="Close up">
        <div class="macro-in">${pic('macro-eye', {cls: 'macro-im'})}</div>
      </section>

      <section class="ch body" aria-labelledby="bH">
        <div class="wrap body-in">
          <div class="body-t"><h2 id="bH" class="hl">What is in it, exactly</h2>
            <p class="ch-l">Every Dossier lists each ingredient and its amount, against one serving. Nothing else is written on the figure. This is ${esc(fp.n)}, <span class="mono">${fp.id}</span>.</p>
            <a class="u" href="#/p/${fp.id}">Open its Dossier</a></div>
          ${bodyData(fp)}
        </div>
      </section>

      <section class="ch metal" aria-labelledby="mH">
        <div class="metal-hero">${pic('pack-tin', {cls: 'metal-im', sizes: '(max-width: 760px) 100vw, 62vw'})}</div>
        <div class="metal-side">
          <figure class="metal-det">${pic('pack-tin-detail', {cls: 'det-im', sizes: '(max-width: 760px) 60vw, 26vw'})}<figcaption>Brushed aluminium tin, the lid. Every pack carries a batch code on its base.</figcaption></figure>
          <h2 id="mH" class="hl">New Entries</h2>
          <ol class="rows">${NEW.slice(0, 5).map(([id]) => row(byId(id))).join('')}</ol>
          <a class="u more" href="#/m/new">All New Entries</a>
        </div>
      </section>

      <section class="ch night" data-tone="night" aria-labelledby="nH">
        <div class="night-ph">${pic('night', {cls: 'night-im'})}</div>
        <div class="wrap night-in">
          <h2 id="nH" class="hl">Field Club</h2>
          <p class="ch-l">Notices and reviews from the Formulary. <span class="smp">Sample</span></p>
          <ol class="lv">${notices.map(fd => `<li class="lv-r"><p class="lv-k"><span class="mono">${fmtDate(fd.d)}</span><span>${esc(FEED_KINDS[fd.k])}</span></p><p class="lv-v"><b>${esc(fd.t)}.</b> ${esc(fd.b)}</p></li>`).join('')}
          ${revs.map(r => { const p = byId(r.id); return `<li class="lv-r"><p class="lv-k"><span class="mono">${r.r.toFixed(1)} / 5</span><span>${r.n} reviews</span></p><p class="lv-v"><a class="u" href="#/p/${p.id}">${esc(p.n)}</a>: “${esc(r.q[0].t)}”</p></li>`; }).join('')}</ol>
          <a class="u more" href="#/club">Open Field Club</a>
        </div>
      </section>
      ${foot()}`,
    init(el) {
      const hero = $('[data-hero]', el), mac = $('[data-macro]', el), night = $('.night', el), page = PAGE();
      const t0 = performance.now();
      let raf = 0;
      const tick = () => {
        raf = 0;
        const vh = innerHeight, y = page.scrollTop;
        /* the hero resolves from blur: a little on arrival, the rest as you start to scroll */
        const intro = RM ? 1 : sm(0, 1, clamp((performance.now() - t0 - 250) / 1800)) * .72;
        const s = RM ? 1 : Math.max(intro, sm(0, vh * .34, y));
        hero.style.setProperty('--sharp', s.toFixed(3));
        if (!RM && s < .72 && performance.now() - t0 < 2200) raf = requestAnimationFrame(tick);
        /* the night register under the chrome: the top line and the bar go dark with it */
        if (night) { const r = night.getBoundingClientRect(), dk = r.top < 40 && r.bottom > 40; ['top', 'bar'].forEach(id => document.getElementById(id).classList.toggle('dark', dk)); }
        /* the macro pause: a slow push-in and a focus pull while it crosses the screen */
        if (!RM && mac) {
          const r = mac.getBoundingClientRect(); const t = clamp((vh - r.top) / (vh + r.height));
          if (t > 0 && t < 1) { mac.style.setProperty('--z', (1 + .16 * t).toFixed(4)); mac.style.setProperty('--b', ((1 - sm(.18, .48, t)) * 7).toFixed(2) + 'px'); }
        }
      };
      const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
      page.addEventListener('scroll', on, {passive: true}); addEventListener('resize', on);
      tick();
      bindStage(el);
      const unBody = bindBody(el);
      return { destroy() { page.removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); unBody(); ['top', 'bar'].forEach(id => document.getElementById(id).classList.remove('dark')); } };
    }
  };
}
const foot = () => `<footer class="foot wrap"><p><span class="wm">PR6</span> The practice of progress.</p>
  <nav aria-label="About"><a href="#/credits">Credits</a><a href="#/m/liaison">Member Liaison</a><a href="#/exit">Exit this device</a></nav></footer>`;

/* ================================================================ The Formulary: the nine collections */
function formulary() {
  return {
    key: 'formulary', cls: 'v-fm', title: 'PR6 · The Formulary', crumb: {label: 'The Formulary', back: '#/'},
    html: `<section class="fm fm-page" aria-labelledby="fpH">
        <header class="ch-h wrap fm-h"><h1 id="fpH" class="hl" tabindex="-1">The Formulary</h1>
          <p class="ch-l">Nine collections, ${N} entries. Or <a class="u" href="#/atlas">walk the Atlas</a>, or open <a class="u" href="#/index">every entry on one list</a>.</p></header>
        ${tiles()}${stage()}
      </section>${foot()}`,
    init(el) { bindStage(el); return {}; }
  };
}

/* ================================================================ The Dossier index: every entry, one line each */
function index() {
  return {
    key: 'index', cls: 'v-index', title: 'PR6 · The Dossier', crumb: {label: 'The Dossier', back: '#/formulary'},
    html: `${header('macro-cell', 'The Dossier', `Every entry in the Formulary, one line each: ${N} entries in nine collections. Open any line for its full Dossier. Prices in Canadian dollars.`)}
      <div class="wrap ixl">${CAT.map(co => `<section class="ix-g" aria-labelledby="g${co.c}">
          <h2 class="hl-s" id="g${co.c}"><a href="#/c/${co.c}"><span class="mono">${co.c}</span> ${esc(co.n)}</a></h2>
          <p class="ix-gd">${esc(co.d)}.</p>
          <ol class="rows">${co.it.map(p => row(p)).join('')}</ol></section>`).join('')}</div>${foot()}`,
    init() { return {}; }
  };
}

/* ================================================================ a collection: the picture, the lineup, the full list */
function collection(c) {
  const co = colOf(c); if (!co) return notFound();
  const i = CAT.indexOf(co), prev = CAT[(i + 8) % 9], next = CAT[(i + 1) % 9];
  return {
    key: 'col', cls: 'v-col', title: `PR6 · ${co.n}`, crumb: {label: `${co.c} ${co.n}`, back: '#/formulary'},
    html: `<article class="col">
      ${header('c' + co.c, esc(co.n), esc(co.d) + '.', {big: true, cls: 'col-h', meta: `<span class="mono">${co.c}</span> <span class="dot" aria-hidden="true">·</span> <span class="mono">${colData(co)}</span>`})}
      <section class="lu" aria-labelledby="luH">
        <h2 id="luH" class="sr">The lineup</h2>
        <ol class="lu-tr" data-lu>${co.it.map((p, k) => `<li class="lu-i${k ? '' : ' on'}" data-id="${p.id}"><a class="lu-a" href="#/p/${p.id}">
          <span class="lu-st" aria-hidden="true">${packHTML(p)}</span>
          <span class="lu-n">${esc(p.n)}</span><span class="lu-m"><span class="mono">${p.id}</span> ${esc(p.g)}, ${esc(p.q)} <span class="mono">${money(p.pc)}</span></span></a></li>`).join('')}</ol>
        <p class="lu-ix" aria-hidden="true"><span class="mono" data-luc>1</span> of ${co.it.length}. Swipe for the next.</p>
      </section>
      <section class="wrap ixl col-ix" aria-labelledby="ixH">
        <h2 id="ixH" class="hl-s">Every entry in ${esc(co.n)}</h2>
        <ol class="rows">${co.it.map(p => row(p)).join('')}</ol>
        <nav class="col-nav" aria-label="Other collections">
          <a href="#/c/${prev.c}"><span aria-hidden="true">&larr;</span> <span class="mono">${prev.c}</span> ${esc(prev.n)}</a>
          <a href="#/c/${next.c}"><span class="mono">${next.c}</span> ${esc(next.n)} <span aria-hidden="true">&rarr;</span></a>
        </nav>
      </section>
    </article>${foot()}`,
    init(el) {
      const tr = $('[data-lu]', el), items = $$('.lu-i', tr), cnt = $('[data-luc]', el);
      const set = k => { items.forEach((it, j) => it.classList.toggle('on', j === k)); if (cnt) cnt.textContent = k + 1; };
      /* phone: the item nearest the centre of the swipe track comes into focus */
      let raf = 0;
      const near = () => { raf = 0; if (getComputedStyle(tr).overflowX === 'visible') return; const c = tr.scrollLeft + tr.clientWidth / 2; let b = 0, bd = 1e9; items.forEach((it, j) => { const d = Math.abs(it.offsetLeft + it.offsetWidth / 2 - c); if (d < bd) { bd = d; b = j; } }); set(b); };
      tr.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(near); }, {passive: true});
      /* desktop: the hovered or focused pack comes forward and the rest fall back */
      tr.addEventListener('pointerover', e => { const it = e.target.closest('.lu-i'); if (!it || e.pointerType === 'touch') return; tr.classList.add('hov'); set(items.indexOf(it)); });
      tr.addEventListener('pointerleave', () => tr.classList.remove('hov'));
      tr.addEventListener('focusin', e => { const it = e.target.closest('.lu-i'); if (!it) return; tr.classList.add('hov'); set(items.indexOf(it)); });
      tr.addEventListener('focusout', e => { if (!tr.contains(e.relatedTarget)) tr.classList.remove('hov'); });
      return { lineup: {track: tr, go(k) { const it = items[clamp(k, 0, items.length - 1)]; tr.scrollTo({left: it.offsetLeft - (tr.clientWidth - it.offsetWidth) / 2, behavior: RM ? 'auto' : 'smooth'}); }, get index() { return items.findIndex(x => x.classList.contains('on')); }} };
    }
  };
}

/* ================================================================ the product: the kit's slide 4, built to DESIGN.md's
   measured spec, then the Dossier on flat Chalk */
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
function product(id) {
  const p = byId(id); if (!p) return notFound();
  const co = colOf(p.c), rel = co.it.filter(x => x.id !== p.id), rv = reviewOf(p.id), pack = packOf(p);
  const fld = (cls, label, value) => `<div class="fld ${cls}"><p class="fld-l mono">${esc(label.toUpperCase())}</p><p class="fld-v mono">${esc(String(value).toUpperCase())}</p></div>`;
  return {
    key: 'product', cls: 'v-product', title: `PR6 · ${p.n}`, crumb: {label: `${co.c} ${co.n} / ${p.n}`, back: '#/c/' + co.c},
    html: `<div class="pd">
      <section class="pd-stage" aria-labelledby="pnT">
        <div class="pd-bg" aria-hidden="true">${pic('c' + co.c, {cls: 'pd-bgim', eager: true, alt: ''})}</div>
        <div class="plate" aria-hidden="true"></div>
        <div class="panel">
          <div class="panel-glass" aria-hidden="true"></div>
          <header class="pn-h"><a class="pn-mark" href="#/c/${co.c}" aria-label="PR6, back to ${esc(co.n)}"><span class="wm" aria-hidden="true">PR6</span><i aria-hidden="true">/</i><span class="pn-sec mono" aria-hidden="true">${esc(co.n.toUpperCase())}</span></a></header>
          <a class="pn-back" href="#/c/${co.c}"><span aria-hidden="true">&larr;</span> ${esc(co.n)}</a>
          ${fld('f1', 'Collection', `${co.c} ${co.n}`)}${fld('f2', 'Format', p.g)}${fld('f3', 'Approach', approach(p))}
          <h1 class="pn-t" id="pnT" tabindex="-1">${esc(p.n)}</h1>
          <div class="pn-disc" data-disc aria-hidden="true"><div class="disc"></div><div class="disc-items"></div></div>
          <div class="pn-act"><button class="btn" type="button" data-add1><span class="pl">ADD TO PROTOCOL</span><span class="arr" aria-hidden="true">&rarr;</span></button></div>
          <footer class="pn-f"><span class="mono">${p.id}</span><span class="mono">${money(p.pc)}</span><i class="hair" aria-hidden="true"></i></footer>
        </div>
      </section>

      <article class="dos" aria-labelledby="pdH">
        <header class="wrap dos-h"><h2 id="pdH" class="hl">${esc(p.n)}</h2><p class="dos-w">${esc(p.w)}</p></header>
        <div class="wrap dos-a">
          <figure class="dos-det">${pic(`pack-${pack}-detail`, {cls: 'det-im', sizes: '(max-width: 760px) 100vw, 40vw'})}
            <figcaption>${esc(PACKNAME[pack])}, detail. Batch <span class="mono">${batch(p)}</span> on the base.</figcaption></figure>
          <div class="dos-bd">${bodyData(p, p.top ? 'macro-skin' : 'body-xray')}</div>
        </div>
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
          <h3 id="relH" class="hl-s">More from ${esc(co.n)}</h3>
          <ol class="rows">${rel.map(x => row(x)).join('')}</ol>
        </section>
      </article>
    </div>${foot()}`,
    init(el, ctx) {
      const discEl = $('[data-disc]', el);
      Disc.init(discEl); Disc.show(p, {instant: true}); Disc.setIdle('spin'); Disc.setTurn(null);
      const f = $('[data-buy]', el), out = $('output', f); let q = 1;
      const sync = () => { const sub = f.m.value === 'sub'; $$('.opt', f).forEach(o => o.classList.toggle('on', o.querySelector('input').checked)); f.fr.disabled = !sub; };
      f.addEventListener('change', sync); sync();
      $$('[data-q]', f).forEach(b => b.onclick = () => { q = clamp(q + +b.dataset.q, 1, 99); out.textContent = q; });
      const added = (btn, m, fr, qq, label) => {
        ctx.addFly(p.id, btn);
        Protocol.add(p.id, m, fr, qq, {open: false});
        const pl = $('.pl', btn) || btn; const was = pl.innerHTML;
        pl.textContent = label; btn.classList.add('done');
        setTimeout(() => { pl.innerHTML = was; btn.classList.remove('done'); }, 1900);
      };
      $('[data-add1]', el).addEventListener('click', e => added(e.currentTarget, 'one', 30, 1, 'ADDED'));
      f.addEventListener('submit', e => { e.preventDefault(); added($('.add-txt', f), f.m.value, +f.fr.value, q, 'Added to Your Protocol'); });
      /* drag across the disc to turn the pack */
      let drag = null;
      discEl.addEventListener('pointerdown', e => { if (e.button > 0) return; drag = {x: e.clientX, y: e.clientY, lx: e.clientX, axis: null, id: e.pointerId}; });
      discEl.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        if (!drag.axis && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) { drag.axis = Math.abs(e.clientX - drag.x) > Math.abs(e.clientY - drag.y) ? 'x' : 'y'; if (drag.axis === 'x') { try { discEl.setPointerCapture(e.pointerId); } catch (x) {} Disc.grab(true); } }
        if (drag.axis === 'x') { Disc.dragTurn(e.clientX - drag.lx); drag.lx = e.clientX; }
      });
      const up = () => { if (drag && drag.axis === 'x') Disc.grab(false); drag = null; };
      discEl.addEventListener('pointerup', up); discEl.addEventListener('pointercancel', up);
      const unBody = bindBody(el);
      return {
        keydown(e) { if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowRight') Disc.nudge(2); if (e.key === 'ArrowLeft') Disc.nudge(-2); },
        destroy() { Disc.setTurn(null); Disc.grab(false); Disc.release(); unBody(); }
      };
    }
  };
}

/* ================================================================ PR6 / Field Club: the night register */
const CLUB = 'pr6.v11.club';
const PLURAL = {restock: 'Restocks', new: 'New entries', session: 'Session notes', dispatch: 'Dispatch reminders', note: 'Field notes'};
function club(sub) {
  const prefs = Object.assign({restock: true, new: true, session: true, dispatch: false, note: true}, store.get(CLUB, {}));
  const total = REVIEWS.reduce((s, r) => s + r.n, 0), rvAll = REVIEWS.reduce((s, r) => s + r.r * r.n, 0) / total;
  return {
    key: 'club', cls: 'v-club', tone: 'night', title: 'PR6 · Field Club', crumb: {label: 'Field Club', back: '#/'},
    html: `${header('night', 'Field Club', 'Notices and reviews from the Formulary. Field Club is not a membership tier; every member has it.', {big: true, cls: 'night-h'})}
    <div class="wrap club">
      <section class="sess" aria-labelledby="sH">
        <h2 id="sH" class="hl-s">Session 006</h2>
        <dl class="kit6"><div><dt>Session</dt><dd class="mono">006</dd></div><div><dt>When</dt><dd>Saturday, 08:00</dd></div><div><dt>What</dt><dd>A 6 km easy loop, then coffee</dd></div><div><dt>Where</dt><dd>Member Liaison sends the meeting point on Friday</dd></div><div><dt>Principle</dt><dd>Go further. Together.</dd></div></dl>
      </section>
      <div class="club-cols">
        <section aria-labelledby="nH">
          <h2 id="nH" class="hl-s">Notices <span class="smp">Sample</span></h2>
          <ol class="lv">${FEED.map(fd => { const p = fd.id && byId(fd.id); return `<li class="lv-r fd" data-k="${fd.k}"${prefs[fd.k] === false ? ' data-muted' : ''}>
            <p class="lv-k"><span class="mono">${fmtDate(fd.d)}</span><span>${esc(FEED_KINDS[fd.k])}</span></p>
            <p class="lv-v"><b>${esc(fd.t)}.</b> ${esc(fd.b)}${p ? ` <a class="u" href="#/p/${p.id}">${esc(p.n)}</a>` : fd.href ? ` <a class="u" href="${fd.href}">Read it</a>` : ''}</p></li>`; }).join('')}</ol>
          <div class="prefs-w"><h3 class="sub-t">Tell me about</h3>
            <ul class="prefs">${Object.keys(FEED_KINDS).map(kk => `<li><label class="sw"><input type="checkbox" data-pref="${kk}"${prefs[kk] ? ' checked' : ''}><span class="sw-t">${esc(PLURAL[kk])}</span><span class="sw-k" aria-hidden="true"></span></label></li>`).join('')}</ul>
            <p class="fine">By email, from Member Liaison. Saved on this device in the preview.</p></div>
        </section>
        <section id="reviews" aria-labelledby="rH">
          <h2 id="rH" class="hl-s">Reviews <span class="smp">Sample</span></h2>
          <p class="rv-all"><span class="mono">${rvAll.toFixed(1)} / 5</span> across ${total} reviews of ${REVIEWS.length} entries</p>
          <ol class="lv">${REVIEWS.map(r => { const p = byId(r.id); return `<li class="lv-r">
            <p class="lv-k"><span class="mono">${r.r.toFixed(1)} / 5</span><span>${r.n} reviews</span></p>
            <div class="lv-v"><p class="rv-p"><a class="u" href="#/p/${p.id}">${esc(p.n)}</a> <span class="mono">${p.id}</span></p>
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

/* ================================================================ member pages: one shell, each opening on its own picture */
export const MPAGES = [
  ['record', 'Member Record'], ['cabinet', 'Your Cabinet'], ['dispatches', 'Dispatches'], ['nominations', 'Nominations'],
  ['notes', 'Field Notes'], ['new', 'New Entries'], ['liaison', 'Member Liaison'], ['key', 'Your Key']
];
const MIMG = {record: 'glass-face', cabinet: 'pack-jar', dispatches: 'pack-box', nominations: 'c09', notes: 'body-xray', new: 'pack-pouch', liaison: 'c06', key: 'pack-tin-detail'};
const form = (id, fields, btn, note) => `<form class="mf" data-mf="${id}" novalidate>${fields}<div class="mf-a"><button class="btn" type="submit"><span class="pl">${esc(btn.toUpperCase())}</span><span class="arr" aria-hidden="true">&rarr;</span></button><p class="mf-s" role="status"></p></div>${note ? `<p class="fine">${note}</p>` : ''}</form>`;
const inp = (n, l, t = 'text', o = '') => `<label class="fl"><span class="fl-l">${l}</span><input class="fl-in" name="${n}" type="${t}" ${o}></label>`;
const kv = rows => `<dl class="kv">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const MBODY = {
  record: () => `${kv([['Member', `<span class="mono">${MEMBER.no}</span>`], ['Member since', fmtDate(MEMBER.since)], ['Name', MEMBER.name], ['Email', MEMBER.email], ['Delivery', MEMBER.city + ' <span class="mono">' + MEMBER.post + '</span>'], ['Key', MEMBER.key], ['Your Protocol', '<span data-rec-pro></span>'], ['Field Club', '<a class="u" href="#/club">Notifications on</a>']])}
    <p class="fine">Sample record. To change any of these details, write to <a class="u" href="#/m/liaison">Member Liaison</a>.</p>`,
  cabinet: () => { const ids = [...new Set(PAST.flatMap(d => d.items.map(i => i[0])))]; return `<p class="lede">Everything that has come to you, in one place. Reorder a single item without changing Your Protocol.</p>
    <ol class="rows cab">${ids.map(id => { const p = byId(id); return `<li class="row" data-id="${id}"><a class="row-a" href="#/p/${id}"><span class="r-c mono">${id}</span><span class="r-n">${esc(p.n)}</span><span class="r-f">${esc(p.g)}</span><span class="r-s">Last sent ${fmtDate(PAST.find(d => d.items.some(x => x[0] === id)).d)}</span><span class="r-p mono">${money(p.pc)}</span></a><button class="r-add" type="button" data-add="${id}" data-lbl="Reorder" aria-label="Reorder ${esc(p.n)}, one-off">Reorder</button></li>`; }).join('')}</ol>
    <p class="fine">Sample cabinet, built from the sample dispatches.</p>`; },
  dispatches: () => `<div class="nxd"><h2 class="sub-t">Next dispatch</h2><p class="nxd-d">${dispatchLabel()}</p><div data-nxd></div></div>
    <h2 class="sub-t mt">Past dispatches <span class="smp">Sample</span></h2>
    <div class="tbl-w"><table class="tbl disp"><thead><tr><th scope="col">No.</th><th scope="col">Sent</th><th scope="col">Items</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead><tbody>
    ${PAST.map(d => `<tr><td class="mono">${d.no}</td><td>${fmtDate(d.d)}</td><td class="mono">${d.items.map(([id, q]) => `<a class="u" href="#/p/${id}">${id}</a>${q > 1 ? ' ×' + q : ''}`).join(', ')}</td><td class="mono">${money(d.items.reduce((s, [id, q]) => s + byId(id).pc * q, 0))}</td><td>${d.st}</td></tr>`).join('')}</tbody></table></div>`,
  nominations: () => `<p class="lede">Members may nominate someone for a key. Member Liaison reviews each nomination and replies to you, not to them.</p>
    ${form('nom', inp('name', 'Their name') + inp('email', 'Their email', 'email', 'autocomplete="off"') + `<label class="fl"><span class="fl-l">One line on why</span><textarea class="fl-in" name="why" rows="3"></textarea></label>`, 'Send nomination', 'Two nominations per member per year.')}
    <h2 class="sub-t mt">Your nominations <span class="smp">Sample</span></h2><p class="noms"><span class="mono">N-0031</span> J. Okafor, under review</p>`,
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
    <p><a class="u" href="#/exit">Exit this device</a></p><p class="fine">Exit forgets the key on this browser and closes the Formulary.</p></div></div>`
};
const MLEDE = {record: 'Your details, as we hold them.', cabinet: 'What has come to you before.', dispatches: 'What is coming, and what has been sent.', nominations: 'Put someone forward for a key.', notes: 'Short notes on reading, storing and using the Formulary.', new: 'Recent additions to the range.', liaison: 'Write to the one desk that handles everything.', key: 'Activate, replace or retire your key.'};
function member(pg) {
  const i = MPAGES.findIndex(m => m[0] === pg); if (i < 0) return notFound();
  const [k, name] = MPAGES[i];
  return {
    key: 'member', cls: 'v-mem', title: 'PR6 · ' + name, crumb: {label: name, back: '#/'},
    html: `${header(MIMG[k], esc(name), MLEDE[k])}
    <div class="wrap mem">
      <section class="mem-main" aria-label="${esc(name)}"><div class="mem-b mb-${k}">${MBODY[k]()}</div></section>
      <nav class="mem-nav" aria-label="Member pages"><h2 class="sub-t">Member</h2><ol>${MPAGES.map(([kk, nn]) => `<li><a class="${kk === k ? 'on' : ''}" href="#/m/${kk}"${kk === k ? ' aria-current="page"' : ''}>${esc(nn)}</a></li>`).join('')}<li><a href="#/exit">Exit this device</a></li></ol></nav>
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

/* ================================================================ Search: a picture, a big field, a list */
function search() {
  return {
    key: 'search', cls: 'v-search', title: 'PR6 · Search', crumb: {label: 'Search', back: '#/'},
    html: `<header class="ih s-h">${pic('macro-cell', {cls: 'ih-im', eager: true, alt: ''})}
      <div class="ih-t wrap"><h1 class="hl" tabindex="-1">Search the Formulary</h1>
        <label class="sr" for="sQ">Name, ingredient, format or code</label>
        <input id="sQ" class="s-q" type="search" placeholder="Name, ingredient, format or code" autocomplete="off" spellcheck="false" enterkeyhint="search"></div></header>
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
  const all = IMG.all(), seen = new Map();
  all.forEach(r => { const key = (r.credit || '') + '|' + (r.source || ''); if (!seen.has(key)) seen.set(key, {r, keys: []}); seen.get(key).keys.push(r.k); });
  const extra = IMG.credits();
  const st = IMG.status();
  return {
    key: 'credits', cls: 'v-credits', title: 'PR6 · Credits', crumb: {label: 'Credits', back: '#/'},
    html: `${header('glass-face', 'Credits', 'Who made the pictures, the renders and the type, and under which licence.')}
    <div class="wrap cr">
      <p class="fine">${st.real ? `Pictures from the v11 imagery set: <span class="mono">${st.real}</span> keys.` : 'The v11 imagery set has not landed; pictures shown are placeholders from earlier PR6 builds.'}</p>
      <h2 class="hl-s">Pictures</h2>
      <ol class="cr-l">${[...seen.values()].map(({r, keys}) => `<li><p class="cr-k mono">${keys.map(esc).join(', ')}</p><p class="cr-v">${esc(r.credit || 'PR6')}${r.licence ? `, ${esc(r.licence)}` : ''}${r.source && /^https?:/.test(r.source) ? `. <a class="u" href="${esc(r.source)}" rel="noopener" target="_blank">Source</a>` : r.source ? `. ${esc(r.source)}` : ''}</p></li>`).join('')}
      ${Array.isArray(extra) ? extra.filter(c => c && typeof c === 'object').map(c => `<li><p class="cr-k mono">${esc(c.key || c.file || '')}</p><p class="cr-v">${esc(c.credit || c.author || '')}${c.licence || c.license ? ', ' + esc(c.licence || c.license) : ''}${c.source && /^https?:/.test(c.source) ? `. <a class="u" href="${esc(c.source)}" rel="noopener" target="_blank">Source</a>` : ''}</p></li>`).join('') : ''}</ol>
      <h2 class="hl-s">Renders</h2>
      <p class="cr-p">Pack renders and the Atlas film are original PR6 work, made in Blender (Cycles). Scripts in <span class="mono">v6/blender/</span> and <span class="mono">v9/blender/</span>.</p>
      <h2 class="hl-s">Type</h2>
      <p class="cr-p">FreeSans (GNU FreeFont, GPL with font exception) and DejaVu Sans Mono (Bitstream Vera licence), self-hosted, Latin subset.</p>
    </div>${foot()}`,
    init() { return {}; }
  };
}

function notFound() {
  return {key: 'nf', cls: 'v-nf', title: 'PR6 · Not found', crumb: {label: 'Not found', back: '#/'},
    html: `${header('macro-skin', 'Not in the Formulary.', 'That address does not lead anywhere. <a class="u" href="#/">Back to the start</a> or <a class="u" href="#/formulary">open the Formulary</a>.')}`, init() { return {}; }};
}

export function makeView(r) {
  switch (r.v) {
    case 'home': return home();
    case 'formulary': return formulary();
    case 'index': return index();
    case 'col': return collection(r.c);
    case 'product': return product(r.id);
    case 'club': return club(r.sub);
    case 'member': return member(r.page);
    case 'search': return search();
    case 'credits': return credits();
    default: return notFound();
  }
}

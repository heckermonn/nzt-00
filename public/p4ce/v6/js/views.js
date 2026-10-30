/* PR6 v6 · the views. Each view is built as plain markup, then wired by its init().
   index / formulary / collection share one Index block (tabs, Index ⇄ Strip, the stage behind the list);
   product is The Dossier; club is PR6 / Field Club; member is one shell for the eight member pages. */
import {CAT, ALL, byId, colOf, servingSize, purpose, directions, cautions, batch, CONC, keyLine, PACKNAME, MIN} from './catalog.js';
import {$, $$, esc, money, pad2, cap, ic, say, store, RM, clamp, isPhone} from './util.js';
import {packHTML, packOf, Renders} from './renders.js';
import {Protocol, dispatchLabel} from './protocol.js';
import {APPROACH, FEED, FEED_KINDS, REVIEWS, reviewOf, PAST, MEMBER, NEW, NOTES, PILLARS, fmtDate} from './content.js';

const PH = 'assets/photos/';
const N = ALL.length;
const T = s => esc(String(s).toUpperCase());
const fmtLine = p => p.g + ' · ' + p.q;

/* ================================================================ the Index block */
const VKEY = 'pr6.v6.view';
function rowHTML(p) {
  return `<li class="ix-row" data-id="${p.id}">
    <span class="c-code mono">${p.id}</span>
    <a class="c-name" href="#/p/${p.id}" data-carry="${p.id}">${esc(p.n)}</a>
    <span class="c-fmt mono" data-size="${esc(p.q)}">${esc(p.g)}</span>
    <span class="c-size mono">${esc(p.q)}</span>
    <span class="c-pr mono">${money(p.pc)}</span>
    <button class="c-add mono" type="button" data-add="${p.id}" aria-label="Add ${esc(p.n)} to Your Protocol, one-off, ${money(p.pc)}"><span aria-hidden="true">[+]</span></button>
  </li>`;
}
function groupHTML(co, items, link) {
  return `<li class="ix-g" data-c="${co.c}">
    <h3 class="g-h">${link ? `<a href="#/c/${co.c}">` : '<span>'}<span class="g-c mono">${co.c}</span><span class="g-n mono">${T(co.n)}</span><span class="g-d">${esc(co.d)}</span><span class="g-k mono">${pad2(items.length)} ${items.length === 1 ? 'entry' : 'entries'}${link ? ' <span class="arr" aria-hidden="true">&rarr;</span>' : ''}</span>${link ? '</a>' : '</span>'}</h3>
    <ol class="g-rows">${items.map(rowHTML).join('')}</ol>
  </li>`;
}
function stripHTML(cols) {
  return cols.map(co => `<li class="sx-g mono" data-c="${co.c}"><span>${co.c} ${T(co.n)}</span></li>` + co.it.map(p => `<li class="sx-row" data-id="${p.id}">
      <span class="sx-l mono">${p.id}</span>
      <a class="sx-t" href="#/p/${p.id}" data-carry="${p.id}" aria-label="${esc(p.n)}, ${esc(fmtLine(p))}, ${money(p.pc)}">${packHTML(p, {mist: true})}</a>
      <span class="sx-r mono"><b>${esc(p.n)}</b><span>${esc(p.g)} · ${esc(p.q)} · ${money(p.pc)}</span></span>
    </li>`).join('')).join('');
}
/* tabs: buttons that filter in place (home, Formulary) or links between collections (a collection page) */
function tabsHTML(active, asLinks) {
  const t = (k, label, href) => asLinks
    ? `<a class="tab mono${active === k ? ' on' : ''}" href="${href}"${active === k ? ' aria-current="page"' : ''}>${label}</a>`
    : `<button class="tab mono${active === k ? ' on' : ''}" type="button" data-tab="${k}" aria-pressed="${active === k}">${label}</button>`;
  return `<div class="tabs" role="${asLinks ? 'navigation' : 'group'}" aria-label="Collections">${t('all', 'All <sup>' + N + '</sup>', '#/formulary')}${CAT.map(co => t(co.c, `${co.c} ${T(co.n)}`, '#/c/' + co.c)).join('')}</div>`;
}
function indexBlock(o) {
  const cols = o.c ? [colOf(o.c)] : CAT;
  const mode = store.get(VKEY, 'index') === 'strip' ? 'strip' : 'index';
  return `<div class="ix" data-ix data-mode="${mode}">
    <div class="ix-bar">
      ${tabsHTML(o.c || 'all', !!o.c)}
      <div class="vt mono" role="group" aria-label="View"><button type="button" data-vt="index" aria-pressed="${mode === 'index'}">Index</button><i aria-hidden="true">/</i><button type="button" data-vt="strip" aria-pressed="${mode === 'strip'}">Strip</button></div>
    </div>
    <div class="ix-body">
      <div class="ix-stage" aria-hidden="true"><div class="ix-mist"></div><div class="ix-cap mono"></div></div>
      <div class="ix-head mono" aria-hidden="true"><span>Code</span><span>Name</span><span>Format</span><span>Size</span><span>CA$</span><span></span></div>
      <ol class="ix-list" aria-label="${o.c ? 'Collection ' + o.c : 'The Formulary'}">${cols.map(co => groupHTML(co, co.it, !o.c)).join('')}</ol>
      <ol class="ix-strip" aria-label="Strip view">${stripHTML(cols)}</ol>
    </div>
  </div>`;
}
/* the stage behind the list: one product at a time, brought up on a mist gradient as a row is hovered or focused */
function wireIndex(root, ctx) {
  const ix = $('[data-ix]', root); if (!ix) return;
  const stage = $('.ix-stage', ix), cap = $('.ix-cap', ix);
  let cur = null, layer = null, hideT = 0;
  const show = id => {
    clearTimeout(hideT);
    if (cur === id) return; cur = id;
    ix.classList.toggle('hov', !!id);
    $$('.ix-row.on, .sx-row.on, .ix-g.on', ix).forEach(r => r.classList.remove('on'));
    if (!id) { if (layer) { const l = layer; l.classList.remove('in'); setTimeout(() => l.remove(), 700); layer = null; } stage.classList.remove('on'); return; }
    const p = byId(id);
    $$(`[data-id="${id}"]`, ix).forEach(r => r.classList.add('on'));
    const g = $(`.ix-g[data-c="${p.c}"]`, ix); if (g) g.classList.add('on');
    if (ix.dataset.mode !== 'index' || isPhone()) return;
    place();
    const old = layer;
    layer = document.createElement('div'); layer.className = 'ix-pk'; layer.dataset.stageId = id; layer.innerHTML = packHTML(p, {eager: true});
    stage.appendChild(layer); stage.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => layer && layer.classList.add('in')));
    if (old) { old.classList.remove('in'); old.classList.add('out'); setTimeout(() => old.remove(), 700); }
    cap.innerHTML = `<span>${p.id}</span><span>${T(PACKNAME[packOf(p)])}</span><span>${esc(keyLine(p) || p.q)}</span>`;
  };
  ctx.stageRectOf = id => { const l = layer && layer.dataset.stageId === id && $('.pk', layer); return l ? l.getBoundingClientRect() : null; };
  /* the stage starts under the sticky tabs (or the top of the list, while it is still coming up) */
  const head = $('.ix-head', ix), bar = $('.ix-bar', ix);
  const place = () => { const t = Math.max(bar.getBoundingClientRect().bottom, head.getBoundingClientRect().top); stage.style.setProperty('--st', Math.max(0, Math.round(t)) + 'px'); };
  const onScroll = () => { if (cur) place(); };
  addEventListener('scroll', onScroll, {passive: true});
  ctx.destroy = () => removeEventListener('scroll', onScroll);
  const rowOf = e => e.target.closest && e.target.closest('.ix-row, .sx-row');
  ix.addEventListener('pointerover', e => { const r = rowOf(e); if (r) show(r.dataset.id); });
  ix.addEventListener('pointerleave', () => { hideT = setTimeout(() => show(null), 260); });
  ix.addEventListener('focusin', e => { const r = rowOf(e); if (r) show(r.dataset.id); });
  ix.addEventListener('focusout', e => { if (!ix.contains(e.relatedTarget)) show(null); });
  /* tabs filter in place */
  $$('[data-tab]', ix).forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.tab;
    $$('[data-tab]', ix).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    $$('.ix-g, .sx-g', ix).forEach(g => g.hidden = k !== 'all' && g.dataset.c !== k);
    $$('.sx-row', ix).forEach(r => r.hidden = k !== 'all' && !r.dataset.id.startsWith(k + '-'));
    show(null);
    say(k === 'all' ? 'Showing all ' + N + ' entries.' : 'Showing ' + colOf(k).n + '.');
  }));
  /* Index ⇄ Strip */
  $$('[data-vt]', ix).forEach(b => b.addEventListener('click', () => {
    const m = b.dataset.vt; if (ix.dataset.mode === m) return;
    show(null); ix.classList.add('swap');
    setTimeout(() => { ix.dataset.mode = m; $$('[data-vt]', ix).forEach(x => x.setAttribute('aria-pressed', x.dataset.vt === m)); store.set(VKEY, m); requestAnimationFrame(() => ix.classList.remove('swap')); }, RM ? 0 : 220);
  }));
  /* the quick [+]: one-off, quantity one; the row answers, the drawer stays shut */
  ix.addEventListener('click', e => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    e.preventDefault(); Protocol.add(b.dataset.add, 'one', 30, 1, {open: false});
    b.classList.add('done'); b.firstElementChild.textContent = '[✓]'; ctx.pulse && ctx.pulse();
    setTimeout(() => { b.classList.remove('done'); b.firstElementChild.textContent = '[+]'; }, 1600);
  });
}

/* ================================================================ Home: the Index */
function home() {
  return {
    title: 'PR6 · The Index', crumb: 'The Index', cls: 'v-home',
    html: `
    <section class="hero" data-hero>
      <div class="hero-ph" aria-hidden="true"><img src="${PH}hero-cyclist.webp" alt="" fetchpriority="high" decoding="async"></div>
      <div class="hero-frost" aria-hidden="true"></div>
      <div class="hero-marks" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <p class="hx hx-tl mono"><i class="rl"></i>Session 006<br><span>The Index / ${N} entries</span></p>
      <p class="hx hx-tr mono">${PILLARS.map((x, i) => `<span>[${pad2(i + 1)}]</span> ${T(x)}`).join('<br>')}</p>
      <div class="hero-wm">
        <h1 class="wm" tabindex="-1"><span class="sr">PR6: the practice of progress</span><span aria-hidden="true">PR6</span></h1>
        <p class="tag mono" aria-hidden="true">The practice of progress</p>
      </div>
      <div class="hero-bl">
        <p class="hx-line">Progress, in practice.</p>
        <a class="pill" href="#index" data-jump="index">Explore PR6 <span class="arr" aria-hidden="true">&rarr;</span></a>
      </div>
      <p class="hx hx-hint mono" aria-hidden="true">Move to see through the glass</p>
    </section>
    <section class="sec ix-sec" id="index" aria-labelledby="ixH">
      <header class="sec-h">
        <p class="lbl mono"><span>01</span> The Formulary <i>/</i> Index</p>
        <h2 id="ixH" class="h2">A higher daily standard.</h2>
        <p class="lede">${N} entries in nine collections, one line each. Point at an entry to bring the pack up; open it for its Dossier. Prices in Canadian dollars.</p>
      </header>
      ${indexBlock({})}
    </section>
    ${clubBand()}
    ${footer(true)}`,
    init(el, ctx) {
      wireIndex(el, ctx);
      const hero = $('[data-hero]', el), img = $('.hero-ph img', hero);
      const s = {f: 1, tf: 1, mx: .62, my: .55, tx: .62, ty: .55, lens: 0, tl: 0, moved: 0};
      const onMove = e => { const r = hero.getBoundingClientRect(); s.tx = (e.clientX - r.left) / r.width; s.ty = (e.clientY - r.top) / r.height; s.tl = 1; s.moved = performance.now(); };
      hero.addEventListener('pointermove', onMove);
      hero.addEventListener('pointerleave', () => { s.tl = 0; });
      const jump = $('[data-jump]', hero); jump.addEventListener('click', e => { e.preventDefault(); $('#index', el).scrollIntoView({behavior: RM ? 'auto' : 'smooth'}); setTimeout(() => { const t = $('.tab', el); t && t.focus({preventScroll: true}); }, RM ? 0 : 700); });
      return {
        frame(dt) {
          const h = hero.offsetHeight || 1, y = scrollY;
          if (y > h * 1.2) return;
          s.tf = 1 - clamp(y / (h * .62));
          const k = RM ? 1 : 1 - Math.exp(-dt * 5);
          s.f += (s.tf - s.f) * k; s.mx += (s.tx - s.mx) * k; s.my += (s.ty - s.my) * k;
          if (performance.now() - s.moved > 2600) s.tl = 0;
          s.lens += (s.tl - s.lens) * (1 - Math.exp(-dt * 3));
          const st = hero.style;
          st.setProperty('--f', s.f.toFixed(3)); st.setProperty('--mx', (s.mx * 100).toFixed(2) + '%'); st.setProperty('--my', (s.my * 100).toFixed(2) + '%');
          st.setProperty('--lens', (s.lens * 15).toFixed(2) + 'vmax');
          if (!RM) img.style.transform = `translate3d(${((s.mx - .5) * -14).toFixed(1)}px, ${(y * .18).toFixed(1)}px, 0) scale(${(1.06 - (1 - s.f) * .04).toFixed(3)})`;
        }
      };
    }
  };
}
/* the Field Club band at the foot of the Index: the node diagram from the kit, over the mist photograph */
function nodeSVG() {
  const C = [300, 230], P = {rest: [118, 230], movement: [492, 120], nutrition: [478, 230], consistency: [352, 318], community: [150, 400]};
  return `<svg class="nodes" viewBox="0 0 600 460" aria-hidden="true">
    <path d="M300 0V196" stroke="currentColor" stroke-width="1"/>
    ${Object.entries(P).map(([k, [x, y]]) => `<path d="M${C[0]} ${C[1]}L${x} ${y}" stroke="currentColor" stroke-width="1" opacity=".85"/><circle cx="${x}" cy="${y}" r="4.5" fill="currentColor"/><text x="${x + (x < 300 ? -12 : 12)}" y="${y + 4}" text-anchor="${x < 300 ? 'end' : 'start'}" font-family="JetBrains Mono, monospace" font-size="13" fill="currentColor">${k}</text>`).join('')}
    <circle cx="300" cy="230" r="26" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="300" cy="230" r="18" fill="currentColor"/>
  </svg>`;
}
function clubBand() {
  return `<section class="band" aria-labelledby="bandH">
    <div class="band-ph" aria-hidden="true"><img src="${PH}field.webp" alt="" loading="lazy" decoding="async"></div>
    <div class="band-in">
      <div class="band-t">
        <p class="lbl mono">PR6 <i>/</i> Field Club</p>
        <h2 id="bandH" class="h2">Go further.<br>Together.</h2>
        <p class="lede">Restocks, new entries and session notes, and what members say about the range. Information only.</p>
        <a class="pill ghost" href="#/club">Open Field Club <span class="arr" aria-hidden="true">&rarr;</span></a>
      </div>
      ${nodeSVG()}
    </div>
  </section>`;
}
function footer(big) {
  return `<footer class="foot${big ? '' : ' sm'}">
    ${big ? '<div class="foot-wm" aria-hidden="true">PR6</div>' : ''}
    <div class="foot-cols mono">
      <div><p class="lbl">PR6</p><p>The practice of progress.<br>Private. Members only.</p></div>
      <div><p class="lbl">Formulary</p><a href="#/formulary">The Formulary</a><a href="#/m/new">New Entries</a><a href="#/m/notes">Field Notes</a><a href="#/club">Field Club</a></div>
      <div><p class="lbl">Member</p><a href="#/m/record">Member Record</a><a href="#/m/cabinet">Your Cabinet</a><a href="#/m/dispatches">Dispatches</a><a href="#/m/nominations">Nominations</a></div>
      <div><p class="lbl">Help</p><a href="#/m/liaison">Member Liaison</a><a href="#/m/key">Your Key</a><a href="#/exit">Exit this device</a></div>
    </div>
    <p class="foot-fine mono"><span>PR6 / 2026</span><span>Prices in CAD are placeholders</span><span>Photographs: Unsplash (see credits)</span></p>
  </footer>`;
}

/* ================================================================ The Formulary (the whole Index, no hero) */
function formulary() {
  return {
    title: 'PR6 · The Formulary', crumb: 'The Formulary', cls: 'v-form',
    html: `<section class="sec sec-top" aria-labelledby="fH">
      <header class="sec-h">
        <p class="lbl mono"><span>${N}</span> Entries <i>/</i> 9 collections</p>
        <h1 id="fH" class="h1" tabindex="-1">The Formulary</h1>
        <p class="lede">The whole range, one line each. Point at an entry to bring the pack up; open it for its Dossier.</p>
      </header>
      ${indexBlock({})}
    </section>${footer()}`,
    init(el, ctx) { wireIndex(el, ctx); }
  };
}

/* ================================================================ Collection */
/* one misty photograph per collection header (the same few, framed differently) */
const COLPH = [['field', '50% 70%'], ['fog', '50% 62%'], ['sprint', '40% 50%'], ['sprint', '70% 55%'], ['field', '20% 70%'], ['fog', '50% 40%'], ['field', '80% 70%'], ['fog', '50% 75%'], ['field', '35% 60%']];
function collection(c) {
  const co = colOf(c); if (!co) return notFound();
  const i = CAT.indexOf(co), prev = CAT[(i + CAT.length - 1) % CAT.length], next = CAT[(i + 1) % CAT.length], lead = co.it[0];
  const from = Math.min(...co.it.map(p => p.pc));
  return {
    title: `PR6 · ${co.c} ${co.n}`, crumb: `${co.c} ${co.n}`, cls: 'v-col',
    html: `<section class="colh" aria-labelledby="cH">
      <div class="colh-ph" aria-hidden="true"><img src="${PH}${COLPH[i % COLPH.length][0]}.webp" alt="" decoding="async" style="object-position:${COLPH[i % COLPH.length][1]}"></div>
      <div class="colh-in">
        <p class="lbl mono">Collection <span>${co.c} / ${pad2(CAT.length)}</span></p>
        <h1 id="cH" class="colh-n" tabindex="-1">${esc(co.n)}</h1>
        <p class="colh-d">${esc(co.d)}</p>
        <p class="colh-m mono">${pad2(co.it.length)} entries <i>/</i> from ${money(from)} <i>/</i> ${[...new Set(co.it.map(p => p.g))].map(T).join(', ')}</p>
      </div>
      <a class="colh-lead" href="#/p/${lead.id}" data-carry="${lead.id}" aria-label="${esc(lead.n)}">${packHTML(lead, {eager: true})}<span class="colh-cap mono">${lead.id} <i>/</i> ${T(lead.n)}</span></a>
      <nav class="colh-nav mono" aria-label="Other collections"><a href="#/c/${prev.c}"><span aria-hidden="true">&larr;</span> ${prev.c} ${T(prev.n)}</a><a href="#/c/${next.c}">${next.c} ${T(next.n)} <span aria-hidden="true">&rarr;</span></a></nav>
    </section>
    <section class="sec">${indexBlock({c})}</section>${footer()}`,
    init(el, ctx) { wireIndex(el, ctx); ctx.leadRect = () => { const l = $('.colh-lead .pk', el); return l ? l.getBoundingClientRect() : null; }; }
  };
}

/* ================================================================ The Dossier */
function ingTable(p) {
  if (p.top) {
    const c = CONC[p.id] || [];
    return `${c.length ? `<table class="tbl mono"><thead><tr><th scope="col">Key ingredient</th><th scope="col">Concentration</th></tr></thead><tbody>${c.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table>` : ''}
      <p class="full"><span class="mono">Full ingredients</span> ${esc(p.oth)}</p>`;
  }
  const per = (p.act.find(a => a.per) || {}).per || 'per serving';
  return `<table class="tbl mono"><thead><tr><th scope="col">Ingredient</th><th scope="col">Amount <span>${esc(per.replace(/^per /, 'per '))}</span></th></tr></thead><tbody>
    ${p.act.map(a => `<tr><td>${esc(a.name)}${a.form ? ` <span>(${esc(a.form)})</span>` : ''}</td><td>${esc(a.amt)}</td></tr>`).join('')}</tbody></table>
    <p class="full"><span class="mono">Other ingredients</span> ${esc(p.oth)}</p>`;
}
function product(id) {
  const p = byId(id); if (!p) return notFound();
  const co = colOf(p.c), rel = co.it.filter(x => x.id !== p.id), rv = reviewOf(p.id), pack = packOf(p);
  const frames = Renders.frames(p);
  const sec = (n, t, body) => `<section class="ds"><h2 class="ds-h mono"><span>${n}</span>${t}</h2>${body}</section>`;
  return {
    title: `PR6 · ${p.n}`, crumb: `The Dossier / ${p.id}`, cls: 'v-dos',
    html: `<div class="dos">
      <div class="dos-stage" aria-hidden="true">
        <div class="dos-bg"></div>
        <div class="dos-marks"><i></i><i></i><i></i><i></i></div>
        <div class="dos-obj${frames.length ? ' tt' : ''}" data-target="${p.id}">${packHTML(p, {eager: true})}</div>
        <p class="dos-l dos-tl mono">PR6 <i>/</i> ${p.id}</p>
        <p class="dos-l dos-bl mono">Batch ${batch(p)}<br>${T(PACKNAME[pack])}</p>
        <p class="dos-l dos-br mono">${frames.length ? 'Drag to turn' : T(p.q)}</p>
      </div>
      <article class="dos-panel" aria-labelledby="pH">
        <a class="dos-back mono" href="#/c/${co.c}" data-carry="${p.id}"><span aria-hidden="true">&larr;</span> ${co.c} ${T(co.n)}</a>
        <p class="lbl mono">PR6 <i>/</i> The Dossier <span>${p.id}</span></p>
        <h1 id="pH" class="dos-n" tabindex="-1">${esc(p.n)}</h1>
        <p class="dos-w">${esc(p.w)}</p>
        <dl class="fields mono">
          <div><dt>Collection</dt><dd>${co.c} ${T(co.n)}</dd></div>
          <div><dt>Format</dt><dd>${T(p.g)} · ${T(p.q)}</dd></div>
          <div><dt>Approach</dt><dd>${T(APPROACH[p.c])}</dd></div>
        </dl>
        <form class="buy" data-buy novalidate>
          <fieldset class="opts"><legend class="sr">How you would like it</legend>
            <label class="opt"><input type="radio" name="m" value="sub" checked><span class="o-b"><span class="o-t">Your Protocol <em class="mono">Subscribe</em></span><span class="o-p mono">${money(p.psc)}</span><span class="o-s mono">Sent every <select name="fr" aria-label="Frequency"><option value="30">30</option><option value="60">60</option><option value="90">90</option></select> days. Skip or stop from Dispatches.</span></span></label>
            <label class="opt"><input type="radio" name="m" value="one"><span class="o-b"><span class="o-t">One-off</span><span class="o-p mono">${money(p.pc)}</span><span class="o-s mono">Sent once, with the next dispatch.</span></span></label>
          </fieldset>
          <div class="buy-r">
            <span class="step mono" role="group" aria-label="Quantity"><button type="button" data-q="-1" aria-label="One fewer">${ic('minus', 's')}</button><output name="q" aria-live="polite">1</output><button type="button" data-q="1" aria-label="One more">${ic('plus', 's')}</button></span>
            <button class="pill add" type="submit"><span class="mono">[+]</span> Add to Protocol <span class="arr" aria-hidden="true">&rarr;</span></button>
          </div>
          <p class="buy-f mono"><span><i class="live" aria-hidden="true"></i>Next dispatch ${dispatchLabel()}</span><span>Prices in CAD</span></p>
        </form>
        ${sec('01', 'Serving', `<dl class="kv mono"><div><dt>Serving</dt><dd>${esc(servingSize(p))}</dd></div><div><dt>Directions say</dt><dd>${esc(p.s)}</dd></div><div><dt>In the pack</dt><dd>${esc(p.q)}</dd></div></dl><p class="ds-p">${esc(purpose(p))} ${esc(p.e)}</p>`)}
        ${sec('02', 'Ingredients', ingTable(p))}
        ${sec('03', 'Directions', `<ol class="ds-list">${directions(p).map(d => `<li>${esc(d)}</li>`).join('')}</ol>`)}
        ${sec('04', 'Cautions', `<ul class="ds-list">${cautions(p).map(d => `<li>${esc(d)}</li>`).join('')}</ul>`)}
        ${sec('05', 'Testing and sourcing', `<dl class="kv mono"><div><dt>Batch</dt><dd>${batch(p)}</dd></div><div><dt>Certificate</dt><dd>On request</dd></div><div><dt>Pack</dt><dd>${esc(PACKNAME[pack])}</dd></div></dl><p class="ds-p">Each batch is identified by the code on the base of the pack. A certificate of analysis for your batch is available from <a href="#/m/liaison">Member Liaison</a>. Sourcing details for each ingredient will be published here.</p>`)}
        ${rv ? sec('06', 'Field Club', `<div class="rv1"><p class="rv-s mono">${rv.r.toFixed(1)} / 5 <span>${rv.n} reviews · sample</span></p><blockquote>“${esc(rv.q[0].t)}”</blockquote><p class="mono rv-m">Member ${rv.q[0].m} <i>/</i> ${T(rv.q[0].d)}</p><a class="lnk mono" href="#/club/reviews">All reviews <span aria-hidden="true">&rarr;</span></a></div>`) : ''}
      </article>
    </div>
    <section class="rel" aria-labelledby="relH">
      <header class="rel-h"><h2 id="relH" class="lbl mono">More from ${co.c} ${T(co.n)}</h2><a class="lnk mono" href="#/c/${co.c}">The collection <span aria-hidden="true">&rarr;</span></a></header>
      <ol class="rel-l">${rel.map(x => `<li><a href="#/p/${x.id}" data-carry="${x.id}"><span class="rel-v">${packHTML(x, {mist: true})}</span><span class="rel-t mono"><span>${x.id}</span><b>${esc(x.n)}</b><span>${esc(x.g)} · ${money(x.pc)}</span></span></a></li>`).join('')}</ol>
    </section>
    ${footer()}`,
    init(el, ctx) {
      const f = $('[data-buy]', el), out = $('output', f); let q = 1;
      const sync = () => { const sub = f.m.value === 'sub'; $$('.opt', f).forEach(o => o.classList.toggle('on', o.querySelector('input').checked)); f.fr.disabled = !sub; };
      f.addEventListener('change', sync); sync();
      $$('[data-q]', f).forEach(b => b.onclick = () => { q = clamp(q + +b.dataset.q, 1, 99); out.textContent = q; });
      f.addEventListener('submit', e => { e.preventDefault(); Protocol.add(p.id, f.m.value, +f.fr.value, q); });
      ctx.dossierRect = () => { const t = $('.dos-obj .pk', el); return t ? t.getBoundingClientRect() : null; };
      /* the turntable, when the renders have frames: drag across the object */
      if (frames.length) {
        const obj = $('.dos-obj', el), im = $('img', obj); let x0 = 0, i0 = 0, i = 0, down = false;
        frames.slice(0, 8).forEach(s => { const m = new Image(); m.src = s; });
        obj.addEventListener('pointerdown', e => { down = true; x0 = e.clientX; i0 = i; obj.setPointerCapture(e.pointerId); frames.forEach(s => { const m = new Image(); m.src = s; }); });
        obj.addEventListener('pointermove', e => { if (!down || !im) return; i = ((Math.round(i0 + (e.clientX - x0) / 9) % frames.length) + frames.length) % frames.length; im.src = frames[i]; });
        const up = () => { down = false; }; obj.addEventListener('pointerup', up); obj.addEventListener('pointercancel', up);
      }
    }
  };
}

/* ================================================================ PR6 / Field Club (the one dark section) */
const CLUB = 'pr6.v6.club';
const PLURAL = {restock: 'Restocks', new: 'New entries', session: 'Session notes', dispatch: 'Dispatch reminders', note: 'Field notes'};
function club() {
  const prefs = Object.assign({restock: true, new: true, session: true, dispatch: false, note: true}, store.get(CLUB, {}));
  const rvAll = REVIEWS.reduce((s, r) => s + r.r * r.n, 0) / REVIEWS.reduce((s, r) => s + r.n, 0);
  return {
    title: 'PR6 · Field Club', crumb: 'Field Club', cls: 'v-club',
    html: `<section class="club-h" aria-labelledby="clH">
      <div class="club-ph" aria-hidden="true"><img src="${PH}runner.webp" alt="" decoding="async"></div>
      <div class="club-in">
        <p class="lbl mono">PR6 <i>/</i> Field Club <span>Session 006</span></p>
        <h1 id="clH" class="h1" tabindex="-1">Go further.<br>Together.</h1>
        <p class="lede">Notifications and information from the Formulary: restocks, new entries, session notes, and what members say about the range. Field Club is not a membership tier; every member has it.</p>
        <p class="club-p mono">${['Practice', 'Intent', 'Community'].map(x => `<span><i></i>${T(x)}</span>`).join('')}</p>
      </div>
      <p class="club-f mono" aria-hidden="true">Show up. Build together.</p>
    </section>
    <section class="sec club-feed" aria-labelledby="nH">
      <div class="cf-main">
        <header class="sec-h sm"><p class="lbl mono"><span>01</span> Notifications <span class="smp">Sample</span></p><h2 id="nH" class="h3">What changed in the Formulary</h2></header>
        <ol class="feed">${FEED.map(f => { const p = f.id && byId(f.id); return `<li class="fd" data-k="${f.k}"${prefs[f.k] === false ? ' data-muted' : ''}>
          <span class="fd-d mono">${fmtDate(f.d, {year: undefined})}</span>
          <span class="fd-k mono">[${T(FEED_KINDS[f.k])}]</span>
          <span class="fd-b"><b>${esc(f.t)}</b> ${esc(f.b)}</span>
          ${p ? `<a class="fd-a mono" href="#/p/${p.id}">${p.id} <span aria-hidden="true">&rarr;</span><span class="sr"> ${esc(p.n)}</span></a>` : f.href ? `<a class="fd-a mono" href="${f.href}">Read <span aria-hidden="true">&rarr;</span></a>` : '<span></span>'}
        </li>`; }).join('')}</ol>
      </div>
      <aside class="cf-side" aria-labelledby="sH">
        <h2 id="sH" class="lbl mono">Tell me about</h2>
        <ul class="prefs">${Object.keys(FEED_KINDS).map(k => `<li><label class="sw"><input type="checkbox" data-pref="${k}"${prefs[k] ? ' checked' : ''}><span class="sw-t">${esc(PLURAL[k])}</span><span class="sw-k" aria-hidden="true"></span></label></li>`).join('')}</ul>
        <p class="fine mono">By email, from Member Liaison. Saved on this device in the preview.</p>
      </aside>
    </section>
    <section class="sec club-rev" id="reviews" aria-labelledby="rH">
      <header class="sec-h sm rv-h"><div><p class="lbl mono"><span>02</span> Reviews <span class="smp">Sample</span></p><h2 id="rH" class="h3">What members say</h2></div><p class="rv-all mono"><b>${rvAll.toFixed(1)} / 5</b><span>${REVIEWS.reduce((s, r) => s + r.n, 0)} reviews across ${REVIEWS.length} entries</span></p></header>
      <ol class="rv">${REVIEWS.map(r => { const p = byId(r.id); return `<li class="rv-c">
        <a class="rv-p" href="#/p/${p.id}" data-carry="${p.id}"><span class="rv-v">${packHTML(p, {mist: true})}</span><span class="mono"><span>${p.id}</span><b>${esc(p.n)}</b></span></a>
        <p class="rv-s mono">${r.r.toFixed(1)} / 5 <span>${r.n} reviews</span></p>
        ${r.q.map(q => `<blockquote><p>“${esc(q.t)}”</p><footer class="mono">Member ${q.m} <i>/</i> ${T(q.d)}</footer></blockquote>`).join('')}
      </li>`; }).join('')}</ol>
      <p class="fine mono rv-note">Reviews describe the pack, the taste, the texture and the dispatch. Reviews that describe effects are not published.</p>
    </section>${footer()}`,
    init(el) {
      $$('[data-pref]', el).forEach(c => c.addEventListener('change', () => {
        const all = Object.assign({}, prefs); $$('[data-pref]', el).forEach(x => all[x.dataset.pref] = x.checked); store.set(CLUB, all);
        $$(`.fd[data-k="${c.dataset.pref}"]`, el).forEach(f => f.toggleAttribute('data-muted', !c.checked));
        say((c.checked ? 'On: ' : 'Off: ') + FEED_KINDS[c.dataset.pref] + 's.');
      }));
    }
  };
}

/* ================================================================ member pages: one shell */
export const MPAGES = [
  ['record', 'Member Record'], ['cabinet', 'Your Cabinet'], ['dispatches', 'Dispatches'], ['nominations', 'Nominations'],
  ['notes', 'Field Notes'], ['new', 'New Entries'], ['liaison', 'Member Liaison'], ['key', 'Your Key']
];
const form = (id, fields, btn, note) => `<form class="mf" data-mf="${id}" novalidate>${fields}<div class="mf-a"><button class="pill" type="submit">${btn} <span class="arr" aria-hidden="true">&rarr;</span></button><p class="mf-s mono" role="status"></p></div>${note ? `<p class="fine mono">${note}</p>` : ''}</form>`;
const fld = (n, l, t = 'text', o = '') => `<label class="fl"><span class="mono">${l}</span><input name="${n}" type="${t}" ${o}></label>`;
const MBODY = {
  record: () => `<dl class="rec mono">${[['Member', MEMBER.no], ['Member since', fmtDate(MEMBER.since)], ['Name', MEMBER.name], ['Email', MEMBER.email], ['Delivery', MEMBER.city + ' ' + MEMBER.post], ['Key', MEMBER.key], ['Protocol', '<span data-rec-pro></span>'], ['Field Club', '<a href="#/club">Notifications on</a>']].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <p class="fine mono">Sample record. To change any of these details, write to <a href="#/m/liaison">Member Liaison</a>.</p>`,
  cabinet: () => { const ids = [...new Set(PAST.flatMap(d => d.items.map(i => i[0])))]; return `<p class="lede">Everything that has come to you, in one place. Reorder a single item without changing Your Protocol.</p>
    <ol class="cab">${ids.map(id => { const p = byId(id); return `<li><a class="cab-v" href="#/p/${id}" data-carry="${id}">${packHTML(p, {mist: true})}</a><p class="mono cab-t"><span>${id}</span><b>${esc(p.n)}</b><span>Last sent ${fmtDate(PAST.find(d => d.items.some(i => i[0] === id)).d)}</span></p><button class="c-add mono" type="button" data-add="${id}" aria-label="Reorder ${esc(p.n)}, one-off"><span aria-hidden="true">[+]</span> Reorder</button></li>`; }).join('')}</ol>
    <p class="fine mono">Sample cabinet, built from the sample dispatches.</p>`; },
  dispatches: () => `<div class="nxd"><p class="lbl mono"><i class="live" aria-hidden="true"></i>Next dispatch</p><p class="nxd-d">${dispatchLabel()}</p><div data-nxd></div></div>
    <h2 class="lbl mono mt">Past dispatches <span class="smp">Sample</span></h2>
    <table class="tbl mono disp"><thead><tr><th scope="col">No.</th><th scope="col">Sent</th><th scope="col">Items</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead><tbody>
    ${PAST.map(d => `<tr><td>${d.no}</td><td>${fmtDate(d.d)}</td><td>${d.items.map(([id, q]) => `<a href="#/p/${id}">${id}</a>${q > 1 ? ' ×' + q : ''}`).join(', ')}</td><td>$${d.items.reduce((s, [id, q]) => s + byId(id).pc * q, 0)} CAD</td><td>${d.st}</td></tr>`).join('')}</tbody></table>`,
  nominations: () => `<p class="lede">Members may nominate someone for a key. Member Liaison reviews each nomination and replies to you, not to them.</p>
    ${form('nom', fld('name', 'Their name') + fld('email', 'Their email', 'email', 'autocomplete="off"') + `<label class="fl"><span class="mono">One line on why</span><textarea name="why" rows="3"></textarea></label>`, 'Send nomination', 'Two nominations per member per year.')}
    <h2 class="lbl mono mt">Your nominations <span class="smp">Sample</span></h2><ol class="noms mono"><li><span>N-0031</span><span>J. Okafor</span><span>Under review</span></li></ol>`,
  notes: () => `<ol class="notes">${NOTES.map(n => `<li><details><summary><span class="mono n-no">Field note ${n.no}</span><span class="n-t">${esc(n.t)}</span><span class="mono n-m">${fmtDate(n.d)} · ${n.min} min</span><span class="n-x">${esc(n.x)}</span></summary><div class="n-b">${n.b.map(x => `<p>${esc(x)}</p>`).join('')}</div></details></li>`).join('')}</ol>`,
  new: () => `<p class="lede">The most recent additions to the Formulary.</p>
    <ol class="newl">${NEW.map(([id, d]) => { const p = byId(id); return `<li><a href="#/p/${id}" data-carry="${id}"><span class="newl-v">${packHTML(p, {mist: true})}</span><span class="mono newl-d">Added ${fmtDate(d)}</span><span class="newl-n">${esc(p.n)}</span><span class="mono newl-m">${id} · ${esc(p.g)} · ${esc(p.q)} · ${money(p.pc)}</span></a></li>`; }).join('')}</ol>
    <p class="fine mono">Dates are sample dates.</p>`,
  liaison: () => `<div class="liai"><div><p class="lede">One desk for everything: dispatches, your key, certificates of analysis, nominations, and any question about an entry.</p>
    <dl class="kv mono"><div><dt>Hours</dt><dd>Mon to Fri, 09:00 to 17:00 ET</dd></div><div><dt>Reply</dt><dd>Within one business day</dd></div><div><dt>Email</dt><dd>liaison@pr6.example</dd></div></dl></div>
    ${form('liai', `<label class="fl"><span class="mono">About</span><select name="about"><option>A dispatch</option><option>Your Protocol</option><option>A certificate of analysis</option><option>Your key</option><option>Something else</option></select></label><label class="fl"><span class="mono">Message</span><textarea name="msg" rows="5"></textarea></label>`, 'Send to Member Liaison')}</div>`,
  key: () => `<div class="keyc"><div class="card" aria-hidden="true"><span class="card-wm">PR6</span><span class="card-c mono">0047 RSRV</span><span class="card-n mono">Member edition <i>/</i> Field Club</span><span class="card-chip"></span></div>
    <div><p class="lede">Your key is a card with an NFC chip. Hold it to a phone and the Formulary opens already unlocked. The code on the card works on any device.</p>
    <dl class="kv mono"><div><dt>Code</dt><dd>0047RSRV</dd></div><div><dt>Card</dt><dd>${MEMBER.key}</dd></div><div><dt>Lost it?</dt><dd><a href="#/m/liaison">Member Liaison</a> retires the old code</dd></div></dl>
    <a class="pill ghost" href="#/exit">Exit this device <span class="arr" aria-hidden="true">&rarr;</span></a><p class="fine mono">Exit forgets the key on this browser and closes the Formulary.</p></div></div>`
};
const MLEDE = {record: 'Your details, as we hold them.', cabinet: '', dispatches: 'What is coming, and what has been sent.', nominations: '', notes: 'Short notes on reading, storing and using the Formulary.', new: '', liaison: '', key: ''};
function member(pg) {
  const i = MPAGES.findIndex(m => m[0] === pg); if (i < 0) return notFound();
  const [k, name] = MPAGES[i];
  const photo = {liaison: 'fog', notes: 'field'}[k];
  return {
    title: 'PR6 · ' + name, crumb: name, cls: 'v-mem',
    html: `<div class="mem">
      <nav class="mem-nav" aria-label="Member pages"><p class="lbl mono">PR6 <i>/</i> Member</p><ol>${MPAGES.map(([kk, nn], j) => `<li><a class="mono${kk === k ? ' on' : ''}" href="#/m/${kk}"${kk === k ? ' aria-current="page"' : ''}><span>M/${pad2(j + 1)}</span>${T(nn)}</a></li>`).join('')}<li><a class="mono" href="#/exit"><span>--</span>EXIT</a></li></ol></nav>
      <section class="mem-main" aria-labelledby="mH">
        <header class="mem-h"><p class="lbl mono">Member <span>M/${pad2(i + 1)}</span></p><h1 id="mH" class="h1" tabindex="-1">${esc(name)}</h1>${MLEDE[k] ? `<p class="lede">${MLEDE[k]}</p>` : ''}</header>
        ${photo ? `<div class="mem-ph" aria-hidden="true"><img src="${PH}${photo}.webp" alt="" decoding="async"></div>` : ''}
        <div class="mem-b mb-${k}">${MBODY[k]()}</div>
      </section>
    </div>${footer()}`,
    init(el, ctx) {
      $$('[data-mf]', el).forEach(f => f.addEventListener('submit', e => {
        e.preventDefault(); const req = $$('input,textarea', f).filter(x => x.type !== 'checkbox');
        const empty = req.find(x => !x.value.trim()); req.forEach(x => x.toggleAttribute('aria-invalid', !x.value.trim()));
        const s = $('.mf-s', f);
        if (empty) { s.textContent = 'Please fill in every field.'; empty.focus(); return; }
        s.textContent = 'Received. In this preview nothing has been sent.'; f.reset();
      }));
      el.addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (!b) return; Protocol.add(b.dataset.add, 'one', 30, 1); });
      const rp = $('[data-rec-pro]', el); if (rp) { const ls = Protocol.lines(); rp.innerHTML = ls.length ? `${ls.length} ${ls.length === 1 ? 'line' : 'lines'}, ${ls.filter(l => l.m === 'sub').length} on subscription` : 'Empty'; }
      const nx = $('[data-nxd]', el); if (nx) {
        const subs = Protocol.lines().filter(l => l.m === 'sub');
        nx.innerHTML = subs.length ? `<ul class="nxd-l mono">${subs.map(l => { const p = byId(l.id); return `<li><a href="#/p/${p.id}">${p.id}</a><span>${esc(p.n)}</span><span>×${l.q}</span><span>Every ${l.fr} days</span><span>${money(p.psc * l.q)}</span></li>`; }).join('')}</ul>`
          : `<p class="mono fine">Nothing on subscription yet. Choose “Your Protocol” on any Dossier to have it sent on a schedule.</p>`;
      }
    }
  };
}

function notFound() {
  return {title: 'PR6 · Not found', crumb: 'Not found', cls: 'v-nf', html: `<section class="sec sec-top"><header class="sec-h"><p class="lbl mono">404</p><h1 class="h1" tabindex="-1">Not in the Formulary.</h1><p class="lede"><a class="lnk" href="#/">Back to the Index</a></p></header></section>`, init() {}};
}

export function makeView(r) {
  switch (r.v) {
    case 'home': return home();
    case 'formulary': return formulary();
    case 'col': return collection(r.c);
    case 'product': return product(r.id);
    case 'club': return club();
    case 'member': return member(r.page);
    default: return notFound();
  }
}
export {rowHTML};

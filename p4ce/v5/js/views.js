/* P4CE v5 · the member views, built as DOM on demand. Each view is a <section class="view"> with:
   slots ([data-slot=id]) where product actors dock, thumbs ([data-thumb=id]) actors can fly from,
   and .tx text blocks that fade (never wipe) on arrival and departure. */
import {CAT, ALL, byId, colOf, PACK, keyIng, keyLine, purpose, directions, cautions, fullList, servingSize, batch, SLOTS, slotsFor, CONC, MIN} from './catalog.js';
import {$, $$, esc, money, pad2, clamp, ic, isPhone, RM, sm, CLOCK} from './util.js';
import {frames, details, bboxOf, img, still} from './renders.js';
import {Stage} from './stage.js';
import {Protocol} from './protocol.js';

const REN = CAT[7].it;
const thumb = id => frames(id)[0] || '';
/* real scale: a frame's height so the product inside it stands at its true height in mm */
const MMH = {dropper: .7598, jar: .5227, bottle: .7823};
const BOT = {dropper: .8711, jar: .7547, bottle: .8916};
const frameH = (id, k) => { const P = PACK[id]; return P.h / MMH[P.kind] * k; };
const nameHTML = n => { const w = n.split(' '); const last = w.pop(); return (w.length ? esc(w.join(' ')) + ' ' : '') + '<em>' + esc(last) + '</em>'; };

/* ================================================================ Collection 08: the lineup on a paper sweep */
export function collectionView(go) {
  const co = CAT[7], el = document.createElement('section');
  el.className = 'view v-col'; el.dataset.view = 'collection'; el.setAttribute('aria-labelledby', 'colH');
  el.innerHTML = `
  <div class="col-hero">
    <div class="sweep" aria-hidden="true"></div>
    <header class="col-head tx">
      <h1 id="colH" tabindex="-1"><span class="code">08</span> <em>Renew</em></h1>
      <p class="desc">${esc(co.d)}</p>
    </header>
    <p class="col-meta tx mono">Six products<span>Sample prices</span></p>
    <div class="lineup" role="list" aria-label="08 Renew, six products">
      ${co.it.map((p, i) => `<a class="li" role="listitem" href="#/p/${p.id}" data-id="${p.id}" data-i="${i}" aria-label="${esc(p.n)}, ${esc(p.g)}, ${esc(p.q)}, ${money(p.po)}"><span class="slot" data-slot="${p.id}"></span><span class="hit" aria-hidden="true"></span></a>`).join('')}
    </div>
    <div class="col-focus tx" aria-live="polite"><p class="fn"></p><p class="fm mono"></p><a class="fv" href="#/p/08-3">View <span class="sr">the product</span>${ic('arrow', 's')}</a></div>
    <p class="col-hint tx mono" aria-hidden="true">${isPhone() ? 'Swipe the lineup' : 'Hover to bring one forward'}</p>
  </div>
  <section class="col-grid tx" aria-labelledby="cgH">
    <h2 id="cgH">All six, <em>in order</em></h2>
    <ul class="rows" role="list">
      ${co.it.map(p => `<li class="row" data-id="${p.id}">
        <a class="r-main" href="#/p/${p.id}"><img class="r-th" data-thumb="${p.id}" src="${thumb(p.id)}" alt="" loading="lazy" decoding="async"><span class="r-id mono">${p.id}</span><span class="r-n">${esc(p.n)}</span><span class="r-f">${esc(p.g)}</span><span class="r-q mono">${esc(p.q)}</span><span class="r-p mono">${money(p.po)}</span></a>
        <button class="r-add" type="button" data-add="${p.id}" aria-label="Add ${esc(p.n)} to your Protocol, one-time, ${money(p.po)}">${ic('plus', 's')}<span>Add</span></button></li>`).join('')}
    </ul>
  </section>`;
  const items = $$('.li', el);
  /* real scale, standing on one floor line */
  function size() {
    const ph = isPhone(), k = ph ? Math.min(innerHeight * .0024, innerWidth * .0047) : Math.min(innerHeight * .0028, innerWidth * .00155);
    items.forEach(a => { const id = a.dataset.id, s = $('.slot', a), h = frameH(id, k), b = BOT[PACK[id].kind]; s.style.height = h + 'px'; s.style.width = h * .8 + 'px'; s.style.marginBottom = -(h * (1 - b)) + 'px'; });
  }
  size();
  let focus = 2;
  const lookFor = id => {
    const i = co.it.findIndex(p => p.id === id), d = Math.abs(i - focus);
    if (d === 0) return {sc: 1.035, ty: -4};
    return {blur: 1.6 + d * 1.1, op: Math.max(.34, .62 - d * .08), sat: .4, sc: .975};
  };
  function setFocus(i, quiet) {
    focus = clamp(i, 0, 5);
    items.forEach((a, k) => { a.classList.toggle('f', k === focus); const ac = Stage.has(a.dataset.id) && Stage.get(a.dataset.id); if (ac && (ac.mode === 'slot' && ac.slot && el.contains(ac.slot) || ac.mode === 'fly' && el.isConnected && !el.classList.contains('leaving'))) ac.lookTo(lookFor(a.dataset.id), 6); });
    const p = co.it[focus], f = $('.col-focus', el);
    const fill = () => { $('.fn', f).innerHTML = nameHTML(p.n); $('.fm', f).innerHTML = `<span>${p.id}</span><span>${esc(PACK[p.id].fmt)} · ${esc(p.q)}</span><span>${money(p.po)}</span>`; $('.fv', f).href = '#/p/' + p.id; };
    if (quiet || RM) { fill(); return; }
    f.classList.add('swap'); clearTimeout(f._t); f._t = setTimeout(() => { fill(); f.classList.remove('swap'); }, 160);
  }
  setFocus(2, true);
  items.forEach((a, i) => { a.addEventListener('pointerenter', () => setFocus(i)); a.addEventListener('focus', () => setFocus(i)); });
  /* phone: the lineup is a horizontal swipe; the item nearest the centre is the focus */
  const lu = $('.lineup', el);
  lu.addEventListener('scroll', () => { if (!isPhone()) return; const c = lu.scrollLeft + lu.clientWidth / 2; let best = 0, bd = 1e9; items.forEach((a, i) => { const m = a.offsetLeft + a.offsetWidth / 2, d = Math.abs(m - c); if (d < bd) { bd = d; best = i; } }); if (best !== focus) setFocus(best); }, {passive: true});
  $$('[data-add]', el).forEach(b => b.addEventListener('click', e => { const id = b.dataset.add, th = $(`[data-thumb="${id}"]`, el); Protocol.add(id, 'once', 30, 1, th); }));
  addEventListener('resize', size);
  return {
    el, lookFor, kind: 'collection',
    shown() { if (isPhone()) { const a = items[focus]; lu.scrollLeft = a.offsetLeft - (lu.clientWidth - a.offsetWidth) / 2; } },
    setFocusId(id) { const i = co.it.findIndex(p => p.id === id); if (i >= 0) setFocus(i, true); },
    destroy() { removeEventListener('resize', size); }
  };
}

/* ================================================================ the product page */
export function productView(id, go) {
  const p = byId(id), P = PACK[id], co = CAT[7], ki = keyIng(p), i = REN.indexOf(p);
  const pv = REN[(i + 5) % 6], nx = REN[(i + 1) % 6];
  const det = details(id);
  const el = document.createElement('section');
  el.className = 'view v-prod'; el.dataset.view = 'product'; el.setAttribute('aria-labelledby', 'pdH');
  const opt = {m: 'once', fr: 30, q: 1};
  const conc = p.top ? (CONC[p.id] || []) : p.act.map(a => [a.name + (a.form ? ' (' + (MIN[a.name] ? 'as ' : '') + a.form + ')' : ''), a.amt || 'In formula']);
  const tests = [['Identity', ki ? ki.n : 'Formula', 'FTIR / HPTLC'], ['Assay', ki ? ki.n + ', stated amount' : 'Stated amount', 'HPLC'], ['Heavy metals', 'Lead, cadmium, mercury, arsenic', 'ICP-MS'], ['Microbiology', 'Total aerobic count, yeasts and moulds', 'Ph. Eur. 2.6.12']];
  if (p.top) tests.push(['Preservative efficacy', 'Challenge test', 'ISO 11930']);
  const sec = (sid, t, body) => `<section class="ps" id="${sid}" aria-labelledby="${sid}-h"><h2 id="${sid}-h" tabindex="-1">${t}</h2><div class="pb">${body}</div></section>`;
  const ol = a => `<ol class="olist">${a.map((d, k) => `<li><span class="mono">${pad2(k + 1)}</span><span>${esc(d)}</span></li>`).join('')}</ol>`;
  el.innerHTML = `
  <div class="pd-hero" style="--steps:${det.length}">
    <div class="pd-stick">
      <div class="pd-info tx">
        <a class="pd-back mono" href="#/c/08">${ic('back', 's')}08 Renew</a>
        <p class="code mono"><span>${p.id}</span><span>${esc(P.fmt)}</span></p>
        <h1 id="pdH" tabindex="-1">${nameHTML(p.n)}</h1>
        <p class="what">${esc(p.w)}</p>
        <dl class="facts">
          <div><dt>Format</dt><dd>${esc(p.g)}</dd></div>
          <div><dt>Quantity</dt><dd>${esc(p.q)}</dd></div>
          ${ki ? `<div><dt>Key ingredient</dt><dd>${esc(ki.n)}<span class="mono"> ${esc(ki.v)}</span></dd></div>` : ''}
          <div><dt>Use</dt><dd>${esc(p.s.replace('2 to 3', '2–3'))}</dd></div>
        </dl>
      </div>
      <div class="pd-stage" tabindex="0" role="img" aria-label="${esc(p.n)}, ${esc(P.fmt.toLowerCase())}, ${esc(p.q)}. Drag, or use the left and right arrow keys, to turn it.">
        <span class="slot" data-slot="${id}"></span>
        ${det.map((d, k) => `<figure class="pd-det" data-k="${k}"><img src="${esc(d.src)}" alt="" loading="lazy" decoding="async"><figcaption class="mono">Fig. ${pad2(k + 2)} · ${esc(d.t)}</figcaption></figure>`).join('')}
        <p class="pd-turn mono tx" aria-hidden="true"><span>Drag to turn</span><span class="rot">000°</span></p>
      </div>
      <div class="pd-buy tx">
        <p class="price mono" id="pdPrice">${money(p.po)}</p>
        <div class="opt" role="radiogroup" aria-label="Purchase option">
          <button type="button" role="radio" data-m="once" aria-checked="true"><span>One-time</span><span class="mono">${money(p.po)}</span></button>
          <button type="button" role="radio" data-m="sub" aria-checked="false" tabindex="-1"><span>Subscribe</span><span class="mono">${money(p.ps)}</span></button>
        </div>
        <div class="freq" role="group" aria-label="Dispatch every" hidden>${[30, 60, 90].map(d => `<button type="button" data-fr="${d}" aria-pressed="${d === 30}">${d} days</button>`).join('')}</div>
        <div class="buy"><span class="step" role="group" aria-label="Quantity"><button type="button" data-q="-1" aria-label="Decrease quantity">${ic('minus', 's')}</button><output class="mono" aria-live="polite">1</output><button type="button" data-q="1" aria-label="Increase quantity">${ic('plus', 's')}</button></span>
          <button class="btn add" type="button" data-addp>Add to Protocol</button></div>
        <p class="slotline mono"></p>
      </div>
      <nav class="pd-nav mono tx" aria-label="Other products in 08 Renew"><a href="#/p/${pv.id}" data-dir="-1">${ic('back', 's')}<span>${pv.id}</span><span class="sr">${esc(pv.n)}</span></a><span class="pos">${pad2(i + 1)} / 06</span><a href="#/p/${nx.id}" data-dir="1"><span>${nx.id}</span><span class="sr">${esc(nx.n)}</span>${ic('arrow', 's')}</a></nav>
    </div>
  </div>
  <div class="pd-body tx">
    <nav class="pd-idx" aria-label="Sections">${[['ov', 'Overview'], ['in', 'Ingredients'], ['di', 'Directions'], ['ca', 'Cautions'], ['ev', 'Evidence'], ['ts', 'Testing & Sourcing']].map(x => `<a href="#s-${x[0]}" data-jump="s-${x[0]}">${x[1]}</a>`).join('')}</nav>
    <div class="pd-secs">
      ${sec('s-ov', 'Overview', `<p class="lede">${esc(p.w)}</p><p>${esc(purpose(p))} ${esc(PACK[id].mat)}, Ø ${P.d} × ${P.h} mm.</p><p class="fine">${p.id} sits in 08 Renew, which the Formulary describes as ${esc(co.d.toLowerCase())}. The collection name says where it sits, not what it does.</p>`)}
      <figure class="band" aria-hidden="true"><img src="../v4/assets/photos/hand-linen-1200.webp" alt="" loading="lazy" decoding="async"></figure>
      ${sec('s-in', 'Ingredients', `<table class="tbl"><thead><tr><th scope="col">${p.top ? 'Key ingredient' : 'Ingredient'}</th><th scope="col" class="r">${p.top ? 'Concentration' : 'Per serving'}</th></tr></thead><tbody>${conc.map(c => `<tr><th scope="row">${esc(c[0])}</th><td class="r mono">${esc(c[1])}</td></tr>`).join('')}</tbody></table><p class="fine">${p.top ? 'Concentrations are sample formulation values, confirmed before launch.' : 'Per serving of ' + esc(servingSize(p)) + '.'}</p><p class="inci"><b>Full ingredient list.</b> ${esc(fullList(p))}</p>`)}
      ${sec('s-di', 'Directions', ol(directions(p)))}
      ${sec('s-ca', 'Cautions', ol(cautions(p)))}
      ${sec('s-ev', 'Evidence', `<p>${esc(p.e)}</p><p class="pend"><b>Evidence summary: to be written and referenced before launch.</b> No studies are cited yet. P4CE makes no claims about what this product does.</p><ol class="refs" aria-label="Reference slots">${[1, 2, 3].map(n => `<li><span class="mono">Ref. ${pad2(n)}</span><span>Authors, year, title, journal, DOI</span><i class="mono">Empty</i></li>`).join('')}</ol>`)}
      ${sec('s-ts', 'Testing &amp; Sourcing', `<table class="tbl"><thead><tr><th scope="col">Test</th><th scope="col">Method</th><th scope="col" class="r">Result</th></tr></thead><tbody>${tests.map(t => `<tr><th scope="row">${t[0]}<small>${esc(t[1])}</small></th><td class="mono">${t[2]}</td><td class="r">With batch <span class="sample">Sample</span></td></tr>`).join('')}</tbody></table>
        <dl class="dl2"><dt>Batch</dt><dd class="mono">${batch(p)} <span class="sample">Sample</span></dd><dt>Laboratory</dt><dd>Independent ISO/IEC 17025 laboratory, to be named <span class="sample">Sample</span></dd><dt>Origin</dt><dd>To be confirmed before launch <span class="sample">Sample</span></dd><dt>Manufacture</dt><dd>${p.top ? 'Formulated and filled' : 'Encapsulated and packed'} in the United Kingdom <span class="sample">Sample</span></dd></dl>`)}
    </div>
  </div>
  <div class="pd-bar" aria-label="Buy">
    <span class="bn"><b>${esc(p.n)}</b><span class="mono bp">${money(p.po)}</span></span>
    <button class="btn add" type="button" data-addp>Add to Protocol</button>
  </div>`;
  const stage = $('.pd-stage', el), slot = $('.slot', stage), rotEl = $('.rot', el), bar = $('.pd-bar', el);
  const price = () => (opt.m === 'sub' ? p.ps : p.po) * opt.q;
  function upd() {
    $$('[role=radio]', el).forEach(b => { const on = b.dataset.m === opt.m; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    $('.freq', el).hidden = opt.m !== 'sub';
    $$('.freq button', el).forEach(b => b.setAttribute('aria-pressed', +b.dataset.fr === opt.fr));
    $('output', el).textContent = opt.q;
    $('#pdPrice', el).textContent = money(price()) + (opt.m === 'sub' ? ' / ' + opt.fr + ' days' : '');
    $('.bp', el).textContent = money(price());
    $$('[data-addp]', el).forEach(b => b.textContent = 'Add to Protocol');
    const R = Protocol.ritual(), land = slotsFor(p).map(k => { const S = SLOTS.find(x => x.k === k), have = R[k].find(c => c.p.id === p.id); return have ? `${S.w} ${have.code} · ${have.time}` : `${S.w} ${S.code}-${pad2(R[k].length + 1)}`; });
    $('.slotline', el).innerHTML = `<span>${R[slotsFor(p)[0]].some(c => c.p.id === p.id) ? 'In your Protocol' : 'Slots into'}</span> ${esc(land.join(' and '))}`;
  }
  $$('[role=radio]', el).forEach(b => { b.onclick = () => { opt.m = b.dataset.m; upd(); }; b.onkeydown = e => { if (/Arrow/.test(e.key)) { e.preventDefault(); opt.m = opt.m === 'once' ? 'sub' : 'once'; upd(); $(`[data-m="${opt.m}"]`, el).focus(); } }; });
  $$('.freq button', el).forEach(b => b.onclick = () => { opt.fr = +b.dataset.fr; upd(); });
  $$('[data-q]', el).forEach(b => b.onclick = () => { opt.q = clamp(opt.q + +b.dataset.q, 1, 9); upd(); });
  $$('[data-addp]', el).forEach(b => b.onclick = () => { Protocol.add(id, opt.m, opt.fr, opt.q, slot); b.textContent = 'Added'; setTimeout(upd, 2200); });
  $$('[data-jump]', el).forEach(a => a.onclick = e => { e.preventDefault(); const t = $('#' + a.dataset.jump, el); if (t) { scrollTo({top: t.getBoundingClientRect().top + scrollY - 90, behavior: RM ? 'auto' : 'smooth'}); setTimeout(() => $('h2', t).focus({preventScroll: true}), RM ? 0 : 600); } });
  Protocol.on(upd); upd();

  /* drag to turn: scrub the 48 frames, with inertia */
  const T = {drag: null, vel: 0, coast: 0, scrollF: 0};
  const actor = () => Stage.get(id);
  stage.addEventListener('pointerdown', e => { if (e.button > 0) return; const a = actor(); T.drag = {x: e.clientX, f: a.frame, last: e.clientX, lt: CLOCK.now()}; T.vel = 0; T.coast = 0; stage.classList.add('drag'); try { stage.setPointerCapture(e.pointerId); } catch (x) {} });
  stage.addEventListener('pointermove', e => { if (!T.drag) return; const a = actor(), n = frames(id).length || 48, dx = e.clientX - T.drag.x, now = CLOCK.now(); T.vel = (e.clientX - T.drag.last) / Math.max(8, now - T.drag.lt); T.drag.last = e.clientX; T.drag.lt = now; a.frame = T.drag.f + dx / stage.clientWidth * n * 1.1; });
  const up = () => { if (!T.drag) return; if (CLOCK.now() - T.drag.lt > 90) T.vel = 0; T.drag = null; stage.classList.remove('drag'); const n = frames(id).length || 48; T.coast = RM ? 0 : clamp(T.vel * n * 1.1 * 16 / stage.clientWidth, -1.4, 1.4); };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('keydown', e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); const a = actor(); a.turnTo(Math.round(a.frame) + (e.key === 'ArrowLeft' ? -2 : 2), 260); });
  img(frames(id)[0]).then(() => Stage.preload(id, 0));

  /* scroll: the product turns and tilts through its detail stills (desktop), Ormaie-style */
  const hero = $('.pd-hero', el), figs = $$('.pd-det', el), info = $('.pd-info', el), buy = $('.pd-buy', el), turn = $('.pd-turn', el);
  let lastStep = -2, barOn = null;
  function frame(dt) {
    const a = Stage.has(id) ? actor() : null;
    if (a && !T.drag && Math.abs(T.coast) > .01) { a.frame += T.coast; T.coast *= .93; if (Math.abs(T.coast) < .02) { T.coast = 0; } }
    if (a) { const n = frames(id).length || 48, d = Math.round((((-a.frame % n) + n) % n) / n * 360) % 360; rotEl.textContent = String(d).padStart(3, '0') + '°'; }
    const ph = isPhone();
    const r = hero.getBoundingClientRect(), run = Math.max(1, hero.offsetHeight - innerHeight), pr = ph ? 0 : clamp(-r.top / run);
    /* steps: 0 product, 1..n details, n+1 product again */
    const nd = figs.length, seg = pr * (nd + 1.4);
    let step = seg < .5 ? 0 : seg < nd + .5 ? Math.min(nd, Math.floor(seg + .5)) : nd + 1;
    if (ph) step = 0;
    if (step !== lastStep) {
      lastStep = step;
      const det = step >= 1 && step <= nd;
      figs.forEach((f, k) => f.classList.toggle('on', det && k === step - 1));
      el.classList.toggle('detailing', det);
      if (a && a.mode === 'slot') a.lookTo(det ? {op: 0, blur: 10, sc: .96} : {}, 5);
    }
    /* during the first half-step the product turns a quarter as the page begins to move */
    if (a && !T.drag && !T.coast && !ph && step === 0 && !el.classList.contains('arriving')) { const want = seg * 2 * 12; if (Math.abs(T.scrollF - want) > .01) { a.frame += want - T.scrollF; T.scrollF = want; } }
    info.classList.toggle('quiet', !ph && pr > .04 && pr < .97); buy.classList.toggle('quiet', !ph && pr > .04 && pr < .97); turn.classList.toggle('quiet', !ph && pr > .04);
    const on = ph || r.bottom < innerHeight * .35;
    if (on !== barOn) { barOn = on; bar.classList.toggle('on', on); }
  }
  return {el, kind: 'product', id, lookFor: () => ({}), frame, destroy() { Protocol.off(upd); }};
}

/* ================================================================ The Formulary: the index of all nine */
export function formularyView() {
  const el = document.createElement('section');
  el.className = 'view v-fx'; el.dataset.view = 'formulary'; el.setAttribute('aria-labelledby', 'fxH');
  el.innerHTML = `<div class="page tx">
    <header class="pg-head"><h1 id="fxH" tabindex="-1">The <em>Formulary</em></h1><p class="desc">Nine collections, and every product in them. 08 Renew is open in full; the others list their products and sample prices.</p></header>
    <ol class="fx-list" role="list">${CAT.map(co => `<li class="fx-row${co.c === '08' ? ' open' : ''}">
      <a class="fx-main" href="#/c/${co.c}"><span class="fx-c mono">${co.c}</span><span class="fx-n">${esc(co.n)}</span><span class="fx-d">${esc(co.d)}</span><span class="fx-k mono">${pad2(co.it.length)}</span></a>
      ${co.c === '08' ? `<div class="fx-th" aria-hidden="true">${co.it.map(p => `<img data-thumb="${p.id}" src="${thumb(p.id)}" alt="" decoding="async">`).join('')}</div>` : `<p class="fx-p">${co.it.map(p => esc(p.n)).join('<i>/</i>')}</p>`}
      <a class="fx-at mono" href="#/atlas/${co.c}">In the Atlas${ic('arrow', 's')}</a></li>`).join('')}</ol>
  </div>`;
  return {el, kind: 'formulary', lookFor: () => ({})};
}

/* ================================================================ any other collection: calm, text-only rows */
export function collView(c) {
  const co = colOf(c) || CAT[0], el = document.createElement('section');
  el.className = 'view v-cl'; el.dataset.view = 'coll'; el.setAttribute('aria-labelledby', 'clH');
  el.innerHTML = `<div class="page tx">
    <header class="pg-head"><a class="pd-back mono" href="#/formulary">${ic('back', 's')}Formulary</a><h1 id="clH" tabindex="-1"><span class="code">${co.c}</span> <em>${esc(co.n)}</em></h1><p class="desc">${esc(co.d)}</p></header>
    <ul class="rows plain" role="list">${co.it.map(p => `<li class="row"><div class="r-main"><span class="r-id mono">${p.id}</span><span class="r-n">${esc(p.n)}</span><span class="r-f">${esc(p.g)}</span><span class="r-q mono">${esc(p.q)}</span><span class="r-p mono">${money(p.po)}</span></div>
      <button class="r-add" type="button" data-add="${p.id}" aria-label="Add ${esc(p.n)} to your Protocol, one-time, ${money(p.po)}">${ic('plus', 's')}<span>Add</span></button></li>`).join('')}</ul>
    <p class="fine">Sample prices. Full product pages for ${esc(co.n)} follow the 08 Renew pattern.</p>
    <nav class="cl-nav mono" aria-label="Collections">${CAT.map(x => `<a href="#/c/${x.c}"${x.c === co.c ? ' aria-current="page"' : ''}>${x.c}</a>`).join('')}</nav>
  </div>`;
  $$('[data-add]', el).forEach(b => b.addEventListener('click', () => Protocol.add(b.dataset.add, 'once', 30, 1, b)));
  return {el, kind: 'coll', lookFor: () => ({})};
}

/* ================================================================ member pages (stubs with real, plain content) */
const STUB = {
  dispatches: ['Dispatches', 'Your <em>dispatches</em>', p => `<p class="lede">Every dispatch is built from your Protocol on the day it leaves.</p><ul class="rows plain">${Protocol.lines().length ? Protocol.lines().map(l => { const q = byId(l.id); return `<li class="row"><div class="r-main"><span class="r-id mono">${q.id}</span><span class="r-n">${esc(q.n)}</span><span class="r-f">${l.m === 'sub' ? 'Every ' + l.fr + ' days' : 'One-time'}</span><span class="r-q mono">× ${l.q}</span></div></li>`; }).join('') : '<li class="row empty">Nothing is due to leave yet. Add a product to your Protocol and it will appear here.</li>'}</ul>`],
  cabinet: ['Cabinet', 'The <em>Cabinet</em>', () => `<p class="lede">Products you keep, between dispatches. Saving arrives with accounts in a later phase.</p>`],
  nominations: ['Nominations', '<em>Nominations</em>', () => `<p class="lede">Members may nominate two people a year. You have two nominations left.</p><p class="fine">Nominations open with accounts in a later phase.</p>`],
  record: ['Member Record', 'Member <em>Record</em>', () => `<dl class="dl2"><dt>Member</dt><dd class="mono">0047</dd><dt>Admitted</dt><dd>With an invitation card</dd><dt>Protocol</dt><dd>${Protocol.count()} items</dd></dl>`],
  liaison: ['Liaison', 'Member <em>Liaison</em>', () => `<p class="lede">A person, not a ticket. Write and someone who knows the Formulary replies within a working day.</p><p class="fine">Messaging arrives in a later phase.</p>`],
  key: ['Your Key', 'Your <em>Key</em>', () => `<p class="lede">The card in your box opens the door. Hold it to your phone and it carries you past the gate.</p><dl class="dl2"><dt>Key</dt><dd class="mono">0047 · NFC</dd><dt>Code</dt><dd class="mono">On the card</dd></dl>`]
};
export function memberView(k) {
  const s = STUB[k] || STUB.record, el = document.createElement('section');
  el.className = 'view v-mb'; el.dataset.view = 'member'; el.setAttribute('aria-labelledby', 'mbH');
  el.innerHTML = `<div class="page narrow tx"><header class="pg-head"><h1 id="mbH" tabindex="-1">${s[1]}</h1></header>${s[2]()}</div>`;
  return {el, kind: 'member', title: s[0], lookFor: () => ({})};
}

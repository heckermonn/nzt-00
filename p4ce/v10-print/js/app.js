/* PR6 v10 Print · a quick preview of the "Print" direction: type-led, a visible 12-column grid, hairline rules.
   Three hash views: #/ (the line plan and the typographic index), #/c/NN (the collection as a catalogue spread),
   #/p/NN-K (the kit's slide 4). Products morph between pages with same-document View Transitions: the pack image in
   the collection spread and the pack on the product's disc share view-transition-name "pk". Where the API is missing,
   a FLIP of the image and a short fade stand in. */
import {CAT, byId, colOf, PACKNAME} from './catalog.js';
import {Renders, packOf} from './renders.js';
import {esc, money, store} from './util.js';
import {mountPlan} from './plan.js';

const RM = document.documentElement.classList.contains('rm');
const page = document.getElementById('page');
const crumb = document.getElementById('crumb');
const cnt = document.getElementById('cnt');
const VT = typeof document.startViewTransition === 'function' && !new URLSearchParams(location.search).has('novt');
const K = 'pr6.v10p.protocol';
let count = +store.get(K, 0) || 0;
cnt.textContent = count;

const range = co => { const ps = co.it.map(p => p.pc); const a = Math.min(...ps), b = Math.max(...ps); return a === b ? money(a) : `${money(a)}–${b}`; };
const short = p => p.q.replace(/ (capsules|tablets|softgels|sachets)$/, '');
const img = p => Renders.hero(p);
const approach = p => /daily/.test(p.s) ? 'Consistency' : /as needed/.test(p.s) ? 'Intent' : 'Practice';

function parse() {
  const h = location.hash.replace(/^#\/?/, '');
  let m;
  if ((m = h.match(/^c\/(\d\d)$/)) && colOf(m[1])) return {v: 'col', c: m[1], key: 'c' + m[1]};
  if ((m = h.match(/^p\/(\d\d-\d+)$/)) && byId(m[1])) return {v: 'pd', id: m[1], key: 'p' + m[1]};
  return {v: 'home', key: 'home'};
}

/* ================================================================ #/ the plan, and the nine as a typographic index */
function home(prev) {
  page.innerHTML = `<section class="home">
    <div class="g intro">
      <h1 class="h-xl c-intro-t" tabindex="-1">The Formulary</h1>
      <p class="lede c-intro-l">A plan of the studio floor. Nine stations, one for each collection, set out along a single line. Choose a station to open it.</p>
    </div>
    <div class="plan-host" id="planHost"></div>
    <section class="g ix" aria-labelledby="ixH">
      <h2 class="h-l c-ix-h" id="ixH">Index</h2>
      <p class="ix-note c-ix-n">Fifty products in nine collections. Prices in Canadian dollars.</p>
      <ol class="ix-l">${CAT.map(co => `<li><a class="ix-r" href="#/c/${co.c}" data-c="${co.c}">
        <span class="mono ix-c">${co.c}</span><span class="ix-n">${esc(co.n)}</span><span class="ix-d">${esc(co.d)}</span>
        <span class="mono ix-m">${co.it.length} <span class="dim">products</span> ${range(co)}</span></a></li>`).join('')}</ol>
    </section>
    ${foot()}
  </section>`;
  crumb.innerHTML = '';
  const fromCol = prev && prev.v === 'col' ? prev.c : null;
  const plan = mountPlan(document.getElementById('planHost'), {rm: RM, drawn: RM || !!prev, onPick: c => {
    plan.zoomTo(c).then(() => go('#/c/' + c));
  }});
  if (fromCol && !RM) plan.zoomOutFrom(fromCol);
  page.querySelectorAll('.ix-r').forEach(a => {
    a.addEventListener('pointerenter', () => plan.hot(a.dataset.c));
    a.addEventListener('pointerleave', () => plan.hot(null));
    a.addEventListener('focus', () => plan.hot(a.dataset.c));
    a.addEventListener('click', e => { e.preventDefault(); a.querySelector('.ix-n').style.viewTransitionName = 'ttl'; go(a.getAttribute('href')); });
  });
  return () => plan.destroy();
}

/* ================================================================ #/c/04 the collection as a catalogue spread */
function collection(c, prev) {
  const co = colOf(c), i = CAT.indexOf(co), pv = CAT[(i + 8) % 9], nx = CAT[(i + 1) % 9];
  const first = prev && prev.v === 'pd' && byId(prev.id).c === c ? byId(prev.id) : co.it[0];
  page.innerHTML = `<section class="col">
    <div class="g spread">
      <header class="col-h">
        <p class="mono col-c">${co.c}</p>
        <h1 class="col-t" tabindex="-1" style="--len:${co.n.length}">${esc(co.n)}</h1>
        <p class="col-d">${esc(co.d)}</p>
        <p class="mono col-m">${co.it.length} products <span class="dim">/</span> ${range(co)}</p>
      </header>
      <figure class="col-fig">
        <div class="col-plate"><img class="pk-img" id="figImg" src="${esc(img(first) || '')}" alt="" decoding="async"></div>
        <figcaption class="col-cap"><span class="mono" id="figCode">${first.id}</span> <span id="figTxt">${esc(PACKNAME[packOf(first)])}, <span class="mono">${esc(first.q)}</span></span></figcaption>
      </figure>
      <div class="col-list">
        <div class="ls-h" aria-hidden="true"><span>Code</span><span>Name</span><span>Format</span><span>Price</span></div>
        <ol>${co.it.map(p => `<li><a class="ls-r${p === first ? ' on' : ''}" href="#/p/${p.id}" data-id="${p.id}">
          <span class="mono ls-c">${p.id}</span><span class="ls-n">${esc(p.n)}</span><span class="ls-f">${esc(p.g)}<span class="mono ls-q">${esc(short(p))}</span></span><span class="mono ls-p">${money(p.pc)}</span></a></li>`).join('')}</ol>
      </div>
    </div>
    <nav class="g col-nav" aria-label="Collections">
      <a class="cn-p" href="#/c/${pv.c}"><span aria-hidden="true">&larr;</span> <span class="mono">${pv.c}</span> ${esc(pv.n)}</a>
      <a class="cn-h" href="#/">The plan</a>
      <a class="cn-n" href="#/c/${nx.c}"><span class="mono">${nx.c}</span> ${esc(nx.n)} <span aria-hidden="true">&rarr;</span></a>
    </nav>
    ${foot()}
  </section>`;
  crumb.innerHTML = `<a href="#/">Formulary</a><i>/</i><span><span class="mono">${co.c}</span> ${esc(co.n)}</span>`;
  const fig = document.getElementById('figImg'), code = document.getElementById('figCode'), txt = document.getElementById('figTxt');
  const show = p => {
    const u = img(p); if (u && fig.getAttribute('src') !== u) fig.src = u;
    code.textContent = p.id; txt.innerHTML = `${esc(PACKNAME[packOf(p)])}, <span class="mono">${esc(p.q)}</span>`;
    page.querySelectorAll('.ls-r').forEach(a => a.classList.toggle('on', a.dataset.id === p.id));
  };
  page.querySelectorAll('.ls-r').forEach(a => {
    const p = byId(a.dataset.id);
    a.addEventListener('pointerenter', () => show(p));
    a.addEventListener('focus', () => show(p));
    a.addEventListener('click', e => { e.preventDefault(); show(p); go(a.getAttribute('href')); });
  });
  page.querySelectorAll('.col-nav a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); go(a.getAttribute('href')); }));
}

/* ================================================================ #/p/04-1 the kit's slide 4 */
function product(id) {
  const p = byId(id), co = colOf(p.c);
  const fld = (l, v) => `<div class="fld"><p class="fld-l">${esc(l)}</p><p class="fld-v mono">${esc(String(v).toUpperCase())}</p></div>`;
  page.innerHTML = `<section class="pd">
    <div class="pd-stage">
      <div class="plate" aria-hidden="true"></div>
      <div class="panel">
        <div class="panel-glass" aria-hidden="true"></div>
        <header class="pn-h"><a class="pn-mark" href="#/c/${co.c}" aria-label="Back to ${esc(co.n)}"><span class="wm">PR6</span><i aria-hidden="true">/</i></a>
          <h1 class="pn-t" tabindex="-1">${esc(p.n)}</h1></header>
        <div class="pn-fields">${fld('Collection', co.c)}${fld('Format', p.g)}${fld('Approach', approach(p))}</div>
        <div class="pn-disc"><div class="disc" aria-hidden="true"></div>
          <div class="tt" id="tt" data-pack="${packOf(p)}" aria-hidden="true"><img class="tt-a" alt="" src="${esc(img(p) || '')}" draggable="false"><img class="tt-b" alt="" draggable="false"></div></div>
        <div class="pn-act"><button class="pill" type="button" id="add"><span class="pl">ADD TO PROTOCOL</span><span class="arr" aria-hidden="true">&rarr;</span></button></div>
        <footer class="pn-f"><p><span class="mono">${money(p.pc)}</span> one-off <span class="dim">/</span> <span class="mono">${money(p.psc)}</span> on Your Protocol</p><i class="hair" aria-hidden="true"></i></footer>
      </div>
    </div>
    <section class="g spec" aria-label="Specification">
      <h2 class="h-l sp-t">${esc(p.n)}</h2>
      <p class="sp-w">${esc(p.w)}</p>
      <dl class="sp-l">
        <div><dt>Code</dt><dd class="mono">${p.id}</dd></div>
        <div><dt>Collection</dt><dd><a class="u" href="#/c/${co.c}">${esc(co.n)}</a></dd></div>
        <div><dt>In the pack</dt><dd class="mono">${esc(p.q)}</dd></div>
        <div><dt>Directions</dt><dd>${esc(p.s)}</dd></div>
        <div><dt>Pack</dt><dd>${esc(PACKNAME[packOf(p)])}</dd></div>
        <div><dt>One-off</dt><dd class="mono">${money(p.pc)}</dd></div>
        <div><dt>On Your Protocol</dt><dd class="mono">${money(p.psc)}</dd></div>
      </dl>
    </section>
    ${foot()}
  </section>`;
  crumb.innerHTML = `<a href="#/">Formulary</a><i>/</i><a href="#/c/${co.c}"><span class="mono">${co.c}</span> ${esc(co.n)}</a>`;
  page.querySelector('.pn-mark').addEventListener('click', e => { e.preventDefault(); go(e.currentTarget.getAttribute('href')); });
  const add = document.getElementById('add');
  add.addEventListener('click', () => {
    count++; store.set(K, count); cnt.textContent = count;
    cnt.parentElement.classList.remove('bump'); void cnt.offsetWidth; cnt.parentElement.classList.add('bump');
    add.querySelector('.pl').textContent = 'ADDED'; add.classList.add('done');
    clearTimeout(add._t); add._t = setTimeout(() => { add.querySelector('.pl').textContent = 'ADD TO PROTOCOL'; add.classList.remove('done'); }, 1400);
  });
  return turntable(document.getElementById('tt'), p);
}

/* the pack turns on the disc: 24 turntable frames, adjacent frames blended; drag to turn it yourself */
function turntable(el, p) {
  const list = Renders.frames(p), a = el.querySelector('.tt-a'), b = el.querySelector('.tt-b');
  if (!list.length) return null;
  const N = list.length, ok = new Array(N).fill(false);
  let k = 0, live = true, drag = null, shownA = -1, shownB = -1, last = performance.now(), started = false;
  list.forEach((u, j) => { const im = new Image(); im.decoding = 'async'; im.src = u; im.decode().then(() => { ok[j] = true; }).catch(() => {}); });
  const w = j => ((j % N) + N) % N;
  function frame(now) {
    if (!live) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (ok.every(Boolean)) {
      if (!started) { started = true; }
      if (!drag && !RM) k += dt * 3.2;
      const i0 = w(Math.floor(k)), i1 = w(i0 + 1), f = k - Math.floor(k);
      if (i0 !== shownA) { a.src = list[i0]; shownA = i0; }
      if (i1 !== shownB) { b.src = list[i1]; shownB = i1; }
      b.style.opacity = RM ? 0 : f.toFixed(3);
    }
    requestAnimationFrame(frame);
  }
  /* hold the first turn until the morph has landed */
  setTimeout(() => { last = performance.now(); requestAnimationFrame(frame); }, VT && !RM ? 700 : 0);
  el.addEventListener('pointerdown', e => { drag = {x: e.clientX, k}; el.setPointerCapture(e.pointerId); el.classList.add('grab'); });
  el.addEventListener('pointermove', e => { if (drag) k = drag.k - (e.clientX - drag.x) / 18; });
  const up = () => { drag = null; el.classList.remove('grab'); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  return () => { live = false; };
}

const foot = () => `<footer class="g foot"><p class="ft-a">PR6. The practice of progress.</p><p class="ft-b">Placeholder prices, in Canadian dollars. A preview of the Print direction.</p></footer>`;

/* ================================================================ routing and the morph */
let cur = null, cleanup = null;
function render() {
  const r = parse();
  if (cur && cur.key === r.key) return;
  const prev = cur; cur = r;
  if (cleanup) { cleanup(); cleanup = null; }
  document.documentElement.dataset.view = r.v;
  cleanup = r.v === 'col' ? collection(r.c, prev) : r.v === 'pd' ? product(r.id, prev) : home(prev);
  window.scrollTo(0, 0);
  const t = page.querySelector('h1'); if (t && prev) t.focus({preventScroll: true});
  document.title = r.v === 'home' ? 'PR6 · Formulary' : r.v === 'col' ? `PR6 · ${colOf(r.c).n}` : `PR6 · ${byId(r.id).n}`;
}
function go(hash) {
  if (location.hash === hash) return;
  history.pushState(null, '', hash);
  swap();
}
function swap() {
  if (VT && !RM) { document.startViewTransition(() => render()); return; }
  /* fallback: FLIP the pack image from where it was to where it lands, and fade the page in */
  const from = document.querySelector('#figImg, #tt'), r0 = from && from.getBoundingClientRect();
  render();
  if (RM) return;
  const to = document.querySelector('#figImg, #tt');
  if (r0 && to && r0.width) {
    const r1 = to.getBoundingClientRect();
    to.animate([{transformOrigin: '0 0', transform: `translate(${r0.left - r1.left}px, ${r0.top - r1.top}px) scale(${r0.width / r1.width}, ${r0.height / r1.height})`}, {transformOrigin: '0 0', transform: 'none'}],
      {duration: 560, easing: 'cubic-bezier(.65,0,.35,1)'});
  }
  page.animate([{opacity: 0}, {opacity: 1}], {duration: 260, easing: 'ease-out'});
}
addEventListener('hashchange', () => { if (parse().key !== (cur && cur.key)) swap(); });
document.getElementById('home').addEventListener('click', e => { e.preventDefault(); go('#/'); });
crumb.addEventListener('click', e => { const a = e.target.closest('a'); if (a) { e.preventDefault(); go(a.getAttribute('href')); } });

window.PR6V10P = {state: () => ({view: cur && cur.v, route: cur, count, vt: VT, renders: Renders.status()})};
Renders.ready.then(() => {
  /* the five pack stills are shared by every product: fetch them now so a hover swap is instant */
  ['tin', 'pouch', 'box', 'dropper', 'jar'].forEach(k => { const p = CAT.flatMap(c => c.it).find(x => packOf(x) === k); const u = p && img(p); if (u) new Image().src = u; });
  render();
});

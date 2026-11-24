/* PR6 v10 · "Glass" · a quick preview. Three hash views over one live Atlas:
     #/        the Atlas, a minimal title and the nine collections as a plain list
     #/c/04    the camera glides to station 04 and the glass slab rises with that collection's products
     #/p/04-1  the slab becomes the kit's slide 4: PR6 / name, three fields, the pack turning on a debossed disc, the pill
   The slab is WebGL (world.js); its content is DOM, laid over it in the same rectangle and tilted with it.
   ?flat (or no WebGL2, or a slab that renders too slowly) swaps the world for a flat page and a CSS panel.
   Test hooks: ?gl keeps WebGL whatever the speed, ?fps=N and ?dpr=N cap the renderer, window.PR6V10.state(). */
import {CAT, byId, colOf} from './catalog.js';
import {Renders} from './renders.js';
import {Q, $, esc, money, store} from './util.js';

const root = document.documentElement;
const ui = $('#glassui'), panel = $('#panel'), inner = $('#panelIn'), home = $('#home');
const APPROACH = p => /daily/.test(p.s) ? 'Consistency' : /as needed/.test(p.s) ? 'Intent' : 'Practice';
const isPh = () => innerWidth <= 760;
let W = null, view = {k: 'home'}, count = +store.get('pr6.v10.protocol', 0) || 0, spin = null, flatWhy = '';

/* ---------------------------------------------------------------- the slab's rectangle for each view */
function rectFor(k) {
  const w = innerWidth, h = innerHeight;
  if (isPh()) {
    if (k === 'c') { const y = Math.round(h * .4); return {x: 12, y, w: w - 24, h: h - y - 12}; }
    return {x: 12, y: 60, w: w - 24, h: h - 72};
  }
  if (k === 'c') { const pw = Math.min(540, Math.round(w * .4)), m = Math.max(40, Math.round(w * .05)); return {x: w - pw - m, y: 96, w: pw, h: Math.min(720, h - 96 - 48)}; }
  const pw = Math.min(1040, w - 120), ph = Math.min(Math.round(pw / 1.58), h - 150);
  return {x: Math.round((w - pw) / 2), y: Math.round(88 + (h - 88 - 40 - ph) / 2), w: pw, h: ph};
}

/* ---------------------------------------------------------------- content */
function homeHTML() {
  return `<h1 class="h-t">The practice of progress.</h1>
    <p class="h-s" id="hs">Nine collections, ${CAT.reduce((n, c) => n + c.it.length, 0)} products.</p>
    <ol class="h-list">${CAT.map((c, i) => `<li><a href="#/c/${c.c}" data-st="${i}"><span class="mono">${c.c}</span> ${esc(c.n)}</a></li>`).join('')}</ol>`;
}
function collectionHTML(co) {
  return `<div class="cv">
    <header class="pn-h"><a class="wm" href="#/" aria-label="Back to the Atlas">PR6</a><i aria-hidden="true">/</i><h1 class="pn-t" tabindex="-1">${esc(co.n)}</h1></header>
    <p class="cv-d">${esc(co.d)}.</p>
    <ol class="cv-list">${co.it.map(p => `<li><a href="#/p/${p.id}"><span class="mono c">${p.id}</span><span class="n">${esc(p.n)}</span><span class="f">${esc(p.g)}</span><span class="mono pr">${money(p.pc)}</span></a></li>`).join('')}</ol>
    <a class="back" href="#/"><span aria-hidden="true">&larr;</span> All collections</a>
  </div>`;
}
function productHTML(p) {
  const co = colOf(p.c), fld = (l, v) => `<div class="fld"><p class="fld-l">${l}</p><p class="fld-v mono">${esc(String(v).toUpperCase())}</p></div>`;
  return `<div class="pv">
    <header class="pn-h"><a class="wm" href="#/c/${co.c}" aria-label="Back to ${esc(co.n)}">PR6</a><i aria-hidden="true">/</i><h1 class="pn-t" tabindex="-1">${esc(p.n)}</h1></header>
    <div class="fields">${fld('Collection', co.c + ' ' + co.n)}${fld('Format', p.g)}${fld('Approach', APPROACH(p))}</div>
    <div class="dz" aria-hidden="true"><div class="disc"></div><img class="pack" alt="" draggable="false"></div>
    <div class="act"><button class="pill" type="button" data-add><span class="pl">ADD TO PROTOCOL</span><span class="arr" aria-hidden="true">&rarr;</span></button></div>
    <p class="price"><span class="mono">${money(p.pc)}</span> one-off <span aria-hidden="true">·</span> <span class="mono">${money(p.psc)}</span> on Your Protocol</p>
  </div>`;
}

/* the pack turning on the disc: the 24-frame turntable, one frame every 110 ms */
function startSpin(p) {
  stopSpin();
  const img = inner.querySelector('.pack'); if (!img) return;
  const fr = Renders.frames(p), still = Renders.hero(p);
  if (!fr.length) { if (still) img.src = still; return; }
  fr.forEach(u => { const im = new Image(); im.src = u; });
  let i = 0; img.src = fr[0];
  if (Q.has('rm')) return;
  spin = setInterval(() => { i = (i + 1) % fr.length; img.src = fr[i]; }, 110);
}
function stopSpin() { if (spin) clearInterval(spin); spin = null; }

/* ---------------------------------------------------------------- routing */
function parse() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'c' && colOf(h[1])) return {k: 'c', co: colOf(h[1])};
  if (h[0] === 'p' && byId(h[1])) { const p = byId(h[1]); return {k: 'p', p, co: colOf(p.c)}; }
  return {k: 'home'};
}
let swapT = 0;
function route() {
  const was = view; view = parse();
  root.dataset.view = view.k;
  document.title = view.k === 'home' ? 'PR6' : view.k === 'c' ? 'PR6 · ' + view.co.n : 'PR6 · ' + view.p.n;
  home.hidden = view.k !== 'home';
  if (view.k === 'home') {
    panel.classList.remove('up'); stopSpin();
    if (W) W.home();
    return;
  }
  const html = view.k === 'c' ? collectionHTML(view.co) : productHTML(view.p);
  const st = CAT.indexOf(view.co), rect = rectFor(view.k);
  const up = panel.classList.contains('up') && was.k !== 'home';
  /* content: swapped out of sight (faded while the slab morphs, or set before it rises) */
  clearTimeout(swapT);
  const put = () => { inner.innerHTML = html; inner.style.width = rect.w + 'px'; inner.style.height = rect.h + 'px'; root.dataset.pk = view.k; if (view.k === 'p') startSpin(view.p); else stopSpin(); bg(view.co); };
  if (up) { panel.classList.add('swap'); swapT = setTimeout(() => { put(); panel.classList.remove('swap'); }, 420); }
  else put();
  panel.classList.add('up');
  if (W) W.station(st, view.k, rect); else flatRect(rect);
}
addEventListener('hashchange', route);

/* ---------------------------------------------------------------- the DOM panel follows the slab every frame */
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function sync(S) {
  if (!S.cur) return;
  const c = S.cur;
  ui.style.perspective = W.focal.toFixed(1) + 'px';
  panel.style.cssText = `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;border-radius:${W.radius.toFixed(1)}px;` +
    `transform:translateY(${S.drop.toFixed(1)}px) rotateX(${(-(S.rx + (1 - S.rise) * .35)).toFixed(4)}rad) rotateY(${S.ry.toFixed(4)}rad);` +
    `opacity:${S.rise > .001 ? 1 : 0};--in:${sm(.72, 1, S.rise).toFixed(3)}`;
}
function flatRect(c) {
  panel.style.cssText = `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;--in:1`;
}
function bg(co) {
  const b = $('#flatbg'); if (!b || !co) return;
  const src = Renders.hero(co.it[0]);
  b.style.setProperty('--pk', src ? `url("${src}")` : 'none');
}

/* ---------------------------------------------------------------- the world, or the flat page */
function goFlat(why) {
  flatWhy = why; root.classList.add('flat');
  if (W) { W.dispose(); W = null; }
  $('#gl').remove();
  if (view.k !== 'home') { flatRect(rectFor(view.k)); bg(view.co); }
}
async function boot() {
  $('#cnt').textContent = count;
  home.innerHTML = homeHTML();
  await Renders.ready;
  if (Q.has('flat')) goFlat('param');
  else {
    try {
      const {createWorld} = await import('./world.js');
      W = createWorld($('#gl'));
    } catch (e) { W = null; }
    if (!W) goFlat('no webgl2');
    else {
      W.onFrame = sync;
      const loop = now => { if (!W) return; W.frame(now); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      /* a slab that cannot hold ~9 fps goes flat (unless ?gl) */
      if (!Q.has('gl')) { const iv = setInterval(() => { if (!W) return clearInterval(iv); if (W.slabState.rise >= 1 && W.perf() > 110) { clearInterval(iv); goFlat('slow'); } }, 1000); }
    }
  }
  route();
}

/* ---------------------------------------------------------------- input */
addEventListener('pointermove', e => {
  if (!W) return;
  W.pointer(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1);
  if (view.k === 'home' && e.target.id === 'gl') { const i = W.pick(e.clientX, e.clientY); hoverSt(i); root.classList.toggle('over', i >= 0); }
});
addEventListener('click', e => {
  if (!W || e.target.id !== 'gl') return;
  const i = W.pick(e.clientX, e.clientY);
  if (i >= 0) location.hash = '#/c/' + CAT[i].c;
  else if (view.k !== 'home') location.hash = view.k === 'p' ? '#/c/' + view.co.c : '#/';
});
home.addEventListener('pointerover', e => { const a = e.target.closest('[data-st]'); hoverSt(a ? +a.dataset.st : -1); });
home.addEventListener('focusin', e => { const a = e.target.closest('[data-st]'); if (a) hoverSt(+a.dataset.st); });
function hoverSt(i) {
  if (W) W.hover(i);
  const s = $('#hs'); if (!s) return;
  s.textContent = i >= 0 ? CAT[i].d + '.' : `Nine collections, ${CAT.reduce((n, c) => n + c.it.length, 0)} products.`;
  home.querySelectorAll('[data-st]').forEach(a => a.classList.toggle('on', +a.dataset.st === i));
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-add]'); if (!b) return;
  count++; store.set('pr6.v10.protocol', count); $('#cnt').textContent = count;
  const c = $('#count'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
  b.querySelector('.pl').textContent = 'ADDED'; setTimeout(() => { b.querySelector('.pl').textContent = 'ADD TO PROTOCOL'; }, 1400);
});
addEventListener('keydown', e => { if (e.key === 'Escape' && view.k !== 'home') location.hash = view.k === 'p' ? '#/c/' + view.co.c : '#/'; });
addEventListener('resize', () => { if (view.k === 'home') return; const r = rectFor(view.k); inner.style.width = r.w + 'px'; inner.style.height = r.h + 'px'; if (W) W.slab(r); else flatRect(r); });

window.PR6V10 = {state: () => ({view: view.k, id: view.p ? view.p.id : view.co ? view.co.c : null, count, flat: root.classList.contains('flat'), flatWhy, world: W ? W.state() : null})};
boot();

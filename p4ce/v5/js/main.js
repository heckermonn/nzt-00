/* P4CE v5 · phase 1, the hinge proof. The conductor: routes, transitions, the loop, the test hooks.
   The one transition rule: one space, one camera, one product. Every move between views is a single unbroken
   camera or object move; the chosen product stays on screen (an actor, see stage.js); nothing covers the screen;
   the colour drifts sand → stone → paper (tone.js); text only fades; back plays the same move reversed;
   reduced motion turns each move into a short crossfade. */
import {Q, $, $$, esc, RM, CLOCK, tween, stepTweens, E, wait, store, clamp, isPhone, ic, say} from './util.js';
import {Tone, STOPS} from './tone.js';
import {Stage, rectOf} from './stage.js';
import {loadManifest, frames, img} from './renders.js';
import {CAT, byId, colOf} from './catalog.js';
import {collectionView, productView, formularyView, collView, memberView} from './views.js';
import {Protocol} from './protocol.js';
import {Gate} from './gate.js';

const HTML = document.documentElement, VIEWS = $('#views'), BAR = $('#bar'), WORLD = $('#world'), AUI = $('#atlasUI');
const LEAD = '08-3', LEAD_CI = 7;
const NOGL = Q.has('nogl');
const S = {member: HTML.classList.contains('in'), cur: null, tok: 0, run: [], world: null, worldP: null, busy: false, last: null, scroll: {}};
const T = {move: 1250, cam: 1350, tx: 260};

/* ================================================================ routes */
const cleanURL = drop => { const q = new URLSearchParams(location.search); drop.forEach(k => q.delete(k)); const s = q.toString().replace(/=(&|$)/g, '$1'); return location.pathname + (s ? '?' + s : ''); };
function parse(h) {
  const s = (h || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!s.length) return {v: 'home'};
  switch (s[0]) {
    case 'atlas': { const i = s[1] ? CAT.findIndex(c => c.c === s[1]) : -1; return {v: 'atlas', st: i}; }
    case 'formulary': return {v: 'formulary'};
    case 'c': return s[1] === '08' ? {v: 'collection', c: '08'} : colOf(s[1]) ? {v: 'coll', c: s[1]} : {v: 'formulary'};
    case 'p': { const p = byId(s[1]); return p && p.c === '08' ? {v: 'product', id: p.id} : p ? {v: 'coll', c: p.c} : {v: 'collection', c: '08'}; }
    case 'protocol': return {v: 'protocol'};
    case 'm': return {v: 'member', k: s[1] || 'record'};
    case 'exit': return {v: 'exit'};
  }
  return {v: 'atlas', st: -1};
}
const rkey = r => r ? r.v + ':' + (r.st != null ? r.st : r.c || r.id || r.k || '') : '';
const isAtlas = r => r && r.v === 'atlas';
const toneOf = r => isAtlas(r) ? (r.st < 0 ? 'sand' : 'stone') : 'paper';

/* ================================================================ the Atlas view: captions over the world (or a still, without WebGL) */
function atlasView(r, gl) {
  const el = document.createElement('section'); el.className = 'view v-atlas' + (gl ? '' : ' nogl'); el.dataset.view = 'atlas';
  const co = r.st >= 0 ? CAT[r.st] : null;
  el.setAttribute('aria-labelledby', 'atH');
  const plan = gl ? '' : `<div class="plan" aria-label="The nine stations">${CAT.map((c, i) => `<a class="pm${i === r.st ? ' here' : ''}${c.c === '08' ? ' lead' : ''}" href="#/atlas/${c.c}" style="--i:${i};--c:${i % 3};--r:${Math.floor(i / 3)}"><i></i><span class="mono">${c.c}</span><b>${esc(c.n)}</b></a>`).join('')}
    <div class="pm-held"><span class="slot" data-slot="${LEAD}"></span><a class="held-line on" href="#/c/08"><i></i><span>Enter 08 <b>Renew</b></span></a></div></div>`;
  const cap = co ? `
    <div class="at-cap tx">
      <p class="at-code mono">${co.c} / 09</p>
      <h1 id="atH" tabindex="-1"><em>${esc(co.n)}</em></h1>
      <p class="desc">${esc(co.d)}</p>
      <p class="at-acts">${co.c === '08' ? `<span class="mono at-n">Six products · held by the instrument</span>` : `<a class="btn ghost" href="#/c/${co.c}">Enter ${co.c} ${esc(co.n)}${ic('arrow', 's')}</a>`}<a class="tl" href="#/atlas">Back to the plane</a></p>
      <nav class="at-step mono" aria-label="Neighbouring stations"><a href="#/atlas/${CAT[(r.st + 8) % 9].c}" aria-label="Previous station, ${esc(CAT[(r.st + 8) % 9].n)}">${ic('back', 's')}${CAT[(r.st + 8) % 9].c}</a><a href="#/atlas/${CAT[(r.st + 1) % 9].c}" aria-label="Next station, ${esc(CAT[(r.st + 1) % 9].n)}">${CAT[(r.st + 1) % 9].c}${ic('arrow', 's')}</a></nav>
    </div>` : `
    <div class="at-cap tx">
      <h1 id="atH" tabindex="-1">The <em>Atlas</em></h1>
      <p class="desc">The Formulary as a place: nine stations on an open plane. ${isPhone() ? 'Drag to look; tap a station to travel.' : 'Drag to look; click or hold a station to travel there.'}</p>
      <p class="at-acts"><a class="btn" href="#/c/08">Enter 08 Renew${ic('arrow', 's')}</a><a class="tl" href="#/formulary">The Formulary, all nine</a></p>
    </div>`;
  el.innerHTML = plan + cap;
  return {el, kind: 'atlas', r, lookFor: id => (id === LEAD ? {shadow: 0} : {})};
}
function makeView(r) {
  switch (r.v) {
    case 'atlas': return atlasView(r, !!S.world);
    case 'collection': return collectionView();
    case 'product': return productView(r.id);
    case 'formulary': return formularyView();
    case 'coll': return collView(r.c);
    case 'member': return memberView(r.k);
  }
  return atlasView({v: 'atlas', st: -1}, !!S.world);
}
const TITLE = r => r.v === 'atlas' ? (r.st >= 0 ? CAT[r.st].c + ' ' + CAT[r.st].n + ' · The Atlas' : 'The Atlas') : r.v === 'collection' ? '08 Renew' : r.v === 'product' ? byId(r.id).n : r.v === 'formulary' ? 'The Formulary' : r.v === 'coll' ? colOf(r.c).c + ' ' + colOf(r.c).n : r.v === 'member' ? 'Member' : 'P4CE';

/* ================================================================ transition plumbing */
const run = p => { S.run.push(p); return p; };
function settle() {
  S.run.forEach(p => p.tw && p.tw.cancel()); S.run = [];
  $$('.view.leaving', VIEWS).forEach(v => { Stage.each(a => { if (a.mode === 'slot' && v.contains(a.slot)) a.hide(); }); if (v._view && v._view.destroy) v._view.destroy(); v.remove(); });
}
const alive = my => my === S.tok;
function mount(nv, r) {
  nv.el._view = nv; nv.el.classList.add('entering'); VIEWS.appendChild(nv.el);
  HTML.dataset.view = r.v; document.title = 'P4CE · ' + TITLE(r);
  $$('[data-nav]', BAR).forEach(a => a.toggleAttribute('aria-current', a.dataset.nav === r.v));
  AUI.classList.toggle('on', isAtlas(r) && !!S.world);
}
function unmountLater(old, ms) {
  if (!old) return;
  const y = scrollY; old.el.classList.add('leaving'); old.el.style.top = (-y) + 'px';
  wait(ms).then(() => { if (!old.el.isConnected) return; Stage.each(a => { if (a.mode === 'slot' && old.el.contains(a.slot)) a.hide(); }); if (old.destroy) old.destroy(); old.el.remove(); });
}
function textOut(old) { if (old) old.el.classList.add('tx-out'); }
function textIn(nv, delay, my) { wait(RM ? 0 : delay).then(() => { if (alive(my)) { nv.el.classList.remove('entering'); if (nv.shown) nv.shown(); } }); }
function focusView(nv) { const h = $('h1', nv.el); if (h && !Protocol.isOpen) h.focus({preventScroll: true}); }
function glOpacity(to, dur, delay = 0) {
  if (!S.world) return Promise.resolve();
  const c = S.world.canvas, a = +(c.style.opacity || 1);
  if (to > 0) S.world.setVisible(true);
  return run(tween(dur, e => { c.style.opacity = (a + (to - a) * e).toFixed(3); }, E.io, delay)).then(ok => { if (ok && to === 0) S.world.setVisible(false); return ok; });
}
const lerpRect = (a, b, t) => ({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t});
const onScreen = r => r && r.w > 2 && r.y + r.h > 0 && r.y < innerHeight && r.x + r.w > 0 && r.x < innerWidth;

/* the shared-element pass: every product that is in both views flies between them; the rest go into or come out of the haze */
function flipActors(oldV, nv, o = {}) {
  const D = o.dur || T.move, slots = nv ? $$('[data-slot]', nv.el) : [], ids = new Set(slots.map(s => s.dataset.slot)), done = [];
  Stage.each(a => {
    if (ids.has(a.id) || a.mode === 'off' || a.mode === 'gl' || a.id === o.skip) return;
    const inOld = a.mode === 'fly' || (oldV && a.slot && oldV.el.contains(a.slot)); if (!inOld) return;
    const r = a.screenRect(), th = nv && $(`[data-thumb="${a.id}"]`, nv.el);
    /* back into a thumbnail, if the new view has one on screen */
    if (th && onScreen(rectOf(th)) && onScreen(r) && !RM) { th.style.visibility = 'hidden'; a.fly(() => rectOf(th), {from: r, dur: D, stayFloating: true}).then(ok => { if (ok) { th.style.visibility = ''; a.hide(); } }); return; }
    a.float(r);
    if (o.dir) a.fly({...r, x: r.x - o.dir * innerWidth * .1}, {from: r, dur: 800, ease: E.out, stayFloating: true});
    a.lookTo({blur: 16, op: 0, sc: .95, sat: .5, shadow: a.goal.shadow}, RM ? 99 : 3.4);
    wait(RM ? 0 : 900).then(() => { if (a.mode === 'fly' && !a.fl && a.look.op < .05) a.hide(); });
  });
  for (const slot of slots) {
    const id = slot.dataset.slot, a = Stage.get(id), look = nv.lookFor(id);
    if (o.from && o.from[id]) { done.push(a.fly(slot, {from: o.from[id], dur: D})); continue; }
    const r = a.mode === 'off' ? null : a.screenRect(), inOld = a.mode === 'fly' || (oldV && a.slot && oldV.el.contains(a.slot));
    const th = oldV && $(`[data-thumb="${id}"]`, oldV.el), tr = th && rectOf(th);
    if (inOld && onScreen(r)) { done.push(a.fly(slot, {dur: D})); a.lookTo(look, RM ? 99 : 2.6); continue; }
    if (th && onScreen(tr) && !RM) { a.lookNow(look); th.style.visibility = 'hidden'; done.push(a.fly(slot, {from: tr, dur: D}).then(ok => { th.style.visibility = ''; return ok; })); continue; }
    if (inOld && r && !RM) { done.push(a.fly(slot, {dur: D})); a.lookTo(look, 2.6); continue; }
    /* out of the haze, where it stands */
    a.dock(slot); a.lookNow({blur: 18, op: 0, sc: .95, sat: .5, shadow: look.shadow != null ? look.shadow : 1});
    if (o.dir && !RM) { const sr = rectOf(slot); a.fly(slot, {from: {...sr, x: sr.x + o.dir * innerWidth * .1}, dur: 900, ease: E.out}); }
    const dl = RM ? 0 : (o.emerge != null ? o.emerge : 300);
    wait(dl).then(() => a.lookTo(look, RM ? 99 : 2.2));
  }
  return Promise.all(done);
}

/* ================================================================ transitions */
async function transition(to, o = {}) {
  const my = ++S.tok; settle(); S.busy = true;
  const from = S.cur, old = from && from.view, instant = o.instant || !from;
  if (from) S.scroll[rkey(from.r)] = scrollY;
  const nv = makeView(to);
  S.cur = {r: to, view: nv};
  const W = S.world, fromGL = !!(W && from && isAtlas(from.r)), toGL = !!(W && isAtlas(to));
  if (W) W.interactive = false;

  /* reduced motion: every move becomes a short crossfade */
  if (instant || RM) {
    if (!instant) { HTML.classList.add('xfade'); await new Promise(r => setTimeout(r, 170)); if (!alive(my)) return; }
    if (old) { Stage.each(a => { if (a.mode === 'slot' && old.el.contains(a.slot)) a.hide(); }); if (old.destroy) old.destroy(); old.el.remove(); }
    mount(nv, to); nv.el.classList.remove('entering'); scrollTo(0, S.scroll[rkey(to)] || 0);
    Tone.set(toneOf(to));
    if (W) { W.go(toGL ? to.st : LEAD_CI, {instant: true}); Object.assign(W.fx, {push: 0, rise: 0, haze: 0, sweep: 0, release: 0}); W.held.vis = true; W.canvas.style.opacity = toGL ? 1 : 0; W.setVisible(toGL); }
    $$('[data-slot]', nv.el).forEach(s => { const a = Stage.get(s.dataset.slot); a.dock(s); a.lookNow(nv.lookFor(s.dataset.slot)); });
    Stage.each(a => { if (a.mode === 'slot' && !nv.el.contains(a.slot)) a.hide(); else if (a.mode === 'fly') a.hide(); });
    if (nv.shown) nv.shown();
    nv.el.querySelectorAll('.sweep').forEach(s => s.style.opacity = 1);
    requestAnimationFrame(() => HTML.classList.remove('xfade'));
    if (!instant) focusView(nv);
    if (W && toGL) W.interactive = true;
    S.busy = false; return;
  }

  mount(nv, to);
  const sy = S.scroll[rkey(to)] || 0;
  unmountLater(old, 1700); textOut(old);
  scrollTo(0, sy);

  if (fromGL && toGL) await atlasMove(from.r, to, nv, my);
  else if (fromGL && to.v === 'collection') await hinge(1, old, nv, my);
  else if (toGL && from.r.v === 'collection') await hinge(-1, old, nv, my);
  else if (fromGL) await haze(1, old, nv, my);
  else if (toGL) await haze(-1, old, nv, my);
  else await paper(from.r, to, old, nv, my);
  if (!alive(my)) return;
  if (W) { W.interactive = toGL; }
  focusView(nv);
  S.busy = false;
}

/* --- atlas to atlas: the camera travels; the tone drifts sand ↔ stone */
async function atlasMove(a, b, nv, my) {
  const W = S.world;
  W.go(b.st); Tone.to(toneOf(b), 1300);
  textIn(nv, 700, my);
  await wait(1300);
}

/* --- THE HINGE: Atlas ↔ Collection 08. The camera pushes in on the product in the arm while the colour drifts
   to paper and a seamless sweep rises around it; the held product (the same render) flies into its slot in the
   lineup and the other five come out of the haze beside it. dir = -1 plays the same move backwards. */
async function hinge(dir, old, nv, my) {
  const W = S.world, fx = W.fx, D = 1350, lead = Stage.get(LEAD);
  const blendIn = k => E.io(clamp((k - .28) / .72)), blendOut = k => E.io(clamp(k / .72));
  const t0 = CLOCK.now(), kOf = () => clamp((CLOCK.now() - t0) / D);
  /* the push ends where the product, seen through the camera, is the size of its slot in the lineup */
  const pushFor = sr => { const r0 = W.heldRect(); W.pushL = W.heldDist() * clamp(r0.h / Math.max(40, sr.h), .2, 1); return r0; };
  if (dir > 0) {
    const slot = $(`[data-slot="${LEAD}"]`, nv.el), sw = $('.sweep', nv.el);
    sw.style.opacity = 0;
    $$('[data-slot]', nv.el).forEach(s => { if (s.dataset.slot === LEAD) return; const a = Stage.get(s.dataset.slot); a.dock(s); a.lookNow({blur: 18, op: 0, sc: .95, sat: .5}); });
    W.canvas.style.opacity = 1;
    /* the hand-off: the WebGL sprite and the DOM actor are the same frame of the same render, at the same rect */
    lead.frame = W.held.frame; const r0 = pushFor(rectOf(slot));
    lead.lookNow({shadow: 0}); W.held.vis = false; W.force = true;
    run(tween(320, e => fx.release = e, E.out));
    run(tween(D, e => fx.push = e, E.move, 40));
    run(tween(D * .8, e => fx.haze = e, E.io, 110));
    run(tween(D * .7, e => fx.sweep = e, E.io, 150));
    Tone.to('paper', D * .85, E.io, 60);
    /* the product rides the camera (it IS the held product) and is eased onto its slot as the world turns to paper */
    const f = lead.fly(() => lerpRect(W.heldRect(), rectOf(slot), blendIn(kOf())), {from: r0, dur: D, ease: () => 1, frame: 0, stayFloating: true});
    lead.lookTo({...nv.lookFor(LEAD), shadow: 1}, 1.6);
    wait(D * .42).then(() => { if (alive(my)) $$('[data-slot]', nv.el).forEach(s => { if (s.dataset.slot !== LEAD) Stage.get(s.dataset.slot).lookTo(nv.lookFor(s.dataset.slot), 2.1); }); });
    textIn(nv, D * .74, my);
    run(tween(D * .45, e => sw.style.opacity = e.toFixed(3), E.io, D * .55));
    glOpacity(0, D * .24, D * .76);
    const ok = await f;
    if (!alive(my)) return;
    if (ok) lead.dock(slot);
    await wait(D * .05);
    Object.assign(fx, {push: 0, haze: 0, sweep: 0, release: 0}); W.held.vis = true; W.go(LEAD_CI, {instant: true});
  } else {
    const st = nv.r.st, sw = $('.sweep', old.el), slot = $(`[data-slot="${LEAD}"]`, old.el);
    const from = slot ? rectOf(slot) : lead.screenRect();
    W.go(st, {instant: true}); Object.assign(fx, {push: 0, haze: 0, sweep: 0, release: 0}); W.held.vis = false;
    W.frame(CLOCK.now(), 0); pushFor(from);
    Object.assign(fx, {push: 1, haze: 1, sweep: 1, release: 1});
    W.canvas.style.opacity = 0; W.setVisible(true); W.force = true;
    glOpacity(1, D * .2);
    if (sw) run(tween(D * .35, e => sw.style.opacity = (1 - e).toFixed(3), E.io));
    run(tween(D, e => fx.push = 1 - e, E.move));
    run(tween(D * .8, e => fx.haze = 1 - e, E.io, D * .14));
    run(tween(D * .7, e => fx.sweep = 1 - e, E.io, D * .2));
    run(tween(320, e => fx.release = 1 - e, E.io, D - 300));
    Tone.to(toneOf(nv.r), D * .85, E.io, D * .12);
    flipActors(old, nv, {skip: LEAD});
    lead.lookTo({shadow: 0, blur: 0, op: 1, sc: 1, sat: 1}, 3);
    const f = lead.fly(() => lerpRect(from, W.heldRect(), blendOut(kOf())), {from, dur: D, ease: () => 1, frame: W.held.frame, stayFloating: true});
    textIn(nv, D * .72, my);
    const ok = await f;
    if (!alive(my) || !ok) return;
    W.held.frame = lead.frame; W.held.vis = true; W.force = true; lead.hide();
  }
}

/* --- Atlas ↔ paper (Formulary, other collections, the product page, member pages): the camera rises into the sky
   while the haze takes the colour to paper; the page's text fades in on the paper it lands on */
async function haze(dir, old, nv, my) {
  const W = S.world, fx = W.fx, D = 1350;
  if (dir > 0) {
    run(tween(D, e => fx.rise = e, E.move));
    run(tween(D, e => fx.haze = e, t => Math.pow(t, 1.7)));
    Tone.to('paper', D, E.io);
    flipActors(old, nv, {emerge: D * .55});
    textIn(nv, D * .66, my);
    await glOpacity(0, D * .32, D * .68); if (!alive(my)) return;
    Object.assign(fx, {rise: 0, haze: 0});
  } else {
    W.go(nv.r.st, {instant: true}); Object.assign(fx, {rise: 1, haze: 1}); W.canvas.style.opacity = 0; W.setVisible(true); W.force = true;
    glOpacity(1, 300);
    run(tween(D, e => fx.rise = 1 - e, E.move, 60));
    run(tween(D, e => fx.haze = 1 - e, t => 1 - Math.pow(1 - t, 1.7), 60));
    Tone.to(toneOf(nv.r), D, E.io, 60);
    flipActors(old, nv, {});
    textIn(nv, D * .7, my);
    await wait(D + 60);
  }
}

/* --- paper to paper: shared products fly; the rest haze; the text crossfades */
async function paper(a, b, old, nv, my) {
  const dir = a.v === 'product' && b.v === 'product' ? Math.sign(byId(b.id).k - byId(a.id).k) * (Math.abs(byId(b.id).k - byId(a.id).k) > 3 ? -1 : 1) : 0;
  const tone = toneOf(b); if (Tone.name !== tone) Tone.to(tone, 1100);
  if (nv.setFocusId && a.v === 'product') nv.setFocusId(a.id);
  const isProd = a.v === 'collection' && b.v === 'product' || a.v === 'product' && b.v === 'collection';
  const p = flipActors(old, nv, {dir, dur: isProd ? 1200 : 1100, emerge: isProd ? 420 : 260});
  if (b.v === 'product') nv.el.classList.add('arriving');
  textIn(nv, isProd ? 640 : 300, my);
  await Promise.race([p, wait(1300)]);
  nv.el.classList.remove('arriving');
}

/* ================================================================ the router */
async function route() {
  let r = parse(location.hash);
  if (r.v === 'exit') { store.del('p4ce.v5.member'); S.member = false; Protocol.close(); toGate(); history.replaceState(null, '', cleanURL(['key']) + '#/'); return; }
  if (!S.member) { if (!Gate.live) toGate(); return; }
  if (r.v === 'home') { history.replaceState(null, '', '#/atlas'); r = {v: 'atlas', st: -1}; }
  if (r.v === 'protocol') { if (!S.cur) await transition({v: 'atlas', st: -1}, {instant: true}); Protocol.open(); return; }
  if (Protocol.isOpen) Protocol.close();
  closeMenus();
  if (S.cur && rkey(S.cur.r) === rkey(r)) return;
  S.last = S.cur && S.cur.r;
  await transition(r);
}
function toGate(o = {}) {
  HTML.classList.remove('in'); HTML.classList.add('out'); BAR.hidden = true; document.title = 'Closed';
  settle(); $$('.view', VIEWS).forEach(v => v.remove()); Stage.each(a => a.hide()); S.cur = null;
  if (S.world) { S.world.setVisible(false); S.world.canvas.style.opacity = 0; }
  AUI.classList.remove('on'); Tone.set('night');
  Gate.show(o);
}
/* the reveal: the door opened onto light, and that light is the Atlas's sky and haze */
const enter = {
  prepare(light) {
    S.member = true;
    const W = S.world; Tone.set(light || STOPS.light);
    if (W) { W.go(-1, {instant: true}); Object.assign(W.fx, {haze: 1, rise: .55}); W.canvas.style.opacity = 1; W.setVisible(true); W.force = true; }
  },
  async go(light) {
    if (!S.world && S.worldP) { S.world = await S.worldP; if (S.world) enter.prepare(light); }
    HTML.classList.remove('out'); HTML.classList.add('in'); BAR.hidden = false;
    history.replaceState(null, '', cleanURL(['key', 'gate']) + '#/atlas');
    const W = S.world, my = ++S.tok, r = {v: 'atlas', st: -1}, nv = makeView(r);
    S.cur = {r, view: nv}; mount(nv, r); BAR.classList.add('arrive');
    if (W) {
      const D = RM ? 0 : 2600;
      run(tween(D, e => W.fx.haze = 1 - e, E.out4, 120)); run(tween(D, e => W.fx.rise = .55 * (1 - e), E.move, 120));
      Tone.to('sand', D, E.io, 120);
      textIn(nv, D * .62, my);
      wait(D * .66).then(() => BAR.classList.remove('arrive'));
      await wait(D); if (W) W.interactive = true;
    } else { Tone.to('sand', 900); textIn(nv, 500, my); }
    wait(60).then(() => BAR.classList.remove('arrive'));
    focusView(nv);
  }
};

/* ================================================================ the bar: search, member menu */
const menu = $('#menu'), bMember = $('#bMember'), search = $('#search'), bSearch = $('#bSearch'), sQ = $('#sQ'), sRes = $('#sRes');
function closeMenus() { menu.hidden = true; bMember.setAttribute('aria-expanded', 'false'); search.hidden = true; bSearch.setAttribute('aria-expanded', 'false'); }
bMember.addEventListener('click', () => { const on = menu.hidden; closeMenus(); menu.hidden = !on; bMember.setAttribute('aria-expanded', on); if (on) $('a', menu).focus(); });
bSearch.addEventListener('click', () => { const on = search.hidden; closeMenus(); search.hidden = !on; bSearch.setAttribute('aria-expanded', on); if (on) { sQ.focus(); renderSearch(); } });
const ALLP = CAT.flatMap(c => c.it);
function renderSearch() {
  const q = sQ.value.trim().toLowerCase();
  const hits = !q ? ALLP.filter(p => p.c === '08') : ALLP.filter(p => (p.n + ' ' + p.g + ' ' + p.cn + ' ' + p.id + ' ' + p.act.map(a => a.name).join(' ') + ' ' + p.oth).toLowerCase().includes(q)).slice(0, 12);
  sRes.innerHTML = hits.length ? hits.map(p => `<li><a href="${p.c === '08' ? '#/p/' + p.id : '#/c/' + p.c}"><span class="mono">${p.id}</span><b>${esc(p.n)}</b><span>${esc(p.g)} · ${esc(p.cn)}</span></a></li>`).join('') : `<li class="none">Nothing in the Formulary matches “${esc(sQ.value)}”.</li>`;
}
sQ.addEventListener('input', renderSearch);
sRes.addEventListener('click', e => { if (e.target.closest('a')) closeMenus(); });
addEventListener('keydown', e => {
  if (e.key === 'Escape' && (!menu.hidden || !search.hidden)) { const b = !menu.hidden ? bMember : bSearch; closeMenus(); b.focus(); }
  if (e.key === '/' && S.member && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !Gate.live) { e.preventDefault(); bSearch.click(); }
});
document.addEventListener('click', e => { if (!e.target.closest('#menu,#bMember,#search,#bSearch')) closeMenus(); });

/* ================================================================ the loop */
function loop(now) {
  requestAnimationFrame(loop);
  const dt = CLOCK.tick(now);
  if (document.hidden) return;
  stepTweens();
  /* the world first, then the tweens again, so an actor riding the camera (heldRect) uses this frame's camera */
  if (S.world && S.world.visible) { S.world.frame(CLOCK.now(), dt); stepTweens(); }
  Stage.step(dt);
  if (S.cur && S.cur.view.frame) S.cur.view.frame(dt);
  if (Gate.live) Gate.frame(CLOCK.now());
}

/* ================================================================ boot */
async function loadWorld() {
  if (NOGL) return null;
  try {
    const m = await import('./atlas/world.js');
    const w = m.createWorld(WORLD, {labels: $('#lbl'), held: $('#heldLine'), heldHit: $('#heldHit'), ring: $('#ring'), ringFg: $('#ringFg')});
    if (!w) { HTML.classList.add('nogl'); return null; }
    w.onTravel = st => { location.hash = '#/atlas/' + CAT[st].c; };
    w.setVisible(false); w.canvas.style.opacity = 0;
    return w;
  } catch (e) { console.warn('[p4] world unavailable', e); HTML.classList.add('nogl'); return null; }
}
async function boot() {
  Tone.set(S.member ? 'sand' : 'night');
  await loadManifest();
  img(frames(LEAD)[0]); Stage.preload(LEAD, 0, 48);
  CAT[7].it.forEach(p => img(frames(p.id)[0]));
  requestAnimationFrame(loop);
  const key = (Q.get('key') || '').replace(/\s+/g, '').toUpperCase() === '0047RSRV';
  if (!S.member) {
    BAR.hidden = true;
    await Gate.init(enter);
    S.worldP = loadWorld().then(w => { S.world = w; if (w) w.warm(); return w; });
    toGate({key});
    await S.worldP;
  } else {
    BAR.hidden = false;
    S.world = await loadWorld();
    const r = parse(location.hash);
    if (r.v === 'home' || r.v === 'atlas' && !location.hash) {
      /* a returning member lands straight on the Atlas, which clears out of a short haze */
      history.replaceState(null, '', '#/atlas');
      enter.prepare(Tone.hex); enter.go();
    } else {
      if (r.v === 'protocol') { await transition({v: 'atlas', st: -1}, {instant: true}); Protocol.open(); }
      else await transition(r.v === 'exit' ? {v: 'atlas', st: -1} : r, {instant: true});
      if (r.v === 'exit') route();
      if (S.world && isAtlas(r)) S.world.interactive = true;
    }
  }
  addEventListener('hashchange', route);
  HTML.classList.add('ready');
}
boot();

/* ================================================================ test hooks */
window.P4V5 = {
  state: () => ({
    route: S.cur ? S.cur.r : null, hash: location.hash, member: S.member, gate: Gate.live ? Gate.state() : null, busy: S.busy,
    tone: Tone.hex, toneName: Tone.name, rm: RM, gl: !!S.world, world: S.world ? S.world.state() : null,
    actors: [...Stage.actors.values()].map(a => ({id: a.id, mode: a.mode, frame: Math.round(a.frame), op: +a.look.op.toFixed(2), blur: +a.look.blur.toFixed(1), rect: (r => ({x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h)}))(a.screenRect())})),
    protocol: {open: Protocol.isOpen, count: Protocol.count(), lines: Protocol.lines()}, clock: Math.round(CLOCK.now()), held: CLOCK.held
  }),
  go: h => { location.hash = h; },
  /* hold the virtual clock (every authored move stops where it is), and step it by ms */
  hold: (on = true) => { CLOCK.held = on; return CLOCK.now(); },
  step: ms => {
    for (let t = 0; t < ms; t += 16) { const d = Math.min(16, ms - t); CLOCK.t += d; stepTweens(); Stage.step(d / 1000); if (S.cur && S.cur.view.frame) S.cur.view.frame(d / 1000); }
    if (S.world && S.world.visible) { S.world.force = true; S.world.frame(CLOCK.now(), .016); stepTweens(); Stage.step(0); }
    return CLOCK.now();
  },
  gate: Gate, protocol: Protocol, world: () => S.world, stage: Stage, tone: Tone
};

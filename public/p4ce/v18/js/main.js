// PR6 / Institute: boot, routing, the stage loop and the shell (bar, direct index, preferences, prototype controls).
// One application, two ways to move through it: Explore (rooms move, authored transitions) and Direct (still, instant).
// Every screen is ordinary HTML over a picture; nothing essential lives in the canvas.
import { createStage } from './stage.js';
import { createStill } from './still.js';
import { createKeeper } from './keeper.js';
import { createSound } from './sound.js';
import { store, fmtCode, DEMO_CODES } from './store.js';
import { $, $$, esc, ease, lerpView } from './ui.js';
import { ALL, SERIES, DISPATCHES, statusOf } from './catalog.js';
import { ORDER_STATE } from './institution.js';
import * as OUT from './outside.js';
import * as IN from './inside.js';
import { passage } from './film.js';

const CHALK = [0.949, 0.953, 0.937], NIGHT = [0.043, 0.055, 0.063];
const man = await fetch('assets/scenes/manifest.json').then((r) => r.json()).catch(() => ({ frames: {} }));
let stage = createStage($('#stage'), man, 'assets/scenes/');
if (!stage) { document.body.classList.add('no-gl'); stage = createStill($('#still'), man, 'assets/scenes/'); }
const keeper = stage.still ? null : createKeeper($('#keeper'));
const rm = matchMedia('(prefers-reduced-motion: reduce)');
const narrowMQ = matchMedia('(max-width: 860px)');
const view = $('#view'), marks = $('#marks');
const state = { layout: 'full', theme: 'outside' };
let epoch = 0, cur = null, snd = null;
const tweens = new Set();

const app = {
  store, stage, keeper, man, view, marks, state,
  has: (name) => !!man.frames[name],
  narrow: () => narrowMQ.matches,
  motion: () => { const p = store.prefs.motion; return p === 'explore' || (p !== 'direct' && !rm.matches); },
  live: () => { const e = epoch; return () => e === epoch; },
  // tween(seconds, fn(k 0..1)): resolves at the end; in Direct mode it lands at once
  tween: (sec, fn, e = ease.io) => new Promise((res) => {
    if (!app.motion() || sec <= 0) { fn(1); res(); return; }
    fn(0); tweens.add({ t0: null, sec, fn, e, res, ep: epoch });
  }),
  wait: (sec) => new Promise((res) => setTimeout(res, sec * 1000)),          // reading time: always real
  beat: (sec) => (app.motion() ? app.wait(sec) : Promise.resolve()),           // a cinematic pause: skipped in Direct
  go: (hash) => { if (location.hash === hash) route(); else location.hash = hash; },
  announce: (t) => { const l = $('#live'); l.textContent = ''; setTimeout(() => { l.textContent = t; }, 60); },
  pointer: [0, 0],
  // sound: created on the first "on" (a gesture), silent otherwise
  sfx: (name, ...a) => { if (snd && store.prefs.sound && snd[name]) snd[name](...a); },
  amb: (kind) => { state.amb = kind; if (snd) { snd.city(kind === 'city' ? 1 : 0, 2.5); snd.inside(kind === 'inside' ? 1 : 0, 2.5); } },
  setSound: (on) => {
    store.setPref('sound', !!on);
    if (on && !snd) { snd = createSound(); if (snd) app.amb(state.amb); }
    if (snd) snd.on(on);
    const b = $('#snd'); b.textContent = on ? 'Sound on' : 'Sound off'; b.setAttribute('aria-pressed', on ? 'true' : 'false');
  },
  soundTick: (t) => { if (snd && store.prefs.sound) snd.tick(t); },
  buzz: (v) => { if (snd && store.prefs.sound) snd.buzz(v); },
  proto: () => renderProto(),
  chrome: () => chrome(),
};

function setLayout(layout, theme) {
  const b = document.body;
  b.classList.remove('stage-full', 'stage-pane', 'stage-off', 'inside', 'outside');
  b.classList.add('stage-' + layout, theme);
  state.layout = layout; state.theme = theme;
  stage.bg = theme === 'inside' ? CHALK : NIGHT;
  const tc = $('meta[name=theme-color]'); if (tc) tc.content = theme === 'inside' ? '#F2F3EF' : '#0B0E10';
}
function defaults() {
  const inside = state.theme === 'inside';
  Object.assign(stage, { rain: 0, expo: 1, vig: inside ? 0.1 : 0.55, grain: inside ? 0.016 : 0.035, parK: 0.012, fogK: 1 });
  stage.weights = {};
}
/** Put a frame on the stage. Same layout: glide or cross-fade. New layout or theme: through a veil of the room's own colour. */
app.scene = async ({ layout, theme, frame, view: vf, need = 0, tiles, slit = null, setup, dur = 0.9 }) => {
  const ok = app.live();
  let F = null;
  if (layout !== 'off' && frame) {
    try { F = await stage.load(frame); if (tiles) await F.setTiles(tiles, slit); } catch (e) { F = null; }
  }
  if (!ok()) return null;
  const same = state.layout === layout && state.theme === theme && layout !== 'off' && stage.A && F;
  const V = () => (F && vf ? vf(stage, F) : { cx: 0.5, cy: 0.5, zoom: 1 });
  if (same && stage.A === F) {
    const v0 = { ...stage.viewA }; stage.need = need; stage.resize(); defaults(); if (setup) setup(stage, F);
    const v1 = V(); await app.tween(dur, (k) => { stage.viewA = lerpView(v0, v1, k); });
    return F;
  }
  if (same) {
    stage.need = need; stage.resize(); defaults(); if (setup) setup(stage, F);
    stage.B = F; stage.viewB = V(); await app.tween(dur, (k) => { stage.mix = k; });
    if (!ok()) return null;
    stage.A = F; stage.viewA = stage.viewB; stage.B = null; stage.mix = 0;
    return F;
  }
  stage.fade = theme === 'inside' ? CHALK : NIGHT;
  if (state.layout !== 'off' && stage.A && stage.fadeAmt < 1) await app.tween(0.35, (k) => { stage.fadeAmt = Math.max(stage.fadeAmt, k); }, ease.in);
  if (!ok()) return null;
  setLayout(layout, theme);
  stage.A = F; stage.B = null; stage.mix = 0;
  if (layout === 'off') return null;
  stage.need = need; stage.resize(); defaults(); if (setup) setup(stage, F);
  stage.viewA = V(); stage.fadeAmt = 1;
  app.tween(0.8, (k) => { stage.fadeAmt = 1 - k; }, ease.out);
  return F;
};
/** View that fits a rectangle [[x0,y0],[x1,y1]] of the frame into a share of the window. */
app.fit = (S, rect, share = 0.8, dy = 0) => {
  const w = Math.abs(rect[1][0] - rect[0][0]), h = Math.abs(rect[1][1] - rect[0][1]);
  const zoom = Math.min(share * S.span[0] / w, share * S.span[1] / h);
  return { cx: (rect[0][0] + rect[1][0]) / 2, cy: (rect[0][1] + rect[1][1]) / 2 + dy / zoom, zoom };
};
/** Place an element of #marks over a frame rectangle or at a frame point. */
app.placeRect = (el, rect, v = stage.viewA) => {
  const a = stage.toScreen(rect[0][0], rect[0][1], v), b = stage.toScreen(rect[1][0], rect[1][1], v);
  const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]);
  el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; el.style.width = Math.abs(b[0] - a[0]).toFixed(1) + 'px'; el.style.height = Math.abs(b[1] - a[1]).toFixed(1) + 'px';
};
app.placeAt = (el, u, v, view = stage.viewA) => { const p = stage.toScreen(u, v, view); el.style.left = p[0].toFixed(1) + 'px'; el.style.top = p[1].toFixed(1) + 'px'; };

// ------------------------------------------------------------------ routes
const ROUTES = {
  '': { v: OUT.entry }, alley: { v: OUT.alley, inv: 1 }, keeper: { v: OUT.keeper, inv: 1 }, apply: { v: OUT.apply, inv: 1 },
  status: { v: OUT.status, inv: 1 }, offer: { v: OUT.offer, inv: 1 }, 'sign-in': { v: OUT.signIn }, support: { v: IN.support },
  passage: { v: passage, m: 1 }, atrium: { v: IN.atrium, m: 1 }, compass: { v: IN.compass, m: 1 }, formulary: { v: IN.formulary, m: 1 },
  record: { v: IN.record, m: 1 }, archive: { v: IN.archive, m: 1 }, dispatches: { v: IN.dispatches, m: 1 }, orders: { v: IN.orders, m: 1 },
  order: { v: IN.order, m: 1 }, nominations: { v: IN.nominations, m: 1 }, account: { v: IN.account, m: 1 }, library: { v: IN.library, m: 1 },
};
async function route() {
  const my = ++epoch;
  for (const tw of tweens) tw.res(); tweens.clear();
  if (cur && cur.leave) { try { cur.leave(); } catch (e) { console.warn(e); } }
  cur = null; marks.innerHTML = ''; document.body.classList.remove('keeper-on', 'film'); $('#proto').open = false;
  const idx = $('#index'); if (idx.open) idx.close();
  const parts = location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
  const name = parts[0] || '', args = parts.slice(1).map(decodeURIComponent);
  const r = ROUTES[name], m = store.member(), inv = store.invitation();
  if (!r) return app.go(m ? '#/atrium' : '#/');
  if (r.m && !m) { try { sessionStorage.setItem('pr6.next', location.hash); } catch (e) { /* ignore */ } return app.go(store.hasMembers() ? '#/sign-in' : '#/'); }
  if (r.inv && !inv) return app.go('#/');
  if (name === '' && m && !inv) return app.go('#/atrium');
  view.classList.add('leaving'); view.style.opacity = 0;
  let res = null;
  try { res = await r.v(app, args); } catch (e) { console.error(e); view.innerHTML = `<div class="page"><h1 class="title">Something went wrong on this page.</h1><p class="lead">Nothing was lost. <a href="#/support">Contact support</a> or go <a href="${m ? '#/atrium' : '#/'}">back to the start</a>.</p></div>`; }
  if (my !== epoch) return;
  cur = res || {};
  document.title = (cur.title ? cur.title + ' · ' : '') + 'PR6';
  $('#crumb').textContent = cur.crumb || '';
  $$('#thumb [data-k]').forEach((a) => { if (a.dataset.k === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  chrome(); renderProto();
  view.style.transition = app.motion() ? 'opacity .45s' : 'none'; view.style.opacity = 1; view.classList.remove('leaving');
  document.body.classList.remove('booting');
  if (!cur.keepScroll) window.scrollTo(0, 0);
  const h = $('h1', view); if (h && !cur.noFocus) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  if (cur.title) app.announce(cur.title);
}
function chrome() {
  const m = store.member(), inside = state.theme === 'inside' && !!m;
  $('#home').href = m ? '#/atrium' : '#/';
  $('#idx').hidden = !m; $('#bar-help').hidden = !!m;
  const th = $('#thumb'); th.hidden = !inside || document.body.classList.contains('film'); document.body.classList.toggle('has-thumb', !th.hidden);
  const o = $('#bar-order'); const n = m ? m.cart.reduce((s, l) => s + l.qty, 0) : 0;
  o.hidden = !n; o.textContent = `Order · ${n}`;
  document.body.classList.toggle('still', !app.motion());
}

// ------------------------------------------------------------------ the direct index (always one press away inside)
function indexItems() {
  const m = store.member(); if (!m) return [];
  const o = m.orders[0], left = 5 - m.nominations.filter((n) => n.state !== 'revoked-unused').length;
  const cart = m.cart.reduce((s, l) => s + l.qty, 0);
  return [
    ['#/atrium', 'Atrium', 'Home'],
    ['#/orders' + (o ? '/' + o.id : ''), 'Orders', o ? `${o.id} · ${ORDER_STATE[o.state]}` : 'No orders yet'],
    ...(cart ? [['#/order', 'Order list', `${cart} item${cart > 1 ? 's' : ''}`]] : []),
    ['#/formulary', 'Formulary', `${ALL.length} records`],
    ['#/compass', 'Compass', m.compass && m.compass.done ? 'Your index' : 'Optional'],
    ['#/archive', 'Archive', 'Your record'],
    ['#/nominations', 'Nominations', m.nominationsOpen ? `${left} of 5 remaining` : 'After a first order'],
    ['#/dispatches', 'Dispatches', `${DISPATCHES.length} entries`],
    ['#/library', 'Library', `${m.saved.length} saved`],
    ['#/support', 'Support', 'Answered by people'],
    ['#/account', 'Account', 'Sign-in, privacy, data'],
  ];
}
function search(q) {
  const m = store.member(); q = q.trim().toLowerCase(); if (!q || !m) return [];
  const out = [];
  for (const [href, t, d] of indexItems()) if (t.toLowerCase().includes(q)) out.push([href, t, d]);
  for (const o of m.orders) if (o.id.toLowerCase().includes(q) || 'order'.startsWith(q)) out.push(['#/orders/' + o.id, `Order ${o.id}`, ORDER_STATE[o.state]]);
  for (const s of SERIES) if ((s.n + ' ' + s.f + ' ' + s.d).toLowerCase().includes(q)) out.push(['#/formulary/' + s.c, `${s.n} · ${s.f}`, 'Series']);
  for (const r of ALL) if ((r.id + ' ' + r.name + ' ' + r.cls + ' ' + r.tags.join(' ') + ' ' + r.lot).toLowerCase().includes(q)) out.push(['#/record/' + r.id, `${r.name} · ${r.id}`, statusOf(r).label]);
  for (const d of DISPATCHES) if ((d.title + ' ' + d.dek + ' ' + d.kind).toLowerCase().includes(q)) out.push(['#/dispatches/' + d.id, d.title, d.kind]);
  return out.slice(0, 12);
}
const rowsHTML = (items) => `<ul class="rows">${items.map(([h, t, d]) => `<li><a class="row" href="${h}"><span class="t">${esc(t)}</span><span class="m">${esc(d)}</span></a></li>`).join('')}</ul>`;
function openIndex() {
  const d = $('#index'); if (!store.member()) return;
  $('#index-nav').innerHTML = rowsHTML(indexItems());
  $('#q').value = ''; $('#q-out').innerHTML = '';
  $$('input[name=motion]', d).forEach((i) => { i.checked = i.value === (store.prefs.motion || 'auto'); });
  if (!d.open) d.showModal();
  if (!app.narrow()) $('#q').focus();
}
$('#idx').addEventListener('click', openIndex); $('#idx2').addEventListener('click', openIndex);
$('#index-x').addEventListener('click', () => $('#index').close());
$('#index').addEventListener('click', (e) => { if (e.target.id === 'index') e.target.close(); if (e.target.closest('a')) $('#index').close(); });
$('#q').addEventListener('input', (e) => {
  const q = e.target.value, r = search(q);
  $('#q-out').innerHTML = !q.trim() ? '' : r.length ? rowsHTML(r) : `<p class="note">Nothing matches “${esc(q)}”. Try a catalogue number, a Series or an order number.</p>`;
});
$('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = $('#q-out a'); if (a) { e.preventDefault(); a.click(); } } });
$('#index').addEventListener('change', (e) => { if (e.target.name === 'motion') { store.setPref('motion', e.target.value); chrome(); if (cur && cur.mode) cur.mode(); } });
$('#index-out').addEventListener('click', () => { store.signOut(); $('#index').close(); app.go('#/'); });
$('#snd').addEventListener('click', () => app.setSound(!store.prefs.sound));
addEventListener('keydown', (e) => {
  if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && store.member()) { e.preventDefault(); openIndex(); $('#q').focus(); }
});

// ------------------------------------------------------------------ prototype controls (scaffold, clearly not product)
function renderProto() {
  const el = $('#proto-in'); const m = store.member(), inv = store.invitation(), a = store.application();
  const h = ['<p>Everything behind this page is simulated in this browser. Nothing is sent anywhere.</p>'];
  if (inv) {
    h.push(`<p>Invitation <b>${fmtCode(inv.code)}</b> · state <b>${inv.state}</b></p>`);
    if (store.lock()) h.push('<button data-p="unlock">Clear the 24 hour door restriction</button>');
    if (a && a.status === 'review') h.push('<button data-p="approve">Review: approve this application</button><button data-p="decline">Review: decline this application</button>');
    h.push('<button data-p="leave">Put this invitation down</button>');
  } else if (!m) {
    h.push('<p>Sample invitations. Each carries a different seal:</p>' + DEMO_CODES.map((c) => `<button data-p="code" data-c="${c}">${fmtCode(c)}</button>`).join(''));
  }
  if (m) {
    const o = m.orders.find((x) => x.state < 4);
    if (o) h.push(`<button data-p="advance" data-o="${o.id}">Fulfilment: move ${o.id} one step on</button>`);
    const codes = store.issuedCodes();
    if (codes.length) h.push('<p>Codes your nominees would receive by post (sign out to try one):</p>' + codes.map((c) => `<p><b>${fmtCode(c)}</b></p>`).join(''));
    h.push('<button data-p="out">Sign out</button>');
  }
  h.push('<button data-p="reset">Reset the prototype</button>');
  el.innerHTML = h.join('');
}
$('#proto-in').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const p = b.dataset.p;
  if (p === 'code') { if (location.hash.replace(/^#\/?/, '') !== '') location.hash = '#/'; setTimeout(() => { const i = $('#code'); if (i) { i.value = fmtCode(b.dataset.c); i.focus(); } }, 350); $('#proto').open = false; return; }
  if (p === 'unlock') store.clearLock();
  if (p === 'approve') store.decide('approved');
  if (p === 'decline') store.decide('declined');
  if (p === 'leave') { store.leaveInvitation(); return app.go('#/'); }
  if (p === 'advance') store.advanceOrder(b.dataset.o);
  if (p === 'out') { store.signOut(); return app.go('#/'); }
  if (p === 'reset') { store.reset(); return app.go('#/'); }
  route();
});

// ------------------------------------------------------------------ the loop
let last = 0;
function frame(ms) {
  const t = ms / 1000, dt = Math.min(0.1, Math.max(0, t - last)); last = t;
  for (const tw of tweens) {
    if (tw.ep !== epoch) { tweens.delete(tw); tw.res(); continue; }
    if (tw.t0 === null) tw.t0 = t;
    const k = Math.min(1, (t - tw.t0) / tw.sec);
    tw.fn(tw.e(k));
    if (k >= 1) { tweens.delete(tw); tw.res(); }
  }
  const mo = app.motion();
  if (cur && cur.tick) cur.tick(t, dt, mo);
  if (state.layout !== 'off' && !document.hidden) {
    const k = 1 - Math.pow(0.02, dt), tx = mo ? app.pointer[0] : 0, ty = mo ? app.pointer[1] : 0;
    stage.par[0] += (tx - stage.par[0]) * k; stage.par[1] += (ty - stage.par[1]) * k;
    const rain = stage.rain; if (!mo) stage.rain = 0;
    stage.draw(mo ? t : 0); stage.rain = rain;
    if (keeper && document.body.classList.contains('keeper-on')) keeper.draw(mo ? t : 2, mo ? dt : 0.016);
  }
  requestAnimationFrame(frame);
}
addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') app.pointer = [(e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2]; });
addEventListener('resize', () => { stage.resize(); if (cur && cur.resize) cur.resize(); });
addEventListener('hashchange', route);
$('#proto').addEventListener('toggle', renderProto);

setLayout('full', 'outside'); stage.resize(); stage.fadeAmt = 1; stage.fade = NIGHT;
$('#snd').textContent = 'Sound off'; store.setPref('sound', false);   // sound never starts by itself
requestAnimationFrame(frame);
route();
window.pr6 = { app, store };   // for the prototype's own tests

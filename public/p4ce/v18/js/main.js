// PR6 / Institute: boot, routing, the scene loop and the shell (bar, direct index, preferences, prototype controls).
// One application, two ways to move through it: Explore (a real-time world, crossed by camera) and Direct (still,
// instant). Every screen is ordinary HTML over the picture; nothing essential lives in the canvas.
import { createWorld } from './world.js';
import { createShots } from './shots.js';
import { createStill } from './still.js';
import { createKeeper } from './keeper.js';
import { createSound } from './sound.js';
import { store, fmtCode, fmtId, DEMO_CODES, DEMO_SEALS } from './store.js';
import { $, $$, esc, ease, lerpView } from './ui.js';
import { ALL, SERIES, DISPATCHES, statusOf } from './catalog.js';
import { ORDER_STATE, DESC } from './institution.js';
import * as OUT from './outside.js';
import * as IN from './inside.js';
import { passage } from './film.js';

const CHALK = [0.949, 0.953, 0.937], NIGHT = [0.043, 0.055, 0.063];
const man = await fetch('assets/scenes/manifest.json').then((r) => r.json()).catch(() => ({ frames: {} }));
// The world needs WebGL 2. Without it the same screens stand on rendered stills, and everything is Direct.
const W = /[?&]still\b/.test(location.search) ? null : createWorld($('#stage'));
let stage = null;
if (W) document.body.classList.add('gl3'); else { document.body.classList.add('no-gl'); stage = createStill($('#still'), man, 'assets/scenes/'); }
const keeper = W ? createKeeper($('#keeper')) : null;
const rm = matchMedia('(prefers-reduced-motion: reduce)');
const narrowMQ = matchMedia('(max-width: 860px)');
const view = $('#view'), marks = $('#marks');
const state = { layout: 'full', theme: 'outside', shot: null, zone: null };
let epoch = 0, cur = null, snd = null;
const tweens = new Set();

const app = {
  store, stage, world: W, keeper, man, view, marks, state,
  has: (name) => !!man.frames[name],
  narrow: () => narrowMQ.matches,
  motion: () => { if (!W) return false; const p = store.prefs.motion; return p === 'explore' || (p !== 'direct' && !rm.matches); },
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
  // the Keeper's recorded voice, only while sound is on: resolves with the line's length in seconds (0 when silent)
  voice: (id) => (id && snd && store.prefs.sound ? snd.voice(`assets/voice/keeper-${id}.mp3`) : Promise.resolve(0)),
  hush: () => { if (snd) snd.hush(); },
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
  /** A lamp of the alley (lampL, lampR, tube): 1 is lit. */
  lamp: (name, v) => { if (W) W.lamps[name] = v; else stage.weights[name] = v; },
};
const shots = W ? createShots(W, app) : null; app.shots = shots;

function setLayout(layout, theme) {
  const b = document.body;
  b.classList.remove('stage-full', 'stage-pane', 'stage-off', 'inside', 'outside');
  b.classList.add('stage-' + layout, theme);
  state.layout = layout; state.theme = theme;
  if (stage) stage.bg = theme === 'inside' ? CHALK : NIGHT;
  const tc = $('meta[name=theme-color]'); if (tc) tc.content = theme === 'inside' ? '#F2F3EF' : '#0B0E10';
}
function defaults() {
  const inside = state.theme === 'inside';
  Object.assign(stage, { rain: 0, expo: 1, vig: inside ? 0.1 : 0.55, grain: inside ? 0.016 : 0.035, parK: 0.012, fogK: 1 });
  stage.weights = {};
}
/** The door the passage stands behind: the member's own, kept with the invitation that admitted them. */
const doorSide = () => {
  const inv = store.invitation(), m = store.member(); if (inv && inv.doorSide) return inv.doorSide;
  const own = m && Object.values(store.exportAll().invitations).find((x) => x.member === m.id);
  return (own && own.doorSide) || 'L';
};
app.doorSide = doorSide;
const INSIDE = ['passage', 'atrium', 'compass', 'formulary', 'archive'];
/**
 * Put the picture behind a screen.
 * In the world: fly the camera to a named shot (shot, arg). The move is continuous: between rooms the camera goes
 * through the openings that join them, and a change of layout slides the page over while the view re-centres.
 * Without WebGL: the rendered still for that screen (frame, view, tiles, slit), placed at once.
 */
app.scene = async ({ layout, theme, shot, arg, frame, view: vf, need = 0, tiles, slit = null, setup, dur }) => {
  const ok = app.live();
  if (!W) {
    let F = null;
    if (layout !== 'off' && frame) { try { F = await stage.load(frame); if (tiles) await F.setTiles(tiles, slit); } catch (e) { F = null; } }
    if (!ok()) return null;
    setLayout(layout, theme);
    stage.A = F; stage.B = null; stage.mix = 0; stage.fadeAmt = 0;
    if (layout === 'off') return null;
    stage.need = need; stage.resize(); defaults(); if (setup) setup(stage, F);
    stage.viewA = F && vf ? vf(stage, F) : { cx: 0.5, cy: 0.5, zoom: 1 };
    return F;
  }
  const was = { ...state };
  if (layout === 'off') { W.halt(); setLayout(layout, theme); state.shot = null; return null; }
  const zone = shots.zoneOf(shot), isIn = zone !== 'alley';
  W.setSide(doorSide());
  await W.need(isIn ? ['atrium', ...(zone !== 'atrium' ? [zone] : [])] : ['alley']); if (!ok()) return null;
  // a member's own door stands as their acceptance left it: both bolts drawn, their number in its plate.
  // (The offer screen works the door itself, and says so with app.doorHeld.)
  if (!app.doorHeld) {
    const m = store.member(), k = doorSide();
    for (const d of ['L', 'R']) { const mine = !!m && d === k; W.bolt(d, 0, mine ? 1 : 0, true); W.bolt(d, 1, mine ? 1 : 0, true); W.plate(d, mine ? fmtId(m.id) : ''); }
  }
  const hidden = was.layout === 'off' || !was.shot || !was.zone;
  const through = !hidden && app.motion() && was.zone === 'alley' && isIn;
  if (through) { await W.need(['alley', 'passage', 'atrium']); if (!ok()) return null; }
  W.show(through ? ['alley', ...INSIDE] : isIn ? INSIDE : ['alley']);
  if (isIn) for (const z of INSIDE) W.load(z).catch(() => {});       // the other rooms arrive behind the haze
  setLayout(layout, theme);
  const pose = shots.pose(shot, arg, layout);
  state.shot = shot; state.arg = arg; state.zone = zone;
  if (hidden || !app.motion() || (was.zone === 'alley') !== (zone === 'alley') && !through) { W.halt(); await W.fly(pose, { dur: 0 }); return {}; }
  let o = {}, d = dur ?? 1.2;
  if (through) {
    // a returning member: the door they were admitted by opens, and the passage carries them in
    const D = W.doors[doorSide()]; app.sfx('lock');
    app.tween(1.5, (k) => { if (D) D.open = k; }, ease.io).then(() => {});
    o = { via: shots.through(doorSide()), look: 0.55 }; d = 5.4;
  } else if (was.zone !== zone) { o = shots.via(was.zone, zone); d = Math.min(5.0, Math.max(1.6, 0.9 + shots.length(W.cam.p, o.via, pose.p) / 44)); }
  const flight = W.fly(pose, { dur: d, ...o });
  if (through) flight.then(() => { const D = W.doors[doorSide()]; if (D) D.open = 0; if (state.zone !== 'alley') W.show(INSIDE); });
  // the page may arrive while the camera is still settling
  // (on a phone the page is most of the screen, so it does not wait as long for the picture above it)
  await Promise.race([flight, app.wait(through ? d - 0.7 : app.narrow() ? Math.min(d * 0.45, 1.3) : Math.min(d * 0.62, 2.6))]);
  return ok() ? {} : null;
};
/** View that fits a rectangle [[x0,y0],[x1,y1]] of the frame into a share of the window (stills only). */
app.fit = (S, rect, share = 0.8, dy = 0) => {
  const w = Math.abs(rect[1][0] - rect[0][0]), h = Math.abs(rect[1][1] - rect[0][1]);
  const zoom = Math.min(share * S.span[0] / w, share * S.span[1] / h);
  return { cx: (rect[0][0] + rect[1][0]) / 2, cy: (rect[0][1] + rect[1][1]) / 2 + dy / zoom, zoom };
};
/** The screen box {x, y, w, h} of a named thing in the picture (a door, a niche, a mark), or null. */
app.box = (name) => {
  if (W) return W.box(name);
  const F = stage.A; if (!F) return null;
  const alias = { slitL: 'openL', slitR: 'openR' }, k = alias[name] || name, r = F.info.rects && F.info.rects[k], m = F.info.marks && F.info.marks[k];
  if (r) { const a = stage.toScreen(r[0][0], r[0][1]), b = stage.toScreen(r[1][0], r[1][1]); return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]) }; }
  if (m) { const q = stage.toScreen(m[0], m[1]); return { x: q[0], y: q[1], w: 0, h: 0 }; }
  return null;
};
/** Place an element of #marks over a named thing; inset trims the box by a share of its size. */
app.place = (el, name, inset = 0) => {
  const b = app.box(name); if (!el) return; el.style.visibility = b ? '' : 'hidden'; if (!b) return;
  if (!b.w && !b.h) { el.style.left = b.x.toFixed(1) + 'px'; el.style.top = b.y.toFixed(1) + 'px'; return; }
  const ix = b.w * inset, iy = b.h * inset;
  el.style.transform = `translate(${(b.x + ix).toFixed(1)}px, ${(b.y + iy).toFixed(1)}px)`; el.style.width = (b.w - 2 * ix).toFixed(1) + 'px'; el.style.height = (b.h - 2 * iy).toFixed(1) + 'px';
};

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
  cur = null; marks.innerHTML = ''; document.body.classList.remove('keeper-on', 'film');
  if (W) Object.assign(W.lamps, { lampL: 1, lampR: 1, tube: 1 }); $('#proto').open = false;
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
  // the name of the section, and from a page inside it the way back up to it
  const cr = $('#crumb'), up = cur.crumb && (args.length || name === 'record') ? '#/' + ({ record: 'formulary' }[name] || name) : null;
  cr.textContent = (up ? '← ' : '') + (cur.crumb || ''); if (up) cr.href = up; else cr.removeAttribute('href');
  const tab = { atrium: 'atrium', compass: 'compass', formulary: 'formulary', record: 'formulary', archive: 'archive' }[name] || 'more';
  $$('#thumb [data-k]').forEach((a) => { if (a.dataset.k === tab) a.setAttribute('aria-current', a.dataset.k === 'more' ? 'true' : 'page'); else a.removeAttribute('aria-current'); });
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
    ['#/compass', 'Compass', 'Find your way'],
    ['#/compass/index', 'Reading index', m.compass && m.compass.done ? 'Arranged for you' : 'Optional'],
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
$('#index-proto').addEventListener('click', () => { $('#index').close(); $('#proto').open = true; });
$('#snd').addEventListener('click', () => app.setSound(!store.prefs.sound));
addEventListener('keydown', (e) => {
  if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && store.member()) { e.preventDefault(); openIndex(); $('#q').focus(); }
});

// ------------------------------------------------------------------ prototype controls (scaffold, clearly not product)
function renderProto() {
  const el = $('#proto-in'); const m = store.member(), inv = store.invitation(), a = store.application();
  const h = ['<p>Everything behind this page is simulated in this browser. Nothing is sent anywhere.</p>'];
  if (inv) {
    h.push(`<p>Invitation <b>${fmtCode(inv.code)}</b> · state <b>${inv.state}</b></p><p>The site no longer shows the invitation: the card is in the visitor's hand. The seal on this one's card is <b>${DESC[inv.symbol]}</b>.</p>`);
    if (store.lock()) h.push('<button data-p="unlock">Clear the 24 hour door restriction</button>');
    if (a && a.status === 'review') h.push('<button data-p="approve">Review: approve this application</button><button data-p="decline">Review: decline this application</button>');
    h.push('<button data-p="leave">Put this invitation down</button>');
  } else if (!m) {
    h.push('<p>Sample invitations. There are no cards for these, so the seal each card would carry is named here:</p>' + DEMO_CODES.map((c) => `<button data-p="code" data-c="${c}">${fmtCode(c)} · ${DESC[DEMO_SEALS[c]]}</button>`).join(''));
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
    if (W) {
      W.motion = mo; W.par[0] += (tx - W.par[0]) * k; W.par[1] += (ty - W.par[1]) * k;
      if (keeper && document.body.classList.contains('keeper-on')) { keeper.draw(mo ? t : 2, mo ? dt : 0.016); W.keeperDirty(); }
      W.draw(t, dt);
      if (cur && cur.after) cur.after(t, dt, mo);
    } else {
      stage.par[0] += (tx - stage.par[0]) * k; stage.par[1] += (ty - stage.par[1]) * k;
      stage.draw(0);
    }
  }
  requestAnimationFrame(frame);
}
addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') app.pointer = [(e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2]; });
addEventListener('resize', () => {
  if (W) { W.resize(); if (state.shot && !W.flying()) { const p = shots.pose(state.shot, state.arg, state.layout); Object.assign(W.rect, p.rect); W.shift = p.shift; W.cam.fov = p.fov; W.cam.p.copy(p.p); W.cam.t.copy(p.t); } } else stage.resize();
  if (cur && cur.resize) cur.resize();
});
addEventListener('hashchange', route);
$('#proto').addEventListener('toggle', renderProto);

setLayout('full', 'outside');
if (W) { W.resize(); Object.assign(W.rect, shots.rect('full')); } else { stage.resize(); stage.fadeAmt = 0; }
$('#snd').textContent = 'Sound off'; store.setPref('sound', false);   // sound never starts by itself
requestAnimationFrame(frame);
route();
window.pr6 = { app, store, W, get cur() { return cur; } };   // for the prototype's own tests

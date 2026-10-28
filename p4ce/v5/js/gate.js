/* P4CE v5 · The Door (mechanic from v2/door.html, rebuilt). Guests see only this.
   You knock; footsteps; a slot opens; eyes look back; the key ritual appears under the slot.
   Gate art: path-traced renders in assets/gate/ (spec in BRIEF.md), read from assets/gate/manifest.json.
   Until that folder exists, a plain dark placeholder door (#gPh, CSS) stands in, with the same slot and the same open move. */
import {$, $$, Q, RM, store, isPhone, tween, E, clamp, wait, CLOCK} from './util.js';

const GBASE = 'assets/gate/';
const CODE = '0047RSRV';
const g = {
  el: $('#gate'), art: $('#gArt'), ph: $('#gPh'), img: $('#gImg'), seq: $('#gSeq'), slot: $('#gSlot'), eyes: $('#gEyes'), knock: $('#gKnock'),
  sub: $('#gSub'), hint: $('#gHint'), form: $('#gForm'), code: $('#gCode'), mem: $('#gMemForm'), tapUI: $('#gTapUI'),
  state: 'closed', knocks: 0, opens: 0, lines: 0, art0: null, ori: null, frames: [], imgs: [], lightHex: null, onEnter: null, T: new Set(), live: false
};
const later = (ms, f) => { const id = setTimeout(() => { g.T.delete(id); f(); }, RM ? Math.min(ms, 300) : ms); g.T.add(id); return id; };
const clearLater = () => { g.T.forEach(clearTimeout); g.T.clear(); };
function sub(t, ms = 2600) { g.sub.textContent = t; g.sub.classList.add('on'); clearTimeout(g.subT); if (ms) g.subT = setTimeout(() => g.sub.classList.remove('on'), ms); }

/* ------------------------------------------------------------ the art: read the manifest, tolerate its shape */
function parseRect(r) {
  if (!r || typeof r !== 'object') return null;
  if (Array.isArray(r)) return r.length === 4 ? (r[2] > r[0] && r[3] > r[1] && (r[2] > .5 || r[3] > .5) && r[2] <= 1 && (r[2] - r[0] < .9) ? {x: r[0], y: r[1], w: r[2] - r[0], h: r[3] - r[1]} : {x: r[0], y: r[1], w: r[2], h: r[3]}) : null;
  if ('w' in r || 'width' in r) return {x: r.x ?? r.left, y: r.y ?? r.top, w: r.w ?? r.width, h: r.h ?? r.height};
  if ('x0' in r) return {x: r.x0, y: r.y0, w: r.x1 - r.x0, h: r.y1 - r.y0};
  if ('left' in r && 'right' in r) return {x: r.left, y: r.top, w: r.right - r.left, h: r.bottom - r.top};
  return null;
}
function parseOri(m, k) {
  const o = m[k] || (m.orientations && m.orientations[k]) || (m.views && m.views[k]) || null; if (!o) return null;
  const files = o.files || o;
  const pick = (name) => { const v = files[name] || o[name]; if (typeof v === 'string') return v; if (Array.isArray(files)) return files.find(f => typeof f === 'string' && new RegExp('(^|/)' + name + '\\.').test(f)); return null; };
  let open = files.open || o.open || o.frames_list || null;
  if (!Array.isArray(open)) {
    const n = (typeof o.frames === 'number' ? o.frames : null) || (typeof m.frames === 'number' ? m.frames : null) || (m.frameCount) || (o.frameCount) || (Array.isArray(files) ? files.filter(f => /open\/f_\d+/.test(f)).length : 0);
    open = n ? Array.from({length: n}, (_, i) => k + '/open/f_' + String(i).padStart(3, '0') + '.webp') : [];
    if (Array.isArray(files)) { const l = files.filter(f => typeof f === 'string' && /open\//.test(f)).sort(); if (l.length) open = l; }
  }
  const fix = p => !p ? null : /^(https?:|\/|\.\.?\/)/.test(p) ? p : (p.startsWith(k + '/') ? p : (p.includes('/') ? p : k + '/' + p));
  return {closed: fix(pick('closed') || k + '/closed.webp'), slot: fix(pick('slot') || k + '/slot.webp'), open: open.map(fix), rect: parseRect(o.slotRect || o.slot_rect || o.rect || (o.slot && typeof o.slot === 'object' ? o.slot : null) || (m.slot && typeof m.slot === 'object' ? m.slot[k] : null) || (m.slotRect && m.slotRect[k])),
    size: o.size || (k === 'land' ? [1600, 1067] : [900, 1600]), light: o.lightHex || o.light || null};
}
async function loadArt() {
  let m = null;
  try { const r = await fetch(GBASE + 'manifest.json', {cache: 'no-cache'}); if (r.ok) m = await r.json(); } catch (e) {}
  if (!m) return null;
  const land = parseOri(m, 'land'), port = parseOri(m, 'port');
  if (!land && !port) return null;
  const v = m.v || m.version ? '?v=' + (m.v || m.version) : '';
  return {land: land || port, port: port || land, light: m.lightHex || m.light || (land && land.light) || null, eyes: m.eyes || 'eyes.webp', v};
}
const im = src => new Promise(res => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

/* ------------------------------------------------------------ layout: cover-fit the art, place the slot and the ritual under it */
function cover(iw, ih) { const vw = innerWidth, vh = innerHeight, s = Math.max(vw / iw, vh / ih); return {s, ox: (vw - iw * s) / 2, oy: (vh - ih * s) / 2}; }
function slotPx() {
  if (g.art0) {
    const o = g.ori, [iw, ih] = o.dims || o.size, c = cover(iw, ih), r = o.rect || {x: .44, y: .44, w: .12, h: .025};
    return {x: c.ox + r.x * iw * c.s, y: c.oy + r.y * ih * c.s, w: r.w * iw * c.s, h: r.h * ih * c.s};
  }
  const d = $('.g-door', g.ph).getBoundingClientRect();
  return {x: d.left + d.width * .28, y: d.top + d.height * .36, w: d.width * .44, h: Math.max(14, d.height * .05)};
}
function layout() {
  if (g.art0) { const want = innerWidth / innerHeight < 1 ? 'port' : 'land'; if (g.ori !== g.art0[want]) { g.ori = g.art0[want]; if (g.live) showStill(g.state === 'closed' ? 'closed' : 'slot', true); } }
  const r = slotPx();
  Object.assign(g.slot.style, {left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px'});
  const fw = Math.min(isPhone() ? innerWidth - 48 : 300, Math.max(240, r.w * 1.25));
  g.el.style.setProperty('--fx', (r.x + r.w / 2) + 'px'); g.el.style.setProperty('--fy', (r.y + r.h + (isPhone() ? 26 : 34)) + 'px'); g.el.style.setProperty('--fw', fw + 'px');
  g.el.style.setProperty('--sy', (r.y - 46) + 'px');
  const k = g.knock; const d = g.art0 ? {left: r.x - r.w * .2, top: r.y - r.h * 14, width: r.w * 1.4, height: r.h * 40} : $('.g-door', g.ph).getBoundingClientRect();
  Object.assign(k.style, {left: d.left + 'px', top: d.top + 'px', width: d.width + 'px', height: d.height + 'px'});
}
async function showStill(which, instant) {
  if (!g.art0) { g.el.classList.toggle('slot-open', which === 'slot'); return; }
  const src = GBASE + g.ori[which] + g.art0.v, i = await im(src); if (!i) return;
  g.ori.dims = [i.naturalWidth, i.naturalHeight];
  if (instant || RM) { g.img.src = src; layout(); return; }
  /* the slot is a mechanical part: a short cross-dissolve between two renders of the same camera */
  const ghost = g.img.cloneNode(); ghost.classList.add('g-ghost'); g.img.after(ghost); g.img.src = src; layout();
  ghost.animate([{opacity: 1}, {opacity: 0}], {duration: which === 'slot' ? 240 : 140, easing: 'ease-out'}).finished.then(() => ghost.remove(), () => ghost.remove());
}

/* ------------------------------------------------------------ the eyes: look, blink, follow the pointer a little */
const eyes = {on: 0, x: 0, y: 0, tx: 0, ty: 0, blink: 0, next: 0};
function eyesTo(on) { g.slot.classList.toggle('eyes', !!on); eyes.on = on; }
function eyesFrame(now) {
  if (!g.live) return;
  if (eyes.on && now > eyes.next) { eyes.next = now + 1800 + Math.random() * 3800; g.slot.classList.add('blink'); setTimeout(() => g.slot.classList.remove('blink'), 140); }
  eyes.x += (eyes.tx - eyes.x) * .08; eyes.y += (eyes.ty - eyes.y) * .08;
  g.slot.style.setProperty('--ex', (eyes.x * 6).toFixed(2) + 'px'); g.slot.style.setProperty('--ey', (eyes.y * 2).toFixed(2) + 'px');
}
addEventListener('pointermove', e => { const r = g.slot.getBoundingClientRect(); eyes.tx = clamp((e.clientX - (r.left + r.width / 2)) / innerWidth * 2, -1, 1); eyes.ty = clamp((e.clientY - (r.top + r.height / 2)) / innerHeight * 2, -1, 1); }, {passive: true});

/* ------------------------------------------------------------ the mechanic */
function knock() {
  if (g.state === 'entering') return;
  g.hint.classList.remove('on'); g.knocks++;
  g.art.animate(RM ? [{opacity: 1}, {opacity: .96}, {opacity: 1}] : [{transform: 'translate(0,0)'}, {transform: 'translate(1.5px,0)'}, {transform: 'translate(-1px,0)'}, {transform: 'translate(0,0)'}], {duration: 220, easing: 'ease-out'});
  if (g.state === 'closed') {
    clearLater();
    if (g.opens === 0 && g.knocks === 1) { later(500, () => sub('Footsteps.', 1600)); later(2000, openSlot); }
    else later(600, openSlot);
    g.state = 'waiting';
  } else if (g.state === 'open') {
    const L = ["We heard.", "Still closed.", "Knocking harder does not make it more open."];
    sub(L[Math.min(L.length - 1, g.lines++)]);
  }
}
function openSlot() {
  if (g.state === 'entering') return;
  g.state = 'open'; g.opens++; g.lines = 0;
  showStill('slot'); g.el.classList.add('slot-open');
  later(260, () => eyesTo(1));
  later(700, () => sub(g.opens > 1 ? "We're still closed." : "We're closed.", 2400));
  later(2600, showRitual);
  preloadOpen();
}
function showRitual() {
  if (g.state !== 'open') return;
  g.mem.hidden = true; g.form.hidden = false; g.el.classList.add('ritual');
  requestAnimationFrame(() => g.form.classList.add('on'));
  if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => g.code.focus({preventScroll: true}), 60);
}
function hideRitual() { [g.form, g.mem].forEach(f => { f.classList.remove('on'); setTimeout(() => { if (!f.classList.contains('on')) f.hidden = true; }, 260); }); g.el.classList.remove('ritual'); }
/* a wrong code: the slot shuts. No message, no shake. */
function shut() {
  clearLater(); hideRitual(); eyesTo(0); g.state = 'closed';
  later(180, () => { g.el.classList.remove('slot-open'); showStill('closed'); });
  g.code.value = '';
  later(400, () => g.knock.focus({preventScroll: true}));
}
function success(line) {
  if (g.state === 'entering') return;
  clearLater(); g.state = 'entering'; g.el.classList.add('going'); hideRitual(); g.tapUI.hidden = true;
  store.put('p4ce.v5.member', '1');
  sub(line || 'Come in.', 0);
  later(500, () => eyesTo(0));
  later(900, () => { g.el.classList.remove('slot-open'); showStill('closed'); });
  later(1500, openDoor);
}
/* ------------------------------------------------------------ the door opens inward onto light; the camera goes through */
async function preloadOpen() {
  if (!g.art0 || g.imgs.length) return;
  const list = g.ori.open; g.imgs = new Array(list.length);
  await Promise.all(list.map((f, i) => im(GBASE + f + g.art0.v).then(x => { g.imgs[i] = x; })));
}
async function openDoor() {
  g.sub.classList.remove('on');
  const light = g.lightHex;
  if (g.art0 && g.ori.open.length) {
    await preloadOpen();
    const cv = g.seq, c = cv.getContext('2d'), n = g.imgs.length, dur = RM ? 0 : Math.max(1800, n * 42);
    cv.width = innerWidth * Math.min(1.5, devicePixelRatio || 1); cv.height = innerHeight * Math.min(1.5, devicePixelRatio || 1); cv.classList.add('on');
    const draw = i => { const x = g.imgs[clamp(Math.round(i), 0, n - 1)]; if (!x) return; const s = Math.max(cv.width / x.naturalWidth, cv.height / x.naturalHeight); c.drawImage(x, (cv.width - x.naturalWidth * s) / 2, (cv.height - x.naturalHeight * s) / 2, x.naturalWidth * s, x.naturalHeight * s); };
    let handed = false;
    await tween(dur, (e, k) => { draw(e * (n - 1)); if (!handed && k > .72) { handed = true; g.onEnter && g.onEnter.prepare(light); } }, E.io);
    if (!handed) g.onEnter && g.onEnter.prepare(light);
  } else {
    /* placeholder: the door swings in, the camera dollies through the doorway into the light */
    g.el.classList.add('opening');
    let handed = false;
    await tween(RM ? 0 : 2600, (e, k) => {
      const sw = E.out(clamp(k / .45)), dolly = E.io(clamp((k - .18) / .82));
      g.ph.style.setProperty('--swing', (sw * 78).toFixed(2) + 'deg'); g.ph.style.setProperty('--dolly', (1 + Math.pow(dolly, 2.2) * 9).toFixed(3));
      g.ph.style.setProperty('--glow', sw.toFixed(3));
      if (!handed && k > .7) { handed = true; g.onEnter && g.onEnter.prepare(light); }
    }, E.lin);
    if (!handed) g.onEnter && g.onEnter.prepare(light);
  }
  /* the last frame is the light; the Atlas resolves out of it */
  g.onEnter && g.onEnter.go(light);
  g.el.animate([{opacity: 1}, {opacity: 0}], {duration: RM ? 200 : 520, easing: 'ease-out', fill: 'forwards'}).finished.then(() => { g.live = false; g.el.hidden = true; }, () => {});
}

/* ------------------------------------------------------------ forms and keys */
g.knock.addEventListener('click', knock);
addEventListener('keydown', e => { if (!g.live || g.state === 'entering') return; if ((e.key === 'k' || e.key === 'K') && !/INPUT/.test(document.activeElement.tagName)) knock(); });
g.form.addEventListener('submit', e => {
  e.preventDefault(); const v = g.code.value.replace(/\s+/g, '').toUpperCase();
  if (!v) { g.code.focus(); return; }
  if (v === CODE) success('Come in.'); else shut();
});
$('#gMem').addEventListener('click', () => { g.form.classList.remove('on'); g.form.hidden = true; g.mem.hidden = false; requestAnimationFrame(() => g.mem.classList.add('on')); $('#gEmail').focus({preventScroll: true}); });
$('#gBack').addEventListener('click', () => { g.mem.classList.remove('on'); g.mem.hidden = true; showRitual(); });
g.mem.addEventListener('submit', e => {
  e.preventDefault(); const em = $('#gEmail'), pw = $('#gPass');
  [em, pw].forEach(i => i.removeAttribute('aria-invalid'));
  if (!em.value.trim()) { em.setAttribute('aria-invalid', 'true'); em.focus(); return; }
  if (!pw.value) { pw.setAttribute('aria-invalid', 'true'); pw.focus(); return; }
  success('Welcome back.');
});
/* "Tap your key": the card's NFC chip opens ?key=0047RSRV. Here the tap is simulated in place. */
$('#gTap').addEventListener('click', () => { hideRitual(); g.tapUI.hidden = false; g.tapUI.classList.add('on'); later(1500, () => { g.tapUI.classList.remove('on'); success('Come in.'); }); });

/* ------------------------------------------------------------ boot */
export const Gate = {
  async init(onEnter, o = {}) {
    g.onEnter = onEnter;
    const art = await loadArt();
    if (art) { g.art0 = art; g.ori = innerWidth / innerHeight < 1 ? art.port : art.land; g.lightHex = art.light; if (art.eyes) g.eyes.src = GBASE + art.eyes + art.v; g.el.classList.add('has-art'); await showStill('closed', true); }
    return {art: !!art, light: g.lightHex};
  },
  show(o = {}) {
    clearLater(); g.live = true; g.state = 'closed'; g.knocks = 0; g.opens = 0; g.imgs = g.imgs || [];
    g.el.hidden = false; g.el.getAnimations().forEach(a => a.cancel()); g.el.style.opacity = '';
    g.el.classList.remove('slot-open', 'ritual', 'opening', 'going'); g.ph.style.removeProperty('--swing'); g.ph.style.removeProperty('--dolly'); g.ph.style.removeProperty('--glow'); g.seq.classList.remove('on');
    g.form.hidden = g.mem.hidden = true; g.form.classList.remove('on'); g.mem.classList.remove('on'); g.code.value = ''; eyesTo(0);
    if (g.art0) showStill('closed', true);
    layout();
    if (o.key) { later(700, () => { sub('Key accepted.', 0); }); later(1500, () => success('Come in.')); }
    else later(2600, () => { if (g.state === 'closed') g.hint.classList.add('on'); });
    setTimeout(() => g.knock.focus({preventScroll: true}), 50);
  },
  frame: eyesFrame,
  get live() { return g.live; },
  state: () => ({state: g.state, art: !!g.art0, light: g.lightHex, knocks: g.knocks, opens: g.opens}),
  /* test hooks */
  knock, openSlot, success, shut, layout
};
addEventListener('resize', () => { if (g.live) layout(); });

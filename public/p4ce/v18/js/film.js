// PR6 / Institute: the film (A09). One object, nine leaps.
// The member's door opens on darkness. In it one stone stands on a stand. Nine times it becomes the next thing
// people learned to make, in one snap each, and each leap comes sooner than the last and lets a little more light
// into the room. The tenth thing is a PR6 vial; the light comes up, and the camera draws back from it to find it
// standing in the Formulary. Nothing fades into anything: the outline and the material jump together (js/leap.js),
// and the only cut is made in the dark behind the door.
// Everything is a function of one clock, so the film can be paused, stepped or hurried, and every leap is captioned.
// In Direct mode the same nine are a page.
import { store } from './store.js';
import { $, esc, clamp, lerp } from './ui.js';
import { INSIDE } from './shots.js';
import { eraGlyph } from './eras.js';
import { FORMS } from './leap.js';

// the nine eras (their emblems are in js/eras.js), and what the object is in each
export const CHAPTERS = [
  { id: 'tools', t: 'Tools', l: 'A stone, chosen for the hand.', w: 'About 2.6 million years ago' },
  { id: 'fire', t: 'Fire', l: 'Clay, hardened in a fire.', w: 'About 1 million years ago' },
  { id: 'agriculture', t: 'Agriculture', l: 'A jar, to keep a harvest.', w: 'About 11,500 years ago' },
  { id: 'mathematics', t: 'Mathematics', l: 'Bronze, cast to a measure.', w: 'About 3,800 years ago' },
  { id: 'medicine', t: 'Medicine', l: 'Glass, to see what is inside.', w: 'About 2,400 years ago' },
  { id: 'engineering', t: 'Engineering', l: 'Steel, turned true.', w: 'About 1,900 years ago' },
  { id: 'flight', t: 'Flight', l: 'Aluminium, made light enough.', w: '1903' },
  { id: 'computation', t: 'Computation', l: 'Silicon, grown as one crystal.', w: '1945' },
  { id: 'space', t: 'Space', l: 'Titanium, sealed for the vacuum.', w: '1969' },
];
const N = 9, IN = 2.6, D = 0.46, HOLD = [4.4, 3.6, 3.2, 2.9, 2.6, 2.3, 2.0, 1.8, 1.7], VIAL = 4.4, BACK = 4.8, REST = 1.4;
const S = [IN]; for (const h of HOLD) S.push(S[S.length - 1] + h);            // when each thing arrives: S[0] the stone, S[9] the vial
const PB = S[N] + VIAL, TOTAL = PB + BACK + REST;
// how much of the room's own light is up for each thing, the light on the thing itself, and the pool of light round it
const ROOM = [0.012, 0.017, 0.025, 0.036, 0.052, 0.074, 0.1, 0.135, 0.18, 1];
const LIGHT = [0.95, 0.8, 0.76, 0.8, 0.86, 0.9, 0.95, 1, 1, 1];
const POOL = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 0], POOLW = [0.22, 0.32, 0.45, 0.62, 0.85, 1.15, 1.5, 1.9, 2.4, 6];
const ELEV = [0.14, 0.44, 0.1, 0.3, 0.07, 0.16, 0.08, 0.05, 0.1, 0.04];
const NIGHT = [0.012, 0.018, 0.03], DAY = [1.1, 1.25, 1.4], GROUPS = ['wall', 'lining', 'fit', 'pads', 'floor', 'shell'];
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = (k) => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);      // arrives past the mark and settles
const pulse = (x, w) => (x <= 0 ? 0 : (x / w) * Math.exp(1 - x / w));                  // up fast, down slower; 1 at x = w

export async function passage(app, args) {
  const m = store.member(), ok = app.live(), view = app.view, again = args[0] === 'again', W = app.world;
  const exit = again ? '#/archive' : '#/formulary';
  if (!W || !app.motion()) {
    await app.scene({ layout: 'off', theme: 'outside' }); if (!ok()) return null;
    app.amb('none');
    const end = () => { m.filmSeen = true; store.save(); app.go(exit); };
    view.innerHTML = `<div class="film-still"><h1 class="title serif">One object, nine leaps.</h1>
      <p class="actions" style="margin-top:18px"><button class="link" type="button" data-end>${again ? 'Back to your Archive' : 'Skip to the Formulary'}</button></p>
      <ol>${CHAPTERS.map((c) => `<li>${eraGlyph(c.id)}<span><b>${c.t}</b>${esc(c.l)}<small>${esc(c.w)}</small></span></li>`).join('')}</ol>
      <p class="lead serif" style="margin-top:28px">None of it was one person. All of it was people. What comes next is kept in the Formulary.</p>
      <div class="actions"><button class="btn" type="button" id="enter">${again ? 'Back to your Archive' : 'Enter the Formulary'}</button></div></div>`;
    $('#enter', view).addEventListener('click', end); $('[data-end]', view).addEventListener('click', end);
    return { title: 'The film' };
  }
  // the film starts where the member last stood: in front of their own door
  const side = app.doorSide(), other = side === 'L' ? 'R' : 'L';
  if (!store.invitation()) W.setDoors({ [side]: m.lineage, [other]: m.lineage === 'shen' ? 'ouroboros' : 'shen' });
  document.body.classList.add('film'); app.chrome();
  view.innerHTML = `<div id="film"><h1 class="sr">The film: one object stands on a stand and becomes, nine times, the next thing people learned to make. The tenth is a PR6 vial in the Formulary. You can pause it or skip it.</h1>
    <div class="film-cap snap swap" aria-live="polite"><h2 id="fc-t"></h2><p id="fc-l"></p></div>
    <div class="film-rule" aria-hidden="true">${CHAPTERS.map(() => '<i></i>').join('')}<span id="fc-n"></span></div>
    <div class="film-ctl"><button class="btn ghost" type="button" id="pause" aria-pressed="false">Pause</button><button class="btn ghost" type="button" id="skip">${again ? 'Close' : 'Skip the film'}</button></div></div>`;
  const loaded = W.need(['alley', 'formulary']);
  await app.scene({ layout: 'full', theme: 'outside', shot: 'door', arg: side, dur: 1.5 }); if (!ok()) return null;
  await loaded; if (!ok()) return null;
  while (W.flying()) { await app.wait(0.05); if (!ok()) return null; }
  W.load('atrium').catch(() => {});                 // the rest of the Institute arrives while the film plays
  W.halt();
  const Sh = app.shots, A = Sh.pose('door', side, 'full'), n = app.narrow(), L = W.leap, VI = W.vials;
  const FA = W.zones.formulary.man.anchors, RING = FA.dims.ring, O = [FA.n5.vial[0], FA.n5.vial[1] - RING, FA.n5.vial[2] + 0.004];      // where the object stands (Formulary frame)
  const V = (p, out) => W.pt('formulary', p, out);
  const Dr = W.doors[side], sill = W.pt('alley', [side === 'R' ? 1.08 : -1.08, 7.05, 1.62]);
  const lens = n ? 34 : 50, fov = 2 * Math.atan(18 / lens) * 180 / Math.PI, FRAME = n ? [0, -0.11] : [0.13, 0.01];
  const P3 = A.p.clone(), T3 = A.t.clone(), lp = A.p.clone();
  let time = 0, rate = 1, want = 1, paused = false, seek = null, shown = -9, done = false, capT = 0, phase = '', lastStage = -1, pushed = false;
  const capEl = $('.film-cap', view), ticks = [...view.querySelectorAll('.film-rule i')];
  const caption = (i) => {
    const t = i < 0 ? '' : i < N ? CHAPTERS[i].t : i === N ? '' : 'The Formulary';
    const l = i < 0 ? '' : i < N ? CHAPTERS[i].l : i === N ? 'None of it was one person. All of it was people.' : 'What comes next is kept here.';
    capEl.classList.add('swap'); clearTimeout(capT);
    capT = setTimeout(() => { $('#fc-t', view).textContent = t; $('#fc-l', view).textContent = l; if (t || l) capEl.classList.remove('swap'); }, i > 0 && i <= N ? 130 : 380);
    ticks.forEach((el, j) => { el.className = j < i ? 'on' : j === i ? 'now' : ''; });
    $('#fc-n', view).textContent = i < 0 || i >= N ? '' : `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')} · ${CHAPTERS[i].w}`;
  };
  const stageAt = (t) => { let i = 0; while (i < N && t >= S[i + 1]) i++; return i; };
  let room = 0;
  W.emitK = (zn, name) => (zn !== 'formulary' ? 1 : /^side5/.test(name) ? Math.max(room, lerp(0.1, 0.55, clamp((time - IN) / (S[N] - IN))) * smooth(IN, IN + 1.8, time)) : room);
  const set = (t) => {
    // ---- the door: it opens, and the camera goes into the dark behind it
    if (t < IN) {
      if (phase !== 'door') { phase = 'door'; W.show(['alley']); L.mesh.visible = false; VI.show(true); VI.blob(5, 0, 0); W.light(0, null); for (const g of GROUPS) W.gain('formulary', g, 1); room = 1; }
      const k = smooth(0.5, IN, t);
      W.cam.p.lerpVectors(A.p, sill, k * k); W.cam.t.copy(A.t); W.cam.fov = A.fov;
      W.shift[0] = A.shift[0]; W.shift[1] = A.shift[1]; W.sway = lerp(1, 0.2, k);
      W.expo = A.expo * (1 - smooth(1.2, IN - 0.15, t)); { const kn = smooth(0, 0.9, t); for (let q = 0; q < 3; q++) W.fog[q] = lerp(A.fog[q], 0, kn * kn); } W.fog[3] = A.fog[3];      // nothing stands behind this door yet: it opens on the dark
      W.vig = A.vig; W.grain = A.grain; W.con = 0; W.rain = A.rain * (1 - k);
      if (Dr) Dr.open = io(clamp((t - 0.2) / 1.9));
      if (shown !== -1) { shown = -1; caption(-1); }
      return;
    }
    if (phase !== 'case') { phase = 'case'; W.show(['formulary']); W.setNiche(0); if (Dr) Dr.open = 0; }
    // ---- which thing stands there, and how far the leap into it has gone
    const i = stageAt(t), tau = t - S[i], k = i ? clamp(tau / D) : 1, a = Math.max(0, i - 1);
    const e = !i || k >= 1 ? 1 : i === N ? 1 - Math.pow(1 - k, 3) : backOut(k), ks = k * k * (3 - 2 * k);
    L.set(a, i, e, k);
    const isVial = i === N && tau >= D * 0.6;
    L.mesh.visible = !isVial; VI.show(isVial);
    const fa = FORMS[a], fb = FORMS[i], foot = lerp(fa.foot, fb.foot, ks), h = lerp(fa.h, fb.h, ks);
    VI.blob(5, RING, isVial ? 0 : foot * 1.25);
    // ---- light: every leap lets more of the room's own light in, and lands in a flash of it
    const up = smooth(IN, IN + 2.0, t), fl = i ? pulse(tau, 0.075) : 0, big = i === N ? pulse(tau - D * 0.35, 0.16) : 0;
    room = lerp(ROOM[a], ROOM[i], i === N ? smooth(0.3, 1, k) : ks) * up;
    for (const g of GROUPS) W.gain('formulary', g, room);
    L.u.uLight.value = lerp(LIGHT[a], LIGHT[i], ks) * up * (1 + 0.9 * fl);
    const pw = lerp(POOL[a], POOL[i], ks) * up * (1 + 2.2 * fl), warm = lerp(fa.mat.glow, fb.mat.glow, ks) * 0.35;
    W.light(0, V([O[0] + 0.12, O[1] - 0.2, O[2] + h + 0.85], lp), [pw * (0.86 + warm), pw * 0.93, pw * (1.04 - warm)], lerp(POOLW[a], POOLW[i], ks));
    // ---- the camera: close, drifting slowly round, pushed in by every leap; at the end it draws back to the wall
    const asp = innerWidth / Math.max(1, innerHeight), tf = Math.tan(fov * Math.PI / 360), tv = asp >= 1 ? tf / asp : tf, th = asp >= 1 ? tf : tf * asp;
    const hE = 0.42 + 0.58 * h, wE = 2 * lerp(fa.r, fb.r, ks), prog = clamp((t - IN) / (PB - IN));
    const dist = Math.max(hE / ((n ? 0.44 : 0.68) * 2 * tv), wE / ((n ? 0.62 : 0.4) * 2 * th)) * lerp(0.95, 1.1, prog) * (1 - 0.07 * pulse(tau, 0.09) * (i ? 1 : 0));
    const az = lerp(0.3, -0.18, prog), el = lerp(ELEV[a], ELEV[i], ks), tz = O[2] + h * 0.5;
    V([O[0] + dist * Math.sin(az) * Math.cos(el), O[1] - dist * Math.cos(az) * Math.cos(el), tz + dist * Math.sin(el)], P3); V([O[0], O[1], tz], T3);
    const kb = t < PB ? 0 : io(clamp((t - PB) / BACK));
    let ex = lerp(0.9, 0.6, smooth(0.02, 0.8, room)) * (1 + 0.55 * fl + 1.5 * big);
    if (kb > 0) { const Z = Sh.pose('formulary', null, 'full'); P3.lerp(Z.p, kb); T3.lerp(Z.t, kb); W.cam.fov = lerp(fov, Z.fov, kb); W.shift[0] = lerp(FRAME[0], Z.shift[0], kb); W.shift[1] = lerp(FRAME[1], Z.shift[1], kb); ex = lerp(ex, Z.expo, kb); }
    else { W.cam.fov = fov; W.shift[0] = FRAME[0]; W.shift[1] = FRAME[1]; }
    W.cam.p.copy(P3); W.cam.t.copy(T3); W.sway = lerp(0.2, 1, kb);
    W.expo = ex; const kd = smooth(0.0, 0.9, room); for (let q = 0; q < 3; q++) W.fog[q] = lerp(NIGHT[q], DAY[q], kd); W.fog[3] = 0.001;
    W.vig = lerp(0.85, 0.08, kd); W.grain = lerp(0.04, 0.016, kd); W.con = 0; W.rain = 0;
    // ---- words
    // the last words are said while the wall beside the case is still bare; the wall of cases needs none
    const c = t < IN + 0.9 || t >= PB + 1.3 ? -1 : i === N && tau >= 2.2 ? N + 1 : i;
    if (c !== shown) { shown = c; caption(c); }
    if (i !== lastStage) { if (i > lastStage && lastStage >= 0 && rate < 3 && seek === null) app.sfx('leap', i); lastStage = i; }
    if (t >= PB + 1.5 && !pushed) { pushed = true; VI.push(-Math.PI * 2 / 3); }      // as the wall comes into view, every stand turns its vials to face the room
  };
  const restore = () => { W.emitK = null; for (const g of GROUPS) W.gain('formulary', g, 1); W.light(0, null); L.mesh.visible = false; VI.show(true); VI.blob(5, 0, 0); W.sway = 1; if (Dr) Dr.open = 0; };
  const clean = () => { clearTimeout(capT); removeEventListener('keydown', onKey); document.body.classList.remove('film', 'film-day'); restore(); };
  const finish = () => {
    if (done) return; done = true; restore();
    const Z = Sh.pose('formulary', null, 'full');
    W.cam.p.copy(Z.p); W.cam.t.copy(Z.t); W.cam.fov = Z.fov; W.expo = Z.expo; W.fog.splice(0, 4, ...Z.fog); W.vig = Z.vig; W.grain = Z.grain; W.con = Z.con; W.rain = 0; W.shift = [...Z.shift];
    m.filmSeen = true; store.save();
    app.state.shot = 'formulary'; app.state.arg = null; app.state.zone = 'formulary'; W.show(INSIDE);
    app.go(exit);
  };
  const hurry = () => { want = 14; paused = false; seek = null; const b = $('#skip', view); if (b) b.disabled = true; pauseBtn(); };
  const pauseBtn = () => { const b = $('#pause', view); if (b) { b.textContent = paused ? 'Play' : 'Pause'; b.setAttribute('aria-pressed', paused ? 'true' : 'false'); } };
  $('#pause', view).addEventListener('click', () => { paused = !paused; pauseBtn(); });
  $('#skip', view).addEventListener('click', hurry);
  function onKey(e) {
    if (e.key === 'Escape') hurry();
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const i = time < IN ? -1 : stageAt(time), j = clamp(i + (e.key === 'ArrowRight' ? 1 : time - S[Math.max(0, i)] < 1.2 ? -1 : 0), 0, N); seek = S[j] + (j ? D + 0.05 : 2.1); e.preventDefault(); }
    else if (e.key === ' ' && document.activeElement.tagName !== 'BUTTON') { paused = !paused; pauseBtn(); e.preventDefault(); }
  }
  addEventListener('keydown', onKey);
  app.sfx('lock'); set(0);
  return {
    title: 'The film', noFocus: true,
    tick: (t, dt) => {
      if (done) return;
      if (seek !== null) { const g = seek - time; if (Math.abs(g) < 0.04) { time = seek; seek = null; } else time += Math.sign(g) * Math.min(Math.abs(g), (Math.abs(g) * 3 + 1.5) * 4 * dt); }
      else if (!paused) { rate += (want - rate) * (1 - Math.pow(0.03, dt)); time += dt * rate; }
      if (time > IN && app.state.amb !== 'inside') app.amb('inside');
      if (time >= TOTAL) { finish(); return; }
      set(time);
    },
    at: (t) => { time = t; seek = null; },             // for tests: jump to a time
    now: () => time,
    times: { S, PB, TOTAL, IN, D },
    leave: () => { clean(); if (!done) { app.state.shot = null; W.halt(); } },
  };
}

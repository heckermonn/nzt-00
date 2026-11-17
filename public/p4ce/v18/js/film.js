// PR6 / Institute: the passage (A09). One take, one living thing, nine signs.
// The member's door opens on the dark and a bright drop is waiting behind it. The camera follows it, without a cut,
// down the passage: nine bays, each wider, taller and paler than the last, ending in the Atrium. In each bay the drop
// gathers itself into one sign of something people worked out, holds it, and lets go: each sign larger than the one
// before, and each sooner. In the Atrium it makes one more, the member's own, and goes up into the light. The form is
// the cell of js/cell.js: it truly changes shape, nothing fades. The walk can be paused, stepped or skipped at any
// moment (skipping hurries the same walk, it never cuts), every sign is captioned, and in Direct mode the same nine
// are a page.
import { store } from './store.js';
import { $, esc, clamp, lerp } from './ui.js';
import { BAYS } from './world.js';
import { INSIDE } from './shots.js';
import { eraGlyph } from './eras.js';

export const CHAPTERS = [
  { id: 'tools', t: 'Tools', l: 'A stone, struck until it held an edge.', w: 'About 2.6 million years ago' },
  { id: 'fire', t: 'Fire', l: 'Heat, kept and carried.', w: 'About 1 million years ago' },
  { id: 'agriculture', t: 'Agriculture', l: 'A season, planned for.', w: 'About 11,500 years ago' },
  { id: 'mathematics', t: 'Mathematics', l: 'A proof that stays true.', w: 'About 3,800 years ago' },
  { id: 'medicine', t: 'Medicine', l: 'Care, written down so that it could be repeated.', w: 'About 2,400 years ago' },
  { id: 'engineering', t: 'Engineering', l: 'A span that carries more than its builders.', w: 'About 1,900 years ago' },
  { id: 'flight', t: 'Flight', l: 'The ground, left on purpose.', w: '1903' },
  { id: 'computation', t: 'Computation', l: 'Thought, given to a machine to hold.', w: '1945' },
  { id: 'space', t: 'Space', l: 'A footprint somewhere else.', w: '1969' },
];

// the clock: the door, then nine signs that each come sooner, then the member's own in the Atrium, then the room
const N = CHAPTERS.length, T0 = 2.6, DUR = [4.4, 4.0, 3.7, 3.4, 3.2, 3.0, 2.9, 2.8, 2.8], TAIL = 5.8, REST = 4.4;
const S = [T0]; for (let i = 0; i < N; i++) S.push(S[i] + DUR[i]);
const TOTAL = S[N] + TAIL + REST;
// within one sign's time: it travels to its place (to GO), gathers (FORM0 to FORM1), holds, and lets go (from MELT)
const GO = 0.36, FORM0 = 0.26, FORM1 = 0.5, MELT = 0.88;
const NIGHT = [0.022, 0.034, 0.058], DAY = [1.1, 1.25, 1.4];
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k); return lerp(b, a, h) - k * h * (1 - h); };
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
/** A smooth curve through (xs, ys) that never overshoots (monotone cubic). */
function through(xs, ys) {
  const n = xs.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return (x) => {
    if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

export async function passage(app, args) {
  const m = store.member(), ok = app.live(), view = app.view, again = args[0] === 'again', W = app.world;
  const exit = again ? '#/archive' : '#/atrium';
  if (!W || !app.motion()) {
    await app.scene({ layout: 'off', theme: 'outside' }); if (!ok()) return null;
    app.amb('none');
    const end = () => { m.filmSeen = true; store.save(); app.go(exit); };
    view.innerHTML = `<div class="film-still"><h1 class="title serif">Nine things people worked out, in order.</h1>
      <p class="actions" style="margin-top:18px"><button class="link" type="button" data-end>${again ? 'Back to your Archive' : 'Skip to the Institute'}</button></p>
      <ol>${CHAPTERS.map((c) => `<li>${eraGlyph(c.id)}<span><b>${c.t}</b>${esc(c.l)}<small>${esc(c.w)}</small></span></li>`).join('')}</ol>
      <p class="lead serif" style="margin-top:28px">None of it was one person. All of it was people.</p>
      <div class="actions"><button class="btn" type="button" id="enter">${again ? 'Back to your Archive' : 'Enter the Institute'}</button></div></div>`;
    $('#enter', view).addEventListener('click', end); $('[data-end]', view).addEventListener('click', end);
    return { title: 'The passage' };
  }
  // the take starts where the member last stood: in front of their own door
  const side = app.doorSide(), other = side === 'L' ? 'R' : 'L';
  if (!store.invitation()) W.setDoors({ [side]: m.lineage, [other]: m.lineage === 'shen' ? 'ouroboros' : 'shen' });
  document.body.classList.add('film'); app.chrome();
  view.innerHTML = `<div id="film"><h1 class="sr">The passage: one walk behind a living drop of light that gathers itself into nine signs of what people worked out, and last into your own. You can pause it or skip it.</h1>
    <div class="film-cap swap" aria-live="polite"><h2 id="fc-t"></h2><p id="fc-l"></p></div>
    <div class="film-rule" aria-hidden="true">${CHAPTERS.map(() => '<i></i>').join('')}<span id="fc-n"></span></div>
    <div class="film-ctl"><button class="btn ghost" type="button" id="pause" aria-pressed="false">Pause</button><button class="btn ghost" type="button" id="skip">${again ? 'Close' : 'Skip the film'}</button></div></div>`;
  const loaded = W.need(['alley', 'passage', 'atrium']);
  await app.scene({ layout: 'full', theme: 'outside', shot: 'door', arg: side, dur: 1.5 }); if (!ok()) return null;
  await loaded; if (!ok()) return null;
  while (W.flying()) { await app.wait(0.05); if (!ok()) return null; }
  W.halt(); W.show(['alley', ...INSIDE]);
  const Sh = app.shots, A = Sh.pose('door', side, 'full'), Z = Sh.pose('atrium', null, 'full'), n = app.narrow();
  const B = BAYS, L = B.L, V = (p, out) => W.pt('passage', p, out), C = W.cell;
  const ST = W.zones.passage.man.anchors.steles;
  const yA = -3.4, yZ = L + 14, xA = side === 'L' ? 0.108 : -0.108;
  // the signs: each stands in the middle of its bay, as large as the bay lets it be, clear of the floor
  const size = B.map((b) => clamp(0.3 * b.w, 0.5, 3.0));
  const spot = ST.map((s, i) => [0, s.y, Math.max(1.55, size[i] * 1.2 + 0.35)]);
  // the last sign stands on the line from where the walk ends to the round light at the far end of the Atrium
  const ownAt = (d) => [0, yZ + d, 1.7 + (d / 78) * 16.3];
  const LEAD = n ? 3.9 : 3.6, ownSize = 3.2, own = ownAt(LEAD * ownSize + 0.5), away = ownAt(74);
  const born = [xA * 0.4, -0.15, 1.52], bornSize = 0.2;
  // the walker: on the centre line, never stopping, and at the end of each sign's time as near to it as shows it whole
  const gap = size.map((s) => (n ? 3.0 : 2.7) * s + (n ? 0.4 : 0.5));
  const camY = through([0, 1.1, ...spot.map((_, i) => S[i + 1]), TOTAL - 0.5], [yA, yA + 0.12, ...spot.map((p, i) => p[1] - gap[i]), yZ]);
  const camX = through([yA, -0.4, 2.5, yZ], [xA, xA * 0.5, 0, 0]);
  const expoY = through([yA, -0.6, 2.5, 12, 30, 48, L, yZ], [A.expo, 0.95, 1.3, 1.2, 0.9, 0.62, 0.46, Z.expo].map(Math.log));
  const filmFov = 2 * Math.atan(18 / (n ? 18 : 25)) * 180 / Math.PI;
  const FRAME = n ? [0, -0.1] : [0.06, 0];
  const tA = [0, -0.5, 1.84], tZ = [0, L + 18 + 74, 13];
  const P3 = A.p.clone(), T3 = A.t.clone(), base = A.p.clone(), dirB = A.p.clone(), dirE = A.p.clone(), cp = A.p.clone();
  const D = W.doors[side];
  let time = 0, rate = 1, want = 1, paused = false, seek = null, shown = -9, done = false, day = false, capT = 0, life = 0;
  const capEl = $('.film-cap', view), ticks = [...view.querySelectorAll('.film-rule i')];
  const caption = (i) => {
    const t = i < 0 ? '' : i < N ? CHAPTERS[i].t : '', l = i < 0 ? '' : i < N ? CHAPTERS[i].l : i === N ? 'None of it was one person. All of it was people.' : 'Your life was never meant to fit inside one version of yourself.';
    capEl.classList.add('swap'); clearTimeout(capT);
    capT = setTimeout(() => { $('#fc-t', view).textContent = t; $('#fc-l', view).textContent = l; if (t || l) capEl.classList.remove('swap'); }, 380);
    ticks.forEach((el, j) => { el.className = j < i ? 'on' : j === i ? 'now' : ''; });
    $('#fc-n', view).textContent = i < 0 || i >= N ? '' : `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')} · ${CHAPTERS[i].w}`;
  };
  /** The cell at a moment: where it is (passage frame), how large, which sign and how far gathered into it. */
  const cellAt = (t) => {
    const o = { id: CHAPTERS[0].id, f: 0, gone: 0, size: bornSize, stretch: 1, p: [...born], move: 0, clear: 0 };
    if (t < S[N]) {
      const i = t < S[0] ? 0 : Math.min(N - 1, S.findIndex((s, j) => j < N && t < S[j + 1])), u = t < S[0] ? 0 : (t - S[i]) / DUR[i];
      const from = i ? spot[i - 1] : born, s0 = i ? size[i - 1] : bornSize, k = io(clamp(u / GO));
      o.id = CHAPTERS[i].id; o.p = mix3(from, spot[i], k); o.size = lerp(s0, size[i], k); o.move = Math.sin(Math.PI * clamp(u / GO));
      o.f = smooth(FORM0, FORM1, u) * (1 - smooth(MELT, 1, u));
      o.gone = 0.5 * (1 - smooth(0.8, 2.2, t));
    } else {
      const u = clamp((t - S[N]) / TAIL), k = io(clamp(u / 0.44));
      o.id = m.lineage; o.p = mix3(spot[N - 1], own, k); o.size = lerp(size[N - 1], ownSize, k); o.move = Math.sin(Math.PI * clamp(u / 0.44));
      o.f = smooth(0.34, 0.6, u);
    }
    // it leads: never further ahead of the walker than shows it well, and it waits at its place for the walker to come near
    o.p[1] = Math.max(born[1], smin(o.p[1], camY(t) + LEAD * o.size + 0.5, 1.2));
    if (t > S[N] + TAIL) {
      // its last sign is the member's own; then it lets go, clears like water and goes on ahead, into the light at the far end of the Atrium
      const v = clamp((t - S[N] - TAIL) / REST), g = io(clamp((v - 0.14) / 0.8));
      o.f *= 1 - smooth(0.1, 0.4, v); o.p = mix3(o.p, away, g); o.move = Math.sin(Math.PI * clamp((v - 0.14) / 0.8)); o.clear = smooth(0.3, 0.8, v); o.gone = 1.5 * smooth(0.72, 0.95, v);
    }
    o.stretch = 1 + 0.75 * o.move;
    return o;
  };
  const set = (t) => {
    // the walker
    const y = camY(t), kz = smooth(B[6].y, yZ, y), kin = smooth(0, 2.2, t);
    const p = V([camX(y), y, lerp(1.62, 1.7, smooth(yA, yZ, y)) + 0.22 * Math.sin(Math.PI * clamp(y / yZ)) ** 2]);
    const ah = [0, y + 30, 1.84 + 0.02 * Math.max(0, y)], tb = [0, 1, 2].map((k) => lerp(lerp(tA[k], ah[k], kin), tZ[k], kz));
    base.copy(V(tb)); P3.copy(p);
    dirB.subVectors(base, p); const far = dirB.length(); dirB.divideScalar(far);
    // the cell, and the eye that follows it
    const c = cellAt(t), f = c.f, ky = smooth(B[2].y, B[7].y, c.p[1]);
    V(c.p, cp);
    C.show(c.gone < 1.45); C.sign(c.id); C.place(cp, c.size, (0.3 - 0.16 * f) * Math.sin(life * 0.42 + 1)); C.balls(life, 1 - 0.35 * f);
    const u = C.u;
    u.uForm.value = f; u.uStir.value = 4 * f * (1 - f) + 0.6 * c.gone + 0.12 * c.move; u.uStretch.value = c.stretch; u.uGone.value = c.gone; u.uThick.value = 0.15;
    // in the dark it is the light; by the end, in daylight, it is a body of deep blue that the day shines through
    u.uDay.value = ky * (1 - c.clear); u.uAbs.value.set(2.7, 1.7, 1.05).multiplyScalar(1 - c.clear);
    u.uGlowC.value.set(...mix3([0.42, 0.85, 1.55], [0, 0, 0], smooth(0.1, 0.9, ky)));
    u.uBack.value.set(...mix3([0.015, 0.025, 0.045], [1.3, 1.4, 1.5], ky));
    u.uBody.value.set(0.38, 0.57, 0.71);
    u.uAmb.value.set(...mix3([0.03, 0.05, 0.08], [0.8, 0.88, 0.95], ky));
    u.uKey.value.set(...mix3([0.05, 0.08, 0.14], [1.4, 1.5, 1.6], ky));
    u.uKeyDir.value.set(0, 0.5, -1);
    const lit = (1 - ky) * (1 - smooth(0.2, 1.2, c.gone)) * smooth(0.6, 2.4, t);
    W.light(0, cp, [0.42 * lit, 0.8 * lit, 1.45 * lit], 0.5 + (c.size * 2.6) ** 2);
    const look = 0.86 * kin * (1 - smooth(S[N] + TAIL + 0.3 * REST, TOTAL - 0.4, t));
    dirE.subVectors(cp, p).normalize(); dirB.lerp(dirE, look).normalize();
    T3.copy(p).addScaledVector(dirB, far);
    W.cam.p.copy(P3); W.cam.t.copy(T3);
    W.cam.fov = lerp(lerp(A.fov, filmFov, smooth(0, 3.2, t)), Z.fov, kz);
    // the picture is set off-centre so that a sign never stands behind its caption: to the right of it on a wide
    // screen, above it on a tall one
    for (let k = 0; k < 2; k++) W.shift[k] = lerp(lerp(A.shift[k], FRAME[k], smooth(0, 3, t)), Z.shift[k], smooth(S[N] + TAIL, TOTAL - 0.3, t));
    W.sway = lerp(lerp(1, 0.16, smooth(0, 2.4, t)), 1, smooth(B[5].y, yZ, y));
    // the eye: wide open in the dark of the first bays, closing as the daylight comes
    const kf = smooth(-1.2, 7, y);
    W.expo = Math.exp(expoY(y));
    for (let k = 0; k < 3; k++) W.fog[k] = lerp(NIGHT[k], DAY[k], kf);
    W.fog[3] = lerp(lerp(A.fog[3], 0.0016, kf), Z.fog[3], smooth(B[4].y, yZ, y));
    W.vig = lerp(A.vig, Z.vig, smooth(0, yZ, y)); W.grain = lerp(A.grain, Z.grain, smooth(0, yZ, y)); W.con = Z.con * smooth(L * 0.55, yZ, y); W.rain = A.rain * (1 - smooth(-2.5, 1.5, y));
    if (D) D.open = io(clamp((t - 0.25) / 2.3));
    // captions: each sign is named as it gathers
    let cap = -1; for (let j = 0; j < N; j++) if (t >= S[j] + FORM0 * DUR[j]) cap = j;
    if (t >= S[N] + 0.3 * TAIL) cap = N; if (t >= S[N] + TAIL + 0.2) cap = N + 1;
    if (cap !== shown) { if (cap > shown && cap >= 0 && cap <= N && !seek && want < 2) app.sfx('gather', cap); shown = cap; caption(cap); }
    const isDay = y > B[6].y - 1.5; if (isDay !== day) { day = isDay; document.body.classList.toggle('film-day', day); }
  };
  const clean = () => { clearTimeout(capT); removeEventListener('keydown', onKey); document.body.classList.remove('film', 'film-day'); C.show(false); W.light(0, null); W.sway = 1; if (D) D.open = 0; };
  const finish = () => {
    if (done) return; done = true; set(TOTAL); C.show(false); W.light(0, null);
    W.cam.p.copy(Z.p); W.cam.t.copy(Z.t); W.cam.fov = Z.fov; W.expo = Z.expo; W.fog.splice(0, 4, ...Z.fog); W.vig = Z.vig; W.grain = Z.grain; W.con = Z.con; W.rain = 0; W.shift = [...Z.shift];
    m.filmSeen = true; store.save();
    app.state.shot = 'atrium'; app.state.arg = null; app.state.zone = 'atrium'; W.show(INSIDE);
    app.go(exit);
  };
  const hurry = () => { want = 14; paused = false; seek = null; const b = $('#skip', view); if (b) b.disabled = true; pauseBtn(); };
  const pauseBtn = () => { const b = $('#pause', view); if (b) { b.textContent = paused ? 'Play' : 'Pause'; b.setAttribute('aria-pressed', paused ? 'true' : 'false'); } };
  $('#pause', view).addEventListener('click', () => { paused = !paused; pauseBtn(); });
  $('#skip', view).addEventListener('click', hurry);
  // the arrow keys go from sign to sign: to the moment each one stands whole
  const STOPS = [...CHAPTERS.map((_, j) => S[j] + 0.6 * DUR[j]), S[N] + 0.66 * TAIL];
  function onKey(e) {
    if (e.key === 'Escape') hurry();
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const at = seek ?? time, fwd = e.key === 'ArrowRight';
      const next = fwd ? STOPS.find((s) => s > at + 0.3) : [...STOPS].reverse().find((s) => s < at - 0.3);
      seek = next ?? (fwd ? STOPS[STOPS.length - 1] : 0.02); e.preventDefault();
    }
    else if (e.key === ' ' && document.activeElement.tagName !== 'BUTTON') { paused = !paused; pauseBtn(); e.preventDefault(); }
  }
  addEventListener('keydown', onKey);
  app.sfx('lock'); set(0);
  return {
    title: 'The passage', noFocus: true,
    tick: (t, dt) => {
      if (done) return;
      life += Math.min(dt, 0.1);                       // the cell goes on living while the film is paused
      if (seek !== null) { const g = seek - time; if (Math.abs(g) < 0.04) { time = seek; seek = null; } else time += Math.sign(g) * Math.min(Math.abs(g), (Math.abs(g) * 3 + 1.5) * 4 * dt); }
      else if (!paused) { rate += (want - rate) * (1 - Math.pow(0.03, dt)); time += dt * rate; }
      if (time > S[2] && app.state.amb !== 'inside') app.amb('inside');
      if (time >= TOTAL) { finish(); return; }
      set(time);
    },
    at: (t) => { time = t; seek = null; },             // for tests: jump to a time
    now: () => time,
    times: { S, T0, DUR, TAIL, REST, TOTAL, FORM1, MELT },
    leave: () => { clean(); if (!done) { app.state.shot = null; W.halt(); } },
  };
}

// PR6 / Institute: the passage (A09). One take, nine records.
// The member's door opens and the camera walks, without a cut, down the passage behind it: nine bays, each wider,
// taller and paler than the last, ending in the Atrium. In each bay stands a stele with one thing people worked out
// cut into it in sunk relief, the way the member's own stele is cut in the Archive: three of stone, three of metal,
// three of glass, each larger than the one before. A light finds each as the walker reaches it. The walk can be
// paused, stepped or skipped at any moment (skipping hurries the same walk, it never cuts), every chapter is
// captioned, and in Direct mode the same nine records are a page.
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

const N = CHAPTERS.length, PER = 4.7, T0 = 2.6, TAIL = 5.2, REST = 4.9, TOTAL = T0 + N * PER + TAIL + REST;
const NIGHT = [0.022, 0.034, 0.058], DAY = [1.1, 1.25, 1.4];
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
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
/** How far to one side of the passage the walker passes a stele (metres from the centre line). */
export const passAt = (w) => clamp(0.26 * w, 0.42, 3.6);

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
  view.innerHTML = `<div id="film"><h1 class="sr">The passage: one walk past nine records of what people worked out, each cut into a standing stone. You can pause it or skip it.</h1>
    <div class="film-cap swap" aria-live="polite"><h2 id="fc-t"></h2><p id="fc-l"></p></div>
    <div class="film-rule" aria-hidden="true">${CHAPTERS.map(() => '<i></i>').join('')}<span id="fc-n"></span></div>
    <div class="film-ctl"><button class="btn ghost" type="button" id="pause" aria-pressed="false">Pause</button><button class="btn ghost" type="button" id="skip">${again ? 'Close' : 'Skip the film'}</button></div></div>`;
  const loaded = W.need(['alley', 'passage', 'atrium']);
  await app.scene({ layout: 'full', theme: 'outside', shot: 'door', arg: side, dur: 1.5 }); if (!ok()) return null;
  await loaded; if (!ok()) return null;
  while (W.flying()) { await app.wait(0.05); if (!ok()) return null; }
  W.halt(); W.show(['alley', ...INSIDE]);
  const S = app.shots, A = S.pose('door', side, 'full'), Z = S.pose('atrium', null, 'full'), n = app.narrow();
  const B = BAYS, L = B.L, V = (p) => W.pt('passage', p);
  const ST = W.zones.passage.man.anchors.steles, G = W.zones.passage.man.groups;
  const floor = ST.map((s, i) => ({ era: (G['era' + i] || {}).floor ?? 0.05, body: (G['body' + i] || {}).floor ?? 0.05 }));
  // where the walker is: abreast of each stele at the end of its chapter, never stopping, and on the far side of the
  // passage from it, so the way weaves between the stones
  const yA = -3.4, yZ = L + 14, xA = side === 'L' ? 0.108 : -0.108;
  const ts = [0, 1.1], ys = [yA, yA + 0.12];
  ST.forEach((s, i) => { ts.push(T0 + (i + 0.94) * PER); ys.push(s.yf - 0.15); });
  ts.push(TOTAL - 0.5); ys.push(yZ);
  const camY = through(ts, ys);
  const camX = through([yA, -0.4, ...ST.map((s) => s.yf - 0.1), L + 7, yZ], [xA, xA * 0.5, ...ST.map((s, i) => -s.side * passAt(B[i].w)), 0, 0]);
  const gapTo = ST.map((s, i) => (i ? s.yf - ST[i - 1].yf : 6.2));
  const expoY = through([yA, -0.6, 2.5, 12, 30, 48, L, yZ], [A.expo, 0.95, 1.3, 1.2, 0.9, 0.62, 0.46, Z.expo].map(Math.log));
  const filmFov = 2 * Math.atan(18 / (n ? 18 : 25)) * 180 / Math.PI;
  const FRAME = n ? [0, -0.1] : [0.08, 0];
  const tA = [0, -0.5, 1.84], tZ = [0, L + 18 + 74, 13];
  const P3 = A.p.clone(), T3 = A.t.clone(), base = A.p.clone(), dirB = A.p.clone(), dirE = A.p.clone(), eye = A.p.clone();
  const D = W.doors[side];
  let time = 0, rate = 1, want = 1, paused = false, seek = null, shown = -9, done = false, day = false, capT = 0;
  const capEl = $('.film-cap', view), ticks = [...view.querySelectorAll('.film-rule i')];
  const caption = (i) => {
    const t = i < 0 ? '' : i < N ? CHAPTERS[i].t : '', l = i < 0 ? '' : i < N ? CHAPTERS[i].l : i === N ? 'None of it was one person. All of it was people.' : 'Your life was never meant to fit inside one version of yourself.';
    capEl.classList.add('swap'); clearTimeout(capT);
    capT = setTimeout(() => { $('#fc-t', view).textContent = t; $('#fc-l', view).textContent = l; if (t || l) capEl.classList.remove('swap'); }, 380);
    ticks.forEach((el, j) => { el.className = j < i ? 'on' : j === i ? 'now' : ''; });
    $('#fc-n', view).textContent = i < 0 || i >= N ? '' : `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')} · ${CHAPTERS[i].w}`;
  };
  const set = (t) => {
    // camera
    const y = camY(t), kz = smooth(B[6].y, yZ, y), kin = smooth(0, 2.2, t);
    const p = V([camX(y), y, lerp(1.62, 1.7, smooth(yA, yZ, y)) + 0.22 * Math.sin(Math.PI * clamp(y / yZ)) ** 2]);
    const ah = [0, y + 30, 1.84 + 0.02 * Math.max(0, y)], tb = [0, 1, 2].map((k) => lerp(lerp(tA[k], ah[k], kin), tZ[k], kz));
    base.copy(V(tb)); P3.copy(p);
    dirB.subVectors(base, p); const far = dirB.length(); dirB.divideScalar(far);
    // the head turns to each stele as it comes, and lets it go as it passes; the light finds the stele on the way
    for (let i = 0; i < N; i++) {
      const s = ST[i], d = s.yf - y, g = gapTo[i];
      const k = smooth(1.15 * g, 0.7 * g, d);
      W.lamps[s.lamp] = k; W.gain('passage', 'era' + i, lerp(floor[i].era, 1, k)); W.gain('passage', 'body' + i, lerp(floor[i].body, 1, k));
      const look = (n ? 0.9 : s.side > 0 ? 0.6 : 1.15) * smooth(g, 0.55 * g, d) * smooth(0.5 + 0.3 * s.sw, 2.0 + 1.0 * s.sw, d) * kin;
      if (look > 0.001) { dirE.subVectors(V([s.x, s.yf, s.z0 + s.sh * 0.6], eye), p).normalize(); dirB.lerp(dirE, look).normalize(); }
    }
    T3.copy(p).addScaledVector(dirB, far);
    W.cam.p.copy(P3); W.cam.t.copy(T3);
    W.cam.fov = lerp(lerp(A.fov, filmFov, smooth(0, 3.2, t)), Z.fov, kz);
    // the picture is set off-centre so that a stele never stands behind its caption: to the right of it on a wide
    // screen, above it on a tall one
    for (let k = 0; k < 2; k++) W.shift[k] = lerp(lerp(A.shift[k], FRAME[k], smooth(0, 3, t)), Z.shift[k], smooth(ST[N - 1].yf + 1, yZ, y));
    W.sway = lerp(lerp(1, 0.16, smooth(0, 2.4, t)), 1, smooth(B[5].y, yZ, y));
    // the eye: wide open in the dark of the first bays, closing as the daylight comes
    const kf = smooth(-1.2, 7, y);
    W.expo = Math.exp(expoY(y));
    for (let k = 0; k < 3; k++) W.fog[k] = lerp(NIGHT[k], DAY[k], kf);
    W.fog[3] = lerp(lerp(A.fog[3], 0.0016, kf), Z.fog[3], smooth(B[4].y, yZ, y));
    W.vig = lerp(A.vig, Z.vig, smooth(0, yZ, y)); W.grain = lerp(A.grain, Z.grain, smooth(0, yZ, y)); W.con = Z.con * smooth(L * 0.55, yZ, y); W.rain = A.rain * (1 - smooth(-2.5, 1.5, y));
    if (D) D.open = io(clamp((t - 0.25) / 2.3));
    // captions
    const c = t < T0 ? -1 : t < T0 + N * PER ? Math.floor((t - T0) / PER) : t < T0 + N * PER + TAIL ? N : N + 1;
    if (c !== shown) { shown = c; caption(c); }
    const isDay = y > B[6].y - 1.5; if (isDay !== day) { day = isDay; document.body.classList.toggle('film-day', day); }
  };
  const relight = () => { for (let i = 0; i < N; i++) { W.lamps[ST[i].lamp] = 1; W.gain('passage', 'era' + i, 1); W.gain('passage', 'body' + i, 1); } };
  const clean = () => { clearTimeout(capT); removeEventListener('keydown', onKey); document.body.classList.remove('film', 'film-day'); relight(); W.sway = 1; if (D) D.open = 0; };
  const finish = () => {
    if (done) return; done = true; set(TOTAL);
    W.cam.p.copy(Z.p); W.cam.t.copy(Z.t); W.cam.fov = Z.fov; W.expo = Z.expo; W.fog.splice(0, 4, ...Z.fog); W.vig = Z.vig; W.grain = Z.grain; W.con = Z.con; W.rain = 0; W.shift = [...Z.shift];
    m.filmSeen = true; store.save();
    app.state.shot = 'atrium'; app.state.arg = null; app.state.zone = 'atrium'; W.show(INSIDE);
    app.go(exit);
  };
  const hurry = () => { want = 14; paused = false; seek = null; const b = $('#skip', view); if (b) b.disabled = true; pauseBtn(); };
  const pauseBtn = () => { const b = $('#pause', view); if (b) { b.textContent = paused ? 'Play' : 'Pause'; b.setAttribute('aria-pressed', paused ? 'true' : 'false'); } };
  $('#pause', view).addEventListener('click', () => { paused = !paused; pauseBtn(); });
  $('#skip', view).addEventListener('click', hurry);
  function onKey(e) {
    if (e.key === 'Escape') hurry();
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const i = Math.floor((time - T0) / PER) + (e.key === 'ArrowRight' ? 1 : time - T0 - Math.floor((time - T0) / PER) * PER < 1.2 ? -1 : 0); seek = clamp(T0 + i * PER + 0.02, 0, T0 + N * PER); e.preventDefault(); }
    else if (e.key === ' ' && document.activeElement.tagName !== 'BUTTON') { paused = !paused; pauseBtn(); e.preventDefault(); }
  }
  addEventListener('keydown', onKey);
  app.sfx('lock'); set(0);
  return {
    title: 'The passage', noFocus: true,
    tick: (t, dt) => {
      if (done) return;
      if (seek !== null) { const g = seek - time; if (Math.abs(g) < 0.04) { time = seek; seek = null; } else time += Math.sign(g) * Math.min(Math.abs(g), (Math.abs(g) * 3 + 1.5) * 4 * dt); }
      else if (!paused) { rate += (want - rate) * (1 - Math.pow(0.03, dt)); time += dt * rate; }
      if (time > T0 + N * PER * 0.3 && app.state.amb !== 'inside') app.amb('inside');
      if (time >= TOTAL) { finish(); return; }
      set(time);
    },
    at: (t) => { time = t; seek = null; },             // for tests: jump to a time
    leave: () => { clean(); if (!done) { app.state.shot = null; W.halt(); } },
  };
}

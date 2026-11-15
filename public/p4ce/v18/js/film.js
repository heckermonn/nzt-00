// PR6 / Institute: the passage (A09). One take, one line of light.
// The member's door opens and the camera walks, without a cut, down the passage behind it: nine bays, each wider,
// taller and paler than the last, ending in the Atrium. One unbroken line travels ahead of the camera along the
// walls, and at each threshold it crosses the opening and draws one of nine things people worked out. It starts as
// light in the dark and ends as ink in the light. The film can be paused, stepped or skipped at any moment (skipping
// hurries the same walk, it never cuts), every chapter is captioned, and in Direct mode the same nine chapters are
// a page.
import { store } from './store.js';
import { $, esc, clamp, lerp } from './ui.js';
import { BAYS } from './world.js';
import { INSIDE } from './shots.js';

const bez = (a, b, c, d, n = 22) => Array.from({ length: n }, (_, i) => { const t = (i + 1) / n, u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]; });
const wave = (x0, x1, amp, n, steps = 40) => Array.from({ length: steps }, (_, i) => { const t = (i + 1) / steps; return [lerp(x0, x1, t), amp * Math.sin(t * n * Math.PI * 2) * Math.sin(t * Math.PI)]; });
const ring = (cx, cy, rx, ry, a0, turns, rot = 0, n = 64) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (i / n) * turns * Math.PI * 2, x = rx * Math.cos(a), y = ry * Math.sin(a); return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]; });

// Each chapter: a single stroke from (0, 0) to (1, rise), y up, in units of one chapter width.
export const CHAPTERS = [
  { t: 'Tools', l: 'A stone, struck until it held an edge.', p: () => [[0.36, 0], [0.31, 0.12], [0.33, 0.27], [0.4, 0.42], [0.5, 0.6], [0.59, 0.43], [0.67, 0.27], [0.69, 0.12], [0.64, 0], [0.55, 0.2], [0.5, 0.6], [0.46, 0.2], [0.64, 0]] },
  { t: 'Fire', l: 'Heat, kept and carried.', p: () => [[0.38, 0], ...bez([0.38, 0], [0.2, 0.22], [0.47, 0.32], [0.5, 0.66]), ...bez([0.5, 0.66], [0.56, 0.42], [0.78, 0.26], [0.62, 0]), ...bez([0.62, 0], [0.6, 0.16], [0.5, 0.18], [0.5, 0.34], 12), ...bez([0.5, 0.34], [0.47, 0.18], [0.42, 0.12], [0.44, 0], 12)] },
  { t: 'Agriculture', l: 'A season, planned for.', p: () => { const o = [...wave(0.08, 0.42, 0.035, 3), [0.5, 0]]; for (let j = 0; j < 6; j++) { const y = 0.1 + j * 0.08, s = j % 2 ? 1 : -1; o.push([0.5, y], [0.5 + s * 0.085, y + 0.075], [0.5, y]); } o.push([0.5, 0.64], [0.5, 0], ...wave(0.58, 0.92, 0.035, 3)); return o; } },
  { t: 'Mathematics', l: 'A proof that stays true.', p: () => [[0.5, 0], ...ring(0.5, 0.3, 0.3, 0.3, -Math.PI / 2, 1), [0.76, 0.45], [0.24, 0.45], [0.5, 0]] },
  { t: 'Medicine', l: 'Care, written down so that it could be repeated.', p: () => [[0.26, 0], ...bez([0.26, 0], [0.29, 0.07], [0.34, 0.07], [0.37, 0], 10), [0.43, 0], [0.455, -0.06], [0.5, 0.62], [0.545, -0.15], [0.57, 0], [0.63, 0], ...bez([0.63, 0], [0.67, 0.13], [0.73, 0.13], [0.77, 0], 12)] },
  { t: 'Engineering', l: 'A span that carries more than its builders.', p: () => [[0.08, 0], [0.3, 0.6], [0.3, 0], [0.3, 0.6], ...bez([0.3, 0.6], [0.42, 0.14], [0.58, 0.14], [0.7, 0.6]), [0.7, 0], [0.7, 0.6], [0.92, 0]] },
  { t: 'Flight', l: 'The ground, left on purpose.', rise: 0.34, p: () => [[0.12, 0], ...bez([0.12, 0], [0.36, 0], [0.42, 0.3], [0.52, 0.38]), ...bez([0.52, 0.38], [0.56, 0.52], [0.66, 0.52], [0.7, 0.4], 12), ...bez([0.7, 0.4], [0.74, 0.52], [0.84, 0.52], [0.88, 0.38], 12), ...bez([0.88, 0.38], [0.93, 0.34], [0.96, 0.34], [1, 0.34], 8)] },
  { t: 'Computation', l: 'Thought, given to a machine to hold.', p: () => { const o = [[0.12, 0]]; let x = 0.12; [1, 0, 1, 1, 0, 1, 0, 0, 1].forEach((b) => { const y = b ? 0.22 : 0; o.push([x, y], [x + 0.085, y]); x += 0.085; }); o.push([x, 0]); return o; } },
  { t: 'Space', l: 'A footprint somewhere else.', rise: 0.9, dot: [0.56, 0.44, 0.04], p: () => [[0.2, 0], ...bez([0.2, 0], [0.34, 0], [0.3, 0.3], [0.36, 0.4], 14), ...ring(0.56, 0.44, 0.21, 0.085, Math.PI, 1, -0.32).slice(1), ...bez([0.36, 0.4], [0.5, 0.75], [0.8, 0.86], [1, 0.9], 20)] },
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
/** Take the points off sharp corners so the ribbon keeps its width round them. */
function soften(P, r) {
  const o = [P[0]];
  for (let i = 1; i < P.length - 1; i++) {
    const a = o[o.length - 1], b = P[i], c = P[i + 1];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]], lu = Math.hypot(...u), lv = Math.hypot(...v);
    if (lu < 1e-4) continue;
    if (lv < 1e-4 || (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (lu * lv) > 0.94) { o.push(b); continue; }
    const k = Math.min(r, lu * 0.4, lv * 0.4);
    o.push([b[0] - u[0] / lu * k, b[1] - u[1] / lu * k, b[2] - u[2] / lu * k], [b[0] + v[0] / lv * k, b[1] + v[1] / lv * k, b[2] + v[2] / lv * k]);
  }
  o.push(P[P.length - 1]); return o;
}
/**
 * The line, in the passage's own frame (x across, y along, z up): along a wall of each bay, then across the bay's far
 * threshold as that chapter's figure, changing sides each time, and at the end out through the mouth of the passage
 * and down to the floor of the Atrium.
 */
function route(B) {
  const L = B.L, e = 0.035, P = [], tone = [], wide = [], M = [];
  const base = (i) => 0.62 + 0.1 * B[i].h, tn = (i) => clamp((i - 3.2) / 2.6), wd = (i) => B[i].w / B[0].w;
  const put = (p, i) => { P.push(p); tone.push(tn(i)); wide.push(wd(i)); };
  let side = -1, zEnd = base(0);
  CHAPTERS.forEach((c, i) => {
    const b = B[i], y1 = b.y + b.l - 0.03, xw = side * (b.w / 2 - e), i0 = P.length;
    if (i) { put([side * (B[i - 1].w / 2 - e), b.y + e, zEnd], i); put([xw, b.y + e, zEnd], i); } else put([xw, 0.15, zEnd], 0);
    const ya = i ? b.y + e : 0.15;
    for (let j = 1; j <= 8; j++) put([xw, lerp(ya, y1, j / 8), lerp(zEnd, base(i), io(j / 8))], i);
    const i1 = P.length, F = soften([P[i1 - 1], ...[...c.p(), [1, c.rise || 0]].map(([fx, fy]) => [xw * (1 - 2 * fx), y1, base(i) + fy * b.w])], 0.012 * b.w);
    for (const q of F.slice(1)) put(q, i);
    M.push({ i0, i1, i2: P.length, dot: c.dot ? [xw * (1 - 2 * c.dot[0]), y1, base(i) + c.dot[1] * b.w, c.dot[2] * b.w] : null });
    side = -side; zEnd = base(i) + (c.rise || 0) * b.w;
  });
  // out of the mouth, through the air, down onto the floor of the Atrium, and away along the water towards the far wall
  const x0 = side * (B[N - 1].w / 2 - e), a = [x0, L + 1.0, zEnd], b1 = [x0, L + 20, zEnd - 2], b2 = [0, L + 27, 0.03], d = [0, L + 46, 0.03];
  put([x0, L + 0.5, zEnd], N - 1); put(a, N - 1);
  for (let j = 1; j <= 44; j++) { const t = j / 44, u = 1 - t; put([0, 1, 2].map((k) => u * u * u * a[k] + 3 * u * u * t * b1[k] + 3 * u * t * t * b2[k] + t * t * t * d[k]), N - 1); }
  for (let j = 1; j <= 9; j++) put([0, L + 46 + j * 4, 0.03], N - 1);
  return { P, tone, wide, M };
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
      <ol>${CHAPTERS.map((c, i) => `<li><span class="label">${String(i + 1).padStart(2, '0')}</span><span><b>${c.t}</b>${esc(c.l)}</span></li>`).join('')}</ol>
      <p class="lead serif" style="margin-top:28px">None of it was one person. All of it was people.</p>
      <div class="actions"><button class="btn" type="button" id="enter">${again ? 'Back to your Archive' : 'Enter the Institute'}</button></div></div>`;
    $('#enter', view).addEventListener('click', end); $('[data-end]', view).addEventListener('click', end);
    return { title: 'The passage' };
  }
  // the take starts where the member last stood: in front of their own door
  const side = app.doorSide(), other = side === 'L' ? 'R' : 'L';
  if (!store.invitation()) W.setDoors({ [side]: m.lineage, [other]: m.lineage === 'shen' ? 'ouroboros' : 'shen' });
  document.body.classList.add('film'); app.chrome();
  view.innerHTML = `<div id="film"><h1 class="sr">The passage: one walk through nine chapters of what people worked out. You can pause it or skip it.</h1>
    <div class="film-cap swap" aria-live="polite"><h2 id="fc-t"></h2><p id="fc-l"></p></div>
    <div class="film-rule" aria-hidden="true">${CHAPTERS.map(() => '<i></i>').join('')}<span id="fc-n"></span></div>
    <div class="film-ctl"><button class="btn ghost" type="button" id="pause" aria-pressed="false">Pause</button><button class="btn ghost" type="button" id="skip">${again ? 'Close' : 'Skip the film'}</button></div></div>`;
  const loaded = W.need(['alley', 'passage', 'atrium']);
  await app.scene({ layout: 'full', theme: 'outside', shot: 'door', arg: side, dur: 1.5 }); if (!ok()) return null;
  await loaded; if (!ok()) return null;
  while (W.flying()) { await app.wait(0.05); if (!ok()) return null; }
  W.halt(); W.show(['alley', ...INSIDE]);
  const S = app.shots, A = S.pose('door', side, 'full'), Z = S.pose('atrium', null, 'full'), n = app.narrow();
  const B = BAYS, L = B.L, R = route(B), V = (p) => W.pt('passage', p);
  const line = W.line(R.P.map(V), { tone: (i) => R.tone[i], wide: (i) => R.wide[i], width: 0.016, minPx: 1.2, maxPx: n ? 7 : 10 });
  const cum = line.cum, Mk = R.M.map((k) => ({ d0: k.i0 ? cum[k.i0 - 1] : 0, d1: cum[k.i1 - 1], d2: cum[k.i2 - 1], dot: k.dot }));
  // the planet of the last chapter: a small ring that closes once the pen has gone round it
  const dots = Mk.map((k) => (k.dot ? W.line(Array.from({ length: 25 }, (_, j) => V([k.dot[0] + k.dot[3] * Math.cos(j / 24 * 6.2832), k.dot[1], k.dot[2] + k.dot[3] * Math.sin(j / 24 * 6.2832)])), { tone: () => 1, wide: () => R.wide[R.wide.length - 1], width: 0.016, minPx: 1.2, maxPx: n ? 7 : 10 }) : null));
  // where the pen is at a time: quickly along the wall, then at a drawing pace through the figure
  const penAt = (t) => {
    const u = (t - T0) / PER; if (u <= 0) return 0;
    if (u < N) { const i = Math.floor(u), f = u - i, k = Mk[i], fw = 0.2; if (f < fw) { const q = f / fw; return lerp(k.d0, k.d1, lerp(q, io(q), 0.6)); } const q = (f - fw) / (1 - fw); return lerp(k.d1, k.d2, lerp(q, q * q * (3 - 2 * q), 0.35)); }
    const k = clamp((t - T0 - N * PER) / TAIL); return lerp(Mk[N - 1].d2, line.length, 1 - Math.pow(1 - k, 2.2));
  };
  // where the camera is: it passes each threshold a moment after that figure is finished, and never stops walking
  const lag = n ? 0.42 : 0.3, yA = -3.4, yZ = L + 14;
  const ts = [0, 1.1], ys = [yA, yA + 0.12];
  for (let i = 1; i <= N; i++) { ts.push(T0 + (i + lag) * PER); ys.push(i < N ? B[i].y : L); }
  ts.push(TOTAL - 0.5); ys.push(yZ);
  const camY = through(ts, ys);
  const expoY = through([yA, -0.6, 2.5, 12, 30, 48, L, yZ], [A.expo, 0.95, 1.3, 1.2, 0.9, 0.62, 0.46, Z.expo].map(Math.log));
  const filmFov = 2 * Math.atan(18 / (n ? 16 : 21)) * 180 / Math.PI;
  const xA = side === 'L' ? 0.108 : -0.108, tA = [0, -0.5, 1.84], tZ = [0, L + 18 + 74, 13];
  const P3 = A.p.clone(), T3 = A.t.clone(), base = A.p.clone(), dirB = A.p.clone(), dirP = A.p.clone(), penS = V(R.P[0]), penP = A.p.clone();
  const D = W.doors[side];
  let time = 0, rate = 1, want = 1, paused = false, seek = null, shown = -9, done = false, day = false, capT = 0;
  const capEl = $('.film-cap', view), ticks = [...view.querySelectorAll('.film-rule i')];
  const caption = (i) => {
    const t = i < 0 ? '' : i < N ? CHAPTERS[i].t : '', l = i < 0 ? '' : i < N ? CHAPTERS[i].l : i === N ? 'None of it was one person. All of it was people.' : 'Your life was never meant to fit inside one version of yourself.';
    capEl.classList.add('swap'); clearTimeout(capT);
    capT = setTimeout(() => { $('#fc-t', view).textContent = t; $('#fc-l', view).textContent = l; if (t || l) capEl.classList.remove('swap'); }, 380);
    ticks.forEach((el, j) => { el.className = j < i ? 'on' : j === i ? 'now' : ''; });
    $('#fc-n', view).textContent = i < 0 ? '' : i < N ? `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}` : '';
  };
  const set = (t) => {
    // camera
    const y = camY(t), kz = smooth(B[6].y, yZ, y), kin = smooth(0, 2.2, t);
    const p = V([xA * (1 - smooth(yA, 1.2, y)), y, lerp(1.62, 1.7, smooth(yA, yZ, y)) + 0.22 * Math.sin(Math.PI * clamp(y / yZ)) ** 2]);
    const ah = [0, y + 30, 1.84 + 0.02 * Math.max(0, y)], tb = [0, 1, 2].map((k) => lerp(lerp(tA[k], ah[k], kin), tZ[k], kz));
    base.copy(V(tb)); P3.copy(p);
    // the pen, and a slight turn of the head towards it
    const d = penAt(t); line.at(d, penP);
    penS.lerp(penP, 0.08);
    dirB.subVectors(base, p); const far = dirB.length(); dirB.divideScalar(far);
    dirP.subVectors(penS, p).normalize();
    const lead = 0.2 * smooth(0.15, 0.75, dirP.dot(dirB)) * (1 - kz) * kin;
    dirB.lerp(dirP, lead).normalize(); T3.copy(p).addScaledVector(dirB, far);
    W.cam.p.copy(P3); W.cam.t.copy(T3);
    W.cam.fov = lerp(lerp(A.fov, filmFov, smooth(0, 3.2, t)), Z.fov, kz);
    for (let k = 0; k < 2; k++) W.shift[k] = lerp(lerp(A.shift[k], 0, smooth(0, 3, t)), Z.shift[k], kz);
    W.sway = lerp(lerp(1, 0.16, smooth(0, 2.4, t)), 1, smooth(B[5].y, yZ, y));
    // the eye: wide open in the dark of the first bays, closing as the daylight comes
    const kf = smooth(-1.2, 7, y);
    W.expo = Math.exp(expoY(y));
    for (let k = 0; k < 3; k++) W.fog[k] = lerp(NIGHT[k], DAY[k], kf);
    W.fog[3] = lerp(lerp(A.fog[3], 0.0016, kf), Z.fog[3], smooth(B[4].y, yZ, y));
    W.vig = lerp(A.vig, Z.vig, smooth(0, yZ, y)); W.grain = lerp(A.grain, Z.grain, smooth(0, yZ, y)); W.con = Z.con * smooth(L * 0.55, yZ, y); W.rain = A.rain * (1 - smooth(-2.5, 1.5, y));
    if (D) D.open = io(clamp((t - 0.25) / 2.3));
    // the line
    const back = smooth(TOTAL - REST + 0.6, TOTAL - 0.7, t), from = back > 0 ? lerp(line.length - 130, line.length, back * back) : -1;
    line.draw(d, from);
    dots.forEach((dl, i) => { if (dl) dl.draw(dl.length * smooth(Mk[i].d1 + (Mk[i].d2 - Mk[i].d1) * 0.6, Mk[i].d2, d), back > 0.02 ? 1e9 : -1); });
    const ci = clamp(Math.floor((t - T0) / PER), 0, N - 1), w = R.wide[Math.min(R.wide.length - 1, R.M[ci].i1)], tone = t > T0 + N * PER ? 1 : clamp((ci - 3.2) / 2.6);
    const on = smooth(0.5, 1.6, t) * (1 - smooth(0.9, 1, back));
    W.pen(on > 0.01 ? penP : null, 0.12 * Math.pow(w, 0.75) * on, 1);
    const glow = 2.4 * (1 - tone) * on;
    W.light(0, glow > 0.01 ? penP : null, [0.55 * glow, 0.72 * glow, 1.0 * glow], 0.5 + 0.9 * w);
    // captions
    const c = t < T0 ? -1 : t < T0 + N * PER ? Math.floor((t - T0) / PER) : t < T0 + N * PER + TAIL ? N : N + 1;
    if (c !== shown) { shown = c; caption(c); }
    const isDay = y > B[5].y; if (isDay !== day) { day = isDay; document.body.classList.toggle('film-day', day); }
  };
  const clean = () => { clearTimeout(capT); removeEventListener('keydown', onKey); document.body.classList.remove('film', 'film-day'); line.remove(); dots.forEach((d) => d && d.remove()); W.pen(null); W.light(0, null); W.sway = 1; if (D) D.open = 0; };
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

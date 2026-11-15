// PR6 / Institute: the passage (A09). A one-time editorial film, drawn live: one unbroken line travels through nine
// chapters of human ingenuity while the frame opens from the width of the viewing slit to the whole screen and the
// dark gives way to light. It can be paused or skipped at any moment, every chapter is captioned, and in Direct
// (still) mode it is replaced by the same nine chapters as a page.
import { store } from './store.js';
import { $, esc, ease, clamp, lerp } from './ui.js';

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
const STOPS = [[0, [20, 28, 34]], [0.22, [15, 26, 38]], [0.48, [63, 102, 143]], [0.66, [113, 139, 154]], [0.84, [202, 213, 218]], [1, [242, 243, 239]]];
const bgAt = (p) => { for (let i = 1; i < STOPS.length; i++) if (p <= STOPS[i][0]) { const a = STOPS[i - 1], b = STOPS[i], k = (p - a[0]) / (b[0] - a[0]); return a[1].map((v, j) => Math.round(lerp(v, b[1][j], k))); } return STOPS[STOPS.length - 1][1]; };

function build() {
  const pts = [], seg = []; let base = 0;
  CHAPTERS.forEach((c, i) => {
    const loc = [[0, 0], ...c.p(), [1, c.rise || 0]]; const i0 = pts.length;
    for (const [x, y] of loc) pts.push([i + x, base + y]);
    let len = 0; const cum = [0];
    for (let k = i0 + 1; k < pts.length; k++) { len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); cum.push(len); }
    seg.push({ i0, i1: pts.length - 1, cum, len, base, dot: c.dot ? [i + c.dot[0], base + c.dot[1], c.dot[2]] : null });
    base += c.rise || 0;
  });
  return { pts, seg };
}

export async function passage(app, args) {
  const m = store.member(), ok = app.live(), view = app.view, again = args[0] === 'again';
  await app.scene({ layout: 'off', theme: 'outside' }); if (!ok()) return null;
  app.amb('none');
  const end = () => { m.filmSeen = true; store.save(); app.go(again ? '#/archive' : '#/atrium'); };
  const N = CHAPTERS.length;
  if (!app.motion()) {
    view.innerHTML = `<div class="film-still"><p class="label">The passage</p><h1 class="title serif" style="margin-top:10px">Nine things people worked out, in order.</h1>
      <p class="actions" style="margin-top:18px"><button class="link" type="button" data-end>${again ? 'Back to your Archive' : 'Skip to the Institute'}</button></p>
      <ol>${CHAPTERS.map((c, i) => `<li><span class="label">${String(i + 1).padStart(2, '0')}</span><span><b>${c.t}</b>${esc(c.l)}</span></li>`).join('')}</ol>
      <p class="lead serif" style="margin-top:28px">None of it was one person. All of it was people.</p>
      <div class="actions"><button class="btn" type="button" id="enter">${again ? 'Back to your Archive' : 'Enter the Institute'}</button></div></div>`;
    $('#enter', view).addEventListener('click', end); $('[data-end]', view).addEventListener('click', end);
    return { title: 'The passage' };
  }
  document.body.classList.add('film');
  view.innerHTML = `<div id="film"><canvas aria-hidden="true"></canvas>
    <div class="film-cap" aria-live="polite"><p class="label" id="fc-n"></p><h2 id="fc-t"></h2><p id="fc-l"></p></div>
    <h1 class="sr">The passage: a short film in nine chapters. You can skip it.</h1>
    <div class="film-ctl"><button class="btn ghost" type="button" id="pause" aria-pressed="false">Pause</button><button class="btn ghost" type="button" id="skip">${again ? 'Close' : 'Skip the film'}</button></div></div>`;
  const cv = $('#film canvas', view), g = cv.getContext('2d'), root = $('#film', view);
  const { pts, seg } = build();
  const PER = 4.7, T = N * PER, TAIL = 7.5;
  let time = 0, paused = false, shown = -2, cam = [-0.15, 0.05], finished = false;
  const size = () => { const d = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d); };
  size();
  const cap = (n, t, l) => { $('#fc-n', view).textContent = n; $('#fc-t', view).textContent = t; $('#fc-l', view).textContent = l; };
  $('#pause', view).addEventListener('click', (e) => { paused = !paused; e.currentTarget.textContent = paused ? 'Play' : 'Pause'; e.currentTarget.setAttribute('aria-pressed', paused ? 'true' : 'false'); });
  $('#skip', view).addEventListener('click', end);
  const onKey = (e) => { if (e.key === 'Escape') end(); };
  addEventListener('keydown', onKey);
  const penAt = (u) => {            // u in chapters (0..N): the pen's point and the index of the last whole vertex behind it
    const i = Math.min(N - 1, Math.floor(u)), s = seg[i], L = clamp(u - i) * s.len;
    let k = 1; while (k < s.cum.length - 1 && s.cum[k] < L) k++;
    const a = pts[s.i0 + k - 1], b = pts[s.i0 + k], f = (L - s.cum[k - 1]) / Math.max(1e-6, s.cum[k] - s.cum[k - 1]);
    return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), idx: s.i0 + k - 1, ch: i };
  };
  return {
    title: 'The passage', noFocus: true,
    resize: size,
    tick: (t, dt) => {
      if (!paused && !finished) time += dt;
      const W = cv.width, H = cv.height, d = W / innerWidth;
      const p = clamp(time / T), u = clamp(time / T) * N, pen = penAt(Math.min(u, N - 1e-4));
      const bg = bgAt(ease.io(p)), lum = (bg[0] * 0.3 + bg[1] * 0.6 + bg[2] * 0.1) / 255, fg = lum > 0.62 ? '#171C1F' : '#F2F3EF';
      document.body.style.setProperty('--film-fg', fg); root.style.background = `rgb(${bg})`;
      const s = Math.min(W * 0.9, H * 0.72);                                 // px per chapter width
      const tx = pen.x - 0.15, ty = seg[pen.ch].base + 0.05 + (pen.y - seg[pen.ch].base) * 0.22, k = 1 - Math.pow(0.03, dt);
      cam[0] += (tx - cam[0]) * k; cam[1] += (ty - cam[1]) * k;
      const X = (x) => W * 0.5 + (x - cam[0]) * s, Y = (y) => H * 0.5 - (y - cam[1]) * s;
      g.fillStyle = `rgb(${bg})`; g.fillRect(0, 0, W, H);
      g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = fg; g.lineWidth = Math.max(1.5, 2 * d);
      g.beginPath(); g.moveTo(X(-3), Y(0)); g.lineTo(X(pts[0][0]), Y(pts[0][1]));
      for (let i = 1; i <= pen.idx; i++) g.lineTo(X(pts[i][0]), Y(pts[i][1]));
      g.lineTo(X(pen.x), Y(pen.y)); g.stroke();
      for (const sg of seg) if (sg.dot && pen.idx > sg.i0 + 30) { g.fillStyle = fg; g.beginPath(); g.arc(X(sg.dot[0]), Y(sg.dot[1]), sg.dot[2] * s, 0, 7); g.fill(); }
      g.fillStyle = '#E98546'; g.beginPath(); g.arc(X(pen.x), Y(pen.y), 3.2 * d, 0, 7); g.fill();
      // the aperture: from the width of a viewing slit to the whole frame
      const band = lerp(0.15, 1.02, ease.io(clamp(p * 1.08))), bar = Math.max(0, (1 - band) / 2) * H;
      if (bar > 0) { g.fillStyle = '#07090B'; g.fillRect(0, 0, W, bar); g.fillRect(0, H - bar, W, bar); }
      const ch = time >= T ? (time > T + 3.2 ? N + 1 : N) : pen.ch;
      if (ch !== shown) {
        shown = ch;
        if (ch < N) cap(`${String(ch + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`, CHAPTERS[ch].t, CHAPTERS[ch].l);
        else if (ch === N) cap('', '', 'None of it was one person. All of it was people.');
        else cap('', '', 'Your life was never meant to fit inside one version of yourself.');
      }
      if (time > T + TAIL && !finished) { finished = true; end(); }
    },
    leave: () => { removeEventListener('keydown', onKey); document.body.classList.remove('film'); document.body.style.removeProperty('--film-fg'); },
  };
}

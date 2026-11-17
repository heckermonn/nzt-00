/* PR6 v10 Print · the Atlas as a line plan. A survey drawing of the misty studio floor seen from above: the cyclorama's
   footprint, a survey grid with lettered gridline bubbles, the camera's centreline, the nine plinths drawn as outlines
   with their debossed discs, and a dimension chain. Units are millimetres. It draws itself once (stroke-dashoffset on
   pathLength="1"), and a click zooms the viewBox into one station before the page hands off to the collection.
   Two layouts: landscape (desktop) and portrait (phone), so the labels stay readable at 390 px. */
import {CAT} from './catalog.js';

/* each station is its own still life: shape, plinth size, a glass pane behind or not */
const SHAPE = ['c', 'r', 'c', 'c', 'r', 'c', 'c', 'r', 'c'];
const SIZE = [1500, 1300, 1800, 1400, 1650, 1200, 1700, 1350, 1550];
const GLASS = [0, 1, 0, 0, 1, 0, 0, 1, 0];
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function layout(portrait) {
  if (!portrait) {
    const W = 24000, H = 9200;
    return {portrait, W, H, m: [1100, 1300, 600, 1950], fs: {nm: 340, cd: 200, dim: 190, bub: 210}, bubR: 300, gridMinor: 1200, gridMajor: 4800,
      st: CAT.map((co, i) => ({co, i, x: 2400 + i * 2400, y: 4600 + 1500 * Math.sin(i * .8 + .3), r: SIZE[i] / 2, sh: SHAPE[i], gl: GLASS[i]}))};
  }
  const W = 12000, H = 17600;
  return {portrait, W, H, m: [1150, 1350, 1500, 1500], fs: {nm: 600, cd: 360, dim: 340, bub: 360}, bubR: 500, gridMinor: 1000, gridMajor: 4000,
    st: CAT.map((co, i) => ({co, i, x: 6000 + 2400 * Math.sin(i * 1.05 + .5), y: 1500 + i * 1825, r: SIZE[i] * .62, sh: SHAPE[i], gl: GLASS[i]}))};
}

const d = (s, t) => `pathLength="1" style="--d:${s.toFixed(2)}s${t ? `;--t:${t}s` : ''}"`;
const ln = (x1, y1, x2, y2, cls, s, t) => `<line class="d ${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${d(s, t)}/>`;
const tx = (x, y, cls, s, body, extra = '') => `<text class="tx ${cls}" x="${x}" y="${y}" style="--d:${s.toFixed(2)}s" ${extra}>${body}</text>`;

/* a smooth line through the stations (Catmull-Rom as cubic Béziers) */
function spline(P) {
  let s = `M${P[0][0]} ${P[0][1]}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    s += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  }
  return s;
}

function station(L, s) {
  const {x, y, r, i, co} = s, t0 = 1.15 + i * .09, f = L.fs, lead = co.it[0];
  const plinth = s.sh === 'c'
    ? `<circle class="d pl" cx="${x}" cy="${y}" r="${r}" ${d(t0, .9)}/>`
    : `<rect class="d pl" x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="${r * .12}" ${d(t0, .9)}/>`;
  const disc = `<circle class="d dc" cx="${x}" cy="${y}" r="${r * .62}" ${d(t0 + .2, .7)}/>`;
  /* the lead pack's footprint (tin, jar and dropper are round, pouch and box are oblong), and the kit's pill and sphere */
  const pk = lead.pack, pr = r * .17;
  const pack = /tin|jar|dropper/.test(pk)
    ? `<circle class="d pk" cx="${x - r * .12}" cy="${y - r * .06}" r="${pk === 'dropper' ? pr * .7 : pr}" ${d(t0 + .35, .5)}/>`
    : `<rect class="d pk" x="${x - r * .12 - pr * 1.2}" y="${y - r * .06 - pr * (pk === 'box' ? .7 : .45)}" width="${pr * 2.4}" height="${pr * (pk === 'box' ? 1.4 : .9)}" ${d(t0 + .35, .5)}/>`;
  const pills = `<circle class="d pk" cx="${x + r * .3}" cy="${y + r * .22}" r="${r * .07}" ${d(t0 + .45, .4)}/>
    <rect class="d pk" x="${x + r * .14}" y="${y - r * .36}" width="${r * .11}" height="${r * .3}" rx="${r * .055}" transform="rotate(-28 ${x + r * .2} ${y - r * .2})" ${d(t0 + .5, .4)}/>`;
  /* a frosted glass pane: behind the plinth on the landscape plan, beside it on the portrait one */
  let glass = '';
  if (s.gl) {
    if (!L.portrait) glass = `<rect class="d gl" x="${x - r * 1.05}" y="${y - r - 760}" width="${r * 2.1}" height="90" ${d(t0 + .3, .6)}/>`;
    else { const gx = x < L.W / 2 ? x - r - 520 : x + r + 430; glass = `<rect class="d gl" x="${gx}" y="${y - r * 1.05}" width="90" height="${r * 2.1}" ${d(t0 + .3, .6)}/>`; }
  }
  /* centre cross */
  const c = r * .1, cross = `${ln(x - c, y, x + c, y, 'ax', t0 + .3, .3)}${ln(x, y - c, x, y + c, 'ax', t0 + .3, .3)}`;
  /* labels: the code in mono, the collection name in FreeSans, flush left to the plinth (or flush right on the portrait plan) */
  let labels;
  if (!L.portrait) {
    labels = tx(x - r, y - r - 230, 'cd', t0 + .9, co.c) + tx(x - r, y + r + 520, 'nm', t0 + .9, co.n);
  } else {
    const right = x < L.W / 2, lx = right ? x + r + 420 : x - r - 420, a = right ? '' : 'text-anchor="end"';
    labels = tx(lx, y - f.nm * .5, 'cd', t0 + .9, co.c, a) + tx(lx, y + f.nm * .62, 'nm', t0 + .9, co.n, a);
  }
  return `<a class="st" href="#/c/${co.c}" data-c="${co.c}" aria-label="${co.c} ${co.n}">${glass}${plinth}${disc}${pack}${pills}${cross}${labels}</a>`;
}

export function planSVG(portrait) {
  const L = layout(portrait), {W, H, m, f = L.fs} = L;
  const vb = [-m[0], -m[1], W + m[0] + m[2], H + m[1] + m[3]];
  let g = '';
  /* survey grid: faint minor lines, then major lines with lettered and numbered bubbles */
  let k = 0;
  for (let x = L.gridMinor; x < W; x += L.gridMinor) if (x % L.gridMajor) g += ln(x, 0, x, H, 'gm', .02 * k++, .6);
  for (let y = L.gridMinor; y < H; y += L.gridMinor) if (y % L.gridMajor) g += ln(0, y, W, y, 'gm', .02 * k++, .6);
  let maj = '', n = 0;
  for (let x = 0; x <= W; x += L.gridMajor) {
    const by = -m[1] + L.bubR + 160;
    maj += ln(x, by + L.bubR, x, H, 'gM', .25 + n * .05, .9) + `<circle class="d bub" cx="${x}" cy="${by}" r="${L.bubR}" ${d(.3 + n * .05, .5)}/>` + tx(x, by + f.bub * .36, 'bt', 1 + n * .05, String.fromCharCode(65 + n), 'text-anchor="middle"');
    n++;
  }
  n = 0;
  for (let y = 0; y <= H; y += L.gridMajor) {
    const bx = -m[0] + L.bubR + 120;
    maj += ln(bx + L.bubR, y, W, y, 'gM', .3 + n * .05, .9) + `<circle class="d bub" cx="${bx}" cy="${y}" r="${L.bubR}" ${d(.35 + n * .05, .5)}/>` + tx(bx, y + f.bub * .36, 'bt', 1.05 + n * .05, String(n + 1), 'text-anchor="middle"');
    n++;
  }
  /* the cyclorama's footprint: rounded at the back, the cove line where the floor starts to curve up */
  const cr = L.portrait ? 1800 : 2000, cv = L.portrait ? 700 : 650;
  const plane = `<path class="d bd" d="M0 ${H}V${cr}Q0 0 ${cr} 0H${W - cr}Q${W} 0 ${W} ${cr}V${H}" ${d(.45, 1.3)}/>
    <path class="d cv" d="M${cv} ${H}V${cr}Q${cv} ${cv} ${cr} ${cv}H${W - cr}Q${W - cv} ${cv} ${W - cv} ${cr}V${H}" ${d(.75, 1.3)}/>
    ${ln(0, H, W, H, 'bd', .6, 1)}`;
  /* the camera's path, through every station */
  const P = L.st.map(s => [s.x, s.y]);
  const a0 = L.portrait ? [P[0][0], P[0][1] - 1100] : [P[0][0] - 1500, P[0][1] + 400];
  const a1 = L.portrait ? [P[8][0], P[8][1] + 1100] : [P[8][0] + 1500, P[8][1] + 400];
  const path = `<path class="d cl" d="${spline([a0, ...P, a1])}" ${d(1, 1.5)}/>`;
  /* dimension chain between station centres, outside the plane, and a scale bar */
  let dim = '';
  if (!L.portrait) {
    const yy = H + 620, t = 110;
    [0, ...P.map(p => p[0]), W].forEach((x, j, arr) => {
      dim += ln(x, H + 120, x, yy + 220, 'ex', 1.9 + j * .04, .4) + ln(x - t, yy + t, x + t, yy - t, 'tk', 2 + j * .04, .3);
      if (j) dim += tx((x + arr[j - 1]) / 2, yy - 110, 'dm', 2.1 + j * .04, fmt(x - arr[j - 1]), 'text-anchor="middle"');
    });
    dim += ln(0, yy, W, yy, 'dl', 1.9, 1.1);
  } else {
    const xx = W + 640, t = 130;
    [0, ...P.map(p => p[1]), H].forEach((y, j, arr) => {
      dim += ln(W + 120, y, xx + 240, y, 'ex', 1.9 + j * .04, .4) + ln(xx - t, y + t, xx + t, y - t, 'tk', 2 + j * .04, .3);
      if (j) { const my = (y + arr[j - 1]) / 2; dim += tx(xx + 330, my, 'dm', 2.1 + j * .04, fmt(y - arr[j - 1]), `text-anchor="middle" transform="rotate(-90 ${xx + 330} ${my})"`); }
    });
    dim += ln(xx, 0, xx, H, 'dl', 1.9, 1.1);
  }
  const sbY = L.portrait ? H + 650 : H + 1380, u = 1000, sbH = L.portrait ? 160 : 110;
  let sb = '';
  for (let j = 0; j < 4; j++) sb += `<rect class="d sb${j % 2 ? '' : ' on'}" x="${j * u}" y="${sbY}" width="${u}" height="${sbH}" ${d(2.2 + j * .05, .4)}/>`;
  [0, 1, 2, 3, 4].forEach(j => sb += tx(j * u, sbY + sbH + f.dim * 1.15, 'dm', 2.4, String(j), 'text-anchor="middle"'));
  sb += tx(4 * u + f.dim * 1.4, sbY + sbH + f.dim * 1.15, 'dm', 2.4, 'm');
  const sts = L.st.map(s => station(L, s)).join('');
  const svg = `<svg class="plan${L.portrait ? ' pt' : ''}" viewBox="${vb.join(' ')}" role="group" aria-label="Plan of the studio floor: nine stations, one per collection" style="--fnm:${f.nm}px;--fcd:${f.cd}px;--fdm:${f.dim}px;--fbt:${f.bub}px">
    <rect class="pf" x="0" y="0" width="${W}" height="${H}"/>
    <g class="grid" aria-hidden="true">${g}${maj}</g><g aria-hidden="true">${plane}${path}</g>
    <g class="sts">${sts}</g><g aria-hidden="true">${dim}${sb}</g></svg>`;
  return {svg, L, vb};
}

/* the plan in place: hover highlights, a click zooms the viewBox into the station */
export function mountPlan(host, o = {}) {
  let cur = null, locked = false;
  const mq = matchMedia('(max-width: 760px)');
  function render(drawn) {
    const r = planSVG(mq.matches); host.innerHTML = r.svg; cur = r;
    const el = host.firstElementChild;
    if (drawn || o.drawn) el.classList.add('drawn');
    else setTimeout(() => el.classList.add('drawn'), 3600);
    el.addEventListener('click', e => {
      const a = e.target.closest('a.st'); if (!a) return;
      e.preventDefault(); o.onPick && o.onPick(a.dataset.c);
    });
    el.addEventListener('pointerover', e => { const a = e.target.closest('a.st'); hot(a ? a.dataset.c : null); });
    el.addEventListener('pointerleave', () => hot(null));
    el.addEventListener('focusin', e => { const a = e.target.closest('a.st'); hot(a ? a.dataset.c : null); });
    el.addEventListener('focusout', () => hot(null));
  }
  function hot(c, force) {
    if (locked && !force) return;
    host.querySelectorAll('a.st').forEach(a => a.classList.toggle('hot', a.dataset.c === c));
    host.firstElementChild.classList.toggle('has-hot', !!c);
  }
  function boxFor(c) {
    const s = cur.L.st.find(s => s.co.c === c); if (!s) return cur.vb;
    const aspect = cur.vb[2] / cur.vb[3], w = cur.L.portrait ? 7600 : 5600, h = w / aspect;
    const cx = cur.L.portrait ? s.x + (s.x < cur.L.W / 2 ? 1300 : -1300) : s.x + 300, cy = s.y + (cur.L.portrait ? 0 : 250);
    return [cx - w / 2, cy - h / 2, w, h];
  }
  function anim(from, to, dur) {
    const el = host.firstElementChild;
    return new Promise(res => {
      if (o.rm) { el.setAttribute('viewBox', to.join(' ')); return res(); }
      const t0 = performance.now(), io = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      (function step(now) {
        const k = Math.min(1, (now - t0) / dur), e = io(k);
        el.setAttribute('viewBox', from.map((v, i) => v + (to[i] - v) * e).join(' '));
        k < 1 ? requestAnimationFrame(step) : res();
      })(t0);
    });
  }
  const onMq = () => render(true);
  mq.addEventListener('change', onMq);
  render(false);
  return {
    hot,
    zoomTo(c) { host.firstElementChild.classList.add('zooming', 'drawn'); hot(c, true); locked = true; return anim(cur.vb, boxFor(c), 1050); },
    /* coming back from a collection: start inside that station, then pull back to the whole floor */
    zoomOutFrom(c) { const el = host.firstElementChild; el.classList.add('drawn'); el.setAttribute('viewBox', boxFor(c).join(' ')); hot(c, true); locked = true; return anim(boxFor(c), cur.vb, 1000).then(() => { locked = false; hot(null); }); },
    destroy() { mq.removeEventListener('change', onMq); }
  };
}

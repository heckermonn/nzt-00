/* P4CE v5 · the path-traced 08 Renew renders, read from v4's manifest (never copied).
   Turntable frame 0 and the hero still share one framing, so the frame IS the product image everywhere:
   the arm's sprite in the Atlas, the lineup, the product page and the Protocol cards. */
import {PACK} from './catalog.js';

export const RBASE = '../v4/assets/renders/';
const R = {tt: {}, still: {}, ready: null, ok: false};
/* where the product sits inside its 900×1125 frame (alpha > 230), measured from the renders */
export const BBOX = {dropper: [.3733, .112, .6267, .8711], jar: [.2189, .232, .7811, .7547], bottle: [.2822, .1093, .7178, .8916]};
export const FRAME_AR = 900 / 1125;
export const bboxOf = id => BBOX[(PACK[id] || {}).kind] || BBOX.bottle;
export const hasRender = id => !!PACK[id];

export function loadManifest() {
  if (R.ready) return R.ready;
  R.ready = fetch(RBASE + 'manifest.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : null).catch(() => null).then(m => {
    if (!m || !Array.isArray(m.assets)) { fallback(); return R; }
    for (const a of m.assets) {
      const v = a.v ? '?v=' + a.v : '';
      if (a.type === 'turntable') {
        const n = a.frames || 48, dir = a.path.replace(/\/?$/, '/');
        R.tt[a.product] = Array.from({length: n}, (_, i) => RBASE + dir + 'f_' + String(i).padStart(3, '0') + '.webp' + v);
      } else if (a.type === 'still') {
        (R.still[a.product] = R.still[a.product] || {})[a.variant] = {src: RBASE + (a.url || a.path), w: a.width, h: a.height, view: a.view};
      }
    }
    R.ok = true; return R;
  });
  return R.ready;
}
/* if the manifest is unreachable the folder layout is still known */
function fallback() {
  Object.keys(PACK).forEach(id => {
    R.tt[id] = Array.from({length: 48}, (_, i) => RBASE + 'turntable/' + id + '/f_' + String(i).padStart(3, '0') + '.webp');
    R.still[id] = {hero: {src: RBASE + 'stills/' + id + '_hero.webp'}, lying: {src: RBASE + 'stills/' + id + '_lying.webp'}};
  });
}
export const frames = id => R.tt[id] || [];
export const still = (id, v) => (R.still[id] && R.still[id][v]) || null;

/* the detail stills a product page can tilt through, in the order the camera would find them */
export function details(id) {
  const out = [];
  const add = (v, t, k) => { const s = still(id, v); if (s) out.push({src: s.src, t, k, w: s.w, h: s.h, view: s.view}); };
  add('macro-cap-hero', 'The cap', 'cap'); add('macro-label-hero', 'The label', 'label'); add('top-hero', 'From above', 'top'); add('lying', 'At rest', 'lying');
  return out;
}

/* decoded frame cache shared by every view and the WebGL sprite */
const IMG = new Map();
export function img(src) {
  if (!src) return Promise.resolve(null);
  let p = IMG.get(src);
  if (p) return p;
  p = new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => res(im)); }; im.onerror = () => res(null); im.src = src; });
  p.then(im => { p.im = im; });
  IMG.set(src, p);
  return p;
}
export const imgNow = src => { const p = IMG.get(src); return p && p.im || null; };
export const frameNow = (id, i) => { const f = frames(id); if (!f.length) return null; const n = f.length; return imgNow(f[((Math.round(i) % n) + n) % n]); };
/* nearest loaded frame, so a scrub never shows a hole */
export function frameNear(id, i) {
  const f = frames(id), n = f.length; if (!n) return null; const k = ((Math.round(i) % n) + n) % n;
  for (let d = 0; d < n; d++) { const a = imgNow(f[(k + d) % n]) || imgNow(f[(k - d + n) % n]); if (a) return a; }
  return null;
}
/* preload: nearest frames first */
export async function preloadTurn(id, from = 0, limit = 48) {
  const f = frames(id), n = f.length; if (!n) return;
  const order = [from % n]; for (let k = 1; k <= n / 2; k++) order.push((from + k) % n, (from - k + n) % n);
  for (const i of order.slice(0, limit)) await img(f[i]);
}
/* the renders carry a soft contact shadow in alpha (a shadow catcher). Held in the air by the arm, the product
   must lose it: this returns the frame with alpha under the product's own edge cut away. */
const CLIP = new WeakMap();
export function clipped(im) {
  if (!im) return null;
  let c = CLIP.get(im); if (c) return c;
  const w = im.naturalWidth >> 1, h = im.naturalHeight >> 1;
  c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(im, 0, 0, w, h);
  try {
    const d = g.getImageData(0, 0, w, h), a = d.data;
    for (let i = 3; i < a.length; i += 4) { const v = a[i]; a[i] = v < 165 ? 0 : v < 235 ? v * (v - 165) / 70 : v; }
    g.putImageData(d, 0, 0);
  } catch (e) {}
  CLIP.set(im, c); return c;
}

/* a still or a thumbnail with the render's shadow catcher cut away (it reads as a grey card on paper): blob URL, cached */
const CLEAN = new Map();
export function cleanSrc(src, maxH = 2000) {
  const key = src + '|' + maxH; if (CLEAN.has(key)) return CLEAN.get(key);
  const p = img(src).then(im => new Promise(res => {
    if (!im) return res(src);
    const k = Math.min(1, maxH / im.naturalHeight), w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(im, 0, 0, w, h);
    try { const d = g.getImageData(0, 0, w, h), a = d.data; for (let i = 3; i < a.length; i += 4) { const v = a[i]; a[i] = v < 150 ? 0 : v < 230 ? v * (v - 150) / 80 : v; } g.putImageData(d, 0, 0); } catch (e) { return res(src); }
    c.toBlob(b => res(b ? URL.createObjectURL(b) : src), 'image/webp', .92);
  }));
  CLEAN.set(key, p); return p;
}
export function cleanImgs(root) {
  root.querySelectorAll('img[data-clean]').forEach(i => { if (i.dataset.cleaned) return; i.dataset.cleaned = '1'; cleanSrc(i.getAttribute('src'), +i.dataset.clean || 2000).then(u => { i.src = u; i.classList.add('cl'); }); });
}

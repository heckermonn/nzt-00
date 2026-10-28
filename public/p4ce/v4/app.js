/* P4CE v4 · The Reserve · luxury look test
   One continuous journey: arrival behind frosted glass, The Formulary in mist, an interlude,
   08 Renew in path-traced renders, the product moment, and Your Protocol as a daily ritual.
   Frost is the only transition. Hooks: ?s=<section|p-08-N|list|search|menu|stub>, ?nogl, ?rm */
import {CAT, CONC} from './data.js';

const Q = new URLSearchParams(location.search);
const HTML = document.documentElement;
const RM = HTML.classList.contains('rm');
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const money = n => '$' + n.toFixed(2);
const pad2 = n => String(n).padStart(2, '0');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const eo = t => 1 - Math.pow(1 - t, 4);
const eio = t => t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
const isPhone = () => innerWidth <= 900;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const IC = {
  arrow: '<path d="M4 10h12M11.5 5.5L16 10l-4.5 4.5"/>', back: '<path d="M16 10H4M8.5 5.5L4 10l4.5 4.5"/>',
  plus: '<path d="M10 4.5v11M4.5 10h11"/>', minus: '<path d="M4.5 10h11"/>', x: '<path d="M5 5l10 10M15 5L5 15"/>',
  info: '<circle cx="10" cy="10" r="7"/><path d="M10 9v5M10 6.3v.2"/>', search: '<circle cx="9" cy="9" r="5.5"/><path d="M13.2 13.2L17 17"/>'
};
const ic = (n, c) => `<svg class="ic ${c || ''}" viewBox="0 0 20 20" aria-hidden="true" focusable="false">${IC[n]}</svg>`;

/* ================================================================ catalogue (reused from v2, no claims) */
const MIN = {Sodium: 1, Potassium: 1, Magnesium: 1, Iron: 1, Zinc: 1, Chromium: 1, Calcium: 1};
const ALL = [];
CAT.forEach((co, ci) => co.it.forEach((p, k) => {
  p.id = co.c + '-' + (k + 1); p.c = co.c; p.cn = co.n; p.k = k; p.top = p.g === 'Cream' || p.g === 'Serum';
  ALL.push(p);
}));
const byId = id => ALL.find(p => p.id === id) || null;
const REN = CAT[7].it;
/* pack facts for the 08 renders, measured from the Blender builds (p4ce/v4/blender/build_*.py) */
const PACK = {
  '08-1': {kind: 'dropper', fmt: 'Dropper bottle', mat: 'Etched glass, knurled aluminium collar, bone bulb', d: 33, h: 120},
  '08-2': {kind: 'dropper', fmt: 'Dropper bottle', mat: 'Etched glass, knurled aluminium collar, graphite bulb', d: 33, h: 120},
  '08-3': {kind: 'jar', fmt: 'Cream jar', mat: 'Thick frosted glass, brushed-steel lid', d: 64, h: 63},
  '08-4': {kind: 'bottle', fmt: 'Capsule bottle', mat: 'Matte porcelain body, brushed-steel cap', d: 52, h: 121},
  '08-5': {kind: 'bottle', fmt: 'Tablet bottle', mat: 'Soft-touch slate body, brushed-steel cap', d: 52, h: 121},
  '08-6': {kind: 'bottle', fmt: 'Capsule bottle', mat: 'Matte porcelain body, brushed-steel cap', d: 52, h: 121}
};
function kindOf(p) { if (PACK[p.id]) return PACK[p.id].kind; if (p.g === 'Serum') return 'dropper'; if (p.g === 'Cream') return 'jar'; if (p.g === 'Powder' || p.g === 'Sachets') return 'pouch'; return 'bottle'; }
function servingSize(p) { if (/servings/.test(p.s)) return p.s.split(',')[0]; if (p.top) return p.g === 'Serum' ? '2 to 3 drops' : 'A thin layer'; return p.s.replace(/ daily| as needed| in .*$/, ''); }
function fullList(p) {
  if (p.top) return p.oth.replace(/\.$/, '') + '.';
  const a = p.act.map(a => MIN[a.name] && a.form ? cap(a.form) : a.name + (a.form ? ' (' + a.form + ')' : '')).join(', ');
  const o = p.oth.replace(/No other ingredients\.?/i, '').trim();
  return a + (o ? '. ' + o.replace(/\.$/, '') + '.' : '.');
}
function keyIng(p) {
  if (p.top) { const c = (CONC[p.id] || [])[0]; return c ? {n: c[0], v: c[1], per: 'of formula'} : null; }
  const a = p.act[0]; if (!a) return null;
  const per = (p.s.match(/^1 (capsule|tablet|softgel)/) || [])[1];
  return {n: MIN[a.name] && a.form ? cap(a.form) : a.name, v: a.amt + (MIN[a.name] ? ' ' + a.name.toLowerCase() : ''), per: per ? 'per ' + per : 'per serving'};
}
function keyLine(p) {
  if (p.top) return (CONC[p.id] || []).slice(0, 2).map(c => c[0] + ' ' + c[1]).join(' / ');
  return p.act.slice(0, 2).map(a => a.name + (a.amt ? ' ' + a.amt : '')).join(' / ');
}
function purpose(p) {
  if (p.g === 'Serum') return 'Formulated as a ' + p.u + ' for ' + (/morning/.test(p.s) ? 'morning' : 'evening') + ' use.';
  if (p.top) return 'Formulated as a ' + p.u + ' for use as part of a daily routine.';
  if (/as needed/.test(p.s)) return 'Formulated as a ' + p.u + ', taken as needed.';
  if (/daily/.test(p.s)) return 'Formulated as a daily ' + p.u + '.';
  return 'Formulated as a ' + p.u + '.';
}
function directions(p) {
  const s = servingSize(p), d = [];
  if (p.g === 'Serum') { d.push('Apply 2 to 3 drops to clean, dry skin in the ' + (/morning/.test(p.s) ? 'morning' : 'evening') + '.'); d.push('Follow with a moisturiser' + (/morning/.test(p.s) ? ' and sunscreen.' : '.')); }
  else if (p.g === 'Cream') { d.push(/Body/.test(p.n) ? 'Massage a small amount into skin as needed.' : 'Apply a thin layer to clean skin, morning and evening.'); d.push('Avoid broken or irritated skin.'); }
  else if (p.g === 'Powder') d.push('Mix ' + s + ' into 250 to 300 ml of water or another drink.');
  else if (p.g === 'Sachets') d.push('Empty 1 sachet into water and stir until dissolved.');
  else { d.push('Take ' + s + (/as needed/.test(p.s) ? ' as needed' : ' daily') + ' with water.'); d.push('Taking it with a meal is fine.'); }
  d.push(p.top ? 'Store below 25 °C, away from direct light. Keep the cap closed.' : 'Store below 25 °C in a dry place, away from direct light. Close the lid after use.');
  return d;
}
function cautions(p) {
  const c = ['Consult a doctor before use if you are pregnant, nursing, taking medication, or have a medical condition.'];
  if (p.top) { c.push('For external use only. Avoid contact with eyes; if contact occurs, rinse with water.'); c.push('Patch test before first use. Stop using if irritation develops.'); }
  else { c.push('Do not exceed the stated serving.'); c.push('Food supplements should not be used as a substitute for a varied, balanced diet and a healthy lifestyle.'); }
  c.push('Keep out of reach of children.');
  return c;
}
const batch = p => '2610-' + p.c + p.id.split('-')[1] + 'A';

/* ================================================================ protocol state (shared with v2/v3 via p4ce.v2.*) */
const DAY = 864e5, MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const T0 = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.getTime(); })();
const fd = t => { const d = new Date(t); return pad2(d.getDate()) + ' ' + MO[d.getMonth()] + ' ' + d.getFullYear(); };
const KP = 'p4ce.v2.protocol';
let PRO;
/* the sample ritual: 08 Renew only, since only 08 has pack renders. An untouched older sample is refreshed. */
const SEED = () => [{id: '08-1', m: 'sub', fr: 60, q: 1, st: 'on', sk: 0}, {id: '08-4', m: 'sub', fr: 30, q: 1, st: 'on', sk: 0}, {id: '08-2', m: 'sub', fr: 30, q: 1, st: 'on', sk: 0}, {id: '08-3', m: 'once', fr: 30, q: 1, st: 'on', sk: 0}];
function seed() {
  PRO = store.get(KP, null);
  if (PRO && PRO.sample && Array.isArray(PRO.items) && PRO.items.some(i => !/^08-/.test(i.id))) { PRO.items = SEED(); store.set(KP, PRO); }
  if (!PRO || !Array.isArray(PRO.items)) { PRO = {sample: true, next: T0 + 18 * DAY, items: SEED()}; store.set(KP, PRO); }
  PRO.items = PRO.items.filter(i => byId(i.id));
  if (!(PRO.next > T0)) { PRO.next = PRO.next || T0; while (PRO.next <= T0) PRO.next += 30 * DAY; store.set(KP, PRO); }
}
seed();
const savePro = () => store.set(KP, PRO);
const count = () => PRO.items.reduce((s, i) => s + i.q, 0);
/* one-time and subscription lines never merge: a line is keyed by product and mode */
function addLine(id, m, fr, q) {
  const ex = PRO.items.find(i => i.id === id && (i.m === 'sub') === (m === 'sub'));
  if (ex) { ex.q = Math.min(99, ex.q + q); if (m === 'sub') ex.fr = fr; if (ex.st === 'paused') ex.st = 'on'; }
  else PRO.items.push({id, m, fr: m === 'sub' ? fr : 30, q, st: 'on', sk: 0, at: Date.now()});
  PRO.sample = false; savePro();
  return PRO.items.find(i => i.id === id && (i.m === 'sub') === (m === 'sub'));
}
addEventListener('storage', e => { if (e.key && e.key.indexOf('p4ce.v2.') === 0) { seed(); updCount(); renderRitual(); } });

/* ritual: time of day comes only from each product's directions */
const SLOTS = [
  {k: 'am', w: 'Dawn', code: 'AM', tag: 'Morning', base: 8 * 60 + 2, range: '06:00 to 10:00'},
  {k: 'md', w: 'Flow', code: 'MD', tag: 'Daily', base: 12 * 60 + 40, range: 'Any time, with water'},
  {k: 'pm', w: 'Dusk', code: 'PM', tag: 'Evening', base: 21 * 60 + 30, range: '19:00 to 23:00'}
];
function slotsFor(p) {
  if (p.g === 'Serum') return [/morning/.test(p.s) ? 'am' : 'pm'];
  if (p.g === 'Cream' && !/Body/.test(p.n)) return ['am', 'pm'];
  return ['md'];
}
const hm = m => pad2(Math.floor(m / 60) % 24) + ':' + pad2(m % 60);
function ritual() {
  const out = {am: [], md: [], pm: []};
  PRO.items.forEach((it, idx) => { const p = byId(it.id); slotsFor(p).forEach(s => out[s].push({it, p, idx})); });
  SLOTS.forEach(S => out[S.k].forEach((c, j) => { c.code = S.code + '-' + pad2(j + 1); c.time = hm(S.base + j * 4); c.S = S; }));
  return out;
}

/* ================================================================ renders: read the Blender agent's manifest, swap in as they land */
const RND = {hero: {}, tt: {}, sculpt: {}, extra: {}, raw: null, sig: ''};
const RBASE = 'assets/renders/';
function xhrJSON(url) {
  return new Promise(res => {
    try { const x = new XMLHttpRequest(); x.open('GET', url, true); x.onload = () => { try { res(x.status === 0 || x.status < 400 ? JSON.parse(x.responseText) : null); } catch (e) { res(null); } }; x.onerror = () => res(null); x.send(); }
    catch (e) { res(null); }
  });
}
const isImg = s => typeof s === 'string' && /\.(webp|avif|png|jpe?g)(\?.*)?$/i.test(s);
function rpath(s, base) {
  if (/^(https?:|data:|\/)/.test(s)) return s;
  if (/^assets\//.test(s)) return s;
  if (/^renders\//.test(s)) return 'assets/' + s;
  return (base || RBASE) + s.replace(/^\.\//, '');
}
function expandPattern(pat, n, start) {
  const out = []; for (let i = 0; i < n; i++) {
    const f = (start || 0) + i;
    out.push(pat.replace(/%0(\d)d/, (m, w) => String(f).padStart(+w, '0')).replace(/\{(?:i|frame|f)(?::0?(\d))?\}/, (m, w) => w ? String(f).padStart(+w, '0') : String(f)).replace(/#+/, m => String(f).padStart(m.length, '0')));
  }
  return out;
}
function parseManifest(m) {
  if (m && Array.isArray(m.assets)) {
    const hero = {}, tt = {}, sculpt = {}, base = 'assets/renders/';
    const SC = {'sculpt-meteor': 'meteor', 'sculpt-halo': 'halo', 'sculpt-halo-motion': 'halomotion', 'sculpt-capsule': 'capsule', '08-group': 'group'};
    const extra = {};
    m.assets.forEach(a => {
      if (!a || !a.path) return;
      const q = a.v != null ? '?v=' + encodeURIComponent(a.v) : '';
      if (a.type === 'turntable' && /^08-[1-6]$/.test(a.product) && a.frames > 5) {
        const pat = a.pattern || 'f_{000}.webp';
        tt[a.product] = Array.from({length: a.frames}, (_, i) => base + a.path + pat.replace(/\{(0+)\}/, (x, z) => String(i).padStart(z.length, '0')).replace(/\{i\}/, String(i)) + q);
      } else if (a.type === 'still' || a.type === 'macro' || a.type === 'detail') {
        const vw = a.view && a.view !== 'upright' ? String(a.view) : '';
        /* the manifest's view (lying, top, macro-cap, macro-label) wins over its variant, so a lying hero never replaces the upright one */
        const v = vw ? (a.variant && a.variant !== 'hero' ? vw + '-' + a.variant : vw) : String(a.variant || (a.type === 'still' ? 'hero' : a.type)), src = base + a.path + q;
        if (/^08-[1-6]$/.test(a.product)) { const h = hero[a.product] = hero[a.product] || {}; if (v === 'hero') h.src = src; else if (v === 'fog') h.fog = src; else if (/thumb|^sm$/.test(v)) h.thumb = src; else h[v] = src; }
        else if (SC[a.product] || /group|stack/.test(a.product || '')) {
          const k = SC[a.product] || 'group', h = sculpt[k] = sculpt[k] || {};
          if (/fog/.test(v)) { if (!h.fog || /diag|stack|lean/.test(v)) h.fog = src; }
          else if (/diag|stack|lean|lying|top/.test(v) || /stack/.test(a.product)) { h.src = src; h.pref = 1; }
          else if (!h.pref && (v === 'hero' || !h.src)) h.src = src;
        } else extra[(a.product || 'x') + ':' + v] = {src, product: a.product, variant: v, label: a.label || a.name || ''};
      }
    });
    return {hero, tt, sculpt, extra};
  }
  const hero = {}, tt = {}, sculpt = {};
  const idOf = s => { const r = /08[-_]?([1-6])/.exec(s); return r ? '08-' + r[1] : null; };
  const scOf = s => { const r = /(capsule|halo|meteor|stone|group)/i.exec(s); return r ? r[1].toLowerCase() : null; };
  function addPath(path, ctx) {
    const s = (ctx + ' ' + path).toLowerCase();
    const id = idOf(path) || idOf(ctx);
    const isTT = /turntable|(^|[\/_\-])tt([\/_\-]|$)|frames|[\/_]f_?\d{3}/.test(s);
    const isFog = /fog|cyc|backdrop/.test(s) && !/nofog/.test(s);
    const isThumb = /thumb|small|_sm\b|-sm\b|preview|low/.test(s);
    if (id) {
      if (isTT) (tt[id] = tt[id] || []).push(path);
      else if (!isFog) { const h = hero[id] = hero[id] || {}; if (isThumb) h.thumb = h.thumb || path; else if (!h.src || /hero/.test(s)) h.src = path; }
      else { const h = hero[id] = hero[id] || {}; h.fog = h.fog || path; }
      return;
    }
    const sc = scOf(s); if (sc && !isTT) { const h = sculpt[sc] = sculpt[sc] || {}; if (isThumb) h.thumb = h.thumb || path; else if (!h.src || /hero/.test(s)) h.src = path; }
  }
  function walk(o, ctx, base) {
    if (o == null) return;
    if (typeof o === 'string') { if (isImg(o)) addPath(rpath(o, base), ctx); return; }
    if (Array.isArray(o)) { o.forEach(v => walk(v, ctx, base)); return; }
    if (typeof o === 'object') {
      let b = base; if (typeof o.base === 'string' || typeof o.dir === 'string') b = rpath(String(o.base || o.dir).replace(/\/?$/, '/'), base);
      const pat = o.pattern || o.frame_pattern || o.framePattern || o.template;
      const n = o.frames || o.count || o.n || o.frame_count || o.frameCount;
      if (typeof pat === 'string' && typeof n === 'number') {
        const id = idOf(ctx) || idOf(pat) || idOf(JSON.stringify(o).slice(0, 200));
        const list = expandPattern(pat, n, o.start || 0).map(s => rpath(s, b));
        if (id) tt[id] = list;
      }
      for (const k in o) { if (k === 'pattern' || k === 'base' || k === 'dir') continue; walk(o[k], ctx + ' ' + k + (typeof o.id === 'string' ? ' ' + o.id : '') + (typeof o.product === 'string' ? ' ' + o.product : ''), b); }
    }
  }
  walk(m, '', RBASE);
  for (const id in tt) { tt[id] = Array.from(new Set(tt[id])).sort(); if (tt[id].length < 6) { const h = hero[id] = hero[id] || {}; h.src = h.src || tt[id][0]; delete tt[id]; } }
  return {hero, tt, sculpt};
}
const lastMod = u => new Promise(res => { try { const x = new XMLHttpRequest(); x.open('HEAD', u, true); x.onload = () => res(Date.parse(x.getResponseHeader('Last-Modified') || '') || 0); x.onerror = () => res(0); x.send(); } catch (e) { res(0); } });
async function loadRenders() {
  const m = await xhrJSON(RBASE + 'manifest.json?t=' + Math.floor(Date.now() / 30000));
  if (!m) return false;
  const sig = JSON.stringify(m); if (sig === RND.sig) return false;
  const r = parseManifest(m);
  /* a turntable rendered before the pack was re-art-directed must not stand in for the new still: if its frames are
     more than five minutes older than the hero still, the product moment uses the still (tilt) until new frames land */
  await Promise.all(Object.keys(r.tt).map(async id => { const h = r.hero[id]; if (!h || !h.src) return; const [a, b] = await Promise.all([lastMod(h.src), lastMod(r.tt[id][0])]); if (a && b && a - b > 300000) delete r.tt[id]; }));
  RND.raw = m; RND.sig = sig; RND.hero = r.hero; RND.tt = r.tt; RND.sculpt = r.sculpt; RND.extra = r.extra || {};
  /* if the render agent states a pack's material, the dossier follows the render rather than the older build notes */
  if (Array.isArray(m.assets)) m.assets.forEach(a => { const t = a && (a.material || a.materials || a.mat); if (t && PACK[a.product] && typeof t === 'string') PACK[a.product].mat = t; });
  return true;
}
const heroSrc = id => (RND.hero[id] && (RND.hero[id].src || RND.hero[id].thumb)) || (RND.tt[id] && RND.tt[id][0]) || null;
const thumbSrc = id => (RND.hero[id] && (RND.hero[id].thumb || RND.hero[id].src)) || (RND.tt[id] && RND.tt[id][0]) || null;

/* hand-drawn frosted silhouettes: stand-ins until the renders land, and for other collections */
let SVGN = 0;
function packSVG(p, cls) {
  const k = kindOf(p), u = 'g' + (++SVGN), bone = p.id === '08-1';
  const frost = `<linearGradient id="${u}f" x1="0" x2="1"><stop offset="0" stop-color="#b9c4ca"/><stop offset=".18" stop-color="#e4eaed"/><stop offset=".42" stop-color="#d3dce1"/><stop offset=".62" stop-color="#eef2f4"/><stop offset=".86" stop-color="#cfd8dd"/><stop offset="1" stop-color="#aeb9bf"/></linearGradient>`;
  const alu = `<linearGradient id="${u}a" x1="0" x2="1"><stop offset="0" stop-color="#7f8a90"/><stop offset=".3" stop-color="#d9dfe2"/><stop offset=".55" stop-color="#9aa4aa"/><stop offset=".8" stop-color="#e8ecee"/><stop offset="1" stop-color="#7c878d"/></linearGradient>`;
  const dark = `<linearGradient id="${u}d" x1="0" x2="1"><stop offset="0" stop-color="#1b2226"/><stop offset=".45" stop-color="#3c464b"/><stop offset="1" stop-color="#161c1f"/></linearGradient>`;
  const boneG = `<linearGradient id="${u}b" x1="0" x2="1"><stop offset="0" stop-color="#b9b6ae"/><stop offset=".45" stop-color="#ebe8e1"/><stop offset="1" stop-color="#aeaba3"/></linearGradient>`;
  const lbl = (x, y, w) => `<g fill="#26303a" opacity=".72"><rect x="${x}" y="${y}" width="${w * .42}" height="2.2"/><rect x="${x}" y="${y + 6}" width="${w * .7}" height=".8"/><rect x="${x}" y="${y + 9}" width="${w * .55}" height=".8"/></g><text x="${x}" y="${y - 4}" font-family="DM Mono, monospace" font-size="6" letter-spacing="1" fill="#26303a" opacity=".8">${p.id}</text>`;
  let vb, body;
  if (k === 'dropper') {
    vb = '0 0 100 300';
    body = `<rect x="38" y="4" width="24" height="58" rx="11" fill="url(#${u}${bone ? 'b' : 'd'})"/><rect x="33" y="56" width="34" height="30" rx="2" fill="url(#${u}a)"/>${Array.from({length: 11}, (_, i) => `<rect x="${35 + i * 2.9}" y="58" width=".8" height="26" fill="#fff" opacity=".22"/>`).join('')}<path d="M40 86h20v10c0 10 28 14 28 32v152c0 9-6 14-14 14H26c-8 0-14-5-14-14V128c0-18 28-22 28-32z" fill="url(#${u}f)" opacity=".96"/><rect x="48.6" y="86" width="2.8" height="170" rx="1.4" fill="#fff" opacity=".35"/><path d="M14 196h72v84c0 7-5 12-12 12H26c-7 0-12-5-12-12z" fill="#fff" opacity=".18"/>${lbl(24, 150, 52)}<path d="M18 132v148" stroke="#fff" stroke-width="3" opacity=".35"/>`;
  } else if (k === 'jar') {
    vb = '0 0 200 160';
    body = `<rect x="22" y="8" width="156" height="42" rx="4" fill="url(#${u}a)"/>${Array.from({length: 40}, (_, i) => `<rect x="${24 + i * 3.8}" y="10" width=".7" height="38" fill="#fff" opacity=".18"/>`).join('')}<path d="M18 50h164v92c0 8-6 14-14 14H32c-8 0-14-6-14-14z" fill="url(#${u}f)"/><rect x="26" y="54" width="6" height="96" fill="#fff" opacity=".35"/>${lbl(70, 96, 60)}`;
  } else if (k === 'pouch') {
    vb = '0 0 160 220';
    body = `<path d="M20 10h120l6 196c0 6-4 10-10 10H24c-6 0-10-4-10-10z" fill="url(#${u}a)"/><rect x="20" y="10" width="120" height="14" fill="#000" opacity=".12"/>${lbl(42, 110, 76)}`;
  } else {
    vb = '0 0 120 240';
    const capFill = `url(#${u}a)`;
    body = `<rect x="22" y="4" width="76" height="50" rx="5" fill="${capFill}"/>${Array.from({length: 24}, (_, i) => `<rect x="${24 + i * 3.05}" y="6" width=".7" height="46" fill="#fff" opacity=".16"/>`).join('')}<rect x="30" y="52" width="60" height="12" fill="url(#${u}f)"/><path d="M14 64h92c6 0 10 4 10 12v148c0 8-5 12-12 12H16c-7 0-12-4-12-12V76c0-8 4-12 10-12z" fill="url(#${u}${p.id === '08-5' ? 'd' : 'f'})"/><rect x="12" y="70" width="5" height="160" fill="#fff" opacity=".32"/>${lbl(30, 132, 60)}`;
  }
  return `<svg class="${cls || ''}" viewBox="${vb}" role="presentation" aria-hidden="true" preserveAspectRatio="xMidYMax meet"><defs>${frost}${alu}${dark}${boneG}</defs>${body}</svg>`;
}
/* every pack sits at true relative scale: the box height stands for 125 mm, and each render is placed by its own alpha bounds */
const MM = p => (PACK[p.id] ? PACK[p.id].h : ({dropper: 120, jar: 63, bottle: 110, pouch: 125})[kindOf(p)]);
const SVGBB = {dropper: [.12, .013, .88, .98], jar: [.09, .05, .91, .975], bottle: [.03, .017, .97, .983], pouch: [.09, .045, .91, .98]};
const BBC = new Map();
function setFit(el, bb, mm) {
  const bh = Math.max(.05, bb[3] - bb[1]);
  el.style.setProperty('--s', (mm / 125 / bh).toFixed(4));
  el.style.setProperty('--cx', ((bb[0] + bb[2]) / 2).toFixed(4));
  el.style.setProperty('--by', (1 - bb[3]).toFixed(4));
  el.classList.add('fitted');
}
/* feather the render frame around the object, so a shadow-catcher skirt never shows a box edge */
function maskTo(el, bb) {
  if (!el || !bb) return; const f = v => (v * 100).toFixed(1) + '%';
  const a0 = Math.max(.02, bb[0] - .03), a1 = Math.min(.97, bb[2] + .03), b0 = Math.max(.02, bb[1] - .02), b1 = Math.min(.97, bb[3] + .01);
  /* fades always finish inside the frame, so no edge is ever left partly opaque */
  [['--a0', a0], ['--a1', a1], ['--b0', b0], ['--b1', b1], ['--f0', Math.max(0, a0 - .16)], ['--f1', Math.min(1, a1 + .22)], ['--g0', Math.max(0, b0 - .08)], ['--g1', Math.min(1, b1 + .1)]].forEach(([k, v]) => el.style.setProperty(k, f(v)));
}
function alphaBBox(img) {
  if (BBC.has(img.src)) return BBC.get(img.src);
  let bb = null;
  try {
    const w = 120, h = Math.round(120 * img.naturalHeight / img.naturalWidth), c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(img, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 200) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 > x0) bb = [x0 / w, y0 / h, (x1 + 1) / w, (y1 + 1) / h];
  } catch (e) {}
  BBC.set(img.src, bb); return bb;
}
function fitAll(root) {
  $$('img.fit:not(.fitted), svg.fit:not(.fitted)', root).forEach(el => {
    const p = byId(el.dataset.id); if (!p) return;
    if (el.tagName.toLowerCase() === 'svg') return setFit(el, SVGBB[kindOf(p)], MM(p));
    const go = () => { const bb = alphaBBox(el) || [.15, .15, .85, .85]; maskTo(el, bb); setFit(el, bb, MM(p)); };
    if (el.complete && el.naturalWidth) go(); else el.addEventListener('load', go, {once: true});
  });
}
function packHTML(p, opt) {
  const s = opt && opt.thumb ? thumbSrc(p.id) : heroSrc(p.id);
  return s ? `<img class="fit" data-id="${p.id}" src="${esc(s)}" alt="" decoding="async" ${opt && opt.eager ? '' : 'loading="lazy"'} draggable="false">` : packSVG(p, 'fit').replace('<svg ', `<svg data-id="${p.id}" `);
}

/* ================================================================ sound (off unless chosen) */
const SND = {on: false, ctx: null, room: null};
function audio() {
  if (SND.ctx) return SND.ctx;
  try {
    const C = new (window.AudioContext || window.webkitAudioContext)(); SND.ctx = C;
    const master = C.createGain(); master.gain.value = 0; master.connect(C.destination); SND.master = master;
    const len = C.sampleRate * 3, buf = C.createBuffer(2, len, C.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.2; } }
    const n = C.createBufferSource(); n.buffer = buf; n.loop = true;
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    const g = C.createGain(); g.gain.value = .32; n.connect(lp).connect(g).connect(master); n.start();
    [55, 82.41, 110.3].forEach((f, i) => { const o = C.createOscillator(); o.frequency.value = f; const og = C.createGain(); og.gain.value = [.035, .02, .008][i]; const l = C.createOscillator(); l.frequency.value = .05 + i * .03; const lg = C.createGain(); lg.gain.value = og.gain.value * .6; l.connect(lg).connect(og.gain); o.connect(og).connect(master); o.start(); l.start(); });
    SND.noise = buf; return C;
  } catch (e) { return null; }
}
function setSound(on) {
  SND.on = on; const C = on ? audio() : SND.ctx;
  if (C) { if (on && C.state === 'suspended') C.resume(); SND.master.gain.cancelScheduledValues(C.currentTime); SND.master.gain.setTargetAtTime(on ? .55 : 0, C.currentTime, on ? 1.2 : .25); }
  $('#gSnd').setAttribute('aria-pressed', on); $('#mSnd').setAttribute('aria-pressed', on); $('#mSndL').textContent = on ? 'On' : 'Off';
  $('.gate .q').textContent = on ? 'Sound is on.' : 'Sound is off.';
}
function cue(kind) {
  if (!SND.on || !SND.ctx) return; const C = SND.ctx, t = C.currentTime;
  if (kind === 'frost') {
    const s = C.createBufferSource(); s.buffer = SND.noise; const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(5200, t + 1.1);
    const g = C.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .5); g.gain.exponentialRampToValueAtTime(.0005, t + 1.6); s.connect(bp).connect(g).connect(SND.master); s.start(t); s.stop(t + 1.7);
  } else {
    [[1318.5, 0], [1975.5, .09], [2637, .2]].forEach(([f, d], i) => { const o = C.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = C.createGain(); g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime([.05, .035, .018][i], t + d + .01); g.gain.exponentialRampToValueAtTime(.0004, t + d + 1.8); o.connect(g).connect(SND.master); o.start(t + d); o.stop(t + d + 2); });
  }
}

/* ================================================================ atmosphere: one fullscreen shader, photo behind frosted glass */
const PH = n => 'assets/photos/' + n + (isPhone() || (devicePixelRatio || 1) < 1.5 && innerWidth < 1500 ? '-1200' : '') + '.webp';
const SCN = {
  arrival: {img: 'portrait-calm', asp: 1921 / 2400, foc: [.5, .3], zoom: 1.0, frost: .8, wash: 0, tone: .78, blue: 1, fog: .3, dark: 0, rect: () => isPhone() ? [0, 0, 1, 1] : [.22, 0, .78, 1], feather: () => isPhone() ? 0 : .3},
  formulary: {img: 'eye-macro', asp: 1.5, foc: [.48, .5], zoom: 1.0, frost: .3, wash: .52, tone: 1, fog: .22, dark: 0, rect: () => [0, 0, 1, 1], feather: () => 0},
  interlude: {img: 'meteor', asp: 1, foc: [.5, .45], zoom: 1.02, frost: 0, wash: 0, tone: 0, fog: .14, dark: .12, rect: () => [0, 0, 1, 1], feather: () => 0},
  renew: {img: 'fog-ridge', asp: 1602 / 2400, foc: [.5, .62], zoom: 1.0, frost: .62, wash: .2, tone: 1, fog: .28, dark: 0, rect: () => [0, 0, 1, 1], feather: () => 0},
  protocol: {img: 'hand-linen', asp: 2048 / 2400, foc: [.62, .32], zoom: 1.0, frost: .8, wash: .5, tone: 1, warm: 1, fog: .16, dark: 0, rect: () => isPhone() ? [0, 0, 1, 1] : [.4, 0, 1, 1], feather: () => isPhone() ? 0 : .3},
  product: {img: 'skin-macro', asp: 1.5, foc: [.5, .5], zoom: 1.0, frost: .36, wash: .22, tone: 1, fog: .12, dark: 0, rect: () => [0, 0, 1, 1], feather: () => 0}
};
const GL = {ok: false, cur: 'arrival', veil: 0, intro: RM ? 0 : 1, mouse: [.5, .5], mt: [.5, .5], speed: 0, idle: 0};
const FRAG = /* glsl */`
precision highp float;
uniform sampler2D tA, tWipe;
uniform vec2 uRes, uMouse;
uniform vec4 uRect;
uniform vec2 uFoc;
uniform float uAsp, uZoom, uFeather, uTime, uFrost, uVeil, uIntro, uWash, uTone, uFog, uDark, uHas, uPush, uBlue, uWarm;
varying vec2 vUv;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){v+=a*vn(p);p=r*p*2.03+11.7;a*=.5;}return v;}
void main(){
  vec2 uv=vUv; float asp=uRes.x/uRes.y; vec2 q=uv*vec2(asp,1.);
  float t=uTime;
  /* the transition frost: crystals feather in from the edges, the centre goes last */
  float n1=fbm(q*3.1+3.7), n2=fbm(q*9.+t*.01);
  vec2 cd=(uv-.5)*vec2(asp,1.)/max(asp,1.);
  float ed=clamp(length(cd)*1.35,0.,1.);
  float fld=mix(1.-ed,n1,.42)+n2*.08;
  float v=smoothstep(fld-.07,fld+.07,uVeil*1.32-.16);
  float front=smoothstep(.0,.5,v)*(1.-smoothstep(.5,1.,v));
  /* cursor wipes the glass a little; it frosts back over */
  float wp=texture2D(tWipe,uv).r;
  float fr=clamp(uFrost*(1.-wp*.82)+v,0.,1.);
  /* glass micro-relief bends what is behind */
  float g1=vn(uv*uRes/2.6), g2=vn(uv*uRes/2.6+31.);
  vec2 rel=(vec2(g1,g2)-.5)*(.0025+.006*fr);
  vec2 rel2=(vec2(fbm(q*14.),fbm(q*14.+9.))-.5)*.035*fr;
  /* photo, cover-fitted into its rect, feathered into fog */
  vec2 r=(uv-uRect.xy)/(uRect.zw-uRect.xy);
  float rA=((uRect.z-uRect.x)*uRes.x)/((uRect.w-uRect.y)*uRes.y);
  vec2 s=rA>uAsp?vec2(1.,uAsp/rA):vec2(rA/uAsp,1.); s/=uZoom*(1.+uPush);
  vec2 f=vec2(uFoc.x,1.-uFoc.y); vec2 c=clamp(f,s*.5,1.-s*.5);
  vec2 p=c+(r-.5)*s+rel+rel2;
  float lod=mix(fr*5.2,7.2,v); float rad=mix(fr*.03,.085,v);
  vec3 ph=vec3(0.); float ang=h21(uv*uRes)*6.283;
  for(int i=0;i<8;i++){float a=float(i)*2.39996+ang;float rr=rad*sqrt((float(i)+.5)/8.);ph+=texture2DLodEXT(tA,p+vec2(cos(a),sin(a))*rr*vec2(1.,rA/max(uAsp,.01))*s.x,lod).rgb;}
  ph/=8.;
  float edge=min(min(r.x,1.-r.x),min(r.y,1.-r.y));
  float inside=uFeather>0.?smoothstep(0.,uFeather,edge+(n1-.5)*.12):step(0.,edge);
  inside*=uHas;
  /* fog field */
  vec3 dk=mix(vec3(.043,.071,.082),vec3(.106,.161,.18),uv.y*.4+n1*.35);
  vec3 pl=mix(vec3(.80,.84,.86),vec3(.90,.925,.94),uv.y*.6+n1*.25);
  /* the board's base: misty blue for arrival, warm paper for the ritual */
  pl=mix(pl,mix(vec3(.44,.56,.70),vec3(.74,.81,.88),clamp(uv.y*.9+n1*.3-.1,0.,1.)),uBlue);
  pl=mix(pl,mix(vec3(.86,.85,.82),vec3(.925,.918,.9),uv.y*.6+n1*.25),uWarm);
  vec3 fogc=mix(dk,pl,uTone);
  vec3 col=mix(fogc,ph,inside);
  float drift=fbm(q*1.5+vec2(t*.014,t*.005));
  float fb=smoothstep(.38,.86,drift)*uFog+uIntro*(.62+.38*drift);
  col=mix(col,mix(fogc,vec3(1.),.12*uTone),clamp(fb,0.,1.));
  /* frosted glass: a little milk, a little sparkle */
  vec3 milk=mix(vec3(.62,.70,.74),vec3(.93,.95,.96),uTone);
  col=mix(col,milk,fr*.16+uWash*.0);
  col=mix(col,pl,uWash);
  col=mix(col,col*vec3(1.025,1.,.955),uWarm);
  col=mix(col,col*vec3(.94,1.,1.07),uBlue*.6);
  col=mix(col,col*vec3(.84,.97,1.16)+vec3(.0,.015,.05),uBlue*inside*.85);
  col+=(h21(uv*uRes*.5)-.5)*.035*fr;
  /* veil: milky white, crystals at the front */
  vec3 vcol=mix(vec3(.80,.85,.875),vec3(.93,.95,.958),uTone*.6+.4);
  col=mix(col,vcol,v*.9);
  float xt=smoothstep(.62,.8,fbm(q*26.+n1*4.));
  col+=front*(.05+.18*xt)*vec3(.96,.99,1.);
  col*=1.-uDark;
  float vg=smoothstep(1.35,.25,length((uv-vec2(.5,.48))*vec2(asp*.62,1.)));
  col*=mix(1.,vg,mix(.32,.14,uTone));
  col+=(h21(uv*uRes+fract(t*7.1)*93.)-.5)*.022;
  gl_FragColor=vec4(col,1.);
}`;
async function initGL() {
  if (HTML.classList.contains('nogl')) return false;
  let THREE;
  try { THREE = await import('three'); } catch (e) { return false; }
  const canvas = $('#gl');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false}); }
  catch (e) { return false; }
  if (!renderer.getContext()) return false;
  GL.T = THREE; GL.r = renderer;
  renderer.setClearColor(0x0d1518, 1);
  GL.dprMax = Math.min(devicePixelRatio || 1, isPhone() ? 1.5 : 1.5); GL.dpr = GL.dprMax;
  renderer.setPixelRatio(GL.dpr);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const blank = new THREE.DataTexture(new Uint8Array([200, 208, 214, 255]), 1, 1); blank.needsUpdate = true;
  /* wipe trail: tiny ping-pong target */
  const rtO = {type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false};
  GL.wa = new THREE.WebGLRenderTarget(128, 128, rtO); GL.wb = new THREE.WebGLRenderTarget(128, 128, rtO);
  const vert = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}';
  GL.wm = new THREE.ShaderMaterial({uniforms: {tPrev: {value: GL.wa.texture}, uM: {value: new THREE.Vector2(.5, .5)}, uS: {value: 0}, uAsp: {value: 1}},
    vertexShader: vert, fragmentShader: 'uniform sampler2D tPrev;uniform vec2 uM;uniform float uS,uAsp;varying vec2 vUv;void main(){float p=texture2D(tPrev,vUv).r*.986;vec2 d=(vUv-uM)*vec2(uAsp,1.);float b=smoothstep(.16,0.,length(d))*uS;gl_FragColor=vec4(vec3(clamp(max(p,p+b*(1.-p)),0.,1.)),1.);}', depthTest: false});
  GL.mat = new THREE.ShaderMaterial({
    uniforms: {tA: {value: blank}, tWipe: {value: GL.wb.texture}, uRes: {value: new THREE.Vector2(1, 1)}, uMouse: {value: new THREE.Vector2(.5, .5)}, uRect: {value: new THREE.Vector4(0, 0, 1, 1)}, uFoc: {value: new THREE.Vector2(.5, .5)},
      uAsp: {value: 1}, uZoom: {value: 1}, uFeather: {value: 0}, uTime: {value: 0}, uFrost: {value: .8}, uVeil: {value: 0}, uIntro: {value: GL.intro}, uWash: {value: 0}, uTone: {value: 0}, uFog: {value: .3}, uDark: {value: 0}, uBlue: {value: 0}, uWarm: {value: 0}, uHas: {value: 0}, uPush: {value: 0}},
    vertexShader: vert, fragmentShader: FRAG, depthTest: false, depthWrite: false
  });
  GL.mat.extensions = {shaderTextureLOD: true};
  GL.scene = new THREE.Scene(); GL.scene.add(new THREE.Mesh(geo, GL.mat));
  GL.wscene = new THREE.Scene(); GL.wscene.add(new THREE.Mesh(geo, GL.wm));
  GL.cam = cam;
  GL.tex = {}; GL.loader = new THREE.TextureLoader();
  GL.U = GL.mat.uniforms;
  /* eased mirrors of every scene value */
  GL.v = {frost: .8, wash: 0, tone: 0, fog: .3, dark: 0, blue: 0, warm: 0, zoom: 1, foc: [.5, .34], rect: [0, 0, 1, 1], feather: 0, has: 0};
  resizeGL();
  addEventListener('resize', resizeGL);
  try { renderer.compile(GL.scene, cam); } catch (e) {}
  GL.ok = true; HTML.classList.add('gl');
  return true;
}
function resizeGL() {
  if (!GL.r) return; const w = innerWidth, h = innerHeight;
  GL.r.setSize(w, h, false); GL.U.uRes.value.set(w * GL.dpr, h * GL.dpr); GL.wm.uniforms.uAsp.value = w / h;
}
function glTex(name) {
  if (!GL.ok) return null;
  if (GL.tex[name]) return GL.tex[name];
  const T = GL.T, rec = GL.tex[name] = {ready: false, t: null};
  GL.loader.load(PH(name), tx => {
    tx.colorSpace = T.NoColorSpace; tx.generateMipmaps = true; tx.minFilter = T.LinearMipmapLinearFilter; tx.magFilter = T.LinearFilter;
    tx.wrapS = tx.wrapT = T.ClampToEdgeWrapping; tx.anisotropy = 1;
    rec.t = tx; rec.ready = true; GL.r.initTexture(tx); GL.dirty = true;
  }, undefined, () => { rec.failed = true; });
  return rec;
}
function setScene(k) { GL.cur = k; glTex(SCN[k].img); }
const glTo = (o, k, target, rate) => { o[k] += (target - o[k]) * rate; };
function renderGL(dt, t) {
  if (!GL.ok) return;
  const S = SCN[GL.cur], v = GL.v, U = GL.U, rec = glTex(S.img), r = Math.min(1, dt * 3.2), rr = Math.min(1, dt * 2);
  /* the photo swaps only while the glass is fully frosted, or before anything is visible */
  if (rec && rec.ready && U.tA.value !== rec.t && (GL.veil > .965 || v.has < .02 || GL.snap)) { U.tA.value = rec.t; U.uAsp.value = S.asp; v.foc = S.foc.slice(); v.rect = S.rect(); v.feather = S.feather(); v.zoom = S.zoom * (GL.extraZoom || 1); GL.snap = false; }
  if (GL.hard) { GL.hard = false; v.tone = S.tone; v.wash = S.wash; v.fog = S.fog; v.dark = S.dark; v.frost = S.frost; v.blue = S.blue || 0; v.warm = S.warm || 0; }
  const live = U.tA.value === (rec && rec.t);
  glTo(v, 'has', live ? 1 : 0, Math.min(1, dt * 1.6));
  /* the CSS poster holds the arrival until the world has its first photograph */
  if (!GL.posterOff && v.has > .9) { GL.posterOff = true; document.documentElement.classList.add('glready'); }
  const A = GL.arr || {frost: 0, push: 0, foc: 0};
  const frostT = S.frost + (GL.cur === 'arrival' ? A.frost : 0);
  glTo(v, 'frost', frostT, r); glTo(v, 'wash', S.wash, r); glTo(v, 'tone', S.tone, rr); glTo(v, 'fog', S.fog, r); glTo(v, 'dark', S.dark, rr); glTo(v, 'blue', S.blue || 0, rr); glTo(v, 'warm', S.warm || 0, rr);
  if (live) { const fx = S.foc[0], fy = S.foc[1] + (GL.cur === 'arrival' ? A.foc : 0); v.foc[0] += (fx - v.foc[0]) * r; v.foc[1] += (fy - v.foc[1]) * r; const R2 = S.rect(); for (let i = 0; i < 4; i++) v.rect[i] += (R2[i] - v.rect[i]) * r; v.feather += (S.feather() - v.feather) * r; v.zoom += (S.zoom - v.zoom) * r; }
  U.uFrost.value = v.frost; U.uWash.value = v.wash; U.uTone.value = v.tone; U.uFog.value = v.fog; U.uDark.value = v.dark; U.uBlue.value = v.blue; U.uWarm.value = v.warm; U.uHas.value = v.has;
  U.uFoc.value.set(v.foc[0], v.foc[1]); U.uRect.value.set(v.rect[0], v.rect[1], v.rect[2], v.rect[3]); U.uFeather.value = v.feather; U.uZoom.value = v.zoom;
  U.uPush.value = GL.cur === 'arrival' ? A.push : GL.cur === 'interlude' ? .1 * (GL.int || 0) : 0;
  U.uVeil.value = GL.veil; U.uIntro.value = GL.intro; U.uTime.value = t;
  /* wipe: speed-driven brush, very soft */
  GL.mouse[0] += (GL.mt[0] - GL.mouse[0]) * Math.min(1, dt * 9); GL.mouse[1] += (GL.mt[1] - GL.mouse[1]) * Math.min(1, dt * 9);
  GL.speed *= Math.pow(.02, dt);
  const W = GL.wm.uniforms; W.tPrev.value = GL.wa.texture; W.uM.value.set(GL.mouse[0], GL.mouse[1]); W.uS.value = RM ? 0 : clamp(GL.speed * .9, 0, .5);
  GL.r.setRenderTarget(GL.wb); GL.r.render(GL.wscene, GL.cam); GL.r.setRenderTarget(null);
  U.tWipe.value = GL.wb.texture; const tmp = GL.wa; GL.wa = GL.wb; GL.wb = tmp;
  GL.r.render(GL.scene, GL.cam);
}
function onPointer(e) {
  const x = e.clientX / innerWidth, y = 1 - e.clientY / innerHeight;
  const dx = x - GL.mt[0], dy = y - GL.mt[1]; GL.speed = Math.min(1, GL.speed + Math.hypot(dx * innerWidth / innerHeight, dy) * 5);
  GL.mt = [x, y]; GL.idle = 0;
}

/* no-WebGL: the same structure, as soft photographic layers */
function initNoGL() {
  HTML.classList.add('nogl');
  $('#ngl').innerHTML = Object.keys(SCN).map(k => `<div class="ng" data-k="${k}" style="background-image:url(${PH(SCN[k].img)});background-position:${SCN[k].foc[0] * 100}% ${SCN[k].foc[1] * 100}%"></div>`).join('');
}
function setNoGL(k) { $$('#ngl .ng').forEach(n => n.classList.toggle('on', n.dataset.k === k)); }

/* veil: GL frost + a DOM blur so the type frosts with the world */
const VEIL = $('#veil');
let FB = 0; const frostBusy = () => FB > 0;
function setVeil(k) {
  GL.veil = k;
  VEIL.style.display = k > .002 ? 'block' : 'none';
  if (GL.ok) { VEIL.style.setProperty('--vb', (k * 22).toFixed(1) + 'px'); VEIL.style.opacity = 1; }
  else VEIL.style.opacity = k;
}
function tween(d, fn, ease) {
  return new Promise(res => { const t0 = performance.now(); const e = ease || eio; (function step(n) { const t = clamp((n - t0) / (d * 1000)); fn(e(t)); if (t < 1) requestAnimationFrame(step); else res(); })(t0); });
}
async function frostCut(swap, opts) { FB++; try { await frostCutRaw(swap, opts); } finally { FB--; } }
async function frostCutRaw(swap, opts) {
  opts = opts || {};
  if (RM) { VEIL.style.transition = 'opacity .35s'; GL.veil = 1; VEIL.style.display = 'block'; VEIL.style.opacity = 0; void VEIL.offsetWidth; VEIL.style.opacity = 1; if (!GL.ok) {} await sleep(GL.ok ? 60 : 360); await swap(); GL.snap = true; await sleep(80); GL.veil = 0; VEIL.style.opacity = 0; await sleep(350); VEIL.style.transition = ''; VEIL.style.display = 'none'; return; }
  cue('frost'); const a = GL.veil;
  await tween(opts.inD || .85, t => setVeil(mix(a, 1, t)), t => t * t * (3 - 2 * t));
  await swap();
  await sleep(90);
  await tween(opts.outD || 1.25, t => setVeil(1 - t), eo);
  setVeil(0);
}

/* ================================================================ bar, counts, toast */
function updCount(beat) {
  const n = count();
  $$('[data-cnt]').forEach(el => { el.textContent = pad2(n); el.classList.toggle('has', n > 0); if (beat && !RM) { el.classList.remove('beat'); void el.offsetWidth; el.classList.add('beat'); setTimeout(() => el.classList.remove('beat'), 700); } });
  $$('[data-cnt2]').forEach(el => el.textContent = pad2(n) + (n === 1 ? ' item' : ' items'));
  $$('[data-pc]').forEach(a => a.setAttribute('aria-label', 'Your Protocol, ' + n + (n === 1 ? ' item' : ' items')));
}
let toastT;
function toast(html, ms) { const t = $('#toast'); t.innerHTML = html; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms || 4200); }
const say = s => { $('#live').textContent = ''; setTimeout(() => $('#live').textContent = s, 30); };

/* member menu */
const memB = $('#memB'), menu = $('#menu');
function menuOpen(on) {
  memB.setAttribute('aria-expanded', on); menu.hidden = !on;
  if (on) { const f = menu.querySelector('a,button'); f && f.focus(); }
}
memB.addEventListener('click', () => menuOpen(menu.hidden));
document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target) && !memB.contains(e.target)) menuOpen(false); });
menu.addEventListener('keydown', e => { if (e.key === 'Escape') { menuOpen(false); memB.focus(); } });
menu.addEventListener('click', e => { if (e.target.closest('a')) menuOpen(false); });
$('#mSnd').addEventListener('click', () => setSound(!SND.on));
$('#gSnd').addEventListener('click', () => { setSound(true); go('#formulary'); });
$('#gQuiet').addEventListener('click', () => { setSound(false); go('#formulary'); });

/* ================================================================ chapters & scroll */
const CH = ['arrival', 'formulary', 'interlude', 'renew', 'protocol'].map(id => ({id, el: document.getElementById(id)}));
const SECT = Object.fromEntries(CH.map(c => [c.id, c]));
let VH = innerHeight, lenis = null, SY = 0, lastSY = -1, BOUND = [];
function measure() {
  measureTouch();
  VH = innerHeight;
  CH.forEach(c => { c.top = c.el.offsetTop; c.h = c.el.offsetHeight; c.run = Math.max(1, c.h - VH); });
  /* boundaries: where one chapter hands the glass to the next */
  BOUND = [];
  for (let i = 1; i < CH.length; i++) {
    const c = CH[i], prev = CH[i - 1];
    const y = c.id === 'protocol' ? prev.top + prev.run : c.top;
    BOUND.push({y, a: prev.id, b: c.id, w: VH * (c.id === 'protocol' ? .55 : .42)});
  }
  if (!RM) { SECT.formulary.el.style.marginTop = SECT.interlude.el.style.marginTop = SECT.renew.el.style.marginTop = (-VH) + 'px'; }
  CH.forEach(c => { c.top = c.el.offsetTop; c.h = c.el.offsetHeight; c.run = Math.max(1, c.h - VH); });
  BOUND.forEach((b, i) => { const c = CH[i + 1], prev = CH[i]; b.y = c.id === 'protocol' ? prev.top + prev.run + VH * .15 : c.top; });
}
function prog(id) { const c = SECT[id]; return clamp((SY - c.top) / c.run); }
function chapterAt(y) {
  let k = CH[0].id; for (const b of BOUND) if (y >= b.y) k = b.b; return k;
}
/* how veiled is the world at scroll y, and how faded is each chapter's type */
function veilAt(y) { let v = 0; for (const b of BOUND) v = Math.max(v, 1 - sm(0, b.w, Math.abs(y - b.y))); return v; }
function edgeOf(id, y) {
  let e = 0; for (const b of BOUND) {
    if (b.a === id) e = Math.max(e, sm(b.y - b.w, b.y - b.w * .15, y));
    if (b.b === id) e = Math.max(e, 1 - sm(b.y + b.w * .1, b.y + b.w * .9, y));
  }
  return e;
}

/* --- arrival */
const touchEl = $('#touch');
/* the stem runs from the point of light down to the headline */
function measureTouch() {
  if (!touchEl) return; const st = touchEl.parentElement.getBoundingClientRect(), h = $('#arrH').getBoundingClientRect();
  const ty = isPhone() ? .26 : .3, y = st.height * ty;
  touchEl.style.setProperty('--stem', Math.max(20, h.top - st.top - y - 30 - 26) + 'px');
}
document.fonts && document.fonts.ready.then(() => measureTouch());
const arrCopy = $('#arrCopy'), arrFoot = $('#arrFoot');
function arrival(p, e) {
  const k1 = sm(.04, .6, p), k2 = sm(.15, .95, p);
  GL.arr = {frost: -.36 * k1 + .1 * sm(.7, 1, p), push: .2 * eio(k2), foc: -.04 * k2};
  const lift = sm(.05, .42, p);
  arrCopy.style.setProperty('--e', Math.max(e, lift).toFixed(3));
  arrCopy.style.transform = RM ? '' : `translateY(${(-lift * 40).toFixed(1)}px)`;
  arrFoot.style.setProperty('--e', Math.max(e, sm(.02, .2, p)).toFixed(3));
  if (touchEl) { touchEl.style.setProperty('--e', Math.max(e, sm(.1, .5, p)).toFixed(3)); }
}

/* --- formulary: nine collections passing through the mist */
const fxWorld = $('#fxWorld'), fxLegend = $('#fxLegend'), fxHud = $('#fxHud');
const OFFX = [-5, 4, -2, 6, -6, 2, -4, 0, 5];
function buildFormulary() {
  fxWorld.innerHTML = CAT.map((co, i) => {
    const open = co.c === '08';
    return `<a class="fxr${open ? ' open' : ''}" role="listitem" href="${open ? '#renew' : '#c-' + co.c}" data-i="${i}" aria-label="${co.c} ${co.n}. ${co.d}. ${pad2(co.it.length)} products.${open ? ' Open: enter 08 Renew.' : ' Look test: shown in the full build.'}">
      <span class="c tnum">${co.c}</span><span class="nm">${open ? '<em>' + co.n + '</em>' : co.n}</span><span class="go">${open ? 'Enter' + ic('arrow', 's') : pad2(co.it.length) + ' products'}</span><span class="d">${esc(co.d)}.</span></a>`;
  }).join('');
  fxLegend.innerHTML = CAT.map((co, i) => `<a href="${co.c === '08' ? '#renew' : '#c-' + co.c}" data-i="${i}" class="tnum${co.c === '08' ? ' open' : ''}">${co.c}</a>`).join('');
  placeEyeLabels();
  $$('.fxr', fxWorld).forEach(a => a.addEventListener('focus', () => { if (RM) return; const i = +a.dataset.i; scrollToY(SECT.formulary.top + SECT.formulary.run * fxPFor(i), true); }));
}
/* leader-line labels on the eye itself (pins #34/#58): image points mapped through the same cover-fit as the shader */
function coverPt(px, py, S) {
  const W = innerWidth, H = innerHeight, rA = W / H, asp = S.asp;
  let sx = rA > asp ? 1 : rA / asp, sy = rA > asp ? asp / rA : 1; sx /= S.zoom; sy /= S.zoom;
  const cx = clamp(S.foc[0], sx / 2, 1 - sx / 2), cy = clamp(1 - S.foc[1], sy / 2, 1 - sy / 2);
  return [((px - cx) / sx + .5) * W, (1 - ((1 - py - cy) / sy + .5)) * H];
}
const EYE = [['in (focus)', .383, .43, 'big'], ['iris, not to scale', .43, .475], ['lash line', .505, .3]];
function placeEyeLabels() {
  const S = SCN.formulary, W = innerWidth, ph = isPhone(), gl = ph ? 16 : 49;
  const pts = (ph ? EYE.slice(0, 1) : EYE).map(([t, x, y, c], i) => {
    const [sx, sy] = coverPt(x, y, S);
    const ly = ph ? sy - 70 : [sy - 120, sy + 92, sy - 64][i];
    const lx = ph ? Math.min(W - 150, sx + 40) : [gl, gl, Math.min(W * .5, sx + 120)][i];
    const right = !ph && i === 2;
    return {t, c, sx, sy, lx, ly, right};
  });
  /* labels first, then leaders drawn to each label's measured underline, so a line never runs through the words */
  fxHud.innerHTML = pts.map(q => `<span class="w${q.c ? ' big' : ''}" style="left:${q.lx.toFixed(0)}px;top:${q.ly.toFixed(0)}px">${q.t}</span>`).join('');
  const spans = $$('.w', fxHud);
  const paths = pts.map((q, i) => {
    const r = spans[i].getBoundingClientRect(), w = r.width, uy = q.ly + r.height + (q.c ? 2 : 5), f = v => v.toFixed(1);
    const near = q.right || ph ? q.lx - 6 : q.lx + w + 10, far = q.right || ph ? q.lx + w : q.lx;
    return `<circle cx="${f(q.sx)}" cy="${f(q.sy)}" r="3"/><circle class="o" cx="${f(q.sx)}" cy="${f(q.sy)}" r="9"/><path d="M${f(q.sx)} ${f(q.sy)} L${f(near)} ${f(uy)} L${f(far)} ${f(uy)}"/>`;
  }).join('');
  fxHud.insertAdjacentHTML('afterbegin', `<svg class="fx-lead" viewBox="0 0 ${W} ${innerHeight}" aria-hidden="true">${paths}</svg>`);
}
const FX_A = .1, FX_B = .8;
const fxPFor = i => FX_A + (FX_B - FX_A) * ((i + .4) / 7.4);
const dwell = x => { const k = Math.floor(x), f = x - k; return k + f - Math.sin(2 * Math.PI * f) / (2 * Math.PI); };
let fxLast = -9;
function formulary(p, e) {
  const f = dwell(clamp((p - FX_A) / (FX_B - FX_A)) * 7.4 + .6) - 1;
  const head = $('#fxHead'); head.style.setProperty('--e', Math.max(e, sm(.06, .2, p) * .0).toFixed(3));
  fxLegend.style.setProperty('--e', e.toFixed(3));
  fxHud.style.opacity = (1 - e).toFixed(3);
  if (RM) return;
  if (Math.abs(f - fxLast) < .0005 && e === formulary.e) return; fxLast = f; formulary.e = e;
  /* one name at a time: the next rises in as the last one leaves; nothing ghosts behind */
  $$('.fxr', fxWorld).forEach((el, i) => {
    const d = i - f, ad = Math.abs(d);
    let o = (1 - sm(.16, .46, ad)) * (1 - e); if (i === 7 && f > 6.6) o = 1 - e;
    const y = d * 16, bl = sm(.06, .46, ad) * 5;
    el.style.transform = `translate3d(0, calc(-50% + ${y.toFixed(2)}vh), 0)`;
    el.style.opacity = o.toFixed(3); el.style.filter = bl > .2 ? `blur(${bl.toFixed(1)}px)` : 'none';
    el.style.visibility = o < .01 ? 'hidden' : 'visible';
  });
  const cur = clamp(Math.round(f), 0, 8);
  $$('a', fxLegend).forEach((a, i) => a.setAttribute('aria-current', i === cur ? 'true' : 'false'));
}

/* --- interlude */
const metCopy = $$('#metCopy p'), metT = $('#metT');
/* the stone is the photograph itself, full-bleed in the world; the copy is readable as soon as the chapter settles */
function interlude(p, e) {
  const tt = Math.floor(p * 9000 + 41);
  metT.textContent = 'T + ' + pad2(Math.floor(tt / 3600)) + ':' + pad2(Math.floor(tt / 60) % 60) + ':' + pad2(tt % 60);
  metCopy.forEach((el, i) => el.style.setProperty('--o', (sm(.06 + i * .1, .16 + i * .1, p) * (1 - e)).toFixed(3)));
  $('#metCopy').style.setProperty('--e', '0');
  $('#interlude').style.setProperty('--so', (sm(.03, .12, p) * (1 - e)).toFixed(3));
  $('.met-top').style.setProperty('--e', e.toFixed(3));
  GL.int = RM ? 0 : p;
}

/* --- 08 renew: the products come forward one at a time */
const rnTrack = $('#rnTrack'), rnFar = $('#rnFar'), rnMist = $('#rnMist');
const RN_A = .17, RN_B = .88;
const rnPFor = i => RN_A + (RN_B - RN_A) * (i / 5);
function buildRenew() {
  rnTrack.innerHTML = REN.map((p, i) => `<button type="button" class="pv" role="listitem" data-id="${p.id}" data-i="${i}" aria-label="${esc(p.n)}, ${p.g.toLowerCase()}, ${p.q}, ${money(p.po)}. Open the product.">
    <span class="brk" aria-hidden="true"></span><span class="xm" aria-hidden="true" style="top:calc(${((1 - MM(p) / 125) * 100).toFixed(1)}% - 34px)"><svg viewBox="0 0 26 10"><path d="M5 0v10M0 5h10M17 1l8 8M25 1l-8 8"/></svg></span><span class="fig">${packHTML(p, {eager: true})}</span><span class="sh" aria-hidden="true"></span>
    <span class="lab"><span class="c tnum">${p.id}</span><b>${esc(p.n)}</b><small class="tnum">${p.g} · ${p.q} · ${money(p.po)}</small><span class="open">View ${ic('arrow', 's')}</span></span></button>`).join('');
  $('#rnProg').innerHTML = REN.map(() => '<i></i>').join(''); fitAll(rnTrack);
  $$('.pv', rnTrack).forEach(b => {
    b.addEventListener('click', () => { RF.from = b; go('#p-' + b.dataset.id); });
    b.addEventListener('focus', () => { if (!RM && !PM.open) scrollToY(SECT.renew.top + SECT.renew.run * rnPFor(+b.dataset.i), true); });
  });
  buildList();
}
const RF = {f: -1, from: null};
function renew(p, e) {
  $$('.edge', SECT.renew.el).forEach(el => el.style.setProperty('--e', e.toFixed(3)));
  const f = dwell(clamp((p - RN_A) / (RN_B - RN_A)) * 5);
  const cur = clamp(Math.round(f), 0, 5);
  if (cur !== RF.cur) { RF.cur = cur; $('#rnCount').textContent = pad2(cur + 1) + ' / 06'; $('#rnNow').textContent = REN[cur].id + ' · ' + REN[cur].n; $$('#rnProg i').forEach((el, i) => el.classList.toggle('on', i === cur)); }
  if (RM) { $$('.pv', rnTrack).forEach(el => el.classList.add('focus')); return; }
  /* opener: the six together, then the procession */
  const op = $('#rnOpen'), ko = sm(.07, .15, p);
  if (op) { const has = op.classList.contains('on'); op.style.opacity = has ? ((1 - ko) * (1 - e)).toFixed(3) : 0; op.style.transform = op.classList.contains('tall') ? `translateX(${(ko * 4).toFixed(2)}vw) scale(${(1 + ko * .06).toFixed(3)})` : `translate(-50%,-50%) scale(${(1 + ko * .12).toFixed(3)})`; op.style.visibility = has && ko < .99 ? 'visible' : 'hidden'; }
  rnTrack.style.opacity = op && op.classList.contains('on') ? sm(.1, .16, p).toFixed(3) : '1';
  if (Math.abs(f - RF.f) < .0004 && e === RF.e) return; RF.f = f; RF.e = e;
  const ph = isPhone(), sp = ph ? 58 : 21;
  $$('.pv', rnTrack).forEach((el, i) => {
    const d = i - f, ad = Math.min(Math.abs(d), 3.2);
    const x = d * sp * (1 - .1 * Math.min(1, Math.abs(d) - 1 > 0 ? Math.abs(d) - 1 : 0));
    /* depth by scale and partial focus: neighbours stay legible, further ones recede */
    const s = 1 - Math.min(ad, 2.6) * (ph ? .2 : .19), y = -ad * (ph ? 1.2 : 3);
    const b = ad < .05 ? 0 : Math.min(7, ad * ad * (ph ? 1.6 : 1.2));
    let o = clamp(1 - ad * .14) * (1 - e);
    el.style.transform = `translate3d(${x.toFixed(2)}vw, ${y.toFixed(2)}vh, 0) scale(${s.toFixed(3)})`;
    el.style.filter = b > .15 ? `blur(${b.toFixed(1)}px)` : 'none';
    el.style.opacity = o.toFixed(3); el.style.zIndex = String(50 - Math.round(ad * 10));
    el.classList.toggle('focus', Math.abs(d) < .35);
    const lab = el.querySelector('.lab'); lab.style.opacity = clamp(1 - Math.abs(d) * 1.6).toFixed(3);
    el.tabIndex = 0;
  });
  rnFar.style.transform = `translate3d(${(-f * 2.4).toFixed(2)}vw, 0, 0) scale(${(1.04 + f * .01).toFixed(3)})`;
  rnFar.style.opacity = (.42 * (1 - e)).toFixed(3);
  rnMist.style.transform = `translate3d(${(-f * 7).toFixed(2)}vw, 0, 0)`;
  rnMist.style.opacity = (.7 * (1 - e)).toFixed(3);
}

/* --- list view */
const lst = $('#lst'), listB = $('#listB');
function buildList() {
  lst.innerHTML = `<div class="lst-h"><div><b>08 Renew</b><div class="mono tnum" style="color:var(--ink-mute);margin-top:2px">Six products · sample prices</div></div><button class="icbtn" type="button" id="lstX" aria-label="Close the list">${ic('x')}</button></div>` +
    REN.map(p => `<a href="#p-${p.id}" data-id="${p.id}"><span class="th">${packHTML(p, {thumb: true})}</span><span class="nm"><i class="tnum">${p.id}</i><b style="font-weight:500">${esc(p.n)}</b><small>${esc(keyLine(p))}</small></span><span class="pp tnum">${money(p.po)}<small>${p.g} · ${p.q}</small></span></a>`).join('');
  fitAll(lst); $('#lstX').addEventListener('click', () => listOpen(false, true));
  $$('a', lst).forEach(a => a.addEventListener('click', () => { listOpen(false); RF.from = listB; }));
}
function listOpen(on, focusBack) {
  listB.setAttribute('aria-expanded', on);
  if (on) { lst.hidden = false; requestAnimationFrame(() => lst.classList.add('on')); setTimeout(() => { const a = lst.querySelector('a'); a && a.focus(); }, 60); }
  else { lst.classList.remove('on'); setTimeout(() => { if (!lst.classList.contains('on')) lst.hidden = true; }, 600); if (focusBack) listB.focus(); if (location.hash === '#renew/list') history.replaceState(null, '', '#renew'); }
}
listB.addEventListener('click', () => { const on = listB.getAttribute('aria-expanded') !== 'true'; if (on) history.replaceState(null, '', '#renew/list'); listOpen(on); });
lst.addEventListener('keydown', e => { if (e.key === 'Escape') listOpen(false, true); });

/* ================================================================ the ritual (Your Protocol) */
const rtGrid = $('#rtGrid'), rtSum = $('#rtSum'), BAR = $('#bar');
rtGrid.addEventListener('scroll', () => rtNav(), {passive: true});
$('#rtPrev').addEventListener('click', () => rtStep(-1)); $('#rtNext').addEventListener('click', () => rtStep(1));
let NEWKEY = null;
/* card figure, after pin #1: a render only, never clip art. A lying-down still when the render agent has one (cap to the right),
   otherwise the upright render standing as it is: no CSS rotation, so a baked shadow never turns into a smear */
const lieSrc = id => { const h = RND.hero[id]; if (!h) return null; const ks = Object.keys(h).filter(k => !/fog/.test(k)); const order = PACK[id] && PACK[id].kind === 'jar' ? [/top/, /lie|lying|flat|side|recl|horiz/] : [/lie|lying|flat|side|recl|horiz/, /top/]; for (const re of order) for (const k of ks) if (re.test(k)) return h[k]; return null; };
/* close-ups the render agent publishes: per product (variant macro-cap, label, ...) or shared (product macro-*) */
function detailsFor(id) {
  const out = [], h = RND.hero[id] || {};
  const nm = k => /top/.test(k) ? 'Three-quarter, from above' : /cap/.test(k) ? 'Cap, close' : /label/.test(k) ? 'Label, close' : k.replace(/[-_]/g, ' ');
  /* close-ups read as photographs: the fog-backed version when there is one, otherwise the transparent one */
  for (const k in h) if (/macro|detail|close|cap|label/.test(k) && !/lie|lying|flat|fog/.test(k)) { const fk = Object.keys(h).find(x => x !== k && /fog/.test(x) && x.replace(/-?fog/, '').replace(/-?hero/, '') === k.replace(/-?hero/, '')); out.push({src: fk ? h[fk] : h[k], t: nm(k)}); }
  for (const k in h) if (/top/.test(k) && !/fog/.test(k)) { const fk = Object.keys(h).find(x => /top/.test(x) && /fog/.test(x)); out.push({src: fk ? h[fk] : h[k], t: nm(k)}); }
  for (const k in RND.extra) { const e = RND.extra[k]; if (/macro|detail/.test(e.product + ' ' + e.variant) && (!/08-[1-6]/.test(e.product) || e.product.indexOf(id) >= 0)) out.push({src: e.src, t: (e.label || (e.product + ' ' + e.variant)).replace(/[-_]/g, ' ')}); }
  return out.slice(0, 3);
}
function cardImg(p) {
  if (p.c !== '08') return `<span class="ci t"><b class="tnum">${p.c}</b><small>${esc(p.cn)} · pack render to follow</small></span>`;
  const lie = lieSrc(p.id), src = lie || heroSrc(p.id);
  if (!src) return `<span class="ci t"><b class="tnum">${p.id}</b><small>Render in progress</small></span>`;
  return `<span class="ci r ${lie ? 'lie' : 'up'}"><img data-id="${p.id}" src="${esc(src)}" alt="" decoding="async" draggable="false"></span>`;
}
/* true relative scale inside the card: 125 mm spans 78% of the figure (length when lying, height when standing) */
function fitCard(im) {
  const box = im.parentNode, BW = box.clientWidth, BH = box.clientHeight, p = byId(im.dataset.id);
  if (!BW || !BH || !p || !im.naturalWidth) return;
  const bb = alphaBBox(im) || [.12, .12, .88, .88], nw = im.naturalWidth, nh = im.naturalHeight, lie = box.classList.contains('lie');
  const cw = (bb[2] - bb[0]) * nw, ch = (bb[3] - bb[1]) * nh;
  let s = lie ? (MM(p) * BW * .78 / 125) / cw : (MM(p) * BH * .8 / 125) / ch;
  s = Math.min(s, BH * (lie ? .62 : .86) / ch, BW * .86 / cw);
  const cx = (bb[0] + bb[2]) / 2 * nw * s;
  im.style.width = (nw * s).toFixed(1) + 'px'; im.style.height = (nh * s).toFixed(1) + 'px';
  im.style.left = (BW / 2 - cx).toFixed(1) + 'px';
  im.style.top = (lie ? BH * .5 - (bb[1] + bb[3]) / 2 * nh * s : BH * .9 - bb[3] * nh * s).toFixed(1) + 'px';
  maskTo(im, bb);
  /* tighter feather in the cards: the contact shadow stays a whisper, never a smudge */
  const P = v => (Math.max(0, Math.min(1, v)) * 100).toFixed(1) + '%';
  im.style.setProperty('--f0', P(bb[0] - .05)); im.style.setProperty('--f1', P(bb[2] + .06)); im.style.setProperty('--g0', P(bb[1] - .04)); im.style.setProperty('--g1', P(bb[3] + .05));
  box.classList.add('fitted');
}
function fitCards() { $$('.ci.r img', rtGrid).forEach(im => im.complete && im.naturalWidth ? fitCard(im) : im.addEventListener('load', () => fitCard(im), {once: true})); }
/* the row scrolls sideways when the day holds more than fits; two plain steps, and the row itself takes arrow keys */
function rtNav() {
  const pv = $('#rtPrev'), nx = $('#rtNext'); if (!pv) return;
  const over = rtGrid.scrollWidth > rtGrid.clientWidth + 4;
  pv.parentNode.hidden = !over;
  pv.disabled = rtGrid.scrollLeft < 4; nx.disabled = rtGrid.scrollLeft > rtGrid.scrollWidth - rtGrid.clientWidth - 4;
}
function rtStep(d) { const c = rtGrid.querySelector('.card'); if (!c) return; rtGrid.scrollBy({left: d * (c.offsetWidth + parseFloat(getComputedStyle(rtGrid).columnGap || 20)), behavior: RM ? 'auto' : 'smooth'}); }
function renderRitual() {
  const R = ritual();
  /* one row, in the order of the day */
  const all = []; SLOTS.forEach(S => R[S.k].forEach(c => all.push(c)));
  all.sort((a, b) => a.time < b.time ? -1 : a.time > b.time ? 1 : 0);
  rtGrid.innerHTML = all.length ? all.map(c => {
    const sub = c.it.m === 'sub', p = c.p, S = c.S, key = c.it.id + ':' + c.it.m;
    const [hh, mi] = c.time.split(':').map(Number), dayF = ((hh * 60 + mi) / 1440 * 100).toFixed(1);
    const ap = pad2(((hh + 11) % 12) + 1) + ':' + pad2(mi) + (hh < 12 ? ' AM' : ' PM');
    return `<article class="card${NEWKEY === key ? ' new' : ''}" data-key="${key}" aria-label="${S.w} ${c.code}, ${ap}: ${esc(p.n)}">
        <div class="cv" aria-hidden="true">${cardImg(p)}</div>
        <div class="cb">
          <h3 class="cd">${S.w} ${c.code}</h3>
          <p class="row"><span>[${S.tag}]</span><span class="tnum">${ap}</span></p>
          <div class="tln" aria-hidden="true"><i style="left:${dayF}%"></i></div>
          <p class="nm">${esc(p.n)}</p>
          <p class="ds">${esc(p.w)}</p>
          <p class="ing">${esc(keyLine(p))}</p>
          <p class="ft"><span>[${sub ? '&#8635;' : '1'}] ${sub ? 'Every ' + c.it.fr + ' days' : 'Next dispatch only'}${c.it.q > 1 ? ' · ×' + c.it.q : ''}</span><a href="${p.c === '08' ? '#p-' + p.id : '#c-' + p.c}">[&rarr;] ${p.c === '08' ? 'View' : p.c + ' ' + esc(p.cn)}</a></p>
        </div>
      </article>`;
  }).join('') : `<p class="rt-empty">Nothing in your day yet. Products slot in here by the time their directions give: morning, daily or evening.</p>`;
  const rc = $('#rtCount'); if (rc) rc.textContent = pad2(all.length) + (all.length === 1 ? ' moment' : ' moments') + ' · ' + (all.length ? all[0].time + ' to ' + all[all.length - 1].time : 'none yet');
  fitCards(); rtNav();
  /* dial: a day, with each card marked at its time */
  const line = $('#dialLine');
  const marks = [];
  all.forEach(c => { const [h, m] = c.time.split(':').map(Number); marks.push((h * 60 + m) / 1440); });
  line.innerHTML = Array.from({length: 25}, (_, h) => `<span class="tk${h % 6 === 0 ? ' h' : ''}${h % 2 ? ' odd' : ''}" style="left:${(h / 24 * 100).toFixed(3)}%">${h % 3 === 0 ? `<span>${pad2(h % 24)}</span>` : ''}</span>`).join('') +
    marks.map(m => `<i class="mk" style="left:${(m * 100).toFixed(2)}%"></i>`).join('') + `<span class="nowmk" id="nowmk"></span>`;
  /* lines: subscription and one-time stay separate */
  const subs = PRO.items.filter(i => i.m === 'sub'), once = PRO.items.filter(i => i.m !== 'sub');
  const li = it => { const p = byId(it.id), k = PRO.items.indexOf(it); const pr = it.m === 'sub' ? p.ps : p.po; return `<li><b>${esc(p.n)}</b><span class="m tnum">${p.id} · ${it.m === 'sub' ? 'every ' + it.fr + ' days' : 'next dispatch only'}${it.st === 'paused' ? ' · paused' : ''}</span><span class="p tnum">${money(pr * it.q)}<span class="step" role="group" aria-label="Quantity of ${esc(p.n)}, ${it.m === 'sub' ? 'subscription' : 'one-time'}"><button type="button" data-q="-1" data-k="${k}" aria-label="Decrease">${ic('minus', 's')}</button><output class="tnum">${it.q}</output><button type="button" data-q="1" data-k="${k}" aria-label="Increase">${ic('plus', 's')}</button></span></span></li>`; };
  const tSub = subs.filter(i => i.st !== 'paused').reduce((s, i) => s + byId(i.id).ps * i.q, 0), tOnce = once.reduce((s, i) => s + byId(i.id).po * i.q, 0);
  rtSum.innerHTML = `<section class="lines frost" aria-labelledby="ls-h"><h3 id="ls-h">Subscription<small class="tnum">${subs.length} ${subs.length === 1 ? 'line' : 'lines'}</small></h3><ul>${subs.length ? subs.map(li).join('') : '<li class="empty">No standing items. Choose “Subscribe” on a product to add one.</li>'}</ul></section>
    <section class="lines frost" aria-labelledby="lo-h"><h3 id="lo-h">One-time<small class="tnum">${once.length} ${once.length === 1 ? 'line' : 'lines'}</small></h3><ul>${once.length ? once.map(li).join('') : '<li class="empty">Nothing one-time in the next dispatch.</li>'}</ul></section>
    <aside class="tot frost" aria-labelledby="lt-h"><h3 id="lt-h" class="mono" style="color:var(--ink-mute)">Next dispatch</h3><p class="big tnum" style="margin-top:10px">${fd(PRO.next)}</p><dl><dt>Subscription</dt><dd class="tnum">${money(tSub)}</dd><dt>One-time</dt><dd class="tnum">${money(tOnce)}</dd><dt>Delivery</dt><dd>Included</dd></dl><a class="btn wide" href="#m/dispatch">Review dispatch</a><p class="fine" style="margin-top:12px">Sample prices. Saved on this device, shared with the other Reserve previews.</p></aside>`;
  $$('button[data-q]', rtSum).forEach(b => b.addEventListener('click', () => {
    const it = PRO.items[+b.dataset.k]; if (!it) return; it.q += +b.dataset.q;
    if (it.q <= 0) { PRO.items.splice(+b.dataset.k, 1); say('Removed ' + byId(it.id).n + '.'); }
    savePro(); updCount(); NEWKEY = null; renderRitual();
    const nb = $$('button[data-q]', rtSum).find(x => x.dataset.k === b.dataset.k && x.dataset.q === b.dataset.q); nb && nb.focus();
  }));
  tickClock();
}
/* dot-matrix numerals, after pin #21: 5×7 cells, unlit dots kept faintly visible */
const DM = {0: '01110100011001110101110011000101110', 1: '00100011000010000100001000010001110', 2: '01110100010000100010001000100011111', 3: '11111000100010000010000011000101110', 4: '00010001100101010010111110001000010', 5: '11111100001111000001000011000101110', 6: '00110010001000011110100011000101110', 7: '11111000010001000100010000100001000', 8: '01110100011000101110100011000101110', 9: '01110100011000101111000010001001100'};
function dotMatrix(str) {
  let x = 0, dots = '';
  for (const ch of str) {
    if (ch === ':' || ch === '.') { for (let r = 0; r < 7; r++) { const on = ch === ':' ? r === 2 || r === 4 : r === 6; dots += `<circle cx="${x + .5}" cy="${r + .5}" r=".36"${on ? '' : ' class="off"'}/>`; } x += 2; continue; }
    if (ch === ' ') { x += 2; continue; }
    const g = DM[ch]; if (!g) continue;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) dots += `<circle cx="${x + c + .5}" cy="${r + .5}" r=".36"${g[r * 5 + c] === '1' ? '' : ' class="off"'}/>`;
    x += 6;
  }
  return `<svg class="dm" viewBox="0 0 ${x - 1} 7" aria-hidden="true">${dots}</svg>`;
}
function tickClock() {
  const d = new Date(), m = d.getHours() * 60 + d.getMinutes();
  const ck = $('#rtClock'); ck.innerHTML = dotMatrix(hm(m)); ck.setAttribute('aria-label', hm(m));
  const n = $('#nowmk'); if (n) n.style.left = (m / 1440 * 100).toFixed(2) + '%';
}
setInterval(tickClock, 30000);

/* ================================================================ product moment */
const PM = {open: false, id: null, mode: 'once', fr: 30, q: 1, frame: 0, frames: [], imgs: [], drag: null, vel: 0, tilt: 0, bbox: null};
const pmEl = $('#pm'), pmObj = $('#pmObj'), pmStage = $('#pmStage'), pmSvg = $('#pmSvg'), pmCo = $('#pmCo'), dz = $('#dz');
function dossier(p) {
  const P = PACK[p.id], ki = keyIng(p), co = CAT[7];
  const ingT = p.top
    ? `<table class="tbl"><thead><tr><th scope="col">Key ingredient</th><th scope="col" class="r">Concentration</th></tr></thead><tbody>${(CONC[p.id] || []).map(c => `<tr><th scope="row">${c[0]}</th><td class="r">${c[1]}</td></tr>`).join('')}</tbody></table><p class="fine" style="margin-top:8px">Concentrations are sample formulation values, confirmed before launch.</p>`
    : `<table class="tbl"><thead><tr><th scope="col">Ingredient</th><th scope="col" class="r">Per serving</th></tr></thead><tbody>${p.act.map(a => `<tr><th scope="row">${esc(a.name)}${a.form ? `<small>${MIN[a.name] ? 'as ' : ''}${esc(a.form)}</small>` : ''}</th><td class="r">${a.amt || 'In formula'}</td></tr>`).join('')}</tbody></table><p class="fine" style="margin-top:8px">Per serving of ${servingSize(p)}.</p>`;
  const tests = [['Identity', ki ? ki.n : 'Formula', 'FTIR / HPTLC'], ['Assay', ki ? ki.n + ', stated amount' : 'Stated amount', 'HPLC'], ['Heavy metals', 'Lead, cadmium, mercury, arsenic', 'ICP-MS'], ['Microbiology', 'Total aerobic count, yeasts and moulds', 'Ph. Eur. 2.6.12']];
  if (p.top) tests.push(['Preservative efficacy', 'Challenge test', 'ISO 11930']);
  const sec = (id, t, meta, body) => `<section class="ps" id="${id}" aria-labelledby="${id}-h"><h2 id="${id}-h" tabindex="-1">${t}<span>${meta}</span></h2>${body}</section>`;
  const ol = a => `<ol class="olist">${a.map((d, i) => `<li><span class="tnum">${pad2(i + 1)}</span><span>${d}</span></li>`).join('')}</ol>`;
  const idx = [['s-ov', 'Overview'], ['s-in', 'Ingredients'], ['s-di', 'Directions'], ['s-ca', 'Cautions'], ['s-ev', 'Evidence'], ['s-ts', 'Testing & Sourcing']];
  const words = p.n.split(' '), last = words.pop();
  return `<button class="dz-grip" type="button" id="dzGrip" aria-label="Expand the dossier" aria-expanded="false"></button>
  <div class="dz-sc" id="dzSc">
    <div class="code mono tnum"><span>${p.id} · 08 Renew</span><span>Sample price</span></div>
    <h1 class="disp" id="dzName" tabindex="-1">${esc(words.join(' '))} <em>${esc(last)}</em></h1>
    <p class="what">${esc(p.w)}</p>
    <div class="opt" role="radiogroup" aria-label="Purchase option">
      <button type="button" role="radio" id="oOnce" aria-checked="true" tabindex="0"><span class="t">One-time</span><span class="v tnum">${money(p.po)}</span></button>
      <button type="button" role="radio" id="oSub" aria-checked="false" tabindex="-1"><span class="t">Subscribe</span><span class="v tnum">${money(p.ps)}<small>per dispatch</small></span></button>
    </div>
    <div class="freq" id="freq" role="group" aria-label="Dispatch every" hidden><span class="lb">Every</span>${[30, 60, 90].map(d => `<button type="button" data-fr="${d}" aria-pressed="${d === 30}">${d} days</button>`).join('')}</div>
    <div class="buy"><span class="step" role="group" aria-label="Quantity"><button type="button" id="qDec" aria-label="Decrease quantity">${ic('minus', 's')}</button><output id="qty" class="tnum" aria-live="polite">1</output><button type="button" id="qInc" aria-label="Increase quantity">${ic('plus', 's')}</button></span>
      <button class="btn" type="button" id="addP"><span id="addL">Add to Protocol</span><span class="pr tnum" id="addPr">${money(p.po)}</span></button></div>
    <p class="slotline mono tnum" id="slotLine"></p>
    <p class="note" id="addNote" role="status"></p>
    <dl class="facts"><div><dt>Format</dt><dd>${p.g}</dd></div><div><dt>Quantity</dt><dd class="tnum">${p.q}</dd></div><div><dt>Use</dt><dd>${esc(p.s.replace('2 to 3', '2–3'))}</dd></div><div><dt>Pack</dt><dd class="tnum">Ø ${P.d} × ${P.h} mm</dd></div></dl>
    <nav class="dz-idx" aria-label="Dossier sections">${idx.map((x, i) => `<button type="button" data-jump="${x[0]}"${i ? '' : ' aria-current="true"'}>${x[1]}</button>`).join('')}</nav>
    ${sec('s-ov', 'Overview', 'What it is', `<p>${esc(p.w)}</p><p>${esc(purpose(p))} ${esc(P.mat)}, Ø ${P.d} × ${P.h} mm.</p><p class="fine" style="margin-top:12px">${p.id} sits in 08 Renew, which collects skin, hair and appearance products. The collection name describes where it sits in The Formulary, not what it does.</p>` + (() => { const d = detailsFor(p.id); return d.length ? `<div class="dtl">${d.map((x, i) => `<figure><img src="${esc(x.src)}" alt="" loading="lazy" decoding="async"><figcaption class="mono">Fig. ${pad2(i + 1)} · ${esc(x.t)}</figcaption></figure>`).join('')}</div>` : ''; })())}
    ${sec('s-in', 'Ingredients', p.top ? 'Key ingredients and full list' : 'Amount per serving', ingT + `<div class="inci"><b>Full ingredient list</b>${esc(fullList(p))}</div>`)}
    ${sec('s-di', 'Directions', 'How to use', ol(directions(p)) + '<h3 class="mini-h">Where it sits in your day</h3><div class="mini" id="mini"></div>')}
    ${sec('s-ca', 'Cautions', 'Read before use', ol(cautions(p)))}
    ${sec('s-ev', 'Evidence', 'References', `<p>${esc(p.e)}</p><div class="pend">${ic('info')}<div><b>Evidence summary: to be written and referenced before launch.</b><br>No studies are cited yet. P4CE does not make claims about what this product does.</div></div><ol class="refs" aria-label="Reference slots">${[1, 2, 3].map(n => `<li><b class="tnum">Ref. ${pad2(n)}</b><span>Authors, year, title and journal, DOI</span><i>Empty</i></li>`).join('')}</ol>`)}
    ${sec('s-ts', 'Testing &amp; Sourcing', 'Batch ' + batch(p) + ' · sample', `<dl class="dl2"><dt>Batch</dt><dd class="tnum">${batch(p)}<span class="sample">Sample</span></dd><dt>Certificate</dt><dd>Published with each batch before launch.</dd><dt>Laboratory</dt><dd>Independent ISO/IEC 17025 laboratory, to be named<span class="sample">Sample</span></dd></dl>
      <table class="tbl" style="margin-top:14px"><thead><tr><th scope="col">Test</th><th scope="col">Method</th><th scope="col" class="r">Result</th></tr></thead><tbody>${tests.map(t => `<tr><th scope="row">${t[0]}<small>${esc(t[1])}</small></th><td>${t[2]}</td><td class="r">With batch<span class="sample">Sample</span></td></tr>`).join('')}</tbody></table>
      <dl class="dl2" style="margin-top:14px"><dt>Primary ingredient</dt><dd>${esc(ki ? ki.n : 'Formula')}</dd><dt>Origin</dt><dd>To be confirmed before launch<span class="sample">Sample: EU supplier</span></dd><dt>Manufacture</dt><dd>${p.top ? 'Formulated and filled' : 'Encapsulated and packed'} in the United Kingdom<span class="sample">Sample</span></dd><dt>Pack</dt><dd>${esc(P.mat)}</dd></dl>`)}
  </div>
  <div class="dz-foot"><span class="q tnum" id="footQ">Qty 1</span><button class="btn" type="button" id="addM"><span>Add to Protocol</span><span class="pr tnum" id="addMp">${money(p.po)}</span></button></div>`;
}
function renderMini(highlight) {
  const p = byId(PM.id), R = ritual(), mine = slotsFor(p);
  $('#mini').innerHTML = SLOTS.map(S => {
    const items = R[S.k];
    let chips = items.map(c => { const k = c.it.id + ':' + c.it.m; const me = c.it.id === p.id; return `<i class="${me ? 'me' : ''}${highlight === k && me ? ' in' : ''}" title="${esc(c.p.n)}">${c.code} ${esc(c.p.n)}</i>`; }).join('');
    if (mine.indexOf(S.k) >= 0 && !items.some(c => c.it.id === p.id)) chips += `<i class="ghost">${S.code}-${pad2(items.length + 1)} · this one</i>`;
    return `<div class="mc"><span>${S.w} · ${S.code}</span>${chips || '<i class="ghost">—</i>'}</div>`;
  }).join('');
  /* one line in the first screen: where this product would land */
  const land = mine.map(k => { const S = SLOTS.find(x => x.k === k), have = R[k].find(c => c.it.id === p.id); if (have) return `${S.w} ${have.code} · ${have.time}`; const n = R[k].length; return `${S.w} ${S.code}-${pad2(n + 1)} · ${hm(S.base + n * 4)}`; });
  $('#slotLine').innerHTML = `<span>${R[mine[0]].some(c => c.it.id === p.id) ? 'In your ritual' : 'Would slot into'}</span> ${esc(land.join(' and '))}`;
}
function bindDossier(p) {
  const oO = $('#oOnce'), oS = $('#oSub'), freq = $('#freq');
  const price = () => (PM.mode === 'sub' ? p.ps : p.po) * PM.q;
  const upd = () => {
    oO.setAttribute('aria-checked', PM.mode === 'once'); oS.setAttribute('aria-checked', PM.mode === 'sub'); oO.tabIndex = PM.mode === 'once' ? 0 : -1; oS.tabIndex = PM.mode === 'sub' ? 0 : -1;
    freq.hidden = PM.mode !== 'sub'; $('#qty').textContent = PM.q; $('#footQ').textContent = 'Qty ' + PM.q;
    $('#addPr').textContent = money(price()); $('#addMp').textContent = money(price());
    $$('button', freq).forEach(b => b.setAttribute('aria-pressed', +b.dataset.fr === PM.fr));
  };
  oO.onclick = () => { PM.mode = 'once'; upd(); }; oS.onclick = () => { PM.mode = 'sub'; upd(); };
  [oO, oS].forEach(b => b.addEventListener('keydown', e => { if (/Arrow(Left|Right|Up|Down)/.test(e.key)) { e.preventDefault(); PM.mode = PM.mode === 'once' ? 'sub' : 'once'; upd(); (PM.mode === 'once' ? oO : oS).focus(); } }));
  $$('button', freq).forEach(b => b.onclick = () => { PM.fr = +b.dataset.fr; upd(); });
  $('#qDec').onclick = () => { PM.q = Math.max(1, PM.q - 1); upd(); }; $('#qInc').onclick = () => { PM.q = Math.min(9, PM.q + 1); upd(); };
  const add = async () => {
    const it = addLine(p.id, PM.mode, PM.fr, PM.q); const key = it.id + ':' + it.m;
    NEWKEY = key; updCount(true); cue('chime');
    const R = ritual(); const where = slotsFor(p).map(s => { const c = R[s].find(c => c.it === it); return c ? c.S.w + ' ' + c.code + ' · ' + c.time : ''; }).filter(Boolean);
    renderMini(key); renderRitual();
    const btns = [$('#addP'), $('#addM')]; btns.forEach(b => { b.classList.add('done'); b.firstElementChild.textContent = 'Slotted in'; });
    $('#addNote').innerHTML = `${PM.mode === 'sub' ? 'Subscription, every ' + PM.fr + ' days' : 'One-time, next dispatch'}. Slotted into ${esc(where.join(' and '))}. <a href="#protocol">See your ritual</a>`;
    say(p.n + ' added to Your Protocol. ' + where.join(' and '));
    setTimeout(() => btns.forEach(b => { b.classList.remove('done'); b.firstElementChild.textContent = 'Add to Protocol'; }), 2600);
  };
  $('#addP').onclick = add; $('#addM').onclick = add;
  const sc = $('#dzSc');
  $$('[data-jump]', dz).forEach(b => b.onclick = () => { const t = $('#' + b.dataset.jump); if (t) { sc.scrollTo({top: t.offsetTop - 50, behavior: RM ? 'auto' : 'smooth'}); setTimeout(() => t.querySelector('h2').focus({preventScroll: true}), RM ? 0 : 500); } if (isPhone()) sheet(true); });
  const secs = $$('.ps', dz);
  sc.addEventListener('scroll', () => { const y = sc.scrollTop + 90; let cur = secs[0].id; secs.forEach(s => { if (s.offsetTop <= y) cur = s.id; }); $$('[data-jump]', dz).forEach(b => b.setAttribute('aria-current', b.dataset.jump === cur)); }, {passive: true});
  const grip = $('#dzGrip'); grip.onclick = () => sheet(!dz.classList.contains('full'));
  upd(); renderMini();
}
function sheet(on) { dz.classList.toggle('full', on); const g = $('#dzGrip'); if (g) { g.setAttribute('aria-expanded', on); g.setAttribute('aria-label', on ? 'Collapse the dossier' : 'Expand the dossier'); } }

/* the object: turntable frames on a canvas, or the hero still with a gentle tilt */
function buildStage(p) {
  const P = PACK[p.id];
  PM.frames = RND.tt[p.id] || []; PM.imgs = []; PM.frame = 0; PM.bbox = null; PM.tilt = 0;
  const hs = heroSrc(p.id);
  pmObj.innerHTML = '<div class="sh" aria-hidden="true"></div>';
  const ar = P.kind === 'jar' ? 1.25 : P.kind === 'dropper' ? .62 : .6;
  if (PM.frames.length) {
    const cv = document.createElement('canvas'); cv.id = 'pmCv'; cv.style.width = '100%'; cv.style.height = '100%'; pmObj.appendChild(cv); PM.cv = cv;
    PM.imgs = PM.frames.map(() => null);
    loadFrame(0).then(img => { if (!img) return; pmObj.style.setProperty('--ar', (img.naturalWidth / img.naturalHeight).toFixed(4)); sizeCv(); drawFrame(); PM.bbox = alphaBBox(img); maskTo(cv, PM.bbox); placeCallouts(); });
    /* lazy: the rest of the turn loads behind, nearest frames first */
    (async () => { const n = PM.frames.length, order = []; for (let k = 1; k <= n / 2; k++) { order.push(k % n, (n - k) % n); } for (const i of order) { if (PM.id !== p.id) return; await loadFrame(i); } })();
    $('#pmDrag').textContent = 'Drag to turn';
  } else if (hs) {
    const im = new Image(); im.decoding = 'async'; im.alt = ''; im.draggable = false; im.src = hs; pmObj.appendChild(im); PM.cv = null;
    im.onload = () => { pmObj.style.setProperty('--ar', (im.naturalWidth / im.naturalHeight).toFixed(4)); PM.bbox = alphaBBox(im); maskTo(im, PM.bbox); placeCallouts(); };
    $('#pmDrag').textContent = 'Drag to tilt';
  } else {
    pmObj.style.setProperty('--ar', P.kind === 'jar' ? 1.25 : P.kind === 'dropper' ? 1 / 3 : .5); pmObj.insertAdjacentHTML('beforeend', packSVG(p)); PM.cv = null;
    $('#pmDrag').textContent = 'Drag to tilt';
    requestAnimationFrame(placeCallouts);
  }
  $('#pmRot').textContent = 'Rot 000°';
  $('#pmFig').innerHTML = `Fig. ${p.id}<br>${esc(P.fmt)} · ${p.q}`;
  pmStage.setAttribute('aria-label', `${p.n}, ${P.fmt.toLowerCase()}, ${p.q}. ${PM.frames.length ? 'Drag, or use the left and right arrow keys, to turn it.' : 'Drag, or use the arrow keys, to tilt it.'}`);
}
function loadFrame(i) {
  if (PM.imgs[i]) return Promise.resolve(PM.imgs[i]);
  return new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => { PM.imgs[i] = im; res(im); }; im.onerror = () => res(null); im.src = PM.frames[i]; });
}
function sizeCv() { const cv = PM.cv; if (!cv) return; const r = pmObj.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); }
function drawFrame() {
  const cv = PM.cv; if (!cv) return; const n = PM.frames.length; let i = ((Math.round(PM.frame) % n) + n) % n;
  let im = PM.imgs[i]; if (!im) { for (let k = 1; k < n && !im; k++) im = PM.imgs[(i + k) % n] || PM.imgs[(i - k + n) % n]; }
  if (!im) return; const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(im, 0, 0, cv.width, cv.height);
  $('#pmRot').textContent = 'Rot ' + String(Math.round(i / n * 360) % 360).padStart(3, '0') + '°';
}
function placeCallouts() {
  if (!PM.open) return; const p = byId(PM.id), P = PACK[p.id], ki = keyIng(p);
  const sr = pmStage.getBoundingClientRect(), or = pmObj.getBoundingClientRect();
  const bb = PM.bbox || (P.kind === 'jar' ? [.09, .05, .91, .975] : P.kind === 'dropper' ? [.12, .013, .88, .975] : [.03, .017, .97, .985]);
  const X = f => or.left - sr.left + or.width * f, Y = f => or.top - sr.top + or.height * f;
  const L = X(bb[0]), Rr = X(bb[2]), T = Y(bb[1]), B = Y(bb[3]), W = Rr - L, H = B - T, cx = (L + Rr) / 2;
  const ph = isPhone();
  const capY = T + H * (P.kind === 'jar' ? .16 : P.kind === 'dropper' ? .3 : .12), bodyY = T + H * (P.kind === 'jar' ? .64 : .66);
  const fx = ph ? 12 : Math.max(18, L - 210), kx = ph ? sr.width - 12 : Math.min(sr.width - 16, Rr + 200);
  const ring = 12;
  const fy = ph ? Math.max(70, capY - 40) : capY - 40, ky = ph ? bodyY + 30 : bodyY - 70;
  const dimX = L - (ph ? 14 : 26);
  pmSvg.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`);
  pmSvg.innerHTML = `
    ${ph ? '' : `<circle class="dot" cx="${cx - W * .18}" cy="${capY}" r="2.2"/><path d="M${cx - W * .18} ${capY} L${(L - 10)} ${fy + 22} L${fx + 150} ${fy + 22}"/>`}
    <circle class="ring2" cx="${cx}" cy="${bodyY}" r="${ring + 7}"/><circle class="ring" cx="${cx}" cy="${bodyY}" r="${ring}"/><circle class="core" cx="${cx}" cy="${bodyY}" r="4.5"/><circle class="dot" cx="${cx + ring * .7071}" cy="${bodyY - ring * .7071}" r="2.2"/>
    <path d="M${cx + ring * .7071} ${bodyY - ring * .7071} L${Rr + 12} ${ky + 22} L${kx - (ph ? 0 : 150)} ${ky + 22}"/>
    <line class="dim" x1="${dimX}" y1="${T}" x2="${dimX}" y2="${B}"/><line class="dim" x1="${dimX - 5}" y1="${T}" x2="${dimX + 5}" y2="${T}"/><line class="dim" x1="${dimX - 5}" y1="${B}" x2="${dimX + 5}" y2="${B}"/>
    <line class="dim" x1="${L}" y1="${B + 18}" x2="${Rr}" y2="${B + 18}"/><line class="dim" x1="${L}" y1="${B + 13}" x2="${L}" y2="${B + 23}"/><line class="dim" x1="${Rr}" y1="${B + 13}" x2="${Rr}" y2="${B + 23}"/>`;
  const hideFmt = ph;
  const kText = ki ? (p.top ? `${ki.n} · ${ki.v}` : `${ki.n} · ${ki.v}`) : '';
  pmCo.innerHTML = `
    <div class="co" style="left:${fx}px;top:${fy - 18}px;max-width:${ph ? 140 : 150}px;${hideFmt ? 'display:none' : ''}"><span class="k">Format</span><b>${esc(P.fmt)}, ${p.q}</b><span>${esc(P.mat.split(/,\s*/).filter(x => !/mm|pipette|print/.test(x)).slice(0, 2).join(', '))}</span></div>
    <div class="co r" style="left:${kx - (ph ? 150 : 160)}px;top:${ky - 18}px;width:${ph ? 150 : 160}px"><span class="k">Key ingredient</span><b class="tnum">${esc(kText)}</b><span>${esc(p.e)}</span></div>
    <div class="co dimt tnum" style="left:${dimX - 8}px;top:${(T + B) / 2}px;transform:translate(-100%,-50%) rotate(-90deg);transform-origin:100% 50%;">${P.h} mm</div>
    <div class="co dimt tnum" style="left:${cx}px;top:${B + 26}px;transform:translateX(-50%)">Ø ${P.d} mm</div>`;
  if (ph) { const k = pmCo.children[1]; if (k) { k.style.left = ''; k.style.right = '12px'; } }
}
/* drag to turn */
function stageDown(e) {
  if (e.button > 0) return; PM.drag = {x: e.clientX, f: PM.frame, t: PM.tilt, last: e.clientX, lt: performance.now()}; PM.vel = 0;
  pmStage.classList.add('drag'); pmStage.setPointerCapture && pmStage.setPointerCapture(e.pointerId);
}
function stageMove(e) {
  if (!PM.drag) return; const dx = e.clientX - PM.drag.x, n = PM.frames.length;
  const now = performance.now(); PM.vel = (e.clientX - PM.drag.last) / Math.max(8, now - PM.drag.lt); PM.drag.last = e.clientX; PM.drag.lt = now;
  /* frames turn counter-clockwise from above, so the front moves right as the index grows: drag right, turn right */
  if (n) { PM.frame = PM.drag.f + dx / pmStage.clientWidth * n * 1.1; drawFrame(); }
  else { PM.tilt = clamp(PM.drag.t + dx / pmStage.clientWidth * 40, -16, 16); tiltApply(); }
}
function stageUp() {
  if (!PM.drag) return; if (performance.now() - PM.drag.lt > 90) PM.vel = 0; PM.drag = null; pmStage.classList.remove('drag');
  const n = PM.frames.length;
  if (n && !RM) { let v = clamp(PM.vel * n * 1.1 * 16 / pmStage.clientWidth, -1.2, 1.2); (function coast() { if (PM.drag || Math.abs(v) < .02) { PM.frame = Math.round(PM.frame); drawFrame(); return; } PM.frame += v; v *= .93; drawFrame(); requestAnimationFrame(coast); })(); }
  if (!n) tween(RM ? .01 : 1.2, t => { PM.tilt *= (1 - t * .25); tiltApply(); }, eo).then(() => { PM.tilt = 0; tiltApply(); });
}
function tiltApply() { const im = pmObj.querySelector('img,svg'); if (im) im.style.transform = `perspective(900px) rotateY(${PM.tilt.toFixed(2)}deg)`; $('#pmRot').textContent = 'Tilt ' + (PM.tilt >= 0 ? '+' : '−') + String(Math.abs(Math.round(PM.tilt))).padStart(2, '0') + '°'; }
pmStage.addEventListener('pointerdown', stageDown); addEventListener('pointermove', e => { stageMove(e); onPointer(e); }, {passive: true}); addEventListener('pointerup', stageUp); addEventListener('pointercancel', stageUp);
pmStage.addEventListener('keydown', e => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); const s = e.key === 'ArrowLeft' ? -1 : 1, n = PM.frames.length;
  if (n) { PM.frame += s * Math.max(1, Math.round(n / 24)); drawFrame(); } else { PM.tilt = clamp(PM.tilt + s * 4, -16, 16); tiltApply(); }
});
function pmNav(p) {
  const i = REN.indexOf(p), pv = REN[(i + 5) % 6], nx = REN[(i + 1) % 6];
  $('#pmNav').innerHTML = `<a href="#p-${pv.id}">${ic('back', 's')}<span class="mono tnum">${pv.id}</span></a><a href="#p-${nx.id}"><span class="mono tnum">${nx.id}</span>${ic('arrow', 's')}</a>`;
}
function fillProduct(id) {
  const p = byId(id); PM.id = id; PM.mode = 'once'; PM.fr = 30; PM.q = 1;
  dz.innerHTML = dossier(p); bindDossier(p); buildStage(p); pmNav(p); sheet(false);
  { const d = new Date(PRO.next); $('#pmVt').textContent = `${p.id} · Next dispatch ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`; }
  $('#pmBack').href = '#renew';
}
async function openProduct(id, first) {
  const p = byId(id); if (!p || p.c !== '08') return stub('c-' + (p ? p.c : '01'));
  closeLayers(true); listOpen(false);
  if (PM.open && PM.id === id) return;
  if (PM.open) { await frostCut(async () => { fillProduct(id); setScene('product'); placeCallouts(); }, {inD: .55, outD: .9}); $('#dzName').focus({preventScroll: true}); return; }
  PM.return = document.activeElement;
  /* a cold deep link opens straight onto the product: no frost-in */
  const cut = first ? async f => { await f(); GL.snap = true; GL.hard = true; } : f => frostCut(f);
  await cut(async () => {
    fillProduct(id);
    pmEl.hidden = false; pmEl.classList.add('on'); PM.open = true; document.body.classList.add('pm-open'); $('#main').inert = true; document.body.dataset.tone = 'pale';
    lockScroll(true); setScene('product'); if (!GL.ok) setNoGL('product');
    /* keep 08 Renew behind, focused on this product, for the way back */
    if (!RM) { jumpTo(SECT.renew.top + SECT.renew.run * rnPFor(REN.indexOf(p))); lastSY = SY; }
    requestAnimationFrame(placeCallouts);
  });
  $('#dzName').focus({preventScroll: true});
}
async function closeProduct(toHash) {
  if (!PM.open) return;
  await frostCut(async () => {
    pmEl.classList.remove('on'); pmEl.hidden = true; PM.open = false; document.body.classList.remove('pm-open'); $('#main').inert = false;
    lockScroll(false); if (toHash && toHash !== '#renew') routeSection(toHash.slice(1), true); else jumpTo(SY);
    frame.force = true; RF.f = -1; syncScene(true);
  });
  /* return focus to where the member is now: the product in 08 Renew, or the heading of the chapter they asked for */
  const sec = toHash && toHash !== '#renew' ? SECT[toHash.slice(1)] : null;
  const b = sec ? $('h1,h2', sec.el) : RF.from && document.contains(RF.from) ? RF.from : $(`.pv[data-id="${PM.id}"]`);
  if (b) { if (sec && !b.hasAttribute('tabindex')) b.setAttribute('tabindex', '-1'); b.focus({preventScroll: true}); }
}
pmEl.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.querySelector('.lyr.on')) { e.preventDefault(); go('#renew'); } trap(e, pmEl); });

/* ================================================================ layers: search, stubs */
const lyr = $('#lyr'), lyPane = $('#lyPane');
let LY = null;
function openLayer(html, kind) {
  menuOpen(false); listOpen(false);
  LY = {ret: LY ? LY.ret : document.activeElement, kind};
  lyPane.innerHTML = html + `<button class="icbtn x" type="button" data-close aria-label="Close">${ic('x')}</button>`;
  lyr.hidden = false; lyr.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => lyr.classList.add('in')));
  if (!PM.open) lockScroll(true);
  setTimeout(() => { const f = lyPane.querySelector('input,h2'); f && f.focus(); }, 40);
}
function closeLayers(silent) {
  if (!LY) return; const ret = LY.ret; LY = null; lyr.classList.remove('in');
  setTimeout(() => { if (!LY) { lyr.classList.remove('on'); lyr.hidden = true; } }, silent ? 0 : 420);
  if (!PM.open) lockScroll(false);
  if (!silent && ret && document.contains(ret)) ret.focus({preventScroll: true});
}
lyr.addEventListener('click', e => { if (e.target.closest('[data-close]')) leaveLayer(); });
lyr.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); leaveLayer(); } trap(e, lyPane); });
function leaveLayer() { const back = BASE || (PM.open ? '#p-' + PM.id : '#' + chapterAt(SY)); closeLayers(); history.replaceState(null, '', back); }
const STUBS = {dispatches: 'Dispatches', cabinet: 'Your Cabinet', nominations: 'Nominations', record: 'Member Record', dossier: 'The Dossier', liaison: 'Member Liaison', leave: 'Leave The Reserve', dispatch: 'Review dispatch'};
function stub(key) {
  if (key === 'm/leave') {
    openLayer(`<p class="mono">Member 0047</p><h2 class="disp" id="lyT" tabindex="-1" style="margin-top:14px">Leave The <em>Reserve</em></h2><p>Before you go, one formality.</p><div class="hu-q"><button type="button" class="ck" id="huCk" aria-pressed="false"><i aria-hidden="true"></i>I'm not a robot</button><p class="q" id="huQ" aria-live="polite">But are you truly human?</p></div><p class="fine" style="margin-top:18px">Look test: signing out is part of the full build.</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:22px"><button class="btn ghost" type="button" data-close>Stay</button></div>`, 'stub');
    $('#huCk').addEventListener('click', e => { const b = e.currentTarget, on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); $('#huQ').textContent = on ? 'Noted. We will take your word for it.' : 'But are you truly human?'; });
    return;
  }
  let t, m;
  if (/^c-\d\d$/.test(key)) { const co = CAT[+key.slice(2) - 1]; t = co.c + ' ' + co.n; m = co.d + '. ' + pad2(co.it.length) + ' products.'; }
  else { t = STUBS[key.replace(/^m\//, '')] || 'The Reserve'; m = 'Member 0047'; }
  const cap = RND.sculpt.capsule && (RND.sculpt.capsule.fog || RND.sculpt.capsule.src);
  openLayer(`<figure class="ly-fig${cap ? ' cap' : ''}"><img src="${cap ? esc(cap) : PH('reeded-glass')}" alt="${cap ? 'A white capsule resting in a recess of matte white clay.' : 'Fluted glass with soft shadows.'}" decoding="async"><figcaption class="mono">${cap ? 'Fig. — Kept for later' : 'Fig. — Reeded glass'}</figcaption></figure><p class="mono tnum">${esc(m)}</p><h2 class="disp" id="lyT" tabindex="-1" style="margin-top:14px">${esc(t)}</h2><p>Look test: full section in the build.</p><p class="fine" style="margin-top:18px">This preview covers the arrival, The Formulary, 08 Renew, one product moment and Your Protocol.</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:22px"><a class="btn" href="#renew">Go to 08 Renew</a><button class="btn ghost" type="button" data-close>Close</button></div>`, 'stub');
}
function search() {
  openLayer(`<h2 class="disp" id="lyT" tabindex="-1">Search <em>The Formulary</em></h2><form class="srch" role="search" id="sf"><label class="sr" for="sq">Search The Formulary</label>${ic('search')}<input id="sq" type="search" autocomplete="off" spellcheck="false" placeholder="For example, niacinamide or serum"></form><div class="chips" aria-label="Suggestions">${['Serum', 'Niacinamide', 'Zinc', 'Ceramide', 'Magnesium'].map(x => `<button type="button" data-q="${x}">${x}</button>`).join('')}</div><div class="sres" id="sres" aria-live="polite"></div>`, 'search');
  const q = $('#sq'), out = $('#sres');
  const run = () => {
    const s = q.value.trim().toLowerCase(); if (!s) { out.innerHTML = ''; return; }
    const r = ALL.filter(p => (p.n + ' ' + p.g + ' ' + p.cn + ' ' + p.oth + ' ' + p.act.map(a => a.name + ' ' + a.form).join(' ') + ' ' + (CONC[p.id] || []).map(c => c[0]).join(' ')).toLowerCase().indexOf(s) >= 0).slice(0, 12);
    out.innerHTML = r.length ? r.map(p => `<a href="${p.c === '08' ? '#p-' + p.id : '#c-' + p.c}"><i class="tnum">${p.id}</i><span>${esc(p.n)}<br><small>${p.c} ${p.cn} · ${p.g}</small></span><small class="tnum">${money(p.po)}</small></a>`).join('') : `<p class="em">Nothing matches “${esc(q.value)}”. Try a shorter word, such as “serum”.</p>`;
  };
  q.addEventListener('input', run); $('#sf').addEventListener('submit', e => { e.preventDefault(); const a = out.querySelector('a'); a && a.click(); });
  $$('[data-q]', lyPane).forEach(b => b.onclick = () => { q.value = b.dataset.q; run(); q.focus(); });
}
function trap(e, root) {
  if (e.key !== 'Tab') return; const f = $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', root).filter(el => el.offsetParent !== null || el === document.activeElement);
  if (!f.length) return; const a = f[0], b = f[f.length - 1];
  if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); } else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
}

/* ================================================================ scrolling */
function lockScroll(on) { HTML.classList.toggle('lock', on); if (lenis) on ? lenis.stop() : lenis.start(); }
function jumpTo(y) { if (lenis) lenis.scrollTo(y, {immediate: true, force: true}); else scrollTo(0, y); SY = y; }
function scrollToY(y, gentle) { if (lenis) lenis.scrollTo(y, {duration: gentle ? 1.2 : 2, force: true}); else scrollTo({top: y, behavior: RM ? 'auto' : 'smooth'}); }
function restY(id) {
  const c = SECT[id]; if (!c) return 0;
  if (RM) return c.top;
  if (id === 'arrival') return 0; if (id === 'formulary') return c.top + Math.max(c.run * .06, VH * .46); if (id === 'interlude') return c.top + c.run * .5; if (id === 'renew') return c.top + Math.max(c.run * .03, VH * .46); return c.top - VH * .05;
}
function routeSection(id, instant) {
  const y = restY(id);
  if (instant) { jumpTo(y); syncScene(true); return; }
  if (Math.abs(y - SY) < VH * 1.2) { scrollToY(y); return; }
  frostCut(async () => { jumpTo(y); syncScene(true); }, {inD: .7, outD: 1.1});
}
let lastCh = null;
function syncScene(force) {
  if (PM.open) return;
  const k = chapterAt(SY);
  if (k !== lastCh || force) {
    if (k !== lastCh && lastCh && !RM && veilAt(SY) < .9 && !frostBusy()) { GL.snap = true; GL.hard = true; }
    lastCh = k; setScene(k); if (!GL.ok) setNoGL(k);
    document.body.dataset.tone = SECT[k].el.dataset.tone;
    if (!LY && !/^#(p-|search|m\/|c-|renew\/list)/.test(location.hash)) history.replaceState(null, '', k === 'arrival' && !location.hash ? location.pathname + location.search : '#' + k);
  }
  if (force) { GL.snap = true; GL.hard = true; }
}

/* ================================================================ router */
let BASE = null;
function go(h) { if (location.hash === h) route(h); else location.hash = h; }
function route(h, first) {
  h = h || '#arrival';
  if (h === '#search') { BASE = PM.open ? '#p-' + PM.id : '#' + chapterAt(SY); return search(); }
  if (/^#m\//.test(h)) { BASE = PM.open ? '#p-' + PM.id : '#' + chapterAt(SY); return stub(h.slice(1)); }
  if (/^#c-0[1-79]$/.test(h)) { BASE = PM.open ? '#p-' + PM.id : '#' + chapterAt(SY); return stub(h.slice(1)); }
  BASE = null;
  if (LY) closeLayers(true);
  const pm = /^#p-(08-[1-6])$/.exec(h);
  if (pm) return openProduct(pm[1], first);
  const sec = h === '#c-08' ? 'renew' : h === '#renew/list' ? 'renew' : h.slice(1);
  if (PM.open) { closeProduct(SECT[sec] ? '#' + sec : '#renew').then(() => { if (h === '#renew/list') listOpen(true); }); return; }
  if (SECT[sec]) { routeSection(sec, first); if (h === '#renew/list') setTimeout(() => listOpen(true), first ? 50 : 900); }
}
addEventListener('hashchange', () => route(location.hash));

/* ================================================================ frame loop */
let lastT = performance.now(), visible = !document.hidden, fpsAcc = 0, fpsN = 0, rafId = 0;
function frame(now) {
  rafId = requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - lastT) / 1000); lastT = now;
  if (lenis) lenis.raf(now);
  SY = lenis ? lenis.scroll : scrollY;
  if (SY !== lastSY || frame.force) {
    lastSY = SY; frame.force = false; GL.idle = 0;
    BAR.classList.toggle('scrolled', SY > 40);
    if (!PM.open) {
      const v = RM ? 0 : veilAt(SY);
      if (!frostBusy()) { GL.veil = v; VEIL.style.display = 'none'; }
      arrival(prog('arrival'), edgeOf('arrival', SY));
      formulary(prog('formulary'), edgeOf('formulary', SY));
      interlude(prog('interlude'), edgeOf('interlude', SY));
      renew(prog('renew'), edgeOf('renew', SY));
      syncScene();
    }
  } else GL.idle += dt;
  if (!PM.open && SECT.interlude && Math.abs(SY - SECT.interlude.top - SECT.interlude.run * .5) < VH * 2.2 && !RM) interlude(prog('interlude'), edgeOf('interlude', SY));
  if (GL.ok) {
    /* half rate when nothing moves: the fog still drifts */
    if (GL.idle > 2 && (fpsN++ & 1)) return;
    /* behind a frosted layer the world holds still once settled: no re-blurring an unchanged canvas */
    if ((PM.open || LY) && GL.idle > 1.4 && !frostBusy()) return;
    renderGL(dt, now / 1000);
    fpsAcc = fpsAcc * .95 + dt * .05;
    if (fpsAcc > .026 && GL.dpr > .8 && GL.idle < 1 && now - (GL.lastAdapt || 0) > 2500) { GL.dpr = Math.max(.75, GL.dpr - .25); GL.r.setPixelRatio(GL.dpr); resizeGL(); GL.lastAdapt = now; }
  }
}
function startLoop() { if (!rafId && visible) { lastT = performance.now(); rafId = requestAnimationFrame(frame); } }
function stopLoop() { cancelAnimationFrame(rafId); rafId = 0; }
document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) startLoop(); else stopLoop(); if (SND.ctx) { if (document.hidden) SND.ctx.suspend(); else if (SND.on) SND.ctx.resume(); } });

/* ================================================================ lazy images */
function lazyImgs() {
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } }), {rootMargin: '150% 0px'}) : null;
  function load(img) { if (!img.dataset.src) return; const big = !isPhone() && img.dataset.src2 ? img.dataset.src2 : img.dataset.src; img.src = big; }
  $$('img[data-src]').forEach(img => io ? io.observe(img) : load(img));
}

/* ================================================================ boot */
async function boot() {
  buildFormulary(); buildRenew(); renderRitual(); updCount(); lazyImgs();
  const gl = await initGL();
  if (!gl) initNoGL();
  if (window.Lenis && !RM && !matchMedia('(hover:none)').matches) {
    lenis = new window.Lenis({lerp: .085, smoothWheel: true, wheelMultiplier: .9, autoRaf: false});
  }
  measure();
  addEventListener('resize', () => { measure(); placeEyeLabels(); fitCards(); rtNav(); frame.force = true; RF.f = -1; fxLast = -9; if (PM.open) { sizeCv(); drawFrame(); placeCallouts(); } });
  addEventListener('pointerdown', onPointer, {passive: true});
  /* renders from the Blender agent; recheck quietly while the page is open */
  const apply = () => { setOpener(); buildRenew(); RF.f = -1; frame.force = true; if (PM.open) buildStage(byId(PM.id)); renderRitual(); applySculpt(); };
  if (await loadRenders()) apply();
  setInterval(async () => { if (!document.hidden && await loadRenders()) apply(); }, 60000);
  /* first scene + route; ?s= overrides for tests */
  const s = Q.get('s');
  const map = {arrival: '#arrival', formulary: '#formulary', interlude: '#interlude', renew: '#renew', list: '#renew/list', protocol: '#protocol', product: '#p-08-1', search: '#search', stub: '#m/dispatches', menu: '#arrival'};
  let h = s ? (map[s] || (/^p-08-[1-6]$/.test(s) ? '#' + s : '#' + s)) : location.hash;
  if (s) history.replaceState(null, '', h === '#arrival' ? location.pathname + location.search : h);
  const startSec = /^#p-/.test(h) ? 'renew' : (h || '#arrival').replace(/^#/, '').replace(/\/.*$/, '');
  jumpTo(SECT[startSec] ? restY(startSec) : 0); SY = SECT[startSec] ? restY(startSec) : 0;
  setScene(chapterAt(SY)); if (!GL.ok) setNoGL(chapterAt(SY)); GL.snap = true; GL.hard = true; document.body.dataset.tone = SECT[chapterAt(SY)].el.dataset.tone;
  /* intro: the fog clears into the face; skipped on deep links */
  if (h && h !== '#arrival') GL.intro = 0;
  else if (!RM) { await sleep(300); tween(4.2, t => GL.intro = 1 - t, t => 1 - Math.pow(1 - t, 3)); }
  frame.force = true; startLoop();
  if (h && h !== '#arrival') { if (/^#p-/.test(h)) { jumpTo(restY('renew')); await sleep(60); } route(h, true); }
  if (s === 'menu') setTimeout(() => menuOpen(true), 400);
  window.P4V4 = {state: () => ({ch: chapterAt(SY), sy: Math.round(SY), veil: +GL.veil.toFixed(3), gl: GL.ok, scene: GL.cur, pm: PM.open ? PM.id : null, frames: PM.frames.length, renders: Object.keys(RND.hero).length, tt: Object.keys(RND.tt), count: count()}), go, jump: y => { jumpTo(y); frame.force = true; }, sect: id => ({top: SECT[id].top, run: SECT[id].run}), rnPFor, fxPFor, RND};
}
function setOpener() {
  const g = RND.sculpt.group, op = $('#rnOpen'); if (!op || !g || !g.src || op.dataset.src === g.src) return;
  const im = new Image(); im.alt = ''; im.decoding = 'async';
  im.onload = () => { op.innerHTML = ''; op.appendChild(im); op.dataset.src = g.src; op.classList.toggle('tall', im.naturalHeight > im.naturalWidth); op.classList.add('on'); RF.f = -1; frame.force = true; };
  im.src = g.src;
}
function applySculpt() {
  /* the meteor stays a photograph and the dial keeps only the cut-out movement (art direction): the halo render is not placed */
}
boot();

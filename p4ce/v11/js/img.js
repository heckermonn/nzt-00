/* PR6 v11 · the pictures. One registry for every image on the site, keyed by name (hero, c04, macro-eye, body-xray,
   pack-tin-detail, night …). The imagery job writes assets/img/img.json; until a key is in it, assets/placeholder.json
   (the same shape, pointing at the v6 photographs, the v6 pack renders and the v9 station stills) stands in.
   Shape: {key: {d, m, w, h, alt, kind, credit, licence, source, lqip}} at the top level or under "images"; an optional
   "credits" list. Paths resolve against the JSON file (or against v11/ when they start with assets/).
   Never a blank box: every frame paints the LQIP (or a mist gradient) under the picture, and a picture that fails
   falls back to the placeholder's file, then to the LQIP alone.
   Entrance: a picture arrives with a short motion blur that resolves to sharp (300–500 ms) once it is both loaded and
   in view; with reduced motion it simply crossfades from its LQIP. */
import {esc, RM} from './util.js';

const ROOT = new URL('../', import.meta.url);
const SRC = {real: new URL('assets/img/img.json', ROOT), ph: new URL('assets/placeholder.json', ROOT)};
const R = {real: {}, ph: {}, credits: [], status: {real: 'loading', ph: 'loading'}, keysReal: []};

function resolve(p, base) {
  if (!p || typeof p !== 'string') return null;
  if (/^(https?:|data:|\/)/.test(p)) return p;
  p = p.replace(/^\.\//, '').replace(/^public\/p4ce\/v11\//, '');
  return String(new URL(p, /^assets\//.test(p) ? ROOT : base));
}
function norm(j, base) {
  const out = {}, src = j && typeof j.images === 'object' && !Array.isArray(j.images) ? j.images : j || {};
  for (const [k, v] of Object.entries(src)) {
    if (!v || typeof v !== 'object' || Array.isArray(v) || !(v.d || v.m)) continue;
    const d = resolve(v.d || v.m, base), m = resolve(v.m || v.d, base);
    const lq = typeof v.lqip === 'string' && v.lqip ? (v.lqip.startsWith('data:') ? v.lqip : 'data:image/webp;base64,' + v.lqip) : null;
    out[k] = {k, d, m, w: +v.w || 0, h: +v.h || 0, alt: v.alt || '', kind: v.kind || 'photo', credit: v.credit || '', licence: v.licence || v.license || '', source: v.source || '', lqip: lq};
  }
  return out;
}
async function get(which) {
  try {
    const r = await fetch(SRC[which], {cache: 'no-cache'}); if (!r.ok) throw new Error(r.status);
    const j = await r.json(); R[which] = norm(j, SRC[which]);
    if (which === 'real') { R.keysReal = Object.keys(R.real); if (Array.isArray(j.credits)) R.credits = j.credits; }
    R.status[which] = Object.keys(R[which]).length ? 'ok' : 'empty';
  } catch (e) { R.status[which] = 'missing'; }
}
const ready = Promise.race([Promise.all([get('real'), get('ph')]), new Promise(r => setTimeout(r, 2500))]);

/* a record: the real one, else the placeholder (with the placeholder's file kept as the fallback) */
function rec(k) {
  const a = R.real[k], b = R.ph[k];
  if (a) return Object.assign({}, a, {fb: b ? b.d : null, ph: false, lqip: a.lqip || (b && b.lqip) || null});
  if (b) return Object.assign({}, b, {fb: null, ph: true});
  return null;
}
const GRAD = 'linear-gradient(180deg, #dfe4e4, #cad5da 60%, #b8c5cc)';
/* art direction per key, for the real pictures: where the subject sits (object-position; `m` for phones, where most
   frames are cropped portrait) and the tone under the type (dark pictures carry Chalk type on an Ink falloff). */
const FRAME = {
  c01: {pos: '50% 42%'}, c02: {pos: '72% 30%', m: '74% 30%', tone: 'dark'}, c03: {pos: '50% 34%'}, c04: {pos: '50% 46%'},
  c05: {pos: '50% 62%'}, c06: {pos: '50% 18%', m: '62% 8%', tone: 'dark'}, c07: {pos: '46% 38%'}, c08: {pos: '32% 30%', m: '30% 26%'},
  c09: {pos: '30% 46%', m: '10% 50%'}, 'body-xray': {pos: '40% 46%', m: '38% 40%'}, 'glass-face': {pos: '70% 34%', m: '74% 30%'},
  'macro-eye': {pos: '52% 50%'}, 'pack-box-detail': {pos: '0% 50%'}, 'pack-jar-detail': {pos: '50% 100%'}, 'pack-dropper-detail': {pos: '50% 30%'},
  hero: {pos: '50% 46%'}, 'hero-sharp': {pos: '50% 46%'}
};
const frame = k => R.real[k] && FRAME[k] || {};
/* the markup for one picture. o: {cls, sizes, eager, alt, pos, attrs} */
function pic(k, o = {}) {
  const r = rec(k);
  const lq = r && r.lqip ? `url(${r.lqip})` : GRAD;
  const f = frame(k), pos = o.pos || f.pos;
  const style = `--lq:${lq};${pos ? `--pos:${pos};` : ''}${f.m ? `--pos-m:${f.m};` : ''}${r && r.w && r.h ? `--ar:${r.w}/${r.h};` : ''}`;
  if (!r) return `<div class="im none ${o.cls || ''}" data-k="${esc(k)}" style="${style}" aria-hidden="true"></div>`;
  const alt = o.alt != null ? o.alt : r.alt;
  const big = Math.max(r.w, r.h) || 1800, mw = r.w ? Math.round(r.w * Math.min(1, 900 / big)) : 900, dw = r.w || 1800;
  const set = r.m && r.d && r.m !== r.d ? ` srcset="${esc(r.m)} ${mw}w, ${esc(r.d)} ${dw}w" sizes="${o.sizes || '100vw'}"` : '';
  return `<div class="im ${o.cls || ''}" data-k="${esc(k)}"${r.ph ? ` data-ph="${esc(k)}"` : ''} style="${style}"${o.attrs || ''}>`
    + `<img src="${esc(r.d)}"${set} alt="${esc(alt)}" decoding="async" loading="${o.eager ? 'eager' : 'lazy'}"${o.eager ? ' fetchpriority="high"' : ''}${r.fb ? ` data-fb="${esc(r.fb)}"` : ''} draggable="false"></div>`;
}

/* entrance: loaded and in view → .in (the CSS resolves the blur) */
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; const el = e.target; el.dataset.seen = '1'; io.unobserve(el); play(el);
}), {threshold: .12}) : null;
function play(el) { const im = el.querySelector('img'); if (el.dataset.seen && im && im.complete && im.naturalWidth) el.classList.add('in'); }
function watch(root) {
  root.querySelectorAll('.im:not([data-w])').forEach(el => {
    el.dataset.w = '1';
    const im = el.querySelector('img'); if (!im) { el.classList.add('in'); return; }
    if (RM) { if (im.complete && im.naturalWidth) el.classList.add('in'); else im.addEventListener('load', () => el.classList.add('in'), {once: true}); return; }
    im.addEventListener('load', () => play(el));
    if (io) io.observe(el); else { el.dataset.seen = '1'; play(el); }
  });
}
/* a picture that fails: the placeholder's file, then the LQIP alone (never a blank box) */
document.addEventListener('error', e => {
  const im = e.target; if (!(im instanceof HTMLImageElement)) return;
  const box = im.closest('.im'); if (!box) return;
  const fb = im.dataset.fb;
  if (fb && im.getAttribute('src') !== fb) { im.removeAttribute('srcset'); im.src = fb; delete im.dataset.fb; return; }
  box.classList.add('none'); im.remove();
}, true);

export const IMG = {
  ready, rec, pic, watch, play,
  has: k => !!rec(k),
  tone: k => frame(k).tone || 'light',
  real: k => !!R.real[k],
  credits: () => R.credits,
  all: () => { const ks = new Set([...Object.keys(R.ph), ...Object.keys(R.real)]); return [...ks].map(rec).filter(Boolean); },
  status: () => ({img: R.status.real, placeholder: R.status.ph, real: R.keysReal.length, keys: R.keysReal})
};

/* P4CE v5 · shared helpers: DOM, numbers, easing, a virtual clock and a tween engine.
   Every authored move runs on CLOCK, so the test hook can hold time still for mid-transition frames. */
export const Q = new URLSearchParams(location.search);
export const $ = (s, r) => (r || document).querySelector(s);
export const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const money = n => '$' + n.toFixed(2);
export const pad2 = n => String(n).padStart(2, '0');
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const isPhone = () => innerWidth <= 860 || innerWidth / innerHeight < .7;

/* easing: one family, exponential-feeling, nothing springy */
export const E = {
  lin: t => t,
  out: t => 1 - Math.pow(1 - t, 3),
  out4: t => 1 - Math.pow(1 - t, 4),
  expo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  /* the house curve for camera and object moves: slow in, long settle */
  move: t => t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
};

export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  raw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

/* reduced motion: the OS setting or ?rm */
export const RM = Q.has('rm') || matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------- virtual clock */
export const CLOCK = {
  t: 0, last: performance.now(), held: false, cap: +(Q.get('cap') || 100), scale: +(Q.get('slow') || 1) > 0 ? 1 / +(Q.get('slow') || 1) : 1,
  tick(real) { const d = Math.min(this.cap, Math.max(0, real - this.last)); this.last = real; if (!this.held) this.t += d * this.scale; return this.held ? 0 : d * this.scale / 1000; },
  now() { return this.t; }
};

/* ---------------------------------------------------------------- tweens on the virtual clock */
const TW = new Set();
export function tween(dur, update, ease = E.move, delay = 0) {
  let res; const p = new Promise(r => res = r);
  const tw = {t0: CLOCK.now() + delay, dur: Math.max(1, dur), update, ease, res, dead: false, cancel() { this.dead = true; TW.delete(this); res(false); }};
  if (dur <= 0) { update(1, 1); res(true); tw.dead = true; return Object.assign(p, {tw}); }
  TW.add(tw); update(0, 0);
  return Object.assign(p, {tw});
}
export function stepTweens() {
  const now = CLOCK.now();
  for (const tw of [...TW]) {
    if (tw.dead) { TW.delete(tw); continue; }
    if (now < tw.t0) continue;
    const k = clamp((now - tw.t0) / tw.dur);
    tw.update(tw.ease(k), k);
    if (k >= 1) { TW.delete(tw); tw.dead = true; tw.res(true); }
  }
}
export const tweensBusy = () => TW.size > 0;
export const wait = ms => tween(ms, () => {}, E.lin);

/* ---------------------------------------------------------------- colour */
export function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export const rgb2hex = c => '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export const mixRGB = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/* ---------------------------------------------------------------- icons: one stroke family, drawn */
const IC = {
  arrow: '<path d="M4 10h12M11.5 5.5L16 10l-4.5 4.5"/>', back: '<path d="M16 10H4M8.5 5.5L4 10l4.5 4.5"/>',
  plus: '<path d="M10 4.5v11M4.5 10h11"/>', minus: '<path d="M4.5 10h11"/>', x: '<path d="M5 5l10 10M15 5L5 15"/>',
  search: '<circle cx="9" cy="9" r="5.5"/><path d="M13.2 13.2L17 17"/>', chev: '<path d="M6 8l4 4 4-4"/>',
  grid: '<path d="M4 5.5h12M4 10h12M4 14.5h7"/>', key: '<circle cx="7" cy="10" r="3.2"/><path d="M10.2 10H17M14.5 10v2.6M16.6 10v1.8"/>',
  nfc: '<path d="M6.2 6.5a5 5 0 010 7M9.4 4.6a8 8 0 010 10.8M12.6 2.8a11 11 0 010 14.4"/>', info: '<circle cx="10" cy="10" r="7"/><path d="M10 9v5M10 6.3v.2"/>'
};
export const ic = (n, c) => `<svg class="ic ${c || ''}" viewBox="0 0 20 20" aria-hidden="true" focusable="false">${IC[n]}</svg>`;

/* live region */
export function say(s) { const l = document.getElementById('live'); if (!l) return; l.textContent = ''; setTimeout(() => l.textContent = s, 40); }

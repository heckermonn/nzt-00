// PR6 / Institute: small shared helpers.
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ease = {
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  lin: (t) => t,
};
export const lerp = (a, b, k) => a + (b - a) * k;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const fmtDate = (t) => new Date(t).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
export const fmtTime = (t) => new Date(t).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
export const lerpView = (a, b, k) => ({ cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), k)) });
// Form helpers: field with label, help and an error slot wired by aria-describedby.
export const field = (id, label, attrs = '', help = '') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${id}" ${attrs} aria-describedby="${id}-h ${id}-e">${help ? `<p class="note" id="${id}-h">${help}</p>` : ''}<p class="err" id="${id}-e" role="alert"></p></div>`;
export const setErr = (root, id, msg) => { const el = $('#' + id, root), e = $('#' + id + '-e', root); if (e) e.textContent = msg || ''; if (el) el.setAttribute('aria-invalid', msg ? 'true' : 'false'); return !msg; };

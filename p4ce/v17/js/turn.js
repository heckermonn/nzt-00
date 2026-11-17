/* PR6 v17 · turn the vial. A 360° turntable (blender/turntable.py: one path-traced frame every 360/n degrees) drawn as
   stacked images; drag sideways, or use the arrow keys, to turn it. It keeps a little momentum and comes to rest; left
   alone it turns slowly on its own. Readout: the angle, in mono. Replaces v12-v15's raking light, which was hard to
   see on a phone.  mountTurn(host, {dir, n}) → {destroy()} */
import {RM, clamp} from './util.js';

const ALLOWED = {vial_blank: 1, vial_hero: 1};
export const turnFor = () => 'vial_blank';   /* v16: the house vial for every record; a labelled turntable per compound can follow */

export function turnHTML(name, o = {}) {
  const d = `assets/turn/${name}/`;
  return `<div class="tn" data-tn="${name}" tabindex="0" role="img" aria-roledescription="turntable" aria-label="${o.label || 'A sealed vial'}. Drag sideways, or use the arrow keys, to turn it.">
    <img class="tn-im" src="${d}000.webp" alt="" decoding="async" fetchpriority="high" draggable="false">
    <p class="tn-r mono" aria-hidden="true"><span data-tn-deg>000°</span><span class="tn-h">DRAG TO TURN <span>&larr;&rarr;</span></span></p>
  </div>`;
}

export function mountTurn(host, o = {}) {
  const name = host.dataset.tn, n = o.n || 32, dir = `assets/turn/${name}/`;
  if (!ALLOWED[name]) return {destroy() {}};
  const img = host.querySelector('.tn-im'), deg = host.querySelector('[data-tn-deg]');
  const srcs = Array.from({length: n}, (_, i) => `${dir}${String(i).padStart(3, '0')}.webp`);
  const cache = srcs.map(s => { const im = new Image(); im.decoding = 'async'; im.src = s; return im; });
  let pos = 0, vel = 0, drag = null, last = 0, raf = 0, idle = 0, shown = -1, alive = true, touched = false;
  const show = () => {
    const k = ((Math.round(pos) % n) + n) % n;
    if (k !== shown) { shown = k; const im = cache[k]; if (im.complete && im.naturalWidth) img.src = im.src; else img.src = srcs[k]; }
    deg.textContent = String(Math.round(((pos % n) + n) % n / n * 360)).padStart(3, '0') + '°';
  };
  const tick = t => {
    raf = 0; if (!alive) return;
    const dt = last ? Math.min(.05, (t - last) / 1000) : 0; last = t;
    if (!drag) {
      pos += vel * dt; vel *= Math.pow(.06, dt);
      idle += dt;
      if (!RM && idle > 2.5 && Math.abs(vel) < 1.2) pos += dt * 2.2;   /* a slow turn on its own: about 2 frames a second */
    }
    show();
    raf = requestAnimationFrame(tick);
  };
  const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const px = () => host.clientWidth / (n * .9);   /* drag the width of the picture: a little more than a full turn */
  const down = e => { drag = {x: e.clientX, p: pos, t: performance.now(), lx: e.clientX}; vel = 0; idle = 0; host.classList.add('on'); if (!touched) { touched = true; host.classList.add('touched'); } host.setPointerCapture && host.setPointerCapture(e.pointerId); };
  const move = e => { if (!drag) return; const now = performance.now(), dx = e.clientX - drag.x; pos = drag.p - dx / px();
    const dtt = Math.max(1, now - drag.t); vel = -(e.clientX - drag.lx) / px() / (dtt / 1000); drag.t = now; drag.lx = e.clientX; idle = 0; };
  const up = () => { if (!drag) return; drag = null; vel = clamp(vel, -40, 40); host.classList.remove('on'); };
  const key = e => { if (e.key === 'ArrowLeft') { pos -= 1; idle = 0; e.preventDefault(); } else if (e.key === 'ArrowRight') { pos += 1; idle = 0; e.preventDefault(); } };
  host.addEventListener('pointerdown', down); host.addEventListener('pointermove', move);
  host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up); host.addEventListener('keydown', key);
  const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) go(); else { cancelAnimationFrame(raf); raf = 0; last = 0; } }));
  io.observe(host);
  return {destroy() { alive = false; io.disconnect(); cancelAnimationFrame(raf); }};
}

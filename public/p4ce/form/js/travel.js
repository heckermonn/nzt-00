/* PR6 / Form · the travelling vial (lu, 5 Nov): one rendered vial carried down the index by the scroll.
   The page reserves berths ([data-berth]) in its own layout, so the vial never sits over text: while a berth is in
   the middle of the screen the vial rides in it with the page; between berths it lifts out and flies to the next,
   turning with the scroll (48 Cycles frames, blender/travel.py). It ends by handing over to the vial in FIG. 04.
   Berth options: data-blur (seen through frost), data-tilt (deg, lies down with FIG. 03's vials), data-end (fades
   into the film). The vial is decoration: aria-hidden, no pointer events. Reduced motion: no traveller at all. */
const N = 48, SRC = i => `assets/travel/t_${String(i).padStart(2, '0')}.webp`;
const AR = .4255;                      /* vial width / height in the cropped frames */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function mountTravel(main, {reduced}) {
  const berths = [...main.querySelectorAll('[data-berth]')];
  if (reduced || berths.length < 2) return () => {};
  const el = document.createElement('div');
  el.className = 'traveller'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<i class="tr-shadow"></i><img alt="" draggable="false" decoding="async">';
  document.body.appendChild(el);
  const img = el.querySelector('img'), shadow = el.querySelector('.tr-shadow');
  /* frames: preload all, show the nearest loaded one */
  const frames = Array.from({length: N}, (_, i) => { const im = new Image(); im.decoding = 'async'; im.src = SRC(i); return im; });
  let shown = -1, raf = 0, live = true, born = performance.now();
  img.src = SRC(0);

  /* a berth's box on screen: the vial is centred in it, as tall as the berth (FIG. 04 measures the film) */
  const box = b => {
    const r = b.getBoundingClientRect();
    if (b.dataset.end !== undefined) {
      /* the vial in the film: video 648 x 810, object-fit cover; vial centre and height measured on frame 0 */
      const s = Math.max(r.width / 648, r.height / 810), vw = 648 * s, vh = 810 * s;
      const ox = r.left + (r.width - vw) / 2, oy = r.top + (r.height - vh) / 2;
      return {x: ox + vw * .415, y: oy + vh * .51, h: vh * .475};
    }
    return {x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height};
  };
  /* the scroll at which a berth sits in the middle of the screen */
  const dockAt = b => { const r = b.getBoundingClientRect(); return scrollY + r.top + r.height / 2 - innerHeight / 2; };

  const draw = () => {
    raf = 0; if (!live) return;
    const s = scrollY, S = berths.map(dockAt);
    let i = 0; while (i < berths.length - 2 && s > S[i + 1]) i++;
    const a = berths[i], b = berths[i + 1];
    const raw = clamp((s - S[i]) / Math.max(1, S[i + 1] - S[i]), 0, 1);
    /* hold in the berth for the first and last part of each leg, fly in the middle */
    const t = ease(clamp((raw - .3) / .4, 0, 1)), fly = Math.sin(Math.PI * t);
    const A = box(a), B = box(b);
    const x = A.x + (B.x - A.x) * t, y = A.y + (B.y - A.y) * t - fly * Math.min(innerHeight * .06, 60);
    const h = A.h + (B.h - A.h) * t, w = h * AR;
    const tilt = (+a.dataset.tilt || 0) * (1 - t) + (+b.dataset.tilt || 0) * t + fly * -7;
    const blur = (+a.dataset.blur || 0) * (1 - t) + (+b.dataset.blur || 0) * t;
    /* the hand-over: past the middle of the last leg the film's own vial takes over */
    const last = i === berths.length - 2 && b.dataset.end !== undefined;
    let op = last ? clamp(1 - (raw - .5) / .14, 0, 1) : 1 - fly * .12;
    if (s < S[0] - innerHeight) op = 0;
    const intro = clamp((performance.now() - born) / 1400, 0, 1); op *= intro;
    el.style.transform = `translate3d(${(x - w / 2).toFixed(1)}px,${(y - h / 2 + (1 - ease(intro)) * 40).toFixed(1)}px,0) rotate(${tilt.toFixed(2)}deg)`;
    el.style.width = w.toFixed(1) + 'px'; el.style.height = h.toFixed(1) + 'px';
    el.style.opacity = op.toFixed(3); el.style.visibility = op < .01 ? 'hidden' : '';
    img.style.filter = blur > .2 ? `blur(${blur.toFixed(1)}px)` : '';
    shadow.style.opacity = ((1 - fly) * (1 - Math.min(1, Math.abs(tilt) / 30)) * .9).toFixed(2);
    /* turn: one full turn per ~1.4 screens of scroll, a little extra while flying */
    const f = (((Math.round(s / (innerHeight * 1.4) * N + fly * 6)) % N) + N) % N;
    if (f !== shown && frames[f].complete && frames[f].naturalWidth) { img.src = frames[f].src; shown = f; }
    if (intro < 1) raf = requestAnimationFrame(draw);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };
  addEventListener('scroll', kick, {passive: true}); addEventListener('resize', kick);
  frames.forEach(im => im.addEventListener('load', kick, {once: true}));
  kick();
  return () => { live = false; cancelAnimationFrame(raf); removeEventListener('scroll', kick); removeEventListener('resize', kick); el.remove(); };
}

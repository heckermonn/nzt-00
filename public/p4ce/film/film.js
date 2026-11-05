/* PR6 / Film (Overdrive A, lu 5 Nov): the main page as one continuous path-traced shot, scrubbed by scroll.
   One canvas holds the film (blender/film.py: 120 frames, a landscape cut for wide screens, a portrait cut for
   phones). The words scroll over it as an editorial column; the chapter rule at the foot shows where you are,
   and you can tap a chapter or drag along the rule to scrub. Frames load coarse to fine, so it plays early. */
import {AREAS} from '../form/js/catalog.js';
import {mountMenu} from '../form/js/menu.js';

const N = 120;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const cv = $('#film'), ctx = cv.getContext('2d');
const main = $('#main'), chs = [...document.querySelectorAll('.ch')];

/* ---------- frames: pick the cut for the screen's shape, load every 8th, then 4th, 2nd, all ---------- */
let cut = '', frames = [];
const src = (c, i) => `assets/${c}/f_${String(i).padStart(3, '0')}.webp`;
function load(c) {
  cut = c; frames = new Array(N).fill(null);
  const order = []; for (const s of [8, 4, 2, 1]) for (let i = 0; i < N; i += s) if (!order.includes(i)) order.push(i);
  if (!order.includes(N - 1)) order.splice(1, 0, N - 1);
  let k = 0, live = 0, done = 0;
  const next = () => {
    while (live < 6 && k < order.length) {
      const i = order[k++], im = new Image(); live++;
      im.decoding = 'async';
      im.onload = () => { if (cut !== c) return; frames[i] = im; live--; done++; progress(done); next(); draw(true); };
      im.onerror = () => { live--; next(); };
      im.src = src(c, i);
    }
  };
  next();
}
const pickCut = () => (innerWidth / innerHeight < .9 ? 'port' : 'land');
function progress(d) {
  const el = $('#loading'); const p = Math.round(d / N * 100);
  el.textContent = p < 100 ? `Film ${p}%` : ''; el.classList.toggle('done', p >= 50);
}

/* ---------- layout: the page is tall; each chapter sits at its moment ---------- */
let total = 0, span = 1;
function layout() {
  const vh = innerHeight, phone = innerWidth < 760;
  total = Math.round(vh * (phone ? 11 : 9)); span = total - vh;
  main.style.height = total + 'px';
  chs.forEach(c => {
    const at = +c.dataset.at, len = +c.dataset.len;
    c.style.top = Math.round(at * span) + 'px';
    c.style.height = Math.round(Math.max(vh, len * span + vh)) + 'px';
  });
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
  if (pickCut() !== cut) load(pickCut());
  draw(true);
}

/* ---------- drawing: the shown position eases toward the scroll; neighbours cross-fade ---------- */
let shown = 0, target = 0, raf = 0, last = 0;
function nearest(i) {
  for (let d = 0; d < N; d++) { if (frames[i - d]) return i - d; if (frames[i + d]) return i + d; }
  return -1;
}
function blit(im, alpha) {
  const w = cv.width, h = cv.height, s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  ctx.globalAlpha = alpha; ctx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
}
function paint() {
  const f = shown * (N - 1), i0 = Math.floor(f), fr = f - i0;
  const a = frames[i0] ? i0 : nearest(i0);
  if (a < 0) return;
  blit(frames[a], 1);
  const b = i0 + 1;
  if (a === i0 && frames[b] && fr > .02) blit(frames[b], fr);   /* only blend true neighbours */
  ctx.globalAlpha = 1;
}
function tick(now) {
  raf = 0;
  const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60; last = now;
  shown = RM ? target : shown + (target - shown) * (1 - Math.exp(-dt * 9));
  if (Math.abs(target - shown) < 1e-4) shown = target;
  paint(); rule();
  if (shown !== target) raf = requestAnimationFrame(tick); else last = 0;
}
/* each chapter is only on screen around its moment: fade it in and out with the scroll, so two never overlap */
function chapters(t) {
  chs.forEach(c => {
    const at = +c.dataset.at, end = at + +c.dataset.len, w = .05;
    const o = (at <= 0 ? 1 : clamp((t - (at - w)) / w, 0, 1)) * (end >= 1 ? 1 : clamp((end + .02 - t) / .04, 0, 1));
    c.style.opacity = o.toFixed(3); c.classList.toggle('gone', o < .01);
  });
}
function draw(force) { target = clamp(scrollY / span, 0, 1); chapters(target); if (force && shown === target) paint(); if (!raf) raf = requestAnimationFrame(tick); }

/* ---------- the chapter rule ---------- */
const named = [['Cover', 0], ['Statement', .2], ['Catalogue', .46], ['This lot', .76], ['Enter', 1]];
$('#ticks').innerHTML = named.map(([n, t], i) => `<li style="--x:${t}"><button type="button" data-t="${t}"><span class="m">${String(i).padStart(2, '0')}</span><span class="nm">${n}</span></button></li>`).join('');
const go = (t, smooth = true) => scrollTo({top: t * span, behavior: smooth && !RM ? 'smooth' : 'auto'});
$('#ticks').addEventListener('click', e => { const b = e.target.closest('button'); if (b) go(+b.dataset.t); });
function rule() {
  $('#dot').style.left = (shown * 100).toFixed(2) + '%';
  let cur = 0; named.forEach(([, t], i) => { if (shown >= t - .04) cur = i; });
  document.querySelectorAll('#ticks button').forEach((b, i) => b.toggleAttribute('aria-current', i === cur));
}
/* drag along the track to scrub */
const track = $('#track');
let dragging = false;
const at = e => { const r = track.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1); };
track.addEventListener('pointerdown', e => { dragging = true; track.setPointerCapture(e.pointerId); go(at(e), false); });
track.addEventListener('pointermove', e => { if (dragging) go(at(e), false); });
['pointerup', 'pointercancel'].forEach(k => track.addEventListener(k, () => { dragging = false; }));

/* ---------- the series list (links into the catalogue) ---------- */
$('#series').innerHTML = AREAS.map(a => `<li><a href="../form/#series-${a.c}"><span class="m n">${a.c}</span><span class="t"><span class="u">${a.f}</span></span><span class="m ar">→</span></a></li>`).join('');

/* ---------- words rise in as their chapter arrives ---------- */
if (!RM) {
  const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('in', e.isIntersecting)), {threshold: .25});
  document.querySelectorAll('.cap > *').forEach((el, i) => { el.style.setProperty('--d', (i % 6) * 70 + 'ms'); io.observe(el); });
} else document.querySelectorAll('.cap > *').forEach(el => el.classList.add('in'));

/* quote count shared with the store prototype; the phone menu, pointed at it */
const qn = () => { try { return (JSON.parse(localStorage.getItem('pr6form.quote')) || []).reduce((a, l) => a + l.q, 0); } catch { return 0; } };
$('#qn').textContent = qn();
try { mountMenu({quoteCount: qn, base: '../form/'}); } catch (e) { console.warn('[film] menu', e); }
$('.head .wm').addEventListener('click', e => { e.preventDefault(); go(0); });

addEventListener('scroll', () => draw(), {passive: true});
addEventListener('resize', layout);
layout();

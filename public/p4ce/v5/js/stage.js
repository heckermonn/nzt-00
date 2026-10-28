/* P4CE v5 · the stage: one persistent product image per product (an "actor").
   An actor is docked inside a slot element of the current view (so it scrolls natively), or it flies
   in a fixed layer between two rects (a FLIP whose target may move while it flies), or it is handed to
   the WebGL world (the arm's sprite), which draws the SAME frame. One image, never swapped behind a cover. */
import {tween, E, lerp, clamp, CLOCK, RM} from './util.js';
import {frames, frameNear, img, bboxOf, preloadTurn, clipped} from './renders.js';

const layer = document.getElementById('stage');
const DPR = () => Math.min(2, devicePixelRatio || 1);
const LOOK0 = {blur: 0, op: 1, sat: 1, sc: 1, ty: 0, tx: 0, rot: 0, sy: 1, shadow: 1};

export const rectOf = el => { const r = el.getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width, h: r.height}; };
const lerpR = (a, b, t) => ({x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t)});

class Actor {
  constructor(id) {
    this.id = id;
    this.el = document.createElement('div'); this.el.className = 'actor'; this.el.dataset.id = id; this.el.setAttribute('aria-hidden', 'true');
    this.cv = document.createElement('canvas'); this.el.appendChild(this.cv); this.g = this.cv.getContext('2d');
    this.frame = 0; this.drawn = -1; this.drawnImg = null;
    this.mode = 'off'; this.slot = null; this.rect = {x: 0, y: 0, w: 0, h: 0};
    this.look = {...LOOK0}; this.goal = {...LOOK0}; this.rate = 7;
    this.fl = null; this.ftw = null; this.overlay = null;
    this.el.style.visibility = 'hidden';
    layer.appendChild(this.el);
  }
  /* --- placement */
  screenRect() {
    if (this.mode === 'slot' && this.slot) return rectOf(this.slot);
    return {...this.rect};
  }
  dock(slot) {
    this.cancelFly();
    this.mode = 'slot'; this.slot = slot;
    if (this.el.parentNode !== slot) slot.appendChild(this.el);
    this.el.classList.remove('flying');
    this.el.style.transform = ''; this.el.style.width = ''; this.el.style.height = '';
    this.el.style.visibility = '';
    this.paint(true);
  }
  float(rect) { /* a fixed rect in the stage layer */
    this.mode = 'fly'; this.slot = null;
    if (this.el.parentNode !== layer) layer.appendChild(this.el);
    this.el.classList.add('flying'); this.el.style.visibility = '';
    this.place(rect);
  }
  place(r) {
    this.rect = r;
    this.el.style.width = r.w + 'px'; this.el.style.height = r.h + 'px';
    this.el.style.transform = `translate3d(${r.x}px,${r.y}px,0)`;
  }
  hide() { this.cancelFly(); this.mode = 'off'; this.el.style.visibility = 'hidden'; if (this.el.parentNode !== layer) layer.appendChild(this.el); this.slot = null; }
  cancelFly() { if (this.fl) { this.fl.tw.cancel(); this.fl = null; } }
  /* fly from wherever it is now to a target: an element (docks on arrival), a rect, or a function returning a rect */
  fly(to, o = {}) {
    const from = o.from || (this.mode === 'off' ? null : this.screenRect());
    const tgt = () => typeof to === 'function' ? to() : to instanceof Element ? rectOf(to) : to;
    const start = from || tgt();
    this.cancelFly();
    this.float(start);
    if (o.look) this.lookTo(o.look, o.lookRate);
    if (o.frame != null) this.turnTo(o.frame, o.dur || 1200);
    const dur = RM ? 0 : (o.dur == null ? 1200 : o.dur);
    const arc = o.arc || 0;
    const p = tween(dur, e => {
      const t = tgt(), r = lerpR(start, t, e);
      if (arc) r.y -= Math.sin(Math.PI * e) * arc * Math.min(innerHeight, 900);
      this.place(r);
    }, o.ease || E.move, o.delay || 0);
    this.fl = p;
    return p.then(ok => {
      if (!ok) return false;
      this.fl = null;
      if (to instanceof Element && !o.stayFloating) this.dock(to);
      return true;
    });
  }
  /* --- look: blur / opacity / saturation / scale / lift, damped toward a goal so any change is interruptible */
  lookTo(g, rate) { Object.assign(this.goal, LOOK0, g); if (rate) this.rate = rate; if (RM) { Object.assign(this.look, this.goal); this.applyLook(); this.paint(); } }
  lookNow(g) { Object.assign(this.goal, LOOK0, g); Object.assign(this.look, this.goal); this.applyLook(); }
  applyLook() {
    const L = this.look, s = this.el.style;
    s.opacity = L.op.toFixed(3);
    s.filter = (L.blur > .05 ? `blur(${L.blur.toFixed(2)}px) ` : '') + (Math.abs(L.sat - 1) > .01 ? `saturate(${L.sat.toFixed(3)}) contrast(${(.82 + .18 * L.sat).toFixed(3)})` : '');
    const tr = (Math.abs(L.tx) > .05 || Math.abs(L.ty) > .05 ? `translate(${L.tx.toFixed(2)}px,${L.ty.toFixed(2)}px) ` : '') + (Math.abs(L.rot) > .01 ? `rotate(${L.rot.toFixed(2)}deg) ` : '') + (Math.abs(L.sc - 1) > .001 || Math.abs(L.sy - 1) > .001 ? `scale(${L.sc.toFixed(4)},${(L.sc * L.sy).toFixed(4)})` : '');
    this.cv.style.transform = tr;
  }
  /* --- frames */
  turnTo(f, dur = 900) {
    if (this.ftw) this.ftw.tw.cancel();
    const n = frames(this.id).length || 48, a = this.frame;
    let d = ((f - a) % n + n) % n; if (d > n / 2) d -= n;
    this.ftw = tween(RM ? 0 : dur, e => { this.frame = a + d * e; }, E.move);
    return this.ftw;
  }
  paint(force) {
    if (force || !(this._sz = (this._sz || 0) + 1) || this._sz % 24 === 0) {
      const r = this.mode === 'slot' && this.slot ? this.slot.getBoundingClientRect() : this.rect;
      const want = Math.min(1125, Math.ceil((r.height || r.h || 300) * DPR() / 50) * 50);
      if (want > 0 && (this.cv.height < want * .85 || this.cv.height > want * 1.6)) { this.cv.height = want; this.cv.width = Math.round(want * .8); force = true; }
    }
    const n = frames(this.id).length || 1, k = ((Math.round(this.frame) % n) + n) % n;
    const im = frameNear(this.id, k);
    if (!im) return;
    const sh = Math.round(this.look.shadow * 40) / 40;
    if (!force && k === this.drawn && im === this.drawnImg && sh === this.drawnSh) return;
    const g = this.g, W = this.cv.width, H = this.cv.height;
    g.clearRect(0, 0, W, H);
    /* the render's shadow catcher reads as a grey slab: keep only the product (full resolution, masked by the
       thresholded half-res alpha), then lay a soft elliptical contact shadow under its base */
    g.globalCompositeOperation = 'source-over'; g.drawImage(im, 0, 0, W, H);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(clipped(im), 0, 0, W, H);
    if (sh > 0) {
      const b = bboxOf(this.id), cx = (b[0] + b[2]) / 2 * W, by = b[3] * H, rw = (b[2] - b[0]) * W * .62, rh = Math.max(4, rw * .16);
      g.globalCompositeOperation = 'destination-over';
      g.save(); g.translate(cx, by - rh * .25); g.scale(1, rh / rw);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, rw); rg.addColorStop(0, `rgba(40,34,28,${(.30 * sh).toFixed(3)})`); rg.addColorStop(.45, `rgba(40,34,28,${(.14 * sh).toFixed(3)})`); rg.addColorStop(1, 'rgba(40,34,28,0)');
      g.fillStyle = rg; g.fillRect(-rw, -rw, rw * 2, rw * 2); g.restore();
    }
    g.globalCompositeOperation = 'source-over';
    this.drawn = k; this.drawnImg = im; this.drawnSh = sh;
  }
  step(dt) {
    if (this.mode === 'off') return;
    const k = 1 - Math.exp(-dt * this.rate);
    let moved = false;
    for (const key in this.goal) { const d = this.goal[key] - this.look[key]; if (Math.abs(d) > 1e-4) { this.look[key] += d * k; moved = true; } }
    if (moved || this._first !== true) { this.applyLook(); this._first = true; }
    this.paint();
  }
}

export const Stage = {
  actors: new Map(),
  get(id) { let a = this.actors.get(id); if (!a) { a = new Actor(id); this.actors.set(id, a); img(frames(id)[0]); } return a; },
  has(id) { return this.actors.has(id); },
  each(fn) { this.actors.forEach(fn); },
  step(dt) { this.actors.forEach(a => a.step(dt)); },
  /* the product box inside a frame rect, for aligning to floors and for HUD marks */
  productBox(id, r) { const b = bboxOf(id); return {x: r.x + r.w * b[0], y: r.y + r.h * b[1], w: r.w * (b[2] - b[0]), h: r.h * (b[3] - b[1])}; },
  /* a small copy that flies somewhere and is gone (the Protocol drop) */
  async ghost(id, from, to, o = {}) {
    const a = new Actor(id + '~g'); a.id = id; a.frame = o.frame || 0;
    a.el.classList.add('ghost'); a.float(from); a.lookNow({shadow: 0});
    a.paint(true);
    const tgt = () => typeof to === 'function' ? to() : to instanceof Element ? rectOf(to) : to;
    const s = {...from};
    await tween(RM ? 0 : (o.dur || 900), e => {
      const t = tgt(), r = lerpR(s, t, e); r.y -= Math.sin(Math.PI * e) * (o.arc || 0) * 200; a.place(r); a.el.style.opacity = String(o.fade ? 1 - sm01(e) : 1);
    }, o.ease || E.move);
    a.el.remove();
  },
  preload: preloadTurn
};
const sm01 = e => clamp((e - .7) / .3);
window.addEventListener('resize', () => Stage.each(a => a.paint(true)));
export {CLOCK};

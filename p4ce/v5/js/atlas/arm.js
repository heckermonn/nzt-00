/* P4CE v5 · the instrument: a slender six-part arm that rises from the sand (adapted from v3 /tmp/claude-0/atlas/arm.js).
   Satin ceramic links between chamfered housings ringed in dark anodised metal; a two-finger gripper.
   In v5 it lives at station 08 and holds the lead product, drawn as the path-traced render itself (a sprite). */
import * as THREE from 'three';
import {MS, RB} from './gfx.js';

const L1 = 1.72, L2 = 1.6, H0 = .98, LF = .16;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const V2 = a => a.map(p => new THREE.Vector2(p[0], p[1]));
const _w = new THREE.Vector3(), _w2 = new THREE.Vector3(), _l = new THREE.Vector3();

export class Arm {
  constructor(scene, MAT) {
    this.MAT = MAT;
    const housing = (r, len) => { const c = Math.min(.024, r * .22), h = len / 2, g = new THREE.Group();
      g.add(MS(new THREE.LatheGeometry(V2([[0, -h], [r - c, -h], [r, -h + c], [r, h - c], [r - c, h], [0, h]]), 56), MAT.satin));
      [-1, 1].forEach(s => { g.add(MS(new THREE.CylinderGeometry(r + .003, r + .003, .014, 56), MAT.anod, 0, s * (h - c - .03), 0)); g.add(MS(new THREE.CylinderGeometry(r * .62, r * .62, .014, 48), MAT.anod, 0, s * (h + .005), 0)); g.add(MS(new THREE.CylinderGeometry(r * .34, r * .34, .012, 40), MAT.steel, 0, s * (h + .014), 0)); });
      g.rotation.z = Math.PI / 2; return g; };
    const r = this.root = new THREE.Group();
    r.add(MS(new THREE.LatheGeometry(V2([[0, 0], [.3, 0], [.312, .012], [.312, .05], [.29, .072], [0, .072]]), 64), MAT.steel2));
    r.add(MS(new THREE.CylinderGeometry(.215, .215, .014, 56), MAT.anod, 0, .079, 0));
    const tu = this.tu = new THREE.Group(); tu.position.y = .086; r.add(tu);
    const sy = H0 - .086;
    tu.add(MS(new THREE.LatheGeometry(V2([[0, 0], [.16, 0], [.165, .015], [.14, sy - .13], [.12, sy - .1], [0, sy - .1]]), 56), MAT.satin));
    tu.add(MS(new THREE.CylinderGeometry(.146, .146, .014, 56), MAT.anod, 0, .05, 0));
    const shH = housing(.125, .31); shH.position.y = sy; tu.add(shH);
    const sh = new THREE.Group(); sh.position.y = sy; tu.add(sh);
    const up = this.up = new THREE.Group(); sh.add(up);
    up.add(MS(new THREE.CylinderGeometry(.052, .074, L1 - .2, 44), MAT.satin, 0, L1 / 2, 0));
    const elH = housing(.095, .24); elH.position.y = L1; up.add(elH);
    const fo = this.fo = new THREE.Group(); fo.position.y = L1; up.add(fo);
    fo.add(MS(new THREE.CylinderGeometry(.036, .054, L2 - .15, 40), MAT.satin, 0, L2 / 2, 0));
    const wrH = housing(.066, .17); wrH.position.y = L2; fo.add(wrH);
    const wr = this.wr = new THREE.Group(); wr.position.y = L2; fo.add(wr);
    const ro = this.ro = new THREE.Group(); wr.add(ro);
    ro.add(MS(new THREE.CylinderGeometry(.046, .054, .07, 40), MAT.satin, 0, -.075, 0));
    ro.add(MS(new THREE.CylinderGeometry(.05, .05, .012, 40), MAT.anod, 0, -.114, 0));
    /* the one acid pinpoint on the site: the instrument's ready ring */
    const ind = MS(new THREE.TorusGeometry(.0525, .0032, 8, 48), MAT.acid, 0, -.096, 0); ind.rotation.x = Math.PI / 2; ind.userData.noShadow = true; ro.add(ind); this.ind = ind;
    this.palm = MS(RB(.16, .034, .07, .012, 3), MAT.steel, 0, -LF + .017, 0); ro.add(this.palm);
    this.fing = [-1, 1].map(s => { const f = new THREE.Group(); f.add(MS(RB(.02, 1, .06, .007, 2), MAT.steel2, 0, -.5, 0)); f.add(MS(RB(.006, .62, .048, .002, 1), MAT.rubber, -s * .012, -.6, 0)); f.position.set(s * .08, -LF + .022, 0); f.userData.s = s; ro.add(f); return f; });
    this.e = new THREE.Vector3(); this.q = []; this.seg = null; this.spd = 0; this.gw = .05; this.gwGoal = .05; this.fl = .16; this.yaw = 0; this.faceYaw = null; this.instant = false;
    r.traverse(m => { if (m.isMesh && !m.userData.noShadow) { m.castShadow = true; m.receiveShadow = true; } });
    scene.add(r);
  }
  solveLocal(Wt) { /* Wt: grip point in arm-root space; the wrist sits LF above it */
    const W = _w.copy(Wt); W.y += LF; const yaw = Math.atan2(W.x, W.z); this.tu.rotation.y = yaw;
    const u = Math.hypot(W.x, W.z), v = W.y - H0, D = clamp(Math.hypot(u, v), Math.abs(L1 - L2) + .05, L1 + L2 - .002), ph = Math.atan2(v, u), al = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1));
    const t1 = ph + al, ex = L1 * Math.cos(t1), ey = L1 * Math.sin(t1), t2 = Math.atan2(v - ey, u - ex);
    this.up.rotation.x = Math.PI / 2 - t1; this.fo.rotation.x = t1 - t2; this.wr.rotation.x = t2 - Math.PI / 2; this.yaw = yaw;
  }
  fingers(k) { this.gw = lerp(this.gw, this.gwGoal, k); this.fing.forEach(f => { f.position.x = f.userData.s * (this.gw + .0105); f.scale.y = this.fl; }); this.palm.scale.x = Math.max(1, (2 * this.gw + .07) / .16); }
  solve() {
    _l.copy(this.e); this.root.worldToLocal(_l); this.solveLocal(_l);
    /* the flange turns so the fingers meet the product's sides as the camera sees it */
    if (this.faceYaw) { let d = this.faceYaw() - this.root.rotation.y - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); let c = d - this.ro.rotation.y; c = Math.atan2(Math.sin(c), Math.cos(c)); this.ro.rotation.y += c * (this.instant ? 1 : .2); }
  }
  push(s) { this.q.push(s); }
  clear() { this.q = []; this.seg = null; }
  update(now, dt) {
    let guard = 0;
    while (guard++ < 12) {
      if (!this.seg) { const s = this.q.shift(); if (!s) break; if (s.fn) { s.fn(); continue; } this.seg = {a: this.e.clone(), b: s.to.clone(), t0: now, d: this.instant ? 0 : s.d * 1000, lift: s.lift || 0}; }
      const sg = this.seg, k = sg.d > 0 ? clamp((now - sg.t0) / sg.d, 0, 1) : 1, e = eio(k);
      const prev = _w2.copy(this.e);
      this.e.lerpVectors(sg.a, sg.b, e); this.e.y += Math.sin(e * Math.PI) * sg.lift;
      this.spd = lerp(this.spd, prev.distanceTo(this.e) / Math.max(dt, .001), .2);
      if (k >= 1) { this.seg = null; continue; }
      break;
    }
    this.fingers(this.instant ? 1 : 1 - Math.pow(.0004, dt));
    this.solve();
  }
  get idle() { return !this.seg && !this.q.length; }
}

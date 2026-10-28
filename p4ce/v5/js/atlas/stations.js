/* P4CE v5 · the nine stations: carved pale stone forms on brushed-steel plinths, with measurement marks.
   Forms adapted from v3 (world.js SCULPT); 05 and 08 are new (a boulder, stacked stones) after pins #59 and #32. */
import * as THREE from 'three';
import {MS, RB, rng} from './gfx.js';

export const PT = .14;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* the plan: where each station stands, desktop and phone framings (from v3) */
export const LAYOUT = {
  desk: [[1.5, 7.8], [8.5, 6.5], [14.5, 1.2], [8.5, -4], [-1.5, -2.5], [-11.5, -3], [-16, -12], [-4, -13.5], [8.5, -12.5]],
  phone: [[-4.6, 7.6], [0, 8.6], [4.6, 7.2], [4.6, -.2], [0, .6], [-4.6, -.6], [-4.6, -7.8], [0, -7], [4.6, -8]]
};

function blade(H, R, tw, m, SOFT) {
  const U = SOFT ? 64 : 110, VV = SOFT ? 80 : 140, g = new THREE.BufferGeometry(), pos = new Float32Array((U + 1) * (VV + 1) * 3), uv = new Float32Array((U + 1) * (VV + 1) * 2), idx = []; const e = 2 / (2.3 + 2.9 * m);
  for (let j = 0; j <= VV; j++) { const v = j / VV; let r = .5 + (.52 - .2 * m - .5) * Math.exp(-Math.pow((v - .36) / .16, 2)) + (.5 + .12 * (1 - m) - .42) * Math.exp(-Math.pow((v - .72) / .12, 2)); r *= 1 - Math.pow(sm(.76, 1, v), 1.15); r *= .82 + .18 * sm(0, .05, v); r = Math.max(r, 0) * R;
    const b = r * (.3 + .22 * (1 - m)), th = (v - .5) * tw, ct = Math.cos(th), st = Math.sin(th);
    for (let i = 0; i <= U; i++) { const ph = i / U * Math.PI * 2, c = Math.cos(ph), s = Math.sin(ph), x = r * Math.sign(c) * Math.pow(Math.abs(c), e), z = b * Math.sign(s) * Math.pow(Math.abs(s), e), k = (j * (U + 1) + i); pos[k * 3] = x * ct - z * st; pos[k * 3 + 1] = v * H; pos[k * 3 + 2] = x * st + z * ct; uv[k * 2] = v * 1.4; uv[k * 2 + 1] = i / U * 3; } }
  for (let j = 0; j < VV; j++) for (let i = 0; i < U; i++) { const a = j * (U + 1) + i, b = a + 1, c = a + U + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/* a stone: a sphere pushed about by smooth noise, flattened where it rests */
function pebble(sx, sy, sz, seed, rough = .08, SOFT) {
  const g = new THREE.SphereGeometry(1, SOFT ? 40 : 64, SOFT ? 28 : 44), p = g.attributes.position, r = rng(seed);
  const f = [0, 1, 2, 3, 4].map(() => [r() * 6.28, r() * 6.28, r() * 6.28, 1.2 + r() * 2.2]);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); let d = 1;
    f.forEach((q, k) => { d += Math.sin(v.x * q[3] + q[0]) * Math.sin(v.y * q[3] * .8 + q[1]) * Math.sin(v.z * q[3] + q[2]) * rough / (1 + k * .7); });
    v.multiplyScalar(d); v.y = v.y < -.55 ? -.55 - (v.y + .55) * .15 : v.y;
    p.setXYZ(i, v.x * sx, v.y * sy, v.z * sz);
  }
  g.computeVertexNormals(); return g;
}
export function buildStations(scene, CAT, MAT, SOFT, LAY) {
  const SCULPT = [
    /* 01 Foundation: a steel slab, a carved block, a small steel sphere */
    g => { g.add(MS(RB(1.8, .3, 1.8, .03), MAT.steel, 0, PT + .15, 0)); const c = MS(RB(1.14, 1.14, 1.14, .05), MAT.stone, 0, PT + .3 + .57, 0); c.rotation.y = .42; g.add(c); g.add(MS(new THREE.SphereGeometry(.3, 48, 32), MAT.mirror, .12, PT + .3 + 1.14 + .3, .05)); return 2.2; },
    /* 02 Form: a twisted blade, in stone */
    g => { const b = MS(blade(2.9, 1.05, 3.3, .62, SOFT), MAT.stone, 0, PT, 0); b.material = MAT.stone.clone(); b.material.side = THREE.DoubleSide; g.add(b); g.add(MS(new THREE.CylinderGeometry(.42, .46, .06, 48), MAT.ink, 0, PT + .03, 0)); return 3.05; },
    /* 03 Force: a leaning steel monolith held by a stone block */
    g => { g.add(MS(RB(1, 1, 1, .04), MAT.stone, .5, PT + .5, 0)); const m = MS(RB(.62, 2.9, .46, .02), MAT.steel2, 0, 0, 0); const p = new THREE.Group(); p.position.set(-.42, PT, 0); m.position.set(0, 1.45, 0); p.add(m); p.rotation.z = -.2; g.add(p); return 2.95; },
    /* 04 Endure: graduated stone discs on a steel spine */
    g => { g.add(MS(new THREE.CylinderGeometry(.045, .045, 3.2, 16), MAT.steel, 0, PT + 1.6, 0)); for (let i = 0; i < 9; i++) { const r = .62 - i * .045, d = MS(new THREE.CylinderGeometry(r, r, .08, 56), MAT.stone, 0, PT + .36 + i * .31, 0); d.rotation.x = Math.sin(i * .9) * .12; d.rotation.z = Math.cos(i * .7) * .1; g.add(d); } g.add(MS(new THREE.SphereGeometry(.09, 24, 16), MAT.mirror, 0, PT + 3.24, 0)); return 3.4; },
    /* 05 Restore: a boulder under a steel half-ring (pin #59, a rock on a grid) */
    g => { const b = MS(pebble(.95, .78, .86, 5, .16, SOFT), MAT.stone2, 0, PT + .6, 0); b.rotation.y = .7; g.add(b); g.add(MS(new THREE.TorusGeometry(1.32, .06, 16, 96, Math.PI), MAT.steel, 0, PT, -.18)); return 1.45; },
    /* 06 Focus: a stone lens on a pin, its axis drawn in steel */
    g => { const l = MS(new THREE.SphereGeometry(1, 64, 40), MAT.stone, 0, PT + 1.7, 0); l.scale.set(1.0, 1.0, .16); g.add(l); g.add(MS(new THREE.CylinderGeometry(.04, .05, 1.0, 16), MAT.steel, 0, PT + .5, 0)); g.add(MS(RB(.5, .06, .5, .02), MAT.steel, 0, PT + .03, 0));
      const ax = MS(new THREE.CylinderGeometry(.016, .016, 3.2, 12), MAT.steel, 0, PT + 1.7, .2); ax.rotation.x = Math.PI / 2; g.add(ax); g.add(MS(new THREE.SphereGeometry(.1, 32, 20), MAT.mirror, 0, PT + 1.7, 1.55)); return 2.8; },
    /* 07 Still: a long stone slab floating over steel */
    g => { g.add(MS(RB(2.5, .12, .9, .02), MAT.steel, 0, PT + .06, 0)); [-.9, .9].forEach(x => g.add(MS(new THREE.CylinderGeometry(.03, .03, .42, 12), MAT.steel, x, PT + .33, 0))); g.add(MS(RB(2.7, .22, 1.02, .05), MAT.stone, 0, PT + .65, 0)); g.add(MS(new THREE.SphereGeometry(.14, 32, 20), MAT.mirror, .72, PT + .9, .12)); return 1.05; },
    /* 08 Renew: stacked stones (pin #32), the instrument beside them */
    g => { const S = [[0, 0, .78, .32, .7, 3, 0], [.06, .5, .58, .26, .52, 8, .5], [-.04, .9, .4, .2, .38, 13, 1.1], [.03, 1.18, .24, .14, .23, 21, .3]];
      S.forEach(s => { const m = MS(pebble(s[2], s[3], s[4], s[5], .07, SOFT), s[5] === 13 ? MAT.stone2 : MAT.stone, s[0], PT + s[3] * .55 + s[1], 0); m.rotation.y = s[6]; g.add(m); }); return 1.5; },
    /* 09 Vital: an upright steel ring, a stone disc eclipsed inside */
    g => { const t = MS(new THREE.TorusGeometry(1.08, .11, 28, 160), MAT.steel, 0, PT + 1.12, 0); g.add(t); const d = MS(new THREE.CylinderGeometry(.78, .78, .07, 72), MAT.stone, .1, PT + 1.12, -.12); d.rotation.x = Math.PI / 2; g.add(d); g.add(MS(RB(.9, .14, .5, .03), MAT.steel2, 0, PT + .07, 0)); return 2.36; }
  ];
  const plinthGeo = (() => { const pr = [[1.6, 0], [1.622, .02], [1.622, PT - .06]]; for (let k = 1; k <= 8; k++) { const a = k / 8 * Math.PI / 2; pr.push([1.562 + .06 * Math.cos(a), PT - .06 + .06 * Math.sin(a)]); } pr.push([1.2, PT], [0, PT]);
    const g = new THREE.LatheGeometry(pr.map(p => new THREE.Vector2(p[0], p[1])), 160), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, v * .7, u * 3); } return g; })();
  /* measurement marks: a height rule beside each form, a diameter on the sand */
  const dimMat = new THREE.LineBasicMaterial({color: 0x2a2b2c, transparent: true, opacity: .5});
  const tags = [];
  function tagTex(txt) { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; const o = {c, t, txt, draw() { const g = c.getContext('2d'); g.clearRect(0, 0, 256, 64); g.font = '400 28px "DM Mono", ui-monospace, monospace'; g.fillStyle = '#3a3936'; g.textBaseline = 'middle'; g.fillText(txt, 6, 33); t.needsUpdate = true; }}; o.draw(); tags.push(o); return t; }
  function tag(txt, x, y, z, st, w = .95) { const m = new THREE.Sprite(new THREE.SpriteMaterial({map: tagTex(txt), transparent: true, depthWrite: false, opacity: .8})); m.center.set(0, .5); m.position.set(x, y, z); m.scale.set(w, w / 4, 1); m.userData.st = st; return m; }
  function dims(g, H, st) { const x = 1.98, pts = [x, PT, 0, x, H, 0, x - .09, PT, 0, x + .09, PT, 0, x - .09, H, 0, x + .09, H, 0];
    for (let y = PT + .5; y < H - .1; y += .5) pts.push(x, y, 0, x + .05, y, 0);
    pts.push(-1.62, .006, -1.95, 1.62, .006, -1.95, -1.62, .006, -1.85, -1.62, .006, -2.05, 1.62, .006, -1.85, 1.62, .006, -2.05);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.add(new THREE.LineSegments(geo, dimMat));
    const a = tag('H ' + H.toFixed(2), x + .14, H - .06, 0, st), b = tag('Ø 3.24', -1.58, .14, -2.15, st, .8); g.add(a, b); return [a, b]; }
  /* each station faces open ground, so the camera that comes to it has a clear line */
  function facing(i, L) { const S = L[i]; let best = 0, bs = 1e9; for (let a = -Math.PI; a < Math.PI; a += Math.PI / 24) { const fx = Math.sin(a), fz = Math.cos(a); let pen = Math.abs(a) * .9;
    for (let j = 0; j < 9; j++) { if (j === i) continue; const dx = L[j][0] - S[0], dz = L[j][1] - S[1], t = clamp(dx * fx + dz * fz, 0, 12), ex = S[0] + fx * t - L[j][0], ez = S[1] + fz * t - L[j][1], d = Math.hypot(ex, ez); pen += Math.max(0, 5.2 - d) * 3;
      const tb = clamp(-(dx * fx + dz * fz), 0, 16), bx = S[0] - fx * tb - L[j][0], bz = S[1] - fz * tb - L[j][1]; pen += Math.max(0, 4.2 - Math.hypot(bx, bz)) * 1.1; }
    if (pen < bs) { bs = pen; best = a; } } return best; }
  const stations = CAT.map((co, i) => {
    const g = new THREE.Group(), body = new THREE.Group(), rot = facing(i, LAY); g.position.set(LAY[i][0], 0, LAY[i][1]); g.rotation.y = rot;
    body.add(MS(plinthGeo, MAT.plinth));
    const lip = MS(new THREE.TorusGeometry(1.606, .0042, 6, 180), MAT.glint, 0, PT - .016, 0); lip.rotation.x = Math.PI / 2; lip.userData.noShadow = true; body.add(lip);
    const sg = new THREE.Group(); body.add(sg); const H = SCULPT[i](sg);
    const tg = dims(body, H, i);
    g.add(body); scene.add(g);
    body.traverse(m => { if (m.isMesh && !m.userData.noShadow) { m.castShadow = true; m.receiveShadow = true; } });
    const proxy = MS(new THREE.CylinderGeometry(1.75, 1.75, H + .8, 10), new THREE.MeshBasicMaterial({visible: false}), 0, (H + .8) / 2, 0); proxy.userData.st = i; g.add(proxy);
    return {i, co, g, body, H, rot, pos: g.position.clone(), proxy, tags: tg};
  });
  function relayout(L) { stations.forEach((s, i) => { s.g.position.set(L[i][0], 0, L[i][1]); s.pos.copy(s.g.position); s.rot = facing(i, L); s.g.rotation.y = s.rot; }); }
  return {stations, tags, relayout};
}

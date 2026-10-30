/* PR6 v7 · the nine stations (layout from v5/js/atlas/stations.js, kept exactly).
   The carved stone and steel forms of v5 are now simple soft clay and frosted forms on low plinths, built from the
   kit's recurring object: matte white pills and spheres. One small orange mark per station (the kit's tick). */
import * as THREE from 'three';
import {MS, rng} from './gfx.js';

export const PT = .16;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* the plan: where each station stands, desktop and phone framings (from v3/v5) */
export const LAYOUT = {
  desk: [[1.5, 7.8], [8.5, 6.5], [14.5, 1.2], [8.5, -4], [-1.5, -2.5], [-11.5, -3], [-16, -12], [-4, -13.5], [8.5, -12.5]],
  phone: [[-4.6, 7.6], [0, 8.6], [4.6, 7.2], [4.6, -.2], [0, .6], [-4.6, -.6], [-4.6, -7.8], [0, -7], [4.6, -8]]
};

export function buildStations(scene, CAT, MAT, SOFT, LAY) {
  const Q = SOFT ? 20 : 40;
  const pill = (r, len) => new THREE.CapsuleGeometry(r, len, SOFT ? 8 : 16, Q);
  const ball = r => new THREE.SphereGeometry(r, Q + 8, Math.round((Q + 8) * .66));
  const disc = (r, h) => new THREE.CylinderGeometry(r, r, h, Q * 2, 1);
  /* a pebble: a sphere flattened where it rests */
  const pebble = (sx, sy, sz) => { const g = ball(1); g.scale(sx, sy, sz); return g; };
  const lay = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; };
  const SCULPT = [
    /* 01 Foundation: the kit's composition, a leaning pill and a sphere */
    g => { g.add(lay(MS(pill(.42, 1.35), MAT.clay), .25, PT + 1.02, 0, 0, 0, -.5)); g.add(MS(ball(.42), MAT.clay, -.72, PT + .42, .25)); return 1.95; },
    /* 02 Form: three soft discs, stacked and turned */
    g => { [[1.05, .3, 0], [.82, .26, .5], [.58, .22, 1.1]].reduce((y, [r, h, a]) => { const m = MS(pebble(r, h, r * .92), MAT.clay, 0, y + h * .85, 0); m.rotation.y = a; g.add(m); return y + h * 1.7; }, PT); g.add(MS(ball(.2), MAT.clay, .1, PT + 1.62, 0)); return 1.85; },
    /* 03 Force: a tall pill standing, a small sphere at its foot */
    g => { g.add(MS(pill(.46, 1.9), MAT.clay, 0, PT + 1.41, 0)); g.add(MS(ball(.3), MAT.clay2, .85, PT + .3, .3)); return 2.85; },
    /* 04 Endure: five spheres, graduated, along an arc */
    g => { for (let i = 0; i < 5; i++) { const r = .5 - i * .075, a = -.9 + i * .45; g.add(MS(ball(r), i === 2 ? MAT.frost : MAT.clay, Math.sin(a) * 1.05, PT + r, Math.cos(a) * .55 - .3)); } return 1.1; },
    /* 05 Restore: a large sphere resting in a shallow frosted ring */
    g => { const t = MS(new THREE.TorusGeometry(.92, .12, 16, Q * 2), MAT.frost, 0, PT + .12, 0); t.rotation.x = Math.PI / 2; g.add(t); g.add(MS(ball(.88), MAT.clay, 0, PT + .88, 0)); return 1.85; },
    /* 06 Focus: a frosted lens standing on a pin, a sphere in front of it */
    g => { const l = MS(disc(.95, .1), MAT.frost, 0, PT + 1.45, 0); l.rotation.x = Math.PI / 2; g.add(l); g.add(MS(new THREE.CylinderGeometry(.035, .04, .55, 12), MAT.steel, 0, PT + .27, 0)); g.add(MS(ball(.34), MAT.clay, .35, PT + .34, .7)); return 2.45; },
    /* 07 Still: a long pill lying on two small spheres */
    g => { [-.75, .75].forEach(x => g.add(MS(ball(.2), MAT.clay2, x, PT + .2, 0))); g.add(lay(MS(pill(.36, 1.9), MAT.clay, 0, PT + .74, 0), 0, PT + .74, 0, 0, 0, Math.PI / 2)); return 1.15; },
    /* 08 Renew: stacked pebbles, a cairn */
    g => { [[.82, .3, .74, 0], [.6, .25, .55, .5], [.42, .2, .4, 1.1], [.26, .15, .25, .3]].reduce((y, [a, b, c, rt]) => { const m = MS(pebble(a, b, c), MAT.clay, .03 * Math.sin(y * 9), y + b * .9, 0); m.rotation.y = rt; g.add(m); return y + b * 1.75; }, PT); return 1.75; },
    /* 09 Vital: an upright clay ring, a frosted disc eclipsed inside it */
    g => { g.add(MS(new THREE.TorusGeometry(1.0, .16, 20, Q * 3), MAT.clay, 0, PT + 1.16, 0)); const d = MS(disc(.72, .08), MAT.frost, .08, PT + 1.16, -.1); d.rotation.x = Math.PI / 2; g.add(d); return 2.32; }
  ];
  /* a low plinth: a soft-edged disc, a faint orange tick on its rim */
  const plinthGeo = (() => { const pr = [[0, 0], [1.56, 0]]; for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI / 2; pr.push([1.56 + .05 * Math.sin(a), .05 - .05 * Math.cos(a)]); } pr.push([1.61, PT - .05]); for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI / 2; pr.push([1.56 + .05 * Math.cos(a), PT - .05 + .05 * Math.sin(a)]); } pr.push([0, PT]);
    return new THREE.LatheGeometry(pr.map(p => new THREE.Vector2(p[0], p[1])), SOFT ? 64 : 128); })();
  const tickGeo = new THREE.BoxGeometry(.05, .06, .2);
  /* each station faces open ground, so the camera that comes to it has a clear line (from v5) */
  function facing(i, L) { const S = L[i]; let best = 0, bs = 1e9; for (let a = -Math.PI; a < Math.PI; a += Math.PI / 24) { const fx = Math.sin(a), fz = Math.cos(a); let pen = Math.abs(a) * .9;
    for (let j = 0; j < 9; j++) { if (j === i) continue; const dx = L[j][0] - S[0], dz = L[j][1] - S[1], t = clamp(dx * fx + dz * fz, 0, 12), ex = S[0] + fx * t - L[j][0], ez = S[1] + fz * t - L[j][1], d = Math.hypot(ex, ez); pen += Math.max(0, 5.2 - d) * 3;
      const tb = clamp(-(dx * fx + dz * fz), 0, 16), bx = S[0] - fx * tb - L[j][0], bz = S[1] - fz * tb - L[j][1]; pen += Math.max(0, 4.2 - Math.hypot(bx, bz)) * 1.1; }
    if (pen < bs) { bs = pen; best = a; } } return best; }
  const stations = CAT.map((co, i) => {
    const g = new THREE.Group(), body = new THREE.Group(), rot = facing(i, LAY); g.position.set(LAY[i][0], 0, LAY[i][1]); g.rotation.y = rot;
    body.add(MS(plinthGeo, MAT.plinth));
    const tk = MS(tickGeo, MAT.orange, 0, PT - .03, 1.6); body.add(tk);
    const sg = new THREE.Group(); body.add(sg); const H = SCULPT[i](sg);
    g.add(body); scene.add(g);
    body.traverse(m => { if (m.isMesh) { m.castShadow = m.material !== MAT.frost; m.receiveShadow = true; } });
    const proxy = MS(new THREE.CylinderGeometry(1.75, 1.75, H + .8, 10), MAT.hidden, 0, (H + .8) / 2, 0); proxy.userData.st = i; g.add(proxy);
    return {i, co, g, body, sg, H, rot, pos: g.position.clone(), proxy};
  });
  function relayout(L) { stations.forEach((s, i) => { s.g.position.set(L[i][0], 0, L[i][1]); s.pos.copy(s.g.position); s.rot = facing(i, L); s.g.rotation.y = s.rot; }); }
  return {stations, relayout};
}

/* the recurring object: matte clay pills and spheres lying about the plane between stations (instanced) */
export function scatter(scene, MAT, SOFT, LAY, n = 46) {
  const r = rng(47), pills = [], balls = [];
  const near = (x, z) => LAY.some(p => Math.hypot(p[0] - x, p[1] - z) < 3.4);
  let guard = 0;
  while ((pills.length + balls.length) < n && guard++ < 2000) {
    const x = (r() - .5) * 64, z = (r() - .5) * 56 - 3; if (near(x, z)) continue;
    const s = .35 + Math.pow(r(), 2.2) * 1.1;
    (r() < .55 ? pills : balls).push({x, z, s, a: r() * Math.PI * 2});
  }
  const pg = new THREE.CapsuleGeometry(.32, .9, SOFT ? 6 : 12, SOFT ? 16 : 28), bg = new THREE.SphereGeometry(.38, SOFT ? 20 : 36, SOFT ? 14 : 24);
  const pm = new THREE.InstancedMesh(pg, MAT.clay, pills.length), bm = new THREE.InstancedMesh(bg, MAT.clay, balls.length);
  const o = new THREE.Object3D();
  pills.forEach((p, i) => { o.position.set(p.x, .32 * p.s, p.z); o.rotation.set(0, p.a, Math.PI / 2); o.scale.setScalar(p.s); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); });
  balls.forEach((p, i) => { o.position.set(p.x, .38 * p.s, p.z); o.rotation.set(0, 0, 0); o.scale.setScalar(p.s); o.updateMatrix(); bm.setMatrixAt(i, o.matrix); });
  [pm, bm].forEach(m => { m.castShadow = true; m.receiveShadow = true; scene.add(m); });
  return {pm, bm};
}

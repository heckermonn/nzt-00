// PR6 / Institute: one object, nine leaps (a look test for the film, A09).
// One thing stands alone on the stand of the Formulary's centre case. It is a stone. Nine times it becomes the next
// thing people learned to make, each time in a single snap, never a fade: fired clay, a storage jar, cast bronze,
// blown glass, turned steel, spun aluminium, a grown crystal of silicon, sealed titanium. The tenth is a PR6 vial.
// Every one is a solid of revolution, so the same mesh carries all ten: its outline and its material leap together.
// It is lit by the same path-traced panorama as the vials, so the last frame of the film is the store itself.
import * as THREE from 'three';
import { ENV } from './vials.js';

const TAU = Math.PI * 2, M = 168, SEG = 80;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;

// Outlines in metres on the stand (radius, height), from the axis at the foot to the axis at the top. Vessels that
// are open carry their inner wall too. The vials of this room stand a metre tall, and these keep their company.
// mat: alb (albedo), metal, lod (how soft the reflection is), glass, bump (pitted), speck (mottled), ring (turning
// marks: [depth, per metre]), glow (embers inside), wob (how far from true the hand left it).
export const FORMS = [
  { id: 'tools', mat: { alb: [0.2, 0.197, 0.188], facet: 1, metal: 0, lod: 5.6, glass: 0, bump: 1, speck: 0.55, ring: [0, 0], glow: 0, wob: 1, diff: 1 },
    p: [[0, 0], [0.09, 0.004], [0.185, 0.045], [0.245, 0.13], [0.268, 0.25], [0.255, 0.37], [0.212, 0.47], [0.135, 0.54], [0.05, 0.572], [0, 0.578]], soft: 1 },
  { id: 'fire', mat: { alb: [0.42, 0.2, 0.11], facet: 0.12, metal: 0, lod: 5.2, glass: 0, bump: 0.45, speck: 0.3, ring: [0.05, 150], glow: 1, wob: 0.16, diff: 1 },
    p: [[0, 0], [0.11, 0, 1], [0.13, 0.012], [0.215, 0.115], [0.272, 0.25], [0.288, 0.33, 1], [0.282, 0.347], [0.266, 0.345, 1], [0.25, 0.26], [0.198, 0.14], [0.11, 0.07], [0, 0.058]], soft: 1 },
  { id: 'agriculture', mat: { alb: [0.62, 0.47, 0.3], facet: 0, metal: 0, lod: 4.8, glass: 0, bump: 0.3, speck: 0.22, ring: [0.045, 120], glow: 0, wob: 0.07, diff: 1 },
    p: [[0, 0], [0.1, 0, 1], [0.115, 0.01], [0.195, 0.19], [0.258, 0.41], [0.268, 0.55], [0.24, 0.71], [0.165, 0.83], [0.122, 0.875], [0.116, 0.925], [0.148, 0.972], [0.156, 0.99], [0.146, 1.0], [0.128, 0.99, 1], [0.1, 0.94], [0.094, 0.9, 1], [0, 0.89]], soft: 1 },
  { id: 'mathematics', mat: { alb: [0.43, 0.275, 0.135], facet: 0.1, metal: 1, lod: 4.1, glass: 0, bump: 0.3, speck: 0.34, ring: [0, 0], glow: 0, wob: 0.012, diff: 0.25 },
    p: [[0, 0], [0.198, 0], [0.206, 0.008], [0.206, 0.04], [0.194, 0.052], [0.2, 0.3], [0.214, 0.455], [0.226, 0.466], [0.226, 0.5], [0.206, 0.5], [0.196, 0.455], [0.182, 0.11], [0, 0.09]] },
  { id: 'medicine', mat: { alb: [0.9, 0.93, 0.94], facet: 0, metal: 0, lod: 0.6, glass: 1, bump: 0, speck: 0, ring: [0, 0], glow: 0, wob: 0, diff: 1 },
    p: [[0, 0], [0.12, 0, 1], [0.198, 0.04], [0.26, 0.14], [0.274, 0.27], [0.25, 0.4], [0.172, 0.5], [0.092, 0.572], [0.07, 0.65], [0.068, 0.95, 1], [0.086, 0.985], [0.086, 1.0, 1], [0.06, 1.005, 1], [0, 1.005]], soft: 1 },
  { id: 'engineering', mat: { alb: [0.44, 0.45, 0.46], facet: 0, metal: 1, lod: 2.3, glass: 0, bump: 0, speck: 0, ring: [0.03, 900], glow: 0, wob: 0, diff: 0.1 },
    p: [[0, 0], [0.2, 0], [0.216, 0.016], [0.216, 0.1], [0.186, 0.116], [0.186, 0.15], [0.216, 0.166], [0.216, 0.42], [0.186, 0.436], [0.186, 0.47], [0.216, 0.486], [0.216, 0.58], [0.2, 0.6], [0.122, 0.6], [0.122, 0.7], [0.102, 0.72], [0, 0.72]] },
  { id: 'flight', mat: { alb: [0.7, 0.71, 0.72], facet: 0, metal: 1, lod: 4.3, glass: 0, bump: 0, speck: 0, ring: [0.016, 1400], glow: 0, wob: 0, diff: 0.12 },
    p: [[0, 0], [0.2, 0, 1], [0.242, 0.02], [0.262, 0.12], [0.262, 0.3], [0.25, 0.48], [0.215, 0.66], [0.16, 0.8], [0.09, 0.9], [0.03, 0.945], [0, 0.952]], soft: 1 },
  { id: 'computation', mat: { alb: [0.3, 0.33, 0.41], facet: 0, metal: 1, lod: 0.7, glass: 0, bump: 0, speck: 0, ring: [0.006, 260], glow: 0, wob: 0, diff: 0.05 },
    p: [[0, 0], [0.234, 0, 1], [0.24, 0.006, 1], [0.24, 0.82, 1], [0.2, 0.905], [0.1, 0.995], [0.042, 1.045], [0.03, 1.09, 1], [0.03, 1.12, 1], [0, 1.12]], soft: 1 },
  { id: 'space', mat: { alb: [0.52, 0.5, 0.48], facet: 0, metal: 1, lod: 2.7, glass: 0, bump: 0.04, speck: 0.05, ring: [0, 0], glow: 0, wob: 0, diff: 0.14 },
    p: [[0, 0], [0.19, 0, 1], [0.226, 0.02], [0.246, 0.08, 1], [0.246, 0.5, 1], [0.238, 0.508, 1], [0.238, 0.526, 1], [0.246, 0.534, 1], [0.246, 0.66, 1], [0.226, 0.74], [0.17, 0.79], [0.09, 0.81, 1], [0.09, 0.838, 1], [0.062, 0.85, 1], [0, 0.85]], soft: 1 },
  { id: 'vial', mat: { alb: [0.9, 0.93, 0.94], facet: 0, metal: 0, lod: 0.6, glass: 1, bump: 0, speck: 0, ring: [0, 0], glow: 0, wob: 0, diff: 1 },
    p: [[0, 0], [0.215, 0], [0.236, 0.025], [0.236, 0.615], [0.221, 0.687], [0.148, 0.758], [0.135, 0.81], [0.135, 0.845], [0.19, 0.857], [0.19, 0.95], [0.186, 0.963], [0.166, 0.966], [0.166, 0.996], [0.16, 1.009], [0, 1.009]] },
];
for (const f of FORMS) { f.h = Math.max(...f.p.map((q) => q[1])); f.r = Math.max(...f.p.map((q) => q[0])); f.foot = f.p.find((q) => q[1] > 0.02)[0]; }

/** Round an outline: a curve through its points, broken only at the ones marked as corners ([r, y, 1]). */
function rounded(p) {
  const out = [], cr = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
  let i0 = 0;
  for (let i = 1; i < p.length; i++) {
    if (!p[i][2] && i < p.length - 1) continue;
    const run = p.slice(i0, i + 1);
    if (run.length < 3) { if (!out.length) out.push([run[0][0], run[0][1]]); out.push([run[1][0], run[1][1]]); }
    else for (let k = 0; k < run.length - 1; k++) {
      const a = run[Math.max(0, k - 1)], b = run[k], c = run[k + 1], d = run[Math.min(run.length - 1, k + 2)];
      for (let q = k || out.length ? 1 : 0; q <= 10; q++) out.push([Math.max(0, cr(a[0], b[0], c[0], d[0], q / 10)), cr(a[1], b[1], c[1], d[1], q / 10)]);
    }
    i0 = i;
  }
  return out;
}
/** An outline as M points evenly spaced along its length; its own corners are kept, so edges stay edges. */
function resample(p) {
  const acc = [0]; for (let i = 1; i < p.length; i++) acc.push(acc[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const L = acc[acc.length - 1], out = new Float32Array(M * 2), pin = new Int16Array(M).fill(-1);
  for (let v = 0; v < p.length; v++) { let k = Math.round(acc[v] / L * (M - 1)); while (pin[k] >= 0 && k < M - 1) k++; pin[k] = v; }
  let seg = 0;
  for (let k = 0; k < M; k++) {
    if (pin[k] >= 0) { out[k * 2] = p[pin[k]][0]; out[k * 2 + 1] = p[pin[k]][1]; continue; }
    const s = k / (M - 1) * L; while (seg < p.length - 2 && acc[seg + 1] < s) seg++;
    const t = clamp((s - acc[seg]) / Math.max(1e-6, acc[seg + 1] - acc[seg]));
    out[k * 2] = lerp(p[seg][0], p[seg + 1][0], t); out[k * 2 + 1] = lerp(p[seg][1], p[seg + 1][1], t);
  }
  return out;
}

const VS = /* glsl */`
attribute float along;
varying vec3 vW; varying vec3 vN; varying vec3 vO; varying float vS;
void main(){ vO = position; vS = along; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;

const FS = (COMMON) => /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec3 vO; varying float vS;
uniform vec3 uAlb; uniform vec2 uRing;
uniform float uMetal, uLod, uGlass, uBump, uFacet, uSpeck, uGlow, uDiff, uLight, uFoot, uHaze, uTop;
${COMMON}
${ENV}
void main(){
  vec3 toCam = cameraPosition - vW; float dist = length(toCam); vec3 v = toCam / dist;
  vec3 n = normalize(vN); float side = dot(n, v) < 0. ? -1. : 1.; n *= side;
  // the grain of the thing wraps round it; its seam is at the back
  float ang = atan(vO.x, vO.z); vec2 g = vec2(ang * .22, vO.y);
  vec3 tu = vec3(cos(ang), 0., -sin(ang)), tv = normalize(cross(n, tu) + 1e-5);
  if (uBump + uFacet > 0.){
    float e = .004, h0 = fbm(g * 34.), hx = fbm((g + vec2(e, 0.)) * 34.), hy = fbm((g + vec2(0., e)) * 34.);
    float c0 = fbm(g * 9. + 5.), cx = fbm((g + vec2(e, 0.)) * 9. + 5.), cy = fbm((g + vec2(0., e)) * 9. + 5.);
    // fine pitting, and (a struck stone) broad flat flakes: value noise is flat-sided, which is what a flake scar is
    n = normalize(n - (((hx - h0) * .0034 * uBump + (cx - c0) * .0075 * uFacet) / e * tu + ((hy - h0) * .0034 * uBump + (cy - c0) * .0075 * uFacet) / e * tv));
  }
  if (uRing.x > 0.) n = normalize(n + tv * uRing.x * sin(vS * uRing.y));
  float ndv = max(dot(n, v), 0.), fr = pow(1. - ndv, 5.);
  vec3 r = reflect(-v, n);
  vec3 alb = uAlb * (1. + uSpeck * ((fbm(g * 60.) - .5) * 1.1 + (fbm(g * 7. + 3.) - .5) * .9));
  vec3 E = irr(n);
  float form = .6 + .4 * ndv;
  vec3 F0 = mix(vec3(.04), alb, uMetal);
  vec3 F = F0 + (1. - F0) * fr * mix(1., .25, clamp(uLod / 6., 0., 1.));
  // matt things take the soft light of the case; metals take its two lines of light
  vec3 col = alb * E * form * uDiff * .36 + env(r, uLod) * F * mix(.16, .66, uMetal);
  // embers: the inside of an open bowl, brightest at the bottom
  if (uGlow > 0.){
    float inward = smoothstep(.1, .6, -dot(normalize(vN.xz + 1e-5), normalize(vO.xz + 1e-5))) + smoothstep(.6, .95, vN.y) * step(vO.y, uTop - .02) * step(.02, vO.y);
    float deep = smoothstep(uTop, uTop * .2, vO.y), fl = .72 + .28 * vnoise(vec2(uTime * 2.3, ang * 2.));
    float coal = smoothstep(.42, .7, fbm(vO.xz * 26. + uTime * .05));
    col += uGlow * clamp(inward, 0., 1.) * fl * (vec3(1.5, .34, .05) * deep * deep * deep * (.3 + 1.8 * coal) + vec3(.34, .05, .008) * deep * deep);
  }
  col *= uLight;
  float a = 1.;
  if (uGlass > 0.){
    float Fg = .04 + .96 * fr;
    vec3 R = env(r, .6);
    vec3 t = refract(-v, n, 1. / 1.47); if (dot(t, t) < .01) t = -v;
    vec3 T = env(t, 1.6) * vec3(.93, .96, .97) * mix(1., .22, smoothstep(.55, 1., 1. - ndv));
    float e = clamp(.07 + pow(1. - ndv, 2.4) * 1.15 + .3 * smoothstep(.03, 0., vO.y) * (.35 + .65 * (1. - ndv)), 0., 1.);
    if (side < 0.) { e *= .55; Fg *= .35; }
    float ga = clamp(e * (1. - Fg) + Fg, 0., 1.);
    vec3 gc = (T * e * (1. - Fg) + R * Fg) / max(ga, 1e-3) * uLight;
    col = mix(col, gc, uGlass); a = mix(1., ga, uGlass);
  }
  col *= mix(.72, 1., smoothstep(0., .3, vW.y - uFoot));      // the stand takes some of the light at its foot
  col = mix(col, uFogC, uHaze);
  gl_FragColor = vec4(finish(col, dist), a);
}`;

/**
 * The one object, on stand n of the Formulary (o: { Z, COMMON, common, haze, U (the vials' panorama), n }).
 * Returns { mesh, set(a, b, e, k), light, at (its foot, a world point), top(a, b, e) }.
 */
export function createLeap(o) {
  const { Z, COMMON, common, haze, U } = o, A = Z.man.anchors, d = A.dims, nn = A['n' + (o.n || 5)];
  const P = FORMS.map((f) => resample(f.soft ? rounded(f.p) : f.p));
  const NV = M * (SEG + 1), pos = new Float32Array(NV * 3), nor = new Float32Array(NV * 3), along = new Float32Array(NV), idx = [];
  for (let m = 0; m < M - 1; m++) for (let j = 0; j < SEG; j++) { const a = m * (SEG + 1) + j, b = a + 1, c = a + SEG + 1, e = c + 1; idx.push(a, b, c, b, e, c); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('along', new THREE.BufferAttribute(along, 1));
  geo.setIndex(idx);
  const u = { uAlb: { value: new THREE.Vector3() }, uRing: { value: new THREE.Vector2() }, uMetal: { value: 0 }, uLod: { value: 3 }, uGlass: { value: 0 }, uBump: { value: 0 }, uFacet: { value: 0 }, uSpeck: { value: 0 },
    uGlow: { value: 0 }, uDiff: { value: 1 }, uLight: { value: 1 }, uFoot: { value: 0 }, uTop: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS(COMMON), side: THREE.DoubleSide, transparent: true, uniforms: { ...common(), ...U, uHaze: haze, ...u } });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 3;
  mesh.position.set(nn.vial[0], nn.vial[2] + 0.004, -nn.vial[1] + d.ring); Z.group.add(mesh);
  const cs = new Float32Array(SEG), sn = new Float32Array(SEG); for (let j = 0; j < SEG; j++) { cs[j] = Math.cos(j / SEG * TAU); sn[j] = Math.sin(j / SEG * TAU); }
  let key = '';
  const L = {
    mesh, u, forms: FORMS,
    /** Stand between form a and form b: e is how far the outline has gone (it may overshoot), k how far the material has. */
    set(a, b, e, k) {
      const fa = FORMS[a], fb = FORMS[b], ma = fa.mat, mb = fb.mat, kk = clamp(k);
      u.uAlb.value.set(lerp(ma.alb[0], mb.alb[0], kk), lerp(ma.alb[1], mb.alb[1], kk), lerp(ma.alb[2], mb.alb[2], kk));
      for (const [q, w] of [['uMetal', 'metal'], ['uLod', 'lod'], ['uGlass', 'glass'], ['uBump', 'bump'], ['uFacet', 'facet'], ['uSpeck', 'speck'], ['uGlow', 'glow'], ['uDiff', 'diff']]) u[q].value = lerp(ma[w], mb[w], kk);
      // turning marks do not blend: a thing has its own, and loses them as it leaves
      const rg = kk < 0.5 ? ma.ring : mb.ring; u.uRing.value.set(rg[0] * Math.abs(1 - 2 * kk), rg[1]);
      mat.depthWrite = u.uGlass.value < 0.5;
      u.uTop.value = lerp(fa.h, fb.h, clamp(e));
      const nk = a + '|' + b + '|' + e.toFixed(4); if (nk === key) return; key = nk;
      const pa = P[a], pb = P[b], wob = lerp(ma.wob, mb.wob, clamp(e));
      let s = 0, pr = 0, py = 0;
      for (let m = 0; m < M; m++) {
        const r = Math.max(0, lerp(pa[m * 2], pb[m * 2], e)), y = Math.max(0, lerp(pa[m * 2 + 1], pb[m * 2 + 1], e));
        if (m) s += Math.hypot(r - pr, y - py); pr = r; py = y;
        const w = wob * Math.min(1, r / 0.09), lean = wob * 0.085 * y;
        for (let j = 0; j <= SEG; j++) {
          const jj = j % SEG, th = jj / SEG * TAU, i3 = (m * (SEG + 1) + j) * 3;
          const dr = w ? w * (0.034 * Math.sin(2 * th + 0.7 + 3.1 * y) + 0.021 * Math.sin(3 * th + 2.1 - 5.3 * y) + 0.012 * Math.sin(5 * th + 4.0 + 9.0 * y) + 0.007 * Math.sin(8 * th - 1.0 + 15 * y)) : 0;
          const rr = r + dr;
          pos[i3] = rr * sn[jj] + lean; pos[i3 + 1] = y + (w ? w * 0.014 * Math.sin(3 * th + 1.2) * Math.min(1, y / 0.1) : 0); pos[i3 + 2] = rr * cs[jj];
          along[m * (SEG + 1) + j] = s;
        }
      }
      // normals from the surface itself, so the stone's faces and every edge take the light properly
      for (let m = 0; m < M; m++) {
        const m0 = Math.max(0, m - 1), m1 = Math.min(M - 1, m + 1);
        for (let j = 0; j <= SEG; j++) {
          const jj = j % SEG, j0 = (jj + SEG - 1) % SEG, j1 = (jj + 1) % SEG, i3 = (m * (SEG + 1) + j) * 3;
          const a0 = (m * (SEG + 1) + j0) * 3, a1 = (m * (SEG + 1) + j1) * 3, b0 = (m0 * (SEG + 1) + jj) * 3, b1 = (m1 * (SEG + 1) + jj) * 3;
          const ux = pos[a1] - pos[a0], uy = pos[a1 + 1] - pos[a0 + 1], uz = pos[a1 + 2] - pos[a0 + 2], vx = pos[b1] - pos[b0], vy = pos[b1 + 1] - pos[b0 + 1], vz = pos[b1 + 2] - pos[b0 + 2];
          let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz);
          if (l < 1e-9) { nx = 0; ny = m < M / 2 ? -1 : 1; nz = 0; } else { nx /= l; ny /= l; nz /= l; }
          nor[i3] = nx; nor[i3 + 1] = ny; nor[i3 + 2] = nz;
        }
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true; geo.attributes.along.needsUpdate = true;
    },
    /** Called every frame by the world. */
    update() { if (mesh.visible) { mesh.getWorldPosition(_p); u.uFoot.value = _p.y; } },
  };
  const _p = new THREE.Vector3();
  L.set(0, 0, 0, 0);
  return L;
}

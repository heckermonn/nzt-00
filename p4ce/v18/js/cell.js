// PR6 / Institute: the cell. One living thing that leads the member down the passage (the film, A09).
// It is soft and never still: a few spheres that run into one another, like the cells on the first page of the kit.
// In each bay of the passage it gathers itself into one sign (the nine eras, and last the member's own insignia),
// holds it, and lets go. It is not a mesh: it is a distance field, marched in the fragment shader inside a box that
// follows it, so the change from a drop to a sign is a real change of shape and never a fade. The signs are the same
// outlines the page uses (js/eras.js, js/insignia.js), turned into distance fields once when the world is made.
import * as THREE from 'three';
import { ERA } from './eras.js';
import { INSIGNIA } from './insignia.js';

export const SIGNS = [...Object.keys(ERA), ...Object.keys(INSIGNIA)];
const TILE = 256, GLYPH = 188, COLS = 4, ROWS = Math.ceil(SIGNS.length / COLS), MG = TILE / GLYPH, BOUND = 1.9;

/** Squared distance to the nearest zero of f, along one line (Felzenszwalb and Huttenlocher). */
function edt1(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
  for (let q = 1; q < n; q++) {
    let s; do { const p = v[k]; s = ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p); } while (s <= z[k] && --k >= 0);
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
  }
  k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const p = v[k]; d[q] = (q - p) * (q - p) + f[p]; }
}
function edt(on, n) {      // on: 1 where the feature is; returns the distance (pixels) from every pixel to it
  const INF = 1e12, g = new Float64Array(n * n), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < n; x++) { for (let y = 0; y < n; y++) f[y] = on[y * n + x] ? 0 : INF; edt1(f, n, d, v, z); for (let y = 0; y < n; y++) g[y * n + x] = d[y]; }
  for (let y = 0; y < n; y++) { for (let x = 0; x < n; x++) f[x] = g[y * n + x]; edt1(f, n, d, v, z); for (let x = 0; x < n; x++) g[y * n + x] = Math.sqrt(d[x]); }
  return g;
}
/** Every sign as a signed distance field (in units of half a sign's height), side by side in one texture. */
function signAtlas() {
  const w = COLS * TILE, h = ROWS * TILE, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff';
  SIGNS.forEach((id, i) => {
    g.save(); g.translate((i % COLS) * TILE + (TILE - GLYPH) / 2, Math.floor(i / COLS) * TILE + (TILE - GLYPH) / 2); g.scale(GLYPH / 100, GLYPH / 100);
    g.fill(new Path2D(ERA[id] || INSIGNIA[id].d), 'evenodd'); g.restore();
  });
  const px = g.getImageData(0, 0, w, h).data, out = new Uint16Array(w * h), on = new Uint8Array(TILE * TILE), off = new Uint8Array(TILE * TILE);
  for (let i = 0; i < SIGNS.length; i++) {
    const x0 = (i % COLS) * TILE, y0 = Math.floor(i / COLS) * TILE;
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const a = px[((y0 + y) * w + x0 + x) * 4] > 127 ? 1 : 0; on[y * TILE + x] = a; off[y * TILE + x] = 1 - a; }
    const dOut = edt(on, TILE), dIn = edt(off, TILE);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const k = y * TILE + x, sd = (dOut[k] > 0 ? dOut[k] - 0.5 : 0.5 - dIn[k]) * 2 / GLYPH; out[(y0 + y) * w + x0 + x] = THREE.DataUtils.toHalfFloat(sd); }
  }
  for (let k = 0; k < out.length; k++) if (!out[k]) out[k] = THREE.DataUtils.toHalfFloat(1);      // tiles with no sign in them
  const t = new THREE.DataTexture(out, w, h, THREE.RedFormat, THREE.HalfFloatType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return t;
}

const VS = /* glsl */`
varying vec3 vW;
void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const FS = (COMMON) => /* glsl */`
varying vec3 vW;
uniform sampler2D tSdf; uniform mat4 uVP;
uniform vec3 uPos, uAmb, uKey, uKeyDir, uGlowC, uBody, uAbs, uBack; uniform vec2 uTile;
uniform float uSize, uAng, uForm, uGone, uStir, uLife, uStretch, uThick, uDay;
uniform vec4 uBall[5];
${COMMON}
const float MG = ${MG.toFixed(5)}, R = ${BOUND.toFixed(2)};
// a sign: its outline, given a body, with its edges eased
float sign3(vec3 p){
  vec2 lim = vec2(MG - .03), q = abs(p.xy) - lim, c = clamp(p.xy, -lim, lim);
  vec2 uv = (uTile + vec2(c.x / MG * .5 + .5, .5 - c.y / MG * .5)) / vec2(${COLS}., ${ROWS}.);
  float d2 = texture2D(tSdf, uv).r + length(max(q, 0.));
  vec2 w = vec2(d2, abs(p.z) - uThick * (.4 + .6 * smoothstep(0., .17, -d2)));      // fuller toward its middle, like something filled
  return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - .04;
}
float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
// the drop: five spheres that run into one another, drawn out along its way when it travels
float drop(vec3 p){ p.z /= uStretch; float d = 9.; for (int i = 0; i < 5; i++) d = smin(d, length(p - uBall[i].xyz) - uBall[i].w, .36); return d; }
float map(vec3 p){
  float d = drop(p);
  if (uForm > 0.) d = mix(d, sign3(p), uForm);
  // it is alive: the surface breathes a little always, and boils while it changes
  float w = sin(p.x * 3.1 + uLife * 1.3) * sin(p.y * 2.7 - uLife * 1.1) * sin(p.z * 3.3 + uLife * .9) + .5 * sin(p.x * 6.7 - uLife * 1.7) * sin(p.y * 7.3 + uLife * 1.4);
  return d + w * (.022 + .15 * uStir) + uGone;
}
void main(){
  vec3 ro = cameraPosition, rd = normalize(vW - cameraPosition);
  float ca = cos(uAng), sa = sin(uAng); mat2 rot = mat2(ca, -sa, sa, ca);
  vec3 lo = (ro - uPos) / uSize, ld = rd; lo.xz = rot * lo.xz; ld.xz = rot * ld.xz;
  float b = dot(lo, ld), c = dot(lo, lo) - R * R, h = b * b - c; if (h < 0.) discard; h = sqrt(h);
  float t = max(-b - h, 0.), t1 = -b + h, d = 1.; bool hit = false;
  for (int i = 0; i < 72; i++){ d = map(lo + ld * t); if (d < .003) { hit = true; break; } t += d * .8; if (t > t1) break; }
  if (!hit) discard;
  vec3 p = lo + ld * t; vec2 e = vec2(.007, -.007);
  vec3 n = normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
  // how much of it the eye looks through from here, and whether its heart lies on the way
  float thick = 0.; vec3 q = p;
  for (int i = 0; i < 7; i++){ q += ld * .1; thick += smoothstep(.03, -.05, map(q)); }
  thick *= .1;
  vec3 toC = uBall[0].xyz - p; float along = dot(toC, ld), core = smoothstep(.27, .1, length(toC - ld * along)) * step(0., along) * (1. - uForm) * (1. - smoothstep(0., .3, uGone));
  n.xz = n.xz * rot;                                        // back to the room
  vec3 pw = ro + rd * t * uSize, v = -rd, L = normalize(uKeyDir);
  float ndv = max(dot(n, v), 0.), fr = pow(1. - ndv, 3.);
  // a body of blue gel: the light behind it comes through, pale where it is thin and deep where it is thick
  float em = 1. - exp(-thick * 1.8);
  vec3 col = uBack * (exp(-uAbs * thick * 4.) + vec3(.045, .11, .27) * (uAbs.z / 1.05) * (1. - exp(-thick * 3.)));
  // its own light, from its depth: blue where it is thin, near white at its thickest, and a bright skin at its outline
  col += uGlowC * (mix(vec3(.25, .5, 1.), vec3(1.15, 1.05, .95), em) * em * 1.6 + fr * .45);
  col = col * (1. - .6 * core * uDay) + uGlowC * 1.1 * core;              // its heart: bright in the dark, dark in the day
  col += uBody * uKey * pow(dot(n, L) * .5 + .5, 2.) * .2;                // a little light scattered in its skin
  col += (uAmb + uKey * .35) * (.03 + .55 * fr);                          // the room in a wet surface, most at its outline
  col += (uKey + uGlowC * 1.5) * (pow(max(dot(n, normalize(vec3(0., 1., .35) + v)), 0.), 70.) * .7 + pow(max(dot(n, normalize(L + v)), 0.), 40.) * .3);
  vec4 clip = uVP * vec4(pw, 1.); gl_FragDepth = clamp(clip.z / clip.w * .5 + .5, 0., 1.);
  gl_FragColor = vec4(finish(col, t * uSize), 1.);
}`;

/** Make the cell in a scene. o: { scene, COMMON, common }. Returns { mesh, u, show(on), sign(id), balls(life, calm) }. */
export function createCell(o) {
  const u = {
    tSdf: { value: signAtlas() }, uVP: { value: new THREE.Matrix4() }, uPos: { value: new THREE.Vector3() }, uSize: { value: 1 }, uAng: { value: 0 },
    uAmb: { value: new THREE.Vector3(0.03, 0.04, 0.06) }, uKey: { value: new THREE.Vector3(0, 0, 0) }, uKeyDir: { value: new THREE.Vector3(0, 0.3, -1) },
    uGlowC: { value: new THREE.Vector3(0.2, 0.4, 0.7) }, uBody: { value: new THREE.Vector3(0.42, 0.56, 0.7) }, uAbs: { value: new THREE.Vector3(2.7, 1.7, 1.05) }, uBack: { value: new THREE.Vector3(0.02, 0.03, 0.05) }, uDay: { value: 0 }, uTile: { value: new THREE.Vector2(0, 0) },
    uForm: { value: 0 }, uGone: { value: 0 }, uStir: { value: 0 }, uLife: { value: 0 }, uStretch: { value: 1 }, uThick: { value: 0.16 },
    uBall: { value: [0, 1, 2, 3, 4].map(() => new THREE.Vector4(0, 0, 0, 0.5)) },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS(o.COMMON), side: THREE.BackSide, uniforms: { ...o.common(), ...u } });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2 * BOUND, 2 * BOUND, 2 * BOUND), mat);
  mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 4; o.scene.add(mesh);
  mesh.onBeforeRender = (r, s, cam) => { u.uVP.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); };
  const C = {
    mesh, u,
    show(on) { mesh.visible = !!on; },
    /** Which sign it gathers into next. */
    sign(id) { const i = Math.max(0, SIGNS.indexOf(id)); u.uTile.value.set(i % COLS, Math.floor(i / COLS)); },
    /** Where it is, how large (half a sign's height, metres) and how turned. Call once a frame. */
    place(pos, size, ang = 0) { u.uPos.value.copy(pos); u.uSize.value = size; u.uAng.value = ang; mesh.position.copy(pos); mesh.scale.setScalar(size); },
    /** The five spheres of the drop at a moment of its life; spread 0 gathers them into one. */
    balls(life, spread = 1) {
      for (let j = 0; j < 5; j++) {
        const a = life * (0.55 + 0.13 * j) + j * 2.4, b = life * (0.47 + 0.09 * j) + j * 1.7, r = (j ? 0.42 : 0.2) * spread;
        u.uBall.value[j].set(r * Math.sin(a) * Math.cos(b * 0.6), r * 0.8 * Math.sin(b), r * 0.7 * Math.cos(a) * Math.sin(b * 0.8 + 1), (j ? 0.3 : 0.46) + 0.06 * Math.sin(life * 0.9 + j * 2));
      }
      u.uLife.value = life;
    },
  };
  C.balls(0); C.sign(SIGNS[0]);
  return C;
}

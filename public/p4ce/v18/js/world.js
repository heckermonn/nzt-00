// PR6 / Institute: the real-time world. One continuous place (the alley, the passage behind the chosen door, the
// Atrium and the three rooms beyond its openings) drawn with Three.js. Every surface carries light that was
// path-traced in Blender and baked into textures (blender/world.py), so the page needs no lights of its own and the
// rooms look like the Cycles pictures from any position. Moving between screens is always a camera move.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createVials } from './vials.js';

const V3 = THREE.Vector3, DEG = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Blender coordinates (x, y, z up) to three (x, y up, z). */
export const b2t = (p, out = new V3()) => out.set(p[0], p[2], -p[1]);

// The same numbers as blender/world.py: the passage's nine bays, and where the rooms stand.
export const PASS = { N: 9, W0: 1.7, W1: 13.0, H0: 3.2, H1: 22.0, L0: 5.0, L1: 10.0 };
export const BAYS = (() => { const o = []; let y = 0; for (let i = 0; i < PASS.N; i++) { const s = i / (PASS.N - 1), w = PASS.W0 * (PASS.W1 / PASS.W0) ** s, h = PASS.H0 * (PASS.H1 / PASS.H0) ** s, l = PASS.L0 * (PASS.L1 / PASS.L0) ** s; o.push({ y, w, h, l }); y += l; } o.L = y; return o; })();
const ALLEY = { DX: 1.08, DOOR_Y: 6.6, T: 0.7 }, A_BACK = -17;
export const INSIDE_Y = ALLEY.DOOR_Y + ALLEY.T + (-(A_BACK - 1)) + BAYS.L;      // Blender y of the Atrium's origin, in the alley's frame
const ZONES = ['alley', 'passage', 'atrium', 'compass', 'formulary', 'archive'];
// where each room stands, in the Atrium's frame (Blender coordinates); the alley is the world's own frame
const ORIGIN = { passage: [0, A_BACK - 1 - BAYS.L, 0], atrium: [0, 0, 0], compass: [0, 107.2, 7], formulary: [-20.2, 96, 0.02], archive: [20.5, 91, 1.45] };
const SYMS = ['ouroboros', 'djed', 'scarab', 'shen'];

const COMMON = /* glsl */`
uniform float uExpo, uTime, uWet, uVig, uGrain, uFogD, uPass, uCon;
uniform vec2 uRes;
uniform vec3 uFogC;
vec3 toLin(vec3 c){ return mix(c / 12.92, pow((c + .055) / 1.055, vec3(2.4)), step(.04045, c)); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= .5; } return s; }
// scene light to the screen: haze, exposure, film curve, then the lens (vignette, grain).
// In the mirror pass the light is kept linear (packed) so that floors can add it to their own before the film curve.
vec3 finish(vec3 col, float dist){
  col = mix(uFogC, col, exp(-dist * uFogD));
  if (uPass > .5) return sqrt(clamp(col / 16., 0., 1.));
  col = pow(aces(col * uExpo), vec3((1. + uCon) / 2.2));      // uCon: a high-key room keeps its whites and gets its form back
  vec2 q = gl_FragCoord.xy / uRes - .5;
  col *= 1. - uVig * dot(q, q) * 1.5;
  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.7) - .5) * uGrain;
  return col;
}`;

const BAKED_VS = /* glsl */`
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;

const BAKED_FS = /* glsl */`
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
uniform sampler2D tC, tL, tA, tB, tD, tRefl;
uniform float sL, uGain, uRefl, uFloorY, uMirrorY, uDim, uHaze;
uniform vec3 sLamp, wLamp, uJoint, uTint;
uniform vec4 uPL[2]; uniform vec3 uPLc[2];
${COMMON}
void main(){
  vec3 toCam = cameraPosition - vW; float dist = length(toCam); vec3 v = toCam / dist;
  vec3 n = normalize(vN); if (dot(n, v) < 0.) n = -n;
  vec3 alb = vec3(.2), col;
#ifdef DISC
  if (length(vUv - .5) > .492) discard;      // a round cast on a square sheet: the corners were never baked
#endif
#ifdef COMBINED
  col = toLin(texture2D(tC, vUv).rgb) * sL;
#else
  alb = toLin(texture2D(tC, vUv).rgb);
  #ifdef JOINTS
    // the fine joints of large stone panels, drawn here so they stay crisp at any distance
    vec2 jc = vec2((vW.x - vW.z) / uJoint.x, vW.y / uJoint.y);
    vec2 jd = abs(fract(jc) - .5), jw = fwidth(jc) * 1.2 + vec2(.012 / uJoint.x, .012 / uJoint.y);
    float j = max(smoothstep(.5 - jw.x, .5, jd.x), smoothstep(.5 - jw.y, .5, jd.y)) * (1. - smoothstep(.0, .02, max(fwidth(jc.x), fwidth(jc.y))));
    alb *= mix(1., uJoint.z, j * step(abs(n.y), .5));
  #endif
  vec3 L = toLin(texture2D(tL, vUv).rgb) * sL;
  #ifdef LAMPS
    L += toLin(texture2D(tA, vUv).rgb) * sLamp.x * wLamp.x;
    #if LAMPS > 1
      L += toLin(texture2D(tB, vUv).rgb) * sLamp.y * wLamp.y;
    #endif
    #if LAMPS > 2
      L += toLin(texture2D(tD, vUv).rgb) * sLamp.z * wLamp.z;
    #endif
  #endif
  col = alb * L;
#endif
  col *= uGain * uTint * uDim;
  // live light (the Keeper's glow)
  for (int i = 0; i < 2; i++){
    vec3 d = uPL[i].xyz - vW; float r2 = dot(d, d), a = uPL[i].w / (uPL[i].w + r2);
    col += alb * uPLc[i] * a * a * (.25 + .75 * max(dot(n, d * inversesqrt(r2 + 1e-4)), 0.));
  }
#ifdef REFLECT
  if (uPass < .5 && abs(uFloorY - uMirrorY) < .2){
    vec2 ruv = gl_FragCoord.xy / uRes;
    float fres = .04 + .96 * pow(1. - max(dot(n, v), 0.), 5.);
    float k = uRefl, lod = 2.2;
    #ifdef WET
      // wet tarmac: standing water in broad shallow puddles and along the gutter, stirred by the rain
      float pud = max(smoothstep(.43, .53, fbm(vW.xz * .5 + 3.)), smoothstep(.55, .15, abs(vW.x)));
      vec2 rip = vec2(vnoise(vW.xz * 11. + uWet * vec2(1.3, .9)), vnoise(vW.xz * 11. - uWet * vec2(.8, 1.2) + 7.)) - .5;
      ruv += rip * (.006 + .016 * pud) * clamp(4. / dist, .15, 1.);
      k = mix(.22, 1., pud) * (.25 + .75 * fres) * 1.6; lod = mix(3.4, .6, pud);
    #else
      k *= (.35 + .65 * fres) * 1.5;
    #endif
    vec3 rc = textureLod(tRefl, ruv, lod).rgb; rc = rc * rc * 16.;
    col = col * (1. - .5 * clamp(k, 0., 1.)) + rc * k;
  }
#endif
  col = mix(col, uFogC, uHaze);
  gl_FragColor = vec4(finish(col, dist), 1.);
}`;

const WATER_FS = /* glsl */`
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
uniform sampler2D tRefl; uniform float uFloorY, uMirrorY;
${COMMON}
void main(){
  vec3 toCam = cameraPosition - vW; float dist = length(toCam); vec3 v = toCam / dist;
  vec3 col = vec3(.05, .07, .09);
  if (uPass < .5 && abs(uFloorY - uMirrorY) < .2){
    vec2 ruv = gl_FragCoord.xy / uRes;
    vec2 rip = vec2(vnoise(vW.xz * 1.4 + uTime * .11), vnoise(vW.xz * 1.4 - uTime * .09 + 5.)) - .5;
    ruv += rip * .004 * clamp(20. / dist, .1, 1.);
    float fres = .06 + .94 * pow(1. - max(v.y, 0.), 4.);
    vec3 rc = textureLod(tRefl, ruv, .5).rgb; rc = rc * rc * 16.;
    col = mix(col, rc, clamp(fres + .25, 0., 1.));
  } else col = uFogC * .6;
  gl_FragColor = vec4(finish(col, dist), 1.);
}`;

const EMIT_FS = /* glsl */`
varying vec3 vW; uniform vec3 uCol; uniform float uW, uHaze;
${COMMON}
void main(){ gl_FragColor = vec4(finish(mix(uCol * uW, uFogC, uHaze), length(cameraPosition - vW)), 1.); }`;

const RAIN_VS = /* glsl */`
attribute vec3 seed; attribute float tip, more;
uniform float uWet, uRain, uHold; uniform vec3 uLampA, uLampB;
varying float vA;
void main(){
  float sp = 8. + 4. * fract(seed.y * 7.31), H = 10.;
  float y = H - mod(seed.y * H + uWet * sp, H);
  // falling, a drop is a streak; held still in the air (uHold) it is a bead that catches the lamps
  vec3 p = vec3(seed.x + (H - y) * .035, y + tip * (.22 + .2 * fract(seed.y * 3.7)) * (1. - .94 * uHold), seed.z);
  float a = .05 + 2.2 / (1. + dot(p - uLampA, p - uLampA) * .9) + 2.2 / (1. + dot(p - uLampB, p - uLampB) * .9);
  vA = a * uRain * (1. - tip * .7 * (1. - uHold)) * (1. + 1.6 * uHold) * mix(1., uHold, more);      // held still, the finer rain between the streaks shows too
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
}`;
const RAIN_FS = /* glsl */`
varying float vA; uniform float uExpo, uPass;
void main(){ if (uPass > .5) discard; gl_FragColor = vec4(vec3(.62, .76, .95) * vA * uExpo * .5, 1.); }`;

// the furniture of the two doors (bolts, number plate): plain metal under the lamp above each door
const PROP_FS = /* glsl */`
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
uniform sampler2D tMap; uniform vec3 uBase, uLampP; uniform float uLamp, uUseMap, uGloss;
${COMMON}
void main(){
  vec3 toCam = cameraPosition - vW; float dist = length(toCam); vec3 v = toCam / dist;
  vec3 n = normalize(vN); if (dot(n, v) < 0.) n = -n;
  vec3 L = uLampP - vW; float r2 = dot(L, L); L *= inversesqrt(r2);
  vec3 lamp = vec3(.78, .86, 1.) * uLamp * 4. / (1. + r2 * .8);
  vec3 alb = uBase * (uUseMap > .5 ? toLin(texture2D(tMap, vUv).rgb) : vec3(1.));
  vec3 col = alb * (vec3(.02, .028, .04) + lamp * (.3 + .7 * max(dot(n, L), 0.)));
  col += lamp * pow(max(dot(n, normalize(L + v)), 0.), uGloss) * .12 * (uUseMap > .5 ? .3 : 1.);
  gl_FragColor = vec4(finish(col, dist), 1.);
}`;

const BLADE_VS = /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec3 vO;
void main(){ vO = normal; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const BLADE_FS = /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec3 vO;
uniform vec3 uSlot;
${COMMON}
vec3 env(vec3 d){
  vec3 c = mix(vec3(.9, 1.05, 1.2), vec3(2.3, 2.45, 2.5), smoothstep(-.3, .5, d.y));
  c += vec3(7., 7.6, 8.) * pow(max(dot(d, uSlot), 0.), 24.);
  c += vec3(5., 5.4, 5.8) * pow(max(d.y, 0.), 10.);
  return c;
}
void main(){
  vec3 toCam = cameraPosition - vW; float dist = length(toCam); vec3 v = toCam / dist;
  vec3 n = normalize(vN); if (dot(n, v) < 0.) n = -n;
  float fres = .05 + .95 * pow(1. - max(dot(n, v), 0.), 4.);
  float edge = step(abs(vO.z), .5);
  vec3 col = env(reflect(-v, n)) * mix(vec3(.80, .90, .96), vec3(1.), fres);
  col = mix(col, vec3(1.2, 1.9, 2.2), edge * .75);
  float a = clamp(mix(.10 + fres * .9, .82, edge), 0., 1.);
  gl_FragColor = vec4(finish(col, dist), a);
}`;

const glowTex = () => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,.5)'); r.addColorStop(0.5, 'rgba(255,255,255,.1)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t;
};

export function createWorld(canvas, base = 'assets/world/') {
  let renderer = null;
  const opt = { antialias: true, alpha: false, powerPreference: 'high-performance' };
  let gl = null; try { gl = canvas.getContext('webgl2', opt); } catch (e) { gl = null; }
  if (!gl) return null;                              // no WebGL 2: the caller falls back to stills
  try { renderer = new THREE.WebGLRenderer({ canvas, context: gl, ...opt }); } catch (e) { return null; }
  if (!renderer || !renderer.capabilities.isWebGL2) return null;
  renderer.autoClear = true;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, 0.08, 600); scene.add(camera);
  const mirrorCam = new THREE.PerspectiveCamera(); mirrorCam.matrixAutoUpdate = false; mirrorCam.matrixWorldAutoUpdate = false;
  const rt = new THREE.WebGLRenderTarget(256, 256, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
  const texLoader = new THREE.TextureLoader(), gltf = new GLTFLoader();
  // a host that cannot serve .glb carries the same bytes as base64 in <zone>.glb.json (window.PR6_GLB = 'json')
  const model = (name) => (window.PR6_GLB === 'json'
    ? fetch(base + name + '.glb.json').then((r) => r.json()).then((j) => { const b = atob(j.b64), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return gltf.parseAsync(u.buffer, base); })
    : gltf.loadAsync(base + name + '.glb'));
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); blank.needsUpdate = true;
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  // uniforms shared by every material in the world
  const G = {
    uExpo: { value: 0.8 }, uTime: { value: 0 }, uWet: { value: 0 }, uVig: { value: 0.5 }, uGrain: { value: 0.03 }, uFogD: { value: 0.01 }, uPass: { value: 0 }, uCon: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) }, uFogC: { value: new THREE.Color(0.02, 0.03, 0.05) }, tRefl: { value: rt.texture }, uMirrorY: { value: 0 },
    uPL: { value: [new THREE.Vector4(0, -99, 0, 1), new THREE.Vector4(0, -99, 0, 1)] }, uPLc: { value: [new THREE.Color(0, 0, 0), new THREE.Color(0, 0, 0)] },
  };
  const common = () => ({ uExpo: G.uExpo, uTime: G.uTime, uWet: G.uWet, uVig: G.uVig, uGrain: G.uGrain, uFogD: G.uFogD, uPass: G.uPass, uCon: G.uCon, uRes: G.uRes, uFogC: G.uFogC });
  const inside = new THREE.Group(); scene.add(inside);
  const groups = {}, haze = {};
  for (const n of ZONES) { const g = groups[n] = new THREE.Group(); g.name = n; haze[n] = { value: 0 }; if (n === 'alley') scene.add(g); else { b2t(ORIGIN[n], g.position); inside.add(g); } }
  const W = {
    renderer, scene, camera, G, canvas, zones: {}, anchors: {}, lamps: { lampL: 1, lampR: 1, tube: 1 },
    cam: { p: new V3(0, 1.5, 8), t: new V3(0, 2, -6), fov: 60, roll: 0 }, rect: { x: 0, y: 0, w: 1, h: 1 }, shift: [0, 0],
    expo: 0.8, fog: [0.02, 0.03, 0.05, 0.01], vig: 0.5, grain: 0.03, con: 0, rain: 0, sway: 1, pointer: [0, 0], motion: true,
    side: 'L', doors: {}, compassT: 0, compassGoal: 0, holo: 0, ready: false, lineage: 'ouroboros',
  };
  const tex = (url, mips) => new Promise((res, rej) => texLoader.load(url, (t) => {
    t.flipY = false; t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = !!mips; t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.anisotropy = mips ? maxAniso : 1; res(t);
  }, undefined, () => rej(new Error('texture ' + url))));

  /** Blender point in a zone's own frame to a world position. */
  W.pt = (zone, p, out = new V3()) => groups[zone].localToWorld(b2t(p, out));
  const insideOffset = () => { inside.position.set((W.side === 'L' ? -1 : 1) * ALLEY.DX, 0, -INSIDE_Y); scene.updateMatrixWorld(true); };
  /** Which door the passage stands behind. */
  W.setSide = (side) => { if (side) W.side = side; insideOffset(); for (const n in W.zones) refloor(W.zones[n]); };
  const refloor = (Z) => { const fy = Z.group.getWorldPosition(new V3()).y; Z.floorY = fy; for (const k in Z.mats) if (Z.mats[k].uniforms.uFloorY) Z.mats[k].uniforms.uFloorY.value = fy; };
  insideOffset();

  const bakedMat = (zone, g, info, T) => {
    const defs = {}; const lampNames = info.lamps ? Object.keys(info.lamps) : [];
    if (info.mode === 'combined') defs.COMBINED = 1;
    if (zone === 'alley' && info.relief && g.startsWith('med')) defs.DISC = 1;
    if (lampNames.length) defs.LAMPS = lampNames.length;
    if (info.joints) defs.JOINTS = 1;
    if (info.reflect) { defs.REFLECT = 1; if (zone === 'alley') defs.WET = 1; }
    const m = new THREE.ShaderMaterial({
      vertexShader: BAKED_VS, fragmentShader: BAKED_FS, defines: defs, side: THREE.DoubleSide,
      uniforms: {
        ...common(), tC: { value: T.c || T.b }, tL: { value: T.l || null }, tA: { value: T.lamps[0] || null }, tB: { value: T.lamps[1] || null }, tD: { value: T.lamps[2] || null }, tRefl: G.tRefl,
        sL: { value: info.scale || 1 }, uGain: { value: 1 }, uDim: { value: 1 }, uRefl: { value: info.reflect || 0 }, uFloorY: { value: 0 }, uMirrorY: G.uMirrorY, uHaze: haze[zone],
        sLamp: { value: new V3(info.lamps ? info.lamps[lampNames[0]] || 0 : 0, info.lamps ? info.lamps[lampNames[1]] || 0 : 0, info.lamps ? info.lamps[lampNames[2]] || 0 : 0) },
        wLamp: { value: new V3(1, 1, 1) }, uJoint: { value: new V3(...(info.joints || [1, 1, 1])) }, uTint: { value: new V3(1, 1, 1) }, uPL: G.uPL, uPLc: G.uPLc,
      },
    });
    m.userData.lamps = lampNames;
    m.extensions = { derivatives: true };
    return m;
  };

  const loading = {};
  /** Load a zone (once): its manifest, geometry and baked textures. */
  W.load = (name) => {
    if (loading[name]) return loading[name];
    loading[name] = (async () => {
      const [man, g] = await Promise.all([fetch(base + name + '.json').then((r) => { if (!r.ok) throw new Error('zone ' + name); return r.json(); }), model(name)]);
      const group = groups[name];
      const Z = { name, man, group, mats: {}, emits: [], meshes: {}, floorY: 0 };
      const jobs = [];
      const meshes = []; g.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
      for (const o of meshes) {
        const gname = o.userData.group, em = man.emit.find((e) => e.name === o.name);
        group.add(o); o.visible = false;                          // nothing shows before its light has arrived
        if (em) {
          o.visible = true;
          o.material = new THREE.ShaderMaterial({ vertexShader: BAKED_VS, fragmentShader: EMIT_FS, side: THREE.DoubleSide, uniforms: { ...common(), uCol: { value: new V3(em.rgb[0] * em.strength, em.rgb[1] * em.strength, em.rgb[2] * em.strength) }, uW: { value: 1 }, uHaze: haze[name] } });
          Z.emits.push({ mesh: o, lamp: em.lamp, name: o.name.replace(/^emit_\d+_/, '') });
          continue;
        }
        const info = man.groups[gname]; if (!info) { o.visible = false; continue; }
        Z.meshes[gname] = o;
        if (info.mode === 'none') {
          o.material = new THREE.ShaderMaterial({ vertexShader: BAKED_VS, fragmentShader: WATER_FS, side: THREE.DoubleSide, uniforms: { ...common(), tRefl: G.tRefl, uFloorY: { value: 0 }, uMirrorY: G.uMirrorY } });
          Z.mats[gname] = o.material; o.visible = true; continue;
        }
        const p = `${base}${name}_${gname}`;
        jobs.push((async () => {
          const T = { lamps: [] };
          const lampNames = info.lamps ? Object.keys(info.lamps) : [];
          const [a, b, ...ls] = await Promise.all([
            info.mode === 'combined' ? tex(p + '_b.webp', false) : tex(p + '_c.webp', true),
            info.mode === 'combined' ? null : tex(p + '_l.webp', false),
            ...lampNames.map((n) => tex(`${p}_${n}_l.webp`, false)),
          ]);
          if (info.mode === 'combined') T.b = a; else { T.c = a; T.l = b; }
          T.lamps = ls;
          o.material = Z.mats[gname] = bakedMat(name, gname, info, T); o.visible = true;
        })());
      }
      await Promise.all(jobs);
      group.updateMatrixWorld(true);
      refloor(Z);                                  // each zone's floor mirror stands at its own height
      W.zones[name] = Z; group.visible = !W._shown || W._shown.includes(name);
      for (const k in man.anchors) {
        const a = man.anchors[k]; if (!a || Array.isArray(a) || typeof a !== 'object' || (!a.p && !a.rect)) continue;
        W.anchors[name + '.' + k] = { zone: name, ...a };
        if (k !== 'cam' && !W.anchors[k]) W.anchors[k] = W.anchors[name + '.' + k];
      }
      if (name === 'alley') buildAlley(Z);
      if (name === 'compass') buildCompass(Z);
      if (name === 'formulary') buildFormulary(Z);
      if (name === 'archive') setLineage(W.lineage);
      return Z;
    })();
    loading[name].catch(() => { delete loading[name]; });
    return loading[name];
  };
  W.need = (names) => Promise.all(names.map(W.load));
  W.has = (name) => !!W.zones[name];

  // ---------------------------------------------------------------- the alley's moving parts
  const sprites = [];
  const sprite = (pos, color, size, lamp, k = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: W._glow || (W._glow = glowTex()), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.position.copy(pos); s.scale.setScalar(size); s.userData = { lamp, k }; sprites.push(s); return s;
  };
  let rain = null, keeperPlane = null, keeperTex = null, hold = 0, wet = 0;
  // Each door carries two bolts that reach across into its frame, and a blank steel plate under its seal. Accepting
  // a place draws the bolts and strikes the member's number into the plate (js/outside.js, A08).
  function doorFurniture(Z, k, D) {
    const A = Z.man.anchors, sg = k === 'L' ? -1 : 1, r = A['door' + k].rect, yF = r[0][1], xE = sg * Math.max(Math.abs(r[0][0]), Math.abs(r[1][0])), xC = (r[0][0] + r[1][0]) / 2;
    const lampP = { value: Z.group.localToWorld(b2t(A['lamp' + k].p)) }, lampW = { value: 1 };
    const mat = (base, gloss, map) => new THREE.ShaderMaterial({ vertexShader: BAKED_VS, fragmentShader: PROP_FS, side: THREE.DoubleSide,
      uniforms: { ...common(), tMap: { value: map || blank }, uUseMap: { value: map ? 1 : 0 }, uBase: { value: new V3(...base) }, uGloss: { value: gloss }, uLampP: lampP, uLamp: lampW } });
    const put = (geo, m, bp, parent) => { const o = new THREE.Mesh(geo, m); b2t(bp, o.position); Z.group.add(o); o.updateMatrixWorld(true); (parent || D.pivot).attach(o); return o; };
    const steel = mat([0.5, 0.52, 0.54], 50), dark = mat([0.11, 0.115, 0.125], 18);
    D.lampW = lampW; D.bolts = []; D.boltGoal = [0, 0]; D.boltAt = [0, 0];
    [1.37, 1.2].forEach((z) => {
      put(new THREE.BoxGeometry(0.38, 0.09, 0.008), dark, [xE - sg * 0.21, yF - 0.004, z]);                                   // the plate it runs on
      for (const dx of [0.07, 0.27]) put(new THREE.BoxGeometry(0.05, 0.066, 0.05), steel, [xE - sg * dx, yF - 0.029, z]);       // two saddles
      const bar = new THREE.Group(); b2t([xE - sg * 0.08, yF - 0.029, z], bar.position); Z.group.add(bar); bar.updateMatrixWorld(true); D.pivot.attach(bar);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.44, 20), steel); rod.rotation.z = Math.PI / 2; bar.add(rod);
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.06, 14), steel); knob.rotation.x = Math.PI / 2; knob.position.set(-sg * 0.05, 0, 0.04); bar.add(knob);
      bar.userData.x0 = bar.position.x; bar.userData.dir = new V3(-sg, 0, 0).applyQuaternion(D.pivot.getWorldQuaternion(new THREE.Quaternion()).invert()).x;
      D.bolts.push(bar);
    });
    // the number plate, between the seal and the slit
    const cv = document.createElement('canvas'); cv.width = 840; cv.height = 210;
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.NoColorSpace; tx.anisotropy = maxAniso; tx.generateMipmaps = true; tx.minFilter = THREE.LinearMipmapLinearFilter;
    D.plate = { cv, tx, text: null };
    put(new THREE.BoxGeometry(0.356, 0.089, 0.006), dark, [xC, yF - 0.003, 1.785]);
    put(new THREE.PlaneGeometry(0.34, 0.085), mat([1.15, 1.15, 1.15], 40, tx), [xC, yF - 0.0075, 1.785]);
    drawPlate(D, '');
  }
  function drawPlate(D, text) {
    const P = D.plate; if (!P || P.text === text) return; P.text = text;
    const c = P.cv.getContext('2d'), w = P.cv.width, h = P.cv.height;
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#a9adb1'); g.addColorStop(0.5, '#8d9196'); g.addColorStop(1, '#9a9ea3'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 520; i++) { c.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${(0.03 + rnd() * 0.05).toFixed(3)})`; c.fillRect(rnd() * w, rnd() * h, 60 + rnd() * 240, 1); }      // brushed
    for (const [x, y] of [[26, 26], [w - 26, 26], [26, h - 26], [w - 26, h - 26]]) { c.fillStyle = '#4a4e53'; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(x - 2, y - 2, 4, 0, 7); c.fill(); }
    // struck figures: a dark cut with a lit lower lip
    c.font = '104px "PR6 Mono", Menlo, Consolas, monospace'; c.textAlign = 'left'; c.textBaseline = 'middle';
    const full = '000 000 000', cw = c.measureText('0').width, x0 = (w - cw * full.length) / 2;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]; if (ch === ' ') continue; const x = x0 + i * cw, y = h / 2 + 6;
      c.fillStyle = 'rgba(255,255,255,.5)'; c.fillText(ch, x + 1.5, y + 3); c.fillStyle = '#15181b'; c.fillText(ch, x, y);
    }
    P.tx.needsUpdate = true;
  }
  /** A door's bolts (i 0 or 1; v 1 drawn, 0 shot home) and its plate. They wait if the alley is not built yet. */
  const pend = { L: { bolts: [0, 0], plate: '' }, R: { bolts: [0, 0], plate: '' } };
  W.bolt = (k, i, v, now) => { pend[k].bolts[i] = v; const D = W.doors[k]; if (D && D.bolts) { D.boltGoal[i] = v; if (now || !W.motion) D.boltAt[i] = v; } };
  W.plate = (k, text) => { pend[k].plate = text || ''; const D = W.doors[k]; if (D && D.plate) drawPlate(D, pend[k].plate); };
  if (document.fonts && document.fonts.load) document.fonts.load('104px "PR6 Mono"').then(() => { for (const k of ['L', 'R']) { const D = W.doors[k]; if (D && D.plate) { D.plate.text = null; drawPlate(D, pend[k].plate); } } }).catch(() => {});

  function buildAlley(Z) {
    const A = Z.man.anchors, d = A.dims;
    for (const k of ['L', 'R']) {
      const pivot = new THREE.Group(); b2t(A['door' + k].hinge, pivot.position); Z.group.add(pivot); pivot.updateMatrixWorld(true);
      const D = { pivot, meds: {}, shut: Z.meshes['shut' + k], open: 0, slit: 0, sym: null };
      for (const n of ['door' + k, 'shut' + k, ...SYMS.map((s) => `med${k}_${s}`)]) if (Z.meshes[n]) pivot.attach(Z.meshes[n]);
      for (const s of SYMS) { D.meds[s] = Z.meshes[`med${k}_${s}`]; if (D.meds[s]) D.meds[s].visible = false; }
      D.shut0 = D.shut ? D.shut.position.x : 0;
      W.doors[k] = D;
      doorFurniture(Z, k, D); D.boltGoal = [...pend[k].bolts]; D.boltAt = [...pend[k].bolts]; drawPlate(D, pend[k].plate);
      const lp = b2t(A['lamp' + k].p); Z.group.add(sprite(lp.clone().add(new V3(0, -0.06, 0.05)), new THREE.Color(0.55, 0.72, 1.0), 1.5, 'lamp' + k, 0.55));
    }
    Z.group.add(sprite(b2t(A.pilot.p).add(new V3(0, 0, 0.03)), new THREE.Color(1.0, 0.36, 0.08), 0.22, '', 0.9));
    Z.group.add(sprite(b2t(A.tube.p).add(new V3(-0.06, 0, 0)), new THREE.Color(0.5, 0.75, 1.0), 1.6, 'tube', 0.3));
    // rain: short streaks that fall through the lamps' light
    const N0 = 1500, N = 5200, seed = new Float32Array(N * 6), tip = new Float32Array(N * 2), more = new Float32Array(N * 2), pos = new Float32Array(N * 6);
    let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < N; i++) { const x = (rnd() - 0.5) * 4.6, ph = rnd(), z = -7.0 + rnd() * 17; for (let e = 0; e < 2; e++) { seed.set([x, ph, z], i * 6 + e * 3); tip[i * 2 + e] = e; more[i * 2 + e] = i < N0 ? 0 : 1; } }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); rg.setAttribute('seed', new THREE.BufferAttribute(seed, 3)); rg.setAttribute('tip', new THREE.BufferAttribute(tip, 1)); rg.setAttribute('more', new THREE.BufferAttribute(more, 1));
    rain = new THREE.LineSegments(rg, new THREE.ShaderMaterial({ vertexShader: RAIN_VS, fragmentShader: RAIN_FS, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
      uniforms: { uWet: G.uWet, uHold: { value: 0 }, uExpo: G.uExpo, uPass: G.uPass, uRain: { value: 0 }, uLampA: { value: b2t(A.lampL.p) }, uLampB: { value: b2t(A.lampR.p) } } }));
    rain.frustumCulled = false; Z.group.add(rain);
    // the Keeper: her light shows through the slit and spills a little onto the door
    keeperPlane = new THREE.Mesh(new THREE.PlaneGeometry(d.SLIT_W * 1.36, d.SLIT_H * 3.2), new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    keeperPlane.visible = false; Z.group.add(keeperPlane);
    W.setDoors(W._doorSyms || { L: 'shen', R: 'ouroboros' });
  }
  /** The insignia each door carries. */
  W.setDoors = (syms) => { W._doorSyms = syms; for (const k of ['L', 'R']) { const D = W.doors[k]; if (!D) continue; D.sym = syms[k]; for (const s of SYMS) if (D.meds[s]) D.meds[s].visible = s === syms[k]; } };
  /** The Keeper's canvas (drawn by keeper.js) as the light behind a door's slit. */
  W.setKeeper = (cv, side) => {
    if (!keeperPlane) return;
    if (!cv) { keeperPlane.visible = false; return; }
    if (!keeperTex || keeperTex.image !== cv) { keeperTex = new THREE.CanvasTexture(cv); keeperTex.colorSpace = THREE.SRGBColorSpace; keeperPlane.material.map = keeperTex; keeperPlane.material.needsUpdate = true; }
    const A = W.zones.alley.man.anchors, r = A['slit' + side].rect;
    keeperPlane.position.set((r[0][0] + r[1][0]) / 2, (r[0][2] + r[1][2]) / 2, -(r[0][1] - 0.045)); keeperPlane.visible = true;
  };
  W.keeperDirty = () => { if (keeperTex) keeperTex.needsUpdate = true; };


  // ---------------------------------------------------------------- the Compass: thirty glass blades
  let blades = null; const bladeData = [];
  function buildCompass(Z) {
    const NB = 30; let s = 11; const rnd = () => { s = (s * 48271) % 2147483647; return s / 2147483647; };
    const geo = new THREE.BoxGeometry(0.62, 1, 0.035);
    blades = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({ vertexShader: BLADE_VS, fragmentShader: BLADE_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { ...common(), uSlot: { value: new V3(0, 0.25, -1).normalize() } } }), NB);
    for (let i = 0; i < NB; i++) {
      const ang = 2 * Math.PI * i / NB, h1 = 1.5 + 1.25 * (0.5 + 0.5 * Math.cos(ang * 2 + 0.6)) + (i % 5 === 0 ? 0.9 : 0);
      const p1 = b2t([1.75 * Math.cos(ang), 1.75 * Math.sin(ang), 0.36 + h1 / 2 + 0.02]), q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ang + Math.PI / 2, 0));
      const rr = 0.5 + 2.0 * rnd(), ra = rnd() * 2 * Math.PI;
      const p0 = b2t([rr * Math.cos(ra), rr * Math.sin(ra), 0.9 + 2.8 * rnd()]), q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 1.8, rnd() * 6.28, (rnd() - 0.5) * 1.8));
      bladeData.push({ p0, p1, q0, q1, h1, o: (i * 7 % NB) / NB, ph: rnd() * 6.28 });
    }
    blades.frustumCulled = false; blades.renderOrder = 5; Z.group.add(blades);
  }
  const _m = new THREE.Matrix4(), _p = new V3(), _q = new THREE.Quaternion(), _s = new V3();
  const updateBlades = (t, time) => {
    if (!blades) return;
    bladeData.forEach((b, i) => {
      const ti = clamp(t * 1.45 - b.o * 0.45), e = ti * ti * (3 - 2 * ti), f = (1 - e) * (W.motion ? 1 : 0);
      _p.lerpVectors(b.p0, b.p1, e); _p.y += Math.sin(time * 0.35 + b.ph) * 0.06 * f;
      _q.slerpQuaternions(b.q0, b.q1, e); _s.set(1, b.h1, 1);
      blades.setMatrixAt(i, _m.compose(_p, _q, _s));
    });
    blades.instanceMatrix.needsUpdate = true;
  };

  // ---------------------------------------------------------------- the Formulary: nine cases, three vials to a stand
  let vials = null;
  function buildFormulary(Z) {
    vials = createVials({ Z, COMMON, common, haze: haze.formulary, base, tex, BAKED_VS, maxAniso });
    Z.backs = {}; for (const e of Z.emits) { const mm = /^back(\d+)/.exec(e.name); if (mm) Z.backs[+mm[1]] = e; }
    if (W._turns) for (const n in W._turns) vials.set(+n, W._turns[n], true);
  }
  /** The stands of the Formulary: bring vial k (0 to 2) of case n (1 to 9) to the front; turn one by hand; let it go. */
  W.turn = {
    set: (n, k, now) => { (W._turns || (W._turns = {}))[n] = k; if (vials) vials.set(n, k, now || !W.motion); },
    by: (n, da) => { if (vials) vials.by(n, da); },
    drop: (n, push) => { const k = vials ? vials.drop(n, push) : 0; (W._turns || (W._turns = {}))[n] = k; return k; },
    at: (n) => (vials ? vials.at(n) : (W._turns && W._turns[n]) || 0),
  };
  /** Brighten one niche (1 to 9), or none. */
  W.setNiche = (n) => { W._niche = n || 0; };
  function setLineage(sym) { W.lineage = sym; const Z = W.zones.archive; if (!Z) return; for (const s of SYMS) { const m = Z.meshes['face_' + s]; if (m) m.visible = s === sym; } }
  W.setLineage = setLineage;

  /** How brightly a baked group shows (1 as baked): the film lets each stele's light find it. */
  W.gain = (zone, group, v) => { const Z = W.zones[zone], m = Z && Z.mats[group]; if (m) m.uniforms.uGain.value = v; };
  /** A live point light on the baked surfaces (slot 0 or 1). */
  W.light = (i, pos, color, radius2) => { if (pos) G.uPL.value[i].set(pos.x, pos.y, pos.z, radius2 || 1); else G.uPL.value[i].set(0, -999, 0, 1); G.uPLc.value[i].setRGB(color ? color[0] : 0, color ? color[1] : 0, color ? color[2] : 0); };

  // ---------------------------------------------------------------- camera
  let fly = null;
  const cur = () => ({ p: W.cam.p.clone(), t: W.cam.t.clone(), fov: W.cam.fov, expo: W.expo, fog: [...W.fog], vig: W.vig, grain: W.grain, con: W.con, rain: W.rain, rect: { ...W.rect }, shift: [...W.shift] });
  const apply = (a, b, k, kc, kr = k) => {
    W.cam.fov = lerp(a.fov, b.fov, k); W.expo = Math.exp(lerp(Math.log(a.expo), Math.log(b.expo), kc)); for (let i = 0; i < 3; i++) W.fog[i] = lerp(a.fog[i], b.fog[i], kc);
    W.fog[3] = lerp(a.fog[3], b.fog[3], kc); W.vig = lerp(a.vig, b.vig, kc); W.grain = lerp(a.grain, b.grain, kc); W.con = lerp(a.con || 0, b.con || 0, kc); W.rain = lerp(a.rain, b.rain, kc);
    for (const q of ['x', 'y', 'w', 'h']) W.rect[q] = lerp(a.rect[q], b.rect[q], kr);
    W.shift[0] = lerp(a.shift[0], b.shift[0], kr); W.shift[1] = lerp(a.shift[1], b.shift[1], kr);
  };
  /** Move the camera to a pose. opts: dur (s), via (world points to pass through), back (keep looking where you came from), ease. */
  W.fly = (pose, opts = {}) => new Promise((res) => {
    if (fly) { fly.res(); fly = null; }
    const a = cur(), b = { ...a, ...pose, p: pose.p.clone(), t: pose.t.clone(), fog: pose.fog ? [...pose.fog] : a.fog, rect: pose.rect ? { ...pose.rect } : a.rect, shift: pose.shift ? [...pose.shift] : a.shift };
    const dur = W.motion ? (opts.dur ?? 1.2) : 0;
    if (dur <= 0 || a.p.distanceTo(b.p) + a.t.distanceTo(b.t) + Math.abs(a.fov - b.fov) + Math.abs(a.rect.w - b.rect.w) + Math.abs(a.rect.x - b.rect.x) + Math.abs(a.rect.h - b.rect.h) + Math.abs(a.shift[0] - b.shift[0]) + Math.abs(a.shift[1] - b.shift[1]) < 1e-4) {
      W.cam.p.copy(b.p); W.cam.t.copy(b.t); apply(a, b, 1, 1); res(); return;
    }
    const via = opts.via || [];
    const curve = via.length ? new THREE.CatmullRomCurve3([a.p, ...via, b.p], false, 'centripetal') : null;
    fly = { a, b, curve, dur, t0: null, ease: opts.ease || io, back: !!opts.back, look: opts.look ?? (via.length ? 0.7 : 0), res };
  });
  W.flying = () => !!fly;
  /** The eye's path for the move in progress, as n points (tests check it against the walls). */
  W.flightPath = (n = 200) => { if (!fly) return []; const out = []; for (let i = 0; i <= n; i++) { const k = i / n, v = new V3(); if (fly.curve) fly.curve.getPointAt(k, v); else v.lerpVectors(fly.a.p, fly.b.p, k); out.push(v); } return out; };
  const _tan = new V3(), _ahead = new V3(), _lt = new V3();
  const stepFly = (time) => {
    if (!fly) return;
    if (fly.t0 === null) fly.t0 = time;
    const raw = clamp((time - fly.t0) / fly.dur), k = fly.ease(raw), { a, b, curve } = fly;
    if (curve) { curve.getPointAt(k, W.cam.p); } else W.cam.p.lerpVectors(a.p, b.p, k);
    _lt.lerpVectors(a.t, b.t, k);
    if (curve && fly.look > 0) {
      curve.getTangentAt(clamp(k, 0.001, 0.999), _tan); if (fly.back) _tan.negate();
      _ahead.copy(W.cam.p).addScaledVector(_tan, 30); _lt.lerp(_ahead, fly.look * Math.sin(Math.PI * k) ** 1.2);
    }
    W.cam.t.copy(_lt);
    // the part of the window the picture is seen through follows the page as it slides (app.css, #paper), not the flight
    apply(a, b, k, k, 1 - Math.pow(1 - clamp((time - fly.t0) / Math.min(fly.dur, 0.95)), 4));
    if (raw >= 1) { const r = fly.res; fly = null; r(); }
  };
  /** Stop a flight where it is (the next one starts from here). */
  W.halt = () => { if (fly) { const r = fly.res; fly = null; r(); } };

  W.resize = () => {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(W.dpr || Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
    const bw = renderer.domElement.width, bh = renderer.domElement.height;
    G.uRes.value.set(bw, bh);
    const s = W.reflScale ?? 0.5; rt.setSize(Math.max(64, Math.round(bw * s)), Math.max(64, Math.round(bh * s)));
    W.cw = w; W.ch = h;
  };
  const _right = new V3(), _up = new V3(), _fwd = new V3(), _cp = new V3();
  const place = (time) => {
    const r = W.rect, asp = Math.max(0.05, r.w / Math.max(1, r.h)), f = W.cam.fov * DEG;
    const vf = asp >= 1 ? 2 * Math.atan(Math.tan(f / 2) / asp) : f;
    camera.fov = vf / DEG; camera.aspect = asp;
    camera.setViewOffset(r.w, r.h, -r.x - W.shift[0] * r.w, -r.y - W.shift[1] * r.h, W.cw, W.ch);
    _fwd.subVectors(W.cam.t, W.cam.p); const dist = _fwd.length(); _fwd.normalize();
    _right.crossVectors(_fwd, camera.up).normalize(); _up.crossVectors(_right, _fwd);
    // the camera is hand-held, barely: a slow breath, and a lean towards the pointer
    const sw = W.motion ? W.sway : 0, amp = Math.min(0.5, dist * 0.012) * sw;
    _cp.copy(W.cam.p).addScaledVector(_right, (W.par[0] * 1.6 + Math.sin(time * 0.31) * 0.35) * amp).addScaledVector(_up, (-W.par[1] * 1.0 + Math.sin(time * 0.23 + 1.3) * 0.3) * amp);
    camera.position.copy(_cp); camera.lookAt(W.cam.t);
    if (W.cam.roll) camera.rotateZ(W.cam.roll);
    camera.updateMatrixWorld(true);
  };
  W.par = [0, 0];

  /** Screen position (CSS px) of a world point. */
  const _v = new V3();
  W.project = (p) => { _v.copy(p).project(camera); return [(_v.x * 0.5 + 0.5) * W.cw, (-_v.y * 0.5 + 0.5) * W.ch, _v.z]; };
  /** Screen box of a named anchor (a rect or a point), or null when it is behind the camera. */
  W.box = (name) => {
    const a = W.anchors[name]; if (!a) return null;
    if (a.rect) {
      const p0 = W.project(W.pt(a.zone, a.rect[0])), p1 = W.project(W.pt(a.zone, a.rect[1]));
      if (p0[2] > 1 || p1[2] > 1) return null;
      return { x: Math.min(p0[0], p1[0]), y: Math.min(p0[1], p1[1]), w: Math.abs(p1[0] - p0[0]), h: Math.abs(p1[1] - p0[1]) };
    }
    const p = W.project(W.pt(a.zone, a.p)); return p[2] > 1 ? null : { x: p[0], y: p[1], w: 0, h: 0 };
  };

  // ---------------------------------------------------------------- the frame
  const mirrorM = new THREE.Matrix4(), plane = new THREE.Plane(), clipPlane = new THREE.Vector4(), qv = new THREE.Vector4(), bg = new THREE.Color();
  const renderMirror = (y) => {
    mirrorM.set(1, 0, 0, 0, 0, -1, 0, 2 * y, 0, 0, 1, 0, 0, 0, 0, 1);
    mirrorCam.matrixWorld.multiplyMatrices(mirrorM, camera.matrixWorld);
    mirrorCam.matrixWorldInverse.copy(mirrorCam.matrixWorld).invert();
    mirrorCam.projectionMatrix.copy(camera.projectionMatrix);
    plane.set(new V3(0, 1, 0), -y - 0.01).applyMatrix4(mirrorCam.matrixWorldInverse);
    clipPlane.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const pm = mirrorCam.projectionMatrix.elements;
    qv.x = (Math.sign(clipPlane.x) + pm[8]) / pm[0]; qv.y = (Math.sign(clipPlane.y) + pm[9]) / pm[5]; qv.z = -1; qv.w = (1 + pm[10]) / pm[14];
    clipPlane.multiplyScalar(2 / clipPlane.dot(qv));
    pm[2] = clipPlane.x; pm[6] = clipPlane.y; pm[10] = clipPlane.z + 1; pm[14] = clipPlane.w;
    mirrorCam.projectionMatrixInverse.copy(mirrorCam.projectionMatrix).invert();
    G.uPass.value = 1; G.tRefl.value = blank;                       // a floor must not read the mirror while it is being drawn
    bg.setRGB(Math.sqrt(clamp(W.fog[0] / 16)), Math.sqrt(clamp(W.fog[1] / 16)), Math.sqrt(clamp(W.fog[2] / 16)));
    renderer.setRenderTarget(rt); renderer.setClearColor(bg, 1); renderer.clear();
    const kv = keeperPlane ? keeperPlane.visible : false; if (keeperPlane) keeperPlane.visible = false;
    for (const s of sprites) s.visible = false;
    renderer.render(scene, mirrorCam);
    if (keeperPlane) keeperPlane.visible = kv; for (const s of sprites) s.visible = true;
    renderer.setRenderTarget(null); G.uPass.value = 0; G.tRefl.value = rt.texture;
  };
  const tonemap = (v) => { const x = Math.max(0, v * W.expo); return Math.pow(clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)), (1 + W.con) / 2.2); };
  let last = 0, slow = 0;
  /** Which floor the mirror stands on: the room the camera is in. */
  const mirrorY = () => {
    for (const n of ['compass', 'archive']) { const Z = W.zones[n]; if (!Z || !Z.group.visible) continue; const c = Z.group.getWorldPosition(_v); const dx = camera.position.x - c.x, dz = camera.position.z - c.z; if (n === 'compass' ? dx * dx + dz * dz < 15 * 15 : Math.abs(dx) < 9 && dz < 14 && dz > -18) return Z.floorY; }
    return 0;
  };
  W.draw = (time, dt) => {
    stepFly(time);
    // the weather has its own clock, so the rain can be held still in the air (W.rainHold) and let go again
    hold += ((W.rainHold || 0) - hold) * (W.motion ? 1 - Math.pow(0.02, dt) : 1); wet += W.motion ? dt * (1 - hold) * (1 - hold) : 0;
    G.uWet.value = wet; if (rain) rain.material.uniforms.uHold.value = hold;
    G.uTime.value = W.motion ? time : 0; G.uExpo.value = W.expo; G.uCon.value = W.con; G.uVig.value = W.vig; G.uGrain.value = W.motion ? W.grain : W.grain * 0.5;
    G.uFogC.value.setRGB(W.fog[0], W.fog[1], W.fog[2]); G.uFogD.value = W.fog[3];
    place(W.motion ? time : 0);
    // lamps, emitters, glows
    for (const zn in W.zones) {
      const Z = W.zones[zn];
      for (const k in Z.mats) {
        const m = Z.mats[k], ln = m.userData.lamps; if (ln && ln.length) m.uniforms.wLamp.value.set(W.lamps[ln[0]] ?? 1, W.lamps[ln[1]] ?? 1, W.lamps[ln[2]] ?? 1);
        // each door, its shutter and its seal were baked whole under the lamp above them, so they follow that lamp
        if (zn === 'alley') { const d = /^(?:door|shut|med)([LR])/.exec(k); if (d) m.uniforms.uGain.value = 0.07 + 0.93 * (W.lamps['lamp' + d[1]] ?? 1); }
      }
      for (const e of Z.emits) e.mesh.material.uniforms.uW.value = e.lamp ? (W.lamps[e.lamp] ?? 1) : 1;
      if (Z.backs) for (const i in Z.backs) { const u = Z.backs[i].mesh.material.uniforms.uW, goal = W._niche ? (+i === W._niche ? 1.5 : 0.6) : 1; u.value += (goal - u.value) * (W.motion ? 1 - Math.pow(0.002, dt) : 1); }
    }
    const ek = clamp(W.expo * 1.1, 0.2, 1);
    for (const s of sprites) s.material.opacity = (s.userData.lamp ? (W.lamps[s.userData.lamp] ?? 1) : 1) * s.userData.k * ek;
    if (rain) { rain.material.uniforms.uRain.value = W.motion ? W.rain : 0; rain.visible = W.rain > 0.01 && W.motion; }
    // doors
    for (const k of ['L', 'R']) {
      const D = W.doors[k]; if (!D || !D.bolts) continue; D.lampW.value = W.lamps['lamp' + k] ?? 1;
      // a bolt is heavy: it starts slowly, runs, and stops dead against its saddle
      D.bolts.forEach((b, i) => { const g = D.boltGoal[i], d = g - D.boltAt[i]; D.boltAt[i] = Math.abs(d) < 0.002 || !W.motion ? g : D.boltAt[i] + Math.sign(d) * Math.min(Math.abs(d), dt * 3.4); const e = D.boltAt[i]; b.position.x = b.userData.x0 + b.userData.dir * 0.2 * e * e * (3 - 2 * e); });
    }
    for (const k of ['L', 'R']) { const D = W.doors[k]; if (!D) continue; D.pivot.rotation.y = (k === 'L' ? -1 : 1) * D.open * 1.78; if (D.shut) D.shut.position.x = D.shut0 + (k === 'L' ? 1 : -1) * D.slit * 0.56; }
    if (keeperPlane && keeperPlane.visible) keeperPlane.material.opacity = 1;
    // blades settle towards the goal
    W.compassT += (W.compassGoal - W.compassT) * (W.motion ? 1 - Math.pow(0.08, dt) : 1); updateBlades(W.compassT, time);
    if (vials) vials.update(dt, W.motion);
    // adapt: if frames are slow, lower the resolution, then the mirror
    if (dt > 0 && W.motion) { slow = slow * 0.95 + (dt > 0.034 ? 1 : 0) * 0.05; if (slow > 0.6 && time - last > 2) { last = time; slow = 0; if ((W.dpr || Math.min(devicePixelRatio || 1, 2)) > 1) { W.dpr = Math.max(1, (W.dpr || Math.min(devicePixelRatio || 1, 2)) - 0.5); W.resize(); } else if ((W.reflScale ?? 0.5) > 0.26) { W.reflScale = 0.25; W.resize(); } } }
    // the rooms beyond the Atrium stand in the haze of the court and come out of it as the camera nears them
    for (const n of ['compass', 'formulary', 'archive']) { groups[n].getWorldPosition(_v); const d = Math.hypot(camera.position.x - _v.x, camera.position.z - _v.z); haze[n].value = clamp((d - 34) / 62) ** 0.8 * 0.985; }
    // The Formulary and the Archive stand against the far wall and are only ever seen through their own openings.
    // From the court behind the wall (the way to the Compass) their outsides would show, so there they stay in the haze.
    groups.atrium.worldToLocal(_v.copy(camera.position)); const cx = _v.x, cy = -_v.z, court = clamp((cy - 65) / 6);
    for (const n of ['formulary', 'archive']) { const o = ORIGIN[n], within = clamp(1.5 - Math.abs(cx - o[0]) / 6.4); const h = court * (1 - within); haze[n].value = Math.max(haze[n].value, h); groups[n].visible = h < 0.999 && (!W._shown || W._shown.includes(n)); }
    const my = mirrorY(); G.uMirrorY.value = my;
    if (W.mirror !== false) renderMirror(my);
    bg.setRGB(tonemap(W.fog[0]), tonemap(W.fog[1]), tonemap(W.fog[2])); renderer.setClearColor(bg, 1);
    renderer.render(scene, camera);
  };
  /** Show only these zones (the others are not drawn). */
  W.show = (names) => { for (const n of ZONES) groups[n].visible = names.includes(n); W._shown = names; };
  /** How far a room is lost in the haze of the court (0 clear, 1 gone). */
  W.haze = haze;
  W.resize();
  return W;
}

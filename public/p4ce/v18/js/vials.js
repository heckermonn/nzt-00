// PR6 / Institute: the Formulary's vials. Twenty-seven sealed vials, three to a case, each on a round stand that
// turns so the record being read stands at the front. They are real geometry (the same profiles Blender used for the
// baked light, read from the room's manifest), lit by a small path-traced panorama of what a vial sees from its
// stand: the glass reflects the two lines of light at the sides of its case and bends the bright back of the case
// into view at its edges. Each vial carries its own record's printed label.
import * as THREE from 'three';

const TAU = Math.PI * 2, THIRD = TAU / 3;

const VS = /* glsl */`
attribute float part;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vPart;
void main(){ vUv = uv; vPart = part; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;

export const ENV = /* glsl */`
uniform sampler2D tEnv, tEnvD; uniform float uEnvMax;
// the panorama looks out of the case (towards +z here) at its centre
vec2 envUv(vec3 d){ return vec2(.5 + atan(-d.x, d.z) / 6.2831853, .5 + asin(clamp(d.y, -1., 1.)) / 3.1415927); }
vec3 env(vec3 d, float lod){ vec3 c = textureLod(tEnv, envUv(d), max(lod, 5. * smoothstep(.8, .98, abs(d.y)))).rgb; return c * c * uEnvMax; }
// the light that falls on a matt surface facing d
vec3 irr(vec3 d){ vec3 c = texture2D(tEnvD, envUv(d)).rgb; return c * c * 8.; }`;

const SOLID_FS = (COMMON) => /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vPart;
uniform sampler2D tLabels; uniform vec3 uCap; uniform vec4 uCell; uniform float uHaze, uFoot;
${COMMON}
${ENV}
void main(){
  vec3 toCam = cameraPosition - vW; float dist = length(toCam); vec3 v = toCam / dist;
  vec3 n = normalize(vN); bool back = dot(n, v) < 0.; if (back) n = -n;
  vec3 r = reflect(-v, n); float fr = pow(1. - max(dot(n, v), 0.), 5.);
  vec3 E = irr(n);
  vec3 col;
  float ndv = max(dot(n, v), 0.), form = .62 + .38 * ndv;                                       // round things fall off towards their outline
  if (vPart < .5) col = vec3(.9, .91, .9) * E * .23 * form;                                          // the dried cake, in the shade of the glass and the label
  else if (vPart < 1.5) col = vec3(.2, .21, .22) * E * .55 * form + env(r, 3.) * .02 * fr;                                     // the stopper
  else if (vPart < 2.5) { float s = 1. - max(dot(normalize(n.xz + 1e-4), normalize(v.xz)), 0.), band = mix(smoothstep(.16, .62, s) * (1. - .45 * smoothstep(.8, 1., s)), .5, smoothstep(.5, .8, abs(n.y))); col = vec3(.80, .82, .84) * (env(r, 7.) * (.17 + .6 * band) + E * .1); }              // the aluminium crimp, satin
  else if (vPart < 3.5) col = uCap * E + env(r, 3.6) * (.03 + .4 * fr);                       // the cap
  else {                                                                                       // the label: print outside, bare paper seen from behind through the glass
    vec3 a = back ? vec3(.8, .81, .79) * .75 : toLin(texture2D(tLabels, uCell.xy + vUv * uCell.zw).rgb) * vec3(.92, .93, .91);
    col = a * E + (back ? vec3(0.) : env(r, 4.6) * (.015 + .2 * fr));
  }
  // close to the stand its neighbours and the stand itself take some of the light
  col *= mix(.8, 1., smoothstep(0., .42, vW.y - uFoot));
  col = mix(col, uFogC, uHaze);
  gl_FragColor = vec4(finish(col, dist), 1.);
}`;

const GLASS_FS = (COMMON) => /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vPart;
uniform float uHaze;
${COMMON}
${ENV}
void main(){
  vec3 toCam = cameraPosition - vW; float dist = length(toCam); vec3 v = toCam / dist;
  vec3 n = normalize(vN); float side = dot(n, v) < 0. ? -1. : 1.; n *= side;
  float ndv = max(dot(n, v), 0.);
  float F = .04 + .96 * pow(1. - ndv, 5.);
  vec3 R = env(reflect(-v, n), .6);
  vec3 t = refract(-v, n, 1. / 1.47); if (dot(t, t) < .01) t = -v;
  // through the wall; at the outline the wall is seen edge-on and carries the dark of the room in front instead
  vec3 T = env(t, 1.6) * vec3(.93, .96, .97) * mix(1., .22, smoothstep(.55, 1., 1. - ndv));
  // thin walls are clear; the wall turns edge-on at the outline, and the base and shoulder are thick (vPart)
  float e = clamp(.07 + pow(1. - ndv, 2.4) * 1.15 + vPart * (.35 + .65 * (1. - ndv)), 0., 1.);
  if (side < 0.) { e *= .55; F *= .35; }      // the far wall, seen through the near one
  float a = clamp(e * (1. - F) + F, 0., 1.);
  vec3 col = (T * e * (1. - F) + R * F) / max(a, 1e-3);
  col = mix(col, uFogC, uHaze);
  gl_FragColor = vec4(finish(col, dist), a);
}`;

// The tops of the nine stands share one sheet (three by three). Their light was baked twice, with the vials and
// without. Three vials stand a third of a turn apart, so whenever a stand is at rest the baked shadows are exactly
// right; between rests the shadows travel with the vials, and the two nearest rests are blended.
const PADS_FS = (COMMON) => /* glsl */`
varying vec2 vUv; varying vec3 vW; varying vec3 vN;
uniform sampler2D tC, tL, tL0; uniform float sL, sL0, uHaze, uTurn[9], uVis, uGain; uniform vec2 uFeet; uniform vec4 uBlob;
uniform vec4 uPL[2]; uniform vec3 uPLc[2];
${COMMON}
vec3 shadeAt(vec2 cell, vec2 q, float th){
  float c = cos(th), s = sin(th); vec2 ur = (cell + .5 + vec2(q.x * c - q.y * s, q.x * s + q.y * c)) / 3.; ur.y = 1. - ur.y;
  return clamp(toLin(texture2D(tL, ur).rgb) * sL / max(toLin(texture2D(tL0, ur).rgb) * sL0, vec3(1e-3)), 0., 1.15);
}
void main(){
  float dist = length(cameraPosition - vW);
  vec2 ub = vec2(vUv.x, 1. - vUv.y) * 3., cell = floor(ub), q = fract(ub) - .5;
  float turn = uTurn[int((2. - cell.y) * 3. + cell.x + .5)], third = 2.0943951;
  float a = mod(turn, third), w = a / third; w = w * w * (3. - 2. * w);
  vec3 shade = length(q) > .472 ? vec3(1.) : mix(vec3(1.), mix(shadeAt(cell, q, -a), shadeAt(cell, q, third - a), w), uVis);      // uVis 0: the stands are bare
  // where each vial meets the stand the light cannot get in: a tight dark ring that goes round with it
  for (int k = 0; k < 3; k++){ float an = -1.5707963 + float(k) * third + turn; float dd = length(q - uFeet.x * vec2(cos(an), sin(an))) / uFeet.y; shade *= mix(1., mix(.52, 1., smoothstep(.86, 1.42, dd)), uVis); }
  // one thing standing alone on a stand (the film): its own soft foot
  if (uBlob.w > 0. && abs((2. - cell.y) * 3. + cell.x - uBlob.x) < .5) { float dd = length(q - uBlob.yz) / uBlob.w; shade *= mix(.4, 1., smoothstep(.75, 1.9, dd)); }
  vec3 open = toLin(texture2D(tL0, vUv).rgb) * sL0;
  vec3 alb = toLin(texture2D(tC, vUv).rgb), col = alb * open * shade * uGain;
  for (int i = 0; i < 2; i++){ vec3 d = uPL[i].xyz - vW; float r2 = dot(d, d), pa = uPL[i].w / (uPL[i].w + r2); col += alb * uPLc[i] * pa * pa * shade * (.25 + .75 * max(normalize(vN).y * d.y * inversesqrt(r2 + 1e-4), 0.)); }
  col = mix(col, uFogC, uHaze);
  gl_FragColor = vec4(finish(col, dist), 1.);
}`;

const lathe = (prof, S, seg) => new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(Math.max(r, 1e-4) * S, z * S)), seg);
const withPart = (g, v) => { const n = g.attributes.position.count, a = new Float32Array(n).fill(v); g.setAttribute('part', new THREE.BufferAttribute(a, 1)); return g; };
function merge(list) {
  const out = new THREE.BufferGeometry(), idx = []; let base = 0; const acc = { position: [], normal: [], uv: [], part: [] };
  for (const g of list) {
    for (const k in acc) acc[k].push(...g.attributes[k].array);
    const ix = g.index ? g.index.array : [...Array(g.attributes.position.count).keys()];
    for (const i of ix) idx.push(i + base);
    base += g.attributes.position.count;
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(acc.position, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(acc.normal, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(acc.uv, 2)); out.setAttribute('part', new THREE.Float32BufferAttribute(acc.part, 1));
  out.setIndex(idx); return out;
}

/**
 * Build the vials of the Formulary into its zone. o: { Z, COMMON, common (shared uniforms), haze, base, tex, G }.
 * Returns { set(n, k, now), by(n, da), drop(n), at(n), update(dt, motion), ready }.
 */
export function createVials(o) {
  const { Z, COMMON, common, haze, base, tex } = o;
  const A = Z.man.anchors, d = A.dims, S = d.vial_s;
  const b2t = (p) => new THREE.Vector3(p[0], p[2], -p[1]);
  // ---- one vial's geometry, shared by all
  const glass = lathe(d.body, S, 56);
  { // how thick the glass reads: the base and heel, the shoulder and the neck ring
    const pos = glass.attributes.position, a = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / S, r = Math.hypot(pos.getX(i), pos.getZ(i)) / S; a[i] = y < 0.0016 ? 0.55 : y > 0.0425 ? 0.5 : y > 0.031 ? 0.22 : r < 0.011 && y < 0.004 ? 0.4 : 0; }
    glass.setAttribute('part', new THREE.BufferAttribute(a, 1));
  }
  const [lr, l0, l1] = d.label;
  const label = new THREE.CylinderGeometry(lr * S, lr * S, (l1 - l0) * S, 48, 1, true, -Math.PI * d.label_arc, TAU * d.label_arc);
  label.translate(0, (l0 + l1) / 2 * S, 0);
  const solid = merge([withPart(lathe(d.cake, S, 40), 0), withPart(lathe(d.plug, S, 24), 1), withPart(lathe(d.crimp, S, 48), 2), withPart(lathe(d.cap, S, 48), 3), withPart(label, 4)]);
  const U = { tEnv: { value: null }, tEnvD: { value: null }, tLabels: { value: null }, uEnvMax: { value: 40 } };
  const turnU = { value: new Float32Array(9) }, visU = { value: 1 }, blobU = { value: new THREE.Vector4(0, 0, 0, 0) };
  const stands = [], turns = new Float32Array(9), goals = new Float32Array(9), vel = new Float32Array(9), held = new Uint8Array(9);
  const root = new THREE.Group(); root.visible = false; Z.group.add(root);
  for (let i = 0; i < 9; i++) {
    const n = A['n' + (i + 1)]; if (!n) continue;
    const st = new THREE.Group(); st.position.copy(b2t(n.vial)); root.add(st); stands[i] = st;
    const foot = { value: 0 };
    st.userData.foot = foot;
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + k * THIRD, v = new THREE.Group();
      v.position.set(d.ring * Math.cos(a), 0.004, -d.ring * Math.sin(a)); v.rotation.y = Math.atan2(Math.cos(a), -Math.sin(a)); st.add(v);
      const cap = d.caps[i];
      const sm = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: SOLID_FS(COMMON), side: THREE.DoubleSide,
        uniforms: { ...common(), ...U, uHaze: haze, uFoot: foot, uCap: { value: new THREE.Vector3(cap[0], cap[1], cap[2]) }, uCell: { value: new THREE.Vector4(k / 3, 1 - (i + 1) / 9, 1 / 3, 1 / 9) } } });
      v.add(new THREE.Mesh(solid, sm));
      const gm = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: GLASS_FS(COMMON), side: THREE.DoubleSide, transparent: true, depthWrite: false, uniforms: { ...common(), ...U, uHaze: haze } });
      const g = new THREE.Mesh(glass, gm); g.renderOrder = 3; v.add(g);
    }
  }
  // ---- the stands' tops: shadows that turn
  const pm = Z.mats.pads, info = Z.man.groups.pads;
  let padMat = null, loaded = false, shown = true;
  const ready = Promise.all([
    new Promise((res) => new THREE.TextureLoader().load(base + 'formulary_env.webp', (t) => { t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; U.tEnv.value = t; res(); }, undefined, res)),
    new Promise((res) => new THREE.TextureLoader().load(base + 'formulary_envd.webp', (t) => { t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; U.tEnvD.value = t; res(); }, undefined, res)),
    new Promise((res) => new THREE.TextureLoader().load('assets/vials/labels.webp', (t) => { t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = o.maxAniso || 1; U.tLabels.value = t; res(); }, undefined, res)),
    pm && info && info.nov ? tex(base + 'formulary_pads_nov_l.webp', false).then((t0) => {
      padMat = new THREE.ShaderMaterial({ vertexShader: o.BAKED_VS, fragmentShader: PADS_FS(COMMON), side: THREE.DoubleSide,
        uniforms: { ...common(), tC: pm.uniforms.tC, tL: pm.uniforms.tL, tL0: { value: t0 }, sL: { value: info.scale }, sL0: { value: info.nov }, uHaze: haze, uTurn: turnU, uVis: visU, uBlob: blobU, uGain: pm.uniforms.uGain, uPL: pm.uniforms.uPL, uPLc: pm.uniforms.uPLc, uFeet: { value: new THREE.Vector2(d.ring / d.pad_span, Math.max(...d.body.map((q) => q[0])) * S / d.pad_span) } } });
      Z.meshes.pads.material = padMat;
    }).catch(() => {}) : null,
  ]).then(() => { loaded = !!(U.tEnv.value && U.tEnvD.value && U.tLabels.value); root.visible = loaded && shown; });

  const near = (from, to) => from + ((((to - from) % TAU) + TAU + Math.PI) % TAU) - Math.PI;      // the same place, the short way round
  const V = {
    ready, root, turns, U,
    /** Take every vial off its stand, or put them back (the film stands one thing alone in a case). */
    show(on) { shown = !!on; root.visible = loaded && shown; visU.value = shown ? 1 : 0; },
    /** The foot of one thing standing alone on stand n (1 to 9): where on the stand (metres from its centre, towards the room) and how wide. r 0: none. */
    blob(n, front, r) { blobU.value.set(n - 1, 0, -front / d.pad_span, (r || 0) / d.pad_span); },
    /** Give every stand a push (radians): each settles back where it was. */
    push(da) { for (let i = 0; i < 9; i++) { turns[i] += da * (1 + 0.12 * ((i * 5) % 9 - 4) / 4); held[i] = 0; } },
    /** Bring vial k (0 to 2) of case n (1 to 9) to the front. */
    set(n, k, now) { const i = n - 1; goals[i] = near(turns[i], -k * THIRD); held[i] = 0; if (now) { turns[i] = goals[i]; vel[i] = 0; } },
    /** Turn a stand by hand (a drag): it follows at once. */
    by(n, da) { const i = n - 1; held[i] = 1; turns[i] += da; goals[i] = turns[i]; vel[i] = 0; },
    /** Let go: the stand settles on the nearest vial. Returns which (0 to 2). */
    drop(n, push = 0) { const i = n - 1; held[i] = 0; const k = (((Math.round((-(turns[i] + push)) / THIRD)) % 3) + 3) % 3; goals[i] = near(turns[i] + push, -k * THIRD); return k; },
    at(n) { const i = n - 1; return (((Math.round(-goals[i] / THIRD)) % 3) + 3) % 3; },
    update(dt, motion) {
      for (let i = 0; i < 9; i++) {
        if (!stands[i]) continue;
        if (!motion) { turns[i] = goals[i]; vel[i] = 0; }
        else if (!held[i]) {
          // a heavy stand: a critically damped spring, so it arrives without swinging past
          const w = 7.5, x = turns[i] - goals[i], h = Math.min(dt, 0.05);
          vel[i] += (-w * w * x - 2 * w * vel[i]) * h; turns[i] += vel[i] * h;
          if (Math.abs(x) < 1e-4 && Math.abs(vel[i]) < 1e-3) { turns[i] = goals[i]; vel[i] = 0; }
        }
        stands[i].rotation.y = turns[i]; turnU.value[i] = turns[i];
        stands[i].getWorldPosition(_p); stands[i].userData.foot.value = _p.y;
      }
    },
  };
  const _p = new THREE.Vector3();
  return V;
}

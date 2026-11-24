/* P4CE v5 · Gate: Object 0047 (the default gate). Mechanic from v2/cube.html, rebuilt.
   A block of frosted optical glass glows on a dark stage. Inside it, a 4 is laser-etched as a cloud of white points
   spread over three depths: it only reads from one alignment. Turn it (drag, touch, arrow keys) until the 4 lines up
   and hold still; it clicks and will take a code. Code 0047RSRV, ?key=0047RSRV (the NFC key), "Tap your key", or
   Members log-in. A wrong code: it goes quiet and turns away. A right one: the frost clears, the block fills with
   light, the camera goes into it, and the light is the Atlas sky (#eeeae7). Guests are told nothing else.
   Three.js 0.169. Environment: Poly Haven studio_small_03 (CC0), blurred and darkened, assets/object/studio.hdr. */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {HorizontalBlurShader} from 'three/addons/shaders/HorizontalBlurShader.js';
import {VerticalBlurShader} from 'three/addons/shaders/VerticalBlurShader.js';
import {$, $$, Q, RM, esc, store, tween, E, clamp, lerp, sm, wait} from '../util.js';
import {STOPS} from '../tone.js';

const CODE = '0047RSRV', LIGHT = STOPS.light, BASE = 'assets/object/';
const NOGL = Q.has('nogl');
const coarse = matchMedia('(pointer: coarse)').matches;

/* ------------------------------------------------------------ markup (written into the shared #gate section) */
const ROOT = $('#gate');
ROOT.className = 'obj'; ROOT.setAttribute('aria-label', 'Object 0047');
const XH = '<i></i>';
ROOT.innerHTML = `
  <canvas class="o-gl" id="oGl" aria-hidden="true"></canvas>
  <button class="o-stage" id="oStage" type="button" aria-label="Object 0047. Drag to turn it. Arrow keys turn it a quarter turn. Enter presses it." aria-describedby="oStatus"></button>
  <div class="o-fb" id="oFb" hidden>
    <div class="o-fbc" aria-hidden="true"><i><small>0 0 4 7</small></i><i>4</i><i></i><i></i><i><small>DO NOT OPEN</small></i><i></i></div>
    <button type="button" class="o-fbo" id="oFbOpen">Open it</button>
  </div>
  <div class="o-hud" aria-hidden="true">
    <div class="o-vx" id="oVx">${XH.repeat(8)}<span class="o-lbl" id="oVxL"></span></div>
    <p class="o-cap o-lbl"><b>Object 0047<span> / </span><br class="o-br">Do not touch</b><span class="o-cap2">Held for observation</span></p>
    <p class="o-ro o-lbl">Off-axis <b id="oAxis">--.-°</b></p>
  </div>
  <button class="o-memlink" id="oMemLink" type="button">Members</button>
  <p class="o-status" id="oStatus" role="status" aria-live="polite"></p>
  <form class="g-form o-f" id="oForm" autocomplete="off" novalidate hidden>
    <label class="sr" for="oCode">Invitation code</label>
    <input id="oCode" name="code" type="text" inputmode="text" autocapitalize="characters" spellcheck="false" maxlength="16" placeholder="Code">
    <button type="submit" class="g-go" aria-label="Present the code"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M11.5 5.5L16 10l-4.5 4.5"/></svg></button>
    <p class="g-demo">0047RSRV</p>
    <div class="g-alt"><button type="button" id="oTap">Tap your key</button><button type="button" id="oMem">Members</button></div>
  </form>
  <form class="g-form g-mem o-f" id="oMemForm" autocomplete="on" novalidate hidden>
    <label class="sr" for="oEmail">Email</label><input id="oEmail" type="email" autocomplete="username" spellcheck="false" placeholder="Email">
    <label class="sr" for="oPass">Password</label><input id="oPass" type="password" autocomplete="current-password" placeholder="Password">
    <div class="g-alt"><button type="submit" class="g-in">Log in</button><button type="button" id="oBack">Back</button></div>
  </form>
  <div class="g-tap o-f" id="oTapUI" hidden aria-hidden="true"><i></i><i></i><span>Hold your key to the glass</span></div>
  <div class="o-flood" id="oFlood" aria-hidden="true"></div>`;
const D = {
  gl: $('#oGl'), stage: $('#oStage'), fb: $('#oFb'), status: $('#oStatus'), vx: $$('#oVx i'), vxl: $('#oVxL'), axis: $('#oAxis'), memLink: $('#oMemLink'),
  form: $('#oForm'), code: $('#oCode'), mem: $('#oMemForm'), tapUI: $('#oTapUI'), flood: $('#oFlood')
};

/* ------------------------------------------------------------ the voice: one status line, deadpan, rarely used */
let sayUntil = 0, sayPrio = 0, swapT = 0;
function say(text, o = {}) {
  const now = performance.now(), prio = o.prio || 1;
  if (now < sayUntil && prio < sayPrio) return false;
  sayPrio = prio; sayUntil = now + (o.hold || 3200);
  clearTimeout(swapT); D.status.classList.add('swap');
  swapT = setTimeout(() => { D.status.textContent = text; D.status.classList.toggle('empty', !text); D.status.classList.remove('swap'); }, RM ? 0 : 260);
  return true;
}
const hush = () => { sayUntil = 0; sayPrio = 0; say('', {prio: 9, hold: 1}); };
const LINES = {
  hint1: 'It can be turned.',
  hint2: 'Something inside is out of register.',
  curious: 'It is looking at you.',
  warm: 'Warmer.',
  hold: 'Hold still.',
  click: 'Click.',
  wrongFace: 'Wrong face. It has six.',
  listening: 'It is listening.',
  members: 'Members may skip the formalities.',
  enter: 'Come in.',
  keys: 'Arrow keys turn it. Enter presses it.',
  nogl: 'A simpler object has been provided.'
};

/* ------------------------------------------------------------ state */
const st = {
  mode: 'idle',            /* idle (turning) · solving · ritual · quiet · entering */
  live: false, gl: false, ready: false, onEnter: null, tok: 0, frames: 0,
  angVel: new THREE.Vector3(), dragging: false, dragged: false, moved: 0, downAt: 0, lastX: 0, lastY: 0, lastMoveT: 0,
  offset: new THREE.Vector3(), offVel: new THREE.Vector3(), chase: new THREE.Vector3(), sq: 1, sqVel: 0, flick: 0,
  pointer: new THREE.Vector2(), pointerIn: false, violentT: 0,
  kb: null, hold: 0, wrongHold: 0, lastWrong: 0, curious: false, hint: 0, warmSaid: false, touched: false,
  lastInput: 0, t0: 0, t: 0, last: 0, pokes: 0, breath: 0, seed: 0
};
/* everything authored (on CLOCK, so the test hooks can hold time mid-move) */
const A0 = {glow: 0, pieces: 0, clear: 0, ink: 0, flood: 0, dolly: 0, rit: 0, click: 0, cap: 0, fill: 0};
const A = {...A0};
/* the look, in one place (tuned against screenshots) */
const K = {glow: .6, core: .9, gk: 1.3, dens: .17, edge: .15, ink: 4.2, dust: .7, bloom: .32, thr: .95, etch: .22, pool: .1, halo: .85, grain: .03, env: .22};
const TGT = [238 / 255, 234 / 255, 231 / 255];   /* the Atlas sky #eeeae7, in display values: the hand-off lands on it exactly */
const TW = new Set();
const run = p => { TW.add(p.tw); p.then(() => TW.delete(p.tw)); return p; };
const killTweens = () => { TW.forEach(t => t.cancel()); TW.clear(); };
const to = (key, v, dur, ease = E.move, delay = 0) => { const a = A[key]; return run(tween(RM ? Math.min(dur, 200) : dur, e => { A[key] = lerp(a, v, e); }, ease, RM ? Math.min(delay, 60) : delay)); };
const after = (ms, f) => { const my = st.tok; return run(wait(RM ? Math.min(ms, 250) : ms)).then(ok => { if (ok !== false && my === st.tok && st.live) f(); }); };

/* ------------------------------------------------------------ three */
let R, scene, camera, composer, bloom, fin, rig, cube, glass, glassU, keyL, pool, dots, dotU, hitBox, shadow;
const SZ = 1.9, H = SZ / 2, FLOOR = -1.78, DEPTH = [.6, 0, -.6];
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const tv = new THREE.Vector3(), tv2 = new THREE.Vector3(), tv3 = new THREE.Vector3(), tq = new THREE.Quaternion();
const IDENT = new THREE.Quaternion();
const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(.36, Math.PI - .64, 0, 'XYZ'));
const NRM = {pz: [0, 0, 1], nz: [0, 0, -1], px: [1, 0, 0], nx: [-1, 0, 0], py: [0, 1, 0], ny: [0, -1, 0]};
/* two faces carry an engraving: the back (the number, in the same points as the 4) and the top (the label) */
const GLY = {nz: 'dots', py: 'label'};
const ETCH = `
float gEtch = 0.;
float etchAt(){
  vec3 n = normalize(vObjN), an = abs(n), p = vObjP / ${SZ.toFixed(2)};
  float flatF = smoothstep(.985, .999, max(an.x, max(an.y, an.z)));
  vec2 uv; float cell;
  if (an.z >= an.x && an.z >= an.y) { if (n.z > 0.) return 0.; uv = vec2(-p.x, p.y); cell = 0.; }
  else if (an.x >= an.y) return 0.;
  else { if (n.y < 0.) return 0.; uv = vec2(p.x, -p.z); cell = 1.; }
  uv = clamp(uv + .5, .002, .998);
  return texture2D(tEtch, vec2((cell + uv.x) / 2., uv.y)).a * flatF;
}
`;
/* light scattered inside the frosted block, toward the eye: a soft core (a gaussian about the centre) integrated along
   the view ray between the two faces it crosses, plus an even haze proportional to the path length. Long paths through
   the middle glow; paths that only graze a corner carry almost nothing, so the silhouette dissolves into the dark. */
const GLOW = `
float erfA(float x){ float a = .147, x2 = x * x; return sign(x) * sqrt(max(0., 1. - exp(-x2 * (1.2732395 + a * x2) / (1. + a * x2)))); }
float inscatter(vec3 ro, vec3 rd){
  vec3 inv = 1. / rd, h = vec3(${H.toFixed(3)});
  vec3 ta = (-h - ro) * inv, tb = (h - ro) * inv, tmin = min(ta, tb), tmax = max(ta, tb);
  float t0 = max(max(tmin.x, tmin.y), tmin.z), t1 = min(min(tmax.x, tmax.y), tmax.z);
  t0 = max(t0, 0.);
  if (t1 <= t0) return 0.;
  float tc = -dot(ro, rd), d2 = max(dot(ro, ro) - tc * tc, 0.), sk = sqrt(uGlowK);
  float core = exp(-uGlowK * d2) * .886227 / sk * (erfA(sk * (t1 - tc)) - erfA(sk * (t0 - tc)));
  float len = t1 - t0;
  return uCore * core + uDens * len * len / (len + .6);
}
`;

function mk(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
/* the two engravings, and the 4's three pieces (white on transparent, 512 square) */
function glyphCanvas(kind) {
  const c = mk(512), g = c.getContext('2d'); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  const mono = (sz, w = 400) => `${w} ${sz}px "DM Mono", ui-monospace, monospace`;
  const xh = (x, y, s = 12, w = 4) => { g.lineWidth = w; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke(); };
  if (kind === 'dots') {
    const F = {'0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000']};
    const p = 15, r = 5.2, W = 4 * 5 * p + 3 * p, x0 = 256 - W / 2 + p / 2, y0 = 214;
    [...'0047'].forEach((d, k) => F[d].forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') { g.beginPath(); g.arc(x0 + k * 6 * p + i * p, y0 + j * p, r, 0, 7); g.fill(); } })));
    g.font = mono(17); g.textAlign = 'center'; g.fillText('NO MANUAL', 256, 382);
  }
  if (kind === 'label') {
    g.font = mono(26); g.textAlign = 'center'; g.fillText('DO NOT OPEN', 256, 250);
    g.font = mono(15); g.fillText('OBJECT 0047', 256, 286);
    xh(84, 84); xh(428, 84); xh(84, 428); xh(428, 428);
  }
  if (kind === 'stem') g.fillRect(300, 76, 58, 360);
  if (kind === 'bar') g.fillRect(96, 318, 324, 54);
  if (kind === 'diag') { g.beginPath(); g.moveTo(300, 76); g.lineTo(358, 76); g.lineTo(160, 318); g.lineTo(96, 318); g.closePath(); g.fill(); }
  return c;
}

/* the 4, laser-etched: a cloud of points cut into blocks, the blocks spread over three depths.
   Each point is placed on the line from the camera through its place in the drawing, so the three slices close into one
   4 only when the block sits square to you; turned, they come apart into scattered points. A fine dust of stray points
   fills the rest of the block. */
function inclusions() {
  const parts = ['stem', 'bar', 'diag'].map(k => glyphCanvas(k).getContext('2d').getImageData(0, 0, 512, 512).data);
  let seed = 47; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const P = [], I = [], pitch = 9.6;
  for (let row = 0, y = 66; y < 446; y += pitch * .866, row++) {
    for (let x = 84 + (row % 2) * pitch / 2; x < 432; x += pitch) {
      const jx = x + (rnd() - .5) * 3, jy = y + (rnd() - .5) * 3, o = (Math.round(jy) * 512 + Math.round(jx)) * 4 + 3;
      let piece = -1; for (let i = 0; i < 3; i++) if (parts[i][o] > 128) { piece = i; break; }
      if (piece < 0) continue;
      /* each stroke is cut into blocks, and neighbouring blocks sit at different depths: turned, it is only scatter */
      const slice = (piece + Math.floor(jy / 92) + 2 * Math.floor(jx / 118)) % 3;
      P.push((jx / 512 - .5) * 1.5, (.5 - jy / 512) * 1.5, DEPTH[slice] + (rnd() - .5) * .16); I.push(.013 + rnd() * .006, slice);
    }
  }
  for (let i = 0; i < 170; i++) { P.push((rnd() - .5) * 1.66, (rnd() - .5) * 1.66, (rnd() - .5) * 1.66); I.push(.006 + rnd() * .008, 3); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('aInfo', new THREE.Float32BufferAttribute(I, 2));
  dotU = {uCamR: {value: new THREE.Vector3()}, uZf: {value: DEPTH[0]}, uPieces: {value: 0}, uInk: {value: 0}, uDust: {value: 0}, uSoft: {value: 1}, uPx: {value: 1}, uCol: {value: new THREE.Color(1, .95, .88)}};
  const m = new THREE.ShaderMaterial({
    uniforms: dotU, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec2 aInfo; uniform vec3 uCamR; uniform float uZf, uPieces, uSoft, uPx, uInk, uDust; varying float vA; varying float vK;
      void main(){
        vec3 p = position;
        if (aInfo.y < 2.5) {
          float z = mix(p.z, uZf, uPieces), Dz = max(1., uCamR.z), k = (Dz - z) / (Dz - uZf);
          p = vec3(uCamR.xy * (1. - k) + p.xy * k, z); vA = uInk;
        } else vA = uDust;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        float spread = mix(1., 2.6, uSoft);
        gl_PointSize = max(1., aInfo.x * uPx / -mv.z * spread);
        vA /= spread * spread; vK = mix(4.5, 2.2, uSoft);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uCol; varying float vA; varying float vK;
      void main(){ vec2 d = gl_PointCoord * 2. - 1.; float r2 = dot(d, d); if (r2 > 1.) discard;
        gl_FragColor = vec4(uCol * exp(-r2 * vK) * vA, 1.); }`
  });
  const pts = new THREE.Points(geo, m); pts.frustumCulled = false; pts.renderOrder = 5; return pts;
}

/* the last pass, in display values: film grain everywhere (it shows on the dark too), and the hand-off. Light spreads
   from the block (halo) and then over everything (fill), and no pixel is ever brighter than the target (cap): the frame
   rises steadily to exactly the Atlas sky and never overshoots it. */
const FinishShader = {
  uniforms: {tDiffuse: {value: null}, uT: {value: new THREE.Vector3(...TGT)}, uGrain: {value: .03}, uSeed: {value: 0}, uPR: {value: 1},
    uCap: {value: 0}, uFill: {value: 0}, uHalo: {value: 0}, uC: {value: new THREE.Vector2()}, uRad: {value: 1}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 uT; uniform float uGrain, uSeed, uPR, uCap, uFill, uHalo, uRad; uniform vec2 uC; varying vec2 vUv;
    float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 g = floor(gl_FragCoord.xy / uPR) + vec2(uSeed * 37., uSeed * 17.);
      float n = h(g) + h(g + 71.37) - 1.;
      float l = dot(c, vec3(.2126, .7152, .0722));
      c = max(c + n * uGrain * mix(1., .45, smoothstep(.08, .7, l)), 0.);
      c = mix(c, min(c, uT), uCap);
      float d = length(gl_FragCoord.xy - uC) / uRad;
      float e = max(d - .75, 0.), f = clamp(uFill + uHalo * smoothstep(.45, .95, d) * exp(-e * e * 1.6), 0., 1.);  /* spill: around the block, not over it */
      gl_FragColor = vec4(mix(c, uT, f), 1.);
    }`
};

function build() {
  const cv = D.gl;
  try { R = new THREE.WebGLRenderer({canvas: cv, antialias: false, powerPreference: 'high-performance', alpha: false}); if (!R.getContext()) throw 0; }
  catch (e) { return false; }
  R.setPixelRatio(Q.has('pr') ? +Q.get('pr') : Math.min(devicePixelRatio || 1, coarse ? 1.5 : 1.75));
  R.toneMapping = THREE.AgXToneMapping; R.toneMappingExposure = 1.0; R.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  /* the stage: #0e0e0f after AgX (linear .00845 renders as 14,14,15) */
  scene.background = new THREE.Color(.00845, .00845, .0087);
  camera = new THREE.PerspectiveCamera(28, innerWidth / innerHeight, .05, 80);

  /* a soft key from above front-left: it draws the bevels */
  keyL = new THREE.SpotLight(0xfff3e6, 8, 18, .3, 1, 2); keyL.position.set(-2.6, 6.4, 4.2); keyL.target.position.set(0, FLOOR, 0); scene.add(keyL, keyL.target);

  /* no floor plane: only the block's warm light on the floor, and its contact shadow */
  pool = new THREE.Mesh(new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: {uCol: {value: new THREE.Color(1, .78, .58)}, uI: {value: 0}}, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform vec3 uCol; uniform float uI; varying vec2 vP; void main(){ float r2 = dot(vP, vP * vec2(1., 1.25)); float g = exp(-r2 * 1.1) * .65 + exp(-r2 * .28) * .35; gl_FragColor = vec4(uCol * g * uI, 1.); }'
  }));
  pool.position.y = FLOOR; pool.renderOrder = 0; scene.add(pool);

  rig = new THREE.Group(); scene.add(rig);
  cube = new THREE.Group(); rig.add(cube);

  /* the glass: one block of optical glass, 1.9 a side, bevelled. Faces satin-frosted, bevels polished. Its light is
     scattered inside it (GLOW); the frost (uTrans) blurs what is seen through it and thins as the 4 is aligned. */
  glassU = {uTrans: {value: .3}, uFace: {value: .1}, uEdge: {value: .12}, uCamObj: {value: new THREE.Vector3()}, uGlow: {value: 0}, uGlowK: {value: K.gk}, uCore: {value: K.core},
    uDens: {value: K.dens}, uEdgeGlow: {value: K.edge}, uGlowCol: {value: new THREE.Color(1, .9, .79)}, tEtch: {value: new THREE.DataTexture(new Uint8Array(4), 1, 1)}, uEtch: {value: 0}};
  const gm = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: .24, transmission: 1, thickness: 1.5, ior: 1.5,
    attenuationColor: new THREE.Color(0xe6e4df), attenuationDistance: 3, specularIntensity: .8, envMapIntensity: K.env, dispersion: .2
  });
  gm.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, glassU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjN; varying vec3 vObjP;').replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvObjN = objectNormal; vObjP = position;');
    sh.fragmentShader = 'uniform float uTrans; uniform float uFace; uniform float uEdge; uniform vec3 uCamObj; uniform float uGlow; uniform float uGlowK; uniform float uCore; uniform float uDens; uniform float uEdgeGlow; uniform vec3 uGlowCol; uniform sampler2D tEtch; uniform float uEtch; varying vec3 vObjN; varying vec3 vObjP;\n' + GLOW + ETCH + sh.fragmentShader
      .replace('#include <opaque_fragment>', 'outgoingLight *= 1. - gEtch * uEtch;\n#include <opaque_fragment>')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n{ vec3 an = abs(normalize(vObjN)); roughnessFactor = mix(uEdge, uFace, smoothstep(.965, .996, max(an.x, max(an.y, an.z)))); gEtch = etchAt(); roughnessFactor = mix(roughnessFactor, .55, gEtch); }')
      .replace('#include <transmission_fragment>', THREE.ShaderChunk.transmission_fragment.replace('n, v, material.roughness,', 'n, v, uTrans,') + `
        /* and a little of it caught in the bevels, as in a cut crystal block: the edges draw the cube */
        { vec3 an = abs(normalize(vObjN)); float bev = 1. - smoothstep(.93, .995, max(an.x, max(an.y, an.z)));
          totalDiffuse += uGlowCol * uGlow * (inscatter(uCamObj, normalize(vObjP - uCamObj)) * (1. - gEtch * .5) + bev * uEdgeGlow); }`);
  };
  glass = new THREE.Mesh(new RoundedBoxGeometry(SZ, SZ, SZ, 7, .085), gm);
  glass.layers.enable(1); cube.add(glass);
  dots = inclusions(); cube.add(dots);
  hitBox = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.1, 2.1), new THREE.MeshBasicMaterial()); hitBox.visible = false; cube.add(hitBox);

  shadow = contactShadow();

  /* post: a little bloom on the core and the points, then AgX, then grain and the hand-off */
  const rt = new THREE.WebGLRenderTarget(1, 1, {type: THREE.HalfFloatType, samples: coarse ? 2 : 4});
  composer = new EffectComposer(R, rt);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), K.bloom, .55, K.thr); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  fin = new ShaderPass(FinishShader); composer.addPass(fin);
  resize();
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); st.gl = false; fallback(); });
  return true;
}
/* the two engravings (satin lines cut into the frost): one atlas, 2 × 1 cells, back then top. Drawn once the mono is in. */
async function etch() {
  try { await Promise.race([document.fonts.load('400 22px "DM Mono"'), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  const c = mk(1024, 512), g = c.getContext('2d');
  ['nz', 'py'].forEach((k, i) => { const m = 512 * .16; g.drawImage(glyphCanvas(GLY[k]), i * 512 + m, m, 512 - 2 * m, 512 - 2 * m); });
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  glassU.tEtch.value = t;
}

/* ------------------------------------------------------------ a real contact shadow: the block seen from under the floor,
   as depth, blurred twice (the three.js contact-shadow technique), laid on the floor. It follows every turn. */
function contactShadow() {
  const W = 6.4, HT = 2.6, RES = 256;
  const grp = new THREE.Group(); grp.position.y = FLOOR + .003; scene.add(grp);
  const rtA = new THREE.WebGLRenderTarget(RES, RES), rtB = new THREE.WebGLRenderTarget(RES, RES);
  rtA.texture.generateMipmaps = rtB.texture.generateMipmaps = false;
  const geo = new THREE.PlaneGeometry(W, W).rotateX(Math.PI / 2);
  const plane = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({map: rtA.texture, transparent: true, opacity: .9, depthWrite: false}));
  plane.renderOrder = 1; plane.scale.y = -1; grp.add(plane);
  const blurPlane = new THREE.Mesh(geo); blurPlane.visible = false; blurPlane.layers.set(1); grp.add(blurPlane);
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, W / 2, -W / 2, 0, HT); cam.rotation.x = Math.PI / 2; cam.layers.set(1); grp.add(cam);
  const dm = new THREE.MeshDepthMaterial(); const dark = {value: 1};
  dm.onBeforeCompile = s => { s.uniforms.darkness = dark; s.fragmentShader = 'uniform float darkness;\n' + s.fragmentShader.replace('gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );'); };
  dm.depthTest = dm.depthWrite = false;
  const hb = new THREE.ShaderMaterial(HorizontalBlurShader), vb = new THREE.ShaderMaterial(VerticalBlurShader); hb.depthTest = vb.depthTest = false;
  const blur = a => {
    blurPlane.visible = true;
    blurPlane.material = hb; hb.uniforms.tDiffuse.value = rtA.texture; hb.uniforms.h.value = a / RES; R.setRenderTarget(rtB); R.render(blurPlane, cam);
    blurPlane.material = vb; vb.uniforms.tDiffuse.value = rtB.texture; vb.uniforms.v.value = a / RES; R.setRenderTarget(rtA); R.render(blurPlane, cam);
    blurPlane.visible = false;
  };
  const cc = new THREE.Color();
  return {
    plane, dark, rt: rtA, cam, grp,
    render() {
      const bg = scene.background, ca = R.getClearAlpha(); R.getClearColor(cc);
      const dv = dots.visible; dots.visible = false;
      scene.background = null; scene.overrideMaterial = dm; R.setClearColor(0x000000, 0);
      R.setRenderTarget(rtA); R.clear(); R.render(scene, cam); scene.overrideMaterial = null;
      blur(5); blur(2.2);
      R.setRenderTarget(null); R.setClearColor(cc, ca); scene.background = bg; dots.visible = dv;
    }
  };
}

async function loadEnv() {
  const pm = new THREE.PMREMGenerator(R);
  try {
    const hdr = await Promise.race([new RGBELoader().loadAsync(BASE + 'studio.hdr'), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 8000))]);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = pm.fromEquirectangular(hdr).texture; hdr.dispose();
  } catch (e) {
    /* no HDRI: two soft lights on black, so the glass still has something to reflect */
    const env = new THREE.Scene(); env.background = new THREE.Color(0);
    const box = (w, h, i, p) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(1, 1, 1).multiplyScalar(i), side: THREE.DoubleSide})); m.position.set(...p); m.lookAt(0, 0, 0); env.add(m); };
    box(3, 3, 3, [-6, 2, 3]); box(3, 3, 2, [5, 3, -2]);
    scene.environment = pm.fromScene(env, .06).texture;
  }
  pm.dispose();
  /* the umbrella sits front-left of the block and the soft panel above-right: they write the bevels */
  scene.environmentRotation.set(0, -2.15, 0);
  scene.environmentIntensity = 1;
}

/* ------------------------------------------------------------ framing */
const tanH = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
const LOOK = new THREE.Vector3(0, -.18, 0);
function idlePos() {
  const a = innerWidth / innerHeight, t = tanH(), ph = a < .8;
  const d = Math.max(1.05 / ((ph ? .3 : .36) * t), 1.05 / ((ph ? .4 : .38) * t * a));
  return new THREE.Vector3(0, LOOK.y + d * .085, d);
}
/* the ritual: on a wide screen the block moves left and the code sits beside it; on a phone it rises and the code sits
   below it. Moves are view offsets (the camera does not move, so the 4 stays in register). */
const L = {side: false, shift: new THREE.Vector2(), fx: 0, fy: 0, fw: 300, box: null};
function cubeBox(pos) {
  const g = camera.clone(); g.position.copy(pos); g.lookAt(LOOK); g.clearViewOffset(); g.updateMatrixWorld(); g.updateProjectionMatrix();
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < 8; i++) { tv.set(i & 1 ? H : -H, i & 2 ? H : -H, i & 4 ? H : -H).project(g); const x = (tv.x * .5 + .5) * innerWidth, y = (-tv.y * .5 + .5) * innerHeight; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return {x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2};
}
function layout() {
  const w = innerWidth, h = innerHeight;
  L.side = !!st.gl && w >= 760 && w / h >= 1.05;
  if (!st.gl) { L.shift.set(0, 0); L.fx = w / 2; L.fy = Math.min(h - 190, h * .62); L.fw = Math.min(w - 48, 300); }
  else {
    const b = L.box = cubeBox(idlePos());
    if (L.side) {
      const dx = Math.min(0, w * .37 - b.cx); L.shift.set(dx, 0);
      L.fx = b.x1 + dx + Math.max(56, w * .045); L.fw = Math.min(300, w - L.fx - 56); L.fy = b.cy - 62;
    } else {
      const want = Math.min(h * .5, h - 250) - b.y1, dy = Math.min(0, want); L.shift.set(0, dy);
      L.fx = w / 2; L.fw = Math.min(w - 48, 320); L.fy = b.y1 + dy + Math.max(30, h * .04);
    }
  }
  ROOT.classList.toggle('rit-side', L.side);
  const S = ROOT.style; S.setProperty('--fx', L.fx + 'px'); S.setProperty('--fy', L.fy + 'px'); S.setProperty('--fw', L.fw + 'px');
}
function resize() {
  if (!R) return;
  const w = innerWidth, h = innerHeight, pr = R.getPixelRatio();
  R.setSize(w, h, false); composer.setPixelRatio(pr); composer.setSize(w, h);
  bloom.resolution.set(w * pr / 2, h * pr / 2);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  fin.uniforms.uPR.value = Math.max(1, Math.round(pr));
}

/* ------------------------------------------------------------ orientation helpers */
function snapQuat(q) {
  const m = new THREE.Matrix4().makeRotationFromQuaternion(q), e = m.elements;
  const col = c => new THREE.Vector3(e[c * 4], e[c * 4 + 1], e[c * 4 + 2]);
  const axisOf = (v, excl = -1) => { const a = [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)]; if (excl >= 0) a[excl] = -1; const i = a.indexOf(Math.max(...a)); const o = new THREE.Vector3(); o.setComponent(i, Math.sign(v.getComponent(i)) || 1); return [o, i]; };
  const [r0, i0] = axisOf(col(0)), [r1] = axisOf(col(1), i0), r2 = new THREE.Vector3().crossVectors(r0, r1);
  m.makeBasis(r0, r1, r2); return new THREE.Quaternion().setFromRotationMatrix(m);
}
function facing(q) { let best = null, bd = -2; for (const k in NRM) { const d = tv.set(...NRM[k]).applyQuaternion(q).z; if (d > bd) { bd = d; best = k; } } return [best, Math.acos(Math.min(1, bd)) * 180 / Math.PI]; }
const offAxis = q => Math.acos(clamp(tv.set(0, 0, 1).applyQuaternion(q).z, -1, 1)) * 180 / Math.PI;
/* any real input; the Members link only appears once the visitor has done something (or after 20 s) */
const markInput = () => { st.lastInput = performance.now(); st.curious = false; if (st.live && !st.touched) { st.touched = true; ROOT.classList.add('ml'); } };
/* turn the block to a quaternion on CLOCK (keyboard turns, the self-alignment, the quiet turn away) */
function turnTo(q, dur, ease = E.out4) { st.angVel.set(0, 0, 0); st.kb = null; const a = cube.quaternion.clone(); return run(tween(RM ? Math.min(dur, 160) : dur, e => cube.quaternion.slerpQuaternions(a, q, e), ease)); }
/* during the ritual the stage and the corner link leave the tab order (nothing invisible can be focused) */
function setInert(on) { D.stage.inert = on; D.memLink.inert = on; }

/* ------------------------------------------------------------ input */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const setNDC = (x, y) => ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
const canTurn = () => st.live && st.gl && st.mode === 'idle';
D.stage.addEventListener('pointerdown', e => {
  if (!canTurn()) return;
  D.stage.setPointerCapture(e.pointerId); D.stage.classList.add('grab');
  Object.assign(st, {dragging: true, dragged: false, moved: 0, downAt: performance.now(), lastX: e.clientX, lastY: e.clientY, lastMoveT: performance.now(), kb: null});
  st.angVel.set(0, 0, 0); markInput();
});
D.stage.addEventListener('pointermove', e => {
  setNDC(e.clientX, e.clientY); st.pointer.copy(ndc); st.pointerIn = e.pointerType === 'mouse' || st.dragging;
  if (!st.dragging) return;
  const now = performance.now(), dt = Math.max(1, now - st.lastMoveT) / 1000;
  const dx = e.clientX - st.lastX, dy = e.clientY - st.lastY; st.lastX = e.clientX; st.lastY = e.clientY; st.lastMoveT = now;
  st.moved += Math.hypot(dx, dy); if (st.moved > 6) st.dragged = true; if (!st.dragged) return;
  const k = (coarse ? .011 : .0078) * (now < st.violentT ? .45 : 1), ay = dx * k, ax = dy * k;
  tq.setFromAxisAngle(Y, ay); cube.quaternion.premultiply(tq); tq.setFromAxisAngle(X, ax); cube.quaternion.premultiply(tq);
  st.angVel.lerp(tv.set(ax / dt, ay / dt, 0), .5);
  if (Math.hypot(dx, dy) / dt > 3200) st.violentT = now + 1100;   /* thrown hard, it gets heavier for a moment */
  markInput();
});
function endDrag(e) {
  if (!st.dragging) return; st.dragging = false; D.stage.classList.remove('grab');
  if (!st.dragged && performance.now() - st.downAt < 380) { setNDC(e.clientX, e.clientY); poke(ndc); }
  if (RM || performance.now() - st.lastMoveT > 90) st.angVel.set(0, 0, 0);
  if (e.pointerType !== 'mouse') st.pointerIn = false;
}
D.stage.addEventListener('pointerup', endDrag); D.stage.addEventListener('pointercancel', endDrag);
D.stage.addEventListener('pointerleave', () => { st.pointerIn = false; });
/* a poke: it recoils and its light flickers. It says nothing. */
function poke(p) {
  ray.setFromCamera(p, camera); const h = ray.intersectObject(hitBox, false)[0]; if (!h) return;
  st.pokes++;
  const local = h.point.clone().sub(rig.position), axis = new THREE.Vector3().crossVectors(local, new THREE.Vector3(0, 0, -1)).normalize();
  if (!RM) { st.angVel.addScaledVector(tv.set(axis.x, axis.y, 0), 2.4); st.offVel.z -= 3.2; st.offVel.x -= local.x * 1.2; st.offVel.y -= local.y * 1.2; st.sqVel -= 2.2; }
  st.flick = 1; markInput();
}
addEventListener('keydown', e => {
  if (!canTurn() || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
  if (document.activeElement !== D.stage && document.activeElement !== document.body) return;
  const map = {ArrowLeft: [Y, -1], ArrowRight: [Y, 1], ArrowUp: [X, -1], ArrowDown: [X, 1]};
  if (map[e.key]) {
    e.preventDefault(); markInput();
    const from = st.kb ? st.kb.to.clone() : cube.quaternion.clone();
    const target = snapQuat(from).premultiply(new THREE.Quaternion().setFromAxisAngle(map[e.key][0], map[e.key][1] * Math.PI / 2));
    st.kb = {from: cube.quaternion.clone(), to: target, t: 0, dur: RM ? .12 : .5}; st.angVel.set(0, 0, 0); return;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault(); markInput();
    const [k, ang] = facing(st.kb ? st.kb.to : cube.quaternion);
    if (k === 'pz' && ang < 25) solve();
    else { poke(new THREE.Vector2(0, 0)); if (k !== 'pz') after(900, () => say(LINES.wrongFace, {prio: 4})); }
  }
});
let kbd = false;
addEventListener('keydown', e => { if (e.key === 'Tab') kbd = true; }, true);
addEventListener('pointerdown', () => { kbd = false; }, true);
D.stage.addEventListener('focus', () => { if (kbd && D.stage.matches(':focus-visible')) say(LINES.keys, {prio: 2, hold: 5000}); });

/* ------------------------------------------------------------ the mechanic: align, click, the ritual */
function solve(path) {
  if (st.mode !== 'idle') return;
  st.mode = 'solving'; st.hold = 0; D.stage.classList.add('off');
  if (!path) say(LINES.click, {prio: 6, hold: 2600});
  /* it squares itself up (a short overshoot, like a detent), the three slices fall into one plane, the frost thins */
  turnTo(IDENT, path ? 900 : 420, path ? E.move : t => { const c = 2.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); });
  to('pieces', 1, 420, E.out4); to('clear', .6, 900, E.out);
  if (!path) { A.click = 1; to('click', 0, 1100, E.out, 400); }
  after(path ? 700 : 1300, () => showRitual(path));
}
function showRitual(path) {
  const moving = st.mode !== 'ritual' && st.gl && A.rit < .99;
  st.mode = 'ritual'; setInert(true); to('rit', 1, 1100, E.move);
  const f = path === 'members' ? D.mem : D.form;
  D.form.hidden = D.mem.hidden = true; D.tapUI.hidden = true;
  f.hidden = false; ROOT.classList.add('ritual');
  /* the form arrives as the block finishes making room for it, never on top of the glass */
  const lag = moving ? 760 : 0;
  after(lag, () => reveal(f));
  say(path === 'members' ? LINES.members : LINES.listening, {prio: 6, hold: 6000});
  if (!coarse) after(lag + (path ? 120 : 200), () => (path === 'members' ? $('#oEmail') : D.code).focus({preventScroll: true}));
}
/* forms fade in on the next frame; a later hide cancels a pending fade-in (slow frames must not resurrect a form) */
let ritTok = 0;
function reveal(f) { const my = ++ritTok; requestAnimationFrame(() => { if (my === ritTok && !f.hidden) f.classList.add('on'); }); }
function hideRitual() {
  ritTok++;
  for (const f of [D.form, D.mem]) { f.classList.remove('on'); setTimeout(() => { if (!f.classList.contains('on')) f.hidden = true; }, 300); }
  ROOT.classList.remove('ritual');
}
/* a wrong code: it goes quiet. The ritual leaves, the 4 slips out of register, the frost returns, it turns away. Nothing is said. */
function quiet() {
  st.tok++; hideRitual(); hush(); st.mode = 'quiet'; D.code.value = '';
  to('rit', 0, 1100, E.move); to('pieces', 0, 1400, E.io, 200); to('clear', 0, 1600, E.io, 200);
  const away = new THREE.Quaternion().setFromEuler(new THREE.Euler(.16, -.52, .05, 'XYZ'));
  turnTo(away, 2200, E.move).then(ok => { if (ok === false || st.mode !== 'quiet') return; st.mode = 'idle'; setInert(false); D.stage.classList.remove('off'); markInput(); st.hint = Math.max(st.hint, 3); D.stage.focus({preventScroll: true}); });
}
/* someone with a key (the card, ?key=, Members) does not have to do the turning: it squares itself up for them */
function admit(path) {
  if (st.mode === 'idle') { solve(path); return true; }
  if (st.mode === 'ritual') { showRitual(path); return true; }
  return false;
}
function success() {
  if (st.mode === 'entering') return;
  st.tok++; st.mode = 'entering'; hideRitual(); setInert(true); D.tapUI.classList.remove('on'); setTimeout(() => { D.tapUI.hidden = true; }, 300);
  D.stage.classList.add('off'); ROOT.classList.add('going');
  store.put('p4ce.v5.member', '1');
  /* the member bundle (catalogue, views, the Atlas) is fetched only now, behind the light */
  if (st.onEnter && st.onEnter.load) st.loadP = Promise.resolve(st.onEnter.load()).catch(() => {});
  say(LINES.enter, {prio: 9, hold: 9000});
  enter();
}

/* ------------------------------------------------------------ the hand-off: the frost clears, the block fills with light,
   the camera goes into it, and the light is the Atlas sky. One steady rise to exactly #eeeae7, never past it; the Atlas
   starts to clear underneath before the light is complete, so the flat field is on screen for a moment only. */
async function enter() {
  const my = st.tok, onE = st.onEnter;
  const handOff = async () => {
    if (st.loadP) await st.loadP;
    if (my !== st.tok) return false;
    onE && onE.prepare(LIGHT); onE && onE.go(LIGHT); return true;
  };
  if (!st.gl) {
    D.flood.style.transition = `opacity ${RM ? 300 : 900}ms ease-in`; D.flood.style.opacity = 1;
    await run(wait(RM ? 320 : 950));
    if (await handOff()) finish(); return;
  }
  st.angVel.set(0, 0, 0); st.kb = null; st.curious = false;
  if (RM) {
    to('clear', 1, 200); to('cap', 1, 200); to('fill', 1, 200, E.lin, 0);
    await run(wait(260));
  } else {
    turnTo(IDENT, 900, E.move); to('pieces', 1, 600, E.out4); to('rit', 0, 1500, E.move);
    to('clear', 1, 900, E.out, 100);                       /* the frost clears: the points sharpen */
    to('cap', 1, 250, E.out);                              /* nothing will be brighter than the sky */
    to('ink', 1, 1200, E.io, 300);                         /* the 4 brightens, then dissolves into the light */
    to('flood', 1, 1700, E.io, 300);                       /* the block fills */
    to('dolly', 1, 1300, E.io, 300);                       /* and the camera goes into it */
    to('fill', 1, 900, t => t * t * (3 - 2 * t), 650);    /* then the light takes the whole room (flat at 1550) */
    after(800, () => ROOT.classList.add('lit'));
    await run(wait(1300));
  }
  if (my !== st.tok) return;
  /* the Atlas starts clearing underneath while the last of the light comes up; the gate lets go as it lands */
  if (!(await handOff())) return;
  if (!RM) await run(wait(100));
  finish();
}
function finish() {
  /* the gate is a flat field of the Atlas's own light now, and the Atlas is already clearing under it: let it go */
  tween(RM ? 200 : 300, e => { ROOT.style.opacity = (1 - e).toFixed(3); }, E.out).then(ok => { if (ok !== false && st.mode === 'entering') { st.live = false; ROOT.hidden = true; } });
}

/* ------------------------------------------------------------ forms */
D.form.addEventListener('submit', e => {
  e.preventDefault(); const v = D.code.value.replace(/\s+/g, '').toUpperCase();
  if (!v) { D.code.focus(); return; }
  if (v === CODE) success(); else quiet();
});
$('#oMem').addEventListener('click', () => { D.form.classList.remove('on'); D.form.hidden = true; D.mem.hidden = false; reveal(D.mem); $('#oEmail').focus({preventScroll: true}); });
$('#oBack').addEventListener('click', () => { D.mem.classList.remove('on'); D.mem.hidden = true; showRitual(); });
D.mem.addEventListener('submit', e => {
  e.preventDefault(); const em = $('#oEmail'), pw = $('#oPass');
  [em, pw].forEach(i => i.removeAttribute('aria-invalid'));
  if (!em.value.trim()) { em.setAttribute('aria-invalid', 'true'); em.focus(); return; }
  if (!pw.value) { pw.setAttribute('aria-invalid', 'true'); pw.focus(); return; }
  success();
});
/* "Tap your key": the card's NFC chip opens ?key=0047RSRV. Here the tap is simulated in place. */
$('#oTap').addEventListener('click', () => {
  hideRitual(); ROOT.classList.add('ritual'); D.tapUI.hidden = false; reveal(D.tapUI);
  after(1500, () => success());
});
D.memLink.addEventListener('click', () => { if (!st.live || st.mode === 'entering') return; if (!st.gl) { showRitual('members'); return; } admit('members'); });
$('#oFbOpen').addEventListener('click', () => { if (st.mode !== 'idle') return; markInput(); st.mode = 'solving'; showRitual(); });

/* ------------------------------------------------------------ no WebGL: the simpler object */
function fallback() {
  st.gl = false; D.gl.hidden = true; D.stage.hidden = true; D.fb.hidden = false; ROOT.classList.add('nogl', 'ml');
  layout();
  say(LINES.nogl, {prio: 2, hold: 8000});
}

/* ------------------------------------------------------------ the frame */
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), INTO = new THREE.Vector3(0, 0, H + .14), INTO_LOOK = new THREE.Vector3(0, 0, -2);
let lastRO = 0;
function frame(now, noRender) {
  if (!st.live || !st.gl) return;
  const dt = st.last ? clamp((now - st.last) / 1000, 0, .05) : 0; st.last = now; st.t += dt;
  const t = st.t, pnow = performance.now(), idle = st.mode === 'idle';

  /* rotation: keyboard turns, inertia, the curious turn, the alignment hold */
  if (idle) {
    if (st.kb) {
      st.kb.t += dt / st.kb.dur; const e = 1 - Math.pow(1 - Math.min(1, st.kb.t), 4);
      cube.quaternion.slerpQuaternions(st.kb.from, st.kb.to, e); if (st.kb.t >= 1) { cube.quaternion.copy(st.kb.to); st.kb = null; }
    } else if (!st.dragging) {
      const w = st.angVel.length();
      if (w > 1e-4 && !RM) { tq.setFromAxisAngle(tv.copy(st.angVel).normalize(), w * dt); cube.quaternion.premultiply(tq); st.angVel.multiplyScalar(Math.exp(-dt * 1.9)); }
      /* left alone, it turns most of the way round to face you, and follows the cursor */
      const idleFor = pnow - Math.max(st.lastInput, st.t0 + 12000);
      if (!st.curious && !Q.has('nocurious') && idleFor > 8000 && w < .2) { st.curious = true; say(LINES.curious, {prio: 3, hold: 5000}); }
      if (st.curious && !RM) {
        const px = st.pointerIn ? st.pointer.x : 0, py = st.pointerIn ? st.pointer.y : 0;
        tq.setFromEuler(new THREE.Euler(-py * .18 + .2 + Math.sin(t * .7) * .03, .5 + px * .25, .14 + Math.sin(t * .45) * .04, 'YXZ'));
        cube.quaternion.slerp(tq, 1 - Math.exp(-dt * 1.2));
      }
    }
    const [fk, ang] = facing(cube.quaternion);
    const still = st.angVel.length() < .45 && !st.kb && (!st.dragging || pnow - st.lastMoveT > 140);
    if (fk === 'pz' && ang < 16 && still && !st.curious) {
      if (st.hold === 0) say(LINES.hold, {prio: 4, hold: 1800});
      st.hold += dt;
      if (!st.dragging) cube.quaternion.slerp(snapQuat(cube.quaternion), 1 - Math.exp(-dt * 3.2));
      if (st.hold >= 1.5) solve();
    } else st.hold = Math.max(0, st.hold - dt * 2);
    if (fk !== 'pz' && ang < 7 && still && !st.curious && !st.dragging) {
      st.wrongHold += dt; if (st.wrongHold > 2.2 && pnow - st.lastWrong > 14000) { st.lastWrong = pnow; say(LINES.wrongFace, {prio: 3}); }
    } else st.wrongHold = 0;
    if (!Q.has('nocurious')) {
      const since = pnow - st.t0;
      if (st.hint < 1 && since > 4000 && !st.touched) { st.hint = 1; say(LINES.hint1, {prio: 3, hold: 6000}); }
      if (st.hint < 2 && since > 15000) { st.hint = 2; say(LINES.hint2, {prio: 4, hold: 7000}); }
    }
  }
  if (!st.touched && pnow - st.t0 > 20000) { st.touched = true; ROOT.classList.add('ml'); }
  const holdP = idle ? clamp(st.hold / 1.5) : 0;

  /* position: float, keep its distance from the cursor, recoil from a poke */
  if (idle && !RM && st.pointerIn && !st.dragging) {
    ray.setFromCamera(st.pointer, camera); const p = ray.ray.intersectPlane(new THREE.Plane(Z, 0), tv);
    if (p) {
      const dx = p.x - rig.position.x + st.offset.x, dy = p.y - rig.position.y + st.offset.y, d = Math.hypot(dx, dy) || 1;
      const f = (1 - sm(1.15, 2.6, d)) * (1 - .65 * (1 - sm(.25, 1.0, d))) * .42;
      st.chase.set(-dx / d * f, -dy / d * f * .7, 0);
    }
  } else st.chase.multiplyScalar(Math.exp(-dt * 3));
  { const k = 46, c = 2 * Math.sqrt(k) * .62; st.offVel.addScaledVector(tv.copy(st.chase).sub(st.offset), k * dt).multiplyScalar(Math.exp(-c * dt)); st.offset.addScaledVector(st.offVel, dt); }
  const bob = RM ? 0 : Math.sin(t * .85) * .045 * (1 - A.dolly);
  rig.position.set(st.offset.x * (1 - A.dolly), (st.offset.y + bob) * (1 - A.dolly), st.offset.z * (1 - A.dolly));
  st.sqVel += (1 - st.sq) * 260 * dt; st.sqVel *= Math.exp(-dt * 14); st.sq += st.sqVel * dt;
  cube.scale.set(1 + (1 - st.sq) * .5, st.sq, 1 + (1 - st.sq) * .5);
  st.flick = Math.max(0, st.flick - dt * 2.6);

  /* camera: the idle framing, a little sway with the pointer, the ritual's view offset, and the move into the light */
  const ip = idlePos();
  const swayOn = RM || A.dolly > 0 || /INPUT/.test(document.activeElement.tagName) ? 0 : 1;
  st.sway = st.sway || new THREE.Vector2();
  st.sway.lerp(tv.set(st.pointerIn ? st.pointer.x : 0, st.pointerIn ? st.pointer.y : 0, 0), 1 - Math.exp(-dt * 2));
  /* the dolly: for most of it the block grows on screen at an even rate until it fills the frame, then the
     camera closes the last distance to the face inside its light (no sudden fill as the face arrives) */
  const f0 = Math.max(1, ip.length() - H), f1 = INTO.z - H, fA = f0 / 3.2, u = clamp(A.dolly);
  const dist = u < .85 ? 1 / lerp(1 / f0, 1 / fA, u / .85) : fA * Math.pow(f1 / fA, (u - .85) / .15);
  const dE = (f0 - dist) / (f0 - f1);
  camPos.copy(ip).lerp(INTO, dE); camLook.copy(LOOK).lerp(INTO_LOOK, sm(0, .6, dE));
  camPos.x += st.sway.x * .16 * swayOn * (1 - holdP); camPos.y += st.sway.y * .1 * swayOn * (1 - holdP);
  camera.position.copy(camPos); camera.lookAt(camLook);
  const sx = L.shift.x * A.rit, sy = L.shift.y * A.rit;
  if (Math.abs(sx) + Math.abs(sy) > .5) camera.setViewOffset(innerWidth, innerHeight, -sx, -sy, innerWidth, innerHeight); else camera.clearViewOffset();
  camera.updateMatrixWorld();

  /* the light: it wakes on arrival, holds its breath while you align it, flickers when poked, fills on entry */
  const flick = st.flick > 0 ? (1 - st.flick * .6 * (.6 + .4 * Math.sin(t * 90))) : 1;
  const breathe = RM ? 1 : 1 + Math.sin(t * 1.3) * .035;
  st.breath = lerp(st.breath, Math.max(holdP > 0 ? .35 + holdP * .65 : 0, A.click), 1 - Math.exp(-dt * 6));
  const g = A.glow * flick * breathe, fl = A.flood;
  rig.updateMatrixWorld(true); glassU.uCamObj.value.copy(camera.position); glass.worldToLocal(glassU.uCamObj.value);
  glassU.uGlow.value = K.glow * g * (1 + st.breath * .12) * (1 + fl * 1.4);
  glassU.uGlowK.value = lerp(K.gk, .5, fl); glassU.uDens.value = K.dens * (1 + fl * 1.5); glassU.uCore.value = K.core;
  /* the frost: thins as you hold the 4 square, more once it clicks, gone on entry */
  const clr = Math.max(A.clear, holdP * .5);
  glassU.uTrans.value = lerp(.3, .03, clr);
  glassU.uEtch.value = K.etch * g * (1 - clr * .6);
  /* the 4 and the dust: soft through the frost, sharp once it clears; on entry the 4 brightens and dissolves into the light */
  tv2.copy(camera.position).sub(rig.position);
  dotU.uCamR.value.copy(tv2); dotU.uPieces.value = A.pieces; dotU.uSoft.value = 1 - clr;
  const al = .3 + .7 * (1 - sm(10, 55, offAxis(cube.quaternion)));   /* square on, the points are at their brightest */
  dotU.uInk.value = K.ink * al * g * (1 + .35 * st.breath) * (1 + .5 * sm(0, .35, A.ink)) * (1 - sm(.3, 1, A.ink));
  dotU.uDust.value = K.dust * g * (1 - sm(0, .6, A.ink));
  dotU.uPx.value = R.domElement.height / (2 * tanH());
  bloom.strength = (K.bloom + A.click * .3 - st.breath * .08) * (1 - sm(0, .5, A.dolly));
  keyL.intensity = 8 * (1 - fl * .4);
  shadow.dark.value = 1 - fl * .5;
  pool.material.uniforms.uI.value = K.pool * g * (1 + fl * 2); pool.position.x = rig.position.x; pool.position.z = rig.position.z;

  /* the finish: grain, and the light that takes the frame */
  const fu = fin.uniforms, pr = R.getPixelRatio();
  st.seed = (st.seed + 1) % 61; fu.uSeed.value = st.seed;
  fu.uGrain.value = K.grain;
  fu.uCap.value = A.cap; fu.uFill.value = A.fill; fu.uHalo.value = K.halo * sm(0, 1, fl);
  tv3.setFromMatrixPosition(rig.matrixWorld).project(camera);
  fu.uC.value.set((tv3.x * .5 + .5) * innerWidth * pr, (tv3.y * .5 + .5) * innerHeight * pr);
  { const dist = Math.max(.3, camera.position.distanceTo(rig.position) - H); fu.uRad.value = Math.min(1e5, H * 1.25 / (dist * tanH()) * innerHeight * pr * .5); }
  hud(holdP, pnow, idle);

  if (noRender) return;
  shadow.render();
  composer.render();
  if (!st.ready && ++st.frames > 2) { st.ready = true; D.gl.classList.add('on'); }
}
/* instruments: a registration mark on each corner of the block (the four far ones fade as it comes square, so the
   marks never double up), its name above the topmost corner, and the off-axis readout */
function hud(holdP, pnow, idle) {
  const w = innerWidth, h = innerHeight, show = A.dolly < .05 && st.mode !== 'entering';
  ROOT.classList.toggle('holding', holdP > 0);
  cube.updateMatrixWorld();
  const oa = offAxis(cube.quaternion);
  const backFade = st.mode !== 'idle' || holdP > 0 ? 1 : 1 - sm(12, 32, oa);
  tv2.setFromMatrixPosition(cube.matrixWorld).applyMatrix4(camera.matrixWorldInverse); const cz = tv2.z;
  let tx = 0, ty = 1e9;
  for (let i = 0; i < 8; i++) {
    tv.set(i & 1 ? H : -H, i & 2 ? H : -H, i & 4 ? H : -H).multiplyScalar(1 + .05 * (1 - holdP)).applyMatrix4(cube.matrixWorld);
    const back = tv3.copy(tv).applyMatrix4(camera.matrixWorldInverse).z < cz;
    tv.project(camera);
    const x = (tv.x * .5 + .5) * w, y = (-tv.y * .5 + .5) * h;
    const op = back ? 1 - backFade : 1;
    if (op > .5 && y < ty) { ty = y; tx = x; }
    D.vx[i].style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; D.vx[i].style.opacity = op.toFixed(2);
  }
  D.vxl.style.transform = `translate(${tx.toFixed(1)}px,${(ty - 30).toFixed(1)}px) translateX(-50%)`;
  D.vxl.textContent = holdP > 0 ? `Aligning ${Math.round(holdP * 100)}%` : st.mode === 'ritual' ? 'In register' : 'Object 0047';
  ROOT.style.setProperty('--vxo', show ? (holdP > 0 ? .6 + holdP * .4 : .55) : 0);
  if (pnow - lastRO > 90 || !idle) {
    lastRO = pnow;
    D.axis.textContent = oa.toFixed(1).padStart(5, '0') + '°';
    const warm = idle && oa < 30; D.axis.classList.toggle('warm', warm);
    if (warm && !st.warmSaid && !st.curious) { st.warmSaid = true; say(LINES.warm, {prio: 4, hold: 2200}); }
  }
}

/* ------------------------------------------------------------ the interface (see gates/index.js) */
function reset() {
  killTweens(); st.tok++;
  Object.assign(st, {mode: 'idle', hold: 0, wrongHold: 0, curious: false, hint: 0, warmSaid: false, touched: false, pokes: 0, kb: null, dragging: false, breath: 0, flick: 0, sq: 1, sqVel: 0, loadP: null});
  st.angVel.set(0, 0, 0); st.offset.set(0, 0, 0); st.offVel.set(0, 0, 0); st.chase.set(0, 0, 0);
  Object.assign(A, A0);
  if (cube) cube.quaternion.copy(q0);
  D.code.value = ''; D.flood.style.transition = ''; D.flood.style.opacity = 0;
  D.form.hidden = D.mem.hidden = D.tapUI.hidden = true; D.form.classList.remove('on'); D.mem.classList.remove('on'); D.tapUI.classList.remove('on');
  ROOT.classList.remove('ritual', 'going', 'holding', 'lit', 'ml'); D.stage.classList.remove('off', 'grab'); setInert(false);
  if (!st.gl) ROOT.classList.add('ml');
  hush();
}
export const gate = {
  async init(onEnter) {
    st.onEnter = onEnter;
    if (!NOGL && build()) {
      st.gl = true;
      await loadEnv(); etch();
      cube.quaternion.copy(q0);
    } else fallback();
    addEventListener('resize', () => { resize(); layout(); });
    return {art: st.gl, light: LIGHT};
  },
  show(o = {}) {
    reset(); st.live = true; ROOT.hidden = false; ROOT.getAnimations().forEach(a => a.cancel()); ROOT.style.opacity = '';
    st.t0 = st.lastInput = performance.now(); st.last = 0; st.frames = 0;
    layout();
    if (st.gl) { to('glow', 1, RM ? 200 : 2200, E.out, 250); }
    if (o.key) {
      /* the card was tapped: ?key=0047RSRV. It squares itself up for the holder and lets them in. */
      st.mode = 'solving'; D.stage.classList.add('off'); setInert(true);
      if (st.gl) { after(900, () => { turnTo(IDENT, 1100, E.move); to('pieces', 1, 700, E.out4, 600); to('clear', .6, 900, E.out, 600); }); }
      after(2100, () => { st.mode = 'ritual'; success(); });
    } else if (!st.gl) { st.mode = 'idle'; after(400, () => say(LINES.nogl, {prio: 2, hold: 8000})); }
    setTimeout(() => { if (!D.stage.inert) D.stage.focus({preventScroll: true}); }, 60);
  },
  frame(now, noRender) { frame(now, noRender); },
  get live() { return st.live; },
  state: () => ({mode: st.mode, gl: st.gl, hold: +st.hold.toFixed(2), offAxis: cube ? +offAxis(cube.quaternion).toFixed(1) : null, face: cube ? facing(cube.quaternion)[0] : null, pokes: st.pokes, anim: Object.fromEntries(Object.entries(A).map(([k, v]) => [k, +v.toFixed(3)]))}),
  /* test hooks */
  debug: {
    st, A, K, solve, quiet, success, admit, layout, L, get three() { return {R, scene, camera, glass, glassU, dotU, keyL, pool, shadow, bloom, fin}; },
    setEuler(x, y, z = 0) { cube.quaternion.setFromEuler(new THREE.Euler(x, y, z)); st.angVel.set(0, 0, 0); st.kb = null; markInput(); },
    frame: (ms = 16, n = 1) => { for (let i = 0; i < n; i++) frame(st.last + ms, i < n - 1); }
  }
};

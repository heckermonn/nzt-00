/* P4CE v5 · The Atlas world (restructured from v3: /tmp/claude-0/atlas/world.js, built into v3/atlas.html).
   Kept: the sand plane, nine stations, drag to look, click or hold to travel, the arm.
   Removed: in-world shopping (dossiers, pins, tray, add beat) and the accretion effect.
   New: the held product is the path-traced render (a sprite), a paper sweep, and transition parameters (fx)
   that main.js drives so every move between views is one unbroken camera move with the colour drifting. */
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {makeGfx, MS} from './gfx.js';
import {buildStations, LAYOUT, PT} from './stations.js';
import {Arm} from './arm.js';
import {CAT} from '../catalog.js';
import {Tone} from '../tone.js';
import {CLOCK, RM, clamp, lerp, sm, E, Q} from '../util.js';
import {frames, frameNear, clipped, img} from '../renders.js';

const eio = E.io;
export const LEAD = '08-3';
const LEAD_CI = 7;

export function createWorld(host, ui) {
  const canvas = document.createElement('canvas'); canvas.id = 'gl'; canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'}); if (!renderer.getContext()) throw new Error('no gl'); } catch (e) { return null; }
  host.appendChild(canvas);
  const SOFT = (() => { try { const g = renderer.getContext(), e = g.getExtension('WEBGL_debug_renderer_info'); return !!e && /swiftshader|llvmpipe|software/i.test(g.getParameter(e.UNMASKED_RENDERER_WEBGL)); } catch (x) { return false; } })();
  const isPh = () => innerWidth < 861 || innerWidth / innerHeight < .8;
  let PH = isPh();
  const setDpr = () => renderer.setPixelRatio(SOFT ? 1 : Math.min(devicePixelRatio || 1, PH ? 1.5 : 1.75));
  setDpr();
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const {MAT} = makeGfx(renderer, SOFT);

  const BG = new THREE.Color(), WHITE = new THREE.Color('#fbfaf8');
  const scene = new THREE.Scene(); scene.background = BG; scene.fog = new THREE.Fog(BG.clone(), 38, 150);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 600); scene.add(cam);
  const skyU = {uH: {value: new THREE.Color()}, uZ: {value: new THREE.Color()}};
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), new THREE.ShaderMaterial({side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 uH;uniform vec3 uZ;varying vec3 vP;void main(){float k=smoothstep(-.03,.5,vP.y);gl_FragColor=linearToOutputTexel(vec4(mix(uH,uZ,k*k*(3.-2.*k)),1.));}'}));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .42;
  scene.add(new THREE.HemisphereLight(0xf4f2ee, 0xd2ccc3, .7));
  /* a late sun, low over the horizon, raking across the sand from the far left */
  const sun = new THREE.DirectionalLight(0xfff0e4, 5.0); sun.castShadow = true; { const S = SOFT || PH ? 1024 : 2048; sun.shadow.mapSize.set(S, S); }
  sun.shadow.bias = -.0005; sun.shadow.normalBias = .05; sun.shadow.camera.near = 1; sun.shadow.camera.far = 170; scene.add(sun, sun.target);
  const SUNDIR = new THREE.Vector3(-.76, .232, -.6).normalize();
  let shHalf = 0; function setShadow(h) { if (Math.abs(h - shHalf) < .02) return; shHalf = h; const c = sun.shadow.camera, v = h * .42 + 3.4; c.left = -h; c.right = h; c.top = v; c.bottom = -v; c.updateProjectionMatrix(); } setShadow(26);

  /* ------------------------------------------------------------ the plane: poured sand, raked, with survey marks (v3 shader, no accretion dimples) */
  let LAY = PH ? LAYOUT.phone : LAYOUT.desk;
  const sandU = {uSt: {value: LAY.map(p => new THREE.Vector2(p[0], p[1]))}, uR0: {value: 1.72}, uR1: {value: 4.3}};
  const sandMat = new THREE.MeshStandardMaterial({color: 0xdbd8d2, roughness: .97, metalness: 0});
  sandMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, sandU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <project_vertex>', '#include <project_vertex>\nvW=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec2 uSt[9];uniform float uR0;uniform float uR1;varying vec3 vW;
float gD;vec2 gDir;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
vec2 sandG(vec2 p){
  const float K=18.48;
  float w=sin(p.x*.11)*.9+sin(p.x*.037+1.7)*2.3;
  float dw=.099*cos(p.x*.11)+.0851*cos(p.x*.037+1.7);
  float ph=(p.y+w)*K;
  vec2 gR=cos(ph)*K*vec2(dw,1.);
  gD=1e5;gDir=vec2(0.,1.);
  for(int i=0;i<9;i++){vec2 d=p-uSt[i];float l=length(d);if(l<gD){gD=l;gDir=d/max(l,1e-3);}}
  vec2 gC=cos(gD*K)*K*gDir;
  float m=smoothstep(uR1,uR1-1.1,gD);
  float fl=smoothstep(uR0,uR0+.45,gD);
  return mix(gR,gC,m)*fl;
}`).replace('#include <color_fragment>', `#include <color_fragment>
vec2 SG=sandG(vW.xz);
float fwz=length(fwidth(vW.xz));
float aaf=1.-smoothstep(.03,.085,fwz);
{
  float g=vn(vW.xz*31.)*.55+vn(vW.xz*6.3)*.45;
  diffuseColor.rgb*=.96+.06*g;
  float lw=max(fwz*.8,.01);
  vec2 q=abs(fract(vW.xz/6.+.5)-.5)*6.;
  float cr=max((1.-smoothstep(lw,lw*2.,q.x))*(1.-step(.2,q.y)),(1.-smoothstep(lw,lw*2.,q.y))*(1.-step(.2,q.x)));
  float a=atan(gDir.y,gDir.x);
  float R=uR1+.45;
  float rl=(1.-smoothstep(lw,lw*2.2,abs(gD-R)))*step(.42,fract(a*90./6.2831853));
  float f=fract(a*24./6.2831853);float arc=min(f,1.-f)*6.2831853/24.*gD;
  float tk=(1.-smoothstep(lw,lw*2.2,arc))*step(R,gD)*step(gD,R+.32);
  float rl2=(1.-smoothstep(lw,lw*2.,abs(gD-uR0-.02)))*.6;
  float marks=max(max(cr*.5,rl*.55),max(tk*.6,rl2));
  diffuseColor.rgb*=1.-marks*.5*(1.-smoothstep(36.,80.,length(vW.xz-cameraPosition.xz)));
  float ao=1.-.42*(1.-smoothstep(1.6,2.7,gD))*smoothstep(1.45,1.62,gD);
  diffuseColor.rgb*=ao;
}`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{float amp=.0098*aaf;vec3 nW=normalize(vec3(-SG.x*amp,1.,-SG.y*amp));normal=normalize((viewMatrix*vec4(nW,0.)).xyz);}`);
  };
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(700, 700).rotateX(-Math.PI / 2), sandMat); sand.receiveShadow = true; scene.add(sand);

  /* ------------------------------------------------------------ stations */
  const ST = buildStations(scene, CAT, MAT, SOFT, LAY);
  const stations = ST.stations;
  const _up = new THREE.Vector3(0, 1, 0);
  const stLocal = (i, x, y, z, out = new THREE.Vector3()) => { const s = stations[i]; return out.set(x, y, z).applyAxisAngle(_up, s.rot).add(s.pos); };

  /* ------------------------------------------------------------ the instrument and what it holds */
  const arm = new Arm(scene, MAT);
  const PROD = {hh: .2, Hf: .4 / .5227}; /* the jar, about 6.3× life size so it reads from the plane */
  const sCv = document.createElement('canvas'); sCv.width = 450; sCv.height = 563;
  const sTex = new THREE.CanvasTexture(sCv); sTex.colorSpace = THREE.SRGBColorSpace; sTex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: sTex, transparent: true, toneMapped: false, fog: false, depthWrite: false}));
  sprite.scale.set(PROD.Hf * .8, PROD.Hf, 1); sprite.renderOrder = 4; scene.add(sprite);
  const held = {frame: 0, drawn: -1, vis: true, spin: true, off: new THREE.Vector3()};
  function drawSprite() {
    const k = ((Math.round(held.frame) % 48) + 48) % 48; const im = frameNear(LEAD, k);
    if (!im || (k === held.drawn && im === held.im)) return;
    const c = clipped(im), g = sCv.getContext('2d'); g.clearRect(0, 0, 450, 563); g.drawImage(c, 0, 0, 450, 563);
    held.drawn = k; held.im = im; sTex.needsUpdate = true;
  }
  const armRoot = () => stLocal(LEAD_CI, -2.05, 0, 1.5);
  const restP = new THREE.Vector3(), presentP = new THREE.Vector3();
  function placeArm() {
    arm.root.position.copy(armRoot()); arm.root.rotation.y = stations[LEAD_CI].rot + .5; arm.root.updateMatrixWorld(true);
    stLocal(LEAD_CI, -1.25, 2.55, 2.55, restP); stLocal(LEAD_CI, -1.05, 2.05, 3.55, presentP);
  }
  placeArm(); arm.e.copy(restP); arm.gw = arm.gwGoal = .206 + .002; arm.fl = PROD.hh * 1.25 / 1 * 1.0; arm.fingers(1);
  arm.faceYaw = () => { const r = _r.set(1, 0, 0).applyQuaternion(cam.quaternion); return Math.atan2(-r.z, r.x); };

  /* ------------------------------------------------------------ the paper sweep: rises around the station at the hinge */
  const sweepMat = new THREE.MeshBasicMaterial({vertexColors: true, toneMapped: false, fog: false, side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2});
  const sweep = (() => {
    /* the back half of a cyclorama (curved floor-to-wall), turned to face the camera every frame; it rises from the sand */
    const pr = [], Rw = 7.5, Rc = 2.6, Hh = 14; pr.push([Rw - Rc - 1.2, 0]);
    for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI / 2; pr.push([Rw - Rc + Rc * Math.sin(a), Rc - Rc * Math.cos(a)]); } pr.push([Rw, Hh * .5], [Rw, Hh]);
    const g = new THREE.LatheGeometry(pr.map(p => new THREE.Vector2(p[0], p[1])), 64, Math.PI * .2, Math.PI * 1.6);
    const p = g.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), r = Math.hypot(p.getX(i), p.getZ(i)); const v = .955 + .05 * sm(0, Rc * 1.4, y) - .012 * (1 - sm(0, Rw - Rc, r)); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, sweepMat); m.position.y = .012; m.renderOrder = 2; m.visible = false; scene.add(m); return m;
  })();

  /* ------------------------------------------------------------ camera */
  const TU = {d: {el: .5, dist: 49, fov: 32, tx: -1.3, tz: -3.2, sd: 12.6, sh: 4.2, sty: 1.25, stz: 2.6, sox: -.55}, p: {el: 1.02, dist: 47, fov: 40, tx: 0, tz: .2, sd: 11.6, sh: 5.4, sty: 1.1, stz: 3.2, sox: -.5}};
  const user = {px: 0, pz: 0, zoom: 1, yaw: 0, pitch: 0, tyaw: 0, tpitch: 0};
  const camS = {pos: new THREE.Vector3(0, 40, 60), tgt: new THREE.Vector3(), fov: 30}, travel = {on: false, k: 1};
  const _t0 = new THREE.Vector3(), _r = new THREE.Vector3(), _f = new THREE.Vector3(), _u = new THREE.Vector3(), _w = new THREE.Vector3(), _w2 = new THREE.Vector3(), _v = new THREE.Vector3();
  let want = {st: -1};
  const T = () => PH ? TU.p : TU.d;
  function overviewPose(o) { const t = T(), c = _t0.set(t.tx + user.px, 0, t.tz + user.pz), dist = t.dist * user.zoom; o.tgt.copy(c); o.pos.set(c.x, c.y + Math.sin(t.el) * dist, c.z + Math.cos(t.el) * dist); o.fov = t.fov; return o; }
  function stationPose(ci, o) { const t = T(), y = user.yaw, d = t.sd, lx = Math.sin(y) * d, lz = Math.cos(y) * d;
    stLocal(ci, lx + t.sox, t.sh + user.pitch * 2, lz, o.pos); stLocal(ci, t.sox, t.sty, t.stz, o.tgt); o.fov = PH ? 40 : 30;
    if (ci === LEAD_CI) { /* 08 frames the instrument and what it holds */ o.tgt.lerp(presentP, .62); o.pos.lerp(_w2.copy(presentP).add(_v.copy(o.pos).sub(presentP).multiplyScalar(.7)), .75); }
    return o; }
  const poseTmp = {pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 30};
  const poseFor = (o = poseTmp) => want.st < 0 ? overviewPose(o) : stationPose(want.st, o);
  function startTravel(dur) {
    const to = poseFor({pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 30});
    const d = camS.pos.distanceTo(to.pos);
    travel.on = true; travel.a = {pos: camS.pos.clone(), tgt: camS.tgt.clone(), fov: camS.fov}; travel.t0 = CLOCK.now();
    travel.d = RM ? 0 : (dur || clamp(1000 + d * 14, 1000, 1600)); travel.lift = Math.min(6, d * .12); travel.k = 0;
  }
  /* transition parameters, driven by main.js: push toward the held product, rise into the sky, haze to the tone, the sweep */
  const fx = {push: 0, rise: 0, haze: 0, sweep: 0, release: 0};
  let pushL = 0; /* how close the push ends; main.js sets it so the product lands at its lineup size */
  const par = {x: 0, y: 0, tx: 0, ty: 0};
  function camUpdate(now, dt) {
    const goal = poseFor();
    if (travel.on) { const k = travel.d > 0 ? clamp((now - travel.t0) / travel.d) : 1, e = E.move(k), et = E.move(clamp(k * 1.1)); travel.k = k;
      camS.pos.lerpVectors(travel.a.pos, goal.pos, e); camS.pos.y += Math.sin(e * Math.PI) * travel.lift;
      camS.tgt.lerpVectors(travel.a.tgt, goal.tgt, et); camS.fov = lerp(travel.a.fov, goal.fov, e); if (k >= 1) travel.on = false; }
    else { const a = 1 - Math.pow(.002, dt); camS.pos.lerp(goal.pos, a); camS.tgt.lerp(goal.tgt, a); camS.fov = lerp(camS.fov, goal.fov, a); }
    const P = _w.copy(camS.pos), G = _w2.copy(camS.tgt);
    /* push: toward the product, ending close enough that the sweep fills the frame behind it */
    if (fx.push > 0) { const hp = heldPoint(_v); const end = _f.copy(P).sub(hp).setLength(pushL > 0 ? pushL : PH ? 2.6 : 2.2).add(hp); end.y = lerp(end.y, hp.y + .25, .6); P.lerp(end, fx.push); G.lerp(hp, fx.push); }
    /* rise: up and back, into the sky */
    if (fx.rise > 0) { const back = _f.copy(P).sub(G).setY(0).normalize(); P.addScaledVector(_up, fx.rise * 26).addScaledVector(back, fx.rise * 10); G.y += fx.rise * 9; }
    cam.position.copy(P); cam.lookAt(G);
    const amp = RM ? 0 : 1, t = now / 1000, k2 = want.st < 0 ? .5 : .16;
    cam.position.addScaledVector(_r.set(1, 0, 0).applyQuaternion(cam.quaternion), (par.x * k2 + Math.sin(t * .07) * k2 * .6) * amp * (1 - fx.push)).addScaledVector(_u.set(0, 1, 0).applyQuaternion(cam.quaternion), (-par.y * k2 * .5 + Math.sin(t * .11) * k2 * .2) * amp * (1 - fx.push));
    cam.lookAt(G);
    if (Math.abs(cam.fov - camS.fov) > .01) { cam.fov = camS.fov; cam.updateProjectionMatrix(); }
  }
  /* where the held product's centre is: the grip point, less half its height, plus the release drift */
  function heldPoint(out) { out.copy(arm.e); out.y -= PROD.hh; out.add(held.off); return out; }

  /* ------------------------------------------------------------ the held product, projected: the rect a DOM actor takes over from */
  const _c = new THREE.Vector3(), _p = new THREE.Vector3();
  function heldRect() {
    cam.updateMatrixWorld(); heldPoint(_c);
    const vc = _c.applyMatrix4(cam.matrixWorldInverse), hw = sprite.scale.x / 2, hh = sprite.scale.y / 2;
    _p.set(vc.x - hw, vc.y + hh, vc.z).applyMatrix4(cam.projectionMatrix); const x0 = (_p.x + 1) / 2 * innerWidth, y0 = (1 - _p.y) / 2 * innerHeight;
    _p.set(vc.x + hw, vc.y - hh, vc.z).applyMatrix4(cam.projectionMatrix); const x1 = (_p.x + 1) / 2 * innerWidth, y1 = (1 - _p.y) / 2 * innerHeight;
    return {x: x0, y: y0, w: x1 - x0, h: y1 - y0, behind: vc.z > 0};
  }
  function scr(v) { _p.copy(v).project(cam); return [(_p.x + 1) / 2 * innerWidth, (1 - _p.y) / 2 * innerHeight, _p.z]; }

  /* ------------------------------------------------------------ labels placed in the scene (DOM, readable and focusable) */
  const stLabels = stations.map(s => {
    const a = document.createElement('a'); a.className = 'stl'; a.href = '#/atlas/' + s.co.c; a.dataset.st = s.i;
    a.setAttribute('aria-label', 'Station ' + s.co.c + ', ' + s.co.n + '. ' + s.co.d + '.');
    a.innerHTML = '<span class="c">' + s.co.c + '</span><span class="n">' + s.co.n + '</span>';
    a.addEventListener('focus', () => { hov.st = s.i; }); a.addEventListener('blur', () => { if (hov.st === s.i) hov.st = -1; });
    ui.labels.appendChild(a); return a; });
  const stH = stLabels.map(() => 0), stW = stLabels.map(() => 0);
  let labelsOn = 1;
  /* screen boxes of every station (plinth disc plus the sculpture over it), so labels can keep off them */
  const _bx = new THREE.Vector3();
  function stationBox(s) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const pts = [[1.62, 0, 0], [-1.62, 0, 0], [0, 0, 1.62], [0, 0, -1.62], [.7, s.H, 0], [-.7, s.H, 0]];
    for (const p of pts) { const q = scr(_bx.set(s.pos.x + p[0], p[1], s.pos.z + p[2])); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    return {x0, x1, y0, y1};
  }
  const hit = (a, b, m = 6) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.y0 < b.y1 + m && a.y1 > b.y0 - m;
  let heldW = 0, heldOn = null;
  function labelsUpdate() {
    const lead = PH ? 20 : 30, L = [];
    stations.forEach((s, i) => {
      const a = stLabels[i]; let vis = labelsOn > .5 && fx.push < .05 && fx.rise < .05 && fx.haze < .3;
      if (want.st === i) vis = false;
      _v.set(s.pos.x, s.H + .25, s.pos.z); const q = scr(_v);
      if (q[2] > 1 || q[0] < -120 || q[0] > innerWidth + 40 || q[1] < 70 || q[1] > innerHeight - 40) vis = false;
      if (want.st >= 0 && i !== want.st) { const c = scr(_w2.set(stations[want.st].pos.x, 1.6, stations[want.st].pos.z)); if (Math.abs(q[0] - c[0]) < innerWidth * .32 && Math.abs(q[1] - c[1]) < innerHeight * .45) vis = false; }
      if (!stH[i]) { stH[i] = a.offsetHeight; stW[i] = a.offsetWidth; }
      L.push({i, a, q, vis, box: vis ? stationBox(s) : null});
    });
    /* nearest first; each label takes the place along its own leader (a little higher, or nudged sideways while its
       leader still drops onto its own station) that overlaps least with the labels already placed and every other station */
    const placed = [], ov = (a, b) => Math.max(0, Math.min(a.x1, b.x1 + 4) - Math.max(a.x0, b.x0 - 4)) * Math.max(0, Math.min(a.y1, b.y1 + 4) - Math.max(a.y0, b.y0 - 4));
    L.filter(l => l.vis).sort((p, q) => q.q[1] - p.q[1]).forEach(l => {
      const w = stW[l.i], h = stH[l.i], x0 = clamp(l.q[0] - w / 2, 8, innerWidth - 8 - w), m = Math.max(0, w / 2 - 10);
      let best = null;
      for (const dy of [0, -14, -28, -42, -58]) for (const f of [0, -.5, .5, -1, 1]) {
        const dx = f * m, r = {x0: x0 + dx, x1: x0 + dx + w, y0: l.q[1] - h - lead + dy, y1: l.q[1] - lead + dy};
        let c = -dy * 1.2 + Math.abs(dx) * .6;
        placed.forEach(p => { c += ov(r, p) * 3; });
        L.forEach(o => { if (o.vis && o.i !== l.i) c += ov(r, o.box); });
        if (!best || c < best.c) best = {c, dx, dy, r};
      }
      l.dx = best.dx; l.dy = best.dy; placed.push(best.r);
    });
    L.forEach(l => {
      const a = l.a, w = stW[l.i], h = stH[l.i], dy = l.dy || 0, dx = l.dx || 0;
      a.style.transform = 'translate(' + Math.round(clamp(l.q[0] - w / 2, 8, innerWidth - 8 - w) + dx) + 'px,' + Math.round(l.q[1] - h - lead + dy) + 'px)';
      a.style.setProperty('--ll', (14 - dy) + 'px'); a.style.setProperty('--lx', Math.round(-dx) + 'px');
      a.classList.toggle('on', l.vis); a.classList.toggle('far', want.st >= 0); a.tabIndex = l.vis ? 0 : -1;
      a.classList.toggle('hov', hov.st === l.i);
    });
    /* the line beside the held product: on the side away from the cairn, pointing at the jar */
    if (ui.held) {
      const r = heldRect(), on = want.st === LEAD_CI && !travel.on && fx.push < .02 && fx.haze < .1 && held.vis;
      if (!heldW || on !== heldOn) { heldW = ui.held.offsetWidth; heldOn = on; } /* measured when it appears: fonts may have loaded since */
      const b = Stage0(r);
      /* beside the jar on the side away from the cairn; where that side is too tight (phone), just under it, without the rule */
      const below = b.x - 10 - heldW < 8; ui.held.classList.toggle('below', below);
      ui.held.style.transform = below ? `translate(${Math.round(clamp(b.x + b.w / 2 - heldW / 2, 8, innerWidth - 8 - heldW))}px,${Math.round(b.y + b.h + 30)}px)` : `translate(${Math.round(b.x - 10 - heldW)}px,${Math.round(b.y + b.h * .5)}px)`;
      ui.held.classList.toggle('on', on); ui.held.tabIndex = on ? 0 : -1;
      if (ui.heldHit) { Object.assign(ui.heldHit.style, {transform: `translate(${b.x}px,${b.y}px)`, width: b.w + 'px', height: b.h + 'px'}); ui.heldHit.hidden = !(want.st === LEAD_CI && held.vis); }
    }
  }
  /* the jar inside its frame (alpha bbox of the render) */
  const Stage0 = r => ({x: r.x + r.w * .2189, y: r.y + r.h * .232, w: r.w * (.7811 - .2189), h: r.h * (.7547 - .232)});

  /* ------------------------------------------------------------ input: drag to look, click or hold to travel */
  const HOLD = PH ? 560 : 640;
  const ptr = {down: false, id: -1, x: 0, y: 0, sx: 0, sy: 0, drag: false, hit: null, hold: 0, vx: 0, vy: 0}, hov = {st: -1}, pts2 = new Map();
  let pinch = 0, onTravel = () => {}, onHeld = () => {};
  const ray = new THREE.Raycaster();
  function pick(cx, cy) { ray.setFromCamera({x: cx / innerWidth * 2 - 1, y: -(cy / innerHeight * 2 - 1)}, cam); const h = ray.intersectObjects(stations.map(s => s.proxy), false)[0]; return h ? h.object.userData.st : -1; }
  const ring = ui.ring, ringFg = ui.ringFg;
  const placeRing = (x, y) => { ring.style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
  function cancelHold() { if (ptr.hold) { ptr.hold = 0; ring.classList.remove('on'); } }
  host.addEventListener('pointerdown', e => {
    if (e.button > 0 || !W.interactive) return; pts2.set(e.pointerId, [e.clientX, e.clientY]); if (pts2.size === 2) { const a = [...pts2.values()]; pinch = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); cancelHold(); return; }
    ptr.down = true; ptr.id = e.pointerId; ptr.sx = ptr.x = e.clientX; ptr.sy = ptr.y = e.clientY; ptr.drag = false; ptr.vx = ptr.vy = 0;
    try { host.setPointerCapture(e.pointerId); } catch (x) {}
    const st = pick(e.clientX, e.clientY); ptr.hit = st;
    if (st >= 0 && st !== want.st) { ptr.hold = CLOCK.now(); placeRing(e.clientX, e.clientY); ring.classList.add('on'); ringFg.style.strokeDashoffset = 188.5; }
    host.classList.add('drag');
  });
  host.addEventListener('pointermove', e => {
    if (pts2.has(e.pointerId)) pts2.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts2.size === 2 && pinch) { const a = [...pts2.values()], d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); if (want.st < 0) user.zoom = clamp(user.zoom * pinch / d, .6, 1.3); pinch = d; return; }
    par.tx = (e.clientX / innerWidth - .5) * 2; par.ty = (e.clientY / innerHeight - .5) * 2;
    if (!ptr.down) { const st = W.interactive ? pick(e.clientX, e.clientY) : -1; hov.st = st; host.classList.toggle('over', st >= 0 && st !== want.st); return; }
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr.x = e.clientX; ptr.y = e.clientY;
    if (!ptr.drag && Math.hypot(ptr.x - ptr.sx, ptr.y - ptr.sy) > 7) { ptr.drag = true; cancelHold(); }
    if (ptr.drag) dragBy(dx, dy);
    if (ptr.hold) placeRing(e.clientX, e.clientY);
  });
  function dragBy(dx, dy) {
    if (want.st < 0) { const k = (PH ? .075 : .05) * user.zoom, fwd = _f.set(0, 0, -1).applyQuaternion(cam.quaternion); fwd.y = 0; fwd.normalize(); const rt = _r.set(1, 0, 0).applyQuaternion(cam.quaternion); rt.y = 0; rt.normalize();
      user.px = clamp(user.px - (rt.x * dx - fwd.x * dy) * k, -17, 17); user.pz = clamp(user.pz - (rt.z * dx - fwd.z * dy) * k, -15, 13); ptr.vx = dx; ptr.vy = dy; }
    else { user.tyaw = clamp(user.tyaw - dx * .004, -.6, .6); user.tpitch = clamp(user.tpitch + dy * .003, -.3, .5); }
  }
  function endPtr(e) {
    pts2.delete(e.pointerId); if (pts2.size < 2) pinch = 0; if (!ptr.down || e.pointerId !== ptr.id) return; ptr.down = false; host.classList.remove('drag');
    const st = ptr.hit; cancelHold();
    if (!ptr.drag && st >= 0 && st !== want.st) onTravel(st);
  }
  host.addEventListener('pointerup', endPtr); host.addEventListener('pointercancel', endPtr);
  host.addEventListener('pointerleave', () => { par.tx = par.ty = 0; });
  host.addEventListener('wheel', e => { if (!W.interactive) return; e.preventDefault(); if (want.st < 0) user.zoom = clamp(user.zoom * Math.exp(e.deltaY * .0012), .6, 1.3); }, {passive: false});
  function holdUpdate(now) { if (!ptr.hold) return; const k = clamp((now - ptr.hold) / HOLD); ringFg.style.strokeDashoffset = (188.5 * (1 - k)).toFixed(1); if (k >= 1) { const st = ptr.hit; ptr.hold = 0; ptr.down = false; setTimeout(() => ring.classList.remove('on'), 160); if (st >= 0) onTravel(st); } }
  addEventListener('keydown', e => {
    if (!W.interactive || !W.visible) return; const t = document.activeElement; if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    if (!/^Arrow/.test(e.key) || (t && t.closest && t.closest('#bar,#drawer,#menu'))) return;
    e.preventDefault(); dragBy(e.key === 'ArrowLeft' ? 40 : e.key === 'ArrowRight' ? -40 : 0, e.key === 'ArrowUp' ? 40 : e.key === 'ArrowDown' ? -40 : 0);
  });

  /* ------------------------------------------------------------ resize, loop */
  function fit() { const ph = isPh(); if (ph !== PH) { PH = ph; LAY = PH ? LAYOUT.phone : LAYOUT.desk; ST.relayout(LAY); sandU.uSt.value = LAY.map(p => new THREE.Vector2(p[0], p[1])); placeArm(); arm.e.copy(want.st === LEAD_CI ? presentP : restP); snap(); stH.fill(0); }
    setDpr(); renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
  addEventListener('resize', fit); fit();
  function fogGoal() { const t = T(); return want.st < 0 ? [t.dist * user.zoom * .62, t.dist * user.zoom * 2.3] : [9, 44]; }
  const fogS = {n: 38, f: 150};
  function snap() { travel.on = false; const p = poseFor(); camS.pos.copy(p.pos); camS.tgt.copy(p.tgt); camS.fov = p.fov; const G = fogGoal(); fogS.n = G[0]; fogS.f = G[1]; arm.instant = true; arm.clear(); arm.e.copy(want.st === LEAD_CI ? presentP : restP); arm.update(CLOCK.now(), .016); arm.instant = false; }
  let lastR = 0;
  function frame(now, dt) {
    par.x = lerp(par.x, par.tx, .04); par.y = lerp(par.y, par.ty, .04);
    user.yaw = lerp(user.yaw, user.tyaw, .08); user.pitch = lerp(user.pitch, user.tpitch, .08);
    if (!ptr.down && want.st < 0 && (Math.abs(ptr.vx) > .1 || Math.abs(ptr.vy) > .1)) { dragBy(ptr.vx * .9, ptr.vy * .9); ptr.vx *= .9; ptr.vy *= .9; if (Math.abs(ptr.vx) < .2) ptr.vx = 0; if (Math.abs(ptr.vy) < .2) ptr.vy = 0; }
    holdUpdate(now);
    /* the instrument: rest over the stones, or present at 08; the held product turns slowly */
    arm.update(now, dt);
    arm.gwGoal = .208 + fx.release * .035;
    if (held.spin && !RM && fx.release < .01 && !travel.on) held.frame = (held.frame + dt * 5) % 48;
    held.off.set(0, 0, 0);
    heldPoint(sprite.position);
    /* the sprite is unfogged (so it stays crisp in the arm), but while the haze is up it must clear with its own
       distance, like everything else, or it shows as a lone speck before the plane resolves */
    { const fd = cam.position.distanceTo(sprite.position), ff = clamp((fd - scene.fog.near) / Math.max(.01, scene.fog.far - scene.fog.near), 0, 1);
      sprite.material.opacity = Math.pow(1 - fx.haze, 3) * (1 - ff * Math.min(1, fx.haze * 12)); } sprite.visible = held.vis && fx.haze < .995; if (sprite.visible) drawSprite();
    camUpdate(now, dt);
    /* colour: the tone is the sky, the fog and the sweep */
    BG.setRGB(Tone.rgb[0] / 255, Tone.rgb[1] / 255, Tone.rgb[2] / 255, THREE.SRGBColorSpace);
    /* three mixes fog after tone mapping and the sRGB conversion (and uploads its colour in that space), so a fully
       hazed mesh is exactly the tone: --bg */
    scene.fog.color.copy(BG); skyU.uH.value.copy(BG); skyU.uZ.value.copy(BG).lerp(WHITE, .45 * (1 - fx.haze));
    sweepMat.color.copy(BG); sweep.visible = fx.sweep > .001; sweep.scale.set(1, Math.max(.001, fx.sweep), 1); sweepMat.opacity = sm(0, .45, fx.sweep) * (1 - sm(13, 22, cam.position.distanceTo(presentP))); /* only close in: from high above it would read as a bowl */
    sweep.position.set(presentP.x, .012, presentP.z); sweep.rotation.y = Math.atan2(cam.position.x - presentP.x, cam.position.z - presentP.z);
    { const G = fogGoal(), a = 1 - Math.pow(travel.on ? .08 : .2, dt); fogS.n = lerp(fogS.n, G[0], a); fogS.f = lerp(fogS.f, G[1], a);
      /* haze: every mesh takes the tone in proportion to its distance, the far ones first; at 1 all of it is --bg */
      const h = fx.haze, d0 = Math.min(8, cam.position.distanceTo(heldPoint(_v)));
      scene.fog.near = lerp(fogS.n, 0, h); scene.fog.far = h > 1e-3 ? Math.max(scene.fog.near + .3, Math.min(fogS.f, d0 / h)) : fogS.f; }
    const fxp = camS.tgt; sun.target.position.set(fxp.x, 0, fxp.z); sun.position.copy(sun.target.position).addScaledVector(SUNDIR, 50); setShadow(lerp(shHalf, want.st < 0 ? 27 : 10, .06));
    sky.position.copy(cam.position);
    stations.forEach(s => s.tags.forEach(t => { t.getWorldPosition(_w2); const d = _w2.distanceTo(cam.position); t.material.opacity = .8 * sm(7, 12, d) * (want.st < 0 || want.st === s.i ? 1 : 0) * (1 - fx.haze); }));
    labelsUpdate();
    /* SwiftShader cannot hold 60 fps; render less often there, but keep every computation per frame */
    if (SOFT && now - lastR < 80 && W.force !== true) return;
    /* nothing moves while the clock is held (test hook): do not redraw an identical frame */
    if (now === lastR && W.force !== true) return;
    lastR = now; W.force = false;
    renderer.render(scene, cam);
  }

  const W = {
    ok: true, SOFT, canvas, visible: true, interactive: true, fx, held, LEAD, arm,
    get route() { return want; },
    /* go to the overview (st = -1) or a station */
    go(st, o = {}) {
      const was = want.st; want = {st};
      if (st >= 0 && st !== was) { user.tyaw = user.tpitch = 0; user.yaw = user.pitch = 0; }
      if (st < 0 && was >= 0) { user.px = user.pz = 0; user.zoom = 1; }
      /* the instrument lifts the product toward whoever comes to 08 */
      arm.clear();
      if (st === LEAD_CI) arm.push({to: presentP.clone(), d: o.instant ? 0 : 1.1, lift: .12}); else arm.push({to: restP.clone(), d: o.instant ? 0 : 1.0, lift: .08});
      if (o.instant) snap(); else startTravel(o.dur);
    },
    snap, heldRect, presentRect: heldRect,
    /* the held product's rect as it will be once the camera and the arm reach where they are going */
    heldRectGoal() {
      const P = poseFor(), sp = cam.position.clone(), sq = cam.quaternion.clone(), sf = cam.fov, se = arm.e.clone();
      cam.position.copy(P.pos); cam.lookAt(P.tgt); cam.fov = P.fov; cam.updateProjectionMatrix(); arm.e.copy(want.st === LEAD_CI ? presentP : restP);
      const r = heldRect();
      arm.e.copy(se); cam.position.copy(sp); cam.quaternion.copy(sq); cam.fov = sf; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      return r;
    },
    set pushL(v) { pushL = v; }, heldDist: () => { const P = poseFor(); return P.pos.distanceTo(heldPoint(_c)); },
    setVisible(v) { this.visible = v; canvas.style.visibility = v ? '' : 'hidden'; if (v) W.force = true; },
    set onTravel(f) { onTravel = f; }, set onHeld(f) { onHeld = f; },
    frame, fit,
    travelling: () => travel.on,
    state: () => ({st: want.st, travel: travel.on, k: +travel.k.toFixed(2), fx: Object.fromEntries(Object.entries(fx).map(([k, v]) => [k, +v.toFixed(3)])), held: held.vis, frame: Math.round(held.frame), SOFT}),
    dbg: Q.has('dbg') ? {scene, cam, renderer, arm, stations, sprite, sweep, THREE} : null
  };
  /* warm the shaders behind the gate, so the reveal never stalls */
  W.warm = () => (renderer.compileAsync ? renderer.compileAsync(scene, cam) : Promise.resolve()).catch(() => {});
  snap();
  return W;
}

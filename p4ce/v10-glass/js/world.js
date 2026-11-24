/* PR6 v10 · "Glass" · the live Atlas and the glass slab.
   The world is v8's misty Atlas made calmer: a blue-grey plane in fog, nine low clay still lifes on one gentle curve
   (a plinth, a debossed disc, the collection's lead pack, a few matte clay pills), and a slow camera.
   The slab is the one glass object: a thick rounded box (RoundedBoxGeometry, radius = half its depth, so every edge is
   a full bevel) in MeshPhysicalMaterial with real transmission. three renders the opaque world into a mip-mapped target
   and the slab samples it through its thickness, so the stations behind it are refracted and blurred by its roughness.
   The slab hangs in camera space at a fixed distance D, sized from a screen rectangle (the DOM panel's), so the DOM
   content set over it lines up exactly; CSS uses the same focal length as its perspective, so when the slab tilts toward
   the pointer the DOM tilts with it. */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {CAT} from './catalog.js';
import {Renders} from './renders.js';
import {Q, clamp, lerp, E} from './util.js';

const D = 6;                 /* the slab's front face sits this far in front of the camera */
const T = .2, BEV = .095;    /* its thickness and bevel radius (world units) */

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function createWorld(canvas) {
  let renderer;
  try {
    const gl = canvas.getContext('webgl2', {antialias: true, powerPreference: 'high-performance'});
    if (!gl) return null;
    renderer = new THREE.WebGLRenderer({canvas, context: gl, antialias: true});
  } catch (e) { return null; }
  const SOFT = (() => { try { const g = renderer.getContext(), x = g.getExtension('WEBGL_debug_renderer_info'); return !!x && /swiftshader|llvmpipe|software/i.test(g.getParameter(x.UNMASKED_RENDERER_WEBGL)); } catch (e) { return false; } })();
  const DPR = () => Q.has('dpr') ? +Q.get('dpr') : SOFT ? .6 : Math.min(devicePixelRatio || 1, 1.5);
  const FPS = Q.has('fps') ? +Q.get('fps') : SOFT ? 15 : 60;
  renderer.setPixelRatio(DPR());
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const isPh = () => innerWidth <= 760;

  /* ---------------------------------------------------------------- the room: mist into steel-blue grey */
  const FOG = new THREE.Color('#bcc7cd');
  const scene = new THREE.Scene(); scene.background = FOG.clone(); scene.fog = new THREE.Fog(FOG.clone(), 14, 52);
  const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, .1, 200); scene.add(cam);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .45;
  scene.add(new THREE.HemisphereLight(0xeef3f6, 0x8f9da7, 1.05));
  const key = new THREE.DirectionalLight(0xf5f8fa, 1.25); key.position.set(-8, 16, 10); key.castShadow = true;
  key.shadow.mapSize.set(SOFT ? 1024 : 2048, SOFT ? 1024 : 2048); key.shadow.radius = 7; key.shadow.bias = -.0005; key.shadow.normalBias = .03;
  Object.assign(key.shadow.camera, {left: -20, right: 20, top: 14, bottom: -14, near: 1, far: 60}); key.shadow.camera.updateProjectionMatrix();
  scene.add(key);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({color: 0xb7c3c9, roughness: .95}));
  ground.receiveShadow = true; scene.add(ground);

  /* ---------------------------------------------------------------- the nine still lifes */
  const clay = new THREE.MeshStandardMaterial({color: 0xf0f2f2, roughness: .84});
  const plinthM = new THREE.MeshStandardMaterial({color: 0xc8d2d7, roughness: .7});
  const discM = new THREE.MeshStandardMaterial({color: 0xa9b7c0, roughness: .8});
  const lipM = new THREE.MeshStandardMaterial({color: 0xd6dee2, roughness: .6});
  const hitM = new THREE.MeshBasicMaterial({visible: false});
  const KIND = ['cyl', 'box', 'cyl', 'cyl', 'box', 'cyl', 'box', 'cyl', 'cyl'];
  const HGT = [.5, .78, .34, .62, .44, .9, .38, .66, .5];
  const RAD = [1.05, .95, 1.15, 1, 1.1, .92, 1.08, 1, 1.12];
  const r = rng(61), cap = new THREE.CapsuleGeometry(.2, .5, 6, 18), ball = new THREE.SphereGeometry(.24, 28, 18);
  const texL = new THREE.TextureLoader();
  const stations = CAT.map((co, i) => {
    const g = new THREE.Group(), lift = new THREE.Group(), h = HGT[i], R = RAD[i];
    const x = (i - 4) * 2.75, z = .2 * (i - 4) * (i - 4) - 1.4 + (r() - .5) * .8;
    g.position.set(x, 0, z); g.rotation.y = -(i - 4) * .07;
    const pl = new THREE.Mesh(KIND[i] === 'cyl' ? new THREE.CylinderGeometry(R, R * 1.02, h, 64) : new RoundedBoxGeometry(R * 1.9, h, R * 1.9, 4, .06), plinthM);
    pl.position.y = h / 2; g.add(pl);
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(R * .76, R * .76, .012, 64), lipM); lip.position.y = h + .002; g.add(lip);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(R * .72, R * .72, .012, 64), discM); disc.position.y = h + .004; g.add(disc);
    /* the lead pack: its transparent render on a card standing on the disc (alpha-tested, so it shows through the glass) */
    const ph = 1.5, card = new THREE.Mesh(new THREE.PlaneGeometry(ph * .8, ph), new THREE.MeshBasicMaterial({transparent: false, alphaTest: .5, toneMapped: false, color: 0xffffff, opacity: 1}));
    card.position.set(0, h + ph * .5 - ph * .085, .05); card.visible = false; lift.add(card);
    /* the kit's matte clay pills and spheres, never the same twice */
    const n = 1 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const pill = r() < .6, m = new THREE.Mesh(pill ? cap : ball, clay), a = r() * Math.PI * 2, d = R + .35 + r() * .9, s = .8 + r() * .7;
      m.scale.setScalar(s); m.position.set(Math.cos(a) * d, (pill ? .2 : .24) * s, Math.sin(a) * d * .7 + .4);
      if (pill) { m.rotation.set(0, r() * 3, Math.PI / 2); }
      g.add(m);
    }
    if (i % 3 === 1) { const m = new THREE.Mesh(ball, clay); m.scale.setScalar(.7); m.position.set(R * .45, h + .17, .25); lift.add(m); }
    g.add(lift);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.2, R * 1.2, h + 1.8, 12), hitM); hit.position.y = (h + 1.8) / 2; hit.userData.st = i; g.add(hit);
    g.traverse(m => { if (m.isMesh && m !== hit && m !== card) { m.castShadow = true; m.receiveShadow = true; } });
    scene.add(g);
    return {i, co, g, lift, card, hit, top: h, pos: new THREE.Vector3(x, 0, z), up: 0};
  });
  /* far clay forms in the mist, so the plane reads as a room and not a void */
  for (let k = 0; k < 26; k++) {
    const a = (r() - .5) * 2.4, d = 14 + r() * 26, m = new THREE.Mesh(r() < .5 ? cap : ball, clay), s = 2 + r() * 4;
    m.scale.setScalar(s); m.position.set(Math.sin(a) * d, (m.geometry === cap ? .2 : .24) * s, -Math.cos(a) * d - 4);
    if (m.geometry === cap) m.rotation.set(0, r() * 3, Math.PI / 2);
    m.castShadow = m.receiveShadow = true; scene.add(m);
  }
  Renders.ready.then(() => stations.forEach(s => {
    const p = s.co.it[0], src = Renders.frames(p)[0] || Renders.hero(p); if (!src) return;
    texL.load(src, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; s.card.material.map = t; s.card.material.needsUpdate = true; s.card.visible = true; W.force = true; });
  }));

  /* ---------------------------------------------------------------- the glass slab, in camera space */
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xf3f7f9, metalness: 0, roughness: +(Q.get('rough') || .24), ior: 1.5, transmission: 1, thickness: .6,
    attenuationColor: new THREE.Color('#d9e4e9'), attenuationDistance: 1.6, specularIntensity: 1, clearcoat: .4, clearcoatRoughness: .25,
    envMapIntensity: 1.1
  });
  /* the slab is always in front: no depth test, drawn last, so a plinth or the ground nearer than D never cuts into it
     (anything nearer is simply seen through it) */
  glass.depthTest = false; glass.depthWrite = false;
  const slabG = new THREE.Group(), slab = new THREE.Mesh(new RoundedBoxGeometry(1, 1, T, 6, BEV), glass);
  slab.renderOrder = 10;
  slabG.add(slab); cam.add(slabG); slabG.visible = false;
  let built = {w: 1, h: 1};
  const S = {
    on: false, rise: 0, rect: null, cur: null, from: null, t0: 0, dur: 900,
    tx: 0, ty: 0, rx: 0, ry: 0, k: 0
  };
  const pxk = () => 2 * D * Math.tan(cam.fov * Math.PI / 360) / innerHeight;   /* world units per CSS px at the slab */
  function build(rc) {
    const k = pxk(), w = rc.w * k, h = rc.h * k;
    if (Math.abs(w - built.w) < 1e-3 && Math.abs(h - built.h) < 1e-3) return;
    slab.geometry.dispose(); slab.geometry = new RoundedBoxGeometry(w, h, T, SOFT ? 4 : 7, BEV); built = {w, h};
  }
  function placeSlab(now) {
    if (!S.rect) return;
    if (S.from) { const k = clamp((now - S.t0) / S.dur), e = E.move(k); S.cur = lerpRect(S.from, S.rect, e); if (k >= 1) S.from = null; }
    else { S.cur = S.rect; if (!travel.on) build(S.rect); }   /* true bevels once the lens has settled */
    const k = pxk(), c = S.cur;
    slab.scale.set(c.w * k / built.w, c.h * k / built.h, 1);
    const drop = (1 - E.out4(S.rise)) * innerHeight * .75;
    slabG.position.set((c.x + c.w / 2 - innerWidth / 2) * k, -(c.y + c.h / 2 + drop - innerHeight / 2) * k, -D - T / 2);
    slabG.rotation.set(S.rx + (1 - S.rise) * .35, S.ry, 0);
    S.drop = drop;
  }
  const lerpRect = (a, b, t) => ({x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t)});

  /* ---------------------------------------------------------------- the camera: three calm poses, slow glides between them */
  const C = {pos: new THREE.Vector3(0, 7, 20), tgt: new THREE.Vector3(0, .6, 0), fov: 30};
  const travel = {on: false, t0: 0, dur: 2400, a: {pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 30}};
  let mode = {k: 'home', st: -1};
  const G = {pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 30};
  const _v = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3();
  function goal(o) {
    const ph = isPh(), asp = innerWidth / innerHeight;
    if (mode.k === 'home') {
      if (ph) { o.fov = 44; o.pos.set(13.5, 5.2, 9); o.tgt.set(-3.5, -1.7, -1.2); }
      else { o.fov = 30; o.pos.set(0, 9.6, 28); o.tgt.set(0, -1.2, 0); }
      return o;
    }
    const s = stations[mode.st], P = s.pos, top = s.top + .7;
    o.fov = ph ? 40 : 30;
    const dist = mode.k === 'p' ? (ph ? 7.6 : 6.6) : (ph ? 8.4 : 7.6), el = mode.k === 'p' ? .2 : .26;
    o.pos.set(P.x - Math.sin(s.g.rotation.y) * dist * Math.cos(el), top + dist * Math.sin(el), P.z + Math.cos(s.g.rotation.y) * dist * Math.cos(el));
    o.tgt.set(P.x, top, P.z);
    const th = Math.tan(o.fov * Math.PI / 360);
    if (mode.k === 'c') {
      /* desktop: the slab stands on the right, so the station sits left of centre; phone: the slab is low, the station high */
      if (ph) o.tgt.y -= .5 * dist * th;
      else { _r.set(Math.cos(s.g.rotation.y), 0, Math.sin(s.g.rotation.y)); o.tgt.addScaledVector(_r, .42 * dist * th * asp); }
    } else if (ph) o.tgt.y -= .2 * dist * th;
    return o;
  }
  function travelTo(dur) {
    travel.a.pos.copy(C.pos); travel.a.tgt.copy(C.tgt); travel.a.fov = C.fov;
    travel.on = true; travel.t0 = performance.now(); travel.dur = Q.has('rm') ? 1 : dur;
  }
  const par = {x: 0, y: 0, tx: 0, ty: 0};
  function camUpdate(now) {
    goal(G);
    if (travel.on) {
      const k = clamp((now - travel.t0) / travel.dur), e = E.move(k);
      C.pos.lerpVectors(travel.a.pos, G.pos, e); C.pos.y += Math.sin(k * Math.PI) * (mode.k === 'home' ? 0 : .9);
      C.tgt.lerpVectors(travel.a.tgt, G.tgt, E.move(clamp(k * 1.08))); C.fov = lerp(travel.a.fov, G.fov, e);
      if (k >= 1) travel.on = false;
    } else { C.pos.copy(G.pos); C.tgt.copy(G.tgt); C.fov = G.fov; }
    cam.position.copy(C.pos); cam.lookAt(C.tgt);
    /* slow breathing drift, plus a little parallax from the pointer (less behind the slab) */
    const t = now / 1000, amp = mode.k === 'home' ? 1 : .35;
    cam.position.addScaledVector(_r.set(1, 0, 0).applyQuaternion(cam.quaternion), (Math.sin(t * .07) * .9 + par.x * .5) * amp)
      .addScaledVector(_u.set(0, 1, 0).applyQuaternion(cam.quaternion), (Math.sin(t * .11) * .25 - par.y * .25) * amp);
    cam.lookAt(C.tgt);
    cam.fov = C.fov; cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
  }

  /* ---------------------------------------------------------------- picking */
  const ray = new THREE.Raycaster(), hits = stations.map(s => s.hit);
  let hov = -1;
  function pick(x, y) { cam.updateMatrixWorld(); ray.setFromCamera({x: x / innerWidth * 2 - 1, y: -(y / innerHeight) * 2 + 1}, cam); const h = ray.intersectObjects(hits, false)[0]; return h ? h.object.userData.st : -1; }

  /* ---------------------------------------------------------------- loop */
  let lastR = 0, perf = [], afterRender = 0, lastNow = 0;
  function fit() { renderer.setPixelRatio(DPR()); renderer.setSize(innerWidth, innerHeight, false); if (S.rect) build(S.rect); W.force = true; }
  addEventListener('resize', fit);
  function frame(now) {
    const dt = Math.min(.1, lastNow ? (now - lastNow) / 1000 : 1 / 60); lastNow = now;
    if (afterRender) { perf.push(now - afterRender); if (perf.length > 40) perf.shift(); afterRender = 0; }
    const b = 1 - Math.pow(.05, dt);
    par.x = lerp(par.x, par.tx, b); par.y = lerp(par.y, par.ty, b);
    stations.forEach(s => { s.up = lerp(s.up, s.i === hov && mode.k === 'home' ? 1 : 0, b * 2); s.lift.position.y = s.up * .14; });
    camUpdate(now);
    /* the slab: rises from below, morphs between rectangles, tilts toward the pointer */
    S.rise = clamp(S.rise + (S.on ? 1 : -1.6) * dt / (Q.has('rm') ? .01 : 1.1), 0, 1);
    const tilt = S.on && S.rise > .98 ? 1 : 0;
    const a = 1 - Math.pow(.015, dt);
    S.rx = lerp(S.rx, -par.y * .075 * tilt, a); S.ry = lerp(S.ry, par.x * .1 * tilt, a);
    slabG.visible = S.rise > 0.001 && !!S.rect;
    placeSlab(now);
    W.onFrame && W.onFrame(S);
    if (now - lastR < 1000 / FPS - 2 && !W.force) return;
    lastR = now; W.force = false;
    renderer.render(scene, cam);
    afterRender = now;
  }

  const W = {
    SOFT, canvas, force: true,
    get radius() { return BEV / pxk(); },   /* the slab's corner radius in CSS px, for the DOM panel */
    get focal() { return innerHeight / 2 / Math.tan(cam.fov * Math.PI / 360); },
    slabState: S,
    home() { if (mode.k !== 'home') { mode = {k: 'home', st: -1}; travelTo(2600); } S.on = false; },
    station(i, k, rect) {
      const was = mode.k + mode.st; mode = {k, st: i};
      if (was !== k + i) travelTo(was.startsWith('home') ? 2800 : 2000);
      W.slab(rect);
    },
    slab(rect) {
      if (!rect) { S.on = false; return; }
      /* tilt only once risen; a rectangle change while up morphs, otherwise it rises fresh */
      if (S.on && S.rise > .5 && S.cur) { S.from = {...S.cur}; S.t0 = performance.now(); }
      else S.from = null;
      S.rect = rect; S.on = true; build(rect);
    },
    pointer(nx, ny) { par.tx = nx; par.ty = ny; },
    pick, hover(i) { hov = i; },
    frame, fit,
    perf: () => perf.length < 20 ? 0 : perf.reduce((a, b) => a + b, 0) / perf.length,
    state: () => ({mode: mode.k, st: mode.st, travel: travel.on, rise: +S.rise.toFixed(2), SOFT, fps: FPS, dpr: DPR(), ms: +W.perf().toFixed(1)}),
    dispose() { removeEventListener('resize', fit); renderer.dispose(); renderer.forceContextLoss(); }
  };
  fit(); goal(G); C.pos.copy(G.pos).add(_v.set(0, 3, 4)); C.tgt.copy(G.tgt); C.fov = G.fov; travelTo(3200);
  return W;
}

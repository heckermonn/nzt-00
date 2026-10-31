/* PR6 v8 · "Stations": the Atlas is the front (from v7's re-lit misty Atlas, adapted from v5/js/atlas/world.js).
   The nine stations are standing frosted-glass panels on one concave arc (stations.js). The camera has four framings:
     home, phone    one station centred and big, its neighbours turning in at the edges; swipe to glide between them
     home, desktop  the whole arc from the plaza in front of it; drag to look around, hover a panel to raise it
     enter          the camera glides up to a panel until it fills the collection slab's rectangle (the app then
                    morphs the panel into the DOM slab, so the panel and the slab read as one object)
     product        a little further back from the same panel, which stays visible, blurred, behind the slab
   Every framing is a pose (position, target, a lens shift and a field of view); moves between them are eased glides of
   1.2 to 1.6 s that start from wherever the camera is (so they can be interrupted), and the phone's swipe runs on a
   spring. The lens shift (an off-axis projection, like a shift lens) puts a panel exactly where the page needs it. */
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {makeGfx} from './gfx.js';
import {buildStations, scatter, LAYOUT, PANEL, PCY, arcAt} from './stations.js';
import {CAT} from '../catalog.js';
import {CLOCK, RM, clamp, lerp, E, Q, Spring} from '../util.js';

export function createWorld(host, labelsHost) {
  const canvas = document.createElement('canvas'); canvas.id = 'gl'; canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'}); if (!renderer.getContext()) throw new Error('no gl'); } catch (e) { return null; }
  host.appendChild(canvas);
  const SOFT = (() => { try { const g = renderer.getContext(), e = g.getExtension('WEBGL_debug_renderer_info'); return !!e && /swiftshader|llvmpipe|software/i.test(g.getParameter(e.UNMASKED_RENDERER_WEBGL)); } catch (x) { return false; } })();
  const isPh = () => innerWidth <= 760;
  let PH = isPh();
  /* the world is the front now: full resolution on a real GPU (the panels' type must be crisp on a phone) */
  const setDpr = () => renderer.setPixelRatio(SOFT ? .75 : Math.min(devicePixelRatio || 1, 2));
  setDpr();
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = .92;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const {MAT, MAXA} = makeGfx(renderer, SOFT);

  /* the palette: mist into steel-blue grey (#AEB9C0 to #CAD5DA), overcast */
  const HORIZON = new THREE.Color('#b9c4ca'), ZENITH = new THREE.Color('#a2afb8'), FOG = new THREE.Color('#b9c4ca');
  const scene = new THREE.Scene(); scene.background = FOG.clone(); scene.fog = new THREE.Fog(FOG.clone(), 30, 120);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 600); scene.add(cam);
  const skyU = {uH: {value: HORIZON.clone()}, uZ: {value: ZENITH.clone()}};
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), new THREE.ShaderMaterial({side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 uH;uniform vec3 uZ;varying vec3 vP;void main(){float k=smoothstep(-.02,.5,vP.y);gl_FragColor=linearToOutputTexel(vec4(mix(uH,uZ,k),1.));}'}));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .38;
  scene.add(new THREE.HemisphereLight(0xe9f0f4, 0x8e9ca6, .8));
  const key = new THREE.DirectionalLight(0xf3f7fa, 1.1); key.castShadow = true; { const S = SOFT ? 1024 : 2048; key.shadow.mapSize.set(S, S); }
  key.shadow.bias = -.0004; key.shadow.normalBias = .04; key.shadow.camera.near = 1; key.shadow.camera.far = 140; key.shadow.radius = 6; scene.add(key, key.target);
  const KEYDIR = new THREE.Vector3(-.4, 1, .55).normalize();
  let shHalf = 0; function setShadow(h) { if (Math.abs(h - shHalf) < .05) return; shHalf = h; const c = key.shadow.camera; c.left = -h; c.right = h; c.top = h; c.bottom = -h; c.updateProjectionMatrix(); } setShadow(26);

  /* ------------------------------------------------------------ the plane: mist clay, survey rings round each station, faint crosses */
  let LAY = PH ? LAYOUT.phone : LAYOUT.desk;
  const stXZ = L => CAT.map((c, i) => { const a = arcAt(L, i); return new THREE.Vector2(a.x, a.z); });
  const gU = {uSt: {value: stXZ(LAY)}};
  const gMat = new THREE.MeshStandardMaterial({color: 0xb9c5cb, roughness: .93, metalness: 0});
  gMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, gU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <project_vertex>', '#include <project_vertex>\nvW=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec2 uSt[9];varying vec3 vW;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}`).replace('#include <color_fragment>', `#include <color_fragment>
{
  float fwz=length(fwidth(vW.xz));
  float g=vn(vW.xz*23.)*.5+vn(vW.xz*3.1)*.5;
  diffuseColor.rgb*=.975+.04*g;
  float lw=max(fwz*.8,.008);
  vec2 q=abs(fract(vW.xz/4.+.5)-.5)*4.;
  float cr=max((1.-smoothstep(lw,lw*2.,q.x))*(1.-step(.14,q.y)),(1.-smoothstep(lw,lw*2.,q.y))*(1.-step(.14,q.x)));
  float gD=1e5;vec2 gDir=vec2(0.,1.);
  for(int i=0;i<9;i++){vec2 d=vW.xz-uSt[i];float l=length(d);if(l<gD){gD=l;gDir=d/max(l,1e-3);}}
  float a=atan(gDir.y,gDir.x);
  float R=1.55;
  float rl=(1.-smoothstep(lw,lw*2.2,abs(gD-R)));
  float f=fract(a*36./6.2831853);float arc=min(f,1.-f)*6.2831853/36.*gD;
  float tk=(1.-smoothstep(lw*.5,lw*1.4,arc))*step(R,gD)*step(gD,R+.12)*(1.-smoothstep(.012,.03,fwz));
  float marks=max(cr*.42,max(rl*.42,tk*.42));
  diffuseColor.rgb*=1.-marks*.3*(1.-smoothstep(26.,60.,length(vW.xz-cameraPosition.xz)));
}`);
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700).rotateX(-Math.PI / 2), gMat); ground.receiveShadow = true; scene.add(ground);

  /* ------------------------------------------------------------ the stations and the scattered clay */
  const ST = buildStations(scene, CAT, MAT, SOFT, LAY, MAXA);
  const stations = ST.stations;
  let SC = scatter(scene, MAT, SOFT, LAY, PH);
  stations.forEach(s => { s.up = new Spring(0, {k: 150, c: 16}); s.glow = 0; s.fade = 1; });
  /* behind an open slab the panel's own face would show through the frost and fight the page: it clears, leaving the
     glass (the app clears it once the panel has become the slab, and restores it before the slab shrinks back) */
  let faceVis = true;
  /* the station that has become the slab is taken out of the world while the slab stands in its place (otherwise its
     glass, its foot and its tick show through the frost as faint shapes) */
  let hidden = -1, coverR = null;

  /* ------------------------------------------------------------ framings */
  const TU = {
    /* phone: the centred panel is wf of the screen's width, its centre cy (NDC) above the middle, seen from a little above */
    p: {fov: 38, el: .26, wf: .62, cy: .24, fitFov: 34},
    /* desktop: a station centred right of the side list, wf of the screen's width, its neighbours running round the
       arc to both edges (about seven in view); drag or the list glides along the arc, the wheel steps back */
    d: {fov: 30, el: .25, wf: .155, cy: .03, fitFov: 28}
  };
  const camS = {pos: new THREE.Vector3(0, 30, 60), tgt: new THREE.Vector3(), sh: new THREE.Vector2(), fov: 30};
  const travel = {on: false, k: 1, t0: 0, d: 0, lift: 0, a: {pos: new THREE.Vector3(), tgt: new THREE.Vector3(), sh: new THREE.Vector2(), fov: 30}, res: null};
  let mode = {k: 'home', st: -1, rect: null};
  const foc = new Spring(PH ? 0 : 4, {k: 44, c: 12.5});
  const user = {yaw: 0, tyaw: 0, pitch: 0, tpitch: 0, zoom: 1, tzoom: 1, vx: 0, vy: 0};
  const par = {x: 0, y: 0, tx: 0, ty: 0};
  const G = {pos: new THREE.Vector3(), tgt: new THREE.Vector3(), sh: new THREE.Vector2(), fov: 30};
  const _a = {}, _v = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3();
  const tanH = fov => Math.tan(fov * Math.PI / 360);
  function poseFocus(f, o) {
    const t = PH ? TU.p : TU.d, a = arcAt(LAY, f, _a), fy = tanH(t.fov), asp = innerWidth / innerHeight;
    /* desktop: the side list takes the left (24 + 278px, or 18 + 250px under 1180px); centre the station in what is left */
    const listR = PH ? 0 : innerWidth <= 1180 ? 268 : 302, shx = listR / innerWidth;
    const wf = t.wf * (1 - shx), d = (PANEL.w / 2) / (wf * fy * asp) * (PH ? 1 : user.zoom), el = t.el + (PH ? 0 : user.pitch);
    o.tgt.set(a.x, PCY, a.z);
    o.pos.set(a.x + a.nx * d * Math.cos(el), PCY + d * Math.sin(el), a.z + a.nz * d * Math.cos(el));
    o.sh.set(shx, t.cy); o.fov = t.fov; return o;
  }
  /* straight on to a panel, so that it fits a screen rectangle (contain) and is centred on it */
  function poseFit(st, rect, back, o) {
    const s = stations[st], fov = (PH ? TU.p : TU.d).fitFov, fy = tanH(fov), asp = innerWidth / innerHeight;
    const dH = (PANEL.h / 2) * innerHeight / (rect.h * fy), dW = (PANEL.w / 2) * innerWidth / (rect.w * fy * asp);
    const d = Math.max(dH, dW) * back;
    o.tgt.set(s.pos.x, PCY, s.pos.z); o.pos.set(s.pos.x + s.nx * d, PCY, s.pos.z + s.nz * d);
    o.sh.set((rect.x + rect.w / 2) / innerWidth * 2 - 1, 1 - (rect.y + rect.h / 2) / innerHeight * 2); o.fov = fov; return o;
  }
  function goal(o) {
    if ((mode.k === 'enter' || mode.k === 'product') && mode.rect) return poseFit(mode.st, mode.rect, mode.k === 'product' ? 1.5 : 1, o);
    return poseFocus(foc.v, o);
  }
  function startTravel(dur, lift = 0) {
    travel.a.pos.copy(camS.pos); travel.a.tgt.copy(camS.tgt); travel.a.sh.copy(camS.sh); travel.a.fov = camS.fov;
    if (travel.res) travel.res(false);
    W.prepped = false;
    travel.on = true; travel.t0 = CLOCK.now(); travel.d = RM ? 0 : dur; travel.lift = lift; travel.k = 0;
    return new Promise(r => { travel.res = r; });
  }
  function camUpdate(now, dt) {
    goal(G);
    if (travel.on) {
      const k = travel.d > 0 ? clamp((now - travel.t0) / travel.d) : 1, e = E.move(k), et = E.move(clamp(k * 1.06)); travel.k = k;
      camS.pos.lerpVectors(travel.a.pos, G.pos, e); camS.pos.y += Math.sin(e * Math.PI) * travel.lift;
      camS.tgt.lerpVectors(travel.a.tgt, G.tgt, et); camS.sh.lerpVectors(travel.a.sh, G.sh, e); camS.fov = lerp(travel.a.fov, G.fov, e);
      if (k >= 1) { travel.on = false; const r = travel.res; travel.res = null; if (r) r(true); }
    } else { camS.pos.copy(G.pos); camS.tgt.copy(G.tgt); camS.sh.copy(G.sh); camS.fov = G.fov; }
    cam.position.copy(camS.pos); cam.lookAt(camS.tgt);
    /* alive: a slow breathing drift and the pointer's parallax (none while a panel is being matched to the slab) */
    const amp = RM || mode.k === 'enter' ? 0 : mode.k === 'product' ? .25 : 1, t = now / 1000, k2 = PH ? .07 : .3;
    if (amp) cam.position.addScaledVector(_r.set(1, 0, 0).applyQuaternion(cam.quaternion), (par.x * k2 * 1.4 + Math.sin(t * .11) * k2) * amp)
      .addScaledVector(_u.set(0, 1, 0).applyQuaternion(cam.quaternion), (-par.y * k2 * .6 + Math.sin(t * .15) * k2 * .4) * amp);
    cam.lookAt(camS.tgt);
    cam.fov = camS.fov; cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
    const e = cam.projectionMatrix.elements; e[8] = -camS.sh.x; e[9] = -camS.sh.y; cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  }
  function scr(v) { cam.updateMatrixWorld(); _v.copy(v).project(cam); return [(_v.x + 1) / 2 * innerWidth, (1 - _v.y) / 2 * innerHeight, _v.z]; }

  /* ------------------------------------------------------------ labels under the panels (desktop home: crisp DOM type, focusable) */
  const stLabels = stations.map(s => {
    const a = document.createElement('a'); a.className = 'stl'; a.href = '#/c/' + s.co.c; a.dataset.st = s.i; a.tabIndex = -1;
    a.setAttribute('aria-label', 'Station ' + s.co.c + ', ' + s.co.n + '. ' + s.co.d + '. Enter the collection.');
    a.innerHTML = '<span class="c">' + s.co.c + '</span><span class="n">' + s.co.n + '</span>';
    a.addEventListener('focus', () => { hov.st = s.i; hov.src = 'kbd'; }); a.addEventListener('blur', () => { if (hov.st === s.i) hov.st = -1; });
    a.addEventListener('pointerenter', () => { hov.st = s.i; hov.src = 'lbl'; }); a.addEventListener('pointerleave', () => { if (hov.src === 'lbl') hov.st = -1; });
    labelsHost.appendChild(a); return a; });
  const _w = new THREE.Vector3();
  function labelsUpdate() {
    const show = mode.k === 'home' && !PH && !travel.on;
    stations.forEach((s, i) => {
      const a = stLabels[i]; _w.set(s.pos.x + s.nx * .55, 0, s.pos.z + s.nz * .55); const q = scr(_w);
      const vis = show && q[2] < 1 && q[0] > 20 && q[0] < innerWidth - 20 && q[1] > 60 && q[1] < innerHeight - 20;
      a.style.transform = 'translate(' + Math.round(q[0]) + 'px,' + Math.round(q[1]) + 'px)';
      a.classList.toggle('on', vis); a.classList.toggle('hov', hov.st === i); a.tabIndex = vis ? 0 : -1;
    });
  }

  /* ------------------------------------------------------------ input
     desktop home: hover a panel to raise and light it, click to enter, drag to look around, wheel to come closer.
     phone home: swipe left and right to glide from station to station (the camera follows the finger, then springs to
     the nearest station, a flick carries on); tap the centred panel to enter, a neighbour to bring it to the centre. */
  const ptr = {down: false, id: -1, x: 0, y: 0, sx: 0, sy: 0, drag: false, f0: 0, v: 0, lt: 0, lx: 0}, hov = {st: -1, src: ''};
  let onPick = () => {}, onFocus = () => {}, onHover = () => {}, lastF = -1, lastH = -1;
  const ray = new THREE.Raycaster(), boxes = stations.map(s => s.box);
  function pick(cx, cy) { cam.updateMatrixWorld(); ray.setFromCamera({x: cx / innerWidth * 2 - 1, y: -(cy / innerHeight * 2 - 1)}, cam); const h = ray.intersectObjects(boxes, false)[0]; return h ? h.object.userData.st : -1; }
  const live = () => mode.k === 'home' && W.input;
  const pxPer = () => PH ? innerWidth * .64 : innerWidth * .16;
  host.addEventListener('pointerdown', e => {
    if (e.button > 0 || !live()) return;
    Object.assign(ptr, {down: true, id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, drag: false, f0: foc.v, t0: Math.round(foc.to), v: 0, lt: performance.now(), lx: e.clientX});
    try { host.setPointerCapture(e.pointerId); } catch (x) {}
    host.classList.add('drag');
  });
  host.addEventListener('pointermove', e => {
    if (!ptr.down) { if (!PH && live() && e.pointerType !== 'touch') { const st = pick(e.clientX, e.clientY); hov.st = st; hov.src = 'ptr'; host.classList.toggle('over', st >= 0); } return; }
    if (e.pointerId !== ptr.id) return;
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr.x = e.clientX; ptr.y = e.clientY;
    if (!ptr.drag && Math.hypot(ptr.x - ptr.sx, ptr.y - ptr.sy) > 7) { ptr.drag = true; if (travel.on && PH) { travel.on = false; if (travel.res) { travel.res(false); travel.res = null; } } }
    if (!ptr.drag) return;
    const now = performance.now(), ddt = Math.max(1, now - ptr.lt); ptr.v = ptr.v * .55 + ((e.clientX - ptr.lx) / ddt) * .45; ptr.lt = now; ptr.lx = e.clientX;
    let f = ptr.f0 - (ptr.x - ptr.sx) / pxPer();
    if (f < 0) f *= .3; if (f > 8) f = 8 + (f - 8) * .3;
    foc.snap(f);
    if (!PH) user.tpitch = clamp(user.tpitch + dy * .0012, -.08, .22);
  });
  function endPtr(e) {
    if (!ptr.down || e.pointerId !== ptr.id) return; ptr.down = false; host.classList.remove('drag');
    if (!ptr.drag) {
      const hit = pick(e.clientX, e.clientY);
      if (hit < 0) return;
      if (PH && hit !== Math.round(foc.to)) W.focusTo(hit); else onPick(hit);
      return;
    }
    {
      /* one station per swipe (a flick past the halfway carries to the next one); a long drag can travel further */
      const vs = clamp(ptr.v * 1000 / pxPer(), -4, 4), base = ptr.t0, moved = foc.v - base;
      let to = Math.abs(moved) > 1.4 ? Math.round(foc.v - vs * .1) : Math.abs(moved) > .5 || Math.abs(vs) > .35 ? base + Math.sign(Math.abs(moved) > .12 ? moved : -vs) : base;
      to = clamp(to, 0, 8);
      foc.vel = -vs * .5; foc.set(to);
    }
  }
  host.addEventListener('pointerup', endPtr); host.addEventListener('pointercancel', endPtr);
  host.addEventListener('pointerleave', () => { if (!ptr.down && hov.src === 'ptr') { hov.st = -1; host.classList.remove('over'); } });
  host.addEventListener('wheel', e => { if (!live() || PH) return; e.preventDefault(); user.tzoom = clamp(user.tzoom * Math.exp(e.deltaY * .0011), .8, 2.1); }, {passive: false});

  /* ------------------------------------------------------------ resize, loop */
  function fit() {
    const ph = isPh();
    if (ph !== PH) { PH = ph; LAY = PH ? LAYOUT.phone : LAYOUT.desk; ST.relayout(LAY); gU.uSt.value = stXZ(LAY); scene.remove(SC); SC = scatter(scene, MAT, SOFT, LAY, PH); }
    setDpr(); renderer.setSize(innerWidth, innerHeight, false); W.force = true;
  }
  addEventListener('resize', fit);
  /* fog runs from the camera's own distance to what it looks at, so a glide never drowns the world in mist */
  function fogGoal() {
    const d = camS.pos.distanceTo(camS.tgt);
    if (mode.k === 'enter' || mode.k === 'product') return [d * .7, d * 4.6];
    if (PH) return [d * .95, d * 4.2];
    return [d * .8, d * 2.9];
  }
  const fogS = {n: 30, f: 120};
  let lastR = -1;
  function frame(now, dt) {
    par.x = lerp(par.x, par.tx, .04); par.y = lerp(par.y, par.ty, .04);
    const a = 1 - Math.pow(.0009, dt);
    user.yaw = lerp(user.yaw, user.tyaw, a); user.pitch = lerp(user.pitch, user.tpitch, a); user.zoom = lerp(user.zoom, user.tzoom, a);
    if (!ptr.down || !ptr.drag) foc.step(dt);
    const fi = clamp(Math.round(foc.v), 0, 8);
    if (PH && fi !== lastF) { lastF = fi; onFocus(fi); }
    const hv = live() ? hov.st : -1;
    if (hv !== lastH) { lastH = hv; onHover(hv); }
    /* the panels: the hovered one rises and lights; on a phone the centred one is lit */
    stations.forEach(s => {
      const on = mode.k === 'home' && (PH ? s.i === fi : s.i === hov.st);
      s.up.set(on && !PH ? .32 : 0); const y = s.up.step(dt);
      s.lift.position.y = y; s.lift.rotation.x = -y * .05;
      s.glow = lerp(s.glow, on ? 1 : 0, 1 - Math.pow(.01, dt));
      s.fMat.emissiveIntensity = .34 + s.glow * .2;
      s.g.visible = s.i !== hidden;
      const fv = faceVis ? 1 : s.i === mode.st ? 0 : .07; s.fade = lerp(s.fade, fv, 1 - Math.pow(.02, dt));
      if (s.fade > .995) s.fade = 1;
      const tr = s.fade < 1; if (s.fMat.transparent !== tr) { s.fMat.transparent = tr; s.fMat.needsUpdate = true; } s.fMat.opacity = s.fade;
      s.tick.material.emissive.setHex(0xe98546); s.tick.material.emissiveIntensity = s.glow * .9;
    });
    camUpdate(now, dt);
    /* a station standing wholly behind the open slab (e.g. when Protocol slides the slab aside) leaves the world too:
       through the frost it would only read as a faint box and a stand line */
    if (coverR) stations.forEach(s => {
      if (!s.g.visible) return; const q = W.panelRect(s.i), m = 6, fh = q.h * .1;
      if (q.x > coverR.left + m && q.x + q.w < coverR.right - m && q.y > coverR.top + m && q.y + q.h + fh < coverR.bottom - m) s.g.visible = false;
    });
    { const G2 = fogGoal(), b = 1 - Math.pow(.002, dt); fogS.n = lerp(fogS.n, G2[0], b); fogS.f = lerp(fogS.f, G2[1], b); scene.fog.near = fogS.n; scene.fog.far = fogS.f; }
    const fp = camS.tgt; key.target.position.set(fp.x, 0, fp.z); key.position.copy(key.target.position).addScaledVector(KEYDIR, 50);
    setShadow(lerp(shHalf, mode.k === 'home' && !PH ? 24 : 10, .08));
    sky.position.copy(cam.position);
    labelsUpdate();
    if (!W.visible) return;
    /* software GL cannot hold 60 fps: draw less often there, but keep every computation per frame */
    if (SOFT && now - lastR < (W.softEvery || 120) && W.force !== true) return;
    if (now === lastR && W.force !== true) return;
    /* behind a slab and still, 30 frames a second is plenty */
    const busy = travel.on || ptr.down || !foc.rest || mode.k === 'home';
    if (!busy && now - lastR < 30 && W.force !== true) return;
    lastR = now; W.force = false;
    renderer.render(scene, cam);
  }
  function snap() { travel.on = false; goal(G); camS.pos.copy(G.pos); camS.tgt.copy(G.tgt); camS.sh.copy(G.sh); camS.fov = G.fov; const F = fogGoal(); fogS.n = F[0]; fogS.f = F[1]; }

  const W = {
    ok: true, SOFT, canvas, visible: true, force: true, input: true, softEvery: +(Q.get('glevery') || 120),
    get phone() { return PH; },
    get focus() { return clamp(Math.round(foc.to), 0, 8); },
    /* the Atlas home: a phone centres a station (st), the desktop looks at the whole arc */
    home(o = {}) {
      const was = mode.k; mode = {k: 'home', st: -1, rect: null};
      if (o.st != null) { if (was === 'enter' || was === 'product' || o.instant) foc.snap(o.st); else foc.set(o.st); }
      if (o.instant) { if (!W.prepped) snap(); return Promise.resolve(true); }
      if (was === 'home') return Promise.resolve(true);
      return startTravel(o.dur || 1450, PH ? 0 : .8);
    },
    /* a slab that is not a collection (Field Club, a member page, the Index): the world stays at home, behind it */
    over(o = {}) { return W.home(o); },
    /* glide up to a panel until it fills rect (the collection slab) */
    enter(st, rect, o = {}) {
      const same = mode.k === 'enter' && mode.st === st;
      const d0 = camS.pos.distanceTo(stations[st].pos);
      mode = {k: 'enter', st, rect}; if (PH) foc.snap(st);
      hov.st = -1;
      if (o.instant) { snap(); return Promise.resolve(true); }
      if (same) return Promise.resolve(true);
      return startTravel(o.dur || clamp(1150 + d0 * 9, 1200, 1600), o.lift != null ? o.lift : .35);
    },
    product(st, rect, o = {}) {
      const same = mode.k === 'product' && mode.st === st;
      mode = {k: 'product', st, rect}; if (PH) foc.snap(st);
      if (o.instant) { snap(); return Promise.resolve(true); }
      if (same) return Promise.resolve(true);
      return startTravel(o.dur || 1300, 0);
    },
    setRect(rect) { if (mode.rect) mode.rect = rect; },
    cover(r) { coverR = r; },
    hide(i) { hidden = i == null ? -1 : i; stations.forEach(s => { s.g.visible = s.i !== hidden; }); W.force = true; },
    faceOn(v) { faceVis = !!v; W.force = true; },
    focusTo(i) { i = clamp(Math.round(i), 0, 8); if (mode.k !== 'home') return; foc.set(i); },
    /* a station named from the side list: glide along the arc only if it is not already well in view */
    reveal(i) { if (mode.k !== 'home' || PH) return; if (Math.abs(i - foc.to) > 1.6) foc.set(clamp(i + Math.sign(foc.to - i) * 1.4, 0, 8)); },
    step(d) { W.focusTo(Math.round(foc.to) + d); },
    hover(i) { hov.st = i; hov.src = 'list'; },
    /* where a panel's face is on screen now, and its corner radius in px (for the morph to the DOM slab) */
    panelRect(i) {
      const s = stations[i]; s.lift.updateMatrixWorld(true);
      const hw = PANEL.w / 2, hh = PANEL.h / 2; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]].forEach(([x, y]) => { _w.set(x, PCY + y, PANEL.d / 2).applyMatrix4(s.lift.matrixWorld); const q = scr(_w); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
      return {x: x0, y: y0, w: x1 - x0, h: y1 - y0, r: (x1 - x0) * PANEL.r / PANEL.w};
    },
    faceCanvas: i => stations[i].cv,
    /* the arrival: from high over the plane, the camera settles to its framing */
    /* prepIntro holds the camera high from the first frame (no cut from the framing to the high pose when the arrival
       starts); intro starts the descent */
    prepIntro() {
      if (RM) return; goal(G); travel.a.pos.copy(G.pos).add(_v.set(0, PH ? 16 : 14, PH ? 10 : 12)); travel.a.tgt.copy(G.tgt); travel.a.sh.copy(G.sh); travel.a.fov = G.fov;
      camS.pos.copy(travel.a.pos); camS.tgt.copy(travel.a.tgt); camS.sh.copy(G.sh); camS.fov = G.fov;
      travel.on = true; travel.t0 = 1e15; travel.d = 2600; travel.lift = 0; travel.k = 0; W.prepped = true;
    },
    intro() {
      if (RM) return;
      if (W.prepped && travel.on && travel.t0 > 1e14) { W.prepped = false; travel.t0 = CLOCK.now(); return new Promise(r => { travel.res = r; }); }
      goal(G); camS.pos.copy(G.pos).add(_v.set(0, PH ? 16 : 14, PH ? 10 : 12)); camS.tgt.copy(G.tgt); camS.sh.copy(G.sh); camS.fov = G.fov; startTravel(2600);
    },
    pointer(nx, ny) { par.tx = nx; par.ty = ny; },
    set onPick(f) { onPick = f; }, set onFocus(f) { onFocus = f; lastF = -1; }, set onHover(f) { onHover = f; },
    setVisible(v) { this.visible = v; canvas.style.visibility = v ? '' : 'hidden'; if (v) W.force = true; },
    frame, fit, snap,
    travelling: () => travel.on,
    readout: () => ({x: camS.tgt.x, z: camS.tgt.z, h: cam.position.y, k: travel.k}),
    state: () => ({mode: mode.k, st: mode.st, focus: W.focus, f: +foc.v.toFixed(3), travel: travel.on, k: +travel.k.toFixed(2), hover: hov.st, SOFT, phone: PH}),
    dbg: Q.has('dbg') ? {scene, cam, renderer, stations, THREE, TU} : null
  };
  W.warm = () => (renderer.compileAsync ? renderer.compileAsync(scene, cam) : Promise.resolve()).catch(() => {});
  fit(); snap();
  return W;
}

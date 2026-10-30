/* PR6 v7 · The Atlas, behind the slab (adapted from v5/js/atlas/world.js).
   Kept: the plane, the nine stations in LAYOUT, drag to look, click a station to travel, labels placed in the scene,
   the camera's eased glide between stations. Re-lit for The Device: misty blue-grey, soft overcast, no warm sand;
   simple clay and frosted forms on low plinths, and the kit's matte white pills and spheres lying about the plane.
   Removed: the arm, the held sprite, the paper sweep and the tone drift (the slab carries the product now).
   The world is always alive (a slow drift); the store's slab floats in front of it and blurs it. */
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {makeGfx} from './gfx.js';
import {buildStations, scatter, LAYOUT} from './stations.js';
import {CAT} from '../catalog.js';
import {CLOCK, RM, clamp, lerp, E, Q} from '../util.js';

export function createWorld(host, labelsHost) {
  const canvas = document.createElement('canvas'); canvas.id = 'gl'; canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'}); if (!renderer.getContext()) throw new Error('no gl'); } catch (e) { return null; }
  host.appendChild(canvas);
  const SOFT = (() => { try { const g = renderer.getContext(), e = g.getExtension('WEBGL_debug_renderer_info'); return !!e && /swiftshader|llvmpipe|software/i.test(g.getParameter(e.UNMASKED_RENDERER_WEBGL)); } catch (x) { return false; } })();
  const isPh = () => innerWidth < 861 || innerWidth / innerHeight < .8;
  let PH = isPh();
  /* the world is mostly seen through frosted glass: a modest pixel ratio is plenty, and keeps the blur cheap */
  const setDpr = () => renderer.setPixelRatio(SOFT ? .75 : Math.min(devicePixelRatio || 1, PH ? 1.5 : 1.5));
  setDpr();
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = .9;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const {MAT} = makeGfx(renderer, SOFT);

  /* the palette: the stage is mist into steel-blue grey (#AEB9C0 to #CAD5DA), overcast */
  const HORIZON = new THREE.Color('#b8c3c9'), ZENITH = new THREE.Color('#9eabb4'), FOG = new THREE.Color('#b1bcc3');
  const scene = new THREE.Scene(); scene.background = FOG.clone(); scene.fog = new THREE.Fog(FOG.clone(), 30, 120);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 600); scene.add(cam);
  const skyU = {uH: {value: HORIZON.clone()}, uZ: {value: ZENITH.clone()}};
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), new THREE.ShaderMaterial({side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 uH;uniform vec3 uZ;varying vec3 vP;void main(){float k=smoothstep(-.02,.6,vP.y);gl_FragColor=linearToOutputTexel(vec4(mix(uH,uZ,k),1.));}'}));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .32;
  /* soft overcast: a strong cool sky fill and one high, diffuse key for soft contact shadows */
  scene.add(new THREE.HemisphereLight(0xe9f0f4, 0x8e9ca6, .78));
  const key = new THREE.DirectionalLight(0xf3f7fa, 1.05); key.castShadow = true; { const S = SOFT ? 1024 : PH ? 1024 : 2048; key.shadow.mapSize.set(S, S); }
  key.shadow.bias = -.0004; key.shadow.normalBias = .04; key.shadow.camera.near = 1; key.shadow.camera.far = 140; key.shadow.radius = 6; scene.add(key, key.target);
  const KEYDIR = new THREE.Vector3(-.35, 1, .42).normalize();
  let shHalf = 0; function setShadow(h) { if (Math.abs(h - shHalf) < .05) return; shHalf = h; const c = key.shadow.camera; c.left = -h; c.right = h; c.top = h; c.bottom = -h; c.updateProjectionMatrix(); } setShadow(34);

  /* ------------------------------------------------------------ the plane: mist clay, survey rings round each station, faint crosses */
  let LAY = PH ? LAYOUT.phone : LAYOUT.desk;
  const gU = {uSt: {value: LAY.map(p => new THREE.Vector2(p[0], p[1]))}};
  const gMat = new THREE.MeshStandardMaterial({color: 0xb7c3ca, roughness: .93, metalness: 0});
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
  vec2 q=abs(fract(vW.xz/6.+.5)-.5)*6.;
  float cr=max((1.-smoothstep(lw,lw*2.,q.x))*(1.-step(.18,q.y)),(1.-smoothstep(lw,lw*2.,q.y))*(1.-step(.18,q.x)));
  float gD=1e5;vec2 gDir=vec2(0.,1.);
  for(int i=0;i<9;i++){vec2 d=vW.xz-uSt[i];float l=length(d);if(l<gD){gD=l;gDir=d/max(l,1e-3);}}
  float a=atan(gDir.y,gDir.x);
  float R=2.35;
  float rl=(1.-smoothstep(lw,lw*2.2,abs(gD-R)));
  float f=fract(a*36./6.2831853);float arc=min(f,1.-f)*6.2831853/36.*gD;
  float tk=(1.-smoothstep(lw,lw*2.2,arc))*step(R,gD)*step(gD,R+.22);
  float rl2=(1.-smoothstep(lw,lw*2.,abs(gD-3.3)))*step(.5,fract(a*60./6.2831853));
  float marks=max(max(cr*.45,rl*.5),max(tk*.5,rl2*.35));
  diffuseColor.rgb*=1.-marks*.32*(1.-smoothstep(30.,70.,length(vW.xz-cameraPosition.xz)));
  float ao=1.-.28*(1.-smoothstep(1.6,2.6,gD))*smoothstep(1.5,1.66,gD);
  diffuseColor.rgb*=ao;
}`);
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700).rotateX(-Math.PI / 2), gMat); ground.receiveShadow = true; scene.add(ground);

  /* ------------------------------------------------------------ stations and the scattered clay */
  const ST = buildStations(scene, CAT, MAT, SOFT, LAY);
  const stations = ST.stations;
  let SC = scatter(scene, MAT, SOFT, LAY, PH ? 30 : 46);
  const _up = new THREE.Vector3(0, 1, 0);
  const stLocal = (i, x, y, z, out = new THREE.Vector3()) => { const s = stations[i]; return out.set(x, y, z).applyAxisAngle(_up, s.rot).add(s.pos); };

  /* ------------------------------------------------------------ camera */
  /* d: desktop, p: phone. sd/sh: distance and height at a station; sox: sideways offset of the target, so the station
     sits behind the slab's disc (right of centre) on desktop */
  const TU = {d: {el: .52, dist: 50, fov: 30, tx: -1, tz: -2.6, sd: 11.5, sh: 3.6, sty: 1.0, sox: -1.2, cd: 8.2, ch: 2.6},
              p: {el: .92, dist: 50, fov: 40, tx: 0, tz: .2, sd: 11, sh: 4.6, sty: 1.0, sox: 0, cd: 8.6, ch: 3.4}};
  const user = {px: 0, pz: 0, zoom: 1, yaw: 0, pitch: 0, tyaw: 0, tpitch: 0, oyaw: 0};
  const camS = {pos: new THREE.Vector3(0, 40, 60), tgt: new THREE.Vector3(), fov: 30}, travel = {on: false, k: 1};
  const _t0 = new THREE.Vector3(), _r = new THREE.Vector3(), _f = new THREE.Vector3(), _u = new THREE.Vector3(), _w = new THREE.Vector3(), _w2 = new THREE.Vector3(), _v = new THREE.Vector3();
  let want = {st: -1, close: false};
  const T = () => PH ? TU.p : TU.d;
  function overviewPose(o) { const t = T(), c = _t0.set(t.tx + user.px, 0, t.tz + user.pz), dist = t.dist * user.zoom, y = user.oyaw;
    o.tgt.copy(c); o.pos.set(c.x + Math.sin(y) * Math.cos(t.el) * dist, c.y + Math.sin(t.el) * dist, c.z + Math.cos(y) * Math.cos(t.el) * dist); o.fov = t.fov; return o; }
  function stationPose(ci, close, o) { const t = T(), y = user.yaw, d = close ? t.cd : t.sd, h = close ? t.ch : t.sh, lx = Math.sin(y) * d, lz = Math.cos(y) * d;
    stLocal(ci, lx + t.sox, h + user.pitch * 2, lz, o.pos); stLocal(ci, t.sox, t.sty, 0, o.tgt); o.fov = PH ? 40 : 30; return o; }
  const poseTmp = {pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 30};
  const poseFor = (o = poseTmp) => want.st < 0 ? overviewPose(o) : stationPose(want.st, want.close, o);
  function startTravel(dur) {
    const to = poseFor({pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 30});
    const d = camS.pos.distanceTo(to.pos);
    travel.on = true; travel.a = {pos: camS.pos.clone(), tgt: camS.tgt.clone(), fov: camS.fov}; travel.t0 = CLOCK.now();
    /* the glide: 1.2 to 1.8 s, eased, a gentle lift over the plane on the way */
    travel.d = RM ? 0 : (dur || clamp(1200 + d * 16, 1200, 1800)); travel.lift = Math.min(5, d * .1); travel.k = 0;
  }
  const par = {x: 0, y: 0, tx: 0, ty: 0};
  function camUpdate(now, dt) {
    const goal = poseFor();
    if (travel.on) { const k = travel.d > 0 ? clamp((now - travel.t0) / travel.d) : 1, e = E.move(k), et = E.move(clamp(k * 1.08)); travel.k = k;
      camS.pos.lerpVectors(travel.a.pos, goal.pos, e); camS.pos.y += Math.sin(e * Math.PI) * travel.lift;
      camS.tgt.lerpVectors(travel.a.tgt, goal.tgt, et); camS.fov = lerp(travel.a.fov, goal.fov, e); if (k >= 1) travel.on = false; }
    else { const a = 1 - Math.pow(.004, dt); camS.pos.lerp(goal.pos, a); camS.tgt.lerp(goal.tgt, a); camS.fov = lerp(camS.fov, goal.fov, a); }
    cam.position.copy(camS.pos); cam.lookAt(camS.tgt);
    /* alive: a slow breathing drift and the pointer's parallax */
    const amp = RM ? 0 : 1, t = now / 1000, k2 = want.st < 0 ? .7 : .22;
    cam.position.addScaledVector(_r.set(1, 0, 0).applyQuaternion(cam.quaternion), (par.x * k2 + Math.sin(t * .09) * k2 * .8) * amp).addScaledVector(_u.set(0, 1, 0).applyQuaternion(cam.quaternion), (-par.y * k2 * .5 + Math.sin(t * .13) * k2 * .3) * amp);
    cam.lookAt(camS.tgt);
    if (Math.abs(cam.fov - camS.fov) > .01) { cam.fov = camS.fov; cam.updateProjectionMatrix(); }
  }
  function scr(v) { _v.copy(v).project(cam); return [(_v.x + 1) / 2 * innerWidth, (1 - _v.y) / 2 * innerHeight, _v.z]; }

  /* ------------------------------------------------------------ labels placed in the scene (DOM, readable and focusable; shown while roaming) */
  const stLabels = stations.map(s => {
    const a = document.createElement('a'); a.className = 'stl'; a.href = '#/c/' + s.co.c; a.dataset.st = s.i; a.tabIndex = -1;
    a.setAttribute('aria-label', 'Station ' + s.co.c + ', ' + s.co.n + '. ' + s.co.d + '.');
    a.innerHTML = '<span class="c">' + s.co.c + '</span><span class="n">' + s.co.n + '</span>';
    a.addEventListener('focus', () => { hov.st = s.i; }); a.addEventListener('blur', () => { if (hov.st === s.i) hov.st = -1; });
    labelsHost.appendChild(a); return a; });
  let roam = false;
  function labelsUpdate() {
    stations.forEach((s, i) => {
      const a = stLabels[i]; _w2.set(s.pos.x, s.H + PT_ + .3, s.pos.z); const q = scr(_w2);
      const vis = roam && q[2] < 1 && q[0] > -60 && q[0] < innerWidth + 60 && q[1] > 60 && q[1] < innerHeight - 30;
      a.style.transform = 'translate(' + Math.round(q[0]) + 'px,' + Math.round(q[1]) + 'px)';
      a.classList.toggle('on', vis); a.classList.toggle('hov', hov.st === i); a.classList.toggle('here', want.st === i); a.tabIndex = vis ? 0 : -1;
    });
  }
  const PT_ = .16;

  /* ------------------------------------------------------------ input: drag to look around, click a station to travel */
  const ptr = {down: false, id: -1, x: 0, y: 0, sx: 0, sy: 0, drag: false, hit: -1, vx: 0, vy: 0}, hov = {st: -1}, pts2 = new Map();
  let pinch = 0, onPick = () => {};
  const ray = new THREE.Raycaster();
  function pick(cx, cy) { ray.setFromCamera({x: cx / innerWidth * 2 - 1, y: -(cy / innerHeight * 2 - 1)}, cam); const h = ray.intersectObjects(stations.map(s => s.proxy), false)[0]; return h ? h.object.userData.st : -1; }
  host.addEventListener('pointerdown', e => {
    if (e.button > 0) return; pts2.set(e.pointerId, [e.clientX, e.clientY]); if (pts2.size === 2) { const a = [...pts2.values()]; pinch = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); return; }
    ptr.down = true; ptr.id = e.pointerId; ptr.sx = ptr.x = e.clientX; ptr.sy = ptr.y = e.clientY; ptr.drag = false; ptr.vx = ptr.vy = 0;
    try { host.setPointerCapture(e.pointerId); } catch (x) {}
    ptr.hit = roam ? pick(e.clientX, e.clientY) : -1;
    host.classList.add('drag');
  });
  host.addEventListener('pointermove', e => {
    if (pts2.has(e.pointerId)) pts2.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts2.size === 2 && pinch) { const a = [...pts2.values()], d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); if (want.st < 0) user.zoom = clamp(user.zoom * pinch / d, .6, 1.3); pinch = d; return; }
    if (!ptr.down) { const st = roam ? pick(e.clientX, e.clientY) : -1; hov.st = st; host.classList.toggle('over', st >= 0); return; }
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr.x = e.clientX; ptr.y = e.clientY;
    if (!ptr.drag && Math.hypot(ptr.x - ptr.sx, ptr.y - ptr.sy) > 6) ptr.drag = true;
    if (ptr.drag) dragBy(dx, dy);
  });
  function dragBy(dx, dy) {
    if (want.st < 0) {
      if (roam) { const k = (PH ? .075 : .05) * user.zoom, fwd = _f.set(0, 0, -1).applyQuaternion(cam.quaternion); fwd.y = 0; fwd.normalize(); const rt = _r.set(1, 0, 0).applyQuaternion(cam.quaternion); rt.y = 0; rt.normalize();
        user.px = clamp(user.px - (rt.x * dx - fwd.x * dy) * k, -17, 17); user.pz = clamp(user.pz - (rt.z * dx - fwd.z * dy) * k, -15, 13); ptr.vx = dx; ptr.vy = dy; }
      else { user.oyaw = clamp(user.oyaw - dx * .002, -.7, .7); user.zoom = clamp(user.zoom + dy * .002, .7, 1.25); }
    }
    else { user.tyaw = clamp(user.tyaw - dx * .004, -.9, .9); user.tpitch = clamp(user.tpitch + dy * .003, -.3, .6); }
  }
  function endPtr(e) {
    pts2.delete(e.pointerId); if (pts2.size < 2) pinch = 0; if (!ptr.down || e.pointerId !== ptr.id) return; ptr.down = false; host.classList.remove('drag');
    if (!ptr.drag && ptr.hit >= 0) onPick(ptr.hit);
  }
  host.addEventListener('pointerup', endPtr); host.addEventListener('pointercancel', endPtr);
  host.addEventListener('wheel', e => { if (!roam) return; e.preventDefault(); if (want.st < 0) user.zoom = clamp(user.zoom * Math.exp(e.deltaY * .0012), .6, 1.3); }, {passive: false});

  /* ------------------------------------------------------------ resize, loop */
  function fit() {
    const ph = isPh();
    if (ph !== PH) { PH = ph; LAY = PH ? LAYOUT.phone : LAYOUT.desk; ST.relayout(LAY); gU.uSt.value = LAY.map(p => new THREE.Vector2(p[0], p[1]));
      scene.remove(SC.pm, SC.bm); SC = scatter(scene, MAT, SOFT, LAY, PH ? 30 : 46); snap(); }
    setDpr(); renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); W.force = true;
  }
  addEventListener('resize', fit);
  /* behind the glass the world is calmer (a little more mist round a station, so the Dossier reads like the kit's plain
   stage); with the panel hidden it clears, so the plane and its stations read crisply */
function fogGoal() { const t = T(), d = t.dist * user.zoom; return want.st < 0 ? (roam ? [d * .75, d * 3] : [d * .55, d * 2.4]) : want.close ? [6, 34] : [8, 42]; }
  const fogS = {n: 30, f: 120};
  function snap() { travel.on = false; const p = poseFor(); camS.pos.copy(p.pos); camS.tgt.copy(p.tgt); camS.fov = p.fov; const G = fogGoal(); fogS.n = G[0]; fogS.f = G[1]; }
  let lastR = -1;
  /* softly turn the forms at the station you are at: the world breathes */
  function frame(now, dt) {
    par.x = lerp(par.x, par.tx, .04); par.y = lerp(par.y, par.ty, .04);
    user.yaw = lerp(user.yaw, user.tyaw, .08); user.pitch = lerp(user.pitch, user.tpitch, .08);
    if (!ptr.down && roam && want.st < 0 && (Math.abs(ptr.vx) > .1 || Math.abs(ptr.vy) > .1)) { dragBy(ptr.vx * .9, ptr.vy * .9); ptr.vx *= .9; ptr.vy *= .9; if (Math.abs(ptr.vx) < .2) ptr.vx = 0; if (Math.abs(ptr.vy) < .2) ptr.vy = 0; }
    if (!RM) stations.forEach(s => { const on = want.st === s.i; s.sg.rotation.y = lerp(s.sg.rotation.y, on ? Math.sin(now / 5200) * .35 : 0, .02); });
    camUpdate(now, dt);
    { const G = fogGoal(), a = 1 - Math.pow(travel.on ? .08 : .2, dt); fogS.n = lerp(fogS.n, G[0], a); fogS.f = lerp(fogS.f, G[1], a); scene.fog.near = fogS.n; scene.fog.far = fogS.f; }
    const fp = camS.tgt; key.target.position.set(fp.x, 0, fp.z); key.position.copy(key.target.position).addScaledVector(KEYDIR, 50); setShadow(lerp(shHalf, want.st < 0 ? 34 : 12, .06));
    sky.position.copy(cam.position);
    labelsUpdate();
    if (!W.visible) return;
    /* software GL cannot hold 60 fps: draw less often there, but keep every computation per frame */
    if (SOFT && now - lastR < (W.softEvery || 120) && W.force !== true) return;
    if (now === lastR && W.force !== true) return;
    /* seen through frosted glass and only drifting, 30 frames a second is plenty: half the GPU work under the blur */
    if (!roam && !travel.on && !ptr.down && now - lastR < 30 && W.force !== true) return;
    lastR = now; W.force = false;
    renderer.render(scene, cam);
  }

  const W = {
    ok: true, SOFT, canvas, visible: true, force: true, softEvery: +(Q.get('glevery') || 120),
    get route() { return want; },
    /* go to the overview (st = -1) or a station; close = the product framing, nearer */
    go(st, o = {}) {
      const was = want.st, wasC = want.close; want = {st, close: !!o.close};
      if (st >= 0 && st !== was) { user.tyaw = user.tpitch = 0; user.yaw = user.pitch = 0; }
      if (st < 0 && was >= 0) { user.px = user.pz = 0; user.zoom = 1; user.oyaw = 0; }
      if (st === was && !!o.close === wasC && !o.force) return;
      if (o.instant) snap(); else startTravel(o.dur);
    },
    /* the arrival: from high over the plane, the camera settles down to where the slab is */
    intro() { if (RM) return; const p = poseFor(); camS.pos.copy(p.pos).add(_v.set(0, 24, 16)); camS.tgt.copy(p.tgt); startTravel(2600); },
    /* the stations' orange ticks: full Safety Orange when you roam; behind the glass they would blur into a warm smudge
       (the only saturated thing seen through the frost), so there they are a quiet, clay-warm tint */
    setRoam(v) { roam = !!v; host.classList.toggle('roam', roam); MAT.orange.color.set(roam ? 0xe98546 : 0xc7b2a6); W.force = true; if (!roam) { hov.st = -1; host.classList.remove('over'); } },
    pointer(nx, ny) { par.tx = nx; par.ty = ny; },
    set onPick(f) { onPick = f; },
    setVisible(v) { this.visible = v; canvas.style.visibility = v ? '' : 'hidden'; if (v) W.force = true; },
    frame, fit, snap,
    travelling: () => travel.on,
    readout: () => ({x: camS.tgt.x, z: camS.tgt.z, h: cam.position.y, k: travel.k}),
    state: () => ({st: want.st, close: want.close, travel: travel.on, k: +travel.k.toFixed(2), roam, SOFT}),
    dbg: Q.has('dbg') ? {scene, cam, renderer, stations, THREE} : null
  };
  W.warm = () => (renderer.compileAsync ? renderer.compileAsync(scene, cam) : Promise.resolve()).catch(() => {});
  MAT.orange.color.set(0xc7b2a6);
  fit(); snap();
  return W;
}

/* PR6 v8 · the nine stations: standing, rounded, frosted-glass panels (the kit's slide-4 pane, made in 3D).
   Each panel is a rounded box of pale glass (clearcoat, so its bevel catches the light) standing in a slot in a low clay
   foot, with a face drawn on a canvas: PR6 / STATION 04, the lead pack on a small debossed disc, and a big 04 / ENDURE.
   The nine stand on one concave arc, facing its centre, so from the front a station is centred and its neighbours turn
   in toward you at the edges (the phone's swipe framing); from further back the whole arc reads as a place (desktop).
   The kit's matte clay pills and spheres lie about the plane as brand objects. */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {MS, rng, mkC} from './gfx.js';
import {Renders} from '../renders.js';

/* the panel, in world units: 2.4 × 3.2 (3 : 4, a standing tablet), 0.16 thick */
export const PANEL = {w: 2.4, h: 3.2, d: .16, r: .15, y0: .12};
export const PCY = PANEL.y0 + PANEL.h / 2;
/* the arc: R radius, da angle between stations, cz the arc's centre (the stations stand on its far side) */
export const LAYOUT = {
  desk: {R: 15, da: .19, cz: 4},
  phone: {R: 14, da: .198, cz: 4}
};
export function arcAt(L, f, o = {}) {
  const a = (f - 4) * L.da;
  o.a = a; o.x = L.R * Math.sin(a); o.z = L.cz - L.R * Math.cos(a); o.nx = -Math.sin(a); o.nz = Math.cos(a);
  return o;
}

/* ------------------------------------------------------------ the face, drawn on a canvas */
const FW = 768, FH = 1024;
const FONT_WM = '"Inter Tight", "Helvetica Neue", Arial, sans-serif', FONT_MONO = '"JetBrains Mono", Menlo, monospace', FONT_SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function spaced(g, s, sp) { try { g.letterSpacing = sp + 'px'; } catch (e) {} return s; }
/* the render's neutral black contact shadow reads as a hole on the mist disc: re-tint it to the disc's blue-grey */
function mistImg(im) {
  try {
    const c = mkC(im.naturalWidth, im.naturalHeight), g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(im, 0, 0);
    const y0 = Math.round(c.height * .45), d = g.getImageData(0, y0, c.width, c.height - y0);
    for (let i = 0; i < d.data.length; i += 4) { const a = d.data[i + 3]; if (a === 0 || a > 250) continue; if (d.data[i] + d.data[i + 1] + d.data[i + 2] > 150) continue; d.data[i] = 54; d.data[i + 1] = 72; d.data[i + 2] = 86; d.data[i + 3] = a * .55; }
    g.putImageData(d, 0, y0); return c;
  } catch (e) { return im; }
}
export function drawFace(g, co, img, n) {
  g.clearRect(0, 0, FW, FH);
  /* the glass: a soft light from the top left, a bevel line inside the edge */
  const bg = g.createLinearGradient(0, 0, FW * .55, FH);
  bg.addColorStop(0, '#f1f4f5'); bg.addColorStop(.5, '#e3e9ec'); bg.addColorStop(1, '#d6dee3');
  g.fillStyle = bg; g.fillRect(0, 0, FW, FH);
  const sh = g.createRadialGradient(FW * .18, FH * .06, 10, FW * .18, FH * .06, FW * .9);
  sh.addColorStop(0, 'rgba(255,255,255,.55)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sh; g.fillRect(0, 0, FW, FH);
  /* frost: a very fine grain, and a soft diagonal reflection band across the upper half */
  const st = g.createLinearGradient(0, FH * .05, FW, FH * .55);
  st.addColorStop(0, 'rgba(255,255,255,0)'); st.addColorStop(.42, 'rgba(255,255,255,0)'); st.addColorStop(.5, 'rgba(255,255,255,.22)'); st.addColorStop(.62, 'rgba(255,255,255,0)');
  g.fillStyle = st; g.fillRect(0, 0, FW, FH);
  const gb = g.createLinearGradient(0, FH * .7, 0, FH); gb.addColorStop(0, 'rgba(120,144,158,0)'); gb.addColorStop(1, 'rgba(120,144,158,.10)');
  g.fillStyle = gb; g.fillRect(0, 0, FW, FH);
  g.lineWidth = 3; rr(g, 16, 16, FW - 32, FH - 32, 30);
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke();
  g.lineWidth = 2; rr(g, 19, 19, FW - 36, FH - 36, 28); g.strokeStyle = 'rgba(96,116,128,.16)'; g.stroke();
  /* the head: PR6, the orange slash, STATION 04 */
  g.textBaseline = 'alphabetic'; g.fillStyle = '#171c1f';
  g.font = `800 58px ${FONT_WM}`; g.fillText(spaced(g, 'PR6', -2), 58, 112); const wmW = g.measureText('PR6').width;
  g.font = `400 46px ${FONT_SANS}`; g.fillStyle = '#e98546'; g.fillText(spaced(g, '/', 0), 58 + wmW + 20, 110);
  g.font = `500 29px ${FONT_MONO}`; g.fillStyle = 'rgba(23,28,31,.8)'; g.fillText(spaced(g, 'STATION ' + co.c, 4), 58 + wmW + 56, 107);
  g.font = `500 27px ${FONT_MONO}`; g.textAlign = 'right'; g.fillStyle = 'rgba(23,28,31,.66)'; g.fillText(spaced(g, co.c + ' / 09', 2), FW - 56, 107); g.textAlign = 'left';
  /* the disc: debossed, darker mist, a soft inner shadow; the lead pack on it */
  const cx = FW / 2, cy = 410, R = 214;
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
  const dg = g.createRadialGradient(cx, cy - 40, 20, cx, cy, R);
  dg.addColorStop(0, '#b9c6ce'); dg.addColorStop(1, '#aebcc5'); g.fillStyle = dg; g.fillRect(cx - R, cy - R, R * 2, R * 2);
  g.lineWidth = 40; g.strokeStyle = 'rgba(62,82,96,.22)'; g.shadowColor = 'rgba(62,82,96,.45)'; g.shadowBlur = 36; g.shadowOffsetY = 14;
  g.beginPath(); g.arc(cx, cy, R + 20, 0, Math.PI * 2); g.stroke(); g.restore();
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(cx, cy, R + 1, Math.PI * .15, Math.PI * .85); g.stroke();
  if (img) { const w = R * 1.62, h = w * 1.2; g.drawImage(img, cx - w / 2, cy - h * .56, w, h); }
  /* the name: a big number, the orange slash, the name in mono, and the count */
  g.fillStyle = '#171c1f'; g.font = `800 236px ${FONT_WM}`; g.fillText(spaced(g, co.c, -10), 46, 932);
  const nW = g.measureText(co.c).width;
  const x2 = 46 + nW + 34;
  g.font = `400 64px ${FONT_SANS}`; g.fillStyle = '#e98546'; g.fillText(spaced(g, '/', 0), x2 - 6, 784);
  g.fillStyle = '#171c1f'; let fs = 64; g.font = `500 ${fs}px ${FONT_MONO}`; spaced(g, '', 6);
  const name = co.n.toUpperCase(); while (g.measureText(name).width > FW - x2 - 50 && fs > 36) { fs -= 2; g.font = `500 ${fs}px ${FONT_MONO}`; }
  g.fillText(name, x2, 868);
  g.font = `500 30px ${FONT_MONO}`; g.fillStyle = 'rgba(23,28,31,.78)'; g.fillText(spaced(g, String(n).padStart(2, '0') + ' ENTRIES', 3), x2 + 2, 926);
  g.font = `400 40px ${FONT_SANS}`; g.fillStyle = '#e98546'; g.fillText(spaced(g, '→', 0), FW - 96, 928);
  try { g.letterSpacing = '0px'; } catch (e) {}
}
function drawBack(g, co) {
  const W = 256, H = 342;
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#e6ecef'); bg.addColorStop(1, '#d3dce1');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(23,28,31,.32)'; g.font = `800 64px ${FONT_WM}`; g.fillText(co.c, 22, H - 28);
  g.font = `500 12px ${FONT_MONO}`; g.fillText('PR6 / ' + co.n.toUpperCase(), 24, 42);
}
/* a rounded rectangle face, with UVs 0..1 across it */
function faceGeo(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 12), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x) / w, (p.getY(i) - y) / h);
  return g;
}

export function buildStations(scene, CAT, MAT, SOFT, L, maxAniso) {
  const P = PANEL;
  const boxGeo = new RoundedBoxGeometry(P.w, P.h, P.d, SOFT ? 3 : 6, P.r);
  const FI = .07, fGeo = faceGeo(P.w - FI * 2, P.h - FI * 2, P.r * .7), bGeo = faceGeo(P.w - FI * 2, P.h - FI * 2, P.r * .7);
  const footGeo = new RoundedBoxGeometry(P.w * .86, .16, .66, SOFT ? 2 : 4, .07);
  const slotGeo = new RoundedBoxGeometry(P.w * .8, .03, P.d + .07, 2, .012);
  const tickGeo = new THREE.BoxGeometry(.2, .05, .04);
  const stations = CAT.map((co, i) => {
    const g = new THREE.Group(), lift = new THREE.Group();
    g.add(MS(footGeo, MAT.plinth, 0, .08, 0));
    g.add(MS(slotGeo, MAT.slot, 0, .165, 0));
    const tick = MS(tickGeo, MAT.orange.clone(), 0, .1, .34); g.add(tick);
    const box = MS(boxGeo, MAT.glass, 0, PCY, 0); box.userData.st = i; lift.add(box);
    const cv = mkC(FW, FH), ctx = cv.getContext('2d');
    drawFace(ctx, co, null, co.it.length);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    const fMat = new THREE.MeshStandardMaterial({map: tex, roughness: .58, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .34, envMapIntensity: .9});
    const face = MS(fGeo, fMat, 0, PCY, P.d / 2 + .004); lift.add(face);
    const bc = mkC(256, 342); drawBack(bc.getContext('2d'), co);
    const btex = new THREE.CanvasTexture(bc); btex.colorSpace = THREE.SRGBColorSpace;
    const back = MS(bGeo, new THREE.MeshStandardMaterial({map: btex, roughness: .5, metalness: 0}), 0, PCY, -P.d / 2 - .004); back.rotation.y = Math.PI; lift.add(back);
    g.add(lift); scene.add(g);
    box.castShadow = true; box.receiveShadow = false; face.receiveShadow = false;
    g.children.forEach(m => { if (m.isMesh && m !== tick) { m.castShadow = true; m.receiveShadow = true; } });
    const s = {i, co, g, lift, box, face, fMat, tex, cv, ctx, tick, pos: new THREE.Vector3(), rot: 0, nx: 0, nz: 1, img: null};
    return s;
  });
  function relayout(L2) {
    stations.forEach(s => { const a = arcAt(L2, s.i); s.g.position.set(a.x, 0, a.z); s.g.rotation.y = -a.a; s.pos.copy(s.g.position); s.rot = -a.a; s.nx = a.nx; s.nz = a.nz; });
  }
  relayout(L);
  /* the lead pack on each face, from its turntable's first frame (the same picture the Dossier's disc starts on) */
  function paint(s) { drawFace(s.ctx, s.co, s.img, s.co.it.length); s.tex.needsUpdate = true; }
  function loadFaces() {
    stations.forEach(s => {
      const p = s.co.it[0], src = (Renders.frames(p)[0]) || Renders.hero(p);
      if (!src) { paint(s); return; }
      const im = new Image(); im.decoding = 'async'; im.src = src;
      im.decode().then(() => { s.img = mistImg(im); paint(s); }).catch(() => paint(s));
    });
  }
  const fontsReady = Promise.race([Promise.all([
    document.fonts.load(`800 58px ${FONT_WM}`), document.fonts.load(`500 24px ${FONT_MONO}`), document.fonts.load(`400 46px ${FONT_SANS}`)
  ]), new Promise(r => setTimeout(r, 2500))]).catch(() => {});
  fontsReady.then(() => { stations.forEach(paint); loadFaces(); });
  return {stations, relayout, FW, FH};
}

/* the recurring object: matte clay pills and spheres lying about the plane (instanced). They keep out of the arc and
   out of the line between the camera and a panel; small ones sit in the gaps at the panels' feet, larger ones stand
   further back in the mist, and the kit's composition (a leaning pill and a sphere) stands at the arc's centre. */
export function scatter(scene, MAT, SOFT, L, ph) {
  const r = rng(47), pills = [], balls = [];
  const span = 4.7 * L.da;
  let guard = 0;
  const want = ph ? 54 : 64;
  while ((pills.length + balls.length) < want && guard++ < 6000) {
    const ang = (r() - .5) * 2.6, rad = 3 + r() * (L.R + 26);
    const x = L.cz * 0 + rad * Math.sin(ang), z = L.cz - rad * Math.cos(ang);
    const inSpan = Math.abs(ang) < span, dR = rad - L.R;
    let s;
    if (Math.abs(dR) < 1.9 && Math.abs(ang) < span + .12) continue;                 /* the arc itself */
    if (dR < -1.9 && inSpan) {                                                     /* the plaza in front of the panels */
      const k = ((ang / L.da) % 1 + 1) % 1, gap = Math.abs(k - .5);                /* 0 = halfway between two stations */
      if (ph) { if (dR < -6.5 || gap > .22) continue; s = .22 + r() * .3; }
      else { if (dR < -6 || gap > .24) continue; s = .24 + Math.pow(r(), 2) * .34; }   /* small, in the gaps: never over a label */
    } else if (dR > 1.9) s = .5 + Math.pow(r(), 1.6) * (dR > 8 ? 2.6 : 1.2);        /* behind the arc, in the mist */
    else { if (Math.hypot(x, z - L.cz) < 4 || (!ph && rad < 9)) continue; s = .4 + Math.pow(r(), 2) * (ph ? 1.1 : .7); }
    (r() < .55 ? pills : balls).push({x, z, s, a: r() * Math.PI * 2, tilt: r() < .2});
  }
  const pg = new THREE.CapsuleGeometry(.32, .9, SOFT ? 6 : 12, SOFT ? 16 : 28), bg = new THREE.SphereGeometry(.38, SOFT ? 20 : 36, SOFT ? 14 : 24);
  const pm = new THREE.InstancedMesh(pg, MAT.clay, pills.length), bm = new THREE.InstancedMesh(bg, MAT.clay, balls.length);
  const o = new THREE.Object3D();
  pills.forEach((p, i) => { o.position.set(p.x, .32 * p.s, p.z); o.rotation.set(0, p.a, Math.PI / 2); o.scale.setScalar(p.s); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); });
  balls.forEach((p, i) => { o.position.set(p.x, .38 * p.s, p.z); o.rotation.set(0, 0, 0); o.scale.setScalar(p.s); o.updateMatrix(); bm.setMatrixAt(i, o.matrix); });
  const grp = new THREE.Group();
  [pm, bm].forEach(m => { m.castShadow = true; m.receiveShadow = true; grp.add(m); });
  /* the kit's composition at the centre of the arc */
  const kit = new THREE.Group();
  const lean = MS(new THREE.CapsuleGeometry(.62, 1.9, SOFT ? 8 : 16, SOFT ? 20 : 40), MAT.clay, .45, 1.42, 0); lean.rotation.z = -.5; kit.add(lean);
  kit.add(MS(new THREE.SphereGeometry(.62, SOFT ? 24 : 48, SOFT ? 16 : 32), MAT.clay, -1.05, .62, .4));
  kit.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  /* it stands just past each end of the arc, so it frames the row and never stands in front of a station */
  [-1, 1].forEach(sd => {
    const k = sd < 0 ? kit : kit.clone(), a = arcAt(L, 4 + sd * 5.7);
    k.position.set(a.x - a.nx * 2.4, 0, a.z - a.nz * 2.4); k.rotation.y = -a.a + (sd < 0 ? .5 : 2.6); k.scale.setScalar(1.1); grp.add(k);
  });
  scene.add(grp);
  return grp;
}

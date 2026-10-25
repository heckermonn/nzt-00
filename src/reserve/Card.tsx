import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MEMBER } from './data';
import { DOT, MONO, fontsReady, paintTexture, rng, spaced, wide } from './paint';
import { rv } from './state';

/** ID-1 card, 85.6 × 54 mm, at 10× so it reads in a scene built in metres */
const W = 0.856, H = 0.54, T = 0.008, RAD = 0.032;
const TW = 1536, TH = 970; // one face of the texture; front sits on the top half, back on the bottom

/** where the engraving is: white is cut through the black anodising to bare metal */
function engraving(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  // front
  g.textBaseline = 'alphabetic';
  wide(g, 900, 168); spaced(g, 'P4CE', 104, 252, 10);
  g.font = `500 44px ${MONO}`; spaced(g, 'RESERVE', 110, 330, 22);
  // contactless mark: four arcs
  g.lineWidth = 9; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(1300 + i * 0, 205, 30 + i * 26, -0.62, 0.62); g.stroke(); }
  // measured edge: a millimetre scale along the top right
  for (let i = 0; i <= 40; i++) { const x = 760 + i * 15.5, l = i % 10 === 0 ? 34 : i % 5 === 0 ? 22 : 13; g.fillRect(x, 58, 3, l); }
  g.font = `500 26px ${MONO}`; g.fillText('0', 752, 124); g.fillText('40', 1362, 124);
  g.font = `500 40px ${MONO}`; spaced(g, 'MEMBER', 110, 760, 18);
  g.font = `900 150px ${DOT}`; spaced(g, MEMBER, 100, 900, 14);
  g.lineWidth = 3; g.beginPath(); g.moveTo(1010, 880); g.lineTo(1430, 880); g.stroke();
  g.font = `500 28px ${MONO}`; spaced(g, 'NOT TRANSFERABLE', 1430, 926, 6, 'right');
  // back
  const by = TH;
  g.font = `500 26px ${MONO}`;
  spaced(g, 'P4CE / RESERVE', w / 2, by + 430, 14, 'center');
  g.font = `500 22px ${MONO}`; g.globalAlpha = 0.85;
  spaced(g, 'THIS KEY OPENS THE RESERVE FOR ITS HOLDER ONLY.', w / 2, by + 500, 4, 'center');
  spaced(g, 'IF FOUND, RETURN IT TO P4CE.', w / 2, by + 540, 4, 'center');
  g.globalAlpha = 1; g.lineWidth = 3; g.strokeRect(70, by + 70, w - 140, TH - 140);
}

function useCardMaterials() {
  return useMemo(() => {
    const mask = paintTexture(TW, TH * 2, engraving, false);
    // black anodising over bare aluminium
    const color = paintTexture(TW, TH * 2, (g, w, h) => {
      g.drawImage(mask.image as HTMLCanvasElement, 0, 0);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = '#8a8f94'; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighten'; g.fillStyle = '#141516'; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
    });
    // brushed grain runs the long way; the engraving is frosted
    const rough = paintTexture(TW, TH * 2, (g, w, h) => {
      g.fillStyle = 'rgb(78,78,78)'; g.fillRect(0, 0, w, h);
      const r = rng(7);
      for (let i = 0; i < 2600; i++) { const v = 50 + r() * 70; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(r() * w - 200, r() * h, 200 + r() * 900, 1 + r() * 1.6); }
      g.globalCompositeOperation = 'lighten'; g.globalAlpha = 0.9; g.drawImage(mask.image as HTMLCanvasElement, 0, 0); g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }, false);
    // repaint the derived maps once the engraving has its real fonts
    const sync = () => { color.repaint(); rough.repaint(); };
    fontsReady.then(sync); // runs after the mask's own repaint, which registered first

    const face = new THREE.MeshPhysicalMaterial({
      map: color, roughnessMap: rough, roughness: 1, metalness: 0.92, bumpMap: mask, bumpScale: -1.2,
      anisotropy: 0.75, clearcoat: 0.35, clearcoatRoughness: 0.28, envMapIntensity: 1.6,
    });
    const scan = { value: -1 }, held = { value: 0 };
    face.onBeforeCompile = (sh) => {
      sh.uniforms.uScan = scan; sh.uniforms.uHeld = held; sh.uniforms.uMask = { value: mask };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uScan; uniform float uHeld; uniform sampler2D uMask;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float band = exp(-pow((vMapUv.x - uScan) * 16.0, 2.0));
          float cut = texture2D(uMask, vMapUv).r;
          totalEmissiveRadiance += vec3(1.0, .97, .93) * (band * (.05 + cut * 2.2) + uHeld * cut * .35);`);
    };
    // the machined edge is bright where the anodising was cut away
    const edge = new THREE.MeshPhysicalMaterial({ color: 0xd9dde0, metalness: 1, roughness: 0.2, envMapIntensity: 1.8 });
    return { face, edge, scan, held };
  }, []);
}

function useCardGeometry() {
  return useMemo(() => {
    const s = new THREE.Shape(), x = -W / 2, y = -H / 2;
    s.moveTo(x + RAD, y); s.lineTo(x + W - RAD, y); s.quadraticCurveTo(x + W, y, x + W, y + RAD);
    s.lineTo(x + W, y + H - RAD); s.quadraticCurveTo(x + W, y + H, x + W - RAD, y + H);
    s.lineTo(x + RAD, y + H); s.quadraticCurveTo(x, y + H, x, y + H - RAD);
    s.lineTo(x, y + RAD); s.quadraticCurveTo(x, y, x + RAD, y);
    const geo = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: true, bevelThickness: 0.0016, bevelSize: 0.0016, bevelSegments: 3, curveSegments: 14 });
    geo.translate(0, 0, -T / 2);
    // caps: map the card face onto its half of the texture, back face mirrored so it reads from behind
    const pos = geo.attributes.position, uv = geo.attributes.uv, nrm = geo.attributes.normal, cap = geo.groups[0];
    for (let i = cap.start; i < cap.start + cap.count; i++) {
      const u = (pos.getX(i) + W / 2) / W, v = (pos.getY(i) + H / 2) / H;
      if (nrm.getZ(i) > 0) uv.setXY(i, u, 0.5 + v * 0.5); else uv.setXY(i, 1 - u, v * 0.5);
    }
    uv.needsUpdate = true;
    return geo;
  }, []);
}

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** the member's key: rises into view, is read by a raking light, then drops away as the door answers */
export function KeyCard() {
  const group = useRef<THREE.Group>(null), body = useRef<THREE.Group>(null), sweep = useRef<THREE.PointLight>(null);
  const { face, edge, scan, held } = useCardMaterials();
  const geo = useCardGeometry();
  const fwd = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock }) => {
    const g = group.current, b = body.current; if (!g || !b) return;
    const p = rv.phase, t = rv.tp, cam = camera as THREE.PerspectiveCamera;
    const shown = p === 'reading' || p === 'verified';
    g.visible = shown; if (!shown) { scan.value = -1; return; }
    // hold the card a fixed distance ahead of the lens, sized to the screen
    const dist = 1.5, visW = 2 * dist * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect;
    g.scale.setScalar(Math.min(1, (visW * (cam.aspect < 0.8 ? 0.72 : 0.6)) / W));
    camera.getWorldDirection(fwd);
    g.position.copy(camera.position).addScaledVector(fwd, dist);
    g.quaternion.copy(camera.quaternion);
    const rise = p === 'reading' ? ease(t / 0.95) : 1, drop = p === 'verified' ? ease((t - 0.55) / 0.6) : 0;
    const k = clock.elapsedTime;
    b.position.set(0, -0.75 * (1 - rise) - 0.9 * drop - 0.02, 0);
    b.rotation.set(-1.15 * (1 - rise) + 0.9 * drop + Math.sin(k * 0.8) * 0.035, Math.sin(k * 0.6) * 0.09, 0.18 * (1 - rise));
    // the read: one pass of light across the face, then the number stays lit while the door answers
    const s = p === 'reading' ? (t - 1.0) / 1.25 : 2;
    scan.value = THREE.MathUtils.lerp(-0.12, 1.12, Math.min(1, Math.max(0, s)));
    held.value = p === 'verified' ? 1 : Math.max(0, Math.min(1, s - 0.6));
    if (sweep.current) { sweep.current.position.set(THREE.MathUtils.lerp(-0.62, 0.62, Math.min(1, Math.max(0, s))), 0.05, 0.16); sweep.current.intensity = s > 0 && s < 1 ? 0.15 : 0; }
  });
  return (
    <group ref={group} visible={false}>
      <group ref={body}>
        <mesh geometry={geo} material={[face, edge]} />
        <pointLight ref={sweep} distance={0.9} decay={2} color="#fff6ee" intensity={0} />
        {/* soft key from above left so the brushed grain and the machined edge read before the scan */}
        <pointLight position={[-0.5, 0.55, 0.75]} distance={2.6} decay={2} color="#f3f1ec" intensity={1.4} />
      </group>
    </group>
  );
}

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { lab } from '../state/lab';
import { settled } from '../state/scroll';
import { halfProfile } from './capsule';
import { Dimension } from './Dimension';
import { canvasTexture, laserMat, sectionFace } from './materials';
import { B, P, ease, hero, heroFrom, lerp, sgn, sstep } from './shared';
import { Tag } from './Tag';

const S = 1.55; // specimen scale in the cross-section chamber
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** The thread through the site: one capsule pulled out of the swarm, sectioned, carried to the bench and sealed in the tin. */
export function Specimen() {
  const g = useRef<THREE.Group>(null), scanG = useRef<THREE.Group>(null), ring = useRef<THREE.Mesh>(null), sheet = useRef<THREE.Mesh>(null), powder = useRef<THREE.InstancedMesh>(null), scanTag = useRef<HTMLDivElement>(null);
  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 10), []);
  const mats = useMemo(() => {
    const cap = new THREE.MeshPhysicalMaterial({ color: 0xdfe3e6, metalness: 1, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.15, side: THREE.DoubleSide, clippingPlanes: [clip] });
    const body = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.35, transmission: 0.9, thickness: 0.4, ior: 1.45, side: THREE.DoubleSide, clippingPlanes: [clip] });
    sectionFace(cap, '0.30,0.32,0.34'); sectionFace(body, '0.86,0.88,0.89');
    const pw = new THREE.MeshStandardMaterial({ color: 0xf6f7f7, roughness: 0.9, clippingPlanes: [clip] });
    const band = new THREE.MeshStandardMaterial({ transparent: true, depthWrite: false, clippingPlanes: [clip],
      map: canvasTexture(1024, 128, (c) => { c.fillStyle = 'rgba(30,34,36,.85)'; c.font = '900 64px Doto, monospace'; c.textBaseline = 'middle'; c.fillText('NZT-00', 40, 64); c.fillText('NZT-00', 552, 64); c.fillRect(0, 4, 1024, 3); }) });
    return { cap, body, pw, band };
  }, [clip]);
  const geo = useMemo(() => ({ cap: halfProfile(0.435, -0.12, 1.165, true, 24, 72), body: halfProfile(0.42, -1.165, 0.35, false, 24, 72) }), []);
  const powderInit = useRef(false);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), q2: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3() }), []);

  useFrame((state) => {
    const G = g.current; if (!G) return;
    if (!powderInit.current && powder.current) {
      powderInit.current = true; const o = new THREE.Object3D(); let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 1800; i++) { const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 0.37; o.position.set(Math.cos(a) * rr, -1.05 + r() * 1.75, Math.sin(a) * rr); o.scale.setScalar(0.014 + r() * 0.02); o.updateMatrix(); powder.current.setMatrixAt(i, o.matrix); }
      powder.current.instanceMatrix.needsUpdate = true;
    }
    const { k, t } = lab, lt = settled(k, t), now = state.clock.elapsedTime * 1000, spin = lab.reduce ? 0 : 1;
    const on = k >= 2 && k !== 5 && !(k === 4 && lt > 0.72);
    G.visible = hero.visible = on;
    let cut = 0, laser = false;
    if (on && k === 2) {
      const pull = ease(sstep(0, 0.3, t));
      heroFrom.decompose(tmp.p, tmp.q, tmp.s);
      tmp.q2.setFromEuler(tmp.e.set(0.12, (now / 4000) * spin + t * 2, -1.32, 'ZYX'));
      G.position.copy(tmp.p).lerp(V(0, 0, 4), pull); G.quaternion.copy(tmp.q).slerp(tmp.q2, pull); G.scale.setScalar(lerp(0.2, S, pull));
      cut = sstep(0.38, 0.7, t); laser = t > 0.3;
    } else if (on && k === 3) {
      const e = ease(sstep(0, 0.3, t));
      G.position.copy(V(0, 0, 4)).lerp(V(B.x + 9.5, B.y + 5.2, 2.2), e); G.position.y += Math.sin(e * Math.PI) * 3;
      G.quaternion.setFromEuler(tmp.e.set(0.12, (now / 2500) * spin, lerp(-1.32, -0.3, e), 'ZYX')); G.scale.setScalar(lerp(S, 1.1, e));
      cut = 1 - e; laser = t < 0.1;
    } else if (on && k === 4) {
      const e = ease(sstep(0, 0.3, t)), drop = ease(sstep(0.45, 0.68, lt));
      G.position.copy(V(B.x + 9.5, B.y + 5.2, 2.2)).lerp(V(P.x - 4, P.y + 11.5, 0), e).lerp(V(P.x - 4, P.y + 4, 0), drop); G.position.y += Math.sin(e * Math.PI) * 4;
      G.quaternion.setFromEuler(tmp.e.set(0, (now / 2000) * spin, lerp(-0.3, 0, e))); G.scale.setScalar(1.1);
    }
    hero.position.copy(G.position);
    // the cut plane always faces the camera, so the section is what you see
    const n = tmp.v.copy(state.camera.position).sub(G.position).normalize().negate();
    clip.normal.copy(n); clip.constant = -n.dot(G.position) + lerp(0.8, -0.02, cut) * G.scale.x;
    if (powder.current) powder.current.visible = cut > 0;
    if (ring.current && sheet.current) {
      ring.current.visible = sheet.current.visible = laser;
      const ly = Math.sin(now / 900) * 1.12; ring.current.position.y = sheet.current.position.y = ly; ring.current.scale.setScalar(0.47 + 0.05 * Math.cos(ly));
      sheet.current.lookAt(state.camera.position); sheet.current.position.y = ly;
      if (scanG.current) scanG.current.position.y = ly;
      if (scanTag.current) { scanTag.current.classList.toggle('on', laser && k === 2); scanTag.current.querySelector('b')!.textContent = sgn(ly * 10, 5, 2); }
    }
  });

  const showDims = () => lab.k === 2 && lab.t > 0.3 && lab.t < 0.98;
  return (
    <group ref={g} visible={false}>
      <mesh geometry={geo.cap} material={mats.cap}>
        <mesh position-y={0.35} material={mats.band}><cylinderGeometry args={[0.437, 0.437, 0.16, 96, 1, true]} /></mesh>
      </mesh>
      <mesh geometry={geo.body} material={mats.body} />
      <instancedMesh ref={powder} args={[undefined, mats.pw, 1800]}><icosahedronGeometry args={[1, 1]} /></instancedMesh>
      <mesh ref={ring} rotation-x={Math.PI / 2} material={laserMat}><torusGeometry args={[1, 0.012, 8, 96]} /></mesh>
      <mesh ref={sheet} material={laserMat}><planeGeometry args={[3.2, 0.004]} /></mesh>
      <Dimension a={[0.6, -1.165, 0]} b={[0.6, 1.165, 0]} offset={[0.55, 0, 0]} label="23.3" sub="mm · length" show={showDims} />
      <Dimension a={[-0.42, -0.6, 0]} b={[0.42, -0.6, 0]} offset={[0, -0.85, 0]} label="8.5" sub="mm · Ø" show={showDims} />
      <group ref={scanG}><Tag ref={scanTag} position={[0.7, 0, 0]} flat><b>+00.00</b><span>laser · mm</span></Tag></group>
    </group>
  );
}

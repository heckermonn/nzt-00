import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { COLLECTIONS, R, SLOTS, slotAngle } from './data';
import { MONO, blobTexture, paintTexture, spaced, wide } from './paint';
import { rv, turnTo } from './state';
import { Specimen } from './Specimens';
import { concrete, concreteMap } from './concrete';

/** the Reserve: a ten-sided hall, the door in one wall and a lit niche in each of the other nine */
export const HALL = {
  H: 6, // ceiling
  TH: 0.35, // wall thickness
  W: 2 * R * Math.tan(Math.PI / SLOTS), // width of one wall
  NW: 2.5, NB: 0.5, NH: 3.3, ND: 1.3, // niche width, sill, height, depth
  DW: 1.9, DH: 3.1, // door opening
};
const { H, TH, W, NW, NB, NH, ND, DW, DH } = HALL;
export const PLINTH = 1.05;

/** béton brut throughout: walls, niches, plinths and ceiling are one board-formed pour */
export const wallMat = concrete({ color: 0xa4a4a0, roughness: 0.94 });
const nicheMat = concrete({ color: 0xc2c2be, roughness: 0.88, tile: 0.9 });
const plinthMat = concrete({ color: 0xbdbdb9, roughness: 0.74, tile: 0.7 });
const ceilMat = concrete({ color: 0x7c7c78, roughness: 0.95, tile: 1.6 });
const floorMap = (() => { const t = concreteMap().clone(); t.repeat.set(18, 18); t.needsUpdate = true; return t; })();

/** white pushed past the bloom threshold */
const glow = (k: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.985, 0.96).multiplyScalar(k), toneMapped: false });

/** a slab of wall in slot-local space: x across, y up, z = 0 is the hall face, the slab runs back into -z */
function Slab({ x0, x1, y0, y1 }: { x0: number; x1: number; y0: number; y1: number }) {
  return (
    <mesh material={wallMat} position={[(x0 + x1) / 2, (y0 + y1) / 2, -TH / 2]} receiveShadow>
      <boxGeometry args={[x1 - x0, y1 - y0, TH]} />
    </mesh>
  );
}

/** slot-local frame: origin on the floor at the middle of the wall, +z facing the centre of the hall */
export function SlotFrame({ slot, children }: { slot: number; children: React.ReactNode }) {
  const a = slotAngle(slot);
  return <group position={[Math.sin(a) * R, 0, Math.cos(a) * R]} rotation={[0, a + Math.PI, 0]}>{children}</group>;
}

/** the numeral cut into the back of the niche, debossed so it only reads under light */
function numeralTexture(n: string) {
  return paintTexture(1024, 1352, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9a9a9a'; g.textBaseline = 'alphabetic';
    wide(g, 900, 560); spaced(g, n, w / 2, h * 0.52, 12, 'center');
  }, false);
}

/** signage above each niche, self-lit like an exhibition title wall */
function signTexture(n: string, name: string, line: string) {
  return paintTexture(2048, 640, (g, w) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, 640);
    g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    g.font = `500 54px ${MONO}`; spaced(g, n, w / 2, 150, 20, 'center');
    wide(g, 900, 210); spaced(g, name, w / 2, 400, 14, 'center');
    g.font = `500 50px ${MONO}`; g.globalAlpha = 0.72; spaced(g, line.toUpperCase(), w / 2, 520, 8, 'center'); g.globalAlpha = 1;
  });
}

function Bay({ i }: { i: number }) {
  const c = COLLECTIONS[i];
  const spot = useRef<THREE.SpotLight>(null), target = useRef<THREE.Object3D>(null);
  const parts = useMemo(() => {
    const num = numeralTexture(c.n);
    const back = concrete({ color: 0xc8c8c4, roughness: 0.86, tile: 0.9 }); back.bumpMap = num; back.bumpScale = 3;
    const sign = new THREE.MeshBasicMaterial({ map: signTexture(c.n, c.name, c.line), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const cove = glow(0);
    const blob = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.9 });
    return { back, sign, cove, blob };
  }, [c]);
  const broad = c.form === 'ampoules';
  useFrame(() => {
    const l = rv.light[i];
    if (spot.current) { spot.current.intensity = 70 * Math.pow(l, 1.6); if (target.current) spot.current.target = target.current; }
    parts.sign.color.setScalar(0.06 + 0.94 * l);
    parts.cove.color.setRGB(1, 0.985, 0.96).multiplyScalar(0.2 + 5 * l);
  });
  return (
    <SlotFrame slot={i + 1}>
      <group onClick={(e) => { e.stopPropagation(); if (rv.phase === 'hall') turnTo(i); }}>
        <Slab x0={-W / 2 - 0.3} x1={-NW / 2} y0={0} y1={H} />
        <Slab x0={NW / 2} x1={W / 2 + 0.3} y0={0} y1={H} />
        <Slab x0={-NW / 2} x1={NW / 2} y0={NB + NH} y1={H} />
        <Slab x0={-NW / 2} x1={NW / 2} y0={0} y1={NB} />
        {/* niche */}
        <mesh material={parts.back} position={[0, NB + NH / 2, -ND]} receiveShadow><planeGeometry args={[NW, NH]} /></mesh>
        <mesh material={nicheMat} position={[-NW / 2, NB + NH / 2, -ND / 2]} rotation={[0, Math.PI / 2, 0]} receiveShadow><planeGeometry args={[ND, NH]} /></mesh>
        <mesh material={nicheMat} position={[NW / 2, NB + NH / 2, -ND / 2]} rotation={[0, -Math.PI / 2, 0]} receiveShadow><planeGeometry args={[ND, NH]} /></mesh>
        <mesh material={nicheMat} position={[0, NB + NH, -ND / 2]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[NW, ND]} /></mesh>
        <mesh material={nicheMat} position={[0, NB, -ND / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[NW, ND]} /></mesh>
        <mesh material={parts.cove} position={[0, NB + NH - 0.012, -0.05]}><boxGeometry args={[NW - 0.08, 0.012, 0.03]} /></mesh>
        {/* plinth and specimen */}
        <mesh material={plinthMat} position={[0, NB + PLINTH / 2, -ND * 0.55]} castShadow receiveShadow>
          <boxGeometry args={[broad ? 1.6 : 0.82, PLINTH, 0.72]} />
        </mesh>
        <mesh material={parts.blob} position={[0, NB + PLINTH + 0.002, -ND * 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[broad ? 1.5 : 0.7, 0.62]} />
        </mesh>
        <group position={[0, NB + PLINTH, -ND * 0.55]} rotation={[0, 0.35, 0]} scale={1.35}>
          <Specimen form={c.form} n={c.n} name={c.name} />
        </group>
        <object3D ref={target} position={[0, NB + PLINTH + 0.25, -ND * 0.6]} />
        <spotLight ref={spot} position={[0, NB + NH - 0.04, -0.2]} angle={0.5} penumbra={0.85} decay={2} distance={7} intensity={0} color="#fff5ea"
          castShadow shadow-mapSize={[512, 512]} shadow-bias={-0.0006} shadow-normalBias={0.02} />
        {/* title wall */}
        <mesh material={parts.sign} position={[0, NB + NH + 0.58, 0.004]}><planeGeometry args={[NW + 0.8, (NW + 0.8) * (640 / 2048)]} /></mesh>
      </group>
    </SlotFrame>
  );
}

/** the wall with the door in it; the leaves themselves belong to the door */
function DoorWall() {
  return (
    <SlotFrame slot={0}>
      <Slab x0={-W / 2 - 0.3} x1={-DW / 2} y0={0} y1={H} />
      <Slab x0={DW / 2} x1={W / 2 + 0.3} y0={0} y1={H} />
      <Slab x0={-DW / 2} x1={DW / 2} y0={DH} y1={H} />
    </SlotFrame>
  );
}

/** the room's outline in light: a reveal where each wall meets the floor */
function Lines() {
  const skirt = useMemo(() => glow(1.25), []);
  return (
    <group>
      {Array.from({ length: SLOTS }, (_, k) => (
        <SlotFrame key={k} slot={k}>
          {k === 0
            ? [-1, 1].map((s) => <mesh key={s} material={skirt} position={[s * (W + DW) / 4, 0.015, 0.01]}><boxGeometry args={[(W - DW) / 2, 0.01, 0.01]} /></mesh>)
            : <mesh material={skirt} position={[0, 0.015, 0.01]}><boxGeometry args={[W, 0.01, 0.01]} /></mesh>}
        </SlotFrame>
      ))}
    </group>
  );
}

/** the room wakes from the bay opposite the door outwards once the door parts */
function useBayLight() {
  const wake = useRef(0);
  useFrame((_, dt) => {
    if (rv.phase === 'opening' && rv.tp > 1.1) wake.current += dt;
    else if (rv.phase === 'hall') wake.current += dt;
    for (let i = 0; i < 9; i++) {
      const d = Math.min(Math.abs(i - 4), 9 - Math.abs(i - 4));
      const w = Math.min(1, Math.max(0, (wake.current - 0.1 - 0.22 * d) / 0.5));
      const goal = rv.want[i] * w;
      rv.light[i] += (goal - rv.light[i]) * (1 - Math.exp(-dt * (rv.reduce ? 20 : 3.2)));
    }
  });
}

export function Hall({ narrow }: { narrow: boolean }) {
  useBayLight();
  const oculus = useMemo(() => glow(3.2), []);
  const sky = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.32, 0.33, 0.34), toneMapped: false }), []);
  return (
    <group>
      {COLLECTIONS.map((_, i) => <Bay key={i} i={i} />)}
      <DoorWall />
      {/* floor: dark resin with a soft mirror */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 4]}>
        <planeGeometry args={[30, 30]} />
        <MeshReflectorMaterial resolution={narrow ? 256 : 512} blur={[400, 120]} mixBlur={1} mixStrength={3.2} mirror={0.6}
          roughness={0.78} depthScale={0} metalness={0.2} color="#3c3c3a" map={floorMap} />
      </mesh>
      {/* ceiling and the ring of light over the centre */}
      <mesh material={ceilMat} rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}><circleGeometry args={[R + 1, 10]} /></mesh>
      <mesh material={sky} rotation={[Math.PI / 2, 0, 0]} position={[0, H - 0.01, 0]}><circleGeometry args={[2.3, 64]} /></mesh>
      <mesh material={oculus} rotation={[Math.PI / 2, 0, 0]} position={[0, H - 0.03, 0]}><torusGeometry args={[2.35, 0.03, 8, 128]} /></mesh>
      <pointLight position={[0, H - 0.6, 0]} intensity={22} distance={14} decay={1.6} color="#e9eef2" />
      <hemisphereLight args={['#c8d0d6', '#2a2a28', 0.32]} />
      <Lines />
    </group>
  );
}


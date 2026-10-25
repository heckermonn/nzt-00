import { useMemo } from 'react';
import * as THREE from 'three';
import type { Form } from './data';
import { MONO, paintTexture, spaced, wide } from './paint';

/** lathe a profile given as [radius, height] pairs */
const lathe = (pts: number[][], seg = 72) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

const MAT = {
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transmission: 1, thickness: 0.06, ior: 1.5, envMapIntensity: 1.1, side: THREE.DoubleSide }),
  frost: new THREE.MeshPhysicalMaterial({ color: 0xf2f3f3, roughness: 0.42, transmission: 0.85, thickness: 0.12, ior: 1.5, envMapIntensity: 1 }),
  smoke: new THREE.MeshPhysicalMaterial({ color: 0x1b1d1f, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.4 }),
  liquid: new THREE.MeshPhysicalMaterial({ color: 0xdfe4e6, roughness: 0.05, transparent: true, opacity: 0.55, envMapIntensity: 1.2 }),
  cake: new THREE.MeshStandardMaterial({ color: 0xf1f0ec, roughness: 0.96 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x505457, roughness: 0.75 }),
  bulb: new THREE.MeshPhysicalMaterial({ color: 0x151617, roughness: 0.55, clearcoat: 0.3 }),
  alu: new THREE.MeshPhysicalMaterial({ color: 0xc9cdd0, metalness: 1, roughness: 0.3, anisotropy: 0.6, envMapIntensity: 1.3 }),
  cap: new THREE.MeshPhysicalMaterial({ color: 0x1c1d1f, roughness: 0.38, clearcoat: 0.4 }),
  ring: new THREE.MeshStandardMaterial({ color: 0x8f9396, roughness: 0.6 }),
  /** ampoule glass is thin and catches the spot at every bend; a little roughness keeps the tips from flaring */
  ampGlass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, transmission: 1, thickness: 0.03, ior: 1.5, envMapIntensity: 0.7, specularIntensity: 0.3 }),
};

/** printed vial label: white stock, black type */
function useLabel(n: string, name: string) {
  return useMemo(() => new THREE.MeshStandardMaterial({
    roughness: 0.62, transparent: false,
    map: paintTexture(1024, 400, (g, w, h) => {
      g.fillStyle = '#f2f1ed'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#0d0e0f'; g.textBaseline = 'alphabetic';
      wide(g, 900, 92); spaced(g, 'P4CE', 60, 130, 4);
      g.font = `500 30px ${MONO}`; spaced(g, `${n} / ${name}`, 64, 196, 8);
      g.fillRect(60, 232, w - 120, 3);
      g.font = `500 24px ${MONO}`; spaced(g, 'FREEZE-DRIED · 10 ML VIAL', 64, 288, 5); spaced(g, 'LOT 00-000 · SAMPLE', 64, 330, 5);
    }),
  }), [n, name]);
}

/** freeze-dried powder vial: glass, a dry cake, grey stopper, crimped aluminium seal */
function Vial({ n, name }: { n: string; name: string }) {
  const label = useLabel(n, name);
  const g = useMemo(() => ({
    glass: lathe([[0, 0.004], [0.09, 0], [0.105, 0.006], [0.11, 0.02], [0.11, 0.3], [0.106, 0.317], [0.086, 0.333], [0.075, 0.345], [0.075, 0.368], [0.083, 0.372], [0.085, 0.388], [0.076, 0.394]]),
    cake: lathe([[0, 0.012], [0.098, 0.012], [0.1, 0.02], [0.1, 0.086], [0.094, 0.093], [0.05, 0.097], [0, 0.095]], 48),
    stopper: new THREE.CylinderGeometry(0.071, 0.071, 0.05, 48),
    crimp: lathe([[0.05, 0.408], [0.084, 0.41], [0.088, 0.405], [0.088, 0.36], [0.086, 0.355]]),
    flip: lathe([[0, 0.432], [0.078, 0.432], [0.083, 0.427], [0.083, 0.412], [0.05, 0.41]], 48),
    band: new THREE.CylinderGeometry(0.1112, 0.1112, 0.15, 64, 1, true, -1.15, 2.3),
  }), []);
  return (
    <group scale={1.55}>
      <mesh geometry={g.cake} material={MAT.cake} />
      <mesh geometry={g.glass} material={MAT.glass} />
      <mesh geometry={g.stopper} material={MAT.rubber} position={[0, 0.385, 0]} />
      <mesh geometry={g.crimp} material={MAT.alu} />
      <mesh geometry={g.flip} material={MAT.cap} />
      <mesh geometry={g.band} material={label} position={[0, 0.17, 0]} />
    </group>
  );
}

/** five glass ampoules standing in a machined block */
function Ampoules() {
  const g = useMemo(() => ({
    amp: lathe([[0, 0], [0.03, 0.003], [0.045, 0.015], [0.05, 0.035], [0.05, 0.2], [0.045, 0.22], [0.03, 0.24], [0.018, 0.262], [0.016, 0.272], [0.022, 0.285], [0.03, 0.305], [0.03, 0.32], [0.02, 0.345], [0.008, 0.37], [0, 0.375]], 48),
    fill: lathe([[0, 0.008], [0.04, 0.011], [0.045, 0.03], [0.045, 0.15], [0.02, 0.148], [0, 0.147]], 40),
    ring: new THREE.TorusGeometry(0.019, 0.0035, 10, 40),
    hole: new THREE.CylinderGeometry(0.056, 0.056, 0.004, 40),
  }), []);
  const xs = [-0.26, -0.13, 0, 0.13, 0.26];
  return (
    <group scale={1.9}>
      <mesh material={MAT.alu} position={[0, 0.035, 0]}>
        <boxGeometry args={[0.72, 0.07, 0.17]} />
      </mesh>
      {xs.map((x) => (
        <group key={x} position={[x, 0.03, 0]}>
          <mesh geometry={g.hole} material={MAT.cap} position={[0, 0.041, 0]} />
          <mesh geometry={g.fill} material={MAT.liquid} />
          <mesh geometry={g.amp} material={MAT.ampGlass} />
          <mesh geometry={g.ring} material={MAT.ring} position={[0, 0.268, 0]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      ))}
    </group>
  );
}

function Tin() {
  const g = useMemo(() => ({
    body: lathe([[0, 0], [0.15, 0], [0.16, 0.008], [0.16, 0.17], [0.155, 0.173]]),
    lid: lathe([[0.158, 0.168], [0.163, 0.172], [0.163, 0.222], [0.155, 0.23], [0, 0.231]]),
  }), []);
  return <group scale={1.35}><mesh geometry={g.body} material={MAT.alu} /><mesh geometry={g.lid} material={MAT.alu} /></group>;
}

function Jar() {
  const g = useMemo(() => ({
    body: lathe([[0, 0], [0.12, 0], [0.13, 0.012], [0.13, 0.13], [0.11, 0.142], [0.11, 0.15]]),
    lid: lathe([[0.112, 0.14], [0.124, 0.142], [0.124, 0.2], [0.118, 0.206], [0, 0.207]]),
  }), []);
  return <group scale={1.5}><mesh geometry={g.body} material={MAT.frost} /><mesh geometry={g.lid} material={MAT.cap} /></group>;
}

function Bottle() {
  const g = useMemo(() => ({
    body: lathe([[0, 0], [0.085, 0], [0.09, 0.012], [0.09, 0.22], [0.08, 0.25], [0.04, 0.27], [0.036, 0.29]]),
    cap: lathe([[0.04, 0.27], [0.045, 0.272], [0.045, 0.33], [0.04, 0.335], [0, 0.336]]),
  }), []);
  return <group scale={1.45}><mesh geometry={g.body} material={MAT.smoke} /><mesh geometry={g.cap} material={MAT.alu} /></group>;
}

function Dropper() {
  const g = useMemo(() => ({
    body: lathe([[0, 0.002], [0.06, 0], [0.068, 0.01], [0.068, 0.16], [0.06, 0.18], [0.03, 0.195], [0.028, 0.21]]),
    fill: lathe([[0, 0.006], [0.062, 0.008], [0.064, 0.02], [0.064, 0.11], [0, 0.108]], 40),
    collar: lathe([[0.03, 0.2], [0.036, 0.202], [0.036, 0.245], [0.03, 0.25], [0.018, 0.25]]),
    bulb: lathe([[0.018, 0.248], [0.024, 0.255], [0.026, 0.3], [0.02, 0.33], [0.008, 0.342], [0, 0.344]], 40),
  }), []);
  return (
    <group scale={1.6}>
      <mesh geometry={g.fill} material={MAT.liquid} />
      <mesh geometry={g.body} material={MAT.glass} />
      <mesh geometry={g.collar} material={MAT.alu} />
      <mesh geometry={g.bulb} material={MAT.bulb} />
    </group>
  );
}

export function Specimen({ form, n, name }: { form: Form; n: string; name: string }) {
  switch (form) {
    case 'vial': return <Vial n={n} name={name} />;
    case 'ampoules': return <Ampoules />;
    case 'tin': return <Tin />;
    case 'jar': return <Jar />;
    case 'bottle': return <Bottle />;
    default: return <Dropper />;
  }
}

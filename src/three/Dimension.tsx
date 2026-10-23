import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { INK } from './materials';

type V3 = [number, number, number];
const mat = new THREE.LineBasicMaterial({ color: INK, depthTest: false, transparent: true, opacity: 0.85 });

/** an engineering dimension: extension lines, a dimension line with ticks, and the value. Lives in its parent's space. */
export function Dimension({ a, b, offset, label, sub, show }: { a: V3; b: V3; offset: V3; label: string; sub?: string; show: () => boolean }) {
  const g = useRef<THREE.LineSegments>(null), tag = useRef<HTMLDivElement>(null);
  const { geo, mid } = useMemo(() => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), O = new THREE.Vector3(...offset);
    const a2 = A.clone().add(O), b2 = B.clone().add(O), n = O.clone().normalize(), tick = n.clone().multiplyScalar(0.12);
    const pts = [A.clone().addScaledVector(O, 0.15), a2.clone().add(tick), B.clone().addScaledVector(O, 0.15), b2.clone().add(tick), a2, b2,
      a2.clone().sub(tick), a2.clone().add(tick), b2.clone().sub(tick), b2.clone().add(tick)];
    return { geo: new THREE.BufferGeometry().setFromPoints(pts), mid: a2.clone().lerp(b2, 0.5).addScaledVector(n, 0.35) };
  }, [a, b, offset]);
  useFrame(() => { const on = show(); if (g.current) g.current.visible = on; tag.current?.classList.toggle('on', on); });
  return (
    <>
      <lineSegments ref={g} geometry={geo} material={mat} renderOrder={10} />
      <Html position={mid.toArray()} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={tag} className="dim"><b>{label}</b>{sub && <span>{sub}</span>}</div>
      </Html>
    </>
  );
}

import { useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import tinUrl from '../assets/models/tin.glb';
import pouchUrl from '../assets/models/pouch.glb';
import { lab } from '../state/lab';
import { settled } from '../state/scroll';
import { Dimension } from './Dimension';
import { Blob } from './Lab';
import { reskin } from './materials';
import { P, sstep, MESHOPT } from './shared';
import { Tag } from './Tag';

/** Station 04: the aluminium tin opens to receive the specimen; the foil refill pouch turns with scroll or a drag. */
export function Pack() {
  const tin = useGLTF(tinUrl, false, MESHOPT), pouch = useGLTF(pouchUrl, false, MESHOPT);
  const tinScene = useMemo(() => reskin(tin.scene), [tin.scene]);
  const pouchScene = useMemo(() => reskin(pouch.scene), [pouch.scene]);
  const lid = useMemo(() => { const l = tinScene.getObjectByName('tin_lid')!; return { o: l, y: l.position.y, z: l.position.z }; }, [tinScene]);
  const tinG = useRef<THREE.Group>(null), pouchG = useRef<THREE.Group>(null), tinTag = useRef<HTMLDivElement>(null), pouchTag = useRef<HTMLDivElement>(null);
  const plinth = useMemo(() => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.7, thickness: 0.5 }), []);

  const grab = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType !== 'mouse') return; e.stopPropagation();
    let x = e.clientX; document.body.style.cursor = 'grabbing';
    const move = (ev: PointerEvent) => { lab.pouchSpin += (ev.clientX - x) * 0.008; x = ev.clientX; };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); document.body.style.cursor = ''; };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  };

  useFrame((state) => {
    const { k, t } = lab, lt = settled(k, t), now = state.clock.elapsedTime * 1000;
    const open = k === 4 ? sstep(0.1, 0.4, lt) - sstep(0.72, 0.9, lt) : 0;
    lid.o.position.y = lid.y + open * 2.8; lid.o.position.z = lid.z - open * 1.4; lid.o.rotation.x = -open * 0.3;
    if (tinG.current) tinG.current.rotation.y = -0.35 + Math.sin(now / 5000) * 0.05;
    if (pouchG.current) pouchG.current.rotation.set(-0.08, -0.5 + (k === 4 ? lt * 1.4 : 0) + lab.pouchSpin, 0);
    const tags = k === 4 && lt > 0.02 && lt < 0.92;
    tinTag.current?.classList.toggle('on', tags); pouchTag.current?.classList.toggle('on', tags);
  });

  return (
    <group>
      <mesh position={[P.x - 4, P.y + 0.25, 0]} material={plinth}><cylinderGeometry args={[4.2, 4.4, 0.5, 96]} /></mesh>
      <Blob x={P.x - 4} z={0} sx={10} sz={10} /><Blob x={P.x + 5} z={-1} sx={12} sz={6} />
      <group ref={tinG} position={[P.x - 4, P.y + 0.5, 0]} scale={0.82}>
        <primitive object={tinScene} />
        <Dimension a={[-2.8, 0, 1.4]} b={[2.8, 0, 1.4]} offset={[0, -0.7, 0]} label="56" sub="mm" show={() => lab.k === 4 && settled(4, lab.t) > 0.1 && settled(4, lab.t) < 0.9} />
        <Tag ref={tinTag} position={[0, 9.6, 0]}><b>TIN-60</b>Anodised aluminium<span>56 × 24 × 84 mm</span></Tag>
      </group>
      <group ref={pouchG} position={[P.x + 5, P.y + 0.1, -1]} scale={0.72} onPointerDown={grab}
        onPointerOver={() => { document.body.style.cursor = 'grab'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
        <primitive object={pouchScene} />
        <Tag ref={pouchTag} position={[0, 14.4, 0]}><b>RF-30</b>Refill pouch<span>vacuum · N₂</span></Tag>
      </group>
    </group>
  );
}
useGLTF.preload(tinUrl); useGLTF.preload(pouchUrl);

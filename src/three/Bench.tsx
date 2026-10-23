import { useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import vialUrl from '../assets/models/vial.glb';
import ampouleUrl from '../assets/models/ampoule.glb';
import dropperUrl from '../assets/models/dropper.glb';
import { INGREDIENTS } from '../data/formulas';
import { blip } from '../audio/sound';
import { lab, useUI } from '../state/lab';
import { settled } from '../state/scroll';
import { Blob } from './Lab';
import { M, laserMat, reskin } from './materials';
import { B, lerp, sstep } from './shared';
import { Tag } from './Tag';

interface Vial { root: THREE.Object3D; liquid: THREE.Object3D; y0: number; s0: number; fill: number; x: number; z: number; lift: number }

/** Station 03: twelve ingredient vials in a machined rack, a dropper that doses V-04, ampoules, and a laser that scans the row. */
export function Bench() {
  const vial = useGLTF(vialUrl), amp = useGLTF(ampouleUrl), drop = useGLTF(dropperUrl);
  const vials = useMemo<Vial[]>(() => {
    reskin(vial.scene);
    return INGREDIENTS.map((_, i) => {
      const root = vial.scene.clone(true), liquid = root.getObjectByName('vial_liquid')!;
      return { root, liquid, y0: liquid.position.y, s0: liquid.scale.y, fill: i === 11 ? 0.12 : 0.35 + ((i * 37) % 10) / 16, x: B.x + (i % 6 - 2.5) * 2.1, z: i < 6 ? -1.05 : 1.05, lift: 0 };
    });
  }, [vial.scene]);
  const amps = useMemo(() => { reskin(amp.scene); return [0, 1, 2, 3, 4].map(() => amp.scene.clone(true)); }, [amp.scene]);
  const dropper = useMemo(() => reskin(drop.scene), [drop.scene]);
  const groups = useRef<(THREE.Group | null)[]>([]), tags = useRef<(HTMLDivElement | null)[]>([]);
  const rig = useRef<THREE.Group>(null), droplet = useRef<THREE.Mesh>(null), beam = useRef<THREE.Group>(null), reticle = useRef<THREE.Mesh>(null);
  const hover = useRef(-1), scanHit = useRef(-1);

  const over = (i: number) => (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); hover.current = i; useUI.getState().setHoverVial(i); document.body.style.cursor = 'pointer'; };
  const out = (i: number) => () => { if (hover.current === i) { hover.current = -1; useUI.getState().setHoverVial(-1); document.body.style.cursor = ''; } };
  const click = (i: number) => (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); vials[i].lift = 2.4; blip(880, 0.06); };

  useFrame((_, dt) => {
    const { k, t } = lab, lt = settled(k, t), active = k === 3;
    const scanX = B.x + lerp(-7.5, 7.5, sstep(0.42, 0.88, lt)), scanning = active && lt > 0.4 && lt < 0.9;
    if (beam.current) { beam.current.visible = scanning; beam.current.position.x = scanX; }
    vials.forEach((v, i) => {
      const g = groups.current[i]; if (!g) return;
      const want = active && hover.current === i ? 1.6 : 0; v.lift += (want - v.lift) * Math.min(1, dt * 8);
      g.position.y = B.y + 1 + v.lift; if (hover.current === i) g.rotation.y += dt * 1.5;
      const scanned = scanning && Math.abs(v.x - scanX) < 0.5;
      if (scanned && scanHit.current !== i) { scanHit.current = i; blip(1800 + i * 40, 0.03, 'sine', 0.02); }
      const tg = tags.current[i];
      if (tg) { tg.classList.toggle('on', active && (hover.current === i || scanned || (lt > 0.88 && i < 6) || (lt > 0.02 && lt < 0.4 && i === 3))); tg.classList.toggle('hot', scanned || hover.current === i); }
      // liquid level grows from the bottom of the vial
      let f = v.fill; if (i === 3) f += sstep(0.28, 0.33, lt) * 0.12;
      v.liquid.scale.y = v.s0 * f; v.liquid.position.y = v.y0 - v.s0 * (1 - f);
    });
    // dropper descends over V-04 and releases one drop
    const v3 = vials[3], dd = sstep(0.05, 0.25, lt) - sstep(0.32, 0.45, lt), dp = sstep(0.22, 0.3, lt);
    if (rig.current) { rig.current.visible = active || (k === 2 && t > 0.9); rig.current.position.set(v3.x, B.y + 12 - dd * 4.2, v3.z); }
    if (droplet.current) { droplet.current.visible = active && dp > 0 && dp < 1; droplet.current.position.set(v3.x, lerp(B.y + 7.1, B.y + 3.4, dp * dp), v3.z); }
    if (reticle.current) { reticle.current.visible = active && lt > 0.05 && lt < 0.4; reticle.current.position.set(v3.x, B.y + 5.9, v3.z); reticle.current.rotation.z += dt; }
  });

  return (
    <group>
      {/* machined rack */}
      <group position={B.toArray()}>
        <mesh position-y={1.4} material={M.alu}><boxGeometry args={[13.6, 0.5, 4.6]} /></mesh>
        {[-6.5, 6.5].map((x) => <mesh key={x} position={[x, 0.7, 0]} material={M.alu}><boxGeometry args={[0.5, 1.4, 4.6]} /></mesh>)}
        <mesh position-y={0.06} material={M.alu_dark}><boxGeometry args={[13.6, 0.12, 4.6]} /></mesh>
        {vials.map((v, i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[v.x - B.x, 1.655, v.z]}><circleGeometry args={[0.86, 48]} /><meshBasicMaterial color={0x1a1d1f} /></mesh>)}
      </group>
      <Blob x={B.x} z={0} sx={17} sz={7} />
      {vials.map((v, i) => (
        <group key={i} ref={(el) => { groups.current[i] = el; }} position={[v.x, B.y + 1, v.z]} scale={1.25}
          onPointerOver={over(i)} onPointerOut={out(i)} onClick={click(i)}>
          <primitive object={v.root} />
          <Tag ref={(el) => { tags.current[i] = el; }} position={[0, 3.7, 0]}>
            <b>{INGREDIENTS[i][0]}</b>{INGREDIENTS[i][1]}<span>{INGREDIENTS[i][2]}</span>
          </Tag>
        </group>
      ))}
      {/* ampoule stand */}
      <group position={[B.x + 10.5, B.y, -1.2]}>
        <mesh position-y={0.17} material={M.alu}><boxGeometry args={[8.2, 0.35, 1.8]} /></mesh>
        {amps.map((a, i) => <primitive key={i} object={a} position={[(i - 2) * 1.5, 0.3, 0]} scale={1.15} />)}
      </group>
      <Blob x={B.x + 10.5} z={-1.2} sx={10} sz={3} />
      <group ref={rig} rotation-y={0.4} scale={1.3}><primitive object={dropper} /></group>
      <mesh ref={droplet} material={M.liquid}><sphereGeometry args={[0.09, 16, 12]} /></mesh>
      <mesh ref={reticle} rotation-x={-Math.PI / 2} material={laserMat}><ringGeometry args={[1.0, 1.03, 64, 1, 0, Math.PI * 1.6]} /></mesh>
      {/* scanning laser: a vertical blade with a fan across the rack */}
      <group ref={beam} position={[B.x, B.y + 3.6, 0]}>
        <mesh material={laserMat}><planeGeometry args={[0.02, 6]} /></mesh>
        <mesh position-y={-2.6} rotation-x={Math.PI / 2} material={laserMat}><planeGeometry args={[0.01, 5.2]} /></mesh>
      </group>
    </group>
  );
}
useGLTF.preload(vialUrl); useGLTF.preload(ampouleUrl); useGLTF.preload(dropperUrl);

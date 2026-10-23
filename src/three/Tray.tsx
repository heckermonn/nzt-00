import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import trayUrl from '../assets/models/tray.glb';
import { FORMULAS } from '../data/formulas';
import { lab } from '../state/lab';
import { settled } from '../state/scroll';
import { bodyGeo, capGeo } from './capsule';
import { Blob } from './Lab';
import { M, bodyMat, reskin } from './materials';
import { D, sstep, MESHOPT } from './shared';
import { Tag } from './Tag';

const R = 5.6; // well radius on the Blender tray

/** Station 05: the 30-well indexing tray. It steps one well per scroll beat and per dispense; filled wells hold upright capsules. */
export function Tray() {
  const tray = useGLTF(trayUrl, false, MESHOPT);
  const scene = useMemo(() => reskin(tray.scene, (n) => (n.startsWith('tray_disc') ? M.alu : n.startsWith('tray_numbers') ? M.plastic_black : undefined)), [tray.scene]);
  const capM = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.22 }), []);
  const geo = useMemo(() => ({ cap: capGeo(12, 32), body: bodyGeo(12, 32) }), []);
  const disc = useRef<THREE.Group>(null), caps = useRef<THREE.InstancedMesh>(null), bodies = useRef<THREE.InstancedMesh>(null);
  const wellG = useRef<THREE.Group>(null), wellTag = useRef<HTMLDivElement>(null);
  const seen = useRef(-1), idx = useRef(0);

  useFrame((_, dt) => {
    if (caps.current && bodies.current && seen.current !== lab.wellsVersion) {
      seen.current = lab.wellsVersion; const m = new THREE.Matrix4(), c = new THREE.Color();
      lab.wells.forEach((f, i) => {
        const a = (i / 30) * Math.PI * 2;
        m.compose(new THREE.Vector3(R * Math.cos(a), 1.47, -R * Math.sin(a)), new THREE.Quaternion(), new THREE.Vector3().setScalar(f >= 0 ? 1 : 0));
        caps.current!.setMatrixAt(i, m); bodies.current!.setMatrixAt(i, m); caps.current!.setColorAt(i, c.set(f >= 0 ? FORMULAS[f].tint : 0xffffff));
      });
      caps.current.instanceMatrix.needsUpdate = bodies.current.instanceMatrix.needsUpdate = true;
      if (caps.current.instanceColor) caps.current.instanceColor.needsUpdate = true;
    }
    const { k, t } = lab, lt = settled(k, t);
    const target = (k === 5 ? Math.floor(sstep(0.05, 0.95, lt) * 5) : 0) + lab.trayIndex;
    idx.current += (target - idx.current) * Math.min(1, dt * 14);
    if (disc.current) disc.current.rotation.y = (idx.current * Math.PI * 2) / 30;
    lab.wellFlash = Math.max(0, lab.wellFlash - dt);
    if (wellG.current && lab.lastWell >= 0) { const a = (lab.lastWell / 30) * Math.PI * 2; wellG.current.position.set(R * Math.cos(a), 2.9, -R * Math.sin(a)); }
    wellTag.current?.classList.toggle('on', k === 5 && lab.wellFlash > 0);
  });

  return (
    <>
    <Blob x={D.x} z={D.z} sx={18} sz={18} />
    <group position={[D.x, D.y + 0.02, D.z]}>
      <group ref={disc}>
        <primitive object={scene} />
        <instancedMesh ref={caps} args={[geo.cap, capM, 30]} />
        <instancedMesh ref={bodies} args={[geo.body, bodyMat, 30]} />
        <group ref={wellG}><Tag ref={wellTag} flat><b id="wellCode">W-10</b><span id="wellName">dispensed</span></Tag></group>
      </group>
    </group>
    </>
  );
}
useGLTF.preload(trayUrl);

import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { AdaptiveDpr, Preload } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { lab } from '../state/lab';
import { Bench } from './Bench';
import { CameraRig } from './CameraRig';
import { Effects } from './Effects';
import { Entry } from './Entry';
import { Lab } from './Lab';
import { Pack } from './Pack';
import { Specimen } from './Specimen';
import { Swarm } from './Swarm';
import { Tray } from './Tray';

/** clean-room reflections: three's procedural room, prefiltered once, so no HDR file has to load */
function Room() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.03).texture;
    scene.environment = env; gl.localClippingEnabled = true;
    return () => { env.dispose(); pm.dispose(); };
  }, [gl, scene]);
  return null;
}

/** fog reaches further on a phone, where the camera stands back to fit the stations */
function Fog() {
  const { scene, size } = useThree();
  useEffect(() => { const f = scene.fog as THREE.Fog | null; if (f) { const narrow = size.width / size.height < 0.9; f.near = narrow ? 40 : 22; f.far = narrow ? 120 : 70; } }, [scene, size]);
  return null;
}

export function Experience() {
  useEffect(() => {
    const enter = () => { lab.pointerIn = true; }, leave = () => { lab.pointerIn = false; };
    addEventListener('pointermove', enter); document.documentElement.addEventListener('pointerleave', leave);
    return () => { removeEventListener('pointermove', enter); document.documentElement.removeEventListener('pointerleave', leave); };
  }, []);
  return (
    <div className="stage" aria-label="3D laboratory: NZT-00 capsules, assay vials and packaging, driven by scrolling">
      <Canvas dpr={[1, 1.75]} camera={{ fov: 32, near: 0.05, far: 300, position: [0, 1, 18] }}
        gl={{ antialias: false, powerPreference: 'high-performance' }} eventPrefix="client">
        <Room />
        <Lab />
        <Fog />
        <Entry />
        <CameraRig />
        <Swarm />
        <Specimen />
        <Suspense fallback={null}>
          <Bench />
          <Pack />
          <Tray />
          <Preload all />
        </Suspense>
        <Effects />
        <AdaptiveDpr pixelated={false} />
      </Canvas>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, Environment, Lightformer } from '@react-three/drei';
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { KeyCard } from './Card';
import { Door } from './Door';
import { Hall } from './Hall';
import { Rig } from './Rig';

/** shadows are cast by things that never move, so the maps render once the scene has settled */
function ShadowsOnce() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  useEffect(() => { gl.shadowMap.autoUpdate = false; }, [gl]);
  useFrame(() => { const f = ++frames.current; if (f === 3 || f === 60) gl.shadowMap.needsUpdate = true; });
  return null;
}

/** studio reflections for the metal: a ring overhead like the oculus, two tall strips either side */
function Reflections() {
  return (
    <Environment resolution={256} frames={1} environmentIntensity={0.22}>
      <color attach="background" args={['#050505']} />
      <Lightformer form="ring" intensity={3} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={4} />
      <Lightformer form="rect" intensity={2.2} position={[-5, 2, 1]} rotation={[0, Math.PI / 2, 0]} scale={[1.2, 7, 1]} />
      <Lightformer form="rect" intensity={1.4} position={[5, 2, -1]} rotation={[0, -Math.PI / 2, 0]} scale={[0.6, 7, 1]} />
      <Lightformer form="rect" intensity={1.2} position={[0, 3, 6]} rotation={[0, Math.PI, 0]} scale={[6, 0.5, 1]} />
    </Environment>
  );
}

export function Scene({ narrow }: { narrow: boolean }) {
  return (
    <div className="stage" aria-hidden="true">
      <Canvas shadows="percentage" dpr={[1, 1.75]} camera={{ fov: 44, near: 0.05, far: 80, position: [0, 1.6, 12] }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}>
        <color attach="background" args={['#050606']} />
        <fog attach="fog" args={['#050606', 9, 26]} />
        <ShadowsOnce />
        <Reflections />
        <Hall narrow={narrow} />
        <Door />
        <KeyCard />
        <Rig />
        <EffectComposer multisampling={narrow ? 0 : 4}>
          <Bloom mipmapBlur luminanceThreshold={1.1} luminanceSmoothing={0.15} intensity={0.7} radius={0.7} />
          <ToneMapping mode={ToneMappingMode.AGX} />
          <Vignette offset={0.32} darkness={0.72} />
          <Noise opacity={0.045} blendFunction={BlendFunction.SOFT_LIGHT} />
        </EffectComposer>
        <AdaptiveDpr pixelated={false} />
      </Canvas>
    </div>
  );
}

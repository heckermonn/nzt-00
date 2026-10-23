import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing';
import * as THREE from 'three';
import { lab } from '../state/lab';
import { hero } from './shared';

/** Bloom only catches the laser (it is the one thing over 1.0); depth of field opens up while the specimen is sectioned. */
export function Effects() {
  const dof = useRef<DepthOfFieldEffect>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const d = dof.current; if (!d) return;
    const want = lab.k === 2 && lab.t > 0.3 ? 4 : 0;
    d.bokehScale += (want - d.bokehScale) * Math.min(1, dt * 3);
    target.copy(hero.position);
  });
  return (
    <EffectComposer multisampling={4}>
      <DepthOfField ref={dof} target={target} worldFocusRange={3} bokehScale={0} />
      <Bloom mipmapBlur luminanceThreshold={1.6} luminanceSmoothing={0.1} intensity={0.45} radius={0.55} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

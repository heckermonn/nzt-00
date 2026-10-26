import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FACE } from './Door';
import { cameraX, scrollU, smooth } from './line';
import { rv, useReserve } from './state';

const ease = (t: number) => { t = Math.min(1, Math.max(0, t)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const DOOR_EYE = new THREE.Vector3(0, 1.6, FACE + 5.1), DOOR_AIM = new THREE.Vector3(0, 1.84, FACE);
const PUSH = 0.35; // the camera leans in while the key is read

/** the scene's clock: the read, the answer and the door run on their own once the key is presented */
function usePhases() {
  useFrame((_, dt) => {
    rv.tp += Math.min(dt, 0.1);
    const set = useReserve.getState().setPhase, t = rv.tp;
    if (rv.phase === 'reading' && t > 2.45) { set('verified'); navigator.vibrate?.([14, 60, 14]); }
    else if (rv.phase === 'verified' && t > 1.3) set('opening');
    else if (rv.phase === 'opening' && t > (rv.reduce ? 1.8 : 3.8)) set('hall');
  });
}

/** where the camera stands on the Line at scroll u, and what it looks at */
function linePose(u: number, narrow: boolean, pos: THREE.Vector3, aim: THREE.Vector3) {
  const x = cameraX(u), enter = smooth(u / 0.8);
  // from the doorway the line runs away to the right; the camera turns down it and steps up to the belt
  const z = THREE.MathUtils.lerp(4.6, narrow ? 4.1 : 3.3, enter), y = THREE.MathUtils.lerp(1.65, narrow ? 1.85 : 1.75, enter);
  pos.set(x, y, z);
  // on a wide screen the product sits right of centre, clear of the batch record on the left
  aim.set(x + (narrow ? 0.4 : -0.35) + 2.6 * (1 - enter), narrow ? 1.25 : 1.4, 0);
  return pos;
}

export function Rig() {
  usePhases();
  const v = useMemo(() => ({ pos: new THREE.Vector3(), aim: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), par: new THREE.Vector2() }), []);
  useFrame(({ camera, pointer, clock }, dt) => {
    const cam = camera as THREE.PerspectiveCamera, p = rv.phase, t = rv.tp, narrow = cam.aspect < 0.8;
    // lens: wider on a phone held upright
    const fov = narrow ? 64 : cam.aspect < 1.25 ? 56 : 50;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    // the page's scroll runs the line; the camera follows with a little weight
    const target = p === 'hall' ? scrollU() : 0;
    rv.u += (target - rv.u) * (1 - Math.exp(-dt * (rv.reduce ? 30 : 5)));
    v.par.lerp(pointer, 1 - Math.exp(-dt * 2));
    const k = clock.elapsedTime;

    if (p === 'door' || p === 'reading' || p === 'verified') {
      const push = p === 'door' ? 0 : p === 'reading' ? ease(t / 2.4) : 1;
      v.pos.copy(DOOR_EYE); v.pos.z -= PUSH * push; v.aim.copy(DOOR_AIM);
      v.pos.x += v.par.x * 0.12; v.pos.y += v.par.y * 0.06;
    } else if (p === 'opening') {
      const m = ease((t - 0.7) / (rv.reduce ? 1 : 3.0));
      v.a.copy(DOOR_EYE); v.a.z -= PUSH;
      linePose(0, narrow, v.b, v.aim);
      v.pos.lerpVectors(v.a, v.b, m);
      v.aim.lerpVectors(DOOR_AIM, v.aim, m);
    } else {
      linePose(rv.u, narrow, v.pos, v.aim);
      v.pos.x += v.par.x * 0.06; v.pos.y += v.par.y * 0.03;
    }
    v.pos.y += Math.sin(k * 0.7) * 0.01; // breathing
    cam.position.copy(v.pos);
    cam.lookAt(v.aim);
  });
  return null;
}

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { R, slotAngle } from './data';
import { FACE } from './Door';
import { rv, useReserve } from './state';

const ease = (t: number) => { t = Math.min(1, Math.max(0, t)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const DOOR_EYE = new THREE.Vector3(0, 1.6, FACE + 5.1), DOOR_AIM = new THREE.Vector3(0, 1.84, FACE);
const PUSH = 0.35; // the camera leans in while the key is read
const STAND = 1.7; // you stand off-centre, towards the bay you face

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

/** where the camera looks in the hall for a heading given in slots */
function hallAim(yaw: number, y: number, out: THREE.Vector3) {
  const a = slotAngle(yaw);
  return out.set(Math.sin(a) * R, y, Math.cos(a) * R);
}

/** where you stand for a heading: a step out from the centre towards the bay */
function standAt(yaw: number, out: THREE.Vector3) {
  const a = slotAngle(yaw);
  return out.set(Math.sin(a) * STAND, 1.62, Math.cos(a) * STAND);
}

/** drag, wheel and arrow keys turn you round the hall a bay at a time */
function useTurning() {
  const { gl, size } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    let down: { x: number; aim: number } | null = null, lastWheel = 0;
    const settle = () => { let a = Math.round(rv.aim); if (((a % 10) + 10) % 10 === 0) a += rv.aim >= a ? 1 : -1; rv.aim = a; };
    const pd = (e: PointerEvent) => { if (rv.phase !== 'hall') return; down = { x: e.clientX, aim: rv.aim }; el.setPointerCapture(e.pointerId); };
    const pm = (e: PointerEvent) => { if (down) rv.aim = down.aim - (e.clientX - down.x) / (size.width * 0.28); };
    const pu = () => { if (down) { down = null; settle(); } };
    const wh = (e: WheelEvent) => {
      if (rv.phase !== 'hall') return; e.preventDefault();
      const now = performance.now(); if (now - lastWheel < 380 || Math.abs(e.deltaY) + Math.abs(e.deltaX) < 4) return;
      lastWheel = now; rv.aim += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) > 0 ? 1 : -1; settle();
    };
    const kd = (e: KeyboardEvent) => {
      if (rv.phase !== 'hall' || (e.target as HTMLElement).closest?.('input,textarea')) return;
      if (e.key === 'ArrowRight') { rv.aim += 1; settle(); } else if (e.key === 'ArrowLeft') { rv.aim -= 1; settle(); }
    };
    el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu);
    el.addEventListener('wheel', wh, { passive: false }); addEventListener('keydown', kd);
    return () => {
      el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm); el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu);
      el.removeEventListener('wheel', wh); removeEventListener('keydown', kd);
    };
  }, [gl, size.width]);
}

export function Rig() {
  usePhases();
  useTurning();
  const v = useMemo(() => ({ pos: new THREE.Vector3(), aim: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), look: new THREE.Vector3(), par: new THREE.Vector2() }), []);
  const bay = useRef(-1);
  useFrame(({ camera, pointer, clock }, dt) => {
    const cam = camera as THREE.PerspectiveCamera, p = rv.phase, t = rv.tp;
    // lens: wider on a phone held upright
    const fov = cam.aspect < 0.8 ? 64 : cam.aspect < 1.25 ? 56 : 50;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const aimY = cam.aspect < 0.8 ? 2.2 : 2.4;
    rv.yaw += (rv.aim - rv.yaw) * (1 - Math.exp(-dt * (rv.reduce ? 30 : 4.2)));
    v.par.lerp(pointer, 1 - Math.exp(-dt * 2));
    const k = clock.elapsedTime;

    if (p === 'door' || p === 'reading' || p === 'verified') {
      const push = p === 'door' ? 0 : p === 'reading' ? ease(t / 2.4) : 1;
      v.pos.copy(DOOR_EYE); v.pos.z -= PUSH * push; v.aim.copy(DOOR_AIM);
      v.pos.x += v.par.x * 0.12; v.pos.y += v.par.y * 0.06;
    } else if (p === 'opening') {
      const m = ease((t - 0.7) / (rv.reduce ? 1 : 3.0));
      v.a.copy(DOOR_EYE); v.a.z -= PUSH;
      hallAim(rv.yaw, aimY, v.b);
      v.pos.lerpVectors(v.a, standAt(rv.yaw, v.look), m);
      v.aim.lerpVectors(DOOR_AIM, v.b, m);
    } else {
      v.pos.copy(standAt(rv.yaw, v.look)); v.pos.x += v.par.x * 0.08; v.pos.y += v.par.y * 0.04;
      hallAim(rv.yaw, aimY, v.aim);
    }
    v.pos.y += Math.sin(k * 0.7) * 0.012; // breathing
    cam.position.copy(v.pos);
    cam.lookAt(v.aim);

    // report the bay you face to the interface
    const slot = ((Math.round(rv.yaw) % 10) + 10) % 10, b = slot === 0 ? -1 : slot - 1;
    if (b !== bay.current) { bay.current = b; if (b >= 0) useReserve.getState().setBay(b); }
  });
  return null;
}

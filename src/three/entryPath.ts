import * as THREE from 'three';
import { lab } from '../state/lab';
import { ease, sstep } from './shared';

/** the way in sits behind the lab's opening shot, on the same axis, so walking out of the airlock lands on the hero view */
export const ENTRY = {
  /** outer door (vestibule side) and inner door (lab side) */
  outerZ: 44,
  innerZ: 31,
  floorY: -1.9,
  ceilY: 2.9,
  /** half width of the airlock */
  hw: 1.9,
  /** half width of the door openings */
  dw: 1.3,
  doorTop: 2.1,
};

const DOOR_EYE = new THREE.Vector3(0, 0.3, 53.4), DOOR_AIM = new THREE.Vector3(0, 0.25, ENTRY.outerZ);
const LOCK_EYE = new THREE.Vector3(0, 0.45, 40.4), LOCK_AIM = new THREE.Vector3(0, 0.35, ENTRY.innerZ);

/** how far the outer and inner door leaves have slid open, 0..1 */
export const outerOpen = () => (lab.entry.phase === 'door' ? 0 : lab.entry.phase === 'opening' ? sstep(0.15, 1.7, lab.entry.tp) : 1);
export const innerOpen = () => (lab.entry.phase === 'exit' ? sstep(0, 1.3, lab.entry.tp) : lab.entry.phase === 'lab' ? 1 : 0);

/** camera on the entry path: pressed up to the door, carried through it, then held in the airlock */
export function entryPose(out: { pos: THREE.Vector3; aim: THREE.Vector3 }) {
  const e = lab.entry, t = performance.now() / 1000;
  if (e.phase === 'door') {
    out.pos.copy(DOOR_EYE); out.aim.copy(DOOR_AIM);
    out.pos.z -= e.hold * 0.5; // lean in while the bolts draw
  } else if (e.phase === 'opening') {
    const m = ease(Math.min(1, Math.max(0, (e.tp - 0.9) / 2.7)));
    out.pos.copy(DOOR_EYE).lerp(LOCK_EYE, m); out.pos.z -= 0.5 * (1 - m);
    out.aim.copy(DOOR_AIM).lerp(LOCK_AIM, m);
  } else {
    out.pos.copy(LOCK_EYE); out.aim.copy(LOCK_AIM);
    // the air shower shakes the frame a little
    const shake = e.phase === 'airlock' && e.holding && e.cycle < 1 / 3 ? 0.012 : 0;
    out.pos.x += Math.sin(t * 37) * shake; out.pos.y += Math.cos(t * 41) * shake;
  }
  out.pos.y += Math.sin(t * 0.7) * 0.02;
  return out;
}

/** 0..1 handover from the entry path to the scroll rail during the exit walk */
export const exitBlend = () => (lab.entry.phase === 'exit' ? ease(Math.min(1, Math.max(0, (lab.entry.tp - 0.8) / 3.4))) : lab.entry.phase === 'lab' ? 1 : 0);

/** condensation on the lens: a puff of cold air at the outer door, a full fog-and-clear at the inner one */
export function frostAmount() {
  const e = lab.entry;
  if (e.phase === 'opening') return 0.45 * sstep(0.5, 1.4, e.tp) * (1 - sstep(1.6, 3.4, e.tp));
  if (e.phase === 'airlock') return 0.55 * sstep(2 / 3, 0.85, e.cycle) * (1 - sstep(0.9, 1, e.cycle));
  if (e.phase === 'exit') return sstep(0.2, 1.1, e.tp) * (1 - sstep(1.6, 3.2, e.tp));
  return 0;
}


import * as THREE from 'three';
import { TRAVEL } from '../state/scroll';
import { B, D, P, ease, lerp } from './shared';

/** [camera position, look target, screen shift x (fraction of width, + moves the subject right), shift y] */
export type Pose = [THREE.Vector3, THREE.Vector3, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const PHONE = [1.55, 1.55, 1.95, 2.05, 1.85, 1.75];

/** one camera pose per chapter, as a function of that chapter's settled progress */
function poseFor(k: number, t: number, narrow: boolean): Pose {
  const nf = narrow ? PHONE[k] : 1, sy = narrow ? -0.06 : 0;
  switch (k) {
    case 0: { const d = lerp(15, 12, t) * nf; return [V(Math.sin(t * 0.5) * 3, lerp(0.6, 1.6, t), d), V(0, lerp(0.4, 0, t), 0), 0, narrow ? 0.12 : 0.1]; }
    case 1: { const a = -0.35 + t * 2.2, d = 19.5 * nf; return [V(Math.sin(a) * d, 1.8 + Math.sin(t * 3) * 0.6, Math.cos(a) * d), V(0, 0, 0), narrow ? 0 : 0.2, sy]; }
    case 2: { const a = lerp(-0.25, 0.3, t), d = 10.5 * nf; return [V(Math.sin(a) * d, 0.4, 4 + Math.cos(a) * d), V(0, 0, 4), narrow ? 0 : 0.17, sy]; }
    case 3: { const x = B.x + lerp(-1.5, 3.5, t), d = 25 * nf; return [V(x - 1, B.y + 8, d), V(x, B.y + 2.8, 0), narrow ? 0 : -0.17, sy]; }
    case 4: { const a = lerp(-0.12, 0.14, t), d = 31 * nf; return [V(P.x + Math.sin(a) * d, P.y + 7.5, Math.cos(a) * d), V(P.x, P.y + 4.8, 0), narrow ? 0 : 0.17, sy]; }
    default: { const d = 30 * nf; return [V(D.x - 1.5, D.y + lerp(17, 13, t), d * 0.85), V(D.x, D.y + 1, 0), narrow ? 0 : -0.17, sy]; }
  }
}

/** travelling between stations happens in the first part of a chapter, lifted like a gantry move rather than a cut */
export function rail(k: number, t: number, narrow: boolean): Pose {
  const tr = TRAVEL[k];
  if (k === 0 || t >= tr) return poseFor(k, k === 0 ? t : (t - tr) / (1 - tr), narrow);
  const a = poseFor(k - 1, 1, narrow), b = poseFor(k, 0, narrow), e = ease(t / tr);
  const pos = a[0].clone().lerp(b[0], e), tgt = a[1].clone().lerp(b[1], e);
  pos.y += Math.sin(e * Math.PI) * (k >= 3 ? 1.5 : 2.5);
  return [pos, tgt, lerp(a[2], b[2], e), lerp(a[3], b[3], e)];
}

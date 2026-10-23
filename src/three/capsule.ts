import * as THREE from 'three';

/** one half of a size 00 capsule (cm): 2.33 long, 0.85 across */
export function halfProfile(r: number, y0: number, y1: number, domeUp: boolean, seg = 16, rad = 40) {
  const pts: THREE.Vector2[] = [];
  if (domeUp) {
    pts.push(new THREE.Vector2(0.0001, y0), new THREE.Vector2(r, y0));
    for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r, y1 - r + Math.sin(a) * r)); }
  } else {
    for (let i = seg; i >= 0; i--) { const a = (i / seg) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r, y0 + r - Math.sin(a) * r)); }
    pts.push(new THREE.Vector2(r, y1), new THREE.Vector2(0.0001, y1));
  }
  return new THREE.LatheGeometry(pts, rad);
}
export const capGeo = (seg = 8, rad = 20) => halfProfile(0.435, -0.12, 1.165, true, seg, rad);
export const bodyGeo = (seg = 8, rad = 20) => halfProfile(0.42, -1.165, 0.35, false, seg, rad);

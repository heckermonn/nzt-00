import * as THREE from 'three';

/** where the stations sit on the rail */
export const BENCH_Y = -1.6;
export const B = new THREE.Vector3(36, BENCH_Y, 0); // assay bench
export const P = new THREE.Vector3(75, BENCH_Y, 0); // packaging
export const D = new THREE.Vector3(108, BENCH_Y, 0); // dispensing tray

/** the swarm capsule that becomes the specimen; Swarm writes its world matrix every frame */
export const HERO_I = 137;
export const heroFrom = new THREE.Matrix4();
export const hero = { visible: false, position: new THREE.Vector3() };

export const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sgn = (n: number, l: number, d: number) => (n < 0 ? '-' : '+') + Math.abs(n).toFixed(d).padStart(l, '0');

/** preview builds ship WebAssembly-free models (see vite.config.ts), so they skip the meshopt decoder */
export const MESHOPT = import.meta.env.MODE !== 'preview';

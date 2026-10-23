import * as THREE from 'three';

export const BG = new THREE.Color(0xd3d7d9);
export const INK = '#0e1011';

/** laser: pushed far past 1.0 so it is the only thing the bloom pass picks up */
export const laserMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5a14).multiplyScalar(7), toneMapped: false });

/** instanced swarm caps share this; its colour follows the formula on screen */
export const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.22 });
export const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf3f5f6, metalness: 0, roughness: 0.55 });

/** materials the Blender exports are re-skinned with, keyed by the material name set in blender/build.py */
export const M: Record<string, THREE.Material> = {
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transmission: 1, thickness: 0.25, ior: 1.47, side: THREE.DoubleSide, envMapIntensity: 1.4 }),
  liquid: new THREE.MeshPhysicalMaterial({ color: 0xe9eded, roughness: 0.12, transmission: 0.55, thickness: 1.2, ior: 1.34 }),
  alu: new THREE.MeshPhysicalMaterial({ color: 0xd6dadc, metalness: 1, roughness: 0.34, envMapIntensity: 0.7 }),
  alu_dark: new THREE.MeshStandardMaterial({ color: 0x4a5054, metalness: 0.9, roughness: 0.4 }),
  plastic_black: new THREE.MeshStandardMaterial({ color: 0x141617, roughness: 0.42 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x1a1c1d, roughness: 0.8 }),
  foil: new THREE.MeshPhysicalMaterial({ color: 0xc9ced1, metalness: 1, roughness: 0.36, envMapIntensity: 0.55 }),
  plastic_white: new THREE.MeshPhysicalMaterial({ color: 0xeef0f0, roughness: 0.32, clearcoat: 0.4 }),
  signal: new THREE.MeshStandardMaterial({ color: 0xff5a14, roughness: 0.4, emissive: 0x401000 }),
  brushed: new THREE.MeshStandardMaterial({ color: 0xc8cdd0, metalness: 1, roughness: 0.4, envMapIntensity: 0.6 }),
};

/** swap every mesh in a loaded glTF onto the shared lab materials */
export function reskin(root: THREE.Object3D, override?: (name: string) => THREE.Material | undefined) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const name = (m.material as THREE.Material).name;
    m.material = override?.(m.name) ?? M[name] ?? M.alu;
    if (m.name.includes('liquid')) m.renderOrder = 1;
  });
  return root;
}

/** back faces of a sectioned object render as engineering hatch, so a cutaway reads like a technical drawing */
export function sectionFace(mat: THREE.Material, rgb: string) {
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>',
      `#include <dithering_fragment>
      if (!gl_FrontFacing) { float h = step(.72, fract((gl_FragCoord.x + gl_FragCoord.y) / 9.)); gl_FragColor = vec4(mix(vec3(${rgb}), vec3(${rgb}) * .45, h), 1.); }`);
  };
}

/** canvas-drawn texture that repaints once the web fonts arrive */
export function canvasTexture(w: number, h: number, paint: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const draw = () => { g.clearRect(0, 0, w, h); paint(g, w, h); t.needsUpdate = true; };
  draw(); document.fonts?.ready.then(draw);
  return t;
}

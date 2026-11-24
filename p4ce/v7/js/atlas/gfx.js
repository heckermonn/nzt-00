/* PR6 v7 · Atlas materials (adapted from v5/js/atlas/gfx.js).
   Re-toned for The Device: matte white clay (the kit's pills and spheres), soft mist clay plinths, a little frosted
   glass and a cool brushed steel for the odd accent. No warm stone, no sand. */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const mkC = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const MS = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
export const RB = (w, h, d, r = .03, s = 4) => new RoundedBoxGeometry(w, h, d, s, r);

export function makeGfx(renderer, SOFT) {
  const MAXA = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mkTex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = MAXA; return t; };
  /* a very fine clay grain (value noise), so close-ups read as a made object rather than a CG primitive */
  const grain = (() => {
    const w = 256, c = mkC(w, w), g = c.getContext('2d'), im = g.createImageData(w, w), d = im.data, r = rng(9);
    for (let i = 0; i < w * w; i++) { const v = 222 + r() * 33; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0); const t = mkTex(c, false); t.repeat.set(3, 3); return t;
  })();
  /* brushed steel, from v5 (horizontal streaks) */
  const brush = (() => {
    const w = 256, c = mkC(w, w), g = c.getContext('2d'), im = g.createImageData(w, w), d = im.data, r = rng(7);
    for (let y = 0; y < w; y++) { let v = r(); const s = .02 + r() * .12; for (let x = 0; x < w; x++) { v += (r() - v) * s; const q = (.3 + v * .2) * 255; const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = q; d[i + 3] = 255; } }
    g.putImageData(im, 0, 0); return mkTex(c, false);
  })();
  const MAT = {
    /* the kit's matte white clay */
    clay: new THREE.MeshStandardMaterial({color: 0xf1f3f3, roughness: .82, metalness: 0, roughnessMap: grain}),
    clay2: new THREE.MeshStandardMaterial({color: 0xe2e7e9, roughness: .86, metalness: 0, roughnessMap: grain}),
    /* the plinths: mist clay with a soft satin sheen */
    plinth: new THREE.MeshPhysicalMaterial({color: 0xc9d3d8, roughness: .55, metalness: 0, clearcoat: .35, clearcoatRoughness: .5}),
    plinthTop: new THREE.MeshStandardMaterial({color: 0xbfcad0, roughness: .7, metalness: 0}),
    /* frosted glass, faked (transmission is too costly behind a blurred slab) */
    frost: new THREE.MeshPhysicalMaterial({color: 0xdfe8ec, roughness: .28, metalness: 0, transparent: true, opacity: .62, clearcoat: .6, clearcoatRoughness: .3, depthWrite: false}),
    steel: new THREE.MeshPhysicalMaterial({color: 0xc4ccd0, metalness: 1, roughness: .38, roughnessMap: brush}),
    ink: new THREE.MeshStandardMaterial({color: 0x1d2327, roughness: .5, metalness: .2}),
    orange: new THREE.MeshStandardMaterial({color: 0xe98546, roughness: .6, metalness: 0}),
    hidden: new THREE.MeshBasicMaterial({visible: false})
  };
  return {MAT, mkTex, MAXA};
}

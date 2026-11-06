/* P4CE v5 · Atlas materials and procedural textures (adapted from v3 /tmp/claude-0/atlas/w-tex.js and world.js).
   Re-toned for v5: carved pale stone and brushed steel. No frosted transmission (too costly, and off-tone now). */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const mkC = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const MS = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
export const RB = (w, h, d, r = .03, s = 4) => new RoundedBoxGeometry(w, h, d, s, r);

export function makeGfx(renderer, SOFT) {
  const MAXA = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mkTex = (c, srgb, rep = true) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = MAXA; return t; };
  function brushH(w, h, seed) { const r = rng(seed), a = new Float32Array(w * h); for (let y = 0; y < h; y++) { const base = r(), s = .015 + r() * .13; let v = r(); for (let x = 0; x < w; x++) { v += (r() - v) * s; a[y * w + x] = base * .5 + v * .5; } for (let x = 0; x < 40; x++) { const t = x / 40, j = y * w + (w - 40 + x); a[j] = a[j] * (1 - t) + a[y * w + x] * t; } } return a; }
  function normalFrom(a, w, h, sx, sy) { const c = mkC(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), d = im.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const xl = a[y * w + ((x - 1 + w) % w)], xr = a[y * w + ((x + 1) % w)], yu = a[((y - 1 + h) % h) * w + x], yd = a[((y + 1) % h) * w + x]; let nx = (xl - xr) * sx, ny = (yd - yu) * sy, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l; const i = (y * w + x) * 4; d[i] = (nx * .5 + .5) * 255; d[i + 1] = (ny * .5 + .5) * 255; d[i + 2] = (nz * .5 + .5) * 255; d[i + 3] = 255; } g.putImageData(im, 0, 0); return c; }
  function grayFrom(a, w, h, lo, hi) { const c = mkC(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), d = im.data; for (let i = 0; i < w * h; i++) { const v = (lo + (hi - lo) * a[i]) * 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); return c; }
  /* stone: value noise in octaves, with a few pits, so the forms read as carved rather than cast */
  function stoneH(w, h, seed) {
    const r = rng(seed), a = new Float32Array(w * h), G = 64, grid = new Float32Array(G * G).map(() => r());
    const vn = (x, y, f) => { x = x * f / w * G; y = y * f / h * G; const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const g = (a, b) => grid[((b % G + G) % G) * G + ((a % G + G) % G)]; return g(i, j) * (1 - u) * (1 - v) + g(i + 1, j) * u * (1 - v) + g(i, j + 1) * (1 - u) * v + g(i + 1, j + 1) * u * v; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = vn(x, y, .125) * .5 + vn(x, y, .25) * .28 + vn(x, y, .5) * .14 + vn(x, y, 1) * .08;
    for (let k = 0; k < 120; k++) { const cx = r() * w, cy = r() * h, R = 1 + r() * 3.2; for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const d = Math.hypot(x, y); if (d < R) { const i = (((cy + y) | 0) + h) % h * w + ((((cx + x) | 0) + w) % w); a[i] -= .22 * (1 - d / R); } } }
    return a;
  }
  const BR = (() => { const w = 512, h = 512, a = brushH(w, h, 7); return {normal: mkTex(normalFrom(a, w, h, .7, 3.2), false), rough: mkTex(grayFrom(a, w, h, .26, .46), false)}; })();
  const ST = (() => { const w = 256, h = 256, a = stoneH(w, h, 11); return {normal: mkTex(normalFrom(a, w, h, 2.6, 2.6), false), rough: mkTex(grayFrom(a, w, h, .78, .98), false), col: mkTex(grayFrom(a, w, h, .93, 1.0), true)}; })();
  ST.normal.repeat.set(2, 2); ST.rough.repeat.set(2, 2); ST.col.repeat.set(2, 2);

  const MAT = {
    steel: new THREE.MeshPhysicalMaterial({color: 0xc9ccce, metalness: 1, roughness: .34, roughnessMap: BR.rough, normalMap: BR.normal, normalScale: new THREE.Vector2(.2, .2)}),
    steel2: new THREE.MeshPhysicalMaterial({color: 0xbec1c3, metalness: 1, roughness: .5, roughnessMap: BR.rough, normalMap: BR.normal, normalScale: new THREE.Vector2(.09, .09)}),
    mirror: new THREE.MeshPhysicalMaterial({color: 0xe3e4e4, metalness: 1, roughness: .14}),
    /* carved pale stone: warm, matte, a little translucent-looking through sheen */
    stone: new THREE.MeshStandardMaterial({color: 0xeae5dd, roughness: .95, metalness: 0, map: ST.col, roughnessMap: ST.rough, normalMap: ST.normal, normalScale: new THREE.Vector2(.55, .55)}),
    stone2: new THREE.MeshStandardMaterial({color: 0xd9d3c9, roughness: .9, metalness: 0, map: ST.col, roughnessMap: ST.rough, normalMap: ST.normal, normalScale: new THREE.Vector2(.8, .8)}),
    ink: new THREE.MeshStandardMaterial({color: 0x1a1b1c, roughness: .45, metalness: .5}),
    rubber: new THREE.MeshStandardMaterial({color: 0x121314, roughness: .62, metalness: 0}),
    acid: new THREE.MeshBasicMaterial({color: 0xccff00}),
    glint: new THREE.MeshBasicMaterial({color: 0xffffff}),
    satin: new THREE.MeshPhysicalMaterial({color: 0xecebe7, roughness: .52, metalness: 0, clearcoat: .3, clearcoatRoughness: .6, sheen: .35, sheenRoughness: .8, sheenColor: new THREE.Color(0xffffff)}),
    anod: new THREE.MeshPhysicalMaterial({color: 0x1c1e21, metalness: .8, roughness: .34, clearcoat: .5, clearcoatRoughness: .28})
  };
  MAT.plinth = new THREE.MeshPhysicalMaterial({envMapIntensity: 1.4, color: 0xd6d8d9, metalness: .74, roughness: .36, roughnessMap: BR.rough, normalMap: BR.normal, normalScale: new THREE.Vector2(.06, .06), clearcoat: .3, clearcoatRoughness: .25});
  return {MAT, BR, ST, MAXA, mkTex};
}

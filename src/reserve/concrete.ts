import * as THREE from 'three';
import { paintTexture, rng } from './paint';

/**
 * Board-formed concrete: horizontal plank marks, a little tonal drift from board to board, bug holes,
 * and a grid of formwork tie holes. One tile is TILE metres of wall.
 */
export const TILE = 1.2;

function concreteTexture() {
  const t = paintTexture(1024, 1024, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = '#7b7b78'; g.fillRect(0, 0, w, h);
    // four boards per tile, each poured a shade apart, with grain dragged along it
    for (let b = 0; b < 4; b++) {
      const y = (b * h) / 4, v = 108 + r() * 26;
      g.fillStyle = `rgb(${v},${v},${v - 3})`; g.fillRect(0, y, w, h / 4);
      for (let i = 0; i < 180; i++) {
        const gv = v + (r() - 0.5) * 22;
        g.fillStyle = `rgba(${gv},${gv},${gv - 2},.45)`;
        g.fillRect(r() * w - 80, y + r() * (h / 4), 80 + r() * 520, 1 + r() * 2.5);
      }
      // the seam between boards, with a lip of laitance
      g.fillStyle = 'rgba(40,40,38,.75)'; g.fillRect(0, y, w, 3);
      g.fillStyle = 'rgba(190,190,186,.25)'; g.fillRect(0, y + 3, w, 2);
    }
    // cloudy pour: soft blotches
    for (let i = 0; i < 70; i++) {
      const x = r() * w, y = r() * h, rad = 30 + r() * 160, d = r() > 0.5;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, d ? 'rgba(30,30,28,.13)' : 'rgba(220,220,214,.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // speckle and bug holes
    for (let i = 0; i < 9000; i++) { const v = r() * 255; g.fillStyle = `rgba(${v},${v},${v},.07)`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(25,25,24,.55)'; g.beginPath(); g.arc(r() * w, r() * h, 0.8 + r() * 2.6, 0, Math.PI * 2); g.fill(); }
    // tie holes on a 600 mm grid: a dark plug with a pale ring where the cone sat
    for (const x of [w * 0.25, w * 0.75]) for (const y of [h * 0.375, h * 0.875]) {
      g.fillStyle = 'rgba(205,205,200,.35)'; g.beginPath(); g.arc(x, y, 22, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(28,28,27,.9)'; g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

let shared: THREE.Texture | null = null;
export const concreteMap = () => (shared ??= concreteTexture());

/**
 * Concrete laid on in world space from three directions, so slabs of any size share one continuous pour
 * and the boards stay level across every wall.
 */
export function concrete(params: { color: number; roughness: number; tile?: number }) {
  const m = new THREE.MeshStandardMaterial({ color: params.color, roughness: params.roughness });
  const tile = params.tile ?? TILE;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCon = { value: concreteMap() };
    sh.uniforms.uTile = { value: tile };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNrm;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWNrm = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uCon; uniform float uTile; varying vec3 vWPos; varying vec3 vWNrm;')
      .replace('#include <map_fragment>', `
        vec3 bw = pow(abs(vWNrm), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
        vec3 con = texture2D(uCon, vWPos.zy / uTile).rgb * bw.x + texture2D(uCon, vWPos.xz / uTile).rgb * bw.y + texture2D(uCon, vWPos.xy / uTile).rgb * bw.z;
        diffuseColor.rgb *= con * 1.9;`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * (1.15 - con.g * 0.5);');
  };
  return m;
}

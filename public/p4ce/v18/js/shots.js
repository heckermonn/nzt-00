// PR6 / Institute: where the camera stands for each screen, and the way it flies between rooms.
// Positions are in Blender coordinates (x, y, z up), each in its own room's frame, as in blender/world.py.
import * as THREE from 'three';
import { BAYS } from './world.js';

const DEG = Math.PI / 180, V3 = THREE.Vector3;
const NIGHT = [0.022, 0.034, 0.058, 0.03], DAY = [1.1, 1.25, 1.4, 0.0042];
export const DX = 1.08;
export const INSIDE = ['passage', 'atrium', 'compass', 'formulary', 'archive'];
// the way through each opening of the Atrium's far wall (Atrium frame). The Formulary and the Archive stand directly
// behind the wall, so their openings are their doors. The last pier of each row stands in front of the
// slot and the square, so those two ways pass beside it, and every way is pinned straight while it is inside the wall
// (y 74 to 78): a curve that drifts there cuts a corner of the stone.
const GATE = {
  compass: [[0, 52, 7.5], [0, 68, 11.6], [0, 73, 12.4], [0, 79, 12.6], [0, 92, 10.4]],
  formulary: [[-12, 38, 4.2], [-20.2, 64, 5.0], [-20.2, 71, 4.8], [-20.2, 78.5, 4.7]],
  archive: [[12, 38, 3.4], [19.6, 64, 4.4], [19.6, 71, 4.0], [19.8, 78.5, 3.6]],
};
// the court side of each opening, for going from one room to the next without returning to the middle of the Atrium
const COURT = { compass: [0, 58, 8.6], formulary: [-17, 56, 5.0], archive: [16, 56, 4.4] };
export const nichePos = (i) => { const r = Math.floor((i - 1) / 3), c = (i - 1) % 3; return [(c - 1) * 2.5, 2.0 + (2 - r) * 2.95]; };

export function createShots(W, app) {
  const n = () => app.narrow(), X = (k) => (k === 'R' ? DX : -DX);
  const out = { zone: 'alley', vig: 0.7, grain: 0.04, rain: 0.9, expo: 0.82, fog: NIGHT };
  const ins = { vig: 0.08, grain: 0.016, rain: 0, fog: DAY };
  const T = {
    front: () => ({ ...out, p: [0.35, -7.2, 1.5], t: [-0.15, 6.6, 2.5], lens: n() ? 24 : 27, shift: n() ? [0, -0.16] : [0.13, 0], expo: 0.5, vig: 0.9, rain: 0.7 }),
    alley: () => ({ ...out, p: [0, 1.0, 1.55], t: [0, 6.6, 2.2], lens: 25, shift: n() ? [0, -0.1] : [0, -0.03] }),
    door: (k) => ({ ...out, p: [X(k) * 0.9, 3.9, 1.62], t: [X(k), 6.8, 1.84], lens: n() ? 24 : 30, shift: [0, n() ? -0.1 : -0.06] }),
    slit: (k) => ({ ...out, p: [X(k), 5.86, 1.62], t: [X(k), 6.8, 1.6], lens: n() ? 30 : 40, shift: [0, -0.1], vig: 0.8 }),
    doorpane: (k) => ({ ...out, p: [X(k) * 0.86, 3.2, 1.6], t: [X(k), 6.8, 1.66], lens: 27, expo: 0.8, vig: 0.5, rain: 0.5 }),
    atrium: () => ({ ...ins, zone: 'atrium', p: [0, -4, 1.7], t: [0, 74, 13], lens: 21, expo: 0.44, con: 0.7, shift: n() ? [0, -0.06] : [0, 0] }),
    compass: () => ({ ...ins, zone: 'compass', p: [0, -8.3, 1.75], t: [0, 0, 2.45], lens: 23, expo: 0.42, fog: [1.1, 1.25, 1.4, 0.002] }),
    formulary: () => ({ ...ins, zone: 'formulary', p: [0, -13.6, 4.6], t: [0, 0, 4.72], lens: n() ? 44 : 47, expo: 0.45, fog: [1.1, 1.25, 1.4, 0.002] }),
    niche: (i) => { const [x, z] = nichePos(i); return { ...ins, zone: 'formulary', p: [x * 0.55, -6.4, z * 0.8 + 0.9], t: [x, 0.4, z - 0.1], lens: 38, expo: 0.45, fog: [1.1, 1.25, 1.4, 0.002] }; },
    record: (i) => { const [x, z] = nichePos(i); return { ...ins, zone: 'formulary', p: [x + 0.2, -3.5, z + 0.05], t: [x, 0.62, z - 0.3], lens: 42, expo: 0.45, fog: [1.1, 1.25, 1.4, 0.002] }; },
    archive: () => ({ ...ins, zone: 'archive', p: [0, -8.4, 1.7], t: [0, 2.6, 3.05], lens: 27, expo: 0.34, fog: [1.1, 1.25, 1.4, 0.002] }),
  };
  const S = { INSIDE };
  /** The pane of the window the picture is seen through, for a layout. */
  S.rect = (layout) => {
    const w = innerWidth, h = innerHeight, bar = 56;
    if (layout !== 'pane') return { x: 0, y: 0, w, h };
    return n() ? { x: 0, y: bar, w, h: Math.round(h * 0.42) } : { x: 0, y: bar, w: Math.round(w * 0.46), h: h - bar };
  };
  S.zoneOf = (name) => (T[name] ? T[name]('L').zone : 'alley');
  /** A named shot as a camera pose in the world. */
  S.pose = (name, arg, layout) => {
    const d = T[name](arg);
    return { zone: d.zone, p: W.pt(d.zone, d.p), t: W.pt(d.zone, d.t), fov: 2 * Math.atan(18 / d.lens) / DEG, expo: d.expo, fog: d.fog, vig: d.vig, grain: d.grain, con: d.con || 0, rain: d.rain, rect: S.rect(layout), shift: layout === 'pane' ? [0, 0] : (d.shift || [0, 0]) };
  };
  const gate = (z) => GATE[z].map((p) => W.pt('atrium', p));
  /** The points to pass through between two rooms, and whether the camera backs out. */
  S.via = (from, to) => {
    if (from === to || from === 'alley' || to === 'alley') return { via: [] };
    if (from === 'atrium') return { via: gate(to) };
    if (to === 'atrium') return { via: gate(from).reverse(), back: true };
    // room to room: back out through its opening into the court, across in front of the far wall, and in through the
    // other opening. The eye stays on the rooms throughout (out backwards, across, in), so nothing swings round.
    return { via: [...gate(from).slice(1).reverse(), W.pt('atrium', COURT[from]), W.pt('atrium', COURT[to]), ...gate(to).slice(1)], look: 0 };
  };
  /** The way from the alley through the opened door and the passage into the Atrium. */
  S.through = (side) => {
    const x = X(side), pts = [W.pt('alley', [x, 5.2, 1.6]), W.pt('alley', [x, 7.6, 1.6])];
    // past the nine steles, on the open side of each
    const st = W.zones.passage && W.zones.passage.man.anchors.steles;
    // past every stele on its open side: a small weave while the passage is narrow, straightening as it widens
    if (st) st.forEach((s, i) => pts.push(W.pt('passage', [-s.side * [0.3, 0.33, 0.36, 0.38, 0.35, 0.3, 0.2, 0.1, 0][i], s.y, 1.6 + (s.y / BAYS.L) * 0.5])));
    else for (const f of [0.2, 0.45, 0.7, 0.9]) pts.push(W.pt('passage', [0, BAYS.L * f, 1.6 + f * 0.5]));
    pts.push(W.pt('atrium', [0, -12, 1.9]));
    return pts;
  };
  S.length = (a, via, b) => { let L = 0, p = a; for (const q of [...via, b]) { L += p.distanceTo(q); p = q; } return L; };
  S.T = T;
  return S;
}
export { V3 };

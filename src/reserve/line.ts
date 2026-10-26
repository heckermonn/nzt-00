import { COLLECTIONS } from './data';

/**
 * The Line: a conveyor runs along +x through the room behind the door, and scrolling runs it.
 * Scroll is measured in screens (`u`): one screen of scroll is one unit.
 */
export type StationKind = 'tin' | 'jar' | 'vial';

export interface Station {
  /** index into COLLECTIONS */
  c: number;
  kind: StationKind;
  /** where the machine stands on the line, metres */
  x: number;
  /** the batch record: each step starts at a share of the station's run */
  steps: [number, string][];
}

export const STATIONS: Station[] = [
  { c: 0, kind: 'tin', x: 6, steps: [[0, 'Tin in'], [0.2, 'Count capsules'], [0.6, 'Press lid'], [0.82, 'Release']] },
  { c: 7, kind: 'jar', x: 17, steps: [[0, 'Jar in'], [0.2, 'Fill cream'], [0.58, 'Cap and turn'], [0.82, 'Release']] },
  { c: 4, kind: 'vial', x: 28, steps: [[0, 'Vial in'], [0.2, 'Freeze-dry'], [0.6, 'Seat stopper'], [0.7, 'Crimp seal'], [0.82, 'Release']] },
];
export const END_X = 38; // the dispatch table at the end of the line
export const LINE = { y: 0.9, z: 0, x0: -3.5, x1: END_X + 2 };

/** scroll layout, in screens */
const ENTER = 0.8, HOLD = 1.6, TRAVEL = 0.7, OUT = 0.9;
export const arriveAt = (i: number) => ENTER + i * (HOLD + TRAVEL);
export const U_END = arriveAt(STATIONS.length - 1) + HOLD + OUT;

const clamp = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };

/** how far station i has run, 0..1, at scroll u */
export const stationP = (i: number, u: number) => clamp((u - arriveAt(i)) / HOLD);

/** the camera's position along the line: it drifts while a station runs and travels between them */
export function cameraX(u: number) {
  const first = STATIONS[0].x - 0.5;
  if (u <= ENTER) return smooth(u / ENTER) * first;
  for (let i = 0; i < STATIONS.length; i++) {
    const a = arriveAt(i), b = a + HOLD, sx = STATIONS[i].x;
    if (u <= b) return sx - 0.5 + (u - a) / HOLD;
    const next = i + 1 < STATIONS.length ? STATIONS[i + 1].x - 0.5 : END_X;
    const span = i + 1 < STATIONS.length ? TRAVEL : OUT;
    if (u <= b + span) return sx + 0.5 + (next - sx - 0.5) * smooth((u - b) / span);
  }
  return END_X;
}

/** how far the product has moved along the belt at station i: in from upstream, out to the take-off */
export const IN_FROM = 2.2, OUT_TO = 1.3;
export const itemX = (p: number) => -IN_FROM * (1 - smooth(p / 0.18)) + OUT_TO * smooth((p - 0.82) / 0.18);

/** the belt only moves while products are moving: an indexing conveyor */
export function beltPos(u: number) {
  return STATIONS.reduce((s, _, i) => { const p = stationP(i, u); return s + IN_FROM * smooth(p / 0.18) + OUT_TO * smooth((p - 0.82) / 0.18); }, 0);
}

/** the station nearest the camera, and the step it is on */
export function nearest(u: number) {
  let best = 0, d = Infinity;
  STATIONS.forEach((_, i) => { const m = Math.abs(u - (arriveAt(i) + HOLD / 2)); if (m < d) { d = m; best = i; } });
  return best;
}
export const stepOf = (s: Station, p: number) => s.steps.reduce((k, [t], j) => (p >= t ? j : k), 0);
export const DONE = 0.86; // past this the product is finished and can be added

export const stationName = (s: Station) => COLLECTIONS[s.c];

/** how big each product stands on the line, over its specimen scale, and its height there in metres */
export const ITEM: Record<StationKind, { s: number; h: number; r: number }> = {
  tin: { s: 1.5, h: 0.468, r: 0.33 },
  jar: { s: 1.5, h: 0.466, r: 0.3 },
  vial: { s: 1.1, h: 0.74, r: 0.19 },
};
export const BELT = LINE.y + 0.02; // top of the belt

/** capsules counted into the tin: when each one drops, and for how long it falls */
export const CAPS = { n: 16, start: 0.22, gap: 0.022, fall: 0.07 };

const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** the live values the station panel prints beside its batch record */
export function readout(s: Station, p: number): [string, string][] {
  if (s.kind === 'tin') {
    const k = Math.min(1, Math.max(0, (p - CAPS.start) / ((CAPS.n - 1) * CAPS.gap + CAPS.fall)));
    return [['Count', `${pad(Math.round(60 * k))} / 60`], ['Lid', p >= 0.7 ? 'Pressed' : p >= 0.6 ? 'Lowering' : 'Held']];
  }
  if (s.kind === 'jar') {
    const f = smooth((p - 0.26) / 0.26);
    return [['Fill', `${(50 * f).toFixed(1).padStart(4, '0')} ml`], ['Cap', p >= 0.78 ? 'Closed' : p >= 0.66 ? 'Turning' : 'Held']];
  }
  const cold = smooth((p - 0.28) / 0.17) * (1 - smooth((p - 0.52) / 0.06));
  const vac = smooth((p - 0.3) / 0.15) * (1 - smooth((p - 0.52) / 0.04));
  const mbar = Math.exp(lerp(Math.log(1013), Math.log(0.1), vac));
  return [
    ['Shelf', `${lerp(20, -45, cold).toFixed(1)} °C`],
    ['Chamber', `${mbar < 10 ? mbar.toFixed(2) : Math.round(mbar)} mbar`],
    ['Seal', p >= 0.76 ? 'Crimped' : p >= 0.64 ? 'Stoppered' : 'Open'],
  ];
}

/** the page's scroll as line units, and back: the whole scrollable length is the whole line */
const room = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
export const scrollU = () => (scrollY / room()) * U_END;
export const scrollToU = (u: number, smoothly: boolean) => scrollTo({ top: (u / U_END) * room(), behavior: smoothly ? 'smooth' : 'auto' });

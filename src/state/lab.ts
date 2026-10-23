import { create } from 'zustand';

/**
 * Per-frame values shared between the scroll layer (DOM) and the 3D scene.
 * Mutable on purpose: the render loop reads it every frame, so it never goes through React state.
 */
export const lab = {
  /** current chapter and its 0..1 progress (smoothed by Lenis) */
  k: 0,
  t: 0,
  /** raw progress of every chapter, written by ScrollTrigger */
  chapter: [0, 0, 0, 0, 0, 0],
  /** 0..1 rise of each formula card; drives the swarm morph */
  card: [0, 0, 0, 0],
  /** whole-page progress */
  page: 0,
  narrow: false,
  reduce: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  /** extra tray steps from dispensing, and the well that was just filled */
  trayIndex: 0,
  lastWell: -1,
  wellFlash: 0,
  disturbed: 0,
  fps: 60,
  camX: 0,
  /** cursor is over the page (drives parallax and the capsule force field) */
  pointerIn: false,
  /** extra yaw given to the swarm by a mouse drag */
  spin: 0,
  /** extra turn given to the foil pouch by a drag */
  pouchSpin: 0,
  /** formula index per tray well, -1 when empty; bump `wellsVersion` after changing */
  wells: Array.from({ length: 30 }, (_, i) => (i >= 3 && i <= 8 ? (i - 3) % 4 : -1)),
  wellsVersion: 0,
  nextWell: 9,
};

/** React-facing UI state that changes rarely */
interface UIState {
  chapter: number;
  picked: number;
  sound: boolean;
  ready: boolean;
  hoverVial: number;
  setChapter: (k: number) => void;
  pick: (i: number) => void;
  setSound: (on: boolean) => void;
  setReady: () => void;
  setHoverVial: (i: number) => void;
}
export const useUI = create<UIState>((set) => ({
  chapter: 0,
  picked: 1,
  sound: false,
  ready: false,
  hoverVial: -1,
  setChapter: (chapter) => set({ chapter }),
  pick: (picked) => set({ picked }),
  setSound: (sound) => set({ sound }),
  setReady: () => set({ ready: true }),
  setHoverVial: (hoverVial) => set({ hoverVial }),
}));

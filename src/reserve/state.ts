import { create } from 'zustand';
import { GOALS } from './data';

export type Phase = 'door' | 'reading' | 'verified' | 'opening' | 'hall';

/**
 * Per-frame values the scene reads every frame (mutable, outside React).
 * Times are seconds since the phase began.
 */
export const rv = {
  phase: 'door' as Phase,
  tp: 0,
  /** hall heading in slots (1 = bay 01); eased toward `aim` */
  yaw: 5,
  aim: 5,
  /** 0..1 light each bay is easing toward, and where it is now */
  want: Array(9).fill(0.65) as number[],
  light: Array(9).fill(0) as number[],
  reduce: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
};

interface ReserveUI {
  phase: Phase;
  goal: number;
  bay: number;
  nfc: 'none' | 'ready' | 'scanning';
  setPhase: (p: Phase) => void;
  setGoal: (g: number) => void;
  setBay: (b: number) => void;
  setNfc: (n: ReserveUI['nfc']) => void;
}

export const useReserve = create<ReserveUI>((set) => ({
  phase: 'door',
  goal: -1,
  bay: 4,
  nfc: typeof window !== 'undefined' && 'NDEFReader' in window ? 'ready' : 'none',
  setPhase: (phase) => { rv.phase = phase; rv.tp = 0; set({ phase }); },
  setGoal: (goal) => {
    const lit = goal < 0 ? null : GOALS[goal].bays;
    rv.want = rv.want.map((_, i) => (lit ? (lit.includes(i) ? 1 : 0.04) : 0.65));
    // turn to the first bay the goal lights
    if (lit) turnTo(lit[0]);
    set({ goal });
  },
  setBay: (bay) => set({ bay }),
  setNfc: (nfc) => set({ nfc }),
}));

/** turn the shortest way round to a bay (0-based) */
export function turnTo(bay: number) {
  const slot = bay + 1;
  let d = slot - (((rv.aim % 10) + 10) % 10);
  if (d > 5) d -= 10; if (d < -5) d += 10;
  rv.aim += d;
}

/** start the read: the scene runs the rest of the sequence on its own clock */
export function presentKey() {
  if (rv.phase !== 'door') return;
  useReserve.getState().setPhase('reading');
}

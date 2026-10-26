import { create } from 'zustand';

export type Phase = 'door' | 'reading' | 'verified' | 'opening' | 'hall';

/**
 * Per-frame values the scene reads every frame (mutable, outside React).
 * Times are seconds since the phase began.
 */
export const rv = {
  phase: 'door' as Phase,
  tp: 0,
  /** scroll down the Line, in screens; eased toward the page's scroll position */
  u: 0,
  /** serial number of the key that opened the door, when the browser could read it */
  uid: '',
  reduce: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
};

interface ReserveUI {
  phase: Phase;
  nfc: 'none' | 'ready' | 'scanning';
  setPhase: (p: Phase) => void;
  setNfc: (n: ReserveUI['nfc']) => void;
}

export const useReserve = create<ReserveUI>((set) => ({
  phase: 'door',
  nfc: typeof window !== 'undefined' && 'NDEFReader' in window ? 'ready' : 'none',
  setPhase: (phase) => { rv.phase = phase; rv.tp = 0; set({ phase }); },
  setNfc: (nfc) => set({ nfc }),
}));

/** start the read: the scene runs the rest of the sequence on its own clock */
export function presentKey() {
  if (rv.phase !== 'door') return;
  useReserve.getState().setPhase('reading');
}

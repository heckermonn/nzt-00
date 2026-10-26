import { create } from 'zustand';

/**
 * The member's protocol tray: what they have pulled off the line. Kept in this browser until commerce is wired
 * (the CommerceAdapter's mock does the same for the scroll lab).
 */
export interface Item { c: number; qty: number }

const KEY = 'p4ce.protocol';
const load = (): Item[] => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const save = (items: Item[]) => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* private mode: the tray still works for this visit */ } };

interface Cart {
  items: Item[];
  open: boolean;
  /** collection whose dossier is open, or -1 */
  dossier: number;
  /** bumps each time a product lands in the tray, so the tray can answer */
  landed: number;
  /** products in the air between the line and the tray; the scene animates them */
  flights: Flight[];
  add: (c: number, qty?: number) => void;
  setQty: (c: number, qty: number) => void;
  setOpen: (open: boolean) => void;
  setDossier: (c: number) => void;
  land: (id: number) => void;
}

export interface Flight { id: number; c: number; from: [number, number, number] }

export const useCart = create<Cart>((set, get) => ({
  items: load(),
  open: false,
  dossier: -1,
  landed: 0,
  flights: [],
  add: (c, qty = 1) => {
    const items = get().items.some((i) => i.c === c) ? get().items.map((i) => (i.c === c ? { ...i, qty: i.qty + qty } : i)) : [...get().items, { c, qty }];
    save(items); set({ items });
  },
  setQty: (c, qty) => {
    const items = qty <= 0 ? get().items.filter((i) => i.c !== c) : get().items.map((i) => (i.c === c ? { ...i, qty } : i));
    save(items); set({ items });
  },
  setOpen: (open) => set({ open }),
  setDossier: (dossier) => set({ dossier }),
  land: (id) => set((s) => ({ landed: s.landed + 1, flights: s.flights.filter((f) => f.id !== id) })),
}));

export const count = (items: Item[]) => items.reduce((n, i) => n + i.qty, 0);

let nextId = 0;
/** add a product and send a copy of it flying from the line to the tray */
export function launch(c: number, from: [number, number, number]) {
  useCart.getState().add(c);
  useCart.setState((s) => ({ flights: [...s.flights, { id: nextId++, c, from }] }));
}

import { create } from 'zustand';
import { mockAdapter } from './mockAdapter';
import { shopifyAdapter } from './shopifyAdapter';
import type { Cart, CommerceAdapter, Product } from './types';

/** VITE_COMMERCE picks the backend; everything else talks only to this store. */
export const commerce: CommerceAdapter = import.meta.env.VITE_COMMERCE === 'shopify' ? shopifyAdapter : mockAdapter;
const CART_ID = 'nzt00.cartId';

interface CartState {
  products: Product[];
  cart: Cart | null;
  open: boolean;
  busy: boolean;
  /** bumps on every add so the dispensing record can re-print */
  printed: number;
  init: () => Promise<void>;
  add: (handle: string) => Promise<void>;
  setQty: (lineId: string, q: number) => Promise<void>;
  remove: (lineId: string) => Promise<void>;
  setOpen: (open: boolean) => void;
}

async function ensureCart(get: () => CartState): Promise<Cart> {
  const c = get().cart; if (c) return c;
  const n = await commerce.createCart();
  try { localStorage.setItem(CART_ID, n.id); } catch { /* ignore */ }
  return n;
}

export const useCart = create<CartState>((set, get) => ({
  products: [], cart: null, open: false, busy: false, printed: 0,
  async init() {
    const products = await commerce.getProducts();
    let cart: Cart | null = null;
    try { const id = localStorage.getItem(CART_ID); if (id) cart = await commerce.getCart(id); } catch { /* ignore */ }
    set({ products, cart });
  },
  async add(handle) {
    const p = get().products.find((x) => x.handle === handle); if (!p) return;
    set({ busy: true });
    const c = await ensureCart(get);
    const cart = await commerce.addLine(c.id, p.id, 1);
    set({ cart, busy: false, printed: get().printed + 1 });
  },
  async setQty(lineId, q) { const c = get().cart; if (!c) return; set({ busy: true }); set({ cart: await commerce.updateLine(c.id, lineId, q), busy: false }); },
  async remove(lineId) { const c = get().cart; if (!c) return; set({ busy: true }); set({ cart: await commerce.removeLine(c.id, lineId), busy: false }); },
  setOpen: (open) => set({ open }),
}));

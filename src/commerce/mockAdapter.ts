import { FORMULAS } from '../data/formulas';
import type { Cart, CommerceAdapter, Product } from './types';

/**
 * Emulated store: same contract as the Shopify adapter, backed by localStorage with a small fake latency,
 * so the cart, the drawer and checkout can be designed and tested before a commerce platform is chosen.
 */
const KEY = 'nzt00.cart';
const wait = (ms = 220) => new Promise((r) => setTimeout(r, ms));
const products: Product[] = FORMULAS.map((f) => ({ id: `mock-${f.id}`, handle: f.id, title: f.name, code: f.code, price: { amount: f.price, currencyCode: 'USD' } }));

function load(): Cart | null { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
function save(c: Cart) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* private mode: cart lives for the session */ } return c; }
function total(c: Cart): Cart { c.subtotal = { amount: c.lines.reduce((a, l) => a + l.price.amount * l.quantity, 0), currencyCode: 'USD' }; return c; }
let memory: Cart | null = null;

export const mockAdapter: CommerceAdapter = {
  name: 'Emulated',
  async getProducts() { await wait(80); return products; },
  async createCart() { await wait(); memory = save({ id: `cart-${Date.now().toString(36)}`, lines: [], subtotal: { amount: 0, currencyCode: 'USD' }, checkoutUrl: '#checkout', emulated: true }); return memory; },
  async getCart(id) { await wait(60); const c = load() || memory; return c && c.id === id ? c : null; },
  async addLine(id, merchandiseId, quantity = 1) {
    await wait(); const c = (load() || memory)!; const p = products.find((x) => x.id === merchandiseId)!;
    const ex = c.lines.find((l) => l.merchandiseId === merchandiseId);
    if (ex) ex.quantity += quantity; else c.lines.push({ id: `line-${merchandiseId}`, merchandiseId, title: p.title, code: p.code, quantity, price: p.price });
    memory = save(total(c)); return memory;
  },
  async updateLine(id, lineId, quantity) {
    await wait(); const c = (load() || memory)!; c.lines = c.lines.map((l) => (l.id === lineId ? { ...l, quantity } : l)).filter((l) => l.quantity > 0);
    memory = save(total(c)); return memory;
  },
  async removeLine(id, lineId) { await wait(); const c = (load() || memory)!; c.lines = c.lines.filter((l) => l.id !== lineId); memory = save(total(c)); return memory; },
};

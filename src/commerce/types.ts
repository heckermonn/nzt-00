/** Commerce shapes, modelled on Shopify's Storefront API so a real backend drops in without touching the UI. */
export interface Money { amount: number; currencyCode: string }
export interface Product {
  id: string;          // Shopify: ProductVariant gid; mock: formula id
  handle: string;
  title: string;
  code: string;
  price: Money;        // per month
}
export interface CartLine { id: string; merchandiseId: string; title: string; code: string; quantity: number; price: Money }
export interface Cart { id: string; lines: CartLine[]; subtotal: Money; checkoutUrl: string; emulated: boolean }

export interface CommerceAdapter {
  readonly name: string;
  getProducts(): Promise<Product[]>;
  createCart(): Promise<Cart>;
  getCart(cartId: string): Promise<Cart | null>;
  addLine(cartId: string, merchandiseId: string, quantity?: number): Promise<Cart>;
  updateLine(cartId: string, lineId: string, quantity: number): Promise<Cart>;
  removeLine(cartId: string, lineId: string): Promise<Cart>;
}

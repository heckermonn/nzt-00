import type { Cart, CommerceAdapter, Product } from './types';

/**
 * Placeholder Shopify Storefront API adapter. Written against the public Storefront GraphQL schema but not yet
 * run against a store: enable it with VITE_COMMERCE=shopify plus the domain and a public Storefront token.
 * Products are expected to carry a `custom.code` metafield (e.g. "00·02"); subscriptions would add selling plans.
 */
const domain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN as string | undefined;
const token = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN as string | undefined;
const version = (import.meta.env.VITE_SHOPIFY_API_VERSION as string | undefined) || '2025-10';

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!domain || !token) throw new Error('Shopify adapter needs VITE_SHOPIFY_STORE_DOMAIN and VITE_SHOPIFY_STOREFRONT_TOKEN');
  const res = await fetch(`https://${domain}/api/${version}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e: { message: string }) => e.message).join('; '));
  return json.data as T;
}

const CART = `id checkoutUrl cost { subtotalAmount { amount currencyCode } }
  lines(first: 50) { nodes { id quantity merchandise { ... on ProductVariant { id price { amount currencyCode } product { title metafield(namespace: "custom", key: "code") { value } } } } } }`;

type RawCart = { id: string; checkoutUrl: string; cost: { subtotalAmount: { amount: string; currencyCode: string } };
  lines: { nodes: { id: string; quantity: number; merchandise: { id: string; price: { amount: string; currencyCode: string }; product: { title: string; metafield: { value: string } | null } } }[] } };

const toCart = (c: RawCart): Cart => ({
  id: c.id, checkoutUrl: c.checkoutUrl, emulated: false,
  subtotal: { amount: Number(c.cost.subtotalAmount.amount), currencyCode: c.cost.subtotalAmount.currencyCode },
  lines: c.lines.nodes.map((l) => ({ id: l.id, merchandiseId: l.merchandise.id, quantity: l.quantity, title: l.merchandise.product.title,
    code: l.merchandise.product.metafield?.value ?? '', price: { amount: Number(l.merchandise.price.amount), currencyCode: l.merchandise.price.currencyCode } })),
});

export const shopifyAdapter: CommerceAdapter = {
  name: 'Shopify',
  async getProducts(): Promise<Product[]> {
    const d = await gql<{ products: { nodes: { handle: string; title: string; metafield: { value: string } | null; variants: { nodes: { id: string; price: { amount: string; currencyCode: string } }[] } }[] } }>(
      `{ products(first: 20) { nodes { handle title metafield(namespace: "custom", key: "code") { value } variants(first: 1) { nodes { id price { amount currencyCode } } } } } }`);
    return d.products.nodes.map((p) => ({ id: p.variants.nodes[0].id, handle: p.handle, title: p.title, code: p.metafield?.value ?? '',
      price: { amount: Number(p.variants.nodes[0].price.amount), currencyCode: p.variants.nodes[0].price.currencyCode } }));
  },
  async createCart() { const d = await gql<{ cartCreate: { cart: RawCart } }>(`mutation { cartCreate { cart { ${CART} } } }`); return toCart(d.cartCreate.cart); },
  async getCart(id) { const d = await gql<{ cart: RawCart | null }>(`query($id: ID!) { cart(id: $id) { ${CART} } }`, { id }); return d.cart ? toCart(d.cart) : null; },
  async addLine(cartId, merchandiseId, quantity = 1) {
    const d = await gql<{ cartLinesAdd: { cart: RawCart } }>(`mutation($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART} } } }`,
      { cartId, lines: [{ merchandiseId, quantity }] });
    return toCart(d.cartLinesAdd.cart);
  },
  async updateLine(cartId, lineId, quantity) {
    const d = await gql<{ cartLinesUpdate: { cart: RawCart } }>(`mutation($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CART} } } }`,
      { cartId, lines: [{ id: lineId, quantity }] });
    return toCart(d.cartLinesUpdate.cart);
  },
  async removeLine(cartId, lineId) {
    const d = await gql<{ cartLinesRemove: { cart: RawCart } }>(`mutation($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${CART} } } }`,
      { cartId, lineIds: [lineId] });
    return toCart(d.cartLinesRemove.cart);
  },
};

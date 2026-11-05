import type { Product } from '@/models/Product';
export type Cart = Record<string, number>;
export function setCartQuantity(
  cart: Cart,
  id: string,
  quantity: number,
  max: number,
): Cart {
  const next = { ...cart };
  const n = Math.min(max, Math.max(0, Math.trunc(quantity) || 0));
  if (n) next[id] = n;
  else delete next[id];
  return next;
}
export function cartSubtotal(cart: Cart, products: Product[]) {
  return (
    products.reduce(
      (c, p) => c + Math.round(p.price * 100) * (cart[p.id] || 0),
      0,
    ) / 100
  );
}

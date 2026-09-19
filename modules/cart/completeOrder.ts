import type { ConfirmationResult } from '@/modules/confirmation/order';

/** Called only with the authenticated confirmation API response. A per-session
 * marker prevents reopening a receipt from clearing a later shopping basket. */
export function completeOrderBasket(storage: Pick<Storage, 'getItem' | 'setItem'>, sessionId: string, result: ConfirmationResult) {
  if (result.state !== 'paid') return false;
  const marker = `doko-basket-completed:${sessionId}`;
  if (storage.getItem(marker)) return false;
  const cart = JSON.parse(storage.getItem('doko-basket') || '{}');
  if (!cart || typeof cart !== 'object' || Array.isArray(cart)) return false;
  // Preserve items added in another tab while Stripe checkout was open.
  for (const item of result.order.items) {
    if (!Object.hasOwn(cart, item.product_id)) continue;
    const remaining = Number(cart[item.product_id]) - item.quantity;
    if (Number.isFinite(remaining) && remaining > 0) cart[item.product_id] = remaining;
    else delete cart[item.product_id];
  }
  storage.setItem('doko-basket', JSON.stringify(cart));
  storage.setItem(marker, '1');
  return true;
}

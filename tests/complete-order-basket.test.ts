import test from 'node:test';
import assert from 'node:assert/strict';
import { completeOrderBasket } from '@/modules/cart/completeOrder';
import type { ConfirmationResult } from '@/modules/confirmation/order';
function storage(cart: object) {
  const data = new Map([['doko-basket', JSON.stringify(cart)]]);
  return { getItem: (key:string) => data.get(key) || null, setItem: (key:string, value:string) => {data.set(key, value);} };
}
const paid = {state:'paid', order:{items:[{product_id:'tea', quantity:2}]}} as ConfirmationResult;
test('only verified paid orders clear the basket; returning to the receipt does not clear a new basket', () => {
  const s = storage({tea:2});
  for (const state of ['processing', 'failed', 'unverified'] as const) {
    assert.equal(completeOrderBasket(s, 'session', {state}), false);
    assert.equal(s.getItem('doko-basket'), '{"tea":2}');
  }
  assert.equal(completeOrderBasket(s, 'session', paid), true);
  assert.equal(s.getItem('doko-basket'), '{}');
  s.setItem('doko-basket', '{"tea":2}');
  assert.equal(completeOrderBasket(s, 'session', paid), false);
  assert.equal(s.getItem('doko-basket'), '{"tea":2}');
});
test('basket additions during payment are preserved', () => {
  const s = storage({tea:3, rice:1});
  completeOrderBasket(s, 'session', paid);
  assert.equal(s.getItem('doko-basket'), '{"tea":1,"rice":1}');
});

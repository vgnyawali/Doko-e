import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptCookie, canReadReceipt } from '@/modules/confirmation/access';
import {
  confirmationFromOrder,
  type OrderRow,
} from '@/modules/confirmation/order';
import {
  checkoutEventUpdate,
  type StripeCheckoutEvent,
} from '@/modules/checkout/paymentEvents';
import { quoteCheckout } from '@/modules/checkout/quote';
import { seedProducts } from '@/data/products';
import { defaultSettings } from '@/config/defaults';
const customer = {
  name: 'Receipt Test',
  email: 'test@example.com',
  address: 'Original address',
  city: 'Example',
  state: 'NY',
  zip: '10001',
  country: 'US',
};
const q = quoteCheckout(
  { items: [{ product_id: seedProducts[0].id, quantity: 1 }], customer },
  seedProducts,
  defaultSettings,
);
const event: StripeCheckoutEvent = {
  type: 'checkout.session.completed',
  created: 1800000000,
  data: {
    object: {
      id: 'cs_test_receiptfixture',
      metadata: { doko_order_id: 'abcdef0123456789' },
      payment_status: 'paid',
      currency: 'usd',
      created: 1800000000,
      amount_subtotal: 1899,
      amount_total: 2099,
      total_details: {
        amount_tax: 100,
        amount_shipping: 200,
        amount_discount: 100,
      },
      customer_details: { email: 'confirmed@example.com' },
      shipping_details: {
        name: 'Receipt Test',
        address: {
          line1: 'Stripe confirmed street',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'US',
        },
      },
    },
  },
};
function row(): OrderRow {
  return {
    id: 'abcdef0123456789',
    session_id: event.data.object.id,
    status: 'paid',
    data: JSON.stringify({
      quote: q,
      customer,
      created_at: '2027-01-15T08:00:00.000Z',
    }),
    payment_data: JSON.stringify(checkoutEventUpdate(event)!.payment_data),
  };
}
test('receipt requires matching browser proof; modified, expired and other-session cookies fail', () => {
  const id = event.data.object.id,
    key = 'test-only-key',
    now = 1000000,
    cookie = receiptCookie(id, key, now);
  assert.equal(canReadReceipt(id, cookie, key, now), true);
  assert.equal(canReadReceipt(id, cookie, 'different', now), false);
  assert.equal(canReadReceipt('cs_test_otherSession', cookie, key, now), false);
  assert.equal(canReadReceipt(id, cookie, key, now + 8 * 86400000), false);
  assert.equal(canReadReceipt(id, '', key, now), false);
  assert.match(cookie, /HttpOnly; Secure; SameSite=Lax/);
});
test('pending redirect never produces paid data; failed and corrupt records fail closed', () => {
  assert.deepEqual(confirmationFromOrder({ ...row(), status: 'pending' }), {
    state: 'processing',
  });
  assert.deepEqual(confirmationFromOrder({ ...row(), status: 'failed' }), {
    state: 'failed',
  });
  assert.deepEqual(confirmationFromOrder({ ...row(), payment_data: '{}' }), {
    state: 'unverified',
  });
  assert.deepEqual(confirmationFromOrder({ ...row(), session_id: 'wrong' }), {
    state: 'unverified',
  });
});
test('paid receipt uses saved snapshot and Stripe shipping, email and actual amounts', () => {
  const result = confirmationFromOrder(row());
  assert.equal(result.state, 'paid');
  if (result.state !== 'paid') return;
  assert.equal(result.order.total, 20.99);
  assert.equal(result.order.discount, 1);
  assert.equal(result.order.shipping, 2);
  assert.equal(result.order.email, 'confirmed@example.com');
  assert.ok(result.order.address.includes('Stripe confirmed street'));
  assert.equal(result.order.email_sent, false);
  assert.equal(result.order.items[0].image_url, seedProducts[0].image_url);
});
test('inclusive tax, festival notice and email sent status derive only from stored data', () => {
  const order = row(),
    data = JSON.parse(order.data);
  data.quote.items[0].tax_lines[0].tax_behavior = 'inclusive';
  data.quote.items[0].special_occasion = 'Tihar';
  data.confirmation_email_sent_at = '2027-01-15T08:01:00Z';
  order.data = JSON.stringify(data);
  const result = confirmationFromOrder(order);
  assert.equal(result.state, 'paid');
  if (result.state !== 'paid') return;
  assert.equal(result.order.tax_included, true);
  assert.equal(result.order.festival, true);
  assert.equal(result.order.email_sent, true);
});
test('webhook marks only paid Stripe sessions and records failed/expired states', () => {
  assert.equal(
    checkoutEventUpdate({
      ...event,
      data: { object: { ...event.data.object, payment_status: 'unpaid' } },
    }),
    null,
  );
  assert.equal(
    checkoutEventUpdate({
      ...event,
      type: 'checkout.session.async_payment_succeeded',
    })?.status,
    'paid',
  );
  assert.equal(
    checkoutEventUpdate({
      ...event,
      type: 'checkout.session.async_payment_failed',
    })?.status,
    'failed',
  );
  assert.equal(
    checkoutEventUpdate({ ...event, type: 'checkout.session.expired' })?.status,
    'expired',
  );
  assert.equal(
    checkoutEventUpdate({ ...event, type: 'unrelated.event' }),
    null,
  );
  assert.throws(() =>
    checkoutEventUpdate({
      ...event,
      data: { object: { ...event.data.object, amount_total: undefined } },
    }),
  );
});

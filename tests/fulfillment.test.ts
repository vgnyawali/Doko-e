import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteCheckout } from '@/modules/checkout/quote';
import { sessionParameters, paymentReady } from '@/modules/checkout/payment';
import { seedProducts } from '@/data/products';
import { defaultSettings } from '@/config/defaults';
const customer = {
  name: 'Test',
  email: 'test@example.com',
  address: '123 Test Street',
  city: 'Boston',
  state: 'MA',
  zip: '02108',
  country: 'US',
};
const request = { items: [{ product_id: 'P001', quantity: 1 }], customer };
const config = {
  STRIPE_SECRET_KEY: 'sk_test_example',
  STRIPE_WEBHOOK_SECRET: 'whsec_example',
  STRIPE_SHIPPING_RATE_ID: 'shr_example',
};
test('shipping attaches configured rate while local delivery uses zero charge and collects address', () => {
  const shipping = quoteCheckout(
    { ...request, fulfillment_method: 'shipping' },
    seedProducts,
    defaultSettings,
  );
  const delivery = quoteCheckout(
    {
      ...request,
      fulfillment_method: 'delivery',
      delivery_area_confirmed: true,
    },
    seedProducts,
    defaultSettings,
  );
  assert.equal(shipping.shipping, null);
  assert.equal(delivery.shipping, 0);
  const s = sessionParameters(
    shipping,
    customer,
    'https://doko-e.com',
    'shipping',
    config,
  );
  const d = sessionParameters(
    delivery,
    customer,
    'https://doko-e.com',
    'delivery',
    config,
  );
  assert.equal(s.get('shipping_options[0][shipping_rate]'), 'shr_example');
  assert.equal(d.get('shipping_options[0][shipping_rate]'), null);
  assert.equal(
    d.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'),
    '0',
  );
  assert.equal(
    d.get('shipping_options[0][shipping_rate_data][display_name]'),
    'Greater Boston delivery',
  );
  assert.equal(
    d.get('shipping_address_collection[allowed_countries][0]'),
    'US',
  );
  assert.equal(d.get('metadata[fulfillment_method]'), 'delivery');
  assert.equal(
    paymentReady({ ...config, STRIPE_SHIPPING_RATE_ID: '' }, shipping),
    false,
  );
  assert.equal(
    paymentReady({ ...config, STRIPE_SHIPPING_RATE_ID: '' }, delivery),
    true,
  );
});
test('server requires valid delivery address, service-area confirmation and enabled eligibility', () => {
  assert.throws(
    () =>
      quoteCheckout(
        { ...request, fulfillment_method: 'delivery' },
        seedProducts,
        defaultSettings,
      ),
    /Greater Boston/,
  );
  assert.throws(() =>
    quoteCheckout(
      {
        ...request,
        fulfillment_method: 'delivery',
        delivery_area_confirmed: true,
        customer: { ...customer, address: '' },
      },
      seedProducts,
      defaultSettings,
    ),
  );
  assert.throws(() =>
    quoteCheckout(
      {
        ...request,
        fulfillment_method: 'delivery',
        delivery_area_confirmed: true,
      },
      seedProducts,
      {
        ...defaultSettings,
        shipping_enabled: {
          ...defaultSettings.shipping_enabled,
          local_only: false,
        },
      },
    ),
  );
  assert.throws(() =>
    quoteCheckout(
      { ...request, fulfillment_method: 'shipping' },
      seedProducts.map((p) => ({ ...p, shipping_type: 'local_only' })),
      defaultSettings,
    ),
  );
  assert.throws(() =>
    quoteCheckout(
      { ...request, fulfillment_method: 'pickup' as 'delivery' },
      seedProducts,
      defaultSettings,
    ),
  );
});
test('free-shipping threshold remains enforced server-side and supplied charges are ignored', () => {
  const q = quoteCheckout(
    {
      ...request,
      items: [{ product_id: 'P001', quantity: 5 }],
      fulfillment_method: 'shipping',
      shipping: -999,
    } as typeof request,
    seedProducts,
    defaultSettings,
  );
  assert.equal(q.shipping, 0);
  assert.equal(
    sessionParameters(q, customer, 'https://doko-e.com', 'order', config).get(
      'shipping_options[0][shipping_rate_data][display_name]',
    ),
    'Free U.S. shipping',
  );
});

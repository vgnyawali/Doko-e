import test from 'node:test';
import assert from 'node:assert/strict';
import { customerDetails, customersCsv, loadOrdersForExport } from '@/modules/orders/customer';
import type { CheckoutOrder } from '@/models/CheckoutOrder';

const order = {
  id: 'customerfixture', session_id: 'cs_test_fixture', status: 'paid',
  data: { customer: { name: '=FORMULA()', email: 'original@example.com', address: 'Old address', city: 'Boston', state: 'MA', zip: '02108', country: 'US' },
    quote: { subtotal: 10, items: [{ name: 'चिया, "Tea"\nBox', quantity: 2 }] } },
  payment_data: { customer_details: { email: 'confirmed@example.com' }, shipping_details: { name: '=FORMULA()', address: { line1: 'New address', city: 'Cambridge', postal_code: '02139', country: 'US' } }, amount_total: 1299, amount_shipping: 299, amount_tax: 0 },
} as CheckoutOrder;
test('customer details prefer the saved Stripe address without mixing original address fields', () => {
  const c = customerDetails(order);
  assert.equal(c.email, 'confirmed@example.com');
  assert.equal(c.line1, 'New address');
  assert.equal(c.state, '');
  assert.equal(customerDetails({...order, payment_data: null}).postalCode, '02108');
});
test('CSV escapes formulas, quotes, Unicode and newlines and leaves unpaid totals blank', () => {
  const csv = customersCsv([order, {...order, status:'pending'}]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"'=FORMULA\(\)"/);
  assert.match(csv, /चिया, ""Tea""\nBox × 2/);
  assert.match(csv, /"12.99"\r\n/);
  assert.ok(csv.endsWith(',""\r\n'));
});
test('export loads every page and aborts on authorization failure rather than downloading partial data', async () => {
  const urls: string[] = [];
  const request = (async (url) => {
    urls.push(String(url));
    return Response.json({orders:[order], next_cursor: urls.length === 1 ? 25 : null});
  }) as typeof fetch;
  assert.equal((await loadOrdersForExport(request)).length, 2);
  assert.deepEqual(urls, ['/api/admin/orders', '/api/admin/orders?before=25']);
  await assert.rejects(loadOrdersForExport((async () => new Response('', {status:403})) as typeof fetch), /admin session/);
});

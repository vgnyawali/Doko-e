import type { CheckoutOrder } from '@/models/CheckoutOrder';

/** Prefer the address confirmed by Stripe; preserve the original for pending orders. */
export function customerDetails(order: CheckoutOrder) {
  const original = order.data.customer;
  const shipping = order.payment_data?.shipping_details;
  const address = shipping?.address;
  return {
    name: shipping?.name || original?.name || '',
    email: order.payment_data?.customer_details?.email || original?.email || '',
    line1: address ? address.line1 || '' : original?.address || '',
    line2: address?.line2 || '',
    city: address ? address.city || '' : original?.city || '',
    state: address ? address.state || '' : original?.state || '',
    postalCode: address ? address.postal_code || '' : original?.zip || '',
    country: address ? address.country || '' : original?.country || '',
  };
}

// Quote every cell, preserve Unicode, and neutralize spreadsheet formulas.
function cell(value: unknown) {
  let text = value == null ? '' : String(value);
  if (/^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
export function customersCsv(orders: CheckoutOrder[]) {
  const rows: unknown[][] = [[
    'Order number', 'Order ID', 'Order date', 'Payment status', 'Fulfillment',
    'Customer name', 'Customer email', 'Address line 1', 'Address line 2',
    'City', 'State', 'ZIP', 'Country', 'Items', 'Subtotal (USD)',
    'Shipping / delivery (USD)', 'Tax (USD)', 'Discount (USD)', 'Total paid (USD)',
  ]];
  const amount = (n?: number) => n === undefined ? '' : (n / 100).toFixed(2);
  for (const order of orders) {
    const c = customerDetails(order), p = order.payment_data, q = order.data.quote;
    rows.push([
      `DOKO-${order.id.slice(0, 12).toUpperCase()}`, order.id,
      order.data.created_at || (p?.created ? new Date(p.created * 1000).toISOString() : ''),
      order.status, q.fulfillment_method === 'delivery' ? 'Greater Boston delivery' : 'Shipping',
      c.name, c.email, c.line1, c.line2, c.city, c.state, c.postalCode, c.country,
      q.items.map(i => `${i.name} × ${i.quantity}`).join('; '), q.subtotal.toFixed(2),
      amount(p?.amount_shipping), amount(p?.amount_tax), amount(p?.amount_discount),
      order.status === 'paid' ? amount(p?.amount_total) : '',
    ]);
  }
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

/** Export through the same authenticated, paginated API as the admin list. */
export async function loadOrdersForExport(request: typeof fetch = fetch) {
  const orders: CheckoutOrder[] = [];
  let before: number | null = null;
  do {
    const response = await request(`/api/admin/orders?include_hidden=true${before === null ? '' : `&before=${before}`}`, { cache: 'no-store' });
    if (!response.ok) throw Error('Unable to export orders. Check your admin session and try again.');
    const page = await response.json() as { orders: CheckoutOrder[]; next_cursor: number | null };
    if (!Array.isArray(page.orders) || (page.next_cursor !== null &&
      (!Number.isSafeInteger(page.next_cursor) || page.next_cursor < 1 || (before !== null && page.next_cursor >= before))))
      throw Error('Unable to export orders: invalid page response.');
    orders.push(...page.orders);
    before = page.next_cursor;
  } while (before !== null);
  return orders;
}

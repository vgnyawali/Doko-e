import { confirmationFromOrder, type OrderRow, type Receipt } from '@/modules/confirmation/order';

export interface EmailConfig {
  RESEND_API_KEY?: string;
  ORDER_EMAIL_FROM?: string;
  ORDER_EMAIL_ENABLED?: string;
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const money = (n: number) => `$${n.toFixed(2)}`;

/** Build only from the verified server receipt, never browser totals or addresses. */
export function confirmationEmail(order: Receipt, from: string, sandbox: boolean) {
  const delivery = order.fulfillment_method === 'delivery';
  const text = [
    'Thank You for Your Order', 'धन्यवाद!',
    'नेपालसँगको आत्मीयता तपाईंको घरसम्म पुर्‍याउन पाउँदा हामीलाई गर्व र खुसी लागेको छ।',
    'Your payment was successful, and we’ve received your order.',
    `Order: ${order.order_number}`, `Order date: ${order.order_date || 'Not recorded'}`,
    `Payment: ${order.payment_status}`, `Order status: ${order.order_status}`,
    `${delivery ? 'Delivery' : 'Shipping'} address:`, ...order.address,
    '', 'Items ordered:',
    ...order.items.map(i => `${i.name} — ${i.quantity} × ${money(i.unit_price)} = ${money(i.line_total)}`),
    '', `Subtotal: ${money(order.subtotal)}`,
    `${delivery ? 'Delivery' : 'Shipping'}: ${money(order.shipping)}`,
    `Tax: ${order.tax_included ? 'Included' : money(order.tax)}`,
    ...(order.discount ? [`Discount: −${money(order.discount)}`] : []),
    `Total paid: ${money(order.total)}`, '',
    delivery ? 'We’ll prepare your Doko and contact you by email to coordinate your Greater Boston delivery.' : 'We’ll prepare your Doko for shipment. Once your order ships, we’ll send tracking information to your email when available.',
    ...(order.festival ? ['Festival orders are prepared with care and shipped according to the delivery schedule shown at checkout. Please order early to allow sufficient time for delivery before the festival.'] : []),
    'Questions about your order? Reply to order@doko-e.com and include your order number.',
  ].join('\n');
  return {
    from, to: [sandbox ? 'delivered@resend.dev' : order.email],
    reply_to: 'order@doko-e.com',
    subject: `${sandbox ? '[Sandbox] ' : ''}Doko order confirmed — ${order.order_number}`,
    text,
    html: `<div style="background:#fff;color:#302323;font:16px/1.7 Arial,sans-serif;max-width:640px;margin:auto;padding:28px;border-top:5px solid #801f32"><h1 style="color:#801f32">Thank You for Your Order</h1><h2 style="color:#a67c28">धन्यवाद!</h2>${text.split('\n').slice(2).map(line => `<div>${escape(line) || '<br>'}</div>`).join('')}</div>`,
  };
}

/** Persist a stable message and claim a lease before calling the provider.
 * Stripe retries unsuccessful webhooks. Resend's key protects concurrent or
 * interrupted attempts; the stored sent marker protects later webhook replays.
 */
export async function sendOrderConfirmation(db: D1Database, orderId: string, sessionId: string, config: EmailConfig, send: typeof fetch = fetch, now = Date.now()) {
  if (config.ORDER_EMAIL_ENABLED?.trim() !== 'true') return;
  if (!config.RESEND_API_KEY?.trim() || !config.ORDER_EMAIL_FROM?.trim()) throw Error('Email configuration incomplete');
  const row = await db.prepare('SELECT id, session_id, status, data, payment_data FROM checkout_orders WHERE id = ? AND session_id = ?')
    .bind(orderId, sessionId).first<OrderRow>();
  if (!row) throw Error('Email order unavailable');
  const result = confirmationFromOrder(row);
  if (result.state !== 'paid') throw Error('Email requires verified payment');
  const data = JSON.parse(row.data);
  if (data.confirmation_email_sent_at || data.confirmation_email_test_sent_at) return;
  const sandbox = sessionId.startsWith('cs_test_');
  if (!sandbox && !sessionId.startsWith('cs_live_')) throw Error('Unknown checkout mode');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.order.email)) throw Error('Email recipient unavailable');
  // Never retry an ambiguous send after the provider's 24-hour deduplication
  // window. Staff must check the Resend log before resolving it manually.
  if (data.confirmation_email_first_attempt_at && now - data.confirmation_email_first_attempt_at >= 23 * 3600000) {
    throw Error('Email requires manual review');
  }
  const body = JSON.stringify(confirmationEmail(result.order, config.ORDER_EMAIL_FROM.trim(), sandbox));
  const lease = crypto.randomUUID();
  const claimed = await db.prepare(`UPDATE checkout_orders SET data = json_set(data,
      '$.confirmation_email_payload', COALESCE(json_extract(data, '$.confirmation_email_payload'), ?),
      '$.confirmation_email_first_attempt_at', COALESCE(json_extract(data, '$.confirmation_email_first_attempt_at'), ?),
      '$.confirmation_email_lease', ?, '$.confirmation_email_lease_until', ?)
    WHERE id = ? AND session_id = ? AND status = 'paid'
      AND json_extract(data, '$.confirmation_email_sent_at') IS NULL
      AND json_extract(data, '$.confirmation_email_test_sent_at') IS NULL
      AND COALESCE(json_extract(data, '$.confirmation_email_lease_until'), 0) <= ?
    RETURNING data`).bind(body, now, lease, now + 60000, orderId, sessionId, now).first<{data: string}>();
  if (!claimed) throw Error('Email attempt already in progress');
  try {
    const response = await send('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.RESEND_API_KEY.trim()}`, 'Content-Type': 'application/json', 'Idempotency-Key': `doko-order/${orderId}` },
      body: JSON.parse(claimed.data).confirmation_email_payload,
      signal: AbortSignal.timeout(10000),
    });
    // Do not log provider bodies: they can contain customer details.
    if (!response.ok) throw Error('Email provider rejected request');
    const accepted = await response.json() as { id?: string };
    if (!accepted.id) throw Error('Email provider did not confirm acceptance');
    const marker = sandbox ? '$.confirmation_email_test_sent_at' : '$.confirmation_email_sent_at';
    await db.prepare(`UPDATE checkout_orders SET data = json_set(data, ?, ?, '$.confirmation_email_provider_id', ?, '$.confirmation_email_lease_until', 0)
      WHERE id = ? AND json_extract(data, '$.confirmation_email_lease') = ?`)
      .bind(marker, new Date(now).toISOString(), accepted.id, orderId, lease).run();
  } catch {
    await db.prepare("UPDATE checkout_orders SET data = json_set(data, '$.confirmation_email_lease_until', 0) WHERE id = ? AND json_extract(data, '$.confirmation_email_lease') = ?")
      .bind(orderId, lease).run();
    throw Error('Order email not confirmed');
  }
}

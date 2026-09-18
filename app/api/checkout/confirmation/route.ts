import { env } from 'cloudflare:workers';
import { canReadReceipt } from '@/modules/confirmation/access';
import {
  confirmationFromOrder,
  type OrderRow,
} from '@/modules/confirmation/order';
export async function GET(request: Request) {
  const headers = {
    'Cache-Control': 'private, no-store, max-age=0',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  };
  const respond = (body: unknown, status = 200) =>
    Response.json(body, { status, headers });
  const id = new URL(request.url).searchParams.get('session_id') || '';
  if (
    !/^cs_(test|live)_[A-Za-z0-9]{10,250}$/.test(id) ||
    !env.STRIPE_SECRET_KEY ||
    !canReadReceipt(
      id,
      request.headers.get('cookie') || '',
      env.STRIPE_SECRET_KEY,
    )
  )
    return respond({ state: 'unverified' }, 403);
  try {
    const row = await env.DB.prepare(
      'SELECT id,session_id,status,data,payment_data FROM checkout_orders WHERE session_id = ?',
    )
      .bind(id)
      .first<OrderRow>();
    if (!row) return respond({ state: 'unverified' }, 404);
    // Read-only: only the signed Stripe webhook can set the paid state.
    return respond(confirmationFromOrder(row));
  } catch {
    return respond({ state: 'unverified' }, 503);
  }
}

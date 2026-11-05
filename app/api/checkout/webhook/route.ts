import { env } from 'cloudflare:workers';
import { validStripeSignature } from '@/modules/checkout/webhook';
import { checkoutEventUpdate } from '@/modules/checkout/paymentEvents';
import { sendOrderConfirmation } from '@/modules/email/confirmation';
export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET)
    return new Response('Unavailable', { status: 503 });
  const raw = await request.text();
  if (
    raw.length > 1000000 ||
    !validStripeSignature(
      raw,
      request.headers.get('stripe-signature') || '',
      env.STRIPE_WEBHOOK_SECRET,
    )
  )
    return new Response('Invalid signature', { status: 400 });
  try {
    const update = checkoutEventUpdate(JSON.parse(raw));
    if (update) {
      const order = await env.DB.prepare(
        'SELECT id FROM checkout_orders WHERE id = ?',
      )
        .bind(update.order_id)
        .first();
      if (!order) return new Response('Order not ready', { status: 503 });
      // Paid is terminal. A delayed failure/expiry event must never reverse it.
      await env.DB.prepare(
        "UPDATE checkout_orders SET status = ?, session_id = ?, payment_data = COALESCE(?, payment_data) WHERE id = ? AND status != 'paid' AND (session_id IS NULL OR session_id = ?)",
      )
        .bind(
          update.status,
          update.session_id,
          update.payment_data ? JSON.stringify(update.payment_data) : null,
          update.order_id,
          update.session_id,
        )
        .run();
      // Await provider acceptance before acknowledging: Stripe retries errors.
      // A failed email never rolls back a verified paid order.
      if (update.status === 'paid') {
        await sendOrderConfirmation(env.DB, update.order_id, update.session_id, env);
      }
    }
    return Response.json({ received: true });
  } catch {
    return new Response('Unable to process payment event', { status: 500 });
  }
}

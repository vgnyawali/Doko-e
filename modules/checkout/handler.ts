import { readStore } from '@/services/repository';
import { quoteCheckout, type CheckoutRequest } from './quote';
import { createPaymentSession, paymentReady, sessionParameters } from './payment';
import { env } from 'cloudflare:workers';
import { createHash } from 'node:crypto';

export async function handleCheckout(request: Request, payment = false) {
  const respond = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return respond({ error: 'Invalid request origin.' }, 403);
  if (!request.headers.get('content-type')?.includes('application/json'))
    return respond({ error: 'Expected JSON.' }, 415);
  let input: CheckoutRequest;
  try {
    const text = await request.text();
    if (text.length > 32000)
      return respond({ error: 'Checkout request is too large.' }, 413);
    input = JSON.parse(text);
  } catch {
    return respond({ error: 'Invalid checkout request.' }, 400);
  }
  let store;
  try {
    store = await readStore();
  } catch {
    return respond(
      { error: 'The catalog is temporarily unavailable. Please try again.' },
      503,
    );
  }
  try {
    const quote = quoteCheckout(input, store.products, store.settings);
    if (!payment) return respond({ quote });
    if (!paymentReady(env, quote)) return respond({ status: 'not_configured', quote, message: 'Secure payment is not yet configured. Please contact support. Your basket is saved.' }, 503);
    const attempt = (input as CheckoutRequest & { attempt?: string }).attempt;
    if (!attempt || !/^[a-f0-9-]{36}$/i.test(attempt)) return respond({error:'Please refresh checkout and try again.'},400);
    // Retries of an unchanged checkout reuse the same Stripe idempotency key.
    const orderId = createHash('sha256').update(JSON.stringify({attempt,quote,customer:input.customer})).digest('hex');
    const body = sessionParameters(quote,input.customer,new URL(request.url).origin,orderId,env);
    await env.DB.prepare('INSERT OR IGNORE INTO checkout_orders (id, status, data) VALUES (?, ?, ?)').bind(orderId,'pending',JSON.stringify({quote,customer:input.customer})).run();
    try {
      const session = await createPaymentSession(body,env.STRIPE_SECRET_KEY!,orderId);
      await env.DB.prepare('UPDATE checkout_orders SET session_id = ? WHERE id = ?').bind(session.id,orderId).run();
      return respond({quote,checkout_url:session.url});
    } catch {
      return respond({error:'Unable to start secure payment. Please try again or contact support.'},502);
    }
  } catch (error) {
    return respond(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to validate checkout.',
      },
      400,
    );
  }
}

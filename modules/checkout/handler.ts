import { readStore } from '@/services/repository';
import { quoteCheckout, type CheckoutRequest } from './quote';
import { createPaymentSession } from './payment';

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
    return payment
      ? respond({ ...createPaymentSession(), quote }, 503)
      : respond({ quote });
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

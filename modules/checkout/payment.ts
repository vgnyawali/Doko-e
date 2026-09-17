import type { CheckoutQuote, CheckoutRequest } from './quote';
export interface PaymentConfig {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_SHIPPING_RATE_ID?: string;
}
export function paymentReady(c: PaymentConfig, q: CheckoutQuote) {
  return !!(
    c.STRIPE_SECRET_KEY?.trim() &&
    c.STRIPE_WEBHOOK_SECRET?.trim() &&
    (q.shipping === 0 || c.STRIPE_SHIPPING_RATE_ID?.trim())
  );
}
// Prices come only from the validated server catalog, never browser input.
export function sessionParameters(
  q: CheckoutQuote,
  customer: CheckoutRequest['customer'],
  origin: string,
  orderId: string,
  c: PaymentConfig,
) {
  const body = new URLSearchParams({
    mode: 'payment',
    customer_email: customer.email.trim(),
    client_reference_id: orderId,
    'metadata[doko_order_id]': orderId,
    'automatic_tax[enabled]': 'true',
    'shipping_address_collection[allowed_countries][0]': 'US',
    success_url: `${origin}/checkout?payment=returned`,
    cancel_url: `${origin}/checkout?payment=cancelled`,
    'custom_text[submit][message]':
      'All sales are final. Please review your order before paying.',
  });
  q.items
    .flatMap((item) => item.tax_lines)
    .forEach((item, i) => {
      body.set(`line_items[${i}][price_data][currency]`, 'usd');
      body.set(
        `line_items[${i}][price_data][unit_amount]`,
        String(item.unit_amount),
      );
      body.set(`line_items[${i}][price_data][tax_behavior]`, item.tax_behavior);
      body.set(
        `line_items[${i}][price_data][product_data][tax_code]`,
        item.tax_code,
      );
      body.set(`line_items[${i}][price_data][product_data][name]`, item.name);
      body.set(
        `line_items[${i}][price_data][product_data][metadata][product_id]`,
        item.product_id,
      );
      body.set(`line_items[${i}][quantity]`, String(item.quantity));
    });
  if (q.shipping === 0) {
    body.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
    body.set(
      'shipping_options[0][shipping_rate_data][fixed_amount][amount]',
      '0',
    );
    body.set(
      'shipping_options[0][shipping_rate_data][fixed_amount][currency]',
      'usd',
    );
    body.set(
      'shipping_options[0][shipping_rate_data][display_name]',
      'Free U.S. shipping',
    );
  } else
    body.set(
      'shipping_options[0][shipping_rate]',
      c.STRIPE_SHIPPING_RATE_ID!.trim(),
    );
  return body;
}
export async function createPaymentSession(
  body: URLSearchParams,
  key: string,
  orderId: string,
  send = fetch,
) {
  const response = await send('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key.trim()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': orderId,
      'Stripe-Version': '2025-02-24.acacia',
    },
    body,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as {
      error?: { message?: string; code?: string; param?: string };
    };
    const message = result.error?.message || '';
    // Log only fixed categories; never keys, raw provider messages or customer data.
    const category =
      response.status === 401
        ? 'api_key_rejected'
        : /tax|head office|business address/i.test(message)
          ? 'stripe_tax_setup_required'
          : /shipping.rate|shipping_rate/i.test(
                message + ' ' + result.error?.param,
              )
            ? 'shipping_rate_invalid'
            : /test mode|live mode/i.test(message)
              ? 'stripe_mode_mismatch'
              : result.error?.code === 'parameter_unknown'
                ? 'unsupported_parameter'
                : 'stripe_request_rejected';
    console.error('Stripe checkout diagnostic', {
      status: response.status,
      category,
    });
    throw Error(
      'Unable to start secure payment. Please try again or contact support.',
    );
  }
  const session = (await response.json()) as { id: string; url: string };
  if (
    !session.id ||
    !session.url ||
    new URL(session.url).origin !== 'https://checkout.stripe.com'
  )
    throw Error('Invalid payment response. Please contact support.');
  return session;
}

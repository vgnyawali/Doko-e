import type { PaymentSnapshot } from '@/modules/confirmation/order';
export interface StripeCheckoutEvent {
  type: string;
  created: number;
  data: {
    object: {
      id: string;
      metadata?: { doko_order_id?: string };
      payment_status?: string;
      currency?: string;
      created?: number;
      amount_subtotal?: number;
      amount_total?: number;
      total_details?: {
        amount_tax?: number;
        amount_shipping?: number;
        amount_discount?: number;
      };
      customer_details?: PaymentSnapshot['customer_details'];
      shipping_details?: PaymentSnapshot['shipping_details'];
      collected_information?: {
        shipping_details?: PaymentSnapshot['shipping_details'];
      };
      payment_intent?: string;
    };
  };
}
export function checkoutEventUpdate(event: StripeCheckoutEvent) {
  const s = event.data?.object;
  if (!s?.id || !s.metadata?.doko_order_id) return null;
  const success = [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
  ].includes(event.type);
  if (success && s.payment_status === 'paid' && s.currency === 'usd') {
    const amounts = [
      s.amount_subtotal,
      s.amount_total,
      s.total_details?.amount_tax,
      s.total_details?.amount_shipping,
    ];
    if (!amounts.every((v) => Number.isSafeInteger(v) && Number(v) >= 0))
      throw Error('Incomplete payment amounts');
    return {
      status: 'paid' as const,
      session_id: s.id,
      order_id: s.metadata.doko_order_id,
      payment_data: {
        session_id: s.id,
        payment_status: 'paid',
        currency: s.currency,
        created: s.created,
        paid_at: new Date(event.created * 1000).toISOString(),
        amount_subtotal: s.amount_subtotal,
        amount_tax: s.total_details?.amount_tax,
        amount_shipping: s.total_details?.amount_shipping,
        amount_discount: s.total_details?.amount_discount || 0,
        amount_total: s.amount_total,
        customer_details: s.customer_details,
        shipping_details:
          s.shipping_details || s.collected_information?.shipping_details,
        payment_intent: s.payment_intent,
      },
    };
  }
  if (
    event.type === 'checkout.session.async_payment_failed' ||
    event.type === 'checkout.session.expired'
  )
    return {
      status: event.type.endsWith('expired')
        ? ('expired' as const)
        : ('failed' as const),
      session_id: s.id,
      order_id: s.metadata.doko_order_id,
      payment_data: null,
    };
  return null;
}

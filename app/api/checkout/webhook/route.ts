import { env } from 'cloudflare:workers';
import { validStripeSignature } from '@/modules/checkout/webhook';

export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response('Unavailable', {status:503});
  const raw = await request.text();
  if (raw.length > 1000000 || !validStripeSignature(raw,request.headers.get('stripe-signature') || '',env.STRIPE_WEBHOOK_SECRET)) return new Response('Invalid signature',{status:400});
  try {
    const event = JSON.parse(raw);
    if (['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) {
      const session = event.data.object;
      const orderId = session.metadata?.doko_order_id;
      if (orderId && session.payment_status === 'paid' && session.currency === 'usd') {
        const order = await env.DB.prepare('SELECT id FROM checkout_orders WHERE id = ?').bind(orderId).first();
        if (!order) return new Response('Order not ready',{status:503});
        // Repeated or out-of-order events cannot undo a confirmed payment.
        await env.DB.prepare("UPDATE checkout_orders SET status = 'paid', session_id = ?, payment_data = ? WHERE id = ? AND status != 'paid'").bind(session.id,JSON.stringify({amount_total:session.amount_total,customer_details:session.customer_details,shipping_details:session.shipping_details,payment_intent:session.payment_intent}),orderId).run();
      }
    }
    return Response.json({received:true});
  } catch { return new Response('Unable to process payment event',{status:500}); }
}

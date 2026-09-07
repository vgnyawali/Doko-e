// Server-only integration boundary. Replace this adapter with your provider's
// hosted checkout session API. Keep secret keys in server environment variables.
export const paymentConfiguration = {
  provider: 'placeholder',
  enabled: false,
  session_endpoint: '/api/checkout/payment',
  required_environment: ['PAYMENT_SECRET_KEY', 'PAYMENT_WEBHOOK_SECRET'],
} as const;

export function createPaymentSession() {
  return {
    status: 'not_configured' as const,
    provider: paymentConfiguration.provider,
    checkout_url: null,
    payment_processed: false,
    order_created: false,
    message:
      'Payment is not connected yet. No charge or order has been created. Your basket is saved.',
  };
}

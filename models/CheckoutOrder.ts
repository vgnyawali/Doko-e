import type { CheckoutQuote, CheckoutRequest } from '@/modules/checkout/quote';
import type { PaymentSnapshot } from '@/modules/confirmation/order';
export interface CheckoutOrder {
  id: string;
  session_id: string | null;
  status: string;
  data: {
    quote: CheckoutQuote;
    customer?: CheckoutRequest['customer'];
    created_at?: string;
    confirmation_email_sent_at?: string;
    confirmation_email_test_sent_at?: string;
    confirmation_email_first_attempt_at?: number;
  };
  payment_data: PaymentSnapshot | null;
}

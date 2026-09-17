import type { CheckoutQuote } from '@/modules/checkout/quote';
export interface CheckoutOrder {
  id: string;
  session_id: string | null;
  status: string;
  data: { quote: CheckoutQuote };
  payment_data: null | {
    amount_subtotal?: number;
    amount_tax?: number;
    amount_shipping?: number;
    amount_total?: number;
    payment_status?: string;
  };
}

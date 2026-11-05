import type { CheckoutQuote, CheckoutRequest } from '@/modules/checkout/quote';
export interface OrderRow {
  id: string;
  session_id: string | null;
  status: string;
  data: string;
  payment_data: string | null;
}
export interface PaymentSnapshot {
  session_id?: string;
  payment_status?: string;
  currency?: string;
  created?: number;
  paid_at?: string;
  amount_subtotal?: number;
  amount_tax?: number;
  amount_shipping?: number;
  amount_discount?: number;
  amount_total?: number;
  customer_details?: { email?: string };
  shipping_details?: {
    name?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
}
export interface OrderSnapshot {
  quote: CheckoutQuote;
  customer?: CheckoutRequest['customer'];
  created_at?: string;
  order_status?: string;
  confirmation_email_sent_at?: string;
}
export interface Receipt {
  fulfillment_method?: 'shipping' | 'delivery';
  order_number: string;
  order_date: string | null;
  payment_status: 'Paid';
  order_status: string;
  email: string;
  address: string[];
  items: {
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    image_url?: string;
  }[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  tax_included: boolean;
  mixed_tax: boolean;
  festival: boolean;
  email_sent: boolean;
}
export type ConfirmationResult =
  | { state: 'paid'; order: Receipt }
  | { state: 'processing' | 'failed' | 'unverified' };
const cents = (v: unknown): v is number =>
  Number.isSafeInteger(v) && Number(v) >= 0;
export function confirmationFromOrder(row: OrderRow): ConfirmationResult {
  if (row.status === 'failed' || row.status === 'expired')
    return { state: 'failed' };
  if (row.status !== 'paid') return { state: 'processing' };
  try {
    const data = JSON.parse(row.data) as OrderSnapshot;
    const paid = JSON.parse(
      row.payment_data || 'null',
    ) as PaymentSnapshot | null;
    if (
      !paid ||
      paid.payment_status !== 'paid' ||
      (paid.session_id && paid.session_id !== row.session_id) ||
      !row.session_id ||
      !cents(paid.amount_total) ||
      !cents(paid.amount_tax) ||
      !cents(paid.amount_shipping) ||
      !cents(paid.amount_subtotal)
    )
      return { state: 'unverified' };
    if (paid.currency && paid.currency !== 'usd')
      return { state: 'unverified' };
    const q = data.quote;
    if (!q?.items?.length) return { state: 'unverified' };
    const address = paid.shipping_details?.address,
      customer = data.customer;
    const lines = q.items
      .flatMap((i) => i.tax_lines || [])
      .filter((l) => l.taxable);
    const allInclusive =
      lines.length > 0 && lines.every((l) => l.tax_behavior === 'inclusive');
    return {
      state: 'paid',
      order: {
        fulfillment_method: q.fulfillment_method || 'shipping',
        order_number: `DOKO-${row.id.slice(0, 12).toUpperCase()}`,
        order_date:
          data.created_at ||
          (paid.created ? new Date(paid.created * 1000).toISOString() : null),
        payment_status: 'Paid',
        order_status: data.order_status || 'Order received',
        email:
          paid.customer_details?.email || customer?.email || 'Not recorded',
        address: address
          ? [
              paid.shipping_details?.name,
              address.line1,
              address.line2,
              [address.city, address.state, address.postal_code]
                .filter(Boolean)
                .join(', '),
              address.country,
            ].filter((s): s is string => !!s)
          : customer
            ? [
                customer.name,
                customer.address,
                `${customer.city}, ${customer.state} ${customer.zip}`,
                customer.country,
              ]
            : ['Not recorded'],
        items: q.items.map((i) => ({
          product_id: i.product_id,
          name: i.name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: i.line_total,
          image_url: i.image_url,
        })),
        subtotal: q.subtotal,
        shipping: paid.amount_shipping / 100,
        tax: paid.amount_tax / 100,
        discount: (paid.amount_discount || 0) / 100,
        total: paid.amount_total / 100,
        tax_included: allInclusive,
        mixed_tax:
          !allInclusive && lines.some((l) => l.tax_behavior === 'inclusive'),
        festival: q.items.some(
          (i) => !!i.special_occasion || /dashain|tihar/i.test(i.name),
        ),
        email_sent: !!data.confirmation_email_sent_at,
      },
    };
  } catch {
    return { state: 'unverified' };
  }
}

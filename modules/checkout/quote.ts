import type { Product } from '@/models/Product';
import type { SiteSettings } from '@/models/SiteSettings';
import {
  normalizeProduct,
  productTaxLines,
  type TaxLine,
} from '@/services/taxService';
import type { BundleComponent } from '@/models/BundleComponent';
import {
  canFulfill,
  deliveryFallback,
  type FulfillmentMethod,
} from '@/services/fulfillment';

export interface CheckoutRequest {
  fulfillment_method?: FulfillmentMethod;
  delivery_area_confirmed?: boolean;
  items: { product_id: string; quantity: number }[];
  customer: {
    name: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}
export interface CheckoutQuote {
  fulfillment_method?: FulfillmentMethod;
  delivery_instructions?: string;
  items: {
    product_id: string;
    name: string;
    quantity: number;
    image_url?: string;
    special_occasion?: string;
    unit_price: number;
    line_total: number;
    product_type: Product['product_type'];
    components: BundleComponent[];
    tax_lines: TaxLine[];
  }[];
  subtotal: number;
  taxable_subtotal: number;
  tax_exempt_subtotal: number;
  shipping: number | null;
  tax: null;
  total: null;
  currency: 'USD';
}
const states = new Set(
  'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(
    ' ',
  ),
);

// Prices and eligibility always come from the current catalog, never the browser.
export function quoteCheckout(
  input: CheckoutRequest,
  products: Product[],
  settings: SiteSettings,
): CheckoutQuote {
  if (
    !input ||
    !Array.isArray(input.items) ||
    !input.items.length ||
    input.items.length > 100
  )
    throw Error('Your basket must contain between 1 and 100 products.');
  const customer = input.customer;
  const method = input.fulfillment_method ?? 'shipping';
  if (!['shipping', 'delivery'].includes(method))
    throw Error('Choose delivery or shipping.');
  if (method === 'delivery' && input.delivery_area_confirmed !== true)
    throw Error(
      'Confirm your delivery address is in the Greater Boston area, or choose shipping.',
    );
  if (
    !customer ||
    ['name', 'email', 'address', 'city', 'state', 'zip', 'country'].some(
      (k) =>
        typeof customer[k as keyof typeof customer] !== 'string' ||
        !customer[k as keyof typeof customer].trim() ||
        customer[k as keyof typeof customer].length > 200,
    )
  )
    throw Error('Complete all contact and shipping fields.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))
    throw Error('Enter a valid email address.');
  if (
    customer.country !== 'US' ||
    !states.has(customer.state.toUpperCase()) ||
    !/^\d{5}(-\d{4})?$/.test(customer.zip)
  )
    throw Error('Enter a valid U.S. state and ZIP code.');
  const seen = new Set<string>();
  const items = input.items.map((item) => {
    if (
      !item ||
      typeof item.product_id !== 'string' ||
      seen.has(item.product_id) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1
    )
      throw Error('Invalid basket quantities or duplicate products.');
    seen.add(item.product_id);
    const p = products.find((p) => p.id === item.product_id);
    if (!p || !canFulfill(p, method, settings))
      throw Error(
        `A basket item is not available for ${method}. Return to your basket to update it.`,
      );
    if (item.quantity > p.inventory)
      throw Error(`Only ${p.inventory} ${p.name} remain. Update your basket.`);
    const cents = Math.round(p.price * 100);
    if (
      !Number.isSafeInteger(cents) ||
      cents < 1 ||
      !Number.isSafeInteger(cents * item.quantity)
    )
      throw Error('A product price is unavailable. Please contact support.');
    return {
      product_id: p.id,
      name: p.name,
      image_url: p.image_url,
      special_occasion: p.special_occasion,
      quantity: item.quantity,
      unit_price: cents / 100,
      line_total: (cents * item.quantity) / 100,
      product_type: normalizeProduct(p).product_type,
      components: structuredClone(normalizeProduct(p).components),
      tax_lines: productTaxLines(p, item.quantity),
    };
  });
  const subtotal =
    items.reduce((sum, item) => sum + Math.round(item.line_total * 100), 0) /
    100;
  // Unconfigured rates are unknown, not zero. No payable total is advertised.
  const taxLines = items.flatMap((item) => item.tax_lines);
  if (taxLines.length > 100)
    throw Error(
      'This basket exceeds Stripe’s 100 tax-portion limit. Please split it into smaller orders.',
    );
  return {
    fulfillment_method: method,
    delivery_instructions:
      method === 'delivery'
        ? settings.delivery_instructions || deliveryFallback
        : undefined,
    items,
    subtotal,
    taxable_subtotal:
      taxLines
        .filter((l) => l.taxable)
        .reduce((s, l) => s + l.unit_amount * l.quantity, 0) / 100,
    tax_exempt_subtotal:
      taxLines
        .filter((l) => !l.taxable)
        .reduce((s, l) => s + l.unit_amount * l.quantity, 0) / 100,
    shipping:
      method === 'delivery' || subtotal >= settings.free_shipping_threshold
        ? 0
        : null,
    tax: null,
    total: null,
    currency: 'USD',
  };
}

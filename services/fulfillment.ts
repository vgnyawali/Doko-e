import type { Product } from '@/models/Product';
import type { SiteSettings } from '@/models/SiteSettings';
export type FulfillmentMethod = 'shipping' | 'delivery';
export const deliveryFallback =
  'Delivery is available in the Greater Boston area only. Enter your delivery address at checkout. Contact order@doko-e.com with delivery questions.';
export function canFulfill(
  p: Product,
  method: FulfillmentMethod,
  s: SiteSettings,
) {
  return (
    p.active &&
    p.inventory > 0 &&
    (method === 'shipping'
      ? p.shipping_type === 'nationwide' && s.shipping_enabled.nationwide
      : s.shipping_enabled.local_only &&
        ['nationwide', 'local_only'].includes(p.shipping_type))
  );
}

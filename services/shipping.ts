import type { Product } from '@/models/Product';
import type { SiteSettings } from '@/models/SiteSettings';
export const shippingLabels = {
  nationwide: 'Ships nationwide',
  local_only: 'Local delivery only',
  pickup_only: 'Pickup only',
  unavailable: 'Shipping unavailable',
};
export function canPurchase(p: Product, s: SiteSettings) {
  return (
    p.active &&
    p.inventory > 0 &&
    p.shipping_type !== 'unavailable' &&
    s.shipping_enabled[p.shipping_type]
  );
}

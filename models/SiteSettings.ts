import type { ShippingType } from './Product';
export interface SiteSettings {
  site_name: string;
  hero_title: string;
  hero_subtitle: string;
  shipping_message: string;
  free_shipping_threshold: number;
  support_email: string;
  announcement: string;
  special_enabled: boolean;
  shipping_enabled: Record<ShippingType, boolean>;
}

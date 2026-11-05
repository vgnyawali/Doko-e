import type { ShippingType } from './Product';
export interface SiteSettings {
  site_name: string;
  browser_title: string;
  hero_title: string;
  hero_subtitle: string;
  shipping_message: string;
  free_shipping_threshold: number;
  featured_items_carousel_threshold: number;
  delivery_instructions?: string;
  support_email: string;
  announcement: string;
  special_enabled: boolean;
  include_original_homepage_cover?: boolean;
  shipping_enabled: Record<ShippingType, boolean>;
}

import type { SiteSettings } from '@/models/SiteSettings';
export const defaultSettings: SiteSettings = {
  site_name: 'Doko',
  hero_title: 'A little taste of home, delivered.',
  hero_subtitle:
    'The Nepali essentials you grew up with. Thoughtfully selected, carefully packed, and brought to your door — anywhere in the U.S.',
  shipping_message: 'Nepali favorites. Delivered across the U.S.',
  free_shipping_threshold: 75,
  support_email: '',
  announcement: 'A little closer to home — now shipping nationwide',
  special_enabled: true,
  shipping_enabled: {
    nationwide: true,
    local_only: false,
    pickup_only: false,
    unavailable: false,
  },
};
export const heroImage =
  'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1400&q=85';

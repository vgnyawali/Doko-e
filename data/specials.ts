import type { FeaturedSpecial } from '@/models/FeaturedSpecial';
import { heroImage } from '@/config/defaults';
export const seedSpecials: FeaturedSpecial[] = [
  {
    id: 'dashain-2026',
    product_id: 'P006',
    occasion: 'Dashain',
    headline: 'Bring the celebration home.',
    description:
      'A thoughtfully gathered Dashain package. Familiar flavors, festive tables, and a little more togetherness.',
    hero_image: heroImage,
    start_date: '2026-09-01',
    end_date: '2026-11-01',
    priority: 1,
    active: true,
  },
];

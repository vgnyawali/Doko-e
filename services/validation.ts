import { shippingTypes, type Product } from '@/models/Product';
import type { SiteSettings } from '@/models/SiteSettings';
import type { FeaturedSpecial } from '@/models/FeaturedSpecial';
export function validateSettings(s: SiteSettings) {
  const e: string[] = [];
  for (const k of [
    'site_name',
    'hero_title',
    'hero_subtitle',
    'shipping_message',
  ] as const)
    if (typeof s[k] !== 'string' || !s[k].trim()) e.push(`${k} is required`);
  if (
    !Number.isFinite(s.free_shipping_threshold) ||
    s.free_shipping_threshold < 0
  )
    e.push('Free shipping threshold must be non-negative');
  if (s.support_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.support_email))
    e.push('Invalid support email');
  if (typeof s.special_enabled !== 'boolean')
    e.push('Invalid specials setting');
  for (const t of shippingTypes)
    if (typeof s.shipping_enabled?.[t] !== 'boolean')
      e.push(`Missing shipping setting: ${t}`);
  if (s.shipping_enabled?.unavailable)
    e.push('Unavailable products cannot be enabled');
  return e;
}
export function validateSpecial(s: FeaturedSpecial, products: Product[]) {
  const e: string[] = [];
  for (const k of [
    'id',
    'product_id',
    'occasion',
    'headline',
    'description',
    'start_date',
    'end_date',
  ] as const)
    if (typeof s[k] !== 'string' || !s[k].trim()) e.push(`${k} is required`);
  if (!products.some((p) => p.id === s.product_id))
    e.push('Choose an existing product');
  for (const k of ['start_date', 'end_date'] as const)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(s[k]) ||
      !Number.isFinite(Date.parse(s[k])) ||
      new Date(s[k]).toISOString().slice(0, 10) !== s[k]
    )
      e.push(`${k} is invalid`);
  if (s.start_date > s.end_date) e.push('End date must follow start date');
  if (!Number.isInteger(s.priority) || s.priority < 0)
    e.push('Priority must be a non-negative integer');
  if (typeof s.active !== 'boolean') e.push('Active must be true or false');
  if (s.hero_image) {
    try {
      if (new URL(s.hero_image).protocol !== 'https:')
        e.push('Hero image must use HTTPS');
    } catch {
      e.push('Invalid hero image URL');
    }
  }
  return e;
}

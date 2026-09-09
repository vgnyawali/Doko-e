export const shippingTypes = [
  'nationwide',
  'local_only',
  'pickup_only',
  'unavailable',
] as const;
export type ShippingType = (typeof shippingTypes)[number];
export interface Product {
  id: string;
  name: string;
  nepali_name: string;
  category: string;
  brand: string;
  description: string;
  contents: string;
  ingredients: string;
  allergens: string;
  package_size: string;
  price: number;
  image_url: string;
  inventory: number;
  sku: string;
  active: boolean;
  featured: boolean;
  special_occasion: string;
  display_order: number;
  shipping_type: ShippingType;
}
export const emptyProduct: Product = {
  id: '',
  name: '',
  nepali_name: '',
  category: 'Pantry',
  brand: '',
  description: '',
  contents: '',
  ingredients: '',
  allergens: '',
  package_size: '',
  price: 0,
  image_url: '',
  inventory: 0,
  sku: '',
  active: false,
  featured: false,
  special_occasion: '',
  display_order: 0,
  shipping_type: 'nationwide',
};
export function validateProduct(p: Product): string[] {
  const errors: string[] = [];
  for (const field of [
    'nepali_name',
    'description',
    'contents',
    'ingredients',
    'allergens',
    'special_occasion',
  ] as const)
    if (typeof p[field] !== 'string') errors.push(`${field} must be text`);
  if (['__proto__', 'constructor', 'prototype'].includes(p.id))
    errors.push('Reserved Product ID');
  for (const field of [
    'id',
    'name',
    'category',
    'brand',
    'package_size',
    'sku',
    'image_url',
  ] as const)
    if (typeof p[field] !== 'string' || !p[field].trim())
      errors.push(`${field} is required`);
  for (const field of ['price', 'inventory', 'display_order'] as const)
    if (
      typeof p[field] !== 'number' ||
      !Number.isFinite(p[field]) ||
      p[field] < 0
    )
      errors.push(`${field} must be a non-negative number`);
  if (!Number.isInteger(p.inventory))
    errors.push('inventory must be a whole number');
  if (!Number.isInteger(p.display_order))
    errors.push('display_order must be a whole number');
  if (!shippingTypes.includes(p.shipping_type))
    errors.push('shipping_type is invalid');
  for (const f of ['active', 'featured'] as const)
    if (typeof p[f] !== 'boolean') errors.push(`${f} must be true or false`);
  if (p.image_url.startsWith('data:image/')) {
    if (p.image_url.length > 1_100_000) errors.push('image_url is too large');
  } else {
    try {
      const u = new URL(p.image_url);
      if (u.protocol !== 'https:') errors.push('image_url must use HTTPS');
    } catch {
      errors.push('image_url must be a valid HTTPS URL or uploaded image');
    }
  }
  return errors;
}

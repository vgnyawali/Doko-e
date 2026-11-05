import type { Product } from './Product';

export const collectionStatuses = ['draft', 'published', 'archived'] as const;
export type CollectionStatus = (typeof collectionStatuses)[number];

export interface CatalogCollection {
  id: string;
  slug: string;
  navigation_label: string;
  page_title: string;
  subtitle: string;
  description: string;
  banner_image_url: string;
  status: CollectionStatus;
  navigation_visible: boolean;
  navigation_order: number;
  seo_title: string;
  seo_description: string;
  featured_product_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CollectionProductAssignment {
  collection_id: string;
  product_id: string;
  display_order: number;
  badge: string;
  description: string;
}

export interface AdminCatalogCollection extends CatalogCollection {
  assignments: CollectionProductAssignment[];
}

export interface CollectionProduct extends Product {
  collection_badge: string;
  collection_description: string;
  collection_display_order: number;
}

export interface PublicCollectionNavigation {
  id: string;
  slug: string;
  navigation_label: string;
  navigation_order: number;
}

export interface HomepageCollectionFeature {
  collection_id: string;
  collection_slug: string;
  collection_label: string;
  collection_order: number;
  product_order: number;
  product: Product;
}

export function featuredItemsUseCarousel(count: number, threshold: number) {
  return count > Math.max(1, threshold);
}

export const dokoSpecialsDraft: CatalogCollection = {
  id: 'doko-specials',
  slug: 'doko-specials',
  navigation_label: 'Doko Specials',
  page_title: 'Doko Specials',
  subtitle: 'Thoughtfully designed. Inspired by Nepal.',
  description:
    'Discover unique products designed and curated by the Doko team. From personalized gifts and creative wooden crafts to culturally inspired products, Doko Specials celebrates creativity, craftsmanship, and our connection to Nepali heritage.',
  banner_image_url: '',
  status: 'draft',
  navigation_visible: true,
  navigation_order: 10,
  seo_title: 'Doko Specials',
  seo_description:
    'Discover unique products designed and curated by the Doko team, inspired by Nepali creativity, craftsmanship, and heritage.',
  featured_product_ids: [],
  created_at: '',
  updated_at: '',
};

export function normalizeCollection(
  value: CatalogCollection,
): CatalogCollection {
  return {
    ...value,
    banner_image_url: value.banner_image_url || '',
    navigation_visible: Boolean(value.navigation_visible),
    navigation_order: Number(value.navigation_order) || 0,
    seo_title: value.seo_title || '',
    seo_description: value.seo_description || '',
    featured_product_ids: Array.isArray(value.featured_product_ids)
      ? [...new Set(value.featured_product_ids.filter((id) => typeof id === 'string' && id))]
      : [],
    created_at: value.created_at || '',
    updated_at: value.updated_at || '',
  };
}

export function validateCollection(value: CatalogCollection): string[] {
  const errors: string[] = [];
  for (const field of ['id', 'slug', 'navigation_label', 'page_title'] as const)
    if (typeof value[field] !== 'string' || !value[field].trim())
      errors.push(`${field} is required`);
  for (const field of [
    'subtitle',
    'description',
    'banner_image_url',
    'seo_title',
    'seo_description',
  ] as const)
    if (typeof value[field] !== 'string') errors.push(`${field} must be text`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug))
    errors.push('slug must contain lowercase letters, numbers, and single hyphens');
  if (!collectionStatuses.includes(value.status)) errors.push('status is invalid');
  if (typeof value.navigation_visible !== 'boolean')
    errors.push('navigation_visible must be true or false');
  if (!Number.isSafeInteger(value.navigation_order) || value.navigation_order < 0)
    errors.push('navigation_order must be a non-negative whole number');
  if (!Array.isArray(value.featured_product_ids))
    errors.push('featured_product_ids must be a list');
  if (value.banner_image_url) {
    if (value.banner_image_url.startsWith('data:image/')) {
      if (value.banner_image_url.length > 1_100_000)
        errors.push('banner_image_url is too large');
    } else {
      try {
        if (new URL(value.banner_image_url).protocol !== 'https:')
          errors.push('banner_image_url must use HTTPS');
      } catch {
        errors.push('banner_image_url must be a valid HTTPS URL or uploaded image');
      }
    }
  }
  return errors;
}

export function validateAssignments(
  collectionId: string,
  assignments: CollectionProductAssignment[],
): string[] {
  const errors: string[] = [];
  const productIds = new Set<string>();
  for (const assignment of assignments) {
    if (assignment.collection_id !== collectionId)
      errors.push('assignment collection does not match');
    if (!assignment.product_id) errors.push('assignment product is required');
    if (productIds.has(assignment.product_id))
      errors.push(`product ${assignment.product_id} is assigned more than once`);
    productIds.add(assignment.product_id);
    if (!Number.isSafeInteger(assignment.display_order) || assignment.display_order < 0)
      errors.push('product display order must be a non-negative whole number');
    if (typeof assignment.badge !== 'string' || typeof assignment.description !== 'string')
      errors.push('assignment badge and description must be text');
  }
  return errors;
}

export function publicNavigation(
  collections: CatalogCollection[],
): PublicCollectionNavigation[] {
  return collections
    .filter((collection) =>
      collection.status === 'published' && collection.navigation_visible,
    )
    .sort((a, b) =>
      a.navigation_order - b.navigation_order ||
      a.navigation_label.localeCompare(b.navigation_label),
    )
    .map(({ id, slug, navigation_label, navigation_order }) => ({
      id,
      slug,
      navigation_label,
      navigation_order,
    }));
}

export const partnerStatuses = [
  'pending',
  'active',
  'suspended',
  'archived',
] as const;
export const submissionStatuses = [
  'draft',
  'submitted',
  'changes_requested',
  'approved',
  'rejected',
  'published',
] as const;
export type PartnerStatus = (typeof partnerStatuses)[number];
export type SubmissionStatus = (typeof submissionStatuses)[number];

export interface PartnerProfile {
  description: string;
  website: string;
  contact_email: string;
  country: string;
}
export interface PartnerOrganization {
  id: string;
  name: string;
  slug: string;
  status: PartnerStatus;
  profile: PartnerProfile;
  created_at: string;
  updated_at: string;
}
export interface PartnerMembership {
  id: string;
  partner_id: string;
  user_id: string | null;
  email: string;
  role: 'owner' | 'member';
  status: 'invited' | 'active' | 'suspended';
}
export interface PartnerProductDraft {
  name: string;
  nepali_name: string;
  category: string;
  brand: string;
  description: string;
  contents: string;
  ingredients: string;
  allergens: string;
  package_size: string;
  image_url: string;
  partner_sku: string;
  material_specifications: string;
  available_variants: string;
  proposed_wholesale_price: number;
  available_supply_quantity: number;
  country_of_origin: string;
  source: 'manual' | 'csv' | 'pdf';
  uncertain_fields: string[];
}
export interface PartnerSubmission {
  id: string;
  partner_id: string;
  partner_name?: string;
  product_id: string | null;
  status: SubmissionStatus;
  draft: PartnerProductDraft;
  partner_message: string;
  admin_feedback: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
}
export const emptyPartnerDraft: PartnerProductDraft = {
  name: '',
  nepali_name: '',
  category: '',
  brand: '',
  description: '',
  contents: '',
  ingredients: '',
  allergens: '',
  package_size: '',
  image_url: '',
  partner_sku: '',
  material_specifications: '',
  available_variants: '',
  proposed_wholesale_price: 0,
  available_supply_quantity: 0,
  country_of_origin: '',
  source: 'manual',
  uncertain_fields: [],
};
export function normalizePartnerDraft(
  value: Partial<PartnerProductDraft>,
): PartnerProductDraft {
  const text = (key: keyof PartnerProductDraft) =>
    typeof value[key] === 'string'
      ? String(value[key])
          .trim()
          .slice(0, key === 'description' ? 2000 : 500)
      : '';
  const number = (key: keyof PartnerProductDraft) => {
    const candidate = Number(value[key]);
    return Number.isFinite(candidate) && candidate >= 0 ? candidate : 0;
  };
  return {
    name: text('name'),
    nepali_name: text('nepali_name'),
    category: text('category'),
    brand: text('brand'),
    description: text('description'),
    contents: text('contents'),
    ingredients: text('ingredients'),
    allergens: text('allergens'),
    package_size: text('package_size'),
    image_url: text('image_url'),
    partner_sku: text('partner_sku'),
    material_specifications: text('material_specifications'),
    available_variants: text('available_variants'),
    proposed_wholesale_price: number('proposed_wholesale_price'),
    available_supply_quantity: Math.floor(number('available_supply_quantity')),
    country_of_origin: text('country_of_origin'),
    source:
      value.source === 'csv' || value.source === 'pdf'
        ? value.source
        : 'manual',
    uncertain_fields: Array.isArray(value.uncertain_fields)
      ? value.uncertain_fields.filter((x) => typeof x === 'string').slice(0, 20)
      : [],
  };
}
export function validatePartnerDraft(
  value: PartnerProductDraft,
  options: { requireComplete?: boolean } = {},
) {
  const errors: string[] = [];
  if (options.requireComplete !== false)
    for (const key of [
      'name',
      'category',
      'brand',
      'package_size',
      'partner_sku',
      'country_of_origin',
    ] as const)
      if (!value[key]) errors.push(`${key} is required`);
  if (
    !Number.isFinite(value.proposed_wholesale_price) ||
    value.proposed_wholesale_price < 0
  )
    errors.push('proposed_wholesale_price must be a non-negative number');
  if (
    !Number.isSafeInteger(value.available_supply_quantity) ||
    value.available_supply_quantity < 0
  )
    errors.push(
      'available_supply_quantity must be a non-negative whole number',
    );
  if (value.image_url && !value.image_url.startsWith('data:image/')) {
    try {
      if (new URL(value.image_url).protocol !== 'https:')
        errors.push('image_url must use HTTPS');
    } catch {
      errors.push('image_url must be HTTPS or an uploaded image');
    }
  }
  if (value.image_url.length > 1_100_000) errors.push('image is too large');
  return errors;
}
export function canMutatePartnerSubmission(
  partnerId: string,
  row: { partner_id: string; status: string },
) {
  return (
    row.partner_id === partnerId &&
    ['draft', 'changes_requested', 'rejected'].includes(row.status)
  );
}

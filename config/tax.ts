import type { TaxConfiguration } from '@/models/BundleComponent';
// Extend this registry to introduce new classifications. Verified Stripe PTCs:
// https://docs.stripe.com/tax/tax-codes
export const taxClasses: Record<string, { label: string; code: string }> = {
  exempt_food: { label: 'Exempt Food', code: 'txcd_40040000' },
  general_merchandise: { label: 'General Merchandise', code: 'txcd_99999999' },
  clothing: { label: 'Clothing', code: 'txcd_30011000' },
  religious_book: { label: 'Religious Book', code: 'txcd_35010400' },
  other: { label: 'Other', code: 'txcd_99999999' },
};
// Neutral fallback: never infer a blanket exemption from a product name/category.
export const taxDefaults: TaxConfiguration = {
  taxable: true,
  tax_class: 'other',
  stripe_tax_code: '',
  tax_behavior: 'automatic',
};
export const exemptTaxCode = 'txcd_00000000';

export interface TaxConfiguration {
  taxable: boolean;
  tax_class: string;
  stripe_tax_code?: string;
  tax_behavior: 'automatic' | 'inclusive' | 'exclusive';
}
export interface BundleComponent extends TaxConfiguration {
  name: string;
  quantity: number;
  // Total allocated value of this row for ONE bundle, not a per-component price.
  allocated_price: number;
}

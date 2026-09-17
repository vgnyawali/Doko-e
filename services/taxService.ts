import type { Product } from '@/models/Product';
import type {
  BundleComponent,
  TaxConfiguration,
} from '@/models/BundleComponent';
import { taxClasses, taxDefaults, exemptTaxCode } from '@/config/tax';
export function normalizeProduct(p: Product): Product {
  return Object.assign(
    {},
    taxDefaults,
    { product_type: 'normal' as const, components: [] },
    p,
  );
}
export function validateTax(t: TaxConfiguration): string[] {
  if (!t || typeof t !== 'object') return ['Tax configuration is required'];
  const errors: string[] = [];
  if (typeof t.taxable !== 'boolean') errors.push('Taxable must be Yes or No');
  if (
    typeof t.tax_class !== 'string' ||
    !Object.hasOwn(taxClasses, t.tax_class)
  )
    errors.push('Invalid tax class');
  if (!['automatic', 'inclusive', 'exclusive'].includes(t.tax_behavior))
    errors.push('Invalid tax behavior');
  if (
    t.stripe_tax_code !== undefined &&
    (typeof t.stripe_tax_code !== 'string' ||
      (t.stripe_tax_code !== '' && !/^txcd_\d{8}$/.test(t.stripe_tax_code)))
  )
    errors.push('Stripe tax code must be txcd_ followed by 8 digits');
  if (t.taxable && t.stripe_tax_code === exemptTaxCode)
    errors.push('Use Taxable: No for the nontaxable code');
  if (!t.taxable && t.stripe_tax_code && t.stripe_tax_code !== exemptTaxCode)
    errors.push('Taxable: No requires an empty code or the nontaxable code');
  return errors;
}
export function resolveTaxCode(t: TaxConfiguration) {
  const errors = validateTax(t);
  if (errors.length) throw Error(errors.join(', '));
  return !t.taxable
    ? exemptTaxCode
    : t.stripe_tax_code || taxClasses[t.tax_class].code;
}
export function moneyCents(value: number) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(Math.round(value * 100)) ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
  )
    throw Error('Money must be non-negative with at most two decimal places');
  return Math.round(value * 100);
}
export function bundleTotals(price: number, components: BundleComponent[]) {
  const selling = moneyCents(price);
  let taxable = 0,
    exempt = 0;
  for (const c of components) {
    const amount = moneyCents(c.allocated_price);
    if (c.taxable) taxable += amount;
    else exempt += amount;
  }
  return {
    selling_price: selling / 100,
    allocated_total: (taxable + exempt) / 100,
    taxable_subtotal: taxable / 100,
    tax_exempt_subtotal: exempt / 100,
    difference: (taxable + exempt - selling) / 100,
  };
}
export function validateProductTax(raw: Product, requireBalanced = raw.active) {
  const p = normalizeProduct(raw);
  const errors = validateTax(p);
  if (!['normal', 'bundle'].includes(p.product_type))
    errors.push('Invalid product type');
  if (!Array.isArray(p.components))
    return [...errors, 'Components must be an array'];
  if (p.product_type === 'normal' && p.components.length)
    errors.push('Normal products cannot contain bundle components');
  if (p.product_type === 'bundle') {
    if (requireBalanced && !p.components.length)
      errors.push('Active bundles need at least one component');
    p.components.forEach((c, i) => {
      if (!c || typeof c !== 'object') {
        errors.push(`Component ${i + 1} is invalid`);
        return;
      }
      if (typeof c.name !== 'string' || !c.name.trim() || c.name.length > 200)
        errors.push(
          `Component ${i + 1}: name required (maximum 200 characters)`,
        );
      if (!Number.isSafeInteger(c.quantity) || c.quantity < 1)
        errors.push(`Component ${i + 1}: quantity must be a positive integer`);
      errors.push(...validateTax(c).map((e) => `Component ${i + 1}: ${e}`));
      try {
        moneyCents(c.allocated_price);
      } catch {
        errors.push(`Component ${i + 1}: invalid allocated price`);
      }
    });
    if (
      !errors.length &&
      requireBalanced &&
      bundleTotals(p.price, p.components).difference !== 0
    )
      errors.push(
        'Component allocations must equal the selling price before activating this bundle',
      );
  }
  return errors;
}
export interface TaxLine {
  product_id: string;
  name: string;
  quantity: number;
  unit_amount: number;
  taxable: boolean;
  tax_class: string;
  tax_code: string;
  tax_behavior: 'inclusive' | 'exclusive';
  configured_tax_behavior: TaxConfiguration['tax_behavior'];
}
// USD automatic tax behavior is exclusive, matching Stripe's documented rule.
export function productTaxLines(raw: Product, quantity: number): TaxLine[] {
  const p = normalizeProduct(raw);
  const errors = validateProductTax(p, true);
  if (errors.length) throw Error(`${p.name}: ${errors.join(', ')}`);
  const line = (t: TaxConfiguration, name: string, cents: number): TaxLine => ({
    product_id: p.id,
    name,
    quantity,
    unit_amount: cents,
    taxable: t.taxable,
    tax_class: t.tax_class,
    tax_code: resolveTaxCode(t),
    tax_behavior: t.tax_behavior === 'inclusive' ? 'inclusive' : 'exclusive',
    configured_tax_behavior: t.tax_behavior,
  });
  if (p.product_type === 'normal')
    return [line(p, p.name, moneyCents(p.price))];
  // Preserve distinct tax classes/behaviors: two taxable classes can have different rates.
  const groups = new Map<string, TaxLine>();
  for (const c of p.components) {
    const cents = moneyCents(c.allocated_price);
    if (!cents) continue;
    const l = line(
      c,
      `${p.name} — ${c.taxable ? 'Taxable' : 'Tax-Exempt'} Portion (${taxClasses[c.tax_class].label}, ${c.tax_behavior})`,
      cents,
    );
    const key = JSON.stringify([
      l.tax_code,
      l.tax_class,
      l.tax_behavior,
      l.configured_tax_behavior,
      l.taxable,
    ]);
    const old = groups.get(key);
    if (old) old.unit_amount += cents;
    else groups.set(key, l);
  }
  return [...groups.values()];
}

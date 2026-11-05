import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProduct, validateProduct, type Product } from '@/models/Product';
import { seedProducts } from '@/data/products';
import { taxDefaults } from '@/config/tax';
import {
  bundleTotals,
  normalizeProduct,
  productTaxLines,
  resolveTaxCode,
  validateProductTax,
} from '@/services/taxService';
import { quoteCheckout, type CheckoutRequest } from '@/modules/checkout/quote';
import { sessionParameters } from '@/modules/checkout/payment';
import { defaultSettings } from '@/config/defaults';
import { previewCSV } from '@/services/sheets';
const base: Product = { ...seedProducts[0], ...taxDefaults };
const bundle: Product = {
  ...base,
  id: 'dashain-test',
  name: 'Dashain Kit',
  price: 49.99,
  product_type: 'bundle',
  components: [
    {
      ...taxDefaults,
      name: 'Tray',
      quantity: 1,
      allocated_price: 1.6,
      tax_class: 'general_merchandise',
    },
    {
      ...taxDefaults,
      name: 'Rice and ritual food',
      quantity: 3,
      allocated_price: 48.39,
      tax_class: 'exempt_food',
      taxable: false,
    },
  ],
};
const customer = {
  name: 'Test',
  email: 'test@example.com',
  address: '123 Test Street',
  city: 'New York',
  state: 'NY',
  zip: '10001',
  country: 'US',
};
const request: CheckoutRequest = {
  items: [{ product_id: bundle.id, quantity: 2 }],
  customer,
};
test('taxable normal product resolves its class; optional code uses verified fallback', () => {
  assert.equal(
    resolveTaxCode({ ...base, tax_class: 'clothing' }),
    'txcd_30011000',
  );
  assert.equal(
    resolveTaxCode({ ...base, tax_class: 'religious_book' }),
    'txcd_35010400',
  );
  assert.equal(productTaxLines(base, 2)[0].tax_code, 'txcd_99999999');
  assert.equal(
    resolveTaxCode({
      ...base,
      tax_class: 'exempt_food',
      stripe_tax_code: 'txcd_40010002',
    }),
    'txcd_40010002',
  );
  assert.throws(() => resolveTaxCode({ ...base, tax_class: 'unknown' }));
  assert.throws(() => resolveTaxCode({ ...base, stripe_tax_code: 'invalid' }));
});
test('explicitly exempt normal product always uses nontaxable classification', () => {
  assert.equal(
    resolveTaxCode({ ...base, taxable: false, tax_class: 'exempt_food' }),
    'txcd_00000000',
  );
  assert.throws(() =>
    resolveTaxCode({
      ...base,
      taxable: false,
      stripe_tax_code: 'txcd_99999999',
    }),
  );
});
test('mixed Dashain bundle allocations are per bundle row, not per component unit', () => {
  assert.deepEqual(bundleTotals(bundle.price, bundle.components), {
    selling_price: 49.99,
    allocated_total: 49.99,
    taxable_subtotal: 1.6,
    tax_exempt_subtotal: 48.39,
    difference: 0,
  });
  const q = quoteCheckout(request, [bundle], defaultSettings);
  assert.equal(q.subtotal, 99.98);
  assert.equal(q.taxable_subtotal, 3.2);
  assert.equal(q.tax_exempt_subtotal, 96.78);
  assert.equal(q.items[0].components[1].quantity, 3);
  assert.equal(q.items[0].tax_lines.length, 2);
  bundle.components[0].name = 'Tray changed later';
  assert.equal(q.items[0].components[0].name, 'Tray');
  bundle.components[0].name = 'Tray';
});
test('inclusive and exclusive lines retain separate tax treatments', () => {
  assert.equal(
    productTaxLines({ ...base, tax_behavior: 'inclusive' }, 1)[0].tax_behavior,
    'inclusive',
  );
  assert.equal(
    productTaxLines({ ...base, tax_behavior: 'exclusive' }, 1)[0].tax_behavior,
    'exclusive',
  );
  assert.equal(
    productTaxLines({ ...base, tax_behavior: 'automatic' }, 1)[0].tax_behavior,
    'exclusive',
  );
  const mixed = {
    ...bundle,
    components: bundle.components.map((c, i) => ({
      ...c,
      taxable: true,
      tax_behavior: i ? ('inclusive' as const) : ('exclusive' as const),
    })),
  };
  assert.equal(productTaxLines(mixed, 1).length, 2);
});
test('active mismatched bundles and invalid component quantities are rejected; drafts allowed', () => {
  const wrong = { ...bundle, price: 50 };
  assert.ok(validateProduct(wrong).some((e) => e.includes('allocations')));
  assert.equal(validateProductTax({ ...wrong, active: false }).length, 0);
  assert.throws(() => productTaxLines(wrong, 1));
  assert.ok(
    validateProductTax({
      ...bundle,
      components: [{ ...bundle.components[0], quantity: 0 }],
    }).length,
  );
  assert.ok(validateProductTax({ ...bundle, components: [] }).length);
});
test('browser price, tax, allocations and forged quote never affect Stripe line generation', () => {
  const forged = {
    ...request,
    price: 0,
    taxable: false,
    components: [],
    items: [
      {
        product_id: bundle.id,
        quantity: 2,
        price: 0,
        taxable: false,
        tax_lines: [],
      },
    ],
  };
  const quote = quoteCheckout(forged, [bundle], defaultSettings);
  const body = sessionParameters(
    quote,
    customer,
    'https://doko-e.com',
    'order',
    { STRIPE_SHIPPING_RATE_ID: 'shr_test' },
  );
  assert.equal(body.get('line_items[0][price_data][unit_amount]'), '160');
  assert.equal(body.get('line_items[0][quantity]'), '2');
  assert.equal(body.get('line_items[1][price_data][unit_amount]'), '4839');
  assert.equal(
    body.get('line_items[1][price_data][product_data][tax_code]'),
    'txcd_00000000',
  );
  assert.equal(body.get('automatic_tax[enabled]'), 'true');
});
test('legacy defaults and CSV validation are explicit; invalid tax fields fail', () => {
  const legacy = { ...base } as Partial<Product>;
  delete legacy.taxable;
  delete legacy.tax_class;
  delete legacy.tax_behavior;
  delete legacy.components;
  delete legacy.product_type;
  assert.equal(normalizeProduct(legacy as Product).taxable, true);
  const csv =
    'id,name,category,brand,package_size,price,image_url,inventory,sku\nP,Test,Test,Test,1,10,https://example.com/image.jpg,2,SKU';
  const row = previewCSV(csv)[0];
  assert.equal(row.product.tax_class, 'other');
  assert.equal(row.warnings.length, 3);
  assert.ok(
    previewCSV(csv.replace('sku\n', 'sku,taxable\n') + ',maybe')[0].errors.some(
      (e) => e.includes('taxable'),
    ),
  );
  assert.ok(validateProductTax({ ...base, tax_class: '__proto__' }).length);
});
test('Stripe tax-line count is checked after bundle expansion', () => {
  const products = Array.from({ length: 51 }, (_, i) => ({
    ...bundle,
    id: `bundle-${i}`,
  }));
  assert.throws(
    () =>
      quoteCheckout(
        {
          items: products.map((p) => ({ product_id: p.id, quantity: 1 })),
          customer,
        },
        products,
        defaultSettings,
      ),
    /100 tax-portion/,
  );
});

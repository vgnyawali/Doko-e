import test from 'node:test';
import assert from 'node:assert/strict';
import { seedProducts } from '@/data/products';
import { seedSpecials } from '@/data/specials';
import { validateProduct } from '@/models/Product';
import { isSpecialCurrent } from '@/models/FeaturedSpecial';
import { cartSubtotal, setCartQuantity } from '@/modules/cart/cart';
import { parseCSV, previewCSV, sheetCSVUrl } from '@/services/sheets';
import { canPurchase } from '@/services/shipping';
import { defaultSettings } from '@/config/defaults';
import { validateSettings, validateSpecial } from '@/services/validation';
test('product validation rejects invalid quantities, prices and URLs', () => {
  assert.deepEqual(validateProduct(seedProducts[0]), []);
  assert.ok(
    validateProduct({
      ...seedProducts[0],
      price: -1,
      inventory: 2.5,
      image_url: 'javascript:alert(1)',
    }).length >= 3,
  );
});
test('cart limits stock, removes zero and calculates money in cents', () => {
  let cart = setCartQuantity({}, 'P001', 100, 2);
  assert.equal(cart.P001, 2);
  assert.equal(cartSubtotal(cart, seedProducts), 37.98);
  cart = setCartQuantity(cart, 'P001', 0, 2);
  assert.deepEqual(cart, {});
});
test('special scheduling includes entire end day and hides next day', () => {
  const s = seedSpecials[0];
  assert.equal(isSpecialCurrent(s, new Date('2026-11-01T23:59:59Z')), true);
  assert.equal(isSpecialCurrent(s, new Date('2026-11-02T00:00:00Z')), false);
  assert.equal(isSpecialCurrent(s, new Date('2026-08-31T23:59:59Z')), false);
  assert.equal(
    isSpecialCurrent({ ...s, active: false }, new Date('2026-10-01')),
    false,
  );
});
test('CSV supports comma, newline, double quote and BOM', () => {
  assert.deepEqual(parseCSV('a,b\r\n"hello, world","two\nlines"\r\n"a""b",c'), [
    ['a', 'b'],
    ['hello, world', 'two\nlines'],
    ['a"b', 'c'],
  ]);
  assert.throws(() => parseCSV('a,"b'));
});
test('Sheets URL only allows public Google Sheets and preserves selected tab', () => {
  assert.equal(
    sheetCSVUrl('https://docs.google.com/spreadsheets/d/abc123/edit#gid=42'),
    'https://docs.google.com/spreadsheets/d/abc123/export?format=csv&gid=42',
  );
  assert.throws(() => sheetCSVUrl('https://evil.example/spreadsheets/d/abc'));
  assert.throws(() =>
    sheetCSVUrl('https://docs.google.com.evil.test/spreadsheets/d/abc'),
  );
});
test('manual and sheet rows share validation; duplicate IDs block import', () => {
  const p = seedProducts[0];
  const keys = Object.keys(p);
  const row = keys
    .map(
      (k) => '"' + String(p[k as keyof typeof p]).replaceAll('"', '""') + '"',
    )
    .join(',');
  const preview = previewCSV(
    '\uFEFF' + keys.join(',') + '\n' + row + '\n' + row,
  );
  assert.deepEqual(preview[0].errors, []);
  assert.equal(preview[0].product.price, p.price);
  assert.ok(preview[1].errors.includes('Duplicate Product ID in sheet'));
  assert.ok(
    previewCSV('id,name,price,inventory\nX,Item,,oops')[0].errors.length,
  );
});
test('shipping policies and unavailable items are enforced', () => {
  assert.equal(canPurchase(seedProducts[0], defaultSettings), true);
  assert.equal(
    canPurchase(
      { ...seedProducts[0], shipping_type: 'pickup_only' },
      defaultSettings,
    ),
    false,
  );
  assert.equal(
    canPurchase({ ...seedProducts[0], inventory: 0 }, defaultSettings),
    false,
  );
  assert.equal(
    canPurchase(
      { ...seedProducts[0], shipping_type: 'unavailable' },
      defaultSettings,
    ),
    false,
  );
});
test('settings and specials reject invalid configuration', () => {
  assert.deepEqual(validateSettings(defaultSettings), []);
  assert.deepEqual(validateSpecial(seedSpecials[0], seedProducts), []);
  assert.ok(
    validateSpecial(
      { ...seedSpecials[0], product_id: 'missing', end_date: '2026-02-30' },
      seedProducts,
    ).length >= 2,
  );
});

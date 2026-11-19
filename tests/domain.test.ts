import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { seedProducts } from '@/data/products';
import { seedSpecials } from '@/data/specials';
import { validateProduct } from '@/models/Product';
import { isSpecialCurrent } from '@/models/FeaturedSpecial';
import { cartSubtotal, setCartQuantity } from '@/modules/cart/cart';
import { parseCSV, previewCSV, sheetCSVUrl } from '@/services/sheets';
import { canPurchase } from '@/services/shipping';
import { defaultSettings } from '@/config/defaults';
import { validateSettings, validateSpecial } from '@/services/validation';
import { canMutatePartnerSubmission, emptyPartnerDraft, normalizePartnerDraft, validatePartnerDraft } from '@/models/Partner';
import './partner-mvp.test';
import './partner-invitation.test';
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
  assert.ok(
    validateSettings({ ...defaultSettings, browser_title: '' }).includes(
      'browser_title is required',
    ),
  );
  assert.ok(
    validateSettings({ ...defaultSettings, browser_title: 'x'.repeat(121) })
      .includes('Browser title must be 120 characters or fewer'),
  );
  assert.ok(
    validateSettings({ ...defaultSettings, featured_items_carousel_threshold: 0 })
      .includes('Featured carousel threshold must be a whole number from 1 to 12'),
  );
  assert.deepEqual(validateSpecial(seedSpecials[0], seedProducts), []);
  assert.ok(
    validateSpecial(
      { ...seedSpecials[0], product_id: 'missing', end_date: '2026-02-30' },
      seedProducts,
    ).length >= 2,
  );
});
test('partner drafts normalize untrusted text and require core product facts', () => {
  const draft = normalizePartnerDraft({ ...emptyPartnerDraft, name: '  Tea  ', category: 'Beverages', brand: 'Doko', package_size: '20 bags', partner_sku: 'TEA-1', country_of_origin: 'Nepal' });
  assert.equal(draft.name, 'Tea');
  assert.deepEqual(validatePartnerDraft(draft), []);
  assert.ok(validatePartnerDraft({ ...draft, image_url: 'javascript:alert(1)' }).length > 0);
});
test('partner mutation authorization requires matching tenant and editable state', () => {
  assert.equal(canMutatePartnerSubmission('partner-a', { partner_id: 'partner-a', status: 'draft' }), true);
  assert.equal(canMutatePartnerSubmission('partner-a', { partner_id: 'partner-b', status: 'draft' }), false);
  assert.equal(canMutatePartnerSubmission('partner-a', { partner_id: 'partner-a', status: 'submitted' }), false);
});
test('partner migration is additive and tenant-scoped database reads stay isolated', () => {
  const sql = readFileSync('drizzle/0008_lethal_madelyne_pryor.sql', 'utf8')
    .replaceAll('--> statement-breakpoint', '');
  assert.doesNotMatch(sql, /^\s*(?:DROP|DELETE|ALTER)\b/im);
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON; CREATE TABLE products(id TEXT PRIMARY KEY); CREATE TABLE catalog_collections(id TEXT PRIMARY KEY);');
  db.exec(sql);
  const now = new Date(0).toISOString();
  const addPartner = db.prepare(`INSERT INTO partners(id,name,slug,status,profile_data,created_at,updated_at) VALUES(?,?,?,'active','{}',?,?)`);
  addPartner.run('a', 'Partner A', 'partner-a', now, now);
  addPartner.run('b', 'Partner B', 'partner-b', now, now);
  const addSubmission = db.prepare(`INSERT INTO partner_product_submissions(id,partner_id,status,draft_data,created_by,created_at,updated_at) VALUES(?,?,'draft','{}','user',?,?)`);
  addSubmission.run('submission-a', 'a', now, now);
  addSubmission.run('submission-b', 'b', now, now);
  const rows = db.prepare('SELECT id FROM partner_product_submissions WHERE partner_id=?').all('a');
  assert.deepEqual(rows.map(row => row.id), ['submission-a']);
  assert.throws(() => addSubmission.run('bad', 'missing', now, now));
  db.close();
});

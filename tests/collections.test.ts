import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {
  dokoSpecialsDraft,
  featuredItemsUseCarousel,
  normalizeCollection,
  publicNavigation,
  validateAssignments,
  validateCollection,
  type CatalogCollection,
} from '@/models/CatalogCollection';

const published: CatalogCollection = {
  ...dokoSpecialsDraft,
  id: 'published',
  slug: 'published',
  navigation_label: 'Published',
  status: 'published',
  navigation_visible: true,
  navigation_order: 20,
};

void test('Doko Specials starts as a draft with no hard-coded products', () => {
  assert.equal(dokoSpecialsDraft.slug, 'doko-specials');
  assert.equal(dokoSpecialsDraft.status, 'draft');
  assert.equal(dokoSpecialsDraft.navigation_label, 'Doko Specials');
  assert.deepEqual(validateCollection(dokoSpecialsDraft), []);
});

void test('only published visible collections enter ordered navigation', () => {
  const navigation = publicNavigation([
    published,
    { ...published, id: 'first', slug: 'first', navigation_label: 'First', navigation_order: 1 },
    { ...published, id: 'hidden', slug: 'hidden', navigation_visible: false },
    { ...published, id: 'draft', slug: 'draft', status: 'draft' },
    { ...published, id: 'archived', slug: 'archived', status: 'archived' },
  ]);
  assert.deepEqual(navigation.map((item) => item.id), ['first', 'published']);
});

void test('collection and assignment validation rejects unsafe slugs and duplicates', () => {
  assert.ok(validateCollection({ ...published, slug: 'Bad Slug!' }).length);
  assert.ok(
    validateAssignments('collection', [
      { collection_id: 'collection', product_id: 'P1', display_order: 0, badge: '', description: '' },
      { collection_id: 'collection', product_id: 'P1', display_order: 1, badge: '', description: '' },
    ]).some((error) => error.includes('more than once')),
  );
});

void test('collection featured product selections normalize safely', () => {
  const normalized = normalizeCollection({
    ...published,
    featured_product_ids: ['P2', 'P1', 'P2', ''],
  });
  assert.deepEqual(normalized.featured_product_ids, ['P2', 'P1']);
  assert.deepEqual(
    normalizeCollection({
      ...published,
      featured_product_ids: undefined as unknown as string[],
    }).featured_product_ids,
    [],
  );
});

void test('featured menu row becomes a carousel only above the configured threshold', () => {
  assert.equal(featuredItemsUseCarousel(4, 4), false);
  assert.equal(featuredItemsUseCarousel(5, 4), true);
  assert.equal(featuredItemsUseCarousel(2, 0), true);
});

void test('migration preserves products when assignments or collections are removed', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON; CREATE TABLE products (id text PRIMARY KEY, sku text NOT NULL UNIQUE, data text NOT NULL);');
  db.exec(readFileSync('drizzle/0007_salty_vapor.sql', 'utf8').replaceAll('--> statement-breakpoint', ''));
  db.prepare('INSERT INTO products(id, sku, data) VALUES (?, ?, ?)').run('P1', 'SKU1', '{}');
  db.prepare(`INSERT INTO catalog_collections(id, slug, status, navigation_visible, navigation_order, data, created_at, updated_at) VALUES (?, ?, 'draft', 0, 0, '{}', '', '')`).run('C1', 'one');
  db.prepare(`INSERT INTO catalog_collection_products(collection_id, product_id, display_order, badge, description) VALUES ('C1', 'P1', 0, '', '')`).run();
  db.prepare("DELETE FROM catalog_collections WHERE id = 'C1'").run();
  assert.equal(db.prepare("SELECT count(*) AS count FROM products WHERE id = 'P1'").get()!.count, 1);
  assert.equal(db.prepare('SELECT count(*) AS count FROM catalog_collection_products').get()!.count, 0);
  db.close();
});

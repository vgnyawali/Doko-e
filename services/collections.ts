import { env } from 'cloudflare:workers';
import type { Product } from '@/models/Product';
import {
  dokoSpecialsDraft,
  normalizeCollection,
  publicNavigation,
  validateAssignments,
  validateCollection,
  type AdminCatalogCollection,
  type CatalogCollection,
  type CollectionProduct,
  type CollectionProductAssignment,
  type HomepageCollectionFeature,
} from '@/models/CatalogCollection';
import { normalizeProduct } from './taxService';

function database() {
  return env.DB;
}

type CollectionRow = {
  id: string;
  slug: string;
  status: string;
  navigation_visible: number;
  navigation_order: number;
  data: string;
  created_at: string;
  updated_at: string;
};

function rowCollection(row: CollectionRow): CatalogCollection {
  const data = JSON.parse(row.data) as CatalogCollection;
  return normalizeCollection({
    ...data,
    id: row.id,
    slug: row.slug,
    status: row.status as CatalogCollection['status'],
    navigation_visible: Boolean(row.navigation_visible),
    navigation_order: row.navigation_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

export async function seedInitialCollections(db = database()) {
  const now = new Date().toISOString();
  const collection = { ...dokoSpecialsDraft, created_at: now, updated_at: now };
  await db
    .prepare(
      `INSERT OR IGNORE INTO catalog_collections
       (id, slug, status, navigation_visible, navigation_order, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      collection.id,
      collection.slug,
      collection.status,
      collection.navigation_visible ? 1 : 0,
      collection.navigation_order,
      JSON.stringify(collection),
      now,
      now,
    )
    .run();
}

export async function readCollectionNavigation() {
  const rows = await database()
    .prepare(
      `SELECT id, slug, status, navigation_visible, navigation_order, data, created_at, updated_at
       FROM catalog_collections
       WHERE status = 'published' AND navigation_visible = 1
       ORDER BY navigation_order, slug`,
    )
    .all<CollectionRow>();
  return publicNavigation(rows.results.map(rowCollection));
}

export async function readHomepageCollectionFeatures(): Promise<HomepageCollectionFeature[]> {
  const db = database();
  const [collectionRows, productRows] = await Promise.all([
    db
      .prepare(
        `SELECT id, slug, status, navigation_visible, navigation_order, data, created_at, updated_at
         FROM catalog_collections
         WHERE status = 'published' AND navigation_visible = 1
         ORDER BY navigation_order, slug`,
      )
      .all<CollectionRow>(),
    db
      .prepare(
        `SELECT cp.collection_id, cp.product_id, cp.display_order, p.data AS product_data
         FROM catalog_collection_products cp
         JOIN products p ON p.id = cp.product_id
         ORDER BY cp.collection_id, cp.display_order, cp.product_id`,
      )
      .all<{
        collection_id: string;
        product_id: string;
        display_order: number;
        product_data: string;
      }>(),
  ]);
  const features: HomepageCollectionFeature[] = [];
  for (const row of collectionRows.results) {
    const collection = rowCollection(row);
    const selected = new Set(collection.featured_product_ids);
    for (const item of productRows.results) {
      if (item.collection_id !== collection.id || !selected.has(item.product_id)) continue;
      const product = normalizeProduct(JSON.parse(item.product_data) as Product);
      if (!product.active) continue;
      features.push({
        collection_id: collection.id,
        collection_slug: collection.slug,
        collection_label: collection.navigation_label,
        collection_order: collection.navigation_order,
        product_order: item.display_order,
        product,
      });
    }
  }
  return features.sort(
    (a, b) =>
      a.collection_order - b.collection_order ||
      a.product_order - b.product_order ||
      a.product.name.localeCompare(b.product.name),
  );
}

export async function readAdminCollections(): Promise<AdminCatalogCollection[]> {
  const db = database();
  const [collections, assignments] = await Promise.all([
    db
      .prepare(
        `SELECT id, slug, status, navigation_visible, navigation_order, data, created_at, updated_at
         FROM catalog_collections ORDER BY navigation_order, slug`,
      )
      .all<CollectionRow>(),
    db
      .prepare(
        `SELECT collection_id, product_id, display_order, badge, description
         FROM catalog_collection_products ORDER BY collection_id, display_order, product_id`,
      )
      .all<CollectionProductAssignment>(),
  ]);
  return collections.results.map((row) => ({
    ...rowCollection(row),
    assignments: assignments.results.filter(
      (assignment) => assignment.collection_id === row.id,
    ),
  }));
}

export async function readCollectionBySlug(
  slug: string,
  includeUnpublished = false,
) {
  const db = database();
  let redirectedFrom = '';
  let row = await db
    .prepare(
      `SELECT id, slug, status, navigation_visible, navigation_order, data, created_at, updated_at
       FROM catalog_collections WHERE slug = ?`,
    )
    .bind(slug)
    .first<CollectionRow>();
  if (!row) {
    row = await db
      .prepare(
        `SELECT c.id, c.slug, c.status, c.navigation_visible, c.navigation_order,
                c.data, c.created_at, c.updated_at
         FROM catalog_collection_redirects r
         JOIN catalog_collections c ON c.id = r.collection_id
         WHERE r.old_slug = ?`,
      )
      .bind(slug)
      .first<CollectionRow>();
    if (row) redirectedFrom = slug;
  }
  if (!row) return null;
  const collection = rowCollection(row);
  if (!includeUnpublished && collection.status !== 'published') return null;
  if (collection.status === 'archived') return null;
  const result = await db
    .prepare(
      `SELECT p.data AS product_data, cp.display_order, cp.badge, cp.description
       FROM catalog_collection_products cp
       JOIN products p ON p.id = cp.product_id
       WHERE cp.collection_id = ?
       ORDER BY cp.display_order, cp.product_id`,
    )
    .bind(collection.id)
    .all<{
      product_data: string;
      display_order: number;
      badge: string;
      description: string;
    }>();
  const products: CollectionProduct[] = result.results
    .map((item) => ({
      ...normalizeProduct(JSON.parse(item.product_data) as Product),
      collection_badge: item.badge,
      collection_description: item.description,
      collection_display_order: item.display_order,
    }))
    .filter((product) => includeUnpublished || product.active);
  return { collection, products, redirectedFrom };
}

export async function saveCollection(
  rawCollection: CatalogCollection,
  rawAssignments: CollectionProductAssignment[],
) {
  const db = database();
  const current = await db
    .prepare(
      `SELECT id, slug, status, navigation_visible, navigation_order, data, created_at, updated_at
       FROM catalog_collections WHERE id = ?`,
    )
    .bind(rawCollection.id)
    .first<CollectionRow>();
  const now = new Date().toISOString();
  const collection = normalizeCollection({
    ...rawCollection,
    created_at: current?.created_at || now,
    updated_at: now,
  });
  const assignments = rawAssignments.map((assignment) => ({
    ...assignment,
    collection_id: collection.id,
    badge: assignment.badge || '',
    description: assignment.description || '',
  }));
  const errors = [
    ...validateCollection(collection),
    ...validateAssignments(collection.id, assignments),
  ];
  const duplicateSlug = await db
    .prepare('SELECT id FROM catalog_collections WHERE slug = ? AND id != ?')
    .bind(collection.slug, collection.id)
    .first<{ id: string }>();
  if (duplicateSlug) errors.push('slug is already in use');
  const productRows = await db.prepare('SELECT id FROM products').all<{ id: string }>();
  const productIds = new Set(productRows.results.map((row) => row.id));
  for (const assignment of assignments)
    if (!productIds.has(assignment.product_id))
      errors.push(`product ${assignment.product_id} does not exist`);
  const assignmentIds = new Set(assignments.map((assignment) => assignment.product_id));
  for (const productId of collection.featured_product_ids)
    if (!assignmentIds.has(productId))
      errors.push(`featured product ${productId} must be assigned to the collection`);
  if (errors.length) throw new Error(errors.join(', '));

  const statements = [
    db
      .prepare(
        `INSERT INTO catalog_collections
         (id, slug, status, navigation_visible, navigation_order, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           slug=excluded.slug,
           status=excluded.status,
           navigation_visible=excluded.navigation_visible,
           navigation_order=excluded.navigation_order,
           data=excluded.data,
           updated_at=excluded.updated_at`,
      )
      .bind(
        collection.id,
        collection.slug,
        collection.status,
        collection.navigation_visible ? 1 : 0,
        collection.navigation_order,
        JSON.stringify(collection),
        collection.created_at,
        collection.updated_at,
      ),
    db
      .prepare('DELETE FROM catalog_collection_products WHERE collection_id = ?')
      .bind(collection.id),
  ];
  if (current && current.slug !== collection.slug)
    statements.push(
      db
        .prepare(
          `INSERT INTO catalog_collection_redirects(old_slug, collection_id, created_at)
           VALUES (?, ?, ?)
           ON CONFLICT(old_slug) DO UPDATE SET collection_id=excluded.collection_id`,
        )
        .bind(current.slug, collection.id, now),
    );
  statements.push(
    ...assignments.map((assignment) =>
      db
        .prepare(
          `INSERT INTO catalog_collection_products
           (collection_id, product_id, display_order, badge, description)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(
          collection.id,
          assignment.product_id,
          assignment.display_order,
          assignment.badge,
          assignment.description,
        ),
    ),
  );
  await db.batch(statements);
  return collection;
}

export async function archiveCollection(id: string) {
  const row = await database()
    .prepare(
      `SELECT id, slug, status, navigation_visible, navigation_order, data, created_at, updated_at
       FROM catalog_collections WHERE id = ?`,
    )
    .bind(id)
    .first<CollectionRow>();
  if (!row) throw new Error('Collection not found');
  const collection = rowCollection(row);
  await saveCollection(
    { ...collection, status: 'archived', navigation_visible: false },
    (await readAdminCollections()).find((item) => item.id === id)?.assignments || [],
  );
}

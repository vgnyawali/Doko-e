import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
export const flashAds = sqliteTable('flash_ads', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
});
export const productRequests = sqliteTable('product_requests', {
  id: text('id').primaryKey(),
  request_text: text('request_text').notNull(),
  created_at: text('created_at').notNull(),
  status: text('status').notNull().default('new'),
  admin_notes: text('admin_notes').notNull().default(''),
  source_page: text('source_page').notNull().default('homepage'),
  customer_email: text('customer_email'),
}, table => [index('product_requests_status_date').on(table.status, table.created_at), index('product_requests_date').on(table.created_at)]);
export const productRequestLimits = sqliteTable('product_request_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expires_at: integer('expires_at').notNull(),
});
export const checkoutOrders = sqliteTable('checkout_orders', {
  id: text('id').primaryKey(),
  session_id: text('session_id').unique(),
  status: text('status').notNull(),
  data: text('data').notNull(),
  payment_data: text('payment_data'),
});
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  data: text('data').notNull(),
});
export const specials = sqliteTable('specials', {
  id: text('id').primaryKey(),
  product_id: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  data: text('data').notNull(),
});
export const siteSettings = sqliteTable('site_settings', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
});

export const catalogCollections = sqliteTable(
  'catalog_collections',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    status: text('status').notNull().default('draft'),
    navigationVisible: integer('navigation_visible').notNull().default(0),
    navigationOrder: integer('navigation_order').notNull().default(0),
    data: text('data').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('catalog_collections_slug_unique').on(table.slug),
    index('catalog_collections_navigation').on(
      table.status,
      table.navigationVisible,
      table.navigationOrder,
    ),
  ],
);

export const catalogCollectionProducts = sqliteTable(
  'catalog_collection_products',
  {
    collectionId: text('collection_id')
      .notNull()
      .references(() => catalogCollections.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    displayOrder: integer('display_order').notNull().default(0),
    badge: text('badge').notNull().default(''),
    description: text('description').notNull().default(''),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.productId] }),
    index('catalog_collection_products_order').on(
      table.collectionId,
      table.displayOrder,
    ),
  ],
);

export const catalogCollectionRedirects = sqliteTable(
  'catalog_collection_redirects',
  {
    oldSlug: text('old_slug').primaryKey(),
    collectionId: text('collection_id')
      .notNull()
      .references(() => catalogCollections.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('catalog_collection_redirects_collection').on(table.collectionId)],
);

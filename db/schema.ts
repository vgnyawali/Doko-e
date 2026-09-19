import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
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

import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
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

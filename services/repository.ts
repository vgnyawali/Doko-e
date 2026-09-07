import { env } from 'cloudflare:workers';
import type { Product } from '@/models/Product';
import type { FeaturedSpecial } from '@/models/FeaturedSpecial';
import type { SiteSettings } from '@/models/SiteSettings';
import { defaultSettings } from '@/config/defaults';
import { seedProducts } from '@/data/products';
import { seedSpecials } from '@/data/specials';
export function database() {
  return env.DB;
}
// One durable marker prevents deleted seed products from reappearing. D1 batches are atomic.
export async function initialize() {
  const db = database();
  const exists = await db
    .prepare('SELECT id FROM site_settings WHERE id = ?')
    .bind('main')
    .first();
  if (exists) return;
  await db.batch([
    ...seedProducts.map((p) =>
      db
        .prepare(
          'INSERT OR IGNORE INTO products (id, sku, data) VALUES (?, ?, ?)',
        )
        .bind(p.id, p.sku, JSON.stringify(p)),
    ),
    ...seedSpecials.map((s) =>
      db
        .prepare(
          'INSERT OR IGNORE INTO specials (id, product_id, data) VALUES (?, ?, ?)',
        )
        .bind(s.id, s.product_id, JSON.stringify(s)),
    ),
    db
      .prepare('INSERT OR IGNORE INTO site_settings (id, data) VALUES (?, ?)')
      .bind('main', JSON.stringify(defaultSettings)),
  ]);
}
export async function readStore() {
  await initialize();
  const db = database();
  const [p, s, c] = await Promise.all([
    db.prepare('SELECT data FROM products').all<{ data: string }>(),
    db.prepare('SELECT data FROM specials').all<{ data: string }>(),
    db
      .prepare('SELECT data FROM site_settings WHERE id = ?')
      .bind('main')
      .first<{ data: string }>(),
  ]);
  return {
    products: p.results.map((x) => JSON.parse(x.data) as Product),
    specials: s.results.map((x) => JSON.parse(x.data) as FeaturedSpecial),
    settings: JSON.parse(c!.data) as SiteSettings,
  };
}
export async function saveProducts(products: Product[]) {
  await database().batch(
    products.map((p) =>
      database()
        .prepare(
          'INSERT INTO products (id,sku,data) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET sku=excluded.sku,data=excluded.data',
        )
        .bind(p.id, p.sku, JSON.stringify(p)),
    ),
  );
}

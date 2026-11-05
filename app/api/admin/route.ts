import { isAdmin } from '@/services/adminAuth';
import { database, readStore, saveProducts } from '@/services/repository';
import { validateProduct, type Product } from '@/models/Product';
import { previewCSV, sheetCSVUrl } from '@/services/sheets';
import { validateSettings, validateSpecial } from '@/services/validation';
import { normalizeProduct, validateProductTax } from '@/services/taxService';
import { readAdminCollections } from '@/services/collections';
export const dynamic = 'force-dynamic';
async function readAdminStore() {
  const [store, collections] = await Promise.all([
    readStore(),
    readAdminCollections(),
  ]);
  return { ...store, collections };
}
export async function GET(request: Request) {
  if (!(await isAdmin(request)))
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  return Response.json(await readAdminStore(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
export async function POST(request: Request) {
  if (!(await isAdmin(request)))
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const body = await request.text();
    if (body.length > 4_500_000) throw Error('Request too large.');
    const { action, ...data } = JSON.parse(body);
    // A featured special may include its hero, popup and linked product images.
    if (action !== 'special' && body.length > 2_000_000) throw Error('Request too large.');
    const store = await readStore();
    if (action === 'preview') {
      const url = sheetCSVUrl(data.url);
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok)
        throw Error(
          'Unable to read the sheet. Set sharing to anyone with the link.',
        );
      const text = await response.text();
      if (text.length > 2_000_000 || text.trimStart().startsWith('<'))
        throw Error('Expected a public CSV sheet under 2 MB.');
      return Response.json({ rows: previewCSV(text) });
    }
    if (action === 'product_order') {
      if (typeof data.id !== 'string' || !store.products.some((p) => p.id === data.id))
        throw Error('Product not found.');
      if (!Number.isSafeInteger(data.display_order) || data.display_order < 0)
        throw Error('Order number must be a non-negative whole number.');
      // Update only ordering, preserving inventory and other concurrent product edits.
      await database().prepare("UPDATE products SET data = json_set(data, '$.display_order', ?) WHERE id = ?")
        .bind(data.display_order, data.id).run();
    } else if (action === 'products') {
      if (
        !Array.isArray(data.products) ||
        !data.products.length ||
        data.products.length > 500
      )
        throw Error('Import between 1 and 500 products.');
      const products: Product[] = data.products.map((p: Product) => {
        if (!p || typeof p !== 'object') throw Error('Invalid product');
        // Sheet imports cannot overwrite existing component-based bundle records.
        if (
          data.fromSheet &&
          store.products.some(
            (old) => old.id === p.id && old.product_type === 'bundle',
          )
        )
          throw Error(
            'Edit existing bundles in Admin, not through a normal-product sheet',
          );
        return normalizeProduct(p);
      });
      const ids = new Set<string>();
      for (const p of products) {
        if (!p || typeof p !== 'object') throw Error('Invalid product');
        const errors = validateProduct(p);
        if (errors.length) throw Error(`${p.id}: ${errors.join(', ')}`);
        if (ids.has(p.id)) throw Error('Duplicate Product ID');
        ids.add(p.id);
      }
      if (
        data.create &&
        products.some((p) => store.products.some((old) => old.id === p.id))
      )
        throw Error('Product ID already exists.');
      await saveProducts(products);
    } else if (action === 'deleteProduct') {
      await database().batch([
        database()
          .prepare('DELETE FROM specials WHERE product_id = ?')
          .bind(data.id),
        database().prepare('DELETE FROM products WHERE id = ?').bind(data.id),
      ]);
    } else if (action === 'special') {
      const s = data.special;
      const source =
        data.product || store.products.find((p) => p.id === s.product_id);
      if (!source || source.id !== s.product_id)
        throw Error('Choose the matching catalog product');
      const product = {
        ...normalizeProduct(source),
        product_type: 'bundle' as const,
        featured: true,
      };
      const errors = [
        ...validateProduct(product),
        ...validateProductTax(product, product.active || s.active),
        ...validateSpecial(s, [
          ...store.products.filter((p) => p.id !== product.id),
          product,
        ]),
      ];
      if (s.active && !product.active)
        errors.push('Activate the bundle before activating the special');
      if (errors.length) throw Error(errors.join(', '));
      // One transaction updates the canonical product and its special reference.
      await database().batch([
        database()
          .prepare(
            'INSERT INTO products(id,sku,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET sku=excluded.sku,data=excluded.data',
          )
          .bind(product.id, product.sku, JSON.stringify(product)),
        database()
          .prepare(
            'INSERT INTO specials(id,product_id,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET product_id=excluded.product_id,data=excluded.data',
          )
          .bind(s.id, s.product_id, JSON.stringify(s)),
      ]);
    } else if (action === 'deleteSpecial') {
      await database()
        .prepare('DELETE FROM specials WHERE id = ?')
        .bind(data.id)
        .run();
    } else if (action === 'settings') {
      const errors = validateSettings(data.settings);
      if (errors.length) throw Error(errors.join(', '));
      await database()
        .prepare('UPDATE site_settings SET data = ? WHERE id = ?')
        .bind(JSON.stringify(data.settings), 'main')
        .run();
    } else throw Error('Unknown action.');
    return Response.json(await readAdminStore());
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Unable to save changes.' },
      { status: 400 },
    );
  }
}

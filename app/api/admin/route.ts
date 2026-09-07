import { isAdmin } from '@/services/adminAuth';
import { database, readStore, saveProducts } from '@/services/repository';
import { validateProduct, type Product } from '@/models/Product';
import { previewCSV, sheetCSVUrl } from '@/services/sheets';
import { validateSettings, validateSpecial } from '@/services/validation';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!(await isAdmin()))
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  return Response.json(await readStore(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
export async function POST(request: Request) {
  if (!(await isAdmin()))
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const body = await request.text();
    if (body.length > 2_000_000) throw Error('Request too large.');
    const { action, ...data } = JSON.parse(body);
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
    if (action === 'products') {
      const products: Product[] = data.products;
      if (!Array.isArray(products) || !products.length || products.length > 500)
        throw Error('Import between 1 and 500 products.');
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
      const errors = validateSpecial(s, store.products);
      if (errors.length) throw Error(errors.join(', '));
      await database()
        .prepare(
          'INSERT INTO specials(id,product_id,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET product_id=excluded.product_id,data=excluded.data',
        )
        .bind(s.id, s.product_id, JSON.stringify(s))
        .run();
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
    return Response.json(await readStore());
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Unable to save changes.' },
      { status: 400 },
    );
  }
}

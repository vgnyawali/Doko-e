import { createHash } from 'node:crypto';
import { cleanRequestText, requestStatuses, type ProductRequest } from '@/models/ProductRequest';
export async function submitProductRequest(db: D1Database, value: unknown, ip: string, now = Date.now()) {
  const text = cleanRequestText(value);
  // Use Cloudflare's trusted client header, never a caller-supplied forwarded-for.
  // No raw IP addresses are retained. Counter survives Worker restarts.
  const key = createHash('sha256').update(`doko-request:${ip || 'unknown'}`).digest('hex');
  const allowed = await db.prepare(`INSERT INTO product_request_limits (key, count, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN expires_at <= ? THEN 1 ELSE count + 1 END,
    expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END
    WHERE expires_at <= ? OR count < 5 RETURNING key`).bind(key, now + 3600000, now, now, now).first();
  if (!allowed) return false;
  await db.prepare('INSERT INTO product_requests (id, request_text, created_at, status, admin_notes, source_page) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), text, new Date(now).toISOString(), 'new', '', 'homepage').run();
  await db.prepare('DELETE FROM product_request_limits WHERE key IN (SELECT key FROM product_request_limits WHERE expires_at < ? LIMIT 100)').bind(now).run();
  return true;
}
export async function listProductRequests(db: D1Database, url: URL) {
  const search = (url.searchParams.get('search') || '').trim().slice(0, 500);
  const status = url.searchParams.get('status') || '';
  if (status && !requestStatuses.includes(status as ProductRequest['status'])) throw Error('Invalid status.');
  const offset = Number(url.searchParams.get('offset') || 0);
  if (!Number.isSafeInteger(offset) || offset < 0) throw Error('Invalid page.');
  const direction = url.searchParams.get('sort') === 'oldest' ? 'ASC' : 'DESC';
  const where = "WHERE (? = '' OR status = ?) AND (? = '' OR instr(lower(request_text || ' ' || admin_notes), lower(?)) > 0)";
  const [page, total, count] = await Promise.all([
    db.prepare(`SELECT * FROM product_requests ${where} ORDER BY created_at ${direction}, id ${direction} LIMIT 50 OFFSET ?`).bind(status, status, search, search, offset).all<ProductRequest>(),
    db.prepare(`SELECT count(*) AS total FROM product_requests ${where}`).bind(status, status, search, search).first<{total:number}>(),
    db.prepare("SELECT count(*) AS total FROM product_requests WHERE status = 'new'").first<{total:number}>(),
  ]);
  return { requests: page.results, total: total?.total || 0, new_count: count?.total || 0 };
}
export async function mutateProductRequest(db: D1Database, body: Record<string, unknown>) {
  if (typeof body.id !== 'string' || body.id.length > 100) throw Error('Invalid request ID.');
  if (body.action === 'delete') {
    await db.prepare('DELETE FROM product_requests WHERE id = ?').bind(body.id).run();
  } else if (body.action === 'update') {
    if (!requestStatuses.includes(body.status as ProductRequest['status'])) throw Error('Invalid status.');
    const notes = cleanRequestText(body.admin_notes, 0, 2000);
    await db.prepare('UPDATE product_requests SET status = ?, admin_notes = ? WHERE id = ?').bind(body.status, notes, body.id).run();
  } else throw Error('Invalid action.');
}

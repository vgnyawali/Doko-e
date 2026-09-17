import { isAdmin } from '@/services/adminAuth';
import { database } from '@/services/repository';
export async function GET(request: Request) {
  if (!(await isAdmin(request)))
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  const before = Number(
    new URL(request.url).searchParams.get('before') || Number.MAX_SAFE_INTEGER,
  );
  if (!Number.isSafeInteger(before) || before < 1)
    return Response.json({ error: 'Invalid cursor' }, { status: 400 });
  const result = await database()
    .prepare(
      'SELECT rowid AS cursor, id, session_id, status, data, payment_data FROM checkout_orders WHERE rowid < ? ORDER BY rowid DESC LIMIT 51',
    )
    .bind(before)
    .all<{
      cursor: number;
      id: string;
      session_id: string | null;
      status: string;
      data: string;
      payment_data: string | null;
    }>();
  const rows = result.results.slice(0, 50);
  return Response.json(
    {
      orders: rows.map((r) => ({
        ...r,
        data: JSON.parse(r.data),
        payment_data: r.payment_data ? JSON.parse(r.payment_data) : null,
      })),
      next_cursor: result.results.length > 50 ? rows.at(-1)!.cursor : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

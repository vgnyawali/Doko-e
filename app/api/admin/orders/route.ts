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
      "SELECT rowid AS cursor, id, session_id, status, data, payment_data FROM checkout_orders WHERE rowid < ? AND (? = 1 OR COALESCE(json_extract(data, '$.admin_hidden'), 0) = 0) ORDER BY rowid DESC LIMIT 51",
    )
    .bind(before, new URL(request.url).searchParams.get('include_hidden') === 'true' ? 1 : 0)
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

export async function POST(request: Request) {
  if (!(await isAdmin(request))) return Response.json({error:'Admin access required'}, {status:403});
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({error:'Invalid origin'}, {status:403});
  try {
    const body = await request.json() as {action?: string};
    if (body.action !== 'hide_existing') return Response.json({error:'Invalid action'}, {status:400});
    // Change only admin visibility; order IDs, payment status and receipt data survive.
    await database().prepare("UPDATE checkout_orders SET data = json_set(data, '$.admin_hidden', 1) WHERE COALESCE(json_extract(data, '$.admin_hidden'), 0) = 0").run();
    return Response.json({success:true}, {headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({error:'Unable to clear the order list. Please try again.'}, {status:500}); }
}

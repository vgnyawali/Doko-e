import { isAdmin } from '@/services/adminAuth';
import { database } from '@/services/repository';
import { readFlashAds, saveFlashAd } from '@/services/promotions';
export async function GET(request: Request) {
  if (!(await isAdmin(request)))
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  try {
    return Response.json(
      { ads: await readFlashAds(database()) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ error: 'Unable to load ads' }, { status: 503 });
  }
}
export async function POST(request: Request) {
  if (!(await isAdmin(request)))
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 1_100_000)
      return Response.json({ error: 'Ad is too large' }, { status: 413 });
    const body = JSON.parse(raw);
    if (body.action === 'save') await saveFlashAd(database(), body.ad);
    else if (body.action === 'delete' && typeof body.id === 'string')
      await database()
        .prepare('DELETE FROM flash_ads WHERE id = ?')
        .bind(body.id)
        .run();
    else return Response.json({ error: 'Invalid action' }, { status: 400 });
    return Response.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      {
        error: 'Unable to save ad. Check the image, link, title and schedule.',
      },
      { status: 400 },
    );
  }
}

import { database } from '@/services/repository';
import { readActiveFlashAd } from '@/services/promotions';
export async function GET() {
  try {
    return Response.json(
      { ad: await readActiveFlashAd(database()) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { ad: null },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

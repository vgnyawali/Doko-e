import { database } from '@/services/repository';
import {
  readActiveFlashAd,
  readHomepageSliderRecords,
} from '@/services/promotions';
export async function GET() {
  try {
    const [ad, slides] = await Promise.all([
      readActiveFlashAd(database()),
      readHomepageSliderRecords(database()),
    ]);
    return Response.json(
      { ad, slides },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { ad: null, slides: [] },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

import { readStore } from '@/services/repository';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const data = await readStore();
    return Response.json(
      { ...data, products: data.products.filter((p) => p.active) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { error: 'Catalog temporarily unavailable' },
      { status: 503 },
    );
  }
}

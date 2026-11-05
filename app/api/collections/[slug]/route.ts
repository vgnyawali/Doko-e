import { readCollectionBySlug } from '@/services/collections';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const result = await readCollectionBySlug(slug);
  if (!result)
    return Response.json({ error: 'Collection not found' }, { status: 404 });
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
}

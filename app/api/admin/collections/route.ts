import { isAdmin } from '@/services/adminAuth';
import {
  archiveCollection,
  readAdminCollections,
  saveCollection,
} from '@/services/collections';
import type {
  CatalogCollection,
  CollectionProductAssignment,
} from '@/models/CatalogCollection';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!(await isAdmin(request)))
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  return Response.json(
    { collections: await readAdminCollections() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  if (!(await isAdmin(request)))
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const body = await request.text();
    if (body.length > 2_000_000) throw new Error('Request too large');
    const data = JSON.parse(body) as {
      action?: string;
      collection?: CatalogCollection;
      assignments?: CollectionProductAssignment[];
      id?: string;
    };
    if (data.action === 'save') {
      if (!data.collection || !Array.isArray(data.assignments))
        throw new Error('Collection and assignments are required');
      await saveCollection(data.collection, data.assignments);
    } else if (data.action === 'archive') {
      if (!data.id) throw new Error('Collection ID is required');
      await archiveCollection(data.id);
    } else {
      throw new Error('Unknown action');
    }
    return Response.json({ collections: await readAdminCollections() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to save collection' },
      { status: 400 },
    );
  }
}

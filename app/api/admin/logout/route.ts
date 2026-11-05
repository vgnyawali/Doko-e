import { clearSessionCookie } from '@/services/adminAuth';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookie(),
    },
  });
}

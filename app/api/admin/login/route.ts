import {
  authenticatePassword,
  sessionCookieHeader,
} from '@/services/adminAuth';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  if (!request.headers.get('content-type')?.includes('application/json'))
    return Response.json({ error: 'Expected JSON.' }, { status: 415 });
  try {
    const text = await request.text();
    if (text.length > 12000) throw Error();
    const body = JSON.parse(text) as { username?: unknown; password?: unknown };
    if (typeof body.username !== 'string' || typeof body.password !== 'string')
      throw Error();
    const session = await authenticatePassword(body.username, body.password);
    if (!session)
      return Response.json(
        { error: 'Incorrect username or password.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Set-Cookie': sessionCookieHeader(session),
      },
    });
  } catch {
    return Response.json({ error: 'Invalid login request.' }, { status: 400 });
  }
}

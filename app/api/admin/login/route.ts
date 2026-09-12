import {
  authenticatePassword,
  adminAuthDiagnostics,
  AdminConfigurationError,
  sessionCookieHeader,
} from '@/services/adminAuth';
export const dynamic = 'force-dynamic';
// Temporary diagnostics: deliberately only these four booleans, never values.
export async function GET() {
  return Response.json(adminAuthDiagnostics(), { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  if (!request.headers.get('content-type')?.includes('application/json'))
    return Response.json({ error: 'Expected JSON.' }, { status: 415 });
  let body: { username?: unknown; password?: unknown };
  try {
    const text = await request.text();
    if (text.length > 12000) throw Error();
    body = JSON.parse(text) as { username?: unknown; password?: unknown };
    if (typeof body.username !== 'string' || typeof body.password !== 'string')
      throw Error();
  } catch {
    return Response.json({ error: 'Invalid login request.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    console.info(adminAuthDiagnostics());
    const session = await authenticatePassword(body.username as string, body.password as string);
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
  } catch (error) {
    if (error instanceof AdminConfigurationError)
      return Response.json({ error: 'Admin login is not configured correctly. Contact the store owner.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } });
    return Response.json({ error: 'Admin login is temporarily unavailable. Please try again later.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

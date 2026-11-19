import { authenticatePartner, sessionCookie } from '@/services/partnerAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid request.' }, { status: 403 });
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const email = body.email?.trim() || '';
    const password = body.password || '';
    if (!email || !password) throw Error('Email and password are required.');
    const session = await authenticatePartner(email, password);
    if (!session)
      return Response.json(
        { error: 'Incorrect email or password.' },
        { status: 401 },
      );
    return Response.json(
      { ok: true },
      { headers: { 'Set-Cookie': sessionCookie(session) } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to sign in.' },
      { status: 400 },
    );
  }
}

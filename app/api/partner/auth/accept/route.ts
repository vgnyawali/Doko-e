import { database } from '@/services/repository';
import {
  createPartnerSession,
  hashInviteToken,
  hashPartnerPassword,
  sessionCookie,
  validPartnerPassword,
} from '@/services/partnerAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid request.' }, { status: 403 });
  try {
    const body = (await request.json()) as {
      token?: string;
      password?: string;
    };
    const token = body.token?.trim() || '';
    const password = body.password || '';
    if (!token || !validPartnerPassword(password))
      throw Error(
        'Use a valid invitation and a password of at least 12 characters.',
      );
    const tokenHash = await hashInviteToken(token);
    const db = database();
    const row = await db
      .prepare(
        `SELECT m.id,m.session_version FROM partner_memberships m JOIN partners p ON p.id=m.partner_id WHERE m.invite_token_hash=? AND m.status='invited' AND m.invite_expires_at>? AND p.status='active'`,
      )
      .bind(tokenHash, new Date().toISOString())
      .first<{ id: string; session_version: number }>();
    if (!row)
      return Response.json(
        { error: 'This invitation is invalid or expired.' },
        { status: 400 },
      );
    const passwordHash = await hashPartnerPassword(password);
    const nextVersion = Number(row.session_version) + 1;
    const result = await db
      .prepare(
        `UPDATE partner_memberships SET password_hash=?,invite_token_hash=NULL,invite_expires_at=NULL,status='active',session_version=?,updated_at=? WHERE id=? AND invite_token_hash=?`,
      )
      .bind(
        passwordHash,
        nextVersion,
        new Date().toISOString(),
        row.id,
        tokenHash,
      )
      .run();
    if (!result.meta.changes)
      return Response.json(
        { error: 'This invitation has already been used.' },
        { status: 409 },
      );
    const session = await createPartnerSession(row.id, nextVersion);
    return Response.json(
      { ok: true },
      { headers: { 'Set-Cookie': sessionCookie(session) } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to activate account.',
      },
      { status: 400 },
    );
  }
}

import { database } from '@/services/repository';
import {
  audit,
  consumePartnerRateLimit,
  parsePartnerCsv,
  readPartnerSubmissions,
  resolvePartnerAccount,
} from '@/services/partnerPortal';
import {
  canMutatePartnerSubmission,
  normalizePartnerDraft,
  validatePartnerDraft,
} from '@/models/Partner';
export const dynamic = 'force-dynamic';
async function context() {
  const access = await resolvePartnerAccount();
  return access ? { actorId: access.membership.id, access } : null;
}
function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
export async function GET() {
  const ctx = await context();
  if (!ctx)
    return Response.json(
      { error: 'Active partner access required.' },
      { status: 403 },
    );
  return Response.json(
    {
      partner: ctx.access.partner,
      membership: ctx.access.membership,
      submissions: await readPartnerSubmissions(ctx.access.partner.id),
      privateFileStorage: false,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
export async function POST(request: Request) {
  const ctx = await context();
  if (!ctx)
    return Response.json(
      { error: 'Active partner access required.' },
      { status: 403 },
    );
  if (!sameOrigin(request))
    return Response.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    await consumePartnerRateLimit(`partner:${ctx.actorId}`);
    const raw = await request.text();
    if (raw.length > 1_500_000) throw Error('Request too large.');
    const body = JSON.parse(raw);
    const db = database();
    const now = new Date().toISOString();
    if (body.action === 'save') {
      const draft = normalizePartnerDraft(body.draft || {});
      const errors = validatePartnerDraft(draft, { requireComplete: false });
      if (errors.length) throw Error(errors.join(', '));
      if (body.id) {
        const current = await db
          .prepare(
            `SELECT id,partner_id,status FROM partner_product_submissions WHERE id=? AND partner_id=?`,
          )
          .bind(body.id, ctx.access.partner.id)
          .first<{ id: string; partner_id: string; status: string }>();
        if (
          !current ||
          !canMutatePartnerSubmission(ctx.access.partner.id, current)
        )
          throw Error('This submission cannot be edited.');
        const next = await db
          .prepare(
            `SELECT coalesce(max(revision_number),0)+1 n FROM partner_submission_revisions WHERE submission_id=?`,
          )
          .bind(body.id)
          .first<{ n: number }>();
        await db.batch([
          db
            .prepare(
              `INSERT INTO partner_submission_revisions(id,submission_id,partner_id,revision_number,data,created_by,created_at) VALUES(?,?,?,?,?,?,?)`,
            )
            .bind(
              crypto.randomUUID(),
              body.id,
              ctx.access.partner.id,
              next?.n || 1,
              JSON.stringify(draft),
              ctx.actorId,
              now,
            ),
          db
            .prepare(
              `UPDATE partner_product_submissions SET draft_data=?,partner_message=?,status='draft',updated_at=? WHERE id=? AND partner_id=?`,
            )
            .bind(
              JSON.stringify(draft),
              String(body.partner_message || '').slice(0, 1000),
              now,
              body.id,
              ctx.access.partner.id,
            ),
        ]);
        await audit(
          ctx.access.partner.id,
          body.id,
          'partner',
          ctx.actorId,
          'submission.updated',
        );
      } else {
        const id = crypto.randomUUID();
        await db
          .prepare(
            `INSERT INTO partner_product_submissions(id,partner_id,status,draft_data,partner_message,created_by,created_at,updated_at) VALUES(?,?,'draft',?,?,?,?,?)`,
          )
          .bind(
            id,
            ctx.access.partner.id,
            JSON.stringify(draft),
            String(body.partner_message || '').slice(0, 1000),
            ctx.actorId,
            now,
            now,
          )
          .run();
        await audit(
          ctx.access.partner.id,
          id,
          'partner',
          ctx.actorId,
          'submission.created',
        );
      }
    } else if (body.action === 'submit') {
      const current = await db
        .prepare(
          `SELECT draft_data,status FROM partner_product_submissions WHERE id=? AND partner_id=?`,
        )
        .bind(body.id, ctx.access.partner.id)
        .first<{ draft_data: string; status: string }>();
      if (
        !current ||
        !['draft', 'changes_requested', 'rejected'].includes(current.status)
      )
        throw Error('Submission is not available to submit.');
      const errors = validatePartnerDraft(
        normalizePartnerDraft(JSON.parse(current.draft_data)),
      );
      if (errors.length)
        throw Error(
          `Complete the required product information before submitting: ${errors.join(', ')}`,
        );
      const result = await db
        .prepare(
          `UPDATE partner_product_submissions SET status='submitted',submitted_at=?,updated_at=? WHERE id=? AND partner_id=? AND status=?`,
        )
        .bind(now, now, body.id, ctx.access.partner.id, current.status)
        .run();
      if (!result.meta.changes)
        throw Error(
          'Submission changed before it could be submitted. Please refresh and try again.',
        );
      await audit(
        ctx.access.partner.id,
        body.id,
        'partner',
        ctx.actorId,
        'submission.submitted',
      );
    } else if (body.action === 'request_change') {
      const result = await db
        .prepare(
          `UPDATE partner_product_submissions SET status='changes_requested',updated_at=? WHERE id=? AND partner_id=? AND status IN ('approved','published')`,
        )
        .bind(now, body.id, ctx.access.partner.id)
        .run();
      if (!result.meta.changes)
        throw Error('This product is not available for a change request.');
      await audit(
        ctx.access.partner.id,
        body.id,
        'partner',
        ctx.actorId,
        'product.change_started',
      );
    } else if (body.action === 'import_csv') {
      if (
        typeof body.file_name !== 'string' ||
        !body.file_name.toLowerCase().endsWith('.csv')
      )
        throw Error('Choose a CSV file.');
      if (typeof body.csv !== 'string' || body.csv.length > 500_000)
        throw Error('CSV must be 500 KB or smaller.');
      const drafts = parsePartnerCsv(body.csv);
      const importId = crypto.randomUUID();
      const statements = [
        db
          .prepare(
            `INSERT INTO partner_catalog_imports(id,partner_id,file_name,media_type,status,row_count,created_by,created_at) VALUES(?,?,?,'text/csv','extracted',?,?,?)`,
          )
          .bind(
            importId,
            ctx.access.partner.id,
            body.file_name.slice(0, 200),
            drafts.length,
            ctx.actorId,
            now,
          ),
        ...drafts.map((d) =>
          db
            .prepare(
              `INSERT INTO partner_product_submissions(id,partner_id,status,draft_data,created_by,created_at,updated_at) VALUES(?,?,'draft',?,?,?,?)`,
            )
            .bind(
              crypto.randomUUID(),
              ctx.access.partner.id,
              JSON.stringify(d),
              ctx.actorId,
              now,
              now,
            ),
        ),
      ];
      await db.batch(statements);
      await audit(
        ctx.access.partner.id,
        null,
        'partner',
        ctx.actorId,
        'catalog.csv_extracted',
        { rows: drafts.length },
      );
    } else throw Error('Unknown action.');
    return Response.json({
      submissions: await readPartnerSubmissions(ctx.access.partner.id),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to save.' },
      { status: 400 },
    );
  }
}

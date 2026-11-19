import { env } from 'cloudflare:workers';
import { isAdmin } from '@/services/adminAuth';
import { database } from '@/services/repository';
import {
  audit,
  normalizePartnerProfile,
  readAdminPartnerData,
  validatePartnerProfile,
} from '@/services/partnerPortal';
import {
  emptyProduct,
  shippingTypes,
  validateProduct,
  type Product,
  type ShippingType,
} from '@/models/Product';
import { normalizeProduct } from '@/services/taxService';
import { sendPartnerInvitation } from '@/modules/email/partnerInvitation';
import { createInviteToken, hashInviteToken } from '@/services/partnerAuth';
export const dynamic = 'force-dynamic';
const partnerStatuses = new Set(['pending', 'active', 'suspended', 'archived']);
const membershipStatuses = new Set(['active', 'suspended']);
const clean = (value: unknown, max = 500) =>
  typeof value === 'string'
    ? value
        .trim()
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .slice(0, max)
    : '';
const stringList = (value: unknown) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (item): item is string => typeof item === 'string' && Boolean(item),
          ),
        ),
      ]
    : [];
async function requirePartner(id: string) {
  if (
    !(await database()
      .prepare('SELECT id FROM partners WHERE id=?')
      .bind(id)
      .first())
  )
    throw Error('Partner not found.');
}
async function validateCollections(ids: string[]) {
  if (!ids.length) return;
  const rows = await database()
    .prepare(`SELECT id FROM catalog_collections WHERE status!='archived'`)
    .all<{ id: string }>();
  const valid = new Set(rows.results.map((row) => row.id));
  if (ids.some((id) => !valid.has(id)))
    throw Error('One or more collections are invalid.');
}
function partnerCollectionStatements(
  partnerId: string,
  ids: string[],
  now: string,
) {
  const db = database();
  return [
    db
      .prepare('DELETE FROM partner_collections WHERE partner_id=?')
      .bind(partnerId),
    ...ids.map((id) =>
      db
        .prepare(
          'INSERT INTO partner_collections(partner_id,collection_id,created_at) VALUES(?,?,?)',
        )
        .bind(partnerId, id, now),
    ),
  ];
}
function catalogAssignmentStatements(productId: string, ids: string[]) {
  const db = database();
  return [
    db
      .prepare('DELETE FROM catalog_collection_products WHERE product_id=?')
      .bind(productId),
    ...ids.map((id, index) =>
      db
        .prepare(
          `INSERT INTO catalog_collection_products(collection_id,product_id,display_order,badge,description) VALUES(?,?,?,'','')`,
        )
        .bind(id, productId, index),
    ),
  ];
}
function approvedProduct(
  draft: Record<string, unknown>,
  body: Record<string, unknown>,
  existingId: string | null,
) {
  const requested = clean(body.shipping_type, 30) || 'nationwide';
  const shipping: ShippingType = shippingTypes.includes(
    requested as ShippingType,
  )
    ? (requested as ShippingType)
    : 'nationwide';
  return normalizeProduct({
    ...emptyProduct,
    ...draft,
    id: existingId || clean(body.product_id, 120) || crypto.randomUUID(),
    sku: clean(body.sku || draft.partner_sku, 120),
    price: Number(body.price),
    inventory: Number(body.inventory),
    display_order: Number(body.display_order || 0),
    shipping_type: shipping,
    active: false,
    featured: false,
    product_type: 'normal',
    components: [],
  } as Product);
}
export async function POST(request: Request) {
  if (!(await isAdmin(request)))
    return Response.json({ error: 'Admin access required.' }, { status: 403 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 1_500_000) throw Error('Request is too large.');
    const body = JSON.parse(raw) as Record<string, unknown>;
    const db = database(),
      now = new Date().toISOString(),
      action = clean(body.action, 50);
    let actionNotice = 'Partner management updated.';
    if (action === 'create_partner' || action === 'update_partner') {
      const id =
          action === 'create_partner'
            ? crypto.randomUUID()
            : clean(body.partner_id, 120),
        name = clean(body.name, 120),
        slug = clean(body.slug, 120).toLowerCase();
      const profile = normalizePartnerProfile(
          (body.profile || {}) as Record<string, string>,
        ),
        collectionIds = stringList(body.collection_ids);
      if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
        throw Error('Name and a lowercase URL slug are required.');
      const errors = validatePartnerProfile(profile);
      if (errors.length) throw Error(errors.join(' '));
      await validateCollections(collectionIds);
      if (action === 'create_partner') {
        await db.batch([
          db
            .prepare(
              `INSERT INTO partners(id,name,slug,status,profile_data,created_at,updated_at) VALUES(?,?,?,'pending',?,?,?)`,
            )
            .bind(id, name, slug, JSON.stringify(profile), now, now),
          ...partnerCollectionStatements(id, collectionIds, now),
        ]);
        await audit(id, null, 'admin', 'doko-admin', 'partner.created');
      } else {
        await requirePartner(id);
        await db.batch([
          db
            .prepare(
              'UPDATE partners SET name=?,slug=?,profile_data=?,updated_at=? WHERE id=?',
            )
            .bind(name, slug, JSON.stringify(profile), now, id),
          ...partnerCollectionStatements(id, collectionIds, now),
        ]);
        await audit(id, null, 'admin', 'doko-admin', 'partner.updated', {
          collection_ids: collectionIds,
        });
      }
    } else if (action === 'partner_status') {
      const partnerId = clean(body.partner_id, 120),
        status = clean(body.status, 30);
      if (!partnerStatuses.has(status)) throw Error('Invalid partner status.');
      await requirePartner(partnerId);
      await db
        .prepare('UPDATE partners SET status=?,updated_at=? WHERE id=?')
        .bind(status, now, partnerId)
        .run();
      await audit(
        partnerId,
        null,
        'admin',
        'doko-admin',
        'partner.status_changed',
        { status },
      );
    } else if (action === 'invite' || action === 'resend_invite') {
      const partnerId = clean(body.partner_id, 120),
        email = clean(body.email, 320).toLowerCase(),
        role = body.role === 'owner' ? 'owner' : 'member';
      if (!/^\S+@\S+\.\S+$/.test(email)) throw Error('Valid email required.');
      const partner = await db
        .prepare('SELECT name FROM partners WHERE id=?')
        .bind(partnerId)
        .first<{ name: string }>();
      if (!partner) throw Error('Partner not found.');
      const token = createInviteToken();
      const tokenHash = await hashInviteToken(token);
      const inviteExpiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const invitationId = crypto.randomUUID();
      const membership = await db
        .prepare(
          `INSERT INTO partner_memberships(id,partner_id,email,role,status,invite_token_hash,invite_expires_at,session_version,created_at,updated_at)
           VALUES(?,?,?,?, 'invited',?,?,0,?,?)
           ON CONFLICT(partner_id,email) DO UPDATE SET role=excluded.role,status='invited',password_hash=NULL,invite_token_hash=excluded.invite_token_hash,invite_expires_at=excluded.invite_expires_at,session_version=partner_memberships.session_version+1,updated_at=excluded.updated_at
           RETURNING id`,
        )
        .bind(
          invitationId,
          partnerId,
          email,
          role,
          tokenHash,
          inviteExpiresAt,
          now,
          now,
        )
        .first<{ id: string }>();
      if (!membership) throw Error('Unable to save the partner invitation.');
      const delivery = await sendPartnerInvitation(
        {
          invitationId:
            action === 'resend_invite'
              ? `${membership.id}-${crypto.randomUUID()}`
              : membership.id,
          email,
          partnerName: partner.name,
          role,
          invitationUrl: `${new URL(request.url).origin}/partners/accept?token=${encodeURIComponent(token)}`,
        },
        env,
      );
      await audit(partnerId, null, 'admin', 'doko-admin', 'member.invited', {
        role,
        email_delivery: delivery.status,
      });
      actionNotice =
        delivery.status === 'sent'
          ? `Invitation email accepted for delivery to ${email}.`
          : `Invitation saved for ${email}, but partner invitation email is disabled.`;
    } else if (action === 'member_status') {
      const id = clean(body.id, 120),
        status = clean(body.status, 30);
      if (!membershipStatuses.has(status))
        throw Error('Invalid membership status.');
      const member = await db
        .prepare('SELECT partner_id FROM partner_memberships WHERE id=?')
        .bind(id)
        .first<{ partner_id: string }>();
      if (!member) throw Error('Partner user not found.');
      await db
        .prepare(
          'UPDATE partner_memberships SET status=?,updated_at=? WHERE id=?',
        )
        .bind(status, now, id)
        .run();
      await audit(
        member.partner_id,
        null,
        'admin',
        'doko-admin',
        'member.status_changed',
        { status },
      );
    } else if (action === 'review') {
      const id = clean(body.id, 120);
      const row = await db
        .prepare(
          'SELECT partner_id,product_id,draft_data,status FROM partner_product_submissions WHERE id=?',
        )
        .bind(id)
        .first<{
          partner_id: string;
          product_id: string | null;
          draft_data: string;
          status: string;
        }>();
      if (!row || row.status !== 'submitted')
        throw Error('Submission is not awaiting review.');
      const decision = clean(body.decision, 30),
        feedback = clean(body.feedback, 2000);
      if (decision === 'changes_requested' || decision === 'rejected') {
        await db.batch([
          db
            .prepare(
              'UPDATE partner_product_submissions SET status=?,admin_feedback=?,updated_at=? WHERE id=? AND status=?',
            )
            .bind(decision, feedback, now, id, 'submitted'),
          db
            .prepare(
              `INSERT INTO partner_review_decisions(id,submission_id,partner_id,decision,feedback,actor,created_at) VALUES(?,?,?,?,?,'doko-admin',?)`,
            )
            .bind(
              crypto.randomUUID(),
              id,
              row.partner_id,
              decision,
              feedback,
              now,
            ),
        ]);
        await audit(
          row.partner_id,
          id,
          'admin',
          'doko-admin',
          `submission.${decision}`,
        );
      } else if (decision === 'approved') {
        const product = approvedProduct(
            JSON.parse(row.draft_data),
            body,
            row.product_id,
          ),
          collectionIds = stringList(body.collection_ids),
          errors = validateProduct({ ...product, active: false });
        if (errors.length) throw Error(errors.join(', '));
        await validateCollections(collectionIds);
        if (
          !row.product_id &&
          (await db
            .prepare('SELECT id FROM products WHERE id=?')
            .bind(product.id)
            .first())
        )
          throw Error('Product ID already exists. Choose a new ID.');
        await db.batch([
          db
            .prepare(
              `UPDATE partner_product_submissions SET status='approved',approval_data=?,admin_feedback=?,updated_at=? WHERE id=? AND status='submitted'`,
            )
            .bind(
              JSON.stringify({ product, collection_ids: collectionIds }),
              feedback,
              now,
              id,
            ),
          db
            .prepare(
              `INSERT INTO partner_review_decisions(id,submission_id,partner_id,decision,feedback,actor,created_at) VALUES(?,?,?,'approved',?,'doko-admin',?)`,
            )
            .bind(crypto.randomUUID(), id, row.partner_id, feedback, now),
        ]);
        await audit(
          row.partner_id,
          id,
          'admin',
          'doko-admin',
          'submission.approved',
          { product_id: product.id },
        );
        if (body.publish === true) await publishApproved(id, now);
      } else throw Error('Invalid review decision.');
    } else if (action === 'publish_approved')
      await publishApproved(clean(body.id, 120), now);
    else throw Error('Unknown action.');
    return Response.json({
      ...(await readAdminPartnerData()),
      notice: actionNotice,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to save.' },
      { status: 400 },
    );
  }
}
async function publishApproved(id: string, now: string) {
  const db = database();
  const row = await db
    .prepare(
      'SELECT partner_id,product_id,status,approval_data FROM partner_product_submissions WHERE id=?',
    )
    .bind(id)
    .first<{
      partner_id: string;
      product_id: string | null;
      status: string;
      approval_data: string;
    }>();
  if (!row || row.status !== 'approved')
    throw Error('Only an approved submission can be published.');
  const approval = JSON.parse(row.approval_data) as {
    product?: Product;
    collection_ids?: string[];
  };
  if (!approval.product) throw Error('Approved product data is missing.');
  const product = normalizeProduct({ ...approval.product, active: true }),
    collectionIds = stringList(approval.collection_ids);
  if (row.product_id && row.product_id !== product.id)
    throw Error('Approved product does not match the existing listing.');
  const errors = validateProduct(product);
  if (errors.length) throw Error(errors.join(', '));
  await validateCollections(collectionIds);
  await db.batch([
    db
      .prepare(
        'INSERT INTO products(id,sku,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET sku=excluded.sku,data=excluded.data',
      )
      .bind(product.id, product.sku, JSON.stringify(product)),
    ...catalogAssignmentStatements(product.id, collectionIds),
    db
      .prepare(
        `UPDATE partner_product_submissions SET product_id=?,status='published',updated_at=? WHERE id=? AND status='approved'`,
      )
      .bind(product.id, now, id),
    db
      .prepare(
        `INSERT INTO partner_review_decisions(id,submission_id,partner_id,decision,feedback,actor,created_at) VALUES(?,?,?,'published','','doko-admin',?)`,
      )
      .bind(crypto.randomUUID(), id, row.partner_id, now),
  ]);
  await audit(
    row.partner_id,
    id,
    'admin',
    'doko-admin',
    'submission.published',
    { product_id: product.id },
  );
}

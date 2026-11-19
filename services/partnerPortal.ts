import { database } from './repository';
import type {
  PartnerOrganization,
  PartnerProfile,
  PartnerSubmission,
} from '@/models/Partner';
import { normalizePartnerDraft } from '@/models/Partner';
import { partnerSession } from './partnerAuth';

export const emptyPartnerProfile: PartnerProfile = {
  description: '',
  website: '',
  contact_email: '',
  country: '',
};
export function normalizePartnerProfile(
  value: Partial<PartnerProfile>,
): PartnerProfile {
  const clean = (input: unknown, max: number) =>
    typeof input === 'string'
      ? input
          .trim()
          .replace(/[\u0000-\u001f\u007f]/g, '')
          .slice(0, max)
      : '';
  return {
    description: clean(value.description, 2000),
    website: clean(value.website, 500),
    contact_email: clean(value.contact_email, 320).toLowerCase(),
    country: clean(value.country, 120),
  };
}
export function validatePartnerProfile(value: PartnerProfile) {
  const errors: string[] = [];
  if (value.contact_email && !/^\S+@\S+\.\S+$/.test(value.contact_email))
    errors.push('Contact email is invalid.');
  if (value.website) {
    try {
      if (new URL(value.website).protocol !== 'https:')
        errors.push('Website must use HTTPS.');
    } catch {
      errors.push('Website must be a valid HTTPS URL.');
    }
  }
  return errors;
}

export async function resolvePartnerAccount(request?: Request) {
  const row = await partnerSession(request);
  if (!row) return null;
  const partner: PartnerOrganization = {
    id: String(row.partner_id),
    name: String(row.name),
    slug: String(row.slug),
    status: 'active',
    profile: {
      ...emptyPartnerProfile,
      ...JSON.parse(String(row.profile_data)),
    },
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
  return {
    partner,
    membership: {
      id: String(row.id),
      partner_id: String(row.partner_id),
      user_id: null,
      email: String(row.email),
      role: row.role as 'owner' | 'member',
      status: 'active' as const,
    },
  };
}

function submission(
  row: Record<string, unknown>,
): PartnerSubmission & {
  approval_data?: Record<string, unknown>;
  review_history?: Array<Record<string, unknown>>;
} {
  return {
    id: String(row.id),
    partner_id: String(row.partner_id),
    partner_name: row.partner_name ? String(row.partner_name) : undefined,
    product_id: row.product_id ? String(row.product_id) : null,
    status: row.status as PartnerSubmission['status'],
    draft: normalizePartnerDraft(JSON.parse(String(row.draft_data))),
    partner_message: String(row.partner_message || ''),
    admin_feedback: String(row.admin_feedback || ''),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    submitted_at: row.submitted_at ? String(row.submitted_at) : null,
    approval_data: row.approval_data
      ? JSON.parse(String(row.approval_data))
      : {},
  };
}
export async function readPartnerSubmissions(partnerId: string) {
  const rows = await database()
    .prepare(
      `SELECT * FROM partner_product_submissions WHERE partner_id=? ORDER BY updated_at DESC`,
    )
    .bind(partnerId)
    .all<Record<string, unknown>>();
  return rows.results.map(submission);
}
export async function readAdminPartnerData() {
  const db = database();
  const [p, s, m, c, a, r] = await Promise.all([
    db
      .prepare(
        `SELECT id,name,slug,status,profile_data,created_at,updated_at FROM partners ORDER BY name`,
      )
      .all<Record<string, unknown>>(),
    db
      .prepare(
        `SELECT s.*,p.name partner_name FROM partner_product_submissions s JOIN partners p ON p.id=s.partner_id ORDER BY s.updated_at DESC`,
      )
      .all<Record<string, unknown>>(),
    db
      .prepare(
        `SELECT id,partner_id,user_id,email,role,status,created_at,updated_at FROM partner_memberships ORDER BY created_at DESC`,
      )
      .all<Record<string, unknown>>(),
    db
      .prepare(
        `SELECT id,slug,data FROM catalog_collections WHERE status!='archived' ORDER BY navigation_order`,
      )
      .all<{ id: string; slug: string; data: string }>(),
    db
      .prepare(`SELECT partner_id,collection_id FROM partner_collections`)
      .all<{ partner_id: string; collection_id: string }>(),
    db
      .prepare(
        `SELECT id,submission_id,partner_id,decision,feedback,actor,created_at FROM partner_review_decisions ORDER BY created_at DESC`,
      )
      .all<Record<string, unknown>>(),
  ]);
  const reviewMap = new Map<string, Array<Record<string, unknown>>>();
  for (const review of r.results) {
    const key = String(review.submission_id);
    reviewMap.set(key, [...(reviewMap.get(key) || []), review]);
  }
  return {
    partners: p.results.map((x) => ({
      ...x,
      profile: {
        ...emptyPartnerProfile,
        ...JSON.parse(String(x.profile_data)),
      },
      collection_ids: a.results
        .filter((item) => item.partner_id === x.id)
        .map((item) => item.collection_id),
      profile_data: undefined,
    })),
    submissions: s.results.map((row) => ({
      ...submission(row),
      review_history: reviewMap.get(String(row.id)) || [],
    })),
    memberships: m.results,
    collections: c.results.map((x) => ({
      id: x.id,
      slug: x.slug,
      label:
        (JSON.parse(x.data) as { navigation_label?: string })
          .navigation_label || x.slug,
    })),
  };
}
export async function audit(
  partnerId: string | null,
  submissionId: string | null,
  actorType: 'partner' | 'admin',
  actorId: string,
  action: string,
  metadata: Record<string, unknown> = {},
) {
  await database()
    .prepare(
      `INSERT INTO partner_audit_log(id,partner_id,submission_id,actor_type,actor_id,action,metadata,created_at) VALUES(?,?,?,?,?,?,?,?)`,
    )
    .bind(
      crypto.randomUUID(),
      partnerId,
      submissionId,
      actorType,
      actorId,
      action,
      JSON.stringify(metadata),
      new Date().toISOString(),
    )
    .run();
}
export async function consumePartnerRateLimit(
  key: string,
  limit = 40,
  windowSeconds = 60,
) {
  const db = database(),
    now = Math.floor(Date.now() / 1000),
    expires = now + windowSeconds;
  const row = await db
    .prepare(`SELECT count,expires_at FROM partner_rate_limits WHERE key=?`)
    .bind(key)
    .first<{ count: number; expires_at: number }>();
  if (!row || row.expires_at <= now) {
    await db
      .prepare(
        `INSERT INTO partner_rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=1,expires_at=excluded.expires_at`,
      )
      .bind(key, expires)
      .run();
    return;
  }
  if (row.count >= limit)
    throw new Error('Too many requests. Please wait and try again.');
  await db
    .prepare(
      `UPDATE partner_rate_limits SET count=count+1 WHERE key=? AND expires_at>?`,
    )
    .bind(key, now)
    .run();
}
export function parsePartnerCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length < 2)
    throw new Error('CSV must include a header and at least one product row.');
  const split = (line: string) => {
    const out: string[] = [];
    let value = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) {
        out.push(value.trim());
        value = '';
      } else value += ch;
    }
    if (quoted) throw new Error('CSV contains an unclosed quote.');
    out.push(value.trim());
    return out;
  };
  const headers = split(lines[0]).map((x) =>
    x.toLowerCase().replaceAll(' ', '_'),
  );
  return lines.slice(1, 101).map((line) => {
    const values = split(line);
    const raw = Object.fromEntries(headers.map((h, i) => [h, values[i] || '']));
    const draft = normalizePartnerDraft({
      ...raw,
      partner_sku: raw.partner_sku || raw.sku || raw.model,
      source: 'csv',
    });
    draft.uncertain_fields = [
      'name',
      'category',
      'brand',
      'package_size',
      'partner_sku',
      'country_of_origin',
    ].filter((k) => !draft[k as keyof typeof draft]);
    return draft;
  });
}

'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PartnerProductDraft, PartnerSubmission } from '@/models/Partner';

type Partner = {
  id: string;
  name: string;
  slug: string;
  status: string;
  profile: {
    description: string;
    website: string;
    contact_email: string;
    country: string;
  };
  collection_ids: string[];
};
type Member = {
  id: string;
  partner_id: string;
  email: string;
  role: string;
  status: string;
  user_id: string | null;
};
type Review = {
  id: string;
  decision: string;
  feedback: string;
  actor: string;
  created_at: string;
};
type Submission = PartnerSubmission & {
  approval_data?: {
    product?: Record<string, unknown>;
    collection_ids?: string[];
  };
  review_history?: Review[];
};
type Data = {
  partners: Partner[];
  memberships: Member[];
  submissions: Submission[];
  collections: Array<{ id: string; label: string; slug: string }>;
  notice?: string;
};
const blankProfile = {
  description: '',
  website: '',
  contact_email: '',
  country: '',
};

async function responseJson(response: Response) {
  const text = await response.text();
  if (!text) throw Error('The partner server returned an empty response.');
  try {
    return JSON.parse(text) as Data & { error?: string };
  } catch {
    throw Error('The partner server returned an invalid response.');
  }
}
export default function PartnerManagementMvp() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<Partner | null>(null),
    [creating, setCreating] = useState(false),
    [selectedPartner, setSelectedPartner] = useState(''),
    [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(
      null,
    ),
    submissionsRef = useRef<HTMLDivElement>(null);
  async function load() {
    const response = await fetch('/api/admin/partners', { cache: 'no-store' }),
      result = await responseJson(response);
    if (!response.ok) throw Error(result.error || 'Unable to load partners.');
    setData(result);
  }
  useEffect(() => {
    void load().catch((value) =>
      setError(value instanceof Error ? value.message : String(value)),
    );
  }, []);
  async function post(body: unknown) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/partners/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
        result = await responseJson(response);
      if (!response.ok) throw Error(result.error || 'Unable to save.');
      setData(result);
      setEditing(null);
      setCreating(false);
      setSelectedSubmission(null);
      setNotice(result.notice || 'Partner management updated.');
    } catch (value) {
      setError(value instanceof Error ? value.message : String(value));
    } finally {
      setBusy(false);
    }
  }
  const submissions = useMemo(
    () =>
      data?.submissions.filter(
        (item) => !selectedPartner || item.partner_id === selectedPartner,
      ) || [],
    [data, selectedPartner],
  );
  const selectedPartnerName = data?.partners.find(
    (partner) => partner.id === selectedPartner,
  )?.name;
  function showSubmissions(partnerId = '') {
    setSelectedPartner(partnerId);
    requestAnimationFrame(() =>
      submissionsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      }),
    );
  }
  if (!data)
    return (
      <section className="admin-card">
        <h2>Partner Management</h2>
        <p role="status">{error || 'Loading partners…'}</p>
      </section>
    );
  return (
    <section className="admin-card partner-management">
      <div className="admin-toolbar">
        <div>
          <h2>Partner Management</h2>
          <p>
            Create organizations, manage access, and approve products without
            giving partners publication rights.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setCreating(true);
            setEditing({
              id: '',
              name: '',
              slug: '',
              status: 'pending',
              profile: { ...blankProfile },
              collection_ids: [],
            });
          }}
        >
          + Create partner
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      {(editing || creating) && (
        <PartnerForm
          partner={editing!}
          collections={data.collections}
          busy={busy}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={(value) =>
            post({
              action: creating ? 'create_partner' : 'update_partner',
              partner_id: value.id,
              name: value.name,
              slug: value.slug,
              profile: value.profile,
              collection_ids: value.collection_ids,
            })
          }
        />
      )}
      <h3>Organizations &amp; users</h3>
      <div className="partner-admin-list">
        {data.partners.map((partner) => (
          <article className="partner-admin-row" key={partner.id}>
            <div>
              <strong>{partner.name}</strong>
              <small>
                {partner.slug} · {partner.status}
              </small>
              <small>
                {partner.profile.country || 'Country not set'} ·{' '}
                {partner.profile.contact_email || 'No contact email'}
              </small>
              <small>
                {partner.collection_ids.length} collection
                {partner.collection_ids.length === 1 ? '' : 's'} ·{' '}
                {
                  data.submissions.filter(
                    (item) => item.partner_id === partner.id,
                  ).length
                }{' '}
                submission
                {data.submissions.filter(
                  (item) => item.partner_id === partner.id,
                ).length === 1
                  ? ''
                  : 's'}
              </small>
            </div>
            <select
              aria-label={`${partner.name} status`}
              value={partner.status}
              disabled={busy}
              onChange={(event) =>
                void post({
                  action: 'partner_status',
                  partner_id: partner.id,
                  status: event.target.value,
                })
              }
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </select>
            <div className="row-actions">
              <button
                onClick={() => {
                  setCreating(false);
                  setEditing(partner);
                }}
              >
                Edit
              </button>
              <button onClick={() => showSubmissions(partner.id)}>
                View submissions
              </button>
            </div>
            <InviteForm partnerId={partner.id} busy={busy} onInvite={post} />
            <div className="partner-users">
              <b>Authorized users</b>
              {data.memberships
                .filter((member) => member.partner_id === partner.id)
                .map((member) => (
                  <div key={member.id}>
                    <span>
                      {member.email} · {member.role} · {member.status}
                    </span>
                    {member.status === 'invited' ? (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void post({
                            action: 'resend_invite',
                            partner_id: partner.id,
                            email: member.email,
                            role: member.role,
                          })
                        }
                      >
                        Resend invitation
                      </button>
                    ) : (
                      <span className="row-actions">
                        {member.status === 'active' && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              void post({
                                action: 'resend_invite',
                                partner_id: partner.id,
                                email: member.email,
                                role: member.role,
                              })
                            }
                          >
                            Reset login
                          </button>
                        )}
                        <button
                          disabled={busy}
                          onClick={() =>
                            void post({
                              action: 'member_status',
                              id: member.id,
                              status:
                                member.status === 'suspended'
                                  ? 'active'
                                  : 'suspended',
                            })
                          }
                        >
                          {member.status === 'suspended'
                            ? 'Activate'
                            : 'Suspend'}
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              {!data.memberships.some(
                (member) => member.partner_id === partner.id,
              ) && <small>No users invited.</small>}
            </div>
          </article>
        ))}
      </div>
      <div
        className="admin-toolbar partner-submission-toolbar"
        ref={submissionsRef}
      >
        <div>
          <h3>
            <button
              type="button"
              className="admin-section-link"
              onClick={() => showSubmissions()}
            >
              Product submissions
            </button>
          </h3>
          <small>
            {selectedPartnerName
              ? `Showing submissions from ${selectedPartnerName}`
              : 'Showing submissions from all partners'}
          </small>
        </div>
        <select
          aria-label="Filter submissions by partner"
          value={selectedPartner}
          onChange={(event) => setSelectedPartner(event.target.value)}
        >
          <option value="">All partners</option>
          {data.partners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {partner.name}
            </option>
          ))}
        </select>
      </div>
      <div className="partner-submissions">
        {submissions.map((submission) => (
          <article key={submission.id}>
            <div>
              <strong>
                {submission.draft.name || 'Untitled'} —{' '}
                {submission.partner_name}
              </strong>
              <small>
                {submission.draft.partner_sku} ·{' '}
                {submission.status.replaceAll('_', ' ')} · Updated{' '}
                {new Date(submission.updated_at).toLocaleDateString()}
              </small>
            </div>
            <span className={`submission-status status-${submission.status}`}>
              {submission.status.replaceAll('_', ' ')}
            </span>
            <div className="row-actions">
              <button onClick={() => setSelectedSubmission(submission)}>
                View
              </button>
              {submission.status === 'approved' && (
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() =>
                    void post({ action: 'publish_approved', id: submission.id })
                  }
                >
                  Publish
                </button>
              )}
            </div>
          </article>
        ))}
        {!submissions.length && (
          <p>
            No submissions found
            {selectedPartnerName ? ` for ${selectedPartnerName}` : ''}.
            {selectedPartnerName && (
              <>
                {' '}
                <button onClick={() => showSubmissions()}>
                  View all submissions
                </button>
              </>
            )}
          </p>
        )}
      </div>
      {selectedSubmission && (
        <SubmissionReview
          submission={selectedSubmission}
          collections={data.collections}
          busy={busy}
          onClose={() => setSelectedSubmission(null)}
          onReview={post}
        />
      )}
    </section>
  );
}

function PartnerForm({
  partner,
  collections,
  busy,
  onCancel,
  onSave,
}: {
  partner: Partner;
  collections: Data['collections'];
  busy: boolean;
  onCancel: () => void;
  onSave: (partner: Partner) => void;
}) {
  const [draft, setDraft] = useState<Partner>({
    ...partner,
    profile: { ...partner.profile },
    collection_ids: [...partner.collection_ids],
  });
  return (
    <form
      className="partner-edit-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <h3>{partner.id ? 'Edit partner' : 'Create partner'}</h3>
      <label>
        Name
        <input
          required
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </label>
      <label>
        Slug
        <input
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          value={draft.slug}
          onChange={(event) =>
            setDraft({ ...draft, slug: event.target.value.toLowerCase() })
          }
        />
      </label>
      <label>
        Contact email
        <input
          type="email"
          value={draft.profile.contact_email}
          onChange={(event) =>
            setDraft({
              ...draft,
              profile: { ...draft.profile, contact_email: event.target.value },
            })
          }
        />
      </label>
      <label>
        Country
        <input
          value={draft.profile.country}
          onChange={(event) =>
            setDraft({
              ...draft,
              profile: { ...draft.profile, country: event.target.value },
            })
          }
        />
      </label>
      <label>
        Website
        <input
          type="url"
          placeholder="https://"
          value={draft.profile.website}
          onChange={(event) =>
            setDraft({
              ...draft,
              profile: { ...draft.profile, website: event.target.value },
            })
          }
        />
      </label>
      <label className="full-width">
        Description
        <textarea
          value={draft.profile.description}
          onChange={(event) =>
            setDraft({
              ...draft,
              profile: { ...draft.profile, description: event.target.value },
            })
          }
        />
      </label>
      <fieldset className="full-width">
        <legend>Partner collections</legend>
        {collections.map((collection) => (
          <label key={collection.id}>
            <input
              type="checkbox"
              checked={draft.collection_ids.includes(collection.id)}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  collection_ids: event.target.checked
                    ? [...draft.collection_ids, collection.id]
                    : draft.collection_ids.filter((id) => id !== collection.id),
                })
              }
            />
            {collection.label}
          </label>
        ))}
      </fieldset>
      <div className="row-actions full-width">
        <button className="primary-button" disabled={busy}>
          Save partner
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
function InviteForm({
  partnerId,
  busy,
  onInvite,
}: {
  partnerId: string;
  busy: boolean;
  onInvite: (body: unknown) => Promise<void>;
}) {
  return (
    <form
      className="partner-invite"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void onInvite({
          action: 'invite',
          partner_id: partnerId,
          email: form.get('email'),
          role: form.get('role'),
        });
        event.currentTarget.reset();
      }}
    >
      <input
        name="email"
        type="email"
        placeholder="partner@example.com"
        required
      />
      <select name="role">
        <option value="member">Member</option>
        <option value="owner">Owner</option>
      </select>
      <button disabled={busy}>Invite user</button>
    </form>
  );
}
function SubmissionReview({
  submission,
  collections,
  busy,
  onClose,
  onReview,
}: {
  submission: Submission;
  collections: Data['collections'];
  busy: boolean;
  onClose: () => void;
  onReview: (body: unknown) => Promise<void>;
}) {
  const [feedback, setFeedback] = useState(submission.admin_feedback || '');
  const canReview = submission.status === 'submitted';
  return (
    <div className="partner-review">
      <div className="admin-toolbar">
        <div>
          <h3>{submission.draft.name}</h3>
          <p>
            {submission.partner_name} · {submission.status.replaceAll('_', ' ')}
          </p>
        </div>
        <button onClick={onClose}>Close</button>
      </div>
      <DraftDetails draft={submission.draft} />
      {submission.draft.image_url && (
        <img src={submission.draft.image_url} alt="Submitted product" />
      )}
      <label>
        Feedback
        <textarea
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
        />
      </label>
      {canReview && (
        <>
          <div className="row-actions">
            <button
              disabled={busy}
              onClick={() =>
                void onReview({
                  action: 'review',
                  id: submission.id,
                  decision: 'changes_requested',
                  feedback,
                })
              }
            >
              Request changes
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void onReview({
                  action: 'review',
                  id: submission.id,
                  decision: 'rejected',
                  feedback,
                })
              }
            >
              Reject
            </button>
          </div>
          <ApprovalForm
            submission={submission}
            collections={collections}
            feedback={feedback}
            busy={busy}
            onReview={onReview}
          />
        </>
      )}
      {submission.status === 'approved' && (
        <button
          className="primary-button"
          disabled={busy}
          onClick={() =>
            void onReview({ action: 'publish_approved', id: submission.id })
          }
        >
          Publish approved product
        </button>
      )}
      <h4>Review history</h4>
      {submission.review_history?.length ? (
        <ul>
          {submission.review_history.map((review) => (
            <li key={review.id}>
              <b>{review.decision.replaceAll('_', ' ')}</b> ·{' '}
              {new Date(review.created_at).toLocaleString()}
              {review.feedback && <> — {review.feedback}</>}
            </li>
          ))}
        </ul>
      ) : (
        <p>No review decisions yet.</p>
      )}
    </div>
  );
}
function DraftDetails({ draft }: { draft: PartnerProductDraft }) {
  const values: Record<string, unknown> = {
    name: draft.name,
    'SKU / model': draft.partner_sku,
    category: draft.category,
    brand: draft.brand,
    description: draft.description,
    'material / specifications': draft.material_specifications,
    'available variants': draft.available_variants,
    'proposed wholesale price': draft.proposed_wholesale_price,
    'available supply quantity': draft.available_supply_quantity,
    'country of origin': draft.country_of_origin,
    'package size': draft.package_size,
    contents: draft.contents,
    ingredients: draft.ingredients,
    allergens: draft.allergens,
  };
  return (
    <dl>
      {Object.entries(values).map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{String(value || '—')}</dd>
        </div>
      ))}
    </dl>
  );
}
function ApprovalForm({
  submission,
  collections,
  feedback,
  busy,
  onReview,
}: {
  submission: Submission;
  collections: Data['collections'];
  feedback: string;
  busy: boolean;
  onReview: (body: unknown) => Promise<void>;
}) {
  return (
    <form
      className="partner-approval"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void onReview({
          action: 'review',
          id: submission.id,
          decision: 'approved',
          feedback,
          product_id: form.get('product_id'),
          sku: form.get('sku'),
          price: Number(form.get('price')),
          inventory: Number(form.get('inventory')),
          display_order: Number(form.get('display_order')),
          shipping_type: form.get('shipping_type'),
          publish: form.get('publish') === 'on',
          collection_ids: form.getAll('collection_ids'),
        });
      }}
    >
      <h4>Approve into Doko catalog</h4>
      <label>
        Product ID
        <input
          name="product_id"
          defaultValue={submission.product_id || crypto.randomUUID()}
          required
          readOnly={Boolean(submission.product_id)}
        />
      </label>
      <label>
        Doko SKU
        <input
          name="sku"
          defaultValue={submission.draft.partner_sku}
          required
        />
      </label>
      <label>
        US retail price
        <input name="price" type="number" min="0" step="0.01" required />
      </label>
      <label>
        Sellable inventory
        <input name="inventory" type="number" min="0" step="1" required />
      </label>
      <label>
        Display order
        <input
          name="display_order"
          type="number"
          min="0"
          step="1"
          defaultValue="0"
        />
      </label>
      <label>
        Shipping
        <select name="shipping_type">
          <option value="nationwide">Nationwide</option>
          <option value="local_only">Local only</option>
          <option value="pickup_only">Pickup only</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </label>
      <fieldset>
        <legend>Product collections</legend>
        {collections.map((collection) => (
          <label key={collection.id}>
            <input
              type="checkbox"
              name="collection_ids"
              value={collection.id}
            />
            {collection.label}
          </label>
        ))}
      </fieldset>
      <label>
        <input type="checkbox" name="publish" /> Publish immediately after
        approval
      </label>
      <button className="primary-button" disabled={busy}>
        Approve product
      </button>
    </form>
  );
}

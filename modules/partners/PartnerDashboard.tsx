'use client';
import { useEffect, useRef, useState } from 'react';
import ImageUploadField from '@/admin/ImageUploadField';
import {
  emptyPartnerDraft,
  type PartnerOrganization,
  type PartnerProductDraft,
  type PartnerSubmission,
} from '@/models/Partner';
export default function PartnerDashboard({
  initialPartner,
  signOutUrl,
}: {
  initialPartner: PartnerOrganization;
  signOutUrl: string;
}) {
  const [items, setItems] = useState<PartnerSubmission[]>([]),
    [editing, setEditing] = useState<PartnerSubmission | null>(null),
    [creating, setCreating] = useState(false),
    [draft, setDraft] = useState<PartnerProductDraft>({ ...emptyPartnerDraft }),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const csv = useRef<HTMLInputElement>(null);
  async function read(r: Response) {
    const text = await r.text();
    if (!text) throw Error('The partner server returned an empty response.');
    try {
      return JSON.parse(text) as {
        submissions?: PartnerSubmission[];
        error?: string;
      };
    } catch {
      throw Error('The partner server returned an invalid response.');
    }
  }
  async function load() {
    const r = await fetch('/api/partner', { cache: 'no-store' });
    const d = await read(r);
    if (!r.ok) throw Error(d.error || 'Unable to load partner records.');
    setItems(d.submissions || []);
  }
  useEffect(() => {
    void load().catch((e) => setError(String(e)));
  }, []);
  async function post(body: unknown) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await read(r);
      if (!r.ok) throw Error(d.error || 'Unable to save.');
      setItems(d.submissions || []);
      setEditing(null);
      setCreating(false);
      setDraft({ ...emptyPartnerDraft });
      setMessage('');
      setNotice('Saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  function edit(item?: PartnerSubmission) {
    setEditing(item || null);
    setCreating(true);
    setDraft(item ? { ...item.draft } : { ...emptyPartnerDraft });
    setMessage(item?.partner_message || '');
  }
  return (
    <main className="partner-shell">
      <header className="partner-header">
        <div>
          <p className="eyebrow">Doko partner marketplace</p>
          <h1>{initialPartner.name}</h1>
          <p>
            {initialPartner.profile.description ||
              'Prepare products for Doko review. Doko controls final pricing, inventory, collections and publication.'}
          </p>
          <small>
            {[
              initialPartner.profile.country,
              initialPartner.profile.contact_email,
            ]
              .filter(Boolean)
              .join(' · ')}
          </small>
        </div>
        <div>
          <a href="/">Storefront</a> ·{' '}
          <a href={signOutUrl} target="_top">
            Sign out
          </a>
        </div>
      </header>
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
      <section className="partner-card">
        <div className="admin-toolbar">
          <h2>Product submissions</h2>
          <div className="row-actions">
            <button className="primary-button" onClick={() => edit()}>
              + New draft
            </button>
            <input
              ref={csv}
              hidden
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f)
                  await post({
                    action: 'import_csv',
                    file_name: f.name,
                    csv: await f.text(),
                  });
                e.target.value = '';
              }}
            />
            <button onClick={() => csv.current?.click()}>Import CSV</button>
          </div>
        </div>
        <p className="sample-note">
          CSV columns may include name, sku/model, description, category,
          material_specifications, available_variants, proposed_wholesale_price,
          available_supply_quantity and country_of_origin. PDF import requires
          private storage and is not enabled yet.
        </p>
        <div className="partner-submissions">
          {items.map((x) => (
            <article key={x.id}>
              <div>
                <strong>{x.draft.name || 'Untitled draft'}</strong>
                <small>
                  {x.draft.partner_sku} · {x.draft.brand} · Updated{' '}
                  {new Date(x.updated_at).toLocaleDateString()}
                </small>
                {x.admin_feedback && (
                  <p>
                    <b>Doko feedback:</b> {x.admin_feedback}
                  </p>
                )}
              </div>
              <span className={`submission-status status-${x.status}`}>
                {x.status.replaceAll('_', ' ')}
              </span>
              <div className="row-actions">
                {['draft', 'changes_requested', 'rejected'].includes(
                  x.status,
                ) && <button onClick={() => edit(x)}>Edit</button>}
                {['draft', 'changes_requested', 'rejected'].includes(
                  x.status,
                ) && (
                  <button
                    disabled={busy}
                    onClick={() => void post({ action: 'submit', id: x.id })}
                  >
                    Submit for review
                  </button>
                )}
                {['approved', 'published'].includes(x.status) && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void post({ action: 'request_change', id: x.id })
                    }
                  >
                    Propose changes
                  </button>
                )}
              </div>
            </article>
          ))}
          {!items.length && <p>No product drafts yet.</p>}
        </div>
      </section>
      {creating && (
        <section className="partner-card">
          <h2>{editing ? 'Edit draft' : 'New product draft'}</h2>
          <div className="partner-form">
            {(
              [
                ['name', 'Product name'],
                ['partner_sku', 'SKU / model'],
                ['category', 'Category'],
                ['brand', 'Brand'],
                ['package_size', 'Package size'],
                ['country_of_origin', 'Country of origin'],
                ['nepali_name', 'Nepali name'],
                ['description', 'Description'],
                ['material_specifications', 'Material / specifications'],
                ['available_variants', 'Available variants'],
                ['contents', 'Contents'],
                ['ingredients', 'Ingredients'],
                ['allergens', 'Allergens'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                {[
                  'description',
                  'material_specifications',
                  'available_variants',
                  'contents',
                  'ingredients',
                  'allergens',
                ].includes(key) ? (
                  <textarea
                    value={draft[key]}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    value={draft[key]}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  />
                )}
              </label>
            ))}
            <label>
              Proposed wholesale price
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.proposed_wholesale_price}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    proposed_wholesale_price: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Available supply quantity
              <input
                type="number"
                min="0"
                step="1"
                value={draft.available_supply_quantity}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    available_supply_quantity: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <ImageUploadField
            label="Product image"
            value={draft.image_url}
            onChange={(image_url) => setDraft({ ...draft, image_url })}
            maxInputBytes={10_000_000}
            acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
          />
          <label className="admin-field">
            <span>Message for Doko</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
            />
          </label>
          <div className="row-actions">
            <button
              className="primary-button"
              disabled={busy}
              onClick={() =>
                void post({
                  action: 'save',
                  id: editing?.id,
                  draft,
                  partner_message: message,
                })
              }
            >
              Save draft
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setCreating(false);
                setDraft({ ...emptyPartnerDraft });
              }}
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

'use client';
import { useState } from 'react';
import type { Product } from '@/models/Product';
import type { FeaturedSpecial } from '@/models/FeaturedSpecial';
import { isSpecialCurrent } from '@/models/FeaturedSpecial';
import { Field, Choice, Toggle } from './Fields';
import { validateSpecial } from '@/services/validation';
import ImageUploadField from './ImageUploadField';
export default function SpecialsEditor({
  specials,
  products,
  onSave,
  onDelete,
  busy,
}: {
  specials: FeaturedSpecial[];
  products: Product[];
  onSave: (s: FeaturedSpecial) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState<FeaturedSpecial | null>(null);
  const [error, setError] = useState('');
  return (
    <section className="admin-card">
      <div className="admin-toolbar">
        <h2>Seasonal specials</h2>
        <button
          className="primary-button"
          onClick={() => {
            setError('');
            setDraft({
              id: crypto.randomUUID(),
              product_id: products[0]?.id || '',
              occasion: '',
              headline: '',
              description: '',
              hero_image: '',
              start_date: new Date().toISOString().slice(0, 10),
              end_date: '',
              priority: 0,
              active: false,
            });
          }}
        >
          Add special
        </button>
      </div>
      <p>
        Specials reference your catalog and automatically hide after their end
        date (inclusive, UTC).
      </p>
      {specials.map((s) => (
        <div className="special-admin-row" key={s.id}>
          <div>
            <strong>
              {s.occasion} · {s.headline}
            </strong>
            <p>
              {s.start_date} → {s.end_date} ·{' '}
              {isSpecialCurrent(s)
                ? 'Live'
                : s.active
                  ? 'Scheduled / ended'
                  : 'Inactive'}{' '}
              · Priority {s.priority}
            </p>
          </div>
          <button
            onClick={() => {
              setDraft(s);
              setError('');
            }}
          >
            Edit
          </button>
          <button disabled={busy} onClick={() => onDelete(s.id)}>
            Delete
          </button>
        </div>
      ))}
      {draft && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const errors = validateSpecial(draft, products);
            setError(errors.join(' · '));
            if (!errors.length) onSave(draft);
          }}
        >
          <h3>Edit special</h3>
          <div className="form-grid">
            <Choice
              label="Referenced product"
              value={draft.product_id}
              options={products.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.id})`,
              }))}
              onChange={(v) => setDraft({ ...draft, product_id: v })}
            />
            <ImageUploadField label="Hero image" value={draft.hero_image} onChange={(v) => setDraft({ ...draft, hero_image: v })} />
            {(
              [
                'occasion',
                'headline',
                'description',
                'start_date',
                'end_date',
                'priority',
              ] as const
            ).map((k) => (
              <Field
                key={k}
                label={k}
                value={draft[k]}
                type={
                  k.endsWith('_date')
                    ? 'date'
                    : k === 'priority'
                      ? 'number'
                      : k === 'description'
                        ? 'textarea'
                        : 'text'
                }
                onChange={(v) =>
                  setDraft({ ...draft, [k]: k === 'priority' ? Number(v) : v })
                }
              />
            ))}
          </div>
          <Toggle
            label="Active"
            checked={draft.active}
            onChange={(v) => setDraft({ ...draft, active: v })}
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="primary-button" disabled={busy}>
            Save special
          </button>
        </form>
      )}
    </section>
  );
}

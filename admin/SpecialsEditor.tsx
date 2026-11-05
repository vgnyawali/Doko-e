'use client';
import { useState } from 'react';
import { emptyProduct, type Product } from '@/models/Product';
import type { FeaturedSpecial } from '@/models/FeaturedSpecial';
import { isSpecialCurrent } from '@/models/FeaturedSpecial';
import { validateSpecial } from '@/services/validation';
import { validateProduct } from '@/models/Product';
import { normalizeProduct } from '@/services/taxService';
import { Field, Choice, Toggle } from './Fields';
import ProductEditor from './ProductEditor';
import ImageUploadField from './ImageUploadField';
import PromotionFields from './PromotionFields';
export default function SpecialsEditor({
  specials,
  products,
  onSave,
  onDelete,
  busy,
}: {
  specials: FeaturedSpecial[];
  products: Product[];
  onSave: (s: FeaturedSpecial, p?: Product) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState<FeaturedSpecial | null>(null);
  const [bundle, setBundle] = useState<Product | null>(null);
  const [error, setError] = useState('');
  function selectProduct(id: string) {
    const p = products.find((p) => p.id === id);
    setBundle(p ? normalizeProduct(p) : null);
  }
  function begin(s: FeaturedSpecial) {
    setDraft(s);
    selectProduct(s.product_id);
    setError('');
  }
  function save(p: Product) {
    if (!draft) return;
    const product = { ...p, product_type: 'bundle' as const, featured: true };
    const errors = [
      ...validateProduct(product),
      ...validateSpecial(draft, [
        ...products.filter((old) => old.id !== product.id),
        product,
      ]),
    ];
    if (draft.active && !product.active)
      errors.push(
        'Activate the referenced bundle before activating its special',
      );
    setError(errors.join(' · '));
    if (!errors.length) onSave(draft, product);
  }
  return (
    <section className="admin-card">
      <div className="admin-toolbar">
        <h2>Featured Products</h2>
        <button
          className="primary-button"
          onClick={() =>
            begin({
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
            })
          }
        >
          Add special
        </button>
      </div>
      <p>
        Specials reference one catalog product. Saving updates that same product
        as a featured bundle. Dates are inclusive, UTC.
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
                  : 'Inactive'}
            </p>
          </div>
          <button onClick={() => begin(s)}>Edit</button>
          <button disabled={busy} onClick={() => onDelete(s.id)}>
            Delete
          </button>
        </div>
      ))}
      {draft && (
        <section>
          <h3>Edit special</h3>
          <div className="form-grid">
            <Choice
              label="Referenced catalog product"
              value={draft.product_id}
              options={products.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.id})`,
              }))}
              onChange={(id) => {
                setDraft({ ...draft, product_id: id });
                selectProduct(id);
              }}
            />
            <button
              type="button"
              onClick={() => {
                const id = crypto.randomUUID();
                setDraft({ ...draft, product_id: id });
                setBundle({
                  ...emptyProduct,
                  id,
                  sku: `BUNDLE-${id.slice(0, 8)}`,
                  product_type: 'bundle',
                  featured: true,
                });
              }}
            >
              Create new bundle product
            </button>
            <ImageUploadField
              label="Hero image"
              value={draft.hero_image}
              onChange={(v) => setDraft({ ...draft, hero_image: v })}
            />
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
            label="Special active"
            checked={draft.active}
            onChange={(v) => setDraft({ ...draft, active: v })}
          />
          <PromotionFields value={draft} onChange={v => setDraft({...draft,...v})} />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {bundle && (
            <>
              <p>
                Edit the referenced product and its component allocations below.
                Save product saves both the special and its catalog product
                together.
              </p>
              <ProductEditor
                key={draft.id + bundle.id}
                product={{ ...bundle, product_type: 'bundle', featured: true }}
                existing={products.some((p) => p.id === bundle.id)}
                busy={busy}
                onSave={save}
              />
            </>
          )}
        </section>
      )}
    </section>
  );
}

'use client';
import { useState } from 'react';
import { type Product, shippingTypes, validateProduct } from '@/models/Product';
import { Field, Choice, Toggle } from './Fields';
import ImageUploadField from './ImageUploadField';
import TaxFields from './TaxFields';
import BundleEditor from './BundleEditor';
import { normalizeProduct } from '@/services/taxService';
export default function ProductEditor({
  product,
  existing,
  onSave,
  busy,
}: {
  product: Product;
  existing: boolean;
  onSave: (p: Product) => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(normalizeProduct(product));
  const [errors, setErrors] = useState<string[]>([]);
  function update(key: keyof Product, value: unknown) {
    setDraft({ ...draft, [key]: value });
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const errors = validateProduct(draft);
        setErrors(errors);
        if (!errors.length) onSave(draft);
      }}
    >
      <div className="form-grid">
        <ImageUploadField
          label="Product image"
          value={draft.image_url}
          onChange={(v) => update('image_url', v)}
        />
        {Object.keys(draft)
          .filter(
            (k) =>
              !k.startsWith('hover_popup_') && ![
                'active',
                'featured',
                'shipping_type',
                'image_url',
                'taxable',
                'tax_class',
                'stripe_tax_code',
                'tax_behavior',
                'components',
                'product_type',
              ].includes(k),
          )
          .map((key) => {
            const k = key as keyof Product;
            const numeric = ['price', 'inventory', 'display_order'].includes(k);
            return (
              <Field
                key={k}
                label={k}
                disabled={existing && k === 'id'}
                type={
                  numeric
                    ? 'number'
                    : [
                          'description',
                          'contents',
                          'ingredients',
                          'allergens',
                        ].includes(k)
                      ? 'textarea'
                      : 'text'
                }
                value={String(draft[k])}
                onChange={(v) => update(k, numeric ? Number(v) : v)}
              />
            );
          })}
        <Choice
          label="Shipping type"
          value={draft.shipping_type}
          options={shippingTypes.map((t) => ({
            value: t,
            label: t.replaceAll('_', ' '),
          }))}
          onChange={(v) => update('shipping_type', v)}
        />
      </div>
      <Choice
        label="Product type"
        value={draft.product_type}
        options={[
          { value: 'normal', label: 'Normal product' },
          { value: 'bundle', label: 'Bundle' },
        ]}
        onChange={(v) =>
          setDraft({
            ...draft,
            product_type: v as Product['product_type'],
            components: v === 'normal' ? [] : draft.components,
          })
        }
      />
      {draft.product_type === 'bundle' ? (
        <BundleEditor product={draft} onChange={setDraft} />
      ) : (
        <TaxFields
          value={draft}
          onChange={(tax) => setDraft({ ...draft, ...tax })}
        />
      )}
      <div className="toggle-row">
        <Toggle
          label="Active"
          checked={draft.active}
          onChange={(v) => update('active', v)}
        />
      </div>
      {errors.length > 0 && (
        <p className="error" role="alert">
          {errors.join(' · ')}
        </p>
      )}
      <button className="primary-button" disabled={busy} type="submit">
        {busy ? 'Saving…' : 'Save product'}
      </button>
    </form>
  );
}

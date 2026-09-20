'use client';
import type { PromotionalHover } from '@/models/Promotion';
import { Field } from './Fields';
import ImageUploadField from './ImageUploadField';
export function PromotionImage({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <ImageUploadField
        label="Promotional image"
        value={value}
        onChange={onChange}
        maxInputBytes={10_000_000}
        acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
      />
      <Field
        label="Image URL (HTTPS)"
        value={value.startsWith('data:') ? '' : value}
        onChange={onChange}
      />
      <small>
        Upload JPG, PNG or WebP up to 10 MB; compressed to at most 750 KB. Or
        enter an HTTPS image URL.
      </small>
    </div>
  );
}
export default function PromotionFields({
  value,
  onChange,
}: {
  value: PromotionalHover;
  onChange: (value: PromotionalHover) => void;
}) {
  return (
    <section className="admin-card">
      <h3>Promotional Hover</h3>
      <label>
        <input
          type="checkbox"
          checked={!!value.hover_popup_enabled}
          onChange={(e) =>
            onChange({ ...value, hover_popup_enabled: e.target.checked })
          }
        />{' '}
        Enable Hover Popup
      </label>
      <PromotionImage
        value={value.hover_popup_image_url || ''}
        onChange={(v) => onChange({ ...value, hover_popup_image_url: v })}
      />
      <div className="form-grid">
        {(['title', 'description', 'cta_text', 'cta_url'] as const).map(
          (key) => {
            const field = `hover_popup_${key}` as const;
            return (
              <Field
                key={key}
                label={
                  key === 'cta_url' ? 'CTA Link' : key.replaceAll('_', ' ')
                }
                type={key === 'description' ? 'textarea' : 'text'}
                value={value[field] || ''}
                onChange={(v) => onChange({ ...value, [field]: v })}
              />
            );
          },
        )}
      </div>
    </section>
  );
}

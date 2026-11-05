'use client';
import { useState } from 'react';
import type { SiteSettings } from '@/models/SiteSettings';
import { Field, Toggle } from './Fields';
import ShippingSettings from './ShippingSettings';
import { validateSettings } from '@/services/validation';
export default function SiteSettingsEditor({
  settings,
  onSave,
  busy,
}: {
  settings: SiteSettings;
  onSave: (s: SiteSettings) => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const errors = validateSettings(draft);
        setError(errors.join(' · '));
        if (!errors.length) onSave(draft);
      }}
    >
      <section className="admin-card">
        <h2>Site settings</h2>
        <div className="form-grid">
          {(
            [
              'site_name',
              'browser_title',
              'hero_title',
              'hero_subtitle',
              'support_email',
              'announcement',
            ] as const
          ).map((k) => (
            <Field
              key={k}
              label={k}
              value={draft[k]}
              onChange={(v) => setDraft({ ...draft, [k]: v })}
            />
          ))}
          <Field
            label="Featured items before carousel"
            type="number"
            value={String(draft.featured_items_carousel_threshold)}
            onChange={(value) =>
              setDraft({
                ...draft,
                featured_items_carousel_threshold: Number(value),
              })
            }
          />
        </div>
        <Toggle label="Include original homepage cover alongside custom slides"
          checked={!!draft.include_original_homepage_cover}
          onChange={(value) => setDraft({ ...draft, include_original_homepage_cover: value })} />
        <p>The original cover always appears when no custom slide is active.</p>
        <Toggle label="Show seasonal specials" checked={draft.special_enabled}
          onChange={(value) => setDraft({ ...draft, special_enabled: value })} />
      </section>
      <ShippingSettings settings={draft} onChange={setDraft} />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="primary-button" type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save site settings'}
      </button>
    </form>
  );
}

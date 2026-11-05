'use client';
import type { SiteSettings } from '@/models/SiteSettings';
import { shippingTypes } from '@/models/Product';
import { Toggle, Field } from './Fields';
export default function ShippingSettings({
  settings,
  onChange,
}: {
  settings: SiteSettings;
  onChange: (s: SiteSettings) => void;
}) {
  return (
    <section className="admin-card">
      <h2>Shipping settings</h2>
      <p>
        Nationwide shipping is the default. Enable other fulfillment methods
        only when your store can support them.
      </p>
      <Field
        label="shipping_message"
        value={settings.shipping_message}
        onChange={(v) => onChange({ ...settings, shipping_message: v })}
      />
      <Field
        label="Delivery address and instructions"
        type="textarea"
        value={settings.delivery_instructions || ''}
        onChange={(v) => onChange({ ...settings, delivery_instructions: v })}
      />
      <Field
        label="free_shipping_threshold"
        type="number"
        value={settings.free_shipping_threshold}
        onChange={(v) =>
          onChange({ ...settings, free_shipping_threshold: Number(v) })
        }
      />
      {shippingTypes.map((t) => (
        <Toggle
          key={t}
          label={t.replaceAll('_', ' ')}
          checked={settings.shipping_enabled[t]}
          disabled={t === 'unavailable'}
          onChange={(v) =>
            onChange({
              ...settings,
              shipping_enabled: { ...settings.shipping_enabled, [t]: v },
            })
          }
        />
      ))}
    </section>
  );
}

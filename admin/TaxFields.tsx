'use client';
import type { TaxConfiguration } from '@/models/BundleComponent';
import { taxClasses } from '@/config/tax';
import { Choice, Field } from './Fields';
export default function TaxFields({
  value,
  onChange,
}: {
  value: TaxConfiguration;
  onChange: (v: TaxConfiguration) => void;
}) {
  return (
    <fieldset>
      <legend>Tax classification</legend>
      <div className="form-grid">
        <Choice
          label="Taxable?"
          value={value.taxable ? 'yes' : 'no'}
          options={[
            {
              value: 'yes',
              label: 'Yes — let Stripe determine applicable tax',
            },
            { value: 'no', label: 'No — explicitly tax-exempt' },
          ]}
          onChange={(v) =>
            onChange({ ...value, taxable: v === 'yes', stripe_tax_code: '' })
          }
        />
        <Choice
          label="Tax Class"
          value={value.tax_class}
          options={Object.entries(taxClasses).map(([value, c]) => ({
            value,
            label: c.label,
          }))}
          onChange={(v) => onChange({ ...value, tax_class: v })}
        />
        <Field
          label="Stripe Tax Code (optional)"
          value={value.stripe_tax_code || ''}
          onChange={(v) => onChange({ ...value, stripe_tax_code: v.trim() })}
        />
        <Choice
          label="Tax Behavior"
          value={value.tax_behavior}
          options={['automatic', 'inclusive', 'exclusive'].map((value) => ({
            value,
            label: value,
          }))}
          onChange={(v) =>
            onChange({
              ...value,
              tax_behavior: v as TaxConfiguration['tax_behavior'],
            })
          }
        />
      </div>
      <p>
        Taxable Yes uses the product classification and customer location. No
        forces exemption everywhere. Automatic is exclusive for USD. Confirm
        exemptions before selecting No.
      </p>
    </fieldset>
  );
}

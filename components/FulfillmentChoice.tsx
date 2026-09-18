'use client';
import type { FulfillmentMethod } from '@/services/fulfillment';
export default function FulfillmentChoice({
  value,
  onChange,
  deliveryDisabled = false,
  shippingDisabled = false,
}: {
  value: FulfillmentMethod;
  onChange: (v: FulfillmentMethod) => void;
  deliveryDisabled?: boolean;
  shippingDisabled?: boolean;
}) {
  return (
    <fieldset
      style={{
        border: '1px solid #e4d4c8',
        borderRadius: 8,
        padding: 16,
        margin: '18px 0',
      }}
    >
      <legend>How would you like your order?</legend>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {(['delivery', 'shipping'] as const).map((method) => (
          <label
            key={method}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <input
              type="checkbox"
              checked={value === method}
              disabled={
                method === 'delivery' ? deliveryDisabled : shippingDisabled
              }
              onChange={() => onChange(method)}
              style={{ accentColor: '#771d35', width: 18, height: 18 }}
            />
            {method === 'delivery'
              ? 'Delivery — Greater Boston'
              : 'Shipping — U.S. nationwide'}
          </label>
        ))}
      </div>
      <small>
        Select one option. Greater Boston delivery has no shipping fee. Shipping
        fees are confirmed before payment.
      </small>
    </fieldset>
  );
}

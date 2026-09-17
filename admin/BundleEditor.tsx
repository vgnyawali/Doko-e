'use client';
import type { Product } from '@/models/Product';
import type { BundleComponent } from '@/models/BundleComponent';
import { taxDefaults } from '@/config/tax';
import { bundleTotals } from '@/services/taxService';
import TaxFields from './TaxFields';
import { Field } from './Fields';
export default function BundleEditor({
  product,
  onChange,
}: {
  product: Product;
  onChange: (p: Product) => void;
}) {
  const components = product.components;
  const update = (i: number, c: BundleComponent) =>
    onChange({
      ...product,
      components: components.map((old, j) => (i === j ? c : old)),
    });
  let totals;
  try {
    totals = bundleTotals(product.price, components);
  } catch {
    totals = null;
  }
  function move(i: number, offset: number) {
    const next = [...components];
    [next[i], next[i + offset]] = [next[i + offset], next[i]];
    onChange({ ...product, components: next });
  }
  return (
    <section>
      <h3>Bundle contents & allocations</h3>
      <p>
        Allocated price is the total value of this component row in ONE bundle,
        including the row quantity. It is not multiplied by component quantity.
        Basket quantity multiplies the entire bundle.
      </p>
      {components.map((c, i) => (
        <fieldset key={i}>
          <legend>Component {i + 1}</legend>
          <div className="form-grid">
            <Field
              label="Component name"
              value={c.name}
              onChange={(v) => update(i, { ...c, name: v })}
            />
            <Field
              label="Quantity in one bundle"
              type="number"
              value={c.quantity}
              onChange={(v) => update(i, { ...c, quantity: Number(v) })}
            />
            <Field
              label="Allocated price (row total, USD)"
              type="number"
              value={c.allocated_price}
              onChange={(v) => update(i, { ...c, allocated_price: Number(v) })}
            />
          </div>
          <TaxFields value={c} onChange={(v) => update(i, { ...c, ...v })} />
          <div className="row-actions">
            <button type="button" disabled={!i} onClick={() => move(i, -1)}>
              Move up
            </button>
            <button
              type="button"
              disabled={i === components.length - 1}
              onClick={() => move(i, 1)}
            >
              Move down
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...product,
                  components: components.filter((_, j) => j !== i),
                })
              }
            >
              Remove component
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({
            ...product,
            components: [
              ...components,
              { ...taxDefaults, name: '', quantity: 1, allocated_price: 0 },
            ],
          })
        }
      >
        + Add component
      </button>
      {totals ? (
        <dl>
          {Object.entries(totals).map(([key, value]) => (
            <div key={key}>
              <dt>{key.replaceAll('_', ' ')}</dt>
              <dd>${value.toFixed(2)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p role="alert">
          Enter valid dollar amounts with at most two decimals.
        </p>
      )}
      {totals && totals.difference !== 0 && (
        <p className="error">
          Allocations must equal the selling price before this bundle can be
          active.
        </p>
      )}
    </section>
  );
}

'use client';
import { useEffect, useState } from 'react';
import type { CheckoutOrder } from '@/models/CheckoutOrder';
const dollars = (value: number | undefined) =>
  value === undefined ? 'Not recorded' : `$${value.toFixed(2)}`;
export default function OrdersView() {
  const [orders, setOrders] = useState<CheckoutOrder[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  async function load(more = false) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(
        `/api/admin/orders${more && cursor ? `?before=${cursor}` : ''}`,
      );
      const d = (await r.json()) as {
        orders: CheckoutOrder[];
        next_cursor: number | null;
        error?: string;
      };
      if (!r.ok) throw Error(d.error || 'Unable to load orders');
      setOrders((old) => (more ? [...old, ...d.orders] : d.orders));
      setCursor(d.next_cursor);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="admin-card">
      <div className="admin-toolbar">
        <h2>Orders</h2>
        <button disabled={busy} onClick={() => void load()}>
          Refresh
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!orders.length && !busy && <p>No orders yet.</p>}
      {orders.map((o) => {
        const q = o.data.quote,
          p = o.payment_data;
        return (
          <article key={o.id}>
            <h3>Order {o.id.slice(0, 12)}</h3>
            <p>
              Status: {o.status} · Stripe session:{' '}
              {o.session_id || 'Not created'}
            </p>
            <dl>
              <dt>Product subtotal (advertised)</dt>
              <dd>{dollars(q.subtotal)}</dd>
              <dt>Taxable Portion</dt>
              <dd>{dollars(q.taxable_subtotal)}</dd>
              <dt>Tax-Exempt Portion</dt>
              <dd>{dollars(q.tax_exempt_subtotal)}</dd>
              <dt>Tax</dt>
              <dd>
                {dollars(
                  p?.amount_tax === undefined ? undefined : p.amount_tax / 100,
                )}
              </dd>
              <dt>Shipping</dt>
              <dd>
                {dollars(
                  p?.amount_shipping === undefined
                    ? undefined
                    : p.amount_shipping / 100,
                )}
              </dd>
              <dt>Total Paid</dt>
              <dd>
                {o.status === 'paid'
                  ? dollars(
                      p?.amount_total === undefined
                        ? undefined
                        : p.amount_total / 100,
                    )
                  : 'Awaiting confirmed payment'}
              </dd>
            </dl>
            {q.items.map((item, i) => (
              <details key={i}>
                <summary>
                  {item.name} × {item.quantity} — ${item.line_total.toFixed(2)}
                </summary>
                <p>
                  Tax behavior:{' '}
                  {item.tax_lines
                    ?.map((l) => l.configured_tax_behavior)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .join(', ') || 'Not recorded'}
                </p>
                {item.components?.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Qty per bundle</th>
                        <th>Allocation per bundle</th>
                        <th>Tax</th>
                        <th>Behavior</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.components.map((c, i) => (
                        <tr key={i}>
                          <td>{c.name}</td>
                          <td>{c.quantity}</td>
                          <td>${c.allocated_price.toFixed(2)}</td>
                          <td>
                            {c.taxable ? 'Taxable' : 'Exempt'} / {c.tax_class}
                          </td>
                          <td>{c.tax_behavior}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>Normal product</p>
                )}
              </details>
            ))}
          </article>
        );
      })}
      {cursor && (
        <button disabled={busy} onClick={() => void load(true)}>
          Load older orders
        </button>
      )}
    </section>
  );
}

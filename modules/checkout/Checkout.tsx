'use client';
import { useEffect, useState } from 'react';
import BrandLogo from '@/components/BrandLogo';
import type { CheckoutQuote, CheckoutRequest } from './quote';
import styles from './checkout.module.css';
import FulfillmentChoice from '@/components/FulfillmentChoice';
import {
  deliveryFallback,
  type FulfillmentMethod,
} from '@/services/fulfillment';

export default function Checkout() {
  const [items, setItems] = useState<CheckoutRequest['items']>([]);
  const [ready, setReady] = useState(false);
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState('');
  const [method, setMethod] = useState<FulfillmentMethod>('shipping');
  const [areaConfirmed, setAreaConfirmed] = useState(false);
  useEffect(() => {
    setAttempt(crypto.randomUUID());
    const payment = new URLSearchParams(window.location.search).get('payment');
    if (payment === 'returned')
      setMessage(
        'This return link cannot verify your payment. Please contact order@doko-e.com if you need help confirming your order.',
      );
    if (payment === 'cancelled')
      setMessage('Payment was cancelled. Your basket is saved.');
    try {
      const selected =
        new URLSearchParams(window.location.search).get('fulfillment') ||
        localStorage.getItem('doko-fulfillment');
      setMethod(selected === 'delivery' ? 'delivery' : 'shipping');
      const cart = JSON.parse(localStorage.getItem('doko-basket') || '{}');
      if (cart && typeof cart === 'object' && !Array.isArray(cart))
        setItems(
          Object.entries(cart).map(([product_id, quantity]) => ({
            product_id,
            quantity: Number(quantity),
          })),
        );
    } catch {
      setError(
        'Your saved basket could not be loaded. Return to the store to update it.',
      );
    }
    setReady(true);
  }, []);
  async function submit(payment = false) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(
        payment ? '/api/checkout/payment' : '/api/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            customer,
            attempt,
            fulfillment_method: method,
            delivery_area_confirmed: areaConfirmed,
          }),
        },
      );
      const data = (await response.json()) as {
        quote?: CheckoutQuote;
        error?: string;
        status?: string;
        message?: string;
        checkout_url?: string;
      };
      if (data.status === 'not_configured') {
        if (data.quote) setQuote(data.quote);
        setMessage(data.message || 'Payment is not connected.');
        return;
      }
      if (!response.ok || !data.quote)
        throw Error(data.error || 'Checkout is temporarily unavailable.');
      setQuote(data.quote);
      if (payment && data.checkout_url)
        window.location.assign(data.checkout_url);
    } catch (e) {
      setQuote(null);
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={styles.checkout}>
      <header className={styles.header}>
        <BrandLogo />
        <a href="/">← Back to the store</a>
      </header>
      <p className="eyebrow">Your Doko basket</p>
      <h1>Checkout</h1>
      <p className={styles.notice}>
        Review your basket, then complete secure payment on Stripe.
      </p>
      {!ready ? (
        <p role="status">Loading your basket…</p>
      ) : !items.length ? (
        <p>
          Your basket is empty. <a href="/#shop">Shop the pantry →</a>
        </p>
      ) : (
        <div className={styles.columns}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <h2>
              {method === 'delivery'
                ? 'Contact & delivery address'
                : 'Contact & shipping address'}
            </h2>
            <FulfillmentChoice
              value={method}
              onChange={(v) => {
                setMethod(v);
                setQuote(null);
                setAreaConfirmed(false);
                try {
                  localStorage.setItem('doko-fulfillment', v);
                } catch {}
              }}
            />
            {method === 'delivery' && (
              <p>{quote?.delivery_instructions || deliveryFallback}</p>
            )}
            <fieldset disabled={busy} className={styles.fields}>
              {(
                ['name', 'email', 'address', 'city', 'state', 'zip'] as const
              ).map((key) => (
                <label key={key}>
                  {
                    {
                      name: 'Full name',
                      email: 'Email address',
                      address: 'Street address and apartment',
                      city: 'City',
                      state: 'State (two-letter code)',
                      zip: 'ZIP code',
                    }[key]
                  }
                  <input
                    required
                    value={customer[key]}
                    type={key === 'email' ? 'email' : 'text'}
                    autoComplete={
                      {
                        name: 'name',
                        email: 'email',
                        address: 'street-address',
                        city: 'address-level2',
                        state: 'address-level1',
                        zip: 'postal-code',
                      }[key]
                    }
                    maxLength={key === 'state' ? 2 : key === 'zip' ? 10 : 200}
                    pattern={
                      key === 'state'
                        ? '[A-Za-z]{2}'
                        : key === 'zip'
                          ? '[0-9]{5}(-[0-9]{4})?'
                          : undefined
                    }
                    onChange={(e) => {
                      setCustomer({
                        ...customer,
                        [key]:
                          key === 'state'
                            ? e.target.value.toUpperCase()
                            : e.target.value,
                      });
                      setQuote(null);
                      setAreaConfirmed(false);
                      setMessage('');
                    }}
                  />
                </label>
              ))}
              <label>
                Country
                <input value="United States" readOnly />
              </label>
            </fieldset>
            {method === 'delivery' && (
              <label style={{ display: 'flex', gap: 10, margin: '16px 0' }}>
                <input
                  type="checkbox"
                  required
                  checked={areaConfirmed}
                  onChange={(e) => {
                    setAreaConfirmed(e.target.checked);
                    setQuote(null);
                  }}
                />
                My delivery address is in the Greater Boston area.
              </label>
            )}
            <button className="primary-button" disabled={busy}>
              {busy ? 'Checking…' : 'Review checkout'}
            </button>
          </form>
          <section className={styles.summary} aria-label="Order summary">
            <h2>Order summary</h2>
            {quote ? (
              <>
                <ul>
                  {quote.items.map((item) => (
                    <li key={item.product_id}>
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <strong>${item.line_total.toFixed(2)}</strong>
                    </li>
                  ))}
                </ul>
                <dl>
                  <div>
                    <dt>Subtotal</dt>
                    <dd>${quote.subtotal.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>{method === 'delivery' ? 'Delivery' : 'Shipping'}</dt>
                    <dd>
                      {quote.shipping === 0 ? 'Free' : 'Calculated on Stripe'}
                    </dd>
                  </div>
                  <div>
                    <dt>Tax</dt>
                    <dd>Calculated on Stripe</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>Confirmed on Stripe before payment</dd>
                  </div>
                </dl>
                <p>
                  Stripe will confirm your delivery address, shipping, taxes,
                  and final total before you pay.
                </p>
                <p className={styles.salesFinal}>
                  All sales are final. Please review your basket and shipping
                  details before continuing.
                </p>
                <button
                  type="button"
                  className="primary-button"
                  disabled={busy}
                  onClick={() => void submit(true)}
                >
                  {busy ? 'Checking…' : 'Continue to payment'}
                </button>
              </>
            ) : (
              <p>
                Enter your contact and U.S. shipping details to check current
                prices, stock, and shipping eligibility.
              </p>
            )}
          </section>
        </div>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className={styles.notice}>
          {message}
        </p>
      )}
    </main>
  );
}

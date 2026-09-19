'use client';
import { useEffect, useState } from 'react';
import {
  Check,
  Package,
  Truck,
  House,
  Clock3,
  ShieldAlert,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { completeOrderBasket } from '@/modules/cart/completeOrder';
import type { ConfirmationResult, Receipt } from './order';
import styles from './confirmation.module.css';
const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    n,
  );
export function PaidReceipt({ order: o }: { order: Receipt }) {
  return (
    <>
      <section className={styles.intro}>
        <span className={styles.successIcon}>
          <Check size={34} aria-hidden="true" />
        </span>
        <p className={styles.eyebrow}>Payment Successful</p>
        <h1>Thank You for Your Order</h1>
        <h2 lang="ne">धन्यवाद!</h2>
        <p>
          Your payment was successful, and we’ve received your order. We’ll now
          prepare your items for{' '}
          {o.fulfillment_method === 'delivery'
            ? 'Greater Boston delivery'
            : 'shipment'}
          .
        </p>
        <p lang="ne" className={styles.nepali}>
          नेपालसँगको आत्मीयता तपाईंको घरसम्म पुर्‍याउन पाउँदा हामीलाई गर्व र खुसी लागेको छ।
        </p>
      </section>
      <div className={styles.columns}>
        <div>
          <section className={styles.card}>
            <h2>Order details</h2>
            <dl className={styles.details}>
              <div>
                <dt>Order Number</dt>
                <dd>{o.order_number}</dd>
              </div>
              <div>
                <dt>Order Date</dt>
                <dd>
                  {o.order_date
                    ? new Intl.DateTimeFormat('en-US', {
                        dateStyle: 'long',
                        timeStyle: 'short',
                      }).format(new Date(o.order_date))
                    : 'Not recorded'}
                </dd>
              </div>
              <div>
                <dt>Payment Status</dt>
                <dd className={styles.paid}>{o.payment_status}</dd>
              </div>
              <div>
                <dt>Order Status</dt>
                <dd>{o.order_status}</dd>
              </div>
              <div>
                <dt>Customer Email</dt>
                <dd>{o.email}</dd>
              </div>
              <div>
                <dt>
                  {o.fulfillment_method === 'delivery'
                    ? 'Delivery Address'
                    : 'Shipping Address'}
                </dt>
                <dd>
                  <address>
                    {o.address.map((line, i) => (
                      <span key={i}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </address>
                </dd>
              </div>
            </dl>
          </section>
          <section className={styles.card}>
            <h2>Items ordered</h2>
            <ul className={styles.items}>
              {o.items.map((i, index) => (
                <li key={i.product_id + index}>
                  <div className={styles.image}>
                    {i.image_url ? (
                      <img
                        src={i.image_url}
                        alt={i.name}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Package aria-label="Product image unavailable" />
                    )}
                  </div>
                  <div>
                    <h3>{i.name}</h3>
                    <p>
                      Quantity: {i.quantity} · Unit price: {usd(i.unit_price)}
                    </p>
                  </div>
                  <strong>{usd(i.line_total)}</strong>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className={styles.card}>
          <h2>Payment summary</h2>
          <dl className={styles.summary}>
            <div>
              <dt>Subtotal</dt>
              <dd>{usd(o.subtotal)}</dd>
            </div>
            <div>
              <dt>
                {o.fulfillment_method === 'delivery' ? 'Delivery' : 'Shipping'}
              </dt>
              <dd>{usd(o.shipping)}</dd>
            </div>
            <div>
              <dt>Tax</dt>
              <dd>{o.tax_included ? 'Included' : usd(o.tax)}</dd>
            </div>
            {o.discount > 0 && (
              <div>
                <dt>Discount</dt>
                <dd>−{usd(o.discount)}</dd>
              </div>
            )}
            <div className={styles.total}>
              <dt>Total Paid</dt>
              <dd>{usd(o.total)}</dd>
            </div>
          </dl>
          {o.tax_included && (
            <p className={styles.small}>
              Tax is included in product prices. Any separately applicable
              shipping charges are shown above.
            </p>
          )}
          {o.mixed_tax && (
            <p className={styles.small}>
              Some product prices include tax. Total Paid is the final amount
              confirmed by Stripe.
            </p>
          )}
          <p className={styles.small}>Secure payment confirmed by Stripe.</p>
        </aside>
      </div>
      <section className={styles.card}>
        <h2>What happens next</h2>
        <ol className={styles.steps}>
          {[
            { name: 'Order received', icon: Check },
            { name: 'Preparing your Doko', icon: Package },
            {
              name:
                o.fulfillment_method === 'delivery'
                  ? 'Delivery confirmation sent'
                  : 'Shipping confirmation sent',
              icon: Truck,
            },
            { name: 'Delivered to your door', icon: House },
          ].map((s, i) => (
            <li key={s.name} className={i === 0 ? styles.current : ''}>
              <span>
                <s.icon size={21} aria-hidden="true" />
              </span>
              <strong>
                {i + 1}. {s.name}
              </strong>
              <small>{i === 0 ? 'Confirmed' : 'Next step'}</small>
            </li>
          ))}
        </ol>
        <p>
          {o.fulfillment_method === 'delivery'
            ? 'We’ll contact you by email to coordinate your Greater Boston delivery.'
            : 'Once your order ships, we’ll send tracking information to your email when available.'}
        </p>
      </section>
      <section className={styles.email}>
        <h2>Email confirmation</h2>
        {o.email_sent ? (
          <>
            <p>
              A confirmation email has been sent to {o.email} with your order
              details.
            </p>
            <p>
              If you don’t see it within a few minutes, please check your spam
              or promotions folder.
            </p>
          </>
        ) : (
          <p>
            Your order is confirmed. We can’t confirm that an order email has
            been sent yet. Please save your order number or contact us for a
            copy of your order details.
          </p>
        )}
      </section>
      {o.festival && (
        <section className={styles.festival}>
          <h2>A note for your celebration</h2>
          <p>
            Festival orders are prepared with care and shipped according to the
            delivery schedule shown at checkout. Please order early to allow
            sufficient time for delivery before the festival.
          </p>
        </section>
      )}
    </>
  );
}
export default function Confirmation() {
  const [result, setResult] = useState<ConfirmationResult | null>(null),
    [attempt, setAttempt] = useState(0),
    [exhausted, setExhausted] = useState(false);
  useEffect(() => {
    let stopped = false,
      timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    let count = 0;
    setResult(null);
    setExhausted(false);
    const id = new URLSearchParams(window.location.search).get('session_id');
    if (!id) {
      setResult({ state: 'unverified' });
      return;
    }
    async function check() {
      try {
        const response = await fetch(
          `/api/checkout/confirmation?session_id=${encodeURIComponent(id!)}`,
          { cache: 'no-store', signal: controller.signal },
        );
        const data = (await response.json()) as ConfirmationResult;
        if (stopped) return;
        if (!response.ok) {
          setResult({ state: 'unverified' });
          return;
        }
        if (data.state === 'paid') {
          try { completeOrderBasket(localStorage, id!, data); } catch {
            // Storage restrictions must never hide a verified payment receipt.
          }
        }
        setResult(data);
        if (data.state === 'processing') {
          if (++count < 20) timer = setTimeout(check, 3000);
          else setExhausted(true);
        }
      } catch {
        if (!stopped) setResult({ state: 'unverified' });
      }
    }
    void check();
    return () => {
      stopped = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [attempt]);
  const processing = !result || result.state === 'processing';
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <BrandLogo />
          <a href="/">Doko · A little bit of Nepal</a>
        </header>
        {result?.state === 'paid' ? (
          <PaidReceipt order={result.order} />
        ) : (
          <section
            className={`${styles.card} ${styles.state}`}
            aria-live="polite"
          >
            <span className={styles.stateIcon}>
              {processing ? <Clock3 size={36} /> : <ShieldAlert size={36} />}
            </span>
            <h1>
              {processing
                ? 'Payment Processing'
                : result?.state === 'failed'
                  ? 'Payment Not Completed'
                  : 'Payment Could Not Be Verified'}
            </h1>
            <p>
              {processing
                ? 'We’re waiting for Stripe to confirm your payment. This page will update when confirmation arrives.'
                : result?.state === 'failed'
                  ? 'This checkout expired or the payment did not complete. No paid confirmation is available.'
                  : 'We couldn’t securely verify this order. Return using the same browser you used at checkout, or contact us for help.'}
            </p>
            {exhausted && (
              <p>
                Confirmation is taking longer than expected. Please check again
                shortly. Do not pay again while your payment may still be
                processing.
              </p>
            )}
            {(!processing || exhausted) && (
              <button
                className={styles.primary}
                onClick={() => setAttempt((n) => n + 1)}
              >
                Check again
              </button>
            )}
          </section>
        )}
        <section className={styles.support}>
          <h2>Questions about your order?</h2>
          <p>
            Contact us at <a href="mailto:order@doko-e.com">order@doko-e.com</a>{' '}
            and include your order number so we can assist you quickly.
          </p>
        </section>
        <nav className={styles.actions} aria-label="Continue shopping">
          <a className={styles.primary} href="/#shop">
            Continue Shopping
          </a>
          <a className={styles.secondary} href="/">
            Return to Home
          </a>
        </nav>
        <footer className={styles.footer}>
          Closer to culture. Closer to home.
        </footer>
      </div>
    </main>
  );
}

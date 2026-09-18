# Post-payment confirmation

## Files changed

- `modules/confirmation/Confirmation.tsx` and `confirmation.module.css`: responsive paid, processing and verification-error states; reusable `PaidReceipt` component.
- `modules/confirmation/access.ts`: signed, expiring HttpOnly receipt access cookie bound to the Stripe session.
- `modules/confirmation/order.ts`: server-record validation and public receipt projection.
- `app/checkout/confirmation/page.tsx`: no-index, no-referrer confirmation page.
- `app/api/checkout/confirmation/route.ts`: private/no-store order status endpoint; requires the matching browser cookie.
- `modules/checkout/handler.ts`: snapshots creation date/order status and sets receipt cookie when starting Checkout.
- `modules/checkout/payment.ts`: success URL uses Stripe's `{CHECKOUT_SESSION_ID}` placeholder.
- `modules/checkout/quote.ts`: snapshots product images and seasonal occasion.
- `modules/checkout/paymentEvents.ts` and `app/api/checkout/webhook/route.ts`: paid/failure/expiry events, actual discount/totals, session/date/address snapshots, terminal paid-state protection.
- `modules/checkout/Checkout.tsx`: old return links no longer imply receipt/payment confirmation.
- `tests/confirmation.test.ts`, `scripts/test-checkout.mjs`: verification and event tests.

## Verification and privacy

The session ID in the URL is only an opaque lookup identifier. It grants no access by itself and never supplies totals or payment status. A signed cookie, valid for seven days and scoped to the confirmation API, proves the request comes from the browser that created that Stripe session. It uses the existing server-side Stripe secret key for a domain-separated HMAC. Rotating this key invalidates previous receipt cookies; support can look up the order in Admin.

The API only reads `checkout_orders`. It never sets an order to paid or trusts a browser success flag. It requires paid status and a valid Stripe-paid monetary snapshot written by the signed webhook. While pending, the page polls every three seconds for up to one minute, then offers a manual retry. Invalid/missing proof, unknown records, incomplete snapshots, errors, failed payments and expired sessions do not display the success page. The basket is preserved rather than clearing potentially newer items.

No new secrets or database migration are needed. Existing completed orders retain their records, but old Stripe sessions without a receipt cookie cannot open the new private receipt. New checkout sessions use the new success route automatically. Creation dates/images/occasion are snapshotted on new orders; historical values are not invented.

## Webhook configuration

Keep the existing signed endpoint at `https://doko-e.com/api/checkout/webhook` with API version `2025-02-24.acacia` and these events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed` (add for failure state)
- `checkout.session.expired` (add for expiry state)

Until failure/expiry subscriptions are added, unpaid orders safely stay Processing. A delayed failure cannot overwrite an already paid order. Duplicate paid events are idempotent. Stored snapshots include the session ID, event timestamp, original session creation time, tax, shipping, discount, subtotal, paid total and Stripe-confirmed contact/delivery details.

## Displayed fields

Order number, order date, payment/order status, email, delivery address, image/name/quantity/unit price/line total, advertised subtotal, shipping, tax, discount if present and actual total paid. Inclusive product tax is labeled Included; mixed treatments are explained. Festival notices use saved seasonal metadata or Dashain/Tihar names. Only Order received is marked complete; later steps are upcoming rather than fabricated tracking updates.

## Email limitation

The Resend integration is documented in `modules/email/README.md`. The 'A confirmation email has been sent…' copy renders only after the provider accepts the message and the server stores `confirmation_email_sent_at`. Sending is disabled until the Site email settings are configured. Sandbox emails go to a test sink and do not set the customer sent marker. Provider acceptance is not proof of inbox delivery.

## Testing

Run `node scripts/test-checkout.mjs`. Covers valid/tampered/expired/session-mismatched receipt proof, pending/failed/malformed records, authoritative monetary details, inclusive tax, festival flags, conditional email copy and webhook event transitions. Production currently uses live Stripe credentials: do not submit a real payment to test the UI.

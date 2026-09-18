# Order confirmation email (Resend)

Sending is disabled until the following **hosted Site environment values** are configured and deployed:

- `RESEND_API_KEY`: Resend sending API key (Secret ON).
- `ORDER_EMAIL_FROM`: `Doko <order@doko-e.com>` (a verified Resend sending domain is required).
- `ORDER_EMAIL_ENABLED`: `true`. Leave `false` during account setup.

Use https://resend.com/domains to add `doko-e.com`. Add the exact sending DNS records Resend supplies, including its DKIM and return-path records. Preserve existing root MX records and Gmail forwarding. Do not enable Resend receiving or replace the root MX records. Create the key at https://resend.com/api-keys. Local `.env` values alone do not configure the hosted Site. Never put API keys in `db/env.d.ts`, client code or source control.

The signed Stripe webhook first persists paid status, then awaits Resend acceptance. Email uses the verified server receipt with items, amounts, address, fulfillment instructions, festival notice and reply-to `order@doko-e.com`. No browser redirect sends email. Failed/processing payments do not send. Live sessions send to the order email; `cs_test_` sessions always use Resend's `delivered@resend.dev` sink and never claim the customer received an email.

The existing order JSON stores an immutable email payload, a 60-second lease, first-attempt time, provider ID and acceptance timestamp. No migration is needed. Retries reuse an order-specific Resend idempotency key. Permanent sent markers prevent replays. Provider timeout/failure returns a webhook error so Stripe can retry while the order remains paid. No raw provider response or customer data is logged.

Resend deduplicates keys for 24 hours. Unconfirmed attempts older than 23 hours stop for manual review instead of risking a duplicate. Check Resend email logs before manually resolving an uncertain send. Admin Orders displays whether an email was accepted, is a sandbox test, is unconfirmed or was never attempted. A successful API response means accepted for sending, not proof of inbox delivery; inspect Resend for bounces/delivery.

Enable only after setup. Older events acknowledged while disabled are not automatically backfilled. To test after activation, complete a Stripe sandbox checkout and inspect Resend's test-sink email and Admin Orders. Existing Stripe webhook event subscriptions remain unchanged. Replaying a paid event is safe within the documented retry window. Automated tests mock Resend and exercise real SQLite JSON lease/deduplication queries; they do not send email.

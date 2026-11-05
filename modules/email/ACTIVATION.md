# Doko-e order confirmation email activation

Prepared November 5, 2026. Production remains unchanged. This checklist is not activation approval.

## Current production and independent activation

Existing project: `appgprj_6a9e2af8114c8191aeaf4b100ee7aa0a`, live at https://doko-e.com.
Saved version 33: `appgprj_6a9e2af8114c8191aeaf4b100ee7aa0a~appgver_530b969168488191a6510acb6a07c852`.
Source: `682e3b880b66c4b6553411ff033e191f5d289503`. Its saved build archive exists.

The email service, webhook route, payment-event mapper and receipt builder in this local branch are identical to version 33. Email functionality can be activated using that existing production source, independently of the uncommitted Collections release. No new email table, collection migration, source merge or new source version is needed for the existing sending functionality.

Environment changes are not live until a saved version is deployed with the new environment revision. Therefore this is an environment update plus an explicitly approved redeployment of saved version 33, not a deployment of this dirty local branch. Do not rebuild/package/publish the working tree for an environment-only activation. Confirm the hosted migration plan is unchanged and historical migrations are not scheduled for replay before redeployment.

Read-only runtime inspection still reports environment revision 20, with existing masked admin and Stripe entries. All three email entries are absent. No values were exposed or changed. Sending is currently disabled.

## Required values

| Variable | Intended value | Handling |
| --- | --- | --- |
| RESEND_API_KEY | Resend sending key authorized for the verified sender domain | Secret ON; never paste into source, report, logs or public chat |
| ORDER_EMAIL_FROM | `Doko <order@doko-e.com>` | Valid friendly sender syntax; address/domain must be authorized by Resend |
| ORDER_EMAIL_ENABLED | `true` for activation; `false` while disabled | Case-sensitive string; only trimmed `true` enables the service |

The sender shown above is the documented proposed sender, NOT a verified current production value. `reply_to` is already supported and fixed to `order@doko-e.com` in the payload; there is no separate reply-to environment variable. Confirm that inbox is monitored and receives replies. Merely setting a From header does not establish domain authorization or receiving-mail setup.

Resend documents the friendly-name format, email fields and idempotency header in its [Send Email API](https://resend.com/docs/api-reference/emails/send-email). Its [idempotency documentation](https://resend.com/changelog/idempotency-keys) specifies a 24-hour deduplication window and stable request payload requirements.

## PASS / FAIL report

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Required environment names identified | PASS | EmailConfig, Cloudflare Env declaration and .env.example agree on the three names |
| Production activation values present | FAIL — activation blocker | All three entries absent from current Sites runtime |
| Signed successful payment required | PASS | Webhook validates raw-body signature and timestamp before parsing; paid completed/async-success event and matching stored order/session are required |
| Unpaid/failed/expired/canceled payments | PASS | Unpaid completion and failed/expired events do not invoke sending; canceled/non-paid order states cannot pass paid-receipt verification; cancel-page visits are not send triggers |
| Customer recipient | PASS | Verified Stripe customer_details.email wins, then the saved order customer email; sandbox sessions override recipient to delivered@resend.dev |
| Receipt fields | PASS | Tests verify order number, saved product names, quantities, unit/line prices, subtotal, address, shipping, discount and Stripe paid total; existing confirmation/tax tests cover tax presentation |
| Duplicate/retry protection | PASS within documented contract | Stable stored payload, order-specific idempotency key, 60-second concurrent lease and permanent accepted markers; unconfirmed attempts stop for manual review after 23 hours |
| Email failure preserves payment | PASS | Paid status is committed before email; provider failure yields webhook 500 but order stays paid; test verifies retry and delayed expiry cannot reverse payment |
| Customer data in error messages | PASS | Generic errors; raw provider body, request payload, recipient and customer address are not logged by application email code |
| Explicit application failure logging | FAIL — observability gap | No email-specific log or durable last-error category is emitted; generic HTTP 500 and absence of acceptance markers are insufficient to claim full failure logging |
| Template branding/wording | PASS by source review | Existing Doko storefront name, maroon/gold presentation, Nepali thanks, order support at order@doko-e.com, conditional delivery/shipping and festival wording; no templates changed |
| Sender syntax and reply-to | PASS for payload/schema | Sender and reply_to verified by tests; actual Resend sender authorization/inbox receiving not verified |
| Isolated controlled sandbox | PASS | Real Workers handler and isolated D1; synthetic signed cs_test event; all outbound requests intercepted; controlled sink delivered@resend.dev; no email or payment sent |
| Actual Resend account/domain/acceptance/delivery | FAIL — unverified | No Resend account connection/credentials were used; no network email or live payment authorized/performed |
| Independent existing-source activation | PASS in code | Deployed version 33 already contains the required email implementation; Sites environment application still requires approved redeployment |

Seven email tests passed. Full `node scripts/test-checkout.mjs` passed all 59 tests. `node scripts/test-email-sandbox.mjs` passed the isolated Workers/D1 webhook test. `npx.cmd tsc --noEmit` and `git diff --check` passed. Runtime email code/templates were not changed, so a repeat production build was not necessary for these test/documentation-only additions; the existing feature candidate build passed in the preceding release-blocker review.

The Workers sandbox uses a synthetic webhook secret and fake provider key. It intercepts all outbound provider traffic, asserts the exact Resend endpoint and sandbox recipient, simulates failure then acceptance, and verifies repeat/retry behavior. This validates the integration contract, not Resend DNS verification, account permissions, provider inbox delivery, Stripe dashboard subscriptions or production networking.

## Payment, receipt and retry behavior

- Only `/api/checkout/webhook` calls the sending service for a paid mapped event. A browser redirect/receipt-page refresh cannot send email.
- Accepted success types are checkout.session.completed and checkout.session.async_payment_succeeded, requiring payment_status=paid, USD, complete non-negative integer amounts and stored order/session matching. Signature verification uses the raw body with timestamp tolerance. Stripe's [post-payment guidance](https://docs.stripe.com/payments/existing-customers?platform=web&ui=stripe-hosted) supports server-side completion and asynchronous-success events.
- Item descriptions/prices/quantities are from the saved server quote rather than the current product catalog or browser. Shipping/tax/discount/total use the verified payment snapshot. The total charged is not reconstructed from client inputs.
- Human order numbers use DOKO- plus the first twelve uppercase order-ID characters. Saved order date/status are included where available. HTML escapes dynamic content; a plain-text alternative is supplied.
- Live cs_live sessions use the order recipient. Every cs_test session is forcibly routed to delivered@resend.dev and marked as sandbox; it never claims delivery to the customer.
- The stable provider key is doko-order/<order-id>. A permanent confirmation_email_sent_at or confirmation_email_test_sent_at marker blocks later duplicate requests. The stored confirmation_email_payload remains identical across retries even if order data changes.
- A provider error, missing acceptance ID or timeout never reverses paid status. It triggers webhook retry with generic errors. Concurrent attempts are leased; ambiguous attempts older than 23 hours require manual review before Resend's deduplication window expires. Do not clear markers/change keys casually or promise unconditional exactly-once delivery.
- Provider acceptance is not inbox delivery. Post-acceptance bounce/suppression/delay is not tracked through a Resend delivery webhook by this application. Authorized staff must inspect Resend delivery events. Do not retry accepted email solely because a customer reports it missing without checking provider status.
- Events previously acknowledged while sending was disabled are not automatically backfilled. Before enabling, inspect any pending/retrying paid events: enabling can cause eligible retries to send. A historical backfill needs its own reviewed scope and approval.

## Failure logging action before approval

The currently deployed flow safely avoids leaking customer data but does NOT implement explicit email-failure logging. Do not label that requirement PASS based only on HTTP 500 responses. Choose a reviewable remedy before activation approval:

1. Prefer an email-only patch based on version 33 that records a fixed, non-sensitive failure category and retryable/manual-review outcome. Never log raw provider error/body, API key, email payload, address or customer identifiers. Test it, then seek separate approval for that small source deployment.
2. If activating existing source unchanged, explicitly accept the current observability limit and document an operational procedure using webhook failure status, Admin Orders acceptance indicators and authorized Resend logs. Resend logs may contain customer data and require appropriately restricted access.

This review deliberately added tests/documentation only; it did not silently change the deployed sending behavior. No claim is made that production platform logging retention/access or Resend delivery monitoring has been verified.

## Activation checklist — only after explicit approval

### Prerequisites

- [ ] Resolve/accept the explicit failure-logging gap above.
- [ ] Verify doko-e.com as a sending domain in the authorized Resend account. Confirm DKIM/SPF records supplied by Resend; preserve existing website DNS, MX and receiving/forwarding setup.
- [ ] Verify order@doko-e.com accepts replies and is monitored. Confirm the business wants the existing Doko subject/template and current delivery/festival promises.
- [ ] Have an authorized operator provide a sending-scoped key securely to Sites settings; no secrets in this repository/report.
- [ ] Confirm the current Stripe webhook points to the existing endpoint, is subscribed to completion/async-success and relevant failure/expiry events, and uses the matching live/test webhook secret. This review did not inspect or alter Stripe dashboard settings.
- [ ] Record current environment revision, live saved version and code rollback target; review pending webhook retries/historical orders to avoid unplanned sends.
- [ ] Approve any real Resend test separately with a named test destination and synthetic content. The isolated test already passed without delivery.

### Add runtime variables to the EXISTING Doko Site

1. Open Doko's ChatGPT Sites project settings for project appgprj_6a9e2af8114c8191aeaf4b100ee7aa0a. Open its runtime environment variables. This is NOT storefront Admin → Site Settings; editing .env.example or hosting.json cannot activate production mail. UI labels may vary; no claim is made that the current settings screen was inspected.
2. Add RESEND_API_KEY with Secret ON. Add ORDER_EMAIL_FROM as `Doko <order@doko-e.com>`. Add ORDER_EMAIL_ENABLED as `false` during provider setup or `true` only for the separately approved activation. Store all entries as secrets if Sites geographic restrictions require it.
3. Preserve all existing ADMIN_* and STRIPE_* values and DB/domain/access settings. Save the environment revision and verify key presence using masked settings.
4. The exact supported connector equivalent is update_environment_variables with this project_id and set_values entries {key,value,is_secret}; omit remove. Only those three keys are changed. No call was executed.
5. Saving environment variables alone does not activate the running Worker. After deployment authorization, redeploy saved version 33 using deploy_site_version with its exact saved version ID above. This existing Site is public. Do not invoke source sync/build/save on the pending Collections branch.
6. Confirm deployment success and that its env_set_revision matches the intended saved environment revision. Confirm the source version remains 33 and no new collection migration is pending.

### Controlled acceptance and operational monitoring

- [ ] After separate authorization, validate through an isolated test environment using test Stripe events and the Resend test sink. Avoid sending Stripe test events into production: doing so would create/change production order data and needs its own approval.
- [ ] Verify the test payload recipient is delivered@resend.dev, sandbox subject/marker, correct order details and provider acceptance ID. Confirm duplicate replay does not send twice. The production code cannot route cs_test email to an arbitrary test mailbox without a source change.
- [ ] When authorized for live activation, use true and redeploy the approved saved source. This may immediately permit customer emails from eligible live webhook retries; do not perform this step as a harmless connectivity test.
- [ ] Monitor Stripe delivery status and Resend acceptance/delivery/bounce status with restricted access. Admin Orders shows whether acceptance was live, sandbox or unconfirmed. Missing acceptance after a paid order requires review; after 23 hours follow manual handling.
- [ ] Do not run a live payment or send a customer email as part of this preparation.

## Disable / rollback

After separate approval, set ORDER_EMAIL_ENABLED=false on the same project and redeploy the same approved version to apply that revision. This stops subsequent application sends but cannot recall an already accepted message or cancel one already in flight. Preserve order/payment state and acceptance/idempotency markers. Do not delete paid orders to retry email. No migration, collections rollback, key rotation or domain change is needed solely to disable this feature.

## Local changes and authority

Existing branch: feature/doko-collections. New isolated test runner: scripts/test-email-sandbox.mjs. Expanded tests: tests/email.test.ts. This checklist and README reference are local documentation. Previously pending storefront/release corrections remain untouched. No commit, push, merge, Sites save, secret update, publication, deployment, production database mutation, real email or payment was performed.

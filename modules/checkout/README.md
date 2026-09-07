# Checkout and placeholder payment API

`/checkout` reads the existing device-local basket. Contact/address fields stay in page memory; the APIs validate them but do not persist or log them. No card fields, orders, stock reservations or charges are created.

- `POST /api/checkout`: JSON `{items: [{product_id, quantity}], customer: {name, email, address, city, state, zip, country: "US"}}`. Returns `{quote}` using current database prices, availability and inventory. Invalid requests return 400; wrong origin returns 403.
- `POST /api/checkout/payment`: same body; revalidates the quote and returns HTTP 503 with `{status: "not_configured", provider: "placeholder", checkout_url: null, payment_processed: false, order_created: false, message, quote}`. The basket remains intact. This is intentionally not a successful payment response.

Replace `payment.ts` with a server-only provider adapter when ready. Placeholder secret names are `PAYMENT_SECRET_KEY` and `PAYMENT_WEBHOOK_SECRET`; no actual credentials or provider URLs are supplied. Merely adding secrets does not enable payment. The real integration must calculate shipping/tax, create an idempotent order/session, reserve inventory appropriately and verify signed webhooks before marking an order paid. Never accept client prices or expose secret keys to the browser.

Below the free-shipping threshold, shipping remains unknown; tax and final total also remain unknown until configured. This shipping checkout accepts nationwide items only; pickup/local-only items must be handled by a separate fulfillment flow.

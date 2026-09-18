# Basket checkout

The checkout button POSTs product IDs, quantities and contact details to `/api/checkout/payment`. The server rechecks current catalog prices, inventory and nationwide shipping eligibility before creating a Stripe hosted Checkout Session. The old fixed Payment Link is not used.

## Production setup (Sites environment variables)

- `STRIPE_SECRET_KEY`: Stripe secret API key, stored as a Secret.
- `STRIPE_WEBHOOK_SECRET`: signing secret for the webhook endpoint, stored as a Secret.
- `STRIPE_SHIPPING_RATE_ID`: a Stripe fixed shipping rate ID (`shr_...`) for baskets below the Site Settings free-shipping threshold. Use a USD rate from the same Stripe account and test/live mode as the API key. Above the threshold the server supplies a free shipping rate.

Configure Stripe Tax (business address and applicable registrations) because Checkout uses automatic tax. Keys and shipping rates must all use the same test/live mode. No publishable key is required for this server-created hosted Checkout flow.

Create a Stripe webhook destination at `https://doko-e.com/api/checkout/webhook` listening for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Use endpoint API version `2025-02-24.acacia`. Copy its signing secret into Sites and redeploy to apply the variables. Local `.env` files do not configure production.

## Order records and limits

D1 `checkout_orders` stores a pending snapshot and the Stripe session ID. Only a signed, recent webhook with `payment_status=paid` sets the record to paid. Repeated events are idempotent. Delivery details confirmed by Stripe are stored in `payment_data`; use those for fulfillment. A success redirect does not confirm payment and deliberately leaves the basket intact.

Inventory is checked when opening Checkout, but this module does not reserve or decrement stock, send order emails, or fulfill shipments. Review paid orders and inventory before fulfillment. Stripe receipts can be enabled in Stripe settings. Test with Stripe sandbox keys before accepting real payments.

## Delivery and shipping selection
The basket uses mutually exclusive Delivery/Shipping checkboxes. Delivery is Greater Boston only, with an address and service-area acknowledgment required at checkout. The server checks product eligibility and the enabled method. The service-area acknowledgment is not an automated geographic boundary check; staff must verify delivery addresses before dispatch. Admin > Site & shipping settings contains editable delivery instructions and the local_only enable toggle.

Delivery has a zero shipping charge. Nationwide shipping uses the configured Stripe shipping rate below the existing free-shipping threshold, and free shipping above it. Stripe calculates tax and shows the final charge before payment. The canonical quote snapshots the fulfillment method; the Stripe session metadata, Admin Orders and receipt identify it. Delivery and shipping both collect a destination address. The Stripe shipping-address form repeats the Greater Boston restriction for delivery; any address changed there must also be reviewed by staff.

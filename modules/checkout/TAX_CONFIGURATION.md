# Product and bundle tax configuration

## Files and architecture

- `models/Product.ts`: normal/bundle product, shared tax fields, central validation.
- `models/BundleComponent.ts`: reusable component and tax configuration types.
- `config/tax.ts`: extensible class registry, verified Stripe tax-code mappings, import/legacy defaults.
- `services/taxService.ts`: normalization, validation, integer-cent allocation totals, code resolution and tax-line grouping. No tax rates are calculated here.
- `services/repository.ts`: canonical product normalization and persistence.
- `services/sheets.ts`: tax-column parsing, validation and explicit fallback warnings.
- `admin/TaxFields.tsx`, `admin/BundleEditor.tsx`, `admin/ProductEditor.tsx`, `admin/SpecialsEditor.tsx`: reusable editors, components and live allocation totals.
- `admin/AdminDashboard.tsx`, `admin/SheetsImport.tsx`: tax table column, Orders tab and import warnings.
- `models/CheckoutOrder.ts`, `admin/OrdersView.tsx`, `app/api/admin/orders/route.ts`: authenticated, paginated order view and component snapshots.
- `app/api/admin/route.ts`: validates both manual and imported records; atomically saves featured product and special in the same database transaction.
- `modules/checkout/quote.ts`, `modules/checkout/payment.ts`: canonical catalog tax snapshots and Stripe line items.
- `app/api/checkout/webhook/route.ts`: Stripe-confirmed tax, shipping, subtotal, total and payment status.
- `drizzle/0003_product_tax_defaults.sql`: non-destructive legacy defaults.
- `tests/tax.test.ts`, `scripts/test-checkout.mjs`: tax, bundle, checkout and regression tests.

## New fields

Product: `taxable`, `tax_class`, optional `stripe_tax_code`, `tax_behavior`, `product_type` (`normal` or `bundle`), `components`.

BundleComponent: `name`, positive integer `quantity`, `allocated_price`, `taxable`, `tax_class`, optional `stripe_tax_code`, `tax_behavior`.

Allocated price is the TOTAL allocated value for the row in one bundle, already including that row's quantity. It is NOT a per-component unit price. Multiply the whole bundle by basket quantity. This lets three component units share a $10 allocation exactly without fractional-cent rounding.

Tax behavior supports `automatic`, `inclusive`, `exclusive`. Automatic resolves to exclusive for this USD-only store, matching Stripe's documented automatic behavior. Inclusive component prices keep their tax inside their allocated amount.

## Admin workflows

Normal products show tax fields in Add/Edit and the product table. Select Bundle to use component rows. Add, edit, remove or move rows; totals show selling price, allocated total, taxable portion, exempt portion and difference. Draft inactive bundles may have a mismatch; active bundles and checkout may not.

Featured Specials can select an existing product or create a new bundle product. Saving the embedded product editor saves the special and its referenced product together. The product is set to `bundle` and `featured=true`; no separate product copy is stored. The storefront still shows one catalog item. A special cannot be active unless its product is active and balanced.

Orders show advertised subtotal, configured taxable/exempt portions, Stripe-confirmed tax/shipping/total, payment status and session ID. Expand products to see purchase-time components and behaviors. Older orders show `Not recorded` for fields not captured at the time; no historical amounts are fabricated. Inclusive advertised subtotal already includes its tax, so do not add the displayed tax to that subtotal again.

## Tax semantics and Stripe assumptions

Taxable Yes means use Stripe's location-specific treatment, not force a positive tax. `exempt_food` with Yes maps to food for non-immediate consumption, allowing regional rules to apply. Taxable No forces the Stripe nontaxable code everywhere; the admin must confirm that exemption is appropriate. The class name alone does not override the taxable flag.

Mappings verified in https://docs.stripe.com/tax/tax-codes:
- Food for Non-Immediate Consumption: `txcd_40040000`
- General - Tangible Goods: `txcd_99999999`
- Clothing & Footwear: `txcd_30011000`
- Religious Books: `txcd_35010400`
- Nontaxable: `txcd_00000000`

An optional explicit Stripe code overrides the class mapping for taxable products. The local validator checks format; Stripe validates whether the chosen code exists. The merchant must choose the correct product classification. Class mappings/defaults can be extended in `config/tax.ts`.

Bundles group by tax code, class, behavior and taxable flag, so different taxable classes are not incorrectly collapsed into one code. Stripe names identify the bundle and its portions. Zero-value rows stay in the snapshot but do not generate a charge. Stripe allows 100 line items; larger expanded baskets receive a clear error.

`automatic_tax.enabled` remains true. The Stripe account needs Tax settings, business address, default classification and applicable registrations configured. No fixed tax amount is stored or calculated in Admin. Configure the existing runtime `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SHIPPING_RATE_ID` in matching test/live modes. No secrets belong in `.d.ts` files. Webhook destination: `https://doko-e.com/api/checkout/webhook`, API version `2025-02-24.acacia`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded`.

Checkout accepts product IDs, quantities and customer details only as inputs to a fresh server quote. Browser prices, tax flags, tax codes and allocations are ignored. The order snapshot includes resolved line items and immutable components. Signed paid webhooks store actual Stripe monetary amounts (integer cents) and cannot overwrite a different stored session.

## Migration and defaults

The deployment migration adds missing JSON fields without replacing explicit values or changing prices/stock: taxable Yes, class Other, empty custom code, automatic behavior, normal product, no components. The read-time normalizer provides the same compatibility fallback. These are provisional defaults requiring merchant review, not legal classifications inferred from names.

Existing featured records keep their current catalog item until edited. No component allocation can be safely inferred from text contents. Open each existing kit in Featured Specials, enter its actual components/allocations and save to convert it to a bundle. Existing historical orders are unchanged.

Sheets support optional `taxable`, `tax_class`, `stripe_tax_code`, `tax_behavior`; missing/blank fields apply `config/tax.ts` defaults and display warnings in preview. Invalid supplied values block import. Normal-product sheet imports cannot overwrite existing bundle records. Use Admin for bundles. Review preview defaults before updating old products because omitted optional values reset to defaults.

## Verification

Run `node scripts/test-checkout.mjs` and `npx tsc --noEmit` before deployment. Tests cover taxable/exempt normal products, mixed Dashain allocations, inclusive/exclusive behavior, mismatch, missing/invalid codes, forged browser fields, Stripe parameter generation, legacy defaults, import validation, line-item limits and existing store behavior.

Stock is checked when creating Checkout but is not reserved/decremented automatically. This change does not add fulfillment automation. No tax classification or real payment should be inferred from the test fixtures.

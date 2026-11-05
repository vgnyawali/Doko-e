# Add reusable collections, dynamic homepage promotions and compact purchase cards

The storefront gains admin-managed collection pages/navigation and purchasable collection highlights while preserving the existing seasonal Featured Products system. Shared header/navigation keeps the original logo and announcement bar, restores Home/Shop links, and adds published collections in admin-defined order.

## Changes

- Reusable /collections/[slug] pages with admin publication, navigation labels/order, existing-product assignment, content and slug redirects. Doko Specials has a compact title above its products.
- One Homepage Covers & Promotions carousel for regular covers and opted-in Flash Ads; scheduled eligibility, navigation/swipe, existing original-cover fallback and optional original alongside custom slides. Existing Flash Ads remain Popup by default.
- Separate legacy Featured Products manager, showcase, settings and configured promotional behavior preserved.
- Collection-specific highlights selected from assigned active products; compact static row becomes a purchasable carousel above the configured threshold.
- Shared compact product cards with quantity/Add to Basket and image zoom; Quick View removes duplicate weight and limits allergen disclosure to applicable food categories. Shared basket works across routes.
- Admin browser-title configuration and shared responsive storefront components.
- Migration 0007 adds only Collections/assignments/redirect tables and indexes; original migration SQL/journal entries remain unchanged. Existing products, order/customer snapshots, pricing/inventory, payments, specials/settings and Flash Ads are not replaced.

## Verification

- 59 domain/regression tests passed, including inventory/checkout/tax/payment signatures, receipts/orders, promotions and Collections migration preservation.
- Workers authentication and isolated Workers/D1 Collections API integration passed.
- Rendered fallback/custom/expired/optional-original and seasonal showcase checks passed.
- TypeScript and production client/server build passed.
- Browser checked navigation, basket quantity/subtotal, checkout entry, Doko Specials, Quick View and mobile widths at 390 × 844. Test basket quantity restored; no checkout submission/payment/email.
- Source scan found no matching credentials or tracked environment/state/customer-export files. Local SQL fixture excluded. Existing email runtime is unchanged; email test fixtures are synthetic and use mocked providers.

## Deployment prerequisites

DO NOT DEPLOY until a verified DB backup/restore procedure and authorized operator are recorded, the hosted migration plan proves only 0007 pending, and the saved environment is confirmed to preserve disabled email sending. Saved Sites revision 26 includes masked email values; deploying website code can apply them. Email activation is outside this PR's scope.

Publish only to existing Sites project appgprj_6a9e2af8114c8191aeaf4b100ee7aa0a and its existing DB binding/domain doko-e.com. Review the larger reconciled history when comparing against GitHub main; compare website behavior against deployed version 33 as well. Production collection/highlight/cover configuration must use existing production products, not a development DB import. See docs/PRODUCTION_LAUNCH.md.

After push/merge/source-sync approval, build/package the exact approved source, save a version of the existing Site, review it, then request explicit deployment/migration approval. No automatic email activation, production writes, push, merge or deployment is part of this preparation.

## Rollback

Redeploy saved version 33 on the same Site after approval, checking the environment revision again. Keep additive Collections tables; do not automatically reverse SQL. A failed deployment may have applied migrations. Database recovery requires the verified restore point and reconciliation of newer orders. Never restore the development database over production.

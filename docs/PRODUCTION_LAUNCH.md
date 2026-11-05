# Doko-e website production launch

Prepared November 5, 2026. Website release preparation only; email activation is a separate operation. No push, merge, publication, deployment, environment change or production database write is authorized by this document.

## Local candidate

Branch: feature/doko-collections. The release includes the prior d92e868e website work plus the restored original homepage fallback, separate Featured Products functionality, Shop navigation, and launch regression checks. Use the final branch HEAD returned by git rev-parse HEAD as the release SHA; d92e868e alone is superseded.

Retained separately, excluded from the website commit: modules/email/README.md and modules/email/ACTIVATION.md (earlier email-preparation documentation), plus data/local/doko-specials.sql (development-only SQL fixture). Tests use synthetic products, orders, credentials and intercepted provider calls; no real customer records are embedded. The unchanged runtime email service, Stripe handlers, order/receipt logic and admin credentials remain identical to live source 682e3b88.

## Functionality review

| Requirement | Result |
| --- | --- |
| Original logo, left header alignment | Existing /logo.png retained; shared header and responsive sizing |
| Blue announcement bar | Existing setting and shared styling retained; mobile browser check confirmed background |
| Home, Shop and dynamic collection navigation | Shop restored; published visible collections use configured labels/order; Doko Specials requires production creation/publication |
| Original homepage cover fallback | Existing image reused without upload; appears whenever no eligible custom slide remains; optional original alongside custom slides |
| Covers and Flash Ads | One scheduled carousel; regular covers and opted-in Slider/Both ads, order, arrows, dots, swipe, expiry checks; legacy ads remain popup-only |
| Featured Products | Separate existing manager, seasonal showcase, schedules and product-level promotion configuration restored |
| Collection highlights | Assignment-based selections, published/visible/active filtering, configurable threshold, purchasable compact row/carousel |
| Product cards and hover | Shared image/name/price/quantity/Add to Basket, clipped CSS image zoom and reduced-motion behavior; existing explicitly configured featured promotions remain supported |
| Quick View | Shared component, no repeated weight header; category-based food/allergen disclosure |
| Checkout and orders | Existing Stripe pricing, stock/fulfillment/tax checks, signed webhook/payment/order/receipt services preserved |

## Validation

- node scripts/test-checkout.mjs: 59 regression tests passed, covering basket, pricing, inventory, fulfillment, tax, signed payment verification, stored orders, promotions/schedules, disclosures, Collections and existing email regression behavior with mocks.
- node scripts/test-admin-auth.mjs: passed in isolated Workers runtime, including valid/invalid credentials and session configuration.
- node scripts/test-collections-runtime.mjs: passed against isolated Workers/D1, covering denied authorization/origin, create/save, draft/publication, multiple collections and ordering, hidden navigation/highlights, product assignments, validation, renamed-slug redirect and product preservation. The bundle substitutes synthetic authorization; real credential verification is covered separately.
- node scripts/test-release-render.mjs: passed rendered fallback/no active/one/multiple/expired/optional-original cover states and independent legacy seasonal showcase. Next Link is an anchor stub in the isolated renderer.
- npx.cmd tsc --noEmit: passed.
- npm.cmd run build: frontend and server stages passed. Existing Vinext static-analysis notice for checkout route classification is informational.
- Browser: Home/Shop/Doko Specials, quantity increase/Add to Basket, subtotal and checkout form entry passed; original basket quantity was restored. Doko Specials title and five assigned products rendered without its former large banner. Food Quick View opened/closed, showed applicable allergens and no duplicate weight header. Non-food disclosure behavior covered by regression tests.
- Mobile: homepage and collection checked at 390 × 844; document widths stayed within viewport. Default viewport restored.
- Source secret-pattern scan: no matching Stripe/Resend keys, webhook secrets, GitHub tokens or private-key blocks; no tracked environment/state/build/customer export files. This is not an audit of every historical Git object.
- git diff/check and commit whitespace checks must pass before commit completion.

Browser tests did not submit checkout, charge a card, send email, create a production order, or operate production admin. Isolated integration tests did not touch the user's development database. A live payment/admin smoke test requires its own approved procedure.

## Migration 0007

drizzle/0007_salty_vapor.sql creates only:
- catalog_collections (publication, navigation and collection JSON/content).
- catalog_collection_products (existing-product assignments/order/collection metadata).
- catalog_collection_redirects (old slugs).
- Their unique/navigation/order/redirect indexes and foreign keys.

It has no UPDATE/DELETE/DROP, no product/order/customer/payment/inventory alteration, and no data seed. Cascades remove assignment/redirect children when a collection is deleted; they do not delete products or orders. Isolated tests apply 0000–0006, populate every existing business table including customer snapshots, then apply 0007: all seven business tables remain byte-for-byte equal and foreign_key_check is empty.

All original 0000–0006 SQL files and journal entries match deployed source 682e3b88 (line-ending normalized). Only 0007 is appended. This proves source compatibility, not the state of the hosted migration ledger.

## Remaining production gates

1. Obtain a verified backup/export or D1 restore bookmark for the EXACT existing DB resource, with timestamp, retention and a named authorized restore operator. Test/document recovery. Current availability and permissions remain unverified. Restoring an earlier point may discard subsequent orders; retain/reconcile newer payment/order data before any restore.
2. Obtain the actual Sites applied-migration ledger and execution plan proving 0000–0006 are already applied and ONLY 0007 is pending. The exposed Sites database overview lists business tables, not the internal ledger; no ledger/plan tool is available. Never infer history solely from table existence or replay older migrations.
3. Resolve email environment coupling WITHOUT treating it as part of this release: latest saved Sites environment revision is 26 with masked RESEND_API_KEY, ORDER_EMAIL_FROM and ORDER_EMAIL_ENABLED. Its enabled value cannot be read. The last verified live deployment used revision 20. A new website deployment applies saved runtime settings, so it could unintentionally activate email. Before publishing, an authorized operator must confirm the effective flag will remain disabled, or establish a supported environment snapshot that preserves disabled behavior. Any required setting change needs separate approval. Do not activate email or silently alter the runtime email code/flag in this website release.
4. Reconfirm the existing Sites source repository/branch from its source workflow after push authorization. No source write credential has been obtained or source synchronization performed during launch preparation.
5. Prepare approved production collection/cover content as below. Local navigation, assignments/highlights and promotions do not transfer through source deployment.

## Existing production linkage

- GitHub origin: https://github.com/vgnyawali/Doko-e.git, public main verified at 8b98494121cf4554aa7ca9d708d4eb790e86054d.
- Existing Sites project: appgprj_6a9e2af8114c8191aeaf4b100ee7aa0a, public Doko, live https://doko-e.com, saved/live version 33.
- .openai/hosting.json retains that project, d1 DB and r2 null. Preserve the project, D1 resource, runtime admin/Stripe settings, audience and domain. The local all-zero placeholder D1 UUID is not a production resource.
- Live source: 682e3b880b66c4b6553411ff033e191f5d289503. GitHub main is the older safe branch; the feature already contains reconciled GitHub and Sites histories. The main comparison is broader than the website-only difference against live version 33.

## Production content runbook

After separately approved schema/application publication, open Admin → Menus & Collections → New collection. Use label/title Doko Specials and slug doko-specials, approved content and existing production product records. Save draft, set assignment order, select Feature on homepage, enable navigation and set navigation order; publish and reload to verify /collections/doko-specials. Draft/hidden collections do not contribute navigation/highlights. No local DB or SQL fixture import is needed.

Existing site_settings main causes initial seed setup to return early, so migration 0007 alone does not create Doko Specials on an established production DB. Explicit admin creation is required. Site Settings controls the highlights carousel threshold (default four) and optional inclusion of the original cover; fallback never requires an upload.

Homepage Covers & Promotions manages regular covers and existing/new Flash Ads, internal destinations, publication, priority/order, optional badges/CTA, dates and Slider/Popup/Both mode. Inputs follow the operator browser timezone and persist UTC. Confirm timezone/schedules and avoid Both unless intended. Existing ads default to Popup. Existing Featured Products schedules and data remain separate and unchanged. The original cover provides continuity while production custom content is configured.

## Publication procedure — approval required

1. Clear backup, ledger/only-0007, email-disabled and source-linkage gates; approve production content and rollback plan. Review the exact committed diff against both live source and main.
2. Obtain separate approval to push the feature branch to GitHub and create/review its PR. Merge into main only after separate merge approval. If merging changes the release SHA, build/review that exact SHA again. Do not rewrite remote history.
3. Reuse project appgprj_6a9e2af8114c8191aeaf4b100ee7aa0a. After source-write authorization, obtain the Sites source credential and verify its returned repository/branch; preserve all existing hosting fields. Work in a clean checkout of the approved release, excluding data/local, local environment files, work and SQLite state. GitHub origin and the Sites configured source remote are distinct targets.
4. Synchronize the exact reviewed source to the EXISTING Sites configured source branch using its source workflow. The helper can commit/push, so do not run its write phase without approval.
5. Build/package with the installed Sites build/source helpers from the exact pushed commit. Save a version with save_site_version(project_id, commit_sha, archive). commit_sha must match the configured source branch HEAD and the packaged build. Do not create another Site. Saving is not deployment.
6. Review the saved version metadata/artifact and local isolated preview. There is no established separate hosted staging URL; production deployments are not previews. Draft collection preview is not a separate application/database environment.
7. Obtain explicit publication AND migration approval. Deploy the approved saved version using deploy_site_version with this project/version ID; preserve access, domain and DB. Sites runs hosted migrations before uploading the Worker. Check the selected environment revision immediately before deployment and verify email remains disabled as approved.
8. Poll the returned deployment until terminal success. Confirm its source/version and env_set_revision, then check homepage, nav, default/custom covers, Flash Ads, seasonal features, product grid/highlights, basket, admin and existing orders. Follow the approved admin content runbook. Do not initiate live payment/email tests without separate approval.

## Rollback

Saved code rollback target: appgprj_6a9e2af8114c8191aeaf4b100ee7aa0a~appgver_530b969168488191a6510acb6a07c852 (version 33). Redeploy it on the same project only after approval; recheck the effective environment to avoid email activation during rollback as well.

Keep additive Collections tables after code rollback; old code can ignore them. A failed deployment may already have applied SQL. Inspect the ledger before retrying; do not drop new tables or replay old migrations automatically. Code rollback does not restore database contents or environment values. Database recovery needs the verified restore point/operator and explicit approval; account for orders received since that point.

## Release decision

Local website candidate passes the documented checks and is prepared for review/commit. Production publication remains blocked by backup/restore evidence, hosted migration plan, saved email-environment isolation, and final source/content coordination. No production action was taken.

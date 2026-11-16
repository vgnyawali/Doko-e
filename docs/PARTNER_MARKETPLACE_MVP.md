# Partner Marketplace Phase 1 MVP

The portal uses Sites authenticated-user identity and explicit D1 memberships. Doko administrator authentication remains separate. Every partner API query resolves the signed-in user to one active membership and includes `partner_id` in reads and writes.

## Workflow

1. Doko creates and activates an organization in Admin → Partner Management.
2. Doko invites a user by the exact email used for Sites sign-in.
3. On first `/partners` sign-in, the invitation is claimed and bound to the stable Sites user ID.
4. Partners create drafts or import a CSV, edit extracted fields, and submit for review.
5. Doko requests changes, rejects, or approves. Approval explicitly creates the canonical Product, sets Doko price/inventory/shipping/publication, and optionally assigns collections.
6. Decisions and material actions are recorded in `partner_audit_log`.

## File storage limitation

`.openai/hosting.json` currently has `r2: null`. Phase 1 therefore does not retain source catalogs. CSV content is size-limited, parsed in request memory, and only normalized draft records and import metadata are stored. PDF import is intentionally disabled. Product images use the existing compressed image-data pattern and are validated before saving.

Before enabling PDF/XLSX, provision a private R2 binding named `BUCKET`, upload through authenticated server routes with generated object keys, validate magic bytes and size, scan in quarantine, extract in an isolated service, retain only private objects, and issue short-lived authorized downloads. Never store source documents in public assets or D1 blobs.

## Deployment dependencies

- Apply generated migration 0008 to a development database first.
- Confirm Sites sign-in is available to partner users on the Site audience.
- Configure private R2 and scanning/extraction service before enabling PDF/XLSX retention.
- Use synthetic partners/products for tests. Do not point this branch at production before explicit approval.

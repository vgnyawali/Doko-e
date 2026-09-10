# Doko Nepali Market

A new React / TypeScript storefront inspired by the navy, crimson, pale-blue palette and spacious serif typography of doko-e.com. No existing site code was copied.

## Development

Run `npm install`, then `npm run dev`. Apply the generated SQL in `drizzle/` to the local D1 database before using the live catalog. `npm run build` creates the Cloudflare-compatible Worker; `npx tsc --noEmit` checks types; `node scripts/test.mjs` runs domain tests.

## Independent modules

- `models/`: Product, FeaturedSpecial, SiteSettings contracts.
- `components/`: ProductCard, QuantitySelector and accessible UI primitives.
- `modules/catalog/`: filtering and product grid.
- `modules/cart/`: pure quantity and subtotal logic; the visitor basket is device-local and reconciled against current inventory.
- `modules/specials/`: scheduled promotions referencing catalog products. Inclusive UTC end dates; mounted pages refresh scheduling every minute.
- `modules/storefront/`: homepage composition and quick view / basket panels.
- `services/`: D1 repository, shared validation, shipping eligibility, Sheets CSV import and server-side authorization.
- `admin/`: independent product editor, import preview, seasonal specials, shipping and site settings.
- `config/`: default settings and image configuration.
- `data/`: clearly identified sample inventory and promotion.
- `db/` and `drizzle/`: schema and generated migrations. Product IDs and SKUs are unique; special references cascade on deletion.

The API persists products, settings and promotions in D1. Storefront reads expose active products. Every admin request verifies a platform-authenticated identity against server-configured `ADMIN_EMAILS` or `ADMIN_USER_IDS`. Mutation requests also require same-origin headers. Runtime settings belong in the Sites environment, not the hosting manifest. `.env.example` documents local variables. The private deployment is configured for the Site owner only; changing site sharing does not grant admin access.

## Product import

Paste a public Google Sheets edit or published URL in Admin → Google Sheets import. Tab `gid` is preserved. Use model field names as headers; `Product ID` is accepted for `id`. Required fields: id, name, category, brand, package_size, price, image_url, inventory, sku. Use true/false or 1/0 for booleans. Public CSV must be under 2 MB, with at most 500 products. Invalid rows block the complete import. Matching IDs update records atomically; other IDs insert records. Imports replace the full model, so include optional columns to retain their current values. Duplicate SKUs are rejected by the database.

## Initial content and scope

Prices, inventory, brands, package contents and seasonal dates are illustrative starter data. Ingredient labels and allergens deliberately avoid unverified safety claims. Replace them with supplier information, product-specific photography, and your support email before selling. Photos are illustrative Unsplash images observed on the reference site; they do not certify package contents. All imagery is replaceable via the product and special editors.

Nationwide shipping is enabled; local-only and pickup-only are disabled by default. The basket supports quantities and subtotal, but this scope does not include payment processing, tax calculation, order creation, carrier rates or fulfillment. There is no live checkout.

## Password admin login

The `/admin` page supports a non-ChatGPT username and password when these Sites environment variables are configured: `ADMIN_LOGIN_USERNAME`, `ADMIN_LOGIN_PASSWORD_HASH`, and `ADMIN_SESSION_SECRET` (a random secret of at least 32 characters). Generate the password hash with `node scripts/hash-admin-password.mjs "your-password"`, then save the output as the password hash secret. Password login creates an eight-hour, signed, HTTP-only session cookie; credentials are never stored in D1. Leave these variables unset to keep ChatGPT-only access.

### Admin authentication diagnostics

Production authentication reads `env.ADMIN_LOGIN_USERNAME`, `env.ADMIN_LOGIN_PASSWORD_HASH`, and `env.ADMIN_SESSION_SECRET` from `cloudflare:workers` during each request. Local `.env` files do not configure the published Site. Set these three exact keys as Sites secrets, then deploy the updated build to apply the saved environment revision.

Configuration values have surrounding whitespace and a matching pair of outer single/double quotes removed; the entered password is never modified. The hash must be `pbkdf2$iterations$salt$digest`, with 100000–500000 iterations, a 16-byte salt and a 32-byte SHA-256 digest encoded as unpadded base64url. The generator uses 150000 iterations. The session secret must contain at least 32 characters after normalization.

Temporary `GET /api/admin/login` diagnostics return only `usernameConfigured`, `passwordHashConfigured`, `sessionSecretConfigured`, and `hashStartsWithPbkdf2`, with caching disabled. Login attempts log the same four booleans, without credentials or exception details. These booleans indicate presence/prefix, not credential correctness or minimum secret length. Remove the GET handler and diagnostic log after deployment troubleshooting is complete.

Run `node scripts/test-admin-auth.mjs` to test the server verifier in the Workers runtime with synthetic credentials. Missing or malformed configuration now returns HTTP 503 instead of an incorrect-password message.

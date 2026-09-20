# Doko promotions

Flash Ads and featured-image promotions are independent modules. Neither changes product prices, taxes, cart contents, shipping validation, Stripe requests or order processing.

## Configuration

Admin → Flash Ads manages `FlashAd` records: headline, description, image, optional CTA text/link, active state, start/end timestamps and priority. Create, edit, preview, deactivate/archive and delete are supported. Browser-local date/time inputs are converted to UTC. A higher priority wins; ties use newest server-owned creation time. Only inclusive start/end windows display.

Admin → Featured Products edits seasonal features with a Promotional Hover section. Featured catalog products also have the same section in their product editor. All six `hover_popup_*` fields are optional for backwards compatibility. A missing image or disabled checkbox preserves the ordinary image behavior. The existing Explore/details actions remain available. Product promotional fields are saved in existing product JSON; seasonal promotional fields in existing special JSON.

Images use the existing upload processor: JPG/PNG/WebP up to 10 MB input, rasterized/compressed to JPEG under 750 KB. Saved image data or external HTTPS URLs live in the server record. No new R2 bucket, image host, secrets or hard-coded campaign images are required. The server rejects unsupported data URLs, overlarge image values, executable CTA schemes and malformed timestamps. Content is rendered as text; a failed image falls back to the promotion title.

## Behavior

The homepage asynchronously fetches `/api/promotions`, which returns only the highest-priority eligible Flash Ad. It rechecks once per minute and closes expired content within a second. Dismissal (X, Escape, outside click or CTA) sets a session-only flag; configuration remains server-side. The accessible Base UI dialog traps focus and returns it on close. Promotions do not delay catalog rendering.

Featured images use a large, portaled hover card on fine-pointer screens at least 1024px wide; the pointer can enter the card and activate its CTA. Keyboard focus/click also opens the card. Smaller screens and coarse-pointer devices use tap-to-open modal dialogs. Promotional images load only when their content mounts, with reserved dimensions to avoid layout shift. Popups use Doko's colors and typography.

Subscribe to the `doko:promotion` window CustomEvent. `event.detail` contains `{ name, id }`, where name is `flash_ad_view`, `flash_ad_close`, `flash_ad_cta_click`, `featured_hover_view` or `featured_hover_cta_click`. No analytics provider or personal information is included. Admin previews do not emit storefront events.

## Deployment and checks

Migration `0006_deep_stellaris.sql` creates only `flash_ads(id, data)` in D1. Existing product/special JSON needs no backfill and old records default to disabled. The migration ships with the Site and is applied on deployment. No campaigns are created or activated automatically.

`node scripts/test-checkout.mjs` covers flash timing boundaries, priority/tie ordering, safe URLs/image sizes, persistence and creation-timestamp preservation, alongside existing checkout tests. Local popup fixtures are kept in ignored preview storage and never shipped as real ads.

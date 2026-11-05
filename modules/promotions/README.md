# Doko promotions

Homepage Covers, Flash Ads and featured-image promotions do not change product prices, taxes, cart contents, shipping validation, Stripe requests or order processing.

## Configuration

Admin → Homepage Covers & Promotions manages regular covers and Flash Ads in the existing `flash_ads` JSON table. Records include an optional headline, description, badge, CTA label/destination, published state, inclusive start/end timestamps, display order, and display mode. Browser-local date/time inputs are converted to UTC. Higher order values display first; ties use the newest server-owned creation time.

Legacy records normalize to `Flash Ad + Popup`, preserving their existing behavior. New Flash Ads can be Slider, Popup, or Both; regular covers are Slider-only. A record enters both surfaces only when the administrator explicitly chooses Both. No schema migration or record duplication is required.

Legacy seasonal and product promotional fields remain readable for backwards compatibility, but homepage product featuring is managed from Admin → Menus & Collections.

Images use the existing upload processor: JPG/PNG/WebP up to 10 MB input, rasterized/compressed to JPEG under 750 KB. Saved image data or external HTTPS URLs live in the server record. No new R2 bucket, image host, secrets or hard-coded campaign images are required. The server rejects unsupported data URLs, overlarge image values, executable CTA schemes and malformed timestamps. Content is rendered as text; a failed image falls back to the promotion title.

## Behavior

The homepage asynchronously fetches `/api/promotions`, which returns the highest-priority eligible popup and published slider records. The shared carousel combines active regular covers and opted-in Flash Ads, advances every five seconds, supports arrows, dots and swipe gestures, and re-evaluates schedules once per second. Broken images are removed from the rotation. When no slider record is active, the carousel is hidden.

Popup dismissal (X, Escape, outside click or CTA) sets a session-only flag; configuration remains server-side. The accessible Base UI dialog traps focus and returns it on close. Promotions do not delay catalog rendering.

Featured images use a large, portaled hover card on fine-pointer screens at least 1024px wide; the pointer can enter the card and activate its CTA. Keyboard focus/click also opens the card. Smaller screens and coarse-pointer devices use tap-to-open modal dialogs. Promotional images load only when their content mounts, with reserved dimensions to avoid layout shift. Popups use Doko's colors and typography.

Subscribe to the `doko:promotion` window CustomEvent. `event.detail` contains `{ name, id }`, where name is `flash_ad_view`, `flash_ad_close`, `flash_ad_cta_click`, `featured_hover_view` or `featured_hover_cta_click`. No analytics provider or personal information is included. Admin previews do not emit storefront events.

## Deployment and checks

Migration `0006_deep_stellaris.sql` creates only `flash_ads(id, data)` in D1. Existing product/special JSON needs no backfill and old records default to disabled. The migration ships with the Site and is applied on deployment. No campaigns are created or activated automatically.

`node scripts/test-checkout.mjs` covers slider/popup modes, legacy defaults, schedule boundaries, ordering, deduplication, safe URLs/images, persistence and creation-timestamp preservation alongside existing checkout tests. Local fixtures stay in ignored preview storage and never ship as real promotions.
# Clickable Flash Ads

`click_url` is an optional, server-validated internal path saved in the existing flash_ads JSON record; no database migration is needed. Configure it in Homepage Covers & Promotions → Destination URL. Existing records without it remain supported.

The card uses the site router through Next Link (Enter and Space supported). Its close button is a sibling, stops propagation, and only dismisses the modal. A card click dismisses it for the session and emits `flash_ad_click` with `id` and `destination_url`; views and closes retain their existing events. When a card destination is set, the separate legacy CTA is hidden to prevent nested or conflicting links. Featured hover links are unchanged.

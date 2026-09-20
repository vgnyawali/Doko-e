export interface PromotionalHover {
  hover_popup_enabled?: boolean;
  hover_popup_image_url?: string;
  hover_popup_title?: string;
  hover_popup_description?: string;
  hover_popup_cta_text?: string;
  hover_popup_cta_url?: string;
}
export interface FlashAd {
  id: string;
  title: string;
  description: string;
  image_url: string;
  click_url?: string;
  cta_text: string;
  cta_url: string;
  active: boolean;
  start_at: string;
  end_at: string;
  priority: number;
  created_at: string;
  updated_at: string;
}
// Root-relative destinations only; reject encoded slashes/control characters too.
export function safeFlashDestination(value: string) {
  if (!value || value.length > 500) return false;
  try {
    const decoded = decodeURIComponent(value);
    return /^\/(?!\/)/.test(decoded) && !/[\\\s\u0000-\u001f\u007f]/.test(decoded);
  } catch {
    return false;
  }
}
export function safePromoLink(value: string) {
  if (!value) return true;
  if (/^\/(?!\/)/.test(value) && !/[\\\s]/.test(value)) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password;
  } catch {
    return false;
  }
}
export function validPromoImage(value: string) {
  if (typeof value !== 'string' || !value || value.length > 1_000_000)
    return false;
  if (/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/]+=*$/.test(value))
    return true;
  return value.startsWith('https://') && safePromoLink(value);
}
export function validateHover(p: PromotionalHover): string[] {
  const errors: string[] = [];
  if (
    p.hover_popup_enabled !== undefined &&
    typeof p.hover_popup_enabled !== 'boolean'
  )
    errors.push('Invalid hover popup setting');
  if (p.hover_popup_image_url && !validPromoImage(p.hover_popup_image_url))
    errors.push('Use a valid HTTPS image or a supported upload under 750 KB');
  for (const k of [
    'hover_popup_title',
    'hover_popup_description',
    'hover_popup_cta_text',
    'hover_popup_cta_url',
  ] as const)
    if (
      p[k] !== undefined &&
      (typeof p[k] !== 'string' ||
        p[k]!.length > (k === 'hover_popup_description' ? 1000 : 500))
    )
      errors.push(`Invalid ${k}`);
  if (p.hover_popup_cta_url && !safePromoLink(p.hover_popup_cta_url))
    errors.push('CTA link must use HTTPS or a site path');
  return errors;
}
export function validateFlashAd(a: FlashAd) {
  const errors: string[] = [];
  if (!a || typeof a !== 'object') return ['Invalid ad'];
  for (const [key, max] of [
    ['id', 100],
    ['title', 200],
    ['description', 1000],
    ['cta_text', 100],
    ['cta_url', 500],
  ] as const)
    if (
      typeof a[key] !== 'string' ||
      a[key].length > max ||
      (['id', 'title'].includes(key) && !a[key].trim())
    )
      errors.push(`Invalid ${key}`);
  if (!validPromoImage(a.image_url))
    errors.push('A valid HTTPS image or supported upload is required');
  if (
    typeof a.active !== 'boolean' ||
    !Number.isSafeInteger(a.priority) ||
    a.priority < 0
  )
    errors.push('Invalid active setting or priority');
  if (
    !Number.isFinite(Date.parse(a.start_at)) ||
    !Number.isFinite(Date.parse(a.end_at)) ||
    Date.parse(a.end_at) < Date.parse(a.start_at)
  )
    errors.push('Choose a valid start and end time');
  if (a.cta_url && !safePromoLink(a.cta_url))
    errors.push('CTA link must use HTTPS or a site path');
  if (a.click_url !== undefined && (typeof a.click_url !== 'string' || (a.click_url.trim() && !safeFlashDestination(a.click_url.trim()))))
    errors.push('Click Destination must be an internal page path, such as / or /#featured-products');
  if (a.cta_text && !a.cta_url && !a.click_url) errors.push('Add a link for the CTA button');
  return errors;
}
export function activeFlashAd(ads: FlashAd[], now = Date.now()) {
  return (
    ads
      .filter(
        (a) =>
          a.active &&
          Date.parse(a.start_at) <= now &&
          now <= Date.parse(a.end_at),
      )
      .sort(
        (a, b) =>
          b.priority - a.priority ||
          Date.parse(b.created_at) - Date.parse(a.created_at) ||
          a.id.localeCompare(b.id),
      )[0] || null
  );
}

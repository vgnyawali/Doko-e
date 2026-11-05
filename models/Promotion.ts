export interface PromotionalHover {
  hover_popup_enabled?: boolean;
  hover_popup_image_url?: string;
  hover_popup_title?: string;
  hover_popup_description?: string;
  hover_popup_cta_text?: string;
  hover_popup_cta_url?: string;
}
export const homepageSlideTypes = ['cover', 'flash'] as const;
export type HomepageSlideType = (typeof homepageSlideTypes)[number];
export const flashDisplayModes = ['slider', 'popup', 'both'] as const;
export type FlashDisplayMode = (typeof flashDisplayModes)[number];
export interface FlashAd {
  id: string;
  slide_type?: HomepageSlideType;
  display_mode?: FlashDisplayMode;
  badge_text?: string;
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
export type HomepageSlide = FlashAd & {
  slide_type: HomepageSlideType;
  display_mode: FlashDisplayMode;
  badge_text: string;
};

export function normalizeHomepageSlide(value: FlashAd): HomepageSlide {
  const slideType = homepageSlideTypes.includes(
    value.slide_type as HomepageSlideType,
  )
    ? (value.slide_type as HomepageSlideType)
    : 'flash';
  const displayMode =
    slideType === 'cover'
      ? 'slider'
      : flashDisplayModes.includes(value.display_mode as FlashDisplayMode)
        ? (value.display_mode as FlashDisplayMode)
        : 'popup';
  return {
    ...value,
    slide_type: slideType,
    display_mode: displayMode,
    badge_text: typeof value.badge_text === 'string' ? value.badge_text : '',
    click_url: typeof value.click_url === 'string' ? value.click_url : '',
  };
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
      (key === 'id' && !a[key].trim())
    )
      errors.push(`Invalid ${key}`);
  if (
    a.slide_type !== undefined &&
    !homepageSlideTypes.includes(a.slide_type)
  )
    errors.push('Choose a valid slide type');
  if (
    a.display_mode !== undefined &&
    !flashDisplayModes.includes(a.display_mode)
  )
    errors.push('Choose a valid display mode');
  const slide = normalizeHomepageSlide(a);
  if (
    typeof slide.badge_text !== 'string' ||
    slide.badge_text.length > 80
  )
    errors.push('Invalid badge text');
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
      .map(normalizeHomepageSlide)
      .filter(
        (a) =>
          a.slide_type === 'flash' &&
          (a.display_mode === 'popup' || a.display_mode === 'both') &&
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

export function homepageSliderRecords(ads: FlashAd[]) {
  const unique = new Map<string, HomepageSlide>();
  for (const value of ads) {
    const slide = normalizeHomepageSlide(value);
    if (
      slide.active &&
      (slide.display_mode === 'slider' || slide.display_mode === 'both')
    )
      unique.set(slide.id, slide);
  }
  return [...unique.values()];
}

export function activeHomepageSlides(ads: FlashAd[], now = Date.now()) {
  return homepageSliderRecords(ads)
    .filter(
      (slide) =>
        Date.parse(slide.start_at) <= now && now <= Date.parse(slide.end_at),
    )
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        Date.parse(b.created_at) - Date.parse(a.created_at) ||
        a.id.localeCompare(b.id),
    );
}

export function homepageSlideDestination(slide: FlashAd) {
  const destination = slide.click_url?.trim() || slide.cta_url.trim();
  return destination && safePromoLink(destination) ? destination : '';
}

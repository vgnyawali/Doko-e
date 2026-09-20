export type PromotionEvent =
  | 'flash_ad_view'
  | 'flash_ad_close'
  | 'flash_ad_cta_click'
  | 'featured_hover_view'
  | 'featured_hover_cta_click';
// Subscribe to this event to attach analytics; no provider or customer data required.
export function promotionEvent(name: PromotionEvent, id: string) {
  window.dispatchEvent(
    new CustomEvent('doko:promotion', { detail: { name, id } }),
  );
}

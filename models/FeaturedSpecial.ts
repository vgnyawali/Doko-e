export interface FeaturedSpecial {
  id: string;
  product_id: string;
  occasion: string;
  headline: string;
  description: string;
  hero_image: string;
  start_date: string;
  end_date: string;
  priority: number;
  active: boolean;
}
// End dates are inclusive UTC calendar dates, independent of visitor timezone.
export function isSpecialCurrent(s: FeaturedSpecial, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return s.active && s.start_date <= today && s.end_date >= today;
}

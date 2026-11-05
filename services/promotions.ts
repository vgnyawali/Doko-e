import {
  activeFlashAd,
  homepageSliderRecords,
  normalizeHomepageSlide,
  validateFlashAd,
  type FlashAd,
} from '@/models/Promotion';
export async function readFlashAds(db: D1Database) {
  const result = await db
    .prepare('SELECT data FROM flash_ads')
    .all<{ data: string }>();
  return result.results.map((r) =>
    normalizeHomepageSlide(JSON.parse(r.data) as FlashAd),
  );
}
export async function readActiveFlashAd(db: D1Database) {
  return activeFlashAd(await readFlashAds(db));
}
export async function readHomepageSliderRecords(db: D1Database) {
  return homepageSliderRecords(await readFlashAds(db));
}
export async function saveFlashAd(db: D1Database, value: FlashAd) {
  const errors = validateFlashAd(value);
  if (errors.length) throw Error(errors.join(' · '));
  const old = await db
    .prepare('SELECT data FROM flash_ads WHERE id = ?')
    .bind(value.id)
    .first<{ data: string }>();
  const now = new Date().toISOString();
  // Server owns timestamps; whitelist fields instead of storing arbitrary JSON.
  const normalized = normalizeHomepageSlide(value);
  const ad: FlashAd = {
    id: value.id,
    slide_type: normalized.slide_type,
    display_mode: normalized.display_mode,
    badge_text: normalized.badge_text.trim(),
    title: value.title.trim(),
    description: value.description.trim(),
    image_url: value.image_url,
    click_url: value.click_url?.trim() || '',
    cta_text: value.cta_text.trim(),
    cta_url: value.cta_url.trim(),
    active: value.active,
    start_at: new Date(value.start_at).toISOString(),
    end_at: new Date(value.end_at).toISOString(),
    priority: value.priority,
    created_at: old ? JSON.parse(old.data).created_at : now,
    updated_at: now,
  };
  await db
    .prepare(
      'INSERT INTO flash_ads (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',
    )
    .bind(ad.id, JSON.stringify(ad))
    .run();
  return ad;
}

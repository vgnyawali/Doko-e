import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {
  activeFlashAd,
  activeHomepageSlides,
  homepageRotation,
  homepageSliderRecords,
  normalizeHomepageSlide,
  validateFlashAd,
  validateHover,
  validPromoImage,
  safePromoLink,
  safeFlashDestination,
  type FlashAd,
} from '@/models/Promotion';
import { saveFlashAd, readFlashAds } from '@/services/promotions';
const ad: FlashAd = {
  id: 'one',
  title: 'Kit offer',
  description: 'Festival essentials',
  image_url: 'https://example.com/kit.jpg',
  cta_text: 'Shop the kit',
  cta_url: '/#shop',
  active: true,
  start_at: '2026-09-20T00:00:00Z',
  end_at: '2026-09-21T00:00:00Z',
  priority: 1,
  created_at: '2026-09-19T00:00:00Z',
  updated_at: '',
};
test('original homepage cover is the fallback and optional companion across schedule changes', () => {
  const now = Date.parse(ad.start_at);
  const custom = { ...ad, slide_type: 'cover' as const, display_mode: 'slider' as const };
  assert.deepEqual(homepageRotation(activeHomepageSlides([], now)), [null]);
  assert.deepEqual(homepageRotation(activeHomepageSlides([{ ...custom, active: false }], now)), [null]);
  const one = activeHomepageSlides([custom], now);
  assert.deepEqual(homepageRotation(one).map((s) => s?.id ?? 'original'), ['one']);
  const two = activeHomepageSlides([custom, { ...custom, id: 'two', priority: 0 }], now);
  assert.deepEqual(homepageRotation(two).map((s) => s?.id ?? 'original'), ['one', 'two']);
  assert.deepEqual(homepageRotation(two, true).map((s) => s?.id ?? 'original'), ['original', 'one', 'two']);
  assert.deepEqual(homepageRotation(activeHomepageSlides([custom], Date.parse(ad.end_at) + 1)), [null]);
  assert.deepEqual(homepageRotation([], true), [null]);
});
test('flash destinations accept internal routes and reject external or disguised destinations', () => {
  for (const url of ['/', '/products/kit', '/specials/dashain', '/#featured-products']) {
    assert.equal(safeFlashDestination(url), true);
    assert.deepEqual(validateFlashAd({ ...ad, click_url: url, cta_text: '', cta_url: '' }), []);
  }
  for (const url of ['https://evil.example', '//evil.example', '/\\evil.example', '/%2fevil.example', '/%5cevil.example', '/%0aevil', 'javascript:alert(1)', '/%zz']) {
    assert.equal(safeFlashDestination(url), false);
    assert.ok(validateFlashAd({ ...ad, click_url: url }).length);
  }
  assert.deepEqual(validateFlashAd({ ...ad, click_url: '' }), []);
});
test('flash visibility is inclusive, inactive ads stay hidden, priority and newest break ties', () => {
  const now = Date.parse(ad.start_at);
  assert.equal(activeFlashAd([ad], now)?.id, 'one');
  assert.equal(activeFlashAd([ad], Date.parse(ad.end_at))?.id, 'one');
  assert.equal(activeFlashAd([ad], now - 1), null);
  assert.equal(activeFlashAd([ad], Date.parse(ad.end_at) + 1), null);
  assert.equal(activeFlashAd([{ ...ad, active: false }], now), null);
  const other = { ...ad, id: 'two', priority: 2 };
  assert.equal(activeFlashAd([ad, other], now)?.id, 'two');
  assert.equal(
    activeFlashAd(
      [ad, { ...other, priority: 1, created_at: '2026-09-19T01:00:00Z' }],
      now,
    )?.id,
    'two',
  );
});
test('homepage slider combines covers and opted-in flash ads without duplicates', () => {
  const now = Date.parse(ad.start_at);
  const cover: FlashAd = {
    ...ad,
    id: 'cover',
    slide_type: 'cover',
    display_mode: 'slider',
    title: '',
    priority: 5,
  };
  const sliderFlash: FlashAd = {
    ...ad,
    id: 'slider-flash',
    slide_type: 'flash',
    display_mode: 'slider',
    priority: 3,
  };
  const both: FlashAd = {
    ...ad,
    id: 'both',
    slide_type: 'flash',
    display_mode: 'both',
    priority: 1,
  };
  assert.deepEqual(
    activeHomepageSlides([both, sliderFlash, cover, cover], now).map((slide) => slide.id),
    ['cover', 'slider-flash', 'both'],
  );
  assert.equal(activeFlashAd([sliderFlash], now), null);
  assert.equal(activeFlashAd([both], now)?.id, 'both');
  assert.deepEqual(homepageSliderRecords([{ ...cover, active: false }]), []);
});
test('legacy flash records remain popup-only and slider schedules expire automatically', () => {
  const legacy = normalizeHomepageSlide(ad);
  assert.equal(legacy.slide_type, 'flash');
  assert.equal(legacy.display_mode, 'popup');
  assert.deepEqual(activeHomepageSlides([ad], Date.parse(ad.start_at)), []);
  const slider = { ...ad, slide_type: 'flash' as const, display_mode: 'slider' as const };
  assert.equal(activeHomepageSlides([slider], Date.parse(ad.start_at))[0]?.id, 'one');
  assert.deepEqual(activeHomepageSlides([slider], Date.parse(ad.end_at) + 1), []);
});
test('promotion links and images reject executable protocols and unsupported or oversized uploads', () => {
  for (const link of [
    'javascript:alert(1)',
    '//evil.example',
    '/\\evil.example',
    'data:text/html,bad',
  ])
    assert.equal(safePromoLink(link), false);
  assert.equal(validPromoImage('data:image/svg+xml;base64,PHN2Zz4='), false);
  assert.equal(
    validPromoImage('data:image/jpeg;base64,' + 'a'.repeat(1000000)),
    false,
  );
  assert.equal(validPromoImage('https://example.com/image.jpg'), true);
  assert.equal(validateFlashAd(ad).length, 0);
  assert.ok(validateFlashAd({ ...ad, end_at: 'bad' }).length);
  assert.ok(validateFlashAd({ ...ad, cta_url: 'javascript:alert(1)' }).length);
  assert.deepEqual(validateHover({}), []);
  assert.deepEqual(
    validateHover({ hover_popup_enabled: true, hover_popup_image_url: '' }),
    [],
  );
  assert.ok(
    validateHover({ hover_popup_cta_url: 'javascript:alert(1)' }).length,
  );
});
test('flash ads persist and edits preserve server-owned creation time', async () => {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync('drizzle/0006_deep_stellaris.sql', 'utf8'));
  const db = {
    prepare(query: string) {
      return {
        async all() {
          return { results: sql.prepare(query).all() };
        },
        bind(...args: any[]) {
          return {
            async first() {
              return sql.prepare(query).get(...args) || null;
            },
            async run() {
              return sql.prepare(query).run(...args);
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  const first = await saveFlashAd(db, ad);
  assert.notEqual(first.created_at, ad.created_at);
  const second = await saveFlashAd(db, {
    ...ad,
    title: 'Updated',
    click_url: ' /#featured-products ',
    created_at: '1900-01-01',
  });
  assert.equal(second.created_at, first.created_at);
  assert.equal((await readFlashAds(db))[0].title, 'Updated');
  assert.equal((await readFlashAds(db))[0].click_url, '/#featured-products');
  sql.close();
});

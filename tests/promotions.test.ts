import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {
  activeFlashAd,
  validateFlashAd,
  validateHover,
  validPromoImage,
  safePromoLink,
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
    created_at: '1900-01-01',
  });
  assert.equal(second.created_at, first.created_at);
  assert.equal((await readFlashAds(db))[0].title, 'Updated');
  sql.close();
});

-- Local review fixture only. Production collection creation remains an explicit admin/deployment step.
INSERT OR IGNORE INTO catalog_collections (
  id,
  slug,
  status,
  navigation_visible,
  navigation_order,
  data,
  created_at,
  updated_at
) VALUES (
  'doko-specials',
  'doko-specials',
  'draft',
  1,
  10,
  '{"id":"doko-specials","slug":"doko-specials","navigation_label":"Doko Specials","page_title":"Doko Specials","subtitle":"Thoughtfully designed. Inspired by Nepal.","description":"Discover unique products designed and curated by the Doko team. From personalized gifts and creative wooden crafts to culturally inspired products, Doko Specials celebrates creativity, craftsmanship, and our connection to Nepali heritage.","banner_image_url":"","status":"draft","navigation_visible":true,"navigation_order":10,"seo_title":"Doko Specials","seo_description":"Discover unique products designed and curated by the Doko team, inspired by Nepali creativity, craftsmanship, and heritage.","created_at":"","updated_at":""}',
  datetime('now'),
  datetime('now')
);

-- Preserve all explicit classifications; only fill absent fields on legacy products.
UPDATE products SET data = json_insert(data,
 '$.taxable', json('true'),
 '$.tax_class', 'other',
 '$.stripe_tax_code', '',
 '$.tax_behavior', 'automatic',
 '$.product_type', 'normal',
 '$.components', json('[]'));

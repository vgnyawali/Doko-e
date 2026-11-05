import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasRelevantAllergenInformation,
  isFoodProduct,
} from '@/models/Product';

void test('food classification uses product category rather than product name', () => {
  for (const category of ['Pantry', 'Spices', 'Drinks', 'Food', 'Seasonal'])
    assert.equal(isFoodProduct({ category }), true);
  for (const category of [
    'Wooden Toys',
    'Keyrings',
    'Footwear',
    'Handcrafted Gifts',
    'Decorations',
    'Cultural Products',
    'Puja Accessories',
  ])
    assert.equal(isFoodProduct({ category }), false);
});

void test('allergen details require meaningful stored information', () => {
  assert.equal(hasRelevantAllergenInformation({ allergens: '' }), false);
  assert.equal(hasRelevantAllergenInformation({ allergens: 'Not applicable' }), false);
  assert.equal(hasRelevantAllergenInformation({ allergens: 'Contains peanuts.' }), true);
});

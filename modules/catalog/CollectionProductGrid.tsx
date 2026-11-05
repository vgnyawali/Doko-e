'use client';

import { useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import type { CollectionProduct } from '@/models/CatalogCollection';
import type { Product } from '@/models/Product';
import type { SiteSettings } from '@/models/SiteSettings';

type Sort = 'collection' | 'name' | 'price-low' | 'price-high';

export default function CollectionProductGrid({
  title,
  products,
  settings,
  onAdd,
  onView,
}: {
  title?: string;
  products: CollectionProduct[];
  settings: SiteSettings;
  onAdd: (product: Product, quantity: number) => void;
  onView: (product: Product) => void;
}) {
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState<Sort>('collection');
  const categories = ['All', ...new Set(products.map((product) => product.category))];
  const shown = useMemo(() => {
    const result = products.filter(
      (product) => category === 'All' || product.category === category,
    );
    return result.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'price-low') return a.price - b.price;
      if (sort === 'price-high') return b.price - a.price;
      return a.collection_display_order - b.collection_display_order;
    });
  }, [category, products, sort]);
  return (
    <section className="section catalog collection-catalog">
      {title && (
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.15, marginBottom: 20 }}>
          {title}
        </h1>
      )}
      <div className="filter-row">
        <div className="filters" aria-label="Product categories">
          {categories.map((value) => (
            <button
              key={value}
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <label className="collection-sort">
          Sort
          <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
            <option value="collection">Collection order</option>
            <option value="name">Name</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </label>
        <span>{shown.length} products</span>
      </div>
      <div className="product-grid">
        {shown.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            settings={settings}
            onAdd={onAdd}
            onView={onView}
          />
        ))}
      </div>
      {!products.length && (
        <div className="collection-empty">
          <h2>This collection is taking shape.</h2>
          <p>Products will appear here as they are added by the Doko team.</p>
        </div>
      )}
      {!!products.length && !shown.length && <p>No products match this category.</p>}
    </section>
  );
}

'use client';
import { useEffect, useState } from 'react';
import type { Product } from '@/models/Product';
import type { SiteSettings } from '@/models/SiteSettings';
import ProductCard from '@/components/ProductCard';
export default function ProductCatalog({
  products,
  settings,
  onAdd,
  onView,
}: {
  products: Product[];
  settings: SiteSettings;
  onAdd: (p: Product, n: number) => void;
  onView: (p: Product) => void;
}) {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  useEffect(() => {
    setSearch(new URLSearchParams(window.location.search).get('search')?.trim().toLowerCase() || '');
  }, []);
  const active = products
    .filter((p) => p.active)
    .sort((a, b) => a.display_order - b.display_order);
  const categories = ['All', ...new Set(active.map((p) => p.category))];
  const shown = active.filter((p) =>
    (category === 'All' || p.category === category) &&
    (!search || `${p.name} ${p.category} ${p.brand}`.toLowerCase().includes(search)),
  );
  return (
    <section id="shop" className="section catalog">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A pantry full of memories</p>
          <h2>Your everyday favorites.</h2>
        </div>
        <p>
          A little comfort. A little spice.
          <br />
          Everything that tastes like home.
        </p>
      </div>
      <div className="filter-row">
        <div className="filters" aria-label="Product categories">
          {categories.map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <span>{shown.length} products</span>
      </div>
      <div className="product-grid">
        {shown.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            settings={settings}
            onAdd={onAdd}
            onView={onView}
          />
        ))}
      </div>
      {!shown.length && <p>No products in this category yet.</p>}
    </section>
  );
}

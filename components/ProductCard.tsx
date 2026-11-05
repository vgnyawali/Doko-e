'use client';
import { useState } from 'react';
import type { Product } from '@/models/Product';
import type { SiteSettings } from '@/models/SiteSettings';
import QuantitySelector from './QuantitySelector';
import { canPurchase, shippingLabels } from '@/services/shipping';
export default function ProductCard({
  product: p,
  settings,
  onAdd,
  onView,
}: {
  product: Product;
  settings: SiteSettings;
  onAdd: (p: Product, n: number) => void;
  onView: (p: Product) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  return (
    <article className="product-card">
      <div className="product-photo">
        <button
          type="button"
          className="product-image-button"
          onClick={() => onView(p)}
          aria-label={`Quick view ${p.name}`}
        >
          <img src={p.image_url} alt={p.name} loading="lazy" />
        </button>
      </div>
      <button className="product-title" onClick={() => onView(p)}>
        {p.name}
      </button>
      <div className="price-row">
        <strong>${p.price.toFixed(2)}</strong>
        <QuantitySelector
          value={quantity}
          onChange={setQuantity}
          max={Math.max(1, p.inventory)}
          label={`${p.name} quantity`}
        />
      </div>
      <button
        className="add-button"
        disabled={!canPurchase(p, settings)}
        onClick={() => onAdd(p, quantity)}
      >
        {!p.inventory
          ? 'Out of stock'
          : canPurchase(p, settings)
            ? 'Add to Basket +'
            : shippingLabels[p.shipping_type]}
      </button>
    </article>
  );
}

'use client';
import { useState } from 'react';
import type { Product } from '@/models/Product';
import type { SiteSettings } from '@/models/SiteSettings';
import QuantitySelector from './QuantitySelector';
import ProductImageZoom from './ProductImageZoom';
import FeaturedHover from '@/modules/promotions/FeaturedHover';
import { canPurchase, shippingLabels } from '@/services/shipping';
export function ProductDetails({ product: p }: { product: Product }) {
  return (
    <dl className="product-details">
      {[
        ['Contents', p.contents],
        ['Ingredients', p.ingredients],
        ['Brand', p.brand],
        ['Allergens', p.allergens],
      ].map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v || 'Not provided'}</dd>
        </div>
      ))}
    </dl>
  );
}
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
        {p.featured && p.hover_popup_enabled && p.hover_popup_image_url ? <FeaturedHover config={p} id={p.id} title={p.name} className="image-button"><img src={p.image_url} alt={p.name} loading="lazy" /><span className="view-hint">View promotion ↗</span></FeaturedHover> : <>
        <ProductImageZoom src={p.image_url} name={p.name}
          className="image-button"
        >
          <img src={p.image_url} alt={p.name} loading="lazy" />
        </ProductImageZoom>
        <div className="hover-details">
          <ProductDetails product={p} />
        </div>
        </>}
        {p.featured && <span className="product-badge">Doko favorite</span>}
        <div className="product-photo-actions">
          <ProductImageZoom src={p.image_url} name={p.name} />
          <button type="button" onClick={() => onView(p)} aria-label={`Quick view ${p.name}`}>Quick view ↗</button>
        </div>
      </div>
      <div className="product-meta">
        <span>{p.category}</span>
        <span lang="ne">{p.nepali_name}</span>
      </div>
      <button className="product-title" onClick={() => onView(p)}>
        {p.name}
      </button>
      <p className="product-brand">
        {p.brand} · {p.package_size}
      </p>
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
      <p className="shipping-label">{shippingLabels[p.shipping_type]}</p>
    </article>
  );
}

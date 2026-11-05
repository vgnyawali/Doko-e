'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import {
  featuredItemsUseCarousel,
  type HomepageCollectionFeature,
} from '@/models/CatalogCollection';
import type { Product } from '@/models/Product';
import type { SiteSettings } from '@/models/SiteSettings';

export default function FeaturedCollectionRow({
  features,
  carouselThreshold,
  settings,
  onAdd,
  onView,
}: {
  features: HomepageCollectionFeature[];
  carouselThreshold: number;
  settings: SiteSettings;
  onAdd: (product: Product, quantity: number) => void;
  onView: (product: Product) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const threshold = Math.max(1, carouselThreshold);
  const carousel = featuredItemsUseCarousel(features.length, threshold);

  function move(direction: number) {
    const element = track.current;
    if (!element) return;
    const maximum = element.scrollWidth - element.clientWidth;
    const atEnd = element.scrollLeft >= maximum - 4;
    const atStart = element.scrollLeft <= 4;
    if ((direction > 0 && atEnd) || (direction < 0 && atStart)) {
      element.scrollTo({ left: direction > 0 ? 0 : maximum, behavior: 'smooth' });
      return;
    }
    element.scrollBy({ left: direction * element.clientWidth * 0.85, behavior: 'smooth' });
  }

  useEffect(() => {
    if (!carousel || paused) return;
    const timer = window.setInterval(() => move(1), 5000);
    return () => window.clearInterval(timer);
  }, [carousel, paused]);

  if (!features.length) return null;
  return (
    <section
      className={`featured-collections${carousel ? ' is-carousel' : ''}`}
      aria-label="Featured products from Doko menus"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <style>{`
        .featured-collections { padding: 10px 5.5% 12px; border-bottom: 1px solid var(--border); background: #fff; }
        .featured-collections-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
        .featured-collections-heading .eyebrow { margin-bottom: 3px; }
        .featured-collections-heading h2 { font-size: clamp(20px, 2vw, 27px); line-height: 1.1; }
        .featured-collections-controls { display: flex; gap: 8px; }
        .featured-collections-controls button { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid var(--border); border-radius: 50%; background: #fff; color: var(--navy); }
        .featured-collections-track { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 230px)); gap: 16px; }
        .featured-collections.is-carousel .featured-collections-track { grid-auto-flow: column; grid-auto-columns: 230px; grid-template-columns: none; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
        .featured-collections.is-carousel .featured-collections-track::-webkit-scrollbar { display: none; }
        .featured-collection-card { min-width: 0; display: flex; flex-direction: column; padding: 8px; overflow: hidden; border: 1px solid var(--border); border-radius: 8px; background: #fff; scroll-snap-align: start; }
        .featured-collection-label { margin-bottom: 5px; color: var(--red); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .7px; }
        .featured-collection-card .product-card { flex: none; height: auto; }
        .featured-collection-card .product-photo { height: 80px; flex-shrink: 0; aspect-ratio: auto; }
        .featured-collection-card .product-title { min-height: 0; margin: 5px 0 4px; font-size: 15px; line-height: 1.2; }
        .featured-collection-card .price-row { gap: 6px; margin-top: 0; }
        .featured-collection-card .price-row strong { font-size: 15px; }
        .featured-collection-card .quantity { height: 29px; }
        .featured-collection-card .quantity button { width: 26px; height: 27px; }
        .featured-collection-card .quantity input { width: 25px; }
        .featured-collection-card .add-button { margin-top: 7px; padding: 7px 4px; font-size: 11px; }
        .featured-collection-link { margin-top: 7px; color: var(--red); font-size: 11px; font-weight: 700; }
        @media (max-width: 700px) {
          .featured-collections { padding: 10px 5% 12px; }
          .featured-collections-track,
          .featured-collections.is-carousel .featured-collections-track { display: grid; grid-auto-flow: column; grid-auto-columns: min(72%, 230px); grid-template-columns: none; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
        }
        @media (prefers-reduced-motion: reduce) { .featured-collection-card img { transition: none; } }
      `}</style>
      <div className="featured-collections-heading">
        <div>
          <p className="eyebrow">Featured from our menus</p>
          <h2>Discover something special.</h2>
        </div>
        {carousel && (
          <div className="featured-collections-controls">
            <button type="button" aria-label="Previous featured products" onClick={() => move(-1)}><ChevronLeft /></button>
            <button type="button" aria-label="Next featured products" onClick={() => move(1)}><ChevronRight /></button>
          </div>
        )}
      </div>
      <div className="featured-collections-track" ref={track}>
        {features.map((feature) => (
          <div className="featured-collection-card" key={`${feature.collection_id}-${feature.product.id}`}>
            <span className="featured-collection-label">{feature.collection_label}</span>
            <ProductCard
              product={feature.product}
              settings={settings}
              onAdd={onAdd}
              onView={onView}
            />
            <Link className="featured-collection-link" href={`/collections/${feature.collection_slug}`}>
              View {feature.collection_label} →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

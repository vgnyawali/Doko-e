'use client';
import { useEffect, useState } from 'react';
import {
  isSpecialCurrent,
  type FeaturedSpecial,
} from '@/models/FeaturedSpecial';
import type { Product } from '@/models/Product';
import FeaturedHover from '@/modules/promotions/FeaturedHover';
export default function FeaturedSpecials({
  specials,
  products,
  enabled,
  onView,
}: {
  specials: FeaturedSpecial[];
  products: Product[];
  enabled: boolean;
  onView: (p: Product) => void;
}) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  if (!enabled) return null;
  return (
    <>
      {specials
        .filter((s) => isSpecialCurrent(s, now))
        .sort((a, b) => b.priority - a.priority)
        .map((s) => {
          const p = products.find((p) => p.id === s.product_id && p.active);
          return p ? (
            <section className="special section" key={s.id} id="specials">
              <FeaturedHover config={s} id={s.id} title={s.headline} className="special-promotion-trigger"><div className="special-image">
                <img src={s.hero_image || p.image_url} alt={p.name} />
              </div></FeaturedHover>
              <div className="special-copy">
                <p className="eyebrow">
                  A season for togetherness · {s.occasion}
                </p>
                <h2>{s.headline}</h2>
                <p>{s.description}</p>
                <div className="special-bottom">
                  <div>
                    <strong>{p.name}</strong>
                    <span>
                      {' '}
                      {p.package_size} · ${p.price.toFixed(2)}
                    </span>
                  </div>
                  <button className="text-button" onClick={() => onView(p)}>
                    Explore the package <span>↗</span>
                  </button>
                </div>
              </div>
            </section>
          ) : null;
        })}
    </>
  );
}

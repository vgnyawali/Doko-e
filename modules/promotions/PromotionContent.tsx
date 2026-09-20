'use client';
import { useState } from 'react';
import { safePromoLink } from '@/models/Promotion';
export interface PromotionContentProps {
  image: string;
  title: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
  onCta?: () => void;
}
export default function PromotionContent(p: PromotionContentProps) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="promotion-content">
      {!failed ? (
        <img
          key={p.image}
          src={p.image}
          alt={p.title}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="promotion-image-fallback">
          {p.title || 'Doko special'}
        </div>
      )}
      <div className="promotion-copy">
        <h2>{p.title}</h2>
        {p.description && <p>{p.description}</p>}
        {p.ctaText && p.ctaUrl && safePromoLink(p.ctaUrl) && (
          <a className="primary-button" href={p.ctaUrl} onClick={p.onCta}>
            {p.ctaText}
          </a>
        )}
      </div>
    </div>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { activeFlashAd, type FlashAd } from '@/models/Promotion';
import PromotionModal from './PromotionModal';
import { promotionEvent } from './events';
const CLOSED = 'doko:flash_ad_closed_session';
let closedInMemory = false;
export default function FlashAdPopup() {
  const [ad, setAd] = useState<FlashAd | null>(null);
  const viewed = useRef('');
  useEffect(() => {
    let stopped = false;
    const controller = new AbortController();
    const load = async () => {
      try {
        if (closedInMemory || sessionStorage.getItem(CLOSED)) return;
        const response = await fetch('/api/promotions', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { ad: FlashAd | null };
        if (stopped || closedInMemory) return;
        setAd(data.ad ? activeFlashAd([data.ad]) : null);
      } catch {
        /* Promotions must not interrupt shopping. */
      }
    };
    void load();
    const timer = setInterval(load, 60000);
    return () => {
      stopped = true;
      controller.abort();
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!ad) return;
    if (viewed.current !== ad.id) {
      viewed.current = ad.id;
      promotionEvent('flash_ad_view', ad.id);
    }
    const timer = setInterval(() => {
      if (!activeFlashAd([ad])) setAd(null);
    }, 1000);
    return () => clearInterval(timer);
  }, [ad]);
  function close(trackClose = true) {
    closedInMemory = true;
    try {
      sessionStorage.setItem(CLOSED, 'true');
    } catch {}
    if (ad && trackClose) promotionEvent('flash_ad_close', ad.id);
    setAd(null);
  }
  if (!ad) return null;
  return (
    <PromotionModal
      key={ad.id}
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      image={ad.image_url}
      title={ad.title}
      description={ad.description}
      clickUrl={ad.click_url}
      onCardClick={() => {
        promotionEvent('flash_ad_click', ad.id, ad.click_url);
        close(false);
      }}
      ctaText={ad.cta_text}
      ctaUrl={ad.cta_url}
      onCta={() => {
        promotionEvent('flash_ad_cta_click', ad.id);
        close();
      }}
    />
  );
}

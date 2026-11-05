'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { defaultSettings } from '@/config/defaults';
import type { SiteSettings } from '@/models/SiteSettings';
import DefaultHomepageCover from './DefaultHomepageCover';
import {
  activeHomepageSlides,
  homepageSlideDestination,
  homepageRotation,
  type FlashAd,
  type HomepageSlide,
} from '@/models/Promotion';

function PromotionalCover({
  slide,
  onImageError,
}: {
  slide: HomepageSlide;
  onImageError: () => void;
}) {
  const destination = homepageSlideDestination(slide);
  const content = (
    <article className="homepage-promo-slide">
      <img
        src={slide.image_url}
        alt={slide.title || 'Doko homepage promotion'}
        onError={onImageError}
      />
      {(slide.badge_text || slide.title || slide.description || slide.cta_text) && (
        <div className="homepage-promo-copy">
          {slide.badge_text && <span>{slide.badge_text}</span>}
          {slide.title && <h1>{slide.title}</h1>}
          {slide.description && <p>{slide.description}</p>}
          {slide.cta_text && <strong>{slide.cta_text} <ArrowUpRight size={18} /></strong>}
        </div>
      )}
    </article>
  );
  if (!destination) return content;
  if (destination.startsWith('/')) {
    return (
      <Link
        className="homepage-slide-link"
        href={destination}
        aria-label={`Open ${slide.title || 'Doko promotion'}`}
      >
        {content}
      </Link>
    );
  }
  return (
    <a
      className="homepage-slide-link"
      href={destination}
      aria-label={`Open ${slide.title || 'Doko promotion'}`}
    >
      {content}
    </a>
  );
}

export default function HomepageCarousel({
  slides,
  settings = defaultSettings,
  preview = false,
}: {
  slides: FlashAd[];
  settings?: SiteSettings;
  preview?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const touchStart = useRef<number | null>(null);
  const active = useMemo(
    () => activeHomepageSlides(slides, now).filter((slide) => !failed.includes(slide.id)),
    [failed, now, slides],
  );
  const rotation = homepageRotation(active, settings.include_original_homepage_cover);
  const slideCount = rotation.length;
  const currentIndex = slideCount ? index % slideCount : 0;
  const current = rotation[currentIndex];

  useEffect(() => {
    if (preview) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [preview]);
  useEffect(() => {
    if (preview || paused || slideCount < 2) return;
    const timer = window.setInterval(
      () => setIndex((value) => (value + 1) % slideCount),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [paused, preview, slideCount]);

  function move(direction: number) {
    if (slideCount < 2) return;
    setIndex((value) => (value + direction + slideCount) % slideCount);
  }

  return (
    <section
      className="homepage-carousel"
      aria-roledescription="carousel"
      aria-label="Homepage covers and promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
        if (Math.abs(distance) > 40) move(distance > 0 ? -1 : 1);
        touchStart.current = null;
      }}
    >
      <div aria-live="polite" aria-atomic="true">
        {current ? <PromotionalCover
          key={current.id}
          slide={current}
          onImageError={() => setFailed((ids) => [...new Set([...ids, current.id])])}
        /> : <DefaultHomepageCover settings={settings} />}
      </div>
      {slideCount > 1 && (
        <>
          <button
            type="button"
            className="homepage-carousel-arrow previous"
            aria-label="Previous homepage slide"
            onClick={() => move(-1)}
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="homepage-carousel-arrow next"
            aria-label="Next homepage slide"
            onClick={() => move(1)}
          >
            <ChevronRight />
          </button>
          <div className="homepage-carousel-dots" aria-label="Choose homepage slide">
            {Array.from({ length: slideCount }, (_, slideIndex) => (
              <button
                key={rotation[slideIndex]?.id || 'original-cover'}
                type="button"
                aria-label={`Show slide ${slideIndex + 1}`}
                aria-current={slideIndex === currentIndex ? 'true' : undefined}
                onClick={() => setIndex(slideIndex)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

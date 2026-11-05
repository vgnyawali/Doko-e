'use client';
import { useEffect, useState, type ReactNode } from 'react';
import type { PromotionalHover } from '@/models/Promotion';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card';
import PromotionContent from './PromotionContent';
import PromotionModal from './PromotionModal';
import { promotionEvent } from './events';
export default function FeaturedHover({
  config,
  id,
  title,
  children,
  className,
}: {
  config: PromotionalHover;
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const [desktop, setDesktop] = useState(false),
    [open, setOpen] = useState(false);
  useEffect(() => {
    const query = matchMedia(
      '(min-width: 1024px) and (hover: hover) and (pointer: fine)',
    );
    const update = () => {
      setDesktop(query.matches);
      setOpen(false);
    };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const enabled =
    !!config.hover_popup_enabled && !!config.hover_popup_image_url;
  if (!enabled) return <>{children}</>;
  const content = {
    image: config.hover_popup_image_url!,
    title: config.hover_popup_title || title,
    description: config.hover_popup_description,
    ctaText: config.hover_popup_cta_text,
    ctaUrl: config.hover_popup_cta_url,
    onCta: () => promotionEvent('featured_hover_cta_click', id),
  };
  const change = (value: boolean) => {
    setOpen(value);
    if (value && !open) promotionEvent('featured_hover_view', id);
  };
  if (!desktop)
    return (
      <>
        <button
          type="button"
          className={`promotion-trigger ${className || ''}`}
          aria-label={`View ${title} promotion`}
          onClick={() => change(true)}
        >
          {children}
        </button>
        <PromotionModal open={open} onOpenChange={change} {...content} />
      </>
    );
  return (
    <HoverCard open={open} onOpenChange={change}>
      <HoverCardTrigger
        render={
          <button
            type="button"
            className={`promotion-trigger ${className || ''}`}
            aria-label={`View ${title} promotion`}
            onClick={() => change(!open)}
          />
        }
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="promotion-hover" side="right" sideOffset={8}>
        <PromotionContent {...content} />
      </HoverCardContent>
    </HoverCard>
  );
}

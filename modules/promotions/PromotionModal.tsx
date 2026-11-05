'use client';
import Link from 'next/link';
import { XIcon } from 'lucide-react';
import { safeFlashDestination } from '@/models/Promotion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import PromotionContent, {
  type PromotionContentProps,
} from './PromotionContent';
export default function PromotionModal({
  open,
  onOpenChange,
  clickUrl,
  onCardClick,
  ...content
}: PromotionContentProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clickUrl?: string;
  onCardClick?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="promotion-modal" showCloseButton={false}>
        <DialogTitle className="sr-only">
          {content.title || 'Doko promotion'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {content.description ||
            'Explore this Doko promotion. Close to return to shopping.'}
        </DialogDescription>
        {clickUrl && safeFlashDestination(clickUrl) ? (
          <Link href={clickUrl} className="promotion-card-link"
            aria-label={`Open ${content.title || 'Doko promotion'}`}
            onClick={onCardClick}
            onKeyDown={(event) => {
              if (event.key === ' ') {
                event.preventDefault();
                event.currentTarget.click();
              }
            }}>
            {/* A single link covers the image and copy, without nested CTA links. */}
            <PromotionContent {...content} ctaText={undefined} ctaUrl={undefined} />
          </Link>
        ) : <PromotionContent {...content} />}
        {/* Sibling of the card link so close can never activate its destination. */}
        <DialogClose className="absolute top-2 right-2 flex items-center justify-center"
          aria-label="Close" onClick={(event) => event.stopPropagation()}>
          <XIcon size={20} />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

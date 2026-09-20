'use client';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import PromotionContent, {
  type PromotionContentProps,
} from './PromotionContent';
export default function PromotionModal({
  open,
  onOpenChange,
  ...content
}: PromotionContentProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="promotion-modal">
        <DialogTitle className="sr-only">
          {content.title || 'Doko promotion'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {content.description ||
            'Explore this Doko promotion. Close to return to shopping.'}
        </DialogDescription>
        <PromotionContent {...content} />
      </DialogContent>
    </Dialog>
  );
}

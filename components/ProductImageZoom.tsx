'use client';
import { useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function ProductImageZoom({ src, name, className, children }: {
  src: string; name: string; className?: string; children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={className || 'product-zoom-link'}
      onClick={() => setOpen(true)} aria-label={`Enlarge ${name} picture`}>
      {children || 'Zoom picture ⤢'}
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="product-image-viewer">
        <DialogTitle>{name}</DialogTitle>
        <DialogDescription className="sr-only">Enlarged product picture. Press Escape or Close to return.</DialogDescription>
        <img src={src} alt={name} />
      </DialogContent>
    </Dialog>
  </>;
}

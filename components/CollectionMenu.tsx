'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Menu } from 'lucide-react';
import Link from 'next/link';
import type { PublicCollectionNavigation } from '@/models/CatalogCollection';

export default function CollectionMenu({
  collections,
}: {
  collections: PublicCollectionNavigation[];
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsidePress(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function focusFirstMenuItem() {
    window.requestAnimationFrame(() => {
      rootRef.current?.querySelector<HTMLAnchorElement>('[role="menuitem"]')?.focus();
    });
  }

  function moveMenuFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(
      rootRef.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') || [],
    );
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLAnchorElement);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowUp'
            ? (current - 1 + items.length) % items.length
            : (current + 1) % items.length;
    items[next]?.focus();
  }

  return (
    <nav className="collection-navigation" aria-label="Collection menus">
      <div className="collection-menu" ref={rootRef}>
        <button
          ref={triggerRef}
          type="button"
          className="collection-menu-trigger"
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup="menu"
          onClick={() => setOpen((value) => !value)}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowDown') return;
            event.preventDefault();
            setOpen(true);
            focusFirstMenuItem();
          }}
        >
          <Menu size={18} aria-hidden="true" />
          <span>Menus</span>
          <ChevronDown size={16} className="collection-menu-chevron" aria-hidden="true" />
        </button>
        {open && (
          <div
            id={menuId}
            className="collection-menu-panel"
            role="menu"
            aria-label="Available collections"
            onKeyDown={moveMenuFocus}
          >
            {collections.length ? (
              collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  {collection.navigation_label}
                </Link>
              ))
            ) : (
              <span className="collection-menu-empty">No menus available</span>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

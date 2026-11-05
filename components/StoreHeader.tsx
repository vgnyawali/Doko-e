'use client';

import { Search, ShoppingBasket, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import BrandLogo from './BrandLogo';
import type { SiteSettings } from '@/models/SiteSettings';

export default function StoreHeader({
  settings,
  basketCount,
  onBasket,
}: {
  settings: SiteSettings;
  basketCount: number;
  onBasket: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRoot = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get('search') || '';
    setSearch(query);
  }, []);
  useEffect(() => {
    if (settings.browser_title.trim()) document.title = settings.browser_title;
  }, [settings.browser_title]);
  useEffect(() => {
    if (!searchOpen) return;
    searchInput.current?.focus();
    const close = (event: PointerEvent) => {
      if (!searchRoot.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [searchOpen]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const query = search.trim();
    window.location.assign(query ? `/?search=${encodeURIComponent(query)}#shop` : '/#shop');
  }

  return (
    <>
      <style>{`
        .site-header { min-height: 0; padding-top: 4px; padding-bottom: 4px; }
        .site-header .brand-logo img { width: 42px; height: 45px; }
        .header-free-shipping { color: #4d5670; font-size: 12px; font-weight: 700; white-space: nowrap; }
        .shipping-short { display: none; }
        @media (max-width: 700px) {
          .site-header { padding: 4px 5%; }
          .site-header .brand-logo img { width: 36px; height: 39px; }
          .shipping-full { display: none; }
          .shipping-short { display: inline; }
        }
        @media (max-width: 420px) {
          .header-search { display: none; }
          .header-free-shipping { font-size: 11px; }
        }
      `}</style>
      <header className="site-header">
        <BrandLogo name={settings.site_name} showName />
        <div className="site-header-actions">
        <div className="header-search" ref={searchRoot}>
          {searchOpen && (
            <form className="header-search-form" role="search" onSubmit={submitSearch}>
              <label className="sr-only" htmlFor="store-search">Search products</label>
              <input
                ref={searchInput}
                id="store-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products"
              />
              <button type="submit" aria-label="Submit product search"><Search size={18} /></button>
            </form>
          )}
          <button
            type="button"
            className="header-icon-button"
            aria-label={searchOpen ? 'Close search' : 'Search products'}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((value) => !value)}
          >
            {searchOpen ? <X size={20} /> : <Search size={20} />}
          </button>
        </div>
        <span className="header-free-shipping">
          <span className="shipping-full">Free shipping over $</span>
          <span className="shipping-short">Free over $</span>
          {settings.free_shipping_threshold}
        </span>
        <button
          className="basket-button"
          onClick={onBasket}
          aria-label={`Basket, ${basketCount} item${basketCount === 1 ? '' : 's'}`}
        >
          <ShoppingBasket size={19} />
          <span>Basket</span>
          <b>{basketCount}</b>
        </button>
        </div>
      </header>
    </>
  );
}

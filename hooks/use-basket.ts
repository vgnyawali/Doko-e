'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Product } from '@/models/Product';
import type { SiteSettings } from '@/models/SiteSettings';
import { setCartQuantity, type Cart } from '@/modules/cart/cart';
import { canPurchase } from '@/services/shipping';

export function useBasket(products: Product[], settings: SiteSettings) {
  const [cart, setCart] = useState<Cart>({});

  useEffect(() => {
    const sync = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('doko-basket') || '{}');
        if (saved && typeof saved === 'object' && !Array.isArray(saved))
          setCart(saved);
      } catch {}
    };
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'doko-basket' || event.key === null) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const validProducts = useMemo(
    () => products.filter((product) => canPurchase(product, settings)),
    [products, settings],
  );
  const validCart = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(cart).flatMap(([id, quantity]) => {
          const product = validProducts.find((item) => item.id === id);
          return product && Number.isFinite(quantity) && quantity > 0
            ? [[id, Math.min(product.inventory, Math.trunc(quantity))]]
            : [];
        }),
      ),
    [cart, validProducts],
  );

  function update(next: Cart) {
    setCart(next);
    localStorage.setItem('doko-basket', JSON.stringify(next));
  }

  function add(product: Product, quantity: number) {
    if (!canPurchase(product, settings)) return false;
    update(
      setCartQuantity(
        validCart,
        product.id,
        (validCart[product.id] || 0) + quantity,
        product.inventory,
      ),
    );
    return true;
  }

  return {
    cart: validCart,
    count: Object.values(validCart).reduce((sum, quantity) => sum + quantity, 0),
    add,
    update,
  };
}

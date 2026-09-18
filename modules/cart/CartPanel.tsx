'use client';
import { useState, useEffect } from 'react';
import FulfillmentChoice from '@/components/FulfillmentChoice';
import {
  canFulfill,
  deliveryFallback,
  type FulfillmentMethod,
} from '@/services/fulfillment';
import type { SiteSettings } from '@/models/SiteSettings';
import { ShoppingBasket } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import QuantitySelector from '@/components/QuantitySelector';
import { cartSubtotal, setCartQuantity, type Cart } from './cart';
import type { Product } from '@/models/Product';
export default function CartPanel({
  open,
  onOpenChange,
  cart,
  products,
  threshold,
  settings,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: Cart;
  products: Product[];
  threshold: number;
  settings: SiteSettings;
  onChange: (cart: Cart) => void;
}) {
  const [method, setMethod] = useState<FulfillmentMethod>('shipping');
  useEffect(() => {
    try {
      if (localStorage.getItem('doko-fulfillment') === 'delivery')
        setMethod('delivery');
    } catch {}
  }, []);
  function choose(value: FulfillmentMethod) {
    setMethod(value);
    try {
      localStorage.setItem('doko-fulfillment', value);
    } catch {}
  }
  const eligible = (m: FulfillmentMethod) =>
    products.filter((p) => cart[p.id]).every((p) => canFulfill(p, m, settings));
  const count = Object.values(cart).reduce((a, b) => a + b, 0),
    subtotal = cartSubtotal(cart, products);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="doko-panel">
        <SheetTitle>Your basket ({count})</SheetTitle>
        <SheetDescription>
          A little taste of home, ready to come along.
        </SheetDescription>
        {!count ? (
          <div className="empty-cart">
            <ShoppingBasket size={44} />
            <h3>Your basket is waiting.</h3>
            <p>Start with a familiar favorite.</p>
            <button
              className="primary-button"
              onClick={() => onOpenChange(false)}
            >
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            {products
              .filter((p) => cart[p.id])
              .map((p) => (
                <article className="cart-item" key={p.id}>
                  <img src={p.image_url} alt={p.name} />
                  <div>
                    <h3>{p.name}</h3>
                    <p>
                      {p.package_size} · ${p.price.toFixed(2)}
                    </p>
                    <QuantitySelector
                      value={cart[p.id]}
                      max={p.inventory}
                      onChange={(n) =>
                        onChange(setCartQuantity(cart, p.id, n, p.inventory))
                      }
                      label={`${p.name} basket quantity`}
                    />
                    <button
                      className="remove-button"
                      onClick={() =>
                        onChange(setCartQuantity(cart, p.id, 0, p.inventory))
                      }
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            <div className="cart-total">
              <FulfillmentChoice
                value={method}
                onChange={choose}
                deliveryDisabled={!eligible('delivery')}
                shippingDisabled={!eligible('shipping')}
              />
              <div>
                <strong>Subtotal</strong>
                <strong>${subtotal.toFixed(2)}</strong>
              </div>
              <p>
                {method === 'delivery'
                  ? settings.delivery_instructions || deliveryFallback
                  : subtotal >= threshold
                    ? 'Your basket qualifies for free shipping.'
                    : `You’re $${(threshold - subtotal).toFixed(2)} away from free shipping.`}
              </p>
              {!eligible(method) && (
                <p role="alert">
                  Choose an available option for all basket items.
                </p>
              )}
              <a
                className="primary-button"
                href={`/checkout?fulfillment=${method}`}
                aria-disabled={!eligible(method)}
                onClick={(e) => {
                  if (!eligible(method)) e.preventDefault();
                }}
              >
                Continue to checkout
              </a>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

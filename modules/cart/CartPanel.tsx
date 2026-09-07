'use client';
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
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: Cart;
  products: Product[];
  threshold: number;
  onChange: (cart: Cart) => void;
}) {
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
              <div>
                <strong>Subtotal</strong>
                <strong>${subtotal.toFixed(2)}</strong>
              </div>
              <p>
                {subtotal >= threshold
                  ? 'Your basket qualifies for free shipping.'
                  : `You’re $${(threshold - subtotal).toFixed(2)} away from free shipping.`}
              </p>
              <p>Shipping eligibility is checked at checkout.</p>
              <a className="primary-button" href="/checkout">
                Continue to checkout
              </a>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

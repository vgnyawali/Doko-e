'use client';
import BrandLogo from '@/components/BrandLogo';
import { useEffect, useState } from 'react';
import {
  ShoppingBasket,
  Truck,
  Heart,
  Package,
  ArrowUpRight,
} from 'lucide-react';
import { seedProducts } from '@/data/products';
import { seedSpecials } from '@/data/specials';
import { defaultSettings, heroImage } from '@/config/defaults';
import type { Product } from '@/models/Product';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ProductDetails } from '@/components/ProductCard';
import QuantitySelector from '@/components/QuantitySelector';
import ProductCatalog from '@/modules/catalog/ProductCatalog';
import FeaturedSpecials from '@/modules/specials/FeaturedSpecials';
import CartPanel from '@/modules/cart/CartPanel';
import { setCartQuantity, type Cart } from '@/modules/cart/cart';
import { canPurchase, shippingLabels } from '@/services/shipping';
export default function Storefront() {
  const [products, setProducts] = useState(seedProducts);
  const [settings, setSettings] = useState(defaultSettings);
  const [specials, setSpecials] = useState(seedSpecials);
  const [cart, setCart] = useState<Cart>({});
  const [basket, setBasket] = useState(false);
  const [view, setView] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    fetch('/api/store')
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json() as Promise<{
          products: Product[];
          settings: typeof defaultSettings;
          specials: typeof seedSpecials;
        }>;
      })
      .then((d) => {
        setProducts(d.products);
        setSettings(d.settings);
        setSpecials(d.specials);
      })
      .catch(() =>
        setNotice(
          'The live catalog is temporarily unavailable. Showing the sample collection.',
        ),
      );
    try {
      const saved = JSON.parse(localStorage.getItem('doko-basket') || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved))
        setCart(saved);
    } catch {}
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(''), 6500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  function updateCart(next: Cart) {
    setCart(next);
    localStorage.setItem('doko-basket', JSON.stringify(next));
  }
  const validProducts = products.filter((p) => canPurchase(p, settings));
  const validCart = Object.fromEntries(
    Object.entries(cart).flatMap(([id, n]) => {
      const p = validProducts.find((p) => p.id === id);
      return p && Number.isFinite(n) && n > 0
        ? [[id, Math.min(p.inventory, Math.trunc(n))]]
        : [];
    }),
  );
  function add(p: Product, n: number) {
    if (!canPurchase(p, settings)) return;
    updateCart(
      setCartQuantity(validCart, p.id, (validCart[p.id] || 0) + n, p.inventory),
    );
    setNotice(`${p.name} added to your basket.`);
  }
  const count = Object.values(validCart).reduce((a, b) => a + b, 0);
  const openView = (p: Product) => {
    setView(p);
    setQuantity(1);
  };
  return (
    <>
      <div className="announcement">
        <span>नमस्ते, welcome to Doko</span>
        <span>{settings.announcement}</span>
        <Truck size={16} />
      </div>
      <header className="site-header">
        <BrandLogo name={settings.site_name} />
        <nav aria-label="Main navigation">
          <a href="#shop">Shop the pantry</a>
          <a href="#specials">Seasonal specials</a>
          <a href="#how">How it works</a>
        </nav>
        <button className="basket-button" onClick={() => setBasket(true)}>
          <ShoppingBasket size={19} />
          <span>Basket</span>
          <b>{count}</b>
        </button>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Rooted in Nepal. At home in America.</p>
            <h1>
              {settings.hero_title === defaultSettings.hero_title ? (
                <>
                  A little bit of Nepal,
                  <br />
                  wherever <em>you are</em>
                </>
              ) : (
                settings.hero_title
              )}
            </h1>
            <p className="hero-description">{settings.hero_subtitle}</p>
            <a className="primary-button" href="#shop">
              Fill your basket <ArrowUpRight size={19} />
            </a>
            <p className="hero-foot">
              <Truck size={17} />
              {settings.shipping_message}
            </p>
          </div>
          <div className="hero-image">
            <img
              src={heroImage}
              alt="A colorful spread of spices, ginger and chilies"
            />
            <div className="hero-stamp">
              From our pantry
              <br />
              <em>to yours.</em>
            </div>
          </div>
        </section>
        <div className="trust-strip">
          <span>
            <Heart size={17} /> Familiar flavors, thoughtfully selected
          </span>
          <span>
            <Truck size={18} /> Shipping across the U.S.
          </span>
          <span>
            <Package size={18} /> Free shipping over $
            {settings.free_shipping_threshold}
          </span>
        </div>
        <FeaturedSpecials
          specials={specials}
          products={products}
          enabled={settings.special_enabled}
          onView={openView}
        />
        <ProductCatalog
          products={products}
          settings={settings}
          onAdd={add}
          onView={openView}
        />
        <section id="how" className="how-section">
          <div className="section">
            <p className="eyebrow">How Doko works</p>
            <h2>
              From our community
              <br />
              to your home.
            </h2>
            <div className="steps">
              {[
                [
                  '01',
                  'Find your favorites',
                  'Browse familiar staples, new discoveries, and seasonal treats.',
                ],
                [
                  '02',
                  'Make it your basket',
                  'Choose your quantities. We carefully pack every little taste of home.',
                ],
                [
                  '03',
                  'We bring home closer',
                  'Your Nepali favorites, shipped to your doorstep across the U.S.',
                ],
              ].map(([n, t, d]) => (
                <article key={n}>
                  <span>{n}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="why" className="section why-section">
          <div>
            <p className="eyebrow">Why Doko</p>
            <h2>
              More than a pantry.
              <br />
              <em>A connection to home.</em>
            </h2>
          </div>
          <div>
            <p>
              It’s the aroma of chiya in the morning. The comfort of dal bhat.
              The flavors that bring everyone to the table.
            </p>
            <p>
              Doko brings Nepali essentials and the joy of sharing them to
              kitchens across America.
            </p>
            <span className="nepali-note" lang="ne">
              घरको अनुभूति, जहाँ भए पनि।
            </span>
          </div>
        </section>
      </main>
      <footer>
        <div className="footer-main">
          <BrandLogo name={settings.site_name} />
          <p>Closer to culture. Closer to home.</p>
          <div>
            <a href="#shop">Shop</a>
            <a href="#how">How it works</a>
            {settings.support_email && (
              <a href={`mailto:${settings.support_email}`}>Contact us</a>
            )}
            <a href="/admin">Store admin ↗</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {settings.site_name}. Made for our
            community.
          </span>
          <span>Nepali roots. Nationwide reach.</span>
        </div>
      </footer>
      <div className="toast" role="status" hidden={!notice}>
        {notice}
      </div>
      <Sheet
        open={!!view}
        onOpenChange={(o) => {
          if (!o) setView(null);
        }}
      >
        <SheetContent className="doko-panel">
          {view && (
            <>
              <SheetTitle>{view.name}</SheetTitle>
              <SheetDescription>
                {view.brand} · {view.package_size}
              </SheetDescription>
              <img
                className="panel-image"
                src={view.image_url}
                alt={view.name}
              />
              <p lang="ne">{view.nepali_name}</p>
              <p>{view.description}</p>
              <ProductDetails product={view} />
              <p>{shippingLabels[view.shipping_type]}</p>
              <div className="price-row">
                <strong>${view.price.toFixed(2)}</strong>
                <QuantitySelector
                  value={quantity}
                  onChange={setQuantity}
                  max={Math.max(1, view.inventory)}
                />
              </div>
              <button
                className="primary-button"
                disabled={!canPurchase(view, settings)}
                onClick={() => add(view, quantity)}
              >
                Add to Basket
              </button>
            </>
          )}
        </SheetContent>
      </Sheet>
      <CartPanel
        open={basket}
        onOpenChange={setBasket}
        cart={validCart}
        products={products}
        threshold={settings.free_shipping_threshold}
        settings={settings}
        onChange={updateCart}
      />
    </>
  );
}

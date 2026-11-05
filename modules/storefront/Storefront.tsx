'use client';
import FlashAdPopup from '@/modules/promotions/FlashAdPopup';
import { useEffect, useState } from 'react';
import { seedProducts } from '@/data/products';
import { defaultSettings } from '@/config/defaults';
import type { Product } from '@/models/Product';
import ProductCatalog from '@/modules/catalog/ProductCatalog';
import CartPanel from '@/modules/cart/CartPanel';
import StoreHeader from '@/components/StoreHeader';
import StoreAnnouncement from '@/components/StoreAnnouncement';
import StoreNavigation from '@/components/StoreNavigation';
import StoreFooter from '@/components/StoreFooter';
import ProductQuickView from '@/components/ProductQuickView';
import { useBasket } from '@/hooks/use-basket';
import type { PublicCollectionNavigation } from '@/models/CatalogCollection';
import type { FlashAd } from '@/models/Promotion';
import HomepageCarousel from '@/modules/promotions/HomepageCarousel';
import FeaturedCollectionRow from '@/components/FeaturedCollectionRow';
import type { HomepageCollectionFeature } from '@/models/CatalogCollection';
export default function Storefront() {
  const [products, setProducts] = useState(seedProducts);
  const [settings, setSettings] = useState(defaultSettings);
  const [collections, setCollections] = useState<PublicCollectionNavigation[]>([]);
  const [homepageSlides, setHomepageSlides] = useState<FlashAd[]>([]);
  const [collectionFeatures, setCollectionFeatures] = useState<HomepageCollectionFeature[]>([]);
  const [basketOpen, setBasketOpen] = useState(false);
  const [view, setView] = useState<Product | null>(null);
  const [notice, setNotice] = useState('');
  const basket = useBasket(products, settings);
  useEffect(() => {
    fetch('/api/store')
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json() as Promise<{
          products: Product[];
          settings: typeof defaultSettings;
          collections: PublicCollectionNavigation[];
          collectionFeatures: HomepageCollectionFeature[];
        }>;
      })
      .then((d) => {
        setProducts(d.products);
        setSettings(d.settings);
        setCollections(d.collections || []);
        setCollectionFeatures(d.collectionFeatures || []);
      })
      .catch(() =>
        setNotice(
          'The live catalog is temporarily unavailable. Showing the sample collection.',
        ),
      );
  }, []);
  useEffect(() => {
    document.title = settings.browser_title;
  }, [settings.browser_title]);
  useEffect(() => {
    fetch('/api/promotions', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<{ slides: FlashAd[] }> : { slides: [] })
      .then((data) => setHomepageSlides(data.slides || []))
      .catch(() => setHomepageSlides([]));
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(''), 6500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  function add(p: Product, n: number) {
    if (basket.add(p, n)) setNotice(`${p.name} added to your basket.`);
  }
  const openView = (p: Product) => {
    setView(p);
  };
  return (
    <>
      <FlashAdPopup />
      <StoreHeader
        settings={settings}
        basketCount={basket.count}
        onBasket={() => setBasketOpen(true)}
      />
      <StoreAnnouncement announcement={settings.announcement} />
      <StoreNavigation collections={collections} />
      <main>
        <HomepageCarousel slides={homepageSlides} />
        <FeaturedCollectionRow
          features={collectionFeatures}
          carouselThreshold={settings.featured_items_carousel_threshold}
          settings={settings}
          onAdd={add}
          onView={openView}
        />
        <ProductCatalog
          products={products}
          settings={settings}
          onAdd={add}
          onView={openView}
        />
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
      <StoreFooter settings={settings} collections={collections} />
      <div className="toast" role="status" hidden={!notice}>
        {notice}
      </div>
      <ProductQuickView
        key={view?.id || 'closed'}
        product={view}
        settings={settings}
        onClose={() => setView(null)}
        onAdd={add}
      />
      <CartPanel
        open={basketOpen}
        onOpenChange={setBasketOpen}
        cart={basket.cart}
        products={products}
        threshold={settings.free_shipping_threshold}
        settings={settings}
        onChange={basket.update}
      />
    </>
  );
}

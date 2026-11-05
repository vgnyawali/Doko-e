'use client';

import { useState } from 'react';
import type {
  CatalogCollection,
  CollectionProduct,
  PublicCollectionNavigation,
} from '@/models/CatalogCollection';
import type { Product } from '@/models/Product';
import type { SiteSettings } from '@/models/SiteSettings';
import StoreHeader from '@/components/StoreHeader';
import StoreAnnouncement from '@/components/StoreAnnouncement';
import StoreNavigation from '@/components/StoreNavigation';
import StoreFooter from '@/components/StoreFooter';
import ProductQuickView from '@/components/ProductQuickView';
import CollectionProductGrid from '@/modules/catalog/CollectionProductGrid';
import CartPanel from '@/modules/cart/CartPanel';
import { useBasket } from '@/hooks/use-basket';

export default function CollectionStorefront({
  collection,
  products,
  allProducts,
  settings,
  navigation,
  preview,
}: {
  collection: CatalogCollection;
  products: CollectionProduct[];
  allProducts: Product[];
  settings: SiteSettings;
  navigation: PublicCollectionNavigation[];
  preview: boolean;
}) {
  const [basketOpen, setBasketOpen] = useState(false);
  const [view, setView] = useState<Product | null>(null);
  const [notice, setNotice] = useState('');
  const basket = useBasket(allProducts, settings);
  function add(product: Product, quantity: number) {
    if (basket.add(product, quantity)) {
      setNotice(`${product.name} added to your basket.`);
      window.setTimeout(() => setNotice(''), 3500);
    }
  }
  return (
    <>
      {preview && (
        <output className="preview-banner">
          Draft preview · This collection is not public.
        </output>
      )}
      <StoreHeader
        settings={settings}
        basketCount={basket.count}
        onBasket={() => setBasketOpen(true)}
      />
      <StoreAnnouncement announcement={settings.announcement} />
      <StoreNavigation collections={navigation} />
      <main>
        {collection.slug !== 'doko-specials' && (
          <section className={`collection-hero ${collection.banner_image_url ? 'has-image' : ''}`}>
            <div className="collection-hero-copy">
              <p className="eyebrow">A Doko collection</p>
              <h1>{collection.page_title}</h1>
              {collection.subtitle && <h2>{collection.subtitle}</h2>}
              {collection.description && <p>{collection.description}</p>}
              <span>{products.length} products</span>
            </div>
            {collection.banner_image_url && (
              <img src={collection.banner_image_url} alt="" />
            )}
          </section>
        )}
        <CollectionProductGrid
          title={collection.slug === 'doko-specials' ? collection.page_title : undefined}
          products={products}
          settings={settings}
          onAdd={add}
          onView={setView}
        />
      </main>
      <StoreFooter settings={settings} collections={navigation} />
      <output className="toast" hidden={!notice}>{notice}</output>
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
        products={allProducts}
        threshold={settings.free_shipping_threshold}
        settings={settings}
        onChange={basket.update}
      />
    </>
  );
}

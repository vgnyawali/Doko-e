'use client';

import { useState } from 'react';
import {
  hasRelevantAllergenInformation,
  isFoodProduct,
  type Product,
} from '@/models/Product';
import type { SiteSettings } from '@/models/SiteSettings';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import ProductImageZoom from './ProductImageZoom';
import QuantitySelector from './QuantitySelector';
import { canPurchase, shippingLabels } from '@/services/shipping';

function QuickViewDetails({ product }: { product: Product }) {
  const food = isFoodProduct(product);
  const showAllergens = food && hasRelevantAllergenInformation(product);
  return (
    <dl className="product-details quick-view-details">
      {product.contents && (
        <div>
          <dt>Contents</dt>
          <dd>{product.contents}</dd>
        </div>
      )}
      {food && product.ingredients && (
        <div>
          <dt>Ingredients</dt>
          <dd>{product.ingredients}</dd>
        </div>
      )}
      {showAllergens && (
        <div className="allergen-information">
          <dt>Allergen Information</dt>
          <dd>{product.allergens}</dd>
        </div>
      )}
    </dl>
  );
}

export default function ProductQuickView({
  product,
  settings,
  onClose,
  onAdd,
}: {
  product: Product | null;
  settings: SiteSettings;
  onClose: () => void;
  onAdd: (product: Product, quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  return (
    <Sheet open={!!product} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="doko-panel">
        {product && (
          <>
            <SheetTitle>{product.name}</SheetTitle>
            <SheetDescription>
              {product.brand || 'Product details'}
            </SheetDescription>
            <ProductImageZoom
              src={product.image_url}
              name={product.name}
              className="panel-image-zoom"
            >
              <img className="panel-image" src={product.image_url} alt={product.name} />
              <span>Zoom picture ⤢</span>
            </ProductImageZoom>
            <p lang="ne">{product.nepali_name}</p>
            <p>{product.description}</p>
            <QuickViewDetails product={product} />
            <p>{shippingLabels[product.shipping_type]}</p>
            <div className="price-row">
              <strong>${product.price.toFixed(2)}</strong>
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                max={Math.max(1, product.inventory)}
              />
            </div>
            <button
              className="primary-button"
              disabled={!canPurchase(product, settings)}
              onClick={() => onAdd(product, quantity)}
            >
              Add to Basket
            </button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

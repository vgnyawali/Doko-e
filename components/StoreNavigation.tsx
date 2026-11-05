import Link from 'next/link';
import type { PublicCollectionNavigation } from '@/models/CatalogCollection';
import ProductRequestForm from './ProductRequestForm';

export default function StoreNavigation({
  collections,
}: {
  collections: PublicCollectionNavigation[];
}) {
  return (
    <div className="store-navigation-bar">
      <nav className="store-navigation-links" aria-label="Store navigation">
        <Link href="/">Home</Link>
        <Link href="/#shop">Shop</Link>
        {collections.map((collection) => (
          <Link key={collection.id} href={`/collections/${collection.slug}`}>
            {collection.navigation_label}
          </Link>
        ))}
      </nav>
      <ProductRequestForm compact />
    </div>
  );
}

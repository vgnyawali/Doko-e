import BrandLogo from './BrandLogo';
import Link from 'next/link';
import type { SiteSettings } from '@/models/SiteSettings';
import type { PublicCollectionNavigation } from '@/models/CatalogCollection';

export default function StoreFooter({
  settings,
  collections,
}: {
  settings: SiteSettings;
  collections: PublicCollectionNavigation[];
}) {
  return (
    <footer>
      <div className="footer-main">
        <BrandLogo name={settings.site_name} />
        <p>Closer to culture. Closer to home.</p>
        <div>
          <Link href="/#shop">Shop</Link>
          {collections.map((collection) => (
            <Link key={collection.id} href={`/collections/${collection.slug}`}>
              {collection.navigation_label}
            </Link>
          ))}
          {settings.support_email && (
            <a href={`mailto:${settings.support_email}`}>Contact us</a>
          )}
          <Link href="/admin">Store admin ↗</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {settings.site_name}. Made for our community.
        </span>
        <span>Nepali roots. Nationwide reach.</span>
      </div>
    </footer>
  );
}

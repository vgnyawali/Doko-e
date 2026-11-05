import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import CollectionStorefront from '@/modules/collections/CollectionStorefront';
import { isAdmin } from '@/services/adminAuth';
import { readCollectionBySlug } from '@/services/collections';
import { readStore } from '@/services/repository';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const preview = query.preview === '1' && (await isAdmin());
  const result = await readCollectionBySlug(slug, preview);
  if (!result) return { title: 'Collection unavailable · Doko' };
  return {
    title: result.collection.seo_title || `${result.collection.page_title} · Doko`,
    description:
      result.collection.seo_description || result.collection.description,
  };
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const preview = query.preview === '1' && (await isAdmin());
  const [result, store] = await Promise.all([
    readCollectionBySlug(slug, preview),
    readStore(),
  ]);
  if (!result) notFound();
  if (result.redirectedFrom)
    permanentRedirect(
      `/collections/${result.collection.slug}${preview ? '?preview=1' : ''}`,
    );
  return (
    <CollectionStorefront
      collection={result.collection}
      products={result.products}
      allProducts={store.products.filter((product) => product.active)}
      settings={store.settings}
      navigation={store.collections}
      preview={preview}
    />
  );
}

'use client';

import { useMemo, useState } from 'react';
import { Field, Choice, Toggle } from './Fields';
import ImageUploadField from './ImageUploadField';
import type { Product } from '@/models/Product';
import {
  collectionStatuses,
  type AdminCatalogCollection,
  type CatalogCollection,
  type CollectionProductAssignment,
} from '@/models/CatalogCollection';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function blankCollection(): AdminCatalogCollection {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    slug: '',
    navigation_label: '',
    page_title: '',
    subtitle: '',
    description: '',
    banner_image_url: '',
    status: 'draft',
    navigation_visible: false,
    navigation_order: 0,
    seo_title: '',
    seo_description: '',
    featured_product_ids: [],
    created_at: now,
    updated_at: now,
    assignments: [],
  };
}

export default function CollectionsManager({
  collections,
  products,
  onChange,
}: {
  collections: AdminCatalogCollection[];
  products: Product[];
  onChange: (collections: AdminCatalogCollection[]) => void;
}) {
  const [draft, setDraft] = useState<AdminCatalogCollection | null>(null);
  const [existing, setExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const shownProducts = useMemo(
    () =>
      products.filter((product) =>
        `${product.name} ${product.sku} ${product.category}`
          .toLowerCase()
          .includes(productSearch.toLowerCase()),
      ),
    [productSearch, products],
  );

  function update(patch: Partial<CatalogCollection>) {
    if (draft) setDraft({ ...draft, ...patch });
  }
  function assignment(productId: string) {
    return draft?.assignments.find((item) => item.product_id === productId);
  }
  function toggleProduct(productId: string, checked: boolean) {
    if (!draft) return;
    if (!checked) {
      setDraft({
        ...draft,
        assignments: draft.assignments.filter((item) => item.product_id !== productId),
        featured_product_ids: draft.featured_product_ids.filter((id) => id !== productId),
      });
      return;
    }
    if (assignment(productId)) return;
    setDraft({
      ...draft,
      assignments: [
        ...draft.assignments,
        {
          collection_id: draft.id,
          product_id: productId,
          display_order: draft.assignments.length * 10,
          badge: '',
          description: '',
        },
      ],
    });
  }
  function updateAssignment(
    productId: string,
    patch: Partial<CollectionProductAssignment>,
  ) {
    if (!draft) return;
    setDraft({
      ...draft,
      assignments: draft.assignments.map((item) =>
        item.product_id === productId ? { ...item, ...patch } : item,
      ),
    });
  }
  async function request(data: unknown) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = (await response.json()) as {
        collections?: AdminCatalogCollection[];
        error?: string;
      };
      if (!response.ok || !result.collections)
        throw new Error(result.error || 'Unable to save collection');
      onChange(result.collections);
      setDraft(null);
      setNotice('Collection saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }
  function save(status = draft?.status) {
    if (!draft || !status) return;
    void request({
      action: 'save',
      collection: { ...draft, status },
      assignments: draft.assignments,
    });
  }

  if (draft) {
    return (
      <section className="admin-card collections-manager">
        <div className="admin-toolbar">
          <div>
            <p className="eyebrow">Menus &amp; Collections</p>
            <h2>{existing ? `Edit ${draft.page_title}` : 'Create a collection'}</h2>
          </div>
          <button type="button" onClick={() => setDraft(null)}>Cancel</button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <form onSubmit={(event) => { event.preventDefault(); save(); }}>
          <div className="form-grid">
            <Field
              label="Navigation label"
              value={draft.navigation_label}
              onChange={(value) => {
                const generated = !existing && (!draft.slug || draft.slug === slugify(draft.navigation_label));
                update({
                  navigation_label: value,
                  page_title: draft.page_title || value,
                  slug: generated ? slugify(value) : draft.slug,
                });
              }}
            />
            <Field
              label="URL slug"
              value={draft.slug}
              onChange={(value) => update({ slug: slugify(value) })}
            />
            <Field
              label="Page title"
              value={draft.page_title}
              onChange={(value) => update({ page_title: value })}
            />
            <Field
              label="Subtitle"
              value={draft.subtitle}
              onChange={(value) => update({ subtitle: value })}
            />
            <Field
              label="Introduction"
              type="textarea"
              value={draft.description}
              onChange={(value) => update({ description: value })}
            />
            <Field
              label="Navigation order"
              type="number"
              value={String(draft.navigation_order)}
              onChange={(value) => update({ navigation_order: Number(value) })}
            />
            <Field
              label="SEO title"
              value={draft.seo_title}
              onChange={(value) => update({ seo_title: value })}
            />
            <Field
              label="SEO description"
              type="textarea"
              value={draft.seo_description}
              onChange={(value) => update({ seo_description: value })}
            />
            <ImageUploadField
              label="Collection banner"
              value={draft.banner_image_url}
              onChange={(value) => update({ banner_image_url: value })}
            />
          </div>
          <div className="collection-publication-controls">
            <Choice
              label="Publication status"
              value={draft.status}
              options={collectionStatuses.map((status) => ({
                value: status,
                label: status[0].toUpperCase() + status.slice(1),
              }))}
              onChange={(value) =>
                update({ status: value as CatalogCollection['status'] })
              }
            />
            <Toggle
              label="Show in storefront navigation"
              checked={draft.navigation_visible}
              onChange={(value) => update({ navigation_visible: value })}
            />
          </div>
          <div className="collection-products-editor">
            <div className="admin-toolbar">
              <div>
                <h2>Products</h2>
                <p>Assign existing products without duplicating catalog records.</p>
              </div>
              <input
                aria-label="Find products to assign"
                placeholder="Find products…"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
            </div>
            {shownProducts.map((product) => {
              const item = assignment(product.id);
              return (
                <article className="collection-assignment" key={product.id}>
                  <div className="collection-assignment-choice">
                    <input
                      type="checkbox"
                      aria-label={`Assign ${product.name}`}
                      checked={!!item}
                      onChange={(event) => toggleProduct(product.id, event.target.checked)}
                    />
                    <img src={product.image_url} alt="" />
                    <span><strong>{product.name}</strong><small>{product.category} · {product.sku}</small></span>
                  </div>
                  {item && (
                    <div className="collection-assignment-fields">
                      <div>
                        <Toggle
                          label="Feature on homepage"
                          checked={draft.featured_product_ids.includes(product.id)}
                          onChange={(checked) =>
                            update({
                              featured_product_ids: checked
                                ? [...draft.featured_product_ids, product.id]
                                : draft.featured_product_ids.filter((id) => id !== product.id),
                            })
                          }
                        />
                      </div>
                      <Field
                        label="Order"
                        type="number"
                        value={String(item.display_order)}
                        onChange={(value) => updateAssignment(product.id, { display_order: Number(value) })}
                      />
                      <Field
                        label="Badge"
                        value={item.badge}
                        onChange={(value) => updateAssignment(product.id, { badge: value })}
                      />
                      <Field
                        label="Collection-specific description"
                        value={item.description}
                        onChange={(value) => updateAssignment(product.id, { description: value })}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <div className="collection-editor-actions">
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button disabled={busy} type="button" onClick={() => save('draft')}>
              Save as draft
            </button>
            <button disabled={busy} type="button" onClick={() => save('published')}>
              Publish
            </button>
            {existing && (
              <a href={`/collections/${draft.slug}?preview=1`} target="_blank" rel="noreferrer">
                Preview draft ↗
              </a>
            )}
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="admin-card collections-manager">
      <div className="admin-toolbar">
        <div>
          <h2>Menus &amp; Collections</h2>
          <p>Create reusable storefront menus and curated product collections.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => { setExisting(false); setDraft(blankCollection()); }}
        >
          + New collection
        </button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <output className="success">{notice}</output>}
      {!collections.length && <p>No collections yet.</p>}
      {collections.map((collection) => (
        <article className="collection-admin-row" key={collection.id}>
          <div>
            <strong>{collection.navigation_label}</strong>
            <span>{collection.status} · {collection.assignments.length} products · {collection.featured_product_ids.length} homepage featured</span>
            <small>/collections/{collection.slug}</small>
          </div>
          <span>{collection.navigation_visible ? `Navigation ${collection.navigation_order}` : 'Hidden from navigation'}</span>
          <div className="row-actions">
            <button onClick={() => { setExisting(true); setDraft(collection); }}>Edit</button>
            <a href={`/collections/${collection.slug}?preview=1`} target="_blank" rel="noreferrer">Preview</a>
            {collection.status !== 'archived' && (
              <button
                disabled={busy}
                onClick={() => void request({ action: 'archive', id: collection.id })}
              >
                Archive
              </button>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

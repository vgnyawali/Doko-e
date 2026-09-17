'use client';
import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { emptyProduct, type Product } from '@/models/Product';
import type { FeaturedSpecial } from '@/models/FeaturedSpecial';
import type { SiteSettings } from '@/models/SiteSettings';
import ProductEditor from './ProductEditor';
import SheetsImport from './SheetsImport';
import SpecialsEditor from './SpecialsEditor';
import SiteSettingsEditor from './SiteSettingsEditor';
import OrdersView from './OrdersView';
import { taxClasses } from '@/config/tax';
type Store = {
  products: Product[];
  specials: FeaturedSpecial[];
  settings: SiteSettings;
};
export default function AdminDashboard({
  chatGPTSession = false,
}: {
  chatGPTSession?: boolean;
}) {
  const [store, setStore] = useState<Store | null>(null);
  const [editor, setEditor] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [deletion, setDeletion] = useState<{
    action: string;
    id: string;
  } | null>(null);
  const [search, setSearch] = useState('');
  async function request(data: unknown) {
    const r = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = (await r.json()) as Store & { error?: string };
    if (!r.ok) throw Error(result.error);
    return result;
  }
  async function reload() {
    setError('');
    try {
      const r = await fetch('/api/admin');
      if (!r.ok)
        throw Error(
          'Could not load the admin catalog. Check your access and try again.',
        );
      setStore((await r.json()) as Store);
    } catch (e) {
      setError(String(e));
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  async function mutate(data: unknown) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setStore(await request(data));
      setEditor(null);
      setNotice('Changes saved.');
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  if (!store)
    return (
      <main className="admin-shell">
        <h1>Doko administration</h1>
        <p role="status">{error || 'Loading your store…'}</p>
        {error && <button onClick={reload}>Try again</button>}
      </main>
    );
  const shown = store.products.filter((p) =>
    `${p.name} ${p.id} ${p.sku}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Doko · Store management</p>
          <h1>A little behind the scenes.</h1>
        </div>
        <div className="admin-header-actions">
          <a href="/">View storefront ↗</a>
          <button
            onClick={async () => {
              await fetch('/api/admin/logout', { method: 'POST' });
              window.location.assign(
                chatGPTSession
                  ? '/signout-with-chatgpt?return_to=%2Fadmin'
                  : '/admin',
              );
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <p className="sample-note">
        The starter catalog contains sample prices, inventory and illustrative
        imagery. Verify product labels, allergens and package details before
        selling.
      </p>
      <div className="admin-stats">
        <div>
          <strong>{store.products.length}</strong>
          <span>Products</span>
        </div>
        <div>
          <strong>{store.products.filter((p) => p.active).length}</strong>
          <span>Active</span>
        </div>
        <div>
          <strong>
            {store.products.filter((p) => p.inventory === 0).length}
          </strong>
          <span>Out of stock</span>
        </div>
        <div>
          <strong>{store.specials.length}</strong>
          <span>Seasonal specials</span>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      <Tabs defaultValue="products">
        <TabsList className="admin-tabs">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="import">Google Sheets import</TabsTrigger>
          <TabsTrigger value="specials">Featured specials</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="settings">Site & shipping settings</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <section className="admin-card">
            <div className="admin-toolbar">
              <input
                aria-label="Find products"
                placeholder="Find by name, ID, or SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                className="primary-button"
                onClick={() => {
                  setCreating(true);
                  setEditor({ ...emptyProduct, id: crypto.randomUUID() });
                }}
              >
                + Add product
              </button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    'Product',
                    'Price',
                    'Inventory',
                    'Tax classification',
                    'Status',
                    'Featured',
                    'Actions',
                  ].map((t) => (
                    <TableHead key={t}>{t}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="admin-product">
                        <img src={p.image_url} alt="" />
                        <div>
                          <strong>{p.name}</strong>
                          <small>
                            {p.id} · {p.sku}
                          </small>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>${p.price.toFixed(2)}</TableCell>
                    <TableCell>{p.inventory}</TableCell>
                    <TableCell>
                      {p.product_type === 'bundle'
                        ? 'Bundle — component taxes'
                        : `${p.taxable ? 'Taxable' : 'Exempt'} / ${taxClasses[p.tax_class]?.label || p.tax_class}`}
                    </TableCell>
                    <TableCell>
                      <button
                        disabled={busy}
                        className="status-button"
                        onClick={() =>
                          mutate({
                            action: 'products',
                            products: [{ ...p, active: !p.active }],
                          })
                        }
                      >
                        {p.active ? 'Active' : 'Inactive'}
                      </button>
                    </TableCell>
                    <TableCell>
                      <button
                        disabled={busy}
                        aria-label={`${p.featured ? 'Unfeature' : 'Feature'} ${p.name}`}
                        onClick={() =>
                          mutate({
                            action: 'products',
                            products: [{ ...p, featured: !p.featured }],
                          })
                        }
                      >
                        {p.featured ? '★ Featured' : '☆ Feature'}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="row-actions">
                        <button
                          onClick={() => {
                            setCreating(false);
                            setEditor(p);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setCreating(true);
                            setEditor({
                              ...p,
                              id: crypto.randomUUID(),
                              sku: `${p.sku}-COPY-${Date.now().toString(36)}`,
                              name: `${p.name} (copy)`,
                              active: false,
                            });
                          }}
                        >
                          Duplicate
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            setDeletion({ action: 'deleteProduct', id: p.id })
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!shown.length && <p>No products found.</p>}
          </section>
        </TabsContent>
        <TabsContent value="import">
          <SheetsImport
            products={store.products}
            request={request}
            onImported={(d) => {
              setStore(d);
              setNotice('Products imported successfully.');
            }}
          />
        </TabsContent>
        <TabsContent value="specials">
          <SpecialsEditor
            specials={store.specials}
            products={store.products}
            busy={busy}
            onSave={(special, product) =>
              mutate({ action: 'special', special, product })
            }
            onDelete={(id) => setDeletion({ action: 'deleteSpecial', id })}
          />
        </TabsContent>
        <TabsContent value="settings">
          <SiteSettingsEditor
            settings={store.settings}
            busy={busy}
            onSave={(settings) => mutate({ action: 'settings', settings })}
          />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersView />
        </TabsContent>
      </Tabs>
      <Sheet
        open={!!editor}
        onOpenChange={(o) => {
          if (!o) setEditor(null);
        }}
      >
        <SheetContent className="doko-panel editor-panel">
          <SheetTitle>{creating ? 'Add product' : 'Edit product'}</SheetTitle>
          <SheetDescription>
            All product details, including price and inventory.
          </SheetDescription>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {editor && (
            <ProductEditor
              key={editor.id}
              product={editor}
              existing={!creating}
              busy={busy}
              onSave={(p) =>
                mutate({ action: 'products', products: [p], create: creating })
              }
            />
          )}
        </SheetContent>
      </Sheet>
      <AlertDialog
        open={!!deletion}
        onOpenChange={(o) => {
          if (!o) setDeletion(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            Delete this{' '}
            {deletion?.action === 'deleteProduct' ? 'product' : 'special'}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This removes the record permanently. Deleting a product also removes
            its referenced specials.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletion) void mutate(deletion);
                setDeletion(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

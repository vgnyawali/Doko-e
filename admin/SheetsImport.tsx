'use client';
import { useState } from 'react';
import { Field } from './Fields';
import type { Product } from '@/models/Product';
import { emptyProduct } from '@/models/Product';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
export default function SheetsImport({
  products,
  request,
  onImported,
}: {
  products: Product[];
  request: (data: unknown) => Promise<any>;
  onImported: (data: any) => void;
}) {
  const [url, setUrl] = useState('');
  const [rows, setRows] = useState<
    { row: number; product: Product; errors: string[] }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function preview() {
    setBusy(true);
    setError('');
    setRows([]);
    try {
      const result = await request({ action: 'preview', url });
      setRows(result.rows);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function performImport() {
    setBusy(true);
    setError('');
    try {
      onImported(
        await request({
          action: 'products',
          products: rows.map((r) => r.product),
        }),
      );
      setRows([]);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-card">
      <h2>Import from Google Sheets</h2>
      <p>
        Paste a public sheet URL. Preview all rows before importing. Matching
        Product IDs update existing products; other IDs create new products.
      </p>
      <Field
        label="Public Google Sheets URL"
        value={url}
        onChange={(v) => {
          setUrl(v);
          setRows([]);
        }}
        type="url"
      />
      <button
        className="primary-button"
        disabled={busy || !url}
        onClick={preview}
      >
        {busy ? 'Working…' : 'Preview products'}
      </button>
      <details className="import-help">
        <summary>Column format and import behavior</summary>
        <p>
          Use these column headers. Product ID is also accepted as an alias for
          id.
        </p>
        <code>{Object.keys(emptyProduct).join(', ')}</code>
        <p>
          Required: id, name, category, brand, package_size, price, image_url,
          inventory, sku. Use true/false for active and featured. Omitted
          optional fields reset to their model defaults, so export all columns
          when updating existing products. Maximum 500 products per import.
        </p>
      </details>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {rows.length > 0 && (
        <>
          <p>
            {rows.length} rows · {rows.filter((r) => r.errors.length).length}{' '}
            need correction
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  'Row',
                  'Product ID',
                  'Name',
                  'Price',
                  'Action',
                  'Validation',
                ].map((t) => (
                  <TableHead key={t}>{t}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.row}>
                  <TableCell>{r.row}</TableCell>
                  <TableCell>{r.product.id}</TableCell>
                  <TableCell>{r.product.name}</TableCell>
                  <TableCell>${r.product.price}</TableCell>
                  <TableCell>
                    {products.some((p) => p.id === r.product.id)
                      ? 'Update'
                      : 'New'}
                  </TableCell>
                  <TableCell className={r.errors.length ? 'error' : ''}>
                    {r.errors.join('; ') || 'Ready'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <button
            className="primary-button"
            disabled={
              busy || rows.length > 500 || rows.some((r) => r.errors.length > 0)
            }
            onClick={performImport}
          >
            Import {rows.length} products
          </button>
        </>
      )}
    </section>
  );
}

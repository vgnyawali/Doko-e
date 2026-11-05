import { emptyProduct, validateProduct, type Product } from '@/models/Product';
import { taxDefaults } from '@/config/tax';
// RFC 4180 parser: commas, doubled quotes and embedded newlines are preserved.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (quoted) throw Error('Unclosed quote in CSV');
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export function sheetCSVUrl(raw: string) {
  const u = new URL(raw);
  if (u.protocol !== 'https:' || u.hostname !== 'docs.google.com')
    throw Error('Use a public docs.google.com spreadsheet URL.');
  const match = u.pathname.match(/^\/spreadsheets\/d\/(e\/)?([\w-]+)/);
  if (!match) throw Error('Invalid Google Sheets URL.');
  const gid =
    u.searchParams.get('gid') ||
    new URLSearchParams(u.hash.slice(1)).get('gid') ||
    '0';
  if (!/^\d+$/.test(gid)) throw Error('Invalid sheet tab.');
  return match[1]
    ? `https://docs.google.com/spreadsheets/d/e/${match[2]}/pub?output=csv&gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${match[2]}/export?format=csv&gid=${gid}`;
}
export function previewCSV(text: string) {
  const [header, ...rows] = parseCSV(text.replace(/^\uFEFF/, ''));
  if (!header) throw Error('The sheet is empty.');
  const keys = header.map((s) =>
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/^product_id$/, 'id'),
  );
  if (new Set(keys).size !== keys.length)
    throw Error('Duplicate column headers.');
  const seen = new Set<string>();
  return rows.map((row, index) => {
    const raw = Object.fromEntries(
      keys.map((key, i) => [key, row[i]?.trim() ?? '']),
    );
    const p = { ...emptyProduct, ...raw } as unknown as Product;
    const errors: string[] = [];
    const warnings: string[] = [];
    for (const key of [
      'taxable',
      'tax_class',
      'stripe_tax_code',
      'tax_behavior',
    ] as const) {
      if (raw[key] === undefined || raw[key] === '') {
        (p as unknown as Record<string, unknown>)[key] = taxDefaults[key];
        if (key !== 'stripe_tax_code')
          warnings.push(`${key} missing: using ${String(taxDefaults[key])}`);
      }
    }
    if (raw.taxable) {
      if (!['true', 'false', '1', '0'].includes(raw.taxable.toLowerCase()))
        errors.push('taxable must be true or false');
      p.taxable = ['true', '1'].includes(raw.taxable.toLowerCase());
    }
    if (raw.product_type && raw.product_type !== 'normal')
      errors.push(
        'Import normal products only; edit bundle components in Admin',
      );
    p.product_type = 'normal';
    p.components = [];
    for (const key of ['price', 'inventory', 'display_order'] as const) {
      p[key] = Number(raw[key] ?? (key === 'display_order' ? 0 : NaN));
      if (raw[key] === '') errors.push(`${key} is missing`);
    }
    for (const key of ['active', 'featured'] as const) {
      const v = raw[key];
      if (
        v !== undefined &&
        !['true', 'false', '1', '0'].includes(v.toLowerCase())
      )
        errors.push(`${key} must be true or false`);
      p[key] =
        v === undefined
          ? emptyProduct[key]
          : ['true', '1'].includes(v.toLowerCase());
    }
    errors.push(...validateProduct(p));
    if (seen.has(p.id)) errors.push('Duplicate Product ID in sheet');
    seen.add(p.id);
    return { row: index + 2, product: p, errors, warnings };
  });
}

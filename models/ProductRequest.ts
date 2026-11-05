export const requestStatuses = ['new', 'reviewing', 'planned', 'added', 'not_planned'] as const;
export type ProductRequestStatus = typeof requestStatuses[number];
export const requestStatusLabels: Record<ProductRequestStatus, string> = {
  new: 'New', reviewing: 'Reviewing', planned: 'Planned', added: 'Added', not_planned: 'Not Planned',
};
export interface ProductRequest {
  id: string;
  request_text: string;
  created_at: string;
  status: ProductRequestStatus;
  admin_notes: string;
  source_page: string;
  customer_email: string | null;
}
// Plain text only. React escapes output; HTML is never interpreted.
export function cleanRequestText(value: unknown, min = 2, max = 500) {
  if (typeof value !== 'string') throw Error('Please enter a product request.');
  const text = value.normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (text.length < min || text.length > max) throw Error(`Please enter ${min}–${max} characters.`);
  return text;
}

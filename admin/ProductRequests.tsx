'use client';
import { useEffect, useState } from 'react';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { requestStatuses, requestStatusLabels, type ProductRequest } from '@/models/ProductRequest';
export default function ProductRequests({onCount}: {onCount: (count:number) => void}) {
  const [rows, setRows] = useState<ProductRequest[]>([]), [total, setTotal] = useState(0);
  const [search, setSearch] = useState(''), [status, setStatus] = useState(''), [sort, setSort] = useState('newest'), [offset, setOffset] = useState(0);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0);
  const [deleting, setDeleting] = useState<ProductRequest | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({search, status, sort, offset:String(offset)});
        const response = await fetch(`/api/admin/product-requests?${query}`, {signal:controller.signal, cache:'no-store'});
        if (!response.ok) throw Error('Unable to load requests. Please try again.');
        const data = await response.json() as {requests: ProductRequest[]; total: number; new_count: number};
        if (controller.signal.aborted) return;
        setRows(data.requests); setTotal(data.total); onCount(data.new_count);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load requests.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 200);
    return () => {clearTimeout(timer); controller.abort();};
  }, [search, status, sort, offset, revision, onCount]);
  async function mutate(row: ProductRequest, action: 'update' | 'delete') {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/product-requests', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action, id:row.id, status:row.status, admin_notes:row.admin_notes})});
      if (!response.ok) throw Error('Unable to save changes. Please try again.');
      setNotice(action === 'delete' ? 'Request deleted.' : 'Request updated.');
      if (action === 'delete' && rows.length === 1 && offset > 0) setOffset(Math.max(0, offset - 50));
      setRevision(n => n + 1);
    } catch (e) {setError(e instanceof Error ? e.message : 'Unable to save changes.');}
    finally {setBusy(false);}
  }
  const edit = (id:string, patch:Partial<ProductRequest>) => setRows(old => old.map(row => row.id === id ? {...row, ...patch} : row));
  return <section className="admin-card product-requests-admin">
    <h2>Product Requests</h2>
    <div className="admin-toolbar">
      <input aria-label="Search product requests" placeholder="Search requests or notes…" value={search} onChange={e => {setSearch(e.target.value); setOffset(0);}} />
      <select aria-label="Filter requests by status" value={status} onChange={e => {setStatus(e.target.value); setOffset(0);}}><option value="">All statuses</option>{requestStatuses.map(s => <option key={s} value={s}>{requestStatusLabels[s]}</option>)}</select>
      <select aria-label="Sort requests" value={sort} onChange={e => {setSort(e.target.value); setOffset(0);}}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
      <button disabled={busy || loading} onClick={() => setRevision(n => n + 1)}>Refresh</button>
    </div>
    {error && <p role="alert" className="error">{error}</p>}{notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Loading requests…</p> : <>
      <Table><TableHeader><TableRow>{['Date', 'Requested Item / Message', 'Status', 'Admin Notes', 'Actions'].map(t => <TableHead key={t}>{t}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{rows.map(row => <TableRow key={row.id}>
          <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
          <TableCell><div className="request-message">{row.request_text}</div></TableCell>
          <TableCell><select disabled={busy} aria-label={`Status for ${row.request_text}`} value={row.status} onChange={e => edit(row.id, {status:e.target.value as ProductRequest['status']})}>{requestStatuses.map(s => <option key={s} value={s}>{requestStatusLabels[s]}</option>)}</select></TableCell>
          <TableCell><textarea disabled={busy} aria-label={`Admin notes for ${row.request_text}`} rows={3} maxLength={2000} value={row.admin_notes} onChange={e => edit(row.id, {admin_notes:e.target.value})} /></TableCell>
          <TableCell><div className="row-actions"><button disabled={busy} onClick={() => void mutate(row, 'update')}>Save</button><button disabled={busy} onClick={() => setDeleting(row)}>Delete</button></div></TableCell>
        </TableRow>)}</TableBody></Table>
      {!rows.length && <p>No requests found.</p>}
      <div className="row-actions"><button disabled={offset === 0 || busy} onClick={() => setOffset(n => Math.max(0, n - 50))}>Previous</button><span>{total ? `${offset + 1}–${offset + rows.length} of ${total}` : '0 requests'}</span><button disabled={offset + rows.length >= total || busy} onClick={() => setOffset(n => n + 50)}>Next</button></div>
    </>}
    <AlertDialog open={!!deleting} onOpenChange={open => {if (!open) setDeleting(null);}}><AlertDialogContent><AlertDialogTitle>Delete this product request?</AlertDialogTitle><AlertDialogDescription>This permanently removes the request and its admin notes.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => {if (deleting) void mutate(deleting, 'delete'); setDeleting(null);}}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}

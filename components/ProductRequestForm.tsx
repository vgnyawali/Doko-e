'use client';
import { useState } from 'react';
import { cleanRequestText } from '@/models/ProductRequest';
export default function ProductRequestForm() {
  const [text, setText] = useState(''), [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState(false);
  return <form className="product-request-form" onSubmit={async e => {
    e.preventDefault(); setError(''); setSent(false); setBusy(true);
    try {
      const request_text = cleanRequestText(text);
      const response = await fetch('/api/product-requests', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({request_text, website})});
      const result = await response.json() as {error?: string};
      if (!response.ok) throw Error(result.error || 'Unable to send your request.');
      setText(''); setSent(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to send your request. Please try again.'); }
    finally { setBusy(false); }
  }}>
    <label htmlFor="product-request">What item do you want?</label>
    <div className="product-request-entry">
      <textarea id="product-request" required minLength={2} maxLength={500} rows={2} value={text} disabled={busy} onChange={e => {setText(e.target.value); setSent(false);}} placeholder="Example: Gundruk, puja items, Nepali tea, gifts, kitchen items..." />
      <button className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send Request'}</button>
    </div>
    <div className="request-honeypot" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label></div>
    {error && <p role="alert" className="error">{error}</p>}
    {sent && <p role="status" className="success">Thank you! Your suggestion helps us decide what to bring to Doko next.</p>}
  </form>;
}

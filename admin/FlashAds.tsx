'use client';
import { useEffect, useState } from 'react';
import {
  type FlashAd,
  validateFlashAd,
  activeFlashAd,
} from '@/models/Promotion';
import { Field, Toggle } from './Fields';
import { PromotionImage } from './PromotionFields';
import PromotionModal from '@/modules/promotions/PromotionModal';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
const localTime = (value: string) => {
  if (!value) return '';
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export default function FlashAds() {
  const [ads, setAds] = useState<FlashAd[]>([]),
    [draft, setDraft] = useState<FlashAd | null>(null),
    [preview, setPreview] = useState<FlashAd | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function load() {
    const r = await fetch('/api/admin/flash-ads', { cache: 'no-store' });
    if (!r.ok) throw Error('Unable to load ads.');
    setAds(((await r.json()) as { ads: FlashAd[] }).ads);
  }
  useEffect(() => {
    void load().catch((e) => setError(String(e)));
  }, []);
  async function mutate(body: unknown) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/admin/flash-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw Error(((await r.json()) as { error: string }).error);
      await load();
      setDraft(null);
      setNotice('Changes saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-card">
      <div className="admin-toolbar">
        <h2>Flash Ads</h2>
        <button
          disabled={busy}
          className="primary-button"
          onClick={() => {
            const now = Date.now();
            setError('');
            setDraft({
              id: crypto.randomUUID(),
              title: '',
              description: '',
              image_url: '',
              cta_text: '',
              cta_url: '',
              active: false,
              start_at: new Date(now).toISOString(),
              end_at: new Date(now + 86400000).toISOString(),
              priority: 0,
              created_at: '',
              updated_at: '',
            });
          }}
        >
          Create flash ad
        </button>
        <button
          disabled={busy}
          onClick={() => void load().catch((e) => setError(String(e)))}
        >
          Refresh
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            {[
              'Preview',
              'Title',
              'Start',
              'End',
              'Status',
              'Priority',
              'Actions',
            ].map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ads.map((ad) => (
            <TableRow key={ad.id}>
              <TableCell>
                <button
                  onClick={() => setPreview(ad)}
                  aria-label={`Preview ${ad.title}`}
                >
                  <img
                    className="flash-thumbnail"
                    src={ad.image_url}
                    alt={ad.title}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  Preview
                </button>
              </TableCell>
              <TableCell>{ad.title}</TableCell>
              <TableCell>{new Date(ad.start_at).toLocaleString()}</TableCell>
              <TableCell>{new Date(ad.end_at).toLocaleString()}</TableCell>
              <TableCell>
                {!ad.active
                  ? 'Inactive / archived'
                  : activeFlashAd([ad])
                    ? 'Live'
                    : Date.parse(ad.end_at) < Date.now()
                      ? 'Ended'
                      : 'Scheduled'}
              </TableCell>
              <TableCell>{ad.priority}</TableCell>
              <TableCell>
                <div className="row-actions">
                  <button disabled={busy} onClick={() => setDraft(ad)}>
                    Edit
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void mutate({
                        action: 'save',
                        ad: { ...ad, active: !ad.active },
                      })
                    }
                  >
                    {ad.active ? 'Deactivate / archive' : 'Activate'}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm('Permanently delete this flash ad?'))
                        void mutate({ action: 'delete', id: ad.id });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!ads.length && (
        <p>
          No flash ads yet. Create one when you’re ready to promote an offer.
        </p>
      )}
      {draft && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const errors = validateFlashAd(draft);
            setError(errors.join(' · '));
            if (!errors.length) void mutate({ action: 'save', ad: draft });
          }}
        >
          <h3>
            {ads.some((a) => a.id === draft.id)
              ? 'Edit flash ad'
              : 'New flash ad'}
          </h3>
          <PromotionImage
            value={draft.image_url}
            onChange={(v) => setDraft({ ...draft, image_url: v })}
          />
          <div className="form-grid">
            {(['title', 'description', 'cta_text', 'cta_url'] as const).map(
              (k) => (
                <Field
                  key={k}
                  label={
                    k === 'title'
                      ? 'Headline'
                      : k === 'cta_url'
                        ? 'CTA link'
                        : k
                  }
                  type={k === 'description' ? 'textarea' : 'text'}
                  value={draft[k]}
                  onChange={(v) => setDraft({ ...draft, [k]: v })}
                />
              ),
            )}
            {(['start_at', 'end_at'] as const).map((k) => (
              <Field
                key={k}
                label={k === 'start_at' ? 'Start date/time' : 'End date/time'}
                type="datetime-local"
                value={localTime(draft[k])}
                onChange={(v) =>
                  setDraft({
                    ...draft,
                    [k]:
                      v && Number.isFinite(Date.parse(v))
                        ? new Date(v).toISOString()
                        : '',
                  })
                }
              />
            ))}
            <Field
              label="Display priority (higher first)"
              type="number"
              value={draft.priority}
              onChange={(v) => setDraft({ ...draft, priority: Number(v) })}
            />
          </div>
          <p>
            Times use your browser’s timezone and are saved as UTC. Equal
            priorities show the newest ad.
          </p>
          <Toggle
            label="Active"
            checked={draft.active}
            onChange={(v) => setDraft({ ...draft, active: v })}
          />
          <div className="row-actions">
            <button className="primary-button" disabled={busy} type="submit">
              Save flash ad
            </button>
            <button type="button" onClick={() => setPreview(draft)}>
              Preview
            </button>
            <button type="button" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {preview && (
        <PromotionModal
          key={preview.id + preview.image_url.slice(-20)}
          open
          onOpenChange={(open) => {
            if (!open) setPreview(null);
          }}
          image={preview.image_url}
          title={preview.title || 'Flash ad preview'}
          description={preview.description}
          ctaText={preview.cta_text}
          ctaUrl={preview.cta_url}
          onCta={() => setPreview(null)}
        />
      )}
    </section>
  );
}

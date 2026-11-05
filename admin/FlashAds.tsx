'use client';

import { useEffect, useState } from 'react';
import {
  flashDisplayModes,
  homepageSlideTypes,
  normalizeHomepageSlide,
  validateFlashAd,
  type FlashAd,
  type FlashDisplayMode,
  type HomepageSlideType,
} from '@/models/Promotion';
import { Choice, Field, Toggle } from './Fields';
import { PromotionImage } from './PromotionFields';
import PromotionModal from '@/modules/promotions/PromotionModal';
import HomepageCarousel from '@/modules/promotions/HomepageCarousel';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from '@/components/ui/table';

const localTime = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);
};

function blankSlide(slideType: HomepageSlideType): FlashAd {
  const now = Date.now();
  return {
    id: crypto.randomUUID(), slide_type: slideType, display_mode: 'slider',
    badge_text: '', title: '', description: '', image_url: '', click_url: '',
    cta_text: '', cta_url: '', active: false,
    start_at: new Date(now).toISOString(),
    end_at: new Date(now + 30 * 86400000).toISOString(),
    priority: 0, created_at: '', updated_at: '',
  };
}

function statusLabel(slide: FlashAd) {
  if (!slide.active) return 'Hidden';
  if (Date.parse(slide.end_at) < Date.now()) return 'Expired';
  if (Date.parse(slide.start_at) > Date.now()) return 'Scheduled';
  return 'Published';
}

export default function HomepageCovers() {
  const [slides, setSlides] = useState<FlashAd[]>([]);
  const [draft, setDraft] = useState<FlashAd | null>(null);
  const [carouselPreview, setCarouselPreview] = useState<FlashAd | null>(null);
  const [popupPreview, setPopupPreview] = useState<FlashAd | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    const response = await fetch('/api/admin/flash-ads', { cache: 'no-store' });
    if (!response.ok) throw Error('Unable to load homepage covers.');
    const data = (await response.json()) as { ads: FlashAd[] };
    setSlides(data.ads.map(normalizeHomepageSlide));
  }
  useEffect(() => { void load().catch((cause) => setError(String(cause))); }, []);

  async function mutate(body: unknown) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/flash-ads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw Error(((await response.json()) as { error: string }).error);
      await load(); setDraft(null); setNotice('Homepage promotion saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save.');
    } finally { setBusy(false); }
  }

  const normalizedDraft = draft ? normalizeHomepageSlide(draft) : null;
  return (
    <section className="admin-card homepage-covers-admin">
      <div className="admin-toolbar">
        <div><h2>Homepage Covers &amp; Promotions</h2><p>Manage regular covers and scheduled Flash Ads in one homepage slider.</p></div>
        <div className="row-actions">
          <button className="primary-button" disabled={busy} onClick={() => setDraft(blankSlide('cover'))}>+ Regular cover</button>
          <button className="primary-button" disabled={busy} onClick={() => setDraft(blankSlide('flash'))}>+ Flash Ad</button>
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="success" role="status">{notice}</p>}
      <Table>
        <TableHeader><TableRow>
          {['Preview', 'Title', 'Type', 'Display', 'Schedule', 'Order', 'Status', 'Actions'].map((heading) => <TableHead key={heading}>{heading}</TableHead>)}
        </TableRow></TableHeader>
        <TableBody>
          {[...slides].sort((a, b) => b.priority - a.priority).map((rawSlide) => {
            const slide = normalizeHomepageSlide(rawSlide);
            return <TableRow key={slide.id}>
              <TableCell><button onClick={() => setCarouselPreview(slide)} aria-label={`Preview ${slide.title || 'cover'}`}><img className="flash-thumbnail" src={slide.image_url} alt="" loading="lazy" />Preview</button></TableCell>
              <TableCell>{slide.title || 'Untitled cover'}</TableCell>
              <TableCell>{slide.slide_type === 'flash' ? 'Flash Ad' : 'Regular Cover'}</TableCell>
              <TableCell>{slide.slide_type === 'flash' ? slide.display_mode : 'Slider'}</TableCell>
              <TableCell><small>{new Date(slide.start_at).toLocaleString()}<br />to {new Date(slide.end_at).toLocaleString()}</small></TableCell>
              <TableCell>{slide.priority}</TableCell><TableCell>{statusLabel(slide)}</TableCell>
              <TableCell><div className="row-actions">
                <button disabled={busy} onClick={() => setDraft(slide)}>Edit</button>
                <button disabled={busy} onClick={() => void mutate({ action: 'save', ad: { ...slide, active: !slide.active } })}>{slide.active ? 'Hide' : 'Publish'}</button>
                <button disabled={busy} onClick={() => { if (window.confirm('Permanently delete this homepage promotion?')) void mutate({ action: 'delete', id: slide.id }); }}>Delete</button>
              </div></TableCell>
            </TableRow>;
          })}
        </TableBody>
      </Table>
      {!slides.length && <p>No homepage covers yet. The storefront carousel remains hidden until a slider cover is published.</p>}

      {normalizedDraft && <form className="homepage-cover-editor" onSubmit={(event) => {
        event.preventDefault(); const errors = validateFlashAd(normalizedDraft);
        setError(errors.join(' · ')); if (!errors.length) void mutate({ action: 'save', ad: normalizedDraft });
      }}>
        <h3>{slides.some((slide) => slide.id === normalizedDraft.id) ? 'Edit homepage promotion' : 'New homepage promotion'}</h3>
        <div className="form-grid">
          <Choice label="Slide type" value={normalizedDraft.slide_type}
            options={homepageSlideTypes.map((value) => ({ value, label: value === 'cover' ? 'Regular Cover' : 'Flash Ad' }))}
            onChange={(value) => setDraft({ ...normalizedDraft, slide_type: value as HomepageSlideType, display_mode: value === 'cover' ? 'slider' : normalizedDraft.display_mode })} />
          {normalizedDraft.slide_type === 'flash' && <Choice label="Display mode" value={normalizedDraft.display_mode}
            options={flashDisplayModes.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))}
            onChange={(value) => setDraft({ ...normalizedDraft, display_mode: value as FlashDisplayMode })} />}
        </div>
        <PromotionImage value={normalizedDraft.image_url} onChange={(value) => setDraft({ ...normalizedDraft, image_url: value })} />
        <div className="form-grid">
          <Field label="Title (optional)" value={normalizedDraft.title} onChange={(value) => setDraft({ ...normalizedDraft, title: value })} />
          <Field label="Description (optional)" type="textarea" value={normalizedDraft.description} onChange={(value) => setDraft({ ...normalizedDraft, description: value })} />
          {normalizedDraft.slide_type === 'flash' && <Field label="Badge (optional, e.g. Flash Sale)" value={normalizedDraft.badge_text} onChange={(value) => setDraft({ ...normalizedDraft, badge_text: value })} />}
          <Field label="CTA label (optional)" value={normalizedDraft.cta_text} onChange={(value) => setDraft({ ...normalizedDraft, cta_text: value })} />
          <Field label="Destination URL (internal path)" value={normalizedDraft.click_url || ''} onChange={(value) => setDraft({ ...normalizedDraft, click_url: value })} />
          <Field label="Start date/time" type="datetime-local" value={localTime(normalizedDraft.start_at)} onChange={(value) => setDraft({ ...normalizedDraft, start_at: value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : '' })} />
          <Field label="End date/time" type="datetime-local" value={localTime(normalizedDraft.end_at)} onChange={(value) => setDraft({ ...normalizedDraft, end_at: value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : '' })} />
          <Field label="Display order (higher first)" type="number" value={normalizedDraft.priority} onChange={(value) => setDraft({ ...normalizedDraft, priority: Number(value) })} />
        </div>
        {normalizedDraft.cta_url && <Field label="Existing legacy CTA link" value={normalizedDraft.cta_url} onChange={(value) => setDraft({ ...normalizedDraft, cta_url: value })} />}
        <p>Dates use this browser’s timezone and are stored as UTC. When no scheduled slider cover is active, the storefront carousel is hidden.</p>
        <Toggle label="Published" checked={normalizedDraft.active} onChange={(value) => setDraft({ ...normalizedDraft, active: value })} />
        <div className="row-actions">
          <button className="primary-button" disabled={busy} type="submit">Save promotion</button>
          <button type="button" onClick={() => setCarouselPreview({ ...normalizedDraft, active: true, display_mode: 'slider', start_at: new Date(Date.now() - 1000).toISOString(), end_at: new Date(Date.now() + 86400000).toISOString() })}>Preview carousel</button>
          {normalizedDraft.slide_type === 'flash' && (normalizedDraft.display_mode === 'popup' || normalizedDraft.display_mode === 'both') && <button type="button" onClick={() => setPopupPreview(normalizedDraft)}>Preview popup</button>}
          <button type="button" onClick={() => setDraft(null)}>Cancel</button>
        </div>
      </form>}

      {carouselPreview && <div className="homepage-carousel-preview">
        <div className="admin-toolbar"><h3>Carousel preview</h3><button onClick={() => setCarouselPreview(null)}>Close preview</button></div>
        <HomepageCarousel slides={[{ ...carouselPreview, active: true, display_mode: 'slider', start_at: new Date(Date.now() - 1000).toISOString(), end_at: new Date(Date.now() + 86400000).toISOString() }]} preview />
      </div>}
      {popupPreview && <PromotionModal open onOpenChange={(open) => { if (!open) setPopupPreview(null); }}
        image={popupPreview.image_url} title={popupPreview.title || 'Doko promotion'} description={popupPreview.description}
        clickUrl={popupPreview.click_url} onCardClick={() => setPopupPreview(null)}
        ctaText={popupPreview.cta_text} ctaUrl={popupPreview.cta_url} onCta={() => setPopupPreview(null)} />}
    </section>
  );
}

'use client';
import { useRef, useState } from 'react';

const MAX_OUTPUT_BYTES = 750_000;
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const source = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      source.onload = () => {
        const scale = Math.min(1, 1400 / Math.max(source.width, source.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(source.width * scale));
        canvas.height = Math.max(1, Math.round(source.height * scale));
        const context = canvas.getContext('2d');
        if (!context) return reject(new Error('Image processing is unavailable.'));
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        const result = canvas.toDataURL('image/jpeg', 0.78);
        if (result.length * 0.75 > MAX_OUTPUT_BYTES)
          return reject(new Error('Choose a smaller image (under about 750 KB after compression).'));
        resolve(result);
      };
      source.onerror = () => reject(new Error('That file is not a valid image.'));
      source.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
export default function ImageUploadField({ label, value, onChange, maxInputBytes = Infinity, acceptedTypes }: { label: string; value: string; onChange: (value: string) => void; maxInputBytes?: number; acceptedTypes?: string[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function choose(file: File | undefined) {
    if (!file) return;
    if (file.size > maxInputBytes) { setError('Image file is too large. Maximum input size is 10 MB.'); return; }
    if (acceptedTypes && !acceptedTypes.includes(file.type)) {setError('Choose a JPG, PNG or WebP image.'); return;}
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); return; }
    setBusy(true); setError('');
    try { onChange(await resizeImage(file)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not process that image.'); }
    finally { setBusy(false); }
  }
  return (
    <div className="admin-field image-upload-field">
      <span>{label}</span>
      <div className="image-upload-controls">
        <input ref={input} type="file" accept={acceptedTypes?.join(',') || 'image/*'} onChange={(e) => void choose(e.target.files?.[0])} />
        <button type="button" onClick={() => input.current?.click()} disabled={busy}>{busy ? 'Processing…' : value ? 'Replace image' : 'Upload image'}</button>
        {value && <img src={value} alt="Selected preview" />}
      </div>
      <small>Images are compressed and saved with this product or special.</small>
      {error && <em className="error">{error}</em>}
    </div>
  );
}

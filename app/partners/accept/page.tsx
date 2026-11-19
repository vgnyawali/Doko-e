'use client';
import { FormEvent, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AcceptPartnerInvitationPage() {
  const token = useSearchParams().get('token') || '';
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget),
      password = String(form.get('password') || ''),
      confirm = String(form.get('confirm') || '');
    if (password !== confirm) {
      setError('Passwords do not match.');
      setBusy(false);
      return;
    }
    try {
      const response = await fetch('/api/partner/auth/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok)
        throw Error(data.error || 'Unable to activate account.');
      location.assign('/partners');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }
  return (
    <main className="partner-auth-shell">
      <form className="partner-auth-card" onSubmit={submit}>
        <p className="eyebrow">Doko partner marketplace</p>
        <h1>Create your partner password</h1>
        <p>
          Choose a password with at least 12 characters. This invitation link
          can be used once.
        </p>
        {!token && <p className="error">The invitation token is missing.</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <label>
          New password
          <input
            name="password"
            type="password"
            minLength={12}
            autoComplete="new-password"
            required
          />
        </label>
        <label>
          Confirm password
          <input
            name="confirm"
            type="password"
            minLength={12}
            autoComplete="new-password"
            required
          />
        </label>
        <button className="primary-button" disabled={busy || !token}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </main>
  );
}

'use client';
import { FormEvent, useState } from 'react';

export default function PartnerLoginPage() {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/partner/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw Error(data.error || 'Unable to sign in.');
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
        <h1>Partner sign in</h1>
        <p>Use the email address and password created from your invitation.</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button className="primary-button" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <a href="/">Return to storefront</a>
      </form>
    </main>
  );
}

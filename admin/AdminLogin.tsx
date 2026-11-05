'use client';
import { useState } from 'react';
export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw Error(data.error || 'Unable to sign in.');
      window.location.assign('/admin');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in.');
      setBusy(false);
    }
  }
  return (
    <form className="admin-login" onSubmit={submit}>
      <h2>Admin login</h2>
      <p>Use your store administrator credentials.</p>
      <label>
        Username
        <input
          required
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      <label>
        Password
        <input
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary-button" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

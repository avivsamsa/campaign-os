'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalLogin({ slug, clientName }: { slug: string; clientName: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? 'התחברות נכשלה');
        return;
      }
      router.replace(`/${slug}`);
      router.refresh();
    } catch {
      setError('שגיאת רשת');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="portal-login">
      <form className="portal-login-card" onSubmit={submit}>
        <h1>{clientName}</h1>
        <p className="muted">הזן/י סיסמה כדי להיכנס לפורטל.</p>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמה"
          autoFocus
          autoComplete="current-password"
        />
        {error && <div className="banner-error">{error}</div>}
        <button className="btn primary" type="submit" disabled={loading || !password}>
          {loading ? 'מתחבר…' : 'כניסה'}
        </button>
        <p className="muted" style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}>
          המערכת תזכור אותך במכשיר זה — לא תצטרך/י להזין סיסמה כל פעם.
        </p>
      </form>
    </div>
  );
}

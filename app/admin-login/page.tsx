'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? 'התחברות נכשלה');
        return;
      }
      const next = params.get('next');
      router.replace(next && next.startsWith('/') ? next : '/adminadmin');
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
        <h1>ניהול מערכת</h1>
        <p className="muted">הזן/י את סיסמת האדמין כדי להיכנס.</p>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמת אדמין"
          autoFocus
          autoComplete="current-password"
        />
        {error && <div className="banner-error">{error}</div>}
        <button className="btn primary" type="submit" disabled={loading || !password}>
          {loading ? 'מתחבר…' : 'כניסה'}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

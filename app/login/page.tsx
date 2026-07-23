'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ClientLogin() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!s || !password || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: s, password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? 'התחברות נכשלה');
        return;
      }
      router.replace(`/${s}`);
      router.refresh();
    } catch {
      setError('שגיאת רשת');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="clogin">
      <style>{`
        .clogin {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem calc(2rem + env(safe-area-inset-bottom));
        }
        .clogin-card {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          text-align: center;
        }
        .clogin-brand { font-size: 0.95rem; font-weight: 700; letter-spacing: 0.16em; color: var(--primary); margin-bottom: 0.75rem; }
        .clogin-card h1 { margin: 0; font-size: 1.7rem; font-weight: 800; color: var(--text); }
        .clogin-card p.sub { margin: 0 0 0.6rem; color: var(--muted); font-size: 0.95rem; }
        .clogin-card .input { text-align: center; font-size: 1.05rem; padding: 0.9rem 1rem; border-radius: var(--radius-lg); }
        .clogin-btn {
          font: inherit; font-weight: 800; font-size: 1.05rem;
          padding: 0.95rem 1rem; border-radius: var(--radius-lg); cursor: pointer;
          border: none; background: var(--primary); color: #fff; margin-top: 0.2rem;
          transition: opacity var(--duration) var(--ease);
        }
        .clogin-btn:disabled { opacity: 0.45; cursor: default; }
        .clogin-note { font-size: 0.78rem; color: var(--muted-2); margin: 0.4rem 0 0; }
        .clogin-back { margin-top: 0.5rem; font-size: 0.85rem; }
        .clogin-back a { color: var(--muted); }
      `}</style>

      <form className="clogin-card" onSubmit={submit}>
        <div className="clogin-brand">CAMPAIGN OS</div>
        <h1>כניסת לקוחות</h1>
        <p className="sub">הזן/י את שם הפורטל והסיסמה שקיבלת.</p>

        <input
          className="input"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="שם הפורטל"
          autoFocus
          dir="ltr"
          autoCapitalize="none"
          autoCorrect="off"
          aria-label="שם הפורטל"
        />
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמה"
          autoComplete="current-password"
          aria-label="סיסמה"
        />

        {error && <div className="banner-error">{error}</div>}

        <button className="clogin-btn" type="submit" disabled={loading || !slug.trim() || !password}>
          {loading ? 'מתחבר…' : 'כניסה'}
        </button>

        <p className="clogin-note">המערכת תזכור אותך במכשיר זה.</p>
        <div className="clogin-back"><Link href="/">חזרה לדף הבית</Link></div>
      </form>
    </main>
  );
}

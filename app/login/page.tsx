'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ClientLogin() {
  const router = useRouter();
  const [slug, setSlug] = useState('');

  function go(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (s) router.push(`/${s}`);
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
          gap: 0.85rem;
          text-align: center;
        }
        .clogin-brand { font-size: 0.95rem; font-weight: 700; letter-spacing: 0.16em; color: var(--primary); margin-bottom: 0.75rem; }
        .clogin-card h1 { margin: 0; font-size: 1.7rem; font-weight: 800; color: var(--text); }
        .clogin-card p { margin: 0 0 0.5rem; color: var(--muted); font-size: 0.95rem; }
        .clogin-card .input {
          text-align: center; font-size: 1.05rem; padding: 0.95rem 1rem;
          border-radius: var(--radius-lg);
        }
        .clogin-btn {
          font: inherit; font-weight: 800; font-size: 1.05rem;
          padding: 0.95rem 1rem; border-radius: var(--radius-lg); cursor: pointer;
          border: none; background: var(--primary); color: #fff;
          transition: opacity var(--duration) var(--ease);
        }
        .clogin-btn:disabled { opacity: 0.45; cursor: default; }
        .clogin-back { margin-top: 0.6rem; font-size: 0.85rem; color: var(--muted-2); }
        .clogin-back a { color: var(--muted); }
      `}</style>

      <form className="clogin-card" onSubmit={go}>
        <div className="clogin-brand">CAMPAIGN OS</div>
        <h1>כניסת לקוחות</h1>
        <p>הזן/י את שם הפורטל שלך כדי להיכנס.</p>
        <input
          className="input"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="שם הפורטל"
          autoFocus
          dir="ltr"
          aria-label="שם הפורטל"
        />
        <button className="clogin-btn" type="submit" disabled={!slug.trim()}>המשך</button>
        <div className="clogin-back"><Link href="/">חזרה לדף הבית</Link></div>
      </form>
    </main>
  );
}

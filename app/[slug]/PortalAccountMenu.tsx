'use client';

import { useEffect, useRef, useState } from 'react';
import LogoutButton from './LogoutButton';
import DeleteAccountButton from './DeleteAccountButton';

export default function PortalAccountMenu({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('theme', next); } catch { /* ignore */ }
  }

  return (
    <div className="pacct" ref={ref}>
      <style>{`
        .pacct { position: relative; display: inline-flex; }
        .pacct-btn { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 999px; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--text); transition: border-color .15s, background .15s; }
        .pacct-btn:hover { border-color: var(--border-strong); background: var(--surface-2); }
        .pacct-menu { position: absolute; top: calc(100% + 8px); inset-inline-end: 0; min-width: 210px; max-width: calc(100vw - 24px); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 6px; display: flex; flex-direction: column; z-index: 70; }
        /* בדסקטופ הכפתור נמצא בסרגל הצמוד לקצה ימין — פתיחה ימינה תחרוג מהמסך.
           לכן פותחים לכיוון פנים העמוד (inline-start = שמאל ב-RTL). */
        @media (min-width: 900px) {
          .portal-side .pacct-menu { inset-inline-start: 0; inset-inline-end: auto; }
        }
        .pacct-menu > *, .pacct-menu .portal-logout, .pacct-menu .portal-delete-link { width: 100%; box-sizing: border-box; display: flex; align-items: center; gap: 10px; justify-content: flex-start; text-align: start; padding: 11px 12px; border-radius: var(--radius); border: none; background: none; font: inherit; color: var(--text); cursor: pointer; }
        .pacct-menu > *:hover, .pacct-menu .portal-logout:hover, .pacct-menu .portal-delete-link:hover { background: var(--surface-2); }
        .pacct-menu .portal-delete-link { color: var(--danger); }
        .pacct-sep { height: 1px; background: var(--border); margin: 4px 8px; padding: 0 !important; }
      `}</style>

      <button className="pacct-btn" onClick={() => setOpen((o) => !o)} aria-label="חשבון" aria-haspopup="menu">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
      </button>

      {open && (
        <div className="pacct-menu" role="menu">
          <button type="button" onClick={toggleTheme}>
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
            )}
            {theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
          </button>
          <div className="pacct-sep" />
          <LogoutButton slug={slug} />
          <DeleteAccountButton slug={slug} />
        </div>
      )}
    </div>
  );
}

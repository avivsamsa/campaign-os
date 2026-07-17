'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ThemeToggle from './ThemeToggle';

const ITEMS = [
  { href: '/adminadmin', label: 'Dashboard' },
  { href: '/clients', label: 'לקוחות' },
  { href: '/performance', label: 'Performance' },
  { href: '/creatives', label: 'קריאטיבים' },
  { href: '/leads', label: 'לידים' },
];

// נתיבי המערכת (אדמין). '/' = דף נחיתה ציבורי, כל נתיב אחר שאינו כאן = פורטל לקוח — בלי sidebar.
const ADMIN_PREFIXES = ['/adminadmin', '/clients', '/creatives', '/leads', '/performance'];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isAdmin = ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const inPortal = !isAdmin;

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    router.replace('/admin-login');
    router.refresh();
  }

  // מסיר את ההזחה של app-main כשמסתירים את הסיידבר (פורטל)
  useEffect(() => {
    if (inPortal) document.body.classList.add('portal-mode');
    else document.body.classList.remove('portal-mode');
  }, [inPortal]);

  // סגירת המגירה במובייל בעת ניווט
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (inPortal) return null;

  const isActive = (href: string) =>
    href === '/adminadmin' ? pathname === '/adminadmin' : pathname.startsWith(href);

  return (
    <>
      {/* סרגל עליון — מובייל בלבד (CSS) */}
      <header className="admin-topbar">
        <button
          type="button"
          className="admin-burger"
          onClick={() => setOpen(true)}
          aria-label="פתח תפריט"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <span className="admin-topbar-brand">Campaign OS</span>
      </header>

      <div
        className={`sidebar-scrim ${open ? 'show' : ''}`.trim()}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${open ? 'open' : ''}`.trim()}>
        <div className="sidebar-brand">Campaign OS</div>
        <nav className="sidebar-nav">
          {ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={isActive(it.href) ? 'active' : ''}
              onClick={() => setOpen(false)}
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <ThemeToggle />
          <button type="button" className="sidebar-logout" onClick={logout}>התנתקות</button>
        </div>
      </aside>
    </>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
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
  const isAdmin = ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const inPortal = !isAdmin;

  // מסיר את ההזחה של app-main כשמסתירים את הסיידבר (פורטל)
  useEffect(() => {
    if (inPortal) document.body.classList.add('portal-mode');
    else document.body.classList.remove('portal-mode');
  }, [inPortal]);

  if (inPortal) return null;

  const isActive = (href: string) =>
    href === '/adminadmin' ? pathname === '/adminadmin' : pathname.startsWith(href);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Campaign OS</div>
      <nav className="sidebar-nav">
        {ITEMS.map((it) => (
          <Link key={it.href} href={it.href} className={isActive(it.href) ? 'active' : ''}>
            {it.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-foot">
        <ThemeToggle />
      </div>
    </aside>
  );
}

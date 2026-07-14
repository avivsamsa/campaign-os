'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import ThemeToggle from './ThemeToggle';

const ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/clients', label: 'לקוחות' },
  { href: '/performance', label: 'Performance' },
  { href: '/creatives', label: 'קריאטיבים' },
  { href: '/products', label: 'מוצרים' },
  { href: '/leads', label: 'לידים' },
];

// נתיבי המערכת (אדמין). כל נתיב אחר = פורטל לקוח (/<slug>/…) — בלי sidebar.
const ADMIN_PREFIXES = ['/clients', '/creatives', '/leads', '/performance', '/products'];

export default function Sidebar() {
  const pathname = usePathname();
  const isAdmin =
    pathname === '/' || ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const inPortal = !isAdmin;

  // מסיר את ההזחה של app-main כשמסתירים את הסיידבר (פורטל)
  useEffect(() => {
    if (inPortal) document.body.classList.add('portal-mode');
    else document.body.classList.remove('portal-mode');
  }, [inPortal]);

  if (inPortal) return null;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

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

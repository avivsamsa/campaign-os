'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/clients', label: 'לקוחות' },
  { href: '/performance', label: 'Performance' },
  { href: '/creatives', label: 'קריאטיבים' },
  { href: '/leads', label: 'לידים' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const inPortal = pathname.startsWith('/portal/') || pathname === '/portal';

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
    </aside>
  );
}

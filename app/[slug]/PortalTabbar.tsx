'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type Item = { key: string; href: string; label: string; exact?: boolean };

const ICONS: Record<string, ReactNode> = {
  home: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  ),
  leads: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  performance: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" /><path d="M7 14l3-3 3 3 5-5" />
    </svg>
  ),
  creatives: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" />
    </svg>
  ),
};

export default function PortalTabbar({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav className="portal-tabbar" aria-label="ניווט">
      {items.map((it) => {
        const active = it.exact ? pathname === it.href : (pathname === it.href || pathname.startsWith(`${it.href}/`));
        return (
          <Link key={it.key} href={it.href} className={`tabbar-item ${active ? 'active' : ''}`}>
            <span className="tabbar-icon">{ICONS[it.key]}</span>
            <span className="tabbar-label">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

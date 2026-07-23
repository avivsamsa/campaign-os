import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getClientBySlug, resolvePortalSession } from '@/lib/portal-session';
import LogoutButton from './LogoutButton';
import DeleteAccountButton from './DeleteAccountButton';
import ThemeToggle from '../ThemeToggle';
import PortalTabbar from './PortalTabbar';
import PortalNotifBell from './PortalNotifBell';

export const dynamic = 'force-dynamic';

// Layout של פורטל הלקוח — בלי ה-sidebar של המערכת. ניווט מוצג רק כשמחוברים.
export default async function PortalSlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { slug: string };
}) {
  const client = await getClientBySlug(params.slug);
  if (!client || !client.has_password) notFound();

  const session = await resolvePortalSession();
  const authed = !!session && session.id === client.id;
  const base = `/${params.slug}`;

  const tabs = [
    { key: 'home', href: base, label: 'בית', exact: true },
    client.show_leads && { key: 'leads', href: `${base}/leads`, label: 'לידים' },
    // התראות עברו לפעמון בפוטר (PortalNotifBell); ביצועים הוסתר כרגע.
    client.show_creatives && { key: 'creatives', href: `${base}/creatives`, label: 'קריאטיבים' },
  ].filter(Boolean) as { key: string; href: string; label: string; exact?: boolean }[];

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="portal-brand">פורטל — {client.name}</div>
        <div className="portal-header-actions">
          <ThemeToggle />
          {authed && <LogoutButton slug={params.slug} />}
          {authed && <DeleteAccountButton slug={params.slug} />}
        </div>
      </header>
      {authed && tabs.length > 0 && <PortalTabbar items={tabs} />}
      <main className="container portal-main">{children}</main>
      {authed && <PortalNotifBell slug={params.slug} />}
    </div>
  );
}

import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getClientBySlug, isAuthedForClient } from '@/lib/portal-session';
import ThemeToggle from '../ThemeToggle';
import PortalTabbar from './PortalTabbar';
import PortalNotifBell from './PortalNotifBell';
import PortalAccountMenu from './PortalAccountMenu';

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

  const authed = isAuthedForClient(client.id);
  const base = `/${params.slug}`;

  const tabs = [
    { key: 'home', href: base, label: 'בית', exact: true },
    client.show_leads && { key: 'leads', href: `${base}/leads`, label: 'לידים' },
    // התראות עברו לפעמון בפוטר (PortalNotifBell); ביצועים הוסתר כרגע.
    client.show_creatives && { key: 'creatives', href: `${base}/creatives`, label: 'קריאטיבים' },
  ].filter(Boolean) as { key: string; href: string; label: string; exact?: boolean }[];

  return (
    <div className="portal-shell">
      {/* עטיפה אחת: במובייל היא display:contents (האדר עליון + טאבים תחתונים,
          בדיוק כמו קודם), ובדסקטופ היא הופכת לסרגל צד. אין שכפול קומפוננטות. */}
      <aside className="portal-side">
        <header className="portal-header">
          <div className="portal-brand">פורטל — {client.name}</div>
          <div className="portal-header-actions">
            {authed ? (
              <>
                <PortalNotifBell slug={params.slug} />
                <PortalAccountMenu slug={params.slug} />
                <ThemeToggle />
              </>
            ) : (
              <ThemeToggle />
            )}
          </div>
        </header>
        {authed && tabs.length > 0 && <PortalTabbar items={tabs} />}
      </aside>
      <main className="container portal-main">{children}</main>
    </div>
  );
}

import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { resolvePortalAccess } from '@/lib/portal';

export const dynamic = 'force-dynamic';

// Layout נפרד לפורטל — בלי ה-sidebar של המערכת. כותרת קומפקטית עם שם הלקוח.
export default async function PortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { token: string };
}) {
  const access = await resolvePortalAccess(params.token);
  if (!access) notFound();

  const sb = getSupabaseClient();
  const { data: client } = await sb.from('clients').select('name').eq('id', access.client_id).single();

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="portal-brand">פורטל — {client?.name ?? 'לקוח'}</div>
        <nav className="portal-nav">
          <Link href={`/portal/${params.token}/leads`}>לידים</Link>
        </nav>
      </header>
      <main className="container portal-main">{children}</main>
    </div>
  );
}

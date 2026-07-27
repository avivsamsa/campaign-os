import { notFound, redirect } from 'next/navigation';
import { fetchClientLeads } from '@/lib/leads';
import { getClientBySlug, isAuthedForClient } from '@/lib/portal-session';
import PortalLeadsManager from './PortalLeadsManager';

export const dynamic = 'force-dynamic';

export default async function PortalLeadsPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { category?: string };
}) {
  const client = await getClientBySlug(params.slug);
  if (!client || !client.has_password) notFound();

  if (!isAuthedForClient(client.id)) redirect(`/${params.slug}`);
  if (!client.show_leads) redirect(`/${params.slug}`);

  const leads = await fetchClientLeads(client.id, { heavy: false, portalHide: true });

  // הקטגוריות נבנות מהלידים עצמם — fetchClientLeads כבר מחזיר category_name,
  // אז אין צורך בשאילתת products נוספת (round-trip חסוך).
  const catMap = new Map<string, string>();
  for (const l of leads) {
    if (l.category_id && l.category_name && !catMap.has(l.category_id)) {
      catMap.set(l.category_id, l.category_name);
    }
  }
  const categories = [...catMap].map(([id, name]) => ({ id, name }));

  return (
    <>
      <PortalLeadsManager initialLeads={leads} canEdit={client.show_leads} categories={categories} initialCategory={searchParams.category ?? null} />
    </>
  );
}

import { notFound, redirect } from 'next/navigation';
import { fetchClientLeads } from '@/lib/leads';
import { getClientBySlug, resolvePortalSession } from '@/lib/portal-session';
import { getSupabaseClient } from '@/lib/supabase';
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

  const session = await resolvePortalSession();
  if (!session || session.id !== client.id) redirect(`/${params.slug}`);
  if (!client.show_leads) redirect(`/${params.slug}`);

  const leads = await fetchClientLeads(client.id, { heavy: false });

  // קטגוריות (מוצרים) שיש להן לידים — לשער הקטגוריות בפורטל
  const catIds = [...new Set(leads.map((l) => l.category_id).filter(Boolean) as string[])];
  let categories: { id: string; name: string }[] = [];
  if (catIds.length > 0) {
    const sb = getSupabaseClient();
    const { data } = await sb.from('products').select('id, name').in('id', catIds);
    categories = (data ?? []).map((p) => ({ id: p.id as string, name: p.name as string }));
  }

  return (
    <>
      <PortalLeadsManager initialLeads={leads} canEdit={client.show_leads} categories={categories} initialCategory={searchParams.category ?? null} />
    </>
  );
}

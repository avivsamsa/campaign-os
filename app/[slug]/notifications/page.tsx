import { notFound, redirect } from 'next/navigation';
import { getClientBySlug, isAuthedForClient } from '@/lib/portal-session';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchClientLeads } from '@/lib/leads';
import PortalNotifications from './PortalNotifications';

export const dynamic = 'force-dynamic';

export default async function PortalNotificationsPage({ params }: { params: { slug: string } }) {
  const client = await getClientBySlug(params.slug);
  if (!client || !client.has_password) notFound();

  if (!isAuthedForClient(client.id)) redirect(`/${params.slug}`);

  const leads = await fetchClientLeads(client.id, { heavy: false, portalHide: true });
  const sb = getSupabaseClient();
  const { data: messages } = await sb
    .from('portal_messages')
    .select('id, title, body, created_at')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const items = [
    ...(messages ?? []).map((m) => ({
      kind: 'message' as const,
      at: new Date(m.created_at as string).getTime(),
      id: m.id as string,
      title: m.title as string,
      body: m.body as string,
      created_at: m.created_at as string,
    })),
    ...leads
      .filter((l) => l.status === 'new')
      .map((l) => ({
        kind: 'lead' as const,
        at: new Date(l.created_at).getTime(),
        id: l.id,
        name: l.name,
        category_name: l.category_name,
        created_at: l.created_at,
      })),
  ].sort((a, b) => b.at - a.at);

  return <PortalNotifications slug={params.slug} items={items} now={Date.now()} />;
}

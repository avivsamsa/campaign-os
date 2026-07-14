import { notFound, redirect } from 'next/navigation';
import { fetchClientLeads } from '@/lib/leads';
import { getClientBySlug, resolvePortalSession } from '@/lib/portal-session';
import PortalLeadsManager from './PortalLeadsManager';

export const dynamic = 'force-dynamic';

export default async function PortalLeadsPage({ params }: { params: { slug: string } }) {
  const client = await getClientBySlug(params.slug);
  if (!client || !client.has_password) notFound();

  const session = await resolvePortalSession();
  if (!session || session.id !== client.id) redirect(`/${params.slug}`);
  if (!client.show_leads) redirect(`/${params.slug}`);

  const leads = await fetchClientLeads(client.id);

  return (
    <>
      <h1 style={{ marginBottom: '1rem' }}>הלידים שלך</h1>
      <PortalLeadsManager initialLeads={leads} canEdit={client.show_leads} />
    </>
  );
}

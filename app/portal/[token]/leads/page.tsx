import { notFound } from 'next/navigation';
import { fetchClientLeads } from '@/lib/leads';
import { resolvePortalAccess } from '@/lib/portal';
import PortalLeadsManager from './PortalLeadsManager';

export const dynamic = 'force-dynamic';

export default async function PortalLeadsPage({ params }: { params: { token: string } }) {
  const access = await resolvePortalAccess(params.token);
  if (!access) notFound();

  const leads = await fetchClientLeads(access.client_id);

  return (
    <>
      <h1 style={{ marginBottom: '1rem' }}>הלידים שלך</h1>
      <PortalLeadsManager
        token={params.token}
        initialLeads={leads}
        canEdit={access.can_edit_leads}
      />
    </>
  );
}

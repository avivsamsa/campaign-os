import { notFound } from 'next/navigation';
import { resolvePortalAccess } from '@/lib/portal';
import PortalPerformance from './PortalPerformance';

export const dynamic = 'force-dynamic';

export default async function PortalPerformancePage({ params }: { params: { token: string } }) {
  const access = await resolvePortalAccess(params.token);
  if (!access || !access.can_view_metrics) notFound();

  return (
    <>
      <h1 style={{ marginBottom: '1rem' }}>ביצועים</h1>
      <PortalPerformance token={params.token} />
    </>
  );
}

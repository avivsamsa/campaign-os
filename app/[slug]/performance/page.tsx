import { notFound, redirect } from 'next/navigation';
import { getClientBySlug, resolvePortalSession } from '@/lib/portal-session';
import PortalPerformance from './PortalPerformance';

export const dynamic = 'force-dynamic';

export default async function PortalPerformancePage({ params }: { params: { slug: string } }) {
  const client = await getClientBySlug(params.slug);
  if (!client || !client.has_password) notFound();

  const session = await resolvePortalSession();
  if (!session || session.id !== client.id) redirect(`/${params.slug}`);
  if (!client.show_performance) redirect(`/${params.slug}`);

  return (
    <>
      <h1 style={{ marginBottom: '1rem' }}>ביצועים</h1>
      <PortalPerformance />
    </>
  );
}

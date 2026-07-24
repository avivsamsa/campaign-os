import { notFound } from 'next/navigation';
import { getClientBySlug, isAuthedForClient } from '@/lib/portal-session';
import { computePortalDashboard } from '@/lib/portal-dashboard';
import PortalLogin from './PortalLogin';
import PortalDashboard from './PortalDashboard';

export const dynamic = 'force-dynamic';

// דף הבית של הפורטל: מחובר → דשבורד (KPIs + קמפיינים); אחרת → מסך סיסמה.
export default async function PortalSlugHome({ params }: { params: { slug: string } }) {
  const client = await getClientBySlug(params.slug);
  if (!client || !client.has_password) notFound();

  const authed = isAuthedForClient(client.id);

  if (!authed) {
    return <PortalLogin slug={params.slug} clientName={client.name} />;
  }

  const data = await computePortalDashboard(client.id);
  return <PortalDashboard slug={params.slug} data={data} />;
}

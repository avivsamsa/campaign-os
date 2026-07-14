import { notFound, redirect } from 'next/navigation';
import { getClientBySlug, resolvePortalSession } from '@/lib/portal-session';
import PortalLogin from './PortalLogin';

export const dynamic = 'force-dynamic';

// דף הכניסה של הפורטל: מחובר → הפניה לסעיף הראשון; אחרת → מסך סיסמה.
export default async function PortalSlugHome({ params }: { params: { slug: string } }) {
  const client = await getClientBySlug(params.slug);
  if (!client || !client.has_password) notFound();

  const session = await resolvePortalSession();
  if (session && session.id === client.id) {
    const first = client.show_leads
      ? 'leads'
      : client.show_performance
        ? 'performance'
        : client.show_creatives
          ? 'creatives'
          : null;
    if (first) redirect(`/${params.slug}/${first}`);
  }

  return <PortalLogin slug={params.slug} clientName={client.name} />;
}

import { notFound, redirect } from 'next/navigation';
import { getClientBySlug, isAuthedForClient } from '@/lib/portal-session';
import PortalCreativesGallery from './PortalCreativesGallery';

export const dynamic = 'force-dynamic';

export default async function PortalCreativesPage({ params }: { params: { slug: string } }) {
  const client = await getClientBySlug(params.slug);
  if (!client || !client.has_password) notFound();

  if (!isAuthedForClient(client.id)) redirect(`/${params.slug}`);
  if (!client.show_creatives) redirect(`/${params.slug}`);

  return (
    <>
      <h1 style={{ marginBottom: '1rem' }}>הקריאטיבים שלך</h1>
      <PortalCreativesGallery />
    </>
  );
}

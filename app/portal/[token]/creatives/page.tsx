import { notFound } from 'next/navigation';
import { resolvePortalAccess } from '@/lib/portal';
import PortalCreativesGallery from './PortalCreativesGallery';

export const dynamic = 'force-dynamic';

export default async function PortalCreativesPage({ params }: { params: { token: string } }) {
  const access = await resolvePortalAccess(params.token);
  if (!access || !access.can_view_creatives) notFound();

  return (
    <>
      <h1 style={{ marginBottom: '1rem' }}>הקריאטיבים שלך</h1>
      <PortalCreativesGallery token={params.token} />
    </>
  );
}

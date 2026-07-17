import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import CreativesView from '@/app/creatives/CreativesView';

export const dynamic = 'force-dynamic';

export default async function ClientCreativesPage({ params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  const { data: client, error } = await sb
    .from('clients')
    .select('id, name')
    .eq('id', params.id)
    .single();
  if (error || !client) notFound();

  return <CreativesView lockedClientId={params.id} clientName={client.name as string} />;
}

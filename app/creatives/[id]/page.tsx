import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import CreativeDetail, { type AdUsing, type CreativeRecord } from './CreativeDetail';
import CreativePerformance from './CreativePerformance';

export const dynamic = 'force-dynamic';

export default async function CreativePage({ params }: { params: { id: string } }) {
  const sb = getSupabaseClient();

  const { data: creative, error } = await sb
    .from('creatives')
    .select('*')
    .eq('id', params.id)
    .single();
  if (error || !creative) notFound();

  const { data: ads } = await sb
    .from('ads')
    .select('id, name, status, campaign_id')
    .eq('creative_id', params.id);

  const campaignIds = [...new Set((ads ?? []).map((a) => a.campaign_id).filter(Boolean) as string[])];
  const campaignName = new Map<string, string>();
  if (campaignIds.length > 0) {
    const { data: camps } = await sb.from('campaigns').select('id, name').in('id', campaignIds);
    for (const c of camps ?? []) campaignName.set(c.id as string, (c.name as string) ?? (c.id as string));
  }

  const adsUsing: AdUsing[] = (ads ?? []).map((a) => ({
    id: a.id as string,
    name: (a.name as string) ?? null,
    status: (a.status as string) ?? null,
    campaign: a.campaign_id ? campaignName.get(a.campaign_id) ?? null : null,
  }));

  return (
    <main className="container">
      <div className="breadcrumb">
        <Link href="/creatives">קריאטיבים</Link> / רשומת קריאטיב
      </div>
      <CreativeDetail creative={creative as CreativeRecord} adsUsing={adsUsing} />
      <CreativePerformance
        clientId={(creative as { client_id: string }).client_id}
        creativeId={(creative as CreativeRecord).id}
      />
    </main>
  );
}

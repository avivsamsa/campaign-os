import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import type { Client } from '@/lib/types';
import ReportBuilder from './ReportBuilder';

export const dynamic = 'force-dynamic';

export default async function ClientReportPage({ params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  const { data: client, error } = await sb
    .from('clients')
    .select('id, name, currency')
    .eq('id', params.id)
    .single();
  if (error || !client) notFound();
  const c = client as Pick<Client, 'id' | 'name' | 'currency'>;

  return <ReportBuilder clientId={params.id} clientName={c.name} currency={c.currency} />;
}

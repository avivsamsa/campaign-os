import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchClientLeads } from '@/lib/leads';
import LeadsManager from './LeadsManager';

export const dynamic = 'force-dynamic';

export default async function LeadsPage({ params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  const { data: client, error } = await sb
    .from('clients')
    .select('id, name')
    .eq('id', params.id)
    .single();
  if (error || !client) notFound();

  const leads = await fetchClientLeads(params.id);

  return (
    <main className="container">
      <div className="breadcrumb">
        <Link href="/clients">לקוחות</Link> / <Link href={`/clients/${params.id}`}>{client.name}</Link> /
        לידים
      </div>
      <h1>לידים — {client.name}</h1>
      <LeadsManager clientId={params.id} initialLeads={leads} />
    </main>
  );
}

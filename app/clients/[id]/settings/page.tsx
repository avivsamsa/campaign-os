import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import type { Client, ClientBrain } from '@/lib/types';
import type { Formula } from '@/lib/profit';
import { fetchClientLeads } from '@/lib/leads';
import ClientTabs from '../ClientTabs';

export const dynamic = 'force-dynamic';

export default async function ClientSettingsPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseClient();

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !client) notFound();

  const { data: brain } = await supabase
    .from('client_brain')
    .select('*')
    .eq('client_id', params.id)
    .maybeSingle();

  const { data: profitConfig } = await supabase
    .from('profit_config')
    .select('variables, formulas')
    .eq('client_id', params.id)
    .maybeSingle();

  const leads = await fetchClientLeads(params.id);
  const typedClient = client as Client;

  return (
    <main className="container">
      <div className="breadcrumb">
        <Link href="/clients">לקוחות</Link> /{' '}
        <Link href={`/clients/${params.id}`}>{typedClient.name}</Link> / הגדרות
      </div>
      <ClientTabs
        client={typedClient}
        brain={(brain ?? null) as ClientBrain | null}
        profitConfig={
          (profitConfig as { variables: Record<string, unknown>; formulas: Formula[] } | null) ?? null
        }
        leads={leads}
      />
    </main>
  );
}

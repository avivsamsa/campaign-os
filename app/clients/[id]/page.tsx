import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import type { Client } from '@/lib/types';
import ClientOverview from './ClientOverview';

export const dynamic = 'force-dynamic';

export default async function ClientPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseClient();

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !client) notFound();
  const typedClient = client as Client;

  return (
    <main className="container">
      <div className="breadcrumb">
        <Link href="/clients">לקוחות</Link> / {typedClient.name}
      </div>
      <div className="row-between">
        <h1>{typedClient.name}</h1>
        <Link className="btn" href={`/clients/${params.id}/settings`}>
          הגדרות לקוח
        </Link>
      </div>
      <ClientOverview clientId={params.id} currency={typedClient.currency} />
    </main>
  );
}

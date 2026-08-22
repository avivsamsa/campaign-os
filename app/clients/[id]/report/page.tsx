import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import type { Client } from '@/lib/types';
import ReportBuilder from './ReportBuilder';

export const dynamic = 'force-dynamic';


/** מקבל תאריך ISO (YYYY-MM-DD) מה-query, אחרת undefined. */
function isoParam(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
}

export default async function ClientReportPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const sb = getSupabaseClient();
  const { data: client, error } = await sb
    .from('clients')
    .select('id, name, currency')
    .eq('id', params.id)
    .single();
  if (error || !client) notFound();
  const c = client as Pick<Client, 'id' | 'name' | 'currency'>;

  return (
    <ReportBuilder
      clientId={params.id}
      clientName={c.name}
      currency={c.currency}
      initialSince={isoParam(searchParams.since)}
      initialUntil={isoParam(searchParams.until)}
    />
  );
}

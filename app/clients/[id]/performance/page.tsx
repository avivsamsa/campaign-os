import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import PerformanceView from '@/app/performance/PerformanceView';

export const dynamic = 'force-dynamic';


/** מקבל תאריך ISO (YYYY-MM-DD) מה-query, אחרת undefined. */
function isoParam(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
}

export default async function ClientPerformancePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const sb = getSupabaseClient();
  const { data: client, error } = await sb
    .from('clients')
    .select('id, name')
    .eq('id', params.id)
    .single();
  if (error || !client) notFound();

  return (
    <PerformanceView
      lockedClientId={params.id}
      clientName={client.name as string}
      initialSince={isoParam(searchParams.since)}
      initialUntil={isoParam(searchParams.until)}
    />
  );
}

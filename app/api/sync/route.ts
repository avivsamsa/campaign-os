import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { syncClient, type DateRange } from '@/lib/sync';
import { MetaApiError } from '@/lib/meta';

export const dynamic = 'force-dynamic';

function errorDetail(err: unknown): string {
  if (err instanceof MetaApiError) return err.toReadable();
  return err instanceof Error ? err.message : String(err);
}

// POST /api/sync  body: { client_id, since?, until? }
export async function POST(req: Request) {
  const supabase = getSupabaseClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const clientId = body.client_id as string | undefined;
  if (!clientId) {
    return NextResponse.json({ error: 'client_id חובה' }, { status: 400 });
  }
  const range: DateRange | undefined =
    body.since && body.until
      ? { since: String(body.since), until: String(body.until) }
      : undefined;

  // account_id ל-sync_log (גם אם הסנכרון ייכשל)
  let accountId: string | null = null;
  const { data: c } = await supabase
    .from('clients')
    .select('meta_account_id')
    .eq('id', clientId)
    .maybeSingle();
  accountId = (c?.meta_account_id as string) ?? null;

  try {
    const result = await syncClient(clientId, range);
    await supabase.from('sync_log').insert({
      account_id: accountId,
      level: 'full',
      rows_written: result.rows_written,
      status: 'success',
      error: result.lead_warning ?? null, // אזהרת לידים נרשמת גם בהצלחה
    });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const detail = errorDetail(err);
    await supabase.from('sync_log').insert({
      account_id: accountId,
      level: 'full',
      rows_written: 0,
      status: 'error',
      error: detail,
    });
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}

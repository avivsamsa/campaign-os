import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { syncClient } from '@/lib/sync';
import { MetaApiError } from '@/lib/meta';

export const dynamic = 'force-dynamic';
// 60s לכל ההרצה — מספיק למספר לקוחות. Vercel Hobby: עד 60.
export const maxDuration = 60;

function errorDetail(err: unknown): string {
  if (err instanceof MetaApiError) return err.toReadable();
  return err instanceof Error ? err.message : String(err);
}

/**
 * GET /api/cron/sync — סנכרון אוטומטי של כל הלקוחות.
 * נקרא ע"י Vercel Cron בלו"ז המוגדר ב-vercel.json.
 *
 * אבטחה: אם CRON_SECRET מוגדר ב-env, Vercel מצרף אוטומטית את הכותרת
 * Authorization: Bearer <CRON_SECRET>. אנחנו דוחים בקשות בלי הכותרת.
 * בלי CRON_SECRET — הנתיב פתוח (לא מומלץ לפרודקשן).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const sb = getSupabaseClient();
  const { data: clients, error } = await sb.from('clients').select('id, name, meta_account_id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<Record<string, unknown>> = [];
  let successes = 0;
  let failures = 0;

  for (const c of clients ?? []) {
    const t0 = Date.now();
    try {
      const result = await syncClient(c.id);
      await sb.from('sync_log').insert({
        account_id: c.meta_account_id,
        level: 'cron',
        rows_written: result.rows_written,
        status: 'success',
        error: result.lead_warning ?? null,
      });
      successes += 1;
      results.push({
        client: c.name,
        ok: true,
        rows_written: result.rows_written,
        leads: result.leads,
        lead_warning: result.lead_warning ?? null,
        ms: Date.now() - t0,
      });
    } catch (err) {
      const detail = errorDetail(err);
      await sb.from('sync_log').insert({
        account_id: c.meta_account_id,
        level: 'cron',
        rows_written: 0,
        status: 'error',
        error: detail,
      });
      failures += 1;
      results.push({ client: c.name, ok: false, error: detail, ms: Date.now() - t0 });
    }
  }

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    clients_total: clients?.length ?? 0,
    successes,
    failures,
    results,
  });
}

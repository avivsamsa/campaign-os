/**
 * CLI לסנכרון — מריץ את אותו מנוע כמו /api/sync.
 *
 *   npm run sync                 # מסנכרן את כל הלקוחות
 *   npm run sync -- <client_id>  # לפי UUID של לקוח
 *   npm run sync -- <account_id> # לפי meta_account_id (ספרות)
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { getSupabaseClient } from '../lib/supabase';
import { syncClient } from '../lib/sync';
import { MetaApiError } from '../lib/meta';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorDetail(err: unknown): string {
  if (err instanceof MetaApiError) return err.toReadable();
  return err instanceof Error ? err.message : String(err);
}

async function main() {
  const arg = process.argv[2];
  const supabase = getSupabaseClient();

  const base = supabase.from('clients').select('id, name, meta_account_id');
  const { data: clients, error } = arg
    ? UUID_RE.test(arg)
      ? await base.eq('id', arg)
      : await base.eq('meta_account_id', arg)
    : await base;

  if (error) {
    console.error('שגיאה בטעינת לקוחות:', error.message);
    process.exit(1);
  }
  if (!clients || clients.length === 0) {
    console.error(arg ? `לא נמצא לקוח תואם ל-"${arg}"` : 'אין לקוחות לסנכרון');
    process.exit(1);
  }

  let failures = 0;
  for (const client of clients) {
    process.stdout.write(`סנכרון ${client.name} (act_${client.meta_account_id})... `);
    try {
      const result = await syncClient(client.id);
      await supabase.from('sync_log').insert({
        account_id: client.meta_account_id,
        level: 'full',
        rows_written: result.rows_written,
        status: 'success',
        error: result.lead_warning ?? null,
      });
      console.log(
        `✓ campaigns=${result.campaigns} ads=${result.ads} creatives=${result.creatives} daily_metrics=${result.daily_metrics} leads=${result.leads} (rows_written=${result.rows_written})`,
      );
      if (result.lead_warning) console.log(`  ⚠ leads: ${result.lead_warning}`);
    } catch (err) {
      failures += 1;
      const detail = errorDetail(err);
      await supabase.from('sync_log').insert({
        account_id: client.meta_account_id,
        level: 'full',
        rows_written: 0,
        status: 'error',
        error: detail,
      });
      console.log(`✗ ${detail}`);
    }
  }

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

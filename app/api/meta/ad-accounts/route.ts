import { NextResponse } from 'next/server';
import { metaGetAll, MetaApiError } from '@/lib/meta';

export const dynamic = 'force-dynamic';

type AdAccount = { account_id: string; name: string };

// GET /api/meta/ad-accounts — חשבונות מודעות שהטוקן רואה (me/adaccounts).
// משמש ל-picker בעמוד יצירת לקוח כדי שלא יזינו ID שגוי.
export async function GET() {
  try {
    const data = await metaGetAll('me/adaccounts', { fields: 'account_id,name' });
    const accounts = (data as AdAccount[]).map((a) => ({ id: a.account_id, name: a.name }));
    accounts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return NextResponse.json({ accounts });
  } catch (err) {
    const detail =
      err instanceof MetaApiError ? err.toReadable() : err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail, accounts: [] }, { status: 500 });
  }
}

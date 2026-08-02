import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchAccountAlerts } from '@/lib/account-status';
import { sendAccountAlertPush } from '@/lib/push';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// אילו סוגי בעיה שולחים push ללקוח. 'review' (בדיקת סיכון) לרוב חולף — לא מטריחים בו.
const PUSH_KINDS = new Set(['payment', 'disabled']);

/**
 * GET /api/cron/account-alerts — בדיקת סטטוס חשבונות המודעות ושליחת push ללקוח
 * כשהחשבון נחסם (בעיית תשלום / השבתה). רץ כל שעה (Vercel Cron, מוגדר ב-vercel.json).
 *
 * מניעת ספאם: לכל לקוח נשמר account_alert_key = "<status>.<reason>". שולחים push
 * רק כשהמצב משתנה (מפתח חדש), ומאפסים ל-null כשהחשבון חוזר להיות תקין.
 *
 * אבטחה: אם CRON_SECRET מוגדר, Vercel מצרף Authorization: Bearer <CRON_SECRET>.
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
  const alerts = await fetchAccountAlerts(); // רק לקוחות עם בעיה

  const { data: clientRows, error: clientErr } = await sb.from('clients').select('id, account_alert_key');
  // בלי עמודת הדדופ אי אפשר למנוע push חוזר — עוצרים (מריצים קודם מיגרציה 0018).
  if (clientErr) {
    return NextResponse.json({ error: clientErr.message, note: 'run migration 0018_account_alert_state' }, { status: 500 });
  }
  const storedKey = new Map(
    (clientRows ?? []).map((c) => [c.id as string, (c.account_alert_key as string | null) ?? null]),
  );
  const problemClientIds = new Set(alerts.map((a) => a.clientId));

  const pushed: { client: string; kind: string; status: number }[] = [];
  for (const a of alerts) {
    if (!PUSH_KINDS.has(a.kind)) continue;
    const key = `${a.status}.${a.reason}`;
    if (storedKey.get(a.clientId) === key) continue; // כבר הותרע על המצב הזה
    await sendAccountAlertPush(a.clientId, a);
    await sb.from('clients').update({ account_alert_key: key }).eq('id', a.clientId);
    pushed.push({ client: a.name, kind: a.kind, status: a.status });
  }

  // חשבונות שחזרו להיות תקינים (או ל-'review') — איפוס המפתח כדי שבעיה עתידית תתריע שוב
  const toClear = (clientRows ?? [])
    .filter((c) => c.account_alert_key && !problemClientIds.has(c.id as string))
    .map((c) => c.id as string);
  if (toClear.length) await sb.from('clients').update({ account_alert_key: null }).in('id', toClear);

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    checked: clientRows?.length ?? 0,
    problems: alerts.length,
    pushed,
    cleared: toClear.length,
  });
}

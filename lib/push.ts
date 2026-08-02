import { getSupabaseClient } from './supabase';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type LeadForPush = { id: string; name: string | null; category?: string | null };

type PushPayload = { title: string; body: string; data?: Record<string, unknown> };

// שליחת push לכל מכשירי הלקוח + ניקוי טוקנים מתים. fire-and-forget — לעולם לא מפיל את הקורא.
async function pushToClient(clientId: string, payload: PushPayload): Promise<void> {
  try {
    const sb = getSupabaseClient();
    const { data: rows } = await sb
      .from('client_push_tokens')
      .select('token')
      .eq('client_id', clientId);

    const tokens = (rows ?? []).map((r) => r.token as string).filter(Boolean);
    if (!tokens.length) return;

    const messages = tokens.map((to) => ({
      to,
      sound: 'default',
      priority: 'high',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });

    // ניקוי טוקנים מתים (המכשיר הסיר את האפליקציה / ביטל הרשאה)
    const json = (await res.json().catch(() => null)) as { data?: Array<{ status?: string; details?: { error?: string } }> } | null;
    const results = json?.data;
    if (Array.isArray(results)) {
      const dead = results
        .map((r, i) => (r?.status === 'error' && r?.details?.error === 'DeviceNotRegistered' ? tokens[i] : null))
        .filter((t): t is string => Boolean(t));
      if (dead.length) await sb.from('client_push_tokens').delete().in('token', dead);
    }
  } catch {
    /* לא מפילים את הקורא בגלל push */
  }
}

// התראת push על ליד חדש — הקטגוריה (המוצר) בכותרת, למשל "ליד חדש · שימשיות".
export async function sendLeadPush(clientId: string, lead: LeadForPush): Promise<void> {
  await pushToClient(clientId, {
    title: lead.category ? `ליד חדש · ${lead.category}` : 'ליד חדש 🎯',
    body: lead.name ? `${lead.name} ממתין לטיפול` : 'ליד חדש ממתין לטיפול',
    data: { type: 'new_lead', leadId: lead.id },
  });
}

// התראת push על בעיה בחשבון המודעות (חסימת תשלום / השבתה).
export async function sendAccountAlertPush(
  clientId: string,
  alert: { kind: 'payment' | 'disabled' | 'review'; message: string },
): Promise<void> {
  const title = alert.kind === 'payment' ? '⚠️ בעיית תשלום בחשבון המודעות' : '🚫 חשבון המודעות מושבת';
  await pushToClient(clientId, {
    title,
    body: alert.message,
    data: { type: 'account_alert' },
  });
}

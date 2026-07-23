import { getSupabaseClient } from './supabase';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type LeadForPush = { id: string; name: string | null };

// שליחת התראת push לכל מכשירי הלקוח על ליד חדש. fire-and-forget — לעולם לא מפיל את הבליעה.
export async function sendLeadPush(clientId: string, lead: LeadForPush): Promise<void> {
  try {
    const sb = getSupabaseClient();
    const { data: rows } = await sb
      .from('client_push_tokens')
      .select('token')
      .eq('client_id', clientId);

    const tokens = (rows ?? []).map((r) => r.token as string).filter(Boolean);
    if (!tokens.length) return;

    const body = lead.name ? `${lead.name} — ליד חדש ממתין לטיפול` : 'ליד חדש ממתין לטיפול';
    const messages = tokens.map((to) => ({
      to,
      sound: 'default',
      title: 'ליד חדש 🎯',
      body,
      priority: 'high',
      data: { type: 'new_lead', leadId: lead.id },
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
    /* לא מפילים ingestion בגלל push */
  }
}

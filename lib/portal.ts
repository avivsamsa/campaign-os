/**
 * עזרי פורטל לקוח — אימות token וטעינת הקשר הגישה.
 * הטוקן הוא UUID שמופיע בנתיב (/portal/<token>/…). אין סיסמה.
 * ביטול: revoked_at != null → גישה נדחית.
 */
import { getSupabaseClient } from './supabase';

export type PortalAccess = {
  token: string;
  client_id: string;
  label: string | null;
  can_edit_leads: boolean;
  can_view_metrics: boolean;
  can_view_creatives: boolean;
  created_at: string;
  last_seen_at: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** מאמת token ומחזיר את ה-access או null אם לא חוקי / מבוטל. מעדכן last_seen_at. */
export async function resolvePortalAccess(token: string): Promise<PortalAccess | null> {
  if (!token || !UUID_RE.test(token)) return null;
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('portal_access')
    .select('token, client_id, label, can_edit_leads, can_view_metrics, can_view_creatives, created_at, last_seen_at, revoked_at')
    .eq('token', token)
    .maybeSingle();
  if (error || !data || data.revoked_at) return null;

  // best-effort עדכון last_seen_at; כשל לא עוצר את הזרימה
  sb.from('portal_access')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('token', token)
    .then(() => undefined, () => undefined);

  return {
    token: data.token,
    client_id: data.client_id,
    label: data.label,
    can_edit_leads: data.can_edit_leads,
    can_view_metrics: data.can_view_metrics,
    can_view_creatives: data.can_view_creatives,
    created_at: data.created_at,
    last_seen_at: data.last_seen_at,
  };
}

/** אימות שהליד שייך ללקוח של הטוקן — מגן מ-IDOR (אחד מהמשתמשים מנסה לערוך ליד של לקוח אחר). */
export async function leadBelongsToClient(leadId: string, clientId: string): Promise<boolean> {
  const sb = getSupabaseClient();
  const { data } = await sb.from('leads').select('client_id').eq('id', leadId).maybeSingle();
  return !!data && data.client_id === clientId;
}

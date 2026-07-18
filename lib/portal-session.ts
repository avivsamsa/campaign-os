/**
 * פתרון session פורטל בצד שרת — קורא את ה-cookie החתום ומחזיר את הלקוח + הרשאות התצוגה.
 * משמש גם ב-Server Components (pages) וגם ב-Route Handlers.
 */
import { cookies, headers } from 'next/headers';
import { getSupabaseClient } from './supabase';
import { readSession, SESSION_COOKIE } from './portal-auth';

export type PortalClient = {
  id: string;
  name: string;
  slug: string | null;
  show_leads: boolean;
  show_performance: boolean;
  show_creatives: boolean;
};

const SELECT =
  'id, name, slug, portal_show_leads, portal_show_performance, portal_show_creatives';

function toClient(row: Record<string, unknown>): PortalClient {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: (row.slug as string) ?? null,
    show_leads: Boolean(row.portal_show_leads),
    show_performance: Boolean(row.portal_show_performance),
    show_creatives: Boolean(row.portal_show_creatives),
  };
}

/**
 * הלקוח המאומת — מ-session cookie (ווב) או מ-Authorization: Bearer (אפליקציה נייטיב).
 */
export async function resolvePortalSession(): Promise<PortalClient | null> {
  const cookieVal = cookies().get(SESSION_COOKIE)?.value;
  const auth = headers().get('authorization');
  const bearer = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const sess = readSession(cookieVal ?? bearer);
  if (!sess) return null;
  const sb = getSupabaseClient();
  const { data } = await sb.from('clients').select(SELECT).eq('id', sess.client_id).maybeSingle();
  return data ? toClient(data) : null;
}

/** חיפוש לקוח לפי slug (case-insensitive) — לעמוד הכניסה. כולל האם הוגדרה סיסמה. */
export async function getClientBySlug(
  slug: string,
): Promise<(PortalClient & { has_password: boolean }) | null> {
  const sb = getSupabaseClient();
  const { data } = await sb
    .from('clients')
    .select(`${SELECT}, portal_password_hash`)
    .ilike('slug', slug)
    .maybeSingle();
  if (!data) return null;
  return { ...toClient(data), has_password: Boolean((data as Record<string, unknown>).portal_password_hash) };
}

/** IDOR guard — ליד שייך ללקוח. */
export async function leadBelongsToClient(leadId: string, clientId: string): Promise<boolean> {
  const sb = getSupabaseClient();
  const { data } = await sb.from('leads').select('client_id').eq('id', leadId).maybeSingle();
  return !!data && data.client_id === clientId;
}

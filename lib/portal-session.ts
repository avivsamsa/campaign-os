/**
 * פתרון session פורטל בצד שרת — קורא את ה-cookie החתום ומחזיר את הלקוח + הרשאות התצוגה.
 * משמש גם ב-Server Components (pages) וגם ב-Route Handlers.
 */
import { cache } from 'react';
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

/** ה-client_id מתוך ה-session החתום — בלי שום פנייה ל-DB. */
function sessionClientId(): string | null {
  const cookieVal = cookies().get(SESSION_COOKIE)?.value;
  const auth = headers().get('authorization');
  const bearer = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  return readSession(cookieVal ?? bearer)?.client_id ?? null;
}

/**
 * האם ה-session מאומת עבור הלקוח הזה — **בלי שאילתת DB**.
 * ה-token חתום ב-HMAC, אז אפשר לסמוך על ה-client_id שבתוכו. משמש בעמודים
 * שכבר טענו את הלקוח דרך getClientBySlug — חוסך round-trip שלם ל-DB.
 */
export function isAuthedForClient(clientId: string): boolean {
  const id = sessionClientId();
  return !!id && id === clientId;
}

/**
 * הלקוח המאומת — מ-session cookie (ווב) או מ-Authorization: Bearer (אפליקציה נייטיב).
 * עטוף ב-cache() כדי שקריאות חוזרות באותה בקשה לא יריצו שאילתה נוספת.
 */
export const resolvePortalSession = cache(async (): Promise<PortalClient | null> => {
  const clientId = sessionClientId();
  if (!clientId) return null;
  const sb = getSupabaseClient();
  const { data } = await sb.from('clients').select(SELECT).eq('id', clientId).maybeSingle();
  return data ? toClient(data) : null;
});

/**
 * חיפוש לקוח לפי slug (case-insensitive) — לעמוד הכניסה. כולל האם הוגדרה סיסמה.
 * עטוף ב-cache(): ה-layout וה-page של אותו slug חולקים שאילתה אחת.
 */
export const getClientBySlug = cache(
  async (slug: string): Promise<(PortalClient & { has_password: boolean }) | null> => {
    const sb = getSupabaseClient();
    const { data } = await sb
      .from('clients')
      .select(`${SELECT}, portal_password_hash`)
      .ilike('slug', slug)
      .maybeSingle();
    if (!data) return null;
    return { ...toClient(data), has_password: Boolean((data as Record<string, unknown>).portal_password_hash) };
  },
);

/** IDOR guard — ליד שייך ללקוח. */
export async function leadBelongsToClient(leadId: string, clientId: string): Promise<boolean> {
  const sb = getSupabaseClient();
  const { data } = await sb.from('leads').select('client_id').eq('id', leadId).maybeSingle();
  return !!data && data.client_id === clientId;
}

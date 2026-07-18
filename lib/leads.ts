/**
 * עזרי לידים — פאזה 5. שליפה מועשרת (תוויות קמפיין/קריאטיב) ולוגיקת closed_at.
 */
import { getSupabaseClient } from './supabase';

// סטטוסי פייפליין מכירה. 'new' = ברירת מחדל ללידים נכנסים. 'closed' עדיין
// המקור ל-revenue (lib/metrics.ts קורא ל-status === 'closed').
export const LEAD_STATUSES = [
  'new',
  'no_answer_1',
  'no_answer_2',
  'followup',
  'meeting_scheduled',
  'whatsapp',
  'quote_sent',
  'closed',
  'irrelevant',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/**
 * תצוגת מספר טלפון ישראלי: +972523456789 → 052-345-6789.
 * אם המספר לא מגיע בתבנית +972 (מדינה אחרת / פורמט לא צפוי) — מוחזר כמו שהוא.
 * לשימוש בתצוגה בלבד; קישורי tel:/wa.me משתמשים במספר המקורי.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return raw ?? '';
  const digits = raw.replace(/\D/g, '');
  if (!digits.startsWith('972')) return raw; // לא תבנית ישראלית — משאירים כמו שהגיע
  let rest = digits.slice(3);
  if (rest.startsWith('0')) rest = rest.slice(1);
  const local = `0${rest}`;
  if (/^0\d{9}$/.test(local)) {
    // נייד: 05X-XXX-XXXX
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }
  if (/^0\d{8}$/.test(local)) {
    // קווי: 0X-XXX-XXXX
    return `${local.slice(0, 2)}-${local.slice(2, 5)}-${local.slice(5)}`;
  }
  return raw; // אורך לא צפוי — משאירים כמו שהגיע
}

export type EnrichedLead = {
  id: string;
  meta_lead_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  deal_value: number | null;
  created_at: string;
  closed_at: string | null;
  ad_id: string | null;
  ad_label: string | null;
  campaign_id: string | null;
  campaign_label: string | null;
  meta_adset_id: string | null;
  adset_label: string | null;
  creative_id: string | null;
  creative_label: string | null;
  creative_thumb: string | null;
  notes_count: number;
  form_id: string | null;
  category_id: string | null; // המוצר/קטגוריה שאליו מנותב הטופס
  category_name: string | null;
  reason_id: string | null; // סיבת "לא רלוונטי" (אם נבחרה)
  reason_label: string | null;
};

/**
 * closed_at הנגזר ממעבר סטטוס:
 *   → closed: שומר את הקיים, או מציב now אם טרם נסגר.
 *   → אחר:   מתאפס ל-null.
 */
export function nextClosedAt(status: string, existing: string | null): string | null {
  if (status === 'closed') return existing ?? new Date().toISOString();
  return null;
}

export async function fetchClientLeads(clientId: string): Promise<EnrichedLead[]> {
  const sb = getSupabaseClient();

  const { data: leads, error } = await sb
    .from('leads')
    .select('id, meta_lead_id, name, phone, email, status, deal_value, created_at, closed_at, ad_id, form_id, reason_id')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = leads ?? [];

  // תוויות סיבות "לא רלוונטי" עבור הלידים המסומנים
  const reasonIds = [...new Set(rows.map((l) => l.reason_id).filter(Boolean) as string[])];
  const reasonLabel = new Map<string, string>();
  if (reasonIds.length > 0) {
    const { data: reasons } = await sb.from('lead_reasons').select('id, label').in('id', reasonIds);
    for (const r of reasons ?? []) reasonLabel.set(r.id as string, r.label as string);
  }

  // ניתוב טופס → קטגוריה (מוצר)
  const { data: routes } = await sb
    .from('lead_form_routes')
    .select('form_id, product_id')
    .eq('client_id', clientId);
  const formToProduct = new Map((routes ?? []).map((r) => [r.form_id as string, r.product_id as string]));

  // שם הקטגוריה (מוצר) — לתצוגה/שער בחירה באפליקציה
  const { data: products } = await sb
    .from('products')
    .select('id, name')
    .eq('client_id', clientId);
  const productName = new Map((products ?? []).map((p) => [p.id as string, p.name as string]));

  const adIds = [...new Set(rows.map((l) => l.ad_id).filter(Boolean) as string[])];
  const adInfo = new Map<
    string,
    {
      campaign_id: string;
      creative_id: string | null;
      meta_adset_id: string | null;
      adset_name: string | null;
      ad_name: string | null;
    }
  >();
  if (adIds.length > 0) {
    const { data: ads } = await sb
      .from('ads')
      .select('id, campaign_id, creative_id, meta_adset_id, meta_adset_name, name')
      .in('id', adIds);
    for (const a of ads ?? []) {
      adInfo.set(a.id as string, {
        campaign_id: a.campaign_id as string,
        creative_id: (a.creative_id as string) ?? null,
        meta_adset_id: (a.meta_adset_id as string) ?? null,
        adset_name: (a.meta_adset_name as string) ?? null,
        ad_name: (a.name as string) ?? null,
      });
    }
  }

  const campaignIds = [...new Set([...adInfo.values()].map((a) => a.campaign_id))];
  const campaignName = new Map<string, string>();
  if (campaignIds.length > 0) {
    const { data: camps } = await sb.from('campaigns').select('id, name').in('id', campaignIds);
    for (const c of camps ?? []) campaignName.set(c.id as string, (c.name as string) ?? (c.id as string));
  }

  const creativeIds = [
    ...new Set([...adInfo.values()].map((a) => a.creative_id).filter(Boolean) as string[]),
  ];
  const creativeLabel = new Map<string, string>();
  const creativeThumb = new Map<string, string | null>();
  if (creativeIds.length > 0) {
    const { data: crs } = await sb
      .from('creatives')
      .select('id, concept, meta_creative_id, asset_url')
      .in('id', creativeIds);
    for (const c of crs ?? []) {
      creativeLabel.set(
        c.id as string,
        (c.concept as string) || `קריאטיב ${c.meta_creative_id ?? c.id}`,
      );
      creativeThumb.set(c.id as string, (c.asset_url as string) ?? null);
    }
  }

  // ספירת הערות פר ליד — סבילות לטבלה חסרה (מיגרציה לא הורצה עדיין → 0).
  const notesCount = new Map<string, number>();
  if (rows.length > 0) {
    const leadIds = rows.map((l) => l.id as string);
    const { data: notes, error: notesErr } = await sb
      .from('lead_notes')
      .select('lead_id')
      .eq('kind', 'note')
      .in('lead_id', leadIds);
    if (!notesErr) {
      for (const n of notes ?? []) {
        notesCount.set(n.lead_id as string, (notesCount.get(n.lead_id as string) ?? 0) + 1);
      }
    }
  }

  return rows.map((l) => {
    const ad = l.ad_id ? adInfo.get(l.ad_id) : undefined;
    const adsetLabel = ad
      ? ad.adset_name || (ad.meta_adset_id ? `Adset ${ad.meta_adset_id}` : null)
      : null;
    return {
      id: l.id as string,
      meta_lead_id: (l.meta_lead_id as string) ?? null,
      name: (l.name as string) ?? null,
      phone: (l.phone as string) ?? null,
      email: (l.email as string) ?? null,
      status: (l.status as string) ?? 'new',
      deal_value: l.deal_value as number | null,
      created_at: l.created_at as string,
      closed_at: (l.closed_at as string) ?? null,
      ad_id: (l.ad_id as string) ?? null,
      ad_label: ad?.ad_name ?? null,
      campaign_id: ad?.campaign_id ?? null,
      campaign_label: ad ? campaignName.get(ad.campaign_id) ?? null : null,
      meta_adset_id: ad?.meta_adset_id ?? null,
      adset_label: adsetLabel,
      creative_id: ad?.creative_id ?? null,
      creative_label: ad?.creative_id ? creativeLabel.get(ad.creative_id) ?? null : null,
      creative_thumb: ad?.creative_id ? creativeThumb.get(ad.creative_id) ?? null : null,
      notes_count: notesCount.get(l.id as string) ?? 0,
      form_id: (l.form_id as string) ?? null,
      category_id: l.form_id ? formToProduct.get(l.form_id as string) ?? null : null,
      category_name: l.form_id
        ? productName.get(formToProduct.get(l.form_id as string) ?? '') ?? null
        : null,
      reason_id: (l.reason_id as string) ?? null,
      reason_label: l.reason_id ? reasonLabel.get(l.reason_id as string) ?? null : null,
    };
  });
}

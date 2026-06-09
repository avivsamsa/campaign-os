/**
 * עזרי לידים — פאזה 5. שליפה מועשרת (תוויות קמפיין/קריאטיב) ולוגיקת closed_at.
 */
import { getSupabaseClient } from './supabase';

export const LEAD_STATUSES = ['new', 'contacted', 'closed', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

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
  creative_id: string | null;
  campaign_label: string | null;
  creative_label: string | null;
  creative_thumb: string | null;
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
    .select('id, meta_lead_id, name, phone, email, status, deal_value, created_at, closed_at, ad_id')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = leads ?? [];

  const adIds = [...new Set(rows.map((l) => l.ad_id).filter(Boolean) as string[])];
  const adInfo = new Map<string, { campaign_id: string; creative_id: string | null }>();
  if (adIds.length > 0) {
    const { data: ads } = await sb.from('ads').select('id, campaign_id, creative_id').in('id', adIds);
    for (const a of ads ?? []) {
      adInfo.set(a.id as string, {
        campaign_id: a.campaign_id as string,
        creative_id: (a.creative_id as string) ?? null,
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

  return rows.map((l) => {
    const ad = l.ad_id ? adInfo.get(l.ad_id) : undefined;
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
      creative_id: ad?.creative_id ?? null,
      campaign_label: ad ? campaignName.get(ad.campaign_id) ?? null : null,
      creative_label: ad?.creative_id ? creativeLabel.get(ad.creative_id) ?? null : null,
      creative_thumb: ad?.creative_id ? creativeThumb.get(ad.creative_id) ?? null : null,
    };
  });
}

import { getSupabaseClient } from './supabase';
import { fetchClientLeads } from './leads';

export type PortalDashboard = {
  totals: { leads: number; new: number; closed: number; revenue: number; profit: number };
  categories: { key: string; name: string; count: number; new_count: number }[];
};

/**
 * חישוב KPIs + קטגוריות לדשבורד הפורטל. משותף ל-API ולעמוד הפורטל בווב.
 */
export async function computePortalDashboard(clientId: string): Promise<PortalDashboard> {
  const sb = getSupabaseClient();

  // הכל במקביל — fetchClientLeads הכבד רץ יחד עם products + client (שלא תלויים בו)
  const [leads, productsRes, cRes] = await Promise.all([
    fetchClientLeads(clientId, { heavy: false }),
    sb.from('products').select('id, profit_mode, margin_pct, profit_amount').eq('client_id', clientId),
    sb.from('clients').select('gross_margin').eq('id', clientId).maybeSingle(),
  ]);

  const prodById = new Map((productsRes.data ?? []).map((p) => [p.id as string, p]));
  const grossMargin = Number(cRes.data?.gross_margin ?? 0.5);

  let newCount = 0;
  let closed = 0;
  let revenue = 0;
  let profit = 0;
  const catMap = new Map<string, { key: string; name: string; count: number; new_count: number }>();

  for (const l of leads) {
    if (l.status === 'new') newCount += 1;
    if (l.status === 'closed') {
      closed += 1;
      const dv = Number(l.deal_value ?? 0);
      revenue += dv;
      const p = l.category_id ? prodById.get(l.category_id) : null;
      if (p) {
        profit +=
          p.profit_mode === 'fixed'
            ? Number(p.profit_amount ?? 0)
            : dv * Number(p.margin_pct ?? grossMargin);
      } else {
        profit += dv * grossMargin;
      }
    }
    const key = l.category_id ?? '__none__';
    const name = l.category_name ?? 'אחר';
    const e = catMap.get(key) ?? { key, name, count: 0, new_count: 0 };
    e.count += 1;
    if (l.status === 'new') e.new_count += 1;
    catMap.set(key, e);
  }

  return {
    totals: { leads: leads.length, new: newCount, closed, revenue, profit: Math.round(profit) },
    categories: [...catMap.values()].filter((x) => x.count > 0),
  };
}

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { resolvePortalSession } from '@/lib/portal-session';
import { fetchClientLeads } from '@/lib/leads';

export const dynamic = 'force-dynamic';

// GET /api/portal/dashboard — KPIs + קטגוריות ללקוח המאומת
export async function GET() {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

  try {
    const leads = await fetchClientLeads(client.id);
    const sb = getSupabaseClient();

    const { data: products } = await sb
      .from('products')
      .select('id, profit_mode, margin_pct, profit_amount')
      .eq('client_id', client.id);
    const prodById = new Map((products ?? []).map((p) => [p.id as string, p]));

    const { data: c } = await sb
      .from('clients')
      .select('gross_margin')
      .eq('id', client.id)
      .maybeSingle();
    const grossMargin = Number(c?.gross_margin ?? 0.5);

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

    return NextResponse.json({
      client_name: client.name,
      totals: { leads: leads.length, new: newCount, closed, revenue, profit: Math.round(profit) },
      categories: [...catMap.values()].filter((x) => x.count > 0),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

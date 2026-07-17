import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchClientLeads } from '@/lib/leads';
import { queryMetrics } from '@/lib/metrics';
import type { Product } from '@/lib/products';

export const dynamic = 'force-dynamic';

// רווח-מכירות (ברוטו) לפי מודל הקטגוריה
function grossProfit(p: Product, revenue: number, closes: number): number {
  return p.profit_mode === 'margin'
    ? revenue * (p.margin_pct ?? 0)
    : closes * (p.profit_amount ?? 0);
}

type Bucket = { leads: number; closed: number; revenue: number };

// GET /api/clients/[id]/report?since&until
// דוח מסכם ללקוח: סיכום כללי + פילוח לפי קטגוריה (מוצר), משוייך דרך ניתוב טופס הליד.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const since = searchParams.get('since');
  const until = searchParams.get('until');
  if (!since || !until) {
    return NextResponse.json({ error: 'since ו-until חובה' }, { status: 400 });
  }

  try {
    const sb = getSupabaseClient();

    // מוצרים (קטגוריות) של הלקוח
    const { data: productsRaw } = await sb
      .from('products')
      .select('id, name, profit_mode, price, margin_pct, profit_amount')
      .eq('client_id', params.id)
      .order('created_at', { ascending: true });
    const products = (productsRaw ?? []) as Product[];
    const productById = new Map(products.map((p) => [p.id, p]));

    // לידים מועשרים — כוללים category_id (המוצר שאליו מנותב הטופס)
    const leads = await fetchClientLeads(params.id);

    const inRange = (d: string | null) => !!d && d.slice(0, 10) >= since && d.slice(0, 10) <= until;

    // buckets פר קטגוריה + סיכום כללי + "ללא קטגוריה"
    const byCat = new Map<string, Bucket>();
    const NONE = '__none__';
    const bucket = (key: string) => {
      let b = byCat.get(key);
      if (!b) {
        b = { leads: 0, closed: 0, revenue: 0 };
        byCat.set(key, b);
      }
      return b;
    };

    const overall: Bucket = { leads: 0, closed: 0, revenue: 0 };
    for (const l of leads) {
      const catKey = l.category_id ?? NONE;
      if (inRange(l.created_at)) {
        bucket(catKey).leads += 1;
        overall.leads += 1;
      }
      if (l.status === 'closed' && inRange(l.closed_at)) {
        const val = Number(l.deal_value) || 0;
        const b = bucket(catKey);
        b.closed += 1;
        b.revenue += val;
        overall.closed += 1;
        overall.revenue += val;
      }
    }

    // הוצאת פרסום — כוללת + פר קטגוריה (משוייכת דרך creative → product).
    let spend = 0;
    const spendByCat = new Map<string, number>();
    try {
      const m = await queryMetrics({ client_id: params.id }, 'day', { since, until });
      spend = m.rollup.spend;
    } catch {
      spend = 0;
    }
    try {
      const mc = await queryMetrics({ client_id: params.id }, 'category', { since, until });
      for (const row of mc.rows) spendByCat.set(row.key, row.spend);
    } catch {
      /* ignore — אין שיוך קטגוריה */
    }

    const categories = products.map((p) => {
      const b = byCat.get(p.id) ?? { leads: 0, closed: 0, revenue: 0 };
      const catSpend = spendByCat.get(p.id) ?? 0;
      return {
        id: p.id,
        name: p.name,
        leads: b.leads,
        closed: b.closed,
        revenue: b.revenue,
        profit: grossProfit(p, b.revenue, b.closed),
        spend: catSpend,
        cpl: b.leads > 0 ? catSpend / b.leads : null,
      };
    });

    const noneBucket = byCat.get(NONE);
    const uncategorized =
      noneBucket && (noneBucket.leads > 0 || noneBucket.closed > 0)
        ? {
            leads: noneBucket.leads,
            closed: noneBucket.closed,
            revenue: noneBucket.revenue,
            spend: spendByCat.get('(none)') ?? 0,
          }
        : null;

    const totalProfit = categories.reduce((s, c) => s + c.profit, 0);

    return NextResponse.json({
      since,
      until,
      overall: {
        leads: overall.leads,
        closed: overall.closed,
        revenue: overall.revenue,
        profit: totalProfit,
        spend,
        cpl: overall.leads > 0 ? spend / overall.leads : null,
      },
      categories,
      uncategorized,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

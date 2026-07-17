import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { queryMetrics } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

type ClientRow = {
  id: string;
  name: string;
  currency: string | null;
  spend: number;
  leads: number;
  closed: number;
  revenue: number;
  profit: number;
  roas: number | null;
  cpl: number | null;
  error?: boolean;
};

type Alert = { clientId: string; name: string; type: 'loss' | 'low_roas' | 'no_leads'; message: string };

// GET /api/dashboard?since&until — סיכום מצטבר על כל הלקוחות + התראות
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const since = searchParams.get('since');
  const until = searchParams.get('until');
  if (!since || !until) {
    return NextResponse.json({ error: 'since ו-until חובה' }, { status: 400 });
  }

  try {
    const sb = getSupabaseClient();
    const { data: clientsRaw, error } = await sb
      .from('clients')
      .select('id, name, currency')
      .order('name', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const clients = (clientsRaw ?? []) as { id: string; name: string; currency: string | null }[];

    // סדרה יומית מצטברת (לגרף מגמה)
    const seriesMap = new Map<string, { spend: number; leads: number }>();

    const results = await Promise.all(
      clients.map(async (c) => {
        try {
          const m = await queryMetrics({ client_id: c.id }, 'day', { since, until });
          for (const day of m.rows) {
            const b = seriesMap.get(day.key) ?? { spend: 0, leads: 0 };
            b.spend += day.spend;
            b.leads += day.leads;
            seriesMap.set(day.key, b);
          }
          const r = m.rollup;
          const pc = m.formula_columns.find(
            (fc) => /profit|רווח/i.test(fc.key) || /profit|רווח/i.test(fc.label),
          );
          const profit =
            pc && r.computed?.[pc.key] != null ? (r.computed[pc.key] as number) : r.revenue - r.spend;
          return {
            id: c.id,
            name: c.name,
            currency: c.currency,
            spend: r.spend,
            leads: r.leads,
            closed: r.closes,
            revenue: r.revenue,
            profit,
            roas: r.spend > 0 ? r.revenue / r.spend : null,
            cpl: r.cpl,
          } as ClientRow;
        } catch {
          return {
            id: c.id,
            name: c.name,
            currency: c.currency,
            spend: 0,
            leads: 0,
            closed: 0,
            revenue: 0,
            profit: 0,
            roas: null,
            cpl: null,
            error: true,
          } as ClientRow;
        }
      }),
    );
    const rows: ClientRow[] = results;

    // ציר תאריכים רציף מ-since עד until (ממלא ימים חסרים באפס)
    const series: { date: string; spend: number; leads: number }[] = [];
    {
      const d = new Date(`${since}T00:00:00Z`);
      const end = new Date(`${until}T00:00:00Z`);
      let guard = 0;
      while (d <= end && guard < 400) {
        const key = d.toISOString().slice(0, 10);
        const b = seriesMap.get(key);
        series.push({ date: key, spend: b?.spend ?? 0, leads: b?.leads ?? 0 });
        d.setUTCDate(d.getUTCDate() + 1);
        guard++;
      }
    }

    const sum = (f: (r: ClientRow) => number) => rows.reduce((s, r) => s + f(r), 0);
    const totalSpend = sum((r) => r.spend);
    const totalLeads = sum((r) => r.leads);
    const totalRevenue = sum((r) => r.revenue);
    const totals = {
      clients: rows.length,
      spend: totalSpend,
      leads: totalLeads,
      closed: sum((r) => r.closed),
      revenue: totalRevenue,
      profit: sum((r) => r.profit),
      roas: totalSpend > 0 ? totalRevenue / totalSpend : null,
      cpl: totalLeads > 0 ? totalSpend / totalLeads : null,
    };

    // התראות — רק ללקוחות פעילים (spend > 0)
    const alerts: Alert[] = [];
    for (const r of rows) {
      if (r.error || r.spend <= 0) continue;
      if (r.profit < 0) {
        alerts.push({ clientId: r.id, name: r.name, type: 'loss', message: 'רווח שלילי בטווח' });
      }
      if (r.roas != null && r.roas < 1) {
        alerts.push({ clientId: r.id, name: r.name, type: 'low_roas', message: `ROAS נמוך (${r.roas.toFixed(2)}×)` });
      }
      if (r.leads === 0) {
        alerts.push({ clientId: r.id, name: r.name, type: 'no_leads', message: 'הוצאה בלי לידים בטווח' });
      }
    }

    return NextResponse.json({ since, until, totals, clients: rows, alerts, series });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

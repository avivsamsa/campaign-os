import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { nextClosedAt, LEAD_STATUSES, type LeadStatus } from '@/lib/leads';
import { parseLeadCsv } from '@/lib/leadsheet';

export const dynamic = 'force-dynamic';

/**
 * POST /api/clients/[id]/leads/import — קריאת CSV בחזרה וסנכרון status + deal_value.
 * גוף הבקשה: טקסט ה-CSV (text/csv) או JSON { csv }.
 * זיהוי הליד: lead_id (uuid) → fallback meta_lead_id. רק לידים של הלקוח הזה מתעדכנים.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();

  let csv = '';
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    csv = (body.csv as string) ?? '';
  } else {
    csv = await req.text();
  }
  if (!csv.trim()) return NextResponse.json({ error: 'CSV ריק' }, { status: 400 });

  const updates = parseLeadCsv(csv);
  if (updates.length === 0) return NextResponse.json({ updated: 0, skipped: 0 });

  // מפת הלידים של הלקוח (id + meta_lead_id) — לאימות שייכות וזיהוי
  const { data: clientLeads, error } = await sb
    .from('leads')
    .select('id, meta_lead_id, status, closed_at')
    .eq('client_id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byId = new Map((clientLeads ?? []).map((l) => [l.id as string, l]));
  const byMeta = new Map(
    (clientLeads ?? []).filter((l) => l.meta_lead_id).map((l) => [l.meta_lead_id as string, l]),
  );

  let updated = 0;
  let skipped = 0;

  for (const u of updates) {
    const target =
      (u.lead_id && byId.get(u.lead_id)) || (u.meta_lead_id && byMeta.get(u.meta_lead_id)) || null;
    if (!target) {
      skipped += 1;
      continue;
    }

    const newStatus =
      u.status && LEAD_STATUSES.includes(u.status as LeadStatus)
        ? (u.status as LeadStatus)
        : (target.status as string);

    const patch: Record<string, unknown> = {
      status: newStatus,
      closed_at: nextClosedAt(newStatus, (target.closed_at as string) ?? null),
    };
    if (u.deal_value !== undefined) patch.deal_value = u.deal_value;

    const { error: upErr } = await sb.from('leads').update(patch).eq('id', target.id);
    if (upErr) {
      skipped += 1;
    } else {
      updated += 1;
    }
  }

  return NextResponse.json({ updated, skipped });
}

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { LEAD_STATUSES, nextClosedAt, type LeadStatus } from '@/lib/leads';
import { resolvePortalSession, leadBelongsToClient } from '@/lib/portal-session';

export const dynamic = 'force-dynamic';

// PATCH /api/portal/leads/[leadId] — עדכון status / deal_value ע"י הלקוח (session)
export async function PATCH(req: Request, { params }: { params: { leadId: string } }) {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
  if (!client.show_leads) return NextResponse.json({ error: 'אין הרשאת עריכה' }, { status: 403 });

  const owned = await leadBelongsToClient(params.leadId, client.id);
  if (!owned) return NextResponse.json({ error: 'ליד לא נמצא' }, { status: 404 });

  let body: { status?: string; deal_value?: number | string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const sb = getSupabaseClient();

  // status תקין = built-in או סטטוס מותאם ששייך ללקוח
  const status = body.status as LeadStatus | undefined;
  if (status && !LEAD_STATUSES.includes(status)) {
    const { data: custom } = await sb
      .from('lead_statuses')
      .select('id')
      .eq('id', status)
      .eq('client_id', client.id)
      .maybeSingle();
    if (!custom) return NextResponse.json({ error: 'status לא תקין' }, { status: 400 });
  }
  const { data: existing } = await sb
    .from('leads')
    .select('status, closed_at')
    .eq('id', params.leadId)
    .single();
  if (!existing) return NextResponse.json({ error: 'ליד לא נמצא' }, { status: 404 });

  const newStatus = status ?? (existing.status as string);
  const update: Record<string, unknown> = { status: newStatus };
  if (body.deal_value !== undefined) {
    const dv = body.deal_value === null || body.deal_value === '' ? null : Number(body.deal_value);
    update.deal_value = dv !== null && Number.isFinite(dv) ? dv : null;
  }
  update.closed_at = nextClosedAt(newStatus, (existing.closed_at as string) ?? null);

  const { data, error } = await sb.from('leads').update(update).eq('id', params.leadId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}

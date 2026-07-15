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

  let body: { status?: string; deal_value?: number | string | null; reason_id?: string | null };
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

  const oldStatus = existing.status as string;
  const newStatus = status ?? oldStatus;
  const update: Record<string, unknown> = { status: newStatus };
  if (body.deal_value !== undefined) {
    const dv = body.deal_value === null || body.deal_value === '' ? null : Number(body.deal_value);
    update.deal_value = dv !== null && Number.isFinite(dv) ? dv : null;
  }
  update.closed_at = nextClosedAt(newStatus, (existing.closed_at as string) ?? null);

  // סיבת "לא רלוונטי": חובה בעת מעבר ל-irrelevant; מתאפסת כשעוברים לסטטוס אחר.
  let reasonLabel: string | null = null;
  if (newStatus === 'irrelevant') {
    const reasonId = body.reason_id ? String(body.reason_id) : null;
    if (!reasonId) return NextResponse.json({ error: 'חובה לבחור סיבה' }, { status: 400 });
    const { data: reason } = await sb
      .from('lead_reasons')
      .select('id, label')
      .eq('id', reasonId)
      .eq('client_id', client.id)
      .maybeSingle();
    if (!reason) return NextResponse.json({ error: 'סיבה לא תקינה' }, { status: 400 });
    reasonLabel = (reason.label as string) ?? null;
    update.reason_id = reasonId;
  } else {
    update.reason_id = null;
  }

  const { data, error } = await sb.from('leads').update(update).eq('id', params.leadId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // רישום אירוע ליומן הפעילות (best-effort) — רק כשהסטטוס באמת השתנה
  if (newStatus !== oldStatus) {
    const kind =
      newStatus === 'closed' ? 'purchase' : newStatus === 'irrelevant' ? 'irrelevant' : 'status';
    const meta: Record<string, unknown> = { from: oldStatus, to: newStatus };
    if (kind === 'purchase') meta.amount = update.deal_value ?? null;
    if (kind === 'irrelevant') meta.reason = reasonLabel;
    await sb.from('lead_notes').insert({ lead_id: params.leadId, body: '', kind, meta });
  }

  return NextResponse.json({ lead: data });
}

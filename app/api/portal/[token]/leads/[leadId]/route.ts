import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { LEAD_STATUSES, nextClosedAt, type LeadStatus } from '@/lib/leads';
import { leadBelongsToClient, resolvePortalAccess } from '@/lib/portal';

export const dynamic = 'force-dynamic';

// PATCH /api/portal/[token]/leads/[leadId] — עדכון status / deal_value ע"י לקוח דרך הפורטל
export async function PATCH(
  req: Request,
  { params }: { params: { token: string; leadId: string } },
) {
  const access = await resolvePortalAccess(params.token);
  if (!access) return NextResponse.json({ error: 'גישה לא חוקית' }, { status: 403 });
  if (!access.can_edit_leads) return NextResponse.json({ error: 'אין הרשאת עריכה' }, { status: 403 });

  const ownedByClient = await leadBelongsToClient(params.leadId, access.client_id);
  if (!ownedByClient) return NextResponse.json({ error: 'ליד לא נמצא' }, { status: 404 });

  let body: { status?: string; deal_value?: number | string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const status = body.status as LeadStatus | undefined;
  if (status && !LEAD_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'status לא תקין' }, { status: 400 });
  }

  const sb = getSupabaseClient();
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

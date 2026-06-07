import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { LEAD_STATUSES, nextClosedAt, type LeadStatus } from '@/lib/leads';

export const dynamic = 'force-dynamic';

// PATCH /api/leads/[id] — עדכון ידני של status + deal_value
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();

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

  // קריאת המצב הקיים לחישוב closed_at
  const { data: existing, error: readErr } = await sb
    .from('leads')
    .select('status, closed_at')
    .eq('id', params.id)
    .single();
  if (readErr || !existing) {
    return NextResponse.json({ error: 'ליד לא נמצא' }, { status: 404 });
  }

  const newStatus = status ?? (existing.status as string);
  const update: Record<string, unknown> = { status: newStatus };

  if (body.deal_value !== undefined) {
    const dv = body.deal_value === null || body.deal_value === '' ? null : Number(body.deal_value);
    update.deal_value = dv !== null && Number.isFinite(dv) ? dv : null;
  }
  update.closed_at = nextClosedAt(newStatus, (existing.closed_at as string) ?? null);

  const { data, error } = await sb
    .from('leads')
    .update(update)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}

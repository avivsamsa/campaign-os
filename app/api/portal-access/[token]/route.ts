import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// PATCH — עדכון הרשאות / label / ביטול-שחזור (revoked_at)
export async function PATCH(req: Request, { params }: { params: { token: string } }) {
  const sb = getSupabaseClient();
  let body: {
    label?: string | null;
    can_edit_leads?: boolean;
    can_view_metrics?: boolean;
    can_view_creatives?: boolean;
    revoked?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }
  const update: Record<string, unknown> = {};
  if ('label' in body) update.label = body.label?.toString().trim() || null;
  if (typeof body.can_edit_leads === 'boolean') update.can_edit_leads = body.can_edit_leads;
  if (typeof body.can_view_metrics === 'boolean') update.can_view_metrics = body.can_view_metrics;
  if (typeof body.can_view_creatives === 'boolean') update.can_view_creatives = body.can_view_creatives;
  if (typeof body.revoked === 'boolean') update.revoked_at = body.revoked ? new Date().toISOString() : null;

  const { data, error } = await sb.from('portal_access').update(update).eq('token', params.token).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ access: data });
}

// DELETE — מחיקה מוחלטת (לעומת revoke שמשאיר היסטוריה)
export async function DELETE(_req: Request, { params }: { params: { token: string } }) {
  const sb = getSupabaseClient();
  const { error } = await sb.from('portal_access').delete().eq('token', params.token);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

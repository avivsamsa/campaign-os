import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/portal-access — רשימת כל קישורי הגישה ללקוח
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('portal_access')
    .select('token, label, can_edit_leads, can_view_metrics, can_view_creatives, created_at, last_seen_at, revoked_at')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ access: data ?? [] });
}

// POST /api/clients/[id]/portal-access — יצירת token חדש
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  let body: { label?: string; can_edit_leads?: boolean; can_view_metrics?: boolean; can_view_creatives?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }
  const { data, error } = await sb
    .from('portal_access')
    .insert({
      client_id: params.id,
      label: body.label?.trim() || null,
      can_edit_leads: body.can_edit_leads ?? true,
      can_view_metrics: body.can_view_metrics ?? false,
      can_view_creatives: body.can_view_creatives ?? false,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ access: data }, { status: 201 });
}

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { leadBelongsToClient, resolvePortalAccess } from '@/lib/portal';

export const dynamic = 'force-dynamic';

// GET /api/portal/[token]/leads/[leadId]/notes
export async function GET(
  _req: Request,
  { params }: { params: { token: string; leadId: string } },
) {
  const access = await resolvePortalAccess(params.token);
  if (!access) return NextResponse.json({ error: 'גישה לא חוקית' }, { status: 403 });
  const owned = await leadBelongsToClient(params.leadId, access.client_id);
  if (!owned) return NextResponse.json({ error: 'ליד לא נמצא' }, { status: 404 });

  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('lead_notes')
    .select('id, body, created_at')
    .eq('lead_id', params.leadId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

// POST /api/portal/[token]/leads/[leadId]/notes — הוספת הערה ע"י לקוח
export async function POST(
  req: Request,
  { params }: { params: { token: string; leadId: string } },
) {
  const access = await resolvePortalAccess(params.token);
  if (!access) return NextResponse.json({ error: 'גישה לא חוקית' }, { status: 403 });
  if (!access.can_edit_leads) return NextResponse.json({ error: 'אין הרשאת עריכה' }, { status: 403 });
  const owned = await leadBelongsToClient(params.leadId, access.client_id);
  if (!owned) return NextResponse.json({ error: 'ליד לא נמצא' }, { status: 404 });

  let body: { body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }
  const text = (body.body ?? '').trim();
  if (!text) return NextResponse.json({ error: 'גוף ההערה לא יכול להיות ריק' }, { status: 400 });

  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('lead_notes')
    .insert({ lead_id: params.leadId, body: text })
    .select('id, body, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data }, { status: 201 });
}

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { resolvePortalSession } from '@/lib/portal-session';
import { isValidStatusColor } from '@/lib/lead-statuses';

export const dynamic = 'force-dynamic';

// GET /api/portal/statuses — הסטטוסים המותאמים של הלקוח המאומת
export async function GET() {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('lead_statuses')
    .select('id, label, color')
    .eq('client_id', client.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ statuses: data ?? [] });
}

// POST /api/portal/statuses — יצירת סטטוס מותאם
export async function POST(req: Request) {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
  if (!client.show_leads) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const label = String(body.label ?? '').trim();
  if (!label) return NextResponse.json({ error: 'שם סטטוס חובה' }, { status: 400 });
  if (label.length > 30) return NextResponse.json({ error: 'שם ארוך מדי' }, { status: 400 });
  const color = isValidStatusColor(body.color) ? body.color : 'gray';

  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('lead_statuses')
    .insert({ client_id: client.id, label, color })
    .select('id, label, color')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: data }, { status: 201 });
}

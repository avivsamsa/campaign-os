import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { resolvePortalSession } from '@/lib/portal-session';

export const dynamic = 'force-dynamic';

type ReasonRow = { id: string; label: string; source: string };

// GET /api/portal/reasons?category=<product_id> — סיבות "לא רלוונטי" לקטגוריה
// (admin שהוגדרו מראש + client שהלקוח הוסיף). category ריק = כלל-לקוח.
export async function GET(req: Request) {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

  const category = new URL(req.url).searchParams.get('category');
  const sb = getSupabaseClient();
  let q = sb
    .from('lead_reasons')
    .select('id, label, source')
    .eq('client_id', client.id)
    .order('created_at', { ascending: true });
  q = category ? q.eq('product_id', category) : q.is('product_id', null);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as ReasonRow[];
  return NextResponse.json({
    admin: rows.filter((r) => r.source === 'admin'),
    client: rows.filter((r) => r.source === 'client'),
  });
}

// POST /api/portal/reasons — הלקוח מוסיף סיבת "אחר". נשמרת פר לקוח+קטגוריה.
export async function POST(req: Request) {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
  if (!client.show_leads) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });

  let body: { label?: string; category?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const label = String(body.label ?? '').trim();
  if (!label) return NextResponse.json({ error: 'סיבה חובה' }, { status: 400 });
  if (label.length > 80) return NextResponse.json({ error: 'סיבה ארוכה מדי' }, { status: 400 });
  const category = body.category ? String(body.category) : null;

  const sb = getSupabaseClient();

  // מניעת כפילות: אם סיבה זהה כבר קיימת באותה קטגוריה — מחזירים אותה
  let existQ = sb
    .from('lead_reasons')
    .select('id, label, source')
    .eq('client_id', client.id)
    .eq('label', label);
  existQ = category ? existQ.eq('product_id', category) : existQ.is('product_id', null);
  const { data: existing } = await existQ.maybeSingle();
  if (existing) return NextResponse.json({ reason: existing });

  const { data, error } = await sb
    .from('lead_reasons')
    .insert({ client_id: client.id, product_id: category, label, source: 'client' })
    .select('id, label, source')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reason: data }, { status: 201 });
}

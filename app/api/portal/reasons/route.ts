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

  // ולידציה של הקטגוריה כ-UUID (מונע injection ל-.or() של PostgREST)
  const rawCat = new URL(req.url).searchParams.get('category');
  const category = rawCat && /^[0-9a-f-]{36}$/i.test(rawCat) ? rawCat : null;
  const sb = getSupabaseClient();
  let q = sb
    .from('lead_reasons')
    .select('id, label, source, product_id')
    .eq('client_id', client.id)
    .order('created_at', { ascending: true });
  // עם קטגוריה: סיבות הקטגוריה + הסיבות ה"כלליות" (product_id=null) שחלות על הכל.
  // בלי קטגוריה: רק הכלליות.
  q = category ? q.or(`product_id.eq.${category},product_id.is.null`) : q.is('product_id', null);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as (ReasonRow & { product_id: string | null })[];
  // דדופ לפי label — סיבה ספציפית-לקטגוריה גוברת על כללית עם אותו שם
  const seen = new Set<string>();
  const deduped: ReasonRow[] = [];
  for (const r of [...rows.filter((r) => r.product_id), ...rows.filter((r) => !r.product_id)]) {
    if (seen.has(r.label)) continue;
    seen.add(r.label);
    deduped.push({ id: r.id, label: r.label, source: r.source });
  }
  return NextResponse.json({
    admin: deduped.filter((r) => r.source === 'admin'),
    client: deduped.filter((r) => r.source === 'client'),
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

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/reasons?category=<product_id>
// מחזיר את סיבות ה"לא רלוונטי" של הקטגוריה + כמה לידים סומנו בכל סיבה (לגרף).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const category = new URL(req.url).searchParams.get('category');
  const sb = getSupabaseClient();

  let q = sb
    .from('lead_reasons')
    .select('id, label, source, created_at')
    .eq('client_id', params.id)
    .order('source', { ascending: true })
    .order('created_at', { ascending: true });
  q = category ? q.eq('product_id', category) : q.is('product_id', null);
  const { data: reasons, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ספירת לידים "לא רלוונטי" לפי reason_id
  const counts = new Map<string, number>();
  const { data: leads } = await sb
    .from('leads')
    .select('reason_id')
    .eq('client_id', params.id)
    .eq('status', 'irrelevant')
    .not('reason_id', 'is', null);
  for (const l of leads ?? []) {
    const rid = l.reason_id as string;
    counts.set(rid, (counts.get(rid) ?? 0) + 1);
  }

  const withCounts = (reasons ?? []).map((r) => ({
    id: r.id as string,
    label: r.label as string,
    source: r.source as string,
    count: counts.get(r.id as string) ?? 0,
  }));
  return NextResponse.json({ reasons: withCounts });
}

// POST /api/clients/[id]/reasons — הוספת סיבת admin לקטגוריה
export async function POST(req: Request, { params }: { params: { id: string } }) {
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

  let existQ = sb.from('lead_reasons').select('id').eq('client_id', params.id).eq('label', label);
  existQ = category ? existQ.eq('product_id', category) : existQ.is('product_id', null);
  const { data: existing } = await existQ.maybeSingle();
  if (existing) return NextResponse.json({ error: 'סיבה כזו כבר קיימת' }, { status: 400 });

  const { data, error } = await sb
    .from('lead_reasons')
    .insert({ client_id: params.id, product_id: category, label, source: 'admin' })
    .select('id, label, source')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reason: { ...data, count: 0 } }, { status: 201 });
}

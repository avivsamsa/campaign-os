import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/lead-forms — טפסי הלידים של הלקוח + הקטגוריה (מוצר) שמשויכת + ספירת לידים
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();

  const { data: forms, error } = await sb
    .from('lead_forms')
    .select('id, name')
    .eq('client_id', params.id)
    .order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: routes } = await sb
    .from('lead_form_routes')
    .select('form_id, product_id')
    .eq('client_id', params.id);
  const routeMap = new Map((routes ?? []).map((r) => [r.form_id as string, r.product_id as string]));

  // ספירת לידים פר טופס
  const { data: leadForms } = await sb
    .from('leads')
    .select('form_id')
    .eq('client_id', params.id)
    .not('form_id', 'is', null);
  const counts = new Map<string, number>();
  for (const l of leadForms ?? []) {
    const fid = l.form_id as string;
    counts.set(fid, (counts.get(fid) ?? 0) + 1);
  }

  return NextResponse.json({
    forms: (forms ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      product_id: routeMap.get(f.id as string) ?? null,
      leads: counts.get(f.id as string) ?? 0,
    })),
  });
}

// PUT /api/clients/[id]/lead-forms — שיוך טופס לקטגוריה (מוצר). product_id=null מנתק.
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  let body: { form_id?: string; product_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }
  const formId = String(body.form_id ?? '').trim();
  if (!formId) return NextResponse.json({ error: 'form_id חובה' }, { status: 400 });

  const productId = body.product_id ? String(body.product_id) : null;
  if (!productId) {
    const { error } = await sb.from('lead_form_routes').delete().eq('form_id', formId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await sb
    .from('lead_form_routes')
    .upsert({ form_id: formId, client_id: params.id, product_id: productId }, { onConflict: 'form_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

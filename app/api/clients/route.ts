import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { validateAccount } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// GET /api/clients — רשימת לקוחות
export async function GET() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data ?? [] });
}

// POST /api/clients — יצירת לקוח + שורת brain (1:1)
export async function POST(req: Request) {
  const supabase = getSupabaseClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const errors = validateAccount({
    name: body.name as string,
    meta_account_id: body.meta_account_id as string,
    gross_margin: body.gross_margin as string | number,
  });
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: 'ולידציה נכשלה', errors }, { status: 400 });
  }

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .insert({
      name: String(body.name).trim(),
      meta_account_id: String(body.meta_account_id).trim(),
      niche: (body.niche as string)?.toString().trim() || null,
      currency: (body.currency as string)?.toString().trim() || 'ILS',
      gross_margin: Number(body.gross_margin),
      agency_fee_monthly: Number(body.agency_fee_monthly) || 0,
    })
    .select()
    .single();

  if (clientErr) return NextResponse.json({ error: clientErr.message }, { status: 500 });

  const brain = (body.brain ?? {}) as Record<string, unknown>;
  const { error: brainErr } = await supabase.from('client_brain').insert({
    client_id: client.id,
    audience: (brain.audience as string) || null,
    language: (brain.language as string) || null,
    tone: (brain.tone as string) || null,
    offers: Array.isArray(brain.offers) ? brain.offers : [],
    brand_md: (brain.brand_md as string) || null,
  });

  if (brainErr) {
    // מניעת יתום: גלגול אחורה של הלקוח אם שורת ה-brain נכשלה
    await supabase.from('clients').delete().eq('id', client.id);
    return NextResponse.json({ error: brainErr.message }, { status: 500 });
  }

  return NextResponse.json({ client }, { status: 201 });
}

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { validateAccount } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id] — לקוח בודד + ה-brain שלו
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseClient();

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: brain } = await supabase
    .from('client_brain')
    .select('*')
    .eq('client_id', params.id)
    .maybeSingle();

  return NextResponse.json({ client, brain });
}

// PATCH /api/clients/[id] — עדכון הגדרות חשבון
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

  const { data: client, error } = await supabase
    .from('clients')
    .update({
      name: String(body.name).trim(),
      meta_account_id: String(body.meta_account_id).trim(),
      niche: (body.niche as string)?.toString().trim() || null,
      currency: (body.currency as string)?.toString().trim() || 'ILS',
      gross_margin: Number(body.gross_margin),
      agency_fee_monthly: Number(body.agency_fee_monthly) || 0,
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client });
}

// DELETE /api/clients/[id] — מחיקת לקוח (cascade מוחק brain)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('clients').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

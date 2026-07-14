import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { normalizeProduct } from '@/lib/products';

export const dynamic = 'force-dynamic';

// PATCH /api/products/[id] — עדכון מוצר
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const parsed = normalizeProduct(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await sb
    .from('products')
    .update(parsed.value)
    .eq('id', params.id)
    .select('id, name, profit_mode, price, margin_pct, profit_amount, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

// DELETE /api/products/[id] — מחיקת מוצר (הקישור בקריאטיבים יתאפס ל-null)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  const { error } = await sb.from('products').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

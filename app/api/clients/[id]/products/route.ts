import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { normalizeProduct } from '@/lib/products';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/products — מוצרי הלקוח + סף מובהקות ל-scorecard
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('products')
    .select('id, name, profit_mode, price, margin_pct, profit_amount, created_at')
    .eq('client_id', params.id)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: client } = await sb
    .from('clients')
    .select('min_spend_significance')
    .eq('id', params.id)
    .maybeSingle();

  return NextResponse.json({
    products: data ?? [],
    min_spend_significance: client?.min_spend_significance ?? 250,
  });
}

// POST /api/clients/[id]/products — יצירת מוצר
export async function POST(req: Request, { params }: { params: { id: string } }) {
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
    .insert({ client_id: params.id, ...parsed.value })
    .select('id, name, profit_mode, price, margin_pct, profit_amount, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

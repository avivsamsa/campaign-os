import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/brain
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('client_brain')
    .select('*')
    .eq('client_id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brain: data });
}

// PUT /api/clients/[id]/brain — upsert (יוצר שורה אם אין)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('client_brain')
    .upsert(
      {
        client_id: params.id,
        audience: (body.audience as string) || null,
        language: (body.language as string) || null,
        tone: (body.tone as string) || null,
        offers: Array.isArray(body.offers) ? body.offers : [],
        brand_md: (body.brand_md as string) || null,
      },
      { onConflict: 'client_id' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brain: data });
}

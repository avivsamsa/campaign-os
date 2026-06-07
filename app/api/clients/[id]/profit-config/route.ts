import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import type { Formula } from '@/lib/profit';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/profit-config
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('profit_config')
    .select('variables, formulas')
    .eq('client_id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    config: data ?? { variables: {}, formulas: [] },
  });
}

// PUT /api/clients/[id]/profit-config — upsert
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();

  let body: { variables?: Record<string, unknown>; formulas?: Formula[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const variables = body.variables ?? {};
  const formulas = Array.isArray(body.formulas) ? body.formulas.filter((f) => f && f.key) : [];

  const { data, error } = await sb
    .from('profit_config')
    .upsert({ client_id: params.id, variables, formulas }, { onConflict: 'client_id' })
    .select('variables, formulas')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config: data });
}

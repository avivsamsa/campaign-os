import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/creatives — קריאטיבים של הלקוח (כולל tags)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('creatives')
    .select(
      'id, concept, hook, variation, format, status, asset_url, full_asset_url, asset_type, meta_creative_id, tags, created_at',
    )
    .eq('client_id', params.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creatives: data ?? [] });
}

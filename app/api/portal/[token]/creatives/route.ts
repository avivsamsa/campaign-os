import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { resolvePortalAccess } from '@/lib/portal';

export const dynamic = 'force-dynamic';

// GET /api/portal/[token]/creatives — קריאטיבים של הלקוח, רק אם can_view_creatives
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const access = await resolvePortalAccess(params.token);
  if (!access) return NextResponse.json({ error: 'גישה לא חוקית' }, { status: 403 });
  if (!access.can_view_creatives) return NextResponse.json({ error: 'אין הרשאת צפייה בקריאטיבים' }, { status: 403 });

  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('creatives')
    .select('id, concept, hook, format, status, asset_url, full_asset_url, asset_type, meta_creative_id, tags, created_at')
    .eq('client_id', access.client_id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creatives: data ?? [] });
}

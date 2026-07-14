import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { resolvePortalSession } from '@/lib/portal-session';

export const dynamic = 'force-dynamic';

// GET /api/portal/creatives — קריאטיבים של הלקוח המאומת, רק אם show_creatives
export async function GET() {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
  if (!client.show_creatives) {
    return NextResponse.json({ error: 'אין גישה לקריאטיבים' }, { status: 403 });
  }

  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('creatives')
    .select('id, concept, hook, format, status, asset_url, full_asset_url, asset_type, meta_creative_id, tags, created_at')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creatives: data ?? [] });
}

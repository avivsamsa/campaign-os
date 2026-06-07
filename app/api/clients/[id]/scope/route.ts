import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/scope?campaign_id=optional
// מחזיר אפשרויות לבוררי ה-scope: campaigns של הלקוח + creatives (מסוננים לקמפיין אם נבחר).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaign_id') || undefined;

  const { data: campaigns, error: campErr } = await sb
    .from('campaigns')
    .select('id, name, conversion_type')
    .eq('client_id', params.id)
    .order('name', { ascending: true });
  if (campErr) return NextResponse.json({ error: campErr.message }, { status: 500 });

  // creatives — אם נבחר קמפיין, רק אלה שמקושרים ל-ads שלו; אחרת כל קריאטיבי הלקוח
  let creativeRows:
    | { id: string; concept: string | null; meta_creative_id: string | null }[]
    | null = null;

  if (campaignId) {
    const { data: ads } = await sb
      .from('ads')
      .select('creative_id')
      .eq('campaign_id', campaignId);
    const creativeIds = [...new Set((ads ?? []).map((a) => a.creative_id).filter(Boolean) as string[])];
    if (creativeIds.length > 0) {
      const { data } = await sb
        .from('creatives')
        .select('id, concept, meta_creative_id')
        .in('id', creativeIds);
      creativeRows = data ?? [];
    } else {
      creativeRows = [];
    }
  } else {
    const { data } = await sb
      .from('creatives')
      .select('id, concept, meta_creative_id')
      .eq('client_id', params.id);
    creativeRows = data ?? [];
  }

  const creatives = (creativeRows ?? []).map((c) => ({
    id: c.id,
    label: c.concept || `קריאטיב ${c.meta_creative_id ?? c.id}`,
  }));

  return NextResponse.json({ campaigns: campaigns ?? [], creatives });
}

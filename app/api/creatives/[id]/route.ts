import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { sanitizeTags } from '@/lib/tags';

export const dynamic = 'force-dynamic';

const FORMATS = ['video', 'image', 'carousel'];

// GET /api/creatives/[id] — קריאטיב בודד + ה-ads שמשתמשים בו
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();

  const { data: creative, error } = await sb
    .from('creatives')
    .select('*')
    .eq('id', params.id)
    .single();
  if (error || !creative) return NextResponse.json({ error: 'קריאטיב לא נמצא' }, { status: 404 });

  const { data: ads } = await sb
    .from('ads')
    .select('id, name, status, campaign_id')
    .eq('creative_id', params.id);

  const campaignIds = [...new Set((ads ?? []).map((a) => a.campaign_id).filter(Boolean) as string[])];
  const campaignName = new Map<string, string>();
  if (campaignIds.length > 0) {
    const { data: camps } = await sb.from('campaigns').select('id, name').in('id', campaignIds);
    for (const c of camps ?? []) campaignName.set(c.id as string, (c.name as string) ?? (c.id as string));
  }

  const adsOut = (ads ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    status: a.status,
    campaign: a.campaign_id ? campaignName.get(a.campaign_id) ?? null : null,
  }));

  return NextResponse.json({ creative, ads: adsOut });
}

// PATCH /api/creatives/[id] — עדכון שדות תיאוריים ו/או tags
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if ('concept' in body) update.concept = (body.concept as string)?.toString().trim() || null;
  if ('hook' in body) update.hook = (body.hook as string)?.toString().trim() || null;
  if ('variation' in body) update.variation = (body.variation as string)?.toString().trim() || null;
  if ('status' in body) update.status = (body.status as string)?.toString().trim() || null;
  if ('asset_url' in body) update.asset_url = (body.asset_url as string)?.toString().trim() || null;
  if ('format' in body) {
    const f = (body.format as string)?.toString().trim();
    if (f && !FORMATS.includes(f)) {
      return NextResponse.json({ error: 'format לא תקין' }, { status: 400 });
    }
    update.format = f || null;
  }
  if ('tags' in body) {
    update.tags = sanitizeTags((body.tags as Record<string, unknown>) ?? {});
  }
  if ('product_id' in body) {
    const p = (body.product_id as string)?.toString().trim();
    update.product_id = p || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'אין שדות לעדכון' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('creatives')
    .update(update)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creative: data });
}

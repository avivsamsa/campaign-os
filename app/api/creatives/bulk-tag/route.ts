import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { isValidTag, TAG_FIELDS } from '@/lib/tags';

export const dynamic = 'force-dynamic';

/**
 * POST /api/creatives/bulk-tag — החלת תג/ים על מספר קריאטיבים.
 * body: { ids: string[], tags: { [field]: value } }.
 * מיזוג עם התגים הקיימים פר קריאטיב; ערך '' מוחק את השדה. value לא חוקי נדחה.
 */
export async function POST(req: Request) {
  const sb = getSupabaseClient();

  let body: { ids?: string[]; tags?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids : [];
  const incoming = body.tags ?? {};
  if (ids.length === 0) return NextResponse.json({ error: 'לא נבחרו קריאטיבים' }, { status: 400 });

  // אימות שדות/ערכים מול ה-enum
  const valid: Record<string, string> = {};
  for (const f of TAG_FIELDS) {
    if (f.key in incoming) {
      const v = incoming[f.key];
      if (!isValidTag(f.key, v)) {
        return NextResponse.json({ error: `ערך לא חוקי לשדה ${f.key}` }, { status: 400 });
      }
      valid[f.key] = v;
    }
  }
  if (Object.keys(valid).length === 0) {
    return NextResponse.json({ error: 'לא סופקו תגים' }, { status: 400 });
  }

  const { data: existing, error } = await sb.from('creatives').select('id, tags').in('id', ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updated = 0;
  for (const c of existing ?? []) {
    const merged: Record<string, string> = { ...((c.tags as Record<string, string>) ?? {}) };
    for (const [k, v] of Object.entries(valid)) {
      if (v === '') delete merged[k];
      else merged[k] = v;
    }
    const { error: upErr } = await sb.from('creatives').update({ tags: merged }).eq('id', c.id);
    if (!upErr) updated += 1;
  }

  return NextResponse.json({ updated });
}

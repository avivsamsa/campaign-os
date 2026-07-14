import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { hashPassword, normalizeSlug } from '@/lib/portal-auth';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/portal-settings — הגדרות הפורטל (בלי לחשוף את הסיסמה)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('clients')
    .select('slug, portal_password_hash, portal_show_leads, portal_show_performance, portal_show_creatives')
    .eq('id', params.id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({
    slug: data.slug ?? null,
    has_password: Boolean(data.portal_password_hash),
    show_leads: data.portal_show_leads,
    show_performance: data.portal_show_performance,
    show_creatives: data.portal_show_creatives,
  });
}

// PATCH /api/clients/[id]/portal-settings — עדכון slug / סיסמה / דגלי תצוגה
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if ('slug' in body) {
    const raw = String(body.slug ?? '').trim();
    if (raw === '') {
      update.slug = null; // ניקוי slug = כיבוי הפורטל
    } else {
      const parsed = normalizeSlug(raw);
      if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
      update.slug = parsed.slug;
    }
  }

  if ('password' in body) {
    const pw = String(body.password ?? '');
    if (pw !== '') {
      if (pw.length < 4) return NextResponse.json({ error: 'סיסמה קצרה מדי (לפחות 4 תווים)' }, { status: 400 });
      update.portal_password_hash = hashPassword(pw);
    }
  }

  for (const [key, col] of [
    ['show_leads', 'portal_show_leads'],
    ['show_performance', 'portal_show_performance'],
    ['show_creatives', 'portal_show_creatives'],
  ] as const) {
    if (key in body) update[col] = Boolean(body[key]);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'אין שדות לעדכון' }, { status: 400 });
  }

  const { error } = await sb.from('clients').update(update).eq('id', params.id);
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'ה-slug כבר בשימוש אצל לקוח אחר' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

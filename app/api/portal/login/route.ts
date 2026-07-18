import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import {
  verifyPassword,
  createSession,
  SESSION_COOKIE,
  normalizeSlug,
} from '@/lib/portal-auth';

export const dynamic = 'force-dynamic';

// POST /api/portal/login  body: { slug, password } → מגדיר session cookie
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const slugParsed = normalizeSlug(String(body.slug ?? ''));
  const password = String(body.password ?? '');
  if ('error' in slugParsed || !password) {
    return NextResponse.json({ error: 'שם או סיסמה חסרים' }, { status: 400 });
  }

  const sb = getSupabaseClient();
  const { data: client } = await sb
    .from('clients')
    .select('id, name, portal_password_hash')
    .ilike('slug', slugParsed.slug)
    .maybeSingle();

  // תשובה אחידה כדי לא לחשוף אם ה-slug קיים
  if (!client || !verifyPassword(password, client.portal_password_hash as string | null)) {
    return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 });
  }

  const { value, maxAge } = createSession(client.id as string);
  // token בגוף — לאפליקציה נייטיב (Bearer); הווב משתמש ב-cookie.
  const res = NextResponse.json({ ok: true, token: value, client: { name: client.name } });
  res.cookies.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  return res;
}

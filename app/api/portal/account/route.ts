import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { resolvePortalSession } from '@/lib/portal-session';
import { SESSION_COOKIE } from '@/lib/portal-auth';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/portal/account — הלקוח מוחק את הגישה שלו לפורטל (Apple 5.1.1(v)).
 * מוחק רק את הכניסה שלו (portal_password_hash → null) + מנתק.
 * הלידים שייכים לסוכנות ואינם נמחקים.
 * פורטל הדגמה ('demo') מוגן — מציג את הזרימה בלי למחוק (כדי שבודקי אפל לא ינעלו את עצמם).
 */
export async function DELETE() {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

  if (client.slug === 'demo') {
    return NextResponse.json({ ok: true, demo: true });
  }

  const sb = getSupabaseClient();
  const { error } = await sb
    .from('clients')
    .update({ portal_password_hash: null })
    .eq('id', client.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}

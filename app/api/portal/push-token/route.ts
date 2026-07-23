import { NextResponse } from 'next/server';
import { resolvePortalSession } from '@/lib/portal-session';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/portal/push-token — רישום Expo push token של המכשיר ללקוח המאומת
export async function POST(req: Request) {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const platform = typeof body.platform === 'string' ? body.platform.slice(0, 16) : null;
  if (!token.startsWith('ExponentPushToken') && !token.startsWith('ExpoPushToken')) {
    return NextResponse.json({ error: 'טוקן לא תקין' }, { status: 400 });
  }

  const sb = getSupabaseClient();
  const { error } = await sb
    .from('client_push_tokens')
    .upsert(
      { client_id: client.id, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'token' },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/portal/push-token — הסרת טוקן (בהתנתקות)
export async function DELETE(req: Request) {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) return NextResponse.json({ ok: true });

  const sb = getSupabaseClient();
  await sb.from('client_push_tokens').delete().eq('client_id', client.id).eq('token', token);
  return NextResponse.json({ ok: true });
}

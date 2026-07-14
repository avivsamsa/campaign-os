import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { resolvePortalSession } from '@/lib/portal-session';

export const dynamic = 'force-dynamic';

// DELETE /api/portal/statuses/[id] — מחיקת סטטוס מותאם; לידים שמסומנים בו חוזרים ל"ליד חדש"
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
  if (!client.show_leads) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });

  const sb = getSupabaseClient();
  // ודא בעלות
  const { data: st } = await sb
    .from('lead_statuses')
    .select('id')
    .eq('id', params.id)
    .eq('client_id', client.id)
    .maybeSingle();
  if (!st) return NextResponse.json({ error: 'סטטוס לא נמצא' }, { status: 404 });

  // לידים עם הסטטוס הזה — חזרה ל'new' כדי למנוע ערך יתום
  await sb.from('leads').update({ status: 'new' }).eq('client_id', client.id).eq('status', params.id);
  const { error } = await sb.from('lead_statuses').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

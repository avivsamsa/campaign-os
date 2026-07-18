import { NextResponse } from 'next/server';
import { resolvePortalSession } from '@/lib/portal-session';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/portal/messages — עדכונים מהסוכנות ללקוח המאומת.
export async function GET() {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('portal_messages')
    .select('id, title, body, created_at')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

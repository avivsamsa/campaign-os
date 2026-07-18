import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/messages — רשימת העדכונים שנשלחו ללקוח (לאדמין).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('portal_messages')
    .select('id, title, body, created_at')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

// POST /api/clients/[id]/messages — שליחת עדכון חדש ללקוח.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  let body: { title?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const title = String(body.title ?? '').trim();
  const text = String(body.body ?? '').trim();
  if (!title) return NextResponse.json({ error: 'כותרת חובה' }, { status: 400 });
  if (title.length > 120) return NextResponse.json({ error: 'כותרת ארוכה מדי' }, { status: 400 });
  if (!text) return NextResponse.json({ error: 'תוכן חובה' }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: 'תוכן ארוך מדי' }, { status: 400 });

  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('portal_messages')
    .insert({ client_id: params.id, title, body: text })
    .select('id, title, body, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
}

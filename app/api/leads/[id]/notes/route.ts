import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/leads/[id]/notes — רשימת הערות (חדש לישן)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('lead_notes')
    .select('id, body, created_at')
    .eq('lead_id', params.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

// POST /api/leads/[id]/notes — יצירת הערה חדשה
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb = getSupabaseClient();
  let body: { body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }
  const text = (body.body ?? '').trim();
  if (!text) return NextResponse.json({ error: 'גוף ההערה לא יכול להיות ריק' }, { status: 400 });

  const { data, error } = await sb
    .from('lead_notes')
    .insert({ lead_id: params.id, body: text })
    .select('id, body, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data }, { status: 201 });
}

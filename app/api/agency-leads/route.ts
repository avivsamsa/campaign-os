import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/agency-leads — טופס ציבורי מדף הנחיתה (סוכנות מתעניינת).
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const name = str(body.name, 120);
  const email = str(body.email, 160);
  const agency_name = str(body.agency_name, 160) || null;
  const phone = str(body.phone, 40) || null;
  const message = str(body.message, 1000) || null;

  if (!name) return NextResponse.json({ error: 'שם חובה' }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'אימייל לא תקין' }, { status: 400 });
  }

  const sb = getSupabaseClient();
  const { error } = await sb
    .from('agency_leads')
    .insert({ name, email, agency_name, phone, message });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

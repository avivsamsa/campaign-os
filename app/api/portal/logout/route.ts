import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/portal-auth';

export const dynamic = 'force-dynamic';

// POST /api/portal/logout — מנקה את ה-session cookie
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}

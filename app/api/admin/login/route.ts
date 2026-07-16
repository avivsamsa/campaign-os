import { NextResponse } from 'next/server';
import { verifyAdminPassword, createAdminSession, ADMIN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// POST /api/admin/login  body: { password } → מגדיר admin_session cookie
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON לא תקין' }, { status: 400 });
  }

  const password = String(body.password ?? '');
  if (!password || !verifyAdminPassword(password)) {
    return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 });
  }

  const { value, maxAge } = createAdminSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  return res;
}

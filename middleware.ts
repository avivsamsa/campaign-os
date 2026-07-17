import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * שער אבטחה לכל נתיבי האדמין (דפים + API).
 * מאמת את ה-admin_session cookie (חתום HMAC, ראה lib/admin-auth.ts) ב-Web Crypto.
 * לא מאומת → דף אדמין מפנה ל-/admin-login; API מחזיר 401.
 * הפורטל, דף הנחיתה, הוובהוקים וטופס הסוכנות אינם כלולים ב-matcher — לא מושפעים.
 */

const ADMIN_COOKIE = 'admin_session';

function b64urlToBytes(s: string) {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = norm.length % 4 ? 4 - (norm.length % 4) : 0;
  const bin = atob(norm + '='.repeat(pad));
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function validAdmin(cookie: string | undefined, secret: string): Promise<boolean> {
  if (!cookie || !secret) return false;
  const dot = cookie.lastIndexOf('.');
  if (dot < 0) return false;
  const payload = cookie.slice(0, dot);
  const sig = cookie.slice(dot + 1);
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(sig), new TextEncoder().encode(payload));
    if (!ok) return false;
    const data = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload)));
    return data.role === 'admin' && !!data.exp && Math.floor(Date.now() / 1000) <= data.exp;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const secret = process.env.PORTAL_SESSION_SECRET ?? '';
  const ok = await validAdmin(req.cookies.get(ADMIN_COOKIE)?.value, secret);
  if (ok) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/admin-login';
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

// נתיבי אדמין בלבד (דפים + API). כל השאר לא עובר דרך ה-middleware.
export const config = {
  matcher: [
    '/adminadmin',
    '/adminadmin/:path*',
    '/clients',
    '/clients/:path*',
    '/creatives',
    '/creatives/:path*',
    '/leads',
    '/leads/:path*',
    '/performance',
    '/performance/:path*',
    '/api/dashboard',
    '/api/account-alerts',
    '/api/clients/:path*',
    '/api/leads/:path*',
    '/api/products/:path*',
    '/api/creatives/:path*',
    '/api/sync',
    '/api/metrics',
    '/api/meta/:path*',
  ],
};

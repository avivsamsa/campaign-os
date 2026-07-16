/**
 * אימות אדמין — סיסמה יחידה מ-env + cookie חתום HMAC (כמו הפורטל).
 * חתימה עם PORTAL_SESSION_SECRET (כבר מוגדר). ה-middleware מאמת ב-Web Crypto.
 *  - ADMIN_PASSWORD ב-env; השוואה ב-timingSafeEqual.
 *  - cookie = base64url({role:'admin',exp}).sig
 */
import { createHmac, timingSafeEqual } from 'crypto';

export const ADMIN_COOKIE = 'admin_session';
export const ADMIN_TTL_DAYS = 30;

function secret(): string {
  const s = process.env.PORTAL_SESSION_SECRET;
  if (!s) throw new Error('Missing PORTAL_SESSION_SECRET in env');
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

/** אימות סיסמת האדמין מול ADMIN_PASSWORD (timing-safe). */
export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** יוצר ערך cookie חתום לאדמין. */
export function createAdminSession(): { value: string; maxAge: number } {
  const maxAge = ADMIN_TTL_DAYS * 24 * 60 * 60;
  const exp = Math.floor(Date.now() / 1000) + maxAge;
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp })).toString('base64url');
  return { value: `${payload}.${sign(payload)}`, maxAge };
}

/** אימות cookie אדמין בצד Node (לשימוש ב-route handlers אם צריך). */
export function readAdminSession(cookieValue: string | undefined | null): boolean {
  if (!cookieValue) return false;
  const dot = cookieValue.lastIndexOf('.');
  if (dot < 0) return false;
  const payload = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.role === 'admin' && !!data.exp && Math.floor(Date.now() / 1000) <= data.exp;
  } catch {
    return false;
  }
}

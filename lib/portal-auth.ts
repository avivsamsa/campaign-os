/**
 * אימות פורטל לקוח — slug + סיסמה + session נזכר במכשיר.
 * ללא תלויות חיצוניות: crypto מובנה של Node.
 *
 *  - סיסמה נשמרת כ-scrypt$salt$hash (לעולם לא plaintext); השוואה ב-timingSafeEqual.
 *  - session = cookie חתום HMAC-SHA256: base64url(payload).sig, payload={cid,exp}.
 *  - הסוד PORTAL_SESSION_SECRET חייב להיות מוגדר ב-env.
 */
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'crypto';

export const SESSION_COOKIE = 'portal_session';
export const SESSION_TTL_DAYS = 60; // "זכור אותי במכשיר"

// ---------- סיסמה ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hashHex] = parts;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ---------- session חתום ----------

function secret(): string {
  const s = process.env.PORTAL_SESSION_SECRET;
  if (!s) throw new Error('Missing PORTAL_SESSION_SECRET in env');
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

/** יוצר ערך cookie חתום עבור לקוח, בתוקף ל-SESSION_TTL_DAYS. */
export function createSession(clientId: string): { value: string; maxAge: number } {
  const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60; // שניות
  const exp = Math.floor(Date.now() / 1000) + maxAge;
  const payload = Buffer.from(JSON.stringify({ cid: clientId, exp })).toString('base64url');
  return { value: `${payload}.${sign(payload)}`, maxAge };
}

/** מאמת cookie ומחזיר client_id, או null אם לא תקין/פג. */
export function readSession(cookieValue: string | undefined | null): { client_id: string } | null {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);

  const expectedSig = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.cid || !data.exp) return null;
    if (Math.floor(Date.now() / 1000) > data.exp) return null;
    return { client_id: String(data.cid) };
  } catch {
    return null;
  }
}

// ---------- slug ----------

// נתיבים שמורים ברמת הדומיין — לקוח לא יכול לתפוס אותם כ-slug.
export const RESERVED_SLUGS = new Set([
  'api',
  'clients',
  'creatives',
  'leads',
  'performance',
  'portal',
  'products',
  'login',
  'logout',
  'admin',
  'dashboard',
  '_next',
  'favicon.ico',
]);

/** נירמול + ולידציה של slug. מחזיר את ה-slug הנקי או שגיאה. */
export function normalizeSlug(raw: string): { slug: string } | { error: string } {
  const slug = raw.trim().toLowerCase();
  if (!slug) return { error: 'slug חובה' };
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(slug)) {
    return { error: 'slug: אותיות אנגליות קטנות, ספרות ומקפים בלבד (2–40 תווים)' };
  }
  if (RESERVED_SLUGS.has(slug)) return { error: `"${slug}" שמור למערכת — בחר slug אחר` };
  return { slug };
}

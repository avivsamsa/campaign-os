import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { ingestLead } from '@/lib/lead-ingest';

export const dynamic = 'force-dynamic';

/**
 * וובהוק לידים דרך Make (Integromat) — חלופה לזמן אמת בלי צורך באימות אפליקציית Meta.
 * Make (מאומת כ-Tech Provider) מקבל את הליד ושולח לנו את ה-leadgen_id; אנחנו מושכים
 * את הליד המלא עם הטוקן שלנו וממפים ללקוח — בדיוק כמו הוובהוק של Meta.
 *
 * אבטחה: סוד משותף ב-MAKE_WEBHOOK_SECRET. Make שולח אותו ב-?key= או בכותרת x-make-secret.
 * הכי מינימלי ב-Make: POST עם גוף { "leadgen_id": "{{id של הליד מהטריגר}}" }.
 */

function authorized(req: Request): boolean {
  const secret = process.env.MAKE_WEBHOOK_SECRET;
  if (!secret) return false; // בלי סוד מוגדר — חסום
  const provided =
    new URL(req.url).searchParams.get('key') ?? req.headers.get('x-make-secret') ?? '';
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function pick(o: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
  }
  return null;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const leadgenId = pick(body, 'leadgen_id', 'lead_id', 'leadgenId', 'id');
  if (!leadgenId) return NextResponse.json({ error: 'leadgen_id חסר' }, { status: 400 });

  // שדות אופציונליים — אם Make כבר שלח אותם, נשתמש בהם ולא נמשוך שוב
  const result = await ingestLead({
    leadgen_id: leadgenId,
    ad_id: pick(body, 'ad_id', 'adId'),
    form_id: pick(body, 'form_id', 'formId'),
    name: pick(body, 'name', 'full_name'),
    phone: pick(body, 'phone', 'phone_number'),
    email: pick(body, 'email'),
    created_time: pick(body, 'created_time', 'createdTime'),
  });

  return NextResponse.json({ ok: true, result });
}

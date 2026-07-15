import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { ingestLead } from '@/lib/lead-ingest';

export const dynamic = 'force-dynamic';

/**
 * Webhook לידים בזמן אמת (Meta leadgen).
 * מטא דוחפת אירוע ברגע שנוצר ליד → אנחנו מושכים אותו מיד ומכניסים ל-DB.
 * הסנכרון היומי (cron) נשאר כרשת ביטחון אם אירוע מפוספס.
 *
 * הגדרה (פעם אחת, בלוח הבקרה של מטא):
 *  - Callback URL: https://<domain>/api/webhooks/meta
 *  - Verify token: הערך של META_WEBHOOK_VERIFY_TOKEN
 *  - הרשמה לשדה 'leadgen' + חיבור העמודים
 * env נדרש: META_APP_SECRET (אימות חתימה), META_WEBHOOK_VERIFY_TOKEN (handshake).
 */

// GET — handshake אימות מול Meta: מחזיר את hub.challenge אם ה-verify token תואם.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const verify = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && verify && token === verify) {
    return new NextResponse(challenge ?? '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  return new NextResponse('forbidden', { status: 403 });
}

type Change = {
  leadgen_id: string;
  form_id?: string;
  ad_id?: string;
  created_time?: number;
};

// POST — קבלת אירוע leadgen. מאמת חתימה, מושך את הליד המלא ומכניס אותו.
export async function POST(req: Request) {
  const raw = await req.text();

  // אימות חתימה: X-Hub-Signature-256 = sha256=<HMAC של הגוף הגולמי עם App Secret>
  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    const sig = req.headers.get('x-hub-signature-256') ?? '';
    const expected =
      'sha256=' + crypto.createHmac('sha256', appSecret).update(raw).digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return new NextResponse('bad signature', { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  if (payload.object !== 'page') return NextResponse.json({ ok: true, ignored: true });

  // איסוף כל אירועי ה-leadgen מכל ה-entries
  const changes: Change[] = [];
  for (const entry of (payload.entry as Array<Record<string, unknown>>) ?? []) {
    for (const ch of (entry.changes as Array<Record<string, unknown>>) ?? []) {
      if (ch.field !== 'leadgen') continue;
      const v = (ch.value as Record<string, unknown>) ?? {};
      if (v.leadgen_id) {
        changes.push({
          leadgen_id: String(v.leadgen_id),
          form_id: v.form_id ? String(v.form_id) : undefined,
          ad_id: v.ad_id ? String(v.ad_id) : undefined,
          created_time: typeof v.created_time === 'number' ? v.created_time : undefined,
        });
      }
    }
  }

  // עיבוד מקבילי. תמיד 200 — הסנכרון היומי משלים כל ליד שנכשל כאן (בלי אובדן).
  const results = await Promise.all(
    changes.map((c) =>
      ingestLead({
        leadgen_id: c.leadgen_id,
        form_id: c.form_id ?? null,
        ad_id: c.ad_id ?? null,
        created_time: c.created_time ? new Date(c.created_time * 1000).toISOString() : null,
      }),
    ),
  );
  return NextResponse.json({ ok: true, inserted: results.filter((r) => r === 'inserted').length });
}

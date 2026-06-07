/**
 * קליינט מינימלי ל-Meta Marketing API (Graph API) — פאזה 2.
 * קורא את הטוקן מ-process.env.META_SYSTEM_USER_TOKEN בלבד.
 * שגיאות Meta מוחזרות בצורה קריאה (code + message) ולא נבלעות.
 */

const GRAPH_VERSION = 'v21.0';
const BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

type Json = any; // תגובות Graph דינמיות

export class MetaApiError extends Error {
  code?: number;
  type?: string;
  fbtrace_id?: string;

  constructor(
    message: string,
    details: { code?: number; type?: string; fbtrace_id?: string } = {},
  ) {
    super(message);
    this.name = 'MetaApiError';
    this.code = details.code;
    this.type = details.type;
    this.fbtrace_id = details.fbtrace_id;
  }

  /** מחרוזת קריאה לתצוגה/לוג — code + message (+ trace). */
  toReadable(): string {
    const parts: string[] = [];
    if (this.code !== undefined) parts.push(`code ${this.code}`);
    parts.push(this.message);
    if (this.fbtrace_id) parts.push(`(trace ${this.fbtrace_id})`);
    return `Meta API: ${parts.join(' — ')}`;
  }
}

function getToken(): string {
  const token = process.env.META_SYSTEM_USER_TOKEN;
  if (!token) {
    throw new Error('Missing META_SYSTEM_USER_TOKEN in env');
  }
  return token;
}

function raiseIfError(json: Json, httpStatus: number): void {
  if (json && json.error) {
    const e = json.error;
    throw new MetaApiError(e.message || 'Unknown Meta error', {
      code: e.code,
      type: e.type,
      fbtrace_id: e.fbtrace_id,
    });
  }
  if (httpStatus < 200 || httpStatus >= 300) {
    throw new MetaApiError(`HTTP ${httpStatus}`, { code: httpStatus });
  }
}

/** קריאת GET בודדת מאומתת. `path` יחסי ל-base (לדוגמה `act_123/campaigns`). */
export async function metaGet(
  path: string,
  params: Record<string, string | number> = {},
): Promise<Json> {
  const url = new URL(`${BASE}/${path}`);
  url.searchParams.set('access_token', getToken());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (err) {
    throw new MetaApiError(
      `Network error calling Graph API: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const json = await res.json().catch(() => ({}));
  raiseIfError(json, res.status);
  return json;
}

/**
 * משיכה עם עימוד מלא — עוקב אחרי data[] + paging.next עד הסוף.
 * `paging.next` הוא URL מלא הכולל token, אז נמשך ישירות.
 */
export async function metaGetAll(
  path: string,
  params: Record<string, string | number> = {},
): Promise<Json[]> {
  const out: Json[] = [];

  const first = await metaGet(path, { limit: 200, ...params });
  out.push(...((first.data as Json[]) ?? []));

  let next: string | undefined = first.paging?.next;
  while (next) {
    let res: Response;
    try {
      res = await fetch(next);
    } catch (err) {
      throw new MetaApiError(
        `Network error during paging: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const json = await res.json().catch(() => ({}));
    raiseIfError(json, res.status);
    out.push(...((json.data as Json[]) ?? []));
    next = json.paging?.next;
  }

  return out;
}

export { GRAPH_VERSION };

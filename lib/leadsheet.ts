/**
 * צינור עדכון דו-כיווני ללידים — פאזה 5.
 *
 * v1 — CSV ידני (fallback):
 *   export → המערכת מייצרת CSV ממולא מראש (תאריך, שם, טלפון, קריאטיב) + עמודות
 *            status ו-deal_value שהלקוח ממלא.
 *   import → המערכת קוראת את ה-CSV בחזרה ומסנכרנת status + deal_value (+ closed_at).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ נקודת החיבור ל-GOOGLE SHEETS (אוטומטי) תיכנס כאן בעתיד:                      │
 * │   pushLeadsToSheet(clientId, rows)  — דוחף/מעדכן שורות בגיליון פר לקוח.       │
 * │   pullLeadsFromSheet(clientId)      — קורא את הגיליון ומחזיר LeadSheetUpdate[].│
 * │ המימוש יחליף את ה-export/import הידני באותו חוזה נתונים (LeadSheetRow /       │
 * │ LeadSheetUpdate) — שאר המערכת לא תשתנה. דורש Google service account ב-env.    │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

export type LeadSheetRow = {
  lead_id: string;
  meta_lead_id: string;
  created_at: string;
  name: string;
  phone: string;
  creative: string;
  status: string;
  deal_value: string;
};

export type LeadSheetUpdate = {
  lead_id?: string;
  meta_lead_id?: string;
  status?: string;
  deal_value?: number | null;
};

export const CSV_HEADERS = [
  'lead_id',
  'meta_lead_id',
  'created_at',
  'name',
  'phone',
  'creative',
  'status',
  'deal_value',
] as const;

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildLeadCsv(rows: LeadSheetRow[]): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const r of rows) {
    lines.push(
      CSV_HEADERS.map((h) => escapeCsv(String(r[h] ?? ''))).join(','),
    );
  }
  return '﻿' + lines.join('\r\n'); // BOM כדי שעברית תיפתח נכון באקסל
}

/** מפענח CSV (תומך בשדות מצוטטים עם פסיקים/מרכאות) לשורות אובייקטים לפי הכותרת. */
function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^﻿/, '');
  const records: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c !== '')) records.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((c) => c !== '')) records.push(row);
  }

  if (records.length === 0) return [];
  const headers = records[0].map((h) => h.trim());
  return records.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => (obj[h] = (cells[idx] ?? '').trim()));
    return obj;
  });
}

/** מפענח CSV נכנס לעדכוני לידים (status + deal_value, מזוהה לפי lead_id או meta_lead_id). */
export function parseLeadCsv(text: string): LeadSheetUpdate[] {
  const out: LeadSheetUpdate[] = [];
  for (const r of parseCsv(text)) {
    const lead_id = r.lead_id || undefined;
    const meta_lead_id = r.meta_lead_id || undefined;
    if (!lead_id && !meta_lead_id) continue;
    const dvRaw = (r.deal_value ?? '').trim();
    const dv = dvRaw === '' ? null : Number(dvRaw);
    out.push({
      lead_id,
      meta_lead_id,
      status: r.status?.trim() || undefined,
      deal_value: dvRaw === '' ? null : Number.isFinite(dv as number) ? (dv as number) : null,
    });
  }
  return out;
}

/**
 * ניטור סטטוס חשבון מודעות של מטא — לזיהוי חשבון שנעצר (בעיית תשלום / השבתה).
 * נקרא בזמן אמת (הפעמון + הדשבורד) — קריאה קלה אחת פר חשבון.
 * account_status: 1=פעיל · 2=מושבת · 3=UNSETTLED(חוב) · 7=בדיקת סיכון ·
 *                 8=ממתין לסליקה · 9=תקופת חסד · 100=בסגירה · 101=סגור
 * disable_reason: 3=RISK_PAYMENT (השבתה עקב תשלום)
 */
import { getSupabaseClient } from './supabase';
import { metaGet } from './meta';

export type AccountAlert = {
  clientId: string;
  name: string;
  meta_account_id: string;
  status: number;
  reason: number;
  kind: 'payment' | 'disabled' | 'review';
  message: string;
};

function classify(
  clientId: string,
  name: string,
  acct: string,
  status: number,
  reason: number,
): AccountAlert | null {
  if (status === 1 || status === 201) return null; // פעיל — אין התראה
  let kind: AccountAlert['kind'];
  let message: string;
  switch (status) {
    case 3:
      kind = 'payment';
      message = 'חוב תשלום — יש להסדיר תשלום, החשבון עלול להיעצר';
      break;
    case 8:
      kind = 'payment';
      message = 'ממתין לסליקת תשלום';
      break;
    case 9:
      kind = 'payment';
      message = 'תקופת חסד — בעיית תשלום, נדרש טיפול';
      break;
    case 2:
      if (reason === 3) {
        kind = 'payment';
        message = 'החשבון הושבת — בעיית תשלום';
      } else {
        kind = 'disabled';
        message = 'החשבון הושבת (מדיניות / בדיקה)';
      }
      break;
    case 7:
      kind = 'review';
      message = 'החשבון בבדיקת סיכון';
      break;
    case 100:
      kind = 'disabled';
      message = 'החשבון בתהליך סגירה';
      break;
    case 101:
      kind = 'disabled';
      message = 'החשבון סגור';
      break;
    default:
      kind = 'review';
      message = `סטטוס חשבון חריג (${status})`;
  }
  return { clientId, name, meta_account_id: acct, status, reason, kind, message };
}

/** בודק את סטטוס כל חשבונות הלקוחות ומחזיר רק את אלה עם בעיה. */
export async function fetchAccountAlerts(): Promise<AccountAlert[]> {
  const sb = getSupabaseClient();
  const { data } = await sb.from('clients').select('id, name, meta_account_id');
  const clients = (data ?? []) as { id: string; name: string; meta_account_id: string }[];

  const results = await Promise.all(
    clients.map(async (c) => {
      if (!c.meta_account_id) return null;
      try {
        const acc = await metaGet(`act_${c.meta_account_id}`, {
          fields: 'account_status,disable_reason',
        });
        const status = Number(acc.account_status);
        const reason = Number(acc.disable_reason ?? 0);
        if (!Number.isFinite(status)) return null;
        return classify(c.id, c.name, c.meta_account_id, status, reason);
      } catch {
        return null; // שגיאה חולפת — לא מתריעים
      }
    }),
  );
  return results.filter((a): a is AccountAlert => a !== null);
}

// פלטת המותג (AVIV SAMSA Soft Engine) — מצב כהה כברירת מחדל.
export const colors = {
  bg: '#0E0C0B',
  surface: '#1A1613',
  surface2: '#241E1A',
  border: '#332B26',
  borderStrong: '#4A3F38',
  text: '#EDE7E1',
  text2: '#C9BFB7',
  muted: '#9A908A',
  muted2: '#77706B',
  primary: '#A8325A',
  primarySoft: 'rgba(168,50,90,0.20)',
  ok: '#3F9E5A',
  danger: '#D9534F',
  wa: '#25D366',
  white: '#ffffff',
};

export const statusColor: Record<string, string> = {
  new: '#3b82f6',
  no_answer_1: '#f59e0b',
  no_answer_2: '#f97316',
  followup: '#8b5cf6',
  meeting_scheduled: '#14b8a6',
  whatsapp: '#22c55e',
  quote_sent: '#a855f7',
  closed: '#16a34a',
  irrelevant: '#ef4444',
};

export const statusLabel: Record<string, string> = {
  new: 'ליד חדש',
  no_answer_1: 'אין מענה 1',
  no_answer_2: 'אין מענה 2',
  followup: 'פולואפ',
  meeting_scheduled: 'תואמה פגישה',
  whatsapp: 'ווטסאפ',
  quote_sent: 'הצעת מחיר',
  closed: 'רכישה',
  irrelevant: 'לא רלוונטי',
};

export const BUILTIN_STATUSES = Object.keys(statusLabel);

/** תצוגת מספר טלפון ישראלי: +972523456789 → 052-345-6789 (תצוגה בלבד). */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits.startsWith('972')) return raw;
  let rest = digits.slice(3);
  if (rest.startsWith('0')) rest = rest.slice(1);
  const local = `0${rest}`;
  if (/^0\d{9}$/.test(local)) return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  if (/^0\d{8}$/.test(local)) return `${local.slice(0, 2)}-${local.slice(2, 5)}-${local.slice(5)}`;
  return raw;
}

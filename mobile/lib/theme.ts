// פלטת המותג (AVIV SAMSA Soft Engine) — כהה + בהיר.
export type Palette = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  borderStrong: string;
  text: string;
  text2: string;
  muted: string;
  muted2: string;
  primary: string;
  primarySoft: string;
  ok: string;
  danger: string;
  wa: string;
  white: string;
  isDark: boolean;
};

export const darkColors: Palette = {
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
  isDark: true,
};

export const lightColors: Palette = {
  bg: '#FBF8F5',
  surface: '#FFFFFF',
  surface2: '#F3EDE7',
  border: '#E7DED6',
  borderStrong: '#D6C9BE',
  text: '#241E1A',
  text2: '#4A3F38',
  muted: '#6E635C',
  muted2: '#938880',
  primary: '#A8325A',
  primarySoft: 'rgba(168,50,90,0.12)',
  ok: '#2E8B4F',
  danger: '#C7443F',
  wa: '#1FB457',
  white: '#ffffff',
  isDark: false,
};

// ברירת-מחדל (כהה) — לשימוש בקבצים לא-ריאקטיביים בלבד.
export const colors = darkColors;

// צבעי סטטוס — סמנטיים, זהים בשני המצבים.
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

// רוחב תוכן מקסימלי — ממרכז את התוכן ב-iPad כדי שלא יימתח (במסך טלפון: ללא השפעה).
export const CONTENT_MAX = 680;

// פלטת צבעים לסטטוסים מותאמים — תואם ל-lib/lead-statuses בצד השרת (color = שם).
export const STATUS_COLORS: Record<string, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#8b5cf6',
  teal: '#14b8a6',
  pink: '#ec4899',
  red: '#ef4444',
  indigo: '#6366f1',
  amber: '#f59e0b',
  gray: '#94a3b8',
};
export const STATUS_COLOR_NAMES = Object.keys(STATUS_COLORS);
export const customStatusHex = (name?: string | null) => (name && STATUS_COLORS[name]) || STATUS_COLORS.gray;

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

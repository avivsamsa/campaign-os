/**
 * סכמת תיוג קריאטיבים — פאזה 6א'. תיוג מובנה (enum) ב-creatives.tags (jsonb).
 * הערכים מתוך רשימות סגורות בלבד — לא טקסט חופשי — כדי שהתיוג יהיה עקבי
 * ושמיש לשכבת ה-AI (פאזה 7). מפתח השדה ו-value נשמרים בצורה יציבה (אנגלית);
 * label הוא לתצוגה בעברית.
 */

export type TagOption = { value: string; label: string };
export type TagField = { key: string; label: string; options: TagOption[] };

export const TAG_FIELDS: TagField[] = [
  {
    key: 'hook_type',
    label: 'סוג פתיח (Hook)',
    options: [
      { value: 'question', label: 'שאלה' },
      { value: 'statistic', label: 'נתון / סטטיסטיקה' },
      { value: 'problem', label: 'הצגת בעיה' },
      { value: 'testimonial', label: 'המלצה / עדות' },
      { value: 'direct_offer', label: 'הצעה ישירה' },
      { value: 'curiosity', label: 'סקרנות' },
      { value: 'bold_claim', label: 'טענה נועזת' },
      { value: 'story', label: 'סיפור' },
    ],
  },
  {
    key: 'angle',
    label: 'זווית שיווקית',
    options: [
      { value: 'emotional', label: 'רגשי' },
      { value: 'rational', label: 'רציונלי' },
      { value: 'social_proof', label: 'הוכחה חברתית' },
      { value: 'scarcity', label: 'מחסור / דחיפות' },
      { value: 'authority', label: 'סמכות / מומחיות' },
      { value: 'value', label: 'ערך / תועלת' },
      { value: 'fomo', label: 'FOMO / פחד מהחמצה' },
    ],
  },
  {
    key: 'offer',
    label: 'סוג הצעה',
    options: [
      { value: 'discount', label: 'הנחה' },
      { value: 'free_trial', label: 'ניסיון חינם' },
      { value: 'bundle', label: 'חבילה' },
      { value: 'lead_magnet', label: 'מגנט לידים' },
      { value: 'consultation', label: 'ייעוץ / שיחה' },
      { value: 'limited_time', label: 'מבצע מוגבל בזמן' },
      { value: 'none', label: 'ללא הצעה' },
    ],
  },
  {
    key: 'audience',
    label: 'קהל',
    options: [
      { value: 'cold', label: 'קר' },
      { value: 'warm', label: 'חמים' },
      { value: 'retargeting', label: 'רימרקטינג' },
      { value: 'lookalike', label: 'דמוי קהל (Lookalike)' },
      { value: 'existing_customers', label: 'לקוחות קיימים' },
    ],
  },
  {
    key: 'visual_style',
    label: 'סגנון ויזואלי',
    options: [
      { value: 'ugc', label: 'UGC / אותנטי' },
      { value: 'studio', label: 'סטודיו / מקצועי' },
      { value: 'text_overlay', label: 'טקסט על מדיה' },
      { value: 'product_shot', label: 'צילום מוצר' },
      { value: 'lifestyle', label: 'לייפסטייל' },
      { value: 'animation', label: 'אנימציה / מושן' },
      { value: 'meme', label: 'מם / הומור' },
    ],
  },
];

const FIELD_MAP = new Map(TAG_FIELDS.map((f) => [f.key, f]));

export function tagFieldLabel(key: string): string {
  return FIELD_MAP.get(key)?.label ?? key;
}

export function tagValueLabel(key: string, value: string): string {
  const f = FIELD_MAP.get(key);
  return f?.options.find((o) => o.value === value)?.label ?? value;
}

/** האם value חוקי עבור שדה תיוג נתון (ערך ריק = ניקוי התג). */
export function isValidTag(key: string, value: string): boolean {
  const f = FIELD_MAP.get(key);
  if (!f) return false;
  if (value === '') return true;
  return f.options.some((o) => o.value === value);
}

/** ניקוי אובייקט תגים נכנס — רק שדות/ערכים חוקיים נשמרים. ערך ריק מוחק את השדה. */
export function sanitizeTags(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of TAG_FIELDS) {
    const v = input[f.key];
    if (typeof v === 'string' && v !== '' && isValidTag(f.key, v)) out[f.key] = v;
  }
  return out;
}

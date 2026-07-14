/**
 * פלטת צבעים לסטטוסים מותאמים אישית — presets נגישים (AA) שהלקוח בוחר מהם.
 * משותף ל-API (ולידציה) ולתצוגה (רינדור ה-pill).
 */

export type StatusColor =
  | 'blue'
  | 'green'
  | 'orange'
  | 'purple'
  | 'teal'
  | 'pink'
  | 'red'
  | 'indigo'
  | 'amber'
  | 'gray';

// צבע בסיס יחיד לכל שם — ה-UI מערבב אותו עם ה-surface/text דרך color-mix,
// כך שה-pill מתאים אוטומטית ל-dark ול-light.
export const STATUS_COLORS: Record<StatusColor, string> = {
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

export const STATUS_COLOR_NAMES = Object.keys(STATUS_COLORS) as StatusColor[];

export function isValidStatusColor(c: unknown): c is StatusColor {
  return typeof c === 'string' && c in STATUS_COLORS;
}

export type CustomStatus = { id: string; label: string; color: StatusColor };
